'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {replay}=require('./scope-qv-pr13-final-controls-clone');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'docs/captures/qv-post-recette-moa-20261013');
async function replayCurrent(query) {
  const file=path.join(root,process.env.SCOPE_RECIPE_POST_PR16==='1'
    ? 'output/qv-post-pr16/production-business-snapshot.json' : 'output/qv-post-recette/production-business-snapshot.json');
  if(!fs.existsSync(file)) throw new Error('Authorized read-only production business snapshot required in output/qv-post-recette/production-business-snapshot.json. No historical fallback is used.');
  const snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
  if(process.env.SCOPE_RECIPE_POST_PR16==='1'){
    const refs=JSON.parse(fs.readFileSync(path.join(root,'output/qv-post-pr16/production-referentials.json'),'utf8'));
    await query(`insert into scope_lieux(lieu_id,code,nom_court,nom_complet,oi_code,site_code,actif,metadata)
      select lieu_id,code,nom_court,nom_complet,oi_code,site_code,actif,metadata from jsonb_populate_recordset(null::scope_lieux,$1::jsonb)
      on conflict(lieu_id) do nothing`,[JSON.stringify(refs.lieux)]);
    await query(`insert into scope_salles_theorie(salle_id,code,libelle,lieu_id,parent_salle_id,actif,metadata)
      select salle_id,code,libelle,lieu_id,parent_salle_id,actif,metadata from jsonb_populate_recordset(null::scope_salles_theorie,$1::jsonb)
      on conflict(salle_id) do nothing`,[JSON.stringify(refs.salles)]);
  }
  if(snapshot) {snapshot.project={id:'bnfbqzqisdkysnoaeuej'};await replay(query,snapshot);
    await query('update scope_quo_vadis_programmes set metadata=$2::jsonb,periode_debut=$3,periode_fin=$4 where programme_id=$1',
      [snapshot.programme.programme_id,JSON.stringify(snapshot.programme.metadata),snapshot.programme.periode_debut,snapshot.programme.periode_fin]);}
  else await replay(query);
  if(snapshot?.audit?.length) await query(`insert into scope_journal_metier(journal_id,at,auteur_id,entite,entite_id,action,avant,apres,commentaire)
    select journal_id,at,auteur_id,entite,entite_id,action,avant,apres,commentaire
    from jsonb_populate_recordset(null::scope_journal_metier,$1::jsonb) on conflict(journal_id) do nothing`,[JSON.stringify(snapshot.audit)]);
  return snapshot;
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
    let queue=Promise.resolve(),number=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const adapter={query,transaction:async work=>{const name=`post_recipe_${++number}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const snapshot=await replayCurrent(query);
    await require('../netlify/lib/_scope-qv-moa-20261013-ddl').install(query);
    await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    await require('../netlify/lib/_scope-qv-moa-proposals').installAnnualReportProposal({query});
    const previous=await baselineService('7e330f5f3fef0cb11a1a572c3e0e7e87a9fd64a0')({database:adapter}).listProgramme(2027);
    const service=createScopeQuoVadisService({database:adapter}),current=await service.listProgramme(2027);
    fs.mkdirSync(path.join(root,'output/qv-post-recette'),{recursive:true});
    fs.writeFileSync(path.join(root,'output/qv-post-recette/baseline.json'),JSON.stringify(previous));
    fs.writeFileSync(path.join(root,'output/qv-post-recette/current.json'),JSON.stringify(current));
    const cases=current.canonicalProgramme.rows.filter(row=>/Formation groupée DPS|Formation groupée [12]|Cursus PAPR - module 3/.test(row.activityLabel || row.label))
      .map(row=>({id:row.id,label:row.activityLabel || row.label,date:row.startsAt,statCom:row.statCom,ois:row.oiSelections,
        status:row.status,review:row.review,reason:row.reason,proposal:row.historicalProposal,human:row.humanDecision,validated:!!row.businessValidation}));
    const tests=[];
    const statComCorrections=[];
    for(const row of previous.canonicalProgramme.rows){const now=current.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(now,row.id);
      for(const field of ['startsAt','endsAt','businessCode','code','definitionId','occurrenceId','sessionId','publishedEventId','themes']) assert.deepEqual(now[field],row[field],row.id+':'+field);
      if(now.statCom!==row.statCom){assert.equal(row.definitionId,'QV26-FORMATION-GROUPEE-1-1-3D8CCE58');assert.equal(row.statCom,'0162F7');assert.equal(now.statCom,'0120F7');
        assert.ok(!row.humanDecision && !row.businessValidation && !row.publishedEventId);statComCorrections.push({id:row.id,before:row.statCom,after:now.statCom,rule:'QV-DPS-GROUP-001'});}}
    assert.equal(statComCorrections.length,5);tests.push('Only five demonstrated unqualified grouped DPS sessions requalified by explicit MOA rule');
    assert.equal(current.programmeCycle.startDate,'2027-02-24');assert.equal(current.programmeCycle.endDate,'2028-02-10');
    tests.push('Cycle reflects approved report rather than automated snapshot');
    const grouped=current.canonicalProgramme.rows.find(row=>row.id==='QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S2');
    assert.equal(grouped.planningDayControl.dayClass,'INTERDIT');assert.equal(grouped.planningDayControl.ruleCode,'PLANIF-DPS');
    const groupedFields=revisions.fieldsFromProgrammeRow(grouped,current);
    await assert.rejects(service.updateProgrammePreparation(grouped.id,{...groupedFields,year:2027,status:groupedFields.planningStatus,
      saveAction:'VALIDATE'},{actor:'recipe.p0'}),error=>error.error==='programme_motif_obligatoire' && error.details?.kind==='DAY_DEROGATION');
    await service.updateProgrammePreparation(grouped.id,{...groupedFields,year:2027,status:groupedFields.planningStatus,
      saveAction:'VALIDATE',motif:'Dérogation autorisée de recette du lot, sans écriture de production.'},{actor:'recipe.p0'});
    tests.push('Actual DPS Friday rule requires an authorized, recorded derogation');
    const g1=current.lieux.find(row=>row.code==='G1-CASERNE');assert.ok(g1);
    const created=await service.createProgrammePreparation({year:2027,activityLabel:'Formation personnel CFF',domain:'F7',
      externalActivity:true,activityNature:'EXTERNAL_OCCUPATION',annualRecurrence:false,participationEvaluation:false,
      ecawinExport:false,sold:false,statCom:'',date:'2027-02-26',startTime:'08:00',endTime:'17:00',lieuId:g1.lieuId,status:'PLANIFIE',oiCodes:[],publicCodes:[]},{actor:'recipe.p0'});
    assert.ok(created.updated);const occupation=created.quoVadis.canonicalProgramme.rows.find(row=>row.id===created.preparation.id || row.preparation?.id===created.preparation.id);
    assert.ok(occupation);assert.equal(occupation.statCom,'');assert.equal(occupation.participationEvaluation,false);
    tests.push('CFF external occupation accepted without participation or Stat.Com');
    const january=await service.createProgrammePreparation({year:2027,activityLabel:'Recette SDIS année civile janvier',domain:'F7',
      statCom:'011PR',date:'2027-01-01',startTime:'08:00',endTime:'09:00',oiCodes:['DPS:G1'],publicCodes:[],status:'PROPOSE'},{actor:'recipe.p0'});
    assert.ok(january.updated);tests.push('SDIS activity can be created on 01 January without moving existing occurrences');
    const januaryRow=january.quoVadis.canonicalProgramme.rows.find(row=>row.preparation?.id===january.preparation.id);assert.ok(januaryRow);
    const januaryFields=revisions.fieldsFromProgrammeRow(januaryRow,january.quoVadis);
    await service.updateProgrammePreparation(januaryRow.id,{...januaryFields,year:2027,status:'PROPOSE',saveAction:'VALIDATE'},{actor:'recipe.p0'});
    const planned=await service.updateProgrammePreparation(januaryRow.id,{...januaryFields,year:2027,saveAction:'PLAN'},{actor:'recipe.p0'});
    assert.notEqual(planned.unchanged,true);assert.equal(planned.quoVadis.canonicalProgramme.rows.find(row=>row.id===januaryRow.id).status,'PLANIFIE');
    tests.push('Plan action still changes an already validated proposed occurrence');
    const id='QV27:PAPR:M03',row=created.quoVadis.canonicalProgramme.rows.find(row=>row.id===id);assert.ok(row);
    const fields=revisions.fieldsFromProgrammeRow(row,created.quoVadis);
    if(!row.businessValidation) await service.updateProgrammePreparation(id,{...fields,year:2027,status:fields.planningStatus,validateBusiness:true,saveAction:'VALIDATE'},{actor:'recipe.p0'});
    const journalBefore=(await query("select count(*)::int as count from scope_journal_metier where entite_id=$1",[id])).rows[0].count;
    const validated=await service.updateProgrammePreparation(id,{...fields,year:2027,status:fields.planningStatus,validateBusiness:true,saveAction:'VALIDATE'},{actor:'recipe.p0'});
    assert.equal(validated.unchanged,true);
    assert.equal((await query("select count(*)::int as count from scope_journal_metier where entite_id=$1",[id])).rows[0].count,journalBefore);
    tests.push('Repeated PAPR 3 validation does not append a transaction');
    await service.updateProgrammePreparation(id,{year:2027,saveAction:'WITHDRAW',motif:'Retrait motivé de recette du lot post-MOA'},{actor:'recipe.p0'});
    await service.updateProgrammePreparation(id,{...fields,year:2027,status:fields.planningStatus,validateBusiness:true,saveAction:'VALIDATE'},{actor:'recipe.p0'});
    assert.equal((await query("select count(*)::int as count from scope_journal_metier where entite_id=$1",[id])).rows[0].count,journalBefore+2);
    tests.push('Withdrawal and new validation remain two legitimate decisions');
    const afterView=await service.listProgramme(2027);
    for(const row of current.canonicalProgramme.rows){const saved=afterView.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(saved);
      for(const field of ['statCom','businessCode','code','definitionId','occurrenceId','sessionId','publishedEventId']) assert.deepEqual(saved[field],row[field],row.id+':'+field);}
    const during=await hashes(query,tables);
    for(const table of ['scope_evenements','scope_qv_publication_links','scope_participations','scope_affectations','scope_event_code_allocations',
      'scope_personnes','scope_person_qualifications','scope_attendus']) assert.deepEqual(during[table],before[table],table);
    await client.query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    const result={status:'PASS',source:snapshot?'CURRENT_AUTHORIZED_PRODUCTION_BUSINESS_READS':'VERSIONED_CLONE_FIXTURE',productionWrites:false,
      tests,statComCorrections,cycles:{before:previous.programmeCycle,after:current.programmeCycle},cases,compared:current.canonicalProgramme.rows.length,
      rollback:{status:'PASS',tables:tables.length},before,after};
    fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'clone-results.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({tests,statComCorrections,cycles:{before:previous.programmeCycle.startDate,after:current.programmeCycle.startDate},
      cases:cases.map(row=>({...row,proposal:undefined})),rollback:result.rollback}));
  } finally {if(open) await client.query('ROLLBACK');await client.end();}
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={replayCurrent};
