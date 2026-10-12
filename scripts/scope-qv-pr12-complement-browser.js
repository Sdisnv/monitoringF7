'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-pr12-complement-20261012/browser');
async function run(){
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
    const dismiss=async()=>{const button=page.getByRole('button',{name:'Fermer la notification'});if(await button.isVisible()) await button.click();};
    const open=async(id)=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-save:not([disabled])').waitFor();};
    const clickSave=async(name)=>{
      const response=page.waitForResponse(r=>r.request().method()==='PATCH' && r.url().includes('/programme-items/'));
      await page.getByRole('button',{name,exact:true}).click();const result=await response;return {status:result.status(),body:await result.json()};
    };
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    const initial=await programme();const preserved=initial.canonicalProgramme.rows.map(row=>({id:row.id,statCom:row.statCom}));
    await record('seven PAPR titles and themes are visible, restored dates remain blank',async()=>{
      await page.locator('#qv-filter-q').fill('Cursus PAPR');
      await page.waitForFunction(()=>document.querySelectorAll('.qv-programme-table tbody tr').length===7);
      await page.locator('.qv-programme-table').screenshot({path:path.join(output,'papr-seven-modules-desktop.png')});
      for(let number=2;number<=7;number++){
        await open(`QV27:PAPR:M0${number}`);
        assert.equal(await page.locator('#qv-programme-activity').inputValue(),`Cursus PAPR - module ${number}`);
        assert.equal(await page.locator('#qv-programme-themes').inputValue(),initial.canonicalProgramme.rows.find(row=>row.id===`QV27:PAPR:M0${number}`).themes.join(' ; '));
        assert.equal(await page.locator('#qv-programme-date').inputValue(),'');
        for(const site of ['G1','C1','B1','B2']) assert.ok(await page.locator(`#qv-programme-oi input[value="DPS:${site}"]`).isChecked());
        assert.ok(await page.locator('#qv-programme-public input[value="PR:CAND-PAPR"]').isChecked());
        assert.ok(await page.locator('#qv-programme-public input[value="PR:FORMATEUR-PR"]').isChecked());
      }
    });
    await record('EXERCI offers 0180F7 without changing stored Stat.Com',async()=>{
      await open('QV27:PAPR:M02');
      const options=await page.locator('#qv-programme-statcom option').allTextContents();
      assert.ok(options.some(value=>value.includes('0180F7') && value.includes('Formations EXTRAS')));
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'011PR');
      await page.screenshot({path:path.join(output,'papr-module-2-desktop.png')});
    });
    await record('PAPR planning persists, withdrawal needs a reason and cannot save unsaved title changes',async()=>{
      await page.locator('#qv-programme-date').fill('09.02.2027');await page.locator('#qv-programme-start').fill('18:00');await page.locator('#qv-programme-end').fill('21:00');
      const saved=await clickSave('Enregistrer et valider');assert.equal(saved.status,200);
      await page.locator('.qv-programme-view').waitFor();await open('QV27:PAPR:M02');
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'09.02.2027');
      const refused=await clickSave('Retirer la validation');assert.equal(refused.status,422);assert.equal(refused.body.error,'programme_motif_obligatoire');await dismiss();
      await page.locator('#qv-programme-activity').fill('Saisie non enregistrée à préserver hors retrait');
      await page.locator('#qv-programme-revision-motif').fill('Recette navigateur : retrait motivé');
      const withdrawn=await clickSave('Retirer la validation');assert.equal(withdrawn.status,200);
      await page.locator('.qv-programme-view').waitFor();await open('QV27:PAPR:M02');
      assert.equal(await page.locator('#qv-programme-activity').inputValue(),'Cursus PAPR - module 2');
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'09.02.2027');
      const q=await programme(),row=q.canonicalProgramme.rows.find(row=>row.id==='QV27:PAPR:M02');
      assert.equal(row.businessValidation,null);assert.equal(row.validationHistory.at(-1).action,'RETIRER_VALIDATION');
    });
    await record('annual validation blocked by incomplete PAPR, report closing window has no date',async()=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('.qv-programme-view').waitFor();
      await page.locator('.qv-programme-cycle').filter({has:page.locator('#qv-programme-status')}).locator('summary').click();
      const pending=page.waitForResponse(r=>r.request().method()==='POST' && r.url().endsWith('/statut'));
      await page.locator('#qv-programme-status').selectOption('VALIDE');
      const response=await pending;assert.equal(response.status(),422);assert.equal((await response.json()).error,'programme_papr_prerequis_bloquant');
      await dismiss();
      await page.locator('.qv-programme-cycle').filter({has:page.locator('#qv-cycle-end')}).locator('summary').click();
      assert.equal(await page.locator('#qv-cycle-end').inputValue(),'');
      assert.ok(await page.getByText('Rapport annuel de clôture 2027 proposé en février 2028. Date à confirmer selon les relâches scolaires.',{exact:true}).isVisible());
      await page.screenshot({path:path.join(output,'annual-block-and-report-window.png')});
    });
    await record('state cell top aligned with actual 8x8 square, desktop and mobile layout',async()=>{
      await page.locator('#qv-filter-q').fill('Cursus PAPR');
      await page.waitForFunction(()=>document.querySelectorAll('.qv-programme-table tbody tr').length===7);
      const dimensions=await page.locator('.qv-programme-table tbody tr').first().locator('td').nth(10).evaluate(cell=>{
        const square=cell.querySelector('.scope-state-swatch').getBoundingClientRect();
        return {vertical:getComputedStyle(cell).verticalAlign,width:square.width,height:square.height};
      });
      assert.deepEqual(dimensions,{vertical:'top',width:8,height:8});
      await page.setViewportSize({width:390,height:844});
      await open('QV27:PAPR:M02');await page.locator('#qv-programme-activity').scrollIntoViewIfNeeded();
      const bounds=await page.locator('#qv-programme-activity').boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=390);
      await page.screenshot({path:path.join(output,'papr-module-2-mobile.png')});
    });
    const final=await programme(),byId=new Map(final.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const row of preserved) assert.equal(byId.get(row.id)?.statCom,row.statCom);
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({base,results,javascriptErrors:errors,
      statComCompared:preserved.length,statComIdentical:preserved.length,productionWrites:false,verdict:'PASS'},null,2)+'\n');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
