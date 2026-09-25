'use strict';

const db = require('./_postgres');
const { HttpError } = require('./_scope-rules');
const { inspectCanonicalReadiness } = require('./_scope-canonical-readiness');
const annualCatalogCore = require('./_scope-annual-catalog');
const { prepareAnnualRequirementReady,generateAnnualProgram,projectToQuoVadis,validateThemeAssignments } = annualCatalogCore;
const catalogImport = require('./_scope-annual-catalog-import');

const INITIAL_ACTIVITY_CODES = Object.freeze([
  'DPS-EXERCICE','DPS-INSTRUCTION-SECTION','DPS-INSTRUCTION-DEMI-SECTION','DPS-DAP-EXERCICE',
  'DAP-EXERCICE','JSP-EXERCICE','PR-EXERCICE-PAPR','PR-PISTE-GAZ','PR-TEST-PHYSIQUE'
]);
const DOMAIN_ORDER = Object.freeze(['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']);
function domainRank(code){ const index = DOMAIN_ORDER.indexOf(text(code).toUpperCase()); return index < 0 ? DOMAIN_ORDER.length : index; }

function text(value){ return String(value == null ? '' : value).trim(); }
function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0,10);
  return String(value).slice(0,10);
}
function integer(value){ const parsed = Number(value); return Number.isInteger(parsed) ? parsed : null; }
function actorId(actor){ return text(actor && (actor.sub || actor.subject || actor.email)) || 'scope-user'; }
function rows(result){ return result && Array.isArray(result.rows) ? result.rows : []; }
function one(result){ return rows(result)[0] || null; }

function upperList(value){ return [...new Set((Array.isArray(value) ? value : []).map((item) => text(item).toUpperCase()).filter(Boolean))]; }
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
  return { label,description:text(body.description ?? defaults.description) || null,primaryDomain,domainCodes,activityType,periodicityType,
    durationMinutes,familyCode,publicCodes:upperList(body.publicCodes || defaults.publicCodes),statComCodes:upperList(body.statComCodes || defaults.statComCodes),
    qualificationCodes:upperList(body.qualificationCodes || defaults.qualificationCodes),themes:[...new Set((body.themes || defaults.themes || []).map(text).filter(Boolean))] };
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
  const next = Number((one(await client.query(`select coalesce(max((regexp_match(version_code,'([0-9]+)$'))[1]::integer),0)+1 as value from scope_event_definition_versions where definition_id=$1`,[definition.definition_id])) || {}).value || 1);
  const versionCode = `C15-V${next}`;
  const contract = { definition:{ activityType:input.activityType },domainBindings:input.domainCodes.map((code) => ({ domainCode:code,bindingRole:code === input.primaryDomain ? 'PRIMARY' : 'SECONDARY' })),
    sessionTemplates:[{ code:'S1',sequence:1,label:input.label,durationMinutes:input.durationMinutes }],periodicity:{ type:input.periodicityType },
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
    await client.query(
      `insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,min_offset_minutes,max_offset_minutes,
         depends_on_session_template_id,public_continuity,location_continuity,metadata)
       select $1,code,sequence,label,mandatory,case when sequence=1 then $3 else duration_minutes end,min_offset_minutes,max_offset_minutes,
         null,public_continuity,location_continuity,metadata || $4::jsonb
       from scope_activity_session_templates where definition_version_id=$2 order by sequence`,
      [versionId,options.cloneFromVersionId,input.durationMinutes,JSON.stringify(metadata)]);
    await client.query(
      `update scope_activity_session_templates child set depends_on_session_template_id=parent_new.session_template_id
       from scope_activity_session_templates child_old
       join scope_activity_session_templates parent_old on parent_old.session_template_id=child_old.depends_on_session_template_id
       join scope_activity_session_templates parent_new on parent_new.definition_version_id=$1 and parent_new.code=parent_old.code
       where child.definition_version_id=$1 and child_old.definition_version_id=$2 and child.code=child_old.code`,
      [versionId,options.cloneFromVersionId]);
    await client.query(
      `insert into scope_activity_periodicities(definition_version_id,periodicity_type,interval_value,anchor_date,anchor_year,occurrences_per_cycle,
         tolerance_before_days,tolerance_after_days,metadata)
       select $1,periodicity_type,interval_value,anchor_date,anchor_year,occurrences_per_cycle,tolerance_before_days,tolerance_after_days,metadata || $3::jsonb
       from scope_activity_periodicities where definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    await client.query(
      `insert into scope_activity_public_bindings(definition_version_id,annual_requirement_id,public_definition_id,public_rule_version_id,group_code,operator,binding_type,metadata)
       select $1,null,public_definition_id,public_rule_version_id,group_code,operator,binding_type,metadata || $3::jsonb
       from scope_activity_public_bindings where definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
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
       where c.definition_version_id=$2`,[versionId,options.cloneFromVersionId,JSON.stringify(metadata)]);
    if(!options.deferActivation) await client.query(`update scope_event_definition_versions set status='ACTIVE',updated_at=now() where definition_version_id=$1 and status='DRAFT'`,[versionId]);
    return { definitionVersionId:versionId,versionCode,fingerprint:versionFingerprint };
  }
  for(const code of input.domainCodes) await client.query(
    `insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata) values ($1,$2,$3,$4::jsonb)`,
    [versionId,code,code === input.primaryDomain ? 'PRIMARY' : 'SECONDARY',JSON.stringify(metadata)]);
  await client.query(
    `insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,public_continuity,location_continuity,metadata)
     values ($1,'S1',1,$2,true,$3,'INHERIT','INHERIT',$4::jsonb)`,[versionId,input.label,input.durationMinutes,JSON.stringify(metadata)]);
  await client.query(
    `insert into scope_activity_periodicities(definition_version_id,periodicity_type,metadata) values ($1,$2,$3::jsonb)`,
    [versionId,input.periodicityType,JSON.stringify(metadata)]);
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
    `select r.*,c.code as location_category_code,c.label as location_category_label from scope_activity_location_requirements r left join scope_location_categories c on c.location_category_id=r.location_category_id where r.definition_version_id=$1 order by r.alternative_group,r.requirement_type`
  );
  const responsibleRequirements = await query(`select * from scope_activity_responsible_requirements where definition_version_id=$1 order by created_at`);
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
  const preparedOccurrenceCount = occurrenceIds.length ? Number((one(await database.query(
    `select count(distinct planned_occurrence_id)::integer as count from scope_quo_vadis_obligations where planned_occurrence_id=any($1::uuid[])`,[occurrenceIds])) || {}).count || 0) : 0;
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
    responsibleRequirements,planningConstraints,statisticalContributions,activityThemeBindings,
    availableThemes: activityThemeBindings.map((row) => ({ themeVersionId: row.theme_version_id,themeDefinitionId: row.theme_definition_id,
      definitionId: base.definition_id,code: row.code,label: row.label,description: row.description,status: row.theme_version_status,versionNumber: row.version_number })),
    themeAssignments,occurrences,sessions,preparedOccurrenceCount
  };
}

function serializeContext(context,readiness,readyTransition){
  return { readiness,readyTransition,activity: { ...context.definition,version: context.version },annualRequirement: context.requirement,
    configuration: { domains: context.domainBindings,sessions: context.sessionTemplates,periodicity: context.periodicity,publics: context.publicBindings,
      pinnedPublics: context.requirement && context.requirement.snapshot && context.requirement.snapshot.publicBindings || [],
      qualifications: context.qualificationBindings,roles: context.roleRequirements,locations: context.locationRequirements,responsibles: context.responsibleRequirements,
      constraints: context.planningConstraints,statCom: context.statisticalContributions,availableThemes: context.availableThemes },
    annualThemeAssignments: context.themeAssignments,
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
                (select count(*)::integer from scope_activity_session_templates st where st.definition_version_id=v.definition_version_id) as template_session_count,
                (select string_agg(p.code,', ' order by p.code) from scope_activity_public_bindings pb join scope_public_definitions p on p.public_definition_id=pb.public_definition_id where pb.definition_version_id=v.definition_version_id) as public_codes,
                coalesce(o.occurrence_count,0)::integer as occurrence_count,coalesce(o.session_count,0)::integer as generated_session_count,
                coalesce(t.themed_occurrence_count,0)::integer as themed_occurrence_count,coalesce(q.prepared_occurrence_count,0)::integer as prepared_occurrence_count
           from scope_event_definitions d join scope_event_definition_versions v on v.definition_id=d.definition_id and v.status='ACTIVE'
           left join scope_annual_requirements r on r.definition_version_id=v.definition_version_id and r.year=$1 and r.status in ('DRAFT','READY')
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
      const status = text(filters.status).toUpperCase();
      const activities = rows(result).filter((row) => !query || `${row.code} ${row.label}`.toLocaleLowerCase('fr').includes(query))
        .filter((row) => !domain || domain === 'TOUS' || row.domain === domain)
        .filter((row) => !status || status === 'TOUS' || (row.status === 'ARCHIVE' ? 'ARCHIVE' : row.requirement_status || 'A_DEFINIR') === status)
        .sort((a,b) => domainRank(a.domain) - domainRank(b.domain) || a.label.localeCompare(b.label,'fr'))
        .map((row) => ({ code: row.code,label: row.label,domain: row.domain,familyCode: row.family_code,activityType: row.activity_type,archived: row.status === 'ARCHIVE',
          definitionVersionId: row.definition_version_id,versionCode: row.version_code,annualRequirementId: row.annual_requirement_id || null,
          requiredOccurrences: row.required_occurrences || null,variantCode: row.variant_code || null,windowStart: dateOnly(row.window_start),windowEnd: dateOnly(row.window_end),
          status: row.status === 'ARCHIVE' ? 'ARCHIVE' : row.requirement_status || 'A_DEFINIR',occurrenceCount: row.occurrence_count,sessionCount: row.template_session_count,
          generatedSessionCount: row.generated_session_count,publicCodes: row.public_codes || '',themedOccurrenceCount: row.themed_occurrence_count,
          unthemedOccurrenceCount: row.required_occurrences == null ? null : Math.max(0,row.required_occurrences - row.themed_occurrence_count),
          preparedOccurrenceCount: row.prepared_occurrence_count }));
      return { readiness,year,activities };
    },

    async getActivity(code,filters = {}){
      const readiness = await requireReady(database,readinessInspector);
      const context = await contextLoader(database,{ code,year: integer(filters.year) || new Date().getUTCFullYear() });
      if(!context) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
      return serializeContext(context,readiness,await inspectReadyTransition(database,context));
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
        const periodicity = one(await client.query(`select periodicity_type from scope_activity_periodicities where definition_version_id=$1`,[current.definition_version_id]));
        const publicRows = rows(await client.query(
          `select p.code from scope_activity_public_bindings b join scope_public_definitions p on p.public_definition_id=b.public_definition_id where b.definition_version_id=$1 order by p.code`,
          [current.definition_version_id]));
        const qualificationRows = rows(await client.query(
          `select c.code from scope_activity_qualification_bindings b join scope_competence_definitions c on c.competence_id=b.competence_id where b.definition_version_id=$1 order by c.code`,
          [current.definition_version_id]));
        const statComRows = rows(await client.query(
          `select statcom_code as code from scope_activity_statistical_contributions where definition_version_id=$1 order by statcom_code`,
          [current.definition_version_id]));
        const themeRows = rows(await client.query(
          `select v.label from scope_activity_theme_bindings b join scope_theme_definitions d on d.theme_definition_id=b.theme_definition_id
             join scope_theme_versions v on v.theme_definition_id=d.theme_definition_id and v.status='ACTIVE'
            where b.definition_id=$1 and b.status='ACTIVE' order by v.label`,[current.definition_id]));
        const input = normalizeActivityInput(body,{ label:current.label,description:current.description,primaryDomain:(domainRows.find((row) => row.binding_role === 'PRIMARY') || {}).domain_code || current.domain,
          domainCodes:domainRows.map((row) => row.domain_code),activityType:current.activity_type,familyCode:current.family_code,durationMinutes:session && session.duration_minutes,
          periodicityType:periodicity && periodicity.periodicity_type,publicCodes:publicRows.map((row) => row.code),qualificationCodes:qualificationRows.map((row) => row.code),
          statComCodes:statComRows.map((row) => row.code),themes:themeRows.map((row) => row.label) });
        const version = await insertActivityVersion(client,current,input,actor,{ source:'C15_MANUAL_REVISION',supersedes:current.definition_version_id },{ deferActivation:true,cloneFromVersionId:current.definition_version_id });
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
             (select count(*) from scope_catalog_import_decisions d where d.target_definition_id=$1) as import_decision_count`,[definition.definition_id]));
        if(['annual_requirement_count','event_count','alias_count','import_decision_count'].some((key) => Number(usage && usage[key] || 0) > 0)){
          throw new HttpError(409,'activite_utilisee_archivage_requis','Cette activité est historisée et doit être archivée, pas supprimée.');
        }
        const versions = rows(await client.query(`select definition_version_id from scope_event_definition_versions where definition_id=$1`,[definition.definition_id])).map((row) => row.definition_version_id);
        await client.query(`update scope_event_definition_versions set status='RETIRED' where definition_id=$1 and status='ACTIVE'`,[definition.definition_id]);
        for(const table of ['scope_activity_statistical_contributions','scope_activity_planning_constraints','scope_activity_responsible_requirements','scope_activity_location_requirements','scope_activity_role_requirements','scope_activity_qualification_bindings','scope_activity_public_bindings','scope_activity_periodicities','scope_activity_session_templates','scope_activity_domain_bindings']){
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

module.exports = { INITIAL_ACTIVITY_CODES,DOMAIN_ORDER,validateDraftInput,readyErrorMessage,readyTransitionMessage,toPublicReadyTransition,readinessForClient,inspectReadyTransition,createScopeAnnualCatalogService,loadContext };
