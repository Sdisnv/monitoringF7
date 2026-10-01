'use strict';

const crypto = require('node:crypto');

const CONVERGENCE_ACTIONS = Object.freeze(['KEEP', 'ADAPT', 'REPLACE', 'REMOVE', 'MERGE_SAFE', 'KEEP_DISTINCT', 'REVIEW_REQUIRED']);
const PROGRAM_STATES = Object.freeze(['ACTIVE', 'INACTIVE']);
const SLOT_STATES = Object.freeze(['PROPOSED', 'CONFIRMED', 'VALIDATED', 'ARBITRATION_REQUIRED', 'DISABLED']);
const COMPATIBILITY_STATES = Object.freeze(['COMPATIBLE', 'CONFLICT', 'DEROGABLE', 'ATTENTION']);
const WEEKDAY_NAMES = Object.freeze(['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']);

function text(value){ return String(value == null ? '' : value).trim(); }
function upper(value){ return text(value).toUpperCase(); }
function unique(values){ return [...new Set((values || []).filter(Boolean))]; }
function canonical(value){
  if(Array.isArray(value)) return value.map(canonical);
  if(value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function fingerprint(value){ return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function id(namespace,...parts){
  const hex = crypto.createHash('sha256').update([namespace,...parts].join('|')).digest('hex').slice(0,32).split('');
  hex[12] = '5'; hex[16] = ((parseInt(hex[16],16) & 3) | 8).toString(16);
  return `${hex.slice(0,8).join('')}-${hex.slice(8,12).join('')}-${hex.slice(12,16).join('')}-${hex.slice(16,20).join('')}-${hex.slice(20).join('')}`;
}
function normalizedArray(value){ return unique((value || []).map((item) => upper(item))).sort(); }
function sameEvidence(rows,key){
  return new Set(rows.map((row) => JSON.stringify(normalizedArray(row[key])))).size === 1;
}
function minutesOf(value){
  const match = text(value).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
function durationMinutes(startTime,endTime){
  const start = minutesOf(startTime); const end = minutesOf(endTime);
  if(start == null || end == null || end <= start) return null;
  return end - start;
}
function durationLabel(minutes){
  const value = Number(minutes);
  if(!Number.isFinite(value) || value <= 0) return '';
  const hours = Math.floor(value / 60); const mins = value % 60;
  return hours ? `${hours} h${mins ? ` ${String(mins).padStart(2,'0')}` : ''}` : `${mins} min`;
}
function finalActivityLabel(baseLabel,complement){
  const base = text(baseLabel);
  const suffix = text(complement);
  return suffix ? `${base} · ${suffix}` : base;
}
function numberedActivityLabel(baseLabel,occurrenceNumber,sessionNumber,sessionCount = 1){
  const base = text(baseLabel);
  const occurrence = Number(occurrenceNumber);
  const session = Number(sessionNumber);
  if(!base || !Number.isInteger(occurrence) || occurrence < 1) return base;
  const suffix = Number(sessionCount) > 1 && Number.isInteger(session) && session > 0 ? `${occurrence}.${session}` : String(occurrence);
  return `${base} ${suffix}`;
}
function scheduledActivityLabel(baseLabel,occurrenceNumber,sessionNumber,sessionCount,complement){
  return finalActivityLabel(numberedActivityLabel(baseLabel,occurrenceNumber,sessionNumber,sessionCount),complement);
}
function programmeActivityPresentation(rows = []){
  const source = Array.isArray(rows) ? rows : [];
  const normalized = source.map((row) => {
    const label = text(row.label || row.eventLabel);
    const numbered = numberedLabel(label);
    const sessionCount = Math.max(1,Number(row.sessionCount || 1));
    const sessionIndex = Math.max(1,Number(row.sessionIndex || row.sessionSequence || 1));
    const eventNumbered = numberedLabel(text(row.eventLabel));
    const collapsedOccurrences = numbered && numbered.minor === 1 && sessionCount > 1
      && eventNumbered && eventNumbered.major === numbered.major && eventNumbered.minor === sessionIndex;
    if(!collapsedOccurrences) return { ...row,_numbered:numbered,_operationalLabel:label };
    const occurrenceId = `${text(row.definitionId)}:O${sessionIndex}`;
    const operationalLabel = label.replace(/\d+[.]\d+$/,`${numbered.major}.${sessionIndex}`);
    return {
      ...row,
      occurrenceId,
      sessionId:`${occurrenceId}:S1`,
      sessionIndex:1,
      sessionCount:1,
      _operationalLabel:operationalLabel,
      _numbered:{ ...numbered,minor:sessionIndex },
      _collapsedOccurrenceCount:sessionCount
    };
  });
  const byDefinition = new Map();
  normalized.forEach((row) => {
    const numbered = row._numbered;
    const exerciseSeries = numbered && numbered.minor != null && /^Exercice\b/i.test(text(row.label));
    const collapsedSeries = Number(row._collapsedOccurrenceCount || 0) > 1;
    const key = exerciseSeries || collapsedSeries
      ? `${upper(row.domain)}|${numbered.stem}|${numbered.major}`
      : text(row.definitionId || row.definitionCode || row.code || row.id);
    row._presentationKey = key;
    if(!byDefinition.has(key)) byDefinition.set(key,[]);
    byDefinition.get(key).push(row);
  });
  return normalized.map((row) => {
    const siblings = byDefinition.get(row._presentationKey) || [row];
    const sessionCount = Math.max(1,Number(row.sessionCount || 1));
    const sessionIndex = Math.max(1,Number(row.sessionIndex || row.sessionSequence || 1));
    const occurrenceMatch = text(row.occurrenceId).match(/:O0*(\d+)$/i);
    const numbered = row._numbered;
    const occurrenceIndex = Number(row.seriesOccurrenceIndex || 0) || (numbered && numbered.minor != null ? numbered.minor : (occurrenceMatch ? Number(occurrenceMatch[1]) : 1));
    const occurrenceNumbers = new Set(siblings.map((item) => item._numbered && item._numbered.minor != null
      ? Number(item._numbered.minor) : text(item.occurrenceId || item.id)));
    const occurrenceCount = Math.max(Number(row.seriesOccurrenceCount || 0),Number(row._collapsedOccurrenceCount || 0),occurrenceNumbers.size);
    const rawLabel = text(row.label || row.eventLabel);
    const operationalLabel = text(row._operationalLabel) || rawLabel;
    const activityLabel = numbered && numbered.minor != null && (occurrenceCount > 1 || Number(row._collapsedOccurrenceCount || 0) > 1)
      ? `${numbered.stem} ${numbered.major}` : rawLabel;
    const result = {
      ...row,
      activityLabel,
      eventDisplayLabel:operationalLabel,
      definitionCode:text(row.code) || null,
      eventCode:null,
      occurrenceIndex,
      occurrenceCount,
      occurrenceLabel:occurrenceCount > 1
        ? `Occurrence ${numbered && numbered.minor != null ? `${numbered.major}.${occurrenceIndex}` : occurrenceIndex} (${occurrenceIndex}/${occurrenceCount})`
        : 'Occurrence unique',
      sessionLabel:sessionCount > 1 ? `Session ${sessionIndex}/${sessionCount}` : 'Aucune session distincte'
    };
    delete result._numbered;
    delete result._presentationKey;
    delete result._collapsedOccurrenceCount;
    delete result._operationalLabel;
    return result;
  });
}
function allocateActivityCode(statCom,issuedCodes = []){
  const prefix = upper(statCom).replace(/\s+/g,'');
  if(!prefix) return null;
  const escaped = prefix.replace(/[.*+?^$()|[\]\\{}]/g,'\\$&');
  const pattern = new RegExp('^' + escaped + '\\.(\\d{3})$');
  const highest = (issuedCodes || []).reduce((max,code) => {
    const match = upper(code).match(pattern);
    return match ? Math.max(max,Number(match[1])) : max;
  },0);
  if(highest >= 999) throw new Error('ACTIVITY_CODE_SEQUENCE_EXHAUSTED:' + prefix);
  return prefix + '.' + String(highest + 1).padStart(3,'0');
}
function numberedLabel(label){
  const match = text(label).match(/^(.*?)(?:\s+)(\d+)(?:\.(\d+))?$/);
  if(!match) return null;
  return { stem:text(match[1]),major:Number(match[2]),minor:match[3] == null ? null : Number(match[3]),suffix:match[3] == null ? match[2] : `${match[2]}.${match[3]}` };
}

function buildConvergenceMatrix(proposals = []){
  const rows = (proposals || []).map((row) => ({ ...row,label:text(row.activityLabel || row.label),domain:upper(row.primaryDomain || row.domain) }));
  const consumed = new Set();
  const result = [];
  const append = (items,entry) => {
    items.forEach((row) => consumed.add(row.label));
    result.push({ source:items.map((row) => row.label),domains:unique(items.map((row) => row.domain)),sites:unique(items.flatMap((row) => row.sites || [])).sort(),...entry });
  };
  const jsp = rows.filter((row) => /^Exercice JSP (?:[1-9]|10)$/.test(row.label) && row.domain === 'JSP');
  if(jsp.length === 10 && sameEvidence(jsp,'publicCodes')) append(jsp,{
    proposedType:'RECURRENT_OCCURRENCES',targetDefinition:'JSP-EXERCICE',sessions:['S1'],realizations:10,
    confidence:'HIGH',action:'MERGE_SAFE',evidence:['10 numéros continus','domaine JSP identique','publics canoniques identiques','déclinaisons par site']
  });
  const grouped = new Map();
  for(const row of rows){
    if(consumed.has(row.label)) continue;
    const numbered = numberedLabel(row.label);
    if(!numbered || numbered.minor == null) continue;
    const key = `${row.domain}|${numbered.stem}|${numbered.major}`;
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push({ ...row,numbered });
  }
  for(const items of grouped.values()){
    if(items.length < 2) continue;
    items.sort((a,b) => a.numbered.minor - b.numbered.minor);
    const minors = items.map((row) => row.numbered.minor);
    const contiguous = minors.every((value,index) => value === index + 1);
    const strongEvidence = contiguous && ['publicCodes','statComCodes','specializations','themes'].every((key) => sameEvidence(items,key));
    const formationGroupee = items[0].numbered.stem === 'Formation groupée' && items.length === 6 && strongEvidence;
    const exercicePr1 = items[0].domain === 'PR' && items[0].numbered.stem === 'Exercice PR' && items[0].numbered.major === 1 && items.length === 6 && strongEvidence;
    append(items,{
      proposedType:formationGroupee ? 'MULTI_SESSION' : exercicePr1 ? 'RECURRENT_OCCURRENCES' : 'UNRESOLVED_SERIES',
      targetDefinition:formationGroupee ? 'DPS-FORMATION-GROUPEE' : exercicePr1 ? 'PR-EXERCICE-1' : null,
      sessions:formationGroupee ? items.map((row) => row.numbered.suffix) : exercicePr1 ? ['S1'] : [],realizations:formationGroupee ? 1 : exercicePr1 ? items.length : null,
      confidence:formationGroupee || exercicePr1 ? 'HIGH' : 'MEDIUM',action:formationGroupee || exercicePr1 ? 'MERGE_SAFE' : 'REVIEW_REQUIRED',
      evidence:formationGroupee ? ['suffixes 1.1 à 1.6 continus','domaine, publics, Stat.Com, spécialisation et thème identiques']
        : exercicePr1 ? ['PR 1.1 à 1.6 continus','domaine PR, publics canoniques, Stat.Com, spécialisation PAPR et thème Base identiques','six occurrences métier distinctes']
          : ['suffixe numérique insuffisant sans décision métier']
    });
  }
  for(const row of rows.filter((item) => !consumed.has(item.label))){
    result.push({ source:[row.label],proposedType:'DISTINCT_ACTIVITY',targetDefinition:row.definitionCode || row.code || null,
      sessions:[],realizations:row.occurrenceCount || 1,domains:[row.domain],sites:row.sites || [],confidence:'HIGH',action:'KEEP_DISTINCT',evidence:['aucun regroupement sûr démontré'] });
  }
  return result.sort((a,b) => a.action.localeCompare(b.action) || a.source[0].localeCompare(b.source[0],'fr'));
}

function normalizeFunctionalProfile(input = {}){
  const recurrenceKind = upper(input.recurrenceKind || 'NON_RECURRENT');
  const defaultOccurrences = Number(input.defaultOccurrences || 1);
  const ruleMode = upper(input.ruleMode || 'GENERAL');
  const errors = [];
  if(!['RECURRENT','NON_RECURRENT'].includes(recurrenceKind)) errors.push({ code:'INVALID_RECURRENCE_KIND' });
  if(!Number.isInteger(defaultOccurrences) || defaultOccurrences < 1) errors.push({ code:'INVALID_DEFAULT_OCCURRENCES' });
  if(!['GENERAL','CUSTOM'].includes(ruleMode)) errors.push({ code:'INVALID_RULE_MODE' });
  if(ruleMode === 'CUSTOM' && (!input.customRule || typeof input.customRule !== 'object' || Array.isArray(input.customRule))) errors.push({ code:'CUSTOM_RULE_REQUIRED' });
  return { valid:errors.length === 0,errors,value:{ recurrenceKind,defaultOccurrences,defaultSites:normalizedArray(input.defaultSites),ruleMode,customRule:ruleMode === 'CUSTOM' ? canonical(input.customRule) : null } };
}

function annualConfiguration(profile = {},override = {}){
  const permanent = normalizeFunctionalProfile(profile);
  if(!permanent.valid) return permanent;
  const state = upper(override.state || 'ACTIVE');
  const occurrences = override.occurrences == null ? permanent.value.defaultOccurrences : Number(override.occurrences);
  const sites = override.sites == null ? permanent.value.defaultSites : normalizedArray(override.sites);
  const errors = [];
  if(!PROGRAM_STATES.includes(state)) errors.push({ code:'INVALID_PROGRAM_STATE' });
  if(!Number.isInteger(occurrences) || occurrences < 1) errors.push({ code:'INVALID_ANNUAL_OCCURRENCES' });
  if(!sites.length) errors.push({ code:'ANNUAL_SITES_REQUIRED' });
  return { valid:errors.length === 0,errors,value:{ state,occurrences,sites,extraordinary:Boolean(override.extraordinary),overrides:{ occurrences:override.occurrences != null,sites:override.sites != null } } };
}

function day(value){ return new Date(`${value}T00:00:00Z`); }
function date(value){ return value.toISOString().slice(0,10); }
function addDays(value,count){ const next=new Date(value); next.setUTCDate(next.getUTCDate()+count); return next; }
function nextWeekday(value){ let next=value; while([0,6].includes(next.getUTCDay())) next=addDays(next,1); return next; }
function intervalStart(slot = {}) { return Date.parse(slot.startDateTime || `${slot.date}T${slot.startTime}:00Z`); }
function intervalEnd(slot = {}) { return Date.parse(slot.endDateTime || `${slot.endDate || slot.date}T${slot.endTime}:00Z`); }
function overlaps(left,right){
  const leftStart=intervalStart(left); const leftEnd=intervalEnd(left);
  const rightStart=intervalStart(right); const rightEnd=intervalEnd(right);
  return [leftStart,leftEnd,rightStart,rightEnd].every(Number.isFinite) && leftStart < rightEnd && rightStart < leftEnd;
}
function calendarRangesOverlap(left,right){
  const leftEnd=left.endDate || left.date; const rightEnd=right.endDate || right.date;
  return Boolean(left.date && right.date && left.date <= rightEnd && right.date <= leftEnd);
}
function intersects(left = [],right = []){ const lookup = new Set(normalizedArray(right)); return normalizedArray(left).filter((code) => lookup.has(code)); }
function weekdayOf(value){ return WEEKDAY_NAMES[day(value).getUTCDay()]; }
function statusSet(dayInfo = {}) {
  return normalizedArray([
    dayInfo.publicHoliday || dayInfo.holiday ? 'PUBLIC_HOLIDAY' : '',
    dayInfo.publicHolidayEve || dayInfo.holidayEve ? 'PUBLIC_HOLIDAY_EVE' : '',
    dayInfo.schoolVacation || dayInfo.vacation ? 'SCHOOL_VACATION' : '',
    dayInfo.schoolVacationEve || dayInfo.vacationEve ? 'SCHOOL_VACATION_EVE' : ''
  ]);
}
function normalizeCalendarRules(input = {}) {
  const rules = input || {};
  const weekdays = rules.weekdays || {};
  const dayStatuses = rules.dayStatuses || rules.day_statuses || {};
  return {
    priorityWeekdays:normalizedArray(rules.priorityWeekdays || rules.priority_weekdays || weekdays.priority || weekdays.prioritaires),
    secondaryWeekdays:normalizedArray(rules.secondaryWeekdays || rules.secondary_weekdays || weekdays.secondary || weekdays.secondaires),
    allowedWeekdays:normalizedArray(rules.allowedWeekdays || rules.allowed_weekdays || weekdays.allowed || weekdays.autorises),
    forbiddenWeekdays:normalizedArray(rules.forbiddenWeekdays || rules.forbidden_weekdays || weekdays.forbidden || weekdays.interdits),
    dayStatuses:Object.fromEntries(Object.entries(dayStatuses).map(([key,value]) => [upper(key),upper(value || 'ALLOWED')])),
    serviceContinuity:Boolean(rules.serviceContinuity || rules.service_continuity || upper(rules.businessException) === 'SERVICE_CONTINUITY')
  };
}
function evaluateCalendarDate(dateValue,rules = {},calendar = {}) {
  const normalized = normalizeCalendarRules(rules);
  const weekday = weekdayOf(dateValue);
  const dayInfo = calendar[dateValue] || {};
  const statuses = statusSet(dayInfo);
  const reasons = [];
  let score = 50;
  let allowed = true;
  if(normalized.forbiddenWeekdays.includes(weekday)){ allowed = false; reasons.push(`jour interdit: ${weekday}`); }
  if(normalized.allowedWeekdays.length && !normalized.allowedWeekdays.includes(weekday)){ allowed = false; reasons.push(`jour non autorisé: ${weekday}`); }
  if(normalized.priorityWeekdays.includes(weekday)){ score -= 20; reasons.push(`jour prioritaire: ${weekday}`); }
  else if(normalized.secondaryWeekdays.includes(weekday)){ score -= 5; reasons.push(`jour secondaire: ${weekday}`); }
  for(const status of statuses){
    const policy = normalized.dayStatuses[status] || 'ALLOWED';
    if((policy === 'FORBIDDEN' || policy === 'INTERDIT') && normalized.serviceContinuity){ reasons.push(`exception continuité de service: ${status}`); }
    else if(policy === 'FORBIDDEN' || policy === 'INTERDIT'){ allowed = false; reasons.push(`statut interdit: ${status}`); }
    else if(policy === 'PENALTY' || policy === 'PENALITE'){ score += 20; reasons.push(`statut pénalisé: ${status}`); }
    else if(policy === 'PREFERRED' || policy === 'PREFERENCE'){ score -= 5; reasons.push(`statut favorable: ${status}`); }
  }
  return { date:dateValue,weekday,dayStatuses:statuses,allowed,score,reasons };
}

function progressFobaLevel(input = {}) {
  const track = upper(input.track);
  const level = Number(input.level);
  const years = Number(input.toYear) - Number(input.fromYear);
  if(!['DPS','DAP'].includes(track) || !Number.isInteger(level) || level < 1 || years < 0) return { valid:false,track,fromLevel:level || null,toLevel:null,state:'INVALID' };
  let current = level;
  for(let index=0;index<years;index+=1){
    if(track === 'DPS') current = current < 3 ? current + 1 : null;
    else current = current < 2 ? current + 1 : null;
    if(current == null) break;
  }
  return { valid:true,track,fromLevel:level,toLevel:current,state:current == null ? (track === 'DPS' ? 'INTEGRATED_DPS' : 'DAP_COMPLETED') : 'FOBA' };
}

function canonicalFobaResponsibility(input = {}) {
  const historical = text(input.historicalResponsible || input.responsible);
  return { roleCode:'CHEF-FOBA',roleLabel:'Chef FOBA',displayLabel:'C FOBA',historicalResponsible:historical || null,assignmentStatus:'ROLE_CANONICAL_PERSON_UNASSIGNED' };
}
function normalizeSlot(row = {}) {
  const startTime = text(row.startTime || row.start_time || row.preferred_start_time || '00:00').slice(0,5);
  const endTime = text(row.endTime || row.end_time || row.preferred_end_time || '23:59').slice(0,5);
  const dateValue=text(row.date || row.preferred_date || row.startDate || row.start_date).slice(0,10);
  const explicitStart=text(row.startDateTime || row.start_datetime || row.startsAt || row.starts_at).slice(0,16);
  const explicitEnd=text(row.endDateTime || row.end_datetime || row.endsAt || row.ends_at).slice(0,16);
  const startDateTime=explicitStart || (dateValue ? `${dateValue}T${startTime}` : '');
  const endDate=text(row.endDate || row.end_date).slice(0,10) || (explicitEnd ? explicitEnd.slice(0,10) : dateValue);
  const endDateTime=explicitEnd || (endDate ? `${endDate}T${endTime}` : '');
  const durationMinutes=startDateTime && endDateTime ? Math.max(0,(Date.parse(`${endDateTime}:00Z`)-Date.parse(`${startDateTime}:00Z`))/60000) : 0;
  const scopeDomain=upper(row.scopeDomain || row.scope_domain || row.domain);
  const targetCode=upper(row.targetCode || row.target_code || row.target);
  const unitSource=upper(row.organisationUnit || row.organisation_unit || row.oi || targetCode || row.siteCode || row.site_code);
  const unitMatch=unitSource.match(/(?:^|[-:])(G1|C1|B1|B2|Y1|Y2|Y3|Y4)(?:$|[-:])/);
  const organisationUnit=unitMatch ? unitMatch[1] : (/^(G1|C1|B1|B2|Y1|Y2|Y3|Y4)$/.test(unitSource) ? unitSource : '');
  return {
    ...row,
    slotId:row.slotId || row.slot_id || row.planned_site_slot_id || id('C19-SLOT',row.definitionCode || row.definition_code || row.activityLabel || row.activity_label,row.date || row.preferred_date,startTime,endTime),
    definitionCode:row.definitionCode || row.definition_code || row.code || null,
    activityLabel:text(row.activityLabel || row.activity_label || row.finalLabel || row.final_label || row.label),
    date:dateValue,
    startTime,
    endTime,
    startDateTime,
    endDateTime,
    endDate,
    durationMinutes,
    siteCode:upper(row.siteCode || row.site_code),
    publicCodes:normalizedArray(row.publicCodes || row.public_codes || row.effectivePublicCodes || row.effective_public_codes),
    whoCodes:normalizedArray(row.whoCodes || row.who_codes || row.qualificationCodes || row.qualification_codes),
    roleCodes:normalizedArray(row.roleCodes || row.role_codes || row.indispensableRoles || row.indispensable_roles),
    resourceCodes:normalizedArray(row.resourceCodes || row.resource_codes),
    roomCode:upper(row.roomCode || row.room_code || row.room),
    status:upper(row.status || 'PROPOSED'),
    dayExclusive:Boolean(row.dayExclusive || row.day_exclusive || row.exclusiveDay || row.exclusive_day),
    fixedDate:Boolean(row.fixedDate || row.fixed_date || row.dateImposee || row.date_imposee),
    permutationAllowed:Boolean(row.permutationAllowed || row.permutation_allowed),
    priority:Number(row.priority || row.businessPriority || row.business_priority || 100),
    occurrenceNumber:Number(row.occurrenceNumber || row.occurrence_number || 1),
    sessionSequence:Number(row.sessionSequence || row.session_sequence || 1),
    sessionCount:Number(row.sessionCount || row.session_count || row.occurrence_session_count || 1),
    locked:Boolean(row.locked || row.humanDecision || row.human_decision || row.status === 'CONFIRMED')
    ,scopeDomain
    ,targetCode
    ,organisationUnit
    ,coverage:upper(row.coverage || (targetCode === 'SDIS-ALL' || normalizedArray(row.publicCodes || row.public_codes).includes('SDIS-ALL') ? 'SDIS_ALL' : 'PARTIAL'))
    ,activityClass:upper(row.activityClass || row.activity_class || 'GENERIC')
  };
}
function permutationCovers(candidate,other,sharedPublics,sharedWho,sharedRoles,sharedResources,sharedRoom) {
  if(!candidate.permutationAllowed && !other.permutationAllowed) return false;
  if(sharedRoles.length || sharedResources.length || sharedRoom.length || candidate.dayExclusive || other.dayExclusive) return false;
  if(!(candidate.sessionCount > 1 || other.sessionCount > 1)) return false;
  return sharedPublics.length > 0 || sharedWho.length > 0;
}
function compatibilityBetween(leftInput = {},rightInput = {}) {
  const left = normalizeSlot(leftInput);
  const right = normalizeSlot(rightInput);
  if(!left.date || !right.date || left.status === 'DISABLED' || right.status === 'DISABLED') return { state:'COMPATIBLE',causes:[],priorityWinner:null };
  const sameDay = calendarRangesOverlap(left,right);
  const timeOverlap = overlaps(left,right);
  const causes = [];
  const sameUnit=Boolean(left.organisationUnit && left.organisationUnit === right.organisationUnit);
  const populationComparable=!left.organisationUnit || !right.organisationUnit || sameUnit || left.coverage === 'SDIS_ALL' || right.coverage === 'SDIS_ALL';
  const classes=new Set([left.activityClass,right.activityClass]);
  const add=(code,severity,details = {}) => causes.push({ code,severity,...details });
  const exclusive=left.dayExclusive ? left : right.dayExclusive ? right : null;
  const other=exclusive === left ? right : left;
  const exclusiveScopeOverlap=Boolean(exclusive && (
    exclusive.coverage === 'SDIS_ALL' || other.coverage === 'SDIS_ALL' ||
    (exclusive.organisationUnit && exclusive.organisationUnit === other.organisationUnit) ||
    (!exclusive.organisationUnit && exclusive.targetCode && exclusive.targetCode === other.targetCode)
  ));
  if(sameDay && exclusiveScopeOverlap) add('DAY_EXCLUSIVE','BLOCKING',{ activity:exclusive.activityLabel,organisationUnit:exclusive.organisationUnit,targetCode:exclusive.targetCode,scopeAll:exclusive.coverage === 'SDIS_ALL' });
  if(timeOverlap && (left.coverage === 'SDIS_ALL' || right.coverage === 'SDIS_ALL')) add('SDIS_ALL_CONFLICT','BLOCKING');
  if(timeOverlap && sameUnit && left.coverage === 'FULL_OI' && right.coverage === 'FULL_OI' && left.scopeDomain === right.scopeDomain) add('FULL_OI_CONFLICT','BLOCKING',{ organisationUnit:left.organisationUnit });
  if(timeOverlap && sameUnit && classes.has('DPS_EXERCISE') && classes.has('JSP_EXERCISE')) add('JSP_DPS_DEPENDENCY','BLOCKING',{ organisationUnit:left.organisationUnit });
  if(timeOverlap && classes.has('PR_EXERCISE') && classes.has('DPS_EXERCISE')) add('PR_DPS_OVERLAP','DEROGABLE');
  if(timeOverlap && classes.has('DPS_GROUPED_TRAINING') && classes.has('PR_EXERCISE')) add('GROUPED_DPS_PR_ATTENTION','ATTENTION');
  const sharedPublics = timeOverlap && populationComparable ? intersects(left.publicCodes,right.publicCodes) : [];
  const sharedWho = timeOverlap && populationComparable ? intersects(left.whoCodes,right.whoCodes) : [];
  const sharedRoles = timeOverlap ? intersects(left.roleCodes,right.roleCodes) : [];
  const sharedResources = timeOverlap ? intersects(left.resourceCodes,right.resourceCodes) : [];
  const sharedRoom = timeOverlap && left.roomCode && left.roomCode === right.roomCode ? [left.roomCode] : [];
  if(sharedPublics.length) add('PUBLIC_CONFLICT','BLOCKING',{ publicCodes:sharedPublics,organisationUnit:left.organisationUnit || right.organisationUnit });
  if(sharedWho.length) add('WHO_CONFLICT','BLOCKING',{ whoCodes:sharedWho,organisationUnit:left.organisationUnit || right.organisationUnit });
  if(sharedRoles.length) add('ROLE_CONFLICT','BLOCKING',{ roleCodes:sharedRoles });
  if(sharedResources.length) add('RESOURCE_CONFLICT','BLOCKING',{ resourceCodes:sharedResources });
  if(sharedRoom.length) add('ROOM_CONFLICT','BLOCKING',{ roomCodes:sharedRoom });
  const priorityPair=Number(left.priority) <= 35 && Number(right.priority) <= 35;
  if(priorityPair){
    causes.forEach((cause) => {
      if(cause.severity === 'BLOCKING' && ['PUBLIC_CONFLICT','WHO_CONFLICT','ROLE_CONFLICT','RESOURCE_CONFLICT','ROOM_CONFLICT'].includes(cause.code)) cause.severity='DEROGABLE';
    });
  }
  const blocking=causes.filter((cause) => cause.severity === 'BLOCKING');
  const derogations=causes.filter((cause) => cause.severity === 'DEROGABLE');
  const attentions=causes.filter((cause) => cause.severity === 'ATTENTION');
  const permutationCauses=causes.filter((cause) => ['PUBLIC_CONFLICT','WHO_CONFLICT'].includes(cause.code));
  const waivedByPermutation = causes.length > 0 && causes.length === permutationCauses.length
    && permutationCovers(left,right,sharedPublics,sharedWho,sharedRoles,sharedResources,sharedRoom);
  const priorityWinner = blocking.length && Number(left.priority) !== Number(right.priority)
    ? (Number(left.priority) < Number(right.priority) ? left.activityLabel : right.activityLabel) : null;
  const state=waivedByPermutation ? 'COMPATIBLE' : blocking.length ? 'CONFLICT' : derogations.length ? 'DEROGABLE' : attentions.length ? 'ATTENTION' : 'COMPATIBLE';
  return { state,causes,priorityWinner,permutationApplied:waivedByPermutation,
    priorityPair,date:left.date,timeOverlap,sameDay,activityA:left.activityLabel,activityB:right.activityLabel,
    contextA:{ targetCode:left.targetCode,publicCodes:left.whoCodes,roleCodes:left.roleCodes,resourceCodes:left.resourceCodes,roomCode:left.roomCode,startTime:left.startTime,endTime:left.endTime,startDateTime:left.startDateTime,endDateTime:left.endDateTime },
    contextB:{ targetCode:right.targetCode,publicCodes:right.whoCodes,roleCodes:right.roleCodes,resourceCodes:right.resourceCodes,roomCode:right.roomCode,startTime:right.startTime,endTime:right.endTime,startDateTime:right.startDateTime,endDateTime:right.endDateTime },
    slotIds:[left.slotId,right.slotId].sort() };
}
function detectCompatibilityConflicts(slots = []) {
  const active=(slots || []).map(normalizeSlot).filter((row) => row.status !== 'DISABLED');
  const conflicts=[];
  for(let left=0;left<active.length;left+=1){
    for(let right=left+1;right<active.length;right+=1){
      const a=active[left]; const b=active[right];
      if(a.definitionCode && a.definitionCode === b.definitionCode && a.occurrenceNumber === b.occurrenceNumber && a.sessionSequence === b.sessionSequence) continue;
      const result = compatibilityBetween(a,b);
      if(result.state === 'CONFLICT') conflicts.push({ code:'COMPATIBILITY_CONFLICT',...result });
    }
  }
  return conflicts.sort((a,b) => a.date.localeCompare(b.date) || (a.activityA || '').localeCompare(b.activityA || '','fr'));
}
function explainConflict(conflict = {}) {
  const causes = conflict.causes || [];
  return causes.map(presentConstraintCause).join(' · ');
}
function presentConstraintCause(cause = {}) {
  const unit=cause.organisationUnit ? ` ${cause.organisationUnit}` : '';
  if(cause.code === 'FULL_OI_CONFLICT') return `L’unité d’intervention${unit} est déjà mobilisée dans son intégralité.`;
  if(cause.code === 'JSP_DPS_DEPENDENCY') return `Les moniteurs JSP du site${unit} sont mobilisés par l’exercice DPS du même site.`;
  if(cause.code === 'PR_DPS_OVERLAP') return 'Chevauchement déconseillé : un exercice PR est planifié en parallèle d’un exercice DPS.';
  if(cause.code === 'GROUPED_DPS_PR_ATTENTION') return 'Point d’attention : coordination des formateurs à vérifier entre la formation groupée DPS et l’exercice PR.';
  if(cause.code === 'SDIS_ALL_CONFLICT') return 'Une activité mobilisant l’ensemble du SDIS est déjà planifiée.';
  if(cause.code === 'ROLE_CONFLICT') return 'Responsable indispensable déjà mobilisé sur une autre activité.';
  if(cause.code === 'PUBLIC_CONFLICT') return `Population commune de l’unité${unit} mobilisée sur les deux activités.`;
  if(cause.code === 'WHO_CONFLICT') return `Ressource commune : personnel de l’unité${unit}.`;
  if(cause.code === 'DAY_EXCLUSIVE' && cause.scopeAll) return 'La journée est réservée à l’ensemble du SDIS.';
  if(cause.code === 'DAY_EXCLUSIVE' && cause.organisationUnit) return `La journée est réservée pour l’unité d’intervention${unit}.`;
  if(cause.code === 'DAY_EXCLUSIVE') return 'La journée est réservée pour cette cible.';
  if(cause.code === 'RESOURCE_CONFLICT') return 'Ressource indispensable déjà mobilisée sur une autre activité.';
  if(cause.code === 'ROOM_CONFLICT') return 'Salle ou emplacement déjà occupé sur cet horaire.';
  return 'Contrainte métier incompatible.';
}
function proposeBestDates(input = {}) {
  const max = Math.max(1,Math.min(3,Number(input.maxProposals || 3)));
  const year = Number(input.year || new Date().getUTCFullYear());
  const start = day(input.windowStart || `${year}-01-01`);
  const end = day(input.windowEnd || `${year}-12-31`);
  const duration = Number(input.durationMinutes || 120);
  const startTime = text(input.startTime || '19:00');
  const endTime = text(input.endTime || (duration === 150 ? '21:30' : '21:00'));
  const occupied = input.occupiedSlots || [];
  const candidates = [];
  for(let cursor = start; cursor <= end; cursor = addDays(cursor,1)){
    const dateValue = date(cursor);
    const calendar = evaluateCalendarDate(dateValue,input.calendarRules || input.rules || {},input.calendar || {});
    if(!calendar.allowed) continue;
    const slot = normalizeSlot({ ...input,date:dateValue,startTime,endTime,status:'PROPOSED' });
    const assessments = occupied.map((other) => compatibilityBetween(other,slot));
    const conflicts = assessments.filter((row) => row.state === 'CONFLICT');
    if(conflicts.length) continue;
    const warnings=assessments.filter((row) => row.state === 'DEROGABLE');
    const attentions=assessments.filter((row) => row.state === 'ATTENTION');
    candidates.push({ proposalId:id('C19-PROPOSAL',input.definitionCode || input.activityLabel,dateValue,startTime,endTime),
      date:dateValue,startTime,endTime,siteCode:slot.siteCode,score:calendar.score + warnings.length * 30 + attentions.length * 5,
      compatibility:warnings.length ? 'DEROGABLE' : attentions.length ? 'ATTENTION' : 'COMPATIBLE',
      reasons:calendar.reasons.concat(warnings.concat(attentions).map(explainConflict)).filter(Boolean).length ? calendar.reasons.concat(warnings.concat(attentions).map(explainConflict)).filter(Boolean) : ['contraintes satisfaites'],slot });
  }
  candidates.sort((a,b) => a.score - b.score || a.date.localeCompare(b.date));
  return candidates.slice(0,max);
}

function validateMove(input = {}) {
  const moving = normalizeSlot(input.moving || {});
  if(moving.fixedDate || moving.locked){
    return { allowed:false,state:'CONFLICT',level:'BLOCKING',code:'MOVE_LOCKED',message:'Cette activité possède une date fixée et ne peut pas être déplacée.' };
  }
  const targetDate = text(input.targetDate).slice(0,10);
  const calendar = evaluateCalendarDate(targetDate,input.calendarRules || {},input.calendar || {});
  if(!calendar.allowed){
    return { allowed:false,state:'CONFLICT',level:'BLOCKING',code:'MOVE_CALENDAR_CONFLICT',calendar,message:calendar.reasons.join(' · ') || 'Date interdite par les règles calendaires.' };
  }
  const movingStart=intervalStart(moving); const movingEnd=intervalEnd(moving);
  const durationMs=Number.isFinite(movingStart) && Number.isFinite(movingEnd) ? movingEnd-movingStart : 0;
  const candidateStart=Date.parse(`${targetDate}T${moving.startTime}:00Z`);
  const candidateEnd=Number.isFinite(candidateStart) && durationMs > 0 ? new Date(candidateStart+durationMs).toISOString().slice(0,16) : `${targetDate}T${moving.endTime}`;
  const candidate = { ...moving,date:targetDate,startDateTime:`${targetDate}T${moving.startTime}`,endDateTime:candidateEnd,endDate:candidateEnd.slice(0,10) };
  const assessments=(input.others || []).map((other) => compatibilityBetween(other,candidate));
  const conflicts=assessments.filter((row) => row.state === 'CONFLICT');
  if(conflicts.length) return { allowed:false,state:'CONFLICT',level:'BLOCKING',code:'MOVE_CONFLICT',conflicts,primaryAssessment:conflicts[0],message:explainConflict(conflicts[0]) };
  const derogations=assessments.filter((row) => row.state === 'DEROGABLE');
  const departurePriority=Boolean(input.priorityDate);
  if((derogations.length || departurePriority) && !input.confirmDerogation && !input.confirmConstraint && !input.confirmPriority){
    const assessment=derogations[0] || null;
    return { allowed:false,state:'DEROGABLE',level:'DEROGABLE',code:assessment?'MOVE_DEROGATION_REQUIRED':'PRIORITY_CONFIRMATION_REQUIRED',requiresConfirmation:true,
      confirmationLabel:'Déroger et déplacer',derogations,primaryAssessment:assessment,
      message:assessment?explainConflict(assessment):'Cette activité occupe une date prioritaire. Sa modification demande une décision explicite.' };
  }
  const attentions=assessments.filter((row) => row.state === 'ATTENTION');
  const derogationConfirmed=Boolean(derogations.length || departurePriority);
  const audit=derogationConfirmed ? {
    type:'MOVE_DEROGATION',confirmed:true,decision:'DEROGATE_AND_MOVE',movingSlotId:moving.slotId,targetDate,
    constraintCodes:unique(derogations.flatMap((row) => row.causes.filter((cause) => cause.severity === 'DEROGABLE').map((cause) => cause.code)).concat(departurePriority?['PRIORITY_DATE_CHANGE']:[])),
    decidedAt:text(input.decisionTimestamp) || new Date().toISOString()
  } : null;
  const permutation=assessments.find((row) => row.permutationApplied) || null;
  return { allowed:true,state:derogationConfirmed ? 'DEROGABLE' : attentions.length ? 'ATTENTION' : 'COMPATIBLE',level:derogationConfirmed?'DEROGABLE':attentions.length?'ATTENTION':'COMPATIBLE',code:'MOVE_ALLOWED',candidate,assessments,derogations,attentions,
    primaryAssessment:derogations[0] || attentions[0] || permutation,derogation:audit,
    message:derogations.length ? explainConflict(derogations[0]) : departurePriority ? 'Déplacement depuis une date prioritaire confirmé.' : attentions.length ? explainConflict(attentions[0]) : permutation ? 'Date compatible grâce à la permutation entre sessions.' : 'Date compatible.' };
}

function proposeAnnualSchedule(input = {}){
  const config = annualConfiguration(input.profile,input.override);
  if(!config.valid || config.value.state === 'INACTIVE') return { valid:config.valid,errors:config.errors,slots:[],operationalWrites:false,eventPublication:false };
  const sessions = (input.sessions || [{ code:'S1',sequence:1,durationMinutes:120 }]).slice().sort((a,b) => Number(a.sequence)-Number(b.sequence));
  const start = nextWeekday(day(input.windowStart || `${input.year}-01-15`));
  const occupied = input.occupiedSlots || [];
  const slots = [];
  let cursor=start;
  for(let occurrence=1; occurrence<=config.value.occurrences; occurrence+=1){
    for(const session of sessions){
      for(const site of config.value.sites){
        const duration=Number(session.durationMinutes || session.duration_minutes || 120);
        let candidate={ date:date(cursor),startTime:text(input.startTime || '19:30'),endTime:text(input.endTime || (duration > 120 ? '22:00' : '21:30')) };
        while(occupied.concat(slots).some((row) => row.siteCode === site && overlaps(row,candidate))){ cursor=nextWeekday(addDays(cursor,1)); candidate={ ...candidate,date:date(cursor) }; }
        const complement = text(session.labelComplement || input.labelComplement);
        const slotDuration = durationMinutes(candidate.startTime,candidate.endTime);
        slots.push({ slotId:id('C18-SLOT',input.definitionCode,input.year,occurrence,site,session.code),definitionCode:input.definitionCode,
          activityLabel:input.activityLabel,occurrenceNumber:occurrence,sessionSequence:Number(session.sequence),sessionCount:sessions.length,
          sessionCode:upper(session.code),sessionLabel:text(session.label || session.code),siteCode:site,
          ...candidate,durationMinutes:slotDuration,durationLabel:durationLabel(slotDuration),labelComplement:complement || null,
          finalLabel:scheduledActivityLabel(input.activityLabel,occurrence,session.sequence,sessions.length,complement),
          status:'PROPOSED',publicCodes:normalizedArray(input.publicCodes),location:text(input.location) || null,responsible:text(input.responsible) || null });
      }
      cursor=nextWeekday(addDays(cursor,1));
    }
  }
  return { valid:true,errors:[],slots,operationalWrites:false,eventPublication:false };
}

function detectPublicConflicts(slots = []){
  const active=(slots || []).filter((row) => upper(row.status || 'PROPOSED') !== 'DISABLED');
  const conflicts=[];
  for(let left=0;left<active.length;left+=1){
    for(let right=left+1;right<active.length;right+=1){
      const a=active[left]; const b=active[right];
      if(a.definitionCode === b.definitionCode && a.occurrenceNumber === b.occurrenceNumber
        && Number(a.sessionSequence || 1) === Number(b.sessionSequence || 1)) continue;
      const publics=normalizedArray(a.publicCodes).filter((code) => normalizedArray(b.publicCodes).includes(code));
      if(publics.length && overlaps(a,b)) conflicts.push({ code:'PUBLIC_CONFLICT',activityA:a.activityLabel || a.definitionCode,activityB:b.activityLabel || b.definitionCode,
        date:a.date,startTime:a.startTime,endTime:a.endTime,publicCodes:publics,slotIds:[a.slotId,b.slotId].sort() });
    }
  }
  return conflicts.sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.activityA.localeCompare(b.activityA,'fr'));
}

module.exports={ CONVERGENCE_ACTIONS,PROGRAM_STATES,SLOT_STATES,fingerprint,numberedLabel,durationMinutes,durationLabel,finalActivityLabel,
  numberedActivityLabel,scheduledActivityLabel,programmeActivityPresentation,allocateActivityCode,buildConvergenceMatrix,normalizeFunctionalProfile,annualConfiguration,proposeAnnualSchedule,
  normalizeCalendarRules,evaluateCalendarDate,compatibilityBetween,detectCompatibilityConflicts,explainConflict,proposeBestDates,
  detectPublicConflicts,validateMove,presentConstraintCause,progressFobaLevel,canonicalFobaResponsibility,COMPATIBILITY_STATES };
