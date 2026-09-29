'use strict';

const planner = require('./_scope-qv-publication-plan');
const { FIXTURE_ADAPTER, POSTGRES_FIXTURE_ADAPTER, PRODUCTION_POSTGRES_ADAPTER } = require('./_scope-qv-publication-executor');
const ALLOWED_ADAPTERS = new Set([FIXTURE_ADAPTER, POSTGRES_FIXTURE_ADAPTER]);

const EXPECTED_ACTIONS = new Set([
  planner.ACTIONS.CREATE,
  planner.ACTIONS.UPDATE,
  planner.ACTIONS.UNCHANGED
]);

function reconciliationError(code, message){
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertReconciliationContext(context){
  const store = context && context.store;
  if(store && store.adapterKind === PRODUCTION_POSTGRES_ADAPTER){
    const cloneAllowed = store.deploymentMode === 'clone' && store.isIsolated === true && store.isProduction === false
      && context.environment === 'clone' && context.allowCloneReconciliation === true;
    const productionAllowed = store.deploymentMode === 'production' && store.isIsolated === false && store.isProduction === true
      && context.environment === 'production' && context.allowProductionReconciliation === true
      && context.expectedTarget
      && context.expectedTarget.host === store.target.host
      && context.expectedTarget.database === store.target.database;
    if(cloneAllowed || productionAllowed) return store;
    throw reconciliationError('PRODUCTION_RECONCILIATION_FORBIDDEN', 'PostgreSQL reconciliation requires an explicit read-only target context.');
  }
  if(!store || !ALLOWED_ADAPTERS.has(store.adapterKind) || store.isIsolated !== true || store.isProduction !== false
    || context.environment !== 'test' || context.allowIsolatedReconciliation !== true){
    throw reconciliationError('PRODUCTION_RECONCILIATION_FORBIDDEN', 'C21 reconciliation is restricted to the isolated test fixture.');
  }
  return store;
}

function hasOperationalData(row){
  const state = row && row.operationalState || {};
  return ['attendus', 'participations', 'permutations', 'rattrapages', 'decisions']
    .some((field) => Number(state[field] || 0) > 0);
}

async function reconcilePublicationPlan(plan, context = {}){
  const store = assertReconciliationContext(context);
  if(!plan || plan.kind !== 'PublicationPlan' || plan.planFingerprint !== planner.publicationPlanFingerprint(plan)){
    throw reconciliationError('INVALID_RECONCILIATION_PLAN', 'Reconciliation requires an intact publication plan.');
  }
  const before = planner.stableStringify(await store.counts());
  const snapshot = await store.snapshot(plan.year);
  const actualByKey = new Map();
  for(const row of snapshot){
    if(!actualByKey.has(row.publicationKey)) actualByKey.set(row.publicationKey, []);
    actualByKey.get(row.publicationKey).push(row);
  }
  const expected = new Map((plan.decisions || [])
    .filter((decision) => decision.target && (EXPECTED_ACTIONS.has(decision.action) || decision.humanReview === true))
    .map((decision) => [decision.publicationKey, decision]));
  const entries = [];

  for(const [publicationKey, decision] of expected){
    const rows = actualByKey.get(publicationKey) || [];
    if(rows.length === 0){
      entries.push({ publicationKey, status: 'MISSING', reason: 'EXPECTED_SCOPE_EVENT_ABSENT' });
      continue;
    }
    if(rows.length > 1){
      entries.push({ publicationKey, status: 'DUPLICATE', reason: 'MULTIPLE_SCOPE_EVENTS_FOR_PUBLICATION_KEY', eventIds: rows.map((row) => row.eventId) });
      continue;
    }
    const actual = rows[0];
    if(decision.humanReview === true){
      entries.push({
        publicationKey,
        eventId: actual.eventId,
        status: 'PROTECTED_CHANGE',
        reason: decision.reason || 'HUMAN_REVIEW_REQUIRED',
        expectedFingerprint: decision.target.fingerprint,
        actualFingerprint: actual.fingerprint
      });
      actualByKey.delete(publicationKey);
      continue;
    }
    const mismatches = [];
    if(actual.fingerprint !== decision.target.fingerprint) mismatches.push('TARGET_SNAPSHOT');
    if(actual.publicationFingerprint !== decision.target.fingerprint) mismatches.push('EVENT_PUBLICATION_FINGERPRINT');
    if(actual.lastSyncedFingerprint !== decision.target.fingerprint) mismatches.push('PROVENANCE_FINGERPRINT');
    if(planner.stableStringify(actual.source) !== planner.stableStringify(decision.target.source)) mismatches.push('SOURCE_PROVENANCE');
    if(mismatches.length){
      entries.push({
        publicationKey,
        eventId: actual.eventId,
        status: hasOperationalData(actual) ? 'PROTECTED_CHANGE' : 'DRIFT',
        reason: mismatches.join(','),
        expectedFingerprint: decision.target.fingerprint,
        actualFingerprint: actual.fingerprint
      });
    }else{
      entries.push({ publicationKey, eventId: actual.eventId, status: 'MATCHED', reason: 'STRICT_MATCH' });
    }
    actualByKey.delete(publicationKey);
  }

  for(const rows of actualByKey.values()){
    for(const row of rows){
      entries.push({ publicationKey: row.publicationKey, eventId: row.eventId, status: 'UNEXPECTED', reason: 'NO_EXECUTABLE_OR_UNCHANGED_PLAN_DECISION' });
    }
  }
  entries.sort((left, right) => left.publicationKey.localeCompare(right.publicationKey));
  const statusNames = ['MATCHED', 'MISSING', 'DUPLICATE', 'DRIFT', 'PROTECTED_CHANGE', 'UNEXPECTED'];
  const summary = Object.fromEntries(statusNames.map((status) => [status, entries.filter((entry) => entry.status === status).length]));
  const after = planner.stableStringify(await store.counts());
  if(before !== after) throw reconciliationError('RECONCILIATION_WROTE_DATA', 'Read-only reconciliation changed fixture data.');
  return {
    kind: 'PublicationReconciliationResult',
    sourcePlanId: plan.planId,
    sourcePlanFingerprint: plan.planFingerprint,
    year: plan.year,
    status: entries.every((entry) => entry.status === 'MATCHED') ? 'MATCH' : 'MISMATCH',
    readOnly: true,
    summary,
    entries
  };
}

module.exports = { assertReconciliationContext, reconcilePublicationPlan };
