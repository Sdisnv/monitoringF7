'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const logic=require('../assets/js/scope-ui-logic');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-pr12-corrective-20261012/browser');
async function run(){
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
    const dismiss=async()=>{const button=page.getByRole('button',{name:'Fermer la notification'});if(await button.isVisible()) await button.click();};
    const open=async id=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.reload();
      await page.locator('#qv-programme-save:not([disabled])').waitFor();await dismiss();
    };
    const save=async(creating=false)=>{
      const pending=page.waitForResponse(response=>response.request().method()===(creating?'POST':'PATCH') && response.url().includes('/programme-items'));
      await page.getByRole('button',{name:'Enregistrer',exact:true}).click();const response=await pending;
      const body=await response.json();
      assert.equal(response.status(),creating?201:200,JSON.stringify({error:body.error,reason:body.reason,message:body.message}));
      assert.equal(body.updated,true);await page.locator('.qv-programme-view').waitFor();await dismiss();return body;
    };
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    const initial=await programme(),before=initial.canonicalProgramme.rows.map(row=>({id:row.id,statCom:row.statCom}));
    const dap=initial.canonicalProgramme.rows.find(row=>row.label==='Exercice DAP 4' && row.statCom==='013Y4');assert.ok(dap);
    await record('explicit planning states persist through SAVE, Programme and reopen; validation is unchanged',async()=>{
      await open(dap.id);await page.locator('#qv-programme-date').fill('26.10.2027');
      const pending=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
      await page.getByRole('button',{name:'Enregistrer et planifier',exact:true}).click();const planned=await pending;
      assert.equal(planned.status(),200);await page.locator('.qv-programme-view').waitFor();
      const validation=(await programme()).canonicalProgramme.rows.find(row=>row.id===dap.id).businessValidation;
      for(const [status,label] of [['A_PLANIFIER','À planifier'],['PLANIFIE','Planifié']]){
        await open(dap.id);await page.locator('#qv-programme-occurrence-status').selectOption(status);await save();
        await page.locator('#qv-filter-q').fill('Exercice DAP 4');
        const link=page.locator(`a[href*="${encodeURIComponent(dap.id)}"]`);
        await link.waitFor();assert.match(await link.locator('xpath=ancestor::tr').textContent(),new RegExp(label));
        await open(dap.id);assert.equal(await page.locator('#qv-programme-occurrence-status').inputValue(),status);
        assert.equal(await page.locator('#qv-programme-date').inputValue(),'26.10.2027');
        assert.deepEqual((await programme()).canonicalProgramme.rows.find(row=>row.id===dap.id).businessValidation,validation);
        await page.locator('.qv-programme-preparation').screenshot({path:path.join(output,`dap-${status.toLowerCase()}.png`)});
      }
    });
    await record('PAPR 1/2 show confirmed preparatory membership and keep their dates after save',async()=>{
      await open('QV27:PAPR:M02');assert.equal(await page.locator('#qv-programme-date').inputValue(),'16.02.2027');await save();
      const qv=await programme();assert.equal(qv.programmeCycle.startDate,'2027-03-05');
      for(const id of ['qv-source-899','QV27:PAPR:M02']){
        const row=qv.canonicalProgramme.rows.find(item=>item.id===id);
        assert.equal(row.businessCycleYear,2027);assert.equal(row.cycleClassification,'PREPARATORY_CURSUS');
      }
      await page.locator('.qv-papr-control summary').click();
      assert.match(await page.locator('.qv-papr-proposals').textContent(),/Module préparatoire rattaché au cursus PAPR 2027/);
      await page.locator('.qv-papr-control').screenshot({path:path.join(output,'papr-rattachement.png')});
    });
    let unpaid;
    await record('ECAwin is dropdown-only; unpaid event flags and its no-Stat.Com code persist',async()=>{
      const row=(await programme()).canonicalProgramme.rows.find(row=>logic.qvProgrammeInternalManifestation(row)
        && !row.humanDecision && !row.publishedEventId && row.startsAt);assert.ok(row);
      await open(row.id);assert.equal(await page.locator('#qv-programme-ecawin-search').count(),0);
      assert.ok(await page.locator('#qv-programme-ecawin option[value="EXEPRO"]').count());
      assert.equal(await page.locator('#qv-programme-sold').isChecked(),false);
      assert.equal(await page.locator('#qv-programme-ecawin-export').isChecked(),true);
      await page.locator('#qv-programme-participation-evaluation').uncheck();
      await page.locator('#qv-programme-ecawin').selectOption('EXERCI');assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'');
      await save();await open(row.id);unpaid=(await programme()).canonicalProgramme.rows.find(item=>item.id===row.id);
      assert.match(unpaid.businessCode,/^SCOPE-\d{6}$/);assert.equal(unpaid.statCom,'');
      assert.equal(await page.locator('#qv-programme-participation-evaluation').isChecked(),false);
      assert.equal(await page.locator('#qv-programme-ecawin-export').isChecked(),true);
      await page.locator('.qv-programme-preparation').screenshot({path:path.join(output,'manifestation-non-soldee.png')});
    });
    let manual;
    await record('DPS/DAP manifestation prefill follows qualified OI and keeps a manual public choice',async()=>{
      const types=logic.qvProgrammeActivityTypes(await programme());const type=types.find(item=>/^QV26-JOURNEE-DES-FAMILLES-/.test(item.definitionId));assert.ok(type);
      await open('nouveau');await page.locator('#qv-programme-type').selectOption(type.id);
      await page.locator('#qv-programme-oi-summary').click();
      for(const input of await page.locator('#qv-programme-oi input:checked:not([data-qv-oi-group])').all()) await input.uncheck();
      await page.locator('#qv-programme-oi input[value="DPS:G1"]').check();
      assert.ok(await page.locator('#qv-programme-public input[value="GEN:SAPEUR-DPS"]').isChecked());
      assert.ok(await page.locator('#qv-programme-public input[value="FOBA:1"]').isChecked());
      assert.ok(await page.locator('#qv-programme-public input[value="FOBA:2"]').isChecked());
      await page.locator('#qv-programme-oi input[value="DPS:G1"]').uncheck();
      await page.locator('#qv-programme-oi input[value="DAP:Y4"]').check();
      assert.ok(await page.locator('#qv-programme-public input[value="GEN:SAPEUR-DAP"]').isChecked());
      assert.equal(await page.locator('#qv-programme-public input[value="GEN:SAPEUR-DPS"]').isChecked(),false);
      assert.ok(await page.locator('#qv-programme-responsable input[value="C scrt"]').isChecked());
      assert.equal(await page.locator('#qv-programme-responsable-summary').textContent(),'C sct');
      await page.locator('#qv-programme-oi-summary').click();await page.locator('#qv-programme-public-summary').click();
      await page.locator('#qv-programme-public input[value="FOBA:2"]').uncheck();
      await page.locator('#qv-programme-public-free').fill('Invité recette');await page.locator('#qv-programme-public-free').press('Enter');
      await page.locator('#qv-programme-public-summary').click();await page.locator('#qv-programme-oi-summary').click();
      await page.locator('#qv-programme-oi input[value="DAP:Y3"]').check();
      assert.equal(await page.locator('#qv-programme-public input[value="FOBA:2"]').isChecked(),false);
      assert.ok(await page.locator('#qv-programme-public input[data-choice-kind="FREE"]:checked').count());
      await page.locator('#qv-programme-oi-summary').click();
      await page.locator('#qv-programme-date').fill('18.06.2027');await page.locator('#qv-programme-start').fill('19:00');await page.locator('#qv-programme-end').fill('23:00');
      const created=await save(true);manual=created.quoVadis.canonicalProgramme.rows.find(row=>row.id===created.itemId);
      assert.ok(manual);await open(manual.id);
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'');
      assert.ok(manual.publicFreeLabels.includes('Invité recette'));assert.deepEqual(manual.oiSelections.slice().sort(),['DAP:Y3','DAP:Y4']);
      assert.match(manual.businessCode,/^SCOPE-\d{6}$/);assert.notEqual(manual.businessCode,unpaid.businessCode);
      assert.equal(manual.responsibleSelections[0].label,'C sct');
      await page.locator('#qv-programme-oi-summary').click();await page.locator('#qv-programme-oi input[value="DAP:Y2"]').check();
      assert.equal(await page.locator('#qv-programme-public input[value="FOBA:2"]').isChecked(),false);
      assert.ok(await page.locator('#qv-programme-public input[data-choice-kind="FREE"]:checked').count());
      await page.locator('#qv-programme-oi-summary').click();await save();
    });
    await record('mobile manifestation fields remain within the viewport',async()=>{
      await page.setViewportSize({width:390,height:844});await open(manual.id);
      await page.locator('#qv-programme-ecawin').scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      for(const id of ['qv-programme-ecawin','qv-programme-sold','qv-programme-ecawin-export']){
        const box=await page.locator('#'+id).boundingBox();assert.ok(box.x>=0 && box.x+box.width<=390);
      }
      await page.screenshot({path:path.join(output,'manifestation-mobile.png')});
    });
    const final=await programme(),byId=new Map(final.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const row of before) assert.equal(byId.get(row.id)?.statCom,row.statCom,row.id);
    assert.deepEqual(errors,[]);
    const proof={base,results,javascriptErrors:errors,statComCompared:before.length,statComIdentical:before.length,
      productionWrites:false,operationalEventsCreated:0,verdict:'PASS'};
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
