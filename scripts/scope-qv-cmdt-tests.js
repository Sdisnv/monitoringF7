'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto'),{Client}=require('pg');
const L=require('../assets/js/scope-ui-logic'),{createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-cmdt'),base='0d1fc89912d0b03120e3c57a8d0f9dd83c2dcf41';
const input=process.env.SCOPE_CMDT_PROJECTION || '/private/tmp/scope-qv-preparation-sdis-20261015/output/qv-preparation-sdis/current.json';
const definitions=['QV26-SEANCE-EM-ED042EBD','QV26-SEANCE-CODIR-92921E7C','QV26-SEANCE-CODIR-REPAS-81897EA7',
  'QV26-SEANCE-CRDIS-B8654449','QV26-CONFERENCE-DES-COMMANDANTS-A2DEA769'];
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
function baseline(){
  const {context}=createCatalogUiHarness(),sandbox={module:{exports:{}},globalThis:{}};
  const source=file=>execFileSync('git',['show',base+':'+file],{cwd:root,encoding:'utf8',maxBuffer:4000000});
  vm.runInNewContext(source('assets/js/scope-ui-logic.js'),sandbox);context.window.ScopeUiLogic=sandbox.module.exports;
  vm.runInContext(source('assets/js/scope-ui.js'),context);return context.window.ScopeUiTestHooks;
}
async function clone(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  const tables=['scope_quo_vadis_obligations','scope_evenements','scope_qv_publication_links','scope_affectations','scope_participations',
    'scope_attendus','scope_journal_metier','scope_event_code_allocations','scope_evenement_ois','scope_evenement_publics_qv','scope_personnes'];
  try{
    await client.query("set statement_timeout='20s';set lock_timeout='3s'");
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const before=await hashes(client.query.bind(client),tables);await client.query('BEGIN READ ONLY');open=true;
    assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only,'on');
    const qv=JSON.parse(fs.readFileSync(input,'utf8')),immutable=JSON.stringify(qv),old=baseline(),{hooks}=createCatalogUiHarness();
    const active=qv.canonicalProgramme.rows.filter(L.qvProgrammeIsActive),cmdt=active.filter(row=>definitions.includes(row.definitionId)
      && L.qvProgrammeConfirmedOiCodes(row).includes('SDIS'));
    assert.ok(cmdt.length);assert.equal(new Set(cmdt.map(row=>row.definitionId)).size,5);
    const cmdtIds=new Set(cmdt.map(row=>row.id)),nonCmdtSdis=active.filter(row=>L.qvProgrammeConfirmedOiCodes(row).includes('SDIS') && !cmdtIds.has(row.id));
    const oiCodes=L.qvProgrammeOiCatalogue().filter(group=>group.group!=='SDIS').flatMap(group=>group.items.map(([code])=>code));assert.equal(oiCodes.length,11);
    for(const row of cmdt){
      assert.equal(L.qvProgrammeDiffusionScope(row),'CMDT');
      assert.equal(L.qvProgrammeDiffusionScope({...row,label:'Titre humain conservé',domain:'F7',family:'Famille humaine',publics:[]}),'CMDT');
      assert.equal(L.qvProgrammeDiffusionScope({...row,id:'LINEAGE:'+row.id,lineage:{initialOccurrence:row.id}}),'CMDT');
      assert.equal(L.qvProgrammeOiMatches(row,'SDIS'),true);assert.equal(L.qvProgrammeOiMatches(row,'tous'),true);
    }
    for(const definitionId of definitions){
      assert.equal(L.qvProgrammeDiffusionScope({oiSelections:['SDIS'],sessionStructure:{definitionId}}),'CMDT');
      assert.equal(L.qvProgrammeDiffusionScope({oiSelections:['SDIS'],typeSource:{definitionId}}),'CMDT');
      assert.equal(L.qvProgrammeDiffusionScope({oiSelections:['DAP:Y1'],definitionId}),'');
    }
    for(const row of [{label:'Séance Codir',domain:'F0',statCom:'070F0',publics:['CMDT:CODIR']},
      {label:'Séance cadres F5/6',definitionId:'QV26-SEANCE-CADRES-F5-6'}, {definitionId:'UNKNOWN',label:'Séance État-major'}]){
      const candidate={...row,oiSelections:['SDIS']};assert.equal(L.qvProgrammeDiffusionScope(candidate),'');assert.equal(L.qvProgrammeOiMatches(candidate,'DAP:Y1'),true);
    }
    const filters=[];
    for(const oi of [...oiCodes,'DPS','DAP','JSP']){
      const beforeRows=old.filterQuoVadisProgrammeRows(qv,{oi}),rows=hooks.filterQuoVadisProgrammeRows(qv,{oi});
      const expected=beforeRows.filter(row=>!cmdtIds.has(row.id)).map(row=>row.id).sort();
      assert.deepEqual(rows.map(row=>row.id).sort(),expected);assert.equal(new Set(expected).size,expected.length);
      for(const row of nonCmdtSdis) assert.ok(rows.some(item=>item.id===row.id));
      filters.push({oi,before:beforeRows.length,after:rows.length,removedCmdt:beforeRows.length-rows.length,nonCmdtSdis:nonCmdtSdis.length});
    }
    const exports=[];
    for(const oi of ['tous','SDIS']){
      const beforeModel=old.quoVadisProgrammeExport(qv,{oi}),model=hooks.quoVadisProgrammeExport(qv,{oi});
      assert.equal(JSON.stringify(model),JSON.stringify(beforeModel));
      assert.equal(hooks.quoVadisProgrammeCsvText(model.rows),old.quoVadisProgrammeCsvText(beforeModel.rows));
      exports.push({oi,count:model.rows.length,identical:true,modelHash:hash(model),csvHash:hash(hooks.quoVadisProgrammeCsvText(model.rows))});
    }
    const combined=hooks.filterQuoVadisProgrammeRows(qv,{oi:'DAP:Y1',type:'Exercice',statcom:'013Y1'});
    assert.ok(combined.length);assert.deepEqual(combined.map(row=>row.id),old.filterQuoVadisProgrammeRows(qv,{oi:'DAP:Y1',type:'Exercice',statcom:'013Y1'}).map(row=>row.id));
    assert.equal(JSON.stringify(qv),immutable);
    const unchanged=['netlify/lib/_scope-quo-vadis-service.js','netlify/lib/_scope-service.js','netlify/lib/_scope-public-engine.js',
      'netlify/lib/_scope-report-service.js','assets/js/scope-ui.js','assets/js/scope-qv-coverage.js'];
    for(const file of unchanged) assert.equal(execFileSync('git',['diff',base,'--',file],{cwd:root,encoding:'utf8'}),'');
    await client.query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    const result={status:'PASS',base,database:DATABASE,transactionReadOnly:true,rollbackVerified:true,productionWrites:0,
      projectionSource:'PR26 private representative clone projection (not a fresh exhaustive production snapshot)',
      projectionRows:qv.canonicalProgramme.rows.length,activeRows:active.length,inputHash:hash(immutable),outputHash:hash(qv),
      cmdt:cmdt.map(row=>({id:row.id,definitionId:row.definitionId,label:row.label,oi:row.oiSelections,statCom:row.statCom,
        code:row.businessCode || row.publishedEventCode || row.code,startsAt:row.startsAt,endsAt:row.endsAt,publishedEventId:row.publishedEventId,
        humanDecision:row.humanDecision,businessValidated:Boolean(row.businessValidation)})),
      filters,exports,nonCmdtSdis:nonCmdtSdis.map(row=>({id:row.id,label:row.label})),
      qualification:{exactDefinitions:true,noTitleDomainPublicOrStatcomInference:true,manualCanonicalType:true,lineagePreserved:true},
      unchanged,before,after};
    fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'targeted-results.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',cmdt:cmdt.length,nonCmdtSdis:nonCmdtSdis.length,filters,exports,rollback:true}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
if(require.main===module) clone().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={input,definitions,baseline};
