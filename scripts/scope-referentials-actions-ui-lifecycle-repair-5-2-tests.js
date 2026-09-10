#!/usr/bin/env node
'use strict';

/** SCOPE — REFERENTIALS-ACTIONS-UI-LIFECYCLE-REPAIR-5.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-referentials-actions-ui-lifecycle-repair-5-2', roles: ['sdis-admin'], displayName: 'Testeur 5.2' };
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

function motif(catalog, id){
  return catalog.participation.motifs.find((row) => row.id === id);
}

(async () => {
  await record('01 — Modifier utilise un handler branché sur une fonction accessible', () => {
    const ui = read('assets/js/scope-ui.js');
    const helperIndex = ui.indexOf('function findReferentialRow(type, id)');
    const renderIndex = ui.indexOf('function renderFormationCatalog()');
    const bindIndex = ui.indexOf('function bind()');
    ok(helperIndex > -1, 'helper findReferentialRow global présent');
    ok(helperIndex < renderIndex, 'helper disponible hors renderFormationCatalog');
    ok(helperIndex < bindIndex, 'helper disponible pour bind()');
    ok(!ui.includes('const findReferentialRow = (type, id)'), 'ancien helper local supprimé');
    includes(ui, "root.querySelectorAll('[data-referential-edit]')");
    includes(ui, "state.formationReferentialDraft = {");
    includes(ui, "editing: true");
    includes(ui, "formation-referential-form");
    ok(!ui.includes('Identifiant technique immuable'), 'formulaire sans identifiant technique affiché');
  });

  await record('02 — Enregistrer modifie le libellé sans changer ID/type', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Recette 5.2 TEST' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'DISPENSE', label: 'Recette 5.2 (TEST) corrigé', active: true }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = motif(catalog, id);
    eq(row.id, id);
    eq(row.type, 'EXCUSE');
    eq(row.label, 'Recette 5.2 (TEST) corrigé');
  });

  await record('03 — Annuler ferme le formulaire sans write', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, "document.getElementById('referential-cancel')");
    includes(ui, 'state.formationReferentialDraft = null');
    includes(ui, 'render();');
  });

  await record('04 — Archiver ouvre une confirmation centrale', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, "root.querySelectorAll('[data-referential-toggle]')");
    includes(ui, 'ScopeFeedback.confirm({');
    includes(ui, 'Archiver ce');
    includes(ui, 'Cet élément ne sera plus proposé');
    includes(ui, "confirmText: active ? 'Réactiver' : 'Archiver'");
  });

  await record('05 — Archiver persiste actif=false', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif archive UI 5.2' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    const catalog = await service.participationPolicies();
    eq(motif(catalog, id).active, false);
    eq(motif(catalog, id).historical, true);
  });

  await record('06 — Réactiver persiste actif=true et même identité', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'DISPENSE', label: 'Motif reactive UI 5.2' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'DISPENSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    await service.saveParticipationMotif({ motifId: id, motifType: 'DISPENSE', label: created.motif.label, active: true, historique: true }, ACTOR);
    const rows = (await service.participationPolicies()).participation.motifs.filter((row) => row.id === id);
    eq(rows.length, 1);
    eq(rows[0].active, true);
    eq(rows[0].type, 'DISPENSE');
  });

  await record('07 — Supprimer ouvre une confirmation centrale', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, "root.querySelectorAll('[data-referential-delete]')");
    includes(ui, 'Supprimer définitivement ce');
    includes(ui, 'Cet élément n’a jamais été utilisé. Sa suppression sera définitive.');
    includes(ui, "confirmText: 'Supprimer'");
  });

  await record('08 — Supprimer élément jamais utilisé supprime réellement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif suppression UI 5.2' }, ACTOR);
    const id = created.motif.motif_id;
    await service.deleteParticipationMotif(id, ACTOR);
    const catalog = await service.participationPolicies();
    ok(!motif(catalog, id), 'motif supprimé absent du catalogue');
  });

  await record('09 — Élément utilisé n’affiche pas Supprimer', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'const canDelete = row.canDelete !== undefined ? row.canDelete === true : usageSummary.canDelete === true');
    includes(ui, 'data-referential-usages=');
    includes(ui, 'canDelete ? `<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" data-referential-delete=');
  });

  await record('10 — Archiver élément utilisé fonctionne', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif utilise archive UI 5.2' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationPolicy('DAP', { excuseMotifs: ['PRIVE', id] }, ACTOR);
    let catalog = await service.participationPolicies();
    ok(motif(catalog, id).usageCount > 0, 'usageCount exposé');
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    catalog = await service.participationPolicies();
    eq(motif(catalog, id).active, false);
  });

  await record('11 — Feedback central pour succès et erreurs métier', () => {
    const ui = read('assets/js/scope-ui.js');
    const logic = read('assets/js/scope-ui-logic.js');
    includes(ui, 'withFeedbackAction({');
    includes(ui, "successTitle: 'Référentiel enregistré'");
    includes(ui, "successTitle: active ? 'Référentiel réactivé' : 'Référentiel archivé'");
    includes(ui, "successTitle: 'Référentiel supprimé'");
    includes(logic, "code === 'referentiel_utilise'");
    includes(logic, 'Suppression impossible');
  });

  await record('12 — handlers regagnés après rerender', () => {
    const ui = read('assets/js/scope-ui.js');
    const bindIndex = ui.indexOf('function bind()');
    const editIndex = ui.indexOf("root.querySelectorAll('[data-referential-edit]')");
    const toggleIndex = ui.indexOf("root.querySelectorAll('[data-referential-toggle]')");
    const deleteIndex = ui.indexOf("root.querySelectorAll('[data-referential-delete]')");
    ok(bindIndex > -1 && editIndex > bindIndex, 'edit attaché dans bind() après render');
    ok(toggleIndex > bindIndex, 'toggle attaché dans bind() après render');
    ok(deleteIndex > bindIndex, 'delete attaché dans bind() après render');
    includes(ui, 'root.innerHTML = `<div class="scope-app-shell">');
    includes(ui, 'bind();');
    includes(ui, 'mountFormationCatalogHtml(payload, selectedVersionId)');
  });

  await record('13 — pas de window.alert/window.confirm', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(!/window\.alert\(/.test(ui), 'pas de window.alert');
    ok(!/window\.confirm\(/.test(ui), 'pas de window.confirm');
  });

  await record('14 — pas de N+1 HTTP pour usageCount', () => {
    const service = read('netlify/lib/_scope-service.js');
    const pg = read('netlify/lib/_scope-pg.js');
    const ui = read('assets/js/scope-ui.js');
    includes(service, 'const usage = repo.listParticipationReferentialUsages');
    includes(pg, 'async listParticipationReferentialUsages()');
    ok(!ui.includes('client.getParticipationReferentialUsage'), 'usageCount non récupéré ligne par ligne côté client');
    ok(!ui.includes('/participation/referentials/usage'), 'pas d’endpoint usage appelé par ligne');
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  results.forEach((row) => {
    console.log(`${row.status} ${row.name}`);
    if(row.proof) console.log(row.proof);
  });
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`FAILED ${failed.length}/${results.length}`);
    process.exit(1);
  }
  console.log(`PASS ${results.length}/${results.length}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
