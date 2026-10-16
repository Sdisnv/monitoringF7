'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const L=require('../assets/js/scope-ui-logic');
const E=require('../netlify/lib/_scope-public-engine');
const A=require('../netlify/lib/_scope-assignment-constraints');
const C=require('../netlify/lib/_scope-quo-vadis-consolidation');
const R=require('../netlify/lib/_scope-qv-programme-revisions');
const P=require('../netlify/lib/_scope-participation-catalogue');
const Cycle=require('../netlify/lib/_scope-cycle-rules');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const date='2027-03-10';
const params=profile=>({profile,includeCandidates:!['TP9_1','TP9_2'].includes(profile),responsibleRequired:false});
const row=(more={})=>({id:'fixture-occurrence',definitionId:'fixture-type',oiSelections:['DPS:G1'],publics:[],status:'PROPOSE',startsAt:date+'T19:00',endsAt:date+'T21:00',...more});
const facts=(expression,more={})=>({ruleVersion:{expression},evaluationDate:date,persons:[{id:'fixture-person-a'},{id:'fixture-person-b'}],...more});
const fact=(more={})=>({personneId:'fixture-person-a',validFrom:'2027-01-01',status:'CONFIRMED',...more});
const evalFunction=(more={})=>({predicate:'HAS_PERSON_FUNCTION',functionCodes:['ENC:C-SECTION'],domainCode:'DAP',oiCodes:['Y1'],...more});
const ev=(id,day='2027-03-10',start='19:00',end='21:00')=>({evenement_id:id,date:day,heure_debut:start,heure_fin:end,statut:'PLANIFIE'});
const review=(more={})=>A.prepareAssignmentReview({programmeRow:row({assignmentParameters:params('GENERAL')}),eligiblePersonIds:['fixture-person-a'],requiredPersonIds:[],sessions:[],...more});

test('same function identities across domains; OI-qualified display and dates, no individual inferred',()=>{
 const defs=L.qvProgrammeFunctionDefinitions();assert.equal(new Set(defs.map(item=>item.code)).size,4);
 assert.deepEqual(defs.find(item=>item.code==='C site').domains.JSP,['G1','C1','B1']);
 assert.equal(defs.find(item=>item.code==='C JSP').reportsTo,'CMDT:C-FOR');
 const context=L.qvProgrammeFunctionContext(row({oiSelections:['DAP:Y1']}));
 assert.deepEqual(context.functions.find(item=>item.code==='C site').applicableOiCodes,[]);
 assert.deepEqual(context.functions.find(item=>item.code==='ENC:C-SECTION').applicableOiCodes,['DAP:Y1']);
 assert.equal(context.responsibleAssignsAutomatically,false);
});
test('free and referenced historical function labels remain raw and have a shared display choice',()=>{
 const catalogue=L.qvProgrammePublicDisplayCatalogue().flatMap(group=>group.items);
 for(const [code,label] of [['C site','Chef site'],['C JSP','Chef JSP'],['ENC:C-SECTION','Chef section']])
   assert.equal(catalogue.filter(item=>item[0]===code && item[1]===label).length,1);
 assert.equal(L.qvProgrammePublicReferenceCode('C site JSP'),'C site');
 const input=row({publics:['CMDT:CHEF-SECTION-DAP'],publicFreeLabels:['Resp matériel ']}),before=JSON.stringify(input);
 L.qvProgrammeFunctionContext(input);L.qvProgrammeAssignmentProfile(input);assert.equal(JSON.stringify(input),before);
});
test('common function rule requires explicit domain, rejects another OI/domain, malformed context',()=>{
 assert.equal(E.validatePublicRule({...evalFunction(),domainCode:undefined}).valid,false);
 assert.equal(E.validatePublicRule(evalFunction({domainCode:'JSP'})).valid,false);
 assert.equal(E.validatePublicRule(evalFunction({oiCodes:['G1']})).valid,false);
 assert.equal(E.validatePublicRule(evalFunction({siteCode:'unknown'})).valid,false);
 assert.equal(E.validatePublicRule(evalFunction({sectionCodes:['']})).valid,false);
});
test('same dated function fact must match domain, OI, section and site; no cross-context join',()=>{
 const expression=evalFunction({sectionCodes:['Y1'],siteCode:'Y1'});
 const good=fact({functionCode:'ENC:C-SECTION',domainCode:'DAP',oiCode:'Y1',siteCode:'Y1',sectionCode:'Y1'});
 const run=functions=>E.evaluatePublicRule(facts(expression,{functions}));
 assert.deepEqual(run([good]).personIds,['fixture-person-a']);
 assert.deepEqual(run([fact({function_code:'ENC:C-SECTION',domaine_code:'DAP',oi_code:'Y1',site_code:'Y1',section_code:'Y1'})]).personIds,['fixture-person-a']);
 for(const changed of [{domainCode:'DPS'},{oiCode:'Y2'},{sectionCode:'Y2'},{siteCode:'Y2'},{validFrom:'2027-03-11'},{validTo:'2027-03-09'},{validFrom:null},{status:'DRAFT'}])
  assert.deepEqual(run([{...good,...changed}]).personIds,[]);
 const missing=E.evaluatePublicRule(facts(expression));assert.equal(missing.complete,false);assert.ok(missing.warnings.includes('MISSING_INPUT_FUNCTIONS'));
});
test('Chef JSP additionally requires a confirmed dated Chef site in a JSP OI',()=>{
 const expression=evalFunction({functionCodes:['C JSP'],domainCode:'JSP',oiCodes:['G1']});
 const chief=fact({functionCode:'C JSP',domainCode:'JSP',oiCode:'G1'});
 assert.deepEqual(E.evaluatePublicRule(facts(expression,{functions:[chief]})).personIds,[]);
 assert.deepEqual(E.evaluatePublicRule(facts(expression,{functions:[chief,fact({functionCode:'C site',domainCode:'JSP',oiCode:'C1'})]})).personIds,['fixture-person-a']);
 assert.deepEqual(E.evaluatePublicRule(facts(expression,{functions:[chief,fact({functionCode:'C site',domainCode:'DPS',oiCode:'G1'})]})).personIds,[]);
});
test('Chef DAP requires Chef section in DAP, not a same-person DPS section',()=>{
 const expression=evalFunction({functionCodes:['C DAP']});const chief=fact({functionCode:'C DAP',domainCode:'DAP',oiCode:'Y1'});
 const run=domain=>E.evaluatePublicRule(facts(expression,{functions:[chief,fact({functionCode:'ENC:C-SECTION',domainCode:domain,oiCode:domain==='DAP'?'Y2':'G1',sectionCode:'N01'})]}));
 assert.deepEqual(run('DPS').personIds,[]);assert.deepEqual(run('DAP').personIds,['fixture-person-a']);
});
test('historical public normalization/fingerprint and evidence unchanged when optional semantics absent',()=>{
 const historical={predicate:'HAS_PERSON_FUNCTION',functionCodes:['DPS_CHEF_SECTION']};
 const baseSource=cp.execFileSync('git',['show','b6054b9:netlify/lib/_scope-public-engine.js'],{encoding:'utf8'});
 // Load the old implementation in this same directory without writing or calling any service.
 const Module=require('node:module'),m=new Module(__filename);m.filename=require.resolve('../netlify/lib/_scope-public-engine');m.paths=module.paths;m._compile(baseSource,m.filename);
 assert.equal(E.fingerprintPublicRule(historical),m.exports.fingerprintPublicRule(historical));
 const input=facts(historical,{functions:[fact({functionCode:'DPS_CHEF_SECTION'})]});
 assert.deepEqual(E.evaluatePublicRule(input),m.exports.evaluatePublicRule(input));
});
test('candidate inclusion is explicit, dated and confirmed; it does not synthesize a qualification',()=>{
 const expression={predicate:'HAS_COMPETENCE',competenceCodes:['COND_PL'],includeCandidates:true};
 const candidature=fact({qualificationCode:'COND_PL'}),input=facts(expression,{competencies:[],candidatures:[candidature]});const before=JSON.stringify(input);
 assert.deepEqual(E.evaluatePublicRule(input).personIds,['fixture-person-a']);assert.equal(input.competencies.length,0);assert.equal(JSON.stringify(input),before);
 assert.deepEqual(E.evaluatePublicRule({...input,ruleVersion:{expression:{predicate:'HAS_COMPETENCE',competenceCodes:['COND_PL']}}}).personIds,[]);
 for(const changed of [{status:'DRAFT'},{validFrom:null},{validTo:'2027-03-09'}]) assert.deepEqual(E.evaluatePublicRule({...input,candidatures:[{...candidature,...changed}]}).personIds,[]);
 assert.equal(E.evaluatePublicRule(facts(expression,{competencies:[]})).complete,false);
});
test('CAR/TRUCK recognize exact definitions, TP9 1.x/2.x require valid drivers; no title-only inference',()=>{
 assert.equal(L.qvProgrammeAssignmentProfile(row({definitionId:'QV26-EXERCICE-CAR-1-1-B757E011'})).qualification,'COND_VL');
 assert.equal(L.qvProgrammeAssignmentProfile(row({definitionId:'QV26-EXERCICE-TRUCK-1-1-202AC9BA'})).includeCandidates,true);
 const first=L.qvProgrammeAssignmentProfile(row({definitionId:'QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-1-47FCC17A'}));
 assert.equal(first.profile,'TP9_1');assert.equal(first.maxParticipants,2);assert.equal(first.includeCandidates,false);
 const second=L.qvProgrammeAssignmentProfile(row({definitionId:'QV26-CONDUITE-TP9000-FORMATION-CONTINUE-2-1-695292DE'}));
 assert.equal(second.profile,'TP9_2');assert.equal(second.includeCandidates,false);assert.deepEqual(second.requiredPublicCodes,['AUTO:2']);
 assert.equal(L.qvProgrammeAssignmentType(row({label:'Exercice CAR 1.1'})),'');
 assert.throws(()=>L.qvProgrammeAssignmentParameters({...params('TP9_1'),includeCandidates:true}));
 assert.throws(()=>L.qvProgrammeAssignmentParametersForRow(params('TRUCK'),row({definitionId:'QV26-EXERCICE-CAR-1-1-B757E011'})));
});
test('responsibility is opt-in under an identified rule; absent fields keep existing snapshots identical',()=>{
 assert.throws(()=>L.qvProgrammeAssignmentParameters({...params('CAR'),responsibleRequired:true}));
 assert.equal(L.qvProgrammeAssignmentParameters({...params('CAR'),responsibleRequired:true,responsibleRule:'Règle MOA de cette activité'}).responsibleRequired,true);
 assert.deepEqual(C.businessSnapshot({statCom:'013Y1',publicCodes:['AUTO:3']}),{statCom:'013Y1',publicCodes:['AUTO:3']});
 const before={participationEvaluation:true},after={...before,assignmentParameters:L.qvProgrammeAssignmentParameters(params('CAR'))};
 assert.equal(R.revisionChanges(before,after).kind,'MAJOR');assert.ok(R.revisionChanges(before,after).changedFields.includes('assignmentParameters'));
 assert.deepEqual(C.businessSnapshot(after).assignmentParameters,after.assignmentParameters);
});
test('G1 capacities only, correct section/half-section; no general quota for other sites',()=>{
 for(const [site,publicCode,max] of [['G1','N01a',8],['G1','N01',16],['C1','N01',null],['B1','N01a',null],['B2','N01a',null]])
  assert.equal(L.qvProgrammeAssignmentProfile(row({oiSelections:['DPS:'+site],publics:[publicCode],assignmentParameters:params('INSTRUCTION_DPS')})).maxParticipants,max);
});
test('grouped DPS/DAP and PR 1–4 declare the MOA preparation contract without generating assignments',()=>{
 for(const [profile,count] of [['GROUP_DPS',6],['GROUP_DAP',2],['PR_1',6],['PR_2',6],['PR_3',6],['PR_4',6]]){
  const p=L.qvProgrammeAssignmentProfile(row({assignmentParameters:params(profile)}));assert.equal(p.sessionCount,count);assert.equal(p.assignmentWrites,false);
  if(profile.startsWith('PR_')){assert.equal(p.distinctSupervisors,6);assert.equal(p.maxParticipants,12);assert.equal(p.statisticalContributionsPerExercise,1);assert.equal(p.trainersAllSessions,true);}
 }
});
test('correction preview spans occurrences and sessions, preserves data and requires explicit revisions',()=>{
 const rows=[row({id:'one',businessValidation:{validatedAt:'2026-10-15'}}),row({id:'two',publishedEventId:'published-id'}),row({id:'cancelled',status:'ANNULE'})],before=JSON.stringify(rows);
 const proposals=L.qvProgrammeCorrectionProposals(rows,{definitionIds:['fixture-type'],values:{participationEvaluation:false,publicCodes:['AUTO:3','AUTO:CAND-VL']}});
 assert.equal(proposals.length,4);assert.ok(proposals.every(item=>item.applyAutomatically===false));
 assert.ok(proposals.some(item=>item.validationRequired==='REVISION_MOTIVEE'));assert.ok(proposals.some(item=>item.validationRequired==='REVALIDATION_MOA'));
 assert.equal(JSON.stringify(rows),before);assert.throws(()=>L.qvProgrammeCorrectionProposals(rows,{definitionIds:['fixture-type'],values:{statCom:'new'}}));
});
test('preparatory courses reject evaluation proposals, while non-evaluable events retain assignability and attendance',()=>{
 const course=row({definitionId:'QV26-COURS-DE-CADRES-EXERCICE-CAR-FB6A81CD',participationEvaluation:false});
 assert.equal(L.qvProgrammeIsPreparatory(course),true);
 assert.equal(L.qvProgrammeAssignmentParametersForRow(params('GENERAL'),course).profile,'GENERAL');
 const p=L.qvProgrammeCorrectionProposals([course],{definitionIds:[course.definitionId],values:{participationEvaluation:true}});assert.equal(p[0].validationRequired,'INTERDIT');
 assert.equal(P.participationEvaluation({participationEvaluation:false}),false);
 const reviewInput={programmeRow:row({participationEvaluation:false,assignmentParameters:params('GENERAL')}),eligiblePersonIds:['fixture-person-a'],requiredPersonIds:['fixture-person-a'],sessions:[{id:'s',event:ev('e'),nominations:[{personneId:'fixture-person-a',statut:'DISPENSE'}]}]};
 const before=JSON.stringify(reviewInput);const result=A.prepareAssignmentReview(reviewInput);assert.equal(result.sessions[0].exemptions,1);assert.equal(JSON.stringify(reviewInput),before);assert.ok(!result.issues.some(item=>item.code==='PERSONNES_OBLIGATOIRES_ABSENTES'));
});
test('auxiliary stays manually assigned and non-contributive with no deletion of attendance',()=>{
 const input={sessions:[{id:'s',event:ev('e'),nominations:[{personneId:'fixture-auxiliary',role:'AUXILIAIRE',statut:'PRESENT',manual:false}]}]};
 const result=review(input);assert.equal(result.sessions[0].participants,0);assert.equal(result.sessions[0].auxiliaries,1);assert.ok(result.issues.some(item=>item.code==='AUXILIAIRE_MANUEL'));
 assert.equal(Cycle.isIndividualActivityContribution({role:'AUXILIAIRE',statut:'PRESENT'}),false);
});
test('assignment review identifies non-concerned persons, mandatory absences, collisions and incomplete facts',()=>{
 const input={requiredPersonIds:['fixture-person-a'],sessions:[{id:'s',event:ev('e'),nominations:[{personneId:'fixture-person-b'}]}],
  otherEvents:[ev('other')],attendus:[{evenement_id:'other',personne_id:'fixture-person-b'}]};
 const r=review(input);for(const code of ['PERSONNE_NON_CONCERNEE','PERSONNES_OBLIGATOIRES_ABSENTES','PERSONNE_TEMPOREL']) assert.ok(r.issues.some(item=>item.code===code));
 assert.ok(r.notVerified.includes('DISPONIBILITES_INDIVIDUELLES'));assert.equal(r.assignmentWrites,false);
});
test('alternatives exclude full, unavailable, priority or non-movable sessions; no automatic move',()=>{
 const base={programmeRow:row({assignmentParameters:params('TP9_1')}),requiredPersonIds:['fixture-person-a'],
  sessions:[{id:'open',event:ev('open','2027-03-11'),nominations:[]},{id:'locked',event:ev('locked','2027-03-12'),nominations:[],nonMovable:true}],
  availability:[{personne_id:'fixture-person-a',date:'2027-03-11',heure_debut:'18:00',heure_fin:'22:00'}]};
 assert.deepEqual(review(base).alternatives,[]);
 const r=review({...base,availability:[]});assert.deepEqual(r.alternatives.map(item=>item.sessionId),['open']);assert.ok(r.alternatives[0].decisionRequired);
});
test('PR checks every session supervisor/prepose and all manually designated trainers; repeated supervisors rejected',()=>{
 const profile=row({assignmentParameters:params('PR_2')});
 const sessions=Array.from({length:6},(_,index)=>({id:'s'+index,event:ev('e'+index,'2027-03-'+String(index+10).padStart(2,'0')),nominations:[{personneId:'same-supervisor',role:'SURVEILLANT'}]}));
 const result=review({programmeRow:profile,sessions,trainerPersonIds:['fixture-trainer']});
 for(const code of ['SURVEILLANTS_DIFFERENTS','PREPOSE_APR_REQUIS_DANS_PUBLIC','FORMATEUR_TOUTES_SESSIONS']) assert.ok(result.issues.some(item=>item.code===code));
});
test('UI includes the same function choices and a read-only correction preview, escapes values, retains permissions',()=>{
 const {hooks}=createCatalogUiHarness();const source=row({definitionId:'QV26-EXERCICE-CAR-1-1-B757E011',assignmentParameters:params('CAR')});
 const qv={programme:{annee:2027},canonicalProgramme:{rows:[source]},lieux:[],sallesTheorie:[]};
 const html=hooks.renderQuoVadisProgrammeFicheHtml(qv,source.id);
 for(const text of ['qv-assignment-profile','qv-propose-type-corrections','Évaluer les participations','Chef site','Chef section']) assert.ok(html.includes(text),text);
 assert.ok(!hooks.qvAssignmentPreparationHtml(source,false).includes('<fieldset >'));
 const proposals=hooks.qvCorrectionProposalsHtml([{occurrenceId:'<script>',field:'family',current:'<img>',proposed:'DAP',rule:'test',impact:'test',validationRequired:'CONFIRMATION_MOA'}]);
 assert.ok(proposals.includes('&lt;script&gt;'));assert.ok(!proposals.includes('<script>'));assert.ok(proposals.includes('programme/%3Cscript%3E'));
});


test('PR capacity includes the Prepose APR and excludes the supervisor; auxiliary cannot fill the Prepose role',()=>{
 const ids=Array.from({length:13},(_,i)=>'fixture-papr-'+i);
 const make=(count,prepose=ids[0],extra=[])=>review({programmeRow:row({assignmentParameters:params('PR_1')}),
  eligiblePersonIds:ids,availability:[],sessions:[{id:'s',event:ev('e'),preposePersonId:prepose,
  nominations:[...ids.slice(0,count).map(personneId=>({personneId})),{personneId:'fixture-supervisor',role:'SURVEILLANT'},...extra]}]});
 const valid=make(12);assert.equal(valid.sessions[0].participants,12);
 assert.ok(!valid.issues.some(i=>['CAPACITE_SESSION','PREPOSE_APR_REQUIS_DANS_PUBLIC'].includes(i.code)));
 assert.ok(make(13).issues.some(i=>i.code==='CAPACITE_SESSION'));
 assert.ok(make(11,ids[12],[{personneId:ids[12],role:'AUXILIAIRE',manual:true}]).issues.some(i=>i.code==='PREPOSE_APR_REQUIS_DANS_PUBLIC'));
 assert.ok(make(12,'fixture-supervisor').issues.some(i=>i.code==='PREPOSE_APR_REQUIS_DANS_PUBLIC'));
});
test('server refuses evaluation/validation of a preparatory course before any write',async()=>{
 const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
 const calls=[];const database={query:async(sql)=>{calls.push(sql);if(sql.includes('from scope_quo_vadis_programmes'))return {rows:[{programme_id:'fixture-programme',annee:2027}]};
  if(sql.includes('from scope_quo_vadis_obligations'))return {rows:[]};throw new Error('STOP_AFTER_GUARD');}};
 const service=createScopeQuoVadisService({database}),source=row({definitionId:'QV26-COURS-DE-CADRES-EXERCICE-CAR-FB6A81CD',participationEvaluation:true});
 for(const body of [{participationEvaluation:true},{saveAction:'VALIDATE'}]){
  calls.length=0;await assert.rejects(()=>service.updateProgrammePreparation(source.id,body,{manualSource:source}),e=>e.error==='programme_preparation_non_evaluable');
  assert.equal(calls.length,2);assert.ok(calls.every(sql=>/^select /i.test(sql)));
 }
});


test('grouped evaluation covers every selected definition/session/site and blocks an incompatible profile',()=>{
 const canonical=require('../netlify/lib/data/scope-qv-programme-2027.json').rows;
 const ids=['QV26-EXERCICE-DPS-1-6A16603D','QV26-EXERCICE-DAP-1-9890D687'];
 const selected=canonical.filter(r=>ids.includes(r.definitionId)).map(r=>({...r,participationEvaluation:true}));
 const preview=L.qvProgrammeCorrectionProposals(selected,{definitionIds:ids,values:{participationEvaluation:false}});
 assert.equal(preview.length,selected.filter(r=>L.qvProgrammeIsActive(r) && r.status!=='ANNULE').length);assert.ok(preview.length>2);
 const incompatible=L.qvProgrammeCorrectionProposals([row({definitionId:'QV26-EXERCICE-CAR-1-1-B757E011'})],
  {definitionIds:['QV26-EXERCICE-CAR-1-1-B757E011'],values:{assignmentParameters:params('TRUCK')}});
 assert.equal(incompatible[0].validationRequired,'INTERDIT');
});
test('mandatory responsible participation requires an explicit activity rule and identified persons',()=>{
 const programmeRow=row({assignmentParameters:{...params('GENERAL'),responsibleRequired:true,responsibleRule:'Décision MOA spécifique'}});
 assert.ok(review({programmeRow}).notVerified.includes('RESPONSABLE_IDENTIFIE_PAR_REGLE'));
 assert.ok(review({programmeRow,responsiblePersonIds:['fixture-person-a']}).issues.some(i=>i.code==='PERSONNES_OBLIGATOIRES_ABSENTES'));
 assert.ok(!review({responsiblePersonIds:['fixture-person-a']}).issues.some(i=>i.code==='PERSONNES_OBLIGATOIRES_ABSENTES'));
});


test('persisted JSON key order creates neither a revision nor a correction proposal',()=>{
 const first=L.qvProgrammeAssignmentParameters(params('CAR'));
 const reordered=Object.fromEntries(Object.entries(first).reverse());
 assert.deepEqual(R.revisionChanges({assignmentParameters:reordered},{assignmentParameters:first}).changedFields,[]);
 assert.deepEqual(L.qvProgrammeCorrectionProposals([row({assignmentParameters:reordered})],{definitionIds:['fixture-type'],values:{assignmentParameters:first}}),[]);
 assert.ok(R.revisionChanges({assignmentParameters:first},{assignmentParameters:null}).changedFields.includes('assignmentParameters'));
});
