'use strict';

const assert = require('node:assert/strict');
const { Client } = require('pg');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');
const { synchronizeEcawinReferential } = require('../netlify/lib/_scope-ecawin-referential');
const ecawin = require('../assets/js/scope-ecawin');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const PORT = Number(process.env.SCOPE_QV_CLONE_PORT || 55432);
const TABLES = ['scope_quo_vadis_obligations','scope_evenements','scope_participations',
  'scope_affectations','scope_attendus','scope_qv_publication_links',
  'scope_event_code_allocations','scope_event_code_sequences','scope_quo_vadis_calendar_days',
  'scope_personnes','scope_person_qualifications','scope_competence_definitions',
  'scope_quo_vadis_cursus_definitions','scope_quo_vadis_cursus_steps',
  'scope_quo_vadis_cursus_programmes','scope_quo_vadis_cursus_step_programmes','scope_statcom_referentiel',
  'scope_lieux','scope_salles_theorie','scope_responsable_fonctions'];

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
    const identityFields = ['statcom_id','code','domain','category','oi_code','specialization','specialization_label','valid_from','valid_to','created_at'];
    const referenceBefore = (await client.query(`select ${identityFields.join(',')},active from scope_statcom_referentiel order by code`)).rows;
    await synchronizeEcawinReferential(client);
    const referenceAfter = (await client.query('select * from scope_statcom_referentiel order by code')).rows;
    for(const original of referenceBefore){
      const current = referenceAfter.find(row=>row.code === original.code);
      assert.ok(current,`Reference ${original.code} removed`);
      for(const field of identityFields) assert.deepEqual(current[field],original[field],`${original.code}: ${field} changed`);
      if(original.active === false) assert.equal(current.active,false,`${original.code}: prior suspension lost`);
    }
    for(const association of ecawin.associations){
      const current = referenceAfter.find(row=>row.code === association.statCom);
      assert.equal(current.label,association.description);
      assert.equal(current.metadata.ecawin.activityCode,association.activityCode);
      if(!association.active) assert.equal(current.active,false);
    }
    assert.ok(referenceAfter.every(row=>!row.active || row.code === 'EMSEA' || ecawin.activityForStatCom(row.code)));
    const referenceFingerprint = await fingerprint(client,'scope_statcom_referentiel');
    await synchronizeEcawinReferential(client);
    assert.deepEqual(await fingerprint(client,'scope_statcom_referentiel'),referenceFingerprint,'Synchronization is not idempotent');
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
    const moduleRow = baseRows.find(row=>row.cursusStepId && row.cursusCode);
    assert.ok(moduleRow,'Configured cursus module required');
    const otherCursus = first.cursusSelections.find(row=>row.statut === 'ACTIF' && row.cursusId !== moduleRow.cursusId);
    assert.ok(otherCursus);
    await assert.rejects(service.updateProgrammePreparation(moduleRow.id,{year:2027,
      activityLabel:moduleRow.activityLabel || moduleRow.label,statCom:moduleRow.statCom,
      oiCodes:require('../assets/js/scope-ui-logic').qvNormalizeOiSelections(moduleRow,moduleRow.oiSelections || moduleRow.ois || []).codes,
      publicCodes:moduleRow.publics || [],status:'A_PLANIFIER',date:null,startTime:null,endTime:null,cursusId:otherCursus.cursusId}),
      error=>error.error === 'programme_cursus_module_verrouille');
    const originalOthers = await fingerprint(client,'scope_quo_vadis_obligations');
    const label = 'TEST RECETTE QV CREATION PR SANS OI';
    const input = {year:2027,activityLabel:label,domain:'F3',statCom:'011PR',oiCodes:[],
      publicCodes:['PR:2'],qualificationCodes:['PAPR'],ecawinActivityCode:'EXERCI',date:'2027-06-15',
      responsibleSelections:[{kind:'REFERENCE',code:'C PR'},{kind:'REFERENCE',code:'Cdt'},
        {kind:'FREE',label:'PrésidentE  Codir'},{kind:'FREE',label:'Responsable externe'}],
      publicFreeLabels:['Membres du Codir','Invités externes'],
      startTime:'14:00',endTime:'16:00',status:'PROPOSE'};
    await client.query('savepoint reference_cases');
    for(const statCom of ['CECAFB','0180F7','074F1','CONCOUR']){
      const createdReference = await service.createProgrammePreparation({...input,domain:'F7',statCom,
        ecawinActivityCode:ecawin.activityForStatCom(statCom)});
      const current = createdReference.quoVadis.canonicalProgramme.rows.find(row=>row.id === createdReference.itemId);
      assert.equal(current.statCom,statCom);
      assert.equal(current.ecawinActivityCode,ecawin.activityForStatCom(statCom));
      assert.equal(createdReference.quoVadis.ecawinCorrespondence.find(row=>row.programmeItemId === current.id).exportable,true);
    }
    await assert.rejects(service.createProgrammePreparation({...input,statCom:'010JY3',ecawinActivityCode:''}),
      error=>error.error === 'programme_ecawin_statcom_non_qualifie');
    await assert.rejects(service.createProgrammePreparation({...input,statCom:'COURJS',ecawinActivityCode:''}),
      error=>error.error === 'programme_ecawin_statcom_non_qualifie');
    const historical = await service.createProgrammePreparation(input);
    const existingBusinessCode = historical.quoVadis.canonicalProgramme.rows.find(row=>row.id === historical.itemId).businessCode;
    const requalified = await service.updateProgrammePreparation(historical.itemId,{...input,statCom:'0180F7',saveAction:'SAVE'});
    assert.equal(requalified.quoVadis.canonicalProgramme.rows.find(row=>row.id === historical.itemId).businessCode,existingBusinessCode);
    await client.query(`update scope_quo_vadis_obligations set statcom_code='010JY3',
      metadata=jsonb_set(jsonb_set(jsonb_set(metadata,'{planningFields,statCom}','"010JY3"'),
        '{manualSource,statCom}','"010JY3"'),'{planningFields,ecawinActivityCode}','""') where source_ref=$1`,[historical.itemId]);
    const historicalSaved = await service.updateProgrammePreparation(historical.itemId,{...input,statCom:'010JY3',ecawinActivityCode:'',saveAction:'SAVE'});
    const historicalRow = historicalSaved.quoVadis.canonicalProgramme.rows.find(row=>row.id === historical.itemId);
    assert.equal(historicalRow.statCom,'010JY3');
    assert.equal(historicalRow.businessCode,existingBusinessCode);
    assert.equal(historicalSaved.quoVadis.ecawinCorrespondence.find(row=>row.programmeItemId === historical.itemId).exportable,false);
    await assert.rejects(service.updateProgrammePreparation(historical.itemId,{...input,statCom:'010JY3',ecawinActivityCode:'',saveAction:'VALIDATE'}),
      error=>error.error === 'programme_statcom_invalide');
    await client.query('rollback to savepoint reference_cases');
    await assert.rejects(service.createProgrammePreparation({...input,endTime:'13:00'}),
      (error) => error.error === 'programme_horaire_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,date:'2028-06-15'}),
      (error) => error.error === 'programme_date_annee_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,ecawinActivityCode:'COURS'}),
      error=>error.error === 'programme_ecawin_association_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,ecawinActivityCode:'INVENTED'}),
      error=>error.error === 'programme_ecawin_code_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,qualificationCodes:['INVENTED']}),
      error=>error.error === 'programme_qualification_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,specialisation:'Saisie libre'}),
      error=>error.error === 'programme_qualification_invalide');
    await assert.rejects(service.createProgrammePreparation({...input,cursusId:'invented'}),
      error=>error.error === 'programme_cursus_invalide');
    const created = await service.createProgrammePreparation(input);
    assert.equal(created.updated,true);
    assert.match(created.itemId,/^QV27:MANUAL:[0-9a-f-]{36}$/);
    const find = (result) => result.canonicalProgramme.rows.find((row) => row.id === created.itemId);
    const createdRow = find(created.quoVadis);
    assert.ok(createdRow);
    assert.deepEqual(createdRow.ois,[]);
    assert.deepEqual(createdRow.publics,['PR:2']);
    assert.deepEqual(createdRow.publicFreeLabels,input.publicFreeLabels);
    assert.equal(createdRow.responsibleSelections.length,4);
    assert.equal(createdRow.responsibleSelections[2].label,'PrésidentE  Codir');
    assert.deepEqual(find(await service.listProgramme(2027)).responsibleSelections,createdRow.responsibleSelections);
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
    const plannedAgain=await service.updateProgrammePreparation(created.itemId,{...input,saveAction:'PLAN',status:'PROPOSE'});
    assert.equal(find(plannedAgain.quoVadis).businessCode,createdRow.businessCode);
    assert.equal((await client.query('select count(*)::integer as count from scope_quo_vadis_obligations where source_ref=$1',[created.itemId])).rows[0].count,1);
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
    for(const field of ['activityLabel','ois','publics','publicFreeLabels','responsibleSelections','businessCode','status','specialisation','cursus','businessValidation'])
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
    assert.deepEqual(await fingerprint(client,'scope_statcom_referentiel'),referenceFingerprint);
    for(const table of TABLES.filter((name) => !['scope_quo_vadis_obligations','scope_event_code_sequences','scope_quo_vadis_calendar_days','scope_statcom_referentiel'].includes(name)))
      assert.deepEqual(await fingerprint(client,table),before[table],`${table} changed`);
    await client.query('rollback');
    open = false;
    for(const table of TABLES) assert.deepEqual(await fingerprint(client,table),before[table],`${table} changed after rollback`);
    console.log(JSON.stringify({verdict:'PASS',baseline:847,created:created.itemId,
      businessCode:createdRow.businessCode,oi:createdRow.ois,publics:createdRow.publics,
      modified:true,moved:true,saveRetainsStates:true,validateRetainsPlanning:true,planValidatesAndPlans:true,validatedExplicitly:true,externalWithoutCode:true,
      officialReferences:ecawin.associations.length,referenceIdentitiesPreserved:true,referenceSyncIdempotent:true,
      historicalJspSavePreserved:true,newJspHistoricalRefused:true,newOfficialCodes:['CECAFB','0180F7','074F1','CONCOUR'],
      responsibleSelectionsPersisted:true,publicFreeLabelsSeparate:true,secondPlanWithoutDuplication:true,
      operationalEventsCreated:0,otherPreparationsChanged:0,persistedAfterRollback:0,port:PORT},null,2));
  } finally {
    if(open) await client.query('rollback');
    await client.end();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
