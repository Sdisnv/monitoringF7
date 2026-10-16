'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),Module=require('node:module');
const R=require('../assets/js/scope-personnel-referentials'),L=require('../assets/js/scope-ui-logic'),E=require('../netlify/lib/_scope-public-engine'),D=require('../assets/js/scope-personnel-display');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const base='02b034ab5e1d5065373b39b8fb43aa74740b7fa7',date='2027-03-10';
function previous(file){const m=new Module(__filename);m.filename=require.resolve('../'+file);m.paths=module.paths;
 if(file==='netlify/lib/_scope-qv-publication-plan.js')m.require=function(id){return id==='../../assets/js/scope-ui-logic'?oldL:Module.prototype.require.call(this,id);};
 m._compile(cp.execFileSync('git',['show',base+':'+file],{encoding:'utf8'}),m.filename);return m.exports;}
const oldL=previous('assets/js/scope-ui-logic.js'),oldR=previous('assets/js/scope-personnel-referentials.js'),oldE=previous('netlify/lib/_scope-public-engine.js');
const row=more=>({id:'fixture-occurrence',definitionId:'fixture-definition',label:'Activité témoin',domain:'F7',oiSelections:['DPS:G1'],publics:[],status:'PROPOSE',...more});
const fact=more=>({personneId:'fixture-a',validFrom:'2027-01-01',status:'CONFIRMED',...more});
const run=(expression,extra={})=>E.evaluatePublicRule({ruleVersion:{expression},evaluationDate:date,persons:[{id:'fixture-a'},{id:'fixture-b'}],...extra});
const fn=(functionCode,domainCode,oiCodes)=>({predicate:'HAS_PERSON_FUNCTION',functionCodes:[functionCode],domainCode,...(oiCodes?{oiCodes}:{})});
const foba=level=>({predicate:'HAS_FOBA_LEVEL',levelCodes:[String(level)],institutionalPopulation:true});
const incorporation=(domainCode='DPS',oiCode='G1')=>fact({domainCode,oiCode});

test('existing grade codes/aliases retained, institutional hierarchy and supplied JSP order',()=>{
 assert.deepEqual(new Set(R.GRADES.map(r=>r.code)),new Set(oldR.GRADES.map(r=>r.code)));
 for(const g of oldR.GRADES)assert.equal(R.canonicalGradeCode(g.libelle),g.code);
 assert.deepEqual(R.GRADES.slice(0,6).map(r=>r.libelle),['Civil','JSP','Flamme 1','Flamme 2','Flamme 3','Recrue']);
 const baseGrades=['Rec','Sap','App','Cpl','Sgt','Sgt chef','Sgtm','Four','Adj','Lt','Plt','Cap','Maj'];
 for(let i=1;i<baseGrades.length;i++)assert.ok(R.gradeRank(baseGrades[i])>R.gradeRank(baseGrades[i-1]));
 assert.ok(R.gradeRank('Of spéc')>R.gradeRank('Lt') && R.gradeRank('Of spéc')<R.gradeRank('Cap'));
 assert.equal(R.canonicalGradeCode('Lieutenant instructeur'),'Lt instr');assert.equal(R.canonicalGradeCode('Grade historique inconnu'),'Grade historique inconnu');
});
test('same catalogue, three groups, existing technical public codes retained and no duplicate display identity',()=>{
 const oldCodes=oldL.qvProgrammePublicCatalogue().flatMap(g=>g.items.map(i=>i[0])),codes=L.qvProgrammePublicCatalogue().flatMap(g=>g.items.map(i=>i[0]));
 for(const code of oldCodes)assert.ok(codes.includes(code),code);assert.equal(codes.length,new Set(codes).size);
 const groups=L.qvProgrammePublicDisplayCatalogue();assert.deepEqual(groups.map(g=>g.group),R.INSTITUTIONAL_GROUPS);
 const all=groups.flatMap(g=>g.items.map(i=>i[0]));assert.equal(new Set(all).size,all.length);
 assert.equal(all.filter(c=>c==='ENC:C-SECTION').length,1);assert.equal(all.filter(c=>c==='C site').length,1);
 assert.equal(R.INSTITUTIONAL_REFERENCES.filter(r=>r.kind==='FUNCTION' && /a[.]?i[.]?/i.test(r.label) && /interim/i.test(r.label)).length,0);
});
test('hierarchy then alphabetic order, candidate directly follows target in every group',()=>{
 const groups=L.qvProgrammePublicDisplayCatalogue();
 for(const group of groups){
  for(let i=1;i<group.items.length;i++)assert.ok(L.qvInstitutionalCompare(group.items[i-1][0],group.items[i][0])<=0);
  for(const candidate of R.INSTITUTIONAL_REFERENCES.filter(r=>r.candidateOf)){
   const index=group.items.findIndex(([code])=>code===candidate.code);
   if(index>=0)assert.equal(group.items[index-1][0],candidate.candidateOf);
  }
 }
 const groupFor=code=>groups.find(g=>g.items.some(([c])=>c===code)).group;
 for(const code of ['ENC:C-SECTION','ENC:CADRE-FOBA','JSP:MONITEUR','JSP:AIDE-MONITEUR','PR:FORMATEUR-PR','AUTO:MONITEUR-CONDUITE','FOBA:REMPL-CHEF'])assert.equal(groupFor(code),'Encadrement');
});
test('same order for every selection permutation, echelon contraction and historic raw values unmodified',()=>{
 const values=['AUTO:CAND-TP9','FOBA:1','ECH:III','CMDT:CDT','ECH:0','AUTO:2'];const expected=L.qvFormatPublicDisplayLabels(values);
 assert.equal(expected,'Commandant, Échelon 0 et III, FOBA 1, cond PL TP9, Candidat cond PL TP9');
 for(let i=0;i<values.length;i++)assert.equal(L.qvFormatPublicDisplayLabels([...values.slice(i),...values.slice(0,i)]),expected);
 assert.equal(L.qvFormatPublicDisplayLabels(values.reverse()),expected);
 assert.equal(L.qvFormatPublicDisplayLabels(['ECH:III','ECH:I','ECH:0','ECH:II']),'Échelon 0 à III');
 const raw={publics:['CMDT:CHEF-SECTION-DAP','AUTO:CAND-TP9'],publicFreeLabels:['Chef site JSP','Resp matériel ']},before=JSON.stringify(raw);
 L.qvFormatPublicDisplayLabels(raw.publics,raw.publicFreeLabels);assert.equal(JSON.stringify(raw),before);
});
test('all OS1.06 abbreviations plus the two explicit MOA complements, IndeX correspondences',()=>{
 const entries={'PR:2':'PAPR','PR:3':'PABC','AUTO:3':'cond VL','AUTO:1':'cond PL','AUTO:2':'cond PL TP9','AUTO:5':'MEA','AUTO:6':'pil bat',
  'CARISTE':'cariste','AUTO:ELEVATEUR-TIMON':'OP élévateur à timon','AUTO:PONTIER':'pontier','AUTO:4':'grutier','FOSPEC:4':'op VPC',
  'FOSPEC:1':'Spéc antichute','FOSPEC:2':'NAC','ENC:PREPOSE-MATERIEL':'prép mat','PR:PREPOSE-APR':'prép APR','F2:REP-RENS':'rép rens',
  'F56:SPEC-AV':'spéc AV','F56:SPEC-PUB':'spéc pub','F56:SPEC-IT':'spéc IT','F56:SPEC-COM':'spéc com'};
 for(const [code,label] of Object.entries(entries))assert.equal(L.qvProgrammePublicDisplayLabel(code),label);
 assert.equal(R.institutionalReference('Conducteur poids-lourd Ydon 129').code,'AUTO:2');assert.equal(R.institutionalReference('Opérateur Ydon 0').code,'FOSPEC:4');
 assert.equal(R.institutionalLabel('Valeur-historique'),'Valeur-historique');
 assert.equal(R.institutionalLabel('OPAQUE_INTERNAL_CODE'),'Référence historique');
 assert.deepEqual(R.institutionalReference('GEN:SAPEUR-DAP').compatibleOiDomains,['DAP']);
 assert.deepEqual(R.institutionalReference('PR:COBRA').compatibleOiDomains,[]);
 assert.equal(R.INSTITUTIONAL_REFERENCES.filter(r=>r.code==='AUTO:3').length,1);
});
test('DPS/DAP/JSP contexts use the sole OI field; training responsibility is JSP G1/C1/B1 only',()=>{
 const def=L.qvProgrammeFunctionDefinitions();assert.equal(new Set(def.map(r=>r.code)).size,def.length);
 assert.deepEqual(def.find(r=>r.code==='Resp for JSP').domains.JSP,['G1','C1','B1']);
 const applies=(oi,code)=>L.qvProgrammeFunctionContext(row({oiSelections:[oi]})).functions.find(r=>r.code===code).applicable;
 assert.equal(applies('SDIS','C site'),true);assert.equal(applies('SDIS','Resp for JSP'),true);
 assert.deepEqual(L.qvProgrammeFunctionContext(row({oiSelections:['SDIS']})).oiCodes,['SDIS']);
 assert.equal(applies('DPS:G1','C site'),true);assert.equal(applies('JSP:G1','C site'),true);assert.equal(applies('DAP:Y1','C site'),false);
 assert.equal(applies('DAP:Y4','ENC:C-SECTION'),true);assert.equal(applies('JSP:Y3','Resp for JSP'),false);
 assert.equal(E.validatePublicRule(fn('Resp for JSP','JSP',['Y3'])).valid,false);
 assert.equal(L.qvProgrammeFunctionContext(row({responsible:'Cdt'})).responsibleAssignsAutomatically,false);
});
test('confirmed interim role is fully exercised, dates and concurrent functions retained without promotion',()=>{
 const expression=fn('C site','JSP',['G1']),functions=[fact({functionCode:'C site',domainCode:'JSP',oiCode:'G1',appointmentMode:'AD_INTERIM'}),fact({functionCode:'C site',domainCode:'DPS',oiCode:'G1'})];
 const before=JSON.stringify(functions);assert.deepEqual(run(expression,{functions}).personIds,['fixture-a']);assert.equal(JSON.stringify(functions),before);
 assert.deepEqual(run(expression,{functions:[{...functions[0],validTo:'2027-03-09'}]}).personIds,[]);
 assert.deepEqual(run(expression,{functions:[{...functions[0],status:'POSTULANT'}]}).personIds,[]);
});
test('Chef JSP/DAP still require their role in the appropriate domain, no cross-domain join',()=>{
 const jsp=fact({functionCode:'C JSP',domainCode:'JSP',oiCode:'G1'}),site=domainCode=>fact({functionCode:'C site',domainCode,oiCode:'G1'});
 assert.deepEqual(run(fn('C JSP','JSP',['G1']),{functions:[jsp,site('DPS')]}).personIds,[]);
 assert.deepEqual(run(fn('C JSP','JSP',['G1']),{functions:[jsp,site('JSP')]}).personIds,['fixture-a']);
 const dap=fact({functionCode:'C DAP',domainCode:'DAP',oiCode:'Y1'}),section=fact({functionCode:'ENC:C-SECTION',domainCode:'DAP',oiCode:'Y2',sectionCode:'Y2'});
 assert.deepEqual(run(fn('C DAP','DAP',['Y1']),{functions:[dap,section]}).personIds,['fixture-a']);
});
test('replacement FOBA chief is distinct and requires a confirmed Cadre FOBA at that date',()=>{
 const expression=fn('FOBA:REMPL-CHEF','FOBA'),replacement=fact({functionCode:'FOBA:REMPL-CHEF',domainCode:'FOBA',appointmentMode:'AD_INTERIM'});
 const cadre=fact({functionCode:'ENC:CADRE-FOBA',domainCode:'FOBA'});
 assert.deepEqual(run(expression,{functions:[replacement]}).personIds,[]);
 assert.deepEqual(run(expression,{functions:[replacement,cadre]}).personIds,['fixture-a']);
 assert.deepEqual(run(expression,{functions:[replacement,{...cadre,validFrom:'2027-03-11'}]}).personIds,[]);
 assert.equal(run(expression).complete,false);assert.notEqual(R.institutionalReference('C FOBA').code,R.institutionalReference('Rempl. chef FOBA').code);
});
test('FOBA1 is first-year population, echelon 0 and no DPS/DAP incorporation, no inferred assignment',()=>{
 const input={fobaLevels:[fact({levelCode:'1',trainingYear:1})],echelons:[fact({levelCode:'0'})],assignments:[]},before=JSON.stringify(input);
 assert.deepEqual(run(foba(1),input).personIds,['fixture-a']);assert.equal(JSON.stringify(input),before);
 for(const domain of ['DPS','DAP'])assert.deepEqual(run(foba(1),{...input,assignments:[incorporation(domain,domain==='DPS'?'G1':'Y1')]}).personIds,[]);
 assert.deepEqual(run(foba(1),{...input,echelons:[fact({levelCode:'I'})]}).personIds,[]);
 assert.deepEqual(run(foba(1),{...input,fobaLevels:[fact({levelCode:'1',trainingYear:2})]}).personIds,[]);
 assert.equal(run(foba(1),{fobaLevels:input.fobaLevels}).complete,false);
});
test('FOBA2 requires second year and DPS/DAP; FOBA3 requires third year and DPS, never a function',()=>{
 for(const domain of ['DPS','DAP'])assert.deepEqual(run(foba(2),{fobaLevels:[fact({levelCode:'2',trainingYear:2})],assignments:[incorporation(domain,domain==='DPS'?'G1':'Y1')]}).personIds,['fixture-a']);
 assert.deepEqual(run(foba(2),{fobaLevels:[fact({levelCode:'2',trainingYear:2})],assignments:[]}).personIds,[]);
 assert.deepEqual(run(foba(3),{fobaLevels:[fact({levelCode:'3',trainingYear:3})],assignments:[incorporation()]}).personIds,['fixture-a']);
 assert.deepEqual(run(foba(3),{fobaLevels:[fact({levelCode:'3',trainingYear:3})],assignments:[incorporation('DAP','Y1')]}).personIds,[]);
 assert.equal(R.FOBA_POPULATIONS.find(r=>r.level==='3').exerciseCount,3);assert.ok(R.FOBA_POPULATIONS.every(r=>r.kind==='POPULATION'));
});
test('public combinations include echelon 0–III, FOBA1, Commandant without duplicate persons',()=>{
 const expression={op:'ANY',children:[{predicate:'HAS_ECHELON',levelCodes:['0','I','II','III']},foba(1),fn('CMDT:CDT','F0')]};
 const input={echelons:[fact({levelCode:'0'})],candidatures:[fact({targetEchelon:'III',personneId:'fixture-b'})],fobaLevels:[fact({levelCode:'1',trainingYear:1})],assignments:[],functions:[fact({personneId:'fixture-b',functionCode:'CMDT:CDT',domainCode:'F0'})]};
 assert.deepEqual(run(expression,input).personIds,['fixture-a','fixture-b']);assert.equal(run(expression,{...input,candidatures:undefined}).complete,false);
 assert.deepEqual(run({predicate:'HAS_ECHELON',levelCodes:['III']},{echelons:[],candidatures:[fact({targetEchelon:'III',status:'POSTULANT'})]}).personIds,[]);
});
test('historical C2 rules, fingerprints and results unchanged without new optional population semantics',()=>{
 for(const expression of [{predicate:'HAS_FOBA_LEVEL',levelCodes:['1','2']},{predicate:'HAS_PERSON_FUNCTION',functionCodes:['DPS_CHEF_SECTION']}]){
  const input={ruleVersion:{expression},evaluationDate:date,persons:[{id:'fixture-a'}],functions:[fact({functionCode:'DPS_CHEF_SECTION'})],fobaLevels:[fact({levelCode:'1'})]};
  assert.equal(E.fingerprintPublicRule(expression),oldE.fingerprintPublicRule(expression));assert.deepEqual(E.evaluatePublicRule(input),oldE.evaluatePublicRule(input));
 }
});
test('PIONNIER new-creation default is FOBA3; existing source/decisions and old projection preserved',()=>{
 const source=row({definitionId:'QV26-INTRODUCTION-PIONNIER-999BBC8C',label:'Introduction PIONNIER',publics:['FOBA:2'],ois:['G1'],oiSelections:['DPS:G1'],humanDecision:true});
 const input=[source],before=JSON.stringify(input);const result=L.qvProgrammeActivityTypes({canonicalProgramme:{rows:input}});
 assert.deepEqual(result[0].defaults.publicCodes,['FOBA:3']);assert.equal(JSON.stringify(input),before);
 assert.deepEqual(L.qvApplyPionnierRules(input),oldL.qvApplyPionnierRules(input));
 const proposals=L.qvProgrammeCorrectionProposals(input,{definitionIds:[source.definitionId],values:{publicCodes:['FOBA:3']}});assert.equal(proposals[0].applyAutomatically,false);
});
test('personnel PABC display uses institutional label; historical aliases and PL/VL effectif logic retained',()=>{
 const assignments=[{domaine:'PR',cible:'ABC'},{domaine:'AUTO',cible:'VL_DPS'},{domaine:'AUTO',cible:'PL'},{domaine:'DPS',cible:'G1'}];
 const before=JSON.stringify(assignments);assert.ok(D.formatSpecializations(assignments).labels.includes('PABC'));
 assert.equal(D.specializationCode({domaine:'PR',cible:'ABC'}),'PR_ABC');assert.equal(D.countsInVlDpsEffectif(assignments,date),false);assert.equal(D.countsInPlEffectif(assignments,date),true);
 assert.equal(JSON.stringify(assignments),before);assert.equal(D.personMatchesSpecializationFilter({affectations:assignments},'PR-ABC'),true);
});
test('fiche render retains historical identifiers, hides technical codes and uses three groups per control',()=>{
 const qv={programme:{annee:2027},canonicalProgramme:{rows:[row({publics:['CMDT:CHEF-SECTION-DAP','FOBA:1'],publicFreeLabels:['Resp matériel '],qualificationCodes:['COND_TP9','fixture-unknown-code'],responsibleSelections:[{kind:'REFERENCE',code:'C for'}]})]},
  qualifications:[{code:'COND_TP9',label:'cond TP9'},{code:'fixture-unknown-code',label:'Certification historique'}],responsableFonctions:[{code:'C for',libelle:'C for'}],lieux:[],sallesTheorie:[]};
 const before=JSON.stringify(qv),html=createCatalogUiHarness().hooks.renderQuoVadisProgrammeFicheHtml(qv,'fixture-occurrence');
 assert.equal(JSON.stringify(qv),before);assert.ok(html.includes('CMDT:CHEF-SECTION-DAP'));assert.ok(html.includes('Certification historique'));
 assert.ok(html.includes('Cadre FOBA'));assert.ok(!html.includes('<span>Resp formation</span>'));assert.ok(!html.includes('<span>COND_TP9</span>'));
 const {hooks}=createCatalogUiHarness();assert.ok(hooks.qvAssignmentPreparationHtml(row({responsible:'Cdt'}),false).includes('<fieldset disabled>'));
});


test('MOA removes Chef materiel JSP from new choices, keeps already-selected historical values',()=>{
 assert.ok(!L.qvProgrammePublicDisplayCatalogue().flatMap(g=>g.items).some(([code])=>code==='Resp mat JSP'));
 assert.equal(R.institutionalReference('Resp mat JSP').retired,true);
 const qv={programme:{annee:2027},canonicalProgramme:{rows:[row({publics:['Resp mat JSP'],responsibleSelections:[{kind:'REFERENCE',code:'Resp mat JSP'}]})]},
  responsableFonctions:[{code:'Resp mat JSP',libelle:'Resp mat JSP'}],qualifications:[]};
 const before=JSON.stringify(qv),html=createCatalogUiHarness().hooks.renderQuoVadisProgrammeFicheHtml(qv,'fixture-occurrence');
 assert.ok(html.includes('data-preserved-selections'));assert.ok(html.includes('Resp matériel JSP'));assert.equal(JSON.stringify(qv),before);
 assert.equal(R.institutionalReference('Chef matériel JSP'),null);
 const empty=structuredClone(qv);empty.canonicalProgramme.rows[0].publics=[];empty.canonicalProgramme.rows[0].responsibleSelections=[];
 assert.ok(!createCatalogUiHarness().hooks.renderQuoVadisProgrammeFicheHtml(empty,'fixture-occurrence').includes('value="Resp mat JSP"'));
});


test('presentation extensions never reclassify existing operational publics or change automatic reference enrichment',()=>{
 const before=oldL.qvProgrammeDescriptivePublics(),after=L.qvProgrammeDescriptivePublics();
 for(const [code,label] of Object.entries(before))assert.equal(after[code],label);
 for(const code of ['AUTO:1','AUTO:2','AUTO:3','PR:2','PR:3','FOBA:1','FOBA:2','FOBA:3','ECH:0','ENC:C-SECTION'])assert.equal(Object.hasOwn(after,code),Object.hasOwn(before,code),code);
 const cases=[{id:'fixture-one',title:'Activité',domain:'DPS',personnel:'Chef FOBA',responsible:'C site',ois:['G1'],statCom:'0120F7'},
  {id:'fixture-two',title:'Activité',domain:'DAP',personnel:'Préposé aux tuyaux',responsible:'C sct',ois:['Y1'],statCom:'0130F7'}];
 for(const input of cases)assert.deepEqual(L.qvEnrichBusinessReference(input),oldL.qvEnrichBusinessReference(input));
 assert.deepEqual(L.qvApplyDpsInstructionFamilyRules([{id:'fixture-dps',label:'Instruction DPS',domain:'DPS',responsible:'Chef section DPS'}]),
  oldL.qvApplyDpsInstructionFamilyRules([{id:'fixture-dps',label:'Instruction DPS',domain:'DPS',responsible:'Chef section DPS'}]));
});
test('existing publication planner keeps operational relations/codes and recognizes new descriptive functions without assignment writes',()=>{
 const planner=require('../netlify/lib/_scope-qv-publication-plan'),oldPlanner=previous('netlify/lib/_scope-qv-publication-plan.js');
 const item={id:'fixture',year:2027,source:{definitionId:'fixture-type',occurrenceId:'O1',sessionId:'S1'},status:'VALIDATED',
  title:'Activité témoin',referencesValidated:true,schedule:{startsAt:date+'T19:00',endsAt:date+'T21:00'},
  classification:{primaryDomain:'AUTO',domainCodes:['AUTO'],publicCodes:['AUTO:1']},business:{statComCode:'0120F7',businessCode:'0120F7.001'}};
 const refs={domains:['AUTO'],publics:['AUTO:1'],statComCodes:['0120F7']};
 const input={year:2027,programme:[item],referentials:refs};
 assert.deepEqual(planner.buildPublicationPlan(input),oldPlanner.buildPublicationPlan(input));
 const combined={...item,classification:{...item.classification,publicCodes:['AUTO:1','C FOBA','C audiovisuel']}};
 const result=planner.buildPublicationPlan({...input,programme:[combined]});
 assert.equal(result.decisions[0].action,'CREATE');assert.deepEqual(result.decisions[0].target.relations.publicCodes,['AUTO:1']);
 assert.ok(JSON.stringify(result.decisions[0].target).includes('Chef FOBA'));
 assert.equal(item.business.statComCode,'0120F7');assert.equal(item.business.businessCode,'0120F7.001');
});


test('FOBA1 absence of incorporation is not inferred from invalid or undated incorporation facts',()=>{
 const extra={fobaLevels:[fact({levelCode:'1',trainingYear:1})],echelons:[fact({levelCode:'0'})],assignments:[fact({personneId:'outside-population',domainCode:'DPS'})]};
 assert.deepEqual(run(foba(1),extra).personIds,['fixture-a']);
 const input={fobaLevels:[fact({levelCode:'1',trainingYear:1})],echelons:[fact({levelCode:'0'})]};
 for(const changed of [{validFrom:null},{validTo:'not-a-date'},{oiCode:'UNKNOWN'}]){
  const result=run(foba(1),{...input,assignments:[{...incorporation(),...changed}]});
  assert.equal(result.complete,false);assert.ok(result.warnings.includes('FOBA1_INCORPORATION_NOT_VERIFIABLE'));assert.deepEqual(result.personIds,[]);
 }
 assert.deepEqual(run(foba(1),{...input,assignments:[{...incorporation(),validTo:'2026-12-31'}]}).personIds,['fixture-a']);
});
