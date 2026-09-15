#!/usr/bin/env node
'use strict';

/** SCOPE — CONFIGURABLE-TRAINING-RULES-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { validateParticipationPatch } = require('../netlify/lib/_scope-rules');
const { resolveTrainingContext, PROVENANCE } = require('../netlify/lib/_scope-training-context-resolver');
const { describeEventSeries, seriesPersistenceFields } = require('../netlify/lib/_scope-event-series');
const { resolveParticipationPolicy } = require('../netlify/lib/_scope-participation-policy');

const PERIOD = { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' };
const ACTOR = { sub: 'scope-configurable-training-rules-1', roles: ['sdis-admin'], displayName: 'Testeur SCOPE' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

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

async function buildPrRepo(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const pr = await repo.findCible('PR', 'GEN') || (await repo.listCibles()).find((row) => String(row.domaine_code) === 'PR');
  const participant = await addPerson(repo, 'p-pr', '51858', pr.cible_id);
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
    await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: participant.personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({
      evenement_id: event.evenement_id,
      personne_id: participant.personne_id,
      statut: index === 2 || index === 4 ? 'PRESENT' : 'ABSENT_NON_EXCUSE',
      role: 'PARTICIPANT',
      source: 'SAISIE'
    });
  }
  for(const [id, label, date] of [
    ['pr-2-1', 'Exercice PR 2.1 | Base', '2026-02-11'],
    ['pr-3-1', 'Exercice PR 3.1 | Base', '2026-03-11']
  ]){
    const event = await repo.insertEvenement({
      evenement_id: id,
      cycle_id: 'cycle-pr-2026',
      date,
      domaine_code: 'PR',
      libelle: label,
      code_cours: id,
      statut: 'REALISE',
      origine: 'IMPORT_CSV',
      mode_suivi: 'NOMINATIF',
      cible_ids: [pr.cible_id]
    });
    await repo.setEventCibles(event.evenement_id, [pr.cible_id]);
    await repo.upsertAttendu({ evenement_id: event.evenement_id, personne_id: participant.personne_id, inclus: true, origine: 'REGLE' });
  }
  for(const index of [1, 2, 3]){
    const event = await repo.insertEvenement({
      evenement_id: `abc-${index}`,
      cycle_id: 'cycle-pr-2026',
      date: `2026-04-0${index}`,
      domaine_code: 'PR',
      libelle: `Exercice PR-ABC | Refresh ${index}`,
      code_cours: `abc-${index}`,
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
  return { repo, service, participant };
}

(async () => {
  await record('01 — resolver : individuel, configuration explicite, exercice persisté, snapshot prioritaire', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const single = await repo.insertEvenement({
      evenement_id: 'dps-individual',
      date: '2026-05-01',
      domaine_code: 'DPS',
      libelle: 'Exercice DPS simple',
      statut: 'PLANIFIE',
      origine: 'MANUEL',
      mode_suivi: 'NOMINATIF',
      cible_ids: [dps.cible_id]
    });
    const individual = await service.resolveEventTrainingContext(single);
    eq(individual.provenance, PROVENANCE.INDIVIDUAL);
    eq(individual.modeOrganisation, 'SIMPLE');
    eq(individual.sessionCount, 1);

    const createdDefinition = await service.createEventDefinition({
      domain: 'DPS',
      label: 'Formation DPS contrôlée',
      versionCode: '2026',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 2
    }, ACTOR);
    const configured = await service.createEvenement({
      date: '2026-06-01',
      domaineCode: 'DPS',
      libelle: 'Formation DPS contrôlée 1.1',
      cibleIds: [dps.cible_id],
      definitionVersionId: createdDefinition.version.definition_version_id,
      sessionIndex: 1
    }, ACTOR);
    const explicit = await service.resolveEventTrainingContext(configured.evenement);
    eq(explicit.provenance, PROVENANCE.EXPLICIT_CONFIGURATION);
    eq(explicit.formationLabel, 'Formation DPS contrôlée');
    eq(explicit.sessionCount, 2);
    eq(explicit.sessionIndex, 1);
    ok(explicit.policy.availableStatuses.includes('PRESENT'));

    const bareExercise = await repo.upsertExercise({
      exercice_key: 'bare-dps-2026',
      domaine_code: 'DPS',
      code: 'BARE-DPS',
      libelle: 'Exercice DPS persisté',
      annee: 2026,
      mode_session: 'MULTI',
      nombre_sessions_attendu: 2,
      consolidation_active: true,
      source: 'MANUEL'
    });
    const exerciseOnly = await repo.insertEvenement({
      evenement_id: 'exercise-only',
      date: '2026-06-02',
      domaine_code: 'DPS',
      libelle: 'Formation DPS contrôlée 1.2',
      statut: 'PLANIFIE',
      origine: 'MANUEL',
      mode_suivi: 'NOMINATIF',
      cible_ids: [dps.cible_id],
      exercice_id: bareExercise.exercice_id,
      session_index: 2
    });
    const exerciseCtx = await service.resolveEventTrainingContext(exerciseOnly);
    eq(exerciseCtx.provenance, PROVENANCE.EXERCISE);
    eq(exerciseCtx.sessionIndex, 2);

    const snapshot = resolveParticipationPolicy('JSP');
    const snapEvent = await repo.insertEvenement({
      evenement_id: 'snapshot-event',
      date: '2026-07-01',
      domaine_code: 'JSP',
      libelle: 'JSP historique',
      statut: 'REALISE',
      origine: 'MANUEL',
      mode_suivi: 'NOMINATIF',
      cible_ids: [],
      participation_policy_snapshot: Object.assign({}, snapshot, { activeStatuses: ['NON_RENSEIGNE', 'PRESENT'] })
    });
    await service.saveParticipationPolicy('JSP', { activeStatuses: ['PRESENT', 'ABSENT_NON_EXCUSE'] }, ACTOR);
    const snapshotCtx = await service.resolveEventTrainingContext(snapEvent);
    eq(snapshotCtx.provenance, PROVENANCE.SNAPSHOT);
    deepEq(snapshotCtx.availableStatuses, ['NON_RENSEIGNE', 'PRESENT']);
  });

  await record('02 — PR 1.x / PR 2 / PR 3 / PR-ABC conservent les obligations validées', async () => {
    const { service } = await buildPrRepo();
    const expected = [1, 2, 3, 4, 5, 6];
    for(const index of expected){
      const fiche = await service.lireEvenement(`pr-1-${index}`);
      eq(fiche.trainingContext.provenance, PROVENANCE.PR_HISTORICAL_FALLBACK);
      eq(fiche.trainingContext.obligationKey, 'cycle-pr-2026:PR:1');
      eq(fiche.trainingContext.sessionIndex, index);
      eq(fiche.trainingContext.sessionCount, 6);
      eq(fiche.formationConfiguration.label, 'Exercice PR 1 — 2026');
    }
    const pr2 = await service.resolveEventTrainingContext((await service.lireEvenement('pr-2-1')).evenement);
    const pr3 = await service.resolveEventTrainingContext((await service.lireEvenement('pr-3-1')).evenement);
    eq(pr2.obligationKey, 'cycle-pr-2026:PR:2');
    eq(pr3.obligationKey, 'cycle-pr-2026:PR:3');
    const abc = await service.lireEvenement('abc-1');
    eq(abc.trainingContext.provenance, PROVENANCE.PERSISTED_HISTORICAL_KEY);
    eq(abc.trainingContext.sessionCount, 3);
    eq(abc.trainingContext.sessionIndex, 1);
  });

  await record('03 — Personnel / Analytics / Rapport partagent la clé d’obligation sans masquer l’historique', async () => {
    const { repo, participant } = await buildPrRepo();
    const service = createScopeService(repo);
    const person = await createScopePersonService(repo).fiche(participant.personne_id, PERIOD);
    const analytics = await createScopeAnalyticsService(repo).summary({ from: '2026-01-01', to: '2026-12-31', personneId: participant.personne_id });
    const report = await collectReport(repo, { kind: 'EVENT', evenementId: 'pr-1-2', nominatif: true }, { roles: ['UTILISATEUR'], sub: 'test' });
    const historyPr1 = person.evenements.filter((row) => /Exercice PR 1\./.test(row.libelle || ''));
    eq(historyPr1.length, 6);
    eq(person.kpi.eventCount, 1);
    eq(analytics.officiel.eventCount, 1);
    eq(report.officiel.numerator, 1);
    eq((await service.lireEvenement('pr-1-2')).trainingContext.consolidationKey, 'cycle-pr-2026:PR:1');
  });

  await record('04 — DAP permutation/rattrapage reste spécialisé et refusé hors DAP', () => {
    assert.throws(() => validateParticipationPatch({ statut: 'PERMUTATION' }, {
      domaineCode: 'JSP',
      participationPolicySnapshot: resolveParticipationPolicy('JSP')
    }), /domaine DAP/i);
    const dap = validateParticipationPatch({ statut: 'PERMUTATION' }, {
      domaineCode: 'DAP',
      participationPolicySnapshot: resolveParticipationPolicy('DAP')
    });
    eq(dap.statut, 'PERMUTATION');
    eq(dap.motif_absence, null);
  });

  await record('05 — AUTO CAR/TRUCK et X.Y restent détectés sans persistance automatique universelle', async () => {
    const car = await resolveTrainingContext(createMemoryRepo(), {
      evenement_id: 'auto-car',
      date: '2026-08-01',
      domaine_code: 'AUTO',
      libelle: 'AUTO CAR 2.1',
      statut: 'PLANIFIE'
    });
    const truck = describeEventSeries({ domaine_code: 'AUTO', libelle: 'AUTO TRUCK 3.2', date: '2026-08-02' });
    eq(car.provenance, PROVENANCE.DETECTED_SERIES);
    eq(car.obligationKey, 'NO_CYCLE:AUTO:CAR:2');
    eq(truck.seriesKey, 'NO_CYCLE:AUTO:TRUCK:3');
    const fields = seriesPersistenceFields({ domaine_code: 'AUTO', libelle: 'AUTO CAR 2.1' });
    eq(fields.pr_exercise_group_key, null);
    eq(fields.pr_session_key, null);
  });

  await record('06 — JSP OUBLI existe une seule fois et reste ordonné après Activité extra-scolaire', async () => {
    const jsp = resolveParticipationPolicy('JSP');
    const ids = jsp.excuseMotifs;
    eq(ids.filter((id) => id === 'OUBLI').length, 1);
    ok(ids.indexOf('OUBLI') > ids.indexOf('ACTIVITE_EXTRA_SCOLAIRE'));
    const ctx = await resolveTrainingContext(createMemoryRepo(), { domaine_code: 'JSP', libelle: 'JSP 4', statut: 'PLANIFIE' });
    const excuseIds = ctx.availableExcuseMotifs.map((row) => row.id);
    ok(excuseIds.includes('OUBLI'));
    ok(excuseIds.indexOf('OUBLI') > excuseIds.indexOf('ACTIVITE_EXTRA_SCOLAIRE'));
  });

  await record('07 — preview association diagnostique sans écriture : sessions manquantes, doublons, série détectée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const def = await service.createEventDefinition({
      domain: 'DPS',
      label: 'Formation DPS preview',
      versionCode: '2026',
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 3
    }, ACTOR);
    for(const [id, libelle] of [
      ['dps-prev-1', 'Formation DPS preview 1.1'],
      ['dps-prev-dup', 'Formation DPS preview bis 1.1'],
      ['dps-prev-xy', 'Exercice DPS 9.2']
    ]){
      const event = await repo.insertEvenement({
        evenement_id: id,
        date: '2026-09-01',
        domaine_code: 'DPS',
        libelle,
        statut: 'PLANIFIE',
        origine: 'MANUEL',
        mode_suivi: 'NOMINATIF',
        cible_ids: [dps.cible_id]
      });
      await repo.setEventCibles(event.evenement_id, [dps.cible_id]);
    }
    const before = (await repo.listEvenements({ domaine: 'DPS' })).filter((row) => row.definition_version_id).length;
    const preview = await service.previewFormationEventAssociation(def.version.definition_version_id);
    const diagnostics = preview.associationPreview.diagnostics;
    deepEq(diagnostics.missingSessions, [3]);
    ok(diagnostics.duplicateSessions.some((row) => row.sessionIndex === 1));
    ok(diagnostics.detectedSeriesNotConfigured.includes('dps-prev-xy'));
    const after = (await repo.listEvenements({ domaine: 'DPS' })).filter((row) => row.definition_version_id).length;
    eq(after, before);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`\nSCOPE-CONFIGURABLE-TRAINING-RULES-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-CONFIGURABLE-TRAINING-RULES-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
