#!/usr/bin/env node
'use strict';

/** SCOPE-MULTISESSION-CORE-7 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const {
  computeMultiSessionParticipationState,
  computePrExerciseParticipationState
} = require('../netlify/lib/_scope-cycle-rules');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-multisession-core-7', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function directInput(domaine){
  return {
    cycle: { cycle_id: `${domaine}-cycle`, domaine_code: domaine },
    currentEventId: 's3',
    personnes: [
      { personne_id: 'p1', nip: `${domaine}1`, nom: 'Alpha' },
      { personne_id: 'p2', nip: `${domaine}2`, nom: 'Bravo' },
      { personne_id: 'p3', nip: `${domaine}3`, nom: 'Charlie' }
    ],
    evenements: [
      { evenement_id: 's1', domaine_code: domaine, statut: 'REALISE', exercice_id: 'ex-7', pr_exercise_group_key: 'core-7-generic', mode_session: 'MULTI', nombre_sessions_attendu: 3, consolidation_active: true, session_index: 1, libelle: `${domaine} session 1` },
      { evenement_id: 's2', domaine_code: domaine, statut: 'REALISE', exercice_id: 'ex-7', pr_exercise_group_key: 'core-7-generic', mode_session: 'MULTI', nombre_sessions_attendu: 3, consolidation_active: true, session_index: 2, libelle: `${domaine} session 2` },
      { evenement_id: 's3', domaine_code: domaine, statut: 'PLANIFIE', exercice_id: 'ex-7', pr_exercise_group_key: 'core-7-generic', mode_session: 'MULTI', nombre_sessions_attendu: 3, consolidation_active: true, session_index: 3, libelle: `${domaine} session 3` }
    ],
    attendus: [
      { evenement_id: 's1', personne_id: 'p1', nip: `${domaine}1`, inclus: true },
      { evenement_id: 's2', personne_id: 'p2', nip: `${domaine}2`, inclus: true },
      { evenement_id: 's3', personne_id: 'p1', nip: `${domaine}1`, inclus: true },
      { evenement_id: 's3', personne_id: 'p2', nip: `${domaine}2`, inclus: true },
      { evenement_id: 's3', personne_id: 'p3', nip: `${domaine}3`, inclus: true }
    ],
    participations: [
      { evenement_id: 's1', personne_id: 'p1', nip: `${domaine}1`, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' },
      { evenement_id: 's2', personne_id: 'p2', nip: `${domaine}2`, statut: 'PRESENT', role: 'FORMATEUR', source: 'SAISIE' }
    ]
  };
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, index){
  const p = await repo.insertPersonne({
    nip,
    nom: `Core${String(index).padStart(2, '0')}`,
    prenom: 'DAP',
    grade: 'Sap',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cibleRow.cible_id, date_debut: '2020-01-01' });
  return p;
}

async function createEvent(service, body){
  const created = await service.createEvenement(body, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function saveRows(service, eventId, rows){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: rows.map((row) => ({
      personneId: row.personne.personne_id,
      statut: row.statut,
      motifAbsence: row.motifAbsence || null,
      commentaire: row.commentaire || null,
      role: row.role || 'PARTICIPANT'
    }))
  }, ACTOR);
}

async function addCatchup(service, eventId, personne, sourceLabel){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id,
    role: 'PARTICIPANT',
    motifInclusion: L.permutationCatchupMotif({ libelle: sourceLabel })
  }, ACTOR);
}

async function removeExpected(service, eventId, personne){
  const fiche = await service.lireEvenement(eventId);
  return service.retirerAttendu(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id
  }, ACTOR);
}

async function resetEvent(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.resetParticipations(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

(async () => {
  await record('PR et DAP produisent le même état via le moteur multi-session générique', async () => {
    const pr = computeMultiSessionParticipationState(directInput('PR'));
    const dap = computeMultiSessionParticipationState(directInput('DAP'));
    deepEq(dap.kpis, pr.kpis, 'parité KPI PR/DAP');
    ok(dap.byPersonneId.p1.alreadyCountedInSession, 'personne réalisée grisée');
    ok(dap.byPersonneId.p2.alreadyCountedInSession, 'formateur réalisé grisé');
    eq(dap.byPersonneId.p2.countedRole, 'FORMATEUR', 'formateur conservé comme encadrement');
    eq(dap.kpis.open, 1, 'N sessions: seule la personne non traitée reste ouverte');
    deepEq(computePrExerciseParticipationState(directInput('PR')).kpis, pr.kpis, 'PR reste un alias du moteur générique');
  });

  await record('Rattrapage DAP add/remove/readd/reset destination/readd/reset source sans fantôme', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const y2 = await cible(repo, 'DAP', 'Y2');
    const sourcePerson = await person(repo, y1, 'C7-SRC', 1);
    const destinationPerson = await person(repo, y2, 'C7-DST', 2);
    const source = await createEvent(service, { date: '2026-07-01', domaineCode: 'DAP', libelle: 'Core 7 source', cibleIds: [y1.cible_id], exerciseEquivalenceKey: 'CORE-7' });
    const dest = await createEvent(service, { date: '2026-07-08', domaineCode: 'DAP', libelle: 'Core 7 destination', cibleIds: [y2.cible_id], exerciseEquivalenceKey: 'CORE-7' });
    await saveRows(service, source.eventId, [{ personne: sourcePerson, statut: 'PERMUTATION' }]);
    await saveRows(service, dest.eventId, [{ personne: destinationPerson, statut: 'PRESENT' }]);

    ok((await service.permutationsForEvent(dest.eventId)).obligations.some((row) => row.personneId === sourcePerson.personne_id && row.compatible !== false), 'candidat disponible');
    await addCatchup(service, dest.eventId, sourcePerson, 'Core 7 source');
    ok((await addCatchup(service, dest.eventId, sourcePerson, 'Core 7 source')).dejaPresent, 'anti-doublon backend');
    await removeExpected(service, dest.eventId, sourcePerson);
    let fiche = await service.lireEvenement(dest.eventId);
    ok(!fiche.participations.some((row) => row.personne_id === sourcePerson.personne_id), 'participation destination supprimée');
    ok((await service.permutationsForEvent(dest.eventId)).obligations.some((row) => row.personneId === sourcePerson.personne_id && row.compatible !== false), 'candidat redisponible après retrait');
    await addCatchup(service, dest.eventId, sourcePerson, 'Core 7 source');
    await resetEvent(service, dest.eventId);
    fiche = await service.lireEvenement(dest.eventId);
    ok(!fiche.participations.some((row) => row.personne_id === sourcePerson.personne_id), 'reset destination sans fantôme');
    await addCatchup(service, dest.eventId, sourcePerson, 'Core 7 source');
    await saveRows(service, source.eventId, [{ personne: sourcePerson, statut: 'PRESENT' }]);
    ok(!(await service.permutationsForEvent(dest.eventId)).obligations.some((row) => row.personneId === sourcePerson.personne_id && row.compatible !== false), 'reset/correction source supprime le candidat');
  });

  await record('UX CORE-7: libellés contextualisés, pas de toaster global, boutons stables, accès DAP global', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    const cycle = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-cycle-rules.js'), 'utf8');
    ok(ui.includes('Événement d’origine'));
    ok(ui.includes('Déjà dans cet exercice'));
    ok(!ui.includes('DAP · Global du domaine'));
    ok(ui.includes('Voir le rapport global de participation'));
    ok(!ui.includes("toast('info', 'Déjà ajoutée'"));
    ok(!ui.includes('<span class="scope-muted-inline">Source</span>'));
    ok(css.includes('.scope-status-control-group.is-compact .scope-status-control:not(.is-selected)'));
    ok(!/scope-status-control-group\.is-compact\s+\.scope-status-control:not\(\.is-selected\)\s*\{[^}]*display:\s*none/.test(css));
    ok(/function computeMultiSessionParticipationState/.test(cycle));
    ok(/function computePrExerciseParticipationState\(input = \{\}\)\{\s*return computeMultiSessionParticipationState\(input\);/m.test(cycle));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
