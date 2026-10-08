'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createPgRepo } = require('../netlify/lib/_scope-pg');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const SOURCE_REF = 'qv-source-862';
const EVENT_SOURCE = 'QV26-SEANCE-EM-ED042EBD';

async function fingerprint(client,table,where = 'true',params = []){
  const result = await client.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from ${table} t where ${where}`,params);
  return result.rows[0];
}

async function run(){
  const client = new Client({ connectionString:`postgresql://127.0.0.1:55432/${DATABASE}` });
  await client.connect();
  let open = false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const original = (await client.query(`select * from scope_quo_vadis_obligations
      where source_ref=$1 order by created_at limit 1`,[SOURCE_REF])).rows[0];
    assert.ok(original && original.statcom_code === 'EMSEA');
    const othersBefore = await fingerprint(client,'scope_quo_vadis_obligations','source_ref <> $1',[SOURCE_REF]);
    const eventsBefore = await fingerprint(client,'scope_evenements');
    const eventIdsBefore = (await client.query(`select evenement_id from scope_evenements
      where code_source=$1 order by date`,[EVENT_SOURCE])).rows.map((row) => row.evenement_id);
    assert.equal(eventIdsBefore.length,2);

    await client.query('begin'); open = true;
    let queue = Promise.resolve();
    const query = (...args) => {
      const next = queue.then(() => client.query(...args));
      queue = next.catch(() => {});
      return next;
    };
    const service = createScopeQuoVadisService({ database:{ query,transaction:async (work) => work({ query }) } });
    const body = { year:2027,status:'PLANIFIE',activityLabel:original.title,statCom:'EMSEA',
      domain:'F0',oiCodes:['SDIS'],publicCodes:[],themes:[],lieuId:original.lieu_id || null,
      salleTheorieId:original.salle_theorie_id || null,
      responsableFonctionCode:original.responsable_fonction_code || '' };
    await service.updateProgrammePreparation(SOURCE_REF,{ ...body,date:'2027-01-13',startTime:'18:00',endTime:'21:00' });
    const afterDate = (await client.query('select * from scope_quo_vadis_obligations where obligation_id=$1',[original.obligation_id])).rows[0];
    assert.equal(afterDate.statcom_code,'EMSEA');
    assert.equal(afterDate.imposed_start_at.toISOString().slice(0,10),'2027-01-13');
    await service.updateProgrammePreparation(SOURCE_REF,{ ...body,date:'2027-01-13',startTime:'18:30',endTime:'21:30' });
    const afterTime = (await client.query('select * from scope_quo_vadis_obligations where obligation_id=$1',[original.obligation_id])).rows[0];
    assert.equal(afterTime.statcom_code,'EMSEA');
    assert.equal(afterTime.imposed_start_at.toISOString().slice(11,16),'17:30');
    assert.equal(afterTime.imposed_end_at.toISOString().slice(11,16),'20:30');
    for(const field of ['obligation_id','source_ref','title','domain','statcom_code','lieu_id',
      'lieu_libre','salle_theorie_id','responsable_fonction_code']) assert.deepEqual(afterTime[field],original[field],field);
    assert.deepEqual(afterTime.cible_codes,original.cible_codes);
    assert.deepEqual(await fingerprint(client,'scope_quo_vadis_obligations','source_ref <> $1',[SOURCE_REF]),othersBefore);
    assert.deepEqual(await fingerprint(client,'scope_evenements'),eventsBefore);
    const eventIdsAfter = (await client.query(`select evenement_id from scope_evenements
      where code_source=$1 order by date`,[EVENT_SOURCE])).rows.map((row) => row.evenement_id);
    assert.deepEqual(eventIdsAfter,eventIdsBefore);

    const eventId = eventIdsBefore[0];
    const eventBefore = (await client.query('select * from scope_evenements where evenement_id=$1',[eventId])).rows[0];
    const otherEventsBefore = await fingerprint(client,'scope_evenements','evenement_id <> $1',[eventId]);
    await client.query(fs.readFileSync(path.resolve(__dirname,
      '../database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    const operational = createScopeService(createPgRepo(client));
    const actor = { sub:'clone-proof' };
    const movedDate = await operational.patchEvenement(eventId,
      { baseVersion:eventBefore.version,date:'2027-01-13' },actor);
    assert.equal(movedDate.evenement.evenement_id,eventId);
    const movedHours = await operational.patchEvenement(eventId,
      { baseVersion:movedDate.version,heureDebut:'18:30',heureFin:'21:30' },actor);
    assert.equal(movedHours.evenement.evenement_id,eventId);
    const eventAfter = (await client.query('select *,date::text as date_iso from scope_evenements where evenement_id=$1',[eventId])).rows[0];
    assert.equal(eventAfter.date_iso,'2027-01-13');
    assert.equal(eventAfter.heure_debut,'18:30');
    assert.equal(eventAfter.heure_fin,'21:30');
    for(const field of ['evenement_id','code_source','code_cours','statcom_code','publication_key',
      'libelle','domaine_code','statut']) assert.deepEqual(eventAfter[field],eventBefore[field],field);
    assert.deepEqual(await fingerprint(client,'scope_evenements','evenement_id <> $1',[eventId]),otherEventsBefore);
    const idsAfterMove = (await client.query(`select evenement_id from scope_evenements
      where code_source=$1 order by evenement_id`,[EVENT_SOURCE])).rows.map((row) => row.evenement_id);
    assert.deepEqual(idsAfterMove,eventIdsBefore.slice().sort());

    await client.query('rollback'); open = false;
    const restored = (await client.query('select * from scope_quo_vadis_obligations where obligation_id=$1',[original.obligation_id])).rows[0];
    assert.deepEqual(restored,original);
    assert.deepEqual(await fingerprint(client,'scope_quo_vadis_obligations','source_ref <> $1',[SOURCE_REF]),othersBefore);
    assert.deepEqual(await fingerprint(client,'scope_evenements'),eventsBefore);
    console.log(JSON.stringify({ verdict:'PASS',sourceRef:SOURCE_REF,obligationId:original.obligation_id,
      eventIds:eventIdsBefore,date:'2027-01-13',hours:'18:30-21:30',statCom:'EMSEA',
      otherPreparations:'UNCHANGED',operationalEventMoved:eventId,otherEvents:'UNCHANGED',rollback:'PASS' }));
  }finally{
    if(open) await client.query('rollback');
    await client.end();
  }
}

run().catch((error) => { console.error(error);process.exitCode=1; });
