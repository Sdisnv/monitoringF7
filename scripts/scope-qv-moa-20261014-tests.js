'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const coverage=require('../assets/js/scope-qv-coverage');
const logic=require('../assets/js/scope-ui-logic');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const slot=(id,start,end,extra={})=>({id,label:id,startsAt:`2027-02-16T${start}`,endsAt:`2027-02-16T${end}`,
  salleTheorieId:'EM',lieuId:'G1',status:'PLANIFIE',...extra});
for(const [start,end,kind] of [['18:00','21:00','OVERLAP'],['17:00','18:15','OVERLAP'],['20:00','21:00','TURNAROUND'],['20:15','21:00','TURNAROUND']])
  test(`same room ${start}-${end} conflicts in both directions`,()=>{
    const a=slot('a','18:00','20:00'),b=slot('b',start,end);
    for(const rows of [[a,b],[b,a]]) assert.equal(coverage.reservationConflicts(rows)[0].causes[0].kind,kind);
  });
test('exact 30 minute gap is allowed without rewriting slots',()=>{
  const rows=[slot('a','18:00','20:00'),slot('b','20:30','21:00')],before=JSON.stringify(rows);
  assert.equal(coverage.reservationConflicts(rows).length,0);assert.equal(JSON.stringify(rows),before);
});
for(const extra of [{status:'ANNULE'},{salleTheorieId:null},{salleTheorieId:null,business:{salleTheorieId:'EM'}},{salleTheorieId:'OXY'}])
  test(`no invented room booking ${JSON.stringify(extra)}`,()=>assert.equal(coverage.reservationConflicts([
    slot('a','18:00','20:00'),slot('b','18:30','21:00',extra)]).length,0));
test('other cycle is checked, same publication owner is not duplicated',()=>{
  const a=slot('a','18:00','20:00',{sourceYear:2026,reservationOwner:'EVENT:one'}),
    b=slot('b','18:30','21:00',{sourceYear:2027,reservationOwner:'EVENT:two'});
  assert.equal(coverage.reservationConflicts([a,b]).length,1);
  assert.equal(coverage.reservationConflicts([a,{...b,reservationOwner:a.reservationOwner}]).length,0);
});
test('EM priority has a demonstrated common function, not an invented individual assignment',()=>{
  const em=slot('em','18:00','21:00',{definitionId:'QV26-SEANCE-EM-ED042EBD',publics:['ECH:IV']}),
    jsp=slot('jsp','18:30','20:30',{definitionId:'QV26-SEANCE-DIRECTION-JSP-32B2ACA4'});
  const conflict=coverage.personnelConflicts([jsp,em])[0];assert.equal(conflict.priorityId,'em');
  assert.equal(conflict.repositionId,'jsp');assert.deepEqual(conflict.sharedFunctions,['CMDT:C-FOR']);assert.equal(conflict.automaticMove,false);
  assert.equal(coverage.personnelConflicts([em,{...jsp,definitionId:'unrelated'}]).length,0);
});
for(const [codes,expected] of [[['I','II'],'Échelon I et II'],[['I','II','III'],'Échelon I à III'],
  [['II','III'],'Échelon II et III'],[['II','III','IV'],'Échelon II à IV'],[['IV'],'Échelon IV']])
  test(expected,()=>assert.equal(logic.qvFormatPublicLabels(codes.map(value=>`ECH:${value}`)),expected));
test('public display preserves internal codes, OSR priority, FOBA and free labels',()=>{
  const codes=['FOBA:1','ENC:CI-DPS','ENC:OSR','FOBA:2','FOBA:3'],before=JSON.stringify(codes);
  assert.equal(logic.qvFormatPublicLabels(codes,['A ; B']),'OSR, FOBA 1, CI DPS, FOBA 2, FOBA 3, A, B');
  assert.equal(JSON.stringify(codes),before);
});
test('qualified organisational families are independent of functional domain',()=>{
  assert.deepEqual(logic.qvProgrammeOrganisationalFamilies(['DAP:Y1','JSP:G1']),['DAP','JSP']);
  assert.equal(logic.qvProgrammeFamily({domain:'F1',family:'DAP'}),'DAP');
  assert.equal(logic.qvProgrammeFilterFamily({domain:'F7',family:'JSP'}),'JSP');
  assert.deepEqual(logic.qvProgrammeOrganisationalFamilies(['G1','SDIS']),[]);
});
test('legacy partial cancellation is one genuine action; source audit is immutable',()=>{
  const entry={journal_id:'cancel',at:'2026-10-14T08:00:00Z',action:'ANNULER_OCCURRENCE',commentaire:'Motif MOA',
    avant:{fields:{date:'2027-08-25',locationLabel:'Local Y1',themes:['Planification A+1']},statut:'PLANIFIE'},
    apres:{statut:'ANNULE',lifecycleDecision:{action:'CANCEL_YEAR'}}},before=JSON.stringify(entry);
  const html=createCatalogUiHarness().hooks.renderQuoVadisHistoryHtml([entry],{});
  assert.equal((html.match(/data-qv-transaction=/g)||[]).length,1);assert.match(html,/Motif MOA|reconduction conservée/);
  assert.doesNotMatch(html,/Non enregistré|<td>Date<\/td>|<td>Lieu<\/td>|<td>Thème<\/td>/);
  assert.equal(JSON.stringify(entry),before);
});
for(const ambiguous of [false,true]) test(`legacy operational room text is ${ambiguous?'not inferred when ambiguous':'matched to its existing reference'}`,async()=>{
  const qv={programme:{annee:2027},canonicalProgramme:{rows:[]},lieux:[],sallesTheorie:[
    {salleId:'existing-em',libelle:'État-major',code:'EM',lieuId:'G1'},
    ...(ambiguous?[{salleId:'other-em',libelle:'État-major',code:'EM2',lieuId:'C1'}]:[])]};
  let calls=0;
  const query=async()=>({rows:calls++===0?[{evenement_id:'existing-event',date:'2027-02-16',start_time:'18:00',end_time:'21:00',
    libelle:'Activité opérationnelle existante',salle:'éTAT-MAJOR',statut:'PLANIFIE',resource_codes:[]}]:[]});
  const bookings=await require('../netlify/lib/_scope-qv-programme-revisions').reservations(query,qv);
  assert.equal(bookings.length,ambiguous?0:1);
  if(!ambiguous) assert.equal(bookings[0].salleTheorieId,'existing-em');assert.equal(calls,2);
});
