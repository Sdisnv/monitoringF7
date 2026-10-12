'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createFixture}=require('./scope-qv-local-fixture');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
async function loaded(){
  const qv=await createFixture(null).service.listProgramme(2027);
  const harness=createCatalogUiHarness();harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,session:{roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  return {qv,...harness};
}
test('QV-EXPORT-001 Programme: titre exact separe pour PDF, meme cellule Excel, sans mutation',async()=>{
  const {qv,hooks}=await loaded();
  const before=JSON.stringify(qv.canonicalProgramme.rows);
  const payload=hooks.quoVadisProgrammeExport(qv,{q:'Exercice PR 1.1'});
  const row=payload.rows.find(row=>row.activite==='Exercice PR 1.1');
  assert.ok(row);assert.deepEqual(row.themes,['Base']);
  const csv=hooks.quoVadisProgrammeCsvText([row]);
  assert.ok(csv.includes('"Exercice PR 1.1 - Base"'));
  assert.ok(hooks.quoVadisProgrammeCsvText([{...row,themes:[]}]).includes('"Exercice PR 1.1"'));
  assert.ok(!hooks.quoVadisProgrammeCsvText([{...row,themes:[' ']}]).includes('Exercice PR 1.1 - '));
  assert.equal(JSON.stringify(qv.canonicalProgramme.rows),before);
});
test('la fiche manuelle propose les types canoniques dans le formulaire existant',async()=>{
  const {hooks,context,root}=await loaded();
  context.location.hash='#/quo-vadis/programme/nouveau';hooks.render();
  assert.match(root.innerHTML,/id="qv-programme-type"/);
  assert.match(root.innerHTML,/Séance Codir/);
  for(const site of ['G1','C1','B1','B2']) assert.ok(root.innerHTML.includes(`Exercice DPS 1 (${site})`));
  assert.match(root.innerHTML,/Exercice PR 1\.1/);
  assert.match(root.innerHTML,/<optgroup label="DPS">/);
});
test('les publics courts sont permanents et C sct est propose sans nouveau code responsable',async()=>{
  const {hooks,context,root,qv}=await loaded();
  context.location.hash='#/quo-vadis/programme/nouveau';hooks.render();
  for(const label of ['CDT','C op','C log','C for','QM','C PR','Formateur PR','Of auto','Formateur C1/118','Moniteur conduite'])
    assert.ok(root.innerHTML.includes(`<span>${label}</span>`),label);
  qv.responsableFonctions.push({code:'C scrt',libelle:'C sct'});
  hooks.renderQuoVadisProgrammeHtml(qv);context.location.hash='#/quo-vadis/programme/nouveau';hooks.render();
  assert.match(root.innerHTML,/<input[^>]*value="C scrt"[^>]*><span>C sct<\/span>/);
  assert.doesNotMatch(root.innerHTML,/<span>C scrt<\/span>/);
});
test('un mois A+1 conserve son annee civile dans le filtre du cycle 2027',async()=>{
  const {qv,hooks,root}=await loaded();
  qv.canonicalProgramme.rows.push({id:'ROADMAP-A1',label:'Séance Codir',activityLabel:'Séance Codir',
    startsAt:'2028-01-28T18:00',endsAt:'2028-01-28T20:00',domain:'F0',statCom:'070F0',ois:[],publics:[]});
  const html=hooks.renderQuoVadisProgrammeHtml(qv);
  assert.match(html,/<option value="2028-01"[^>]*>[^<]*2028<\/option>/);
});
test('les bornes metier sont visibles et la cloture manquante ne recoit aucune date inventee',async()=>{
  const {hooks,root}=await loaded();hooks.render();
  assert.match(root.innerHTML,/Rapport de clôture à définir/);
  assert.match(root.innerHTML,/id="qv-cycle-end" type="date" value=""/);
  assert.match(root.innerHTML,/id="qv-cycle-start" type="date" value="2027-02-24"/);
});
