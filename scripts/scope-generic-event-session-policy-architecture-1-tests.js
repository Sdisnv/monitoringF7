#!/usr/bin/env node
'use strict';

/** SCOPE — GENERIC-EVENT-SESSION-POLICY-ARCHITECTURE-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const catalog = require('../netlify/lib/_scope-generic-event-catalog');
const importContract = require('../assets/js/scope-import-contract');
const { resolveParticipationPolicy } = require('../netlify/lib/_scope-participation-policy');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const ACTOR = { sub: 'scope-generic-event-session-policy-architecture-1', roles: ['sdis-admin'], displayName: 'Testeur architecture' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function nativeCsv(rows){
  return [
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;event_definition_code;definition_version_code;policy_code;policy_version_code;session;nb_sessions',
    ...rows
  ].join('\n');
}

(async () => {
  await record('01 — schema additif et isolé', () => {
    const schema = read('database/migrations/20260909_scope_generic_event_session_policy_architecture_1.sql');
    includes(schema, 'create table if not exists scope_event_definitions');
    includes(schema, 'create table if not exists scope_event_definition_versions');
    includes(schema, 'create table if not exists scope_participation_policy_versions');
    ok(/alter table scope_exercices[\s\S]*add column if not exists definition_version_id/i.test(schema));
    ok(/alter table scope_evenements[\s\S]*add column if not exists engine_route/i.test(schema));
    includes(schema, 'SIMPLE_LEGACY');
    includes(schema, 'PR_LEGACY');
    includes(schema, 'GENERIC_SIMPLE');
    includes(schema, 'GENERIC_MULTI_SESSION');
    ok(!/drop\s+table/i.test(schema), 'aucune suppression de table');
    ok(!/drop\s+column/i.test(schema), 'aucune suppression de colonne');
  });

  await record('02 — routage explicite sans heuristique domaine/libellé', () => {
    eq(catalog.resolveEngineRoute({ domaine_code: 'DAP', libelle: 'Formation groupée DAP 1.2' }), catalog.ROUTES.SIMPLE_LEGACY);
    eq(catalog.resolveEngineRoute({ domaine_code: 'PR', pr_exercise_group_key: 'PR:1', pr_session_key: 'PR:1.1' }), catalog.ROUTES.PR_LEGACY);
    eq(catalog.resolveEngineRoute({ domaine_code: 'JSP', definition_version_id: 'dv-1' }), catalog.ROUTES.GENERIC_SIMPLE);
    eq(catalog.resolveEngineRoute({ domaine_code: 'DPS' }, { definitionVersion: { mode_organisation: 'MULTI_SESSION' } }), catalog.ROUTES.GENERIC_MULTI_SESSION);
    eq(catalog.resolveEngineRoute({ engine_route: 'GENERIC_MULTI_SESSION', domaine_code: 'AUTO' }), catalog.ROUTES.GENERIC_MULTI_SESSION);
  });

  await record('03 — policies versionnées et interdiction permutation Multi-session', () => {
    const dapBase = resolveParticipationPolicy('DAP');
    ok(dapBase.activeStatuses.includes('PERMUTATION'), 'DAP simple conserve Permutation');
    assert.throws(() => catalog.validateDefinitionVersion({
      domain: 'DAP',
      valid_from: '2026-01-01',
      valid_to: '2026-12-31',
      mode_organisation: 'MULTI_SESSION',
      session_count: 2
    }, dapBase), /permutation est interdite/i);
    const dapMulti = {
      activeStatuses: dapBase.activeStatuses.filter((status) => status !== 'PERMUTATION')
    };
    eq(catalog.validateDefinitionVersion({
      domain: 'DAP',
      valid_from: '2026-01-01',
      valid_to: '2026-12-31',
      mode_organisation: 'MULTI_SESSION',
      session_count: 6
    }, dapMulti).session_count, 6);
  });

  await record('04 — catalogue admin multi-domaines et version 2026 DAP groupée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const data = (await service.formationCatalog()).formationCatalog;
    includes(JSON.stringify(data.transition), 'GENERIC_SIMPLE');
    includes(JSON.stringify(data.transition), 'GENERIC_MULTI_SESSION');
    ok(data.policyVersions.some((row) => row.domain === 'JSP'), 'JSP présent');
    ok(data.policyVersions.some((row) => row.domain === 'DPS'), 'DPS présent');
    ok(data.policyVersions.some((row) => row.domain === 'FOBA'), 'FOBA présent');
    ok(data.policyVersions.some((row) => row.policy_code === 'DAP-MULTISESSION'), 'policy DAP Multi-session présente');
    ok(data.definitions.some((row) => row.code === 'DAP-FORMATION-GROUPEE'), 'définition DAP groupée présente');
    const version = data.definitionVersions.find((row) => (row.definition_code || row.definitionCode) === 'DAP-FORMATION-GROUPEE');
    eq(version.mode_organisation, 'MULTI_SESSION');
    eq(Number(version.session_count), 2);
  });

  await record('05 — création et reconduction annuelle sans mutation historique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createEventDefinition({
      domain: 'JSP',
      label: 'Formation JSP contrôlée',
      versionCode: '2026',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1
    }, ACTOR);
    eq(created.definition.domain, 'JSP');
    eq(created.version.version_code, '2026');
    const reconducted = await service.reconductEventDefinitionVersion(created.version.definition_version_id, {
      year: 2027
    }, ACTOR);
    eq(reconducted.version.version_code, '2027');
    eq(reconducted.version.valid_from, '2027-01-01');
    const versions = (await service.formationCatalog()).formationCatalog.definitionVersions
      .filter((row) => row.definition_id === created.definition.definition_id)
      .sort((a, b) => String(a.version_code).localeCompare(String(b.version_code)));
    eq(versions.length, 2);
    eq(versions[0].valid_to, '2026-12-31');
    eq(versions[1].valid_from, '2027-01-01');
  });

  await record('06 — création événement sur définition explicite active le moteur générique seulement pour cet événement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const refs = (await service.formationCatalog()).formationCatalog;
    const v2 = refs.definitionVersions.find((row) => (row.definition_code || row.definitionCode) === 'DAP-FORMATION-GROUPEE');
    const cible = await repo.findCible('DAP', 'Y1');
    const created = await service.createEvenement({
      date: '2026-04-23',
      domaineCode: 'DAP',
      cibleIds: [cible.cible_id],
      libelle: 'Formation groupée DAP 1.1',
      definitionVersionId: v2.definition_version_id,
      sessionIndex: 1
    }, ACTOR);
    eq(created.evenement.engine_route, 'GENERIC_MULTI_SESSION');
    eq(created.evenement.definition_version_id, v2.definition_version_id);
    ok(created.evenement.engine_snapshot && created.evenement.engine_snapshot.version, 'snapshot moteur persisté');
    ok(!created.evenement.pr_exercise_group_key, 'aucun détournement PR');

    const simple = await service.createEvenement({
      date: '2026-05-01',
      domaineCode: 'DAP',
      cibleIds: [cible.cible_id],
      libelle: 'Exercice DAP simple'
    }, ACTOR);
    ok(!simple.evenement.definition_version_id, 'DAP simple inchangé sans activation explicite');
    ok(!simple.evenement.engine_route || simple.evenement.engine_route === 'SIMPLE_LEGACY', 'DAP simple sans routage V2 implicite');
  });

  await record('07 — import : colonnes definition/policy reconnues, suggestions sans écriture automatique', async () => {
    const contractPreview = importContract.previewScopeImport(nativeCsv([
      '2026-04-23;DAP;;Y1;Formation groupée DAP 1.1;NOMINATIF;DAP-FORMATION-GROUPEE-1-2026;DAP-FORMATION-GROUPEE;2026;DAP-MULTISESSION;2026;1;2',
      '2026-06-01;JSP;;B1;Formation inconnue JSP;NOMINATIF;;;;;;1;1'
    ]), { existingEvents: [], cibles: [] });
    eq(contractPreview.lignes[0].eventDefinitionCode, 'DAP-FORMATION-GROUPEE');
    eq(contractPreview.lignes[0].policyCode, 'DAP-MULTISESSION');
    eq(contractPreview.lignes[0].sessionIndex, 1);
    eq(contractPreview.lignes[0].nbSessions, 2);

    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText: nativeCsv([
      '2026-04-23;DAP;;Y1;Formation groupée DAP 1.1;NOMINATIF;DAP-FORMATION-GROUPEE-1-2026;DAP-FORMATION-GROUPEE;2026;DAP-MULTISESSION;2026;1;2',
      '2026-06-01;JSP;;B1;Formation inconnue JSP;NOMINATIF;;;;;;1;1'
    ]) });
    eq(preview.lignes[0].genericMatch.status, 'EXACT');
    eq(preview.lignes[0].genericMatch.definitionCode, 'DAP-FORMATION-GROUPEE');
    eq(preview.lignes[1].genericMatch.status, 'UNKNOWN_DEFINITION');
    eq(preview.ecriture, false);
    ok(preview.genericDefinitions.validationRequired, 'validation humaine indiquée');
  });

  await record('08 — endpoints et UI admin présents, sans accès public', () => {
    const fn = read('netlify/functions/scope.js');
    const api = read('assets/js/scope-api.js');
    const ui = read('assets/js/scope-ui.js');
    const logic = read('assets/js/scope-ui-logic.js');
    includes(fn, "path === '/formation/catalog'");
    includes(fn, "hasPermission(claims, 'references:manage')");
    includes(fn, "path === '/diagnostics/performance'");
    includes(api, "formationCatalog(params) { return request('GET', `/formation/catalog${queryString(params || {})}`); }");
    includes(api, "performanceDiagnostics() { return request('GET', '/diagnostics/performance'); }");
    includes(logic, "#/reglages/formations");
    includes(ui, 'function renderFormationCatalog()');
    includes(ui, 'Configuration formation');
    includes(ui, 'data-reconduct-definition-version');
  });

  await record('09 — cache UX et invalidation après écritures', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'const CACHE_TTL = {');
    includes(ui, "referentiels: 5 * 60 * 1000");
    includes(ui, "list: 30 * 1000");
    includes(ui, 'function invalidateCache(namespaces)');
    includes(ui, "invalidateCache(['list', 'dashboard', 'vigilance']");
    includes(ui, "invalidateCache(['referentiels', 'formationCatalog']");
    includes(ui, 'cached(\'personCount\'');
  });

  await record('10 — protections PR legacy, DAP simple et moteurs existants', () => {
    const service = read('netlify/lib/_scope-service.js');
    const multisession = read('netlify/lib/_scope-multisession-v2.js');
    const rules = read('netlify/lib/_scope-rules.js');
    includes(read('netlify/lib/_scope-generic-event-catalog.js'), "PR_LEGACY: 'PR_LEGACY'");
    includes(service, 'pr_exercise_group_key');
    includes(multisession, 'MULTI_SESSION_V2');
    includes(rules, 'PERMUTATION');
    eq(catalog.resolveEngineRoute({ domaine_code: 'DAP', libelle: 'Formation groupée DAP 1.1' }), 'SIMPLE_LEGACY');
  });

  await record('11 — diagnostics performance exposent mesures, instrumentation et limites', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const diag = (await service.performanceDiagnostics()).performance;
    ok(diag.measurements.evenements.measuredBeforeMs >= 12000, 'événements mesurés avant R3');
    ok(diag.measurements.personnel.measuredBeforeMs >= 12000, 'personnel mesuré avant R3');
    ok(diag.serverInstrumentation && diag.serverInstrumentation.headers.includes('Server-Timing'), 'instrumentation serveur exposée');
    ok(Array.isArray(diag.appliedOptimizations) && diag.appliedOptimizations.length >= 3, 'optimisations listées');
    ok(Array.isArray(diag.safeguards) && diag.safeguards.length >= 1, 'garde-fous documentés');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-GENERIC-EVENT-SESSION-POLICY-ARCHITECTURE-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-GENERIC-EVENT-SESSION-POLICY-ARCHITECTURE-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
