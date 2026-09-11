#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-TEMPORAL-CONFIGURATION-FOUNDATION-9 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-temporal-configuration-foundation-9', permissions: ['events:create', 'references:manage'], roles: ['sdis-admin'] };
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

async function cible(repo, domain){
  const cibles = await repo.listCibles();
  return cibles.find((row) => row.domaine_code === domain && row.niveau_code === 'GEN') || cibles.find((row) => row.domaine_code === domain);
}

async function seedPerson(repo, id = 'person-r9'){
  await repo.upsertPersonne({ personne_id: id, id, nip: '99001', nom: 'Temporel', prenom: 'Test', grade: 'Sap' });
  return id;
}

(async () => {
  await record('01 — baseline migration additive prévue/réelle/personne', async () => {
    const schema = read('netlify/lib/_scope-schema.js');
    includes(schema, 'scope-event-temporal-configuration-foundation-9');
    includes(schema, 'heure_debut_prevue');
    includes(schema, 'heure_fin_prevue');
    includes(schema, 'heure_debut_reelle');
    includes(schema, 'heure_fin_reelle');
    includes(schema, 'duree_reelle_minutes');
    includes(schema, 'heure_debut_individuelle');
    includes(schema, 'heure_fin_individuelle');
    includes(schema, 'duree_individuelle_minutes');
  });

  await record('02 — événement ponctuel conserve le moteur existant et initialise les horaires réels', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const target = await cible(repo, 'DPS');
    const created = await service.createEvenement({
      date: '2026-02-10',
      domaineCode: 'DPS',
      libelle: 'Contrôle ponctuel DPS',
      cibleIds: [target.cible_id],
      modeSuivi: 'NOMINATIF',
      heureDebutPrevue: '08:15',
      heureFinPrevue: '10:45'
    }, ACTOR);
    ok(!created.evenement.definition_version_id, 'aucune configuration forcée');
    eq(created.evenement.heure_debut, '08:15');
    eq(created.evenement.heure_fin, '10:45');
    eq(created.evenement.heure_debut_reelle, '08:15');
    eq(created.evenement.heure_fin_reelle, '10:45');
    eq(created.evenement.duree_reelle_minutes, 150);
  });

  await record('03 — correction horaire réel avant clôture avec passage de minuit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const target = await cible(repo, 'DPS');
    const created = await service.createEvenement({
      date: '2026-02-10',
      domaineCode: 'DPS',
      libelle: 'Garde nocturne',
      cibleIds: [target.cible_id],
      modeSuivi: 'NOMINATIF',
      heureDebut: '22:30',
      heureFin: '23:30'
    }, ACTOR);
    const patched = await service.patchEvenement(created.evenement.evenement_id, {
      baseVersion: created.version,
      libelle: 'Garde nocturne',
      date: '2026-02-10',
      cibleIds: [target.cible_id],
      statut: 'PLANIFIE',
      heureDebutPrevue: '22:30',
      heureFinPrevue: '23:30',
      heureDebutReelle: '23:15',
      heureFinReelle: '00:45'
    }, ACTOR);
    eq(patched.evenement.heure_debut_prevue, '22:30');
    eq(patched.evenement.heure_fin_prevue, '23:30');
    eq(patched.evenement.heure_debut_reelle, '23:15');
    eq(patched.evenement.heure_fin_reelle, '00:45');
    eq(patched.evenement.duree_reelle_minutes, 90);
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    eq(fiche.temporal.actualLabel, '23:15 - 00:45');
    eq(fiche.temporal.durationMinutes, 90);
  });

  await record('04 — création manuelle Multi-session N et X/N sans configuration', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const target = await cible(repo, 'DAP');
    const created = await service.createEvenement({
      date: '2026-04-23',
      domaineCode: 'DAP',
      libelle: 'Formation groupée DAP 1.2',
      cibleIds: [target.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'MULTI',
      nombreSessionsAttendu: 4,
      sessionIndex: 2,
      consolidationActive: true
    }, ACTOR);
    eq(created.exercice.nombre_sessions_attendu, 4);
    eq(created.evenement.session_index, 2);
    eq(created.evenement.session_label, '2/4');
  });

  await record('05 — override horaire individuel optionnel participant', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const target = await cible(repo, 'DPS');
    const personId = await seedPerson(repo);
    const created = await service.createEvenement({
      date: '2026-05-01',
      domaineCode: 'DPS',
      libelle: 'Instruction individuelle',
      cibleIds: [target.cible_id],
      modeSuivi: 'NOMINATIF',
      heureDebut: '08:00',
      heureFin: '12:00'
    }, ACTOR);
    await repo.upsertAttendu({ evenement_id: created.evenement.evenement_id, personne_id: personId, inclus: true, origine: 'TEST' });
    const planned = await repo.updateEventIfVersion(created.evenement.evenement_id, created.version, { population_figee: true });
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: planned.version,
      participations: [{
        personneId: personId,
        statut: 'PRESENT',
        role: 'PARTICIPANT',
        heureDebutIndividuelle: '08:30',
        heureFinIndividuelle: '11:15'
      }]
    }, ACTOR);
    const part = await repo.getParticipation(created.evenement.evenement_id, personId);
    eq(part.heure_debut_individuelle, '08:30');
    eq(part.heure_fin_individuelle, '11:15');
    eq(part.duree_individuelle_minutes, 165);
  });

  await record('06 — UI création refactorée et configuration non forcée', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'Public cible');
    includes(ui, 'Événement ponctuel');
    includes(ui, 'Configuration existante');
    includes(ui, 'Début prévu');
    includes(ui, 'Fin prévue');
    includes(ui, 'Session ${Number(state.sessionIndexChoice || 1)} sur ${sessionCount}');
    includes(ui, "state.configurationModeForm === 'EXISTING'");
    notIncludes(ui, 'Une configuration compatible est proposée automatiquement', 'plus d’auto-sélection affichée');
  });

  await record('07 — projection configuration métier et PR legacy non migré', async () => {
    const service = read('netlify/lib/_scope-service.js');
    const ui = read('assets/js/scope-ui.js');
    includes(service, 'Règles PR historiques');
    includes(service, 'legacyProjection');
    includes(ui, 'Période d’application');
    includes(ui, 'Informations techniques');
    includes(ui, 'scope-business-info');
  });

  await record('08 — PDF enrichi date/horaire/durée sans recalcul métier', async () => {
    const data = read('netlify/lib/_scope-report-data.js');
    const renderer = read('netlify/lib/_scope-pdf-renderer.js');
    includes(data, 'function eventTemporal');
    includes(data, 'durationMinutes(actualStart, actualEnd)');
    includes(renderer, 'Horaire réalisé');
    includes(renderer, 'Durée réalisée');
    includes(renderer, "['Session', 'Événement', 'Date', 'Horaire', 'Durée']");
  });

  await record('09 — payload front sauvegarde horaires individuels', async () => {
    const logic = read('assets/js/scope-ui-logic.js');
    const ui = read('assets/js/scope-ui.js');
    includes(logic, 'heureDebutIndividuelle');
    includes(logic, 'heureFinIndividuelle');
    includes(ui, 'data-individual-time="start"');
    includes(ui, 'data-individual-time="end"');
  });

  await record('10 — protections visibles R6/R8 et libellé Compléter', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'Compléter');
    notIncludes(ui, 'Compléter la saisie');
    includes(ui, 'Voir le rapport');
    includes(ui, 'Finaliser');
  });

  await record('11 — scripts de non-régression ciblés présents', async () => {
    [
      'scripts/scope-event-import-configuration-operationalization-8-tests.js',
      'scripts/scope-cycles-pdf-density-readability-final-7-4-tests.js',
      'scripts/scope-event-config-filter-routing-repair-6-2-tests.js',
      'scripts/scope-multisession-v2-report-access-finish-4-tests.js',
      'scripts/scope-participation-policy-engine-1-tests.js'
    ].forEach((file) => ok(fs.existsSync(path.join(ROOT, file)), `${file} présent`));
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    process.exitCode = 1;
  }
})();
