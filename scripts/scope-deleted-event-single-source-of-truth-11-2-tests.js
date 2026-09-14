#!/usr/bin/env node
'use strict';

/** SCOPE — DELETED-EVENT-SINGLE-SOURCE-OF-TRUTH-11.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const TOKEN = 'scope-deleted-event-single-source-of-truth-11-2';
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};
const PERIOD = { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' };
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
  return series.reduce((sum, row) => {
    const points = row.points || [];
    return sum + points.reduce((inner, point) => inner + Number(point.eventCount || 0), 0);
  }, 0);
}

async function seedPersonOnCible(repo, nip, cibleId){
  const personne = await repo.insertPersonne({ nip, nom: nip, prenom: 'Test', grade: 'Sap' });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return personne;
}

async function createClosedPresent(service, cibleId, personneId, spec){
  const created = await service.createEvenement({
    date: spec.date,
    domaineCode: spec.domaineCode || 'DPS',
    libelle: spec.libelle,
    cibleIds: [cibleId],
    modeSuivi: 'NOMINATIF'
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, {
    assignmentRequest: true,
    selectedPersonIds: [personneId],
    baseVersion: created.version
  }, ACTOR);
  const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
  await service.enregistrerParticipations(created.evenement.evenement_id, {
    baseVersion: afterAssign.version,
    participations: [{ personneId, statut: spec.statut || 'PRESENT' }]
  }, ACTOR);
  const afterSave = await service.lireEvenement(created.evenement.evenement_id);
  await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
  const closed = await service.lireEvenement(created.evenement.evenement_id);
  return {
    eventId: created.evenement.evenement_id,
    codeEvent: created.evenement.code_cours,
    version: closed.version
  };
}

async function forceHide(repo, eventId){
  const current = await repo.getEvent(eventId);
  return repo.updateEventIfVersion(eventId, current.version, {
    hidden_at: new Date().toISOString(),
    hidden_par: TOKEN
  });
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const logicSrc = read('assets/js/scope-ui-logic.js');
  const displaySrc = read('assets/js/scope-personnel-display.js');
  const personSrc = read('netlify/lib/_scope-person-service.js');
  const analyticsSrc = read('netlify/lib/_scope-analytics-service.js');
  const memorySrc = read('netlify/lib/_scope-memory.js');
  const html = read('scope.html');
  const logic = require('../assets/js/scope-ui-logic.js');
  const display = require('../assets/js/scope-personnel-display.js');

  await record('01 — helpers unique hidden vs cancelled, cache-bust 11.2', async () => {
    includes(html, TOKEN);
    includes(personSrc, 'function excludeHiddenEventRows');
    includes(personSrc, 'hiddenEvenementIds');
    includes(analyticsSrc, 'if(isHiddenEvenement(event)) continue;');
    includes(memorySrc, 'if(isHiddenEvenement(mapped)) continue;');
    includes(logicSrc, 'function isHiddenEvenement');
    includes(displaySrc, 'function ficheEventIsHidden');
    includes(ui, 'function markHiddenEventUnavailable');
    includes(ui, 'ficheEventIsHidden');
    includes(ui, 'Cet événement n’est plus disponible.');
    ok(CycleRules.isHiddenEvenement({ hidden_at: '2026-04-14T10:00:00.000Z' }));
    ok(!CycleRules.isHiddenEvenement({ statut: 'REALISE' }));
    ok(CycleRules.isCancelledEvenement({ statut: 'ANNULE' }));
    ok(!CycleRules.isCancelledEvenement({ hidden_at: '2026-04-14T10:00:00.000Z', statut: 'REALISE' }));
    ok(!CycleRules.isEventOperational({ hidden_at: '2026-04-14T10:00:00.000Z', statut: 'REALISE' }));
    ok(!CycleRules.isParticipationCountable({ hidden_at: 'x', statut: 'REALISE' }, { statut: 'PRESENT' }));
    eq(logic.isHiddenEvenement({ hidden_at: '2026-04-14T10:00:00.000Z' }), true);
    eq(display.ficheEventIsHidden({ hiddenAt: '2026-04-14T10:00:00.000Z', statutParticipation: 'PRESENT' }), true);
    eq(display.ficheEventStatutLabel({ statutParticipation: 'PRESENT', statutEvenement: 'ANNULE' }), 'Annulé');
  });

  await record('02 — A REALISE Présent visible et comptable ; B ANNULE historique hors KPI ; C hidden invisible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11221', cible.cible_id);
    const closed = await createClosedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-10',
      libelle: 'Test recette 4'
    });
    const before = await persons.fiche(personne.personne_id, PERIOD);
    const beforeRow = (before.evenements || []).find((row) => String(row.evenementId) === String(closed.eventId));
    ok(beforeRow, 'visible tant que REALISE');
    eq(display.ficheEventStatutLabel(beforeRow), 'Présent');
    eq(before.kpi.numerator, 1);
    eq(before.kpi.denominator, 1);
    eq(before.kpi.volumes.attendus, 1);

    const current = await repo.getEvent(closed.eventId);
    await service.annulerEvenement(closed.eventId, { baseVersion: current.version, motif: 'Annulation 11.2' }, ACTOR);
    const cancelledFiche = await persons.fiche(personne.personne_id, PERIOD);
    const cancelledRow = (cancelledFiche.evenements || []).find((row) => String(row.evenementId) === String(closed.eventId));
    ok(cancelledRow, 'ANNULÉ reste dans l’historique');
    eq(display.ficheEventStatutLabel(cancelledRow), 'Annulé');
    eq(display.ficheEventInformations(cancelledRow), 'Événement annulé');
    eq(cancelledFiche.kpi.numerator, 0);
    eq(cancelledFiche.kpi.denominator, 0);
    eq(cancelledRow.href, `#/exercices/${closed.eventId}`);
    notIncludes(cancelledRow.href, '/saisie');

    await forceHide(repo, closed.eventId);
    const hiddenFiche = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(hiddenFiche.evenements || []).some((row) => String(row.evenementId) === String(closed.eventId)), 'hidden absent de l’historique');
    ok(!(hiddenFiche.evenements || []).some((row) => /Test recette 4/.test(row.libelle || '')));
    eq(hiddenFiche.kpi.numerator, 0);
    eq(hiddenFiche.kpi.denominator, 0);
    eq(hiddenFiche.kpi.volumes.attendus, 0);
    eq(graphEventCount(hiddenFiche.graphs && hiddenFiche.graphs.domainesAnnees), 0);
    eq(graphEventCount(hiddenFiche.graphs && hiddenFiche.graphs.repartition), 0);
    notIncludes(JSON.stringify(hiddenFiche.graphs || {}), closed.eventId);
    const evaluated = await analytics.evaluate(Object.assign({ personneId: personne.personne_id }, PERIOD));
    ok(!(evaluated.includedEvents || []).some((row) => String(row.evenementId) === String(closed.eventId)));
    ok(!(evaluated.excludedEvents || []).some((row) => String(row.evenementId) === String(closed.eventId)), 'hidden pas même en excluded');
    const listed = await service.listEvenements({});
    ok(!(listed.evenements || []).some((row) => String((row.evenement || row).evenement_id) === String(closed.eventId)));
    let lireStatus = null;
    try{
      await service.lireEvenement(closed.eventId);
    }catch(error){
      lireStatus = Number(error.status || error.statusCode);
    }
    eq(lireStatus, 404, 'navigation opérationnelle impossible');
    let reportStatus = null;
    try{
      await collectReport(repo, { kind: 'EVENT', evenementId: closed.eventId }, { includeNominatif: true });
    }catch(error){
      reportStatus = Number(error.status || error.statusCode);
    }
    eq(reportStatus, 404, 'rapport opérationnel refuse le hidden');
    ok(!(hiddenFiche.evenements || []).some((row) => display.ficheEventStatutLabel(row) === 'Non renseigné' && String(row.evenementId) === String(closed.eventId)));
  });

  await record('03 — mélange réalisé + annulé + supprimé : seul le réalisé compte', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11222', cible.cible_id);
    const kept = await createClosedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-08',
      libelle: 'Toujours réalisé'
    });
    const cancelled = await createClosedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-09',
      libelle: 'Recette 4, test'
    });
    const hidden = await createClosedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-10',
      libelle: 'Test recette 4'
    });
    const cancelledEvent = await repo.getEvent(cancelled.eventId);
    await service.annulerEvenement(cancelled.eventId, { baseVersion: cancelledEvent.version, motif: 'Annulation mélange' }, ACTOR);
    await forceHide(repo, hidden.eventId);

    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const labels = (fiche.evenements || []).map((row) => row.libelle).sort();
    eq(labels.includes('Toujours réalisé'), true);
    eq(labels.includes('Recette 4, test'), true);
    eq(labels.includes('Test recette 4'), false);
    const cancelledRow = (fiche.evenements || []).find((row) => row.libelle === 'Recette 4, test');
    const keptRow = (fiche.evenements || []).find((row) => row.libelle === 'Toujours réalisé');
    eq(display.ficheEventStatutLabel(cancelledRow), 'Annulé');
    eq(display.ficheEventStatutLabel(keptRow), 'Présent');
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.denominator, 1);
    eq(fiche.kpi.volumes.attendus, 1);
    eq(fiche.kpi.volumes.presents, 1);
    ok(graphEventCount(fiche.graphs && fiche.graphs.domainesAnnees) >= 1);
    const evaluated = await analytics.evaluate(Object.assign({ personneId: personne.personne_id }, PERIOD));
    eq((evaluated.includedEvents || []).length, 1);
    eq(evaluated.includedEvents[0].libelle, 'Toujours réalisé');
  });

  await record('04 — non-régression réactivation ANNULÉ ; hidden jamais réactivable depuis les vues', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11223', cible.cible_id);
    const closed = await createClosedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-12',
      libelle: 'Réactivation 11.2'
    });
    const beforeCancel = await repo.getEvent(closed.eventId);
    await service.annulerEvenement(closed.eventId, { baseVersion: beforeCancel.version, motif: 'tmp' }, ACTOR);
    const cancelled = await repo.getEvent(closed.eventId);
    const reactivated = await service.reactiverEvenement(closed.eventId, { baseVersion: cancelled.version, motif: 'retour' }, ACTOR);
    eq(reactivated.evenement.evenement_id, closed.eventId);
    eq(reactivated.evenement.code_cours, closed.codeEvent);
    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(closed.eventId));
    eq(display.ficheEventStatutLabel(row), 'Présent');
    eq(fiche.kpi.numerator, 1);

    await forceHide(repo, closed.eventId);
    const hidden = await repo.getEvent(closed.eventId);
    let reactivateBlocked = false;
    try{
      await service.reactiverEvenement(closed.eventId, { baseVersion: hidden.version, motif: 'interdit' }, ACTOR);
    }catch(error){
      reactivateBlocked = Number(error.status || error.statusCode) === 422 || Number(error.status || error.statusCode) === 404;
    }
    ok(reactivateBlocked, 'hidden non réactivable depuis les vues opérationnelles');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
