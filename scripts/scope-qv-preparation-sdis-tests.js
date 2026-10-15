'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {Client}=require('pg'),{DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const L=require('../assets/js/scope-ui-logic'),C=require('../assets/js/scope-qv-coverage');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-preparation-sdis'),base='92cce517f79a89e3040d234314b8de52613af05a';
const source=JSON.parse(fs.readFileSync('/private/tmp/scope-qv-complement-moa-20261015/output/qv-complement/source.json','utf8'));
const inventory=JSON.parse(fs.readFileSync(path.join(root,'output/qv-preparation-sdis/inventory.json'),'utf8'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function attach(qv){qv.preparationControls=C.preparationControls(qv.canonicalProgramme.rows.filter(L.qvProgrammeIsActive));
  for(const row of qv.canonicalProgramme.rows) row.preparationControls=qv.preparationControls.filter(item=>C.preparationControlAffects(item,row.id));return qv;}
function oldHarness(){
  const harness=createCatalogUiHarness(),sandbox={module:{exports:{}},globalThis:{}};
  const old=file=>execFileSync('git',['show',base+':'+file],{cwd:root,encoding:'utf8',maxBuffer:4000000});
  vm.runInNewContext(old('assets/js/scope-ui-logic.js'),sandbox);harness.context.window.ScopeUiLogic=sandbox.module.exports;
  vm.runInContext(old('assets/js/scope-ui.js'),harness.context);return harness.context.window.ScopeUiTestHooks;
}
function unit(){
  const oiCodes=L.qvProgrammeOiCatalogue().filter(group=>group.group!=='SDIS').flatMap(group=>group.items.map(([code])=>code));assert.equal(oiCodes.length,11);
  const sdis={oiSelections:['SDIS']},before=JSON.stringify(sdis);
  for(const oi of oiCodes) assert.equal(L.qvProgrammeOiMatches(sdis,oi),true);
  assert.equal(L.qvProgrammeOiMatches({oiSelections:['DAP:Y1']},'SDIS'),false);
  assert.equal(L.qvProgrammeOiMatches({oiSelections:['JSP:G1']},'DPS:G1'),false);
  assert.equal(L.qvProgrammeOiMatches(sdis,'UNKNOWN'),false);assert.equal(JSON.stringify(sdis),before);
  const group=C.GROUPED_PREPARATIONS.find(item=>item.id==='DAP-GROUP-1');
  const make=(id,date)=>({id,definitionId:group.definitionId,oiSelections:group.oiCodes,statCom:group.statCom,startsAt:date+'T19:00',label:id});
  const first=make(group.sessionSourceIds[0],'2027-04-21'),second=make(group.sessionSourceIds[1],'2027-04-28');
  const course={id:group.courseSourceId,oiSelections:group.oiCodes,statCom:group.courseStatCom,startsAt:'2027-03-23T19:00',endsAt:'2027-03-23T21:30'};
  const control=C.preparationControls([first,second,course]);assert.equal(control.length,1);assert.equal(control[0].days,29);assert.equal(control[0].status,'CONFORME');
  assert.equal(control[0].exerciseIds.length,2);assert.equal(C.preparationControls([course]).length,0);
  const unknown={...first,id:'UNKNOWN',definitionId:'DAP-FORMATION-GROUPEE'};
  assert.equal(C.preparationControls([unknown,course])[0].status,'MOA_REQUIRED');
  const late={...course,startsAt:'2027-05-01T19:00',endsAt:'2027-05-01T21:30'};
  const anomaly=C.preparationControls([first,second,late])[0];assert.equal(anomaly.status,'NON_CONFORME_CRITIQUE');
  const approved={...late,preparationDerogations:[{key:anomaly.key,motif:'Exception fixture',actor:'recipe.p0',at:'2026-10-15T09:00:00Z'}]};
  assert.equal(C.preparationControls([first,second,approved])[0].blocking,false);
  assert.equal(C.preparationControls([first,{...second,startsAt:'2027-04-29T19:00'},approved])[0].blocking,true);
  const lineage=[first,second,course].map(row=>({...row,id:'LINEAGE:'+row.id,lineage:{initialOccurrence:row.id},startsAt:row.startsAt.replace('2027','2028'),endsAt:row.endsAt?.replace('2027','2028')}));
  assert.equal(C.preparationControls(lineage)[0].days,29);
  for(const [date,days,status] of [['2027-04-07',14,'CONFORME'],['2027-04-08',13,'A_CONTROLER'],['2027-04-22',-1,'NON_CONFORME_CRITIQUE']]){
    const result=C.preparationControls([first,second,{...course,startsAt:date+'T19:00',endsAt:date+'T21:30'}])[0];
    assert.equal(result.days,days);assert.equal(result.status,status);
  }
  assert.equal(C.preparationControls([first,second,course,{...course,id:'duplicate',lineage:{initialOccurrence:course.id}}])[0].status,'MOA_REQUIRED');
  return {status:'PASS',oiCodes,groupedDays:29,groupedBoundaries:[14,13,-1],oneRelationForTwoSessions:true,exceptionExpiresOnDateChange:true,lineage2028:true};
}
async function clone(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    await client.query("set lock_timeout='3s';set statement_timeout='45s'");assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=['scope_quo_vadis_obligations','scope_evenements','scope_affectations','scope_participations','scope_attendus','scope_journal_metier',
      'scope_qv_publication_links','scope_event_code_allocations','scope_personnes','scope_quo_vadis_proposals','scope_quo_vadis_calendar_days'];
    const original=await hashes(client.query.bind(client),tables);await client.query('BEGIN');open=true;
    const shadows={scope_quo_vadis_obligations:source.preparations,scope_quo_vadis_cursus_definitions:source.cursus,scope_competence_definitions:source.qualifications,
      scope_quo_vadis_programmes:null,scope_evenements:null,scope_qv_publication_links:null,scope_journal_metier:null,scope_event_code_allocations:null,
      scope_quo_vadis_proposals:null,scope_quo_vadis_calendar_days:null,scope_quo_vadis_cursus_programmes:null,scope_quo_vadis_cursus_step_programmes:null};
    for(const [table,rows] of Object.entries(shadows)){
      await client.query(`create temp table ${table} (like public.${table} including all) on commit drop`);
      if(rows) await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(rows)]);
      else await client.query(`insert into pg_temp.${table} select * from public.${table}`);
    }
    for(const [table,rows,key] of [['scope_evenements',source.events,'evenement_id'],['scope_qv_publication_links',source.links,'publication_unit_id'],
      ['scope_quo_vadis_obligations',inventory.preparations,'source_ref']]) for(const row of rows){
      await client.query(`delete from pg_temp.${table} where ${key}=$1`,[row[key]]);
      await client.query(`insert into pg_temp.${table} select * from jsonb_populate_record(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(row)]);
    }
    let queue=Promise.resolve(),n=0;const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const database={query,transaction:async work=>{const savepoint='preparation_sdis_'+ ++n;await query('SAVEPOINT '+savepoint);
      try{const result=await work({query});await query('RELEASE SAVEPOINT '+savepoint);return result;}
      catch(error){await query('ROLLBACK TO SAVEPOINT '+savepoint);await query('RELEASE SAVEPOINT '+savepoint);throw error;}}};
    const before=await baselineService(base)({database}).listProgramme(2027),current=await createScopeQuoVadisService({database}).listProgramme(2027);
    const invariant=['id','statCom','code','businessCode','startsAt','endsAt','ois','oiSelections','publics','publicFreeLabels','responsible','responsibleSelections',
      'publishedEventId','publishedEventCode','businessValidation','humanDecision','status','themes'];
    assert.equal(current.canonicalProgramme.rows.length,before.canonicalProgramme.rows.length);
    for(const row of before.canonicalProgramme.rows){const now=current.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(now);
      for(const field of invariant) assert.deepEqual(now[field],row[field],row.id+':'+field);}
    const critical=current.preparationControls.find(item=>item.exerciseId==='QV26-EXERCICE-DAP-1-9890D687:O1:S1');
    assert.equal(critical.days,-28);assert.equal(critical.status,'NON_CONFORME_CRITIQUE');
    const exercise=current.canonicalProgramme.rows.find(row=>row.id===critical.exerciseId),course=current.canonicalProgramme.rows.find(row=>row.id===critical.courseId);
    assert.equal(exercise.preparationControls[0],course.preparationControls[0]);
    const beforeCourse=before.canonicalProgramme.rows.find(row=>row.id===critical.courseId);
    const baselineBidirectional=Boolean(beforeCourse.preparationControls?.some(item=>item.key===critical.key));
    const groups=current.preparationControls.filter(item=>item.groupId);assert.equal(groups.filter(item=>item.groupId==='DAP-GROUP-1').length,1);
    const dap=groups.find(item=>item.groupId==='DAP-GROUP-1');assert.equal(dap.days,29);assert.equal(dap.status,'CONFORME');assert.equal(dap.exerciseIds.length,2);
    const dps=groups.find(item=>item.groupId==='DPS-GROUP-1');assert.ok(dps && dps.courseId);assert.equal(dps.exerciseIds.length,6);
    const {hooks}=createCatalogUiHarness(),old=oldHarness();
    const courseHtml=hooks.renderQuoVadisProgrammeFicheHtml(current,course.id),exerciseHtml=hooks.renderQuoVadisProgrammeFicheHtml(current,exercise.id);
    assert.ok(courseHtml.includes('Ce cours de cadres est programmé après'));assert.ok(courseHtml.includes('data-qv-preparation-key='));assert.ok(exerciseHtml.includes('data-qv-preparation-key='));
    const oldGlobal=old.quoVadisProgrammeExport(before),newGlobal=hooks.quoVadisProgrammeExport(current);
    assert.equal(JSON.stringify(newGlobal),JSON.stringify(oldGlobal));
    const sdis=current.canonicalProgramme.rows.filter(L.qvProgrammeIsActive).filter(row=>L.qvProgrammeConfirmedOiCodes(row).includes('SDIS')).map(row=>row.id);
    assert.ok(sdis.length>0);const filters=[];
    for(const oi of unit().oiCodes.concat('SDIS')){
      const expected=before.canonicalProgramme.rows.filter(L.qvProgrammeIsActive).filter(row=>L.qvProgrammeConfirmedOiCodes(row).includes(oi)
        || oi!=='SDIS' && sdis.includes(row.id)).map(row=>row.id).sort();
      const rows=hooks.filterQuoVadisProgrammeRows(current,{oi}),ids=rows.map(row=>row.id);assert.deepEqual(ids.slice().sort(),expected);
      assert.equal(new Set(ids).size,ids.length);filters.push({oi,count:ids.length,sdisCount:ids.filter(id=>sdis.includes(id)).length});
    }
    const combined=hooks.filterQuoVadisProgrammeRows(current,{oi:'DAP:Y1',type:'Exercice',statcom:'013Y1'});
    assert.ok(combined.length);for(const row of combined) assert.equal(row.statCom,'013Y1');
    // Dated existing OI assignments remain separate from visibility and are never expanded from SDIS.
    const persons=(await query('select id as personne_id,nip from scope_personnes')).rows;
    assert.equal(new Set(persons.map(row=>row.nip)).size,persons.length);
    const assignments=(await query("select personne_id,domaine as \"domainCode\",cible as \"oiCode\",date_actif::text as \"validFrom\",date_inactif::text as \"validTo\" from scope_affectations where categorie='OI'")).rows;
    const evaluated=require('../netlify/lib/_scope-public-engine').evaluatePublicRule({evaluationDate:'2027-04-21',persons:persons.concat(persons),assignments,
      ruleVersion:{expression:{predicate:'HAS_OI',domainCode:'DAP',oiCodes:['Y1']}}});
    assert.equal(evaluated.complete,true);assert.equal(evaluated.personIds.length,new Set(evaluated.personIds).size);
    const body=JSON.stringify({ok:true,quoVadis:current}),transport=await require('../netlify/lib/_scope-json-transport').compactJsonResponse({},
      {statusCode:200,headers:{'Content-Type':'application/json'},body});assert.ok(Buffer.byteLength(JSON.stringify(transport))<6291556);
    fs.mkdirSync(path.join(root,'output/qv-preparation-sdis'),{recursive:true});fs.writeFileSync(path.join(root,'output/qv-preparation-sdis/current.json'),JSON.stringify(current));
    await query('SAVEPOINT grouped_exception_recipe');
    const service=createScopeQuoVadisService({database});
    const groupCourse=current.canonicalProgramme.rows.find(row=>row.id===dap.courseId);
    await query(`update pg_temp.scope_quo_vadis_obligations set
      imposed_start_at='2027-05-03T19:00:00+02:00',imposed_end_at='2027-05-03T21:30:00+02:00',
      metadata=jsonb_set(metadata,'{planningFields,date}','"2027-05-03"'::jsonb) where source_ref=$1`,[groupCourse.id]);
    const invalid=await service.listProgramme(2027),relation=invalid.preparationControls.find(item=>item.groupId==='DAP-GROUP-1');
    assert.equal(relation.status,'NON_CONFORME_CRITIQUE');assert.equal(relation.blocking,true);
    for(const id of [...dap.exerciseIds,dap.courseId]) assert.equal(invalid.canonicalProgramme.rows.find(row=>row.id===id).preparationControls[0].key,relation.key);
    const candidate=invalid.canonicalProgramme.rows.find(row=>row.id===dap.exerciseIds[1]);
    const validationBody={...revisions.fieldsFromProgrammeRow(candidate,invalid),year:2027,saveAction:'VALIDATE',validateBusiness:true};
    await assert.rejects(service.updateProgrammePreparation(candidate.id,validationBody,{actor:'recipe.p0'}),error=>error.error==='programme_motif_obligatoire' && error.details.kind==='PREPARATION_DEROGATION');
    const saved=await service.updateProgrammePreparation(candidate.id,{...validationBody,confirmPreparationException:true,confirmDayException:true,
      motif:'Exception groupée explicite, fixture locale rollback.'},{actor:'recipe.p0'});
    const approvedRelation=saved.quoVadis.preparationControls.find(item=>item.groupId==='DAP-GROUP-1');
    assert.equal(approvedRelation.blocking,false);assert.equal(approvedRelation.exception.actor,'recipe.p0');
    assert.equal(approvedRelation.exception.key,relation.key);assert.ok(approvedRelation.exception.at);
    assert.ok((await query("select count(*)::int as n from pg_temp.scope_journal_metier where commentaire=$1",['Exception groupée explicite, fixture locale rollback.'])).rows[0].n>0);
    await query('ROLLBACK TO SAVEPOINT grouped_exception_recipe');
    await query('ROLLBACK');open=false;const final=await hashes(client.query.bind(client),tables);assert.deepEqual(final,original);
    return {status:'PASS',database:DATABASE,rollbackVerified:true,before:original,after:final,rows:current.canonicalProgramme.rows.length,invariant,
      baselineBidirectional,critical:{...critical,exception:critical.exception?{recorded:true}:null},groups,filters,globalExportsIdentical:true,
      futureAssignments:{distinctNips:true,datedPublicResolution:true,assigned:0,createdPresences:0,createdObligations:0},
      groupedValidation:{ordinaryValidationBlocked:true,secondSessionUsesSameRelation:true,explicitException:true,motifActorTimestampAndJournal:true,fixtureRolledBack:true},
      transportBytes:Buffer.byteLength(JSON.stringify(transport)),classicalControls:current.preparationControls.filter(item=>!item.groupId).map(({key,...item})=>item)};
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
async function run(){fs.mkdirSync(out,{recursive:true});const result={base,unit:unit(),clone:await clone(),productionWrites:0};
  fs.writeFileSync(path.join(out,'targeted-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'PASS',rows:result.clone.rows,baselineBidirectional:result.clone.baselineBidirectional,grouped:result.clone.groups.map(g=>({id:g.groupId,days:g.days,status:g.status})),rollback:true}));}
run().catch(error=>{console.error(error);process.exitCode=1;});
