#!/usr/bin/env node
'use strict';

/** SCOPE — DELETED-EVENT-PERSISTENCE-ROOT-CAUSE-11.3 */

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
const TOKEN = 'scope-deleted-event-persistence-root-cause-11-3';
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

async function createAssignedPresent(service, cibleId, personneId, spec){
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
  let version = afterSave.version;
  if(spec.cloturer){
    await service.cloturer(created.evenement.evenement_id, { baseVersion: version }, ACTOR);
    const closed = await service.lireEvenement(created.evenement.evenement_id);
    version = closed.version;
  }
  return {
    eventId: created.evenement.evenement_id,
    codeEvent: created.evenement.code_cours,
    version
  };
}

async function hideViaUiService(service, eventId){
  const current = await service.lireEvenement(eventId);
  return service.masquerEvenement(eventId, {
    baseVersion: current.version,
    motif: 'Suppression métier des vues opérationnelles'
  }, ACTOR);
}

async function statusOf(fn){
  try{
    await fn();
    return null;
  }catch(error){
    return Number(error.status || error.statusCode);
  }
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const serviceSrc = read('netlify/lib/_scope-service.js');
  const html = read('scope.html');
  const display = require('../assets/js/scope-personnel-display.js');

  await record('01 — cache-bust et suppression métier persiste hidden_at même avec saisies', async () => {
    includes(html, 'scope-event-deletion-cascade-cleanup-11-4');
    includes(ui, 'const canDelete = true;');
    includes(serviceSrc, "action: 'MASQUER'");
    includes(serviceSrc, 'hidden_at: stamp');
    includes(serviceSrc, 'purgeEventFunctionalChildren');
    notIncludes(serviceSrc, 'Impossible de supprimer cet événement réalisé.');
    notIncludes(serviceSrc, 'des participations ont déjà été enregistrées.');
    notIncludes(serviceSrc, 'une saisie quantitative existe.');
    includes(serviceSrc, 'Un événement historique agrégé ne peut pas être supprimé des vues opérationnelles.');
    includes(ui, 'client.masquer');
  });

  await record('02 — workflow réel UI: créer, assigner, saisir, clôturer, masquerEvenement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11301', cible.cible_id);
    const created = await createAssignedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-14',
      libelle: 'Test recette 4',
      cloturer: true
    });
    const before = await persons.fiche(personne.personne_id, PERIOD);
    const beforeRow = (before.evenements || []).find((row) => String(row.evenementId) === String(created.eventId));
    ok(beforeRow, 'visible et comptable avant suppression');
    eq(display.ficheEventStatutLabel(beforeRow), 'Présent');
    eq(before.kpi.numerator, 1);
    eq(before.kpi.denominator, 1);

    const hidden = await hideViaUiService(service, created.eventId);
    ok(hidden.hidden);
    eq(hidden.alreadyHidden, false);

    const persisted = await repo.getEvent(created.eventId);
    ok(persisted.hidden_at, 'hidden_at persisté par masquerEvenement');
    eq(persisted.evenement_id, created.eventId);
    eq(persisted.code_cours, created.codeEvent);
    eq(persisted.statut, 'REALISE');

    const parts = await repo.listParticipations(created.eventId);
    eq((parts || []).length, 0, 'participations fonctionnelles purgées');
    const attendus = await repo.listAttendus(created.eventId);
    eq((attendus || []).length, 0, 'attendus fonctionnels purgés');

    eq(await statusOf(() => service.lireEvenement(created.eventId)), 404, 'accès direct opérationnel impossible');
    eq(await statusOf(() => service.enregistrerParticipations(created.eventId, {
      baseVersion: persisted.version,
      participations: [{ personneId: personne.personne_id, statut: 'ABSENT_NON_EXCUSE' }]
    }, ACTOR)), 422, 'saisie impossible');
    eq(await statusOf(() => service.patchEvenement(created.eventId, { baseVersion: persisted.version, libelle: 'resurrected' }, ACTOR)), 422);
    eq(await statusOf(() => service.annulerEvenement(created.eventId, { baseVersion: persisted.version, motif: 'nope' }, ACTOR)), 422);
    eq(await statusOf(() => service.reactiverEvenement(created.eventId, { baseVersion: persisted.version, motif: 'nope' }, ACTOR)), 422);

    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(created.eventId)), 'absent historique Personnel');
    ok(!(fiche.evenements || []).some((row) => /Test recette 4/.test(row.libelle || '')));
    eq(fiche.kpi.numerator, 0);
    eq(fiche.kpi.denominator, 0);
    eq(fiche.kpi.volumes.attendus, 0);
    eq(graphEventCount(fiche.graphs && fiche.graphs.domainesAnnees), 0);
    notIncludes(JSON.stringify(fiche.graphs || {}), created.eventId);
    ok(!(fiche.evenements || []).some((row) => display.ficheEventStatutLabel(row) === 'Non renseigné'));

    const evaluated = await analytics.evaluate(Object.assign({ personneId: personne.personne_id }, PERIOD));
    ok(!(evaluated.includedEvents || []).some((row) => String(row.evenementId) === String(created.eventId)));
    ok(!(evaluated.excludedEvents || []).some((row) => String(row.evenementId) === String(created.eventId)));

    const listed = await service.listEvenements({});
    ok(!(listed.evenements || []).some((row) => String((row.evenement || row).evenement_id) === String(created.eventId)));
    eq(CycleRules.isEventOperational(persisted), false);
    eq(CycleRules.isEventCycleExigible(persisted), false);
    eq(CycleRules.isEventStatisticallyCountable(persisted), false);

    const cycle = await repo.insertCycle({
      cycle_key: 'DPS-11-3',
      annee: 2026,
      domaine_code: 'DPS',
      type_cycle: 'DPS',
      libelle: 'Cycle 11.3',
      statut: 'OUVERT'
    });
    await repo.updateEventIfVersion(created.eventId, persisted.version, { cycle_id: cycle.cycle_id });
    const cycleEvents = await repo.listCycleEvents(cycle.cycle_id);
    ok(!(cycleEvents || []).some((row) => String(row.evenement_id) === String(created.eventId)), 'absent des cycles');

    eq(await statusOf(() => collectReport(repo, { kind: 'EVENT', evenementId: created.eventId }, { includeNominatif: true })), 404);
    eq(await statusOf(() => service.tauxEvenement(created.eventId)), 404);
  });

  await record('03 — SAISIE EN COURS + Présents : masquerEvenement persiste quand même', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11302', cible.cible_id);
    const created = await createAssignedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-14',
      libelle: 'Test recette 4',
      cloturer: false
    });
    const ficheBefore = await service.lireEvenement(created.eventId);
    eq(ficheBefore.etatMetier.code, 'SAISIE_EN_COURS');
    const hidden = await hideViaUiService(service, created.eventId);
    ok(hidden.hidden);
    const persisted = await repo.getEvent(created.eventId);
    ok(persisted.hidden_at);
    eq(persisted.statut, 'PLANIFIE');
    eq((await repo.listParticipations(created.eventId)).length, 0, 'participations purgées');
    eq(await statusOf(() => service.lireEvenement(created.eventId)), 404);
    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(created.eventId)));
    eq(fiche.kpi.denominator, 0);
  });

  await record('04 — mélange réalisé + annulé + supprimé via le service réel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11303', cible.cible_id);
    const kept = await createAssignedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-08',
      libelle: 'Toujours réalisé',
      cloturer: true
    });
    const cancelled = await createAssignedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-09',
      libelle: 'Recette 4, test',
      cloturer: true
    });
    const deleted = await createAssignedPresent(service, cible.cible_id, personne.personne_id, {
      date: '2026-04-10',
      libelle: 'Test recette 4',
      cloturer: true
    });
    const cancelledEvent = await repo.getEvent(cancelled.eventId);
    await service.annulerEvenement(cancelled.eventId, { baseVersion: cancelledEvent.version, motif: 'Annulation mélange' }, ACTOR);
    await hideViaUiService(service, deleted.eventId);

    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const labels = (fiche.evenements || []).map((row) => row.libelle).sort();
    eq(labels.includes('Toujours réalisé'), true);
    eq(labels.includes('Recette 4, test'), true);
    eq(labels.includes('Test recette 4'), false);
    const cancelledRow = (fiche.evenements || []).find((row) => row.libelle === 'Recette 4, test');
    eq(display.ficheEventStatutLabel(cancelledRow), 'Annulé');
    eq(display.ficheEventInformations(cancelledRow), 'Événement annulé');
    eq(cancelledRow.href, `#/exercices/${cancelled.eventId}`);
    notIncludes(cancelledRow.href, '/saisie');
    eq(fiche.kpi.numerator, 1);
    eq(fiche.kpi.denominator, 1);
    eq(await statusOf(() => service.lireEvenement(cancelled.eventId)), null, 'ANNULÉ reste consultable');
    eq(await statusOf(() => service.lireEvenement(deleted.eventId)), 404);
    eq(await statusOf(() => service.lireEvenement(kept.eventId)), null);

    const afterCancel = await repo.getEvent(cancelled.eventId);
    const reactivated = await service.reactiverEvenement(cancelled.eventId, { baseVersion: afterCancel.version, motif: 'Réactivation' }, ACTOR);
    eq(reactivated.evenement.evenement_id, cancelled.eventId);
    eq(reactivated.evenement.code_cours, cancelled.codeEvent);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
