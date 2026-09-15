#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-ENCADREMENT-ACTIVITY-KPI-SEMANTICS-2 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { SERIES_TYPE, describeEventSeries } = require('../netlify/lib/_scope-event-series');
const display = require('../assets/js/scope-personnel-display.js');

const TOKEN = 'scope-personnel-encadrement-activity-kpi-semantics-2';
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
    if(expected.kpi && Object.prototype.hasOwnProperty.call(expected.kpi, key)){
      eq(fiche.kpi[key], expected.kpi[key], `kpi ${personId}.${key}`);
    }
  }
  return { fiche, row };
}

function historyRoles(fiche, role){
  return (fiche.evenements || []).filter((row) => String(row.roleParticipation || '').toUpperCase() === role);
}

function toutRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'tout'));
}

function realizedRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'presents'));
}

function graphPoints(dataset){
  return ((((dataset || {}).series || [])[0] || {}).points) || [];
}

function byId(points){
  return Object.fromEntries((points || []).map((point) => [point.id, point]));
}

(async () => {
  await record('CAS 1 — FOBA INDIVIDUAL / Formateur : 3 traces, +3 activité, aucune consolidation', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('FOBA', '1');
    const trainer = await person(repo, 'sem2-foba-f', '36001', cible.cible_id);
    const labels = ['FOBA 1', 'FOBA 2', 'FOBA 3'];
    for(let i = 0; i < labels.length; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-foba-${i + 1}`,
        date: `2026-03-0${i + 1}`,
        domaine: 'FOBA',
        libelle: labels[i],
        cibleId: cible.cible_id
      });
      eq(describeEventSeries(event).seriesType, SERIES_TYPE.INDIVIDUAL, labels[i]);
      await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 3, denominator: 3, percentage: 100, eventCount: 3 }
    });
    eq(historyRoles(fiche, 'FORMATEUR').length, 3);
    eq(toutRows(fiche.evenements).length, 3);
    eq(realizedRows(fiche.evenements).length, 3);
    eq(Number((fiche.kpi.volumes || {}).presents || 0), 0);
    eq(Number((fiche.kpi.volumes || {}).encadrementRealise || 0), 3);
    const points = byId(graphPoints(fiche.graphs.repartition));
    eq(points.encadrement.value, 3);
    ok(!points.presents || Number(points.presents.value || 0) === 0);
  });

  await record('CAS 2 — JSP INDIVIDUAL / Moniteur : +2 activité perso, population jeunes inchangée', async () => {
    const repo = createMemoryRepo();
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const jeune = await person(repo, 'sem2-jsp-j', '36011', jsp.cible_id, { grade: 'Cadet' });
    const moniteur = await person(repo, 'sem2-jsp-m', '36012', jsp.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    for(const spec of [
      { id: 'sem2-jsp-2', libelle: 'JSP 2', date: '2026-04-02' },
      { id: 'sem2-jsp-4', libelle: 'JSP 4', date: '2026-04-22' }
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
    const analytics = createScopeAnalyticsService(repo);
    const jeuneFiche = await assertFicheDirectorySync(persons, jeune.personne_id, {
      kpi: { numerator: 2, denominator: 2, percentage: 100, eventCount: 2 }
    });
    const monitorFiche = await assertFicheDirectorySync(persons, moniteur.personne_id, {
      kpi: { numerator: 2, denominator: 2, percentage: 100, eventCount: 2 }
    });
    eq(historyRoles(monitorFiche.fiche, 'MONITEUR').length, 2);
    eq(Number((monitorFiche.fiche.kpi.volumes || {}).presents || 0), 0);
    eq(Number((jeuneFiche.fiche.kpi.volumes || {}).presents || 0), 2);
    const population = await analytics.evaluate(Object.assign({ domaineCode: 'JSP' }, PERIOD));
    eq(population.officiel.numerator, 2);
    eq(population.officiel.volumes.presents, 2);
    eq(population.officiel.eventCount, 2);
  });

  await record('CAS 3 — DPS INDIVIDUAL / Formateur : +1 activité personnelle', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const trainer = await person(repo, 'sem2-dps-f', '36021', cible.cible_id);
    const event = await eventRow(repo, {
      id: 'sem2-dps-1',
      date: '2026-05-01',
      domaine: 'DPS',
      libelle: 'DPS 1',
      cibleId: cible.cible_id
    });
    eq(describeEventSeries(event).seriesType, SERIES_TYPE.INDIVIDUAL);
    await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
      role: 'FORMATEUR',
      source: 'ENCADREMENT'
    });
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(historyRoles(fiche, 'FORMATEUR').length, 1);
    eq(Number((fiche.kpi.volumes || {}).encadrementRealise || 0), 1);
  });

  await record('CAS 4 — PR 1.1 à 1.6 / Formateur : historique 6, contribution 1', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'sem2-pr1-f', '36031', cible.cible_id);
    const keys = new Set();
    for(let i = 1; i <= 6; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-pr1-${i}`,
        date: `2026-04-0${i}`,
        domaine: 'PR',
        libelle: `PR 1.${i}`,
        cibleId: cible.cible_id
      });
      keys.add(describeEventSeries(event).seriesKey);
      await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    eq(keys.size, 1);
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(historyRoles(fiche, 'FORMATEUR').length, 6);
    ok(fiche.evenements.length > fiche.kpi.eventCount);
  });

  await record('CAS 5 — PR-ABC multi-session : historique 3, contribution 1', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'sem2-prabc-f', '36032', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:ABC-SEM2';
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-prabc-${i}`,
        date: `2026-05-0${i}`,
        domaine: 'PR',
        libelle: `Exercice PR-ABC | séance ${i}`,
        cibleId: cible.cible_id,
        groupKey,
        sessionKey: `${groupKey}.${i}`
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(historyRoles(fiche, 'FORMATEUR').length, 3);
    eq(Number((fiche.kpi.volumes || {}).presents || 0), 1);
  });

  await record('CAS 6 — AUTO CAR 1.x / Formateur : 1 contribution', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('AUTO', 'VL') || await repo.findCible('AUTO', 'VL_DPS');
    const trainer = await person(repo, 'sem2-car-f', '36041', cible.cible_id);
    const keys = new Set();
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-car-1-${i}`,
        date: `2026-06-0${i}`,
        domaine: 'AUTO',
        libelle: `CAR 1.${i}`,
        cibleId: cible.cible_id
      });
      keys.add(describeEventSeries(event).seriesKey);
      await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    eq(keys.size, 1);
    const persons = createScopePersonService(repo);
    await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
  });

  await record('CAS 7 — AUTO TRUCK 1.x distinct de CAR', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('AUTO', 'PL') || await repo.findCible('AUTO', 'VL');
    const trainer = await person(repo, 'sem2-truck-f', '36042', cible.cible_id);
    const carKey = describeEventSeries({ domaine_code: 'AUTO', libelle: 'CAR 1.1' }).seriesKey;
    const keys = new Set();
    for(let i = 1; i <= 3; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-truck-1-${i}`,
        date: `2026-07-0${i}`,
        domaine: 'AUTO',
        libelle: `TRUCK 1.${i}`,
        cibleId: cible.cible_id
      });
      const series = describeEventSeries(event);
      eq(series.family, 'TRUCK');
      ok(series.seriesKey !== carKey);
      keys.add(series.seriesKey);
      await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    eq(keys.size, 1);
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(historyRoles(fiche, 'FORMATEUR').length, 3);
  });

  await record('CAS 8 — SURVEILLANT + participant même obligation : jamais 2 contributions', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const mixed = await person(repo, 'sem2-surv-p', '36051', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:SEM2-SURV';
    const s1 = await eventRow(repo, {
      id: 'sem2-surv-s1',
      date: '2026-08-01',
      domaine: 'PR',
      libelle: 'PR 3.1',
      cibleId: cible.cible_id,
      groupKey,
      sessionKey: `${groupKey}.1`
    });
    const s2 = await eventRow(repo, {
      id: 'sem2-surv-s2',
      date: '2026-08-08',
      domaine: 'PR',
      libelle: 'PR 3.2',
      cibleId: cible.cible_id,
      groupKey,
      sessionKey: `${groupKey}.2`
    });
    await expectPerson(repo, s1.evenement_id, mixed.personne_id);
    await expectPerson(repo, s2.evenement_id, mixed.personne_id);
    await participate(repo, s1.evenement_id, mixed.personne_id, 'PRESENT', { role: 'PARTICIPANT' });
    await participate(repo, s2.evenement_id, mixed.personne_id, 'PRESENT', {
      role: 'SURVEILLANT',
      source: 'SAISIE'
    });
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, mixed.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(toutRows(fiche.evenements).length, 2);
  });

  await record('CAS 9 — AUXILIAIRE : historique visible, contribution 0', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const aux = await person(repo, 'sem2-aux', '36061', cible.cible_id);
    const event = await eventRow(repo, {
      id: 'sem2-aux-1',
      date: '2026-07-10',
      domaine: 'PR',
      libelle: 'PR auxiliaire',
      cibleId: cible.cible_id
    });
    await participate(repo, event.evenement_id, aux.personne_id, 'NON_CONCERNE', {
      role: 'AUXILIAIRE',
      source: 'ENCADREMENT'
    });
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, aux.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 }
    });
    eq(historyRoles(fiche, 'AUXILIAIRE').length, 1);
    eq(Number((fiche.kpi.volumes || {}).encadrementRealise || 0), 0);
  });

  await record('CAS 10 — PLANIFIÉ avec rôle anticipé : historique Tout, contribution 0', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('FOBA', '2');
    const trainer = await person(repo, 'sem2-plan', '36071', cible.cible_id);
    const event = await eventRow(repo, {
      id: 'sem2-plan-1',
      date: '2026-11-12',
      domaine: 'FOBA',
      libelle: 'FOBA planifié formateur',
      cibleId: cible.cible_id,
      statut: 'PLANIFIE'
    });
    await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
      role: 'FORMATEUR',
      source: 'ENCADREMENT'
    });
    const persons = createScopePersonService(repo);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    const row = fiche.evenements.find((item) => String(item.evenementId) === String(event.evenement_id));
    eq(display.ficheEventStatutLabel(row), 'Planifié');
    eq(toutRows(fiche.evenements).length, 1);
    eq(realizedRows(fiche.evenements).length, 0);
    eq(fiche.kpi.eventCount, 0);
    eq(fiche.kpi.numerator, 0);
  });

  await record('CAS 11 — ANNULÉ : visible hors activité réalisée, contribution 0', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('FOBA', '3');
    const trainer = await person(repo, 'sem2-annule', '36081', cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-09-03',
      domaineCode: 'FOBA',
      libelle: 'FOBA annulé encadrement',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.ajouterEncadrement(created.evenement.evenement_id, {
      baseVersion: created.version,
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    await service.annulerEvenement(created.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(created.evenement.evenement_id)).version,
      motif: 'Annulation recette'
    }, ACTOR);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(created.evenement.evenement_id));
    ok(row, 'annulé visible');
    eq(display.ficheEventStatutLabel(row), 'Annulé');
    eq(realizedRows(fiche.evenements).length, 0);
    eq(fiche.kpi.eventCount, 0);
  });

  await record('CAS 12 — HIDDEN : absent partout', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const moniteur = await person(repo, 'sem2-hidden', '36082', cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-09-04',
      domaineCode: 'JSP',
      libelle: 'JSP supprimé encadrement',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.ajouterEncadrement(created.evenement.evenement_id, {
      baseVersion: created.version,
      personneId: moniteur.personne_id,
      role: 'MONITEUR'
    }, ACTOR);
    await service.masquerEvenement(created.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(created.evenement.evenement_id)).version,
      motif: 'Suppression recette'
    }, ACTOR);
    const fiche = await persons.fiche(moniteur.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(created.evenement.evenement_id)));
    eq(fiche.kpi.eventCount, 0);
  });

  await record('CAS 13 — directory vs fiche : KPI identiques selon contrat Personnel', async () => {
    const repo = createMemoryRepo();
    const foba = await repo.findCible('FOBA', '1');
    const pr = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'sem2-sync', '36091', foba.cible_id, {
      affectations: [{ cible_id: pr.cible_id, date_debut: '2026-01-01' }]
    });
    const fobaEvent = await eventRow(repo, {
      id: 'sem2-sync-foba',
      date: '2026-03-10',
      domaine: 'FOBA',
      libelle: 'FOBA 4',
      cibleId: foba.cible_id
    });
    await participate(repo, fobaEvent.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
      role: 'FORMATEUR',
      source: 'ENCADREMENT'
    });
    const groupKey = 'NO_CYCLE_TEST:PR:SEM2-SYNC';
    for(let i = 1; i <= 2; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-sync-pr-${i}`,
        date: `2026-04-1${i}`,
        domaine: 'PR',
        libelle: `PR 4.${i}`,
        cibleId: pr.cible_id,
        groupKey,
        sessionKey: `${groupKey}.${i}`
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT');
    }
    const persons = createScopePersonService(repo);
    await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 2, denominator: 2, percentage: 100, eventCount: 2 }
    });
  });

  await record('CAS 14 — statistiques JSP globales : moniteurs n’augmentent jamais présents/attendus jeunes', async () => {
    const repo = createMemoryRepo();
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const jeune = await person(repo, 'sem2-glob-j', '36101', jsp.cible_id, { grade: 'Cadet' });
    const moniteur = await person(repo, 'sem2-glob-m', '36102', jsp.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    const event = await eventRow(repo, {
      id: 'sem2-glob-jsp',
      date: '2026-04-18',
      domaine: 'JSP',
      libelle: 'JSP 6',
      cibleId: jsp.cible_id
    });
    await expectPerson(repo, event.evenement_id, jeune.personne_id);
    await participate(repo, event.evenement_id, jeune.personne_id, 'PRESENT');
    await participate(repo, event.evenement_id, moniteur.personne_id, 'NON_CONCERNE', {
      role: 'MONITEUR',
      source: 'ENCADREMENT'
    });
    const analytics = createScopeAnalyticsService(repo);
    const population = await analytics.evaluate(Object.assign({ domaineCode: 'JSP' }, PERIOD));
    eq(population.officiel.numerator, 1);
    eq(population.officiel.volumes.presents, 1);
    eq(population.officiel.eventCount, 1);
    const persons = createScopePersonService(repo);
    const monitorFiche = await persons.fiche(moniteur.personne_id, PERIOD);
    eq(monitorFiche.kpi.numerator, 1);
    eq(Number((monitorFiche.kpi.volumes || {}).presents || 0), 0);
  });

  await record('CAS 15 — FOBA entier : FOBA 1 / 2 / 3 restent trois INDIVIDUAL', async () => {
    const a = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 1' });
    const b = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 2' });
    const c = describeEventSeries({ domaine_code: 'FOBA', libelle: 'FOBA 3' });
    eq(a.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(b.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(c.seriesType, SERIES_TYPE.INDIVIDUAL);
    eq(a.seriesKey, '');
    eq(b.seriesKey, '');
    eq(c.seriesKey, '');
  });

  await record('CAS 16 — non-régression PR X.Y : consolidation maintenue', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const p = await person(repo, 'sem2-prxy', '36111', cible.cible_id);
    for(let i = 1; i <= 6; i += 1){
      const event = await eventRow(repo, {
        id: `sem2-prxy-${i}`,
        date: `2026-06-0${i}`,
        domaine: 'PR',
        libelle: `PR 2.${i}`,
        cibleId: cible.cible_id
      });
      await expectPerson(repo, event.evenement_id, p.personne_id);
      await participate(repo, event.evenement_id, p.personne_id, 'PRESENT');
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, p.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(fiche.evenements.length, 6);
    eq(fiche.kpi.eventCount, 1);
  });

  const failed = results.filter((row) => row.status === 'NOK');
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
