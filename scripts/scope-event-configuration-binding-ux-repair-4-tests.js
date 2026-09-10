#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-CONFIGURATION-BINDING-UX-REPAIR-4 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const genericCatalog = require('../netlify/lib/_scope-generic-event-catalog');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-configuration-binding-ux-repair-4', roles: ['sdis-admin'], displayName: 'Testeur R4' };
const results = [];
let assertions = 0;

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, index){
  const personne = await repo.insertPersonne({
    nip,
    nom: `Binding${String(index).padStart(2, '0')}`,
    prenom: 'DAP',
    grade: 'Sap',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleRow.cible_id,
    date_debut: '2020-01-01',
    date_fin: null
  });
  return personne;
}

async function frozenEvent(service, cibleRow, date, libelle, exerciseEquivalenceKey){
  const created = await service.createEvenement({
    date,
    domaineCode: cibleRow.domaine_code,
    libelle,
    cibleIds: [cibleRow.cible_id],
    exerciseEquivalenceKey
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function saveOne(service, eventId, personne, statut, motifAbsence){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: [{
      personneId: personne.personne_id,
      statut,
      motifAbsence: motifAbsence || null,
      role: 'PARTICIPANT'
    }]
  }, ACTOR);
}

(async () => {
  await record('01 — résolution configuration par domaine et date', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const dap = catalog.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE');
    ok(dap, 'définition DAP groupée présente');
    const v2026 = genericCatalog.findApplicableVersion(dap.versions, dap.definition_id, '2026-04-23');
    eq(v2026.version_code, '2026');
  });

  await record('02 — temporalité 2026 / 2027 déterministe', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const dap = catalog.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE');
    const source = dap.versions[0];
    const reconducted = await service.reconductEventDefinitionVersion(source.definition_version_id, { year: 2027 }, ACTOR);
    const refreshed = (await service.formationCatalog()).formationCatalog.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE');
    eq(genericCatalog.findApplicableVersion(refreshed.versions, dap.definition_id, '2026-04-23').version_code, '2026');
    eq(genericCatalog.findApplicableVersion(refreshed.versions, dap.definition_id, '2027-04-23').version_code, '2027');
    ok(reconducted.version.definition_version_id !== source.definition_version_id, 'nouvelle version annuelle');
  });

  await record('03 — association explicite événement → configuration et session', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cibleRow = await cible(repo, 'DAP', 'Y1');
    const catalog = (await service.formationCatalog()).formationCatalog;
    const version = catalog.definitionVersions.find((row) => row.definitionCode === 'DAP-FORMATION-GROUPEE');
    const created = await service.createEvenement({
      date: '2026-04-23',
      domaineCode: 'DAP',
      cibleIds: [cibleRow.cible_id],
      libelle: 'Formation groupée DAP 1.1',
      definitionVersionId: version.definition_version_id,
      modeSession: 'MULTI',
      sessionIndex: 1
    }, ACTOR);
    eq(created.evenement.definition_version_id, version.definition_version_id);
    eq(created.evenement.session_index, 1);
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    eq(fiche.formationConfiguration.label, 'Formation groupée DAP');
    eq(fiche.formationConfiguration.version, '2026');
    eq(fiche.formationConfiguration.sessionIndex, 1);
    const after = (await service.formationCatalog()).formationCatalog;
    const refreshed = after.definitions.find((row) => row.code === 'DAP-FORMATION-GROUPEE').versions[0];
    eq(refreshed.linkedEventCount, 1);
    eq(refreshed.linkedEvents[0].libelle, 'Formation groupée DAP 1.1');
  });

  await record('04 — aucune association silencieuse ambiguë', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cibleRow = await cible(repo, 'DAP', 'Y1');
    const created = await service.createEvenement({
      date: '2026-04-23',
      domaineCode: 'DAP',
      cibleIds: [cibleRow.cible_id],
      libelle: 'Formation groupée DAP 1.1'
    }, ACTOR);
    ok(!created.evenement.definition_version_id, 'pas de rattachement sans choix explicite');
  });

  await record('05 — UX configuration, fiche événement, Annuler et règles', () => {
    const ui = read('assets/js/scope-ui.js');
    const css = read('assets/css/scope.css');
    includes(ui, 'Événements utilisant cette configuration');
    includes(ui, 'Les événements peuvent être associés lors de leur création ou lors d’un import validé.');
    includes(ui, 'Configuration de formation');
    includes(ui, 'Session ${escapeHtml(String(cfg.sessionIndex))} sur ${escapeHtml(String(cfg.sessionCount))}');
    includes(ui, 'formation-cancel-edit');
    includes(ui, 'Abandonner les modifications ?');
    includes(ui, 'scope-event-config-box');
    includes(ui, 'new-definition-version');
    includes(ui, 'Aucune configuration de formation compatible n’est définie pour cet événement.');
    includes(ui, 'Plusieurs configurations sont compatibles');
    includes(css, 'grid-template-columns: 18px minmax(0, 1fr)');
    includes(css, 'accent-color: var(--scope-blue)');
    includes(css, '.scope-associated-event');
    ok(!ui.includes('<label>Base de règles</label>'), 'ancien vocabulaire policy absent');
  });

  await record('06 — doublons motifs et permutation Multi-session protégée', async () => {
    const ui = read('assets/js/scope-ui.js');
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cibleRow = await cible(repo, 'DAP', 'Y1');
    const simple = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DAP',
      cibleIds: [cibleRow.cible_id],
      libelle: 'Exercice DAP simple'
    }, ACTOR);
    const simpleFiche = await service.lireEvenement(simple.evenement.evenement_id);
    includes(ui, 'uniqueMotifIds');
    includes(ui, "motifItems('DISPENSE', selectedDispenseMotifs)");
    includes(ui, 'Permutation non disponible pour une formation à plusieurs sessions.');
    ok((simpleFiche.participationPolicy.activeStatuses || []).includes('PERMUTATION'), 'DAP simple conserve Permutation');
  });

  await record('07 — reset DAP supprime l’obligation fantôme sans toucher les autres événements', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const y2 = await cible(repo, 'DAP', 'Y2');
    const p1 = await person(repo, y1, 'R4-001', 1);
    const p2 = await person(repo, y1, 'R4-002', 2);
    const source = await frozenEvent(service, y1, '2026-04-01', 'Exercice DAP 1', 'DAP-R4-EX1');
    const target = await frozenEvent(service, y2, '2026-04-08', 'Exercice DAP 1', 'DAP-R4-EX1');
    const otherSource = await frozenEvent(service, y1, '2026-05-01', 'Exercice DAP 2', 'DAP-R4-EX2');
    await saveOne(service, source.eventId, p1, 'PERMUTATION');
    await saveOne(service, otherSource.eventId, p2, 'PERMUTATION');
    eq((await service.permutationsForEvent(target.eventId)).obligations.length, 1);
    const sourceFiche = await service.lireEvenement(source.eventId);
    await service.resetParticipations(source.eventId, { baseVersion: sourceFiche.evenement.version }, ACTOR);
    eq((await repo.listPermutations({ personneId: p1.personne_id })).length, 0, 'obligation source supprimée');
    eq((await service.permutationsForEvent(target.eventId)).obligations.length, 0, 'rattrapage disponible recalculé');
    eq((await repo.listPermutations({ personneId: p2.personne_id })).length, 1, 'autre événement préservé');
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'state.permutationObligations = [];');
    includes(ui, 'state.permutationPanelOpen = false;');
  });

  await record('08 — protections et performance R3 préservées', () => {
    const service = read('netlify/lib/_scope-service.js');
    const ui = read('assets/js/scope-ui.js');
    const html = read('scope.html');
    includes(service, 'loadMultiSessionV2State');
    includes(service, 'PR_LEGACY');
    includes(service, 'removeSourcePermutationObligation(tx, evenement, attendu.personne_id, actor)');
    ok(!ui.includes('jobs.push(refreshAlertCounts())'), 'pas de chargement alertes bloquant');
    includes(ui, "refreshAlertCounts().then(() => render()).catch(() => {})");
    ok(html.includes('scope-referentials-usage-traceability-active-filter-repair-5-3') || html.includes('scope-event-configuration-binding-ux-repair-4') || html.includes('scope-configuration-formation-ux-referentials-finish-5'), 'cache-buster SCOPE récent');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-EVENT-CONFIGURATION-BINDING-UX-REPAIR-4 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-EVENT-CONFIGURATION-BINDING-UX-REPAIR-4 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
