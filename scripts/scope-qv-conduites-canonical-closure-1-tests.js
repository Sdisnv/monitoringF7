#!/usr/bin/env node
'use strict';

// SCOPE — QUO VADIS — CONDUITES-CANONICAL-CLOSURE-1
// 2 conduites par demi-section opérationnelle, sources CTA si l'historique 2026 est insuffisant.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'assets/js/scope-ui-logic.js'));
const cta = require(path.join(root, 'netlify/lib/_scope-cta-rules'));
const canonical = require(path.join(root, 'netlify/lib/data/scope-qv-programme-2027.json'));
const history = require(path.join(root, 'netlify/lib/data/scope-qv-history-2026.json'));
const catalog = require(path.join(root, 'netlify/lib/data/scope-qv-canonical-annual-rules.json'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${passed} - ${name}`); }
  catch (error) { failures.push(name); console.log(`FAIL - ${name}\n  ${error.message}`); }
}

const rotation = L.qvDistributeRotationOccurrences(canonical.rows, history.rows, cta.instructionPublicForDate);
const pionnier = L.qvApplyPionnierRules(rotation.rows);
const family = L.qvApplyDpsInstructionFamilyRules(pionnier.rows, cta.instructionPublicForDate);
const periodic = L.qvApplyPeriodicActivityRules(family.rows, { year: 2027 });
const projection = L.qvMaterializeHistoricalOccurrences(periodic.rows, history.rows, { year: 2027 });
const dapAnnual = L.qvApplyDapAnnualExercisePlan(projection.rows, history.rows);
const foba = L.qvApplyFobaOccurrenceThemes(dapAnnual.rows, history.rows);
const prSeries = L.qvApplyPrSeriesContinuity(foba.rows, history.rows);
const conduiteOptions = { ...cta.conduiteEngineOptions(), season: L.qvInstructionSeasonBounds(history.rows, 2027) };
const applied = L.qvApplyConduiteContinue(prSeries.rows, conduiteOptions);
const dapConduite = L.qvApplyDapConduite(applied.rows, history.rows, { year: 2027 });
const prAbc = L.qvApplyPrAbcStructure(dapConduite.rows, history.rows);
const rows = prAbc.rows;
const ctrl = L.qvConduiteCoherenceControl(rows, conduiteOptions);
const conduites = applied.derived.matched.concat(applied.derived.added);
const programmed = applied.derived.programmedInstructions || [];

test('référentiel CTA : G1=10 C1=B1=B2=6, cible calculée 56', () => {
  assert.deepEqual(ctrl.halves, { G1: 10, C1: 6, B1: 6, B2: 6 });
  assert.equal(cta.expectedAnnualConduites(), 56);
  assert.equal(ctrl.target, 56);
  assert.equal(10 + 6 + 6 + 6, 28);
});

test('56 conduites matérialisées, 0 insuffisance, 0 instruction CTA ajoutée', () => {
  assert.equal(ctrl.materialized, 56);
  assert.equal(applied.derived.insufficient.length, 0);
  assert.equal(programmed.length, 0);
  assert.equal(ctrl.pass, true);
});

test('exactement 2 conduites par demi-section opérationnelle, 0 réserve', () => {
  assert.equal(ctrl.perHalf.length, 28);
  ctrl.perHalf.forEach((item) => assert.equal(item.n, 2, `${item.oi} ${item.halfSection}`));
  assert.equal(ctrl.reserveConduites, 0);
  assert.equal(ctrl.incompleteHalves.length, 0);
});

test('aucune conduite orpheline ; OI et Nxx identiques à la source ; immédiat après ; 1 h', () => {
  assert.equal(ctrl.orphans, 0);
  assert.equal(ctrl.oiMismatch, 0);
  assert.equal(ctrl.nxxMismatch, 0);
  assert.equal(ctrl.notImmediate, 0);
  assert.equal(ctrl.durationFail, 0);
  assert.equal(ctrl.duplicates, 0);
});

test('public = Nxx, cond PL, cond VL pour les 56', () => {
  assert.equal(ctrl.publicFail, 0);
  conduites.forEach((row) => {
    const half = row.conduiteEvidence.halfSection;
    assert.equal(L.qvFormatPublicLabels(row.publics), `${half}, cond PL, cond VL`);
  });
});

test('séparation C1/B1/B2 et lieux / Stat.Com', () => {
  assert.equal(ctrl.fusedOi, 0);
  programmed.concat(conduites.filter((row) => L.qvDpsSitesOf(row)[0] === 'B2' && /^Caserne /.test(row.location || ''))).forEach((row) => {
    if (L.qvDpsSitesOf(row)[0] !== 'B2') return;
    if (!/^Caserne /.test(String(row.location || ''))) return;
    assert.equal(row.location, 'Caserne C1');
    if (row.label && /Instr/.test(row.label)) assert.equal(row.statCom, row.statCom.includes('012') ? '012B2' : row.statCom);
  });
  programmed.filter((row) => L.qvDpsSitesOf(row)[0] === 'B2').forEach((row) => {
    assert.deepEqual(row.ois, ['B2']);
    assert.equal(row.statCom, '012B2');
    assert.equal(row.location, 'Caserne C1');
  });
});

test('VARIA/FEU demi-sct et sct : Chef section DPS', () => {
  assert.equal(ctrl.responsableFail, 0);
});

test('instructions programmées : samedi CTA, pas PIONNIER, pas de date inventée hors cycle', () => {
  programmed.forEach((row) => {
    const date = String(row.startsAt).slice(0, 10);
    const oi = L.qvDpsSitesOf(row)[0];
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    assert.equal(weekday, 6, date);
    assert.equal(cta.instructionPublicForDate(date, oi, 'demi-section'), row.publics[0]);
    assert.ok(!L.qvIsPionnierRow(row));
    assert.equal(row.provenance, 'MOA_RULE_ANNUAL_PROGRAMMING');
    assert.equal(String(row.startsAt).slice(11, 16), '07:30');
    assert.equal(String(row.endsAt).slice(11, 16), '10:30');
  });
});

test('KICK-OFF 06.02 et PIONNIER non régressés', () => {
  const kick = rows.filter((row) => row.label === 'Instr demi-sct - KICK-OFF');
  assert.equal(kick.length, 4);
  assert.equal(rows.filter((row) => row.label === 'Instr demi-sct - PIONNIER').length, 10);
  const condKick = conduites.filter((row) => String(row.startsAt).startsWith('2027-02-06'));
  assert.equal(L.qvFormatPublicLabels(condKick.find((row) => row.ois[0] === 'G1').publics), 'N04a, cond PL, cond VL');
  ['C1', 'B1', 'B2'].forEach((oi) => {
    assert.equal(L.qvFormatPublicLabels(condKick.find((row) => row.ois[0] === oi).publics), 'N01b, cond PL, cond VL');
  });
});

test('CTA interannuel inchangé (moteur unique)', () => {
  assert.equal(cta.ANCHOR_DATE, '2026-02-13');
  assert.deepEqual([...cta.G1_CYCLE], ['N04b', 'N03b', 'N02b', 'N01b', 'N05a', 'N04a', 'N03a', 'N02a', 'N01a', 'N05b']);
  assert.deepEqual([...cta.OTHER_CYCLE], ['N03b', 'N02b', 'N01b', 'N03a', 'N02a', 'N01a']);
  const logic = fs.readFileSync(path.join(root, 'assets/js/scope-ui-logic.js'), 'utf8');
  assert.ok(!/G1_CYCLE|OTHER_CYCLE|ANCHOR_DATE/.test(logic));
});

test('réconciliation overlay 829', () => {
  const source = canonical.rows.filter((row) => !row.external).length;
  const clones = rows.filter((row) => row.rotationAdded).length;
  const projected = rows.filter((row) => row.projectionAdded).length;
  const prog = rows.filter((row) => row.provenance === 'MOA_RULE_ANNUAL_PROGRAMMING').length;
  const addedCond = rows.filter((row) => row.provenance === 'MOA_RULE_CONDUITE_2027').length;
  const addedDap = rows.filter((row) => row.conduiteRule === 'QV-DAP-001').length;
  assert.equal(source, 622);
  assert.equal(periodic.report.removed, 3);
  assert.equal(clones, 38);
  assert.equal(projected, 108);
  assert.equal(prog, 0);
  assert.equal(addedCond, 52);
  assert.equal(addedDap, 16);
  assert.equal(prAbc.report.added, 0);
  assert.equal(rows.filter((row) => !row.external).length, 622 - 3 + 38 + 108 - 4 + 52 + 16);
});

test('catalogue annuel versionné, QV-CONDUITE-008 active', () => {
  assert.equal(catalog.campaign, '2027');
  assert.ok(catalog.rules.some((rule) => rule.id === 'QV-CONDUITE-008' && rule.active === true));
  assert.ok(catalog.persistence.remainingMigration.includes('scope_quo_vadis_planning_rules'));
});

test('contrôle chiffré : tous les compteurs métier à 0 hors totaux', () => {
  ['reserveConduites', 'orphans', 'oiMismatch', 'nxxMismatch', 'notImmediate',
    'durationFail', 'publicFail', 'fusedOi', 'statComFail', 'lieuFail', 'responsableFail', 'duplicates']
    .forEach((key) => assert.equal(ctrl[key], 0, key));
});

console.log(`\nQV CONDUITES-CANONICAL-CLOSURE-1: ${passed}/${passed + failures.length} PASS`);
if (failures.length) { console.log(`ECHECS: ${failures.join(' | ')}`); process.exit(1); }
