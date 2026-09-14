#!/usr/bin/env node
'use strict';

/** SCOPE — CANCELLED-EVENT-SINGLE-SOURCE-OF-TRUTH-11 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const TOKEN = 'scope-cancelled-event-single-source-of-truth-11';
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

function loadLogic(){
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(read('assets/js/scope-ui-logic.js'), sandbox, { filename: 'scope-ui-logic.js' });
  return sandbox.module.exports;
}

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function seedDpsB1CancelledScenario(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const analytics = createScopeAnalyticsService(repo);
  const alerts = createScopeAlertsService(repo);
  const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'B1');
  const people = [];
  for(let i = 1; i <= 5; i += 1){
    const personne = await repo.insertPersonne({
      nip: String(9100 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: `Prenom${i}`,
      grade: 'Sap'
    });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    people.push(personne);
  }
  const created = await service.createEvenement({
    date: '2026-04-14',
    domaineCode: 'DPS',
    libelle: 'Recette 4, test',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '18:45',
    heureFinPrevue: '22:15'
  }, ACTOR);
  const selected = people.map((row) => row.personne_id);
  await service.figerPopulation(created.evenement.evenement_id, {
    assignmentRequest: true,
    selectedPersonIds: selected,
    baseVersion: created.version
  }, ACTOR);
  const [a, b, c, d, e] = selected;
  const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
  await service.enregistrerParticipations(created.evenement.evenement_id, {
    baseVersion: afterAssign.version,
    participations: [
      { personneId: a, statut: 'PRESENT' },
      { personneId: b, statut: 'PRESENT' },
      { personneId: c, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { personneId: d, statut: 'ABSENT_NON_EXCUSE' },
      { personneId: e, statut: 'DISPENSE' }
    ]
  }, ACTOR);
  const afterSave = await service.lireEvenement(created.evenement.evenement_id);
  await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
  return { repo, service, persons, analytics, alerts, cible, people, eventId: created.evenement.evenement_id, codeEvent: created.evenement.code_cours };
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const logicSrc = read('assets/js/scope-ui-logic.js');
  const displaySrc = read('assets/js/scope-personnel-display.js');
  const personSrc = read('netlify/lib/_scope-person-service.js');
  const cycleSrc = read('netlify/lib/_scope-cycle-rules.js');
  const analyticsSrc = read('netlify/lib/_scope-analytics-service.js');
  const memorySrc = read('netlify/lib/_scope-memory.js');
  const schema = read('netlify/lib/_scope-schema.js');
  const html = read('scope.html');
  const pdfSrc = read('netlify/lib/_scope-pdf-renderer.js');
  const logic = loadLogic();
  const display = require('../assets/js/scope-personnel-display.js');

  await record('01 — cache-bust, helper unique, migration additive', async () => {
    includes(html, TOKEN);
    includes(schema, `LATEST_SCOPE_SCHEMA_VERSION = '${TOKEN}'`);
    includes(schema, 'async function migrateCancelledEventSingleSourceOfTruth11');
    includes(schema, `values ('${TOKEN}') on conflict (version) do nothing`);
    includes(schema, 'scope-attendus-retrait-schema-contract-repair-10-3-2');
    notIncludes(schema, 'drop table scope_evenements');
    includes(cycleSrc, 'function isCancelledEvenement');
    includes(cycleSrc, 'function isParticipationCountable');
    includes(logicSrc, 'function isCancelledEvenement');
    includes(logicSrc, 'function isParticipationCountable');
    includes(displaySrc, 'function ficheEventIsCancelled');
    includes(personSrc, 'async function cancelledHistoricalEvents');
    includes(analyticsSrc, 'if(isCancelledEvenement(event)) return { include: false, reason: \'annule\', mode }');
    includes(memorySrc, 'if(isHiddenEvenement(mapped)) continue');
    includes(memorySrc, 'if(!evenementId && isCancelledEvenement(mapped)) continue');
    includes(ui, 'location.hash = `#/exercices/${r.id}`');
    includes(pdfSrc, 'hors taux officiel et hors heures de formation');
    ok(CycleRules.isCancelledEvenement({ statut: 'ANNULE' }));
    ok(!CycleRules.isCancelledEvenement({ statut: 'REALISE' }));
    ok(!CycleRules.isParticipationCountable({ statut: 'ANNULE' }, { statut: 'PRESENT' }));
    ok(CycleRules.isParticipationCountable({ statut: 'REALISE' }, { statut: 'PRESENT', role: 'PARTICIPANT' }));
    eq(logic.isCancelledEvenement({ statut: 'ANNULE' }), true);
    eq(logic.principalCta({ statut: 'ANNULE', populationFigee: true }), null);
    eq(display.ficheEventStatutLabel({ statutParticipation: 'PRESENT', statutEvenement: 'ANNULE' }), 'Annulé');
    eq(display.ficheEventInformations({ statutParticipation: 'PRESENT', cancelled: true }), 'Événement annulé');
    eq(display.ficheEventStatutLabel({ statutParticipation: 'PRESENT' }), 'Présent');
  });

  await record('02 — avant annulation : Présent compte, après : ANNULÉ hors stats', async () => {
    const ctx = await seedDpsB1CancelledScenario();
    const period = { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' };
    const presentId = ctx.people[0].personne_id;
    const before = await ctx.persons.fiche(presentId, period);
    const beforeRow = (before.evenements || []).find((row) => String(row.evenementId) === String(ctx.eventId));
    ok(beforeRow, 'événement visible avant annulation');
    eq(display.ficheEventStatutLabel(beforeRow), 'Présent');
    eq(before.kpi.numerator, 1);
    eq(before.kpi.denominator, 1);
    eq(before.kpi.volumes.presents, 1);
    eq(before.kpi.eventCount, 1);

    const closed = await ctx.repo.getEvent(ctx.eventId);
    const cancelled = await ctx.service.annulerEvenement(ctx.eventId, {
      baseVersion: closed.version,
      motif: 'Recette 11 — événement n’a pas eu lieu'
    }, ACTOR);
    eq(cancelled.evenement.statut, 'ANNULE');
    eq(cancelled.evenement.evenement_id, ctx.eventId);
    eq(cancelled.evenement.code_cours, ctx.codeEvent);

    const list = await ctx.service.listEvenements({});
    const listed = (list.evenements || []).find((item) => String((item.evenement || item).evenement_id) === String(ctx.eventId));
    const listedEvent = listed && listed.evenement ? listed.evenement : listed;
    ok(listedEvent, 'ANNULÉ reste visible dans la liste');
    eq(String(listedEvent.statut).toUpperCase(), 'ANNULE');
    eq((listed.etatMetier || listed.etat_metier || {}).code, 'ANNULE');
    eq((listed.compteurs || {}).kind, 'EXCLUDED');
    eq((listed.compteurs || {}).presents, 0);

    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    eq(fiche.evenement.statut, 'ANNULE');
    eq(fiche.etatMetier.code, 'ANNULE');
    eq(fiche.compteurs.kind, 'EXCLUDED');
    eq(fiche.compteurs.numerator, 0);
    eq(fiche.compteurs.denominator, 0);
    eq(fiche.compteurs.presents, 0);
    eq((fiche.participations || []).length, 5, 'participations historiques conservées');
    eq(logic.principalCta({ statut: fiche.evenement.statut, populationFigee: fiche.evenement.population_figee }), null);

    const after = await ctx.persons.fiche(presentId, period);
    const afterRow = (after.evenements || []).find((row) => String(row.evenementId) === String(ctx.eventId));
    ok(afterRow, 'événement annulé reste dans l’historique individuel');
    eq(display.ficheEventStatutLabel(afterRow), 'Annulé');
    eq(display.ficheEventInformations(afterRow), 'Événement annulé');
    notIncludes(display.ficheEventStatutLabel(afterRow), 'Présent');
    eq(afterRow.href, `#/exercices/${ctx.eventId}`);
    notIncludes(afterRow.href, '/saisie');
    eq(after.kpi.numerator, 0, 'exclu numérateur');
    eq(after.kpi.denominator, 0, 'exclu dénominateur');
    eq(after.kpi.eventCount, 0);
    eq(after.kpi.volumes.presents, 0);
    eq(after.kpi.volumes.excuses, 0);
    eq(after.kpi.volumes.nonExcuses, 0);
    eq(after.kpi.volumes.dispenses, 0);
    eq(after.kpi.volumes.attendus, 0);

    const evaluated = await ctx.analytics.evaluate(Object.assign({ personneId: presentId }, period));
    ok(!(evaluated.includedEvents || []).some((row) => String(row.evenementId) === String(ctx.eventId)));
    ok((evaluated.excludedEvents || []).some((row) => String(row.evenementId) === String(ctx.eventId) && row.reason === 'annule')
      || !(evaluated.includedEvents || []).some((row) => String(row.evenementId) === String(ctx.eventId)));

    const hours = (evaluated.includedEvents || []).reduce((sum, row) => sum + Number((row.volumes && row.volumes.durationMinutes) || 0), 0);
    eq(hours, 0, 'heures excluent ANNULÉ');
    ok(!CycleRules.isEventStatisticallyCountable(fiche.evenement));
    ok(!CycleRules.eventContributionState(fiche.evenement).contributesToCycleCompletion);
    ok(!CycleRules.isParticipationCountable(fiche.evenement, { statut: 'PRESENT', role: 'PARTICIPANT' }));

    const domainReport = await collectReport(ctx.repo, {
      kind: 'DOMAIN',
      domaineCode: 'DPS',
      from: period.from,
      to: period.to
    }, {});
    eq((domainReport.officiel && domainReport.officiel.eventCount) || 0, 0, 'rapport consolidé exclut ANNULÉ');

    const eventReport = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.eventId }, { includeNominatif: true });
    eq(eventReport.officiel.kind, 'EXCLUDED');
    eq(eventReport.officiel.officiel, false);
    eq(eventReport.officiel.percentage, null);
    eq(eventReport.officiel.numerator, 0);

    let saisieBlocked = false;
    try{
      await ctx.service.enregistrerParticipations(ctx.eventId, {
        baseVersion: fiche.version,
        participations: [{ personneId: presentId, statut: 'ABSENT_NON_EXCUSE' }]
      }, ACTOR);
    }catch(error){
      saisieBlocked = Number(error.status || error.statusCode) === 422;
    }
    ok(saisieBlocked, 'route saisie interdite si ANNULÉ');

    const listedAlerts = await ctx.alerts.listAlerts({ from: period.from, to: period.to });
    const alertText = JSON.stringify(listedAlerts);
    notIncludes(alertText, ctx.eventId, 'vigilance sans contribution de l’événement annulé');
  });

  await record('03 — réactivation conserve evenement_id et ne duplique pas les participations', async () => {
    const ctx = await seedDpsB1CancelledScenario();
    const closed = await ctx.repo.getEvent(ctx.eventId);
    await ctx.service.annulerEvenement(ctx.eventId, {
      baseVersion: closed.version,
      motif: 'Recette 11 — annulation puis réactivation'
    }, ACTOR);
    const cancelled = await ctx.repo.getEvent(ctx.eventId);
    const partsBefore = await ctx.repo.listParticipations(ctx.eventId);
    const reactivated = await ctx.service.reactiverEvenement(ctx.eventId, {
      baseVersion: cancelled.version,
      motif: 'Recette 11 — réactivation'
    }, ACTOR);
    eq(reactivated.evenement.evenement_id, ctx.eventId);
    eq(reactivated.evenement.code_cours, ctx.codeEvent);
    eq(reactivated.evenement.statut, 'REALISE', 'clôturé avant annulation → REALISE');
    const allEvents = await ctx.repo.listEvenements({});
    eq(allEvents.filter((row) => String(row.code_cours) === String(ctx.codeEvent)).length, 1, 'pas de duplication d’événement');
    const partsAfter = await ctx.repo.listParticipations(ctx.eventId);
    eq(partsAfter.length, partsBefore.length);
    const personIds = partsAfter.map((row) => String(row.personne_id)).sort();
    eq(new Set(personIds).size, personIds.length, 'pas de duplication de participations');
    eq(partsAfter.filter((row) => row.statut === 'PRESENT').length, 2);
    const presentFiche = await ctx.persons.fiche(ctx.people[0].personne_id, { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' });
    const row = (presentFiche.evenements || []).find((item) => String(item.evenementId) === String(ctx.eventId));
    eq(display.ficheEventStatutLabel(row), 'Présent');
    eq(presentFiche.kpi.numerator, 1);
    eq(presentFiche.kpi.denominator, 1);
  });

  await record('04 — navigation individuelle vers fiche, jamais /saisie', async () => {
    includes(ui, 'if (ev && L.isCancelledEvenement && L.isCancelledEvenement(ev))');
    includes(ui, 'location.hash = `#/exercices/${r.id}`');
    includes(personSrc, 'href: `#/exercices/${event.evenement_id}`');
    notIncludes(personSrc, '/saisie');
    includes(ui, 'Événement ANNULÉ — n’a pas eu lieu');
    includes(ui, 'Événement annulé — hors statistiques de présence');
    ok(logic.cancelledEventHref('abc').endsWith('/exercices/abc'));
    notIncludes(logic.cancelledEventHref('abc'), '/saisie');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
