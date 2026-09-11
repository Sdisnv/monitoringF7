#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-CREATION-PROFESSIONAL-UX-FINAL-9.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-creation-professional-ux-final-9-2', permissions: ['events:create', 'references:manage'], roles: ['sdis-admin'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function notIncludes(text, needle, message){ assertions += 1; assert.ok(!String(text || '').includes(needle), message || `unexpected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

function sourceBlock(source, marker, size = 900){
  const index = source.indexOf(marker);
  ok(index >= 0, `${marker} introuvable`);
  return source.slice(index, index + size);
}

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

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const css = read('assets/css/scope.css');
  const logic = loadLogic();
  const chipBlock = sourceBlock(css, '.scope-target-chip {', 420);
  const startBlock = sourceBlock(ui, "document.getElementById('new-heure-debut')?.addEventListener('input'");
  const endBlock = sourceBlock(ui, "document.getElementById('new-heure-fin')?.addEventListener('input'");
  const domainBlock = sourceBlock(ui, "document.getElementById('new-domaine')?.addEventListener('change'");
  const dateBlock = sourceBlock(ui, "document.getElementById('new-date')?.addEventListener('change'");
  const libelleBlock = sourceBlock(ui, "document.getElementById('new-libelle')?.addEventListener('input'");
  const cibleBlock = sourceBlock(ui, "document.querySelectorAll('#new-cibles input[type=\"checkbox\"]')");
  const configBlock = sourceBlock(ui, "document.getElementById('new-definition-version')?.addEventListener('change'", 1400);
  const sessionBlock = sourceBlock(ui, "document.getElementById('new-session-count')?.addEventListener('input'");
  const suiviBlock = sourceBlock(ui, "document.querySelectorAll('input[name=\"new-mode\"]').forEach((radio) => {", 280);

  await record('01 — domaine vide par défaut', async () => {
    includes(ui, "domaineForm: ''");
    includes(ui, '<option value="">Choisir un domaine</option>');
    includes(ui, 'function resetNouveauForm()');
    includes(ui, "state.domaineForm = ''");
    notIncludes(ui, "domaineForm: 'DPS'");
    notIncludes(ui, "state.domaineForm || 'DPS'");
  });

  await record('02 — aucune cible visible avant choix domaine', async () => {
    includes(ui, 'const hasDomaine = Boolean(domaine)');
    includes(ui, 'id="new-target-domain-help"');
    includes(ui, 'Sélectionnez d’abord un domaine pour afficher les publics et configurations disponibles.');
    includes(ui, 'hasDomaine ? state.referentiels.cibles.filter((c) => c.domaineCode === domaine) : []');
  });

  await record('03 — aucune configuration proposée avant domaine', async () => {
    includes(ui, "hasDomaine && compatibleVersions.length ? '' : 'disabled'");
    includes(ui, '${hasDomaine ? configOptions : \'\'}');
    includes(ui, 'Sélectionnez d’abord un domaine');
  });

  await record('04 — changement domaine nettoie les cibles incompatibles', async () => {
    includes(domainBlock, '.filter((c) => c.domaineCode === nextDomain)');
    includes(domainBlock, 'state.cibleForm = (state.cibleForm || []).filter((id) => allowed.has(id))');
    includes(domainBlock, "state.configurationModeForm = 'NONE'");
    includes(domainBlock, "state.definitionVersionForm = ''");
  });

  await record('05 — public cible rendu depuis référentiels', async () => {
    includes(ui, 'state.referentiels.cibles.filter((c) => c.domaineCode === domaine)');
    includes(ui, 'renderTargetPicker');
    notIncludes(ui, 'Général, B1, B2, C1, G1');
  });

  await record('06 — CAD affiché Cadets', async () => {
    eq(logic.cibleMetierLabel('JSP', 'CAD'), 'Cadets');
    eq(logic.cibleMetierLabel({ domaineCode: 'JSP', niveauCode: 'CAD' }), 'Cadets');
  });

  await record('07 — VL affiché Cond. VL', async () => {
    eq(logic.cibleMetierLabel('AUTO', 'VL'), 'Cond. VL');
    eq(logic.cibleMetierLabel({ domaineCode: 'AUTO', niveauCode: 'VL', libelle: 'AUTO VL' }), 'Cond. VL');
  });

  await record('08 — PL affiché Cond. PL', async () => {
    eq(logic.cibleMetierLabel('AUTO', 'PL'), 'Cond. PL');
    eq(logic.niveauAffiche('AUTO', 'VL'), 'VL');
    eq(logic.niveauAffiche('JSP', 'CAD'), 'CAD');
  });

  await record('09 — absence grosses tuiles/bulles actuelles', async () => {
    notIncludes(chipBlock, 'border-radius: 999px');
    notIncludes(chipBlock, 'min-height: 34px');
    notIncludes(chipBlock, 'padding: 7px 12px 7px 34px');
    notIncludes(css, '.scope-target-chip {\n  position: relative');
    notIncludes(css, '.scope-target-chip input {\n  position: absolute');
  });

  await record('10 — checkbox + label structurés/accessibles', async () => {
    includes(ui, 'class="scope-target-chip" for="');
    includes(ui, 'role="group" aria-label="Public cible"');
    includes(css, 'align-items: center');
    includes(chipBlock, 'width: 1em');
    includes(chipBlock, 'height: 1em');
    includes(css, '.scope-target-chip:has(input:focus-visible)');
  });

  await record('11 — libellé + public cible structurés ensemble en desktop', async () => {
    includes(ui, 'scope-identification-secondary');
    includes(ui, 'scope-identification-libelle');
    includes(ui, 'scope-identification-targets');
    includes(css, 'grid-template-columns: minmax(260px, 0.48fr) minmax(280px, 1.02fr)');
    includes(css, 'grid-template-columns: minmax(150px, 1fr) minmax(120px, .8fr) minmax(120px, .8fr) minmax(160px, 1.1fr)');
  });

  await record('12 — récapitulatif actualisé sur date', async () => {
    includes(ui, 'function updateNewEventRecap()');
    includes(ui, 'function buildNewEventRecapModel()');
    includes(dateBlock, 'state.dateForm = e.target.value');
    includes(dateBlock, 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-identity-primary"');
  });

  await record('13 — récapitulatif actualisé sur heure', async () => {
    includes(startBlock, 'updateNewDurationPreview();');
    includes(endBlock, 'updateNewDurationPreview();');
    includes(ui, 'updateNewEventRecap();');
    includes(sourceBlock(ui, 'function updateNewDurationPreview()'), 'updateNewEventRecap();');
  });

  await record('14 — récapitulatif actualisé sur domaine', async () => {
    includes(domainBlock, 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-identity-secondary"');
  });

  await record('15 — récapitulatif actualisé sur libellé', async () => {
    includes(libelleBlock, 'state.libelleForm = e.target.value');
    includes(libelleBlock, 'updateNewEventRecap();');
    notIncludes(libelleBlock, 'render();');
  });

  await record('16 — récapitulatif actualisé sur cible', async () => {
    includes(cibleBlock, 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-targets"');
  });

  await record('17 — récapitulatif actualisé sur configuration', async () => {
    includes(configBlock, 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-config-primary"');
    includes(ui, 'Événement ponctuel');
  });

  await record('18 — récapitulatif actualisé sur organisation/session', async () => {
    includes(sessionBlock, 'updateNewSessionIndexOptions();');
    includes(sourceBlock(ui, 'function updateNewSessionIndexOptions()'), 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-config-secondary"');
  });

  await record('19 — récapitulatif actualisé sur mode de suivi', async () => {
    includes(suiviBlock, 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-suivi"');
    notIncludes(suiviBlock, 'render();');
  });

  await record('20 — aucun render() destructif sur input horaire', async () => {
    includes(startBlock, 'updateNewDurationPreview();');
    includes(endBlock, 'updateNewDurationPreview();');
    notIncludes(startBlock, 'render();');
    notIncludes(endBlock, 'render();');
  });

  await record('21 — événement ponctuel toujours possible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const created = await service.createEvenement({
      date: '2026-06-12',
      domaineCode: 'DPS',
      libelle: 'Création ponctuelle R9.2',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'SINGLE',
      heureDebutPrevue: '19:00',
      heureFinPrevue: '21:30'
    }, ACTOR);
    ok(created.evenement.evenement_id, 'événement créé');
    ok(!created.evenement.definition_version_id, 'aucune association configuration forcée');
    eq(created.evenement.heure_debut_prevue, '19:00');
    eq(created.evenement.heure_fin_prevue, '21:30');
  });

  await record('22 — configuration existante toujours possible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const createdDef = await service.createEventDefinition({
      domain: 'DPS',
      label: 'Formation groupée DPS',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 6,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    }, ACTOR);
    const created = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Session configuration R9.2',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'MULTI',
      nombreSessionsAttendu: 6,
      sessionIndex: 2,
      definitionVersionId: createdDef.version.definition_version_id,
      heureDebutPrevue: '08:00',
      heureFinPrevue: '10:00'
    }, ACTOR);
    ok(created.evenement.evenement_id, 'événement créé');
    ok(created.evenement.definition_version_id, 'configuration associée');
    includes(ui, 'Applicable depuis le');
    notIncludes(ui, 'Version 2026');
    notIncludes(ui, 'consolidable');
    notIncludes(ui, 'Consolider la participation');
  });

  const failed = results.filter((result) => result.status !== 'PASS');
  results.forEach((result) => {
    const suffix = result.status === 'PASS' ? '' : `\n${result.proof}`;
    console.log(`${result.status} ${result.name}${suffix}`);
  });
  console.log(`Assertions: ${assertions}`);
  if (failed.length) process.exit(1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
