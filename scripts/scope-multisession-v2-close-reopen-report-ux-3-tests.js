#!/usr/bin/env node
'use strict';

/** SCOPE — MULTISESSION-V2-CLOSE-REOPEN-REPORT-UX-3 */

const assert = require('assert');
const fs = require('fs');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const L = require('../assets/js/scope-ui-logic');

const ACTOR = {
  sub: 'scope-multisession-v2-close-reopen-report-ux-3',
  roles: ['ADMIN'],
  permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'],
  displayName: 'Testeur SCOPE'
};
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
    metadata: { test: 'scope-multisession-v2-close-reopen-report-ux-3' }
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

async function reopen(service, eventId, motif){
  const fiche = await service.lireEvenement(eventId);
  return service.reouvrir(eventId, { baseVersion: fiche.evenement.version, motif }, ACTOR);
}

async function listItem(service, eventId){
  const list = await service.listEvenements({ annee: 2026 });
  return (list.evenements || []).find((item) => String(item.evenement.evenement_id) === String(eventId));
}

(async () => {
  await record('Test 1 — événement SIMPLE traité réouvrable avec motif', async () => {
    const ctx = await bootstrap('MSV2-RUX-SIMPLE');
    const dapY1 = await ctx.repo.findCible('DAP', 'Y1');
    const simple = await ctx.service.createEvenement({
      date: '2026-06-01',
      domaineCode: 'DAP',
      libelle: 'DAP simple réouverture',
      cibleIds: [dapY1.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await ctx.service.figerPopulation(simple.evenement.evenement_id, { baseVersion: simple.evenement.version }, ACTOR);
    await save(ctx.service, simple.evenement.evenement_id, [
      { personne: ctx.people.A, statut: 'PRESENT' },
      { personne: ctx.people.B, statut: 'PRESENT' },
      { personne: ctx.people.C, statut: 'PRESENT' },
      { personne: ctx.people.D, statut: 'PRESENT' }
    ]);
    const closed = await closeSession(ctx.service, simple.evenement.evenement_id);
    eq(closed.evenement.statut, 'REALISE');
    const reopened = await reopen(ctx.service, simple.evenement.evenement_id, 'Correction MOA');
    eq(reopened.evenement.statut, 'PLANIFIE');
    const fiche = await ctx.service.lireEvenement(simple.evenement.evenement_id);
    ok(!fiche.multiSessionV2, 'DAP simple reste hors V2');
    ok(L.participationStatusesForDomaine('DAP', fiche.participationPolicy).some(([value]) => value === 'PERMUTATION'), 'DAP simple conserve permutation');
  });

  await record('Test 2/3 — session V2 réouverte, reclôturée puis Multi-session refinalisé', async () => {
    const ctx = await bootstrap('MSV2-RUX-CHAIN');
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
    const closed = await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
    eq(closed.multisession.status, 'CLOTUREE');
    await reopen(ctx.service, ctx.s2.eventId, 'Correction après rapport');
    const reopenedFiche = await ctx.service.lireEvenement(ctx.s2.eventId);
    const currentSession = (reopenedFiche.multiSessionV2.sessions || [])
      .find((row) => String(row.evenement_id || row.event_id || '') === String(ctx.s2.eventId));
    eq(reopenedFiche.evenement.statut, 'PLANIFIE');
    eq(currentSession && currentSession.status, 'OUVERTE');
    eq(reopenedFiche.multiSessionV2.globalStatus, 'EN_COURS');
    eq((await ctx.repo.getMultisessionV2(ctx.ms.multisession_id)).status, 'OUVERTE');
    await save(ctx.service, ctx.s2.eventId, [
      { personne: ctx.people.C, statut: 'PRESENT' },
      { personne: ctx.people.D, statut: 'DISPENSE' }
    ]);
    await closeSession(ctx.service, ctx.s2.eventId);
    const ready = await ctx.service.lireEvenement(ctx.s2.eventId);
    eq(ready.multiSessionV2.globalStatus, 'A_FINALISER');
    const refinalized = await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
    eq(refinalized.multisession.status, 'CLOTUREE');
    const item = await listItem(ctx.service, ctx.s2.eventId);
    eq(item.etatMetier.code, 'TRAITE');
  });

  await record('Test 4 — rapport Multi-session professionnel et consolidé', async () => {
    const ctx = await bootstrap('MSV2-RUX-REPORT');
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
    await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.eventId }, { includeNominatif: true });
    ok(report.multiSessionV2, 'rapport marqué Multi-session V2');
    ok(String(report.subtitle || '').includes('Rapport Multi-session'), 'sous-titre professionnel');
    eq(report.sessions.length, 2);
    eq(report.officiel.presents, 1);
    eq(report.officiel.excuses, 1);
    eq(report.officiel.nonExcuses, 1);
    eq(report.officiel.dispenses, 1);
    eq(report.officiel.numerator, 1);
    eq(report.officiel.denominator, 3);
    ok(report.graphs.sessions && report.graphs.repartition && report.graphs.motifs, '2–3 graphiques alimentés');
    eq(report.exceptions.excuses.length, 1);
    eq(report.exceptions.absents.length, 1);
    ok(String(report.tauxExplanation || '').includes('Population cible comptabilisable'), 'formule du taux exposée');
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.eventId, nominatif: true }, ACTOR, { generatedAt: '2026-09-09T08:00:00.000Z' });
    ok(pdf.buffer && pdf.buffer.length > 1000, 'PDF Multi-session rendu');
    ok(Number(pdf.pages || 0) >= 2, 'PDF détaillé multipage');
  });

  await record('Test 5 — erreurs bloquantes routées vers modal centrée', async () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    ok(ui.includes('ScopeFeedback.error(\'Motif obligatoire\', \'Indiquez le motif de la réouverture.\')'), 'motif réouverture dans modal feedback');
    ok(ui.includes('progressTitle: \'Réouverture…\''), 'réouverture passe par withFeedbackAction');
    ok(ui.includes('function renderScopeFeedback()') && ui.includes('scope-feedback-overlay'), 'modal centrale feedback présente');
    ok(!ui.includes("toast('error', 'Motif obligatoire', 'Indiquez le motif de la réouverture.')"), 'ancien toast haut de page supprimé');
  });

  await record('Test 6 — PR legacy protégé', async () => {
    const ctx = await bootstrap('MSV2-RUX-PR');
    const prFiche = await ctx.service.lireEvenement(ctx.pr.evenement.evenement_id);
    ok(!prFiche.multiSessionV2, 'PR legacy non branché V2');
    ok(prFiche.engine !== 'MULTI_SESSION_V2', 'PR legacy reste sur son moteur');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})();
