'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../assets/css/scope.css'), 'utf8');
const extract = (name) => {
  const start = ui.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const end = ui.indexOf('\n  function ', start + 1);
  return ui.slice(start, end < 0 ? undefined : end);
};
let passed = 0;
async function test(name, fn) { await fn(); console.log(`PASS ${++passed} - ${name}`); }

async function main() {
  const qv = await createFixture(null).service.listProgramme(2027);
  const rows = qv.canonicalProgramme.rows.filter((row) => !row.external);
  const history = new Map(qv.historicalAgenda2026.references.map((row) => [row.sourceLine, row]));
  const state = { quoVadis: qv, quoVadisFilters: { q: '' }, quoVadisProgrammePlacement: 'tous', quoVadisProgrammeMode: 'tableau', quoVadisSort: { key: 'date', dir: 'asc' } };
  const context = {
    L, state,
    escapeHtml: (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
    qvCockpitIcon: () => '',
    qvProgrammeYearChoices: () => [2027, 2028, 2029],
    qvProgrammeYear: () => 2027,
    qvProgrammeMonthChoices: () => [],
    qvProgrammeVisualState: () => ({ label: 'Proposée', tone: '' }),
    qvProgrammeDate: (row) => String(row.startsAt || '').slice(0, 10),
    qvProgrammeEventCodeLabel: (row) => row.publishedEventCode || 'Auto',
    qvProgrammePublicCodes: (row) => row.publics || [],
    qvProgrammePublicCodeLabel: (code) => L.qvProgrammePublicLabel(code),
    qvProgrammePublicLabel: (row) => (row.publics || []).map(L.qvProgrammePublicLabel).join(' '),
    qvProgrammeProvenance: () => '',
    qvProgrammeCompareRows: L.compareQvProgrammeRows,
    qvCanonicalLieuLabel: (value) => String(value || '').replace(/^L-(G1|C1|B1|B2)$/, 'Caserne $1').replace(/^L-(Y[1-4])$/, 'Local $1')
  };
  vm.createContext(context);
  vm.runInContext(['qvNormalizeSearch', 'qvFilterOptions', 'qvProgrammePublicFilterOptions', 'qvProgrammeFilteredRows', 'qvProgrammeFilterBar'].map(extract).join('\n'), context);
  const filtered = (values) => { state.quoVadisFilters = { q: '', ...values }; return context.qvProgrammeFilteredRows(qv); };

  await test('programme adds only 48 DPS drives: 56 DPS + 16 DAP', () => {
    assert.equal(rows.length, 850);
    const driving = rows.filter((row) => row.label === 'Conduite, formation continue');
    assert.equal(driving.length, 72);
    assert.equal(driving.filter((row) => L.qvProgrammeOiMatches(row, 'DPS')).length, 56);
    assert.equal(driving.filter((row) => L.qvProgrammeOiMatches(row, 'DAP')).length, 16);
  });
  await test('every operational DPS half has two one-hour drives attached to distinct real instructions', () => {
    const dps = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7');
    const byId = new Map(rows.map((row) => [row.id, row]));
    assert.equal(cta.expectedAnnualConduites(), 56);
    for (const [site, expected] of [['G1', 20], ['C1', 12], ['B1', 12], ['B2', 12]]) {
      const halves = cta.operationalHalfSections(site);
      assert.equal(halves.length, expected / 2);
      assert.equal(dps.filter((row) => L.qvProgrammeOiMatches(row, `DPS:${site}`)).length, expected);
      for (const half of halves) {
        const pair = dps.filter((row) => L.qvProgrammeOiMatches(row, `DPS:${site}`) && row.publics.includes(half));
        assert.equal(pair.length, 2, `${site}:${half}`);
        assert.equal(new Set(pair.map((row) => row.conduiteEvidence.sourceId)).size, 2);
        for (const row of pair) {
          const source = byId.get(row.conduiteEvidence.sourceId);
          assert.ok(source && L.qvDpsInstructionKind(source) === 'demi-section', row.id);
          assert.equal(row.startsAt, source.endsAt);
          assert.equal(row.startsAt.slice(11), '10:30');
          assert.equal(row.endsAt.slice(11), '11:30');
          assert.deepEqual(row.publics, [half, 'AUTO:1', 'AUTO:3']);
          assert.equal(row.statCom, '0152F7');
          assert.equal(L.qvProgrammeHasMultipleSessions(row), false);
        }
      }
    }
    assert.equal(rows.filter((row) => row.programmingRule === 'QV-CONDUITE-008').length, 0);
    assert.equal(L.qvConduiteCoherenceControl(rows).pass, true);
  });
  await test('July G1 drives and N04b moved to May follow real half-section instructions', () => {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const july = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7'
      && row.ois[0] === 'G1' && row.startsAt.startsWith('2027-07'));
    assert.deepEqual(july.map((row) => [row.startsAt.slice(0, 10), row.publics[0]]).sort(), [
      ['2027-07-03', 'N03a'], ['2027-07-10', 'N02a'], ['2027-07-17', 'N01a'],
      ['2027-07-24', 'N05b']
    ]);
    assert.equal(rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7'
      && row.ois[0] === 'G1' && row.publics.includes('N04b') && row.startsAt === '2027-05-22T10:30').length, 1);
    for (const row of july) {
      const source = byId.get(row.conduiteEvidence.sourceId);
      assert.ok(source && L.qvDpsInstructionKind(source) === 'demi-section');
      assert.equal(row.startsAt, source.endsAt);
      assert.equal(row.endsAt.slice(11), '11:30');
    }
  });
  await test('DAP keeps the documented four-per-Y rule from 17 direct 2026 source evenings', () => {
    const workbook = readWorkbook('/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx');
    const source = workbook.rows.filter((row) => row.date.startsWith('2026-') && row.title === L.QV_CONDUITE_LABEL && row.statCom === '01522F7');
    assert.equal(source.length, 17);
    assert.deepEqual(['Y1', 'Y2', 'Y3', 'Y4'].map((oi) => source.filter((row) => row.ois.includes(oi)).length), [5, 4, 4, 4]);
    const dap = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '01522F7');
    assert.equal(dap.length, 16);
    for (const oi of ['Y1', 'Y2', 'Y3', 'Y4']) {
      const selected = source.filter((row) => row.ois.includes(oi)).slice(0, 4);
      const actual = dap.filter((row) => L.qvProgrammeOiMatches(row, `DAP:${oi}`));
      assert.equal(actual.length, 4, oi);
      assert.deepEqual(actual.map((row) => row.historicalProposal.proposedDate2027).sort(),
        selected.map((row) => L.qvShiftHistoricalDate(row.date)).sort());
      assert.ok(actual.every((row) => row.publics.includes('AUTO:3') && row.startsAt.endsWith('18:30') && row.endsAt.endsWith('21:30')));
    }
  });
  await test('functional domain comes only from canonical code, 2026 reference or explicit Stat.Com', () => {
    assert.equal(L.qvProgrammeFunctionalDomain({ domain: 'F3', statCom: '070F7' }, { domainF7: 'F7' }), 'F3');
    assert.equal(L.qvProgrammeFunctionalDomain({ domain: 'AUTO', statCom: '0152F7' }, null), 'F7');
    assert.equal(L.qvProgrammeFunctionalDomain({ domain: 'DPS', statCom: '' }, { domainF7: 'F2/3' }), '');
    assert.equal(L.qvProgrammeFunctionalDomain({ domain: 'DPS', statCom: '070F1' }, { domainF7: 'F1/8' }), '');
    assert.equal(L.qvProgrammeFunctionalDomain({ domain: 'DPS', statCom: '' }, { domainF7: 'F7' }), 'F7');
    assert.ok(rows.some((row) => L.qvProgrammeFunctionalDomain(row, history.get(row.historicalProposal && row.historicalProposal.sourceLine)) === 'F7'));
  });
  await test('family and type are distinct and 2027 source types are inventoried', () => {
    const families = new Set(rows.map(L.qvProgrammeFilterFamily).filter(Boolean));
    assert.ok(families.has('AUTO'));
    assert.ok(!families.has('Exercice'));
    const types = new Set(rows.map(L.qvProgrammeFilterType).filter(Boolean));
    for (const type of ['Événement', 'Exercice', 'Formation', 'Instruction', 'Conduite', 'Séance', 'Permanence']) assert.ok(types.has(type), type);
  });
  await test('AUTO combines with parent DPS, DAP, G1 and cond PL independently', () => {
    const driving = { q: 'Conduite, formation continue', family: 'AUTO' };
    assert.equal(filtered({ ...driving, oi: 'DPS' }).length, 56);
    assert.equal(filtered({ ...driving, oi: 'DAP' }).length, 16);
    assert.equal(filtered({ ...driving, oi: 'DPS:G1' }).length, 20);
    assert.ok(filtered({ ...driving, cible: 'AUTO:1' }).length > 0);
    assert.ok(filtered({ ...driving, cible: 'AUTO:1' }).every((row) => (row.publics || []).includes('AUTO:1')));
    assert.ok(filtered({ ...driving, cible: 'AUTO:3' }).every((row) => (row.publics || []).includes('AUTO:3')));
  });
  await test('Type Conduite includes every DPS and DAP row, with combined domain and OI filters', () => {
    assert.equal(filtered({ type: 'Conduite' }).length, 72);
    assert.equal(filtered({ type: 'Conduite', family: 'AUTO' }).length, 72);
    assert.equal(filtered({ type: 'Conduite', oi: 'DPS' }).length, 56);
    assert.equal(filtered({ type: 'Conduite', oi: 'DAP' }).length, 16);
    assert.equal(filtered({ type: 'Conduite', domain: 'F7', oi: 'DPS' }).length, 56);
    for (const [oi, count] of [['DPS:G1', 20], ['DPS:C1', 12], ['DPS:B1', 12], ['DPS:B2', 12], ['DAP:Y1', 4], ['DAP:Y2', 4], ['DAP:Y3', 4], ['DAP:Y4', 4]]) {
      assert.equal(filtered({ type: 'Conduite', oi }).length, count, oi);
    }
    assert.equal(filtered({ type: 'Conduite', q: 'Conduite, formation continue', oi: 'DPS' }).length, 56);
  });
  await test('OI parent and transverse matching use confirmed selections, not domain', () => {
    for (const parent of ['DPS', 'DAP', 'JSP']) {
      assert.ok(filtered({ oi: parent }).length > 0, parent);
      assert.ok(filtered({ oi: parent }).every((row) => L.qvProgrammeConfirmedOiCodes(row).some((code) => code.startsWith(`${parent}:`))), parent);
    }
    const transverse = rows.find((row) => L.qvProgrammeConfirmedOiCodes(row).some((code) => code.startsWith('DPS:')) && L.qvProgrammeConfirmedOiCodes(row).some((code) => code.startsWith('DAP:')));
    assert.ok(transverse);
    assert.ok(L.qvProgrammeOiMatches(transverse, 'DPS'));
    assert.ok(L.qvProgrammeOiMatches(transverse, 'DAP'));
  });
  await test('multi-session filter recovers PR, grouped training, TRUCK, CAR only from existing sequence', () => {
    const multi = filtered({ sessions: 'oui' });
    assert.equal(multi.length, 48);
    for (const label of ['Exercice PR 1.1', 'Formation groupée 1.1', 'Formation groupée JSP', 'Exercice TRUCK 1.1', 'Exercice CAR 1.1']) assert.ok(multi.some((row) => row.label === label), label);
    const jsp = multi.filter((row) => row.label === 'Formation groupée JSP');
    assert.equal(jsp.length, 4);
    assert.equal(new Set(jsp.map((row) => row.definitionId)).size, 1);
    assert.equal(new Set(jsp.map((row) => String(row.startsAt).slice(0, 10))).size, 1);
    assert.equal(new Set(jsp.map((row) => row.startsAt)).size, 4);
    assert.ok(!multi.some((row) => row.label === 'Conduite, formation continue'));
  });
  const html = context.qvProgrammeFilterBar(qv);
  await test('domain, family and type controls have the requested ordering and labels', () => {
    for (const [code, label] of Object.entries({ F0: 'Gouvernance', F1: 'Personnel', F2: 'Renseignements', F3: 'Opérationnel', F4: 'Logistique', F5: 'Partenaires', F6: 'SIC', F7: 'Formation', F8: 'Finances' })) assert.ok(html.includes(`>${code} ${label}</option>`));
    assert.ok(!html.includes('F0 — Gouvernance'));
    assert.ok(!html.includes('Conduite / PR'));
    assert.ok(html.indexOf('id="qv-filter-type"') < html.indexOf('id="qv-filter-status"'));
    for (const type of ['Cours', 'Événement', 'Exercice', 'Formation', 'Instruction', 'Représentation', 'Séance']) assert.ok(html.includes(`>${type}</option>`), type);
    for (const group of ['FORMATION', 'OPÉRATIONNEL', 'ÉVÉNEMENTIEL']) assert.ok(html.includes(`<optgroup label="${group}">`), group);
    assert.ok(!html.includes('<optgroup label=" ">'));
  });
  await test('OI hierarchy, public groups and Stat.Com presentation keep exact stored codes', () => {
    assert.match(html, /<option class="qv-oi-child" value="DPS:G1"[^>]*>&nbsp;&nbsp;&nbsp;G1<\/option>/);
    assert.match(html, /<option class="qv-oi-child" value="JSP:G1"[^>]*>&nbsp;&nbsp;&nbsp;JSP G1<\/option>/);
    assert.ok(!html.includes('>DPS:G1</option>'));
    for (const label of ['Opérationnel · DPS', 'Opérationnel · JSP', 'Domaines · FOBA', 'Domaines · FOCA', 'Domaines · AUTO', 'Domaines · PR']) assert.ok(html.includes(label), label);
    assert.match(html, /data-qv-statcom="010FOBA"/);
    assert.match(html, /class="qv-statcom-code">010FOBA<\/span><span class="qv-statcom-label">/);
    assert.ok(!html.includes('010FOBA —'));
    assert.match(css, /grid-template-columns:9ch minmax\(0,1fr\)/);
  });
  await test('locality-only choices excluded and agenda has four desktop KPI tracks', () => {
    for (const place of ['Donneloye', 'Belmont-sur-Yverdon', 'Ursins']) assert.ok(!html.includes(`<option value="${place}"`), place);
    assert.match(css, /\.qv-agenda-projection\s*\{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  });
  console.log(`QV-PROGRAMME-FILTRES-TAXONOMIE-CONDUITE-CORRECTIF-2: ${passed}/${passed} PASS`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
