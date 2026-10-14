'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const coverage=require('../netlify/lib/_scope-quo-vadis-coverage');
const logic=require('../assets/js/scope-ui-logic');
const Module=require('node:module'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const html=entry=>createCatalogUiHarness().hooks.renderQuoVadisHistoryHtml([{
  journal_id:'record',at:'2026-10-14T08:00:00Z',authorLabel:'Auteur autorisé',...entry}],{});
const count=text=>(text.match(/data-qv-transaction=/g)||[]).length;
test('manual creation has one readable seven-column row',()=>{
  const text=html({action:'CREER_OCCURRENCE',avant:null,apres:{fields:{date:'2027-02-26',oiCodes:[]},transaction:{manualCreation:true}}});
  assert.equal(count(text),1);assert.match(text,/Création manuelle de l’événement/);
  assert.equal((text.match(/<th>/g)||[]).length,7);assert.doesNotMatch(text,/<details|<summary/);
});
for(const n of [1,2]) test(`one row for each of ${n} modified business fields`,()=>{
  const text=html({action:'MODIFIER_OCCURRENCE',avant:{fields:{date:'2027-05-13',startTime:'18:30'}},
    apres:{fields:{date:'2027-05-20',startTime:n===2?'19:00':'18:30'}}});assert.equal(count(text),n);
});
for(const validated of [true,false]) test(`validation transition ${validated} has one decision and retains reason`,()=>{
  const text=html({action:validated?'VALIDER_OCCURRENCE':'RETIRER_VALIDATION',commentaire:'Motif obligatoire',
    avant:{fields:{date:'2027-06-02'},validation:validated?null:{}},apres:{fields:{date:'2027-06-02'},validation:validated?{}:null}});
  assert.equal(count(text),1);assert.match(text,/Motif obligatoire/);assert.match(text,validated?/Validation/:/Retrait de validation/);
});
test('automatic persisted correction is not attributed to the human author',()=>{
  const text=html({action:'MODIFIER_OCCURRENCE',avant:{fields:{statCom:'0162F7'}},apres:{fields:{statCom:'0120F7'},
    automaticChanges:{statCom:{before:'0162F7',after:'0120F7'}}}});
  assert.equal(count(text),1);assert.match(text,/Correction automatique/);assert.match(text,/SCOPE — automatique/);assert.doesNotMatch(text,/Auteur autorisé/);
});
test('OI reordering and technical fields do not become business changes',()=>{
  const text=html({action:'MODIFIER_OCCURRENCE',avant:{fields:{oiCodes:['DPS:G1','DPS:B1'],updatedAt:'a',version:1}},
    apres:{fields:{oiCodes:['DPS:B1','DPS:G1'],updatedAt:'b',version:2}}});
  assert.doesNotMatch(text,/<td>OI<\/td>|updatedAt|version/);
});
test('legacy missing before values are not reconstructed',()=>{
  const text=html({action:'MODIFIER',avant:null,apres:{fields:{date:'2027-05-20'}}});assert.match(text,/Non enregistré/);
});
const row=(id,room,extra={})=>({id,label:id,externalActivity:id==='a',startsAt:'2027-02-26T08:00',endsAt:'2027-02-26T17:00',lieuId:'G1',salleTheorieId:room,...extra});
test('same room overlaps while different rooms are independent',()=>{
  assert.equal(coverage.reservationConflicts([row('a','OXY'),row('b','OXY')]).length,1);
  assert.equal(coverage.reservationConflicts([row('a','OXY'),row('b','AUTRE')]).length,0);
});
test('a location without a room is not an exclusive booking',()=>{
  assert.equal(coverage.reservationConflicts([row('CFF',null,{externalActivity:true}),row('Codir','OXY')]).length,0);
});
test('explicit site exclusivity and explicit shared resources remain blocking',()=>{
  assert.equal(coverage.reservationConflicts([row('a',null,{exclusiveLocation:true}),row('b','OXY')]).length,1);
  assert.equal(coverage.reservationConflicts([row('a',null,{resourceCodes:['EMPLACEMENT:1']}),row('b',null,{resourceCodes:['EMPLACEMENT:1']})]).length,1);
});
test('partial overlap, adjacent slots and modification use the actual booking',()=>{
  const a=row('a','OXY'),b=row('b','OXY',{startsAt:'2027-02-26T16:30',endsAt:'2027-02-26T18:00'});
  assert.equal(coverage.reservationConflicts([a,b]).length,1);
  assert.equal(coverage.reservationConflicts([a,{...b,startsAt:'2027-02-26T17:00'}]).length,0);
  assert.equal(coverage.reservationConflicts([a,{...b,salleTheorieId:'AUTRE'}]).length,0);
});
const osr={definitionId:'QV26-MISE-A-NIVEAU-ANNUELLE-OSR-9977BB10',statCom:'0171F7',domain:'DPS',
  publics:['ENC:CI-DPS','ENC:OSR'],startsAt:'2027-10-08T08:00',endsAt:'2027-10-08T16:00'};
const rules={rules:[{code:'PLANIF-DPS',domain:'DPS',dayPolicy:{FRIDAY:'INTERDIT'},derogationAllowed:true}],calendarDays:[]};
test('confirmed OSR type can use daytime Fridays without opening other DPS Fridays',()=>{
  assert.equal(coverage.programmeDayControl(osr,rules),null);
  assert.equal(coverage.programmeDayControl({...osr,definitionId:'OTHER'},rules).dayClass,'INTERDIT');
  assert.equal(coverage.programmeDayControl({...osr,publics:['ENC:OSR','GEN:SAPEUR-DPS']},rules).dayClass,'INTERDIT');
});
test('OSR exception never removes holidays or school vacations',()=>{
  for(const type of ['FERIE','VACANCES_SCOLAIRES','NEUTRALISATION_INTERNE']) assert.equal(coverage.programmeDayControl(osr,
    {...rules,calendarDays:[{jour:'2027-10-08',typeJour:type,libelle:'Contrainte confirmée',metadata:{dateFin:'2027-10-08'}}]}).dayClass,'INTERDIT');
});
test('52 weeks retains weekday and controls the resulting forbidden date',()=>{
  const date=logic.qvShiftHistoricalDate('2026-05-22');assert.equal(date,'2027-05-21');
  assert.equal(coverage.programmeDayControl({domain:'DPS',startsAt:date+'T18:30'},rules).dayClass,'INTERDIT');
  assert.equal(coverage.programmeDayControl({domain:'DPS',startsAt:date+'T18:30',businessValidation:{}},rules),null);
});
test('sharing coverage preserves the main historical motor and all non-OSR day policies',()=>{
  const file=path.resolve(__dirname,'../netlify/lib/_scope-quo-vadis-coverage.js'),entry=new Module(file,module);
  entry.filename=file;entry.paths=Module._nodeModulePaths(path.dirname(file));
  entry._compile(execFileSync('git',['show','160eb54:netlify/lib/_scope-quo-vadis-coverage.js'],{encoding:'utf8'}),file);
  const previous=entry.exports,history=require('../netlify/lib/data/scope-qv-history-2026.json').rows;
  assert.deepEqual(coverage.interpretHistoricalProgramme(history,2027),previous.interpretHistoricalProgramme(history,2027));
  for(const domain of ['DPS','DAP','JSP','PR','AUTO','FOBA','FOCA','FOSPEC'])
    assert.deepEqual(coverage.dayPolicyForActivity(domain,{},{}),previous.dayPolicyForActivity(domain,{},{}));
});
test('operational public order and FOBA identities remain exact',()=>{
  assert.deepEqual(logic.qvProgrammePublicCatalogue().find(group=>group.group==='Opérationnel').items.map(item=>item[1]),
    ['OSR','CI DPS','Candidat CI DPS','CI DAP','Candidat CI DAP']);
  for(const code of ['FOBA:1','FOBA:2','FOBA:3']) assert.equal(logic.qvProgrammePublicLabel(code),code.replace(':',' '));
});
test('user alerts hide internal rule IDs and display proposal dates in French format',()=>{
  const row={id:'DAP',domain:'DAP',label:'Formation groupée',dapGroupedProposal:{proposedDate:'2027-05-13',sourceDate:'2026-05-14'},
    planningDayControl:{date:'2027-05-21',ruleCode:'PLANIF-DPS',dayClass:'INTERDIT',reasons:['Vendredi : interdit.'],derogationAllowed:true}};
  const text=createCatalogUiHarness().hooks.renderQuoVadisProgrammeFicheHtml({programme:{annee:2027},canonicalProgramme:{rows:[row]}},row.id);
  assert.match(text,/13.05.2027/);assert.doesNotMatch(text,/PLANIF-DPS|QV-NATURE-001/);
});
