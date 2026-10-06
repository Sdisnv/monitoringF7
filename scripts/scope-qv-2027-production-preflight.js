'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');
const { buildPlan, assertSafePlan, protectedProof } = require('./scope-qv-2027-publication-clone');

function productionConnection(){
  const raw = process.env.SCOPE_DATABASE_URL;
  assert.ok(raw,'SCOPE_DATABASE_URL is required');
  const url = new URL(raw);
  assert.equal(url.protocol,'postgresql:');
  assert.equal(url.hostname,'aws-0-eu-central-2.pooler.supabase.com');
  assert.equal(url.pathname,'/postgres');
  assert.equal(url.port,'6543');
  url.port = '5432';
  return url;
}

async function openProduction({ readOnly = true } = {}){
  const url = productionConnection();
  return ScopeQvPostgresStore.open({ connectionString:url.toString(),deploymentMode:'production',
    allowProductionConnection:true,expectedHost:url.hostname,expectedDatabase:'postgres',
    readOnly,statementTimeoutMs:120000,connectionTimeoutMs:10000 });
}

async function preflight(){
  const dataset = await buildCurrentCandidateDataset();
  const store = await openProduction();
  try{
    return await store.transaction(async () => {
      await store.query('set transaction isolation level repeatable read');
      const identity = (await store.query(`select current_database() as database,
        current_setting('transaction_read_only') as read_only,
        (select count(*)::integer from pg_catalog.pg_tables
          where schemaname='public' and tablename like 'scope_%') as scope_tables`)).rows[0];
      assert.equal(identity.database,'postgres');
      assert.equal(identity.read_only,'on');
      assert.ok(identity.scope_tables >= 110);
      const migrations = (await store.query(`select version from monitoring_f7_schema_migrations
        where version in ('scope-qv-publication-c23-repair-1','scope-event-identity-phase2')
        order by version`)).rows.map((row) => row.version);
      assert.deepEqual(migrations,['scope-qv-publication-c23-repair-1']);
      const programmes = await store.query('select programme_id from scope_quo_vadis_programmes where annee=2027');
      assert.equal(programmes.rows.length,1);
      const programmeId = programmes.rows[0].programme_id;
      const baseline = (await store.query(`select
        (select count(*)::integer from scope_evenements) as events,
        (select count(*)::integer from scope_qv_publication_links where source_year=2027) as qv_links,
        (select count(*)::integer from scope_quo_vadis_obligations where programme_id=$1) as obligations_2027,
        (select count(*)::integer from scope_participations) as participations,
        (select count(*)::integer from scope_attendus) as attendus,
        (select count(*)::integer from scope_affectations) as affectations,
        (select count(*)::integer from scope_journal_metier) as journal`,[programmeId])).rows[0];
      assert.deepEqual(baseline,{ events:250,qv_links:118,obligations_2027:109,
        participations:6160,attendus:5952,affectations:636,journal:2296 });
      const recent = (await store.query(`select
        (select count(*)::integer from scope_participations p join scope_evenements e
          on e.evenement_id=p.evenement_id
          where p.created_at >= timestamptz '2026-10-06 08:53:37 Europe/Zurich'
            and e.date=date '2026-10-05' and e.publication_key is null) as participations,
        (select count(*)::integer from scope_journal_metier j join scope_evenements e
          on e.evenement_id::text=j.entite_id
          where j.at >= timestamptz '2026-10-06 08:53:37 Europe/Zurich'
            and e.date=date '2026-10-05' and e.publication_key is null) as journal`)).rows[0];
      assert.deepEqual(recent,{ participations:4,journal:6 });
      const duplicate = (await store.query(`select count(*)::integer as n from (
        select publication_key from scope_evenements where publication_key is not null
        group by publication_key having count(*)>1) d`)).rows[0].n;
      assert.equal(duplicate,0);
      const codes = (await store.query(`select to_regclass('public.scope_event_code_allocations') as allocations,
        to_regclass('public.scope_event_code_sequences') as sequences`)).rows[0];
      assert.equal(codes.allocations,null);
      assert.equal(codes.sequences,null);
      const ascension = (await store.query(`select type_jour from scope_quo_vadis_calendar_days
        where programme_id=$1 and jour=date '2027-05-06' order by type_jour`,[programmeId])).rows;
      assert.deepEqual(ascension.map((row) => row.type_jour),['FERIE']);
      const collisions = (await store.query(`select source_ref from scope_quo_vadis_obligations
        where programme_id=$1 and source_ref=any($2::text[])`,
      [programmeId,dataset.candidateRows.map((row) => row.id)])).rows;
      assert.equal(collisions.length,0);
      const protectedBefore = await protectedProof(store);
      const { plan,snapshot } = await buildPlan(store,dataset);
      assertSafePlan(plan,snapshot,dataset,
        { CREATE:7,UPDATE:34,UNCHANGED:84,BLOCKED:725,NOT_PUBLISHED:0 });
      return { database:identity.database,host:store.target.host,port:store.target.port,
        readOnly:true,scopeTables:identity.scope_tables,migrations,baseline,
        calendarAscension:ascension.map((row) => row.type_jour),
        candidate:dataset.programme.length,validated:125,waitingValidation:725,
        localDecisions:dataset.localIds.size,sourceCollisions:collisions.length,
        duplicates:duplicate,plan:plan.summary,planFingerprint:plan.planFingerprint,
        changed:plan.decisions.filter((row) => ['CREATE','UPDATE'].includes(row.action))
          .map((row) => ({ id:row.caseId,action:row.action,fields:row.changedFields || [] })),
        protectedBefore };
    });
  }finally{ await store.close(); }
}

if(require.main === module) preflight().then((result) => {
  const file = path.resolve(__dirname,'../outputs/qv-2027-sql-recette/production-preflight.json');
  fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({ ...result,changed:result.changed.length },null,2));
}).catch((error) => { console.error(error.code || '',error.stack || error);process.exitCode=1; });

module.exports = { productionConnection,openProduction,preflight };
