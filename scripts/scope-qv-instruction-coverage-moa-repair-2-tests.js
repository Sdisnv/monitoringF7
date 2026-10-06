#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { createFixture } = require('./scope-qv-local-fixture');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const history = require('../netlify/lib/data/scope-qv-history-2026.json');
const source = require('../netlify/lib/data/scope-qv-programme-2027.json');
const rules = require('../netlify/lib/data/scope-qv-canonical-annual-rules.json');

let passed = 0;
function test(label, check) {
  check();
  passed += 1;
  console.log(`PASS ${passed} - ${label}`);
}
async function testAsync(label, check) {
  await check();
  passed += 1;
  console.log(`PASS ${passed} - ${label}`);
}
const active = (programme) => programme.rows.filter((row) => row && !row.external);
const theme = (row) => L.qvInstructionTheme(row).startsWith('PIONNIER') ? 'PIONNIER' : L.qvInstructionTheme(row);
const day = (row) => String(row.startsAt || '').slice(0, 10);
const publicCode = (row) => (row.publics || []).find((code) => /^N0[1-6][ab]?$/.test(code)) || '';
const instructions = (rows) => rows.filter((row) => L.qvDpsInstructionKind(row));
const conduites = (rows) => rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === L.QV_CONDUITE_STATCOM);
const group = (rows, site, name, kind) => rows.filter((row) => L.qvDpsSitesOf(row)[0] === site
  && theme(row) === name && (!kind || L.qvDpsInstructionKind(row) === kind));
const options = (year, extra = {}) => ({ year, versions: rules.annualDpsInstructionVersions,
  ctaResolver: cta.instructionPublicForDate, operationalHalvesForOi: cta.operationalHalfSections, ...extra });

async function main() {
  const qv27 = (await createFixture(null).service.listProgramme(2027)).canonicalProgramme;
  const rows = active(qv27);
  const instr = instructions(rows);
  const drives = conduites(rows);
  const control = L.qvDpsInstructionCoverageControl(rows, options(2027));
  const coverage = qv27.businessRules.instructionCoverage;

  test('13 couples site/theme couverts sans ligne manquante ni doublon', () => {
    assert.equal(control.table.length, 13);
    assert.equal(control.pass, true);
    assert.ok(control.table.every((item) => item.pass && !item.missingHalves.length && !item.missingSections.length));
  });
  test('KICK-OFF = 42 instructions, 28 demi-sections et 14 sections', () => {
    const kick = instr.filter((row) => theme(row) === 'KICK-OFF');
    assert.equal(kick.length, 42);
    assert.equal(kick.filter((row) => L.qvDpsInstructionKind(row) === 'demi-section').length, 28);
    assert.equal(kick.filter((row) => L.qvDpsInstructionKind(row) === 'section').length, 14);
  });
  test('G1 KICK-OFF couvre dix demi-sections et cinq sections', () => {
    assert.equal(group(instr, 'G1', 'KICK-OFF', 'demi-section').length, 10);
    assert.equal(group(instr, 'G1', 'KICK-OFF', 'section').length, 5);
  });
  test('C1, B1 et B2 KICK-OFF couvrent chacun six demi-sections et trois sections', () => {
    for (const site of ['C1', 'B1', 'B2']) {
      assert.equal(group(instr, site, 'KICK-OFF', 'demi-section').length, 6);
      assert.equal(group(instr, site, 'KICK-OFF', 'section').length, 3);
    }
  });
  test('ABC, VARIA, FEU et PIONNIER ont aussi leur couverture complète', () => {
    for (const item of control.table.filter((row) => row.theme !== 'KICK-OFF')) {
      assert.equal(item.actualHalf, item.expectedHalf);
      assert.equal(item.actualSection, item.expectedSection);
    }
    assert.equal(instr.length, 141);
  });
  test('quatre sources explicites du 06.02.2027 gardent leurs identifiants', () => {
    const originals = source.rows.filter((row) => row.provenance === 'SOURCE_2027_EXPLICIT'
      && L.qvInstructionTheme(row) === 'KICK-OFF' && L.qvDpsInstructionKind(row) === 'demi-section');
    assert.equal(originals.length, 4);
    originals.forEach((row) => {
      const current = rows.find((item) => item.id === row.id);
      assert.ok(current);
      assert.equal(day(current), '2027-02-06');
      assert.equal(publicCode(current), cta.instructionPublicForDate(day(current), L.qvDpsSitesOf(current)[0], 'demi-section'));
    });
  });
  test('la cadence KICK-OFF complète les samedis de février à avril', () => {
    const g1 = group(instr, 'G1', 'KICK-OFF', 'demi-section').map(day).sort();
    const other = group(instr, 'C1', 'KICK-OFF', 'demi-section').map(day).sort();
    assert.deepEqual(g1, ['2027-02-06', '2027-02-13', '2027-02-20', '2027-02-27', '2027-03-06',
      '2027-03-13', '2027-03-20', '2027-03-27', '2027-04-03', '2027-04-10']);
    assert.deepEqual(other, g1.slice(0, 6));
  });
  test('la section Nxx suit Nxxa et Nxxb, avec entrelacement historique autorisé', () => {
    assert.ok(control.table.every((item) => item.ownOrder));
    const g1 = group(instr, 'G1', 'KICK-OFF');
    const firstSection = g1.filter((row) => L.qvDpsInstructionKind(row) === 'section')
      .map(day).sort()[0];
    const lastHalf = g1.filter((row) => L.qvDpsInstructionKind(row) === 'demi-section')
      .map(day).sort().at(-1);
    assert.ok(firstSection < lastHalf);
  });
  test('un thème suivant ne commence qu après la fin du précédent dans son site', () => {
    assert.ok(control.table.every((item) => item.themeOrder));
  });
  test('tous les publics non-PIONNIER proviennent du CTA continu', () => {
    assert.ok(control.table.every((item) => item.ctaPass));
    instr.filter((row) => !L.qvIsPionnierRow(row)).forEach((row) => {
      assert.equal(publicCode(row), cta.instructionPublicForDate(day(row), L.qvDpsSitesOf(row)[0],
        L.qvDpsInstructionKind(row), false), row.id);
    });
  });
  test('aucune réserve N06 G1 ni N04 C1/B1/B2', () => {
    instr.forEach((row) => assert.equal(cta.isReserveHalfSection(L.qvDpsSitesOf(row)[0], publicCode(row)), false));
  });
  test('27 lignes seulement ajoutées au générateur, sans nouveau faux historique', () => {
    assert.equal(coverage.added.length, 27);
    assert.equal(rows.filter((row) => row.coverageAdded).length, 27);
    assert.ok(rows.filter((row) => row.coverageAdded).every((row) => row.provenance === 'MOA_RULE_INSTRUCTION_COVERAGE'
      && row.coverageEvidence.sourceLine2026 && !row.historicalProposal));
    assert.equal(rows.filter((row) => row.historicalProposal).length, 636);
  });
  test('Programme et Agenda 2027 partagent 850 lignes datees', () => {
    assert.equal(rows.length, 850);
    assert.equal(qv27.target.sessions, rows.length);
    assert.equal(rows.filter((row) => row.startsAt).length, 850);
    assert.equal(rows.filter((row) => !row.startsAt).length, 0);
  });
  test('conduite DPS couvre chaque demi-section deux fois, 56 au total', () => {
    assert.equal(drives.length, 56);
    for (const site of L.QV_DPS_SITES) {
      assert.equal(drives.filter((row) => L.qvDpsSitesOf(row)[0] === site).length, cta.operationalHalfSections(site).length * 2);
      for (const half of cta.operationalHalfSections(site)) assert.equal(drives.filter((row) => L.qvDpsSitesOf(row)[0] === site && row.publics.includes(half)).length, 2);
    }
    assert.equal(L.qvConduiteCoherenceControl(rows, cta.conduiteEngineOptions()).pass, true);
  });
  test('chaque conduite suit sa vraie demi-section et dure au plus une heure', () => {
    drives.forEach((row) => {
      const parent = instr.find((item) => item.id === row.conduiteEvidence.sourceId);
      assert.ok(parent && L.qvDpsInstructionKind(parent) === 'demi-section', row.id);
      assert.equal(row.startsAt.slice(0, 16), parent.endsAt.slice(0, 16));
      assert.deepEqual(row.publics, [publicCode(parent), 'AUTO:1', 'AUTO:3']);
      assert.ok(Date.parse(`${row.endsAt.slice(0, 16)}:00Z`) - Date.parse(`${row.startsAt.slice(0, 16)}:00Z`) <= 3600000);
    });
  });
  test('PIONNIER reste a quinze occurrences hors astreinte N et N-1', () => {
    const pionnier = instr.filter(L.qvIsPionnierRow);
    assert.equal(pionnier.length, 15);
    assert.ok(pionnier.every((row) => L.qvPionnierCtaCheck(row, cta.instructionPublicForDate).pass));
    assert.equal(pionnier.map(day).sort().at(-1), '2027-12-13');
  });
  await testAsync('2028 et 2029 conservent couverture et conduite avec 250 lignes datees', async () => {
    for (const year of [2028, 2029]) {
      const qv = (await createFixture(null).service.listProgramme(year)).canonicalProgramme;
      const annualRows = active(qv);
      assert.equal(annualRows.length, 250);
      assert.equal(annualRows.filter((row) => row.startsAt).length, 250);
      assert.equal(instructions(annualRows).length, 141);
      assert.equal(conduites(annualRows).length, 56);
      assert.equal(qv.annualInstructionRules.coverage.pass, true);
      assert.equal(qv.annualInstructionRules.missing.length, 0);
    }
  });
  test('une structure C1 reduite en 2029 ajuste chaque theme sans modifier 2028', () => {
    const changed = JSON.parse(JSON.stringify(rules.annualDpsInstructionVersions[0]));
    changed.effectiveFromYear = 2029;
    changed.sections.C1 = ['N01', 'N02'];
    const versions = rules.annualDpsInstructionVersions.concat(changed);
    const old = L.qvBuildAnnualDpsInstructions(history.rows, options(2028, { versions }));
    const next = L.qvBuildAnnualDpsInstructions(history.rows, options(2029, { versions }));
    assert.equal(old.rows.length, 141);
    assert.equal(next.rows.length, 132);
    const check = L.qvDpsInstructionCoverageControl(next.rows, options(2029, { versions }));
    assert.equal(check.pass, true);
    check.table.filter((row) => row.site === 'C1').forEach((row) => {
      assert.equal(row.actualHalf, 4);
      assert.equal(row.actualSection, 2);
    });
  });
  test('la projection 2040 conserve les ecarts hebdomadaires autour du 29 fevrier', () => {
    const generated = L.qvBuildAnnualDpsInstructions(history.rows, options(2040));
    const scheduled = L.qvSchedulePionnierOffDuty(L.qvApplyPionnierRules(generated.rows).rows,
      { year: 2040, ctaResolver: cta.instructionPublicForDate });
    assert.equal(generated.rows.length, 141);
    assert.equal(generated.report.missing.length, 0);
    assert.equal(L.qvDpsInstructionCoverageControl(scheduled.rows, options(2040)).pass, true);
    assert.ok(scheduled.report.every((row) => row.status === 'PASS'));
  });
  test('un second passage de couverture est idempotent', () => {
    const again = L.qvCompleteDpsInstructionCoverage(rows, history.rows, options(2027));
    assert.equal(again.added.length, 0);
    assert.equal(again.coverage.pass, true);
    assert.deepEqual(again.rows.map((row) => row.id), rows.map((row) => row.id));
  });
  await testAsync('une instruction ajoutee reste preparable sans ecriture evenement', async () => {
    const fixture = createFixture(null);
    const current = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows
      .find((row) => row.coverageAdded);
    const saved = await fixture.service.updateProgrammePreparation(current.id, {
      year: 2027, activityLabel: current.label, date: day(current),
      startTime: current.startsAt.slice(11, 16), endTime: current.endsAt.slice(11, 16),
      status: 'PLANIFIE', oiCodes: current.ois, publicCodes: current.publics, statCom: current.statCom
    });
    assert.equal(saved.updated, true);
    assert.equal(saved.quoVadis.canonicalProgramme.rows.find((row) => row.id === current.id).status, 'PLANIFIE');
    assert.ok(!fixture.queries.some((query) => /^(?:insert|update|delete)\s+scope_evenements/i.test(query.sql.trim())));
  });
  console.log(`QV-INSTRUCTION-COVERAGE-MOA-REPAIR-2: ${passed}/${passed} PASS`);
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
