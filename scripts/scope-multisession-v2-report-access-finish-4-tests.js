#!/usr/bin/env node
'use strict';

/** SCOPE — MULTISESSION-V2-REPORT-ACCESS-FINISH-4 */

const assert = require('assert');
const fs = require('fs');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const L = require('../assets/js/scope-ui-logic');

const ACTOR = {
  sub: 'scope-multisession-v2-report-access-finish-4',
  roles: ['ADMIN'],
  permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'],
  displayName: 'Testeur SCOPE'
};

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }

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
  for(const key of ['A', 'B', 'C', 'D']){
    const person = await repo.insertPersonne({
      nip: `${label}-${key}`,
      nom: `Nom${key}`,
      prenom: `Prenom${key}`,
      grade: key === 'D' ? 'App' : 'Sap',
      date_entree: '2020-01-01'
    });
    people[key] = person;
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dapY1.cible_id, date_debut: '2020-01-01' });
  }
  const s1 = await service.createEvenement({
    date: '2026-04-23',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.1',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  const f1 = await service.figerPopulation(s1.evenement.evenement_id, { baseVersion: s1.evenement.version }, ACTOR);
  const s2 = await service.createEvenement({
    date: '2026-05-07',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.2',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  const f2 = await service.figerPopulation(s2.evenement.evenement_id, { baseVersion: s2.evenement.version }, ACTOR);
  const ms = await repo.upsertMultisessionV2({
    code: `${label}-DAP-FORMATION-GROUPEE-2026`,
    label: 'Formation groupée DAP',
    domain: 'DAP',
    period: '2026',
    status: 'OUVERTE',
    metadata: { test: 'scope-multisession-v2-report-access-finish-4' }
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

async function finalize(ctx){
  return ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
}

async function closeCompleteMultisession(label){
  const ctx = await bootstrap(label);
  await save(ctx.service, ctx.s1.eventId, [
    { personne: ctx.people.A, statut: 'PRESENT' },
    { personne: ctx.people.B, statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL' }
  ]);
  await closeSession(ctx.service, ctx.s1.eventId);
  await save(ctx.service, ctx.s2.eventId, [
    { personne: ctx.people.C, statut: 'ABSENT_NON_EXCUSE' },
    { personne: ctx.people.D, statut: 'DISPENSE' }
  ]);
  await closeSession(ctx.service, ctx.s2.eventId);
  return ctx;
}

(async () => {
  await record('Test A/B — finalisation depuis liste et fiche appellent le même backend', async () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    includes(ui, 'data-finalize-multisession', 'action Finaliser présente dans la liste');
    includes(ui, 'function finalizeMultiSessionFromList', 'handler Finaliser dédié');
    includes(ui, 'client.cloturerMultiSessionV2(multisessionId, null)', 'liste vers endpoint V2 commun');
    includes(ui, 'function cloturerMultiSessionV2()', 'action fiche conservée');
    includes(ui, 'client.cloturerMultiSessionV2(id, state.fiche.evenement.version)', 'fiche vers endpoint V2 commun');
    includes(ui, 'Finaliser le Multi-session ?', 'confirmation centrale depuis liste');
  });

  await record('Test A — Finaliser depuis liste persiste TRAITÉ', async () => {
    const ctx = await closeCompleteMultisession('MSV2-FINISH-LIST');
    const ready = await ctx.service.lireEvenement(ctx.s2.eventId);
    eq(ready.multiSessionV2.globalStatus, 'A_FINALISER');
    const closed = await finalize(ctx);
    eq(closed.multisession.status, 'CLOTUREE');
    const after = await ctx.service.lireEvenement(ctx.s2.eventId);
    eq(after.multiSessionV2.globalStatus, 'CLOTURE');
    const list = await ctx.service.listEvenements({ annee: 2026 });
    const row = (list.evenements || []).find((item) => String(item.evenement.evenement_id) === String(ctx.s2.eventId));
    eq(row.etatMetier.code, 'TRAITE');
  });

  await record('Test C — rapports session 1, session 2 et consolidé accessibles après finalisation', async () => {
    const ctx = await closeCompleteMultisession('MSV2-FINISH-REPORTS');
    await finalize(ctx);
    const session1 = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: ctx.s1.eventId }, { includeNominatif: true });
    const session2 = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: ctx.s2.eventId }, { includeNominatif: true });
    const consolidated = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.eventId }, { includeNominatif: true });
    eq(session1.kind, 'SESSION');
    eq(session2.kind, 'SESSION');
    ok(!session1.multiSessionV2, 'rapport session 1 conserve son identité documentaire');
    ok(!session2.multiSessionV2, 'rapport session 2 conserve son identité documentaire');
    ok(consolidated.multiSessionV2, 'rapport EVENT V2 reste consolidé');
    eq(consolidated.sessions.length, 2);
    includes(consolidated.event && consolidated.event.libelle, 'Formation groupée DAP');
  });

  await record('Test D — rapport consolidé FINISH-4', async () => {
    const ctx = await closeCompleteMultisession('MSV2-FINISH-PDF');
    await finalize(ctx);
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.eventId }, { includeNominatif: true });
    includes(report.graphs.sessions.question, 'Répartition des participations acquises par session');
    includes(report.tauxExplanation, 'Le taux de participation mesure la proportion du personnel soumis à l’obligation de formation');
    includes(report.tauxExplanation, 'Population cible : 4 personne(s).');
    includes(report.tauxExplanation, 'Dispensés : 1 personne(s).');
    includes(report.tauxExplanation, 'Participation acquise : 1 personne(s).');
    eq(Boolean(report.graphs.motifs), true);
    const renderer = fs.readFileSync('netlify/lib/_scope-pdf-renderer.js', 'utf8');
    includes(renderer, 'Liste nominative consolidée du personnel');
    ok(!renderer.includes("highlightRows: exceptions.excuses.map(() => true)"), 'synthèse excusés sans fond rose généralisé');
    ok(!renderer.includes("highlightRows: exceptions.absents.map(() => true)"), 'synthèse absents sans fond gris généralisé');
    includes(renderer, "r.statut === 'ABSENT_EXCUSE' ? '#fdecef'", 'exceptions conservées dans grande liste');
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.eventId, nominatif: true }, ACTOR, { generatedAt: '2026-09-09T08:00:00.000Z' });
    ok(pdf.buffer && pdf.buffer.length > 1000, 'PDF consolidé rendu');
    ok(Number(pdf.pages || 0) >= 2, 'PDF consolidé multipage');
  });

  await record('Test E — erreur nominative Excusé sans motif', async () => {
    const ctx = await bootstrap('MSV2-FINISH-ERROR');
    try {
      await save(ctx.service, ctx.s1.eventId, [
        { personne: ctx.people.A, statut: 'ABSENT_EXCUSE' },
        { personne: ctx.people.B, statut: 'ABSENT_EXCUSE' }
      ]);
      throw new Error('save should have failed');
    } catch(error) {
      eq(error.status, 422);
      const rows = error.details && error.details.missingExcuseReasons;
      eq(Array.isArray(rows), true);
      eq(rows.length, 2);
      includes(rows[0].nip, 'MSV2-FINISH-ERROR');
      includes(rows[0].errorCode, 'motif_obligatoire');
    }
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    includes(ui, 'function nominativeErrorDetails');
    includes(ui, 'missingExcuseReasons');
    includes(ui, 'scope-feedback-overlay');
  });

  await record('Test F — protections DAP simple et PR legacy', async () => {
    const ctx = await bootstrap('MSV2-FINISH-PROTECT');
    const dapY1 = await ctx.repo.findCible('DAP', 'Y1');
    const simple = await ctx.service.createEvenement({
      date: '2026-06-01',
      domaineCode: 'DAP',
      libelle: 'DAP simple protection',
      cibleIds: [dapY1.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await ctx.service.figerPopulation(simple.evenement.evenement_id, { baseVersion: simple.evenement.version }, ACTOR);
    const simpleFiche = await ctx.service.lireEvenement(simple.evenement.evenement_id);
    const prFiche = await ctx.service.lireEvenement(ctx.pr.evenement.evenement_id);
    ok(!simpleFiche.multiSessionV2, 'DAP simple reste hors V2');
    ok(L.participationStatusesForDomaine('DAP', simpleFiche.participationPolicy).some(([value]) => value === 'PERMUTATION'), 'DAP simple conserve permutation');
    ok(!prFiche.multiSessionV2, 'PR legacy non branché V2');
    ok(prFiche.engine !== 'MULTI_SESSION_V2', 'PR legacy reste legacy');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})();
