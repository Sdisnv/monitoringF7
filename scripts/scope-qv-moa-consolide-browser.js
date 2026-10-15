'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4410',out=path.join(root,'docs/captures/qv-moa-consolide');
const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-moa-consolide/current.json'),'utf8'));
async function run(){
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],writes=[],tests=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin===base && url.pathname.startsWith('/api/scope/') && request.method()!=='GET'){writes.push(url.pathname);return route.abort();}
      if(url.origin===base && ['/assets/js/scope-ui.js','/assets/js/scope-ui-logic.js','/assets/css/scope.css'].includes(url.pathname))
        return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,url.pathname.slice(1)),'utf8')});
      if(url.origin===base && url.pathname==='/api/scope/quo-vadis/programmes/2027') return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:qv})});
      return route.continue();
    });
    const {hooks}=createCatalogUiHarness();
    const expectRows=async filters=>{
      const expected=hooks.filterQuoVadisProgrammeRows(qv,filters).map(row=>row.id);
      await page.waitForFunction(ids=>{
        const actual=[...document.querySelectorAll('.qv-programme-table tbody a.qv-programme-action')].map(link=>decodeURIComponent(link.hash.split('/').pop()));
        return actual.length===Math.min(20,ids.length) && actual.every(id=>ids.includes(id));
      },expected);
    };
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-family').waitFor({timeout:60000});
    const values=selector=>page.locator(selector+' option').evaluateAll(nodes=>nodes.map(n=>n.value));
    assert.deepEqual(await values('#qv-filter-family'),['tous',...L.qvProgrammeFamilyCatalogue(),'__EMPTY__']);
    assert.deepEqual((await values('#qv-filter-oi')).slice(1),['SDIS','DPS','DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4','JSP','JSP:G1','JSP:C1','JSP:B1']);
    const groups={};
    for(const id of ['qv-filter-family','qv-filter-cursus','qv-filter-specialisation']){
      groups[id]=await page.locator('#'+id+' optgroup').evaluateAll(nodes=>nodes.map(n=>({label:n.label,tag:n.tagName,
        background:getComputedStyle(n).backgroundColor,items:[...n.children].map(item=>({value:item.value,label:item.textContent.trim()}))})));
      assert.ok(groups[id].length);assert.equal(new Set(groups[id].map(g=>g.label)).size,groups[id].length);
      for(const g of groups[id]){assert.equal(g.tag,'OPTGROUP');assert.equal(g.background,'rgb(238, 240, 242)');
        if(id!=='qv-filter-family') assert.deepEqual(g.items.map(i=>i.label),g.items.map(i=>i.label).sort((a,b)=>a.localeCompare(b,'fr')));}
    }
    assert.ok(groups['qv-filter-cursus'].find(g=>g.label==='Autres cursus').items.some(i=>i.label==='Cursus CI DAP'));
    tests.push('1-8: exact eleven families; empty last; grey nonselectable native headers; grouped French sorting; unknown cursus retained; SDIS first');
    await page.locator('#qv-filter-family').selectOption('Permanent');await expectRows({family:'Permanent'});
    await page.locator('#qv-filter-reset').click();await page.locator('#qv-filter-family').selectOption('DAP');
    await page.locator('#qv-filter-oi').selectOption('DAP:Y4');await expectRows({family:'DAP',oi:'DAP:Y4'});
    await page.screenshot({path:path.join(out,'programme-dap-y4.png'),fullPage:true});
    tests.push('Permanent filter works without reclassifying any existing occurrence; effective DAP/Y4 filtering');
    for(const label of ['Exercice DAP 3','Exercice DAP 4','Cours de cadres exercice DAP 3','Cours de cadres exercice DAP 4']){
      const row=qv.canonicalProgramme.rows.find(item=>item.label===label && item.statCom==='013Y4');assert.ok(row);
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(row.id));await page.locator('#qv-programme-family').waitFor();
      assert.equal(await page.locator('#qv-programme-family').inputValue(),'DAP');
      assert.equal((await values('#qv-programme-family')).at(-1),'');
      assert.ok((await values('#qv-programme-family')).includes('Permanent'));
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'013Y4');
      assert.equal(await page.locator('#qv-programme-family').getAttribute('data-dirty'),null);
    }
    tests.push('9-13: four newly authorised Y4 exercise/cadre fiches show DAP, unchanged Stat.Com, no dirty family on opening');
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-family').waitFor();
    await page.setViewportSize({width:390,height:844});await page.locator('.qv-programme-filters').screenshot({path:path.join(out,'filters-mobile.png')});
    assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',tests,groups,errors,businessApiWrites:writes,
      mode:'Existing local recipe; new assets and corrected read-only projection substituted in test session only'},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,errors:0,businessApiWrites:0}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
