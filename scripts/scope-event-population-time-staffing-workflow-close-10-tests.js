#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-POPULATION-TIME-STAFFING-WORKFLOW-CLOSE-10 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
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

(async () => {
  await record('01 — libellés métier préparer / assigner', async () => {
    const logic = read('assets/js/scope-ui-logic.js');
    includes(logic, 'Préparer les participants');
    includes(logic, 'Assigner les participants');
    notIncludes(logic, 'Générer les attendus');
    notIncludes(logic, 'Figer la population');
  });

  await record('02 — assignation depuis sélection préparée', async () => {
    const ui = read('assets/js/scope-ui.js');
    const api = read('assets/js/scope-api.js');
    const service = read('netlify/lib/_scope-service.js');
    includes(ui, 'selectedPersonIds');
    includes(ui, 'manualAdditions');
    includes(ui, 'assignmentRequest: true');
    includes(ui, 'Assigner les participants ?');
    includes(ui, 'participantAssignmentBusy');
    includes(api, 'figer(id, bodyOrBaseVersion, maybeBaseVersion)');
    includes(service, 'ASSIGNER_PARTICIPANTS');
    includes(service, 'population_vide');
  });

  await record('03 — aperçu exploitable et trié', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, '<th>Sélection</th>');
    includes(ui, 'data-preview-select');
    includes(ui, 'preview-select-all');
    includes(ui, 'preview-unselect-all');
    includes(ui, '+ Ajouter');
    includes(ui, 'Ajout manuel');
    includes(ui, 'grade: person.grade ||');
    includes(ui, "id.grade || '—'");
  });

  await record('04 — source de vérité présence = population assignée', async () => {
    const ui = read('assets/js/scope-ui.js');
    const service = read('netlify/lib/_scope-service.js');
    includes(ui, 'buildSaisieFromFiche');
    includes(ui, 'fiche.attendus');
    includes(service, 'photographieFigee(eventId)');
    includes(service, 'upsertAttendu');
    includes(service, 'if(evenement.population_figee)');
  });

  await record('05 — horaires événement et participants', async () => {
    const ui = read('assets/js/scope-ui.js');
    const service = read('netlify/lib/_scope-service.js');
    includes(ui, 'Début prévu');
    includes(ui, 'Début réel');
    includes(ui, '<th>HORAIRE</th>');
    includes(ui, 'Horaire exercice');
    includes(ui, 'Horaire personnalisé');
    includes(ui, 'D: ');
    includes(ui, 'F: ');
    includes(service, 'durationMinutes(start || evenement.heure_debut_reelle');
  });

  await record('06 — encadrement horaire et préparation DL', async () => {
    const ui = read('assets/js/scope-ui.js');
    const service = read('netlify/lib/_scope-service.js');
    const schema = read('netlify/lib/_scope-schema.js');
    includes(ui, 'enc-time-mode');
    includes(ui, 'enc-creation-dl');
    includes(ui, 'Temps de préparation');
    includes(ui, 'preparationDlMinutes');
    includes(service, 'normalizeLessonPrep');
    includes(service, 'creation_dl_deja_comptee');
    includes(schema, 'creation_dl boolean');
    includes(schema, 'preparation_dl_minutes integer');
  });

  await record('07 — rapports encadrement enrichis', async () => {
    const data = read('netlify/lib/_scope-report-data.js');
    const pdf = read('netlify/lib/_scope-pdf-renderer.js');
    includes(data, 'horaire: start || end');
    includes(data, 'creationDl');
    includes(data, 'preparationDlMinutes');
    includes(pdf, 'Horaire');
    includes(pdf, 'Durée');
    includes(pdf, 'Préparation DL');
  });

  await record('08 — styles UX ciblés', async () => {
    const css = read('assets/css/scope.css');
    includes(css, '.scope-preview-check');
    includes(css, '.scope-preview-selection-actions');
    includes(css, '.scope-time-cell select');
    includes(css, '.scope-enc-dl-toggle');
    includes(css, 'accent-color: #1d4ed8');
  });

  await record('09 — mémoire conserve DL sur upsert sans champ DL', async () => {
    const repo = createMemoryRepo();
    await repo.upsertParticipation({
      evenement_id: '11111111-1111-4111-8111-111111111111',
      personne_id: '22222222-2222-4222-8222-222222222222',
      statut: 'NON_CONCERNE',
      role: 'FORMATEUR',
      creationDl: true,
      preparationDlMinutes: 45
    });
    const second = await repo.upsertParticipation({
      evenement_id: '11111111-1111-4111-8111-111111111111',
      personne_id: '22222222-2222-4222-8222-222222222222',
      statut: 'NON_CONCERNE',
      role: 'FORMATEUR'
    });
    ok(second.creation_dl === true, 'creation_dl conservé');
    ok(second.preparation_dl_minutes === 45, 'temps de préparation conservé');
  });

  await record('10 — protections moteurs existants', async () => {
    const service = read('netlify/lib/_scope-service.js');
    includes(service, 'LEGACY_AGGREGATED');
    includes(service, 'isQuantitatif(evenement)');
    includes(service, 'loadMultiSessionV2State');
    includes(service, 'mirrorMultiSessionV2Participation');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
})();
