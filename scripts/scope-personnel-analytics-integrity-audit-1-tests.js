#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-ANALYTICS-INTEGRITY-AUDIT-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const charts = require('../assets/js/scope-charts.js');
const {
  buildCyclePilotage,
} = require('../netlify/lib/_scope-cycle-rules');

const PERIOD = { from: '2026-01-01', to: '2026-12-31', preset: 'CUSTOM' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function cible(repo, domaine, niveau = 'GEN'){
  const preferred = await repo.findCible(domaine, niveau);
  if(preferred) return preferred;
  for(const fallback of ['1', 'A', 'B1', '2', 'A1']){
    const found = await repo.findCible(domaine, fallback);
    if(found) return found;
  }
  const all = await repo.listCibles();
  return (all || []).find((row) => row.domaine_code === domaine) || null;
}

async function person(repo, id, nip, cibleId){
  const row = await repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Audit${nip}`,
    prenom: 'Personnel',
    grade: 'Sap',
    date_entree: '2025-01-01',
    date_entree_sdis: '2025-01-01'
  });
  await repo.insertAffectation({ personne_id: id, cible_id: cibleId, date_debut: '2025-01-01' });
  return row;
}

async function event(repo, id, domaine, date, cibleId, patch = {}){
  const row = await repo.insertEvenement(Object.assign({
    evenement_id: id,
    date,
    domaine_code: domaine,
    libelle: id,
    code_cours: id,
    statut: 'REALISE',
    mode_suivi: 'NOMINATIF',
    cible_ids: [cibleId]
  }, patch));
  await repo.setEventCibles(row.evenement_id, [cibleId]);
  return row;
}

async function expect(repo, eventId, personId){
  await repo.upsertAttendu({ evenement_id: eventId, personne_id: personId, inclus: true, origine: 'AUDIT' });
}

async function decide(repo, eventId, personId, statut, extra = {}){
  await repo.upsertParticipation(Object.assign({
    evenement_id: eventId,
    personne_id: personId,
    statut,
    role: 'PARTICIPANT',
    source: 'SAISIE'
  }, extra));
}

function graphPoints(graph){
  return ((((graph || {}).series || [])[0] || {}).points) || [];
}

function byId(points){
  return Object.fromEntries((points || []).map((point) => [point.id, point]));
}

function directoryRow(directory, personId){
  return (directory.personnes || []).find((row) => String(row.personneId) === String(personId));
}

async function assertFicheDirectorySync(persons, personId, expected){
  const fiche = await persons.fiche(personId, PERIOD);
  const directory = await persons.directory(PERIOD);
  const row = directoryRow(directory, personId);
  ok(row, `directory row missing for ${personId}`);
  for(const key of ['numerator', 'denominator', 'percentage', 'eventCount']){
    eq(fiche.kpi[key], row.taux[key], `fiche/directory mismatch ${personId}.${key}`);
  }
  for(const [key, value] of Object.entries(expected.volumes || {})){
    eq(fiche.kpi.volumes[key], value, `volume ${personId}.${key}`);
    if(key !== 'attendus') eq(Number((row.taux.volumes || {})[key] || 0), value, `directory volume ${personId}.${key}`);
  }
  if(expected.kpi){
    for(const [key, value] of Object.entries(expected.kpi)){
      eq(fiche.kpi[key], value, `kpi ${personId}.${key}`);
    }
  }
  return { fiche, row };
}

function countedHistory(events){
  return (events || []).filter((row) => Number(row.eventCountContribution || 0) > 0);
}

function sliceFills(svg){
  return Array.from(svg.matchAll(/<path\b(?![^>]*scope-donut-full)[^>]*\bfill="([^"]+)"/g)).map((match) => match[1]);
}

async function seedSimpleIntegrity(){
  const repo = createMemoryRepo();
  const dps = await cible(repo, 'DPS', 'GEN');
  const people = {
    present: await person(repo, 'audit-present', '91001', dps.cible_id),
    excuse: await person(repo, 'audit-excuse', '91002', dps.cible_id),
    absent: await person(repo, 'audit-absent', '91003', dps.cible_id),
    dispense: await person(repo, 'audit-dispense', '91004', dps.cible_id),
    planned: await person(repo, 'audit-planned', '91005', dps.cible_id),
    complex: await person(repo, 'audit-complex', '91006', dps.cible_id)
  };
  const rows = [
    ['simple-present', '2026-01-10', people.present.personne_id, 'PRESENT'],
    ['simple-excuse', '2026-01-11', people.excuse.personne_id, 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' }],
    ['simple-absent', '2026-01-12', people.absent.personne_id, 'ABSENT_NON_EXCUSE'],
    ['simple-dispense', '2026-01-13', people.dispense.personne_id, 'DISPENSE']
  ];
  for(const [id, date, pid, statut, extra] of rows){
    await event(repo, id, 'DPS', date, dps.cible_id);
    await expect(repo, id, pid);
    await decide(repo, id, pid, statut, extra || {});
  }
  await event(repo, 'planned-open', 'DPS', '2026-02-01', dps.cible_id, { statut: 'PLANIFIE' });
  await expect(repo, 'planned-open', people.planned.personne_id);

  const complexRows = [
    ['complex-present-a', '2026-03-01', 'PRESENT'],
    ['complex-present-b', '2026-03-02', 'PRESENT'],
    ['complex-excuse', '2026-03-03', 'ABSENT_EXCUSE'],
    ['complex-absent', '2026-03-04', 'ABSENT_NON_EXCUSE'],
    ['complex-dispense', '2026-03-05', 'DISPENSE']
  ];
  for(const [id, date, statut] of complexRows){
    await event(repo, id, 'DPS', date, dps.cible_id);
    await expect(repo, id, people.complex.personne_id);
    await decide(repo, id, people.complex.personne_id, statut, statut === 'ABSENT_EXCUSE' ? { motif_absence: 'PRIVE' } : {});
  }
  await event(repo, 'complex-cancelled', 'DPS', '2026-03-06', dps.cible_id, { statut: 'ANNULE' });
  await expect(repo, 'complex-cancelled', people.complex.personne_id);
  await event(repo, 'complex-hidden', 'DPS', '2026-03-07', dps.cible_id, { hidden_at: '2026-03-08T00:00:00Z' });
  await expect(repo, 'complex-hidden', people.complex.personne_id);
  await decide(repo, 'complex-hidden', people.complex.personne_id, 'PRESENT');
  await event(repo, 'complex-plan-a', 'DPS', '2026-03-08', dps.cible_id, { statut: 'PLANIFIE' });
  await event(repo, 'complex-plan-b', 'DPS', '2026-03-09', dps.cible_id, { statut: 'PLANIFIE' });
  await expect(repo, 'complex-plan-a', people.complex.personne_id);
  await expect(repo, 'complex-plan-b', people.complex.personne_id);
  return { repo, persons: createScopePersonService(repo), analytics: createScopeAnalyticsService(repo), people };
}

async function seedMultiSessionIntegrity(){
  const repo = createMemoryRepo();
  const pr = await cible(repo, 'PR', 'GEN');
  const auto = await cible(repo, 'AUTO', 'GEN');
  const dap = await cible(repo, 'DAP', 'GEN');
  const p = {
    ghost: await person(repo, 'ms-ghost', '92001', pr.cible_id),
    once: await person(repo, 'ms-once', '92002', pr.cible_id),
    twice: await person(repo, 'ms-twice', '92003', pr.cible_id),
    excuse: await person(repo, 'ms-excuse', '92004', pr.cible_id),
    dispense: await person(repo, 'ms-dispense', '92005', pr.cible_id),
    formateur: await person(repo, 'ms-formateur', '92006', pr.cible_id),
    surveillant: await person(repo, 'ms-surveillant', '92007', pr.cible_id),
    auxiliaire: await person(repo, 'ms-aux', '92008', pr.cible_id),
    dapGhost: await person(repo, 'dap-ghost', '92009', dap.cible_id),
    dapPresent: await person(repo, 'dap-present', '92010', dap.cible_id),
    autoPresent: await person(repo, 'auto-present', '92011', auto.cible_id),
    prabcPresent: await person(repo, 'prabc-present', '92012', pr.cible_id)
  };

  async function grouped(domain, cibleId, prefix, groupKey, people, statuses){
    const s1 = await event(repo, `${prefix}-s1`, domain, '2026-04-01', cibleId, {
      pr_exercise_group_key: groupKey,
      pr_session_key: `${groupKey}.1`,
      session_index: 1
    });
    const s2 = await event(repo, `${prefix}-s2`, domain, '2026-04-08', cibleId, {
      pr_exercise_group_key: groupKey,
      pr_session_key: `${groupKey}.2`,
      session_index: 2
    });
    for(const personRow of people){
      await expect(repo, s1.evenement_id, personRow.personne_id);
      await expect(repo, s2.evenement_id, personRow.personne_id);
    }
    for(const item of statuses){
      await decide(repo, item.eventId, item.personneId, item.statut, item.extra || {});
    }
    return [s1, s2];
  }

  const prEvents = await grouped('PR', pr.cible_id, 'pr-ms', 'NO_CYCLE_TEST:PR:77', [p.ghost, p.once, p.twice, p.excuse, p.dispense, p.formateur, p.surveillant, p.auxiliaire], [
    { eventId: 'pr-ms-s1', personneId: p.once.personne_id, statut: 'PRESENT' },
    { eventId: 'pr-ms-s1', personneId: p.twice.personne_id, statut: 'PRESENT' },
    { eventId: 'pr-ms-s2', personneId: p.twice.personne_id, statut: 'PRESENT' },
    { eventId: 'pr-ms-s1', personneId: p.excuse.personne_id, statut: 'ABSENT_EXCUSE', extra: { motif_absence: 'PRIVE' } },
    { eventId: 'pr-ms-s1', personneId: p.dispense.personne_id, statut: 'DISPENSE' },
    { eventId: 'pr-ms-s1', personneId: p.formateur.personne_id, statut: 'PRESENT', extra: { role: 'FORMATEUR' } },
    { eventId: 'pr-ms-s1', personneId: p.surveillant.personne_id, statut: 'PRESENT', extra: { role: 'SURVEILLANT', source: 'SAISIE' } },
    { eventId: 'pr-ms-s1', personneId: p.auxiliaire.personne_id, statut: 'PRESENT', extra: { role: 'AUXILIAIRE' } }
  ]);

  await grouped('DAP', dap.cible_id, 'dap-ms', 'DAP_FORMATION_GROUPEE:2026:1', [p.dapGhost, p.dapPresent], [
    { eventId: 'dap-ms-s1', personneId: p.dapPresent.personne_id, statut: 'PRESENT' }
  ]);
  await grouped('AUTO', auto.cible_id, 'auto-ms', 'AUTO:PL', [p.autoPresent], [
    { eventId: 'auto-ms-s1', personneId: p.autoPresent.personne_id, statut: 'PRESENT' },
    { eventId: 'auto-ms-s2', personneId: p.autoPresent.personne_id, statut: 'PRESENT' }
  ]);
  await grouped('PR', pr.cible_id, 'prabc-ms', 'NO_CYCLE_TEST:PR:ABC', [p.prabcPresent], [
    { eventId: 'prabc-ms-s1', personneId: p.prabcPresent.personne_id, statut: 'PRESENT' }
  ]);

  return { repo, persons: createScopePersonService(repo), analytics: createScopeAnalyticsService(repo), p, prEvents };
}

(async () => {
  await record('01 — événements simples : fiche, directory, analytics et graphes cohérents', async () => {
    const { persons, people } = await seedSimpleIntegrity();
    const present = await assertFicheDirectorySync(persons, people.present.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, excuses: 0, nonExcuses: 0, dispenses: 0, attendus: 1 }
    });
    eq(present.fiche.evenements[0].statutParticipation, 'PRESENT');
    const presentPoints = byId(graphPoints(present.fiche.graphs.repartition));
    eq(presentPoints.presents.value, 1);

    const excuse = await assertFicheDirectorySync(persons, people.excuse.personne_id, {
      kpi: { numerator: 0, denominator: 1, percentage: 0, eventCount: 1 },
      volumes: { presents: 0, excuses: 1, nonExcuses: 0, dispenses: 0, attendus: 1 }
    });
    eq(excuse.fiche.evenements[0].statutParticipation, 'ABSENT_EXCUSE');

    const absent = await assertFicheDirectorySync(persons, people.absent.personne_id, {
      kpi: { numerator: 0, denominator: 1, percentage: 0, eventCount: 1 },
      volumes: { presents: 0, excuses: 0, nonExcuses: 1, dispenses: 0, attendus: 1 }
    });
    eq(absent.fiche.evenements[0].statutParticipation, 'ABSENT_NON_EXCUSE');

    const dispense = await assertFicheDirectorySync(persons, people.dispense.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 1 },
      volumes: { presents: 0, excuses: 0, nonExcuses: 0, dispenses: 1, attendus: 1 }
    });
    eq(dispense.fiche.evenements[0].statutParticipation, 'DISPENSE');
  });

  await record('02 — planifié/non renseigné visible historique sans contribution inventée', async () => {
    const { persons, people } = await seedSimpleIntegrity();
    const { fiche, row } = await assertFicheDirectorySync(persons, people.planned.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 },
      volumes: { presents: 0, excuses: 0, nonExcuses: 0, dispenses: 0, attendus: 0 }
    });
    ok(fiche.evenements.some((eventRow) => eventRow.statutEvenement === 'PLANIFIE' && eventRow.statutParticipation === 'NON_RENSEIGNE'));
    eq(row.taux.eventCount, 0);
  });

  await record('03 — annulé visible, hidden absent, mix complexe explicable depuis historique', async () => {
    const { persons, analytics, people } = await seedSimpleIntegrity();
    const { fiche } = await assertFicheDirectorySync(persons, people.complex.personne_id, {
      kpi: { numerator: 2, denominator: 4, percentage: 50, eventCount: 5 },
      volumes: { presents: 2, excuses: 1, nonExcuses: 1, dispenses: 1, attendus: 5 }
    });
    ok(fiche.evenements.some((row) => row.evenementId === 'complex-cancelled' && row.statutParticipation === 'ANNULE'));
    ok(!fiche.evenements.some((row) => row.evenementId === 'complex-hidden'));
    ok(fiche.evenements.filter((row) => row.statutEvenement === 'PLANIFIE').length >= 2);
    const countable = countedHistory(fiche.evenements);
    eq(countable.length, 5);
    eq(countable.filter((row) => row.statutParticipation === 'PRESENT').length, 2);
    eq(countable.filter((row) => row.statutParticipation === 'ABSENT_EXCUSE').length, 1);
    eq(countable.filter((row) => row.statutParticipation === 'ABSENT_NON_EXCUSE').length, 1);
    eq(countable.filter((row) => row.statutParticipation === 'DISPENSE').length, 1);
    const evaluated = await analytics.evaluate(Object.assign({}, PERIOD, { personneId: people.complex.personne_id }));
    ok(!evaluated.includedEvents.some((row) => row.evenementId === 'complex-hidden'));
    ok(!evaluated.includedEvents.some((row) => row.evenementId === 'complex-cancelled'));
  });

  await record('04 — PR multi-session : aucun héritage global vers personne sans statut', async () => {
    const { persons, analytics, p } = await seedMultiSessionIntegrity();
    await assertFicheDirectorySync(persons, p.ghost.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 },
      volumes: { presents: 0, excuses: 0, nonExcuses: 0, dispenses: 0, attendus: 0 }
    });
    const global = await analytics.evaluate(Object.assign({}, PERIOD, { domaine: 'PR' }));
    ok(global.officiel.eventCount > 0, 'global PR conserve ses consolidations');
    ok(Number(global.officiel.volumes.presents || 0) > 0, 'global PR conserve ses présents');
  });

  await record('05 — PR multi-session : contribution individuelle 1x par session consolidée', async () => {
    const { persons, p } = await seedMultiSessionIntegrity();
    await assertFicheDirectorySync(persons, p.once.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
    const twice = await assertFicheDirectorySync(persons, p.twice.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
    eq(twice.fiche.evenements.length, 2);
    eq(twice.fiche.kpi.eventCount, 1);
    ok(twice.fiche.evenements.length > twice.fiche.kpi.eventCount);
  });

  await record('06 — PR multi-session : excusé/dispensé individuels sans pollution globale', async () => {
    const { persons, p } = await seedMultiSessionIntegrity();
    await assertFicheDirectorySync(persons, p.excuse.personne_id, {
      kpi: { numerator: 0, denominator: 1, percentage: 0, eventCount: 1 },
      volumes: { excuses: 1, presents: 0, attendus: 1 }
    });
    await assertFicheDirectorySync(persons, p.dispense.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 1 },
      volumes: { dispenses: 1, presents: 0, attendus: 1 }
    });
  });

  await record('07 — encadrement PR : formateur/surveillant 1x, auxiliaire hors statistiques participant', async () => {
    const { persons, p, prEvents, repo } = await seedMultiSessionIntegrity();
    await assertFicheDirectorySync(persons, p.formateur.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
    await assertFicheDirectorySync(persons, p.surveillant.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
    await assertFicheDirectorySync(persons, p.auxiliaire.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 },
      volumes: { presents: 0, attendus: 0 }
    });
    ok(prEvents.length === 2, 'jeu PR multi-session conservé');
  });

  await record('08 — DAP/AUTO/PR-ABC multi-session : même invariant sans héritage global', async () => {
    const { persons, p } = await seedMultiSessionIntegrity();
    await assertFicheDirectorySync(persons, p.dapGhost.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 },
      volumes: { presents: 0, attendus: 0 }
    });
    await assertFicheDirectorySync(persons, p.dapPresent.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
    await assertFicheDirectorySync(persons, p.autoPresent.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
    await assertFicheDirectorySync(persons, p.prabcPresent.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 },
      volumes: { presents: 1, attendus: 1 }
    });
  });

  await record('09 — JSP moniteur et cycle pilotage : rôles hors population jeunes', async () => {
    const repo = createMemoryRepo();
    const jsp = await cible(repo, 'JSP', 'GEN');
    const moniteur = await person(repo, 'jsp-moniteur', '93001', jsp.cible_id);
    const jeune = await person(repo, 'jsp-jeune', '93002', jsp.cible_id);
    const cycle = await repo.insertCycle({
      cycle_id: 'cycle-jsp-audit',
      cycle_key: 'JSP-AUDIT-2026',
      annee: 2026,
      domaine_code: 'JSP',
      libelle: 'JSP audit',
      date_debut: '2026-01-01',
      date_fin: '2026-12-31',
      statut: 'ACTIF'
    });
    const e = await event(repo, 'jsp-cycle-s1', 'JSP', '2026-05-01', jsp.cible_id, { cycle_id: cycle.cycle_id });
    await repo.upsertCyclePersonne({ cycle_id: cycle.cycle_id, personne_id: moniteur.personne_id, role_cycle: 'MONITEUR', statut_cycle: 'ACTIF', date_debut: '2026-01-01' });
    await repo.upsertCyclePersonne({ cycle_id: cycle.cycle_id, personne_id: jeune.personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF', date_debut: '2026-01-01' });
    await expect(repo, e.evenement_id, jeune.personne_id);
    await decide(repo, e.evenement_id, jeune.personne_id, 'PRESENT');
    await decide(repo, e.evenement_id, moniteur.personne_id, 'PRESENT', { role: 'MONITEUR' });
    const pilotage = buildCyclePilotage({
      cycle,
      evenements: [e],
      attendus: await repo.listAttendusForEvents([e.evenement_id]),
      participations: await repo.listParticipationsForEvents([e.evenement_id]),
      cyclePersonnes: await repo.listCyclePersonnes(cycle.cycle_id),
      personnes: await repo.listPersonnes({})
    });
    const moniteurRow = pilotage.individualRows.find((row) => row.personneId === moniteur.personne_id || row.personne_id === moniteur.personne_id);
    const jeuneRow = pilotage.individualRows.find((row) => row.personneId === jeune.personne_id || row.personne_id === jeune.personne_id);
    ok(moniteurRow && moniteurRow.isEncadrement);
    ok(!moniteurRow.isPopulation);
    ok(jeuneRow && jeuneRow.isPopulation);
  });

  await record('10 — graphiques personnels : même vérité KPI et couleurs sémantiques', async () => {
    const { persons, people } = await seedSimpleIntegrity();
    const { fiche } = await assertFicheDirectorySync(persons, people.complex.personne_id, {
      kpi: { numerator: 2, denominator: 4, percentage: 50, eventCount: 5 },
      volumes: { presents: 2, excuses: 1, nonExcuses: 1, dispenses: 1, attendus: 5 }
    });
    const points = byId(graphPoints(fiche.graphs.repartition));
    eq(points.presents.value, fiche.kpi.volumes.presents);
    eq(points.excuses.value, fiche.kpi.volumes.excuses);
    eq(points.nonExcuses.value, fiche.kpi.volumes.nonExcuses);
    eq(points.dispenses.value, fiche.kpi.volumes.dispenses);
    const donut = charts.renderDonutChart(fiche.graphs.repartition, { width: 420, height: 210 }, { personLayout: true });
    deepEq(sliceFills(donut), [charts.TOKENS.neutral, charts.TOKENS.warning, charts.TOKENS.secondary, charts.TOKENS.primary]);
    ok(donut.includes('Présents : 2'));
    ok(donut.includes('Excusés : 1'));
    ok(donut.includes('Absents : 1'));
    ok(donut.includes('Dispensés : 1'));
  });

  const nok = results.filter((row) => row.status !== 'PASS');
  const summary = { ok: nok.length === 0, assertions, results };
  console.log(JSON.stringify(summary, null, 2));
  if(nok.length) process.exit(1);
})();
