#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');

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
    cycle_id: 'cycle-pr-fix-4',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: '2026-09-01',
    libelle: `Exercice PR 1.${section}`,
    code_cours: `PAPR.PR1.${section}`,
    pr_exercise_group_key: 'cycle-pr-fix-4:PR:1',
    pr_session_key: `cycle-pr-fix-4:PR:1.${section}`,
    population_figee: true
  };
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-fix-4',
    cycle_key: 'PAPR-FIX-4',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR FIX-4'
  });
  for(let i = 1; i <= 4; i += 1){
    const created = await repo.insertEvenement(event(`pr${i}`, i));
    await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  }
  const people = [];
  for(const [personne_id, nip, nom] of [['a', '91001', 'Alpha'], ['b', '91002', 'Bravo'], ['c', '91003', 'Charlie']]){
    const person = await repo.insertPersonne({ personne_id, nip, nom, prenom: 'PAPR', grade: 'Sdt', skipPeriodes: true });
    people.push(person);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-fix-4', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  }
  const aux = await repo.insertPersonne({ personne_id: 'aux', nip: '91999', nom: 'Auxiliaire', prenom: 'Civil', grade: 'Civil', skipPeriodes: true });
  for(let i = 1; i <= 4; i += 1){
    for(const p of people){
      await repo.upsertAttendu({ evenement_id: `pr${i}`, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: `pr${i}`, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  return { repo, service, people, aux };
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function addEnc(ctx, eventId, personneId, role){
  return ctx.service.ajouterEncadrement(eventId, { baseVersion: await version(ctx.repo, eventId), personneId, role });
}

async function removeEnc(ctx, eventId, personneId){
  return ctx.service.retirerEncadrement(eventId, { baseVersion: await version(ctx.repo, eventId), personneId });
}

async function save(ctx, eventId, personneId, statut = 'PRESENT'){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations: [{ personneId, statut, role: 'PARTICIPANT' }]
  });
}

function attendu(detail, personneId){
  return detail.attendus.find((row) => row.personne_id === personneId);
}

(async () => {
  await record('A — Formateur première fois en 1.1 verrouille seulement 1.2+', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr2 = await ctx.service.lireEvenement('pr2');
    assert.strictEqual(pr1.prExerciseParticipation.kpis.presents, 1);
    assert.ok(!attendu(pr1, 'a').alreadyCountedInSession);
    assert.strictEqual(attendu(pr2, 'a').alreadyCountedInSession, true);
  });

  await record('B — Formateur première fois en 1.2 garde 1.2 source et verrouille les autres sessions', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr2', 'a', 'FORMATEUR');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr2 = await ctx.service.lireEvenement('pr2');
    const pr3 = await ctx.service.lireEvenement('pr3');
    assert.strictEqual(pr1.prExerciseParticipation.kpis.presents, 1);
    assert.strictEqual(attendu(pr1, 'a').alreadyCountedInSession, true);
    assert.strictEqual(attendu(pr1, 'a').sessionReferenceRelation, 'BEFORE_REFERENCE');
    assert.strictEqual(pr2.prExerciseParticipation.kpis.presents, 1);
    assert.ok(!attendu(pr2, 'a').alreadyCountedInSession);
    assert.strictEqual(attendu(pr3, 'a').alreadyCountedInSession, true);
    assert.strictEqual(attendu(pr3, 'a').sessionReferenceRelation, 'AFTER_REFERENCE');
  });

  await record('C — Surveillant seul encadre sans KPI général ni verrou bleu', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'SURVEILLANT');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr2 = await ctx.service.lireEvenement('pr2');
    assert.strictEqual(pr1.encadrement.filter((row) => row.role === 'SURVEILLANT').length, 1);
    assert.strictEqual(pr1.prExerciseParticipation.kpis.presents, 0);
    assert.strictEqual(pr1.prExerciseParticipation.kpis.open, 3);
    assert.ok(!attendu(pr2, 'a').alreadyCountedInSession);
  });

  await record('D — Surveillant puis présence normale déclenche anti-double seulement après', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'SURVEILLANT');
    await save(ctx, 'pr2', 'a');
    const pr2 = await ctx.service.lireEvenement('pr2');
    const pr3 = await ctx.service.lireEvenement('pr3');
    assert.strictEqual(pr2.prExerciseParticipation.kpis.presents, 1);
    assert.ok(!attendu(pr2, 'a').alreadyCountedInSession);
    assert.strictEqual(attendu(pr3, 'a').alreadyCountedInSession, true);
  });

  await record('E — Auxiliaire jamais compté ni verrouillant', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'aux', 'AUXILIAIRE');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr2 = await ctx.service.lireEvenement('pr2');
    assert.strictEqual(pr1.encadrement.filter((row) => row.role === 'AUXILIAIRE').length, 1);
    assert.strictEqual(pr1.prExerciseParticipation.kpis.presents, 0);
    assert.ok(!attendu(pr2, 'aux'));
  });

  await record('F — Retrait Formateur automatique supprime la présence automatique', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    await removeEnc(ctx, 'pr1', 'a');
    const row = await ctx.repo.getParticipation('pr1', 'a');
    const pr2 = await ctx.service.lireEvenement('pr2');
    assert.strictEqual(row.role, 'PARTICIPANT');
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    assert.strictEqual(pr2.prExerciseParticipation.kpis.presents, 0);
    assert.ok(!attendu(pr2, 'a').alreadyCountedInSession);
  });

  await record('G — Retrait Formateur avec vraie présence conserve la saisie', async () => {
    const ctx = await setup();
    await save(ctx, 'pr1', 'a');
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    await removeEnc(ctx, 'pr1', 'a');
    const row = await ctx.repo.getParticipation('pr1', 'a');
    assert.strictEqual(row.role, 'PARTICIPANT');
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual((await ctx.service.lireEvenement('pr2')).prExerciseParticipation.kpis.presents, 1);
  });

  await record('H — Reset conserve le PASS métier courant', async () => {
    const ctx = await setup();
    await save(ctx, 'pr1', 'a');
    await addEnc(ctx, 'pr1', 'b', 'FORMATEUR');
    await addEnc(ctx, 'pr1', 'aux', 'AUXILIAIRE');
    await ctx.service.resetParticipations('pr1', { baseVersion: await version(ctx.repo, 'pr1') });
    const pr1 = await ctx.service.lireEvenement('pr1');
    assert.strictEqual(pr1.encadrement.length, 0);
    assert.strictEqual(pr1.prExerciseParticipation.kpis.presents, 0);
    assert.strictEqual(pr1.attendus.filter((row) => row.inclus !== false).length, 3);
  });

  await record('I — Motif exclusif badge cliquable puis select', () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    const css = fs.readFileSync('assets/css/scope.css', 'utf8');
    assert.ok(ui.includes('const motifSelect = !selectedMotif || row.editMotif'));
    assert.ok(ui.includes('data-motif-edit='));
    assert.ok(ui.includes('row.editMotif = true'));
    assert.ok(ui.includes('row.editMotif = false'));
    assert.ok(!ui.includes('</select>${selectedMotif ? `<span class="scope-motif-selected"'));
    assert.ok(css.includes('height: 40px'));
    assert.ok(css.includes('.scope-motif-selected:hover'));
  });

  await record('J — Couleurs boutons présence par statut et disabled lisible', () => {
    const css = fs.readFileSync('assets/css/scope.css', 'utf8');
    assert.ok(css.includes('button[data-status="PRESENT"]'));
    assert.ok(css.includes('background: #eef6ff'));
    assert.ok(css.includes('button[data-status="ABSENT_EXCUSE"]'));
    assert.ok(css.includes('button[data-status="DISPENSE"]'));
    assert.ok(css.includes('button[data-status="ABSENT_NON_EXCUSE"][aria-pressed="true"]'));
    assert.ok(css.includes('background: #111827'));
    assert.ok(css.includes('button[aria-disabled="true"]'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE PAPR encadrement recipe FIX-4 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE PAPR encadrement recipe FIX-4 tests: ${results.length}/${results.length} PASS`);
})();
