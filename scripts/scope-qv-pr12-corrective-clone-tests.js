'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const {ScopeQvPostgresStore}=require('../netlify/lib/_scope-qv-publication-postgres-store');
const {createPgRepo}=require('../netlify/lib/_scope-pg');
const {createScopeService}=require('../netlify/lib/_scope-service');
const planner=require('../netlify/lib/_scope-qv-publication-plan');
const logic=require('../assets/js/scope-ui-logic');
const papr=require('../netlify/lib/_scope-qv-papr-rules');
const root=path.resolve(__dirname,'..');
const DATABASE='scope_qv_2027_recipe_20261006';
const BASELINE='cf868e7e73390c9548162ac8e9520ba439c53368';
function fixedService(){
  const cache=new Map();
  const load=relative=>{
    if(cache.has(relative)) return cache.get(relative).exports;
    const source=execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8'});
    if(relative.endsWith('.json')){const entry={exports:JSON.parse(source)};cache.set(relative,entry);return entry.exports;}
    const file=path.join(root,relative),entry=new Module(file,module);entry.filename=file;
    entry.paths=Module._nodeModulePaths(path.dirname(file));cache.set(relative,entry);
    const original=Module.createRequire(file);
    entry.require=request=>!request.startsWith('.') ? original(request) : load((()=>{
      const target=path.relative(root,path.resolve(path.dirname(file),request));return path.extname(target)?target:`${target}.js`;
    })());
    entry._compile(source,file);return entry.exports;
  };
  return load('netlify/lib/_scope-quo-vadis-service.js');
}
function migrate(client){
  const file=path.join(root,'netlify/lib/_scope-schema.js'),entry=new Module(file,module);
  entry.filename=file;entry.paths=Module._nodeModulePaths(path.dirname(file));const original=entry.require.bind(entry);
  entry.require=id=>id==='./_postgres'?{query:(...args)=>client.query(...args),transaction:f=>f(client)}:original(id);
  entry._compile(fs.readFileSync(file,'utf8')+'\nmodule.exports.recipeMigration=migrateQuoVadisFinalIncremental20261012;\n',file);
  return entry.exports.recipeMigration();
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
    ...(Array.isArray(row.responsibleSelections)?{responsibleSelections:row.responsibleSelections}:{}),publicFreeLabels:row.publicFreeLabels || [],
    lieuId:row.lieuId || row.business?.lieuId || null,salleTheorieId:row.salleTheorieId || row.business?.salleTheorieId || null,
    publishedEventVersion:row.publishedEventVersion,...changes};
}
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  const results=[];const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
  try{
    const identity=(await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity,{name:DATABASE,host:'127.0.0.1/32',port:5432});
    assert.equal((await client.query(`select count(*)::int as n from pg_stat_activity where datname=current_database()
      and pid<>pg_backend_pid() and xact_start is not null and state<>'idle'`)).rows[0].n,0);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client,tables);
    const constraints=async()=>(await client.query(`select conname,pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid='scope_qv_publication_activities'::regclass order by conname`)).rows;
    const constraintsBefore=await constraints();
    const migrationsBefore=(await client.query('select version from monitoring_f7_schema_migrations order by version')).rows.map(row=>row.version);
    const sequenceBefore=(await client.query("select to_regclass('scope_internal_event_code_seq')::text as name")).rows[0].name;
    assert.equal(sequenceBefore,null,'Recipe must not consume a persisted production-style sequence');
    await client.query('BEGIN');open=true;await client.query("set local lock_timeout='2s'");
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue=Promise.resolve(),index=0;
    const query=(...args)=>{const value=queue.then(()=>client.query(...args));queue=value.catch(()=>{});return value;};
    const adapter={query,transaction:async work=>{
      const name=`corrective_${++index}`;await query(`SAVEPOINT ${name}`);
      try{const value=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return value;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}
    }};
    const oldService=fixedService().createScopeQuoVadisService({database:adapter});
    const baseline=await oldService.listProgramme(2027);
    if(process.argv.includes('--diagnostic')){
      console.log(JSON.stringify(baseline.canonicalProgramme.rows.filter(row=>row.statCom==='013Y4')
        .map(row=>({id:row.id,label:row.label,activity:row.activityLabel,date:row.startsAt,status:row.status,
          human:row.humanDecision,published:row.publishedEventId})),null,2));return;
    }
    const dap=baseline.canonicalProgramme.rows.find(row=>row.label==='Exercice DAP 4' && row.statCom==='013Y4');
    assert.ok(dap,'MOA DAP Y4 occurrence identity');
    await record('cf868e7 reproduces SAVE ignoring the explicit planning state',async()=>{
      await query('SAVEPOINT reproduction');
      const prepared=await oldService.updateProgrammePreparation(dap.id,payload(dap,{saveAction:'PLAN',date:'2027-10-26'}));
      const row=prepared.quoVadis.canonicalProgramme.rows.find(row=>row.id===dap.id);
      const result=await oldService.updateProgrammePreparation(dap.id,payload(row,{status:'A_PLANIFIER'}));
      assert.equal(result.quoVadis.canonicalProgramme.rows.find(row=>row.id===dap.id).status,'PLANIFIE');
      await query('ROLLBACK TO SAVEPOINT reproduction');await query('RELEASE SAVEPOINT reproduction');
    });
    await record('incremental migrations are idempotent and preserve occurrence Stat.Com',async()=>{
      await query('SAVEPOINT reserved_identity');
      await query(`insert into scope_quo_vadis_obligations(programme_id,source_type,source_ref,title,domain,metadata)
        values($1,'MANUAL','RECIPE:RESERVED_INTERNAL_CODE','Recette identité déjà réservée','INSTITUTIONNEL',$2::jsonb)`,
      [baseline.programme.programmeId,JSON.stringify({businessCode:'SCOPE-000150'})]);
      await migrate({query});
      const code=await require('../netlify/lib/_scope-event-code').allocateInternalEventCode(query);
      assert.equal(code,'SCOPE-000151');
      await query('ROLLBACK TO SAVEPOINT reserved_identity');await query('RELEASE SAVEPOINT reserved_identity');
      await migrate({query});const once=await hashes(client,tables);await migrate({query});assert.deepEqual(await hashes(client,tables),once);
    });
    const service=createScopeQuoVadisService({database:adapter});let current=await service.listProgramme(2027);
    const find=id=>current.canonicalProgramme.rows.find(row=>row.id===id);
    await record('SAVE persists both planning transitions and keeps business validation independently',async()=>{
      assert.equal(dap.publishedEventId,undefined,'The confirmed MOA example is a preparation, not a published event');
      const validated=await service.updateProgrammePreparation(dap.id,payload(find(dap.id),{saveAction:'VALIDATE',status:'PLANIFIE',date:'2027-10-26'}));
      const old=validated.quoVadis.canonicalProgramme.rows.find(row=>row.id===dap.id);assert.ok(old.businessValidation);
      const obligationId=old.preparation.id;
      await query("update scope_quo_vadis_obligations set statcom_policy='FACULTATIF' where obligation_id=$1",[obligationId]);
      for(const status of ['A_PLANIFIER','PLANIFIE']){
        const changed=await service.updateProgrammePreparation(dap.id,payload(old,{status}));
        const row=changed.quoVadis.canonicalProgramme.rows.find(row=>row.id===dap.id);
        assert.equal(row.status,status);assert.deepEqual(row.businessValidation,old.businessValidation);
        assert.equal(row.preparation.id,obligationId);assert.equal(row.startsAt,old.startsAt);
        const stored=(await query('select statut,statcom_policy,metadata from scope_quo_vadis_obligations where obligation_id=$1',[obligationId])).rows[0];
        assert.equal(stored.statut,status);assert.equal(stored.metadata.planningFields.planningStatus,status);
        assert.equal(stored.statcom_policy,'FACULTATIF');
        assert.equal((await service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.id===dap.id).status,status);
      }
    });
    await record('PAPR modules 1/2 remain preparatory members of 2027, dates unchanged',async()=>{
      assert.equal(current.programmeCycle.startDate,'2027-03-05');
      assert.deepEqual(current.paprProposals.map(row=>row.date),['2027-02-02','2027-02-16','2027-06-03','2027-09-29','2027-11-16','2027-11-30','2027-12-11']);
      for(const id of ['qv-source-899','QV27:PAPR:M02']){
        assert.equal(find(id).businessCycleYear,2027);assert.equal(find(id).cycleClassification,'PREPARATORY_CURSUS');
      }
      const two=find('QV27:PAPR:M02');
      const saved=await service.updateProgrammePreparation(two.id,payload(two,{status:'PROPOSE'}));
      const row=saved.quoVadis.canonicalProgramme.rows.find(row=>row.id===two.id);
      assert.equal(row.startsAt.slice(0,16),two.startsAt.slice(0,16));assert.equal(row.cycleClassification,'PREPARATORY_CURSUS');
      const metadata=(await query('select metadata from scope_quo_vadis_obligations where obligation_id=$1',[row.preparation.id])).rows[0].metadata;
      assert.equal(metadata.programmeCycle.year,2027);assert.equal(metadata.programmeCycle.preparatory.module,2);
      assert.ok(saved.quoVadis.paprProposals.slice(0,2).every(proposal=>proposal.constraints.every(constraint=>constraint.pass)));
    });
    await record('published module 1 OI change and planning change require a motivated targeted revision',async()=>{
      const one=find('qv-source-899');assert.ok(one.publishedEventId);assert.ok(one.paprOiRevisionRequired);
      const beforeEvent=(await query('select to_jsonb(e) as row from scope_evenements e where evenement_id=$1',[one.publishedEventId])).rows;
      await assert.rejects(service.updateProgrammePreparation(one.id,payload(one,{status:'A_PLANIFIER'})),error=>error.error==='programme_motif_obligatoire');
      const changed=await service.updateProgrammePreparation(one.id,payload(one,{status:'A_PLANIFIER',oiCodes:papr.DPS_OIS,
        motif:'Recette corrective MOA : révision ciblée du module 1'}));
      const pending=changed.quoVadis.canonicalProgramme.rows.find(row=>row.id===one.id);
      assert.equal(pending.publicationRevision.status,'PENDING');assert.equal(pending.status,'A_PLANIFIER');
      assert.ok(pending.publicationRevision.changedFields.includes('planningStatus'));
      assert.deepEqual(pending.oiSelections,papr.DPS_OIS);
      assert.deepEqual((await query('select to_jsonb(e) as row from scope_evenements e where evenement_id=$1',[one.publishedEventId])).rows,beforeEvent);
    });
    let unpaid;
    await record('internal manifestation keeps no Stat.Com and a stable unique SCOPE identity',async()=>{
      const row=current.canonicalProgramme.rows.find(row=>logic.qvProgrammeInternalManifestation(row) && !row.humanDecision && !row.publishedEventId && row.startsAt);
      assert.ok(row);assert.equal(row.statCom,'');assert.equal(row.sold,false);assert.notEqual(row.externalActivity,true);
      assert.ok(row.publics.includes('FOBA:2'));assert.equal(row.responsible,'C sct');
      const saved=await service.updateProgrammePreparation(row.id,payload(row,{saveAction:'VALIDATE',sold:false,ecawinExport:true,
        participationEvaluation:false,ecawinActivityCode:'EXERCI',status:'PLANIFIE'}));
      unpaid=saved.quoVadis.canonicalProgramme.rows.find(item=>item.id===row.id);
      assert.match(unpaid.businessCode,/^SCOPE-\d{6}$/);assert.equal(unpaid.statCom,'');
      assert.equal((await query('select statcom_policy from scope_quo_vadis_obligations where obligation_id=$1',
        [unpaid.preparation.id])).rows[0].statcom_policy,'NON_APPLICABLE');
      assert.equal(unpaid.sold,false);assert.equal(unpaid.ecawinExport,true);assert.equal(unpaid.participationEvaluation,false);
      const exportData=saved.quoVadis.ecawinCorrespondence.find(item=>item.programmeItemId===row.id);
      assert.equal(exportData.scopeOccurrenceCode,unpaid.businessCode);assert.equal(exportData.statCom,'');
      assert.equal(exportData.exportRequested,true);assert.equal(exportData.exportPreparationState,'IMPORT_CONTRACT_REQUIRED');
      assert.equal(unpaid.responsibleSelections[0].code,'C scrt');assert.equal(unpaid.responsibleSelections[0].label,'C sct');
      const next=await service.updateProgrammePreparation(row.id,payload(unpaid,{sold:false,ecawinExport:false,participationEvaluation:true}));
      const reopened=next.quoVadis.canonicalProgramme.rows.find(item=>item.id===row.id);
      assert.equal(reopened.businessCode,unpaid.businessCode);assert.equal(reopened.statCom,'');
      assert.equal(reopened.ecawinExport,false);assert.equal(reopened.participationEvaluation,true);
      const count=(await query('select count(*)::int as n from scope_quo_vadis_obligations where source_ref=$1',[row.id])).rows[0].n;
      assert.equal(count,1);
    });
    await record('same manifestation occurrence is detected rather than duplicated',async()=>{
      current=await service.listProgramme(2027);
      const type=logic.qvProgrammeActivityTypes(current).find(item=>item.definitionId===unpaid.definitionId);
      assert.ok(type);const duplicate=await service.createProgrammePreparation({...payload(unpaid),domain:'F3',programmeTypeId:type.id,sold:false,ecawinExport:true});
      assert.equal(duplicate.created,false);assert.equal(duplicate.reason,'PROGRAMME_OCCURRENCE_EXISTS');assert.equal(duplicate.existingItemId,unpaid.id);
    });
    await record('existing publication store publishes unpaid data once and keeps qualified OI staff relations',async()=>{
      await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
      const ois=unpaid.oiSelections.filter(code=>/^(DPS|DAP):/.test(code));assert.ok(ois.length);
      const source={year:2027,source:{definitionId:unpaid.definitionId,occurrenceId:unpaid.occurrenceId || unpaid.id,
        sessionId:unpaid.sessionId || unpaid.id,publicationUnitId:unpaid.id,sourceRecordIds:[unpaid.id]},
        label:unpaid.label,eventLabel:unpaid.label,status:'VALIDATED',referencesValidated:true,
        sold:false,ecawinExport:true,ecawinActivityCode:'EXERCI',participationEvaluation:false,
        business:{statComCode:null,businessCode:unpaid.businessCode},
        schedule:{startsAt:unpaid.startsAt.slice(0,16),endsAt:unpaid.endsAt.slice(0,16)},
        classification:{primaryDomain:'DPS',domainCodes:['DPS'],oiCodes:logic.qvOiSites(ois),
          targetCodes:ois.map(code=>code.replace(':','-')),publicCodes:unpaid.publics},
        session:{groupId:unpaid.occurrenceId || unpaid.id,index:1,count:1}};
      const referentials={domains:['DPS'],ois:source.classification.oiCodes,targets:source.classification.targetCodes,publics:unpaid.publics};
      const plan=planner.buildPublicationPlan({year:2027,programme:[source],referentials,targetSnapshot:[]});
      assert.equal(plan.decisions[0].action,'CREATE',JSON.stringify(plan.decisions[0]));
      const store=Object.create(ScopeQvPostgresStore.prototype);store.query=query;store.clock=()=>new Date().toISOString();
      const eventId=await store.createTarget(plan.decisions[0].target,()=>{});
      const event=(await query('select * from scope_evenements where evenement_id=$1',[eventId])).rows[0];
      assert.equal(event.statcom_code,null);assert.equal(event.code_cours,unpaid.businessCode);
      assert.deepEqual(event.engine_snapshot,{sold:false,ecawinExport:true,ecawinActivityCode:'EXERCI',participationEvaluation:false,descriptivePublics:[]});
      const relations=(await query('select cible_code from scope_evenement_cibles_qv where evenement_id=$1 order by cible_code',[eventId])).rows.map(row=>row.cible_code);
      assert.deepEqual(relations,source.classification.targetCodes.slice().sort());
      const replay=planner.buildPublicationPlan({year:2027,programme:[source],referentials,
        targetSnapshot:await store.snapshot(2027,plan.decisions[0].publicationKey)});
      assert.equal(replay.decisions[0].action,'UNCHANGED',JSON.stringify({changed:replay.decisions[0].changedFields,
        target:plan.decisions[0].target,stored:(await store.snapshot(2027)).find(row=>row.eventId===eventId)?.desired}));
      const repo=createPgRepo({query});
      const population=await createScopeService(repo).resolveEligiblePopulation({eventDate:event.date,
        domaineCode:event.domaine_code,cibleIds:await repo.listEventCibleIds(eventId)});
      assert.ok(population.personnes.every(person=>person.nip && person.cibles.every(cible=>
        source.classification.targetCodes.includes(`${cible.domaineCode}-${cible.niveauCode}`))));
      console.log('Existing dated OI population resolved: '+population.count);
    });
    current=await service.listProgramme(2027);const byId=new Map(current.canonicalProgramme.rows.map(row=>[row.id,row]));
    const newlyAssignedCodes=[];
    await record('100 percent of occurrence Stat.Com and all existing codes/identities remain unchanged',async()=>{
      for(const old of baseline.canonicalProgramme.rows){
        const row=byId.get(old.id);assert.ok(row,old.id);assert.equal(row.statCom,old.statCom,old.id);
        for(const field of ['id','code','definitionId','occurrenceId','sessionId','publishedEventId','publishedEventCode'])
          if(old.id!==unpaid.id || !['publishedEventId','publishedEventCode'].includes(field)) assert.deepEqual(row[field],old[field],`${old.id}:${field}`);
        if(old.businessCode) assert.equal(row.businessCode,old.businessCode);
        else if(row.businessCode) newlyAssignedCodes.push({id:row.id,code:row.businessCode});
      }
      const during=await hashes(client,tables);
      for(const table of ['scope_participations','scope_affectations','scope_personnes','scope_lieux','scope_salles_theorie'])
        assert.deepEqual(during[table],before[table],table);
    });
    const migrationsAfter=(await query('select version from monitoring_f7_schema_migrations order by version')).rows.map(row=>row.version);
    await query('ROLLBACK');open=false;
    const after=await hashes(client,tables);assert.deepEqual(after,before);
    assert.deepEqual(await constraints(),constraintsBefore);
    assert.equal((await client.query("select to_regclass('scope_internal_event_code_seq')::text as name")).rows[0].name,null);
    const proof={baseline:BASELINE,database:DATABASE,host:'127.0.0.1',transaction:'BEGIN/ROLLBACK',productionWrites:false,
      results,statComComparison:{compared:baseline.canonicalProgramme.rows.length,identical:baseline.canonicalProgramme.rows.length,differences:[]},
      existingCodesAndIdsPreserved:true,newlyAssignedCodes,planningOccurrence:{id:dap.id,statCom:'013Y4',
        cloneProjection:dap.startsAt,moaDateReproducedInRollback:'2027-10-26'},
      papr:{dates:current.paprProposals.map(row=>row.date),preparatoryMembers:2,businessCycleYear:2027,boundaryUnchanged:'2027-03-05'},
      module1:{revision:'PENDING',eventUnchanged:true},historicalPresencesUnchanged:true,
      unsoldPublication:{temporaryCloneOnly:true,replay:'UNCHANGED',importContract:'NOT_DEMONSTRATED'},
      migrations:{before:migrationsBefore,temporarilyApplied:migrationsAfter.filter(value=>!migrationsBefore.includes(value)),idempotent:true},
      rollbackAllTablesUnchanged:tables.length,sequenceRolledBack:true,constraintsRolledBack:true,before,after,verdict:'PASS'};
    const file=path.join(root,'docs/captures/qv-pr12-corrective-20261012/postgres-integrity.json');
    fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({...proof,before:undefined,after:undefined,migrations:proof.migrations.temporarilyApplied}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
