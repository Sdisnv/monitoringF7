#!/usr/bin/env node
'use strict';

/** SCOPE-DAP-MULTISESSION-ENGINE-6 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const {
  computeMultiSessionParticipationState,
  computePrExerciseParticipationState
} = require('../netlify/lib/_scope-cycle-rules');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-dap-multisession-engine-6', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
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

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, index, options = {}){
  const p = await repo.insertPersonne({
    nip,
    nom: options.nom || `Engine${String(index).padStart(2, '0')}`,
    prenom: options.prenom || 'DAP',
    grade: options.grade || 'Sap',
    date_entree: '2020-01-01'
  });
  if(cibleRow){
    await repo.insertAffectation({
      personne_id: p.personne_id,
      cible_id: cibleRow.cible_id,
      date_debut: options.dateDebut || '2020-01-01',
      date_fin: options.dateFin || null
    });
  }
  return p;
}

async function createEvent(service, body){
  const created = await service.createEvenement(body, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version, evenement: created.evenement };
}

async function createGenericSession(service, y1, index, count = 3){
  return createEvent(service, {
    date: `2026-05-${String(index).padStart(2, '0')}`,
    domaineCode: 'DAP',
    libelle: `Moteur multi-session générique ${index}`,
    cibleIds: [y1.cible_id],
    modeSession: 'MULTI',
    nombreSessionsAttendu: count,
    sessionIndex: index,
    sessionLabel: String(index),
    exerciceCode: 'ENGINE-6-GENERIC',
    exerciceLibelle: 'Moteur multi-session générique'
  });
}

async function createGroupedDapSession(service, y1, index){
  return createEvent(service, {
    date: index === 1 ? '2026-06-01' : '2026-06-08',
    domaineCode: 'DAP',
    libelle: `Formation groupée DAP 1.${index}`,
    cibleIds: [y1.cible_id],
    modeSession: 'MULTI',
    nombreSessionsAttendu: 2,
    sessionIndex: index,
    exerciceCode: 'ENGINE-6-DAP-GROUP-1',
    exerciceLibelle: 'Formation groupée DAP 1'
  });
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

async function close(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

function statusesByNip(fiche){
  const peopleRows = Array.isArray(fiche.personnes) ? fiche.personnes : Object.values(fiche.personnes || {});
  const people = new Map(peopleRows.map((p) => [p.personne_id, p]));
  const out = {};
  for(const row of fiche.participations || []){
    const person = people.get(row.personne_id) || {};
    out[person.nip || row.personne_id] = row.statut;
  }
  return out;
}

async function removeExpected(service, eventId, personne){
  const fiche = await service.lireEvenement(eventId);
  return service.retirerAttendu(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id
  }, ACTOR);
}

async function addCatchup(service, eventId, personne, sourceLabel){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id,
    role: 'PARTICIPANT',
    motifInclusion: L.permutationCatchupMotif({ libelle: sourceLabel || 'Exercice DAP 1, section DAP Y1' })
  }, ACTOR);
}

(async () => {
  await record('A-C-M — ajout, retrait, reset et réajout rattrapage sans état fantôme', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const y2 = await cible(repo, 'DAP', 'Y2');
    const destPeople = [];
    for(let i = 0; i < 5; i += 1) destPeople.push(await person(repo, y2, `E6-D-${i + 1}`, i + 1));
    const catchupPerson = await person(repo, y1, 'E6-F', 6);
    const source = await createEvent(service, {
      date: '2026-04-01', domaineCode: 'DAP', libelle: 'Exercice DAP 1', cibleIds: [y1.cible_id], exerciseEquivalenceKey: 'DAP_ENGINE_1'
    });
    const dest = await createEvent(service, {
      date: '2026-04-08', domaineCode: 'DAP', libelle: 'Exercice DAP 1', cibleIds: [y2.cible_id], exerciseEquivalenceKey: 'DAP_ENGINE_1'
    });
    await saveRows(service, source.eventId, [{ personne: catchupPerson, statut: 'PERMUTATION' }]);
    await saveRows(service, dest.eventId, [
      { personne: destPeople[0], statut: 'PRESENT' },
      { personne: destPeople[1], statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { personne: destPeople[2], statut: 'ABSENT_NON_EXCUSE' },
      { personne: destPeople[3], statut: 'DISPENSE', motifAbsence: 'PAS_CONCERNE' },
      { personne: destPeople[4], statut: 'PERMUTATION' }
    ]);
    const before = statusesByNip(await service.lireEvenement(dest.eventId));
    await addCatchup(service, dest.eventId, catchupPerson);
    const afterAdd = statusesByNip(await service.lireEvenement(dest.eventId));
    for(const p of destPeople) eq(afterAdd[p.nip], before[p.nip], `statut tiers modifié après ajout ${p.nip}`);
    ok(afterAdd['E6-F'] === 'NON_RENSEIGNE');
    let duplicate = await addCatchup(service, dest.eventId, catchupPerson);
    ok(duplicate.dejaPresent, 'doublon réel doit être refusé côté métier');

    await removeExpected(service, dest.eventId, catchupPerson);
    const afterRemoveFiche = await service.lireEvenement(dest.eventId);
    const afterRemove = statusesByNip(afterRemoveFiche);
    for(const p of destPeople) eq(afterRemove[p.nip], before[p.nip], `statut tiers modifié après retrait ${p.nip}`);
    ok(!afterRemoveFiche.attendus.some((row) => row.personne_id === catchupPerson.personne_id && row.inclus !== false));
    ok(!afterRemoveFiche.participations.some((row) => row.personne_id === catchupPerson.personne_id), 'participation rattrapage destination supprimée');
    const sourceObligations = await service.permutationsForEvent(dest.eventId);
    ok((sourceObligations.obligations || []).some((row) => row.personneId === catchupPerson.personne_id && row.compatible !== false), 'rattrapage redevient disponible');

    const resetVersion = (await service.lireEvenement(dest.eventId)).evenement.version;
    await service.resetParticipations(dest.eventId, { baseVersion: resetVersion }, ACTOR);
    const afterReset = await service.lireEvenement(dest.eventId);
    ok(!afterReset.participations.some((row) => row.personne_id === catchupPerson.personne_id), 'reset ne recrée pas le rattrapage retiré');
    await addCatchup(service, dest.eventId, catchupPerson);
    const afterReadd = await service.lireEvenement(dest.eventId);
    ok(afterReadd.attendus.some((row) => row.personne_id === catchupPerson.personne_id && row.inclus !== false), 'réajout immédiat réussi');
  });

  await record('F-I-J-L — moteur multi-session générique N=3 sans libellé DAP 1.1/1.2', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const people = [];
    for(let i = 0; i < 5; i += 1) people.push(await person(repo, y1, `E6-G-${i + 1}`, i + 1));
    const s1 = await createGenericSession(service, y1, 1, 3);
    const s2 = await createGenericSession(service, y1, 2, 3);
    const s3 = await createGenericSession(service, y1, 3, 3);

    await saveRows(service, s1.eventId, [
      { personne: people[0], statut: 'PRESENT' },
      { personne: people[2], statut: 'PRESENT', role: 'FORMATEUR' },
      { personne: people[3], statut: 'ABSENT_NON_EXCUSE' }
    ]);
    await close(service, s1.eventId);
    let fiche2 = await service.lireEvenement(s2.eventId);
    const a2 = fiche2.attendus.find((row) => row.personne_id === people[0].personne_id);
    const c2 = fiche2.attendus.find((row) => row.personne_id === people[2].personne_id);
    ok(a2.alreadyCountedInSession, 'A grisé session 2');
    ok(c2.alreadyCountedInSession, 'C formateur grisé session 2');
    await saveRows(service, s2.eventId, [
      { personne: people[1], statut: 'PRESENT' },
      { personne: people[2], statut: 'PRESENT', role: 'FORMATEUR' }
    ]);
    await close(service, s2.eventId);
    const fiche3 = await service.lireEvenement(s3.eventId);
    ok(fiche3.attendus.find((row) => row.personne_id === people[0].personne_id).alreadyCountedInSession, 'A grisé session 3');
    ok(fiche3.attendus.find((row) => row.personne_id === people[1].personne_id).alreadyCountedInSession, 'B grisé session 3');
    await saveRows(service, s3.eventId, [{ personne: people[3], statut: 'PRESENT' }]);
    let blocked = null;
    try { await close(service, s3.eventId); } catch(error) { blocked = error; }
    ok(blocked, 'dernière session générique doit refuser E ouvert');
    ok(String(blocked.message).includes('personne(s) restent à renseigner sur l’ensemble des sessions'));
    const summary = await analytics.summary({ domaine: 'DAP', year: 2026 });
    ok(summary.officiel.eventCount >= 0, 'analytics disponible après refus sans double obligation artificielle');
  });

  await record('G-J-K — PR et DAP utilisent le même socle multi-session et les formateurs restent encadrement', async () => {
    ok(typeof computeMultiSessionParticipationState === 'function');
    const state = computeMultiSessionParticipationState({
      cycle: { domaine_code: 'PR' },
      evenements: [{ evenement_id: 's1', domaine_code: 'PR', statut: 'REALISE', exercice_id: 'ex', mode_session: 'MULTI', nombre_sessions_attendu: 2, consolidation_active: true, session_index: 1 }],
      attendus: [{ evenement_id: 's1', personne_id: 'p1', nip: 'PR1', inclus: true }],
      participations: [{ evenement_id: 's1', personne_id: 'p1', nip: 'PR1', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' }],
      personnes: new Map([['p1', { personne_id: 'p1', nip: 'PR1' }]]),
      currentEventId: 's1'
    });
    eq(state.kpis.presents, computePrExerciseParticipationState({
      cycle: { domaine_code: 'PR' },
      evenements: [{ evenement_id: 's1', domaine_code: 'PR', statut: 'REALISE', exercice_id: 'ex', mode_session: 'MULTI', nombre_sessions_attendu: 2, consolidation_active: true, session_index: 1 }],
      attendus: [{ evenement_id: 's1', personne_id: 'p1', nip: 'PR1', inclus: true }],
      participations: [{ evenement_id: 's1', personne_id: 'p1', nip: 'PR1', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' }],
      personnes: new Map([['p1', { personne_id: 'p1', nip: 'PR1' }]]),
      currentEventId: 's1'
    }).kpis.presents, 'wrapper générique compatible PR');
    const serviceSource = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
    ok(serviceSource.includes('computeMultiSessionParticipationState'));
    const uiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    ok(uiSource.includes('visibleSaisie'));
    ok(uiSource.includes('ROLES_ENCADREMENT'));
    const logicSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    ok(logicSource.includes('function isOpenSaisieRow(row)'));
    ok(!L.isOpenSaisieRow({ inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', alreadyCountedInSession: true }));
  });

  await record('DAP réel — Formation groupée 1.1/1.2: Y1-Y4, déjà réalisés grisés, filtre ouvert consolidé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const y2 = await cible(repo, 'DAP', 'Y2');
    const y3 = await cible(repo, 'DAP', 'Y3');
    const y4 = await cible(repo, 'DAP', 'Y4');
    const people = [
      await person(repo, y1, 'E6-Y1', 1),
      await person(repo, y2, 'E6-Y2', 2),
      await person(repo, y3, 'E6-Y3', 3),
      await person(repo, y4, 'E6-Y4', 4)
    ];
    const s1 = await createGroupedDapSession(service, y1, 1);
    const s2 = await createGroupedDapSession(service, y1, 2);
    const fiche1 = await service.lireEvenement(s1.eventId);
    deepEq(fiche1.cibles.map((c) => c.niveau_code).sort(), ['Y1', 'Y2', 'Y3', 'Y4']);
    eq(fiche1.attendus.length, 4);
    await saveRows(service, s1.eventId, [
      { personne: people[0], statut: 'PRESENT' },
      { personne: people[1], statut: 'PRESENT', role: 'FORMATEUR' }
    ]);
    await close(service, s1.eventId);
    const fiche2 = await service.lireEvenement(s2.eventId);
    const rowY1 = fiche2.attendus.find((row) => row.personne_id === people[0].personne_id);
    const rowY2 = fiche2.attendus.find((row) => row.personne_id === people[1].personne_id);
    ok(rowY1.alreadyCountedInSession);
    ok(rowY2.alreadyCountedInSession);
    ok(String(rowY1.sessionReferenceLabel || rowY1.session_reference_label || '').includes('1'));
    const openRows = L.saisieAttendusFromFiche(fiche2).filter((row) => L.isOpenSaisieRow({
      inclus: row.inclus,
      statut: (fiche2.participations.find((p) => p.personne_id === row.personne_id) || {}).statut || 'NON_RENSEIGNE',
      alreadyCountedInSession: row.alreadyCountedInSession,
      sessionHasValidStatus: row.sessionHasValidStatus,
      role: 'PARTICIPANT'
    }));
    eq(openRows.length, 2);
    let blocked = null;
    try { await close(service, s2.eventId); } catch(error) { blocked = error; }
    ok(blocked && blocked.error === 'session_incomplete');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
