'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),Module=require('node:module');
const L=require('../assets/js/scope-ui-logic'),{createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const base='fe4cfb96ad59732cb0a1eea08fd4e9124b91cf51',TP9='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21';
const previous=new Module(__filename);previous.filename=require.resolve('../assets/js/scope-ui-logic');previous.paths=module.paths;previous._compile(cp.execFileSync('git',['show',base+':assets/js/scope-ui-logic.js'],{encoding:'utf8'}),previous.filename);const old=previous.exports;
const row=extra=>({id:'fixture-1',definitionId:TP9,activityLabel:'Conduite TP9',label:'Conduite TP9',startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',oiSelections:['DPS:G1'],publics:['AUTO:2'],sessionLabel:'Session 1',preparation:{id:'fixture-saved'},...extra});
const qv=rows=>({programme:{annee:2027,statut:'PREPARATION'},summary:{},canonicalProgramme:{rows},rules:[],lieux:[],sallesTheorie:[],qualifications:[],responsableFonctions:[]});
const h=()=>createCatalogUiHarness();

test('same comparator, business profiles and type counters as merged PR32',()=>{
 const rows=[row(),row({id:'fixture-2',oiSelections:['DPS:C1']})];
 for(const request of [{definitionIds:[TP9]},{mode:'HARMONISATION',definitionIds:[TP9],sourceOccurrenceId:rows[0].id,fields:['domain','participationEvaluation','assignmentParameters']}])assert.deepEqual(L.qvProgrammeCorrectionProposals(rows,request),old.qvProgrammeCorrectionProposals(rows,request));
 assert.deepEqual(L.qvProgrammeAssignmentProfile(rows[0]),old.qvProgrammeAssignmentProfile(rows[0]));
});
test('navigation retains every existing target and places preparation together',()=>{
 const html=h().hooks.renderQuoVadisNav(qv([]));
 for(const name of ['Agenda annuel','Programme annuel','Synthèse 2027','Catalogue','Dates annoncées','Contrôle du programme','À arbitrer','Alertes','Cursus','Règles'])assert.ok(html.includes(name),name);
 assert.equal((html.match(/>Contrôle du programme</g)||[]).length,1);assert.ok(!html.includes('À traiter 2027'));
 assert.ok(html.indexOf('Préparation 2027')<html.indexOf('Contrôle du programme'));assert.ok(!html.includes('>Événements<'));
});
test('informative blue rule surface is separate from truthful yellow control alert',()=>{
 const html=h().hooks.qvProgrammeRuleNotice(qv([row()]),row());
 assert.match(html,/<section[^>]+data-qv-tone="blue"[^>]+aria-label="Règle du programme"/);
 assert.match(html,/<aside[^>]+data-qv-tone="yellow"[^>]+aria-label="Alerte de contrôle"/);
 assert.equal((html.match(/id="qv-programme-full-rule"/g)||[]).length,1);assert.ok(!html.includes('chevron'));assert.match(html,/Voir la règle complète/);
});
test('known blocking rule remains red alert with independent blue information',()=>{
 const r=row({preparationControls:[{blocking:true,message:'Préparation indispensable absente.'}]});
 const html=h().hooks.qvProgrammeRuleNotice(qv([r]),r);assert.match(html,/data-qv-tone="blue"/);assert.match(html,/data-qv-tone="red"/);assert.match(html,/Préparation indispensable absente/);
});
test('harmonisation is an existing secondary action in the top bar only',()=>{
 const html=h().hooks.renderQuoVadisProgrammeFicheHtml(qv([row()]),row().id);
 assert.ok(!html.includes('Harmoniser à partir de cette fiche'));assert.equal((html.match(/>Harmonisation<\/a>/g)||[]).length,1);
 assert.ok(html.indexOf('>Harmonisation</a>')<html.indexOf('Informations de l’événement'));assert.match(html,/mode=harmonisation/);
});
test('annual counts use supplied points and exact identities, with globals unallocated',()=>{
 const rows=[row(),row({id:'fixture-2'}),row({id:'fixture-course',definitionId:'fixture-course-type'})];
 const payload={...qv(rows),annualValidationControl:{blocking:true,issues:['PAPR module 1 : thème absent.','Prérequis global absent.'],modules:[{number:1,ids:['fixture-1']}]},
  preparationControls:[{blocking:true,status:'A_CONTROLER',exerciseIds:['fixture-1','fixture-2'],courseId:'fixture-course',message:'Préparation à contrôler.'},{blocking:false,status:'MOA_REQUIRED',exerciseId:'fixture-2',courseId:null,message:'Relation ambiguë.'},{blocking:true,status:'CONFORME',exception:{actor:'fixture'},message:'Décision conservée.'}],
  publicationReconciliation:{blocking:true,entries:[{blocking:true,itemId:'fixture-2',publishedItemIds:['missing-id'],status:'MOA_REQUIRED'}]},reservationConflicts:[{blocking:true,leftId:'fixture-1',rightId:'missing-id'}],programmeCycle:{provisional:true}};
 const before=JSON.stringify(payload),r=L.qvProgrammeAnnualReview(payload);assert.equal(r.blocking,6);assert.equal(r.pending,1);assert.equal(r.occurrenceCount,3);assert.equal(r.unlinked,2);assert.equal(r.checkedAt,null);
 assert.ok(r.items.every(item=>!item.occurrenceIds.includes('missing-id')));assert.equal(JSON.stringify(payload),before);
});
test('annual overview does not render every issue or guess missing timestamps',()=>{
 const html=h().hooks.qvProgrammeAnnualNotice({...qv([row()]),annualValidationControl:{blocking:true,issues:Array(60).fill('Confidential fixture detail.')}},2027);
 assert.match(html,/60 blocage/);assert.ok(!html.includes('Confidential fixture detail'));assert.ok(!html.includes('Dernier contrôle fourni'));assert.match(html,/Consulter les blocages/);
});
test('missing structured publication details remain a single global control',()=>{
 const r=L.qvProgrammeAnnualReview({...qv([row()]),publicationReconciliation:{blocking:true,entries:[]}});assert.equal(r.blocking,1);assert.equal(r.unlinked,1);assert.equal(r.occurrenceCount,0);
});
test('linked activities use shared definition and explicit preparation relation only',()=>{
 const current=row(),peer=row({id:'fixture-peer'}),course=row({id:'fixture-course',definitionId:'fixture-other'}),unrelated=row({id:'fixture-unrelated',definitionId:'different-but-same-label'});
 const rows=[current,peer,course,unrelated],before=JSON.stringify(rows),links=L.qvProgrammeLinkedRows(rows,current,[{exerciseIds:[current.id],courseId:course.id}]);
 assert.deepEqual(links.map(item=>item.row.id),[course.id,peer.id]);assert.ok(!links.some(item=>item.row.id===unrelated.id));assert.equal(JSON.stringify(rows),before);
 assert.match(L.qvProgrammeLinkedRows(rows,course,[{exerciseIds:[current.id],courseId:course.id}])[0].relations[0],/préparée/);
});
test('ambiguous course has no invented relationship; missing preparations remain visible separately',()=>{
 const current=row(),unrelated=row({id:'fixture-unrelated',definitionId:'other'}),links=L.qvProgrammeLinkedRows([current,unrelated],current,[{exerciseId:current.id,courseId:null,status:'MOA_REQUIRED'}]);assert.deepEqual(links,[]);
 const html=h().hooks.qvProgrammeLinkedHtml(qv([current,unrelated]),current);assert.match(html,/Aucune activité liée identifiée/);assert.match(html,/préparations manquantes/);
});
test('occurrence filters use real date/OI/session and classify criteria without whole-occurrence claim',()=>{
 const rows=[row(),row({id:'fixture-2',startsAt:'2027-04-17T19:00:00',oiSelections:['DPS:C1'],sessionLabel:'Session 2'})],results=L.qvProgrammeCorrectionProposals(rows,{definitionIds:[TP9]});
 const filtered=L.qvProgrammeFilterReview(results,rows,{from:'2027-04-01',to:'2027-04-30',oi:'DPS:C1',session:'Session 2',state:'undefined'});
 assert.equal(filtered.length,4);assert.ok(filtered.every(item=>item.occurrenceId==='fixture-2'));
 assert.equal(L.qvProgrammeReviewSummaries(filtered,rows)[0].occurrenceCount,1);assert.equal(L.qvProgrammeFilterReview(results,rows,{q:'absent'}).length,0);
});
test('initial result rendering contains only type summary, no occurrences or criteria',()=>{
 const harness=h(),rows=[row()],results=L.qvProgrammeCorrectionProposals(rows,{definitionIds:[TP9]});harness.hooks.renderQuoVadisControlHtml(qv(rows));
 const html=harness.hooks.qvReviewResultsHtml(results,qv(rows));assert.match(html,/Voir les occurrences/);assert.ok(!html.includes('Occurrences concernées — comptes de critères'));assert.ok(!html.includes('class="scope-table qv-review-table"'));
});
test('shared confirmation retains actions and semantic kind with explicit message tone',()=>{
 const harness=h();harness.hooks.state.feedback={kind:'confirm',tone:'error',title:'Décision requise',message:'Message',confirmText:'Confirmer',cancelText:'Annuler'};
 const html=harness.hooks.renderScopeFeedback();assert.match(html,/data-message-tone="error"/);assert.match(html,/id="scope-feedback-confirm"/);assert.match(html,/role="dialog"/);
});
test('protected published witness and existing payloads remain unchanged by all new presentation adapters',()=>{
 const witness=row({id:'fixture-jsp',definitionId:'fixture-jsp-type',code:'010JSP.006',activityLabel:'Séance Direction JSP',startsAt:'2027-02-18T18:30:00',endsAt:'2027-02-18T20:30:00',family:'JSP',oiSelections:['JSP:G1','JSP:C1','JSP:B1'],publics:['CMDT:C-FOR','C site','Resp for JSP'],responsible:'C JSP',participationEvaluation:false,publishedEventId:'fixture-event',businessValidation:{valid:true},assignmentParameters:{profile:'GENERAL',includeCandidates:true,responsibleRequired:false,responsibleRule:''},version:7,lineage:{source:'fixture-source'},history:[{action:'MOA_VALIDATION'}]});
 const payload=qv([witness,row()]),before=JSON.stringify(payload),harness=h();harness.hooks.renderQuoVadisProgrammeFicheHtml(payload,witness.id);harness.hooks.renderQuoVadisControlHtml(payload,{sourceId:witness.id});L.qvProgrammeAnnualReview(payload);L.qvProgrammeLinkedRows(payload.canonicalProgramme.rows,witness,[]);assert.equal(JSON.stringify(payload),before);
});

test('linked lists paginate using existing presentation and omit reconciled inactive aliases',()=>{
 const current=row(),rows=[current,...Array.from({length:60},(_,i)=>row({id:'fixture-peer-'+String(i).padStart(2,'0')})),row({id:'fixture-reconciled',programmeReconciliation:{status:'LINKED_TO_PUBLISHED_OCCURRENCE'}})];
 const links=L.qvProgrammeLinkedRows(rows,current,[]);assert.equal(links.length,60);assert.ok(!links.some(item=>item.row.id==='fixture-reconciled'));
 const html=h().hooks.qvProgrammeLinkedHtml(qv(rows),current);assert.equal((html.match(/>Consulter la fiche<\/a>/g)||[]).length,25);assert.match(html,/60 activité/);
});
test('annual module ambiguity retains all explicit references without fabricating a preferred link',()=>{
 const rows=[row(),row({id:'fixture-2'})],review=L.qvProgrammeAnnualReview({...qv(rows),annualValidationControl:{blocking:true,issues:['PAPR module 1 : doublon.'],modules:[{number:1,ids:rows.map(r=>r.id)}]}});
 assert.equal(review.blocking,1);assert.equal(review.occurrenceCount,2);assert.deepEqual(review.items[0].occurrenceIds,rows.map(r=>r.id));
});
