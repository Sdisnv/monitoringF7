#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIGURABLE-TRAINING-RULES-MOA-REPAIR-2 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { validateParticipationPatch } = require('../netlify/lib/_scope-rules');
const { resolveParticipationPolicy } = require('../netlify/lib/_scope-participation-policy');
const { PROVENANCE } = require('../netlify/lib/_scope-training-context-resolver');

const ACTOR = { sub: 'scope-configurable-training-rules-moa-repair-2', roles: ['sdis-admin'], displayName: 'Testeur MOA' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

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
  const staff = await addPerson(repo, 'staff-jsp-7', '77701', cible.cible_id);
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
      evenement_id: `pr-1-${index}`,
      cycle_id: 'cycle-pr-2026',
      date: `2026-01-${String(10 + index).padStart(2, '0')}`,
      domaine_code: 'PR',
      libelle: `Exercice PR 1.${index} | Base`,
      code_cours: `pr-1-${index}`,
      statut: 'REALISE',
      origine: 'IMPORT_CSV',
      mode_suivi: 'NOMINATIF',
      cible_ids: [pr.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [pr.cible_id]);
  }
  for(const index of [1, 2, 3]){
    const event = await repo.insertEvenement({
      evenement_id: `abc-${index}`,
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
  return { repo, service };
}

(async () => {
  await record('01 — encadrement mode Evenement utilise 18:00-20:00 et ignore ancien 12:30', async () => {
    const { service, eventId, version, staff } = await buildJspEvent();
    const added = await service.ajouterEncadrement(eventId, {
      baseVersion: version,
      personneId: staff.personne_id,
      role: 'FORMATEUR',
      timeMode: 'CUSTOM',
      heureDebutIndividuelle: '12:30',
      heureFinIndividuelle: '12:30'
    }, ACTOR);
    let fiche = await service.lireEvenement(eventId);
    let row = fiche.encadrement.find((item) => item.personne_id === staff.personne_id);
    eq(row.horaireMode, 'CUSTOM');
    eq(row.heureDebutEffective, '12:30');
    eq(row.heureFinEffective, '12:30');

    await service.modifierEncadrement(eventId, {
      baseVersion: added.version,
      personneId: staff.personne_id,
      role: 'FORMATEUR',
      timeMode: 'EVENT',
      heureDebutIndividuelle: null,
      heureFinIndividuelle: null
    }, ACTOR);
    fiche = await service.lireEvenement(eventId);
    row = fiche.encadrement.find((item) => item.personne_id === staff.personne_id);
    eq(row.horaireMode, 'EVENT');
    eq(row.heure_debut_individuelle, null);
    eq(row.heure_fin_individuelle, null);
    eq(row.heureDebutEffective, '18:00');
    eq(row.heureFinEffective, '20:00');
  });

  await record('02 — encadrement mode Individuel reste modifiable puis retour Evenement', async () => {
    const { service, eventId, version, staff } = await buildJspEvent();
    const added = await service.ajouterEncadrement(eventId, {
      baseVersion: version,
      personneId: staff.personne_id,
      role: 'MONITEUR',
      timeMode: 'EVENT'
    }, ACTOR);
    const edited = await service.modifierEncadrement(eventId, {
      baseVersion: added.version,
      personneId: staff.personne_id,
      role: 'MONITEUR',
      timeMode: 'CUSTOM',
      heureDebutIndividuelle: '18:15',
      heureFinIndividuelle: '19:45'
    }, ACTOR);
    let row = (await service.lireEvenement(eventId)).encadrement.find((item) => item.personne_id === staff.personne_id);
    eq(row.horaireMode, 'CUSTOM');
    eq(row.heureDebutEffective, '18:15');
    eq(row.heureFinEffective, '19:45');
    await service.modifierEncadrement(eventId, {
      baseVersion: edited.version,
      personneId: staff.personne_id,
      role: 'MONITEUR',
      timeMode: 'EVENT'
    }, ACTOR);
    row = (await service.lireEvenement(eventId)).encadrement.find((item) => item.personne_id === staff.personne_id);
    eq(row.horaireMode, 'EVENT');
    eq(row.heureDebutEffective, '18:00');
    eq(row.heureFinEffective, '20:00');
  });

  await record('03 — sauvegarde configuration JSP conserve definition_id/code existants', async () => {
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
    const existingDefinitionId = created.definition.definition_id;
    const existingCode = created.definition.code;
    const originalUpsertVersion = repo.upsertEventDefinitionVersion.bind(repo);
    repo.upsertEventDefinitionVersion = async (row) => {
      eq(row.definition_version_id || row.definitionVersionId, created.version.definition_version_id);
      eq(row.definition_id || row.definitionId, existingDefinitionId);
      return originalUpsertVersion(row);
    };
    const saved = await service.createEventDefinition({
      definitionVersionId: created.version.definition_version_id,
      domain: 'JSP',
      label: 'Exercice JSP',
      description: '',
      modeOrganisation: 'SIMPLE',
      sessionCount: 1,
      policyVersionId: created.version.policy_version_id,
      policyConfig: {
        activeStatuses: ['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE'],
        excuseMotifs: ['PRIVE', 'PROFESSIONNEL', 'ARMEE', 'ACCIDENT_MALADIE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'OUBLI', 'NON_JUSTIFIE'],
        dispenseMotifs: []
      },
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31'
    }, ACTOR);
    eq(saved.definition.definition_id, existingDefinitionId);
    eq(saved.definition.code, existingCode);
    eq(saved.version.definition_version_id, created.version.definition_version_id);
  });

  await record('04 — JSP OUBLI unique et ordonne apres Activite extra-scolaire', () => {
    const jsp = resolveParticipationPolicy('JSP');
    eq(jsp.excuseMotifs.filter((id) => id === 'OUBLI').length, 1);
    ok(jsp.excuseMotifs.indexOf('OUBLI') > jsp.excuseMotifs.indexOf('ACTIVITE_EXTRA_SCOLAIRE'));
  });

  await record('05 — PR 1.x consolide et PR-ABC reste trois sessions', async () => {
    const { service } = await buildPrRepo();
    const pr1 = await service.lireEvenement('pr-1-6');
    eq(pr1.trainingContext.provenance, PROVENANCE.PR_HISTORICAL_FALLBACK);
    eq(pr1.trainingContext.obligationKey, 'cycle-pr-2026:PR:1');
    eq(pr1.trainingContext.sessionCount, 6);
    eq(pr1.trainingContext.sessionIndex, 6);
    const abc = await service.lireEvenement('abc-3');
    eq(abc.trainingContext.provenance, PROVENANCE.PERSISTED_HISTORICAL_KEY);
    eq(abc.trainingContext.sessionCount, 3);
    eq(abc.trainingContext.sessionIndex, 3);
  });

  await record('06 — DAP multi-session et PERMUTATION restent non generalises', async () => {
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

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-CONFIGURABLE-TRAINING-RULES-MOA-REPAIR-2 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-CONFIGURABLE-TRAINING-RULES-MOA-REPAIR-2 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
