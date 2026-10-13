'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410',directory=path.resolve(__dirname,'../docs/captures/qv-pr13-final-controls-20261013/browser');
async function run() {
  fs.mkdirSync(directory,{recursive:true});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    for(const [id,search] of [['qv-source-870','Séance instruction DAP'],['qv-source-888','Séance personnel DAP']]) {
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.reload();await page.locator('#qv-filter-q').waitFor();
      await page.locator('#qv-filter-q').fill(search);await page.waitForTimeout(300);
      assert.equal(await page.locator(`.qv-programme-table a[href*="${id}"]`).count(),1);
      const rows=await page.locator('.qv-programme-table tbody tr').evaluateAll(items=>items.map(item=>({href:item.querySelector('a')?.getAttribute('href'),date:item.querySelectorAll('td')[1]?.textContent.trim()})));
      const projected=rows.filter(row=>row.href?.includes('QV27%3ACYCLE'));
      assert.equal(projected.length,id==='qv-source-870'?4:1);
      assert.ok(projected.every(row=>row.date?.endsWith('.28')),JSON.stringify(projected));
      await page.locator('.qv-programme-view').screenshot({path:path.join(directory,`${id}-after.png`)});
    }
    for(const [device,viewport] of [['desktop',{width:1440,height:1100}],['mobile',{width:390,height:844}]]) {
      await page.setViewportSize(viewport);
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent('QV27:DAP-GROUP:1.2'));await page.reload();
      await page.locator('#qv-programme-save').waitFor();
      const control=await page.locator('.qv-programme-controls').textContent();
      assert.match(control,/2027-05-13/);assert.match(control,/20\.05\.27|20\.05\.2027/);assert.match(control,/Lieu et salle à confirmer/);
      for(const field of ['date','start','end']) assert.equal(await page.locator('#qv-programme-'+field).inputValue(),'');
      for(const site of ['Y1','Y2','Y3','Y4']) assert.ok(await page.locator(`#qv-programme-oi input[value="DAP:${site}"]`).isChecked());
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      await page.locator('.qv-programme-controls').screenshot({path:path.join(directory,`${device}-dap-proposal.png`)});
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify({status:'PASS',productionWrites:false,
      scenarios:['Production decisions replay: one row per reported case','DAP ranked proposal shown without invented date/time decision'],
      captures:4,javascriptErrors:errors},null,2)+'\n');
    console.log('PASS 2 targeted browser scenarios; 4 captures; no JS errors');
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
