'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {replayCurrent}=require('./scope-qv-post-recette-moa-clone');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const coverage=require('../netlify/lib/_scope-quo-vadis-coverage'),logic=require('../assets/js/scope-ui-logic');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-v1-tests19-33');
process.env.SCOPE_RECIPE_V1='1';
async function run(){
  const client=new Client({host:'127.0.0.1',database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query("select tablename from pg_tables where schemaname='public' and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename")).rows.map(r=>r.tablename);
    const original=await hashes(client.query.bind(client),tables);await client.query('BEGIN');open=true;
    let queue=Promise.resolve(),n=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    await query("select pg_advisory_xact_lock(hashtext('SCOPE_ROADMAP_V1_CLONE_RECIPE'))");
    const database={query,transaction:async fn=>{const name=`v1_${++n}`;await query(`SAVEPOINT ${name}`);
      try{const result=await fn({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const snapshot=await replayCurrent(query);
    await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    await query(fs.readFileSync(path.join(root,'database/migrations/20261008_scope_qv_statcom_emsea.sql'),'utf8').replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,''));
    const baseline=await baselineService('7033e3e')({database}).listProgramme(2027);
    const service=createScopeQuoVadisService({database}),qv=await service.listProgramme(2027);
    const invariants=['id','statCom','code','businessCode','startsAt','endsAt','publics','oiSelections','themes','family','domain','humanDecision','businessValidation','publicationRevision','publishedEventId','publishedEventCode'];
    assert.equal(qv.canonicalProgramme.rows.length,baseline.canonicalProgramme.rows.length);
    for(const old of baseline.canonicalProgramme.rows){const row=qv.canonicalProgramme.rows.find(r=>r.id===old.id);assert.ok(row);
      for(const field of invariants) assert.deepEqual(row[field],old[field],`${old.id}:${field}`);}
    const tests=['All business values and protected decisions identical to production main on fresh readonly snapshot'];
    const examples=[];
    for(const [site,date,publicCode] of [['G1','2027-02-06','N04a'],['B1','2027-02-13','N03a']]){
      const row=qv.canonicalProgramme.rows.find(r=>r.startsAt?.startsWith(date) && logic.qvDpsInstructionKind(r)==='demi-section' && r.ois.includes(site) && r.publics.includes(publicCode));
      assert.ok(row,`${site} ${date} ${publicCode}`);assert.equal(coverage.programmeDayControl({...row,businessValidation:null},qv),null);
      examples.push({id:row.id,site,date,publicCode,prior:baseline.canonicalProgramme.rows.find(r=>r.id===row.id).planningDayControl,current:row.planningDayControl});
    }
    const preparatory=qv.canonicalProgramme.rows.find(r=>r.startsAt?.startsWith('2027-01-27') && /Séance instruction DPS/.test(r.label));
    assert.ok(preparatory);assert.equal(logic.qvDpsInstructionKind(preparatory),'');assert.ok(!preparatory.publics.some(code=>/^N0\d[ab]?$/.test(code)));
    tests.push('Both MOA examples use canonical CTA, no generic vacation/Saturday warning; preparatory DPS gets no section');
    const protectedTables=['scope_evenements','scope_qv_publication_links','scope_participations','scope_attendus','scope_affectations','scope_person_qualifications','scope_event_person_roles'];
    const protectedBefore=await hashes(query,protectedTables);
    await query('SAVEPOINT fixture_cases');
    const g1=qv.lieux.find(r=>r.code==='G1-CASERNE'),room=qv.sallesTheorie.find(r=>r.libelle==='Backdraft');
    const created=await service.createProgrammePreparation({year:2027,activityLabel:'Recette V1 réactivation',domain:'F1',family:'SDIS',
      statCom:'011PR',date:'2027-08-27',startTime:'09:00',endTime:'10:00',lieuId:g1.lieuId,salleTheorieId:room.salleId,
      oiCodes:['DPS:G1'],publicCodes:['PR:FORMATEUR-PR'],status:'PLANIFIE',annualRecurrence:false},{actor:'recipe.p0'});
    const id=created.itemId,initial=created.quoVadis.canonicalProgramme.rows.find(r=>r.id===id);
    const planned=await service.updateProgrammePreparation(id,{...revisions.fieldsFromProgrammeRow(initial,created.quoVadis),
      year:2027,status:'PLANIFIE',saveAction:'SAVE'},{actor:'recipe.p0'});
    const before=planned.quoVadis.canonicalProgramme.rows.find(r=>r.id===id);assert.equal(before.status,'PLANIFIE');
    await assert.rejects(service.updateProgrammePreparation(id,{...revisions.fieldsFromProgrammeRow(before,planned.quoVadis),year:2027,family:'Famille non référencée de recette'},
      {actor:'recipe.p0'}),e=>e.error==='programme_famille_invalide');
    await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'CANCEL_YEAR',motif:'Annulation de recette avec rollback.'},{actor:'recipe.p0'});
    await assert.rejects(service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'REACTIVATE'},{actor:'recipe.p0'}),e=>e.error==='programme_motif_obligatoire');
    const restored=await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'REACTIVATE',motif:'Réactivation explicite de recette, rollback.'},{actor:'recipe.p0'});
    const after=restored.quoVadis.canonicalProgramme.rows.find(r=>r.id===id);
    assert.equal(after.status,before.status);assert.equal(after.annualRecurrence,false);
    for(const field of invariants.filter(f=>!['humanDecision'].includes(f))) assert.deepEqual(after[field],before[field],field);
    await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'REACTIVATE',motif:'Requête idempotente de recette.'},{actor:'recipe.p0'});
    const history=await revisions.history(query,2027,id);assert.equal(history.filter(r=>r.action==='REACTIVER_OCCURRENCE').length,1);
    const trace=history.find(r=>r.action==='REACTIVER_OCCURRENCE');assert.deepEqual(trace.avant.fields,trace.apres.fields);
    tests.push('Explicit reactivation requires motif, retains identity and fields, records one trace, idempotent');
    await service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'CANCEL_YEAR',motif:'Nouvelle annulation de recette.'},{actor:'recipe.p0'});
    const occupied=await service.createProgrammePreparation({year:2027,activityLabel:'Recette V1 occupation',domain:'F1',family:'SDIS',
      statCom:'011PR',date:'2027-08-27',startTime:'10:00',endTime:'11:00',lieuId:g1.lieuId,salleTheorieId:room.salleId,
      oiCodes:['DPS:G1'],publicCodes:[],status:'PLANIFIE'},{actor:'recipe.p0'});assert.ok(occupied.created);
    await assert.rejects(service.updateProgrammePreparation(id,{year:2027,lifecycleAction:'REACTIVATE',motif:'Conflit de battement à refuser.'},{actor:'recipe.p0'}),e=>e.error==='programme_salle_indisponible');
    tests.push('Reactivation refuses room turnaround conflict against effective intercycle booking motor');
    await query('SAVEPOINT cancelled_publication');
    const published=qv.canonicalProgramme.rows.find(r=>r.id==='qv-source-918');
    await query("update scope_quo_vadis_obligations set statut='ANNULE' where source_ref=$1",[published.id]);
    await query("update scope_evenements set statut='ANNULE' where evenement_id=$1",[published.publishedEventId]);
    await assert.rejects(service.updateProgrammePreparation(published.id,{year:2027,lifecycleAction:'REACTIVATE',motif:'Refus attendu du contournement opérationnel.'},{actor:'recipe.p0'}),e=>e.error==='programme_publication_annulee');
    await query('ROLLBACK TO SAVEPOINT cancelled_publication');await query('RELEASE SAVEPOINT cancelled_publication');
    tests.push('Cancelled operational publication is never silently reactivated from Programme; future stop preserved');
    await query('ROLLBACK TO SAVEPOINT fixture_cases');await query('RELEASE SAVEPOINT fixture_cases');
    assert.deepEqual(await hashes(query,protectedTables),protectedBefore);
    const inventory=qv.canonicalProgramme.rows.filter(r=>!logic.qvProgrammeFamily(r)).map(r=>({id:r.id,label:r.activityLabel || r.label,external:logic.qvProgrammeParameters(r).externalActivity,statCom:r.statCom,domain:r.domain}));
    const result={status:'PASS',productionWrites:false,sourceReadAt:snapshot.at,base:'7033e3e',rows:qv.canonicalProgramme.rows.length,
      invariants,statComIdenticalPercent:100,tests,ctaExamples:examples,preparatory:{id:preparatory.id,publics:preparatory.publics},
      families:logic.qvProgrammeFamilyCatalogue(qv.canonicalProgramme.rows),missingFamilies:inventory,
      missingFamilyCounts:{internal:inventory.filter(r=>!r.external).length,external:inventory.filter(r=>r.external).length},protectedTables,rollbackTables:tables.length};
    fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(root,'output/qv-v1-tests19-33'),{recursive:true});
    fs.writeFileSync(path.join(root,'output/qv-v1-tests19-33/current.json'),JSON.stringify(qv));
    await query('ROLLBACK');open=false;assert.deepEqual(await hashes(query,tables),original);result.rollbackVerified=true;
    fs.writeFileSync(path.join(out,'clone-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'PASS',tests:tests.length,rows:result.rows,missingFamilies:result.missingFamilyCounts,rollbackTables:tables.length}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
