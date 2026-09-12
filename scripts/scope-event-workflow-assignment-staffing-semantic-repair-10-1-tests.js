#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-WORKFLOW-ASSIGNMENT-STAFFING-SEMANTIC-REPAIR-10.1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const ACTOR = {
  sub: 'scope-event-workflow-assignment-staffing-semantic-repair-10-1',
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

async function seedNominatifEvent(options = {}){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = (await repo.listCibles()).find((row) => row.domaine_code === (options.domaine || 'DPS') && row.niveau_code === (options.niveau || 'B1'))
    || (await repo.listCibles()).find((row) => row.domaine_code === (options.domaine || 'DPS'));
  const personne = await repo.insertPersonne({
    nip: options.nip || '7647',
    nom: options.nom || 'Grünig',
    prenom: options.prenom || 'Thierry',
    grade: options.grade || 'Cap'
  });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
  const created = await service.createEvenement({
    date: options.date || '2026-09-11',
    domaineCode: options.domaine || 'DPS',
    libelle: options.libelle || 'Recette R10.1',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    modeSession: 'SINGLE',
    heureDebutPrevue: options.start || '19:00',
    heureFinPrevue: options.end || '20:30'
  }, ACTOR);
  return { repo, service, cible, personne, created };
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const css = read('assets/css/scope.css');
  const logicSrc = read('assets/js/scope-ui-logic.js');
  const serviceSrc = read('netlify/lib/_scope-service.js');
  const schema = read('netlify/lib/_scope-schema.js');
  const html = read('scope.html');
  const report = read('netlify/lib/_scope-report-data.js');
  const pdf = read('netlify/lib/_scope-pdf-renderer.js');
  const logic = loadLogic();

  await record('01 — cache-bust et migration additive R10.1', async () => {
    includes(html, 'scope-event-assigned-population-reactivation-delete-final-10-3');
    includes(schema, 'hidden_at timestamptz');
    includes(schema, 'scope-event-workflow-assignment-staffing-semantic-repair-10-1');
    includes(serviceSrc, 'async function masquerEvenement');
  });

  await record('02 — annulation: retour liste + état ANNULÉ + hors saisie', async () => {
    includes(ui, "go('#/exercices')");
    includes(ui, "successTitle: 'Événement annulé'");
    includes(ui, "successMessage: 'Événement annulé'");
    includes(serviceSrc, "code: 'ANNULE', label: 'Annulé'");
    includes(ui, "Événement annulé. La saisie des présences n’est plus possible.");
    const { service, created } = await seedNominatifEvent({ libelle: 'Annulation R10.1' });
    const cancelled = await service.annulerEvenement(created.evenement.evenement_id, {
      motif: 'Recette MOA',
      baseVersion: created.version
    }, ACTOR);
    eq(cancelled.evenement.statut, 'ANNULE');
    const listed = await service.listEvenements({ annee: 2026 });
    const row = listed.evenements.find((item) => item.evenement.evenement_id === created.evenement.evenement_id);
    ok(row, 'annulé visible dans la liste');
    eq(row.etatMetier.code, 'ANNULE');
    const taux = await service.tauxEvenement(created.evenement.evenement_id);
    ok(taux.exclus && taux.exclus.annule, 'exclu des statistiques');
    eq(CycleRules.isEventStatisticallyCountable(cancelled.evenement), false);
    eq(CycleRules.isEventCycleExigible(cancelled.evenement), false);
    let saisieError = null;
    try{
      await service.enregistrerParticipations(created.evenement.evenement_id, {
        baseVersion: cancelled.version,
        participations: [{ personneId: 'x', statut: 'PRESENT' }]
      }, ACTOR);
    }catch(error){
      saisieError = error;
    }
    ok(saisieError && saisieError.error === 'statut_invalide', 'saisie bloquée');
  });

  await record('03 — suppression métier: invisible + refus si participations', async () => {
    includes(ui, 'Supprimer l’événement');
    includes(ui, 'Supprimer définitivement cet événement des vues opérationnelles ?');
    includes(ui, "successTitle: 'Événement supprimé'");
    const empty = await seedNominatifEvent({ libelle: 'Suppression vide R10.1', nip: '9001' });
    const hidden = await empty.service.masquerEvenement(empty.created.evenement.evenement_id, {
      baseVersion: empty.created.version
    }, ACTOR);
    ok(hidden.hidden, 'masqué');
    const listed = await empty.service.listEvenements({ annee: 2026 });
    ok(!listed.evenements.some((item) => item.evenement.evenement_id === empty.created.evenement.evenement_id), 'absent de la liste');
    let readError = null;
    try{
      await empty.service.lireEvenement(empty.created.evenement.evenement_id);
    }catch(error){
      readError = error;
    }
    ok(readError && readError.status === 404, 'non exploitable');

    const filled = await seedNominatifEvent({ libelle: 'Suppression refusée R10.1', nip: '9002' });
    const frozen = await filled.service.figerPopulation(filled.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [filled.personne.personne_id],
      baseVersion: filled.created.version
    }, ACTOR);
    await filled.service.enregistrerParticipations(filled.created.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{
        personneId: filled.personne.personne_id,
        statut: 'PRESENT',
        heureDebutIndividuelle: '19:05',
        heureFinIndividuelle: '20:37'
      }]
    }, ACTOR);
    const afterSave = await filled.service.lireEvenement(filled.created.evenement.evenement_id);
    let refuse = null;
    try{
      await filled.service.masquerEvenement(filled.created.evenement.evenement_id, {
        baseVersion: afterSave.version
      }, ACTOR);
    }catch(error){
      refuse = error;
    }
    ok(refuse && refuse.error === 'suppression_interdite', 'refus explicite');
  });

  await record('04 — préparation: tableau, grades, sélection non destructive', async () => {
    includes(ui, 'Préparer les participants');
    includes(ui, "return 'Assignation'");
    includes(ui, "return 'Ajout manuel'");
    notIncludes(ui, "return 'Affectation'");
    notIncludes(ui, '<span>Sélectionner</span>');
    includes(ui, 'data-label="Origine"');
    includes(ui, 'function updatePreviewSelectionCount()');
    includes(ui, 'previewPreparedPersonIds()');
    includes(ui, 'const extras = state.pendingExceptions || [];');
    includes(ui, 'const rows = allPeople.concat(extras);');
    const { service, created, personne } = await seedNominatifEvent({ nip: '7648', grade: 'Cap' });
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    const row = (preview.personnes || []).find((item) => String(item.personneId) === String(personne.personne_id));
    ok(row, 'personne proposée');
    eq(row.grade, 'Cap');
  });

  await record('05 — ajout manuel sans render global + refus explicite', async () => {
    includes(ui, "searchPersonnes(e.target.value, 'preview')");
    includes(ui, 'function addPreviewPerson(id)');
    includes(ui, "ScopeFeedback.error('Ajout impossible'");
    includes(ui, 'Cette personne est inactive à la date de l’événement.');
    includes(ui, 'preview-suggestions');
    notIncludes(ui, "document.getElementById('preview-q')?.addEventListener('input', (e) => {\n      state.personQuery = e.target.value;\n      const q = state.personQuery.trim();\n      if (q.length < SCOPE_SEARCH_MIN_CHARS) { state.personHits = []; render(); return; }");
  });

  await record('06 — assignation unique + source de vérité', async () => {
    includes(ui, 'Assignation des participants en cours…');
    includes(ui, 'ont été assignés.');
    includes(ui, 'participantAssignmentBusy = true');
    const { service, created, personne } = await seedNominatifEvent({ nip: '7649' });
    const assigned = await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [personne.personne_id],
      baseVersion: created.version
    }, ACTOR);
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 1);
    eq(String(fiche.attendus[0].personne_id), String(personne.personne_id));
    ok(assigned.count === 1, 'une personne assignée');
  });

  await record('07 — rapport vide bloqué', async () => {
    includes(ui, 'function eventReportAvailability');
    includes(ui, 'Assignez d’abord les participants.');
    includes(report, 'rapport_indisponible');
  });

  await record('08 — horaire événement visible + minuit', async () => {
    includes(ui, 'D : ');
    includes(ui, 'Durée : ');
    includes(ui, 'scope-inline-ico');
    const { created } = await seedNominatifEvent({
      nip: '7650',
      start: '23:00',
      end: '01:00',
      libelle: 'Minuit R10.1'
    });
    eq(created.evenement.duree_reelle_minutes, 120);
  });

  await record('09 — horaires participants: Plan horaire / Individuel + I-BIS', async () => {
    includes(ui, 'Plan horaire');
    includes(ui, 'Individuel');
    notIncludes(ui, 'Horaire personnalisé');
    includes(logicSrc, 'function isEffectiveParticipationStatut');
    includes(serviceSrc, 'function participationTemporalForStatut');
    eq(logic.isEffectiveParticipationStatut('PRESENT'), true);
    eq(logic.isEffectiveParticipationStatut('ABSENT_EXCUSE'), false);
    eq(logic.isEffectiveParticipationStatut('ABSENT_NON_EXCUSE'), false);
    eq(logic.isEffectiveParticipationStatut('DISPENSE'), false);
    const excused = logic.applyParticipationStatus({
      statut: 'PRESENT',
      heureDebutIndividuelle: '17:00',
      heureFinIndividuelle: '21:00',
      timeOverrideOpen: true
    }, 'ABSENT_EXCUSE');
    eq(excused.heureDebutIndividuelle, '');
    eq(excused.timeOverrideOpen, false);
    const back = logic.applyParticipationStatus(excused, 'PRESENT');
    eq(back.heureDebutIndividuelle, '');
    eq(back.timeOverrideOpen, false);
    const payload = logic.buildPresenceSavePayload([{
      personneId: 'p1',
      statut: 'ABSENT_EXCUSE',
      heureDebutIndividuelle: '17:00',
      heureFinIndividuelle: '21:00',
      inclus: true
    }]);
    eq(payload[0].heureDebutIndividuelle, null);

    const { service, created, personne } = await seedNominatifEvent({ nip: '7651' });
    const frozen = await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [personne.personne_id],
      baseVersion: created.version
    }, ACTOR);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{
        personneId: personne.personne_id,
        statut: 'PRESENT',
        heureDebutIndividuelle: '19:05',
        heureFinIndividuelle: '20:37'
      }]
    }, ACTOR);
    const afterPresent = await service.lireEvenement(created.evenement.evenement_id);
    const presentRow = afterPresent.participations.find((row) => String(row.personne_id) === String(personne.personne_id));
    eq(presentRow.heure_debut_individuelle, '19:05');
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: afterPresent.version,
      participations: [{
        personneId: personne.personne_id,
        statut: 'ABSENT_EXCUSE',
        motif_absence: 'PRIVE',
        heureDebutIndividuelle: '19:05',
        heureFinIndividuelle: '20:37'
      }]
    }, ACTOR);
    const afterExcuse = await service.lireEvenement(created.evenement.evenement_id);
    const excusedRow = afterExcuse.participations.find((row) => String(row.personne_id) === String(personne.personne_id));
    eq(excusedRow.heure_debut_individuelle, null);
    eq(excusedRow.heure_fin_individuelle, null);
  });

  await record('10 — encadrement compact, DL, unicité', async () => {
    includes(ui, 'scope-enc-prep-row');
    includes(ui, 'Descente de leçon');
    includes(ui, 'Préparation déjà comptabilisée sur la');
    includes(ui, 'function encadrementPersonSummary');
    includes(ui, 'Horaire de l’événement');
    includes(css, '.scope-enc-radio input');
    includes(css, 'width: 14px');
    includes(serviceSrc, 'DL déjà comptabilisée sur la');
    includes(pdf, 'Exceptions horaires individuelles');
    includes(report, 'horaireException');
  });

  await record('11 — Multi-session N verrouillé + checkbox gauche + Compléter', async () => {
    includes(ui, 'Cette configuration prévoit ${escapeHtml(String(sessionCount || 2))} sessions.');
    includes(ui, 'Pour un autre nombre de sessions, choisissez une autre configuration');
    const chip = ui.slice(ui.indexOf('function renderTargetPicker'), ui.indexOf('function renderTargetPicker') + 900);
    ok(chip.indexOf('<input') < chip.indexOf('<span>${escapeHtml(eventCibleLabel(c))}</span>'), 'checkbox à gauche');
    includes(ui, "'Compléter'");
    notIncludes(ui, 'Compléter la saisie');
  });

  await record('12 — modification événement: un clic + feedback central', async () => {
    includes(ui, "btn.textContent = 'Enregistrement…'");
    includes(ui, 'eventSaveBusy');
    includes(ui, "ScopeFeedback.success('Événement mis à jour'");
  });

  await record('13 — protections moteurs', async () => {
    includes(serviceSrc, 'LEGACY_AGGREGATED');
    includes(serviceSrc, 'loadMultiSessionV2State');
    includes(serviceSrc, 'isQuantitatif(evenement)');
    notIncludes(read('netlify/lib/_scope-schema.js'), 'drop table scope_evenements');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
})();
