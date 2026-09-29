'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const gate2 = require('./scope-c19-preprod-gate-2');
const occurrenceModel = require('./scope-c19-ux-recette/model');
const engine = require('../netlify/lib/_scope-functional-catalog');

const tests=[];
function test(name,fn){ tests.push({name,fn}); }

const report=gate2.buildGate();

test('01 — base R1 PASS et génération sans écriture',()=>{
  assert.equal(report.baseR1.verdict,'PASS');
  assert.equal(report.restrictions.scopeWrites,false);
  assert.equal(gate2.LIVE_SCOPE_SNAPSHOT.transactionReadOnly,'on');
});
test('02 — 302 définitions R1 sans perte silencieuse',()=>{
  assert.equal(report.controls.definitions302.accounted,302);
  assert.equal(report.controls.definitions302.lost,0);
  assert.deepEqual(report.controls.definitions302.totals,{ G:3,D:13,H:6,A:210,B:56,E:5,C:9 });
});
test('03 — 72 événements source conservés un pour un',()=>{
  assert.equal(report.events.length,72);
  assert.equal(report.controls.sourceEvents72.present,72);
  assert.equal(report.controls.sourceEvents72.lost,0);
  assert(report.events.every((row)=>row.provenance==='SOURCE_WORKBOOK_DATE'&&row.sourceEvidence.row&&row.explanation.source));
});
test('04 — récurrences générées sans date 2026 copiée',()=>{
  const recurring=report.occurrences.filter((row)=>row.provenance==='CATALOG_RECURRENT'&&row.status==='A_POSITIONNER');
  assert(recurring.length>200);
  assert(recurring.every((row)=>row.date===null));
});
test('05 — cursus non retenu ne génère aucune occurrence',()=>{
  assert.equal(report.curriculum.generatedOccurrences,0);
  assert.equal(report.curriculum.evidence['CI-DPS'].retained,false);
  assert.equal(report.destiny302.filter((row)=>row.category==='B'&&row.disposition==='CURRICULUM_NOT_SELECTED').length,56);
});
test('06 — CTA garde les neuf définitions et les tournus partiels',()=>{
  assert.equal(report.cta.definitions,9);
  assert.match(report.cta.rotation.cta.firstMissingParameter,/Ordre/);
  assert.match(report.cta.rotation.halfSections.firstMissingParameter,/Ordre/);
  assert.equal(report.cta.permanences.length,53);
});
test('07 — capacités G1 et absence de limite C1 B1 B2',()=>{
  assert.equal(gate2.validateCtaCapacity({site:'G1',scope:'SECTION',count:15}).accepted,true);
  assert.equal(gate2.validateCtaCapacity({site:'G1',scope:'SECTION',count:16}).accepted,false);
  assert.equal(gate2.validateCtaCapacity({site:'G1',scope:'HALF_SECTION',count:8}).accepted,true);
  assert.equal(gate2.validateCtaCapacity({site:'G1',scope:'HALF_SECTION',count:9}).accepted,false);
  for(const site of ['C1','B1','B2']) assert.equal(gate2.validateCtaCapacity({site,scope:'SECTION',count:99}).accepted,true);
});
test('08 — N06 reste une réserve et non un Public',()=>{
  assert.equal(report.cta.organisation.G1.includes('N06'),true);
  assert.equal(report.cta.reserve.section,'N06');
  assert.equal(report.sourceDefinitions.some((row)=>row.publics.includes('N06')),false);
});
test('09 — Stat.Com SCOPE, 12 anomalies et extérieurs non bloqués',()=>{
  assert.equal(report.statCom.canonicalCount,91);
  assert.equal(report.statCom.remainingAnomalies,12);
  assert(report.statCom.missingReview.every((row)=>row.assignedCode===null));
  assert.equal(report.external.length,13);
});
test('10 — FOCA sans date conservées à positionner',()=>{
  const foca=report.occurrences.filter((row)=>row.definitionCode==='QV26-GROUPE-DE-TRAVAIL-FOCA-1E076C38');
  assert.equal(foca.length,6);
  assert(foca.every((row)=>row.date===null&&row.status==='A_POSITIONNER'));
});
test('11 — trois Publics restent inconnus et quatre non-Publics sont exclus',()=>{
  assert.equal(report.publicReview.totals['REELLEMENT INCONNUE'],3);
  assert.equal(report.publicReview.totals['VALEUR EXTERIEURE AU REFERENTIEL PUBLIC'],4);
});
test('12 — modèle multi-public et multi-session',()=>{
  assert(report.events.some((row)=>row.publics.length>1));
  const sessions=occurrenceModel.buildSessions({profiles:[{label:'Exercice PR',duration:120,target:'PR',publics:['PR:2'],location:'L-G1',room:'R-G1-O2'}],sessions:6,numberOccurrences:true});
  assert.equal(sessions.length,6);
  assert.deepEqual(sessions.map((row)=>row.session),[1,2,3,4,5,6]);
});
test('13 — OI indépendants, FULL_OI, partiel, JSP/DPS et PR/DPS',()=>{
  const base={date:'2027-06-01',startTime:'19:00',endTime:'21:00',status:'PROPOSED'};
  const dpsG1={...base,activityLabel:'Exercice DPS G1',activityClass:'DPS_EXERCISE',scopeDomain:'DPS',organisationUnit:'G1',coverage:'FULL_OI',targetCode:'DPS-G1'};
  const dpsC1={...dpsG1,activityLabel:'Exercice DPS C1',organisationUnit:'C1',targetCode:'DPS-C1'};
  const jspG1={...base,activityLabel:'Exercice JSP G1',activityClass:'JSP_EXERCISE',scopeDomain:'JSP',organisationUnit:'G1',coverage:'FULL_OI',targetCode:'JSP-G1'};
  const partial={...base,activityLabel:'Instruction partielle G1',activityClass:'GENERIC',scopeDomain:'DPS',organisationUnit:'G1',coverage:'PARTIAL',targetCode:'DPS-G1'};
  const pr={...base,activityLabel:'Exercice PR',activityClass:'PR_EXERCISE',scopeDomain:'PR',coverage:'PARTIAL',targetCode:'PR'};
  assert.equal(engine.compatibilityBetween(dpsG1,dpsC1).state,'COMPATIBLE');
  assert.equal(engine.compatibilityBetween(dpsG1,jspG1).state,'CONFLICT');
  assert.equal(engine.compatibilityBetween(partial,jspG1).state,'COMPATIBLE');
  assert.equal(engine.compatibilityBetween(dpsG1,pr).state,'DEROGABLE');
});
test('14 — calendrier officiel réutilisé et annonces autonomes',()=>{
  assert.equal(report.calendar[2027].holidays.length,9);
  assert(report.calendar[2027].vacations.length>0);
  assert.deepEqual(report.announcements,[]);
});
test('15 — typologie de conflits limitée aux quatre états',()=>{
  assert.deepEqual(report.conflictRules.typology,['BLOQUANT','DEROGEABLE','ATTENTION','COMPATIBLE']);
  assert(report.conflicts.pairs.every((row)=>['CONFLICT','DEROGABLE','ATTENTION','COMPATIBLE'].includes(row.state)));
});
test('16 — preview complète et dataset local',()=>{
  assert.equal(report.preview.definitions.length,report.volume.definitions);
  assert.equal(report.preview.events.length,72);
  assert.equal(report.preview.conflictScenarios.length,8);
  assert(report.preview.conflictScenarios.every((scenario)=>report.events.some((event)=>event.id===scenario.moving)&&report.events.some((event)=>event.id===scenario.other)));
  assert(fs.existsSync(require('node:path').join(__dirname,'scope-c19-ux-recette/preprod-data.js')));
});
test('17 — volumétrie réconciliée',()=>{
  assert.equal(report.volume.activeDefinitions,326);
  assert(report.sessions.length>report.occurrences.length);
  assert.equal(report.sessions.length-report.occurrences.length,10);
  assert.equal(report.volume.datedEvents,72);
  assert.equal(report.volume.automaticPlacements,0);
  assert.equal(report.volume.arbitrations,3);
  assert.equal(report.volume.insufficient,6);
});

(async()=>{
  let failed=0;
  for(const row of tests){
    try{ await row.fn(); console.log(`PASS ${row.name}`); }
    catch(error){ failed+=1; console.error(`FAIL ${row.name}`); console.error(error.stack||error); }
  }
  console.log(`\nGate 2 ciblé: ${tests.length-failed}/${tests.length} PASS`);
  if(failed) process.exitCode=1;
})();
