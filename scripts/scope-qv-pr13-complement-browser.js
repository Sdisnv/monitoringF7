'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const logic=require('../assets/js/scope-ui-logic');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-pr13-complement-20261013/browser');
async function run() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const results=[],errors=[];
  const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    const login=await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}});
    assert.equal(login.status(),200);
    const programme=async()=>{const response=await context.request.get(base+'/api/scope/quo-vadis/programmes/2027');
      assert.equal(response.status(),200);return (await response.json()).quoVadis;};
    const qv=await programme(),aliases=qv.canonicalProgramme.rows.filter(row=>row.programmeReconciliation);
    assert.equal(aliases.length,2);
    await record('Programme and Excel contain one item per published occurrence; direct old alias opens the preserved publication',async()=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-q').waitFor();
      await page.locator('#qv-filter-q').fill('Séance instruction DAP');await page.waitForTimeout(300);
      assert.equal(await page.locator('.qv-programme-table a[href*="qv-source-870"]').count(),1);
      assert.equal(await page.locator('.qv-programme-table a[href*="RECIPE-ALIAS"]').count(),0);
      await page.locator('.qv-programme-view').screenshot({path:path.join(output,'programme-rapprochement.png')});
      for(const alias of aliases) {
        await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(alias.id));await page.reload();
        await page.getByRole('link',{name:'Voir la fiche publiée'}).waitFor();assert.equal(await page.locator('#qv-programme-save').count(),0);
        await page.getByRole('link',{name:'Voir la fiche publiée'}).click();await page.locator('#qv-programme-save').waitFor();
      }
      const harness=createCatalogUiHarness();
      const exported=harness.hooks.quoVadisProgrammeExport(qv);
      assert.equal(exported.rows.length,qv.canonicalProgramme.rows.filter(logic.qvProgrammeIsActive).length);
    });
    await record('restored DAP sessions show four DAP OI, evidence, unconfirmed fields and the real calendar conflict on desktop/mobile',async()=>{
      for(const [index,id] of ['QV27:DAP-GROUP:1.1','QV27:DAP-GROUP:1.2'].entries()) {
        for(const [device,viewport] of [['desktop',{width:1440,height:1100}],['mobile',{width:390,height:844}]]) {
          await page.setViewportSize(viewport);
          await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.reload();
          await page.locator('#qv-programme-save').waitFor();
          assert.equal(await page.locator('#qv-programme-activity').inputValue(),`Formation groupée DAP 1.${index+1}`);
          for(const site of ['Y1','Y2','Y3','Y4']) assert.ok(await page.locator(`#qv-programme-oi input[value="DAP:${site}"]`).isChecked());
          assert.equal(await page.locator('#qv-programme-start').inputValue(),'');assert.equal(await page.locator('#qv-programme-end').inputValue(),'');
          assert.equal(await page.locator('#qv-programme-themes').inputValue(),'');
          assert.equal(await page.locator('#qv-programme-public input[data-choice-kind="FREE"]').count(),1);
          assert.equal(await page.locator('#qv-programme-public input[data-choice-kind="FREE"]').inputValue(),'DAP');
          assert.match(await page.locator('.qv-programme-controls').textContent(),index===0?/2027-04-22/:/Ascension/);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
          await page.locator('.qv-programme-preparation').screenshot({path:path.join(output,`${device}-dap-${index+1}.png`)});
          if(device==='desktop') await page.locator('.qv-programme-controls').screenshot({path:path.join(output,`source-dap-${index+1}.png`)});
        }
      }
    });
    await record('manual confirmation persists on the same restored session without creating any operational event',async()=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent('QV27:DAP-GROUP:1.1'));await page.reload();
      await page.locator('#qv-programme-save').waitFor();
      await page.locator('#qv-programme-date').fill('22.04.2027');await page.locator('#qv-programme-start').fill('18:30');
      await page.locator('#qv-programme-end').fill('21:30');await page.locator('#qv-programme-themes').fill('Thème de recette temporaire');
      const waiting=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
      await page.getByRole('button',{name:'Enregistrer',exact:true}).click();const response=await waiting,body=await response.json();
      assert.equal(response.status(),200,JSON.stringify(body));
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent('QV27:DAP-GROUP:1.1'));
      await page.reload();await page.locator('#qv-programme-save').waitFor();
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'22.04.2027');
      assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Thème de recette temporaire');
      const final=await programme();assert.equal(final.canonicalProgramme.rows.filter(row=>row.label==='Formation groupée DAP 1.1').length,1);
      assert.equal(final.canonicalProgramme.rows.find(row=>row.id==='QV27:DAP-GROUP:1.1').publishedEventId,undefined);
      const current=new Map(final.canonicalProgramme.rows.map(row=>[row.id,row]));
      for(const row of qv.canonicalProgramme.rows) for(const key of ['statCom','code','businessCode','publishedEventId','publishedEventCode'])
        assert.deepEqual(current.get(row.id)[key],row[key],`${row.id}:${key}`);
    });
    assert.deepEqual(errors,[]);
    const proof={baseline:'66b38c6',results,javascriptErrors:errors,fixtureAliases:2,productionWrites:false,status:'PASS'};
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify(proof,null,2)+'\n');
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
