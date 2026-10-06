'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');

const DRIVE_IDS = ['B1', 'B2', 'C1'].map((site) =>
  `QV27:CONDUITE:${site}:N02a:2027-09-18:1030`);

async function buildStaticControl(){
  const dataset = await buildCurrentCandidateDataset();
  const candidate = dataset.candidateRows;
  const programme = dataset.programme;
  const byId = new Map(candidate.map((row) => [row.id, row]));
  const inputIds = candidate.map((row) => row.id);
  const transformedIds = programme.map((row) => row.caseId);
  const inputSet = new Set(inputIds);
  const transformedSet = new Set(transformedIds);
  const keys = programme.map(planner.canonicalPublicationKey);
  const nonNullKeys = keys.filter(Boolean);
  const localRows = programme.filter((row) => row.localDecision);
  const localDrives = localRows.filter((row) => DRIVE_IDS.includes(row.caseId));
  const localInstructions = localRows.filter((row) => !DRIVE_IDS.includes(row.caseId));
  const plan = planner.buildPublicationPlan({ year: 2027, programme, targetSnapshot: [],
    referentials: dataset.referentials });
  const decisions = new Map(plan.decisions.map((row) => [row.caseId, row]));
  const records = programme.map((row) => {
    const original = byId.get(row.caseId);
    const decision = decisions.get(row.caseId);
    const warnings = [];
    if(row.raw.location && !row.classification.locationCode) warnings.push('LOCATION_NOT_MAPPED_IN_LOCAL_REFERENTIAL');
    if(row.raw.room && !row.classification.roomCode) warnings.push('ROOM_NOT_MAPPED_IN_LOCAL_REFERENTIAL');
    if(!row.business.statComCode) warnings.push('STATCOM_NOT_DOCUMENTED');
    if(row.business.statComCode && !row.business.businessCode) warnings.push('BUSINESS_CODE_NOT_DOCUMENTED');
    return {
      id: row.caseId,
      model: row.source.definitionId,
      label: row.label,
      domain: row.raw.domain,
      sqlDomain: row.classification.primaryDomain,
      family: row.family,
      statCom: row.business.statComCode,
      businessCode: row.business.businessCode,
      startsAt: row.schedule.startsAt,
      endsAt: row.schedule.endsAt,
      oiSelections: row.raw.oiSelections,
      oiCodes: row.classification.oiCodes,
      publicCodes: row.classification.publicCodes,
      targetCodes: row.classification.targetCodes,
      location: row.raw.location,
      locationCode: row.classification.locationCode,
      room: row.raw.room,
      roomCode: row.classification.roomCode,
      type: original && original.family || null,
      status: row.status,
      localDecision: row.localDecision,
      linkedInstructionId: row.raw.conduiteEvidence && row.raw.conduiteEvidence.sourceId || null,
      sqlPublicationKey: planner.canonicalPublicationKey(row),
      theoreticalEmptyTargetAction: decision.action,
      theoreticalReason: decision.reason,
      mappingWarnings: warnings
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const missing = inputIds.filter((id) => !transformedSet.has(id));
  const extra = transformedIds.filter((id) => !inputSet.has(id));
  const duplicateIds = inputIds.length - inputSet.size;
  const duplicateKeys = nonNullKeys.length - new Set(nonNullKeys).size;
  const invalidDrives = localDrives.filter((row) => {
    const source = byId.get(row.raw.conduiteEvidence && row.raw.conduiteEvidence.sourceId);
    return !source || !/FEU/.test(source.label) || source.endsAt !== row.schedule.startsAt;
  });
  const metrics = {
    inbound: candidate.length,
    transformed: programme.length,
    classified: records.length,
    duplicateIds,
    lostIds: missing.length,
    extraIds: extra.length,
    nullPublicationKeys: keys.length - nonNullKeys.length,
    duplicatePublicationKeys: duplicateKeys,
    tourDeFrance: records.filter((row) => /TOUR-DE-FRANCE-FEMMES/.test(row.id)).length,
    localDecisions: localRows.length,
    localInstructions: localInstructions.length,
    localDrives: localDrives.length,
    invalidDriveLinks: invalidDrives.length,
    undated: records.filter((row) => !row.startsAt || !row.endsAt).length,
    transformationErrors: records.filter((row) => !row.id || !row.model || !row.domain
      || !row.sqlPublicationKey || !decisions.has(row.id)).length,
    unresolvedLocation: records.filter((row) => row.mappingWarnings.includes('LOCATION_NOT_MAPPED_IN_LOCAL_REFERENTIAL')).length,
    unresolvedRoom: records.filter((row) => row.mappingWarnings.includes('ROOM_NOT_MAPPED_IN_LOCAL_REFERENTIAL')).length,
    theoreticalEmptyTargetActions: plan.summary,
    conduitesDps: dataset.extractionCounts.conduitesDps,
    conduitesDap: dataset.extractionCounts.conduitesDap,
    blockingCalendarReview: dataset.extractionCounts.blockingHumanReview
  };
  assert.deepEqual({ inbound:metrics.inbound, transformed:metrics.transformed, classified:metrics.classified,
    duplicateIds, lostIds:metrics.lostIds, extraIds:metrics.extraIds,
    nullPublicationKeys:metrics.nullPublicationKeys, duplicatePublicationKeys:duplicateKeys,
    tourDeFrance:metrics.tourDeFrance, localDecisions:metrics.localDecisions,
    localInstructions:metrics.localInstructions, localDrives:metrics.localDrives,
    invalidDriveLinks:metrics.invalidDriveLinks, undated:metrics.undated,
    transformationErrors:metrics.transformationErrors, blockingCalendarReview:metrics.blockingCalendarReview },
  { inbound:850, transformed:850, classified:850, duplicateIds:0, lostIds:0, extraIds:0,
    nullPublicationKeys:0, duplicatePublicationKeys:0, tourDeFrance:0, localDecisions:15,
    localInstructions:12, localDrives:3, invalidDriveLinks:0, undated:0,
    transformationErrors:0, blockingCalendarReview:0 });
  assert(DRIVE_IDS.every((id) => localDrives.some((row) => row.caseId === id)));
  return {
    kind: 'QV_2027_SQL_STATIC_CONTROL',
    source: {
      candidate: 'createFixture(null).service.listProgramme(2027).canonicalProgramme.rows (!external)',
      service: 'netlify/lib/_scope-quo-vadis-service.js',
      sourceProgramme: 'netlify/lib/data/scope-qv-programme-2027.json',
      historicalReference: 'netlify/lib/data/scope-qv-history-2026.json',
      calendarArbitrages: 'netlify/lib/data/scope-qv-2027-calendar-arbitrages.json',
      localDecisionClassifier: 'scripts/scope-qv-2027-no-go-final-extraction.js',
      workbookSha256: dataset.workbookSha256,
      candidateIdsSha256: createHash('sha256').update(JSON.stringify(inputIds.slice().sort())).digest('hex')
    },
    semantics: 'C23 event-publication plan against an artificial empty snapshot; not a PostgreSQL diff or authorization to publish.',
    metrics,
    missing,
    extra,
    localDecisionIds: localRows.map((row) => row.caseId).sort(),
    records
  };
}

if(require.main === module) buildStaticControl().then((report) => {
  const dir = path.resolve(__dirname, '../outputs/qv-2027-sql-materialisation-repair-1');
  fs.mkdirSync(dir, { recursive:true });
  fs.writeFileSync(path.join(dir, 'static-control.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.metrics, null, 2));
}).catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

module.exports = { buildStaticControl, DRIVE_IDS };
