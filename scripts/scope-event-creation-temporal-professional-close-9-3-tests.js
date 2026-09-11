#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-CREATION-TEMPORAL-PROFESSIONAL-CLOSE-9.3 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-creation-temporal-professional-close-9-3', permissions: ['events:create', 'events:update', 'references:manage'], roles: ['sdis-admin'] };
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

function codesOf(logic, domain, rows){
  return logic.sortCiblesForEventForm(rows.filter((row) => (row.domaineCode || row.domaine_code) === domain))
    .map((row) => row.niveauCode || row.niveau_code);
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const css = read('assets/css/scope.css');
  const logic = loadLogic();
  const startBlock = sourceBlock(ui, "document.getElementById('new-heure-debut')?.addEventListener('input'");
  const endBlock = sourceBlock(ui, "document.getElementById('new-heure-fin')?.addEventListener('input'");
  const repoCibles = (await createMemoryRepo().listCibles()).map((row) => ({
    domaineCode: row.domaine_code,
    niveauCode: row.niveau_code,
    cibleId: row.cible_id,
    libelle: row.libelle
  }));

  await record('01 — domaine vide', async () => {
    includes(ui, "domaineForm: ''");
    includes(ui, 'Choisir un domaine');
    includes(ui, 'function resetNouveauForm()');
    notIncludes(ui, "state.domaineForm || 'DPS'");
  });

  await record('02 — taxonomie domaine conforme liste Événements', async () => {
    const groups = logic.domainTaxonomyGroups();
    eq(groups[0].label, 'Domaines opérationnels');
    eq(groups[0].codes.join(','), 'DPS,DAP,JSP');
    eq(groups[1].label, 'Formations');
    eq(groups[1].codes.join(','), 'FOBA,FOCA,FOSPEC');
    eq(groups[2].label, 'Spécialisations FOSPEC');
    eq(groups[2].codes.join(','), 'PR,AUTO');
    includes(ui, 'function domainTaxonomySelectHtml');
    includes(ui, 'id="filter-domaine"');
    includes(ui, 'id="new-domaine"');
    includes(ui, 'domainTaxonomySelectHtml(domaine');
    includes(ui, "domainTaxonomySelectHtml(state.domaine === 'tous'");
  });

  await record('03 — PR/AUTO groupés visuellement sous FOSPEC', async () => {
    includes(ui, "label: 'Spécialisations FOSPEC'");
    const helper = sourceBlock(ui, 'function domainTaxonomySelectHtml', 900);
    includes(helper, 'optgroup');
  });

  await record('04 — ordre DPS', async () => {
    eq(codesOf(logic, 'DPS', repoCibles).filter((code) => code !== 'GEN').join(','), 'G1,C1,B1,B2');
    eq(codesOf(logic, 'DPS', repoCibles).slice(-1)[0], 'GEN');
  });

  await record('05 — ordre DAP', async () => {
    eq(codesOf(logic, 'DAP', repoCibles).filter((code) => code !== 'GEN').join(','), 'Y1,Y2,Y3,Y4');
  });

  await record('06 — ordre JSP', async () => {
    eq(codesOf(logic, 'JSP', repoCibles).filter((code) => code !== 'GEN').join(','), 'G1,C1,B1,CAD');
  });

  await record('07 — Cadets après sites JSP', async () => {
    const jsp = codesOf(logic, 'JSP', repoCibles);
    ok(jsp.indexOf('CAD') > jsp.indexOf('B1'), 'CAD après B1');
    eq(logic.cibleMetierLabel('JSP', 'CAD'), 'Cadets');
  });

  await record('08 — cond VL', async () => {
    eq(logic.cibleMetierLabel('AUTO', 'VL'), 'cond VL');
  });

  await record('09 — cond PL', async () => {
    eq(logic.cibleMetierLabel('AUTO', 'PL'), 'cond PL');
  });

  await record('10 — absence Cond.', async () => {
    notIncludes(ui, 'Cond. VL');
    notIncludes(ui, 'Cond. PL');
    eq(logic.cibleMetierLabel('AUTO', 'VL').includes('Cond.'), false);
  });

  await record('11 — cible label+checkbox même unité de ligne', async () => {
    includes(ui, '<span>${escapeHtml(eventCibleLabel(c))}</span>');
    includes(ui, 'class="scope-target-chip" for="');
    includes(css, 'white-space: nowrap');
    includes(css, 'flex-wrap: nowrap');
    includes(css, 'align-items: baseline');
    includes(css, '.scope-field .scope-target-chip');
    notIncludes(css, '.scope-target-chip input {\n  position: absolute');
  });

  await record('12 — configuration masquée en ponctuel', async () => {
    includes(ui, 'id="new-config-ponctuel-help"');
    includes(ui, 'Cet événement utilise les règles standards du domaine.');
    includes(ui, "configMode === 'EXISTING' ? `");
  });

  await record('13 — configuration visible uniquement en mode configuration', async () => {
    includes(ui, 'id="new-config-select-wrap"');
    includes(ui, 'id="new-definition-version"');
    includes(ui, 'Aucune configuration de formation spécifique disponible pour ce domaine et cette date.');
    includes(ui, "String(definition.domain || '').toUpperCase() !== String(domaine || '').toUpperCase()");
  });

  await record('14 — récapitulatif réactif', async () => {
    includes(ui, 'function updateNewEventRecap()');
    includes(ui, 'function updateNewDurationPreview()');
    includes(sourceBlock(ui, 'function updateNewDurationPreview()'), 'updateNewEventRecap();');
    includes(ui, 'id="new-recap-identity-primary"');
    includes(ui, 'id="new-recap-targets"');
    includes(ui, 'id="new-recap-config-primary"');
    includes(ui, 'id="new-recap-suivi"');
  });

  await record('15 — création ponctuelle', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'B1')
      || (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const personne = await repo.insertPersonne({ nip: 'R93P1', nom: 'Recette', prenom: 'Ponctuel', grade: 'Sap' });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    const created = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Recette R9.3 ponctuel',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'SINGLE',
      heureDebutPrevue: '19:00',
      heureFinPrevue: '21:30'
    }, ACTOR);
    ok(created.evenement.evenement_id, 'event id');
    ok(created.evenement.code_cours, 'code créé');
    ok(!created.evenement.definition_version_id, 'pas de configuration artificielle');
    eq(created.evenement.domaine_code, 'DPS');
    eq(created.evenement.heure_debut_prevue, '19:00');
    eq(created.evenement.heure_fin_prevue, '21:30');
    eq(created.evenement.heure_debut_reelle, '19:00');
    eq(created.evenement.heure_fin_reelle, '21:30');
    eq(created.evenement.duree_reelle_minutes, 150);
    const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, ACTOR);
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    ok((fiche.attendus || []).some((row) => String(row.personne_id) === String(personne.personne_id)), 'population générée');
    eq(fiche.evenement.statut, 'PLANIFIE');
    ok(frozen.evenement.population_figee, 'accessible en saisie après gel');
  });

  await record('16 — création avec configuration', async () => {
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
      libelle: 'Recette R9.3 configuration',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'MULTI',
      nombreSessionsAttendu: 6,
      sessionIndex: 2,
      definitionVersionId: createdDef.version.definition_version_id,
      heureDebutPrevue: '19:00',
      heureFinPrevue: '21:30'
    }, ACTOR);
    ok(created.evenement.definition_version_id, 'configuration persistée');
    eq(String(created.evenement.definition_version_id), String(createdDef.version.definition_version_id));
    eq(created.evenement.session_index, 2);
    ok(created.evenement.policy_version_id, 'policy_version_id cohérent');
    eq(created.evenement.heure_debut_prevue, '19:00');
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    eq(fiche.formationConfiguration.label, 'Formation groupée DPS');
    eq(fiche.formationConfiguration.sessionIndex, 2);
    eq(fiche.formationConfiguration.sessionCount, 6);
  });

  await record('17 — definition_version_id correct', async () => {
    includes(ui, 'definitionVersionId: state.configurationModeForm === \'EXISTING\' ? (state.definitionVersionForm || null) : null');
  });

  await record('18 — X/N persisté', async () => {
    includes(ui, 'sessionIndex: modeSession === \'MULTI\' ? Number(state.sessionIndexChoice || 1) : 1');
  });

  await record('19 — temporalité prévu/réel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const created = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Recette R9.3 horaire réel',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      heureDebutPrevue: '19:00',
      heureFinPrevue: '21:30'
    }, ACTOR);
    eq(created.evenement.heure_debut_reelle, created.evenement.heure_debut_prevue);
    const patched = await service.patchEvenement(created.evenement.evenement_id, {
      baseVersion: created.version,
      heureDebutPrevue: '19:00',
      heureFinPrevue: '21:30',
      heureDebutReelle: '19:05',
      heureFinReelle: '21:42'
    }, ACTOR);
    eq(patched.evenement.heure_debut_prevue, '19:00');
    eq(patched.evenement.heure_fin_prevue, '21:30');
    eq(patched.evenement.heure_debut_reelle, '19:05');
    eq(patched.evenement.heure_fin_reelle, '21:42');
    eq(patched.evenement.duree_reelle_minutes, 157);
    eq(logic.formatDurationMinutes(157), '2 h 37');
  });

  await record('20 — durée calculée', async () => {
    eq(logic.formatDurationMinutes(150), '2 h 30');
    eq(logic.formatDurationMinutes(157), '2 h 37');
    eq(logic.formatDurationMinutes(75), '1 h 15');
  });

  await record('21 — passage minuit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const created = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Recette R9.3 minuit',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      heureDebutPrevue: '23:30',
      heureFinPrevue: '00:45'
    }, ACTOR);
    eq(created.evenement.duree_reelle_minutes, 75);
    ok(created.evenement.duree_reelle_minutes > 0, 'durée positive');
    eq(logic.formatDurationMinutes(75), '1 h 15');
  });

  await record('22 — modification sans changement CODE_EVENT', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const created = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Recette R9.3 à modifier',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      heureDebutPrevue: '19:00',
      heureFinPrevue: '21:30'
    }, ACTOR);
    const code = created.evenement.code_cours;
    const patched = await service.patchEvenement(created.evenement.evenement_id, {
      baseVersion: created.version,
      libelle: 'Recette R9.3 modifiée',
      date: '2026-03-13',
      heureDebutPrevue: '19:15',
      heureFinPrevue: '21:45',
      heureDebutReelle: '19:20',
      heureFinReelle: '21:50',
      motif: 'Ajustement horaire recette R9.3'
    }, ACTOR);
    eq(patched.evenement.code_cours, code);
    eq(patched.evenement.libelle, 'Recette R9.3 modifiée');
    await assert.rejects(
      () => service.patchEvenement(created.evenement.evenement_id, { baseVersion: patched.version, code_cours: 'HACK' }, ACTOR),
      /CODE COURS immuable|code_cours_immutable/
    );
  });

  await record('23 — snapshot/configuration conservé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS');
    const createdDef = await service.createEventDefinition({
      domain: 'DPS',
      label: 'Formation groupée DPS',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 6,
      year: 2026,
      validFrom: '2026-01-01'
    }, ACTOR);
    const created = await service.createEvenement({
      date: '2026-03-12',
      domaineCode: 'DPS',
      libelle: 'Recette R9.3 snapshot',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF',
      modeSession: 'MULTI',
      nombreSessionsAttendu: 6,
      sessionIndex: 3,
      definitionVersionId: createdDef.version.definition_version_id,
      heureDebutPrevue: '08:00',
      heureFinPrevue: '10:00'
    }, ACTOR);
    const before = await service.lireEvenement(created.evenement.evenement_id);
    const patched = await service.patchEvenement(created.evenement.evenement_id, {
      baseVersion: created.version,
      libelle: 'Recette R9.3 snapshot modifié',
      motif: 'Libellé'
    }, ACTOR);
    const after = await service.lireEvenement(patched.evenement.evenement_id);
    eq(String(after.evenement.definition_version_id), String(before.evenement.definition_version_id));
    eq(after.formationConfiguration.sessionIndex, 3);
    eq(after.evenement.code_cours, before.evenement.code_cours);
  });

  await record('24 — bloc information bleu présent', async () => {
    includes(ui, 'scope-event-config-card scope-business-info');
    includes(ui, '<div><dt>FORMATION</dt>');
    includes(ui, '<div><dt>ORGANISATION</dt>');
    includes(ui, '<div><dt>SESSION</dt>');
    includes(ui, 'PÉRIODE D’APPLICATION');
    includes(ui, 'RÈGLES DISPONIBLES');
    includes(ui, 'ORIGINE DE L’ASSOCIATION');
    includes(ui, 'Informations techniques');
    includes(css, 'background: #eff6ff');
    includes(css, 'color: #153e75');
    includes(css, 'border: 1px solid #1e3a8a');
  });

  await record('25 — PR legacy projection conservée', async () => {
    const service = read('netlify/lib/_scope-service.js');
    includes(service, 'Règles PR historiques');
    includes(service, "label: (exercise && exercise.libelle) || 'Cycle PR'");
    includes(service, 'legacyProjection: true');
  });

  await record('26 — bouton Compléter', async () => {
    includes(ui, "'Compléter'");
    notIncludes(ui, 'Compléter la saisie');
  });

  await record('27 — aucun render() horaire destructif', async () => {
    includes(startBlock, 'updateNewDurationPreview();');
    includes(endBlock, 'updateNewDurationPreview();');
    notIncludes(startBlock, 'render();');
    notIncludes(endBlock, 'render();');
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
