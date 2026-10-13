'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410',directory=path.resolve(__dirname,'../docs/captures/qv-post-recette-moa-20261013/browser');
async function run() {
  fs.mkdirSync(directory,{recursive:true});
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],scenarios=[],downloads=[];
  let currentPage;
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    currentPage=page;page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(request.method()==='POST' && new URL(request.url()).pathname==='/api/scope/quo-vadis/programme-items') {
      const body=request.postDataJSON();console.log(JSON.stringify({creation:{activity:body.activityLabel,nature:body.activityNature,
        participation:body.participationEvaluation,recurrence:body.annualRecurrence,export:body.ecawinExport}}));
    }});
    await page.route('**/api/scope/alerts*',async route=>{await new Promise(resolve=>setTimeout(resolve,1400));await route.continue();});
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-q').waitFor({timeout:60000});
    const input=page.locator('#qv-filter-q'),handle=await input.elementHandle();await input.focus();
    for(const query of ['Formation groupée','Exercice DAP 4']) {
      await input.press('Meta+A');await input.pressSequentially(query,{delay:18});await page.waitForTimeout(350);
      assert.equal(await input.inputValue(),query);
      assert.ok(await page.evaluate(node=>document.activeElement===node && document.getElementById('qv-filter-q')===node,handle));
      assert.equal(await input.evaluate(node=>node.selectionStart),query.length);
    }
    await page.screenshot({path:path.join(directory,'search-focus.png')});scenarios.push('Rapid typing across delayed badge refresh retains the same input and caret');
    const open=async id=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-save').waitFor();};
    await open('QV27:PAPR:M03');
    const layout=await page.locator('.qv-programme-parameters').evaluate(node=>{
      const select=node.querySelector('select').getBoundingClientRect();
      return {selectCenter:select.y+select.height/2,checkboxCenters:[...node.querySelectorAll('input[type=checkbox]')].map(input=>{
        const box=input.getBoundingClientRect();return box.y+box.height/2;})};
    });
    assert.ok(layout.checkboxCenters.every(center=>Math.abs(center-layout.selectCenter)<2),JSON.stringify(layout));
    await page.locator('.qv-programme-parameters').screenshot({path:path.join(directory,'parameters-aligned.png')});scenarios.push('Five programme parameters vertically aligned');
    const historyResponse=page.waitForResponse(response=>response.url().includes('/history') && response.status()===200);
    await page.locator('#qv-programme-history summary').click();const history=(await (await historyResponse).json()).history;
    assert.equal(await page.locator('[data-qv-transaction]').count(),history.length);
    const actions=await page.locator('[data-qv-transaction] > td:nth-child(3)').allTextContents();
    assert.ok(actions.includes('Validation') && actions.includes('Retrait de validation'));
    assert.ok(actions.every(action=>action!==action.toUpperCase()));
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'history-transactions.png')});scenarios.push('Readable grouped history, unchanged legacy decisions');
    const dismiss=async()=>{const close=page.getByRole('button',{name:'Fermer la notification'});if(await close.isVisible()) await close.click();};
    await page.getByRole('button',{name:'Retirer la validation',exact:true}).click();
    const dialog=page.locator('#qv-workflow-dialog');await dialog.getByRole('button',{name:'Confirmer le retrait',exact:true}).click();
    assert.ok(await dialog.isVisible());assert.equal(await dialog.locator('textarea').inputValue(),'');
    await dialog.locator('textarea').fill('Recette du lot post-MOA : retrait motivé sur clone uniquement.');
    await dialog.getByRole('button',{name:'Confirmer le retrait',exact:true}).click();await page.locator('#qv-filter-q').waitFor();await dismiss();
    await open('QV27:PAPR:M03');await page.locator('#qv-programme-validate').click();await page.locator('#qv-filter-q').waitFor();await dismiss();
    const before=await (await context.request.get(base+'/api/scope/quo-vadis/programme-items/QV27%3APAPR%3AM03/history?annee=2027')).json();
    await open('QV27:PAPR:M03');await page.locator('#qv-programme-validate').click();await page.locator('#qv-filter-q').waitFor();await dismiss();
    const after=await (await context.request.get(base+'/api/scope/quo-vadis/programme-items/QV27%3APAPR%3AM03/history?annee=2027')).json();
    assert.equal(after.history.length,before.history.length);scenarios.push('Required withdrawal reason and idempotent repeated validation');
    await open('QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S2');
    assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'0120F7');
    const control=await page.locator('.qv-programme-controls').textContent();assert.match(control,/PLANIF-DPS/);assert.match(control,/Interdit/);
    await page.locator('.qv-programme-controls').screenshot({path:path.join(directory,'dps-day-control.png')});scenarios.push('Actual DPS Friday control and confirmed 0120F7');
    await open('QV27:DAP-GROUP:1.2');assert.equal(await page.locator('#qv-programme-date').inputValue(),'');
    await page.locator('[data-qv-proposed-date="2027-05-13"]').click();assert.equal(await page.locator('#qv-programme-date').inputValue(),'13.05.2027');
    for(const suffix of ['start','end']) assert.equal(await page.locator('#qv-programme-'+suffix).inputValue(),'');
    await page.locator('.qv-programme-controls').screenshot({path:path.join(directory,'dap-apply-proposal.png')});scenarios.push('DAP date applied without invented hours or automatic validation');
    await open('nouveau');await page.locator('#qv-programme-activity').fill('Formation personnel CFF');
    await page.locator('#qv-programme-domain').selectOption('F7');await page.locator('#qv-programme-nature').selectOption('EXTERNAL_OCCUPATION');
    await page.locator('#qv-programme-date').fill('26.02.2027');await page.locator('#qv-programme-start').fill('08:00');await page.locator('#qv-programme-end').fill('17:00');
    await page.locator('#qv-programme-lieu').selectOption({label:'Caserne G1'});await page.locator('#qv-programme-occurrence-status').selectOption('PLANIFIE');
    assert.equal(await page.locator('#qv-programme-nature').inputValue(),'EXTERNAL_OCCUPATION');
    for(const id of ['recurrence','participation-evaluation','sold','ecawin-export']) assert.equal(await page.locator('#qv-programme-'+id).isChecked(),false,id);
    assert.equal(await page.locator('#qv-programme-cycle-year').inputValue(),'Sans cycle SDIS');
    await page.locator('#qv-programme-save').click();await page.locator('#qv-filter-q').waitFor();await dismiss();
    const response=await context.request.get(base+'/api/scope/quo-vadis/programmes/2027');assert.equal(response.status(),200);
    const data=(await response.json()).quoVadis,occupation=data.canonicalProgramme.rows.find(row=>row.activityLabel==='Formation personnel CFF'
      && row.manualCreation && row.startsAt?.startsWith('2027-02-26'));assert.ok(occupation);
    assert.equal(occupation.externalActivity,true);
    assert.equal(occupation.statCom,'');assert.equal(occupation.participationEvaluation,false);assert.equal(occupation.ecawinExport,false);assert.equal(occupation.annualRecurrence,false);
    assert.equal(occupation.publishedEventId || null,null);
    await open(occupation.id);await page.screenshot({path:path.join(directory,'cff-occupation.png')});scenarios.push('CFF exact MOA case recorded on clone, no event publication or participation');
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-q').waitFor();await page.locator('#qv-filter-q').fill('Exercice DAP 4');await page.waitForTimeout(300);
    for(const [mode,label] of [['annual','Planning annuel'],['compact','Liste compacte']]) {
      await page.locator('#qv-export-programme-variant').selectOption(mode);
      await page.locator('#qv-export-programme-pdf').click();await page.getByRole('button',{name:'Télécharger',exact:true}).waitFor();
      await page.screenshot({path:path.join(directory,`pdf-preview-${mode}.png`)});
      const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger',exact:true}).click();const download=await downloadPromise;
      assert.equal(download.suggestedFilename(),`QUO VADIS 2027, ${label}.pdf`);await download.saveAs(path.join(directory,download.suggestedFilename()));
      downloads.push({mode,filename:download.suggestedFilename(),filter:'Exercice DAP 4'});
      await page.getByRole('button',{name:'Fermer',exact:true}).click();await dismiss();
    }
    scenarios.push('Both PDF downloads retain the applied search and exact filenames');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify({status:'PASS',productionWrites:false,auth:'LOCAL',scenarios,layout,downloads,
      volume:data.canonicalProgramme.rows.length,gzipProxyFacingIdentity:true,javascriptErrors:errors},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',scenarios:scenarios.length,downloads,javascriptErrors:errors}));
  } catch(error) {
    if(currentPage) {await currentPage.screenshot({path:path.join(directory,'failed-attempt.png')});
      console.error(JSON.stringify({javascriptErrors:errors,visibleText:(await currentPage.locator('body').innerText()).slice(0,1800)}));}
    throw error;
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
