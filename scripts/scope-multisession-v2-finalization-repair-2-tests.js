#!/usr/bin/env node
'use strict';

/** SCOPE — MULTISESSION-V2-FINALIZATION-REPAIR-2 */

const assert = require('assert');
const fs = require('fs');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const L = require('../assets/js/scope-ui-logic');

const ACTOR = { sub: 'scope-multisession-v2-finalization-repair-2', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
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
  for(const key of ['A', 'B']){
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
  await service.figerPopulation(s1.evenement.evenement_id, { baseVersion: s1.evenement.version }, ACTOR);
  const s2 = await service.createEvenement({
    date: '2026-09-15',
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
    status: 'OUVERTE'
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
  return { repo, service, people, ms, s1: s1.evenement, s2: s2.evenement, pr };
}

async function save(service, eventId, personne, statut){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: [{ personneId: personne.personne_id, statut, role: 'PARTICIPANT' }]
  }, ACTOR);
}

async function listItem(service, eventId){
  const list = await service.listEvenements({ annee: 2026 });
  return (list.evenements || []).find((item) => String(item.evenement.evenement_id) === String(eventId));
}

(async () => {
  await record('TEST 1 — une session clôturée, une ouverte => EN_COURS', async () => {
    const ctx = await bootstrap('MSV2-FIN-1');
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s1.evenement_id, sequence: 1, status: 'CLOTUREE' });
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s2.evenement_id, sequence: 2, status: 'OUVERTE' });
    const item1 = await listItem(ctx.service, ctx.s1.evenement_id);
    const item2 = await listItem(ctx.service, ctx.s2.evenement_id);
    eq(item1.multiSessionV2.globalStatus, 'EN_COURS');
    eq(item2.multiSessionV2.globalStatus, 'EN_COURS');
    eq(item1.etatMetier.code, 'EN_COURS');
  });

  await record('TEST 2 — deux sessions clôturées => A_FINALISER et action Finaliser', async () => {
    const ctx = await bootstrap('MSV2-FIN-2');
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s1.evenement_id, sequence: 1, status: 'CLOTUREE' });
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s2.evenement_id, sequence: 2, status: 'CLOTUREE' });
    const item = await listItem(ctx.service, ctx.s2.evenement_id);
    eq(item.multiSessionV2.globalStatus, 'A_FINALISER');
    eq(item.etatMetier.code, 'A_FINALISER');
    const ui = fs.readFileSync('assets/js/scope-ui.js', 'utf8');
    ok(ui.includes('Session clôturée'), 'libellé session explicite');
    ok(ui.includes('Finaliser'), 'action Finaliser présente');
  });

  await record('TEST 3 — finalisation avec non-renseigné => refus et liste', async () => {
    const ctx = await bootstrap('MSV2-FIN-3');
    await save(ctx.service, ctx.s1.evenement_id, ctx.people.A, 'PRESENT');
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s1.evenement_id, sequence: 1, status: 'CLOTUREE' });
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s2.evenement_id, sequence: 2, status: 'CLOTUREE' });
    let failed = null;
    try { await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR); }
    catch(error) { failed = error; }
    eq(failed && failed.error, 'multisession_v2_incomplete');
    ok((failed.details.unfilledPeople || []).some((row) => row.personneId === ctx.people.B.personne_id), 'B doit être listé');
  });

  await record('TEST 4/5 — finalisation persistée puis rapport accessible', async () => {
    const ctx = await bootstrap('MSV2-FIN-4');
    await save(ctx.service, ctx.s1.evenement_id, ctx.people.A, 'PRESENT');
    await save(ctx.service, ctx.s2.evenement_id, ctx.people.B, 'PRESENT');
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s1.evenement_id, sequence: 1, status: 'CLOTUREE' });
    await ctx.repo.upsertMultisessionV2Session({ multisession_id: ctx.ms.multisession_id, event_id: ctx.s2.evenement_id, sequence: 2, status: 'CLOTUREE' });
    const closed = await ctx.service.cloturerMultiSessionV2(ctx.ms.multisession_id, {}, ACTOR);
    eq(closed.multisession.status, 'CLOTUREE');
    const item = await listItem(ctx.service, ctx.s2.evenement_id);
    eq(item.multiSessionV2.globalStatus, 'CLOTURE');
    eq(item.etatMetier.code, 'TRAITE');
    const report = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.s2.evenement_id }, { includeNominatif: true });
    ok(String(report.title || '').includes('FORMATION GROUPÉE DAP'), 'rapport consolidé accessible');
  });

  await record('TEST 6 — DAP simple et PR legacy inchangés', async () => {
    const ctx = await bootstrap('MSV2-FIN-6');
    const dapY1 = await ctx.repo.findCible('DAP', 'Y1');
    const simple = await ctx.service.createEvenement({
      date: '2026-10-01',
      domaineCode: 'DAP',
      libelle: 'DAP simple session finalization repair',
      cibleIds: [dapY1.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await ctx.service.figerPopulation(simple.evenement.evenement_id, { baseVersion: simple.evenement.version }, ACTOR);
    const simpleFiche = await ctx.service.lireEvenement(simple.evenement.evenement_id);
    ok(!simpleFiche.multiSessionV2, 'DAP simple hors V2');
    ok(L.participationStatusesForDomaine('DAP', simpleFiche.participationPolicy).some(([value]) => value === 'PERMUTATION'), 'DAP simple garde permutation');
    const prFiche = await ctx.service.lireEvenement(ctx.pr.evenement.evenement_id);
    ok(!prFiche.multiSessionV2, 'PR legacy hors V2');
    ok(prFiche.engine !== 'MULTI_SESSION_V2', 'PR legacy reste hors V2');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})();
