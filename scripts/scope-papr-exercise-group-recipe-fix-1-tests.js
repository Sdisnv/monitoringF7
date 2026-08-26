#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const {
  computePrExerciseParticipationState,
  prExerciseGroupKey
} = require('../netlify/functions/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function event(id, section){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-2026',
    domaine_code: 'PR',
    date: '2026-09-01',
    libelle: `Exercice PR 1.${section} | Base`,
    code_cours: `PAPR.PR1.${section}`,
    pr_exercise_group_key: 'cycle-pr-2026:PR:1',
    pr_session_key: `cycle-pr-2026:PR:1.${section}`
  };
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-2026',
    cycle_key: 'PAPR-2026',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR 2026'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    const ev = await repo.insertEvenement(event(`s${i}`, i));
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const persons = [];
  for(let i = 1; i <= 77; i += 1){
    const p = await repo.insertPersonne({
      personne_id: `p${i}`,
      nip: i === 1 ? '51740' : (i === 2 ? '1506' : String(60000 + i)),
      nom: i === 1 ? 'Bassin' : (i === 2 ? 'Cerqueira' : `Nom${i}`),
      prenom: i === 1 ? 'Michaël' : (i === 2 ? 'Marco' : `Prenom${i}`),
      grade: 'Sdt',
      skipPeriodes: true
    });
    persons.push(p);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-2026', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
  }
  const external = await repo.insertPersonne({ personne_id: 'ext1', nip: '99001', nom: 'Externe', prenom: 'Alex', grade: 'Cap', skipPeriodes: true });
  for(const ev of events){
    for(const p of persons){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  return { repo, service, events, persons, external };
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function savePresence(ctx, eventId, personneId, statut = 'PRESENT'){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations: [{ personneId, statut, role: 'PARTICIPANT' }]
  });
}

async function addEnc(ctx, eventId, personneId, role){
  return ctx.service.ajouterEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId,
    role
  });
}

async function removeEnc(ctx, eventId, personneId){
  return ctx.service.retirerEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId
  });
}

async function expectHttpError(fn, status, error){
  try{
    await fn();
    assert.fail(`Erreur ${status}/${error} attendue`);
  }catch(err){
    assert.strictEqual(err.status, status);
    assert.strictEqual(err.error, error);
  }
}

(async () => {
  await record('A — regroupement 1.1 à 1.6 dans Exercice PR 1', async () => {
    const ctx = await setup();
    assert.deepStrictEqual(ctx.events.map(prExerciseGroupKey), Array(6).fill('cycle-pr-2026:PR:1'));
    const state = computePrExerciseParticipationState({
      cycle: { cycle_id: 'cycle-pr-2026', domaine_code: 'PR' },
      evenements: ctx.events,
      cyclePersonnes: ctx.persons.map((p) => ({ cycle_id: 'cycle-pr-2026', personne_id: p.personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' })),
      attendus: ctx.events.flatMap((ev) => ctx.persons.map((p) => ({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true }))),
      participations: [],
      personnes: ctx.persons,
      currentEventId: 's2'
    });
    assert.strictEqual(state.eventIds.length, 6);
  });

  await record('B — présent en 1.1 verrouille 1.2 et KPI 1/76', async () => {
    const ctx = await setup();
    await savePresence(ctx, 's1', 'p1');
    const detail = await ctx.service.lireEvenement('s2');
    const row = detail.attendus.find((a) => a.personne_id === 'p1');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
    assert.strictEqual(detail.prExerciseParticipation.kpis.open, 76);
    assert.strictEqual(row.alreadyCountedInSession, true);
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(ui.includes('a déjà participé à l’exercice en qualité de PAPR.'));
    assert.ok(ui.includes('disabled aria-disabled="true"'));
    assert.ok(css.includes('scope-row-session-counted'));
  });

  await record('C — double API participant refusé en 409', async () => {
    const ctx = await setup();
    await savePresence(ctx, 's1', 'p1');
    await expectHttpError(() => savePresence(ctx, 's2', 'p1'), 409, 'pr_exercise_participation_deja_comptee');
    const parts = await ctx.repo.listParticipationsForEvents(['s1', 's2']);
    assert.strictEqual(parts.filter((p) => p.personne_id === 'p1' && p.statut === 'PRESENT' && p.role === 'PARTICIPANT').length, 1);
  });

  await record('D — 12 présents en 1.1 donnent 12/65 dans 1.2 à 1.6', async () => {
    const ctx = await setup();
    for(let i = 1; i <= 12; i += 1) await savePresence(ctx, 's1', `p${i}`);
    for(let i = 2; i <= 6; i += 1){
      const detail = await ctx.service.lireEvenement(`s${i}`);
      assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 12);
      assert.strictEqual(detail.prExerciseParticipation.kpis.open, 65);
    }
  });

  await record('E — Formateur persiste après Enregistrer', async () => {
    const ctx = await setup();
    await addEnc(ctx, 's1', 'p2', 'FORMATEUR');
    await savePresence(ctx, 's1', 'p1');
    const detail = await ctx.service.lireEvenement('s1');
    assert.ok(detail.encadrement.some((p) => p.personne_id === 'p2' && p.role === 'FORMATEUR'));
    assert.strictEqual(detail.encadrement.filter((p) => p.role === 'FORMATEUR').length, 1);
  });

  await record('F — Surveillant persiste après Enregistrer', async () => {
    const ctx = await setup();
    await addEnc(ctx, 's1', 'p2', 'SURVEILLANT');
    await savePresence(ctx, 's1', 'p1');
    const detail = await ctx.service.lireEvenement('s1');
    assert.ok(detail.encadrement.some((p) => p.personne_id === 'p2' && p.role === 'SURVEILLANT'));
    assert.strictEqual(detail.encadrement.filter((p) => p.role === 'SURVEILLANT').length, 1);
  });

  await record('G — Présent puis Formateur = 1 PAPR global + rôle conservé', async () => {
    const ctx = await setup();
    await savePresence(ctx, 's1', 'p1');
    await addEnc(ctx, 's2', 'p1', 'FORMATEUR');
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
    assert.ok(detail.encadrement.some((p) => p.personne_id === 'p1' && p.role === 'FORMATEUR'));
  });

  await record('H — Formateur d’abord bloque participant ailleurs mais reste encadrant possible', async () => {
    const ctx = await setup();
    await addEnc(ctx, 's1', 'p1', 'FORMATEUR');
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
    assert.strictEqual(detail.attendus.find((a) => a.personne_id === 'p1').alreadyCountedInSession, true);
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(!ui.includes("!used.has(String(p.personne_id)) && !expected.has(String(p.personne_id))"));
  });

  await record('I — retrait Formateur automatique réouvre la participation PAPR', async () => {
    const ctx = await setup();
    await addEnc(ctx, 's1', 'p1', 'FORMATEUR');
    await removeEnc(ctx, 's1', 'p1');
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 0);
    assert.strictEqual(detail.prExerciseParticipation.kpis.open, 77);
    assert.ok(!detail.attendus.find((a) => a.personne_id === 'p1').alreadyCountedInSession);
    const p = await ctx.repo.getParticipation('s1', 'p1');
    assert.strictEqual(p.role, 'PARTICIPANT');
    assert.strictEqual(p.statut, 'NON_RENSEIGNE');
  });

  await record('J — retrait Formateur avec présence antérieure garde le verrou global', async () => {
    const ctx = await setup();
    await savePresence(ctx, 's1', 'p1');
    await addEnc(ctx, 's2', 'p1', 'FORMATEUR');
    await removeEnc(ctx, 's2', 'p1');
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
    assert.strictEqual(detail.attendus.find((a) => a.personne_id === 'p1').alreadyCountedInSession, true);
  });

  await record('K — Auxiliaire ne contribue pas au global PAPR', async () => {
    const ctx = await setup();
    await addEnc(ctx, 's1', 'p1', 'AUXILIAIRE');
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 0);
    assert.strictEqual(detail.prExerciseParticipation.kpis.open, 77);
  });

  await record('L — Formateur externe visible mais hors contribution PAPR', async () => {
    const ctx = await setup();
    await addEnc(ctx, 's1', 'ext1', 'FORMATEUR');
    const detail = await ctx.service.lireEvenement('s1');
    assert.ok(detail.encadrement.some((p) => p.personne_id === 'ext1' && p.role === 'FORMATEUR'));
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 0);
  });

  await record('M — Tout présent ne crée pas de deuxième contribution', async () => {
    const ctx = await setup();
    await savePresence(ctx, 's1', 'p1');
    await ctx.service.enregistrerParticipations('s2', {
      baseVersion: await version(ctx.repo, 's2'),
      participations: ctx.persons.slice(1).map((p) => ({ personneId: p.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }))
    });
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 77);
    const parts = await ctx.repo.listParticipationsForEvents(['s1', 's2']);
    assert.strictEqual(parts.filter((p) => p.personne_id === 'p1' && p.statut === 'PRESENT').length, 1);
  });

  await record('N — Réinitialiser une session supprime encadrement local et préserve autres sessions', async () => {
    const ctx = await setup();
    await savePresence(ctx, 's1', 'p1');
    await addEnc(ctx, 's2', 'p2', 'FORMATEUR');
    await ctx.service.resetParticipations('s2', { baseVersion: await version(ctx.repo, 's2') });
    const detail = await ctx.service.lireEvenement('s2');
    assert.strictEqual(detail.encadrement.length, 0);
    assert.strictEqual((await ctx.repo.getParticipation('s2', 'p2')).role, 'PARTICIPANT');
    assert.strictEqual((await ctx.repo.getParticipation('s2', 'p2')).statut, 'NON_RENSEIGNE');
    assert.strictEqual((await ctx.repo.getParticipation('s1', 'p1')).statut, 'PRESENT');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE PAPR exercise group recipe fix tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE PAPR exercise group recipe fix tests: ${results.length}/${results.length} PASS`);
})();
