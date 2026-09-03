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
    cycle_id: 'cycle-pr-fix-3',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: '2026-09-01',
    libelle: `Exercice PR 1.${section}`,
    code_cours: `PAPR.PR1.${section}`,
    pr_exercise_group_key: 'cycle-pr-fix-3:PR:1',
    pr_session_key: `cycle-pr-fix-3:PR:1.${section}`,
    population_figee: true
  };
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-fix-3',
    cycle_key: 'PAPR-FIX-3',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR FIX-3'
  });
  const events = [];
  for(let i = 1; i <= 3; i += 1){
    const created = await repo.insertEvenement(event(`pr${i}`, i));
    events.push(await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(const [personne_id, nip, nom] of [['a', '90001', 'Alpha'], ['b', '90002', 'Bravo'], ['c', '90003', 'Charlie']]){
    const person = await repo.insertPersonne({ personne_id, nip, nom, prenom: 'PAPR', grade: 'Sdt', skipPeriodes: true });
    people.push(person);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-fix-3', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  }
  const aux = await repo.insertPersonne({ personne_id: 'aux', nip: '99999', nom: 'Auxiliaire', prenom: 'Civil', grade: 'Civil', skipPeriodes: true });
  for(const ev of events){
    for(const p of people){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  return { repo, service, events, people, aux };
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

async function save(ctx, eventId, rows){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations: rows.map((row) => ({ role: 'PARTICIPANT', ...row }))
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

function extractFunction(source, name){
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} introuvable`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for(let i = brace; i < source.length; i += 1){
    if(source[i] === '{') depth += 1;
    if(source[i] === '}') depth -= 1;
    if(depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} incomplet`);
}

(async () => {
  await record('A — Formateur PAPR reste participant présent et compte une fois', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    await save(ctx, 'pr1', [{ personneId: 'b', statut: 'PRESENT' }]);
    const detail = await ctx.service.lireEvenement('pr1');
    assert.ok(detail.encadrement.some((p) => p.personne_id === 'a' && p.role === 'FORMATEUR'));
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 2);
    const row = await ctx.repo.getParticipation('pr1', 'a');
    assert.strictEqual(row.role, 'FORMATEUR');
    assert.strictEqual(row.statut, 'PRESENT');
  });

  await record('B — Surveillant PAPR seul reste hors KPI et ne verrouille pas un autre exercice', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'SURVEILLANT');
    let detail = await ctx.service.lireEvenement('pr2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 0);
    assert.ok(!detail.attendus.find((row) => row.personne_id === 'a').alreadyCountedInSession);
    await save(ctx, 'pr2', [{ personneId: 'a', statut: 'PRESENT' }]);
    detail = await ctx.service.lireEvenement('pr2');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
    assert.strictEqual((await ctx.repo.getParticipation('pr1', 'a')).role, 'SURVEILLANT');
    assert.strictEqual((await ctx.repo.getParticipation('pr2', 'a')).role, 'PARTICIPANT');
  });

  await record('C — Formateur PAPR n’empêche plus une saisie participant ailleurs', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    await save(ctx, 'pr2', [{ personneId: 'a', statut: 'PRESENT' }]);
    assert.strictEqual((await ctx.repo.getParticipation('pr2', 'a')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr1', 'a')).role, 'FORMATEUR');
  });

  await record('D — Auxiliaire ne contribue pas aux KPI PAPR et disparaît au reset', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'aux', 'AUXILIAIRE');
    let detail = await ctx.service.lireEvenement('pr1');
    assert.ok(detail.encadrement.some((p) => p.personne_id === 'aux' && p.role === 'AUXILIAIRE'));
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 0);
    await ctx.service.resetParticipations('pr1', { baseVersion: await version(ctx.repo, 'pr1') });
    detail = await ctx.service.lireEvenement('pr1');
    assert.strictEqual(detail.encadrement.length, 0);
    assert.strictEqual(await ctx.repo.getParticipation('pr1', 'aux'), null);
  });

  await record('E — Reset supprime Formateur et Surveillant locaux sans toucher population ni autres sessions', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    await addEnc(ctx, 'pr1', 'b', 'SURVEILLANT');
    await save(ctx, 'pr2', [{ personneId: 'c', statut: 'PRESENT' }]);
    await ctx.service.resetParticipations('pr1', { baseVersion: await version(ctx.repo, 'pr1') });
    const detail = await ctx.service.lireEvenement('pr1');
    assert.strictEqual(detail.encadrement.length, 0);
    assert.strictEqual(detail.attendus.filter((row) => row.inclus !== false).length, 3);
    for(const id of ['a', 'b']){
      const row = await ctx.repo.getParticipation('pr1', id);
      assert.strictEqual(row.role, 'PARTICIPANT');
      assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    }
    assert.strictEqual((await ctx.repo.getParticipation('pr2', 'c')).statut, 'PRESENT');
  });

  await record('F — Retrait Formateur automatique et Surveillant seul réouvre la participation PAPR', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr1', 'a', 'FORMATEUR');
    await addEnc(ctx, 'pr1', 'b', 'SURVEILLANT');
    await removeEnc(ctx, 'pr1', 'a');
    await removeEnc(ctx, 'pr1', 'b');
    for(const id of ['a', 'b']){
      const row = await ctx.repo.getParticipation('pr1', id);
      assert.strictEqual(row.role, 'PARTICIPANT');
      assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    }
    const detail = await ctx.service.lireEvenement('pr1');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 0);
  });

  await record('G — Payload frontend n’émet aucun PARTICIPANT pour encadrants courants', () => {
    const logic = require('../assets/js/scope-ui-logic.js');
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    assert.ok(ui.includes('L.buildPresenceSavePayload'));
    const rows = [
      { personneId: 'a', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'FORMATEUR' },
      { personneId: 'b', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'SURVEILLANT' },
      { personneId: 'b2', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'SURVEILLANT', presenceEdited: true },
      { personneId: 'c', inclus: true, alreadyCountedInSession: false, statut: 'PRESENT', role: 'PARTICIPANT' }
    ];
    const before = logic.buildPresenceSavePayload(rows, new Set()).map((row) => [row.personneId, row.role]);
    const after = logic.buildPresenceSavePayload(rows, new Set(['a', 'b'])).map((row) => [row.personneId, row.role]);
    assert.deepStrictEqual(before, [['a', 'FORMATEUR'], ['b', 'SURVEILLANT'], ['b2', 'SURVEILLANT'], ['c', 'PARTICIPANT']]);
    assert.deepStrictEqual(after, [['b2', 'SURVEILLANT'], ['c', 'PARTICIPANT']]);
  });

  await record('H — UX Motif hauteur alignée et encart visuel compact', () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    const css = fs.readFileSync('assets/css/scope.css', 'utf8');
    assert.ok(ui.includes('data-motif') || ui.includes('data-motif-edit'));
    assert.ok(css.includes('.scope-motif-select') || css.includes('.scope-motif-chip'));
    assert.ok(css.includes('min-height: 28px'));
    assert.ok(css.includes('button[data-status="PRESENT"]'));
    assert.ok(css.includes('button[data-status="ABSENT_NON_EXCUSE"]'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE PAPR encadrement métier FIX-3 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE PAPR encadrement métier FIX-3 tests: ${results.length}/${results.length} PASS`);
})();
