'use strict';
// Technical Chrome scenarios with fake API only. No live server, person data or database.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SCOPE_CHROME_PATH?{executablePath:process.env.SCOPE_CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const request=route.request();requests.push({type:request.resourceType(),url:request.url()});
   if(request.resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><body><div id="scope-root"></div></body></html>'});
   const file=path.resolve(root,'.'+new URL(request.url()).pathname);
   if(file.startsWith(root+path.sep) && fs.existsSync(file))return route.fulfill({contentType:({'.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
   return route.abort();
  });
  await page.goto('http://scope-ux.test/scope.html');
  await page.evaluate(()=>{
   window.__SCOPE_UI_TEST_HOOKS__=true;window.CurrentRoles=['ADMINISTRATEUR'];window.CurrentPermissions=['references:manage'];window.savedRequests=[];
   window.MonitoringRBAC={has:p=>p==='references:manage'};
   window.ScopeApi={createHttpClient:()=>({quoVadisProgramme:async()=>({quoVadis:window.fixture}),updateQuoVadisProgrammeItem:async(id,payload)=>{window.savedRequests.push({id,payload});return {updated:false};}})};
  });
  for(const f of ['assets/js/scope-personnel-referentials.js','assets/js/scope-ui-logic.js','assets/js/scope-ecawin.js','assets/js/scope-ui.js'])await page.addScriptTag({path:path.join(root,f)});
  await page.addStyleTag({path:path.join(root,'assets/css/scope.css')});
  await page.evaluate(()=>{
   const tp9={id:'fixture-tp9-0',definitionId:'QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21',label:'Conduite TP9000, formation continue 1.0',activityLabel:'Conduite TP9000, formation continue 1.0',
    domain:'AUTO',family:'Formation',startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',oiSelections:['DPS:G1'],publics:['AUTO:2'],participationEvaluation:true,
    preparation:{id:'fixture-saved-tp9',updatedAt:'2026-10-16T10:00:00Z'},assignmentParameters:{profile:'TP9_1',includeCandidates:false,responsibleRequired:false,responsibleRule:''}};
   const witness={...tp9,id:'fixture-jsp',definitionId:'fixture-direction-jsp',code:'010JSP.006',statCom:null,label:'Séance Direction JSP',activityLabel:'Séance Direction JSP',
    domain:'F7',family:'JSP',startsAt:'2027-02-18T18:30:00',endsAt:'2027-02-18T20:30:00',status:'PLANIFIE',oiSelections:['JSP:G1','JSP:C1','JSP:B1'],publics:['CMDT:C-FOR','C site','Resp for JSP'],responsible:'C JSP',participationEvaluation:false,
    publishedEventId:'fixture-linked-event',preparation:{id:'fixture-jsp-saved',updatedAt:'2026-10-16T10:00:00Z'},assignmentParameters:{profile:'GENERAL',includeCandidates:true,responsibleRequired:false,responsibleRule:''},businessValidation:{valid:true},history:[{action:'MOA_INDIVIDUAL_VALIDATION'}],version:7,lineage:{source:'fixture-source'}};
   const blue={...tp9,id:'fixture-complete',definitionId:'fixture-complete-type',label:'Activité avec règle complète',activityLabel:'Activité avec règle complète',domain:'F7',family:'FOCO',assignmentParameters:null};
   const red={...tp9,id:'fixture-blocked',definitionId:'QV26-COURS-DE-CADRES-EXERCICE-TRUCK-220DF695',label:'Cours de cadres préparatoire',activityLabel:'Cours de cadres préparatoire',assignmentParameters:null};
   const unknown={...blue,id:'fixture-unknown',definitionId:'fixture-unknown-type',label:'Activité à qualifier',activityLabel:'Activité à qualifier',domain:'JSP',family:'JSP',assignmentParameters:null,preparation:null,businessValidation:null};
   window.fixture={programme:{annee:2027,statut:'PREPARATION'},summary:{},canonicalProgramme:{rows:[witness,...Array.from({length:4},(_,i)=>({...tp9,id:'fixture-tp9-'+i,sessionLabel:'Session '+(i+1)})),blue,red,unknown]},lieux:[],sallesTheorie:[],qualifications:[],responsableFonctions:[],
    rules:[{name:'Règle de planification complète',domain:'F7',definitionVersionId:'fixture-blue-version',code:'PRIVATE_TECHNICAL_RULE',dayPolicy:{MONDAY:'AUTORISE'},timePolicy:{usualStart:'19:00',usualEnd:'21:00'},durationMinutes:120,constraints:'Conditions de planification confirmées.',derogationAllowed:false}]};
   blue.definitionVersionId='fixture-blue-version';window.fixture.canonicalProgramme.rows.find(r=>r.id===blue.id).definitionVersionId='fixture-blue-version';
   window.fixtureBefore=JSON.stringify(window.fixture);
   const h=window.ScopeUiTestHooks;h.state.authChecking=false;h.state.needOkta=false;h.state.loading=false;h.state.session={displayName:'Test technique',roles:['ADMINISTRATEUR'],permissions:['references:manage']};h.state.referentiels.domaines=[{code:'F7',libelle:'Formation'}];
   window.navigateFixture=async hash=>{location.hash=hash;await h.onRoute();};
  });
  const TP9='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21',PREP='QV26-COURS-DE-CADRES-EXERCICE-TRUCK-220DF695';
  const shot=async name=>{if(process.env.SCOPE_UX_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCOPE_UX_SCREENSHOT_DIR,name+'.png')});};
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme'));
  assert.equal(await page.locator('.qv-subnav a').filter({hasText:'Contrôle du programme'}).count(),1);
  await page.evaluate(()=>{const s=window.ScopeUiTestHooks.state;s.quoVadisFilters.q='Séance';s.quoVadisFilters.oi='JSP:G1';s.quoVadisProgrammeMode='mensuelle';});
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme/fixture-jsp'));
  assert.equal(await page.locator('#qv-assignment-profile,#qv-conformity-types,#qv-harmonisation-source').count(),0);
  assert.equal(await page.locator('.qv-programme-reference').count(),1);
  await page.locator('#qv-programme-full-rule').click();assert.equal(await page.locator('#qv-programme-full-rule-content').isVisible(),true);
  const link=page.getByRole('link',{name:'Harmoniser à partir de cette fiche'});assert.ok((await link.getAttribute('href')).includes('modele=fixture-jsp'));
  await link.click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());
  assert.equal(await page.locator('#qv-harmonisation-source').inputValue(),'fixture-jsp');assert.ok((await page.locator('#qv-model-identity').innerText()).includes('18.02.27'));
  assert.ok((await page.locator('#qv-model-identity').innerText()).includes('JSP G1'));
  assert.equal(await page.locator('#qv-conformity-results tbody tr,#qv-harmonisation-results tbody tr').count(),0);
  assert.equal(await page.evaluate(()=>window.savedRequests.length),0);
  await page.locator('#qv-conformity-types').selectOption(TP9);await page.locator('#qv-check-type-conformity').click();
  let cells=await page.locator('#qv-conformity-results .qv-review-summary tbody tr').first().locator('td').allTextContents();
  assert.deepEqual(cells.slice(0,5),['4','8','0','0','16']);
  assert.equal(await page.locator('#qv-conformity-results .qv-review-table tbody tr').count(),0);
  await page.locator('#qv-conformity-results').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('synthese-1440');
  await page.locator('#qv-conformity-results [data-qv-review-open]').click();await page.waitForSelector('#qv-conformity-results .qv-review-table tbody tr');
  assert.equal(await page.locator('#qv-conformity-results .qv-review-table tbody tr').count(),24);
  await page.locator('#qv-conformity-results .qv-review-table').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('details-1440');
  const detail=await page.locator('#qv-conformity-results .qv-review-table').innerText();
  for(const technical of ['fixture-tp9','AUTO:2','CONFIRMATION_MOA','{"profile"'])assert.ok(!detail.includes(technical),technical);
  assert.ok(detail.includes('Session 1') && detail.includes('G1') && detail.includes('10.03.27'));
  assert.equal(await page.locator('.qv-review-state').first().evaluate(el=>getComputedStyle(el,'::before').width),'8px');
  await page.locator('#qv-programme-review').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('controle-1440');
  await page.locator('#qv-conformity-types').selectOption(PREP);await page.locator('#qv-check-type-conformity').click();
  cells=await page.locator('#qv-conformity-results .qv-review-summary tbody tr').first().locator('td').allTextContents();assert.equal(cells[3],'1');
  await page.locator('#qv-harmonisation-types').selectOption(TP9);await page.locator('[data-qv-harmonisation-field="participationEvaluation"]').check();
  await page.locator('#qv-preview-harmonisation').click();assert.equal(await page.locator('#qv-harmonisation-results .qv-review-summary tbody tr').count(),1);
  await page.locator('#qv-harmonisation-results [data-qv-review-open]').click();await page.waitForSelector('#qv-harmonisation-results .qv-review-table tbody tr');
  assert.ok((await page.locator('#qv-harmonisation-results .qv-review-table').innerText()).includes('Reprise incompatible'));
  await page.locator('#qv-harmonisation-source').selectOption('fixture-tp9-0');assert.equal(await page.locator('#qv-harmonisation-results').innerText(),'');
  await page.locator('#qv-model-search').fill('Séance Direction JSP');await page.locator('#qv-model-find').click();
  assert.equal(await page.locator('#qv-harmonisation-source option').filter({hasText:'Séance Direction JSP'}).count(),1);
  assert.equal(await page.locator('#qv-harmonisation-source option[value="fixture-unknown"]').count(),0);
  await page.locator('#qv-harmonisation-source').selectOption('fixture-jsp');
  await page.locator('#qv-review-search').fill('TP9000');await page.locator('#qv-review-filter').click();assert.equal(await page.locator('#qv-conformity-types option').count(),1);
  assert.equal(await page.locator('#qv-conformity-results').innerText(),'');
  await page.locator('#qv-review-reset').click();
  await page.getByRole('link',{name:'Retour au programme',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());
  const context=await page.evaluate(()=>({q:window.ScopeUiTestHooks.state.quoVadisFilters.q,oi:window.ScopeUiTestHooks.state.quoVadisFilters.oi,mode:window.ScopeUiTestHooks.state.quoVadisProgrammeMode}));
  assert.deepEqual(context,{q:'Séance',oi:'JSP:G1',mode:'mensuelle'});
  // Existing rule box palette and viewer, without any data mutation.
  const tones={};
  for(const [id,tone] of [['fixture-complete','blue'],['fixture-unknown','yellow'],['fixture-blocked','red']]){
   await page.evaluate(id=>window.navigateFixture('#/quo-vadis/programme/'+id),id);
   tones[id]=await page.locator('.qv-programme-reference').getAttribute('data-qv-tone');assert.equal(tones[id],tone);
   await page.locator('#qv-programme-full-rule').click();const text=await page.locator('.qv-programme-reference').innerText();assert.ok(!text.includes('PRIVATE_TECHNICAL_RULE') && !text.includes('MONDAY'));
  }
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme/fixture-tp9-0'));
  await page.locator('.qv-programme-reference').scrollIntoViewIfNeeded();await shot('fiche-1440');
  await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>window.savedRequests.length===1);
  const saved=await page.evaluate(()=>window.savedRequests[0]);assert.equal(saved.id,'fixture-tp9-0');
  assert.equal(Object.hasOwn(saved.payload,'assignmentParameters'),false);assert.equal(Object.hasOwn(saved.payload,'participationEvaluation'),false);
  assert.deepEqual(saved.payload.publicCodes,['AUTO:2']);assert.equal(await page.evaluate(()=>JSON.stringify(window.fixture)===window.fixtureBefore),true);
  await page.getByRole('button',{name:'Fermer la notification'}).click();
  // Responsive review layout is measured without changing global SCOPE styling.
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/controle-programme'));
  const layouts=[];
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:1100});
   const data=await page.locator('#qv-programme-review').evaluate(panel=>({
    fieldsOverlap:[...panel.querySelectorAll('.qv-review-field')].filter(label=>label.querySelector('span').getBoundingClientRect().bottom>label.querySelector('input,select').getBoundingClientRect().top+1).length,
    checkboxOverlap:[...panel.querySelectorAll('.qv-review-check')].filter(label=>label.querySelector('input').getBoundingClientRect().right>=label.querySelector('span').getBoundingClientRect().left).length,
    fits:panel.getBoundingClientRect().right<=innerWidth+1 && panel.getBoundingClientRect().left>=0,
    noticeLinksFit:[...panel.querySelectorAll('.qv-info-notice a')].every(link=>link.getBoundingClientRect().right<=innerWidth+1)
   }));assert.equal(data.fieldsOverlap,0);assert.equal(data.checkboxOverlap,0);assert.ok(data.fits);assert.ok(data.noticeLinksFit);layouts.push({width,...data});
   await page.locator('#qv-programme-review').evaluate(el=>el.scrollIntoView({block:'start'}));if(width===390)await shot('controle-390');
  }
  await page.evaluate(()=>{window.MonitoringRBAC.has=()=>false;window.ScopeUiTestHooks.render();});
  assert.equal(await page.locator('#qv-check-type-conformity').isDisabled(),true);assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.savedRequests.length),1);assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.type==='document').length,1);
  assert.ok(requests.every(r=>r.url.startsWith('http://scope-ux.test/') && ['document','image','font'].includes(r.type)),JSON.stringify(requests));
  process.stdout.write(JSON.stringify({status:'PASS_TECHNIQUE_LOCAL',scenarios:12,externalRequests:0,productionWrites:0,syntheticDocumentRequests:1,interceptedAssetRequests:requests.length-1,layouts,tones,
   checks:['single route/navigation and programme context preserved','fiche simplified with single rule box/viewer','contextual saved source without action','summary counts distinct occurrences and criteria','lazy details with date/OI/session and 8px states','actual preparatory blocker counted','same incompatible harmonisation engine','model change invalidates preview and model search','type search and reset invalidate results','three truthful rule-box tones','untouched stored parameters preserved in intercepted save and witness immutable','responsive layouts and existing permissions']},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
