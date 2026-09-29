'use strict';

const fs = require('fs');
const path = require('path');
const planner = require('../../netlify/lib/_scope-qv-publication-plan');
const { executePublicationPlan, classifyChangeSafety } = require('../../netlify/lib/_scope-qv-publication-executor');
const { reconcilePublicationPlan } = require('../../netlify/lib/_scope-qv-publication-reconciliation');
const { C21PublicationFixtureDb } = require('./scope-c21-publication-fixture-db');
const { REFERENTIALS, GENERATED_AT, buildDataset } = require('../scope-c20-quo-vadis-integration-architecture-1');

const ROOT = path.resolve(__dirname, '../..');
const SIMPLE_CASE = 'SIMPLE-VULCAIN';
const MULTI_GROUP = 'QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1';
const FIXTURE_NOW = '2026-09-29T15:00:00.000Z';

function fixtureDb(){
  return new C21PublicationFixtureDb({ clock: () => FIXTURE_NOW });
}

function invariant(condition, message){
  if(!condition) throw new Error(`C21 proof invariant failed: ${message}`);
}

function context(store, runId, overrides = {}){
  return {
    store,
    runId,
    processId: 'C21-PROOF-HARNESS',
    environment: 'test',
    allowIsolatedExecution: true,
    actor: { id: 'moa-c21', roles: ['GESTIONNAIRE'] },
    ...overrides
  };
}

function reconciliationContext(store){
  return { store, environment: 'test', allowIsolatedReconciliation: true };
}

function buildPlan(programme, targetSnapshot = [], year = 2027, generatedAt = GENERATED_AT){
  return planner.buildPublicationPlan({ year, programme, targetSnapshot, referentials: REFERENTIALS, generatedAt });
}

function modifyCase(programme, caseId, mutate){
  return programme.map((item) => item.caseId === caseId ? mutate(item) : item);
}

function roomJuraProgramme(){
  return modifyCase(buildDataset(), SIMPLE_CASE, (item) => ({
    ...item,
    classification: { ...item.classification, roomCode: 'R-G1-JURA' }
  }));
}

function multiSessionFixture(){
  return buildDataset()
    .filter((item) => item.caseId.startsWith('MULTI-SESSION-'))
    .map((item, index) => ({
      ...item,
      year: 2099,
      status: 'VALIDATED',
      source: { ...item.source, sourceRecordIds: [`C21-TEST-FIXTURE-SESSION-${index + 1}`] },
      schedule: {
        startsAt: `2099-02-${String(index + 1).padStart(2, '0')}T18:00`,
        endsAt: `2099-02-${String(index + 1).padStart(2, '0')}T20:00`
      }
    }));
}

function keyFor(programme, caseId){
  return planner.canonicalPublicationKey(programme.find((item) => item.caseId === caseId));
}

async function captureFailure(task){
  try{
    await task();
    return { caught: false, code: null, message: null };
  }catch(error){
    return { caught: true, code: error.code || 'ERROR', message: error.message, executionResult: error.executionResult || null };
  }
}

async function buildC21ScenarioProof(){
  const programmeA = buildDataset();
  const simpleKey = keyFor(programmeA, SIMPLE_CASE);
  const planA = buildPlan(programmeA);

  const main = fixtureDb();
  const executeA = await executePublicationPlan(planA, context(main, 'C21-PROOF-A'));
  const snapshotA = main.snapshot(2027);
  const reconcileA = await reconcilePublicationPlan(planA, reconciliationContext(main));
  const planB = buildPlan(programmeA, snapshotA);
  const countsBeforeB = main.counts();
  const executeB = await executePublicationPlan(planB, context(main, 'C21-PROOF-B'));
  const countsAfterB = main.counts();
  const beforeC = main.getByPublicationKey(simpleKey);
  const planC = buildPlan(roomJuraProgramme(), snapshotA);
  const executeC = await executePublicationPlan(planC, context(main, 'C21-PROOF-C'));
  const afterC = main.getByPublicationKey(simpleKey);
  const reconcileC = await reconcilePublicationPlan(planC, reconciliationContext(main));
  const planD = buildPlan(buildDataset(), main.snapshot(2027));
  const executeD = await executePublicationPlan(planD, context(main, 'C21-PROOF-D'));
  const afterD = main.getByPublicationKey(simpleKey);
  const reconcileD = await reconcilePublicationPlan(planD, reconciliationContext(main));
  const fobaBeforeIsolation = main.snapshot(2027).filter((row) => row.desired.activity.businessCode === '070F1.005');
  const fobaG1Programme = modifyCase(buildDataset(), 'FOBA-PHASE-II-G1', (item) => ({
    ...item,
    classification: { ...item.classification, roomCode: 'R-G1-JURA' }
  }));
  const fobaIsolationPlan = buildPlan(fobaG1Programme, main.snapshot(2027));
  const fobaIsolationExecution = await executePublicationPlan(fobaIsolationPlan, context(main, 'C21-FOBA-G1'));
  const fobaAfterIsolation = main.snapshot(2027).filter((row) => row.desired.activity.businessCode === '070F1.005');
  const fobaBeforeByUnit = new Map(fobaBeforeIsolation.map((row) => [row.source.publicationUnitId, row]));
  const fobaAfterByUnit = new Map(fobaAfterIsolation.map((row) => [row.source.publicationUnitId, row]));
  const fobaOtherUnitsStable = ['OI:C1', 'OI:B1', 'OI:B2'].every((unit) =>
    fobaBeforeByUnit.get(unit).fingerprint === fobaAfterByUnit.get(unit).fingerprint
    && fobaBeforeByUnit.get(unit).eventId === fobaAfterByUnit.get(unit).eventId
  );

  const cta = snapshotA.find((row) => row.desired.event.businessException === 'SERVICE_CONTINUITY');
  const foba = snapshotA.filter((row) => row.desired.activity.businessCode === '070F1.005');
  const emsea = snapshotA.find((row) => row.desired.event.label === 'Séance État-major');
  const jsp = snapshotA.find((row) => row.desired.event.label === 'Exercice JSP 1');
  const fobaActivityIds = [...new Set(foba.map((row) => row.activityId))];
  const fobaOis = foba.map((row) => row.desired.relations.oiCodes[0]).sort();
  const provenanceForward = main.provenanceBySource(beforeC.source);
  const provenanceReverse = main.provenanceByEvent(beforeC.eventId);
  const auditMain = main.listRuns();

  invariant(planA.summary.CREATE === 10 && planA.summary.BLOCKED === 8 && planA.summary.NOT_PUBLISHED === 1, 'Plan A baseline');
  invariant(executeA.counts.created === 10 && reconcileA.status === 'MATCH', 'publication A and reconciliation');
  invariant(planB.summary.UNCHANGED === 10 && executeB.status === 'NO_OP', 'plan B no-op');
  invariant(JSON.stringify(countsBeforeB) === JSON.stringify(countsAfterB), 'plan B wrote no business data');
  invariant(planC.summary.UPDATE === 1 && planC.summary.CREATE === 0 && executeC.counts.updated === 1, 'plan C update');
  invariant(beforeC.eventId === afterC.eventId && beforeC.desired.activity.businessCode === afterC.desired.activity.businessCode, 'stable C identity and code');
  invariant(reconcileC.status === 'MATCH', 'plan C reconciliation');
  invariant(planD.summary.UPDATE === 1 && planD.summary.CREATE === 0 && executeD.counts.updated === 1, 'plan D return update');
  invariant(afterD.eventId === beforeC.eventId && reconcileD.status === 'MATCH', 'plan D identity and reconciliation');
  invariant(fobaIsolationPlan.summary.UPDATE === 1 && fobaIsolationExecution.counts.updated === 1, 'FOBA G1 isolated update');
  invariant(fobaOtherUnitsStable, 'FOBA C1/B1/B2 isolation');
  invariant(cta.desired.event.durationMinutes === 3600, 'CTA duration');
  invariant(foba.length === 4 && fobaActivityIds.length === 1, 'FOBA canonical activity');
  invariant(emsea.desired.activity.businessCode === null && emsea.desired.activity.statComCode === null, 'EMSEA without invented code');
  invariant(jsp.desired.activity.businessCode === '010JC1.001', 'JSP business code');

  const rollbackDb = fixtureDb();
  const rollbackBefore = rollbackDb.counts();
  const rollbackFailure = await captureFailure(() => executePublicationPlan(planA, context(rollbackDb, 'C21-ROLLBACK-FAIL', { failAtStep: 'AFTER_PROVENANCE' })));
  const rollbackAfter = rollbackDb.counts();
  const rollbackRetry = await executePublicationPlan(planA, context(rollbackDb, 'C21-ROLLBACK-RETRY'));
  const rollbackNoop = await executePublicationPlan(planA, context(rollbackDb, 'C21-ROLLBACK-NOOP'));
  const rollbackRuns = rollbackDb.listRuns();
  invariant(rollbackFailure.code === 'INJECTED_EXECUTION_FAILURE', 'injected rollback failure');
  invariant(JSON.stringify(rollbackBefore) === JSON.stringify(rollbackAfter), 'complete rollback');
  invariant(rollbackRetry.counts.created === 10 && rollbackNoop.status === 'NO_OP', 'safe retry sequence');

  const concurrentDb = fixtureDb();
  const concurrentResults = await Promise.all([
    executePublicationPlan(planA, context(concurrentDb, 'C21-CONCURRENT-1')),
    executePublicationPlan(planA, context(concurrentDb, 'C21-CONCURRENT-2'))
  ]);
  const concurrentCounts = concurrentDb.counts();
  const duplicateAttempt = await captureFailure(async () => concurrentDb.rawDuplicateEvent(simpleKey));
  invariant(concurrentCounts.c21_events === 10 && concurrentCounts.c21_qv_publication_links === 10, 'concurrent uniqueness');
  invariant(concurrentResults.filter((row) => row.status === 'SUCCESS').length === 1 && concurrentResults.filter((row) => row.status === 'NO_OP').length === 1, 'serialized concurrent result');
  invariant(duplicateAttempt.caught, 'database uniqueness constraint');

  const staleDb = fixtureDb();
  await executePublicationPlan(planA, context(staleDb, 'C21-STALE-SEED'));
  const stalePlan = buildPlan(roomJuraProgramme(), staleDb.snapshot(2027));
  staleDb.directMutate(simpleKey, { responsibleId: 'manual-drift' });
  const staleCountsBefore = staleDb.counts();
  const staleFailure = await captureFailure(() => executePublicationPlan(stalePlan, context(staleDb, 'C21-STALE-EXECUTE')));
  const staleCountsAfter = staleDb.counts();
  invariant(staleFailure.code === 'STALE_PLAN' && JSON.stringify(staleCountsBefore) === JSON.stringify(staleCountsAfter), 'stale plan rejection');

  const operationalDb = fixtureDb();
  await executePublicationPlan(planA, context(operationalDb, 'C21-OP-SEED'));
  operationalDb.addOperationalData(simpleKey, 'PARTICIPATION', { status: 'PRESENT' });
  const operationalPlan = buildPlan(roomJuraProgramme(), operationalDb.snapshot(2027));
  const operationalDecision = operationalPlan.decisions.find((row) => row.publicationKey === simpleKey);
  const operationalBefore = operationalDb.getByPublicationKey(simpleKey);
  const operationalExecute = await executePublicationPlan(operationalPlan, context(operationalDb, 'C21-OP-PROTECTED'));
  const operationalAfter = operationalDb.getByPublicationKey(simpleKey);
  const operationalReconciliation = await reconcilePublicationPlan(operationalPlan, reconciliationContext(operationalDb));
  const protectedEntry = operationalReconciliation.entries.find((row) => row.publicationKey === simpleKey);
  invariant(operationalDecision.action === 'BLOCKED' && operationalDecision.humanReview === true, 'operational plan protection');
  invariant(operationalBefore.fingerprint === operationalAfter.fingerprint && operationalExecute.counts.updated === 0, 'no protected overwrite');
  invariant(protectedEntry.status === 'PROTECTED_CHANGE', 'protected reconciliation state');

  const cancellationDb = fixtureDb();
  await executePublicationPlan(planA, context(cancellationDb, 'C21-CANCEL-SEED'));
  const cancelledProgramme = modifyCase(buildDataset(), 'JSP-C1', (item) => ({ ...item, status: 'ANNULE' }));
  const cancellationPlan = buildPlan(cancelledProgramme, cancellationDb.snapshot(2027));
  const cancellationDecision = cancellationPlan.decisions.find((row) => row.caseId === 'JSP-C1');
  const cancellationResult = await executePublicationPlan(cancellationPlan, context(cancellationDb, 'C21-CANCEL'));
  const cancelledEvent = cancellationDb.getByPublicationKey(keyFor(programmeA, 'JSP-C1'));
  const removedProgramme = cancelledProgramme.filter((item) => item.caseId !== 'RECURRENCE-1');
  const removedPlan = buildPlan(removedProgramme, cancellationDb.snapshot(2027));
  const removedDecision = removedPlan.decisions.find((row) => row.reason === 'SOURCE_REMOVED_CANCEL_SCOPE_EVENT');
  const removedResult = await executePublicationPlan(removedPlan, context(cancellationDb, 'C21-SOURCE-REMOVED'));
  const removedEvent = cancellationDb.getByPublicationKey(keyFor(programmeA, 'RECURRENCE-1'));
  invariant(cancellationDecision.action === 'UPDATE' && cancelledEvent.desired.event.status === 'ANNULE', 'safe cancellation');
  invariant(removedDecision && removedEvent.desired.event.status === 'ANNULE', 'removed source cancellation');

  const driftDb = fixtureDb();
  await executePublicationPlan(planA, context(driftDb, 'C21-DRIFT-SEED'));
  driftDb.directMutate(simpleKey, { roomCode: 'R-G1-JURA' });
  const driftBefore = driftDb.counts();
  const driftResult = await reconcilePublicationPlan(planA, reconciliationContext(driftDb));
  const driftAfter = driftDb.counts();
  const driftEntry = driftResult.entries.find((row) => row.publicationKey === simpleKey);
  invariant(driftEntry.status === 'DRIFT' && JSON.stringify(driftBefore) === JSON.stringify(driftAfter), 'read-only drift detection');

  const multiDb = fixtureDb();
  const multiProgramme = multiSessionFixture();
  const multiPlan = buildPlan(multiProgramme, [], 2099, '2099-01-01T00:00:00.000Z');
  const multiResult = await executePublicationPlan(multiPlan, context(multiDb, 'C21-MULTI'));
  const multiSnapshot = multiDb.snapshot(2099);
  const multiActivities = multiDb.listActivities(2099);
  const multiSessions = multiDb.listSessionEvents(MULTI_GROUP);
  invariant(multiResult.counts.created === 6 && multiActivities.length === 1 && multiSnapshot.length === 6 && multiSessions.length === 6, 'multi-session structure');

  const codeDb = fixtureDb();
  await executePublicationPlan(planA, context(codeDb, 'C21-CODE-SEED'));
  const codeBefore = codeDb.getByPublicationKey(simpleKey);
  const timeProgramme = modifyCase(buildDataset(), SIMPLE_CASE, (item) => ({ ...item, schedule: { startsAt: '2027-01-05T19:00', endsAt: '2027-01-05T23:00' } }));
  const timePlan = buildPlan(timeProgramme, codeDb.snapshot(2027));
  const timeResult = await executePublicationPlan(timePlan, context(codeDb, 'C21-CODE-TIME'));
  const codeAfter = codeDb.getByPublicationKey(simpleKey);
  invariant(timeResult.counts.updated === 1 && codeBefore.desired.activity.businessCode === codeAfter.desired.activity.businessCode, 'stable code after time update');

  const unauthorizedDb = fixtureDb();
  const forbidden = await captureFailure(() => executePublicationPlan(planA, context(unauthorizedDb, 'C21-RBAC-DENIED', { actor: { id: 'reader', roles: ['UTILISATEUR'] } })));
  const productionGuard = await captureFailure(() => executePublicationPlan(planA, context(unauthorizedDb, 'C21-PROD-DENIED', { environment: 'production' })));
  const tamperedPlan = JSON.parse(JSON.stringify(planA));
  tamperedPlan.decisions.find((row) => row.action === 'CREATE').target.event.label = 'tampered';
  const tamperGuard = await captureFailure(() => executePublicationPlan(tamperedPlan, context(unauthorizedDb, 'C21-TAMPER-DENIED')));
  invariant(forbidden.code === 'PUBLICATION_FORBIDDEN', 'RBAC denial');
  invariant(productionGuard.code === 'PRODUCTION_EXECUTION_FORBIDDEN', 'production guard');
  invariant(tamperGuard.code === 'PLAN_FINGERPRINT_MISMATCH', 'plan validation');

  const safetyFields = ['date', 'start', 'end', 'duration', 'location', 'room', 'responsible', 'target', 'public', 'oi'];
  const safetyPaths = ['event.startDate', 'event.startsAt', 'event.endsAt', 'event.durationMinutes', 'event.locationCode', 'event.roomCode', 'event.responsibleId', 'relations.targetCodes', 'relations.publicCodes', 'relations.oiCodes'];
  const safetyMatrix = safetyFields.map((field, index) => ({
    field,
    beforeOperationalUse: classifyChangeSafety({ operationalState: {} }, [safetyPaths[index]]),
    afterOperationalUse: classifyChangeSafety({ operationalState: { participations: 1 } }, [safetyPaths[index]])
  }));

  const c20Sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c20.sql'), 'utf8');
  const c21Sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c21.sql'), 'utf8');
  const fixtureSql = fs.readFileSync(path.join(ROOT, 'database/fixtures/scope_qv_publication_c21_fixture.sql'), 'utf8');

  const proof = {
    plans: {
      A: { planId: planA.planId, fingerprint: planA.planFingerprint, summary: planA.summary },
      B: { planId: planB.planId, fingerprint: planB.planFingerprint, summary: planB.summary },
      C: { planId: planC.planId, fingerprint: planC.planFingerprint, summary: planC.summary },
      D: { planId: planD.planId, fingerprint: planD.planFingerprint, summary: planD.summary }
    },
    publication: { executeA, reconcileA: { status: reconcileA.status, summary: reconcileA.summary }, executeB, executeC, reconcileC: { status: reconcileC.status, summary: reconcileC.summary }, executeD, reconcileD: { status: reconcileD.status, summary: reconcileD.summary } },
    identity: { publicationKey: simpleKey, eventIdBefore: beforeC.eventId, eventIdAfter: afterC.eventId, eventIdAfterReturn: afterD.eventId, businessCodeBefore: beforeC.desired.activity.businessCode, businessCodeAfter: afterC.desired.activity.businessCode, businessCodeAfterReturn: afterD.desired.activity.businessCode },
    domainCases: {
      cta: { eventCount: 1, startsAt: cta.desired.event.startsAt, endsAt: cta.desired.event.endsAt, durationMinutes: cta.desired.event.durationMinutes },
      foba: {
        activityIds: fobaActivityIds,
        eventIds: foba.map((row) => row.eventId),
        oiCodes: fobaOis,
        businessCode: '070F1.005',
        g1UpdateCount: fobaIsolationExecution.counts.updated,
        otherUnitsStable: fobaOtherUnitsStable,
        activityIdAfterG1Update: fobaAfterByUnit.get('OI:G1').activityId
      },
      jsp: { businessCode: jsp.desired.activity.businessCode, publicCodes: jsp.desired.relations.publicCodes },
      emsea: { statComCode: emsea.desired.activity.statComCode, businessCode: emsea.desired.activity.businessCode, domain: emsea.desired.event.primaryDomain },
      multiSession: { planSummary: multiPlan.summary, execution: multiResult, activityCount: multiActivities.length, eventCount: multiSnapshot.length, sessionCount: multiSessions.length, groupId: MULTI_GROUP }
    },
    provenance: { forward: provenanceForward, reverse: provenanceReverse, bidirectional: provenanceForward && provenanceReverse && provenanceForward.event_id === provenanceReverse.event_id },
    rollback: { failure: rollbackFailure, before: rollbackBefore, after: rollbackAfter, retry: rollbackRetry, finalRetry: rollbackNoop, runs: rollbackRuns },
    concurrency: { results: concurrentResults, counts: concurrentCounts, duplicateConstraintError: duplicateAttempt.message },
    stalePlan: { failure: staleFailure, before: staleCountsBefore, after: staleCountsAfter },
    operationalProtection: { decision: operationalDecision, execution: operationalExecute, reconciliation: operationalReconciliation, unchangedFingerprint: operationalBefore.fingerprint === operationalAfter.fingerprint },
    safetyMatrix,
    cancellation: { decision: cancellationDecision, execution: cancellationResult, finalStatus: cancelledEvent.desired.event.status, provenanceRetained: Boolean(cancellationDb.provenanceByEvent(cancelledEvent.eventId)) },
    sourceRemoved: { decision: removedDecision, execution: removedResult, finalStatus: removedEvent.desired.event.status },
    drift: { reconciliation: driftResult, detected: driftEntry, before: driftBefore, after: driftAfter },
    codeStability: { before: codeBefore.desired.activity.businessCode, after: codeAfter.desired.activity.businessCode, eventIdBefore: codeBefore.eventId, eventIdAfter: codeAfter.eventId, execution: timeResult },
    security: {
      authorizedRole: 'GESTIONNAIRE', deniedRole: 'UTILISATEUR', forbidden,
      productionGuard, tamperGuard,
      rlsStatic: /enable row level security/i.test(c21Sql) && /revoke all/i.test(c21Sql),
      rollbackOnlySql: /rollback;\s*$/i.test(c20Sql) && /rollback;\s*$/i.test(c21Sql),
      fixtureForeignKeys: /pragma foreign_keys = on/i.test(fixtureSql)
    },
    audit: { main: auditMain, rollback: rollbackRuns, secretFieldsPresent: auditMain.some((row) => Object.keys(row).some((key) => /token|secret|password/i.test(key))) },
    sql: {
      fixture: 'database/fixtures/scope_qv_publication_c21_fixture.sql',
      c20Contract: 'database/migrations/20260929_scope_qv_publication_c20.sql',
      c21AdditiveContract: 'database/migrations/20260929_scope_qv_publication_c21.sql',
      appliedToProduction: false
    }
  };

  for(const db of [main, rollbackDb, concurrentDb, staleDb, operationalDb, cancellationDb, driftDb, multiDb, codeDb, unauthorizedDb]) db.close();
  return proof;
}

module.exports = {
  SIMPLE_CASE,
  MULTI_GROUP,
  FIXTURE_NOW,
  fixtureDb,
  context,
  reconciliationContext,
  buildPlan,
  modifyCase,
  roomJuraProgramme,
  multiSessionFixture,
  keyFor,
  captureFailure,
  buildC21ScenarioProof
};
