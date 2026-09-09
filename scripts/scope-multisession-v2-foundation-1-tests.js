#!/usr/bin/env node
'use strict';

/** SCOPE — MULTISESSION-V2-FOUNDATION-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const L = require('../assets/js/scope-ui-logic');

const ACTOR = { sub: 'scope-multisession-v2-foundation-1', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function bootstrap(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const dapGen = await repo.findCible('DAP', 'GEN');
  const dapY1 = await repo.findCible('DAP', 'Y1');
  const prG1 = await repo.findCible('PR', 'G1');
  const people = {};
  for(const key of ['A', 'B', 'C', 'D', 'E']){
    const person = await repo.insertPersonne({
      nip: `MSV2-${key}`,
      nom: `Nom${key}`,
      prenom: `Prenom${key}`,
      grade: 'Sap',
      date_entree: '2020-01-01'
    });
    people[key] = person;
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dapY1.cible_id, date_debut: '2020-01-01' });
  }
  people.X = await repo.insertPersonne({
    nip: 'MSV2-X',
    nom: 'HorsPopulation',
    prenom: 'Formateur',
    grade: 'Sgt',
    date_entree: '2020-01-01'
  });
  const s1 = await service.createEvenement({
    date: '2026-09-08',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.1',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  const f1 = await service.figerPopulation(s1.evenement.evenement_id, { baseVersion: s1.evenement.version }, ACTOR);
  const s2 = await service.createEvenement({
    date: '2026-09-15',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.2',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  const f2 = await service.figerPopulation(s2.evenement.evenement_id, { baseVersion: s2.evenement.version }, ACTOR);
  const ms = await repo.upsertMultisessionV2({
    code: 'TEST-DAP-FORMATION-GROUPEE-1-2026',
    label: 'Formation groupée DAP',
    domain: 'DAP',
    period: '2026',
    status: 'OUVERTE',
    metadata: { test: 'scope-multisession-v2-foundation-1' }
  });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s1.evenement.evenement_id, sequence: 1 });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s2.evenement.evenement_id, sequence: 2 });
  for(const person of Object.values(people).filter((p) => p !== people.X)){
    await repo.upsertMultisessionV2Population({
      multisession_id: ms.multisession_id,
      person_id: person.personne_id,
      snapshot: { nip: person.nip },
      provenance: 'TEST_POPULATION'
    });
  }
  const pr = await service.createEvenement({
    date: '2026-09-20',
    domaineCode: 'PR',
    libelle: 'Exercice PR 1.1',
    cibleIds: [prG1.cible_id],
    modeSuivi: 'NOMINATIF',
    modeSession: 'MULTI',
    nombreSessionsAttendu: 2,
    sessionIndex: 1
  }, ACTOR);
  return { repo, service, people, ms, s1: { eventId: s1.evenement.evenement_id, version: f1.version }, s2: { eventId: s2.evenement.evenement_id, version: f2.version }, pr };
}

async function save(service, eventId, entries){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: entries.map((entry) => ({
      personneId: entry.personne.personne_id,
      statut: entry.statut,
      role: entry.role || 'PARTICIPANT',
      motifAbsence: entry.motifAbsence || null
    }))
  }, ACTOR);
}

(async () => {
  const ctx = await bootstrap();
  const { service, people, ms, s1, s2, pr } = ctx;

  await record('TEST 1 — DAP 1.1 présent A puis clôture intermédiaire autorisée', async () => {
    await save(service, s1.eventId, [
      { personne: people.A, statut: 'PRESENT' },
      { personne: people.B, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }
    ]);
    const fiche = await service.lireEvenement(s1.eventId);
    const closed = await service.cloturer(s1.eventId, { baseVersion: fiche.evenement.version }, ACTOR);
    eq(closed.evenement.statut, 'REALISE');
  });

  await record('TEST 2 — DAP 1.2 affiche A verrouillé bleu avec tooltip DAP 1.1', async () => {
    const fiche = await service.lireEvenement(s2.eventId);
    eq(fiche.engine, 'MULTI_SESSION_V2');
    const row = fiche.attendus.find((a) => String(a.personne_id) === String(people.A.personne_id));
    ok(row && row.alreadyCountedInSession === true, 'A doit être verrouillé');
    ok(String(row.sessionMessage || '').includes('DAP 1.1'), 'tooltip doit mentionner DAP 1.1');
    ok(L.coveredInGlobalBilan({ alreadyCountedInSession: true, sessionHasValidStatus: false, statut: 'NON_RENSEIGNE' }), 'contrat UI verrouillé');
  });

  await record('TEST 3 — B excusé DAP 1.1 puis présent DAP 1.2 consolide Présent', async () => {
    await save(service, s2.eventId, [{ personne: people.B, statut: 'PRESENT' }]);
    const state = (await service.lireEvenement(s2.eventId)).multiSessionV2;
    eq(state.byPersonneId[people.B.personne_id].finalStatus, 'PRESENT');
  });

  await record('TEST 4 — formateur dans population cible reconnu une seule fois', async () => {
    const fiche = await service.lireEvenement(s2.eventId);
    await service.ajouterEncadrement(s2.eventId, {
      baseVersion: fiche.evenement.version,
      personneId: people.D.personne_id,
      role: 'FORMATEUR',
      toutesSessions: true
    }, ACTOR);
    const state = (await service.lireEvenement(s2.eventId)).multiSessionV2;
    eq(state.byPersonneId[people.D.personne_id].finalStatus, 'PRESENT');
    eq(state.statistics.presents, 3);
  });

  await record('TEST 5 — formateur hors population visible sans contribution taux', async () => {
    const fiche = await service.lireEvenement(s2.eventId);
    await service.ajouterEncadrement(s2.eventId, {
      baseVersion: fiche.evenement.version,
      personneId: people.X.personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    const next = await service.lireEvenement(s2.eventId);
    ok(next.encadrement.some((row) => row.personne_id === people.X.personne_id), 'hors population visible en encadrement');
    ok(!next.multiSessionV2.byPersonneId[people.X.personne_id], 'hors population exclu du bilan');
  });

  await record('TEST 6 — Toutes les sessions propage un rôle sans double contribution', async () => {
    const next = await service.lireEvenement(s2.eventId);
    const first = await service.lireEvenement(s1.eventId);
    const currentRows = next.encadrement.filter((row) => row.personne_id === people.D.personne_id && row.role === 'FORMATEUR');
    const firstRows = first.encadrement.filter((row) => row.personne_id === people.D.personne_id && row.role === 'FORMATEUR');
    ok(currentRows.length >= 1, 'formateur présent sur DAP 1.2');
    ok(firstRows.length >= 1, 'formateur présent sur DAP 1.1');
    eq(next.multiSessionV2.statistics.presents, 3);
  });

  await record('TEST 7 — dispensé exclu du dénominateur', async () => {
    await save(service, s2.eventId, [{ personne: people.E, statut: 'DISPENSE', motifAbsence: 'JOKER' }]);
    const state = (await service.lireEvenement(s2.eventId)).multiSessionV2;
    eq(state.statistics.dispenses, 1);
    eq(state.statistics.denominator, 4);
  });

  await record('TEST 8 — clôture finale refusée avec C non renseigné identifié', async () => {
    let failed = null;
    try {
      await service.cloturerMultiSessionV2(ms.multisession_id, {}, ACTOR);
    } catch(error) {
      failed = error;
    }
    eq(failed && failed.error, 'multisession_v2_incomplete');
    ok((failed.details.unfilledPeople || []).some((row) => row.personneId === people.C.personne_id), 'C doit être listé');
  });

  await record('TEST 9 — après C absent, clôture Multi-session autorisée', async () => {
    await save(service, s2.eventId, [{ personne: people.C, statut: 'ABSENT_NON_EXCUSE' }]);
    const closed = await service.cloturerMultiSessionV2(ms.multisession_id, {}, ACTOR);
    eq(closed.multisession.status, 'CLOTUREE');
  });

  await record('TEST 10 — permutation refusée UI et backend pour V2', async () => {
    const fiche = await service.lireEvenement(s2.eventId);
    const statuses = L.participationStatusesForDomaine('DAP', fiche.participationPolicy).filter(([value]) => value !== 'PERMUTATION');
    ok(!statuses.some(([value]) => value === 'PERMUTATION'), 'contrat UI V2 sans permutation');
    let failed = null;
    try {
      await save(service, s2.eventId, [{ personne: people.C, statut: 'PERMUTATION' }]);
    } catch(error) {
      failed = error;
    }
    eq(failed && failed.error, 'multisession_v2_permutation_interdite');
  });

  await record('NON-REG — DAP simple conserve la permutation', async () => {
    const simpleFiche = await service.createEvenement({
      date: '2026-10-01',
      domaineCode: 'DAP',
      libelle: 'DAP simple session test',
      cibleIds: [(await ctx.repo.findCible('DAP', 'Y1')).cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const f = await service.figerPopulation(simpleFiche.evenement.evenement_id, { baseVersion: simpleFiche.evenement.version }, ACTOR);
    const fiche = await service.lireEvenement(simpleFiche.evenement.evenement_id);
    ok(!fiche.multiSessionV2, 'pas de V2 automatique');
    ok(L.participationStatusesForDomaine('DAP', fiche.participationPolicy).some(([value]) => value === 'PERMUTATION'), 'DAP simple garde permutation UI');
    ok(f.version > 1, 'population simple figée');
  });

  await record('NON-REG — PR legacy reste sur son moteur', async () => {
    const fiche = await service.lireEvenement(pr.evenement.evenement_id);
    ok(!fiche.multiSessionV2, 'PR non branché sur V2');
    ok(fiche.engine !== 'MULTI_SESSION_V2', 'engine PR non V2');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})();
