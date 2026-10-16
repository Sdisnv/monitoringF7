'use strict';
// Local synthetic browser, all requests intercepted. Never a production/MOA recipe.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SCOPE_CHROME_PATH?{executablePath:process.env.SCOPE_CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{requests.push(route.request().url());return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><body><div id="scope-root"></div></body></html>'});});
  await page.goto('http://scope-institutional.test/scope.html');
  await page.evaluate(()=>{window.__SCOPE_UI_TEST_HOOKS__=true;window.CurrentPermissions=['references:manage'];window.CurrentRoles=['ADMINISTRATEUR'];
   window.MonitoringRBAC={has:p=>p==='references:manage'};window.savedRequests=[];
   window.ScopeApi={createHttpClient:()=>({updateQuoVadisProgrammeItem:async(id,payload)=>{window.savedRequests.push({id,payload});return {updated:false};}})};});
  for(const f of ['assets/js/scope-personnel-referentials.js','assets/js/scope-ui-logic.js','assets/js/scope-ecawin.js','assets/js/scope-ui.js'])await page.addScriptTag({path:path.join(root,f)});
  await page.addStyleTag({path:path.join(root,'assets/css/scope.css')});
  await page.evaluate(()=>{
   const row={id:'fixture-institutional',definitionId:'fixture-type',label:'Activité institutionnelle témoin',activityLabel:'Activité institutionnelle témoin',domain:'F7',family:'FOCO',
    startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',oiSelections:['DPS:G1','JSP:G1'],
    publics:['AUTO:CAND-TP9','FOBA:1','CMDT:CDT','ECH:III','ECH:0','AUTO:2','CMDT:CHEF-SECTION-DAP'],
    publicFreeLabels:['Resp matériel ','Chef site JSP'],qualificationCodes:['COND_TP9','fixture-qual','MEA','MACHINISTE_EA','VPC'],
    responsibleSelections:[{kind:'REFERENCE',code:'C site JSP'},{kind:'REFERENCE',code:'C site'},{kind:'REFERENCE',code:'C for'},{kind:'FREE',label:'Chef section DAP'}],
    statCom:'0120F7',ecawinActivityCode:'EXERCI',participationEvaluation:true};
   window.fixture={programme:{annee:2027},canonicalProgramme:{rows:[row]},lieux:[],sallesTheorie:[],qualifications:[{code:'COND_TP9',label:'cond TP9'},{code:'fixture-qual',label:'Certification historique'},{code:'MEA',label:'MEA'},{code:'MACHINISTE_EA',label:'Machiniste EA'},{code:'VPC',label:'VPC'}],
    responsableFonctions:[{code:'C site JSP',libelle:'C site JSP'},{code:'C site',libelle:'C site'},{code:'C for',libelle:'C for'},{code:'C scrt',libelle:'C sct'},{code:'C FOBA',libelle:'C FOBA'},{code:'Resp mat JSP',libelle:'Resp mat JSP'}]};
   const h=window.ScopeUiTestHooks;h.state.loading=false;document.getElementById('scope-root').innerHTML=h.renderQuoVadisProgrammeFicheHtml(window.fixture,row.id);h.bind();
  });
  assert.equal(await page.locator('#qv-programme-responsable input[value="Resp mat JSP"]').count(),0);
  const groups=['Commandement et responsables','Encadrement','Personnel et spécialisations'];
  for(const id of ['qv-programme-public','qv-programme-responsable','qv-programme-specialisation']){
   assert.deepEqual(await page.locator('#'+id+' > fieldset > legend').allTextContents(),groups);
  }
  const labels=await page.locator('#qv-programme-public > fieldset > label').evaluateAll(items=>items.map(i=>({code:i.querySelector('input').value,label:i.textContent.trim()})));
  for(const pair of [['AUTO:1','AUTO:CAND-PL'],['AUTO:2','AUTO:CAND-TP9'],['AUTO:3','AUTO:CAND-VL'],['AUTO:5','AUTO:CAND-EA'],['PR:2','PR:CAND-PAPR'],['ENC:C-GROUPE','ENC:CAND-C-GROUPE']]){
   const idx=labels.findIndex(i=>i.code===pair[0]);assert.equal(labels[idx+1].code,pair[1]);
  }
  assert.equal(labels.filter(i=>i.label==='Chef site').length,1);assert.ok(labels.some(i=>i.label==='Resp formation'));
  assert.ok(labels.some(i=>i.label==='Cadre FOBA'));assert.ok(labels.some(i=>i.label==='Rempl. chef FOBA'));
  assert.equal(await page.locator('#qv-programme-specialisation label').filter({hasText:/^MEA$/}).count(),1,'Persisted MEA aliases have one displayed choice');
  const summaryBefore=await page.locator('#qv-programme-public-summary').innerText();assert.ok(summaryBefore.startsWith('Commandant'));
  assert.ok(summaryBefore.includes('Échelon 0 et III'));assert.ok(summaryBefore.includes('cond PL TP9, Candidat cond PL TP9'));
  const responsibility=await page.locator('#qv-programme-responsable-summary').innerText();assert.equal(responsibility,'Chef formation ; Chef site ; Chef section');
  const visible=await page.locator('#scope-root').innerText();assert.ok(!visible.includes('CMDT:CHEF-SECTION-DAP'));assert.ok(!visible.includes('COND_TP9'));assert.ok(!visible.includes('ENC:CADRE-FOBA'));
  await page.evaluate(()=>{const list=document.getElementById('qv-programme-public');
   for(const code of ['AUTO:2','CMDT:CDT','ECH:0','FOBA:1']){
    const input=list.querySelector('input[value="'+code+'"]');input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
   }});
  assert.equal(await page.locator('#qv-programme-public-summary').innerText(),summaryBefore,'Click order must not change display order');
  await page.evaluate(()=>{const list=document.getElementById('qv-programme-oi');
   for(const input of list.querySelectorAll('input'))input.checked=input.value==='DAP:Y1';list.querySelector('input[value="DAP:Y1"]').dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('#qv-programme-public input[value="Resp for JSP"]').count(),0);
  assert.equal(await page.locator('#qv-programme-public input[value="C site"]').count(),1,'Historical selected site function must survive');
  assert.deepEqual(await page.locator('#qv-programme-public > fieldset > legend').allTextContents(),groups);
  await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>window.savedRequests.length===1);
  const saved=await page.evaluate(()=>window.savedRequests[0].payload);
  for(const code of ['CMDT:CHEF-SECTION-DAP','AUTO:2','AUTO:CAND-TP9','FOBA:1','CMDT:CDT'])assert.ok(saved.publicCodes.includes(code));
  assert.deepEqual(new Set(saved.publicFreeLabels),new Set(['Resp matériel ','Chef site JSP']));
  assert.equal(Object.hasOwn(saved,'responsibleSelections'),false);
  assert.equal(saved.statCom,'0120F7');assert.equal(Object.hasOwn(saved,'qualificationCodes'),false);assert.equal(Object.hasOwn(saved,'assignmentParameters'),false);assert.equal(Object.hasOwn(saved,'participationEvaluation'),false);
  await page.evaluate(()=>{
   for(const [id,code] of [['qv-programme-responsable','C for'],['qv-programme-specialisation','COND_TP9']]){
    const input=document.getElementById(id).querySelector('input[value="'+code+'"]');
    input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}));input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
   }});
  await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>window.savedRequests.length===2);
  const explicit=await page.evaluate(()=>window.savedRequests[1].payload);
  assert.deepEqual(explicit.responsibleSelections.map(JSON.stringify).sort(),
   [{kind:'REFERENCE',code:'C site JSP'},{kind:'REFERENCE',code:'C site'},{kind:'REFERENCE',code:'C for'},{kind:'FREE',label:'Chef section DAP'}].map(JSON.stringify).sort());
  assert.deepEqual(new Set(explicit.qualificationCodes),new Set(['COND_TP9','fixture-qual','MEA','MACHINISTE_EA','VPC']));
  assert.deepEqual(errors,[]);
  // Optional local screenshot of the same synthetic selector; no personal data.
  if(process.env.SCOPE_OS_SCREENSHOT){
   await page.evaluate(()=>{
    document.getElementById('scope-notification-host')?.remove();
    const h=window.ScopeUiTestHooks;h.state.feedback=null;
    document.getElementById('scope-root').innerHTML=h.renderQuoVadisProgrammeFicheHtml(window.fixture,'fixture-institutional');h.bind();
    const menu=document.getElementById('qv-programme-public').closest('details');menu.open=true;menu.scrollIntoView({block:'center'});
    const search=document.getElementById('qv-programme-public-search');search.value='FOBA';search.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.screenshot({path:process.env.SCOPE_OS_SCREENSHOT});
  }
  process.stdout.write(JSON.stringify({status:'PASS_TECHNIQUE_LOCAL',scenarios:8,externalNetworkRequests:0,interceptedRequests:requests.length,productionWrites:0,
   checks:['three groups across all selectors','hierarchy and candidate adjacency','FOBA/JSP contextual functions','same summary regardless of click order','technical codes hidden','OI refresh with historical values','untouched fields omitted from save','explicit save preserves cumulative historical responsibility/qualification values']},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
