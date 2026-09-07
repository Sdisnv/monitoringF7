#!/usr/bin/env node
'use strict';

/** SCOPE-PR-ABC-MULTISESSION-CLOSE-ROOT-CAUSE-REPAIR-2 — chemin réel UI + service. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-cycle-rules.js'), 'utf8');
const ACTOR = { sub: 'pr-abc-root-cause-repair-2', roles: ['sdis-admin'] };
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

function saisieRows(fiche){
  const parts = new Map((fiche.participations || []).map((p) => [String(p.personne_id || p.personneId), p]));
  return (fiche.attendus || []).filter((row) => row.inclus !== false).map((attendu) => {
    const id = String(attendu.personne_id || attendu.personneId);
    const person = (fiche.personnes && fiche.personnes[id]) || {};
    const participation = parts.get(id) || {};
    const statut = participation.statut || 'NON_RENSEIGNE';
    const localValid = logic.isValidSessionStatut(statut);
    const alreadyCountedInSession = Boolean(attendu.alreadyCountedInSession || attendu.already_counted_in_session);
    return {
      personneId: id,
      inclus: true,
      role: participation.role || 'PARTICIPANT',
      statut,
      motifAbsence: participation.motif_absence || '',
      alreadyCountedInSession,
      coveredInGlobalBilan: Boolean(!localValid && alreadyCountedInSession),
      grade: person.grade || '',
      prenom: person.prenom || '',
      nomFamille: person.nom || '',
      nip: person.nip || ''
    };
  });
}

async function setupPrAbcWithDistinctCycles(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const specs = [
    { id: 'abc-20260421', cycle: 'cycle-pr-abc-20260421', date: '2026-04-21', session: '1' },
    { id: 'abc-20260610', cycle: 'cycle-pr-abc-20260610', date: '2026-06-10', session: '2' },
    { id: 'abc-20261006', cycle: 'cycle-pr-abc-20261006', date: '2026-10-06', session: '3' }
  ];
  for(const spec of specs){
    await repo.insertCycle({
      cycle_id: spec.cycle,
      cycle_key: spec.cycle,
      annee: 2026,
      domaine_code: 'PR',
      type_cycle: 'PAPR',
      libelle: `Cycle technique ${spec.session}`
    });
  }
  const events = [];
  for(const spec of specs){
    const created = await repo.insertEvenement({
      evenement_id: spec.id,
      cycle_id: spec.cycle,
      domaine_code: 'PR',
      specialisation_code: 'ABC',
      date: spec.date,
      libelle: 'Exercice PR-ABC | Refresh',
      code_cours: `PAPR.ABC.${spec.session}`,
      pr_exercise_group_key: 'scope-prod-pr-abc-refresh-2026',
      pr_session_key: `scope-prod-pr-abc-refresh-2026.${spec.session}`
    });
    events.push(await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(let i = 1; i <= 18; i += 1){
    const person = await repo.insertPersonne({
      personne_id: `abc-person-${i}`,
      nip: String(87000 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: `Prenom${String(i).padStart(2, '0')}`,
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(person);
    for(const event of events){
      await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: event.evenement_id,
        personne_id: person.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  return { repo, service, events, people };
}

async function setupMonoSession(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const created = await repo.insertEvenement({
    evenement_id: 'mono-pr-abc',
    domaine_code: 'PR',
    specialisation_code: 'ABC',
    date: '2026-10-06',
    libelle: 'Exercice PR-ABC mono',
    code_cours: 'PAPR.ABC.MONO'
  });
  await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  const people = [];
  for(let i = 1; i <= 6; i += 1){
    const person = await repo.insertPersonne({
      personne_id: `mono-person-${i}`,
      nip: String(88000 + i),
      nom: `Mono${i}`,
      prenom: 'Test',
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(person);
    await repo.upsertAttendu({ evenement_id: 'mono-pr-abc', personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({
      evenement_id: 'mono-pr-abc',
      personne_id: person.personne_id,
      statut: 'NON_RENSEIGNE',
      role: 'PARTICIPANT',
      source: 'GENERATION'
    });
  }
  return { repo, service, people };
}

async function expect422(fn){
  let error = null;
  try {
    await fn();
  } catch (err) {
    error = err;
  }
  assert.ok(error);
  assert.strictEqual(error.status, 422);
}

(async () => {
  await record('01 — données recette NOK : 3 séances PR-ABC même groupe malgré cycle_id distincts', async () => {
    const ctx = await setupPrAbcWithDistinctCycles();
    const grouped = await ctx.repo.listPrExerciseEvents('scope-prod-pr-abc-refresh-2026');
    assert.deepStrictEqual(grouped.map((event) => event.date), ['2026-04-21', '2026-06-10', '2026-10-06']);
    assert.deepStrictEqual(new Set(grouped.map((event) => event.cycle_id)).size, 3);
  });

  await record('02 — chemin fiche UI reconnaît bien la séance comme multisession', async () => {
    const ctx = await setupPrAbcWithDistinctCycles();
    await save(ctx.service, ctx.repo, 'abc-20260610', [
      ...ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')),
      part(ctx.people[5], 'DISPENSE', { motif_absence: 'FORMATEUR_PR' })
    ]);
    const fiche = await ctx.service.lireEvenement('abc-20260610');
    assert.strictEqual(fiche.prExerciseParticipation.isMultiSession, true);
    assert.deepStrictEqual(fiche.prExerciseParticipation.reportingScope.eventIds, ['abc-20260421', 'abc-20260610', 'abc-20261006']);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.population, 18);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.presents, 5);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.dispenses, 1);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.open, 12);
  });

  await record('03 — chemin clic frontend ne produit pas la modale NOK pour les 12 NON_RENSEIGNE', async () => {
    const ctx = await setupPrAbcWithDistinctCycles();
    await save(ctx.service, ctx.repo, 'abc-20260610', [
      ...ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')),
      part(ctx.people[5], 'DISPENSE', { motif_absence: 'FORMATEUR_PR' })
    ]);
    const fiche = await ctx.service.lireEvenement('abc-20260610');
    const session = fiche.prExerciseParticipation || fiche.sessionParticipation || {};
    const rows = saisieRows(fiche);
    const blockers = logic.listSessionClosureBlockingRows(rows, { isMultiSession: Boolean(session.isMultiSession) });
    assert.strictEqual(rows.filter((row) => row.statut === 'NON_RENSEIGNE').length, 12);
    assert.strictEqual(blockers.length, 0);
    assert.ok(uiSrc.includes('confirmClotureAfterSave'));
    assert.ok(uiSrc.includes('listSessionClosureBlockingRows(state.saisie, { isMultiSession: multi })'));
  });

  await record('04 — clôture service autorisée et NON_RENSEIGNE conservés', async () => {
    const ctx = await setupPrAbcWithDistinctCycles();
    const saved = await save(ctx.service, ctx.repo, 'abc-20260610', [
      ...ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')),
      part(ctx.people[5], 'DISPENSE', { motif_absence: 'FORMATEUR_PR' })
    ]);
    const closed = await ctx.service.cloturer('abc-20260610', { baseVersion: saved.version }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    const remaining = await Promise.all(ctx.people.slice(6).map((person) => ctx.repo.getParticipation('abc-20260610', person.personne_id)));
    assert.strictEqual(remaining.filter((row) => row.statut === 'NON_RENSEIGNE').length, 12);
    assert.strictEqual((await ctx.repo.getParticipation('abc-20261006', ctx.people[6].personne_id)).statut, 'NON_RENSEIGNE');
  });

  await record('05 — bilan global reste ouvert, sans absent artificiel', async () => {
    const ctx = await setupPrAbcWithDistinctCycles();
    await save(ctx.service, ctx.repo, 'abc-20260610', [
      ...ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')),
      part(ctx.people[5], 'DISPENSE', { motif_absence: 'FORMATEUR_PR' })
    ]);
    const fiche = await ctx.service.lireEvenement('abc-20261006');
    assert.strictEqual(fiche.prExerciseParticipation.coverage.covered, 6);
    assert.strictEqual(fiche.prExerciseParticipation.coverage.unfilled, 12);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.absents, 0);
  });

  await record('06 — mono-session conserve le SAFE-CLOSE strict', async () => {
    const ctx = await setupMonoSession();
    const saved = await save(ctx.service, ctx.repo, 'mono-pr-abc', ctx.people.slice(0, 5).map((person) => part(person, 'PRESENT')));
    await expect422(() => ctx.service.cloturer('mono-pr-abc', { baseVersion: saved.version }, ACTOR));
  });

  await record('07 — incohérence motif continue de bloquer', async () => {
    const ctx = await setupPrAbcWithDistinctCycles();
    const rows = [
      { personneId: 'a', inclus: true, role: 'PARTICIPANT', statut: 'ABSENT_EXCUSE', motifAbsence: '' },
      { personneId: 'b', inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' }
    ];
    assert.deepStrictEqual(logic.listSessionClosureBlockingRows(rows, { isMultiSession: true }).map((row) => row.personneId), ['a']);
    await expect422(() => save(ctx.service, ctx.repo, 'abc-20260610', [part(ctx.people[0], 'ABSENT_EXCUSE')]));
  });

  await record('08 — cause R1 couverte : pr_exercise_group_key prioritaire sur cycle_id', () => {
    assert.ok(rulesSrc.includes('const explicitGroupKey'));
    assert.ok(serviceSrc.includes('store.listPrExerciseEvents && evenement.pr_exercise_group_key'));
    assert.ok(serviceSrc.includes('repo.listPrExerciseEvents && evenement.pr_exercise_group_key'));
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
    console.error(`SCOPE-PR-ABC-MULTISESSION-CLOSE-ROOT-CAUSE-REPAIR-2: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-PR-ABC-MULTISESSION-CLOSE-ROOT-CAUSE-REPAIR-2: ${results.length} PASS`);
})();
