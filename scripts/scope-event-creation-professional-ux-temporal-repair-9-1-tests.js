#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-CREATION-PROFESSIONAL-UX-TEMPORAL-REPAIR-9.1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-creation-professional-ux-temporal-repair-9-1', permissions: ['events:create'], roles: ['sdis-admin'] };
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

function sourceBlock(source, marker){
  const index = source.indexOf(marker);
  ok(index >= 0, `${marker} introuvable`);
  return source.slice(index, index + 700);
}

(async () => {
  await record('01 — public cible construit depuis les référentiels par domaine', async () => {
    const repo = createMemoryRepo();
    const cibles = await repo.listCibles();
    const byDomain = (domain) => cibles.filter((row) => row.domaine_code === domain).map((row) => row.niveau_code).sort();
    ok(byDomain('DPS').length >= 4, 'DPS dispose de cibles référentielles');
    ok(byDomain('DAP').includes('Y1') && byDomain('DAP').includes('Y4'), 'DAP expose les niveaux Y');
    ok(byDomain('JSP').length >= 1, 'JSP dispose de cibles référentielles');
    ok(byDomain('AUTO').length >= 1, 'AUTO dispose de spécialisations référentielles');
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'state.referentiels.cibles.filter((c) => c.domaineCode === domaine)');
    includes(ui, 'renderTargetPicker');
    notIncludes(ui, 'Général, B1, B2, C1, G1', 'pas de liste universelle affichée');
  });

  await record('02 — composant public cible compact et responsive', async () => {
    const css = read('assets/css/scope.css');
    includes(css, '.scope-target-picker');
    includes(css, 'flex-wrap: wrap');
    includes(css, '.scope-target-chip');
    includes(css, 'border-radius: 999px');
    includes(css, '.scope-target-chip:has(input:checked)');
    includes(css, '@media');
  });

  await record('03 — configuration de formation explicite sans auto-sélection', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'Événement ponctuel');
    includes(ui, 'Utiliser une configuration de formation');
    includes(ui, 'Aucune configuration applicable à cette date et ce domaine.');
    includes(ui, 'Compatible avec le domaine sélectionné, la date de l’événement et une version active.');
    includes(ui, "String(definition.domain || '').toUpperCase() !== String(domaine || '').toUpperCase()");
    includes(ui, 'if (eventDate && from && eventDate < from) return;');
    includes(ui, 'if (eventDate && to && eventDate > to) return;');
    notIncludes(ui, "compatibleVersions.length === 1", 'aucune configuration unique auto-imposée');
  });

  await record('04 — horaire sans rerender destructif', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'function updateNewDurationPreview()');
    includes(ui, 'id="new-duration-preview"');
    const startBlock = sourceBlock(ui, "document.getElementById('new-heure-debut')?.addEventListener('input'");
    const endBlock = sourceBlock(ui, "document.getElementById('new-heure-fin')?.addEventListener('input'");
    includes(startBlock, 'updateNewDurationPreview();');
    includes(endBlock, 'updateNewDurationPreview();');
    notIncludes(startBlock, 'render();');
    notIncludes(endBlock, 'render();');
  });

  await record('05 — Multi-session X/N recalculé sans vieux numéro persistant', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'function updateNewSessionIndexOptions()');
    includes(ui, "document.getElementById('new-session-count')?.addEventListener('input'");
    includes(ui, 'Math.max(2, Number(state.sessionCountChoice || 2))');
    includes(ui, 'if (Number(state.sessionIndexChoice || 1) > count) state.sessionIndexChoice = count;');
    includes(ui, 'Une participation valide à l’une des sessions satisfait la formation.');
    notIncludes(ui, 'Consolider la participation');
    notIncludes(ui, 'new-consolidation');
  });

  await record('06 — identification dense et récapitulatif métier complet', async () => {
    const ui = read('assets/js/scope-ui.js');
    const css = read('assets/css/scope.css');
    const createBlock = sourceBlock(ui, 'function renderNouveau()');
    includes(ui, 'scope-identification-grid');
    includes(css, 'grid-template-columns: minmax(150px, 1fr) minmax(120px, .8fr) minmax(120px, .8fr) minmax(160px, 1.1fr)');
    includes(ui, 'id="new-event-recap"');
    includes(ui, 'id="new-duration-summary"');
    includes(ui, 'id="new-time-summary"');
    includes(ui, 'id="new-session-summary"');
    notIncludes(createBlock, 'Code :', 'pas de code technique dans la création');
  });

  await record('07 — mode de suivi libellé métier', async () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'Chaque personne attendue est suivie individuellement.');
    includes(ui, 'Seuls les effectifs globaux sont renseignés, sans liste nominative.');
    notIncludes(ui, 'La saisie porte sur des volumes consolidés.');
  });

  await record('08 — création événement ponctuel toujours possible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const created = await service.createEvenement({
      date: '2026-06-12',
      domaineCode: 'DPS',
      libelle: 'Création ponctuelle R9.1',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'SINGLE',
      heureDebutPrevue: '08:00',
      heureFinPrevue: '09:30'
    }, ACTOR);
    ok(created.evenement.evenement_id, 'événement créé');
    ok(!created.evenement.definition_version_id, 'aucune association configuration forcée');
    eq(created.evenement.heure_debut_prevue, '08:00');
    eq(created.evenement.heure_fin_prevue, '09:30');
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
