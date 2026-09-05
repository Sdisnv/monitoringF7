#!/usr/bin/env node
'use strict';

/** SCOPE-METIER-ACTIVATION-3 - activation PR-ABC, cycles, evenements, dispenses. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { computeTaux, validateParticipationPatch } = require('../netlify/lib/_scope-rules');
const L = require('../assets/js/scope-ui-logic.js');
const model = require('../netlify/lib/_scope-model');

const ROOT = path.join(__dirname, '..');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
const routeSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const schemaSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-schema.js'), 'utf8');
const ACTOR = { sub: 'scope-metier-activation-3' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deep(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, dates = {}){
  const p = await repo.insertPersonne({
    nip,
    nom: `Nom ${nip}`,
    prenom: 'Test',
    grade: 'Sap',
    date_entree: dates.dateEntree || '2020-01-01'
  });
  await repo.insertAffectation({
    personne_id: p.personne_id,
    cible_id: cibleRow.cible_id,
    date_debut: dates.dateDebut || '2026-01-01',
    date_fin: dates.dateFin || null
  });
  return p;
}

async function createFrozen(service, cibleRow, date, libelle, extra = {}){
  const created = await service.createEvenement({
    date,
    domaineCode: cibleRow.domaine_code,
    libelle,
    cibleIds: [cibleRow.cible_id],
    ...extra
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return { eventId: created.evenement.evenement_id, evenement: frozen.evenement, version: frozen.version };
}

async function patchPrSession(repo, frozen, { groupKey, sessionKey }){
  const event = await repo.getEvent(frozen.eventId);
  await repo.updateEventIfVersion(frozen.eventId, event.version, {
    pr_exercise_group_key: groupKey,
    pr_session_key: sessionKey
  });
  return repo.getEvent(frozen.eventId);
}

async function closeEvent(service, repo, eventId, statuses){
  const event = await repo.getEvent(eventId);
  const attendus = (await repo.listAttendus(eventId)).filter((a) => a.inclus !== false);
  await service.enregistrerParticipations(eventId, {
    baseVersion: event.version,
    participations: attendus.map((a, index) => ({ personneId: a.personne_id, statut: statuses[index] || 'PRESENT' }))
  }, ACTOR);
  const saved = await repo.getEvent(eventId);
  return service.cloturer(eventId, { baseVersion: saved.version }, ACTOR);
}

(async () => {
  await record('01-13 - reprise PR-ABC dry-run/apply depuis affectations sans liste NIP', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await cible(repo, 'PR', 'ABC');
    const gen = await cible(repo, 'PR', 'GEN');
    const pAbc = await person(repo, abc, 'ACT3ABC001');
    const pGen1 = await person(repo, gen, 'ACT3GEN001');
    const pGen2 = await person(repo, gen, 'ACT3GEN002');
    const frozen = await createFrozen(service, abc, '2026-04-21', 'Exercice PR-ABC | Base');
    await repo.upsertAttendu({ evenement_id: frozen.eventId, personne_id: pGen1.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertAttendu({ evenement_id: frozen.eventId, personne_id: pGen2.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: frozen.eventId, personne_id: pGen1.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    await repo.upsertParticipation({ evenement_id: frozen.eventId, personne_id: pGen2.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
    const dry = await service.reconcilePrAbcPopulation({ year: 2026 }, ACTOR);
    eq(dry.dryRun, true);
    eq(dry.eventsConcerned, 1);
    eq(dry.details[0].populationBefore, 3);
    eq(dry.details[0].populationExpected, 1);
    eq(dry.details[0].populationAfter, 1);
    eq(dry.details[0].removedCount, 2);
    eq(dry.details[0].protectedCount, 1);
    eq((await repo.listAttendus(frozen.eventId)).filter((a) => a.inclus !== false).length, 3);
    const applied = await service.reconcilePrAbcPopulation({ year: 2026, dryRun: false }, ACTOR);
    eq(applied.dryRun, false);
    eq((await repo.listAttendus(frozen.eventId)).filter((a) => a.inclus !== false).length, 1);
    eq((await repo.getParticipation(frozen.eventId, pGen1.personne_id)).statut, 'NON_CONCERNE');
    eq((await repo.getParticipation(frozen.eventId, pGen2.personne_id)).statut, 'PRESENT');
    eq((await repo.listAttendus(frozen.eventId)).filter((a) => a.inclus !== false)[0].personne_id, pAbc.personne_id);
  });

  await record('14-26 - cycles PR visibles depuis series existantes et isoles par annee', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cycles = createScopeCycleService(repo);
    const abc = await cible(repo, 'PR', 'ABC');
    await person(repo, abc, 'ACT3CYC001');
    const ids2026 = [];
    for(let i = 1; i <= 6; i += 1){
      const frozen = await createFrozen(service, abc, `2026-03-${String(i).padStart(2, '0')}`, `PR 1.${i} | Base`);
      ids2026.push(frozen.eventId);
      await patchPrSession(repo, frozen, { groupKey: 'SCOPE:2026:PR:1', sessionKey: `SCOPE:2026:PR:1.${i}` });
    }
    const other = await createFrozen(service, abc, '2026-05-01', 'PR 3.1 | Highway to hell');
    await patchPrSession(repo, other, { groupKey: 'SCOPE:2026:PR:3', sessionKey: 'SCOPE:2026:PR:3.1' });
    const other2 = await createFrozen(service, abc, '2026-05-08', 'PR 3.2 | Highway to hell');
    await patchPrSession(repo, other2, { groupKey: 'SCOPE:2026:PR:3', sessionKey: 'SCOPE:2026:PR:3.2' });
    const next = await createFrozen(service, abc, '2027-03-01', 'PR 1.1 | Base');
    await patchPrSession(repo, next, { groupKey: 'SCOPE:2027:PR:1', sessionKey: 'SCOPE:2027:PR:1.1' });
    const listed = await cycles.listCycles({ annee: 2026, domaine: 'PR' });
    const labels = listed.cycles.map((c) => c.libelle);
    ok(labels.includes('PR 1 — Base — 2026'));
    ok(labels.includes('PR 3 — Highway to hell — 2026'));
    ok(!labels.some((label) => label.includes('2027')));
    const cycle = listed.cycles.find((c) => c.libelle === 'PR 1 — Base — 2026');
    ok(cycle.derived);
    eq(cycle.eventCount, 6);
    eq(cycle.populationCount, 1);
    const detail = await cycles.getCycle(cycle.cycle_id);
    eq(detail.evenements.length, 6);
    eq(detail.cycle.cycle_key, 'SCOPE:2026:PR:1');
    for(const id of ids2026.slice(0, 5)) await closeEvent(service, repo, id, ['PRESENT']);
    await service.annulerEvenement(ids2026[5], { baseVersion: (await repo.getEvent(ids2026[5])).version, motif: 'Activation-3' }, ACTOR);
    const detailAfter = await cycles.getCycle(cycle.cycle_id);
    eq(detailAfter.metrics.completion.complete, true);
    eq(detailAfter.metrics.completion.cancelledCount, 1);
    eq(detailAfter.metrics.completion.exigibleCount, 5);
    eq(detailAfter.metrics.tauxParticipationCycle.contrat, 'CYCLE_PAPR_ALTERNATIF_PREPARED');
    const report = await collectReport(repo, { kind: 'DOMAIN', domaine: 'PR', year: 2026 }, {});
    eq(report.officiel.eventCount, 5);
  });

  await record('27-36 - evenement conserve identite au report et annule hors statistiques', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const dps = await cible(repo, 'DPS', 'G1');
    await person(repo, dps, 'ACT3DPS001');
    const frozen = await createFrozen(service, dps, '2026-06-18', 'DPS activation', { codeCours: 'ACT3.CODE' });
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: (await repo.getEvent(frozen.eventId)).version,
      date: '2026-08-27',
      motif: 'Report MOA'
    }, ACTOR);
    eq(moved.evenement.evenement_id, frozen.eventId);
    eq(moved.evenement.code_cours, 'ACT3.CODE');
    eq(String(moved.evenement.date).slice(0, 10), '2026-08-27');
    await closeEvent(service, repo, frozen.eventId, ['PRESENT']);
    const closed = await repo.getEvent(frozen.eventId);
    await assert.rejects(
      () => service.annulerEvenement(frozen.eventId, { baseVersion: closed.version, motif: '' }, ACTOR),
      /motif_obligatoire|annulation/
    );
    await service.reouvrir(frozen.eventId, { baseVersion: (await repo.getEvent(frozen.eventId)).version, motif: 'Correction' }, ACTOR);
    const cancelled = await service.annulerEvenement(frozen.eventId, { baseVersion: (await repo.getEvent(frozen.eventId)).version, motif: 'Annule MOA' }, ACTOR);
    eq(cancelled.evenement.statut, 'ANNULE');
    ok(await repo.getEvent(frozen.eventId));
    eq((await repo.listParticipations(frozen.eventId)).length, 1);
    const report = await collectReport(repo, { kind: 'DOMAIN', domaine: 'DPS', year: 2026 }, {});
    eq(report.officiel.eventCount, 0);
    eq((await analytics.evaluate({ year: 2026, domaine: 'DPS' })).exclusions.annules, 1);
  });

  await record('37-48 - dispenses ordonnees, Non concerne canonique et anciennes valeurs lues', async () => {
    deep(L.MOTIFS_DISPENSE.map((m) => m.label), [
      'Formateur PR',
      'Formation hors SDIS',
      'Joker',
      'Auto-retrait',
      'Démission en cours',
      'Non concerné'
    ]);
    deep(L.MOTIFS_DISPENSE.map((m) => m.value), [
      'FORMATEUR_PR',
      'FORMATION_HORS_SDIS',
      'JOKER',
      'AUTO_RETRAIT',
      'DEMISSION_EN_COURS',
      'NON_CONCERNE'
    ]);
    eq(L.MOTIFS_DISPENSE[2].group, 'operationnel');
    eq(L.MOTIFS_DISPENSE[3].group, 'administratif');
    ok(!L.MOTIFS_DISPENSE.some((m) => m.label === 'Pas concerné'));
    ok(Object.prototype.hasOwnProperty.call(model.MOTIFS_DISPENSE, 'AUTO_RETRAIT'));
    ok(Object.prototype.hasOwnProperty.call(model.MOTIFS_DISPENSE, 'NON_CONCERNE'));
    ok(Object.prototype.hasOwnProperty.call(model.MOTIFS_DISPENSE, 'PAS_CONCERNE'));
    ok(validateParticipationPatch({ statut: 'DISPENSE', motifAbsence: 'AUTO_RETRAIT' }).statut === 'DISPENSE');
    ok(validateParticipationPatch({ statut: 'DISPENSE', motifAbsence: 'NON_CONCERNE' }).statut === 'DISPENSE');
    const taux = computeTaux([
      { personne_id: 'p1', statut: 'PRESENT' },
      { personne_id: 'p2', statut: 'DISPENSE', motif_absence: 'AUTO_RETRAIT' }
    ], [
      { personne_id: 'p1', inclus: true },
      { personne_id: 'p2', inclus: true }
    ]);
    eq(taux.denominator, 1);
    eq(taux.dispenses, 1);
  });

  await record('49-60 - contrats code: endpoint, UX haute et garde-fous metier', async () => {
    ok(routeSrc.includes('/maintenance/pr-abc/reconcile'));
    ok(routeSrc.includes('safeDecodePathPart(pathParts[i])'));
    ok(uiSrc.includes('scope-fiche-primary-actions'));
    ok(uiSrc.indexOf('id="edit-event"') < uiSrc.indexOf('id="postpone-event"'));
    ok(uiSrc.indexOf('id="postpone-event"') < uiSrc.indexOf('id="cancel-event"'));
    ok(uiSrc.includes('renderFicheLifecycleActions'));
    ok(serviceSrc.includes('scope_affectations_pr_abc'));
    ok(!serviceSrc.includes('ABC_NIPS'));
    ok(!serviceSrc.includes('PRABC_NIPS'));
    ok(schemaSrc.includes('migrateMetierActivation3'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}`);
    if(result.proof) console.log(result.proof);
  }
  console.log(`SCOPE-METIER-ACTIVATION-3: ${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
