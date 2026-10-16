'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),Module=require('node:module');
const L=require('../assets/js/scope-ui-logic'),R=require('../assets/js/scope-personnel-referentials');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const base='0cb698e3c8dd7cf5d1bccf1ca4d091060d86dbe5',TP9='QV26-CONDUITE-TP9000-FORMATION-CONTINUE-1-0-E4E9FC21',PREP='QV26-COURS-DE-CADRES-EXERCICE-TRUCK-220DF695';
function previous(file){const m=new Module(__filename);m.filename=require.resolve('../'+file);m.paths=module.paths;m._compile(cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8'}),m.filename);return m.exports;}
const oldR=previous('assets/js/scope-personnel-referentials.js'),oldL=previous('assets/js/scope-ui-logic.js');
const row=extra=>({id:'fixture-tp9',definitionId:TP9,label:'Conduite TP9000, formation continue 1.0',domain:'AUTO',family:'Formation',
 startsAt:'2027-03-10T19:00:00',endsAt:'2027-03-10T21:00:00',status:'PROPOSE',oiSelections:['DPS:G1'],publics:['AUTO:2'],participationEvaluation:true,...extra});
const witness=row({id:'fixture-jsp',definitionId:'fixture-jsp-type',code:'010JSP.006',statCom:null,label:'Séance Direction JSP',
 startsAt:'2027-02-18T18:30:00',endsAt:'2027-02-18T20:30:00',family:'JSP',domain:'F7',oiSelections:['JSP:G1','JSP:C1','JSP:B1'],responsible:'C JSP',
 publics:['CMDT:C-FOR','C site','Resp for JSP'],participationEvaluation:false,publishedEventId:'fixture-event',preparation:{id:'fixture-preparation',updatedAt:'2026-10-16T10:00:00Z'},
 assignmentParameters:{profile:'GENERAL',includeCandidates:true,responsibleRequired:false,responsibleRule:''},businessValidation:{valid:true},version:7,lineage:{source:'fixture-source'},history:[{action:'MOA_VALIDATION'}]});
const payload=rows=>({programme:{annee:2027,statut:'PREPARATION'},canonicalProgramme:{rows},rules:[],lieux:[],sallesTheorie:[],qualifications:[],responsableFonctions:[]});
const planRule={name:'Règle de planification confirmée',domain:'F7',code:'TECHNICAL-RULE-ID',dayPolicy:{MONDAY:'AUTORISE'},timePolicy:{usualStart:'19:00',usualEnd:'21:00'},durationMinutes:120,constraints:'Règle de planification confirmée.',derogationAllowed:false};

test('programme control route decodes source and year, without duplicate navigation',()=>{
 const r=L.parseHash('#/quo-vadis/controle-programme?annee=2028&modele=fixture%3Asource&mode=harmonisation');
 assert.equal(r.qvView,'controle-programme');assert.equal(r.qvAnnee,2028);assert.equal(r.qvModel,'fixture:source');
 const h=createCatalogUiHarness();const html=h.hooks.renderQuoVadisNav(payload([]));assert.equal((html.match(/>Contrôle du programme</g)||[]).length,1);
});
test('fiche contains one existing rule box/viewer and contextual link, without transverse or assignment form',()=>{
 const h=createCatalogUiHarness(),html=h.hooks.renderQuoVadisProgrammeFicheHtml(payload([witness]),witness.id);
 assert.equal((html.match(/class="qv-programme-reference qv-info-notice"/g)||[]).length,1);
 assert.equal((html.match(/id="qv-programme-full-rule"/g)||[]).length,1);
 for(const id of ['qv-assignment-profile','qv-assignment-preparation','qv-conformity-types','qv-harmonisation-source'])assert.ok(!html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('Harmoniser à partir de cette fiche'));assert.ok(html.includes('modele=fixture-jsp'));
 assert.ok(html.includes('Voir la règle complète'));assert.ok(!html.includes('TECHNICAL-RULE-ID'));
});
test('saved model prerequisite uses actual preparation identity or published link',()=>{
 assert.equal(L.qvProgrammeSavedModel(row()),false);assert.equal(L.qvProgrammeSavedModel(row({businessValidation:{valid:true}})),false);
 assert.equal(L.qvProgrammeSavedModel(witness),true);assert.equal(L.qvProgrammeSavedModel(row({preparation:{id:'fixture-saved'}})),true);
 const rows=[row({id:'fixture-model'}),row({id:'fixture-target'})];
 assert.throws(()=>L.qvProgrammeCorrectionProposals(rows,{mode:'HARMONISATION',definitionIds:[TP9],fields:['domain'],sourceOccurrenceId:'fixture-model'}),/fiche modèle/);
});
test('three information states distinguish partial information and real blocking/nonconformity',()=>{
 assert.equal(L.qvProgrammeInfoState({complete:true}).tone,'blue');assert.equal(L.qvProgrammeInfoState({complete:true,pending:true}).tone,'yellow');
 assert.equal(L.qvProgrammeInfoState({}).tone,'yellow');assert.equal(L.qvProgrammeInfoState({complete:true,blocking:true}).tone,'red');
 assert.equal(L.qvProgrammeInfoState({nonConformity:true}).tone,'red');
});
test('missing nominative rule does not invent annual block; business validation alone does not turn box blue',()=>{
 const h=createCatalogUiHarness(),unknown=row({definitionId:'fixture-unbound',publics:[],businessValidation:{valid:true}});
 const state=h.hooks.qvProgrammeRuleState(payload([unknown]),unknown);assert.equal(state.tone,'yellow');assert.equal(state.blocking.length,0);
 assert.match(state.message,/à elle seule/);
});
test('blue requires available complete rule information; explicit preparatory or planning block is red',()=>{
 const h=createCatalogUiHarness(),unknown=row({definitionId:'fixture-unbound',domain:'F7',publics:[]}),qv={...payload([unknown]),rules:[planRule]};
 assert.equal(h.hooks.qvProgrammeRuleState(qv,unknown).tone,'blue');
 const prep=row({definitionId:PREP,participationEvaluation:true});assert.equal(h.hooks.qvProgrammeRuleState(payload([prep]),prep).tone,'red');
 const blocked={...unknown,planningDayControl:{derogationAllowed:false}};assert.ok(h.hooks.qvProgrammeRuleState(qv,blocked).blocking.length);
});
test('documented TP9, PR and FOBA conditions reuse existing rules without duplicating date/OI/place',()=>{
 const conditions=L.qvProgrammeBusinessConditions(row()),text=conditions.map(v=>v.text).join(' ');
 assert.match(text,/TP9 qualifiés/);assert.match(text,/Maximum 2/);assert.ok(!text.includes('2027-03-10') && !text.includes('DPS:G1'));
 const pr=L.qvProgrammeBusinessConditions(row({definitionId:'QV26-EXERCICE-PR-2-1-45588F47'})).map(v=>v.text).join(' ');
 assert.match(pr,/six surveillants/);assert.match(pr,/douze PAPR/);assert.match(pr,/Une seule contribution/);
 assert.match(L.qvProgrammeBusinessConditions(row({definitionId:'QV26-INTRODUCTION-PIONNIER-999BBC8C'})).map(v=>v.text).join(' '),/FOBA 3/);
});
test('full existing viewer remains human-readable without internal rule identifiers',()=>{
 const h=createCatalogUiHarness(),target={...witness,assignmentParameters:null};const qv={...payload([target]),rules:[planRule]};
 const html=h.hooks.qvProgrammeRuleNotice(qv,target);assert.ok(html.includes('Lundi : Autorisé'));assert.ok(!html.includes('TECHNICAL-RULE-ID'));
 assert.ok(!html.includes('MONDAY') && !html.includes('AUTORISE'));
});
test('type summary counts distinct occurrences separately from criteria, never inventing full conformity',()=>{
 const rows=Array.from({length:4},(_,i)=>row({id:'fixture-tp9-'+i}));const results=L.qvProgrammeCorrectionProposals(rows,{definitionIds:[TP9]});
 const group=L.qvProgrammeReviewSummaries(results,rows)[0];assert.equal(group.occurrenceCount,4);assert.equal(group.criteria,24);
 assert.equal(group.conform,4);assert.equal(group.pending,4);assert.equal(group.undefined,16);assert.equal(group.blocking,0);
 assert.equal(group.conform+group.pending+group.undefined+group.blocking,group.criteria);
});
test('existing explicit preparatory block contributes an explainable criterion; exceptions do not',()=>{
 const target=row({definitionId:PREP,participationEvaluation:false,preparationControls:[{blocking:true,status:'NON_CONFORME_CRITIQUE',message:'Cours après exercice.'},{blocking:true,exception:{approved:true},message:'Exception approuvée.'}]});
 const results=L.qvProgrammeCorrectionProposals([target],{definitionIds:[PREP]});assert.equal(results.filter(v=>v.field==='preparation').length,1);
 const group=L.qvProgrammeReviewSummaries(results,[target])[0];assert.equal(group.blocking,1);assert.equal(group.occurrenceCount,1);assert.equal(group.criteria,7);
});
test('same comparator and confirmed rules as main, with only new presentation metadata',()=>{
 const rows=[row(),witness],request={definitionIds:[TP9],fields:['publicCodes','participationEvaluation','assignmentParameters']};
 const strip=values=>values.map(({blocking,...value})=>value);assert.deepEqual(strip(L.qvProgrammeCorrectionProposals(rows,request)),oldL.qvProgrammeCorrectionProposals(rows,request));
 const harmonisation={mode:'HARMONISATION',definitionIds:[TP9],sourceOccurrenceId:witness.id,fields:['family','domain','participationEvaluation']};
 assert.deepEqual(strip(L.qvProgrammeCorrectionProposals(rows,harmonisation)),oldL.qvProgrammeCorrectionProposals(rows,harmonisation));
});
test('summary displays no detailed technical rows before deliberate expansion',()=>{
 const h=createCatalogUiHarness(),rows=[row()],results=L.qvProgrammeCorrectionProposals(rows,{definitionIds:[TP9]});
 const html=h.hooks.qvReviewResultsHtml(results,payload(rows));assert.ok(html.includes('Synthèse par type'));
 assert.ok(html.includes('data-qv-review-detail-content'));assert.ok(!html.includes('class="scope-table qv-review-table"'));
 assert.ok(!html.includes('fixture-tp9</a>'));assert.match(html,/un critère conforme ne signifie pas/);
});
test('replacement classification follows recognized parent levels with identical codes and grades',()=>{
 const pairs=[['ENC:REMPL-C-SITE','C site'],['ENC:REMPL-C-SECTION','ENC:C-SECTION'],['FOBA:REMPL-CHEF','C FOBA'],['PR:REMPL-CHEF','PR:C-PR'],['VPC:REMPL-RESP','Resp VPC'],['CMDT:REMPL-CDT','CMDT:CDT']];
 for(const [replacement,parent] of pairs){const a=R.institutionalReference(replacement),b=R.institutionalReference(parent);assert.equal(a.group,b.group);assert.equal(a.rank,b.rank);}
 assert.deepEqual(R.GRADES,oldR.GRADES);assert.deepEqual(R.INSTITUTIONAL_REFERENCES.map(r=>r.code),oldR.INSTITUTIONAL_REFERENCES.map(r=>r.code));
 for(const code of ['JSP:CHEF-FORMATION','Resp mat JSP'])assert.equal(R.institutionalReference(code).retired,true);
});
test('protected witness, stored parameters and complete inputs remain unchanged by notice/control rendering',()=>{
 const h=createCatalogUiHarness(),rows=[witness,row()],qv=payload(rows),before=JSON.stringify(qv);
 h.hooks.renderQuoVadisProgrammeFicheHtml(qv,witness.id);h.hooks.renderQuoVadisControlHtml(qv,{sourceId:witness.id});
 L.qvProgrammeCorrectionProposals(rows,{definitionIds:[TP9]});assert.equal(JSON.stringify(qv),before);
});

test('existing annual gate signals mandatory missing data in red without allocating global counts to types',()=>{
 const h=createCatalogUiHarness();assert.match(h.hooks.qvProgrammeAnnualNotice(payload([]),2027),/data-qv-tone="yellow"/);
 const html=h.hooks.qvProgrammeAnnualNotice({...payload([]),annualValidationControl:{blocking:true,issues:['Prérequis obligatoire absent.']}},2027);
 assert.match(html,/data-qv-tone="red"/);assert.match(html,/Prérequis obligatoire absent/);assert.match(html,/pas répartis artificiellement/);
});
