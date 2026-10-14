'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const cycles=require('../netlify/lib/_scope-programme-cycle');
const logic=require('../assets/js/scope-ui-logic');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const cycle=cycles.resolveProgrammeCycle(2027,{},[
  {closesCycleYear:2026,actualDate:'2027-02-23'},{closesCycleYear:2027,actualDate:'2028-02-10',provisional:true}]);
test('civil Programme dates and business cycle boundaries remain distinct',()=>{
  assert.equal(cycle.startDate,'2027-02-24');assert.equal(cycle.provisional,true);
  assert.deepEqual(cycles.programmeDateAdmission(cycle,'2027-01-01'),{allowed:true,classification:'PREVIOUS_CYCLE',businessCycleYear:2026});
  assert.equal(cycles.programmeDateAdmission(cycle,'2028-01-01').businessCycleYear,2027);
  assert.equal(cycles.programmeDateAdmission(cycle,'2028-02-11').allowed,false);
});
test('external occupations only follow the selected civil year',()=>{
  for(const date of ['2027-01-01','2027-02-26','2027-12-31']) {
    const result=cycles.programmeDateAdmission(cycle,date,{externalActivity:true});
    assert.equal(result.allowed,true);assert.equal(result.businessCycleYear,null);
  }
  assert.equal(cycles.programmeDateAdmission(cycle,'2028-01-01',{externalActivity:true}).allowed,false);
  const flags=logic.qvProgrammeParameters({activityNature:'EXTERNAL_OCCUPATION',annualRecurrence:true,participationEvaluation:true,sold:true,ecawinExport:true});
  for(const key of ['annualRecurrence','participationEvaluation','sold','ecawinExport']) assert.equal(flags[key],false);
});
test('PAPR preparatory exception and provisional report remain intact',()=>{
  const result=cycles.programmeDateAdmission(cycle,'2027-02-02',{preparatoryCycle:{year:2027,cursusCode:'PAPR',module:1,rule:'QV-PAPR-004'}});
  assert.equal(result.classification,'PREPARATORY_CURSUS');assert.equal(result.businessCycleYear,2027);
  assert.equal(cycle.approvalRequired,'CODIR');assert.equal(cycle.statisticsBasis,'CIVIL_EVENT_DATE');
});
test('operational public choices reuse the four existing CI reference codes',()=>{
  const group=logic.qvProgrammePublicCatalogue().find(row=>row.group==='Opérationnel');
  assert.deepEqual(group.items.map(row=>row[1]).sort(),['OSR','CI DPS','Candidat CI DPS','CI DAP','Candidat CI DAP'].sort());
  for(const code of ['ENC:CI-DPS','ENC:CAND-CI-DPS','ENC:CI-DAP','ENC:CAND-CI-DAP']) assert.equal(logic.qvProgrammePublicCatalogue().flatMap(row=>row.items).filter(row=>row[0]===code).length,1);
  assert.equal(logic.qvProgrammePublicLabel('ENC:OSR'),'OSR');
});
test('history shows business fields directly and never fabricates missing historical values',()=>{
  const {hooks}=createCatalogUiHarness();
  const html=hooks.renderQuoVadisHistoryHtml([{journal_id:'existing-transaction',at:'2026-10-13T12:00:00Z',authorLabel:'Auteur autorisé',
    action:'MODIFIER_OCCURRENCE',avant:{fields:{date:'2027-05-13'}},apres:{fields:{date:'2027-05-20',statCom:'0130F7'}},commentaire:'Motif de recette'}],{});
  assert.equal((html.match(/data-qv-transaction=/g) || []).length,2);assert.match(html,/Modification/);
  assert.doesNotMatch(html,/<details/);assert.match(html,/Non enregistré/);assert.match(html,/Auteur autorisé/);assert.doesNotMatch(html,/MODIFIER OCCURRENCE/);
});
test('author names only use the authorized directory path',async()=>{
  let calls=0;const query=async()=>({rows:++calls===1?[{auteur_id:'7647'}]:[{nip:'7647',nom:'Auteur',prenom:'Référencé'}]});
  const allowed=await revisions.history(query,2027,'existing-item',{personnelRead:true});assert.equal(allowed[0].authorLabel,'Référencé Auteur');
  calls=0;const limited=await revisions.history(query,2027,'existing-item',{personnelRead:false});
  assert.equal(calls,1);assert.equal(limited[0].authorLabel,undefined);
});
test('DPS day controls show the rule and no invented reason for an unplanned item',()=>{
  const {hooks}=createCatalogUiHarness();const row={id:'existing-item',label:'Formation groupée 1.2',domain:'DPS',
    startsAt:'2027-05-21T18:30',endsAt:'2027-05-21T22:00',status:'A_POSITIONNER',ois:['G1','C1','B1','B2'],statCom:'0120F7',
    planningDayControl:{date:'2027-05-21',dayClass:'INTERDIT',reasons:['Vendredi: Interdit.'],ruleCode:'PLANIF-DPS',derogationAllowed:true}};
  const data={programme:{annee:2027},canonicalProgramme:{rows:[row]},rules:[]};
  const html=hooks.renderQuoVadisProgrammeFicheHtml(data,row.id);assert.doesNotMatch(html,/PLANIF-DPS/);assert.match(html,/Vendredi: Interdit/);assert.match(html,/dérogation motivée/);
  const clean=hooks.renderQuoVadisProgrammeFicheHtml({...data,canonicalProgramme:{rows:[{...row,planningDayControl:null}]}},row.id);
  assert.doesNotMatch(clean,/class="qv-programme-controls"/);
});
