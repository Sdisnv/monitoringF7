'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const reference = require('../netlify/lib/data/scope-qv-history-2026.json');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');
const { createFixture } = require('./scope-qv-local-fixture');
let passed = 0;
async function test(name, fn) { await fn(); console.log(`PASS ${++passed} - ${name}`); }

async function main() {
  const event = { evenement_id: 'real-history-event', date: '2026-02-14', libelle: reference.rows[0].title, code_source: reference.rows[0].code, heure_debut: reference.rows[0].start, statut: 'REALISE' };
  event.date = reference.rows[0].date;
  const fixture = createFixture(null, { events: [event] });
  const qv = await fixture.service.listProgramme(2027);
  const ui = fs.readFileSync(require.resolve('../assets/js/scope-ui'), 'utf8');
  const css = fs.readFileSync(require.resolve('../assets/css/scope.css'), 'utf8');
  const extract = name => ui.slice(ui.indexOf(`  function ${name}(`), ui.indexOf('\n  function ', ui.indexOf(`  function ${name}(`) + 1));
  const ctx = { L, qvActivities: () => [], qvDateKey: v => String(v || '').slice(0, 10), qvProgrammeDate: row => String(row.startsAt || '').slice(0, 10), qvCalendarKind: L.qvCalendarKind, qvMonthLabel: String,
    escapeHtml: value => String(value), qvFormatDate: String, route: () => ({ qvMois: event.date.slice(0, 7), qvJour: event.date }) };
  vm.createContext(ctx);
  vm.runInContext(['qvCalendarIndex', 'qvProgrammeProposedMonthKey', 'qvBuildMonth', 'qvYearMonths', 'qvAgendaReference'].map(extract).join('\n'), ctx);
  const rows = qv.canonicalProgramme.rows.filter(row => !row.external);
  await test('une seule grille annuelle', () => assert.equal((extract('renderQuoVadisAgendaAnnuel').match(/class="qv-year-grid"/g) || []).length, 1));
  await test('navigation directe des trois annees', () => [2026, 2027, 2028].forEach(year => assert.equal(L.parseHash(`#/quo-vadis/agenda-annuel?annee=${year}`).qvAnnee, year)));
  await test('navigation historique distincte du Programme', () => assert.match(extract('qvRenderMiniMonth'), /month.year === 2027 \?/));
  await test('vrai identifiant SCOPE et route evenement existante', () => {
    const html = ctx.qvAgendaReference(qv, ctx.qvYearMonths(qv, 2026), 2026);
    assert.ok(html.includes('#/exercices/real-history-event'));
    assert.ok(!html.includes('#/quo-vadis/programme/'));
  });
  await test('reference Excel sans correspondance sans faux id evenement', () => {
    assert.equal(qv.historicalAgenda2026.counts.matchedReferences, 1);
    assert.equal(qv.historicalAgenda2026.counts.unmatchedReferences, 918);
    assert.ok(qv.historicalAgenda2026.references.every(row => !row.eventId));
  });
  for (const year of [2026, 2027, 2028]) await test(`permanences ${year} presentes`, () => {
    const all = ctx.qvYearMonths(qv, year).flatMap(month => month.cells.filter(Boolean).flatMap(cell => cell.items));
    assert.ok(all.filter(row => row.definitionId === 'CTA-PERMANENCE').length >= (year === 2026 ? 46 : 52));
  });
  await test('pas de copie du Programme en 2028', () => assert.ok(qv.agendaYears[2028].rows.every(row => row.definitionId === 'CTA-PERMANENCE' && !row.historicalProposal && !row.publishedEventId)));
  await test('cycle continu 31 decembre 2027 et 7 janvier 2028', () => {
    assert.deepEqual(cta.assignmentsForFriday('2027-12-31').map(row => row.halfSection), ['N02b', 'N02b', 'N02b', 'N02b']);
    assert.deepEqual(cta.assignmentsForFriday('2028-01-07').map(row => row.halfSection), ['N01b', 'N01b', 'N01b', 'N01b']);
  });
  await test('calcul retrospectif sans reinitialisation annuelle', () => {
    const carry = qv.agendaYears[2026].rows.find(row => row.id === 'CTA-PERM-2026-12-25');
    assert.deepEqual(carry.ctaAssignments.map(row => row.halfSection), cta.assignmentsForFriday('2026-12-25').map(row => row.halfSection));
  });
  await test('neuf feries pour chaque annee', () => [2026, 2027, 2028].forEach(year => assert.equal(qv.calendarDays.filter(row => row.typeJour === 'FERIE' && row.jour.startsWith(`${year}-`)).length, 9)));
  await test('vacances officielles dependantes de chaque annee', () => {
    assert.ok(qv.calendarDays.some(row => row.jour === '2026-02-14' && row.metadata.dateFin === '2026-02-22'));
    assert.ok(qv.calendarDays.some(row => row.jour === '2028-02-12' && row.metadata.dateFin === '2028-02-20'));
    assert.ok(qv.calendarDays.some(row => row.jour === '2028-12-23' && row.metadata.dateFin === '2029-01-07'));
  });
  // 767 = 622 + 38 clones OI + 24 Instr demi-sct CTA + 80 conduites + 3 PR-ABC.
  await test('767 seances preservees', () => assert.equal(rows.length, 767));
  await test('646 dates preservees', () => assert.equal(rows.filter(row => row.startsAt).length, 646));
  await test('417 propositions historiques preservees', () => assert.equal(rows.filter(row => row.historicalProposal).length, 417));
  await test('121 sans date dont 112 sans periode et 9 avec mois', () => {
    const undated = rows.filter(row => !row.startsAt);
    assert.equal(undated.length, 121);
    assert.equal(undated.filter(row => ctx.qvProgrammeProposedMonthKey(row)).length, 9);
  });
  await test('TP9000 G1 seul', () => rows.filter(row => row.tp9000Rule).forEach(row => assert.deepEqual(row.ois, ['G1'])));
  await test('30 TP9000 cond TP9 seul', () => { const tp = rows.filter(row => row.tp9000Rule); assert.equal(tp.length, 30); tp.forEach(row => assert.deepEqual(row.publics, ['AUTO:2'])); });
  await test('16 codes atomiques de sections sans doublon', () => {
    const codes = L.qvProgrammePublicCatalogue().find(group => group.group === 'Sections DPS').items.map(item => item[0]);
    assert.equal(codes.length, 16); assert.equal(new Set(codes).size, 16); assert.ok(codes.includes('N06'));
  });
  await test('affectations source demontree et respect des publics complementaires', () => {
    const row = L.qvEnrichSectionPublic({ domain: 'DPS', label: 'Instr demi-sct - KICK-OFF', ois: ['G1'], publics: ['ECH:I'], historicalProposal: { sourceLine: 11 } }, reference.rows);
    assert.deepEqual(row.publics, ['ECH:I', 'N05a']);
    // Rotation retablie : chaque occurrence section/demi-section porte desormais sa propre section demontree.
    assert.equal(qv.sectionPublicSummary.demonstrated, 138);
  });
  await test('ambiguite conservee sans section deduite de la permanence', () => {
    const row = L.qvEnrichSectionPublic({ domain: 'DPS', label: 'Instr demi-sct - KICK-OFF', ois: ['B2'], publics: [], historicalProposal: { sourceLine: 13 } }, reference.rows);
    assert.deepEqual(row.publics, []); assert.equal(row.sectionPublicStatus, 'AMBIGUOUS');
    // Apres correction de la rotation il ne subsiste qu'une seule ambiguite reelle de section.
    const summary = qv.sectionPublicSummary;
    assert.equal(summary.ambiguous, 0); assert.equal(summary.moaRequired, 0);
    assert.equal(summary.demonstrated, 138);
    assert.ok(!rows.some(row => row.sectionPublicRule === 'SHARED_HISTORICAL_REFERENCE'));
  });
  await test('resume des sections et contraction des echelons', () => assert.equal(L.qvFormatPublicLabels(['N03a', 'ECH:I', 'ECH:II']), 'N03a, Échelon I et II'));
  await test('checkbox carrees et focus accessible', () => { assert.match(css, /input\[type=checkbox\]\{appearance:none;[^}]*border-radius:0/); assert.match(css, /input\[type=checkbox\]:focus-visible/); });
  await test('respiration 26px entre groupes et zebra par ligne', () => { assert.match(css, /fieldset\+fieldset\{margin-top:26px/); assert.match(css, /label:nth-of-type\(even\)\{background:#f4f5f6/); });
  await test('nouveaux publics enregistrables sans ecrire un evenement', async () => {
    const id = rows.find(row => (row.label || '') === 'Instr demi-sct - ABC').id;
    const saved = await fixture.service.updateProgrammePreparation(id, { date: '2027-02-04', startTime: '19:00', endTime: '21:30', oiCodes: ['G1'], publicCodes: ['N03a', 'N06'], lieuId: 'caserne-g1', salleTheorieId: null, responsableFonctionCode: 'Chef OP' });
    assert.deepEqual(saved.quoVadis.canonicalProgramme.rows.find(row => row.id === id).publics, ['N03a', 'N06']);
    assert.ok(!fixture.queries.some(query => /^(update|insert into|delete from) scope_evenements/i.test(query.sql.trim())));
  });
  await test('source Excel complete conservee avec empreinte', () => { assert.equal(reference.rows.length, 919); assert.match(reference.sha256, /^[0-9a-f]{64}$/); assert.equal(programme.rows.filter(row => !row.external).length, 622); });
  await test('decisions lifecycle locales preservent histoire et evenements publies', async () => {
    const lifecycle = createFixture(null);
    const id = rows.find(row => (row.label || '') === 'Instr demi-sct - ABC').id;
    for (const action of ['CANCEL_YEAR', 'DISABLE_PRODUCTION']) {
      const saved = await lifecycle.service.updateProgrammePreparation(id, { lifecycleAction: action });
      assert.equal(saved.updated, true);
      assert.equal(lifecycle.preparations[0].metadata.lifecycleDecision.action, action);
      assert.equal(lifecycle.preparations[0].metadata.lifecycleDecision.keepHistory, true);
    }
    assert.equal(lifecycle.preparations.length, 1);
    assert.ok(!lifecycle.queries.some(query => /^(update|insert into|delete from) scope_evenements/i.test(query.sql.trim())));
  });
  console.log(`QV HISTORY SECTIONS UX: ${passed}/${passed} PASS`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
