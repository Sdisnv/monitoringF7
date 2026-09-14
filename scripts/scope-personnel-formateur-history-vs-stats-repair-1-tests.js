#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-FORMATEUR-HISTORY-VS-STATS-REPAIR-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeService } = require('../netlify/lib/_scope-service');
const display = require('../assets/js/scope-personnel-display.js');

const TOKEN = 'scope-personnel-formateur-history-vs-stats-repair-1';
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

function historyRoles(fiche, role){
  return (fiche.evenements || []).filter((row) => String(row.roleParticipation || '').toUpperCase() === role);
}

(async () => {
  await record('CAS 1 — PR-ABC formateur 3 séances : 3 traces / 1 contribution', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'formateur-abc', '15061', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:ABC-FORM';
    const sessions = [];
    for(let i = 1; i <= 3; i += 1){
      const event = await groupedEvent(repo, `prabc-form-s${i}`, `2026-05-0${i}`, 'PR', groupKey, i, cible.cible_id, {
        libelle: `Exercice PR-ABC | séance ${i}`
      });
      sessions.push(event);
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
    }
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    const rows = historyRoles(fiche, 'FORMATEUR');
    eq(rows.length, 3, 'historique formateur PR-ABC');
    eq(new Set(rows.map((row) => row.evenementId)).size, 3);
    ok(rows.every((row) => display.ficheEventInformations(row) === 'Formateur'));
    ok(rows.every((row) => display.ficheEventStatutLabel(row) === 'Présent'));
    const evaluated = await analytics.evaluate(Object.assign({ personneId: trainer.personne_id }, PERIOD));
    eq(evaluated.officiel.eventCount, 1);
    eq(evaluated.includedEvents.length, 1);
  });

  await record('CAS 2 — PR multi-session générique : 3 traces / 1 contribution', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'formateur-pr', '15062', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:GEN-FORM';
    for(let i = 1; i <= 3; i += 1){
      const event = await groupedEvent(repo, `pr-form-s${i}`, `2026-06-0${i}`, 'PR', groupKey, i, cible.cible_id);
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(historyRoles(fiche, 'FORMATEUR').length, 3);
  });

  await record('CAS 3 — participant + formateur même événement : 1 ligne', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const mixed = await person(repo, 'part-form', '15063', cible.cible_id);
    const event = await repo.insertEvenement({
      evenement_id: 'dps-part-form',
      date: '2026-07-02',
      domaine_code: 'DPS',
      libelle: 'DPS mixte',
      code_cours: 'dps-part-form',
      statut: 'REALISE',
      mode_suivi: 'NOMINATIF',
      cible_ids: [cible.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [cible.cible_id]);
    await expectPerson(repo, event.evenement_id, mixed.personne_id);
    await participate(repo, event.evenement_id, mixed.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'SAISIE' });
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, mixed.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    eq(fiche.evenements.length, 1);
    eq(fiche.evenements[0].statutParticipation, 'PRESENT');
    eq(fiche.evenements[0].roleParticipation, 'FORMATEUR');
    eq(display.ficheEventStatutLabel(fiche.evenements[0]), 'Présent');
    eq(display.ficheEventInformations(fiche.evenements[0]), 'Formateur');
  });

  await record('CAS 4 — auxiliaire visible hors statistiques', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const aux = await person(repo, 'auxiliaire-1', '15064', cible.cible_id);
    const event = await groupedEvent(repo, 'pr-aux-s1', '2026-07-10', 'PR', 'NO_CYCLE_TEST:PR:AUX', 1, cible.cible_id);
    await expectPerson(repo, event.evenement_id, aux.personne_id);
    await participate(repo, event.evenement_id, aux.personne_id, 'PRESENT', { role: 'AUXILIAIRE', source: 'ENCADREMENT' });
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, aux.personne_id, {
      kpi: { numerator: 0, denominator: 0, percentage: null, eventCount: 0 }
    });
    const rows = historyRoles(fiche, 'AUXILIAIRE');
    eq(rows.length, 1);
    eq(display.ficheEventInformations(rows[0]), 'Auxiliaire');
    eq(display.ficheEventStatutLabel(rows[0]), '—');
  });

  await record('CAS 5 — surveillant visible sans double comptage', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const surv = await person(repo, 'surv-1', '15065', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:SURV';
    for(let i = 1; i <= 2; i += 1){
      const event = await groupedEvent(repo, `pr-surv-s${i}`, `2026-07-1${i}`, 'PR', groupKey, i, cible.cible_id);
      await expectPerson(repo, event.evenement_id, surv.personne_id);
      await participate(repo, event.evenement_id, surv.personne_id, 'PRESENT', { role: 'SURVEILLANT', source: 'SAISIE' });
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, surv.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    const rows = historyRoles(fiche, 'SURVEILLANT');
    eq(rows.length, 2);
    ok(rows.every((row) => display.ficheEventInformations(row) === 'Surveillant'));
    ok(fiche.evenements.length > fiche.kpi.eventCount);
  });

  await record('CAS 6 — moniteur JSP visible, taux jeunes inchangé', async () => {
    const repo = createMemoryRepo();
    const jsp = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', '1');
    const dps = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const jeune = await person(repo, 'jsp-jeune-1', '15066', jsp.cible_id, { grade: 'Cadet' });
    const moniteur = await person(repo, 'jsp-moniteur-1', '15067', jsp.cible_id, {
      affectations: [{ cible_id: dps.cible_id, date_debut: '2026-01-01' }]
    });
    const event = await repo.insertEvenement({
      evenement_id: 'jsp-mon-s1',
      date: '2026-08-04',
      domaine_code: 'JSP',
      libelle: 'Séance JSP',
      code_cours: 'jsp-mon-s1',
      statut: 'REALISE',
      mode_suivi: 'NOMINATIF',
      cible_ids: [jsp.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [jsp.cible_id]);
    await expectPerson(repo, event.evenement_id, jeune.personne_id);
    await participate(repo, event.evenement_id, jeune.personne_id, 'PRESENT');
    await participate(repo, event.evenement_id, moniteur.personne_id, 'PRESENT', { role: 'MONITEUR', source: 'ENCADREMENT' });
    const persons = createScopePersonService(repo);
    const jeuneFiche = await assertFicheDirectorySync(persons, jeune.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    const monitorFiche = await persons.fiche(moniteur.personne_id, PERIOD);
    eq(monitorFiche.kpi.eventCount, 0);
    eq(monitorFiche.kpi.numerator, 0);
    const monitorRows = historyRoles(monitorFiche, 'MONITEUR');
    eq(monitorRows.length, 1);
    eq(display.ficheEventInformations(monitorRows[0]), 'Moniteur');
    eq(jeuneFiche.fiche.jsp.role, 'JEUNE');
    eq(jeuneFiche.fiche.kpi.eventCount, 1);
  });

  await record('CAS 7 — ANNULÉ visible hors KPI, formateur ne réalise pas', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const trainer = await person(repo, 'formateur-annule', '15068', cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-09-03',
      domaineCode: 'DPS',
      libelle: 'Événement annulé formateur',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [trainer.personne_id],
      baseVersion: created.version
    }, ACTOR);
    let ficheEvent = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: ficheEvent.version,
      participations: [{ personneId: trainer.personne_id, statut: 'PRESENT', role: 'FORMATEUR' }]
    }, ACTOR);
    ficheEvent = await service.lireEvenement(created.evenement.evenement_id);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: ficheEvent.version }, ACTOR);
    await service.annulerEvenement(created.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(created.evenement.evenement_id)).version,
      motif: 'Annulation recette'
    }, ACTOR);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(created.evenement.evenement_id));
    ok(row, 'annulé visible');
    eq(row.statutParticipation, 'ANNULE');
    eq(display.ficheEventStatutLabel(row), 'Annulé');
    eq(display.ficheEventInformations(row), 'Événement annulé');
    eq(fiche.kpi.eventCount, 0);
    eq(fiche.kpi.numerator, 0);
  });

  await record('CAS 8 — SUPPRIMÉ / hidden totalement absent même si FORMATEUR legacy', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1') || await repo.findCible('DPS', 'GEN');
    const trainer = await person(repo, 'formateur-hidden', '15069', cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-09-04',
      domaineCode: 'DPS',
      libelle: 'Événement supprimé formateur',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [trainer.personne_id],
      baseVersion: created.version
    }, ACTOR);
    let ficheEvent = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: ficheEvent.version,
      participations: [{ personneId: trainer.personne_id, statut: 'PRESENT', role: 'FORMATEUR' }]
    }, ACTOR);
    await service.masquerEvenement(created.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(created.evenement.evenement_id)).version,
      motif: 'Suppression recette'
    }, ACTOR);
    const fiche = await persons.fiche(trainer.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(created.evenement.evenement_id)));
    eq(fiche.kpi.eventCount, 0);
  });

  await record('CAS 9/10 — directory = fiche et historique peut dépasser le KPI', async () => {
    const repo = createMemoryRepo();
    const cible = await repo.findCible('PR', 'GEN');
    const trainer = await person(repo, 'formateur-gap', '15070', cible.cible_id);
    const groupKey = 'NO_CYCLE_TEST:PR:GAP';
    for(let i = 1; i <= 3; i += 1){
      const event = await groupedEvent(repo, `pr-gap-s${i}`, `2026-10-0${i}`, 'PR', groupKey, i, cible.cible_id);
      await expectPerson(repo, event.evenement_id, trainer.personne_id);
      await participate(repo, event.evenement_id, trainer.personne_id, 'PRESENT', { role: 'FORMATEUR', source: 'ENCADREMENT' });
    }
    const persons = createScopePersonService(repo);
    const { fiche } = await assertFicheDirectorySync(persons, trainer.personne_id, {
      kpi: { numerator: 1, denominator: 1, percentage: 100, eventCount: 1 }
    });
    ok(fiche.evenements.length > fiche.kpi.eventCount, 'historique opérationnel > eventCount KPI est NORMAL');
    eq(fiche.evenements.length, 3);
    eq(fiche.kpi.eventCount, 1);
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
