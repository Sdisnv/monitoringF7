'use strict';

const assert = require('assert');
const fs = require('fs');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const executor = require('../netlify/lib/_scope-qv-publication-executor');
const { reconcilePublicationPlan } = require('../netlify/lib/_scope-qv-publication-reconciliation');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { buildCanonicalDataset } = require('./lib/scope-c22-canonical-dataset');

const CONNECTION_STRING = process.env.C23_CLONE_DATABASE_URL || 'postgresql://127.0.0.1:55432/scope_c23_clone';
const EXPECTED_DATABASE = process.env.C23_CLONE_DATABASE || 'scope_c23_clone';
const GENERATED_AT = '2026-09-29T17:00:00.000Z';

function clone(value){ return JSON.parse(JSON.stringify(value)); }

function planFor(dataset, snapshot, generatedAt, programme = dataset.programme){
  return planner.buildPublicationPlan({
    year: 2027,
    programme,
    targetSnapshot: snapshot,
    referentials: dataset.referentials,
    generatedAt
  });
}

function executionContext(store, plan, suffix, extra = {}){
  return Object.assign({
    store,
    environment: 'clone',
    allowCloneExecution: true,
    allowBulkExecution: true,
    actor: { id: 'c23-repair-moa', roles: ['GESTIONNAIRE'] },
    runId: `C23-REPAIR-${suffix}`,
    processId: 'C23-REPAIR-1-PRODUCTION-PATH-ENABLEMENT',
    bulkApproval: {
      planId: plan.planId,
      planFingerprint: plan.planFingerprint,
      approvedBy: 'C23_REPAIR_CLONE_RECIPE',
      approvedAt: GENERATED_AT,
      maximumOperations: 118
    }
  }, extra);
}

function changedProgramme(dataset, caseId, patch){
  return dataset.programme.map((row) => {
    if(row.caseId !== caseId) return row;
    const next = clone(row);
    for(const [key, value] of Object.entries(patch)){
      if(key.startsWith('classification.')) next.classification[key.split('.')[1]] = value;
      else next[key] = value;
    }
    return next;
  });
}

async function expectCode(code, task){
  try { await task(); }
  catch(error){ assert.strictEqual(error.code, code); return error; }
  assert.fail(`Expected ${code}`);
}

async function resetClone(store){
  await store.transaction(async () => {
    await store.query(`delete from scope_participations where evenement_id in
      (select evenement_id from scope_evenements where publication_key is not null)`);
    await store.query(`delete from scope_attendus where evenement_id in
      (select evenement_id from scope_evenements where publication_key is not null)`);
    await store.query(`delete from scope_evenement_cibles where evenement_id in
      (select evenement_id from scope_evenements where publication_key is not null)`);
    for(const table of [
      'scope_qv_session_events','scope_evenement_ressources_qv','scope_evenement_roles_qv',
      'scope_evenement_public_rule_versions','scope_evenement_publics_qv','scope_evenement_ois',
      'scope_evenement_cibles_qv','scope_evenement_domaines','scope_qv_publication_links'
    ]) await store.query(`delete from ${table}`);
    await store.query('delete from scope_evenements where publication_key is not null');
    await store.query('delete from scope_qv_session_groups');
    await store.query('delete from scope_qv_publication_activities');
    await store.query('delete from scope_qv_publication_runs');
  });
}

async function run(){
  const dataset = buildCanonicalDataset();
  const store = await ScopeQvPostgresStore.open({
    connectionString: CONNECTION_STRING,
    deploymentMode: 'clone',
    allowCloneConnection: true,
    expectedDatabase: EXPECTED_DATABASE,
    statementTimeoutMs: 60000
  });
  let productionModeStore;
  try{
    await resetClone(store);
    const existingBefore = Number((await store.query(`select count(*)::integer as n from scope_evenements
      where date>=date '2027-01-01' and date<date '2028-01-01'`)).rows[0].n);
    assert.strictEqual(existingBefore, 3);

    const planA = planFor(dataset, await store.snapshot(2027), GENERATED_AT);
    assert.deepStrictEqual(planA.summary, { CREATE:118, UPDATE:0, UNCHANGED:0, BLOCKED:504, NOT_PUBLISHED:13 });
    const humanReview = planA.decisions.filter((row) => row.humanReview === true).length;
    const blocked = planA.decisions.filter((row) => row.action === 'BLOCKED' && row.humanReview !== true).length;
    assert.strictEqual(humanReview, 19);
    assert.strictEqual(blocked, 485);

    const beforeDryRun = await store.counts();
    const dryRun = await executor.executePublicationPlan(planA, executionContext(store, planA, 'DRY', { dryRun:true }));
    assert.strictEqual(dryRun.status, 'DRY_RUN');
    assert.deepStrictEqual(await store.counts(), beforeDryRun);

    await expectCode('QV_POSTGRES_PRODUCTION_TARGET_REFUSED', async () => ScopeQvPostgresStore.open({
      connectionString: CONNECTION_STRING,
      deploymentMode: 'production',
      allowProductionConnection: true,
      expectedHost: 'wrong.invalid',
      expectedDatabase: EXPECTED_DATABASE
    }));
    await expectCode('QV_POSTGRES_MODE_REQUIRED', async () => ScopeQvPostgresStore.open({
      connectionString: CONNECTION_STRING,
      expectedDatabase: EXPECTED_DATABASE
    }));

    productionModeStore = await ScopeQvPostgresStore.open({
      connectionString: CONNECTION_STRING,
      deploymentMode: 'production',
      allowProductionConnection: true,
      expectedHost: '127.0.0.1',
      expectedDatabase: EXPECTED_DATABASE,
      readOnly: true
    });
    await expectCode('PRODUCTION_EXECUTION_FORBIDDEN', async () => executor.executePublicationPlan(planA, {
      store: productionModeStore,
      environment: 'production',
      expectedTarget: { host:'127.0.0.1', database:EXPECTED_DATABASE },
      actor: { id:'refused', roles:['GESTIONNAIRE'] }
    }));
    const productionDryRun = await executor.executePublicationPlan(planA, {
      store: productionModeStore,
      environment: 'production',
      expectedTarget: { host:'127.0.0.1', database:EXPECTED_DATABASE },
      allowProductionDryRun: true,
      dryRun: true
    });
    assert.strictEqual(productionDryRun.environment, 'PRODUCTION_READ_ONLY');
    assert.deepStrictEqual(await store.counts(), beforeDryRun);

    const executionA = await executor.executePublicationPlan(planA, executionContext(store, planA, 'A'));
    assert.deepStrictEqual(executionA.counts, { created:118, updated:0, unchanged:0, blocked:504, notPublished:13 });
    const snapshotA = await store.snapshot(2027);
    assert.strictEqual(snapshotA.length, 118);
    const idsA = Object.fromEntries(snapshotA.map((row) => [row.publicationKey, row.eventId]));

    const planB = planFor(dataset, snapshotA, '2026-09-29T17:01:00.000Z');
    assert.deepStrictEqual(planB.summary, { CREATE:0, UPDATE:0, UNCHANGED:118, BLOCKED:504, NOT_PUBLISHED:13 });
    const executionB = await executor.executePublicationPlan(planB, executionContext(store, planB, 'B'));
    assert.strictEqual(executionB.status, 'NO_OP');
    const snapshotB = await store.snapshot(2027);
    assert.deepStrictEqual(Object.fromEntries(snapshotB.map((row) => [row.publicationKey, row.eventId])), idsA);

    const mutable = planA.decisions.find((row) => row.action === 'CREATE' && row.target.event.roomCode && row.target.event.durationMinutes !== 3600);
    const alternateRoom = mutable.target.event.roomCode === 'R-G1-O2' ? 'R-G1-OXYGENE' : 'R-G1-O2';
    const changed = changedProgramme(dataset, mutable.caseId, { 'classification.roomCode':alternateRoom });
    const rollbackPlan = planFor(dataset, snapshotB, '2026-09-29T17:02:00.000Z', changed);
    assert.strictEqual(rollbackPlan.summary.UPDATE, 1);
    const beforeRollback = await store.getByPublicationKey(mutable.publicationKey);
    const rollbackError = await expectCode('INJECTED_EXECUTION_FAILURE', async () => executor.executePublicationPlan(
      rollbackPlan, executionContext(store, rollbackPlan, 'ROLLBACK', { failAtStep:'AFTER_EVENT' })
    ));
    assert.strictEqual(rollbackError.executionResult.transaction, 'ROLLED_BACK');
    const afterRollback = await store.getByPublicationKey(mutable.publicationKey);
    assert.strictEqual(afterRollback.fingerprint, beforeRollback.fingerprint);
    assert.strictEqual(afterRollback.version, beforeRollback.version);

    const retry = await executor.executePublicationPlan(rollbackPlan, executionContext(store, rollbackPlan, 'RETRY'));
    assert.strictEqual(retry.counts.updated, 1);
    const returnPlan = planFor(dataset, await store.snapshot(2027), '2026-09-29T17:03:00.000Z');
    const returned = await executor.executePublicationPlan(returnPlan, executionContext(store, returnPlan, 'RETURN'));
    assert.strictEqual(returned.counts.updated, 1);

    const protectedRow = (await store.snapshot(2027)).find((row) => row.publicationKey !== mutable.publicationKey && row.desired.event.roomCode);
    const person = (await store.query('select personne_id from scope_participations limit 1')).rows[0];
    assert(person && person.personne_id);
    await store.query(`insert into scope_participations(evenement_id,personne_id,statut,role,source,created_at,updated_at)
      values ($1,$2,'NON_RENSEIGNE','PARTICIPANT','C23_REPAIR_CLONE',now(),now())`, [protectedRow.eventId, person.personne_id]);
    const protectedChanged = changedProgramme(dataset,
      planA.decisions.find((row) => row.publicationKey === protectedRow.publicationKey).caseId,
      { 'classification.responsibleId':'C23-PROTECTED-PROBE' });
    const protectedPlan = planFor(dataset, await store.snapshot(2027), '2026-09-29T17:04:00.000Z', protectedChanged);
    const protectedDecision = protectedPlan.decisions.find((row) => row.publicationKey === protectedRow.publicationKey);
    assert.strictEqual(protectedDecision.humanReview, true);
    assert.strictEqual(protectedDecision.action, 'BLOCKED');
    await store.query(`delete from scope_participations where evenement_id=$1 and personne_id=$2`, [protectedRow.eventId, person.personne_id]);

    const finalPlan = planFor(dataset, await store.snapshot(2027), '2026-09-29T17:05:00.000Z');
    const reconciliation = await reconcilePublicationPlan(finalPlan, {
      store, environment:'clone', allowCloneReconciliation:true
    });
    assert.strictEqual(reconciliation.status, 'MATCH');
    assert.deepStrictEqual(reconciliation.summary, { MATCHED:118, MISSING:0, DUPLICATE:0, DRIFT:0, PROTECTED_CHANGE:0, UNEXPECTED:0 });

    const duplicateCount = Number((await store.query(`select count(*)::integer as n from (
      select publication_key from scope_evenements where publication_key is not null group by publication_key having count(*)>1
    ) duplicates`)).rows[0].n);
    assert.strictEqual(duplicateCount, 0);
    const total2027 = Number((await store.query(`select count(*)::integer as n from scope_evenements
      where date>=date '2027-01-01' and date<date '2028-01-01'`)).rows[0].n);
    assert.strictEqual(total2027, 121);

    const cta = snapshotB.filter((row) => row.desired.event.durationMinutes === 3600);
    assert.strictEqual(cta.length, 53);
    const foba = snapshotB.filter((row) => row.desired.activity.businessCode === '070F1.005');
    assert.strictEqual(foba.length, 4);
    assert.strictEqual(new Set(foba.map((row) => row.activityId)).size, 1);
    assert.deepStrictEqual([...new Set(foba.flatMap((row) => row.desired.relations.oiCodes))].sort(), ['B1','B2','C1','G1']);
    assert.strictEqual(dataset.canonical.statComPdf, 87);
    assert.strictEqual(dataset.canonical.statComExtensions, 4);
    assert.strictEqual(dataset.programme.filter((row) => row.session.count > 1 && row.status === 'A_POSITIONNER' && row.schedule == null).length, 12);

    const report = {
      verdict:'PASS',
      database:store.serverProof,
      guards:{ unauthorizedProduction:'PASS', wrongTarget:'PASS', incompleteConfiguration:'PASS', dryRunNonMutating:'PASS' },
      lifecycle:{ total:635, ready:118, humanReview:19, blocked:485, notPublished:13 },
      firstPass:executionA.counts,
      secondPass:executionB.counts,
      uuidStable:true,
      rollback:{ injectedFailure:'ROLLED_BACK', retryUpdated:retry.counts.updated },
      reconciliation:reconciliation.summary,
      existingEventsPreserved:existingBefore,
      finalEvents2027:total2027,
      duplicatePublicationKeys:duplicateCount,
      cta60Hours:cta.length,
      statCom:{ pdf:dataset.canonical.statComPdf, extensions:dataset.canonical.statComExtensions },
      foba070F1005:{ materializations:foba.length, activities:new Set(foba.map((row) => row.activityId)).size },
      undatedSessionsBlocked:12
    };
    if(process.env.C23_REPAIR_RESULT_PATH) fs.writeFileSync(process.env.C23_REPAIR_RESULT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  }finally{
    if(productionModeStore) await productionModeStore.close();
    await store.close();
  }
}

if(require.main === module){
  run().then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { run };
