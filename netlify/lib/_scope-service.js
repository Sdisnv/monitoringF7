const { randomUUID } = require('crypto');
const {
  HttpError,
  isoDate,
  isAffectationValide,
  computeTaux,
  validateParticipationPatch,
  validateCloture,
  expectedPopulationCoherence,
  rangesOverlap,
  ROLES_ENCADREMENT,
  permutationObligationSummary,
  isPermutationCatchupAttendu
} = require('./_scope-rules');
const {
  TYPES_PERIODE,
  MOTIFS_INDISPONIBLE,
  dayBefore,
  evaluateEligibility,
  assertPeriodCompatible,
  deriveStatutCourant,
  closeAllOpenAffectations,
  filterAttendusEligibleAtDate
} = require('./_scope-personnel');
const personnelSync = require('./_scope-personnel-sync');
const { hasPermission } = require('./_rbac');
const csvImport = require('./_scope-csv-import');
const importContract = require('./_scope-import-contract');
const {
  inferModeSuivi,
  MODES,
  officialFromQuantitatif,
  parseQuantitatifInput
} = require('./_scope-analytics');
const {
  domaineAffiche,
  isSousDomaineFospec,
  resolveSuiviNominatif,
  STATUT_PERMUTATION,
  PERMUTATION_STATUS,
  normalizeExerciseEquivalenceKey,
  exerciseEquivalenceKeyForEvent,
  isCompatiblePermutationEvent
} = require('./_scope-model');
const participationPolicy = require('./_scope-participation-policy');
const genericCatalog = require('./_scope-generic-event-catalog');
const { matchesAssignmentToEventTarget } = require('./_scope-target-resolution');
const { isQualificationEvenement, wantsQualification } = require('./_scope-qualification');
const {
  computeMultiSessionParticipationState,
  prSessionLabel,
  canCloseLastSession,
  resolveSessionReportingScope,
  resolveCycleCompletion
} = require('./_scope-cycle-rules');
const MultiSessionV2 = require('./_scope-multisession-v2');
const display = require('../../assets/js/scope-personnel-display.js');
const referentialDisplay = require('../../assets/js/scope-personnel-referentials.js');

function requireBaseVersion(body){
  const value = body?.baseVersion ?? body?.base_version;
  if(value === undefined || value === null || value === ''){
    throw new HttpError(400, 'base_version_required', 'baseVersion est obligatoire pour toute écriture d’événement.');
  }
  const n = Number(value);
  if(!Number.isInteger(n) || n < 1) throw new HttpError(400, 'base_version_invalid', 'baseVersion invalide.');
  return n;
}

function actorId(actor){
  return String(actor?.sub || actor?.email || actor?.nip || actor || 'systeme');
}

function boolFromInput(value, fallback){
  if(value === undefined || value === null || value === '') return fallback;
  if(value === true || value === false) return value;
  return ['1', 'true', 'oui', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeSessionConfig(body = {}){
  const rawMode = String(body.modeSession || body.mode_session || body.sessionMode || body.session_mode || 'SINGLE').trim().toUpperCase();
  const modeSession = rawMode === 'MULTI' || rawMode === 'PLUSIEURS' ? 'MULTI' : 'SINGLE';
  const rawCount = body.nombreSessionsAttendu || body.nombre_sessions_attendu || body.nbSessions || body.nb_sessions || body.sessionCount || body.session_count;
  const count = modeSession === 'MULTI'
    ? Math.max(2, Number(rawCount || 2))
    : 1;
  if(!Number.isFinite(count) || count < 1){
    throw new HttpError(400, 'nombre_sessions_invalide', 'Nombre de sessions invalide.');
  }
  const rawIndex = body.sessionIndex || body.session_index;
  const sessionIndex = rawIndex === undefined || rawIndex === null || rawIndex === ''
    ? 1
    : Number(rawIndex);
  if(!Number.isInteger(sessionIndex) || sessionIndex < 1 || sessionIndex > count){
    throw new HttpError(400, 'session_index_invalide', 'Index de session invalide.');
  }
  return {
    modeSession,
    nombreSessionsAttendu: count,
    consolidationActive: modeSession === 'MULTI'
      ? boolFromInput(body.consolidationActive || body.consolidation_active, true)
      : false,
    sessionIndex,
    sessionLabel: String(body.sessionLabel || body.session_label || (modeSession === 'MULTI' ? `${sessionIndex}/${count}` : '')).trim() || null
  };
}

function exerciseKeyFromParts(source, code, date, libelle){
  const base = String(code || libelle || 'exercice')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const year = String(date || '').slice(0, 4) || 'na';
  return `${source}:${year}:${base || 'exercice'}`;
}

function compactCodePart(value, fallback){
  const text = String(value || fallback || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '');
  return text || String(fallback || 'SCOPE');
}

async function nextManualCode(repo, body, cibleIds){
  if(body.codeCours || body.code_cours) return String(body.codeCours || body.code_cours).trim();
  const seq = repo.nextManualEventSequence ? await repo.nextManualEventSequence() : 1;
  const suffix = `S${String(seq).padStart(3, '0')}`;
  const stat = body.statCom || body.stat_com || body.codeSource || body.code_source || 'SCOPE';
  const qui = body.qui || body.publicCible || body.public_cible || compactCodePart((cibleIds || []).length, 'GEN');
  return importContract.buildCodeCours(stat, qui, suffix);
}

function isQuantitatif(evenement){
  return inferModeSuivi(evenement) === MODES.QUANTITATIF;
}

function isPrParticipantContribution(statut, role){
  const r = String(role || 'PARTICIPANT').toUpperCase();
  const s = String(statut || '').toUpperCase();
  if(r === 'SURVEILLANT') return s === 'PRESENT';
  return r === 'PARTICIPANT' && ['PRESENT', 'PERMUTATION', 'DISPENSE'].includes(s);
}

function requireQuantitatif(evenement){
  if(!isQuantitatif(evenement)){
    throw new HttpError(422, 'mode_non_quantitatif', 'Cette action concerne uniquement le suivi quantitatif.');
  }
}

function volumesOrThrow(body){
  const parsed = parseQuantitatifInput(body || {});
  if(parsed.error === 'missing'){
    throw new HttpError(400, 'volumes_incomplets', 'Attendus, présents, excusés et non excusés sont obligatoires.');
  }
  if(parsed.error === 'negative'){
    throw new HttpError(422, 'volume_negatif', 'Les volumes ne peuvent pas être négatifs.');
  }
  if(parsed.error === 'not_integer'){
    throw new HttpError(422, 'volume_invalide', 'Les volumes doivent être des entiers.');
  }
  if(parsed.error === 'motifs_incoherents'){
    throw new HttpError(422, 'motifs_incoherents', 'La somme des motifs d’excuse doit être égale aux excusés.');
  }
  return parsed.row;
}

function officialQuantitatifOrThrow(row){
  const official = officialFromQuantitatif(row);
  if(!official){
    throw new HttpError(
      422,
      'volumes_incoherents',
      'Présents + excusés + non excusés + dispensés doit être égal aux attendus. Aucune correction automatique n’est appliquée.'
    );
  }
  return official;
}

async function bumpOrConflict(repo, eventId, baseVersion, patch){
  const next = await repo.updateEventIfVersion(eventId, baseVersion, patch);
  if(!next){
    const current = await repo.getEvent(eventId);
    throw new HttpError(409, 'conflict', 'L’événement a été modifié ailleurs.', {
      serverVersion: current ? current.version : null
    });
  }
  return next;
}

function createScopeService(repo){
  function generateReferentialId(label, existingIds){
    const base = String(label || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()
      .slice(0, 48) || 'REFERENTIEL';
    let candidate = base;
    let index = 2;
    while(existingIds && existingIds.has(candidate)){
      candidate = `${base}_${index}`;
      index += 1;
    }
    return candidate;
  }

  async function participationMotifRows(store = repo){
    return store.listParticipationMotifRows ? await store.listParticipationMotifRows() : participationPolicy.motifCatalog();
  }

  async function participationStatusRows(store = repo){
    return store.listParticipationStatusRows ? await store.listParticipationStatusRows() : [];
  }

  async function participationPolicyRows(store = repo){
    return store.listParticipationPolicyRows ? await store.listParticipationPolicyRows() : participationPolicy.listDefaultPolicies().map((policy) => ({
      domain_code: policy.domainCode,
      policy_version: policy.policyVersion,
      config: policy
    }));
  }

  async function resolvePolicyForEvent(store, evenement){
    const motifRows = await participationMotifRows(store);
    const policyRows = await participationPolicyRows(store);
    const snapshot = evenement && (evenement.participation_policy_snapshot || evenement.participationPolicySnapshot);
    return participationPolicy.resolveParticipationPolicy(evenement && evenement.domaine_code, {
      snapshot,
      motifRows,
      policyRows
    });
  }

  async function capturePolicySnapshot(store, domaineCode){
    const motifRows = await participationMotifRows(store);
    const policyRows = await participationPolicyRows(store);
    return participationPolicy.policySnapshot(domaineCode, { motifRows, policyRows });
  }

  function policyPayload(policy, motifRows){
    return Object.assign({}, policy, {
      motifs: (motifRows || []).map((row) => ({
        value: row.motif_id || row.id || row.value,
        id: row.motif_id || row.id || row.value,
        label: row.label || row.libelle || row.motif_id || row.id || row.value,
        group: row.group_code || row.group || 'operationnel',
        type: row.motif_type || row.type || 'EXCUSE',
        active: row.actif !== false && row.active !== false
      })),
      excuseMotifsDetails: participationPolicy.motifsForPolicy(policy, 'EXCUSE', { motifRows }),
      dispenseMotifsDetails: participationPolicy.motifsForPolicy(policy, 'DISPENSE', { motifRows })
    });
  }

  function summarizeReferentialUsage(details = {}){
    const summary = {
      configurations: Number(details.configurations || 0),
      policies: Number(details.policies || 0),
      policyVersions: Number(details.policyVersions || 0),
      events: Number(details.eventSnapshots || 0),
      participations: Number(details.participations || 0),
      snapshots: Number(details.eventSnapshots || 0) + Number(details.exerciseSnapshots || 0),
      exerciseSnapshots: Number(details.exerciseSnapshots || 0)
    };
    const protectedCount = summary.configurations
      + summary.policies
      + summary.policyVersions
      + summary.events
      + summary.participations
      + summary.exerciseSnapshots;
    summary.total = protectedCount;
    summary.canDelete = protectedCount <= 0;
    summary.referenced = protectedCount > 0;
    return summary;
  }

  function referentialUsageLabel(summary = {}){
    const parts = [];
    const configurations = Number(summary.configurations || 0);
    const events = Number(summary.events || 0);
    const participations = Number(summary.participations || 0);
    const snapshots = Number(summary.snapshots || 0);
    if(configurations) parts.push(`${configurations} configuration${configurations > 1 ? 's' : ''}`);
    if(events) parts.push(`${events} événement${events > 1 ? 's' : ''}`);
    if(participations) parts.push(`${participations} saisie${participations > 1 ? 's' : ''}`);
    if(!parts.length && snapshots) parts.push('Historique uniquement');
    return parts.length ? parts.join(' · ') : 'Jamais référencé';
  }

  async function participationPolicies(){
    const motifRows = await participationMotifRows(repo);
    const statusRows = await participationStatusRows(repo);
    const policyRows = await participationPolicyRows(repo);
    const policyVersions = repo.listParticipationPolicyVersions ? await repo.listParticipationPolicyVersions({ active: true }) : [];
    const usage = repo.listParticipationReferentialUsages ? await repo.listParticipationReferentialUsages() : { statuses: {}, motifs: {} };
    const domaines = repo.listDomaines ? await repo.listDomaines() : [];
    const domainCodes = [...new Set([
      ...participationPolicy.listDefaultPolicies().map((policy) => policy.domainCode),
      ...(domaines || []).map((row) => row.code)
    ].filter(Boolean))].sort();
    const policies = domainCodes.map((code) => policyPayload(
      participationPolicy.resolveParticipationPolicy(code, { motifRows, policyRows }),
      motifRows
    ));
    const enrichStatus = (row) => {
      const id = String(row && row.id || '').toUpperCase();
      const usageCount = Number((usage.statuses && usage.statuses[id]) || 0);
      const usageDetails = usage.statusDetails && usage.statusDetails[id] || {};
      const usageSummary = summarizeReferentialUsage(usageDetails);
      return Object.assign({}, row, {
        usageCount,
        usageDetails,
        usageSummary,
        usageLabel: referentialUsageLabel(usageSummary),
        canDelete: usageSummary.canDelete,
        used: usageCount > 0,
        protected: row && (row.system || String(row.id || '').toUpperCase() === 'NON_RENSEIGNE' || String(row.id || '').toUpperCase() === 'PERMUTATION')
      });
    };
    const enrichMotif = (row) => {
      const id = String(row && row.id || '').toUpperCase();
      const usageCount = Number((usage.motifs && usage.motifs[id]) || 0);
      const usageDetails = usage.motifDetails && usage.motifDetails[id] || {};
      const usageSummary = summarizeReferentialUsage(usageDetails);
      return Object.assign({}, row, {
        usageCount,
        usageDetails,
        usageSummary,
        usageLabel: referentialUsageLabel(usageSummary),
        canDelete: usageSummary.canDelete,
        used: usageCount > 0
      });
    };
    return {
      participation: {
        policyVersion: participationPolicy.POLICY_VERSION,
        statuses: participationPolicy.statusCatalog(statusRows).map(enrichStatus),
        motifs: participationPolicy.motifCatalog(motifRows).map(enrichMotif),
        roles: Object.values(participationPolicy.ROLE_LIBRARY).sort((a, b) => a.order - b.order),
        policies,
        policyVersions
      }
    };
  }

  async function participationReferentialUsage(kind, id, actor){
    const normalizedKind = String(kind || '').trim().toLowerCase();
    const referentialKind = normalizedKind === 'status' || normalizedKind === 'statut' ? 'status' : 'motif';
    const key = String(id || '').trim().toUpperCase();
    if(!key) throw new HttpError(400, 'referentiel_invalide', 'Référentiel invalide.');
    const includePeople = hasPermission(actor, 'personnel:read');
    const details = repo.listParticipationReferentialUsageDetails
      ? await repo.listParticipationReferentialUsageDetails(referentialKind, key, { includePeople })
      : null;
    const aggregate = repo.getParticipationReferentialUsage
      ? await repo.getParticipationReferentialUsage(referentialKind, key)
      : { count: 0, details: {} };
    const summary = summarizeReferentialUsage((details && details.sourceCounts) || aggregate.details || {});
    return {
      usage: Object.assign({
        kind: referentialKind,
        id: key,
        summary,
        usageCount: Number(aggregate.count || summary.total || 0),
        canDelete: summary.canDelete,
        label: referentialUsageLabel(summary),
        canShowPeople: includePeople
      }, details || {})
    };
  }

  async function formationCatalog(filter = {}){
    const [definitions, definitionVersions, policyVersions, domaines, cibles] = await Promise.all([
      repo.listEventDefinitions ? repo.listEventDefinitions(filter) : Promise.resolve([]),
      repo.listEventDefinitionVersions ? repo.listEventDefinitionVersions(filter) : Promise.resolve([]),
      repo.listParticipationPolicyVersions ? repo.listParticipationPolicyVersions({ active: true }) : Promise.resolve([]),
      repo.listDomaines ? repo.listDomaines() : Promise.resolve([]),
      repo.listCibles ? repo.listCibles() : Promise.resolve([])
    ]);
    const versionIds = (definitionVersions || []).map((row) => row.definition_version_id || row.definitionVersionId).filter(Boolean);
    const eventCounts = repo.countEventsByDefinitionVersions
      ? await repo.countEventsByDefinitionVersions(versionIds)
      : {};
    const eventsByVersion = repo.listEventsByDefinitionVersions
      ? await repo.listEventsByDefinitionVersions(versionIds)
      : {};
    const versionsByDefinition = new Map();
    for(const version of definitionVersions || []){
      const id = version.definition_id || version.definitionId;
      const list = versionsByDefinition.get(id) || [];
      const versionId = version.definition_version_id || version.definitionVersionId;
      const associatedEvents = normalizeAssociatedConfigurationEvents(eventsByVersion[versionId] || [], version);
      list.push(Object.assign({}, version, {
        linkedEventCount: Number(eventCounts[versionId] || associatedEvents.length || 0),
        linked_event_count: Number(eventCounts[versionId] || associatedEvents.length || 0),
        linkedEvents: associatedEvents,
        linked_events: associatedEvents
      }));
      versionsByDefinition.set(id, list);
    }
    const enrichedVersions = (definitionVersions || []).map((version) => {
      const versionId = version.definition_version_id || version.definitionVersionId;
      const associatedEvents = normalizeAssociatedConfigurationEvents(eventsByVersion[versionId] || [], version);
      return Object.assign({}, version, {
        linkedEventCount: Number(eventCounts[versionId] || associatedEvents.length || 0),
        linked_event_count: Number(eventCounts[versionId] || associatedEvents.length || 0),
        linkedEvents: associatedEvents,
        linked_events: associatedEvents
      });
    });
    return {
      formationCatalog: {
        routes: genericCatalog.ROUTES,
        modes: genericCatalog.ORGANISATION_MODES,
        definitions: (definitions || []).map((definition) => Object.assign({}, definition, {
          versions: versionsByDefinition.get(definition.definition_id || definition.definitionId) || []
        })),
        definitionVersions: enrichedVersions,
        policyVersions,
        domaines,
        cibles,
        transition: ['SIMPLE_LEGACY', 'PR_LEGACY', 'GENERIC_SIMPLE', 'GENERIC_MULTI_SESSION']
      }
    };
  }

  function dateOnlyText(value){
    return value ? String(value).slice(0, 10) : null;
  }

  function normalizeAssociationOrigin(event, version){
    const source = String(event && (event.source_type || event.sourceType || event.origine || '') || '').toUpperCase();
    if(source === 'CSV' || source === 'IMPORT_CSV') return 'Import';
    const metadata = (event && event.association_metadata) || (event && event.metadata) || {};
    if(metadata && metadata.source === 'existing_event') return 'Historique existant / migration';
    if(event && event.exercice_id && (event.definition_version_id || event.exercice_definition_version_id)) return 'Association administrative';
    if(String(event && event.origine || '').toUpperCase() === 'MANUEL') return 'Création manuelle';
    if(version && (version.metadata || {}).reconductedFrom) return 'Reconduction / configuration annuelle';
    return 'Association administrative';
  }

  function normalizeAssociatedConfigurationEvents(events = [], version = {}){
    const sessionCount = Number(version.session_count || version.sessionCount || 1);
    return (events || []).map((event) => ({
      evenementId: event.evenement_id || event.evenementId,
      evenement_id: event.evenement_id || event.evenementId,
      date: dateOnlyText(event.date),
      libelle: event.libelle || event.label || '',
      domaine: event.domaine_code || event.domaineCode || event.domain || '',
      domaineCode: event.domaine_code || event.domaineCode || event.domain || '',
      statut: event.statut || '',
      sessionIndex: event.session_index == null ? null : Number(event.session_index),
      session_index: event.session_index == null ? null : Number(event.session_index),
      sessionCount,
      session_count: sessionCount,
      originLabel: normalizeAssociationOrigin(event, version),
      origin_label: normalizeAssociationOrigin(event, version)
    })).sort((a, b) =>
      String(a.date || '').localeCompare(String(b.date || ''))
      || Number(a.sessionIndex || 0) - Number(b.sessionIndex || 0)
      || String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr', { numeric: true })
    );
  }

  async function resolveEventFormationConfiguration(evenement, v2State = null){
    if(!evenement) return {
      label: 'Configuration historique SCOPE',
      isLegacy: true,
      originLabel: 'Historique existant'
    };
    let version = null;
    let definition = null;
    const eventVersionId = evenement.definition_version_id || evenement.definitionVersionId || (evenement.exercice && (evenement.exercice.definition_version_id || evenement.exercice.definitionVersionId));
    if(eventVersionId && repo.getEventDefinitionVersion){
      version = await repo.getEventDefinitionVersion(eventVersionId);
    }
    if(!version && v2State && String(v2State.code || '').toUpperCase() === 'DAP-FORMATION-GROUPEE-1-2026' && repo.listEventDefinitionVersions){
      const versions = await repo.listEventDefinitionVersions({ domain: 'DAP', active: true });
      version = (versions || []).find((row) =>
        String(row.definitionCode || row.definition_code || '').toUpperCase() === 'DAP-FORMATION-GROUPEE'
        && String(row.version_code || row.versionCode || '') === '2026'
      ) || null;
    }
    if(version && repo.listEventDefinitions){
      const definitions = await repo.listEventDefinitions({ status: 'ACTIF' });
      definition = (definitions || []).find((row) => String(row.definition_id || row.definitionId || '') === String(version.definition_id || version.definitionId || '')) || null;
    }
    const snapshot = evenement.engine_snapshot
      || (evenement.exercice && evenement.exercice.configuration_snapshot)
      || null;
    const snapDefinition = snapshot && snapshot.definition;
    const snapVersion = snapshot && snapshot.version;
    const snapPolicy = snapshot && snapshot.policyVersion;
    if(!version && !definition && !snapDefinition && !v2State){
      const domain = String(evenement.domaine_code || evenement.domaineCode || '').toUpperCase();
      if(domain === 'PR' && (evenement.pr_exercise_group_key || evenement.prExerciseGroupKey || evenement.cycle_id || evenement.cycleId)){
        const exercise = evenement.exercice || (evenement.exercice_id && repo.getExercise ? await repo.getExercise(evenement.exercice_id) : null);
        const count = Number((exercise && (exercise.nombre_sessions_attendu || exercise.nombreSessionsAttendu)) || evenement.nombre_sessions_attendu || 1);
        const index = Number(evenement.session_index || evenement.sessionIndex || 0) || null;
        return {
          label: (exercise && exercise.libelle) || 'Cycle PR',
          version: null,
          validFrom: null,
          validTo: null,
          domain: 'PR',
          organisation: count > 1 ? 'Plusieurs sessions' : 'Session unique',
          modeOrganisation: count > 1 ? 'MULTI_SESSION' : 'SIMPLE',
          sessionCount: count,
          sessionIndex: index,
          policyLabel: 'Règles PR historiques',
          originLabel: evenement.origine === 'IMPORT_CSV' ? 'Import historique' : 'Historique existant',
          isLegacy: true,
          legacyProjection: true,
          technical: {
            prExerciseGroupKey: evenement.pr_exercise_group_key || evenement.prExerciseGroupKey || null,
            prSessionKey: evenement.pr_session_key || evenement.prSessionKey || null,
            cycleId: evenement.cycle_id || evenement.cycleId || null
          }
        };
      }
      return {
        label: 'Configuration historique SCOPE',
        isLegacy: true,
        originLabel: evenement.origine === 'IMPORT_CSV' ? 'Import historique' : 'Historique existant'
      };
    }
    const sessionCount = Number(
      (version && (version.session_count || version.sessionCount))
      || (snapVersion && snapVersion.sessionCount)
      || (v2State && v2State.sessionCount)
      || evenement.nombre_sessions_attendu
      || 1
    );
    const sessionIndex = Number(
      evenement.session_index
      || (v2State && v2State.currentSessionIndex)
      || 0
    ) || null;
    const mode = String((version && (version.mode_organisation || version.modeOrganisation)) || (snapVersion && snapVersion.mode) || (sessionCount > 1 ? 'MULTI_SESSION' : 'SIMPLE')).toUpperCase();
    const snapshotAssociation = snapshot && snapshot.association;
    const originLabel = snapshotAssociation && snapshotAssociation.origin === 'MANUAL'
      ? 'Association manuelle'
      : v2State && !eventVersionId
      ? 'Historique existant / migration'
      : normalizeAssociationOrigin(evenement, version || {});
    return {
      label: (definition && definition.label) || (snapDefinition && snapDefinition.label) || (v2State && v2State.label) || evenement.libelle,
      version: (version && (version.version_code || version.versionCode)) || (snapVersion && snapVersion.versionCode) || (v2State && v2State.period) || null,
      validFrom: (version && (version.valid_from || version.validFrom)) || (snapVersion && snapVersion.validFrom) || null,
      validTo: (version && (version.valid_to || version.validTo)) || (snapVersion && snapVersion.validTo) || null,
      periodLabel: (() => {
        const from = (version && (version.valid_from || version.validFrom)) || (snapVersion && snapVersion.validFrom) || null;
        const to = (version && (version.valid_to || version.validTo)) || (snapVersion && snapVersion.validTo) || null;
        if(from && to) return `${dateOnlyText(from)} - ${dateOnlyText(to)}`;
        if(from) return `Depuis ${String(from).slice(0, 4)}`;
        if(to) return `Jusqu’à ${String(to).slice(0, 4)}`;
        return '';
      })(),
      domain: (definition && definition.domain) || (version && version.domain) || (snapDefinition && snapDefinition.domain) || evenement.domaine_code,
      organisation: mode === 'MULTI_SESSION' ? 'Plusieurs sessions' : 'Session unique',
      modeOrganisation: mode,
      sessionCount,
      sessionIndex,
      policyLabel: [
        (version && (version.policyCode || version.policy_code)) || (snapPolicy && snapPolicy.policyCode),
        (version && (version.policyVersionCode || version.policy_version_code)) || (snapPolicy && snapPolicy.versionCode)
      ].filter(Boolean).join(' · ') || 'Règles de participation SCOPE',
      originLabel,
      technical: {
        definitionVersionId: (version && (version.definition_version_id || version.definitionVersionId)) || eventVersionId || null,
        policyVersionId: (version && (version.policy_version_id || version.policyVersionId)) || (snapPolicy && snapPolicy.policyVersionId) || null,
        engineRoute: evenement.engine_route || evenement.engineRoute || null
      }
    };
  }

  function eventDateInVersion(event, version){
    const day = isoDate(event && event.date);
    if(!day) return false;
    const from = dateOnlyText(version && (version.valid_from || version.validFrom));
    const to = dateOnlyText(version && (version.valid_to || version.validTo));
    return (!from || from <= day) && (!to || day <= to);
  }

  function inferConfigurationSessionIndex(event, version){
    const count = Number(version && (version.session_count || version.sessionCount || 1));
    const direct = Number(event && (event.session_index || event.sessionIndex || 0));
    if(Number.isInteger(direct) && direct > 0 && direct <= count){
      return { sessionIndex: direct, source: 'champ session existant', ambiguous: false };
    }
    const label = String((event && (event.session_label || event.sessionLabel)) || '').trim();
    const labelNumber = Number(label);
    if(Number.isInteger(labelNumber) && labelNumber > 0 && labelNumber <= count){
      return { sessionIndex: labelNumber, source: 'libellé de session existant', ambiguous: false };
    }
    const textValue = String(event && event.libelle || '');
    const match = textValue.match(/\b(?:session\s*)?(\d+)\s*[./]\s*(\d+)\b/i);
    const minor = match ? Number(match[2]) : null;
    if(Number.isInteger(minor) && minor > 0 && minor <= count){
      return { sessionIndex: minor, source: 'indice lisible dans le libellé', ambiguous: false };
    }
    return { sessionIndex: null, source: '', ambiguous: count > 1 };
  }

  async function policySnapshotFromDefinitionVersion(store, version){
    const domain = String(version && version.domain || '').toUpperCase();
    const policyVersionId = version && (version.policy_version_id || version.policyVersionId);
    const policyVersions = store.listParticipationPolicyVersions
      ? await store.listParticipationPolicyVersions({})
      : [];
    const policyVersion = (policyVersions || []).find((row) => String(row.policy_version_id || row.policyVersionId || '') === String(policyVersionId || '')) || null;
    const config = (policyVersion && policyVersion.config) || {};
    return JSON.parse(JSON.stringify({
      kind: 'SCOPE_PARTICIPATION_POLICY',
      capturedAt: new Date().toISOString(),
      domainCode: domain,
      policyVersion: (policyVersion && (policyVersion.version_code || policyVersion.versionCode)) || (version && (version.policyVersionCode || version.policy_version_code)) || participationPolicy.POLICY_VERSION,
      activeStatuses: config.activeStatuses || config.active_statuses || [],
      excuseMotifs: config.excuseMotifs || config.excuse_motifs || [],
      dispenseMotifs: config.dispenseMotifs || config.dispense_motifs || [],
      roles: config.roles || ['PARTICIPANT', 'FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE', 'RENFORT', 'REMPLACANT'],
      behavior: config.behavior || {}
    }));
  }

  function validateParticipationsAgainstPolicy(participations = [], targetPolicy = {}){
    const statuses = new Set((targetPolicy.activeStatuses || targetPolicy.active_statuses || []).map((value) => String(value || '').toUpperCase()));
    const excuseMotifs = new Set((targetPolicy.excuseMotifs || targetPolicy.excuse_motifs || []).map((value) => String(value || '').toUpperCase()));
    const dispenseMotifs = new Set((targetPolicy.dispenseMotifs || targetPolicy.dispense_motifs || []).map((value) => String(value || '').toUpperCase()));
    const invalid = [];
    for(const row of participations || []){
      if(!participationHasBusinessTrace(row)) continue;
      const statut = String(row.statut || '').toUpperCase();
      const motif = String(row.motif_absence || row.motifAbsence || '').toUpperCase();
      if(statut && statuses.size && !statuses.has(statut)){
        invalid.push({ code: 'STATUT_ABSENT_CONFIGURATION', statut, motif });
        continue;
      }
      if(statut === 'ABSENT_EXCUSE' && motif && excuseMotifs.size && !excuseMotifs.has(motif)){
        invalid.push({ code: 'MOTIF_EXCUSE_ABSENT_CONFIGURATION', statut, motif });
      }
      if(statut === 'DISPENSE' && motif && dispenseMotifs.size && !dispenseMotifs.has(motif)){
        invalid.push({ code: 'MOTIF_DISPENSE_ABSENT_CONFIGURATION', statut, motif });
      }
    }
    return invalid;
  }

  async function buildFormationBindingCandidate(store, version, event, targetPolicy){
    const versionId = version && (version.definition_version_id || version.definitionVersionId);
    const mode = String(version && (version.mode_organisation || version.modeOrganisation || 'SIMPLE')).toUpperCase();
    const currentVersionId = event && (event.definition_version_id || event.definitionVersionId);
    const participations = store.listParticipations ? await store.listParticipations(event.evenement_id) : [];
    const businessParticipations = (participations || []).filter(participationHasBusinessTrace);
    const invalidParticipations = validateParticipationsAgainstPolicy(participations, targetPolicy);
    const session = mode === genericCatalog.ORGANISATION_MODES.MULTI_SESSION
      ? inferConfigurationSessionIndex(event, version)
      : { sessionIndex: null, source: '', ambiguous: false };
    let status = 'COMPATIBLE';
    let selectable = true;
    let canDissociate = false;
    let dissociationReason = '';
    let reason = 'Même domaine et date comprise dans la période de validité.';
    if(String(currentVersionId || '') === String(versionId || '')){
      status = 'DEJA_ASSOCIE';
      selectable = false;
      reason = 'Événement déjà associé à cette configuration.';
      canDissociate = String(event.statut || '').toUpperCase() !== 'REALISE';
      dissociationReason = canDissociate
        ? 'Dissociation administrative possible après confirmation.'
        : 'Événement réalisé : association protégée par l’historique.';
    } else if(currentVersionId){
      status = 'AUTRE_CONFIGURATION';
      selectable = false;
      reason = 'Événement déjà associé à une autre configuration.';
    } else if(String(event.domaine_code || '').toUpperCase() !== String(version.domain || '').toUpperCase()){
      status = 'INCOMPATIBLE';
      selectable = false;
      reason = 'Domaine différent.';
    } else if(!eventDateInVersion(event, version)){
      status = 'INCOMPATIBLE';
      selectable = false;
      reason = 'Date hors période de validité.';
    } else if(session.ambiguous){
      status = 'AMBIGU';
      selectable = false;
      reason = 'Numéro de session non déterminé sans ambiguïté.';
    } else if(invalidParticipations.length){
      status = 'INCOMPATIBLE';
      selectable = false;
      reason = 'Des saisies existantes utilisent des règles absentes de la configuration cible.';
    }
    return {
      eventId: event.evenement_id,
      evenementId: event.evenement_id,
      date: dateOnlyText(event.date),
      libelle: event.libelle,
      domaine: event.domaine_code,
      statut: event.statut,
      currentConfiguration: currentVersionId ? 'Associé à une autre configuration' : 'Configuration historique SCOPE',
      currentDefinitionVersionId: currentVersionId || null,
      status,
      selectable,
      reason,
      sessionIndex: session.sessionIndex,
      sessionSource: session.source || null,
      hasParticipations: businessParticipations.length > 0,
      participationCount: businessParticipations.length,
      invalidParticipations,
      canDissociate,
      dissociationReason
    };
  }

  async function previewFormationEventAssociation(definitionVersionId){
    if(!repo.getEventDefinitionVersion) throw new HttpError(501, 'configuration_indisponible', 'Configuration formation indisponible.');
    const version = await repo.getEventDefinitionVersion(definitionVersionId);
    if(!version) throw new HttpError(404, 'definition_version_introuvable', 'Version de définition introuvable.');
    const definitions = repo.listEventDefinitions ? await repo.listEventDefinitions({ status: 'ACTIF' }) : [];
    const definition = (definitions || []).find((row) => String(row.definition_id || row.definitionId || '') === String(version.definition_id || version.definitionId || '')) || null;
    const targetPolicy = await policySnapshotFromDefinitionVersion(repo, version);
    const events = repo.listEvenements
      ? await repo.listEvenements({ domaine: version.domain, from: version.valid_from || version.validFrom, to: version.valid_to || version.validTo })
      : [];
    const candidates = [];
    for(const event of events || []){
      candidates.push(await buildFormationBindingCandidate(repo, version, event, targetPolicy));
    }
    const summary = candidates.reduce((acc, row) => {
      acc.total += 1;
      if(row.status === 'DEJA_ASSOCIE') acc.alreadyAssociated += 1;
      if(row.status === 'COMPATIBLE' && row.selectable) acc.legacySelectable += 1;
      if(row.status === 'AMBIGU') acc.ambiguous += 1;
      if(row.status === 'INCOMPATIBLE') acc.incompatible += 1;
      if(row.status === 'AUTRE_CONFIGURATION') acc.otherConfiguration += 1;
      return acc;
    }, { total: 0, alreadyAssociated: 0, legacySelectable: 0, ambiguous: 0, incompatible: 0, otherConfiguration: 0 });
    return {
      associationPreview: {
        definition: definition ? { code: definition.code, label: definition.label, domain: definition.domain } : null,
        version: {
          definitionVersionId: version.definition_version_id || version.definitionVersionId,
          versionCode: version.version_code || version.versionCode,
          validFrom: dateOnlyText(version.valid_from || version.validFrom),
          validTo: dateOnlyText(version.valid_to || version.validTo),
          modeOrganisation: version.mode_organisation || version.modeOrganisation,
          sessionCount: Number(version.session_count || version.sessionCount || 1)
        },
        targetPolicy: {
          activeStatuses: targetPolicy.activeStatuses || [],
          excuseMotifs: targetPolicy.excuseMotifs || [],
          dispenseMotifs: targetPolicy.dispenseMotifs || []
        },
        summary,
        candidates
      }
    };
  }

  async function associateEventsToFormationConfiguration(definitionVersionId, body = {}, actor){
    if(!repo.getEventDefinitionVersion) throw new HttpError(501, 'configuration_indisponible', 'Configuration formation indisponible.');
    const selected = Array.isArray(body.events) ? body.events : (body.eventIds || body.event_ids || []).map((id) => ({ eventId: id }));
    if(!selected.length) throw new HttpError(400, 'association_vide', 'Sélectionnez au moins un événement à associer.');
    const version = await repo.getEventDefinitionVersion(definitionVersionId);
    if(!version) throw new HttpError(404, 'definition_version_introuvable', 'Version de définition introuvable.');
    const definitions = repo.listEventDefinitions ? await repo.listEventDefinitions({ status: 'ACTIF' }) : [];
    const definition = (definitions || []).find((row) => String(row.definition_id || row.definitionId || '') === String(version.definition_id || version.definitionId || '')) || null;
    const targetPolicy = await policySnapshotFromDefinitionVersion(repo, version);
    const route = genericCatalog.resolveEngineRoute({ domaine_code: version.domain }, { definitionVersion: version });
    const updated = [];
    return repo.withTransaction(async (tx) => {
      for(const item of selected){
        const eventId = item.eventId || item.evenementId || item.evenement_id;
        const event = await tx.getEvent(eventId);
        if(!event) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
        const candidate = await buildFormationBindingCandidate(tx, version, event, targetPolicy);
        const requestedSession = Number(item.sessionIndex || item.session_index || candidate.sessionIndex || 0) || null;
        if(candidate.status === 'AMBIGU' && !requestedSession){
          throw new HttpError(409, 'association_session_ambigue', 'Le numéro de session doit être précisé avant association.', { candidate });
        }
        const sessionResolvedByUser = candidate.status === 'AMBIGU' && requestedSession;
        if(!candidate.selectable && candidate.status !== 'COMPATIBLE' && !sessionResolvedByUser){
          throw new HttpError(409, 'association_incompatible', candidate.reason || 'Association incompatible.', { candidate });
        }
        if(candidate.hasParticipations && !body.confirmExistingParticipations && !body.confirm_existing_participations){
          throw new HttpError(409, 'association_saisies_existantes', 'Cet événement contient déjà des saisies. Confirmez l’association après contrôle de compatibilité.', { candidate });
        }
        const eventSnapshot = genericCatalog.snapshotDefinitionVersion(definition || { code: version.definitionCode, label: version.definitionLabel, domain: version.domain }, version, {
          policy_version_id: version.policy_version_id || version.policyVersionId,
          policy_code: version.policyCode || version.policy_code,
          version_code: version.policyVersionCode || version.policy_version_code
        });
        eventSnapshot.association = { origin: 'MANUAL', label: 'Association manuelle', at: new Date().toISOString(), by: actorId(actor) };
        const patch = {
          definition_version_id: version.definition_version_id || version.definitionVersionId,
          policy_version_id: version.policy_version_id || version.policyVersionId || null,
          engine_route: route,
          engine_snapshot: eventSnapshot
        };
        if(requestedSession) {
          patch.session_index = requestedSession;
          patch.session_label = `${requestedSession}/${Number(version.session_count || version.sessionCount || 1)}`;
        }
        if(String(event.statut || '').toUpperCase() !== 'REALISE'){
          patch.participation_policy_version = targetPolicy.policyVersion;
          patch.participation_policy_snapshot = targetPolicy;
        }
        const next = await bumpOrConflict(tx, eventId, event.version, patch);
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: eventId,
          action: 'ASSOCIER_CONFIGURATION_FORMATION',
          commentaire: body.commentaire || 'Association manuelle à une configuration de formation',
          avant: {
            definition_version_id: event.definition_version_id || null,
            policy_version_id: event.policy_version_id || null,
            participation_policy_snapshot: event.participation_policy_snapshot || null
          },
          apres: {
            definition_version_id: patch.definition_version_id,
            policy_version_id: patch.policy_version_id,
            session_index: patch.session_index || null,
            preserveHistoricalSnapshot: String(event.statut || '').toUpperCase() === 'REALISE'
          }
        });
        updated.push(next);
      }
      return { associatedEvents: updated, count: updated.length };
    });
  }

  async function dissociateEventsFromFormationConfiguration(definitionVersionId, body = {}, actor){
    if(!repo.getEventDefinitionVersion) throw new HttpError(501, 'configuration_indisponible', 'Configuration formation indisponible.');
    const selectedIds = (body.eventIds || body.event_ids || (body.eventId ? [body.eventId] : [])).map(String).filter(Boolean);
    if(!selectedIds.length) throw new HttpError(400, 'dissociation_vide', 'Sélectionnez au moins un événement à dissocier.');
    const version = await repo.getEventDefinitionVersion(definitionVersionId);
    if(!version) throw new HttpError(404, 'definition_version_introuvable', 'Version de définition introuvable.');
    const updated = [];
    return repo.withTransaction(async (tx) => {
      for(const eventId of selectedIds){
        const event = await tx.getEvent(eventId);
        if(!event) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
        const eventVersionId = event.definition_version_id || event.definitionVersionId;
        const sameEventBinding = String(eventVersionId || '') === String(definitionVersionId || '');
        let exercise = null;
        if(event.exercice_id && tx.getExercise) exercise = await tx.getExercise(event.exercice_id);
        const exerciseVersionId = exercise && (exercise.definition_version_id || exercise.definitionVersionId);
        const sameExerciseBinding = String(exerciseVersionId || '') === String(definitionVersionId || '');
        if(!sameEventBinding && !sameExerciseBinding){
          throw new HttpError(409, 'dissociation_configuration_invalide', 'Cet événement n’est pas associé à cette configuration.', { eventId, definitionVersionId });
        }
        if(String(event.statut || '').toUpperCase() === 'REALISE'){
          throw new HttpError(409, 'dissociation_realise_interdite', 'Dissociation impossible. Cet événement est réalisé et son association fait partie de son historique.', { eventId });
        }
        const exerciseEvents = exercise && tx.listExerciseEvents ? await tx.listExerciseEvents(exercise.exercice_id || event.exercice_id) : [];
        const configuredExerciseEvents = (exerciseEvents || []).filter((row) =>
          String(row.definition_version_id || row.definitionVersionId || exerciseVersionId || '') === String(definitionVersionId || '')
        );
        const groupDissociation = body.scope === 'GROUP' || body.scope === 'FORMATION_GROUPEE';
        if(exercise && String(exercise.mode_session || exercise.modeSession || '').toUpperCase() === 'MULTI' && configuredExerciseEvents.length > 1 && !groupDissociation){
          throw new HttpError(409, 'dissociation_partielle_multisession_interdite', 'Dissociation impossible : cette configuration porte une formation groupée. Utilisez une dissociation de la formation groupée complète afin de préserver la cohérence des sessions.', {
            eventId,
            exerciseId: exercise.exercice_id || event.exercice_id,
            affectedEvents: configuredExerciseEvents.map((row) => row.evenement_id || row.evenementId)
          });
        }
        const targets = groupDissociation && configuredExerciseEvents.length ? configuredExerciseEvents : [event];
        for(const target of targets){
          const targetId = target.evenement_id || target.evenementId;
          const current = await tx.getEvent(targetId);
          if(!current) continue;
          if(String(current.statut || '').toUpperCase() === 'REALISE'){
            throw new HttpError(409, 'dissociation_realise_interdite', 'Dissociation impossible. Au moins une session est réalisée et son association fait partie de son historique.', { eventId: targetId });
          }
          const participations = tx.listParticipations ? await tx.listParticipations(targetId) : [];
          const businessParticipations = (participations || []).filter(participationHasBusinessTrace);
          const defaultPolicy = await capturePolicySnapshot(tx, current.domaine_code || current.domaineCode);
          const invalid = validateParticipationsAgainstPolicy(participations, defaultPolicy);
          if(businessParticipations.length && invalid.length){
            throw new HttpError(409, 'dissociation_saisies_incompatibles', 'Dissociation impossible : des saisies existantes utilisent des règles absentes de la configuration historique SCOPE.', {
              eventId: targetId,
              invalidParticipations: invalid
            });
          }
          const patch = {
            definition_version_id: null,
            policy_version_id: null,
            engine_route: null,
            engine_snapshot: null,
            participation_policy_version: defaultPolicy.policyVersion,
            participation_policy_snapshot: defaultPolicy
          };
          const next = await bumpOrConflict(tx, targetId, current.version, patch);
          await tx.appendJournal({
            auteur_id: actorId(actor),
            entite: 'evenement',
            entite_id: targetId,
            action: 'DISSOCIER_CONFIGURATION_FORMATION',
            commentaire: body.commentaire || 'Dissociation manuelle d’une configuration de formation',
            avant: {
              definition_version_id: current.definition_version_id || null,
              policy_version_id: current.policy_version_id || null,
              engine_route: current.engine_route || null
            },
            apres: {
              definition_version_id: null,
              policy_version_id: null,
              configuration: 'Configuration historique SCOPE',
              participationsPreserved: businessParticipations.length
            }
          });
          updated.push(next);
        }
        if(groupDissociation && sameExerciseBinding && exercise && tx.updateExercise){
          await tx.updateExercise(exercise.exercice_id || event.exercice_id, {
            definition_version_id: null,
            policy_version_id: null,
            engine_route: null,
            configuration_snapshot: null
          });
        }
      }
      return { dissociatedEvents: updated, count: updated.length };
    });
  }

  function normalizedPolicyConfig(config = {}){
    return {
      activeStatuses: (config.activeStatuses || config.active_statuses || []).map((value) => String(value || '').toUpperCase()).filter(Boolean),
      excuseMotifs: (config.excuseMotifs || config.excuse_motifs || []).map((value) => String(value || '').toUpperCase()).filter(Boolean),
      dispenseMotifs: (config.dispenseMotifs || config.dispense_motifs || []).map((value) => String(value || '').toUpperCase()).filter(Boolean)
    };
  }

  function removedPolicyElements(previousConfig = {}, nextConfig = {}){
    const previous = normalizedPolicyConfig(previousConfig);
    const next = normalizedPolicyConfig(nextConfig);
    const without = (before, after) => before.filter((value) => !after.includes(value));
    return {
      statuses: without(previous.activeStatuses, next.activeStatuses).filter((value) => value !== 'NON_RENSEIGNE'),
      excuseMotifs: without(previous.excuseMotifs, next.excuseMotifs),
      dispenseMotifs: without(previous.dispenseMotifs, next.dispenseMotifs)
    };
  }

  function removedPolicyElementsEmpty(removed){
    return !((removed.statuses || []).length || (removed.excuseMotifs || []).length || (removed.dispenseMotifs || []).length);
  }

  function participationUsesRemovedPolicyElement(participation, removed){
    const statut = String(participation && participation.statut || '').toUpperCase();
    const motif = String(participation && (participation.motif_absence || participation.motifAbsence) || '').toUpperCase();
    if((removed.statuses || []).includes(statut)) return { kind: 'status', id: statut };
    if(statut === 'ABSENT_EXCUSE' && (removed.excuseMotifs || []).includes(motif)) return { kind: 'motif', id: motif };
    if(statut === 'DISPENSE' && (removed.dispenseMotifs || []).includes(motif)) return { kind: 'motif', id: motif };
    return null;
  }

  async function validateFormationConfigurationRemoval(store, versionId, previousConfig, nextConfig){
    const removed = removedPolicyElements(previousConfig, nextConfig);
    if(removedPolicyElementsEmpty(removed)) return { removed, protectedUsages: [] };
    const eventsByVersion = store.listEventsByDefinitionVersions ? await store.listEventsByDefinitionVersions([versionId]) : {};
    const events = eventsByVersion[versionId] || [];
    const protectedUsages = [];
    for(const event of events){
      const participations = store.listParticipations ? await store.listParticipations(event.evenement_id || event.evenementId) : [];
      for(const participation of participations || []){
        if(!participationHasBusinessTrace(participation)) continue;
        const hit = participationUsesRemovedPolicyElement(participation, removed);
        if(hit){
          protectedUsages.push({
            eventId: event.evenement_id || event.evenementId,
            date: dateOnlyText(event.date),
            libelle: event.libelle,
            statut: event.statut,
            kind: hit.kind,
            id: hit.id
          });
        }
      }
    }
    if(protectedUsages.length){
      throw new HttpError(409, 'configuration_element_utilise', 'Impossible de retirer cet élément : il a déjà été utilisé dans une ou plusieurs participations. Il doit être conservé afin de préserver l’historique.', {
        removed,
        usages: protectedUsages.slice(0, 50),
        participationCount: protectedUsages.length
      });
    }
    return { removed, protectedUsages };
  }

  async function createEventDefinition(body, actor){
    if(!repo.upsertEventDefinition || !repo.upsertEventDefinitionVersion){
      throw new HttpError(501, 'catalogue_indisponible', 'Le catalogue formation n’est pas disponible sur ce stockage.');
    }
    const definition = genericCatalog.normalizeDefinition(body || {});
    const policyVersions = repo.listParticipationPolicyVersions ? await repo.listParticipationPolicyVersions({ domain: definition.domain, active: true }) : [];
    const requestedMode = genericCatalog.normalizeDefinitionVersion({
      ...body,
      domain: definition.domain,
      mode_organisation: body.modeOrganisation || body.mode_organisation || body.mode || body.modeSession,
      session_count: body.sessionCount || body.session_count || body.nombreSessionsAttendu
    }).mode_organisation;
    const isMultiSession = requestedMode === genericCatalog.ORGANISATION_MODES.MULTI_SESSION;
    const compatibleMultiPolicy = isMultiSession
      ? (policyVersions || []).find((row) => !((row.config && row.config.activeStatuses) || []).map((status) => String(status || '').toUpperCase()).includes('PERMUTATION'))
      : null;
    const editDefinitionVersionId = body.definitionVersionId || body.definition_version_id || body.editDefinitionVersionId || null;
    const editedVersion = editDefinitionVersionId && repo.getEventDefinitionVersion
      ? await repo.getEventDefinitionVersion(editDefinitionVersionId)
      : null;
    let policyVersion = (policyVersions || []).find((row) => String(row.policy_version_id || row.policyVersionId) === String(body.policyVersionId || body.policy_version_id))
      || (editedVersion && (policyVersions || []).find((row) => String(row.policy_version_id || row.policyVersionId || '') === String(editedVersion.policy_version_id || editedVersion.policyVersionId || '')))
      || compatibleMultiPolicy
      || (policyVersions || [])[0]
      || null;
    if(!policyVersion && repo.upsertParticipationPolicyVersion){
      const policySnapshot = await capturePolicySnapshot(repo, definition.domain);
      policyVersion = await repo.upsertParticipationPolicyVersion(genericCatalog.policyVersionFromDomainPolicy(policySnapshot, { year: Number(body.year || body.annee || 2026) }));
    }
    if(body && body.policyConfig && repo.upsertParticipationPolicyVersion){
      const year = Number(body.year || body.annee || new Date().getFullYear());
      const baseConfig = Object.assign({}, policyVersion && policyVersion.config || await capturePolicySnapshot(repo, definition.domain));
      const activeStatuses = ['NON_RENSEIGNE', ...new Set((body.policyConfig.activeStatuses || baseConfig.activeStatuses || [])
        .map((status) => String(status || '').toUpperCase())
        .filter((status) => status && status !== 'NON_RENSEIGNE'))]
        .filter((status) => !(isMultiSession && status === 'PERMUTATION'));
      const nextConfig = Object.assign({}, baseConfig, {
        domainCode: definition.domain,
        policyVersion: `formation-${definition.code.toLowerCase()}-${year}`,
        activeStatuses,
        excuseMotifs: (body.policyConfig.excuseMotifs || baseConfig.excuseMotifs || []).map((m) => String(m || '').toUpperCase()).filter(Boolean),
        dispenseMotifs: (body.policyConfig.dispenseMotifs || baseConfig.dispenseMotifs || []).map((m) => String(m || '').toUpperCase()).filter(Boolean),
        roles: baseConfig.roles || [],
        behavior: Object.assign({}, baseConfig.behavior || {}, isMultiSession ? {
          propagationScope: 'ALL_EXERCISE_SESSIONS',
          deduplicationScope: 'EXERCISE'
        } : {})
      });
      if(editedVersion && String(editedVersion.policy_version_id || editedVersion.policyVersionId || '') === String(policyVersion && (policyVersion.policy_version_id || policyVersion.policyVersionId) || '')){
        await validateFormationConfigurationRemoval(repo, editedVersion.definition_version_id || editedVersion.definitionVersionId, baseConfig, nextConfig);
      }
      policyVersion = await repo.upsertParticipationPolicyVersion({
        policy_code: `${definition.code}-REGLES`,
        domain: definition.domain,
        version_code: String(year),
        valid_from: body.validFrom || body.valid_from || `${year}-01-01`,
        valid_to: body.validTo || body.valid_to || `${year}-12-31`,
        config: nextConfig,
        metadata: { source: 'configuration_formation_metier', generated: true }
      });
    }
    const versionInput = genericCatalog.validateDefinitionVersion({
      ...body,
      definition_id: definition.definition_id,
      domain: definition.domain,
      policy_version_id: policyVersion && (policyVersion.policy_version_id || policyVersion.policyVersionId),
      valid_from: body.validFrom || body.valid_from || `${Number(body.year || body.annee || 2026)}-01-01`,
      valid_to: body.validTo || body.valid_to || `${Number(body.year || body.annee || 2026)}-12-31`,
      mode_organisation: body.modeOrganisation || body.mode_organisation || body.mode || body.modeSession,
      session_count: body.sessionCount || body.session_count || body.nombreSessionsAttendu
    }, policyVersion && policyVersion.config);
    return repo.withTransaction(async (tx) => {
      const savedDefinition = await tx.upsertEventDefinition(definition);
      const savedVersion = await tx.upsertEventDefinitionVersion(Object.assign({}, versionInput, {
        definition_id: savedDefinition.definition_id || savedDefinition.definitionId
      }));
      if(body && body.policyConfig && editDefinitionVersionId && String(savedVersion.definition_version_id || savedVersion.definitionVersionId || '') === String(editDefinitionVersionId)){
        const refreshedPolicy = await policySnapshotFromDefinitionVersion(tx, savedVersion);
        const eventsByVersion = tx.listEventsByDefinitionVersions ? await tx.listEventsByDefinitionVersions([editDefinitionVersionId]) : {};
        const linkedEvents = eventsByVersion[editDefinitionVersionId] || [];
        for(const event of linkedEvents){
          if(String(event.statut || '').toUpperCase() === 'REALISE') continue;
          const eventId = event.evenement_id || event.evenementId;
          const current = await tx.getEvent(eventId);
          if(!current) continue;
          const eventSnapshot = genericCatalog.snapshotDefinitionVersion(savedDefinition, savedVersion, {
            policy_version_id: savedVersion.policy_version_id || savedVersion.policyVersionId,
            policy_code: savedVersion.policyCode || savedVersion.policy_code,
            version_code: savedVersion.policyVersionCode || savedVersion.policy_version_code
          });
          eventSnapshot.association = Object.assign({}, (current.engine_snapshot && current.engine_snapshot.association) || {}, {
            origin: ((current.engine_snapshot && current.engine_snapshot.association) || {}).origin || 'MANUAL',
            label: ((current.engine_snapshot && current.engine_snapshot.association) || {}).label || 'Association administrative',
            updatedAt: new Date().toISOString()
          });
          await tx.updateEventIfVersion(eventId, current.version, {
            policy_version_id: savedVersion.policy_version_id || savedVersion.policyVersionId || null,
            engine_snapshot: eventSnapshot,
            participation_policy_version: refreshedPolicy.policyVersion,
            participation_policy_snapshot: refreshedPolicy
          });
        }
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'event_definition',
        entite_id: savedDefinition.definition_id || savedDefinition.definitionId,
        action: 'CREER_DEFINITION_EXERCICE',
        apres: {
          code: savedDefinition.code,
          domain: savedDefinition.domain,
          versionId: savedVersion.definition_version_id || savedVersion.definitionVersionId,
          mode: savedVersion.mode_organisation || savedVersion.modeOrganisation
        }
      });
      return { definition: savedDefinition, version: savedVersion };
    });
  }

  async function reconductEventDefinitionVersion(versionId, body, actor){
    if(!repo.getEventDefinitionVersion || !repo.upsertEventDefinitionVersion){
      throw new HttpError(501, 'catalogue_indisponible', 'Le catalogue formation n’est pas disponible sur ce stockage.');
    }
    const current = await repo.getEventDefinitionVersion(versionId);
    if(!current) throw new HttpError(404, 'definition_version_introuvable', 'Version de définition introuvable.');
    const targetYear = Number(body?.year || body?.annee);
    let next;
    try {
      next = genericCatalog.reconductDefinitionVersion(current, targetYear, body?.patch || {});
    } catch (error) {
      throw new HttpError(400, 'reconduction_invalide', error.message);
    }
    if(repo.listParticipationPolicyVersions && repo.upsertParticipationPolicyVersion){
      const policies = await repo.listParticipationPolicyVersions({ domain: current.domain, active: true });
      const currentPolicy = (policies || []).find((row) => String(row.policy_version_id || row.policyVersionId || '') === String(current.policy_version_id || current.policyVersionId || ''));
      if(currentPolicy){
        const clonedPolicy = await repo.upsertParticipationPolicyVersion({
          policy_code: currentPolicy.policy_code || currentPolicy.policyCode,
          domain: currentPolicy.domain,
          version_code: String(targetYear),
          valid_from: `${targetYear}-01-01`,
          valid_to: `${targetYear}-12-31`,
          config: Object.assign({}, currentPolicy.config || {}, {
            policyVersion: `${currentPolicy.policy_code || currentPolicy.policyCode}-${targetYear}`
          }),
          metadata: Object.assign({}, currentPolicy.metadata || {}, { reconductedFrom: currentPolicy.policy_version_id || currentPolicy.policyVersionId })
        });
        next.policy_version_id = clonedPolicy.policy_version_id || clonedPolicy.policyVersionId;
      }
    }
    const saved = await repo.upsertEventDefinitionVersion(next);
    await repo.appendJournal({
      auteur_id: actorId(actor),
      entite: 'event_definition_version',
      entite_id: saved.definition_version_id || saved.definitionVersionId,
      action: 'RECONDUIRE_VERSION_EXERCICE',
      avant: { versionId },
      apres: { targetYear }
    });
    return { version: saved };
  }

  async function saveParticipationPolicy(domainCode, body, actor){
    const code = participationPolicy.normalizeDomain(domainCode);
    if(!code) throw new HttpError(400, 'domaine_invalide', 'Domaine invalide.');
    const motifRows = await participationMotifRows(repo);
    const base = participationPolicy.resolveParticipationPolicy(code, { motifRows, policyRows: await participationPolicyRows(repo) });
    const next = participationPolicy.resolveParticipationPolicy(code, {
      motifRows,
      policyRows: [{
        domain_code: code,
        policy_version: participationPolicy.POLICY_VERSION,
        config: Object.assign({}, base, body || {}, {
          domainCode: code,
          activeStatuses: ['NON_RENSEIGNE', ...new Set((body && body.activeStatuses || base.activeStatuses || []).map((value) => String(value || '').toUpperCase()))],
          behavior: Object.assign({}, base.behavior, (body && body.behavior) || {})
        })
      }]
    });
    await repo.upsertParticipationPolicy({
      domain_code: code,
      policy_version: next.policyVersion,
      config: next,
      actif: true,
      commentaire: body && body.commentaire,
      auteur_id: actorId(actor)
    });
    if(repo.appendJournal){
      await repo.appendJournal({
        auteur_id: actorId(actor),
        entite: 'participation_policy',
        entite_id: code,
        action: 'MODIFIER_POLITIQUE',
        apres: next
      });
    }
    return { policy: policyPayload(next, motifRows) };
  }

  async function saveParticipationMotif(body, actor){
    body = body || {};
    const motifRows = await participationMotifRows(repo);
    const label = String(body && (body.label || body.libelle) || '').trim();
    const inputMotifType = String(body && (body.motifType || body.motif_type || body.type) || 'EXCUSE').trim().toUpperCase();
    const generatedId = generateReferentialId(label || inputMotifType, new Set((motifRows || []).map((row) => String(row.motif_id || row.id || '').toUpperCase())));
    const motifId = String(body && (body.motifId || body.motif_id || body.id) || generatedId || '').trim().toUpperCase();
    if(!motifId) throw new HttpError(400, 'motif_invalide', 'Identifiant motif obligatoire.');
    const existing = (motifRows || []).find((row) => String(row.motif_id || row.id || '').trim().toUpperCase() === motifId);
    const motifType = String(existing && (existing.motif_type || existing.type) || inputMotifType).trim().toUpperCase();
    const row = {
      motif_id: motifId,
      motif_type: motifType,
      label: label || motifId,
      actif: body.actif !== false && body.active !== false,
      historique: Boolean(body.historique || body.historical),
      display_order: Number(body.displayOrder || body.display_order || body.order || 999),
      group_code: String(body.groupCode || body.group_code || body.group || 'operationnel').trim() || 'operationnel',
      metadata: body.metadata || {}
    };
    if(!row.label) throw new HttpError(400, 'motif_libelle_vide', 'Libellé motif obligatoire.');
    const saved = await repo.upsertParticipationMotif(row);
    if(repo.appendJournal){
      await repo.appendJournal({
        auteur_id: actorId(actor),
        entite: 'participation_motif',
        entite_id: motifId,
        action: 'MODIFIER_MOTIF',
        apres: saved
      });
    }
    return { motif: saved };
  }

  async function deleteParticipationMotif(motifId, actor){
    const id = String(motifId || '').trim().toUpperCase();
    if(!id) throw new HttpError(400, 'motif_invalide', 'Identifiant motif obligatoire.');
    const usage = repo.getParticipationReferentialUsage
      ? await repo.getParticipationReferentialUsage('motif', id)
      : { count: 0, details: {} };
    if(Number(usage && usage.count || 0) > 0){
      throw new HttpError(409, 'referentiel_utilise', 'Suppression impossible : ce motif a déjà été utilisé. Il doit être archivé afin de préserver l’historique.', { usage });
    }
    const deleted = repo.deleteParticipationMotif ? await repo.deleteParticipationMotif(id) : false;
    if(!deleted) throw new HttpError(404, 'motif_introuvable', 'Motif introuvable.');
    if(repo.appendJournal){
      await repo.appendJournal({
        auteur_id: actorId(actor),
        entite: 'participation_motif',
        entite_id: id,
        action: 'SUPPRIMER_MOTIF',
        apres: { motif_id: id }
      });
    }
    return { deleted: true, motifId: id };
  }

  async function saveParticipationStatus(body, actor){
    body = body || {};
    const statusRows = await participationStatusRows(repo);
    const label = String(body && (body.label || body.libelle) || '').trim();
    if(!label) throw new HttpError(400, 'statut_libelle_vide', 'Libellé statut obligatoire.');
    const requestedId = String(body && (body.statusId || body.status_id || body.id) || '').trim().toUpperCase();
    const existing = (statusRows || []).find((row) => String(row.status_id || row.id || '').trim().toUpperCase() === requestedId);
    const baseStatus = String(existing && (existing.base_status || existing.baseStatus) || body && (body.baseStatus || body.base_status) || 'PRESENT').trim().toUpperCase();
    if(!['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE'].includes(baseStatus)){
      throw new HttpError(422, 'statut_base_invalide', 'Choisissez un comportement compatible : présence, excuse, absence ou dispense.');
    }
    const existingIds = new Set([
      ...Object.keys(participationPolicy.STATUS_LIBRARY),
      ...(statusRows || []).map((row) => String(row.status_id || row.id || '').toUpperCase())
    ]);
    const statusId = String(requestedId || generateReferentialId(label, existingIds)).trim().toUpperCase();
    const base = participationPolicy.STATUS_LIBRARY[baseStatus] || {};
    const row = {
      status_id: statusId,
      label,
      base_status: baseStatus,
      actif: body.actif !== false && body.active !== false,
      historique: Boolean(body.historique || body.historical),
      display_order: Number(body.displayOrder || body.display_order || body.order || base.order || 999),
      group_code: String(body.groupCode || body.group_code || body.group || 'operationnel').trim() || 'operationnel',
      metadata: Object.assign({}, body.metadata || {}, { configurable: true })
    };
    const saved = repo.upsertParticipationStatus ? await repo.upsertParticipationStatus(row) : row;
    if(repo.appendJournal){
      await repo.appendJournal({
        auteur_id: actorId(actor),
        entite: 'participation_status',
        entite_id: statusId,
        action: row.actif ? 'MODIFIER_STATUT' : 'ARCHIVER_STATUT',
        apres: saved
      });
    }
    return { status: saved };
  }

  async function deleteParticipationStatus(statusId, actor){
    const id = String(statusId || '').trim().toUpperCase();
    if(!id) throw new HttpError(400, 'statut_invalide', 'Identifiant statut obligatoire.');
    if(id === 'NON_RENSEIGNE' || id === 'PERMUTATION'){
      throw new HttpError(422, 'statut_protege', 'Ce statut est protégé par les règles métier SCOPE.');
    }
    const usage = repo.getParticipationReferentialUsage
      ? await repo.getParticipationReferentialUsage('status', id)
      : { count: 0, details: {} };
    if(Number(usage && usage.count || 0) > 0){
      throw new HttpError(409, 'referentiel_utilise', 'Suppression impossible : ce statut a déjà été utilisé. Il doit être archivé afin de préserver l’historique.', { usage });
    }
    const deleted = repo.deleteParticipationStatus ? await repo.deleteParticipationStatus(id) : false;
    if(!deleted) throw new HttpError(404, 'statut_introuvable', 'Statut introuvable.');
    if(repo.appendJournal){
      await repo.appendJournal({
        auteur_id: actorId(actor),
        entite: 'participation_status',
        entite_id: id,
        action: 'SUPPRIMER_STATUT',
        apres: { status_id: id }
      });
    }
    return { deleted: true, statusId: id };
  }

  function comparePeopleByGradeName(a, b){
    const rankOf = (value) => {
      const code = referentialDisplay.canonicalGradeCode ? referentialDisplay.canonicalGradeCode(value) : String(value || '').trim();
      const row = (referentialDisplay.GRADES || []).find((item) => item.code === code);
      return row ? Number(row.rang) : null;
    };
    const ra = rankOf(a?.grade);
    const rb = rankOf(b?.grade);
    let grade = 0;
    if(ra !== null && rb !== null && ra !== rb) grade = rb - ra;
    else if(ra !== null && rb === null) grade = -1;
    else if(ra === null && rb !== null) grade = 1;
    else if(ra === null && rb === null){
      grade = String(a?.grade || '').localeCompare(String(b?.grade || ''), 'fr', { sensitivity: 'base', numeric: true });
    }
    return grade
      || String(a?.nom || '').localeCompare(String(b?.nom || ''), 'fr', { sensitivity: 'base', numeric: true })
      || String(a?.prenom || '').localeCompare(String(b?.prenom || ''), 'fr', { sensitivity: 'base', numeric: true })
      || String(a?.nip || '').localeCompare(String(b?.nip || ''), 'fr', { sensitivity: 'base', numeric: true });
  }

  async function referentiels(){
    const [domaines, cibles, suivi, participation, catalogue] = await Promise.all([
      repo.listDomaines(),
      repo.listCibles(),
      repo.listSuiviNominatif ? repo.listSuiviNominatif() : Promise.resolve([]),
      participationPolicies(),
      formationCatalog()
    ]);
    const mappedDomaines = domaines.map(d => ({
      code: d.code,
      libelle: d.libelle,
      libelleAffiche: domaineAffiche(d.code, d),
      nature: d.nature || (d.parent_code ? 'SOUS_DOMAINE' : 'DOMAINE'),
      parentCode: d.parent_code || d.parentCode || null,
      actif: d.actif !== false
    }));
    const mappedCibles = cibles.map(c => ({
      cibleId: c.cible_id,
      domaineCode: c.domaine_code,
      niveauCode: c.niveau_code,
      libelle: c.libelle,
      actif: c.actif !== false
    }));
    const roots = mappedDomaines.filter((d) => d.nature !== 'SOUS_DOMAINE' && !d.parentCode);
    const arbre = roots.map((d) => ({
      ...d,
      sousDomaines: mappedDomaines.filter((s) => s.parentCode === d.code).map((s) => ({
        ...s,
        cibles: mappedCibles.filter((c) => c.domaineCode === s.code)
      })),
      cibles: mappedCibles.filter((c) => c.domaineCode === d.code)
    }));
    return {
      domaines: mappedDomaines,
      cibles: mappedCibles,
      arbre,
      formationCatalog: catalogue.formationCatalog,
      suiviNominatif: (suivi || []).map((row) => ({
        suiviId: row.suivi_id || row.suiviId,
        portee: row.portee,
        domaineCode: row.domaine_code || row.domaineCode || null,
        sousDomaineCode: row.sous_domaine_code || row.sousDomaineCode || null,
        cibleId: row.cible_id || row.cibleId || null,
        nominatifAutorise: row.nominatif_autorise !== false && row.nominatifAutorise !== false,
        dateDebut: row.date_debut || row.dateDebut,
        dateFin: row.date_fin || row.dateFin || null,
        commentaire: row.commentaire || null
      })),
      personnelTemporel: {
        typesPeriode: Object.values(TYPES_PERIODE),
        motifsIndisponible: Object.values(MOTIFS_INDISPONIBLE)
      },
      participation: participation.participation
    };
  }

  async function listPersonnes(query){
    const personnes = await repo.listPersonnes({ q: query?.q });
    const date = isoDate(query?.date);
    if(!date) return { personnes };
    const result = [];
    for(const personne of personnes){
      const affectations = await repo.listAffectations({ personneId: personne.personne_id, date });
      result.push({ ...personne, affectations });
    }
    return { personnes: result };
  }

  async function countPersonnes(){
    if(repo.countPersonnes){
      return { count: await repo.countPersonnes() };
    }
    const personnes = await repo.listPersonnes({});
    return { count: personnes.length };
  }

  async function affectationsValides(personneId, date){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const affectations = await repo.listAffectations({ personneId, date: isoDate(date) });
    const enriched = [];
    for(const a of affectations){
      const cible = await repo.getCible(a.cible_id);
      enriched.push({ ...a, cible });
    }
    return { personne, affectations: enriched };
  }

  async function createEvenement(body, actor){
    const date = isoDate(body.date);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’événement invalide.');
    let domaine = String(body.domaineCode || body.domaine_code || '').trim();
    const sousDomaineRequested = String(body.sousDomaineCode || body.sous_domaine_code || '').trim().toUpperCase();
    const domaines = await repo.listDomaines();
    if(!domaines.some(d => d.code === domaine && d.actif !== false)){
      throw new HttpError(400, 'domaine_inconnu', 'Domaine inconnu.');
    }
    if(domaine === 'FOSPEC' && (sousDomaineRequested === 'PR' || sousDomaineRequested === 'AUTO')){
      domaine = sousDomaineRequested;
    }
    const libelle = String(body.libelle || '').trim();
    if(!libelle) throw new HttpError(400, 'libelle_vide', 'Le libellé est obligatoire.');
    let cibleIds = Array.isArray(body.cibleIds || body.cible_ids) ? (body.cibleIds || body.cible_ids) : [];
    if(!cibleIds.length) throw new HttpError(400, 'cibles_obligatoires', 'Au moins une cible est obligatoire.');
    const cibles = await repo.listCibles();
    const resolvedCibles = [];
    for(const id of cibleIds){
      const cible = cibles.find(c => c.cible_id === id);
      if(!cible){
        throw new HttpError(400, 'cible_invalide', 'Cible inconnue ou hors domaine.');
      }
      resolvedCibles.push(cible);
    }
    const leafDomaines = [...new Set(resolvedCibles.map((c) => c.domaine_code))];
    const leaf = leafDomaines[0];
    if(leafDomaines.length === 1 && domaine !== leaf){
      if(domaine === 'FOSPEC' && isSousDomaineFospec(leaf)) domaine = leaf;
      else throw new HttpError(400, 'cible_invalide', 'Cible inconnue ou hors domaine.');
    }
    const origine = body.origine === 'LEGACY_AGGREGATED' ? 'LEGACY_AGGREGATED' : 'NOMINATIF';
    let modeSuivi = inferModeSuivi({ origine, mode_suivi: body.modeSuivi || body.mode_suivi });
    if(origine === 'LEGACY_AGGREGATED') modeSuivi = MODES.LEGACY;
    else {
      const requested = String(body.modeSuivi || body.mode_suivi || '').toUpperCase();
      if(requested === MODES.LEGACY){
        throw new HttpError(400, 'mode_legacy_interdit', 'Le mode historique agrégé ne peut pas être choisi à la création manuelle.');
      }
      if(requested === MODES.QUANTITATIF) modeSuivi = MODES.QUANTITATIF;
      else if(requested === MODES.NOMINATIF) modeSuivi = MODES.NOMINATIF;
      else modeSuivi = MODES.NOMINATIF;
    }
    if(modeSuivi === MODES.NOMINATIF && origine !== 'LEGACY_AGGREGATED'){
      const rules = repo.listSuiviNominatif ? await repo.listSuiviNominatif() : [];
      const resolution = resolveSuiviNominatif(rules, {
        date,
        domaineCode: domaine,
        sousDomaineCode: isSousDomaineFospec(domaine) ? domaine : null,
        cibleId: cibleIds[0]
      });
      if(resolution.possible === false){
        throw new HttpError(422, 'nominatif_non_autorise', 'Le suivi nominatif n’est pas autorisé pour ce périmètre à cette date.');
      }
    }
    const codeCours = await nextManualCode(repo, body, cibleIds);
    const requestedDefinitionVersionId = body.definitionVersionId || body.definition_version_id || null;
    const definitionVersion = requestedDefinitionVersionId && repo.getEventDefinitionVersion
      ? await repo.getEventDefinitionVersion(requestedDefinitionVersionId)
      : null;
    if(requestedDefinitionVersionId && !definitionVersion){
      throw new HttpError(400, 'definition_version_introuvable', 'Version de définition introuvable.');
    }
    const genericEngineRoute = definitionVersion
      ? genericCatalog.resolveEngineRoute({ domaine_code: domaine }, { definitionVersion })
      : null;
    const definitionMode = definitionVersion && (definitionVersion.mode_organisation || definitionVersion.modeOrganisation);
    const isGenericMulti = definitionMode === genericCatalog.ORGANISATION_MODES.MULTI_SESSION;
    const sessionConfig = normalizeSessionConfig(Object.assign({}, body, isGenericMulti ? {
      modeSession: 'MULTI',
      nombreSessionsAttendu: Number(definitionVersion.session_count || definitionVersion.sessionCount || 2)
    } : {}));
    const temporal = normalizeEventTemporal(body);
    return repo.withTransaction(async (tx) => {
      cibleIds = await expandDapGroupedCibles(tx, domaine, libelle, cibleIds);
      const snapshot = definitionVersion
        ? await policySnapshotFromDefinitionVersion(tx, definitionVersion)
        : await capturePolicySnapshot(tx, domaine);
      let exercice = null;
      if(sessionConfig.modeSession === 'MULTI' || isGenericMulti){
        const sessionCount = isGenericMulti ? Number(definitionVersion.session_count || definitionVersion.sessionCount || sessionConfig.nombreSessionsAttendu) : sessionConfig.nombreSessionsAttendu;
        exercice = await tx.upsertExercise({
          exercice_key: exerciseKeyFromParts('manual', body.exerciceCode || body.exercice_code || codeCours, date, body.exerciceLibelle || body.exercice_libelle || libelle),
          domaine_code: domaine,
          code: body.exerciceCode || body.exercice_code || codeCours,
          libelle: String(body.exerciceLibelle || body.exercice_libelle || `${libelle} — ${String(date).slice(0, 4)}`).trim(),
          annee: Number(String(date).slice(0, 4)),
          mode_session: 'MULTI',
          nombre_sessions_attendu: sessionCount,
          consolidation_active: isGenericMulti ? true : sessionConfig.consolidationActive,
          source: 'MANUEL',
          definition_version_id: definitionVersion && (definitionVersion.definition_version_id || definitionVersion.definitionVersionId),
          policy_version_id: definitionVersion && (definitionVersion.policy_version_id || definitionVersion.policyVersionId),
          engine_route: genericEngineRoute,
          configuration_snapshot: definitionVersion ? genericCatalog.snapshotDefinitionVersion({ code: definitionVersion.definitionCode, label: definitionVersion.definitionLabel, domain: definitionVersion.domain }, definitionVersion, { policy_version_id: definitionVersion.policy_version_id || definitionVersion.policyVersionId, policy_code: definitionVersion.policyCode, version_code: definitionVersion.policyVersionCode }) : null,
          metadata: { createdFrom: 'manual_event_form' }
        });
      }
      const evenement = await tx.insertEvenement({
        date,
        domaine_code: domaine,
        sous_domaine_code: isSousDomaineFospec(domaine) ? domaine : null,
        libelle,
        statut: 'PLANIFIE',
        origine,
        mode_suivi: modeSuivi,
        code_cours: codeCours,
        code_source: codeCours,
        source_type: origine === 'IMPORT_CSV' ? 'CSV' : 'MANUEL',
        heure_debut: temporal.plannedStart,
        heure_fin: temporal.plannedEnd,
        heure_debut_prevue: temporal.plannedStart,
        heure_fin_prevue: temporal.plannedEnd,
        heure_debut_reelle: temporal.actualStart,
        heure_fin_reelle: temporal.actualEnd,
        duree_reelle_minutes: temporal.duration,
        salle: body.salle || null,
        responsable: body.responsable || null,
        exercice_id: exercice && exercice.exercice_id,
        session_index: exercice ? sessionConfig.sessionIndex : null,
        session_label: exercice ? sessionConfig.sessionLabel : null,
        definition_version_id: definitionVersion && (definitionVersion.definition_version_id || definitionVersion.definitionVersionId),
        policy_version_id: definitionVersion && (definitionVersion.policy_version_id || definitionVersion.policyVersionId),
        engine_route: genericEngineRoute,
        engine_snapshot: definitionVersion ? genericCatalog.snapshotDefinitionVersion({ code: definitionVersion.definitionCode, label: definitionVersion.definitionLabel, domain: definitionVersion.domain }, definitionVersion, { policy_version_id: definitionVersion.policy_version_id || definitionVersion.policyVersionId, policy_code: definitionVersion.policyCode, version_code: definitionVersion.policyVersionCode }) : null,
        pr_exercise_group_key: exercice && domaine === 'PR' ? `EXERCICE:${exercice.exercice_id}` : null,
        pr_session_key: exercice && domaine === 'PR' ? `EXERCICE:${exercice.exercice_id}.${sessionConfig.sessionIndex}` : null,
        exercise_equivalence_key: body.exerciseEquivalenceKey || body.exercise_equivalence_key || body.exerciceId || body.exercice_id || null,
        participation_policy_version: snapshot.policyVersion,
        participation_policy_snapshot: snapshot,
        cible_ids: cibleIds
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: evenement.evenement_id,
        action: 'CREER',
        apres: { date, domaine, libelle, cibleIds, origine, modeSuivi, exerciceId: exercice && exercice.exercice_id, sessionIndex: sessionConfig.sessionIndex, temporal }
      });
      return { evenement, exercice, version: evenement.version };
    });
  }

  function normalizeHeureEvent(value){
    if(value === undefined) return undefined;
    if(value === null || String(value).trim() === '') return null;
    const text = String(value).trim();
    const m = text.match(/^(\d{1,2})[h:.]?(\d{2})?$/i);
    if(!m) return text;
    return `${String(m[1]).padStart(2, '0')}:${String(m[2] || '00').padStart(2, '0')}`;
  }

  function minutesFromHeure(value){
    const text = normalizeHeureEvent(value);
    if(!text) return null;
    const m = String(text).match(/^(\d{2}):(\d{2})$/);
    if(!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if(h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  function durationMinutes(start, end){
    const debut = minutesFromHeure(start);
    const fin = minutesFromHeure(end);
    if(debut == null || fin == null) return null;
    return fin >= debut ? fin - debut : fin + 24 * 60 - debut;
  }

  function normalizeEventTemporal(body = {}, current = null){
    const hasPlannedStart = body.heureDebutPrevue !== undefined || body.heure_debut_prevue !== undefined || body.heureDebut !== undefined || body.heure_debut !== undefined || body.debut !== undefined;
    const hasPlannedEnd = body.heureFinPrevue !== undefined || body.heure_fin_prevue !== undefined || body.heureFin !== undefined || body.heure_fin !== undefined || body.fin !== undefined;
    const hasActualStart = body.heureDebutReelle !== undefined || body.heure_debut_reelle !== undefined || body.debutReel !== undefined || body.debut_reel !== undefined;
    const hasActualEnd = body.heureFinReelle !== undefined || body.heure_fin_reelle !== undefined || body.finReelle !== undefined || body.fin_reelle !== undefined;
    const plannedStart = hasPlannedStart
      ? normalizeHeureEvent(body.heureDebutPrevue ?? body.heure_debut_prevue ?? body.heureDebut ?? body.heure_debut ?? body.debut)
      : (current ? (current.heure_debut_prevue || current.heure_debut || null) : null);
    const plannedEnd = hasPlannedEnd
      ? normalizeHeureEvent(body.heureFinPrevue ?? body.heure_fin_prevue ?? body.heureFin ?? body.heure_fin ?? body.fin)
      : (current ? (current.heure_fin_prevue || current.heure_fin || null) : null);
    const actualStart = hasActualStart
      ? normalizeHeureEvent(body.heureDebutReelle ?? body.heure_debut_reelle ?? body.debutReel ?? body.debut_reel)
      : (current ? (current.heure_debut_reelle || plannedStart || null) : plannedStart);
    const actualEnd = hasActualEnd
      ? normalizeHeureEvent(body.heureFinReelle ?? body.heure_fin_reelle ?? body.finReelle ?? body.fin_reelle)
      : (current ? (current.heure_fin_reelle || plannedEnd || null) : plannedEnd);
    return {
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd,
      duration: durationMinutes(actualStart, actualEnd),
      hasAny: hasPlannedStart || hasPlannedEnd || hasActualStart || hasActualEnd
    };
  }

  function eventTemporalPayload(evenement = {}){
    const plannedStart = evenement.heure_debut_prevue || evenement.heure_debut || null;
    const plannedEnd = evenement.heure_fin_prevue || evenement.heure_fin || null;
    const actualStart = evenement.heure_debut_reelle || plannedStart || null;
    const actualEnd = evenement.heure_fin_reelle || plannedEnd || null;
    const duration = evenement.duree_reelle_minutes == null
      ? durationMinutes(actualStart, actualEnd)
      : Number(evenement.duree_reelle_minutes);
    return {
      plannedStart,
      plannedEnd,
      actualStart,
      actualEnd,
      plannedLabel: plannedStart && plannedEnd ? `${plannedStart} - ${plannedEnd}` : (plannedStart || plannedEnd || ''),
      actualLabel: actualStart && actualEnd ? `${actualStart} - ${actualEnd}` : (actualStart || actualEnd || ''),
      durationMinutes: Number.isFinite(duration) ? duration : null
    };
  }

  function normalizeParticipationTemporal(item = {}, evenement = {}){
    const hasStart = item.heureDebutIndividuelle !== undefined || item.heure_debut_individuelle !== undefined || item.debutIndividuel !== undefined;
    const hasEnd = item.heureFinIndividuelle !== undefined || item.heure_fin_individuelle !== undefined || item.finIndividuelle !== undefined;
    if(!hasStart && !hasEnd) return {};
    const start = normalizeHeureEvent(item.heureDebutIndividuelle ?? item.heure_debut_individuelle ?? item.debutIndividuel);
    const end = normalizeHeureEvent(item.heureFinIndividuelle ?? item.heure_fin_individuelle ?? item.finIndividuelle);
    return {
      heure_debut_individuelle: start,
      heure_fin_individuelle: end,
      duree_individuelle_minutes: durationMinutes(start || evenement.heure_debut_reelle || evenement.heure_debut, end || evenement.heure_fin_reelle || evenement.heure_fin)
    };
  }

  function normalizeLessonPrep(item = {}){
    const hasCreation = item.creationDl !== undefined || item.creation_dl !== undefined || item.creationDL !== undefined;
    const hasMinutes = item.preparationDlMinutes !== undefined || item.preparation_dl_minutes !== undefined || item.tempsPreparationDlMinutes !== undefined;
    if(!hasCreation && !hasMinutes) return {};
    const creation = Boolean(item.creationDl ?? item.creation_dl ?? item.creationDL);
    const minutesRaw = item.preparationDlMinutes ?? item.preparation_dl_minutes ?? item.tempsPreparationDlMinutes;
    const minutes = minutesRaw === '' || minutesRaw == null ? null : Number(minutesRaw);
    if(minutes != null && (!Number.isFinite(minutes) || minutes < 0)){
      throw new HttpError(422, 'preparation_dl_invalide', 'Le temps de préparation DL doit être renseigné en minutes positives.');
    }
    return {
      creation_dl: creation,
      preparation_dl_minutes: creation ? (minutes == null ? 0 : Math.round(minutes)) : null
    };
  }

  function sameIdList(a, b){
    const left = (a || []).map((id) => String(id)).sort();
    const right = (b || []).map((id) => String(id)).sort();
    return left.length === right.length && left.every((id, i) => id === right[i]);
  }

  function journalChamps(avant, apres){
    const keys = ['date', 'heure_debut', 'heure_fin', 'heure_debut_prevue', 'heure_fin_prevue', 'heure_debut_reelle', 'heure_fin_reelle', 'duree_reelle_minutes', 'libelle', 'statut'];
    return keys
      .filter((key) => String(avant[key] || '') !== String(apres[key] || ''))
      .map((champ) => ({ champ, avant: avant[champ] ?? null, apres: apres[champ] ?? null }));
  }

  async function populationImpactForChange(evenement, nextDate, nextCibleIds){
    const expected = await resolveEligiblePopulation({
      eventDate: nextDate,
      domaineCode: evenement.domaine_code,
      sousDomaineCode: evenement.sous_domaine_code,
      cibleIds: nextCibleIds
    });
    const expectedIds = new Set((expected.personnes || []).map((p) => String(p.personneId)));
    const attendus = repo.listAttendus ? await repo.listAttendus(evenement.evenement_id) : [];
    const participations = repo.listParticipations ? await repo.listParticipations(evenement.evenement_id) : [];
    const partByPerson = new Map(participations.map((row) => [String(row.personne_id), row]));
    const horsPopulation = [];
    for(const att of attendus){
      if(att.inclus === false) continue;
      const id = String(att.personne_id);
      if(expectedIds.has(id)) continue;
      const personne = repo.getPersonne ? await repo.getPersonne(id) : null;
      const participation = partByPerson.get(id);
      horsPopulation.push({
        personneId: id,
        nip: personne && personne.nip,
        conservee: participationHasBusinessTrace(participation)
      });
    }
    return {
      horsPopulation,
      attendusActuels: attendus.filter((a) => a.inclus !== false).length,
      attendusCalcules: expected.count,
      tracesConservees: horsPopulation.filter((row) => row.conservee).length
    };
  }

  async function assertExerciseSessionCountCanChange(store, exerciceId, nextCount){
    if(!exerciceId || !store.listExerciseEvents) return { blocked: false, impacted: [] };
    const events = await store.listExerciseEvents(exerciceId);
    const impacted = [];
    for(const event of events || []){
      const index = Number(event.session_index || event.sessionIndex || 0);
      if(!index || index <= nextCount) continue;
      const [attendus, participations] = await Promise.all([
        store.listAttendus ? store.listAttendus(event.evenement_id) : [],
        store.listParticipations ? store.listParticipations(event.evenement_id) : []
      ]);
      const activeAttendus = (attendus || []).filter((row) => row.inclus !== false).length;
      const businessParticipations = (participations || []).filter(participationHasBusinessTrace).length;
      if(activeAttendus || businessParticipations || String(event.statut || '').toUpperCase() === 'REALISE'){
        impacted.push({
          evenement_id: event.evenement_id,
          date: event.date,
          libelle: event.libelle,
          session_index: index,
          attendus: activeAttendus,
          participations: businessParticipations,
          statut: event.statut
        });
      }
    }
    if(impacted.length){
      throw new HttpError(409, 'reduction_sessions_protegee', 'La réduction du nombre de sessions est bloquée : une session supprimée du périmètre contient déjà des données.', { impacted });
    }
    return { blocked: false, impacted: [] };
  }

  async function previewModifierEvenement(eventId, body = {}){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    const currentCibles = repo.listEventCibleIds ? await repo.listEventCibleIds(eventId) : [];
    const nextDate = body.date !== undefined ? isoDate(body.date) : isoDate(evenement.date);
    const nextCibles = body.cibleIds || body.cible_ids || currentCibles;
    const impact = (body.date !== undefined || body.cibleIds !== undefined || body.cible_ids !== undefined)
      ? await populationImpactForChange(evenement, nextDate, nextCibles)
      : { horsPopulation: [], attendusActuels: null, attendusCalcules: null, tracesConservees: 0 };
    const wantsSessionCount = body.nombreSessionsAttendu !== undefined || body.nombre_sessions_attendu !== undefined || body.nbSessions !== undefined || body.nb_sessions !== undefined;
    let sessionImpact = { blocked: false, impacted: [] };
    if(wantsSessionCount && evenement.exercice_id){
      const nextCount = Number(body.nombreSessionsAttendu || body.nombre_sessions_attendu || body.nbSessions || body.nb_sessions);
      try {
        sessionImpact = await assertExerciseSessionCountCanChange(repo, evenement.exercice_id, nextCount);
      } catch(error) {
        if(error instanceof HttpError && error.status === 409){
          sessionImpact = { blocked: true, impacted: error.details && error.details.impacted || [] };
        } else throw error;
      }
    }
    return {
      evenement_id: eventId,
      code_cours: evenement.code_cours,
      statut: evenement.statut,
      modifiable: evenement.statut === 'PLANIFIE' || evenement.statut === 'REPORTE',
      reouvertureRequise: evenement.statut === 'REALISE',
      impact,
      sessionImpact
    };
  }

  async function patchEvenement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    if(body.codeCours !== undefined || body.code_cours !== undefined){
      throw new HttpError(422, 'code_cours_immutable', 'CODE COURS immuable après création.');
    }
    if(evenement.statut === 'REALISE'){
      throw new HttpError(422, 'evenement_realise_non_modifiable', 'Un événement réalisé doit d’abord être rouvert.');
    }
    if(evenement.statut === 'ANNULE'){
      throw new HttpError(422, 'evenement_annule_non_modifiable', 'Un événement annulé n’est plus modifiable.');
    }
    const patch = {};
    const motif = String(body.motif || body.commentaire || '').trim();
    if(body.libelle !== undefined){
      const libelle = String(body.libelle || '').trim();
      if(!libelle) throw new HttpError(400, 'libelle_vide', 'Le libellé est obligatoire.');
      patch.libelle = libelle;
    }
    const wantsDate = body.date !== undefined;
    const wantsDomaine = body.domaineCode !== undefined || body.domaine_code !== undefined;
    const wantsCibles = body.cibleIds !== undefined || body.cible_ids !== undefined;
    const wantsStatut = body.statut !== undefined;
    const wantsSessionCount = body.nombreSessionsAttendu !== undefined || body.nombre_sessions_attendu !== undefined || body.nbSessions !== undefined || body.nb_sessions !== undefined;
    if(wantsDomaine && evenement.population_figee){
      throw new HttpError(422, 'population_figee_immutable', 'Le domaine ne peut plus être modifié après gel.');
    }
    if(wantsCibles && evenement.statut !== 'PLANIFIE'){
      throw new HttpError(422, 'cible_immutable_cloture', 'La cible n’est modifiable que sur un événement planifié.');
    }
    if(wantsDate && evenement.statut !== 'PLANIFIE' && evenement.statut !== 'REPORTE'){
      throw new HttpError(422, 'date_immutable_statut', 'La date n’est modifiable que sur un événement planifié ou reporté.');
    }
    if(wantsDate){
      const date = isoDate(body.date);
      if(!date) throw new HttpError(400, 'date_invalide', 'Date invalide.');
      patch.date = date;
    }
    if(wantsDomaine){
      patch.domaine_code = String(body.domaineCode || body.domaine_code);
    }
    const temporal = normalizeEventTemporal(body, evenement);
    if(temporal.hasAny){
      const wantsPlannedStart = body.heureDebutPrevue !== undefined || body.heure_debut_prevue !== undefined || body.heureDebut !== undefined || body.heure_debut !== undefined || body.debut !== undefined;
      const wantsPlannedEnd = body.heureFinPrevue !== undefined || body.heure_fin_prevue !== undefined || body.heureFin !== undefined || body.heure_fin !== undefined || body.fin !== undefined;
      const wantsActualStart = body.heureDebutReelle !== undefined || body.heure_debut_reelle !== undefined || body.debutReel !== undefined || body.debut_reel !== undefined;
      const wantsActualEnd = body.heureFinReelle !== undefined || body.heure_fin_reelle !== undefined || body.finReelle !== undefined || body.fin_reelle !== undefined;
      if(wantsPlannedStart){
        patch.heure_debut = temporal.plannedStart;
        patch.heure_debut_prevue = temporal.plannedStart;
      }
      if(wantsPlannedEnd){
        patch.heure_fin = temporal.plannedEnd;
        patch.heure_fin_prevue = temporal.plannedEnd;
      }
      if(wantsActualStart) patch.heure_debut_reelle = temporal.actualStart;
      if(wantsActualEnd) patch.heure_fin_reelle = temporal.actualEnd;
      if(wantsActualStart || wantsActualEnd) patch.duree_reelle_minutes = temporal.duration;
    }
    if(body.salle !== undefined) patch.salle = String(body.salle || '').trim() || null;
    if(body.responsable !== undefined) patch.responsable = String(body.responsable || '').trim() || null;
    if(wantsStatut){
      const statut = String(body.statut || '').toUpperCase();
      if(!['PLANIFIE', 'REPORTE', 'ANNULE'].includes(statut)){
        throw new HttpError(422, 'statut_invalide', 'Statut opérationnel invalide.');
      }
      if(statut !== evenement.statut && !motif){
        throw new HttpError(400, 'motif_obligatoire', 'Un motif est obligatoire pour reporter ou annuler.');
      }
      if(statut === 'REPORTE' && !wantsDate){
        throw new HttpError(400, 'date_report_obligatoire', 'Une nouvelle date est obligatoire pour reporter.');
      }
      patch.statut = statut;
    }
    const currentCibles = repo.listEventCibleIds ? await repo.listEventCibleIds(eventId) : [];
    const nextCibles = wantsCibles ? (body.cibleIds || body.cible_ids) : currentCibles;
    if(wantsCibles){
      if(!Array.isArray(nextCibles) || !nextCibles.length){
        throw new HttpError(400, 'cibles_obligatoires', 'Au moins une cible est obligatoire.');
      }
    }
    const nextDate = patch.date || isoDate(evenement.date);
    const needsResync = evenement.population_figee
      && (evenement.statut === 'PLANIFIE' || patch.statut === 'PLANIFIE')
      && (wantsDate || (wantsCibles && !sameIdList(currentCibles, nextCibles)))
      && (patch.statut || evenement.statut) !== 'ANNULE'
      && (patch.statut || evenement.statut) !== 'REALISE';
    if((wantsDate || wantsCibles) && evenement.population_figee){
      const impact = await populationImpactForChange(evenement, nextDate, nextCibles);
      if(impact.tracesConservees && !body.confirmPopulationImpact && !body.confirm_population_impact){
        throw new HttpError(409, 'population_impact', 'Ce changement sort des personnes déjà saisies de la population attendue. Confirmez pour conserver leurs statuts.', {
          impact
        });
      }
    }
    const next = await repo.withTransaction(async (tx) => {
      if(wantsSessionCount && evenement.exercice_id && tx.updateExercise){
        const nextCount = Number(body.nombreSessionsAttendu || body.nombre_sessions_attendu || body.nbSessions || body.nb_sessions);
        if(!Number.isInteger(nextCount) || nextCount < 1) throw new HttpError(400, 'nombre_sessions_invalide', 'Nombre de sessions invalide.');
        await assertExerciseSessionCountCanChange(tx, evenement.exercice_id, nextCount);
        await tx.updateExercise(evenement.exercice_id, {
          mode_session: nextCount > 1 ? 'MULTI' : 'SINGLE',
          nombre_sessions_attendu: nextCount,
          consolidation_active: nextCount > 1 ? Boolean(evenement.consolidation_active) : false
        });
      }
      const updated = await bumpOrConflict(tx, eventId, baseVersion, patch);
      let current = updated;
      if(wantsCibles){
        await tx.setEventCibles(eventId, nextCibles);
      }
      if(needsResync){
        await syncExpectedPopulationForEvents(tx, [await tx.getEvent(eventId)], actor, {
          allPersons: true,
          reason: 'EVENT_EDIT_POPULATION'
        });
        current = await tx.getEvent(eventId);
      }
      const champs = journalChamps({
        date: isoDate(evenement.date),
        heure_debut: evenement.heure_debut || null,
        heure_fin: evenement.heure_fin || null,
        heure_debut_prevue: evenement.heure_debut_prevue || null,
        heure_fin_prevue: evenement.heure_fin_prevue || null,
        heure_debut_reelle: evenement.heure_debut_reelle || null,
        heure_fin_reelle: evenement.heure_fin_reelle || null,
        duree_reelle_minutes: evenement.duree_reelle_minutes == null ? null : Number(evenement.duree_reelle_minutes),
        libelle: evenement.libelle,
        statut: evenement.statut
      }, {
        date: isoDate(current.date),
        heure_debut: current.heure_debut || null,
        heure_fin: current.heure_fin || null,
        heure_debut_prevue: current.heure_debut_prevue || null,
        heure_fin_prevue: current.heure_fin_prevue || null,
        heure_debut_reelle: current.heure_debut_reelle || null,
        heure_fin_reelle: current.heure_fin_reelle || null,
        duree_reelle_minutes: current.duree_reelle_minutes == null ? null : Number(current.duree_reelle_minutes),
        libelle: current.libelle,
        statut: current.statut
      });
      if(wantsCibles && !sameIdList(currentCibles, nextCibles)){
        champs.push({ champ: 'cible', avant: currentCibles, apres: nextCibles });
      }
      const action = patch.statut === 'REPORTE' && evenement.statut !== 'REPORTE'
        ? 'REPORTER'
        : (patch.statut === 'ANNULE' ? 'ANNULER' : (wantsCibles && evenement.population_figee ? 'RETARGET_CIBLES' : 'MODIFIER'));
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action,
        commentaire: motif || null,
        avant: {
          evenement_id: eventId,
          code_cours: evenement.code_cours,
          date: isoDate(evenement.date),
          heure_debut: evenement.heure_debut || null,
          heure_fin: evenement.heure_fin || null,
          temporal: eventTemporalPayload(evenement),
          libelle: evenement.libelle,
          statut: evenement.statut,
          version: evenement.version
        },
        apres: {
          evenement_id: eventId,
          code_cours: current.code_cours,
          date: isoDate(current.date),
          heure_debut: current.heure_debut || null,
          heure_fin: current.heure_fin || null,
          temporal: eventTemporalPayload(current),
          libelle: current.libelle,
          statut: current.statut,
          version: current.version,
          champs,
          populationResynced: Boolean(needsResync)
        }
      });
      return current;
    });
    return { evenement: next, version: next.version, code_cours: next.code_cours };
  }

  async function resolveEligiblePopulation({ eventDate, domaineCode, sousDomaineCode, cibleIds, suiviNominatif, store }){
    const dbx = store || repo;
    const date = isoDate(eventDate);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’événement invalide.');
    const ids = Array.isArray(cibleIds) ? cibleIds.filter(Boolean) : [];
    const allCibles = dbx.listCibles ? await dbx.listCibles() : [];
    const requestedCibles = ids.map((id) => allCibles.find((c) => c.cible_id === id)).filter(Boolean);
    const expanded = new Set(ids);
    for(const cible of requestedCibles){
      const domaine = String(cible.domaine_code || '').toUpperCase();
      if(cible.niveau_code === 'GEN' && ['DPS', 'DAP', 'JSP', 'PR'].includes(domaine)){
        allCibles
          .filter((c) => c.domaine_code === domaine && c.niveau_code !== 'GEN')
          .forEach((c) => expanded.add(c.cible_id));
      }
    }
    const populationIds = [...expanded];
    const rules = suiviNominatif || (dbx.listSuiviNominatif ? await dbx.listSuiviNominatif() : []);
    if(ids.length === 1){
      const resolution = resolveSuiviNominatif(rules, {
        date,
        domaineCode,
        sousDomaineCode,
        cibleId: ids[0]
      });
      if(resolution.possible === false){
        return { count: 0, personnes: [], note: 'suivi_nominatif_interdit', resolution };
      }
    }
    const affectations = await dbx.listAffectationsForCibles(populationIds, date);
    const byPersonne = new Map();
    for(const aff of affectations){
      if(!isAffectationValide(aff, date)) continue;
      const personne = await dbx.getPersonne(aff.personne_id);
      if(!personne) continue;
      const periodes = dbx.listPersonnesPeriodes
        ? await dbx.listPersonnesPeriodes(aff.personne_id)
        : [];
      const eligibility = evaluateEligibility(personne, periodes, date);
      if(!eligibility.eligible) continue;
      const cible = await dbx.getCible(aff.cible_id);
      const current = byPersonne.get(aff.personne_id) || {
        personneId: aff.personne_id,
        nip: personne.nip,
        nom: personne.nom,
        prenom: personne.prenom,
        cibles: [],
        origine: 'REGLE',
        motifInclusion: 'affectation_valide_a_date',
        eligibility
      };
      current.cibles.push({
        cibleId: aff.cible_id,
        niveauCode: cible?.niveau_code,
        domaineCode: cible?.domaine_code
      });
      byPersonne.set(aff.personne_id, current);
    }
    const personnes = [...byPersonne.values()];
    return { count: personnes.length, personnes };
  }

  function cibleMotifFromPopulationPerson(person){
    const parts = (person?.cibles || [])
      .map((c) => `${c.domaineCode || c.domaine_code}_${c.niveauCode || c.niveau_code}`)
      .filter(Boolean);
    return parts.length ? parts.join('|') : (person?.motifInclusion || 'affectation_valide_a_date');
  }

  function isDapGroupedFormationLabel(libelle){
    return /^formation\s+group[eé]e\s+dap\s+\d+(?:\.\d+)?\b/i.test(String(libelle || '').trim());
  }

  async function expandDapGroupedCibles(tx, domaine, libelle, cibleIds){
    if(String(domaine || '').toUpperCase() !== 'DAP' || !isDapGroupedFormationLabel(libelle) || !tx.listCibles){
      return cibleIds;
    }
    const rows = await tx.listCibles();
    const dapSections = (rows || [])
      .filter((c) => String(c.domaine_code || '').toUpperCase() === 'DAP' && /^Y[1-4]$/i.test(String(c.niveau_code || '')))
      .map((c) => c.cible_id)
      .filter(Boolean);
    return dapSections.length ? [...new Set(dapSections)] : cibleIds;
  }

  function requiresFinalMultiSessionClosure(evenement){
    const domaine = String(evenement && (evenement.domaine_code || evenement.domaineCode) || '').toUpperCase();
    return domaine === 'DAP' || domaine === 'PR';
  }

  function normalizeIdList(ids){
    return [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
  }

  function participationHasBusinessTrace(participation){
    if(!participation) return false;
    const role = String(participation.role || 'PARTICIPANT').toUpperCase();
    const statut = String(participation.statut || 'NON_RENSEIGNE').toUpperCase();
    if(ROLES_ENCADREMENT.has(role)) return true;
    if(['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION'].includes(statut)) return true;
    if(participation.motif_absence || participation.commentaire) return true;
    const source = String(participation.source || '').toUpperCase();
    return source && !['GENERATION', 'SYNC_POPULATION', 'RESET'].includes(source);
  }

  function isStaleNonConcerneForExpected(participation){
    if(!participation) return false;
    const role = String(participation.role || 'PARTICIPANT').toUpperCase();
    if(ROLES_ENCADREMENT.has(role)) return false;
    return String(participation.statut || '').toUpperCase() === 'NON_CONCERNE'
      && !participationHasBusinessTrace(Object.assign({}, participation, { statut: 'NON_RENSEIGNE' }));
  }

  async function eventPopulationCibleIds(dbx, eventId, ciblesByEvent){
    if(ciblesByEvent && ciblesByEvent.has(eventId)){
      return ciblesByEvent.get(eventId).map((row) => row.cible_id).filter(Boolean);
    }
    return dbx.listEventCibleIds ? dbx.listEventCibleIds(eventId) : [];
  }

  function cibleLabel(row){
    if(!row) return '';
    return [row.domaine_code || row.domaine, row.niveau_code || row.niveau].filter(Boolean).join('/');
  }

  function targetDetails(rows){
    return (rows || []).map((row) => ({
      cibleId: row.cible_id || null,
      domaine: row.domaine_code || null,
      niveau: row.niveau_code || null,
      label: cibleLabel(row)
    }));
  }

  async function expandEventCibleIds(dbx, cibleIds){
    const ids = Array.isArray(cibleIds) ? cibleIds.filter(Boolean) : [];
    const allCibles = dbx.listCibles ? await dbx.listCibles() : [];
    const requested = ids.map((id) => allCibles.find((c) => String(c.cible_id) === String(id))).filter(Boolean);
    const expanded = new Set(ids.map((id) => String(id)));
    for(const cible of requested){
      const domaine = String(cible.domaine_code || '').toUpperCase();
      if(cible.niveau_code === 'GEN' && ['DPS', 'DAP', 'JSP', 'PR'].includes(domaine)){
        allCibles
          .filter((c) => c.domaine_code === domaine && c.niveau_code !== 'GEN')
          .forEach((c) => expanded.add(String(c.cible_id)));
      }
    }
    return { expanded, allCibles };
  }

  async function evaluatePersonExpectedForEvent(dbx, evenement, cibleIds, personneId){
    const date = isoDate(evenement && evenement.date);
    if(!date || !personneId) return null;
    const personne = dbx.getPersonne ? await dbx.getPersonne(personneId) : null;
    if(!personne) return null;
    const periodes = dbx.listPersonnesPeriodes ? await dbx.listPersonnesPeriodes(personneId) : [];
    const eligibility = evaluateEligibility(personne, periodes, date);
    if(!eligibility.eligible) return null;
    const { expanded, allCibles } = await expandEventCibleIds(dbx, cibleIds);
    const affs = dbx.listAffectations ? await dbx.listAffectations({ personneId, date }) : [];
    const matched = [];
    const seen = new Set();
    for(const aff of affs || []){
      if(!isAffectationValide(aff, date)) continue;
      const cibleId = aff.cible_id ? String(aff.cible_id) : '';
      const hit = (cibleId && expanded.has(cibleId)
        ? allCibles.find((c) => String(c.cible_id) === cibleId)
        : null)
        || allCibles.find((c) => expanded.has(String(c.cible_id)) && matchesAssignmentToEventTarget(aff, c));
      if(!hit || seen.has(String(hit.cible_id))) continue;
      seen.add(String(hit.cible_id));
      matched.push({
        cibleId: hit.cible_id,
        niveauCode: hit.niveau_code,
        domaineCode: hit.domaine_code
      });
    }
    if(!matched.length) return null;
    return {
      personneId: personne.personne_id || personneId,
      nip: personne.nip,
      nom: personne.nom,
      prenom: personne.prenom,
      cibles: matched,
      origine: 'REGLE',
      motifInclusion: 'affectation_valide_a_date',
      eligibility
    };
  }

  async function resolveExpectedByPersonForEvent(dbx, evenement, cibleIds, onlyPersonneIds){
    const scoped = normalizeIdList(onlyPersonneIds);
    if(scoped.length){
      const map = new Map();
      for(const pid of scoped){
        const expected = await evaluatePersonExpectedForEvent(dbx, evenement, cibleIds, pid);
        if(expected) map.set(String(pid), expected);
      }
      return map;
    }
    const population = await resolveEligiblePopulation({
      eventDate: evenement.date,
      domaineCode: evenement.domaine_code,
      sousDomaineCode: evenement.sous_domaine_code,
      cibleIds,
      store: previewPopulationStore(dbx)
    });
    return new Map((population.personnes || []).map((person) => [String(person.personneId), person]));
  }

  function eventCiblesMatchAffected(rows, affectedCibleIds, affectedDomaines){
    for(const row of rows || []){
      const cibleId = String(row.cible_id || '');
      const domaine = String(row.domaine_code || '').toUpperCase();
      const niveau = String(row.niveau_code || '').toUpperCase();
      if(affectedCibleIds.has(cibleId)) return true;
      if(niveau === 'GEN' && affectedDomaines.has(domaine)) return true;
    }
    return false;
  }

  function eventLooksPrAbc(evenement, cibles = []){
    if(String(evenement?.domaine_code || '').toUpperCase() !== 'PR') return false;
    const libelle = String(evenement?.libelle || '');
    if(/\bPR[-\s]?ABC\b/i.test(libelle)) return true;
    return (cibles || []).some((row) => {
      const domaine = String(row.domaine_code || '').toUpperCase();
      const niveau = String(row.niveau_code || row.niveau || '').toUpperCase();
      return domaine === 'PR' && niveau === 'ABC';
    });
  }

  function activeAttendusCount(rows){
    return (rows || []).filter((row) => row.inclus !== false).length;
  }

  async function syncExpectedPopulationForEvents(dbx, events, actor, options = {}){
    const touchedIds = new Set(normalizeIdList(options.personneIds || options.personne_ids));
    const allPersons = options.allPersons === true || options.all_persons === true;
    const dryRun = options.dryRun === true || options.dry_run === true;
    const summary = {
      ok: true,
      scope: 'EXPECTED_POPULATION',
      personnes: touchedIds.size,
      dryRun,
      eventsScanned: (events || []).length,
      eventsRecalculated: 0,
      attendusAdded: 0,
      attendusRemoved: 0,
      reclassifiedManual: 0,
      participationsCreated: 0,
      participationsPreserved: 0,
      skippedClosed: 0,
      skippedQuantitatif: 0,
      skippedUnfrozen: 0,
      details: []
    };
    for(const evenement of events || []){
      if(!evenement) continue;
      if(evenement.statut !== 'PLANIFIE'){
        summary.skippedClosed += 1;
        continue;
      }
      if(evenement.origine === 'LEGACY_AGGREGATED' || isQuantitatif(evenement)){
        summary.skippedQuantitatif += 1;
        continue;
      }
      if(!evenement.population_figee){
        summary.skippedUnfrozen += 1;
        continue;
      }
      const eventId = evenement.evenement_id;
      if(!dryRun && typeof options.beforeSync === 'function'){
        await options.beforeSync(evenement);
      }
      const cibleIds = options.overrideCibleIdsByEvent?.get(eventId)
        || await eventPopulationCibleIds(dbx, eventId, options.ciblesByEvent);
      const expectedByPerson = await resolveExpectedByPersonForEvent(
        dbx,
        evenement,
        cibleIds,
        allPersons ? [] : [...touchedIds]
      );
      const attendus = options.attendusByEvent?.get(eventId) || (dbx.listAttendus ? await dbx.listAttendus(eventId) : []);
      const participations = options.participationsByEvent?.get(eventId) || (dbx.listParticipations ? await dbx.listParticipations(eventId) : []);
      const attendusByPerson = new Map(attendus.map((row) => [String(row.personne_id), row]));
      const participationsByPerson = new Map(participations.map((row) => [String(row.personne_id), row]));
      const populationBefore = activeAttendusCount(attendus);
      const candidateIds = allPersons ? new Set() : new Set(touchedIds);
      if(allPersons){
        for(const id of expectedByPerson.keys()) candidateIds.add(id);
        for(const id of attendusByPerson.keys()) candidateIds.add(id);
      }else{
        for(const id of expectedByPerson.keys()){
          if(touchedIds.has(id)) candidateIds.add(id);
        }
      }
      let changed = false;
      const eventDetails = {
        eventId,
        date: evenement.date,
        libelle: evenement.libelle,
        domaine: evenement.domaine_code,
        populationBefore,
        populationExpected: expectedByPerson.size,
        added: [],
        reclassified: [],
        removed: [],
        preserved: []
      };
      for(const id of candidateIds){
        const expected = expectedByPerson.get(id);
        const attendu = attendusByPerson.get(id);
        const participation = participationsByPerson.get(id);
        if(expected){
          const wasManual = attendu && attendu.origine === 'EXCEPTION_AJOUT';
          if(!attendu || attendu.inclus === false || wasManual){
            const motifInclusion = cibleMotifFromPopulationPerson(expected);
            if(!dryRun){
              await dbx.upsertAttendu({
                evenement_id: eventId,
                personne_id: id,
                inclus: true,
                origine: 'REGLE',
                origine_retrait: null,
                motif_inclusion: motifInclusion
              });
            }
            const detail = {
              personneId: id,
              nip: expected.nip || null,
              nom: expected.nom || null,
              prenom: expected.prenom || null,
              motifInclusion,
              reason: wasManual ? 'reclassement_exception_manuelle' : 'affectation_attendue'
            };
            if(wasManual) summary.reclassifiedManual += 1;
            else summary.attendusAdded += 1;
            if(wasManual) eventDetails.reclassified.push(detail);
            else eventDetails.added.push(detail);
            changed = true;
          }
          if(!participation){
            if(!dryRun){
              await dbx.upsertParticipation({
                evenement_id: eventId,
                personne_id: id,
                statut: 'NON_RENSEIGNE',
                role: 'PARTICIPANT',
                source: 'GENERATION',
                auteur_id: actorId(actor)
              });
            }
            summary.participationsCreated += 1;
            changed = true;
          }else if(isStaleNonConcerneForExpected(participation)){
            if(!dryRun){
              await dbx.upsertParticipation({
                ...participation,
                statut: 'NON_RENSEIGNE',
                role: participation.role || 'PARTICIPANT',
                source: 'SYNC_POPULATION',
                auteur_id: actorId(actor)
              });
            }
            eventDetails.reclassified.push({ personneId: id, reason: 'non_concerne_residuel' });
            changed = true;
          }else if(!attendu || attendu.inclus === false || wasManual){
            summary.participationsPreserved += 1;
            eventDetails.preserved.push({ personneId: id, reason: 'participation_existante' });
          }
          continue;
        }
        if(attendu && attendu.inclus !== false && attendu.origine !== 'EXCEPTION_AJOUT'){
          const motifRetrait = participationHasBusinessTrace(participation)
            ? 'AFFECTATION_HORS_PERIODE_HISTORIQUE'
            : 'AFFECTATION_HORS_PERIODE';
          if(!dryRun){
            await dbx.upsertAttendu({
              ...attendu,
              inclus: false,
              origine_retrait: 'EXCEPTION_RETRAIT'
            });
          }
          eventDetails.removed.push({
            personneId: id,
            nip: participation?.nip || null,
            nom: participation?.nom || null,
            prenom: participation?.prenom || null,
            origineRetrait: 'EXCEPTION_RETRAIT',
            motifRetrait,
            reason: motifRetrait
          });
          if(participationHasBusinessTrace(participation)){
            summary.participationsPreserved += 1;
            eventDetails.preserved.push({ personneId: id, reason: 'historique_participation' });
          }else if(participation){
            if(!dryRun){
              await dbx.upsertParticipation({
                ...participation,
                statut: 'NON_CONCERNE',
                role: participation.role || 'PARTICIPANT',
                source: 'SYNC_POPULATION',
                auteur_id: actorId(actor)
              });
            }
          }
          summary.attendusRemoved += 1;
          changed = true;
        }
      }
      if(changed){
        eventDetails.populationAfter = expectedByPerson.size;
        eventDetails.participationsProtected = eventDetails.preserved.length;
        if(!dryRun){
          const current = await dbx.getEvent(eventId);
          await dbx.updateEventIfVersion(eventId, current.version, {
            population_version: Number(current.population_version || 0) + 1
          });
          await dbx.appendJournal({
            auteur_id: actorId(actor),
            entite: 'evenement',
            entite_id: eventId,
            action: allPersons ? 'BACKFILL_POPULATION_ATTENDUE' : 'SYNC_POPULATION_ATTENDUE',
            apres: {
              personnes: [...touchedIds],
              allPersons,
              attendusAdded: eventDetails.added.length,
              attendusRemoved: eventDetails.removed.length,
              reclassifiedManual: eventDetails.reclassified.length
            }
          });
        }
        summary.eventsRecalculated += 1;
        summary.details.push(eventDetails);
      }
    }
    return summary;
  }

  async function reconcileExpectedPopulation(options = {}, actor = {}){
    const annee = options.annee || options.year || null;
    const domaine = options.domaine || options.domaineCode || options.domaine_code || null;
    const events = repo.listEvenements ? await repo.listEvenements({ annee, domaine }) : [];
    const selected = (events || []).filter((event) => {
      if(options.eventIds && Array.isArray(options.eventIds) && !options.eventIds.includes(event.evenement_id)) return false;
      if(options.statut && event.statut !== options.statut) return false;
      return true;
    });
    return repo.withTransaction(async (tx) => syncExpectedPopulationForEvents(tx, selected, actor, {
      allPersons: true,
      dryRun: options.dryRun === true || options.dry_run === true,
      reason: options.reason || 'BACKFILL_POPULATION_ATTENDUE'
    }));
  }

  async function reconcilePrAbcPopulation(options = {}, actor = {}){
    const annee = options.annee || options.year || null;
    const dryRun = options.dryRun !== false && options.dry_run !== false;
    const prAbc = repo.findCible ? await repo.findCible('PR', 'ABC') : null;
    if(!prAbc) throw new HttpError(500, 'pr_abc_cible_introuvable', 'La cible PR/ABC est introuvable.');
    const listed = repo.listEvenements ? await repo.listEvenements({ annee, domaine: 'PR', statut: 'PLANIFIE' }) : [];
    const ids = (listed || []).map((event) => event.evenement_id);
    const ciblesRows = repo.listEventCiblesForEvents && ids.length ? await repo.listEventCiblesForEvents(ids) : [];
    const ciblesByEvent = new Map();
    for(const row of ciblesRows || []){
      const eventId = row.evenement_id;
      if(!ciblesByEvent.has(eventId)) ciblesByEvent.set(eventId, []);
      ciblesByEvent.get(eventId).push(row);
    }
    const selected = (listed || []).filter((event) => {
      if(options.eventIds && Array.isArray(options.eventIds) && !options.eventIds.includes(event.evenement_id)) return false;
      if(event.origine === 'LEGACY_AGGREGATED' || isQuantitatif(event) || !event.population_figee) return false;
      return eventLooksPrAbc(event, ciblesByEvent.get(event.evenement_id) || []);
    });
    const targetCiblesByEvent = new Map(selected.map((event) => [event.evenement_id, [prAbc]]));
    const targetIdsByEvent = new Map(selected.map((event) => [event.evenement_id, [prAbc.cible_id]]));
    const summary = await repo.withTransaction(async (tx) => syncExpectedPopulationForEvents(tx, selected, actor, {
      beforeSync: dryRun ? null : async (event) => {
        const currentTargets = ciblesByEvent.get(event.evenement_id) || [];
        await tx.setEventCibles(event.evenement_id, [prAbc.cible_id]);
        if(tx.appendJournal){
          await tx.appendJournal({
            auteur_id: actorId(actor),
            entite: 'evenement',
            entite_id: event.evenement_id,
            action: 'RETARGET_PR_ABC',
            avant: { cibles: targetDetails(currentTargets) },
            apres: { cibles: targetDetails([prAbc]) }
          });
        }
      },
      allPersons: true,
      dryRun,
      ciblesByEvent: targetCiblesByEvent,
      overrideCibleIdsByEvent: targetIdsByEvent,
      reason: 'RECONCILE_PR_ABC_POPULATION'
    }));
    return {
      ...summary,
      scope: 'PR_ABC_POPULATION_RECONCILIATION',
      source: 'scope_affectations_pr_abc',
      eventsConcerned: summary.eventsRecalculated,
      protectedParticipations: summary.participationsPreserved,
      details: summary.details.map((detail) => ({
        ...detail,
        evenementId: detail.eventId,
        currentTargets: targetDetails(ciblesByEvent.get(detail.eventId) || []),
        expectedTargets: targetDetails(targetCiblesByEvent.get(detail.eventId) || []),
        before: detail.populationBefore,
        expected: detail.populationExpected,
        after: detail.populationAfter,
        addedCount: detail.added.length,
        removedCount: detail.removed.length,
        protectedCount: detail.participationsProtected || 0
      }))
    };
  }

  function eventDateInSyncWindow(date, from, to){
    const day = isoDate(date);
    if(!day) return true;
    const start = isoDate(from);
    const end = isoDate(to);
    if(start && day < start) return false;
    if(end && day > end) return false;
    return true;
  }

  async function syncExpectedPopulationForPersonnesInRepo(dbx, personneIds, actor, options = {}){
    const ids = normalizeIdList(personneIds);
    if(!ids.length) return { ok: true, scope: 'EXPECTED_POPULATION', personnes: 0, eventsScanned: 0, eventsRecalculated: 0 };
    const [listedEvents, allCibles] = await Promise.all([
      dbx.listEvenements ? dbx.listEvenements({
        statut: 'PLANIFIE',
        from: options.from || null,
        to: options.to || null
      }) : [],
      dbx.listCibles ? dbx.listCibles() : []
    ]);
    const allEvents = (listedEvents || []).filter((event) => eventDateInSyncWindow(event.date, options.from, options.to));
    const cibleById = new Map((allCibles || []).map((row) => [String(row.cible_id), row]));
    const affectedCibleIds = new Set();
    const affectedDomaines = new Set();
    for(const personneId of ids){
      const affectations = dbx.listAffectations ? await dbx.listAffectations({ personneId }) : [];
      for(const aff of affectations || []){
        const cible = cibleById.get(String(aff.cible_id)) || (dbx.getCible ? await dbx.getCible(aff.cible_id) : null);
        if(aff.cible_id) affectedCibleIds.add(String(aff.cible_id));
        const domaine = String((cible && cible.domaine_code) || aff.domaine_code || aff.domaine || '').toUpperCase();
        if(domaine) affectedDomaines.add(domaine);
      }
    }
    const plannedIds = allEvents.map((event) => event.evenement_id);
    const [eventCibles, eventAttendus, eventParticipations] = await Promise.all([
      dbx.listEventCiblesForEvents && plannedIds.length ? dbx.listEventCiblesForEvents(plannedIds) : [],
      dbx.listAttendusForEvents && plannedIds.length ? dbx.listAttendusForEvents(plannedIds) : [],
      dbx.listParticipationsForEvents && plannedIds.length ? dbx.listParticipationsForEvents(plannedIds) : []
    ]);
    const ciblesByEvent = new Map();
    for(const row of eventCibles || []){
      const eventId = row.evenement_id;
      if(!ciblesByEvent.has(eventId)) ciblesByEvent.set(eventId, []);
      ciblesByEvent.get(eventId).push(row);
    }
    const attendusByEvent = new Map();
    for(const row of eventAttendus || []){
      const eventId = row.evenement_id;
      if(!attendusByEvent.has(eventId)) attendusByEvent.set(eventId, []);
      attendusByEvent.get(eventId).push(row);
    }
    const participationsByEvent = new Map();
    for(const row of eventParticipations || []){
      const eventId = row.evenement_id;
      if(!participationsByEvent.has(eventId)) participationsByEvent.set(eventId, []);
      participationsByEvent.get(eventId).push(row);
    }
    const touched = new Set(ids);
    const removeOnly = String(options.reason || '') === 'PERSONNEL_SABBATICAL_CREATE';
    const candidates = allEvents.filter((event) => {
      if(event.statut !== 'PLANIFIE' || !event.population_figee || event.origine === 'LEGACY_AGGREGATED' || isQuantitatif(event)) return false;
      const rows = ciblesByEvent.get(event.evenement_id) || [];
      const hasTouchedAttendu = (attendusByEvent.get(event.evenement_id) || []).some((row) => touched.has(String(row.personne_id)));
      if(removeOnly) return hasTouchedAttendu;
      return hasTouchedAttendu || eventCiblesMatchAffected(rows, affectedCibleIds, affectedDomaines);
    });
    return syncExpectedPopulationForEvents(dbx, candidates, actor, {
      ...options,
      personneIds: ids,
      ciblesByEvent,
      attendusByEvent,
      participationsByEvent
    });
  }

  async function syncExpectedPopulationForPersonnes(personneIds, actor, options = {}){
    return syncExpectedPopulationForPersonnesInRepo(repo, personneIds, actor, options);
  }

  async function isPersonExpectedForEvent(dbx, evenement, personneId){
    const cibleIds = await eventPopulationCibleIds(dbx, evenement.evenement_id);
    return evaluatePersonExpectedForEvent(dbx, evenement, cibleIds, personneId);
  }

  function previewPopulationStore(store){
    const base = store || repo;
    const cache = {
      cibles: null,
      ciblesById: new Map(),
      personnes: new Map(),
      periodes: new Map(),
      suivi: null
    };
    return {
      async listCibles(){
        if(!cache.cibles){
          cache.cibles = base.listCibles ? await base.listCibles() : [];
          cache.cibles.forEach((cible) => cache.ciblesById.set(cible.cible_id, cible));
        }
        return cache.cibles;
      },
      async getCible(id){
        await this.listCibles();
        if(cache.ciblesById.has(id)) return cache.ciblesById.get(id);
        const cible = base.getCible ? await base.getCible(id) : null;
        if(cible) cache.ciblesById.set(id, cible);
        return cible;
      },
      async listSuiviNominatif(){
        if(!cache.suivi){
          cache.suivi = base.listSuiviNominatif ? await base.listSuiviNominatif() : [];
        }
        return cache.suivi;
      },
      async listAffectationsForCibles(cibleIds, date){
        return base.listAffectationsForCibles ? base.listAffectationsForCibles(cibleIds, date) : [];
      },
      async getPersonne(id){
        if(cache.personnes.has(id)) return cache.personnes.get(id);
        const personne = base.getPersonne ? await base.getPersonne(id) : null;
        cache.personnes.set(id, personne);
        return personne;
      },
      async listPersonnesPeriodes(id){
        if(cache.periodes.has(id)) return cache.periodes.get(id);
        const periodes = base.listPersonnesPeriodes ? await base.listPersonnesPeriodes(id) : [];
        cache.periodes.set(id, periodes);
        return periodes;
      }
    };
  }

  async function enrichStandardPreviewPopulations(preview){
    if(!preview || !Array.isArray(preview.groups) || !preview.groups.length) return preview;
    const store = previewPopulationStore();
    for(const group of preview.groups){
      const cibleIds = (group.cibles || []).map((c) => c.cibleId).filter(Boolean);
      if(!group.date || !group.domaineStockage || !cibleIds.length || String(group.statut || '').indexOf('ERREUR') === 0){
        group.populationCount = null;
        group.populationLabel = '—';
        continue;
      }
      const population = await resolveEligiblePopulation({
        eventDate: group.date,
        domaineCode: group.domaineStockage,
        sousDomaineCode: group.sousDomaine || null,
        cibleIds,
        store
      });
      group.populationCount = population.count;
      group.populationLabel = `${population.count} ${population.count > 1 ? 'personnes' : 'personne'}`;
      group.populationPreview = {
        count: population.count,
        note: population.note || null
      };
      (group.lignes || []).forEach((line) => {
        line.populationCount = population.count;
        line.populationLabel = group.populationLabel;
      });
    }
    return preview;
  }

  async function photographieFigee(eventId){
    const attendus = await repo.listAttendus(eventId);
    const personnes = [];
    for(const row of attendus){
      if(row.inclus === false) continue;
      const personne = await repo.getPersonne(row.personne_id);
      personnes.push({
        personneId: row.personne_id,
        nip: personne?.nip,
        nom: personne?.nom,
        prenom: personne?.prenom,
        grade: personne?.grade,
        cibles: [],
        origine: row.origine || 'FIGE',
        motifInclusion: row.motif_inclusion || 'photographie_figee',
        fige: true
      });
    }
    return { count: personnes.length, personnes, fige: true, photographie: true };
  }


  async function decorateJspEventPopulations(evenement, preview){
    const result = preview || { personnes: [] };
    const personnes = result.personnes || [];
    if(String(evenement && evenement.domaine_code || '').toUpperCase() !== 'JSP'){
      return Object.assign({}, result, { jeunes: [] });
    }
    const date = evenement.date;
    const decorated = [];
    for(const person of personnes){
      const role = await classifyJspRoleForEventPerson(
        { grade: person.grade },
        person.personneId || person.personne_id,
        date
      );
      decorated.push(Object.assign({}, person, { jspRole: role }));
    }
    const jeunes = decorated.filter((row) => row.jspRole === 'JEUNE');
    return Object.assign({}, result, {
      personnes: jeunes,
      count: jeunes.length,
      jeunes
    });
  }

  async function classifyJspRoleForEventPerson(person, personneId, date){
    const raw = repo.listAffectations
      ? await repo.listAffectations({ personneId, date })
      : [];
    const affs = [];
    for(const aff of raw){
      const cible = aff.cible_id && repo.getCible ? await repo.getCible(aff.cible_id) : null;
      affs.push({
        ...aff,
        categorie: aff.categorie || 'OI',
        domaine: aff.domaine || cible?.domaine_code,
        cible: aff.cible || cible?.niveau_code,
        date_actif: aff.date_actif || aff.date_debut,
        date_inactif: aff.date_inactif || aff.date_fin
      });
    }
    return display.classifyJspRole(person, affs, date);
  }

  async function previewAttendus(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    if(evenement.origine === 'LEGACY_AGGREGATED'){
      return { count: 0, personnes: [], note: 'Legacy agrégé : aucune population nominative.' };
    }
    if(isQuantitatif(evenement)){
      throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas de population nominative.');
    }
    if(evenement.population_figee){
      const frozen = await photographieFigee(eventId);
      return decorateJspEventPopulations(evenement, frozen);
    }
    const cibleIds = await repo.listEventCibleIds(eventId);
    const preview = await resolveEligiblePopulation({
      eventDate: evenement.date,
      domaineCode: evenement.domaine_code,
      sousDomaineCode: evenement.sous_domaine_code,
      cibleIds
    });
    return decorateJspEventPopulations(evenement, preview);
  }

  async function listPeriodes(personneId){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const periodes = repo.listPersonnesPeriodes ? await repo.listPersonnesPeriodes(personneId) : [];
    return { personne, periodes };
  }

  async function syncPersonneSnapshot(tx, personneId, today){
    const periodes = await tx.listPersonnesPeriodes(personneId);
    const snap = deriveStatutCourant(periodes, today);
    const actifs = periodes
      .filter((row) => row.type === TYPES_PERIODE.ACTIF)
      .sort((a, b) => String(a.date_debut).localeCompare(String(b.date_debut)));
    const archiveOpen = periodes.find((row) =>
      (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
    );
    await tx.updatePersonne(personneId, {
      actif: snap.actif,
      statut_rh: snap.statut_rh,
      date_entree: actifs[0] ? actifs[0].date_debut : undefined,
      date_sortie: archiveOpen ? archiveOpen.date_debut : null
    });
    return tx.getPersonne(personneId);
  }

  async function journalClotureAffectations(tx, actor, personne, closed, dateEffet){
    for(const item of closed){
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personne.personne_id,
        action: 'CLOTURER_AFFECTATION',
        avant: {
          nip: personne.nip,
          affectation_id: item.affectation_id,
          cible_id: item.cible_id,
          date_debut: item.date_debut,
          date_fin: null
        },
        apres: {
          date_fin: item.date_fin,
          date_effet: dateEffet
        }
      });
    }
  }

  async function ouvrirPeriode(personneId, body, actor){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personneId);
      const normalized = assertPeriodCompatible(existing, body);
      const saved = await tx.insertPeriode({
        personne_id: personneId,
        type: normalized.type,
        date_debut: normalized.date_debut,
        date_fin: normalized.date_fin,
        motif: normalized.motif,
        source: body.source || 'MANUEL'
      });
      const next = await syncPersonneSnapshot(tx, personneId, normalized.date_debut);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'OUVRIR_PERIODE',
        avant: { statut_rh: personne.statut_rh },
        apres: { periode_id: saved.periode_id, type: saved.type, date_debut: saved.date_debut }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'OUVRIR_PERIODE' });
      return { personne: next, periode: saved, synchronisationPopulation };
    });
  }

  async function cloturerPeriode(personneId, periodeId, body, actor){
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const dateFin = isoDate(body.dateFin || body.date_fin);
    if(!dateFin) throw new HttpError(400, 'date_fin_obligatoire', 'La date de fin de période est obligatoire.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personneId);
      const current = existing.find((row) => row.periode_id === periodeId);
      if(!current) throw new HttpError(404, 'periode_introuvable', 'Période introuvable.');
      assertPeriodCompatible(existing, { ...current, date_fin: dateFin });
      const saved = await tx.updatePeriode(periodeId, { date_fin: dateFin });
      const next = await syncPersonneSnapshot(tx, personneId, dateFin);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'CLOTURER_PERIODE',
        apres: { periode_id: periodeId, date_fin: dateFin }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'CLOTURER_PERIODE' });
      return { personne: next, periode: saved, synchronisationPopulation };
    });
  }

  async function archiverPersonne(personneId, body, actor){
    const type = String(body.type || body.statut || TYPES_PERIODE.SORTI).toUpperCase();
    if(type !== TYPES_PERIODE.SORTI && type !== TYPES_PERIODE.DEMISSIONNAIRE){
      throw new HttpError(422, 'type_archive_invalide', 'Archivage : SORTI ou DEMISSIONNAIRE.');
    }
    const date = isoDate(body.date);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date d’archivage invalide.');
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personneId);
      const openArchive = existing.find((row) =>
        (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
      );
      if(openArchive){
        const closed = await closeAllOpenAffectations(tx, personneId, openArchive.date_debut);
        await journalClotureAffectations(tx, actor, personne, closed, openArchive.date_debut);
        const next = await syncPersonneSnapshot(tx, personneId, openArchive.date_debut);
        const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'ARCHIVER_DEJA_ARCHIVE' });
        return { personne: next, periode: openArchive, dejaArchive: true, affectationsCloturees: closed, synchronisationPopulation };
      }
      const lastActive = dayBefore(date);
      for(const row of existing){
        if(row.date_fin) continue;
        if(row.type === TYPES_PERIODE.ACTIF || row.type === TYPES_PERIODE.INDISPONIBLE){
          if(!lastActive || lastActive < row.date_debut){
            throw new HttpError(422, 'archive_trop_tot', 'La date d’archivage ne peut pas précéder le début d’activité.');
          }
          await tx.updatePeriode(row.periode_id, { date_fin: lastActive });
        }
      }
      const afterClose = await tx.listPersonnesPeriodes(personneId);
      const normalized = assertPeriodCompatible(afterClose, { type, date_debut: date, date_fin: null });
      const periode = await tx.insertPeriode({
        personne_id: personneId,
        ...normalized,
        source: body.source || 'MANUEL'
      });
      const closed = await closeAllOpenAffectations(tx, personneId, date);
      await journalClotureAffectations(tx, actor, personne, closed, date);
      const next = await syncPersonneSnapshot(tx, personneId, date);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'ARCHIVER',
        avant: { nip: personne.nip, personne_id: personneId },
        apres: {
          type,
          date,
          periode_id: periode.periode_id,
          affectationsCloturees: closed.map((item) => item.affectation_id)
        }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'ARCHIVER' });
      return { personne: next, periode, affectationsCloturees: closed, synchronisationPopulation };
    });
  }

  async function reactiverPersonne(body, actor){
    const date = isoDate(body.date);
    if(!date) throw new HttpError(400, 'date_invalide', 'Date de réactivation invalide.');
    let personne = body.personneId || body.personne_id
      ? await repo.getPersonne(body.personneId || body.personne_id)
      : null;
    if(!personne && body.nip){
      personne = await repo.getPersonneByNip(String(body.nip).trim());
    }
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable. Réactivation par NIP uniquement, jamais par nom/prénom.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listPersonnesPeriodes(personne.personne_id);
      const openArchive = existing.find((row) =>
        (row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE) && !row.date_fin
      );
      if(openArchive){
        const leftover = await closeAllOpenAffectations(tx, personne.personne_id, openArchive.date_debut);
        await journalClotureAffectations(tx, actor, personne, leftover, openArchive.date_debut);
      }
      const lastOut = dayBefore(date);
      for(const row of existing){
        if(row.date_fin) continue;
        if(row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE){
          if(!lastOut || lastOut < row.date_debut){
            throw new HttpError(422, 'reactivation_trop_tot', 'La réactivation ne peut pas précéder le début d’archivage.');
          }
          await tx.updatePeriode(row.periode_id, { date_fin: lastOut });
        }
      }
      const afterClose = await tx.listPersonnesPeriodes(personne.personne_id);
      if(afterClose.some((row) => row.type === TYPES_PERIODE.ACTIF && !row.date_fin)){
        const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
        const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personne.personne_id], actor, { reason: 'REACTIVER_DEJA_ACTIVE' });
        return { personne: next, dejaActive: true, synchronisationPopulation };
      }
      const normalized = assertPeriodCompatible(afterClose, {
        type: TYPES_PERIODE.ACTIF,
        date_debut: date,
        date_fin: null
      });
      const periode = await tx.insertPeriode({
        personne_id: personne.personne_id,
        ...normalized,
        source: body.source || 'MANUEL'
      });
      let affectation = null;
      const cibleId = body.cibleId || body.cible_id;
      if(cibleId){
        await assertNoAffectationOverlapInDomain(personne.personne_id, cibleId, date, null, null, tx);
        affectation = await tx.insertAffectation({
          personne_id: personne.personne_id,
          cible_id: cibleId,
          date_debut: date,
          source: body.source || 'MANUEL'
        });
      }
      const next = await syncPersonneSnapshot(tx, personne.personne_id, date);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personne.personne_id,
        action: 'REACTIVER',
        avant: { nip: personne.nip, personne_id: personne.personne_id },
        apres: {
          date,
          periode_id: periode.periode_id,
          affectation_id: affectation ? affectation.affectation_id : null,
          cible_id: cibleId || null
        }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personne.personne_id], actor, { reason: 'REACTIVER' });
      return { personne: next, periode, affectation, memeIdentite: true, synchronisationPopulation };
    });
  }

  async function createPersonne(body, actor){
    const nip = String(body.nip || '').trim();
    const nom = String(body.nom || '').trim();
    const prenom = String(body.prenom || '').trim();
    if(!nip) throw new HttpError(400, 'nip_obligatoire', 'Le NIP est obligatoire.');
    if(!nom || !prenom) throw new HttpError(400, 'identite_obligatoire', 'Nom et prénom sont obligatoires.');
    const existing = await repo.getPersonneByNip(nip);
    if(existing){
      throw new HttpError(409, 'nip_existant', 'Ce NIP existe déjà. Réactiver la même personne, ne pas recréer d’identité.');
    }
    return repo.withTransaction(async (tx) => {
      const saved = await tx.insertPersonne({
        nip,
        nom,
        prenom,
        grade: body.grade || null,
        date_entree: isoDate(body.dateEntree || body.date_entree) || isoDate(body.date) || null,
        source: body.source || 'MANUEL'
      });
      if(body.cibleId || body.cible_id){
        const cibleId = body.cibleId || body.cible_id;
        const debut = isoDate(body.dateDebut || body.date_debut || saved.date_entree) || isoDate(new Date().toISOString());
        await assertNoAffectationOverlapInDomain(saved.personne_id, cibleId, debut, null);
        await tx.insertAffectation({
          personne_id: saved.personne_id,
          cible_id: cibleId,
          date_debut: debut,
          source: body.source || 'MANUEL'
        });
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: saved.personne_id,
        action: 'PERSONNEL_MANUAL_CREATE',
        apres: { nip: saved.nip }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [saved.personne_id], actor, { reason: 'CREER_PERSONNE' });
      return { personne: saved, synchronisationPopulation };
    });
  }

  async function changerAffectation(personneId, body, actor){
    const cibleId = body.cibleId || body.cible_id;
    const dateDebut = isoDate(body.dateDebut || body.date_debut || body.date);
    if(!cibleId) throw new HttpError(400, 'cible_obligatoire', 'La nouvelle cible est obligatoire.');
    if(!dateDebut) throw new HttpError(400, 'date_invalide', 'Date de changement d’affectation invalide.');
    const personne = await repo.getPersonne(personneId);
    if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
    const cible = await repo.getCible(cibleId);
    if(!cible) throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.');
    return repo.withTransaction(async (tx) => {
      const existing = await tx.listAffectations({ personneId });
      const lastDay = dayBefore(dateDebut);
      for(const aff of existing){
        const other = await tx.getCible(aff.cible_id);
        if(!other || other.domaine_code !== cible.domaine_code) continue;
        if(aff.date_fin) continue;
        if(!lastDay || lastDay < aff.date_debut){
          throw new HttpError(422, 'changement_trop_tot', 'Le changement d’affectation chevauche le début de l’affectation en cours.');
        }
        await tx.updateAffectation(aff.affectation_id, { date_fin: lastDay });
      }
      await assertNoAffectationOverlapInDomain(personneId, cibleId, dateDebut, isoDate(body.dateFin || body.date_fin), null, tx);
      const saved = await tx.insertAffectation({
        personne_id: personneId,
        cible_id: cibleId,
        date_debut: dateDebut,
        date_fin: isoDate(body.dateFin || body.date_fin),
        source: body.source || 'MANUEL'
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'personne',
        entite_id: personneId,
        action: 'CHANGER_AFFECTATION',
        apres: { cible_id: cibleId, date_debut: dateDebut, domaine: cible.domaine_code }
      });
      const synchronisationPopulation = await syncExpectedPopulationForPersonnesInRepo(tx, [personneId], actor, { reason: 'CHANGER_AFFECTATION' });
      return { affectation: saved, cible, synchronisationPopulation };
    });
  }

  async function previewPersonnelSync(body){
    return personnelSync.previewPersonnelSync(repo, body || {});
  }

  async function commitPersonnelSync(body, actor){
    const rapport = await personnelSync.commitPersonnelSync(repo, body || {}, actor);
    const touchedNips = normalizeIdList([
      ...(rapport.applied || []).map((row) => row.nip),
      ...(rapport.analysedNips || rapport.analysed_nips || [])
    ]);
    const touchedIds = [];
    for(const nip of touchedNips){
      const personne = repo.getPersonneByNip ? await repo.getPersonneByNip(nip) : null;
      if(personne?.personne_id) touchedIds.push(personne.personne_id);
    }
    rapport.synchronisationPopulation = await syncExpectedPopulationForPersonnes(touchedIds, actor, { reason: 'IMPORT_PERSONNEL_COHERENCE' });
    return rapport;
  }

  async function figerPopulation(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.origine === 'LEGACY_AGGREGATED'){
        throw new HttpError(422, 'legacy', 'Impossible de figer une population nominative sur un agrégat legacy.');
      }
      if(isQuantitatif(evenement)){
        throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas de population à figer.');
      }
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Le gel n’est possible que sur un événement PLANIFIE.');
      if(evenement.population_figee){
        if(body && body.assignmentRequest){
          const current = await photographieFigee(eventId);
          return { evenement, version: evenement.version, count: current.count || 0, alreadyAssigned: true };
        }
        throw new HttpError(422, 'deja_figee', 'La population est déjà figée.');
      }
      const preview = await previewAttendus(eventId);
      const previewById = new Map((preview.personnes || []).map((personne) => [String(personne.personneId || personne.personne_id || ''), personne]));
      const hasSelectionBody = Array.isArray(body && body.selectedPersonIds) || Array.isArray(body && body.personneIds);
      const requestedIds = Array.isArray(body && body.selectedPersonIds)
        ? body.selectedPersonIds.map((id) => String(id || '')).filter(Boolean)
        : Array.isArray(body && body.personneIds)
          ? body.personneIds.map((id) => String(id || '')).filter(Boolean)
          : [];
      const selectedIds = [...new Set(hasSelectionBody ? requestedIds : (preview.personnes || []).map((p) => String(p.personneId || p.personne_id || '')).filter(Boolean))];
      if(!selectedIds.length && (hasSelectionBody || body && body.assignmentRequest)){
        throw new HttpError(422, 'population_vide', 'Aucun participant n’est sélectionné pour cet événement.');
      }
      const stamp = new Date().toISOString();
      const snapshot = evenement.participation_policy_snapshot || await capturePolicySnapshot(tx, evenement.domaine_code);
      for(const personneId of selectedIds){
        const personne = previewById.get(String(personneId)) || {};
        if(!previewById.has(String(personneId))){
          const existingPerson = await tx.getPersonne(personneId);
          if(!existingPerson) throw new HttpError(404, 'personne_introuvable', 'Une personne sélectionnée est introuvable.');
        }
        const cibleMotif = (personne.cibles || [])
          .map((c) => `${c.domaineCode || c.domaine_code}_${c.niveauCode || c.niveau_code}`)
          .filter(Boolean)
          .join('|');
        await tx.upsertAttendu({
          evenement_id: eventId,
          personne_id: personneId,
          inclus: true,
          origine: previewById.has(String(personneId)) ? 'REGLE' : 'EXCEPTION_AJOUT',
          motif_inclusion: cibleMotif || personne.motifInclusion || (previewById.has(String(personneId)) ? null : 'exception_ajout')
        });
        await tx.upsertParticipation({
          evenement_id: eventId,
          personne_id: personneId,
          statut: 'NON_RENSEIGNE',
          role: 'PARTICIPANT',
          source: 'GENERATION',
          auteur_id: actorId(actor)
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {
        population_figee: true,
        population_version: evenement.population_version + 1,
        figee_at: stamp,
        figee_par: actorId(actor),
        participation_policy_version: evenement.participation_policy_version || snapshot.policyVersion,
        participation_policy_snapshot: evenement.participation_policy_snapshot || snapshot
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'ASSIGNER_PARTICIPANTS',
        apres: { count: selectedIds.length, proposed: preview.count, version: next.version }
      });
      return { evenement: next, version: next.version, count: selectedIds.length };
    });
  }

  async function ajouterException(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const role = String(body.role || 'RENFORT');
    if(!['RENFORT', 'REMPLACANT', 'PARTICIPANT'].includes(role)){
      throw new HttpError(422, 'role_invalide', 'Rôle d’exception invalide.');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(isQuantitatif(evenement)){
        throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas d’exceptions nominatives.');
      }
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Exception possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Figer la population avant d’ajouter une exception.');
      const personne = await tx.getPersonne(personneId);
      if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
      const existing = await tx.getAttendu(eventId, personneId);
      if(existing && existing.inclus){
        return {
          evenement,
          version: evenement.version,
          dejaPresent: true,
          message: 'Cette personne appartient déjà à l’effectif.'
        };
      }
      const expected = await isPersonExpectedForEvent(tx, evenement, personneId);
      const origine = expected ? 'REGLE' : 'EXCEPTION_AJOUT';
      const motifInclusion = expected
        ? cibleMotifFromPopulationPerson(expected)
        : (body.motifInclusion || body.motif_inclusion || 'exception_ajout');
      await tx.upsertAttendu({
        evenement_id: eventId,
        personne_id: personneId,
        inclus: true,
        origine,
        origine_retrait: null,
        motif_inclusion: motifInclusion
      });
      const participation = await tx.getParticipation(eventId, personneId);
      if(!participation){
        await tx.upsertParticipation({
          evenement_id: eventId,
          personne_id: personneId,
          statut: 'NON_RENSEIGNE',
          role: 'PARTICIPANT',
          source: expected ? 'GENERATION' : 'EXCEPTION',
          auteur_id: actorId(actor)
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: expected ? 'ATTENDU_CIBLE_AJOUT' : 'EXCEPTION_AJOUT',
        apres: { personneId, role, origine },
        commentaire: body.commentaire || null
      });
      return { evenement: next, version: next.version };
    });
  }

  async function retirerAttendu(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Retrait possible uniquement sur PLANIFIE.');
      const attendu = await tx.getAttendu(eventId, personneId);
      if(!attendu) throw new HttpError(404, 'attendu_introuvable', 'Attendu introuvable.');
      await releasePermutationCatchupForParticipation(tx, evenement, personneId, actor);
      await tx.upsertAttendu({
        ...attendu,
        inclus: false,
        origine_retrait: 'EXCEPTION_RETRAIT'
      });
      const participation = await tx.getParticipation(eventId, personneId);
      if(isPermutationCatchupAttendu(attendu) && typeof tx.deleteParticipation === 'function'){
        await tx.deleteParticipation(eventId, personneId);
      } else {
        await tx.upsertParticipation({
          ...(participation || { evenement_id: eventId, personne_id: personneId, role: 'PARTICIPANT' }),
          statut: 'NON_CONCERNE',
          auteur_id: actorId(actor)
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'EXCEPTION_RETRAIT',
        apres: { personneId }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function prSeriesEvents(tx, evenement){
    if(evenement.exercice_id && tx.listExerciseEvents){
      const rows = await tx.listExerciseEvents(evenement.exercice_id);
      return resolveSessionReportingScope({ evenements: rows || [], currentEvent: evenement }).events
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(prSessionLabel(a)).localeCompare(String(prSessionLabel(b)), 'fr', { numeric: true }));
    }
    if(String(evenement.domaine_code || '').toUpperCase() !== 'PR') return [evenement];
    const rows = tx.listPrExerciseEvents && evenement.pr_exercise_group_key
      ? await tx.listPrExerciseEvents(evenement.pr_exercise_group_key)
      : (evenement.cycle_id && tx.listCycleEvents ? await tx.listCycleEvents(evenement.cycle_id) : [evenement]);
    return resolveSessionReportingScope({ evenements: rows || [], currentEvent: evenement }).events
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(prSessionLabel(a)).localeCompare(String(prSessionLabel(b)), 'fr', { numeric: true }));
  }

  function isFirstPrSessionEvent(evenement){
    return String(evenement.domaine_code || '').toUpperCase() === 'PR' && /\b\d+\.1$/.test(prSessionLabel(evenement));
  }

  async function removeEncadrementRow(tx, eventId, personneId, participation, actor){
    const attendu = await tx.getAttendu(eventId, personneId);
    if(attendu && attendu.inclus){
      const previousStatut = String(participation.statut || '').toUpperCase();
      const previousSource = String(participation.source || '').toUpperCase();
      const previousRole = String(participation.role || '').toUpperCase();
      const keepParticipantPresence = (previousRole === 'FORMATEUR' || previousRole === 'SURVEILLANT')
        && previousStatut === 'PRESENT'
        && previousSource !== 'ENCADREMENT';
      await tx.upsertParticipation({
        ...participation,
        statut: keepParticipantPresence ? 'PRESENT' : 'NON_RENSEIGNE',
        motif_absence: null,
        commentaire: null,
        role: 'PARTICIPANT',
        source: keepParticipantPresence ? participation.source : 'SAISIE',
        auteur_id: actorId(actor)
      });
      return;
    }
    if(typeof tx.deleteParticipation === 'function'){
      await tx.deleteParticipation(eventId, personneId);
    } else {
      await tx.upsertParticipation({
        ...participation,
        statut: 'NON_CONCERNE',
        role: 'PARTICIPANT',
        source: 'SAISIE',
        auteur_id: actorId(actor)
      });
    }
  }

  async function retirerEncadrement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const scope = String(body.scope || body.portee || 'SESSION').toUpperCase();
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Encadrement saisissable uniquement sur PLANIFIE.');
      const participation = await tx.getParticipation(eventId, personneId);
      if(!participation || !ROLES_ENCADREMENT.has(participation.role)){
        throw new HttpError(404, 'encadrement_introuvable', 'Encadrement introuvable.');
      }
      if(scope === 'SERIE' && String(participation.role || '').toUpperCase() !== 'FORMATEUR'){
        throw new HttpError(422, 'serie_formateur_uniquement', 'Le retrait de série est réservé au rôle Formateur.');
      }
      const targets = scope === 'SERIE'
        ? (await prSeriesEvents(tx, evenement)).filter((row) => row.statut === 'PLANIFIE')
        : [evenement];
      let removed = 0;
      for(const target of targets){
        const targetId = target.evenement_id;
        const row = targetId === eventId ? participation : await tx.getParticipation(targetId, personneId);
        if(!row || !ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase())) continue;
        if(scope === 'SERIE' && String(row.role || '').toUpperCase() !== 'FORMATEUR') continue;
        await removeEncadrementRow(tx, targetId, personneId, row, actor);
        await bumpOrConflict(tx, targetId, targetId === eventId ? baseVersion : target.version, {});
        removed += 1;
      }
      const next = await tx.getEvent(eventId);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: scope === 'SERIE' ? 'ENCADREMENT_SERIE_RETRAIT' : 'ENCADREMENT_RETRAIT',
        apres: { personneId, role: participation.role, scope, count: removed }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function loadPrExerciseParticipationState(store, evenement, eventId){
    if(!(evenement && (evenement.exercice_id || evenement.cycle_id || evenement.pr_exercise_group_key)) || !store.listParticipationsForEvents) return null;
    const cycle = evenement.cycle_id && store.getCycle
      ? await store.getCycle(evenement.cycle_id)
      : { cycle_id: null, domaine_code: evenement.domaine_code || 'PR' };
    if(!cycle) return null;
    const cycleEvents = evenement.exercice_id && store.listExerciseEvents
      ? await store.listExerciseEvents(evenement.exercice_id)
      : (store.listPrExerciseEvents && evenement.pr_exercise_group_key
        ? await store.listPrExerciseEvents(evenement.pr_exercise_group_key)
        : (evenement.cycle_id && store.listCycleEvents ? await store.listCycleEvents(evenement.cycle_id) : [evenement]));
    const scoped = resolveSessionReportingScope({ evenements: cycleEvents, currentEvent: evenement });
    const scopedEvents = scoped.events.length ? scoped.events : [evenement];
    const cyclePersonnes = evenement.cycle_id && store.listCyclePersonnes ? await store.listCyclePersonnes(evenement.cycle_id) : [];
    const cycleParticipations = scopedEvents.length ? await store.listParticipationsForEvents(scopedEvents.map((row) => row.evenement_id)) : [];
    const cycleAttendus = store.listAttendusForEvents && scopedEvents.length ? await store.listAttendusForEvents(scopedEvents.map((row) => row.evenement_id)) : [];
    const scopedPersonneIds = new Set([
      ...cycleParticipations.map((row) => String(row.personne_id || row.personneId || '')),
      ...cycleAttendus.map((row) => String(row.personne_id || row.personneId || ''))
    ].filter(Boolean));
    const scopedCyclePersonnes = cyclePersonnes.filter((row) => scopedPersonneIds.has(String(row.personne_id || row.personneId || '')));
    const personnes = await hydratePersonnes([
      ...scopedCyclePersonnes.map((row) => row.personne_id),
      ...cycleParticipations.map((row) => row.personne_id),
      ...cycleAttendus.map((row) => row.personne_id)
    ]);
    return computeMultiSessionParticipationState({
      cycle,
      evenements: scopedEvents,
      cyclePersonnes: scopedCyclePersonnes,
      attendus: cycleAttendus,
      participations: cycleParticipations,
      personnes,
      currentEventId: eventId
    });
  }

  async function loadMultiSessionV2State(store, evenement, eventId){
    if(!store.getMultisessionV2ForEvent || !store.listMultisessionV2Sessions) return null;
    const multisession = await store.getMultisessionV2ForEvent(eventId || evenement?.evenement_id);
    if(!multisession) return null;
    const sessions = await store.listMultisessionV2Sessions(multisession.multisession_id || multisession.id);
    const eventIds = (sessions || []).map((row) => row.evenement_id || row.event_id).filter(Boolean);
    const populationRows = store.listMultisessionV2Population
      ? await store.listMultisessionV2Population(multisession.multisession_id || multisession.id)
      : [];
    const participationRows = store.listParticipationsForEvents && eventIds.length
      ? await store.listParticipationsForEvents(eventIds)
      : [];
    const personnes = await hydratePersonnes([
      ...populationRows.map((row) => row.person_id || row.personne_id),
      ...participationRows.map((row) => row.personne_id)
    ]);
    return MultiSessionV2.buildState({
      multisession,
      sessions,
      population: populationRows.map((row) => Object.assign({}, row, { personne_id: row.personne_id || row.person_id })),
      participations: participationRows,
      personnes,
      currentEventId: eventId || evenement?.evenement_id
    });
  }

  async function ensureMultiSessionV2EventRows(store, state, evenement, actor){
    if(!state || !state.multisessionId) return;
    const eventId = evenement.evenement_id;
    const currentAttendus = store.listAttendus ? await store.listAttendus(eventId) : [];
    const attenduIds = new Set(currentAttendus.filter((row) => row.inclus !== false).map((row) => String(row.personne_id)));
    for(const row of state.multisession ? (await store.listMultisessionV2Population(state.multisessionId)) : []){
      const personneId = String(row.person_id || row.personne_id || '');
      if(!personneId || attenduIds.has(personneId)) continue;
      await store.upsertAttendu({
        evenement_id: eventId,
        personne_id: personneId,
        inclus: true,
        origine: 'MULTISESSION_V2',
        origine_retrait: null,
        motif_inclusion: 'multisession_v2_population'
      });
      if(!(await store.getParticipation(eventId, personneId))){
        await store.upsertParticipation({
          evenement_id: eventId,
          personne_id: personneId,
          statut: 'NON_RENSEIGNE',
          role: 'PARTICIPANT',
          source: 'MULTISESSION_V2',
          auteur_id: actorId(actor)
        });
      }
    }
  }

  async function mirrorMultiSessionV2Participation(store, state, eventId, row, actor){
    if(!state || !store.upsertMultisessionV2Participation) return;
    await store.upsertMultisessionV2Participation({
      multisession_id: state.multisessionId,
      session_id: eventId,
      person_id: row.personne_id || row.personneId,
      attendance_status: row.statut,
      role: row.role || 'PARTICIPANT',
      reason: row.motif_absence || null,
      created_by: actorId(actor)
    });
  }

  function multisessionV2PersonState(state, personneId){
    return state && state.byPersonneId ? state.byPersonneId[String(personneId || '')] : null;
  }

  async function firstEventCibleId(tx, eventId){
    const ids = tx.listEventCibleIds ? await tx.listEventCibleIds(eventId) : [];
    return ids && ids.length ? ids[0] : null;
  }

  function explicitPermutationExerciseKey(evenement){
    return normalizeExerciseEquivalenceKey(evenement && (evenement.exercise_equivalence_key || evenement.exerciseEquivalenceKey));
  }

  function cibleSectionLabel(cible){
    if(!cible) return '';
    return [cible.domaine_code || cible.domaineCode, cible.niveau_code || cible.niveauCode]
      .filter(Boolean)
      .join(' ');
  }

  async function decorateSourcePermutationAttendus(tx, evenement, attendus, cibles = []){
    if(!tx.listPermutations || String(evenement && evenement.domaine_code || '').toUpperCase() !== 'DAP') return attendus;
    const rows = await tx.listPermutations({ sourceEvenementId: evenement.evenement_id });
    if(!(rows || []).length) return attendus;
    const cibleById = new Map((cibles || []).map((c) => [String(c.cible_id || c.cibleId), c]));
    const byPersonne = new Map((rows || []).map((row) => [String(row.personne_id), row]));
    return (attendus || []).map((attendu) => {
      const obligation = byPersonne.get(String(attendu.personne_id || attendu.personneId));
      if(!obligation) return attendu;
      const rattrapageCible = obligation.rattrapage_cible_id
        ? cibleSectionLabel(cibleById.get(String(obligation.rattrapage_cible_id)))
        : '';
      return Object.assign({}, attendu, {
        permutation_obligation_status: obligation.statut || null,
        permutationObligationStatus: obligation.statut || null,
        permutation_rattrapage_cible_label: rattrapageCible || null,
        permutationRattrapageCibleLabel: rattrapageCible || null
      });
    });
  }

  function fulfilledPermutationPersonIds(rows, sourceEvenementId){
    return new Set((rows || [])
      .filter((row) =>
        String(row.source_evenement_id || '') === String(sourceEvenementId || '')
        && String(row.statut || '').toUpperCase() === PERMUTATION_STATUS.RATTRAPPE
        && row.rattrapage_evenement_id
      )
      .map((row) => String(row.personne_id || ''))
      .filter(Boolean));
  }

  async function fulfilledPermutationPersonIdsForEvent(tx, evenement){
    if(!tx.listPermutations || String(evenement && evenement.domaine_code || '').toUpperCase() !== 'DAP') return new Set();
    const rows = await tx.listPermutations({
      sourceEvenementId: evenement.evenement_id,
      statut: [PERMUTATION_STATUS.RATTRAPPE]
    });
    return fulfilledPermutationPersonIds(rows, evenement.evenement_id);
  }

  async function sectionEffectifAtEventDate(tx, evenement, cibleIds){
    if(!tx.listAffectationsForCibles || !(cibleIds || []).length) return null;
    const rows = await tx.listAffectationsForCibles(cibleIds, evenement.date);
    return new Set((rows || []).map((row) => String(row.personne_id || row.personneId || '')).filter(Boolean)).size;
  }

  function catchupAttendusCount(attendus){
    return (attendus || []).filter((row) => row && row.inclus !== false && isPermutationCatchupMotif(row.motif_inclusion || row.motifInclusion)).length;
  }

  async function releasePermutationCatchupForParticipation(tx, evenement, personneId, actor){
    if(!tx.listPermutations || !tx.upsertPermutation || !personneId) return null;
    const rows = await tx.listPermutations({
      personneId,
      statut: [PERMUTATION_STATUS.RATTRAPPE]
    });
    const linked = (rows || []).find((row) => String(row.rattrapage_evenement_id || '') === String(evenement.evenement_id || ''));
    if(!linked) return null;
    return tx.upsertPermutation({
      ...linked,
      rattrapage_evenement_id: null,
      rattrapage_cible_id: null,
      rattrapage_date: null,
      statut: PERMUTATION_STATUS.A_RATTRAPER,
      auteur_id: actorId(actor)
    });
  }

  function isPermutationCatchupMotif(value){
    return String(value || '').trim().startsWith('permutation_rattrapage|');
  }

  async function removeSourcePermutationObligation(tx, evenement, personneId, actor){
    if(!tx.listPermutations || !tx.deletePermutation || !personneId) return 0;
    const rows = await tx.listPermutations({
      personneId,
      sourceEvenementId: evenement.evenement_id
    });
    let removed = 0;
    for(const obligation of rows || []){
      if(obligation.rattrapage_evenement_id){
        const targetAttendu = tx.getAttendu
          ? await tx.getAttendu(obligation.rattrapage_evenement_id, personneId)
          : null;
        if(targetAttendu && targetAttendu.inclus !== false && isPermutationCatchupMotif(targetAttendu.motif_inclusion || targetAttendu.motifInclusion)){
          await tx.upsertAttendu({
            ...targetAttendu,
            inclus: false,
            origine_retrait: 'PERMUTATION_SOURCE_CORRIGEE'
          });
          if(typeof tx.deleteParticipation === 'function'){
            await tx.deleteParticipation(obligation.rattrapage_evenement_id, personneId);
          } else {
            const targetParticipation = tx.getParticipation
              ? await tx.getParticipation(obligation.rattrapage_evenement_id, personneId)
              : null;
            await tx.upsertParticipation({
              ...(targetParticipation || { evenement_id: obligation.rattrapage_evenement_id, personne_id: personneId, role: 'PARTICIPANT' }),
              statut: 'NON_CONCERNE',
              source: 'SAISIE',
              auteur_id: actorId(actor)
            });
          }
        }
      }
      await tx.deletePermutation(obligation.permutation_id);
      removed += 1;
    }
    return removed;
  }

  async function syncPermutationWorkflow(tx, evenement, personneId, patch, actor){
    if(!tx.upsertPermutation || !tx.listPermutations) return null;
    if(await loadMultiSessionV2State(tx, evenement, evenement.evenement_id)) return null;
    const status = String(patch.statut || '').toUpperCase();
    const exerciseKey = explicitPermutationExerciseKey(evenement);
    if(status !== 'PRESENT'){
      await releasePermutationCatchupForParticipation(tx, evenement, personneId, actor);
    }
    if(status !== STATUT_PERMUTATION){
      await removeSourcePermutationObligation(tx, evenement, personneId, actor);
    }
    if(!exerciseKey && status !== STATUT_PERMUTATION) return null;
    if(status === STATUT_PERMUTATION){
      if(!exerciseKey) return null;
      return tx.upsertPermutation({
        personne_id: personneId,
        source_evenement_id: evenement.evenement_id,
        source_exercise_key: exerciseKey,
        source_cible_id: patch.cible_suivie_id || await firstEventCibleId(tx, evenement.evenement_id),
        source_date: evenement.date,
        statut: PERMUTATION_STATUS.A_RATTRAPER,
        regularisation_motif: null,
        commentaire: patch.commentaire || null,
        auteur_id: actorId(actor)
      });
    }
    if(status === 'PRESENT' && exerciseKey){
      const open = await tx.listPermutations({
        personneId,
        sourceExerciseKey: exerciseKey,
        statut: [PERMUTATION_STATUS.A_RATTRAPER, PERMUTATION_STATUS.A_REGULARISER]
      });
      for(const obligation of open || []){
        const source = await tx.getEvent(obligation.source_evenement_id);
        if(!isCompatiblePermutationEvent(source, evenement)) continue;
        return tx.upsertPermutation({
          ...obligation,
          rattrapage_evenement_id: evenement.evenement_id,
          rattrapage_cible_id: patch.cible_suivie_id || await firstEventCibleId(tx, evenement.evenement_id),
          rattrapage_date: evenement.date,
          statut: PERMUTATION_STATUS.RATTRAPPE,
          auteur_id: actorId(actor)
        });
      }
    }
    if(status === 'ABSENT_EXCUSE'){
      const open = await tx.listPermutations({
        personneId,
        sourceEvenementId: evenement.evenement_id,
        statut: [PERMUTATION_STATUS.A_RATTRAPER, PERMUTATION_STATUS.A_REGULARISER]
      });
      if((open || []).length){
        return tx.upsertPermutation({
          ...open[0],
          statut: PERMUTATION_STATUS.REGULARISE,
          regularisation_motif: patch.motif_absence,
          commentaire: patch.commentaire || open[0].commentaire || null,
          auteur_id: actorId(actor)
        });
      }
    }
    return null;
  }

  async function permutationsForEvent(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    const v2State = await loadMultiSessionV2State(repo, evenement, eventId);
    if(v2State){
      return { obligations: [], exerciseKey: null, engine: MultiSessionV2.ENGINE.MULTI_SESSION_V2 };
    }
    const exerciseKey = exerciseEquivalenceKeyForEvent(evenement);
    if(String(evenement.domaine_code || '').toUpperCase() !== 'DAP' || !exerciseKey || !repo.listPermutations){
      return { obligations: [], exerciseKey: exerciseKey || null };
    }
    const open = await repo.listPermutations({
      sourceExerciseKey: exerciseKey,
      statut: [PERMUTATION_STATUS.A_RATTRAPER, PERMUTATION_STATUS.A_REGULARISER]
    });
    const obligations = await Promise.all((open || []).map(async (row) => {
      const source = await repo.getEvent(row.source_evenement_id);
      const isSourceEvent = String(row.source_evenement_id || '') === String(evenement.evenement_id || '');
      const isCompatibleCatchup = !isSourceEvent && isCompatiblePermutationEvent(source, evenement);
      if(!isSourceEvent && !isCompatibleCatchup) return null;
      const personne = repo.getPersonne ? await repo.getPersonne(row.personne_id) : null;
      const sourceCible = row.source_cible_id && repo.getCible ? await repo.getCible(row.source_cible_id) : null;
      return {
        permutationId: row.permutation_id,
        personneId: row.personne_id,
        nip: personne && personne.nip,
        nom: personne && personne.nom,
        prenom: personne && personne.prenom,
        grade: personne && personne.grade,
        statut: row.statut,
        role: isSourceEvent ? 'SOURCE' : 'RATTRAPAGE',
        compatible: isCompatibleCatchup,
        source: {
          date: row.source_date,
          libelle: source && source.libelle,
          cibleId: row.source_cible_id || null,
          cibleLabel: sourceCible ? [sourceCible.domaine_code, sourceCible.niveau_code].filter(Boolean).join(' ') : null
        }
      };
    }));
    const filtered = obligations.filter(Boolean);
    return { obligations: filtered, exerciseKey };
  }

  async function regulariserPermutation(permutationId, body, actor){
    const motif = body && (body.motifAbsence || body.motif_absence);
    const commentaire = body && body.commentaire;
    validateParticipationPatch({ statut: 'ABSENT_EXCUSE', motif_absence: motif, commentaire });
    return repo.withTransaction(async (tx) => {
      const existing = tx.getPermutation ? await tx.getPermutation(permutationId) : null;
      if(!existing) throw new HttpError(404, 'permutation_introuvable', 'Obligation de permutation introuvable.');
      if(existing.statut === PERMUTATION_STATUS.RATTRAPPE) throw new HttpError(422, 'permutation_deja_rattrapee', 'Cette permutation est déjà rattrapée.');
      const source = await tx.getEvent(existing.source_evenement_id);
      if(!source) throw new HttpError(404, 'evenement_source_introuvable', 'Événement source introuvable.');
      await tx.upsertParticipation({
        evenement_id: existing.source_evenement_id,
        personne_id: existing.personne_id,
        statut: 'ABSENT_EXCUSE',
        motif_absence: motif,
        commentaire: commentaire || existing.commentaire || null,
        cible_suivie_id: existing.source_cible_id || null,
        role: 'PARTICIPANT',
        source: 'REGULARISATION_PERMUTATION',
        auteur_id: actorId(actor)
      });
      const saved = await tx.upsertPermutation({
        ...existing,
        statut: PERMUTATION_STATUS.REGULARISE,
        regularisation_motif: motif,
        commentaire: commentaire || existing.commentaire || null,
        auteur_id: actorId(actor)
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'permutation',
        entite_id: permutationId,
        action: 'REGULARISER',
        apres: { motif, commentaire: commentaire || null }
      });
      return { permutation: saved };
    });
  }

  async function markUnrecoveredPermutationsForEvent(tx, evenement, participations, actor){
    if(!tx.listPermutations || !tx.upsertPermutation) return 0;
    if(await loadMultiSessionV2State(tx, evenement, evenement.evenement_id)) return 0;
    const exerciseKey = explicitPermutationExerciseKey(evenement);
    if(String(evenement.domaine_code || '').toUpperCase() !== 'DAP' || !exerciseKey) return 0;
    const presentPersonnes = new Set((participations || [])
      .filter((row) => String(row.statut || '').toUpperCase() === 'PRESENT')
      .map((row) => String(row.personne_id || row.personneId || ''))
      .filter(Boolean));
    const open = await tx.listPermutations({
      sourceExerciseKey: exerciseKey,
      statut: [PERMUTATION_STATUS.A_RATTRAPER]
    });
    let changed = 0;
    for(const obligation of open || []){
      if(presentPersonnes.has(String(obligation.personne_id))) continue;
      const source = await tx.getEvent(obligation.source_evenement_id);
      if(!isCompatiblePermutationEvent(source, evenement)) continue;
      await tx.upsertPermutation({
        ...obligation,
        statut: PERMUTATION_STATUS.A_REGULARISER,
        auteur_id: actorId(actor)
      });
      changed += 1;
    }
    return changed;
  }

  async function enregistrerParticipations(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const items = Array.isArray(body.participations) ? body.participations : [];
    if(!items.length) throw new HttpError(400, 'lot_vide', 'Aucune participation à enregistrer.');
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(isQuantitatif(evenement)){
        throw new HttpError(422, 'mode_quantitatif', 'Un événement quantitatif n’a pas de participations nominatives.');
      }
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Saisie possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Population non figée.');
      const policySnapshot = evenement.participation_policy_snapshot || (await capturePolicySnapshot(tx, evenement.domaine_code));
      const v2State = await loadMultiSessionV2State(tx, evenement, eventId);
      if(v2State) await ensureMultiSessionV2EventRows(tx, v2State, evenement, actor);
      const missingExcuseReasons = [];
      for(const item of items){
        if(String(item && item.statut || '').toUpperCase() !== 'ABSENT_EXCUSE') continue;
        const motif = item.motif_absence || item.motifAbsence || null;
        if(motif) continue;
        const personneId = item.personneId || item.personne_id;
        const personne = tx.getPersonne ? await tx.getPersonne(personneId) : null;
        missingExcuseReasons.push({
          personId: personneId,
          personneId,
          nip: personne && personne.nip,
          grade: personne && personne.grade,
          nom: personne && personne.nom,
          prenom: personne && personne.prenom,
          errorCode: 'motif_obligatoire'
        });
      }
      if(missingExcuseReasons.length){
        throw new HttpError(422, 'motif_obligatoire', `Un motif d’excuse doit être renseigné pour ${missingExcuseReasons.length} personne(s).`, { missingExcuseReasons });
      }
      let savedCount = 0;
      let skippedEncadrement = 0;
      for(const item of items){
        const personneId = item.personneId || item.personne_id;
        const attendu = await tx.getAttendu(eventId, personneId);
        if(!attendu || attendu.inclus === false){
          throw new HttpError(422, 'non_attendu', 'Saisie réservée aux personnes attendues incluses.', { personneId });
        }
        const patch = validateParticipationPatch(item, { domaineCode: evenement.domaine_code, participationPolicySnapshot: policySnapshot });
        const role = String(item.role || item.role_participation || 'PARTICIPANT').toUpperCase();
        if(v2State && patch.statut === STATUT_PERMUTATION){
          throw new HttpError(422, 'multisession_v2_permutation_interdite', 'Permutation indisponible pour un Multi-session.');
        }
        const v2PersonState = multisessionV2PersonState(v2State, personneId);
        if(v2PersonState && v2PersonState.alreadyCountedInSession && role === 'PARTICIPANT' && patch.statut !== 'NON_RENSEIGNE'){
          throw new HttpError(422, 'multisession_v2_deja_participe', v2PersonState.sessionMessage || 'Participation déjà enregistrée dans une autre session du Multi-session.', {
            personneId,
            countedEventId: v2PersonState.countedEventId
          });
        }
        let participationRole = ['FORMATEUR', 'SURVEILLANT'].includes(role) ? role : 'PARTICIPANT';
        if(participationRole === 'FORMATEUR' && patch.statut !== 'PRESENT'){
          throw new HttpError(422, 'encadrement_present', 'Un rôle d’encadrement compté en session doit être présent.');
        }
        const existing = await tx.getParticipation(eventId, personneId);
        const existingRole = String(existing?.role || '').toUpperCase();
        if(existingRole === 'SURVEILLANT' && participationRole === 'PARTICIPANT' && patch.statut !== 'NON_RENSEIGNE'){
          participationRole = 'SURVEILLANT';
        }
        if(existing && ROLES_ENCADREMENT.has(String(existing.role || '').toUpperCase()) && participationRole === 'PARTICIPANT'){
          skippedEncadrement += 1;
          continue;
        }
        const temporalPatch = normalizeParticipationTemporal(item, evenement);
        await tx.upsertParticipation({
          ...(existing || { evenement_id: eventId, personne_id: personneId, role: 'PARTICIPANT' }),
          ...patch,
          ...temporalPatch,
          role: participationRole,
          source: 'SAISIE',
          auteur_id: actorId(actor)
        });
        await mirrorMultiSessionV2Participation(tx, v2State, eventId, {
          personne_id: personneId,
          statut: patch.statut,
          role: participationRole,
          motif_absence: patch.motif_absence || null
        }, actor);
        await syncPermutationWorkflow(tx, evenement, personneId, patch, actor);
        savedCount += 1;
      }
      if(savedCount === 0){
        return { evenement, version: evenement.version, skippedEncadrement };
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, evenement.participation_policy_snapshot ? {} : {
        participation_policy_version: policySnapshot.policyVersion,
        participation_policy_snapshot: policySnapshot
      });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'SAISIE_PARTICIPATIONS',
        apres: { count: savedCount, skippedEncadrement, version: next.version }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function resetParticipations(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Réinitialisation possible uniquement sur PLANIFIE.');
      if(!evenement.population_figee) throw new HttpError(422, 'population_non_figee', 'Population non figée.');
      const attendus = await tx.listAttendus(eventId);
      const participations = await tx.listParticipations(eventId);
      const participationsByPersonneId = new Map(participations.map((p) => [String(p.personne_id), p]));
      const catchupAttendus = attendus.filter((a) => a.inclus !== false && isPermutationCatchupAttendu(a));
      const resettableAttendus = attendus.filter((a) => a.inclus !== false && !isPermutationCatchupAttendu(a));
      const attenduIds = new Set(resettableAttendus.map((a) => String(a.personne_id)));
      const encadrementRows = participations.filter((p) => ROLES_ENCADREMENT.has(String(p.role || '').toUpperCase()));
      for(const attendu of resettableAttendus){
        const existing = participationsByPersonneId.get(String(attendu.personne_id));
        if(String(existing && existing.statut || '').toUpperCase() === STATUT_PERMUTATION){
          await removeSourcePermutationObligation(tx, evenement, attendu.personne_id, actor);
        }
      }
      for(const attendu of catchupAttendus){
        await releasePermutationCatchupForParticipation(tx, evenement, attendu.personne_id, actor);
        await tx.upsertAttendu({
          ...attendu,
          inclus: false,
          origine_retrait: 'RESET_SAISIE'
        });
        if(typeof tx.deleteParticipation === 'function'){
          await tx.deleteParticipation(eventId, attendu.personne_id);
        } else {
          const existing = participationsByPersonneId.get(String(attendu.personne_id));
          await tx.upsertParticipation({
            ...(existing || { evenement_id: eventId, personne_id: attendu.personne_id, role: 'PARTICIPANT' }),
            statut: 'NON_CONCERNE',
            motif_absence: null,
            commentaire: null,
            role: 'PARTICIPANT',
            source: 'RESET',
            auteur_id: actorId(actor)
          });
        }
      }
      const resetRows = resettableAttendus.map((a) => {
          const existing = participationsByPersonneId.get(String(a.personne_id));
          return {
            ...(existing || { evenement_id: eventId, personne_id: a.personne_id }),
            statut: 'NON_RENSEIGNE',
            motif_absence: null,
            commentaire: null,
            role: 'PARTICIPANT',
            source: 'RESET',
            auteur_id: actorId(actor)
          };
        });
      if(typeof tx.bulkUpsertParticipations === 'function') await tx.bulkUpsertParticipations(resetRows);
      else {
        for(const row of resetRows) await tx.upsertParticipation(row);
      }
      const encadrementHorsPopulation = encadrementRows.filter((p) => !attenduIds.has(String(p.personne_id)));
      for(const row of encadrementHorsPopulation){
        if(typeof tx.deleteParticipation === 'function'){
          await tx.deleteParticipation(eventId, row.personne_id);
        } else {
          await tx.upsertParticipation({
            ...row,
            statut: 'NON_CONCERNE',
            motif_absence: null,
            commentaire: null,
            role: 'PARTICIPANT',
            source: 'RESET',
            auteur_id: actorId(actor)
          });
        }
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'RESET_SAISIE',
        apres: { resetParticipations: resetRows.length, rattrapagesSupprimes: catchupAttendus.length, encadrementSupprime: encadrementRows.length }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function upsertEncadrementRow(tx, evenement, personneId, role, actor, options = {}){
    const eventId = evenement.evenement_id;
    const attendu = await tx.getAttendu(eventId, personneId);
    const existing = await tx.getParticipation(eventId, personneId);
    if(existing && ROLES_ENCADREMENT.has(String(existing.role || '').toUpperCase())){
      if(options.allowSameRole && String(existing.role || '').toUpperCase() === role) return { changed: false };
      throw new HttpError(422, 'deja_encadrement', 'Cette personne est déjà ajoutée à l’encadrement.');
    }
    if(existing && !ROLES_ENCADREMENT.has(String(existing.role || '').toUpperCase()) && !(attendu && attendu.inclus)){
      const residualEncadrement = String(existing.statut || '') === 'NON_CONCERNE';
      if(!residualEncadrement){
        throw new HttpError(422, 'doublon', 'Une participation existe déjà pour cette personne.');
      }
    }
    const attenduInclus = attendu && attendu.inclus;
    const existingStatut = String(existing?.statut || '').toUpperCase();
    const existingSource = String(existing?.source || '').toUpperCase();
    const presenceDejaSaisie = attenduInclus && existingStatut === 'PRESENT' && existingSource !== 'ENCADREMENT';
    const keepParticipantPresence = (role === 'FORMATEUR' || role === 'SURVEILLANT') && presenceDejaSaisie;
    const statutEncadrement = attenduInclus && role === 'FORMATEUR'
      ? 'PRESENT'
      : (keepParticipantPresence ? 'PRESENT' : (attenduInclus ? 'NON_RENSEIGNE' : 'NON_CONCERNE'));
    await tx.upsertParticipation({
      ...(existing || { evenement_id: eventId, personne_id: personneId }),
          statut: statutEncadrement,
          motif_absence: null,
          commentaire: null,
          ...(options.temporal || {}),
          ...(options.lessonPrep || {}),
          role,
          source: keepParticipantPresence ? existing.source : 'ENCADREMENT',
          auteur_id: actorId(actor)
    });
    return { changed: true };
  }

  async function ajouterEncadrement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const personneId = body.personneId || body.personne_id;
    const role = String(body.role || '');
    const serieComplete = Boolean(body.serieComplete || body.seriesComplete || body.touteSerie || body.toutesSessions || body.allSessions);
    if(!ROLES_ENCADREMENT.has(role)){
      throw new HttpError(422, 'role_invalide', 'Rôle d’encadrement invalide (FORMATEUR, MONITEUR, SURVEILLANT, AUXILIAIRE).');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(evenement.statut !== 'PLANIFIE') throw new HttpError(422, 'statut_invalide', 'Encadrement saisissable uniquement sur PLANIFIE.');
      const personne = await tx.getPersonne(personneId);
      if(!personne) throw new HttpError(404, 'personne_introuvable', 'Personne introuvable.');
      const v2State = await loadMultiSessionV2State(tx, evenement, eventId);
      const v2AllSessions = Boolean(v2State && serieComplete);
      const temporalPatch = normalizeParticipationTemporal(body, evenement);
      const lessonPrepPatch = role === 'FORMATEUR' ? normalizeLessonPrep(body) : {};
      if(serieComplete && !v2AllSessions && role !== 'FORMATEUR'){
        throw new HttpError(422, 'serie_formateur_uniquement', 'L’option série complète est réservée au rôle Formateur.');
      }
      if(v2AllSessions && !['FORMATEUR', 'MONITEUR'].includes(role)){
        throw new HttpError(422, 'multisession_v2_role_toutes_sessions_invalide', 'L’option Toutes les sessions est réservée aux rôles Formateur et Moniteur.');
      }
      if(serieComplete && !v2AllSessions && !isFirstPrSessionEvent(evenement)){
        throw new HttpError(422, 'serie_depuis_premiere_session', 'L’option série complète est disponible uniquement depuis la première session PR.');
      }
      const targets = v2AllSessions
        ? (v2State.sessions || [])
        : serieComplete
        ? (await prSeriesEvents(tx, evenement)).filter((row) => row.statut === 'PLANIFIE')
        : [evenement];
      if(v2State && lessonPrepPatch.creation_dl){
        const existingRows = await tx.listParticipationsForEvents((v2State.sessions || []).map((row) => row.evenement_id || row.event_id).filter(Boolean));
        const duplicate = existingRows.find((row) => String(row.personne_id) === String(personneId) && row.creation_dl && String(row.evenement_id) !== String(eventId));
        if(duplicate){
          throw new HttpError(422, 'creation_dl_deja_comptee', 'La création DL est déjà comptabilisée pour ce formateur dans ce Multi-session.');
        }
      }
      let changed = 0;
      for(const target of targets){
        const targetTemporal = target.evenement_id === evenement.evenement_id
          ? temporalPatch
          : normalizeParticipationTemporal(body, target);
        const targetLessonPrep = target.evenement_id === evenement.evenement_id ? lessonPrepPatch : {};
        const result = await upsertEncadrementRow(tx, target, personneId, role, actor, { allowSameRole: serieComplete, temporal: targetTemporal, lessonPrep: targetLessonPrep });
        if(!result.changed) continue;
        await bumpOrConflict(tx, target.evenement_id, target.evenement_id === eventId ? baseVersion : target.version, {});
        await mirrorMultiSessionV2Participation(tx, v2AllSessions ? v2State : null, target.evenement_id, {
          personne_id: personneId,
          statut: role === 'FORMATEUR' ? 'PRESENT' : 'NON_CONCERNE',
          role
        }, actor);
        changed += 1;
      }
      const next = await tx.getEvent(eventId);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: v2AllSessions ? 'MULTISESSION_V2_ENCADREMENT_TOUTES_SESSIONS' : (serieComplete ? 'ENCADREMENT_SERIE' : 'ENCADREMENT'),
        apres: { personneId, role, serieComplete, toutesSessions: v2AllSessions, count: changed }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function cloturer(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(isQuantitatif(evenement)){
        if(evenement.statut !== 'PLANIFIE'){
          throw new HttpError(422, 'statut_invalide', 'La clôture n’est possible que depuis PLANIFIE.');
        }
        const saisie = await tx.getQuantitatifSaisie(eventId);
        if(!saisie){
          throw new HttpError(422, 'saisie_manquante', 'Saisissez les volumes avant de clôturer.');
        }
        const official = officialQuantitatifOrThrow(saisie);
        const next = await bumpOrConflict(tx, eventId, baseVersion, {
          statut: 'REALISE',
          cloture_at: new Date().toISOString(),
          cloture_par: actorId(actor)
        });
        const taux = { ...official, officiel: true, kind: 'OFFICIEL' };
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: eventId,
          action: 'CLOTURER',
          avant: { statut: evenement.statut },
          apres: { statut: 'REALISE', version: next.version, taux }
        });
        return { evenement: next, version: next.version, taux };
      }
      const attendusRaw = await tx.listAttendus(eventId);
      const participations = await tx.listParticipations(eventId);
      const v2State = await loadMultiSessionV2State(tx, evenement, eventId);
      const periodesByPersonne = new Map();
      const personneIds = [...new Set((attendusRaw || []).map((row) => String(row.personne_id || row.personneId || '')).filter(Boolean))];
      await Promise.all(personneIds.map(async (pid) => {
        periodesByPersonne.set(pid, tx.listPersonnesPeriodes ? await tx.listPersonnesPeriodes(pid) : []);
      }));
      const eligible = new Set(
        filterAttendusEligibleAtDate(attendusRaw, periodesByPersonne, evenement.date)
          .map((row) => String(row.personne_id || row.personneId))
      );
      let attendus = (attendusRaw || []).map((row) => (
        eligible.has(String(row.personne_id || row.personneId))
          ? row
          : Object.assign({}, row, { inclus: false, origine_retrait: row.origine_retrait || 'INDISPONIBLE' })
      ));
      const prState = v2State ? null : await loadPrExerciseParticipationState(tx, evenement, eventId);
      if(prState && prState.byPersonneId){
        attendus = attendus.map((row) => {
          const state = prState.byPersonneId[String(row.personne_id || row.personneId)];
          if(!state) return row;
          return Object.assign({}, row, {
            already_counted_in_session: Boolean(state.alreadyCountedInSession),
            alreadyCountedInSession: Boolean(state.alreadyCountedInSession),
            sessionHasValidStatus: Boolean(state.sessionHasValidStatus)
          });
        });
      }
      const requireExpectedFilled = !(v2State || (prState && prState.isMultiSession));
      validateCloture(evenement, attendus, participations, { requireExpectedFilled, participationPolicySnapshot: evenement.participation_policy_snapshot || null });
      if(prState && prState.isLastSession && requiresFinalMultiSessionClosure(evenement) && prState.unfilledPeople && prState.unfilledPeople.length){
        throw new HttpError(422, 'session_incomplete', `Impossible de clôturer ${prState.sessionExerciseLabel || evenement.libelle} : ${prState.unfilledPeople.length} personne(s) restent à renseigner sur l’ensemble des sessions.`, {
          unfilledPeople: prState.unfilledPeople || []
        });
      }
      if(prState && !canCloseLastSession(prState)){
        throw new HttpError(422, 'session_incomplete', 'Chaque personne attendue doit disposer d’un statut avant la clôture définitive de l’exercice.', {
          unfilledPeople: prState.unfilledPeople || []
        });
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {
        statut: 'REALISE',
        cloture_at: new Date().toISOString(),
        cloture_par: actorId(actor)
      });
      if(v2State && tx.upsertMultisessionV2Session){
        const session = (v2State.sessions || []).find((row) => String(row.evenement_id || row.event_id) === String(eventId));
        await tx.upsertMultisessionV2Session({
          multisession_id: v2State.multisessionId,
          event_id: eventId,
          sequence: session ? session.sequence : v2State.currentSessionIndex,
          status: 'CLOTUREE',
          metadata: { closedBy: actorId(actor), closedAt: new Date().toISOString() }
        });
      }
      const permutationsARegulariser = await markUnrecoveredPermutationsForEvent(tx, evenement, participations, actor);
      const refreshedV2State = v2State ? await loadMultiSessionV2State(tx, next, eventId) : null;
      const taux = refreshedV2State ? refreshedV2State.statistics : computeTaux(participations, attendus);
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: v2State ? 'MULTISESSION_V2_CLOTURER_SESSION' : 'CLOTURER',
        apres: { version: next.version, taux, permutationsARegulariser, engine: v2State ? MultiSessionV2.ENGINE.MULTI_SESSION_V2 : undefined }
      });
      return { evenement: next, version: next.version, taux };
    });
  }

  async function cloturerMultiSessionV2(multisessionId, body = {}, actor){
    return repo.withTransaction(async (tx) => {
      const multisession = tx.getMultisessionV2 ? await tx.getMultisessionV2(multisessionId) : null;
      if(!multisession) throw new HttpError(404, 'multisession_v2_introuvable', 'Multi-session introuvable.');
      const sessions = tx.listMultisessionV2Sessions ? await tx.listMultisessionV2Sessions(multisessionId) : [];
      if(!sessions.length) throw new HttpError(422, 'multisession_v2_sans_session', 'Le Multi-session ne contient aucune session.');
      const current = sessions[sessions.length - 1];
      const state = await loadMultiSessionV2State(tx, current, current.evenement_id || current.event_id);
      MultiSessionV2.validateFinalClosure(state);
      const closed = await tx.updateMultisessionV2(multisessionId, {
        status: 'CLOTUREE',
        closed_at: new Date().toISOString(),
        closed_by: actorId(actor),
        metadata: Object.assign({}, multisession.metadata || {}, { closedByAction: 'MULTISESSION_V2_CLOSE' })
      });
      if(tx.appendJournal){
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'multisession_v2',
          entite_id: multisessionId,
          action: 'CLOTURER_MULTISESSION_V2',
          apres: { statistics: state.statistics, version: body.baseVersion || body.base_version || null }
        });
      }
      return { multisession: closed, sessionParticipation: state, taux: state.statistics };
    });
  }

  async function annulerEvenement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const motif = String(body.motif || body.commentaire || '').trim();
    if(!motif) throw new HttpError(400, 'motif_obligatoire', 'L’annulation exige un motif.');
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      if(!['PLANIFIE', 'REPORTE', 'REALISE'].includes(evenement.statut)){
        throw new HttpError(422, 'statut_invalide', 'Annulation possible depuis PLANIFIE, REPORTE ou REALISE.');
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, { statut: 'ANNULE' });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'ANNULER',
        commentaire: motif,
        avant: { statut: evenement.statut, version: evenement.version },
        apres: { statut: 'ANNULE', version: next.version }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function supprimerOuAnnulerEvenement(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const motif = String(body.motif || body.commentaire || 'Correction événement').trim();
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      const deleted = tx.deleteEventIfNoDependencies ? await tx.deleteEventIfNoDependencies(eventId) : { deleted: false, reason: 'unsupported' };
      if(deleted.deleted){
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: eventId,
          action: 'SUPPRIMER',
          avant: { codeCours: evenement.code_cours, date: evenement.date, libelle: evenement.libelle },
          commentaire: motif
        });
        return { deleted: true, annule: false, evenement: deleted.event };
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, { statut: 'ANNULE' });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'ANNULER_APRES_DEPENDANCES',
        avant: { statut: evenement.statut, version: evenement.version },
        apres: { statut: 'ANNULE', version: next.version },
        commentaire: motif
      });
      return { deleted: false, annule: true, evenement: next, version: next.version };
    });
  }

  async function reouvrir(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const motif = String(body.motif || body.commentaire || '').trim();
    if(!motif) throw new HttpError(400, 'motif_obligatoire', 'La réouverture exige un motif.');
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      const v2State = await loadMultiSessionV2State(tx, evenement, eventId);
      const v2Session = v2State
        ? (v2State.sessions || []).find((row) => String(row.evenement_id || row.event_id || '') === String(eventId))
        : null;
      const v2SessionClosed = v2Session && ['CLOTUREE', 'CLOTURE', 'REALISE'].includes(String(v2Session.status || v2Session.statut || '').toUpperCase());
      if(evenement.statut !== 'REALISE' && !v2SessionClosed){
        throw new HttpError(422, 'statut_invalide', 'Réouverture possible uniquement depuis REALISE.');
      }
      const next = await bumpOrConflict(tx, eventId, baseVersion, {
        statut: 'PLANIFIE',
        cloture_at: null,
        cloture_par: null
      });
      if(v2State && tx.upsertMultisessionV2Session){
        await tx.upsertMultisessionV2Session({
          multisession_id: v2State.multisessionId,
          event_id: eventId,
          sequence: v2Session ? v2Session.sequence : v2State.currentSessionIndex,
          status: 'OUVERTE',
          metadata: Object.assign({}, v2Session && v2Session.metadata || {}, { reopenedBy: actorId(actor), reopenedAt: new Date().toISOString(), reopenMotif: motif })
        });
        if(tx.updateMultisessionV2 && v2State.multisession && ['CLOTUREE', 'CLOTURE', 'REALISE'].includes(String(v2State.multisession.status || '').toUpperCase())){
          await tx.updateMultisessionV2(v2State.multisessionId, {
            status: 'OUVERTE',
            closed_at: null,
            closed_by: null,
            metadata: Object.assign({}, v2State.multisession.metadata || {}, { reopenedByAction: 'MULTISESSION_V2_SESSION_REOPEN' })
          });
        }
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: v2State ? 'MULTISESSION_V2_REOUVRIR_SESSION' : 'REOUVRIR',
        commentaire: motif,
        apres: { version: next.version, engine: v2State ? MultiSessionV2.ENGINE.MULTI_SESSION_V2 : undefined }
      });
      return { evenement: next, version: next.version };
    });
  }

  function groupByEventId(rows){
    const map = new Map();
    (rows || []).forEach((row) => {
      const id = row.evenement_id;
      if(!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    });
    return map;
  }

  function hasQuantitativeBusinessInput(saisie){
    if(!saisie) return false;
    return [
      'nb_attendus',
      'nb_presents',
      'nb_excuses',
      'nb_excuses_prive',
      'nb_excuses_professionnel',
      'nb_excuses_armee',
      'nb_excuses_accident_maladie',
      'nb_excuses_non_precise',
      'nb_non_excuses',
      'nb_dispenses',
      'nb_permutations'
    ].some((key) => {
      const value = saisie[key];
      return value !== null && value !== undefined && value !== '' && Number(value) !== 0;
    });
  }

  function hasNominativeBusinessInput(participations, attendus){
    return (participations || []).some((row) => {
      const statut = String(row.statut || '').toUpperCase();
      const role = String(row.role || 'PARTICIPANT').toUpperCase();
      const source = String(row.source || '').toUpperCase();
      if(ROLES_ENCADREMENT.has(role)){
        return role === 'SURVEILLANT' && source === 'SAISIE' && statut && !['NON_RENSEIGNE', 'NON_CONCERNE'].includes(statut);
      }
      if(statut && !['NON_RENSEIGNE', 'NON_CONCERNE'].includes(statut)) return true;
      return false;
    });
  }

  function businessEtatForEvenement(evenement, context = {}){
    if(String(evenement.statut || '').toUpperCase() === 'REALISE'){
      return { code: 'TRAITE', label: 'Traité' };
    }
    const started = hasNominativeBusinessInput(context.participations, context.attendus)
      || hasQuantitativeBusinessInput(context.saisie);
    if(started) return { code: 'SAISIE_EN_COURS', label: 'Saisie en cours' };
    return { code: 'A_TRAITER', label: 'À traiter' };
  }

  async function summarizeEvenements(evenements, options = {}){
    const list = evenements || [];
    if(!list.length){
      return { items: [], performance: { mode: 'batch', eventCount: 0, queries: 0 } };
    }
    const ids = list.map((e) => e.evenement_id);
    const [allCibles, cibleRows, attendusRows, partRows, qtyRows, legacyRows, permutationRows] = await Promise.all([
      repo.listCibles(),
      repo.listEventCiblesForEvents ? repo.listEventCiblesForEvents(ids) : Promise.resolve([]),
      repo.listAttendusForEvents ? repo.listAttendusForEvents(ids) : Promise.resolve([]),
      repo.listParticipationsForEvents ? repo.listParticipationsForEvents(ids) : Promise.resolve([]),
      repo.listQuantitatifSaisiesForEvents ? repo.listQuantitatifSaisiesForEvents(ids) : Promise.resolve([]),
      repo.listLegacy ? repo.listLegacy() : Promise.resolve([]),
      repo.listPermutations ? repo.listPermutations({ sourceEvenementIds: ids }) : Promise.resolve([])
    ]);
    const ciblesById = new Map((allCibles || []).map((c) => [c.cible_id, c]));
    const ciblesByEvent = groupByEventId(cibleRows);
    const attendusByEvent = groupByEventId(attendusRows);
    const partsByEvent = groupByEventId(partRows);
    const qtyByEvent = new Map((qtyRows || []).map((row) => [row.evenement_id, row]));
    const legacyByEvent = new Map();
    (legacyRows || []).forEach((row) => {
      if(row.evenement_id) legacyByEvent.set(row.evenement_id, row);
    });
    const items = await Promise.all(list.map(async (evenement) => {
      const linked = ciblesByEvent.get(evenement.evenement_id) || [];
      const cibles = linked.map((row) => ciblesById.get(row.cible_id) || row).filter(Boolean);
      const attendus = attendusByEvent.get(evenement.evenement_id) || [];
      const participations = partsByEvent.get(evenement.evenement_id) || [];
      const saisie = qtyByEvent.get(evenement.evenement_id) || null;
      let etatMetier = businessEtatForEvenement(evenement, {
        participations,
        attendus,
        saisie,
        today: options.today
      });
      const modeSuivi = inferModeSuivi(evenement);
      let compteurs = computeTaux(participations, attendus);
      const permutationSummary = permutationObligationSummary(permutationRows, evenement.evenement_id);
      let attendusInclus = attendus.filter((a) => a.inclus !== false).length;
      if(modeSuivi === MODES.QUANTITATIF){
        const official = saisie ? officialFromQuantitatif(saisie) : null;
        attendusInclus = saisie ? Number(saisie.nb_attendus) : 0;
        compteurs = official
          ? { ...official, presents: official.volumes.presents }
          : { numerator: 0, denominator: 0, percentage: null, presents: saisie ? saisie.nb_presents : 0 };
      }
      const legacy = evenement.origine === 'LEGACY_AGGREGATED'
        ? (legacyByEvent.get(evenement.evenement_id) || null)
        : null;
      let multiSessionV2 = null;
      if(repo.getMultisessionV2ForEvent && repo.listMultisessionV2Sessions){
        multiSessionV2 = await loadMultiSessionV2State(repo, evenement, evenement.evenement_id);
      }
      if(multiSessionV2 && multiSessionV2.engine === MultiSessionV2.ENGINE.MULTI_SESSION_V2){
        const global = String(multiSessionV2.globalStatus || '').toUpperCase();
        etatMetier = global === 'CLOTURE'
          ? { code: 'TRAITE', label: 'Traité' }
          : (global === 'A_FINALISER'
            ? { code: 'A_FINALISER', label: 'À finaliser' }
            : { code: 'EN_COURS', label: 'En cours' });
      }
      return {
        evenement: { ...evenement, mode_suivi: modeSuivi },
        cibles,
        compteurs,
        attendusInclus,
        rattrapages: {
          count: catchupAttendusCount(attendus)
        },
        permutationSummary,
        permutation_summary: permutationSummary,
        legacy,
        multiSessionV2,
        engine: multiSessionV2 ? MultiSessionV2.ENGINE.MULTI_SESSION_V2 : undefined,
        saisieQuantitative: saisie,
        etatMetier,
        etat_metier: etatMetier,
        modeSuivi,
        qualification: isQualificationEvenement(evenement)
      };
    }));
    return { items, performance: { mode: 'batch', eventCount: list.length, queries: 7 } };
  }

  async function summarizeEvenement(evenement){
    const packed = await summarizeEvenements([evenement]);
    return packed.items[0];
  }

  async function listEvenements(query){
    const annee = query?.annee || query?.year || null;
    const statut = query?.statut || query?.status || null;
    const etatsMetier = new Set(['PLANIFIE', 'SAISIE_EN_COURS', 'A_TRAITER', 'TRAITE']);
    const statutFilter = statut && statut !== 'tous' && !etatsMetier.has(statut) ? statut : null;
    const etatMetierFilter = statut && statut !== 'tous' && etatsMetier.has(statut) ? statut : null;
    const domaine = query?.domaineCode || query?.domaine_code || query?.domaine || null;
    const domaines = String(domaine || '')
      .split(',')
      .map((value) => String(value || '').trim().toUpperCase())
      .filter((value) => value && value !== 'TOUS');
    let evenements = await repo.listEvenements({
      annee: annee ? Number(annee) : null,
      statut: statutFilter,
      domaine: domaines.length === 1 ? domaines[0] : null
    });
    if(domaines.length > 1){
      const allowedDomaines = new Set(domaines);
      evenements = evenements.filter((row) => allowedDomaines.has(String(row.domaine_code || '').toUpperCase()));
    }
    if(!wantsQualification(query)){
      evenements = evenements.filter((row) => !isQualificationEvenement(row));
    }
    const packed = await summarizeEvenements(evenements, { today: query?.today });
    const items = (etatMetierFilter
      ? packed.items.filter((item) => item.etatMetier && item.etatMetier.code === etatMetierFilter)
      : packed.items
    ).slice().sort((a, b) =>
      String(a.evenement && a.evenement.date || '').localeCompare(String(b.evenement && b.evenement.date || ''))
      || String(a.evenement && a.evenement.libelle || '').localeCompare(String(b.evenement && b.evenement.libelle || ''), 'fr', { numeric: true })
    );
    return { evenements: items, performance: packed.performance };
  }

  async function hydratePersonnes(ids){
    const unique = [...new Set((ids || []).filter(Boolean).map(String))];
    const personnes = {};
    for(const id of unique){
      const personne = await repo.getPersonne(id);
      if(personne) personnes[id] = personne;
    }
    return personnes;
  }

  async function lireEvenement(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    const cibleIds = await repo.listEventCibleIds(eventId);
    const allCibles = await repo.listCibles();
    const cibles = allCibles.filter(c => cibleIds.includes(c.cible_id));
    let attendus = await repo.listAttendus(eventId);
    attendus = await decorateSourcePermutationAttendus(repo, evenement, attendus, allCibles);
    if(String(evenement.statut || '').toUpperCase() === 'PLANIFIE'){
      const periodesByPersonne = new Map();
      const personneIds = [...new Set((attendus || []).map((row) => String(row.personne_id || row.personneId || '')).filter(Boolean))];
      await Promise.all(personneIds.map(async (pid) => {
        periodesByPersonne.set(pid, repo.listPersonnesPeriodes ? await repo.listPersonnesPeriodes(pid) : []);
      }));
      const eligible = new Set(
        filterAttendusEligibleAtDate(attendus, periodesByPersonne, evenement.date)
          .map((row) => String(row.personne_id || row.personneId))
      );
      attendus = (attendus || []).map((row) => (
        eligible.has(String(row.personne_id || row.personneId))
          ? row
          : Object.assign({}, row, { inclus: false, origine_retrait: row.origine_retrait || 'INDISPONIBLE' })
      ));
    }
    const participationsRaw = await repo.listParticipations(eventId);
    const attenduIds = new Set(attendus.filter(a => a.inclus !== false).map(a => String(a.personne_id)));
    const participations = String(evenement.statut || '').toUpperCase() === 'PLANIFIE'
      ? (participationsRaw || []).map((row) => {
        if(!attenduIds.has(String(row.personne_id))) return row;
        if(!isStaleNonConcerneForExpected(row)) return row;
        return Object.assign({}, row, { statut: 'NON_RENSEIGNE' });
      })
      : participationsRaw;
    const v2State = await loadMultiSessionV2State(repo, evenement, eventId);
    if(v2State){
      const activeIds = new Set(attendus.filter((a) => a.inclus !== false).map((a) => String(a.personne_id)));
      const populationRows = repo.listMultisessionV2Population ? await repo.listMultisessionV2Population(v2State.multisessionId) : [];
      for(const row of populationRows || []){
        const personneId = String(row.person_id || row.personne_id || '');
        if(!personneId || activeIds.has(personneId)) continue;
        attendus.push({
          evenement_id: eventId,
          personne_id: personneId,
          inclus: true,
          origine: 'MULTISESSION_V2',
          motif_inclusion: 'multisession_v2_population'
        });
        activeIds.add(personneId);
      }
      attendus = MultiSessionV2.decorateAttendus(attendus, v2State);
    }
    let encadrement = participations.filter(p => ROLES_ENCADREMENT.has(p.role));
    let taux = v2State ? v2State.statistics : computeTaux(participations, attendus);
    const personnes = await hydratePersonnes([
      ...attendus.map(a => a.personne_id),
      ...participations.map(p => p.personne_id),
      ...((v2State && repo.listMultisessionV2Population ? await repo.listMultisessionV2Population(v2State.multisessionId) : []).map((row) => row.person_id || row.personne_id))
    ]);
    encadrement = encadrement
      .map((row) => Object.assign({}, personnes[String(row.personne_id)] || personnes[row.personne_id] || {}, row))
      .sort(comparePeopleByGradeName);
    let prExerciseParticipation = { byPersonneId: {}, kpis: null };
    let cycleInfo = null;
    let exerciceInfo = evenement.exercice || null;
    if(!v2State && (evenement.exercice_id || evenement.cycle_id || evenement.pr_exercise_group_key) && repo.listParticipationsForEvents){
      const cycle = evenement.cycle_id && repo.getCycle
        ? await repo.getCycle(evenement.cycle_id)
        : { cycle_id: null, domaine_code: evenement.domaine_code || 'PR' };
      if(cycle){
        if(evenement.exercice_id && repo.getExercise) exerciceInfo = await repo.getExercise(evenement.exercice_id);
        const cycleEvents = evenement.exercice_id && repo.listExerciseEvents
          ? await repo.listExerciseEvents(evenement.exercice_id)
          : (repo.listPrExerciseEvents && evenement.pr_exercise_group_key
            ? await repo.listPrExerciseEvents(evenement.pr_exercise_group_key)
            : (evenement.cycle_id && repo.listCycleEvents ? await repo.listCycleEvents(evenement.cycle_id) : [evenement]));
        const cycleCompletion = resolveCycleCompletion({ cycle, evenements: cycleEvents });
        cycleInfo = {
          cycle_id: cycle.cycle_id || null,
          cycle_key: cycle.cycle_key || null,
          libelle: cycle.libelle || null,
          domaine_code: cycle.domaine_code || evenement.domaine_code || null,
          type_cycle: cycle.type_cycle || null,
          annee: cycle.annee || null,
          date_debut: cycle.date_debut || null,
          date_fin: cycle.date_fin || null,
          eventCount: cycleCompletion.eventCount,
          exigibleCount: cycleCompletion.exigibleCount,
          realisedCount: cycleCompletion.realisedCount,
          cancelledCount: cycleCompletion.cancelledCount,
          complete: cycleCompletion.complete,
          statutCompletion: cycleCompletion.statut
        };
        const scoped = resolveSessionReportingScope({ evenements: cycleEvents, currentEvent: evenement });
        const scopedEvents = scoped.events.length ? scoped.events : [evenement];
        const cyclePersonnes = evenement.cycle_id && repo.listCyclePersonnes ? await repo.listCyclePersonnes(evenement.cycle_id) : [];
        const cycleParticipations = scopedEvents.length
          ? await repo.listParticipationsForEvents(scopedEvents.map((row) => row.evenement_id))
          : [];
        const cycleAttendus = repo.listAttendusForEvents && scopedEvents.length
          ? await repo.listAttendusForEvents(scopedEvents.map((row) => row.evenement_id))
          : attendus;
        const scopedPersonneIds = new Set([
          ...cycleParticipations.map((row) => String(row.personne_id || row.personneId || '')),
          ...cycleAttendus.map((row) => String(row.personne_id || row.personneId || ''))
        ].filter(Boolean));
        const scopedCyclePersonnes = cyclePersonnes.filter((row) => scopedPersonneIds.has(String(row.personne_id || row.personneId || '')));
        const cyclePersonnesById = await hydratePersonnes([
          ...scopedCyclePersonnes.map((row) => row.personne_id),
          ...cycleParticipations.map((row) => row.personne_id),
          ...cycleAttendus.map((row) => row.personne_id)
        ]);
        prExerciseParticipation = computeMultiSessionParticipationState({
          cycle,
          evenements: scopedEvents,
          cyclePersonnes: scopedCyclePersonnes,
          attendus: cycleAttendus,
          participations: cycleParticipations,
          personnes: cyclePersonnesById,
          currentEventId: eventId
        });
        prExerciseParticipation.reportingScope = {
          groupKey: scoped.groupKey || null,
          cycleId: scoped.cycleId || null,
          period: scoped.period,
          eventIds: scopedEvents.map((row) => row.evenement_id)
        };
        prExerciseParticipation.sessionLabels = scopedEvents
          .map((row) => prSessionLabel(row))
          .filter(Boolean);
        attendus = attendus.map((row) => {
          const state = prExerciseParticipation.byPersonneId[String(row.personne_id)];
          return state
            ? Object.assign({}, row, {
              already_counted_in_session: Boolean(state.alreadyCountedInSession),
              alreadyCountedInSession: Boolean(state.alreadyCountedInSession),
              sessionHasValidStatus: Boolean(state.sessionHasValidStatus),
              session_counted_event_id: state.countedEventId,
              session_counted_role: state.countedRole,
              session_counted_statut: state.countedStatut,
              session_counted_source: state.countedSource,
              session_reference_event_id: state.referenceEventId,
              session_reference_label: state.referenceSessionLabel,
              session_reference_event_label: state.referenceEventLabel,
              session_reference_event_date: state.referenceEventDate,
              session_reference_quality: state.referenceQuality,
              session_reference_relation: state.referenceRelation,
              session_formateur_sessions: state.formateurSessionLabels || [],
              sessionReferenceEventId: state.referenceEventId,
              sessionReferenceLabel: state.referenceSessionLabel,
              sessionReferenceEventLabel: state.referenceEventLabel,
              sessionReferenceEventDate: state.referenceEventDate,
              sessionReferenceQuality: state.referenceQuality,
              sessionReferenceRelation: state.referenceRelation,
              sessionFormateurSessions: state.formateurSessionLabels || [],
              sessionExcuse: Boolean(state.sessionExcuse),
              sessionDispense: Boolean(state.sessionDispense),
              sessionExerciseLabel: state.sessionExerciseLabel || '',
              sessionMessage: state.sessionMessage || '',
              sessionSummary: state.sessionSummary || '',
              sessionMotif: state.countedMotif || null
            })
            : row;
        });
      }
    }
    const journal = await repo.listJournal('evenement', eventId);
    const saisie = repo.getQuantitatifSaisie ? await repo.getQuantitatifSaisie(eventId) : null;
    const modeSuivi = inferModeSuivi(evenement);
    const eventPolicy = await resolvePolicyForEvent(repo, evenement);
    let compteurs = taux;
    if(modeSuivi === MODES.QUANTITATIF){
      const official = saisie ? officialFromQuantitatif(saisie) : null;
      compteurs = official
        ? { ...official, presents: official.volumes.presents, excuses: official.volumes.excuses, nonExcuses: official.volumes.nonExcuses, dispenses: official.volumes.dispenses }
        : { numerator: 0, denominator: 0, percentage: null, presents: 0, excuses: 0, nonExcuses: 0, dispenses: 0 };
    }
    let legacy = null;
    if(evenement.origine === 'LEGACY_AGGREGATED' && repo.getLegacyByEvenementId){
      legacy = await repo.getLegacyByEvenementId(eventId);
    }
    let jsp = { jeunes: [], tauxJeunes: null };
    if(String(evenement.domaine_code || '').toUpperCase() === 'JSP'){
      const date = evenement.date;
      const tagged = [];
      for(const row of attendus){
        const person = personnes[String(row.personne_id)] || personnes[row.personne_id];
        const jspRole = await classifyJspRoleForEventPerson(person, row.personne_id, date);
        tagged.push(Object.assign({}, row, { jspRole }));
      }
      attendus = tagged;
      const jeunes = tagged.filter((row) => row.jspRole === 'JEUNE');
      const jeuneIds = new Set(jeunes.map((row) => String(row.personne_id)));
      jsp = {
        jeunes,
        jeunesAttendus: jeunes.filter((row) => row.inclus !== false).length,
        tauxJeunes: computeTaux(participations.filter((row) => jeuneIds.has(String(row.personne_id))), jeunes)
      };
    }
    const attendusExclus = attendus.filter((row) => row.inclus === false);
    const attendusActifs = attendus.filter((row) => row.inclus !== false);
    const sectionEffectif = await sectionEffectifAtEventDate(repo, evenement, cibleIds);
    const sourcePermutationRows = repo.listPermutations && String(evenement.domaine_code || '').toUpperCase() === 'DAP'
      ? await repo.listPermutations({ sourceEvenementId: evenement.evenement_id })
      : [];
    const permutationSummary = permutationObligationSummary(sourcePermutationRows, evenement.evenement_id);
    const rattrapages = { count: catchupAttendusCount(attendusActifs) };
    const coherenceAttendus = String(evenement.domaine_code || '').toUpperCase() === 'JSP'
      ? (jsp.jeunes || []).filter((row) => row.inclus !== false)
      : attendusActifs;
    const etatMetier = v2State
      ? (String(v2State.globalStatus || '').toUpperCase() === 'CLOTURE'
        ? { code: 'TRAITE', label: 'Traité' }
        : (String(v2State.globalStatus || '').toUpperCase() === 'A_FINALISER'
          ? { code: 'A_FINALISER', label: 'À finaliser' }
          : { code: 'EN_COURS', label: 'En cours' }))
      : businessEtatForEvenement(evenement, { participations, attendus: attendusActifs, saisie, today: null });
    const formationConfiguration = await resolveEventFormationConfiguration(evenement, v2State);
    const temporal = eventTemporalPayload(evenement);
    return {
      evenement: { ...evenement, mode_suivi: modeSuivi, temporal },
      exercice: exerciceInfo,
      cibles,
      attendus: attendusActifs,
      attendusExclus,
      attendus_exclus: attendusExclus,
      participations,
      encadrement,
      personnes,
      prExerciseParticipation,
      sessionParticipation: v2State || prExerciseParticipation,
      multiSessionV2: v2State,
      engine: v2State ? MultiSessionV2.ENGINE.MULTI_SESSION_V2 : ((prExerciseParticipation && prExerciseParticipation.isMultiSession) ? MultiSessionV2.ENGINE.LEGACY_PR_MULTI : MultiSessionV2.ENGINE.SIMPLE),
      etatMetier,
      etat_metier: etatMetier,
      cycle: cycleInfo,
      journal,
      compteurs,
      rattrapages,
      permutationSummary,
      permutation_summary: permutationSummary,
      sectionEffectif,
      section_effectif: sectionEffectif,
      saisieQuantitative: saisie,
      modeSuivi,
      legacy,
      jsp,
      formationConfiguration,
      formation_configuration: formationConfiguration,
      temporal,
      populationCoherence: expectedPopulationCoherence(coherenceAttendus, participations),
      participationPolicy: policyPayload(eventPolicy, await participationMotifRows(repo)),
      version: evenement.version
    };
  }

  async function tauxEvenement(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    if(evenement.origine === 'LEGACY_AGGREGATED'){
      const legacy = repo.getLegacyByEvenementId
        ? await repo.getLegacyByEvenementId(eventId)
        : null;
      const payload = (legacy && legacy.payload_v67) || {};
      const presents = legacy ? Number(legacy.nb_presents) : 0;
      const attendu = Number(payload.total_attendu || legacy?.nb_convoques || 0);
      return {
        numerator: presents,
        denominator: attendu,
        percentage: csvImport.legacyTaux({
          nb_presents: presents,
          total_attendu: attendu,
          nb_convoques: legacy?.nb_convoques
        }),
        presents,
        officiel: false,
        kind: 'LEGACY',
        exclus: { nonRealise: true, legacy: true }
      };
    }
    if(String(evenement.statut || '').toUpperCase() === 'ANNULE'){
      return {
        numerator: 0,
        denominator: 0,
        percentage: null,
        presents: 0,
        excuses: 0,
        nonExcuses: 0,
        dispenses: 0,
        officiel: false,
        kind: 'EXCLUDED',
        exclus: { annule: true }
      };
    }
    const v2State = await loadMultiSessionV2State(repo, evenement, eventId);
    if(v2State){
      return { ...v2State.statistics, officiel: String(evenement.statut || '').toUpperCase() === 'REALISE', kind: MultiSessionV2.ENGINE.MULTI_SESSION_V2 };
    }
    if(isQuantitatif(evenement)){
      const saisie = repo.getQuantitatifSaisie ? await repo.getQuantitatifSaisie(eventId) : null;
      const official = saisie ? officialFromQuantitatif(saisie) : null;
      const realise = evenement.statut === 'REALISE';
      if(!official){
        return {
          numerator: 0,
          denominator: 0,
          percentage: null,
          officiel: false,
          kind: realise ? 'OFFICIEL' : 'PREVIEW',
          mode: MODES.QUANTITATIF,
          volumes: saisie || null
        };
      }
      return {
        ...official,
        officiel: realise,
        kind: realise ? 'OFFICIEL' : 'PREVIEW',
        mode: MODES.QUANTITATIF
      };
    }
    if(evenement.statut !== 'REALISE'){
      const attendus = await repo.listAttendus(eventId);
      const participations = await repo.listParticipations(eventId);
      const taux = computeTaux(participations, attendus);
      return {
        ...taux,
        officiel: false,
        exclus: {
          nonRealise: true,
          legacy: false
        }
      };
    }
    const attendus = await repo.listAttendus(eventId);
    const participations = await repo.listParticipations(eventId);
    return { ...computeTaux(participations, attendus), officiel: true, kind: 'NOMINATIF' };
  }

  async function rulesList(){
    if(!repo.listReglesBascule) return [];
    return repo.listReglesBascule();
  }

  async function previewContext(){
    const [domaines, cibles, rules, existingEvents, importedFingerprints, suiviRules] = await Promise.all([
      repo.listDomaines(),
      repo.listCibles(),
      rulesList(),
      repo.listEvenements({}),
      repo.listImportedFingerprints ? repo.listImportedFingerprints() : [],
      repo.listSuiviNominatif ? repo.listSuiviNominatif() : []
    ]);
    return { domaines, cibles, rules, existingEvents, importedFingerprints, suiviRules };
  }

  async function existingEventsWithCibles(events){
    const list = events || [];
    if(!list.length || !repo.listEventCiblesForEvents){
      return list.map((e) => ({ ...e, cibles: [] }));
    }
    const rows = await repo.listEventCiblesForEvents(list.map((e) => e.evenement_id));
    const byId = {};
    (rows || []).forEach((row) => {
      const id = row.evenement_id;
      if(!byId[id]) byId[id] = [];
      byId[id].push(row);
    });
    return list.map((e) => ({ ...e, cibles: byId[e.evenement_id] || [] }));
  }

  function previewFromCsv(csvText, context){
    const parsed = csvImport.parseExercicesCsv(csvText);
    if(!parsed.ok){
      throw new HttpError(400, parsed.error, parsed.message, { header: parsed.header, missing: parsed.missing });
    }
    const lignes = csvImport.buildPreviewRows(parsed, context);
    const summary = csvImport.summarizePreview(lignes);
    return {
      format: csvImport.IMPORT_PROFIL,
      profil: csvImport.IMPORT_PROFIL,
      horizonNominatifConnu: csvImport.earliestNominativeHorizon(context.rules || []),
      separator: parsed.separator,
      encoding: parsed.encoding,
      header: parsed.header,
      extra: parsed.extra,
      lignes,
      summary
    };
  }

  async function previewNativeContext(body){
    const ctx = await previewContext();
    const evenementsExistants = await existingEventsWithCibles(ctx.existingEvents);
    return {
      cibles: ctx.cibles,
      suiviRules: ctx.suiviRules || [],
      importedFingerprints: ctx.importedFingerprints || [],
      evenementsExistants,
      decisions: body?.decisions || {}
    };
  }

  function importedExerciseKey(line){
    const match = line && line.genericMatch || {};
    if(match.definitionVersionId || match.definitionId){
      return `configuration:${match.definitionVersionId || match.definitionId}:${String(line.date || '').slice(0, 4)}`;
    }
    if(importContract.exerciseImportKey) return importContract.exerciseImportKey(line);
    return exerciseKeyFromParts('import', line.exerciceCode || line.codeEvent || line.libelle, line.date, line.libelle);
  }

  async function importDefinitionBinding(tx, line){
    const match = line && line.genericMatch;
    const matchVersionId = match && (match.definitionVersionId || match.definition_version_id);
    if(match && (match.status === 'UNCONFIGURED' || match.status === 'UNKNOWN_DEFINITION' || match.status === 'UNKNOWN_VERSION')) return null;
    if(matchVersionId && tx.getEventDefinitionVersion){
      const version = await tx.getEventDefinitionVersion(matchVersionId);
      if(!version) return null;
      const definitions = tx.listEventDefinitions ? await tx.listEventDefinitions({ status: 'ACTIF' }) : [];
      const definition = (definitions || []).find((row) => String(row.definition_id || row.definitionId || '') === String(version.definition_id || version.definitionId || '')) || null;
      const policyVersionId = version.policy_version_id || version.policyVersionId || null;
      const engineRoute = genericCatalog.resolveEngineRoute({ domaine_code: line.domaineStockage || line.domaine }, { definitionVersion: version });
      const snapshot = genericCatalog.snapshotDefinitionVersion(definition || { code: version.definitionCode, label: version.definitionLabel, domain: version.domain }, version, {
        policy_version_id: policyVersionId,
        policy_code: version.policyCode,
        version_code: version.policyVersionCode
      });
      snapshot.association = { origin: 'IMPORT', label: 'Import', at: new Date().toISOString() };
      return {
        definition,
        version,
        definitionVersionId: version.definition_version_id || version.definitionVersionId,
        policyVersionId,
        engineRoute,
        snapshot
      };
    }
    const explicitCode = String(line?.eventDefinitionCode || line?.event_definition_code || '').trim();
    if(!explicitCode || !tx.listEventDefinitions || !tx.listEventDefinitionVersions) return null;
    const definitions = await tx.listEventDefinitions({ status: 'ACTIF' });
    const definition = (definitions || []).find((row) => String(row.code || '').toUpperCase() === genericCatalog.definitionCode({ code: explicitCode }));
    if(!definition) return null;
    const versions = await tx.listEventDefinitionVersions({ definitionId: definition.definition_id || definition.definitionId, active: true });
    const requestedVersion = String(line?.definitionVersionCode || line?.definition_version_code || '').trim();
    const version = requestedVersion
      ? (versions || []).find((row) => String(row.version_code || row.versionCode || '').toUpperCase() === requestedVersion.toUpperCase())
      : genericCatalog.findApplicableVersion(versions, definition.definition_id || definition.definitionId, line.date);
    if(!version) return null;
    const policyVersionId = version.policy_version_id || version.policyVersionId || null;
    const engineRoute = genericCatalog.resolveEngineRoute({ domaine_code: line.domaineStockage || line.domaine }, { definitionVersion: version });
    const snapshot = genericCatalog.snapshotDefinitionVersion(definition, version, {
      policy_version_id: policyVersionId,
      policy_code: version.policyCode,
      version_code: version.policyVersionCode
    });
    snapshot.association = { origin: 'IMPORT', label: 'Import', at: new Date().toISOString() };
    return {
      definition,
      version,
      definitionVersionId: version.definition_version_id || version.definitionVersionId,
      policyVersionId,
      engineRoute,
      snapshot
    };
  }

  async function attachImportedExerciseSessions(tx, imported, actor, source){
    const candidates = (imported || []).filter((item) => {
      const line = item.line || {};
      const match = line.genericMatch || {};
      return Number(line.nbSessions || line.nombreSessionsAttendu || match.sessionCount || 0) > 1
        && Number(line.sessionIndex || line.session_index || match.sessionIndex || 0) > 0;
    });
    if(!candidates.length || !tx.upsertExercise || !tx.updateEventIfVersion) return [];
    const byKey = new Map();
    for(const item of candidates){
      const key = importedExerciseKey(item.line);
      const list = byKey.get(key) || [];
      list.push(item);
      byKey.set(key, list);
    }
    const attached = [];
    for(const [key, list] of byKey.entries()){
      const first = list[0].line;
      const binding = await importDefinitionBinding(tx, first);
      const firstMatch = first.genericMatch || {};
      const count = Number(first.nbSessions || first.nombreSessionsAttendu || firstMatch.sessionCount);
      const seenSessions = new Set();
      for(const item of list){
        const line = item.line || {};
        const idx = Number(line.sessionIndex || line.session_index || (line.genericMatch && line.genericMatch.sessionIndex) || 0);
        if(!Number.isInteger(idx) || idx < 1 || idx > count){
          throw new HttpError(422, 'import_session_hors_plage', `Session ${idx || '?'} hors plage pour ${count} sessions.`, { lineNo: line.ligneNo, sessionIndex: idx, sessionCount: count });
        }
        if(seenSessions.has(idx)){
          throw new HttpError(409, 'import_session_dupliquee', `La session ${idx}/${count} est présente plusieurs fois dans le même groupe importé.`, { sessionIndex: idx, sessionCount: count });
        }
        seenSessions.add(idx);
      }
      const exercice = await tx.upsertExercise({
        exercice_key: exerciseKeyFromParts(source || 'import', key, first.date, first.libelle),
        domaine_code: first.domaineStockage,
        code: first.exerciceCode || first.codeEvent || key,
        libelle: String(first.exerciceLibelle || first.libelle || 'Exercice').replace(/\s*\|.*$/, '').trim() + ` — ${String(first.date || '').slice(0, 4)}`,
        annee: Number(String(first.date || '').slice(0, 4)),
        mode_session: 'MULTI',
        nombre_sessions_attendu: count,
        consolidation_active: true,
        source: 'IMPORT',
        definition_version_id: binding && binding.definitionVersionId,
        policy_version_id: binding && binding.policyVersionId,
        engine_route: binding && binding.engineRoute,
        configuration_snapshot: binding && binding.snapshot,
        metadata: { source, sourceLineNos: list.map((item) => item.line.ligneNo) }
      });
      for(const item of list){
        const line = item.line;
        const event = item.evenement;
        const match = line.genericMatch || {};
        const sessionIndex = Number(line.sessionIndex || line.session_index || match.sessionIndex);
        const patch = {
          exercice_id: exercice.exercice_id,
          session_index: sessionIndex,
          session_label: `${sessionIndex}/${count}`,
          definition_version_id: binding && binding.definitionVersionId,
          policy_version_id: binding && binding.policyVersionId,
          engine_route: binding && binding.engineRoute,
          engine_snapshot: binding && binding.snapshot
        };
        if(String(line.domaineStockage || '').toUpperCase() === 'PR'){
          patch.pr_exercise_group_key = `EXERCICE:${exercice.exercice_id}`;
          patch.pr_session_key = `EXERCICE:${exercice.exercice_id}.${sessionIndex}`;
        }
        const updated = await tx.updateEventIfVersion(event.evenement_id, event.version, patch);
        item.evenement = updated || event;
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: event.evenement_id,
          action: 'RATTACHER_EXERCICE_SESSION',
          apres: { exerciceId: exercice.exercice_id, sessionIndex, source }
        });
        attached.push({ evenementId: event.evenement_id, exerciceId: exercice.exercice_id, sessionIndex });
      }
    }
    return attached;
  }

  async function enrichGenericImportPreview(preview){
    return enrichGenericImportPreviewWithDecisions(preview, {});
  }

  async function enrichGenericImportPreviewWithDecisions(preview, decisions = {}){
    const defs = repo.listEventDefinitions ? await repo.listEventDefinitions({ status: 'ACTIF' }) : [];
    const versions = repo.listEventDefinitionVersions ? await repo.listEventDefinitionVersions({ active: true }) : [];
    const withLines = genericCatalog.enrichImportLinesWithMatches(preview.lignes || [], {
      definitions: defs,
      definitionVersions: versions,
      decisions
    });
    const byLine = new Map(withLines.map((line) => [Number(line.ligneNo), line.genericMatch]));
    const groups = (preview.groups || []).map((group) => {
      const matches = (group.sourceLineNos || []).map((lineNo) => byLine.get(Number(lineNo))).filter(Boolean);
      const best = matches.find((m) => m.status === 'EXACT') || matches.find((m) => m.status === 'SUGGESTED') || matches[0] || null;
      return Object.assign({}, group, {
        genericMatch: best,
        actionPrevue: best && best.action && best.action !== 'PRET' && best.action !== 'IMPORTER_SANS_CONFIGURATION' && group.actionPrevue === 'CREER' ? 'VALIDATION_HUMAINE_REQUISE' : group.actionPrevue
      });
    });
    const validationRequired = withLines.some((line) => importConfigurationBlocks(line)) || groups.some((group) => importConfigurationBlocks(group));
    const summary = Object.assign({}, preview.summary || {});
    if(validationRequired){
      summary.peutCommit = false;
      summary.aControler = Math.max(Number(summary.aControler || 0), 1);
    }
    return Object.assign({}, preview, {
      lignes: withLines,
      groups,
      summary,
      genericDefinitions: {
        suggestions: withLines.filter((line) => line.genericMatch && line.genericMatch.definitionId).length,
        unknown: withLines.filter((line) => line.genericMatch && line.genericMatch.status === 'UNKNOWN_DEFINITION').length,
        validationRequired
      }
    });
  }

  function importConfigurationBlocks(line){
    const action = String(line && line.genericMatch && line.genericMatch.action || '');
    return ['VALIDATION_HUMAINE_REQUISE', 'CHOIX_CONFIGURATION_REQUIS', 'CHOIX_SESSION_REQUIS', 'CORRIGER_SESSION'].includes(action);
  }

  async function previewImportEvenements(body){
    const csvText = String(body?.csvText || body?.csv || '');
    if(!csvText.trim()){
      throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
    }
    const format = importContract.detectCsvFormatFromText(csvText);
    if(format === importContract.FORMAT_NATIVE){
      const preview = importContract.previewScopeImport(csvText, await previewNativeContext(body));
      if(preview.error === 'fichier_vide'){
        throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
      }
      return { ...(await enrichGenericImportPreviewWithDecisions(preview, body?.decisions || {})), ecriture: false };
    }
    if(format === importContract.FORMAT_STANDARD){
      const preview = importContract.previewStandardImport(csvText, await previewNativeContext(body));
      if(preview.error === 'fichier_vide'){
        throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
      }
      return { ...(await enrichStandardPreviewPopulations(await enrichGenericImportPreviewWithDecisions(preview, body?.decisions || {}))), ecriture: false };
    }
    if(format === importContract.FORMAT_F7){
      const preview = previewFromCsv(csvText, await previewContext());
      return { ...preview, ecriture: false };
    }
    throw new HttpError(400, 'format_csv_inconnu', 'Format CSV non reconnu. Utilisez le programme SCOPE, le standard CODE COURS ou l’historique Monitoring F7.');
  }

  async function commitStandardImport(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    const filename = String(body?.filename || body?.sourceFilename || '').slice(0, 240);
    const preview = await enrichGenericImportPreviewWithDecisions(
      importContract.previewStandardImport(csvText, await previewNativeContext(body)),
      body?.decisions || {}
    );
    if(!body?.previewToken){
      throw new HttpError(400, 'preview_token_requis', 'Relancez le contrôle (preview) avant de confirmer l’import.');
    }
    if(preview.previewToken && body.previewToken !== preview.previewToken){
      throw new HttpError(409, 'preview_obsolete', 'La preview n’est plus à jour. Relancez le contrôle avant de confirmer.', {
        previewToken: preview.previewToken
      });
    }
    const excluded = new Set(
      (Array.isArray(body?.excludedLineNos) ? body.excludedLineNos : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const groups = (preview.groups || []).filter((g) => !g.sourceLineNos.every((n) => excluded.has(n)));
    const blockingLines = preview.lignes.filter((l) => !excluded.has(l.ligneNo) && (l.statut === 'ERREUR' || (l.actionPrevue === 'CREER' && importConfigurationBlocks(l))));
    const blockingGroups = groups.filter((g) => g.statut === 'REVIEW_REQUIRED' || g.statut === 'DIVERGENCE' || (g.actionPrevue === 'CREER' && importConfigurationBlocks(g)));
    if(blockingLines.length || blockingGroups.length){
      throw new HttpError(422, 'import_refuse', 'Des lignes en erreur ou à contrôler doivent être corrigées ou exclues avant commit.', {
        erreurs: blockingLines.map((l) => ({ ligneNo: l.ligneNo, raison: l.raison })),
        groupes: blockingGroups.map((g) => ({ sourceLineNos: g.sourceLineNos, statut: g.statut }))
      });
    }
    return repo.withTransaction(async (tx) => {
      const sourceSha = importContract.sha256Hex(csvText);
      const created = [];
      const skipped = [];
      const importedGroups = [];
      const importedByLine = new Map();
      const skippedByLine = new Map();
      const attenduRows = [];
      const participationRows = [];
      const populationStore = previewPopulationStore(tx);
      for(const group of groups){
        if(group.actionPrevue === 'IGNORER_IDEMPOTENT' || group.statut === 'EXACT_MATCH' || group.statut === 'PROBABLE_MATCH'){
          skipped.push({ sourceLineNos: group.sourceLineNos, statut: group.statut, codeCours: group.codeCours });
          group.sourceLineNos.forEach((lineNo) => skippedByLine.set(lineNo, skipped[skipped.length - 1]));
          continue;
        }
        const genericBinding = await importDefinitionBinding(tx, group);
        const targetPolicy = genericBinding
          ? await policySnapshotFromDefinitionVersion(tx, genericBinding.version)
          : await capturePolicySnapshot(tx, group.domaineStockage);
        const event = await tx.insertEvenement({
          date: group.date,
          domaine_code: group.domaineStockage,
          sous_domaine_code: group.sousDomaine || null,
          libelle: group.libelle,
          statut: 'PLANIFIE',
          origine: 'IMPORT_CSV',
          mode_suivi: 'NOMINATIF',
          code_cours: group.codeCours,
          code_source: group.codeCours,
          source_type: 'CSV',
          heure_debut: group.heureDebut || null,
          heure_fin: group.heureFin || null,
          salle: group.salle || null,
          responsable: group.responsable || null,
          definition_version_id: genericBinding && genericBinding.definitionVersionId,
          policy_version_id: genericBinding && genericBinding.policyVersionId,
          engine_route: genericBinding && genericBinding.engineRoute,
          engine_snapshot: genericBinding && genericBinding.snapshot,
          participation_policy_version: targetPolicy.policyVersion,
          participation_policy_snapshot: targetPolicy,
          cible_ids: (group.cibles || []).map((c) => c.cibleId)
        });
        if(event.already_exists){
          const item = { sourceLineNos: group.sourceLineNos, statut: 'EXACT_MATCH', codeCours: group.codeCours };
          skipped.push(item);
          group.sourceLineNos.forEach((lineNo) => skippedByLine.set(lineNo, item));
          continue;
        }
        await tx.appendJournal({
          auteur_id: actorId(actor),
          entite: 'evenement',
          entite_id: event.evenement_id,
          action: 'CREER_IMPORT_STANDARD',
          apres: { codeCours: group.codeCours, sourceLineNos: group.sourceLineNos, cibles: group.cibleCodes }
        });
        const population = await resolveEligiblePopulation({
          eventDate: group.date,
          domaineCode: group.domaineStockage,
          sousDomaineCode: group.sousDomaine || null,
          cibleIds: (group.cibles || []).map((c) => c.cibleId),
          store: populationStore
        });
        for(const personne of population.personnes){
          attenduRows.push({
            evenement_id: event.evenement_id,
            personne_id: personne.personneId,
            inclus: true,
            origine: 'REGLE',
            motif_inclusion: (personne.cibles || [])
              .map((c) => `${c.domaineCode}_${c.niveauCode}`)
              .filter(Boolean)
              .join('|') || 'population_standard'
          });
          participationRows.push({
            evenement_id: event.evenement_id,
            personne_id: personne.personneId,
            statut: 'NON_RENSEIGNE',
            role: 'PARTICIPANT',
            source: 'GENERATION',
            auteur_id: actorId(actor)
          });
        }
        const frozen = await tx.updateEventIfVersion(event.evenement_id, event.version, {
          population_figee: true,
          population_version: 1,
          figee_at: new Date().toISOString(),
          figee_par: actorId(actor)
        });
        created.push({
          evenementId: event.evenement_id,
          codeCours: group.codeCours,
          sourceLineNos: group.sourceLineNos,
          targets: group.cibles.length,
          population: population.count,
          version: frozen ? frozen.version : event.version,
          exercice: group.nbSessions > 1 ? {
            code: group.exerciceCode || group.codeEvent || null,
            sessionIndex: group.sessionIndex,
            nombreSessionsAttendu: group.nbSessions
          } : null
        });
        importedGroups.push({ group, line: group, evenement: frozen || event });
        group.sourceLineNos.forEach((lineNo) => importedByLine.set(lineNo, frozen || event));
      }
      const attachedExerciseSessions = await attachImportedExerciseSessions(tx, importedGroups, actor, importContract.FORMAT_STANDARD);
      if(tx.bulkUpsertAttendus) await tx.bulkUpsertAttendus(attenduRows);
      else {
        for(const row of attenduRows) await tx.upsertAttendu(row);
      }
      if(tx.bulkUpsertParticipations) await tx.bulkUpsertParticipations(participationRows);
      else {
        for(const row of participationRows) await tx.upsertParticipation(row);
      }
      const importRow = await tx.insertImport({
        source_filename: filename || null,
        source_sha256: sourceSha,
        imported_par: actorId(actor),
        statut: 'COMMITE',
        nb_lignes: preview.lignes.length,
        rapport: {
          format: importContract.FORMAT_STANDARD,
          imported: created.length,
          skipped: skipped.length,
          grouped: preview.summary.regroupes,
          attachedExerciseSessions,
          excluded: [...excluded]
        }
      });
      const importLineRows = [];
      for(const line of preview.lignes){
        const groupDone = importedByLine.get(line.ligneNo);
        const groupSkipped = skippedByLine.get(line.ligneNo);
        importLineRows.push({
          import_id: importRow.import_id,
          ligne_no: line.ligneNo,
          fingerprint: line.fingerprint,
          statut: excluded.has(line.ligneNo) ? 'EXCLU' : (groupSkipped ? 'DEJA_IMPORTE' : 'IMPORTE'),
          type_propose: 'STANDARD',
          evenement_id: groupDone ? groupDone.evenement_id : null,
          payload_source: { format: importContract.FORMAT_STANDARD, line },
          raison: line.raison,
          action: excluded.has(line.ligneNo) ? 'EXCLU' : (groupSkipped ? 'IGNORER_IDEMPOTENT' : 'CREER')
        });
      }
      if(tx.bulkInsertImportLignes) await tx.bulkInsertImportLignes(importLineRows);
      else {
        for(const row of importLineRows) await tx.insertImportLigne(row);
      }
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'import',
        entite_id: importRow.import_id,
        action: 'IMPORTER_EVENEMENTS_STANDARD',
        apres: { filename, imported: created.length, skipped: skipped.length, grouped: preview.summary.regroupes }
      });
      return {
        importId: importRow.import_id,
        format: importContract.FORMAT_STANDARD,
        created,
        skipped,
        attachedExerciseSessions,
        excluded: [...excluded],
        summary: {
          nbLignes: preview.lignes.length,
          imported: created.length,
          dejaImporte: skipped.length,
          regroupes: preview.summary.regroupes,
          exclus: excluded.size,
          erreurs: 0
        }
      };
    });
  }

  async function commitNativeImport(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    const filename = String(body?.filename || body?.sourceFilename || '').slice(0, 240);
    const excluded = new Set(
      (Array.isArray(body?.excludedLineNos) ? body.excludedLineNos : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const preview = await enrichGenericImportPreviewWithDecisions(
      importContract.previewScopeImport(csvText, await previewNativeContext(body)),
      body?.decisions || {}
    );
    if(!body?.previewToken){
      throw new HttpError(400, 'preview_token_requis', 'Relancez le contrôle (preview) avant de confirmer l’import.');
    }
    if(preview.previewToken && body.previewToken !== preview.previewToken){
      throw new HttpError(409, 'preview_obsolete', 'La preview n’est plus à jour. Relancez le contrôle avant de confirmer.', {
        previewToken: preview.previewToken
      });
    }
    const included = preview.lignes.filter((l) => !excluded.has(l.ligneNo));
    const blocking = included.filter((l) =>
      String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT' || l.statut === 'A_ARBITRER' || (l.actionPrevue === 'CREER' && importConfigurationBlocks(l))
    );
    if(blocking.length){
      throw new HttpError(422, 'import_refuse', 'Des lignes en erreur ou à arbitrer doivent être corrigées ou exclues avant commit.', {
        erreurs: blocking.map((l) => ({ ligneNo: l.ligneNo, statut: l.statut, raison: l.raison })),
        summary: preview.summary
      });
    }
    if(!included.length){
      throw new HttpError(400, 'import_vide', 'Aucune ligne à importer.');
    }

    return repo.withTransaction(async (tx) => {
      const sourceSha = importContract.sha256Hex(csvText);
      const created = [];
      const skipped = [];
      const imported = [];

      for(const line of included){
        if(line.actionPrevue === 'IGNORER_IDEMPOTENT' || line.statut === 'DEJA_IMPORTE' || line.statut === 'DEJA_PRESENT'){
          skipped.push({ ligneNo: line.ligneNo, statut: line.statut, fingerprint: line.fingerprint });
          continue;
        }
        const genericBinding = await importDefinitionBinding(tx, line);
        const targetPolicy = genericBinding
          ? await policySnapshotFromDefinitionVersion(tx, genericBinding.version)
          : await capturePolicySnapshot(tx, line.domaineStockage || line.domaine);
        const evenement = await tx.insertEvenement({
          date: line.date,
          domaine_code: line.domaineStockage,
          sous_domaine_code: line.sousDomaine || null,
          libelle: line.libelle,
          statut: 'PLANIFIE',
          origine: 'IMPORT_CSV',
          mode_suivi: line.modePropose,
          identifiant_externe: line.identifiantExterne || null,
          definition_version_id: genericBinding && genericBinding.definitionVersionId,
          policy_version_id: genericBinding && genericBinding.policyVersionId,
          engine_route: genericBinding && genericBinding.engineRoute,
          engine_snapshot: genericBinding && genericBinding.snapshot,
          participation_policy_version: targetPolicy.policyVersion,
          participation_policy_snapshot: targetPolicy,
          cible_ids: (line.cibles || []).map((c) => c.cibleId)
        });
        created.push({
          ligneNo: line.ligneNo,
          evenementId: evenement.evenement_id,
          mode: line.modePropose,
          date: line.date,
          exercice: line.nbSessions > 1 ? {
            code: line.exerciceCode || line.codeEvent || null,
            sessionIndex: line.sessionIndex,
            nombreSessionsAttendu: line.nbSessions
          } : null
        });
        imported.push({ line, evenement });
      }

      const attachedExerciseSessions = await attachImportedExerciseSessions(tx, imported, actor, importContract.FORMAT_NATIVE);

      const importRow = await tx.insertImport({
        source_filename: filename || null,
        source_sha256: sourceSha,
        imported_par: actorId(actor),
        statut: 'COMMITE',
        nb_lignes: preview.lignes.length,
        rapport: {
          format: importContract.FORMAT_NATIVE,
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded],
          attachedExerciseSessions
        }
      });

      for(const line of preview.lignes){
        if(excluded.has(line.ligneNo)){
          await tx.insertImportLigne({
            import_id: importRow.import_id,
            ligne_no: line.ligneNo,
            fingerprint: line.fingerprint,
            statut: 'EXCLU',
            type_propose: line.modePropose,
            payload_source: { format: importContract.FORMAT_NATIVE, fields: line },
            raison: line.raison,
            action: 'EXCLU'
          });
          continue;
        }
        const done = imported.find((item) => item.line.ligneNo === line.ligneNo);
        const skip = skipped.find((item) => item.ligneNo === line.ligneNo);
        await tx.insertImportLigne({
          import_id: importRow.import_id,
          ligne_no: line.ligneNo,
          fingerprint: line.fingerprint,
          statut: skip ? 'DEJA_IMPORTE' : 'IMPORTE',
          type_propose: line.modePropose,
          evenement_id: done ? done.evenement.evenement_id : null,
          payload_source: { format: importContract.FORMAT_NATIVE, libelle: line.libelle, mode: line.modePropose },
          raison: line.raison,
          action: skip ? 'IGNORER_IDEMPOTENT' : line.actionPrevue
        });
      }

      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'import',
        entite_id: importRow.import_id,
        action: 'IMPORTER_PROGRAMME_EXERCICES',
        apres: {
          filename,
          format: importContract.FORMAT_NATIVE,
          fingerprint: sourceSha,
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded]
        }
      });

      return {
        importId: importRow.import_id,
        format: importContract.FORMAT_NATIVE,
        created,
        skipped,
        attachedExerciseSessions,
        excluded: [...excluded],
        summary: {
          nbLignes: preview.lignes.length,
          imported: created.length,
          dejaImporte: skipped.length,
          exclus: excluded.size,
          erreurs: 0,
          rollback: 0
        }
      };
    });
  }

  async function commitImportEvenements(body, actor){
    const csvText = String(body?.csvText || body?.csv || '');
    if(!csvText.trim()){
      throw new HttpError(400, 'csv_vide', 'Fichier CSV vide.');
    }
    const format = importContract.detectCsvFormatFromText(csvText);
    if(format === importContract.FORMAT_NATIVE){
      return commitNativeImport(body, actor);
    }
    if(format === importContract.FORMAT_STANDARD){
      return commitStandardImport(body, actor);
    }
    if(format !== importContract.FORMAT_F7){
      throw new HttpError(400, 'format_csv_inconnu', 'Format CSV non reconnu. Utilisez le programme SCOPE ou l’historique Monitoring F7.');
    }
    const filename = String(body?.filename || body?.sourceFilename || '').slice(0, 240);
    const excluded = new Set(
      (Array.isArray(body?.excludedLineNos) ? body.excludedLineNos : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    );
    const preview = previewFromCsv(csvText, await previewContext());
    const included = preview.lignes.filter((l) => !excluded.has(l.ligneNo));
    const erreurs = included.filter((l) => l.statut === 'ERREUR' && !l.dejaImporte);
    if(erreurs.length){
      throw new HttpError(422, 'import_refuse', 'Des lignes en erreur doivent être corrigées ou exclues avant commit.', {
        erreurs: erreurs.map((l) => ({ ligneNo: l.ligneNo, code: l.code, raison: l.raison })),
        summary: preview.summary
      });
    }
    if(!included.length){
      throw new HttpError(400, 'import_vide', 'Aucune ligne à importer.');
    }

    return repo.withTransaction(async (tx) => {
      const sourceSha = csvImport.sha256Hex(csvText);
      const created = [];
      const skipped = [];
      const imported = [];

      for(const line of included){
        if(line.dejaImporte || line.actionPrevue === 'IGNORER_DEJA_IMPORTE'){
          skipped.push({ ligneNo: line.ligneNo, statut: 'DEJA_IMPORTE', fingerprint: line.fingerprint });
          continue;
        }
        const origine = line.typePropose === 'LEGACY' ? 'LEGACY_AGGREGATED' : 'NOMINATIF';
        const evenement = await tx.insertEvenement({
          date: line.date,
          domaine_code: line.domaine,
          libelle: line.libelle,
          statut: 'PLANIFIE',
          origine,
          mode_suivi: origine === 'LEGACY_AGGREGATED' ? 'LEGACY' : 'NOMINATIF',
          cible_ids: line.cibleId ? [line.cibleId] : []
        });
        let legacy = null;
        if(line.typePropose === 'LEGACY'){
          legacy = await tx.insertLegacy({
            source_record_id: line.fingerprint,
            date: line.date,
            domaine_code: line.domaine,
            libelle: line.libelle,
            nb_convoques: line.numbers.nb_convoques,
            nb_presents: line.numbers.nb_presents,
            nb_excuses: line.numbers.nb_excuses_total,
            nb_absents: line.numbers.nb_absents_non_excuses,
            evenement_id: evenement.evenement_id,
            fingerprint: line.fingerprint,
            payload_v67: {
              provenance: 'CSV_MONITORING_F7',
              profil: csvImport.IMPORT_PROFIL,
              format: csvImport.IMPORT_PROFIL,
              a_comptabiliser: line.aComptabiliser,
              a_comptabiliser_scope: false,
              legacy_inclus_stats: line.aComptabiliser,
              public_cible: line.publicCible,
              modele: line.source.modele || line.libelle,
              libelle: line.libelle,
              nb_permutation: line.numbers.nb_permutation,
              nb_ext_dap_y1: line.numbers.nb_ext_dap_y1,
              nb_ext_dap_y2: line.numbers.nb_ext_dap_y2,
              nb_ext_dap_y3: line.numbers.nb_ext_dap_y3,
              nb_ext_dap_y4: line.numbers.nb_ext_dap_y4,
              nb_ext_dap_total: line.numbers.nb_ext_dap_total,
              nb_excuses_maladie: line.numbers.nb_excuses_maladie,
              nb_excuses_accident: line.numbers.nb_excuses_accident,
              nb_excuses_professionnel: line.numbers.nb_excuses_professionnel,
              nb_excuses_prive: line.numbers.nb_excuses_prive,
              total_detail: line.numbers.total_detail,
              total_attendu: line.numbers.total_attendu,
              remarque: line.source.remarque,
              source: line.source
            }
          });
        }
        created.push({
          ligneNo: line.ligneNo,
          evenementId: evenement.evenement_id,
          legacyId: legacy ? legacy.legacy_id : null,
          typePropose: line.typePropose
        });
        imported.push({ line, evenement, legacy });
      }

      const importRow = await tx.insertImport({
        source_filename: filename || null,
        source_sha256: sourceSha,
        imported_par: actorId(actor),
        statut: 'COMMITE',
        nb_lignes: preview.lignes.length,
        rapport: {
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded]
        }
      });

      for(const line of preview.lignes){
        if(excluded.has(line.ligneNo)){
          await tx.insertImportLigne({
            import_id: importRow.import_id,
            ligne_no: line.ligneNo,
            fingerprint: line.fingerprint,
            statut: 'EXCLU',
            type_propose: line.typePropose,
            payload_source: line.source,
            raison: line.raison,
            action: 'EXCLU'
          });
          continue;
        }
        const done = imported.find((item) => item.line.ligneNo === line.ligneNo);
        const skip = skipped.find((item) => item.ligneNo === line.ligneNo);
        await tx.insertImportLigne({
          import_id: importRow.import_id,
          ligne_no: line.ligneNo,
          fingerprint: line.fingerprint,
          statut: skip ? 'DEJA_IMPORTE' : 'IMPORTE',
          type_propose: line.typePropose,
          evenement_id: done ? done.evenement.evenement_id : null,
          legacy_id: done && done.legacy ? done.legacy.legacy_id : null,
          payload_source: line.source,
          raison: line.raison,
          action: skip ? 'IGNORER_DEJA_IMPORTE' : line.actionPrevue
        });
      }

      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'import',
        entite_id: importRow.import_id,
        action: 'IMPORTER_EVENEMENTS',
        apres: {
          filename,
          imported: created.length,
          skipped: skipped.length,
          excluded: [...excluded]
        }
      });

      return {
        importId: importRow.import_id,
        format: csvImport.IMPORT_PROFIL,
        created,
        skipped,
        excluded: [...excluded],
        summary: {
          nbLignes: preview.lignes.length,
          imported: created.length,
          dejaImporte: skipped.length,
          exclus: excluded.size
        }
      };
    });
  }

  async function suggestModeSuivi(query = {}){
    const cibleIds = []
      .concat(query.cibleIds || query.cible_ids || [])
      .concat(String(query.cibles || '').split(','))
      .map((item) => String(item || '').trim())
      .filter(Boolean);
    const date = isoDate(query.date) || String(query.date || '').trim();
    if(!cibleIds.length || !date){
      return {
        suggested: null,
        requireExplicit: true,
        reason: 'date_et_cibles_requises',
        message: 'Indiquez la date et la cible pour proposer un mode de suivi.'
      };
    }
    const rules = repo.listReglesBascule ? await repo.listReglesBascule() : [];
    const details = [];
    for(const cibleId of cibleIds){
      const cible = await repo.getCible(cibleId);
      if(!cible){
        throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.', { cibleId });
      }
      const rule = csvImport.resolveBasculeRule(cible.cible_id, cible.domaine_code, rules);
      const nominatif = Boolean(rule && date >= rule.date_bascule);
      details.push({
        cibleId,
        suggested: nominatif ? MODES.NOMINATIF : MODES.QUANTITATIF,
        rule: rule || null
      });
    }
    const unique = [...new Set(details.map((item) => item.suggested))];
    if(unique.length !== 1){
      return {
        suggested: null,
        requireExplicit: true,
        reason: 'cibles_divergentes',
        message: 'Les cibles n’ont pas la même règle de suivi. Choisissez Nominatif ou Quantitatif.',
        details
      };
    }
    return {
      suggested: unique[0],
      requireExplicit: false,
      reason: unique[0] === MODES.NOMINATIF ? 'bascule_nominative' : 'defaut_quantitatif',
      nominatifPossible: true,
      message: unique[0] === MODES.NOMINATIF
        ? 'Une règle de bascule nominative s’applique à cette date. Mode proposé : Nominatif.'
        : 'Aucune bascule nominative à cette date. Mode proposé : Quantitatif. Le nominatif reste possible si vous le choisissez.',
      details
    };
  }

  function summarizeLite(evenement){
    return {
      id: evenement.evenement_id,
      date: evenement.date,
      domaine: evenement.domaine_code,
      libelle: evenement.libelle,
      statut: evenement.statut,
      version: evenement.version,
      modeSuivi: inferModeSuivi(evenement)
    };
  }

  async function previewTauxQuantitatif(eventId, body = {}){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    requireQuantitatif(evenement);
    const row = volumesOrThrow(body);
    if(Number(row.nb_permutations || 0) > 0 && evenement.domaine_code !== 'DAP'){
      throw new HttpError(422, 'permutation_hors_dap', 'Les permutations quantitatives ne sont définies que pour le domaine DAP.');
    }
    const official = officialFromQuantitatif(row);
    if(!official){
      return {
        evenement: summarizeLite(evenement),
        valide: false,
        officiel: false,
        volumes: row,
        taux: null,
        message: 'Présents + excusés + non excusés + dispensés doit être égal aux attendus. Les permutations sont suivies séparément des présences réalisées.'
      };
    }
    const realise = evenement.statut === 'REALISE';
    return {
      evenement: summarizeLite(evenement),
      valide: true,
      officiel: realise,
      volumes: row,
      taux: {
        ...official,
        source: realise ? 'OFFICIEL' : 'PREVIEW'
      },
      message: realise
        ? 'Taux officiel SCOPE'
        : 'Aperçu calculé par le serveur. Ce n’est pas encore un taux officiel réalisé.'
    };
  }

  async function enregistrerSaisieQuantitative(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    const row = volumesOrThrow(body);
    officialQuantitatifOrThrow(row);
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      requireQuantitatif(evenement);
      if(evenement.statut !== 'PLANIFIE'){
        throw new HttpError(422, 'statut_invalide', 'Saisie possible uniquement sur PLANIFIE.');
      }
      if(Number(row.nb_permutations || 0) > 0 && evenement.domaine_code !== 'DAP'){
        throw new HttpError(422, 'permutation_hors_dap', 'Les permutations quantitatives ne sont définies que pour le domaine DAP.');
      }
      const saved = await tx.upsertQuantitatifSaisie({
        evenement_id: eventId,
        ...row,
        auteur_id: actorId(actor)
      });
      const next = await bumpOrConflict(tx, eventId, baseVersion, {});
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'SAISIE_QUANTITATIVE',
        apres: saved
      });
      return { evenement: next, version: next.version, saisie: saved };
    });
  }

  async function convertirNominatif(eventId, body, actor){
    const baseVersion = requireBaseVersion(body);
    if(body.confirmation !== true && String(body.confirmation || '').toLowerCase() !== 'true'){
      throw new HttpError(400, 'confirmation_requise', 'Confirmez la conversion : les volumes quantitatifs seront supprimés.');
    }
    return repo.withTransaction(async (tx) => {
      const evenement = await tx.getEventForUpdate(eventId);
      if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
      const mode = inferModeSuivi(evenement);
      if(mode === MODES.NOMINATIF){
        throw new HttpError(422, 'deja_nominatif', 'Cet événement est déjà nominatif.');
      }
      if(mode === MODES.LEGACY){
        throw new HttpError(422, 'legacy', 'Un agrégat historique ne peut pas être converti.');
      }
      if(mode !== MODES.QUANTITATIF){
        throw new HttpError(422, 'conversion_interdite', 'La conversion nominatif → quantitatif est interdite.');
      }
      if(evenement.statut === 'REALISE'){
        throw new HttpError(422, 'statut_invalide', 'Réouvrez d’abord la séance avant de passer en nominatif.');
      }
      if(evenement.statut !== 'PLANIFIE'){
        throw new HttpError(422, 'statut_invalide', 'Conversion possible uniquement avant clôture.');
      }
      await tx.deleteQuantitatifSaisie(eventId);
      const next = await bumpOrConflict(tx, eventId, baseVersion, { mode_suivi: MODES.NOMINATIF });
      await tx.appendJournal({
        auteur_id: actorId(actor),
        entite: 'evenement',
        entite_id: eventId,
        action: 'CONVERTIR_NOMINATIF',
        avant: { modeSuivi: MODES.QUANTITATIF },
        apres: { modeSuivi: MODES.NOMINATIF }
      });
      return { evenement: next, version: next.version };
    });
  }

  async function convertirQuantitatif(eventId){
    const evenement = await repo.getEvent(eventId);
    if(!evenement) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
    throw new HttpError(
      422,
      'conversion_interdite',
      'La conversion nominatif → quantitatif est interdite : elle masquerait une traçabilité nominative déjà constituée.'
    );
  }

  async function assertNoAffectationOverlap(personneId, cibleId, dateDebut, dateFin, ignoreId){
    const existing = await repo.listAffectations({ personneId });
    for(const a of existing){
      if(a.cible_id !== cibleId) continue;
      if(ignoreId && a.affectation_id === ignoreId) continue;
      if(rangesOverlap(a.date_debut, a.date_fin, dateDebut, dateFin || null)){
        throw new HttpError(422, 'chevauchement', 'Chevauchement d’affectation Personne × Cible.');
      }
    }
  }

  async function assertNoAffectationOverlapInDomain(personneId, cibleId, dateDebut, dateFin, ignoreId, store){
    const dbx = store || repo;
    const cible = await dbx.getCible(cibleId);
    if(!cible) throw new HttpError(404, 'cible_introuvable', 'Cible introuvable.');
    const existing = await dbx.listAffectations({ personneId });
    for(const a of existing){
      if(ignoreId && a.affectation_id === ignoreId) continue;
      if(a.cible_id === cibleId && rangesOverlap(a.date_debut, a.date_fin, dateDebut, dateFin || null)){
        throw new HttpError(422, 'chevauchement', 'Chevauchement d’affectation Personne × Cible.');
      }
      const other = await dbx.getCible(a.cible_id);
      if(!other || other.domaine_code !== cible.domaine_code) continue;
      if(a.cible_id === cibleId) continue;
      if(rangesOverlap(a.date_debut, a.date_fin, dateDebut, dateFin || null)){
        throw new HttpError(
          422,
          'chevauchement_domaine',
          'Chevauchement d’affectations dans le même domaine. Les appartenances multi-domaines restent autorisées.'
        );
      }
    }
  }

  async function performanceDiagnostics(){
    return {
      performance: {
        generatedAt: new Date().toISOString(),
        scope: 'navigation_principale',
        measurements: {
          accueil: { measuredBeforeMs: 14000, measuredAfterMs: null, rootCause: 'dashboard principal et compteur alertes de navigation attendus dans le chargement global' },
          evenements: { measuredBeforeMs: 15000, measuredAfterMs: null, rootCause: 'premiere ouverture penalisee par ensureSchema runtime et compteur alertes attendu avec la liste' },
          personnel: { measuredBeforeMs: 12000, measuredAfterMs: null, rootCause: 'premiere ouverture charge le repertoire complet; navigation bloquee par compteurs secondaires' },
          analyses: { measuredBeforeMs: 13000, measuredAfterMs: null, rootCause: 'dashboard analytique + analyse nominative + alertes secondaires retenaient le loader global' },
          vigilance: { measuredBeforeMs: 17000, measuredAfterMs: null, rootCause: 'service alertes complet execute toutes les familles de vigilance et DDL runtime potentiel au premier hit' }
        },
        serverInstrumentation: {
          headers: ['Server-Timing', 'X-Scope-Perf'],
          fields: ['totalMs', 'dbAcquireMs', 'sqlMs', 'queryCount'],
          endpoints: {
            accueil: ['/referentiels', '/evenements', '/dashboard'],
            evenements: ['/evenements'],
            personnel: ['/personnes/count', '/personnel'],
            analyses: ['/dashboard', '/analytics/personnel'],
            vigilance: ['/alerts']
          }
        },
        appliedOptimizations: [
          'ensureScopeSchema court-circuite les migrations deja appliquees et utilise un verrou PostgreSQL advisory pour les environnements vierges',
          'referentiels client mis en cache et invalides apres ecriture',
          'listes evenements/cycles/dashboard/vigilance chargees via cache court par periode',
          'suppression du double appel objectifs sur changement de route',
          'compteur personnel remplace par endpoint count leger et charge uniquement pour import/personnel',
          'chargements independants de navigation executes en parallele',
          'compteur alertes de navigation rafraichi en arriere-plan non bloquant',
          'bandeau global Chargement supprime pour les navigations ordinaires',
          'instrumentation client ScopePerformance pour duree appels, payloads et rendu utile'
        ],
        safeguards: [
          'cache court TTL',
          'invalidation explicite apres import/ecriture',
          'tokens de requetes existants conserves pour eviter les reponses obsoletes'
        ]
      }
    };
  }

  return {
    referentiels,
    participationPolicies,
    participationReferentialUsage,
    saveParticipationPolicy,
    saveParticipationStatus,
    saveParticipationMotif,
    deleteParticipationStatus,
    deleteParticipationMotif,
    formationCatalog,
    createEventDefinition,
    previewFormationEventAssociation,
    associateEventsToFormationConfiguration,
    dissociateEventsFromFormationConfiguration,
    reconductEventDefinitionVersion,
    performanceDiagnostics,
    countPersonnes,
    listPersonnes,
    affectationsValides,
    listEvenements,
    createEvenement,
    patchEvenement,
    previewModifierEvenement,
    previewAttendus,
    resolveEligiblePopulation,
    figerPopulation,
    ajouterException,
    retirerAttendu,
    enregistrerParticipations,
    permutationsForEvent,
    regulariserPermutation,
    ajouterEncadrement,
    retirerEncadrement,
    resetParticipations,
    cloturer,
    cloturerMultiSessionV2,
    reouvrir,
    annulerEvenement,
    supprimerOuAnnulerEvenement,
    lireEvenement,
    tauxEvenement,
    suggestModeSuivi,
    previewTauxQuantitatif,
    enregistrerSaisieQuantitative,
    convertirNominatif,
    convertirQuantitatif,
    previewImportEvenements,
    commitImportEvenements,
    createPersonne,
    listPeriodes,
    ouvrirPeriode,
    cloturerPeriode,
    archiverPersonne,
    reactiverPersonne,
    changerAffectation,
    previewPersonnelSync,
    commitPersonnelSync,
    syncExpectedPopulationForPersonnes,
    reconcileExpectedPopulation,
    reconcilePrAbcPopulation,
    assertNoAffectationOverlap,
    assertNoAffectationOverlapInDomain,
    computeTaux,
    expectedPopulationCoherence
  };
}

module.exports = { createScopeService, requireBaseVersion };
