'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),Module=require('node:module');
const L=require('../assets/js/scope-ui-logic'),{createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const BASE='ef679b06ce8faebb27911a86e0766b5eb4cd8b9d',TYPE='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21';
const previous=new Module(__filename);previous.filename=require.resolve('../assets/js/scope-ui-logic');previous.paths=module.paths;previous._compile(cp.execFileSync('git',['show',BASE+':assets/js/scope-ui-logic.js'],{encoding:'utf8'}),previous.filename);const old=previous.exports;
const row=extra=>({id:'fixture-model',definitionId:TYPE,label:'Conduite TP9',activityLabel:'Conduite TP9',startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',domain:'AUTO',family:'Formation',publics:['AUTO:2'],oiSelections:['DPS:G1'],participationEvaluation:true,preparation:{id:'fixture-prep'},assignmentParameters:{profile:'TP9_1',includeCandidates:false,responsibleRequired:false,responsibleRule:''},...extra});
const rows=()=>[row(),row({id:'fixture-a',domain:'F7'}),row({id:'fixture-b',domain:'F4'}),row({id:'fixture-cancelled',status:'ANNULE'}),row({id:'fixture-inactive',active:false}),row({id:'fixture-other',definitionId:'other'})];
const request=extra=>({mode:'HARMONISATION',sourceOccurrenceId:'fixture-model',definitionIds:[TYPE],fields:['domain','participationEvaluation','assignmentParameters'],...extra});
const payload=rows=>({programme:{annee:2027,statut:'PREPARATION'},canonicalProgramme:{rows},summary:{},rules:[],lieux:[],sallesTheorie:[],qualifications:[],responsableFonctions:[]});
test('default conformity and harmonisation retain exact merged-main results',()=>{
 for(const req of [{definitionIds:[TYPE]},request()])assert.deepEqual(L.qvProgrammeCorrectionProposals(rows(),req),old.qvProgrammeCorrectionProposals(rows(),req));
});
test('explicit occurrence selection narrows the existing comparator without broadening type or active scope',()=>{
 const data=rows(),req=request({occurrenceIds:['fixture-b','fixture-cancelled','fixture-inactive','fixture-other','fixture-model','missing']});
 assert.deepEqual(L.qvProgrammeCorrectionProposals(data,req),old.qvProgrammeCorrectionProposals(data,request()).filter(item=>item.occurrenceId==='fixture-b'));
 assert.deepEqual(L.qvProgrammeCorrectionProposals(data,request({occurrenceIds:[]})),[]);
});
test('single recipient never expands to every session; ID duplicates do not duplicate proposals',()=>{
 const req=request({occurrenceIds:['fixture-a','fixture-a']});assert.deepEqual(L.qvProgrammeCorrectionProposals(rows(),req).map(item=>item.occurrenceId),['fixture-a']);
});
test('source validation and mandatory explicit field/type guards retained',()=>{
 for(const req of [request({sourceOccurrenceId:'missing'}),request({fields:[]}),request({definitionIds:[]}),request({values:{domain:'F7'}})])assert.throws(()=>L.qvProgrammeCorrectionProposals(rows(),req));
});
test('confirmed TP9 rules dominate a cross-type saved model, with incompatible preview forbidden',()=>{
 const data=[row({id:'fixture-model',definitionId:'fixture-jsp',family:'JSP',oiSelections:['JSP:G1'],participationEvaluation:false,assignmentParameters:{profile:'GENERAL',includeCandidates:true}}),row({id:'fixture-a'})];
 const r=L.qvProgrammeCorrectionProposals(data,request({occurrenceIds:['fixture-a'],fields:['participationEvaluation','assignmentParameters']}));
 assert.equal(r.length,2);assert.ok(r.every(item=>item.compatibility==='INCOMPATIBLE' && item.validationRequired==='INTERDIT' && !item.recommended && !item.applyAutomatically));
});
test('protected published JSP witness, versions, history, qualifications and programme stay byte-identical',()=>{
 const witness=row({id:'fixture-jsp',definitionId:'fixture-jsp',code:'010JSP.006',statCom:null,label:'Séance Direction JSP',startsAt:'2027-02-18T18:30:00',endsAt:'2027-02-18T20:30:00',family:'JSP',oiSelections:['JSP:G1','JSP:C1','JSP:B1'],publics:['CMDT:C-FOR','C site','Resp for JSP'],responsible:'C JSP',participationEvaluation:false,publishedEventId:'fixture-event',businessValidation:{valid:true},qualificationCodes:['fixture-historical'],history:[{action:'MOA_VALIDATION'}],version:7,lineage:{source:'fixture-lineage'}});
 const qv=payload([witness,...rows()]),before=JSON.stringify(qv),h=createCatalogUiHarness();
 h.hooks.renderQuoVadisControlHtml(qv,{sourceId:witness.id});h.hooks.renderQuoVadisProgrammeFicheHtml(qv,witness.id);L.qvProgrammeCorrectionProposals(qv.canonicalProgramme.rows,request({occurrenceIds:['fixture-a']}));
 assert.equal(JSON.stringify(qv),before);assert.equal(qv.programme.statut,'PREPARATION');
});
test('linked relation and annual summary adapters remain exactly those of main',()=>{
 const data=rows(),controls=[{exerciseIds:['fixture-model'],courseId:'fixture-other',blocking:true}];
 assert.deepEqual(L.qvProgrammeLinkedRows(data,data[0],controls),old.qvProgrammeLinkedRows(data,data[0],controls));
 const qv={...payload(data),preparationControls:controls,programmeCycle:{provisional:true}};assert.deepEqual(L.qvProgrammeAnnualReview(qv),old.qvProgrammeAnnualReview(qv));
});
test('linked presentation sorts complete real timestamps using existing numeric sort, preserving input',()=>{
 const data=[row({id:'fixture-current'}),row({id:'fixture-late',startsAt:'2027-11-01T19:00:00'}),row({id:'fixture-evening',startsAt:'2027-02-02T19:00:00'}),row({id:'fixture-afternoon',startsAt:'2027-02-02T18:00:00'})],before=JSON.stringify(data);
 const html=createCatalogUiHarness().hooks.qvProgrammeLinkedHtml(payload(data),data[0]);
 assert.ok(html.indexOf('/fixture-afternoon')<html.indexOf('/fixture-evening'));assert.ok(html.indexOf('/fixture-evening')<html.indexOf('/fixture-late'));assert.equal(JSON.stringify(data),before);
});
test('same-type model opens recipient chooser and only fields available, including boolean false',()=>{
 const h=createCatalogUiHarness(),data=[row({participationEvaluation:false,assignmentParameters:null}),row({id:'fixture-a'})],html=h.hooks.renderQuoVadisControlHtml(payload(data),{sourceId:'fixture-model'});
 assert.match(html,/data-qv-review-picker="targets"/);assert.match(html,/data-qv-harmonisation-field="participationEvaluation"/);assert.doesNotMatch(html,/data-qv-harmonisation-field="assignmentParameters"/);assert.doesNotMatch(html,/<select[^>]*multiple/);
 assert.match(html,/sélectionnez explicitement chaque destinataire/);
});
