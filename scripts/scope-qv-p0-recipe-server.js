'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { createScopeQuoVadisService } = require('../netlify/lib/_scope-quo-vadis-service');
const { synchronizeEcawinReferential } = require('../netlify/lib/_scope-ecawin-referential');
const { permissionsForRoles } = require('../netlify/lib/_rbac');
const { generateQuoVadisProgrammeReport } = require('../netlify/lib/_scope-report-service');

const performanceMode=process.argv.find(arg=>/^--performance-(before|after)$/.test(arg));
const postRecetteMode=process.argv.includes('--post-recette-moa');
if(performanceMode || postRecetteMode) {
  for(const mode of ['ROADMAP','COMPLEMENT','FINALISATION','CORRECTIVE','MOA13','FINAL_CONTROLS','PERFORMANCE'])
    process.env[`SCOPE_RECIPE_${mode}`]='1';
  process.env.SCOPE_RECIPE_PERFORMANCE_BEFORE=performanceMode==='--performance-before'?'1':'0';
  process.env.SCOPE_RECIPE_EVIDENCE_DIR=postRecetteMode?'docs/captures/qv-post-recette-moa-20261013/browser'
    :`docs/captures/qv-response-performance-20261013/browser-${performanceMode.slice(14)}`;
}

const root = path.resolve(__dirname, '..');
const sessions = new Map();
const blobsId = require.resolve('@netlify/blobs');
require.cache[blobsId] = {id:blobsId,filename:blobsId,loaded:true,exports:{
  connectLambda(){},getDeployStore(){return {
    async setJSON(key,value){sessions.set(key,value);},async get(key){return sessions.get(key) || null;},
    async delete(key){sessions.delete(key);}
  };}
}};
process.env.MONITORING_F7_AUTH_SECRET = 'scope-p0-loopback-recipe-only-secret';
process.env.MONITORING_F7_AUTH_METHODS = 'local';
const authUtils = require('../netlify/lib/_auth-utils');
process.env.MONITORING_F7_AUTH_USERS = JSON.stringify([{nip:'recipe.p0',displayName:'Recette P0',roles:['GESTIONNAIRE'],active:true,
  passwordHash:authUtils.createPasswordHash('Recipe-P0-Local-2026!')}]);
const authHandlers = {
  '/auth/config':require('../netlify/functions/auth-config').handler,
  '/auth/login':require('../netlify/lib/_local-login').handler,
  '/auth/me':require('../netlify/functions/auth-me').handler,
  '/auth/refresh':require('../netlify/functions/auth-refresh').handler,
  '/auth/logout':require('../netlify/functions/auth-logout').handler
};
const database = 'scope_qv_2027_recipe_20261006';
const client = new Client({connectionString:`postgresql://127.0.0.1:5432/${database}`});
const port = 4410;
const user = {sub:'local-qv-create',nip:'local-qv-create',displayName:'Recette locale',
  role:'GESTIONNAIRE',roles:['GESTIONNAIRE'],permissions:permissionsForRoles(['GESTIONNAIRE']),active:true};
const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
let protectedTables = ['scope_quo_vadis_obligations','scope_evenements','scope_participations',
  'scope_affectations','scope_attendus','scope_qv_publication_links','scope_event_code_sequences','scope_event_code_allocations','scope_quo_vadis_calendar_days',
  'scope_personnes','scope_person_qualifications','scope_competence_definitions',
  'scope_quo_vadis_cursus_definitions','scope_quo_vadis_cursus_steps',
  'scope_quo_vadis_cursus_programmes','scope_quo_vadis_cursus_step_programmes','scope_statcom_referentiel',
  'scope_lieux','scope_salles_theorie','scope_responsable_fonctions','scope_ois','scope_domaine_ois'];
const json = (response,status,body) => {
  response.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  response.end(JSON.stringify(body));
};
async function fingerprint(table) {
  return (await client.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from ${table} t`)).rows[0];
}
let baseline;
let originalPreparations;
let originalEvents;
const touchedReferences=new Set();
const touchedEvents=new Set();
let recipeFailureAfterWrite=false;
let recipeWritten=false;
let queue = Promise.resolve();
const query = (...args) => {
  if(recipeFailureAfterWrite && recipeWritten && /select .*from scope_quo_vadis_programmes/s.test(args[0])){
    recipeFailureAfterWrite=false;
    return Promise.reject(new Error('Enregistrement indisponible en recette (erreur serveur simulée).'));
  }
  if(/^(insert into|update) scope_quo_vadis_obligations/.test(args[0].trim())){
    recipeWritten=true;touchedReferences.add(String(args[1]?.[1] || ''));
  }
  if(process.env.SCOPE_RECIPE_MOA13==='1' && /update scope_evenements/i.test(args[0])){
    const match=args[0].match(/where\s+evenement_id=\$(\d+)/i);
    if(match) touchedEvents.add(String(args[1]?.[Number(match[1])-1]));
  }
  const next = queue.then(() => client.query(...args));
  queue = next.catch(() => {});
  return next;
};
let transactionId=0;
const service = createScopeQuoVadisService({database:{query,transaction:async work=>{
  const name=`recipe_service_${++transactionId}`;
  await query(`savepoint ${name}`);
  try{
    const result=await work({query});await query(`release savepoint ${name}`);return result;
  }catch(error){
    await query(`rollback to savepoint ${name}`);await query(`release savepoint ${name}`);throw error;
  }
}}});
let performanceHandler;
const performanceRequests=[];
if(process.env.SCOPE_RECIPE_PERFORMANCE==='1') {
  const pg=require('../netlify/lib/_scope-pg'),db=require('../netlify/lib/_postgres');
  Object.assign(db,{query,transaction:async work=>{
    const name=`performance_request_${++transactionId}`;await query(`SAVEPOINT ${name}`);
    try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
    catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);throw error;}
  }});
  pg.getPgRepo=async()=>pg.createPgRepo({query});
  if(process.env.SCOPE_RECIPE_PERFORMANCE_BEFORE==='1') {
    const Module=require('node:module'),{execFileSync}=require('node:child_process');
    for(const relative of ['netlify/lib/_scope-dashboard-service.js','netlify/functions/scope.js']) {
      const file=path.join(root,relative),entry=new Module(file,module);entry.filename=file;
      entry.paths=Module._nodeModulePaths(path.dirname(file));
      entry._compile(execFileSync('git',['show',`89a2f15:${relative}`],{cwd:root,encoding:'utf8'}),file);
      require.cache[file]=entry;
    }
  }
  performanceHandler=require('../netlify/functions/scope').handler;
}
let requests = Promise.resolve();
const server = http.createServer((request,response) => {
  const work = async () => {
    const url = new URL(request.url,'http://127.0.0.1');
    if(authHandlers[url.pathname]){
      const body = (await Array.fromAsync(request)).map(chunk => chunk.toString()).join('');
      const result = await authHandlers[url.pathname]({httpMethod:request.method,headers:request.headers,body});
      const headers = {...result.headers};
      // Loopback HTTP recipe only; production cookies retain Secure.
      if(result.multiValueHeaders?.['Set-Cookie']) headers['Set-Cookie'] = result.multiValueHeaders['Set-Cookie'].map(cookie=>cookie.replace(/;\s*Secure/ig,''));
      response.writeHead(result.statusCode,headers);return response.end(result.body);
    }
    if(url.pathname.startsWith('/api/')){
      try { await authUtils.verifyAccess({headers:request.headers}); }
      catch(_error){return json(response,401,{ok:false,error:'unauthorized'});}
    }
    if(performanceHandler && url.pathname.startsWith('/api/scope/')) {
      const body=(await Array.fromAsync(request)).map(chunk=>chunk.toString()).join('');
      const started=performance.now();
      const handlerHeaders=postRecetteMode?{...request.headers,'accept-encoding':'identity'}:request.headers;
      let result=await performanceHandler({httpMethod:request.method,headers:handlerHeaders,
        path:url.pathname,rawUrl:url.href,queryStringParameters:Object.fromEntries(url.searchParams),body});
      const durationMs=performance.now()-started;
      const envelopeBytes=Buffer.byteLength(JSON.stringify(result));
      performanceRequests.push({method:request.method,path:url.pathname,status:result.statusCode,durationMs,envelopeBytes,
        wireBytes:result.isBase64Encoded?Buffer.from(result.body,'base64').length:Buffer.byteLength(result.body),
        encoding:result.headers['Content-Encoding'] || 'identity'});
      if(envelopeBytes>6291556) return json(response,502,{errorType:'Function.ResponseSizeTooLarge',
        message:'Response payload size exceeded maximum allowed payload size (6291556 bytes).'});
      response.writeHead(result.statusCode,result.headers);
      return response.end(result.isBase64Encoded?Buffer.from(result.body,'base64'):result.body);
    }
    if(url.pathname === '/api/scope/referentiels') return json(response,200,{domaines:[],cibles:[],arbre:[],formationCatalog:{statComCodes:[]}});
    if(url.pathname === '/api/scope/alerts') return json(response,200,{ok:true,alerts:[],counts:{}});
    if(url.pathname === '/api/scope/reports/quo-vadis' && request.method === 'POST'){
      const body = JSON.parse((await Array.fromAsync(request)).map(chunk => chunk.toString()).join('') || '{}');
      const result = await generateQuoVadisProgrammeReport(null,body,user);
      response.writeHead(200,{'content-type':'application/pdf','content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
        'X-Scope-Report-Pages':result.pages,'X-Scope-Report-Sha256':result.sha256});
      return response.end(result.buffer);
    }
    const api = url.pathname.startsWith('/api/scope/quo-vadis/');
    if(api){
      const body = request.method === 'GET' ? {} : JSON.parse((await Array.fromAsync(request)).map(chunk => chunk.toString()).join('') || '{}');
      recipeFailureAfterWrite=body.__recipeFailureAfterWrite === true;
      recipeWritten=false;
      const programme = url.pathname.match(/^\/api\/scope\/quo-vadis\/programmes\/(\d{4})$/);
      const cycle = url.pathname.match(/^\/api\/scope\/quo-vadis\/programmes\/(\d{4})\/cycle$/);
      const status = url.pathname.match(/^\/api\/scope\/quo-vadis\/programmes\/(\d{4})\/statut$/);
      const item = url.pathname.match(/^\/api\/scope\/quo-vadis\/programme-items\/([^/]+)$/);
      const history=url.pathname.match(/^\/api\/scope\/quo-vadis\/programme-items\/([^/]+)\/history$/);
      await query('savepoint browser_request');
      try {
        if(programme && request.method === 'GET') return json(response,200,{ok:true,quoVadis:await service.listProgramme(Number(programme[1]))});
        if(history && request.method==='GET') return json(response,200,{ok:true,...await service.programmeHistory(url.searchParams.get('annee') || 2027,decodeURIComponent(history[1]))});
        if(cycle && request.method === 'PUT') return json(response,200,{ok:true,...await service.setProgrammeCycle(Number(cycle[1]),body)});
        if(process.env.SCOPE_RECIPE_COMPLEMENT==='1' && status && request.method === 'POST')
          return json(response,200,{ok:true,...await service.setProgrammeStatus(Number(status[1]),{...body,actor:user.sub})});
        if(url.pathname === '/api/scope/quo-vadis/programme-items' && request.method === 'POST')
          {
            const result=await service.createProgrammePreparation(body,{actor:user.sub});
            return json(response,result.reason==='PROGRAMME_OCCURRENCE_EXISTS'?200:201,{ok:true,...result});
          }
        if(item && request.method === 'PATCH') {
          const result = await service.updateProgrammePreparation(decodeURIComponent(item[1]),body,{actor:user.sub});
          return json(response,result.updated ? 200 : 404,{ok:result.updated,...result});
        }
      } catch(error) {
        await query('rollback to savepoint browser_request');
        return json(response,error.status || 500,{ok:false,error:error.error || 'recipe_error',message:error.message});
      }
      return json(response,404,{ok:false,error:'route_not_available'});
    }
    if(url.pathname.startsWith('/api/')) return json(response,404,{ok:false,error:'recipe_route_not_available'});
    const file = path.resolve(root,`.${url.pathname === '/' ? '/scope.html' : url.pathname}`);
    if(!file.startsWith(root + path.sep)) return json(response,403,{ok:false});
    const content = await fs.promises.readFile(file);
    response.writeHead(200,{'content-type':`${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`,
      'cache-control':'no-store'});
    response.end(content);
  };
  const next = requests.then(work).catch((error) => json(response,500,{ok:false,error:error.message}));
  requests = next.catch(() => {});
});
async function stop() {
  server.close();
  await requests;
  const allowed=new Set(['scope_quo_vadis_obligations','scope_statcom_referentiel','scope_quo_vadis_calendar_days','scope_event_code_sequences']);
  if(process.env.SCOPE_RECIPE_ROADMAP==='1') for(const table of ['scope_quo_vadis_programmes','scope_quo_vadis_future_dates']) allowed.add(table);
  if(process.env.SCOPE_RECIPE_COMPLEMENT==='1') allowed.add('scope_journal_metier');
  if(process.env.SCOPE_RECIPE_MOA13==='1') allowed.add('scope_evenements');
  if(process.env.SCOPE_RECIPE_FINAL_CONTROLS==='1') for(const table of ['scope_lieux','scope_salles_theorie']) allowed.add(table);
  const unchanged={};
  for(const table of protectedTables.filter(table=>!allowed.has(table))) unchanged[table]=JSON.stringify(await fingerprint(table)) === JSON.stringify(baseline[table]);
  const preparations=(await client.query('select source_ref,md5(to_jsonb(t)::text) as hash from scope_quo_vadis_obligations t order by source_ref')).rows;
  const othersUnchanged=JSON.stringify(preparations.filter(row=>!touchedReferences.has(row.source_ref)))
    === JSON.stringify(originalPreparations.filter(row=>!touchedReferences.has(row.source_ref)));
  let otherEventsUnchanged=true;
  if(process.env.SCOPE_RECIPE_MOA13==='1'){
    const events=(await client.query('select evenement_id,md5(to_jsonb(t)::text) as hash from scope_evenements t order by evenement_id')).rows;
    otherEventsUnchanged=JSON.stringify(events.filter(row=>!touchedEvents.has(row.evenement_id)))
      ===JSON.stringify(originalEvents.filter(row=>!touchedEvents.has(row.evenement_id)));
  }
  await client.query('rollback');
  const restored = {};
  for(const table of protectedTables) restored[table] = await fingerprint(table);
  const rollback=JSON.stringify(restored) === JSON.stringify(baseline);
  const evidence={database,port:5432,nonTargetTables:unchanged,otherPreparationsUnchanged:othersUnchanged,otherEventsUnchanged,rollback,
    verdict:rollback && othersUnchanged && otherEventsUnchanged && Object.values(unchanged).every(Boolean) ? 'PASS' : 'NOK'};
  console.log(JSON.stringify(evidence));console.log(`ROLLBACK ${rollback ? 'PASS' : 'NOK'}`);
  if(process.env.SCOPE_RECIPE_EVIDENCE_DIR){
    const directory=path.resolve(root,process.env.SCOPE_RECIPE_EVIDENCE_DIR);
    if(!directory.startsWith(path.join(root,'docs','captures')+path.sep)) throw new Error('Invalid evidence destination');
    fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'postgres-integrity.json'),JSON.stringify(evidence,null,2));
    if(performanceHandler) fs.writeFileSync(path.join(directory,'api-measures.json'),JSON.stringify(performanceRequests,null,2));
  }
  await client.end();
  process.exit(0);
}
async function start() {
  await client.connect();
  const identity = (await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
  if(identity.name !== database || identity.host !== '127.0.0.1/32' || identity.port !== 5432)
    throw new Error('Unexpected database target');
  if(process.env.SCOPE_RECIPE_ROADMAP==='1') protectedTables=(await client.query(`select tablename from pg_tables
    where schemaname='public' and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
  baseline = {};
  for(const table of protectedTables) baseline[table] = await fingerprint(table);
  originalPreparations=(await client.query('select source_ref,md5(to_jsonb(t)::text) as hash from scope_quo_vadis_obligations t order by source_ref')).rows;
  originalEvents=(await client.query('select evenement_id,md5(to_jsonb(t)::text) as hash from scope_evenements t order by evenement_id')).rows;
  await client.query('begin');
  if(process.env.SCOPE_RECIPE_FINAL_CONTROLS==='1'){
    await require('./scope-qv-pr13-final-controls-clone').replay(query);
    for(const row of require('../docs/captures/qv-pr13-final-controls-20261013/production-business-snapshot.json').preparations)
      touchedReferences.add(row.source_ref);
  }
  if(postRecetteMode) {
    const snapshot=await require('./scope-qv-post-recette-moa-clone').replayCurrent(query);
    for(const row of snapshot?.preparations || []) touchedReferences.add(row.source_ref);
  }
  if(process.env.SCOPE_RECIPE_CORRECTIVE==='1')
    await client.query(fs.readFileSync(path.join(root,'database/migrations/20261012_scope_internal_event_identity.sql'),'utf8'));
  if(process.env.SCOPE_RECIPE_MOA13==='1'){
    await require('../netlify/lib/_scope-qv-moa-20261013-ddl').install(client.query.bind(client));
    await client.query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
  }
  await synchronizeEcawinReferential(client);
  if(process.env.SCOPE_RECIPE_FINALISATION==='1') await require('../netlify/lib/_scope-qv-moa-proposals').installAnnualReportProposal(client);
  if(process.env.SCOPE_RECIPE_PR13_COMPLEMENT==='1')
    await require('./lib/scope-qv-pr13-complement-recipe').seedPublishedAliases(query,await service.listProgramme(2027));
  server.listen(port,'127.0.0.1',() => console.log(`SCOPE CLONE BROWSER http://127.0.0.1:${port}/scope.html#/quo-vadis/programme`));
}
process.on('SIGINT',() => { stop().catch((error) => {console.error(error);process.exitCode=1;}); });
process.on('SIGTERM',() => { stop().catch((error) => {console.error(error);process.exitCode=1;}); });
start().catch((error) => {console.error(error);process.exitCode=1;});
