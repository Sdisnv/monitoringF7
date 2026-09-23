'use strict';

const crypto = require('node:crypto');

const ACTIVITY_TYPES = Object.freeze(['EXERCISE','TRAINING','TEST','CURRICULUM','INSTRUCTION','OTHER']);
const PERIODICITY_TYPES = Object.freeze(['ANNUAL','TIMES_PER_YEAR','EVERY_N_MONTHS','EVERY_N_YEARS','ONE_OFF','CURRICULUM','ON_DEMAND']);
const PUBLIC_OPERATORS = Object.freeze(['UNION','INTERSECTION','EXCLUSION']);
const QUALIFICATION_BINDING_TYPES = Object.freeze(['PREREQUISITE','TAUGHT','RENEWED']);
const CONSTRAINT_SEVERITIES = Object.freeze(['HARD','SOFT','INFORMATIVE']);
const CONSTRAINT_TYPES = Object.freeze(['DATE_WINDOW','MONTH','WEEKDAY','TIME_WINDOW','DURATION','SESSION_SPACING','SESSION_ORDER','CAPACITY','INCOMPATIBILITY','RESOURCE_AVAILABILITY']);
const CONTRIBUTION_MODES = Object.freeze(['FULL_DURATION','FIXED_MINUTES','PERCENTAGE','MANUAL']);

function text(value){ return String(value == null ? '' : value).trim(); }
function upper(value){ return text(value).toUpperCase(); }
function integer(value){
  if(value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
function dateOnly(value){ return value ? String(value).slice(0, 10) : null; }
function idOf(row, ...keys){ for(const key of keys){ if(row && row[key] != null) return String(row[key]); } return ''; }
function strictDate(value){
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value ? null : value;
}
function strictTime(value){
  if(typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [hours,minutes,seconds = '0'] = value.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function canonicalize(value){
  if(Array.isArray(value)) return value.map(canonicalize);
  if(value && typeof value === 'object'){
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key,canonicalize(value[key])]));
  }
  return value;
}

function canonicalJson(value){ return JSON.stringify(canonicalize(value)); }
function fingerprint(value){ return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex'); }
function deterministicUuid(namespace, ...parts){
  const hex = crypto.createHash('sha256').update([namespace,...parts].join('|')).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0,8).join('')}-${hex.slice(8,12).join('')}-${hex.slice(12,16).join('')}-${hex.slice(16,20).join('')}-${hex.slice(20).join('')}`;
}

function validatePeriodicity(input = {}){
  const type = upper(input.type || input.periodicityType || input.periodicity_type);
  const intervalValue = integer(input.intervalValue ?? input.interval_value);
  const occurrences = integer(input.occurrencesPerCycle ?? input.occurrences_per_cycle);
  const errors = [];
  if(!PERIODICITY_TYPES.includes(type)) errors.push({ code: 'UNKNOWN_PERIODICITY_TYPE',type });
  if(['EVERY_N_MONTHS','EVERY_N_YEARS'].includes(type) && !(intervalValue > 0)) errors.push({ code: 'INTERVAL_VALUE_REQUIRED',type });
  if(!['EVERY_N_MONTHS','EVERY_N_YEARS'].includes(type) && intervalValue != null) errors.push({ code: 'INTERVAL_VALUE_FORBIDDEN',type });
  if(type === 'TIMES_PER_YEAR' && !(occurrences > 0)) errors.push({ code: 'OCCURRENCES_PER_CYCLE_REQUIRED',type });
  if(type !== 'TIMES_PER_YEAR' && occurrences != null && occurrences < 1) errors.push({ code: 'INVALID_OCCURRENCES_PER_CYCLE',type });
  const anchorDate = dateOnly(input.anchorDate || input.anchor_date);
  const anchorYear = integer(input.anchorYear ?? input.anchor_year);
  const toleranceBeforeDays = integer(input.toleranceBeforeDays ?? input.tolerance_before_days ?? 0);
  const toleranceAfterDays = integer(input.toleranceAfterDays ?? input.tolerance_after_days ?? 0);
  if(type === 'ONE_OFF' && !anchorDate && !anchorYear) errors.push({ code: 'ONE_OFF_ANCHOR_REQUIRED' });
  for(const value of [input.toleranceBeforeDays ?? input.tolerance_before_days,input.toleranceAfterDays ?? input.tolerance_after_days]){
    if(value != null && !(integer(value) >= 0)) errors.push({ code: 'INVALID_TOLERANCE' });
  }
  return { valid: errors.length === 0,errors,value: { type,intervalValue,occurrencesPerCycle: occurrences,anchorDate,anchorYear,toleranceBeforeDays,toleranceAfterDays } };
}

function validateSessionTemplates(rows = []){
  const errors = [];
  const normalized = rows.map((row) => ({
    sessionTemplateId: idOf(row,'sessionTemplateId','session_template_id','id'),
    code: upper(row.code),sequence: integer(row.sequence),label: text(row.label),mandatory: row.mandatory !== false,
    durationMinutes: integer(row.durationMinutes ?? row.duration_minutes),
    minOffsetMinutes: integer(row.minOffsetMinutes ?? row.min_offset_minutes),
    maxOffsetMinutes: integer(row.maxOffsetMinutes ?? row.max_offset_minutes),
    dependsOnSessionTemplateId: idOf(row,'dependsOnSessionTemplateId','depends_on_session_template_id') || null,
    publicContinuity: upper(row.publicContinuity || row.public_continuity || 'INHERIT'),
    locationContinuity: upper(row.locationContinuity || row.location_continuity || 'INHERIT'),metadata: row.metadata || {}
  }));
  if(!normalized.length) errors.push({ code: 'SESSION_TEMPLATE_REQUIRED' });
  const codes = new Set();
  const sequences = new Set();
  const ids = new Set(normalized.map((row) => row.sessionTemplateId).filter(Boolean));
  const byId = new Map(normalized.map((row) => [row.sessionTemplateId,row]));
  for(const row of normalized){
    if(!row.code || codes.has(row.code)) errors.push({ code: 'INVALID_OR_DUPLICATE_SESSION_CODE',sessionCode: row.code });
    if(!(row.sequence > 0) || sequences.has(row.sequence)) errors.push({ code: 'INVALID_OR_DUPLICATE_SESSION_SEQUENCE',sequence: row.sequence });
    if(!row.label || !(row.durationMinutes > 0)) errors.push({ code: 'INVALID_SESSION_TEMPLATE',sessionCode: row.code });
    if(row.minOffsetMinutes != null && row.minOffsetMinutes < 0 || row.maxOffsetMinutes != null && row.maxOffsetMinutes < 0
      || row.minOffsetMinutes != null && row.maxOffsetMinutes != null && row.minOffsetMinutes > row.maxOffsetMinutes) errors.push({ code: 'INVALID_SESSION_OFFSET',sessionCode: row.code });
    if(row.dependsOnSessionTemplateId && !ids.has(row.dependsOnSessionTemplateId)) errors.push({ code: 'UNKNOWN_SESSION_DEPENDENCY',sessionCode: row.code });
    if(row.dependsOnSessionTemplateId && byId.get(row.dependsOnSessionTemplateId) && byId.get(row.dependsOnSessionTemplateId).sequence >= row.sequence){
      errors.push({ code: 'SESSION_DEPENDENCY_MUST_PRECEDE',sessionCode: row.code });
    }
    if(!['INHERIT','SAME','INDEPENDENT'].includes(row.publicContinuity)) errors.push({ code: 'INVALID_PUBLIC_CONTINUITY',sessionCode: row.code });
    if(!['INHERIT','SAME','INDEPENDENT'].includes(row.locationContinuity)) errors.push({ code: 'INVALID_LOCATION_CONTINUITY',sessionCode: row.code });
    codes.add(row.code); sequences.add(row.sequence);
  }
  return { valid: errors.length === 0,errors,value: normalized.sort((a,b) => a.sequence - b.sequence) };
}

function validatePlanningConstraint(row = {}){
  const type = upper(row.type || row.constraintType || row.constraint_type);
  const severity = upper(row.severity);
  const config = row.config;
  const errors = [];
  if(!CONSTRAINT_TYPES.includes(type)) errors.push({ code: 'UNKNOWN_CONSTRAINT_TYPE',type });
  if(!CONSTRAINT_SEVERITIES.includes(severity)) errors.push({ code: 'UNKNOWN_CONSTRAINT_SEVERITY',severity });
  if(!config || Array.isArray(config) || typeof config !== 'object') errors.push({ code: 'CONSTRAINT_CONFIG_OBJECT_REQUIRED',type });
  const schemas = {
    DATE_WINDOW: ['start','end'],MONTH: ['months'],WEEKDAY: ['weekdays'],TIME_WINDOW: ['start','end'],DURATION: ['minutes'],
    SESSION_SPACING: ['minimumMinutes'],SESSION_ORDER: ['beforeSessionCode','afterSessionCode'],CAPACITY: ['maximum','minimum'],
    INCOMPATIBILITY: ['activityCodes'],RESOURCE_AVAILABILITY: ['resourceCodes']
  };
  const allowed = schemas[type] || [];
  const required = type === 'CAPACITY' ? ['maximum'] : allowed;
  if(config && required.some((key) => config[key] == null)) errors.push({ code: 'CONSTRAINT_CONFIG_INCOMPLETE',type,required });
  if(config && Object.keys(config).some((key) => !allowed.includes(key))) errors.push({ code: 'UNKNOWN_CONSTRAINT_CONFIG_PROPERTY',type });
  if(config && type === 'CAPACITY'){
    if(!Number.isInteger(config.maximum) || config.maximum <= 0 || config.minimum != null && (!Number.isInteger(config.minimum) || config.minimum < 0 || config.minimum > config.maximum)) errors.push({ code: 'INVALID_CAPACITY_CONFIG' });
  }
  if(config && type === 'DURATION' && (!Number.isInteger(config.minutes) || config.minutes <= 0)) errors.push({ code: 'INVALID_DURATION_CONFIG' });
  if(config && type === 'MONTH' && !validUniqueList(config.months,(value) => Number.isInteger(value) && value >= 1 && value <= 12)) errors.push({ code: 'INVALID_MONTH_CONFIG' });
  if(config && type === 'WEEKDAY' && !validUniqueList(config.weekdays,(value) => Number.isInteger(value) && value >= 1 && value <= 7)) errors.push({ code: 'INVALID_WEEKDAY_CONFIG' });
  if(config && type === 'DATE_WINDOW'){
    const start = strictDate(config.start); const end = strictDate(config.end);
    if(!start || !end || start > end) errors.push({ code: 'INVALID_DATE_WINDOW_CONFIG' });
  }
  if(config && type === 'TIME_WINDOW'){
    const start = strictTime(config.start); const end = strictTime(config.end);
    if(start == null || end == null || start >= end) errors.push({ code: 'INVALID_TIME_WINDOW_CONFIG' });
  }
  if(config && type === 'SESSION_SPACING' && (!Number.isInteger(config.minimumMinutes) || config.minimumMinutes <= 0)) errors.push({ code: 'INVALID_SESSION_SPACING_CONFIG' });
  if(config && type === 'SESSION_ORDER' && (!text(config.beforeSessionCode) || !text(config.afterSessionCode) || text(config.beforeSessionCode) === text(config.afterSessionCode))) errors.push({ code: 'INVALID_SESSION_ORDER_CONFIG' });
  if(config && type === 'INCOMPATIBILITY' && !validUniqueList(config.activityCodes,(value) => Boolean(text(value)))) errors.push({ code: 'INVALID_INCOMPATIBILITY_CONFIG' });
  if(config && type === 'RESOURCE_AVAILABILITY' && !validUniqueList(config.resourceCodes,(value) => Boolean(text(value)))) errors.push({ code: 'INVALID_RESOURCE_AVAILABILITY_CONFIG' });
  return { valid: errors.length === 0,errors };
}

function validUniqueList(value,predicate){
  return Array.isArray(value) && value.length > 0 && value.every(predicate) && new Set(value.map((item) => String(item))).size === value.length;
}

function validateStatisticalContribution(row = {}){
  const mode = upper(row.mode);
  const value = row.value == null ? null : Number(row.value);
  const errors = [];
  if(!text(row.statcomCode || row.statcom_code)) errors.push({ code: 'STATCOM_CODE_REQUIRED' });
  if(!CONTRIBUTION_MODES.includes(mode)) errors.push({ code: 'UNKNOWN_CONTRIBUTION_MODE',mode });
  if(['FULL_DURATION','MANUAL'].includes(mode) && value != null) errors.push({ code: 'CONTRIBUTION_VALUE_FORBIDDEN',mode });
  if(mode === 'FIXED_MINUTES' && !(value > 0)) errors.push({ code: 'POSITIVE_MINUTES_REQUIRED' });
  if(mode === 'PERCENTAGE' && !(value > 0 && value <= 100)) errors.push({ code: 'VALID_PERCENTAGE_REQUIRED' });
  return { valid: errors.length === 0,errors };
}

function validateDefinitionContract(input = {}){
  const errors = [];
  const activityType = upper(input.definition && input.definition.activityType || input.definition && input.definition.activity_type);
  if(!ACTIVITY_TYPES.includes(activityType)) errors.push({ code: 'UNKNOWN_ACTIVITY_TYPE',activityType });
  const domains = (input.domainBindings || []).map((row) => ({ code: upper(row.domainCode || row.domain_code),role: upper(row.bindingRole || row.binding_role || 'SECONDARY') }));
  if(!domains.length) errors.push({ code: 'DOMAIN_BINDING_REQUIRED' });
  if(domains.some((row) => !row.code || !['PRIMARY','SECONDARY'].includes(row.role))) errors.push({ code: 'INVALID_DOMAIN_BINDING' });
  if(domains.filter((row) => row.role === 'PRIMARY').length !== 1) errors.push({ code: 'EXACTLY_ONE_PRIMARY_DOMAIN_REQUIRED' });
  if(new Set(domains.map((row) => row.code)).size !== domains.length) errors.push({ code: 'DUPLICATE_DOMAIN_BINDING' });
  errors.push(...validateSessionTemplates(input.sessionTemplates || []).errors);
  errors.push(...validatePeriodicity(input.periodicity || {}).errors);
  for(const row of input.publicBindings || []){
    if(!PUBLIC_OPERATORS.includes(upper(row.operator || 'UNION'))) errors.push({ code: 'UNKNOWN_PUBLIC_OPERATOR',operator: upper(row.operator) });
    if(!idOf(row,'publicDefinitionId','public_definition_id')) errors.push({ code: 'PUBLIC_DEFINITION_REQUIRED' });
  }
  for(const row of input.qualificationBindings || []){
    if(!QUALIFICATION_BINDING_TYPES.includes(upper(row.bindingType || row.binding_type))) errors.push({ code: 'UNKNOWN_QUALIFICATION_BINDING_TYPE' });
    if(!idOf(row,'competenceId','competence_id')) errors.push({ code: 'QUALIFICATION_DEFINITION_REQUIRED' });
  }
  for(const row of input.roleRequirements || []){
    const minimum = integer(row.minimumCount ?? row.minimum_count);
    const recommended = integer(row.recommendedCount ?? row.recommended_count);
    if(!idOf(row,'roleDefinitionId','role_definition_id') || minimum == null || minimum < 0 || recommended == null || recommended < minimum){
      errors.push({ code: 'INVALID_ROLE_REQUIREMENT' });
    }
  }
  const sessionCodes = new Set((input.sessionTemplates || []).map((row) => upper(row.code)).filter(Boolean));
  for(const row of input.planningConstraints || []){
    errors.push(...validatePlanningConstraint(row).errors);
    if(upper(row.type || row.constraintType || row.constraint_type) === 'SESSION_ORDER'){
      const before = upper(row.config && row.config.beforeSessionCode);
      const after = upper(row.config && row.config.afterSessionCode);
      if(!sessionCodes.has(before) || !sessionCodes.has(after)) errors.push({ code: 'UNKNOWN_SESSION_ORDER_REFERENCE',beforeSessionCode: before,afterSessionCode: after });
    }
  }
  for(const row of input.statisticalContributions || []) errors.push(...validateStatisticalContribution(row).errors);
  const forbiddenPersonKey = findForbiddenPersonKey(input);
  if(forbiddenPersonKey) errors.push({ code: 'PERSON_ASSIGNMENT_FORBIDDEN',key: forbiddenPersonKey });
  return { valid: errors.length === 0,errors };
}

function findForbiddenPersonKey(value){
  if(Array.isArray(value)) return value.map(findForbiddenPersonKey).find(Boolean) || null;
  if(!value || typeof value !== 'object') return null;
  for(const [key,child] of Object.entries(value)){
    if(['personid','personneid','person_id','personne_id'].includes(key.toLowerCase())) return key;
    const nested = findForbiddenPersonKey(child);
    if(nested) return nested;
  }
  return null;
}

function applicableRuleVersions(publicDefinitionId, date, versions){
  return (versions || []).filter((row) => idOf(row,'publicDefinitionId','public_definition_id') === String(publicDefinitionId)
    && upper(row.status) === 'ACTIVE'
    && (!row.validFrom && !row.valid_from || dateOnly(row.validFrom || row.valid_from) <= date)
    && (!row.validTo && !row.valid_to || date <= dateOnly(row.validTo || row.valid_to)));
}

function prepareAnnualRequirementReady(input = {}){
  const requirement = input.requirement || {};
  const publicDefinitions = new Map((input.publicDefinitions || []).map((row) => [idOf(row,'publicDefinitionId','public_definition_id'),row]));
  const errors = [];
  errors.push(...validateDefinitionContract(input).errors);
  if(!idOf(input.version,'definitionVersionId','definition_version_id','id')) errors.push({ code: 'ACTIVITY_DEFINITION_VERSION_REQUIRED' });
  if(upper(requirement.status) !== 'DRAFT') errors.push({ code: 'ANNUAL_REQUIREMENT_NOT_DRAFT' });
  const year = integer(requirement.year);
  if(!(year >= 2000 && year <= 2200)) errors.push({ code: 'INVALID_ANNUAL_REQUIREMENT_YEAR' });
  const evaluationDate = dateOnly(requirement.windowStart || requirement.window_start) || `${year}-01-01`;
  const pinnedBindings = (input.publicBindings || []).map((binding) => {
    const definitionId = idOf(binding,'publicDefinitionId','public_definition_id');
    const definition = publicDefinitions.get(definitionId);
    if(!definition || upper(definition.status) !== 'ACTIVE'){
      errors.push({ code: 'PUBLIC_DEFINITION_NOT_ACTIVE',publicDefinitionId: definitionId });
      return { ...binding,publicRuleVersionId: null };
    }
    const explicit = idOf(binding,'publicRuleVersionId','public_rule_version_id');
    const applicable = applicableRuleVersions(definitionId,evaluationDate,input.publicRuleVersions);
    const candidates = explicit ? applicable.filter((row) => idOf(row,'publicRuleVersionId','public_rule_version_id') === explicit) : applicable;
    if(candidates.length !== 1){
      errors.push({ code: candidates.length ? 'AMBIGUOUS_PUBLIC_RULE_VERSION' : 'MISSING_PUBLIC_RULE_VERSION',publicDefinitionId: definitionId });
      return { ...binding,publicRuleVersionId: null };
    }
    return { ...binding,publicRuleVersionId: idOf(candidates[0],'publicRuleVersionId','public_rule_version_id') };
  });
  const snapshot = canonicalize({
    definition: input.definition || null,version: input.version || null,requirement: { ...requirement,status: 'READY' },
    domainBindings: input.domainBindings || [],sessionTemplates: input.sessionTemplates || [],periodicity: input.periodicity || null,
    publicBindings: pinnedBindings,qualificationBindings: input.qualificationBindings || [],roleRequirements: input.roleRequirements || [],
    locationRequirements: input.locationRequirements || [],responsibleRequirements: input.responsibleRequirements || [],
    planningConstraints: input.planningConstraints || [],statisticalContributions: input.statisticalContributions || []
  });
  return { valid: errors.length === 0,errors,publicBindings: pinnedBindings,
    requirement: errors.length ? requirement : { ...requirement,status: 'READY',snapshot,fingerprint: fingerprint(snapshot) } };
}

function generateAnnualProgram(input = {}){
  const requirement = input.requirement || {};
  const errors = [];
  const warnings = [];
  if(upper(requirement.status) !== 'READY') errors.push({ code: 'ANNUAL_REQUIREMENT_NOT_READY' });
  if(!validAnnualSnapshot(requirement.snapshot)
    || !/^[0-9a-f]{64}$/.test(text(requirement.fingerprint)) || fingerprint(requirement.snapshot) !== requirement.fingerprint){
    errors.push({ code: 'INVALID_ANNUAL_REQUIREMENT_SNAPSHOT' });
  }
  const count = integer(requirement.requiredOccurrences ?? requirement.required_occurrences);
  if(!(count > 0)) errors.push({ code: 'INVALID_REQUIRED_OCCURRENCES' });
  const sessions = validateSessionTemplates(input.sessionTemplates || []);
  errors.push(...sessions.errors);
  const periodicity = validatePeriodicity(input.periodicity || {});
  errors.push(...periodicity.errors);
  if(requirement.snapshot && typeof requirement.snapshot === 'object' && !Array.isArray(requirement.snapshot)){
    const expected = generationSemanticConfig(requirement.snapshot.requirement || {},requirement.snapshot.sessionTemplates || [],requirement.snapshot.periodicity || {});
    const actual = generationSemanticConfig(requirement,input.sessionTemplates || [],input.periodicity || {});
    if(expected.errors.length || canonicalJson(expected.value) !== canonicalJson(actual.value)) errors.push({ code: 'GENERATION_INPUT_DIVERGES_FROM_SNAPSHOT' });
  }
  if(errors.length) return { complete: false,errors,warnings,occurrences: [],sessions: [] };
  const requirementId = idOf(requirement,'annualRequirementId','annual_requirement_id','id');
  if(!requirementId) return { complete: false,errors: [{ code: 'ANNUAL_REQUIREMENT_ID_REQUIRED' }],warnings,occurrences: [],sessions: [] };
  const occurrences = [];
  const generatedSessions = [];
  for(let occurrenceNumber = 1; occurrenceNumber <= count; occurrenceNumber += 1){
    const plannedOccurrenceId = deterministicUuid('C4-OCCURRENCE',requirementId,occurrenceNumber);
    occurrences.push({ plannedOccurrenceId,annualRequirementId: requirementId,occurrenceNumber,status: 'GENERATED',
      preferredWindowStart: dateOnly(requirement.windowStart || requirement.window_start),preferredWindowEnd: dateOnly(requirement.windowEnd || requirement.window_end),metadata: {} });
    for(const template of sessions.value){
      generatedSessions.push({ plannedOccurrenceSessionId: deterministicUuid('C4-SESSION',plannedOccurrenceId,template.code),
        plannedOccurrenceId,sessionTemplateId: template.sessionTemplateId,sequence: template.sequence,status: 'GENERATED',
        preferredDate: null,preferredStartTime: null,preferredEndTime: null,metadata: {} });
    }
  }
  return { complete: true,errors,warnings,occurrences,sessions: generatedSessions };
}

function validAnnualSnapshot(snapshot){
  if(!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || !snapshot.definition || !snapshot.version || !snapshot.requirement || !snapshot.periodicity) return false;
  return ['domainBindings','sessionTemplates','publicBindings','qualificationBindings','roleRequirements','locationRequirements',
    'responsibleRequirements','planningConstraints','statisticalContributions'].every((key) => Array.isArray(snapshot[key]));
}

function generationSemanticConfig(requirement,sessionTemplates,periodicity){
  const sessions = validateSessionTemplates(sessionTemplates);
  const periodic = validatePeriodicity(periodicity);
  const requiredOccurrences = integer(requirement.requiredOccurrences ?? requirement.required_occurrences);
  const value = {
    annualRequirementId: idOf(requirement,'annualRequirementId','annual_requirement_id','id'),requiredOccurrences,
    windowStart: dateOnly(requirement.windowStart || requirement.window_start),windowEnd: dateOnly(requirement.windowEnd || requirement.window_end),
    sessionTemplates: sessions.value,periodicity: periodic.value
  };
  const errors = [...sessions.errors,...periodic.errors];
  if(!(requiredOccurrences > 0)) errors.push({ code: 'INVALID_REQUIRED_OCCURRENCES' });
  return { value,errors };
}

function validateAnnualRequirementMutation(previous = {},next = {}){
  const errors = [];
  const oldStatus = upper(previous.status); const newStatus = upper(next.status);
  const transitions = { DRAFT: ['DRAFT','READY','CANCELLED'],READY: ['READY','SUPERSEDED','CANCELLED'],CANCELLED: ['CANCELLED'],SUPERSEDED: ['SUPERSEDED'] };
  if(!(transitions[oldStatus] || []).includes(newStatus)) errors.push({ code: 'INVALID_ANNUAL_REQUIREMENT_STATUS_TRANSITION' });
  const fields = [['year'],['definitionVersionId','definition_version_id'],['variantCode','variant_code'],['requiredOccurrences','required_occurrences'],
    ['windowStart','window_start'],['windowEnd','window_end'],['priority'],['sourceType','source_type'],['sourceId','source_id'],
    ['supersedesAnnualRequirementId','supersedes_annual_requirement_id'],['snapshot'],['fingerprint']];
  const resolved = fields.map((keys) => ({ keys,previous: resolveAliasedField(previous,keys),next: resolveAliasedField(next,keys) }));
  if(resolved.some((field) => field.previous.conflicting || field.next.conflicting)) errors.push({ code: 'CONFLICTING_FIELD_ALIASES' });
  if(oldStatus === 'READY' && resolved.some((field) => canonicalJson(field.previous.value) !== canonicalJson(field.next.value))){
    errors.push({ code: 'READY_ANNUAL_REQUIREMENT_SEMANTICALLY_IMMUTABLE' });
  }
  return { valid: errors.length === 0,errors };
}

function resolveAliasedField(row,keys){
  const values = keys.filter((key) => Object.prototype.hasOwnProperty.call(row,key)).map((key) => row[key]);
  return { value: values.length ? values[0] : null,conflicting: new Set(values.map(canonicalJson)).size > 1 };
}

function projectToQuoVadis(input = {}){
  const requirement = input.requirement || {};
  const definition = input.definition || {};
  const sessionsByOccurrence = new Map();
  for(const session of input.sessions || []){
    if(!sessionsByOccurrence.has(session.plannedOccurrenceId)) sessionsByOccurrence.set(session.plannedOccurrenceId,[]);
    sessionsByOccurrence.get(session.plannedOccurrenceId).push(session);
  }
  return {
    obligations: (input.occurrences || []).map((row) => ({ sourceType: 'CATALOG_C4',sourceRef: row.plannedOccurrenceId,
      plannedOccurrenceId: row.plannedOccurrenceId,title: text(requirement.label || definition.label),domain: upper(definition.domain || definition.domainCode),
      status: 'A_PLANIFIER',noOperationalEventCreated: true })),
    sessionIntents: (input.occurrences || []).flatMap((row) => (sessionsByOccurrence.get(row.plannedOccurrenceId) || [])
      .sort((a,b) => a.sequence - b.sequence).map((session) => ({ plannedOccurrenceSessionId: session.plannedOccurrenceSessionId,
        plannedOccurrenceId: row.plannedOccurrenceId,sequence: session.sequence,status: 'A_PROPOSER',startsAt: null,endsAt: null })))
  };
}

function classifyLegacyCandidates(rows = []){
  const groups = new Map();
  for(const row of rows){
    const label = text(row.label || row.libelle || row.title);
    const key = `${upper(row.domain || row.domaine_code)}|${upper(label)}`;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([key,items]) => {
    const explicitDefinition = items.some((row) => row.definitionId || row.definition_id || row.sourceType === 'DEFINITION');
    const noise = items.every((row) => /\b(TEST|RECETTE|DEMO)\b/i.test(text(row.label || row.libelle || row.title)));
    const classification = explicitDefinition ? 'A' : noise || items.length === 1 ? 'D' : items.length >= 3 ? 'B' : 'C';
    return { key,classification,count: items.length,reason: explicitDefinition ? 'EXPLICIT_DEFINITION' : noise ? 'TECHNICAL_NOISE' : items.length === 1 ? 'ISOLATED_HISTORY' : items.length >= 3 ? 'REPEATED_CANDIDATE_REQUIRES_CONTROL' : 'MOA_DECISION_REQUIRED' };
  }).sort((a,b) => a.key.localeCompare(b.key));
}

module.exports = {
  ACTIVITY_TYPES,PERIODICITY_TYPES,PUBLIC_OPERATORS,QUALIFICATION_BINDING_TYPES,CONSTRAINT_SEVERITIES,CONSTRAINT_TYPES,CONTRIBUTION_MODES,
  canonicalJson,fingerprint,validatePeriodicity,validateSessionTemplates,validatePlanningConstraint,validateStatisticalContribution,
  validateDefinitionContract,prepareAnnualRequirementReady,generateAnnualProgram,validateAnnualRequirementMutation,projectToQuoVadis,classifyLegacyCandidates
};
