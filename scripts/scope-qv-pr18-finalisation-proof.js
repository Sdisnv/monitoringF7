'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes,rowEvidence}=require('./scope-qv-pr13-complement-diagnostic');
const {replayCurrent}=require('./scope-qv-post-recette-moa-clone');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const coverage=require('../netlify/lib/_scope-quo-vadis-coverage');
const logic=require('../assets/js/scope-ui-logic');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/captures/qv-moa-20261014');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'output/qv-moa-20261014',name)));
const live=read('finalisation-readonly.json'),supplement=read('finalisation-supplement.json');
const sourceProof=JSON.parse(fs.readFileSync(path.join(dir,'clone-results.json')));
const history=require('../netlify/lib/data/scope-qv-history-2026.json');
const fields=['id','statCom','code','businessCode','startsAt','endsAt','definitionId','occurrenceId','sessionId',
  'ois','oiSelections','publics','publicFreeLabels','themes','publishedEventId','publishedEventCode',
  'businessValidation','humanDecision','status','publicationRevision','lineage'];
const protectedTables=['scope_evenements','scope_qv_publication_links','scope_participations','scope_attendus',
  'scope_affectations','scope_person_qualifications','scope_event_person_roles','scope_journal_metier'];
process.env.SCOPE_RECIPE_MOA_20261014='1';
async function run(){
  assert.equal(live.readOnly,'on');assert.equal(supplement.newPreparations.length,3);
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  try{
    let queue=Promise.resolve();
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    assert.equal((await query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await query("select tablename from pg_tables where schemaname='public' and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename")).rows.map(r=>r.tablename);
    const before=await hashes(query,tables);await query('BEGIN');open=true;
    await query("select pg_advisory_xact_lock(hashtext('SCOPE_ROADMAP_V1_CLONE_RECIPE'))");
    const original=await replayCurrent(query);
    for(const row of live.preparations.filter(r=>original.preparations.some(o=>o.source_ref===r.source_ref)))
      await query(`update scope_quo_vadis_obligations set statut=$2,metadata=$3::jsonb,
        lieu_id=$4,salle_theorie_id=$5,statcom_code=$6,scope_evenement_id=$7 where programme_id=$8 and source_ref=$1`,
      [row.source_ref,row.statut,JSON.stringify(row.metadata),row.lieu_id,row.salle_theorie_id,row.statcom_code,row.scope_evenement_id,original.programme.programme_id]);
    await require('./scope-qv-pr13-final-controls-clone').replay(query,{...original,preparations:supplement.newPreparations});
    await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    const emMigration=fs.readFileSync(path.join(root,'database/migrations/20261008_scope_qv_statcom_emsea.sql'),'utf8');
    await query(emMigration.replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,''));
    let transactionNumber=0;
    const database={query,transaction:async fn=>{const name=`finalise_${++transactionNumber}`;await query(`SAVEPOINT ${name}`);
      try{const result=await fn({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const reference=await baselineService('a5cb32db73471e4a5bca50be4dee7bf98f41986c')({database}).listProgramme(2027);
    const protectedBefore=await hashes(query,protectedTables);
    const qv=await createScopeQuoVadisService({database}).listProgramme(2027);
    const rows=qv.canonicalProgramme.rows,old=read('current.json').canonicalProgramme.rows;
    assert.equal(old.length,935);assert.equal(rows.length,938);
    for(const row of old) assert.ok(rows.some(r=>r.id===row.id),row.id);
    for(const row of reference.canonicalProgramme.rows){
      const current=rows.find(r=>r.id===row.id);assert.ok(current);
      for(const field of fields) assert.deepEqual(current[field],row[field],`${row.id}:${field}`);
    }
    assert.deepEqual(await hashes(query,protectedTables),protectedBefore);
    assert.equal(qv.reservationConflicts.length,12);
    const key=r=>JSON.stringify([r.leftId,r.rightId,r.leftStartsAt,r.leftEndsAt,r.rightStartsAt,r.rightEndsAt,r.causes]);
    assert.deepEqual(qv.reservationConflicts.map(key).sort(),sourceProof.roomConflicts.map(key).sort());
    const evidence=ids=>rows.filter(r=>ids.includes(r.id)).map(rowEvidence);
    const room=name=>qv.sallesTheorie.find(r=>r.libelle===name);
    const pool=qv.reservations;
    const roomTrial=(id,startsAt,endsAt,roomName)=>{
      const target=rows.find(r=>r.id===id),selected=room(roomName);assert.ok(target);assert.ok(selected?.actif);
      const booking={...target,id:`TRIAL:${id}`,startsAt,endsAt,external:false,
        salleTheorieId:selected.salleId,lieuId:selected.lieuId,room:selected.libelle,
        reservationOwner:target.publishedEventId?`EVENT:${target.publishedEventId}`:`QV:2027:${id}`};
      const conflicts=coverage.reservationConflicts([booking,...pool]).filter(r=>r.leftId===booking.id || r.rightId===booking.id);
      return {id,date:startsAt.slice(0,10),startsAt,endsAt,roomId:selected.salleId,room:roomName,
        conflicts,available:conflicts.length===0,minimumGapMinutes:30,sourceCount:pool.length};
    };
    const targets=['QV27:PROJ:QV26-COURS-DE-CADRES-EXERCICE-DPS-DAP-1-8AF88C67:2027-03-31:1900:Y1-Y2-Y3-Y4',
      'QV27:PROJ:QV26-COURS-DE-CADRES-EXERCICE-DPS-DAP-2-RECONNAISSANCE-LI-94E8317E:2027-06-22:1900:Y1-Y2-Y3-Y4',
      'QV26-FORMATION-CADRES-DAP-2B042598:O2:S1','QV26-GROUPE-DE-TRAVAIL-JSP-2A45EC4E:O6:S1',
      'qv-source-861','qv-source-864','qv-source-866','qv-source-866','qv-source-868','qv-source-879','qv-source-905','qv-source-918'];
    const conflicts=sourceProof.roomConflicts.map((pair,index)=>{
      const id=targets[index],left=id===pair.leftId;
      return {pair:index+1,...pair,items:evidence([pair.leftId,pair.rightId]),
        roomProposal:roomTrial(id,left?pair.leftStartsAt:pair.rightStartsAt,left?pair.leftEndsAt:pair.rightEndsAt,
          index===8?'Backdraft':[6,7].includes(index)?'Flashover':'Oxygène'),
        oxygenTrial:roomTrial(id,left?pair.leftStartsAt:pair.rightStartsAt,left?pair.leftEndsAt:pair.rightEndsAt,'Oxygène')};
    });
    // These are independent dry runs, not stored reservations or approved moves.
    for(const item of conflicts) if(item.date!=='2027-02-16') assert.equal(item.roomProposal.available,true,`pair ${item.pair}`);
    const rules={};for(const rule of qv.rules){const key=rule.cibleCode?`${rule.domain}:${rule.cibleCode}`:rule.domain;(rules[key] ||= []).push(rule);}
    const dates=[['qv-source-918','2027-02-17'],['QV27:PROJ:QV26-SEANCE-DIRECTION-JSP-32B2ACA4:2027-06-22:1830:Caserne-G1','2027-06-23']];
    const jsp=dates.map(([id,date])=>{
      const row=rows.find(r=>r.id===id);assert.ok(row);
      const proposal={...row,startsAt:`${date}T18:30`,endsAt:`${date}T20:30`};
      const assessment=coverage.classifyCandidateDate(date,coverage.dayPolicyForActivity('JSP',row,rules,date),qv.calendarDays);
      assert.equal(assessment.dayClass,'AUTORISE');
      const availability=roomTrial(id,proposal.startsAt,proposal.endsAt,'État-major');assert.ok(availability.available);
      const personnel=coverage.personnelConflicts([proposal,...rows.filter(r=>r.id!==id && logic.qvProgrammeIsActive(r))])
        .filter(p=>p.leftId===id || p.rightId===id);assert.equal(personnel.length,0);
      const monthPeers=rows.filter(r=>r.id!==id && r.definitionId===row.definitionId && logic.qvProgrammeIsActive(r)
        && String(r.startsAt).slice(0,7)===date.slice(0,7));assert.equal(monthPeers.length,0);
      const dayActivities=rows.filter(r=>r.id!==id && logic.qvProgrammeIsActive(r) && String(r.startsAt).startsWith(date)).map(rowEvidence);
      return {id,date,time:'18:30–20:30',status:'PROPOSITION À VALIDER',assessment,availability,
        rule:'PLANIF-JSP',recurrence:'QV-PROJ-001 + monthly explicit session supersedes projection, same month preserved',
        monthPeers:[],personnelConflicts:personnel,dayActivities,
        limitations:['Fonctions démontrées uniquement, aucune affectation nominative inventée','Disponibilité à recontrôler lors de la saisie'],automaticMove:false};
    });
    const report=rows.find(r=>r.id==='qv-source-923');assert.equal(report.startsAt.slice(0,10),'2027-02-23');
    assert.equal(report.publishedEventDate,'2027-02-23');assert.equal(qv.programmeCycle.startDate,'2027-02-24');
    assert.equal(qv.programmeCycle.endDate,'2028-02-10');assert.equal(qv.programmeCycle.closingReport.provisional,true);
    const em=live.preparations.find(r=>r.source_ref==='qv-source-921'),revision=em.metadata.publicationRevision;
    assert.equal(revision.status,'PENDING');assert.equal(revision.baselineFields.date,'2027-02-24');
    assert.equal(em.metadata.planningFields.date,'2027-02-16');
    const publication=live.events.find(e=>e.evenement_id===revision.eventId);assert.equal(publication.date,'2027-02-24');
    const links=live.links.filter(l=>l.evenement_id===publication.evenement_id);assert.equal(links.length,1);
    assert.equal(links[0].publication_unit_id,'qv-source-921');
    const sources=history.rows.filter(r=>[214,215,454,455,867,868,152,43,453,864,918,456].includes(r.sourceLine));
    const Module=require('node:module'),{execFileSync}=require('node:child_process');
    const file=path.join(root,'netlify/lib/_scope-qv-programme-revisions.js'),previous=new Module(file,module);
    previous.filename=file;previous.paths=Module._nodeModulePaths(path.dirname(file));
    previous._compile(execFileSync('git',['show','a5cb32d:netlify/lib/_scope-qv-programme-revisions.js'],{cwd:root,encoding:'utf8'}),file);
    const options={actor:'recipe.p0',motif:'Simulation de révision ciblée, clone avec rollback uniquement.',expectedVersion:1};
    await assert.rejects(previous.exports.applyPublishedRevision({query},links[0],em.metadata.planningFields,revision.changedFields,options),
      error=>error.error==='programme_statcom_publie_immutable');
    await query('SAVEPOINT historical_date_end');
    const jspLink=live.links.find(l=>l.publication_unit_id==='qv-source-918');
    const jspFields={...live.preparations.find(r=>r.source_ref==='qv-source-918').metadata.planningFields,date:'2027-02-17'};
    await previous.exports.applyPublishedRevision({query},jspLink,jspFields,['date'],options);
    const oldDateEnd=(await query('select date::text,date_fin::text from scope_evenements where evenement_id=$1',[jspLink.evenement_id])).rows[0];
    assert.deepEqual(oldDateEnd,{date:'2027-02-17',date_fin:'2027-02-16'});
    await query('ROLLBACK TO SAVEPOINT historical_date_end');await query('RELEASE SAVEPOINT historical_date_end');
    const locked=(await query('select * from scope_evenements where evenement_id=$1',[publication.evenement_id])).rows[0];
    const rejections=[
      {fields:{...em.metadata.planningFields,statCom:'011PR'},link:links[0],changed:revision.changedFields},
      {fields:em.metadata.planningFields,link:{...links[0],source_definition_id:'OTHER'},changed:revision.changedFields},
      {fields:em.metadata.planningFields,link:links[0],changed:[...revision.changedFields,'statCom']},
      {fields:em.metadata.planningFields,link:links[0],changed:revision.changedFields,event:{...locked,statcom_code:'011PR'}},
      {fields:em.metadata.planningFields,link:links[0],changed:revision.changedFields,event:{...locked,code_source:'OTHER'}}
    ];
    for(const test of rejections) await assert.rejects(revisions.applyPublishedRevision({query:async sql=>{
      assert.match(sql,/for update/);return {rows:[test.event || locked]};}},test.link,test.fields,test.changed,options),
    error=>error.error==='programme_statcom_publie_immutable');
    await assert.rejects(revisions.applyPublishedRevision({query},links[0],em.metadata.planningFields,revision.changedFields,
      {...options,expectedVersion:99}),error=>error.error==='programme_publication_conflit');
    await query('SAVEPOINT targeted_revisions');
    const service=createScopeQuoVadisService({database});
    const body=(row,view,extra={})=>({...revisions.fieldsFromProgrammeRow(row,view),year:2027,
      status:row.status,publishedEventVersion:row.publishedEventVersion,motif:options.motif,...extra});
    let view=qv,jspRow=view.canonicalProgramme.rows.find(r=>r.id==='qv-source-918');
    const staged=await service.updateProgrammePreparation(jspRow.id,body(jspRow,view,{date:'2027-02-17',saveAction:'SAVE'}),{actor:options.actor});
    view=staged.quoVadis;jspRow=view.canonicalProgramme.rows.find(r=>r.id===jspRow.id);
    assert.equal(jspRow.publicationRevision.status,'PENDING');
    assert.equal((await query('select date::text from scope_evenements where evenement_id=$1',[jspLink.evenement_id])).rows[0].date,'2027-02-16');
    const approved=await service.updateProgrammePreparation(jspRow.id,body(jspRow,view,{saveAction:'VALIDATE',confirmPopulationImpact:true}),{actor:options.actor});
    view=approved.quoVadis;assert.equal(view.canonicalProgramme.rows.find(r=>r.id===jspRow.id).publicationRevision.status,'APPROVED');
    const emRow=view.canonicalProgramme.rows.find(r=>r.id==='qv-source-921');
    const emApproved=await service.updateProgrammePreparation(emRow.id,body(emRow,view,{saveAction:'VALIDATE',confirmPopulationImpact:true}),{actor:options.actor});
    assert.equal(emApproved.quoVadis.canonicalProgramme.rows.find(r=>r.id===emRow.id).publicationRevision.status,'APPROVED');
    const expectedDates=new Map([[jspLink.evenement_id,'2027-02-17'],[publication.evenement_id,'2027-02-16']]);
    const revisionProof=[];
    for(const [id,date] of expectedDates){
      const after=(await query('select to_jsonb(e) as data from scope_evenements e where evenement_id=$1',[id])).rows[0].data;
      const before=live.events.find(e=>e.evenement_id===id);
      assert.equal(after.date,date);assert.equal(after.date_fin,date);assert.equal(after.version,before.version+1);
      for(const key of ['evenement_id','statcom_code','code_cours','code_source','internal_event_id','publication_key']) assert.deepEqual(after[key],before[key],key);
      revisionProof.push({eventId:id,date:after.date,dateFin:after.date_fin,version:after.version,statComBefore:before.statcom_code,
        statComAfter:after.statcom_code,codeBefore:before.code_cours,codeAfter:after.code_cours});
    }
    const attendanceTables=protectedTables.filter(t=>!['scope_evenements','scope_journal_metier'].includes(t));
    const afterRevision=await hashes(query,attendanceTables);
    for(const name of attendanceTables) assert.deepEqual(afterRevision[name],protectedBefore[name],name);
    const revisionAudit=(await query("select action,commentaire from scope_journal_metier where entite_id=any($1::text[]) and commentaire=$2 order by at",
      [['qv-source-918','qv-source-921'],options.motif])).rows;
    assert.equal(revisionAudit.filter(r=>r.action==='VALIDER_REVISION_CIBLEE').length,2);
    await query('ROLLBACK TO SAVEPOINT targeted_revisions');await query('RELEASE SAVEPOINT targeted_revisions');
    assert.deepEqual(await hashes(query,protectedTables),protectedBefore);
    const result={status:'PASS',scope:'Targeted finalisation and two proven revision defects only; no production data decision',
      productionReadAt:live.at,productionWrites:false,base:'a5cb32db73471e4a5bca50be4dee7bf98f41986c',
      sourcePairs:12,sourceDistinctItems:new Set(sourceProof.roomConflicts.flatMap(r=>[r.leftId,r.rightId])).size,
      rows:rows.length,originalRowsRetained:old.length,comparedRows:reference.canonicalProgramme.rows.length,
      statComIdenticalPercent:100,invariants:fields,protectedTables,
      reservations:pool.length,otherCycleReservations:pool.filter(r=>r.sourceYear && r.sourceYear!==2027).length,
      currentHumanAdditions:supplement.newPreparations.map(r=>r.source_ref),
      currentHumanUpdate:live.preparations.filter(r=>{const old=original.preparations.find(o=>o.source_ref===r.source_ref);
        return old && JSON.stringify(r.metadata)!==JSON.stringify(old.metadata);}).map(r=>r.source_ref),
      conflicts,jsp,sources,report:rowEvidence(report),cycle:qv.programmeCycle,
      targetedRevision:{before:{emError:'programme_statcom_publie_immutable',jspDateEnd:oldDateEnd},
        after:revisionProof,negativeCases:rejections.length+1,workflow:'PENDING then explicit approval on same event',
        audit:revisionAudit,protectedTablesIdentical:attendanceTables,simulationRolledBack:true},
      em:{item:evidence(['qv-source-921'])[0],revision,publication:Object.fromEntries(['evenement_id','date','date_fin','version','created_at','updated_at','statut','statcom_code','code_cours'].map(k=>[k,publication[k]])),
        links:links.map(l=>({publicationUnitId:l.publication_unit_id,sourceDefinitionId:l.source_definition_id,
          sourceOccurrenceId:l.source_occurrence_id,sourceSessionId:l.source_session_id,sourceRecordIds:l.source_record_ids})),
        audit:live.audit.filter(r=>r.entite_id==='qv-source-921').map(r=>({action:r.action,at:r.at,motif:r.commentaire})),
        counts:live.eventCounts.find(r=>r.evenement_id===publication.evenement_id),automaticMove:false},
      existingEvidenceReused:['clone-results.json','browser/recipe.json','browser/postgres-integrity.json','pdf/manifest.json','delivery-gate.json'],
      rollbackTables:tables.length};
    await query('ROLLBACK');open=false;assert.deepEqual(await hashes(query,tables),before);result.rollbackVerified=true;
    fs.writeFileSync(path.join(dir,'finalisation-results.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({status:result.status,rows:result.rows,pairs:result.sourcePairs,distinctItems:result.sourceDistinctItems,
      bookings:pool.length,roomTrials:conflicts.map(r=>({pair:r.pair,available:r.roomProposal.available})),
      jsp:jsp.map(r=>({date:r.date,roomAvailable:r.availability.available,day:r.assessment.dayClass})),rollbackTables:tables.length}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
