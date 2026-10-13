'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const logic=require('../assets/js/scope-ui-logic');
const code=require('../netlify/lib/_scope-event-code');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const consolidation=require('../netlify/lib/_scope-quo-vadis-consolidation');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {createFixture}=require('./scope-qv-local-fixture');
test('recurrent SDIS defaults and explicit decisions stay independent',()=>{
  const defaults=logic.qvProgrammeParameters({label:'Exercice PR',statCom:'011PR'});
  assert.deepEqual(defaults,{activityNature:'SDIS_RECURRENT',externalActivity:false,annualRecurrence:true,
    participationEvaluation:true,sold:true,ecawinExport:true});
  assert.equal(logic.qvProgrammeParameters({sold:true,ecawinExport:false}).sold,true);
  assert.equal(logic.qvProgrammeParameters({sold:true,ecawinExport:false}).ecawinExport,false);
});
test('extraordinary CRIMSON stays in 2027 and is not an annual recurrence',()=>{
  const params=logic.qvProgrammeParameters({label:'Formation CRIMSON opérateurs et chefs VPC',statCom:'0180F7'});
  assert.equal(params.activityNature,'SDIS_EXTRAORDINARY');assert.equal(params.annualRecurrence,false);assert.equal(params.ecawinExport,false);
  const reference={annee:2027,title:'Formation CRIMSON opérateurs et chefs VPC',metadata:{lineage:{key:'CRIMSON'},
    planningFields:{...params,statCom:'0180F7'},businessValidation:{validatedAt:'2026-10-13T10:00:00Z'}}};
  assert.deepEqual(consolidation.latestValidatedReferences([reference],2028),[]);
});
test('external occupation is neither payroll, evaluation, export nor recurrence',()=>{
  const params=logic.qvProgrammeParameters({externalActivity:true,label:'Formation CFF'});
  for(const key of ['sold','participationEvaluation','ecawinExport','annualRecurrence']) assert.equal(params[key],false);
});
test('HSC is not Stat.Com; legacy display aliases do not modify stored codes',async()=>{
  const original='SCOPE-000150';assert.equal(logic.qvInternalEventCodeDisplay(original),'HSC.150');assert.equal(original,'SCOPE-000150');
  assert.equal(code.parseEventCode('HSC.001'),null);assert.equal(logic.qvInternalEventCodeDisplay('HSC.002'),'HSC.002');
  assert.equal(await code.allocateInternalEventCode(async()=>({rows:[{number:'151'}]})),'HSC.151');
  await assert.rejects(code.allocateInternalEventCode(async()=>({rows:[{number:'1000'}]})),/HSC_SEQUENCE_EXHAUSTED/);
});
test('room and whole-building reservations use the existing compatibility engine',()=>{
  const make=(id,roomId)=>({id,label:id,external:false,externalActivity:id==='CFF',startsAt:'2027-06-18T18:00',endsAt:'2027-06-18T21:00',
    lieuId:'building',salleTheorieId:roomId});
  assert.equal(revisions.reservationConflicts([make('CFF','room1'),make('SDIS','room1')]).length,1);
  assert.equal(revisions.reservationConflicts([make('CFF','room1'),make('SDIS','room2')]).length,0);
  assert.equal(revisions.reservationConflicts([make('CFF',null),make('SDIS','room2')]).length,1);
  assert.equal(revisions.reservationConflicts([make('CFF','room1'),{...make('SDIS','room1'),startsAt:'2027-06-18T21:00',endsAt:'2027-06-18T22:00'}]).length,0);
});
test('visual responsible groups do not change domain identifiers',()=>{
  const ref={code:'C op',domain:'F3'},before=structuredClone(ref);
  assert.equal(logic.qvResponsableVisualGroup(ref),'F2/3');assert.deepEqual(ref,before);
  for(const [from,to] of [['C audiovisuel','Chef audiovisuel'],['C for','Chef formation'],['C sct','Chef section'],['C site','Chef site'],['Chef OP','Chef opérationnel'],['C FOSPEC','Chef FOSPEC']])
    assert.equal(logic.qvResponsableCanonique(from),to);
});
test('revisions distinguish editorial, planning and independent parameter changes',()=>{
  const before={themes:['A'],sold:true,ecawinExport:false,annualRecurrence:true};
  assert.equal(revisions.revisionChanges(before,before).changedFields.length,0);
  assert.equal(revisions.revisionChanges(before,{...before,themes:['B']}).kind,'MINOR');
  assert.equal(revisions.revisionChanges(before,{...before,annualRecurrence:false}).kind,'MAJOR');
});
test('programme fiche has compact parameters, one visible PR trainer and no permanent motif',async()=>{
  const qv=await createFixture(null).service.listProgramme(2027);
  const row=qv.canonicalProgramme.rows.find(row=>row.id==='qv-source-899');row.publics=['PR:FORMATEURS','PR:FORMATEUR-PR'];
  const {hooks,context}=createCatalogUiHarness();hooks.state.quoVadis=qv;hooks.state.quoVadisReady=true;
  context.location.hash='#/quo-vadis/programme/qv-source-899';
  const html=hooks.renderQuoVadisProgrammeFicheHtml(qv,'qv-source-899');
  assert.ok(html.includes('qv-programme-parameters'));assert.ok(html.includes('id="qv-programme-history"'));
  assert.ok(!html.includes('qv-programme-revision-motif'));assert.equal((html.match(/<span>Formateur PR<\/span>/g) || []).length,1);
  assert.ok(html.includes('data-preserved-codes="[&quot;PR:FORMATEURS&quot;,&quot;PR:FORMATEUR-PR&quot;]"'));
  assert.ok(html.includes('EXERCI Exercices SDIS'));
});
