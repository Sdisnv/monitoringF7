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
   window.fixtureBefore=JSON.stringify(window.fixture);
   const h=window.ScopeUiTestHooks;h.state.authChecking=false;h.state.needOkta=false;h.state.loading=false;h.state.session={displayName:'Test technique',roles:['ADMINISTRATEUR'],permissions:['references:manage']};h.state.referentiels.domaines=[{code:'F7',libelle:'Formation'}];
   window.navigateFixture=async hash=>{location.hash=hash;await h.onRoute();};
  });
  const TP9='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21',checks=[];
  const record=name=>checks.push(name),shot=async name=>{if(process.env.SCOPE_ACCEL_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCOPE_ACCEL_SCREENSHOT_DIR,name+'.png')});};
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/controle-programme'));
  assert.equal(await page.locator('.qv-workspace #qv-programme-review').count(),1);
  assert.equal(await page.locator('#qv-review-harmonisation').isVisible(),false);assert.equal(await page.locator('[data-qv-review-view="conformite"]').getAttribute('aria-pressed'),'true');
  assert.ok(await page.locator('#qv-conformity-types option').count()<=40);record('default conformity, exclusive operational view, bounded type choices');
  assert.equal(await page.locator('#qv-annual-review-content').innerText(),'');assert.match(await page.locator('.qv-annual-review').innerText(),/6 blocage\(s\) démontré\(s\) · 1 point\(s\) à contrôler · 5 occurrence/);
  assert.ok(!(await page.locator('.qv-annual-review').innerText()).includes('thème absent'));record('compact annual overview counts provided points and distinct identified occurrences');
  await page.locator('#qv-annual-review-details summary').click();await page.waitForSelector('#qv-annual-review-content a');
  assert.match(await page.locator('#qv-annual-review-content').innerText(),/Rattachement à une occurrence non établi/);
  const annualLink=page.locator('#qv-annual-review-content a').first();assert.match(await annualLink.getAttribute('href'),/from=controle-programme/);
  await annualLink.click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());await page.getByRole('link',{name:'Retour au contrôle du programme',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.equal(await page.locator('#qv-annual-review-details').getAttribute('open'),'');await page.locator('#qv-annual-review-details summary').click();record('annual details on demand, known identities linked, globals unlinked');
  // Search reveals an exact type among bounded results.
  await page.locator('#qv-review-search').fill('TP9000');await page.locator('#qv-review-filter').click();await page.locator('#qv-conformity-types').selectOption(TP9);await page.locator('#qv-check-type-conformity').click();
  let cells=await page.locator('#qv-conformity-results .qv-review-summary tbody tr').first().locator('td').allTextContents();assert.deepEqual(cells.slice(0,5),['4','8','0','0','16']);
  assert.equal(await page.locator('[data-qv-criteria]').count(),0);assert.equal(await page.locator('.qv-review-table tbody tr').count(),0);record('type summary distinct from occurrences and criteria, no eager detailed rows');
  await page.locator('[data-qv-review-open]').first().click();await page.waitForSelector('[data-qv-criteria]');assert.equal(await page.locator('[data-qv-criteria]').count(),4);
  assert.equal(await page.locator('.qv-review-table tbody tr').count(),0);await page.locator('[data-qv-criteria-open]').first().click();await page.waitForSelector('.qv-review-table tbody tr');assert.equal(await page.locator('.qv-review-table tbody tr').count(),6);record('three deliberate levels: type, occurrence, criterion');
  await page.locator('#qv-conformity-results [data-qv-review-group]').first().evaluate(el=>el.scrollIntoView({block:'start'}));await shot('occurrences-1440');await page.locator('#qv-programme-review').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('controle-1440');
  const result=page.locator('#qv-conformity-results');
  await result.locator('[data-qv-result-filter="from"]').fill('2027-04-01');await result.locator('[data-qv-result-filter="to"]').fill('2027-04-30');await result.locator('[data-qv-result-filter="oi"]').selectOption('DPS:C1');await result.locator('[data-qv-result-filter="session"]').selectOption('Session 4');await result.locator('[data-qv-result-filter="state"]').selectOption('undefined');await result.locator('[data-qv-result-apply]').click();
  cells=await result.locator('.qv-review-summary tbody tr').first().locator('td').allTextContents();assert.deepEqual(cells.slice(0,5),['1','0','0','0','4']);record('real date range, OI, session and criterion state filters with exact counts');
  // Save current search, filters, type and expanded rows through fiche navigation.
  await result.locator('[data-qv-review-open]').first().click();const consult=result.getByRole('link',{name:'Consulter la fiche',exact:true}).first();await consult.click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());
  assert.match(page.url(),/fixture-tp9-3/);await page.getByRole('link',{name:'Retour au contrôle du programme',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());
  assert.equal(await page.locator('#qv-review-search').inputValue(),'TP9000');assert.deepEqual(await page.locator('#qv-conformity-types').inputValue(),TP9);assert.equal(await result.locator('[data-qv-result-filter="session"]').inputValue(),'Session 4');assert.equal(await result.getByRole('link',{name:'Consulter la fiche',exact:true}).count(),1);record('return to control restores selected type, result filters and occurrence expansion');
  await page.locator('[data-qv-review-view="harmonisation"]').click();assert.equal(await page.locator('#qv-review-harmonisation').isVisible(),true);assert.equal(await page.locator('#qv-conformity-results').isVisible(),false);
  await page.locator('.qv-subnav a').filter({hasText:'Contrôle du programme'}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.equal(await page.locator('[data-qv-review-view="conformite"]').getAttribute('aria-pressed'),'true');assert.equal(await result.locator('[data-qv-result-filter="session"]').inputValue(),'Session 4');record('exclusive modes preserve each other’s context');
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme/fixture-jsp'));
  assert.equal(await page.getByRole('link',{name:'Harmonisation',exact:true}).count(),1);assert.equal(await page.getByRole('link',{name:'Harmoniser à partir de cette fiche'}).count(),0);
  await page.getByRole('link',{name:'Harmonisation',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());
  assert.equal(await page.locator('#qv-review-harmonisation').isVisible(),true);assert.equal(await page.locator('#qv-harmonisation-source').inputValue(),'fixture-jsp');assert.match(await page.locator('#qv-model-identity').innerText(),/18\.02\.27/);assert.equal(await page.evaluate(()=>window.savedRequests.length),0);await page.locator('#qv-programme-review').evaluate(el=>el.scrollIntoView({block:'start'}));await shot('harmonisation-1440');record('top secondary harmonisation opens exact same route with saved explicit source and no action');
  await page.locator('#qv-harmonisation-types').selectOption(TP9);await page.locator('[data-qv-harmonisation-field="participationEvaluation"]').check();await page.locator('#qv-preview-harmonisation').click();
  await page.locator('#qv-harmonisation-results [data-qv-review-open]').click();await page.waitForSelector('#qv-harmonisation-results [data-qv-criteria-open]');await page.locator('#qv-harmonisation-results [data-qv-criteria-open]').first().click();await page.waitForSelector('#qv-harmonisation-results .qv-review-table');assert.match(await page.locator('#qv-harmonisation-results .qv-review-table').innerText(),/Reprise incompatible/);
  await page.locator('#qv-harmonisation-source').selectOption('fixture-tp9-0');assert.equal(await page.locator('#qv-harmonisation-results').innerText(),'');record('same incompatible harmonisation preview and invalidation on model change');
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme/fixture-tp9-0'));
  assert.equal(await page.locator('.qv-programme-reference').getAttribute('data-qv-tone'),'blue');assert.equal(await page.locator('.qv-fiche-control-notice').getAttribute('data-qv-tone'),'yellow');
  const button=page.getByRole('button',{name:'Voir la règle complète',exact:true});await button.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#qv-programme-full-rule').innerText(),'Masquer la règle');assert.equal(await page.locator('#qv-programme-full-rule').getAttribute('aria-expanded'),'true');await page.keyboard.press('Enter');assert.equal(await page.locator('#qv-programme-full-rule').innerText(),'Voir la règle complète');assert.equal(await page.locator('.qv-programme-reference-chevron').count(),0);record('blue informational rule and separate truthful alert, keyboard toggle and both labels, no arrow');
  const linked=page.locator('#qv-linked-activities');assert.match(await linked.innerText(),/Cours préparatoire lié/);const relatedLink=linked.getByRole('link',{name:'Consulter la fiche',exact:true}).first();
  await relatedLink.click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.ok(!page.url().includes('undefined'));record('linked activities use existing same-type and explicit preparatory relations with working direct links');
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme/fixture-tp9-0'));await page.locator('.qv-programme-reference').scrollIntoViewIfNeeded();await shot('fiche-1440');
  const normal=await page.locator('.qv-business-conditions dd').first().evaluate(el=>getComputedStyle(el).fontWeight);assert.equal(normal,'400');assert.equal(await page.locator('.qv-programme-info-panel dd').first().evaluate(el=>getComputedStyle(el).fontWeight),'400');assert.equal(await page.locator('#qv-programme-family').evaluate(el=>getComputedStyle(el).fontWeight),'400');assert.equal(await page.locator('#qv-programme-participation-evaluation').count(),1);record('ordinary fiche values use normal typography, existing workflow fields retained');
  await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>window.savedRequests.length===1);const saved=await page.evaluate(()=>window.savedRequests[0]);assert.equal(Object.hasOwn(saved.payload,'assignmentParameters'),false);assert.equal(Object.hasOwn(saved.payload,'participationEvaluation'),false);await page.getByRole('button',{name:'Fermer la notification'}).click();record('existing save payload preserves untouched assignment and evaluation parameters');
  // Shared messages retain semantics and closing actions across kinds; colors reuse DS tokens.
  const tones={};
  for(const kind of ['info','success','warning','error']){
   await page.evaluate(kind=>window.ScopeFeedback.notify(kind,'Titre technique','Contenu technique',{preserveForm:true}),kind);
   tones[kind]=await page.locator('.scope-notification-card').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,text:getComputedStyle(el).color,weight:getComputedStyle(el.querySelector('p')).fontWeight}));
   assert.equal(tones[kind].weight,'400');assert.equal(await page.locator('#scope-notification-host').getAttribute('role'),kind==='error'?'alert':'status');await page.getByRole('button',{name:'Fermer la notification'}).click();
  }
  await page.evaluate(()=>{window.confirmationExecuted=0;window.ScopeFeedback.confirm({title:'Confirmation technique',message:'Aucune action sans confirmation.',tone:'error'},()=>window.confirmationExecuted++);});
  assert.equal(await page.locator('.scope-feedback-card').evaluate(el=>getComputedStyle(el).backgroundColor),tones.error.bg);
  await page.getByRole('button',{name:'Annuler',exact:true}).click();assert.equal(await page.evaluate(()=>window.confirmationExecuted),0);record('shared confirmation dialog retains explicit error tone and cancel action');
  assert.deepEqual(tones.info,tones.success);assert.notEqual(tones.info.bg,tones.warning.bg);assert.notEqual(tones.warning.bg,tones.error.bg);record('shared notifications: blue info/success, yellow warning, red error; semantic roles and dismissal retained');
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/controle-programme'));
  await page.locator('#qv-review-search').fill('Pagination de test');await page.locator('#qv-review-filter').click();await page.locator('#qv-conformity-types').selectOption('FIXTURE-PAGE');await page.locator('#qv-check-type-conformity').click();await page.locator('#qv-conformity-results [data-qv-result-reset]').click();
  await page.locator('#qv-conformity-results [data-qv-review-open]').click();await page.waitForSelector('#qv-conformity-results [data-qv-criteria]');assert.equal(await page.locator('#qv-conformity-results [data-qv-criteria]').count(),25);
  await page.locator('#qv-review-occ-conformite-0-next').click();assert.equal(await page.locator('#qv-conformity-results [data-qv-criteria]').count(),25);await page.locator('#qv-review-occ-conformite-0-next').click();assert.equal(await page.locator('#qv-conformity-results [data-qv-criteria]').count(),10);record('60 occurrences remain paginated 25/25/10 without eager criterion tables');
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/programme/fixture-page-0'));assert.equal(await page.locator('#qv-linked-activities tbody tr').count(),25);await page.locator('#qv-linked-page-next').click();assert.equal(await page.locator('#qv-linked-activities tbody tr').count(),25);await page.locator('#qv-linked-page-next').click();assert.equal(await page.locator('#qv-linked-activities tbody tr').count(),9);record('59 explicit related records remain paginated 25/25/9');
  await page.evaluate(()=>{const h=window.ScopeUiTestHooks;h.state.quoVadisYears={2028:{...window.fixture,programme:{annee:2028,statut:'PREPARATION'}}};return window.navigateFixture('#/quo-vadis/controle-programme?annee=2028');});
  await page.locator('#qv-annual-review-details summary').click();await page.waitForSelector('#qv-annual-review-content a');await page.locator('#qv-annual-review-content a').first().click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.match(page.url(),/annee=2028/);await page.getByRole('link',{name:'Retour au contrôle du programme',exact:true}).click();await page.evaluate(()=>window.ScopeUiTestHooks.onRoute());assert.match(page.url(),/annee=2028/);record('year 2028 retained through existing fiche routes and control return');
  await page.evaluate(()=>window.navigateFixture('#/quo-vadis/controle-programme'));const layouts=[];
  for(const width of [1440,1024,390]){
   await page.setViewportSize({width,height:1100});await page.locator('#qv-programme-review').evaluate(el=>el.scrollIntoView({block:'start'}));
   const layout=await page.locator('#qv-programme-review').evaluate(panel=>({width:innerWidth,panelFits:panel.getBoundingClientRect().left>=0 && panel.getBoundingClientRect().right<=innerWidth+1,fieldsOverlap:[...panel.querySelectorAll('.qv-review-field')].filter(el=>el.offsetParent && el.querySelector('span').getBoundingClientRect().bottom>el.querySelector('input,select').getBoundingClientRect().top+1).length,linksFit:[...panel.querySelectorAll('.qv-annual-review>a')].every(a=>a.getBoundingClientRect().right<=innerWidth+1),modesFit:[...panel.querySelectorAll('[data-qv-review-view]')].every(button=>{const a=button.getBoundingClientRect(),b=button.parentElement.getBoundingClientRect();return a.top>=b.top && a.bottom<=b.bottom && a.right<=b.right && a.height>=24;})}));assert.ok(layout.panelFits && layout.linksFit && layout.modesFit);assert.equal(layout.fieldsOverlap,0);layouts.push(layout);if(width===390)await shot('controle-390');
  }
  record('1440/1024/390 responsive widths without measured field overlap or panel/link overflow');
  await page.evaluate(()=>{window.MonitoringRBAC.has=()=>false;window.ScopeUiTestHooks.render();});assert.equal(await page.locator('#qv-check-type-conformity').isDisabled(),true);assert.equal(await page.locator('#qv-preview-harmonisation').isDisabled(),true);record('existing management permissions preserved');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.fixture)===window.fixtureBefore),true);assert.equal(await page.evaluate(()=>window.savedRequests.length),1);assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.url.startsWith('http://scope-ux.test/') && ['document','image','font'].includes(r.type)));record('fixtures and protected witness unchanged, no external network or production writes');
  process.stdout.write(JSON.stringify({status:'PASS_TECHNIQUE_LOCAL',scenarios:checks.length,checks,layouts,tones,externalRequests:0,productionWrites:0,interceptedSaves:1},null,2)+'\n');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
