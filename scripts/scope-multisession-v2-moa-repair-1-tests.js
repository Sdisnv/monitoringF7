#!/usr/bin/env node
'use strict';

/** SCOPE — MULTISESSION-V2-MOA-REPAIR-1 */

const assert = require('assert');
const fs = require('fs');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const L = require('../assets/js/scope-ui-logic');

const ACTOR = { sub: 'scope-multisession-v2-moa-repair-1', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function bootstrap(label){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const dapGen = await repo.findCible('DAP', 'GEN');
  const dapY1 = await repo.findCible('DAP', 'Y1');
  const prG1 = await repo.findCible('PR', 'G1');
  const people = {};
  for(const key of ['A', 'B', 'C']){
    const person = await repo.insertPersonne({
      nip: `${label}-${key}`,
      nom: `Nom${key}`,
      prenom: `Prenom${key}`,
      grade: 'Sap',
      date_entree: '2020-01-01'
    });
    people[key] = person;
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dapY1.cible_id, date_debut: '2020-01-01' });
  }
  const s1 = await service.createEvenement({
    date: '2026-09-08',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.1',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  const f1 = await service.figerPopulation(s1.evenement.evenement_id, { baseVersion: s1.evenement.version }, ACTOR);
  const s2 = await service.createEvenement({
    date: '2026-09-15',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.2',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  const f2 = await service.figerPopulation(s2.evenement.evenement_id, { baseVersion: s2.evenement.version }, ACTOR);
  const ms = await repo.upsertMultisessionV2({
    code: `${label}-DAP-FORMATION-GROUPEE-1-2026`,
    label: 'Formation groupée DAP',
    domain: 'DAP',
    period: '2026',
    status: 'OUVERTE',
    metadata: { test: 'scope-multisession-v2-moa-repair-1' }
  });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s1.evenement.evenement_id, sequence: 1 });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s2.evenement.evenement_id, sequence: 2 });
  for(const person of Object.values(people)){
    await repo.upsertMultisessionV2Population({
      multisession_id: ms.multisession_id,
      person_id: person.personne_id,
      snapshot: { nip: person.nip },
      provenance: 'TEST_POPULATION'
    });
  }
  const pr = await service.createEvenement({
    date: '2026-09-20',
    domaineCode: 'PR',
    libelle: 'Exercice PR 1.1',
    cibleIds: [prG1.cible_id],
    modeSuivi: 'NOMINATIF',
    modeSession: 'MULTI',
    nombreSessionsAttendu: 2,
    sessionIndex: 1
  }, ACTOR);
  return {
    repo,
    service,
    people,
    ms,
    s1: { eventId: s1.evenement.evenement_id, version: f1.version },
    s2: { eventId: s2.evenement.evenement_id, version: f2.version },
    pr
  };
}

async function save(service, eventId, entries){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: entries.map((entry) => ({
      personneId: entry.personne.personne_id,
      statut: entry.statut,
      role: entry.role || 'PARTICIPANT',
      motifAbsence: entry.motifAbsence || null
    }))
  }, ACTOR);
}

async function closeSession(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

(async () => {
  await record('TEST A — clôture DAP 1.1 autorisée avec personnes non renseignées', async () => {
    const ctx = await bootstrap('MSV2-REPAIR-A');
    await save(ctx.service, ctx.s1.eventId, [
      { personne: ctx.people.A, statut: 'PRESENT' },
      { personne: ctx.people.B, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }
    ]);
    const closed = await closeSession(ctx.service, ctx.s1.eventId);
    eq(closed.evenement.statut, 'REALISE');
    const state = (await ctx.service.lireEvenement(ctx.s2.eventId)).multiSessionV2;
    eq(state.globalStatus, 'EN_COURS');
    eq(state.kpis.aRenseigner, 2);
  });

  await record('TEST B/C/D — DAP 1.2 clôturable, Multi-session à finaliser, refus global nominatif', async () => {
    const ctx = await bootstrap('MSV2-REPAIR-D');
    await save(ctx.service, ctx.s1.eventId, [
      { personne: ctx.people.A, statut: 'PRESENT' },
      { personne: ctx.people.B, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }
    ]);
    await closeSession(ctx.service, ctx.s1.eventId);
    const closed2 = await closeSession(ctx.service, ctx.s2.eventId);
    eq(closed2.evenement.statut, 'REALISE');
    const fiche = await ctx.service.lireEvenement(ctx.s2.eventId);
    eq(fiche.multiSessionV2.allSessionsClosed, true);
    eq(fiche.multiSessionV2.globalStatus, 'A_FINALISER');
    let failed = null;
    try {
      await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
    } catch(error) {
      failed = error;
    }
    eq(failed && failed.error, 'multisession_v2_incomplete');
    ok((failed.details.unfilledPeople || []).some((row) => row.personneId === ctx.people.C.personne_id), 'C doit être listé');
  });

  await record('TEST E/F/G — finalisation persistée, rapport consolidé et compteurs cohérents', async () => {
    const ctx = await bootstrap('MSV2-REPAIR-E');
    await save(ctx.service, ctx.s1.eventId, [{ personne: ctx.people.A, statut: 'PRESENT' }]);
    await closeSession(ctx.service, ctx.s1.eventId);
    await save(ctx.service, ctx.s2.eventId, [
      { personne: ctx.people.B, statut: 'PRESENT' },
      { personne: ctx.people.C, statut: 'DISPENSE' }
    ]);
    await closeSession(ctx.service, ctx.s2.eventId);
    const preClose = await ctx.service.lireEvenement(ctx.s2.eventId);
    eq(preClose.multiSessionV2.kpis.population, 3);
    eq(preClose.multiSessionV2.kpis.participationAcquise, 2);
    eq(preClose.multiSessionV2.kpis.dispenses, 1);
    eq(preClose.multiSessionV2.kpis.restentATraiter, 0);
    eq(preClose.multiSessionV2.kpis.aRenseigner, 0);
    const closed = await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
    eq(closed.multisession.status, 'CLOTUREE');
    const persisted = await ctx.repo.getMultisessionV2(ctx.ms.multisession_id);
    eq(persisted.status, 'CLOTUREE');
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.eventId }, { includeNominatif: true });
    ok(String(report.title || '').includes('FORMATION GROUPÉE DAP'), 'rapport Multi-session titré sur l’exercice');
    eq(report.events.length, 2);
    eq(report.officiel.numerator, 2);
    eq(report.officiel.denominator, 2);
    eq(report.nominatif.length, 3);
  });

  await record('TEST H — protections DAP simple et PR legacy', async () => {
    const ctx = await bootstrap('MSV2-REPAIR-H');
    let permutationFailed = null;
    try {
      await save(ctx.service, ctx.s1.eventId, [{ personne: ctx.people.A, statut: 'PERMUTATION' }]);
    } catch(error) {
      permutationFailed = error;
    }
    eq(permutationFailed && permutationFailed.error, 'multisession_v2_permutation_interdite');
    const dapY1 = await ctx.repo.findCible('DAP', 'Y1');
    const simple = await ctx.service.createEvenement({
      date: '2026-10-01',
      domaineCode: 'DAP',
      libelle: 'DAP simple session repair',
      cibleIds: [dapY1.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await ctx.service.figerPopulation(simple.evenement.evenement_id, { baseVersion: simple.evenement.version }, ACTOR);
    const simpleFiche = await ctx.service.lireEvenement(simple.evenement.evenement_id);
    ok(!simpleFiche.multiSessionV2, 'DAP simple non migré');
    ok(L.participationStatusesForDomaine('DAP', simpleFiche.participationPolicy).some(([value]) => value === 'PERMUTATION'), 'DAP simple conserve permutation');
    const prFiche = await ctx.service.lireEvenement(ctx.pr.evenement.evenement_id);
    ok(!prFiche.multiSessionV2, 'PR non branché V2');
    ok(prFiche.engine !== 'MULTI_SESSION_V2', 'PR reste hors V2');
  });

  await record('Contrat UI — V2 prioritaire sur PR vide, rapport/finalisation et CSS compact', async () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    const css = fs.readFileSync('assets/css/scope.css', 'utf8');
    ok(ui.includes('state.fiche.sessionParticipation || state.fiche.multiSessionV2 || state.fiche.prExerciseParticipation'), 'UI lit V2 avant PR');
    ok(ui.includes('Clôturer le Multi-session'), 'action finalisation visible');
    ok(ui.includes('Voir le rapport'), 'action rapport après clôture visible');
    ok(css.includes('.scope-status-control-group.is-compact .scope-status-control:not(.is-selected)') && css.includes('display: none;'), 'statuts compacts sans blancs');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})();
