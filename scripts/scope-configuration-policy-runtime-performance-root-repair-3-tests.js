#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIGURATION-POLICY-RUNTIME-PERFORMANCE-ROOT-REPAIR-3 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const ACTOR = { sub: 'scope-root-repair-3', roles: ['sdis-admin'], displayName: 'Testeur ROOT-REPAIR-3' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function nativeCsv(rows){
  return [
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;event_definition_code;definition_version_code;session;nb_sessions',
    ...rows
  ].join('\n');
}

(async () => {
  await record('A — cold start schema idempotent et verrouillé', () => {
    const schema = read('netlify/lib/_scope-schema.js');
    const pg = read('netlify/lib/_postgres.js');
    includes(schema, 'readyPromise');
    includes(schema, 'LATEST_SCOPE_SCHEMA_VERSION');
    includes(schema, 'pg_advisory_lock');
    includes(schema, 'hasMigration(LATEST_SCOPE_SCHEMA_VERSION)');
    includes(pg, 'coreSchemaPromise');
    includes(pg, 'withMetrics');
    includes(pg, 'currentMetrics');
  });

  await record('B — formulaire sans rerender à chaque frappe', () => {
    const ui = read('assets/js/scope-ui.js');
    const formationBinding = ui.slice(ui.indexOf('const bindFormationField'), ui.indexOf("root.querySelectorAll('[data-formation-policy]')"));
    const inputBlock = formationBinding.slice(formationBinding.indexOf("addEventListener('input'"), formationBinding.indexOf("addEventListener('change'"));
    includes(inputBlock, 'refreshFormationPreview()');
    ok(!inputBlock.includes('render();'), 'le handler input ne remplace plus le DOM');
  });

  await record('C/D/E — checkboxes persistantes et motifs dédupliqués', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'checkedFormationValues');
    includes(ui, 'policyDraftKey');
    includes(ui, 'uniqueMotifIds');
    includes(ui, "if (kind === 'status' && !state.formationDefinitionForm[key].includes('PRESENT'))");
    includes(ui, 'Présent est obligatoire pour cette configuration.');
    includes(ui, "uniqueMotifIds(['FORMATEUR_PR', 'FORMATION_HORS_SDIS', 'JOKER', 'AUTO_RETRAIT', 'DEMISSION_EN_COURS', 'NON_CONCERNE', 'PAS_CONCERNE'])");
  });

  await record('F/G/H/I — UX modèle, application et protection temporelle', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('DAP', 'Y1');
    const catalogBefore = (await service.formationCatalog()).formationCatalog;
    const dap = catalogBefore.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE');
    const version = dap.versions[0];
    await service.createEvenement({
      date: '2026-04-23',
      domaineCode: 'DAP',
      cibleIds: [cible.cible_id],
      libelle: 'Formation groupée DAP 1.1',
      definitionVersionId: version.definition_version_id,
      policyVersionId: version.policy_version_id
    }, ACTOR);
    const catalogAfter = (await service.formationCatalog()).formationCatalog;
    const refreshed = catalogAfter.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE').versions[0];
    eq(refreshed.linkedEventCount, 1);
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'Application aux événements');
    ok(ui.includes('Aucun événement n’est actuellement rattaché à cette configuration.') || ui.includes('Aucun événement n’utilise actuellement cette configuration.'), 'message aucun événement associé présent');
    includes(ui, 'Cette version est déjà utilisée par des événements. Pour préserver l’historique');
    includes(ui, 'Modifier la configuration');
    includes(ui, 'Créer une nouvelle version');
    includes(ui, 'Règles proposées');
    ok(!ui.includes('<label>Base de règles</label>'), 'ancien libellé technique absent');
  });

  await record('J — preview import 2026 sans écriture', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const before = (await service.listEvenements({ annee: 2026 })).evenements.length;
    const csv = nativeCsv([
      '2026-04-23;DAP;;Y1;Formation groupée DAP 1.1;NOMINATIF;DAP-GROUP-1;DAP-FORMATION-GROUPEE;2026;1;2',
      '2026-05-07;DAP;;Y1;Formation groupée DAP 1.2;NOMINATIF;DAP-GROUP-2;DAP-FORMATION-GROUPEE;2026;2;2'
    ]);
    const preview = await service.previewImportEvenements({ csvText: csv });
    const after = (await service.listEvenements({ annee: 2026 })).evenements.length;
    eq(preview.ecriture, false);
    eq(before, after);
    ok(preview.lignes.every((line) => line.genericMatch && line.genericMatch.definitionVersionCode === '2026'), 'mapping version 2026 conservé');
  });

  await record('K — instrumentation performance serveur/client', () => {
    const api = read('assets/js/scope-api.js');
    const auth = read('netlify/lib/_auth-utils.js');
    const fn = read('netlify/functions/scope.js');
    const service = read('netlify/lib/_scope-service.js');
    includes(api, 'serverTiming');
    includes(api, 'serverPerf');
    includes(auth, 'Server-Timing');
    includes(auth, 'X-Scope-Perf');
    includes(fn, 'withMetrics(label');
    includes(service, 'measuredBeforeMs: 17000');
    includes(service, 'serverInstrumentation');
  });

  await record('L — loading UX local et cache alerts non bloquant', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(!ui.includes('scope-banner info">Chargement'), 'bandeau global Chargement supprimé');
    includes(ui, 'refreshAlertCounts().then(() => render()).catch(() => {})');
    ok(!ui.includes('jobs.push(refreshAlertCounts())'), 'compteur alertes absent des jobs bloquants');
  });

  await record('M — protections moteurs et rapports', () => {
    includes(read('netlify/lib/_scope-multisession-v2.js'), 'MULTI_SESSION_V2');
    includes(read('netlify/lib/_scope-rules.js'), 'PERMUTATION');
    includes(read('netlify/lib/_scope-report-service.js'), 'pdfResponse');
    includes(read('netlify/lib/_scope-pdf-renderer.js'), "body: '#171C8F'");
    includes(read('netlify/lib/_scope-pdf-renderer.js'), "body: '#8c000b'");
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-CONFIGURATION-POLICY-RUNTIME-PERFORMANCE-ROOT-REPAIR-3 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-CONFIGURATION-POLICY-RUNTIME-PERFORMANCE-ROOT-REPAIR-3 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
