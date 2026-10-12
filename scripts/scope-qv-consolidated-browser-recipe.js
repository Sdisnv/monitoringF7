'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:4410';
const output = path.resolve(__dirname,'../docs/captures/qv-p0-ecawin-auth-20261009');
const results = [];

async function run(){
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({headless:true,
    executablePath:process.env.SCOPE_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror',error=>failures.push(error.message));
    async function record(name,work){await work();results.push({name,status:'PASS'});console.log(`PASS ${name}`);
      if(process.env.SCOPE_RECIPE_AUTH_ONLY !== 'true') fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({browser:'Chromium',safari:'NOT_COVERED',results},null,2));}
    async function dismiss(){
      const close = page.getByRole('button',{name:'Fermer la notification'});
      if(await close.isVisible()) await close.click();
    }
    async function programme(){
      const response = await context.request.get(`${base}/api/scope/quo-vadis/programmes/2027`);
      assert.equal(response.status(),200);return (await response.json()).quoVadis;
    }
    async function save(button){
      const response = page.waitForResponse(response=>response.request().method() !== 'GET'
        && response.url().includes('/quo-vadis/programme-items'));
      await page.getByRole('button',{name:button,exact:true}).click();
      const result = await response;assert.ok(result.ok(),await result.text());
      await page.locator('.qv-programme-view').waitFor();return result.json();
    }
    async function filter(){
      await page.locator('#qv-filter-q').fill('RECETTE P0');
      await page.waitForFunction(()=>document.querySelector('.qv-programme-view')?.textContent.includes('RECETTE P0'));
    }
    await record('LOCAL et refus anonyme',async()=>{
      assert.equal((await context.request.get(`${base}/api/scope/quo-vadis/programmes/2027`)).status(),401);
      await page.goto(`${base}/scope.html#/quo-vadis/programme`);
      await page.locator('#scope-local-login').waitFor();
      assert.equal(await page.locator('.scope-login-alert').count(),0);
      await page.screenshot({path:path.join(output,'connexion-local.png')});
      await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
      await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
      await page.getByRole('button',{name:'Se connecter',exact:true}).click();
      await page.locator('.qv-programme-view').waitFor();
      assert.equal((await page.locator('.scope-login-lock').count()),0);
      assert.equal((await programme()).canonicalProgramme.rows.filter(row=>!row.external && !row.jspDirectionReconciliation
        && row.cursusReconciliation?.status !== 'SUPERSEDED_BY_VALIDATED_MODULE').length,process.env.SCOPE_RECIPE_VISUAL_ONLY === 'true' || process.env.SCOPE_RECIPE_AUTH_ONLY === 'true' ? 850 : 849);
    });
    if(process.env.SCOPE_RECIPE_AUTH_ONLY === 'true') return;
    await record('référentiel ECAwin issu de la capture et filtres réciproques',async()=>{
      const ecawin = require('../assets/js/scope-ecawin');
      const data = await programme();
      assert.equal(data.ecawinReferential.sourceImage.sha256,ecawin.sourceImage.sha256);
      assert.equal(data.ecawinReferential.associations.length,ecawin.associations.length);
      await page.getByRole('link',{name:'Créer une activité',exact:true}).click();
      for(const activityCode of ecawin.activityCodes){
        await page.locator('#qv-programme-ecawin').selectOption(activityCode);
        const options = await page.locator('#qv-programme-statcom option').evaluateAll(items=>items
          .filter(item=>item.value && !item.disabled).map(item=>({code:item.value,label:item.textContent.replace(/\s+/g,' ').trim()})));
        const applicable = data.statComCodes.filter(item=>item.active !== false && item.code !== '010JY3'
          && (!item.validFrom || item.validFrom <= '2027-01-01') && (!item.validTo || item.validTo >= '2027-01-01')
          && ecawin.isCompatible(activityCode,item.code));
        assert.deepEqual(options.map(item=>item.code).sort(),applicable.map(item=>item.code).sort());
        for(const option of options) assert.ok(option.label.includes(ecawin.associations.find(item=>item.statCom === option.code).description));
      }
      for(const statCom of ['CECAFB','0180F7','074F1']){
        await page.locator('#qv-programme-ecawin').selectOption('');
        await page.locator('#qv-programme-statcom').selectOption(statCom);
        assert.equal(await page.locator('#qv-programme-ecawin').inputValue(),ecawin.activityForStatCom(statCom));
      }
      await page.locator('#qv-programme-ecawin').selectOption('EXERCI');
      await page.screenshot({path:path.join(output,'fiche-ecawin-reference-officielle.png')});
      await page.goto(`${base}/scope.html#/quo-vadis/programme`);
      await page.locator('.qv-programme-view').waitFor();
    });
    await filter();
    let itemId = (await programme()).canonicalProgramme.rows.find(row=>row.activityLabel === 'RECETTE P0 Nouveau')?.id;
    if(process.env.SCOPE_RECIPE_VISUAL_ONLY !== 'true'){
    await record('création, ECAwin et sélection des référentiels',async()=>{
      await page.getByRole('link',{name:'Créer une activité',exact:true}).click();
      await page.locator('#qv-programme-activity').fill('RECETTE P0 Nouveau');
      await page.locator('#qv-programme-themes').fill('Recette isolée');
      await page.locator('#qv-programme-ecawin').selectOption('EXERCI');
      await page.locator('#qv-programme-statcom').selectOption('011PR');
      assert.equal(await page.locator('#qv-programme-ecawin').inputValue(),'EXERCI');
      await page.locator('#qv-programme-domain').selectOption('F3');
      await page.locator('#qv-programme-date').fill('22.01.2027');
      await page.locator('#qv-programme-start').fill('18:00');
      await page.locator('#qv-programme-end').fill('20:00');
      await page.locator('#qv-programme-qualification-summary').click();
      await page.locator('#qv-programme-specialisation input[value="PAPR"]').check();
      await page.locator('#qv-programme-qualification-summary').click();
      const qv = await programme();
      const cursus = qv.cursusSelections.find(row=>row.statut === 'ACTIF');assert.ok(cursus);
      await page.locator('#qv-programme-cursus').selectOption(cursus.cursusId);
      const created = await save('Enregistrer');itemId = created.itemId;
      assert.ok(itemId);
      const row = created.quoVadis.canonicalProgramme.rows.find(row=>row.id === itemId);
      assert.deepEqual(row.qualificationCodes,['PAPR']);assert.equal(row.cursusId,cursus.cursusId);
      assert.equal(row.ecawinActivityCode,'EXERCI');assert.equal(row.publishedEventId,undefined);
      assert.equal(await page.locator('#qv-filter-q').inputValue(),'RECETTE P0');
    });
    await record('notification centrale visible',async()=>{
      const card = page.locator('.scope-notification-card');await card.waitFor({state:'visible'});
      const box = await card.boundingBox();const viewport = page.viewportSize();
      assert.ok(Math.abs(box.x+box.width/2-viewport.width/2)<2);
      assert.ok(Math.abs(box.y+box.height/2-viewport.height/2)<2);
      assert.equal(await page.locator('#scope-notification-host').evaluate(node=>getComputedStyle(node).opacity),'1');
      await page.screenshot({path:path.join(output,'notification-centrale.png')});await dismiss();
    });
    await record('modification, validation, planification et contexte',async()=>{
      await page.goto(`${base}/scope.html#/quo-vadis/programme/${encodeURIComponent(itemId)}`);
      await page.locator('#qv-programme-activity').waitFor();
      await page.locator('#qv-programme-themes').fill('Recette isolée modifiée');
      const validated = await save('Enregistrer et valider');
      let row = validated.quoVadis.canonicalProgramme.rows.find(row=>row.id === itemId);
      assert.ok(row.businessValidation);assert.equal(row.status,'PROPOSE');await dismiss();
      await filter();
      await page.locator(`tr[data-qv-drag-item="${itemId}"] a`).click();
      const planned = await save('Enregistrer et planifier');
      row = planned.quoVadis.canonicalProgramme.rows.find(row=>row.id === itemId);
      assert.equal(row.status,'PLANIFIE');assert.equal(row.publishedEventId,undefined);
      assert.equal(await page.locator('#qv-filter-q').inputValue(),'RECETTE P0');await dismiss();
    });
    await record('erreur centrale sans perte des saisies',async()=>{
      await page.locator(`tr[data-qv-drag-item="${itemId}"] a`).click();
      const previousTheme = await page.locator('#qv-programme-themes').inputValue();
      await page.locator('#qv-programme-themes').fill('Saisie à conserver');
      await page.locator('#qv-programme-date').fill('invalide');
      const response = page.waitForResponse(r=>r.request().method() === 'PATCH' && r.url().includes('/programme-items/'));
      await page.getByRole('button',{name:'Enregistrer',exact:true}).click();assert.equal((await response).status(),422);
      assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Saisie à conserver');
      assert.equal(await page.locator('#qv-programme-date').inputValue(),'invalide');
      assert.equal(await page.locator('#scope-notification-host').getAttribute('role'),'alert');
      await page.screenshot({path:path.join(output,'notification-erreur.png')});await dismiss();
      await page.locator('#qv-programme-themes').fill(previousTheme);
      await page.locator('#qv-programme-date').fill('22.01.2027');
      await page.getByRole('link',{name:'Retour au programme',exact:true}).click();
    });
    let beforeMove;
    await record('Drag & Drop tableau avec persistance',async()=>{
      beforeMove = (await programme()).canonicalProgramme.rows.find(row=>row.id === itemId);
      const source = page.locator(`tr[data-qv-drag-item="${itemId}"]`);
      const target = page.locator('tr[data-qv-drag-item]').filter({hasText:'RECETTE P0 Cible'});
      const response = page.waitForResponse(r=>r.request().method() === 'PATCH' && r.url().includes('/programme-items/'));
      await source.dragTo(target);const result = await response;assert.ok(result.ok(),await result.text());
      await page.waitForFunction(id=>document.querySelector(`tr[data-qv-drag-item="${id}"]`)?.textContent.includes('21.01.27'),itemId);
      const row = (await programme()).canonicalProgramme.rows.find(row=>row.id === itemId);
      assert.equal(row.startsAt.slice(0,16),'2027-01-21T18:00');
      for(const field of ['qualificationCodes','cursusId','ecawinActivityCode','statCom','ois','publics','businessCode','status','businessValidation'])
        assert.deepEqual(row[field],beforeMove[field],field);
      await page.screenshot({path:path.join(output,'drag-tableau.png')});await dismiss();
    });
    await record('Drag & Drop mensuel sur barre de date et rechargement',async()=>{
      await page.getByRole('button',{name:'Vue mensuelle',exact:true}).click();
      const source = page.locator(`tr[data-qv-drag-item="${itemId}"]`);
      const target = page.locator('tr.qv-agenda-date-row[data-qv-drop-date="2027-01-20"]');
      const response = page.waitForResponse(r=>r.request().method() === 'PATCH' && r.url().includes('/programme-items/'));
      await source.dragTo(target);const result = await response;assert.ok(result.ok(),await result.text());
      await page.waitForFunction(id=>document.querySelector(`tr[data-qv-drag-item="${id}"]`)?.getAttribute('data-qv-drop-date') === '2027-01-20',itemId);
      await page.screenshot({path:path.join(output,'drag-mensuel.png')});await dismiss();
      await page.reload();await page.locator('.qv-programme-view').waitFor();
      const row = (await programme()).canonicalProgramme.rows.find(row=>row.id === itemId);
      assert.equal(row.startsAt.slice(0,16),'2027-01-20T18:00');
      assert.equal(row.endsAt.slice(0,16),'2027-01-20T20:00');assert.equal(row.businessCode,beforeMove.businessCode);
    });
    }
    const qv = await programme();
    const origins = [
      ['automatique',qv.canonicalProgramme.rows.find(row=>row.definitionId === 'CTA-PERMANENCE')],
      ['transformee',qv.canonicalProgramme.rows.find(row=>row.id === 'qv-source-918')],
      ['manuelle',qv.canonicalProgramme.rows.find(row=>row.id === itemId)],
      ['publiee',qv.canonicalProgramme.rows.find(row=>row.publishedEventId && row.definitionId !== 'CTA-PERMANENCE')]
    ];
    await record('gabarit commun des quatre provenances',async()=>{
      const structures=[];
      for(const [name,row] of origins){assert.ok(row,name);
        await page.goto(`${base}/scope.html#/quo-vadis/programme/${encodeURIComponent(row.id)}`);
        await page.locator('.qv-programme-edit-grid').waitFor();
        structures.push(await page.locator('.qv-programme-edit-grid').evaluate(node=>({
          children:node.children.length,columns:getComputedStyle(node).gridTemplateColumns,
          controls:[...node.querySelectorAll('input,select,summary')].map(input=>input.id || input.type).sort()
        })));
        await page.screenshot({path:path.join(output,`fiche-${name}.png`),fullPage:true});
      }
      for(const structure of structures.slice(1)) assert.deepEqual(structure,structures[0]);
    });
    await record('calendriers et listes desktop, tablette, mobile',async()=>{
      for(const viewport of [{width:1440,height:1000},{width:960,height:900},{width:390,height:844}]){
        await page.setViewportSize(viewport);
        await page.goto(`${base}/scope.html#/quo-vadis/programme/${encodeURIComponent(itemId)}`);
        await page.locator('#qv-programme-date-picker').click();
        let box=await page.locator('#qv-programme-calendar').boundingBox();
        assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width && box.y+box.height<=viewport.height);
        assert.equal(await page.locator('#qv-programme-calendar button[data-qv-calendar-date]').count(),31);
        await page.screenshot({path:path.join(output,`calendrier-${viewport.width}.png`)});
        await page.locator('#qv-programme-date-picker').click();
        for(const summaryId of ['qv-programme-oi-summary','qv-programme-public-summary','qv-programme-qualification-summary']){
          await page.locator(`#${summaryId}`).click();
          const popover=page.locator(`#${summaryId}`).locator('..').locator('.qv-programme-choice-popover');
          await popover.evaluate(node=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          box=await popover.boundingBox();
          if(!(box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width && box.y+box.height<=viewport.height))
            await page.screenshot({path:path.join(output,`popover-failure-${summaryId}-${viewport.width}.png`)});
          assert.ok(box.x>=0 && box.y>=0 && box.x+box.width<=viewport.width && box.y+box.height<=viewport.height,JSON.stringify({summaryId,viewport,box}));
          const last=popover.locator('input[type="checkbox"]').last();await last.scrollIntoViewIfNeeded();assert.ok(await last.isVisible());
          await page.locator(`#${summaryId}`).click();
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      }
      await page.setViewportSize({width:1440,height:1000});
    });
    await record('permanences jaunes tableau, mois, agenda et fiche',async()=>{
      await page.goto(`${base}/scope.html#/quo-vadis/programme`);await page.locator('.qv-programme-table').waitFor();
      await page.getByRole('button',{name:'Réinitialiser',exact:true}).click();
      assert.equal(await page.locator('tr.is-permanence td').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 243, 205)');
      await page.getByRole('button',{name:'Vue mensuelle',exact:true}).click();
      assert.equal(await page.locator('tr.is-permanence td').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 243, 205)');
      await page.goto(`${base}/scope.html#/quo-vadis/agenda-annuel`);await page.locator('.qv-mini-cal').first().waitFor();
      assert.equal(await page.locator('.qv-mini-cal .is-permanence>span').first().evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 243, 205)');
      await page.screenshot({path:path.join(output,'agenda-permanences.png')});
      await page.goto(`${base}/scope.html#/quo-vadis/programme/${encodeURIComponent(origins[0][1].id)}`);
      await page.locator('.qv-programme-summary').waitFor();
      assert.equal(await page.locator('.qv-programme-summary').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 243, 205)');
    });
    assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(output,'recipe-results.json'),JSON.stringify({browser:'Chromium',safari:'NOT_COVERED',results},null,2));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
