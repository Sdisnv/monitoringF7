'use strict';

const { createHash } = require('crypto');
const canonical = require('./_scope-canonical-foundations');

const ENGINE_VERSION = 'C2-B-1';
const RESOLUTION_STATES = Object.freeze(['COMPLETE', 'INCOMPLETE', 'UNRESOLVED', 'AMBIGUOUS']);
const LIMITS = Object.freeze({ maxDepth: 8, maxNodes: 64, maxCodesPerPredicate: 32, maxJsonBytes: 16384 });
const OPERATORS = new Set(['ALL', 'ANY', 'NOT']);
const PREDICATES = new Set([
  'PERSON_ELIGIBLE_AT', 'HAS_DOMAIN_ASSIGNMENT', 'HAS_OI',
  'HAS_COMPETENCE', 'HAS_FOBA_LEVEL', 'HAS_JSP_ROLE'
]);
const OI_CODES = new Set(canonical.ORGANISATIONAL_UNITS.map((row) => row.code));
const COMPETENCE_CODES = new Set(canonical.COMPETENCE_DEFINITIONS.map((row) => row.code));
const FOBA_CODES = new Set(canonical.FOBA_LEVELS.map((row) => row.code));
const DOMAIN_CODES = new Set(canonical.CANONICAL_DOMAIN_CODES);
const JSP_ROLES = new Set(['JEUNE', 'MONITEUR']);

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

function upper(value){
  return String(value || '').trim().toUpperCase();
}

function normalizedCodes(values){
  return [...new Set((values || []).map(upper))].sort();
}

function validationError(path, message){
  const error = new Error(`${path}: ${message}`);
  error.code = 'SCOPE_PUBLIC_RULE_INVALID';
  return error;
}

function normalizePublicRule(expression){
  let nodeCount = 0;
  const bytes = Buffer.byteLength(JSON.stringify(expression === undefined ? null : expression));
  if(bytes > LIMITS.maxJsonBytes) throw validationError('$', `expression exceeds ${LIMITS.maxJsonBytes} bytes`);

  function visit(node, path, depth){
    nodeCount += 1;
    if(nodeCount > LIMITS.maxNodes) throw validationError(path, `expression exceeds ${LIMITS.maxNodes} nodes`);
    if(depth > LIMITS.maxDepth) throw validationError(path, `expression exceeds depth ${LIMITS.maxDepth}`);
    if(!node || Array.isArray(node) || typeof node !== 'object') throw validationError(path, 'node must be an object');
    const keys = Object.keys(node);
    if(node.op !== undefined){
      const op = upper(node.op);
      if(!OPERATORS.has(op)) throw validationError(`${path}.op`, `unknown operator ${op || '<empty>'}`);
      for(const key of keys) if(!['op', 'children'].includes(key)) throw validationError(`${path}.${key}`, 'unknown field');
      if(!Array.isArray(node.children)) throw validationError(`${path}.children`, 'must be an array');
      if(op === 'NOT' && node.children.length !== 1) throw validationError(`${path}.children`, 'NOT requires exactly one child');
      if(op !== 'NOT' && node.children.length === 0) throw validationError(`${path}.children`, `${op} requires at least one child`);
      const children = node.children.map((child, index) => visit(child, `${path}.children[${index}]`, depth + 1));
      if(op !== 'NOT') children.sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
      return { op, children };
    }
    if(node.predicate === undefined) throw validationError(path, 'node requires op or predicate');
    const predicate = upper(node.predicate);
    if(!PREDICATES.has(predicate)) throw validationError(`${path}.predicate`, `unknown predicate ${predicate || '<empty>'}`);
    const specs = {
      PERSON_ELIGIBLE_AT: { fields: [], arrays: [] },
      HAS_DOMAIN_ASSIGNMENT: { fields: ['domainCodes'], arrays: [['domainCodes', DOMAIN_CODES]] },
      HAS_OI: { fields: ['domainCode', 'oiCodes'], arrays: [['oiCodes', OI_CODES]], scalar: ['domainCode', DOMAIN_CODES] },
      HAS_COMPETENCE: { fields: ['competenceCodes'], arrays: [['competenceCodes', COMPETENCE_CODES]] },
      HAS_FOBA_LEVEL: { fields: ['levelCodes'], arrays: [['levelCodes', FOBA_CODES]] },
      HAS_JSP_ROLE: { fields: ['roles', 'oiCodes'], arrays: [['roles', JSP_ROLES], ['oiCodes', OI_CODES]] }
    };
    const spec = specs[predicate];
    for(const key of keys) if(key !== 'predicate' && !spec.fields.includes(key)) throw validationError(`${path}.${key}`, 'unknown field');
    const result = { predicate };
    for(const [field, catalog] of spec.arrays){
      if(!Array.isArray(node[field]) || node[field].length === 0) throw validationError(`${path}.${field}`, 'must be a non-empty array');
      if(node[field].length > LIMITS.maxCodesPerPredicate) throw validationError(`${path}.${field}`, 'contains too many codes');
      result[field] = normalizedCodes(node[field]);
      for(const code of result[field]) if(!catalog.has(code)) throw validationError(`${path}.${field}`, `noncanonical code ${code}`);
    }
    if(spec.scalar){
      const [field, catalog] = spec.scalar;
      result[field] = upper(node[field]);
      if(!catalog.has(result[field])) throw validationError(`${path}.${field}`, `noncanonical code ${result[field]}`);
    }
    if(predicate === 'HAS_OI'){
      const allowed = canonical.DOMAIN_ORGANISATIONAL_UNITS[result.domainCode] || [];
      for(const code of result.oiCodes){
        if(!allowed.includes(code)) throw validationError(`${path}.oiCodes`, `${code} is not canonical for ${result.domainCode}`);
      }
    }
    if(predicate === 'HAS_JSP_ROLE'){
      const allowed = canonical.DOMAIN_ORGANISATIONAL_UNITS.JSP || [];
      for(const code of result.oiCodes){
        if(!allowed.includes(code)) throw validationError(`${path}.oiCodes`, `${code} is not canonical for JSP`);
      }
    }
    return result;
  }
  return visit(expression, '$', 1);
}

function validatePublicRule(expression){
  try{
    const normalized = normalizePublicRule(expression);
    return { valid: true, normalized, errors: [] };
  }catch(error){
    return { valid: false, normalized: null, errors: [{ code: error.code || 'SCOPE_PUBLIC_RULE_INVALID', message: error.message }] };
  }
}

function fingerprintPublicRule(expression){
  return sha256(stableStringify(normalizePublicRule(expression)));
}

function dateOnly(value, field){
  const text = String(value || '').slice(0, 10);
  const parsed = new Date(`${text}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text){
    throw validationError(field, 'must be an ISO date');
  }
  return text;
}

function inRange(date, from, to){
  return (!from || String(from).slice(0, 10) <= date) && (!to || String(to).slice(0, 10) >= date);
}

function normalizedFactDate(value){
  if(value == null || value === '') return null;
  const text = String(value).slice(0, 10);
  const parsed = new Date(`${text}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) return null;
  return text;
}

function personId(row){
  return String(row && (row.personneId || row.personne_id || row.id) || '');
}

function factId(row, fallback){
  return String(row && (row.id || row.assignmentId || row.assignment_id || row.affectation_id || row.personCompetenceId || row.person_competence_id || row.roleId || row.levelId) || fallback);
}

function factDates(row){
  return {
    from: row && (row.validFrom || row.valid_from || row.date_debut || row.date_actif),
    to: row && (row.validTo || row.valid_to || row.date_fin || row.date_inactif)
  };
}

function currentFacts(rows, id, date, options = {}){
  return (rows || []).filter((row) => {
    const dates = factDates(row);
    const from = normalizedFactDate(dates.from);
    const to = normalizedFactDate(dates.to);
    const requireStart = typeof options.requireStart === 'function' ? options.requireStart(row) : options.requireStart;
    if(requireStart && !from) return false;
    if(dates.from && !from) return false;
    if(dates.to && !to) return false;
    return personId(row) === id && inRange(date, from, to);
  });
}

function personEligible(person, periods, date){
  const id = personId(person);
  const activePeriods = currentFacts(periods, id, date, { requireStart: true });
  const kinds = activePeriods.map((row) => upper(row.type || row.statut || row.status));
  if(kinds.includes('INDISPONIBLE')) return { matched: false, evidence: activePeriods };
  if(kinds.some((value) => ['ACTIF', 'ACTIVE'].includes(value))) return { matched: true, evidence: activePeriods };
  if(kinds.some((value) => ['SORTI', 'DEMISSIONNAIRE', 'INACTIF'].includes(value))) return { matched: false, evidence: activePeriods };
  const from = person.dateEntree || person.date_entree || person.validFrom || person.valid_from;
  const to = person.dateSortie || person.date_sortie || person.validTo || person.valid_to;
  const active = person.actif === undefined ? person.active !== false : person.actif !== false;
  return { matched: active && inRange(date, from, to), evidence: [] };
}

function requiredInputs(expression){
  const required = new Set();
  (function walk(node){
    if(node.predicate === 'HAS_DOMAIN_ASSIGNMENT' || node.predicate === 'HAS_OI') required.add('assignments');
    if(node.predicate === 'PERSON_ELIGIBLE_AT') required.add('periods');
    if(node.predicate === 'HAS_COMPETENCE') required.add('competencies');
    if(node.predicate === 'HAS_FOBA_LEVEL') required.add('fobaLevels');
    if(node.predicate === 'HAS_JSP_ROLE') required.add('jspRoles');
    for(const child of node.children || []) walk(child);
  })(expression);
  return [...required].sort();
}

function evaluatePredicate(node, person, context, path){
  const id = personId(person);
  let matched = false;
  let evidence = [];
  if(node.predicate === 'PERSON_ELIGIBLE_AT'){
    const result = personEligible(person, context.periods, context.date);
    matched = result.matched;
    evidence = result.evidence;
  }else if(node.predicate === 'HAS_DOMAIN_ASSIGNMENT'){
    evidence = currentFacts(context.assignments, id, context.date, { requireStart: true }).filter((row) => node.domainCodes.includes(upper(row.domainCode || row.domaine_code || row.domaine)));
    matched = evidence.length > 0;
  }else if(node.predicate === 'HAS_OI'){
    evidence = currentFacts(context.assignments, id, context.date, { requireStart: true }).filter((row) =>
      upper(row.domainCode || row.domaine_code || row.domaine) === node.domainCode &&
      node.oiCodes.includes(upper(row.oiCode || row.oi_code || row.targetCode || row.niveau_code))
    );
    matched = evidence.length > 0;
  }else if(node.predicate === 'HAS_COMPETENCE'){
    evidence = currentFacts(context.competencies, id, context.date, {
      requireStart: (row) => row.temporalSource === 'LEGACY_ASSIGNMENT'
    }).filter((row) => node.competenceCodes.includes(upper(row.competenceCode || row.competence_code)));
    matched = evidence.length > 0;
  }else if(node.predicate === 'HAS_FOBA_LEVEL'){
    evidence = currentFacts(context.fobaLevels, id, context.date, {
      requireStart: (row) => row.temporalSource === 'LEGACY_ASSIGNMENT'
    }).filter((row) => node.levelCodes.includes(upper(row.levelCode || row.level_code || row.niveau_code)));
    matched = evidence.length > 0;
  }else if(node.predicate === 'HAS_JSP_ROLE'){
    evidence = currentFacts(context.jspRoles, id, context.date).filter((row) =>
      node.roles.includes(upper(row.role)) && node.oiCodes.includes(upper(row.oiCode || row.oi_code))
    );
    matched = evidence.length > 0;
  }
  return {
    path, kind: 'PREDICATE', predicate: node.predicate, matched,
    evidence: evidence.map((row, index) => ({
      id: factId(row, `${node.predicate}-${index + 1}`),
      domainCode: upper(row.domainCode || row.domaine_code || row.domaine) || null,
      oiCode: upper(row.oiCode || row.oi_code || row.targetCode || row.niveau_code) || null,
      competenceCode: upper(row.competenceCode || row.competence_code) || null,
      legacyCode: upper(row.legacyCode || row.legacy_code) || null,
      legacyContext: upper(row.legacyContext || row.legacy_context) || null,
      levelCode: upper(row.levelCode || row.level_code || row.niveau_code) || null,
      role: upper(row.role) || null,
      from: factDates(row).from || null, to: factDates(row).to || null
    }))
  };
}

function evaluateNode(node, person, context, path = '$'){
  if(node.predicate) return evaluatePredicate(node, person, context, path);
  const children = node.children.map((child, index) => evaluateNode(child, person, context, `${path}.children[${index}]`));
  const matched = node.op === 'ALL' ? children.every((child) => child.matched)
    : node.op === 'ANY' ? children.some((child) => child.matched) : !children[0].matched;
  return { path, kind: 'OPERATOR', op: node.op, matched, children };
}

function incompleteResult(ruleFingerprint, date, state, warnings){
  const result = { complete: false, resolutionStatus: state, personIds: [], traces: [], tracesByPerson: {}, warnings, ruleFingerprint };
  result.resultFingerprint = sha256(stableStringify({ date, personIds: [], resolutionStatus: state, ruleFingerprint }));
  return result;
}

function evaluatePublicRule(input){
  const args = input || {};
  const date = dateOnly(args.evaluationDate, 'evaluationDate');
  const version = args.ruleVersion || {};
  const expression = normalizePublicRule(version.expression);
  const ruleFingerprint = fingerprintPublicRule(expression);
  if(version.fingerprint && version.fingerprint !== ruleFingerprint) throw validationError('ruleVersion.fingerprint', 'does not match normalized expression');
  const resolutionStatus = upper(version.resolutionStatus || 'COMPLETE');
  if(!RESOLUTION_STATES.includes(resolutionStatus)) throw validationError('ruleVersion.resolutionStatus', 'unknown state');
  if(resolutionStatus !== 'COMPLETE') return incompleteResult(ruleFingerprint, date, resolutionStatus, [`RULE_${resolutionStatus}`]);
  const mappingStatus = upper(args.canonicalMappings && args.canonicalMappings.resolutionStatus || 'COMPLETE');
  if(!RESOLUTION_STATES.includes(mappingStatus)) throw validationError('canonicalMappings.resolutionStatus', 'unknown state');
  if(mappingStatus !== 'COMPLETE'){
    return incompleteResult(ruleFingerprint, date, mappingStatus, [
      `CANONICAL_MAPPINGS_${mappingStatus}`,
      ...((args.canonicalMappings && args.canonicalMappings.warnings) || [])
    ]);
  }
  if(!inRange(date, version.validFrom || version.valid_from, version.validTo || version.valid_to)){
    return incompleteResult(ruleFingerprint, date, 'INCOMPLETE', ['RULE_VERSION_OUTSIDE_VALIDITY']);
  }
  if(!Array.isArray(args.persons)) return incompleteResult(ruleFingerprint, date, 'INCOMPLETE', ['MISSING_INPUT_PERSONS']);
  const missing = requiredInputs(expression).filter((name) => !Array.isArray(args[name]));
  if(missing.length) return incompleteResult(ruleFingerprint, date, 'INCOMPLETE', missing.map((name) => `MISSING_INPUT_${name.toUpperCase()}`));
  const context = {
    date, periods: Array.isArray(args.periods) ? args.periods : [], assignments: args.assignments || [],
    competencies: args.competencies || [], fobaLevels: args.fobaLevels || [], jspRoles: args.jspRoles || []
  };
  const uniquePersons = new Map();
  for(const person of args.persons){
    const id = personId(person);
    if(id && !uniquePersons.has(id)) uniquePersons.set(id, person);
  }
  const traces = [];
  for(const [id, person] of [...uniquePersons.entries()].sort(([left], [right]) => left.localeCompare(right))){
    const trace = evaluateNode(expression, person, context);
    if(trace.matched) traces.push({
      personId: id, nip: person.nip || null, matched: true, evaluationDate: date,
      publicDefinitionId: version.publicDefinitionId || version.public_definition_id || null,
      ruleVersionId: version.publicRuleVersionId || version.public_rule_version_id || version.versionCode || version.version_code || null,
      trace
    });
  }
  const personIds = traces.map((row) => row.personId);
  const warnings = [];
  const tracesByPerson = Object.fromEntries(traces.map((row) => [row.personId, row]));
  const result = { complete: true, resolutionStatus: 'COMPLETE', personIds, traces, tracesByPerson, warnings, ruleFingerprint };
  result.resultFingerprint = sha256(stableStringify({ date, personIds, resolutionStatus: result.resolutionStatus, ruleFingerprint }));
  return result;
}

function explainPersonExclusion(input){
  const args = input || {};
  const id = String(args.personId || '');
  const person = (args.persons || []).find((row) => personId(row) === id);
  const evaluated = evaluatePublicRule({ ...args, persons: person ? [person] : [] });
  if(!evaluated.complete){
    const reason = evaluated.resolutionStatus === 'UNRESOLVED' ? 'UNRESOLVED'
      : evaluated.resolutionStatus === 'AMBIGUOUS' ? 'AMBIGUOUS'
        : evaluated.warnings.includes('RULE_VERSION_OUTSIDE_VALIDITY') ? 'RULE_VERSION_NOT_APPLICABLE' : 'INPUT_INCOMPLETE';
    return {
      personId: id, found: true, matched: false, complete: false,
      resolutionStatus: evaluated.resolutionStatus, reason, warnings: evaluated.warnings
    };
  }
  if(!person) return { personId: id, found: false, matched: false, complete: true, warning: 'PERSON_NOT_FOUND' };
  if(evaluated.tracesByPerson[id]) return { ...evaluated.tracesByPerson[id], found: true, complete: true };
  const date = dateOnly(args.evaluationDate, 'evaluationDate');
  const expression = normalizePublicRule((args.ruleVersion || {}).expression);
  const trace = evaluateNode(expression, person, {
    date, periods: args.periods || [], assignments: args.assignments || [], competencies: args.competencies || [],
    fobaLevels: args.fobaLevels || [], jspRoles: args.jspRoles || []
  });
  return { personId: id, found: true, matched: trace.matched, complete: true, evaluationDate: date, trace };
}

function compareLegacyAndCanonical(legacyResult, canonicalResult){
  const legacy = [...new Set((legacyResult && legacyResult.personIds || []).map(String))].sort();
  const canonicalIds = [...new Set((canonicalResult && canonicalResult.personIds || []).map(String))].sort();
  const legacySet = new Set(legacy);
  const canonicalSet = new Set(canonicalIds);
  const legacyOnly = legacy.filter((id) => !canonicalSet.has(id));
  const canonicalOnly = canonicalIds.filter((id) => !legacySet.has(id));
  const states = [legacyResult && legacyResult.resolutionStatus, canonicalResult && canonicalResult.resolutionStatus].map((value) => upper(value || 'COMPLETE'));
  const resolutionStatus = ['AMBIGUOUS', 'UNRESOLVED', 'INCOMPLETE'].find((state) => states.includes(state)) || 'COMPLETE';
  const canonicalTraces = canonicalResult && canonicalResult.tracesByPerson || {};
  const warnings = [...new Set([
    ...((legacyResult && legacyResult.warnings) || []), ...((canonicalResult && canonicalResult.warnings) || [])
  ])];
  const differences = [
    ...legacyOnly.map((id) => ({
      personneId: id, personId: id, legacyIncluded: true, canonicalIncluded: false,
      canonicalTrace: canonicalTraces[id] || null,
      probableCause: resolutionStatus === 'COMPLETE' ? 'CANONICAL_RULE_EXCLUDED' : `CANONICAL_${resolutionStatus}`,
      resolutionStatus
    })),
    ...canonicalOnly.map((id) => ({
      personneId: id, personId: id, legacyIncluded: false, canonicalIncluded: true,
      canonicalTrace: canonicalTraces[id] || null, probableCause: 'LEGACY_RULE_EXCLUDED', resolutionStatus
    }))
  ];
  return {
    complete: Boolean((legacyResult && legacyResult.complete) !== false && (canonicalResult && canonicalResult.complete) !== false && resolutionStatus === 'COMPLETE'),
    resolutionStatus, legacyPersonIds: legacy, canonicalPersonIds: canonicalIds,
    intersection: legacy.filter((id) => canonicalSet.has(id)), legacyOnly, canonicalOnly, warnings, differences,
    commonPersonIds: legacy.filter((id) => canonicalSet.has(id)), legacyOnlyPersonIds: legacyOnly, canonicalOnlyPersonIds: canonicalOnly
  };
}

function validateRuleVersionSet(versions){
  const errors = [];
  const active = (versions || []).filter((row) => upper(row.status) === 'ACTIVE');
  for(let index = 0; index < active.length; index += 1){
    for(let other = index + 1; other < active.length; other += 1){
      const left = active[index];
      const right = active[other];
      const definitionLeft = left.publicDefinitionId || left.public_definition_id;
      const definitionRight = right.publicDefinitionId || right.public_definition_id;
      if(definitionLeft !== definitionRight) continue;
      const leftFrom = left.validFrom || left.valid_from || '0001-01-01';
      const leftTo = left.validTo || left.valid_to || '9999-12-31';
      const rightFrom = right.validFrom || right.valid_from || '0001-01-01';
      const rightTo = right.validTo || right.valid_to || '9999-12-31';
      if(leftFrom <= rightTo && rightFrom <= leftTo) errors.push({ code: 'ACTIVE_VERSION_OVERLAP', definitionId: definitionLeft });
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateRuleStatusTransition(from, to){
  const previous = upper(from);
  const next = upper(to);
  const allowed = {
    DRAFT: ['DRAFT', 'ACTIVE'],
    ACTIVE: ['ACTIVE', 'RETIRED'],
    RETIRED: ['RETIRED']
  };
  return Boolean(allowed[previous] && allowed[previous].includes(next));
}

module.exports = {
  ENGINE_VERSION, RESOLUTION_STATES, LIMITS, normalizePublicRule, validatePublicRule,
  fingerprintPublicRule, evaluatePublicRule, explainPersonExclusion,
  compareLegacyAndCanonical, validateRuleVersionSet, validateRuleStatusTransition, stableStringify
};
