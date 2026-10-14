'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-v1-tests19-33/browser'),base='http://127.0.0.1:4410';
async function run(){
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],tests=[],geometry=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    const get=await context.request.get(base+'/api/scope/quo-vadis/programmes/2027');assert.equal(get.status(),200);
    const qv=(await get.json()).quoVadis;
    const open=async id=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-save').waitFor({timeout:60000});};
    await open('qv-source-918');
    const options=await page.locator('#qv-programme-family option').allTextContents();assert.deepEqual(options.slice(0,4),['—','SDIS','DPS','DAP']);
    assert.ok(['FOBA','FOCO','FOCA','FOSPEC','AUTO','PR'].every(v=>options.includes(v)));assert.ok(!options.includes('Transversale / non qualifiée'));
    tests.push('Shared family options present, SDIS first, no artificial empty-family label');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:850});await page.locator('#qv-programme-date-picker').scrollIntoViewIfNeeded();
      await page.locator('#qv-programme-date-picker').click();const calendar=page.locator('#qv-programme-calendar');
      const measure=()=>calendar.evaluate(n=>{const r=n.getBoundingClientRect(),aside=n.querySelector('aside').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,asideInside:aside.right<=r.right && aside.left>=r.left,cells:n.querySelector('.qv-programme-calendar-days').children.length};});
      const first=await measure();assert.equal(first.cells,49);assert.equal(first.asideInside,true);
      assert.match(await calendar.locator('.qv-programme-calendar-selected').innerText(),/mardi,?\s+16 février 2027/i);
      assert.match(await calendar.locator('.qv-programme-calendar-legend').innerText(),/Jours fériés.*Vacances scolaires vaudoises.*Week-ends/s);
      for(const month of ['2027-03','2027-04']){await calendar.locator(`[data-qv-calendar-month="${month}"]`).click();const next=await measure();assert.deepEqual(next,first);geometry.push({viewport:width,month,...next});}
      await calendar.screenshot({path:path.join(out,`calendar-${width}.png`)});await page.keyboard.press('Escape');
      await page.locator('#qv-programme-date-picker').click();if(await calendar.isVisible()) await page.locator('#qv-programme-date-picker').click();
    }
    tests.push('Extended calendar panel complete desktop/mobile, long selected date, three legends and fixed geometry across months');
    await page.setViewportSize({width:1440,height:1000});
    for(const [site,date,publicCode] of [['G1','2027-02-06','N04a'],['B1','2027-02-13','N03a']]){
      const row=qv.canonicalProgramme.rows.find(r=>r.startsAt?.startsWith(date) && /Instr demi-sct/.test(r.label) && r.ois.includes(site) && r.publics.includes(publicCode));
      assert.ok(row);await open(row.id);assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/Vacances scolaires|Jour déconseillé/);
    }
    tests.push('MOA CTA examples no longer display false generic date warnings');
    const g1=qv.lieux.find(r=>r.code==='G1-CASERNE'),room=qv.sallesTheorie.find(r=>r.libelle==='Backdraft');
    const created=await context.request.post(base+'/api/scope/quo-vadis/programme-items',{data:{year:2027,activityLabel:'Recette navigateur V1',domain:'F1',family:'DAP',
      statCom:'011PR',date:'2027-08-27',startTime:'13:00',endTime:'14:00',lieuId:g1.lieuId,salleTheorieId:room.salleId,
      oiCodes:['DAP:Y1'],publicCodes:[],status:'PLANIFIE'}});
    assert.ok(created.ok(),await created.text());const data=await created.json();
    const id=data.itemId || data.existingItemId;assert.ok(id,JSON.stringify({keys:Object.keys(data),reason:data.reason}));await open(id);
    assert.equal(await page.locator('#qv-programme-family').inputValue(),'DAP');
    await page.locator('#qv-programme-cancel-year').click();const modal=page.locator('#qv-workflow-dialog');await modal.waitFor();
    await modal.locator('textarea').fill('Annulation V1 de recette, rollback.');await modal.getByRole('button',{name:'Confirmer l’annulation',exact:true}).click();
    await page.locator('#qv-programme-reactivate').waitFor({timeout:60000});await page.locator('#qv-programme-reactivate').click();await modal.waitFor();
    const confirm=modal.getByRole('button',{name:'Confirmer la réactivation',exact:true});
    await confirm.click();assert.equal(await modal.isVisible(),true);assert.equal(await modal.locator('textarea').evaluate(n=>n.validity.valueMissing),true);
    await modal.locator('textarea').fill('Réactivation V1 de recette, rollback.');await confirm.click();await page.locator('#qv-programme-cancel-year').waitFor({timeout:60000});
    assert.equal(await page.locator('#qv-programme-family').inputValue(),'DAP');
    await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    assert.match(await page.locator('.qv-history-table').innerText(),/Réactivation/);assert.doesNotMatch(await page.locator('.qv-history-table').innerText(),/REACTIVER_OCCURRENCE|undefined/);
    await page.locator('.qv-programme-preparation').screenshot({path:path.join(out,'reactivation.png')});
    tests.push('F1/DAP persists; explicit reactivation has mandatory motif, same ID, human-readable history');
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'recipe.json'),JSON.stringify({status:'PASS',tests,geometry,errors,productionWrites:false},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,errors:errors.length}));
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
