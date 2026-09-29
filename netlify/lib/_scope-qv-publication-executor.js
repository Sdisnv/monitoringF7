'use strict';

const { randomUUID } = require('crypto');
const { hasPermission } = require('./_rbac');
const planner = require('./_scope-qv-publication-plan');

const FIXTURE_ADAPTER = 'C21_SQLITE_ISOLATED_FIXTURE';
const POSTGRES_FIXTURE_ADAPTER = 'C22_POSTGRES_EPHEMERAL_FIXTURE';
const PRODUCTION_POSTGRES_ADAPTER = 'SCOPE_QV_POSTGRES_PRODUCTION';
const ALLOWED_ADAPTERS = new Set([FIXTURE_ADAPTER, POSTGRES_FIXTURE_ADAPTER]);
const BULK_EXECUTION_THRESHOLD = 50;
const EXECUTABLE_ACTIONS = new Set([planner.ACTIONS.CREATE, planner.ACTIONS.UPDATE]);
const KNOWN_ACTIONS = new Set(Object.values(planner.ACTIONS));

function executionError(code, message, statusCode){
  const error = new Error(message);
  error.code = code;
  if(statusCode) error.statusCode = statusCode;
  return error;
}

function assertIsolatedContext(context){
  const store = context && context.store;
  if(!store || !ALLOWED_ADAPTERS.has(store.adapterKind) || store.isIsolated !== true || store.isProduction !== false
    || context.environment !== 'test' || context.allowIsolatedExecution !== true){
    throw executionError(
      'PRODUCTION_EXECUTION_FORBIDDEN',
      'C21 execution is restricted to the explicit isolated test fixture.',
      403
    );
  }
  return store;
}

function targetMatches(store, expected){
  return Boolean(expected)
    && String(expected.host || '') === String(store && store.target && store.target.host || '')
    && String(expected.database || '') === String(store && store.target && store.target.database || '');
}

function assertExecutionContext(context, plan, options = {}){
  const store = context && context.store;
  if(store && ALLOWED_ADAPTERS.has(store.adapterKind)) return assertIsolatedContext(context);
  if(!store || store.adapterKind !== PRODUCTION_POSTGRES_ADAPTER){
    throw executionError('PRODUCTION_EXECUTION_FORBIDDEN', 'No approved publication adapter is configured.', 403);
  }
  if(store.deploymentMode === 'clone'){
    if(store.isIsolated !== true || store.isProduction !== false
      || context.environment !== 'clone' || context.allowCloneExecution !== true){
      throw executionError('CLONE_EXECUTION_FORBIDDEN', 'Clone execution requires an explicit isolated clone context.', 403);
    }
    return store;
  }
  if(store.deploymentMode !== 'production' || store.isProduction !== true || store.isIsolated !== false
    || context.environment !== 'production' || !targetMatches(store, context.expectedTarget)){
    throw executionError('PRODUCTION_EXECUTION_FORBIDDEN', 'Production target identity is not explicitly approved.', 403);
  }
  if(options.mutation === false){
    if(context.allowProductionDryRun !== true){
      throw executionError('PRODUCTION_DRY_RUN_FORBIDDEN', 'Production dry-run requires explicit read-only approval.', 403);
    }
    return store;
  }
  const authorization = context.productionAuthorization || {};
  if(context.allowProductionExecution !== true
    || process.env.SCOPE_QV_PRODUCTION_EXECUTION_ENABLED !== 'YES'
    || !String(authorization.gateId || '').trim()
    || !String(authorization.approvedBy || '').trim()
    || authorization.planId !== (plan && plan.planId)
    || authorization.planFingerprint !== (plan && plan.planFingerprint)
    || !targetMatches(store, authorization.target)){
    throw executionError('PRODUCTION_EXECUTION_FORBIDDEN', 'Production mutation is disabled until a future gate supplies every explicit authorization.', 403);
  }
  return store;
}

function validateBulkApproval(plan, context){
  const operationCount = (plan.decisions || []).filter((decision) => EXECUTABLE_ACTIONS.has(decision.action)).length;
  if(operationCount <= BULK_EXECUTION_THRESHOLD) return { required: false, operationCount };
  const approval = context && context.bulkApproval;
  if(context.allowBulkExecution !== true || !approval
    || approval.planId !== plan.planId
    || approval.planFingerprint !== plan.planFingerprint
    || !String(approval.approvedBy || '').trim()
    || !String(approval.approvedAt || '').trim()
    || Number(approval.maximumOperations || 0) < operationCount){
    throw executionError(
      'BULK_APPROVAL_REQUIRED',
      `Plan ${plan.planId} contains ${operationCount} executable operations and requires exact explicit approval.`,
      409
    );
  }
  return { required: true, operationCount, approvedBy: String(approval.approvedBy) };
}

function validatePlan(plan){
  if(!plan || plan.kind !== 'PublicationPlan' || plan.engineVersion !== planner.ENGINE_VERSION
    || plan.dryRun !== true || plan.writable !== false || !Array.isArray(plan.decisions)){
    throw executionError('INVALID_PUBLICATION_PLAN', 'The input is not an immutable C20 publication plan.', 400);
  }
  if(plan.planFingerprint !== planner.publicationPlanFingerprint(plan)){
    throw executionError('PLAN_FINGERPRINT_MISMATCH', 'The publication plan was modified after generation.', 409);
  }
  const summary = Object.fromEntries(planner.ACTION_ORDER.map((action) => [action, 0]));
  const keys = new Set();
  for(const decision of plan.decisions){
    if(!KNOWN_ACTIONS.has(decision.action)) throw executionError('UNKNOWN_PLAN_ACTION', `Unknown action: ${decision.action}`, 400);
    summary[decision.action] += 1;
    if(decision.publicationKey){
      if(keys.has(decision.publicationKey)) throw executionError('DUPLICATE_PLAN_PUBLICATION_KEY', 'A publication key appears more than once in the plan.', 409);
      keys.add(decision.publicationKey);
    }
    if(EXECUTABLE_ACTIONS.has(decision.action)){
      if(!decision.publicationKey || !decision.target || decision.target.fingerprint !== planner.targetFingerprint(decision.target)){
        throw executionError('INVALID_PLAN_TARGET', 'An executable decision has no valid immutable target.', 400);
      }
      if(decision.action === planner.ACTIONS.UPDATE && (!decision.expectedFingerprint || !decision.eventId)){
        throw executionError('MISSING_OPTIMISTIC_LOCK', 'An update requires the expected event and fingerprint.', 409);
      }
    }
  }
  if(planner.stableStringify(summary) !== planner.stableStringify(plan.summary)){
    throw executionError('PLAN_SUMMARY_MISMATCH', 'The publication plan summary is inconsistent.', 400);
  }
  return plan;
}

function hasOperationalData(existing){
  const state = existing && existing.operationalState || {};
  return ['attendus', 'participations', 'permutations', 'rattrapages', 'decisions']
    .some((field) => Number(state[field] || 0) > 0);
}

function classifyChangeSafety(existing, changedFields = []){
  return hasOperationalData(existing) && changedFields.length > 0 ? 'HUMAN_REVIEW_REQUIRED' : 'AUTO_UPDATE_ALLOWED';
}

function createCheckpoint(context){
  let sequence = 0;
  return (name) => {
    sequence += 1;
    if(context.failAtStep === name || Number(context.failAtStep) === sequence){
      throw executionError('INJECTED_EXECUTION_FAILURE', `Injected failure at ${name}.`, 500);
    }
  };
}

function currentFingerprint(existing){
  return String(existing && existing.fingerprint || '');
}

function synchronizationIsConsistent(existing){
  const current = currentFingerprint(existing);
  return Boolean(current)
    && current === String(existing && existing.publicationFingerprint || '')
    && current === String(existing && existing.lastSyncedFingerprint || '');
}

async function executePublicationPlan(inputPlan, context = {}){
  const plan = validatePlan(inputPlan);
  const dryRun = context.dryRun === true;
  const store = assertExecutionContext(context, plan, { mutation: !dryRun });
  if(dryRun){
    const before = planner.stableStringify(await store.counts());
    const snapshot = await store.snapshot(plan.year);
    const after = planner.stableStringify(await store.counts());
    if(before !== after) throw executionError('DRY_RUN_WROTE_DATA', 'Dry-run changed the target database.', 500);
    return {
      kind: 'PublicationDryRunResult',
      sourcePlanId: plan.planId,
      sourcePlanFingerprint: plan.planFingerprint,
      status: 'DRY_RUN',
      summary: Object.assign({}, plan.summary),
      currentPublicationCount: snapshot.length,
      transaction: 'NOT_STARTED',
      environment: store.deploymentMode === 'production' ? 'PRODUCTION_READ_ONLY' : 'CLONE_READ_ONLY'
    };
  }
  const actor = context.actor || {};
  const runId = String(context.runId || `C21-${randomUUID()}`);
  const processId = String(context.processId || 'C21-LOCAL-FIXTURE');
  let auditStarted = false;

  try{
    await store.startRun({
      runId,
      planId: plan.planId,
      planFingerprint: plan.planFingerprint,
      year: plan.year,
      actorId: String(actor.id || 'anonymous'),
      processId,
      summary: plan.summary
    });
    auditStarted = true;
    if(!hasPermission(actor, 'events:publish')){
      throw executionError('PUBLICATION_FORBIDDEN', 'The actor does not have events:publish.', 403);
    }
    const bulkApproval = validateBulkApproval(plan, context);

    const result = await store.runExclusive(async () => store.transaction(async () => {
      const checkpoint = createCheckpoint(context);
      const counts = { created: 0, updated: 0, unchanged: 0, blocked: 0, notPublished: 0 };
      const eventIds = [];

      for(const decision of plan.decisions){
        if(decision.action === planner.ACTIONS.BLOCKED){ counts.blocked += 1; continue; }
        if(decision.action === planner.ACTIONS.NOT_PUBLISHED){ counts.notPublished += 1; continue; }
        const existing = await store.getByPublicationKey(decision.publicationKey);

        if(decision.action === planner.ACTIONS.CREATE){
          if(existing){
            if(currentFingerprint(existing) !== decision.target.fingerprint || !synchronizationIsConsistent(existing)){
              throw executionError('STALE_PLAN', `CREATE target ${decision.publicationKey} now exists with different data.`, 409);
            }
            counts.unchanged += 1;
            eventIds.push(existing.eventId);
            continue;
          }
          eventIds.push(await store.createTarget(decision.target, checkpoint));
          counts.created += 1;
          continue;
        }

        if(decision.action === planner.ACTIONS.UPDATE){
          if(!existing || existing.eventId !== decision.eventId){
            throw executionError('STALE_PLAN', `UPDATE target ${decision.publicationKey} no longer matches its event.`, 409);
          }
          if(currentFingerprint(existing) === decision.target.fingerprint && synchronizationIsConsistent(existing)){
            counts.unchanged += 1;
            eventIds.push(existing.eventId);
            continue;
          }
          if(currentFingerprint(existing) !== decision.expectedFingerprint
            || (decision.expectedVersion != null && Number(existing.version) !== Number(decision.expectedVersion))){
            throw executionError('STALE_PLAN', `UPDATE target ${decision.publicationKey} changed after planning.`, 409);
          }
          if(classifyChangeSafety(existing, decision.changedFields || []) !== 'AUTO_UPDATE_ALLOWED'){
            throw executionError('HUMAN_REVIEW_REQUIRED', `Operational data protects ${decision.publicationKey}.`, 409);
          }
          eventIds.push(await store.updateTarget(existing, decision.target, checkpoint));
          counts.updated += 1;
          continue;
        }

        if(!existing || currentFingerprint(existing) !== decision.target.fingerprint || !synchronizationIsConsistent(existing)){
          throw executionError('STALE_PLAN', `UNCHANGED target ${decision.publicationKey} is no longer conforming.`, 409);
        }
        counts.unchanged += 1;
        eventIds.push(existing.eventId);
      }

      return {
        kind: 'PublicationExecutionResult',
        runId,
        sourcePlanId: plan.planId,
        sourcePlanFingerprint: plan.planFingerprint,
        status: counts.created + counts.updated === 0 ? 'NO_OP' : 'SUCCESS',
        counts,
        eventIds: [...new Set(eventIds)],
        transaction: 'COMMITTED',
        environment: store.deploymentMode === 'production' ? 'PRODUCTION' : store.deploymentMode === 'clone' ? 'PRODUCTION_CLONE' : 'ISOLATED_TEST_FIXTURE',
        bulkApproval
      };
    }));
    await store.finishRun(runId, result.status, { counts: result.counts });
    return result;
  }catch(error){
    if(auditStarted){
      const status = error.code === 'PUBLICATION_FORBIDDEN' ? 'FORBIDDEN'
        : error.code === 'BULK_APPROVAL_REQUIRED' ? 'REJECTED'
        : error.code === 'STALE_PLAN' ? 'STALE_PLAN' : 'FAILURE';
      await store.finishRun(runId, status, { errorCode: error.code || 'EXECUTION_FAILURE', rolledBack: !['FORBIDDEN', 'REJECTED'].includes(status) });
    }
    const notStarted = ['PUBLICATION_FORBIDDEN', 'BULK_APPROVAL_REQUIRED'].includes(error.code);
    error.executionResult = {
      kind: 'PublicationExecutionResult', runId, sourcePlanId: plan.planId,
      status: notStarted ? 'FORBIDDEN' : error.code === 'STALE_PLAN' ? 'STALE_PLAN' : 'FAILURE',
      transaction: notStarted ? 'NOT_STARTED' : 'ROLLED_BACK', errorCode: error.code || 'EXECUTION_FAILURE'
    };
    throw error;
  }
}

module.exports = {
  FIXTURE_ADAPTER,
  POSTGRES_FIXTURE_ADAPTER,
  PRODUCTION_POSTGRES_ADAPTER,
  BULK_EXECUTION_THRESHOLD,
  assertIsolatedContext,
  assertExecutionContext,
  validatePlan,
  validateBulkApproval,
  classifyChangeSafety,
  executePublicationPlan
};
