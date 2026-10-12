'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const papr=require('../netlify/lib/_scope-qv-papr-rules');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const history=require('../netlify/lib/data/scope-qv-history-2026.json').rows;
const source=require('../netlify/lib/data/scope-qv-programme-2027.json');
const {createFixture}=require('./scope-qv-local-fixture');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');

test('Seven distinct PAPR modules, exact source themes, no invented dates or repeated restoration',()=>{
  const rows=papr.restorePaprModules(source.rows,history);
  const modules=rows.filter(row=>papr.moduleNumber(row));
  assert.equal(modules.length,7);
  assert.equal(new Set(modules.map(row=>row.label)).size,7);
  assert.equal(new Set(modules.map(row=>row.themes[0])).size,7);
  for(const row of modules){
    const evidence=history.find(value=>papr.moduleNumber(value)===papr.moduleNumber(row));
    assert.deepEqual(row.themes,evidence.title.split('|').slice(1).map(value=>value.trim()));
    assert.deepEqual(row.ois,papr.DPS_OIS);
    assert.deepEqual(row.publics,papr.PAPR_PUBLICS);
    assert.equal(row.responsible,'C PR');
    if(row.restoredModule) assert.equal(row.startsAt,null);
  }
  assert.deepEqual(papr.restorePaprModules(rows,history),rows);
});
test('PAPR and PR human decisions are never overwritten',()=>{
  const protectedRow={label:'Cursus PAPR - module 2',id:'human',humanDecision:true,
    themes:['Thème décidé'],ois:['DPS:B2'],publics:['PR:2'],responsible:'Responsable décidé',startsAt:'2027-02-01T17:00'};
  assert.deepEqual(papr.restorePaprModules([protectedRow],history).find(row=>row.id==='human'),protectedRow);
  const renamed={...protectedRow,label:'Intitulé décidé',definitionId:'QV26-PAPR-M02'};
  assert.equal(papr.moduleNumber(renamed),2);
  assert.equal(papr.restorePaprModules([renamed],history).filter(row=>papr.moduleNumber(row)===2).length,1);
});
test('Classic PR exercises all DPS, PR-ABC PABC remains G1 only',async()=>{
  const q=await createFixture(null).service.listProgramme(2027);
  for(const row of q.canonicalProgramme.rows.filter(row=>/^Exercice PR/.test(row.label))){
    assert.deepEqual(row.oiSelections,row.label==='Exercice PR-ABC'?['DPS:G1']:papr.DPS_OIS);
    if(row.label==='Exercice PR-ABC') assert.deepEqual(row.publics,['PR:3']);
  }
});
test('Annual gate checks module 1 and 2 end strictly before actual PR 1.1 start',async()=>{
  const q=await createFixture(null).service.listProgramme(2027);
  const rows=q.canonicalProgramme.rows;
  assert.equal(papr.annualPaprControl(rows).blocking,true);
  const planned=rows.map(row=>papr.moduleNumber(row) && !row.startsAt
    ? {...row,startsAt:'2027-02-09T18:00',endsAt:'2027-02-09T21:00'} : row);
  assert.equal(papr.annualPaprControl(planned).blocking,false);
  assert.equal(papr.annualPaprControl(planned.map(row=>row.eventDisplayLabel==='Exercice PR 1.1'
    ? {...row,label:'Intitulé humain',eventDisplayLabel:'Intitulé humain'} : row)).blocking,false);
  const first=papr.annualPaprControl(planned).firstPrStart;
  assert.equal(papr.annualPaprControl(planned.map(row=>papr.moduleNumber(row)===2 ? {...row,endsAt:first} : row)).blocking,true);
});
test('Unknown or duplicate modules block annual validation',()=>{
  const rows=papr.restorePaprModules(source.rows,history);
  assert.ok(papr.annualPaprControl(rows.concat(rows.find(row=>papr.moduleNumber(row)===2))).issues.some(value=>value.includes('doublon')));
  assert.ok(papr.annualPaprControl(rows.filter(row=>papr.moduleNumber(row)!==3)).issues.some(value=>value.includes('absent')));
});
test('Editorial minor, scheduling and population major; array order is irrelevant',()=>{
  assert.equal(revisions.revisionChanges({activityLabel:'A'},{activityLabel:'B'}).kind,'MINOR');
  assert.equal(revisions.revisionChanges({themes:['A']},{themes:['B']}).kind,'MINOR');
  for(const key of ['date','startTime','oiCodes','publicCodes','qualificationCodes','participationEvaluation'])
    assert.equal(revisions.revisionChanges({[key]:key.endsWith('Codes')?['A']:'A'},{[key]:key.endsWith('Codes')?['B']:'B'}).kind,'MAJOR');
  assert.deepEqual(revisions.revisionChanges({oiCodes:['DPS:G1','JSP:G1']},{oiCodes:['JSP:G1','DPS:G1']}).changedFields,[]);
});
test('Validated occurrence themes are part of the existing reconduction snapshot',()=>{
  const {businessSnapshot}=require('../netlify/lib/_scope-quo-vadis-consolidation');
  const fields={activityLabel:'Cursus PAPR - module 3',themes:['AO Simulateur'],statCom:'011PR'};
  assert.deepEqual(businessSnapshot(fields),fields);
});
test('0180F7 SQL seed and official EXERCI mapping, historic EXERPO retained',()=>{
  const refs=require('../netlify/lib/_scope-statcom-referential').initialStatComCodes();
  const ecawin=require('../assets/js/scope-ecawin');
  assert.equal(refs.find(row=>row.code==='0180F7').label,'Formations EXTRAS');
  assert.equal(ecawin.activityForStatCom('0180F7'),'EXERCI');
  assert.equal(ecawin.isCompatible('EXERPO',''),false);
  assert.ok(ecawin.activityCodes.includes('EXEPRO'));
});
test('Programme UI offers withdrawal, annual blocking reasons and no fabricated report date',async()=>{
  const q=await createFixture(null).service.listProgramme(2027);
  const {hooks}=createCatalogUiHarness();
  const html=hooks.renderQuoVadisProgrammeHtml(q);
  assert.match(html,/qv-programme-status-motif/);
  assert.match(html,/PAPR module 2/);
  assert.match(html,/février 2028/);
  assert.equal(q.programmeCycle.closingProposal.date,null);
  assert.equal(q.programmeCycle.closingProposal.proposedMonth,'2028-02');
});
test('Annual State cell top aligned, square remains 8x8',()=>{
  const css=fs.readFileSync(require.resolve('../assets/css/scope.css'),'utf8');
  assert.match(css,/\.qv-programme-table td:nth-child\(11\)\{vertical-align:top\}/);
  assert.match(css,/--scope-state-swatch-size: 8px/);
});
