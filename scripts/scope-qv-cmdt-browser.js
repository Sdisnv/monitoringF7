'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const {input,definitions}=require('./scope-qv-cmdt-tests'),{createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const L=require('../assets/js/scope-ui-logic'),qv=JSON.parse(fs.readFileSync(input,'utf8'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-cmdt'),url='http://127.0.0.1:4410';
const prior=fs.readFileSync(path.join(root,'scripts/scope-qv-complement-browser.js'),'utf8');
const credentials={nip:prior.match(/nip:'([^']+)'/)[1],password:prior.match(/password:'([^']+)'/)[1]};
const {hooks}=createCatalogUiHarness();
async function run(){
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],checks=[],pdfRequests=[];let baseline=false,businessWrites=0;
  const oldLogic=execFileSync('git',['show','0d1fc89:assets/js/scope-ui-logic.js'],{cwd:root,encoding:'utf8'});
  try{
    for(const viewport of [{width:1440,height:1100},{width:1366,height:768}]){
      const context=await browser.newContext({viewport});assert.equal((await context.request.post(url+'/auth/login',{data:credentials})).status(),200);
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const req=route.request(),target=new URL(req.url());if(target.origin!==url) return route.abort();
        if(target.pathname.startsWith('/api/scope/') && req.method()!=='GET'){
          if(target.pathname.endsWith('/reports/quo-vadis')) pdfRequests.push(req.postDataJSON());else businessWrites++;
          return route.fulfill({status:503,contentType:'application/json',body:'{"error":"intercepted","message":"Recette sans écriture métier."}'});
        }
        if(/^\/api\/scope\/quo-vadis\/programmes\/2027$/.test(target.pathname)) return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:qv})});
        if(target.pathname==='/assets/js/scope-ui-logic.js') return route.fulfill({contentType:'application/javascript',body:baseline?oldLogic:fs.readFileSync(path.join(root,target.pathname),'utf8')});
        if(['/assets/js/scope-ui.js','/assets/js/scope-qv-coverage.js','/assets/js/scope-auth-idle.js','/assets/js/scope-api.js','/assets/css/scope.css'].includes(target.pathname))
          return route.fulfill({contentType:target.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,target.pathname),'utf8')});
        return route.continue();
      });
      const go=async(view,selector)=>{await page.goto(url+'/scope.html#/quo-vadis/'+view);await page.reload();await page.locator(selector).waitFor({timeout:60000});};
      const ids=async()=>page.locator('.qv-programme-table tbody a.qv-programme-action').evaluateAll(nodes=>nodes.map(a=>decodeURIComponent(a.hash.split('/programme/')[1].split('?')[0])));
      const cmdt=qv.canonicalProgramme.rows.filter(L.qvProgrammeIsActive).filter(row=>definitions.includes(row.definitionId));
      baseline=true;await go('programme','#qv-filter-oi');await page.locator('#qv-filter-oi').selectOption('DAP:Y1');await page.locator('#qv-programme-page-size').selectOption('all');
      const before=await ids();assert.ok(cmdt.every(row=>before.includes(row.id)));
      await page.screenshot({path:path.join(out,`programme-y1-before-${viewport.width}.png`),fullPage:true});
      baseline=false;await go('programme','#qv-filter-oi');const filtered=[];
      for(const oi of ['DAP:Y1','DPS:G1','JSP:C1','SDIS','tous']){
        await page.locator('#qv-filter-oi').selectOption(oi);await page.locator('#qv-programme-page-size').selectOption('all');
        const actual=await ids(),expected=hooks.filterQuoVadisProgrammeRows(qv,{oi}).map(row=>row.id);
        assert.deepEqual(actual.slice().sort(),expected.sort());assert.equal(actual.length,new Set(actual).size);
        assert.equal(cmdt.every(row=>actual.includes(row.id)),['SDIS','tous'].includes(oi));
        filtered.push({oi,rows:actual.length});
        if(oi==='DAP:Y1') await page.screenshot({path:path.join(out,`programme-y1-after-${viewport.width}.png`),fullPage:true});
      }
      const calendars=[];
      for(const oi of ['DAP:Y1','DPS:G1','JSP:C1','SDIS','tous']){
        await go('agenda-annuel?annee=2027','#qv-agenda-oi');await page.locator('#qv-agenda-oi').selectOption(oi);
        const labels=(await page.locator('.qv-year-grid .qv-mini-cal [aria-label]').allTextContents()).join(' ');
        void labels;
        const aria=(await page.locator('.qv-year-grid .qv-mini-cal [aria-label]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')))).join(' ');
        for(const label of ['Séance État-major','Séance Codir','Séance CRDIS','Conférence des Commandants'])
          assert.equal(aria.includes(label),['SDIS','tous'].includes(oi),oi+':'+label);
        if(oi==='DAP:Y1' || oi==='SDIS'){
          await page.screenshot({path:path.join(out,`agenda-${oi==='SDIS'?'sdis':'y1'}-${viewport.width}.png`),fullPage:true});
          const downloadPromise=page.waitForEvent('download');await page.locator('#qv-export-programme-excel').click();const download=await downloadPromise;
          const file=path.join(out,`browser-${oi==='SDIS'?'sdis':'y1'}.csv`);await download.saveAs(file);
          const model=hooks.quoVadisProgrammeExport(qv,{oi});assert.equal(fs.readFileSync(file,'utf8'),hooks.quoVadisProgrammeCsvText(model.rows));
          const response=page.waitForResponse(r=>r.url().endsWith('/reports/quo-vadis') && r.request().method()==='POST');
          await page.locator('#qv-export-programme-pdf').click();await response;
          assert.deepEqual(pdfRequests.at(-1).rows,JSON.parse(JSON.stringify(model.rows)));
          const close=page.getByRole('button',{name:'Fermer la notification',exact:true});if(await close.isVisible()) await close.click();
        }
        await page.locator('.qv-year-grid a[href*="mois=2027-01"]').filter({hasNot:page.locator('.qv-mini-day')}).first().click();
        await page.locator('.qv-programme-monthly').waitFor();assert.equal(await page.locator('#qv-filter-oi').inputValue(),oi);
        const text=await page.locator('.qv-programme-monthly').textContent();
        assert.equal(text.includes('Séance État-major'),['SDIS','tous'].includes(oi));
        assert.ok(text.includes('Séance cadres F5/6'));calendars.push({oi,cmdtVisible:['SDIS','tous'].includes(oi),nonCmdtPreserved:true});
      }
      checks.push({viewport,filters:filtered,calendars,pdfAndCsvMatchDisplayedScope:true});await context.close();
    }
    assert.deepEqual(errors,[]);assert.equal(businessWrites,0);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',checks,errors,businessWrites,
      engine:'Chrome / Playwright',isolatedAssetsAndProjection:true,liveMoaSessionUntouched:true,safari:'Non testé, runtime WebKit absent'},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',viewports:checks.length,errors,businessWrites}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
