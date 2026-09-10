#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-CONFIGURATION-BINDING-MIGRATION-6 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-configuration-binding-migration-6', roles: ['sdis-admin'], permissions: ['references:manage', 'events:create', 'personnel:read'], displayName: 'Testeur R6' };
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

async function dpsCible(repo){
  const cibles = await repo.listCibles();
  return cibles.find((row) => row.domaine_code === 'DPS' && row.niveau_code !== 'GEN') || cibles.find((row) => row.domaine_code === 'DPS');
}

async function seedDpsContext(options = {}){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const motif = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: options.motifLabel || 'Recette TEST R6' }, ACTOR);
  const created = await service.createEventDefinition({
    domain: 'DPS',
    label: options.label || 'Formation groupée DPS R6',
    modeOrganisation: options.modeOrganisation || 'MULTI_SESSION',
    sessionCount: options.sessionCount || 6,
    year: 2026,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    policyConfig: {
      activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
      excuseMotifs: ['PRIVE', 'PROFESSIONNEL', 'ARMEE', 'ACCIDENT_MALADIE', motif.motif.motif_id],
      dispenseMotifs: ['FORMATEUR_PR']
    }
  }, ACTOR);
  const cible = await dpsCible(repo);
  return { repo, service, motifId: motif.motif.motif_id, versionId: created.version.definition_version_id, cible };
}

(async () => {
  await record('01 — événement legacy compatible détecté', async () => {
    const { repo, service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.1 | DPS | OFSI | ABC', cibleIds: [cible.cible_id] }, ACTOR);
    const preview = await service.previewFormationEventAssociation(versionId);
    const row = preview.associationPreview.candidates.find((item) => item.eventId === event.evenement.evenement_id);
    eq(row.status, 'COMPATIBLE');
    eq(row.sessionIndex, 1);
    ok(row.selectable, 'candidat sélectionnable');
  });

  await record('02 — preview sans écriture', async () => {
    const { service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.2 | DPS', cibleIds: [cible.cible_id] }, ACTOR);
    const before = await service.lireEvenement(event.evenement.evenement_id);
    await service.previewFormationEventAssociation(versionId);
    const after = await service.lireEvenement(event.evenement.evenement_id);
    eq(after.evenement.definition_version_id || null, before.evenement.definition_version_id || null);
    eq(after.evenement.version, before.evenement.version);
  });

  await record('03 — association explicite', async () => {
    const { service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.3 | DPS', cibleIds: [cible.cible_id] }, ACTOR);
    const result = await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    eq(result.count, 1);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    eq(String(fiche.evenement.definition_version_id), String(versionId));
    eq(fiche.formationConfiguration.originLabel, 'Association manuelle');
  });

  await record('04 — configuration visible sur événement', async () => {
    const { service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.4 | DPS', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    eq(fiche.formationConfiguration.label, 'Formation groupée DPS R6');
    eq(fiche.formationConfiguration.version, '2026');
    eq(fiche.formationConfiguration.sessionIndex, 4);
  });

  await record('05 — motif custom disponible après association', async () => {
    const { service, versionId, cible, motifId } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.5 | DPS', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    ok((fiche.participationPolicy && fiche.participationPolicy.excuseMotifs || []).includes(motifId), 'Recette TEST disponible dans la saisie');
  });

  await record('06 — événement avec participation incompatible bloqué', async () => {
    const { repo, service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.6 | DPS', cibleIds: [cible.cible_id] }, ACTOR);
    const person = await repo.upsertPersonne({ personne_id: 'r6-person-incompatible', nip: '60001', grade: 'Sap', nom: 'R6', prenom: 'Incompatible' });
    await repo.upsertParticipation({ evenement_id: event.evenement.evenement_id, personne_id: person.personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'OUBLI', role: 'PARTICIPANT' });
    await assert.rejects(() => service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id], confirmExistingParticipations: true }, ACTOR), /règles absentes|Association incompatible/);
  });

  await record('07 — événement réalisé conserve son snapshot', async () => {
    const { repo, service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée 1.1 réalisé | DPS', cibleIds: [cible.cible_id] }, ACTOR);
    await repo.updateEventIfVersion(event.evenement.evenement_id, event.version, { statut: 'REALISE' });
    const before = await service.lireEvenement(event.evenement.evenement_id);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id], confirmExistingParticipations: true }, ACTOR);
    const after = await service.lireEvenement(event.evenement.evenement_id);
    eq(after.evenement.statut, 'REALISE');
    eq(JSON.stringify(after.evenement.participation_policy_snapshot), JSON.stringify(before.evenement.participation_policy_snapshot));
  });

  await record('08 — ambiguïté configuration non résolue silencieusement', async () => {
    const { service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS sans numéro', cibleIds: [cible.cible_id] }, ACTOR);
    const preview = await service.previewFormationEventAssociation(versionId);
    const row = preview.associationPreview.candidates.find((item) => item.eventId === event.evenement.evenement_id);
    eq(row.status, 'AMBIGU');
    ok(!row.selectable, 'pas d’association silencieuse');
    await assert.rejects(() => service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR), /session doit être précisé/);
    const associated = await service.associateEventsToFormationConfiguration(versionId, { events: [{ eventId: event.evenement.evenement_id, sessionIndex: 2 }] }, ACTOR);
    eq(associated.count, 1);
  });

  await record('09 — session Multi-session correctement associée', async () => {
    const { service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.2', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    eq(fiche.formationConfiguration.sessionIndex, 2);
  });

  await record('10 — configuration utilisée protégée contre modification historique', async () => {
    const { service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.3', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const catalog = await service.formationCatalog();
    const version = catalog.formationCatalog.definitionVersions.find((row) => String(row.definition_version_id) === String(versionId));
    ok(Number(version.linkedEventCount || 0) >= 1, 'version marquée utilisée');
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'Créer une nouvelle version');
  });

  await record('11 — DAP 1.1/1.2 existants préservés', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const catalog = await service.formationCatalog();
    const dap = catalog.formationCatalog.definitionVersions.find((row) => row.definitionCode === 'DAP-FORMATION-GROUPEE');
    ok(dap, 'configuration DAP Multi-session conservée');
    eq(dap.session_count, 2);
  });

  await record('12 — aucune modification des participations pendant association', async () => {
    const { repo, service, versionId, cible } = await seedDpsContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.4', cibleIds: [cible.cible_id] }, ACTOR);
    const person = await repo.upsertPersonne({ personne_id: 'r6-person-compatible', nip: '60002', grade: 'Sap', nom: 'R6', prenom: 'Compatible' });
    await repo.upsertParticipation({ evenement_id: event.evenement.evenement_id, personne_id: person.personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE', role: 'PARTICIPANT' });
    const before = await repo.listParticipations(event.evenement.evenement_id);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id], confirmExistingParticipations: true }, ACTOR);
    const after = await repo.listParticipations(event.evenement.evenement_id);
    eq(JSON.stringify(after), JSON.stringify(before));
  });

  await record('13 — endpoints et UX association exposés', () => {
    includes(read('netlify/functions/scope.js'), '/formation/definition-versions/:id/association-preview');
    includes(read('netlify/functions/scope.js'), '/formation/definition-versions/:id/associate-events');
    includes(read('assets/js/scope-api.js'), 'previewFormationEventAssociation');
    includes(read('assets/js/scope-ui.js'), 'Associer des événements');
    includes(read('assets/js/scope-ui.js'), 'renderFormationAssociationPreviewHtml');
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
