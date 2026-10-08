'use strict';

const assert = require('node:assert/strict');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');
const { buildPlan, protectedProof, preparationProof } = require('./scope-qv-2027-publication-clone');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const CONNECTION = `postgresql://127.0.0.1:55432/${DATABASE}`;
const REPORT_ID = 'qv-source-923';
const DATE_FIELDS = ['event.endDate','event.endsAt','event.startDate','event.startsAt','fingerprint'];

async function otherEventsProof(store, eventId){
  const { rows } = await store.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) as hash
    from scope_evenements t where evenement_id<>$1`,[eventId]);
  return rows[0];
}

async function run(){
  const dataset = await buildCurrentCandidateDataset();
  const store = await ScopeQvPostgresStore.open({ connectionString:CONNECTION,
    deploymentMode:'clone',allowCloneConnection:true,expectedDatabase:DATABASE,
    statementTimeoutMs:120000 });
  try{
    const { plan,snapshot } = await buildPlan(store,dataset);
    const preparations = await preparationProof(store,dataset);
    assert.deepEqual(plan.summary,{ CREATE:0,UPDATE:1,UNCHANGED:124,BLOCKED:725,NOT_PUBLISHED:0 });
    const updates = plan.decisions.filter((decision) => decision.action === 'UPDATE');
    assert.equal(updates.length,1);
    const decision = updates[0];
    assert.equal(decision.caseId,REPORT_ID);
    assert.deepEqual(decision.changedFields.slice().sort(),DATE_FIELDS.slice().sort());
    assert.equal(decision.target.activity.statComCode,'071F3');
    assert.equal(decision.target.event.startDate,'2027-02-23');
    const existing = snapshot.find((row) => row.publicationKey === decision.publicationKey);
    assert.ok(existing);
    assert.equal(existing.desired.event.startDate,'2027-03-04');
    assert.ok(Object.values(existing.operationalState).every((count) => count === 0));
    const beforeProtected = await protectedProof(store);
    const beforeOthers = await otherEventsProof(store,existing.eventId);
    const client = await store.pool.connect();
    let simulated;
    try{
      await client.query('begin');
      store._client = client;
      const updatedId = await store.updateTarget(existing,decision.target,() => {});
      assert.equal(updatedId,existing.eventId);
      const after = await store.snapshot(2027,decision.publicationKey);
      assert.equal(after.length,1);
      assert.equal(after[0].eventId,existing.eventId);
      assert.equal(after[0].desired.event.startDate,'2027-02-23');
      assert.equal(after[0].desired.event.endDate,'2027-02-23');
      assert.deepEqual(await protectedProof(store),beforeProtected);
      assert.deepEqual(await otherEventsProof(store,existing.eventId),beforeOthers);
      simulated = { eventId:updatedId,date:after[0].desired.event.startDate,
        publishedEvents:(await store.snapshot(2027)).length };
    }finally{
      await client.query('rollback');
      store._client = null;
      client.release();
    }
    const afterRollback = await store.snapshot(2027,decision.publicationKey);
    assert.equal(afterRollback.length,1);
    assert.equal(afterRollback[0].eventId,existing.eventId);
    assert.equal(afterRollback[0].desired.event.startDate,'2027-03-04');
    assert.deepEqual(await protectedProof(store),beforeProtected);
    assert.deepEqual(await otherEventsProof(store,existing.eventId),beforeOthers);
    return { database:DATABASE,plan:plan.summary,preparations,caseId:REPORT_ID,
      publicationKey:decision.publicationKey,changedFields:decision.changedFields,
      before:{ eventId:existing.eventId,date:existing.desired.event.startDate,
        publishedEvents:snapshot.length,operationalState:existing.operationalState },
      simulated,afterRollback:{ eventId:afterRollback[0].eventId,
        date:afterRollback[0].desired.event.startDate },
      protectedTablesUnchanged:true,otherEventsUnchanged:true,transaction:'ROLLBACK' };
  }finally{ await store.close(); }
}

if(require.main === module) run().then((proof) => console.log(JSON.stringify(proof,null,2)))
  .catch((error) => { console.error(error.code || '',error.stack || error);process.exitCode=1; });

module.exports = { run };
