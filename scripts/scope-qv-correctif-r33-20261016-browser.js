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
   window.fixture.canonicalProgramme.rows.push({id:'fixture-papr',definitionId:'fixture-papr-type',label:'Formation PAPR de test',activityLabel:'Formation PAPR de test',startsAt:'2027-01-10T19:00:00',endsAt:'2027-01-10T21:00:00',status:'PROPOSE',preparation:{id:'fixture-papr-saved'},oiSelections:['DPS:G1']});
   window.fixture.canonicalProgramme.rows.filter(r=>r.id.startsWith('fixture-tp9-')).forEach((r,i)=>{r.startsAt='2027-'+(i<2?'03':'04')+'-'+String(10+i*3).padStart(2,'0')+'T19:00:00';r.sessionLabel='Session '+(i+1);if(i===3)r.oiSelections=['DPS:C1'];});
   window.fixture.preparationControls=[{blocking:true,status:'A_CONTROLER',exerciseId:'fixture-tp9-0',exerciseIds:['fixture-tp9-0'],courseId:'fixture-blocked',message:'Délai préparatoire à contrôler.'},{blocking:false,status:'MOA_REQUIRED',exerciseId:'fixture-tp9-1',courseId:null,message:'Relation préparatoire ambiguë.'}];
   window.fixture.annualValidationControl={blocking:true,issues:['PAPR module 1 : thème absent.','Prérequis annuel global absent.'],modules:[{number:1,ids:['fixture-papr']}]};
   window.fixture.publicationReconciliation={blocking:true,entries:[{blocking:true,itemId:'fixture-jsp',publishedItemIds:[],status:'MOA_REQUIRED'}]};
   window.fixture.reservationConflicts=[{blocking:true,leftId:'fixture-tp9-0',rightId:'missing-fixture',roomLabel:'Salle de test'}];window.fixture.programmeCycle={provisional:true};
   for(let i=0;i<70;i++)window.fixture.canonicalProgramme.rows.push({id:'fixture-search-'+i,definitionId:'fixture-type-'+i,label:'Activité de test '+String(i).padStart(2,'0'),startsAt:'2027-05-10T19:00:00',status:'PROPOSE',oiSelections:['DAP:Y1'],family:'Formation'});
   for(let i=0;i<60;i++)window.fixture.canonicalProgramme.rows.push({id:'fixture-page-'+i,definitionId:'FIXTURE-PAGE',label:'Pagination de test',activityLabel:'Pagination de test',startsAt:'2027-05-10T19:00:00',status:'PROPOSE',oiSelections:['DAP:Y1'],sessionLabel:'Session '+(i+1),preparation:{id:'fixture-page-saved-'+i}});
   window.fixture.canonicalProgramme.rows.filter(r=>r.id.startsWith('fixture-page-')).forEach((r,i)=>{r.domain=i<2?'F4':'F7';r.startsAt=`2027-${i%2?'02':'11'}-${String(1+i%28).padStart(2,'0')}T19:00:00`;});window.fixtureBefore=JSON.stringify(window.fixture);
   const h=window.ScopeUiTestHooks;h.state.authChecking=false;h.state.needOkta=false;h.state.loading=false;h.state.session={displayName:'Test technique',roles:['ADMINISTRATEUR'],permissions:['references:manage']};h.state.referentiels.domaines=[{code:'F7',libelle:'Formation'}];
   window.navigateFixture=async hash=>{location.hash=hash;await h.onRoute();};
  });
  const checks=[],layouts=[],record=name=>checks.push(name),shot=async name=>{if(process.env.SCOPE_R33_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCOPE_R33_SCREENSHOT_DIR,name+'.png')});};
  const nav=hash=>page.evaluate(hash=>window.navigateFixture(hash),hash);
  const open=async kind=>{const menu=page.locator(`[data-qv-review-picker="${kind}"]`);if(!(await menu.evaluate(el=>el.open)))await menu.locator('summary').click();await page.waitForFunction(kind=>document.activeElement===document.querySelector(`[data-qv-review-picker="${kind}"] input[type=search]`),kind);return menu;};
  const choice=(kind,id)=>page.locator(`[data-qv-review-picker="${kind}"] [data-qv-choice="${id}"]`);
  await nav('#/quo-vadis/controle-programme');
  assert.equal(await page.locator('#qv-review-harmonisation').isVisible(),false);
  let menu=await open('types');await page.locator('#qv-review-search').fill('Activité de test 69');
  assert.equal(await choice('types','fixture-type-69').count(),1);assert.equal(await page.locator('#qv-review-search').evaluate(el=>el===document.activeElement),true);
  await choice('types','fixture-type-69').check();await page.locator('#qv-review-search').fill('Pagination de test');await choice('types','FIXTURE-PAGE').check();
  assert.deepEqual(await page.evaluate(()=>window.ScopeUiTestHooks.state.quoVadisReview.conformityIds),['fixture-type-69','FIXTURE-PAGE']);
  await page.locator('#qv-review-search').fill('');assert.equal(await page.locator('#qv-picker-types-next').isEnabled(),true);await page.locator('#qv-picker-types-next').click();assert.ok(await menu.locator('[data-qv-choice]').count()>0);
  record('immediate full-population search beyond 40 types, paginated choices, multiple selections retained across search and page');
  await page.locator('#qv-review-search').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.matches('[data-qv-choice]')),true);await page.keyboard.press('Escape');assert.equal(await menu.evaluate(el=>el.open),false);assert.equal(await menu.locator('summary').evaluate(el=>el===document.activeElement),true);await page.waitForTimeout(50);assert.equal(await menu.locator('summary').evaluate(el=>el===document.activeElement),true);
  await page.locator('#qv-check-type-conformity').click();await page.waitForSelector('[data-qv-review-open]');
  await page.locator('[data-qv-type-sort="label"]').click();assert.equal(await page.locator('[data-qv-type-sort="label"]').evaluate(el=>el.parentElement.getAttribute('aria-sort')),'descending');
  await page.locator('[data-qv-review-open]').filter({hasText:'Voir les occurrences'}).first().click();await page.waitForSelector('[data-qv-occ-sort="date"]');
  const occ=page.locator('.qv-review-occurrences');assert.deepEqual((await occ.locator('thead th').allTextContents()).map(s=>s.replace(/[▲▼]/g,'').trim()).slice(0,4),['Date','Activité','OI','Session']);
  const linksBefore=await occ.locator('tbody a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
  await page.locator('[data-qv-occ-sort="date"]').click();assert.equal(await page.locator('[data-qv-occ-sort="date"]').evaluate(el=>el.parentElement.getAttribute('aria-sort')),'descending');
  assert.notDeepEqual(await occ.locator('tbody a').evaluateAll(a=>a.map(a=>a.getAttribute('href'))),linksBefore);
  await page.locator('[id^="qv-review-occ-"][id$="-next"]').click();assert.equal(await page.locator('[data-qv-occ-sort="date"]').evaluate(el=>el.parentElement.getAttribute('aria-sort')),'descending');
  for(const key of ['activity','oi','session','conform','pending','blocking','undefined']){await page.locator(`[data-qv-occ-sort="${key}"]`).click();assert.equal(await page.locator(`[data-qv-occ-sort="${key}"]`).evaluate(el=>el.parentElement.getAttribute('aria-sort')),'ascending');}
  await page.locator('[data-qv-criteria-open]').first().click();await page.waitForSelector('.qv-review-table');assert.ok(await page.locator('.qv-review-table').count());
  await shot('controle-occurrences-1440');record('three-level control retained; date/activity/OI/session/results sort, direction toggle and pagination retain real-date order');
  await page.locator('[data-qv-result-filter="q"]').fill('Pagination');assert.equal(await page.locator('[data-qv-result-filter="q"]').evaluate(el=>el===document.activeElement),true);assert.match(await page.locator('#qv-conformity-results').innerText(),/Pagination de test/);
  await page.locator('.qv-review-occurrences tbody a').first().click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());await page.getByRole('link',{name:'Retour au contrôle du programme',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.equal(await page.locator('[data-qv-result-filter="q"]').inputValue(),'Pagination');record('immediate result search preserves caret; fiche return retains filters, sort and expanded occurrence');
  await page.locator('[data-qv-review-view="harmonisation"]').click();menu=await open('source');
  assert.ok(await menu.locator('[data-qv-choice]').count()<=25);assert.equal(await page.locator('#qv-picker-source-next').isEnabled(),true);
  await page.locator('#qv-model-search').fill('Session 60');assert.equal(await choice('source','fixture-page-59').count(),1);await choice('source','fixture-page-59').check();
  assert.match(await page.locator('#qv-model-identity').innerText(),/Pagination de test/);menu=await open('targets');assert.ok(await menu.locator('[data-qv-choice]').count()>0);assert.equal(await choice('targets','fixture-page-59').count(),0);
  assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);assert.equal(await page.locator('[data-qv-harmonisation-field="assignmentParameters"]').count(),0);record('search finds model beyond 40; choosing it immediately proposes other same-type occurrences and only fields available on source');
  await page.locator('#qv-target-search').fill('Session 1');await choice('targets','fixture-page-0').check();await page.locator('#qv-target-search').fill('Session 2');await choice('targets','fixture-page-1').check();assert.match(await page.locator('#qv-selected-targets').innerText(),/Session 1.*Session 2/);
  await page.keyboard.press('Escape');await page.locator('[data-qv-harmonisation-field="domain"]').check();assert.equal(await page.locator('#qv-preview-harmonisation').isEnabled(),true);await page.locator('#qv-preview-harmonisation').click();
  const recipients=await page.evaluate(()=>window.ScopeUiTestHooks.state.quoVadisReview.harmonisation.map(r=>r.occurrenceId));assert.deepEqual([...new Set(recipients)].sort(),['fixture-page-0','fixture-page-1']);assert.equal(await page.evaluate(()=>window.savedRequests.length),0);record('explicit individual recipients survive filtering; preview uses only selected IDs and writes nothing');
  await shot('harmonisation-1440');
  // Incompatible confirmed TP9 rule dominates an explicitly selected cross-type source.
  await open('source');await page.locator('#qv-model-search').fill('Séance Direction JSP');await choice('source','fixture-jsp').check();assert.deepEqual(await page.evaluate(()=>window.ScopeUiTestHooks.state.quoVadisReview.targetIds),[]);
  await page.locator('[data-qv-harmonisation-field="participationEvaluation"]').check();await page.locator('#qv-review-other-types').check();await open('targets');await page.locator('#qv-target-search').fill('TP9000');assert.equal(await choice('targets','fixture-tp9-0').isDisabled(),true);assert.match(await page.locator('[data-qv-review-picker="targets"] .qv-programme-choice-list').innerText(),/Incompatible/);assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);record('changing model clears recipient choices; confirmed incompatible rule disables recommendation and preview');
  await nav('#/quo-vadis/programme/fixture-tp9-0');await page.getByRole('link',{name:'Harmonisation',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.match(await page.locator('#qv-model-identity').innerText(),/Conduite TP9000/);await open('targets');assert.equal(await choice('targets','fixture-tp9-1').count(),1);assert.deepEqual(await page.evaluate(()=>window.ScopeUiTestHooks.state.quoVadisReview.targetIds),[]);record('fiche entry preselects exact saved source, suggests same-type recipients without implicit selection');
  await nav('#/quo-vadis/programme/fixture-page-0');const linked=page.locator('#qv-linked-activities');assert.deepEqual((await linked.locator('thead th').allTextContents()).map(s=>s.replace(/[▲▼]/g,'').trim()),['Date','Activité','OI','Session','Relation établie','État','Action']);
  assert.match(await linked.locator('tbody td').first().innerText(),/^0[12]\.02\.27/);await linked.locator('[data-qv-sort="date"]').click();assert.match(await linked.locator('tbody td').first().innerText(),/11\.27/);await page.locator('#qv-linked-page-next').click();assert.equal(await linked.locator('[aria-sort="descending"]').count(),1);
  for(const key of ['activity','oi','session','relation','state']){await linked.locator(`[data-qv-sort="${key}"]`).click();await linked.locator(`[data-qv-sort="${key}"]`).click();assert.equal(await linked.locator(`[data-qv-sort="${key}"]`).evaluate(el=>el.parentElement.getAttribute('aria-sort')),'descending');}
  await linked.locator('tbody a').first().click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.ok(!page.url().includes('undefined'));record('linked columns exact, six bidirectional sorts, real-date order and sort retained on paging, direct fiche links');
  await nav('#/quo-vadis/programme/fixture-tp9-0');
  const typography=[];
  for(const [search,summary] of [['qv-programme-public-search','qv-programme-public-summary'],['qv-programme-oi-search','qv-programme-oi-summary'],['qv-programme-responsable-search','qv-programme-responsable-summary'],['qv-programme-qualification-search','qv-programme-qualification-summary']]){
    const picker=page.locator('.qv-programme-choice-menu').filter({has:page.locator('#'+search)});await picker.locator('summary').click();await page.waitForFunction(id=>document.activeElement.id===id,search);
    const input=picker.locator('.qv-programme-choice-list input:not(:disabled)').first();if(await input.count()){await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.matches('.qv-programme-choice-list input')),true);assert.equal(await picker.locator('.qv-programme-choice-list label>span').first().evaluate(el=>getComputedStyle(el).fontWeight),'400');}
    typography.push(await picker.locator('summary').evaluate(el=>({height:el.getBoundingClientRect().height,font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight})));
    await page.keyboard.press('Escape');assert.equal(await picker.evaluate(el=>el.open),false);
  }
  typography.push(await page.locator('#qv-programme-cursus').evaluate(el=>({height:el.getBoundingClientRect().height,font:getComputedStyle(el).fontFamily,size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight})));
  assert.ok(typography.every(t=>t.height===40 && t.weight==='400' && t.font===typography[0].font && t.size===typography[0].size));record('Public/OI/Responsable/Spécialisation focus on open, keyboard and Escape; options normal; five controls identical 40px font and size');
  assert.equal(await page.locator('.qv-programme-reference').getAttribute('data-qv-tone'),'blue');assert.equal(await page.locator('.qv-fiche-control-notice').getAttribute('data-qv-tone'),'yellow');
  // Shared nav is rendered by all ten routes; no page-specific clone.
  const entries=await page.locator('.qv-subnav a').evaluateAll(a=>a.map(a=>({href:a.getAttribute('href'),label:a.textContent.trim()})));
  assert.equal(entries.length,10);
  for(const entry of entries){await nav(entry.href);assert.deepEqual(await page.locator('.qv-subnav a').allTextContents(),entries.map(e=>e.label));const geometry=await page.locator('.qv-subnav').evaluate(el=>[...el.querySelectorAll('a')].map(a=>({y:a.getBoundingClientRect().y,h:a.getBoundingClientRect().height,nowrap:getComputedStyle(a).whiteSpace})));assert.equal(new Set(geometry.map(r=>Math.round(r.y))).size,1);assert.ok(geometry.every(r=>r.nowrap==='nowrap'));const active=page.locator('.qv-subnav .is-active');assert.equal(await active.count(),1);assert.equal(await active.evaluate(el=>getComputedStyle(el,'::after').bottom),'0px');}
  record('all ten QV pages share one nav with intact labels on one desktop line');
  await nav('#/quo-vadis/controle-programme');
  for(const width of [1440,1024,390]){
    await page.setViewportSize({width,height:1100});
    const navFits=await page.locator('.qv-subnav').evaluate(nav=>[...nav.querySelectorAll('.qv-subnav-group>div')].every(group=>{group.scrollLeft=group.scrollWidth;const r=group.lastElementChild.getBoundingClientRect(),box=group.getBoundingClientRect(),fit=r.right<=box.right+1 && r.left>=box.left-1;group.scrollLeft=0;return fit;}));assert.ok(navFits);await page.evaluate(()=>scrollTo(0,0));await shot('navigation-'+width);
    await page.locator('[data-qv-review-view="harmonisation"]').click();await open('source');
    const metrics=await page.locator('[data-qv-review-picker="source"]').evaluate(menu=>{const pop=menu.querySelector('.qv-programme-choice-popover'),list=menu.querySelector('.qv-programme-choice-list'),r=pop.getBoundingClientRect();return {width:innerWidth,popupFits:r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1,scrolls:list.scrollHeight>list.clientHeight,listOverflow:getComputedStyle(list).overflowY,pageFits:document.documentElement.scrollWidth<=innerWidth+1};});
    assert.ok(metrics.popupFits && metrics.scrolls && metrics.pageFits);assert.equal(metrics.listOverflow,'auto');layouts.push(metrics);await shot('harmonisation-'+width);
    await page.keyboard.press('Escape');await page.locator('[data-qv-review-view="conformite"]').click();await shot('controle-'+width);
  }
  record('390/1024/1440: every nav item reachable, controls and popup fit viewport, bounded list scrolls internally, no document overflow');
  await nav('#/quo-vadis/programme/fixture-page-0');await page.locator('#qv-linked-activities').evaluate(el=>el.scrollIntoView({block:'start'}));const tableScroll=await page.locator('#qv-linked-activities .scope-table-wrap').evaluate(el=>el.scrollWidth>el.clientWidth);assert.ok(tableScroll);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await shot('activites-liees-390');const lastFits=await page.locator('#qv-linked-activities .scope-table-wrap').evaluate(el=>{el.scrollLeft=el.scrollWidth;return el.querySelector('tbody tr td:last-child').getBoundingClientRect().right<=el.getBoundingClientRect().right+1;});assert.ok(lastFits);await shot('activites-liees-actions-390');await nav('#/quo-vadis/controle-programme');
  await page.evaluate(()=>{window.MonitoringRBAC.has=()=>false;window.ScopeUiTestHooks.render();});assert.equal(await page.locator('#qv-check-type-conformity').isDisabled(),true);assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);record('existing management permissions preserved');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.fixture)===window.fixtureBefore),true);assert.equal(await page.evaluate(()=>window.savedRequests.length),0);assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.url.startsWith('http://scope-ux.test/') && ['document','image','font'].includes(r.type)));record('synthetic fixtures, published JSP witness and business history unchanged; zero saves and zero external requests');
  const result={status:'PASS_TECHNIQUE_LOCAL',scenarios:checks.length,checks,layouts,typography,externalRequests:0,productionWrites:0,interceptedSaves:0};if(process.env.SCOPE_R33_SCREENSHOT_DIR)fs.writeFileSync(path.join(process.env.SCOPE_R33_SCREENSHOT_DIR,'browser-results.json'),JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
