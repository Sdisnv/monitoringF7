'use strict';

const { createHash } = require('crypto');

const ENGINE_VERSION = 'C20-1';
const ACTIONS = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  UNCHANGED: 'UNCHANGED',
  BLOCKED: 'BLOCKED',
  NOT_PUBLISHED: 'NOT_PUBLISHED'
});
const ACTION_ORDER = Object.freeze([
  ACTIONS.CREATE,
  ACTIONS.UPDATE,
  ACTIONS.UNCHANGED,
  ACTIONS.BLOCKED,
  ACTIONS.NOT_PUBLISHED
]);

function stableValue(value){
  if(Array.isArray(value)) return value.map(stableValue);
  if(value && typeof value === 'object'){
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value){
  return JSON.stringify(stableValue(value));
}

function sha256(value){
  return createHash('sha256').update(String(value)).digest('hex');
}

function targetFingerprint(target){
  const value = stableValue(target || {});
  if(value && typeof value === 'object') delete value.fingerprint;
  return sha256(stableStringify(value));
}

function text(value){
  return String(value == null ? '' : value).trim();
}

function upper(value){
  return text(value).toUpperCase();
}

function sortedUnique(values){
  return [...new Set((values || []).map(upper).filter(Boolean))].sort();
}

function sortedText(values){
  return [...new Set((values || []).map(text).filter(Boolean))].sort();
}

function sourceIdentity(item){
  const source = item && item.source || {};
  return {
    year: Number(item && item.year),
    definitionId: text(source.definitionId),
    occurrenceId: text(source.occurrenceId),
    sessionId: text(source.sessionId),
    publicationUnitId: text(source.publicationUnitId || 'DEFAULT')
  };
}

function canonicalPublicationKey(item){
  const identity = sourceIdentity(item);
  if(!Number.isInteger(identity.year) || identity.year < 2000) return null;
  if(!identity.definitionId || !identity.occurrenceId || !identity.sessionId || !identity.publicationUnitId) return null;
  const digest = sha256(stableStringify(identity)).slice(0, 32).toUpperCase();
  return `QV-${identity.year}-${digest}`;
}

function parseLocalDateTime(value){
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if(!match) return null;
  const [, year, month, day, hour, minute] = match;
  const millis = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const date = new Date(millis);
  if(date.toISOString().slice(0, 16) !== `${year}-${month}-${day}T${hour}:${minute}`) return null;
  return { value: `${year}-${month}-${day}T${hour}:${minute}`, millis };
}

function temporalSnapshot(schedule){
  const startsAt = parseLocalDateTime(schedule && schedule.startsAt);
  const endsAt = parseLocalDateTime(schedule && schedule.endsAt);
  if(!startsAt || !endsAt || endsAt.millis <= startsAt.millis) return null;
  return {
    startsAt: startsAt.value,
    endsAt: endsAt.value,
    startDate: startsAt.value.slice(0, 10),
    endDate: endsAt.value.slice(0, 10),
    startTime: startsAt.value.slice(11),
    endTime: endsAt.value.slice(11),
    durationMinutes: (endsAt.millis - startsAt.millis) / 60000,
    crossesMidnight: startsAt.value.slice(0, 10) !== endsAt.value.slice(0, 10)
  };
}

function refSet(referentials, name){
  return new Set((referentials && referentials[name] || []).map(upper));
}

function missingReferences(item, referentials){
  const classification = item.classification || {};
  const checks = [
    ['domains', [classification.primaryDomain].concat(classification.domainCodes || [])],
    ['targets', classification.targetCodes],
    ['publics', classification.publicCodes],
    ['ois', classification.oiCodes],
    ['locations', classification.locationCode ? [classification.locationCode] : []],
    ['rooms', classification.roomCode ? [classification.roomCode] : []]
  ];
  const missing = [];
  for(const [name, values] of checks){
    const allowed = refSet(referentials, name);
    for(const value of sortedUnique(values)) if(!allowed.has(value)) missing.push(`${name}:${value}`);
  }
  return missing;
}

function businessValidation(item, referentials){
  const business = item.business || {};
  const statComCode = upper(business.statComCode);
  const businessCode = upper(business.businessCode);
  if(item.externalHistorical){
    return businessCode || statComCode
      ? { valid: false, reason: 'EXTERNAL_ACTIVITY_MUST_NOT_HAVE_BUSINESS_CODE' }
      : { valid: true, statComCode: null, businessCode: null };
  }
  if(!statComCode){
    return businessCode
      ? { valid: false, reason: 'BUSINESS_CODE_WITHOUT_STATCOM' }
      : { valid: true, statComCode: null, businessCode: null };
  }
  if(!refSet(referentials, 'statComCodes').has(statComCode)){
    return { valid: false, reason: `UNKNOWN_STATCOM:${statComCode}` };
  }
  if(!new RegExp(`^${statComCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d{3}$`).test(businessCode)){
    return { valid: false, reason: 'BUSINESS_CODE_MUST_BE_STATCOM_DOT_3_DIGITS' };
  }
  return { valid: true, statComCode, businessCode };
}

function readiness(item, referentials){
  if(item.externalHistorical){
    const business = businessValidation(item, referentials);
    return business.valid
      ? { action: ACTIONS.NOT_PUBLISHED, reason: 'EXTERNAL_HISTORICAL_NOT_RECONDUCTED' }
      : { action: ACTIONS.BLOCKED, reason: business.reason };
  }
  if(upper(item.status) !== 'VALIDATED') return { action: ACTIONS.BLOCKED, reason: 'SOURCE_NOT_VALIDATED' };
  const key = canonicalPublicationKey(item);
  if(!key) return { action: ACTIONS.BLOCKED, reason: 'UNSTABLE_SOURCE_IDENTITY' };
  const temporal = temporalSnapshot(item.schedule);
  if(!temporal) return { action: ACTIONS.BLOCKED, reason: 'DATE_OR_TIME_NOT_DEFINITIVE' };
  if(item.referencesValidated !== true) return { action: ACTIONS.BLOCKED, reason: 'REFERENCES_NOT_VALIDATED' };
  const classification = item.classification || {};
  if(!upper(classification.primaryDomain)) return { action: ACTIONS.BLOCKED, reason: 'PRIMARY_DOMAIN_REQUIRED' };
  const missing = missingReferences(item, referentials);
  if(missing.length) return { action: ACTIONS.BLOCKED, reason: `UNKNOWN_REFERENCES:${missing.join(',')}` };
  const business = businessValidation(item, referentials);
  if(!business.valid) return { action: ACTIONS.BLOCKED, reason: business.reason };
  const blockingConflicts = (item.conflicts || []).filter((row) => row && row.blocking !== false);
  if(blockingConflicts.length){
    return { action: ACTIONS.BLOCKED, reason: `BLOCKING_CONFLICT:${blockingConflicts.map((row) => upper(row.code) || 'UNSPECIFIED').join(',')}` };
  }
  const session = item.session || {};
  const index = Number(session.index || 1);
  const count = Number(session.count || 1);
  if(!Number.isInteger(index) || !Number.isInteger(count) || index < 1 || count < 1 || index > count){
    return { action: ACTIONS.BLOCKED, reason: 'INVALID_SESSION_SHAPE' };
  }
  return { action: null, reason: null, key, temporal, business };
}

function desiredTarget(item, gate){
  const classification = item.classification || {};
  const session = item.session || {};
  const identity = sourceIdentity(item);
  const desired = {
    publicationKey: gate.key,
    sourceType: 'QUO_VADIS',
    sourceYear: identity.year,
    source: { ...identity, sourceRecordIds: sortedText(item.source && item.source.sourceRecordIds) },
    activity: {
      definitionId: identity.definitionId,
      label: text(item.label),
      statComCode: gate.business.statComCode,
      businessCode: gate.business.businessCode
    },
    occurrence: {
      occurrenceId: identity.occurrenceId,
      sessionId: identity.sessionId,
      publicationUnitId: identity.publicationUnitId
    },
    session: {
      groupId: text(session.groupId) || identity.occurrenceId,
      index: Number(session.index || 1),
      count: Number(session.count || 1),
      label: text(session.label) || null
    },
    event: {
      status: 'PLANIFIE',
      label: text(item.eventLabel || item.label),
      primaryDomain: upper(classification.primaryDomain),
      family: text(item.family) || null,
      eventType: text(item.eventType) || null,
      startsAt: gate.temporal.startsAt,
      endsAt: gate.temporal.endsAt,
      startDate: gate.temporal.startDate,
      endDate: gate.temporal.endDate,
      startTime: gate.temporal.startTime,
      endTime: gate.temporal.endTime,
      durationMinutes: gate.temporal.durationMinutes,
      crossesMidnight: gate.temporal.crossesMidnight,
      locationCode: upper(classification.locationCode) || null,
      roomCode: upper(classification.roomCode) || null,
      responsibleId: text(classification.responsibleId) || null,
      entryService: text(item.entryService) || null,
      priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : null,
      fixedDate: item.fixedDate === true,
      dayExclusive: item.dayExclusive === true,
      permutationAllowed: item.permutationAllowed === true,
      businessException: upper(item.businessException) || null
    },
    relations: {
      domainCodes: sortedUnique([classification.primaryDomain].concat(classification.domainCodes || [])),
      targetCodes: sortedUnique(classification.targetCodes),
      publicCodes: sortedUnique(classification.publicCodes),
      oiCodes: sortedUnique(classification.oiCodes),
      roleCodes: sortedUnique(item.roles),
      resourceCodes: sortedUnique(item.resources)
    }
  };
  return { ...desired, fingerprint: targetFingerprint(desired) };
}

function operationalData(existing){
  const state = existing && existing.operationalState || {};
  return ['attendus', 'participations', 'permutations', 'rattrapages', 'decisions']
    .some((field) => Number(state[field] || 0) > 0)
    || ['REALISE', 'ANNULE'].includes(upper(state.status || existing && existing.status));
}

function changedFields(left, right, path = ''){
  if(stableStringify(left) === stableStringify(right)) return [];
  if(!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) || Array.isArray(right)){
    return [path || '$'];
  }
  const keys = [...new Set(Object.keys(left).concat(Object.keys(right)))].sort();
  return keys.flatMap((key) => changedFields(left[key], right[key], path ? `${path}.${key}` : key));
}

function decisionForItem(item, existingRows, referentials, duplicateSource){
  const key = canonicalPublicationKey(item);
  const base = {
    caseId: text(item.caseId) || null,
    source: { ...sourceIdentity(item), sourceRecordIds: sortedText(item.source && item.source.sourceRecordIds) },
    publicationKey: key,
    label: text(item.label),
    statComCode: upper(item.business && item.business.statComCode) || null,
    businessCode: upper(item.business && item.business.businessCode) || null,
    schedule: item.schedule || null,
    session: {
      groupId: text(item.session && item.session.groupId) || null,
      index: Number(item.session && item.session.index || 1),
      count: Number(item.session && item.session.count || 1),
      label: text(item.session && item.session.label) || null
    },
    classification: {
      primaryDomain: upper(item.classification && item.classification.primaryDomain) || null,
      domainCodes: sortedUnique(item.classification && item.classification.domainCodes),
      targetCodes: sortedUnique(item.classification && item.classification.targetCodes),
      publicCodes: sortedUnique(item.classification && item.classification.publicCodes),
      oiCodes: sortedUnique(item.classification && item.classification.oiCodes),
      locationCode: upper(item.classification && item.classification.locationCode) || null,
      roomCode: upper(item.classification && item.classification.roomCode) || null
    }
  };
  if(duplicateSource) return { ...base, action: ACTIONS.BLOCKED, reason: 'DUPLICATE_SOURCE_IDENTITY', target: null };
  if(item.humanReviewRequired === true){
    return {
      ...base,
      action: ACTIONS.BLOCKED,
      reason: text(item.humanReviewReason) || 'HUMAN_REVIEW_REQUIRED',
      target: null,
      humanReview: true
    };
  }
  if(['ANNULE', 'CANCELLED'].includes(upper(item.status))){
    if(!key) return { ...base, action: ACTIONS.BLOCKED, reason: 'UNSTABLE_SOURCE_IDENTITY', target: null };
    if(existingRows.length > 1) return { ...base, action: ACTIONS.BLOCKED, reason: 'DUPLICATE_SCOPE_PUBLICATION_KEY', target: null };
    if(!existingRows.length) return { ...base, action: ACTIONS.NOT_PUBLISHED, reason: 'CANCELLED_BEFORE_PUBLICATION', target: null };
    const existing = existingRows[0];
    const target = stableValue(existing.desired || existing.target || {});
    if(!target.event) return { ...base, action: ACTIONS.BLOCKED, reason: 'MISSING_EXISTING_EVENT_STATE', target: null };
    target.event.status = 'ANNULE';
    target.fingerprint = targetFingerprint(target);
    const currentFingerprint = text(existing.fingerprint || existing.publicationFingerprint);
    if(currentFingerprint === target.fingerprint){
      return { ...base, action: ACTIONS.UNCHANGED, reason: 'SCOPE_EVENT_ALREADY_CANCELLED', eventId: existing.eventId || null, target, expectedFingerprint: currentFingerprint, expectedVersion: existing.version || null, changedFields: [] };
    }
    if(operationalData(existing)){
      return { ...base, action: ACTIONS.BLOCKED, reason: 'HUMAN_REVIEW_CANCELLATION_WITH_OPERATIONAL_DATA', eventId: existing.eventId || null, target, expectedFingerprint: currentFingerprint, expectedVersion: existing.version || null, changedFields: ['event.status'], humanReview: true };
    }
    return { ...base, action: ACTIONS.UPDATE, reason: 'SOURCE_CANCELLED_CANCEL_SCOPE_EVENT', eventId: existing.eventId || null, target, expectedFingerprint: currentFingerprint, expectedVersion: existing.version || null, changedFields: ['event.status'] };
  }
  const gate = readiness(item, referentials);
  if(gate.action) return { ...base, action: gate.action, reason: gate.reason, target: null };
  if(existingRows.length > 1){
    return { ...base, action: ACTIONS.BLOCKED, reason: 'DUPLICATE_SCOPE_PUBLICATION_KEY', target: null };
  }
  const desired = desiredTarget(item, gate);
  if(!existingRows.length){
    return { ...base, action: ACTIONS.CREATE, reason: 'READY_WITHOUT_SCOPE_EVENT', target: desired, expectedFingerprint: null, expectedVersion: null, changedFields: [] };
  }
  const existing = existingRows[0];
  const currentFingerprint = text(existing.fingerprint || existing.publicationFingerprint);
  if(currentFingerprint === desired.fingerprint){
    return { ...base, action: ACTIONS.UNCHANGED, reason: 'SCOPE_EVENT_STRICTLY_CONFORMING', eventId: existing.eventId || null, target: desired, expectedFingerprint: currentFingerprint, expectedVersion: existing.version || null, changedFields: [] };
  }
  const fields = changedFields(existing.desired || existing.target || {}, desired);
  if(operationalData(existing)){
    return {
      ...base,
      action: ACTIONS.BLOCKED,
      reason: 'HUMAN_REVIEW_OPERATIONAL_DATA_PRESENT',
      eventId: existing.eventId || null,
      target: desired,
      expectedFingerprint: currentFingerprint,
      expectedVersion: existing.version || null,
      changedFields: fields,
      humanReview: true
    };
  }
  return {
    ...base,
    action: ACTIONS.UPDATE,
    reason: 'SAME_IDENTITY_WITH_CHANGED_PUBLICATION_FIELDS',
    eventId: existing.eventId || null,
    target: desired,
    expectedFingerprint: currentFingerprint,
    expectedVersion: existing.version || null,
    changedFields: fields
  };
}

function summarize(decisions){
  return Object.fromEntries(ACTION_ORDER.map((action) => [action, decisions.filter((row) => row.action === action).length]));
}

function buildPublicationPlan(input = {}){
  const programme = Array.isArray(input.programme) ? input.programme : [];
  const targetSnapshot = Array.isArray(input.targetSnapshot) ? input.targetSnapshot : [];
  const referentials = input.referentials || {};
  const generatedAt = text(input.generatedAt) || '1970-01-01T00:00:00.000Z';
  const sourceCounts = new Map();
  for(const item of programme){
    const key = canonicalPublicationKey(item);
    if(key) sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1);
  }
  const targetsByKey = new Map();
  for(const row of targetSnapshot){
    const key = text(row.publicationKey);
    if(!key) continue;
    if(!targetsByKey.has(key)) targetsByKey.set(key, []);
    targetsByKey.get(key).push(row);
  }
  const decisions = programme.map((item) => {
    const key = canonicalPublicationKey(item);
    return decisionForItem(item, targetsByKey.get(key) || [], referentials, key && sourceCounts.get(key) > 1);
  });
  const sourceKeys = new Set(programme.map(canonicalPublicationKey).filter(Boolean));
  for(const existing of targetSnapshot){
    if(upper(existing.sourceType) !== 'QUO_VADIS' || Number(existing.sourceYear) !== Number(input.year) || sourceKeys.has(text(existing.publicationKey))) continue;
    const base = {
      caseId: null,
      source: existing.source || null,
      publicationKey: text(existing.publicationKey),
      eventId: existing.eventId || null,
      label: text(existing.desired && existing.desired.event && existing.desired.event.label),
      statComCode: existing.desired && existing.desired.activity && existing.desired.activity.statComCode || null,
      businessCode: existing.desired && existing.desired.activity && existing.desired.activity.businessCode || null,
      target: existing.desired || null
    };
    if(operationalData(existing)){
      decisions.push({ ...base, action: ACTIONS.BLOCKED, reason: 'HUMAN_REVIEW_REMOVED_SOURCE_WITH_OPERATIONAL_DATA', humanReview: true });
    }else{
      const target = stableValue(existing.desired || {});
      if(target.event) target.event.status = 'ANNULE';
      target.fingerprint = targetFingerprint(target);
      decisions.push({ ...base, action: ACTIONS.UPDATE, reason: 'SOURCE_REMOVED_CANCEL_SCOPE_EVENT', target, expectedFingerprint: text(existing.fingerprint || existing.publicationFingerprint), expectedVersion: existing.version || null, changedFields: ['event.status'] });
    }
  }
  const ordered = decisions.slice().sort((a, b) =>
    ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action)
    || text(a.publicationKey).localeCompare(text(b.publicationKey))
  );
  const planSeed = { engineVersion: ENGINE_VERSION, year: Number(input.year), generatedAt, decisions: ordered };
  const plan = {
    kind: 'PublicationPlan',
    engineVersion: ENGINE_VERSION,
    year: Number(input.year),
    generatedAt,
    planId: `C20-${sha256(stableStringify(planSeed)).slice(0, 20).toUpperCase()}`,
    dryRun: true,
    writable: false,
    summary: summarize(ordered),
    decisions: ordered
  };
  plan.planFingerprint = publicationPlanFingerprint(plan);
  return plan;
}

function publicationPlanFingerprint(plan){
  return sha256(stableStringify({
    kind: plan && plan.kind,
    engineVersion: plan && plan.engineVersion,
    year: plan && plan.year,
    generatedAt: plan && plan.generatedAt,
    planId: plan && plan.planId,
    dryRun: plan && plan.dryRun,
    writable: plan && plan.writable,
    summary: plan && plan.summary,
    decisions: plan && plan.decisions
  }));
}

function simulateAppliedPlan(plan, targetSnapshot = []){
  const byKey = new Map((targetSnapshot || []).map((row) => [text(row.publicationKey), stableValue(row)]));
  for(const decision of plan.decisions || []){
    if(![ACTIONS.CREATE, ACTIONS.UPDATE].includes(decision.action) || !decision.target) continue;
    const existing = byKey.get(decision.publicationKey);
    const eventId = existing && existing.eventId || `SIM-${sha256(decision.publicationKey).slice(0, 16).toUpperCase()}`;
    byKey.set(decision.publicationKey, {
      eventId,
      publicationKey: decision.publicationKey,
      publicationFingerprint: decision.target.fingerprint,
      fingerprint: decision.target.fingerprint,
      sourceType: 'QUO_VADIS',
      sourceYear: decision.target.sourceYear,
      source: decision.target.source,
      desired: stableValue(decision.target),
      operationalState: existing && existing.operationalState || {}
    });
  }
  return [...byKey.values()].sort((a, b) => a.publicationKey.localeCompare(b.publicationKey));
}

function buildExecutionBlueprint(plan){
  const operations = (plan.decisions || [])
    .filter((row) => [ACTIONS.CREATE, ACTIONS.UPDATE].includes(row.action))
    .map((row, index) => ({
      sequence: index + 1,
      action: row.action,
      publicationKey: row.publicationKey,
      expectedEventId: row.eventId || null,
      targetFingerprint: row.target && row.target.fingerprint,
      requireOptimisticLock: row.action === ACTIONS.UPDATE,
      transactionBoundary: `QV-PUBLISH-${plan.planId}`
    }));
  return {
    kind: 'ExecutionBlueprint',
    sourcePlanId: plan.planId,
    executable: false,
    transactionRequired: true,
    rollback: 'FULL_TRANSACTION_ROLLBACK',
    retry: 'REBUILD_PLAN_THEN_RETRY_BY_PUBLICATION_KEY',
    operations
  };
}

module.exports = {
  ENGINE_VERSION,
  ACTIONS,
  ACTION_ORDER,
  stableStringify,
  targetFingerprint,
  publicationPlanFingerprint,
  canonicalPublicationKey,
  temporalSnapshot,
  readiness,
  buildPublicationPlan,
  simulateAppliedPlan,
  buildExecutionBlueprint
};
