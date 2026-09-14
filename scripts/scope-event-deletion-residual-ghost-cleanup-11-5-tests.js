#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-DELETION-RESIDUAL-GHOST-CLEANUP-11.5 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const display = require('../assets/js/scope-personnel-display.js');

const ROOT = path.join(__dirname, '..');
const TOKEN = 'scope-event-deletion-residual-ghost-cleanup-11-5';
const PERIOD = { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' };
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function notIncludes(text, needle, message){ assertions += 1; assert.ok(!String(text || '').includes(needle), message || `unexpected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function graphEventCount(dataset){
  const series = (dataset && dataset.series) || [];
  return series.reduce((sum, row) => sum + (row.points || []).reduce((inner, point) => inner + Number(point.eventCount || 0), 0), 0);
}

function multisessionCycleId(multisessionId){
  return `multisession-v2-cycle:${Buffer.from(String(multisessionId || ''), 'utf8').toString('base64url')}`;
}

async function statusOf(fn){
  try{
    await fn();
    return null;
  }catch(error){
    return Number(error.status || error.statusCode);
  }
}

async function seedPerson(repo, nip, cibleId){
  const personne = await repo.insertPersonne({ nip, nom: `Nom${nip}`, prenom: 'Test', grade: 'Sap' });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return personne;
}

async function createClosedEvent(repo, service, cibleId, personneId, spec = {}){
  const created = await service.createEvenement({
    date: spec.date || '2026-04-10',
    domaineCode: spec.domaineCode || 'DPS',
    libelle: spec.libelle || 'R11.5 événement',
    cibleIds: [cibleId],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '19:00',
    heureFinPrevue: '21:00'
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, {
    assignmentRequest: true,
    selectedPersonIds: [personneId],
    baseVersion: created.version
  }, ACTOR);
  const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
  await service.enregistrerParticipations(created.evenement.evenement_id, {
    baseVersion: afterAssign.version,
    participations: [{
      personneId,
      statut: spec.statut || 'PRESENT',
      heureDebutIndividuelle: '19:15',
      heureFinIndividuelle: '20:45'
    }]
  }, ACTOR);
  const afterSave = await service.lireEvenement(created.evenement.evenement_id);
  await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
  const event = await repo.getEvent(created.evenement.evenement_id);
  return { eventId: event.evenement_id, version: event.version, codeEvent: event.code_cours };
}

async function legacyHideOnly(repo, eventId){
  const current = await repo.getEvent(eventId);
  return repo.updateEventIfVersion(eventId, current.version, {
    hidden_at: new Date('2026-04-20T10:00:00.000Z').toISOString(),
    hidden_par: TOKEN
  });
}

(async () => {
  const memorySrc = read('netlify/lib/_scope-memory.js');
  const pgSrc = read('netlify/lib/_scope-pg.js');
  const personSrc = read('netlify/lib/_scope-person-service.js');

  await record('01 — invariant repository: séances V2 hidden exclues avant calcul', async () => {
    includes(memorySrc, 'filter((row) => !row.hidden_at && !row.hiddenAt)');
    includes(pgSrc, 'and e.hidden_at is null');
    includes(personSrc, 'excludeHiddenEventRows');
  });

  await record('02 — legacy hidden + enfants résiduels: absent fiche, KPI, graphes, analytics, vigilance, rapports', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const alerts = createScopeAlertsService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, '11501', cible.cible_id);
    const hidden = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-12',
      libelle: 'Ghost legacy supprimé 11.5'
    });
    await legacyHideOnly(repo, hidden.eventId);
    eq((await repo.listParticipations(hidden.eventId)).length, 1, 'résidu legacy conservé dans la table enfant');
    eq((await repo.listAttendus(hidden.eventId)).length, 1, 'attendu legacy conservé dans la table enfant');

    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(hidden.eventId)));
    notIncludes(JSON.stringify(fiche.evenements || []), hidden.eventId);
    eq(fiche.kpi.numerator, 0);
    eq(fiche.kpi.denominator, 0);
    eq(fiche.kpi.volumes.attendus, 0);
    eq(graphEventCount(fiche.graphs && fiche.graphs.domainesAnnees), 0);
    eq(graphEventCount(fiche.graphs && fiche.graphs.repartition), 0);
    notIncludes(JSON.stringify(fiche.graphs || {}), hidden.eventId);

    const evaluated = await analytics.evaluate(Object.assign({ personneId: personne.personne_id }, PERIOD));
    ok(!(evaluated.includedEvents || []).some((row) => String(row.evenementId) === String(hidden.eventId)));
    ok(!(evaluated.excludedEvents || []).some((row) => String(row.evenementId) === String(hidden.eventId)));
    const vigilance = await alerts.listAlerts(Object.assign({}, PERIOD), ACTOR);
    notIncludes(JSON.stringify(vigilance), hidden.eventId);
    eq(await statusOf(() => service.lireEvenement(hidden.eventId)), 404);
    const hiddenEvent = await repo.getEvent(hidden.eventId);
    eq(await statusOf(() => service.enregistrerParticipations(hidden.eventId, {
      baseVersion: hiddenEvent.version,
      participations: [{ personneId: personne.personne_id, statut: 'PRESENT' }]
    }, ACTOR)), 422);
    eq(await statusOf(() => collectReport(repo, { kind: 'EVENT', evenementId: hidden.eventId }, { includeNominatif: true })), 404);
  });

  await record('03 — suppression R11.4 normale: le vrai service purge et masque', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, '11502', cible.cible_id);
    const event = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-13',
      libelle: 'Suppression normale 11.5'
    });
    const res = await service.masquerEvenement(event.eventId, {
      baseVersion: (await repo.getEvent(event.eventId)).version,
      motif: 'Suppression R11.5'
    }, ACTOR);
    ok(res.hidden);
    ok(res.purge.participationsDeleted >= 1);
    ok(res.purge.attendusDeleted >= 1);
    ok((await repo.getEvent(event.eventId)).hidden_at);
    eq((await repo.listParticipations(event.eventId)).length, 0);
    eq((await repo.listAttendus(event.eventId)).length, 0);
    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(event.eventId)));
    eq(fiche.kpi.denominator, 0);
  });

  await record('04 — ANNULÉ visible hors calcul, distinct du supprimé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, '11503', cible.cible_id);
    const cancelled = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-14',
      libelle: 'Recette 4, test'
    });
    await service.annulerEvenement(cancelled.eventId, {
      baseVersion: (await repo.getEvent(cancelled.eventId)).version,
      motif: 'Annulation R11.5'
    }, ACTOR);
    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(cancelled.eventId));
    ok(row, 'ANNULÉ reste visible');
    eq(display.ficheEventStatutLabel(row), 'Annulé');
    eq(display.ficheEventInformations(row), 'Événement annulé');
    eq(fiche.kpi.denominator, 0);
    eq(await statusOf(() => service.lireEvenement(cancelled.eventId)), null);
  });

  await record('05 — mix personnel: réalisé visible et comptable, annulé visible hors calcul, supprimé legacy absent', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, '11504', cible.cible_id);
    const kept = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, { date: '2026-04-08', libelle: 'Réalisé conservé 11.5' });
    const cancelled = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, { date: '2026-04-09', libelle: 'Annulé conservé 11.5' });
    const hidden = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, { date: '2026-04-10', libelle: 'Supprimé legacy 11.5' });
    await service.annulerEvenement(cancelled.eventId, { baseVersion: (await repo.getEvent(cancelled.eventId)).version, motif: 'Annulation mix' }, ACTOR);
    await legacyHideOnly(repo, hidden.eventId);

    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const labels = (fiche.evenements || []).map((row) => row.libelle);
    ok(labels.includes('Réalisé conservé 11.5'));
    ok(labels.includes('Annulé conservé 11.5'));
    ok(!labels.includes('Supprimé legacy 11.5'));
    const keptRow = (fiche.evenements || []).find((row) => String(row.evenementId) === String(kept.eventId));
    const cancelledRow = (fiche.evenements || []).find((row) => String(row.evenementId) === String(cancelled.eventId));
    eq(display.ficheEventStatutLabel(keptRow), 'Présent');
    eq(display.ficheEventStatutLabel(cancelledRow), 'Annulé');
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.denominator, 1);
    eq(fiche.kpi.volumes.attendus, 1);
  });

  await record('06 — multi-session legacy: une séance hidden résiduelle ne revient pas dans le cycle V2', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cycles = createScopeCycleService(repo);
    const cible = await repo.findCible('DAP', 'Y1');
    const personne = await seedPerson(repo, '11505', cible.cible_id);
    const hidden = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, {
      domaineCode: 'DAP',
      date: '2026-04-15',
      libelle: 'Séance hidden legacy 11.5'
    });
    const kept = await createClosedEvent(repo, service, cible.cible_id, personne.personne_id, {
      domaineCode: 'DAP',
      date: '2026-04-16',
      libelle: 'Séance active 11.5'
    });
    const ms = await repo.upsertMultisessionV2({ code: 'R11-5-MS', label: 'Multi-session 11.5', domain: 'DAP', period: '2026' });
    await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: hidden.eventId, sequence: 1, status: 'CLOTUREE' });
    await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: kept.eventId, sequence: 2, status: 'CLOTUREE' });
    await repo.upsertMultisessionV2Population({ multisession_id: ms.multisession_id, person_id: personne.personne_id });
    await repo.upsertMultisessionV2Participation({
      multisession_id: ms.multisession_id,
      session_id: hidden.eventId,
      person_id: personne.personne_id,
      attendance_status: 'PRESENT'
    });
    await legacyHideOnly(repo, hidden.eventId);
    eq((await repo.listParticipations(hidden.eventId)).length, 1, 'participation legacy résiduelle conservée');

    const sessions = await repo.listMultisessionV2Sessions(ms.multisession_id);
    eq(sessions.length, 1);
    eq(String(sessions[0].event_id || sessions[0].evenement_id), String(kept.eventId));
    notIncludes(JSON.stringify(sessions), hidden.eventId);
    const detail = await cycles.getCycle(multisessionCycleId(ms.multisession_id));
    eq((detail.evenements || []).length, 1);
    eq(String((detail.evenements || [])[0].event_id || (detail.evenements || [])[0].evenement_id), String(kept.eventId));
    notIncludes(JSON.stringify(detail), hidden.eventId);
    ok((await repo.listMultisessionV2Population(ms.multisession_id)).length === 1, 'population partagée intacte');
    eq(await statusOf(() => service.lireEvenement(kept.eventId)), null);
    eq(await statusOf(() => service.lireEvenement(hidden.eventId)), 404);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
