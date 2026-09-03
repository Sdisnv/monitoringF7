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
    cycle_id: 'cycle-pr-fix-5',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: '2026-09-01',
    libelle: `Exercice PR 1.${section}`,
    code_cours: `PAPR.PR1.${section}`,
    pr_exercise_group_key: 'cycle-pr-fix-5:PR:1',
    pr_session_key: `cycle-pr-fix-5:PR:1.${section}`,
    population_figee: true
  };
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-fix-5',
    cycle_key: 'PAPR-FIX-5',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR FIX-5'
  });
  for(let i = 1; i <= 6; i += 1){
    const created = await repo.insertEvenement(event(`pr${i}`, i));
    await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  }
  for(const [personne_id, nip, nom, prenom] of [['a', '7647', 'Grünig', 'Thierry'], ['b', '1506', 'Cerqueira', 'Marco']]){
    await repo.insertPersonne({ personne_id, nip, nom, prenom, grade: 'Sdt', skipPeriodes: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-fix-5', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  }
  for(let i = 1; i <= 6; i += 1){
    for(const personneId of ['a', 'b']){
      await repo.upsertAttendu({ evenement_id: `pr${i}`, personne_id: personneId, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: `pr${i}`, personne_id: personneId, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  return { repo, service };
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function save(ctx, eventId, personneId, statut = 'PRESENT'){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations: [{ personneId, statut, role: 'PARTICIPANT' }]
  });
}

async function addEnc(ctx, eventId, personneId, role){
  return ctx.service.ajouterEncadrement(eventId, { baseVersion: await version(ctx.repo, eventId), personneId, role });
}

async function removeEnc(ctx, eventId, personneId){
  return ctx.service.retirerEncadrement(eventId, { baseVersion: await version(ctx.repo, eventId), personneId });
}

function attendu(detail, personneId){
  return detail.attendus.find((row) => row.personne_id === personneId);
}

(async () => {
  await record('1 — Présent source 1.2: 1.1 futur, 1.2 modifiable, 1.3 passé', async () => {
    const ctx = await setup();
    await save(ctx, 'pr2', 'a');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr2 = await ctx.service.lireEvenement('pr2');
    const pr3 = await ctx.service.lireEvenement('pr3');
    assert.strictEqual(attendu(pr1, 'a').alreadyCountedInSession, true);
    assert.strictEqual(attendu(pr1, 'a').sessionReferenceLabel, '1.2');
    assert.strictEqual(attendu(pr1, 'a').sessionReferenceRelation, 'BEFORE_REFERENCE');
    assert.ok(!attendu(pr2, 'a').alreadyCountedInSession);
    assert.strictEqual(attendu(pr3, 'a').alreadyCountedInSession, true);
    assert.strictEqual(attendu(pr3, 'a').sessionReferenceLabel, '1.2');
    assert.strictEqual(attendu(pr3, 'a').sessionReferenceQuality, 'PAPR');
    assert.strictEqual(attendu(pr3, 'a').sessionReferenceRelation, 'AFTER_REFERENCE');
  });

  await record('2 — Présent source 1.4: 1.1-1.3 futur, 1.5+ passé', async () => {
    const ctx = await setup();
    await save(ctx, 'pr4', 'a');
    for(const id of ['pr1', 'pr2', 'pr3']){
      const detail = await ctx.service.lireEvenement(id);
      assert.strictEqual(attendu(detail, 'a').sessionReferenceLabel, '1.4');
      assert.strictEqual(attendu(detail, 'a').sessionReferenceRelation, 'BEFORE_REFERENCE');
    }
    assert.ok(!attendu(await ctx.service.lireEvenement('pr4'), 'a').alreadyCountedInSession);
    for(const id of ['pr5', 'pr6']){
      const detail = await ctx.service.lireEvenement(id);
      assert.strictEqual(attendu(detail, 'a').sessionReferenceLabel, '1.4');
      assert.strictEqual(attendu(detail, 'a').sessionReferenceRelation, 'AFTER_REFERENCE');
    }
  });

  await record('3 — Formateur source 1.4: qualité Formateur PR et source modifiable', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr4', 'b', 'FORMATEUR');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr4 = await ctx.service.lireEvenement('pr4');
    const pr5 = await ctx.service.lireEvenement('pr5');
    assert.strictEqual(attendu(pr1, 'b').sessionReferenceQuality, 'Formateur PR');
    assert.strictEqual(attendu(pr1, 'b').sessionReferenceRelation, 'BEFORE_REFERENCE');
    assert.ok(!attendu(pr4, 'b').alreadyCountedInSession);
    assert.strictEqual(attendu(pr5, 'b').sessionReferenceQuality, 'Formateur PR');
    assert.strictEqual(attendu(pr5, 'b').sessionReferenceRelation, 'AFTER_REFERENCE');
  });

  await record('4 — Surveillant seul ne crée aucune référence', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'SURVEILLANT');
    const pr6 = await ctx.service.lireEvenement('pr6');
    assert.ok(!attendu(pr6, 'a').alreadyCountedInSession);
    assert.strictEqual(pr6.prExerciseParticipation.kpis.presents, 0);
  });

  await record('5 — Surveillant puis PRESENT 1.2 devient référence PAPR', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'SURVEILLANT');
    await save(ctx, 'pr2', 'a');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr3 = await ctx.service.lireEvenement('pr3');
    assert.strictEqual(attendu(pr1, 'a').sessionReferenceLabel, '1.2');
    assert.strictEqual(attendu(pr1, 'a').sessionReferenceQuality, 'PAPR');
    assert.strictEqual(attendu(pr3, 'a').sessionReferenceLabel, '1.2');
  });

  await record('6 — Suppression de la présence source déverrouille les autres sessions', async () => {
    const ctx = await setup();
    await save(ctx, 'pr2', 'a');
    await save(ctx, 'pr2', 'a', 'NON_RENSEIGNE');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr3 = await ctx.service.lireEvenement('pr3');
    assert.ok(!attendu(pr1, 'a').alreadyCountedInSession);
    assert.ok(!attendu(pr3, 'a').alreadyCountedInSession);
    assert.strictEqual(pr3.prExerciseParticipation.kpis.presents, 0);
  });

  await record('7 — Retrait Formateur source déverrouille si aucune autre contribution', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr4', 'b', 'FORMATEUR');
    await removeEnc(ctx, 'pr4', 'b');
    const pr1 = await ctx.service.lireEvenement('pr1');
    const pr5 = await ctx.service.lireEvenement('pr5');
    assert.ok(!attendu(pr1, 'b').alreadyCountedInSession);
    assert.ok(!attendu(pr5, 'b').alreadyCountedInSession);
  });

  await record('8 — Tooltip chronologique frontend et couleur Excusé distincte', () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    const css = fs.readFileSync('assets/css/scope.css', 'utf8');
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(ui.includes('scope-row-session-counted'));
    assert.ok(css.includes('button[data-status="ABSENT_EXCUSE"]'));
    assert.ok(css.includes('button[data-status="DISPENSE"]'));
    assert.ok(css.includes('background: #fff8db'));
    assert.ok(css.includes('button[data-status="ABSENT_NON_EXCUSE"]'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE PAPR participation origin UX FIX-5 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE PAPR participation origin UX FIX-5 tests: ${results.length}/${results.length} PASS`);
})();
