#!/usr/bin/env node
'use strict';

/** SCOPE — GENERIC-PR-HISTORICAL-SERIES-REPAIR-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const {
  SERIES_TYPE,
  describeEventSeries,
  seriesPersistenceFields
} = require('../netlify/lib/_scope-event-series');
const {
  buildCyclePilotage,
  resolveSessionReportingScope
} = require('../netlify/lib/_scope-cycle-rules');

const PERIOD = { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function addPerson(repo, id, nip, cibleId){
  const person = await repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Nom${nip}`,
    prenom: 'Test',
    grade: 'Sap',
    date_entree: '2026-01-01',
    date_entree_sdis: '2026-01-01'
  });
  await repo.insertAffectation({ personne_id: person.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return person;
}

async function buildRepo(){
  const repo = createMemoryRepo();
  const pr = await repo.findCible('PR', 'GEN') || await repo.findCible('FOSPEC', 'PR') || (await repo.listCibles()).find((row) => String(row.domaine_code) === 'PR');
  const dps = await repo.findCible('DPS', 'B1');
  const foba = await repo.findCible('FOBA', '1');
  const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', 'G1');
  const participant = await addPerson(repo, 'p-pr', '9001', pr.cible_id);
  const excuse = await addPerson(repo, 'p-excuse', '9002', pr.cible_id);
  const dispense = await addPerson(repo, 'p-dispense', '9003', pr.cible_id);
  await repo.insertCycle({ cycle_id: 'cycle-pr-2026', cycle_key: 'PR-2026', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle PR 2026', statut: 'REALISE' });
  const specs = [
    ['pr-1-1', 'Exercice PR 1.1 | Base', '2026-01-11'],
    ['pr-1-2', 'Exercice PR 1.2 | Base', '2026-01-12'],
    ['pr-1-4', 'Exercice PR 1.4 | Base', '2026-01-14'],
    ['pr-1-6', 'Exercice PR 1.6 | Base', '2026-01-16'],
    ['pr-2-1', 'Exercice PR 2.1 | Practice', '2026-02-21'],
    ['pr-2-5', 'Exercice PR 2.5 | Practice', '2026-02-25'],
    ['pr-3-1', 'Exercice PR 3.1 | Highway to hell', '2026-03-31']
  ];
  for(const [id, libelle, date] of specs){
    const event = await repo.insertEvenement({
      evenement_id: id,
      cycle_id: 'cycle-pr-2026',
      date,
      domaine_code: 'PR',
      libelle,
      code_cours: id,
      statut: 'REALISE',
      origine: 'IMPORT_CSV',
      mode_suivi: 'NOMINATIF',
      cible_ids: [pr.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [pr.cible_id]);
    for(const person of [participant, excuse, dispense]){
      await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
    }
  }
  await repo.upsertParticipation({ evenement_id: 'pr-1-2', personne_id: participant.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  await repo.upsertParticipation({ evenement_id: 'pr-1-4', personne_id: participant.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  await repo.upsertParticipation({ evenement_id: 'pr-1-1', personne_id: excuse.personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL', role: 'PARTICIPANT', source: 'SAISIE' });
  await repo.upsertParticipation({ evenement_id: 'pr-1-6', personne_id: dispense.personne_id, statut: 'DISPENSE', role: 'PARTICIPANT', source: 'SAISIE' });

  const abcEvents = [1, 2, 3];
  for(const index of abcEvents){
    const event = await repo.insertEvenement({
      evenement_id: `abc-${index}`,
      cycle_id: 'cycle-pr-2026',
      date: `2026-04-0${index}`,
      domaine_code: 'PR',
      libelle: `Exercice PR-ABC | Refresh ${index}`,
      code_cours: `abc-${index}`,
      statut: 'REALISE',
      origine: 'IMPORT_CSV',
      mode_suivi: 'NOMINATIF',
      cible_ids: [pr.cible_id],
      pr_exercise_group_key: 'scope-prod-pr-abc-refresh-2026',
      pr_session_key: `scope-prod-pr-abc-refresh-2026.${index}`,
      session_index: index,
      nombre_sessions_attendu: 3
    });
    await repo.setEventCibles(event.evenement_id, [pr.cible_id]);
  }

  const service = createScopeService(repo);
  for(const spec of [
    { domain: 'DPS', cible: dps, personId: 'p-dps', nip: '9101' },
    { domain: 'FOBA', cible: foba, personId: 'p-foba', nip: '9102' },
    { domain: 'JSP', cible: jsp, personId: 'p-jsp', nip: '9103' }
  ]){
    const person = await addPerson(repo, spec.personId, spec.nip, spec.cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-05-01',
      domaineCode: spec.domain,
      libelle: `${spec.domain} multi générique`,
      cibleIds: [spec.cible.cible_id],
      modeSession: 'MULTI',
      nombreSessionsAttendu: 2,
      sessionIndex: 1
    }, { sub: 'test' });
    await repo.upsertAttendu({ evenement_id: created.evenement.evenement_id, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: created.evenement.evenement_id, personne_id: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  }
  return { repo, service, participant, excuse, dispense };
}

(async () => {
  await record('01 — PR général historique X.Y reconstruit en séries distinctes', async () => {
    const { repo } = await buildRepo();
    const events = await repo.listCycleEvents('cycle-pr-2026');
    const pr1 = events.filter((event) => describeEventSeries(event).seriesKey === 'cycle-pr-2026:PR:1');
    const pr2 = events.filter((event) => describeEventSeries(event).seriesKey === 'cycle-pr-2026:PR:2');
    const pr3 = events.filter((event) => describeEventSeries(event).seriesKey === 'cycle-pr-2026:PR:3');
    eq(pr1.length, 4);
    eq(pr2.length, 2);
    eq(pr3.length, 1);
    eq(describeEventSeries(pr1.find((event) => event.evenement_id === 'pr-1-6')).sessionNumber, 6);
    ok(pr1.every((event) => describeEventSeries(event).seriesType === SERIES_TYPE.MULTI_SESSION));
  });

  await record('02 — fiche événement PR historique affiche formation multi-séances réelle', async () => {
    const { service } = await buildRepo();
    const first = await service.lireEvenement('pr-1-1');
    const last = await service.lireEvenement('pr-1-6');
    eq(first.formationConfiguration.label, 'Exercice PR 1 — 2026');
    eq(first.formationConfiguration.modeOrganisation, 'MULTI_SESSION');
    eq(first.formationConfiguration.sessionCount, 6);
    eq(first.formationConfiguration.sessionIndex, 1);
    eq(last.formationConfiguration.sessionIndex, 6);
    eq(last.formationConfiguration.organisation, 'Plusieurs sessions · 6 sessions');
    eq(first.formationConfiguration.originLabel, 'Import historique');
  });

  await record('03 — cycles consolident PR 1.x par obligation et dédupliquent par NIP', async () => {
    const { repo } = await buildRepo();
    const pilotage = buildCyclePilotage({
      cycle: await repo.getCycle('cycle-pr-2026'),
      evenements: await repo.listCycleEvents('cycle-pr-2026'),
      personnes: [await repo.getPersonne('p-pr'), await repo.getPersonne('p-excuse'), await repo.getPersonne('p-dispense')],
      cyclePersonnes: [],
      attendus: await repo.listAttendusForEvents(['pr-1-1', 'pr-1-2', 'pr-1-4', 'pr-1-6', 'pr-2-1', 'pr-2-5', 'pr-3-1']),
      participations: await repo.listParticipationsForEvents(['pr-1-1', 'pr-1-2', 'pr-1-4', 'pr-1-6'])
    });
    const keys = pilotage.obligations.map((row) => row.obligationKey);
    ok(keys.includes('cycle-pr-2026:PR:1'));
    ok(keys.includes('cycle-pr-2026:PR:2'));
    ok(keys.includes('cycle-pr-2026:PR:3'));
    const participant = pilotage.individualRows.find((row) => row.nip === '9001');
    const pr1 = participant.obligations.find((row) => row.obligationKey === 'cycle-pr-2026:PR:1');
    eq(participant.realisedCount, 1);
    eq(pr1.status, 'REALISE');
    eq(pr1.coveredInGlobalBilan, true);
  });

  await record('04 — analytics/personnel/rapport utilisent la même identité d’obligation', async () => {
    const { repo, participant } = await buildRepo();
    const analytics = createScopeAnalyticsService(repo);
    const person = await createScopePersonService(repo).fiche(participant.personne_id, PERIOD);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', personneId: participant.personne_id });
    const report = await collectReport(repo, { kind: 'EVENT', evenementId: 'pr-1-2', nominatif: true }, { roles: ['UTILISATEUR'], sub: 'test' });
    eq(person.kpi.eventCount, 1);
    eq(summary.officiel.eventCount, 1);
    eq(report.officiel.numerator, 1);
    eq(report.officiel.denominator, 1);
  });

  await record('05 — PR-ABC historique reste multi-session trois sessions', async () => {
    const { service } = await buildRepo();
    const first = await service.lireEvenement('abc-1');
    const second = await service.lireEvenement('abc-2');
    eq(first.formationConfiguration.modeOrganisation, 'MULTI_SESSION');
    eq(first.formationConfiguration.sessionCount, 3);
    eq(first.formationConfiguration.sessionIndex, 1);
    eq(second.formationConfiguration.sessionIndex, 2);
  });

  await record('06 — X.Y générique reste proposé sans persistance automatique', () => {
    const fields = seriesPersistenceFields({ domaine_code: 'FOBA', libelle: 'Exercice 4.2' });
    eq(fields.pr_exercise_group_key, null);
    eq(fields.pr_session_key, null);
  });

  await record('07 — formations génériques DPS/FOBA/JSP restent persistées explicitement', async () => {
    const { repo } = await buildRepo();
    for(const domain of ['DPS', 'FOBA', 'JSP']){
      const events = (await repo.listEvenements({})).filter((event) => String(event.domaine_code) === domain);
      ok(events.some((event) => event.exercice_id && describeEventSeries(event).seriesType === SERIES_TYPE.MULTI_SESSION), domain);
    }
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-GENERIC-PR-HISTORICAL-SERIES-REPAIR-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-GENERIC-PR-HISTORICAL-SERIES-REPAIR-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
