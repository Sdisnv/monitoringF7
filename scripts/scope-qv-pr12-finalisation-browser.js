'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-pr12-finalisation-20261012/browser');
async function run(){
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
    const dismiss=async()=>{const button=page.getByRole('button',{name:'Fermer la notification'});if(await button.isVisible()) await button.click();};
    const open=async id=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-save:not([disabled])').waitFor();};
    const save=async()=>{
      const pending=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
      await page.getByRole('button',{name:'Enregistrer',exact:true}).click();const response=await pending;
      assert.equal(response.status(),200,JSON.stringify(await response.json()));await page.locator('.qv-programme-view').waitFor();
    };
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    const initial=await programme(),before=initial.canonicalProgramme.rows.map(row=>({id:row.id,statCom:row.statCom}));
    if(process.argv.includes('--mobile-capture')){
      await page.setViewportSize({width:390,height:844});await open('qv-source-899');await dismiss();
      await page.locator('#qv-programme-activity').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'papr-mobile.png')});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      return;
    }
    await record('seven sourced automatic proposals and protected module 1 are displayed',async()=>{
      await page.locator('.qv-papr-control summary').click();
      assert.equal(await page.locator('.qv-papr-proposals tbody tr').count(),7);
      assert.equal(await page.locator('.qv-papr-proposals thead th').count(),7);
      assert.match(await page.locator('.qv-papr-proposals tbody').textContent(),/16\.02\.2027/);
      await page.locator('.qv-papr-control').screenshot({path:path.join(output,'papr-propositions-desktop.png')});
    });
    await record('PAPR specialization, cursus and automatic date are prefilled; multiple selections persist',async()=>{
      await open('QV27:PAPR:M02');assert.equal(await page.locator('#qv-programme-date').inputValue(),'16.02.2027');
      assert.ok(await page.locator('#qv-programme-specialisation input[value="PAPR"]').isChecked());
      assert.equal(await page.locator('#qv-programme-cursus option:checked').textContent(),'PAPR');
      assert.ok(await page.getByText('Cursus de formation',{exact:true}).isVisible());
      await page.locator('#qv-programme-qualification-summary').click();
      await page.locator('#qv-programme-specialisation input[value="PABC"]').check();
      await page.locator('#qv-programme-qualification-summary').click();
      await page.locator('#qv-programme-date').fill('17.02.2027');await save();await open('QV27:PAPR:M02');
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'17.02.2027');
      assert.ok(await page.locator('#qv-programme-specialisation input[value="PAPR"]').isChecked());
      assert.ok(await page.locator('#qv-programme-specialisation input[value="PABC"]').isChecked());
      assert.equal((await programme()).paprProposals[1].origin,'PROTECTED');
    });
    await record('Prepose APR permanent descriptive public and singular Candidat PAPR are selectable',async()=>{
      await page.locator('#qv-programme-public-summary').click();
      assert.ok(await page.locator('#qv-programme-public').getByText('Préposé APR',{exact:true}).isVisible());
      assert.ok(await page.locator('#qv-programme-public').getByText('Candidat PAPR',{exact:true}).isVisible());
      await page.locator('#qv-programme-public input[value="PR:PREPOSE-APR"]').check();
      await page.locator('#qv-programme-public-summary').click();await save();await open('QV27:PAPR:M02');
      assert.ok(await page.locator('#qv-programme-public input[value="PR:PREPOSE-APR"]').isChecked());
    });
    await record('Existing published module 1 OI revision remains pending on the same event',async()=>{
      await open('qv-source-899');await page.locator('#qv-papr-propose-ois').click();
      for(const site of ['G1','C1','B1','B2']) assert.ok(await page.locator(`#qv-programme-oi input[value="DPS:${site}"]`).isChecked());
      assert.match(await page.locator('#qv-programme-revision-motif').inputValue(),/décision MOA/);
      await save();await open('qv-source-899');
      const row=(await programme()).canonicalProgramme.rows.find(row=>row.id==='qv-source-899');
      assert.equal(row.publicationRevision.status,'PENDING');
      assert.equal(row.publishedEventId,initial.canonicalProgramme.rows.find(row=>row.id==='qv-source-899').publishedEventId);
      await dismiss();await page.screenshot({path:path.join(output,'papr-module-1-revision-pending.png')});
    });
    await record('Report 10.02.2028 stays provisional, editable with same reference and no duplicate',async()=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('.qv-programme-view').waitFor();
      await page.locator('.qv-programme-cycle').filter({has:page.locator('#qv-cycle-end')}).locator('summary').click();
      assert.equal(await page.locator('#qv-cycle-end').inputValue(),'2028-02-10');
      assert.ok(await page.getByText('Rapport annuel du 10.02.2028 : PROVISOIRE — À VALIDER PAR LE CODIR.',{exact:true}).isVisible());
      assert.equal(await page.locator('#qv-cycle-codir-approved').isChecked(),false);
      const id=(await programme()).programmeCycle.closingReport.itemId;
      await page.locator('.qv-programme-cycle').filter({has:page.locator('#qv-cycle-end')}).screenshot({path:path.join(output,'rapport-annuel-provisoire.png')});
      await page.locator('#qv-cycle-end').fill('2028-02-17');
      const pending=page.waitForResponse(response=>response.request().method()==='PUT' && response.url().endsWith('/cycle'));
      await page.getByRole('button',{name:'Enregistrer le cycle',exact:true}).click();const response=await pending;
      assert.equal(response.status(),200,JSON.stringify(await response.json()));
      const q=await programme();assert.equal(q.programmeCycle.endDate,'2028-02-17');assert.equal(q.programmeCycle.provisional,true);
      assert.equal(q.programmeCycle.closingReport.itemId,id);
      assert.equal(q.futureDates.filter(row=>row.annualReport?.closesCycleYear===2027).length,1);
    });
    await record('Mobile fields, proposal table and revision command do not overlap viewport',async()=>{
      await dismiss();await page.setViewportSize({width:390,height:844});await open('qv-source-899');await dismiss();
      await page.locator('#qv-programme-activity').scrollIntoViewIfNeeded();
      const bounds=await page.locator('#qv-programme-activity').boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=390);
      await page.screenshot({path:path.join(output,'papr-mobile.png')});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('.qv-programme-view').waitFor();
      await page.locator('.qv-papr-control summary').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      await page.locator('.qv-papr-control').screenshot({path:path.join(output,'papr-propositions-mobile.png')});
    });
    const final=await programme(),byId=new Map(final.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const row of before) assert.equal(byId.get(row.id)?.statCom,row.statCom);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({base,results,javascriptErrors:errors,
      statComCompared:before.length,statComIdentical:before.length,productionWrites:false,verdict:'PASS'},null,2)+'\n');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
