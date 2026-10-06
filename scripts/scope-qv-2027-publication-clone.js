'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const eventCodes = require('../netlify/lib/_scope-event-code');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { executePublicationPlan } = require('../netlify/lib/_scope-qv-publication-executor');
const { reconcilePublicationPlan } = require('../netlify/lib/_scope-qv-publication-reconciliation');
const { buildCurrentCandidateDataset, preserveUnspecifiedPublicationFields } = require('./lib/scope-c22-canonical-dataset');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const CONNECTION = `postgresql://127.0.0.1:55432/${DATABASE}`;
const ALLOWED_UPDATE_FIELDS = new Set([
  'event.primaryDomain', 'relations.domainCodes', 'relations.publicCodes',
  'event.locationCode', 'event.startDate', 'event.startsAt', 'event.endDate',
  'event.endsAt', 'event.durationMinutes', 'fingerprint'
]);
const PROTECTED_TABLES = [
  'scope_quo_vadis_obligations', 'scope_quo_vadis_proposals',
  'scope_participations', 'scope_attendus', 'scope_affectations',
  'scope_journal_metier'
];

async function protectedProof(store){
  const proof = {};
  for(const table of PROTECTED_TABLES){
    const { rows } = await store.query(`select count(*)::integer as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) as hash
      from ${table} t`);
    proof[table] = rows[0];
  }
  const { rows } = await store.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) as hash
    from scope_evenements t where publication_key is null`);
  proof.nonQvEvents = rows[0];
  return proof;
}

async function preparationProof(store, dataset){
  const { rows } = await store.query(`select source_ref,statut,metadata->>'canonicalStatus' as canonical_status
    from scope_quo_vadis_obligations where metadata->>'source'='QV_PROGRAMME_PREPARATION'`);
  assert.equal(rows.length, 850);
  const byId = new Map(rows.map((row) => [row.source_ref, row]));
  assert.equal(byId.size, 850);
  assert.equal(rows.filter((row) => row.canonical_status !== 'VALIDATED').length, 725);
  assert.equal(rows.filter((row) => row.statut === 'A_PLANIFIER').length, 725);
  assert.equal(dataset.localIds.size, 15);
  for(const id of dataset.localIds) assert.ok(byId.has(id), `Missing local decision: ${id}`);
  return { total:rows.length, waiting:725, localDecisions:dataset.localIds.size };
}

async function buildPlan(store, dataset){
  const snapshot = await store.snapshot(2027);
  const domains = await store.query('select code from scope_domaines where actif');
  const ois = await store.query('select code from scope_ois where actif');
  const statcoms = await store.query('select code from scope_statcom_referentiel');
  const locations = await store.query('select site_code from scope_lieux where actif');
  const rooms = await store.query('select code from scope_salles_theorie where actif');
  const referentials = {
    ...dataset.referentials,
    domains:domains.rows.map((row) => row.code),
    ois:ois.rows.map((row) => row.code),
    statComCodes:statcoms.rows.map((row) => row.code),
    locations:locations.rows.map((row) => `L-${row.site_code}`),
    rooms:rooms.rows.map((row) => `R-${row.code}`),
    targets:[...new Set(dataset.referentials.targets.concat(snapshot.flatMap((row) =>
      row.desired?.relations?.targetCodes || [])))]
  };
  const programme = preserveUnspecifiedPublicationFields(dataset.programme,snapshot);
  const plan = planner.buildPublicationPlan({ year:2027,programme,targetSnapshot:snapshot,referentials });
  return { plan, snapshot, programme };
}

function assertSafePlan(plan, snapshot, dataset, expected){
  assert.equal(plan.decisions.length, 850);
  assert.equal(new Set(plan.decisions.map((row) => row.publicationKey)).size, 850);
  assert.equal(dataset.programme.filter((row) => row.status === 'VALIDATED').length, 125);
  assert.equal(dataset.programme.filter((row) => row.status !== 'VALIDATED').length, 725);
  assert.equal(dataset.programme.filter((row) => /TOUR-DE-FRANCE-FEMMES/.test(row.caseId)).length, 0);
  assert.equal(dataset.localIds.size, 15);
  assert.equal(snapshot.filter((row) => Object.values(row.operationalState || {})
    .some((value) => Number(value) > 0)).length, 0);
  assert.deepEqual(plan.summary, expected);
  const oldByKey = new Map(snapshot.map((row) => [row.publicationKey,row]));
  const byId = new Map(dataset.programme.map((row) => [row.caseId,row]));
  for(const decision of plan.decisions){
    const source = byId.get(decision.caseId);
    assert.ok(source, `Unknown source: ${decision.caseId}`);
    assert.equal(decision.action === 'BLOCKED', source.status !== 'VALIDATED');
    assert.notEqual(dataset.localIds.has(decision.caseId) && decision.action !== 'BLOCKED', true);
    if(decision.action === 'BLOCKED'){
      assert.equal(decision.reason, 'SOURCE_NOT_VALIDATED');
      assert.equal(oldByKey.has(decision.publicationKey), false);
      continue;
    }
    assert.equal(decision.target.relations.oiCodes.includes('G1') && !(source.raw.oiSelections || [])
      .some((value) => value.endsWith(':G1')), false, `Inferred G1 OI: ${decision.caseId}`);
    if(decision.action !== 'UPDATE') continue;
    const old = oldByKey.get(decision.publicationKey);
    assert.ok(old);
    assert.equal(old.desired.activity.businessCode,decision.target.activity.businessCode);
    assert.equal(old.desired.activity.statComCode,decision.target.activity.statComCode);
    for(const field of decision.changedFields) assert.ok(ALLOWED_UPDATE_FIELDS.has(field),
      `Unapproved update ${decision.caseId}: ${field}`);
    if(decision.changedFields.includes('event.primaryDomain')){
      assert.equal(decision.target.event.primaryDomain,'INSTITUTIONNEL');
      assert.ok(/^F\d/.test(source.raw.domain), `Non-functional domain: ${decision.caseId}`);
    }
    if(decision.changedFields.includes('relations.publicCodes')){
      assert.ok((source.raw.publics || []).length > 0, `Absent public: ${decision.caseId}`);
    }
    if(decision.changedFields.includes('event.locationCode')){
      assert.equal(decision.caseId,'qv-source-917');
      assert.equal(source.raw.conduiteEvidence?.locationRule,'MOA_CONDUITE_FOLLOWS_SOURCE_LOCATION');
    }
    if(decision.changedFields.some((field) => field === 'event.startsAt' || field === 'event.endsAt')){
      assert.ok(decision.caseId.startsWith('CTA-PERM-'));
    }
  }
  for(const id of ['qv-source-877','qv-source-890','qv-source-895','qv-source-896',
    'qv-source-899','qv-source-902','qv-source-905','qv-source-919']){
    const row = plan.decisions.find((item) => item.caseId === id);
    assert.ok(row);
    assert.notEqual(row.action,'BLOCKED');
    assert.deepEqual(row.target.relations.oiCodes,[]);
    assert.ok(row.target.relations.publicCodes.length);
  }
}

async function publicationProof(store, dataset, priorSnapshot, priorProtected,
  historicalCodeSource = 'QV_2027_LOCAL_RECIPE_LEGACY_CODE_COMPLETION'){
  const after = await store.snapshot(2027);
  const keys = new Set(after.map((row) => row.publicationKey));
  assert.equal(after.length, 125);
  assert.equal(keys.size, 125);
  for(const row of dataset.programme){
    assert.equal(keys.has(planner.canonicalPublicationKey(row)),row.status === 'VALIDATED',row.caseId);
  }
  const beforeIds = new Map(priorSnapshot.map((row) => [row.publicationKey,row.eventId]));
  for(const row of after){
    if(beforeIds.has(row.publicationKey)) assert.equal(row.eventId,beforeIds.get(row.publicationKey));
    assert.equal(row.fingerprint,row.publicationFingerprint);
    assert.equal(row.fingerprint,row.lastSyncedFingerprint);
  }
  const currentProtected = await protectedProof(store);
  assert.deepEqual(currentProtected,priorProtected);
  const duplicate = await store.query(`select count(*)::integer as n from (
    select publication_key from scope_evenements where publication_key is not null
    group by publication_key having count(*)>1) d`);
  assert.equal(duplicate.rows[0].n,0);
  const foba = await store.query(`select count(*)::integer as n from scope_qv_publication_links l
    join scope_qv_publication_activities a on a.publication_activity_id=l.publication_activity_id
    where l.publication_unit_id in ('qv-source-854','qv-source-855','qv-source-856','qv-source-857')
      and a.business_code='070F1.005' and a.stat_com_code='070F1'`);
  assert.equal(foba.rows[0].n,4);
  const rooms = await store.query(`select count(*)::integer as n from scope_evenements e
    join scope_salles_theorie s on s.salle_id=e.salle_theorie_id
    where e.publication_key is not null and (e.lieu_id is null or e.lieu_id<>s.lieu_id)`);
  assert.equal(rooms.rows[0].n,0);
  const missingCodes = await store.query(`select count(*)::integer as n from scope_evenements e
    join scope_qv_publication_links l on l.evenement_id=e.evenement_id
    where l.source_year=2027 and e.statcom_code is not null and e.code_cours is null`);
  assert.equal(missingCodes.rows[0].n,0);
  const historicalCodes = await store.query(`select count(*)::integer as n
    from scope_event_code_allocations
    where metadata->>'source'=$1`,[historicalCodeSource]);
  assert.equal(historicalCodes.rows[0].n,33);
  await preparationProof(store,dataset);
  return { published:after.length, stableExistingIds:beforeIds.size,
    newEvents:after.length-beforeIds.size, protected:currentProtected,
    foba:foba.rows[0].n, roomLocationMismatch:rooms.rows[0].n,
    missingEventCodes:missingCodes.rows[0].n,
    completedHistoricalCodes:historicalCodes.rows[0].n };
}

async function completeMissingEventCodes(store, provenanceSource){
    assert.ok(['QV_2027_LOCAL_RECIPE_LEGACY_CODE_COMPLETION',
      'QV_2027_PRODUCTION_LEGACY_CODE_COMPLETION'].includes(provenanceSource));
    const protectedBefore = await protectedProof(store);
    const existingCodes = (await store.query(`select evenement_id,code_cours from scope_evenements
      where publication_key is not null and code_cours is not null`)).rows;
    const result = await store.transaction(async () => {
      const missing = (await store.query(`select e.evenement_id,e.publication_key,e.statcom_code
        from scope_evenements e join scope_qv_publication_links l on l.evenement_id=e.evenement_id
        where l.source_year=2027 and e.statcom_code is not null and e.code_cours is null
        order by e.publication_key for update of e`)).rows;
      assert.ok([0,33].includes(missing.length),`Unexpected missing event codes: ${missing.length}`);
      if(!missing.length) return { allocated:0 };
      const oldAllocations = await store.query(`select count(*)::integer as n
        from scope_event_code_allocations where evenement_id=any($1::uuid[])`,
      [missing.map((row) => row.evenement_id)]);
      assert.equal(oldAllocations.rows[0].n,0);
      const snapshot = await store.snapshot(2027);
      assert.equal(snapshot.length,125);
      const byId = new Map(snapshot.map((row) => [row.eventId,row]));
      const candidates = missing.map((row) => {
        const current = byId.get(row.evenement_id);
        assert.ok(current);
        assert.ok(!Object.values(current.operationalState || {}).some((value) => Number(value)>0));
        assert.equal(current.desired.activity.statComCode,row.statcom_code);
        return { eventId:row.evenement_id,publicationKey:row.publication_key,
          statCom:row.statcom_code,startsAt:current.desired.event.startsAt,
          oiCodes:current.desired.relations.oiCodes,publicCodes:current.desired.relations.publicCodes,
          siteCode:current.desired.event.locationCode };
      });
      const allocations = await eventCodes.preparePersistedInitialCodes(store.query.bind(store),candidates,
        { metadata:{ source:provenanceSource } });
      assert.equal(allocations.length,missing.length);
      for(const allocation of allocations){
        const persisted = await store.query(`select event_code from scope_event_code_allocations
          where evenement_id=$1`,[allocation.eventId]);
        assert.equal(persisted.rows[0]?.event_code,allocation.eventCode);
        const updated = await store.query(`update scope_evenements set code_cours=$1,updated_at=now()
          where evenement_id=$2 and code_cours is null`,[allocation.eventCode,allocation.eventId]);
        assert.equal(updated.rowCount,1);
      }
      return { allocated:allocations.length };
    });
    const remaining = await store.query(`select count(*)::integer as n from scope_evenements e
      join scope_qv_publication_links l on l.evenement_id=e.evenement_id
      where l.source_year=2027 and e.statcom_code is not null and e.code_cours is null`);
    assert.equal(remaining.rows[0].n,0);
    const afterCodes = new Map((await store.query(`select evenement_id,code_cours from scope_evenements
      where publication_key is not null and code_cours is not null`)).rows
      .map((row) => [row.evenement_id,row.code_cours]));
    for(const row of existingCodes) assert.equal(afterCodes.get(row.evenement_id),row.code_cours);
    assert.deepEqual(await protectedProof(store),protectedBefore);
    return { ...result,existingCodesPreserved:existingCodes.length,
      totalWithCode:afterCodes.size,remainingMissing:remaining.rows[0].n };
}

async function backfillMissingEventCodes(){
  const store = await ScopeQvPostgresStore.open({ connectionString:CONNECTION,deploymentMode:'clone',
    allowCloneConnection:true,expectedDatabase:DATABASE,statementTimeoutMs:120000 });
  try{
    return await completeMissingEventCodes(store,'QV_2027_LOCAL_RECIPE_LEGACY_CODE_COMPLETION');
  }finally{ await store.close(); }
}

async function run({ execute = false } = {}){
  const dataset = await buildCurrentCandidateDataset();
  const store = await ScopeQvPostgresStore.open({ connectionString:CONNECTION,deploymentMode:'clone',
    allowCloneConnection:true,expectedDatabase:DATABASE,readOnly:!execute,statementTimeoutMs:120000 });
  try{
    await preparationProof(store,dataset);
    const protectedBefore = await protectedProof(store);
    const { plan, snapshot } = await buildPlan(store,dataset);
    const expected = snapshot.length === 118
      ? { CREATE:7,UPDATE:34,UNCHANGED:84,BLOCKED:725,NOT_PUBLISHED:0 }
      : { CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 };
    assertSafePlan(plan,snapshot,dataset,expected);
    const context = { store,environment:'clone',allowCloneExecution:true,
      actor:{ id:'qv-2027-local-recipe',roles:['GESTIONNAIRE'] },
      processId:'QV_2027_LOCAL_PUBLICATION_CONVERGENCE' };
    const dryRun = await executePublicationPlan(plan,{ ...context,dryRun:true });
    if(!execute){
      const verification = snapshot.length === 125
        ? { reconciliation:await reconcilePublicationPlan(plan,
          { store,environment:'clone',allowCloneReconciliation:true }),
          proof:await publicationProof(store,dataset,snapshot,protectedBefore) }
        : null;
      return { mode:'DRY_RUN',plan:plan.summary,dryRun,preparations:850,waiting:725,
        localDecisions:15,protected:protectedBefore,verification };
    }
    let first;
    if(snapshot.length === 118){
      first = await executePublicationPlan(plan,{ ...context,runId:`QV-2027-FIRST-${Date.now()}` });
      assert.deepEqual(first.counts,{ created:7,updated:34,unchanged:84,blocked:725,notPublished:0 });
    }else{
      const result = await store.query(`select result,create_count,update_count,unchanged_count,blocked_count
        from scope_qv_publication_runs where process_id='QV_2027_LOCAL_PUBLICATION_CONVERGENCE'
          and result='SUCCESS' and create_count=7 and update_count=34
        order by started_at desc limit 1`);
      assert.equal(result.rows.length,1,'The initial local publication must be proven before resuming.');
      first = { status:result.rows[0].result,counts:{ created:result.rows[0].create_count,
        updated:result.rows[0].update_count,unchanged:result.rows[0].unchanged_count,
        blocked:result.rows[0].blocked_count,notPublished:0 } };
    }
    const codeCompletion = await backfillMissingEventCodes();
    const reconciliation = await reconcilePublicationPlan(plan,
      { store,environment:'clone',allowCloneReconciliation:true });
    assert.equal(reconciliation.status,'MATCH');
    assert.equal(reconciliation.summary.MATCHED,125);
    const proof = await publicationProof(store,dataset,snapshot,protectedBefore);
    const replay = await buildPlan(store,dataset);
    assertSafePlan(replay.plan,replay.snapshot,dataset,
      { CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 });
    const second = await executePublicationPlan(replay.plan,{ ...context,runId:`QV-2027-REPLAY-${Date.now()}` });
    assert.deepEqual(second.counts,{ created:0,updated:0,unchanged:125,blocked:725,notPublished:0 });
    const replayProof = await publicationProof(store,dataset,snapshot,protectedBefore);
    const report = { mode:'LOCAL_CLONE_PUBLICATION',database:DATABASE,plan:plan.summary,
      first:{ status:first.status,counts:first.counts },
      codeCompletion,
      reconciliation:{ status:reconciliation.status,summary:reconciliation.summary },
      replay:{ status:second.status,counts:second.counts },proof,replayProof,
      preparations:850,waitingValidation:725,localDecisions:15,tourDeFrance:0 };
    const file = path.resolve(__dirname,'../outputs/qv-2027-sql-recette/local-publication-convergence.json');
    fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
    return report;
  }finally{ await store.close(); }
}

if(require.main === module) (process.argv.includes('--backfill-codes')
  ? backfillMissingEventCodes() : run({ execute:process.argv.includes('--execute') })).then((report) =>
  console.log(JSON.stringify(report,null,2))).catch((error) => {
  console.error(error.code || '',error.stack || error);process.exitCode=1;
});

module.exports = { run, buildPlan, assertSafePlan, protectedProof, preparationProof, publicationProof,
  backfillMissingEventCodes,completeMissingEventCodes };
