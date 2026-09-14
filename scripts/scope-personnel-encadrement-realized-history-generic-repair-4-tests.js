#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-ENCADREMENT-REALIZED-HISTORY-GENERIC-REPAIR-4 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeService } = require('../netlify/lib/_scope-service');
const display = require('../assets/js/scope-personnel-display.js');

const TOKEN = 'scope-personnel-encadrement-realized-history-generic-repair-4';
const PERIOD = { from: '2026-03-01', to: '2026-12-31', preset: 'CUSTOM' };
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

async function standaloneEvent(repo, id, date, domaine, cibleId, extra = {}){
  const event = await repo.insertEvenement(Object.assign({
    evenement_id: id,
    date,
    domaine_code: domaine,
    libelle: extra.libelle || `${domaine} ${id}`,
    code_cours: id,
    statut: extra.statut || 'REALISE',
    mode_suivi: 'NOMINATIF',
    cible_ids: [cibleId]
  }, extra.patch || {}));
  await repo.setEventCibles(event.evenement_id, [cibleId]);
  return event;
}

async function groupedEvent(repo, id, date, domaine, groupKey, sessionIndex, cibleId, extra = {}){
  const event = await repo.insertEvenement(Object.assign({
    evenement_id: id,
    date,
    domaine_code: domaine,
    libelle: extra.libelle || `${domaine} séance ${sessionIndex}`,
    code_cours: id,
    statut: extra.statut || 'REALISE',
    mode_suivi: 'NOMINATIF',
    pr_exercise_group_key: groupKey,
    pr_session_key: `${groupKey}.${sessionIndex}`,
    cible_ids: [cibleId]
  }, extra.patch || {}));
  await repo.setEventCibles(event.evenement_id, [cibleId]);
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

function toutRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'tout'));
}

function realizedRows(events){
  return (events || []).filter((row) => display.ficheEventMatchesPersonnelFilter(row, 'presents'));
}

function historyRoles(fiche, role){
  return (fiche.evenements || []).filter((row) => String(row.roleParticipation || '').toUpperCase() === role);
}

function assertEncadrementRealized(row, info){
  ok(row, `trace ${info}`);
  eq(display.ficheEventIsEncadrement(row), true, info);
  eq(display.ficheEventIsRealized(row), true, info);
  eq(display.ficheEventStatutLabel(row), 'Réalisé', info);
  eq(display.ficheEventInformations(row), info);
  ok(display.ficheEventMatchesPersonnelFilter(row, 'tout'), `${info} Tout`);
  ok(display.ficheEventMatchesPersonnelFilter(row, 'presents'), `${info} Réalisés`);
  ok(display.ficheEventStatutLabel(row) !== 'Non renseigné', `${info} pas Non renseigné`);
}

(async () => {
  await record('CAS 0 — sémantique unique : encadrement réalisé ≠ participation PRESENT', async () => {
    const formateur = {
      statutEvenement: 'REALISE',
      statutParticipation: 'NON_CONCERNE',
      roleParticipation: 'FORMATEUR'
    };
    const moniteur = {
      statutEvenement: 'REALISE',
      statutParticipation: 'NON_RENSEIGNE',
      roleParticipation: 'MONITEUR'
    };
    const participant = {
      statutEvenement: 'REALISE',
      statutParticipation: 'PRESENT',
      roleParticipation: 'PARTICIPANT'
    };
    const leftover = {
      statutEvenement: 'REALISE',
      statutParticipation: 'NON_RENSEIGNE',
      roleParticipation: 'PARTICIPANT'
    };
    eq(display.ficheEventStatutLabel(formateur), 'Réalisé');
    eq(display.ficheEventInformations(formateur), 'Formateur');
    ok(display.ficheEventMatchesPersonnelFilter(formateur, 'presents'));
    eq(display.ficheEventStatutLabel(moniteur), 'Réalisé');
    eq(display.ficheEventInformations(moniteur), 'Moniteur');
    ok(display.ficheEventMatchesPersonnelFilter(moniteur, 'presents'));
    eq(display.ficheEventStatutLabel(participant), 'Présent');
    ok(display.ficheEventMatchesPersonnelFilter(participant, 'presents'));
    eq(display.ficheEventStatutLabel(leftover), 'Non renseigné');
    ok(!display.ficheEventMatchesPersonnelFilter(leftover, 'presents'));
  });

  await record('CAS 1 — FOBA RÉALISÉ + FORMATEUR hors population : historique réalisé, KPI 0', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('FOBA', '1');
    const trainers = [
      await person(repo, 'foba-form-a', '27001', cible.cible_id),
      await person(repo, 'foba-form-b', '27002', cible.cible_id)
    ];
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    for(const trainer of trainers){
      const event = await standaloneEvent(repo, `foba-form-${trainer.nip}`, '2026-04-08', 'FOBA', cible.cible_id, {
        libelle: `Exercice FOBA ${trainer.nip}`
      });
      await participate(repo, event.evenement_id, trainer.personne_id, 'NON_CONCERNE', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
      const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
        kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 }
      });
      const row = historyRoles(fiche, 'FORMATEUR')[0];
      assertEncadrementRealized(row, 'Formateur');
      eq(toutRows(fiche.evenements).length, 1);
      eq(realizedRows(fiche.evenements).length, 1);
      eq(row.statutParticipation, 'NON_CONCERNE');
      const evaluated = await analytics.evaluate(Object.assign({ personneId: trainer.personne_id }, PERIOD));
      eq(evaluated.officiel.eventCount, 0);
    }
  });

  await record('CAS 2 — JSP RÉALISÉ + MONITEUR : historique réalisé, hors stats jeunes', async () => {
    const repo = createMemoryRepo();
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const jeunes = [
      await person(repo, 'jsp-jeune-a', '27011', jsp.cible_id, { grade: 'Cadet' }),
      await person(repo, 'jsp-jeune-b', '27012', jsp.cible_id, { grade: 'Cadet' })
    ];
    const monitors = [
      await person(repo, 'jsp-mon-a', '27013', jsp.cible_id, {
        affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
      }),
      await person(repo, 'jsp-mon-b', '27014', jsp.cible_id, {
        affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
      })
    ];
    const persons = createScopePersonService(repo);
    for(let i = 0; i < monitors.length; i += 1){
      const jeune = jeunes[i];
      const moniteur = monitors[i];
      const event = await standaloneEvent(repo, `jsp-ex-${i + 1}`, `2026-04-2${i + 2}`, 'JSP', jsp.cible_id, {
        libelle: `Exercice JSP ${i + 1}`
      });
      await expectPerson(repo, event.evenement_id, jeune.personne_id);
      await participate(repo, event.evenement_id, jeune.personne_id, 'PRESENT');
      await participate(repo, event.evenement_id, moniteur.personne_id, 'NON_CONCERNE', {
        role: 'MONITEUR',
        source: 'ENCADREMENT'
      });
      const jeuneFiche = await assertFicheDirectorySync(persons, jeune.personne_id, {
        kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
      });
      const monitorFiche = await persons.fiche(moniteur.personne_id, PERIOD);
      eq(monitorFiche.kpi.eventCount, 0);
      eq(monitorFiche.kpi.numerator, 0);
      const row = historyRoles(monitorFiche, 'MONITEUR')[0];
      assertEncadrementRealized(row, 'Moniteur');
      eq(toutRows(monitorFiche.evenements).length, 1);
      eq(realizedRows(monitorFiche.evenements).length, 1);
      eq(jeuneFiche.fiche.jsp.role, 'JEUNE');
      eq(jeuneFiche.fiche.kpi.eventCount, 1);
      ok(!realizedRows(jeuneFiche.fiche.evenements).some((item) => item.roleParticipation === 'MONITEUR'));
    }
  });

  await record('CAS 3 — PR RÉALISÉ + FORMATEUR : traces réelles, déduplication session KPI', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'pr-form-r4', '27021', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:R4-FORM';
    for(let i = 1; i <= 3; i += 1){
      const event = await groupedEvent(repo, `pr-r4-s${i}`, `2026-05-0${i}`, 'PR', groupKey, i, cible.cible_id, {
        libelle: `Exercice PR | séance ${i}`
      });
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', {
        role: 'FORMATEUR',
        source: 'ENCADREMENT'
      });
    }
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    const rows = historyRoles(fiche, 'FORMATEUR');
    eq(rows.length, 3);
    eq(toutRows(fiche.evenements).length, 3);
    eq(realizedRows(fiche.evenements).length, 3);
    ok(rows.every((row) => display.ficheEventStatutLabel(row) === 'Réalisé'));
    ok(rows.every((row) => display.ficheEventInformations(row) === 'Formateur'));
    const evaluated = await analytics.evaluate(Object.assign({ personneId: trainer.personne_id }, PERIOD));
    eq(evaluated.officiel.eventCount, 1);
    eq(evaluated.includedEvents.length, 1);
  });

  await record('CAS 4 — RÉALISÉ + AUXILIAIRE : historique réalisé, KPI 0', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const aux = await person(repo, 'aux-r4', '27031', cible.cible_id);
    const event = await standaloneEvent(repo, 'pr-aux-r4', '2026-07-10', 'PR', cible.cible_id, {
      libelle: 'Exercice auxiliaire'
    });
    await participate(repo, event.evenement_id, aux.personne_id, 'NON_CONCERNE', {
      role: 'AUXILIAIRE',
      source: 'ENCADREMENT'
    });
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, aux.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 }
    });
    const row = historyRoles(fiche, 'AUXILIAIRE')[0];
    assertEncadrementRealized(row, 'Auxiliaire');
    eq(realizedRows(fiche.evenements).length, 1);
    eq(fiche.kpi.eventCount, 0);
  });

  await record('CAS 5 — RÉALISÉ + SURVEILLANT : historique réalisé, pas de double comptage', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const surv = await person(repo, 'surv-r4', '27032', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:R4-SURV';
    for(let i = 1; i <= 2; i += 1){
      const event = await groupedEvent(repo, `pr-surv-r4-s${i}`, `2026-07-1${i}`, 'PR', groupKey, i, cible.cible_id);
      await expectPerson(repo, event.evenement_id, surv.personne_id);
      await participate(repo, event.evenement_id, surv.personne_id, 'PRESENT', {
        role: 'SURVEILLANT',
        source: 'SAISIE'
      });
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, surv.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    const rows = historyRoles(fiche, 'SURVEILLANT');
    eq(rows.length, 2);
    eq(realizedRows(fiche.evenements).length, 2);
    ok(rows.every((row) => display.ficheEventStatutLabel(row) === 'Réalisé'));
    ok(rows.every((row) => display.ficheEventInformations(row) === 'Surveillant'));
    ok(fiche.evenements.length > fiche.kpi.eventCount);
  });

  await record('CAS 6 — PLANIFIÉ + FORMATEUR/MONITEUR : Tout / Planifié, hors Réalisés, KPI 0', async () => {
    const repo = createMemoryRepo();
    const foba = await repo.findCible('FOBA', '2');
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const trainer = await person(repo, 'plan-foba', '27041', foba.cible_id);
    const moniteur = await person(repo, 'plan-jsp', '27042', jsp.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    const cases = [
      { who: trainer, role: 'FORMATEUR', domaine: 'FOBA', cibleId: foba.cible_id, info: 'Formateur' },
      { who: moniteur, role: 'MONITEUR', domaine: 'JSP', cibleId: jsp.cible_id, info: 'Moniteur' }
    ];
    const persons = createScopePersonService(repo);
    for(const item of cases){
      const event = await standaloneEvent(repo, `plan-${item.who.nip}`, '2026-11-12', item.domaine, item.cibleId, {
        statut: 'PLANIFIE',
        libelle: `Encadrement planifié ${item.role}`
      });
      await participate(repo, event.evenement_id, item.who.personne_id, 'NON_CONCERNE', {
        role: item.role,
        source: 'ENCADREMENT'
      });
      const fiche = await persons.fiche(item.who.personne_id, PERIOD);
      const row = fiche.evenements.find((entry) => String(entry.evenementId) === String(event.evenement_id));
      eq(display.ficheEventStatutLabel(row), 'Planifié', item.role);
      eq(display.ficheEventInformations(row), item.info);
      eq(toutRows(fiche.evenements).length, 1, item.role);
      eq(realizedRows(fiche.evenements).length, 0, item.role);
      eq(fiche.kpi.eventCount, 0, item.role);
    }
  });

  await record('CAS 7 — ANNULÉ + encadrement : Annulé, hors Réalisés, KPI 0', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('FOBA', '3');
    const trainer = await person(repo, 'annule-form', '27051', cible.cible_id);
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
    eq(display.ficheEventInformations(row), 'Événement annulé');
    eq(toutRows(fiche.evenements).length, 1);
    eq(realizedRows(fiche.evenements).length, 0);
    eq(fiche.kpi.eventCount, 0);
  });

  await record('CAS 8 — HIDDEN + encadrement : absent partout', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const moniteur = await person(repo, 'hidden-mon', '27052', cible.cible_id);
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
    eq(toutRows(fiche.evenements).length, 0);
    eq(realizedRows(fiche.evenements).length, 0);
    eq(fiche.kpi.eventCount, 0);
  });

  await record('CAS 9 — plusieurs personnes / domaines, aucun hardcode NIP métier', async () => {
    const repo = createMemoryRepo();
    const foba = await repo.findCible('FOBA', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const dap = await repo.findCible('DAP', 'Y1') || await repo.findCible('DAP', 'GEN');
    const specs = [
      { id: 'multi-foba', nip: '27101', domaine: 'FOBA', cible: foba, role: 'FORMATEUR', info: 'Formateur', statut: 'NON_CONCERNE' },
      { id: 'multi-dps', nip: '27102', domaine: 'DPS', cible: dps, role: 'FORMATEUR', info: 'Formateur', statut: 'NON_CONCERNE' },
      { id: 'multi-dap', nip: '27103', domaine: 'DAP', cible: dap, role: 'SURVEILLANT', info: 'Surveillant', statut: 'NON_CONCERNE' }
    ];
    const persons = createScopePersonService(repo);
    for(const spec of specs){
      const who = await person(repo, spec.id, spec.nip, spec.cible.cible_id);
      const event = await standaloneEvent(repo, `${spec.id}-evt`, '2026-08-18', spec.domaine, spec.cible.cible_id);
      await participate(repo, event.evenement_id, who.personne_id, spec.statut, {
        role: spec.role,
        source: 'ENCADREMENT'
      });
      const fiche = await persons.fiche(who.personne_id, PERIOD);
      const row = fiche.evenements[0];
      assertEncadrementRealized(row, spec.info);
      eq(fiche.kpi.eventCount, 0);
    }
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
