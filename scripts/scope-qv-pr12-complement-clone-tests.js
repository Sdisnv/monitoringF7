'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {execFileSync}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const papr=require('../netlify/lib/_scope-qv-papr-rules');
const DATABASE='scope_qv_2027_recipe_20261006';
const BASELINE='02d909abdc052421d2d98722f402a9cf1fb8f0b9';
const root=path.resolve(__dirname,'..');
function baselineService(){
  const cache=new Map();
  const load=relative=>{
    if(cache.has(relative)) return cache.get(relative).exports;
    const source=execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8'});
    if(relative.endsWith('.json')){const value={exports:JSON.parse(source)};cache.set(relative,value);return value.exports;}
    const filename=path.join(root,relative),loaded=new Module(filename,module);
    loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));cache.set(relative,loaded);
    const original=Module.createRequire(filename);
    loaded.require=request=>{
      if(!request.startsWith('.')) return original(request);
      const target=path.relative(root,path.resolve(path.dirname(filename),request));
      return load(path.extname(target)?target:`${target}.js`);
    };
    loaded._compile(source,filename);return loaded.exports;
  };
  return load('netlify/lib/_scope-quo-vadis-service.js');
}
async function hashes(client,tables){
  const result={};
  for(const table of tables){
    assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    result[table]=(await client.query(`select count(*)::int as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash from "${table}" t`)).rows[0];
  }
  return result;
}
function extrasMigration(client){
  const filename=path.join(root,'netlify/lib/_scope-schema.js'),loaded=new Module(filename,module);
  loaded.filename=filename;loaded.paths=Module._nodeModulePaths(path.dirname(filename));
  const original=loaded.require.bind(loaded);
  loaded.require=id=>id==='./_postgres'?{query:(...a)=>client.query(...a),transaction:f=>f(client)}:original(id);
  loaded._compile(fs.readFileSync(filename,'utf8')+'\nmodule.exports.recipeMigration=migrateStatComExtrasMoa20261012;\n',filename);
  return loaded.exports.recipeMigration;
}
function payload(row,patch={}){
  return {year:2027,saveAction:'SAVE',activityLabel:row.eventDisplayLabel || row.label,themes:row.themes || [],
    date:row.startsAt?.slice(0,10) || null,startTime:row.startsAt?.slice(11,16) || null,endTime:row.endsAt?.slice(11,16) || null,
    oiCodes:row.oiSelections || [],publicCodes:row.publics || [],statCom:row.statCom,
    lieuId:row.lieuId || row.business?.lieuId || null,salleTheorieId:row.salleTheorieId || row.business?.salleTheorieId || null,
    publicFreeLabels:row.publicFreeLabels || [],publishedEventVersion:row.publishedEventVersion,...patch};
}
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  const proof={baseline:BASELINE,database:DATABASE,host:'127.0.0.1',transaction:'BEGIN/ROLLBACK',productionWrites:false,fixtureOnly:true};
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client,tables);
    await client.query('BEGIN');open=true;
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    const participationRulesBefore=(await client.query("select to_regclass('scope_activity_participation_rules') as name")).rows[0].name;
    if(!participationRulesBefore) await client.query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    let queue=Promise.resolve();
    const query=(...args)=>{const result=queue.then(()=>client.query(...args));queue=result.catch(()=>{});return result;};
    const adapter={query,transaction:async f=>{await query('SAVEPOINT complement_service');try{const result=await f({query});await query('RELEASE SAVEPOINT complement_service');return result;}catch(error){await query('ROLLBACK TO SAVEPOINT complement_service');await query('RELEASE SAVEPOINT complement_service');throw error;}}};
    const service=createScopeQuoVadisService({database:adapter});
    const baseline=await baselineService().createScopeQuoVadisService({database:adapter}).listProgramme(2027);
    proof.extrasBefore=(await query("select code,label,active from scope_statcom_referentiel where code='0180F7'")).rows;
    await extrasMigration({query,transaction:f=>f({query})})();
    const migrationState=await hashes(client,tables);
    await extrasMigration({query,transaction:f=>f({query})})();
    assert.deepEqual(await hashes(client,tables),migrationState,'Migration must be idempotent');
    let current=await service.listProgramme(2027);
    const initial=current.canonicalProgramme.rows;
    const byId=new Map(initial.map(row=>[row.id,row]));
    for(const row of baseline.canonicalProgramme.rows){
      const after=byId.get(row.id);assert.ok(after,`Existing occurrence retained: ${row.id}`);
      for(const key of ['id','statCom','code','businessCode','definitionId','occurrenceId','sessionId','startsAt','endsAt'])
        assert.deepEqual(after[key],row[key],`${row.id}: ${key} must be unchanged`);
      if(row.humanDecision) for(const key of ['label','themes','ois','publics','responsible']) assert.deepEqual(after[key],row[key]);
    }
    proof.statComComparison={compared:baseline.canonicalProgramme.rows.length,identical:baseline.canonicalProgramme.rows.length,differences:[]};
    proof.extrasAfter=current.statComCodes.find(row=>row.code==='0180F7');assert.equal(proof.extrasAfter.active,true);
    const modules=initial.filter(row=>papr.moduleNumber(row));assert.equal(modules.length,7);
    proof.modules=modules.map(row=>({id:row.id,module:papr.moduleNumber(row),title:row.label,themes:row.themes,
      date:row.startsAt,oi:row.oiSelections,publics:row.publics,responsible:row.responsible}));
    assert.equal(new Set(modules.map(row=>row.themes.join('|'))).size,7);
    assert.equal(modules.filter(row=>row.restoredModule).every(row=>row.startsAt===null && row.endsAt===null),true);
    assert.equal(current.annualValidationControl.blocking,true);
    await assert.rejects(service.setProgrammeStatus(2027,{statut:'VALIDE'}),error=>error.error==='programme_papr_prerequis_bloquant');
    const programmeId=current.programme.programmeId;
    await query('update scope_quo_vadis_programmes set statut=$2 where programme_id=$1',[programmeId,'VALIDE']);
    await assert.rejects(service.setProgrammeStatus(2027,{statut:'PREPARATION'}),error=>error.error==='programme_motif_obligatoire');
    const withdrawn=await service.setProgrammeStatus(2027,{statut:'PREPARATION',motif:'Recette clone : retrait motivé',actor:'recipe.moa'});
    assert.equal(withdrawn.statut,'PREPARATION');
    const module2=byId.get('QV27:PAPR:M02');
    const planned=await service.updateProgrammePreparation(module2.id,payload(module2,{date:'2027-02-09',startTime:'18:00',endTime:'21:00',saveAction:'VALIDATE'}),{actor:'recipe.moa'});
    const reopened=planned.quoVadis.canonicalProgramme.rows.find(row=>row.id===module2.id);
    assert.equal(reopened.startsAt.slice(0,16),'2027-02-09T18:00');assert.deepEqual(reopened.themes,module2.themes);
    assert.equal(reopened.statCom,'011PR');assert.match(reopened.businessCode,/^011PR\.\d{3}$/);
    await assert.rejects(service.updateProgrammePreparation(module2.id,payload(reopened,{saveAction:'WITHDRAW'})),error=>error.error==='programme_motif_obligatoire');
    const retract=await service.updateProgrammePreparation(module2.id,payload(reopened,{saveAction:'WITHDRAW',motif:'Recette clone : retrait du module'}),{actor:'recipe.moa'});
    const retracted=retract.quoVadis.canonicalProgramme.rows.find(row=>row.id===module2.id);
    assert.equal(retracted.businessValidation,null);assert.equal(retracted.validationHistory.at(-1).action,'RETIRER_VALIDATION');
    const target=initial.find(row=>row.label==='Exercice PR 2.1');
    const prepared=await service.updateProgrammePreparation(target.id,payload(target,{saveAction:'VALIDATE'}),{actor:'recipe.moa'});
    const baseRow=prepared.quoVadis.canonicalProgramme.rows.find(row=>row.id===target.id);
    const eventId=randomUUID();
    const domainId=(await query("select cible_id from scope_cibles where domaine_code='PR' and actif order by niveau_code limit 1")).rows[0].cible_id;
    await query(`insert into scope_evenements(evenement_id,internal_event_id,date,domaine_code,libelle,statut,origine,mode_suivi,version,statcom_code,
      heure_debut,heure_fin,code_cours,population_figee) values($1::uuid,'RECIPE-PR12-' || $1::uuid::text,$2,'PR',$3,'PLANIFIE','NOMINATIF','NOMINATIF',1,'011PR','19:00','21:30',$4,true)`,
      [eventId,target.startsAt.slice(0,10),target.label,'011PR.998']);
    await query('insert into scope_evenement_cibles(evenement_id,cible_id) values($1,$2)',[eventId,domainId]);
    const activityId=(await query('select publication_activity_id from scope_qv_publication_activities limit 1')).rows[0]?.publication_activity_id;
    assert.ok(activityId,'Clone must have a real publication activity for provenance');
    await query(`insert into scope_qv_publication_links(publication_link_id,evenement_id,publication_activity_id,source_year,source_definition_id,
      source_occurrence_id,source_session_id,publication_unit_id,publication_key,source_record_ids,last_synced_fingerprint,last_synced_at)
      values(gen_random_uuid(),$1::uuid,$2,2027,$3,$4,$5,$6,'RECIPE-PR12-' || $1::uuid::text,'[]'::jsonb,'recipe-complement',now())`,
      [eventId,activityId,target.definitionId,target.occurrenceId,target.sessionId,target.id]);
    const person=(await query('select id as personne_id from scope_personnes order by id limit 1')).rows[0].personne_id;
    await query("insert into scope_attendus(evenement_id,personne_id,inclus,origine) values($1,$2,true,'REGLE')",[eventId,person]);
    await query(`insert into scope_participations(evenement_id,personne_id,statut,role,source) values($1,$2,'PRESENT','PARTICIPANT','MANUEL')`,[eventId,person]);
    const presenceBefore=(await query('select to_jsonb(t) as row from scope_participations t where evenement_id=$1',[eventId])).rows;
    const validationBefore=baseRow.businessValidation.validatedAt;
    current=await service.listProgramme(2027);
    let published=current.canonicalProgramme.rows.find(row=>row.id===target.id);
    const minor=await service.updateProgrammePreparation(target.id,payload(published,{themes:['Thème éditorial corrigé']}),{actor:'recipe.moa'});
    published=minor.quoVadis.canonicalProgramme.rows.find(row=>row.id===target.id);
    assert.equal(published.businessValidation.validatedAt,validationBefore);
    assert.equal(published.publicationRevision.status,'APPLIED');
    const eventAfterMinor=(await query('select * from scope_evenements where evenement_id=$1',[eventId])).rows[0];
    assert.deepEqual(eventAfterMinor.engine_snapshot.themes,['Thème éditorial corrigé']);
    await assert.rejects(service.updateProgrammePreparation(target.id,payload(published,{date:'2027-05-17'})),error=>error.error==='programme_motif_obligatoire');
    const staged=await service.updateProgrammePreparation(target.id,payload(published,{date:'2027-05-17',motif:'Recette clone : déplacement majeur'}),{actor:'recipe.moa'});
    published=staged.quoVadis.canonicalProgramme.rows.find(row=>row.id===target.id);
    assert.equal(published.publicationRevision.status,'PENDING');
    assert.deepEqual((await query('select * from scope_evenements where evenement_id=$1',[eventId])).rows[0],eventAfterMinor);
    await query('update scope_evenements set version=version+1 where evenement_id=$1',[eventId]);
    published=(await service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.id===target.id);
    await assert.rejects(service.updateProgrammePreparation(target.id,payload(published,{saveAction:'VALIDATE',confirmPopulationImpact:true}),{actor:'recipe.moa'}),
      error=>error.error==='programme_publication_conflit');
    const restaged=await service.updateProgrammePreparation(target.id,payload(published),{actor:'recipe.moa'});
    published=restaged.quoVadis.canonicalProgramme.rows.find(row=>row.id===target.id);
    const approved=await service.updateProgrammePreparation(target.id,payload(published,{saveAction:'VALIDATE',confirmPopulationImpact:true}),{actor:'recipe.moa'});
    published=approved.quoVadis.canonicalProgramme.rows.find(row=>row.id===target.id);
    assert.equal(published.publicationRevision.status,'APPROVED');assert.equal(published.publishedEventId,eventId);
    assert.equal(published.publishedEventDate,'2027-05-17');assert.equal(published.statCom,'011PR');
    const presenceAfter=(await query('select to_jsonb(t) as row from scope_participations t where evenement_id=$1',[eventId])).rows;
    for(const history of presenceBefore) assert.deepEqual(presenceAfter.find(value=>value.row.personne_id===history.row.personne_id),history);
    proof.populationEntriesAddedByExistingMotor=presenceAfter.length-presenceBefore.length;
    proof.workflow={annualWithdrawalReasonRequired:true,occurrenceWithdrawalReasonRequired:true,traceable:true,
      minorWithoutNewValidation:true,majorStagedWithoutEventChange:true,targetedApprovalSameEvent:true,
      stalePublicationRejectedAndRestagingSupported:true,historicalPresencesIdentical:true};
    const events=(await query('select count(*)::int as count from scope_evenements')).rows[0].count;
    assert.equal(events,before.scope_evenements.count+1,'Only the deliberately seeded fixture event may be added');
    proof.operationalEventsCreatedByPreparation=0;
    const during=await hashes(client,tables);
    for(const table of ['scope_personnes','scope_affectations','scope_lieux','scope_salles_theorie']) assert.deepEqual(during[table],before[table]);
    proof.personnelAffectationsLieuxSallesUnchanged=true;
    await query('ROLLBACK');open=false;
    const after=await hashes(client,tables);assert.deepEqual(after,before);
    assert.equal((await client.query("select to_regclass('scope_activity_participation_rules') as name")).rows[0].name,participationRulesBefore);
    proof.rollbackAllTablesUnchanged=tables.length;proof.before=before;proof.after=after;proof.verdict='PASS';
    const output=path.join(root,'docs/captures/qv-pr12-complement-20261012/postgres-integrity.json');
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({...proof,before:undefined,after:undefined,extrasAfter:{code:proof.extrasAfter.code,active:proof.extrasAfter.active}}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
