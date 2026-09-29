'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const { executePublicationPlan, validatePlan } = require('../netlify/lib/_scope-qv-publication-executor');
const { reconcilePublicationPlan } = require('../netlify/lib/_scope-qv-publication-reconciliation');
const { C21PublicationFixtureDb } = require('./lib/scope-c21-publication-fixture-db');
const { buildDataset } = require('./scope-c20-quo-vadis-integration-architecture-1');
const scenarios = require('./lib/scope-c21-publication-scenarios');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

async function test(name, fn){
  try{
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }catch(error){
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function main(){
  const proof = await scenarios.buildC21ScenarioProof();

  await test('C20 Plan A invariants are preserved', () => assert.deepStrictEqual(proof.plans.A.summary, { CREATE: 10, UPDATE: 0, UNCHANGED: 0, BLOCKED: 8, NOT_PUBLISHED: 1 }));
  await test('Execute A creates ten materializations', () => assert.strictEqual(proof.publication.executeA.counts.created, 10));
  await test('Execute A leaves blocked and not-published decisions unwritten', () => {
    assert.strictEqual(proof.publication.executeA.counts.blocked, 8);
    assert.strictEqual(proof.publication.executeA.counts.notPublished, 1);
    assert.strictEqual(proof.publication.executeA.eventIds.length, 10);
  });
  await test('Reconcile A is a strict match', () => assert.strictEqual(proof.publication.reconcileA.status, 'MATCH'));
  await test('Plan B preserves ten unchanged decisions', () => assert.deepStrictEqual(proof.plans.B.summary, { CREATE: 0, UPDATE: 0, UNCHANGED: 10, BLOCKED: 8, NOT_PUBLISHED: 1 }));
  await test('Execute B is a business no-op', () => {
    assert.strictEqual(proof.publication.executeB.status, 'NO_OP');
    assert.strictEqual(proof.publication.executeB.counts.created, 0);
    assert.strictEqual(proof.publication.executeB.counts.updated, 0);
  });
  await test('Plan C contains one update and no create', () => {
    assert.strictEqual(proof.plans.C.summary.UPDATE, 1);
    assert.strictEqual(proof.plans.C.summary.CREATE, 0);
  });
  await test('Execute C updates exactly one materialization', () => assert.strictEqual(proof.publication.executeC.counts.updated, 1));
  await test('Update preserves event identity', () => assert.strictEqual(proof.identity.eventIdBefore, proof.identity.eventIdAfter));
  await test('Update and return preserve canonical business code and identity', () => {
    assert.strictEqual(proof.identity.businessCodeBefore, proof.identity.businessCodeAfter);
    assert.strictEqual(proof.identity.businessCodeBefore, proof.identity.businessCodeAfterReturn);
    assert.strictEqual(proof.identity.eventIdBefore, proof.identity.eventIdAfterReturn);
    assert.strictEqual(proof.plans.D.summary.UPDATE, 1);
    assert.strictEqual(proof.plans.D.summary.CREATE, 0);
  });
  await test('Reconcile C is a strict match', () => assert.strictEqual(proof.publication.reconcileC.status, 'MATCH'));

  await test('mid-transaction failure is injected', () => assert.strictEqual(proof.rollback.failure.code, 'INJECTED_EXECUTION_FAILURE'));
  await test('rollback restores every business table count', () => assert.deepStrictEqual(proof.rollback.after, proof.rollback.before));
  await test('rollback leaves no event or provenance orphan', () => {
    assert.strictEqual(proof.rollback.after.c21_events, 0);
    assert.strictEqual(proof.rollback.after.c21_qv_publication_links, 0);
  });
  await test('retry after rollback succeeds once', () => assert.strictEqual(proof.rollback.retry.counts.created, 10));
  await test('second retry is a no-op', () => assert.strictEqual(proof.rollback.finalRetry.status, 'NO_OP'));
  await test('failed publication audit is marked rolled back', () => {
    const failed = proof.rollback.runs.find((row) => row.run_id === 'C21-ROLLBACK-FAIL');
    assert.strictEqual(failed.status, 'FAILURE');
    assert.strictEqual(failed.rolled_back, 1);
    assert.strictEqual(failed.create_count, 0);
  });

  await test('concurrent executions finish as success plus no-op', () => assert.deepStrictEqual(proof.concurrency.results.map((row) => row.status).sort(), ['NO_OP', 'SUCCESS']));
  await test('concurrent final state has one event per key', () => {
    assert.strictEqual(proof.concurrency.counts.c21_events, 10);
    assert.strictEqual(proof.concurrency.counts.c21_qv_publication_links, 10);
  });
  await test('database unique constraint rejects a duplicate key', () => assert.match(proof.concurrency.duplicateConstraintError, /UNIQUE constraint failed/i));
  await test('stale plan is rejected', () => assert.strictEqual(proof.stalePlan.failure.code, 'STALE_PLAN'));
  await test('stale rejection performs no business write', () => assert.deepStrictEqual(proof.stalePlan.after, proof.stalePlan.before));
  await test('tampered plan fingerprint is rejected', () => assert.strictEqual(proof.security.tamperGuard.code, 'PLAN_FINGERPRINT_MISMATCH'));

  await test('provenance is queryable source to event', () => assert.ok(proof.provenance.forward.event_id));
  await test('provenance is queryable event to source', () => assert.strictEqual(proof.provenance.bidirectional, true));
  await test('CTA is one 60-hour event', () => {
    assert.strictEqual(proof.domainCases.cta.eventCount, 1);
    assert.strictEqual(proof.domainCases.cta.durationMinutes, 3600);
    assert.strictEqual(proof.domainCases.cta.startsAt, '2027-01-01T18:00');
    assert.strictEqual(proof.domainCases.cta.endsAt, '2027-01-04T06:00');
  });
  await test('FOBA has one canonical activity and four events', () => {
    assert.strictEqual(proof.domainCases.foba.activityIds.length, 1);
    assert.strictEqual(proof.domainCases.foba.eventIds.length, 4);
    assert.strictEqual(proof.domainCases.foba.g1UpdateCount, 1);
    assert.strictEqual(proof.domainCases.foba.otherUnitsStable, true);
    assert.strictEqual(proof.domainCases.foba.activityIdAfterG1Update, proof.domainCases.foba.activityIds[0]);
  });
  await test('FOBA preserves all four OI relations', () => assert.deepStrictEqual(proof.domainCases.foba.oiCodes, ['B1', 'B2', 'C1', 'G1']));
  await test('FOBA keeps canonical 070F1.005', () => assert.strictEqual(proof.domainCases.foba.businessCode, '070F1.005'));
  await test('JSP keeps its code and public relation', () => {
    assert.strictEqual(proof.domainCases.jsp.businessCode, '010JC1.001');
    assert.deepStrictEqual(proof.domainCases.jsp.publicCodes, ['JSP:1']);
  });
  await test('EMSEA publishes without invented Stat.Com', () => {
    assert.strictEqual(proof.domainCases.emsea.statComCode, null);
    assert.strictEqual(proof.domainCases.emsea.businessCode, null);
    assert.strictEqual(proof.domainCases.emsea.domain, 'INSTITUTIONNEL');
  });
  await test('representative multi-session keeps one activity and six sessions', () => {
    assert.strictEqual(proof.domainCases.multiSession.activityCount, 1);
    assert.strictEqual(proof.domainCases.multiSession.eventCount, 6);
    assert.strictEqual(proof.domainCases.multiSession.sessionCount, 6);
  });

  await test('operational data changes the plan to BLOCKED', () => {
    assert.strictEqual(proof.operationalProtection.decision.action, 'BLOCKED');
    assert.strictEqual(proof.operationalProtection.decision.humanReview, true);
    assert.strictEqual(proof.operationalProtection.reconciliation.summary.PROTECTED_CHANGE, 1);
  });
  await test('protected event is not overwritten', () => {
    assert.strictEqual(proof.operationalProtection.execution.counts.updated, 0);
    assert.strictEqual(proof.operationalProtection.unchangedFingerprint, true);
  });
  await test('all listed fields auto-update before operational use', () => assert.ok(proof.safetyMatrix.every((row) => row.beforeOperationalUse === 'AUTO_UPDATE_ALLOWED')));
  await test('all listed fields require review after operational use', () => assert.ok(proof.safetyMatrix.every((row) => row.afterOperationalUse === 'HUMAN_REVIEW_REQUIRED')));
  await test('time update preserves code and event identity', () => {
    assert.strictEqual(proof.codeStability.before, proof.codeStability.after);
    assert.strictEqual(proof.codeStability.eventIdBefore, proof.codeStability.eventIdAfter);
    assert.strictEqual(proof.codeStability.execution.counts.updated, 1);
  });

  await test('source cancellation updates to ANNULE', () => {
    assert.strictEqual(proof.cancellation.decision.action, 'UPDATE');
    assert.strictEqual(proof.cancellation.finalStatus, 'ANNULE');
  });
  await test('cancellation retains provenance', () => assert.strictEqual(proof.cancellation.provenanceRetained, true));
  await test('removed source is explicit cancellation update', () => assert.strictEqual(proof.sourceRemoved.decision.reason, 'SOURCE_REMOVED_CANCEL_SCOPE_EVENT'));
  await test('removed source is not physically deleted', () => assert.strictEqual(proof.sourceRemoved.finalStatus, 'ANNULE'));
  await test('manual room change is detected as drift', () => assert.strictEqual(proof.drift.detected.status, 'DRIFT'));
  await test('reconciliation does not repair drift', () => assert.deepStrictEqual(proof.drift.after, proof.drift.before));

  await test('reconciliation reports MISSING before execution', async () => {
    const db = new C21PublicationFixtureDb();
    try{
      const plan = scenarios.buildPlan(buildDataset());
      const result = await reconcilePublicationPlan(plan, scenarios.reconciliationContext(db));
      assert.strictEqual(result.summary.MISSING, 10);
    }finally{ db.close(); }
  });
  await test('reconciliation reports missing OI relation as DRIFT', async () => {
    const db = new C21PublicationFixtureDb();
    try{
      const programme = buildDataset();
      const plan = scenarios.buildPlan(programme);
      await executePublicationPlan(plan, scenarios.context(db, 'C21-RELATION-SEED'));
      const foba = plan.decisions.find((row) => row.caseId === 'FOBA-PHASE-II-G1');
      db.deleteRelation(foba.publicationKey, 'oi', 'G1');
      const result = await reconcilePublicationPlan(plan, scenarios.reconciliationContext(db));
      assert.strictEqual(result.entries.find((row) => row.publicationKey === foba.publicationKey).status, 'DRIFT');
    }finally{ db.close(); }
  });
  await test('reconciliation marks drift with operational data as protected', async () => {
    const db = new C21PublicationFixtureDb();
    try{
      const programme = buildDataset();
      const plan = scenarios.buildPlan(programme);
      await executePublicationPlan(plan, scenarios.context(db, 'C21-PROTECTED-DRIFT-SEED'));
      const key = scenarios.keyFor(programme, scenarios.SIMPLE_CASE);
      db.addOperationalData(key, 'PARTICIPATION');
      db.directMutate(key, { roomCode: 'R-G1-JURA' });
      const result = await reconcilePublicationPlan(plan, scenarios.reconciliationContext(db));
      assert.strictEqual(result.entries.find((row) => row.publicationKey === key).status, 'PROTECTED_CHANGE');
    }finally{ db.close(); }
  });
  await test('reconciliation reports unexpected target rows', async () => {
    const db = new C21PublicationFixtureDb();
    try{
      const plan = scenarios.buildPlan(buildDataset());
      await executePublicationPlan(plan, scenarios.context(db, 'C21-UNEXPECTED-SEED'));
      const emptyPlan = scenarios.buildPlan([], [], 2027, '2026-09-29T12:01:00.000Z');
      const result = await reconcilePublicationPlan(emptyPlan, scenarios.reconciliationContext(db));
      assert.strictEqual(result.summary.UNEXPECTED, 10);
    }finally{ db.close(); }
  });

  await test('audit records actor process year and plan', () => {
    const row = proof.audit.main[0];
    assert.strictEqual(row.actor_id, 'moa-c21');
    assert.strictEqual(row.process_id, 'C21-PROOF-HARNESS');
    assert.strictEqual(row.source_year, 2027);
    assert.ok(row.plan_id && row.plan_fingerprint);
  });
  await test('audit stores actual execution counts', () => {
    const rowA = proof.audit.main.find((row) => row.run_id === 'C21-PROOF-A');
    const rowB = proof.audit.main.find((row) => row.run_id === 'C21-PROOF-B');
    assert.strictEqual(rowA.create_count, 10);
    assert.strictEqual(rowB.create_count, 0);
    assert.strictEqual(rowB.unchanged_count, 10);
  });
  await test('audit schema contains no secret field', () => assert.strictEqual(proof.audit.secretFieldsPresent, false));
  await test('GESTIONNAIRE is authorized by executed proofs', () => assert.strictEqual(proof.security.authorizedRole, 'GESTIONNAIRE'));
  await test('UTILISATEUR is refused publication', () => assert.strictEqual(proof.security.forbidden.code, 'PUBLICATION_FORBIDDEN'));
  await test('explicit production environment is refused', () => assert.strictEqual(proof.security.productionGuard.code, 'PRODUCTION_EXECUTION_FORBIDDEN'));
  await test('plan validator accepts the intact Plan A shape', () => {
    const plan = scenarios.buildPlan(buildDataset());
    assert.strictEqual(validatePlan(plan), plan);
  });

  await test('fixture enforces foreign keys', () => assert.strictEqual(proof.security.fixtureForeignKeys, true));
  await test('PostgreSQL contract enables RLS and revokes client roles', () => assert.strictEqual(proof.security.rlsStatic, true));
  await test('C20 and C21 PostgreSQL drafts both end in rollback', () => assert.strictEqual(proof.security.rollbackOnlySql, true));
  await test('C21 SQL separates activity identity from event identity', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c21.sql'), 'utf8');
    assert.match(sql, /scope_qv_publication_activities/);
    assert.match(sql, /publication_activity_id/);
    assert.match(sql, /scope_qv_publication_runs/);
    assert.doesNotMatch(sql, /\bcommit\s*;/i);
  });
  await test('external historical activity remains not published', () => assert.strictEqual(proof.plans.A.summary.NOT_PUBLISHED, 1));
  await test('business codes retain exactly three suffix digits', () => {
    for(const code of [proof.domainCases.foba.businessCode, proof.domainCases.jsp.businessCode, proof.identity.businessCodeAfter]){
      assert.match(code, /^[^.]+\.\d{3}$/);
      assert.doesNotMatch(code, /^QV2[67]/);
    }
  });

  console.log(`\n${passed}/${passed} C21 tests PASS`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
