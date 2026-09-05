#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeObjectivesService } = require('../netlify/lib/_scope-objectives-service');
const { createScopeDashboardService } = require('../netlify/lib/_scope-dashboard-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { classifyOperationalAlert } = require('../netlify/lib/_scope-alerts');
const { classifyInboxItem: inboxClassify } = require('../netlify/lib/_scope-inbox');
const { todayZurichIso, isEchu, TIMEZONE } = require('../netlify/lib/_scope-calendar');
const { STATUTS, MODES } = require('../netlify/lib/_scope-analytics');

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

function ctx(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const objectives = createScopeObjectivesService(repo);
  const dashboard = createScopeDashboardService(repo);
  const alerts = createScopeAlertsService(repo);
  return { repo, service, objectives, dashboard, alerts };
}

function p0(payload){
  return (payload.alerts || []).filter((a) => a.level === 'P0');
}
function codes(payload, level){
  return (payload.alerts || []).filter((a) => !level || a.level === level).map((a) => a.code);
}

(async () => {
  await record('1 — aucun événement → 0 alerte', async () => {
    const { alerts } = ctx();
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.strictEqual(listed.counts.total, 0);
    assert.strictEqual(listed.counts.p0, 0);
    assert.strictEqual(listed.alerts.length, 0);
  });

  await record('2 — LEGACY → 0 P0', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'LEGACY échu',
      cibleIds: [g1.cible_id], origine: 'LEGACY_AGGREGATED'
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.strictEqual(listed.counts.p0, 0);
  });

  await record('3 — ANNULE → 0 P0', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'Annulé', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.annulerEvenement(created.evenement.evenement_id, { baseVersion: 1, motif: 'Test' }, { sub: 't' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(!p0(listed).some((a) => a.eventId === created.evenement.evenement_id));
  });

  await record('4 — REPORTE → 0 P0 (documenté)', async () => {
    const { repo, alerts } = ctx();
    const item = classifyOperationalAlert({
      evenement: {
        evenement_id: 'r1', date: '2026-08-01', domaine_code: 'DPS',
        libelle: 'Reporté', statut: 'REPORTE', mode_suivi: 'NOMINATIF'
      }
    }, { today: '2026-08-19' });
    assert.strictEqual(item, null);
    const g1 = await repo.findCible('DPS', 'G1');
    await repo.insertEvenement({
      date: '2026-08-01', domaine_code: 'DPS', libelle: 'REPORTE',
      statut: 'REPORTE', origine: 'NOMINATIF', mode_suivi: 'NOMINATIF',
      cible_ids: [g1.cible_id]
    });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.strictEqual(listed.counts.p0, 0);
  });

  await record('5 — futur PLANIFIE → pas ECHU', async () => {
    const item = classifyOperationalAlert({
      evenement: {
        evenement_id: 'f1', date: '2026-09-01', domaine_code: 'DPS',
        libelle: 'Futur', statut: 'PLANIFIE', mode_suivi: 'NOMINATIF', population_figee: false
      }
    }, { today: '2026-08-19' });
    assert.strictEqual(item, null);
  });

  await record('6 — passé PLANIFIE → ECHU / NON_FIGE', async () => {
    const item = classifyOperationalAlert({
      evenement: {
        evenement_id: 'p1', date: '2026-08-01', domaine_code: 'DPS',
        libelle: 'Échu', statut: 'PLANIFIE', mode_suivi: 'NOMINATIF', population_figee: false
      }
    }, { today: '2026-08-19' });
    assert.ok(item);
    assert.strictEqual(item.level, 'P0');
    assert.ok(['ECHU_PLANIFIE', 'NOMINATIF_NON_FIGE'].includes(item.code));
  });

  await record('7 — nominatif non figé échu = P0, futur ≠ P0 (pas de J-7)', async () => {
    const echu = classifyOperationalAlert({
      evenement: {
        evenement_id: 'n1', date: '2026-08-18', domaine_code: 'DPS',
        libelle: 'Non figé', statut: 'PLANIFIE', mode_suivi: 'NOMINATIF', population_figee: false
      }
    }, { today: '2026-08-19' });
    assert.strictEqual(echu.code, 'NOMINATIF_NON_FIGE');
    const j6 = classifyOperationalAlert({
      evenement: {
        evenement_id: 'n2', date: '2026-08-25', domaine_code: 'DPS',
        libelle: 'J-6', statut: 'PLANIFIE', mode_suivi: 'NOMINATIF', population_figee: false
      }
    }, { today: '2026-08-19' });
    assert.strictEqual(j6, null);
  });

  await record('8 — nominatif NON_RENSEIGNE échu', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    await seedPeople(repo, g1.cible_id, 3, 'NR');
    const created = await service.createEvenement({
      date: '2026-08-10', domaineCode: 'DPS', libelle: 'Saisie ouverte', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const alert = listed.alerts.find((a) => a.eventId === created.evenement.evenement_id);
    assert.strictEqual(alert.code, 'SAISIE_NON_RENSEIGNE');
    assert.strictEqual(alert.level, 'P0');
    assert.ok(alert.reason.includes('non renseigné'));
  });

  await record('9 — nominatif complet → CLOTURE_POSSIBLE', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 2, 'CL');
    const created = await service.createEvenement({
      date: '2026-08-10', domaineCode: 'DPS', libelle: 'Complet', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: 2,
      participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const alert = listed.alerts.find((a) => a.eventId === created.evenement.evenement_id);
    assert.strictEqual(alert.code, 'CLOTURE_POSSIBLE');
    assert.ok(!listed.alerts.some((a) => a.eventId === created.evenement.evenement_id && a.code === 'ECHU_PLANIFIE'));
  });

  await record('10 — quantitatif sans saisie échu', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'QTT vide',
      cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const alert = listed.alerts.find((a) => a.eventId === created.evenement.evenement_id);
    assert.strictEqual(alert.code, 'QUANTITATIF_INCOMPLET');
  });

  await record('11 — quantitatif incohérent', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'QTT incohérent',
      cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    await repo.upsertQuantitatifSaisie({
      evenement_id: created.evenement.evenement_id,
      nb_attendus: 10, nb_presents: 3, nb_excuses: 0, nb_non_excuses: 0, nb_dispenses: 0
    });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const alert = listed.alerts.find((a) => a.eventId === created.evenement.evenement_id);
    assert.strictEqual(alert.code, 'QUANTITATIF_INCOMPLET');
    assert.ok(alert.reason.includes('incohérents'));
  });

  await record('12 — quantitatif complet → CLOTURE_POSSIBLE', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'QTT complet',
      cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    await service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
      baseVersion: 1, attendus: 10, presents: 8, excuses: 1, nonExcuses: 1, dispenses: 0
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const alert = listed.alerts.find((a) => a.eventId === created.evenement.evenement_id);
    assert.strictEqual(alert.code, 'CLOTURE_POSSIBLE');
  });

  await record('13 — REALISE → disparition P0', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'QTT à clôturer',
      cibleIds: [g1.cible_id], modeSuivi: 'QUANTITATIF'
    }, { sub: 'test' });
    await service.enregistrerSaisieQuantitative(created.evenement.evenement_id, {
      baseVersion: 1, attendus: 10, presents: 8, excuses: 1, nonExcuses: 1, dispenses: 0
    }, { sub: 'test' });
    await service.cloturer(created.evenement.evenement_id, { baseVersion: 2 }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(!p0(listed).some((a) => a.eventId === created.evenement.evenement_id));
  });

  await record('14 — cible sous objectif', async () => {
    const { repo, service, objectives, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'CSO');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Sous objectif cible', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'ABSENT_NON_EXCUSE', 'ABSENT_NON_EXCUSE'
    ]);
    await objectives.createObjectif({
      portee: 'CIBLE', cibleId: g1.cible_id, seuilPct: 90, dateDebut: '2026-01-01'
    }, { sub: 't' });
    const listed = await alerts.listAlerts({
      year: 2026, preset: 'YEAR', today: '2026-08-19', domaine: 'DPS', cible: 'G1'
    });
    assert.ok(codes(listed, 'P1').includes('CIBLE_SOUS_OBJECTIF'));
  });

  await record('15 — domaine sous objectif', async () => {
    const { repo, service, objectives, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'DSO');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Sous objectif domaine', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'ABSENT_NON_EXCUSE', 'ABSENT_NON_EXCUSE'
    ]);
    await objectives.createObjectif({
      portee: 'DOMAINE', domaineCode: 'DPS', seuilPct: 90, dateDebut: '2026-01-01'
    }, { sub: 't' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(codes(listed, 'P1').includes('DOMAINE_SOUS_OBJECTIF'));
  });

  await record('16 — aucun objectif → pas d’alerte sous objectif', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'NOB');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Sans objectif', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'ABSENT_NON_EXCUSE', 'ABSENT_NON_EXCUSE'
    ]);
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(!codes(listed, 'P1').includes('CIBLE_SOUS_OBJECTIF'));
    assert.ok(!codes(listed, 'P1').includes('DOMAINE_SOUS_OBJECTIF'));
  });

  await record('17 — NON_EVALUABLE → pas fausse alerte objectif', async () => {
    const { objectives, alerts } = ctx();
    await objectives.createObjectif({
      portee: 'GLOBAL', seuilPct: 90, dateDebut: '2026-01-01'
    }, { sub: 't' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(!codes(listed, 'P1').includes('CIBLE_SOUS_OBJECTIF'));
    assert.ok(!codes(listed, 'P1').includes('DOMAINE_SOUS_OBJECTIF'));
    assert.ok(!codes(listed).includes('OBJECTIF_ABSENT'));
  });

  await record('18 — LEGACY sous ancien taux → pas P1 officiel', async () => {
    const { repo, service, objectives, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-02-01', domaineCode: 'DPS', libelle: 'Historique LEGACY',
      cibleIds: [g1.cible_id], origine: 'LEGACY_AGGREGATED'
    }, { sub: 'test' });
    await repo.insertLegacy({
      date: '2026-02-01', domaine_code: 'DPS', libelle: 'Historique LEGACY',
      nb_convoques: 20, nb_presents: 4, nb_excuses: 0, nb_absents: 16
    });
    await objectives.createObjectif({
      portee: 'DOMAINE', domaineCode: 'DPS', seuilPct: 90, dateDebut: '2026-01-01'
    }, { sub: 't' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19', domaine: 'DPS' });
    assert.ok(!codes(listed, 'P1').includes('DOMAINE_SOUS_OBJECTIF'));
    assert.ok(!codes(listed, 'P1').includes('CIBLE_SOUS_OBJECTIF'));
  });

  await record('19 — déduplication événement', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 2, 'DD');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'Dédup', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, { sub: 'test' });
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: 2,
      participations: people.map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' }))
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    const forEvent = listed.alerts.filter((a) => a.eventId === created.evenement.evenement_id && a.level === 'P0');
    assert.strictEqual(forEvent.length, 1);
    assert.strictEqual(forEvent[0].code, 'CLOTURE_POSSIBLE');
  });

  await record('20 — PeriodContext', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DPS', libelle: 'Mars', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'Août', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const month = await alerts.listAlerts({ year: 2026, preset: 'MONTH', month: '3', today: '2026-08-19' });
    assert.ok(month.alerts.some((a) => a.title === 'Mars'));
    assert.ok(month.alerts.some((a) => a.title === 'Août'), 'échu hors mois mais même année civile reste visible');
    const year = await alerts.listAlerts({ year: 2025, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(!year.alerts.some((a) => a.title === 'Mars' || a.title === 'Août'));
  });

  await record('21 — filtre domaine', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const y4 = await repo.findCible('DAP', 'Y4');
    await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'DPS échu', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DAP', libelle: 'DAP échu', cibleIds: [y4.cible_id]
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19', domaine: 'DAP' });
    assert.ok(listed.alerts.some((a) => a.title === 'DAP échu'));
    assert.ok(!listed.alerts.some((a) => a.title === 'DPS échu'));
  });

  await record('22 — filtre cible', async () => {
    const { repo, service, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const c1 = await repo.findCible('DPS', 'C1');
    await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'G1 échu', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'C1 échu', cibleIds: [c1.cible_id]
    }, { sub: 'test' });
    const listed = await alerts.listAlerts({
      year: 2026, preset: 'YEAR', today: '2026-08-19', domaine: 'DPS', cible: 'G1'
    });
    assert.ok(listed.alerts.some((a) => a.title === 'G1 échu'));
    assert.ok(!listed.alerts.some((a) => a.title === 'C1 échu'));
  });

  await record('23 — timezone / date Zurich', async () => {
    assert.strictEqual(TIMEZONE, 'Europe/Zurich');
    const now = new Date('2026-08-20T22:30:00.000Z');
    assert.strictEqual(now.toISOString().slice(0, 10), '2026-08-20');
    assert.strictEqual(todayZurichIso(now), '2026-08-21');
    assert.strictEqual(isEchu('2026-08-20', '2026-08-21'), true);
    assert.strictEqual(isEchu('2026-08-21', '2026-08-21'), false);
    const item = classifyOperationalAlert({
      evenement: {
        evenement_id: 'tz1', date: '2026-08-20', domaine_code: 'DPS',
        libelle: 'Minuit Zurich', statut: 'PLANIFIE', mode_suivi: 'NOMINATIF', population_figee: false
      }
    }, { now });
    assert.strictEqual(item.code, 'NOMINATIF_NON_FIGE');
  });

  await record('24 — dashboard consomme ALERTS-1', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const created = await service.createEvenement({
      date: '2026-08-01', domaineCode: 'DPS', libelle: 'Dash alerts', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.ok(dash.alerts);
    assert.ok(dash.alerts.alerts);
    const inboxItem = dash.inbox.find((row) => row.evenementId === created.evenement.evenement_id);
    const alert = dash.alerts.alerts.find((a) => a.eventId === created.evenement.evenement_id && a.level === 'P0');
    assert.ok(inboxItem && alert);
    assert.strictEqual(inboxItem.reasonCode, alert.code);
    assert.strictEqual(dash.alerts.timezone, 'Europe/Zurich');
  });

  await record('25 — absence de logique P0 parallèle dans le frontend', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const logic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    assert.ok(!ui.includes('classifyInboxItem'));
    assert.ok(!ui.includes('classifyOperationalAlert'));
    assert.ok(!ui.includes('ECHU_PLANIFIE'));
    assert.ok(!ui.includes('NOMINATIF_NON_FIGE'));
    assert.ok(!logic.includes('ECHU_PLANIFIE'));
    assert.ok(ui.includes('À traiter'));
    assert.ok(inboxClassify);
  });

  await record('P1-03 désactivé / pas d’alerte personne', async () => {
    const { alerts } = ctx();
    const listed = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' });
    assert.strictEqual(listed.config.repeatedUnexcusedAbsences.enabled, false);
    assert.strictEqual(listed.config.personUnderObjective.enabled, false);
    assert.ok(!(listed.alerts || []).some((a) => a.personId));
  });

  await record('acquittement P1 masque, P0 reste', async () => {
    const { repo, service, objectives, alerts } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'ACK');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Ack P1', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'ABSENT_NON_EXCUSE', 'ABSENT_NON_EXCUSE'
    ]);
    await objectives.createObjectif({
      portee: 'DOMAINE', domaineCode: 'DPS', seuilPct: 90, dateDebut: '2026-01-01'
    }, { sub: 't' });
    const before = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' }, { sub: 'user-1' });
    const p1 = before.alerts.find((a) => a.code === 'DOMAINE_SOUS_OBJECTIF');
    assert.ok(p1);
    await alerts.acquitter({ fingerprint: p1.fingerprint }, { sub: 'user-1' });
    const after = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19' }, { sub: 'user-1' });
    assert.ok(!after.alerts.some((a) => a.code === 'DOMAINE_SOUS_OBJECTIF'));
    const withAck = await alerts.listAlerts({
      year: 2026, preset: 'YEAR', today: '2026-08-19', includeAcknowledged: '1'
    }, { sub: 'user-1' });
    assert.ok(withAck.alerts.some((a) => a.code === 'DOMAINE_SOUS_OBJECTIF' && a.acknowledged));
  });

  await record('inbox DASH-1 = mapping P0 ALERTS-1', async () => {
    const event = {
      evenement_id: 'map1', date: '2026-08-01', domaine_code: 'DPS',
      libelle: 'Map', statut: 'PLANIFIE', mode_suivi: 'NOMINATIF', population_figee: false
    };
    const alert = classifyOperationalAlert({ evenement: event }, { today: '2026-08-19' });
    const inbox = inboxClassify({ evenement: event }, { today: '2026-08-19' });
    assert.strictEqual(inbox.reasonCode, alert.code);
    assert.strictEqual(inbox.cta.label, alert.actionLabel);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})();
