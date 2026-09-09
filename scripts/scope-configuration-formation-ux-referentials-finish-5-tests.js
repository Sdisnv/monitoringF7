#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIGURATION-FORMATION-UX-REFERENTIALS-FINISH-5 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { validateParticipationPatch } = require('../netlify/lib/_scope-rules');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-configuration-formation-ux-referentials-finish-5', roles: ['sdis-admin'], displayName: 'Testeur R5' };
const results = [];
let assertions = 0;

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
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

(async () => {
  await record('01 — formulaire création fermé par défaut', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'formationFormOpen: false');
    includes(ui, 'id="formation-open-create"');
    includes(ui, 'Créer une formation');
    includes(ui, 'formOpen ? `<div class="scope-card scope-formation-editor"');
    ok(!ui.includes('<h2 style="margin-top:0">${form.editDefinitionVersionId ?'), 'ancien formulaire permanent absent');
  });

  await record('02 — clic Créer donne un formulaire vide avec année neutre', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, "resetFormationDefinitionForm({ creation: true })");
    includes(ui, "domain: creationDefaults ? '' : ''");
    includes(ui, "year: creationDefaults ? nextYear : ''");
    includes(ui, '<option value="">Choisir un domaine</option>');
    includes(ui, 'Créer la formation');
  });

  await record('03 — Annuler création/modification ferme sans écriture', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'formation-cancel-edit');
    includes(ui, 'state.formationFormOpen = false');
    includes(ui, 'Abandonner les modifications ?');
    includes(ui, 'Continuer la modification');
    includes(ui, 'Les modifications non enregistrées seront perdues.');
    ok(!ui.includes("window.confirm('Abandonner les modifications ?')"), 'confirmation navigateur remplacée');
  });

  await record('04 — Modifier ouvre, préremplit, scroll et focus', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, "data-edit-formation-version");
    includes(ui, "state.formationFormOpen = true");
    includes(ui, 'focusFormationForm()');
    includes(ui, 'scrollIntoView({ behavior: \'smooth\', block: \'start\' })');
    includes(ui, 'el.focus({ preventScroll: true })');
    includes(ui, 'Modifier la configuration');
    includes(ui, 'Enregistrer les modifications');
  });

  await record('05 — modèles zébrés et ouverte bleue discrète', () => {
    const ui = read('assets/js/scope-ui.js');
    const css = read('assets/css/scope.css');
    includes(ui, 'data-zebra="${index % 2 ? \'even\' : \'odd\'}"');
    includes(css, '.scope-formation-model[data-zebra="even"]');
    includes(css, '.scope-formation-model.is-open');
    includes(css, 'border-color: var(--scope-blue)');
  });

  await record('06 — aperçus par colonne et checkboxes responsives', () => {
    const ui = read('assets/js/scope-ui.js');
    const css = read('assets/css/scope.css');
    includes(ui, 'scope-policy-column-summary');
    includes(ui, '<strong>Résumé</strong>');
    includes(ui, 'renderPolicyColumn');
    includes(css, '.scope-policy-columns');
    includes(css, 'repeat(auto-fit, minmax(220px, 1fr))');
    includes(css, 'grid-template-columns: 18px minmax(0, 1fr)');
  });

  await record('07 — création motif excuse/dispense sans code utilisateur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const excuse = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Recette été' }, ACTOR);
    const dispense = await service.saveParticipationMotif({ motifType: 'DISPENSE', label: 'Mission cantonale' }, ACTOR);
    eq(excuse.motif.motif_id, 'RECETTE_ETE');
    eq(dispense.motif.motif_id, 'MISSION_CANTONALE');
    const policies = await service.participationPolicies();
    ok(policies.participation.motifs.some((row) => row.id === 'RECETTE_ETE'), 'motif excuse présent');
    ok(policies.participation.motifs.some((row) => row.id === 'MISSION_CANTONALE'), 'motif dispense présent');
  });

  await record('08 — motif ajouté accepté par policy sans affaiblir motif obligatoire', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const saved = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Audience officielle' }, ACTOR);
    const motif = saved.motif.motif_id;
    const policySnapshot = {
      domainCode: 'DAP',
      activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION'],
      excuseMotifs: [motif],
      dispenseMotifs: ['JOKER'],
      roles: ['PARTICIPANT'],
      behavior: {}
    };
    eq(validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motifAbsence: motif }, { domaineCode: 'DAP', participationPolicySnapshot: policySnapshot }).motif_absence, motif);
    assert.throws(() => validateParticipationPatch({ statut: 'ABSENT_EXCUSE' }, { domaineCode: 'DAP', participationPolicySnapshot: policySnapshot }), /motif du référentiel/);
    assertions += 1;
  });

  await record('09 — création statut bornée à comportement existant', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const saved = await service.saveParticipationStatus({ label: 'Présence validée commandement', baseStatus: 'PRESENT', displayOrder: 80 }, ACTOR);
    eq(saved.status.status_id, 'PRESENCE_VALIDEE_COMMANDEMENT');
    eq(saved.status.base_status, 'PRESENT');
    await assert.rejects(() => service.saveParticipationStatus({ label: 'Permutation spéciale', baseStatus: 'PERMUTATION' }, ACTOR), /comportement compatible/);
    assertions += 1;
  });

  await record('10 — archivage/inactivation conserve historique et ordre', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif recette archive', displayOrder: 77 }, ACTOR);
    await service.saveParticipationMotif({ motifId: created.motif.motif_id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true, displayOrder: 77 }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = catalog.participation.motifs.find((item) => item.id === created.motif.motif_id);
    ok(row, 'motif archivé conservé');
    eq(row.active, false);
    eq(row.historical, true);
    eq(row.order, 77);
  });

  await record('11 — permissions et endpoints référentiels', () => {
    const fn = read('netlify/functions/scope.js');
    const api = read('assets/js/scope-api.js');
    includes(fn, "path === '/participation/motifs'");
    includes(fn, "path === '/participation/statuses'");
    includes(fn, "hasPermission(claims, 'references:manage')");
    includes(api, 'saveParticipationMotif(body)');
    includes(api, 'saveParticipationStatus(body)');
  });

  await record('12 — migration additive et idempotente', () => {
    const schema = read('netlify/lib/_scope-schema.js');
    const migration = read('database/migrations/20260909_scope_configuration_formation_ux_referentials_finish_5.sql');
    includes(schema, "scope-configuration-formation-ux-referentials-finish-5");
    includes(schema, 'create table if not exists scope_participation_statuses');
    includes(schema, 'motif_absence is null or length(trim(motif_absence)) > 0');
    includes(migration, 'create table if not exists scope_participation_statuses');
    ok(!/drop table|drop column/i.test(migration), 'migration non destructive');
  });

  await record('13 — feedback important central, bandeaux admin retirés', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, "form.editDefinitionVersionId ? 'Configuration enregistrée' : 'Formation créée'");
    includes(ui, "successTitle: 'Référentiel enregistré'");
    includes(ui, "successTitle: active ? 'Référentiel réactivé' : 'Référentiel archivé'");
    ok(!ui.includes("toast('success', 'Modèle créé'"), 'ancien bandeau Modèle créé absent');
    ok(!ui.includes("toast('success', 'Enregistré', 'La politique de participation"), 'ancien bandeau policy absent');
  });

  await record('14 — association DAP 1.1/1.2 préservée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('DAP', 'Y1');
    const initial = (await service.formationCatalog()).formationCatalog;
    const version = initial.definitionVersions.find((row) => row.definitionCode === 'DAP-FORMATION-GROUPEE');
    await service.createEvenement({ date: '2026-04-23', domaineCode: 'DAP', libelle: 'Formation groupée DAP 1.1', cibleIds: [cible.cible_id], definitionVersionId: version.definition_version_id, modeSession: 'MULTI', sessionIndex: 1 }, ACTOR);
    await service.createEvenement({ date: '2026-05-07', domaineCode: 'DAP', libelle: 'Formation groupée DAP 1.2', cibleIds: [cible.cible_id], definitionVersionId: version.definition_version_id, modeSession: 'MULTI', sessionIndex: 2 }, ACTOR);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const dap = catalog.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE');
    ok(dap, 'Formation groupée DAP présente');
    eq(dap.versions[0].linkedEventCount, 2);
    eq(dap.versions[0].linkedEvents.filter((row) => String(row.libelle || '').includes('DAP 1.')).length, 2);
  });

  await record('15 — protections DAP, Multi-session, PR legacy et performance', () => {
    const service = read('netlify/lib/_scope-service.js');
    const ui = read('assets/js/scope-ui.js');
    includes(service, 'loadMultiSessionV2State');
    includes(service, 'PR_LEGACY');
    includes(service, 'removeSourcePermutationObligation(tx, evenement, attendu.personne_id, actor)');
    ok(!ui.includes('jobs.push(refreshAlertCounts())'), 'pas de chargement alertes bloquant');
    includes(ui, "if (r.screen === 'formation-catalog') jobs.push(loadParticipationAdmin())");
    includes(read('scope.html'), 'scope-configuration-referentials-lifecycle-repair-5-1');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-CONFIGURATION-FORMATION-UX-REFERENTIALS-FINISH-5 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-CONFIGURATION-FORMATION-UX-REFERENTIALS-FINISH-5 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
