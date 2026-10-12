'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const logic=require('../assets/js/scope-ui-logic');
const {createFixture}=require('./scope-qv-local-fixture');
const {createCatalogUiHarness,activityPayload}=require('./scope-annual-catalog-ui-harness');

async function fiche(mutator){
  const data=await createFixture(null).service.listProgramme(2027);
  const row=data.canonicalProgramme.rows.find(row=>row.eventDisplayLabel==='Exercice PR 1.3');
  assert.ok(row);mutator?.(row,data);
  const {hooks,context,root}=createCatalogUiHarness();
  hooks.renderQuoVadisProgrammeHtml(data);
  Object.assign(hooks.state,{authChecking:false,needOkta:false,session:{name:'Recette',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  context.location.hash='#/quo-vadis/programme/'+encodeURIComponent(row.id);hooks.render();
  return root.innerHTML;
}
test('la fiche affiche le titre exact de la seance et conserve son theme',async()=>{
  const html=await fiche();
  assert.match(html,/<h2>Exercice PR 1\.3<\/h2>/);
  assert.match(html,/id="qv-programme-activity"[^>]*value="Exercice PR 1\.3"/);
  assert.match(html,/id="qv-programme-themes"[^>]*value="Base"/);
});
test('la fiche propose seulement les references inclusives et pas un responsable par defaut',async()=>{
  const html=await fiche((row,data)=>{
    row.responsible='À affecter';row.responsibleSelections=undefined;row.responsableFonctionCode=null;
    data.responsableFonctions=[{code:'Présidente Codir',libelle:'Présidente Codir'},
      {code:'Présidente CI',libelle:'Présidente CI'},{code:'Cdt',libelle:'Cdt'},
      {code:'À affecter',libelle:'À affecter'}];
  });
  assert.match(html,/<legend>Commandement<\/legend>/);
  assert.match(html,/<span>PrésidentE CI<\/span>/);
  assert.match(html,/<span>PrésidentE Codir<\/span>/);
  assert.doesNotMatch(html,/<span>Présidente (?:Codir|CI)<\/span>/);
  assert.doesNotMatch(html,/<input[^>]*value="À affecter"/);
  assert.match(html,/id="qv-programme-responsable-summary">À affecter/);
  assert.ok(html.indexOf('<span>Commandant</span>')<html.indexOf('<span>PrésidentE CI</span>'));
});
test('le public permanent reste descriptif et les groupes sont tries',()=>{
  const catalogue=logic.qvProgrammePublicCatalogue();
  assert.equal(logic.qvProgrammePublicLabel('CMDT:CODIR'),'Membres du Codir');
  for(const group of catalogue) assert.deepEqual(group.items.map(item=>item[1]),
    group.items.map(item=>item[1]).sort((a,b)=>a.localeCompare(b,'fr')));
  for(const code of ['PR:2','PR:3','AUTO:1','JSP:1','FOBA:1'])
    assert.ok(catalogue.some(group=>group.items.some(item=>item[0]===code)));
});
test('les groupes OI restent qualifies et exposent leur etat partiel',async()=>{
  const html=await fiche(row=>{row.oiSelections=['DPS:G1','JSP:G1'];});
  assert.match(html,/data-qv-oi-group="DPS" aria-checked="mixed"/);
  assert.match(html,/data-qv-oi-group="DAP" aria-checked="false"/);
  assert.match(html,/data-qv-oi-group="JSP" aria-checked="mixed"/);
  assert.match(html,/value="DPS:G1" checked/);assert.match(html,/value="JSP:G1" checked/);
});
test('evaluation est activee par defaut, mais respecte une decision individuelle',async()=>{
  assert.match(await fiche(),/id="qv-programme-participation-evaluation" type="checkbox" checked/);
  assert.doesNotMatch(await fiche(row=>{row.participationEvaluation=false;}),/id="qv-programme-participation-evaluation" type="checkbox" checked/);
});
test('un Stat.Com hors liste et une ancienne activite sont conserves dans la fiche',async()=>{
  const html=await fiche(row=>{row.statCom='ANCIEN';row.ecawinActivityCode='EXERPO';});
  assert.match(html,/<option value="ANCIEN" selected disabled>/);
  assert.match(html,/<option value="EXERPO" selected/);
  assert.match(html,/id="qv-programme-ecawin-search" type="search"/);
});
test('le catalogue expose le defaut des programmations futures, distinct de la decision individuelle',()=>{
  const {hooks}=createCatalogUiHarness();
  assert.match(hooks.renderAnnualCatalogActivityHtml(activityPayload()),/id="annual-participation-evaluation-default" type="checkbox" checked/);
  assert.doesNotMatch(hooks.renderAnnualCatalogActivityHtml({...activityPayload(),participationEvaluationDefault:false}),
    /id="annual-participation-evaluation-default" type="checkbox" checked/);
});
