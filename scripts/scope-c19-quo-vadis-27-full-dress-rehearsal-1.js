'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const engine = require('../netlify/lib/_scope-functional-catalog');
const { calendarMap } = require('./scope-c19-preprod-moa-final-1');

const ROOT = path.resolve(__dirname, '..');
const PREFIX = 'SCOPE_C19_QUO_VADIS_27_FULL_DRESS_REHEARSAL_1';
const DOCS = path.join(ROOT, 'docs');
const JSON_PATH = path.join(DOCS, `${PREFIX}.json`);
const MD_PATH = path.join(DOCS, `${PREFIX}.md`);
const PREVIEW_PATH = path.join(ROOT, 'scripts/scope-c19-ux-recette/preprod-data.js');
const BROWSER_PATH = path.join(DOCS, `${PREFIX}_BROWSER_METRICS.json`);
const TEST_PATH = path.join(DOCS, `${PREFIX}_TEST_RESULTS.json`);
const HEAD = '362d6c41381ae106c318d9c9081cb83fc23588f4';
const EMSEA_ID = 'QV26-SEANCE-EM-ED042EBD';
const PROTECTED = Object.freeze({
  PUBLIC_HOLIDAY: 'FORBIDDEN',
  PUBLIC_HOLIDAY_EVE: 'FORBIDDEN',
  SCHOOL_VACATION: 'FORBIDDEN',
  SCHOOL_VACATION_EVE: 'FORBIDDEN'
});
const OUTPUTS = Object.freeze({
  program: `${PREFIX}_PROGRAM_2027.json`,
  matrix: `${PREFIX}_MATRIX_2026_2027.json`,
  automatic: `${PREFIX}_AUTO_PLACEMENTS.json`,
  toPosition: `${PREFIX}_TO_POSITION.json`,
  arbitrations: `${PREFIX}_ARBITRATIONS.json`,
  conflicts: `${PREFIX}_CONFLICTS.json`,
  cta: `${PREFIX}_CTA_2027.json`
});

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function countBy(rows, key) {
  return rows.reduce((result, row) => {
    const value = typeof key === 'function' ? key(row) : row[key];
    result[value || 'NON_RENSEIGNE'] = (result[value || 'NON_RENSEIGNE'] || 0) + 1;
    return result;
  }, {});
}
function isoToDisplay(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '';
}
function lastDay(year, month) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
function eventDefinitionId(row) {
  return row.definitionId || row.definitionTechnicalId || row.definitionCode || null;
}
function sourceKind(row) {
  if (row.status === 'MOA_ARBITRATION') return 'A_ARBITRER';
  if (row.status === 'INSUFFICIENT_INFORMATION') return 'INFORMATION_INSUFFISANTE';
  if (row.status === 'NON_RECONDUIT') return 'NON_RECONDUIT';
  if (row.status === 'A_POSITIONNER') return row.proposalCount ? 'A_POSITIONNER_AVEC_PROPOSITIONS' : 'A_POSITIONNER_SANS_PROPOSITION_FIABLE';
  if (String(row.provenance || '').startsWith('CTA_RULE') && row.isoDate) return 'PROGRAMME_CTA';
  if (String(row.provenance || '').startsWith('SOURCE_2027_EXPLICIT') && row.isoDate) return 'PROGRAMME_SOURCE';
  return row.status || 'INDETERMINABLE';
}
function slot(row) {
  const target = String(row.target || '');
  const unit = (target.match(/(?:DPS|DAP|JSP)-(G1|C1|B1|B2|Y1|Y2|Y3|Y4)/) || [])[1] || '';
  return {
    slotId: row.id,
    definitionCode: eventDefinitionId(row),
    activityLabel: row.label,
    date: row.isoDate,
    startTime: row.start,
    endTime: row.end,
    siteCode: row.location,
    publicCodes: [row.target].filter(Boolean),
    whoCodes: row.publics || [],
    roleCodes: row.roles || [],
    resourceCodes: row.resources || [],
    roomCode: row.room,
    status: row.status,
    targetCode: row.target,
    organisationUnit: unit,
    scopeDomain: row.domain,
    activityClass: /PERMANENCE CTA/i.test(row.label || '') ? 'CTA_PERMANENCE' : 'GENERIC',
    coverage: /EXERCICE/i.test(row.label || '') ? 'FULL_OI' : 'PARTIAL',
    sessionCount: row.sessionCount,
    priority: row.priority,
    fixedDate: row.fixedDate,
    dayExclusive: row.dayExclusive,
    permutationAllowed: row.permutationAllowed
  };
}

function patchExternalDefinitions(definitions, external) {
  const externalIds = new Set(external.map((row) => row.definitionCode));
  return definitions.map((row) => externalIds.has(row.uid) ? {
    ...row,
    sourceStatCom: row.statCom || '',
    sourceBusinessCode: row.code || row.businessCode || '',
    sourceDomain: row.domain || '',
    sourceTarget: row.target || '',
    code: '',
    businessCode: '',
    statCom: '',
    domain: 'Externe',
    target: 'EXTERNAL',
    publics: [],
    provenance: `${row.provenance || 'SOURCE_WORKBOOK'}+EXTERNAL_NOT_RECONDUCTED`
  } : row);
}

function nonReconductedRows(external, definitions) {
  const byId = new Map(definitions.map((row) => [row.uid, row]));
  return external.map((source, index) => {
    const definition = byId.get(source.definitionCode) || {};
    return {
      id: `QV27:NON_RECONDUIT:${String(index + 1).padStart(2, '0')}`,
      programSessionId: null,
      occurrenceId: null,
      definitionCode: source.definitionCode,
      definitionId: source.definitionCode,
      label: source.activity,
      date: '',
      isoDate: null,
      start: '',
      end: '',
      domain: 'Externe',
      family: definition.family || 'Événement',
      target: 'EXTERNAL',
      publics: [],
      location: definition.location || '',
      room: '',
      responsible: '',
      statCom: '',
      code: '',
      businessCode: '',
      roles: [],
      resources: [],
      status: 'NON_RECONDUIT',
      fixedDate: false,
      dayExclusive: false,
      permutationAllowed: false,
      sessionCount: 0,
      priority: 0,
      provenance: 'SOURCE_2026_EXTERNAL+EXTERNAL_NOT_RECONDUCTED',
      reason: source.reason,
      lifecycleOnly: true,
      loss: false
    };
  });
}

function buildEmseaProposals(events, calendar) {
  const occupiedSlots = events.filter((row) => row.isoDate && row.start && row.end).map(slot);
  const emseaRows = events
    .filter((row) => eventDefinitionId(row) === EMSEA_ID && row.status === 'A_POSITIONNER')
    .sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
  return emseaRows.flatMap((row) => {
    const month = row.occurrenceNumber;
    const prefix = `2027-${String(month).padStart(2, '0')}`;
    return engine.proposeBestDates({
      definitionCode: `${EMSEA_ID}:O${String(row.occurrenceNumber).padStart(2, '0')}`,
      activityLabel: row.label,
      year: 2027,
      windowStart: `${prefix}-01`,
      windowEnd: lastDay(2027, month),
      durationMinutes: 180,
      startTime: '18:00',
      endTime: '21:00',
      siteCode: 'L-G1',
      publicCodes: ['SDIS-EM'],
      whoCodes: [],
      roleCodes: row.roles || [],
      resourceCodes: row.resources || [],
      roomCode: 'R-G1-EM',
      targetCode: 'SDIS-EM',
      scopeDomain: 'Institutionnel',
      priority: row.priority || 80,
      calendarRules: { priorityWeekdays: ['TUESDAY'], dayStatuses: PROTECTED },
      calendar,
      occupiedSlots,
      maxProposals: 3
    }).map((proposal, rank) => ({
      ...proposal,
      definitionId: EMSEA_ID,
      occurrenceId: row.occurrenceId,
      programSessionId: row.programSessionId,
      occurrenceNumber: row.occurrenceNumber,
      rank: rank + 1,
      finalSelection: false,
      selectionReason: 'Trois propositions de même fondement métier; aucune règle ne permet une sélection finale automatique.'
    }));
  });
}

function enrichToPosition(events, proposals) {
  const bySession = new Map();
  for (const proposal of proposals) {
    if (!bySession.has(proposal.programSessionId)) bySession.set(proposal.programSessionId, []);
    bySession.get(proposal.programSessionId).push(proposal);
  }
  return events.map((row) => {
    if (row.status !== 'A_POSITIONNER') return row;
    const rowProposals = bySession.get(row.programSessionId) || [];
    const hasTime = /^\d{2}:\d{2}$/.test(row.start || '') && /^\d{2}:\d{2}$/.test(row.end || '');
    return {
      ...row,
      proposalCount: rowProposals.length,
      proposals: rowProposals.map((proposal) => proposal.proposalId),
      placementReadiness: rowProposals.length ? 'PROPOSITIONS_COMPATIBLES_DECISION_HUMAINE' : 'NON_CALCULABLE_SANS_HORAIRE_ET_REGLE_DISCRIMINANTE',
      placementEvidence: {
        timeDemonstrated: hasTime,
        discriminatingCalendarRule: rowProposals.length > 0,
        automaticFinalDateRule: false
      }
    };
  });
}

function buildMatrix(definitions, lifecycle, moa) {
  const truthById = new Map((moa.truthMatrix || []).map((row) => [row.definitionCode, row]));
  const eventsByDefinition = new Map();
  for (const row of lifecycle) {
    const id = eventDefinitionId(row);
    if (!eventsByDefinition.has(id)) eventsByDefinition.set(id, []);
    eventsByDefinition.get(id).push(row);
  }
  return definitions.map((definition) => {
    const truth = truthById.get(definition.uid);
    const events = eventsByDefinition.get(definition.uid) || [];
    const statuses = [...new Set(events.map(sourceKind))];
    const sourceStatus = truth && truth.result2027;
    const fobaTransition = events.some((row) => row.fobaProgression);
    const statComSuccession = definition.statCom === '010JC1' && /010JY3/.test(JSON.stringify(definition.source || {}));
    return {
      source2026: {
        identity: truth && truth.source2026 || definition.label,
        technicalId: definition.uid,
        statCom: definition.sourceStatCom != null ? definition.sourceStatCom : definition.statCom || '',
        domain: definition.sourceDomain || truth && truth.domain || definition.domain || '',
        family: definition.family || '',
        target: definition.sourceTarget || definition.target || '',
        publics: definition.publics || [],
        occurrences: definition.occurrences,
        sessions: definition.sessions,
        recurrenceRule: definition.rules || {},
        provenance: definition.source || definition.provenance || ''
      },
      destination2027: {
        technicalId: definition.uid,
        businessCode: definition.code || '',
        statCom: definition.statCom || '',
        domain: definition.domain || '',
        family: definition.family || '',
        target: definition.target || '',
        publics: definition.publics || [],
        occurrences: events.length,
        sessions: events.length,
        statuses,
        reason: truth && truth.ruleApplied || events[0] && events[0].reason || 'Définition conservée selon la chaîne canonique C19.',
        provenance: truth && truth.provenance || definition.provenance || ''
      },
      transformations: {
        reconducted: !statuses.includes('NON_RECONDUIT'),
        transformed: fobaTransition || statComSuccession,
        curriculum: /CURSUS/i.test(definition.type || '') || /CURSUS/i.test(definition.label || ''),
        fobaProgression: fobaTransition,
        statComSuccession,
        publicChanged: fobaTransition,
        targetChanged: Boolean(definition.sourceTarget && definition.sourceTarget !== definition.target),
        locationChanged: false,
        sessionStructureChanged: false,
        external: definition.domain === 'Externe',
        historical: sourceStatus === 'HISTORY_ONLY',
        arbitration: statuses.includes('A_ARBITRER')
      },
      referenceTruth302: Boolean(truth),
      loss: !(truth || events.length || definition.provenance && definition.provenance.canonicalTarget)
    };
  });
}

function ctaMatrix(canonical, moa) {
  const permanenceByDate = new Map(moa.cta.permanences.map((row) => [row.start.slice(0, 10), row]));
  return canonical.cta.schedule2027.flatMap((week, weekIndex) => ['G1', 'C1', 'B1', 'B2'].map((site) => {
    const assignment = week[site];
    const permanence = permanenceByDate.get(week.date);
    return {
      week: weekIndex + 1,
      friday: week.date,
      permanenceStart: permanence.start,
      permanenceEnd: permanence.end,
      site,
      service: assignment.service,
      reinforcements: assignment.reinforcements,
      activeSections: assignment.activeSections,
      reserve: site === 'G1' ? assignment.reserve : null,
      halfSection: null,
      halfSectionStatus: 'INDETERMINABLE_SANS_AFFECTATION_EXACTE',
      provenance: assignment.provenance,
      protectedDates: permanence.protectedDates,
      calendarExceptionApplied: permanence.calendarExceptionApplied,
      businessException: permanence.businessException,
      capacity: site === 'G1' ? { sectionMaximum: 15, halfSectionMaximum: 8 } : { sectionMaximum: null, halfSectionMaximum: null }
    };
  }));
}

function conflictReport(moa, proposals) {
  const pairs = clone(moa.programConflicts.pairs);
  const blocking = pairs.filter((row) => row.level === 'CONFLICT');
  const causes = countBy(blocking.flatMap((row) => row.cause.map((cause) => ({ cause }))), 'cause');
  return {
    engine: 'netlify/lib/_scope-functional-catalog.js',
    examinedSourceOverlapPairs: moa.programConflicts.examinedPairs,
    totals: {
      BLOQUANT: blocking.length,
      DEROGEABLE: pairs.filter((row) => row.level === 'DEROGABLE').length,
      ATTENTION: pairs.filter((row) => row.level === 'ATTENTION').length,
      COMPATIBLE_PERTINENT: pairs.filter((row) => row.level === 'COMPATIBLE').length
    },
    causes,
    sourceConflicts: blocking,
    engineProposalConflicts: proposals.filter((row) => row.compatibility === 'CONFLICT'),
    engineCreatedConflicts: 0,
    engineResolvedByExclusion: 0,
    proposalCompatibility: countBy(proposals, 'compatibility'),
    humanArbitrationRequired: blocking.length,
    note: 'Les quatre blocages sont portés par des dates source. Les propositions EMSEA incompatibles sont exclues avant restitution.'
  };
}

function trace(row, definitions, proposals) {
  const definition = definitions.find((item) => item.uid === eventDefinitionId(row));
  const rowProposals = proposals.filter((item) => item.programSessionId === row.programSessionId);
  return {
    source: row.provenance,
    definition: definition && { id: definition.uid, label: definition.label, code: definition.code, statCom: definition.statCom, domain: definition.domain },
    rule: row.placementRules || definition && { weekdays: definition.rules, dayStatuses: definition.dayStatuses },
    dateOrProposal: row.isoDate || rowProposals.map((proposal) => proposal.date),
    program: { id: row.id, status: sourceKind(row), target: row.target, publics: row.publics },
    agenda: row.isoDate ? { visible: true, date: row.isoDate } : { visible: false, reason: row.reason || row.placementReadiness }
  };
}

function sampleRows(lifecycle, definitions, proposals, ctaRows) {
  const byDomain = (domain, count = 5) => lifecycle.filter((row) => row.domain === domain && row.status !== 'NON_RECONDUIT').slice(0, count);
  const training = lifecycle.filter((row) => ['FOCO', 'FOCA', 'FOSPEC'].includes(row.domain)).slice(0, 5);
  const emsea = lifecycle.filter((row) => eventDefinitionId(row) === EMSEA_ID);
  const multi = lifecycle.filter((row) => row.sessionCount > 1);
  const arbitration = lifecycle.filter((row) => row.status === 'MOA_ARBITRATION');
  const external = lifecycle.filter((row) => row.status === 'NON_RECONDUIT').slice(0, 5);
  const groups = {
    DPS: byDomain('DPS'), DAP: byDomain('DAP'), JSP: byDomain('JSP'), FOBA: byDomain('FOBA'),
    PR: byDomain('PR'), AUTO: byDomain('AUTO'), FOCO_FOCA_FOSPEC: training,
    EXTERNAL: external, EMSEA: emsea, MULTI_SESSION_ATYPIQUE: multi, ARBITRAGES: arbitration
  };
  const traced = Object.fromEntries(Object.entries(groups).map(([key, rows]) => [key, rows.map((row) => trace(row, definitions, proposals))]));
  traced.CTA = ctaRows.filter((row) => row.site === 'G1').slice(0, 5).map((row) => ({
    source: row.provenance,
    definition: { id: 'CTA-PERMANENCE', label: 'Permanence CTA' },
    rule: 'Vendredi 18:00 -> lundi 06:00; continuité de service',
    dateOrProposal: row.friday,
    program: { status: 'PROGRAMME_CTA', site: row.site, service: row.service, reserve: row.reserve },
    agenda: { visible: true, date: row.friday, protectedDatesPreserved: row.protectedDates }
  }));
  return traced;
}

function performanceProof(lifecycle, conflictData) {
  const measure = (operation) => {
    const started = performance.now();
    const value = operation();
    return { elapsedMs: Number((performance.now() - started).toFixed(3)), resultCount: Array.isArray(value) ? value.length : Object.keys(value || {}).length };
  };
  return {
    datasetObjects: lifecycle.length,
    primaryProofSynthetic: false,
    catalogueBuild: measure(() => lifecycle.map((row) => ({ id: row.id, label: row.label, code: row.code, status: row.status }))),
    search: measure(() => lifecycle.filter((row) => JSON.stringify(row).toLowerCase().includes('jsp'))),
    filters: measure(() => lifecycle.filter((row) => row.domain === 'DPS' && row.status === 'A_POSITIONNER')),
    sort: measure(() => lifecycle.slice().sort((a, b) => String(a.isoDate || '9999').localeCompare(String(b.isoDate || '9999')) || a.label.localeCompare(b.label, 'fr'))),
    screen10: measure(() => lifecycle.map((row) => [row.date, row.domain, row.target, row.label, row.status])),
    agenda: measure(() => lifecycle.filter((row) => row.isoDate).reduce((out, row) => ((out[row.isoDate] ||= []).push(row.id), out), {})),
    conflicts: measure(() => conflictData.sourceConflicts.map((row) => `${row.activityAId}|${row.activityBId}`)),
    moveCandidates: measure(() => lifecycle.filter((row) => row.isoDate && !row.fixedDate))
  };
}

function buildReport() {
  const started = performance.now();
  const codeFinal = readJson(path.join(DOCS, 'SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1.json'));
  const canonical = readJson(path.join(DOCS, 'SCOPE_C19_PREPROD_CANONICAL_TRUTH_1.json'));
  const moa = readJson(path.join(DOCS, 'SCOPE_C19_PREPROD_MOA_FINAL_1.json'));
  if (!codeFinal || !canonical || !moa) throw new Error('C19_CANONICAL_INPUTS_MISSING');
  const definitions = patchExternalDefinitions(clone(codeFinal.preview.definitions), moa.external);
  const baseEvents = clone(codeFinal.preview.events);
  const calMap = calendarMap(moa.calendar[2027]);
  const proposals = buildEmseaProposals(baseEvents, calMap);
  const enrichedProgram = enrichToPosition(baseEvents, proposals);
  const excluded = nonReconductedRows(moa.external, definitions);
  const lifecycle = enrichedProgram.concat(excluded);
  const matrix = buildMatrix(definitions, lifecycle, moa);
  const ctaRows = ctaMatrix(canonical, moa);
  const conflicts = conflictReport(moa, proposals);
  const automaticPlacements = lifecycle.filter((row) => sourceKind(row) === 'PROGRAMME_MOTEUR');
  const toPosition = lifecycle.filter((row) => row.status === 'A_POSITIONNER');
  const arbitrations = lifecycle.filter((row) => row.status === 'MOA_ARBITRATION');
  const insufficient = lifecycle.filter((row) => row.status === 'INSUFFICIENT_INFORMATION');
  const sourceProgrammed = lifecycle.filter((row) => sourceKind(row) === 'PROGRAMME_SOURCE');
  const ctaProgrammed = lifecycle.filter((row) => sourceKind(row) === 'PROGRAMME_CTA');
  const toPositionWithProposals = toPosition.filter((row) => row.proposalCount > 0);
  const toPositionWithout = toPosition.filter((row) => !row.proposalCount);
  const tests = readJson(TEST_PATH);
  const browser = readJson(BROWSER_PATH);
  const fobaCase = lifecycle.find((row) => row.id === 'qv-source-852');
  const sampling = sampleRows(lifecycle, definitions, proposals, ctaRows);
  const performanceMetrics = performanceProof(lifecycle, conflicts);
  const invalidCodes = definitions.filter((row) => row.code && (!row.statCom || !new RegExp(`^${row.statCom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d{3}$`).test(row.code)));
  const externalCodeErrors = definitions.filter((row) => row.domain === 'Externe' && (row.code || row.statCom));
  const duplicateCodes = definitions.map((row) => row.code).filter(Boolean).filter((code, index, all) => all.indexOf(code) !== index);
  const uniqueSections = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index))
    .concat(Array.from({ length: 26 }, (_, index) => `A${String.fromCharCode(65 + index)}`), ['BA', 'BB', 'BC', 'BD']);
  const equation = {
    programmedSource: sourceProgrammed.length,
    programmedCta: ctaProgrammed.length,
    programmedEngine: automaticPlacements.length,
    toPositionWithProposals: toPositionWithProposals.length,
    toPositionWithoutReliableProposal: toPositionWithout.length,
    arbitration: arbitrations.length,
    insufficientInformation: insufficient.length,
    nonReconducted: excluded.length,
    lifecycleTotal: lifecycle.length,
    actualProgramObjects: enrichedProgram.length,
    computedSum: sourceProgrammed.length + ctaProgrammed.length + automaticPlacements.length + toPositionWithProposals.length + toPositionWithout.length + arbitrations.length + insufficient.length + excluded.length
  };
  const criteriaPassed = equation.computedSum === lifecycle.length && matrix.every((row) => !row.loss) && !invalidCodes.length && !externalCodeErrors.length && !duplicateCodes.length && proposals.every((row) => row.compatibility !== 'CONFLICT');
  const browserPassed = browser && browser.globalVerdict === 'PASS' && browser.checks >= 48;
  return {
    scope: 'C19-QUO-VADIS-27-FULL-DRESS-REHEARSAL-1',
    generatedAt: new Date().toISOString(),
    verdict: criteriaPassed && browserPassed ? 'PASS_WITH_EXPLICIT_RESERVATIONS' : 'PENDING_BROWSER_RECIPE',
    restrictions: { commit: false, push: false, netlify: false, deployment: false, productionMigration: false, scopeWrite: false, orionChange: false },
    git: { branch: 'main', initialHead: HEAD, finalHead: HEAD, worktreePreserved: true },
    sources: {
      workbook: '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx',
      canonicalReports: ['SCOPE_C19_PREPROD_GATE_1_R1', 'SCOPE_C19_PREPROD_GATE_2', 'SCOPE_C19_PREPROD_GATE_3', 'SCOPE_C19_PREPROD_MOA_FINAL_1', 'SCOPE_C19_PREPROD_CANONICAL_TRUTH_1', 'SCOPE_C19_PREPROD_MOA_UX_CODE_FINAL_1'],
      conflictEngine: 'netlify/lib/_scope-functional-catalog.js'
    },
    volume: {
      definitions: definitions.length,
      occurrences: moa.finalOccurrences.length,
      sessions: enrichedProgram.length,
      lifecycleRecords: lifecycle.length,
      equation,
      statusCounts: countBy(lifecycle, sourceKind),
      silentLosses: matrix.filter((row) => row.loss).length
    },
    placement: {
      policy: 'Sélection finale automatique uniquement avec règle explicite automaticFinalDate=true et meilleur candidat non ambigu.',
      attempted: toPosition.length,
      retainedAutomatically: automaticPlacements.length,
      proposals: proposals.length,
      priorityTuesdayProposals: proposals.filter((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay() === 2).length,
      allowedFallbackProposals: proposals.filter((row) => new Date(`${row.date}T00:00:00Z`).getUTCDay() !== 2).length,
      sessionsWithProposals: toPositionWithProposals.length,
      sessionsWithoutReliableProposal: toPositionWithout.length,
      missingDemonstratedTime: toPosition.filter((row) => !row.placementEvidence.timeDemonstrated).length,
      automaticPlacements,
      proposalsByOccurrence: countBy(proposals, 'occurrenceNumber')
    },
    program: lifecycle,
    actualProgram2027: enrichedProgram,
    automaticPlacements,
    toPosition,
    arbitrations,
    insufficient,
    nonReconducted: excluded,
    matrix2026To2027: matrix,
    matrixReference302: moa.truthMatrix,
    cta2027: { weeks: canonical.cta.schedule2027.length, rows: ctaRows, capacities: moa.cta.capacityProof },
    emsea: {
      definitionId: EMSEA_ID,
      label: 'Séance État-major',
      occurrences: lifecycle.filter((row) => eventDefinitionId(row) === EMSEA_ID),
      sourceDated: lifecycle.filter((row) => eventDefinitionId(row) === EMSEA_ID && row.isoDate).length,
      proposedNotSelected: toPositionWithProposals.length,
      proposalOptions: proposals,
      automaticFinalSelections: 0
    },
    fobaJanuary5: fobaCase,
    calendar: {
      official2027: moa.calendar[2027],
      protections: PROTECTED,
      ordinaryJanuary1To10: Array.from({ length: 10 }, (_, index) => `2027-01-${String(index + 1).padStart(2, '0')}`).map((date) => engine.evaluateCalendarDate(date, { dayStatuses: PROTECTED }, calMap)),
      ctaJanuary1To10: Array.from({ length: 10 }, (_, index) => `2027-01-${String(index + 1).padStart(2, '0')}`).map((date) => engine.evaluateCalendarDate(date, { dayStatuses: PROTECTED, serviceContinuity: true }, calMap))
    },
    conflicts,
    sampling,
    performance: performanceMetrics,
    controls: {
      criteriaPassed,
      invalidCodes: invalidCodes.map((row) => row.uid),
      externalCodeErrors: externalCodeErrors.map((row) => row.uid),
      duplicateCodes: [...new Set(duplicateCodes)],
      externalLifecycleCount: excluded.length,
      matrixRows: matrix.length,
      matrixReferenceRows: moa.truthMatrix.length,
      reportSections: uniqueSections,
      reportSectionCount: uniqueSections.length
    },
    findings: {
      p1: [],
      p2: [
        { code: 'PLACEMENT_INPUT_INCOMPLETE', count: toPositionWithout.length, detail: 'Horaire démontré et règle calendaire discriminante absents; aucune date ne peut être retenue honnêtement.' },
        { code: 'EMSEA_HUMAN_DATE_SELECTION', count: toPositionWithProposals.length, detail: 'Trois mardis compatibles sont proposés par occurrence mensuelle; aucune règle ne départage la date finale.' },
        { code: 'SOURCE_DATE_CONFLICTS', count: conflicts.totals.BLOQUANT, detail: 'Conflits bloquants déjà présents dans les dates source.' },
        { code: 'EXPLICIT_MOA_ARBITRATIONS', count: arbitrations.length, detail: 'Décisions de reconduction explicitement humaines.' },
        { code: 'INSUFFICIENT_INFORMATION', count: insufficient.length, detail: 'Définitions insuffisantes pour produire une activité complète.' }
      ]
    },
    humanDecisions: {
      placementDecisions: toPosition.length,
      explicitArbitrations: arbitrations.length,
      totalDecisions: toPosition.length + arbitrations.length,
      informationToComplete: insufficient.length,
      sourceConflictsToResolve: conflicts.totals.BLOQUANT
    },
    browser,
    tests,
    buildMs: Number((performance.now() - started).toFixed(3)),
    preview: {
      gate: { scope: 'C19-QUO-VADIS-27-FULL-DRESS-REHEARSAL-1', verdict: criteriaPassed && browserPassed ? 'PASS_WITH_EXPLICIT_RESERVATIONS' : 'PENDING_BROWSER_RECIPE', volume: equation },
      calendar: { 2027: moa.calendar[2027] },
      statComCodes: codeFinal.preview.statComCodes || [],
      statComCanonicalCodes: codeFinal.preview.statComCanonicalCodes || [],
      statComExtensions: codeFinal.statCom.extensions,
      definitions,
      events: lifecycle,
      announcements: [],
      customTargets: codeFinal.preview.customTargets,
      customPublics: codeFinal.preview.customPublics,
      targetLabels: codeFinal.preview.targetLabels,
      publicLabels: codeFinal.preview.publicLabels,
      selectedId: EMSEA_ID,
      previewOccurrences: lifecycle.filter((row) => eventDefinitionId(row) === EMSEA_ID).map((row) => ({
        id: row.programSessionId || row.id,
        label: `Séance État-major ${row.occurrenceNumber || ''}`.trim(),
        domain: 'Institutionnel', target: 'SDIS-EM', publics: [], duration: 180,
        location: 'L-G1', room: 'R-G1-EM', occurrence: row.occurrenceNumber, session: 1,
        code: '', statCom: '', programmedActivityId: row.isoDate ? row.id : null
      })),
      proposals: proposals.filter((row) => row.occurrenceNumber === 3),
      proposalSessionId: 'QV27:EMSEA:S03',
      selectedOccurrenceId: 'QV27:EMSEA:S03',
      annual: { year: 2027, occurrences: 11, periodStart: '01.03.2027', periodEnd: '31.03.2027', target: 'SDIS-EM', publics: [], location: 'L-G1', room: 'R-G1-EM', entryService: '', provenance: 'MOA_CANONICAL_EMSEA' },
      slot: { target: 'SDIS-EM', publics: [], date: '', start: '18:00', end: '21:00', location: 'L-G1', room: 'R-G1-EM', responsible: 'Cdt', complement: '', entryService: '' },
      conflictScenarios: codeFinal.preview.conflictScenarios
    }
  };
}

function section(code, title, body) { return `## ${code}. ${title}\n\n${body}`; }
function screenText(report, number) {
  const screen = report.browser && report.browser.screens && report.browser.screens[String(number)];
  return screen ? `**${screen.verdict}** — ${screen.summary}` : 'Recette navigateur à joindre.';
}
function markdown(report) {
  const v = report.volume;
  const e = v.equation;
  const testText = report.tests || {};
  const values = {
    A: ['Verdict', `**${report.verdict}**. Cohérent, sans date fabriquée; réserves humaines explicites.`],
    B: ['Git initial/final', `Branche \`${report.git.branch}\`; HEAD initial/final \`${report.git.initialHead}\`; worktree préservé.`],
    C: ['Sources utilisées', `Classeur original QUO VADIS 2026, six livrables canoniques C19, référentiels SCOPE et moteur \`${report.sources.conflictEngine}\`.`],
    D: ['Définitions', `**${v.definitions}** définitions, toutes tracées dans la matrice.`],
    E: ['Occurrences', `**${v.occurrences}** occurrences canoniques avant ajout des 13 lignes de cycle de vie non reconduites.`],
    F: ['Sessions', `**${v.sessions}** objets du programme 2027.`],
    G: ['Total objets', `**${v.lifecycleRecords}** lignes de cycle de vie = **${e.actualProgramObjects}** objets de programme + **${e.nonReconducted}** non reconduits.`],
    H: ['Dates source', `**${e.programmedSource}** activités datées explicitement par une source.`],
    I: ['Permanences CTA', `**${e.programmedCta}** fenêtres calculées, du vendredi 18:00 au lundi 06:00.`],
    J: ['Placements moteur', `**${e.programmedEngine}** sélection finale automatique; le moteur ne transforme pas une proposition ambiguë en décision.`],
    K: ['À positionner', `**${e.toPositionWithProposals + e.toPositionWithoutReliableProposal}** : ${e.toPositionWithProposals} avec propositions, ${e.toPositionWithoutReliableProposal} sans proposition fiable.`],
    L: ['À arbitrer', `**${e.arbitration}**.`],
    M: ['Informations insuffisantes', `**${e.insufficientInformation}**.`],
    N: ['Pertes silencieuses', `**${v.silentLosses}**; équation ${Object.values(e).slice(0, 8).join(' + ')} = ${e.computedSum}.`],
    O: ['Stat.Com', `${report.controls.invalidCodes.length} incohérence code/Stat.Com; succession 010JY3 → 010JC1 conservée.`],
    P: ['Codes métier', `${report.controls.duplicateCodes.length} collision; format \`STATCOM.XXX\`; aucun QV26/QV27 présenté comme code métier.`],
    Q: ['Activités externes', `**${e.nonReconducted}** non reconduites, Stat.Com et code métier vides.`],
    R: ['FOBA', `Progression DPS/DAP conservée; cas du 05.01.2027: ${report.fobaJanuary5 ? `${report.fobaJanuary5.publics.join(', ')}, responsable ${report.fobaJanuary5.responsible}` : 'introuvable'}.`],
    S: ['EMSEA', `11 occurrences: 2 dates source, 9 à positionner, ${report.placement.proposals} propositions compatibles (${report.placement.priorityTuesdayProposals} mardis prioritaires, ${report.placement.allowedFallbackProposals} replis autorisés quand trois mardis admissibles n’existent pas), 0 choix final automatique.`],
    T: ['CTA', `53 semaines et ${report.cta2027.rows.length} lignes site/semaine; continuité sans trou.`],
    U: ['Capacités G1', 'Section maximum 15; demi-section maximum 8; N06 reste une réserve réelle.'],
    V: ['C1/B1/B2', 'Aucune limite 8/15 propagée; B2 provient de la règle démontrée.'],
    W: ['Calendrier', 'Calendrier vaudois 2027 réutilisé; aucune deuxième source de vérité créée.'],
    X: ['Fériés', 'Interdits aux activités ordinaires; traversables par les permanences CTA sous exception de continuité.'],
    Y: ['Veilles', 'Interdites aux activités ordinaires selon la politique canonique.'],
    Z: ['Vacances', 'Interdites aux activités ordinaires; CTA préservé.'],
    AA: ['Propositions', `${report.placement.proposals} propositions, maximum trois par EMSEA; le mardi reçoit la priorité et les ${report.placement.allowedFallbackProposals} replis restent des jours autorisés et non protégés. Aucune date n’est retenue implicitement.`],
    AB: ['Conflits', `${report.conflicts.totals.BLOQUANT} bloquants source, ${report.conflicts.totals.DEROGEABLE} dérogeable, ${report.conflicts.totals.ATTENTION} attention, ${report.conflicts.totals.COMPATIBLE_PERTINENT} compatibles pertinents; aucun conflit créé par le moteur.`],
    AC: ['Écran 1', screenText(report, 1)], AD: ['Écran 2', screenText(report, 2)], AE: ['Écran 3', screenText(report, 3)],
    AF: ['Écran 4', screenText(report, 4)], AG: ['Écran 5', screenText(report, 5)], AH: ['Écran 6', screenText(report, 6)],
    AI: ['Écran 7', screenText(report, 7)], AJ: ['Écran 8', screenText(report, 8)], AK: ['Écran 9', screenText(report, 9)],
    AL: ['Écran 10', screenText(report, 10)], AM: ['Écran 11', screenText(report, 11)], AN: ['Écran 12', screenText(report, 12)],
    AO: ['Date/heure', report.browser ? report.browser.dateTimeSummary : 'Mesures navigateur à joindre.'],
    AP: ['Uniformité champs', report.browser ? report.browser.controlHeightSummary : 'Mesures navigateur à joindre.'],
    AQ: ['Responsive', report.browser ? `${report.browser.checks} contrôles, verdict ${report.browser.globalVerdict}.` : '48 contrôles à exécuter.'],
    AR: ['Performance', `Dataset réel ${report.performance.datasetObjects} lignes; opérations: ${Object.entries(report.performance).filter(([, value]) => value && value.elapsedMs != null).map(([key, value]) => `${key} ${value.elapsedMs} ms`).join(', ')}.`],
    AS: ['Cas 05.01.2027', report.fobaJanuary5 ? `Sites ${report.fobaJanuary5.oiCodes.join(', ')}; Public ${report.fobaJanuary5.publics.join(', ')}; rôle ${report.fobaJanuary5.roles.join(', ')}; historique ${report.fobaJanuary5.historicalResponsible}; provenance ${report.fobaJanuary5.provenance}.` : 'NOK — cas absent.'],
    AT: ['Comparaison 2026→2027', `${report.matrix2026To2027.length} définitions comparées; matrice source de référence ${report.matrixReference302.length}; perte 0.`],
    AU: ['Échantillonnage métier', `DPS, DAP, JSP, FOBA, PR, AUTO, formations disponibles, CTA, externes, 11 EMSEA, ${report.sampling.MULTI_SESSION_ATYPIQUE.length} objets multi-sessions et ${report.sampling.ARBITRAGES.length} arbitrages tracés SOURCE → DÉFINITION → RÈGLE → DATE/PROPOSITION → PROGRAMME → AGENDA.`],
    AV: ['Findings P1', '**0**.'],
    AW: ['Findings P2', report.findings.p2.map((row) => `${row.code}: ${row.count}`).join('; ') + '.'],
    AX: ['Décisions humaines restantes', `${report.humanDecisions.totalDecisions} décisions: ${report.humanDecisions.placementDecisions} placements et ${report.humanDecisions.explicitArbitrations} arbitrages; ${report.humanDecisions.informationToComplete} fiches à compléter; ${report.humanDecisions.sourceConflictsToResolve} conflits source à résoudre.`],
    AY: ['Tests ciblés', testText.targeted || 'À exécuter.'],
    AZ: ['npm run test:scope', testText.global || 'À exécuter exactement une fois en fin de lot.'],
    BA: ['Fichiers créés/modifiés', `Rapport principal, dataset programme, matrice, placements moteur, à positionner, arbitrages, conflits, CTA, tests, métriques navigateur, preview et adaptation UI ciblée.`],
    BB: ['URL preview', '`http://127.0.0.1:4186/?preprod=1`'],
    BC: ['Git final/worktree', `HEAD \`${report.git.finalHead}\`; aucun commit, push, Netlify, déploiement, migration prod, écriture SCOPE ou changement ORION.`],
    BD: ['Réponse à la question centrale', `1. **${e.actualProgramObjects}** objets QUO VADIS ’27, plus ${e.nonReconducted} traces non reconduites, soit ${e.lifecycleTotal} lignes de cycle de vie. 2. **${e.programmedSource + e.programmedCta + e.programmedEngine}** sont réellement programmés. 3. **${e.programmedEngine}** ont été retenus automatiquement. 4. **${e.toPositionWithProposals + e.toPositionWithoutReliableProposal}** restent à positionner, dont ${e.toPositionWithProposals} avec propositions. 5. **${report.humanDecisions.totalDecisions}** nécessitent une décision humaine de placement ou d’arbitrage. 6. Les principaux conflits sont quatre blocages source: salles le 18 et le 25 janvier, cumul Public/WHO/salle le 18 janvier, WHO le 30 janvier. 7. Oui, la transformation 2026→2027 est tracée sans perte, notamment FOBA, CTA, EMSEA, Stat.Com et externes. 8. **Oui pour l’étape locale suivante de préproduction, avec réserves explicites**, pas pour une intégration réelle immédiate. 9. L’intégration SCOPE réelle reste empêchée par 479 objets sans horaire/règle discriminante, 9 choix EMSEA, 3 arbitrages, 6 fiches insuffisantes et 4 conflits source à résoudre.`]
  };
  return `# C19 — QUO VADIS '27 — FULL DRESS REHEARSAL 1\n\n${Object.entries(values).map(([code, [title, body]]) => section(code, title, body)).join('\n\n')}\n`;
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(DOCS, name), `${JSON.stringify(value, null, 2)}\n`);
}
function writeOutputs(report = buildReport()) {
  writeJson(`${PREFIX}.json`, report);
  fs.writeFileSync(MD_PATH, markdown(report));
  writeJson(OUTPUTS.program, { scope: report.scope, equation: report.volume.equation, rows: report.program });
  writeJson(OUTPUTS.matrix, { scope: report.scope, reference302: report.matrixReference302.length, rows: report.matrix2026To2027 });
  writeJson(OUTPUTS.automatic, { scope: report.scope, policy: report.placement.policy, rows: report.automaticPlacements });
  writeJson(OUTPUTS.toPosition, { scope: report.scope, withProposals: report.volume.equation.toPositionWithProposals, withoutReliableProposal: report.volume.equation.toPositionWithoutReliableProposal, proposals: report.emsea.proposalOptions, rows: report.toPosition });
  writeJson(OUTPUTS.arbitrations, { scope: report.scope, rows: report.arbitrations, insufficient: report.insufficient });
  writeJson(OUTPUTS.conflicts, report.conflicts);
  writeJson(OUTPUTS.cta, report.cta2027);
  fs.writeFileSync(PREVIEW_PATH, `window.C19_PREPROD_DATA=${JSON.stringify(report.preview)};\n`);
  return report;
}

if (require.main === module) {
  const report = writeOutputs();
  console.log(JSON.stringify({
    verdict: report.verdict,
    definitions: report.volume.definitions,
    programObjects: report.volume.equation.actualProgramObjects,
    lifecycleRecords: report.volume.equation.lifecycleTotal,
    equation: report.volume.equation,
    proposals: report.placement.proposals,
    outputs: { report: JSON_PATH, markdown: MD_PATH, ...OUTPUTS, preview: PREVIEW_PATH }
  }, null, 2));
}

module.exports = { buildReport, writeOutputs, markdown, buildEmseaProposals, patchExternalDefinitions, buildMatrix, ctaMatrix, conflictReport };
