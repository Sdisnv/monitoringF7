#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-CONFIGURATION-UX-FILTER-ROUTING-REPAIR-6.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-event-config-filter-routing-repair-6-2', permissions: ['references:manage', 'events:create', 'personnel:read'], roles: ['sdis-admin'], displayName: 'Testeur R6.2' };
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

async function seedContext(options = {}){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const motif = await service.saveParticipationMotif({ motifType: 'EXCUSE', label: options.motifLabel || 'Recette TEST' }, ACTOR);
  const created = await service.createEventDefinition({
    domain: 'DPS',
    label: options.label || 'Formation groupée DPS R6.2',
    modeOrganisation: options.modeOrganisation || 'MULTI_SESSION',
    sessionCount: options.sessionCount || 6,
    year: 2026,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    policyConfig: {
      activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
      excuseMotifs: ['PRIVE', 'PROFESSIONNEL', motif.motif.motif_id],
      dispenseMotifs: []
    }
  }, ACTOR);
  const cible = await dpsCible(repo);
  return { repo, service, motifId: motif.motif.motif_id, versionId: created.version.definition_version_id, cible };
}

(async () => {
  await record('01 — motif archivé non utilisé retirable de configuration', async () => {
    const { repo, service, motifId, versionId } = await seedContext();
    await service.saveParticipationMotif({ motifId, motifType: 'EXCUSE', label: 'Recette TEST', active: false }, ACTOR);
    await service.createEventDefinition({
      definitionVersionId: versionId,
      domain: 'DPS',
      label: 'Formation groupée DPS R6.2',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 6,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
        excuseMotifs: ['PRIVE', 'PROFESSIONNEL'],
        dispenseMotifs: []
      }
    }, ACTOR);
    const motifs = await repo.listParticipationMotifRows();
    ok(motifs.some((row) => row.motif_id === motifId && row.actif === false), 'référentiel archivé conservé');
    const catalog = await service.formationCatalog();
    const version = catalog.formationCatalog.definitionVersions.find((row) => String(row.definition_version_id) === String(versionId));
    const policy = catalog.formationCatalog.policyVersions.find((row) => String(row.policy_version_id) === String(version.policy_version_id));
    ok(!(policy.config.excuseMotifs || []).includes(motifId), 'motif retiré de la configuration');
  });

  await record('02 — motif utilisé historiquement protégé', async () => {
    const { repo, service, motifId, versionId, cible } = await seedContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.1', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const person = await repo.upsertPersonne({ personne_id: 'r62-used-person', nip: '62001', grade: 'Sap', nom: 'Recette', prenom: 'Motif' });
    await repo.upsertParticipation({ evenement_id: event.evenement.evenement_id, personne_id: person.personne_id, statut: 'ABSENT_EXCUSE', motif_absence: motifId, role: 'PARTICIPANT' });
    await assert.rejects(() => service.createEventDefinition({
      definitionVersionId: versionId,
      domain: 'DPS',
      label: 'Formation groupée DPS R6.2',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 6,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
        excuseMotifs: ['PRIVE', 'PROFESSIONNEL'],
        dispenseMotifs: []
      }
    }, ACTOR), /Impossible de retirer cet élément|configuration_element_utilise/);
  });

  await record('03 — événement planifié ne propose plus le motif retiré', async () => {
    const { service, motifId, versionId, cible } = await seedContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.2', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    await service.createEventDefinition({
      definitionVersionId: versionId,
      domain: 'DPS',
      label: 'Formation groupée DPS R6.2',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 6,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
        excuseMotifs: ['PRIVE', 'PROFESSIONNEL'],
        dispenseMotifs: []
      }
    }, ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    ok(!(fiche.participationPolicy.excuseMotifs || []).includes(motifId), 'motif absent de la saisie planifiée');
  });

  await record('04 — snapshot réalisé intact', async () => {
    const { repo, service, motifId, versionId, cible } = await seedContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.3', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const before = await service.lireEvenement(event.evenement.evenement_id);
    await repo.updateEventIfVersion(event.evenement.evenement_id, before.evenement.version, { statut: 'REALISE' });
    const realised = await service.lireEvenement(event.evenement.evenement_id);
    await service.createEventDefinition({
      definitionVersionId: versionId,
      domain: 'DPS',
      label: 'Formation groupée DPS R6.2',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 6,
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'],
        excuseMotifs: ['PRIVE', 'PROFESSIONNEL'],
        dispenseMotifs: []
      }
    }, ACTOR);
    const after = await service.lireEvenement(event.evenement.evenement_id);
    ok((realised.evenement.participation_policy_snapshot.excuseMotifs || []).includes(motifId), 'snapshot initial contenait le motif');
    eq(JSON.stringify(after.evenement.participation_policy_snapshot), JSON.stringify(realised.evenement.participation_policy_snapshot));
  });

  await record('05 — association individuelle et réassociation', async () => {
    const { service, versionId, cible } = await seedContext();
    const a = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.1', cibleIds: [cible.cible_id] }, ACTOR);
    const b = await service.createEvenement({ date: '2026-05-13', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.2', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [a.evenement.evenement_id] }, ACTOR);
    let ficheA = await service.lireEvenement(a.evenement.evenement_id);
    let ficheB = await service.lireEvenement(b.evenement.evenement_id);
    eq(String(ficheA.evenement.definition_version_id), String(versionId));
    ok(!ficheB.evenement.definition_version_id, 'événement non sélectionné laissé inchangé');
    await service.dissociateEventsFromFormationConfiguration(versionId, { eventIds: [a.evenement.evenement_id] }, ACTOR);
    ficheA = await service.lireEvenement(a.evenement.evenement_id);
    ok(!ficheA.evenement.definition_version_id, 'événement dissocié conservé sans rattachement');
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [a.evenement.evenement_id] }, ACTOR);
    ficheA = await service.lireEvenement(a.evenement.evenement_id);
    eq(String(ficheA.evenement.definition_version_id), String(versionId));
  });

  await record('06 — dissociation réalisée interdite et journal dissociation créé', async () => {
    const { repo, service, versionId, cible } = await seedContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.4', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    await service.dissociateEventsFromFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const journal = await repo.listJournal('evenement', event.evenement.evenement_id);
    ok(journal.some((row) => row.action === 'DISSOCIER_CONFIGURATION_FORMATION'), 'journal dissociation créé');
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const current = await service.lireEvenement(event.evenement.evenement_id);
    await repo.updateEventIfVersion(event.evenement.evenement_id, current.evenement.version, { statut: 'REALISE' });
    await assert.rejects(() => service.dissociateEventsFromFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR), /Dissociation impossible|dissociation_realise_interdite/);
  });

  await record('07 — événement avec saisies contrôlé côté backend', async () => {
    const { repo, service, versionId, cible, motifId } = await seedContext();
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.5', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const person = await repo.upsertPersonne({ personne_id: 'r62-dissociation-person', nip: '62002', grade: 'Sap', nom: 'Dissociation', prenom: 'Controle' });
    await repo.upsertParticipation({ evenement_id: event.evenement.evenement_id, personne_id: person.personne_id, statut: 'ABSENT_EXCUSE', motif_absence: motifId, role: 'PARTICIPANT' });
    await assert.rejects(() => service.dissociateEventsFromFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR), /saisies existantes|dissociation_saisies_incompatibles/);
  });

  await record('08 — filtre Domaine ordre et agrégateur FOSPEC', async () => {
    const logic = read('assets/js/scope-ui-logic.js');
    includes(logic, "['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC', 'PR', 'AUTO']");
    includes(logic, "return 'FOSPEC,PR,AUTO'");
    const { service, repo } = await seedContext({ modeOrganisation: 'SIMPLE', sessionCount: 1 });
    await repo.insertEvenement({ date: '2026-06-01', domaine_code: 'FOSPEC', libelle: 'FOSPEC R6.2', statut: 'PLANIFIE', cible_ids: [] });
    await repo.insertEvenement({ date: '2026-06-02', domaine_code: 'PR', libelle: 'PR R6.2', statut: 'PLANIFIE', cible_ids: [] });
    await repo.insertEvenement({ date: '2026-06-03', domaine_code: 'AUTO', libelle: 'AUTO R6.2', statut: 'PLANIFIE', cible_ids: [] });
    const list = await service.listEvenements({ annee: 2026, domaineCode: 'FOSPEC,PR,AUTO', qualifications: true });
    const domains = new Set(list.evenements.map((row) => row.evenement.domaine_code));
    ok([...domains].every((code) => ['FOSPEC', 'PR', 'AUTO'].includes(code)), 'FOSPEC liste uniquement FOSPEC/PR/AUTO');
  });

  await record('09 — routing direct et Voir le rapport inchangé', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'const directSaisie =');
    includes(ui, "new Set(['PLANIFIE', 'A_TRAITER', 'SAISIE_EN_COURS'])");
    includes(ui, 'data-report-event');
    includes(ui, 'Compléter');
  });

  await record('10 — label métier Recette TEST respecte la casse', async () => {
    const { service, versionId, cible } = await seedContext({ motifLabel: 'Recette TEST' });
    const event = await service.createEvenement({ date: '2026-05-12', domaineCode: 'DPS', libelle: 'Formation groupée DPS 1.6', cibleIds: [cible.cible_id] }, ACTOR);
    await service.associateEventsToFormationConfiguration(versionId, { eventIds: [event.evenement.evenement_id] }, ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    const motif = (fiche.participationPolicy.motifs || []).find((row) => String(row.value || '').startsWith('RECETTE_TEST'));
    ok(motif, 'motif custom exposé au frontend');
    eq(motif.label, 'Recette TEST');
  });

  await record('11 — UX association exposée', () => {
    const ui = read('assets/js/scope-ui.js');
    includes(ui, 'data-association-select');
    includes(ui, 'data-association-dissociate');
    includes(ui, 'data-association-filter');
    includes(read('assets/js/scope-api.js'), 'dissociateFormationEvents');
    includes(read('netlify/functions/scope.js'), '/formation/definition-versions/:id/dissociate-events');
  });

  await record('12 — associations DAP Multi-session préservées', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const catalog = await service.formationCatalog();
    const dap = catalog.formationCatalog.definitionVersions.find((row) => row.definitionCode === 'DAP-FORMATION-GROUPEE');
    ok(dap, 'configuration DAP Multi-session existante');
    eq(Number(dap.session_count), 2);
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
