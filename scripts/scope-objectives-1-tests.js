#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const { analyticStatus, officialFromQuantitatif, STATUTS, KINDS } = require('../netlify/functions/_scope-analytics');
const { hasPermission } = require('../netlify/functions/_rbac');
const logic = require('../assets/js/scope-ui-logic.js');

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

async function createClosedNominatif(repo, service, { date, domaine, niveau, libelle, prefix, statuses }){
  const cible = await repo.findCible(domaine, niveau);
  const people = await seedPeople(repo, cible.cible_id, statuses.length, prefix);
  const { evenement } = await service.createEvenement({
    date, domaineCode: domaine, libelle, cibleIds: [cible.cible_id]
  }, { sub: 'test' });
  const closed = await closeWithStatuses(service, evenement.evenement_id, people, statuses);
  return { evenement: closed.evenement || evenement, people, cible };
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

const QTY = { attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 1 };

async function createClosedQty(service, repo, { date, domaine, niveau, libelle }){
  const cible = await repo.findCible(domaine, niveau);
  const created = await service.createEvenement({
    date, domaineCode: domaine, libelle, cibleIds: [cible.cible_id], modeSuivi: 'QUANTITATIF'
  }, { sub: 'test' });
  await service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
    baseVersion: created.version, ...QTY
  }, { sub: 'test' });
  const closed = await service.cloturer(created.evenement.evenement_id, {
    baseVersion: created.version + 1
  }, { sub: 'test' });
  return { evenement: closed.evenement || created.evenement, cible };
}

function ctx(){
  const repo = createMemoryRepo();
  return {
    repo,
    service: createScopeService(repo),
    analytics: createScopeAnalyticsService(repo),
    objectifs: createScopeObjectivesService(repo)
  };
}

const PRESENT_13_15 = [
  ...Array(13).fill('PRESENT'),
  { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' },
  'ABSENT_NON_EXCUSE'
];

(async () => {
  await record('1 — création objectif GLOBAL', async () => {
    const { objectifs } = ctx();
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01', commentaire: 'TEST GLOBAL 80'
    }, { sub: 'test' });
    assert.strictEqual(created.objectif.scope, 'GLOBAL');
    assert.strictEqual(created.objectif.thresholdPct, 80);
    assert.strictEqual(created.objectif.dateDebut, '2026-01-01');
    assert.strictEqual(created.objectif.dateFin, null);
    assert.strictEqual(created.objectif.statut, 'OUVERT');
  });

  await record('2 — création objectif DOMAINE', async () => {
    const { objectifs } = ctx();
    const created = await objectifs.createObjectif({
      portee: 'DOMAINE', domaineCode: 'DAP', seuilPct: 82, dateDebut: '2026-01-01', commentaire: 'TEST DAP 82'
    }, { sub: 'test' });
    assert.strictEqual(created.objectif.scope, 'DOMAINE');
    assert.strictEqual(created.objectif.domaineCode, 'DAP');
    assert.strictEqual(created.objectif.thresholdPct, 82);
  });

  await record('3 — création objectif CIBLE', async () => {
    const { repo, objectifs } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    const created = await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 85, dateDebut: '2026-01-01', commentaire: 'TEST DAP/Y4 85'
    }, { sub: 'test' });
    assert.strictEqual(created.objectif.scope, 'CIBLE');
    assert.strictEqual(created.objectif.cibleId, y4.cible_id);
    assert.strictEqual(created.objectif.domaineCode, 'DAP');
    assert.strictEqual(created.objectif.thresholdPct, 85);
  });

  await record('4-7 — hiérarchie cible > domaine > global et fallbacks', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'DAP', seuilPct: 82, dateDebut: '2026-01-01' }, { sub: 't' });
    const cibleObj = await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 85, dateDebut: '2026-01-01'
    }, { sub: 't' });
    await createClosedNominatif(repo, service, {
      date: '2026-05-12', domaine: 'DAP', niveau: 'Y4', libelle: 'TEST hierarchie', prefix: 'H1',
      statuses: PRESENT_13_15
    });
    const q = { from: '2026-01-01', to: '2026-12-31' };
    const sdis = await analytics.summary(q);
    assert.strictEqual(sdis.officiel.objective.thresholdPct, 80);
    assert.strictEqual(sdis.officiel.objective.scope, 'GLOBAL');
    const domaine = await analytics.summary({ ...q, domaine: 'DAP' });
    assert.strictEqual(domaine.officiel.objective.thresholdPct, 82);
    assert.strictEqual(domaine.officiel.objective.scope, 'DOMAINE');
    const cible = await analytics.summary({ ...q, cible: 'DAP/Y4' });
    assert.strictEqual(cible.officiel.objective.thresholdPct, 85);
    assert.strictEqual(cible.officiel.objective.scope, 'CIBLE');

    await objectifs.desactiverObjectif(cibleObj.objectif.objectifId, { motif: 'fallback' }, { sub: 't' });
    const afterCible = await analytics.summary({ ...q, cible: 'DAP/Y4' });
    assert.strictEqual(afterCible.officiel.objective.thresholdPct, 82);
    assert.strictEqual(afterCible.officiel.objective.scope, 'DOMAINE');

    const listed = await objectifs.listObjectifs();
    const dap = listed.objectifs.find((row) => row.scope === 'DOMAINE' && row.domaineCode === 'DAP' && row.actif);
    await objectifs.desactiverObjectif(dap.objectifId, { motif: 'fallback' }, { sub: 't' });
    const afterDomaine = await analytics.summary({ ...q, cible: 'DAP/Y4' });
    assert.strictEqual(afterDomaine.officiel.objective.thresholdPct, 80);
    const sdisAfter = await analytics.summary(q);
    assert.strictEqual(sdisAfter.officiel.objective.thresholdPct, 80);

    const global = listed.objectifs.find((row) => row.scope === 'GLOBAL' && row.actif);
    await objectifs.desactiverObjectif(global.objectifId, { motif: 'none' }, { sub: 't' });
    const none = await analytics.summary(q);
    assert.strictEqual(none.officiel.objective, null);
    assert.strictEqual(none.officiel.gapPct, null);
    assert.strictEqual(none.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
  });

  await record('8 — seuil < 0 refusé', async () => {
    const { objectifs } = ctx();
    await expectHttp(() => objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: -1, dateDebut: '2026-01-01'
    }, { sub: 't' }), 422, 'seuil_negatif');
  });

  await record('9 — seuil > 100 refusé', async () => {
    const { objectifs } = ctx();
    await expectHttp(() => objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 101, dateDebut: '2026-01-01'
    }, { sub: 't' }), 422, 'seuil_excessif');
  });

  await record('10 — date fin < début refusée', async () => {
    const { objectifs } = ctx();
    await expectHttp(() => objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-06-01', dateFin: '2026-01-01'
    }, { sub: 't' }), 422, 'dates_incoherentes');
  });

  await record('11 — chevauchement même portée refusé', async () => {
    const { repo, objectifs } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31'
    }, { sub: 't' });
    await expectHttp(() => objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 85, dateDebut: '2026-06-01', dateFin: '2026-09-30'
    }, { sub: 't' }), 422, 'chevauchement_objectif');
  });

  await record('12 — périodes adjacentes autorisées', async () => {
    const { repo, objectifs } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-06-30'
    }, { sub: 't' });
    const next = await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 85, dateDebut: '2026-07-01', dateFin: '2026-12-31'
    }, { sub: 't' });
    assert.strictEqual(next.objectif.thresholdPct, 85);
  });

  await record('13-15 — historique mai 80 / septembre 85 / annuel non homogène', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-06-30'
    }, { sub: 't' });
    await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 85, dateDebut: '2026-07-01', dateFin: '2026-12-31'
    }, { sub: 't' });
    await createClosedQty(service, repo, {
      date: '2026-05-10', domaine: 'DAP', niveau: 'Y4', libelle: 'Mai'
    });
    await createClosedQty(service, repo, {
      date: '2026-09-10', domaine: 'DAP', niveau: 'Y4', libelle: 'Sept'
    });
    const grain = { from: '2026-01-01', to: '2026-12-31', cible: 'DAP/Y4' };
    const mai = await analytics.summary({ from: '2026-05-01', to: '2026-05-31', cible: 'DAP/Y4' });
    assert.strictEqual(mai.officiel.objective.thresholdPct, 80);
    const sept = await analytics.summary({ from: '2026-09-01', to: '2026-09-30', cible: 'DAP/Y4' });
    assert.strictEqual(sept.officiel.objective.thresholdPct, 85);
    const annuel = await analytics.summary(grain);
    assert.strictEqual(annuel.officiel.objective, null);
    assert.strictEqual(annuel.officiel.gapPct, null);
    assert.strictEqual(annuel.officiel.objectiveContext.homogeneous, false);
    assert.strictEqual(annuel.officiel.objectiveContext.distinctObjectives.length, 2);
    assert.strictEqual(annuel.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
    assert.strictEqual(annuel.officiel.percentage, 89.5);
    const afterSecond = await analytics.summary({ from: '2026-05-01', to: '2026-05-31', cible: 'DAP/Y4' });
    assert.strictEqual(afterSecond.officiel.objective.thresholdPct, 80);
  });

  await record('16 — gap positif', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    const g1 = await repo.findCible('DPS', 'G1');
    const { evenement, version } = await service.createEvenement({
      date: '2026-09-01', domaineCode: 'DPS', libelle: 'QTT gap+', cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 't' });
    await service.enregistrerSaisieQuantitative(evenement.evenement_id, {
      baseVersion: version, attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 1
    }, { sub: 't' });
    await service.cloturer(evenement.evenement_id, { baseVersion: version + 1 }, { sub: 't' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.percentage, 89.5);
    assert.strictEqual(summary.officiel.gapPct, 9.5);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.ATTEINT);
  });

  await record('17 — gap négatif', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 90, dateDebut: '2026-01-01' }, { sub: 't' });
    await createClosedNominatif(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'Gap-', prefix: 'GN',
      statuses: PRESENT_13_15
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.percentage, 86.7);
    assert.strictEqual(summary.officiel.gapPct, -3.3);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.ATTENTION);
  });

  await record('18 — denominator 0 → NON_EVALUABLE', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    await createClosedNominatif(repo, service, {
      date: '2026-04-01', domaine: 'DPS', niveau: 'G1', libelle: 'Zero', prefix: 'Z0',
      statuses: [{ statut: 'DISPENSE', motif_absence: 'AUTRE' }]
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.denominator, 0);
    assert.strictEqual(summary.officiel.percentage, null);
    assert.strictEqual(summary.officiel.gapPct, null);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
  });

  await record('19 — pas d’objectif → NON_EVALUABLE', async () => {
    const { repo, service, analytics } = ctx();
    await createClosedNominatif(repo, service, {
      date: '2026-04-02', domaine: 'DPS', niveau: 'G1', libelle: 'NoObj', prefix: 'NO',
      statuses: ['PRESENT']
    });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.percentage, 100);
    assert.strictEqual(summary.officiel.objective, null);
    assert.strictEqual(summary.officiel.analyticStatus, STATUTS.NON_EVALUABLE);
  });

  await record('20-22 — ATTEINT / ATTENTION / VIGILANCE non inventée', async () => {
    assert.strictEqual(analyticStatus(85, { thresholdPct: 85 }, { vigilanceMarginPct: null }).status, STATUTS.ATTEINT);
    assert.strictEqual(analyticStatus(84.9, { thresholdPct: 85 }, { vigilanceMarginPct: null }).status, STATUTS.ATTENTION);
    const vig = analyticStatus(84, { thresholdPct: 85 }, { vigilanceMarginPct: null });
    assert.notStrictEqual(vig.status, STATUTS.VIGILANCE);
    assert.strictEqual(vig.status, STATUTS.ATTENTION);
    const src = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-analytics.js'), 'utf8');
    assert.ok(!src.includes('vigilanceMarginPct: 5'));
    assert.ok(src.includes('vigilanceMarginPct'));
  });

  await record('23 — legacy sans objectif officiel', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    await withBascule(repo);
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.ok(summary.legacy.eventCount >= 8);
    assert.strictEqual(summary.officiel.eventCount, 0);
    assert.strictEqual(summary.legacy.objective, null);
    const series = await analytics.timeseries({ from: '2026-01-01', to: '2026-12-31' });
    assert.ok(series.legacy.every((bucket) => bucket.objective === null && bucket.thresholdPct === null));
  });

  await record('24-25 — explain expose objectif et cohérent avec summary', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    await createClosedNominatif(repo, service, {
      date: '2026-06-01', domaine: 'DPS', niveau: 'G1', libelle: 'Explain', prefix: 'EX',
      statuses: PRESENT_13_15
    });
    const q = { from: '2026-01-01', to: '2026-12-31' };
    const summary = await analytics.summary(q);
    const explain = await analytics.explain(q);
    assert.strictEqual(explain.objective.objectifId, summary.officiel.objective.objectifId);
    assert.strictEqual(explain.objective.scope, 'GLOBAL');
    assert.strictEqual(explain.objective.thresholdPct, 80);
    assert.strictEqual(explain.gapPct, summary.officiel.gapPct);
    assert.strictEqual(explain.objectiveSelection.hierarchy, 'CIBLE > DOMAINE > GLOBAL');
    assert.strictEqual(explain.objectiveSelection.reason, 'GLOBAL');
    assert.strictEqual(explain.totals.percentage, summary.officiel.percentage);
    const none = await analytics.explain({ from: '2025-01-01', to: '2025-12-31' });
    assert.strictEqual(none.objectiveSelection.reason, 'OBJECTIVE_NOT_FOUND');
  });

  await record('26 — timeseries objectif', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    const y4 = await repo.findCible('DAP', 'Y4');
    await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-06-30'
    }, { sub: 't' });
    await objectifs.createObjectif({
      portee: 'CIBLE', cibleId: y4.cible_id, seuilPct: 85, dateDebut: '2026-07-01'
    }, { sub: 't' });
    await createClosedQty(service, repo, {
      date: '2026-05-11', domaine: 'DAP', niveau: 'Y4', libelle: 'TS mai'
    });
    await createClosedQty(service, repo, {
      date: '2026-09-11', domaine: 'DAP', niveau: 'Y4', libelle: 'TS sept'
    });
    const series = await analytics.timeseries({ from: '2026-01-01', to: '2026-12-31', cible: 'DAP/Y4' });
    const mai = series.officiel.find((b) => b.month === '2026-05');
    const sept = series.officiel.find((b) => b.month === '2026-09');
    assert.strictEqual(mai.thresholdPct, 80);
    assert.strictEqual(sept.thresholdPct, 85);
    assert.strictEqual(mai.percentage, 89.5);
  });

  await record('27-28 — formule taux inchangée / quantitatif 89,5', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    await objectifs.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 't' });
    await createClosedNominatif(repo, service, {
      date: '2026-03-12', domaine: 'DPS', niveau: 'G1', libelle: 'Formule', prefix: 'FO',
      statuses: PRESENT_13_15
    });
    const nominatif = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(nominatif.officiel.numerator, 13);
    assert.strictEqual(nominatif.officiel.denominator, 15);
    assert.strictEqual(nominatif.officiel.percentage, 86.7);
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-09-20', domaineCode: 'DPS', libelle: 'QTT 89.5', cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 't' });
    await service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
      baseVersion: created.version, attendus: 20, presents: 17, excuses: 1, nonExcuses: 1, dispenses: 1
    }, { sub: 't' });
    await service.cloturer(created.evenement.evenement_id, { baseVersion: created.version + 1 }, { sub: 't' });
    const both = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(both.officiel.numerator, 30);
    assert.strictEqual(both.officiel.denominator, 34);
    const qtyOnly = await analytics.summary({ from: '2026-09-01', to: '2026-09-30' });
    assert.strictEqual(qtyOnly.officiel.percentage, 89.5);
    const qty = officialFromQuantitatif({ nb_presents: 17, nb_excuses: 1, nb_non_excuses: 1, nb_dispenses: 1 });
    assert.strictEqual(qty.percentage, 89.5);
  });

  await record('29 — hash / UI sans nouvel onglet principal', async () => {
    assert.strictEqual(logic.parseHash('#/reglages/objectifs').screen, 'objectifs');
    assert.strictEqual(logic.parseHash('#/reglages/objectifs').nav, 'reglages');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('#/reglages/objectifs'));
    assert.ok(ui.includes('Objectifs de participation'));
    assert.ok(ui.includes('scope-sidebar'));
    assert.ok(ui.includes('Vue d’ensemble'));
    assert.ok(ui.includes('Exercices'));
    assert.ok(ui.includes('Personnel'));
    assert.ok(!ui.includes('const navButtons'));
    assert.ok(!ui.includes('data-nav="objectifs"'));
  });

  await record('30 — objectifs TEST neutralisables + RBAC', async () => {
    const { analytics, objectifs } = ctx();
    const created = await objectifs.createObjectif({
      portee: 'GLOBAL', seuilPct: 85, dateDebut: '2026-01-01', commentaire: 'TEST GLOBAL 85'
    }, { sub: 't' });
    await objectifs.desactiverObjectif(created.objectif.objectifId, { motif: 'fin de recette' }, { sub: 't' });
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(summary.officiel.objective, null);
    assert.strictEqual(hasPermission({ roles: ['sdis-user'] }, 'references:manage'), false);
    assert.strictEqual(hasPermission({ roles: ['sdis-admin'] }, 'references:manage'), true);
    assert.strictEqual(hasPermission({ roles: ['sdis-commandement'] }, 'references:manage'), true);
    const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(scopeJs.includes("hasPermission(claims, 'references:manage')"));
    await expectHttp(() => objectifs.patchObjectif(created.objectif.objectifId, { seuilPct: 99 }, { sub: 't' }), 422, 'historique_protege');
  });

  await record('multi-cibles — pas de moyenne de seuils', async () => {
    const { repo, service, analytics, objectifs } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const c1 = await repo.findCible('DPS', 'C1');
    await objectifs.createObjectif({ portee: 'CIBLE', cibleId: g1.cible_id, seuilPct: 90, dateDebut: '2026-01-01' }, { sub: 't' });
    await objectifs.createObjectif({ portee: 'CIBLE', cibleId: c1.cible_id, seuilPct: 70, dateDebut: '2026-01-01' }, { sub: 't' });
    const people = await seedPeople(repo, g1.cible_id, 1, 'MC');
    await repo.insertAffectation({ personne_id: people[0].personne_id, cible_id: c1.cible_id, date_debut: '2026-01-01' });
    const created = await service.createEvenement({
      date: '2026-09-01', domaineCode: 'DPS', libelle: 'Multi', cibleIds: [g1.cible_id, c1.cible_id]
    }, { sub: 't' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, ['PRESENT']);
    const eventSummary = await analytics.summary({
      from: '2026-01-01', to: '2026-12-31', evenementId: created.evenement.evenement_id
    });
    assert.strictEqual(eventSummary.officiel.objective, null);
    assert.notStrictEqual(eventSummary.officiel.objective && eventSummary.officiel.objective.thresholdPct, 80);
    const byG1 = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', cible: 'DPS/G1' });
    assert.strictEqual(byG1.officiel.objective.thresholdPct, 90);
    const byDomaine = await analytics.summary({ from: '2026-01-01', to: '2026-12-31', domaine: 'DPS' });
    assert.strictEqual(byDomaine.officiel.objective, null);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}  ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`${results.filter((r) => r.status === 'PASS').length}/${results.length} PASS`);
  if(failed.length) process.exitCode = 1;
})();
