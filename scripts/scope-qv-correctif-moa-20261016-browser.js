'use strict';
// Synthetic Chrome only; every request is intercepted, no business server or database.
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SCOPE_CHROME_PATH?{executablePath:process.env.SCOPE_CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];let requests=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{requests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><body><div id="scope-root"></div></body></html>'});});
  await page.goto('http://scope-correctif.test/scope.html');
  await page.evaluate(()=>{
   window.__SCOPE_UI_TEST_HOOKS__=true;window.CurrentPermissions=['references:manage'];window.CurrentRoles=['ADMINISTRATEUR'];
   window.MonitoringRBAC={has:p=>p==='references:manage'};window.savedRequests=[];window.dialogs=0;
   window.ScopeApi={createHttpClient:()=>({updateQuoVadisProgrammeItem:async(id,payload)=>{window.savedRequests.push({id,payload});return {updated:false};}})};
   new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes)if(node.nodeType===1 && (node.matches('dialog') || node.querySelector('dialog')))window.dialogs++;}).observe(document.body,{childList:true,subtree:true});
  });
  for(const f of ['assets/js/scope-personnel-referentials.js','assets/js/scope-ui-logic.js','assets/js/scope-ecawin.js','assets/js/scope-ui.js'])await page.addScriptTag({path:path.join(root,f)});
  await page.addStyleTag({path:path.join(root,'assets/css/scope.css')});
  await page.evaluate(()=>{
   const witness={id:'fixture-jsp-witness',definitionId:'fixture-jsp-type',activityLabel:'Séance Direction JSP',label:'Séance Direction JSP',
    code:'010JSP.006',statCom:null,startsAt:'2027-02-18T18:30:00',endsAt:'2027-02-18T20:30:00',status:'PLANIFIE',domain:'F7',family:'JSP',
    oiSelections:['JSP:G1','JSP:C1','JSP:B1'],responsible:'C JSP',publics:['CMDT:C-FOR','C site','Resp for JSP'],participationEvaluation:false,
    publishedEventId:'fixture-existing-event',businessValidation:{valid:true},version:7,history:[{action:'MOA_VALIDATION'}]};
   const tp9={id:'fixture-tp9-0',definitionId:'QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21',label:'Conduite TP9000, formation continue 1.0',activityLabel:'Conduite TP9000, formation continue 1.0',
    startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',domain:'AUTO',family:'Formation',oiSelections:['DPS:G1'],publics:['AUTO:2'],participationEvaluation:true};
   window.fixture={programme:{annee:2027},canonicalProgramme:{rows:[witness,...Array.from({length:4},(_,i)=>({...tp9,id:'fixture-tp9-'+i}))]},lieux:[],sallesTheorie:[],qualifications:[],responsableFonctions:[{code:'Resp for JSP',libelle:'Resp for JSP'},{code:'C site',libelle:'C site'},{code:'JSP:CHEF-FORMATION',libelle:'Chef formation JSP'}]};
   window.fixtureBefore=JSON.stringify(window.fixture);const h=window.ScopeUiTestHooks;h.state.loading=false;
   window.renderFixture=id=>{h.state.feedback=null;document.getElementById('scope-root').innerHTML=h.renderQuoVadisProgrammeFicheHtml(window.fixture,id);h.bind();document.getElementById('qv-assignment-preparation').open=true;};
   window.renderFixture(witness.id);
  });
  const TP9='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21';
  assert.equal(await page.locator('#qv-programme-public input[value="JSP:CHEF-FORMATION"]').count(),0);
  assert.equal(await page.locator('#qv-programme-responsable input[value="JSP:CHEF-FORMATION"]').count(),0);
  assert.equal(await page.locator('#qv-programme-public fieldset').filter({has:page.locator('input[value="Resp for JSP"]')}).locator('legend').textContent(),'Commandement et responsables');
  await page.locator('#qv-programme-public').evaluate(list=>list.closest('details').open=true);
  await page.locator('#qv-programme-public-search').fill('JSP');
  assert.equal(await page.locator('#qv-programme-public input[value="C site"]').evaluate(input=>!input.closest('label').hidden),true);
  assert.equal(await page.locator('#qv-programme-public input[value="Resp for JSP"]').evaluate(input=>!input.closest('label').hidden),true);
  await page.locator('#qv-programme-public').evaluate(list=>list.closest('details').open=false);
  assert.equal(await page.locator('#qv-check-type-conformity').isDisabled(),true);
  assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.dialogs),0);
  await page.locator('#qv-conformity-types').selectOption(TP9);
  await page.locator('#qv-check-type-conformity').click();
  let text=await page.locator('#qv-conformity-results').innerText();
  assert.ok(text.includes('Règle métier non définie') && text.includes('cond PL TP9'));
  assert.ok(!text.includes('Chef formation') && !text.includes('Formation → JSP'));
  assert.equal(await page.locator('#qv-conformity-results tbody tr').count(),24);
  assert.equal(await page.locator('#qv-harmonisation-source').inputValue(),'');
  await page.locator('#qv-harmonisation-source').selectOption('fixture-jsp-witness');
  await page.locator('#qv-harmonisation-types').selectOption(TP9);
  for(const field of ['domain','family','publicCodes','participationEvaluation'])await page.locator('[data-qv-harmonisation-field="'+field+'"]').check();
  await page.locator('#qv-preview-harmonisation').click();
  text=await page.locator('#qv-harmonisation-results').innerText();
  assert.ok(text.includes('Reprise incompatible') && text.includes('Valeur source') && text.includes('Chef formation') && text.includes('Non'));
  assert.equal(await page.locator('#qv-harmonisation-results tbody tr').count(),16);
  for(const technical of ['AUTO:2','CMDT:C-FOR','CONFIRMATION_MOA','REVISION_MOTIVEE','fixture-tp9','{"profile"'])assert.ok(!text.includes(technical),technical);
  assert.equal(await page.evaluate(()=>window.savedRequests.length),0);
  if(process.env.SCOPE_CORRECTIF_SCREENSHOT_DIR){
   await page.locator('#qv-review-harmonisation-title').evaluate(el=>el.scrollIntoView({block:'start'}));
   await page.screenshot({path:path.join(process.env.SCOPE_CORRECTIF_SCREENSHOT_DIR,'harmonisation-1440.png')});
  }
  // Disabled prerequisites and stale-preview invalidation stay contextual, without dialogs.
  await page.locator('[data-qv-harmonisation-field="publicCodes"]').uncheck();
  assert.equal(await page.locator('#qv-harmonisation-results').innerText(),'');
  for(const field of ['domain','family','participationEvaluation'])await page.locator('[data-qv-harmonisation-field="'+field+'"]').uncheck();
  assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.dialogs),0);
  // Readable TP9 assignment parameters; layout measured at desktop, tablet and narrow mobile.
  await page.evaluate(()=>window.renderFixture('fixture-tp9-0'));
  assert.ok((await page.locator('#qv-assignment-preparation').innerText()).includes('Conducteurs TP9 qualifiés uniquement.'));
  if(process.env.SCOPE_CORRECTIF_SCREENSHOT_DIR){
   await page.locator('#qv-review-assignment-title').evaluate(el=>el.scrollIntoView({block:'start'}));
   await page.screenshot({path:path.join(process.env.SCOPE_CORRECTIF_SCREENSHOT_DIR,'assignations-1440.png')});
  }
  await page.locator('#qv-conformity-types').selectOption(TP9);await page.locator('#qv-check-type-conformity').click();
  const widths=[1440,1024,390],layouts=[];
  for(const width of widths){
   await page.setViewportSize({width,height:1100});
   const layout=await page.locator('#qv-assignment-preparation').evaluate(panel=>{
    const fields=[...panel.querySelectorAll('.qv-review-field')].filter(el=>el.getBoundingClientRect().width>0);
    const overlaps=fields.filter(label=>{const span=label.querySelector('span').getBoundingClientRect(),control=label.querySelector('input,select').getBoundingClientRect();return span.bottom>control.top+1;}).length;
    const checks=[...panel.querySelectorAll('.qv-review-check')].filter(el=>el.getBoundingClientRect().width>0);
    const badChecks=checks.filter(label=>{const input=label.querySelector('input').getBoundingClientRect(),span=label.querySelector('span').getBoundingClientRect();return input.right>=span.left;}).length;
    const p=panel.getBoundingClientRect();return {overlaps,badChecks,panelFits:p.right<=innerWidth+1 && p.left>=0,
     tableOverflowContained:[...panel.querySelectorAll('.qv-review-table-wrap')].every(el=>el.getBoundingClientRect().right<=p.right+1),
     square:getComputedStyle(panel.querySelector('.qv-review-state'),'::before').width};
   });
   assert.equal(layout.overlaps,0);assert.equal(layout.badChecks,0);assert.ok(layout.panelFits && layout.tableOverflowContained);assert.equal(layout.square,'8px');layouts.push({width,...layout});
   if(process.env.SCOPE_CORRECTIF_SCREENSHOT_DIR){
    await page.locator('#qv-assignment-preparation').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(process.env.SCOPE_CORRECTIF_SCREENSHOT_DIR,'panel-'+width+'.png')});
   }
  }
  await page.setViewportSize({width:1440,height:1100});
  // Saving only an unrelated editable fixture through the existing fake client: untouched fields omitted.
  await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>window.savedRequests.length===1);
  const payload=await page.evaluate(()=>window.savedRequests[0]);
  assert.equal(payload.id,'fixture-tp9-0');assert.deepEqual(payload.payload.publicCodes,['AUTO:2']);
  for(const field of ['assignmentParameters','participationEvaluation','responsibleSelections'])assert.equal(Object.hasOwn(payload.payload,field),false);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.fixture)===window.fixtureBefore),true);
  // A retired choice remains available only on its historical fixture, retaining the raw selection.
  await page.evaluate(()=>{window.fixture.canonicalProgramme.rows[1].publics.push('JSP:CHEF-FORMATION');window.renderFixture('fixture-tp9-0');});
  assert.equal(await page.locator('#qv-programme-public input[value="JSP:CHEF-FORMATION"]').isChecked(),true);
  await page.evaluate(()=>{window.CurrentPermissions=[];window.CurrentRoles=[];window.MonitoringRBAC.has=()=>false;window.renderFixture('fixture-tp9-0');
   const field=document.getElementById('qv-conformity-types');field.value='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21';field.dispatchEvent(new Event('change',{bubbles:true}));
   document.getElementById('qv-check-type-conformity').dispatchEvent(new Event('click',{bubbles:true}));});
  assert.equal(await page.locator('#qv-check-type-conformity').isDisabled(),true);
  assert.equal(await page.locator('#qv-conformity-results').innerText(),'');
  assert.equal(await page.evaluate(()=>window.savedRequests.length),1);
  assert.deepEqual(errors,[]);assert.equal(requests,1);
  process.stdout.write(JSON.stringify({status:'PASS_TECHNIQUE_LOCAL',scenarios:11,externalRequests:0,productionWrites:0,syntheticDocumentRequests:requests,dialogs:0,
   layouts,checks:['JSP retirement and group','JSP contextual search','disabled prerequisites without dialog','JSP to four TP9 conformity without propagation','explicit incompatible harmonisation','human labels without JSON or IDs','stale preview cleared','three viewport layouts','untouched save fields omitted and protected witness unchanged','historical retired selection retained','existing permissions keep controls disabled']},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
