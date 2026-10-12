'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-moa-correctifs-20261010');
async function run(){
  fs.mkdirSync(output,{recursive:true});
  const results=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const rows=data=>data.canonicalProgramme.rows.filter(row=>!row.external && !row.jspDirectionReconciliation
      && row.cursusReconciliation?.status !== 'SUPERSEDED_BY_VALIDATED_MODULE');
    async function record(name,work){
      await work();results.push({name,status:'PASS'});console.log('PASS '+name);
      fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({verdict:'RUNNING',browser:'Chromium',results},null,2));
    }
    async function dismiss(){const button=page.getByRole('button',{name:'Fermer la notification'});if(await button.isVisible()) await button.click();}
    async function open(id){await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));await page.locator('#qv-programme-activity').waitFor();}
    async function save(name){
      const pending=page.waitForResponse(response=>['PATCH','POST'].includes(response.request().method()) && response.url().includes('/programme-items'));
      await page.getByRole('button',{name,exact:true}).click();const response=await pending;
      const data=await response.json();assert.ok(response.ok(),JSON.stringify(data));assert.equal(data.updated,true);
      await page.locator('.qv-programme-view').waitFor();assert.ok(await page.locator('.scope-notification-card').isVisible());
      return data;
    }
    async function addFree(id,values){
      for(const value of values){
        await page.locator('#'+id+'-free').fill(value);
        const button=page.locator(`[data-qv-add-free="${id}"]`);
        await button.click();
      }
    }
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    await page.route('**/api/scope/alerts*',async route=>{
      await new Promise(resolve=>setTimeout(resolve,350));await route.continue();
    });
    const initial=await programme();assert.equal(rows(initial).length,847);
    const reference=rows(initial).find(row=>row.historicalProposal && row.statCom==='011PR' && !row.publishedEventId);
    assert.ok(reference);
    let manualId;
    const referenceCodes=['C PR','C JSP'];
    const freeResponsibilities=['PrésidentE  Codir','Responsable externe'];
    const freePublics=['Membres du Codir','Invités externes'];
    await record('nouvelle occurrence, selections multiples et libres, PLAN persistant',async()=>{
      await open('nouveau');
      await page.locator('#qv-programme-activity').fill('RECETTE MOA Nouvelle');
      await page.locator('#qv-programme-ecawin').selectOption('EXERCI');
      await page.locator('#qv-programme-statcom').selectOption('011PR');
      await page.locator('#qv-programme-domain').selectOption('F7');
      await page.locator('#qv-programme-date').fill('15.06.2027');
      await page.locator('#qv-programme-start').fill('18:00');await page.locator('#qv-programme-end').fill('20:00');
      await page.locator('#qv-programme-responsable-summary').click();
      await page.locator('#qv-programme-responsable-search').fill('C PR');
      await page.locator('#qv-programme-responsable input[value="C PR"]').check();
      await page.locator('#qv-programme-responsable-search').fill('');
      await page.locator('#qv-programme-responsable input[value="C JSP"]').check();
      await addFree('qv-programme-responsable',freeResponsibilities);
      await page.screenshot({path:path.join(output,'responsables-multiples-libres.png')});
      await page.locator('#qv-programme-responsable-summary').click();
      await page.locator('#qv-programme-public-summary').click();
      await page.locator('#qv-programme-public input[value="PR:2"]').check();
      await page.locator('#qv-programme-public input[value="AUTO:1"]').check();
      await addFree('qv-programme-public',freePublics);
      await page.screenshot({path:path.join(output,'publics-references-descriptifs.png')});
      await page.locator('#qv-programme-public-summary').click();
      const result=await save('Enregistrer et planifier');manualId=result.itemId;
      const current=rows(result.quoVadis).find(row=>row.id===manualId);
      assert.equal(current.status,'PLANIFIE');assert.ok(current.businessValidation);assert.equal(current.publishedEventId,undefined);
      assert.deepEqual([...current.publics].sort(),['AUTO:1','PR:2']);assert.deepEqual(current.publicFreeLabels,freePublics);
      assert.deepEqual(current.responsibleSelections.filter(value=>value.kind==='REFERENCE').map(value=>value.code).sort(),[...referenceCodes].sort());
      assert.deepEqual(current.responsibleSelections.filter(value=>value.kind==='FREE').map(value=>value.label),freeResponsibilities);
      assert.equal(rows(result.quoVadis).length,848);await dismiss();
      await page.locator('#qv-filter-q').fill('RECETTE MOA Nouvelle');
      const tr=page.locator(`a[href="#/quo-vadis/programme/${encodeURIComponent(manualId)}"]`).first().locator('xpath=ancestor::tr');
      assert.match(await tr.innerText(),/Planifié/);
      await page.screenshot({path:path.join(output,'programme-planifie.png')});
    });
    await record('reouverture et deuxieme planification sans duplication',async()=>{
      await open(manualId);
      assert.equal(await page.locator('#qv-programme-responsable input:checked').count(),4);
      assert.equal(await page.locator('#qv-programme-public input:checked').count(),4);
      await page.locator('#qv-programme-themes').fill('Deuxième décision explicite');
      const before=rows(await programme()).find(row=>row.id===manualId);
      assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Deuxième décision explicite');
      const result=await save('Enregistrer et planifier');
      assert.equal(rows(result.quoVadis).length,848);
      assert.equal(rows(result.quoVadis).find(row=>row.id===manualId).businessCode,before.businessCode);
      await dismiss();await open(manualId);
      assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Deuxième décision explicite');
      assert.deepEqual(rows(await programme()).find(row=>row.id===manualId).responsibleSelections,before.responsibleSelections);
    });
    await record('occurrence issue de 2026 puis version metier validee',async()=>{
      await open(reference.id);await page.locator('#qv-programme-themes').fill('RECETTE MOA Référence 2026');
      const result=await save('Enregistrer et planifier');
      const current=rows(result.quoVadis).find(row=>row.id===reference.id);
      assert.equal(current.status,'PLANIFIE');assert.ok(current.businessValidation);
      assert.deepEqual(current.ois,reference.ois);assert.deepEqual(current.publics,reference.publics);
      await dismiss();await open(reference.id);
      assert.equal(await page.locator('#qv-programme-themes').inputValue(),'RECETTE MOA Référence 2026');
      const baseline=current.businessValidation.baselineFields;
      await page.locator('#qv-programme-themes').fill('RECETTE MOA Version validée');
      const next=await save('Enregistrer et planifier');
      const nextRow=rows(next.quoVadis).find(row=>row.id===reference.id);
      assert.deepEqual(nextRow.businessValidation.baselineFields,baseline);assert.equal(rows(next.quoVadis).length,848);
      await dismiss();
    });
    await record('erreur serveur apres ecriture: rollback et conservation des saisies',async()=>{
      await open(manualId);
      const before=rows(await programme()).find(row=>row.id===manualId);
      await page.locator('#qv-programme-themes').fill('ERREUR SIMULÉE NON ENREGISTRÉE');
      const pattern='**/api/scope/quo-vadis/programme-items/'+encodeURIComponent(manualId);
      await page.route(pattern,route=>route.continue({postData:JSON.stringify({...route.request().postDataJSON(),__recipeFailureAfterWrite:true})}));
      const responsePromise=page.waitForResponse(response=>response.request().method()==='PATCH' && response.url().includes('/programme-items/'));
      await page.getByRole('button',{name:'Enregistrer et planifier',exact:true}).click();
      assert.equal((await responsePromise).status(),500);await page.unroute(pattern);
      await page.locator('#scope-notification-host.is-error').waitFor();
      assert.equal(await page.locator('#qv-programme-themes').inputValue(),'ERREUR SIMULÉE NON ENREGISTRÉE');
      assert.equal(await page.locator('#qv-programme-plan').isEnabled(),true);
      assert.deepEqual(rows(await programme()).find(row=>row.id===manualId),before);
      await page.screenshot({path:path.join(output,'erreur-saisie-conservee.png')});await dismiss();
    });
    await record('suppression individuelle et autres commandes preservees',async()=>{
      await open(manualId);await page.locator('#qv-programme-responsable-summary').click();
      await page.locator('#qv-programme-responsable input[value="Responsable externe"]').uncheck();
      await page.locator('#qv-programme-responsable-summary').click();
      await page.locator('#qv-programme-public-summary').click();
      await page.locator('#qv-programme-public input[value="Invités externes"]').uncheck();
      await page.locator('#qv-programme-public-summary').click();
      await save('Enregistrer');await dismiss();await open(manualId);
      assert.equal(await page.locator('#qv-programme-responsable input:checked').count(),3);
      assert.equal(await page.locator('#qv-programme-public input:checked').count(),3);
      await save('Enregistrer et valider');await dismiss();
      assert.equal(rows(await programme()).length,848);
    });
    await record('menus accessibles desktop tablette mobile et CONCOUR confirme',async()=>{
      const data=await programme();assert.equal(data.ecawinReferential.complete,true);assert.equal(data.ecawinReferential.associations.length,61);
      await open(manualId);await page.locator('#qv-programme-ecawin').selectOption('EXERCI');
      assert.equal(await page.locator('#qv-programme-statcom option[value="CONCOUR"]').count(),1);
      assert.equal(await page.locator('#qv-programme-statcom option[value="CONCOU"]').count(),0);
      for(const viewport of [{width:1440,height:1000},{width:960,height:900},{width:390,height:844}]){
        await page.setViewportSize(viewport);
        for(const id of ['responsable','public']){
          await page.locator('#qv-programme-'+id+'-summary').click();
          await page.waitForFunction(id=>{
            const popup=document.querySelector('#qv-programme-'+id+'-summary + .qv-programme-choice-popover');
            const box=popup.getBoundingClientRect();
            return popup.style.position==='fixed' && box.x>=0 && box.y>=0 && box.right<=innerWidth+1 && box.bottom<=innerHeight+1;
          },id,{timeout:3000});
          const menu=page.locator('#qv-programme-'+id+'-summary + .qv-programme-choice-popover');
          const box=await menu.boundingBox();assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width+1 && box.y+box.height<=viewport.height+1);
          await page.locator('#qv-programme-'+id+'-free').scrollIntoViewIfNeeded();
          await page.screenshot({path:path.join(output,`menu-${id}-${viewport.width}.png`)});
          await page.locator('#qv-programme-'+id+'-summary').click();
        }
      }
    });
    assert.deepEqual(pageErrors,[]);
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({verdict:'PASS',browser:'Chromium',safari:'NOT_COVERED',
      baseline:847,manualCreated:1,duplicated:0,operationalEventsCreated:0,results},null,2));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
