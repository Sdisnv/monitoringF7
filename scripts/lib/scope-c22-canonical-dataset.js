'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const PROGRAM_PATH = path.join(ROOT, 'docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1_PROGRAM_2027.json');
const DRESS_PATH = path.join(ROOT, 'docs/SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1.json');
const TRUTH_PATH = path.join(ROOT, 'docs/SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.json');

function readJson(file){
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function upper(value){
  return String(value == null ? '' : value).trim().toUpperCase();
}

function unique(values){
  return [...new Set((values || []).map(upper).filter(Boolean))].sort();
}

function canonicalDomain(value){
  const key = upper(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if(key === 'INSTITUTIONNEL' || key === 'ETAT-MAJOR') return 'INSTITUTIONNEL';
  if(key === 'EXTERNE') return 'EXTERNAL';
  if(key === 'A ARBITRER') return 'INSTITUTIONNEL';
  return key;
}

function oiTargetCodes(target){
  const matches = upper(target).match(/(?:DPS-(?:G1|C1|B1|B2)|DAP-Y[1-4]|JSP-(?:G1|C1|B1))/g) || [];
  return unique(matches);
}

function normalizedTargets(row){
  const target = upper(row.target);
  const extracted = oiTargetCodes(target);
  if(extracted.length) return extracted;
  if(target === 'DPS-ALL') return ['DPS-B1', 'DPS-B2', 'DPS-C1', 'DPS-G1'];
  if(target === 'JSP-ALL') return ['JSP-B1', 'JSP-C1', 'JSP-G1'];
  if(target === 'FOBA'){
    const levels = unique(row.publics).map((code) => code.match(/^FOBA[: -](\d)$/)).filter(Boolean).map((match) => `FOBA-${match[1]}`);
    return levels.length ? levels : ['FOBA'];
  }
  return target && target !== 'EXTERNAL' ? [target] : [];
}

function oiCodes(row){
  return unique(normalizedTargets(row).map((code) => {
    const match = code.match(/^(?:DPS|JSP)-(G1|C1|B1|B2)$/) || code.match(/^DAP-(Y[1-4])$/);
    return match && match[1];
  }));
}

function localSchedule(row, canonicalSchedule){
  if(!row.isoDate) return null;
  if(canonicalSchedule) return { startsAt: canonicalSchedule.startsAt, endsAt: canonicalSchedule.endsAt };
  const startsAt = row.startDateTime || `${row.isoDate}T${row.start}`;
  let endsAt = row.endDateTime || `${row.isoDate}T${row.end}`;
  if(!row.endDateTime && endsAt <= startsAt){
    const next = new Date(`${row.isoDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    endsAt = `${next.toISOString().slice(0, 10)}T${row.end}`;
  }
  return { startsAt, endsAt };
}

function sessionIndex(row){
  const match = String(row.sessionId || row.programSessionId || '').match(/:S(?:ESSION:)?0*(\d+)$/i);
  return match ? Number(match[1]) : 1;
}

function voluntaryTransversalWithoutOi(row){
  return row.family === 'Formation'
    && !(row.oiSelections || []).length && !(row.ois || []).length
    && (row.publics || []).length > 0
    && (row.business && row.business.missing || []).includes('OI à qualifier');
}

function buildCanonicalDataset(){
  const source = readJson(PROGRAM_PATH);
  const dress = readJson(DRESS_PATH);
  const truth = readJson(TRUTH_PATH);
  const definitions = new Map((truth.sourceDefinitions || []).map((row) => [row.uid, row]));
  const conflictIds = new Set((dress.conflicts.sourceConflicts || []).flatMap((row) => [row.activityAId, row.activityBId]));
  const ctaSchedules = new Map((dress.cta2027.rows || []).map((row) => [row.friday, {
    startsAt: row.permanenceStart,
    endsAt: row.permanenceEnd
  }]));
  const programme = source.rows.map((row) => {
    const definition = definitions.get(row.definitionId) || {};
    const emseaChoice = row.status === 'A_POSITIONNER' && String(row.provenance).includes('MOA_CANONICAL_EMSEA');
    const explicitArbitration = row.status === 'MOA_ARBITRATION';
    const sourceConflict = conflictIds.has(row.id);
    const reviewReason = sourceConflict ? 'HUMAN_REVIEW_REQUIRED:SOURCE_CONFLICT'
      : emseaChoice ? 'HUMAN_REVIEW_REQUIRED:EMSEA_DATE_SELECTION'
      : explicitArbitration ? 'HUMAN_REVIEW_REQUIRED:MOA_ARBITRATION' : null;
    const count = Math.max(1, Number(row.sessionCount || definition.sessions || 1));
    const index = count > 1 ? sessionIndex(row) : 1;
    return {
      caseId: row.id,
      year: 2027,
      source: {
        definitionId: row.definitionId,
        occurrenceId: row.occurrenceId || '',
        sessionId: row.sessionId || row.programSessionId || '',
        publicationUnitId: row.id,
        sourceRecordIds: [row.id]
      },
      label: definition.label || row.label,
      eventLabel: row.label,
      status: row.status,
      externalHistorical: row.status === 'NON_RECONDUIT',
      referencesValidated: row.status === 'VALIDATED',
      humanReviewRequired: Boolean(reviewReason),
      humanReviewReason: reviewReason,
      business: {
        statComCode: row.statCom || null,
        businessCode: row.businessCode || row.code || null
      },
      schedule: localSchedule(row, String(row.id).startsWith('CTA-PERM-') ? ctaSchedules.get(row.isoDate) : null),
      classification: {
        primaryDomain: canonicalDomain(row.domain),
        domainCodes: [canonicalDomain(row.domain)],
        targetCodes: normalizedTargets(row),
        publicCodes: unique(row.publics),
        oiCodes: oiCodes(row),
        locationCode: row.location || null,
        roomCode: row.room || null,
        responsibleId: row.responsible || null
      },
      session: {
        groupId: row.occurrenceId || row.id,
        index,
        count,
        label: count > 1 ? `Session ${index}/${count}` : null
      },
      family: row.family || definition.family || null,
      eventType: definition.type || null,
      entryService: row.entryService || definition.entryService || null,
      roles: unique(row.roles),
      resources: unique(row.resources),
      priority: Number(row.priority || 0),
      fixedDate: Boolean(row.fixedDate),
      dayExclusive: Boolean(row.dayExclusive),
      permutationAllowed: Boolean(row.permutationAllowed),
      businessException: row.businessException || row.constraints && row.constraints.businessException || null,
      provenance: row.provenance,
      conflicts: sourceConflict ? [{ code: 'SOURCE_CONFLICT', blocking: true }] : []
    };
  });
  const referentials = {
    domains: unique(programme.flatMap((row) => row.classification.domainCodes).concat(['INSTITUTIONNEL'])),
    targets: unique(programme.flatMap((row) => row.classification.targetCodes)),
    publics: unique(programme.flatMap((row) => row.classification.publicCodes)),
    ois: unique(programme.flatMap((row) => row.classification.oiCodes)),
    locations: unique(programme.map((row) => row.classification.locationCode)),
    rooms: unique(programme.map((row) => row.classification.roomCode)),
    statComCodes: unique((truth.statCom.scope.rows || []).map((row) => row.code))
  };
  return {
    scope: source.scope,
    equation: source.equation,
    programme,
    referentials,
    canonical: {
      definitions: definitions.size,
      sourceConflicts: dress.conflicts.sourceConflicts,
      statComPdf: truth.statCom.pdf.extractedCount,
      statComExtensions: truth.statCom.extensions.length,
      statComOperational: truth.statCom.scope.count,
      cta: dress.cta2027,
      emsea: dress.emsea,
      calendar: dress.calendar,
      restrictions: dress.restrictions
    }
  };
}

async function buildCurrentCandidateDataset(){
  const { createFixture } = require('../scope-qv-local-fixture');
  const { buildExtraction } = require('../scope-qv-2027-no-go-final-extraction');
  const { _qvPersistenceDomain } = require('../../netlify/lib/_scope-quo-vadis-service');
  const references = readJson(path.join(ROOT, 'scripts/fixtures/scope-qv-business-references.json'));
  const locationById = new Map((references.lieux || []).map((row) => [row.lieu_id, row]));
  const roomById = new Map((references.salles || []).map((row) => [row.salle_id, row]));
  const roomByCode = new Map((references.salles || []).map((row) => [row.code, row]));
  const candidate = await createFixture(null).service.listProgramme(2027);
  const extraction = await buildExtraction();
  const localIds = new Set(extraction.reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE')
    .map((row) => row.Occurrence));
  const rows = candidate.canonicalProgramme.rows.filter((row) => !row.external);
  const programme = rows.map((row) => {
    const location = locationById.get(row.business && row.business.lieuId);
    const roomCandidate = roomById.get(row.business && row.business.salleTheorieId)
      || (/^R-[A-Z0-9-]+$/.test(row.room || '') ? roomByCode.get(row.room.slice(2)) : null)
      || (row.room === 'R-G1-EM' ? roomByCode.get('G1-ETAT-MAJOR') : null)
      || (row.room === 'Salle de théorie' && location
        ? roomByCode.get(`${location.site_code}-THEORIE`) : null);
    const room = roomCandidate && location && roomCandidate.lieu_id === location.lieu_id ? roomCandidate : null;
    const source = {
      definitionId: row.definitionId,
      occurrenceId: row.occurrenceId,
      sessionId: row.sessionId,
      publicationUnitId: row.id,
      sourceRecordIds: [row.id]
    };
    return {
      caseId: row.id,
      year: 2027,
      source,
      label: row.activityLabel || row.label,
      eventLabel: row.eventLabel || row.label,
      status: row.status,
      externalHistorical: false,
      referencesValidated: row.status === 'VALIDATED' && !(row.business && row.business.missing || [])
        .some((reason) => reason !== 'Public cible non démontré'
          && !(reason === 'OI à qualifier' && voluntaryTransversalWithoutOi(row))
          && !(row.statCom === 'EMSEA' && reason === 'Stat.Com absent du référentiel'))
        && (!row.location || Boolean(location)),
      humanReviewRequired: false,
      business: { statComCode: row.statCom === 'EMSEA' ? null : row.statCom || null, businessCode: row.code || null },
      schedule: { startsAt: row.startsAt, endsAt: row.endsAt },
      classification: {
        primaryDomain: _qvPersistenceDomain(row.persistenceDomain || row.domain),
        domainCodes: [_qvPersistenceDomain(row.persistenceDomain || row.domain)],
        targetCodes: unique((row.oiSelections || []).map((value) => value.replace(':', '-'))),
        publicCodes: unique(row.publics),
        oiCodes: unique((row.oiSelections || []).map((value) =>
          value.match(/^(?:DPS|DAP|JSP):(G1|C1|B1|B2|Y[1-4])$/)?.[1]).filter(Boolean)),
        locationCode: location ? `L-${location.site_code}` : null,
        roomCode: room ? `R-${room.code}` : null,
        responsibleId: row.responsible || null
      },
      session: { groupId: row.occurrenceId, index: Number(row.sessionIndex || 1),
        count: Number(row.sessionCount || 1), label: row.sessionLabel || null },
      family: row.family || null,
      eventType: null,
      entryService: null,
      roles: [],
      resources: [],
      priority: 0,
      fixedDate: false,
      dayExclusive: false,
      permutationAllowed: false,
      businessException: null,
      provenance: row.provenance,
      conflicts: [],
      localDecision: localIds.has(row.id),
      raw: { domain: row.domain, statCom:row.statCom || null, oiSelections: row.oiSelections || [], ois: row.ois || [],
        publics: row.publics || [], location: row.location || null, room: row.room || null,
        lieuId: row.business && row.business.lieuId || null,
        salleTheorieId: row.business && row.business.salleTheorieId || null,
        conduiteEvidence: row.conduiteEvidence || null }
    };
  });
  return {
    scope: 'QUO_VADIS_2027_CURRENT_CANDIDATE',
    programme,
    referentials: {
      domains: unique(programme.flatMap((row) => row.classification.domainCodes)),
      targets: unique(programme.flatMap((row) => row.classification.targetCodes)),
      publics: unique(programme.flatMap((row) => row.classification.publicCodes)),
      ois: unique(programme.flatMap((row) => row.classification.oiCodes)),
      locations: unique(programme.map((row) => row.classification.locationCode)),
      rooms: unique(programme.map((row) => row.classification.roomCode)),
      statComCodes: unique((references.statcoms || []).map((row) => row.code))
    },
    candidateRows: rows,
    localIds,
    extractionCounts: extraction.counts,
    workbookSha256: extraction.workbookSha256
  };
}

function preserveUnspecifiedPublicationFields(programme, snapshot){
  const { canonicalPublicationKey } = require('../../netlify/lib/_scope-qv-publication-plan');
  const { qvResponsableCanonique } = require('../../assets/js/scope-ui-logic');
  const byKey = new Map((snapshot || []).map((row) => [row.publicationKey,row]));
  return programme.map((item) => {
    const previous = byKey.get(canonicalPublicationKey(item));
    const target = previous && previous.desired;
    if(!target || item.status !== 'VALIDATED') return item;
    const event = target.event || {};
    const relations = target.relations || {};
    const isCta = item.source.definitionId === 'CTA-PERMANENCE';
    const next = { ...item,classification:{ ...item.classification },session:{ ...item.session } };
    if(!next.eventType) next.eventType = event.eventType || null;
    if(!next.entryService) next.entryService = event.entryService || null;
    if(!next.family) next.family = event.family || null;
    if(!next.priority) next.priority = event.priority;
    if(!next.businessException) next.businessException = event.businessException || null;
    if(next.fixedDate !== true) next.fixedDate = event.fixedDate === true;
    if(next.dayExclusive !== true) next.dayExclusive = event.dayExclusive === true;
    if(next.permutationAllowed !== true) next.permutationAllowed = event.permutationAllowed === true;
    if(next.session.count === 1 && next.session.label === 'Aucune session distincte')
      next.session.label = target.session && target.session.label || null;
    if(!next.classification.locationCode) next.classification.locationCode = event.locationCode || null;
    if(!next.classification.roomCode) next.classification.roomCode = event.roomCode || null;
    if(!next.classification.responsibleId) next.classification.responsibleId = event.responsibleId || null;
    if(!next.classification.publicCodes.length) next.classification.publicCodes = relations.publicCodes || [];
    const oldTargets = relations.targetCodes || [];
    const newTargets = next.classification.targetCodes;
    if((!newTargets.length && oldTargets.length)
      || (newTargets.length === 1 && newTargets[0] === 'SDIS' && oldTargets.some((code) => code.startsWith('SDIS-')))
      || (newTargets.length && newTargets.every((code) => oldTargets.includes(code)) && oldTargets.length > newTargets.length)){
      next.classification.targetCodes = oldTargets;
    }
    const responsibleDomain = next.raw && next.raw.domain;
    if(event.responsibleId && next.classification.responsibleId
      && qvResponsableCanonique(event.responsibleId,{ domain:responsibleDomain })
        === qvResponsableCanonique(next.classification.responsibleId,{ domain:responsibleDomain })){
      next.classification.responsibleId = event.responsibleId;
    }
    if(!next.roles.length) next.roles = relations.roleCodes || [];
    if(!next.resources.length) next.resources = relations.resourceCodes || [];
    if(isCta){
      next.label = target.activity && target.activity.label || next.label;
      next.eventLabel = event.label || next.eventLabel;
      next.classification.locationCode = event.locationCode || null;
      next.classification.responsibleId = event.responsibleId || null;
      next.classification.targetCodes = relations.targetCodes || [];
      next.classification.oiCodes = relations.oiCodes || [];
    }
    return next;
  });
}

module.exports = {
  PROGRAM_PATH,
  DRESS_PATH,
  TRUTH_PATH,
  canonicalDomain,
  normalizedTargets,
  oiCodes,
  localSchedule,
  buildCanonicalDataset,
  buildCurrentCandidateDataset,
  preserveUnspecifiedPublicationFields,
  voluntaryTransversalWithoutOi
};
