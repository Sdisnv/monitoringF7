'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(__dirname,'..');
const base='http://127.0.0.1:4410';
const out=path.join(root,'docs/captures/qv-familles-filtres');
const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-familles-filtres/current.json'),'utf8'));
const L=require('../assets/js/scope-ui-logic');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
async function run(){
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],writes=[],tests=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const auth=await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}});
    assert.equal(auth.status(),200);
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    const {hooks}=createCatalogUiHarness();
    const expectRows=async filters=>{
      const expected=hooks.filterQuoVadisProgrammeRows(qv,filters).map(row=>row.id);
      assert.ok(expected.length);
      await page.waitForFunction(ids=>{
        const links=[...document.querySelectorAll('.qv-programme-table tbody a.qv-programme-action')];
        const actual=links.map(link=>decodeURIComponent(link.hash.split('/').pop()));
        return actual.length===Math.min(20,ids.length) && actual.every(id=>ids.includes(id));
      },expected);
    };
    // Existing local authentication/server; only changed assets and the read-only projection are substituted.
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin===base && url.pathname.startsWith('/api/scope/') && request.method()!=='GET'){
        writes.push({method:request.method(),path:url.pathname});return route.abort();
      }
      if(url.origin===base && ['/assets/js/scope-ui.js','/assets/js/scope-ui-logic.js'].includes(url.pathname))
        return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path.join(root,url.pathname.slice(1)),'utf8')});
      if(url.origin===base && url.pathname==='/api/scope/quo-vadis/programmes/2027')
        return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:qv})});
      return route.continue();
    });
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.locator('#qv-filter-family').waitFor({timeout:60000});
    const families=await page.locator('#qv-filter-family option').evaluateAll(nodes=>nodes.map(node=>node.value));
    assert.deepEqual(families,['tous','__EMPTY__',...L.qvProgrammeFamilyCatalogue()]);
    const cursus=await page.locator('#qv-filter-cursus option').allTextContents();
    for(const label of ['Cursus CI DPS','Cursus CI DAP','Cursus C groupe','Cursus cond TP9','Cursus OFSI']) assert.ok(cursus.includes(label),label);
    const publics=await page.locator('#qv-filter-cible option').evaluateAll(nodes=>nodes.map(node=>node.textContent.trim()));
    assert.equal(new Set(publics).size,publics.length);assert.ok(publics.includes('N06'));
    tests.push('Exact ten families; five required cursus from real IDs; full public catalogue and reserve N06 without duplicate labels');
    await page.locator('#qv-filter-family').selectOption('DAP');
    await page.locator('#qv-filter-q').fill('Exercice DAP 1');
    await expectRows({family:'DAP',q:'Exercice DAP 1'});
    const table=page.locator('.qv-programme-table');
    const text=await table.innerText();assert.match(text,/013Y4/);assert.match(text,/013Y1/);assert.match(text,/013Y2/);assert.match(text,/013Y3/);
    await page.screenshot({path:path.join(out,'programme-dap.png'),fullPage:true});
    tests.push('Actual family DAP + text filter retrieves all four corrected DAP 1 occurrences');
    const example=qv.canonicalProgramme.rows.find(row=>row.statCom==='013Y4' && row.label==='Exercice DAP 1');
    await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(example.id));
    await page.locator('#qv-programme-family').waitFor();
    assert.equal(await page.locator('#qv-programme-family').inputValue(),'DAP');
    const ficheCursus=await page.locator('#qv-programme-cursus option').allTextContents();
    assert.ok(ficheCursus.includes('Cursus cond TP9'));
    assert.equal(await page.locator('#qv-programme-family').getAttribute('data-dirty'),null);
    await page.screenshot({path:path.join(out,'fiche-y4.png'),fullPage:true});
    tests.push('Y4 fiche retains DAP and real cursus choices; opening does not mark family dirty');
    await page.goto(base+'/scope.html#/quo-vadis/programme/nouveau');
    await page.locator('#qv-programme-type').waitFor();
    const types=L.qvProgrammeActivityTypes(qv);
    const dapType=types.find(item=>item.definitionId===example.definitionId);assert.ok(dapType);
    await page.locator('#qv-programme-type').selectOption(dapType.id);
    assert.equal(await page.locator('#qv-programme-family').inputValue(),'DAP');
    const unclassified=types.find(item=>!item.defaults.family);assert.ok(unclassified);
    await page.locator('#qv-programme-type').selectOption(unclassified.id);
    assert.equal(await page.locator('#qv-programme-family').inputValue(),'');
    tests.push('New activity type proposes DAP; switching to an unqualified type clears stale defaults; no save or business API write');
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-cursus').waitFor();
    await page.locator('#qv-filter-reset').click();
    const papr=qv.cursusSelections.find(item=>item.code==='PAPR');
    await page.locator('#qv-filter-cursus').selectOption(papr.cursusId);
    await expectRows({cursus:papr.cursusId});
    assert.match(await page.locator('.qv-programme-table').innerText(),/PAPR/);
    await page.locator('#qv-filter-reset').click();
    const qualification=qv.qualifications.find(item=>qv.canonicalProgramme.rows.some(row=>(row.qualificationCodes || []).includes(item.code)));
    assert.ok(qualification);await page.locator('#qv-filter-specialisation').selectOption(qualification.code);
    await expectRows({specialisation:qualification.code});
    await page.locator('#qv-filter-reset').click();await page.locator('#qv-filter-cible').selectOption('PR:FORMATEUR-PR');
    await expectRows({cible:'PR:FORMATEUR-PR'});
    tests.push('Real browser cursus, specialisation and public controls filter successfully');
    const cancelled={id:'fixture-cancelled-browser',label:'Témoin local annulé',activityLabel:'Témoin local annulé',family:'SDIS',
      status:'ANNULE',publishedEventId:'fixture-only',startsAt:'2027-08-10T19:00',endsAt:'2027-08-10T21:00',external:false};
    qv.canonicalProgramme.rows.push(cancelled);
    await page.reload();await page.locator('#qv-filter-status').waitFor();await page.locator('#qv-filter-reset').click();
    await page.locator('#qv-filter-status').selectOption('Annulé');
    await expectRows({status:'Annulé'});
    assert.match(await page.locator('.qv-programme-table').innerText(),/Annulé/);
    tests.push('Cancelled published fixture is retrievable via existing Annulé state, without changing workflow or any database row');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('#qv-filter-family').isVisible(),true);
    const overlaps=await page.locator('.qv-programme-filters').evaluate(node=>{
      const fields=[...node.querySelectorAll('.scope-field')].map(item=>item.getBoundingClientRect());
      return fields.some((a,i)=>fields.some((b,j)=>j>i && Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1));
    });assert.equal(overlaps,false);
    await page.locator('.qv-programme-filters').screenshot({path:path.join(out,'filters-mobile.png')});
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',tests,errors,businessApiWrites:writes,
      base,mode:'Existing local recipe + changed assets + readonly fresh projection + one in-memory cancellation fixture',productionWrites:false},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,errors:errors.length,businessApiWrites:writes.length}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
