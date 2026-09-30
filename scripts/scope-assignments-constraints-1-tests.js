#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { evaluateAssignmentConstraints } = require('../netlify/lib/_scope-assignment-constraints');
const qualifications = require('../netlify/lib/_scope-person-qualifications');

const ACTOR = { sub: 'scope-assignments-constraints-1-test' };
const results = [];

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function person(repo, nip){
  return repo.insertPersonne({ nip, nom: nip, prenom: 'Test', grade: 'Sap', date_entree: '2026-01-01' });
}

async function event(service, cible, libelle, start, end, extra = {}){
  return service.createEvenement({
    date: extra.date || '2026-05-12',
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id],
    heureDebutPrevue: start,
    heureFinPrevue: end,
    ...extra
  }, ACTOR);
}

function constraintInput(overrides = {}){
  const current = {
    evenement_id: 'current', date: '2026-05-12', heure_debut_prevue: '18:00',
    heure_fin_prevue: '20:00', libelle: 'Courant', statut: 'PLANIFIE'
  };
  const other = {
    evenement_id: 'other', date: '2026-05-12', heure_debut_prevue: '19:00',
    heure_fin_prevue: '21:00', libelle: 'Autre', statut: 'PLANIFIE'
  };
  return {
    currentEvent: current,
    events: [current, other],
    attendus: [],
    participations: [],
    relations: [],
    candidatePersonIds: [],
    ...overrides
  };
}

(async () => {
  await record('Public attendu exact FOBA et DAP, sans inclusion massive de domaine', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba2 = await repo.findCible('FOBA', '2');
    const dapY2 = await repo.findCible('DAP', 'Y2');
    const pFoba1 = await person(repo, 'AFFECT-FOBA-1');
    const pFoba2 = await person(repo, 'AFFECT-FOBA-2');
    const pDap = await person(repo, 'AFFECT-DAP-Y2');
    await repo.insertAffectation({ personne_id: pFoba1.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: pFoba2.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: pDap.personne_id, cible_id: dapY2.cible_id, date_debut: '2026-01-01' });
    const fobaEvent = await event(service, foba1, 'Exercice FOBA 1', '18:00', '20:00');
    const dapEvent = await event(service, dapY2, 'DAP Y2', '20:00', '22:00');
    const fobaPreview = await service.previewAttendus(fobaEvent.evenement.evenement_id);
    const dapPreview = await service.previewAttendus(dapEvent.evenement.evenement_id);
    assert.deepStrictEqual(fobaPreview.personnes.map((row) => row.nip), ['AFFECT-FOBA-1']);
    assert.deepStrictEqual(dapPreview.personnes.map((row) => row.nip), ['AFFECT-DAP-Y2']);
  });

  await record('Calcul stable, gel idempotent et aucune personne/participation dupliquée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('FOBA', '1');
    const assigned = await person(repo, 'AFFECT-STABLE');
    await repo.insertAffectation({ personne_id: assigned.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    const created = await event(service, cible, 'Stabilité', '18:00', '20:00');
    const first = await service.previewAttendus(created.evenement.evenement_id);
    const second = await service.previewAttendus(created.evenement.evenement_id);
    assert.deepStrictEqual(first.personnes.map((row) => row.personneId), second.personnes.map((row) => row.personneId));
    assert.deepStrictEqual(first.constraints, second.constraints);
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
    await service.syncExpectedPopulationForPersonnes([assigned.personne_id], ACTOR);
    await service.syncExpectedPopulationForPersonnes([assigned.personne_id], ACTOR);
    assert.strictEqual((await repo.listAttendus(created.evenement.evenement_id)).length, 1);
    assert.strictEqual((await repo.listParticipations(created.evenement.evenement_id)).length, 1);
  });

  await record('Décision humaine EXCEPTION_AJOUT conservée par le recalcul', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('FOBA', '1');
    const outsider = await person(repo, 'AFFECT-MANUEL');
    const created = await event(service, cible, 'Décision humaine', '18:00', '20:00');
    const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
    await service.ajouterException(created.evenement.evenement_id, {
      baseVersion: frozen.version,
      personneId: outsider.personne_id,
      role: 'PARTICIPANT'
    }, ACTOR);
    await service.syncExpectedPopulationForPersonnes([outsider.personne_id], ACTOR);
    const row = (await repo.listAttendus(created.evenement.evenement_id)).find((item) => item.personne_id === outsider.personne_id);
    assert.ok(row);
    assert.strictEqual(row.origine, 'EXCEPTION_AJOUT');
  });

  await record('Chevauchement certain d’une personne détecté et identité NIP restituée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('FOBA', '1');
    const assigned = await person(repo, 'AFFECT-CONFLIT');
    await repo.insertAffectation({ personne_id: assigned.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    const first = await event(service, cible, 'Conflit A', '18:00', '20:00');
    const second = await event(service, cible, 'Conflit B', '19:00', '21:00');
    await service.figerPopulation(first.evenement.evenement_id, { baseVersion: first.evenement.version }, ACTOR);
    await service.figerPopulation(second.evenement.evenement_id, { baseVersion: second.evenement.version }, ACTOR);
    const constraints = await service.assignmentConstraints(first.evenement.evenement_id);
    assert.strictEqual(constraints.status, 'BLOQUANT');
    assert.ok(constraints.issues.some((row) => row.code === 'PERSONNE_TEMPOREL'));
    assert.strictEqual(constraints.identities[assigned.personne_id].nip, 'AFFECT-CONFLIT');
  });

  await record('Deux publics attendus non gelés sont comparés avant toute matérialisation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('FOBA', '1');
    const assigned = await person(repo, 'AFFECT-PREVIEW-CONFLIT');
    await repo.insertAffectation({ personne_id: assigned.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    const first = await event(service, cible, 'Preview conflit A', '18:00', '20:00');
    await event(service, cible, 'Preview conflit B', '19:00', '21:00');
    const preview = await service.previewAttendus(first.evenement.evenement_id);
    const direct = await service.assignmentConstraints(first.evenement.evenement_id);
    assert.strictEqual((await repo.listAttendus(first.evenement.evenement_id)).length, 0);
    assert.strictEqual(preview.constraints.status, 'BLOQUANT');
    assert.strictEqual(direct.status, 'BLOQUANT');
    assert.ok(preview.constraints.issues.some((row) => row.code === 'PERSONNE_TEMPOREL'));
  });

  await record('Événements adjacents compatibles et horaire incomplet seulement en ATTENTION', async () => {
    const adjacent = constraintInput({
      attendus: [
        { evenement_id: 'current', personne_id: 'p1', inclus: true },
        { evenement_id: 'other', personne_id: 'p1', inclus: true }
      ]
    });
    adjacent.events[1].heure_debut_prevue = '20:00';
    adjacent.events[1].heure_fin_prevue = '22:00';
    assert.strictEqual(evaluateAssignmentConstraints(adjacent).status, 'COMPATIBLE');
    const incomplete = constraintInput({
      attendus: [
        { evenement_id: 'current', personne_id: 'p1', inclus: true },
        { evenement_id: 'other', personne_id: 'p1', inclus: true }
      ]
    });
    incomplete.events[1].heure_debut_prevue = null;
    incomplete.events[1].heure_fin_prevue = null;
    const result = evaluateAssignmentConstraints(incomplete);
    assert.strictEqual(result.status, 'ATTENTION');
    assert.ok(result.issues.every((row) => row.level !== 'BLOQUANT'));
  });

  await record('Encadrement, salle et ressource exclusifs bloquent; OI seul appelle un contrôle', async () => {
    const input = constraintInput({
      participations: [
        { evenement_id: 'current', personne_id: 'formateur', role: 'FORMATEUR', statut: 'NON_RENSEIGNE' },
        { evenement_id: 'other', personne_id: 'formateur', role: 'FORMATEUR', statut: 'NON_RENSEIGNE' }
      ],
      relations: [
        { evenement_id: 'current', room_id: 'salle-1', resource_codes: ['VEH-1'], oi_codes: ['G1'] },
        { evenement_id: 'other', room_id: 'salle-1', resource_codes: ['VEH-1'], oi_codes: ['G1'] }
      ]
    });
    const result = evaluateAssignmentConstraints(input);
    assert.ok(result.issues.some((row) => row.code === 'ENCADREMENT_TEMPOREL' && row.level === 'BLOQUANT'));
    assert.ok(result.issues.some((row) => row.code === 'SALLE_EXCLUSIVE' && row.level === 'BLOQUANT'));
    assert.ok(result.issues.some((row) => row.code === 'RESSOURCE_EXCLUSIVE' && row.level === 'BLOQUANT'));
    assert.ok(result.issues.some((row) => row.code === 'OI_SIMULTANE' && row.level === 'ATTENTION'));
    const oiOnly = evaluateAssignmentConstraints(constraintInput({
      relations: [
        { evenement_id: 'current', oi_codes: ['G1'] },
        { evenement_id: 'other', oi_codes: ['G1'] }
      ]
    }));
    assert.strictEqual(oiOnly.status, 'ATTENTION');
  });

  await record('Ordre multi-session réellement défini contrôlé sans inventer de dépendance', async () => {
    const input = constraintInput({ relations: [
      { evenement_id: 'current', session_group_id: 'group-1', session_index: 1 },
      { evenement_id: 'other', session_group_id: 'group-1', session_index: 2 }
    ] });
    input.currentEvent.date = '2026-06-10';
    input.events[0].date = '2026-06-10';
    input.events[1].date = '2026-05-10';
    const result = evaluateAssignmentConstraints(input);
    assert.ok(result.issues.some((row) => row.code === 'ORDRE_SESSIONS' && row.level === 'BLOQUANT'));
    const unrelated = constraintInput();
    unrelated.currentEvent.date = '2026-06-10';
    unrelated.events[0].date = '2026-06-10';
    unrelated.events[1].date = '2026-05-10';
    assert.ok(!evaluateAssignmentConstraints(unrelated).issues.some((row) => row.code === 'ORDRE_SESSIONS'));
  });

  await record('PAPR et PABC restent deux qualifications canoniques distinctes', async () => {
    const papr = qualifications.canonicalizeQualification('PR', 'PAPR');
    const pabc = qualifications.canonicalizeQualification('PR', 'PABC');
    assert.strictEqual(papr.qualificationCode, 'PAPR');
    assert.strictEqual(pabc.qualificationCode, 'PABC');
    assert.notStrictEqual(papr.qualificationCode, pabc.qualificationCode);
    const definitions = qualifications.PUBLIC_DEFINITIONS_C3.map((row) => row.code);
    assert.ok(definitions.includes('PR-PAPR'));
    assert.ok(definitions.includes('PR-PABC'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  if(results.some((row) => row.status !== 'PASS')) process.exitCode = 1;
  else console.log('SCOPE-ASSIGNMENTS-CONSTRAINTS-1: PASS');
})();
