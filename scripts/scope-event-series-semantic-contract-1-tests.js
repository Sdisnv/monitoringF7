#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-SERIES-SEMANTIC-CONTRACT-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeService } = require('../netlify/lib/_scope-service');
const {
  SERIES_TYPE,
  describeEventSeries,
  parseSeriesNotation
} = require('../netlify/lib/_scope-event-series');
const display = require('../assets/js/scope-personnel-display.js');

const TOKEN = 'scope-event-series-semantic-contract-1';
const PERIOD = { from: '2026-01-01', to: '2026-12-31', preset: 'CUSTOM' };
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};

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

async function person(repo, id, nip, cibleId, extra = {}){
  const row = await repo.insertPersonne(Object.assign({
    personne_id: id,
    nip,
    nom: `Nom${nip}`,
    prenom: 'Test',
    grade: extra.grade || 'Sap',
    date_entree: '2026-01-01',
    date_entree_sdis: '2026-01-01'
  }, extra.personne || {}));
  if(cibleId){
    await repo.insertAffectation({ personne_id: row.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  }
  for(const aff of extra.affectations || []){
    await repo.insertAffectation(Object.assign({
      personne_id: row.personne_id,
      date_debut: '2026-01-01'
    }, aff));
  }
  return row;
}

async function eventRow(repo, spec){
  const event = await repo.insertEvenement({
    evenement_id: spec.id,
    date: spec.date,
    domaine_code: spec.domaine,
    libelle: spec.libelle,
    code_cours: spec.id,
    statut: spec.statut || 'REALISE',
    mode_suivi: 'NOMINATIF',
    cible_ids: [spec.cibleId],
    hidden_at: spec.hidden_at || null,
    pr_exercise_group_key: spec.groupKey || null,
    pr_session_key: spec.sessionKey || null
  });
  await repo.setEventCibles(event.evenement_id, [spec.cibleId]);
  return event;
}

async function expectPerson(repo, eventId, personneId){
  await repo.upsertAttendu({ evenement_id: eventId, personne_id: personneId, inclus: true, origine: 'REGLE' });
}

async function participate(repo, eventId, personneId, statut, extra = {}){
  await repo.upsertParticipation(Object.assign({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: extra.role || 'PARTICIPANT',
    source: extra.source || 'SAISIE'
  }, extra.patch || {}));
}

function uniqueSeriesKeys(events){
  return new Set(events.map((row) => describeEventSeries(row).seriesKey).filter(Boolean));
}

function toutRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'tout'));
}

function realizedRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'presents'));
}

(async () => {
  await record('CAS 0 — parser : entier isolé ≠ X.Y', async () => {
    const individual = ['FOBA 1', 'FOBA 2', 'JSP 4', 'DPS 3', 'Formation 1'];
    for(const label of individual){
      const parsed = parseSeriesNotation(label, { domain: label.split(' ')[0] });
      eq(parsed.seriesType, SERIES_TYPE.INDIVIDUAL, label);
      eq(parsed.seriesKey, '', label);
    }
    const fobaMulti = parseSeriesNotation('FOBA 1.1', { domain: 'FOBA' });
    eq(fobaMulti.seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(fobaMulti.exerciseNumber, 1);
    eq(fobaMulti.sessionNumber, 1);
    const fobaOne = parseSeriesNotation('FOBA 1', { domain: 'FOBA' });
    ok(fobaOne.seriesKey !== fobaMulti.seriesKey);
  });

  await record('CAS 1 — FOBA INDIVIDUEL : 3 événements, 3 contributions, 3 traces formateur', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('FOBA', '1');
    const participant = await person(repo, 'foba-p', '28001', cible.cible_id);
    const trainer = await person(repo, 'foba-f', '28002', cible.cible_id);
    const labels = ['FOBA 1', 'FOBA 2', 'FOBA 3'];
    for(let i = 0; i < labels.length; i += 1){
      const event = await eventRow(repo, {
        id: `foba-${i + 1}`,
        date: `2026-03-0${i + 1}`,
        domaine: 'FOBA',
        libelle: labels[i],
        cibleId: cible.cible_id
      });
      eq(describeEventSeries(event).seriesType, SERIES_TYPE.INDIVIDUAL, labels[i]);
      await expectPerson(repo, event.evenement_id, participant.personne_id);
      await participate(repo, event.evenement_id, participant.personne_id, 'PRESENT');
      await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    eq(uniqueSeriesKeys(await repo.listEvenements({})).size, 0);
    const persons = createScopePersonService(repo);
    const participantFiche = await persons.fiche(participant.personne_id, PERIOD);
    eq(participantFiche.evenements.length, 3);
    eq(participantFiche.kpi.eventCount, 3);
    const trainerFiche = await persons.fiche(trainer.personne_id, PERIOD);
    eq(trainerFiche.evenements.length, 3);
    eq(trainerFiche.kpi.eventCount, 0);
    ok(trainerFiche.evenements.every((row) => display.ficheEventStatutLabel(row) === 'Réalisé'));
    ok(trainerFiche.evenements.every((row) => display.ficheEventInformations(row) === 'Formateur'));
  });

  await record('CAS 2 — JSP INDIVIDUEL : 2 événements, moniteur visible, hors stats jeunes', async () => {
    const repo = createMemoryRepo();
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const jeune = await person(repo, 'jsp-j', '28011', jsp.cible_id, { grade: 'Cadet' });
    const moniteur = await person(repo, 'jsp-m', '28012', jsp.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    for(const spec of [
      { id: 'jsp-2', libelle: 'JSP 2', date: '2026-04-02' },
      { id: 'jsp-4', libelle: 'JSP 4', date: '2026-04-22' }
    ]){
      const event = await eventRow(repo, {
        id: spec.id,
        date: spec.date,
        domaine: 'JSP',
        libelle: spec.libelle,
        cibleId: jsp.cible_id
      });
      eq(describeEventSeries(event).seriesType, SERIES_TYPE.INDIVIDUAL, spec.libelle);
      await expectPerson(repo, event.evenement_id, jeune.personne_id);
      await participate(repo, event.evenement_id, jeune.personne_id, 'PRESENT');
      await participate(repo, event.evenement_id, moniteur.personne_id, 'NON_CONCERNE', {
        role: 'MONITEUR',
        source: 'ENCADREMENT'
      });
    }
    const persons = createScopePersonService(repo);
    const jeuneFiche = await persons.fiche(jeune.personne_id, PERIOD);
    eq(jeuneFiche.kpi.eventCount, 2);
    const monitorFiche = await persons.fiche(moniteur.personne_id, PERIOD);
    eq(monitorFiche.evenements.length, 2);
    eq(monitorFiche.kpi.eventCount, 0);
    ok(monitorFiche.evenements.every((row) => display.ficheEventInformations(row) === 'Moniteur'));
    eq(uniqueSeriesKeys(await repo.listEvenements({})).size, 0);
  });

  await record('CAS 3 — DPS INDIVIDUEL : 3 événements indépendants', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const p = await person(repo, 'dps-p', '28021', cible.cible_id);
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `dps-${i}`,
        date: `2026-05-0${i}`,
        domaine: 'DPS',
        libelle: `DPS ${i}`,
        cibleId: cible.cible_id
      });
      eq(describeEventSeries(event).seriesType, SERIES_TYPE.INDIVIDUAL);
      await expectPerson(repo, event.evenement_id, p.personne_id);
      await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    }
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.evenements.length, 3);
    eq(fiche.kpi.eventCount, 3);
  });

  await record('CAS 4 — PR 1.x MULTI_SESSION : 6 traces, 1 contribution', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const p = await person(repo, 'pr1-p', '28031', cible.cible_id);
    const keys = new Set();
    for(let i = 1; i <= 6; i += 1){
      const event = await eventRow(repo, {
        id: `pr-1-${i}`,
        date: `2026-03-${String(i).padStart(2, '0')}`,
        domaine: 'PR',
        libelle: `PR 1.${i}`,
        cibleId: cible.cible_id
      });
      const series = describeEventSeries(event);
      eq(series.seriesType, SERIES_TYPE.MULTI_SESSION);
      eq(series.exerciseNumber, 1);
      eq(series.sessionNumber, i);
      keys.add(series.seriesKey);
      await expectPerson(repo, event.evenement_id, p.personne_id);
      await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    }
    eq(keys.size, 1);
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.evenements.length, 6);
    eq(fiche.kpi.eventCount, 1);
  });

  await record('CAS 5 — PR 2.x distinct de PR 1.x', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const p = await person(repo, 'pr2-p', '28032', cible.cible_id);
    const keys = [];
    for(const spec of [
      { id: 'pr-1-1', libelle: 'PR 1.1', date: '2026-04-01' },
      { id: 'pr-2-1', libelle: 'PR 2.1', date: '2026-04-08' },
      { id: 'pr-2-2', libelle: 'PR 2.2', date: '2026-04-15' },
      { id: 'pr-2-3', libelle: 'PR 2.3', date: '2026-04-22' }
    ]){
      const event = await eventRow(repo, {
        id: spec.id,
        date: spec.date,
        domaine: 'PR',
        libelle: spec.libelle,
        cibleId: cible.cible_id
      });
      keys.push(describeEventSeries(event).seriesKey);
      await expectPerson(repo, event.evenement_id, p.personne_id);
      await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    }
    ok(keys[0] !== keys[1]);
    eq(new Set(keys.slice(1)).size, 1);
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.evenements.length, 4);
    eq(fiche.kpi.eventCount, 2);
  });

  await record('CAS 6 — AUTO CAR 1.x même obligation', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('AUTO', 'VL') || await repo.findCible('AUTO', 'VL_DPS');
    const p = await person(repo, 'car1-p', '28041', cible.cible_id);
    const keys = new Set();
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `car-1-${i}`,
        date: `2026-06-0${i}`,
        domaine: 'AUTO',
        libelle: `CAR 1.${i}`,
        cibleId: cible.cible_id
      });
      const series = describeEventSeries(event);
      eq(series.family, 'CAR');
      keys.add(series.seriesKey);
      await expectPerson(repo, event.evenement_id, p.personne_id);
      await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    }
    eq(keys.size, 1);
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.evenements.length, 3);
    eq(fiche.kpi.eventCount, 1);
  });

  await record('CAS 7 — AUTO CAR 2.x distinct de CAR 1.x', async () => {
    const car1 = describeEventSeries({ domaine_code: 'AUTO', libelle: 'CAR 1.1' });
    const car2 = describeEventSeries({ domaine_code: 'AUTO', libelle: 'CAR 2.1' });
    eq(car1.seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(car2.seriesType, SERIES_TYPE.MULTI_SESSION);
    ok(car1.seriesKey !== car2.seriesKey);
    eq(car2.exerciseNumber, 2);
  });

  await record('CAS 8 — AUTO TRUCK 1.x même obligation', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('AUTO', 'PL') || await repo.findCible('AUTO', 'VL');
    const p = await person(repo, 'truck-p', '28051', cible.cible_id);
    const keys = new Set();
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `truck-1-${i}`,
        date: `2026-07-0${i}`,
        domaine: 'AUTO',
        libelle: `TRUCK 1.${i}`,
        cibleId: cible.cible_id
      });
      const series = describeEventSeries(event);
      eq(series.family, 'TRUCK');
      keys.add(series.seriesKey);
      await expectPerson(repo, event.evenement_id, p.personne_id);
      await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    }
    eq(keys.size, 1);
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(fiche.kpi.eventCount, 1);
    eq(fiche.evenements.length, 3);
  });

  await record('CAS 9 — CAR vs TRUCK ne fusionnent jamais', async () => {
    const car = describeEventSeries({ domaine_code: 'AUTO', libelle: 'CAR 1.1' });
    const truck = describeEventSeries({ domaine_code: 'AUTO', libelle: 'TRUCK 1.1' });
    ok(car.seriesKey && truck.seriesKey);
    ok(car.seriesKey !== truck.seriesKey);
    eq(car.family, 'CAR');
    eq(truck.family, 'TRUCK');
  });

  await record('CAS 10 — PR-ABC 1.x vs 2.x, jamais par simple texte Refresh', async () => {
    const abc1 = ['PR-ABC 1.1', 'PR-ABC 1.2', 'PR-ABC 1.3'].map((libelle) => describeEventSeries({
      domaine_code: 'PR',
      libelle
    }));
    eq(new Set(abc1.map((row) => row.seriesKey)).size, 1);
    eq(abc1[0].family, 'ABC');
    const abc2 = describeEventSeries({ domaine_code: 'PR', libelle: 'PR-ABC 2.1' });
    ok(abc2.seriesKey !== abc1[0].seriesKey);
    const refreshA = describeEventSeries({ domaine_code: 'PR', libelle: 'Exercice PR-ABC | Refresh' });
    const refreshB = describeEventSeries({ domaine_code: 'PR', libelle: 'Exercice PR-ABC | Refresh' });
    eq(refreshA.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(refreshB.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(refreshA.seriesKey, '');
  });

  await record('CAS 11 — FOBA 1 n’est pas FOBA 1.1', async () => {
    const a = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 1' });
    const b = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 2' });
    const c = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 1.1' });
    const d = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 1.2' });
    eq(a.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(b.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(c.seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(d.seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(c.seriesKey, d.seriesKey);
    ok(!a.seriesKey);
  });

  await record('CAS 12 — relation persistée survit au renommage', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('AUTO', 'VL') || await repo.findCible('AUTO', 'PL');
    const created = await service.createEvenement({
      date: '2026-08-03',
      domaineCode: 'AUTO',
      libelle: 'CAR 1.1',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const before = describeEventSeries(created.evenement);
    eq(before.seriesType, SERIES_TYPE.MULTI_SESSION);
    ok(before.persisted || created.evenement.pr_exercise_group_key);
    const key = created.evenement.pr_exercise_group_key;
    ok(key);
    const patched = await service.patchEvenement(created.evenement.evenement_id, {
      baseVersion: created.version,
      libelle: 'Formation VL — intitulé modifié'
    }, ACTOR);
    eq(patched.evenement.pr_exercise_group_key, key);
    const after = describeEventSeries(patched.evenement);
    eq(after.seriesKey, key);
    eq(after.seriesType, SERIES_TYPE.MULTI_SESSION);
    eq(after.source, 'persisted_group_key');
  });

  await record('CAS 13 — Personnel : traces MULTI_SESSION complètes, KPI consolidé', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'pr-hist', '28061', cible.cible_id);
    for(let i = 1; i <= 4; i += 1){
      const event = await eventRow(repo, {
        id: `pr-hist-${i}`,
        date: `2026-09-0${i}`,
        domaine: 'PR',
        libelle: `PR 2.${i}`,
        cibleId: cible.cible_id
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    eq(fiche.evenements.length, 4);
    eq(realizedRows(fiche.evenements).length, 4);
    eq(fiche.kpi.eventCount, 1);
    ok(fiche.evenements.every((row) => display.ficheEventStatutLabel(row) === 'Réalisé'));
  });

  await record('CAS 14 — séance PLANIFIÉE du groupe : Tout seulement, KPI 0', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const p = await person(repo, 'pr-plan', '28071', cible.cible_id);
    const closed = await eventRow(repo, {
      id: 'pr-plan-1',
      date: '2026-10-01',
      domaine: 'PR',
      libelle: 'PR 3.1',
      cibleId: cible.cible_id
    });
    const planned = await eventRow(repo, {
      id: 'pr-plan-2',
      date: '2026-11-01',
      domaine: 'PR',
      libelle: 'PR 3.2',
      cibleId: cible.cible_id,
      statut: 'PLANIFIE'
    });
    await expectPerson(repo, closed.evenement_id, p.personne_id);
    await participate(repo, closed.evenement_id, p.personne_id, 'PRESENT');
    await expectPerson(repo, planned.evenement_id, p.personne_id);
    await participate(repo, planned.evenement_id, p.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    eq(toutRows(fiche.evenements).length, 2);
    eq(realizedRows(fiche.evenements).length, 1);
    const plannedRow = fiche.evenements.find((row) => String(row.evenementId) === String(planned.evenement_id));
    eq(display.ficheEventStatutLabel(plannedRow), 'Planifié');
    eq(display.ficheEventInformations(plannedRow), 'Formateur');
    eq(fiche.kpi.eventCount, 1);
    const evaluated = await analytics.evaluate(Object.assign({ personneId: p.personne_id }, PERIOD));
    eq(evaluated.officiel.eventCount, 1);
  });

  await record('CAS 15 — ANNULÉ visible hors KPI, HIDDEN absent', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('FOBA', '2');
    const p = await person(repo, 'ann-hid', '28081', cible.cible_id);
    const cancelled = await service.createEvenement({
      date: '2026-09-10',
      domaineCode: 'FOBA',
      libelle: 'FOBA 2',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.ajouterEncadrement(cancelled.evenement.evenement_id, {
      baseVersion: cancelled.version,
      personneId: p.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    await service.annulerEvenement(cancelled.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(cancelled.evenement.evenement_id)).version,
      motif: 'Annulation recette'
    }, ACTOR);
    const hidden = await service.createEvenement({
      date: '2026-09-11',
      domaineCode: 'FOBA',
      libelle: 'FOBA 3',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.ajouterEncadrement(hidden.evenement.evenement_id, {
      baseVersion: hidden.version,
      personneId: p.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    await service.masquerEvenement(hidden.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(hidden.evenement.evenement_id)).version,
      motif: 'Suppression recette'
    }, ACTOR);
    const fiche = await persons.fiche(p.personne_id, PERIOD);
    const cancelledRow = fiche.evenements.find((row) => String(row.evenementId) === String(cancelled.evenement.evenement_id));
    ok(cancelledRow);
    eq(display.ficheEventStatutLabel(cancelledRow), 'Annulé');
    eq(display.ficheEventInformations(cancelledRow), 'Événement annulé');
    eq(realizedRows(fiche.evenements).length, 0);
    ok(!fiche.evenements.some((row) => String(row.evenementId) === String(hidden.evenement.evenement_id)));
    eq(fiche.kpi.eventCount, 0);
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}  ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`\n${results.length - failed.length}/${results.length} tests PASS — ${assertions} assertions`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
