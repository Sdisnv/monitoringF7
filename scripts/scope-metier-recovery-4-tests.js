#!/usr/bin/env node
'use strict';

/** SCOPE-METIER-RECOVERY-4 - PR-ABC, cycles derives, actions evenement, navigation SPA. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeCycleService } = require('../netlify/functions/_scope-cycle-service');
const { computeTaux, validateParticipationPatch } = require('../netlify/functions/_scope-rules');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
const cycleServiceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-service.js'), 'utf8');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const ACTOR = { sub: 'scope-metier-recovery-4' };
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

async function person(repo, cibleRow, nip){
  const p = await repo.insertPersonne({ nip, nom: `Nom ${nip}`, prenom: 'Test', grade: 'Sap', date_entree: '2020-01-01' });
  await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cibleRow.cible_id, date_debut: '2026-01-01', date_fin: null });
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

async function setupPrAbcProductionShape(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const abc = await cible(repo, 'PR', 'ABC');
  const gen = await cible(repo, 'PR', 'GEN');
  const abcPeople = [];
  for(let i = 1; i <= 2; i += 1) abcPeople.push(await person(repo, abc, `R4ABC${i}`));
  const genPeople = [];
  for(let i = 1; i <= 5; i += 1) genPeople.push(await person(repo, gen, `R4GEN${i}`));
  const events = [];
  for(const date of ['2026-04-21', '2026-06-10', '2026-10-06']){
    const frozen = await createFrozen(service, gen, date, 'Exercice PR-ABC | Refresh');
    events.push(frozen);
  }
  await repo.upsertParticipation({
    evenement_id: events[0].eventId,
    personne_id: genPeople[0].personne_id,
    statut: 'PRESENT',
    role: 'PARTICIPANT',
    source: 'SAISIE'
  });
  return { repo, service, abc, gen, events, abcPeople, genPeople };
}

async function closeEvent(service, repo, eventId, statut = 'PRESENT'){
  const event = await repo.getEvent(eventId);
  const attendus = (await repo.listAttendus(eventId)).filter((a) => a.inclus !== false);
  await service.enregistrerParticipations(eventId, {
    baseVersion: event.version,
    participations: attendus.map((a) => ({ personneId: a.personne_id, statut }))
  }, ACTOR);
  const saved = await repo.getEvent(eventId);
  return service.cloturer(eventId, { baseVersion: saved.version }, ACTOR);
}

async function patchPr(repo, frozen, groupKey, sessionKey){
  const event = await repo.getEvent(frozen.eventId);
  await repo.updateEventIfVersion(frozen.eventId, event.version, { pr_exercise_group_key: groupKey, pr_session_key: sessionKey });
  return repo.getEvent(frozen.eventId);
}

function scopeUiHooks(){
  const root = { classList: { toggle(){} }, innerHTML: '', querySelectorAll(){ return []; }, querySelector(){ return null; } };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeDemo: { createDemoClient: () => ({}) },
      ScopeApi: null,
      __SCOPE_UI_TEST_HOOKS__: true,
      addEventListener(){},
      clearTimeout,
      setTimeout,
      sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
    },
    document: {
      getElementById(id){ return id === 'scope-root' ? root : null; },
      addEventListener(){},
      querySelectorAll(){ return []; },
      querySelector(){ return null; }
    },
      location: { hash: '#/exercices/evt/saisie', search: '' },
      console,
      URLSearchParams,
      setTimeout,
      clearTimeout
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = sandbox.document;
  sandbox.window.location = sandbox.location;
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(uiSrc, sandbox, { filename: 'assets/js/scope-ui.js' });
  return sandbox.window.ScopeUiTestHooks;
}

(async () => {
  await record('BLOC 1 - PR-ABC dry-run simule PR/ABC puis apply local retargete sans destruction', async () => {
    const ctx = await setupPrAbcProductionShape();
    const beforeTargets = await ctx.repo.listEventCiblesForEvents(ctx.events.map((e) => e.eventId));
    ok(beforeTargets.every((row) => row.domaine_code === 'PR' && row.niveau_code === 'GEN'));
    const dry = await ctx.service.reconcilePrAbcPopulation({ year: 2026 }, ACTOR);
    eq(dry.eventsScanned, 3);
    ok(dry.eventsRecalculated > 0);
    ok(dry.eventsConcerned > 0);
    eq(dry.details.length, 3);
    for(const detail of dry.details){
      eq(detail.currentTargets[0].label, 'PR/GEN');
      eq(detail.expectedTargets[0].label, 'PR/ABC');
      ok(detail.populationBefore > detail.populationExpected);
      eq(detail.populationAfter, detail.populationExpected);
      ok(detail.removedCount > 0);
      ok(detail.protectedCount >= 0);
      ok(Array.isArray(detail.added));
      ok(Array.isArray(detail.removed));
      ok(Array.isArray(detail.preserved));
    }
    ok((await ctx.repo.listEventCiblesForEvents(ctx.events.map((e) => e.eventId))).every((row) => row.niveau_code === 'GEN'));
    const applied = await ctx.service.reconcilePrAbcPopulation({ year: 2026, eventIds: [ctx.events[0].eventId], dryRun: false }, ACTOR);
    eq(applied.eventsScanned, 1);
    const appliedTarget = (await ctx.repo.listEventCiblesForEvents([ctx.events[0].eventId]))[0];
    eq(`${appliedTarget.domaine_code}/${appliedTarget.niveau_code}`, 'PR/ABC');
    eq((await ctx.repo.listAttendus(ctx.events[0].eventId)).filter((a) => a.inclus !== false).length, ctx.abcPeople.length);
    eq((await ctx.repo.getParticipation(ctx.events[0].eventId, ctx.genPeople[0].personne_id)).statut, 'PRESENT');
    ok(!serviceSrc.includes('ABC_NIPS'));
    ok(!serviceSrc.includes('PRABC_NIPS'));
    ok(!serviceSrc.includes('7641'));
  });

  await record('BLOC 2 - cycles derives ouvrables, bornes 2026 strictes et statuts metier', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const base = await cible(repo, 'PR', 'ABC');
    await person(repo, base, 'R4CYC1');
    const groupKey = 'PR:1';
    const ids = [];
    for(let i = 1; i <= 6; i += 1){
      const frozen = await createFrozen(service, base, `2026-03-${String(i).padStart(2, '0')}`, `PR 1.${i} | Base`);
      ids.push(frozen.eventId);
      await patchPr(repo, frozen, groupKey, `PR:1.${i}`);
    }
    const next = await createFrozen(service, base, '2027-03-02', 'PR 1.1 | Base');
    await patchPr(repo, next, groupKey, 'PR:1.1');
    const cycles = createScopeCycleService({
      ...repo,
      async getCycle(id){
        if(String(id).startsWith('derived-pr-cycle:')) throw new Error('uuid query should not receive derived cycle id');
        return repo.getCycle(id);
      }
    });
    let listed = await cycles.listCycles({ annee: 2026, domaine: 'PR' });
    let cycle = listed.cycles.find((row) => row.libelle === 'PR 1 — Base — 2026');
    ok(cycle);
    ok(cycle.cycle_id.startsWith('derived-pr-cycle:'));
    eq(cycle.date_debut, '2026-03-01');
    eq(cycle.date_fin, '2026-03-06');
    eq(cycle.statut, 'PLANIFIE');
    const detail = await cycles.getCycle(cycle.cycle_id);
    eq(detail.evenements.length, 6);
    ok(!detail.evenements.some((event) => String(event.date).startsWith('2027')));
    await closeEvent(service, repo, ids[0]);
    listed = await cycles.listCycles({ annee: 2026, domaine: 'PR' });
    cycle = listed.cycles.find((row) => row.libelle === 'PR 1 — Base — 2026');
    eq(cycle.statut, 'EN_COURS');
    for(const id of ids.slice(1, 5)) await closeEvent(service, repo, id);
    await service.annulerEvenement(ids[5], { baseVersion: (await repo.getEvent(ids[5])).version, motif: 'Seance annulee' }, ACTOR);
    listed = await cycles.listCycles({ annee: 2026, domaine: 'PR' });
    cycle = listed.cycles.find((row) => row.libelle === 'PR 1 — Base — 2026');
    eq(cycle.statut, 'TERMINE');
    eq(cycle.metrics.completion.cancelledCount, 1);
    eq(cycle.metrics.completion.exigibleCount, 5);
    ok(cycleServiceSrc.includes('isDerivedCycleId(cycleId)'));
  });

  await record('BLOC 3 - actions evenement rendues dans la saisie et contrats stables', async () => {
    const hooks = scopeUiHooks();
    const fiche = {
      evenement: {
        evenement_id: 'evt-planifie',
        date: '2026-06-18',
        domaine_code: 'JSP',
        libelle: 'Exercice JSP 6',
        statut: 'PLANIFIE',
        origine: 'NOMINATIF',
        mode_suivi: 'NOMINATIF',
        population_figee: true,
        version: 1
      },
      cibles: [{ domaine_code: 'JSP', niveau_code: 'B1' }],
      attendus: [],
      participations: [],
      personnes: {}
    };
    const html = hooks.renderSaisieHtml(fiche, []);
    ok(/id="edit-event"[^>]*>Modifier/.test(html));
    ok(/id="postpone-event"[^>]*>Reporter/.test(html));
    ok(/id="cancel-event"[^>]*>Annuler/.test(html));
    ok(html.indexOf('id="edit-event"') < html.indexOf('id="save-part"'));
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jsp = await cible(repo, 'JSP', 'B1');
    await person(repo, jsp, 'R4JSP1');
    const frozen = await createFrozen(service, jsp, '2026-06-18', 'Exercice JSP 6', { codeCours: 'JSP6.CODE' });
    await assert.rejects(() => service.annulerEvenement(frozen.eventId, { baseVersion: frozen.version, motif: '' }, ACTOR), /motif/i);
    await assert.rejects(() => service.patchEvenement(frozen.eventId, { baseVersion: frozen.version, statut: 'REPORTE', motif: 'Report' }, ACTOR), /date/i);
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      statut: 'REPORTE',
      date: '2026-08-27',
      motif: 'Report'
    }, ACTOR);
    eq(moved.evenement.evenement_id, frozen.eventId);
    eq(moved.evenement.code_cours, 'JSP6.CODE');
    eq(String(moved.evenement.date).slice(0, 10), '2026-08-27');
  });

  await record('BLOC 4 - navigation nettoie erreurs, ancienne fiche, races et filtres locaux', async () => {
    const hooks = scopeUiHooks();
    const state = hooks.state;
    state.year = '2026';
    state.from = '2026-01-01';
    state.to = '2026-12-31';
    state.statut = 'PLANIFIE';
    state.domaine = 'JSP';
    state.eventListQuery = 'PR';
    state.eventListPage = 4;
    state.toast = { kind: 'error', message: 'Erreur ancienne' };
    state.feedback = { kind: 'error', message: 'Erreur cycle' };
    state.cycleDetailError = 'invalid input syntax for type uuid';
    state.fiche = { evenement: { evenement_id: 'ancienne-fiche', libelle: 'JSP Z' } };
    hooks.prepareRouteChange({ screen: 'liste', nav: 'exercices' }, { screen: 'personnel', nav: 'personnel' });
    eq(state.toast, null);
    eq(state.feedback, null);
    eq(state.eventListQuery, '');
    eq(state.statut, 'tous');
    eq(state.domaine, 'tous');
    eq(state.eventListPage, 1);
    eq(state.year, '2026');
    eq(state.from, '2026-01-01');
    hooks.prepareRouteChange({ screen: 'fiche', nav: 'exercices', id: 'fiche-a' }, { screen: 'fiche', nav: 'exercices', id: 'fiche-b' });
    eq(state.fiche, null);
    eq(state.ficheReady, false);
    ok(uiSrc.includes('token !== state.ficheRequestSeq'));
    ok(uiSrc.includes('token !== state.cycleDetailRequestSeq'));
    ok(uiSrc.includes('token !== state.listRequestSeq'));
    state.personnelQuery = 'Dupont';
    state.personnelOi = 'JSP B1';
    state.personnelSpecialization = 'PR-ABC';
    state.personnelListPage = 3;
    hooks.prepareRouteChange({ screen: 'personnel', nav: 'personnel' }, { screen: 'cycles', nav: 'cycles' });
    eq(state.personnelQuery, '');
    eq(state.personnelOi, '');
    eq(state.personnelSpecialization, '');
    eq(state.personnelListPage, 1);
  });

  await record('BLOC 5 - dispenses ordre, separation, historique et denominator', async () => {
    deep(L.MOTIFS_DISPENSE.map((m) => m.label), [
      'Formateur PR',
      'Formation hors SDIS',
      'Joker',
      'Auto-retrait',
      'Démission en cours',
      'Non concerné'
    ]);
    eq(L.MOTIFS_DISPENSE[2].group, 'operationnel');
    eq(L.MOTIFS_DISPENSE[3].group, 'administratif');
    ok(L.isDispenseMotif('AUTO_RETRAIT'));
    eq(L.motifShortLabel('PAS_CONCERNE'), 'Non concerné');
    eq(L.motifShortLabel('NON_CONCERNE'), 'Non concerné');
    ok(validateParticipationPatch({ statut: 'DISPENSE', motifAbsence: 'AUTO_RETRAIT' }));
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

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}`);
    if(result.proof) console.log(result.proof);
  }
  console.log(`SCOPE-METIER-RECOVERY-4: ${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
