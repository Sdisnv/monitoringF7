#!/usr/bin/env node
'use strict';

/** SCOPE-PR-MULTISESSION-RECOVERY-1 - contrat PR multi-seances MOA. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { computePrExerciseParticipationState } = require('../netlify/lib/_scope-cycle-rules');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const results = [];
const ACTOR = { sub: 'scope-pr-multisession-recovery-1' };

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function event(id, section){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-recovery-1',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: `2026-09-0${section === '4' ? '3' : section}`,
    libelle: `Exercice PR 3.${section}`,
    code_cours: `PAPR.PR3.${section}`,
    pr_exercise_group_key: 'cycle-pr-recovery-1:PR:3',
    pr_session_key: `cycle-pr-recovery-1:PR:3.${section}`,
    population_figee: true
  };
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

function part(personneId, statut, extra){
  return Object.assign({ personneId, statut, role: 'PARTICIPANT' }, extra || {});
}

async function save(ctx, eventId, rows){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations: rows
  }, ACTOR);
}

async function addTrainer(ctx, eventId){
  return ctx.service.ajouterEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId: 'T',
    role: 'FORMATEUR'
  }, ACTOR);
}

async function setupSeries(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-recovery-1',
    cycle_key: 'PAPR-RECOVERY-1',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR Recovery 1'
  });
  for(const section of ['1', '2', '4']){
    const created = await repo.insertEvenement(event(`pr3${section}`, section));
    await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  }
  const people = [
    ['A', '92001', 'Alpha', 'Anne'],
    ['B', '92002', 'Bravo', 'Bernard'],
    ['C', '92003', 'Charlie', 'Claire'],
    ['D', '92004', 'Delta', 'David'],
    ['T', '92999', 'Trainer', 'Theo']
  ];
  for(const [personne_id, nip, nom, prenom] of people){
    await repo.insertPersonne({ personne_id, nip, nom, prenom, grade: 'Sap', skipPeriodes: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-recovery-1', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
    for(const eventId of ['pr31', 'pr32', 'pr34']){
      await repo.upsertAttendu({ evenement_id: eventId, personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: eventId,
        personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  return { repo, service };
}

function uiRow(fiche, personneId){
  const attendu = (fiche.attendus || []).find((row) => String(row.personne_id) === String(personneId)) || {};
  const participation = (fiche.participations || []).find((row) => String(row.personne_id) === String(personneId)) || {};
  const person = (fiche.personnes && fiche.personnes[personneId]) || {};
  const localStatut = participation.statut || 'NON_RENSEIGNE';
  const localValid = logic.isValidSessionStatut(localStatut);
  const alreadyCountedInSession = Boolean(attendu.alreadyCountedInSession || attendu.already_counted_in_session);
  return {
    personneId,
    inclus: true,
    role: participation.role || 'PARTICIPANT',
    statut: localStatut,
    motifAbsence: participation.motif_absence || '',
    alreadyCountedInSession,
    coveredInGlobalBilan: Boolean(!localValid && alreadyCountedInSession),
    grade: person.grade || '',
    prenom: person.prenom || '',
    nomFamille: person.nom || '',
    nip: person.nip || ''
  };
}

function buttonDisabled(row){
  return Boolean(logic.statusLockedForRole(row.role) || logic.coveredInGlobalBilan(row));
}

(async () => {
  const ctx = await setupSeries();
  await addTrainer(ctx, 'pr31');
  await save(ctx, 'pr31', [part('A', 'PRESENT'), part('B', 'PRESENT')]);

  const after31On32 = await ctx.service.lireEvenement('pr32');
  const rowA32 = uiRow(after31On32, 'A');
  const rowD32 = uiRow(after31On32, 'D');

  await addTrainer(ctx, 'pr32');
  await save(ctx, 'pr32', [part('C', 'PRESENT')]);
  const after32On34 = await ctx.service.lireEvenement('pr34');
  const rowC34Before = uiRow(after32On34, 'C');
  const rowD34Before = uiRow(after32On34, 'D');

  await addTrainer(ctx, 'pr34');
  const afterTrainer34 = await ctx.service.lireEvenement('pr34');
  await save(ctx, 'pr34', [part('D', 'PRESENT')]);
  const afterD34 = await ctx.service.lireEvenement('pr34');
  const rowD34 = uiRow(afterD34, 'D');

  await record('01 - jamais couverte = ligne normale', () => {
    assert.strictEqual(logic.coveredInGlobalBilan(rowD32), false);
    assert.strictEqual(logic.sessionLocked(rowD32), false);
  });

  await record('02 - couverte autre seance = bleu', () => {
    assert.strictEqual(rowA32.alreadyCountedInSession, true);
    assert.strictEqual(logic.coveredInGlobalBilan(rowA32), true);
    assert.ok(uiSrc.includes("coveredGlobally ? 'scope-row-session-counted'"));
  });

  await record('03 - couverte autre seance = boutons disabled', () => {
    assert.strictEqual(buttonDisabled(rowA32), true);
    assert.ok(uiSrc.includes("statusDisabled ? ' disabled aria-disabled=\"true\"'"));
  });

  await record('04 - statut local courant prioritaire', () => {
    assert.strictEqual(rowD34.statut, 'PRESENT');
    assert.strictEqual(logic.coveredInGlobalBilan(rowD34), false);
    assert.strictEqual(logic.sessionLocked(rowD34), false);
  });

  await record('05 - current event exclu de covered elsewhere', () => {
    const state = computePrExerciseParticipationState({
      cycle: { cycle_id: 'cycle-pr-recovery-1', domaine_code: 'PR' },
      evenements: [event('pr31', '1'), event('pr32', '2')],
      cyclePersonnes: [{ cycle_id: 'cycle-pr-recovery-1', personne_id: 'A', role_cycle: 'PARTICIPANT' }],
      attendus: [{ evenement_id: 'pr31', personne_id: 'A', inclus: true }, { evenement_id: 'pr32', personne_id: 'A', inclus: true }],
      participations: [{ evenement_id: 'pr31', personne_id: 'A', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' }],
      personnes: { A: { personne_id: 'A', nip: '92001', nom: 'Alpha', prenom: 'Anne' } },
      currentEventId: 'pr31'
    });
    assert.ok(!state.byPersonneId.A || state.byPersonneId.A.alreadyCountedInSession !== true);
  });

  await record('06 - participation courante non bleue par elle-meme', () => {
    assert.strictEqual(rowD34.alreadyCountedInSession, false);
    assert.strictEqual(logic.coveredInGlobalBilan(rowD34), false);
  });

  await record('07 - couvert ailleurs exclu de A renseigner', () => {
    assert.strictEqual(logic.isIncompleteClosureRow(rowA32), false);
  });

  await record('08 - couvert ailleurs exclu du filtre non renseigne', () => {
    assert.strictEqual(logic.isOpenSaisieRow(rowA32), false);
    assert.strictEqual(logic.isOpenSaisieRow(rowD32), true);
  });

  await record('09 - couvert ailleurs ignore par Tous presents', () => {
    const after = logic.applyAllPresent([rowA32]);
    assert.strictEqual(after[0].statut, 'NON_RENSEIGNE');
  });

  await record('10 - couvert ailleurs absent du nouveau payload', () => {
    assert.deepStrictEqual(logic.buildPresenceSavePayload([rowA32], new Set()), []);
  });

  await record('11 - cumul global PR 3.1 vers PR 3.2', () => {
    assert.strictEqual(after31On32.prExerciseParticipation.kpis.presents, 3);
    const afterC = after32On34.prExerciseParticipation.kpis.presents;
    assert.strictEqual(afterC, 4);
  });

  await record('12 - cumul global PR 3.2 vers PR 3.4', () => {
    assert.strictEqual(afterD34.prExerciseParticipation.kpis.presents, 5);
  });

  await record('13 - deduplication globale', () => {
    const duplicateState = afterD34.prExerciseParticipation;
    assert.strictEqual(duplicateState.coverage.covered, 5);
    assert.strictEqual(duplicateState.kpis.presents, 5);
  });

  await record('14 - KPI global presents', () => {
    assert.ok(uiSrc.includes('prExerciseParticipation.kpis'));
    assert.strictEqual(afterD34.prExerciseParticipation.kpis.presents, 5);
  });

  await record('15 - KPI global A renseigner', () => {
    assert.strictEqual(after32On34.prExerciseParticipation.kpis.open, 1);
    assert.strictEqual(afterD34.prExerciseParticipation.kpis.open, 0);
  });

  await record('16 - formateur visible dans encadrement', () => {
    assert.ok(afterTrainer34.encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });

  await record('17 - formateur conserve apres save', () => {
    assert.ok(afterD34.encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
    assert.strictEqual((afterD34.participations.find((row) => row.personne_id === 'T') || {}).role, 'FORMATEUR');
  });

  await record('18 - formateur visible apres cloture', async () => {
    await ctx.service.cloturer('pr34', { baseVersion: await version(ctx.repo, 'pr34') }, ACTOR);
    const realised = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(realised.evenement.statut, 'REALISE');
    assert.ok(realised.encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });

  await record('19 - formateur visible apres reouverture', async () => {
    await ctx.service.reouvrir('pr34', { baseVersion: await version(ctx.repo, 'pr34'), motif: 'Recette MOA' }, ACTOR);
    const reopened = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(reopened.evenement.statut, 'PLANIFIE');
    assert.ok(reopened.encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });

  await record('20 - formateur multi-seance compte une fois globalement', async () => {
    const reopened = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(reopened.prExerciseParticipation.kpis.presents, 5);
    assert.strictEqual(reopened.prExerciseParticipation.details.presents.filter((key) => key === 'NIP:92999').length, 1);
  });

  await record('21 - participations locales conservees a la cloture', async () => {
    const row = await ctx.repo.getParticipation('pr34', 'D');
    assert.strictEqual(row.statut, 'PRESENT');
  });

  await record('22 - vue realise = donnees evenement', async () => {
    await ctx.service.cloturer('pr34', { baseVersion: await version(ctx.repo, 'pr34') }, ACTOR);
    const realised = await ctx.service.lireEvenement('pr34');
    assert.strictEqual((realised.participations.find((row) => row.personne_id === 'D') || {}).statut, 'PRESENT');
    assert.strictEqual((realised.participations.find((row) => row.personne_id === 'A') || {}).evenement_id, 'pr34');
  });

  await record('23 - reouverture = donnees evenement', async () => {
    await ctx.service.reouvrir('pr34', { baseVersion: await version(ctx.repo, 'pr34'), motif: 'Controle donnees evenement' }, ACTOR);
    const reopened = await ctx.service.lireEvenement('pr34');
    const row = uiRow(reopened, 'D');
    assert.strictEqual(row.statut, 'PRESENT');
    assert.strictEqual(logic.coveredInGlobalBilan(row), false);
  });

  await record('24 - aucune suppression historique', async () => {
    assert.strictEqual((await ctx.repo.getParticipation('pr31', 'A')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr32', 'C')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr34', 'D')).statut, 'PRESENT');
  });

  await record('25 - modal retour : Enregistrer et quitter', () => {
    assert.ok(uiSrc.includes('scope-saisie-leave-save'));
    assert.ok(uiSrc.includes('Enregistrer et quitter'));
  });

  await record('26 - modal retour : Quitter sans enregistrer', () => {
    assert.ok(uiSrc.includes('scope-saisie-leave-discard'));
    assert.ok(uiSrc.includes('Quitter sans enregistrer'));
  });

  await record('27 - modal retour : Annuler', () => {
    assert.ok(uiSrc.includes('scope-saisie-leave-cancel'));
    assert.ok(uiSrc.includes('Annuler'));
  });

  await record('28 - absence de Rester sur la saisie', () => {
    assert.ok(!uiSrc.includes('Rester sur la saisie'));
  });

  await record('29 - absence de Deja comptabilise dans le bilan global', () => {
    assert.ok(!uiSrc.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(!logicSrc.includes('Déjà comptabilisé dans le bilan global'));
  });

  await record('30 - scenario complet A/B/C/D/T', async () => {
    const pr34 = await ctx.service.lireEvenement('pr34');
    const rows = Object.fromEntries(['A', 'B', 'C', 'D', 'T'].map((id) => [id, uiRow(pr34, id)]));
    assert.strictEqual(logic.coveredInGlobalBilan(rows.A), true);
    assert.strictEqual(logic.coveredInGlobalBilan(rows.B), true);
    assert.strictEqual(logic.coveredInGlobalBilan(rows.C), true);
    assert.strictEqual(rows.D.statut, 'PRESENT');
    assert.strictEqual(logic.coveredInGlobalBilan(rows.D), false);
    assert.ok(pr34.encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
    assert.deepStrictEqual(pr34.prExerciseParticipation.kpis, {
      population: 5,
      presents: 5,
      dispenses: 0,
      excuses: 0,
      absents: 0,
      open: 0
    });
  });

  const finalFiche = await ctx.service.lireEvenement('pr34');
  console.log('SCOPE-PR-MULTISESSION-RECOVERY-1 CONTROL');
  console.log(JSON.stringify({
    presentsGlobaux: finalFiche.prExerciseParticipation.kpis.presents,
    remainingGlobal: finalFiche.prExerciseParticipation.kpis.open,
    coveredElsewhere: ['A', 'B', 'C'].filter((id) => logic.coveredInGlobalBilan(uiRow(finalFiche, id))),
    localStatus: Object.fromEntries(['D', 'T'].map((id) => [id, uiRow(finalFiche, id).statut])),
    formateursParSeance: Object.fromEntries(await Promise.all(['pr31', 'pr32', 'pr34'].map(async (eventId) => {
      const fiche = await ctx.service.lireEvenement(eventId);
      return [eventId, fiche.encadrement.filter((row) => row.role === 'FORMATEUR').map((row) => row.personne_id)];
    }))),
    formateursUniquesGlobal: finalFiche.prExerciseParticipation.details.presents.filter((key) => key === 'NIP:92999').length
  }, null, 2));

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE-PR-MULTISESSION-RECOVERY-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-PR-MULTISESSION-RECOVERY-1 tests: ${results.length}/${results.length} PASS`);
})();
