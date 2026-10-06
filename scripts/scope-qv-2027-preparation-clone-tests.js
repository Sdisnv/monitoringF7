'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createFixture } = require('./scope-qv-local-fixture');
const { preparationPayload, stableId } = require('./scope-qv-2027-preparation-clone');
const { buildCurrentCandidateDataset, preserveUnspecifiedPublicationFields,
  voluntaryTransversalWithoutOi } = require('./lib/scope-c22-canonical-dataset');
const { canonicalPublicationKey, readiness } = require('../netlify/lib/_scope-qv-publication-plan');
const publicLogic = require('../assets/js/scope-ui-logic');

test('preparation keeps canonical status and only links a room at its proven site', () => {
  const row = { id:'QV27-ONE',activityLabel:'Instruction',status:'A_POSITIONNER',domain:'F5/6',
    persistenceDomain:'INSTITUTIONNEL',publics:['N01a'],statCom:'070F1',
    startsAt:'2027-03-01T19:00',endsAt:'2027-03-01T21:00',location:'Caserne C1',room:'R-G1-VULCAIN',
    business:{ lieuId:'lieu-c1' } };
  const rooms = new Map([['G1-VULCAIN',{ salle_id:'room-g1',lieu_id:'lieu-g1',libelle:'Vulcain' }]]);
  const result = preparationPayload(row,new Set(['lieu-c1','lieu-g1']),rooms,new Set(['070F1']));
  assert.equal(result.status,'A_PLANIFIER');
  assert.equal(result.metadata.canonicalStatus,'A_POSITIONNER');
  assert.equal(result.metadata.canonicalRow.domain,'F5/6');
  assert.equal(result.startsAt,null);
  assert.equal(result.salleId,null);
  assert.equal(result.lieuId,'lieu-c1');
  assert.equal(result.metadata.humanDecision,false);
  assert.equal(result.id,stableId(row.id));
  assert.equal(result.id,preparationPayload(row,new Set(['lieu-c1','lieu-g1']),rooms,new Set(['070F1'])).id);
});

test('automatic preparation is visible without overriding status, including late CTA row', async () => {
  const fixture = createFixture(null);
  const before = await fixture.service.listProgramme(2027);
  const nonValidated = before.canonicalProgramme.rows.find((row) => !row.external && row.status === 'A_POSITIONNER');
  assert.ok(nonValidated);
  fixture.preparations.push({ obligation_id:'auto-one',programme_id:'local-qv-2027',source_type:'MANUAL',
    source_ref:nonValidated.id,title:nonValidated.label,statut:'PLANIFIE',metadata:{source:'QV_PROGRAMME_PREPARATION',
      automatedSnapshot:true,humanDecision:false,canonicalStatus:nonValidated.status} });
  fixture.preparations.push({ obligation_id:'auto-holiday',programme_id:'local-qv-2027',source_type:'MANUAL',
    source_ref:'CTA-PERM-FERIE-2027-05-06',title:'Permanence',statut:'A_PLANIFIER',
    metadata:{source:'QV_PROGRAMME_PREPARATION',automatedSnapshot:true,humanDecision:false,canonicalStatus:'CALCULE'} });
  const after = await fixture.service.listProgramme(2027);
  const actual = after.canonicalProgramme.rows.find((row) => row.id === nonValidated.id);
  const holiday = after.canonicalProgramme.rows.find((row) => row.id === 'CTA-PERM-FERIE-2027-05-06');
  assert.equal(actual.status,nonValidated.status);
  assert.equal(actual.preparation.id,'auto-one');
  assert.equal(holiday.status,'CALCULE');
  assert.equal(holiday.preparation.id,'auto-holiday');
});

test('human decision overrides an earlier automatic snapshot', async () => {
  const fixture = createFixture(null);
  const before = await fixture.service.listProgramme(2027);
  const source = before.canonicalProgramme.rows.find((row) => !row.external && row.status === 'A_POSITIONNER');
  fixture.preparations.push({ obligation_id:'human-one',programme_id:'local-qv-2027',source_type:'MANUAL',
    source_ref:source.id,title:source.label,statut:'PLANIFIE',metadata:{source:'QV_PROGRAMME_PREPARATION',
      automatedSnapshot:true,humanDecision:true,planningFields:{date:'2027-11-10',startTime:'19:00',endTime:'21:00'}} });
  const after = await fixture.service.listProgramme(2027);
  const actual = after.canonicalProgramme.rows.find((row) => row.id === source.id);
  assert.equal(actual.status,'PLANIFIE');
  assert.equal(actual.startsAt,'2027-11-10T19:00:00');
  assert.equal(actual.preparation.id,'human-one');
});

test('CTA reconciliation preserves published site assignment and non-provided fields', () => {
  const item = {caseId:'CTA-ONE',year:2027,status:'VALIDATED',source:{definitionId:'CTA-PERMANENCE',
    occurrenceId:'CTA-ONE:O1',sessionId:'CTA-ONE:S1',publicationUnitId:'CTA-ONE'},
    label:'Permanence',eventLabel:'Permanence',eventType:null,priority:0,fixedDate:false,
    businessException:null,roles:[],resources:[],session:{count:1,label:'Aucune session distincte'},
    classification:{primaryDomain:'DPS',domainCodes:['DPS'],targetCodes:['DPS-G1','DPS-B1'],
      oiCodes:['G1','B1'],publicCodes:[],locationCode:null,responsibleId:'Chef site'} };
  const desired = {activity:{label:'Permanence CTA G1'},session:{label:null},event:{label:'Permanence CTA G1',
    eventType:'Ponctuel',priority:100,fixedDate:true,businessException:'SERVICE_CONTINUITY',
    locationCode:'L-G1',responsibleId:'À affecter'},relations:{targetCodes:['DPS-G1'],oiCodes:['G1'],
    publicCodes:[],roleCodes:[],resourceCodes:[]}};
  const snapshot = [{publicationKey:canonicalPublicationKey(item),desired}];
  const [actual] = preserveUnspecifiedPublicationFields([item],snapshot);
  assert.equal(actual.label,'Permanence CTA G1');
  assert.equal(actual.eventType,'Ponctuel');
  assert.equal(actual.priority,100);
  assert.equal(actual.fixedDate,true);
  assert.equal(actual.classification.locationCode,'L-G1');
  assert.deepEqual(actual.classification.oiCodes,['G1']);
  assert.deepEqual(item.classification.oiCodes,['G1','B1']);
});

test('reconciliation retains prior defaults but permits explicit public addition', () => {
  const item = {caseId:'COURSE-ONE',year:2027,status:'VALIDATED',source:{definitionId:'COURSE',
    occurrenceId:'COURSE:O1',sessionId:'COURSE:S1',publicationUnitId:'COURSE-ONE'},
    label:'Cours',eventType:null,priority:0,fixedDate:false,roles:[],resources:[],
    session:{count:1,label:'Aucune session distincte'},classification:{primaryDomain:'AUTO',
      domainCodes:['AUTO'],targetCodes:[],oiCodes:[],publicCodes:['AUTO:1'],locationCode:null} };
  const snapshot = [{publicationKey:canonicalPublicationKey(item),desired:{session:{label:null},
    event:{eventType:'Ponctuel',priority:70,fixedDate:false,locationCode:'L-G1'},
    relations:{publicCodes:[],roleCodes:[],resourceCodes:[]}}}];
  const [actual] = preserveUnspecifiedPublicationFields([item],snapshot);
  assert.equal(actual.eventType,'Ponctuel');
  assert.equal(actual.priority,70);
  assert.equal(actual.classification.locationCode,'L-G1');
  assert.deepEqual(actual.classification.publicCodes,['AUTO:1']);
});

test('eight explicit transversal courses need no OI and G1 location does not become an OI', async () => {
  const dataset = await buildCurrentCandidateDataset();
  const ids = ['qv-source-877','qv-source-890','qv-source-895','qv-source-896',
    'qv-source-899','qv-source-902','qv-source-905','qv-source-919'];
  for(const id of ids){
    const source = dataset.candidateRows.find((row) => row.id === id);
    const item = dataset.programme.find((row) => row.caseId === id);
    assert.equal(voluntaryTransversalWithoutOi(source),true,id);
    assert.equal(item.referencesValidated,true,id);
    assert.deepEqual(item.classification.oiCodes,[],id);
    assert.equal(item.classification.locationCode,'L-G1',id);
    assert.ok(item.classification.publicCodes.length,id);
  }
});

test('an explicit OI remains subject to referential validation', () => {
  const source = { family:'Formation',publics:['AUTO:1'],ois:['G1'],oiSelections:['DPS:G1'],
    business:{missing:['OI à qualifier']} };
  assert.equal(voluntaryTransversalWithoutOi(source),false);
  const item = {year:2027,status:'VALIDATED',referencesValidated:true,
    source:{definitionId:'EXPLICIT',occurrenceId:'O1',sessionId:'S1',publicationUnitId:'P1'},
    schedule:{startsAt:'2027-05-01T19:00',endsAt:'2027-05-01T20:00'},
    classification:{primaryDomain:'DPS',domainCodes:['DPS'],targetCodes:['DPS-G1'],
      publicCodes:['AUTO:1'],oiCodes:['UNKNOWN'],locationCode:'L-G1'},business:{}};
  const result = readiness(item,{domains:['DPS'],targets:['DPS-G1'],publics:['AUTO:1'],
    ois:['G1'],locations:['L-G1'],rooms:[],statComCodes:[]});
  assert.equal(result.reason,'UNKNOWN_REFERENCES:ois:UNKNOWN');
});

test('technical public codes retain the existing business labels', () => {
  assert.equal(publicLogic.qvFormatPublicLabels(['AUTO:1','AUTO:5']),'cond PL, Machiniste EA');
  assert.equal(publicLogic.qvFormatPublicLabels(['AUTO:3']),'cond VL');
  assert.equal(publicLogic.qvFormatPublicLabels(['PR:2']),'PAPR');
  assert.equal(publicLogic.qvFormatPublicLabels(['FOBA:1','FOBA:2','FOBA:3']),'FOBA 1, FOBA 2, FOBA 3');
});
