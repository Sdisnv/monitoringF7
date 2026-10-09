'use strict';

const assert = require('node:assert/strict');
const { Client } = require('pg');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const PORT = Number(process.env.SCOPE_QV_CLONE_PORT || 55432);
const TABLES = ['scope_quo_vadis_obligations','scope_evenements','scope_participations',
  'scope_affectations','scope_attendus','scope_qv_publication_links',
  'scope_event_code_allocations','scope_event_code_sequences','scope_quo_vadis_calendar_days'];

async function fingerprint(client, table, where = '') {
  const { rows } = await client.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from ${table} t ${where}`);
  return rows[0];
}

async function run() {
  assert.ok([5432,55432].includes(PORT), 'Unexpected local clone port');
  const client = new Client({ connectionString:`postgresql://127.0.0.1:${PORT}/${DATABASE}` });
  await client.connect();
  let open = false;
  try {
    const identity = (await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity,{name:DATABASE,host:'127.0.0.1/32',port:PORT});
    const before = {};
    for(const table of TABLES) before[table] = await fingerprint(client,table);
    await client.query('begin');
    open = true;
    let queue = Promise.resolve();
    const query = (...args) => {
      const next = queue.then(() => client.query(...args));
      queue = next.catch(() => {});
      return next;
    };
    const service = createScopeQuoVadisService({database:{query,transaction:(work) => work({query})}});
    const first = await service.listProgramme(2027);
    const baseRows = first.canonicalProgramme.rows.filter((row) => !row.external && !row.jspDirectionReconciliation
      && row.cursusReconciliation?.status !== 'SUPERSEDED_BY_VALIDATED_MODULE');
    assert.equal(baseRows.length,847);
    const originalOthers = await fingerprint(client,'scope_quo_vadis_obligations');
    const label = 'TEST RECETTE QV CREATION PR SANS OI';
    const input = {year:2027,activityLabel:label,domain:'F3',statCom:'011PR',oiCodes:[],
      publicCodes:['PR:2'],specialisation:'PR',cursus:'',date:'2027-06-15',
      startTime:'14:00',endTime:'16:00',status:'PROPOSE'};
    await assert.rejects(service.createProgrammePreparation({...input,endTime:'13:00'}),
      (error) => error.error === 'programme_horaire_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,date:'2028-06-15'}),
      (error) => error.error === 'programme_date_annee_invalide');
    const created = await service.createProgrammePreparation(input);
    assert.equal(created.updated,true);
    assert.match(created.itemId,/^QV27:MANUAL:[0-9a-f-]{36}$/);
    const find = (result) => result.canonicalProgramme.rows.find((row) => row.id === created.itemId);
    const createdRow = find(created.quoVadis);
    assert.ok(createdRow);
    assert.deepEqual(createdRow.ois,[]);
    assert.deepEqual(createdRow.publics,['PR:2']);
    assert.equal(createdRow.status,'PROPOSE');
    assert.equal(createdRow.businessValidation,null);
    assert.equal(createdRow.publishedEventId,undefined);
    assert.match(createdRow.businessCode,/^011PR\.\d{3}$/);
    assert.equal(find(await service.listProgramme(2027)).businessCode,createdRow.businessCode);
    const otherAfterCreate = await fingerprint(client,'scope_quo_vadis_obligations',
      `where source_ref is distinct from '${created.itemId}'`);
    assert.deepEqual(otherAfterCreate,originalOthers);
    const edited = await service.updateProgrammePreparation(created.itemId,{...input,
      activityLabel:`${label} MODIFIE`,date:'2027-06-16',startTime:'15:00',endTime:'17:00'});
    assert.equal(find(edited.quoVadis).activityLabel,`${label} MODIFIE`);
    assert.equal(find(edited.quoVadis).startsAt.slice(0,16),'2027-06-16T15:00');
    const saved = await service.updateProgrammePreparation(created.itemId,{...input,saveAction:'SAVE',status:'PLANIFIE'});
    assert.equal(find(saved.quoVadis).status,'PROPOSE');
    assert.equal(find(saved.quoVadis).businessValidation,null);
    const onlyValidated = await service.updateProgrammePreparation(created.itemId,{...input,saveAction:'VALIDATE',status:'PLANIFIE'});
    assert.equal(find(onlyValidated.quoVadis).status,'PROPOSE');
    assert.ok(find(onlyValidated.quoVadis).businessValidation);
    const planned = await service.updateProgrammePreparation(created.itemId,{...input,saveAction:'PLAN',status:'PROPOSE'});
    assert.equal(find(planned.quoVadis).status,'PLANIFIE');
    assert.ok(find(planned.quoVadis).businessValidation);
    assert.equal(find(planned.quoVadis).businessCode,createdRow.businessCode);
    await assert.rejects(service.updateProgrammePreparation(created.itemId,{...input,saveAction:'PLAN',date:null,startTime:null,endTime:null}),
      (error) => error.error === 'programme_statut_invalide');
    const moved = await service.updateProgrammePreparation(created.itemId,{...input,
      activityLabel:`${label} MODIFIE`,date:'2027-06-17',startTime:'15:00',endTime:'17:00'});
    assert.equal(find(moved.quoVadis).startsAt.slice(0,16),'2027-06-17T15:00');
    assert.equal(find(await service.listProgramme(2027)).startsAt.slice(0,16),'2027-06-17T15:00');
    const validated = await service.updateProgrammePreparation(created.itemId,{...input,
      activityLabel:`${label} MODIFIE`,date:'2027-06-17',startTime:'15:00',endTime:'17:00',
      status:'PLANIFIE',validateBusiness:true});
    assert.ok(find(validated.quoVadis).businessValidation);
    assert.equal(find(validated.quoVadis).businessCode,createdRow.businessCode);
    const beforeMove = find(await service.listProgramme(2027));
    const movedOnlyDate = await service.updateProgrammePreparation(created.itemId,{year:2027,
      moveDate:true,date:'2027-06-19',activityLabel:'UNWANTED CHANGE',oiCodes:['INVALID'],publicCodes:['INVALID']});
    const afterMove = find(movedOnlyDate.quoVadis);
    assert.equal(afterMove.startsAt.slice(0,16),'2027-06-19T15:00');
    assert.equal(find(await service.listProgramme(2027)).startsAt.slice(0,16),'2027-06-19T15:00');
    for(const field of ['activityLabel','ois','publics','businessCode','status','specialisation','cursus','businessValidation'])
      assert.deepEqual(afterMove[field],beforeMove[field],`${field} changed during date move`);
    const published = baseRows.find(row=>row.publishedEventId && row.definitionId !== 'CTA-PERMANENCE');
    assert.ok(published);
    await assert.rejects(service.updateProgrammePreparation(published.id,{year:2027,moveDate:true,date:'2027-06-19'}),
      error=>error.error === 'programme_deplacement_verrouille');
    await assert.rejects(service.updateProgrammePreparation(created.itemId,{...input,statCom:'070F3',
      date:'2027-06-17',startTime:'15:00',endTime:'17:00'}),
      (error) => error.error === 'programme_code_valide_immuable');
    const external = await service.createProgrammePreparation({...input,activityLabel:'TEST RECETTE QV EXTERNE',
      statCom:'',externalActivity:true,date:'2027-06-18'});
    const externalRow = external.quoVadis.canonicalProgramme.rows.find((row) => row.id === external.itemId);
    assert.equal(externalRow.businessCode,'');
    assert.equal(externalRow.externalActivity,true);
    assert.deepEqual(await fingerprint(client,'scope_quo_vadis_obligations',
      `where source_ref is distinct from '${created.itemId}' and source_ref is distinct from '${external.itemId}'`),originalOthers);
    assert.equal((await fingerprint(client,'scope_evenements')).hash,before.scope_evenements.hash);
    for(const table of TABLES.filter((name) => !['scope_quo_vadis_obligations','scope_event_code_sequences','scope_quo_vadis_calendar_days'].includes(name)))
      assert.deepEqual(await fingerprint(client,table),before[table],`${table} changed`);
    await client.query('rollback');
    open = false;
    for(const table of TABLES) assert.deepEqual(await fingerprint(client,table),before[table],`${table} changed after rollback`);
    console.log(JSON.stringify({verdict:'PASS',baseline:847,created:created.itemId,
      businessCode:createdRow.businessCode,oi:createdRow.ois,publics:createdRow.publics,
      modified:true,moved:true,saveRetainsStates:true,validateRetainsPlanning:true,planValidatesAndPlans:true,validatedExplicitly:true,externalWithoutCode:true,
      operationalEventsCreated:0,otherPreparationsChanged:0,persistedAfterRollback:0,port:PORT},null,2));
  } finally {
    if(open) await client.query('rollback');
    await client.end();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
