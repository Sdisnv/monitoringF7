#!/usr/bin/env node
'use strict';

/** SCOPE-PR-ROLE-REPORT-INTEGRITY-1 - surveillant residual presence + detailed report lock. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const {
  collectMultisessionReport,
  assertAllReportSessionsClosed
} = require('../netlify/lib/_scope-multisession-report');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
const reportSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-multisession-report.js'), 'utf8');
const results = [];
const ACTOR = { roles: ['sdis-admin'], sub: 'scope-pr-role-report-integrity-1', displayName: 'Testeur SCOPE' };
const CLAIMS = { roles: ['sdis-admin'], sub: 'scope-pr-role-report-integrity-1' };

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function event(id, section, patch = {}){
  return Object.assign({
    evenement_id: id,
    cycle_id: 'cycle-pr-role-report-integrity-1',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: `2026-10-0${section}`,
    libelle: `Exercice PR 7.${section}`,
    code_cours: `PAPR.PR7.${section}`,
    pr_exercise_group_key: 'cycle-pr-role-report-integrity-1:PR:7',
    pr_session_key: `cycle-pr-role-report-integrity-1:PR:7.${section}`,
    population_figee: true
  }, patch);
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function save(ctx, eventId, participations){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations
  }, ACTOR);
}

async function close(ctx, eventId){
  return ctx.service.cloturer(eventId, { baseVersion: await version(ctx.repo, eventId) }, ACTOR);
}

async function reopen(ctx, eventId){
  return ctx.service.reouvrir(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    motif: 'Controle recette'
  }, ACTOR);
}

async function addEnc(ctx, eventId, personneId, role){
  return ctx.service.ajouterEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId,
    role
  }, ACTOR);
}

async function removeEnc(ctx, eventId, personneId){
  return ctx.service.retirerEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId
  }, ACTOR);
}

async function setStatus(repo, eventId, statut){
  await repo.updateEventIfVersion(eventId, await version(repo, eventId), { statut });
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-role-report-integrity-1',
    cycle_key: 'PAPR-ROLE-REPORT',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR Role Report'
  });
  for(const section of [1, 2, 3]){
    const created = await repo.insertEvenement(event(`pr7${section}`, section));
    await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  }
  for(const [personne_id, nip, nom, prenom] of [
    ['x', '97001', 'Xavier', 'Xena'],
    ['y', '97002', 'Young', 'Yves'],
    ['z', '97003', 'Zulu', 'Zoé'],
    ['f', '97998', 'Formateur', 'Franck']
  ]){
    await repo.insertPersonne({ personne_id, nip, nom, prenom, grade: 'Sap', skipPeriodes: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-role-report-integrity-1', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
    for(const eventId of ['pr71', 'pr72', 'pr73']){
      await repo.upsertAttendu({ evenement_id: eventId, personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: eventId, personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  await repo.insertPersonne({ personne_id: 'aux', nip: '97999', nom: 'Auxiliaire', prenom: 'Alice', grade: 'Civil', skipPeriodes: true });
  return { repo, service };
}

async function setupConverted(){
  const ctx = await setup();
  await save(ctx, 'pr71', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
  await close(ctx, 'pr71');
  await reopen(ctx, 'pr71');
  await addEnc(ctx, 'pr71', 'x', 'SURVEILLANT');
  return ctx;
}

async function expectHttpError(fn, status, error){
  try{
    await fn();
    assert.fail(`Erreur ${status}/${error} attendue`);
  }catch(err){
    assert.strictEqual(err.status, status);
    assert.strictEqual(err.error, error);
    return err;
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
  await record('01 participant PRESENT persistant', async () => {
    const ctx = await setup();
    await save(ctx, 'pr71', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    const row = await ctx.repo.getParticipation('pr71', 'x');
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual(row.role, 'PARTICIPANT');
    assert.strictEqual(row.source, 'SAISIE');
  });

  await record('02 conversion PRESENT -> SURVEILLANT', async () => {
    const ctx = await setupConverted();
    const row = await ctx.repo.getParticipation('pr71', 'x');
    assert.strictEqual(row.role, 'SURVEILLANT');
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
  });

  await record('03 ancien PRESENT supprime', async () => {
    const ctx = await setupConverted();
    const row = await ctx.repo.getParticipation('pr71', 'x');
    assert.notStrictEqual(row.statut, 'PRESENT');
    assert.strictEqual(row.source, 'ENCADREMENT');
  });

  await record('04 SURVEILLANT conserve', async () => {
    const ctx = await setupConverted();
    const fiche = await ctx.service.lireEvenement('pr71');
    assert.ok(fiche.encadrement.some((row) => row.personne_id === 'x' && row.role === 'SURVEILLANT'));
  });

  await record('05 KPI local decremente Presents', async () => {
    const ctx = await setup();
    await save(ctx, 'pr71', [
      { personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' },
      { personneId: 'y', statut: 'PRESENT', role: 'PARTICIPANT' }
    ]);
    assert.strictEqual((await ctx.service.lireEvenement('pr71')).compteurs.presents, 2);
    await addEnc(ctx, 'pr71', 'x', 'SURVEILLANT');
    assert.strictEqual((await ctx.service.lireEvenement('pr71')).compteurs.presents, 1);
  });

  await record('06 vue Realise = Surveillant dans Encadrement', async () => {
    const ctx = await setupConverted();
    await close(ctx, 'pr71');
    const fiche = await ctx.service.lireEvenement('pr71');
    assert.strictEqual(fiche.evenement.statut, 'REALISE');
    assert.ok(fiche.encadrement.some((row) => row.personne_id === 'x' && row.role === 'SURVEILLANT'));
  });

  await record('07 vue Realise = personne absente des Participants comme PRESENT', async () => {
    const ctx = await setupConverted();
    await close(ctx, 'pr71');
    const fiche = await ctx.service.lireEvenement('pr71');
    const row = fiche.participations.find((p) => p.personne_id === 'x');
    assert.strictEqual(row.role, 'SURVEILLANT');
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    assert.strictEqual(fiche.compteurs.presents, 0);
  });

  await record('08 reouverture ne ressuscite pas PRESENT', async () => {
    const ctx = await setupConverted();
    await close(ctx, 'pr71');
    await reopen(ctx, 'pr71');
    const row = await ctx.repo.getParticipation('pr71', 'x');
    assert.strictEqual(row.role, 'SURVEILLANT');
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
  });

  await record('09 nouvelle cloture ne ressuscite pas PRESENT', async () => {
    const ctx = await setupConverted();
    await close(ctx, 'pr71');
    await reopen(ctx, 'pr71');
    await close(ctx, 'pr71');
    const row = await ctx.repo.getParticipation('pr71', 'x');
    assert.strictEqual(row.role, 'SURVEILLANT');
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
  });

  await record('10 Surveillant -> participant ne restaure aucun ancien statut', async () => {
    const ctx = await setupConverted();
    await removeEnc(ctx, 'pr71', 'x');
    const row = await ctx.repo.getParticipation('pr71', 'x');
    assert.strictEqual(row.role, 'PARTICIPANT');
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
  });

  await record('11 autres seances inchangees', async () => {
    const ctx = await setup();
    await save(ctx, 'pr72', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    await save(ctx, 'pr71', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    await addEnc(ctx, 'pr71', 'x', 'SURVEILLANT');
    assert.strictEqual((await ctx.repo.getParticipation('pr72', 'x')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr72', 'x')).role, 'PARTICIPANT');
  });

  await record('12 FORMATEUR inchange', async () => {
    const ctx = await setup();
    await save(ctx, 'pr71', [{ personneId: 'f', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    await addEnc(ctx, 'pr71', 'f', 'FORMATEUR');
    const row = await ctx.repo.getParticipation('pr71', 'f');
    assert.strictEqual(row.role, 'FORMATEUR');
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual((await ctx.service.lireEvenement('pr71')).prExerciseParticipation.kpis.presents, 1);
  });

  await record('13 AUXILIAIRE inchange', async () => {
    const ctx = await setup();
    await addEnc(ctx, 'pr71', 'aux', 'AUXILIAIRE');
    const fiche = await ctx.service.lireEvenement('pr71');
    assert.ok(fiche.encadrement.some((row) => row.personne_id === 'aux' && row.role === 'AUXILIAIRE'));
    assert.strictEqual(fiche.prExerciseParticipation.kpis.presents, 0);
  });

  await record('14 R4 utilise autre seance si disponible', async () => {
    const ctx = await setupConverted();
    await save(ctx, 'pr72', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    const fiche = await ctx.service.lireEvenement('pr73');
    const attendu = fiche.attendus.find((row) => row.personne_id === 'x');
    assert.strictEqual(fiche.prExerciseParticipation.kpis.presents, 1);
    assert.strictEqual(attendu.session_reference_event_id, 'pr72');
  });

  await record('15 R4 n utilise plus la seance convertie comme source de PRESENT', async () => {
    const ctx = await setupConverted();
    await save(ctx, 'pr72', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    const fiche = await ctx.service.lireEvenement('pr73');
    const attendu = fiche.attendus.find((row) => row.personne_id === 'x');
    assert.notStrictEqual(attendu.session_reference_event_id, 'pr71');
    assert.strictEqual((await ctx.repo.getParticipation('pr71', 'x')).statut, 'NON_RENSEIGNE');
  });

  await record('16 Rapport detaille disabled si 1 seance ouverte', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    await setStatus(ctx.repo, 'pr72', 'REALISE');
    const fiche = await ctx.service.lireEvenement('pr71');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, false);
    assert.ok(uiSrc.includes('session.allSessionsClosed'));
    assert.ok(uiSrc.includes('disabled aria-disabled="true"'));
  });

  await record('17 Rapport detaille disabled si plusieurs seances ouvertes', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    const fiche = await ctx.service.lireEvenement('pr71');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, false);
  });

  await record('18 Rapport detaille actif si toutes les seances sont cloturees', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    await setStatus(ctx.repo, 'pr72', 'REALISE');
    await setStatus(ctx.repo, 'pr73', 'REALISE');
    const fiche = await ctx.service.lireEvenement('pr71');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, true);
    const model = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: 'pr71' }, { includeNominatif: true });
    assert.strictEqual(model.kind, 'SESSION');
  });

  await record('19 reouverture d une seance rebloque le rapport', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    await setStatus(ctx.repo, 'pr72', 'REALISE');
    await setStatus(ctx.repo, 'pr73', 'REALISE');
    assert.strictEqual((await ctx.service.lireEvenement('pr71')).prExerciseParticipation.allSessionsClosed, true);
    await reopen(ctx, 'pr72');
    assert.strictEqual((await ctx.service.lireEvenement('pr71')).prExerciseParticipation.allSessionsClosed, false);
  });

  await record('20 backend refuse rapport si serie non cloturee', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    const err = await expectHttpError(
      () => collectReport(ctx.repo, { kind: 'SESSION', evenementId: 'pr71' }, { includeNominatif: true }),
      422,
      'rapport_session_incomplete'
    );
    assert.strictEqual(err.message, 'Le rapport détaillé sera disponible lorsque toutes les séances seront clôturées.');
  });

  await record('21 backend accepte rapport si serie cloturee', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    await setStatus(ctx.repo, 'pr72', 'REALISE');
    await setStatus(ctx.repo, 'pr73', 'REALISE');
    const result = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: 'pr71', nominatif: true }, CLAIMS, { generatedAt: '2026-10-10T10:00:00Z' });
    assert.ok(result.buffer && result.buffer.length > 0);
    assert.ok(/\.pdf$/i.test(result.filename));
  });

  await record('22 rapport evenement local reste disponible', async () => {
    const ctx = await setup();
    await setStatus(ctx.repo, 'pr71', 'REALISE');
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: 'pr71' }, { includeNominatif: true });
    assert.strictEqual(model.kind, 'EVENT');
    assert.strictEqual(model.event.id, 'pr71');
  });

  await record('23 tooltip exact avant cloture complete', () => {
    assert.ok(uiSrc.includes('Disponible lorsque toutes les séances sont clôturées.'));
    assert.ok(logicSrc.includes('Le rapport détaillé sera disponible lorsque toutes les séances seront clôturées.'));
  });

  await record('24 aucune decision basee sur date du jour', () => {
    const fn = extractFunction(reportSrc, 'assertAllReportSessionsClosed');
    assert.ok(fn.includes("event.statut"));
    assert.ok(!fn.includes('date'));
    assert.ok(!fn.includes('new Date'));
  });

  await record('25 aucune suppression de donnees hors evenement courant', async () => {
    const ctx = await setup();
    await save(ctx, 'pr72', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    await save(ctx, 'pr71', [{ personneId: 'x', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    await addEnc(ctx, 'pr71', 'x', 'SURVEILLANT');
    assert.strictEqual((await ctx.repo.getParticipation('pr71', 'x')).role, 'SURVEILLANT');
    assert.strictEqual((await ctx.repo.getParticipation('pr72', 'x')).statut, 'PRESENT');
    assert.ok(serviceSrc.includes("const keepParticipantPresence = role === 'FORMATEUR' && presenceDejaSaisie;"));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-PR-ROLE-REPORT-INTEGRITY-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-PR-ROLE-REPORT-INTEGRITY-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
