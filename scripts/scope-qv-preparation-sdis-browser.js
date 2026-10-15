'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const L=require('../assets/js/scope-ui-logic'),C=require('../assets/js/scope-qv-coverage');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-preparation-sdis'),url='http://127.0.0.1:4410';
const original=JSON.parse(fs.readFileSync(path.join(root,'output/qv-preparation-sdis/current.json'),'utf8'));
const prior=fs.readFileSync(path.join(root,'scripts/scope-qv-complement-browser.js'),'utf8');
// Existing local recipe credentials stay private; business requests are intercepted below.
const credentials={nip:prior.match(/nip:'([^']+)'/)[1],password:prior.match(/password:'([^']+)'/)[1]};
const {hooks}=createCatalogUiHarness();
function attach(qv){qv.preparationControls=C.preparationControls(qv.canonicalProgramme.rows.filter(L.qvProgrammeIsActive));
  for(const row of qv.canonicalProgramme.rows) row.preparationControls=qv.preparationControls.filter(item=>C.preparationControlAffects(item,row.id));}
async function run(){
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],checks=[],pdfRequests=[];let payload=structuredClone(original),blockedWrites=0;
  try{
    for(const viewport of [{width:1440,height:1100},{width:1366,height:768}]){
      const context=await browser.newContext({viewport});
      assert.equal((await context.request.post(url+'/auth/login',{data:credentials})).status(),200);
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const request=route.request(),target=new URL(request.url());
        if(target.origin!==url) return route.abort();
        if(target.pathname.startsWith('/api/scope/') && request.method()!=='GET'){
          const body=request.postDataJSON();
          if(body?.rows && body?.meta) pdfRequests.push(body);else blockedWrites++;
          return route.fulfill({status:503,contentType:'application/json',body:'{"error":"intercepted","message":"Recette isolée sans écriture."}'});
        }
        if(/^\/api\/scope\/quo-vadis\/programmes\/202[78]$/.test(target.pathname))
          return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:payload})});
        if(['/assets/js/scope-ui.js','/assets/js/scope-ui-logic.js','/assets/js/scope-qv-coverage.js','/assets/js/scope-auth-idle.js','/assets/js/scope-api.js','/assets/css/scope.css'].includes(target.pathname))
          return route.fulfill({contentType:target.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,target.pathname.slice(1)),'utf8')});
        return route.continue();
      });
      const go=async(hash,selector)=>{await page.goto(url+'/scope.html#/'+hash);await page.reload();await page.locator(selector).waitFor({timeout:60000});};
      const fiche=async id=>go('quo-vadis/programme/'+encodeURIComponent(id),'#qv-programme-date');
      payload=structuredClone(original);
      const critical=payload.preparationControls.find(item=>item.days===-28 && item.oi==='DAP:Y1'),keys=[];
      for(const id of [critical.exerciseId,critical.courseId]){
        await fiche(id);const anomaly=page.locator('#qv-programme-live-controls [data-qv-preparation-key]');
        assert.equal(await anomaly.count(),1);keys.push(await anomaly.getAttribute('data-qv-preparation-key'));
        const text=await anomaly.textContent();assert.ok(text.includes('-28 jours') && text.includes('minimum 14 jours'));
        if(id===critical.courseId) assert.ok(text.includes('Ce cours de cadres est programmé après'));
        await anomaly.screenshot({path:path.join(out,`${id===critical.courseId?'course':'exercise'}-critical-${viewport.width}.png`)});
      }
      assert.equal(keys[0],keys[1]);
      await page.locator('#qv-programme-date').fill('11.03.2027');
      const changed=page.locator('#qv-programme-live-controls [data-qv-preparation-key]');
      assert.ok((await changed.textContent()).includes('-29 jours'));assert.ok((await changed.textContent()).includes('non enregistrées'));
      assert.notEqual(await changed.getAttribute('data-qv-preparation-key'),keys[0]);
      await changed.screenshot({path:path.join(out,`course-unsaved-${viewport.width}.png`)});
      await page.locator('#qv-programme-date').fill('20.01.2027');assert.equal(await changed.count(),0);
      const dap=payload.preparationControls.find(item=>item.groupId==='DAP-GROUP-1');
      await fiche(dap.courseId);assert.equal(await page.locator('[data-qv-preparation-key]').count(),0);
      const groupCourse=payload.canonicalProgramme.rows.find(row=>row.id===dap.courseId);
      groupCourse.startsAt='2027-05-01T19:00';groupCourse.endsAt='2027-05-01T21:30';attach(payload);
      const groupKeys=[];
      for(const id of [...dap.exerciseIds,dap.courseId]){
        await fiche(id);const alert=page.locator('#qv-programme-live-controls [data-qv-preparation-key]');
        assert.equal(await alert.count(),1);groupKeys.push(await alert.getAttribute('data-qv-preparation-key'));
      }
      assert.equal(new Set(groupKeys).size,1);
      payload=structuredClone(original);
      await go('quo-vadis/programme','#qv-filter-oi');
      const filters=[];
      for(const oi of ['DAP:Y1','DPS:G1','JSP:C1','SDIS']){
        await page.locator('#qv-filter-oi').selectOption(oi);await page.locator('#qv-programme-page-size').selectOption('all');
        const expected=hooks.filterQuoVadisProgrammeRows(payload,{oi}).map(row=>row.id).sort();
        const ids=await page.locator('.qv-programme-table tbody a.qv-programme-action').evaluateAll(nodes=>nodes.map(a=>decodeURIComponent(a.hash.split('/programme/')[1].split('?')[0])));
        assert.deepEqual(ids.sort(),expected);assert.equal(ids.length,new Set(ids).size);filters.push({oi,count:ids.length});
      }
      await page.locator('#qv-filter-oi').selectOption('DAP:Y1');
      await page.locator('.qv-statcom-menu summary').click();await page.locator('[data-qv-statcom="013Y1"]').click();
      assert.equal(await page.locator('.qv-programme-table tbody tr').count(),hooks.filterQuoVadisProgrammeRows(payload,{oi:'DAP:Y1',statcom:'013Y1'}).length);
      await page.locator('.qv-statcom-menu summary').click();await page.locator('[data-qv-statcom="tous"]').click();
      const sdis=payload.canonicalProgramme.rows.filter(L.qvProgrammeIsActive).find(row=>L.qvProgrammeConfirmedOiCodes(row).includes('SDIS') && row.startsAt?.startsWith('2027-') && row.definitionId!=='CTA-PERMANENCE');
      assert.ok(sdis);const month=sdis.startsAt.slice(0,7),date=sdis.startsAt.slice(0,10),title=sdis.activityLabel || sdis.label || sdis.title;
      const calendars=[];
      for(const oi of ['DAP:Y1','DPS:G1','JSP:C1']){
        await go('quo-vadis/agenda-annuel?annee=2027','#qv-agenda-oi');await page.locator('#qv-agenda-oi').selectOption(oi);
        const day=page.locator(`.qv-year-grid a[href*="jour=${date}"]`);assert.equal(await day.count(),1);
        assert.ok((await day.getAttribute('aria-label')).includes(title));
        const projection=await page.locator('.qv-agenda-projection > div').first().locator('strong').textContent();
        assert.equal(Number(projection),hooks.filterQuoVadisProgrammeRows(payload,{oi}).length);
        if(oi==='DAP:Y1'){
          await page.screenshot({path:path.join(out,`annual-y1-${viewport.width}.png`),fullPage:true});
          const downloading=page.waitForEvent('download');await page.locator('#qv-export-programme-excel').click();
          const download=await downloading;await download.saveAs(path.join(out,'browser-y1.csv'));
          const model=hooks.quoVadisProgrammeExport(payload,{oi});
          assert.equal(fs.readFileSync(path.join(out,'browser-y1.csv'),'utf8'),hooks.quoVadisProgrammeCsvText(model.rows));
          await page.locator('#qv-export-programme-pdf').click();await page.waitForResponse(response=>response.request().method()==='POST');
          assert.deepEqual(pdfRequests.at(-1).rows,JSON.parse(JSON.stringify(model.rows)));
          const close=page.getByRole('button',{name:'Fermer la notification',exact:true});if(await close.isVisible()) await close.click();
        }
        await day.click();await page.locator('.qv-programme-monthly').waitFor();
        assert.equal(await page.locator('#qv-filter-oi').inputValue(),oi);
        assert.ok((await page.locator('.qv-programme-monthly').textContent()).includes(title));
        const actual=await page.locator('.qv-programme-month-table tbody a.qv-programme-action').evaluateAll(nodes=>nodes.map(a=>decodeURIComponent(a.hash.split('/programme/')[1].split('?')[0])));
        assert.ok(actual.includes(sdis.id));assert.equal(new Set(actual).size,actual.length);
        if(oi==='DAP:Y1') await page.screenshot({path:path.join(out,`monthly-y1-${viewport.width}.png`),fullPage:true});
        calendars.push({oi,month,date,sdisEventVisible:true,organizer:'SDIS',noDuplicates:true});
      }
      checks.push({viewport,bidirectionalSameKey:true,liveUnsavedDate:true,oneGroupedControl:true,filters,calendars,pdfAndCsvSameSelection:true});
      await context.close();
    }
    assert.deepEqual(errors,[]);assert.equal(blockedWrites,0);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',checks,errors,businessWrites:0,
      isolatedAssetsAndProjection:true,liveMoaTransactionUntouched:true,engine:'Chrome / Playwright',safari:'Non testé (runtime WebKit absent)'},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',viewports:checks.length,errors,businessWrites:0}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
