'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('/private/tmp/scope-browser-recipe/node_modules/playwright');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-moa-20261013/browser');
async function finalRecipe(context,page,programme){
  const results=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
  const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
  const dismiss=async()=>{const button=page.getByRole('button',{name:'Fermer la notification'});if(await button.isVisible()) await button.click();};
  const open=async id=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.reload();
    await page.locator('#qv-programme-save:not([disabled])').waitFor();await dismiss();};
  const save=async(action='SAVE',creating=false)=>{
    const pending=page.waitForResponse(response=>response.request().method()===(creating?'POST':'PATCH') && response.url().includes('/programme-items'));
    const labels={SAVE:'Enregistrer',VALIDATE:'Enregistrer et valider'};
    await page.getByRole('button',{name:labels[action],exact:true}).click();const response=await pending,body=await response.json();
    assert.equal(response.status(),creating?201:200,JSON.stringify({error:body.error,message:body.message}));await page.locator('.qv-programme-view').waitFor();await dismiss();return body;
  };
  const initial=await programme(),before=initial.canonicalProgramme.rows.map(row=>({id:row.id,statCom:row.statCom}));
  await record('published PAPR SAVE without changes succeeds without revision',async()=>{
    await open('qv-source-899');assert.equal(await page.locator('#qv-programme-revision-motif').count(),0);
    const result=await save();assert.equal(result.unchanged,true);
  });
  await record('minor published theme edit keeps publication and is visible in immutable history',async()=>{
    await open('qv-source-899');await page.locator('#qv-programme-themes').fill('Thème MOA recette 13.10');await save();
    await open('qv-source-899');const row=(await programme()).canonicalProgramme.rows.find(row=>row.id==='qv-source-899');
    assert.equal(row.publicationRevision.kind,'MINOR');assert.equal(row.publishedEventId,initial.canonicalProgramme.rows.find(row=>row.id==='qv-source-899').publishedEventId);
    await page.locator('#qv-programme-history summary').click();await page.locator('.qv-history-table').waitFor();
    assert.match(await page.locator('.qv-history-table').textContent(),/Thème MOA recette 13\.10/);
    assert.equal(await page.locator('#qv-programme-history input,#qv-programme-history textarea').count(),0);
    await page.locator('#qv-programme-history').screenshot({path:path.join(output,'historique.png')});
  });
  await record('major revision is confirmed in a dedicated required-motif dialog; cancellation preserves draft',async()=>{
    await open('qv-source-899');await page.locator('#qv-papr-propose-ois').click();
    const attempt=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();assert.equal((await attempt).status(),422);
    await page.locator('#qv-workflow-dialog').waitFor();assert.match(await page.locator('#qv-workflow-dialog').textContent(),/Réviser la publication/);
    await page.getByRole('button',{name:'Annuler',exact:true}).click();
    for(const site of ['G1','C1','B1','B2']) assert.ok(await page.locator(`#qv-programme-oi input[value="DPS:${site}"]`).isChecked());
    const retry=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await retry;await page.locator('#qv-workflow-dialog').waitFor();
    await page.locator('#qv-workflow-motif').fill('');await page.getByRole('button',{name:'Confirmer la révision',exact:true}).click();
    assert.ok(await page.locator('#qv-workflow-dialog').isVisible());
    await page.locator('#qv-workflow-motif').fill('Conformité des OI PAPR — recette locale');
    await page.locator('#qv-workflow-dialog').screenshot({path:path.join(output,'confirmation-revision.png')});
    const confirmed=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
    await page.getByRole('button',{name:'Confirmer la révision',exact:true}).click();assert.equal((await confirmed).status(),200);
    await page.locator('.qv-programme-view').waitFor();await dismiss();
    assert.equal((await programme()).canonicalProgramme.rows.find(row=>row.id==='qv-source-899').publicationRevision.status,'PENDING');
  });
  let crimson,occupation,roomLabel;
  await record('CRIMSON non-recurrent paid and non-exported, and CFF resource occupation, persist independently',async()=>{
    await open('nouveau');await page.locator('#qv-programme-activity').fill('Formation CRIMSON opérateurs et chefs VPC');
    await page.locator('#qv-programme-nature').selectOption('SDIS_EXTRAORDINARY');
    await page.locator('#qv-programme-ecawin').selectOption('EXERCI');await page.locator('#qv-programme-statcom').selectOption('0180F7');
    await page.locator('#qv-programme-domain').selectOption('F7');await page.locator('#qv-programme-date').fill('18.06.2027');
    await page.locator('#qv-programme-start').fill('18:00');await page.locator('#qv-programme-end').fill('21:00');
    await page.locator('#qv-programme-sold').check();await page.locator('#qv-programme-ecawin-export').uncheck();
    await page.locator('#qv-programme-lieu').selectOption({label:'Caserne G1'});
    const rooms=await page.locator('#qv-programme-salle option').evaluateAll(nodes=>nodes.filter(node=>node.value).map(node=>({value:node.value,label:node.textContent})));
    assert.ok(rooms.length);roomLabel=rooms[0].label;await page.locator('#qv-programme-salle').selectOption(rooms[0].value);
    const created=await save('VALIDATE',true);crimson=created.quoVadis.canonicalProgramme.rows.find(row=>row.id===created.itemId);
    assert.equal(crimson.statCom,'0180F7');assert.equal(crimson.annualRecurrence,false);assert.equal(crimson.sold,true);assert.equal(crimson.ecawinExport,false);
    await open('nouveau');await page.locator('#qv-programme-activity').fill('Formation CFF à la caserne G1');
    await page.locator('#qv-programme-nature').selectOption('EXTERNAL_OCCUPATION');await page.locator('#qv-programme-domain').selectOption('F5');
    for(const id of ['recurrence','participation-evaluation','sold','ecawin-export']){
      assert.equal(await page.locator('#qv-programme-'+id).isChecked(),false);assert.equal(await page.locator('#qv-programme-'+id).isDisabled(),true);
    }
    await page.locator('#qv-programme-date').fill('18.06.2027');await page.locator('#qv-programme-start').fill('18:00');await page.locator('#qv-programme-end').fill('21:00');
    await page.locator('#qv-programme-lieu').selectOption({label:'Caserne G1'});await page.locator('#qv-programme-salle').selectOption({label:roomLabel});
    const external=await save('SAVE',true);occupation=external.quoVadis.canonicalProgramme.rows.find(row=>row.id===external.itemId);
    assert.equal(occupation.businessCode,'');assert.equal(occupation.externalActivity,true);await open(occupation.id);
    assert.match(await page.locator('.qv-programme-controls').textContent(),/Réservation/);
    await page.locator('.qv-programme-controls').screenshot({path:path.join(output,'controle-reservation.png')});
    await page.locator('#qv-programme-date').fill('19.06.2027');await save();await open(occupation.id);
    assert.equal(await page.locator('.qv-programme-controls').count(),0);
  });
  let typing;
  await record('full search typing remains fluent on 911 occurrences and keeps all characters and filter context',async()=>{
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.reload();await page.locator('#qv-filter-q').waitFor();
    const all=(await programme()).canonicalProgramme.rows.filter(row=>!row.external && !row.jspDirectionReconciliation && row.cursusReconciliation?.status!=='SUPERSEDED_BY_VALIDATED_MODULE');
    assert.equal(all.length,911);
    await page.locator('#qv-filter-q').fill('');await page.waitForTimeout(250);
    await page.evaluate(()=>window.__typingMetrics=[]);
    const start=Date.now();await page.locator('#qv-filter-q').pressSequentially('Exercice PR 1.3',{delay:10});const elapsed=Date.now()-start;
    await page.waitForTimeout(250);assert.equal(await page.locator('#qv-filter-q').inputValue(),'Exercice PR 1.3');
    assert.ok(elapsed<1500,`Typing stalled: ${elapsed}ms`);typing={occurrences:911,milliseconds:elapsed,characters:'Exercice PR 1.3',retained:true};
    await page.locator('.qv-programme-table a').first().click();await page.locator('#qv-programme-save').waitFor();
    await page.getByRole('link',{name:/Retour au programme/}).click();await page.locator('#qv-filter-q').waitFor();
    assert.equal(await page.locator('#qv-filter-q').inputValue(),'Exercice PR 1.3');
  });
  await record('responsible visual grouping and one PR trainer keep multiselection and free values',async()=>{
    await open('qv-source-899');await page.locator('#qv-programme-responsable-summary').click();
    const groups=await page.locator('#qv-programme-responsable fieldset:not([data-free-choices]) legend').allTextContents();
    const expected=['F0','F1/8','F2/3','F4','F5/6','F7','DPS','DAP','JSP','Autres domaines'];
    assert.deepEqual(groups.filter(value=>expected.includes(value)),groups.filter(value=>expected.includes(value)).slice().sort((a,b)=>expected.indexOf(a)-expected.indexOf(b)));
    assert.ok(await page.locator('#qv-programme-responsable').getByText('Chef audiovisuel',{exact:true}).count());
    await page.locator('#qv-programme-responsable-summary').click();await page.locator('#qv-programme-public-summary').click();
    assert.equal(await page.locator('#qv-programme-public').getByText('Formateur PR',{exact:true}).count(),1);
    await page.locator('#qv-programme-public-summary').click();
  });
  const screenshots=[];
  await record('PR DPS DAP F0 and external forms align on desktop, laptop and mobile',async()=>{
    const qv=await programme();const rows=qv.canonicalProgramme.rows;
    const examples=[['PR','qv-source-899'],['DPS',rows.find(row=>row.domain==='DPS' && !row.external && !row.publishedEventId).id],
      ['DAP',rows.find(row=>row.domain==='DAP' && !row.external).id],['F0',rows.find(row=>row.domain==='F0' || row.programmeDomain==='F0').id],['externe',occupation.id]];
    for(const [device,viewport] of [['desktop',{width:1440,height:1100}],['portable',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
      await page.setViewportSize(viewport);
      for(const [domain,id] of examples){
        await open(id);await page.locator('.qv-programme-preparation').scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),device+': page overflow');
        const boxes=await page.locator('.qv-programme-edit-grid>label>input,.qv-programme-edit-grid>label>select,.qv-programme-choice-field>select').evaluateAll(nodes=>nodes.filter(node=>node.type!=='checkbox' && node.getClientRects().length).map(node=>{
          const rect=node.getBoundingClientRect();return {id:node.id,x:rect.x,right:rect.right,width:rect.width,height:rect.height};}));
        assert.ok(boxes.every(box=>box.x>=0 && box.right<=viewport.width && box.height>=38 && box.height<=40),JSON.stringify({device,domain,boxes}));
        const file=`${device}-${domain}.png`;await page.locator('.qv-programme-preparation').screenshot({path:path.join(output,file)});screenshots.push(file);
      }
    }
  });
  await page.setViewportSize({width:1440,height:1100});
  await record('withdrawal requires motive in dedicated dialog and leaves published/history data intact',async()=>{
    await open(crimson.id);await page.getByRole('button',{name:'Retirer la validation',exact:true}).click();await page.locator('#qv-workflow-dialog').waitFor();
    assert.match(await page.locator('#qv-workflow-dialog').textContent(),/Formation CRIMSON/);
    await page.getByRole('button',{name:'Confirmer le retrait',exact:true}).click();assert.ok(await page.locator('#qv-workflow-dialog').isVisible());
    await page.locator('#qv-workflow-motif').fill('Retrait validé par la recette MOA');
    await page.locator('#qv-workflow-dialog').screenshot({path:path.join(output,'confirmation-retrait.png')});
    const response=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
    await page.getByRole('button',{name:'Confirmer le retrait',exact:true}).click();assert.equal((await response).status(),200);await dismiss();
    assert.ok((await programme()).canonicalProgramme.rows.find(row=>row.id===crimson.id).validationWithdrawal);
  });
  await record('cycle, annual validation and PAPR controls remain in existing parameter views',async()=>{
    await page.goto(base+'/scope.html#/quo-vadis/regles');await page.reload();await page.locator('#qv-cycle-end').waitFor({state:'attached'});
    assert.equal(await page.locator('#qv-cycle-end').inputValue(),'2028-02-10');assert.ok(await page.locator('#qv-programme-status').count());
    await page.goto(base+'/scope.html#/quo-vadis/cursus');await page.reload();await page.locator('.qv-papr-control').waitFor();
    await page.locator('.qv-papr-control summary').click();assert.equal(await page.locator('.qv-papr-proposals tbody tr').count(),7);
  });
  const final=await programme(),byId=new Map(final.canonicalProgramme.rows.map(row=>[row.id,row]));
  for(const row of before) assert.equal(byId.get(row.id).statCom,row.statCom,row.id);assert.deepEqual(errors,[]);
  const proof={results,typing,screenshots,javascriptErrors:errors,statComCompared:before.length,statComIdentical:before.length,
    productionWrites:false,temporaryProgrammeFixtures:2,verdict:'PASS'};
  fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
async function run(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage();
    await page.addInitScript(()=>{window.__typingMetrics=[];
      document.addEventListener('input',event=>{if(event.target.id!=='qv-filter-q') return;
        const start=performance.now();queueMicrotask(()=>window.__typingMetrics.push(performance.now()-start));},true);
    });
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    if(process.argv.includes('--capture-pr')){
      await page.goto(base+'/scope.html#/quo-vadis/programme/qv-source-899');await page.locator('#qv-papr-propose-ois').waitFor();
      await page.locator('#qv-papr-propose-ois').click();await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
      await page.locator('#qv-workflow-dialog').waitFor();
      const response=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
      await page.getByRole('button',{name:'Confirmer la révision',exact:true}).click();assert.equal((await response).status(),200);
      for(const [device,viewport] of [['desktop',{width:1440,height:1100}],['portable',{width:1280,height:800}],['mobile',{width:390,height:844}]]){
        await page.setViewportSize(viewport);await page.goto(base+'/scope.html#/quo-vadis/programme/qv-source-899');await page.reload();
        await page.locator('#qv-programme-save').waitFor();const close=page.getByRole('button',{name:'Fermer la notification'});if(await close.isVisible()) await close.click();
        await page.locator('.qv-programme-preparation').screenshot({path:path.join(output,`${device}-PR.png`)});
        const label=await page.locator('#qv-programme-confirm-impact').locator('..').boundingBox();
        const checkbox=await page.locator('#qv-programme-confirm-impact').boundingBox();assert.ok(checkbox.x+checkbox.width<label.x+label.width);
      }
      console.log('PASS targeted PR checkbox alignment after visual adjustment');return;
    }
    if(!process.argv.includes('--baseline')){await finalRecipe(context,page,programme);return;}
    const qv=await programme();
    const active=qv.canonicalProgramme.rows.filter(row=>!row.external && !row.jspDirectionReconciliation
      && row.cursusReconciliation?.status!=='SUPERSEDED_BY_VALIDATED_MODULE');
    const started=Date.now();await page.locator('#qv-filter-q').pressSequentially('Exercice PR 1.3',{delay:20});
    assert.equal(await page.locator('#qv-filter-q').inputValue(),'Exercice PR 1.3');
    const typingMilliseconds=Date.now()-started,typing=await page.evaluate(()=>window.__typingMetrics);
    const fields=[];
    const open=async row=>{await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(row.id));await page.reload();
      await page.locator('#qv-programme-save:not([disabled])').waitFor();};
    for(const domain of ['PR','DPS','DAP','F0']){
      const row=active.find(row=>row.domain===domain || row.programmeDomain===domain || row.functionalDomain===domain);
      if(!row) continue;await open(row);
      await page.locator('.qv-programme-preparation').screenshot({path:path.join(output,`baseline-${domain}.png`)});
      fields.push({domain,id:row.id});
    }
    await open(active.find(row=>row.id==='qv-source-899'));
    const response=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
    await page.getByRole('button',{name:'Enregistrer',exact:true}).click();const saved=await response,body=await saved.json();
    const proof={head:'2d70837773f86e457cfbd5f570f1cf647a1b8274',activeOccurrences:active.length,
      rawOccurrences:qv.canonicalProgramme.rows.length,typing:{milliseconds:typingMilliseconds,handlers:typing,
        maxHandlerMs:Math.max(...typing),charactersRetained:true},forms:fields,
      paprNoChange:{status:saved.status(),error:body.error || null},productionWrites:false};
    fs.writeFileSync(path.join(output,'baseline.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
