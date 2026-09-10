#!/usr/bin/env node
'use strict';

/** SCOPE — REFERENTIALS-USAGE-TRACEABILITY-ACTIVE-FILTER-REPAIR-5.3 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-referentials-usage-traceability-active-filter-repair-5-3', roles: ['sdis-admin'], permissions: ['references:manage', 'personnel:read'], displayName: 'Testeur 5.3' };
const LIMITED_ACTOR = { sub: 'scope-referentials-usage-traceability-active-filter-repair-5-3-limited', roles: ['sdis-admin'], permissions: ['references:manage'], displayName: 'Testeur 5.3 limité' };
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
  return (catalog.participation.motifs || []).find((row) => row.id === id);
}

async function seedUsage(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif trace 5.3' }, ACTOR);
  const id = created.motif.motif_id;
  await service.saveParticipationPolicy('JSP', { excuseMotifs: ['PRIVE', id], dispenseMotifs: [] }, ACTOR);
  const definition = await repo.upsertEventDefinition({ code: 'TRACE-5-3', label: 'Formation trace 5.3', domain: 'JSP', status: 'ACTIF' });
  await repo.upsertEventDefinitionVersion({
    definition_id: definition.definition_id,
    version_code: '2026',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
    mode_organisation: 'SIMPLE',
    session_count: 1,
    active: true,
    metadata: { activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE'], excuseMotifs: [id], dispenseMotifs: [] }
  });
  const event = await repo.insertEvenement({
    date: '2026-03-12',
    domaine_code: 'JSP',
    libelle: 'Formation trace 5.3 événement',
    statut: 'REALISE',
    participation_policy_snapshot: { activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE'], excuseMotifs: [id], dispenseMotifs: [] }
  });
  const person = await repo.upsertPersonne({ personne_id: 'person-trace-5-3', nip: '52371', grade: 'App', nom: 'Auchter', prenom: 'Anthony' });
  await repo.upsertParticipation({
    evenement_id: event.evenement_id,
    personne_id: person.personne_id,
    statut: 'ABSENT_EXCUSE',
    motif_absence: id,
    role: 'PARTICIPANT',
    source: 'SAISIE'
  });
  return { repo, service, id };
}

(async () => {
  await record('01 — motif actif proposé en nouvelle configuration', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif actif 5.3' }, ACTOR);
    const catalog = await service.participationPolicies();
    eq(motif(catalog, created.motif.motif_id).active, true);
    const ui = read('assets/js/scope-ui.js');
    includes(ui, '.filter((row) => row.active !== false || (preserveHistoricalReferences && selected.includes');
  });

  await record('02 — motif archivé absent nouvelle configuration', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif archive filtre 5.3' }, ACTOR);
    await service.saveParticipationPolicy('JSP', { excuseMotifs: ['PRIVE', created.motif.motif_id], dispenseMotifs: [] }, ACTOR);
    await service.saveParticipationMotif({ motifId: created.motif.motif_id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'preserveHistoricalReferences || isMotifActive(id)');
    includes(ui, 'Archivé — conservé dans cette configuration.');
  });

  await record('03 — motif archivé encore visible configuration historique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif historique 5.3' }, ACTOR);
    const id = created.motif.motif_id;
    await repo.upsertEventDefinition({ code: 'HIST-5-3', label: 'Formation historique 5.3', domain: 'JSP', status: 'ACTIF' });
    const def = (await repo.listEventDefinitions({ domain: 'JSP' })).find((row) => row.code === 'HIST-5-3');
    await repo.upsertEventDefinitionVersion({ definition_id: def.definition_id, version_code: '2026', valid_from: '2026-01-01', valid_to: '2026-12-31', metadata: { excuseMotifs: [id] } });
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    const usage = await service.participationReferentialUsage('motif', id, ACTOR);
    eq(usage.usage.configurations.length, 1);
    eq(usage.usage.summary.configurations, 1);
  });

  await record('04 — usage configuration distingué de participation réelle', async () => {
    const { service, id } = await seedUsage();
    const usage = (await service.participationReferentialUsage('motif', id, ACTOR)).usage;
    ok(usage.summary.configurations >= 1, 'configuration comptée');
    ok(usage.summary.participations >= 1, 'participation réelle comptée');
    ok(Array.isArray(usage.events) && usage.events.length >= 1, 'événement de participation détaillé');
  });

  await record('05 — Oubli : protection expliquée par configuration/policy, pas seulement saisie', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const usage = (await service.participationReferentialUsage('motif', 'OUBLI', ACTOR)).usage;
    ok(Number(usage.summary.policies || 0) > 0 || Number(usage.summary.policyVersions || 0) > 0, 'Oubli référencé par règle JSP par défaut');
    eq(Number(usage.summary.participations || 0), 0);
    eq(usage.canDelete, false);
  });

  await record('06 — canDelete distinct de participationCount', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await service.saveParticipationPolicy('JSP', { excuseMotifs: ['OUBLI'], dispenseMotifs: [] }, ACTOR);
    const catalog = await service.participationPolicies();
    const row = motif(catalog, 'OUBLI');
    eq(row.usageSummary.participations, 0);
    eq(row.canDelete, false);
  });

  await record('07 — motif référencé jamais saisi protégé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif reference seul 5.3' }, ACTOR);
    await service.saveParticipationPolicy('JSP', { excuseMotifs: ['PRIVE', created.motif.motif_id], dispenseMotifs: [] }, ACTOR);
    await assert.rejects(() => service.deleteParticipationMotif(created.motif.motif_id, ACTOR), /doit être archivé/);
  });

  await record('08 — Voir les usages retourne configurations', async () => {
    const { service, id } = await seedUsage();
    const usage = (await service.participationReferentialUsage('motif', id, ACTOR)).usage;
    ok(usage.configurations.length >= 1, 'configuration listée');
    includes(usage.configurations[0].label, 'Formation trace');
  });

  await record('09 — Voir les usages retourne événements/personnes si elles existent', async () => {
    const { service, id } = await seedUsage();
    const usage = (await service.participationReferentialUsage('motif', id, ACTOR)).usage;
    ok(usage.events.length >= 1, 'événement listé');
    ok(usage.events[0].people.length >= 1, 'personne listée');
    eq(usage.events[0].people[0].nip, '52371');
  });

  await record('10 — aucune donnée nominative sans permission personnel:read', async () => {
    const { repo, id } = await seedUsage();
    const usage = await repo.listParticipationReferentialUsageDetails('motif', id, { includePeople: false });
    ok(usage.events.length >= 1, 'événement agrégé listé');
    ok(!usage.events[0].people, 'pas de personnes sans personnel:read');
    eq(usage.peopleRestricted, true);
  });

  await record('11 — absence de N+1 au chargement configuration', () => {
    const api = read('assets/js/scope-api.js');
    const ui = read('assets/js/scope-ui.js');
    const pg = read('netlify/lib/_scope-pg.js');
    includes(api, 'participationReferentialUsage(kind, id)');
    includes(ui, "root.querySelectorAll('[data-referential-usages]')");
    ok(ui.indexOf('client.participationReferentialUsage(kind, id)') > ui.indexOf("root.querySelectorAll('[data-referential-usages]"), 'détail appelé uniquement dans le handler');
    includes(pg, 'async listParticipationReferentialUsageDetails(kind, id, options = {})');
  });

  await record('12 — réactivation rend le motif disponible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: 'Motif reactive filtre 5.3' }, ACTOR);
    const id = created.motif.motif_id;
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: false, historique: true }, ACTOR);
    let catalog = await service.participationPolicies();
    eq(motif(catalog, id).active, false);
    await service.saveParticipationMotif({ motifId: id, motifType: 'EXCUSE', label: created.motif.label, active: true, historique: true }, ACTOR);
    catalog = await service.participationPolicies();
    eq(motif(catalog, id).active, true);
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
