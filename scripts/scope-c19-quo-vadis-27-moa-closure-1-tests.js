'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('../netlify/lib/_scope-functional-catalog');
const lot = require('./scope-c19-quo-vadis-27-moa-closure-1');

const ROOT = path.resolve(__dirname, '..');
const report = lot.buildReport();
const checks = [];
function check(name, fn) { fn(); checks.push(name); }

check('QUO VADIS label is dynamic and exact', () => {
  assert.deepEqual(report.navigation.dynamicYears, ["QUO VADIS '27", "QUO VADIS '28", "QUO VADIS '29"]);
  assert.equal(report.navigation.surfaces.length, 4);
});

check('CTA is one continuous Friday to Monday object', () => {
  assert.equal(report.cta.startDateTime, '2027-01-01T18:00');
  assert.equal(report.cta.endDateTime, '2027-01-04T06:00');
  assert.equal(report.cta.durationMinutes, 3600);
  assert.equal(report.cta.singleObject, true);
});

check('CTA conflicts through Monday before 06 and stops at 06', () => {
  assert.deepEqual(report.cta.conflictCases.map((row) => [row.name,row.state,row.timeOverlap]), [
    ['SATURDAY','CONFLICT',true],['SUNDAY','CONFLICT',true],['MONDAY_BEFORE_0600','CONFLICT',true],['MONDAY_AFTER_0600','COMPATIBLE',false]
  ]);
});

check('CTA continuity crosses protected dates', () => {
  assert.equal(report.cta.protectedCrossing.includesPublicHoliday, true);
  assert.equal(report.cta.protectedCrossing.businessException, 'SERVICE_CONTINUITY');
  assert.equal(report.cta.protectedCrossing.ordinaryHolidayAllowed, false);
  assert.equal(report.cta.protectedCrossing.permanenceHolidayAllowed, true);
});

check('622 program objects and 13 historical rows explain 635', () => {
  assert.equal(report.programme2027.length, 622);
  assert.equal(report.historicalNonReconducted.length, 13);
  assert.equal(report.programme2027.length + report.historicalNonReconducted.length, 635);
  assert.ok(report.historicalNonReconducted.every((row) => row.programYear == null && row.sourceYear === 2026 && row.isoDate == null && row.lifecycleOnly));
});

check('business codes and external blank codes are canonical', () => {
  assert.deepEqual(report.codes.invalidCodes, []);
  assert.deepEqual(report.codes.duplicateCodes, []);
  assert.deepEqual(report.codes.externalCodeErrors, []);
});

check('FOBA phase II is one canonical activity with four OI materializations', () => {
  assert.equal(report.fobaPhaseTwo.conclusion, 'ONE_CANONICAL_ACTIVITY_FOUR_OI_MATERIALIZATIONS');
  assert.equal(report.fobaPhaseTwo.rows.length, 4);
  assert.deepEqual(report.fobaPhaseTwo.rows.map((row) => row.target), ['DPS-G1','DPS-C1','DPS-B1','DPS-B2']);
  assert.equal(new Set(report.fobaPhaseTwo.rows.map((row) => row.canonicalActivityId)).size, 1);
});

check('EMSEA meaning and neutral Stat.Com are resolved', () => {
  assert.equal(report.emsea.meaning, 'Séance État-major');
  assert.equal(report.emsea.statCom, '');
  assert.equal(report.emsea.statComApplicability, 'NOT_APPLICABLE');
  assert.equal(report.emsea.occurrences, 11);
  assert.equal(report.emsea.sourceDated, 2);
  assert.equal(report.emsea.toPosition, 9);
});

check('every EMSEA occurrence has its own monthly window', () => {
  assert.equal(report.emsea.monthlyWindows.length, 11);
  report.emsea.monthlyWindows.forEach((row, index) => {
    const month = String(index + 1).padStart(2, '0');
    assert.equal(row.periodStart, `2027-${month}-01`);
    assert.equal(row.periodEnd.slice(0,7), `2027-${month}`);
    assert.equal(row.priorityDay, 'TUESDAY');
  });
});

check('generic Caserne SDIS is removed without inventing G1', () => {
  assert.equal(report.locationDecision.canonicalResult, 'Non déterminé');
  assert.equal(report.locationDecision.g1Invented, false);
  const app = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/app.js'), 'utf8');
  assert.doesNotMatch(app, /\['L-CANTON','Caserne SDIS'\]/);
  assert.match(app, /\['','Non déterminé'\]/);
});

check('conflict workflow removes stale result and retains scenario', () => {
  assert.deepEqual(report.conflictWorkflow, { sameScenarioKeyPersisted:true,activityAEditable:true,activityBEditable:true,staleResultRemovedOnSave:true,recheckUsesSharedMoveEngine:true,compatibleCasesCollapsed:true });
  const app = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/app.js'), 'utf8');
  assert.match(app, /state\.activeConflictKey=button\.dataset\.case/);
  assert.match(app, /state\.conflictAnalysis=null;state\.conflictAnalysisPending=true/);
  assert.match(app, /payload=\{moving:apiSlot\(moving\),others:\[apiSlot\(other\)\]/);
});

check('shared move engine preserves multiday duration', () => {
  const result = engine.validateMove({
    moving:{ activityLabel:'multi',date:'2027-03-05',startTime:'18:00',endTime:'06:00',startDateTime:'2027-03-05T18:00',endDateTime:'2027-03-08T06:00' },
    targetDate:'2027-03-12',others:[],calendarRules:{},calendar:{}
  });
  assert.equal(result.allowed, true);
  assert.equal(result.candidate.startDateTime, '2027-03-12T18:00');
  assert.equal(result.candidate.endDateTime, '2027-03-15T06:00');
});

check('report has the exact A through Z contract', () => {
  const sections = [...lot.markdown(report).matchAll(/^## ([A-Z])\. /gm)].map((match) => match[1]);
  assert.deepEqual(sections, Array.from({length:26},(_,index) => String.fromCharCode(65 + index)));
});

lot.writeOutputs(report);
console.log(`PASS ${checks.length} contrôles — ${checks.join(' | ')}`);
