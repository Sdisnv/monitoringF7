'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createFixture}=require('./scope-qv-local-fixture');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const input=row=>({year:2027,activityLabel:row.activityLabel || row.label,statCom:row.statCom,oiCodes:[],publicCodes:['PR:2'],
  date:'2027-06-15',startTime:'10:00',endTime:'11:00',saveAction:'SAVE'});
async function scenario(){
  const fixture=createFixture(null);
  const row=(await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.statCom==='011PR' && !row.external);
  return {fixture,row};
}

test('une erreur de relecture ne laisse pas une planification partiellement enregistree',async()=>{
  const fixture=createFixture(null);
  const row=(await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.statCom==='011PR' && !row.external && !row.publishedEventId);
  assert.ok(row);
  const originalQuery=fixture.database.query;
  let written=false;
  fixture.database.query=async(sql,params)=>{
    if(written && /select .*from scope_quo_vadis_programmes/s.test(sql)) throw new Error('SIMULATED_RELOAD_FAILURE');
    const result=await originalQuery(sql,params);
    if(/^(insert into|update) scope_quo_vadis_obligations/.test(sql.trim())) written=true;
    return result;
  };
  const before=structuredClone(fixture.preparations);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,{year:2027,saveAction:'PLAN',
    activityLabel:row.activityLabel || row.label,statCom:row.statCom,oiCodes:[],publicCodes:[],
    date:'2027-06-15',startTime:'10:00',endTime:'11:00'}),/SIMULATED_RELOAD_FAILURE/);
  assert.deepEqual(fixture.preparations,before);
});

test('responsables et publics libres restent descriptifs, exacts et compatibles avec les references',async()=>{
  const {fixture,row}=await scenario();
  const choices=[{kind:'REFERENCE',code:'C JSP'},{kind:'REFERENCE',code:'C site JSP'},
    {kind:'FREE',label:'PrésidentE  Codir'},{kind:'FREE',label:'Responsable externe'}];
  const saved=await fixture.service.updateProgrammePreparation(row.id,{...input(row),responsibleSelections:choices,
    publicFreeLabels:['Membres du Codir','Invités externes','JSP:2'],publicCodes:['PR:2']});
  assert.equal(saved.updated,true);
  const current=saved.quoVadis.canonicalProgramme.rows.find(item=>item.id===row.id);
  assert.deepEqual(current.publics,['PR:2']);
  assert.deepEqual(current.publicFreeLabels,['Membres du Codir','Invités externes','JSP:2']);
  assert.equal(current.responsibleSelections[2].label,'PrésidentE  Codir');
  assert.equal(current.responsibleSelections[2].kind,'FREE');
  const activity=saved.quoVadis.activities.find(item=>item.sourceRef === row.id);
  assert.match(activity.responsable,/PrésidentE  Codir/);
  assert.deepEqual(activity.publicFreeLabels,current.publicFreeLabels);
  assert.equal(fixture.preparations[0].responsable_fonction_code,'C JSP');
  const reopened=(await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find(item=>item.id===row.id);
  assert.deepEqual(reopened.responsibleSelections,current.responsibleSelections);
  await fixture.service.updateProgrammePreparation(row.id,{...input(row),saveAction:'PLAN'});
  assert.deepEqual(fixture.preparations[0].metadata.planningFields.responsibleSelections,current.responsibleSelections);
  assert.equal(fixture.preparations.length,1);
  assert.ok(!fixture.queries.some(({sql})=>/^(insert into|update|delete from) scope_(personnes|affectations|attendus|participations|evenements)\b/.test(sql.trim())));
});

test('les trois commandes conservent leurs significations et la baseline humaine',async()=>{
  const {fixture,row}=await scenario();
  await fixture.service.updateProgrammePreparation(row.id,input(row));
  const stored=fixture.preparations[0];
  const status=stored.statut;
  assert.equal(stored.metadata.businessValidation,undefined);
  await fixture.service.updateProgrammePreparation(row.id,{...input(row),saveAction:'VALIDATE'});
  assert.equal(stored.statut,status);
  const baseline=structuredClone(stored.metadata.businessValidation.baselineFields);
  await fixture.service.updateProgrammePreparation(row.id,{...input(row),saveAction:'PLAN',themes:['Décision MOA']});
  assert.equal(stored.statut,'PLANIFIE');
  assert.deepEqual(stored.metadata.businessValidation.baselineFields,baseline);
  await fixture.service.updateProgrammePreparation(row.id,{...input(row),saveAction:'PLAN',themes:['Décision MOA']});
  assert.equal(fixture.preparations.length,1);
});

test('le serveur refuse les structures et references inventees sans ecriture',async()=>{
  for(const extra of [{publicFreeLabels:'libre'},{publicFreeLabels:['']},{publicFreeLabels:['x'.repeat(161)]},
    {responsibleSelections:'libre'},{responsibleSelections:[{kind:'REFERENCE',code:'NIP_FICTIF'}]},
    {responsibleSelections:[{kind:'REFERENCE',code:{value:'C JSP'}}]},
    {responsibleSelections:[{kind:'REFERENCE',code:'C PR\u0000'}]},
    {responsibleSelections:[{kind:'FREE',label:'x\nNIP'}]}]){
    const {fixture,row}=await scenario();
    await assert.rejects(fixture.service.updateProgrammePreparation(row.id,{...input(row),...extra}),error=>error.status === 422);
    assert.equal(fixture.preparations.length,0);
  }
});

test('CONCOUR complete le registre sans modifier les 60 associations acquises',()=>{
  const vm=require('node:vm');
  const source=require('node:child_process').execFileSync('git',['show','71677a6:assets/js/scope-ecawin.js'],{encoding:'utf8'});
  const sandbox={module:{exports:{}}};vm.runInNewContext(source,sandbox);
  const original=JSON.parse(JSON.stringify(sandbox.module.exports.associations));
  const current=require('../assets/js/scope-ecawin');
  assert.deepEqual(current.associations.filter(row=>row.statCom !== 'CONCOUR'),original);
  assert.equal(current.complete,true);
  assert.equal(current.correspondenceRows([{statCom:'CONCOUR',ecawinActivityCode:'EXERCI',businessCode:'CONCOUR.001'}])[0].exportable,true);
});

test('la fiche commune restitue selections libres et etat de planification distinct',async()=>{
  const {fixture,row}=await scenario();
  const result=await fixture.service.updateProgrammePreparation(row.id,{...input(row),saveAction:'PLAN',
    responsibleSelections:[{kind:'FREE',label:'PrésidentE Codir'}],publicFreeLabels:['Invités externes']});
  const {hooks,context,root}=createCatalogUiHarness();
  hooks.renderQuoVadisProgrammeHtml(result.quoVadis);
  Object.assign(hooks.state,{authChecking:false,needOkta:false,session:{name:'Recette',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  context.location.hash='#/quo-vadis/programme/'+encodeURIComponent(row.id);
  hooks.render();
  const html=root.innerHTML;
  assert.match(html,/Planifié/);
  assert.match(html,/PrésidentE Codir/);
  assert.match(html,/Invités externes/);
  assert.match(html,/data-qv-add-free="qv-programme-responsable"/);
  assert.match(html,/data-qv-add-free="qv-programme-public"/);
  hooks.state.loading=true;hooks.render();
  assert.match(root.innerHTML,/fieldset class="qv-programme-edit-grid" disabled/);
  assert.match(root.innerHTML,/id="qv-programme-plan" disabled/);
});

test('une ancienne navigation ne reactive ni ne recree la fiche en cours de chargement',async()=>{
  const {fixture,row}=await scenario();
  const data=await fixture.service.listProgramme(2027);
  const pending=[];
  const {hooks,context,root}=createCatalogUiHarness({client:{quoVadisProgramme:()=>new Promise(resolve=>pending.push(resolve))}});
  hooks.renderQuoVadisProgrammeHtml(data);
  Object.assign(hooks.state,{authChecking:false,needOkta:false,referentiels:{domaines:[{code:'F7'}]},
    session:{name:'Recette',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  context.location.hash='#/quo-vadis/programme';
  const oldNavigation=hooks.onRoute();
  context.location.hash='#/quo-vadis/programme/'+encodeURIComponent(row.id);
  const currentNavigation=hooks.onRoute();
  assert.equal(pending.length,2);
  pending[0]({quoVadis:data});await oldNavigation;
  assert.equal(hooks.state.loading,true);
  assert.match(root.innerHTML,/fieldset class="qv-programme-edit-grid" disabled/);
  pending[1]({quoVadis:data});await currentNavigation;
  assert.equal(hooks.state.loading,false);
  assert.doesNotMatch(root.innerHTML,/fieldset class="qv-programme-edit-grid" disabled/);
});
