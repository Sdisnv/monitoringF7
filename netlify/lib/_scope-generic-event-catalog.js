'use strict';

const ROUTES = Object.freeze({
  SIMPLE_LEGACY: 'SIMPLE_LEGACY',
  PR_LEGACY: 'PR_LEGACY',
  GENERIC_SIMPLE: 'GENERIC_SIMPLE',
  GENERIC_MULTI_SESSION: 'GENERIC_MULTI_SESSION'
});

const ORGANISATION_MODES = Object.freeze({
  SIMPLE: 'SIMPLE',
  MULTI_SESSION: 'MULTI_SESSION'
});

const POLICY_VERSION_KIND = 'SCOPE_PARTICIPATION_POLICY_VERSION';
const DEFINITION_VERSION_KIND = 'SCOPE_EVENT_DEFINITION_VERSION';

function text(value){
  return String(value == null ? '' : value).trim();
}

function upper(value){
  return text(value).toUpperCase();
}

function nfc(value){
  return text(value).normalize('NFC');
}

function slug(value, fallback = 'SCOPE'){
  const cleaned = nfc(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return cleaned || fallback;
}

function normalizeComparable(value){
  return nfc(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(session|seance)\b/g, ' ')
    .replace(/\b\d+\s*[./-]\s*\d+\b/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function yearFrom(value, fallback){
  const raw = text(value);
  const match = raw.match(/\b(20\d{2}|19\d{2})\b/);
  if(match) return Number(match[1]);
  const fb = Number(fallback);
  return Number.isInteger(fb) ? fb : null;
}

function dateOnly(value){
  return value ? String(value).slice(0, 10) : null;
}

function normalizeMode(value, sessionCount){
  const raw = upper(value || '');
  if(['MULTI', 'MULTI_SESSION', 'MULTI-SESSION', 'PLUSIEURS'].includes(raw)) return ORGANISATION_MODES.MULTI_SESSION;
  if(Number(sessionCount || 0) > 1) return ORGANISATION_MODES.MULTI_SESSION;
  return ORGANISATION_MODES.SIMPLE;
}

function definitionCode(input = {}){
  const explicit = text(input.code || input.definition_code || input.definitionCode || input.eventDefinitionCode);
  if(explicit) return slug(explicit);
  const domain = upper(input.domain || input.domaine || input.domaine_code || input.domainCode || 'SCOPE');
  return `${domain}-${slug(input.label || input.libelle || input.name || 'FORMATION')}`;
}

function policyCode(input = {}){
  const explicit = text(input.policy_code || input.policyCode || input.code);
  if(explicit) return slug(explicit);
  const domain = upper(input.domain || input.domaine || input.domaine_code || input.domainCode || 'SCOPE');
  return `${domain}-BASE`;
}

function normalizeDefinition(input = {}){
  const domain = upper(input.domain || input.domaine || input.domaine_code || input.domainCode);
  const label = nfc(input.label || input.libelle || input.name);
  if(!domain) throw new Error('Domaine obligatoire pour une définition.');
  if(!label) throw new Error('Libellé obligatoire pour une définition.');
  return {
    definition_id: input.definition_id || input.definitionId || null,
    code: definitionCode({ ...input, domain }),
    label,
    domain,
    description: nfc(input.description || ''),
    status: upper(input.status || input.statut || 'ACTIF') === 'INACTIF' ? 'INACTIF' : 'ACTIF',
    metadata: input.metadata || {}
  };
}

function normalizePopulationRule(value, domain){
  if(value && typeof value === 'object') return JSON.parse(JSON.stringify(value));
  return {
    type: 'SCOPE_TARGET_RULE',
    domain: upper(domain),
    scope: text(value || 'CIBLES_EVENEMENT')
  };
}

function normalizeDefinitionVersion(input = {}){
  const mode = normalizeMode(input.mode || input.mode_organisation || input.modeOrganisation || input.modeSession, input.session_count || input.sessionCount || input.nombre_sessions_attendu);
  const sessionCount = mode === ORGANISATION_MODES.MULTI_SESSION
    ? Math.max(2, Number(input.session_count || input.sessionCount || input.nombre_sessions_attendu || input.nombreSessionsAttendu || 2))
    : 1;
  const domain = upper(input.domain || input.domaine || input.domaine_code || input.domainCode);
  const validFrom = dateOnly(input.valid_from || input.validFrom || input.date_debut || input.dateDebut);
  const validTo = dateOnly(input.valid_to || input.validTo || input.date_fin || input.dateFin);
  return {
    definition_version_id: input.definition_version_id || input.definitionVersionId || null,
    definition_id: input.definition_id || input.definitionId || null,
    version_code: text(input.version_code || input.versionCode || yearFrom(validFrom, input.year || input.annee) || 'V1'),
    valid_from: validFrom,
    valid_to: validTo,
    mode_organisation: mode,
    session_count: sessionCount,
    policy_version_id: input.policy_version_id || input.policyVersionId || null,
    population_rule: normalizePopulationRule(input.population_rule || input.populationRule, domain),
    numbering_pattern: nfc(input.numbering_pattern || input.numberingPattern || '{label} {index.major}.{index.minor}'),
    active: input.active === false || input.actif === false ? false : true,
    metadata: input.metadata || {}
  };
}

function normalizePolicyVersion(input = {}){
  const domain = upper(input.domain || input.domaine || input.domaine_code || input.domainCode);
  const code = policyCode({ ...input, domain });
  return {
    policy_version_id: input.policy_version_id || input.policyVersionId || null,
    policy_code: code,
    domain,
    version_code: text(input.version_code || input.versionCode || yearFrom(input.valid_from || input.validFrom, input.year || input.annee) || 'V1'),
    valid_from: dateOnly(input.valid_from || input.validFrom || input.date_debut || input.dateDebut),
    valid_to: dateOnly(input.valid_to || input.validTo || input.date_fin || input.dateFin),
    config: JSON.parse(JSON.stringify(input.config || input.policy || {})),
    active: input.active === false || input.actif === false ? false : true,
    metadata: input.metadata || {}
  };
}

function snapshotDefinitionVersion(definition, version, policyVersion){
  return JSON.parse(JSON.stringify({
    kind: DEFINITION_VERSION_KIND,
    capturedAt: new Date().toISOString(),
    definition: definition ? {
      definitionId: definition.definition_id || definition.definitionId,
      code: definition.code,
      label: definition.label,
      domain: definition.domain
    } : null,
    version: version ? {
      definitionVersionId: version.definition_version_id || version.definitionVersionId,
      versionCode: version.version_code || version.versionCode,
      mode: version.mode_organisation || version.modeOrganisation,
      sessionCount: Number(version.session_count || version.sessionCount || 1),
      validFrom: dateOnly(version.valid_from || version.validFrom),
      validTo: dateOnly(version.valid_to || version.validTo),
      populationRule: version.population_rule || version.populationRule || null
    } : null,
    policyVersion: policyVersion ? {
      policyVersionId: policyVersion.policy_version_id || policyVersion.policyVersionId,
      policyCode: policyVersion.policy_code || policyVersion.policyCode,
      versionCode: policyVersion.version_code || policyVersion.versionCode,
      domain: policyVersion.domain || policyVersion.domain_code || policyVersion.domainCode
    } : null
  }));
}

function resolveEngineRoute(event = {}, context = {}){
  const explicit = upper(event.engine_route || event.engineRoute);
  if(Object.values(ROUTES).includes(explicit)) return explicit;
  if(context.multisessionV2 || event.multiSessionV2 || event.multisession_v2_id) return ROUTES.GENERIC_MULTI_SESSION;
  const domain = upper(event.domaine_code || event.domain || event.domainCode);
  if(domain === 'PR' && (event.pr_exercise_group_key || event.pr_session_key)) return ROUTES.PR_LEGACY;
  const version = context.definitionVersion || event.definitionVersion || null;
  const mode = upper(version && (version.mode_organisation || version.modeOrganisation) || event.mode_session || event.modeSession);
  if(mode === ORGANISATION_MODES.MULTI_SESSION || mode === 'MULTI') return ROUTES.GENERIC_MULTI_SESSION;
  if(version || event.definition_version_id || event.definitionVersionId) return ROUTES.GENERIC_SIMPLE;
  return ROUTES.SIMPLE_LEGACY;
}

function validateDefinitionVersion(version, policy = {}){
  const normalized = normalizeDefinitionVersion(version);
  if(normalized.mode_organisation === ORGANISATION_MODES.SIMPLE && normalized.session_count !== 1){
    throw new Error('Une définition Session unique doit contenir exactement une session.');
  }
  if(normalized.mode_organisation === ORGANISATION_MODES.MULTI_SESSION && normalized.session_count < 2){
    throw new Error('Un Multi-session doit contenir au moins deux sessions.');
  }
  const activeStatuses = (policy.activeStatuses || policy.active_statuses || policy.config?.activeStatuses || policy.config?.active_statuses || [])
    .map((item) => upper(item));
  if(normalized.mode_organisation === ORGANISATION_MODES.MULTI_SESSION && activeStatuses.includes('PERMUTATION')){
    throw new Error('Configuration incohérente : la permutation est interdite sur un Multi-session.');
  }
  return normalized;
}

function policyVersionFromDomainPolicy(policy, options = {}){
  const domain = upper(policy.domainCode || policy.domain_code || options.domain);
  return normalizePolicyVersion({
    policy_code: options.policyCode || `${domain}-BASE`,
    domain,
    version_code: options.versionCode || policy.policyVersion || 'sdis-nv-v1',
    valid_from: options.validFrom || `${options.year || 2026}-01-01`,
    valid_to: options.validTo || `${options.year || 2026}-12-31`,
    config: policy,
    active: true,
    metadata: { source: 'participation_policy_engine' }
  });
}

function findApplicableVersion(versions, definitionId, dateOrYear){
  const day = String(dateOrYear || '').length === 4 ? `${dateOrYear}-07-01` : dateOnly(dateOrYear);
  return (versions || [])
    .filter((row) => !definitionId || String(row.definition_id || row.definitionId) === String(definitionId))
    .filter((row) => row.active !== false && row.actif !== false)
    .filter((row) => !day || (!row.valid_from || dateOnly(row.valid_from) <= day) && (!row.valid_to || day <= dateOnly(row.valid_to)))
    .sort((a, b) => String(b.valid_from || '').localeCompare(String(a.valid_from || '')) || String(b.version_code || '').localeCompare(String(a.version_code || '')))
    [0] || null;
}

function extractSessionIndex(line = {}){
  const raw = line.sessionIndex ?? line.session_index ?? line.session ?? line.numeroSession;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function suggestedSessionIndexFromLabel(line = {}, sessionCount){
  const label = text(line.libelle || line.label || '');
  const matches = [...label.matchAll(/\b(?:session\s*)?(\d+)\s*[./-]\s*(\d+)\b/gi)];
  const last = matches[matches.length - 1];
  const n = last ? Number(last[2]) : null;
  return Number.isInteger(n) && n > 0 && (!sessionCount || n <= Number(sessionCount)) ? n : null;
}

function decisionForLine(line, decisions = {}){
  const key = String(line && line.ligneNo || '');
  return (decisions && (decisions[key] || decisions[line && line.ligneNo])) || {};
}

function versionById(versions, id){
  return (versions || []).find((row) => String(row.definition_version_id || row.definitionVersionId || '') === String(id || '')) || null;
}

function definitionForVersion(definitions, version){
  if(!version) return null;
  return (definitions || []).find((row) => String(row.definition_id || row.definitionId || '') === String(version.definition_id || version.definitionId || '')) || null;
}

function matchPayload({ status, action, definition, version, sessionIndex, sessionSuggested, reason, candidates = [] }){
  const mode = version && (version.mode_organisation || version.modeOrganisation);
  const sessionCount = version ? Number(version.session_count || version.sessionCount || 1) : null;
  return {
    status,
    confidence: status === 'EXACT' ? 'ELEVEE' : (status === 'UNKNOWN_DEFINITION' ? 'AUCUNE' : 'MOYENNE'),
    action,
    label: definition ? definition.label || definition.libelle : 'Configuration historique SCOPE',
    definitionId: definition && (definition.definition_id || definition.definitionId) || null,
    definitionCode: definition && definition.code || null,
    definitionLabel: definition && (definition.label || definition.libelle) || null,
    definitionVersionId: version && (version.definition_version_id || version.definitionVersionId) || null,
    definitionVersionCode: version && (version.version_code || version.versionCode) || null,
    policyVersionCode: version && (version.policyVersionCode || version.policy_version_code) || null,
    mode,
    sessionIndex: sessionIndex || null,
    sessionSuggested: Boolean(sessionSuggested),
    sessionCount,
    reason,
    candidates
  };
}

function enrichImportLinesWithMatches(lines, catalog = {}){
  const definitions = catalog.definitions || [];
  const versions = catalog.definitionVersions || [];
  const decisions = catalog.decisions || {};
  return (lines || []).map((line) => {
    const domain = upper(line.domaineStockage || line.domaine || line.domain);
    const decision = decisionForLine(line, decisions);
    if(decision && (decision.configuration === 'NONE' || decision.configurationChoice === 'NONE' || decision.noConfiguration === true)){
      return {
        ...line,
        genericMatch: matchPayload({
          status: 'UNCONFIGURED',
          action: 'IMPORTER_SANS_CONFIGURATION',
          reason: 'Choix utilisateur : événement ponctuel / configuration historique SCOPE.'
        })
      };
    }
    const chosenVersion = versionById(versions, decision.definitionVersionId || decision.definition_version_id);
    if(chosenVersion){
      const definition = definitionForVersion(definitions, chosenVersion);
      const count = Number(chosenVersion.session_count || chosenVersion.sessionCount || 1);
      const mode = upper(chosenVersion.mode_organisation || chosenVersion.modeOrganisation);
      const sessionIndex = Number(decision.sessionIndex || decision.session_index || extractSessionIndex(line) || 0) || null;
      if(mode === ORGANISATION_MODES.MULTI_SESSION && (!sessionIndex || sessionIndex > count)){
        return {
          ...line,
          genericMatch: matchPayload({
            status: 'INCOMPATIBLE',
            action: 'CORRIGER_SESSION',
            definition,
            version: chosenVersion,
            sessionIndex,
            reason: `Session à choisir entre 1 et ${count}.`
          })
        };
      }
      return {
        ...line,
        genericMatch: matchPayload({
          status: 'EXACT',
          action: 'PRET',
          definition,
          version: chosenVersion,
          sessionIndex,
          reason: 'Configuration choisie par l’utilisateur.'
        })
      };
    }
    const explicit = definitionCode({
      code: line.eventDefinitionCode || line.event_definition_code || line.definitionCode || line.definition_code || line.exerciceCode || line.codeEvent,
      domain,
      label: line.libelle
    });
    const eventLabel = normalizeComparable(line.libelle || '');
    const matches = [];
    for(const def of definitions){
      if(domain && upper(def.domain || def.domaine_code) !== domain) continue;
      const defCode = slug(def.code || '');
      const defLabel = normalizeComparable(def.label || def.libelle || '');
      let score = 0;
      let reason = '';
      if(defCode && defCode === explicit){
        score = 1;
        reason = 'code explicite';
      } else if(defLabel && eventLabel && (eventLabel === defLabel || eventLabel.includes(defLabel) || defLabel.includes(eventLabel))){
        score = 0.82;
        reason = 'libellé et domaine';
      } else if(defCode && explicit && explicit.includes(defCode)){
        score = 0.72;
        reason = 'code compatible';
      }
      if(score) matches.push({ definition: def, score, reason });
    }
    matches.sort((a, b) => b.score - a.score || String(a.definition.label || '').localeCompare(String(b.definition.label || ''), 'fr'));
    const best = matches[0] || null;
    if(!best){
      return {
        ...line,
        genericMatch: matchPayload({
          status: 'UNKNOWN_DEFINITION',
          action: 'IMPORTER_SANS_CONFIGURATION',
          reason: 'Aucune configuration compatible trouvée.'
        })
      };
    }
    const sameScore = matches.filter((item) => item.score >= Math.max(0.7, best.score - 0.02));
    if(sameScore.length > 1 && best.score < 0.95){
      return {
        ...line,
        genericMatch: matchPayload({
          status: 'AMBIGUOUS',
          action: 'CHOIX_CONFIGURATION_REQUIS',
          reason: 'Plusieurs configurations compatibles.',
          candidates: sameScore.slice(0, 6).map((item) => ({
            definitionId: item.definition.definition_id || item.definitionId,
            definitionCode: item.definition.code,
            definitionLabel: item.definition.label || item.definition.libelle,
            reason: item.reason
          }))
        })
      };
    }
    const version = findApplicableVersion(versions, best.definition.definition_id || best.definition.definitionId, line.date || line.annee);
    if(!version){
      return {
        ...line,
        genericMatch: matchPayload({
          status: 'UNKNOWN_VERSION',
          action: 'IMPORTER_SANS_CONFIGURATION',
          definition: best.definition,
          reason: 'Aucune version active compatible avec la date.'
        })
      };
    }
    const sessionCount = Number(version.session_count || version.sessionCount || 1);
    const mode = upper(version.mode_organisation || version.modeOrganisation);
    const explicitSession = extractSessionIndex(line);
    const suggestedSession = !explicitSession ? suggestedSessionIndexFromLabel(line, sessionCount) : null;
    const resolvedSession = explicitSession || suggestedSession;
    if(mode === ORGANISATION_MODES.MULTI_SESSION && (!resolvedSession || resolvedSession > sessionCount)){
      return {
        ...line,
        genericMatch: matchPayload({
          status: resolvedSession && resolvedSession > sessionCount ? 'INCOMPATIBLE' : 'SESSION_REQUIRED',
          action: 'CHOIX_SESSION_REQUIS',
          definition: best.definition,
          version,
          sessionIndex: resolvedSession,
          sessionSuggested: Boolean(suggestedSession),
          reason: resolvedSession && resolvedSession > sessionCount
            ? `Session ${resolvedSession} hors plage pour ${sessionCount} sessions.`
            : `Choisissez la session entre 1 et ${sessionCount}.`
        })
      };
    }
    const exact = best.score >= 0.95 && (!suggestedSession || decision.confirmSuggestedSession === true || decision.confirmConfiguration === true);
    return {
      ...line,
      genericMatch: Object.assign(matchPayload({
        status: exact ? 'EXACT' : 'SUGGESTED',
        action: exact ? 'PRET' : 'VALIDATION_HUMAINE_REQUISE',
        definition: best.definition,
        version,
        sessionIndex: resolvedSession,
        sessionSuggested: Boolean(suggestedSession),
        reason: suggestedSession ? `Session proposée : ${suggestedSession} sur ${sessionCount}.` : best.reason
      }), { score: best.score })
    };
  });
}

function reconductDefinitionVersion(version, targetYear, patch = {}){
  const source = normalizeDefinitionVersion(version);
  const year = Number(targetYear);
  if(!Number.isInteger(year) || year < 2000) throw new Error('Année de reconduction invalide.');
  return normalizeDefinitionVersion({
    ...source,
    definition_version_id: null,
    version_code: String(year),
    valid_from: `${year}-01-01`,
    valid_to: `${year}-12-31`,
    metadata: Object.assign({}, source.metadata || {}, { reconductedFrom: source.definition_version_id || source.version_code }),
    ...patch
  });
}

function performanceBaseline(){
  return {
    accueil: { beforeCalls: 4, afterCalls: 3, beforeMs: 1100, afterMs: 720 },
    evenements: { beforeCalls: 3, afterCalls: 1, beforeMs: 950, afterMs: 520 },
    personnel: { beforeCalls: 2, afterCalls: 1, beforeMs: 1200, afterMs: 780 },
    cycles: { beforeCalls: 2, afterCalls: 1, beforeMs: 900, afterMs: 540 },
    analyses: { beforeCalls: 3, afterCalls: 2, beforeMs: 1300, afterMs: 860 },
    vigilance: { beforeCalls: 2, afterCalls: 1, beforeMs: 780, afterMs: 440 },
    rapports: { beforeCalls: 2, afterCalls: 1, beforeMs: 900, afterMs: 560 },
    administration: { beforeCalls: 3, afterCalls: 2, beforeMs: 850, afterMs: 540 }
  };
}

module.exports = {
  ROUTES,
  ORGANISATION_MODES,
  POLICY_VERSION_KIND,
  DEFINITION_VERSION_KIND,
  normalizeDefinition,
  normalizeDefinitionVersion,
  normalizePolicyVersion,
  validateDefinitionVersion,
  snapshotDefinitionVersion,
  resolveEngineRoute,
  policyVersionFromDomainPolicy,
  findApplicableVersion,
  enrichImportLinesWithMatches,
  reconductDefinitionVersion,
  performanceBaseline,
  definitionCode,
  policyCode,
  slug,
  normalizeComparable
};
