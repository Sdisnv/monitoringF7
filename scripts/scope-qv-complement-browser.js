'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4410',out=path.join(root,'docs/captures/qv-complement');
const qv=JSON.parse(fs.readFileSync(path.join(root,'output/qv-complement/current.json'),'utf8'));
const labels=['Chef section DAP','Candidat cond VL','Resp matériel','Préposé matériel'];
const inventory=data=>(data.canonicalProgramme?.rows || []).flatMap(row=>[
  ...(row.publicFreeLabels || []).filter(label=>labels.includes(label)).map(label=>({id:row.id,label,kind:'FREE',publishedEventId:row.publishedEventId || null})),
  ...(row.publics || []).filter(label=>labels.includes(label)).map(label=>({id:row.id,label,kind:'LEGACY_CODE',publishedEventId:row.publishedEventId || null}))]);
async function run(){
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
    const errors=[],writes=[],tests=[],auth=[];let writeMode=503;
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1100}});
    assert.equal((await context.request.post(base+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
    const live=await (await context.request.get(base+'/api/scope/quo-vadis/programmes/2027')).json();
    fs.writeFileSync(path.join(out,'free-label-inventory.json'),JSON.stringify({at:new Date().toISOString(),productionProjection:inventory(qv),
      localOpenRecipe:inventory(live.quoVadis),conversionsPerformed:0,exactMappings:Object.fromEntries(labels.map(label=>[label,L.qvProgrammePublicReferenceCode(label)]))},null,2)+'\n');
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.clock.install();
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.origin===base && url.pathname.startsWith('/api/scope/') && request.method()!=='GET'){
        writes.push({path:url.pathname,body:request.postDataJSON()});
        return route.fulfill({status:writeMode,contentType:'application/json',body:JSON.stringify({error:'recipe_write_intercepted',message:'Contrôle sans écriture.'})});
      }
      if(url.origin===base && ['/assets/js/scope-ui.js','/assets/js/scope-ui-logic.js','/assets/js/scope-auth-idle.js','/assets/js/scope-api.js','/assets/css/scope.css'].includes(url.pathname))
        return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,url.pathname.slice(1)),'utf8')});
      if(url.origin===base && url.pathname==='/api/scope/quo-vadis/programmes/2027') return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:qv})});
      return route.continue();
    });
    await page.goto(base+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-cursus').waitFor({timeout:60000});
    const foca=await page.locator('#qv-filter-cursus optgroup[label="FOCA"] option').allTextContents();
    assert.ok(foca.indexOf('Cursus C groupe')<foca.indexOf('Cursus CI DAP'));assert.ok(foca.indexOf('Cursus CI DAP')<foca.indexOf('Cursus CI DPS'));
    for(const row of qv.canonicalProgramme.rows.filter(row=>row.conduiteRule==='QV-DAP-001').filter((row,index,rows)=>rows.findIndex(other=>other.ois[0]===row.ois[0])===index)){
      await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(row.id));await page.locator('#qv-programme-family').waitFor();
      const slots=await page.locator('section').filter({has:page.getByRole('heading',{name:'Conducteurs VL',exact:true})}).last().locator('tbody tr').allTextContents();
      assert.equal(slots.length,4);
      for(const text of slots) assert.equal((text.match(/\d{2}:\d{2} - \d{2}:\d{2}/g) || []).length,3);
      assert.ok(slots[0].includes('18:30 - 19:00'));assert.ok(slots[2].includes('20:00 - 20:30'));
      assert.equal(await page.locator('section.qv-programme-info-panel').filter({has:page.getByRole('heading',{name:'Planification',exact:true})}).locator('dd').nth(1).textContent(),'18:30 - 21:30');
    }
    await page.screenshot({path:path.join(out,'dap-four-places.png'),fullPage:true});
    tests.push('A-G/T-W: quatre OI, quatre places, trois colonnes au format exact ; FOCA et identifiants communs');
    const freeRow=qv.canonicalProgramme.rows.find(row=>(row.publicFreeLabels || []).includes('Chef section DAP'));assert.ok(freeRow);
    await page.goto(base+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(freeRow.id));await page.locator('#qv-programme-family').waitFor();
    const publicItems=await page.locator('#qv-programme-public fieldset').evaluateAll(groups=>groups.map(group=>({group:group.querySelector('legend').textContent,
      labels:[...group.querySelectorAll('label span')].map(span=>span.textContent)})));
    for(const label of labels) assert.equal(publicItems.flatMap(g=>g.labels).filter(value=>value===label).length,1);
    const command=publicItems.find(g=>g.group==='Commandement').labels,auto=publicItems.find(g=>g.group==='AUTO').labels;
    assert.equal(command.indexOf('Chef section DAP'),command.indexOf('Chef DAP')+1);assert.equal(auto.indexOf('Candidat cond VL'),auto.indexOf('cond VL')+1);
    assert.ok(publicItems.find(g=>g.group==='Encadrement').labels.includes('Resp matériel'));
    assert.ok(publicItems.find(g=>g.group==='Encadrement').labels.includes('Préposé matériel'));
    assert.equal(await page.locator('#qv-programme-public input[value="CMDT:CHEF-SECTION-DAP"]').isChecked(),true);
    await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>document.querySelector('#qv-programme-save')?.disabled===false);
    assert.equal(writes.length,1);assert.deepEqual(writes[0].body.publicFreeLabels,freeRow.publicFreeLabels);
    assert.deepEqual(writes[0].body.publicCodes,freeRow.publics);
    await page.getByRole('button',{name:'Fermer la notification',exact:true}).click();
    tests.push('O-S: quatre libellés uniques et positions exactes ; payload intercepté conserve les valeurs libres et codes originaux');
    await page.locator('#qv-programme-themes').fill('Brouillon recette non enregistré');
    const originalHash=await page.evaluate(()=>location.hash);
    const probe=async()=>page.evaluate(async()=>{
      let unauthorized=0;const client=window.ScopeApi.createHttpClient({onUnauthorized:()=>unauthorized++});
      window.MonitoringApiClient.setAccessToken('expired-recipe-token');
      try{await client.sessionMe();return {status:200,unauthorized};}catch(error){return {status:error.status,unauthorized};}
    });
    const refreshed=await probe();assert.deepEqual(refreshed,{status:200,unauthorized:0});auth.push({mode:'real local cookie renewal',...refreshed});
    const refreshRoute=async route=>route.abort();await page.route('**/auth/refresh',refreshRoute);
    const network=await probe();assert.deepEqual(network,{status:0,unauthorized:0});auth.push({mode:'temporary network failure',...network});await page.unroute('**/auth/refresh',refreshRoute);
    const unavailable=async route=>route.fulfill({status:503,contentType:'application/json',body:'{}'});await page.route('**/auth/refresh',unavailable);
    const temporary=await probe();assert.deepEqual(temporary,{status:0,unauthorized:0});auth.push({mode:'temporary refresh 503',...temporary});await page.unroute('**/auth/refresh',unavailable);
    await probe();await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await probe();
    assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Brouillon recette non enregistré');assert.equal(await page.evaluate(()=>location.hash),originalHash);
    await page.clock.fastForward(9*60*1000+1000);await page.locator('#scope-idle-stay').waitFor();
    assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Brouillon recette non enregistré');
    await page.locator('#scope-idle-stay').click();assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Brouillon recette non enregistré');
    await page.screenshot({path:path.join(out,'session-draft-retained.png'),fullPage:true});
    tests.push('H-N: renouvellement réel local, réseau et 503 simulés sans déconnexion, contexte et brouillon conservés, alerte à neuf minutes sans perte de saisie');
    const denied=async route=>route.fulfill({status:403,contentType:'application/json',body:'{"error":"forbidden"}'});
    await page.route('**/api/scope/personnes?*',denied);
    const forbidden=await page.evaluate(async()=>{let count=0;try{await window.ScopeApi.createHttpClient({onUnauthorized:()=>count++}).listPersonnes('permission-probe');}
      catch(error){return {status:error.status,unauthorized:count};}});
    assert.deepEqual(forbidden,{status:403,unauthorized:0});auth.push({mode:'permission denied',...forbidden});
    await page.unroute('**/api/scope/personnes?*',denied);
    writeMode=401;
    const expired=async route=>route.fulfill({status:401,contentType:'application/json',body:'{"error":"unauthorized"}'});
    await page.route('**/auth/refresh',expired);
    await page.locator('#qv-programme-save').click();await page.locator('#scope-login-nip').waitFor();
    assert.equal(await page.evaluate(()=>location.hash),originalHash);
    await page.unroute('**/auth/refresh',expired);
    if(await page.getByRole('button',{name:'Fermer la notification',exact:true}).isVisible())
      await page.getByRole('button',{name:'Fermer la notification',exact:true}).click();
    await page.locator('#scope-login-nip').fill('recipe.p0');await page.locator('#scope-login-password').fill('Recipe-P0-Local-2026!');
    await page.locator('#scope-local-login-submit').click();await page.locator('#qv-programme-themes').waitFor({timeout:60000});
    await page.waitForFunction(()=>document.querySelector('#qv-programme-themes')?.value==='Brouillon recette non enregistré');
    assert.equal(await page.locator('#qv-programme-themes').inputValue(),'Brouillon recette non enregistré');
    await page.getByRole('status').filter({hasText:'Saisie non enregistrée restaurée après reconnexion.'}).waitFor();
    tests.push('I/K/N: 401 définitif affiche la reconnexion ; même utilisateur et version inchangée retrouvent le brouillon, jamais annoncé enregistré');
    await page.locator('#qv-programme-themes').fill('Brouillon à ne pas restaurer sur une version modifiée');
    await page.route('**/auth/refresh',expired);
    await page.locator('#qv-programme-save').click();await page.locator('#scope-login-nip').waitFor();
    freeRow.preparation.updatedAt=new Date(Date.parse(freeRow.preparation.updatedAt)+1000).toISOString();
    await page.unroute('**/auth/refresh',expired);
    if(await page.getByRole('button',{name:'Fermer la notification',exact:true}).isVisible())
      await page.getByRole('button',{name:'Fermer la notification',exact:true}).click();
    await page.locator('#scope-login-nip').fill('recipe.p0');await page.locator('#scope-login-password').fill('Recipe-P0-Local-2026!');
    await page.locator('#scope-local-login-submit').click();
    await page.getByRole('status').filter({hasText:'La fiche ou vos droits ont changé.'}).waitFor({timeout:60000});
    assert.notEqual(await page.locator('#qv-programme-themes').inputValue(),'Brouillon à ne pas restaurer sur une version modifiée');
    tests.push('N/Z: version concurrente différente refuse la restauration du brouillon ; aucune décision plus récente écrasée');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({status:'PASS',tests,auth,publicItems,errors,businessServerWrites:0,
      interceptedSaves:writes,mode:'existing local recipe, isolated new assets/projection; no change to open MOA session'},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',groups:tests.length,businessServerWrites:0,errors:0}));
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
