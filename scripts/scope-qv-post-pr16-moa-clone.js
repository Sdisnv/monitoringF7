'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {replayCurrent}=require('./scope-qv-post-recette-moa-clone');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const logic=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/captures/qv-post-pr16-moa-20261014');
process.env.SCOPE_RECIPE_POST_PR16='1';
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query("select tablename from pg_tables where schemaname='public' and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename")).rows.map(row=>row.tablename);
    const original=await hashes(client.query.bind(client),tables);await client.query('BEGIN');open=true;
    let queue=Promise.resolve(),n=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const database={query,transaction:async work=>{const name=`post_pr16_${++n}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const snapshot=await replayCurrent(query),service=createScopeQuoVadisService({database});
    const baseline=await baselineService('160eb54ccca078d313703e8f24fd64c0d4a81149')({database}).listProgramme(2027);
    const current=await service.listProgramme(2027),tests=[];
    assert.equal(current.canonicalProgramme.rows.length,baseline.canonicalProgramme.rows.length);
    const invariants=['statCom','code','businessCode','startsAt','endsAt','definitionId','occurrenceId','sessionId','ois','publics','themes','publishedEventId','publishedEventCode','businessValidation','humanDecision'];
    for(const row of baseline.canonicalProgramme.rows){const now=current.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(now,row.id);
      for(const field of invariants) assert.deepEqual(now[field],row[field],`${row.id}:${field}`);}
    tests.push('100% Stat.Com/codes/dates/times/OI/publics/themes/human decisions/publication links identical to main on the fresh snapshot');
    fs.mkdirSync(path.join(root,'output/qv-post-pr16'),{recursive:true});fs.writeFileSync(path.join(root,'output/qv-post-pr16/current.json'),JSON.stringify(current));
    const protectedTables=['scope_evenements','scope_qv_publication_links','scope_participations','scope_affectations','scope_attendus','scope_personnes','scope_person_qualifications'];
    const before=await hashes(query,tables);
    const cff=current.canonicalProgramme.rows.find(row=>row.manualCreation && row.label==='Formation personnel CFF' && row.startsAt?.startsWith('2027-02-26'));
    assert.ok(cff);const fields=revisions.fieldsFromProgrammeRow(cff,current);
    const noRoom=await service.updateProgrammePreparation(cff.id,{...fields,year:2027,saveAction:'SAVE',salleTheorieId:null},{actor:'recipe.p0'});
    const clear=noRoom.quoVadis.canonicalProgramme.rows.find(row=>row.id===cff.id);assert.equal(clear.reservationConflicts.length,0);
    const restored=await service.updateProgrammePreparation(cff.id,{...fields,year:2027,saveAction:'SAVE'},{actor:'recipe.p0'});
    assert.equal(restored.quoVadis.canonicalProgramme.rows.find(row=>row.id===cff.id).salleTheorieId,cff.salleTheorieId);
    tests.push('Current CFF occupation persists with or without Oxygen; no invented whole-site conflict');
    const osr=current.canonicalProgramme.rows.find(row=>row.definitionId==='QV26-MISE-A-NIVEAU-ANNUELLE-OSR-9977BB10' && row.startsAt?.startsWith('2027-10-08'));
    assert.ok(osr);assert.equal(osr.planningDayControl,null);
    const osrFields=revisions.fieldsFromProgrammeRow(osr,current);
    await service.updateProgrammePreparation(osr.id,{...osrFields,year:2027,saveAction:'VALIDATE',status:osrFields.planningStatus},{actor:'recipe.p0'});
    tests.push('Actual OSR 08 October 08:00-16:00 accepted by the scoped exception');
    const papr=current.canonicalProgramme.rows.find(row=>row.id==='QV27:PAPR:M03'),pfields=revisions.fieldsFromProgrammeRow(papr,current);
    const historyCount=async()=>Number((await query("select count(*) as n from scope_journal_metier where entite_id=$1",[papr.id])).rows[0].n);
    const n0=await historyCount();await service.updateProgrammePreparation(papr.id,{...pfields,oiCodes:[...pfields.oiCodes].reverse(),year:2027,saveAction:'SAVE'},{actor:'recipe.p0'});
    assert.equal(await historyCount(),n0);
    await assert.rejects(service.updateProgrammePreparation(papr.id,{year:2027,saveAction:'WITHDRAW'},{actor:'recipe.p0'}));
    await service.updateProgrammePreparation(papr.id,{year:2027,saveAction:'WITHDRAW',motif:'Recette ciblée : retrait motivé sur clone, rollback.'},{actor:'recipe.p0'});
    const modify=await service.updateProgrammePreparation(papr.id,{...pfields,themes:['Thème de recette sans publication'],
      publicFreeLabels:['Description de recette sans qualification'],year:2027,saveAction:'SAVE'},{actor:'recipe.p0'});
    const modified=modify.quoVadis.canonicalProgramme.rows.find(row=>row.id===papr.id);
    await service.updateProgrammePreparation(papr.id,{...revisions.fieldsFromProgrammeRow(modified,modify.quoVadis),year:2027,saveAction:'VALIDATE'},{actor:'recipe.p0'});
    tests.push('OI technical reordering no-op; withdrawal reason enforced; business field and decision journal preserved');
    const grouped=current.canonicalProgramme.rows.find(row=>row.statComDecision && row.preparation && !row.humanDecision && !row.publishedEventId);
    if(grouped){
      const gfields=revisions.fieldsFromProgrammeRow(grouped,current);
      await service.updateProgrammePreparation(grouped.id,{...gfields,year:2027,saveAction:'SAVE'},{actor:'recipe.p0'});
      const audit=await revisions.history(query,2027,grouped.id);
      assert.equal(audit[0].apres.automaticChanges.statCom.after,grouped.statCom);
      assert.notEqual(audit[0].apres.automaticChanges.statCom.before,grouped.statCom);
      tests.push('Existing authorized Stat.Com qualification persisted on clone is explicitly traced as automatic, not human');
    }
    const journal=await revisions.history(query,2027,papr.id);
    const proof=journal.filter(row=>row.auteur_id==='recipe.p0').map(({action,avant,apres,commentaire})=>({action,avant,apres,commentaire}));
    const during=await hashes(query,tables);for(const table of protectedTables) assert.deepEqual(during[table],before[table],table);
    const afterView=await service.listProgramme(2027);
    for(const row of current.canonicalProgramme.rows){const saved=afterView.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(saved);
      for(const field of ['statCom','code','businessCode','startsAt','endsAt','ois','publics','publishedEventId'])
        if(['startsAt','endsAt'].includes(field)) assert.equal(saved[field]?new Date(saved[field]).getTime():null,row[field]?new Date(row[field]).getTime():null,`${row.id}:${field}`);
        else assert.deepEqual(saved[field],row[field],`${row.id}:${field}`);}
    tests.push('Protected events, attendance, assignments, qualifications, all codes, dates and Stat.Com remain unchanged during recipes');
    await query('ROLLBACK');open=false;assert.deepEqual(await hashes(query,tables),original);
    fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'clone-results.json'),JSON.stringify({status:'PASS',productionWrites:false,
      snapshotPreparations:snapshot.preparations.length,rows:current.canonicalProgramme.rows.length,activeRows:current.canonicalProgramme.rows.filter(logic.qvProgrammeIsActive).length,
      invariants,statComIdenticalPercent:100,rollbackTables:tables.length,tests,journal:proof,
      reservations:{before:baseline.reservationConflicts.length,after:current.reservationConflicts.length,cff:{id:cff.id,date:cff.startsAt,room:cff.salleTheorieId,conflictsBefore:cff.reservationConflicts,conflictsAfter:clear.reservationConflicts}}},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,rows:current.canonicalProgramme.rows.length,rollbackTables:tables.length}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
