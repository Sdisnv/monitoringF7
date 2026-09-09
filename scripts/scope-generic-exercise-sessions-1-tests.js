#!/usr/bin/env node
'use strict';

/** SCOPE-GENERIC-EXERCISE-SESSIONS-1 — exercice persistant, sessions et pont PR legacy. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const importContract = require('../assets/js/scope-import-contract.js');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const schema = fs.readFileSync(path.join(ROOT, 'database/migrations/20260907_scope_generic_exercise_sessions_1.sql'), 'utf8');
const ACTOR = { sub: 'scope-generic-exercise-sessions-1', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function part(person, statut, extra){
  return Object.assign({ personneId: person.personne_id, statut, role: 'PARTICIPANT' }, extra || {});
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function save(service, repo, eventId, participations){
  return service.enregistrerParticipations(eventId, {
    baseVersion: await version(repo, eventId),
    participations
  }, ACTOR);
}

async function target(repo, domaine, niveau){
  const cibles = await repo.listCibles();
  const hit = cibles.find((row) => row.domaine_code === domaine && row.niveau_code === niveau);
  assert.ok(hit, `cible ${domaine}/${niveau} absente du référentiel`);
  return hit;
}

async function setupPeople(repo, eventIds, count, cible){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const person = await repo.insertPersonne({
      personne_id: `generic-person-${i}`,
      nip: String(91000 + i),
      nom: `Generique${String(i).padStart(2, '0')}`,
      prenom: 'Test',
      grade: 'Sap',
      skipPeriodes: true
    });
    await repo.insertAffectation({
      personne_id: person.personne_id,
      cible_id: cible.cible_id,
      date_debut: '2026-01-01',
      source: 'TEST'
    });
    people.push(person);
    for(const eventId of eventIds){
      await repo.upsertAttendu({ evenement_id: eventId, personne_id: person.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: eventId,
        personne_id: person.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  return people;
}

async function createExerciseWithSessions(repo, options){
  const exercice = await repo.upsertExercise({
    exercice_id: options.exerciceId,
    exercice_key: options.exerciceKey,
    domaine_code: options.domaine,
    code: options.code,
    libelle: options.libelle,
    annee: 2026,
    mode_session: 'MULTI',
    nombre_sessions_attendu: options.count,
    consolidation_active: true,
    source: options.source || 'TEST'
  });
  const events = [];
  for(let index = 1; index <= options.count; index += 1){
    const created = await repo.insertEvenement({
      evenement_id: `${options.prefix}-${index}`,
      exercice_id: exercice.exercice_id,
      session_index: index,
      session_label: `Session ${index}`,
      domaine_code: options.domaine,
      sous_domaine_code: options.domaine === 'PR' ? 'PR' : null,
      specialisation_code: options.specialisation || null,
      date: options.dates[index - 1],
      libelle: options.sessionLibelle,
      code_cours: `${options.codeCours}.${index}`,
      cible_ids: [options.cible.cible_id]
    });
    events.push(await repo.updateEventIfVersion(created.evenement_id, created.version, { population_figee: true }));
  }
  return { exercice, events };
}

async function expectStatus(status, fn){
  let error = null;
  try {
    await fn();
  } catch (err) {
    error = err;
  }
  assert.ok(error, `Erreur HTTP ${status} attendue`);
  assert.strictEqual(error.status, status);
  return error;
}

function nativeCsv(rows){
  return [
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;session;nb_sessions',
    ...rows
  ].join('\n');
}

(async () => {
  await record('01 — migration additive : parent exercice + colonnes session sur événements', () => {
    assert.ok(/create table if not exists scope_exercices/i.test(schema));
    assert.ok(/alter table scope_evenements\s+add column if not exists exercice_id/i.test(schema));
    assert.ok(/add column if not exists session_index/i.test(schema));
    assert.ok(/add column if not exists session_label/i.test(schema));
    assert.ok(!/drop column/i.test(schema));
    assert.ok(!/drop table/i.test(schema));
  });

  await record('02 — création manuelle expose SINGLE/MULTI sans id technique', async () => {
    assert.ok(html.includes('scope-generic-event-session-policy-architecture-1') || html.includes('scope-jsp-excuse-motifs-1') || html.includes('scope-event-close-ux-formateur-1') || html.includes('scope-generic-exercise-sessions-1') || html.includes('scope-participation-policy-engine-1'));
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'AUTO', 'VL');
    const created = await service.createEvenement({
      date: '2026-03-11',
      domaineCode: 'AUTO',
      cibleIds: [cible.cible_id],
      libelle: 'Exercice conduite VL',
      modeSession: 'MULTI',
      nombreSessionsAttendu: 3,
      consolidationActive: true,
      sessionIndex: 1
    }, ACTOR);
    assert.ok(created.exercice.exercice_id);
    assert.strictEqual(created.exercice.mode_session, 'MULTI');
    assert.strictEqual(created.exercice.nombre_sessions_attendu, 3);
    const event = await repo.getEvent(created.evenement.evenement_id);
    assert.strictEqual(event.exercice_id, created.exercice.exercice_id);
    assert.strictEqual(event.session_index, 1);
    assert.strictEqual(event.mode_session, 'MULTI');
  });

  await record('03 — modèle générique : AUTO multisession agrège sans scope_cycles', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'AUTO', 'VL');
    const ctx = await createExerciseWithSessions(repo, {
      exerciceId: 'auto-exercice-2026',
      exerciceKey: 'auto-vl-2026',
      domaine: 'AUTO',
      code: 'AUTO-VL-2026',
      libelle: 'Exercice conduite VL — 2026',
      sessionLibelle: 'Exercice conduite VL',
      codeCours: 'AUTO.VL',
      count: 3,
      dates: ['2026-02-01', '2026-05-01', '2026-09-01'],
      prefix: 'auto-session',
      cible
    });
    const people = await setupPeople(repo, ctx.events.map((e) => e.evenement_id), 4, cible);
    await save(service, repo, 'auto-session-1', [part(people[0], 'PRESENT')]);
    await save(service, repo, 'auto-session-2', [part(people[0], 'PRESENT'), part(people[1], 'PRESENT')]);
    const fiche = await service.lireEvenement('auto-session-1');
    assert.strictEqual(fiche.prExerciseParticipation.isMultiSession, true);
    assert.deepStrictEqual(fiche.prExerciseParticipation.reportingScope.eventIds, ['auto-session-1', 'auto-session-2', 'auto-session-3']);
    assert.strictEqual(fiche.prExerciseParticipation.coverage.covered, 2);
    assert.strictEqual(fiche.prExerciseParticipation.coverage.unfilled, 2);
  });

  await record('04 — PR-ABC 2026 réel : 3 dates, même exercice, cycle_id distincts, clôture autorisée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'PR', 'GEN');
    const ctx = await createExerciseWithSessions(repo, {
      exerciceId: 'pr-abc-refresh-2026',
      exerciceKey: 'scope-pr-abc-refresh-2026',
      domaine: 'PR',
      specialisation: 'ABC',
      code: 'PR-ABC-REFRESH-2026',
      libelle: 'Exercice PR-ABC | Refresh — 2026',
      sessionLibelle: 'Exercice PR-ABC | Refresh',
      codeCours: '0164F7PR',
      count: 3,
      dates: ['2026-04-21', '2026-06-10', '2026-10-06'],
      prefix: 'pr-abc-session',
      cible
    });
    await repo.insertCycle({ cycle_id: 'cycle-1', cycle_key: 'cycle-1', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle 1' });
    await repo.insertCycle({ cycle_id: 'cycle-2', cycle_key: 'cycle-2', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle 2' });
    await repo.insertCycle({ cycle_id: 'cycle-3', cycle_key: 'cycle-3', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle 3' });
    await repo.updateEventIfVersion(ctx.events[0].evenement_id, ctx.events[0].version, { cycle_id: 'cycle-1' });
    await repo.updateEventIfVersion(ctx.events[1].evenement_id, ctx.events[1].version, { cycle_id: 'cycle-2' });
    await repo.updateEventIfVersion(ctx.events[2].evenement_id, ctx.events[2].version, { cycle_id: 'cycle-3' });
    const people = await setupPeople(repo, ctx.events.map((e) => e.evenement_id), 18, cible);
    const saved = await save(service, repo, 'pr-abc-session-2', [
      ...people.slice(0, 5).map((person) => part(person, 'PRESENT')),
      part(people[5], 'DISPENSE', { motif_absence: 'FORMATEUR_PR' })
    ]);
    const fiche = await service.lireEvenement('pr-abc-session-2');
    assert.strictEqual(fiche.prExerciseParticipation.isMultiSession, true);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.population, 18);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.presents, 5);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.dispenses, 1);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.open, 12);
    const closed = await service.cloturer('pr-abc-session-2', { baseVersion: saved.version }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    const remaining = await Promise.all(people.slice(6).map((person) => repo.getParticipation('pr-abc-session-2', person.personne_id)));
    assert.strictEqual(remaining.filter((row) => row.statut === 'NON_RENSEIGNE').length, 12);
    assert.strictEqual(remaining.filter((row) => String(row.statut || '').startsWith('ABSENT')).length, 0);
  });

  await record('05 — mono-session conserve le SAFE-CLOSE strict', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'PR', 'GEN');
    const created = await repo.insertEvenement({
      evenement_id: 'single-session',
      domaine_code: 'PR',
      sous_domaine_code: 'PR',
      date: '2026-06-10',
      libelle: 'Exercice PR-ABC mono',
      code_cours: 'PR.ABC.SINGLE',
      cible_ids: [cible.cible_id]
    });
    await repo.updateEventIfVersion(created.evenement_id, created.version, { population_figee: true });
    const people = await setupPeople(repo, ['single-session'], 3, cible);
    const saved = await save(service, repo, 'single-session', [part(people[0], 'PRESENT'), part(people[1], 'PRESENT')]);
    await expectStatus(422, () => service.cloturer('single-session', { baseVersion: saved.version }, ACTOR));
  });

  await record('06 — réduction du nombre de sessions bloquée si la session retirée contient des données', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'AUTO', 'VL');
    const ctx = await createExerciseWithSessions(repo, {
      exerciceId: 'auto-reduction-2026',
      exerciceKey: 'auto-reduction-2026',
      domaine: 'AUTO',
      code: 'AUTO-REDUCE-2026',
      libelle: 'Réduction sessions — 2026',
      sessionLibelle: 'Réduction sessions',
      codeCours: 'AUTO.REDUCE',
      count: 4,
      dates: ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'],
      prefix: 'reduce-session',
      cible
    });
    await setupPeople(repo, ['reduce-session-4'], 1, cible);
    const preview = await service.previewModifierEvenement('reduce-session-1', { nbSessions: 3 });
    assert.strictEqual(preview.sessionImpact.blocked, true);
    const err = await expectStatus(409, () => service.patchEvenement('reduce-session-1', {
      baseVersion: ctx.events[0].version,
      nbSessions: 3
    }, ACTOR));
    assert.strictEqual(err.error, 'reduction_sessions_protegee');
  });

  await record('07 — import explicite SESSION/NB_SESSIONS persiste un exercice en commit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'AUTO', 'VL');
    const csv = nativeCsv([
      '2026-02-01;AUTO;;VL;Exercice conduite VL;NOMINATIF;AUTO-VL-2026;1;3',
      '2026-05-01;AUTO;;VL;Exercice conduite VL;NOMINATIF;AUTO-VL-2026;2;3'
    ]);
    const preview = await service.previewImportEvenements({ csvText: csv });
    assert.strictEqual(preview.summary.exerciseGroups, 1);
    const result = await service.commitImportEvenements({ csvText: csv, previewToken: preview.previewToken }, ACTOR);
    assert.strictEqual(result.attachedExerciseSessions.length, 2);
    const first = await repo.getEvent(result.created[0].evenementId);
    const second = await repo.getEvent(result.created[1].evenementId);
    assert.ok(first.exercice_id);
    assert.strictEqual(first.exercice_id, second.exercice_id);
    assert.strictEqual(first.session_index, 1);
    assert.strictEqual(second.session_index, 2);
    assert.ok(cible);
  });

  await record('08 — import sans colonnes explicites ne redétecte pas en persistance', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const csv = nativeCsv([
      '2026-02-01;AUTO;;VL;Exercice conduite VL;NOMINATIF;;;',
      '2026-05-01;AUTO;;VL;Exercice conduite VL;NOMINATIF;;;'
    ]);
    const preview = await service.previewImportEvenements({ csvText: csv });
    assert.strictEqual(preview.detectedExerciseProposals.length, 1);
    assert.strictEqual(preview.detectedExerciseProposals[0].persisted, false);
    assert.strictEqual(preview.summary.exerciseGroups, 0);
    const result = await service.commitImportEvenements({ csvText: csv, previewToken: preview.previewToken }, ACTOR);
    assert.strictEqual(result.attachedExerciseSessions.length, 0);
    const first = await repo.getEvent(result.created[0].evenementId);
    assert.strictEqual(first.exercice_id, null);
  });

  await record('09 — comptages historiques inchangés après rattachement exercice', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await target(repo, 'PR', 'GEN');
    const ctx = await createExerciseWithSessions(repo, {
      exerciceId: 'pr-counts-2026',
      exerciceKey: 'pr-counts-2026',
      domaine: 'PR',
      code: 'PR-COUNTS-2026',
      libelle: 'Comptages — 2026',
      sessionLibelle: 'Comptages',
      codeCours: 'PR.COUNTS',
      count: 2,
      dates: ['2026-02-01', '2026-05-01'],
      prefix: 'count-session',
      cible
    });
    const people = await setupPeople(repo, ctx.events.map((e) => e.evenement_id), 6, cible);
    await save(service, repo, 'count-session-1', [part(people[0], 'PRESENT'), part(people[1], 'ABSENT_EXCUSE', { motif_absence: 'MALADIE' })]);
    const before = (await repo.listParticipations('count-session-1')).map((row) => row.statut).sort();
    await repo.updateEventIfVersion('count-session-1', await version(repo, 'count-session-1'), { session_label: 'Session 1 confirmée' });
    const after = (await repo.listParticipations('count-session-1')).map((row) => row.statut).sort();
    assert.deepStrictEqual(after, before);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.error(`NOK ${row.name}`);
      console.error(row.proof);
    }
  });
  if(failed.length){
    process.exitCode = 1;
  } else {
    console.log('SCOPE-GENERIC-EXERCISE-SESSIONS-1: PASS');
  }
})();
