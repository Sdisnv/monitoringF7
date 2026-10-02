#!/usr/bin/env node
'use strict';

// SCOPE — QUO VADIS — SECTION-ROTATION-CLOSURE-1
// Tests ciblés de la matérialisation des instructions section / demi-section.
// Chacun de ces tests échoue contre le comportement antérieur (effondrement des N occurrences
// d'une définition sur la première date historique rencontrée).

const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'assets/js/scope-ui-logic.js'));
const cta = require(path.join(root, 'netlify/lib/_scope-cta-rules'));
const canonical = require(path.join(root, 'netlify/lib/data/scope-qv-programme-2027.json'));
const history = require(path.join(root, 'netlify/lib/data/scope-qv-history-2026.json'));

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
const rows = applied.rows;

const occurrences = (label) => rows
  .filter((row) => (row.label || row.title) === label)
  .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)) || String((a.ois || [])[0]).localeCompare(String((b.ois || [])[0])));
const dates = (label) => occurrences(label).map((row) => String(row.startsAt).slice(0, 10));
const sections = (label) => occurrences(label).flatMap((row) => (row.publics || []).filter((code) => /^N0[1-6][ab]?$/.test(code)));
const horaires = (label) => [...new Set(occurrences(label).map((row) => `${String(row.startsAt).slice(11, 16)}-${String(row.endsAt).slice(11, 16)}`))];
const ctaPublic = (row) => cta.instructionPublicForDate(
  String(row.startsAt).slice(0, 10),
  L.qvDpsSitesOf(row)[0],
  L.qvDpsInstructionKind(row),
  L.qvIsPionnierRow(row)
);

// ------------------------------------------------------------------ §18.1 ABC

test('ABC demi-sct : dix occurrences sur dix dates et dix demi-sections distinctes', () => {
  assert.equal(occurrences('Instr demi-sct - ABC').length, 10);
  // Interdit : dix occurrences sur la même date portant toutes N05a.
  assert.equal(new Set(dates('Instr demi-sct - ABC')).size, 10);
  assert.equal(new Set(sections('Instr demi-sct - ABC')).size, 10);
  assert.deepEqual(horaires('Instr demi-sct - ABC'), ['07:30-10:30']);
});

test('ABC demi-sct : rotation G1 conforme au cycle CTA de permanence', () => {
  occurrences('Instr demi-sct - ABC').forEach((row) => {
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
    assert.equal(row.location, 'Caserne G1');
    assert.equal((row.publics || []).filter((code) => /^N0/.test(code))[0], ctaPublic(row));
  });
});

test('ABC sct : cinq occurrences sur cinq dates et cinq sections distinctes', () => {
  assert.equal(occurrences('Instr sct - ABC').length, 5);
  assert.equal(new Set(dates('Instr sct - ABC')).size, 5);
  occurrences('Instr sct - ABC').forEach((row) => {
    assert.equal((row.publics || []).filter((code) => /^N0/.test(code))[0], ctaPublic(row));
  });
  assert.equal(new Set(sections('Instr sct - ABC')).size, 5);
  // L'horaire propre à l'instruction de section ABC (soirée) n'est pas aligné sur la demi-section.
  assert.deepEqual(horaires('Instr sct - ABC'), ['18:30-21:30']);
});

// -------------------------------------------------------------- §18.2 PIONNIER

test('PIONNIER demi-sct : dix occurrences sur dix dates et dix demi-sections distinctes', () => {
  assert.equal(occurrences('Instr demi-sct - PIONNIER').length, 10);
  // Interdit : dix occurrences sur la même date portant toutes la même demi-section.
  assert.equal(new Set(dates('Instr demi-sct - PIONNIER')).size, 10);
  assert.equal(new Set(sections('Instr demi-sct - PIONNIER')).size, 10);
});

test('PIONNIER demi-sct : site G1, Caserne G1 et durée de quatre heures', () => {
  assert.deepEqual(horaires('Instr demi-sct - PIONNIER'), ['07:30-11:30']);
  occurrences('Instr demi-sct - PIONNIER').forEach((row) => {
    assert.deepEqual(L.qvDpsSitesOf(row), ['G1']);
    assert.equal(row.location, 'Caserne G1');
  });
});

test('PIONNIER sct CSU-nvb : cinq occurrences sur cinq dates et cinq sections distinctes', () => {
  assert.equal(occurrences('Instr sct - PIONNIER CSU-nvb').length, 5);
  // Interdit : cinq occurrences sur la même date portant toutes N06.
  assert.equal(new Set(dates('Instr sct - PIONNIER CSU-nvb')).size, 5);
  occurrences('Instr sct - PIONNIER CSU-nvb').forEach((row) => {
    assert.equal((row.publics || []).filter((code) => /^N0/.test(code))[0], ctaPublic(row));
  });
  assert.equal(new Set(sections('Instr sct - PIONNIER CSU-nvb')).size, 5);
  // Horaire décalé pour permettre la présence du personnel ambulancier CSU-nvb.
  assert.deepEqual(horaires('Instr sct - PIONNIER CSU-nvb'), ['19:15-22:00']);
});

test('Introduction PIONNIER conserve le public FOBA 2 sans régression', () => {
  const intro = rows.filter((row) => /^Introduction PIONNIER/i.test(row.label || ''));
  assert.ok(intro.length);
  intro.forEach((row) => assert.ok((row.publics || []).includes('FOBA:2')));
});

// ------------------------------------------------------------ §18.3 VARIA / FEU

test('VARIA et FEU sont répartis sur autant de réalisations OI que de tours démontrés', () => {
  assert.equal(occurrences('Instr demi-sct - VARIA').length, 28);
  assert.equal(new Set(dates('Instr demi-sct - VARIA')).size, 16);
  assert.equal(occurrences('Instr sct - VARIA').length, 13);
  assert.equal(new Set(dates('Instr sct - VARIA')).size, 8);
  assert.equal(occurrences('Instr demi-sct - FEU').length, 18);
  assert.equal(new Set(dates('Instr demi-sct - FEU')).size, 6);
  assert.equal(occurrences('Instr sct - FEU').length, 8);
  assert.equal(new Set(dates('Instr sct - FEU')).size, 3);
});

test('VARIA conserve deux horaires métier distincts selon le site', () => {
  const g1 = occurrences('Instr sct - VARIA').filter((row) => L.qvDpsSitesOf(row).includes('G1'));
  const autres = occurrences('Instr sct - VARIA').filter((row) => !L.qvDpsSitesOf(row).includes('G1'));
  assert.equal(g1.length, 5);
  assert.equal(autres.length, 8);
  assert.equal(autres.filter((row) => L.qvDpsSitesOf(row)[0] === 'C1').length, 3);
  assert.equal(autres.filter((row) => L.qvDpsSitesOf(row)[0] === 'B1').length, 3);
  assert.equal(autres.filter((row) => L.qvDpsSitesOf(row)[0] === 'B2').length, 2);
  g1.forEach((row) => assert.equal(String(row.startsAt).slice(11, 16), '18:30'));
  autres.forEach((row) => assert.equal(String(row.startsAt).slice(11, 16), '07:30'));
});

// ------------------------------------------------- §18.4 cohérence date ↔ section

test('chaque occurrence répartie porte une date et une section mutuellement cohérentes', () => {
  const reparties = rows.filter((row) => row.rotationStatus === 'DISTRIBUTED');
  assert.ok(reparties.length >= 66);
  reparties.forEach((row) => {
    assert.match(String(row.startsAt), /^2027-\d{2}-\d{2}T\d{2}:\d{2}/);
    const preuve = row.rotationEvidence;
    // La date 2027 est exactement la date 2026 démontrée décalée de 52 semaines : aucune date inventée.
    assert.equal(L.qvShiftHistoricalDate(preuve.date2026), String(row.startsAt).slice(0, 10));
    assert.equal(preuve.shiftDays, L.QV_HISTORICAL_SHIFT_DAYS);
    assert.ok(preuve.sourceLines.length);
    const portees = (row.publics || []).filter((code) => /^N0[1-6][ab]?$/.test(code));
    assert.equal(portees[0], preuve.sectionCta);
    assert.equal(portees[0], ctaPublic(row));
  });
});

test('aucune occurrence section ou demi-section ne reste collée à un autre tour', () => {
  const groupes = new Map();
  for (const row of rows) {
    if (!L.qvDpsInstructionKind(row) || row.provenance === 'SOURCE_2027_EXPLICIT' || !row.startsAt) continue;
    const key = `${row.label || row.title}|${String(row.startsAt).slice(0, 16)}|${L.qvDpsSitesOf(row)[0] || ''}`;
    groupes.set(key, (groupes.get(key) || 0) + 1);
  }
  for (const [label, count] of groupes) {
    assert.equal(count, 1, `${label} : occurrence en doublon de tour OI`);
  }
});

// -------------------------------------------------------- §18.5 KICK-OFF intact

test('KICK-OFF du 06.02.2027 reste strictement identique au résultat recetté PASS', () => {
  const kick = rows.filter((row) => (row.label || '') === 'Instr demi-sct - KICK-OFF');
  assert.equal(kick.length, 4);
  kick.forEach((row) => {
    assert.equal(String(row.startsAt).slice(0, 10), '2027-02-06');
    assert.equal(row.provenance, 'SOURCE_2027_EXPLICIT');
    // Source 2027 explicite : la rotation historique ne doit jamais s'y substituer.
    assert.ok(!row.rotationStatus);
  });
  assert.deepEqual(kick.map((row) => L.qvDpsSitesOf(row)[0]).sort(), ['B1', 'B2', 'C1', 'G1']);
});

// ---------------------------------------------------- §18.6 conduites recalculées

test('les conduites 0152F7 sont matérialisées après correction des sources, sans invention', () => {
  const derived = applied.derived;
  assert.equal(derived.expected, 84);
  assert.equal(derived.materialized, 60);
  assert.equal(derived.insufficient.length, 24);
  assert.equal(derived.orphans.length, 0);
  const conduites = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL || row.label === 'Conduite, formation continue');
  assert.equal(conduites.length, 60);
  conduites.forEach((row) => {
    assert.equal(row.statCom, L.QV_CONDUITE_STATCOM);
    const minutes = (Number(String(row.endsAt).slice(11, 13)) * 60 + Number(String(row.endsAt).slice(14, 16)))
      - (Number(String(row.startsAt).slice(11, 13)) * 60 + Number(String(row.startsAt).slice(14, 16)));
    assert.ok(minutes > 0 && minutes <= 60);
  });
});

test('la matrice des conduites vise trois séances par demi-section opérationnelle', () => {
  const parHalf = {};
  for (const row of applied.derived.matched.concat(applied.derived.added)) {
    const site = L.qvDpsSitesOf(row)[0];
    const half = row.conduiteEvidence.halfSection;
    const key = `${site}|${half}`;
    parHalf[key] = (parHalf[key] || 0) + 1;
    assert.ok(!cta.isReserveHalfSection(site, half), key);
  }
  assert.equal(Object.keys(parHalf).length, 28);
  Object.values(parHalf).forEach((count) => assert.ok(count >= 2 && count <= 3));
});

test('aucune conduite n’est jamais ajoutée après une instruction PIONNIER', () => {
  const conduites = applied.derived.matched.concat(applied.derived.added);
  conduites.forEach((row) => assert.ok(!/PIONNIER/i.test(row.conduiteEvidence.theme)));
  const pionnierIds = new Set(occurrences('Instr demi-sct - PIONNIER').concat(occurrences('Instr sct - PIONNIER CSU-nvb')).map((row) => row.id));
  conduites.forEach((row) => assert.ok(!pionnierIds.has(row.conduiteEvidence.sourceId)));
});

test('les conduites B2 se tiennent à la Caserne C1 sans transformation automatique du lieu', () => {
  const b2 = applied.derived.matched.concat(applied.derived.added).filter((row) => L.qvDpsSitesOf(row)[0] === 'B2');
  assert.equal(b2.length, 13);
  b2.forEach((row) => assert.ok(!/B2/.test(String(row.location)), `lieu inattendu ${row.location}`));
  const b1 = applied.derived.added.filter((row) => L.qvDpsSitesOf(row)[0] === 'B1');
  b1.forEach((row) => assert.equal(row.location, 'Caserne B1'));
});

// ------------------------------------------- §16 réalignement et décisions humaines

test('le réalignement est idempotent au deuxième passage', () => {
  const second = L.qvDistributeRotationOccurrences(rows, history.rows, cta.instructionPublicForDate);
  assert.equal(second.report.reduce((total, entry) => total + entry.changes.length, 0), 0);
  assert.equal(second.report.reduce((total, entry) => total + (entry.added || 0), 0), 0);
  const encore = L.qvApplyConduiteContinue(L.qvApplyPionnierRules(second.rows).rows);
  assert.equal(encore.derived.added.length, 0);
  assert.equal(encore.rows.length, rows.length);
});

test('une décision humaine explicite est préservée et jamais réalignée', () => {
  const cible = canonical.rows.find((row) => (row.label || '') === 'Instr demi-sct - ABC');
  const protege = canonical.rows.map((row) => (row.id === cible.id ? { ...row, metadata: { ...(row.metadata || {}), humanDecision: true } } : row));
  const resultat = L.qvDistributeRotationOccurrences(protege, history.rows, cta.instructionPublicForDate);
  const apres = resultat.rows.find((row) => row.id === cible.id);
  assert.equal(apres.rotationStatus, 'HUMAN_DECISION');
  assert.equal(apres.startsAt, cible.startsAt);
  assert.equal(resultat.report.find((entry) => entry.label === 'Instr demi-sct - ABC').protected, 1);
});

test('aucune date n’est inventée : un tour non démontré reste MOA_REQUIRED', () => {
  const kick = rotation.report.find((entry) => entry.label === 'Instr sct - KICK-OFF');
  assert.equal(kick.occurrences, 9);
  assert.equal(kick.buckets, 13);
  assert.equal(kick.added, 4);
  assert.equal(kick.unmapped.length, 0);
  const extra = {
    id: 'QV27:SYNTHETIC:UNMAPPED',
    definitionId: 'QV26-INSTR-DEMI-SCT-ABC-C49C7121',
    label: 'Instr demi-sct - ABC',
    ois: ['G1'],
    publics: [],
    provenance: 'CTA_RULE+HISTORICAL_2026'
  };
  const surplus = L.qvDistributeRotationOccurrences(canonical.rows.concat(extra), history.rows, cta.instructionPublicForDate);
  const orpheline = surplus.rows.find((row) => row.id === extra.id);
  assert.equal(orpheline.rotationStatus, 'MOA_REQUIRED');
  assert.equal(orpheline.rotationRule, 'ROTATION_TOUR_NON_DEMONTRE');
  assert.ok(!orpheline.startsAt);
});

test('la génération 2028 n’est pas déclenchée par ce lot', () => {
  assert.ok(!rows.some((row) => /^(2028|2029)-/.test(String(row.startsAt || ''))));
});

console.log(`\nQV SECTION-ROTATION-CLOSURE-1: ${passed}/${passed + failures.length} PASS`);
if (failures.length) { console.log(`ECHECS: ${failures.join(' | ')}`); process.exit(1); }
