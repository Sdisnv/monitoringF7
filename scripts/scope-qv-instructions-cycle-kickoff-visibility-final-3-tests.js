#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createFixture } = require('./scope-qv-local-fixture');
const { createCatalogUiHarness } = require('./scope-annual-catalog-ui-harness');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const history = require('../netlify/lib/data/scope-qv-history-2026.json');
const rules = require('../netlify/lib/data/scope-qv-canonical-annual-rules.json');

let passed = 0;
function test(label, check) {
  check();
  console.log(`PASS ${++passed} - ${label}`);
}
const active = (programme) => programme.rows.filter((row) => !row.external);
const instructions = (rows) => rows.filter((row) => L.qvDpsInstructionKind(row));
const siteOf = (row) => L.qvDpsSitesOf(row)[0];
const kindOf = (row) => L.qvDpsInstructionKind(row);
const themeOf = (row) => L.qvInstructionTheme(row).startsWith('PIONNIER') ? 'PIONNIER' : L.qvInstructionTheme(row);
const publicOf = (row) => (row.publics || []).find((code) => /^N0[1-6][ab]?$/.test(code)) || '';
const dateOf = (row) => String(row.startsAt || '').slice(0, 10);
const options = (year, extra = {}) => ({ year, versions: rules.annualDpsInstructionVersions,
  ctaResolver: cta.instructionPublicForDate, operationalHalvesForOi: cta.operationalHalfSections, ...extra });
const fingerprint = (rows) => instructions(rows).map((row) =>
  [siteOf(row), themeOf(row), kindOf(row), publicOf(row)].join('|')).sort();
const publicHalves = (row) => kindOf(row) === 'section'
  ? [`${publicOf(row)}a`, `${publicOf(row)}b`] : [publicOf(row)];

function annualCycle(programme, year) {
  const rows = active(programme);
  const list = instructions(rows);
  const rule = L.qvAnnualDpsInstructionVersion(year, rules.annualDpsInstructionVersions);
  const control = L.qvDpsInstructionCoverageControl(rows, options(year));
  assert.equal(control.pass, true, `${year}: couverture annuelle`);
  assert.equal(control.table.length, 13);
  assert.equal(list.length, 141);
  assert.equal(new Set(fingerprint(rows)).size, list.length, `${year}: doublon structurel`);
  assert.ok(list.every((row) => dateOf(row).startsWith(`${year}-`)), `${year}: instruction non datée`);

  const chronology = [];
  for (const site of L.QV_DPS_SITES) {
    const activeSections = rule.sections[site];
    const siteRows = list.filter((row) => siteOf(row) === site);
    const order = rule.themeOrder[site];
    assert.ok(siteRows.every((row) => activeSections.includes(publicOf(row).slice(0, 3))
      && !cta.isReserveHalfSection(site, publicOf(row))), `${year} ${site}: réserve ou public inconnu`);
    for (const theme of order) {
      const group = siteRows.filter((row) => themeOf(row) === theme);
      const halves = cta.operationalHalfSections(site).filter((code) => activeSections.includes(code.slice(0, 3)));
      assert.deepEqual(group.filter((row) => kindOf(row) === 'demi-section').map(publicOf).sort(), halves.sort(),
        `${year} ${site} ${theme}: demi-sections`);
      assert.deepEqual(group.filter((row) => kindOf(row) === 'section').map(publicOf).sort(), [...activeSections].sort(),
        `${year} ${site} ${theme}: sections`);
      for (const section of group.filter((row) => kindOf(row) === 'section')) {
        for (const half of [`${publicOf(section)}a`, `${publicOf(section)}b`]) {
          const prerequisite = group.find((row) => kindOf(row) === 'demi-section' && publicOf(row) === half);
          assert.ok(prerequisite && prerequisite.startsAt < section.startsAt,
            `${year} ${site} ${theme} ${publicOf(section)}: ${half} avant section`);
        }
      }
    }
    for (let index = 1; index < order.length; index += 1) {
      const before = siteRows.filter((row) => themeOf(row) === order[index - 1]).map((row) => row.startsAt).sort().at(-1);
      const after = siteRows.filter((row) => themeOf(row) === order[index]).map((row) => row.startsAt).sort()[0];
      assert.ok(before < after, `${year} ${site}: ${order[index - 1]} avant ${order[index]}`);
    }
    for (const section of activeSections) {
      const sequence = siteRows.filter((row) => publicOf(row).startsWith(section))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
      chronology.push({ year, site, section, sequence: sequence.map((row) =>
        `${dateOf(row)} ${publicOf(row)} ${themeOf(row)} ${kindOf(row)}`) });
    }
    const ordered = siteRows.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    for (let index = 0; index < ordered.length; index += 1) {
      const first = ordered[index];
      for (let next = index + 1; next < ordered.length && ordered[next].startsAt < first.endsAt; next += 1) {
        const second = ordered[next];
        assert.ok(!publicHalves(first).some((code) => publicHalves(second).includes(code)),
          `${year} ${site}: collision ${first.id} / ${second.id}`);
      }
    }
  }
  for (const row of list) {
    const site = siteOf(row);
    assert.equal(L.qvDpsSitesOf(row).length, 1, `${year}: site unique ${row.id}`);
    if (themeOf(row) === 'PIONNIER') {
      assert.equal(L.qvPionnierCtaCheck(row, cta.instructionPublicForDate).pass, true,
        `${year}: PIONNIER CTA N/N-1 ${row.id}`);
    } else {
      assert.equal(publicOf(row), cta.instructionPublicForDate(dateOf(row), site, kindOf(row), false),
        `${year}: CTA ${row.id}`);
    }
  }
  return { rows, list, control, chronology };
}

function fridayOnOrBefore(date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return cta.addDays(date, -((weekday + 2) % 7));
}

async function main() {
  const programmes = {};
  for (const year of [2027, 2028, 2029]) {
    programmes[year] = (await createFixture(null).service.listProgramme(year)).canonicalProgramme;
  }
  const cycles = {};
  for (const year of [2027, 2028, 2029]) {
    test(`${year}: cycle chronologique, publics actifs, cadence et collisions`, () => {
      cycles[year] = annualCycle(programmes[year], year);
    });
  }
  test('même structure de 141 instructions en 2027, 2028 et 2029', () => {
    assert.deepEqual(fingerprint(cycles[2027].rows), fingerprint(cycles[2028].rows));
    assert.deepEqual(fingerprint(cycles[2027].rows), fingerprint(cycles[2029].rows));
    assert.deepEqual(cycles[2027].control.table.map((row) => [row.site, row.theme, row.actualHalf, row.actualSection]),
      cycles[2029].control.table.map((row) => [row.site, row.theme, row.actualHalf, row.actualSection]));
  });
  test('KICK-OFF = 42 instructions et sept autres activités visibles par la source', () => {
    const matches = cycles[2027].rows.filter((row) => /kick-off/i.test([
      row.eventLabel, row.activityLabel, row.eventDisplayLabel, row.label, ...(row.themes || [])].join(' ')));
    const instructionMatches = matches.filter(kindOf);
    const other = matches.filter((row) => !kindOf(row));
    assert.equal(matches.length, 49);
    assert.equal(instructionMatches.length, 42);
    assert.equal(other.length, 7);
    assert.ok(other.every((row) => /kick-off/i.test(row.eventLabel)
      && !/kick-off/i.test(row.activityLabel || '')
      && L.qvProgrammeVisibleThemes(row).some((theme) => /kick-off/i.test(theme))));
    assert.deepEqual([...new Set(other.map((row) => row.label))].sort(),
      ['Formation permanents', 'Séance cadres JSP', 'Séance personnel DAP', 'Séance personnel DPS'].sort());
    const harness = createCatalogUiHarness();
    const found = harness.hooks.filterQuoVadisProgrammeRows({ canonicalProgramme: programmes[2027],
      programme: { annee: 2027 } }, 'KICK-OFF');
    assert.equal(found.length, 49);
    assert.deepEqual(found.map((row) => row.id).sort(), matches.map((row) => row.id).sort());
  });
  test('ABC, VARIA, FEU et PIONNIER restent lisibles sans fausse association', () => {
    const rows = cycles[2027].rows;
    for (const term of ['ABC', 'VARIA', 'FEU', 'PIONNIER']) {
      const matches = rows.filter((row) => [row.label, row.eventLabel, row.activityLabel,
        ...(row.themes || [])].join(' ').toUpperCase().includes(term));
      assert.ok(matches.length > 0);
      assert.ok(matches.every((row) => [row.activityLabel, row.eventDisplayLabel,
        row.label, ...L.qvProgrammeVisibleThemes(row)].join(' ').toUpperCase().includes(term)), term);
    }
    const security = rows.find((row) => String(row.label).startsWith('Sécurité feu'));
    assert.ok(security && !L.qvProgrammeVisibleThemes(security).some((theme) => /FEU/i.test(theme)));
  });
  test('le thème projeté et le suffixe KICK-OFF utilisent les champs canoniques', () => {
    const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('L.qvProgrammeVisibleThemes(row)'));
    assert.ok(ui.includes('row.eventLabel, row.occurrenceLabel'));
    assert.ok(ui.includes('Thème / cycle'));
    const permanents = cycles[2027].rows.find((row) => row.label === 'Formation permanents'
      && row.projectionEvidence && row.projectionEvidence.theme === 'KICK-OFF');
    assert.deepEqual(L.qvProgrammeVisibleThemes(permanents), ['KICK-OFF']);
    assert.deepEqual(L.qvProgrammeVisibleThemes({ activityLabel: 'Séance personnel DPS',
      eventLabel: 'Séance personnel DPS · Kick-off' }), ['Kick-off']);
    assert.deepEqual(L.qvProgrammeVisibleThemes({ activityLabel: 'Séance chefs de section DPS C1',
      eventLabel: 'Séance chefs de section DPS C1 · B2' }), []);
  });
  test('tableau, vue mensuelle, fiche et Agenda annuel rendent le contexte KICK-OFF', () => {
    const harness = createCatalogUiHarness();
    const payload = { canonicalProgramme: programmes[2027], programme: { annee: 2027 } };
    harness.hooks.renderQuoVadisProgrammeHtml(payload);
    Object.assign(harness.hooks.state, { authChecking: false, needOkta: false,
      session: { name: 'Test', roles: ['GESTIONNAIRE'], permissions: ['references:manage'] } });
    harness.hooks.state.quoVadisFilters.q = 'KICK-OFF';
    harness.hooks.render();
    assert.ok(harness.root.innerHTML.includes('Résultats : 49'));
    assert.ok(harness.root.innerHTML.includes('Séance personnel DPS<small class="qv-programme-theme">Kick-off</small>'));
    harness.hooks.state.quoVadisFilters.q = 'Formation permanents';
    harness.hooks.render();
    assert.ok(harness.root.innerHTML.includes('Formation permanents<small class="qv-programme-theme">KICK-OFF</small>'));
    harness.hooks.state.quoVadisFilters.q = 'KICK-OFF';
    harness.hooks.state.quoVadisFilters.month = '2027-01';
    harness.hooks.state.quoVadisProgrammeMode = 'mensuelle';
    harness.hooks.render();
    assert.ok(harness.root.innerHTML.includes('Séance personnel DPS<small class="qv-programme-theme">Kick-off</small>'));
    harness.context.location.hash = '#/quo-vadis/programme/qv-source-871';
    harness.hooks.render();
    assert.ok(harness.root.innerHTML.includes('<dt>Thème / cycle</dt><dd>Kick-off</dd>'));
    harness.context.location.hash = '#/quo-vadis/agenda-annuel';
    harness.hooks.render();
    assert.ok(harness.root.innerHTML.includes('Séance personnel DPS · Kick-off'));
    assert.ok(harness.root.innerHTML.includes('Programme</span><strong>847'));
    assert.equal(payload.canonicalProgramme.rows.filter((row) => !row.external).length, 850);
  });
  test('conduite DPS = 56 occurrences, deux par demi-section', () => {
    for (const year of [2027, 2028, 2029]) {
      const drives = cycles[year].rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === L.QV_CONDUITE_STATCOM);
      assert.equal(drives.length, 56, String(year));
      for (const site of L.QV_DPS_SITES) {
        const siteDrives = drives.filter((row) => siteOf(row) === site);
        assert.equal(siteDrives.length, 2 * cta.operationalHalfSections(site).length);
        for (const half of cta.operationalHalfSections(site)) {
          assert.equal(siteDrives.filter((row) => row.conduiteEvidence.halfSection === half).length, 2);
        }
      }
      assert.equal(L.qvConduiteCoherenceControl(cycles[year].rows, cta.conduiteEngineOptions()).pass, true);
    }
  });
  test('CTA passe le 31 décembre sans réinitialiser les cycles', () => {
    for (const year of [2027, 2028]) {
      const before = fridayOnOrBefore(`${year}-12-31`);
      const after = cta.addDays(before, 7);
      assert.ok(after.startsWith(`${year + 1}-`), `${before} -> ${after}`);
      const prior = cta.assignmentsForFriday(before);
      const next = cta.assignmentsForFriday(after);
      for (const site of L.QV_DPS_SITES) {
        const cycle = cta.operationalHalfSections(site);
        const oldPublic = prior.find((row) => row.oi === site).halfSection;
        const newPublic = next.find((row) => row.oi === site).halfSection;
        assert.equal(newPublic, cycle[(cycle.indexOf(oldPublic) + 1) % cycle.length], `${year} ${site}`);
        assert.equal(cta.instructionPublicForDate(after, site, 'demi-section'), newPublic);
      }
    }
  });
  test('mutation C1 à deux sections ajuste le moteur sans changer la structure réelle', () => {
    const changed = JSON.parse(JSON.stringify(rules.annualDpsInstructionVersions[0]));
    changed.effectiveFromYear = 2029;
    changed.sections.C1 = ['N01', 'N02'];
    const versions = rules.annualDpsInstructionVersions.concat(changed);
    const old = L.qvBuildAnnualDpsInstructions(history.rows, options(2028, { versions }));
    const next = L.qvBuildAnnualDpsInstructions(history.rows, options(2029, { versions }));
    assert.equal(old.rows.length, 141);
    assert.equal(next.rows.length, 132);
    const control = L.qvDpsInstructionCoverageControl(next.rows, options(2029, { versions }));
    assert.equal(control.pass, true);
    assert.ok(control.table.filter((row) => row.site === 'C1')
      .every((row) => row.actualHalf === 4 && row.actualSection === 2));
  });
  test('Programme et Agenda 2027 comptent les mêmes lignes canoniques', () => {
    const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
    const programme = cycles[2027].rows;
    assert.equal(programme.length, 850);
    assert.equal(programme.filter((row) => row.startsAt).length, 850);
    assert.equal(programme.filter((row) => !row.startsAt).length, 0);
    const month = ui.slice(ui.indexOf('function qvBuildMonth('), ui.indexOf('function qvMonthActivityCount('));
    const projection = ui.slice(ui.indexOf('function qvAgendaProjection('), ui.indexOf('function qvRenderMiniMonth('));
    assert.ok(month.includes('canonicalProgramme'));
    assert.ok(month.includes('year === programmeYear ? programmeRows : recurrenceRows'));
    assert.ok(projection.includes('canonicalProgramme'));
  });
  if (process.argv.includes('--timeline')) {
    for (const year of [2027, 2028, 2029]) {
      console.log(`TIMELINE ${year}: date | site | public | thème | type`);
      for (const item of cycles[year].chronology) {
        console.log(`${item.site} ${item.section}: ${item.sequence.join(' ; ')}`);
      }
    }
  }
  console.log(`QV-INSTRUCTIONS-CYCLE-KICKOFF-VISIBILITY-FINAL-3: ${passed}/${passed} PASS`);
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
