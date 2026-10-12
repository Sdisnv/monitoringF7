'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const papr=require('../netlify/lib/_scope-qv-papr-rules');
const logic=require('../assets/js/scope-ui-logic');
const history=require('../netlify/lib/data/scope-qv-history-2026.json').rows;
const source=require('../netlify/lib/data/scope-qv-programme-2027.json');
const moa=require('../netlify/lib/_scope-qv-moa-proposals');
const cycles=require('../netlify/lib/_scope-programme-cycle');
const {createFixture}=require('./scope-qv-local-fixture');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');

test('Seven PAPR proposals reuse annual weekday and calendar motor; module 2 before PR 1.1',async()=>{
  const q=await createFixture(null).service.listProgramme(2027);
  assert.equal(q.paprProposals.length,7);
  assert.deepEqual(q.paprProposals.map(row=>row.date),['2027-02-02','2027-02-16','2027-06-03','2027-09-29','2027-11-16','2027-11-30','2027-12-11']);
  assert.equal(q.paprProposals[0].origin,'PROTECTED');
  for(const row of q.paprProposals) assert.ok(row.constraints.every(value=>value.pass));
  assert.ok(q.paprProposals[1].rejected.some(row=>row.date==='2027-02-09'));
  for(const row of q.canonicalProgramme.rows.filter(row=>row.restoredModule)){
    assert.deepEqual(row.qualificationCodes,['PAPR']);assert.equal(row.cursus,'PAPR');assert.equal(row.statCom,'011PR');
  }
});
test('Human date remains exact even when chronology conflicts',async()=>{
  const q=await createFixture(null).service.listProgramme(2027);
  const rows=q.canonicalProgramme.rows.map(row=>papr.moduleNumber(row)===2
    ? {...row,startsAt:'2027-03-04T18:00',endsAt:'2027-03-04T21:00',humanDecision:true} : row);
  const result=papr.proposePaprDates(rows,history);
  assert.equal(result.proposals[1].date,'2027-03-04');assert.equal(result.proposals[1].status,'CONFLIT');
  assert.ok(result.proposals[1].conflicts.includes('Fin avant PR 1.1'));
});
test('Impossible rules give a precise conflict without fabricating a date',()=>{
  const rows=papr.restorePaprModules(source.rows,history);
  const policy=Object.fromEntries(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(day=>[day,'INTERDIT']));
  const result=papr.proposePaprDates(rows,history,{rulesByDomain:{PR:{dayPolicy:policy}}});
  assert.equal(result.proposals[1].date,null);assert.equal(result.proposals[1].status,'CONFLIT');
});
test('MOA provisional report is a planning boundary, not an operational or civil statistics event',()=>{
  const report=moa.reportReference();assert.equal(report.actualDate,'2028-02-10');assert.equal(report.provisional,true);
  const cycle=cycles.resolveProgrammeCycle(2027,{},[
    {itemId:'opening',closesCycleYear:2026,actualDate:'2027-02-23'},report]);
  assert.equal(cycle.status,'PROVISIONAL');assert.equal(cycle.endDate,'2028-02-10');assert.equal(cycle.generationAllowed,true);
  assert.equal(cycle.statisticsBasis,'CIVIL_EVENT_DATE');assert.equal(cycle.approvalRequired,'CODIR');
});
test('Report migration never replaces an existing declared report',async()=>{
  const queries=[];
  const result=await moa.installAnnualReportProposal({query:async(sql,args)=>{
    queries.push(sql);return {rows:sql.includes('future_date_id')?[{future_date_id:'existing'}]:[]};
  }});
  assert.equal(result.preservedDecision,true);assert.ok(!queries.some(sql=>sql.startsWith('insert')));
});
test('Explicit corrected themes take precedence over Phase I/II, including deliberate empty themes',()=>{
  assert.deepEqual(logic.qvProgrammeVisibleThemes({themes:['Thème MOA'],projectionEvidence:{theme:'Phase I'}}),['Thème MOA']);
  assert.deepEqual(logic.qvProgrammeVisibleThemes({themes:[],projectionEvidence:{theme:'Phase II'}}),[]);
  assert.deepEqual(logic.qvProgrammeVisibleThemes({projectionEvidence:{theme:'Phase I'}}),['Phase I']);
});
test('Prepose APR is permanent descriptive, functional labels singular, historical codes retained',()=>{
  const catalogue=logic.qvProgrammePublicCatalogue().flatMap(group=>group.items);
  assert.deepEqual(catalogue.find(([code])=>code==='PR:PREPOSE-APR'),['PR:PREPOSE-APR','Préposé APR']);
  assert.equal(catalogue.find(([code])=>code==='PR:CAND-PAPR')[1],'Candidat PAPR');
  assert.ok(catalogue.some(([code])=>code==='PR:FORMATEURS'));
  assert.equal(logic.qvProgrammeDescriptivePublics()['PR:PREPOSE-APR'],'Préposé APR');
});
test('Seven-column PAPR proposal table, provisional Codir notice, existing multiselection and cursus label',async()=>{
  const q=await createFixture(null).service.listProgramme(2027),{hooks}=createCatalogUiHarness();
  const html=hooks.renderQuoVadisProgrammeHtml(q);
  assert.match(html,/qv-papr-proposals/);assert.match(html,/Source de la proposition/);assert.match(html,/Contraintes vérifiées/);
  assert.match(html,/PROVISOIRE/);assert.match(html,/CODIR/);
  const fs=require('node:fs'),ui=fs.readFileSync(require.resolve('../assets/js/scope-ui'),'utf8');
  assert.match(ui,/Cursus de formation/);assert.match(ui,/qv-programme-specialisation/);assert.match(ui,/type="checkbox"/);
});
