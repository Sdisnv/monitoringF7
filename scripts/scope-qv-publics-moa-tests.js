'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const L=require('../assets/js/scope-ui-logic');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const root=path.resolve(__dirname,'..'),base='435bed709dc61c6534d1e58ce2978c6f7bbceac2';
const out=path.join(root,'docs/captures/qv-publics-moa');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const old=file=>execFileSync('git',['show',`${base}:${file}`],{cwd:root,encoding:'utf8',maxBuffer:4000000});
const qv=JSON.parse(fs.readFileSync(process.env.SCOPE_QV_PUBLIC_FIXTURE || '/private/tmp/scope-qv-complement-moa-20261015/output/qv-complement/current.json','utf8'));
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const functionSource=(text,name)=>{const start=text.indexOf(`  function ${name}(`);assert.ok(start>=0,name);return text.slice(start,text.indexOf('\n  function ',start+1));};
const inventory=JSON.parse(read('docs/captures/qv-publics-moa/inventory-readonly.json'));
const targetId=inventory.historicalSelection[0].sourceRef;
const cases=[
  {name:'actual-trailing-space',publics:[],publicFreeLabels:inventory.historicalSelection[0].publicFreeLabels},
  {name:'exact-with-other-selections',publics:['ECH:II','PR:2','ENC:PREPOSE-MATERIEL'],publicFreeLabels:['Chef section DAP','Resp matériel','Atelier : logistique','C inconnu']},
  {name:'legacy-and-common-codes',publics:['CMDT:CHEF-SECTION-DAP','ENC:C-SECTION','ENC:RESP-MATERIEL','AUTO:1'],publicFreeLabels:['Resp matériel ','C for','C PR','C DAP']},
  {name:'reference-and-free-aliases',publics:['ENC:RESP-MATERIEL','PR:C-PR','AUTO:CAND-PL'],publicFreeLabels:['Resp matériel','Chef section DPS','C for','C log','C op','C PR']}
];

function unitChecks(){
  const sandbox={module:{exports:{}},globalThis:{}};vm.runInNewContext(old('assets/js/scope-ui-logic.js'),sandbox);
  const previous=sandbox.module.exports;
  assert.equal(JSON.stringify(L.qvProgrammePublicCatalogue()),JSON.stringify(previous.qvProgrammePublicCatalogue()));
  assert.equal(JSON.stringify(L.qvProgrammeDescriptivePublics()),JSON.stringify(previous.qvProgrammeDescriptivePublics()));
  const catalogue=L.qvProgrammePublicDisplayCatalogue(),items=catalogue.flatMap(group=>group.items);
  assert.equal(items.filter(([,label])=>label==='Chef section').length,1);
  assert.equal(items.some(([code])=>code==='CMDT:CHEF-SECTION-DAP'),false);
  assert.equal(L.qvProgrammePublicReferenceCode('CMDT:CHEF-SECTION-DAP'),'ENC:C-SECTION');
  for(const value of ['Chef section DAP','Chef section DPS','Chef section','C section']) assert.equal(L.qvProgrammePublicReferenceCode(value),'ENC:C-SECTION');
  for(const [candidate,driver] of [['AUTO:CAND-PL','AUTO:1'],['AUTO:CAND-TP9','AUTO:2'],['AUTO:CAND-VL','AUTO:3']]){
    const auto=catalogue.find(group=>group.group==='AUTO').items;
    assert.equal(auto.findIndex(([code])=>code===candidate),auto.findIndex(([code])=>code===driver)+1);
  }
  for(const [,label] of items) assert.equal(label[0],label[0].toLocaleUpperCase('fr'));
  const aliases={'C for':'Chef formation','C log':'Chef logistique','C op':'Chef opérationnel','C DAP':'Chef DAP','C PR':'Chef PR'};
  for(const [raw,display] of Object.entries(aliases)) assert.equal(L.qvProgrammePublicDisplayLabel(raw),display);
  assert.equal(L.qvProgrammePublicDisplayLabel('C inconnu'),'C inconnu');
  assert.equal(L.qvProgrammePublicReferenceCode('Inconnu '),'Inconnu ');
  assert.equal(L.qvFormatPublicDisplayLabels(['ENC:RESP-MATERIEL'],['Resp matériel ']),'Resp matériel');
  assert.equal(L.qvProgrammePublicReferenceCode('resp matériel'),'resp matériel');
  for(const label of ['Atelier : logistique','constructor','toString','C inconnu']){
    assert.equal(L.qvProgrammePublicReferenceCode(label),label);
    assert.equal(L.qvFormatPublicDisplayLabels([],[label]),label);
  }
  const encadrement=catalogue.find(group=>group.group==='Encadrement').items;
  for(const code of ['ENC:RESP-MATERIEL','ENC:PREPOSE-MATERIEL']) assert.equal(encadrement.filter(([key])=>key===code).length,1);
  const {hooks}=createCatalogUiHarness(),baseline=createCatalogUiHarness();
  baseline.context.window.ScopeUiLogic=previous;vm.runInContext(old('assets/js/scope-ui.js'),baseline.context);
  assert.equal(JSON.stringify(hooks.quoVadisProgrammeExport(qv)),JSON.stringify(baseline.context.window.ScopeUiTestHooks.quoVadisProgrammeExport(qv)));
  const original=fingerprint(qv);
  for(const fixture of cases){
    const payload=structuredClone(qv),row=payload.canonicalProgramme.rows.find(item=>item.id===targetId);assert.ok(row);
    Object.assign(row,{publics:fixture.publics,publicFreeLabels:fixture.publicFreeLabels});
    const before=fingerprint(payload),html=hooks.renderQuoVadisProgrammeFicheHtml(payload,row.id);
    assert.equal(JSON.stringify(hooks.quoVadisProgrammeExport(payload)),JSON.stringify(baseline.context.window.ScopeUiTestHooks.quoVadisProgrammeExport(payload)));
    assert.ok(html.includes('value="ENC:C-SECTION" checked'));
    for(const code of ['ENC:C-SECTION','ENC:RESP-MATERIEL']) assert.ok(hooks.filterQuoVadisProgrammeRows(payload,{cible:code}).some(item=>item.id===row.id));
    assert.equal(fingerprint(payload),before);
  }
  assert.equal(fingerprint(qv),original);
  for(const name of ['qvProgrammeTime','qvProgrammeTimeHtml','qvProgrammeOiHtml','qvProgrammeCtaLines'])
    assert.equal(functionSource(read('assets/js/scope-ui.js'),name),functionSource(old('assets/js/scope-ui.js'),name));
  return {status:'PASS',cases:cases.length,rawCatalogueUnchanged:true,descriptiveCodesUnchanged:true,
    exportsIdentical:true,projectionUnchanged:true,abbreviations:aliases,displayCatalogue:catalogue,rows:qv.canonicalProgramme.rows.length};
}

async function cloneChecks(){
  const {Client}=require('pg'),{evaluatePublicRule}=require('../netlify/lib/_scope-public-engine');
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=['scope_quo_vadis_obligations','scope_evenements','scope_affectations','scope_participations','scope_attendus',
      'scope_journal_metier','scope_qv_publication_links','scope_event_code_allocations','scope_personnes','scope_public_definitions','scope_public_rule_versions'];
    const before=await hashes(client.query.bind(client),tables);await client.query('BEGIN READ ONLY');open=true;
    const persons=(await client.query('select id as personne_id,nip from scope_personnes')).rows;
    const assignments=(await client.query("select id,personne_id,domaine as \"domainCode\",cible as \"oiCode\",date_actif::text as \"validFrom\",date_inactif::text as \"validTo\" from scope_affectations where categorie='OI'")).rows;
    const results=[];
    for(const [domain,ois] of [['DPS',['G1','C1','B1','B2']],['DAP',['Y1','Y2','Y3','Y4']]]){
      const expression={predicate:'HAS_OI',domainCode:domain,oiCodes:ois};
      const result=evaluatePublicRule({evaluationDate:'2027-01-01',ruleVersion:{expression},persons:persons.concat(persons),assignments});
      assert.equal(result.complete,true);assert.equal(result.personIds.length,new Set(result.personIds).size);
      const expected=[...new Set(assignments.filter(row=>row.domainCode===domain && ois.includes(row.oiCode) && row.validFrom && row.validFrom<='2027-01-01' && (!row.validTo || row.validTo>='2027-01-01')).map(row=>row.personne_id))].sort();
      assert.deepEqual(result.personIds,expected);
      results.push({domain,distinctPeople:result.personIds.length,scope:'OI assignments only; NOT a count of section chiefs'});
    }
    const missing=evaluatePublicRule({evaluationDate:'2027-01-01',ruleVersion:{expression:{predicate:'HAS_PERSON_FUNCTION',functionCodes:['DPS_CHEF_SECTION']}},persons,assignments});
    assert.equal(missing.complete,false);assert.ok(missing.warnings.includes('MISSING_INPUT_FUNCTIONS'));
    await client.query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    return {status:'PASS',clone:DATABASE,readOnly:true,rollbackVerified:true,before,after,datedOiChecks:results,
      chiefsExtraction:'NOT_AVAILABLE: missing persisted dated person-function-domain-OI relation and function facts adapter',warnings:missing.warnings};
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}

async function browserChecks(){
  const {chromium}=require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');
  const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const errors=[],saves=[],proofs=[],url='http://127.0.0.1:4410';
  const original=fingerprint(qv);
  try{
    for(const version of ['before','after']) for(const viewport of [{width:1440,height:1100},{width:1366,height:768}]){
      const context=await browser.newContext({viewport});
      assert.equal((await context.request.post(url+'/auth/login',{data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}})).status(),200);
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      let payload=structuredClone(qv);Object.assign(payload.canonicalProgramme.rows.find(row=>row.id===targetId),cases[0]);
      await page.route('**/*',async route=>{
        const request=route.request(),target=new URL(request.url());
        if(target.origin!==url) return route.abort();
        if(target.pathname.startsWith('/api/scope/') && request.method()!=='GET'){
          saves.push({path:target.pathname,body:request.postDataJSON()});
          return route.fulfill({status:503,contentType:'application/json',body:'{"error":"recipe_write_intercepted","message":"Contrôle sans écriture."}'});
        }
        if(target.pathname==='/api/scope/quo-vadis/programmes/2027') return route.fulfill({contentType:'application/json',body:JSON.stringify({quoVadis:payload})});
        if(['/assets/js/scope-ui.js','/assets/js/scope-ui-logic.js'].includes(target.pathname)) return route.fulfill({contentType:'application/javascript',body:version==='before'?old(target.pathname.slice(1)):read(target.pathname.slice(1))});
        if(['/assets/js/scope-auth-idle.js','/assets/js/scope-api.js','/assets/css/scope.css'].includes(target.pathname)) return route.fulfill({contentType:target.pathname.endsWith('.css')?'text/css':'application/javascript',body:read(target.pathname.slice(1))});
        return route.continue();
      });
      await page.goto(url+'/scope.html#/quo-vadis/programme');await page.locator('#qv-filter-cible').waitFor({timeout:60000});
      if(version==='after'){
        const filter=await page.locator('#qv-filter-cible option').evaluateAll(options=>options.map(item=>({code:item.value,label:item.textContent.trim()})));
        assert.equal(filter.filter(item=>item.label==='Chef section').length,1);
        for(const [candidate,driver] of [['AUTO:CAND-PL','AUTO:1'],['AUTO:CAND-TP9','AUTO:2'],['AUTO:CAND-VL','AUTO:3']]) assert.equal(filter.findIndex(item=>item.code===candidate),filter.findIndex(item=>item.code===driver)+1);
        await page.locator('#qv-filter-cible').selectOption('ENC:RESP-MATERIEL');
        await page.locator(`a.qv-programme-action[href$="${encodeURIComponent(targetId)}"]`).waitFor();
      }
      await page.goto(url+'/scope.html#/quo-vadis/programme/'+encodeURIComponent(targetId));await page.locator('#qv-programme-family').waitFor();
      const open=async()=>page.locator('.qv-programme-choice-field').filter({has:page.locator('#qv-programme-public')}).locator('summary').click();
      await open();
      const free=page.locator('#qv-programme-public [data-free-choices]');
      const trailingBefore=await free.locator('label').allTextContents();
      if(version==='before') assert.ok(trailingBefore.some(value=>value==='Resp matériel '));
      else assert.equal(trailingBefore.some(value=>value.trim()==='Resp matériel'),false);
      const group=page.locator('#qv-programme-public fieldset').filter({has:page.locator('legend').filter({hasText:/^Encadrement$/})});
      await group.scrollIntoViewIfNeeded();
      await page.locator('.qv-programme-choice-field').filter({has:page.locator('#qv-programme-public')}).locator('.qv-programme-choice-popover').screenshot({path:path.join(out,`publics-${version}-${viewport.width}.png`)});
      if(version==='after'){
        for(const fixture of cases){
          payload=structuredClone(qv);Object.assign(payload.canonicalProgramme.rows.find(row=>row.id===targetId),fixture);
          await page.reload();await page.locator('#qv-programme-family').waitFor();await open();
          const selected=await page.locator('#qv-programme-public input:checked').evaluateAll(inputs=>inputs.map(input=>({code:input.value,preservedCodes:input.dataset.preservedCodes,preservedFree:input.dataset.preservedFree})));
          for(const code of ['ENC:C-SECTION','ENC:RESP-MATERIEL']) assert.equal(await page.locator(`#qv-programme-public input[value="${code}"]`).isChecked(),true);
          const labels=await page.locator('#qv-programme-public label span').allTextContents();
          assert.equal(labels.filter(label=>label==='Chef section').length,1);assert.equal(labels.filter(label=>label.trim()==='Resp matériel').length,1);
          assert.equal(labels.some(label=>label==='Chef section DAP'),false);
          await open();await page.locator('#qv-programme-themes').fill('Contrôle local non enregistré');
          await page.locator('#qv-programme-save').click();await page.waitForFunction(()=>document.querySelector('#qv-programme-save')?.disabled===false);
          assert.equal(saves.length,proofs.length+1);
          const save=saves.at(-1);
          assert.deepEqual([...save.body.publicCodes].sort(),[...fixture.publics].sort());
          assert.deepEqual([...save.body.publicFreeLabels].sort(),[...fixture.publicFreeLabels].sort());
          const preserved=fingerprint({publics:save.body.publicCodes,free:save.body.publicFreeLabels});
          proofs.push({case:fixture.name,viewport,selected,payloadPublicsPreserved:true,publicsFingerprint:preserved});
        }
      }
      await context.close();
    }
    assert.deepEqual(errors,[]);assert.equal(fingerprint(qv),original);
    return {status:'PASS',browser:'Google Chrome / Playwright',viewports:2,cases:proofs,errors,interceptedSaveCount:saves.length,businessServerWrites:0,
      projectionRows:qv.canonicalProgramme.rows.length,mode:'isolated asset/projection interception on existing local recipe; not installed in the live MOA tab'};
  }finally{await browser.close();}
}

async function run(){
  fs.mkdirSync(out,{recursive:true});
  const result={reference:base,unit:unitChecks(),clone:await cloneChecks(),browser:await browserChecks(),productionBusinessWrites:0};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',rows:result.unit.rows,browserCases:result.browser.cases.length,cloneRollback:true,productionWrites:0,chiefsExtraction:'MISSING_RELATION_DOCUMENTED'}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
