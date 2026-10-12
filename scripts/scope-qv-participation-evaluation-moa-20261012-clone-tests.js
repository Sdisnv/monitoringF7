'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { createPgRepo } = require('../netlify/lib/_scope-pg');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const { protectedProof } = require('./scope-qv-2027-publication-clone');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const CONNECTION = `postgresql://localhost:5432/${DATABASE}`;

async function durableProof(client){
  const proof = {};
  for(const table of ['scope_evenements','scope_event_definitions','scope_qv_publication_links',
    'scope_qv_publication_activities','scope_qv_session_groups','scope_qv_session_events',
    'scope_event_code_allocations','scope_event_code_sequences']){
    proof[table] = (await client.query(`select count(*)::integer as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' order by md5(to_jsonb(t)::text)), '')) as hash
      from ${table} t`)).rows[0];
  }
  return proof;
}

test('localhost:5432 clone: publication, filtering, type priority and history integrity in BEGIN/ROLLBACK', async () => {
  const store = new ScopeQvPostgresStore({ connectionString:CONNECTION,
    deploymentMode:'clone',allowCloneConnection:true,expectedDatabase:DATABASE });
  let client;
  let before;
  let protectedBefore;
  let createdId;
  let catalogueTableBefore;
  try{
    client = await store.pool.connect();
    await client.query('BEGIN');
    store._client = client;
    assert.equal((await client.query('select current_database() as db')).rows[0].db, DATABASE);
    catalogueTableBefore = (await client.query("select to_regclass('scope_activity_participation_rules') as name")).rows[0].name;
    if(!catalogueTableBefore) await client.query(fs.readFileSync(path.join(__dirname,
      '../database/migrations/20261007_scope_qv_participation_catalogue_1.sql'), 'utf8'));
    before = await durableProof(client);
    protectedBefore = await protectedProof(store);
    const selected = (await client.query(`select e.publication_key,o.obligation_id from scope_evenements e
      join scope_qv_publication_links p on p.evenement_id=e.evenement_id
      join scope_quo_vadis_programmes q on q.annee=p.source_year
      join scope_quo_vadis_obligations o on o.programme_id=q.programme_id and o.source_ref=p.publication_unit_id
      where e.publication_key is not null and e.statut='PLANIFIE'
        and o.metadata->>'source'='QV_PROGRAMME_PREPARATION'
        and not exists(select 1 from scope_attendus a where a.evenement_id=e.evenement_id)
        and not exists(select 1 from scope_participations p where p.evenement_id=e.evenement_id)
      order by e.publication_key limit 1`)).rows[0];
    assert.ok(selected, 'An existing publication without operational data is required.');
    const existing = (await store.snapshot(2027, selected.publication_key))[0];
    const repo = createPgRepo(client);
    const original = await repo.getEvent(existing.eventId);
    assert.equal(original.participationEvaluation, true);
    await client.query('SAVEPOINT preparation_flag');
    await client.query(`update scope_quo_vadis_obligations set metadata=jsonb_set(metadata,
      '{planningFields}',coalesce(metadata->'planningFields','{}'::jsonb) || '{"participationEvaluation":false}'::jsonb)
      where obligation_id=$1`, [selected.obligation_id]);
    const preparedOnly = await repo.getEvent(existing.eventId);
    assert.equal(preparedOnly.participationEvaluation, false);
    assert.deepEqual(preparedOnly.engine_snapshot, original.engine_snapshot);
    assert.equal((await repo.listEvenements({ annee:2027,participationOnly:true }))
      .some((event) => event.evenement_id === existing.eventId), false);
    // Restore the exact preparation metadata before publication integrity comparisons.
    await client.query('ROLLBACK TO SAVEPOINT preparation_flag');
    await client.query('RELEASE SAVEPOINT preparation_flag');
    const target = structuredClone(existing.desired);
    target.event.participationEvaluation = false;
    target.fingerprint = planner.targetFingerprint(target);
    await client.query('SAVEPOINT json_null_snapshot');
    await client.query(`update scope_evenements set engine_snapshot='null'::jsonb where evenement_id=$1`, [existing.eventId]);
    await store.updateTarget(existing, target, () => {});
    assert.deepEqual((await repo.getEvent(existing.eventId)).engine_snapshot, {
      participationEvaluation:false,descriptivePublics:target.event.descriptivePublics || []
    });
    await client.query('ROLLBACK TO SAVEPOINT json_null_snapshot');
    await client.query('RELEASE SAVEPOINT json_null_snapshot');
    assert.equal(await store.updateTarget(existing, target, () => {}), existing.eventId);
    const disabled = await repo.getEvent(existing.eventId);
    assert.equal(disabled.participationEvaluation, false);
    assert.deepEqual(disabled.engine_snapshot, { ...(original.engine_snapshot || {}),participationEvaluation:false,
      descriptivePublics:target.event.descriptivePublics || [] });
    assert.equal((await repo.listEvenements({ annee:2027,participationOnly:true }))
      .some((event) => event.evenement_id === existing.eventId), false);
    assert.equal((await repo.listEvenements({ annee:2027 }))
      .some((event) => event.evenement_id === existing.eventId), true);
    assert.equal((await repo.loadAnalyticsBundle({ from:disabled.date,to:disabled.date,evenementId:existing.eventId }))
      .events.length, 0);
    const updated = (await store.snapshot(2027, selected.publication_key))[0];
    assert.equal(updated.desired.event.participationEvaluation, false);
    assert.equal(updated.fingerprint, target.fingerprint);
    assert.deepEqual(updated.desired.relations, existing.desired.relations);
    assert.deepEqual(updated.desired.session, existing.desired.session);
    assert.deepEqual(await protectedProof(store), protectedBefore);

    for(const table of ['scope_qv_publication_links','scope_quo_vadis_programmes','scope_quo_vadis_obligations']){
      await client.query('SAVEPOINT optional_table');
      await client.query(`alter table ${table} rename to scope_moa12_optional_table`);
      const standardRepo = createPgRepo(client);
      assert.equal((await standardRepo.getEvent(existing.eventId)).participationEvaluation, false);
      assert.equal((await standardRepo.listEvenements({ annee:2027,participationOnly:true }))
        .some((event) => event.evenement_id === existing.eventId), false);
      assert.equal((await standardRepo.loadAnalyticsBundle({ from:disabled.date,to:disabled.date,evenementId:existing.eventId }))
        .events.length, 0);
      await client.query('ROLLBACK TO SAVEPOINT optional_table');
      await client.query('RELEASE SAVEPOINT optional_table');
    }

    // Exercise the existing type metadata channel without altering the clone permanently.
    await client.query('SAVEPOINT type_default');
    await client.query(`update scope_event_definitions set metadata=metadata ||
      '{"participationEvaluationDefault":false}'::jsonb where code=$1`, [original.code_source]);
    await client.query(`update scope_evenements set engine_snapshot=engine_snapshot - 'participationEvaluation'
      where evenement_id=$1`, [existing.eventId]);
    assert.equal((await repo.getEvent(existing.eventId)).participationEvaluation, true);
    const future = await repo.insertEvenement({ date:'2028-04-01',domaine_code:original.domaine_code,
      libelle:'MOA12 future default',code_source:original.code_source });
    assert.equal(future.engine_snapshot.participationEvaluation, false);
    assert.equal((await repo.getEvent(future.evenement_id)).participationEvaluation, false);
    await repo.updateEventIfVersion(future.evenement_id,future.version,{ statut:'REALISE' });
    await client.query(`update scope_event_definitions set metadata=metadata ||
      '{"participationEvaluationDefault":true}'::jsonb where code=$1`, [original.code_source]);
    assert.equal((await repo.getEvent(future.evenement_id)).participationEvaluation, false);
    const frozen = await repo.insertEvenement({ date:'2028-04-02',domaine_code:original.domaine_code,
      libelle:'MOA12 historical freeze',code_source:original.code_source });
    assert.equal(frozen.engine_snapshot.participationEvaluation, true);
    await repo.updateEventIfVersion(frozen.evenement_id,frozen.version,{ statut:'REALISE' });
    await client.query(`update scope_event_definitions set metadata=metadata ||
      '{"participationEvaluationDefault":false}'::jsonb where code=$1`, [original.code_source]);
    assert.equal((await repo.getEvent(frozen.evenement_id)).participationEvaluation, true);
    await client.query('update scope_evenements set engine_snapshot=null where evenement_id=$1', [frozen.evenement_id]);
    const historical = await repo.getEvent(frozen.evenement_id);
    assert.equal(historical.participationEvaluation, true);
    assert.equal(historical.statut, 'REALISE');
    assert.equal((await repo.listEvenements({ annee:2028,participationOnly:true }))
      .some((event) => event.evenement_id === historical.evenement_id), true);
    await client.query(`update scope_evenements set engine_snapshot=engine_snapshot ||
      '{"participationEvaluation":true}'::jsonb where evenement_id=$1`, [existing.eventId]);
    assert.equal((await repo.getEvent(existing.eventId)).participationEvaluation, true);
    await client.query('ROLLBACK TO SAVEPOINT type_default');
    await client.query('RELEASE SAVEPOINT type_default');

    const created = structuredClone(target);
    const suffix = `MOA12-${randomUUID()}`;
    created.source.occurrenceId = suffix;
    created.source.sessionId = `${suffix}:S1`;
    created.source.publicationUnitId = suffix;
    created.source.sourceRecordIds = [suffix];
    created.occurrence = { occurrenceId:suffix,sessionId:`${suffix}:S1`,publicationUnitId:suffix };
    created.session = { groupId:suffix,index:1,count:1,label:null };
    created.event.descriptivePublics = [{ code:'CMDT:CODIR',label:'Membres du Codir' }];
    created.relations.publicCodes = [];
    created.publicationKey = planner.canonicalPublicationKey({ year:2027,source:created.source });
    created.fingerprint = planner.targetFingerprint(created);
    createdId = await store.createTarget(created, () => {});
    assert.equal((await repo.getEvent(createdId)).participationEvaluation, false);
    assert.deepEqual((await repo.getEvent(createdId)).descriptivePublics, created.event.descriptivePublics);
    assert.deepEqual((await store.getByPublicationKey(created.publicationKey)).desired.relations.publicCodes, []);
    assert.equal((await store.getByPublicationKey(created.publicationKey)).fingerprint, created.fingerprint);
    assert.equal((await repo.listEvenements({ annee:2027,participationOnly:true }))
      .some((event) => event.evenement_id === createdId), false);
    assert.equal((await repo.listEvenements({ annee:2027 })).some((event) => event.evenement_id === createdId), true);
    assert.deepEqual(await repo.listAttendus(createdId), []);
    assert.deepEqual(await repo.listParticipations(createdId), []);
    assert.deepEqual(await protectedProof(store), protectedBefore);
  }finally{
    try{
    if(client){
      await client.query('ROLLBACK');
      store._client = null;
      try{
        await client.query('BEGIN READ ONLY');
        store._client = client;
        if(before) assert.deepEqual(await durableProof(client), before);
        if(protectedBefore) assert.deepEqual(await protectedProof(store), protectedBefore);
        if(createdId) assert.equal((await client.query('select 1 from scope_evenements where evenement_id=$1', [createdId])).rowCount, 0);
        assert.equal((await client.query("select to_regclass('scope_activity_participation_rules') as name")).rows[0].name,
          catalogueTableBefore);
      }finally{
        await client.query('ROLLBACK');
        store._client = null;
        client.release();
      }
    }
    }finally{ await store.close(); }
  }
});
