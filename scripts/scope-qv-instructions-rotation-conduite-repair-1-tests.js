#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { createFixture } = require('./scope-qv-local-fixture');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const source = require('../netlify/lib/data/scope-qv-programme-2027.json');
const history = require('../netlify/lib/data/scope-qv-history-2026.json');
const rules = require('../netlify/lib/data/scope-qv-canonical-annual-rules.json');

let passed = 0;
function test(number, label, check) {
  check();
  passed += 1;
  console.log(`PASS ${String(number).padStart(2, '0')} - ${label}`);
}
const active = (programme) => programme.rows.filter((row) => row && !row.external);
const instructions = (rows) => rows.filter((row) => L.qvDpsInstructionKind(row));
const conduites = (rows) => rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === L.QV_CONDUITE_STATCOM);
const theme = (row) => L.qvInstructionTheme(row).startsWith('PIONNIER') ? 'PIONNIER' : L.qvInstructionTheme(row);
const siteRows = (rows, site) => rows.filter((row) => L.qvDpsSitesOf(row)[0] === site);
const day = (row) => String(row.startsAt || '').slice(0, 10);
const dayGap = (a, b) => Math.round((Date.parse(`${day(b)}T12:00:00Z`) - Date.parse(`${day(a)}T12:00:00Z`)) / 86400000);

async function main() {
  const qv27 = await createFixture(null).service.listProgramme(2027);
  const rows = active(qv27.canonicalProgramme);
  const instr = instructions(rows);
  const drives = conduites(rows);
  const version = L.qvAnnualDpsInstructionVersion(2027, rules.annualDpsInstructionVersions);
  const configSections = (site) => version.sections[site];
  const publics = (site) => [...new Set(siteRows(instr, site).flatMap((row) => row.publics || []))];
  const ordered = (site) => version.themeOrder[site].map((name) => {
    const group = siteRows(instr, site).filter((row) => theme(row) === name);
    return { name, first: group.map(day).sort()[0], last: group.map(day).sort().at(-1) };
  });

  test(1, 'G1 sections N01-N05', () => assert.deepEqual(configSections('G1'), ['N01', 'N02', 'N03', 'N04', 'N05']));
  test(2, 'G1 dix demi-sections', () => assert.equal(cta.operationalHalfSections('G1').length, 10));
  test(3, 'G1 N06 réserve exclue', () => assert.ok(!publics('G1').some((code) => /^N06/.test(code))));
  for (const [number, site] of [[4, 'C1'], [5, 'B1'], [6, 'B2']]) {
    test(number, `${site} sections N01-N03`, () => assert.deepEqual(configSections(site), ['N01', 'N02', 'N03']));
  }
  test(7, 'N04 réserve exclue C1/B1/B2', () => {
    for (const site of ['C1', 'B1', 'B2']) {
      assert.equal(cta.operationalHalfSections(site).length, 6);
      assert.ok(!publics(site).some((code) => /^N04/.test(code)));
    }
  });
  for (const [number, site] of [[8, 'G1'], [9, 'C1'], [10, 'B1'], [11, 'B2']]) {
    test(number, `${site} ordre canonique des thèmes`, () => {
      const list = ordered(site);
      assert.ok(list.every((item) => item.first && item.last));
      for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].last < list[i].first,
        `${site}: ${list[i - 1].name} / ${list[i].name}`);
    });
  }
  test(12, 'demi-sections avant leur section entière', () => {
    for (const sectionRow of instr.filter((row) => L.qvDpsInstructionKind(row) === 'section')) {
      const section = (sectionRow.publics || []).find((code) => /^N0\d$/.test(code));
      const halves = instr.filter((row) => L.qvDpsInstructionKind(row) === 'demi-section'
        && L.qvDpsSitesOf(row)[0] === L.qvDpsSitesOf(sectionRow)[0]
        && theme(row) === theme(sectionRow)
        && (row.publics || []).some((code) => code.slice(0, 3) === section));
      for (const half of halves) assert.ok(half.startsAt < sectionRow.startsAt, sectionRow.id);
    }
  });
  test(13, 'aucune famille ultérieure ne précède la précédente', () => {
    for (const site of L.QV_DPS_SITES) for (const [index, item] of ordered(site).entries()) {
      if (index) assert.ok(ordered(site)[index - 1].last < item.first);
    }
  });
  test(14, 'publics non-PIONNIER issus du CTA continu', () => {
    for (const row of instr.filter((item) => !L.qvIsPionnierRow(item))) {
      const expected = cta.instructionPublicForDate(day(row), L.qvDpsSitesOf(row)[0], L.qvDpsInstructionKind(row), false);
      assert.ok((row.publics || []).includes(expected), row.id);
    }
  });
  test(15, 'CTA non réinitialisé au premier janvier', () => {
    const before = cta.assignmentsForFriday('2027-12-31');
    const after = cta.assignmentsForFriday('2028-01-07');
    assert.deepEqual(after.map((row) => row.halfSection), ['N01b', 'N01b', 'N01b', 'N01b']);
    assert.notDeepEqual(before.map((row) => row.halfSection), after.map((row) => row.halfSection));
    assert.notDeepEqual(after.map((row) => row.halfSection), cta.assignmentsForFriday(cta.ANCHOR_DATE).map((row) => row.halfSection));
  });
  test(16, 'PIONNIER hors astreinte N et N-1', () => {
    const pionnier = instr.filter(L.qvIsPionnierRow);
    assert.equal(pionnier.length, 15);
    pionnier.forEach((row) => assert.equal(L.qvPionnierCtaCheck(row, cta.instructionPublicForDate).pass, true, row.id));
    assert.equal(pionnier.map(day).sort().at(-1), '2027-12-13');
  });
  for (const [number, site] of [[17, 'G1'], [18, 'C1'], [19, 'B1'], [20, 'B2']]) {
    test(number, `${site} deux conduites par demi-section`, () => assert.equal(siteRows(drives, site).length, cta.operationalHalfSections(site).length * 2));
  }
  test(21, '56 conduites DPS au total', () => assert.equal(drives.length, cta.expectedAnnualConduites()));
  test(22, 'durée conduite une heure maximum', () => drives.forEach((row) => assert.ok(
    (Date.parse(`${row.endsAt}:00Z`) - Date.parse(`${row.startsAt}:00Z`)) / 60000 <= 60)));
  test(23, 'Stat.Com conduite 0152F7', () => drives.forEach((row) => assert.equal(row.statCom, '0152F7')));
  test(24, 'cond VL/PL et demi-section CTA', () => drives.forEach((row) => {
    assert.deepEqual(row.publics.slice(1), ['AUTO:1', 'AUTO:3']);
    assert.match(row.publics[0], /^N0[1-5][ab]$/);
    const parent = rows.find((item) => item.id === row.conduiteEvidence.sourceId);
    assert.ok(parent && L.qvDpsInstructionKind(parent) === 'demi-section');
    assert.equal(row.publics[0], parent.publics.find((code) => /^N0[1-5][ab]$/.test(code)));
  }));
  test(25, 'conduites espacées par demi-section', () => L.QV_DPS_SITES.forEach((site) => {
    for (const half of cta.operationalHalfSections(site)) {
      const group = siteRows(drives, site).filter((row) => row.publics.includes(half)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      assert.equal(group.length, 2);
      assert.ok(dayGap(group[0], group[1]) >= 28);
    }
  }));
  test(26, 'conduites G1 avant PIONNIER', () => {
    const first = siteRows(instr, 'G1').filter(L.qvIsPionnierRow).map((row) => row.startsAt).sort()[0];
    assert.ok(siteRows(drives, 'G1').every((row) => row.startsAt < first));
  });
  test(27, 'identifiants instruction et conduite uniques', () => {
    const relevant = instr.concat(drives);
    assert.equal(new Set(relevant.map((row) => row.id)).size, relevant.length);
    assert.equal(new Set(relevant.map((row) => row.occurrenceId || row.id)).size, relevant.length);
  });
  test(28, 'identifiants source conservés', () => {
    const sourceIds = source.rows.filter((row) => L.qvDpsInstructionKind(row)
      || (row.label === L.QV_CONDUITE_LABEL && row.statCom === L.QV_CONDUITE_STATCOM)).map((row) => row.id);
    const current = new Set(rows.map((row) => row.id));
    sourceIds.forEach((id) => assert.ok(current.has(id), id));
  });
  test(29, 'date protégée non déplacée et signalée', () => {
    const original = L.qvDistributeRotationOccurrences(source.rows, history.rows, cta.instructionPublicForDate).rows
      .find((row) => L.qvIsPionnierRow(row) && L.qvDpsInstructionKind(row));
    const protectedRow = { ...original, fixedDate: true };
    const result = L.qvSchedulePionnierOffDuty([protectedRow], { year: 2027, ctaResolver: cta.instructionPublicForDate });
    assert.equal(result.rows[0].startsAt, protectedRow.startsAt);
    assert.equal(result.report[0].status, 'MOA_REQUIRED');
  });
  test(30, 'autres domaines A-J inchangés', () => {
    assert.equal(rows.filter((row) => row.statCom === '01522F7' && row.label === L.QV_CONDUITE_LABEL).length, 16);
    assert.equal(rows.filter((row) => row.domain === 'JSP').length, 84);
    assert.equal(rows.filter((row) => /^Exercice FOBA/.test(row.label || '')).length, 13);
    assert.equal(rows.filter((row) => row.label === 'Exercice PR-ABC').length, 3);
  });
  const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
  const extract = (name) => ui.slice(ui.indexOf(`  function ${name}(`), ui.indexOf('\n  function ', ui.indexOf(`  function ${name}(`) + 1));
  const context = { L, qvActivities: () => [], qvDateKey: (value) => String(value || '').slice(0, 10),
    qvProgrammeDate: (row) => String(row.startsAt || '').slice(0, 10), qvCalendarKind: L.qvCalendarKind,
    qvMonthLabel: (month) => String(month) };
  vm.createContext(context);
  vm.runInContext(['qvCalendarIndex', 'qvProgrammeProposedMonthKey', 'qvBuildMonth', 'qvAgendaProjection'].map(extract).join('\n'), context);
  test(31, 'Programme et Agenda : même total', () => assert.equal(context.qvAgendaProjection(qv27).total, rows.length));
  test(32, 'Programme et Agenda : mêmes lignes à définir', () => assert.equal(
    context.qvAgendaProjection(qv27).undated, rows.filter((row) => !row.startsAt).length));
  test(33, 'KPI recalculé et non figé à 886', () => {
    assert.equal(qv27.canonicalProgramme.target.sessions, 850);
    assert.equal(context.qvAgendaProjection(qv27).dated, 850);
    assert.equal(context.qvAgendaProjection(qv27).undated, 0);
  });
  test(34, 'deux exécutions stables et conduite idempotente', () => {
    const again = L.qvApplyConduiteContinue(rows, cta.conduiteEngineOptions());
    assert.equal(again.derived.added.length, 0);
    assert.equal(again.derived.orphans.length, 0);
    assert.deepEqual(conduites(again.rows), drives);
  });
  test(35, 'aucun fichier ORION modifié', () => {
    const changed = execFileSync('git', ['diff', '--name-only'], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    assert.ok(!changed.split('\n').some((name) => /^(?:ORION|orion)\//.test(name)));
  });

  const future = [];
  for (const year of [2028, 2029]) future.push(await createFixture(null).service.listProgramme(year));
  test(36, '2028/2029 : 141 instructions et 56 conduites depuis 2026', () => future.forEach((qv, index) => {
    const year = index + 2028;
    const list = active(qv.canonicalProgramme);
    assert.equal(instructions(list).length, 141);
    assert.equal(conduites(list).length, 56);
    assert.ok(instructions(list).every((row) => row.id.startsWith(`QV${String(year).slice(2)}:HIST:`)));
    assert.equal(qv.canonicalProgramme.annualInstructionRules.missing.length, 0);
  }));
  test(37, '2028/2029 : CTA, PIONNIER et répartition conformes', () => future.forEach((qv) => {
    const list = active(qv.canonicalProgramme);
    assert.ok(instructions(list).filter(L.qvIsPionnierRow).every((row) => L.qvPionnierCtaCheck(row, cta.instructionPublicForDate).pass));
    assert.equal(L.qvConduiteCoherenceControl(list, cta.conduiteEngineOptions()).pass, true);
    for (const site of L.QV_DPS_SITES) assert.ok(orderedFuture(list, site, version.themeOrder[site]));
  }));
  test(38, 'Agenda de l’année ouverte utilise son Programme, référence 2028 depuis 2027 reste CTA', () => {
    const qv28 = future[0];
    const august = context.qvBuildMonth(qv28, 2028, 8);
    assert.ok(august.cells.some((cell) => cell && cell.items.some((row) => L.qvDpsInstructionKind(row))));
    const reference = context.qvBuildMonth(qv27, 2028, 8);
    assert.ok(reference.cells.every((cell) => !cell || cell.items.every((row) => row.definitionId === 'CTA-PERMANENCE')));
  });
  test(39, 'configuration fictive effective 2029 sans effet rétroactif 2028', () => {
    const altered = JSON.parse(JSON.stringify(version));
    altered.effectiveFromYear = 2029;
    altered.sections.C1 = ['N01', 'N02'];
    const versions = rules.annualDpsInstructionVersions.concat([altered]);
    const old = L.qvBuildAnnualDpsInstructions(history.rows, { year: 2028, versions, ctaResolver: cta.instructionPublicForDate });
    const next = L.qvBuildAnnualDpsInstructions(history.rows, { year: 2029, versions, ctaResolver: cta.instructionPublicForDate });
    assert.equal(old.report.activeSections.C1.length, 3);
    assert.equal(next.report.activeSections.C1.length, 2);
    assert.equal(next.rows.length, 132);
    assert.ok(!siteRows(next.rows, 'C1').some((row) => row.publics.some((code) => code.startsWith('N03'))));
  });
  const mockVersions = [{ oi_code: 'C1', valid_from: '2029-01-01', valid_to: null,
    sections: [{ section: 'N01', halfSections: ['N01a', 'N01b'] },
      { section: 'N02', halfSections: ['N02a', 'N02b'] }, { section: 'N03', reserve: true }] }];
  test(40, 'version de structure SCOPE 2029 lue sans réécrire 2028', () => {
    assert.equal(L.qvAnnualDpsInstructionVersion(2028, rules.annualDpsInstructionVersions).sections.C1.length, 3);
    assert.equal(mockVersions[0].sections.filter((section) => !section.reserve).length, 2);
  });
  const fixture = createFixture(null, { dpsOrganisation: mockVersions });
  const qv29Versioned = await fixture.service.listProgramme(2029);
  test(41, 'service 2029 consomme la version DPS existante en lecture seule', () => {
    assert.deepEqual(qv29Versioned.canonicalProgramme.annualInstructionRules.activeSections.C1, ['N01', 'N02']);
    assert.ok(!siteRows(instructions(active(qv29Versioned.canonicalProgramme)), 'C1')
      .some((row) => row.publics.some((code) => code.startsWith('N03'))));
    assert.ok(!fixture.queries.some((query) => /^(?:insert|update|delete)\s+scope_quo_vadis_dps_organisation_versions/i.test(query.sql.trim())));
  });
  test(42, '141 instructions couvrent exactement les publics actifs, dont 42 KICK-OFF', () => {
    const control = L.qvDpsInstructionCoverageControl(rows, {
      year: 2027, versions: rules.annualDpsInstructionVersions,
      ctaResolver: cta.instructionPublicForDate,
      operationalHalvesForOi: cta.operationalHalfSections
    });
    assert.equal(instr.length, 141);
    assert.equal(control.pass, true);
    assert.equal(instr.filter((row) => theme(row) === 'KICK-OFF').length, 42);
  });
  test(43, 'PIONNIER sans chevauchement de public G1 dans le programme recalculé', () => {
    const dated = rows.filter((row) => row.startsAt && row.endsAt);
    for (const pionnier of instr.filter(L.qvIsPionnierRow)) {
      const collisions = dated.filter((row) => row.id !== pionnier.id && row.definitionId !== 'CTA-PERMANENCE'
        && row.startsAt < pionnier.endsAt && row.endsAt > pionnier.startsAt
        && L.qvDpsSitesOf(row).includes('G1')
        && (row.publics || []).some((code) => (pionnier.publics || []).includes(code)));
      assert.deepEqual(collisions.map((row) => row.id), [], pionnier.id);
    }
  });
  test(44, 'années repères 2030/2035/2040 toujours générables sans reset CTA', () => {
    for (const year of [2030, 2035, 2040]) {
      const generated = L.qvBuildAnnualDpsInstructions(history.rows, {
        year, versions: rules.annualDpsInstructionVersions, ctaResolver: cta.instructionPublicForDate,
        operationalHalvesForOi: cta.operationalHalfSections
      });
      const pionnier = L.qvSchedulePionnierOffDuty(L.qvApplyPionnierRules(generated.rows).rows,
        { year, ctaResolver: cta.instructionPublicForDate });
      const conduite = L.qvApplyConduiteContinue(pionnier.rows, cta.conduiteEngineOptions());
      assert.equal(generated.report.instructions, 141);
      assert.equal(generated.report.missing.length, 0);
      assert.ok(pionnier.report.every((item) => item.status === 'PASS'));
      assert.equal(conduite.derived.materialized, 56);
    }
  });
  const publishedFixture = createFixture(null);
  const originallyDated = L.qvDistributeRotationOccurrences(source.rows, history.rows, cta.instructionPublicForDate).rows
    .find((row) => L.qvIsPionnierRow(row) && L.qvDpsInstructionKind(row));
  Object.assign(publishedFixture.published, { publication_unit_id: originallyDated.id,
    date: day(originallyDated), heure_debut: '07:30', heure_fin: '11:30' });
  const beforePublished = JSON.stringify(publishedFixture.published);
  const publishedView = await publishedFixture.service.listProgramme(2027);
  test(45, 'date PIONNIER publiée conservée et écart CTA signalé sans écriture événement', () => {
    const row = publishedView.canonicalProgramme.rows.find((item) => item.id === originallyDated.id);
    assert.equal(row.publishedEventDate, day(originallyDated));
    assert.equal(row.pionnierCtaStatus, 'MOA_REQUIRED');
    assert.equal(row.pionnierCtaHumanCheck.pass, false);
    assert.equal(JSON.stringify(publishedFixture.published), beforePublished);
    assert.ok(!publishedFixture.queries.some((query) => /^(?:insert|update|delete)\s+scope_evenements/i.test(query.sql.trim())));
  });
  console.log(`QV-INSTRUCTIONS-ROTATION-CONDUITE-REPAIR-1: ${passed}/${passed} PASS`);
}

function orderedFuture(rows, site, names) {
  const spans = names.map((name) => siteRows(instructions(rows), site).filter((row) => theme(row) === name)
    .map(day).sort());
  return spans.every((span) => span.length) && spans.every((span, index) => !index || spans[index - 1].at(-1) < span[0]);
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
