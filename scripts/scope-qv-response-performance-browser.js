'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const mode=process.argv[2] || 'after',base='http://127.0.0.1:4410';
const directory=path.resolve(__dirname,`../docs/captures/qv-response-performance-20261013/browser-${mode}`);
async function run() {
  assert.ok(['before','after'].includes(mode));fs.mkdirSync(directory,{recursive:true});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],requests=[],pending=[],timings={};
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{
      if(!response.url().includes('/api/scope/')) return;
      pending.push((async()=>{const body=await response.body(),request=response.request(),timing=request.timing();
        requests.push({path:new URL(response.url()).pathname,status:response.status(),method:request.method(),
          durationMs:timing.responseEnd>=0?timing.responseEnd:timing.responseStart,
          decodedBytes:body.length,encoding:response.headers()['content-encoding'] || 'identity',
          ...(response.status()>=400?{error:JSON.parse(body.toString())}:{})});})());
    });
    assert.equal((await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).status(),401);
    const config=await (await context.request.get(base+'/auth/config')).json();assert.deepEqual(config.methods,['local']);
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    const homeStart=performance.now();await page.goto(base+'/scope.html#/accueil');
    await page.locator('.scope-activity-board').waitFor({timeout:60000});
    timings.homeReadyMs=performance.now()-homeStart;
    await page.screenshot({path:path.join(directory,'home.png')});
    const homeResources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(row=>row.name.includes('/api/')).map(row=>({
      path:new URL(row.name).pathname,durationMs:row.duration,encodedBytes:row.encodedBodySize,decodedBytes:row.decodedBodySize})));
    assert.equal(homeResources.filter(row=>row.path.includes('/quo-vadis/')).length,0);
    const programmeStart=performance.now();await page.goto(base+'/scope.html#/quo-vadis/programme');
    if(mode==='before') {
      await page.locator('.scope-state-error').filter({hasText:/payload size/}).waitFor({timeout:60000});
      timings.programmeErrorMs=performance.now()-programmeStart;
      await page.screenshot({path:path.join(directory,'programme-oversize.png')});
      assert.equal(await page.locator('#qv-filter-q').count(),0);
    } else {
      await page.locator('#qv-filter-q').waitFor({timeout:60000});timings.programmeReadyMs=performance.now()-programmeStart;
      assert.ok(await page.locator('.qv-programme-table tbody tr').count()>0);
      await page.screenshot({path:path.join(directory,'programme.png')});
      const programmeData=await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json();
      assert.equal(programmeData.quoVadis.canonicalProgramme.rows.length,933);
      const candidates=programmeData.quoVadis.canonicalProgramme.rows;
      timings.browserJsonParse=await page.evaluate(async()=>{
        const response=await fetch('/api/scope/quo-vadis/programmes/2027');const text=await response.text();
        const start=performance.now(),value=JSON.parse(text);
        return {ms:performance.now()-start,rows:value.quoVadis.canonicalProgramme.rows.length};
      });
      const row=candidates.find(row=>/^Exercice PR 1\.3$/.test(row.activityLabel || row.label));assert.ok(row);
      const searchStart=performance.now();await page.locator('#qv-filter-q').fill('Exercice PR 1.3');
      await page.locator(`.qv-programme-table a[href*="${encodeURIComponent(row.id)}"]`).waitFor();
      timings.searchReadyMs=performance.now()-searchStart;
      await page.screenshot({path:path.join(directory,'programme-search.png')});
      await page.locator('#qv-filter-q').fill('');await page.waitForTimeout(250);
      await page.locator('#qv-filter-domain').selectOption('F7');
      await page.locator('.qv-programme-table tbody tr').first().waitFor();
      const count=await page.locator('.qv-programme-table tbody tr').count();assert.ok(count>0);
      await page.locator('#qv-filter-domain').selectOption('tous');
      await page.locator('#qv-filter-family').selectOption('DAP');
      const filtered=await page.locator('.qv-programme-table tbody tr').allTextContents();
      assert.ok(filtered.length>0 && filtered.every(text=>text.includes('DAP')));
      await page.locator('#qv-filter-family').selectOption('tous');
      const ficheStart=performance.now();await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(row.id));
      await page.locator('#qv-programme-save').waitFor();timings.programmeFicheReadyMs=performance.now()-ficheStart;
      assert.equal(await page.locator('#qv-programme-activity').inputValue(),'Exercice PR 1.3');
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),row.statCom);
      const history=page.waitForResponse(response=>response.url().includes('/history') && response.status()===200);
      await page.locator('#qv-programme-history summary').click();await history;
      await page.screenshot({path:path.join(directory,'programme-fiche-history.png')});
      const publication=candidates.find(item=>item.publishedEventId && /^Exercice JSP 1$/.test(item.activityLabel || item.label));assert.ok(publication);
      const eventStart=performance.now();await page.goto(base+'/scope.html#/exercices/'+publication.publishedEventId);
      await page.locator('.scope-event-fiche').waitFor({timeout:60000});timings.publishedFicheReadyMs=performance.now()-eventStart;
      await page.screenshot({path:path.join(directory,'published-fiche.png')});
    }
    for(const pendingResponse of pending) await pendingResponse;
    assert.deepEqual(errors,[]);
    const businessGuards=requests.filter(request=>request.status===422 && request.path.endsWith('/preview-attendus')
      && request.error?.error==='participation_catalogue_non_suivie');
    if(mode==='after') assert.ok(requests.every(request=>request.status<400 || businessGuards.includes(request)),
      JSON.stringify(requests.filter(request=>request.status>=400 && !businessGuards.includes(request))));
    const result={mode,status:mode==='before'?'OVERSIZE_REPRODUCED':'PASS',productionWrites:false,
      handler:mode==='before'?'Git 89a2f15':'corrective branch',volume:933,auth:'LOCAL',timings,homeResources,requests,businessGuards,javascriptErrors:errors};
    fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({mode,status:result.status,timings,javascriptErrors:errors}));
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
