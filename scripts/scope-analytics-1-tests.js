#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const {
  officialFromQuantitatif,
  analyticStatus,
  resolveObjective,
  STATUTS,
  KINDS
} = require('../netlify/functions/_scope-analytics');
const { parsePeriod } = require('../netlify/functions/_scope-period');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'assets/data/scope/monitoring_exercices_sdis_2026.csv');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function assertFiniteTree(value, trail){
  if(value == null || typeof value === 'boolean' || typeof value === 'string') return;
  if(typeof value === 'number'){
    assert.ok(Number.isFinite(value), `valeur non finie à ${trail}: ${value}`);
    return;
  }
  if(Array.isArray(value)){
    value.forEach((item, i) => assertFiniteTree(item, `${trail}[${i}]`));
    return;
  }
  if(typeof value === 'object'){
    Object.keys(value).forEach((key) => assertFiniteTree(value[key], `${trail}.${key}`));
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

async function withBascule(repo){
  const y4 = await repo.findCible('DAP', 'Y4');
  await repo.upsertRegleBascule({
    portee: 'CIBLE',
    cible_id: y4.cible_id,
    domaine_code: 'DAP',
    date_bascule: '2026-08-19',
    commentaire: 'Pilote nominatif DAP/Y4'
  });
}

async function createClosedNominatif(repo, service, {
  date, domaine, niveau, libelle, prefix, statuses
}){
  const cible = await repo.findCible(domaine, niveau);
  const people = await seedPeople(repo, cible.cible_id, statuses.length, prefix);
  const { evenement } = await service.createEvenement({
    date,
    domaineCode: domaine,
    libelle,
    cibleIds: [cible.cible_id]
  }, { sub: 'test' });
  const closed = await closeWithStatuses(service, evenement.evenement_id, people, statuses);
  return { evenement: closed.evenement || evenement, people, cible };
}

(async () => {
  await record('1 — 13/15 = 86,7 nominatif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 15, 'A1');
    const { evenement } = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Habileté incendie', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const statuses = [
      ...Array(13).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' },
      'ABSENT_NON_EXCUSE'
    ];
    await closeWithStatuses(service, evenement.evenement_id, people, statuses);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 13);
    assert.strictEqual(summary.officiel.denominator, 15);
    assert.strictEqual(summary.officiel.percentage, 86.7);
    assert.strictEqual(summary.officiel.kind, KINDS.OFFICIEL);
    assert.strictEqual(summary.officiel.eventCount, 1);
  });

  await record('2 — 34/39 = 87,2 nominatif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-03-19',
      domaine: 'DPS',
      niveau: 'G1',
      libelle: 'Manœuvre groupée',
      prefix: 'A2',
      statuses: [
        ...Array(34).fill('PRESENT'),
        ...Array(3).fill({ statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }),
        ...Array(2).fill('ABSENT_NON_EXCUSE'),
        'DISPENSE'
      ]
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 34);
    assert.strictEqual(summary.officiel.denominator, 39);
    assert.strictEqual(summary.officiel.percentage, 87.2);
    assert.strictEqual(summary.officiel.volumes.dispenses, 1);
  });

  await record('3 — DISPENSE hors dénominateur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-04-01', domaine: 'DPS', niveau: 'G1', libelle: 'Disp', prefix: 'A3',
      statuses: ['PRESENT', 'PRESENT', 'DISPENSE']
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 2);
    assert.strictEqual(summary.officiel.denominator, 2);
    assert.strictEqual(summary.officiel.volumes.dispenses, 1);
    assert.strictEqual(summary.exclusions.dispenses, 1);
  });

  await record('4 — ABSENT_EXCUSE dans dénominateur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-04-02', domaine: 'DPS', niveau: 'G1', libelle: 'Excuse', prefix: 'A4',
      statuses: ['PRESENT', { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }]
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 1);
    assert.strictEqual(summary.officiel.denominator, 2);
    assert.strictEqual(summary.officiel.volumes.excuses, 1);
  });

  await record('5 — NON_RENSEIGNE non compté comme officiel', async () => {
    const repo = createMemoryRepo();
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 3, 'A5');
    const event = await repo.insertEvenement({
      date: '2026-04-03',
      domaine_code: 'DPS',
      libelle: 'NON_RENSEIGNE live',
      statut: 'REALISE',
      origine: 'NOMINATIF',
      mode_suivi: 'NOMINATIF',
      cible_ids: [g1.cible_id]
    });
    for(const p of people){
      await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
    }
    await repo.upsertParticipation({ evenement_id: event.evenement_id, personne_id: people[0].personne_id, statut: 'PRESENT' });
    await repo.upsertParticipation({ evenement_id: event.evenement_id, personne_id: people[1].personne_id, statut: 'PRESENT' });
    await repo.upsertParticipation({ evenement_id: event.evenement_id, personne_id: people[2].personne_id, statut: 'NON_RENSEIGNE' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 2);
    assert.strictEqual(summary.officiel.denominator, 2);
    assert.strictEqual(summary.officiel.volumes.nonRenseignes, 1);
    assert.notStrictEqual(summary.officiel.numerator + summary.officiel.volumes.nonRenseignes, summary.officiel.denominator + 0);
  });

  await record('6 — ANNULE exclu', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const { evenement } = await service.createEvenement({
      date: '2026-04-04', domaineCode: 'DPS', libelle: 'TEST ANNULE', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.annulerEvenement(evenement.evenement_id, { baseVersion: 1, motif: 'test' }, { sub: 'test' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.strictEqual(summary.officiel.percentage, null);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
    assert.strictEqual(summary.exclusions.annules, 1);
  });

  await record('7 — REPORTE exclu', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const { evenement } = await service.createEvenement({
      date: '2026-04-05', domaineCode: 'DPS', libelle: 'Reporté', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await repo.updateEventIfVersion(evenement.evenement_id, 1, { statut: 'REPORTE' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.strictEqual(summary.exclusions.reportes, 1);
  });

  await record('8 — PLANIFIE exclu', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-04-06', domaineCode: 'DPS', libelle: 'Planifié', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.strictEqual(summary.exclusions.planifies, 1);
  });

  await record('9 — LEGACY exclu du total officiel', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.strictEqual(summary.officiel.numerator, 0);
    assert.strictEqual(summary.officiel.denominator, 0);
    assert.strictEqual(summary.officiel.percentage, null);
    assert.strictEqual(summary.exclusions.legacy, 8);
  });

  await record('10 — LEGACY retourné séparément', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.legacy.kind, KINDS.LEGACY);
    assert.strictEqual(summary.legacy.eventCount, 8);
    assert.strictEqual(summary.legacy.points.length, 8);
    assert.strictEqual(summary.legacy.globalKpi, null);
    assert.ok(summary.legacy.points.every((p) => p.kind === KINDS.LEGACY));
  });

  await record('11 — somme numérateurs / somme dénominateurs', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'A', prefix: 'S1',
      statuses: [...Array(13).fill('PRESENT'), { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }, 'ABSENT_NON_EXCUSE']
    });
    await createClosedNominatif(repo, service, {
      date: '2026-03-19', domaine: 'DAP', niveau: 'Y4', libelle: 'B', prefix: 'S2',
      statuses: [
        ...Array(34).fill('PRESENT'),
        ...Array(3).fill({ statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }),
        ...Array(2).fill('ABSENT_NON_EXCUSE'),
        'DISPENSE'
      ]
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 47);
    assert.strictEqual(summary.officiel.denominator, 54);
    assert.strictEqual(summary.officiel.percentage, 87.0);
  });

  await record('12 — jamais moyenne simple des %', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-01-15', domaine: 'DPS', niveau: 'G1', libelle: 'Jan', prefix: 'M1',
      statuses: [...Array(13).fill('PRESENT'), { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }, 'ABSENT_NON_EXCUSE']
    });
    await createClosedNominatif(repo, service, {
      date: '2026-02-15', domaine: 'DAP', niveau: 'Y4', libelle: 'Fev', prefix: 'M2',
      statuses: ['PRESENT']
    });
    const series = await analytics.timeseries({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(series.officiel.length, 2);
    const jan = series.officiel.find((b) => b.month === '2026-01');
    const fev = series.officiel.find((b) => b.month === '2026-02');
    assert.strictEqual(jan.percentage, 86.7);
    assert.strictEqual(fev.percentage, 100);
    const avgPct = (86.7 + 100) / 2;
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 14);
    assert.strictEqual(summary.officiel.denominator, 16);
    assert.strictEqual(summary.officiel.percentage, 87.5);
    assert.notStrictEqual(summary.officiel.percentage, avgPct);
    const monthAvg = (jan.percentage + fev.percentage) / 2;
    assert.notStrictEqual(summary.officiel.percentage, monthAvg);
  });

  await record('13 — filtre domaine', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-05-01', domaine: 'DPS', niveau: 'G1', libelle: 'DPS', prefix: 'D1',
      statuses: ['PRESENT', 'PRESENT']
    });
    await createClosedNominatif(repo, service, {
      date: '2026-05-02', domaine: 'DAP', niveau: 'Y4', libelle: 'DAP', prefix: 'D2',
      statuses: ['PRESENT']
    });
    const dps = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', domaine: 'DPS' });
    const dap = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', domaine: 'DAP' });
    const global = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(dps.officiel.numerator, 2);
    assert.strictEqual(dps.officiel.denominator, 2);
    assert.strictEqual(dap.officiel.numerator, 1);
    assert.strictEqual(dap.officiel.denominator, 1);
    assert.strictEqual(global.officiel.numerator, 3);
    assert.strictEqual(global.officiel.denominator, 3);
  });

  await record('14 — filtre cible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-05-10', domaine: 'DAP', niveau: 'Y4', libelle: 'Y4', prefix: 'C1',
      statuses: ['PRESENT', 'PRESENT']
    });
    await createClosedNominatif(repo, service, {
      date: '2026-05-11', domaine: 'DPS', niveau: 'G1', libelle: 'G1', prefix: 'C2',
      statuses: ['PRESENT']
    });
    const y4 = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', cible: 'DAP/Y4' });
    const g1 = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', cible: 'DPS/G1' });
    assert.strictEqual(y4.officiel.eventCount, 1);
    assert.strictEqual(y4.officiel.numerator, 2);
    assert.strictEqual(g1.officiel.eventCount, 1);
    assert.strictEqual(g1.officiel.numerator, 1);
  });

  await record('15 — période inclusive', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-03-01', domaine: 'DPS', niveau: 'G1', libelle: 'from', prefix: 'P1',
      statuses: ['PRESENT']
    });
    await createClosedNominatif(repo, service, {
      date: '2026-03-31', domaine: 'DAP', niveau: 'Y4', libelle: 'to', prefix: 'P2',
      statuses: ['PRESENT']
    });
    await createClosedNominatif(repo, service, {
      date: '2026-04-01', domaine: 'FOBA', niveau: '1', libelle: 'hors', prefix: 'P3',
      statuses: ['PRESENT']
    });
    const summary = await analytics.summary({ from: '2026-03-01', to: '2026-03-31' });
    assert.strictEqual(summary.officiel.eventCount, 2);
    assert.strictEqual(summary.officiel.numerator, 2);
  });

  await record('16 — période sans données = NON_EVALUABLE', async () => {
    const repo = createMemoryRepo();
    const analytics = createScopeAnalyticsService(repo);
    const summary = await analytics.summary({ from: '2024-01-01', to: '2024-12-31' });
    assert.strictEqual(summary.officiel.percentage, null);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
    assert.strictEqual(summary.officiel.eventCount, 0);
  });

  await record('17 — personne uniquement nominatif', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const created = await createClosedNominatif(repo, service, {
      date: '2026-06-01', domaine: 'DPS', niveau: 'G1', libelle: 'Pers', prefix: 'N1',
      statuses: ['PRESENT', 'ABSENT_NON_EXCUSE']
    });
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const personSummary = await analytics.summary({
      from: '2026-01-01', to: '2026-12-31', personneId: created.people[0].personne_id
    });
    assert.strictEqual(personSummary.officiel.numerator, 1);
    assert.strictEqual(personSummary.officiel.denominator, 1);
    assert.ok(personSummary.legacy.points.every((p) => p.kind === KINDS.LEGACY));
    const qty = await repo.insertEvenement({
      date: '2026-06-02',
      domaine_code: 'DPS',
      libelle: 'Quant',
      statut: 'REALISE',
      origine: 'NOMINATIF',
      mode_suivi: 'QUANTITATIF',
      cible_ids: [created.cible.cible_id]
    });
    const byPersonQty = await analytics.summary({
      from: '2026-01-01', to: '2026-12-31',
      evenementId: qty.evenement_id,
      personneId: created.people[0].personne_id
    });
    assert.strictEqual(byPersonQty.officiel.eventCount, 0);
    assert.strictEqual(byPersonQty.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
  });

  await record('18 — denominator 0', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-07-01', domaine: 'DPS', niveau: 'G1', libelle: 'Tous dispensés', prefix: 'Z0',
      statuses: ['DISPENSE', 'DISPENSE']
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.numerator, 0);
    assert.strictEqual(summary.officiel.denominator, 0);
    assert.strictEqual(summary.officiel.percentage, null);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
  });

  await record('19 — aucune valeur NaN/Infinity', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    await createClosedNominatif(repo, service, {
      date: '2026-07-02', domaine: 'FOBA', niveau: '1', libelle: 'FOBA1', prefix: 'F1',
      statuses: ['PRESENT', { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }]
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    const explain = await analytics.explain({ from: '2026-01-01', to: '2026-12-31' });
    const series = await analytics.timeseries({ from: '2026-01-01', to: '2026-12-31' });
    assertFiniteTree(summary, 'summary');
    assertFiniteTree(explain, 'explain');
    assertFiniteTree(series, 'timeseries');
  });

  await record('20 — explain = mêmes totaux que summary', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'Eq', prefix: 'E1',
      statuses: [...Array(13).fill('PRESENT'), { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }, 'ABSENT_NON_EXCUSE']
    });
    const q = { from: '2026-01-01', to: '2026-12-31', domaine: 'DPS' };
    const summary = await analytics.summary(q);
    const explain = await analytics.explain(q);
    assert.strictEqual(explain.totals.numerator, summary.officiel.numerator);
    assert.strictEqual(explain.totals.denominator, summary.officiel.denominator);
    assert.strictEqual(explain.totals.percentage, summary.officiel.percentage);
    assert.strictEqual(explain.kind, KINDS.OFFICIEL);
  });

  await record('21 — eventIds explain cohérents', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const a = await createClosedNominatif(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'Inc', prefix: 'I1',
      statuses: ['PRESENT']
    });
    const g1 = await repo.findCible('DPS', 'G1');
    const plan = await service.createEvenement({
      date: '2026-03-13', domaineCode: 'DPS', libelle: 'Plan', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const explain = await analytics.explain({ from: '2026-01-01', to: '2026-12-31' });
    assert.deepStrictEqual(explain.includedEvents.map((e) => e.evenementId), [a.evenement.evenement_id]);
    assert.ok(explain.excludedEvents.some((e) => e.evenementId === plan.evenement.evenement_id && e.reason === 'planifie'));
  });

  await record('22 — legacy DAP/Y2 conservé 16/19', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', domaine: 'DAP', cible: 'DAP/Y2' });
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.strictEqual(summary.legacy.eventCount, 1);
    const point = summary.legacy.points[0];
    assert.strictEqual(point.presents, 16);
    assert.strictEqual(point.totalAttendu, 19);
    assert.strictEqual(point.tauxLegacy, 84.2);
    assert.strictEqual((await repo.getEvent(point.evenementId)).mode_suivi, 'LEGACY');
  });

  await record('23 — aucune recomposition 18/19', async () => {
    const repo = createMemoryRepo();
    await withBascule(repo);
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const listed = await service.listEvenements({ annee: 2026, domaineCode: 'DAP' });
    const y2 = listed.evenements.find((item) => item.evenement.date === '2026-03-17');
    assert.strictEqual(y2.legacy.nb_convoques, 18);
    assert.strictEqual(y2.legacy.nb_presents, 16);
    assert.strictEqual(y2.legacy.payload_v67.total_attendu, 19);
    const explain = await analytics.explain({ from: '2026-01-01', to: '2026-12-31' });
    const point = explain.legacy.points.find((p) => p.date === '2026-03-17');
    assert.strictEqual(point.presents, 16);
    assert.strictEqual(point.totalAttendu, 19);
    assert.notStrictEqual(point.totalAttendu, 18);
    assert.notStrictEqual(point.tauxLegacy, Math.round((100 * 16) / 18 * 10) / 10);
  });

  await record('24 — objectif null acceptable', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-08-01', domaine: 'DPS', niveau: 'G1', libelle: 'Obj', prefix: 'O1',
      statuses: ['PRESENT']
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.objective, null);
    assert.strictEqual(summary.officiel.gapPct, null);
    assert.strictEqual(resolveObjective({ date: '2026-08-01', domaine: 'DPS' }), null);
    assert.ok(!JSON.stringify(summary).includes('85'));
  });

  await record('25 — VIGILANCE non inventée sans config', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    await createClosedNominatif(repo, service, {
      date: '2026-08-02', domaine: 'DPS', niveau: 'G1', libelle: 'Vig', prefix: 'V1',
      statuses: [...Array(13).fill('PRESENT'), { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' }, 'ABSENT_NON_EXCUSE']
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
    assert.notStrictEqual(summary.officiel.analyticStatus, STATUTS.VIGILANCE);
    const withObj = analyticStatus(86.7, { thresholdPct: 90 }, { vigilanceMarginPct: null });
    assert.strictEqual(withObj.status, STATUTS.ATTENTION);
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-analytics.js'), 'utf8');
    assert.ok(!src.includes('-5'));
    assert.ok(!src.includes('vigilanceMarginPct: 5'));
    const qty = officialFromQuantitatif({ nb_presents: 34, nb_excuses: 3, nb_non_excuses: 2, nb_dispenses: 1 });
    assert.strictEqual(qty.numerator, 34);
    assert.strictEqual(qty.denominator, 39);
    assert.strictEqual(qty.percentage, 87.2);
  });

  await record('26 — PeriodContext défaut année civile + validation', async () => {
    const period = parsePeriod({});
    assert.strictEqual(period.preset, 'YEAR');
    assert.strictEqual(period.from, `${new Date().getUTCFullYear()}-01-01`);
    assert.strictEqual(period.to, `${new Date().getUTCFullYear()}-12-31`);
    assert.throws(() => parsePeriod({ from: '2026-12-31', to: '2026-01-01' }), HttpError);
    const custom = parsePeriod({ from: '2026-03-01', to: '2026-03-31' });
    assert.strictEqual(custom.preset, 'CUSTOM');
  });

  await record('27 — grain evenementId + API routes présentes', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const created = await createClosedNominatif(repo, service, {
      date: '2026-08-03', domaine: 'DPS', niveau: 'G1', libelle: 'Grain', prefix: 'G0',
      statuses: ['PRESENT', 'ABSENT_NON_EXCUSE']
    });
    const one = await analytics.summary({
      from: '2026-01-01', to: '2026-12-31', evenementId: created.evenement.evenement_id
    });
    assert.strictEqual(one.officiel.eventCount, 1);
    assert.strictEqual(one.officiel.numerator, 1);
    assert.strictEqual(one.officiel.denominator, 2);
    const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(scopeJs.includes('/analytics/summary'));
    assert.ok(scopeJs.includes('/analytics/explain'));
    assert.ok(scopeJs.includes('/analytics/timeseries'));
    const client = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
    assert.ok(client.includes('analyticsSummary'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}  ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\nSCOPE-ANALYTICS-1 tests: ${results.length - failed.length}/${results.length} PASS`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
