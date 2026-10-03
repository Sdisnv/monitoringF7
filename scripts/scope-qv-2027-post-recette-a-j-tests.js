#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const canonical = require('../netlify/lib/data/scope-qv-programme-2027.json');
const history = require('../netlify/lib/data/scope-qv-history-2026.json');

const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const workbook = readWorkbook(workbookPath);
assert.equal(workbook.sha256, history.sha256);
assert.deepEqual(workbook.rows, history.rows);

let passed = 0;
function test(label, check) {
  check();
  passed += 1;
  console.log(`PASS ${passed} - ${label}`);
}
const date = (row) => String(row.startsAt || '').slice(0, 10);
const weekday = (value) => new Date(`${value}T12:00:00Z`).getUTCDay();
const source = (label) => workbook.rows.filter((row) => String(row.title || '').split('|')[0].trim() === label);

async function main() {
  const programme = (await createFixture(null).service.listProgramme(2027)).canonicalProgramme;
  const rows = programme.rows.filter((row) => !row.external);
  const byLabel = (label) => rows.filter((row) => row.label === label);
  const byPrefix = (prefix) => rows.filter((row) => String(row.label || '').startsWith(prefix));

  test('1 KICK-OFF: 17 réalisations, 9 dates, 4 sites', () => {
    const list = rows.filter((row) => /KICK-OFF/.test(row.label || ''));
    assert.equal(list.length, 17);
    assert.equal(new Set(list.map(date)).size, 9);
    assert.deepEqual([...new Set(list.flatMap((row) => row.ois))].sort(), ['B1', 'B2', 'C1', 'G1']);
  });
  test('2 PIONNIER/ABC et instructions: aucune date/public dupliqué', () => {
    const list = rows.filter((row) => /^Instr (?:sct|demi-sct)\b/.test(row.label || ''));
    const keys = list.map((row) => [row.label, row.startsAt, (row.ois || []).join('+'), (row.publics || []).join('+')].join('|'));
    assert.equal(new Set(keys).size, keys.length);
    assert.equal(byLabel('Instr demi-sct - PIONNIER').length, 10);
    assert.equal(byLabel('Instr demi-sct - ABC').length, 10);
    assert.equal(byLabel('Instr sct - ABC').length, 5);
  });
  test('3 DAP: quatre exercices par section, cours de cadres antérieurs', () => {
    for (const oi of ['Y1', 'Y2', 'Y3', 'Y4']) {
      const exercises = rows.filter((row) => /^Exercice DAP [1-4]$/.test(row.label || '') && row.ois.includes(oi));
      assert.equal(exercises.length, 4);
      for (const exercise of exercises) {
        const number = exercise.label.slice(-1);
        const cadre = byLabel(`Cours de cadres exercice DAP ${number}`).find((row) => row.ois.includes(oi));
        assert.ok(cadre && cadre.startsAt < exercise.startsAt);
      }
      assert.ok([5, 6].includes(weekday(date(exercises.find((row) => row.label === 'Exercice DAP 4')))));
    }
    assert.equal(byLabel('Exercice DAP 5').length, 0);
    assert.equal(programme.businessRules.dapAnnual.replacedFifth, 4);
  });
  test('4 DAP: identifiants du cinquième préservés et décision protégée', () => {
    const hidden = programme.rows.filter((row) => row.label === 'Exercice DAP 5');
    assert.equal(hidden.length, 4);
    assert.ok(hidden.every((row) => row.external));
    for (const row of hidden) assert.ok(canonical.rows.some((item) => item.id === row.id));
    const guarded = L.qvApplyDapAnnualExercisePlan([{ ...hidden[0], external: false, publishedEventId: 'human-event' }], workbook.rows);
    assert.equal(guarded.rows[0].external, false);
    assert.equal(guarded.rows[0].publishedEventId, 'human-event');
  });
  test('5 AUTO DPS: deux séances par demi-section et une heure maintenue', () => {
    const list = rows.filter((row) => row.label === 'Conduite, formation continue' && row.statCom === '0152F7');
    assert.equal(list.length, 56);
    assert.equal(cta.expectedAnnualConduites(), 56);
    assert.ok(list.every((row) => row.startsAt.slice(11) === '10:30' && row.endsAt.slice(11) === '11:30'));
    const perHalf = new Map();
    for (const row of list) {
      const half = row.publics.find((code) => /^N0\d[ab]$/.test(code));
      const key = `${row.ois[0]}:${half}`;
      perHalf.set(key, (perHalf.get(key) || 0) + 1);
    }
    assert.equal(perHalf.size, 28);
    assert.ok([...perHalf.values()].every((count) => count === 2));
  });
  test('6 conduite DAP: 4 soirées par section, cond VL et 4 créneaux', () => {
    const list = rows.filter((row) => row.statCom === '01522F7' && row.label === 'Conduite, formation continue');
    assert.equal(list.length, 16);
    for (const oi of ['Y1', 'Y2', 'Y3', 'Y4']) assert.equal(list.filter((row) => row.ois[0] === oi).length, 4);
    for (const row of list) {
      assert.ok(date(row).slice(5, 7) >= '03' && date(row).slice(5, 7) <= '05');
      assert.deepEqual(row.publics, ['AUTO:3']);
      assert.deepEqual([row.startsAt.slice(11), row.endsAt.slice(11)], ['18:30', '21:30']);
      assert.deepEqual(row.conduiteSlots.map((slot) => slot.startsAt.slice(11)), ['18:30', '19:00', '20:00', '20:30']);
      assert.ok(row.conduiteSlots.every((slot) => slot.conduiteMinutes === 30 && slot.connaissanceVehiculeMinutes === 30));
      assert.deepEqual(row.conduiteSlots.map((slot) => slot.conduiteStartsAt.slice(11)), ['19:00', '19:30', '20:30', '21:00']);
      assert.deepEqual(row.conduiteSlots.map((slot) => slot.connaissanceVehiculeStartsAt.slice(11)), ['18:30', '19:00', '20:00', '20:30']);
    }
  });
  test('7 JSP: activités particulières préservées', () => {
    assert.equal(rows.filter((row) => row.domain === 'JSP').length, 84);
    assert.ok(rows.some((row) => /Formation groupée JSP/.test(row.label || '')));
  });
  test('8 FOBA: 10 FOBA 1/2, 3 FOBA 3, thèmes et codes distincts', () => {
    const list = byPrefix('Exercice FOBA');
    assert.equal(list.length, 13);
    assert.equal(list.filter((row) => row.publics.includes('FOBA:3')).length, 3);
    assert.equal(list.filter((row) => row.publics.includes('FOBA:1') && row.publics.includes('FOBA:2')).length, 10);
    assert.deepEqual(byLabel('Exercice FOBA').map((row) => row.themes[0]), ['Consolidation 1', 'Consolidation 2', 'Consolidation 3']);
    assert.ok(list.every((row) => row.statCom === '010FOBA' && row.code !== row.statCom));
    assert.ok(rows.every((row) => row.statCom !== '070F1.005'));
  });
  test('9 FOCO: agrégation volontaire, aucun domaine FOCO inventé', () => {
    const list = rows.filter((row) => L.qvProgrammeDomainMatches(row, 'FOCO'));
    assert.equal(list.length, 485);
    assert.deepEqual([...new Set(list.map((row) => row.domain))].sort(), ['DAP', 'DPS', 'JSP']);
    assert.equal(rows.filter((row) => row.domain === 'FOCO').length, 0);
  });
  test('10 OFSI: quatre séances et autres FOSPEC préservés', () => {
    const list = byPrefix('Exercice OFSI');
    assert.equal(list.length, 4);
    assert.deepEqual(list.map(date).sort(), source('Exercice OFSI・infrastructures CFF').map((row) => L.qvShiftHistoricalDate(row.date)).sort());
    for (const pattern of [/NAC/i, /opérateur VPC/i, /Antichute/i, /BLS/i]) assert.ok(rows.some((row) => pattern.test(row.label || '')), String(pattern));
  });
  test('11 PR: six PR 1.x datés, puis séries 2–4 et thèmes', () => {
    const first = byLabel('Exercice PR 1.1').sort((a, b) => a.sessionIndex - b.sessionIndex);
    assert.equal(first.length, 6);
    for (const [index, row] of first.entries()) {
      const historical = source(`Exercice PR 1.${index + 1}`)[0];
      assert.equal(date(row), L.qvShiftHistoricalDate(historical.date));
      assert.deepEqual(row.themes, ['Base']);
    }
    for (const number of [2, 3, 4]) assert.equal(rows.filter((row) => new RegExp(`^Exercice PR ${number}\\.`).test(row.label || '')).length, 6);
    assert.ok(first.every((row) => row.publics.includes('PR:2') && !row.publics.includes('PR:3')));
    assert.ok(byLabel('Exercice PR-ABC').every((row) => row.publics.includes('PR:3')));
  });
  test('12 CMDT: EM/CODIR présents, positionnement comparé à 2026', () => {
    assert.equal(byLabel('Séance État-major').length, 11);
    assert.equal(byPrefix('Séance Codir').length, 10);
    const em26 = workbook.rows.filter((row) => row.title.startsWith('Séance EM') && row.date.startsWith('2026-'));
    const codir26 = workbook.rows.filter((row) => row.title.startsWith('Séance Codir') && row.date.startsWith('2026-'));
    assert.equal(em26.length, 9);
    assert.equal(codir26.length, 9);
    assert.ok(codir26.some((row) => !em26.some((em) => em.date === row.date || L.qvShiftHistoricalDate(em.date, 1) === row.date)));
  });
  test('13 CTA: 53 permanences et rotations intactes', () => {
    const list = rows.filter((row) => row.definitionId === 'CTA-PERMANENCE');
    assert.equal(list.length, 53);
    const expected = new Map(cta.generateYear(2027).rows.map((row) => [row.id, row]));
    for (const row of list) {
      const match = expected.get(row.id);
      assert.ok(match);
      assert.equal(row.startsAt, match.startsAt);
      assert.deepEqual(row.ctaAssignments.map((item) => item.halfSection), match.ctaAssignments.map((item) => item.halfSection));
    }
  });
  test('14 codes métier et Stat.Com: les lignes sources gardent leurs codes', () => {
    const original = new Map(canonical.rows.map((row) => [row.id, row]));
    for (const row of programme.rows.filter((item) => /^(?:Exercice DAP [1-5]|Exercice FOBA(?: \d+)?|Exercice PR [1-4]\.\d+)$/.test(item.label || ''))) {
      const before = original.get(row.id);
      if (!before) continue;
      assert.equal(row.code, before.code, row.id);
      assert.equal(row.statCom, before.statCom, row.id);
    }
  });
  test('15 décisions et assignations: aucun déplacement des lignes protégées', () => {
    const original = new Map(canonical.rows.map((row) => [row.id, row]));
    for (const row of rows.filter((item) => item.status === 'VALIDATED' || item.publishedEventId)) {
      const before = original.get(row.id);
      if (!before) continue;
      assert.equal(row.startsAt, before.startsAt, row.id);
      assert.deepEqual(row.ois, before.ois, row.id);
      assert.ok((before.publics || []).every((code) => row.publics.includes(code)), row.id);
    }
  });
  test('16 interface: thèmes, créneaux et cible recalculée visibles', () => {
    const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('qv-programme-themes'));
    assert.ok(ui.includes('row.conduiteSlots'));
    assert.ok(ui.includes('slot.conduiteStartsAt'));
    assert.deepEqual([programme.target.models, programme.target.occurrences, programme.target.sessions,
      programme.target.oiMaterializations, programme.target.toReview], [260, 805, 829, 1217, 704]);
    assert.equal(rows.filter((row) => row.startsAt).length, 817);
    assert.equal(rows.filter((row) => !row.startsAt).length, 12);
  });

  const preparedFixture = createFixture(null);
  const fifth = programme.rows.find((row) => row.label === 'Exercice DAP 5');
  preparedFixture.preparations.push({ obligation_id: 'human-dap-5', programme_id: 'local-qv-2027', source_type: 'MANUAL',
    source_ref: fifth.id, title: fifth.label, domain: 'DAP', statcom_code: fifth.statCom, cible_codes: fifth.publics,
    statut: 'PLANIFIE', metadata: { source: 'QV_PROGRAMME_PREPARATION', humanDecision: true,
      planningFields: { date: '2027-11-19', startTime: '19:00', endTime: '21:30', oiCodes: fifth.ois, publicCodes: fifth.publics } } });
  const restored = (await preparedFixture.service.listProgramme(2027)).canonicalProgramme.rows.find((row) => row.id === fifth.id);
  test('17 préparation humaine DAP 5 conservée malgré la non-reconduction automatique', () => {
    assert.equal(restored.external, false);
    assert.equal(restored.dapAnnualStatus, 'DECISION_EXISTANTE_PRESERVEE');
    assert.equal(restored.startsAt.slice(0, 16), '2027-11-19T19:00');
    assert.deepEqual(restored.ois, fifth.ois);
  });
  const protectedUpdate = await preparedFixture.service.updateProgrammePreparation(fifth.id, {
    year: 2027, activityLabel: fifth.label, date: '2027-11-19', startTime: '19:00', endTime: '21:30',
    status: 'PLANIFIE', oiCodes: fifth.ois, publicCodes: fifth.publics, statCom: fifth.statCom
  });
  test('18 fiche DAP 5 déjà préparée reste enregistrable, nouvelle cinquième séance refusée', () => {
    assert.equal(protectedUpdate.updated, true);
    const updated = protectedUpdate.quoVadis.canonicalProgramme.rows.find((row) => row.id === fifth.id);
    assert.equal(updated.startsAt.slice(0, 16), '2027-11-19T19:00');
    assert.equal(updated.external, false);
  });
  const unpreparedFifth = await createFixture(null).service.updateProgrammePreparation(fifth.id, {
    year: 2027, activityLabel: fifth.label, date: '2027-11-19', startTime: '19:00', endTime: '21:30',
    status: 'PLANIFIE', oiCodes: fifth.ois, publicCodes: fifth.publics, statCom: fifth.statCom
  });
  test('19 règle DAP annuelle ne permet pas de créer une cinquième séance ex nihilo', () => {
    assert.equal(unpreparedFifth.updated, false);
    assert.equal(unpreparedFifth.reason, 'PROGRAMME_ITEM_NOT_FOUND');
  });

  const themeFixture = createFixture(null);
  const foba = byLabel('Exercice FOBA')[0];
  const saved = await themeFixture.service.updateProgrammePreparation(foba.id, {
    year: 2027, activityLabel: foba.label, date: date(foba), startTime: '18:30', endTime: '21:30',
    status: 'PLANIFIE', oiCodes: [], publicCodes: ['FOBA:3'], statCom: '010FOBA',
    themes: ['Consolidation 1', 'Hydrant']
  });
  test('20 thèmes FOBA multiples enregistrés sur une occurrence sans changer l’activité', () => {
    assert.equal(saved.updated, true);
    const updated = saved.quoVadis.canonicalProgramme.rows.find((row) => row.id === foba.id);
    assert.deepEqual(updated.themes, ['Consolidation 1', 'Hydrant']);
    assert.equal(updated.label, foba.label);
    assert.equal(updated.statCom, foba.statCom);
    assert.equal(saved.quoVadis.canonicalProgramme.target.toReview, 703);
    assert.equal(themeFixture.queries.some((entry) => /^(?:update|insert into|delete from) scope_evenements/i.test(entry.sql.trim())), false);
  });

  console.log(`QV-2027-POST-RECETTE-A-J: ${passed}/${passed} PASS`);
}
main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
