#!/usr/bin/env node
'use strict';

/** SCOPE-METIER-FOUNDATION-2 - PR-ABC, lifecycle evenement, fondation cycle. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const {
  eventContributionState,
  resolveCycleCompletion,
  isEventStatisticallyCountable
} = require('../netlify/lib/_scope-cycle-rules');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { collectMultisessionReport } = require('../netlify/lib/_scope-multisession-report');

const ROOT = path.join(__dirname, '..');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const ACTOR = { sub: 'scope-metier-foundation-2' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  assert.ok(row, `${domaine}/${niveau} introuvable`);
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
  return { eventId: created.evenement.evenement_id, codeCours: created.evenement.code_cours, version: frozen.version, evenement: frozen.evenement };
}

async function attachCycle(repo, frozen, { cycleId, groupKey, sessionKey }){
  let event = await repo.getEvent(frozen.eventId);
  await repo.updateEventIfVersion(frozen.eventId, event.version, {
    cycle_id: cycleId,
    pr_exercise_group_key: groupKey,
    pr_session_key: sessionKey
  });
  event = await repo.getEvent(frozen.eventId);
  return { ...frozen, version: event.version, evenement: event };
}

async function closeEvent(service, repo, eventId, statuses){
  const event = await repo.getEvent(eventId);
  const attendus = await repo.listAttendus(eventId);
  await service.enregistrerParticipations(eventId, {
    baseVersion: event.version,
    participations: attendus.map((a, index) => ({
      personneId: a.personne_id,
      statut: statuses[index] || 'PRESENT',
      motifAbsence: statuses[index] === 'ABSENT_EXCUSE' ? 'PRIVE' : undefined
    }))
  }, ACTOR);
  const afterSave = await repo.getEvent(eventId);
  return service.cloturer(eventId, { baseVersion: afterSave.version }, ACTOR);
}

(async () => {
  await record('01-08 - PR-ABC utilise cible PR/ABC existante sans repartition A/B/C inventee', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await cible(repo, 'PR', 'ABC');
    const gen = await cible(repo, 'PR', 'GEN');
    const dps = await cible(repo, 'DPS', 'G1');
    const pA = await person(repo, abc, 'ABC001');
    await person(repo, gen, 'PRGEN001');
    await person(repo, dps, 'DPS001');
    await person(repo, abc, 'ABC002', { dateDebut: '2026-09-01' });
    const frozen = await createFrozen(service, abc, '2026-04-21', 'Exercice PR-ABC | Foundation');
    const fiche = await service.lireEvenement(frozen.eventId);
    assert.strictEqual(fiche.attendus.length, 1);
    assert.deepStrictEqual(fiche.attendus.map((a) => a.personne_id), [pA.personne_id]);
    assert.strictEqual(new Set(fiche.attendus.map((a) => a.personne_id)).size, 1);
    assert.strictEqual(fiche.participations.length, 1);
    assert.ok(fiche.attendus.every((a) => a.motif_inclusion && a.motif_inclusion.includes('PR_ABC')));
    assert.ok(!serviceSrc.includes("ABC_NIPS ="));
    assert.ok(!serviceSrc.includes("'7641'"));
    assert.ok(serviceSrc.includes('resolveExpectedByPersonForEvent'));
  });

  await record('09-17 - deplacement JSP conserve identite, code, participations et change la periode', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const b1 = await cible(repo, 'JSP', 'B1');
    await person(repo, b1, 'JSPB1001');
    const frozen = await createFrozen(service, b1, '2026-06-18', 'Exercice JSP 6', { codeCours: '010JB1.445' });
    await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: (await repo.listAttendus(frozen.eventId)).map((a) => ({ personneId: a.personne_id, statut: 'PRESENT' }))
    }, ACTOR);
    const beforeParts = await repo.listParticipations(frozen.eventId);
    const moved = await service.patchEvenement(frozen.eventId, { baseVersion: (await repo.getEvent(frozen.eventId)).version, date: '2026-08-27' }, ACTOR);
    assert.strictEqual(moved.evenement.evenement_id, frozen.eventId);
    assert.strictEqual(moved.evenement.code_cours, '010JB1.445');
    assert.strictEqual(String(moved.evenement.date).slice(0, 10), '2026-08-27');
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 1);
    assert.strictEqual((await repo.listParticipations(frozen.eventId)).length, beforeParts.length);
    assert.strictEqual((await repo.listEvenements({ from: '2026-06-01', to: '2026-06-30' })).length, 0);
    assert.strictEqual((await repo.listEvenements({ from: '2026-08-01', to: '2026-08-31' })).length, 1);
    const journal = await repo.listJournal('evenement', frozen.eventId);
    assert.ok(journal.some((j) => j.action === 'MODIFIER' && j.avant.date === '2026-06-18' && j.apres.date === '2026-08-27'));
    assert.strictEqual((await service.previewModifierEvenement(frozen.eventId, { date: '2026-08-28' })).modifiable, true);
  });

  await record('18-28 - annulation conserve evenement et exclut toutes les statistiques officielles', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const dps = await cible(repo, 'DPS', 'G1');
    await person(repo, dps, 'ANN001');
    await person(repo, dps, 'ANN002');
    const frozen = await createFrozen(service, dps, '2026-05-10', 'DPS annule');
    await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: (await repo.listAttendus(frozen.eventId)).map((a, idx) => ({
        personneId: a.personne_id,
        statut: idx === 0 ? 'PRESENT' : 'ABSENT_EXCUSE',
        motifAbsence: idx === 0 ? undefined : 'PRIVE'
      }))
    }, ACTOR);
    const annul = await service.annulerEvenement(frozen.eventId, { baseVersion: (await repo.getEvent(frozen.eventId)).version, motif: 'Meteo' }, ACTOR);
    assert.strictEqual(annul.evenement.statut, 'ANNULE');
    assert.ok(await repo.getEvent(frozen.eventId));
    assert.strictEqual((await repo.listParticipations(frozen.eventId)).length, 2);
    assert.ok((await repo.listJournal('evenement', frozen.eventId)).some((j) => j.action === 'ANNULER' && j.commentaire === 'Meteo'));
    const evaluated = await analytics.evaluate({ year: 2026, domaine: 'DPS' });
    assert.strictEqual(evaluated.officiel.eventCount, 0);
    assert.strictEqual(evaluated.officiel.denominator, 0);
    assert.strictEqual(evaluated.officiel.numerator, 0);
    assert.strictEqual(evaluated.officiel.volumes.presents, 0);
    assert.strictEqual(evaluated.officiel.volumes.excuses, 0);
    assert.strictEqual(evaluated.officiel.volumes.nonExcuses, 0);
    assert.strictEqual(evaluated.exclusions.annules, 1);
    assert.strictEqual((await service.tauxEvenement(frozen.eventId)).exclus.annule, true);
  });

  await record('29-37 - cycle 2026 isole 2027 et ignore annule pour completude/statistiques', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cycles = createScopeCycleService(repo);
    const pr = await cible(repo, 'PR', 'ABC');
    await person(repo, pr, 'CYC001');
    await repo.insertCycle({ cycle_id: 'cycle-x-2026', cycle_key: 'X-2026', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle X 2026' });
    await repo.insertCycle({ cycle_id: 'cycle-x-2027', cycle_key: 'X-2027', annee: 2027, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle X 2027' });
    const e1 = await attachCycle(repo, await createFrozen(service, pr, '2026-03-01', 'Exercice PR 1.1'), { cycleId: 'cycle-x-2026', groupKey: 'X-2026:PR:1', sessionKey: 'X-2026:PR:1.1' });
    const e2 = await attachCycle(repo, await createFrozen(service, pr, '2026-03-08', 'Exercice PR 1.2'), { cycleId: 'cycle-x-2026', groupKey: 'X-2026:PR:1', sessionKey: 'X-2026:PR:1.2' });
    const e3 = await attachCycle(repo, await createFrozen(service, pr, '2026-03-15', 'Exercice PR 1.3'), { cycleId: 'cycle-x-2026', groupKey: 'X-2026:PR:1', sessionKey: 'X-2026:PR:1.3' });
    await attachCycle(repo, await createFrozen(service, pr, '2027-03-01', 'Exercice PR 1.1'), { cycleId: 'cycle-x-2027', groupKey: 'X-2027:PR:1', sessionKey: 'X-2027:PR:1.1' });
    await closeEvent(service, repo, e1.eventId, ['PRESENT']);
    await closeEvent(service, repo, e2.eventId, ['PRESENT']);
    await service.annulerEvenement(e3.eventId, { baseVersion: (await repo.getEvent(e3.eventId)).version, motif: 'Annulation cycle' }, ACTOR);
    const completion = resolveCycleCompletion({ cycle: await repo.getCycle('cycle-x-2026'), evenements: await repo.listCycleEvents('cycle-x-2026') });
    assert.strictEqual(completion.eventCount, 3);
    assert.strictEqual(completion.exigibleCount, 2);
    assert.strictEqual(completion.cancelledCount, 1);
    assert.strictEqual(completion.complete, true);
    assert.strictEqual((await repo.listCycleEvents('cycle-x-2027')).length, 1);
    assert.strictEqual((await cycles.getCycle('cycle-x-2026')).metrics.completion.complete, true);
    await service.reouvrir(e2.eventId, { baseVersion: (await repo.getEvent(e2.eventId)).version, motif: 'Controle' }, ACTOR);
    assert.strictEqual(resolveCycleCompletion({ cycle: await repo.getCycle('cycle-x-2026'), evenements: await repo.listCycleEvents('cycle-x-2026') }).complete, false);
    await closeEvent(service, repo, e2.eventId, ['PRESENT']);
    assert.strictEqual(resolveCycleCompletion({ cycle: await repo.getCycle('cycle-x-2026'), evenements: await repo.listCycleEvents('cycle-x-2026') }).complete, true);
    assert.strictEqual(isEventStatisticallyCountable(await repo.getEvent(e3.eventId)), false);
    const report = await collectReport(repo, { kind: 'DOMAIN', domaine: 'PR', year: 2026 }, {});
    assert.strictEqual(report.officiel.eventCount, 2);
    assert.strictEqual((await service.lireEvenement(e1.eventId)).cycle.cancelledCount, 1);
    const session = await collectMultisessionReport(repo, e1.eventId, { period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' } });
    assert.strictEqual(session.officiel.eventCount, 2);
    assert.strictEqual(eventContributionState(await repo.getEvent(e1.eventId)).eventId, e1.eventId);
  });

  await record('38-43 - UX minimale expose modifier/reporter/annuler et cycle', async () => {
    assert.ok(uiSrc.includes('Modifier l’événement'));
    assert.ok(uiSrc.includes('id="postpone-event"'));
    assert.ok(uiSrc.includes('renderPostponeEventModal'));
    assert.ok(uiSrc.includes('L’événement sera conservé dans l’historique mais exclu des statistiques.'));
    assert.ok(uiSrc.includes('eventCycleSummary'));
    assert.ok(uiSrc.includes('scope-fiche-cycle'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}`);
    if(result.proof) console.log(result.proof);
  }
  if(failed.length){
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${results.length} blocs / 43 assertions metier`);
})();
