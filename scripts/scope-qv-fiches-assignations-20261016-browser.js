'use strict';
// Technical browser test only: isolated synthetic page, no SCOPE server, no external network.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SCOPE_CHROME_PATH?{executablePath:process.env.SCOPE_CHROME_PATH}:{})});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  let requests=0;
  await page.route('**/*',route=>{requests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><div id="scope-root"></div></body></html>'});});
  await page.goto('http://scope-technical.test/scope.html');
  await page.evaluate(()=>{
   window.__SCOPE_UI_TEST_HOOKS__=true;window.CurrentPermissions=['references:manage'];window.CurrentRoles=['ADMINISTRATEUR'];
   window.MonitoringRBAC={has:p=>p==='references:manage'};window.savedRequests=[];
   window.ScopeApi={createHttpClient:()=>({updateQuoVadisProgrammeItem:async(id,payload)=>{
    window.savedRequests.push({id,payload});return {updated:false};}})};
  });
  for(const file of ['assets/js/scope-ui-logic.js','assets/js/scope-ecawin.js','assets/js/scope-ui.js']) await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(()=>{
   const first={id:'fixture-first',definitionId:'QV26-EXERCICE-CAR-1-1-B757E011',label:'Exercice CAR 1.1',activityLabel:'Exercice CAR 1.1',
    startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',domain:'F7',family:'Exercice',
    oiSelections:['DPS:G1'],publics:['C site JSP'],publicFreeLabels:['Responsable matériel historique'],participationEvaluation:true};
   window.fixture={programme:{annee:2027},canonicalProgramme:{rows:[first,{...first,id:'fixture-second',publishedEventId:'fixture-event'}]},
    lieux:[],sallesTheorie:[],qualifications:[],cursus:[],responsableFonctions:[]};
   const h=window.ScopeUiTestHooks;h.state.loading=false;
   document.getElementById('scope-root').innerHTML=h.renderQuoVadisProgrammeFicheHtml(window.fixture,first.id);h.bind();
  });
  const details=page.locator('#qv-assignment-preparation');
  await details.evaluate(el=>el.open=true);
  await page.locator('#qv-assignment-profile').selectOption('CAR');
  await page.locator('#qv-programme-participation-evaluation').uncheck();
  await page.locator('[data-qv-correction-field="participationEvaluation"]').check();
  await page.locator('#qv-propose-type-corrections').click();
  const preview=await page.locator('#qv-type-correction-proposals').innerText();
  assert.ok(preview.includes('fixture-first') && preview.includes('fixture-second') && preview.includes('REVISION_MOTIVEE'));
  assert.equal(await page.evaluate(()=>window.savedRequests.length),0,'Preview must never save');
  // The sole OI selector updates the available functions without losing selected historical values.
  await page.evaluate(()=>{
   const list=document.getElementById('qv-programme-oi');
   for(const input of list.querySelectorAll('input')) input.checked=input.value==='DAP:Y1';
   list.querySelector('input[value="DAP:Y1"]').dispatchEvent(new Event('change',{bubbles:true}));
  });
  const choices=await page.locator('#qv-programme-public input:checked').evaluateAll(items=>items.map(i=>({value:i.value,preserved:i.dataset.preservedCodes})));
  assert.ok(choices.some(i=>i.preserved?.includes('C site JSP')),'Historical raw function code must survive OI refresh');
  assert.ok(choices.some(i=>i.value==='Responsable matériel historique'),'Historical free label must survive OI refresh');
  assert.equal(await page.locator('#qv-programme-public input[value="C DAP"]').count(),1);
  await page.locator('#qv-programme-save').click();
  await page.waitForFunction(()=>window.savedRequests.length===1);
  const saved=await page.evaluate(()=>window.savedRequests[0]);
  assert.equal(saved.payload.participationEvaluation,false);assert.equal(saved.payload.assignmentParameters.profile,'CAR');
  assert.deepEqual(saved.payload.oiCodes,['DAP:Y1']);assert.ok(saved.payload.publicCodes.includes('C site JSP'));
  assert.ok(saved.payload.publicFreeLabels.includes('Responsable matériel historique'));assert.equal(saved.payload.saveAction,'SAVE');
  // Render a fresh untouched form: no implicit parameter/evaluation changes in the save payload.
  await page.evaluate(()=>{const h=window.ScopeUiTestHooks;h.state.feedback=null;
   document.getElementById('scope-root').innerHTML=h.renderQuoVadisProgrammeFicheHtml(window.fixture,'fixture-first');h.bind();});
  await page.evaluate(()=>{const group=document.querySelector('#qv-programme-oi [data-qv-oi-group="JSP"]');
   group.checked=true;group.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('#qv-programme-public input[value="C JSP"]').count(),1,'Group OI selection must refresh functions after its children');
  await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>window.savedRequests.length===2);
  const untouched=await page.evaluate(()=>window.savedRequests[1].payload);
  assert.equal(Object.hasOwn(untouched,'participationEvaluation'),false);assert.equal(Object.hasOwn(untouched,'assignmentParameters'),false);
  assert.deepEqual(errors,[]);assert.equal(requests,1,'Only the intercepted synthetic document may be requested');
  process.stdout.write(JSON.stringify({status:'PASS_TECHNIQUE_LOCAL',scenarios:6,syntheticDocumentRequests:requests,externalRequests:0,productionWrites:0,
   checks:['grouped evaluation proposals without save','historical function/free labels retained on OI change','same save workflow and explicit parameters','untouched evaluation/parameters omitted','OI group refresh without function duplicates','no browser errors or external network']},null,2)+'\n');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
