'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const papr=require('../netlify/lib/_scope-qv-papr-rules');
const root=path.resolve(__dirname,'..');
const DATABASE='scope_qv_2027_recipe_20261006';
const BASELINE='2532630aa08427870c1c01b64212a1cb089078e7';
function fixedService(){
  const cache=new Map();
  const load=relative=>{
    if(cache.has(relative)) return cache.get(relative).exports;
    const source=execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8'});
    if(relative.endsWith('.json')){const entry={exports:JSON.parse(source)};cache.set(relative,entry);return entry.exports;}
    const file=path.join(root,relative),entry=new Module(file,module);entry.filename=file;
    entry.paths=Module._nodeModulePaths(path.dirname(file));cache.set(relative,entry);
    const original=Module.createRequire(file);
    entry.require=request=>{
      if(!request.startsWith('.')) return original(request);
      const target=path.relative(root,path.resolve(path.dirname(file),request));
      return load(path.extname(target)?target:`${target}.js`);
    };
    entry._compile(source,file);return entry.exports;
  };
  return load('netlify/lib/_scope-quo-vadis-service.js');
}
function migration(client){
  const file=path.join(root,'netlify/lib/_scope-schema.js'),entry=new Module(file,module);
  entry.filename=file;entry.paths=Module._nodeModulePaths(path.dirname(file));const original=entry.require.bind(entry);
  entry.require=id=>id==='./_postgres'?{query:(...args)=>client.query(...args),transaction:f=>f(client)}:original(id);
  entry._compile(fs.readFileSync(file,'utf8')+'\nmodule.exports.recipeMigration=migrateQuoVadisFinalMoaProposal20261012;\n',file);
  return entry.exports.recipeMigration;
}
async function hashes(client,tables){
  const output={};
  for(const table of tables){
    assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    output[table]=(await client.query(`select count(*)::int as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash from "${table}" t`)).rows[0];
  }
  return output;
}
function payload(row,changes={}){
  return {year:2027,saveAction:'SAVE',activityLabel:row.eventDisplayLabel || row.label,themes:row.themes || [],
    date:row.startsAt?.slice(0,10),startTime:row.startsAt?.slice(11,16),endTime:row.endsAt?.slice(11,16),
    oiCodes:row.oiSelections || [],publicCodes:row.publics || [],statCom:row.statCom,
    lieuId:row.lieuId || row.business?.lieuId || null,salleTheorieId:row.salleTheorieId || row.business?.salleTheorieId || null,
    publishedEventVersion:row.publishedEventVersion,...changes};
}
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  try{
    const identity=(await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity,{name:DATABASE,host:'127.0.0.1/32',port:5432});
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client,tables);
    await client.query('BEGIN');open=true;
    await client.query("set local lock_timeout='2s'");
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue=Promise.resolve();
    const query=(...args)=>{const result=queue.then(()=>client.query(...args));queue=result.catch(()=>{});return result;};
    let index=0;
    const adapter={query,transaction:async work=>{
      const name=`finalisation_${++index}`;await query(`SAVEPOINT ${name}`);
      try{const value=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return value;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}
    }};
    const baseline=await fixedService().createScopeQuoVadisService({database:adapter}).listProgramme(2027);
    await migration({query})();const migrated=await hashes(client,tables);await migration({query})();
    assert.deepEqual(await hashes(client,tables),migrated,'Migration must be idempotent');
    const service=createScopeQuoVadisService({database:adapter});
    let current=await service.listProgramme(2027);
    const byId=new Map(current.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const old of baseline.canonicalProgramme.rows){
      const row=byId.get(old.id);assert.ok(row,old.id);
      for(const field of ['id','statCom','code','businessCode','definitionId','occurrenceId','sessionId','publishedEventId','publishedEventCode'])
        assert.deepEqual(row[field],old[field],`${old.id}: ${field}`);
      if(!old.restoredModule || old.humanDecision || old.businessValidation || old.publishedEventId)
        for(const field of ['startsAt','endsAt']) assert.deepEqual(row[field],old[field],`${old.id}: protected date`);
      if(old.humanDecision) for(const field of ['label','themes','publics','ois','responsible']) assert.deepEqual(row[field],old[field]);
    }
    assert.equal(current.paprProposals.length,7);
    assert.deepEqual(current.paprProposals.map(row=>row.date),['2027-02-02','2027-02-16','2027-06-03','2027-09-29','2027-11-16','2027-11-30','2027-12-11']);
    assert.ok(current.paprProposals.every(row=>row.constraints.every(value=>value.pass)));
    const initialProposals=current.paprProposals;
    const report=(await query("select * from scope_quo_vadis_future_dates where metadata->>'proposalKey'='MOA-20261012-RAPPORT-CYCLE-2027'")).rows;
    assert.equal(report.length,1);assert.equal(current.programmeCycle.endDate,'2028-02-10');assert.equal(current.programmeCycle.provisional,true);
    assert.equal(current.programmeCycle.statisticsBasis,'CIVIL_EVENT_DATE');
    await assert.rejects(service.setProgrammeStatus(2027,{statut:'VALIDE'}),error=>error.error==='programme_cloture_provisoire');
    const changed=await service.setProgrammeCycle(2027,{startDate:current.programmeCycle.startDate,endDate:'2028-02-11',codirApproved:false,actor:'recipe.final'});
    assert.equal(changed.programmeCycle.provisional,true);assert.equal(changed.programmeCycle.closingReport.itemId,report[0].future_date_id);
    await service.setProgrammeCycle(2027,{startDate:current.programmeCycle.startDate,endDate:'2028-02-10',codirApproved:false,actor:'recipe.final'});
    assert.equal((await query("select count(*)::int as count from scope_quo_vadis_future_dates where metadata->'annualReport'->>'closesCycleYear'='2027'")).rows[0].count,1);
    const module3=byId.get('QV27:PAPR:M03');
    const decided=await service.updateProgrammePreparation(module3.id,payload(module3,{date:'2027-06-17'}),{actor:'recipe.final'});
    const saved=decided.quoVadis.canonicalProgramme.rows.find(row=>row.id===module3.id);
    assert.equal(saved.startsAt.slice(0,16),'2027-06-17T17:00');assert.deepEqual(saved.qualificationCodes,['PAPR']);
    assert.ok(saved.cursusId);assert.equal(saved.cursus,'PAPR');
    assert.equal(saved.paprProposal.origin,'PROTECTED');
    const module1=byId.get('qv-source-899');assert.ok(module1.publishedEventId);
    const publishedBefore=(await query('select to_jsonb(e) as row from scope_evenements e where evenement_id=$1',[module1.publishedEventId])).rows;
    const presenceBefore=(await query('select to_jsonb(p) as row from scope_participations p where evenement_id=$1 order by personne_id',[module1.publishedEventId])).rows;
    assert.equal(module1.paprOiRevisionRequired,true);
    const revision=await service.updateProgrammePreparation(module1.id,payload(module1,{oiCodes:papr.DPS_OIS,
      motif:'Recette finale : proposition de révision OI PAPR'}),{actor:'recipe.final'});
    const pending=revision.quoVadis.canonicalProgramme.rows.find(row=>row.id===module1.id);
    assert.equal(pending.publicationRevision.status,'PENDING');assert.deepEqual(pending.oiSelections,papr.DPS_OIS);
    assert.equal(pending.publishedEventId,module1.publishedEventId);assert.equal(pending.statCom,module1.statCom);
    assert.deepEqual((await query('select to_jsonb(e) as row from scope_evenements e where evenement_id=$1',[module1.publishedEventId])).rows,publishedBefore);
    assert.deepEqual((await query('select to_jsonb(p) as row from scope_participations p where evenement_id=$1 order by personne_id',[module1.publishedEventId])).rows,presenceBefore);
    current=await service.listProgramme(2027);const finalById=new Map(current.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const old of baseline.canonicalProgramme.rows) assert.equal(finalById.get(old.id).statCom,old.statCom);
    const during=await hashes(client,tables);
    for(const table of ['scope_evenements','scope_participations','scope_affectations','scope_personnes','scope_lieux','scope_salles_theorie']) assert.deepEqual(during[table],before[table]);
    await query('ROLLBACK');open=false;const after=await hashes(client,tables);assert.deepEqual(after,before);
    const proof={baseline:BASELINE,database:DATABASE,host:'127.0.0.1',transaction:'BEGIN/ROLLBACK',productionWrites:false,
      statComComparison:{compared:baseline.canonicalProgramme.rows.length,identical:baseline.canonicalProgramme.rows.length,differences:[]},
      existingCodesAndIdsPreserved:true,protectedDatesPreserved:true,paprProposals:initialProposals,
      annualReport:{date:'2028-02-10',provisional:true,modifiableSameReference:true,noDuplicate:true,migrationIdempotent:true,statisticsBasis:'CIVIL_EVENT_DATE'},
      module1:{targetOiCodes:papr.DPS_OIS,revision:'PENDING',eventIdPreserved:true,eventRecordUnchanged:true,historicalPresencesUnchanged:true},
      programmeWriteAndReopenPreservesDecision:true,operationalEventsCreated:0,rollbackAllTablesUnchanged:tables.length,
      before,after,verdict:'PASS'};
    const file=path.join(root,'docs/captures/qv-pr12-finalisation-20261012/postgres-integrity.json');
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({...proof,before:undefined,after:undefined,paprProposals:initialProposals.map(row=>({module:row.module,date:row.date,status:row.status}))}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
