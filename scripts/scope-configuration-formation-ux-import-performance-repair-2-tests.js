#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIGURATION-FORMATION-UX-IMPORT-PERFORMANCE-REPAIR-2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const importContract = require('../assets/js/scope-import-contract');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const ACTOR = { sub: 'scope-configuration-formation-ux-import-performance-repair-2', roles: ['sdis-admin'], displayName: 'Testeur REPAIR-2' };
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
    'date;domaine;sous_domaine;cibles;libelle;mode_suivi;code_event;event_definition_code;definition_version_code;session;nb_sessions',
    ...rows
  ].join('\n');
}

(async () => {
  await record('01 — création métier sans code technique et policy personnalisée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createEventDefinition({
      domain: 'JSP',
      label: 'Formation extincteur',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1,
      year: 2027,
      validFrom: '2027-01-01',
      validTo: '2027-12-31',
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE'],
        excuseMotifs: ['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'OUBLI'],
        dispenseMotifs: []
      }
    }, ACTOR);
    eq(created.definition.code, 'JSP-FORMATION-EXTINCTEUR');
    eq(created.version.version_code, '2027');
    const catalog = (await service.formationCatalog()).formationCatalog;
    const version = catalog.definitionVersions.find((row) => row.definition_version_id === created.version.definition_version_id);
    const policy = catalog.policyVersions.find((row) => row.policy_version_id === version.policy_version_id);
    eq(policy.policy_code, 'JSP-FORMATION-EXTINCTEUR-REGLES');
    ok(policy.config.excuseMotifs.includes('OUBLI'), 'motif Oubli conservé');
    ok(!policy.config.activeStatuses.includes('PERMUTATION'), 'pas de permutation ajoutée à JSP');
  });

  await record('02 — Multi-session masque/refuse la permutation dans la policy générée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createEventDefinition({
      domain: 'DAP',
      label: 'Formation groupée test',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 3,
      year: 2027,
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION'],
        excuseMotifs: ['PRIVE', 'PROFESSIONNEL'],
        dispenseMotifs: ['FORMATION_HORS_SDIS']
      }
    }, ACTOR);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const version = catalog.definitionVersions.find((row) => row.definition_version_id === created.version.definition_version_id);
    const policy = catalog.policyVersions.find((row) => row.policy_version_id === version.policy_version_id);
    eq(version.mode_organisation, 'MULTI_SESSION');
    eq(Number(version.session_count), 3);
    ok(!policy.config.activeStatuses.includes('PERMUTATION'), 'permutation supprimée pour Multi-session');
    eq(policy.config.behavior.deduplicationScope, 'EXERCISE');
  });

  await record('03 — reconduction 2027/2028 clone définition et règles sans mutation historique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const catalog2026 = (await service.formationCatalog()).formationCatalog;
    const source = catalog2026.definitionVersions.find((row) => (row.definition_code || row.definitionCode) === 'DAP-FORMATION-GROUPEE');
    const reconducted = await service.reconductEventDefinitionVersion(source.definition_version_id, { year: 2027 }, ACTOR);
    eq(reconducted.version.version_code, '2027');
    const catalog = (await service.formationCatalog()).formationCatalog;
    const versions = catalog.definitionVersions.filter((row) => row.definition_id === source.definition_id);
    ok(versions.some((row) => row.version_code === '2026'), 'version 2026 conservée');
    ok(versions.some((row) => row.version_code === '2027'), 'version 2027 créée');
    const sourceReloaded = versions.find((row) => row.version_code === '2026');
    eq(sourceReloaded.valid_from, '2026-01-01');
    eq(sourceReloaded.session_count, 2);
    ok(reconducted.version.policy_version_id !== source.policy_version_id, 'policy annuelle clonée');
  });

  await record('04 — import preview métier : reconnu, inconnu, doublon, aucune écriture', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('DAP', 'Y1');
    await service.createEvenement({
      date: '2026-04-23',
      domaineCode: 'DAP',
      cibleIds: [cible.cible_id],
      libelle: 'Formation groupée DAP 1.1'
    }, ACTOR);
    const csv = nativeCsv([
      '2026-04-23;DAP;;Y1;Formation groupée DAP 1.1;NOMINATIF;DAP-GROUP-1;DAP-FORMATION-GROUPEE;2026;1;2',
      '2027-06-01;JSP;;B1;Formation inconnue JSP;NOMINATIF;JSP-UNKNOWN;;;;'
    ]);
    const contract = importContract.previewScopeImport(csv, { existingEvents: [], cibles: [] });
    eq(contract.lignes[0].eventDefinitionCode, 'DAP-FORMATION-GROUPEE');
    const preview = await service.previewImportEvenements({ csvText: csv });
    eq(preview.ecriture, false);
    eq(preview.lignes[0].genericMatch.status, 'EXACT');
    eq(preview.lignes[0].genericMatch.policyVersionCode, '2026');
    eq(preview.lignes[1].genericMatch.status, 'UNKNOWN_DEFINITION');
    ok(preview.lignes.some((line) => ['DEJA_PRESENT', 'DEJA_IMPORTE', 'EXACT_MATCH', 'PROBABLE_MATCH'].includes(line.statut)), 'doublon signalé');
  });

  await record('05 — UX Configuration formation en vocabulaire métier', () => {
    const ui = read('assets/js/scope-ui.js');
    const css = read('assets/css/scope.css');
    includes(ui, 'Nom de la formation');
    includes(ui, 'Année d’application');
    includes(ui, 'Plusieurs sessions');
    includes(ui, 'Règles de participation');
    includes(ui, 'Statuts disponibles');
    includes(ui, 'Motifs d’excuse');
    includes(ui, 'Informations techniques');
    includes(ui, 'data-formation-open');
    ok(!ui.includes('<label>Code métier</label>'), 'champ code métier supprimé du formulaire courant');
    includes(css, '.scope-formation-model');
    includes(css, '.scope-formation-detail');
  });

  await record('06 — performance : compteur léger, parallélisation, instrumentation client', async () => {
    const api = read('assets/js/scope-api.js');
    const ui = read('assets/js/scope-ui.js');
    const fn = read('netlify/functions/scope.js');
    const serviceSrc = read('netlify/lib/_scope-service.js');
    includes(fn, "path === '/personnes/count'");
    includes(api, 'personnesCount()');
    includes(api, 'ScopePerformance');
    includes(api, 'payloadBytes');
    includes(api, 'serverPerf');
    includes(ui, 'Promise.all(jobs)');
    ok(!ui.includes('if (client.listPersonnes && state.personCount == null)'), 'chargement global du personnel supprimé');
    includes(serviceSrc, 'measuredBeforeMs: 14000');
    includes(serviceSrc, 'serverInstrumentation');
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const count = await service.countPersonnes();
    ok(Number.isInteger(count.count), 'compteur léger fonctionnel');
  });

  await record('07 — PDF Information/Alerte couleur texte', () => {
    const renderer = read('netlify/lib/_scope-pdf-renderer.js');
    includes(renderer, "body: '#171C8F'");
    includes(renderer, "body: '#8c000b'");
    includes(renderer, 'opts.body || INSTITUTION.ink');
  });

  await record('08 — cache-buster REPAIR-2 et protections moteurs', () => {
    const html = read('scope.html');
    const serviceSrc = read('netlify/lib/_scope-service.js');
    ok(html.includes('scope-configuration-policy-runtime-performance-root-repair-3') || html.includes('scope-configuration-formation-ux-import-performance-repair-2'), 'cache-buster formation repair présent');
    includes(serviceSrc, 'cloturerMultiSessionV2');
    includes(read('netlify/lib/_scope-rules.js'), 'PERMUTATION');
    includes(read('netlify/lib/_scope-multisession-v2.js'), 'MULTI_SESSION_V2');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-CONFIGURATION-FORMATION-UX-IMPORT-PERFORMANCE-REPAIR-2 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-CONFIGURATION-FORMATION-UX-IMPORT-PERFORMANCE-REPAIR-2 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
