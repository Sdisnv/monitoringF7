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

module.exports = {
  PROGRAM_PATH,
  DRESS_PATH,
  TRUTH_PATH,
  canonicalDomain,
  normalizedTargets,
  oiCodes,
  localSchedule,
  buildCanonicalDataset
};
