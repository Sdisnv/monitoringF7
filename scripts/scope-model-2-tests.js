#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeAlertsService } = require('../netlify/functions/_scope-alerts-service');
const { HttpError, computeTaux, validateParticipationPatch } = require('../netlify/functions/_scope-rules');
const { officialFromQuantitatif, parseQuantitatifInput, KINDS } = require('../netlify/functions/_scope-analytics');
const {
  canPhysicallyDeletePersonne,
  resolveSuiviNominatif,
  domaineAffiche
} = require('../netlify/functions/_scope-model');
const { previewScopeImport } = require('../netlify/functions/_scope-import-contract');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function expectHttp(fn, status, code){
  try {
    await fn();
    throw new Error(`attendu HTTP ${status}${code ? `/${code}` : ''}`);
  } catch (error) {
    assert.ok(error instanceof HttpError, `HttpError attendu, reçu ${error && error.stack || error}`);
    assert.strictEqual(error.status, status, `status ${error.status} ≠ ${status} (${error.error})`);
    if(code) assert.strictEqual(error.error, code, `code ${error.error} ≠ ${code}`);
    return error;
  }
}

async function seedPeople(repo, cibleId, count, prefix){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeWithStatuses(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

async function createNominatif(service, repo, { date, domaine, niveau, libelle, modeSuivi }){
  const cible = await repo.findCible(domaine, niveau);
  const created = await service.createEvenement({
    date,
    domaineCode: domaine,
    libelle,
    cibleIds: [cible.cible_id],
    modeSuivi: modeSuivi || 'NOMINATIF'
  }, { sub: 'test' });
  return { evenement: created.evenement, cible, version: created.version };
}

(async () => {
  await record('1 — EXCUSE privé nominatif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-03-01', domaine: 'DPS', niveau: 'G1', libelle: 'TEST MODEL-2 privé'
    });
    const people = await seedPeople(repo, cible.cible_id, 2, 'P1');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      'PRESENT',
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' }
    ]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.volumes.excuses, 1);
    assert.strictEqual(summary.officiel.volumes.excusesPrive, 1);
    assert.strictEqual(summary.officiel.numerator, 1);
    assert.strictEqual(summary.officiel.denominator, 2);
  });

  await record('2 — EXCUSE professionnel', async () => {
    validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL' });
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-03-02', domaine: 'DPS', niveau: 'G1', libelle: 'TEST MODEL-2 pro'
    });
    const people = await seedPeople(repo, cible.cible_id, 1, 'P2');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL' }
    ]);
    const taux = computeTaux(await repo.listParticipations(evenement.evenement_id), await repo.listAttendus(evenement.evenement_id));
    assert.strictEqual(taux.excusesProfessionnel, 1);
    assert.strictEqual(taux.excuses, 1);
  });

  await record('3 — EXCUSE armée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-03-03', domaine: 'DPS', niveau: 'G1', libelle: 'TEST MODEL-2 armee'
    });
    const people = await seedPeople(repo, cible.cible_id, 1, 'P3');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      { statut: 'ABSENT_EXCUSE', motif_absence: 'ARMEE' }
    ]);
    const taux = computeTaux(await repo.listParticipations(evenement.evenement_id), await repo.listAttendus(evenement.evenement_id));
    assert.strictEqual(taux.excusesArmee, 1);
  });

  await record('4 — EXCUSE accident/maladie', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-03-04', domaine: 'DPS', niveau: 'G1', libelle: 'TEST MODEL-2 AM'
    });
    const people = await seedPeople(repo, cible.cible_id, 1, 'P4');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      { statut: 'ABSENT_EXCUSE', motif_absence: 'ACCIDENT_MALADIE' }
    ]);
    const taux = computeTaux(await repo.listParticipations(evenement.evenement_id), await repo.listAttendus(evenement.evenement_id));
    assert.strictEqual(taux.excusesAccidentMaladie, 1);
  });

  await record('5 — ancien EXCUSE sans motif conservé (NON_PRECISE)', async () => {
    const attendus = [{ personne_id: 'a', inclus: true }];
    const participations = [{ personne_id: 'a', statut: 'ABSENT_EXCUSE', motif_absence: 'NON_PRECISE' }];
    const taux = computeTaux(participations, attendus);
    assert.strictEqual(taux.excuses, 1);
    assert.strictEqual(taux.excusesNonPrecise, 1);
    const maladie = computeTaux(
      [{ personne_id: 'a', statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }],
      attendus
    );
    assert.strictEqual(maladie.excusesAccidentMaladie, 1);
  });

  await record('6 — nouveau EXCUSE sans motif refusé', async () => {
    await expectHttp(
      async () => validateParticipationPatch({ statut: 'ABSENT_EXCUSE' }),
      422,
      'motif_obligatoire'
    );
    await expectHttp(
      async () => validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: 'NON_PRECISE' }),
      422,
      'motif_obligatoire'
    );
  });

  await record('7 — PERMUTATION DAP compte comme présence', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-04-01', domaine: 'DAP', niveau: 'Y4', libelle: 'TEST MODEL-2 permutation'
    });
    const people = await seedPeople(repo, cible.cible_id, 3, 'D7');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      'PRESENT',
      'PERMUTATION',
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' }
    ]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.volumes.presents, 2);
    assert.strictEqual(summary.officiel.volumes.permutations, 1);
    assert.strictEqual(summary.officiel.numerator, 2);
    assert.strictEqual(summary.officiel.denominator, 3);
  });

  await record('8 — permutation non double-comptée', async () => {
    const parsed = parseQuantitatifInput({
      attendus: 20, presents: 16, excusesPrive: 1, excusesProfessionnel: 1,
      excusesArmee: 0, excusesAccidentMaladie: 1, nonExcuses: 1, dispenses: 0, permutations: 2
    });
    const official = officialFromQuantitatif(parsed.row);
    assert.ok(official);
    assert.strictEqual(official.volumes.presents, 16);
    assert.strictEqual(official.volumes.permutations, 2);
    assert.strictEqual(official.numerator, 16);
    assert.strictEqual(official.denominator, 20);
    assert.notStrictEqual(official.volumes.presents, 18);
  });

  await record('9 — permutation hors DAP refusée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-04-02', domaine: 'FOBA', niveau: '1', libelle: 'TEST MODEL-2 hors DAP'
    });
    const people = await seedPeople(repo, cible.cible_id, 1, 'F9');
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await expectHttp(
      () => service.enregistrerParticipations(evenement.evenement_id, {
        baseVersion: 2,
        participations: [{ personneId: people[0].personne_id, statut: 'PERMUTATION' }]
      }, { sub: 'test' }),
      422,
      'permutation_hors_dap'
    );
  });

  await record('10 — quantitatif avec 4 motifs', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('DAP', 'Y2');
    const created = await service.createEvenement({
      date: '2026-05-01', domaineCode: 'DAP', libelle: 'TEST QTT 4 motifs',
      cibleIds: [cible.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    const saved = await service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
      baseVersion: 1,
      attendus: 20, presents: 16,
      excusesPrive: 1, excusesProfessionnel: 1, excusesArmee: 0, excusesAccidentMaladie: 1,
      nonExcuses: 1, dispenses: 0, permutations: 2
    }, { sub: 'test' });
    assert.strictEqual(saved.saisie.nb_excuses, 3);
    assert.strictEqual(saved.saisie.nb_permutations, 2);
  });

  await record('11 — somme motifs = excusés', async () => {
    const parsed = parseQuantitatifInput({
      attendus: 10, presents: 6, excusesPrive: 1, excusesProfessionnel: 1,
      excusesArmee: 0, excusesAccidentMaladie: 1, nonExcuses: 1, dispenses: 0
    });
    assert.strictEqual(parsed.row.nb_excuses, 3);
    const official = officialFromQuantitatif(parsed.row);
    assert.strictEqual(official.volumes.excuses, 3);
    assert.strictEqual(
      official.volumes.excusesPrive + official.volumes.excusesProfessionnel
        + official.volumes.excusesArmee + official.volumes.excusesAccidentMaladie
        + official.volumes.excusesNonPrecise,
      official.volumes.excuses
    );
  });

  await record('12 — quantitatif incohérent refusé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-05-02', domaineCode: 'DPS', libelle: 'TEST QTT incohérent',
      cibleIds: [cible.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    await expectHttp(
      () => service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
        baseVersion: 1, attendus: 10, presents: 8, excuses: 1, nonExcuses: 0, dispenses: 0
      }, { sub: 'test' }),
      422,
      'volumes_incoherents'
    );
    await expectHttp(
      () => service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
        baseVersion: 1, attendus: 10, presents: 6,
        excusesPrive: 1, excusesProfessionnel: 0, excusesArmee: 0, excusesAccidentMaladie: 0,
        excuses: 3, nonExcuses: 1, dispenses: 0
      }, { sub: 'test' }),
      422,
      'motifs_incoherents'
    );
  });

  await record('13 — analytics motifs', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-06-01', domaine: 'DPS', niveau: 'G1', libelle: 'TEST analytics motifs'
    });
    const people = await seedPeople(repo, cible.cible_id, 6, 'A13');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      'PRESENT', 'PRESENT',
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PROFESSIONNEL' },
      { statut: 'ABSENT_EXCUSE', motif_absence: 'ARMEE' },
      { statut: 'ABSENT_EXCUSE', motif_absence: 'ACCIDENT_MALADIE' }
    ]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.volumes.excuses, 4);
    assert.strictEqual(summary.officiel.volumes.excusesPrive, 1);
    assert.strictEqual(summary.officiel.volumes.excusesProfessionnel, 1);
    assert.strictEqual(summary.officiel.volumes.excusesArmee, 1);
    assert.strictEqual(summary.officiel.volumes.excusesAccidentMaladie, 1);
    assert.strictEqual(summary.officiel.numerator, 2);
    assert.strictEqual(summary.officiel.denominator, 6);
  });

  await record('14 — explain motifs', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-06-02', domaine: 'DPS', niveau: 'G1', libelle: 'TEST explain motifs'
    });
    const people = await seedPeople(repo, cible.cible_id, 2, 'A14');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      'PRESENT',
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' }
    ]);
    const explained = await analytics.explain({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(explained.totals.excuseMotifs.prive, 1);
    assert.strictEqual(explained.totals.excuseMotifs.total, 1);
    assert.strictEqual(explained.kind, KINDS.OFFICIEL);
  });

  await record('15 — timeseries formule officielle inchangée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'TEST timeseries'
    });
    const people = await seedPeople(repo, cible.cible_id, 15, 'A15');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      ...Array(13).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      'ABSENT_NON_EXCUSE'
    ]);
    const series = await analytics.timeseries({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(series.officiel[0].numerator, 13);
    assert.strictEqual(series.officiel[0].denominator, 15);
    assert.strictEqual(series.officiel[0].percentage, 86.7);
  });

  await record('16 — LEGACY inchangé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const cible = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-01-15', domaineCode: 'DPS', libelle: 'LEGACY MODEL-2',
      cibleIds: [cible.cible_id], origine: 'LEGACY_AGGREGATED'
    }, { sub: 'test' });
    await repo.insertLegacy({
      evenement_id: created.evenement.evenement_id,
      date: '2026-01-15',
      domaine_code: 'DPS',
      nb_presents: 10,
      nb_convoques: 12,
      payload_v67: { total_attendu: 12 }
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.ok(summary.legacy.points.length >= 1);
    assert.strictEqual(summary.officiel.volumes.excusesPrive, 0);
  });

  await record('17 — objectifs inchangés (taux officiel)', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const objectives = createScopeObjectivesService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await objectives.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01'
    }, { sub: 'test' });
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'TEST obj'
    });
    const people = await seedPeople(repo, cible.cible_id, 10, 'O17');
    await closeWithStatuses(service, evenement.evenement_id, people, [
      ...Array(8).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { statut: 'ABSENT_EXCUSE', motif_absence: 'ARMEE' }
    ]);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.percentage, 80);
    assert.strictEqual(summary.officiel.analyticStatus, 'ATTEINT');
  });

  await record('18 — alertes : permutation ≠ absence', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const alerts = createScopeAlertsService(repo);
    const { evenement, cible } = await createNominatif(service, repo, {
      date: '2026-08-01', domaine: 'DAP', niveau: 'Y4', libelle: 'TEST alert permutation'
    });
    const people = await seedPeople(repo, cible.cible_id, 2, 'AL18');
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: people[0].personne_id, statut: 'PRESENT' },
        { personneId: people[1].personne_id, statut: 'PERMUTATION' }
      ]
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const codes = (listed.alerts || []).filter((a) => a.eventId === evenement.evenement_id).map((a) => a.code);
    assert.ok(!codes.includes('SAISIE_NON_RENSEIGNE'));
    assert.ok(codes.includes('CLOTURE_POSSIBLE'));
  });

  await record('19 — suivi nominatif possible hors DAP', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { evenement } = await createNominatif(service, repo, {
      date: '2026-09-01', domaine: 'FOBA', niveau: '1', libelle: 'TEST nominatif FOBA'
    });
    assert.strictEqual(evenement.mode_suivi, 'NOMINATIF');
    const refs = await service.referentiels();
    assert.ok(refs.arbre.some((d) => d.code === 'FOSPEC' && d.sousDomaines.some((s) => s.code === 'PR')));
    assert.strictEqual(domaineAffiche('PR'), 'PAPR');
  });

  await record('20 — mode existant non changé silencieusement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('FOCA', 'GEN');
    const created = await service.createEvenement({
      date: '2026-09-02', domaineCode: 'FOCA', libelle: 'TEST mode figé',
      cibleIds: [cible.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    const rules = await repo.listSuiviNominatif();
    const resolution = resolveSuiviNominatif(rules, {
      date: '2026-09-02', domaineCode: 'FOCA', cibleId: cible.cible_id
    });
    assert.strictEqual(resolution.possible, true);
    const after = await repo.getEvent(created.evenement.evenement_id);
    assert.strictEqual(after.mode_suivi, 'QUANTITATIF');
  });

  await record('21 — contrat import domaine/sous-domaine/cible', async () => {
    const repo = createMemoryRepo();
    const cibles = await repo.listCibles();
    const csv = [
      'date;domaine;sous_domaine;cibles;libelle;mode_suivi;comptabilise;remarque;identifiant_externe',
      '2026-10-01;FOSPEC;PR;G1;TEST import PAPR;NOMINATIF;oui;;ext-1'
    ].join('\n');
    const preview = previewScopeImport(csv, { cibles });
    assert.strictEqual(preview.lignes[0].statut, 'VALIDE');
    assert.strictEqual(preview.lignes[0].domaineStockage, 'PR');
    assert.strictEqual(preview.lignes[0].sousDomaine, 'PR');
    assert.strictEqual(preview.lignes[0].actionPrevue, 'CREER');
  });

  await record('22 — référentiel inconnu refusé', async () => {
    const repo = createMemoryRepo();
    const cibles = await repo.listCibles();
    const csv = [
      'date;domaine;sous_domaine;cibles;libelle;mode_suivi',
      '2026-10-01;XYZ;;G1;Inconnu;AUTO'
    ].join('\n');
    const preview = previewScopeImport(csv, { cibles });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR');
    assert.ok(preview.lignes[0].erreurs.some((e) => e.error === 'referentiel_inconnu'));
  });

  await record('23 — idempotence concept import', async () => {
    const repo = createMemoryRepo();
    const cibles = await repo.listCibles();
    const csv = [
      'date;domaine;cibles;libelle;mode_suivi;identifiant_externe',
      '2026-10-02;DPS;G1;TEST idem;AUTO;ext-dup',
      '2026-10-02;DPS;G1;TEST idem;AUTO;ext-dup'
    ].join('\n');
    const preview = previewScopeImport(csv, {
      cibles,
      evenementsExistants: [{ identifiant_externe: 'ext-dup', date: '2026-10-02', domaine_code: 'DPS', libelle: 'TEST idem' }]
    });
    assert.ok(preview.lignes.some((l) => l.statut === 'DEJA_PRESENT' || l.actionPrevue === 'IGNORER_IDEMPOTENT'));
    assert.ok(preview.lignes.some((l) => l.erreurs && l.erreurs.some((e) => e.error === 'doublon_fichier')));
    assert.strictEqual(preview.previewSeule, true);
  });

  await record('24 — 16 DAP/Y4 préservés + suppression physique interdite avec historique', async () => {
    const repo = createMemoryRepo();
    const y4 = await repo.findCible('DAP', 'Y4');
    const people = await seedPeople(repo, y4.cible_id, 16, 'Y4P');
    assert.strictEqual(people.length, 16);
    assert.strictEqual((await repo.listPersonnes()).length, 16);
    const service = createScopeService(repo);
    const { evenement } = await createNominatif(service, repo, {
      date: '2026-04-10', domaine: 'DAP', niveau: 'Y4', libelle: 'TEST 16 Y4'
    });
    await service.figerPopulation(evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    const attendus = await repo.listAttendus(evenement.evenement_id);
    assert.strictEqual(attendus.length, 16);
    assert.strictEqual(canPhysicallyDeletePersonne({ attendusCount: 16, participationsCount: 0 }), false);
    assert.strictEqual(canPhysicallyDeletePersonne({ attendusCount: 0, participationsCount: 0, journalCount: 0 }), true);
  });

  await record('25 — aucun Monitoring F7 modifié', async () => {
    const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260820_scope_model_2.sql'), 'utf8');
    const schema = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-schema.js'), 'utf8');
    const model = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-model.js'), 'utf8');
    for(const text of [sql, schema, model]){
      assert.ok(!/delete from monitoring_f7_/i.test(text));
      assert.ok(!/update monitoring_f7_records/i.test(text));
      assert.ok(!/update monitoring_f7_imported/i.test(text));
    }
    assert.ok(logic.parseHash('#/reglages/suivi').screen === 'suivi');
    assert.ok(logic.MOTIFS.some((m) => m.value === 'ACCIDENT_MALADIE'));
    assert.ok(!logic.MOTIFS.some((m) => m.value === 'MALADIE'));
  });

  const failed = results.filter((r) => r.status !== 'NOK' && r.status !== 'PASS');
  const nok = results.filter((r) => r.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - nok.length}/${results.length} PASS`);
  process.exit(nok.length || failed.length ? 1 : 0);
})();
