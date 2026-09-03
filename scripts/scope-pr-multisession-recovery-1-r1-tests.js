#!/usr/bin/env node
'use strict';

/** SCOPE-PR-MULTISESSION-RECOVERY-1-R1 - fixture production-shaped. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
const results = [];
const ACTOR = { sub: 'scope-pr-multisession-recovery-1-r1' };

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function event(id, section){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-recovery-r1',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: `2026-08-${20 + Number(section)}`,
    libelle: `Exercice PR 3.${section} | ${section === '2' ? 'Highway to hell' : 'Session ' + section}`,
    code_cours: `PAPR.PR3.${section}`,
    pr_exercise_group_key: 'cycle-pr-recovery-r1:PR:3',
    pr_session_key: `cycle-pr-recovery-r1:PR:3.${section}`,
    population_figee: true
  };
}

function part(personneId, statut, extra){
  return Object.assign({ personneId, statut, role: 'PARTICIPANT' }, extra || {});
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
    cycle_id: 'cycle-pr-recovery-r1',
    cycle_key: 'PAPR-RECOVERY-R1',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR Recovery R1'
  });
  for(const section of ['1', '2', '4']){
    const created = await repo.insertEvenement(event(`pr3${section}`, section));
    await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  }
  for(const [personne_id, nip, nom, prenom] of [
    ['A', '93001', 'Alpha', 'Anne'],
    ['B', '93002', 'Bravo', 'Bernard'],
    ['C', '93003', 'Charlie', 'Claire'],
    ['D', '93004', 'Delta', 'David'],
    ['T', '93999', 'Trainer', 'Theo']
  ]){
    await repo.insertPersonne({ personne_id, nip, nom, prenom, grade: 'Sap', skipPeriodes: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-recovery-r1', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
    for(const eventId of ['pr31', 'pr32', 'pr34']){
      await repo.upsertAttendu({ evenement_id: eventId, personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: eventId, personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  return { repo, service };
}

function productionShaped(fiche){
  return Object.assign({}, fiche, {
    attendus: (fiche.attendus || []).map((row) => Object.assign({}, row, {
      personneId: row.personne_id,
      evenementId: row.evenement_id
    })),
    participations: (fiche.participations || []).map((row) => {
      const next = Object.assign({}, row, {
        personneId: row.personne_id,
        evenementId: row.evenement_id
      });
      delete next.personne_id;
      delete next.evenement_id;
      return next;
    })
  });
}

function rowFromFiche(fiche, personneId){
  const attendu = (fiche.attendus || []).find((row) => String(row.personne_id || row.personneId) === String(personneId)) || {};
  const participation = (fiche.participations || []).find((row) => String(row.personne_id || row.personneId) === String(personneId)) || {};
  const person = (fiche.personnes && fiche.personnes[personneId]) || {};
  const statut = participation.statut || 'NON_RENSEIGNE';
  const localValid = logic.isValidSessionStatut(statut);
  const already = Boolean(attendu.alreadyCountedInSession || attendu.already_counted_in_session);
  const row = {
    personneId,
    inclus: true,
    role: participation.role || 'PARTICIPANT',
    statut,
    motifAbsence: participation.motif_absence || participation.motifAbsence || '',
    alreadyCountedInSession: already,
    coveredInGlobalBilan: Boolean(!localValid && already),
    sessionReferenceEventLabel: attendu.sessionReferenceEventLabel || attendu.session_reference_event_label || '',
    sessionReferenceEventDate: attendu.sessionReferenceEventDate || attendu.session_reference_event_date || '',
    sessionReferenceLabel: attendu.sessionReferenceLabel || attendu.session_reference_label || '',
    grade: person.grade || '',
    prenom: person.prenom || '',
    nomFamille: person.nom || '',
    nip: person.nip || ''
  };
  return row;
}

function disabled(row){
  return Boolean(logic.statusLockedForRole(row.role) || logic.coveredInGlobalBilan(row));
}

function kpis(fiche){
  const k = fiche.prExerciseParticipation.kpis;
  return {
    attendus: k.population,
    presents: k.presents,
    excuses: k.excuses,
    absents: k.absents,
    dispenses: k.dispenses,
    open: k.open
  };
}

async function closeExpectingError(service, repo, eventId){
  try{
    await service.cloturer(eventId, { baseVersion: await version(repo, eventId) }, ACTOR);
    assert.fail('cloture_refusee attendue');
  }catch(error){
    assert.strictEqual(error.status, 422);
    assert.strictEqual(error.error, 'session_incomplete');
    return error;
  }
}

(async () => {
  const ctx = await setupSeries();
  await addTrainer(ctx, 'pr31');
  await addTrainer(ctx, 'pr32');
  await addTrainer(ctx, 'pr34');
  await save(ctx, 'pr31', [part('A', 'PRESENT')]);
  await save(ctx, 'pr32', [part('B', 'PRESENT')]);
  await save(ctx, 'pr34', [part('C', 'PRESENT')]);
  const pr34 = await ctx.service.lireEvenement('pr34');
  const shaped = productionShaped(pr34);
  const rows = Object.fromEntries(['A', 'B', 'C', 'D', 'T'].map((id) => [id, rowFromFiche(shaped, id)]));

  await record('01 current event local PRESENT = pas bleu', () => {
    assert.strictEqual(rows.C.statut, 'PRESENT');
    assert.strictEqual(logic.coveredInGlobalBilan(rows.C), false);
  });
  await record('02 current event local EXCUSE = pas bleu', () => {
    const row = Object.assign({}, rows.C, { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', coveredInGlobalBilan: true });
    assert.strictEqual(logic.coveredInGlobalBilan(row), false);
  });
  await record('03 current event local ABSENT = pas bleu', () => {
    const row = Object.assign({}, rows.C, { statut: 'ABSENT_NON_EXCUSE', coveredInGlobalBilan: true });
    assert.strictEqual(logic.coveredInGlobalBilan(row), false);
  });
  await record('04 current event local DISPENSE = pas bleu', () => {
    const row = Object.assign({}, rows.C, { statut: 'DISPENSE', motifAbsence: 'JOKER', coveredInGlobalBilan: true });
    assert.strictEqual(logic.coveredInGlobalBilan(row), false);
  });
  await record('05 current event ID reconnu avec forme service production', () => {
    assert.ok(uiSrc.includes('p.personne_id || p.personneId'));
    assert.ok(uiSrc.includes('a.personne_id || a.personneId'));
    assert.strictEqual(rows.C.statut, 'PRESENT');
  });
  await record('06 autre seance = bleu', () => {
    assert.strictEqual(logic.coveredInGlobalBilan(rows.A), true);
    assert.strictEqual(logic.coveredInGlobalBilan(rows.B), true);
  });
  await record('07 autre seance = disabled', () => {
    assert.strictEqual(disabled(rows.A), true);
    assert.strictEqual(disabled(rows.B), true);
  });
  await record('08 tooltip autre seance = bon evenement', () => {
    const tipA = logic.sessionExplainTooltip(rows.A);
    const tipB = logic.sessionExplainTooltip(rows.B);
    assert.ok(tipA.includes('Exercice PR 3.1 | Session 1'));
    assert.ok(tipB.includes('Exercice PR 3.2 | Highway to hell'));
  });
  await record('09 tooltip jamais current event', () => {
    assert.ok(!logic.sessionExplainTooltip(rows.A).includes('Exercice PR 3.4'));
    assert.strictEqual(logic.sessionExplainTooltip(rows.C), '');
  });
  await record('10 aucun texte permanent dans INFORMATIONS', () => {
    const infoCell = uiSrc.slice(uiSrc.indexOf('function justificatifCell'), uiSrc.indexOf('function roleFlag'));
    assert.ok(!infoCell.includes('Déjà comptabilisé'));
  });
  await record('11 participant local reste modifiable', () => {
    assert.strictEqual(disabled(rows.C), false);
    assert.strictEqual(logic.applyParticipationStatus(rows.C, 'ABSENT_NON_EXCUSE').statut, 'ABSENT_NON_EXCUSE');
  });
  await record('12 couvert ailleurs ignore Tous presents', () => {
    assert.strictEqual(logic.applyAllPresent([rows.A])[0].statut, 'NON_RENSEIGNE');
  });
  await record('13 KPI saisie = global R4', () => {
    assert.deepStrictEqual(kpis(pr34), { attendus: 5, presents: 4, excuses: 0, absents: 0, dispenses: 0, open: 1 });
    assert.ok(uiSrc.includes('prExerciseParticipation.kpis'));
  });
  await record('14 KPI realise = local evenement', async () => {
    await save(ctx, 'pr34', [part('D', 'PRESENT')]);
    await ctx.service.cloturer('pr34', { baseVersion: await version(ctx.repo, 'pr34') }, ACTOR);
    const realised = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(realised.compteurs.presents, 3);
    assert.notStrictEqual(realised.compteurs.presents, realised.prExerciseParticipation.kpis.presents);
  });
  await record('15 liste evenements = stats locales', async () => {
    const listed = await ctx.service.listEvenements({ annee: 2026, domaine: 'PR', today: '2026-08-19' });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === 'pr34');
    assert.strictEqual(item.compteurs.presents, 3);
  });
  await record('16 formateur visible seance 1', async () => {
    assert.ok((await ctx.service.lireEvenement('pr31')).encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });
  await record('17 formateur visible seance suivante', async () => {
    assert.ok((await ctx.service.lireEvenement('pr32')).encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });
  await record('18 cloture seance 1 ne supprime pas formateur seance 2', async () => {
    await ctx.service.cloturer('pr31', { baseVersion: await version(ctx.repo, 'pr31') }, ACTOR);
    assert.ok((await ctx.service.lireEvenement('pr32')).encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });
  await record('19 formateur visible REALISE', async () => {
    assert.ok((await ctx.service.lireEvenement('pr34')).encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });
  await record('20 Encadrement avant Participants en REALISE', () => {
    const chunk = uiSrc.slice(uiSrc.indexOf('function renderRealise'), uiSrc.indexOf('function renderModalAllPresent'));
    assert.ok(chunk.indexOf('renderRealiseEncadrement(fiche)') < chunk.indexOf('scope-realise-participants'));
  });
  await record('21 seance intermediaire cloturable avec population globale incomplete', async () => {
    const extra = await setupSeries();
    await addTrainer(extra, 'pr31');
    await save(extra, 'pr31', [part('A', 'PRESENT')]);
    const closed = await extra.service.cloturer('pr31', { baseVersion: await version(extra.repo, 'pr31') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
  });
  await record('22 seance intermediaire ne demande pas tous les statuts', () => {
    assert.ok(serviceSrc.includes('const requireExpectedFilled = !(prState && prState.isMultiSession);'));
  });
  await record('23 derniere seance bloque si global incomplet', async () => {
    const extra = await setupSeries();
    await save(extra, 'pr31', [part('A', 'PRESENT')]);
    const err = await closeExpectingError(extra.service, extra.repo, 'pr34');
    assert.ok((err.details.unfilledPeople || []).length > 0);
  });
  await record('24 derniere seance passe si global complet', async () => {
    const extra = await setupSeries();
    await save(extra, 'pr31', [part('A', 'PRESENT'), part('B', 'PRESENT')]);
    await save(extra, 'pr32', [part('C', 'PRESENT')]);
    await addTrainer(extra, 'pr34');
    await save(extra, 'pr34', [part('D', 'PRESENT')]);
    const closed = await extra.service.cloturer('pr34', { baseVersion: await version(extra.repo, 'pr34') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
  });
  await record('25 couvert ailleurs ne bloque pas cloture finale', async () => {
    const fiche = await ctx.service.lireEvenement('pr34');
    assert.strictEqual(fiche.prExerciseParticipation.kpis.open, 0);
  });
  await record('26 A_TRAITER si aucune participation locale metier', async () => {
    const extra = await setupSeries();
    await save(extra, 'pr31', [part('A', 'PRESENT')]);
    const listed = await extra.service.listEvenements({ annee: 2026, domaine: 'PR', today: '2026-08-30' });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === 'pr32');
    assert.strictEqual(item.etatMetier.code, 'A_TRAITER');
  });
  await record('27 SAISIE EN COURS si une participation locale persistee', async () => {
    const extra = await setupSeries();
    await save(extra, 'pr32', [part('B', 'PRESENT')]);
    const listed = await extra.service.listEvenements({ annee: 2026, domaine: 'PR', today: '2026-08-30' });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === 'pr32');
    assert.strictEqual(item.etatMetier.code, 'SAISIE_EN_COURS');
  });
  await record('28 formateur seul ne declenche pas SAISIE EN COURS', async () => {
    const extra = await setupSeries();
    await addTrainer(extra, 'pr32');
    const listed = await extra.service.listEvenements({ annee: 2026, domaine: 'PR', today: '2026-08-30' });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === 'pr32');
    assert.strictEqual(item.etatMetier.code, 'A_TRAITER');
  });
  await record('29 population NON_RENSEIGNE ne declenche pas SAISIE EN COURS', async () => {
    const extra = await setupSeries();
    const listed = await extra.service.listEvenements({ annee: 2026, domaine: 'PR', today: '2026-08-30' });
    const item = listed.evenements.find((row) => row.evenement.evenement_id === 'pr32');
    assert.strictEqual(item.etatMetier.code, 'A_TRAITER');
  });
  await record('30 reouverture conserve participants locaux', async () => {
    await ctx.service.reouvrir('pr34', { baseVersion: await version(ctx.repo, 'pr34'), motif: 'Controle R1' }, ACTOR);
    const reopened = await ctx.service.lireEvenement('pr34');
    assert.strictEqual((reopened.participations.find((row) => row.personne_id === 'C') || {}).statut, 'PRESENT');
  });
  await record('31 reouverture conserve formateurs', async () => {
    assert.ok((await ctx.service.lireEvenement('pr34')).encadrement.some((row) => row.personne_id === 'T' && row.role === 'FORMATEUR'));
  });
  await record('32 aucune suppression historique', async () => {
    assert.strictEqual((await ctx.repo.getParticipation('pr31', 'A')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr32', 'B')).statut, 'PRESENT');
    assert.strictEqual((await ctx.repo.getParticipation('pr34', 'C')).statut, 'PRESENT');
  });
  await record('33 message erreur non duplique', () => {
    assert.ok(uiSrc.includes("Certaines personnes restent à renseigner pour finaliser l'exercice."));
    assert.ok(!uiSrc.includes('Chaque personne attendue sans statut valide doit être renseignée'));
  });
  await record('34 scenario production-shaped complet', () => {
    assert.strictEqual(logic.coveredInGlobalBilan(rows.A), true);
    assert.strictEqual(logic.coveredInGlobalBilan(rows.B), true);
    assert.strictEqual(logic.coveredInGlobalBilan(rows.C), false);
    assert.strictEqual(logic.coveredInGlobalBilan(rows.D), false);
    assert.strictEqual(disabled(rows.D), false);
    assert.strictEqual(rows.T.role, 'FORMATEUR');
  });

  results.forEach((result) => {
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  });
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE-PR-MULTISESSION-RECOVERY-1-R1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-PR-MULTISESSION-RECOVERY-1-R1 tests: ${results.length}/${results.length} PASS`);
})();
