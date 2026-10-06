'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const { executePublicationPlan } = require('../netlify/lib/_scope-qv-publication-executor');
const { reconcilePublicationPlan } = require('../netlify/lib/_scope-qv-publication-reconciliation');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');
const { preparationPayload } = require('./scope-qv-2027-preparation-clone');
const { openProduction } = require('./scope-qv-2027-production-preflight');
const { buildPlan,assertSafePlan,protectedProof,preparationProof,publicationProof,
  completeMissingEventCodes } = require('./scope-qv-2027-publication-clone');

const BASELINE_FILE = path.resolve(__dirname,'../outputs/qv-2027-sql-recette/production-preflight.json');
const REPORT_DIR = path.resolve(__dirname,'../outputs/qv-2027-sql-recette');
const EXPECTED_FIRST_PLAN = 'c7d769ef165a5b03480800ed45b2b7446055ec3e7054ebd2145b83b1e24b64f0';
const CODE_SOURCE = 'QV_2027_PRODUCTION_LEGACY_CODE_COMPLETION';

function baseline(){
  const value = JSON.parse(fs.readFileSync(BASELINE_FILE,'utf8'));
  assert.equal(value.database,'postgres');
  assert.equal(value.host,'aws-0-eu-central-2.pooler.supabase.com');
  assert.equal(value.port,5432);
  assert.equal(value.planFingerprint,EXPECTED_FIRST_PLAN);
  assert.deepEqual(value.plan,{ CREATE:7,UPDATE:34,UNCHANGED:84,BLOCKED:725,NOT_PUBLISHED:0 });
  return value;
}

async function stableProtected(store){
  const proof = await protectedProof(store);
  const original = await store.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from scope_quo_vadis_obligations t
    where metadata->>'source' is distinct from 'QV_PROGRAMME_PREPARATION'`);
  proof.scope_quo_vadis_obligations = original.rows[0];
  return proof;
}

async function assertStableProtection(store){
  const current = await stableProtected(store);
  const original = baseline().protectedBefore;
  assert.deepEqual(current.scope_quo_vadis_obligations,original.scope_quo_vadis_obligations,
    'Pre-existing QV obligations changed since preflight.');
  assert.deepEqual(current.scope_quo_vadis_proposals,original.scope_quo_vadis_proposals,
    'Pre-existing QV proposals changed since preflight.');
  return current;
}

async function assertMigrated(store){
  const migrations = (await store.query(`select version from monitoring_f7_schema_migrations
    where version in ('scope-qv-publication-c23-repair-1','scope-event-identity-phase2')
    order by version`)).rows.map((row) => row.version);
  assert.deepEqual(migrations,['scope-event-identity-phase2','scope-qv-publication-c23-repair-1']);
  const calendar = (await store.query(`select c.type_jour,c.libelle,c.source,c.neutralise,
    c.metadata->>'dateFin' as end_date from scope_quo_vadis_calendar_days c
    join scope_quo_vadis_programmes p using(programme_id)
    where p.annee=2027 and c.jour=date '2027-05-06' order by c.type_jour`)).rows;
  assert.deepEqual(calendar.map((row) => row.type_jour),['FERIE','VACANCES_SCOLAIRES']);
  assert.deepEqual(calendar[1],{ type_jour:'VACANCES_SCOLAIRES',
    libelle:'Vacances scolaires vaudoises - Ascension',source:'CALENDAR_VD_FINAL_3',
    neutralise:true,end_date:'2027-05-09' });
}

async function materializePreparations({ execute = false } = {}){
  const dataset = await buildCurrentCandidateDataset();
  const store = await openProduction({ readOnly:!execute });
  try{
    return await store.transaction(async () => {
      await store.query("set local timezone='UTC'");
      await assertMigrated(store);
      const protectedBefore = await assertStableProtection(store);
      const programmeRows = (await store.query(`select programme_id from scope_quo_vadis_programmes
        where annee=2027`)).rows;
      assert.equal(programmeRows.length,1);
      const programmeId = programmeRows[0].programme_id;
      const locationRows = (await store.query('select lieu_id from scope_lieux where actif')).rows;
      const roomRows = (await store.query(`select code,libelle,salle_id,lieu_id
        from scope_salles_theorie where actif`)).rows;
      const statcomRows = (await store.query('select code from scope_statcom_referentiel')).rows;
      const locationIds = new Set(locationRows.map((row) => row.lieu_id));
      const rooms = new Map(roomRows.map((row) => [row.code,row]));
      const statcoms = new Set(statcomRows.map((row) => row.code));
      const payloads = dataset.candidateRows.map((row) =>
        preparationPayload(row,locationIds,rooms,statcoms));
      assert.equal(payloads.length,850);
      const existing = (await store.query(`select obligation_id,source_type,source_ref,metadata
        from scope_quo_vadis_obligations
        where programme_id=$1 and source_ref=any($2::text[])`,
      [programmeId,payloads.map((row) => row.caseId)])).rows;
      assert.ok([0,850].includes(existing.length),`Partial preparation state: ${existing.length}`);
      const byId = new Map(existing.map((row) => [row.source_ref,row]));
      assert.equal(byId.size,existing.length);
      const result = { mode:execute ? 'PRODUCTION_WRITE' : 'READ_ONLY',
        candidate:850,created:0,updated:0,unchanged:0,waitingValidation:725,localDecisions:15 };
      for(const item of payloads){
        const current = byId.get(item.caseId);
        if(!current){ result.created++;continue; }
        assert.equal(current.source_type,'MANUAL',item.caseId);
        assert.equal(current.metadata?.automatedSnapshot,true,item.caseId);
        assert.equal(current.metadata?.humanDecision,false,item.caseId);
        assert.equal(current.metadata?.sourceFingerprint,item.metadata.sourceFingerprint,item.caseId);
        result.unchanged++;
      }
      assert.equal(result.updated,0);
      if(existing.length === 0){
        assert.equal(result.created,850);
        const { plan,snapshot } = await buildPlan(store,dataset);
        assertSafePlan(plan,snapshot,dataset,baseline().plan);
        assert.equal(plan.planFingerprint,EXPECTED_FIRST_PLAN);
      }else{
        assert.equal(result.unchanged,850);
      }
      if(execute && result.created){
        for(const item of payloads){
          await store.query(`insert into scope_quo_vadis_obligations
            (obligation_id,programme_id,source_type,source_ref,title,domain,cible_codes,statut,
             imposed_start_at,imposed_end_at,statcom_policy,statcom_code,lieu_id,lieu_libre,
             salle_theorie_id,metadata,include_in_programme)
            values ($1,$2,'MANUAL',$3,$4,$5,$6::text[],$7,
              case when $8::text is null then null else $8::timestamp at time zone 'Europe/Zurich' end,
              case when $9::text is null then null else $9::timestamp at time zone 'Europe/Zurich' end,
              $10,$11,$12,$13,$14,$15::jsonb,false)`,[
            item.id,programmeId,item.caseId,item.title,item.domain,item.publics,item.status,
            item.startsAt,item.endsAt,item.statcomPolicy,item.statcom,item.lieuId,item.lieuLibre,
            item.salleId,JSON.stringify(item.metadata)
          ]);
        }
      }
      if(execute){
        const proof = (await store.query(`select count(*)::integer as total,
          count(*) filter (where metadata->>'canonicalStatus'='VALIDATED')::integer as validated,
          count(*) filter (where metadata->>'canonicalStatus'<>'VALIDATED')::integer as waiting,
          count(distinct source_ref)::integer as ids
          from scope_quo_vadis_obligations where programme_id=$1
            and metadata->>'source'='QV_PROGRAMME_PREPARATION'`,[programmeId])).rows[0];
        assert.deepEqual(proof,{ total:850,validated:125,waiting:725,ids:850 });
        assert.deepEqual(await stableProtected(store),protectedBefore,
          'A protected table changed during the preparation transaction.');
      }else{
        assert.deepEqual(await stableProtected(store),protectedBefore);
      }
      return result;
    }, { repeatableRead:true });
  }finally{ await store.close(); }
}

async function publish(){
  assert.equal(process.env.SCOPE_QV_PRODUCTION_EXECUTION_ENABLED,'YES');
  const dataset = await buildCurrentCandidateDataset();
  const store = await openProduction({ readOnly:false });
  try{
    await assertMigrated(store);
    await assertStableProtection(store);
    await preparationProof(store,dataset);
    const protectedBefore = await protectedProof(store);
    const { plan,snapshot } = await buildPlan(store,dataset);
    const first = snapshot.length === 118;
    assertSafePlan(plan,snapshot,dataset,first ? baseline().plan
      : { CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 });
    if(first) assert.equal(plan.planFingerprint,EXPECTED_FIRST_PLAN);
    else{
      const audit = await store.query(`select count(*)::integer as n from scope_qv_publication_runs
        where process_id='QV_2027_PRODUCTION_MIGRATION' and result='SUCCESS'
          and create_count=7 and update_count=34 and unchanged_count=84`);
      assert.equal(audit.rows[0].n,1,'The initial publication must be proven before replay.');
    }
    const target = { host:store.target.host,database:store.target.database };
    const context = { store,environment:'production',expectedTarget:target,
      allowProductionExecution:true,productionAuthorization:{
        gateId:'QV_2027_PRODUCTION_MOA_20261006',approvedBy:'MOA_USER_REQUEST_20261006',
        planId:plan.planId,planFingerprint:plan.planFingerprint,target },
      actor:{ id:'qv-2027-production-migration',roles:['GESTIONNAIRE'] },
      processId:'QV_2027_PRODUCTION_MIGRATION',runId:`QV-2027-PROD-${Date.now()}` };
    const execution = await executePublicationPlan(plan,context);
    assert.deepEqual(execution.counts,first
      ? { created:7,updated:34,unchanged:84,blocked:725,notPublished:0 }
      : { created:0,updated:0,unchanged:125,blocked:725,notPublished:0 });
    const codeCompletion = await completeMissingEventCodes(store,CODE_SOURCE);
    assert.equal(codeCompletion.allocated,first ? 33 : 0);
    const reconciliation = await reconcilePublicationPlan(plan,{ store,
      environment:'production',expectedTarget:target,allowProductionReconciliation:true });
    assert.equal(reconciliation.status,'MATCH');
    assert.equal(reconciliation.summary.MATCHED,125);
    const proof = await publicationProof(store,dataset,snapshot,protectedBefore,CODE_SOURCE);
    await assertStableProtection(store);
    const next = await buildPlan(store,dataset);
    assertSafePlan(next.plan,next.snapshot,dataset,
      { CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 });
    return { mode:'PRODUCTION_PUBLICATION',execution:{ status:execution.status,counts:execution.counts },
      codeCompletion,reconciliation:reconciliation.summary,proof:{ published:proof.published,
        stableExistingIds:proof.stableExistingIds,newEvents:proof.newEvents,
        foba:proof.foba,roomLocationMismatch:proof.roomLocationMismatch,
        missingEventCodes:proof.missingEventCodes,completedHistoricalCodes:proof.completedHistoricalCodes },
      nextPlan:next.plan.summary };
  }finally{ await store.close(); }
}

async function verify(){
  const dataset = await buildCurrentCandidateDataset();
  const store = await openProduction();
  try{
    return await store.transaction(async () => {
      await store.query("set local timezone='UTC'");
      await assertMigrated(store);
      await assertStableProtection(store);
      await preparationProof(store,dataset);
      const protectedBefore = await protectedProof(store);
      const { plan,snapshot } = await buildPlan(store,dataset);
      assertSafePlan(plan,snapshot,dataset,
        { CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 });
      const target = { host:store.target.host,database:store.target.database };
      const reconciliation = await reconcilePublicationPlan(plan,{ store,
        environment:'production',expectedTarget:target,allowProductionReconciliation:true });
      assert.equal(reconciliation.status,'MATCH');
      const proof = await publicationProof(store,dataset,snapshot,protectedBefore,CODE_SOURCE);
      const duplicate = await store.query(`select count(*)::integer as n from (
        select publication_key from scope_evenements where publication_key is not null
        group by publication_key having count(*)>1) d`);
      assert.equal(duplicate.rows[0].n,0);
      return { mode:'PRODUCTION_READ_ONLY_VERIFICATION',candidate:850,
        validated:125,waitingValidation:725,published:proof.published,
        localDecisions:15,tourDeFrance:0,plan:plan.summary,
        reconciliation:reconciliation.summary,duplicates:duplicate.rows[0].n,
        protected:true,roomLocationMismatch:proof.roomLocationMismatch,
        foba:proof.foba,missingEventCodes:proof.missingEventCodes,
        completedHistoricalCodes:proof.completedHistoricalCodes };
    });
  }finally{ await store.close(); }
}

if(require.main === module){
  const mode = process.argv[2];
  const actions = { '--prepare-dry-run':() => materializePreparations(),
    '--prepare':() => materializePreparations({ execute:true }),
    '--publish':publish,'--verify':verify };
  assert.ok(actions[mode],'Expected --prepare-dry-run, --prepare, --publish or --verify');
  actions[mode]().then((result) => {
    if(mode !== '--prepare-dry-run'){
      const suffix = mode === '--prepare' ? (result.created ? 'first' : 'replay')
        : mode === '--publish' ? (result.execution.counts.created ? 'first' : 'replay')
          : 'final';
      const file = path.join(REPORT_DIR,`production-${mode.slice(2)}-${suffix}.json`);
      fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
    }
    console.log(JSON.stringify(result,null,2));
  }).catch((error) => { console.error(error.code || '',error.stack || error);process.exitCode=1; });
}

module.exports = { materializePreparations,publish,verify,stableProtected,assertMigrated };
