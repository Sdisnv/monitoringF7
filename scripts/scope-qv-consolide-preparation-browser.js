'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const L=require('../assets/js/scope-ui-logic'),C=require('../assets/js/scope-qv-coverage');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-consolide-preparation'),url='http://127.0.0.1:4410';
const original=JSON.parse(fs.readFileSync(path.join(root,'output/qv-consolide/current.json'),'utf8'));
const previousRecipe=fs.readFileSync(path.join(root,'scripts/scope-qv-complement-browser.js'),'utf8');
// Reuse the existing local recipe procedure; do not expose credentials in reports or logs.
const credentials={nip:previousRecipe.match(/nip:'([^']+)'/)[1],password:previousRecipe.match(/password:'([^']+)'/)[1]};
async function run(){
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],saves=[],checks=[],calendars=[];let payload=structuredClone(original);
  try{
    for(const viewport of [{width:1440,height:1100},{width:1366,height:768}]){
      const context=await browser.newContext({viewport});
      assert.equal((await context.request.post(url+'/auth/login',{data:credentials})).status(),200);
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const request=route.request(),target=new URL(request.url());
        if(target.origin!==url) return route.abort();
        if(target.pathname.startsWith('/api/scope/') && request.method()!=='GET'){
          saves.push(request.postDataJSON());return route.fulfill({status:503,contentType:'application/json',body:'{"error":"intercepted","message":"Recette sans écriture."}'});
        }
        if(/^\/api\/scope\/quo-vadis\/programmes\/202[78]$/.test(target.pathname)) return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:payload})});
        if(['/assets/js/scope-ui.js','/assets/js/scope-ui-logic.js','/assets/js/scope-qv-coverage.js','/assets/js/scope-auth-idle.js','/assets/js/scope-api.js','/assets/css/scope.css'].includes(target.pathname))
          return route.fulfill({contentType:target.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,target.pathname.slice(1)),'utf8')});
        return route.continue();
      });
      const id='QV27:DAP-GROUP:1.1';
      const go=async(year=2027)=>{await page.goto(url+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id)+(year===2027?'':'?annee='+year));await page.reload();await page.locator('#qv-programme-date').waitFor({timeout:60000});};
      payload=structuredClone(original);await go();
      assert.equal(await page.locator('[data-qv-proposed-date]').count(),0);
      const raw=await page.locator('#qv-programme-date').inputValue();assert.equal(raw,'21.04.2027');
      for(const [value,year,month,selected] of [['24.03.2027',2027,'2027-03','2027-03-24'],['06.11.2027',2027,'2027-11','2027-11-06'],
        ['',2027,'2027-01',null],['',2028,'2028-01',null],['10.01.2028',2027,'2028-01','2028-01-10']]){
        if(payload.programme.annee!==year){payload=structuredClone(original);payload.programme.annee=year;await go(year);}
        await page.locator('#qv-programme-date').fill(value);const writesBefore=saves.length;
        await page.locator('#qv-programme-date-picker').click();const calendar=page.locator('#qv-programme-calendar');
        assert.equal(await calendar.getAttribute('data-month'),month);
        const selectedDay=calendar.locator('[aria-current="date"]');
        assert.equal(await selectedDay.count()?await selectedDay.getAttribute('data-qv-calendar-date'):null,selected);
        assert.equal(await page.locator('#qv-programme-date').inputValue(),value);assert.equal(saves.length,writesBefore);
        await calendar.getByRole('button',{name:'Mois suivant',exact:true}).click();
        await page.locator('#qv-programme-date-picker').click();await page.locator('#qv-programme-date-picker').click();
        assert.equal(await calendar.getAttribute('data-month'),month);
        await calendar.screenshot({path:path.join(out,`calendar-${viewport.width}-${year}-${month}-${selected?'dated':'empty'}.png`)});
        await page.locator('#qv-programme-date-picker').click();calendars.push({viewport,value,year,month,selected,noAutomaticSave:true});
      }
      payload=structuredClone(original);const row=payload.canonicalProgramme.rows.find(item=>item.id===id);
      row.responsibleSelections=[{kind:'FREE',label:'Chef section DAP'},{kind:'REFERENCE',code:'C scrt',label:'C sct'},{kind:'REFERENCE',code:'C for',label:'C for'}];
      row.publics=[];row.publicFreeLabels=[];await go();await page.reload();await page.locator('#qv-programme-date').waitFor();
      const open=async(name)=>page.locator('.qv-programme-choice-field').filter({has:page.locator('#qv-programme-'+name)}).locator('summary').click();
      await open('responsable');
      const labels=await page.locator('#qv-programme-responsable label span').allTextContents();
      assert.equal(labels.filter(label=>label==='Chef section').length,1);assert.equal(labels.includes('Chef section DAP'),false);
      assert.equal(await page.locator('#qv-programme-responsable input[value="C scrt"]').isChecked(),true);
      await page.locator('#qv-programme-responsable input[value="QM"]').check();await open('responsable');
      await open('public');const fields=page.locator('#qv-programme-public');
      const echelonLabels=await fields.locator('fieldset').filter({has:page.locator('legend').filter({hasText:/^Échelons$/})}).locator('label span').allTextContents();
      assert.deepEqual(echelonLabels,['Échelon 0','Échelon I','Échelon II','Échelon III','Échelon IV']);
      await fields.locator('input[value="ECH:0"]').check();await fields.locator('input[value="ECH:I"]').check();
      assert.equal(await page.locator('#qv-programme-public-summary').textContent(),'Échelon 0 et I');
      const auto=await fields.locator('fieldset').filter({has:page.locator('legend').filter({hasText:/^AUTO$/})}).locator('label span').allTextContents();
      assert.equal(auto.indexOf('Candidat machiniste EA'),auto.indexOf('Machiniste EA')+1);await open('public');
      await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>document.querySelector('#qv-programme-save')?.disabled===false);
      const body=saves.at(-1);assert.deepEqual(body.publicCodes,['ECH:0','ECH:I']);
      for(const selection of row.responsibleSelections) assert.ok(body.responsibleSelections.some(item=>JSON.stringify(item)===JSON.stringify(selection)));
      assert.ok(body.responsibleSelections.some(item=>item.code==='QM'));
      if(await page.getByRole('button',{name:'Fermer la notification',exact:true}).isVisible()) await page.getByRole('button',{name:'Fermer la notification',exact:true}).click();
      // Date-only approval must not approve other business fields.
      row.businessValidation=null;row.dateDecision={value:'2027-04-21',validatedAt:'2026-10-15T08:41:45.137Z',source:'BUSINESS_VALIDATION'};
      await page.reload();await page.locator('#qv-programme-date').waitFor();assert.equal(await page.locator('[data-qv-proposed-date]').count(),0);
      assert.ok((await page.locator('#qv-programme-live-controls').textContent()).includes('Horaires, thème, public et responsable à confirmer'));
      row.dateDecision=null;row.status='PLANIFIE';await page.reload();await page.locator('#qv-programme-date').waitFor();
      assert.ok(await page.locator('[data-qv-proposed-date]').count()>0);
      const exercise=payload.canonicalProgramme.rows.find(item=>item.definitionId===C.PREPARATION_PAIRS[0][0] && item.statCom==='013Y1');
      const course=payload.canonicalProgramme.rows.find(item=>item.definitionId===C.PREPARATION_PAIRS[0][1] && item.statCom==='013Y1');
      exercise.startsAt='2027-02-10T19:00';course.startsAt='2027-03-10T19:00';course.endsAt='2027-03-10T21:00';
      payload.preparationControls=C.preparationControls(payload.canonicalProgramme.rows);
      for(const item of payload.canonicalProgramme.rows) item.preparationControls=payload.preparationControls.filter(control=>[control.exerciseId,control.courseId].includes(item.id));
      await page.goto(url+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(exercise.id));await page.locator('#qv-programme-date').waitFor();await page.reload();await page.locator('#qv-programme-date').waitFor();
      const text=await page.locator('#qv-programme-live-controls').textContent();assert.ok(text.includes('alerte critique'));assert.ok(text.includes('-28 jours'));
      await page.locator('#qv-programme-live-controls').screenshot({path:path.join(out,`preparation-critical-${viewport.width}.png`)});
      await page.locator('#qv-programme-date').fill('01.04.2027');
      assert.ok(!(await page.locator('#qv-programme-live-controls').textContent()).includes('alerte critique'));
      checks.push({viewport,publicOrderAndSummary:true,responsibleHistoricalValuesPreserved:true,obsoleteDateOnlyHidden:true,plannedAloneNotValidated:true,criticalAlertAndLiveUpdate:true});
      await context.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',engine:'Chrome / Playwright',checks,calendars,errors,
      savesIntercepted:saves.length,businessServerWrites:0,mode:'existing recipe with isolated assets and projection; live MOA transaction untouched',
      safari:'Not tested: no WebKit/Safari runtime verified; existing custom calendar, no native picker substitution'},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',viewports:checks.length,calendarCases:calendars.length,savesIntercepted:saves.length,businessWrites:0}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
