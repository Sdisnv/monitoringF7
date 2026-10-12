'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createFixture} = require('./scope-qv-local-fixture');
const {baselineService,responsibleMigration,preservedFields,input} = require('./scope-qv-moa-backend-20261012-helpers');
const ecawin = require('../assets/js/scope-ecawin');

const getRow = (data,id) => data.canonicalProgramme.rows.find(row => row.id === id);
async function scenario(){
  const references = structuredClone(require('./fixtures/scope-qv-business-references.json'));
  references.responsables.push({code:'À affecter',libelle:'À affecter',actif:true});
  const fixture = createFixture(null,{references});
  const first = await fixture.service.listProgramme(2027);
  const row = first.canonicalProgramme.rows.find(row => row.statCom === '011PR' && !row.external);
  return {fixture,row,first,references};
}

test('EXERCI cible les associations confirmees et conserve 100% des Stat.Com, codes, IDs, decisions et themes 2027',async()=>{
  const fixture = createFixture(null);
  const before = await baselineService().createScopeQuoVadisService({database:fixture.database}).listProgramme(2027);
  const after = await fixture.service.listProgramme(2027);
  assert.deepEqual(preservedFields(after.canonicalProgramme.rows),preservedFields(before.canonicalProgramme.rows));
  assert.ok(after.canonicalProgramme.rows.length > 800);
  assert.ok(after.canonicalProgramme.rows.every(row => row.ecawinActivityCode
    === (ecawin.activityForStatCom(row.statCom) === 'EXERCI' ? 'EXERCI' : '')));
  assert.ok(after.canonicalProgramme.rows.every(row => row.participationEvaluation === true));
  const mismatched = after.canonicalProgramme.rows.find(row => row.statCom && ecawin.activityForStatCom(row.statCom)
    && ecawin.activityForStatCom(row.statCom) !== 'EXERCI');
  assert.ok(mismatched);
  assert.equal(mismatched.ecawinActivityCode,'');
  assert.equal(after.ecawinCorrespondence.find(row => row.programmeItemId === mismatched.id).exportable,false);
  const writes = fixture.queries.filter(({sql}) => /^(insert into|update|delete from) scope_(evenements|participations|affectations|attendus|personnes)\b/i.test(sql.trim()));
  assert.deepEqual(writes,[]);
});

test('les choix ECA explicites meme vides restent des decisions humaines et le defaut est limite a 2027',async()=>{
  const {fixture,first} = await scenario();
  const course = first.canonicalProgramme.rows.find(row => ecawin.activityForStatCom(row.statCom) === 'COURS' && !row.external);
  assert.ok(course);
  const savedCourse = await fixture.service.updateProgrammePreparation(course.id,input(course,{ecawinActivityCode:'COURS'}));
  assert.equal(getRow(savedCourse.quoVadis,course.id).ecawinActivityCode,'COURS');
  await fixture.service.updateProgrammePreparation(course.id,input(course));
  assert.equal(getRow(await fixture.service.listProgramme(2027),course.id).ecawinActivityCode,'COURS');
  const exercise = first.canonicalProgramme.rows.find(row => row.statCom === '011PR' && !row.external);
  await fixture.service.updateProgrammePreparation(exercise.id,input(exercise,{ecawinActivityCode:'',saveAction:'VALIDATE'}));
  assert.equal(getRow(await fixture.service.listProgramme(2027),exercise.id).ecawinActivityCode,'');
  await fixture.service.listProgramme(2028);
  const future = await fixture.service.listProgramme(2028);
  assert.ok(future.canonicalProgramme.rows.every(row => row.ecawinActivityCode === ''));
});

test('les titres exacts PR 1.1 a 1.6 et leurs themes survivent a deux enregistrements',async()=>{
  const {fixture,first} = await scenario();
  const series = first.canonicalProgramme.rows.filter(row => /^Exercice PR 1\.[1-6]$/.test(row.eventDisplayLabel));
  assert.equal(series.length,6);
  for(const row of series){
    for(let pass=0;pass<2;pass++){
      const saved = await fixture.service.updateProgrammePreparation(row.id,input(row));
      const current = getRow(saved.quoVadis,row.id);
      assert.equal(current.activityLabel,row.eventDisplayLabel);
      assert.equal(current.eventDisplayLabel,row.eventDisplayLabel);
      assert.deepEqual(current.themes,row.themes);
      assert.equal(current.statCom,row.statCom);
      assert.equal(current.code,row.code);
    }
  }
  assert.equal(fixture.preparations.length,6);
});

test('un snapshot automatique garde le titre occurrence, une decision humaine garde son titre exact',async()=>{
  const {fixture,first} = await scenario();
  const row = first.canonicalProgramme.rows.find(row => row.eventDisplayLabel === 'Exercice PR 1.6');
  await fixture.service.updateProgrammePreparation(row.id,input(row));
  const stored = fixture.preparations[0];
  stored.metadata.humanDecision = false;
  stored.metadata.automatedSnapshot = true;
  stored.metadata.planningFields.activityLabel = 'Exercice PR 1';
  assert.equal(getRow(await fixture.service.listProgramme(2027),row.id).activityLabel,'Exercice PR 1.6');
  await fixture.service.updateProgrammePreparation(row.id,input(row));
  assert.equal(stored.metadata.planningFields.activityLabel,'Exercice PR 1.6');
  const title = 'Exercice PR 1.6  décision MOA';
  await fixture.service.updateProgrammePreparation(row.id,input(row,{activityLabel:title,themes:['Thème MOA']}));
  await fixture.service.updateProgrammePreparation(row.id,input(row));
  const current = getRow(await fixture.service.listProgramme(2027),row.id);
  assert.equal(current.eventDisplayLabel,title);
  assert.deepEqual(current.themes,['Thème MOA']);
  delete stored.metadata.automatedSnapshot;
  delete stored.metadata.humanDecision;
  assert.equal(getRow(await fixture.service.listProgramme(2027),row.id).eventDisplayLabel,title);
  await fixture.service.updateProgrammePreparation(row.id,input(row));
  assert.equal(stored.metadata.planningFields.activityLabel,title);
});

test('references inclusives gardent les codes stables et les libelles historiques ou libres exacts',async()=>{
  const {fixture,row,first} = await scenario();
  for(const code of ['Présidente CI','Présidente Codir']){
    assert.equal(first.responsableFonctions.find(reference => reference.code === code).libelle,code.replace('Présidente ','PrésidentE '));
  }
  const choices = [{kind:'REFERENCE',code:'Présidente Codir'},{kind:'REFERENCE',code:'Présidente CI'},
    {kind:'FREE',label:'Présidente  Codir libre'}];
  const saved = await fixture.service.updateProgrammePreparation(row.id,input(row,{responsibleSelections:choices}));
  const selected = getRow(saved.quoVadis,row.id).responsibleSelections;
  assert.equal(selected[0].code,'Présidente Codir');
  assert.equal(selected[0].label,'PrésidentE Codir');
  assert.equal(selected[1].label,'PrésidentE CI');
  assert.equal(selected[2].label,'Présidente  Codir libre');
  const stored = fixture.preparations[0];
  stored.metadata.planningFields.responsibleSelections[0].label = 'Présidente  Codir historique';
  const reopened = await fixture.service.updateProgrammePreparation(row.id,input(row,{responsibleSelections:choices}));
  assert.equal(getRow(reopened.quoVadis,row.id).responsibleSelections[0].label,'Présidente  Codir historique');
  assert.equal(stored.responsable_fonction_code,'Présidente Codir');
  delete stored.metadata.planningFields.responsibleSelections;
  stored.metadata.planningFields.responsibleLabel = 'Présidente Codir historique scalaire';
  const scalarHistory = await fixture.service.updateProgrammePreparation(row.id,input(row,{responsibleSelections:[choices[0]]}));
  assert.equal(getRow(scalarHistory.quoVadis,row.id).responsibleSelections[0].label,'Présidente Codir historique scalaire');
});

test('A affecter est une sentinelle sans acteur, meme avec des selections multiples',async()=>{
  const {fixture,row,first} = await scenario();
  assert.equal(first.responsableFonctions.some(reference => reference.code === 'À affecter'),false);
  const saved = await fixture.service.updateProgrammePreparation(row.id,input(row,{responsibleSelections:[
    {kind:'REFERENCE',code:'À affecter'},{kind:'FREE',label:'À affecter'},{kind:'REFERENCE',code:'C PR'}]}));
  assert.deepEqual(getRow(saved.quoVadis,row.id).responsibleSelections,[{kind:'REFERENCE',code:'C PR',label:'C PR'}]);
  assert.equal(fixture.preparations[0].responsable_fonction_code,'C PR');
  await fixture.service.updateProgrammePreparation(row.id,input(row,{responsableFonctionCode:'À affecter'}));
  assert.equal(fixture.preparations[0].responsable_fonction_code,null);
  assert.equal(fixture.preparations[0].metadata.planningFields.responsibleLabel,'');
});

test('CMDT:CODIR reste un public descriptif permanent, sans inventer de population',async()=>{
  const {fixture,row} = await scenario();
  const saved = await fixture.service.updateProgrammePreparation(row.id,input(row,{publicCodes:['CMDT:CODIR'],publicFreeLabels:['Invités  libres']}));
  assert.deepEqual(getRow(saved.quoVadis,row.id).publics,['CMDT:CODIR']);
  assert.deepEqual(getRow(saved.quoVadis,row.id).publicFreeLabels,['Invités  libres']);
  assert.deepEqual(fixture.preparations[0].cible_codes,['CMDT:CODIR']);
  assert.ok(!fixture.queries.some(({sql}) => /^(insert into|update|delete from) scope_(public_definitions|personnes|affectations|attendus|participations|evenements)\b/.test(sql.trim())));
});

test('EXEPRO est officiel, EXERPO historique reste lisible et enregistrable sans changer le Stat.Com',async()=>{
  assert.ok(ecawin.activityCodes.includes('EXEPRO'));
  assert.ok(!ecawin.activityCodes.includes('EXERPO'));
  assert.equal(ecawin.canonicalActivityCode('EXERPO'),'EXEPRO');
  assert.equal(ecawin.isActivityCode('EXERPO'),true);
  const {fixture,row} = await scenario();
  for(const code of ['EXERPO','EXEPRO']){
    const saved = await fixture.service.updateProgrammePreparation(row.id,input(row,{ecawinActivityCode:code}));
    const current = getRow(saved.quoVadis,row.id);
    assert.equal(current.ecawinActivityCode,code);
    assert.equal(current.statCom,row.statCom);
    assert.equal(saved.quoVadis.ecawinCorrespondence.find(item => item.programmeItemId === row.id).exportable,false);
  }
});

test('un Stat.Com incompatible ou historique reste conserve a la relecture et a SAVE',async()=>{
  const {fixture,row} = await scenario();
  await fixture.service.updateProgrammePreparation(row.id,input(row));
  const stored = fixture.preparations[0];
  for(const statCom of ['010JY3','COURJS']){
    stored.statcom_code = statCom;
    stored.metadata.planningFields.statCom = statCom;
    const saved = await fixture.service.updateProgrammePreparation(row.id,input(row,{statCom,ecawinActivityCode:'EXERCI'}));
    assert.equal(getRow(saved.quoVadis,row.id).statCom,statCom);
    assert.equal(stored.statcom_code,statCom);
    assert.equal(saved.quoVadis.ecawinCorrespondence.find(item => item.programmeItemId === row.id).exportable,false);
  }
});

test('un Stat.Com inconnu est refuse avant la compatibilite ECA, sans changer les erreurs des codes connus',async()=>{
  const {fixture,row,references} = await scenario();
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,input(row,{statCom:'FAUX',ecawinActivityCode:'EXERCI'})),
    error => error.error === 'programme_statcom_invalide' && error.status === 422);
  const course = references.statcoms.find(reference => reference.active !== false && ecawin.activityForStatCom(reference.code) === 'COURS');
  assert.ok(course);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,input(row,{statCom:course.code,ecawinActivityCode:'EXERCI'})),
    error => error.error === 'programme_ecawin_association_invalide' && error.status === 422);
  assert.equal(fixture.preparations.length,0);
});

test('participationEvaluation refuse les faux booleens avant toute ecriture',async()=>{
  const {fixture,row} = await scenario();
  for(const value of [null,undefined,'false','true',0,1,[],{}]){
    const before = fixture.queries.length;
    await assert.rejects(fixture.service.updateProgrammePreparation(row.id,input(row,{participationEvaluation:value})),
      error => error.error === 'programme_participation_evaluation_invalide' && error.status === 422);
    assert.equal(fixture.queries.length,before);
  }
  assert.equal(fixture.preparations.length,0);
});

test('participationEvaluation false persiste dans SAVE, VALIDATE, deplacement et reconduction 2028/2029',async()=>{
  const {fixture,row} = await scenario();
  await fixture.service.updateProgrammePreparation(row.id,input(row,{participationEvaluation:false}));
  await fixture.service.updateProgrammePreparation(row.id,input(row,{saveAction:'VALIDATE'}));
  await fixture.service.updateProgrammePreparation(row.id,{year:2027,moveDate:true,date:'2027-06-16'});
  const original = fixture.preparations[0];
  assert.equal(original.metadata.planningFields.participationEvaluation,false);
  assert.equal(original.metadata.businessValidation.fields.participationEvaluation,false);
  assert.equal((await fixture.service.listProgramme(2027)).activities.find(activity => activity.sourceRef === row.id).participationEvaluation,false);
  await fixture.service.generateProgramme(2028);
  const future = fixture.preparations.find(item => item.programme_id === 'local-qv-2028' && item.metadata.lineage?.key === row.id);
  assert.ok(future);
  assert.equal(future.metadata.reconductedBusiness.participationEvaluation,false);
  const read2028 = await fixture.service.listProgramme(2028);
  assert.equal(getRow(read2028,future.source_ref).participationEvaluation,false);
  assert.ok(read2028.canonicalProgramme.rows.filter(item => item.id !== future.source_ref).every(item => item.participationEvaluation === true));
  await fixture.service.updateProgrammePreparation(future.source_ref,{...input(row),year:2028,
    date:'2028-06-15',saveAction:'VALIDATE',participationEvaluation:true});
  assert.equal(future.metadata.planningFields.participationEvaluation,true);
  await fixture.service.generateProgramme(2029);
  const next = fixture.preparations.find(item => item.programme_id === 'local-qv-2029' && item.metadata.lineage?.key === row.id);
  assert.equal(next.metadata.reconductedBusiness.participationEvaluation,true);
  const read2026 = await fixture.service.listProgramme(2026);
  assert.ok(read2026.canonicalProgramme.rows.every(item => item.participationEvaluation === true));
});

test('les futurs programmes heritent du defaut du type, avec priorite aux decisions individuelles et exception 2027',async()=>{
  const fixture = createFixture(null);
  const definition = {id:'moa-type',version_id:'moa-type-version',source:'DEFINITION',title:'Séance MOA type',domain:'FOCA',
    status:'ACTIF',mode_organisation:'SIMPLE',session_count:1,selected:true,
    metadata:{participationEvaluationDefault:false,programmeRequirement:{required:true,justification:'Recette du défaut de type',cibleCodes:[]}}};
  const originalQuery = fixture.database.query;
  fixture.database.query = async(sql,params) => sql.includes("'DEFINITION' as source") && sql.includes('from scope_event_definitions')
    ? {rows:[definition]} : originalQuery(sql,params);
  await fixture.service.generateProgramme(2028);
  const generated = fixture.preparations.find(row => row.programme_id === 'local-qv-2028' && row.source_type === 'DEFINITION');
  assert.ok(generated);
  assert.equal(generated.metadata.participationEvaluation,false);
  assert.equal((await fixture.service.listProgramme(2028)).activities.find(row => row.sourceRef === definition.version_id).participationEvaluation,false);
  generated.metadata.planningFields = {participationEvaluation:true};
  assert.equal((await fixture.service.listProgramme(2028)).activities.find(row => row.sourceRef === definition.version_id).participationEvaluation,true);
  generated.metadata.planningFields.participationEvaluation = false;
  definition.metadata.participationEvaluationDefault = true;
  assert.equal((await fixture.service.listProgramme(2028)).activities.find(row => row.sourceRef === definition.version_id).participationEvaluation,false);
  delete generated.metadata.planningFields;
  delete generated.metadata.participationEvaluation;
  definition.metadata.participationEvaluationDefault = false;
  assert.equal((await fixture.service.listProgramme(2028)).activities.find(row => row.sourceRef === definition.version_id).participationEvaluation,false);
  generated.metadata.lineage = {key:definition.version_id};
  generated.metadata.reconductedBusiness = {activityLabel:definition.title,domain:'FOCA',publicCodes:[],themes:[]};
  const prepared = await fixture.service.updateProgrammePreparation(generated.source_ref,{year:2028,saveAction:'SAVE',
    date:'2028-06-15',startTime:'10:00',endTime:'11:00',oiCodes:[],publicCodes:[]});
  assert.equal(getRow(prepared.quoVadis,generated.source_ref).participationEvaluation,false);
  assert.equal(generated.metadata.planningFields.participationEvaluation,false);
  await fixture.service.generateProgramme(2027);
  const in2027 = fixture.preparations.find(row => row.programme_id === 'local-qv-2027' && row.source_type === 'DEFINITION');
  assert.equal(in2027.metadata.participationEvaluation,true);
});

test('la migration inclusive utilise les anciens codes et devient idempotente',async()=>{
  const queries = [];
  let migrated = false;
  const client = {async query(sql,params){
    queries.push({sql,params});
    if(sql.includes('select 1 from monitoring_f7_schema_migrations')) return {rows:migrated ? [{exists:1}] : []};
    if(sql.includes('insert into monitoring_f7_schema_migrations')) migrated = true;
    return {rows:[]};
  }};
  const migrate = responsibleMigration({transaction:work => work(client)});
  await migrate();
  const inserts = queries.filter(({sql}) => sql.includes('insert into scope_responsable_fonctions'));
  assert.deepEqual(inserts.map(({params}) => params.slice(0,2)),[
    ['Présidente CI','PrésidentE CI'],['Présidente Codir','PrésidentE Codir']]);
  const writes = queries.filter(({sql}) => /insert|update/.test(sql)).length;
  await migrate();
  assert.equal(queries.filter(({sql}) => /insert|update/.test(sql)).length,writes);
});
