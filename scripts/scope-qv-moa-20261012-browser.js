'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const base='http://127.0.0.1:4410';
const output=path.resolve(__dirname,'../docs/captures/qv-moa-20261012');
async function run(){
  fs.mkdirSync(output,{recursive:true});
  const results=[];
  const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const programme=async()=>(await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json()).quoVadis;
    const row=(data,id)=>data.canonicalProgramme.rows.find(item=>item.id===id);
    const snapshot=data=>data.canonicalProgramme.rows.map(item=>({id:item.id,statCom:item.statCom || '',businessCode:item.businessCode || '',publishedEventId:item.publishedEventId || ''}));
    async function record(name,work){
      await work();results.push({name,status:'PASS'});console.log('PASS '+name);
      fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({verdict:'RUNNING',browser:'Chromium',results},null,2));
    }
    async function open(id){
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(id));
      await page.locator('#qv-programme-save:not([disabled])').waitFor();
    }
    async function save(){
      const pending=page.waitForResponse(response=>['PATCH','POST'].includes(response.request().method()) && response.url().includes('/programme-items'));
      await page.getByRole('button',{name:'Enregistrer',exact:true}).click();
      const response=await pending;const data=await response.json();assert.ok(response.ok(),JSON.stringify(data));assert.equal(data.updated,true);
      await page.locator('.qv-programme-view').waitFor();
      const notification=page.getByRole('button',{name:'Fermer la notification'});
      if(await notification.isVisible()) await notification.click();
      return data;
    }
    async function menu(id,work){
      await page.locator('#'+id+'-summary').click();await work();
      await page.locator('#'+id+'-summary').click();
    }
    async function add(id,value){
      await page.locator('#'+id+'-free').fill(value);await page.locator(`[data-qv-add-free="${id}"]`).click();
    }
    await page.goto(base+'/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();await page.locator('.qv-programme-view').waitFor();
    const initial=await programme();const before=snapshot(initial);
    const sessions=Array.from({length:6},(_,index)=>initial.canonicalProgramme.rows.find(item=>item.eventDisplayLabel===`Exercice PR 1.${index+1}`));
    assert.ok(sessions.every(Boolean));const id=sessions[2].id;
    await record('PR 1.1 a 1.6: ouverture, theme, SAVE, retour et reouverture sans renumerotation',async()=>{
      for(const [index,source] of sessions.entries()){
        await open(source.id);const title=`Exercice PR 1.${index+1}`;
        assert.equal(await page.locator('#qv-programme-activity').inputValue(),title);
        assert.equal(await page.locator('#qv-programme-themes').inputValue(),(source.themes || []).join(' ; '));
        const theme=`${(source.themes || []).join(' ; ')} ; Décision séance ${index+1}`;
        await page.locator('#qv-programme-themes').fill(theme);const saved=await save();
        assert.equal(row(saved.quoVadis,source.id).eventDisplayLabel,title);
        assert.equal(row(saved.quoVadis,source.id).statCom,source.statCom);
        await open(source.id);assert.equal(await page.locator('#qv-programme-activity').inputValue(),title);
        assert.equal(await page.locator('#qv-programme-themes').inputValue(),theme);
      }
      await page.screenshot({path:path.join(output,'pr-seance-exacte.png')});
    });
    await record('responsables: defaut non selectionne, inclusifs, domaines tries, libre et persistance',async()=>{
      await open(id);
      await menu('qv-programme-responsable',async()=>{
        const checked=page.locator('#qv-programme-responsable input:checked');
        while(await checked.count()) await checked.first().uncheck();
        assert.equal(await page.locator('#qv-programme-responsable-summary').innerText(),'À affecter');
        await add('qv-programme-responsable','À affecter');
        assert.equal(await page.locator('#qv-programme-responsable input[data-choice-kind="FREE"]').count(),0);
        for(const label of ['PrésidentE Codir','PrésidentE CI']) await page.locator('#qv-programme-responsable').getByText(label,{exact:true}).locator('xpath=preceding-sibling::input').check();
        assert.equal(await page.locator('#qv-programme-responsable').getByText('Présidente Codir',{exact:true}).count(),0);
        const groups=await page.locator('#qv-programme-responsable fieldset:not([data-free-choices])').evaluateAll(nodes=>nodes.map(node=>({name:node.querySelector('legend').textContent,labels:[...node.querySelectorAll('label span')].map(span=>span.textContent)})));
        assert.ok(groups.some(group=>group.name==='Commandement'));
        for(const group of groups) assert.deepEqual(group.labels,[...group.labels].sort((a,b)=>a.localeCompare(b,'fr')));
        await add('qv-programme-responsable','Responsable externe exact');
        await page.screenshot({path:path.join(output,'responsables-commandement.png')});
      });
      const saved=await save();assert.equal(row(saved.quoVadis,id).responsibleSelections.length,3);
      assert.ok(!row(saved.quoVadis,id).responsibleSelections.some(item=>item.label==='À affecter'));
      await open(id);assert.equal(await page.locator('#qv-programme-responsable input:checked').count(),3);
    });
    await record('public Codir permanent, domaines tries, references et descriptifs distincts',async()=>{
      await menu('qv-programme-public',async()=>{
        await page.locator('#qv-programme-public input[value="CMDT:CODIR"]').check();
        await add('qv-programme-public','Invités Codir descriptifs');
        const groups=await page.locator('#qv-programme-public fieldset:not([data-free-choices])').evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('label span')].map(span=>span.textContent)));
        for(const labels of groups) assert.deepEqual(labels,[...labels].sort((a,b)=>a.localeCompare(b,'fr')));
        await page.screenshot({path:path.join(output,'publics-codir.png')});
      });
      const saved=await save();assert.ok(row(saved.quoVadis,id).publics.includes('CMDT:CODIR'));
      assert.ok(row(saved.quoVadis,id).publicFreeLabels.includes('Invités Codir descriptifs'));
      await open(id);assert.ok(await page.locator('#qv-programme-public input[value="CMDT:CODIR"]').isChecked());
    });
    await record('DPS DAP JSP globaux, partiel, deselection isolee et persistance',async()=>{
      await menu('qv-programme-oi',async()=>{
        for(const domain of ['DPS','DAP','JSP']){
          await page.locator(`[data-qv-oi-group="${domain}"]`).check();
          const count=await page.locator(`#qv-programme-oi input[value^="${domain}:"]:checked`).count();
          assert.equal(count,domain==='JSP'?3:4);
        }
        await page.locator('#qv-programme-oi input[value="DPS:B2"]').uncheck();
        assert.ok(await page.locator('[data-qv-oi-group="DPS"]').evaluate(input=>input.indeterminate));
        await page.locator('[data-qv-oi-group="DPS"]').check();
        await page.locator('[data-qv-oi-group="DPS"]').uncheck();
        assert.equal(await page.locator('#qv-programme-oi input[value^="DPS:"]:checked').count(),0);
        assert.equal(await page.locator('#qv-programme-oi input[value="JSP:G1"]:checked').count(),1);
        await page.screenshot({path:path.join(output,'oi-groupes.png')});
      });
      const saved=await save();const codes=row(saved.quoVadis,id).oiSelections;
      assert.deepEqual([...codes].sort(),['DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4','JSP:B1','JSP:C1','JSP:G1']);
      await open(id);assert.ok(await page.locator('[data-qv-oi-group="DAP"]').isChecked());
      assert.ok(await page.locator('[data-qv-oi-group="JSP"]').isChecked());
    });
    await record('EXEPRO liste vide non destructive, recherche activite et Stat.Com conserve',async()=>{
      assert.equal(await page.locator('#qv-programme-ecawin').inputValue(),'EXERCI');
      await page.locator('#qv-programme-ecawin-search').fill('EXEPRO');
      await page.locator('#qv-programme-ecawin').selectOption('EXEPRO');
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'011PR');
      assert.equal(await page.locator('#qv-programme-statcom option:not([disabled])').count(),1);
      await page.locator('#qv-programme-ecawin-search').fill('');
      await page.locator('#qv-programme-ecawin').selectOption('EXERCI');
      assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'011PR');
      const saved=await save();assert.equal(row(saved.quoVadis,id).statCom,'011PR');
    });
    await record('evaluation desactivee individuellement puis reactivee et conservee apres reouverture',async()=>{
      await open(id);assert.ok(await page.locator('#qv-programme-participation-evaluation').isChecked());
      await page.locator('#qv-programme-participation-evaluation').uncheck();
      const saved=await save();assert.equal(row(saved.quoVadis,id).participationEvaluation,false);
      await open(id);assert.equal(await page.locator('#qv-programme-participation-evaluation').isChecked(),false);
      await page.screenshot({path:path.join(output,'evaluation-individuelle.png')});
      await page.locator('#qv-programme-participation-evaluation').check();await save();
      await open(id);assert.ok(await page.locator('#qv-programme-participation-evaluation').isChecked());
    });
    await record('Stat.Com et identifiants de toutes les occurrences 2027 restent identiques',async()=>{
      const after=snapshot(await programme());assert.deepEqual(after,before);
      fs.writeFileSync(path.join(output,'statcom-integrity.json'),JSON.stringify({beforeCount:before.length,afterCount:after.length,
        identical:before.length,percentIdentical:100,idsAndBusinessCodesIdentical:true,verdict:'PASS'},null,2));
    });
    await record('nouvelle occurrence: evaluation par defaut et CONCOUR officiel sans evenement operationnel',async()=>{
      await open('nouveau');assert.ok(await page.locator('#qv-programme-participation-evaluation').isChecked());
      await page.locator('#qv-programme-activity').fill('RECETTE MOA Concours');
      await page.locator('#qv-programme-domain').selectOption('F7');
      await page.locator('#qv-programme-ecawin').selectOption('EXERCI');
      await page.locator('#qv-programme-statcom').selectOption('CONCOUR');
      const saved=await save();const created=row(saved.quoVadis,saved.itemId);
      assert.equal(created.statCom,'CONCOUR');assert.equal(created.participationEvaluation,true);assert.ok(!created.publishedEventId);
      await open(saved.itemId);assert.equal(await page.locator('#qv-programme-statcom').inputValue(),'CONCOUR');
    });
    await record('fiche et menus dans les limites des ecrans 1440, 960 et 390 pixels',async()=>{
      for(const width of [1440,960,390]){
        await page.setViewportSize({width,height:1000});await open(id);
        for(const menuId of ['qv-programme-responsable','qv-programme-public','qv-programme-oi']){
          await menu(menuId,async()=>{
            await page.waitForFunction(id=>{
              const popup=document.getElementById(id).closest('.qv-programme-choice-popover');
              const box=popup.getBoundingClientRect();
              return popup.style.position==='fixed' && box.width>0 && box.x>=0 && box.y>=0
                && box.right<=innerWidth+1 && box.bottom<=innerHeight+1;
            },menuId);
            const box=await page.locator('#'+menuId).locator('..').boundingBox();
            assert.ok(box && box.x>=0 && box.y>=0 && box.x+box.width<=width+1 && box.y+box.height<=1001,JSON.stringify(box));
            await page.screenshot({path:path.join(output,`${menuId}-${width}.png`)});
          });
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      }
    });
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({verdict:'PASS',browser:'Chromium',results,pageErrors:errors},null,2));
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
