'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lot = require('./scope-c19-quo-vadis-27-full-dress-rehearsal-1');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const PREFIX = 'SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1';
const report = lot.buildReport();
const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

check('volume equation accounts for every lifecycle record once', () => {
  assert.deepEqual(report.volume.equation, {
    programmedSource: 72,
    programmedCta: 53,
    programmedEngine: 0,
    toPositionWithProposals: 9,
    toPositionWithoutReliableProposal: 479,
    arbitration: 3,
    insufficientInformation: 6,
    nonReconducted: 13,
    lifecycleTotal: 635,
    actualProgramObjects: 622,
    computedSum: 635
  });
});

check('definitions and 2026 to 2027 matrix have no silent loss', () => {
  assert.equal(report.volume.definitions, 345);
  assert.equal(report.matrix2026To2027.length, 345);
  assert.equal(report.matrixReference302.length, 302);
  assert.equal(report.matrix2026To2027.filter((row) => row.loss).length, 0);
});

check('business codes are canonical and external lifecycle rows are blank', () => {
  assert.deepEqual(report.controls.invalidCodes, []);
  assert.deepEqual(report.controls.duplicateCodes, []);
  assert.deepEqual(report.controls.externalCodeErrors, []);
  assert.equal(report.nonReconducted.length, 13);
  assert.ok(report.nonReconducted.every((row) => row.status === 'NON_RECONDUIT' && row.code === '' && row.statCom === '' && row.target === 'EXTERNAL'));
});

check('EMSEA keeps two source dates and nine undecided occurrences', () => {
  assert.equal(report.emsea.occurrences.length, 11);
  assert.equal(report.emsea.sourceDated, 2);
  assert.equal(report.emsea.proposedNotSelected, 9);
  assert.equal(report.emsea.automaticFinalSelections, 0);
  assert.equal(report.emsea.proposalOptions.length, 25);
  const counts = Object.values(report.placement.proposalsByOccurrence);
  assert.equal(counts.length, 9);
  assert.ok(counts.every((count) => count >= 1 && count <= 3));
  assert.ok(report.emsea.proposalOptions.every((row) => row.compatibility === 'COMPATIBLE' && row.finalSelection === false));
  assert.equal(report.placement.priorityTuesdayProposals, 22);
  assert.equal(report.placement.allowedFallbackProposals, 3);
});

check('EMSEA proposals avoid protected dates and preserve Tuesday priority', () => {
  const protectedDates = new Set();
  for (const date of report.calendar.official2027.holidays) protectedDates.add(date);
  for (const [start, end] of report.calendar.official2027.vacations) {
    for (let cursor = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 1)) protectedDates.add(cursor.toISOString().slice(0, 10));
  }
  assert.ok(report.emsea.proposalOptions.every((row) => !protectedDates.has(row.date)));
  for (let occurrence = 3; occurrence <= 11; occurrence += 1) {
    const rows = report.emsea.proposalOptions.filter((row) => row.occurrenceNumber === occurrence);
    const tuesdays = rows.filter((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay() === 2);
    if (tuesdays.length) assert.ok(rows.slice(0, tuesdays.length).every((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay() === 2));
  }
});

check('ordinary January protection and CTA continuity exception are distinct', () => {
  assert.ok(report.calendar.ordinaryJanuary1To10.every((row) => row.allowed === false));
  assert.ok(report.calendar.ctaJanuary1To10.every((row) => row.allowed === true));
});

check('FOBA January 5 case is exact', () => {
  const row = report.fobaJanuary5;
  assert.equal(row.isoDate, '2027-01-05');
  assert.equal(row.start, '18:00');
  assert.equal(row.end, '22:00');
  assert.deepEqual(row.oiCodes, ['DPS:G1', 'DPS:C1', 'DPS:B1', 'DPS:B2']);
  assert.deepEqual(row.publics, ['FOBA:2']);
  assert.equal(row.responsible, 'C FOBA');
  assert.deepEqual(row.roles, ['CHEF-FOBA']);
  assert.equal(row.historicalResponsible, 'C for');
  assert.equal(row.code, '070F1.004');
});

check('CTA annual matrix is continuous and capacity rules are scoped', () => {
  assert.equal(report.cta2027.weeks, 53);
  assert.equal(report.cta2027.rows.length, 212);
  const fridays = report.cta2027.rows.filter((row) => row.site === 'G1').map((row) => row.friday);
  assert.equal(new Set(fridays).size, 53);
  for (let index = 1; index < fridays.length; index += 1) {
    assert.equal((new Date(`${fridays[index]}T00:00:00Z`) - new Date(`${fridays[index - 1]}T00:00:00Z`)) / 86400000, 7);
  }
  assert.ok(report.cta2027.rows.filter((row) => row.site === 'G1').every((row) => row.reserve === 'N06' && row.capacity.sectionMaximum === 15 && row.capacity.halfSectionMaximum === 8));
  assert.ok(report.cta2027.rows.filter((row) => row.site !== 'G1').every((row) => row.reserve == null && row.capacity.sectionMaximum == null && row.capacity.halfSectionMaximum == null));
});

check('conflict engine results are real and source-originated', () => {
  assert.deepEqual(report.conflicts.totals, { BLOQUANT: 4, DEROGEABLE: 0, ATTENTION: 0, COMPATIBLE_PERTINENT: 76 });
  assert.deepEqual(report.conflicts.causes, { ROOM_CONFLICT: 3, PUBLIC_CONFLICT: 1, WHO_CONFLICT: 2 });
  assert.equal(report.conflicts.engineCreatedConflicts, 0);
  assert.equal(report.conflicts.engineProposalConflicts.length, 0);
  assert.ok(report.conflicts.sourceConflicts.every((row) => String(row.provenanceA).startsWith('SOURCE_2027_EXPLICIT') && String(row.provenanceB).startsWith('SOURCE_2027_EXPLICIT')));
});

check('sampling covers every requested family and all atypical cases', () => {
  for (const domain of ['DPS', 'DAP', 'JSP', 'FOBA', 'PR', 'AUTO', 'FOCO_FOCA_FOSPEC', 'CTA', 'EXTERNAL']) assert.ok(report.sampling[domain].length >= 5, domain);
  assert.equal(report.sampling.EMSEA.length, 11);
  assert.equal(report.sampling.MULTI_SESSION_ATYPIQUE.length, 12);
  assert.equal(report.sampling.ARBITRAGES.length, 3);
});

check('performance proof uses the real 635-row dataset', () => {
  assert.equal(report.performance.datasetObjects, 635);
  assert.equal(report.performance.primaryProofSynthetic, false);
  for (const key of ['catalogueBuild', 'search', 'filters', 'sort', 'screen10', 'agenda', 'conflicts', 'moveCandidates']) {
    assert.ok(Number.isFinite(report.performance[key].elapsedMs), key);
  }
});

check('preview exposes full lifecycle dataset and EMSEA workflow', () => {
  assert.equal(report.preview.events.length, 635);
  assert.equal(report.preview.selectedId, 'QV26-SEANCE-EM-ED042EBD');
  assert.equal(report.preview.previewOccurrences.length, 11);
  assert.equal(report.preview.proposals.length, 3);
  assert.equal(report.preview.slot.start, '18:00');
  assert.equal(report.preview.slot.end, '21:00');
});

check('UI includes non-reconducted state and data-driven annual slot', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/app.js'), 'utf8');
  assert.match(source, /NON_RECONDUIT:\['gray','Non reconduit'\]/);
  assert.match(source, /\['NON_RECONDUIT','Non reconduit'\]/);
  assert.match(source, /data\.annual\|\|\{\}/);
  assert.match(source, /data\.slot\|\|\{\}/);
  assert.match(source, /undatedActivityLabel/);
  assert.match(source, /undatedActivityAction/);
});

check('report has the exact A through BD section contract', () => {
  const markdown = lot.markdown(report);
  const sections = [...markdown.matchAll(/^## ([A-Z]{1,2})\. /gm)].map((match) => match[1]);
  assert.deepEqual(sections, report.controls.reportSections);
  assert.equal(new Set(sections).size, 56);
  assert.match(markdown, /## BD\. Réponse à la question centrale/);
});

check('all required deliverables exist after generation', () => {
  lot.writeOutputs(report);
  const files = [
    `${PREFIX}.md`, `${PREFIX}.json`, `${PREFIX}_PROGRAM_2027.json`, `${PREFIX}_MATRIX_2026_2027.json`,
    `${PREFIX}_AUTO_PLACEMENTS.json`, `${PREFIX}_TO_POSITION.json`, `${PREFIX}_ARBITRATIONS.json`,
    `${PREFIX}_CONFLICTS.json`, `${PREFIX}_CTA_2027.json`
  ];
  for (const file of files) assert.ok(fs.existsSync(path.join(DOCS, file)), file);
});

console.log(`PASS ${checks.length} contrôles — ${checks.join(' | ')}`);
