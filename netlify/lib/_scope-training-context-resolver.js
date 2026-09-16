'use strict';

const participationPolicy = require('./_scope-participation-policy');
const genericCatalog = require('./_scope-generic-event-catalog');
const {
  describeEventSeries,
  resolveSessionReportingScope
} = require('./_scope-cycle-rules');

const PROVENANCE = Object.freeze({
  SNAPSHOT: 'SNAPSHOT',
  EXPLICIT_CONFIGURATION: 'EXPLICIT_CONFIGURATION',
  EXERCISE: 'EXERCISE',
  PERSISTED_HISTORICAL_KEY: 'PERSISTED_HISTORICAL_KEY',
  PR_HISTORICAL_FALLBACK: 'PR_HISTORICAL_FALLBACK',
  DAP_GROUP_FALLBACK: 'DAP_GROUP_FALLBACK',
  DETECTED_SERIES: 'DETECTED_SERIES',
  INDIVIDUAL: 'INDIVIDUAL'
});

function text(value){
  return String(value == null ? '' : value).trim();
}

function upper(value){
  return text(value).toUpperCase();
}

function dateOnly(value){
  return value ? String(value).slice(0, 10) : null;
}

function yearOf(event, exercise){
  const value = (exercise && exercise.annee) || dateOnly(event && event.date) || '';
  return String(value).slice(0, 4);
}

function eventId(event){
  return text(event && (event.evenement_id || event.evenementId || event.eventId || event.id));
}

function exerciseId(event){
  return text(event && (event.exercice_id || event.exerciceId || event.exercise_id || event.exerciseId));
}

function definitionVersionIdOf(event){
  return text(event && (
    event.definition_version_id
    || event.definitionVersionId
    || (event.exercice && (event.exercice.definition_version_id || event.exercice.definitionVersionId))
  ));
}

function policySnapshotOf(event){
  return event && (
    event.participation_policy_snapshot
    || event.participationPolicySnapshot
    || null
  );
}

function engineSnapshotOf(event){
  return event && (
    event.engine_snapshot
    || event.engineSnapshot
    || (event.exercice && (event.exercice.configuration_snapshot || event.exercice.configurationSnapshot))
    || null
  );
}

function policyVersionIdOf(event, exercise, version, snapshot){
  const snapPolicy = snapshot && snapshot.policyVersion;
  return text(
    (version && (version.policy_version_id || version.policyVersionId))
    || (event && (event.policy_version_id || event.policyVersionId))
    || (exercise && (exercise.policy_version_id || exercise.policyVersionId))
    || (snapPolicy && (snapPolicy.policyVersionId || snapPolicy.policy_version_id))
  );
}

function normalizePolicy(policy, motifRows){
  return Object.freeze(JSON.parse(JSON.stringify(Object.assign({}, policy, {
    availableStatuses: (policy.activeStatuses || []).slice(),
    availableExcuseMotifs: participationPolicy.motifsForPolicy(policy, 'EXCUSE', { motifRows }),
    availableDispenseMotifs: participationPolicy.motifsForPolicy(policy, 'DISPENSE', { motifRows }),
    availableRoles: (policy.roles || []).slice()
  }))));
}

async function motifRows(store){
  return store && store.listParticipationMotifRows
    ? await store.listParticipationMotifRows()
    : participationPolicy.motifCatalog();
}

async function policyRows(store){
  return store && store.listParticipationPolicyRows
    ? await store.listParticipationPolicyRows()
    : participationPolicy.listDefaultPolicies().map((policy) => ({
      domain_code: policy.domainCode,
      policy_version: policy.policyVersion,
      config: policy
    }));
}

async function policyVersionRows(store){
  return store && store.listParticipationPolicyVersions
    ? await store.listParticipationPolicyVersions({})
    : [];
}

async function resolvePolicy(store, domain, event, explicitPolicyVersionId){
  const motifs = await motifRows(store);
  const snapshot = policySnapshotOf(event);
  if(snapshot && snapshot.domainCode){
    return {
      policy: normalizePolicy(participationPolicy.resolveParticipationPolicy(domain, { snapshot, motifRows: motifs }), motifs),
      source: PROVENANCE.SNAPSHOT,
      policyVersionRow: null
    };
  }
  const versions = await policyVersionRows(store);
  const policyVersionRow = (versions || []).find((row) =>
    text(row.policy_version_id || row.policyVersionId) === text(explicitPolicyVersionId)
  ) || null;
  if(policyVersionRow && policyVersionRow.config){
    const row = {
      domain_code: domain,
      policy_version: policyVersionRow.version_code || policyVersionRow.versionCode || participationPolicy.POLICY_VERSION,
      config: policyVersionRow.config
    };
    return {
      policy: normalizePolicy(participationPolicy.resolveParticipationPolicy(domain, { motifRows: motifs, policyRows: [row] }), motifs),
      source: PROVENANCE.EXPLICIT_CONFIGURATION,
      policyVersionRow
    };
  }
  return {
    policy: normalizePolicy(participationPolicy.resolveParticipationPolicy(domain, {
      motifRows: motifs,
      policyRows: await policyRows(store)
    }), motifs),
    source: 'CURRENT_POLICY',
    policyVersionRow: null
  };
}

async function loadDefinition(store, version){
  if(!version || !store || !store.listEventDefinitions) return null;
  const definitions = await store.listEventDefinitions({ status: 'ACTIF' });
  return (definitions || []).find((row) =>
    text(row.definition_id || row.definitionId) === text(version.definition_id || version.definitionId)
  ) || null;
}

async function loadDefinitionVersion(store, id){
  if(!id || !store || !store.getEventDefinitionVersion) return null;
  return await store.getEventDefinitionVersion(id);
}

async function loadV2DefinitionVersion(store, v2State){
  if(!store || !store.listEventDefinitionVersions) return null;
  if(!v2State || upper(v2State.code) !== 'DAP-FORMATION-GROUPEE-1-2026') return null;
  const versions = await store.listEventDefinitionVersions({ domain: 'DAP', active: true });
  return (versions || []).find((row) =>
    upper(row.definitionCode || row.definition_code) === 'DAP-FORMATION-GROUPEE'
    && text(row.version_code || row.versionCode) === '2026'
  ) || null;
}

async function loadExercise(store, event){
  if(event && event.exercice) return event.exercice;
  const id = exerciseId(event);
  if(!id || !store || !store.getExercise) return null;
  return await store.getExercise(id);
}

function dapGroupedFallback(event, series){
  return upper(event && (event.domaine_code || event.domaineCode)) === 'DAP'
    && series
    && series.seriesType === 'MULTI_SESSION'
    && series.source === 'dap_grouped';
}

async function sourceEventsForSeries(store, event, exercise, series){
  if(!store) return [event].filter(Boolean);
  const exId = exerciseId(event) || text(exercise && (exercise.exercice_id || exercise.exerciceId));
  if(exId && store.listExerciseEvents) return await store.listExerciseEvents(exId);
  const groupKey = text(event && (event.pr_exercise_group_key || event.prExerciseGroupKey));
  if(groupKey && store.listPrExerciseEvents) return await store.listPrExerciseEvents(groupKey);
  const cycleId = text(event && (event.cycle_id || event.cycleId));
  if(cycleId && store.listCycleEvents) return await store.listCycleEvents(cycleId);
  if(series && series.seriesKey && store.listPrExerciseEvents) return await store.listPrExerciseEvents(series.seriesKey);
  return [event].filter(Boolean);
}

async function resolveSeriesContext(store, event, exercise, explicitVersion){
  const series = describeEventSeries(event || {});
  const domain = upper(event && (event.domaine_code || event.domaineCode || event.domain));
  const persistedGroup = text(event && (event.pr_exercise_group_key || event.prExerciseGroupKey || event.pr_session_key || event.prSessionKey));
  const explicitExercise = exercise || null;
  const isPersistedExercise = Boolean(exerciseId(event) || explicitExercise);
  const sourceEvents = series && series.seriesType === 'MULTI_SESSION'
    ? await sourceEventsForSeries(store, event, exercise, series)
    : [event].filter(Boolean);
  const scoped = series && series.seriesType === 'MULTI_SESSION'
    ? resolveSessionReportingScope({ evenements: sourceEvents || [], currentEvent: event })
    : { events: [event].filter(Boolean) };
  const sessionNumbers = (scoped.events || [])
    .map((row) => Number(describeEventSeries(row).sessionNumber || row.session_index || row.sessionIndex || 0))
    .filter((value) => Number.isInteger(value) && value > 0);
  const configuredCount = Number(
    (explicitVersion && (explicitVersion.session_count || explicitVersion.sessionCount))
    || (explicitExercise && (explicitExercise.nombre_sessions_attendu || explicitExercise.nombreSessionsAttendu))
    || (event && (event.nombre_sessions_attendu || event.nombreSessionsAttendu))
    || 0
  );
  const sessionCount = configuredCount
    || (sessionNumbers.length ? Math.max(...sessionNumbers) : 0)
    || (scoped.events || []).length
    || 1;
  const sessionIndex = Number(
    (event && (event.session_index || event.sessionIndex))
    || (series && series.sessionNumber)
    || 0
  ) || null;
  const mode = (explicitVersion && upper(explicitVersion.mode_organisation || explicitVersion.modeOrganisation))
    || (sessionCount > 1 ? 'MULTI_SESSION' : 'SIMPLE');
  let provenance = PROVENANCE.INDIVIDUAL;
  if(explicitVersion) provenance = PROVENANCE.EXPLICIT_CONFIGURATION;
  else if(isPersistedExercise) provenance = PROVENANCE.EXERCISE;
  else if(persistedGroup) provenance = PROVENANCE.PERSISTED_HISTORICAL_KEY;
  else if(domain === 'PR' && series.seriesType === 'MULTI_SESSION') provenance = PROVENANCE.PR_HISTORICAL_FALLBACK;
  else if(dapGroupedFallback(event, series)) provenance = PROVENANCE.DAP_GROUP_FALLBACK;
  else if(series.seriesType === 'MULTI_SESSION') provenance = PROVENANCE.DETECTED_SERIES;
  return {
    series,
    sourceEvents: scoped.events || [],
    obligationKey: series.seriesKey || eventId(event),
    consolidationKey: series.seriesKey || eventId(event),
    modeOrganisation: mode === 'MULTI' ? 'MULTI_SESSION' : mode,
    sessionCount,
    sessionIndex,
    provenance,
    legacyFallback: [
      PROVENANCE.PERSISTED_HISTORICAL_KEY,
      PROVENANCE.PR_HISTORICAL_FALLBACK,
      PROVENANCE.DAP_GROUP_FALLBACK,
      PROVENANCE.DETECTED_SERIES
    ].includes(provenance)
  };
}

function formationLabel(event, definition, version, exercise, snapshot, series, sourceEvents){
  const snapDefinition = snapshot && snapshot.definition;
  const year = yearOf(event, exercise);
  if(snapDefinition && snapDefinition.label) return snapDefinition.label;
  if(definition && definition.label) return definition.label;
  if(exercise && exercise.libelle) return exercise.libelle;
  if(series && upper(event && (event.domaine_code || event.domaineCode)) === 'PR' && series.exerciseNumber){
    return `Exercice PR ${series.exerciseNumber}${year ? ` — ${year}` : ''}`;
  }
  if(series && series.source === 'dap_grouped' && sourceEvents && sourceEvents.length){
    const first = sourceEvents[0] || event || {};
    const match = text(first.libelle || first.label).match(/formation\s+group[eé]e\s+dap\s+(\d+)/i);
    if(match) return `Formation groupée DAP ${match[1]}`;
  }
  return text(event && (event.libelle || event.label)) || 'Configuration historique SCOPE';
}

function originLabel(event, provenance){
  if(provenance === PROVENANCE.EXPLICIT_CONFIGURATION) return 'Configuration explicite';
  if(provenance === PROVENANCE.EXERCISE) return 'Exercice persisté';
  if(provenance === PROVENANCE.SNAPSHOT) return 'Snapshot historique';
  if(provenance === PROVENANCE.PERSISTED_HISTORICAL_KEY) return 'Clé historique persistée';
  if(provenance === PROVENANCE.PR_HISTORICAL_FALLBACK || provenance === PROVENANCE.DAP_GROUP_FALLBACK){
    return event && event.origine === 'IMPORT_CSV' ? 'Import historique' : 'Fallback historique';
  }
  if(provenance === PROVENANCE.DETECTED_SERIES) return 'Série détectée non persistée';
  return event && event.origine === 'IMPORT_CSV' ? 'Import historique' : 'Historique existant';
}

async function resolveTrainingContext(store, event, options = {}){
  if(!event){
    const domain = upper(options.domain || options.domaineCode || 'SCOPE');
    const resolvedPolicy = await resolvePolicy(store, domain, null, null);
    return {
      eventId: null,
      eventCode: null,
      domain,
      definition: null,
      definitionVersion: null,
      exercise: null,
      formationLabel: 'Configuration historique SCOPE',
      modeOrganisation: 'SIMPLE',
      sessionIndex: null,
      sessionCount: 1,
      policy: resolvedPolicy.policy,
      policyVersion: null,
      availableStatuses: resolvedPolicy.policy.availableStatuses,
      availableExcuseMotifs: resolvedPolicy.policy.availableExcuseMotifs,
      availableDispenseMotifs: resolvedPolicy.policy.availableDispenseMotifs,
      availableRoles: resolvedPolicy.policy.availableRoles,
      engineRoute: 'SIMPLE_LEGACY',
      snapshots: { engine: null, participationPolicy: null },
      obligationKey: null,
      consolidationKey: null,
      provenance: PROVENANCE.INDIVIDUAL,
      legacyFallback: true,
      diagnostics: []
    };
  }
  const snapshot = engineSnapshotOf(event);
  const snapshotDefinition = snapshot && snapshot.definition;
  const snapshotVersion = snapshot && snapshot.version;
  const realisedHistorical = ['REALISE', 'CLOTURE', 'TRAITE'].includes(upper(event.statut || event.status));
  const snapshotPriority = realisedHistorical && Boolean(snapshotDefinition || snapshotVersion || policySnapshotOf(event));
  const versionId = definitionVersionIdOf(event);
  const exercise = await loadExercise(store, event);
  const explicitVersion = await loadDefinitionVersion(store, versionId)
    || await loadV2DefinitionVersion(store, options.v2State);
  const definition = explicitVersion ? await loadDefinition(store, explicitVersion) : null;
  const domain = upper(
    (snapshotDefinition && snapshotDefinition.domain)
    || (definition && definition.domain)
    || (explicitVersion && explicitVersion.domain)
    || (exercise && exercise.domaine_code)
    || event.domaine_code
    || event.domaineCode
  );
  const effectiveVersion = snapshotPriority && snapshotVersion
    ? {
      definition_version_id: snapshotVersion.definitionVersionId || versionId || null,
      version_code: snapshotVersion.versionCode || null,
      valid_from: snapshotVersion.validFrom || null,
      valid_to: snapshotVersion.validTo || null,
      mode_organisation: snapshotVersion.mode || null,
      session_count: snapshotVersion.sessionCount || null,
      policy_version_id: snapshot && snapshot.policyVersion && snapshot.policyVersion.policyVersionId || null,
      domain
    }
    : explicitVersion;
  const seriesContext = await resolveSeriesContext(store, event, exercise, effectiveVersion);
  const provenance = snapshotPriority
    ? PROVENANCE.SNAPSHOT
    : seriesContext.provenance;
  const resolvedPolicy = await resolvePolicy(store, domain, event, policyVersionIdOf(event, exercise, explicitVersion, snapshot));
  const engineRoute = text(event.engine_route || event.engineRoute)
    || genericCatalog.resolveEngineRoute(event, {
      definitionVersion: effectiveVersion,
      multisessionV2: Boolean(options.v2State)
    });
  const diagnostics = [];
  const effectiveStatComCode = text(
    event.statcom_code || event.statComCode
    || (snapshotVersion && snapshotVersion.statComCode)
    || (effectiveVersion && (effectiveVersion.statcom_code || effectiveVersion.statComCode))
    || (exercise && (exercise.statcom_code || exercise.statComCode))
  );
  const effectiveStatCom = event.statcom_snapshot || event.statComSnapshot
    || (snapshotVersion && snapshotVersion.statCom)
    || (effectiveVersion && (effectiveVersion.statcom_snapshot || effectiveVersion.statComSnapshot))
    || (exercise && (exercise.statcom_snapshot || exercise.statComSnapshot))
    || null;
  if(seriesContext.provenance === PROVENANCE.DETECTED_SERIES){
    diagnostics.push({
      code: 'DETECTED_SERIES_NOT_CONFIGURED',
      level: 'info',
      message: 'Série détectée par notation, non persistée automatiquement.'
    });
  }
  if(seriesContext.sessionIndex && seriesContext.sessionCount && seriesContext.sessionIndex > seriesContext.sessionCount){
    diagnostics.push({
      code: 'SESSION_INDEX_OUT_OF_RANGE',
      level: 'error',
      message: `Session ${seriesContext.sessionIndex} hors limites pour ${seriesContext.sessionCount} sessions.`
    });
  }
  return Object.freeze({
    eventId: eventId(event),
    eventCode: text(event.code_cours || event.codeCours || event.code_source || event.codeSource),
    domain,
    definition: definition || (snapshotDefinition ? {
      definitionId: snapshotDefinition.definitionId,
      code: snapshotDefinition.code,
      label: snapshotDefinition.label,
      domain: snapshotDefinition.domain
    } : null),
    definitionVersion: effectiveVersion || null,
    exercise: exercise || null,
    formationLabel: formationLabel(event, definition, effectiveVersion, exercise, snapshot, seriesContext.series, seriesContext.sourceEvents),
    statComCode: effectiveStatComCode || null,
    statCom: effectiveStatCom,
    modeOrganisation: seriesContext.modeOrganisation,
    sessionIndex: seriesContext.sessionIndex,
    sessionCount: seriesContext.sessionCount,
    policy: resolvedPolicy.policy,
    policyVersion: resolvedPolicy.policyVersionRow || null,
    availableStatuses: resolvedPolicy.policy.availableStatuses,
    availableExcuseMotifs: resolvedPolicy.policy.availableExcuseMotifs,
    availableDispenseMotifs: resolvedPolicy.policy.availableDispenseMotifs,
    availableRoles: resolvedPolicy.policy.availableRoles,
    engineRoute,
    snapshots: {
      engine: snapshot || null,
      participationPolicy: policySnapshotOf(event)
    },
    obligationKey: seriesContext.obligationKey,
    consolidationKey: seriesContext.consolidationKey,
    provenance,
    policyProvenance: resolvedPolicy.source,
    legacyFallback: seriesContext.legacyFallback || provenance === PROVENANCE.SNAPSHOT,
    detectedSeries: seriesContext.series,
    sourceEventCount: seriesContext.sourceEvents.length,
    diagnostics
  });
}

module.exports = {
  PROVENANCE,
  resolveTrainingContext
};
