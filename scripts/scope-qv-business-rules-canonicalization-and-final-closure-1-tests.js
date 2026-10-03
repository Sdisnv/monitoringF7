#!/usr/bin/env node
'use strict';

// SCOPE — QUO VADIS — BUSINESS-RULES-CANONICALIZATION-AND-FINAL-CLOSURE-1
// Tests nommés par identifiant de règle canonique. Aucun patch JSON 2027.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'assets/js/scope-ui-logic.js'));
const cta = require(path.join(root, 'netlify/lib/_scope-cta-rules'));
const canonical = require(path.join(root, 'netlify/lib/data/scope-qv-programme-2027.json'));
const history = require(path.join(root, 'netlify/lib/data/scope-qv-history-2026.json'));
const css = fs.readFileSync(path.join(root, 'assets/css/scope.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'assets/js/scope-ui.js'), 'utf8');
const rulesDoc = fs.readFileSync(path.join(root, 'docs/business-rules/quo-vadis-canonical-rules.md'), 'utf8');

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
const conduites = applied.derived.matched.concat(applied.derived.added);

test('QV-CTA-003 : G1 a exactement 10 demi-sections opérationnelles', () => {
  const halves = cta.operationalHalfSections('G1');
  assert.equal(halves.length, 10);
  assert.deepEqual([...halves].sort(), ['N01a', 'N01b', 'N02a', 'N02b', 'N03a', 'N03b', 'N04a', 'N04b', 'N05a', 'N05b']);
  assert.ok(!halves.some((code) => /^N06/.test(code)));
});

test('QV-CTA-004 : C1/B1/B2 ont exactement 6 demi-sections opérationnelles chacun', () => {
  for (const oi of ['C1', 'B1', 'B2']) {
    const halves = cta.operationalHalfSections(oi);
    assert.equal(halves.length, 6, oi);
    assert.deepEqual([...halves].sort(), ['N01a', 'N01b', 'N02a', 'N02b', 'N03a', 'N03b']);
    assert.ok(!halves.some((code) => /^N04/.test(code)));
  }
});

test('QV-CTA-001 : le cycle CTA est perpétuel et unique', () => {
  assert.equal(cta.ANCHOR_DATE, '2026-02-13');
  const logic = fs.readFileSync(path.join(root, 'assets/js/scope-ui-logic.js'), 'utf8');
  assert.ok(!/G1_CYCLE|OTHER_CYCLE|ANCHOR_DATE/.test(logic));
  const jan = cta.instructionPublicForDate('2027-01-02', 'G1', 'demi-section');
  const next = cta.instructionPublicForDate('2028-01-01', 'G1', 'demi-section');
  assert.ok(jan && next);
  assert.notEqual(jan, 'N06a');
});

test('QV-CONDUITE-002 : cible annuelle 56', () => {
  assert.equal(cta.expectedAnnualConduites(), 56);
  assert.equal(applied.derived.expected, 56);
  assert.equal(10 + 6 + 6 + 6, 28);
});

test('QV-CONDUITE-001 / QV-CONDUITE-003 : chaque conduite a une Instr demi-sct source', () => {
  assert.equal(conduites.length, 56);
  for (const row of conduites) {
    const source = rows.find((item) => item.id === row.conduiteEvidence.sourceId);
    assert.ok(source);
    assert.equal(L.qvDpsInstructionKind(source), 'demi-section');
    assert.equal(String(row.startsAt).slice(0, 16), String(source.endsAt).slice(0, 16));
  }
});

test('QV-CONDUITE-005 : public = demi-section, cond PL, cond VL', () => {
  for (const row of conduites) {
    const half = row.conduiteEvidence.halfSection;
    assert.deepEqual(row.publics, [half, 'AUTO:1', 'AUTO:3']);
    assert.equal(L.qvFormatPublicLabels(row.publics), `${half}, cond PL, cond VL`);
  }
});

test('QV-CONDUITE-004 : durée maximale 1 h', () => {
  for (const row of conduites) {
    const minutes = (Number(String(row.endsAt).slice(11, 13)) * 60 + Number(String(row.endsAt).slice(14, 16)))
      - (Number(String(row.startsAt).slice(11, 13)) * 60 + Number(String(row.startsAt).slice(14, 16)));
    assert.ok(minutes > 0 && minutes <= 60);
  }
});

test('QV-CONDUITE-006 : aucune conduite après PIONNIER', () => {
  conduites.forEach((row) => {
    assert.ok(!/PIONNIER/i.test(row.conduiteEvidence.theme));
    const source = rows.find((item) => item.id === row.conduiteEvidence.sourceId);
    assert.ok(!L.qvIsPionnierRow(source));
  });
});

test('QV-CONDUITE-007 : répartition déterministe, sans hasard, identique au 2e passage', () => {
  assert.deepEqual(L.qvSelectSpreadIndices(2, 3), [0, 1]);
  assert.deepEqual(L.qvSelectSpreadIndices(3, 3), [0, 1, 2]);
  assert.deepEqual(L.qvSelectSpreadIndices(10, 3), [0, 5, 9]);
  assert.deepEqual(L.qvSelectSpreadIndices(10, 2), [0, 9]);
  const again = L.qvApplyConduiteContinue(applied.rows, cta.conduiteEngineOptions());
  assert.equal(again.derived.added.length, 0);
  assert.equal(again.derived.matched.length, 56);
  assert.equal((again.derived.programmedInstructions || []).length, 0);
});

test('QV-CONDUITE-008 : historique suffisant, 0 instruction ajoutée, 56 conduites', () => {
  assert.equal((applied.derived.programmedInstructions || []).length, 0);
  assert.equal(applied.derived.insufficient.length, 0);
  assert.equal(applied.derived.materialized, 56);
  const complete = ['G1', 'C1', 'B1', 'B2'].flatMap((oi) => cta.operationalHalfSections(oi).map((half) => `${oi}|${half}`));
  complete.forEach((key) => {
    const n = conduites.filter((row) => `${L.qvDpsSitesOf(row)[0]}|${row.conduiteEvidence.halfSection}` === key).length;
    assert.equal(n, 2, key);
  });
});

test('QV-DPS-001 : aucune fusion C1/B1/B2 sur VARIA et FEU', () => {
  ['Instr demi-sct - VARIA', 'Instr sct - VARIA', 'Instr demi-sct - FEU', 'Instr sct - FEU'].forEach((label) => {
    const fused = rows.filter((row) => row.label === label && L.qvDpsSitesOf(row).length !== 1);
    assert.equal(fused.length, 0, label);
  });
});

test('QV-DPS-002 : B2 conserve OI B2, Stat.Com B2, lieu Caserne C1', () => {
  const sample = rows.filter((row) => (row.label === 'Instr demi-sct - VARIA' || row.label === 'Instr demi-sct - FEU')
    && L.qvDpsSitesOf(row)[0] === 'B2');
  assert.ok(sample.length);
  sample.forEach((row) => {
    assert.deepEqual(row.ois, ['B2']);
    assert.equal(row.statCom, '012B2');
    assert.equal(row.location, 'Caserne C1');
  });
});

test('QV-DPS-003 : aucune Instr sct/demi-sct concernée n’a Responsable = À affecter', () => {
  const labels = [
    'Instr demi-sct - ABC', 'Instr sct - ABC',
    'Instr demi-sct - VARIA', 'Instr sct - VARIA',
    'Instr demi-sct - FEU', 'Instr sct - FEU',
    'Instr demi-sct - PIONNIER', 'Instr sct - PIONNIER CSU-nvb'
  ];
  for (const label of labels) {
    const list = rows.filter((row) => row.label === label);
    assert.ok(list.length, label);
    list.forEach((row) => {
      assert.equal(row.responsible, 'Chef section DPS', `${label} ${row.id}`);
      assert.equal(L.qvResponsableCanonique(row.responsible, { domain: row.domain }), 'Chef section DPS');
    });
  }
});

test('QV-PIONNIER-001/002/003 : FOBA 2, 4 h, 19:15–22:00, pas de régression', () => {
  rows.filter((row) => /^Introduction PIONNIER/i.test(row.label || '')).forEach((row) => {
    assert.ok((row.publics || []).includes('FOBA:2'));
  });
  const demi = rows.filter((row) => row.label === 'Instr demi-sct - PIONNIER');
  assert.equal(demi.length, 10);
  demi.forEach((row) => {
    assert.deepEqual([String(row.startsAt).slice(11, 16), String(row.endsAt).slice(11, 16)], ['07:30', '11:30']);
    assert.equal(row.location, 'Caserne G1');
  });
  const sct = rows.filter((row) => row.label === 'Instr sct - PIONNIER CSU-nvb');
  sct.forEach((row) => assert.deepEqual([String(row.startsAt).slice(11, 16), String(row.endsAt).slice(11, 16)], ['19:15', '22:00']));
});

// QV-PRABC-001 (3 T1 + 3 T4) est abrogée : elle dédoublait chaque séance. 2026 démontre 3 séances.
test('QV-PRABC-003 : 3 séances PR-ABC datées depuis 2026, public PABC, Chef PR', () => {
  const list = rows.filter((row) => row.label === 'Exercice PR-ABC');
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((row) => String(row.startsAt).slice(0, 10)).sort(), ['2027-04-20', '2027-06-09', '2027-10-05']);
  assert.deepEqual(list.map((row) => row.prAbcProposal.quarter).sort(), ['T2', 'T2', 'T4']);
  const morning = list.filter((row) => row.prAbcProposal.morning);
  assert.equal(morning.length, 1);
  assert.equal(morning[0].prAbcProposal.weekday, 'mercredi');
  assert.equal(String(morning[0].startsAt).slice(11, 16), '08:00');
  list.forEach((row) => {
    assert.deepEqual(row.publics, ['PR:3']);
    assert.equal(row.responsible, 'C PR');
    assert.equal(row.sessionCount, 1);
  });
});

test('QV-UI-001 : État = carré 8×8 + texte, sans badge', () => {
  assert.match(css, /--scope-state-swatch-size:\s*8px/);
  assert.match(css, /td:nth-child\(11\) \.scope-state\{display:inline-flex;align-items:center;gap:6px;white-space:nowrap\}/);
  assert.doesNotMatch(css, /td:nth-child\(11\) \.scope-state\{[^}]*background:/);
});

test('QV-UI-002 : actions textuelles non soulignées', () => {
  assert.match(css, /\.qv-programme-action\{[^}]*text-decoration:none!important/);
});

test('aucune réserve utilisée, aucun doublon de conduite, source 2027 intacte', () => {
  conduites.forEach((row) => {
    const site = L.qvDpsSitesOf(row)[0];
    assert.equal(cta.isReserveHalfSection(site, row.conduiteEvidence.halfSection), false);
  });
  const keys = conduites.map((row) => `${row.ois[0]}|${row.startsAt}|${row.conduiteEvidence.halfSection}`);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(canonical.rows.filter((row) => !row.external).length, 622);
  assert.equal(rows.filter((row) => !row.external).length, 829);
});

test('le référentiel canonique documente les identifiants de règles', () => {
  ['QV-CTA-001', 'QV-CTA-002', 'QV-CTA-003', 'QV-CTA-004', 'QV-DPS-001', 'QV-DPS-002', 'QV-DPS-003',
    'QV-CONDUITE-001', 'QV-CONDUITE-002', 'QV-CONDUITE-003', 'QV-CONDUITE-004', 'QV-CONDUITE-005',
    'QV-CONDUITE-006', 'QV-CONDUITE-007', 'QV-CONDUITE-008', 'QV-DPS-006', 'QV-PRABC-003',
    'QV-PROJ-001', 'QV-PERIOD-001', 'QV-DAP-001', 'QV-PIONNIER-001', 'QV-UI-001', 'QV-UI-005', 'QV-UI-006'].forEach((id) => {
    assert.ok(rulesDoc.includes(id), id);
  });
  assert.match(ui, /const roundTrip = state\.quoVadisProgrammeContextActive === true;/);
});

console.log(`\nQV BUSINESS-RULES-CANONICALIZATION-AND-FINAL-CLOSURE-1: ${passed}/${passed + failures.length} PASS`);
if (failures.length) { console.log(`ECHECS: ${failures.join(' | ')}`); process.exit(1); }
