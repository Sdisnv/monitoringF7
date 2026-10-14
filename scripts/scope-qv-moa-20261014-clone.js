'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {replayCurrent}=require('./scope-qv-post-recette-moa-clone');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/captures/qv-moa-20261014');
process.env.SCOPE_RECIPE_MOA_20261014='1';
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query("select tablename from pg_tables where schemaname='public' and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename")).rows.map(row=>row.tablename);
    const original=await hashes(client.query.bind(client),tables);await client.query('BEGIN');open=true;
    let queue=Promise.resolve(),n=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const database={query,transaction:async work=>{const name=`moa14_${++n}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const snapshot=await replayCurrent(query),service=createScopeQuoVadisService({database});
    const baseline=await baselineService('6666e2c19ab9dd79954b9f4337ceec66786ce95b')({database}).listProgramme(2027);
    const current=await service.listProgramme(2027),tests=[];
    assert.equal(current.canonicalProgramme.rows.length,baseline.canonicalProgramme.rows.length);
    const invariants=['statCom','code','businessCode','startsAt','endsAt','definitionId','occurrenceId','sessionId','ois','publics','themes','publishedEventId','publishedEventCode','businessValidation','humanDecision','status'];
    for(const row of baseline.canonicalProgramme.rows){const now=current.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(now,row.id);
      for(const field of invariants) assert.deepEqual(now[field],row[field],`${row.id}:${field}`);}
    tests.push('100% Stat.Com/codes/dates/OI/publics/human decisions identical to main on current production snapshot');
    fs.writeFileSync(path.join(root,'output/qv-moa-20261014/current.json'),JSON.stringify(current));
    const frozen=current.canonicalProgramme.rows.find(row=>row.id==='QV27:MANUAL:7cad2053-a78e-4299-bb7d-8e2bdeae2aa0');
    assert.equal(frozen.statCom,'070F23');assert.equal(frozen.businessCode,'070F23.006');assert.equal(frozen.status,'ANNULE');
    tests.push('Existing coordination activity remains unique, cancelled, with frozen 070F23 / 070F23.006');
    const protectedTables=['scope_evenements','scope_qv_publication_links','scope_participations','scope_affectations','scope_attendus','scope_personnes','scope_person_qualifications'];
    const before=await hashes(query,tables);
    const feb=current.canonicalProgramme.rows.find(row=>row.id==='qv-source-918');assert.ok(feb);
    assert.ok(feb.reservationConflicts.some(item=>/État-major/.test(item.otherLabel)));
    assert.ok(feb.personnelConflicts.some(item=>item.repositionId===feb.id));
    tests.push('16 February existing EM / JSP room and common Chef formation conflict detected, no move');
    const june=current.personnelConflicts.filter(item=>item.date==='2027-06-22');assert.ok(june.length);
    tests.push('22 June proposed Direction JSP conflict distinguished without moving or validating its proposal');
    const g1=current.lieux.find(row=>row.code==='G1-CASERNE'),room=current.sallesTheorie.find(row=>row.libelle==='État-major');
    await assert.rejects(service.createProgrammePreparation({year:2027,activityLabel:'Recette conflit salle',domain:'F7',
      statCom:'011PR',date:'2027-02-16',startTime:'18:30',endTime:'20:30',lieuId:g1.lieuId,salleTheorieId:room.salleId,
      oiCodes:['DPS:G1'],publicCodes:[]},{actor:'recipe.p0'}),error=>error.error==='programme_salle_indisponible');
    tests.push('Server rejects conflicting room save before journal or insert');
    await query('SAVEPOINT room_cases');
    const older=(await query(`insert into scope_quo_vadis_programmes(annee,code,libelle,periode_debut,periode_fin)
      values(2028,'QV-RECIPE-2028','Cycle interannée de recette','2027-12-01','2028-12-31')
      on conflict(annee) do update set annee=excluded.annee returning programme_id`)).rows[0];assert.ok(older);
    const fields={date:'2027-08-26',startTime:'18:00',endTime:'20:00',lieuId:g1.lieuId,salleTheorieId:room.salleId,
      roomLabel:room.libelle,locationLabel:g1.nomCourt,activityLabel:'Réservation intercycle de recette'};
    const fixture=(await query(`insert into scope_quo_vadis_obligations(programme_id,source_type,source_ref,title,domain,statut,statcom_policy,metadata,lieu_id,salle_theorie_id)
      values($1,'MANUAL','RECIPE-INTERCYCLE-20261014',$2,'PR','PLANIFIE','A_CONFIRMER',$3::jsonb,$4,$5) returning obligation_id`,
      [older.programme_id,fields.activityLabel,JSON.stringify({source:'QV_PROGRAMME_PREPARATION',planningFields:fields,humanDecision:true}),g1.lieuId,room.salleId])).rows[0];
    const cross=await service.listProgramme(2027);assert.ok(cross.reservations.some(row=>row.sourceYear===2028 && row.startsAt==='2027-08-26T18:00'));
    const roomBody={year:2027,activityLabel:'Recette battement intercycle',domain:'F7',statCom:'011PR',date:'2027-08-26',
      startTime:'20:15',endTime:'21:30',lieuId:g1.lieuId,salleTheorieId:room.salleId,oiCodes:['DPS:G1'],publicCodes:[]};
    await assert.rejects(service.createProgrammePreparation(roomBody,{actor:'recipe.p0'}),error=>error.error==='programme_salle_indisponible'
      && error.details.conflicts.some(item=>item.causes.some(cause=>cause.kind==='TURNAROUND')));
    const compatible=await service.createProgrammePreparation({...roomBody,startTime:'20:30'},{actor:'recipe.p0'});assert.ok(compatible.created);
    const second=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await second.connect();
    try{await second.query('BEGIN');const lock=await second.query("select pg_try_advisory_xact_lock(hashtext('QV_ROOM_RESERVATIONS')) as acquired");
      assert.equal(lock.rows[0].acquired,false);await second.query('ROLLBACK');}finally{await second.end();}
    tests.push('Other cycle actual-date booking and 20:15 blocked; 20:30 accepted; concurrent connection excluded by transaction lock');
    await query('update scope_quo_vadis_obligations set statut=$2 where obligation_id=$1',[fixture.obligation_id,'ANNULE']);
    const afterCancel=await service.listProgramme(2027);assert.ok(!afterCancel.reservations.some(row=>row.sourceYear===2028 && row.startsAt==='2027-08-26T18:00'));
    await query('ROLLBACK TO SAVEPOINT room_cases');await query('RELEASE SAVEPOINT room_cases');
    tests.push('Cancelled intercycle fixture ceases to reserve its room; all fixtures rolled back');
    const created=await service.createProgrammePreparation({year:2027,activityLabel:'Recette famille et annulation',domain:'F1',family:'DAP',
      statCom:'070F23',date:'2027-08-26',startTime:'19:00',endTime:'21:00',oiCodes:['DAP:Y1'],publicCodes:['ECH:II','ECH:III']},{actor:'recipe.p0'});
    assert.ok(created.created);const id=created.itemId,row=created.quoVadis.canonicalProgramme.rows.find(item=>item.id===id);
    assert.equal(row.family,'DAP');assert.equal(row.domain,'F1');assert.equal(row.statCom,'070F23');
    await assert.rejects(service.updateProgrammePreparation(id,{...revisions.fieldsFromProgrammeRow(row,created.quoVadis),family:'DPS',year:2027},{actor:'recipe.p0'}),
      error=>error.error==='programme_famille_incompatible');
    tests.push('F1 / DAP Y1 family persists separately; incompatible DPS rejected without Stat.Com change');
    await assert.rejects(service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'CANCEL_YEAR'},{actor:'recipe.p0'}),error=>error.error==='programme_motif_obligatoire');
    const cancelled=await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'CANCEL_YEAR',motif:'Recette annulation annuelle avec rollback.'},{actor:'recipe.p0'});
    const audit=await revisions.history(query,2027,id),entry=audit.find(item=>item.action==='ANNULER_OCCURRENCE');
    assert.deepEqual(entry.avant.fields,entry.apres.fields);assert.equal(entry.apres.lifecycleDecision.recurrencePreserved,true);
    assert.equal(entry.apres.lifecycleDecision.futureGenerationDisabled,false);assert.ok(entry.commentaire);
    assert.equal(cancelled.quoVadis.canonicalProgramme.rows.find(item=>item.id===id).status,'ANNULE');
    await assert.rejects(service.updateProgrammePreparation(id,{...revisions.fieldsFromProgrammeRow(row,created.quoVadis),
      year:2027,saveAction:'SAVE'},{actor:'recipe.p0'}),error=>error.error==='programme_occurrence_annulee');
    await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'CANCEL_YEAR',motif:'Même action répétée.'},{actor:'recipe.p0'});
    assert.equal((await revisions.history(query,2027,id)).filter(item=>item.action==='ANNULER_OCCURRENCE').length,1);
    tests.push('Cancellation requires motif, one action, identical fields, recurrence preserved, idempotent; ordinary save cannot silently reactivate');
    const disabled=await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'DISABLE_PRODUCTION',motif:'Arrêt futur distinct, clone avec rollback.'},{actor:'recipe.p0'});
    assert.equal(disabled.quoVadis.canonicalProgramme.rows.find(item=>item.id===id).status,'ANNULE');
    await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'CANCEL_YEAR',motif:'Action annuelle déjà faite.'},{actor:'recipe.p0'});
    assert.equal((await revisions.history(query,2027,id)).filter(item=>item.action==='ANNULER_OCCURRENCE').length,1);
    const secondCreation=await service.createProgrammePreparation({year:2027,activityLabel:'Recette arrêt futur puis annulation',domain:'F1',
      statCom:'070F23',date:'2027-08-27',startTime:'19:00',endTime:'21:00',oiCodes:['DAP:Y1'],publicCodes:[]},{actor:'recipe.p0'});
    await service.updateProgrammePreparation(secondCreation.itemId,{year:2027,lifecycleAction:'DISABLE_PRODUCTION',motif:'Arrêt futur décidé avant annulation.'},{actor:'recipe.p0'});
    await service.updateProgrammePreparation(secondCreation.itemId,{year:2027,lifecycleAction:'CANCEL_YEAR',motif:'Annulation annuelle sans réactiver la reconduction.'},{actor:'recipe.p0'});
    const last=(await revisions.history(query,2027,secondCreation.itemId)).find(item=>item.action==='ANNULER_OCCURRENCE');
    assert.equal(last.apres.lifecycleDecision.futureGenerationDisabled,true);
    tests.push('Annual cancellation and future stop preserve each other in both action orders; no duplicate cancellation');
    const afterView=await service.listProgramme(2027);
    for(const old of current.canonicalProgramme.rows){const now=afterView.canonicalProgramme.rows.find(item=>item.id===old.id);assert.ok(now);
      for(const field of invariants) assert.deepEqual(now[field],old[field],`${old.id}:${field}`);}
    const during=await hashes(query,tables);for(const table of protectedTables) assert.deepEqual(during[table],before[table],table);
    tests.push('All existing business values, published events, attendance, assignments and qualifications unchanged');
    await query('ROLLBACK');open=false;assert.deepEqual(await hashes(query,tables),original);
    fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'clone-results.json'),JSON.stringify({status:'PASS',productionWrites:false,
      snapshotPreparations:snapshot.preparations.length,rows:current.canonicalProgramme.rows.length,invariants,
      statComIdenticalPercent:100,rollbackTables:tables.length,tests,
      reservations:{before:baseline.reservationConflicts.length,after:current.reservationConflicts.length,
        sources:current.reservations.length,otherCycles:current.reservations.filter(row=>row.sourceYear && row.sourceYear!==2027).length},
      roomConflicts:current.reservationConflicts,
      em:current.personnelConflicts.filter(item=>['2027-02-16','2027-06-22'].includes(item.date)),
      cancellation:{action:entry.action,before:entry.avant,after:entry.apres,motif:entry.commentaire}},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,rows:current.canonicalProgramme.rows.length,rollbackTables:tables.length,
      reservations:current.reservations.length,roomConflicts:current.reservationConflicts.length}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
