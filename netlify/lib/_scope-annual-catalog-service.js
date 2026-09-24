'use strict';

const db = require('./_postgres');
const { HttpError } = require('./_scope-rules');
const { inspectCanonicalReadiness } = require('./_scope-canonical-readiness');
const { prepareAnnualRequirementReady,generateAnnualProgram,projectToQuoVadis } = require('./_scope-annual-catalog');

const INITIAL_ACTIVITY_CODES = Object.freeze([
  'DPS-EXERCICE','DPS-INSTRUCTION-SECTION','DPS-INSTRUCTION-DEMI-SECTION','DPS-DAP-EXERCICE',
  'DAP-EXERCICE','JSP-EXERCICE','PR-EXERCICE-PAPR','PR-PISTE-GAZ','PR-TEST-PHYSIQUE'
]);
const DOMAIN_ORDER = Object.freeze(['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']);

function text(value){ return String(value == null ? '' : value).trim(); }
function dateOnly(value){ return value ? String(value).slice(0,10) : null; }
function integer(value){ const parsed = Number(value); return Number.isInteger(parsed) ? parsed : null; }
function actorId(actor){ return text(actor && (actor.sub || actor.subject || actor.email)) || 'scope-user'; }
function rows(result){ return result && Array.isArray(result.rows) ? result.rows : []; }
function one(result){ return rows(result)[0] || null; }

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

async function findDefinition(database,code){
  return one(await database.query(
    `select d.definition_id,d.code,d.label,d.domain,d.family_code,d.activity_type,d.active,d.metadata as definition_metadata,
            v.definition_version_id,v.version_code,v.status as version_status,v.description,v.fingerprint as version_fingerprint,v.metadata as version_metadata
       from scope_event_definitions d
       join scope_event_definition_versions v on v.definition_id=d.definition_id and v.version_code='C5-B-V1' and v.status='ACTIVE'
      where d.code=$1 and d.code=any($2::text[])`, [text(code).toUpperCase(),INITIAL_ACTIVITY_CODES]));
}

async function requireScopedRequirement(database,requirementId){
  const requirement = one(await database.query(
    `select r.*,d.code as definition_code
       from scope_annual_requirements r
       join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id
       join scope_event_definitions d on d.definition_id=v.definition_id
      where r.annual_requirement_id=$1`, [requirementId]));
  if(!requirement) throw new HttpError(404,'besoin_annuel_introuvable','Besoin annuel introuvable.');
  if(!INITIAL_ACTIVITY_CODES.includes(requirement.definition_code)){
    throw new HttpError(422,'ANNUAL_REQUIREMENT_OUT_OF_SCOPE','Ce besoin annuel n’appartient pas au catalogue C6-B autorisé.');
  }
  return requirement;
}

async function loadContext(database,options = {}){
  let base;
  if(options.requirementId){
    base = one(await database.query(
      `select d.definition_id,d.code,d.label,d.domain,d.family_code,d.activity_type,d.active,d.metadata as definition_metadata,
              v.definition_version_id,v.version_code,v.status as version_status,v.description,v.fingerprint as version_fingerprint,v.metadata as version_metadata,
              r.*
         from scope_annual_requirements r join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id
         join scope_event_definitions d on d.definition_id=v.definition_id
        where r.annual_requirement_id=$1 and d.code=any($2::text[])`, [options.requirementId,INITIAL_ACTIVITY_CODES]));
  }else{
    const definition = await findDefinition(database,options.code);
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
    `select b.*,c.code as competence_code,c.label as competence_label from scope_activity_qualification_bindings b join scope_competence_definitions c on c.competence_id=b.competence_id where b.definition_version_id=$1 order by b.binding_type,c.code`
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
  const occurrences = requirementId ? await query(`select * from scope_planned_occurrences where annual_requirement_id=$1 order by occurrence_number`,[requirementId]) : [];
  const occurrenceIds = occurrences.map((row) => row.planned_occurrence_id);
  const sessions = occurrenceIds.length ? await query(`select * from scope_planned_occurrence_sessions where planned_occurrence_id=any($1::uuid[]) order by planned_occurrence_id,sequence`,[occurrenceIds]) : [];
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
    responsibleRequirements,planningConstraints,statisticalContributions,occurrences,sessions
  };
}

function serializeContext(context,readiness){
  return { readiness,activity: { ...context.definition,version: context.version },annualRequirement: context.requirement,
    configuration: { domains: context.domainBindings,sessions: context.sessionTemplates,periodicity: context.periodicity,publics: context.publicBindings,
      pinnedPublics: context.requirement && context.requirement.snapshot && context.requirement.snapshot.publicBindings || [],
      qualifications: context.qualificationBindings,roles: context.roleRequirements,locations: context.locationRequirements,responsibles: context.responsibleRequirements,
      constraints: context.planningConstraints,statCom: context.statisticalContributions },
    generation: { occurrences: context.occurrences,sessions: context.sessions } };
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
      const result = await database.query(
        `select d.code,d.label,d.domain,d.family_code,d.activity_type,v.definition_version_id,v.version_code,
                r.annual_requirement_id,r.required_occurrences,r.variant_code,r.window_start,r.window_end,r.status as requirement_status,
                (select count(*)::integer from scope_activity_session_templates st where st.definition_version_id=v.definition_version_id) as template_session_count,
                (select string_agg(p.code,', ' order by p.code) from scope_activity_public_bindings pb join scope_public_definitions p on p.public_definition_id=pb.public_definition_id where pb.definition_version_id=v.definition_version_id) as public_codes,
                coalesce(o.occurrence_count,0)::integer as occurrence_count,coalesce(o.session_count,0)::integer as generated_session_count
           from scope_event_definitions d join scope_event_definition_versions v on v.definition_id=d.definition_id and v.version_code='C5-B-V1' and v.status='ACTIVE'
           left join scope_annual_requirements r on r.definition_version_id=v.definition_version_id and r.year=$1 and r.status in ('DRAFT','READY')
           left join lateral (select count(distinct po.planned_occurrence_id) as occurrence_count,count(pos.planned_occurrence_session_id) as session_count
             from scope_planned_occurrences po left join scope_planned_occurrence_sessions pos on pos.planned_occurrence_id=po.planned_occurrence_id
            where po.annual_requirement_id=r.annual_requirement_id) o on true
          where d.code=any($2::text[])`, [year,INITIAL_ACTIVITY_CODES]);
      const query = text(filters.query || filters.q).toLocaleLowerCase('fr');
      const domain = text(filters.domain).toUpperCase();
      const status = text(filters.status).toUpperCase();
      const activities = rows(result).filter((row) => !query || `${row.code} ${row.label}`.toLocaleLowerCase('fr').includes(query))
        .filter((row) => !domain || domain === 'TOUS' || row.domain === domain)
        .filter((row) => !status || status === 'TOUS' || (row.requirement_status || 'A_DEFINIR') === status)
        .sort((a,b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) || a.label.localeCompare(b.label,'fr'))
        .map((row) => ({ code: row.code,label: row.label,domain: row.domain,familyCode: row.family_code,activityType: row.activity_type,
          definitionVersionId: row.definition_version_id,versionCode: row.version_code,annualRequirementId: row.annual_requirement_id || null,
          requiredOccurrences: row.required_occurrences || null,variantCode: row.variant_code || null,windowStart: dateOnly(row.window_start),windowEnd: dateOnly(row.window_end),
          status: row.requirement_status || 'A_DEFINIR',occurrenceCount: row.occurrence_count,sessionCount: row.template_session_count,
          generatedSessionCount: row.generated_session_count,publicCodes: row.public_codes || '' }));
      return { readiness,year,activities };
    },

    async getActivity(code,filters = {}){
      const readiness = await requireReady(database,readinessInspector);
      const context = await contextLoader(database,{ code,year: integer(filters.year) || new Date().getUTCFullYear() });
      if(!context) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
      return serializeContext(context,readiness);
    },

    async createDraft(body,actor){
      const readiness = await requireReady(database,readinessInspector);
      const input = validateDraftInput(body);
      const definition = await definitionFinder(database,body.code);
      if(!definition) throw new HttpError(404,'activite_catalogue_introuvable','Activité annuelle introuvable.');
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
        const prepared = prepareAnnualRequirementReady({ ...context,publicDefinitions,publicRuleVersions });
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

module.exports = { INITIAL_ACTIVITY_CODES,DOMAIN_ORDER,validateDraftInput,readyErrorMessage,readinessForClient,createScopeAnnualCatalogService,loadContext };
