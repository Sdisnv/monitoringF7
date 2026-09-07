#!/usr/bin/env node
'use strict';

/** SCOPE-PR-ABC-MULTISESSION-CLOSE-REPAIR-1 — clôture technique des séances PR-ABC. */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { computePrExerciseParticipationState, canCloseLastSession } = require('../netlify/lib/_scope-cycle-rules');
const logic = require('../assets/js/scope-ui-logic.js');

const ACTOR = { sub: 'pr-abc-close-repair-1', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

function part(person, statut, extra){
  return Object.assign({ personneId: person.personne_id, statut, role: 'PARTICIPANT' }, extra || {});
}

async function save(service, repo, eventId, participations){
  return service.enregistrerParticipations(eventId, {
    baseVersion: await version(repo, eventId),
    participations
  }, ACTOR);
}

async function setupPrAbc(personCount = 18){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const sessions = [
    { id: 'prabc-1', date: '2026-04-21' },
    { id: 'prabc-2', date: '2026-06-10' },
    { id: 'prabc-3', date: '2026-10-06' }
  ];
  const events = [];
  for(const [index, session] of sessions.entries()){
    const ev = await repo.insertEvenement({
      evenement_id: session.id,
      domaine_code: 'PR',
      date: session.date,
      libelle: `Exercice PR-ABC | Refresh ${index + 1}`,
      code_cours: `PAPR.PRABC.${index + 1}`,
      pr_exercise_group_key: 'scope-pr-abc:PR:refresh-2026',
      pr_session_key: `scope-pr-abc:PR:refresh-2026.${index + 1}`
    });
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(let i = 1; i <= personCount; i += 1){
    const person = await repo.insertPersonne({
      personne_id: `abc-p${i}`,
      nip: String(86000 + i),
      nom: `Nom${i}`,
      prenom: `Prenom${i}`,
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(person);
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id,
        personne_id: person.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  return { repo, service, events, people };
}

async function expectCloseRefused(fn){
  let error = null;
  try {
    await fn();
  } catch (err) {
    error = err;
  }
  assert.ok(error);
  assert.strictEqual(error.status, 422);
  assert.ok(['cloture_refusee', 'session_incomplete'].includes(error.error));
}

(async () => {
  await record('01 — PR-ABC détecté multi-session par pr_exercise_group_key sans cycle dédié', async () => {
    const ctx = await setupPrAbc();
    await save(ctx.service, ctx.repo, 'prabc-1', ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')));
    const last = await ctx.service.lireEvenement('prabc-3');
    assert.strictEqual(last.prExerciseParticipation.groupKey, 'scope-pr-abc:PR:refresh-2026');
    assert.strictEqual(last.prExerciseParticipation.isMultiSession, true);
    assert.strictEqual(last.prExerciseParticipation.isLastSession, true);
    assert.strictEqual(last.prExerciseParticipation.unfilledPeople.length, 13);
  });

  await record('02 — clôture séance PR-ABC intermédiaire autorisée avec population globale ouverte', async () => {
    const ctx = await setupPrAbc();
    const saved = await save(ctx.service, ctx.repo, 'prabc-1', ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')));
    const closed = await ctx.service.cloturer('prabc-1', { baseVersion: saved.version }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    for(const person of ctx.people.slice(5)){
      assert.strictEqual((await ctx.repo.getParticipation('prabc-1', person.personne_id)).statut, 'NON_RENSEIGNE');
    }
  });

  await record('03 — dernière séance PR-ABC clôturable techniquement sans finaliser le bilan global', async () => {
    const ctx = await setupPrAbc();
    await save(ctx.service, ctx.repo, 'prabc-1', ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')));
    const before = await ctx.service.lireEvenement('prabc-3');
    assert.strictEqual(before.prExerciseParticipation.unfilledPeople.length, 13);
    assert.strictEqual(canCloseLastSession(before.prExerciseParticipation), true);
    const closed = await ctx.service.cloturer('prabc-3', { baseVersion: await version(ctx.repo, 'prabc-3') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.strictEqual((await ctx.repo.getParticipation('prabc-3', ctx.people[5].personne_id)).statut, 'NON_RENSEIGNE');
  });

  await record('04 — l’UI multi-session ne bloque pas les NON_RENSEIGNE ouverts', () => {
    const rows = [
      { personneId: 'a', inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' },
      { personneId: 'b', inclus: true, role: 'PARTICIPANT', statut: 'PRESENT' }
    ];
    assert.strictEqual(logic.listSessionClosureBlockingRows(rows, { isMultiSession: true }).length, 0);
    assert.deepStrictEqual(logic.buildPresenceSavePayload(rows, new Set()).map((row) => row.statut), ['NON_RENSEIGNE', 'PRESENT']);
  });

  await record('05 — l’UI multi-session bloque seulement les motifs incohérents', () => {
    const rows = [
      { personneId: 'a', inclus: true, role: 'PARTICIPANT', statut: 'ABSENT_EXCUSE', motifAbsence: '' },
      { personneId: 'b', inclus: true, role: 'PARTICIPANT', statut: 'DISPENSE', motifAbsence: 'FORMATEUR_PR' }
    ];
    const blocked = logic.listSessionClosureBlockingRows(rows, { isMultiSession: true });
    assert.deepStrictEqual(blocked.map((row) => row.personneId), ['a']);
  });

  await record('06 — mono-session SAFE-CLOSE reste strict', async () => {
    const ctx = await setupPrAbc(2);
    const mono = await ctx.repo.insertEvenement({
      evenement_id: 'mono-pr',
      domaine_code: 'PR',
      date: '2026-11-01',
      libelle: 'Exercice PR mono',
      code_cours: 'PAPR.MONO'
    });
    await ctx.repo.updateEventIfVersion(mono.evenement_id, 1, { population_figee: true });
    for(const person of ctx.people){
      await ctx.repo.upsertAttendu({ evenement_id: mono.evenement_id, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
      await ctx.repo.upsertParticipation({
        evenement_id: mono.evenement_id,
        personne_id: person.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
    await save(ctx.service, ctx.repo, 'mono-pr', [part(ctx.people[0], 'PRESENT')]);
    await expectCloseRefused(async () => ctx.service.cloturer('mono-pr', { baseVersion: await version(ctx.repo, 'mono-pr') }, ACTOR));
  });

  await record('07 — consolidation par NIP conserve une seule couverture globale', () => {
    const state = computePrExerciseParticipationState({
      cycle: { domaine_code: 'PR' },
      evenements: [
        { evenement_id: 's1', date: '2026-04-21', pr_exercise_group_key: 'abc', pr_session_key: 'abc.1' },
        { evenement_id: 's2', date: '2026-06-10', pr_exercise_group_key: 'abc', pr_session_key: 'abc.2' }
      ],
      cyclePersonnes: [],
      attendus: [
        { evenement_id: 's1', personne_id: 'a', inclus: true },
        { evenement_id: 's2', personne_id: 'a', inclus: true }
      ],
      participations: [
        { evenement_id: 's1', personne_id: 'a', statut: 'PRESENT', role: 'PARTICIPANT' },
        { evenement_id: 's2', personne_id: 'a', statut: 'PRESENT', role: 'PARTICIPANT' }
      ],
      personnes: { a: { personne_id: 'a', nip: '99901' } },
      currentEventId: 's2'
    });
    assert.strictEqual(state.kpis.population, 1);
    assert.strictEqual(state.coverage.covered, 1);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.log(`NOK ${row.name}`);
      console.log(row.proof);
    }
  });
  if(failed.length){
    console.error(`SCOPE-PR-ABC-MULTISESSION-CLOSE-REPAIR-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PR-ABC-MULTISESSION-CLOSE-REPAIR-1: ${results.length} PASS`);
})();
