#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIGURATION-REFERENTIALS-LIFECYCLE-REPAIR-5.1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-configuration-referentials-lifecycle-repair-5-1', roles: ['sdis-admin'], displayName: 'Testeur 5.1' };
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
  await record('01 — modification libellé sans changement identifiant', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Recette TEST' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'DISPENSE', label: 'Recette (TEST) corrigé', active: true }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = motif(catalog, id);
    eq(row.id, id);
    eq(row.label, 'Recette (TEST) corrigé');
    eq(row.type, 'EXCUSE');
  });

  await record('02 — archivage élément jamais utilisé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif archive libre' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = motif(catalog, id);
    eq(row.active, false);
    eq(row.historical, true);
    eq(row.usageCount, 0);
  });

  await record('03 — archivage élément utilisé autorisé et historique conservé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif utilise archive' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationPolicy('DAP', { excuseMotifs: ['PRIVE', id] }, ACTOR);
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = motif(catalog, id);
    const dap = catalog.participation.policies.find((policy) => policy.domainCode === 'DAP');
    eq(row.active, false);
    ok(row.usageCount > 0, 'usage serveur détecté');
    ok(dap.excuseMotifsDetails.some((item) => item.id === id), 'ancienne policy lit encore le motif archivé');
  });

  await record('04 — réactivation conserve identité et évite les doublons', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'DISPENSE', label: 'Dispense reactivee' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'DISPENSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    await service.saveParticipationMotif({ motifId: id, motifType: 'DISPENSE', label: created.motif.label, active: true, historique: true }, ACTOR);
    const catalog = await service.participationPolicies();
    const rows = catalog.participation.motifs.filter((row) => row.id === id);
    eq(rows.length, 1);
    eq(rows[0].active, true);
    eq(rows[0].id, id);
  });

  await record('05 — suppression définitive autorisée si jamais utilisé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif supprimable' }, ACTOR);
    const id = created.motif.motif_id;
    const result = await service.deleteParticipationMotif(id, ACTOR);
    eq(result.deleted, true);
    const catalog = await service.participationPolicies();
    ok(!motif(catalog, id), 'motif absent après suppression');
  });

  await record('06 — refus backend suppression élément utilisé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif protege utilise' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationPolicy('DAP', { excuseMotifs: ['PRIVE', id] }, ACTOR);
    await assert.rejects(() => service.deleteParticipationMotif(id, ACTOR), /doit être archivé/);
    assertions += 1;
    const catalog = await service.participationPolicies();
    ok(motif(catalog, id), 'motif utilisé conservé après refus');
  });

  await record('07 — élément archivé absent des nouvelles configurations', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif hors nouvelles configs' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    const ui = read('assets/js/scope-ui.js');
    includes(ui, '.filter((row) => row.active !== false || selected.includes(row.id || row.value || row.motif_id))');
    const catalog = await service.participationPolicies();
    eq(motif(catalog, id).active, false);
  });

  await record('08 — élément archivé toujours lisible dans historique existant', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif historique lisible' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationPolicy('DAP', { excuseMotifs: ['PRIVE', id] }, ACTOR);
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: 'Motif historique lisible corrigé', active: false, historique: true }, ACTOR);
    const policies = await service.participationPolicies();
    const dap = policies.participation.policies.find((policy) => policy.domainCode === 'DAP');
    ok(dap.excuseMotifsDetails.some((item) => item.id === id && item.label === 'Motif historique lisible corrigé'), 'motif archivé visible dans policy existante');
  });

  await record('09 — statut modifié conserve comportement moteur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationStatus({ label: 'Présence recette', baseStatus: 'PRESENT' }, ACTOR);
    const id = created.status.status_id;
    await service.saveParticipationStatus({ statusId: id, label: 'Présence recette corrigée', baseStatus: 'ABSENT_EXCUSE' }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = catalog.participation.statuses.find((item) => item.id === id);
    eq(row.label, 'Présence recette corrigée');
    eq(row.baseStatus, 'PRESENT');
  });

  await record('10 — UI actions Modifier Archiver Réactiver Supprimer', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'data-referential-edit');
    includes(ui, 'data-referential-toggle');
    includes(ui, 'data-referential-delete');
    includes(ui, 'Modifier');
    includes(ui, 'Réactiver');
    includes(ui, 'Supprimer');
    includes(ui, 'usageCount');
    includes(ui, 'Jamais utilisé');
    includes(ui, 'Déjà utilisé');
  });

  await record('11 — confirmations centrales et aucun alert/confirm navigateur', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'ScopeFeedback.confirm({');
    includes(ui, 'Archiver ce');
    includes(ui, 'Supprimer définitivement ce');
    includes(ui, 'withFeedbackAction({');
    ok(!/window\.confirm\(/.test(ui.slice(ui.indexOf('data-referential-add'), ui.indexOf('data-reconduct-definition-version'))), 'pas de window.confirm dans le workflow référentiels');
    ok(!/window\.alert\(/.test(ui), 'pas de window.alert');
  });

  await record('12 — endpoints, usage agrégé et migration additive', () => {
    const fn = read('netlify/functions/scope.js');
    const api = read('assets/js/scope-api.js');
    const pg = read('netlify/lib/_scope-pg.js');
    const schema = read('netlify/lib/_scope-schema.js');
    const migration = read('database/migrations/20260909_scope_configuration_referentials_lifecycle_repair_5_1.sql');
    includes(fn, "method === 'DELETE'");
    includes(api, 'deleteParticipationMotif(id)');
    includes(api, 'deleteParticipationStatus(id)');
    includes(pg, 'listParticipationReferentialUsages');
    includes(pg, 'participations');
    includes(pg, 'policyVersions');
    includes(pg, 'eventSnapshots');
    includes(pg, 'exerciseSnapshots');
    includes(pg, 'configurations');
    includes(schema, 'scope-configuration-referentials-lifecycle-repair-5-1');
    ok(!/drop table|drop column|delete from scope_participations/i.test(migration), 'migration non destructive');
  });

  await record('13 — protections historiques et moteurs hors périmètre', () => {
    const service = read('netlify/lib/_scope-service.js');
    const ui = read('assets/js/scope-ui.js');
    ok(!/delete from scope_participations/i.test(service), 'aucune suppression de participations');
    ok(!service.includes('scope_multisession_v2_participations delete'), 'moteur V2 non modifié destructivement');
    includes(ui, 'protectedItem');
    includes(ui, 'Protégé');
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
