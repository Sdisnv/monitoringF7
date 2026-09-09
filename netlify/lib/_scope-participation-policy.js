'use strict';

const POLICY_VERSION = 'sdis-nv-v1';

const STATUS_LIBRARY = Object.freeze({
  NON_RENSEIGNE: { id: 'NON_RENSEIGNE', label: 'Non renseigné', system: true, countsInDenominator: false, recognizedParticipation: false, order: 0 },
  PRESENT: { id: 'PRESENT', label: 'Présent', countsInDenominator: true, recognizedParticipation: true, order: 10 },
  ABSENT_EXCUSE: { id: 'ABSENT_EXCUSE', label: 'Excusé', countsInDenominator: true, recognizedParticipation: false, order: 20 },
  ABSENT_NON_EXCUSE: { id: 'ABSENT_NON_EXCUSE', label: 'Absent', countsInDenominator: true, recognizedParticipation: false, order: 30 },
  DISPENSE: { id: 'DISPENSE', label: 'Dispensé', countsInDenominator: false, recognizedParticipation: true, order: 40 },
  PERMUTATION: { id: 'PERMUTATION', label: 'Permutation', countsInDenominator: true, recognizedParticipation: true, order: 50 },
  NON_CONCERNE: { id: 'NON_CONCERNE', label: 'Non concerné', system: true, countsInDenominator: false, recognizedParticipation: false, order: 90 }
});

const MOTIF_LIBRARY = Object.freeze({
  PRIVE: { id: 'PRIVE', label: 'Privé', type: 'EXCUSE', active: true, order: 10, group: 'operationnel' },
  PROFESSIONNEL: { id: 'PROFESSIONNEL', label: 'Professionnel', type: 'EXCUSE', active: true, order: 20, group: 'operationnel' },
  ARMEE: { id: 'ARMEE', label: 'Armée', type: 'EXCUSE', active: true, order: 30, group: 'operationnel' },
  ACCIDENT_MALADIE: { id: 'ACCIDENT_MALADIE', label: 'Accident/maladie', type: 'EXCUSE', active: true, order: 40, group: 'operationnel' },
  ACTIVITE_SCOLAIRE: { id: 'ACTIVITE_SCOLAIRE', label: 'Activité scolaire', type: 'EXCUSE', active: true, order: 50, group: 'operationnel' },
  ACTIVITE_EXTRA_SCOLAIRE: { id: 'ACTIVITE_EXTRA_SCOLAIRE', label: 'Activité extra-scolaire', type: 'EXCUSE', active: true, order: 60, group: 'operationnel' },
  OUBLI: { id: 'OUBLI', label: 'Oubli', type: 'EXCUSE', active: true, order: 65, group: 'operationnel' },
  NON_JUSTIFIE: { id: 'NON_JUSTIFIE', label: 'Non-justifié', type: 'EXCUSE', active: true, order: 70, group: 'administratif' },
  MALADIE: { id: 'MALADIE', label: 'Maladie (historique)', type: 'EXCUSE', active: false, historical: true, order: 900, group: 'historique' },
  ACCIDENT: { id: 'ACCIDENT', label: 'Accident (historique)', type: 'EXCUSE', active: false, historical: true, order: 910, group: 'historique' },
  AUTRE: { id: 'AUTRE', label: 'Autre (historique)', type: 'EXCUSE', active: false, historical: true, order: 920, group: 'historique' },
  NON_PRECISE: { id: 'NON_PRECISE', label: 'Non précisé (historique)', type: 'EXCUSE', active: false, historical: true, order: 930, group: 'historique' },
  FORMATEUR_PR: { id: 'FORMATEUR_PR', label: 'Formateur PR', type: 'DISPENSE', active: true, order: 10, group: 'operationnel' },
  FORMATION_HORS_SDIS: { id: 'FORMATION_HORS_SDIS', label: 'Formation hors SDIS', type: 'DISPENSE', active: true, order: 20, group: 'operationnel' },
  JOKER: { id: 'JOKER', label: 'Joker', type: 'DISPENSE', active: true, order: 30, group: 'operationnel' },
  AUTO_RETRAIT: { id: 'AUTO_RETRAIT', label: 'Auto-retrait', type: 'DISPENSE', active: true, order: 40, group: 'administratif' },
  DEMISSION_EN_COURS: { id: 'DEMISSION_EN_COURS', label: 'Démission en cours', type: 'DISPENSE', active: true, order: 50, group: 'administratif' },
  NON_CONCERNE: { id: 'NON_CONCERNE', label: 'Non concerné', type: 'DISPENSE', active: true, order: 60, group: 'administratif' },
  PAS_CONCERNE: { id: 'PAS_CONCERNE', label: 'Non concerné', type: 'DISPENSE', active: false, historical: true, order: 900, group: 'administratif' }
});

const ROLE_LIBRARY = Object.freeze({
  PARTICIPANT: { id: 'PARTICIPANT', label: 'Participant', supervision: false, order: 10 },
  FORMATEUR: { id: 'FORMATEUR', label: 'Formateur', supervision: true, order: 20 },
  MONITEUR: { id: 'MONITEUR', label: 'Moniteur', supervision: true, order: 30 },
  SURVEILLANT: { id: 'SURVEILLANT', label: 'Surveillant', supervision: true, order: 40 },
  AUXILIAIRE: { id: 'AUXILIAIRE', label: 'Auxiliaire', supervision: true, order: 50 },
  RENFORT: { id: 'RENFORT', label: 'Renfort', supervision: false, exception: true, order: 80 },
  REMPLACANT: { id: 'REMPLACANT', label: 'Remplaçant', supervision: false, exception: true, order: 90 }
});

function statusRow(row){
  const id = String(row && (row.status_id || row.id) || '').trim().toUpperCase();
  const baseStatus = String(row && (row.base_status || row.baseStatus) || id || '').trim().toUpperCase();
  const base = STATUS_LIBRARY[id] || STATUS_LIBRARY[baseStatus] || {};
  return {
    id,
    label: row && (row.label || row.libelle) || base.label || id,
    system: row && row.system !== undefined ? Boolean(row.system) : Boolean(base.system),
    baseStatus: STATUS_LIBRARY[baseStatus] ? baseStatus : id,
    active: row && (row.actif === false || row.active === false) ? false : (base.active !== false),
    historical: row && (row.historique === true || row.historical === true) ? true : Boolean(base.historical),
    order: Number(row && (row.display_order || row.order) || base.order || 999),
    group: row && (row.group_code || row.group) || base.group || 'operationnel'
  };
}

function statusCatalog(rows){
  const byId = new Map(Object.values(STATUS_LIBRARY).map((row) => [row.id, statusRow(row)]));
  for(const row of rows || []){
    const mapped = statusRow(row);
    if(mapped.id) byId.set(mapped.id, mapped);
  }
  return [...byId.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'));
}

const DEFAULT_EXCUSE_MOTIFS = Object.freeze(['PRIVE', 'PROFESSIONNEL', 'ARMEE', 'ACCIDENT_MALADIE']);
const JSP_EXCUSE_MOTIFS = Object.freeze(['PRIVE', 'ACTIVITE_SCOLAIRE', 'ACTIVITE_EXTRA_SCOLAIRE', 'OUBLI', 'ACCIDENT_MALADIE', 'NON_JUSTIFIE']);
const DEFAULT_DISPENSE_MOTIFS = Object.freeze(['FORMATEUR_PR', 'FORMATION_HORS_SDIS', 'JOKER', 'AUTO_RETRAIT', 'DEMISSION_EN_COURS', 'NON_CONCERNE']);
const FOBA_DISPENSE_MOTIFS = Object.freeze([...DEFAULT_DISPENSE_MOTIFS, 'PAS_CONCERNE']);
const DEFAULT_STATUSES = Object.freeze(['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE']);
const JSP_STATUSES = Object.freeze(['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE']);
const DAP_STATUSES = Object.freeze(['NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION']);
const DEFAULT_ROLES = Object.freeze(['PARTICIPANT', 'FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE', 'RENFORT', 'REMPLACANT']);

function basePolicy(domaineCode, patch = {}){
  const behavior = {
    denominatorStatuses: ['PRESENT', 'PERMUTATION', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE'],
    recognizedParticipationStatuses: ['PRESENT', 'DISPENSE'],
    supervisionRoles: ['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE'],
    propagationScope: 'SESSION_ONLY',
    deduplicationScope: 'SESSION'
  };
  return Object.freeze({
    domainCode: domaineCode,
    policyVersion: POLICY_VERSION,
    activeStatuses: DEFAULT_STATUSES.slice(),
    excuseMotifs: DEFAULT_EXCUSE_MOTIFS.slice(),
    dispenseMotifs: DEFAULT_DISPENSE_MOTIFS.slice(),
    roles: DEFAULT_ROLES.slice(),
    ...patch,
    behavior: Object.assign(behavior, patch.behavior || {})
  });
}

const DEFAULT_DOMAIN_POLICIES = Object.freeze({
  DPS: basePolicy('DPS'),
  DAP: basePolicy('DAP', { activeStatuses: DAP_STATUSES.slice() }),
  JSP: basePolicy('JSP', {
    activeStatuses: JSP_STATUSES.slice(),
    excuseMotifs: JSP_EXCUSE_MOTIFS.slice(),
    dispenseMotifs: [],
    behavior: { supervisionRoles: ['MONITEUR'], propagationScope: 'SESSION_ONLY', deduplicationScope: 'SESSION' }
  }),
  FOBA: basePolicy('FOBA', {
    dispenseMotifs: FOBA_DISPENSE_MOTIFS.slice(),
    behavior: { propagationScope: 'SESSION_ONLY', deduplicationScope: 'SESSION' }
  }),
  FOCA: basePolicy('FOCA'),
  FOSPEC: basePolicy('FOSPEC'),
  PR: basePolicy('PR', { behavior: { propagationScope: 'ALL_EXERCISE_SESSIONS', deduplicationScope: 'EXERCISE' } }),
  AUTO: basePolicy('AUTO', { behavior: { propagationScope: 'ALL_EXERCISE_SESSIONS', deduplicationScope: 'EXERCISE' } })
});

function normalizeDomain(value){
  const code = String(value || '').trim().toUpperCase();
  return code === 'PAPR' ? 'PR' : code;
}

function listFrom(value){
  return Array.isArray(value) ? value.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean) : [];
}

function motifRow(row){
  const id = String(row && (row.motif_id || row.id) || '').trim().toUpperCase();
  const base = MOTIF_LIBRARY[id] || {};
  return {
    id,
    label: row && (row.label || row.libelle) || base.label || id,
    type: String(row && (row.motif_type || row.type) || base.type || 'EXCUSE').toUpperCase(),
    active: row && (row.actif === false || row.active === false) ? false : (base.active !== false),
    historical: row && (row.historique === true || row.historical === true) ? true : Boolean(base.historical),
    order: Number(row && (row.display_order || row.order) || base.order || 999),
    group: row && (row.group_code || row.group) || base.group || 'operationnel'
  };
}

function motifCatalog(rows){
  const byId = new Map(Object.values(MOTIF_LIBRARY).map((row) => [row.id, motifRow(row)]));
  for(const row of rows || []){
    const mapped = motifRow(row);
    if(mapped.id) byId.set(mapped.id, mapped);
  }
  return [...byId.values()].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'));
}

function mergePolicyRow(base, row){
  if(!row) return base;
  const config = row.config || row.policy || {};
  const next = {
    ...base,
    policyVersion: row.policy_version || row.policyVersion || config.policyVersion || base.policyVersion,
    activeStatuses: listFrom(config.activeStatuses || config.active_statuses || base.activeStatuses),
    excuseMotifs: listFrom(config.excuseMotifs || config.excuse_motifs || base.excuseMotifs),
    dispenseMotifs: listFrom(config.dispenseMotifs || config.dispense_motifs || base.dispenseMotifs),
    roles: listFrom(config.roles || base.roles),
    behavior: Object.assign({}, base.behavior, config.behavior || {})
  };
  return next;
}

function sanitizePolicy(policy, motifs){
  const motifIds = new Set((motifs || motifCatalog()).map((m) => m.id));
  const statuses = new Set(Object.keys(STATUS_LIBRARY));
  const roles = new Set(Object.keys(ROLE_LIBRARY));
  const keep = (values, set) => values.filter((value, index, source) => set.has(value) && source.indexOf(value) === index);
  return {
    domainCode: normalizeDomain(policy.domainCode),
    policyVersion: policy.policyVersion || POLICY_VERSION,
    activeStatuses: keep(listFrom(policy.activeStatuses), statuses),
    excuseMotifs: keep(listFrom(policy.excuseMotifs), motifIds),
    dispenseMotifs: keep(listFrom(policy.dispenseMotifs), motifIds),
    roles: keep(listFrom(policy.roles), roles),
    behavior: {
      denominatorStatuses: keep(listFrom(policy.behavior && policy.behavior.denominatorStatuses), statuses),
      recognizedParticipationStatuses: keep(listFrom(policy.behavior && policy.behavior.recognizedParticipationStatuses), statuses),
      supervisionRoles: keep(listFrom(policy.behavior && policy.behavior.supervisionRoles), roles),
      propagationScope: ['SESSION_ONLY', 'ALL_EXERCISE_SESSIONS'].includes(String(policy.behavior && policy.behavior.propagationScope)) ? policy.behavior.propagationScope : 'SESSION_ONLY',
      deduplicationScope: ['SESSION', 'EXERCISE'].includes(String(policy.behavior && policy.behavior.deduplicationScope)) ? policy.behavior.deduplicationScope : 'SESSION'
    }
  };
}

function resolveParticipationPolicy(domaineCode, options = {}){
  const domainCode = normalizeDomain(domaineCode);
  const base = DEFAULT_DOMAIN_POLICIES[domainCode] || basePolicy(domainCode || 'DPS');
  const snapshot = options.snapshot && options.snapshot.domainCode ? options.snapshot : null;
  const merged = snapshot || mergePolicyRow(base, (options.policyRows || []).find((row) => normalizeDomain(row.domain_code || row.domainCode) === domainCode));
  const motifs = motifCatalog(options.motifRows);
  return Object.freeze(sanitizePolicy(Object.assign({}, merged, { domainCode }), motifs));
}

function policySnapshot(domaineCode, options = {}){
  const policy = resolveParticipationPolicy(domaineCode, options);
  return JSON.parse(JSON.stringify({
    kind: 'SCOPE_PARTICIPATION_POLICY',
    capturedAt: options.capturedAt || new Date().toISOString(),
    ...policy
  }));
}

function motifsForPolicy(policy, type, options = {}){
  const motifs = motifCatalog(options.motifRows);
  const ids = String(type || '').toUpperCase() === 'DISPENSE' ? policy.dispenseMotifs : policy.excuseMotifs;
  return ids.map((id) => motifs.find((m) => m.id === id)).filter(Boolean);
}

function listDefaultPolicies(){
  return Object.keys(DEFAULT_DOMAIN_POLICIES).sort().map((code) => resolveParticipationPolicy(code));
}

module.exports = {
  POLICY_VERSION,
  STATUS_LIBRARY,
  MOTIF_LIBRARY,
  ROLE_LIBRARY,
  DEFAULT_DOMAIN_POLICIES,
  normalizeDomain,
  statusCatalog,
  motifCatalog,
  resolveParticipationPolicy,
  policySnapshot,
  motifsForPolicy,
  listDefaultPolicies
};
