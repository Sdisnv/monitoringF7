'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const vm=require('node:vm');
const L=require('../assets/js/scope-ui-logic'),C=require('../assets/js/scope-qv-coverage');
const {Client}=require('pg'),{DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/captures/qv-consolide-preparation');
const source=JSON.parse(fs.readFileSync('/private/tmp/scope-qv-complement-moa-20261015/output/qv-complement/source.json','utf8'));
const actual=JSON.parse(fs.readFileSync(path.join(root,'output/qv-consolide/actual-grouped.json'),'utf8'));
const base='b3b0cb372fa68aa4a83f8ef8f0856d31d7fbc3a5';
function unit(){
  assert.equal(L.parseHash('#/quo-vadis/programme/example?annee=2028').qvAnnee,2028);
  assert.equal(L.parseHash('#/quo-vadis/programme/example').qvAnnee,2027);
  const examples=[['0 I','Échelon 0 et I'],['0 I II III','Échelon 0 à III'],['I II III','Échelon I à III'],
    ['II III','Échelon II et III'],['II III IV','Échelon II à IV'],['0 III','Échelon 0 et III'],['0 II III','Échelon 0 et II et III']];
  for(const [values,expected] of examples) assert.equal(L.qvFormatPublicDisplayLabels(values.split(' ').map(value=>'ECH:'+value)),expected);
  assert.equal(L.qvFormatPublicDisplayLabels([],['Échelon O']),'Échelon O');
  const echelon=L.qvProgrammePublicDisplayCatalogue().find(group=>group.group==='Échelons').items;
  assert.deepEqual(echelon.map(([code])=>code),['ECH:0','ECH:I','ECH:II','ECH:III','ECH:IV']);
  const auto=L.qvProgrammePublicDisplayCatalogue().find(group=>group.group==='AUTO').items;
  assert.equal(auto.findIndex(([code])=>code==='AUTO:CAND-EA'),auto.findIndex(([code])=>code==='AUTO:5')+1);
  const pair=C.PREPARATION_PAIRS[0];
  const exercise={id:'exercise',definitionId:pair[0],label:'Exercice DAP 1',statCom:'013Y1',oiSelections:['DAP:Y1'],startsAt:'2027-04-12T19:00'};
  const course={id:'course',definitionId:pair[1],label:'Cours DAP 1',statCom:'013Y1',oiSelections:['DAP:Y1'],startsAt:'2027-03-29T19:00',endsAt:'2027-03-29T21:00'};
  const cases=[];
  for(const days of [28,21,14,13,7,0,-1]){
    const d=new Date('2027-04-12T12:00:00Z');d.setUTCDate(d.getUTCDate()-days);
    const date=d.toISOString().slice(0,10),row={...course,startsAt:date+'T19:00',endsAt:date+'T21:00'};
    const control=C.preparationControls([exercise,row])[0];assert.equal(control.days,days);
    assert.equal(control.status,days>=14?'CONFORME':days<0?'NON_CONFORME_CRITIQUE':'A_CONTROLER');cases.push({days,status:control.status});
  }
  for(const tz of ['Europe/Zurich','America/New_York','UTC']){
    const script=`process.env.TZ=${JSON.stringify(tz)};const C=require('./assets/js/scope-qv-coverage');console.log(C.preparationControls(${JSON.stringify([exercise,course])})[0].days)`;
    assert.equal(execFileSync(process.execPath,['-e',script],{cwd:root,encoding:'utf8'}).trim(),'14');
  }
  assert.equal(C.preparationControls([exercise])[0].status,'A_CONTROLER');
  assert.equal(C.preparationControls([exercise,{...course,startsAt:null,endsAt:null}])[0].status,'A_CONTROLER');
  assert.equal(C.preparationControls([{...exercise,startsAt:null},course])[0].status,'A_CONTROLER');
  assert.equal(C.preparationControls([exercise,course,{...course,id:'duplicate'}])[0].status,'MOA_REQUIRED');
  assert.equal(C.preparationControls([exercise,{...course,endsAt:'2027-03-28T22:30:00Z'}])[0].days,14);
  assert.equal(C.preparationControls([exercise,{...course,statCom:'013Y2',oiSelections:['DAP:Y2']}])[0].courseId,null);
  assert.equal(C.preparationControls([{...exercise,definitionId:'UNKNOWN',label:'Exercice DAP 1'},course]).length,0);
  const dpsExercise={...exercise,definitionId:C.PREPARATION_PAIRS[4][0],statCom:'012C1',oiSelections:['DPS:C1'],publics:['N01a']};
  const dpsCourse={...course,definitionId:C.PREPARATION_PAIRS[4][1],statCom:'012C1',oiSelections:['DPS:C1'],publics:['N02a']};
  assert.equal(C.preparationControls([dpsExercise,dpsCourse])[0].status,'MOA_REQUIRED');
  assert.equal(C.preparationControls([dpsExercise,{...dpsCourse,publics:['N01']}])[0].status,'CONFORME');
  const critical=C.preparationControls([{...exercise,startsAt:'2027-02-10T19:00'},{...course,startsAt:'2027-03-10T19:00',endsAt:'2027-03-10T21:00'}])[0];
  assert.equal(critical.days,-28);assert.equal(critical.status,'NON_CONFORME_CRITIQUE');
  assert.equal(C.preparationControls([{...exercise,publishedEventId:'existing',startsAt:'2027-02-10T19:00'},course])[0].blocking,false);
  const metadata=actual.metadata,decision=L.qvProgrammeDateDecision(metadata);assert.equal(decision.value,'2027-04-21');
  assert.equal(L.qvProgrammeDateDecision({humanDecision:true,planningFields:{date:'2027-04-21'},planningStatus:'PLANIFIE'}),null);
  assert.equal(L.qvProgrammeDateDecision({...metadata,validationWithdrawal:{motif:'withdraw'}}),null);
  assert.equal(L.qvProgrammeDateDecision({...metadata,planningFields:{...metadata.planningFields,date:'2027-04-22',updatedAt:'later'}}),null);
  const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness'),current=createCatalogUiHarness(),previous=createCatalogUiHarness();
  const old=file=>execFileSync('git',['show',base+':'+file],{cwd:root,encoding:'utf8',maxBuffer:4000000});
  const logic={module:{exports:{}},globalThis:{}};vm.runInNewContext(old('assets/js/scope-ui-logic.js'),logic);
  previous.context.window.ScopeUiLogic=logic.module.exports;vm.runInContext(old('assets/js/scope-ui.js'),previous.context);
  const fixture=JSON.parse(fs.readFileSync('/private/tmp/scope-qv-complement-moa-20261015/output/qv-complement/current.json','utf8'));
  const newExports=current.hooks.quoVadisProgrammeExport(fixture).rows,oldExports=previous.context.window.ScopeUiTestHooks.quoVadisProgrammeExport(fixture).rows;
  const exportFormatting=[];assert.equal(newExports.length,oldExports.length);
  for(let i=0;i<newExports.length;i++){
    if(newExports[i].publicCible!==oldExports[i].publicCible) exportFormatting.push({code:newExports[i].code,before:oldExports[i].publicCible,after:newExports[i].publicCible});
    const {publicCible:ignored,...rest}=newExports[i],{publicCible:oldIgnored,...oldRest}=oldExports[i];
    assert.equal(JSON.stringify(rest),JSON.stringify(oldRest));
  }
  return {status:'PASS',examples,cases,timezones:3,actualDateProof:{sourceRef:actual.source_ref,date:decision.value,validatedAt:decision.validatedAt},
    missingAndAmbiguousChecked:true,publishedHistoryNotBlocked:true,exports:{rows:newExports.length,allOtherColumnsIdentical:true,publicFormatting:exportFormatting}};
}

async function clone(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    await client.query("set lock_timeout='3s';set statement_timeout='30s'");
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=['scope_quo_vadis_obligations','scope_evenements','scope_affectations','scope_participations','scope_attendus',
      'scope_journal_metier','scope_qv_publication_links','scope_event_code_allocations','scope_personnes'];
    const original=await hashes(client.query.bind(client),tables);await client.query('BEGIN');open=true;
    const shadows={scope_quo_vadis_obligations:source.preparations,scope_quo_vadis_cursus_definitions:source.cursus,scope_competence_definitions:source.qualifications,
      scope_quo_vadis_programmes:null,scope_evenements:null,scope_qv_publication_links:null,scope_journal_metier:null,scope_event_code_allocations:null,
      scope_quo_vadis_proposals:null,scope_quo_vadis_calendar_days:null,scope_quo_vadis_cursus_programmes:null,scope_quo_vadis_cursus_step_programmes:null};
    for(const [table,rows] of Object.entries(shadows)){
      await client.query(`create temp table ${table} (like public.${table} including all) on commit drop`);
      if(rows) await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(rows)]);
      else await client.query(`insert into pg_temp.${table} select * from public.${table}`);
    }
    for(const [table,rows,key] of [['scope_evenements',source.events,'evenement_id'],['scope_qv_publication_links',source.links,'publication_unit_id']])
      for(const row of rows){await client.query(`delete from pg_temp.${table} where ${key}=$1`,[row[key]]);
        await client.query(`insert into pg_temp.${table} select * from jsonb_populate_record(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(row)]);}
    await client.query('delete from pg_temp.scope_quo_vadis_obligations where source_ref=$1',[actual.source_ref]);
    await client.query('insert into pg_temp.scope_quo_vadis_obligations select * from jsonb_populate_record(null::pg_temp.scope_quo_vadis_obligations,$1::jsonb)',[JSON.stringify(actual)]);
    let queue=Promise.resolve(),n=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const database={query,transaction:async work=>{const savepoint='targeted_'+ ++n;await query('SAVEPOINT '+savepoint);
      try{const result=await work({query});await query('RELEASE SAVEPOINT '+savepoint);return result;}
      catch(error){await query('ROLLBACK TO SAVEPOINT '+savepoint);await query('RELEASE SAVEPOINT '+savepoint);throw error;}}};
    const before=await baselineService(base)({database}).listProgramme(2027),service=createScopeQuoVadisService({database});
    const current=await service.listProgramme(2027);
    const transport=require('../netlify/lib/_scope-json-transport'),zlib=require('node:zlib'),payloadSizes=[];
    for(const [version,payload] of [['before',before],['after',current]]){
      const body=JSON.stringify({ok:true,quoVadis:payload});
      const response=await transport.compactJsonResponse({headers:{}},{statusCode:200,headers:{'Content-Type':'application/json'},body});
      assert.equal(response.statusCode,200);assert.equal(response.headers['Content-Encoding'],'gzip');
      assert.equal(zlib.gunzipSync(Buffer.from(response.body,'base64')).toString(),body);
      const envelopeBytes=Buffer.byteLength(JSON.stringify(response));assert.ok(envelopeBytes<6291556);
      payloadSizes.push({version,jsonBytes:Buffer.byteLength(body),lambdaEnvelopeBytes:envelopeBytes,limit:6291556});
    }
    const invariant=['id','statCom','code','businessCode','startsAt','endsAt','publics','publicFreeLabels','ois','oiSelections',
      'responsible','responsibleSelections','publishedEventId','publishedEventCode','businessValidation','humanDecision','status'];
    assert.equal(current.canonicalProgramme.rows.length,before.canonicalProgramme.rows.length);
    for(const row of before.canonicalProgramme.rows){const next=current.canonicalProgramme.rows.find(item=>item.id===row.id);assert.ok(next);
      for(const field of invariant) assert.deepEqual(next[field],row[field],row.id+':'+field);}
    assert.equal(current.canonicalProgramme.rows.find(row=>row.id===actual.source_ref).dateDecision.value,'2027-04-21');
    assert.ok(current.dateProposalSummary.obsolete>=1);
    fs.mkdirSync(path.join(root,'output/qv-consolide'),{recursive:true});fs.writeFileSync(path.join(root,'output/qv-consolide/current.json'),JSON.stringify(current));
    const protectedTables=['scope_evenements','scope_affectations','scope_participations','scope_attendus','scope_qv_publication_links','scope_event_code_allocations','scope_personnes'];
    const protectedBefore=await hashes(query,protectedTables);
    const grouped=current.canonicalProgramme.rows.find(row=>row.id===actual.source_ref);
    const groupedFields=revisions.fieldsFromProgrammeRow(grouped,current);
    const preservedDate=await service.updateProgrammePreparation(grouped.id,{...groupedFields,year:2027,saveAction:'SAVE',
      publicCodes:['ECH:0','ECH:I'],themes:[...groupedFields.themes,'Fixture autre champ sans revalidation']},{actor:'recipe.p0'});
    assert.equal(preservedDate.quoVadis.canonicalProgramme.rows.find(row=>row.id===grouped.id).dateDecision.value,'2027-04-21');
    const exercise=current.canonicalProgramme.rows.find(row=>row.definitionId===C.PREPARATION_PAIRS[0][0] && row.statCom==='013Y1');
    const course=current.canonicalProgramme.rows.find(row=>row.definitionId===C.PREPARATION_PAIRS[0][1] && row.statCom==='013Y1');assert.ok(exercise && course);
    const put=async(row,date)=>{
      const template=source.preparations.find(item=>item.source_ref===row.id) || source.preparations[0];
      const fields={...revisions.fieldsFromProgrammeRow(row,current),date,domain:'F7',lieuId:null,salleTheorieId:null,roomLabel:'',locationLabel:'',startTime:'19:00',endTime:'21:00'};
      const value={...template,obligation_id:require('node:crypto').randomUUID(),source_ref:row.id,title:row.label,programme_id:current.programme.programmeId,
        statut:'PLANIFIE',lieu_id:null,salle_theorie_id:null,imposed_start_at:date+'T19:00:00+01:00',imposed_end_at:date+'T21:00:00+01:00',
        metadata:{source:'QV_PROGRAMME_PREPARATION',humanDecision:true,planningFields:fields,planningStatus:'PLANIFIE'}};
      await query('delete from pg_temp.scope_quo_vadis_obligations where source_ref=$1',[row.id]);
      await query('insert into pg_temp.scope_quo_vadis_obligations select * from jsonb_populate_record(null::pg_temp.scope_quo_vadis_obligations,$1::jsonb)',[JSON.stringify(value)]);
      return fields;
    };
    const fields=await put(exercise,'2027-02-10');await put(course,'2027-03-10');
    const controls=(await service.listProgramme(2027)).preparationControls.filter(item=>item.exerciseId===exercise.id);
    assert.equal(controls[0].status,'NON_CONFORME_CRITIQUE');
    const body={...fields,year:2027,saveAction:'VALIDATE',validateBusiness:true};
    await assert.rejects(service.updateProgrammePreparation(exercise.id,body,{actor:'recipe.p0'}),error=>error.error==='programme_motif_obligatoire' && error.details.kind==='PREPARATION_DEROGATION');
    const approval={...body,confirmPreparationException:true,motif:'Exception explicite MOA, fixture locale rollback.'};
    await assert.rejects(service.updateProgrammePreparation(exercise.id,approval,{actor:'recipe.p0'}),error=>error.error==='programme_motif_obligatoire' && error.details.kind==='DAY_DEROGATION');
    const saved=await service.updateProgrammePreparation(exercise.id,{...approval,confirmDayException:true},{actor:'recipe.p0'});
    const after=saved.quoVadis.canonicalProgramme.rows.find(row=>row.id===exercise.id);
    assert.equal(after.preparationControls[0].exception.motif,'Exception explicite MOA, fixture locale rollback.');
    assert.equal(after.preparationControls[0].blocking,false);assert.equal(after.dateDecision.value,'2027-02-10');
    assert.deepEqual(await hashes(query,protectedTables),protectedBefore);
    await query('ROLLBACK');open=false;const final=await hashes(client.query.bind(client),tables);assert.deepEqual(final,original);
    return {status:'PASS',database:DATABASE,rows:current.canonicalProgramme.rows.length,payloadSizes,invariantFields:invariant,rollbackVerified:true,
      before:original,after:final,criticalPair:{exerciseId:exercise.id,courseId:course.id,days:controls[0].days},exceptionWorkflow:'explicit confirmation + motif + actor + journal; no operational data changes',
      controls:current.preparationControls.map(({key,exception,...item})=>({...item,exceptionRecorded:Boolean(exception)}))};
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
async function run(){fs.mkdirSync(out,{recursive:true});const result={base,unit:unit(),clone:await clone(),productionWrites:0};
  fs.writeFileSync(path.join(out,'targeted-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:'PASS',rows:result.clone.rows,rollback:true,criticalDays:result.clone.criticalPair.days}));}
run().catch(error=>{console.error(error);process.exitCode=1;});
