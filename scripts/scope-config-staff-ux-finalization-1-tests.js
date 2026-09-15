#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIG-STAFF-UX-FINALIZATION-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { validateParticipationPatch } = require('../netlify/lib/_scope-rules');
const { resolveParticipationPolicy } = require('../netlify/lib/_scope-participation-policy');
const { PROVENANCE } = require('../netlify/lib/_scope-training-context-resolver');

const ROOT = path.resolve(__dirname, '..');
const UI = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const SERVICE = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
const ACTOR = { sub: 'scope-config-staff-ux-finalization-1', roles: ['sdis-admin'], displayName: 'Testeur SCOPE' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(source, fragment, message){ assertions += 1; assert.ok(source.includes(fragment), message || fragment); }
function notIncludes(source, fragment, message){ assertions += 1; assert.ok(!source.includes(fragment), message || fragment); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function addPerson(repo, id, nip, cibleId){
  const person = await repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Nom${nip}`,
    prenom: 'Test',
    grade: 'Sap',
    date_entree: '2026-01-01',
    date_entree_sdis: '2026-01-01'
  });
  await repo.insertAffectation({ personne_id: person.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return person;
}

async function buildJspEvent(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible('JSP', 'GEN') || await repo.findCible('JSP', 'G1') || (await repo.listCibles()).find((row) => row.domaine_code === 'JSP');
  const staff = await addPerson(repo, 'staff-ux-finalization-1', '77801', cible.cible_id);
  const created = await service.createEvenement({
    date: '2026-09-09',
    domaineCode: 'JSP',
    libelle: 'Exercice JSP 7',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    heureDebut: '18:00',
    heureFin: '20:00',
    heureDebutPrevue: '18:00',
    heureFinPrevue: '20:00',
    heureDebutReelle: '18:00',
    heureFinReelle: '20:00'
  }, ACTOR);
  return { repo, service, eventId: created.evenement.evenement_id, version: created.evenement.version, staff };
}

async function buildPrRepo(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const pr = await repo.findCible('PR', 'GEN') || (await repo.listCibles()).find((row) => row.domaine_code === 'PR');
  await repo.insertCycle({ cycle_id: 'cycle-pr-2026', cycle_key: 'PR-2026', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'Cycle PR 2026', statut: 'REALISE' });
  for(const index of [1, 2, 3, 4, 5, 6]){
    const event = await repo.insertEvenement({
      evenement_id: `ux-pr-1-${index}`,
      cycle_id: 'cycle-pr-2026',
      date: `2026-01-${String(10 + index).padStart(2, '0')}`,
      domaine_code: 'PR',
      libelle: `Exercice PR 1.${index} | Base`,
      code_cours: `ux-pr-1-${index}`,
      statut: 'REALISE',
      origine: 'IMPORT_CSV',
      mode_suivi: 'NOMINATIF',
      cible_ids: [pr.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [pr.cible_id]);
  }
  for(const index of [1, 2, 3]){
    const event = await repo.insertEvenement({
      evenement_id: `ux-abc-${index}`,
      cycle_id: 'cycle-pr-2026',
      date: `2026-04-0${index}`,
      domaine_code: 'PR',
      libelle: `Exercice PR-ABC | Refresh ${index}`,
      statut: 'REALISE',
      origine: 'IMPORT_CSV',
      mode_suivi: 'NOMINATIF',
      cible_ids: [pr.cible_id],
      pr_exercise_group_key: 'scope-prod-pr-abc-refresh-2026',
      pr_session_key: `scope-prod-pr-abc-refresh-2026.${index}`,
      session_index: index,
      nombre_sessions_attendu: 3
    });
    await repo.setEventCibles(event.evenement_id, [pr.cible_id]);
  }
  return { service };
}

(async () => {
  await record('01 — modification heure debut bascule automatiquement en Individuel', () => {
    includes(UI, 'switchEncadrementToCustomFromTimeEdit');
    ok(/getElementById\('enc-debut'\)\?\.addEventListener\('input'[\s\S]*switchEncadrementToCustomFromTimeEdit\(\)/.test(UI));
    ok(/radio\.checked = radio\.value === 'CUSTOM'/.test(UI));
  });

  await record('02 — modification heure fin bascule automatiquement en Individuel', () => {
    ok(/getElementById\('enc-fin'\)\?\.addEventListener\('input'[\s\S]*switchEncadrementToCustomFromTimeEdit\(\)/.test(UI));
  });

  await record('03 — retour explicite Individuel vers Evenement restaure les horaires evenement', async () => {
    includes(UI, "state.encTimeMode !== 'CUSTOM'");
    includes(UI, "state.encHeureDebut = ''");
    includes(UI, "state.encHeureFin = ''");
    includes(UI, "startInput.value = hours.start || ''");
    includes(UI, "endInput.value = hours.end || ''");
    const { service, eventId, version, staff } = await buildJspEvent();
    const added = await service.ajouterEncadrement(eventId, {
      baseVersion: version,
      personneId: staff.personne_id,
      role: 'FORMATEUR',
      timeMode: 'CUSTOM',
      heureDebutIndividuelle: '12:30',
      heureFinIndividuelle: '12:30'
    }, ACTOR);
    await service.modifierEncadrement(eventId, {
      baseVersion: added.version,
      personneId: staff.personne_id,
      role: 'FORMATEUR',
      timeMode: 'EVENT'
    }, ACTOR);
    const row = (await service.lireEvenement(eventId)).encadrement.find((item) => item.personne_id === staff.personne_id);
    eq(row.horaireMode, 'EVENT');
    eq(row.heureDebutEffective, '18:00');
    eq(row.heureFinEffective, '20:00');
  });

  await record('04 — ancienne valeur individuelle perimee ne reapparait pas en mode Evenement', async () => {
    const { service, eventId, version, staff } = await buildJspEvent();
    const added = await service.ajouterEncadrement(eventId, {
      baseVersion: version,
      personneId: staff.personne_id,
      role: 'SURVEILLANT',
      timeMode: 'CUSTOM',
      heureDebutIndividuelle: '12:30',
      heureFinIndividuelle: '12:30'
    }, ACTOR);
    await service.modifierEncadrement(eventId, {
      baseVersion: added.version,
      personneId: staff.personne_id,
      role: 'SURVEILLANT',
      timeMode: 'EVENT',
      heureDebutIndividuelle: null,
      heureFinIndividuelle: null
    }, ACTOR);
    const row = (await service.lireEvenement(eventId)).encadrement.find((item) => item.personne_id === staff.personne_id);
    eq(row.heure_debut_individuelle, null);
    eq(row.heure_fin_individuelle, null);
    eq(row.heureDebutEffective, '18:00');
    eq(row.heureFinEffective, '20:00');
  });

  await record('05 — actions Modifier/Supprimer utilisent des boutons icones accessibles', () => {
    includes(UI, 'function pencilIcon()');
    includes(UI, 'function trashIcon()');
    ok(/data-enc-edit=[\s\S]*aria-label="Modifier/.test(UI));
    ok(/data-enc-remove=[\s\S]*aria-label="Supprimer/.test(UI));
    includes(UI, 'title="Modifier"');
    includes(UI, 'title="Supprimer"');
    notIncludes(UI, 'data-enc-edit="${escapeHtml(p.personne_id)}">Modifier</button>');
  });

  await record('06 — actions conservees pour tous les roles du moteur encadrement', () => {
    includes(UI, 'encadrementRolesForEvent(fiche)');
    includes(UI, 'encadrementRoleOrder()');
    includes(UI, 'FORMATEUR');
    includes(UI, 'MONITEUR');
    includes(UI, 'SURVEILLANT');
    includes(UI, 'AUXILIAIRE');
    ok(/people\.map\(\(p\)[\s\S]*data-enc-edit[\s\S]*data-enc-remove/.test(UI));
  });

  await record('07 — renommage formation persiste en une seule sauvegarde', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createEventDefinition({
      domain: 'JSP',
      label: 'Exercice JSP',
      versionCode: '2026',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1
    }, ACTOR);
    const saved = await service.createEventDefinition({
      definitionVersionId: created.version.definition_version_id,
      domain: 'JSP',
      label: 'Formation JSP',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1,
      policyVersionId: created.version.policy_version_id,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    }, ACTOR);
    eq(saved.definition.definition_id, created.definition.definition_id);
    eq(saved.version.definition_version_id, created.version.definition_version_id);
    eq(saved.definition.label, 'Formation JSP');
    eq(saved.version.definitionLabel, 'Formation JSP');
  });

  await record('08 — relecture apres sauvegarde retourne immediatement le nouveau nom', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const created = await service.createEventDefinition({
      domain: 'JSP',
      label: 'Exercice JSP',
      versionCode: '2026',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1
    }, ACTOR);
    await service.createEventDefinition({
      definitionVersionId: created.version.definition_version_id,
      domain: 'JSP',
      label: 'Formation JSP',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    }, ACTOR);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const definition = catalog.definitions.find((row) => row.definition_id === created.definition.definition_id);
    const version = catalog.definitionVersions.find((row) => row.definition_version_id === created.version.definition_version_id);
    eq(definition.label, 'Formation JSP');
    eq(version.definitionLabel, 'Formation JSP');
    includes(UI, 'formationRerenderFields');
    notIncludes(UI, "const formationRerenderFields = new Set(['domain', 'label'");
    includes(UI, 'const savedConfiguration = await client.createEventDefinition');
  });

  await record('09 — JSP OUBLI unique et ordonne apres Activite extra-scolaire', () => {
    const jsp = resolveParticipationPolicy('JSP');
    eq(jsp.excuseMotifs.filter((id) => id === 'OUBLI').length, 1);
    eq(jsp.excuseMotifs.indexOf('OUBLI'), jsp.excuseMotifs.indexOf('ACTIVITE_EXTRA_SCOLAIRE') + 1);
  });

  await record('10 — PR 1.x consolide sans masquer les six sessions historiques', async () => {
    const { service } = await buildPrRepo();
    const pr6 = await service.lireEvenement('ux-pr-1-6');
    eq(pr6.trainingContext.provenance, PROVENANCE.PR_HISTORICAL_FALLBACK);
    eq(pr6.trainingContext.obligationKey, 'cycle-pr-2026:PR:1');
    eq(pr6.trainingContext.sessionCount, 6);
    eq(pr6.trainingContext.sessionIndex, 6);
  });

  await record('11 — PR-ABC reste distinct et multi-session', async () => {
    const { service } = await buildPrRepo();
    const abc = await service.lireEvenement('ux-abc-3');
    eq(abc.trainingContext.provenance, PROVENANCE.PERSISTED_HISTORICAL_KEY);
    eq(abc.trainingContext.sessionCount, 3);
    eq(abc.trainingContext.sessionIndex, 3);
  });

  await record('12 — DAP permutation/rattrapage non generalises', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const catalog = (await service.formationCatalog()).formationCatalog;
    const dapVersion = catalog.definitionVersions.find((row) => row.definitionCode === 'DAP-FORMATION-GROUPEE');
    eq(dapVersion.mode_organisation, 'MULTI_SESSION');
    eq(Number(dapVersion.session_count), 2);
    assert.throws(() => validateParticipationPatch({ statut: 'PERMUTATION' }, {
      domaineCode: 'JSP',
      participationPolicySnapshot: resolveParticipationPolicy('JSP')
    }), /domaine DAP/i);
  });

  await record('13 — aucun double-submit ni dependance externe ni schema', () => {
    eq((UI.match(/client\.createEventDefinition/g) || []).length, 1);
    notIncludes(UI, "setTimeout(() => document.getElementById('formation-create')?.click");
    notIncludes(SERVICE, 'create table');
    ok(/\.scope-enc-actions[\s\S]*max-width: 56px/.test(CSS));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-CONFIG-STAFF-UX-FINALIZATION-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-CONFIG-STAFF-UX-FINALIZATION-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
