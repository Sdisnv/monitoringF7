#!/usr/bin/env node
'use strict';

// SCOPE — QUO VADIS — QV-2027-MOA-RECETTE-CORRECTIF-1
// Preuves des écarts relevés en recette MOA du Programme 2027, corrigés à la cause :
// QV-PROJ-001 (matérialisation dirigée par 2026), QV-DPS-006 (saison d'instruction),
// QV-PRABC-003 (3 séances), QV-PERIOD-001 (Revue quinquennale), QV-DAP-001 (conduite DAP),
// QV-UI-005 (FOCO) et QV-UI-006 (agenda d'une année passée).

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const L = require(path.join(root, 'assets/js/scope-ui-logic.js'));
const cta = require(path.join(root, 'netlify/lib/_scope-cta-rules'));
const canonical = require(path.join(root, 'netlify/lib/data/scope-qv-programme-2027.json'));
const history = require(path.join(root, 'netlify/lib/data/scope-qv-history-2026.json'));
const catalog = require(path.join(root, 'netlify/lib/data/scope-qv-canonical-annual-rules.json'));
const ui = fs.readFileSync(path.join(root, 'assets/js/scope-ui.js'), 'utf8');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`PASS ${passed} - ${name}`); }
  catch (error) { failures.push(name); console.log(`FAIL - ${name}\n  ${error.message}`); }
}

function pipeline(sourceRows) {
  const rotation = L.qvDistributeRotationOccurrences(sourceRows, history.rows, cta.instructionPublicForDate);
  const pionnier = L.qvApplyPionnierRules(rotation.rows);
  const family = L.qvApplyDpsInstructionFamilyRules(pionnier.rows, cta.instructionPublicForDate);
  const periodic = L.qvApplyPeriodicActivityRules(family.rows, { year: 2027 });
  const projection = L.qvMaterializeHistoricalOccurrences(periodic.rows, history.rows, { year: 2027 });
  const dapAnnual = L.qvApplyDapAnnualExercisePlan(projection.rows, history.rows);
  const foba = L.qvApplyFobaOccurrenceThemes(dapAnnual.rows, history.rows);
  const prSeries = L.qvApplyPrSeriesContinuity(foba.rows, history.rows);
  const options = { ...cta.conduiteEngineOptions(), season: L.qvInstructionSeasonBounds(history.rows, 2027) };
  const conduite = L.qvApplyConduiteContinue(prSeries.rows, options);
  const dap = L.qvApplyDapConduite(conduite.rows, history.rows, { year: 2027 });
  const prAbc = L.qvApplyPrAbcStructure(dap.rows, history.rows);
  return { rotation, periodic, projection, dapAnnual, foba, prSeries, conduite, dap, prAbc, options, rows: prAbc.rows.filter((row) => !row.external) };
}

const run = pipeline(canonical.rows);
const rows = run.rows;
const labelled = (label) => rows.filter((row) => (row.label || row.title) === label);
const dateOf = (row) => String(row.startsAt || '').slice(0, 10);
const timeOf = (row) => String(row.startsAt || '').slice(11, 16);
const weekday = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
const historyTitled = (re) => history.rows.filter((row) => re.test(String(row.title || '')));
const instructions = rows.filter((row) => /^Instr (?:sct|demi-sct)\b/.test(String(row.label || '')));

// ---------------------------------------------------------------- §2 Instructions DPS

test('QV-DPS-006 : saison dérivée de 2026, du premier samedi de février au 06.12', () => {
  const season = L.qvInstructionSeasonBounds(history.rows, 2027);
  assert.equal(season.start, '2027-02-06');
  assert.equal(weekday(season.start), 6);
  assert.equal(L.qvFirstSaturdayOfFebruary(2027), '2027-02-06');
  assert.equal(season.lastHistorical, '2026-12-07');
  assert.equal(season.end, '2027-12-06');
  // 2026 ne compte aucune instruction de section ou demi-section en janvier.
  assert.equal(historyTitled(/^Instr (?:sct|demi-sct)\b/).filter((row) => String(row.date).slice(5, 7) === '01').length, 0);
});

test('QV-DPS-006 : aucune instruction en janvier 2027 ni après Noël', () => {
  assert.equal(instructions.filter((row) => dateOf(row).slice(0, 7) === '2027-01').length, 0);
  assert.equal(instructions.filter((row) => dateOf(row) && dateOf(row) > '2027-12-23').length, 0);
  const programmed = rows.filter((row) => row.provenance === 'MOA_RULE_ANNUAL_PROGRAMMING');
  assert.equal(programmed.length, 0);
  programmed.forEach((row) => {
    assert.equal(weekday(dateOf(row)), 6);
    assert.ok(dateOf(row) >= '2027-02-06' && dateOf(row) <= '2027-12-06', `${row.id} hors saison : ${dateOf(row)}`);
  });
});

test('KICK-OFF : séquence annuelle complète sur les quatre sites, démarrage 06.02.2027', () => {
  const kickoff = rows.filter((row) => /KICK-OFF/.test(String(row.label || '')) && dateOf(row));
  assert.equal(kickoff.map(dateOf).sort()[0], '2027-02-06');
  // Chaque site est servi, aucun n'est resté sur la seule date du 06.02.
  for (const site of ['G1', 'C1', 'B1', 'B2']) {
    const perSite = kickoff.filter((row) => (row.ois || []).includes(site));
    assert.ok(perSite.length >= 3, `${site} : ${perSite.length} KICK-OFF`);
    assert.ok(new Set(perSite.map(dateOf)).size >= 3, `${site} : dates KICK-OFF non distribuées`);
  }
  // 2026 démontre 17 réalisations KICK-OFF réparties sur 9 dates, du 06.02 au 19.04.
  assert.equal(kickoff.length, 17);
  assert.equal(new Set(kickoff.map(dateOf)).size, 9);
  assert.equal(kickoff.map(dateOf).sort().pop(), '2027-04-19');
});

test('section et demi-section jamais converties, publics cohérents', () => {
  for (const row of instructions) {
    const kind = L.qvDpsInstructionKind(row);
    const sections = (row.publics || []).filter((code) => /^N0[1-6][ab]?$/.test(code));
    if (!sections.length) continue;
    if (kind === 'section') sections.forEach((code) => assert.equal(code.length, 3, `${row.id} : section avec public ${code}`));
    if (kind === 'demi-section') sections.forEach((code) => assert.equal(code.length, 4, `${row.id} : demi-section avec public ${code}`));
  }
});

test('PIONNIER non régressé : G1, FOBA 2, 4 h, CSU-nvb 19:15–22:00', () => {
  const pionnier = rows.filter((row) => L.qvIsPionnierRow(row));
  assert.ok(pionnier.length >= 15);
  const demi = pionnier.filter((row) => L.qvDpsInstructionKind(row) === 'demi-section' && dateOf(row));
  demi.forEach((row) => assert.deepEqual([timeOf(row), String(row.endsAt).slice(11, 16)], ['07:30', '11:30']));
  const csu = pionnier.filter((row) => /CSU-nvb/.test(String(row.eventLabel || row.label || '')) && dateOf(row));
  assert.ok(csu.length >= 1);
  csu.forEach((row) => assert.deepEqual([timeOf(row), String(row.endsAt).slice(11, 16)], ['19:15', '22:00']));
});

test('§2.6 Formation permanents : 7 occurrences datées de jour, CSU-nvb conservée', () => {
  const list = labelled('Formation permanents');
  assert.equal(historyTitled(/^Formation permanents/).length, 7);
  assert.equal(list.length, 7);
  list.forEach((row) => {
    assert.ok(dateOf(row), `${row.id} sans date`);
    assert.deepEqual(row.ois, ['G1']);
    assert.equal(row.responsible, 'C for');
    assert.ok(Number(timeOf(row).slice(0, 2)) < 15, `${row.id} : ${timeOf(row)} n'est pas une plage de jour`);
  });
  // Mercredi matin et lundi après-midi sont les créneaux démontrés par 2026.
  const slots = list.map((row) => `${weekday(dateOf(row))}|${timeOf(row)}`);
  assert.ok(slots.filter((slot) => slot === '3|08:00').length >= 3, 'mercredi matin absent');
  assert.ok(slots.filter((slot) => slot === '1|14:00').length >= 3, 'lundi après-midi absent');
  assert.equal(list.filter((row) => /CSU-nvb/.test(String(row.eventLabel || ''))).length, 1);
});

test('§2.7 Journée des familles : uniquement les OI qui l’organisent réellement', () => {
  const list = labelled('Journée des familles');
  const sourceOis = new Set(historyTitled(/^Journée des familles/).flatMap((row) => row.ois || []));
  assert.deepEqual([...sourceOis].sort(), ['B2', 'C1', 'G1', 'Y1', 'Y2', 'Y3']);
  assert.equal(list.length, 6);
  assert.deepEqual(list.flatMap((row) => row.ois).sort(), ['B2', 'C1', 'G1', 'Y1', 'Y2', 'Y3']);
  assert.equal(list.filter((row) => (row.ois || []).includes('B1')).length, 0);
  assert.equal(list.filter((row) => (row.ois || []).includes('Y4')).length, 0);
  list.forEach((row) => assert.ok(dateOf(row), `${row.id} sans date`));
  // Chaque OI garde sa période et son jour de semaine 2026.
  historyTitled(/^Journée des familles/).forEach((source) => {
    const row = list.find((item) => (item.ois || [])[0] === (source.ois || [])[0]);
    assert.equal(weekday(dateOf(row)), weekday(String(source.date)));
    assert.equal(timeOf(row), String(source.start).slice(0, 5));
  });
});

test('§2.8 Noël des familles : trois OI historiques, aucune duplication', () => {
  const list = labelled('Noël des familles');
  assert.equal(historyTitled(/^Noël des familles/).length, 3);
  assert.equal(list.length, 3);
  assert.deepEqual(list.flatMap((row) => row.ois).sort(), ['B1', 'C1', 'G1']);
  assert.equal(new Set(list.map(dateOf)).size, 3);
  list.forEach((row) => assert.ok(dateOf(row).startsWith('2027-12')));
});

test('§2.9 QV-PERIOD-001 : aucune Revue quinquennale en 2027, prochaine échéance 2031', () => {
  assert.equal(rows.filter((row) => /quinquenn/i.test(String(row.label || ''))).length, 0);
  assert.equal(run.periodic.report.removed, 3);
  assert.equal(run.periodic.report.nextDue, 2031);
  // L'activité n'est pas supprimée du référentiel : sa périodicité reste connue du moteur.
  const decision = L.qvPeriodicActivityDecision('Revue Quinquennale SDIS Nord vaudois', 2027);
  assert.equal(decision.due, false);
  assert.equal(decision.nextDue, 2031);
  assert.equal(decision.periodYears, 5);
  assert.equal(L.qvPeriodicActivityDecision('Préparation Revue Quinquennale', 2031).due, true);
  assert.equal(L.qvPeriodicActivityDecision('Préparation Revue Quinquennale', 2026).due, true);
  assert.ok(catalog.rules.some((rule) => rule.id === 'QV-PERIOD-001' && rule.active === true));
});

// ---------------------------------------------------------------- §3 PR-ABC

test('§3 QV-PRABC-003 : exactement 3 séances, T2 soir, T2 mercredi matin, T4', () => {
  const list = labelled('Exercice PR-ABC');
  assert.equal(historyTitled(/Exercice PR-?ABC/).length, 3);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map(dateOf).sort(), ['2027-04-20', '2027-06-09', '2027-10-05']);
  assert.deepEqual(list.map((row) => row.prAbcProposal.quarter).sort(), ['T2', 'T2', 'T4']);
  const morning = list.filter((row) => row.prAbcProposal.morning);
  assert.equal(morning.length, 1);
  assert.equal(weekday(dateOf(morning[0])), 3);
  assert.equal(timeOf(morning[0]), '08:00');
  assert.equal(list.filter((row) => row.prAbcProposal.quarter === 'T4').length, 1);
  // Une séance = une ligne.
  assert.equal(new Set(list.map((row) => row.occurrenceId)).size, 3);
  list.forEach((row) => assert.equal(row.sessionCount, 1));
});

test('§3 PR-ABC : public PABC sans JSP, responsable Chef PR', () => {
  labelled('Exercice PR-ABC').forEach((row) => {
    assert.deepEqual(row.publics, ['PR:3']);
    assert.deepEqual(row.ois, [], `${row.id} : aucun OI dans la source 2026`);
    assert.equal(row.publics.some((code) => code.startsWith('JSP')), false);
    assert.equal(row.responsible, 'C PR');
    assert.equal(row.domain, 'PR');
  });
  // Aucune activité PR-ABC ne porte JSP comme public.
  rows.filter((row) => /PR-?ABC/i.test(String(row.label || ''))).forEach((row) => {
    assert.equal((row.publics || []).some((code) => code.startsWith('JSP')), false, `${row.id}`);
  });
});

test('§3 PR-ABC : un OI fixé par décision humaine reste protégé', () => {
  const source = canonical.rows.filter((row) => row.label === 'Exercice PR-ABC');
  const protectedRow = { ...source[0], humanDecision: true, ois: ['G1'] };
  const result = L.qvApplyPrAbcStructure([protectedRow, ...source.slice(1)], history.rows);
  assert.deepEqual(result.rows.find((row) => row.id === protectedRow.id).ois, ['G1']);
});

// ---------------------------------------------------------------- §4 DAP

test('§4.1 QV-DAP-001 : conduite DAP rétablie, distincte des conduites DPS', () => {
  const dap = rows.filter((row) => row.label === 'Conduite, formation continue' && row.statCom === '01522F7');
  const dps = rows.filter((row) => row.label === 'Conduite, formation continue' && row.statCom === '0152F7');
  assert.equal(dap.length, 16);
  assert.equal(dps.length, 56);
  assert.deepEqual(run.dap.report.byOi, [{ oi: 'Y1', count: 4 }, { oi: 'Y2', count: 4 }, { oi: 'Y3', count: 4 }, { oi: 'Y4', count: 4 }]);
  dap.forEach((row) => {
    assert.ok(dateOf(row), `${row.id} sans date`);
    assert.deepEqual([timeOf(row), String(row.endsAt).slice(11, 16)], ['18:30', '21:30']);
    assert.equal(row.ois.length, 1);
    assert.ok(['Y1', 'Y2', 'Y3', 'Y4'].includes(row.ois[0]));
    assert.deepEqual(row.publics, ['AUTO:3']);
    assert.equal(row.conduiteSlots.length, 4);
    assert.equal(row.responsible, 'Of auto');
    assert.equal(row.conduiteRule, 'QV-DAP-001');
  });
  // Le contrôle de cohérence des conduites DPS reste vert : les deux familles ne se mélangent pas.
  const control = L.qvConduiteCoherenceControl(rows, run.options);
  assert.equal(control.pass, true);
  assert.equal(control.materialized, 56);
});

test('§4.3 exercices DAP : quatre réalisations par section, dernière vendredi/samedi', () => {
  for (const index of [1, 2, 3, 4]) {
    const label = `Exercice DAP ${index}`;
    const list = labelled(label);
    if (!list.length) continue;
    const sources = historyTitled(new RegExp(`^${label}$`));
    assert.equal(list.length, sources.length, `${label} : ${list.length} vs ${sources.length} réalisations 2026`);
    assert.equal(new Set(list.map((row) => `${dateOf(row)}|${(row.ois || []).join('+')}`)).size, list.length, `${label} : doublon technique`);
    assert.deepEqual(list.flatMap((row) => row.ois).sort(), ['Y1', 'Y2', 'Y3', 'Y4']);
    for (const exercise of list) {
      const cadre = labelled(`Cours de cadres exercice DAP ${index}`).find((row) => row.ois[0] === exercise.ois[0]);
      assert.ok(cadre && cadre.startsAt < exercise.startsAt, `${exercise.label} ${exercise.ois[0]} : cours de cadres non antérieur`);
      if (index === 4) assert.ok([5, 6].includes(weekday(dateOf(exercise))), `${exercise.id} : dernier exercice hors vendredi/samedi`);
    }
  }
  assert.equal(labelled('Exercice DAP 5').length, 0);
});

test('§4.4 cours de cadres exercice DAP : 4 cours, un par section, 16 réalisations distinctes', () => {
  const all = [1, 2, 3, 4].map((index) => labelled(`Cours de cadres exercice DAP ${index}`));
  all.forEach((list, index) => {
    assert.equal(list.length, 4, `DAP ${index + 1} : ${list.length} réalisations`);
    assert.deepEqual(list.flatMap((row) => row.ois).sort(), ['Y1', 'Y2', 'Y3', 'Y4']);
    // Plus aucun quadruplet : une réalisation propre par section, un local par section.
    // 2026 tient le cours DAP 4 pour Y1 et Y2 le même jour : la date seule ne discrimine pas.
    assert.equal(new Set(list.map((row) => `${dateOf(row)}|${(row.ois || []).join('+')}`)).size, 4, `DAP ${index + 1} : réalisations non distinctes`);
    assert.equal(new Set(list.map((row) => row.location)).size, 4, `DAP ${index + 1} : lieux non distincts`);
  });
  assert.equal(all.flat().length, 16);
});

test('§4.5 Vision locale DAP, Séance cadres, Reconnaissance DAP : réalisations propres', () => {
  for (const label of ['Vision locale DAP', 'Séance cadres', 'Reconnaissance DAP', 'Séance photo personnel DAP', 'Vision locale DPS']) {
    const list = labelled(label);
    if (!list.length) continue;
    const signatures = list.map((row) => `${row.startsAt}|${(row.ois || []).join('+')}|${row.location}`);
    assert.equal(new Set(signatures).size, signatures.length, `${label} : répétition identique restante`);
    list.forEach((row) => assert.ok(dateOf(row), `${label} : ${row.id} sans date`));
  }
});

// ---------------------------------------------------------------- §5 CMDT

test('§5 CMDT : le schéma 2026 est reconstitué, aucun Codir perdu', () => {
  const em = labelled('Séance État-major');
  const codir = labelled('Séance Codir').concat(labelled('Séance Codir + repas'));
  // Preuve directe des sources : 11 séances EM et 10 Codir dans le classeur 2026.
  assert.equal(historyTitled(/^Séance EM/).length, 11);
  assert.equal(historyTitled(/^Séance Codir/).length, 10);
  assert.equal(em.length, 11);
  assert.equal(codir.length, 10);
  em.forEach((row) => assert.ok(dateOf(row), `EM ${row.id} sans date`));
  codir.forEach((row) => assert.ok(dateOf(row), `Codir ${row.id} sans date`));
  assert.equal(new Set(em.map(dateOf)).size, 11);
  assert.equal(new Set(codir.map(dateOf)).size, 10);
  em.forEach((row) => { assert.equal(timeOf(row), '18:00'); assert.equal(row.responsible, 'Cdt'); });
  codir.forEach((row) => assert.equal(row.responsible, 'PrésidentE Codir'));
});

test('§5 CMDT : chaque Codir reste adossé à la période d’une séance État-major', () => {
  const em = labelled('Séance État-major').map(dateOf).sort();
  const codir = labelled('Séance Codir').concat(labelled('Séance Codir + repas')).map(dateOf).sort();
  // Relation temporelle démontrée en 2026 : un Codir se tient dans le mois d'une séance EM.
  codir.forEach((date) => {
    const near = em.some((item) => Math.abs(Date.parse(item) - Date.parse(date)) <= 31 * 86400000);
    assert.ok(near, `Codir ${date} sans séance État-major voisine`);
  });
  assert.deepEqual(labelled('Séance Codir').map((row) => row.status).filter((status) => status === 'VALIDATED').length, 1);
});

// ---------------------------------------------------------------- §6 JSP

test('§6 JSP : volumes cohérents avec 2026, aucun doublon technique', () => {
  const jspLabels = [...new Set(rows.filter((row) => row.domain === 'JSP').map((row) => row.label))];
  assert.ok(jspLabels.length > 10);
  for (const label of jspLabels) {
    const list = labelled(label);
    if (list.some((row) => Number(row.sessionCount || 1) > 1)) continue;
    const sources = historyTitled(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s*\\||$)`));
    if (!sources.length) continue;
    // Plusieurs sessions d'une même journée (Formation groupée JSP : 4 créneaux le 29.05) sont
    // des réalisations distinctes : l'horaire fait partie de la signature métier.
    const signatures = list.map((row) => `${row.startsAt}|${(row.ois || []).join('+')}|${row.location}`);
    assert.equal(new Set(signatures).size, signatures.length, `${label} : doublon technique`);
  }
  // Le public JSP n'est jamais remplacé par un public PR.
  rows.filter((row) => row.domain === 'JSP' && (row.publics || []).length)
    .forEach((row) => assert.equal((row.publics || []).some((code) => code.startsWith('PR:')), false, `${row.id}`));
});

test('§6 JSP : responsables métier conservés, pas de bascule générale vers À affecter', () => {
  const jsp = rows.filter((row) => row.domain === 'JSP');
  const assigned = jsp.filter((row) => row.responsible && row.responsible !== 'À affecter');
  assert.ok(assigned.length > jsp.length / 2, `${assigned.length}/${jsp.length} responsables métier`);
  // Les occurrences rétablies reprennent le responsable 2026, jamais À affecter par défaut.
  rows.filter((row) => row.projectionAdded && row.domain === 'JSP')
    .forEach((row) => assert.notEqual(row.responsible, 'À affecter', `${row.id}`));
});

// ---------------------------------------------------------------- §7 FOBA

test('§7 FOBA : règles acquises préservées', () => {
  const foba = rows.filter((row) => row.domain === 'FOBA');
  assert.ok(foba.length > 0);
  // 070F1.005 est un code d'exercice, jamais un Stat.Com.
  assert.equal(rows.filter((row) => String(row.statCom || '') === '070F1.005').length, 0);
  assert.ok(foba.every((row) => String(row.statCom || '').length <= 8));
  assert.ok(rows.some((row) => /^Exercice FOBA \d+$/.test(String(row.label || ''))));
});

// ---------------------------------------------------------------- §10 Multi-OI

test('§10 cas A : une ligne 2026 multi-OI reste un événement unique', () => {
  const buckets = L.qvHistoricalOccurrenceBuckets(history.rows, 'Séance personnel DAP', 2027);
  assert.equal(buckets.length, 1);
  assert.deepEqual(buckets[0].ois, ['Y1', 'Y2', 'Y3', 'Y4']);
  const list = labelled('Séance personnel DAP');
  assert.equal(list.length, 1);
  assert.deepEqual(list[0].ois, ['Y1', 'Y2', 'Y3', 'Y4']);
});

test('§10 cas B : K réalisations 2026 distinctes restent K occurrences propres', () => {
  const buckets = L.qvHistoricalOccurrenceBuckets(history.rows, 'Séance interne cadres JSP', 2027);
  assert.equal(buckets.length, 3);
  // Aucun OI dans la source : les lieux désignent les sites, l'OI est démontré par le lieu.
  assert.deepEqual(buckets.map((bucket) => bucket.ois[0]).sort(), ['B1', 'C1', 'G1']);
  assert.ok(buckets.every((bucket) => bucket.oiFromLocation));
  const list = labelled('Séance interne cadres JSP');
  assert.equal(list.length, 3);
  assert.equal(new Set(list.map((row) => row.location)).size, 3);
});

test('§10 aucune déduplication textuelle : rien n’est retiré par QV-PROJ-001', () => {
  const acted = run.projection.report.filter((entry) => !entry.reason);
  assert.equal(acted.length, 118);
  assert.equal(acted.reduce((total, entry) => total + entry.added, 0), 108);
  assert.equal(acted.reduce((total, entry) => total + entry.unmapped.length, 0), 0);
  // Les familles régies par une autre règle ne sont pas traitées ici.
  const skipped = run.projection.report.filter((entry) => entry.reason === 'MODELE_MULTI_SESSION');
  assert.ok(skipped.length >= 1);
  assert.equal(run.projection.report.some((entry) => entry.label === 'Exercice PR-ABC'), false);
});

test('doublons techniques : cinq lignes FOCA en excès dans cette projection historique', () => {
  const counts = new Map();
  rows.forEach((row) => {
    const key = [row.label, String(row.startsAt || 'ND'), (row.ois || []).slice().sort().join('+'),
      (row.publics || []).slice().sort().join('+'), row.location || ''].join('|');
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const repeated = [...counts.entries()].filter(([, value]) => value > 1);
  assert.equal(repeated.reduce((total, [, value]) => total + value - 1, 0), 5);
  assert.equal(repeated.length, 1);
  repeated.forEach(([key]) => assert.ok(key.includes('|ND|'), `répétition datée restante : ${key}`));
  // Ce pipeline historique précède l'annulation FOCA ; les six modules groupés sont désormais datés.
  assert.deepEqual([...new Set(rows.filter((row) => !row.startsAt).map((row) => row.label))].sort(),
    ['Groupe de travail FOCA']);
  assert.equal(rows.filter((row) => /^Formation groupée 1\.[1-6]$/.test(row.label) && row.startsAt).length, 6);
  assert.equal(historyTitled(/^Groupe de travail FOCA/).length, 0);
});

// ---------------------------------------------------------------- §8 et §9 interface

test('§8 QV-UI-005 : FOCO reste une famille, distincte des domaines F0-F8', () => {
  const filterBar = ui.slice(ui.indexOf('  function qvProgrammeFilterBar('), ui.indexOf('\n  function ', ui.indexOf('  function qvProgrammeFilterBar(') + 1));
  assert.ok(filterBar.includes("['FOBA','FOCO','FOCA','FOSPEC']"));
  assert.ok(filterBar.includes("field('qv-filter-family', 'Famille'"));
  assert.ok(filterBar.includes("field('qv-filter-domain', 'Domaine'"));
  assert.ok(!/domainLabels\s*=\s*\{[^}]*FOCO/.test(filterBar));
  assert.ok(catalog.rules.some((rule) => rule.id === 'QV-UI-005' && rule.active === true));
});

test('§8 QV-UI-005 : FOCO ne se deduit plus du domaine DPS, DAP ou JSP', () => {
  assert.equal(rows.filter((row) => row.domain === 'FOCO').length, 0);
  const foco = rows.filter((row) => L.qvProgrammeDomainMatches(row, 'FOCO'));
  assert.equal(foco.length, 0);
  assert.equal(L.qvProgrammeFamily({domain:'DPS',family:'Événement'}), 'Événement');
  // Les autres valeurs restent de vrais domaines : correspondance stricte, aucun élargissement.
  for (const domain of ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC', 'AUTO', 'PR', 'CMDT']) {
    const selected = rows.filter((row) => L.qvProgrammeDomainMatches(row, domain));
    assert.equal(selected.length, rows.filter((row) => row.domain === domain).length, domain);
  }
  assert.equal(rows.filter((row) => L.qvProgrammeDomainMatches(row, 'tous')).length, rows.length);
});

test('§9 QV-UI-006 : agenda 2026 exploitable sans mois dans l’URL', () => {
  const source = ui.slice(ui.indexOf('  function qvAgendaReference('), ui.indexOf('\n  function ', ui.indexOf('  function qvAgendaReference(') + 1));
  // Le repli n'est plus un retour vide : le premier mois porteur d'événements est retenu.
  assert.ok(/const populated = months\.filter\(/.test(source));
  assert.ok(/asked\.startsWith\(`\$\{year\}-`\) \? asked : \(\(populated\[0\] \|\| \{\}\)\.key \|\| ''\)/.test(source));
  assert.ok(/qv-agenda-reference-months/.test(source));
  assert.ok(/yearTotal/.test(source));
  const css = fs.readFileSync(path.join(root, 'assets/css/scope.css'), 'utf8');
  assert.ok(css.includes('.qv-agenda-reference-months{'));
});

// ---------------------------------------------------------------- §11 à §13 invariants

test('§11 codes métier : aucun identifiant technique exposé comme code', () => {
  rows.filter((row) => row.code).forEach((row) => {
    assert.ok(!/^QV/.test(String(row.code)), `${row.id} : code technique ${row.code}`);
    assert.ok(!/^[0-9a-f]{8}-[0-9a-f]{4}/.test(String(row.code)), `${row.id} : UUID en code`);
  });
  const dapCodes = rows.filter((row) => row.conduiteRule === 'QV-DAP-001').map((row) => row.code).filter(Boolean);
  assert.equal(new Set(dapCodes).size, dapCodes.length);
  dapCodes.forEach((code) => assert.match(String(code), /^01522F7\.\d{3}$/));
});

test('§12 CTA : permanences et cycles inchangés par ce correctif', () => {
  assert.equal(cta.expectedAnnualConduites(), 56);
  assert.deepEqual(cta.assignmentsForFriday('2027-12-31').map((row) => row.halfSection), ['N02b', 'N02b', 'N02b', 'N02b']);
  assert.deepEqual(cta.assignmentsForFriday('2028-01-07').map((row) => row.halfSection), ['N01b', 'N01b', 'N01b', 'N01b']);
  // Les 53 permanences CTA de l'overlay 2027 sont intactes : ce correctif ne les touche pas.
  assert.equal(rows.filter((row) => row.definitionId === 'CTA-PERMANENCE').length, 53);
  assert.equal(rows.filter((row) => row.definitionId === 'CTA-PERMANENCE' && !row.startsAt).length, 0);
  // Une permanence CTA n'est jamais confondue avec une instruction DPS.
  rows.filter((row) => row.definitionId === 'CTA-PERMANENCE')
    .forEach((row) => assert.equal(L.qvDpsInstructionKind(row), '', `${row.id}`));
});

test('§13 décisions humaines préservées et occurrences verrouillées intactes', () => {
  const locked = canonical.rows.find((row) => row.id === 'qv-source-862');
  const after = rows.find((row) => row.id === 'qv-source-862');
  assert.equal(after.startsAt, locked.startsAt);
  assert.equal(after.status, 'VALIDATED');
  assert.equal(after.projectionStatus, 'DECISION_EXISTANTE_PRESERVEE');
  assert.equal(run.projection.report.reduce((total, entry) => total + entry.protected, 0), 18);
  // Une décision humaine explicite n'est jamais réalignée.
  const marked = canonical.rows.map((row) => (row.id === 'qv-source-893'
    ? { ...row, metadata: { ...(row.metadata || {}), humanDecision: true } } : row));
  const guarded = pipeline(marked).rows.find((row) => row.id === 'qv-source-893');
  assert.equal(guarded.startsAt, '2027-01-29T08:00');
  assert.equal(guarded.projectionStatus, 'DECISION_EXISTANTE_PRESERVEE');
});

test('§13 idempotence : second passage sans changement supplémentaire', () => {
  const again = L.qvMaterializeHistoricalOccurrences(rows, history.rows, { year: 2027 });
  assert.equal(again.rows.filter((row) => !row.external).length, rows.length);
  assert.equal(again.report.reduce((total, entry) => total + entry.added, 0), 0);
  const second = pipeline(canonical.rows);
  assert.deepEqual(second.rows.map((row) => row.id), rows.map((row) => row.id));
  assert.deepEqual(second.rows.map((row) => row.startsAt), rows.map((row) => row.startsAt));
  const dapAgain = L.qvApplyDapConduite(rows, history.rows, { year: 2027 });
  assert.equal(dapAgain.report.added, 0);
  const prAgain = L.qvApplyPrAbcStructure(rows, history.rows);
  assert.equal(prAgain.report.added, 0);
  assert.equal(prAgain.report.surplus, 0);
});

test('réconciliation 829 et source 2027 intacte à 622', () => {
  assert.equal(canonical.rows.filter((row) => !row.external).length, 622);
  const clones = rows.filter((row) => row.rotationAdded).length;
  const projected = rows.filter((row) => row.projectionAdded).length;
  const programmed = rows.filter((row) => row.provenance === 'MOA_RULE_ANNUAL_PROGRAMMING').length;
  const conduites = rows.filter((row) => row.provenance === 'MOA_RULE_CONDUITE_ANNUAL').length;
  const dap = rows.filter((row) => row.conduiteRule === 'QV-DAP-001').length;
  assert.deepEqual([run.periodic.report.removed, clones, projected, programmed, conduites, dap, run.prAbc.report.added],
    [3, 38, 108, 0, 52, 16, 0]);
  assert.equal(run.dapAnnual.report.replacedFifth, 4);
  assert.equal(rows.length, 622 - 3 + 38 + 108 - 4 + 52 + 16);
  assert.equal(rows.length, 829);
  assert.equal(rows.filter((row) => row.startsAt).length, 823);
  assert.equal(rows.filter((row) => !row.startsAt).length, 6);
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
});

test('catalogue de règles : identifiants du correctif actifs et traçables', () => {
  const byId = new Map(catalog.rules.map((rule) => [rule.id, rule]));
  ['QV-PROJ-001', 'QV-PERIOD-001', 'QV-DPS-006', 'QV-PRABC-003', 'QV-DAP-001', 'QV-UI-005']
    .forEach((id) => assert.equal((byId.get(id) || {}).active, true, id));
  assert.equal((byId.get('QV-PRABC-001') || {}).active, false);
  assert.equal((byId.get('QV-PRABC-001') || {}).supersededBy, 'QV-PRABC-003');
  const doc = fs.readFileSync(path.join(root, 'docs/business-rules/quo-vadis-canonical-rules.md'), 'utf8');
  ['QV-PROJ-001', 'QV-PERIOD-001', 'QV-DPS-006', 'QV-PRABC-003', 'QV-DAP-001', 'QV-UI-005', 'QV-UI-006']
    .forEach((id) => assert.ok(doc.includes(id), id));
});

console.log(`\nQV 2027-MOA-RECETTE-CORRECTIF-1: ${passed}/${passed + failures.length} PASS`);
if (failures.length) { console.log(`ECHECS: ${failures.join(' | ')}`); process.exit(1); }
