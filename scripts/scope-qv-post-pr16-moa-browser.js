'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410',root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-post-pr16-moa-20261014/browser');
async function run(){
  fs.mkdirSync(directory,{recursive:true});const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],scenarios=[],layouts=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    const open=async id=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-save').waitFor({timeout:60000});};
    const dismiss=async()=>{const close=page.getByRole('button',{name:'Fermer la notification'});if(await close.isVisible()) await close.click();};
    // Before images use the actual main UI, on the same authorized business snapshot and clone.
    for(const file of ['assets/js/scope-ui.js','assets/js/scope-ui-logic.js','assets/css/scope.css']) await page.route('**/'+file+'*',route=>
      route.fulfill({status:200,contentType:file.endsWith('.css')?'text/css':'application/javascript',body:execFileSync('git',['show','160eb54:'+file],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024})}));
    await open('QV27:PAPR:M03');await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'history-before-main.png')});
    await page.locator('.qv-programme-parameters').screenshot({path:path.join(directory,'parameters-before-main.png')});
    await page.unrouteAll({behavior:'wait'});await page.reload();await page.locator('#qv-programme-save').waitFor();
    for(const width of [1440,1100,768,390]){
      await page.setViewportSize({width,height:1100});const layout=await page.locator('.qv-programme-parameters').evaluate(node=>{
        const box=node.getBoundingClientRect(),select=node.querySelector('select').getBoundingClientRect();
        const items=[...node.querySelectorAll('input[type=checkbox]')].map(input=>{const b=input.getBoundingClientRect(),s=input.nextElementSibling.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,labelX:s.x,labelRight:s.right,labelBottom:s.bottom,center:b.y+b.height/2};});
        return {box:{x:box.x,right:box.right,width:box.width},select:{center:select.y+select.height/2},items,overflow:node.scrollWidth>node.clientWidth};});
      assert.equal(layout.overflow,false,JSON.stringify(layout));assert.ok(layout.items.every(item=>item.labelX>=item.x+item.w && item.labelRight<=layout.box.right+1));
      if(width===1440) assert.ok(layout.items.every(item=>Math.abs(item.center-layout.select.center)<2));
      layouts.push({width,...layout});await page.locator('.qv-programme-parameters').screenshot({path:path.join(directory,`parameters-after-${width}.png`)});
    }
    scenarios.push('Regular form grid: 1440/1100/768/390px, controls retain functionality and no text overlap');await page.setViewportSize({width:1440,height:1100});
    await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    assert.equal(await page.locator('.qv-history-table th').count(),7);assert.equal(await page.locator('.qv-history-changes').count(),0);
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'history-after.png')});
    await page.setViewportSize({width:390,height:1100});
    const historyLayout=await page.locator('.qv-history-table').evaluate(table=>({
      widths:[...table.querySelectorAll('th')].map(th=>th.getBoundingClientRect().width),
      bounded:table.closest('.scope-table-wrap').getBoundingClientRect().right<=innerWidth,
      localScroll:table.closest('.scope-table-wrap').scrollWidth>table.closest('.scope-table-wrap').clientWidth}));
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'history-after-mobile.png')});
    assert.ok(historyLayout.widths.every(width=>width>=80) && historyLayout.bounded && historyLayout.localScroll,JSON.stringify(historyLayout));
    await page.setViewportSize({width:1440,height:1100});
    scenarios.push('Existing PAPR history directly readable in seven columns, no change dropdown');
    await open('QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S2');
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/PLANIF-|QV-/);
    await page.locator('#qv-programme-date').fill('21.05.2027');await page.locator('#qv-programme-date').dispatchEvent('change');
    assert.match(await page.locator('#qv-programme-live-controls').innerText(),/Interdit|Interdite/);
    await page.locator('#qv-programme-live-controls').screenshot({path:path.join(directory,'live-day-control.png')});
    await page.locator('#qv-programme-date').fill('18.05.2027');await page.locator('#qv-programme-date').dispatchEvent('change');
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/Vendredi/);
    scenarios.push('Forbidden projected DPS date detected while editing and cleared without saving after correction');
    const data=(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const osr=data.canonicalProgramme.rows.find(row=>row.definitionId==='QV26-MISE-A-NIVEAU-ANNUELLE-OSR-9977BB10');assert.ok(osr);
    await open(osr.id);assert.equal(await page.locator('#qv-programme-date').inputValue(),'08.10.2027');
    assert.equal(await page.locator('#qv-programme-start').inputValue(),'08:00');assert.equal(await page.locator('#qv-programme-end').inputValue(),'16:00');
    await page.locator('#qv-programme-public-summary').click();
    const group=page.locator('#qv-programme-public fieldset').filter({has:page.locator('legend').filter({hasText:/^Opérationnel$/})});
    assert.deepEqual(await group.locator('label span').allTextContents(),['OSR','CI DPS','Candidat CI DPS','CI DAP','Candidat CI DAP']);
    assert.match(await page.locator('#qv-programme-public-summary').innerText(),/^OSR/);
    await group.screenshot({path:path.join(directory,'public-operational.png')});
    await page.locator('#qv-programme-public-summary').click();await page.locator('#qv-programme-date').dispatchEvent('change');
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/Vendredi.*Interdit/);
    await page.screenshot({path:path.join(directory,'osr-friday.png')});scenarios.push('Actual OSR daytime Friday accepted; exact operational group and OSR-first selected display');
    const cff=data.canonicalProgramme.rows.find(row=>row.manualCreation && row.label==='Formation personnel CFF' && row.startsAt?.startsWith('2027-02-26'));assert.ok(cff);
    await open(cff.id);await page.locator('#qv-programme-salle').selectOption('');
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/Réservation/);
    assert.match(await page.locator('.qv-programme-reference-body > p').innerText(),/Occupation externe.*Sans cycle métier SDIS.*non reconduite automatiquement/);
    const codir=data.canonicalProgramme.rows.find(row=>row.label==='Séance Codir' && row.startsAt?.startsWith('2027-02-26'));
    assert.ok(codir?.salleTheorieId);await page.locator('#qv-programme-salle').selectOption(codir.salleTheorieId);
    assert.match(await page.locator('#qv-programme-live-controls').innerText(),/Réservation/);
    await page.locator('#qv-programme-salle').selectOption(cff.salleTheorieId);
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/Réservation/);
    await page.screenshot({path:path.join(directory,'cff-resources.png')});scenarios.push('CFF no room/no exclusive site; actual same Codir room conflicts, Oxygen clears the conflict before save');
    await open('QV27:DAP-GROUP:1.2');assert.match(await page.locator('#qv-programme-live-controls').innerText(),/13.05.2027/);
    await page.locator('[data-qv-proposed-date="2027-05-13"]').click();assert.equal(await page.locator('#qv-programme-date').inputValue(),'13.05.2027');
    await page.screenshot({path:path.join(directory,'dap-proposal.png')});scenarios.push('DAP proposal remains a modifiable suggestion in dd.mm.yyyy, no replacement of decisions');
    await open('nouveau');await page.locator('#qv-programme-activity').fill('Occupation recette ciblée post PR16');
    await page.locator('#qv-programme-domain').selectOption('F5');
    await page.locator('#qv-programme-nature').selectOption('EXTERNAL_OCCUPATION');await page.locator('#qv-programme-date').fill('26.02.2027');
    await page.locator('#qv-programme-start').fill('08:00');await page.locator('#qv-programme-end').fill('17:00');await page.locator('#qv-programme-lieu').selectOption({label:'Caserne G1'});
    const createdPromise=page.waitForResponse(response=>response.url().endsWith('/programme-items') && response.request().method()==='POST');
    await page.locator('#qv-programme-save').click();const created=await (await createdPromise).json();assert.ok(created.updated,
      JSON.stringify({error:created.error,message:created.message,reason:created.reason}));
    await page.locator('#qv-filter-q').waitFor();await dismiss();const newRow=created.quoVadis.canonicalProgramme.rows.find(row=>row.label==='Occupation recette ciblée post PR16');assert.ok(newRow);
    await open(newRow.id);await page.waitForLoadState('networkidle');await page.waitForTimeout(400);
    await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    await page.waitForTimeout(200);
    if(!await page.locator('#qv-programme-history').evaluate(panel=>panel.open)) await page.locator('#qv-programme-history summary').click();
    await page.locator('.qv-history-table').waitFor({state:'visible'});
    assert.equal(await page.locator('[data-qv-transaction]').count(),1);assert.match(await page.locator('.qv-history-table').innerText(),/Création manuelle de l’événement/);
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'manual-creation-history.png')});scenarios.push('Actual clone manual creation journals exactly one creation row');
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-q').waitFor();await page.locator('#qv-filter-q').fill('Zôtres');await page.waitForTimeout(300);
    const downloads=[];
    for(const mode of ['annual','compact','monthly']){
      await page.locator('#qv-export-programme-variant').selectOption(mode);
      if(mode==='monthly') await page.locator('#qv-filter-month').selectOption('2027-02');
      await page.locator('#qv-export-programme-pdf').click();await page.getByRole('button',{name:'Télécharger',exact:true}).waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].some(canvas=>{
        if(!canvas.width || !canvas.height || !canvas.getBoundingClientRect().width) return false;
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let ink=0;for(let i=0;i<pixels.length;i+=64) if(pixels[i+3]>0 && Math.min(pixels[i],pixels[i+1],pixels[i+2])<180) ink++;
        return ink>100;
      }),null,{timeout:30000});
      await page.screenshot({path:path.join(directory,`pdf-preview-${mode}.png`)});
      const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger',exact:true}).click();const download=await promise;
      assert.equal(download.suggestedFilename(),mode==='monthly'?'SCOPE_QUO_VADIS_2027-02_Planning_mensuel.pdf':`QUO VADIS 2027, ${mode==='annual'?'Planning annuel':'Liste compacte'}.pdf`);
      await download.saveAs(path.join(directory,download.suggestedFilename()));downloads.push({mode,filename:download.suggestedFilename()});
      await page.getByRole('button',{name:'Fermer',exact:true}).click();await dismiss();
    }
    scenarios.push('All three existing PDF previews and downloads preserve filters');assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify({status:'PASS',productionWrites:false,auth:'LOCAL',sourceBaseline:'160eb54',
      volume:data.canonicalProgramme.rows.length,scenarios,layouts,downloads,javascriptErrors:errors},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',scenarios:scenarios.length,downloads}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
