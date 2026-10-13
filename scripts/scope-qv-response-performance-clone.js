'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {performance}=require('node:perf_hooks');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {replay}=require('./scope-qv-pr13-final-controls-clone');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const {compactJsonResponse}=require('../netlify/lib/_scope-json-transport');
const {response}=require('../netlify/lib/_auth-utils');
const {gunzipSync}=require('node:zlib');
const {createPgRepo}=require('../netlify/lib/_scope-pg');
const {createScopeService}=require('../netlify/lib/_scope-service');
const {createScopeDashboardService}=require('../netlify/lib/_scope-dashboard-service');
const {createScopeAlertsService}=require('../netlify/lib/_scope-alerts-service');
const Module=require('node:module'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-response-performance-20261013');
const bytes=value=>Buffer.byteLength(JSON.stringify(value) || '','utf8');
async function profile(value) {
  const serialize=performance.now(),body=JSON.stringify({ok:true,quoVadis:value});
  const serializedMs=performance.now()-serialize,parse=performance.now();JSON.parse(body);
  const original=response(200,{ok:true,quoVadis:value}),start=performance.now();
  const compact=await compactJsonResponse({headers:{'accept-encoding':'gzip, deflate, br'}},original);
  const compressionMs=performance.now()-start;
  assert.equal(gunzipSync(Buffer.from(compact.body,'base64')).toString(),original.body);
  return {bodyBytes:Buffer.byteLength(body),lambdaEnvelopeBytes:bytes(original),
    transport:{lambdaEnvelopeBytes:bytes(compact),wireBytes:Buffer.from(compact.body,'base64').length,compressionMs,lossless:true},
    serializedMs,parseMs:performance.now()-parse,
    fields:Object.entries(value).map(([key,data])=>({key,bytes:bytes(data),count:Array.isArray(data)?data.length:null}))
      .sort((a,b)=>b.bytes-a.bytes),
    rowFields:Object.entries((value.canonicalProgramme || {}).rows?.reduce((acc,row)=>{
      for(const [key,data] of Object.entries(row)) acc[key]=(acc[key] || 0)+bytes(data);return acc;
    },{}) || {}).map(([key,size])=>({key,bytes:size})).sort((a,b)=>b.bytes-a.bytes),
    obligationMetadata:Object.entries((value.obligations || []).reduce((acc,row)=>{
      for(const [key,data] of Object.entries(row.metadata || {})) acc[key]=(acc[key] || 0)+bytes(data);return acc;
    },{})).map(([key,size])=>({key,bytes:size})).sort((a,b)=>b.bytes-a.bytes)};
}
async function run() {
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  try {
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client.query.bind(client),tables);
    await client.query('BEGIN');open=true;
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue=Promise.resolve(),sequence=0;const timings=[];
    const query=(sql,args)=>{const next=queue.then(async()=>{const start=performance.now();const result=await client.query(sql,args);
      timings.push({sql:sql.replace(/\s+/g,' ').slice(0,180),ms:performance.now()-start,rows:result.rowCount});return result;});
      queue=next.catch(()=>{});return next;};
    const adapter={query,transaction:async work=>{const name=`performance_${++sequence}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);throw error;}}};
    await replay(query);
    await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    const measures={},values={};
    for(const [name,reference] of [['beforePr13','2d70837773f86e457cfbd5f570f1cf647a1b8274'],['published','89a2f15fb835e40ddc90bbff4132d4868ed6f4c6'],['corrected',null]]) {
      const service=reference?baselineService(reference)({database:adapter}):createScopeQuoVadisService({database:adapter});
      const start=performance.now(),queryStart=timings.length;const data=await service.listProgramme(2027);
      const serviceMs=performance.now()-start;
      values[name]=data;measures[name]={serviceMs,...await profile(data),queries:timings.slice(queryStart)};
    }
    assert.deepEqual(values.corrected.canonicalProgramme,values.published.canonicalProgramme);
    assert.ok(measures.beforePr13.lambdaEnvelopeBytes<6291556);
    assert.ok(measures.published.lambdaEnvelopeBytes>6291556);
    assert.ok(measures.corrected.transport.lambdaEnvelopeBytes<6291556);
    const repo=createPgRepo({query}),service=createScopeService(repo),home={};
    const dashboardFile=path.join(root,'netlify/lib/_scope-dashboard-service.js');
    const entry=new Module(dashboardFile,module);entry.filename=dashboardFile;entry.paths=Module._nodeModulePaths(path.dirname(dashboardFile));
    entry._compile(execFileSync('git',['show','89a2f15:netlify/lib/_scope-dashboard-service.js'],{cwd:root,encoding:'utf8'}),dashboardFile);
    for(const [name,load] of [
      ['referentiels',()=>service.referentiels()],['evenements',()=>service.listEvenements({annee:2026})],
      ['dashboardPublished',()=>entry.exports.createScopeDashboardService(repo).dashboard({year:2026})],
      ['dashboardCorrected',()=>createScopeDashboardService(repo).dashboard({year:2026})],
      ['alerts',()=>createScopeAlertsService(repo).listAlerts({year:2026})]]) {
      const start=performance.now(),queryStart=timings.length;const value=await load(),serviceMs=performance.now()-start;
      const original=response(200,{ok:true,...value}),compressed=await compactJsonResponse({headers:{'accept-encoding':'gzip'}},original);
      const queryLog=timings.slice(queryStart);
      home[name]={serviceMs,bodyBytes:Buffer.byteLength(original.body),lambdaEnvelopeBytes:bytes(original),
        wireBytes:compressed.isBase64Encoded?Buffer.from(compressed.body,'base64').length:Buffer.byteLength(compressed.body),
        queries:queryLog.length,sqlMs:queryLog.reduce((sum,row)=>sum+row.ms,0)};
      if(name==='dashboardPublished') home._original=value;
      if(name==='dashboardCorrected') {assert.deepEqual(value,home._original);delete home._original;home.dashboardIdentical=true;}
    }
    const cible=(await repo.listCibles()).find(row=>row.domaine_code==='DAP');assert.ok(cible);
    const statisticalCases=[];
    for(const params of [{year:2026,domaine:'DAP'},{year:2026,domaine:'DAP',cible:cible.cible_id},{year:2027}]) {
      const expected=await entry.exports.createScopeDashboardService(repo).dashboard(params);
      const current=await createScopeDashboardService(repo).dashboard(params);assert.deepEqual(current,expected);
      statisticalCases.push({params,status:'IDENTICAL',eventCount:current.officiel.eventCount});
    }
    fs.mkdirSync(path.join(root,'output/qv-performance'),{recursive:true});
    for(const [name,value] of Object.entries(values)) fs.writeFileSync(path.join(root,`output/qv-performance/${name}.json`),JSON.stringify(value));
    const during=await hashes(query,tables);
    for(const table of ['scope_evenements','scope_qv_publication_links','scope_participations','scope_affectations','scope_journal_metier'])
      assert.deepEqual(during[table],before[table],table);
    await client.query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    const result={target:'CLONE_WITH_PRODUCTION_BUSINESS_REPLAY',productionWrites:false,limitBytes:6291556,measures,home,
      programmeIntegrity:{compared:values.corrected.canonicalProgramme.rows.length,allFieldsIdentical:true,statComIdentical:true,codesIdentical:true,decisionsIdentical:true},
      statisticalCases,
      rollback:{status:'PASS',tables:tables.length},before,after};
    fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'payload-measures.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({measures:Object.fromEntries(Object.entries(measures).map(([key,value])=>[key,{...value,queries:undefined,rowFields:value.rowFields.slice(0,5),obligationMetadata:value.obligationMetadata.slice(0,5),fields:value.fields.slice(0,10)}])),home,rollback:result.rollback}));
  } finally {if(open) await client.query('ROLLBACK');await client.end();}
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={bytes,profile};
