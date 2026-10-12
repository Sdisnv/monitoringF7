'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || '/private/tmp/scope-browser-recipe/node_modules/playwright');
const pdfjs=require('pdfjs-dist/build/pdf.js');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-roadmap-v1-20261012/browser');
async function run(){
  fs.mkdirSync(output,{recursive:true});const results=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const rows=data=>data.canonicalProgramme.rows;
    const types=data=>require('../assets/js/scope-ui-logic').qvProgrammeActivityTypes(data);
    async function record(name,work){await work();results.push({name,status:'PASS'});console.log('PASS '+name);}
    async function open(id='nouveau'){
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));
      await page.locator('#qv-programme-save:not([disabled])').waitFor();
    }
    async function dismiss(){const button=page.getByRole('button',{name:'Fermer la notification'});if(await button.isVisible()) await button.click();}
    async function save(){
      const pending=page.waitForResponse(response=>response.request().method()==='POST' && response.url().endsWith('/programme-items'));
      await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
      const response=await pending;const body=await response.json();return {response,body};
    }
    async function date(day,start='18:00',end='20:00'){
      await page.locator('#qv-programme-date').fill(day.split('-').reverse().join('.'));
      await page.locator('#qv-programme-start').fill(start);await page.locator('#qv-programme-end').fill(end);
    }
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    const initial=await programme();const baseline=rows(initial).map(row=>({id:row.id,statCom:row.statCom,code:row.code}));
    const codir=types(initial).find(type=>type.label==='Séance Codir');assert.ok(codir);
    await record('referentiels permanents, domaines et code historique C scrt affiche C sct',async()=>{
      await open();
      await page.locator('#qv-programme-public-summary').click();
      for(const label of ['CDT','C op','C log','C for','QM','C PR','Formateur PR','Of auto','Formateur C1/118','Moniteur conduite'])
        assert.equal(await page.locator('#qv-programme-public').getByText(label,{exact:true}).count(),1,label);
      const groups=await page.locator('#qv-programme-public fieldset:not([data-free-choices])').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('label span')].map(item=>item.textContent)));
      for(const labels of groups) assert.deepEqual(labels,[...labels].sort((a,b)=>a.localeCompare(b,'fr')));
      await page.screenshot({path:path.join(output,'publics-permanents.png')});
      await page.locator('#qv-programme-public-summary').click();
      await page.locator('#qv-programme-responsable-summary').click();
      assert.equal(await page.locator('#qv-programme-responsable input[value="C scrt"]').count(),1);
      assert.equal(await page.locator('#qv-programme-responsable').getByText('C sct',{exact:true}).count(),1);
      assert.equal(await page.locator('#qv-programme-responsable').getByText('C scrt',{exact:true}).count(),0);
      await page.locator('#qv-programme-responsable-summary').click();
    });
    await record('types Codir, PR et DPS par site proposent uniquement les valeurs connues et editables',async()=>{
      await page.locator('#qv-programme-type').selectOption(codir.id);
      assert.equal(await page.locator('#qv-programme-domain').inputValue(),'F0');
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'070F0');
      assert.ok(await page.locator('#qv-programme-responsable input[value="Présidente Codir"]').isChecked());
      for(const site of ['G1','C1','B1','B2']){
        const type=types(initial).find(type=>type.label===`Exercice DPS 1 (${site})`);assert.ok(type,site);
        await page.locator('#qv-programme-type').selectOption(type.id);
        assert.equal(await page.locator('#qv-programme-domain').inputValue(),'F7');
        assert.equal(await page.locator('#qv-programme-statcom').inputValue(),`012${site}`);
        assert.ok(await page.locator(`#qv-programme-oi input[value="DPS:${site}"]`).isChecked());
      }
      const pr=types(initial).find(type=>type.label==='Exercice PR 1.1');assert.ok(pr);
      await page.locator('#qv-programme-type').selectOption(pr.id);
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'011PR');
      assert.ok(await page.locator('#qv-programme-public input[value="PR:2"]').isChecked());
      await page.locator('#qv-programme-activity').fill('Exercice PR - décision modifiable');
      assert.equal(await page.locator('#qv-programme-activity').inputValue(),'Exercice PR - décision modifiable');
      await page.screenshot({path:path.join(output,'activites-types.png')});
    });
    await record('A+1 reste bloque sans rapport de cloture, avec saisie conservee',async()=>{
      await page.locator('#qv-programme-type').selectOption(codir.id);await date('2028-01-28');
      const result=await save();assert.equal(result.response.status(),422);
      assert.equal(result.body.error,'programme_cycle_cloture_inconnue');
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'28.01.2028');await dismiss();
    });
    await record('cycle 2027 cloture en 2028: parametres explicites persistes, sans date par defaut inventee',async()=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('.qv-programme-view').waitFor();
      await page.locator('.qv-programme-cycle summary').click();
      assert.equal(await page.locator('#qv-cycle-end').inputValue(),'');
      await page.locator('#qv-cycle-end').fill('2028-02-02');
      await page.locator('#qv-cycle-parameters').check();
      const pending=page.waitForResponse(response=>response.request().method()==='PUT' && response.url().endsWith('/cycle'));
      await page.getByRole('button',{name:'Enregistrer le cycle',exact:true}).click();
      assert.equal((await pending).status(),200);
      await page.waitForFunction(()=>document.querySelector('.qv-programme-cycle summary')?.textContent.includes('02.02.2028'));
      await dismiss();assert.equal((await programme()).programmeCycle.endDate,'2028-02-02');
      await page.screenshot({path:path.join(output,'cycle-metier-2027.png')});
    });
    await record('une occurrence automatique correspondante est proposee sans ecraser les decisions',async()=>{
      const current=await programme();const source=rows(current).find(row=>row.definitionId===codir.definitionId && String(row.startsAt).startsWith('2028-01-28'));
      assert.ok(source,'La cadence historique doit demontrer la séance Codir de janvier.');
      const before=JSON.stringify(source);await open();await page.locator('#qv-programme-type').selectOption(codir.id);
      await date('2028-01-28',source.startsAt.slice(11,16),source.endsAt.slice(11,16));
      const result=await save();assert.equal(result.response.status(),200);assert.equal(result.body.reason,'PROGRAMME_OCCURRENCE_EXISTS');
      assert.equal(result.body.existingItemId,source.id);
      await page.locator('[data-qv-existing-occurrence]').waitFor();
      assert.equal(JSON.stringify(rows(await programme()).find(row=>row.id===source.id)),before);
      await dismiss();
    });
    let manualId;
    await record('nouvelle occurrence A+1 rattachee au cycle 2027, publics permanents persistants sans evenement operationnel',async()=>{
      await open();await page.locator('#qv-programme-type').selectOption(codir.id);
      await page.locator('#qv-programme-activity').fill('Séance Codir - décision recette');await date('2028-01-27');
      await page.locator('#qv-programme-public-summary').click();
      for(const code of ['CMDT:CODIR','CMDT:CDT','CMDT:C-OP','CMDT:C-LOG','CMDT:C-FOR','CMDT:QM'])
        await page.locator(`#qv-programme-public input[value="${code}"]`).check();
      await page.locator('#qv-programme-public-summary').click();
      const result=await save();assert.ok(result.response.ok(),JSON.stringify(result.body));assert.equal(result.body.created,true);
      manualId=result.body.itemId;
      const row=rows(result.body.quoVadis).find(row=>row.id===manualId);
      assert.equal(row.businessCycleYear,2027);assert.equal(row.civilYear,2028);assert.ok(!row.publishedEventId);
      assert.equal(row.statCom,'070F0');assert.equal(row.publics.length,6);
      await page.locator('.qv-programme-view').waitFor();await dismiss();await open(manualId);
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'27.01.2028');
      assert.equal(await page.locator('#qv-programme-public input:checked').count(),6);
      await page.screenshot({path:path.join(output,'fiche-a-plus-one.png')});
    });
    await record('CSV Excel et PDF reels: titre complet et theme au format MOA',async()=>{
      await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('.qv-programme-view').waitFor();
      await page.locator('#qv-filter-q').fill('Exercice PR 1.1');
      const pendingDownload=page.waitForEvent('download');
      await page.locator('#qv-export-programme-excel').click();const download=await pendingDownload;
      const filename=path.join(output,'programme-excel.csv');await download.saveAs(filename);
      assert.ok(fs.readFileSync(filename,'utf8').includes('"Exercice PR 1.1 - Base"'));
      const pendingPdf=page.waitForResponse(response=>response.request().method()==='POST' && response.url().includes('/reports/quo-vadis'));
      await page.locator('#qv-export-programme-pdf').click();const response=await pendingPdf;assert.equal(response.status(),200);
      const payload=response.request().postDataJSON();assert.ok(payload.rows.some(row=>row.activite==='Exercice PR 1.1' && row.themes.includes('Base')));
      const buffer=await response.body();fs.writeFileSync(path.join(output,'programme-pr-1-1.pdf'),buffer);
      const pdf=await pdfjs.getDocument({data:new Uint8Array(buffer),useSystemFonts:true,verbosity:0}).promise;
      try{const items=(await (await pdf.getPage(1)).getTextContent()).items;
        const title=items.find(item=>item.str==='Exercice PR 1.1');const theme=items.find(item=>item.str==='Base');
        assert.ok(title && theme);assert.ok(title.transform[5]>theme.transform[5]);
      }finally{await pdf.destroy();}
      const close=page.getByRole('button',{name:'Fermer',exact:true});
      if(await close.isVisible()) await close.click();
    });
    await record('nouveaux controles utilisables desktop et mobile; Stat.Com et codes existants inchanges',async()=>{
      for(const width of [1440,390]){
        await page.setViewportSize({width,height:1000});await open();
        await page.locator('#qv-programme-type').selectOption(codir.id);
        await page.locator('#qv-programme-type').scrollIntoViewIfNeeded();
        const box=await page.locator('#qv-programme-type').boundingBox();assert.ok(box && box.width>0 && box.x>=0 && box.x+box.width<=width+1);
        await page.screenshot({path:path.join(output,`creation-${width}.png`)});
      }
      const current=rows(await programme());
      for(const original of baseline){const row=current.find(row=>row.id===original.id);assert.ok(row);assert.equal(row.statCom,original.statCom);assert.equal(row.code,original.code);}
    });
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({verdict:'PASS',browser:'Chromium',fixtureClosingDate:'2028-02-02',fixtureOnly:true,productionWrites:false,
      preservedOriginalOccurrences:baseline.length,results,pageErrors:errors},null,2)+'\n');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
