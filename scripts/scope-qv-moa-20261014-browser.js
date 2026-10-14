'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410',root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-moa-20261014/browser');
async function run(){
  fs.mkdirSync(directory,{recursive:true});const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],scenarios=[],calendars=[],downloads=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    const open=async id=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-save').waitFor({timeout:60000});};
    const dismiss=async()=>{const close=page.getByRole('button',{name:'Fermer la notification'});if(await close.isVisible()) await close.click();};
    const target='QV27:MANUAL:7cad2053-a78e-4299-bb7d-8e2bdeae2aa0';
    for(const file of ['assets/js/scope-ui.js','assets/js/scope-ui-logic.js','assets/css/scope.css']) await page.route('**/'+file+'*',route=>
      route.fulfill({status:200,contentType:file.endsWith('.css')?'text/css':'application/javascript',body:execFileSync('git',['show','6666e2c:'+file],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024})}));
    await open(target);await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'cancellation-before-main.png')});
    await page.unrouteAll({behavior:'wait'});await page.reload();await page.locator('#qv-programme-save').waitFor();
    await page.waitForTimeout(600);await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    const history=await page.locator('.qv-history-table tr').filter({hasText:'Annulation'}).innerText();
    assert.doesNotMatch(history,/Non enregistré|Lieu|Thème/);assert.match(history,/reconduction conservée/);
    assert.match(await page.locator('.qv-programme-preparation').innerText(),/Occurrence annulée.*paramètres.*historique/);
    assert.match(await page.locator('#qv-programme-public-summary').innerText(),/Échelon II et III/);
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'cancellation-after.png')});
    scenarios.push('Existing cancelled coordination preserved; legacy partial cancellation displays one real action; public II/III combined');
    await open('qv-source-918');
    assert.match(await page.locator('#qv-programme-live-controls').innerText(),/État-major.*18:00–21:00/);
    assert.match(await page.locator('#qv-programme-live-controls').innerText(),/C for|Chef formation/);
    assert.match(await page.locator('#qv-programme-live-controls').innerText(),/prioritaire.*Repositionnement/);
    await page.locator('#qv-programme-live-controls').screenshot({path:path.join(directory,'em-jsp-conflicts.png')});
    const snapshot=(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const oxy=snapshot.sallesTheorie.find(room=>room.libelle==='Oxygène');assert.ok(oxy);
    await page.locator('#qv-programme-salle').selectOption(oxy.salleId);
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/État-major :/);
    assert.match(await page.locator('#qv-programme-live-controls').innerText(),/Participation commune/);
    await page.locator('#qv-programme-salle').selectOption('');
    assert.doesNotMatch(await page.locator('#qv-programme-live-controls').innerText(),/Réservation/);
    scenarios.push('Same room conflict updates immediately; Oxygen independent; no room creates no booking; personnel alert retained');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:850});
      await page.locator('#qv-programme-date').fill('16.02.2027');
      await page.locator('#qv-programme-date-picker').scrollIntoViewIfNeeded();
      await page.evaluate(()=>{const field=document.getElementById('qv-programme-date-picker');scrollBy(0,field.getBoundingClientRect().top-innerHeight+90);});
      await page.locator('#qv-programme-date-picker').click();
      const calendar=page.locator('#qv-programme-calendar');
      const measure=()=>calendar.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,
        placement:node.dataset.placement,cells:node.querySelector('.qv-programme-calendar-days').children.length,
        visible:b.x>=0 && b.y>=0 && b.right<=innerWidth && b.bottom<=innerHeight};});
      const first=await measure();assert.equal(first.cells,49);assert.equal(first.visible,true);assert.equal(first.placement,'above');
      for(const month of ['2027-03','2027-04','2027-05']){
        await calendar.locator(`[data-qv-calendar-month="${month}"]`).click();const next=await measure();
        assert.deepEqual(next,first);calendars.push({width,month,...next});
      }
      const colors=await calendar.evaluate(node=>{
        const probe=document.createElement('div');probe.style.display='none';document.body.appendChild(probe);
        probe.innerHTML='<span class="qv-mini-day is-school-break"></span><span class="qv-mini-day is-holiday"><span></span></span>';
        const color=element=>getComputedStyle(element).backgroundColor;
        const result={vacation:color(node.querySelector('button.is-vacation')),holiday:color(node.querySelector('button.is-holiday')),
          annualVacation:color(probe.firstElementChild),annualHoliday:color(probe.lastElementChild.firstElementChild),
          weekend:color(node.querySelector('button.is-weekend'))};probe.remove();return result;
      });
      assert.equal(colors.vacation,colors.annualVacation);assert.equal(colors.holiday,colors.annualHoliday);
      assert.equal(colors.weekend,'rgb(247, 248, 250)');calendars.push({width,colors});
      await calendar.screenshot({path:path.join(directory,`calendar-stable-${width}.png`)});
      await calendar.locator('[data-qv-calendar-date="2027-05-03"]').click();assert.equal(await page.locator('#qv-programme-date').inputValue(),'03.05.2027');
      assert.equal(await calendar.isVisible(),false);
    }
    scenarios.push('Six-week calendar stable desktop/mobile; exact annual Agenda holiday/vacation colors; lighter weekends; direct European date selection');
    await page.setViewportSize({width:1440,height:1100});await open('QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S2');
    await page.locator('#qv-programme-date').fill('25.04.2027');await page.locator('#qv-programme-date').dispatchEvent('change');
    await page.locator('.qv-programme-date-alert').waitFor();assert.match(await page.locator('.qv-programme-date-alert').innerText(),/25.04.2027/);
    await page.locator('#qv-programme-live-controls').screenshot({path:path.join(directory,'date-alert.png')});
    await page.locator('#qv-programme-date').fill('27.04.2027');await page.locator('#qv-programme-date').dispatchEvent('change');
    assert.equal(await page.locator('.qv-programme-date-alert').count(),0);
    scenarios.push('Separate light-red date warning clears on a conforming day without saving or changing a human date');
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-salle').waitFor();
    await page.locator('#qv-filter-lieu').selectOption({label:'Caserne G1'});
    const em=snapshot.sallesTheorie.find(room=>room.libelle==='État-major');assert.ok(em);
    await page.locator('#qv-filter-salle').selectOption(em.salleId);await page.locator('#qv-filter-month').selectOption('2027-08');
    assert.match(await page.locator('.qv-room-occupations').innerText(),/Réservation clone intercycle.*État-major.*2028/s);
    await page.locator('.qv-room-occupations').screenshot({path:path.join(directory,'room-filter-other-cycle.png')});
    await page.locator('#qv-filter-lieu').selectOption({label:'Caserne C1'});assert.equal(await page.locator('#qv-filter-salle').inputValue(),'tous');
    assert.ok(!(await page.locator('#qv-filter-salle option').allTextContents()).includes('État-major'));
    scenarios.push('Room filter limited by location, effective other-cycle clone reservation visible; location change resets only room filter');
    await open('nouveau');await page.locator('#qv-programme-activity').fill('Recette MOA 14 famille annulation');
    await page.locator('#qv-programme-domain').selectOption('F1');await page.locator('#qv-programme-statcom').selectOption('070F23');
    await page.locator('#qv-programme-oi-summary').click();await page.locator('#qv-programme-oi input[value="DAP:Y1"]').check();
    await page.locator('#qv-programme-oi-summary').click();await page.locator('#qv-programme-family').selectOption('DAP');
    await page.locator('#qv-programme-date').fill('25.08.2027');await page.locator('#qv-programme-start').fill('19:00');await page.locator('#qv-programme-end').fill('21:00');
    const creationResponse=page.waitForResponse(response=>response.url().endsWith('/programme-items') && response.request().method()==='POST');
    await page.locator('#qv-programme-save').click();const created=await (await creationResponse).json();assert.ok(created.created,JSON.stringify(created));
    await open(created.itemId);await dismiss();assert.equal(await page.locator('#qv-programme-family').inputValue(),'DAP');
    const cancel=page.locator('#qv-programme-cancel-year');await cancel.click();const dialog=page.locator('#qv-workflow-dialog');
    assert.match(await dialog.innerText(),/25.08.2027.*19:00.*21:00.*Y1.*2027/s);
    await dialog.getByRole('button',{name:'Conserver l’activité',exact:true}).click();await dialog.waitFor({state:'detached'});
    await cancel.click();await dialog.getByRole('button',{name:'Confirmer l’annulation',exact:true}).click();assert.equal(await dialog.isVisible(),true);
    await dialog.locator('textarea').fill('Recette navigateur motivée, clone avec rollback.');
    await dialog.screenshot({path:path.join(directory,'cancellation-confirmation.png')});
    const cancelResponse=page.waitForResponse(response=>response.url().includes('/programme-items/') && response.request().method()==='PATCH');
    await dialog.getByRole('button',{name:'Confirmer l’annulation',exact:true}).click();assert.ok((await (await cancelResponse).json()).updated);
    await dismiss();await open(created.itemId);await page.waitForTimeout(600);
    await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    assert.equal(await page.locator('.qv-history-table tbody tr').filter({hasText:'Annulation'}).count(),1);
    assert.doesNotMatch(await page.locator('.qv-history-table tbody tr').filter({hasText:'Annulation'}).innerText(),/Non enregistré/);
    await page.locator('#qv-programme-history').screenshot({path:path.join(directory,'motivated-cancellation-history.png')});
    scenarios.push('F1 + DAP Y1 family saved and reopened; cancellation can be declined, requires reason, records exactly one actual action');
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-q').waitFor();
    await page.locator('#qv-filter-reset').click();await page.locator('#qv-filter-q').fill('État-major');await page.waitForTimeout(350);
    assert.ok(await page.locator('.qv-programme-table tbody tr').count()>1);
    for(const mode of ['annual','compact','monthly']){
      await page.locator('#qv-export-programme-variant').selectOption(mode);
      if(mode==='monthly') await page.locator('#qv-filter-month').selectOption('2027-01');
      await page.locator('#qv-export-programme-pdf').click();await page.getByRole('button',{name:'Télécharger',exact:true}).waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].some(canvas=>{
        if(!canvas.width || !canvas.height || !canvas.getBoundingClientRect().width) return false;
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let ink=0;for(let i=0;i<pixels.length;i+=64) if(pixels[i+3]>0 && Math.min(pixels[i],pixels[i+1],pixels[i+2])<180) ink++;
        return ink>100;
      }));
      await page.screenshot({path:path.join(directory,`pdf-${mode}.png`)});
      const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Télécharger',exact:true}).click();const download=await pending;
      const filename=download.suggestedFilename();assert.equal(filename,`QUO VADIS 2027, ${mode==='monthly'?'Planning mensuel - Janvier':mode==='annual'?'Planning annuel':'Liste compacte'}.pdf`);
      downloads.push(filename);await page.getByRole('button',{name:'Fermer',exact:true}).click();
    }
    scenarios.push('Programme search remains reactive; three nonblank PDF previews download with exact dynamic names');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(directory,'recipe.json'),JSON.stringify({status:'PASS',productionWrites:false,auth:'LOCAL',scenarios,calendars,downloads,errors},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',scenarios:scenarios.length,errors,downloads}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
