'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const logic=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),DATABASE='scope_qv_2027_recipe_20261006';
const BASELINE='2d70837773f86e457cfbd5f570f1cf647a1b8274';
function fixedService(){
  const cache=new Map();
  const load=relative=>{
    if(cache.has(relative)) return cache.get(relative).exports;
    const source=execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8'});
    if(relative.endsWith('.json')){const entry={exports:JSON.parse(source)};cache.set(relative,entry);return entry.exports;}
    const file=path.join(root,relative),entry=new Module(file,module);entry.filename=file;
    entry.paths=Module._nodeModulePaths(path.dirname(file));cache.set(relative,entry);const original=Module.createRequire(file);
    entry.require=request=>!request.startsWith('.')?original(request):load((()=>{
      const target=path.relative(root,path.resolve(path.dirname(file),request));return path.extname(target)?target:`${target}.js`;
    })());entry._compile(source,file);return entry.exports;
  };return load('netlify/lib/_scope-quo-vadis-service.js').createScopeQuoVadisService;
}
function migrate(client){
  const file=path.join(root,'netlify/lib/_scope-schema.js'),entry=new Module(file,module);
  entry.filename=file;entry.paths=Module._nodeModulePaths(path.dirname(file));const original=entry.require.bind(entry);
  entry.require=id=>id==='./_postgres'?{query:(...args)=>client.query(...args),transaction:f=>f(client)}:original(id);
  entry._compile(fs.readFileSync(file,'utf8')+'\nmodule.exports.recipeMigration=migrateQuoVadisFinalIncremental20261012;\n',file);
  return entry.exports.recipeMigration();
}
async function hashes(query,tables){
  const values={};for(const table of tables){assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    values[table]=(await query(`select count(*)::int as count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),''
      order by md5(to_jsonb(t)::text)),'')) as hash from "${table}" t`)).rows[0];}return values;
}
function payload(row,qv,changes={}){
  const fields=revisions.fieldsFromProgrammeRow(row,qv);
  return {year:2027,saveAction:'SAVE',activityLabel:fields.activityLabel,themes:fields.themes,
    date:fields.date,startTime:fields.startTime,endTime:fields.endTime,oiCodes:fields.oiCodes,publicCodes:fields.publicCodes,
    publicFreeLabels:fields.publicFreeLabels,statCom:fields.statCom,domain:fields.domain,
    lieuId:fields.lieuId,salleTheorieId:fields.salleTheorieId,participationEvaluation:fields.participationEvaluation,
    publishedEventVersion:row.publishedEventVersion,...changes};
}
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;const results=[];
  const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client.query.bind(client),tables);
    await client.query('BEGIN');open=true;await client.query("set local lock_timeout='3s'");
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue=Promise.resolve(),number=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const adapter={query,transaction:async work=>{const name=`moa13_${++number}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const old=fixedService()({database:adapter}),baseline=await old.listProgramme(2027);
    await record('13.10 migration is idempotent, with append-only audit and independent HSC sequence',async()=>{
      await migrate({query});const once=await hashes(query,tables);await migrate({query});assert.deepEqual(await hashes(query,tables),once);
      const journal=(await query('select journal_id from scope_journal_metier limit 1')).rows[0];
      await assert.rejects(adapter.transaction(async tx=>tx.query('update scope_journal_metier set action=action where journal_id=$1',[journal.journal_id])),/SCOPE_AUDIT_APPEND_ONLY/);
      await assert.rejects(adapter.transaction(async tx=>tx.query('delete from scope_journal_metier where journal_id=$1',[journal.journal_id])),/SCOPE_AUDIT_APPEND_ONLY/);
    });
    await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    const service=createScopeQuoVadisService({database:adapter});let qv=await service.listProgramme(2027);
    const initial=qv.canonicalProgramme.rows.find(row=>row.id==='qv-source-899');assert.ok(initial?.publishedEventId);
    await record('legacy preparation versus publication mismatch reproduces old false major revision; new no-op preserves every event field',async()=>{
      await query('SAVEPOINT old_mismatch');
      const fields={...revisions.fieldsFromProgrammeRow(initial,qv),oiCodes:['DPS:G1','DPS:C1','DPS:B1','DPS:B2']};
      const metadata={source:'QV_PROGRAMME_PREPARATION',humanDecision:true,automatedSnapshot:false,planningStatus:'PLANIFIE',planningFields:fields};
      const existing=(await query("select obligation_id from scope_quo_vadis_obligations where programme_id=$1 and source_ref='qv-source-899'",[qv.programme.programmeId])).rows[0];
      if(existing) await query("update scope_quo_vadis_obligations set source_type='MANUAL',metadata=metadata || $2::jsonb where obligation_id=$1",[existing.obligation_id,JSON.stringify(metadata)]);
      else await query(`insert into scope_quo_vadis_obligations(programme_id,source_type,source_ref,title,domain,statcom_code,metadata)
        values($1,'MANUAL','qv-source-899',$2,'PR','011PR',$3::jsonb)`,[qv.programme.programmeId,initial.label,JSON.stringify(metadata)]);
      const previous=await old.listProgramme(2027),row=previous.canonicalProgramme.rows.find(row=>row.id===initial.id);
      await assert.rejects(old.updateProgrammePreparation(row.id,payload(row,previous)),error=>error.error==='programme_motif_obligatoire');
      qv=await service.listProgramme(2027);const current=qv.canonicalProgramme.rows.find(row=>row.id===initial.id);
      const stable=await hashes(query,['scope_evenements','scope_participations','scope_quo_vadis_obligations','scope_journal_metier']);
      const saved=await service.updateProgrammePreparation(current.id,payload(current,qv),{actor:'recipe.moa13'});
      assert.equal(saved.unchanged,true);assert.deepEqual(await hashes(query,Object.keys(stable)),stable);
      await query('ROLLBACK TO SAVEPOINT old_mismatch');await query('RELEASE SAVEPOINT old_mismatch');
    });
    await record('already persisted four DPS OI hide the specific PAPR revision request, with the same event and Stat.Com',async()=>{
      await query('SAVEPOINT published_four');
      for(const site of ['G1','C1','B1','B2']){
        await query(`insert into scope_evenement_ois(evenement_id,oi_id) select $1,oi_id from scope_ois where code=$2
          on conflict do nothing`,[initial.publishedEventId,site]);
        await query('insert into scope_evenement_cibles_qv(evenement_id,cible_code) values($1,$2) on conflict do nothing',[initial.publishedEventId,`DPS-${site}`]);
      }
      const result=await service.listProgramme(2027),row=result.canonicalProgramme.rows.find(row=>row.id===initial.id);
      assert.notEqual(row.paprOiRevisionRequired,true);assert.deepEqual(row.oiSelections.slice().sort(),['DPS:B1','DPS:B2','DPS:C1','DPS:G1']);
      const saved=await service.updateProgrammePreparation(row.id,payload(row,result),{actor:'recipe.moa13'});assert.equal(saved.unchanged,true);
      assert.equal(row.statCom,'011PR');assert.equal(row.publishedEventId,initial.publishedEventId);
      await query('ROLLBACK TO SAVEPOINT published_four');await query('RELEASE SAVEPOINT published_four');
    });
    await record('minor theme edit preserves publication and validation; major OI revision requires reason and stays pending',async()=>{
      qv=await service.listProgramme(2027);const row=qv.canonicalProgramme.rows.find(row=>row.id===initial.id);
      const changed=await service.updateProgrammePreparation(row.id,payload(row,qv,{themes:['Thème MOA recette']}),{actor:'recipe.moa13'});
      const minor=changed.quoVadis.canonicalProgramme.rows.find(candidate=>candidate.id===row.id);
      assert.equal(minor.publicationRevision.kind,'MINOR');assert.equal(minor.publicationRevision.status,'APPLIED');
      assert.equal(minor.publishedEventId,row.publishedEventId);
      await assert.rejects(service.updateProgrammePreparation(row.id,payload(minor,changed.quoVadis,{oiCodes:['DPS:G1','DPS:C1','DPS:B1','DPS:B2'],revisePublishedOis:true})),
        error=>error.error==='programme_motif_obligatoire');
      const major=await service.updateProgrammePreparation(row.id,payload(minor,changed.quoVadis,{oiCodes:['DPS:G1','DPS:C1','DPS:B1','DPS:B2'],
        revisePublishedOis:true,motif:'Mise en conformité MOA des OI'}),{actor:'recipe.moa13'});
      assert.equal(major.quoVadis.canonicalProgramme.rows.find(row=>row.id===initial.id).publicationRevision.status,'PENDING');
    });
    let crimson,occupation;
    await record('CRIMSON retains 0180F7, paid and non-exported, without 2028 reconduction',async()=>{
      const saved=await service.createProgrammePreparation({year:2027,saveAction:'VALIDATE',activityLabel:'Formation CRIMSON opérateurs et chefs VPC',
        activityNature:'SDIS_EXTRAORDINARY',annualRecurrence:false,domain:'F7',statCom:'0180F7',ecawinActivityCode:'EXERCI',
        date:'2027-06-18',startTime:'18:00',endTime:'21:00',oiCodes:['DPS:G1'],publicCodes:['FOSPEC:4'],sold:true,ecawinExport:false,
        participationEvaluation:true},{actor:'recipe.moa13'});
      crimson=saved.quoVadis.canonicalProgramme.rows.find(row=>row.id===saved.itemId);assert.equal(crimson.statCom,'0180F7');
      assert.equal(crimson.sold,true);assert.equal(crimson.ecawinExport,false);assert.equal(crimson.annualRecurrence,false);
      const next=await service.listProgramme(2028);assert.ok(!next.canonicalProgramme.rows.some(row=>/CRIMSON/i.test(row.label)));
    });
    await record('CFF occupation reserves existing room, stays in Agenda/Programme, without code, obligation or operational creation',async()=>{
      const place=(await query("select lieu_id from scope_lieux where oi_code='G1' and actif is true order by code limit 1")).rows[0];
      const room=(await query('select salle_id from scope_salles_theorie where lieu_id=$1 and actif is true limit 1',[place.lieu_id])).rows[0];assert.ok(room);
      const saved=await service.createProgrammePreparation({year:2027,saveAction:'SAVE',activityLabel:'Formation CFF à la caserne G1',
        activityNature:'EXTERNAL_OCCUPATION',annualRecurrence:false,domain:'F5',statCom:'',date:'2027-06-18',startTime:'18:00',endTime:'21:00',
        oiCodes:[],publicCodes:[],sold:false,ecawinExport:false,participationEvaluation:false,
        lieuId:place.lieu_id,salleTheorieId:room.salle_id},{actor:'recipe.moa13'});
      occupation=saved.quoVadis.canonicalProgramme.rows.find(row=>row.id===saved.itemId);
      assert.equal(occupation.external,false);assert.equal(occupation.externalActivity,true);assert.equal(occupation.businessCode,'');
      assert.equal(occupation.lieuId,place.lieu_id);assert.equal(occupation.salleTheorieId,room.salle_id);
      const other=await service.updateProgrammePreparation(crimson.id,payload(crimson,saved.quoVadis,{lieuId:place.lieu_id,salleTheorieId:room.salle_id}),{actor:'recipe.moa13'});
      assert.ok(other.quoVadis.reservationConflicts.some(row=>[row.leftId,row.rightId].includes(occupation.id)));
      const removed=await service.updateProgrammePreparation(occupation.id,payload(occupation,other.quoVadis,{date:'2027-06-19'}),{actor:'recipe.moa13'});
      assert.equal(removed.quoVadis.canonicalProgramme.rows.find(row=>row.id===occupation.id).reservationConflicts.length,0);
    });
    await record('programme event journal records author, actual fields and motivated withdrawal without changing historical presences',async()=>{
      const journal=(await service.programmeHistory(2027,crimson.id)).history;assert.ok(journal.some(row=>row.action==='CREER_OCCURRENCE'));
      assert.ok(journal.every(row=>row.auteur_id==='recipe.moa13' && row.at));
      const withdrew=await service.updateProgrammePreparation(crimson.id,{year:2027,saveAction:'WITHDRAW',motif:'Retrait MOA de recette'}, {actor:'recipe.moa13'});
      assert.ok(withdrew.quoVadis.canonicalProgramme.rows.find(row=>row.id===crimson.id).validationWithdrawal);
      assert.ok((await service.programmeHistory(2027,crimson.id)).history.some(row=>row.action==='RETIRER_VALIDATION' && row.commentaire==='Retrait MOA de recette'));
    });
    await record('HSC identities are stable and legacy codes remain byte-identical',async()=>{
      const allocate=require('../netlify/lib/_scope-event-code').allocateInternalEventCode;
      const first=await allocate(query),second=await allocate(query);assert.match(first,/^HSC[.]\d{3}$/);assert.notEqual(first,second);
      assert.equal(logic.qvInternalEventCodeDisplay('SCOPE-000150'),'HSC.150');
    });
    const final=await service.listProgramme(2027),byId=new Map(final.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const row of baseline.canonicalProgramme.rows){
      const current=byId.get(row.id);assert.ok(current,row.id);assert.equal(current.statCom,row.statCom,row.id);
      for(const field of ['code','businessCode','definitionId','occurrenceId','sessionId','publishedEventId','publishedEventCode'])
        assert.deepEqual(current[field],row[field],`${row.id}:${field}`);
    }
    const during=await hashes(query,tables);
    for(const table of ['scope_participations','scope_affectations','scope_personnes','scope_person_qualifications','scope_lieux','scope_salles_theorie'])
      assert.deepEqual(during[table],before[table],table);
    await query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    const proof={baseline:BASELINE,database:DATABASE,productionWrites:false,results,transaction:'BEGIN/ROLLBACK',
      statComComparison:{compared:baseline.canonicalProgramme.rows.length,identical:baseline.canonicalProgramme.rows.length,differences:[]},
      existingCodesAndIdsUnchanged:true,historicalPresencesUnchanged:true,allTablesRolledBack:tables.length,before,after,verdict:'PASS'};
    const output=path.join(root,'docs/captures/qv-moa-20261013/postgres-integrity.json');fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({...proof,before:undefined,after:undefined}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
