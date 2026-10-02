#!/usr/bin/env node
'use strict';

// SCOPE — QV-DPS-OI-SEPARATION-AND-CONDUITE-CLOSURE-1
// Preuves : séparation C1/B1/B2, Stat.Com/lieu par OI, publics CTA, 12 conduites sourcées, PR-ABC, État.

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

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${passed} - ${name}`); }
  catch (error) { failures.push(name); console.log(`FAIL - ${name}\n  ${error.message}`); }
}

const rotation = L.qvDistributeRotationOccurrences(canonical.rows, history.rows, cta.instructionPublicForDate);
const pionnier = L.qvApplyPionnierRules(rotation.rows);
const family = L.qvApplyDpsInstructionFamilyRules(pionnier.rows, cta.instructionPublicForDate);
const applied = L.qvApplyConduiteContinue(family.rows, cta.conduiteEngineOptions());
const prAbc = L.qvApplyPrAbcStructure(applied.rows, history.rows);
const rows = prAbc.rows;

const of = (label) => rows
  .filter((row) => (row.label || row.title) === label && row.provenance !== 'MOA_RULE_ANNUAL_PROGRAMMING')
  .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt))
    || String((a.ois || [])[0]).localeCompare(String((b.ois || [])[0])));

function assertDpsSeparated(label, expected) {
  const list = of(label);
  const fused = list.filter((row) => L.qvDpsSitesOf(row).length !== 1);
  assert.equal(fused.length, 0, `${label} : OI fusionné ${JSON.stringify((fused[0] || {}).ois)}`);
  const byOi = {};
  for (const row of list) {
    const oi = L.qvDpsSitesOf(row)[0];
    byOi[oi] = (byOi[oi] || 0) + 1;
    assert.equal(row.ois.length, 1);
    if (/^012/.test(String(row.statCom || ''))) {
      assert.equal(row.statCom, `012${oi}`, `${label} ${oi} Stat.Com ${row.statCom}`);
      assert.ok(!((oi !== 'B1') && row.statCom === '012B1'), `${label} ${oi} recopié 012B1`);
    }
    const expectedLieu = `Caserne ${L.qvDpsDefaultLieuCode(oi)}`;
    assert.equal(row.location, expectedLieu, `${label} ${oi} lieu ${row.location}`);
    const section = (row.publics || []).find((code) => /^N0[1-6][ab]?$/.test(code));
    const derived = cta.instructionPublicForDate(
      String(row.startsAt).slice(0, 10), oi, L.qvDpsInstructionKind(row), L.qvIsPionnierRow(row)
    );
    assert.equal(section, derived, `${label} ${oi} ${row.startsAt} public ${section} vs CTA ${derived}`);
    assert.ok(section && section !== 'À définir');
  }
  assert.deepEqual(byOi, expected, `${label} cardinalité ${JSON.stringify(byOi)}`);
  for (const [oi, count] of Object.entries(expected)) {
    const series = list.filter((row) => L.qvDpsSitesOf(row)[0] === oi);
    assert.equal(series.length, count);
    if (count > 1) {
      assert.ok(new Set(series.map((row) => String(row.startsAt).slice(0, 10))).size > 1, `${label} ${oi} même date`);
      const publics = series.map((row) => (row.publics || []).find((code) => /^N0/.test(code)));
      assert.ok(new Set(publics).size > 1, `${label} ${oi} même public`);
    }
  }
}

test('VARIA demi-sct : une réalisation par OI, sans tableau OI fusionné', () => {
  assertDpsSeparated('Instr demi-sct - VARIA', { G1: 10, C1: 6, B1: 6, B2: 6 });
});

test('VARIA sct : B2 conserve deux tours historiques démontrés, sans invention du troisième', () => {
  assertDpsSeparated('Instr sct - VARIA', { G1: 5, C1: 3, B1: 3, B2: 2 });
});

test('FEU demi-sct : C1, B1 et B2 distincts, B2 à la Caserne C1', () => {
  assertDpsSeparated('Instr demi-sct - FEU', { C1: 6, B1: 6, B2: 6 });
});

test('FEU sct : B2 conserve deux tours historiques démontrés', () => {
  assertDpsSeparated('Instr sct - FEU', { C1: 3, B1: 3, B2: 2 });
});

test('ABC G1 reste une rotation datée sans fusion ni date unique', () => {
  const list = of('Instr demi-sct - ABC');
  assert.equal(list.length, 10);
  assert.equal(new Set(list.map((row) => String(row.startsAt).slice(0, 10))).size, 10);
  list.forEach((row) => {
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
    assert.equal(row.location, 'Caserne G1');
    assert.equal(row.statCom, '0164F7');
  });
  assert.equal(of('Instr sct - ABC').length, 5);
});

test('PIONNIER ne régresse pas : G1, Caserne G1, FOBA 2, 4 h, 19:15-22:00', () => {
  const intro = rows.filter((row) => /^Introduction PIONNIER/i.test(row.label || ''));
  assert.ok(intro.length);
  intro.forEach((row) => {
    assert.ok((row.publics || []).includes('FOBA:2'));
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
  });
  const demi = of('Instr demi-sct - PIONNIER');
  assert.equal(demi.length, 10);
  demi.forEach((row) => {
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
    assert.equal(row.location, 'Caserne G1');
    assert.deepEqual(horairesOf(row), ['07:30', '11:30']);
  });
  const sct = of('Instr sct - PIONNIER CSU-nvb');
  assert.equal(sct.length, 5);
  sct.forEach((row) => {
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
    assert.equal(row.location, 'Caserne G1');
    assert.deepEqual(horairesOf(row), ['19:15', '22:00']);
  });
});

function horairesOf(row) {
  return [String(row.startsAt).slice(11, 16), String(row.endsAt).slice(11, 16)];
}

test('KICK-OFF du 06.02.2027 reste inchangé', () => {
  const kick = of('Instr demi-sct - KICK-OFF');
  assert.equal(kick.length, 4);
  const byOi = Object.fromEntries(kick.map((row) => [L.qvDpsSitesOf(row)[0], row]));
  assert.equal(String(byOi.G1.startsAt), '2027-02-06T07:30');
  assert.equal(byOi.G1.location, 'L-G1');
  assert.equal(byOi.C1.location, 'L-C1');
  assert.equal(byOi.B1.location, 'L-B1');
  assert.equal(byOi.B2.location, 'L-C1');
  assert.equal(byOi.B2.statCom, '012B2');
  kick.forEach((row) => {
    assert.equal(row.provenance, 'SOURCE_2027_EXPLICIT');
    assert.ok(!row.rotationStatus);
  });
});

test('cible 84 conduites, 84 matérialisées, chacune rattachée à une demi-section source', () => {
  const conduites = applied.derived.matched.concat(applied.derived.added);
  assert.equal(applied.derived.expected, 84);
  assert.equal(conduites.length, 84);
  assert.equal(applied.derived.insufficient.length, 0);
  const parSite = {};
  for (const row of conduites) {
    const site = L.qvDpsSitesOf(row)[0];
    parSite[site] = (parSite[site] || 0) + 1;
    assert.equal(row.statCom, '0152F7');
    assert.ok((row.publics || []).includes('AUTO:3'));
    assert.ok((row.publics || []).includes('AUTO:1'));
    const half = row.conduiteEvidence.halfSection;
    assert.equal(row.publics[0], half);
    const source = rows.find((item) => item.id === row.conduiteEvidence.sourceId);
    assert.ok(source, `source absente ${row.id}`);
    assert.equal(L.qvDpsInstructionKind(source), 'demi-section');
    assert.ok(!L.qvIsPionnierRow(source));
    assert.equal(L.qvDpsSitesOf(source)[0], site);
    assert.equal(String(row.startsAt).slice(0, 16), String(source.endsAt).slice(0, 16));
    assert.equal(String(row.startsAt).slice(0, 10), String(source.startsAt).slice(0, 10));
    assert.equal(row.location, source.location);
    const minutes = (Number(String(row.endsAt).slice(11, 13)) * 60 + Number(String(row.endsAt).slice(14, 16)))
      - (Number(String(row.startsAt).slice(11, 13)) * 60 + Number(String(row.startsAt).slice(14, 16)));
    assert.ok(minutes > 0 && minutes <= 60);
  }
  assert.deepEqual(parSite, { G1: 30, C1: 18, B1: 18, B2: 18 });
});

test('PR-ABC : deux séries T1/T4 de trois séances, séance 2 en matinée, sans date inventée', () => {
  const list = rows.filter((row) => row.label === 'Exercice PR-ABC');
  assert.equal(list.length, 6);
  const t1 = list.filter((row) => row.prAbcProposal.quarter === 'T1');
  const t4 = list.filter((row) => row.prAbcProposal.quarter === 'T4');
  assert.equal(t1.length, 3);
  assert.equal(t4.length, 3);
  for (const series of [t1, t4]) {
    const sessions = series.map((row) => row.sessionIndex).sort();
    assert.deepEqual(sessions, [1, 2, 3]);
    series.forEach((row) => {
      assert.equal(row.sessionCount, 3);
      assert.equal(row.domain, 'PR');
      assert.ok((row.publics || []).includes('PR:3'));
      assert.equal(row.statCom, '0164F7');
      assert.equal(row.startsAt, null);
      assert.equal(row.prAbcStatus, 'MOA_PROPOSAL_NO_DEMONSTRATED_T1_T4_CALENDAR');
    });
    const session2 = series.find((row) => row.sessionIndex === 2);
    assert.equal(session2.prAbcProposal.session2Morning, true);
    assert.equal(session2.prAbcProposal.preferredWeekday, 'mercredi');
    assert.equal(session2.prAbcProposal.proposedStart, '08:00');
  }
  assert.equal(prAbc.report.t1Historical, 0);
  assert.equal(prAbc.report.t4Historical, 1);
});

test('colonne État : carré canonique 8×8, inline-flex, sans badge ni capsule', () => {
  assert.match(css, /--scope-state-swatch-size:\s*8px/);
  assert.match(css, /--scope-state-positive:\s*#2f9e5a/);
  assert.match(css, /--scope-red:\s*#DE000A/);
  assert.match(css, /--scope-state-attention:\s*#c98412/);
  assert.match(css, /--scope-state-info:\s*#4f84d6/);
  assert.match(css, /--scope-state-inactive:\s*#8b949e/);
  assert.match(css, /\.qv-programme-col-11\{width:9%\}/);
  assert.match(css, /td:nth-child\(11\) \.scope-state\{display:inline-flex;align-items:center;gap:6px;white-space:nowrap\}/);
  assert.doesNotMatch(css, /td:nth-child\(11\) \.scope-state-label span\{white-space:normal\}/);
  assert.doesNotMatch(css, /td:nth-child\(11\) \.scope-state\{[^}]*display:grid/);
  assert.doesNotMatch(css, /td:nth-child\(11\) \.scope-state\{[^}]*background:/);
  assert.match(ui, /function scopeStateHtml\(tone, label\)/);
  assert.match(ui, /qvActivityStateHtml\(row\) \{\s*const current = qvAgendaState\(row\);\s*return scopeStateHtml\(current\.tone, current\.label\);/);
});

test('filtres au retour de fiche et DnD CTA inchangés', () => {
  assert.match(ui, /const roundTrip = state\.quoVadisProgrammeContextActive === true;/);
  assert.equal(L.qvProgrammeDragLock({ definitionId: 'CTA-PERMANENCE' }), 'CTA_PERMANENCE');
});

test('le fichier source 2027 reste à 622 séances', () => {
  assert.equal(canonical.rows.filter((row) => !row.external).length, 622);
  assert.equal(rows.filter((row) => !row.external).length, 767);
});

console.log(`\nQV DPS-OI-SEPARATION-AND-CONDUITE-CLOSURE-1: ${passed}/${passed + failures.length} PASS`);
if (failures.length) { console.log(`ECHECS: ${failures.join(' | ')}`); process.exit(1); }
