#!/usr/bin/env node
'use strict';

/** SCOPE — REPORTS-MULTISESSION-PROFESSIONAL-FINISH-5 */

const assert = require('assert');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const L = require('../assets/js/scope-ui-logic');

const ACTOR = {
  sub: 'scope-reports-multisession-professional-finish-5',
  roles: ['ADMIN'],
  permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'],
  displayName: 'Testeur SCOPE'
};

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function pdfText(buffer){
  const raw = Buffer.from(buffer).toString('latin1');
  const chunks = [];
  raw.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    if(hex.length % 2 === 0) chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
    return _;
  });
  return chunks.join('');
}

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
  await repo.insertObjectif({
    objectif_id: randomUUID(),
    portee: 'DOMAINE',
    domaine_code: 'DAP',
    date_debut: '2026-01-01',
    date_fin: null,
    seuil_pct: 80,
    actif: true
  });
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
  await service.figerPopulation(s1.evenement.evenement_id, { baseVersion: s1.evenement.version }, ACTOR);
  const s2 = await service.createEvenement({
    date: '2026-05-07',
    domaineCode: 'DAP',
    libelle: 'Formation groupée DAP 1.2',
    cibleIds: [dapGen.cible_id],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  await service.figerPopulation(s2.evenement.evenement_id, { baseVersion: s2.evenement.version }, ACTOR);
  const ms = await repo.upsertMultisessionV2({
    code: `${label}-DAP-FORMATION-GROUPEE-2026`,
    label: 'Formation groupée DAP',
    domain: 'DAP',
    period: '2026',
    status: 'OUVERTE',
    metadata: { test: 'scope-reports-multisession-professional-finish-5' }
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
  return { repo, service, people, ms, s1: s1.evenement, s2: s2.evenement, pr: pr.evenement };
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

async function fixture(label){
  const ctx = await bootstrap(label);
  await save(ctx.service, ctx.s1.evenement_id, [
    { personne: ctx.people.A, statut: 'PRESENT' },
    { personne: ctx.people.B, statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL' }
  ]);
  await closeSession(ctx.service, ctx.s1.evenement_id);
  await save(ctx.service, ctx.s2.evenement_id, [
    { personne: ctx.people.C, statut: 'ABSENT_NON_EXCUSE' },
    { personne: ctx.people.D, statut: 'DISPENSE' }
  ]);
  await closeSession(ctx.service, ctx.s2.evenement_id);
  await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
  return ctx;
}

(async () => {
  await record('TEST A — rapport session 1/2 factuel', async () => {
    const ctx = await fixture('MSV2-F5-S1');
    const report = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: ctx.s1.evenement_id }, { includeNominatif: true });
    ok(report.multiSessionV2Session, 'rapport session V2 identifié');
    includes(report.title, 'FORMATION GROUPÉE DAP 1.1');
    eq(report.subtitle, 'Multi-session · Session 1/2');
    eq(report.filename, '2026 23-04 - DAP - Formation groupée DAP 1.1 - Rapport de présence.pdf');
    eq(report.sessionSummary.presents, 1);
    eq(report.sessionSummary.excuses, 1);
    eq(report.sessionSummary.nonRenseignes, 2);
    eq(Object.keys(report.graphs || {}).length, 0);
    ok(!report.nonParticipants, 'pas de liste nominative des non-renseignés');
    const pdf = await generateReport(ctx.repo, { kind: 'SESSION', evenementId: ctx.s1.evenement_id, nominatif: true }, ACTOR, { generatedAt: '2026-09-09T08:00:00.000Z' });
    ok(pdf.buffer && pdf.buffer.length > 1000, 'PDF session 1 rendu');
    const text = pdfText(pdf.buffer);
    includes(text, 'RAPPORT DE PRÉSENCE');
    includes(text, 'FORMATION GROUPÉE DAP 1.1');
    includes(text, 'Multi-session · Session 1/2');
    ok(!text.includes('Nombre de séances'), 'pas de libellé séance en session V2');
    ok(!text.includes('Analyse graphique'), 'pas de graphiques en session V2');
  });

  await record('TEST B — rapport session 2/2 factuel', async () => {
    const ctx = await fixture('MSV2-F5-S2');
    const report = await collectReport(ctx.repo, { kind: 'SESSION', evenementId: ctx.s2.evenement_id }, { includeNominatif: true });
    ok(report.multiSessionV2Session, 'rapport session V2 identifié');
    includes(report.title, 'FORMATION GROUPÉE DAP 1.2');
    eq(report.subtitle, 'Multi-session · Session 2/2');
    eq(report.filename, '2026 07-05 - DAP - Formation groupée DAP 1.2 - Rapport de présence.pdf');
    eq(report.sessionSummary.nonExcuses, 1);
    eq(report.sessionSummary.dispenses, 1);
    eq(Object.keys(report.graphs || {}).length, 0);
  });

  await record('TEST C — rapport Multi-session objectif, écart et filename', async () => {
    const ctx = await fixture('MSV2-F5-MS');
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.evenement_id }, { includeNominatif: true });
    ok(report.multiSessionV2, 'rapport consolidé V2');
    eq(report.filename, '2026 - DAP - Formation groupée DAP - Rapport de présence Multi-session.pdf');
    eq(report.sessions.length, 2);
    eq(report.officiel.objective.thresholdPct, 80);
    eq(report.officiel.gapPct, -46.7);
    includes(report.tauxExplanation, 'Population comptabilisable');
    ok(report.graphs.sessions && report.graphs.repartition && report.graphs.motifs, 'graphiques consolidés conservés');
    const pdf = await generateReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.evenement_id, nominatif: true }, ACTOR, { generatedAt: '2026-09-09T08:00:00.000Z' });
    eq(pdf.filename, '2026 - DAP - Formation groupée DAP - Rapport de présence Multi-session.pdf');
    ok(pdf.buffer && pdf.buffer.length > 1000, 'PDF Multi-session rendu');
    const text = pdfText(pdf.buffer);
    includes(text, 'RAPPORT DE PRÉSENCE MULTI-SESSION');
    includes(text, 'Objectif');
    includes(text, 'Écart');
    includes(text, 'Liste nominative consolidée du personnel');
  });

  await record('TEST D — preview PDF libère le feedback', async () => {
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    includes(ui, "ScopeFeedback.progress('Génération du rapport…'", 'loading rapport explicite');
    includes(ui, 'ScopeFeedback.clear();', 'feedback fermé avant preview');
    includes(ui, "}).catch((error) => {\n      state.loading = false;\n      ScopeFeedback.clear();", 'feedback fermé aussi en erreur');
    includes(ui, 'window.ScopePdfViewer.open(result)', 'preview ouverte après génération');
    includes(ui, 'ScopeFeedback.error(info.title, info.message', 'échec génération en modal centrale');
    const viewer = fs.readFileSync('assets/js/scope-pdf-viewer.js', 'utf8');
    ok(!viewer.includes("replace(/\\s+/g, '_')"), 'viewer ne remplace plus les espaces par underscores');
  });

  await record('TEST E — nommage événement unique', async () => {
    const ctx = await bootstrap('MSV2-F5-EVENT');
    const dapY1 = await ctx.repo.findCible('DAP', 'Y1');
    const simple = await ctx.service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DAP',
      libelle: 'Exercice DAP 1',
      cibleIds: [dapY1.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await ctx.service.figerPopulation(simple.evenement.evenement_id, { baseVersion: simple.evenement.version }, ACTOR);
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: simple.evenement.evenement_id }, { includeNominatif: true });
    eq(report.filename, '2026 12-03 - DAP - Exercice DAP 1 - Rapport de présence.pdf');
  });

  await record('TEST F — protections DAP simple et PR legacy', async () => {
    const ctx = await bootstrap('MSV2-F5-PROTECT');
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
    const prFiche = await ctx.service.lireEvenement(ctx.pr.evenement_id);
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
