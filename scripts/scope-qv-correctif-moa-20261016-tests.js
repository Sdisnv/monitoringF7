'use strict';
// New regression cases only. Pure projections and a synthetic DOM; no database/network.
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../assets/js/scope-ui-logic'),R=require('../assets/js/scope-personnel-referentials');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const TP9='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21';
const PREP='QV26-COURS-DE-CADRES-EXERCICE-TRUCK-220DF695';
const row=extra=>({id:'fixture-tp9',definitionId:TP9,label:'Conduite TP9000, formation continue 1.0',domain:'AUTO',family:'Formation',
  startsAt:'2027-03-10T19:00:00',status:'PROPOSE',oiSelections:['DPS:G1'],publics:['AUTO:2'],participationEvaluation:true,...extra});
const witness=row({id:'fixture-jsp-witness',definitionId:'fixture-direction-jsp',label:'Séance Direction JSP',activityLabel:'Séance Direction JSP',
  code:'010JSP.006',statCom:null,startsAt:'2027-02-18T18:30:00',endsAt:'2027-02-18T20:30:00',domain:'F7',family:'JSP',
  oiSelections:['JSP:G1','JSP:C1','JSP:B1'],responsible:'C JSP',publics:['CMDT:C-FOR','C site','Resp for JSP'],participationEvaluation:false,
  businessValidation:{valid:true},publishedEventId:'fixture-linked-event',version:7,lineage:{source:'fixture-source'},history:[{action:'MOA_INDIVIDUAL_VALIDATION'}]});
const control=(rows,extra={})=>L.qvProgrammeCorrectionProposals(rows,{definitionIds:[TP9],...extra});
const harmonize=(rows,fields,extra={})=>control(rows,{mode:'HARMONISATION',sourceOccurrenceId:witness.id,fields,...extra});

test('JSP dictionary follows latest MOA decision, retains historical identity and common contexts',()=>{
 const display=L.qvProgrammePublicDisplayCatalogue().flatMap(g=>g.items);
 assert.ok(!display.some(([code])=>code==='JSP:CHEF-FORMATION'));
 assert.ok(L.qvProgrammePublicCatalogue().flatMap(g=>g.items).some(([code])=>code==='JSP:CHEF-FORMATION'));
 assert.equal(R.institutionalReference('Chef formation JSP').code,'JSP:CHEF-FORMATION');
 assert.equal(R.institutionalReference('Chef formation JSP').retired,true);
 assert.equal(R.institutionalReference('Resp formation').group,'Commandement et responsables');
 assert.equal(R.institutionalReference('Chef site JSP').code,'C site');
 assert.equal(R.institutionalReference('Chef site DPS').group,'Commandement et responsables');
 assert.deepEqual(L.qvProgrammeFunctionDefinitions().find(v=>v.code==='Resp for JSP').domains.JSP,['G1','C1','B1']);
 assert.equal(R.institutionalReference('Chef matériel JSP'),null);
 const Module=require('node:module'),cp=require('node:child_process'),previous=new Module(__filename);
 previous._compile(cp.execFileSync('git',['show','8a11b2e50ff47932628733b3dbc9715bfe6822b2:assets/js/scope-personnel-referentials.js'],{encoding:'utf8'}),__filename);
 assert.deepEqual(R.INSTITUTIONAL_REFERENCES.map(r=>r.code),previous.exports.INSTITUTIONAL_REFERENCES.map(r=>r.code));
 assert.deepEqual(R.GRADES,previous.exports.GRADES);
});
test('retired JSP selections are shown only when historical, without substitution',()=>{
 const h=createCatalogUiHarness();
 const qv={programme:{annee:2027},canonicalProgramme:{rows:[witness]},qualifications:[],responsableFonctions:[]};
 const fresh=h.hooks.renderQuoVadisProgrammeFicheHtml(qv,witness.id);
 assert.ok(!fresh.includes('value="JSP:CHEF-FORMATION"'));
 qv.canonicalProgramme.rows=[{...witness,publics:[...witness.publics,'JSP:CHEF-FORMATION']}];
 const historical=h.hooks.renderQuoVadisProgrammeFicheHtml(qv,witness.id);
 assert.ok(historical.includes('value="JSP:CHEF-FORMATION" checked'));
 assert.ok(historical.includes('Chef formation JSP'));
 assert.deepEqual(R.INSTITUTIONAL_GROUPS,['Commandement et responsables','Encadrement','Personnel et spécialisations']);
});
test('JSP source never supplies F7/JSP/Chief formation/false as TP9 conformity values',()=>{
 const targets=Array.from({length:4},(_,i)=>row({id:'fixture-tp9-'+i}));
 const result=control([witness,...targets]);assert.equal(new Set(result.map(v=>v.occurrenceId)).size,4);
 for(const field of ['domain','family','qualificationCodes','participationEvaluation']){
  assert.ok(result.filter(v=>v.field===field).every(v=>v.status==='REGLE_NON_DEFINIE' && v.proposed===undefined && !v.recommended));
 }
 assert.ok(result.filter(v=>v.field==='publicCodes').every(v=>v.status==='CONFORME' && v.proposed.includes('AUTO:2') && !v.proposed.includes('CMDT:C-FOR')));
 assert.throws(()=>control(targets,{values:{domain:'F7'}}),/fiche modèle explicite/);
});
test('unknown and title-only rules remain undefined, never become reference values',()=>{
 const unknown=row({definitionId:'fixture-unknown',label:'Exercice PR 1'});
 const result=control([unknown],{definitionIds:[unknown.definitionId]});
 assert.ok(result.every(v=>v.status==='REGLE_NON_DEFINIE' && v.proposed===undefined));
});
test('evaluation is bound to confirmed types across occurrences/sessions, never propagated from open row',()=>{
 const pr='QV26-EXERCICE-PR-2-1-45588F47';
 const rows=[witness,row({id:'fixture-pr-a',definitionId:pr,participationEvaluation:false}),row({id:'fixture-pr-b',definitionId:pr,participationEvaluation:true})];
 const result=control(rows,{definitionIds:[pr],fields:['participationEvaluation']});
 assert.deepEqual(result.map(v=>[v.status,v.proposed]),[['ECART_CONSTATE',true],['CONFORME',true]]);
 const prep=control([row({definitionId:PREP,participationEvaluation:true})],{definitionIds:[PREP],fields:['participationEvaluation']})[0];
 assert.equal(prep.proposed,false);assert.equal(prep.status,'ECART_CONSTATE');assert.match(prep.rule,/non évaluables/);
});
test('existing confirmed DPS/DAP exercise and group type bindings carry evaluation rule only',()=>{
 for(const definitionId of ['QV26-EXERCICE-DPS-1-6A16603D','QV26-EXERCICE-DAP-4-46753B3A','QV26-FORMATION-GROUPEE-1-1-3D8CCE58']){
  const result=control([row({definitionId,participationEvaluation:false})],{definitionIds:[definitionId],fields:['participationEvaluation']})[0];
  assert.equal(result.proposed,true);assert.equal(result.status,'ECART_CONSTATE');
 }
});
test('four conformity states and rule provenance are explicit',()=>{
 const records=control([row()],{});assert.ok(records.some(v=>v.status==='CONFORME'));
 assert.ok(records.some(v=>v.status==='REGLE_NON_DEFINIE'));
 assert.ok(records.some(v=>v.status==='A_ARBITRER'));
 const diff=control([row({publics:[]})],{fields:['publicCodes']})[0];assert.equal(diff.status,'ECART_CONSTATE');assert.ok(diff.recommended && diff.rule);
});
test('harmonisation requires explicit existing source, target types and fields',()=>{
 assert.throws(()=>harmonize([witness,row()],[],{}),/champ/);
 assert.throws(()=>harmonize([witness,row()],['domain'],{sourceOccurrenceId:undefined}),/fiche modèle/);
 assert.throws(()=>harmonize([witness,row()],['domain'],{definitionIds:[]}),/type/);
 assert.throws(()=>control([row()],{mode:'OTHER'}),/contrôle/);
});
test('JSP to AUTO harmonisation is incompatible and never a recommended correction',()=>{
 const result=harmonize([witness,row()],['domain','family','publicCodes','participationEvaluation']);
 assert.equal(result.length,4);
 assert.ok(result.every(v=>v.compatibility==='INCOMPATIBLE' && v.status==='A_ARBITRER' && v.validationRequired==='INTERDIT' && !v.recommended));
 assert.ok(result.every(v=>v.applyAutomatically===false));assert.equal(result.find(v=>v.field==='participationEvaluation').sourceValue,false);
});
test('undefined compatibility stays for arbitration; equivalent values produce no proposal',()=>{
 const source=row({id:'fixture-source',definitionId:'fixture-unbound',oiSelections:['DPS:G1'],domain:'F7'});
 const result=harmonize([source,row()],['domain'],{sourceOccurrenceId:source.id});
 assert.equal(result[0].compatibility,'A_ARBITRER');assert.equal(result[0].rule,'Règle métier non définie');
 assert.deepEqual(harmonize([source,row({domain:'F7'})],['domain'],{sourceOccurrenceId:source.id}),[]);
 const car=row({id:'fixture-car',definitionId:'QV26-EXERCICE-CAR-1-1-B757E011',family:'AUTO'});
 assert.equal(harmonize([car,row()],['family'],{sourceOccurrenceId:car.id})[0].compatibility,'A_ARBITRER','Different profile alone does not prove an incompatibility for an unrelated field');
});
test('harmonisation respects preparatory prohibition and legacy families',()=>{
 const source=row({id:'fixture-source',family:'Formation'}),target=row({id:'fixture-prep',definitionId:PREP,participationEvaluation:false});
 const evaluation=harmonize([source,target],['participationEvaluation'],{sourceOccurrenceId:source.id,definitionIds:[PREP]});
 assert.equal(evaluation[0].compatibility,'INCOMPATIBLE');
 const result=harmonize([source,{...target,family:'JSP'}],['family'],{sourceOccurrenceId:source.id,definitionIds:[PREP]});assert.equal(result[0].compatibility,'INCOMPATIBLE');
});
test('protected published witness, IDs, versions, codes and histories stay byte-identical; cancelled rows excluded',()=>{
 const rows=[witness,row(),row({id:'fixture-cancelled',status:'ANNULE'}),row({id:'fixture-inactive',active:false})],before=JSON.stringify(rows);
 control(rows);harmonize(rows,['domain','participationEvaluation']);
 assert.equal(JSON.stringify(rows),before);
 assert.ok(control(rows).every(v=>v.occurrenceId==='fixture-tp9'));
 const result=control([witness],{definitionIds:[witness.definitionId]});assert.ok(result.every(v=>v.validationRequired==='REVISION_MOTIVEE'));
});
test('existing comparator retains hierarchy, candidate adjacency and permutation-independent summaries',()=>{
 const groups=L.qvProgrammePublicDisplayCatalogue();
 for(const group of groups)for(let i=1;i<group.items.length;i++)assert.ok(R.compareInstitutional(group.items[i-1][0],group.items[i][0])<=0);
 const codes=['Resp for JSP','AUTO:CAND-TP9','CMDT:C-FOR','AUTO:2','C site'];
 assert.equal(L.qvFormatPublicDisplayLabels(codes),L.qvFormatPublicDisplayLabels(codes.slice().reverse()));
 assert.match(L.qvFormatPublicDisplayLabels(codes),/cond PL TP9, Candidat cond PL TP9/);
});
test('result presentation uses human labels, structured parameters and validation text without technical values',()=>{
 const h=createCatalogUiHarness(),records=control([row({publics:[],assignmentParameters:null})]);
 const html=h.hooks.qvCorrectionProposalsHtml(records);
 assert.ok(html.includes('Conduite TP9 — première formation continue'));
 assert.ok(html.includes('Confirmation MOA nécessaire'));
 for(const code of ['AUTO:2','CONFIRMATION_MOA','fixture-tp9</a>','TP9_1</dd>','{"profile"'])assert.ok(!html.includes(code),code);
 assert.ok(html.includes('Règle métier non définie'));
 assert.match(h.hooks.qvCorrectionProposalsHtml([]),/Aucune différence constatée/);
});
