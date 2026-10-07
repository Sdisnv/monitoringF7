'use strict';

const db = require('./_postgres');
const { HttpError } = require('./_scope-rules');
const { inspectCanonicalReadiness } = require('./_scope-canonical-readiness');
const annualCatalogCore = require('./_scope-annual-catalog');
const { prepareAnnualRequirementReady,generateAnnualProgram,projectToQuoVadis,validateThemeAssignments } = annualCatalogCore;
const catalogImport = require('./_scope-annual-catalog-import');
const functionalCatalog = require('./_scope-functional-catalog');
const participationCatalog = require('./_scope-participation-catalogue');
const annualReport = require('./_scope-annual-report-rule');
const canonicalProgramme2027 = require('./data/scope-qv-programme-2027.json');

const INITIAL_ACTIVITY_CODES = Object.freeze([
  'DPS-EXERCICE','DPS-INSTRUCTION-SECTION','DPS-INSTRUCTION-DEMI-SECTION','DPS-DAP-EXERCICE',
  'DAP-EXERCICE','JSP-EXERCICE','PR-EXERCICE-PAPR','PR-PISTE-GAZ','PR-TEST-PHYSIQUE'
]);
const DOMAIN_ORDER = Object.freeze(['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']);
const PLANNING_MODES = Object.freeze(['AUTOMATIC','ANNUAL_DATE','ARBITRATION','NON_RENEWED']);
const BUSINESS_DOMAINS = Object.freeze(['F0','F1','F2','F3','F4','F5','F6','F7','F8']);
const WEEKDAYS = Object.freeze(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']);
function domainRank(code){ const index = DOMAIN_ORDER.indexOf(text(code).toUpperCase()); return index < 0 ? DOMAIN_ORDER.length : index; }

function text(value){ return String(value == null ? '' : value).trim(); }
function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0,10);
  return String(value).slice(0,10);
}
function dateForYear(value,year){
  const result = dateOnly(value);
  return result && Number(result.slice(0,4)) === Number(year) ? result : null;
}
const canonicalCatalog2027 = (() => {
  const rows = functionalCatalog.programmeActivityPresentation(canonicalProgramme2027.rows.filter((row) => !row.external));
  const grouped = new Map();
  rows.forEach((row) => {
    if(!grouped.has(row.definitionId)) grouped.set(row.definitionId,[]);
    grouped.get(row.definitionId).push(row);
  });
  return new Map([...grouped].map(([definitionId,items]) => [definitionId,{
    displayLabel:items[0].activityLabel || items[0].label,
    canonicalOccurrenceCount:new Set(items.map((row) => row.occurrenceId)).size,
    canonicalSessionCount:Math.max(...items.map((row) => Number(row.sessionCount || 1))),
    exerciseCode:null,
    statComCodes:[...new Set(items.map((row) => row.statCom).filter(Boolean))],
    canonicalOis:[...new Set(items.flatMap((row) => row.ois || []))],
    canonicalPublics:[...new Set(items.flatMap((row) => row.publics || []))]
  }]));
})();
function integer(value){ const parsed = Number(value); return Number.isInteger(parsed) ? parsed : null; }
function actorId(actor){ return text(actor && (actor.sub || actor.subject || actor.email)) || 'scope-user'; }
function rows(result){ return result && Array.isArray(result.rows) ? result.rows : []; }
function one(result){ return rows(result)[0] || null; }
function strictTime(value){
  if(value == null || value === '') return null;
  const candidate = text(value).slice(0,5);
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(candidate)) throw new HttpError(422,'INVALID_TIME','L’heure doit respecter le format HH:MM.');
  return candidate;
}

function upperList(value){ return [...new Set((Array.isArray(value) ? value : []).map((item) => text(item).toUpperCase()).filter(Boolean))]; }
function optionalTime(value,allowMidnightEnd = false){
  if(value == null || value === '') return null;
  const candidate = text(value);
  if(allowMidnightEnd && candidate === '24:00') return candidate;
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(candidate)) throw new HttpError(422,'activite_horaire_invalide','L’horaire doit respecter HH:MM.');
  return candidate;
}
function canonicalRule(body = {},previous = {}){
  const value = (key) => Object.prototype.hasOwnProperty.call(body,key) ? body[key] : previous[key];
  const planningMode = text(value('planningMode')).toUpperCase() || null;
  const businessDomain = text(value('businessDomain')).toUpperCase() || null;
  const priorityKind = text(value('priorityKind')).toUpperCase() || null;
  const preferredWeekdays = upperList(value('preferredWeekdays'));
  const allowedWeekdays = upperList(value('allowedWeekdays'));
  const planningMonths = upperList(value('planningMonths'));
  const usualStart = optionalTime(value('usualStart'));
  const usualEnd = optionalTime(value('usualEnd'));
  const blockStart = optionalTime(value('blockStart'));
  const blockEnd = optionalTime(value('blockEnd'),true);
  if(planningMode && !PLANNING_MODES.includes(planningMode)) throw new HttpError(422,'activite_mode_planification_invalide','Le mode de planification est invalide.');
  if(businessDomain && !BUSINESS_DOMAINS.includes(businessDomain)) throw new HttpError(422,'activite_domaine_metier_invalide','Le domaine métier est invalide.');
  if(priorityKind && !['NORMAL','ABSOLUTE'].includes(priorityKind)) throw new HttpError(422,'activite_priorite_invalide','La priorité est invalide.');
  if([...preferredWeekdays,...allowedWeekdays].some((day) => !WEEKDAYS.includes(day))) throw new HttpError(422,'activite_jour_invalide','Le jour de planification est invalide.');
  if(planningMonths.some((month) => !/^(?:[1-9]|1[0-2])$/.test(month))) throw new HttpError(422,'activite_periode_invalide','La période de planification est invalide.');
  if(usualStart && usualEnd && usualStart >= usualEnd) throw new HttpError(422,'activite_horaire_invalide','L’horaire usuel doit avoir une fin postérieure au début.');
  if(Boolean(blockStart) !== Boolean(blockEnd) || blockStart && blockEnd !== '24:00' && blockStart >= blockEnd){
    throw new HttpError(422,'activite_blocage_invalide','La plage de blocage doit être complète et ordonnée.');
  }
  return { businessDomain,planningMode,priorityKind,preferredWeekdays,allowedWeekdays,planningMonths,usualStart,usualEnd,blockStart,blockEnd };
}
function groupExerciseOccurrences(activities = []){
  const groups = new Map();
  for(const row of activities){
    const match = text(row.label || row.displayLabel).match(/^(Exercice\b.*\s\d+)[.](\d+)$/i);
    const key = match ? `${row.domain}|${match[1]}` : `ROW|${row.code}`;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push({ row,match });
  }
  return [...groups.values()].map((items) => {
    if(items.length === 1 || !items[0].match) return items[0].row;
    items.sort((a,b) => Number(a.match[2])-Number(b.match[2]));
    const rows = items.map((item) => item.row);
    const first = rows[0];
    return {
      ...first,
      label:items[0].match[1],
      displayLabel:items[0].match[1],
      definitionCodes:rows.map((row) => row.code),
      occurrenceLabels:items.map((item) => `${item.match[1]}.${item.match[2]}`),
      canonicalOccurrenceCount:items.length,
      requiredOccurrences:items.length,
      canonicalSessionCount:Math.max(...rows.map((row) => Number(row.sessionCount || 1))),
      sessionCount:Math.max(...rows.map((row) => Number(row.sessionCount || 1))),
      statComCodes:[...new Set(rows.flatMap((row) => row.statComCodes || []))],
      publicCodes:[...new Set(rows.flatMap((row) => row.publicCodes || []))],
      participation:rows.every((row) => row.participation && row.participation.tracking === first.participation.tracking)
        ? first.participation : participationCatalog.serializeRule(null),
      defaultSites:[...new Set(rows.flatMap((row) => row.defaultSites || []))],
      siteCodes:[...new Set(rows.flatMap((row) => row.siteCodes || []))],
      exerciseCode:null
    };
  }).sort((a,b) => domainRank(a.domain)-domainRank(b.domain) || text(a.displayLabel || a.label).localeCompare(text(b.displayLabel || b.label),'fr',{ numeric:true }));
}
function slug(value){
  return text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,56);
}
function normalizeActivityInput(body = {},defaults = {}){
  const label = text(body.label ?? defaults.label);
  const primaryDomain = text(body.primaryDomain ?? body.domain ?? defaults.primaryDomain ?? defaults.domain).toUpperCase();
  const domainCodes = upperList(body.domainCodes || defaults.domainCodes || [primaryDomain]);
  if(primaryDomain && !domainCodes.includes(primaryDomain)) domainCodes.unshift(primaryDomain);
  const activityType = text(body.activityType ?? defaults.activityType ?? 'OTHER').toUpperCase();
  const periodicityType = text(body.periodicityType ?? defaults.periodicityType ?? 'ANNUAL').toUpperCase();
  const durationMinutes = integer(body.durationMinutes ?? defaults.durationMinutes ?? 120);
  const familyCode = text(body.familyCode ?? defaults.familyCode).toUpperCase() || null;
  if(!label || label.length > 180) throw new HttpError(422,'activite_libelle_invalide','Le libellé de l’activité est obligatoire et limité à 180 caractères.');
  if(!DOMAIN_ORDER.includes(primaryDomain) || domainCodes.some((code) => !DOMAIN_ORDER.includes(code))) throw new HttpError(422,'activite_domaines_invalides','Les domaines canoniques de l’activité sont invalides.');
  if(!annualCatalogCore.ACTIVITY_TYPES.includes(activityType)) throw new HttpError(422,'activite_type_invalide','Le type d’activité est invalide.');
  if(!annualCatalogCore.PERIODICITY_TYPES.includes(periodicityType)) throw new HttpError(422,'activite_periodicite_invalide','La périodicité est invalide.');
  if(!(durationMinutes > 0)) throw new HttpError(422,'activite_duree_invalide','La durée de séance doit être positive.');
  if(familyCode && familyCode === primaryDomain) throw new HttpError(422,'activite_famille_invalide','La famille technique ne doit pas dupliquer le domaine canonique.');
  const explicitSessionCount = integer(body.sessionCount);
  const sourceSessions = Array.isArray(body.sessionTemplates) ? body.sessionTemplates
    : explicitSessionCount != null ? [] : defaults.sessionTemplates || [];
  const sessionTemplates = sourceSessions.map((row,index) => ({
    code:text(row.code || `S${index + 1}`).toUpperCase(),sequence:integer(row.sequence) || index + 1,label:text(row.label || `${label} ${index + 1}`),
    durationMinutes:integer(row.durationMinutes ?? row.duration_minutes ?? durationMinutes),mandatory:row.mandatory !== false
  }));
  const sessionCount = explicitSessionCount ?? integer(defaults.sessionCount);
  const generatedSessions = sessionCount > 1 && !sessionTemplates.length
    ? Array.from({ length:sessionCount },(_,index) => ({ code:`S${index + 1}`,sequence:index + 1,label:`Séance ${index + 1}`,durationMinutes,mandatory:true }))
    : sessionTemplates;
  const profile = functionalCatalog.normalizeFunctionalProfile({
    recurrenceKind:body.recurrenceKind ?? defaults.recurrenceKind ?? (periodicityType === 'ONE_OFF' ? 'NON_RECURRENT' : 'RECURRENT'),
    defaultOccurrences:body.defaultOccurrences ?? defaults.defaultOccurrences ?? 1,
    defaultSites:body.defaultSites ?? defaults.defaultSites ?? [],ruleMode:body.ruleMode ?? defaults.ruleMode ?? 'GENERAL',customRule:body.customRule ?? defaults.customRule
  });
  if(!profile.valid) throw new HttpError(422,'activite_profil_invalide','La configuration permanente de l’activité est invalide.',{ errors:profile.errors });
  const businessRule = canonicalRule(body.businessRule || {},defaults.businessRule || {});
  const calendarRules = functionalCatalog.normalizeCalendarRules({
    ...(defaults.calendarRules || {}),priorityWeekdays:businessRule.preferredWeekdays,allowedWeekdays:businessRule.allowedWeekdays
  });
  return { label,description:text(body.description ?? defaults.description) || null,primaryDomain,domainCodes,activityType,periodicityType,
    durationMinutes,familyCode,publicCodes:upperList(body.publicCodes || defaults.publicCodes),statComCodes:upperList(body.statComCodes || defaults.statComCodes),
    qualificationCodes:upperList(body.qualificationCodes || defaults.qualificationCodes),themes:[...new Set((body.themes || defaults.themes || []).map(text).filter(Boolean))],
    sessionTemplates:generatedSessions.length ? generatedSessions : [{ code:'S1',sequence:1,label,durationMinutes,mandatory:true }],
    responsibleCode:text(body.responsibleCode ?? defaults.responsibleCode) || null,
    usualLocationCode:text(body.usualLocationCode ?? defaults.usualLocationCode) || null,
    usualRoomCode:text(body.usualRoomCode ?? defaults.usualRoomCode) || null,
    businessRule,calendarRules,...profile.value };
}

async function insertRequiredReference(client,referenceType,code,sql,params){
  const result = await client.query(sql,params);
  if(Number(result && result.rowCount || 0) !== 1){
    throw new HttpError(422,'reference_canonique_introuvable',`La référence canonique ${code} (${referenceType}) est introuvable ou inactive.`,{
      referenceType,code
    });
  }
}

async function insertActivityVersion(client,definition,input,actor,metadata = {},options = {}){
  await requireCanonicalCodes(client,input.defaultSites,'SITE');
  await requireCanonicalCodes(client,input.publicCodes,'PUBLIC');
  const profileMetadata = { ...(options.previousProfileMetadata || {}),...metadata,
    canonicalRule:input.businessRule,calendarRules:input.calendarRules };
  const next = Number((one(await client.query(`select coalesce(max((regexp_match(version_code,'([0-9]+)$'))[1]::integer),0)+1 as value from scope_event_definition_versions where definition_id=$1`,[definition.definition_id])) || {}).value || 1);
  const versionCode = `C15-V${next}`;
  const contract = { definition:{ activityType:input.activityType },domainBindings:input.domainCodes.map((code) => ({ domainCode:code,bindingRole:code === input.primaryDomain ? 'PRIMARY' : 'SECONDARY' })),
    sessionTemplates:input.sessionTemplates,periodicity:{ type:input.defaultOccurrences > 1 ? 'TIMES_PER_YEAR' : input.periodicityType,occurrencesPerCycle:input.defaultOccurrences > 1 ? input.defaultOccurrences : null },
    publicBindings:[],qualificationBindings:[],roleRequirements:[],planningConstraints:[],statisticalContributions:[] };
  const checked = annualCatalogCore.validateDefinitionContract(contract);
  if(!checked.valid) throw new HttpError(422,'activite_contrat_invalide','La définition de l’activité est incomplète.',{ errors:checked.errors });
  const versionFingerprint = annualCatalogCore.fingerprint({ ...input,metadata });
  const inserted = one(await client.query(
    `insert into scope_event_definition_versions(definition_id,version_code,status,description,fingerprint,metadata,created_at,updated_at)
     values ($1,$2,'DRAFT',$3,$4,$5::jsonb,now(),now()) returning definition_version_id`,
    [definition.definition_id,versionCode,input.description,versionFingerprint,JSON.stringify({ ...metadata,label:input.label })]));
  const versionId = inserted.definition_version_id;
  if(options.cloneFromVersionId){
    for(const code of input.domainCodes) await client.query(
      `insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata) values ($1,$2,$3,$4::jsonb)`,
      [versionId,code,code === input.primaryDomain ? 'PRIMARY' : 'SECONDARY',JSON.stringify(metadata)]);
    for(const session of input.sessionTemplates) await client.query(
      `insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,public_continuity,location_continuity,metadata)
       values ($1,$2,$3,$4,$5,$6,'INHERIT','INHERIT',$7::jsonb)`,
      [versionId,session.code,session.sequence,session.label,session.mandatory,session.durationMinutes,JSON.stringify(metadata)]);
    await client.query(`update scope_activity_session_templates child_new
      set depends_on_session_template_id=parent_new.session_template_id,
          min_offset_minutes=old_child.min_offset_minutes,max_offset_minutes=old_child.max_offset_minutes,
          public_continuity=old_child.public_continuity,location_continuity=old_child.location_continuity
      from scope_activity_session_templates old_child
      join scope_activity_session_templates old_parent on old_parent.session_template_id=old_child.depends_on_session_template_id
      join scope_activity_session_templates parent_new on parent_new.definition_version_id=$1 and parent_new.code=old_parent.code
      where child_new.definition_version_id=$1 and child_new.code=old_child.code and old_child.definition_version_id=$2`,
    [versionId,options.cloneFromVersionId]);
    await client.query(
      `insert into scope_activity_periodicities(definition_version_id,periodicity_type,occurrences_per_cycle,metadata)
       values ($1,$2,$3,$4::jsonb)`,[versionId,input.defaultOccurrences > 1 ? 'TIMES_PER_YEAR' : input.periodicityType,
        input.defaultOccurrences > 1 ? input.defaultOccurrences : null,JSON.stringify(metadata)]);
    for(const code of input.publicCodes) await insertRequiredReference(client,'PUBLIC',code,
      `insert into scope_activity_public_bindings(definition_version_id,public_definition_id,group_code,operator,binding_type,metadata)
       select $1,public_definition_id,'DEFAULT','UNION','TARGET',$3::jsonb from scope_public_definitions where code=$2 and status='ACTIVE'
       on conflict on constraint scope_activity_public_bindings_uk do nothing`,[versionId,code,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_qualification_bindings(definition_version_id,competence_id,binding_type,mandatory,metadata)
       select $1,competence_id,binding_type,mandatory,metadata || $3::jsonb from scope_activity_qualification_bindings where definition_version_id=$2`,
      [versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_role_requirements(definition_version_id,role_definition_id,qualification_competence_id,minimum_count,recommended_count,mandatory,metadata)
       select $1,role_definition_id,qualification_competence_id,minimum_count,recommended_count,mandatory,metadata || $3::jsonb
       from scope_activity_role_requirements where definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_location_requirements(definition_version_id,requirement_type,lieu_id,salle_id,location_category_id,alternative_group,minimum_count,mandatory,metadata)
       select $1,requirement_type,lieu_id,salle_id,location_category_id,alternative_group,minimum_count,mandatory,metadata || $3::jsonb
       from scope_activity_location_requirements where definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_responsible_requirements(definition_version_id,responsable_fonction_code,role_definition_id,qualification_competence_id,minimum_count,recommended_count,mandatory,metadata)
       select $1,responsable_fonction_code,role_definition_id,qualification_competence_id,minimum_count,recommended_count,mandatory,metadata || $3::jsonb
       from scope_activity_responsible_requirements where definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_planning_constraints(definition_version_id,session_template_id,code,constraint_type,severity,config,metadata)
       select $1,new_session.session_template_id,c.code,c.constraint_type,c.severity,c.config,c.metadata || $3::jsonb
       from scope_activity_planning_constraints c
       left join scope_activity_session_templates old_session on old_session.session_template_id=c.session_template_id
       left join scope_activity_session_templates new_session on new_session.definition_version_id=$1 and new_session.code=old_session.code
       where c.definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_statistical_contributions(definition_version_id,session_template_id,statcom_code,mode,value,aggregation_rule,metadata)
       select $1,new_session.session_template_id,c.statcom_code,c.mode,c.value,c.aggregation_rule,c.metadata || $3::jsonb
       from scope_activity_statistical_contributions c
       left join scope_activity_session_templates old_session on old_session.session_template_id=c.session_template_id
       left join scope_activity_session_templates new_session on new_session.definition_version_id=$1 and new_session.code=old_session.code
       where c.definition_version_id=$2 and ($4::boolean=false or c.statcom_code=any($5::text[]))`,
      [versionId,options.cloneFromVersionId,JSON.stringify(metadata),Boolean(options.replaceStatCom),input.statComCodes]);
    if(options.replaceStatCom) for(const code of input.statComCodes){
      const reference = one(await client.query(`select code from scope_statcom_referentiel where code=$1 and active=true`,[code]));
      if(!reference) throw new HttpError(422,'reference_canonique_introuvable',`Stat.Com ${code} introuvable ou inactif.`);
      await client.query(`insert into scope_activity_statistical_contributions(definition_version_id,statcom_code,mode,aggregation_rule,metadata)
        select $1,$2,'FULL_DURATION','PER_PARTICIPANT',$3::jsonb
        where not exists (select 1 from scope_activity_statistical_contributions where definition_version_id=$1 and statcom_code=$2)`,
      [versionId,code,JSON.stringify(metadata)]);
    }
    if(options.replaceResponsible){
      await client.query(`delete from scope_activity_responsible_requirements where definition_version_id=$1`,[versionId]);
      if(input.responsibleCode) await insertRequiredReference(client,'RESPONSABLE',input.responsibleCode,
        `insert into scope_activity_responsible_requirements(definition_version_id,responsable_fonction_code,metadata)
         select $1,code,$3::jsonb from scope_responsable_fonctions where code=$2 and actif=true`,[versionId,input.responsibleCode,JSON.stringify(metadata)]);
    }
    if(options.replaceLocation){
      await client.query(`delete from scope_activity_location_requirements where definition_version_id=$1`,[versionId]);
      if(input.usualLocationCode) await insertRequiredReference(client,'LIEU',input.usualLocationCode,
        `insert into scope_activity_location_requirements(definition_version_id,requirement_type,lieu_id,metadata)
         select $1,'EXACT_LOCATION',lieu_id,$3::jsonb from scope_lieux where code=$2 and actif=true`,[versionId,input.usualLocationCode,JSON.stringify(metadata)]);
      if(input.usualRoomCode) await insertRequiredReference(client,'SALLE',input.usualRoomCode,
        `insert into scope_activity_location_requirements(definition_version_id,requirement_type,salle_id,alternative_group,metadata)
         select $1,'EXACT_ROOM',salle_id,'ROOM',$3::jsonb from scope_salles_theorie where code=$2 and actif=true`,[versionId,input.usualRoomCode,JSON.stringify(metadata)]);
    }
    if(!options.deferActivation) await client.query(`update scope_event_definition_versions set status='ACTIVE',updated_at=now() where definition_version_id=$1 and status='DRAFT'`,[versionId]);
    await client.query(`insert into scope_activity_functional_profiles(definition_version_id,recurrence_kind,default_occurrences,default_sites,rule_mode,custom_rule,metadata)
      values ($1,$2,$3,$4::text[],$5,$6::jsonb,$7::jsonb)`,
    [versionId,input.recurrenceKind,input.defaultOccurrences,input.defaultSites,input.ruleMode,JSON.stringify(input.customRule),JSON.stringify(profileMetadata)]);
    return { definitionVersionId:versionId,versionCode,fingerprint:versionFingerprint };
  }
  for(const code of input.domainCodes) await client.query(
    `insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata) values ($1,$2,$3,$4::jsonb)`,
    [versionId,code,code === input.primaryDomain ? 'PRIMARY' : 'SECONDARY',JSON.stringify(metadata)]);
  for(const session of input.sessionTemplates) await client.query(
    `insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,public_continuity,location_continuity,metadata)
     values ($1,$2,$3,$4,$5,$6,'INHERIT','INHERIT',$7::jsonb)`,[versionId,session.code,session.sequence,session.label,session.mandatory,session.durationMinutes,JSON.stringify(metadata)]);
  await client.query(
    `insert into scope_activity_periodicities(definition_version_id,periodicity_type,occurrences_per_cycle,metadata) values ($1,$2,$3,$4::jsonb)`,
    [versionId,input.defaultOccurrences > 1 ? 'TIMES_PER_YEAR' : input.periodicityType,input.defaultOccurrences > 1 ? input.defaultOccurrences : null,JSON.stringify(metadata)]);
  for(const code of input.publicCodes) await insertRequiredReference(client,'PUBLIC',code,
    `insert into scope_activity_public_bindings(definition_version_id,public_definition_id,group_code,operator,binding_type,metadata)
     select $1,public_definition_id,'DEFAULT','UNION','TARGET',$3::jsonb from scope_public_definitions where code=$2 and status='ACTIVE'
     on conflict on constraint scope_activity_public_bindings_uk do nothing`,[versionId,code,JSON.stringify(metadata)]);
  for(const code of input.qualificationCodes) await insertRequiredReference(client,'QUALIFICATION',code,
    `insert into scope_activity_qualification_bindings(definition_version_id,competence_id,binding_type,mandatory,metadata)
     select $1,competence_id,'PREREQUISITE',true,$3::jsonb from scope_competence_definitions where code=$2 and actif=true
     on conflict (definition_version_id,competence_id,binding_type) do nothing`,[versionId,code,JSON.stringify(metadata)]);
  for(const code of input.statComCodes) await insertRequiredReference(client,'STAT_COM',code,
    `insert into scope_activity_statistical_contributions(definition_version_id,statcom_code,mode,aggregation_rule,metadata)
     select $1,code,'FULL_DURATION','PER_PARTICIPANT',$3::jsonb from scope_statcom_referentiel where code=$2 and active=true
     on conflict on constraint scope_activity_statistical_contributions_uk do nothing`,[versionId,code,JSON.stringify(metadata)]);
  await client.query(`insert into scope_activity_functional_profiles(definition_version_id,recurrence_kind,default_occurrences,default_sites,rule_mode,custom_rule,metadata)
    values ($1,$2,$3,$4::text[],$5,$6::jsonb,$7::jsonb)`,
  [versionId,input.recurrenceKind,input.defaultOccurrences,input.defaultSites,input.ruleMode,JSON.stringify(input.customRule),JSON.stringify(profileMetadata)]);
  if(!options.deferActivation) await client.query(`update scope_event_definition_versions set status='ACTIVE',updated_at=now() where definition_version_id=$1 and status='DRAFT'`,[versionId]);
  return { definitionVersionId:versionId,versionCode,fingerprint:versionFingerprint };
}

async function bindThemes(client,definitionId,themes,actor,metadata = {}){
  for(const label of themes || []){
    const normalized = annualCatalogCore.normalizeThemeLabel(label);
    const code = `QV26-${slug(label).slice(0,60)}-${annualCatalogCore.fingerprint(normalized).slice(0,6).toUpperCase()}`;
    const definition = one(await client.query(
      `insert into scope_theme_definitions(code,status,metadata,created_by,updated_by) values ($1,'ACTIVE',$2::jsonb,$3,$3)
       on conflict (code) do update set updated_at=scope_theme_definitions.updated_at returning theme_definition_id`,
      [code,JSON.stringify(metadata),actorId(actor)]));
    await client.query(
      `insert into scope_theme_versions(theme_definition_id,version_number,label,description,status,provenance,fingerprint,metadata,created_by,updated_by)
       values ($1,1,$2,null,'ACTIVE','QUO_VADIS_2026',$3,$4::jsonb,$5,$5) on conflict (theme_definition_id,version_number) do nothing`,
      [definition.theme_definition_id,label,annualCatalogCore.fingerprint({ label:normalized }),JSON.stringify(metadata),actorId(actor)]);
    await client.query(
      `insert into scope_activity_theme_bindings(definition_id,theme_definition_id,status,metadata,created_by,updated_by)
       values ($1,$2,'ACTIVE',$3::jsonb,$4,$4) on conflict (definition_id,theme_definition_id) do nothing`,
      [definitionId,definition.theme_definition_id,JSON.stringify(metadata),actorId(actor)]);
  }
}

function strictDate(value){
  if(value == null || value === '') return null;
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(422,'INVALID_DATE','La date doit respecter le format AAAA-MM-JJ.');
  const [year,month,day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31][month - 1] || 0;
  if(year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth) throw new HttpError(422,'INVALID_DATE','La date indiquée n’existe pas dans le calendrier.');
  return value;
}

function resolveAliasedField(input,camelKey,snakeKey,normalize){
  const hasCamel = Object.prototype.hasOwnProperty.call(input,camelKey);
  const hasSnake = Object.prototype.hasOwnProperty.call(input,snakeKey);
  const camelValue = hasCamel ? normalize(input[camelKey]) : undefined;
  const snakeValue = hasSnake ? normalize(input[snakeKey]) : undefined;
  if(hasCamel && hasSnake && JSON.stringify(camelValue) !== JSON.stringify(snakeValue)){
    throw new HttpError(422,'CONFLICTING_FIELD_ALIASES',`Les champs ${camelKey} et ${snakeKey} contiennent des valeurs contradictoires.`);
  }
  return hasCamel ? camelValue : hasSnake ? snakeValue : undefined;
}

function draftInputWithDefaults(body = {},defaults = {}){
  const merged = { year: body.year ?? defaults.year,priority: body.priority ?? defaults.priority };
  for(const [camelKey,snakeKey] of [['requiredOccurrences','required_occurrences'],['windowStart','window_start'],['windowEnd','window_end'],['variantCode','variant_code']]){
    if(Object.prototype.hasOwnProperty.call(body,camelKey)) merged[camelKey] = body[camelKey];
    if(Object.prototype.hasOwnProperty.call(body,snakeKey)) merged[snakeKey] = body[snakeKey];
    if(!Object.prototype.hasOwnProperty.call(body,camelKey) && !Object.prototype.hasOwnProperty.call(body,snakeKey)) merged[camelKey] = defaults[camelKey] ?? defaults[snakeKey];
  }
  return merged;
}

function validateDraftInput(body = {}){
  const year = integer(body.year);
  const requiredOccurrences = resolveAliasedField(body,'requiredOccurrences','required_occurrences',integer);
  const windowStart = resolveAliasedField(body,'windowStart','window_start',strictDate);
  const windowEnd = resolveAliasedField(body,'windowEnd','window_end',strictDate);
  const variantCode = resolveAliasedField(body,'variantCode','variant_code',(value) => text(value || 'DEFAULT').toUpperCase());
  if(!(year >= 2000 && year <= 2200)) throw new HttpError(422,'annee_invalide','L’année doit être comprise entre 2000 et 2200.');
  if(!(requiredOccurrences > 0)) throw new HttpError(422,'occurrences_invalides','Le besoin annuel doit contenir au moins une occurrence.');
  if(windowStart && windowEnd && windowStart > windowEnd) throw new HttpError(422,'fenetre_invalide','La fin de la fenêtre doit suivre son début.');
  return { year,requiredOccurrences,windowStart: windowStart || null,windowEnd: windowEnd || null,variantCode: variantCode || 'DEFAULT',priority: integer(body.priority) || 100 };
}

function readinessMessage(status){
  return status === 'SCHEMA_INCOMPATIBLE'
    ? 'Le schéma canonique est incomplet malgré ses marqueurs de migration. Une intervention opérateur est requise.'
    : 'Le catalogue annuel n’est pas encore activé sur cet environnement.';
}

function readyErrorMessage(errors){
  const codes = (errors || []).map((error) => error.code);
  if(codes.includes('MISSING_PUBLIC_RULE_VERSION')) return 'Une règle de public ACTIVE couvrant la fenêtre annuelle est requise.';
  if(codes.includes('AMBIGUOUS_PUBLIC_RULE_VERSION')) return 'Plusieurs règles de public couvrent la fenêtre annuelle. Un arbitrage est requis.';
  if(codes.includes('PUBLIC_DEFINITION_NOT_ACTIVE')) return 'Une définition de public liée à cette activité n’est pas ACTIVE.';
  if(codes.some((code) => code.includes('SESSION') || code === 'SESSION_TEMPLATE_REQUIRED')) return 'La configuration des sessions est incomplète ou incohérente.';
  if(codes.some((code) => code.includes('PERIODICITY'))) return 'La périodicité de cette activité doit être complétée avant validation.';
  return `Le besoin annuel ne peut pas passer à READY (${codes.join(', ') || 'contrat incomplet'}).`;
}

function readyTransitionMessages(errors){
  const codes = new Set((errors || []).map((error) => text(error && error.code)).filter(Boolean));
  const messages = [];
  const consume = (predicate,message) => {
    let matched = false;
    for(const code of [...codes]){
      if(predicate(code)){ codes.delete(code); matched = true; }
    }
    if(matched) messages.push(message);
  };
  consume((code) => code === 'MISSING_PUBLIC_RULE_VERSION','La règle de public applicable doit encore être validée.');
  consume((code) => code === 'AMBIGUOUS_PUBLIC_RULE_VERSION','Plusieurs règles de public sont applicables. Un arbitrage est nécessaire.');
  consume((code) => code === 'PUBLIC_DEFINITION_NOT_ACTIVE' || code === 'PUBLIC_DEFINITION_REQUIRED','Le public annuel doit encore être défini.');
  consume((code) => code.includes('SESSION'),'L’organisation des séances doit encore être complétée.');
  consume((code) => code.includes('PERIODICITY'),'La périodicité de l’activité doit encore être complétée.');
  consume((code) => code.includes('THEME'),'Les contenus annuels doivent encore être corrigés.');
  if(codes.size || !messages.length) messages.push('Le besoin annuel n’est pas encore prêt à être validé.');
  return [...new Set(messages)];
}

function readyTransitionMessage(errors){
  return readyTransitionMessages(errors).join(' ');
}

function toPublicReadyTransition(prepared){
  const allowed = Boolean(prepared && prepared.valid);
  return { allowed,message: allowed ? null : readyTransitionMessage(prepared && prepared.errors) };
}

function readinessForClient(readiness){
  const missing = readiness && readiness.missing || {};
  return {
    status: readiness && readiness.status || 'MIGRATION_REQUIRED',ready: Boolean(readiness && readiness.ready),
    migrations: (readiness && readiness.migrations || []).map((row) => ({ applied: Boolean(row.applied) })),
    missing: { migrations: (missing.migrations || []).length,structure: ['tables','columns','functions','triggers'].reduce((total,key) => total + (missing[key] || []).length,0) },
    incompatible: readiness && readiness.incompatible ? true : false,capabilities: readiness && readiness.capabilities || {}
  };
}

function publicRow(row){
  return { ...row,publicDefinitionId: row.public_definition_id,publicRuleVersionId: row.public_rule_version_id,publicCode: row.public_code };
}

async function loadCatalogReferences(database){
  const [publicResult,siteResult,statComResult,responsibleResult,locationResult,roomResult,qualificationResult,oiResult] = await Promise.all([
    database.query(`select p.code,p.label,p.owner_code from scope_public_definitions p
      where p.status='ACTIVE' and exists (select 1 from scope_public_rule_versions v where v.public_definition_id=p.public_definition_id and v.status='ACTIVE')
      order by p.owner_code,p.label,p.code`),
    database.query(`select code,nom_court,localite,oi_code from scope_lieux where actif=true and nullif(btrim(oi_code),'') is not null order by code`),
    database.query(`select code,label,domain from scope_statcom_referentiel where active=true order by code`),
    database.query(`select code,libelle from scope_responsable_fonctions where actif=true order by sort_order,libelle`),
    database.query(`select code,nom_court as label from scope_lieux where actif=true order by nom_court,code`),
    database.query(`select code,libelle as label from scope_salles_theorie where actif=true order by libelle,code`),
    database.query(`select code,libelle as label from scope_competence_definitions order by code`),
    database.query(`select code,libelle as label from scope_ois order by code`)
  ]);
  const siteOrder = ['G1','C1','B1','B2','Y1','Y2','Y3','Y4'];
  const sites = rows(siteResult).filter((row) => siteOrder.includes(text(row.oi_code).toUpperCase()))
    .sort((a,b) => siteOrder.indexOf(text(a.oi_code).toUpperCase()) - siteOrder.indexOf(text(b.oi_code).toUpperCase()))
    .map((row) => ({ code:text(row.oi_code).toUpperCase(),locationCode:row.code,label:[row.nom_court,row.localite].filter(Boolean).join(' – ') }));
  return { publics:rows(publicResult).map((row) => ({ code:row.code,label:row.label,domain:row.owner_code })),sites,
    statCom:rows(statComResult),responsibles:rows(responsibleResult).map((row) => ({ code:row.code,label:row.libelle })),
    locations:rows(locationResult),rooms:rows(roomResult),qualifications:rows(qualificationResult),ois:rows(oiResult) };
}

async function requireCanonicalCodes(database,codes,kind){
  const values = upperList(codes);
  if(!values.length) return values;
  const result = kind === 'PUBLIC'
    ? await database.query(`select code from scope_public_definitions where status='ACTIVE' and code=any($1::text[])`,[values])
    : await database.query(`select distinct upper(oi_code) as code from scope_lieux where actif=true and upper(oi_code)=any($1::text[])`,[values]);
  const found = new Set(rows(result).map((row) => text(row.code).toUpperCase()));
  const missing = values.filter((code) => !found.has(code));
  if(missing.length) throw new HttpError(422,'reference_canonique_introuvable',`Référence(s) ${kind === 'PUBLIC' ? 'de public' : 'de site/OI'} invalide(s): ${missing.join(', ')}.`,{ kind,codes:missing });
  return values;
}

async function requireReady(database,readinessInspector){
  const readiness = await readinessInspector({ database });
  const clientReadiness = readinessForClient(readiness);
  if(!readiness.ready) throw new HttpError(503,'catalogue_annuel_indisponible',readinessMessage(readiness.status),{ readiness: clientReadiness });
  return clientReadiness;
}

async function persistedImportDecisions(database,sourceSha256){
  return rows(await database.query(
    `select d.proposal_id,d.decision as action,target.code as target_definition_code,d.comment
       from scope_catalog_import_decisions d left join scope_event_definitions target on target.definition_id=d.target_definition_id
      where d.source_sha256=$1 and d.payload ? 'humanDecision' order by d.decided_at,d.import_decision_id`,[sourceSha256]))
    .map((row) => ({ proposalId:row.proposal_id,action:row.action,targetDefinitionCode:row.target_definition_code || null,comment:row.comment || null }));
}

async function findDefinition(database,code,options = {}){
  const statuses = options.includeArchived ? ['ACTIF','ARCHIVE'] : ['ACTIF'];
  return one(await database.query(
    `select d.definition_id,d.code,d.label,d.domain,d.family_code,d.activity_type,(d.status='ACTIF') as active,d.metadata as definition_metadata,
            v.definition_version_id,v.version_code,v.status as version_status,v.description,v.fingerprint as version_fingerprint,v.metadata as version_metadata
       from scope_event_definitions d
       join scope_event_definition_versions v on v.definition_id=d.definition_id and v.status='ACTIVE'
      where d.code=$1 and d.status=any($2::text[])
        and exists (select 1 from scope_activity_domain_bindings b where b.definition_version_id=v.definition_version_id and b.binding_role='PRIMARY')
        and exists (select 1 from scope_activity_session_templates s where s.definition_version_id=v.definition_version_id)
        and exists (select 1 from scope_activity_periodicities p where p.definition_version_id=v.definition_version_id)
      order by v.valid_from desc nulls last,v.version_code desc limit 1`, [text(code).toUpperCase(),statuses]));
}

async function requireScopedRequirement(database,requirementId){
  const requirement = one(await database.query(
    `select r.*,d.code as definition_code
       from scope_annual_requirements r
       join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id
       join scope_event_definitions d on d.definition_id=v.definition_id
      where r.annual_requirement_id=$1 and d.status='ACTIF' and v.status='ACTIVE'
        and exists (select 1 from scope_activity_domain_bindings b where b.definition_version_id=v.definition_version_id and b.binding_role='PRIMARY')
        and exists (select 1 from scope_activity_session_templates s where s.definition_version_id=v.definition_version_id)
        and exists (select 1 from scope_activity_periodicities p where p.definition_version_id=v.definition_version_id)`, [requirementId]));
  if(!requirement) throw new HttpError(404,'besoin_annuel_introuvable','Besoin annuel introuvable.');
  return requirement;
}

async function loadContext(database,options = {}){
  let base;
  if(options.requirementId){
    base = one(await database.query(
      `select d.definition_id,d.code,d.label,d.domain,d.family_code,d.activity_type,(d.status='ACTIF') as active,d.metadata as definition_metadata,
              v.definition_version_id,v.version_code,v.status as version_status,v.description,v.fingerprint as version_fingerprint,v.metadata as version_metadata,
              r.*
         from scope_annual_requirements r join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id
         join scope_event_definitions d on d.definition_id=v.definition_id
        where r.annual_requirement_id=$1 and d.status='ACTIF' and v.status='ACTIVE'`, [options.requirementId]));
  }else{
    const definition = await findDefinition(database,options.code,{ includeArchived:true });
    if(!definition) return null;
    const requirement = one(await database.query(
      `select * from scope_annual_requirements where definition_version_id=$1 and year=$2 and status in ('DRAFT','READY') order by updated_at desc limit 1`,
      [definition.definition_version_id,options.year]));
    base = { ...definition,...(requirement || {}) };
  }
  if(!base) return null;
  const versionId = base.definition_version_id;
  const requirementId = base.annual_requirement_id || null;
  const query = (sql,params = [versionId]) => database.query(sql,params).then(rows);
  const domainBindings = await query(`select domain_code,binding_role,metadata from scope_activity_domain_bindings where definition_version_id=$1 order by case binding_role when 'PRIMARY' then 0 else 1 end,domain_code`);
  const sessionTemplates = await query(`select * from scope_activity_session_templates where definition_version_id=$1 order by sequence`);
  const periodicity = one(await database.query(`select * from scope_activity_periodicities where definition_version_id=$1`,[versionId]));
  const functionalProfile = one(await database.query(`select * from scope_activity_functional_profiles where definition_version_id=$1`,[versionId]));
  const publicBindings = (await query(
    `select b.*,p.code as public_code,p.label as public_label from scope_activity_public_bindings b join scope_public_definitions p on p.public_definition_id=b.public_definition_id where b.definition_version_id=$1 order by p.code`
  )).map(publicRow);
  const qualificationBindings = await query(
    `select b.*,c.code as competence_code,c.libelle as competence_label from scope_activity_qualification_bindings b join scope_competence_definitions c on c.competence_id=b.competence_id where b.definition_version_id=$1 order by b.binding_type,c.code`
  );
  const roleRequirements = await query(
    `select r.*,d.code as role_code,d.label as role_label,c.code as competence_code from scope_activity_role_requirements r join scope_event_role_definitions d on d.event_role_definition_id=r.role_definition_id left join scope_competence_definitions c on c.competence_id=r.qualification_competence_id where r.definition_version_id=$1 order by d.code`
  );
  const locationRequirements = await query(
    `select r.*,c.code as location_category_code,c.label as location_category_label,l.code as lieu_code,s.code as salle_code
       from scope_activity_location_requirements r left join scope_location_categories c on c.location_category_id=r.location_category_id
       left join scope_lieux l on l.lieu_id=r.lieu_id left join scope_salles_theorie s on s.salle_id=r.salle_id
      where r.definition_version_id=$1 order by r.alternative_group,r.requirement_type`
  );
  const responsibleRequirements = await query(`select r.*,f.libelle as responsable_fonction_label from scope_activity_responsible_requirements r
    left join scope_responsable_fonctions f on f.code=r.responsable_fonction_code where r.definition_version_id=$1 order by r.created_at`);
  const planningConstraints = await query(`select planning_constraint_id,session_template_id,code,constraint_type,severity,config,metadata from scope_activity_planning_constraints where definition_version_id=$1 order by code`);
  const statisticalContributions = await query(`select * from scope_activity_statistical_contributions where definition_version_id=$1 order by statcom_code`);
  const activityThemeBindings = await query(
    `select b.*,td.code,tv.theme_version_id,tv.version_number,tv.label,tv.description,tv.status as theme_version_status,tv.fingerprint
       from scope_activity_theme_bindings b join scope_theme_definitions td on td.theme_definition_id=b.theme_definition_id
       join scope_theme_versions tv on tv.theme_definition_id=td.theme_definition_id and tv.status='ACTIVE'
      where b.definition_id=$1 and b.status='ACTIVE' and td.status='ACTIVE' order by tv.label`,[base.definition_id]);
  const themeAssignments = requirementId ? await query(
    `select a.*,td.theme_definition_id,td.code,tv.label,tv.version_number,tv.status as theme_version_status
       from scope_annual_requirement_theme_assignments a left join scope_theme_versions tv on tv.theme_version_id=a.theme_version_id
       left join scope_theme_definitions td on td.theme_definition_id=tv.theme_definition_id
      where a.annual_requirement_id=$1 order by a.occurrence_number,a.sort_order,a.created_at`,[requirementId]) : [];
  const occurrences = requirementId ? await query(`select * from scope_planned_occurrences where annual_requirement_id=$1 order by occurrence_number`,[requirementId]) : [];
  const occurrenceIds = occurrences.map((row) => row.planned_occurrence_id);
  const sessions = occurrenceIds.length ? await query(`select * from scope_planned_occurrence_sessions where planned_occurrence_id=any($1::uuid[]) order by planned_occurrence_id,sequence`,[occurrenceIds]) : [];
  const sessionIds = sessions.map((row) => row.planned_occurrence_session_id);
  let siteSlots = sessionIds.length ? await query(
    `select slots.*,po.occurrence_number,pos.sequence as session_sequence,st.code as session_code,st.label as session_label,
            max(pos.sequence) over (partition by po.planned_occurrence_id) as occurrence_session_count,
            case when slots.preferred_start_time is not null and slots.preferred_end_time is not null and slots.preferred_end_time>slots.preferred_start_time
              then extract(epoch from (slots.preferred_end_time-slots.preferred_start_time))::integer/60 else null end as duration_minutes
       from scope_planned_site_slots slots
       join scope_planned_occurrence_sessions pos on pos.planned_occurrence_session_id=slots.planned_occurrence_session_id
       join scope_planned_occurrences po on po.planned_occurrence_id=pos.planned_occurrence_id
       left join scope_activity_session_templates st on st.session_template_id=pos.session_template_id
      where slots.planned_occurrence_session_id=any($1::uuid[])
      order by po.occurrence_number,pos.sequence,slots.site_code`,[sessionIds]) : [];
  const programEntry = requirementId ? one(await database.query(`select * from scope_annual_program_entries where annual_requirement_id=$1`,[requirementId])) : null;
  const definitionPublicCodes = publicBindings.map((row) => row.publicCode);
  siteSlots = siteSlots.map((slot) => {
    const publicCodes = upperList(slot.public_codes && slot.public_codes.length ? slot.public_codes : definitionPublicCodes);
    const finalLabel = functionalCatalog.scheduledActivityLabel(base.label,slot.occurrence_number,slot.session_sequence,slot.occurrence_session_count,slot.label_complement);
    return { ...slot,public_codes:publicCodes,effective_public_codes:publicCodes,public_source:slot.public_codes && slot.public_codes.length ? 'SLOT_OVERRIDE' : 'DEFINITION',final_label:finalLabel };
  });
  const expectedSites = upperList(programEntry && programEntry.site_codes || functionalProfile && functionalProfile.default_sites || []);
  const completeSlot = (slot) => slot.status !== 'DISABLED' && slot.preferred_date && slot.preferred_start_time && slot.preferred_end_time
    && slot.site_code && slot.effective_public_codes.length;
  const preparedOccurrenceCount = occurrences.filter((occurrence) => {
    const occurrenceSessions = sessions.filter((session) => session.planned_occurrence_id === occurrence.planned_occurrence_id);
    return occurrenceSessions.length > 0 && occurrenceSessions.every((session) => expectedSites.every((site) =>
      siteSlots.some((slot) => slot.planned_occurrence_session_id === session.planned_occurrence_session_id && slot.site_code === site && completeSlot(slot))));
  }).length;
  return {
    definition: { definitionId: base.definition_id,code: base.code,label: base.label,domain: base.domain,familyCode: base.family_code,activityType: base.activity_type,active: base.active,metadata: base.definition_metadata || {} },
    version: { definitionVersionId: versionId,versionCode: base.version_code,status: base.version_status,description: base.description,fingerprint: base.version_fingerprint,metadata: base.version_metadata || {} },
    requirement: requirementId ? {
      annualRequirementId: requirementId,year: base.year,definitionVersionId: versionId,variantCode: base.variant_code,
      requiredOccurrences: base.required_occurrences,windowStart: dateOnly(base.window_start),windowEnd: dateOnly(base.window_end),priority: base.priority,
      status: base.status,sourceType: base.source_type,sourceId: base.source_id,supersedesAnnualRequirementId: base.supersedes_annual_requirement_id,
      snapshot: base.snapshot || {},fingerprint: base.fingerprint || null,metadata: base.metadata || {}
    } : null,
    domainBindings,sessionTemplates,periodicity,publicBindings,qualificationBindings,roleRequirements,locationRequirements,
    responsibleRequirements,planningConstraints,statisticalContributions,activityThemeBindings,functionalProfile,programEntry,siteSlots,
    availableThemes: activityThemeBindings.map((row) => ({ themeVersionId: row.theme_version_id,themeDefinitionId: row.theme_definition_id,
      definitionId: base.definition_id,code: row.code,label: row.label,description: row.description,status: row.theme_version_status,versionNumber: row.version_number })),
    themeAssignments,occurrences,sessions,preparedOccurrenceCount
  };
}

function serializeContext(context,readiness,readyTransition,references){
  return { readiness,readyTransition,activity: { ...context.definition,version: context.version },annualRequirement: context.requirement,
    approvedRule:context.definition.code === annualReport.DEFINITION_CODE && !context.functionalProfile
      ? { ...annualReport.APPROVED_RULE,recurrenceKind:'RECURRENT',publicCode:'SDIS-TOUS',statCom:annualReport.STAT_COM } : null,
    references:references || { publics:[],sites:[] },
    configuration: { domains: context.domainBindings,sessions: context.sessionTemplates,periodicity: context.periodicity,publics: context.publicBindings,
      pinnedPublics: context.requirement && context.requirement.snapshot && context.requirement.snapshot.publicBindings || [],
      qualifications: context.qualificationBindings,roles: context.roleRequirements,locations: context.locationRequirements,responsibles: context.responsibleRequirements,
      constraints: context.planningConstraints,statCom: context.statisticalContributions,availableThemes: context.availableThemes,functionalProfile: context.functionalProfile },
    annualThemeAssignments: context.themeAssignments,
    annualProgramEntry: context.programEntry,siteSlots: context.siteSlots || [],
    generation: { occurrences: context.occurrences,sessions: context.sessions,preparedOccurrenceCount: context.preparedOccurrenceCount || 0 } };
}

async function inspectReadyTransition(database,context){
  const requirement = context && context.requirement;
  if(!requirement || requirement.status !== 'DRAFT') return { allowed: false,message: null };
  try{
    const publicIds = [...new Set((context.publicBindings || []).map((row) => row.publicDefinitionId).filter(Boolean))];
    const publicDefinitions = publicIds.length
      ? rows(await database.query(`select * from scope_public_definitions where public_definition_id=any($1::uuid[])`,[publicIds])) : [];
    const publicRuleVersions = publicIds.length
      ? rows(await database.query(`select * from scope_public_rule_versions where public_definition_id=any($1::uuid[])`,[publicIds])) : [];
    const prepared = prepareAnnualRequirementReady({ ...context,publicDefinitions,publicRuleVersions,themeVersions: context.availableThemes });
    return toPublicReadyTransition(prepared);
  }catch(_error){
    return { allowed: false,message: 'La validation du besoin est momentanément indisponible.' };
  }
}

function createScopeAnnualCatalogService(options = {}){
  const database = options.database || db;
  const readinessInspector = options.readinessInspector || inspectCanonicalReadiness;
  const contextLoader = options.contextLoader || loadContext;
  const definitionFinder = options.definitionFinder || findDefinition;
  return {
    readiness: async () => readinessForClient(await readinessInspector({ database })),

    async listCatalog(filters = {}){
      const readiness = readinessForClient(await readinessInspector({ database }));
      if(!readiness.ready) return { readiness,year: integer(filters.year) || new Date().getUTCFullYear(),activities: [] };
      const year = integer(filters.year) || new Date().getUTCFullYear();
      const archiveMode = text(filters.archives).toUpperCase();
      const definitionStatuses = archiveMode === 'UNIQUEMENT' ? ['ARCHIVE'] : archiveMode === 'AVEC' ? ['ACTIF','ARCHIVE'] : ['ACTIF'];
      const result = await database.query(
        `select d.code,d.label,d.domain,d.family_code,d.activity_type,d.status,v.definition_version_id,v.version_code,
                r.annual_requirement_id,r.required_occurrences,r.variant_code,r.window_start,r.window_end,r.status as requirement_status,
                fp.recurrence_kind,fp.default_occurrences,fp.default_sites,ape.program_state,ape.extraordinary,ape.site_codes,
                pr.tracking as participation_tracking,pr.population_kind as participation_population_kind,
                pr.population_code as participation_population_code,pr.evaluation_mode as participation_evaluation_mode,
                pr.version_number as participation_version_number,
                (select count(*)::integer from scope_activity_session_templates st where st.definition_version_id=v.definition_version_id) as template_session_count,
                (select sum(st.duration_minutes)::integer from scope_activity_session_templates st where st.definition_version_id=v.definition_version_id) as total_duration_minutes,
                (select string_agg(distinct c.statcom_code,', ' order by c.statcom_code) from scope_activity_statistical_contributions c where c.definition_version_id=v.definition_version_id) as statcom_codes,
                (select string_agg(p.code,', ' order by p.code) from scope_activity_public_bindings pb join scope_public_definitions p on p.public_definition_id=pb.public_definition_id where pb.definition_version_id=v.definition_version_id) as public_codes,
                coalesce(o.occurrence_count,0)::integer as occurrence_count,coalesce(o.session_count,0)::integer as generated_session_count,
                coalesce(t.themed_occurrence_count,0)::integer as themed_occurrence_count,coalesce(q.prepared_occurrence_count,0)::integer as prepared_occurrence_count
           from scope_event_definitions d join scope_event_definition_versions v on v.definition_id=d.definition_id and v.status='ACTIVE'
           left join scope_activity_functional_profiles fp on fp.definition_version_id=v.definition_version_id
           left join scope_activity_participation_rules pr on pr.definition_id=d.definition_id and pr.superseded_at is null
           left join scope_annual_requirements r on r.definition_version_id=v.definition_version_id and r.year=$1 and r.status in ('DRAFT','READY')
           left join scope_annual_program_entries ape on ape.annual_requirement_id=r.annual_requirement_id
           left join lateral (select count(distinct po.planned_occurrence_id) as occurrence_count,count(pos.planned_occurrence_session_id) as session_count
             from scope_planned_occurrences po left join scope_planned_occurrence_sessions pos on pos.planned_occurrence_id=po.planned_occurrence_id
            where po.annual_requirement_id=r.annual_requirement_id) o on true
           left join lateral (select count(distinct a.occurrence_number) as themed_occurrence_count
             from scope_annual_requirement_theme_assignments a where a.annual_requirement_id=r.annual_requirement_id) t on true
           left join lateral (select count(distinct qo.planned_occurrence_id) as prepared_occurrence_count
             from scope_planned_occurrences po join scope_quo_vadis_obligations qo on qo.planned_occurrence_id=po.planned_occurrence_id
            where po.annual_requirement_id=r.annual_requirement_id) q on true
          where d.status=any($2::text[])
            and exists (select 1 from scope_activity_domain_bindings b where b.definition_version_id=v.definition_version_id and b.binding_role='PRIMARY')
            and exists (select 1 from scope_activity_session_templates s where s.definition_version_id=v.definition_version_id)
            and exists (select 1 from scope_activity_periodicities p where p.definition_version_id=v.definition_version_id)`, [year,definitionStatuses]);
      const query = text(filters.query || filters.q).toLocaleLowerCase('fr');
      const domain = text(filters.domain).toUpperCase();
      const site = text(filters.site).toUpperCase();
      const status = text(filters.status).toUpperCase();
      const qualification = text(filters.qualification).toUpperCase();
      const mappedActivities = rows(result).filter((row) => !query || `${row.code} ${row.label}`.toLocaleLowerCase('fr').includes(query))
        .filter((row) => !domain || domain === 'TOUS' || row.domain === domain)
        .filter((row) => !site || site === 'TOUS' || (row.site_codes && row.site_codes.length ? row.site_codes : row.default_sites || []).map((value) => text(value).toUpperCase()).includes(site))
        .filter((row) => !status || status === 'TOUS' || (row.status === 'ARCHIVE' ? 'ARCHIVE' : row.requirement_status || 'A_DEFINIR') === status)
        .filter((row) => !qualification || qualification === 'TOUS' || (qualification === 'QUALIFIED' ? Boolean(row.recurrence_kind) : !row.recurrence_kind))
        .sort((a,b) => domainRank(a.domain) - domainRank(b.domain) || a.label.localeCompare(b.label,'fr'))
        .map((row) => ({ code: row.code,label: row.label,...(year === 2027 ? canonicalCatalog2027.get(row.code) || {} : {}),
          ...(row.code === annualReport.DEFINITION_CODE && !row.recurrence_kind ? { canonicalPublics:['Tout le SDIS'] } : {}),
          domain: row.domain,familyCode: row.family_code,activityType: row.activity_type,archived: row.status === 'ARCHIVE',
          definitionVersionId: row.definition_version_id,versionCode: row.version_code,annualRequirementId: row.annual_requirement_id || null,
          requiredOccurrences: row.required_occurrences || null,variantCode: row.variant_code || null,windowStart: dateForYear(row.window_start,year),windowEnd: dateForYear(row.window_end,year),
          status: row.status === 'ARCHIVE' ? 'ARCHIVE' : row.requirement_status || 'A_DEFINIR',occurrenceCount: row.occurrence_count,sessionCount: row.template_session_count,
          durationMinutes:row.total_duration_minutes || null,statComCodes:text(row.statcom_codes).split(',').map((value) => text(value)).filter(Boolean),
          generatedSessionCount: row.generated_session_count,publicCodes:text(row.public_codes).split(',').map((value) => text(value)).filter(Boolean),themedOccurrenceCount: row.themed_occurrence_count,
          unthemedOccurrenceCount: row.required_occurrences == null ? null : Math.max(0,row.required_occurrences - row.themed_occurrence_count),
          preparedOccurrenceCount: row.prepared_occurrence_count,recurrenceKind:row.recurrence_kind || null,defaultOccurrences:row.default_occurrences || 1,
          qualified:Boolean(row.recurrence_kind),
          participation:participationCatalog.serializeRule(row.participation_version_number == null ? null : {
            tracking:row.participation_tracking,population_kind:row.participation_population_kind,
            population_code:row.participation_population_code,evaluation_mode:row.participation_evaluation_mode,
            version_number:row.participation_version_number
          }),
          defaultSites:row.default_sites || [],programState:row.program_state || null,extraordinary:Boolean(row.extraordinary),siteCodes:row.site_codes || [] }));
      const activities = groupExerciseOccurrences(mappedActivities);
      return { readiness,year,activities,references:await loadCatalogReferences(database) };
    },

    async getActivity(code,filters = {}){
      const readiness = await requireReady(database,readinessInspector);
      const context = await contextLoader(database,{ code,year: integer(filters.year) || new Date().getUTCFullYear() });
      if(!context) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
      const result = serializeContext(context,readiness,await inspectReadyTransition(database,context),await loadCatalogReferences(database));
      const history = rows(await database.query(`select r.* from scope_activity_participation_rules r
        where r.definition_id=$1 order by r.version_number desc`,[context.definition.definitionId]));
      result.participation = participationCatalog.serializeRule(history.find((row) => !row.superseded_at));
      result.participationHistory = history.map(participationCatalog.serializeRule);
      return result;
    },

    async updateParticipationRule(code,body = {},actor){
      await requireReady(database,readinessInspector);
      const input = participationCatalog.normalizeDecision(body);
      return database.transaction(async (client) => {
        const definition = one(await client.query(`select definition_id,code from scope_event_definitions
          where code=$1 and status='ACTIF' for update`,[text(code).toUpperCase()]));
        if(!definition) throw new HttpError(404,'activite_catalogue_introuvable','Activité active introuvable.');
        const current = one(await client.query(`select * from scope_activity_participation_rules
          where definition_id=$1 and superseded_at is null for update`,[definition.definition_id]));
        const version = Number(current && current.version_number || 0);
        if(Number(body.baseVersion) !== version){
          throw new HttpError(409,'regle_participation_obsolete','La règle a changé. Rechargez la fiche avant de l’enregistrer.');
        }
        if(current && (current.tracking !== input.tracking
          || current.population_kind !== input.populationKind
          || current.population_code !== input.populationCode
          || current.evaluation_mode !== input.evaluationMode
          || current.evaluation_group_code !== input.evaluationGroupCode
          || current.evaluation_session_index !== input.evaluationSessionIndex)){
          const used = one(await client.query(`select exists(
            select 1 from scope_evenements e where e.source_type='QUO_VADIS' and e.code_source=$1
              and (exists(select 1 from scope_attendus a where a.evenement_id=e.evenement_id)
                or exists(select 1 from scope_participations p where p.evenement_id=e.evenement_id))
          ) as used`,[definition.code]));
          if(used && used.used){
            throw new HttpError(409,'regle_participation_utilisee',
              'Des attendus ou participations existent : conservez leur historique avant de modifier la règle de suivi.');
          }
        }
        if(input.tracking){
          const references = {
            PUBLIC:['scope_public_definitions','code','status=\'ACTIVE\''],
            QUALIFICATION:['scope_competence_definitions','code','true'],
            OI:['scope_ois','code','true'],
            SDIS:['scope_public_definitions','code','status=\'ACTIVE\'']
          };
          const [table,column,condition] = references[input.populationKind];
          const exists = one(await client.query(`select 1 from ${table} where ${column}=$1 and ${condition} limit 1`,[input.populationCode]));
          if(!exists) throw new HttpError(422,'population_catalogue_introuvable','Le public évalué doit exister dans le référentiel canonique.');
        }
        if(current) await client.query(`update scope_activity_participation_rules
          set superseded_at=now() where rule_id=$1`,[current.rule_id]);
        const saved = one(await client.query(`insert into scope_activity_participation_rules
          (definition_id,version_number,tracking,population_kind,population_code,evaluation_mode,
           evaluation_group_code,evaluation_session_index,source,metadata,created_by)
          values ($1,$2,$3,$4,$5,$6,$7,$8,'CATALOGUE_MANUAL','{}'::jsonb,$9) returning *`,
          [definition.definition_id,version+1,input.tracking,input.populationKind,input.populationCode,
            input.evaluationMode,input.evaluationGroupCode,input.evaluationSessionIndex,actorId(actor)]));
        return { participation:participationCatalog.serializeRule(saved),versioned:true };
      });
    },

    async previewImport(body = {}){
      await requireReady(database,readinessInspector);
      const encoded = text(body.xlsxBase64 || body.fileBase64);
      if(!encoded) throw new HttpError(422,'classeur_requis','Sélectionnez le classeur QUO VADIS au format XLSX.');
      const buffer = Buffer.from(encoded,'base64');
      if(!buffer.length || buffer.length > 6 * 1024 * 1024) throw new HttpError(422,'classeur_invalide','Le classeur est vide ou dépasse 6 Mo.');
      const aliases = rows(await database.query(
        `select a.normalized_value,d.code from scope_activity_legacy_aliases a join scope_event_definitions d on d.definition_id=a.definition_id where a.status='CONFIRMED'`
      ));
      const existing = new Map(aliases.map((row) => [catalogImport.normalize(row.normalized_value),row.code]));
      let preview = catalogImport.analyzeWorkbook(buffer,{ fileName:text(body.fileName) || 'QUO VADIS.xlsx',existing });
      preview = catalogImport.applyHumanDecisions(preview,await persistedImportDecisions(database,preview.source.sha256));
      return { preview };
    },

    async applyImport(body = {},actor){
      await requireReady(database,readinessInspector);
      const encoded = text(body.xlsxBase64 || body.fileBase64);
      const buffer = Buffer.from(encoded,'base64');
      if(!buffer.length || buffer.length > 6 * 1024 * 1024) throw new HttpError(422,'classeur_invalide','Le classeur est vide ou dépasse 6 Mo.');
      return database.transaction(async (client) => {
        const aliases = rows(await client.query(
          `select a.normalized_value,d.code from scope_activity_legacy_aliases a join scope_event_definitions d on d.definition_id=a.definition_id where a.status='CONFIRMED'`
        ));
        const existing = new Map(aliases.map((row) => [catalogImport.normalize(row.normalized_value),row.code]));
        let preview = catalogImport.analyzeWorkbook(buffer,{ fileName:text(body.fileName) || 'QUO VADIS.xlsx',existing });
        if(text(body.previewFingerprint) !== preview.previewFingerprint) throw new HttpError(409,'apercu_import_obsolete','Le classeur ou les règles ont changé depuis l’aperçu. Relancez le dry-run.');
        preview = catalogImport.applyHumanDecisions(preview,await persistedImportDecisions(client,preview.source.sha256));
        preview = catalogImport.applyHumanDecisions(preview,body.decisions || []);
        const unresolved = preview.proposals.filter((row) => ['REVIEW_REQUIRED','UNRESOLVED'].includes(row.classification) && !row.humanDecision);
        if(unresolved.length) throw new HttpError(422,'arbitrages_import_requis',`${unresolved.length} proposition(s) nécessitent encore une décision humaine.`,{ proposalIds:unresolved.map((row) => row.proposalId) });
        const importFingerprint = catalogImport.importFingerprint(preview);
        const previous = one(await client.query(
          `select import_run_id,status from scope_catalog_import_runs where source_sha256=$1 and preview_fingerprint=$2`,
          [preview.source.sha256,importFingerprint]));
        if(previous) return { importRunId:previous.import_run_id,status:previous.status,importFingerprint,idempotent:true,operationalWrites:false,eventPublication:false };
        const imported = []; const merged = []; const skipped = [];
        for(const proposal of preview.proposals){
          const decision = proposal.humanDecision && proposal.humanDecision.action;
          if(proposal.classification === 'IGNORED' || decision === 'IGNORE' || decision === 'REVIEW_REQUIRED'){
            skipped.push(proposal.proposalId); continue;
          }
          let target = null;
          const targetCode = proposal.targetDefinitionCode || proposal.humanDecision && proposal.humanDecision.targetDefinitionCode;
          if(proposal.classification === 'MERGE'){
            target = one(await client.query(`select definition_id,code from scope_event_definitions where code=$1`,[targetCode]));
            if(!target) throw new HttpError(422,'cible_fusion_introuvable',`La cible ${targetCode || 'indiquée'} est introuvable.`);
            merged.push(proposal.proposalId);
          }else{
            target = one(await client.query(`select definition_id,code from scope_event_definitions where code=$1`,[proposal.definitionCode]));
            if(!target){
              const input = normalizeActivityInput({ label:proposal.activityLabel,description:`Activité issue de QUO VADIS 2026 (${proposal.sourceRowCount} ligne(s) source).`,
                primaryDomain:proposal.primaryDomain,domainCodes:proposal.domainCodes,activityType:proposal.activityType,periodicityType:'ANNUAL',durationMinutes:120,
                familyCode:proposal.familyCodes[0] || null,publicCodes:proposal.publicCodes,statComCodes:proposal.statComCodes,
                qualificationCodes:proposal.specializations,themes:proposal.themes });
              target = one(await client.query(
                `insert into scope_event_definitions(code,label,domain,description,status,metadata,family_code,activity_type)
                 values ($1,$2,$3,$4,'ACTIF',$5::jsonb,$6,$7) returning definition_id,code`,
                [proposal.definitionCode,input.label,input.primaryDomain,input.description,JSON.stringify({ source:'C15_QUO_VADIS_2026',proposalId:proposal.proposalId,sourceRows:proposal.sourceRows,sourceStatComCodes:proposal.sourceStatComCodes,statComResolutions:proposal.statComResolutions }),input.familyCode,input.activityType]));
              await insertActivityVersion(client,target,input,actor,{ source:'C15_QUO_VADIS_2026',proposalId:proposal.proposalId,sourceSha256:preview.source.sha256,sourceStatComCodes:proposal.sourceStatComCodes,statComResolutions:proposal.statComResolutions });
              await bindThemes(client,target.definition_id,input.themes,actor,{ source:'C15_QUO_VADIS_2026',proposalId:proposal.proposalId });
            }
            imported.push(proposal.proposalId);
          }
          await client.query(
            `insert into scope_activity_legacy_aliases(source_type,source_value,normalized_value,definition_id,confidence,provenance,justification,status,metadata)
             values ('QUO_VADIS_2026',$1,$2,$3,$4,'C15_IMPORT',$5,'CONFIRMED',$6::jsonb)
             on conflict (source_type,normalized_value) do nothing`,
            [proposal.activityLabel,catalogImport.normalize(proposal.activityLabel),target.definition_id,proposal.confidence === 'HIGH' ? 1 : 0.8,proposal.reason,JSON.stringify({ proposalId:proposal.proposalId,sourceSha256:preview.source.sha256 })]);
        }
        const status = skipped.length ? 'PARTIAL' : 'APPLIED';
        const run = one(await client.query(
          `insert into scope_catalog_import_runs(source_sha256,source_name,source_year,preview_fingerprint,status,summary,metadata,created_by,applied_at,applied_by)
           values ($1,$2,2026,$3,$4,$5::jsonb,$6::jsonb,$7,now(),$7) returning import_run_id`,
          [preview.source.sha256,preview.source.fileName || 'QUO VADIS 2026.xlsx',importFingerprint,status,JSON.stringify(preview.summary),JSON.stringify({ source:'C15',previewFingerprint:preview.previewFingerprint }),actorId(actor)]));
        for(const proposal of preview.proposals){
          const action = proposal.humanDecision && proposal.humanDecision.action || (proposal.classification === 'MERGE' ? 'MERGE' : proposal.classification === 'AUTO_IMPORT' ? 'IMPORT' : proposal.classification === 'IGNORED' ? 'IGNORE' : 'REVIEW_REQUIRED');
          const targetCode = proposal.targetDefinitionCode || proposal.humanDecision && proposal.humanDecision.targetDefinitionCode;
          await client.query(
            `insert into scope_catalog_import_decisions(import_run_id,source_sha256,proposal_key,proposal_id,decision,target_definition_id,payload,comment,decided_by)
             values ($1,$2,$3,$4,$5,(select definition_id from scope_event_definitions where code=$6),$7::jsonb,$8,$9)
             on conflict (source_sha256,proposal_key) do nothing`,
            [run.import_run_id,preview.source.sha256,proposal.proposalKey,proposal.proposalId,action,targetCode || proposal.definitionCode,JSON.stringify(proposal),proposal.humanDecision && proposal.humanDecision.comment || null,actorId(actor)]);
        }
        return { importRunId:run.import_run_id,status,importFingerprint,imported:imported.length,merged:merged.length,skipped:skipped.length,idempotent:false,operationalWrites:false,eventPublication:false };
      });
    },

    async createActivity(body = {},actor){
      await requireReady(database,readinessInspector);
      const input = normalizeActivityInput(body);
      return database.transaction(async (client) => {
        const code = `${input.primaryDomain}-${slug(input.label)}`.slice(0,80);
        if(one(await client.query(`select definition_id from scope_event_definitions where code=$1`,[code]))) throw new HttpError(409,'activite_existante','Une activité portant cette identité existe déjà.');
        const definition = one(await client.query(
          `insert into scope_event_definitions(code,label,domain,description,status,metadata,family_code,activity_type)
           values ($1,$2,$3,$4,'ACTIF',$5::jsonb,$6,$7) returning definition_id,code`,
          [code,input.label,input.primaryDomain,input.description,JSON.stringify({ source:'C15_MANUAL',createdBy:actorId(actor) }),input.familyCode,input.activityType]));
        const version = await insertActivityVersion(client,definition,input,actor,{ source:'C15_MANUAL' });
        await bindThemes(client,definition.definition_id,input.themes,actor,{ source:'C15_MANUAL' });
        return { activity:{ code:definition.code,label:input.label,...version },operationalWrites:false,eventPublication:false };
      });
    },

    async updateActivity(code,body = {},actor){
      await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        const current = await findDefinition(client,code,{ includeArchived:false });
        if(!current) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
        const domainRows = rows(await client.query(`select domain_code,binding_role from scope_activity_domain_bindings where definition_version_id=$1`,[current.definition_version_id]));
        const session = one(await client.query(`select duration_minutes from scope_activity_session_templates where definition_version_id=$1 order by sequence limit 1`,[current.definition_version_id]));
        const periodicity = one(await client.query(`select periodicity_type,occurrences_per_cycle from scope_activity_periodicities where definition_version_id=$1`,[current.definition_version_id]));
        const existingSessions = rows(await client.query(`select code,sequence,label,mandatory,duration_minutes from scope_activity_session_templates where definition_version_id=$1 order by sequence`,[current.definition_version_id]));
        const profile = one(await client.query(`select * from scope_activity_functional_profiles where definition_version_id=$1`,[current.definition_version_id]));
        if(!profile && !['RECURRENT','NON_RECURRENT'].includes(text(body.recurrenceKind).toUpperCase())){
          throw new HttpError(422,'activite_recurrence_a_qualifier','La récurrence de cette activité doit être qualifiée explicitement avant sa révision.');
        }
        const publicRows = rows(await client.query(
          `select p.code from scope_activity_public_bindings b join scope_public_definitions p on p.public_definition_id=b.public_definition_id where b.definition_version_id=$1 order by p.code`,
          [current.definition_version_id]));
        const qualificationRows = rows(await client.query(
          `select c.code from scope_activity_qualification_bindings b join scope_competence_definitions c on c.competence_id=b.competence_id where b.definition_version_id=$1 order by c.code`,
          [current.definition_version_id]));
        const statComRows = rows(await client.query(
          `select statcom_code as code from scope_activity_statistical_contributions where definition_version_id=$1 order by statcom_code`,
          [current.definition_version_id]));
        const responsible = one(await client.query(`select responsable_fonction_code from scope_activity_responsible_requirements
          where definition_version_id=$1 and responsable_fonction_code is not null order by created_at limit 1`,[current.definition_version_id]));
        const location = one(await client.query(`select l.code from scope_activity_location_requirements r join scope_lieux l on l.lieu_id=r.lieu_id
          where r.definition_version_id=$1 order by r.created_at limit 1`,[current.definition_version_id]));
        const room = one(await client.query(`select s.code from scope_activity_location_requirements r join scope_salles_theorie s on s.salle_id=r.salle_id
          where r.definition_version_id=$1 order by r.created_at limit 1`,[current.definition_version_id]));
        const themeRows = rows(await client.query(
          `select v.label from scope_activity_theme_bindings b join scope_theme_definitions d on d.theme_definition_id=b.theme_definition_id
             join scope_theme_versions v on v.theme_definition_id=d.theme_definition_id and v.status='ACTIVE'
            where b.definition_id=$1 and b.status='ACTIVE' order by v.label`,[current.definition_id]));
        const input = normalizeActivityInput(body,{ label:current.label,description:current.description,primaryDomain:(domainRows.find((row) => row.binding_role === 'PRIMARY') || {}).domain_code || current.domain,
          domainCodes:domainRows.map((row) => row.domain_code),activityType:current.activity_type,familyCode:current.family_code,durationMinutes:session && session.duration_minutes,
          sessionCount:existingSessions.length,
          periodicityType:periodicity && periodicity.periodicity_type,sessionTemplates:existingSessions,defaultOccurrences:profile && profile.default_occurrences || periodicity && periodicity.occurrences_per_cycle || 1,
          defaultSites:profile && profile.default_sites || [],recurrenceKind:profile && profile.recurrence_kind || 'RECURRENT',ruleMode:profile && profile.rule_mode || 'GENERAL',customRule:profile && profile.custom_rule,
          businessRule:profile && profile.metadata && profile.metadata.canonicalRule || {},calendarRules:profile && profile.metadata && profile.metadata.calendarRules || {},
          responsibleCode:responsible && responsible.responsable_fonction_code,usualLocationCode:location && location.code,usualRoomCode:room && room.code,
          publicCodes:publicRows.map((row) => row.code),qualificationCodes:qualificationRows.map((row) => row.code),
          statComCodes:statComRows.map((row) => row.code),themes:themeRows.map((row) => row.label) });
        const version = await insertActivityVersion(client,current,input,actor,{ source:'C15_MANUAL_REVISION',supersedes:current.definition_version_id },{
          deferActivation:true,cloneFromVersionId:current.definition_version_id,
          previousProfileMetadata:profile && profile.metadata,
          replaceStatCom:Object.prototype.hasOwnProperty.call(body,'statComCodes'),
          replaceResponsible:Object.prototype.hasOwnProperty.call(body,'responsibleCode'),
          replaceLocation:Object.prototype.hasOwnProperty.call(body,'usualLocationCode') || Object.prototype.hasOwnProperty.call(body,'usualRoomCode')
        });
        await client.query(`update scope_event_definition_versions set status='RETIRED',updated_at=now() where definition_version_id=$1 and status='ACTIVE'`,[current.definition_version_id]);
        await client.query(`update scope_event_definition_versions set status='ACTIVE',updated_at=now() where definition_version_id=$1 and status='DRAFT'`,[version.definitionVersionId]);
        await client.query(`update scope_event_definitions set label=$2,domain=$3,description=$4,family_code=$5,activity_type=$6,metadata=metadata || $7::jsonb,updated_at=now() where definition_id=$1`,
          [current.definition_id,input.label,input.primaryDomain,input.description,input.familyCode,input.activityType,JSON.stringify({ lastEditedBy:actorId(actor),lastEditedAt:new Date().toISOString() })]);
        await bindThemes(client,current.definition_id,input.themes,actor,{ source:'C15_MANUAL_REVISION' });
        return { activity:{ code:current.code,label:input.label,...version },versioned:true,operationalWrites:false,eventPublication:false };
      });
    },

    async archiveActivity(code,actor){
      await requireReady(database,readinessInspector);
      const archived = one(await database.query(
        `update scope_event_definitions set status='ARCHIVE',metadata=metadata || $2::jsonb,updated_at=now() where code=$1 and status='ACTIF' returning code,label`,
        [text(code).toUpperCase(),JSON.stringify({ archivedBy:actorId(actor),archivedAt:new Date().toISOString() })]));
      if(!archived) throw new HttpError(404,'activite_catalogue_introuvable','Activité active introuvable.');
      return { activity:archived,archived:true };
    },

    async restoreActivity(code,actor){
      await requireReady(database,readinessInspector);
      const restored = one(await database.query(
        `update scope_event_definitions set status='ACTIF',metadata=metadata || $2::jsonb,updated_at=now() where code=$1 and status='ARCHIVE' returning code,label`,
        [text(code).toUpperCase(),JSON.stringify({ restoredBy:actorId(actor),restoredAt:new Date().toISOString() })]));
      if(!restored) throw new HttpError(404,'activite_archivee_introuvable','Activité archivée introuvable.');
      return { activity:restored,restored:true };
    },

    async deleteUnusedActivity(code){
      await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        const definition = one(await client.query(`select definition_id,code from scope_event_definitions where code=$1 for update`,[text(code).toUpperCase()]));
        if(!definition) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
        const usage = one(await client.query(
          `select
             (select count(*) from scope_annual_requirements r join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id where v.definition_id=$1) as annual_requirement_count,
             (select count(*) from scope_evenements e join scope_event_definition_versions v on v.definition_version_id=e.definition_version_id where v.definition_id=$1) as event_count,
             (select count(*) from scope_activity_legacy_aliases a where a.definition_id=$1) as alias_count,
             (select count(*) from scope_catalog_import_decisions d where d.target_definition_id=$1) as import_decision_count,
             (select count(*) from scope_activity_participation_rules r where r.definition_id=$1) as participation_rule_count,
             (select count(*) from scope_catalog_convergence_links l where l.source_definition_id=$1 or l.target_definition_id=$1) as convergence_link_count`,[definition.definition_id]));
        if(['annual_requirement_count','event_count','alias_count','import_decision_count','participation_rule_count','convergence_link_count'].some((key) => Number(usage && usage[key] || 0) > 0)){
          throw new HttpError(409,'activite_utilisee_archivage_requis','Cette activité est historisée et doit être archivée, pas supprimée.');
        }
        const versions = rows(await client.query(`select definition_version_id from scope_event_definition_versions where definition_id=$1`,[definition.definition_id])).map((row) => row.definition_version_id);
        await client.query(`update scope_event_definition_versions set status='RETIRED' where definition_id=$1 and status='ACTIVE'`,[definition.definition_id]);
        for(const table of ['scope_activity_functional_profiles','scope_activity_statistical_contributions','scope_activity_planning_constraints','scope_activity_responsible_requirements','scope_activity_location_requirements','scope_activity_role_requirements','scope_activity_qualification_bindings','scope_activity_public_bindings','scope_activity_periodicities','scope_activity_session_templates','scope_activity_domain_bindings']){
          await client.query(`delete from ${table} where definition_version_id=any($1::uuid[])`,[versions]);
        }
        await client.query(`delete from scope_activity_theme_bindings where definition_id=$1`,[definition.definition_id]);
        await client.query(`delete from scope_event_definition_versions where definition_id=$1`,[definition.definition_id]);
        await client.query(`delete from scope_event_definitions where definition_id=$1`,[definition.definition_id]);
        return { deleted:true,code:definition.code };
      });
    },

    async createDraft(body,actor){
      const readiness = await requireReady(database,readinessInspector);
      const input = validateDraftInput(body);
      const definition = await definitionFinder(database,body.code);
      if(!definition) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
      if(definition.active === false) throw new HttpError(409,'activite_archivee','Une activité archivée ne peut pas recevoir un nouveau besoin annuel.');
      const sourceId = `C6_B_MOA:${definition.code}:${input.variantCode}`;
      let created;
      try{
        created = one(await database.query(
          `insert into scope_annual_requirements(year,definition_version_id,variant_code,required_occurrences,window_start,window_end,priority,status,source_type,source_id,metadata,created_by,updated_by)
           values ($1,$2,$3,$4,$5,$6,$7,'DRAFT','MANUAL',$8,$9::jsonb,$10,$10) returning *`,
          [input.year,definition.definition_version_id,input.variantCode,input.requiredOccurrences,input.windowStart,input.windowEnd,input.priority,sourceId,JSON.stringify({ source: 'C6_B_MOA' }),actorId(actor)]));
      }catch(error){
        if(error && error.code === '23505') throw new HttpError(409,'besoin_annuel_existant','Un besoin DRAFT ou READY existe déjà pour cette activité et cette année.');
        throw error;
      }
      return { readiness,annualRequirement: created };
    },

    async updateDraft(requirementId,body,actor){
      const readiness = await requireReady(database,readinessInspector);
      const current = await requireScopedRequirement(database,requirementId);
      if(current.status !== 'DRAFT') throw new HttpError(409,'besoin_annuel_verrouille','Un besoin READY est figé. Créez une nouvelle version annuelle.');
      const input = validateDraftInput(draftInputWithDefaults(body,current));
      const updated = one(await database.query(
        `update scope_annual_requirements set required_occurrences=$2,window_start=$3,window_end=$4,variant_code=$5,priority=$6,updated_by=$7,updated_at=now()
          where annual_requirement_id=$1 and status='DRAFT' returning *`,
        [requirementId,input.requiredOccurrences,input.windowStart,input.windowEnd,input.variantCode,input.priority,actorId(actor)]));
      return { readiness,annualRequirement: updated };
    },

    async replaceThemeAssignments(requirementId,body,actor){
      const readiness = await requireReady(database,readinessInspector);
      const rowsInput = resolveAliasedField(body,'assignments','theme_assignments',(value) => Array.isArray(value) ? value : null);
      if(rowsInput == null) throw new HttpError(422,'THEME_ASSIGNMENTS_ARRAY_REQUIRED','La liste des thèmes doit être un tableau.');
      return database.transaction(async (client) => {
        const current = await requireScopedRequirement(client,requirementId);
        if(current.status !== 'DRAFT') throw new HttpError(409,'besoin_annuel_verrouille','Les thèmes d’un besoin READY sont figés. Créez une révision.');
        const context = await contextLoader(client,{ requirementId });
        const normalizedInput = rowsInput.map((row) => ({
          annualRequirementId: requirementId,
          occurrenceNumber: resolveAliasedField(row,'occurrenceNumber','occurrence_number',integer),
          themeVersionId: resolveAliasedField(row,'themeVersionId','theme_version_id',(value) => text(value) || null),
          freeLabel: resolveAliasedField(row,'freeLabel','free_label',(value) => text(value) || null),
          sessionTemplateId: resolveAliasedField(row,'sessionTemplateId','session_template_id',(value) => text(value) || null),
          sortOrder: resolveAliasedField(row,'sortOrder','sort_order',integer) || 100
        }));
        const validated = validateThemeAssignments({ ...context,themeAssignments: normalizedInput,themeVersions: context.availableThemes });
        if(!validated.valid) throw new HttpError(422,'affectations_themes_invalides','Les thèmes annuels sont invalides.',{ errors: validated.errors });
        await client.query(`delete from scope_annual_requirement_theme_assignments where annual_requirement_id=$1`,[requirementId]);
        for(const row of validated.value){
          await client.query(
            `insert into scope_annual_requirement_theme_assignments(annual_requirement_id,occurrence_number,theme_version_id,free_label,free_normalized,session_template_id,sort_order,metadata,created_by,updated_by)
             values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$9)`,
            [requirementId,row.occurrenceNumber,row.themeVersionId,row.freeLabel,row.freeNormalized,row.sessionTemplateId,row.sortOrder,
              JSON.stringify({ source: 'C8_B_MOA',kind: row.kind }),actorId(actor)]);
        }
        const refreshed = await contextLoader(client,{ requirementId,refresh: true });
        return { readiness,annualThemeAssignments: refreshed.themeAssignments };
      });
    },

    async markReady(requirementId,actor){
      const readiness = await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        await requireScopedRequirement(client,requirementId);
        const context = await contextLoader(client,{ requirementId });
        if(!context) throw new HttpError(404,'besoin_annuel_introuvable','Besoin annuel introuvable.');
        if(context.requirement.status !== 'DRAFT') throw new HttpError(409,'besoin_annuel_non_draft','Seul un besoin DRAFT peut passer à READY.');
        const publicIds = [...new Set(context.publicBindings.map((row) => row.publicDefinitionId))];
        const publicDefinitions = rows(await client.query(`select * from scope_public_definitions where public_definition_id=any($1::uuid[])`,[publicIds]));
        const publicRuleVersions = publicIds.length ? rows(await client.query(`select * from scope_public_rule_versions where public_definition_id=any($1::uuid[])`,[publicIds])) : [];
        const prepared = prepareAnnualRequirementReady({ ...context,publicDefinitions,publicRuleVersions,themeVersions: context.availableThemes });
        if(!prepared.valid) throw new HttpError(422,'besoin_annuel_incomplet',readyErrorMessage(prepared.errors),{ errors: prepared.errors });
        for(const binding of prepared.publicBindings){
          await client.query(
            `insert into scope_activity_public_bindings(annual_requirement_id,public_definition_id,public_rule_version_id,group_code,operator,binding_type,metadata)
             values ($1,$2,$3,$4,$5,$6,$7::jsonb) on conflict on constraint scope_activity_public_bindings_uk do update set public_rule_version_id=excluded.public_rule_version_id,updated_at=now()`,
            [requirementId,binding.publicDefinitionId,binding.publicRuleVersionId,binding.group_code || 'DEFAULT',binding.operator || 'UNION',binding.binding_type || 'TARGET',JSON.stringify({ ...(binding.metadata || {}),source: 'C6_B_READY_PIN' })]);
        }
        const updated = one(await client.query(
          `update scope_annual_requirements set status='READY',snapshot=$2::jsonb,fingerprint=$3,updated_by=$4,updated_at=now() where annual_requirement_id=$1 and status='DRAFT' returning *`,
          [requirementId,JSON.stringify(prepared.requirement.snapshot),prepared.requirement.fingerprint,actorId(actor)]));
        return { readiness,annualRequirement: updated,publicBindings: prepared.publicBindings };
      });
    },

    async reviseReady(requirementId,actor){
      const readiness = await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        await requireScopedRequirement(client,requirementId);
        const context = await contextLoader(client,{ requirementId });
        if(!context) throw new HttpError(404,'besoin_annuel_introuvable','Besoin annuel introuvable.');
        const current = context.requirement;
        if(current.status !== 'READY') throw new HttpError(409,'besoin_annuel_non_ready','Seul un besoin READY peut être révisé par supersession.');
        await client.query(`update scope_annual_requirements set status='SUPERSEDED',updated_by=$2,updated_at=now() where annual_requirement_id=$1 and status='READY'`,[requirementId,actorId(actor)]);
        const revised = one(await client.query(
          `insert into scope_annual_requirements(year,definition_version_id,variant_code,required_occurrences,window_start,window_end,priority,status,source_type,source_id,supersedes_annual_requirement_id,metadata,created_by,updated_by)
           values ($1,$2,$3,$4,$5,$6,$7,'DRAFT','MANUAL',$8,$9,$10::jsonb,$11,$11) returning *`,
          [current.year,current.definitionVersionId,current.variantCode,current.requiredOccurrences,current.windowStart,current.windowEnd,current.priority || 100,
            `C6_B_REVISION:${requirementId}`,requirementId,JSON.stringify({ source: 'C6_B_MOA',revisionOf: requirementId }),actorId(actor)]));
        await client.query(
          `insert into scope_annual_requirement_theme_assignments(annual_requirement_id,occurrence_number,theme_version_id,free_label,free_normalized,session_template_id,sort_order,metadata,created_by,updated_by)
           select $1,occurrence_number,theme_version_id,free_label,free_normalized,session_template_id,sort_order,metadata || $2::jsonb,$3,$3
             from scope_annual_requirement_theme_assignments where annual_requirement_id=$4`,
          [revised.annual_requirement_id,JSON.stringify({ copiedBy: 'C8_B_REVISION' }),actorId(actor),requirementId]);
        return { readiness,annualRequirement: revised,supersededAnnualRequirementId: requirementId };
      });
    },

    async generate(requirementId){
      const readiness = await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        await requireScopedRequirement(client,requirementId);
        const context = await contextLoader(client,{ requirementId });
        if(!context) throw new HttpError(404,'besoin_annuel_introuvable','Besoin annuel introuvable.');
        const generated = generateAnnualProgram(context);
        if(!generated.complete) throw new HttpError(422,'generation_annuelle_refusee',`La génération annuelle est refusée (${generated.errors.map((error) => error.code).join(', ')}).`,{ errors: generated.errors });
        for(const occurrence of generated.occurrences){
          await client.query(
            `insert into scope_planned_occurrences(planned_occurrence_id,annual_requirement_id,occurrence_number,status,preferred_window_start,preferred_window_end,metadata)
             values ($1,$2,$3,$4,$5,$6,$7::jsonb) on conflict (annual_requirement_id,occurrence_number) do nothing`,
            [occurrence.plannedOccurrenceId,occurrence.annualRequirementId,occurrence.occurrenceNumber,occurrence.status,occurrence.preferredWindowStart,occurrence.preferredWindowEnd,JSON.stringify({ source: 'C6_B_GENERATION' })]);
        }
        for(const session of generated.sessions){
          await client.query(
            `insert into scope_planned_occurrence_sessions(planned_occurrence_session_id,planned_occurrence_id,session_template_id,sequence,status,metadata)
             values ($1,$2,$3,$4,$5,$6::jsonb) on conflict (planned_occurrence_id,session_template_id) do nothing`,
            [session.plannedOccurrenceSessionId,session.plannedOccurrenceId,session.sessionTemplateId,session.sequence,session.status,JSON.stringify({ source: 'C6_B_GENERATION' })]);
        }
        const refreshed = await contextLoader(client,{ requirementId,refresh: true });
        return { readiness,generation: { occurrences: refreshed.occurrences,sessions: refreshed.sessions },idempotent: true,operationalWrites: false };
      });
    },

    async saveAnnualProgram(code,body = {},actor){
      const readiness = await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        const definition = await findDefinition(client,code,{ includeArchived:false });
        if(!definition) throw new HttpError(404,'activite_catalogue_introuvable','Activité du Catalogue introuvable.');
        const profile = one(await client.query(`select * from scope_activity_functional_profiles where definition_version_id=$1`,[definition.definition_version_id]));
        const configured = functionalCatalog.annualConfiguration({
          recurrenceKind:profile && profile.recurrence_kind || 'NON_RECURRENT',defaultOccurrences:profile && profile.default_occurrences || 1,
          defaultSites:profile && profile.default_sites || [],ruleMode:profile && profile.rule_mode || 'GENERAL',customRule:profile && profile.custom_rule
        },{ state:body.state,occurrences:body.occurrences,sites:body.sites,extraordinary:body.extraordinary });
        if(!configured.valid) throw new HttpError(422,'programmation_annuelle_invalide','La programmation annuelle est incomplète.',{ errors:configured.errors });
        await requireCanonicalCodes(client,configured.value.sites,'SITE');
        const year=integer(body.year);
        if(!(year>=2000 && year<=2200)) throw new HttpError(422,'annee_invalide','L’année est invalide.');
        let requirement=one(await client.query(`select * from scope_annual_requirements where year=$1 and definition_version_id=$2 and status in ('DRAFT','READY') order by updated_at desc limit 1`,[year,definition.definition_version_id]));
        if(!requirement){
          requirement=one(await client.query(`insert into scope_annual_requirements(year,definition_version_id,variant_code,required_occurrences,window_start,window_end,priority,status,source_type,source_id,metadata,created_by,updated_by)
            values ($1,$2,'DEFAULT',$3,$4,$5,$6,'DRAFT','MANUAL',$7,$8::jsonb,$9,$9) returning *`,[year,definition.definition_version_id,configured.value.occurrences,
            body.windowStart || `${year}-01-01`,body.windowEnd || `${year}-12-31`,integer(body.priority) || 100,`C18_PROGRAM:${definition.code}:${year}`,
            JSON.stringify({ source:'C18',extraordinary:configured.value.extraordinary }),actorId(actor)]));
        }else if(requirement.status === 'DRAFT'){
          requirement=one(await client.query(`update scope_annual_requirements set required_occurrences=$2,window_start=$3,window_end=$4,priority=$5,updated_by=$6,updated_at=now()
            where annual_requirement_id=$1 returning *`,[requirement.annual_requirement_id,configured.value.occurrences,body.windowStart || requirement.window_start,
            body.windowEnd || requirement.window_end,integer(body.priority) || requirement.priority,actorId(actor)]));
        }else if(Number(requirement.required_occurrences) !== Number(configured.value.occurrences)){
          throw new HttpError(409,'programmation_verrouillee','Le nombre de réalisations d’une programmation READY doit être révisé par supersession.');
        }
        const entry=one(await client.query(`insert into scope_annual_program_entries(annual_requirement_id,program_state,extraordinary,occurrence_override,site_codes,config_override,metadata,created_by,updated_by)
          values ($1,$2,$3,$4,$5::text[],$6::jsonb,$7::jsonb,$8,$8)
          on conflict (annual_requirement_id) do update set program_state=excluded.program_state,extraordinary=excluded.extraordinary,occurrence_override=excluded.occurrence_override,
            site_codes=excluded.site_codes,config_override=excluded.config_override,updated_by=excluded.updated_by,updated_at=now() returning *`,[
          requirement.annual_requirement_id,configured.value.state,configured.value.extraordinary,configured.value.overrides.occurrences ? configured.value.occurrences : null,
          configured.value.sites,JSON.stringify(body.overrides || {}),JSON.stringify({ source:'C18' }),actorId(actor)]));
        return { readiness,annualRequirement:requirement,annualProgramEntry:entry,operationalWrites:false,eventPublication:false };
      });
    },

    async removeAnnualProgram(requirementId){
      const readiness = await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        const requirement=await requireScopedRequirement(client,requirementId);
        if(requirement.status !== 'DRAFT') throw new HttpError(409,'programmation_verrouillee','Une programmation READY doit être révisée, pas retirée.');
        const generated=Number((one(await client.query(`select count(*)::integer as count from scope_planned_occurrences where annual_requirement_id=$1`,[requirementId])) || {}).count || 0);
        if(generated) throw new HttpError(409,'programmation_deja_generee','Retirez ou révisez les réalisations avant de supprimer la programmation.');
        await client.query(`delete from scope_annual_program_entries where annual_requirement_id=$1`,[requirementId]);
        await client.query(`delete from scope_annual_requirement_theme_assignments where annual_requirement_id=$1`,[requirementId]);
        await client.query(`delete from scope_annual_requirements where annual_requirement_id=$1 and status='DRAFT'`,[requirementId]);
        return { readiness,removed:true,operationalWrites:false,eventPublication:false };
      });
    },

    async proposeSchedule(requirementId,body = {},actor){
      const readiness = await requireReady(database,readinessInspector);
      return database.transaction(async (client) => {
        const context=await contextLoader(client,{ requirementId });
        if(!context || !context.requirement) throw new HttpError(404,'programmation_introuvable','Programmation annuelle introuvable.');
        const planningMode=context.functionalProfile && context.functionalProfile.metadata &&
          context.functionalProfile.metadata.canonicalRule && context.functionalProfile.metadata.canonicalRule.planningMode;
        if(planningMode && planningMode !== 'AUTOMATIC') throw new HttpError(409,'planification_manuelle_requise',
          'Cette activité ne peut pas recevoir une date automatique : date annuelle, arbitrage ou non-reconduction requis.');
        if(!context.occurrences.length || !context.sessions.length) throw new HttpError(409,'realisations_non_generees','Générez d’abord les réalisations et leurs séances.');
        const entry=context.programEntry || {};
        const existing=rows(await client.query(`select s.*,ps.sequence as session_sequence,d.label as activity_label,d.code as definition_code,r.year
          from scope_planned_site_slots s join scope_planned_occurrence_sessions ps on ps.planned_occurrence_session_id=s.planned_occurrence_session_id
          join scope_planned_occurrences po on po.planned_occurrence_id=ps.planned_occurrence_id join scope_annual_requirements r on r.annual_requirement_id=po.annual_requirement_id
          join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id join scope_event_definitions d on d.definition_id=v.definition_id where r.year=$1`,[context.requirement.year]));
        const occupiedSlots=existing.map((row) => ({ slotId:row.planned_site_slot_id,definitionCode:row.definition_code,activityLabel:row.activity_label,
          date:dateOnly(row.preferred_date),startTime:String(row.preferred_start_time || '').slice(0,5),endTime:String(row.preferred_end_time || '').slice(0,5),
          siteCode:row.site_code,sessionSequence:row.session_sequence,publicCodes:row.public_codes || [],roleCodes:row.role_codes || [],resourceCodes:row.resource_codes || [],
          fixedDate:row.fixed_date,dayExclusive:row.day_exclusive,permutationAllowed:row.permutation_allowed,priority:row.priority,status:row.status }));
        const proposed=functionalCatalog.proposeAnnualSchedule({ definitionCode:context.definition.code,activityLabel:context.definition.label,year:context.requirement.year,
          profile:{ recurrenceKind:context.functionalProfile && context.functionalProfile.recurrence_kind || 'RECURRENT',defaultOccurrences:context.functionalProfile && context.functionalProfile.default_occurrences || context.requirement.requiredOccurrences,
            defaultSites:context.functionalProfile && context.functionalProfile.default_sites || [],ruleMode:context.functionalProfile && context.functionalProfile.rule_mode || 'GENERAL',customRule:context.functionalProfile && context.functionalProfile.custom_rule },
          override:{ state:entry.program_state || 'ACTIVE',occurrences:context.requirement.requiredOccurrences,sites:entry.site_codes || body.sites,extraordinary:entry.extraordinary },
          sessions:context.sessionTemplates.map((row) => ({ code:row.code,sequence:row.sequence,label:row.label,durationMinutes:row.duration_minutes })),
          publicCodes:context.publicBindings.map((row) => row.publicCode),windowStart:body.windowStart || context.requirement.windowStart,startTime:body.startTime || '19:30',
          endTime:body.endTime || '21:30',location:body.location,responsible:body.responsible,occupiedSlots });
        if(!proposed.valid) throw new HttpError(422,'proposition_planning_invalide','La proposition de planning est invalide.',{ errors:proposed.errors });
        const occurrencesByNumber=new Map(context.occurrences.map((row) => [Number(row.occurrence_number),row]));
        const templatesByCode=new Map(context.sessionTemplates.map((row) => [row.code,row]));
        const sessionsByKey=new Map(context.sessions.map((row) => [`${row.planned_occurrence_id}|${row.session_template_id}`,row]));
        for(const slot of proposed.slots){
          const occurrence=occurrencesByNumber.get(slot.occurrenceNumber); const template=templatesByCode.get(slot.sessionCode);
          const session=occurrence && template && sessionsByKey.get(`${occurrence.planned_occurrence_id}|${template.session_template_id}`);
          if(!session) continue;
          await client.query(`insert into scope_planned_site_slots(planned_site_slot_id,planned_occurrence_session_id,site_code,preferred_date,preferred_start_time,preferred_end_time,location_label,responsible_label,label_complement,final_label,status,public_codes,metadata)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PROPOSED',$11::text[],$12::jsonb)
            on conflict (planned_occurrence_session_id,site_code) do update set preferred_date=excluded.preferred_date,preferred_start_time=excluded.preferred_start_time,
              preferred_end_time=excluded.preferred_end_time,location_label=excluded.location_label,responsible_label=excluded.responsible_label,
              label_complement=coalesce(scope_planned_site_slots.label_complement,excluded.label_complement),final_label=coalesce(scope_planned_site_slots.final_label,excluded.final_label),
              public_codes=excluded.public_codes,updated_at=now()`,[
            slot.slotId,session.planned_occurrence_session_id,slot.siteCode,slot.date,slot.startTime,slot.endTime,slot.location,slot.responsible,
            slot.labelComplement,slot.finalLabel,slot.publicCodes,JSON.stringify({ source:'C18_PROPOSAL',actor:actorId(actor) })]);
        }
        return { readiness,slots:proposed.slots,conflicts:functionalCatalog.detectCompatibilityConflicts(occupiedSlots.concat(proposed.slots)),operationalWrites:false,eventPublication:false };
      });
    },

    async updateSiteSlot(slotId,body = {}){
      const readiness = await requireReady(database,readinessInspector);
      const status=text(body.status || 'PROPOSED').toUpperCase();
      if(!functionalCatalog.SLOT_STATES.includes(status)) throw new HttpError(422,'statut_creneau_invalide','Le statut du créneau est invalide.');
      const startTime = strictTime(body.startTime);
      const endTime = strictTime(body.endTime);
      if(startTime && endTime && functionalCatalog.durationMinutes(startTime,endTime) == null){
        throw new HttpError(422,'horaire_creneau_invalide','L’heure de fin doit suivre l’heure de début. Le passage de minuit n’est pas activé pour cette programmation.');
      }
      const current=one(await database.query(
        `select s.*,d.label as activity_label,po.occurrence_number,ps.sequence as session_sequence,
                (select count(*) from scope_planned_occurrence_sessions siblings where siblings.planned_occurrence_id=po.planned_occurrence_id) as session_count
           from scope_planned_site_slots s
           join scope_planned_occurrence_sessions ps on ps.planned_occurrence_session_id=s.planned_occurrence_session_id
           join scope_planned_occurrences po on po.planned_occurrence_id=ps.planned_occurrence_id
           join scope_annual_requirements r on r.annual_requirement_id=po.annual_requirement_id
           join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id
           join scope_event_definitions d on d.definition_id=v.definition_id
          where s.planned_site_slot_id=$1`,[slotId]));
      if(!current) throw new HttpError(404,'creneau_introuvable','Créneau planifié introuvable.');
      const complement = text(body.labelComplement ?? body.label_complement ?? current.label_complement) || null;
      const publicCodes = Object.prototype.hasOwnProperty.call(body,'publicCodes') || Object.prototype.hasOwnProperty.call(body,'public_codes')
        ? await requireCanonicalCodes(database,body.publicCodes || body.public_codes || [],'PUBLIC') : upperList(current.public_codes || []);
      if(!publicCodes.length) throw new HttpError(422,'public_effectif_requis','Sélectionnez au moins un public canonique pour ce créneau.');
      const finalLabel = functionalCatalog.scheduledActivityLabel(current.activity_label,current.occurrence_number,current.session_sequence,current.session_count,complement);
      const updated=one(await database.query(`update scope_planned_site_slots set preferred_date=$2,preferred_start_time=$3,preferred_end_time=$4,location_label=$5,
        responsible_label=$6,label_complement=$7,final_label=$8,status=$9,public_codes=$10::text[],updated_at=now() where planned_site_slot_id=$1 returning *`,[slotId,strictDate(body.date),startTime,endTime,
        text(body.location) || null,text(body.responsible) || null,complement,finalLabel,status,publicCodes]));
      if(!updated) throw new HttpError(404,'creneau_introuvable','Créneau planifié introuvable.');
      return { readiness,slot:updated,operationalWrites:false,eventPublication:false };
    },

    async listPublicConflicts(year){
      const readiness = await requireReady(database,readinessInspector);
      const slots=rows(await database.query(`select s.planned_site_slot_id as slot_id,s.site_code,date(s.preferred_date) as date,
        to_char(s.preferred_start_time,'HH24:MI') as start_time,to_char(s.preferred_end_time,'HH24:MI') as end_time,s.status,s.public_codes,
        s.role_codes,s.resource_codes,s.fixed_date,s.day_exclusive,s.permutation_allowed,s.priority,
        po.occurrence_number,ps.sequence as session_sequence,d.code as definition_code,d.label as activity_label
        from scope_planned_site_slots s join scope_planned_occurrence_sessions ps on ps.planned_occurrence_session_id=s.planned_occurrence_session_id
        join scope_planned_occurrences po on po.planned_occurrence_id=ps.planned_occurrence_id join scope_annual_requirements r on r.annual_requirement_id=po.annual_requirement_id
        join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id join scope_event_definitions d on d.definition_id=v.definition_id
        where r.year=$1 and s.preferred_date is not null and s.preferred_start_time is not null and s.preferred_end_time is not null`,[integer(year)]));
      const normalized=slots.map((row) => ({ slotId:row.slot_id,siteCode:row.site_code,date:dateOnly(row.date),startTime:row.start_time,endTime:row.end_time,status:row.status,
        publicCodes:row.public_codes || [],roleCodes:row.role_codes || [],resourceCodes:row.resource_codes || [],fixedDate:row.fixed_date,
        dayExclusive:row.day_exclusive,permutationAllowed:row.permutation_allowed,priority:row.priority,occurrenceNumber:row.occurrence_number,sessionSequence:row.session_sequence,
        definitionCode:row.definition_code,activityLabel:row.activity_label }));
      return { readiness,year:integer(year),conflicts:functionalCatalog.detectCompatibilityConflicts(normalized),operationalWrites:false,eventPublication:false };
    },

    async previewQuoVadis(requirementId){
      const readiness = await requireReady(database,readinessInspector);
      const context = await contextLoader(database,{ requirementId });
      if(!context) throw new HttpError(404,'besoin_annuel_introuvable','Besoin annuel introuvable.');
      const generated = generateAnnualProgram(context);
      if(!generated.complete) throw new HttpError(422,'apercu_quovadis_indisponible','Passez le besoin à READY avant de préparer QUO VADIS.',{ errors: generated.errors });
      const projection = projectToQuoVadis({ ...context,occurrences: generated.occurrences,sessions: generated.sessions });
      return { readiness,mode: 'MIRROR',operationalWrites: false,eventPublication: false,
        annualRequirement: { year: context.requirement.year,windowStart: context.requirement.windowStart,windowEnd: context.requirement.windowEnd,requiredOccurrences: context.requirement.requiredOccurrences },
        constraints: context.planningConstraints,projection };
    }
  };
}

module.exports = { INITIAL_ACTIVITY_CODES,DOMAIN_ORDER,PLANNING_MODES,canonicalRule,groupExerciseOccurrences,validateDraftInput,readyErrorMessage,readyTransitionMessage,toPublicReadyTransition,readinessForClient,inspectReadyTransition,createScopeAnnualCatalogService,loadContext };
