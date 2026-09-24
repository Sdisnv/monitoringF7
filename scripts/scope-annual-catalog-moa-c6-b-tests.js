'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { inspectCanonicalReadiness } = require('../netlify/lib/_scope-canonical-readiness');
const { createScopeAnnualCatalogService,INITIAL_ACTIVITY_CODES,DOMAIN_ORDER,validateDraftInput } = require('../netlify/lib/_scope-annual-catalog-service');
const { prepareAnnualRequirementReady,generateAnnualProgram } = require('../netlify/lib/_scope-annual-catalog');
const uiLogic = require('../assets/js/scope-ui-logic');

const root = path.resolve(__dirname,'..');
let passed = 0;
async function test(name,fn){ await fn(); passed += 1; process.stdout.write(`PASS ${name}\n`); }

const EXPECTED_MIGRATIONS = [
  'scope-canonical-foundations-c1','scope-public-engine-mirror-c2-b','scope-person-qualifications-c3-b',
  'scope-annual-catalog-c4-b','scope-catalog-convergence-c5-b','scope-annual-catalog-themes-c8-b'
];
const EXPECTED_TABLES = [
  'scope_ois','scope_competence_definitions','scope_public_definitions','scope_public_rule_versions','scope_person_qualifications',
  'scope_event_role_definitions','scope_activity_domain_bindings','scope_activity_session_templates','scope_activity_periodicities',
  'scope_annual_requirements','scope_activity_public_bindings','scope_activity_qualification_bindings','scope_activity_role_requirements',
  'scope_location_categories','scope_activity_location_requirements','scope_activity_responsible_requirements','scope_activity_planning_constraints',
  'scope_activity_statistical_contributions','scope_planned_occurrences','scope_planned_occurrence_sessions','scope_activity_legacy_aliases',
  'scope_theme_definitions','scope_theme_versions','scope_activity_theme_bindings','scope_annual_requirement_theme_assignments',
  'scope_event_definitions','scope_event_definition_versions','scope_quo_vadis_obligations','scope_quo_vadis_proposals'
];
const EXPECTED_COLUMNS = {
  scope_event_definitions: ['definition_id','code','label','domain','family_code','activity_type','status','metadata'],
  scope_event_definition_versions: ['definition_version_id','definition_id','version_code','status','description','fingerprint','metadata'],
  scope_annual_requirements: ['annual_requirement_id','year','definition_version_id','variant_code','required_occurrences','window_start','window_end','status','snapshot','fingerprint'],
  scope_planned_occurrences: ['planned_occurrence_id','annual_requirement_id','occurrence_number','status'],
  scope_planned_occurrence_sessions: ['planned_occurrence_session_id','planned_occurrence_id','session_template_id','sequence','status'],
  scope_theme_definitions: ['theme_definition_id','code','status','metadata'],
  scope_theme_versions: ['theme_version_id','theme_definition_id','version_number','label','status','fingerprint'],
  scope_annual_requirement_theme_assignments: ['annual_theme_assignment_id','annual_requirement_id','occurrence_number','theme_version_id','free_label','session_template_id'],
  scope_quo_vadis_obligations: ['planned_occurrence_id'],scope_quo_vadis_proposals: ['planned_occurrence_session_id']
};
const EXPECTED_FUNCTIONS = [
  'scope_public_definitions_guard_code','scope_public_rule_versions_guard_active','scope_person_qualifications_guard',
  'scope_activity_definition_version_guard','scope_annual_requirement_guard','scope_planned_occurrence_session_guard',
  'scope_qv_proposal_catalog_link_guard','scope_qv_obligation_catalog_link_guard','scope_theme_definitions_guard_code',
  'scope_normalize_theme_label','scope_theme_versions_guard_active','scope_activity_theme_binding_guard','scope_annual_requirement_theme_count_guard','scope_annual_theme_assignment_guard'
];
const EXPECTED_TRIGGERS = [
  'scope_public_definitions_guard_code_trg','scope_public_rule_versions_guard_active_trg','scope_person_qualifications_guard_trg',
  'scope_activity_definition_version_guard_trg','scope_annual_requirement_guard_trg','scope_planned_occurrence_session_guard_trg',
  'scope_qv_proposal_catalog_link_guard_trg','scope_qv_obligation_catalog_link_guard_trg','scope_theme_definitions_guard_code_trg',
  'scope_theme_versions_guard_active_trg','scope_activity_theme_binding_guard_trg','scope_annual_requirement_theme_count_guard_trg','scope_annual_theme_assignment_guard_trg'
];

function metadataDb(options = {}){
  const migrations = options.migrations || EXPECTED_MIGRATIONS;
  const tables = options.tables || EXPECTED_TABLES;
  const columns = options.columns || Object.entries(EXPECTED_COLUMNS).flatMap(([table,names]) => names.map((column_name) => ({ table_name: table,column_name })));
  const functions = options.functions || EXPECTED_FUNCTIONS;
  const triggers = options.triggers || EXPECTED_TRIGGERS;
  const queries = [];
  return { queries,async query(sql){
    queries.push(sql);
    if(sql.includes('monitoring_f7_schema_migrations')) return { rows: migrations.map((version) => ({ version })) };
    if(sql.includes('information_schema.tables')) return { rows: tables.map((table_name) => ({ table_name })) };
    if(sql.includes('information_schema.columns')) return { rows: columns };
    if(sql.includes('pg_proc')) return { rows: functions.map((function_name) => ({ function_name })) };
    if(sql.includes('pg_trigger')) return { rows: triggers.map((trigger_name) => ({ trigger_name })) };
    throw new Error(`Unexpected metadata query: ${sql}`);
  } };
}

function fixture(status = 'DRAFT'){
  const requirement = { annualRequirementId: '10000000-0000-4000-8000-000000000001',annual_requirement_id: '10000000-0000-4000-8000-000000000001',
    definitionVersionId: '20000000-0000-4000-8000-000000000001',year: 2027,requiredOccurrences: 2,required_occurrences: 2,
    variantCode: 'DEFAULT',windowStart: '2027-02-01',windowEnd: '2027-11-30',status,snapshot: {},fingerprint: null };
  return {
    definition: { definitionId: '30000000-0000-4000-8000-000000000001',code: 'DPS-EXERCICE',label: 'Exercice DPS',domain: 'DPS',activityType: 'EXERCISE' },
    version: { definitionVersionId: requirement.definitionVersionId,versionCode: 'C5-B-V1',status: 'ACTIVE',fingerprint: 'a'.repeat(64) },
    requirement,domainBindings: [{ domain_code: 'DPS',binding_role: 'PRIMARY' }],
    sessionTemplates: [{ session_template_id: '40000000-0000-4000-8000-000000000001',code: 'S1',sequence: 1,label: 'Séance DPS',mandatory: true,duration_minutes: 120,public_continuity: 'INHERIT',location_continuity: 'INHERIT' }],
    periodicity: { periodicity_type: 'ANNUAL',interval_value: null,occurrences_per_cycle: null,tolerance_before_days: 0,tolerance_after_days: 0 },
    publicBindings: [{ publicDefinitionId: '50000000-0000-4000-8000-000000000001',public_definition_id: '50000000-0000-4000-8000-000000000001',group_code: 'DEFAULT',operator: 'UNION',binding_type: 'TARGET',publicCode: 'DPS-GEN' }],
    qualificationBindings: [],roleRequirements: [],locationRequirements: [],responsibleRequirements: [],planningConstraints: [],statisticalContributions: [],occurrences: [],sessions: []
  };
}

function readyFixture(){
  const context = fixture('DRAFT');
  const result = prepareAnnualRequirementReady({ ...context,
    publicDefinitions: [{ public_definition_id: '50000000-0000-4000-8000-000000000001',status: 'ACTIVE' }],
    publicRuleVersions: [{ public_rule_version_id: '60000000-0000-4000-8000-000000000001',public_definition_id: '50000000-0000-4000-8000-000000000001',status: 'ACTIVE',valid_from: '2027-01-01',valid_to: '2027-12-31' }]
  });
  assert.equal(result.valid,true);
  return { ...context,requirement: result.requirement,publicBindings: result.publicBindings };
}

function memoryServiceDb(options = {}){
  const statements = [];
  const occurrences = new Map();
  const sessions = new Map();
  const scopedRequirement = options.scopedRequirement || {
    annual_requirement_id: '10000000-0000-4000-8000-000000000001',definition_version_id: '20000000-0000-4000-8000-000000000001',
    definition_code: 'DPS-EXERCICE',year: 2027,required_occurrences: 2,variant_code: 'DEFAULT',priority: 100,status: 'DRAFT'
  };
  return {
    statements,occurrences,sessions,
    transaction(callback){ return callback(this); },
    async query(sql,params = []){
      statements.push(sql);
      if(sql.includes('from scope_annual_requirements r') && sql.includes('join scope_event_definition_versions')) return { rows: scopedRequirement ? [{ ...scopedRequirement,annual_requirement_id: params[0] }] : [] };
      if(sql.includes('scope_public_definitions where')) return { rows: [{ public_definition_id: '50000000-0000-4000-8000-000000000001',status: 'ACTIVE' }] };
      if(sql.includes('scope_public_rule_versions where')) return { rows: [{ public_rule_version_id: '60000000-0000-4000-8000-000000000001',public_definition_id: '50000000-0000-4000-8000-000000000001',status: 'ACTIVE',valid_from: '2027-01-01',valid_to: '2027-12-31' }] };
      if(sql.includes('insert into scope_activity_public_bindings')) return { rows: [] };
      if(sql.includes('insert into scope_annual_requirement_theme_assignments') && sql.includes('select $1')) return { rows: [] };
      if(sql.includes("set status='READY'")) return { rows: [{ annual_requirement_id: params[0],status: 'READY',snapshot: JSON.parse(params[1]),fingerprint: params[2] }] };
      if(sql.includes("set status='SUPERSEDED'")) return { rows: [] };
      if(sql.includes('update scope_annual_requirements set required_occurrences=')) return { rows: [{ ...scopedRequirement,annual_requirement_id: params[0],required_occurrences: params[1],window_start: params[2],window_end: params[3],variant_code: params[4],priority: params[5] }] };
      if(sql.includes('insert into scope_planned_occurrences')){
        if(!occurrences.has(params[0])) occurrences.set(params[0],{ planned_occurrence_id: params[0],plannedOccurrenceId: params[0],annual_requirement_id: params[1],annualRequirementId: params[1],occurrence_number: params[2],occurrenceNumber: params[2],status: params[3] });
        return { rows: [] };
      }
      if(sql.includes('insert into scope_planned_occurrence_sessions')){
        if(!sessions.has(params[0])) sessions.set(params[0],{ planned_occurrence_session_id: params[0],plannedOccurrenceSessionId: params[0],planned_occurrence_id: params[1],plannedOccurrenceId: params[1],session_template_id: params[2],sequence: params[3],status: params[4] });
        return { rows: [] };
      }
      if(sql.includes('insert into scope_annual_requirements')) return { rows: [{ annual_requirement_id: '70000000-0000-4000-8000-000000000001',status: 'DRAFT',year: params[0],required_occurrences: params[3] }] };
      throw new Error(`Unexpected service query: ${sql}`);
    }
  };
}

(async () => {
  await test('base source still exposes exactly nine high-confidence activities',async () => assert.equal(INITIAL_ACTIVITY_CODES.length,9));
  await test('business domain order is exact',async () => assert.deepEqual(DOMAIN_ORDER,['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']));
  await test('independent C1-C5 DDL inventory reports SCHEMA_READY',async () => {
    const result = await inspectCanonicalReadiness({ database: metadataDb() });
    assert.equal(result.status,'SCHEMA_READY'); assert.equal(result.missing.columns.length,0); assert.equal(result.missing.tables.length,0);
  });
  await test('readiness reports MIGRATION_REQUIRED',async () => {
    const result = await inspectCanonicalReadiness({ database: metadataDb({ migrations: EXPECTED_MIGRATIONS.slice(0,5) }) });
    assert.equal(result.status,'MIGRATION_REQUIRED'); assert.equal(result.missing.migrations[0],EXPECTED_MIGRATIONS[5]);
  });
  await test('readiness rejects a missing critical table',async () => {
    const result = await inspectCanonicalReadiness({ database: metadataDb({ tables: EXPECTED_TABLES.filter((name) => name !== 'scope_location_categories') }) });
    assert.equal(result.status,'SCHEMA_INCOMPATIBLE'); assert(result.missing.tables.includes('scope_location_categories'));
  });
  await test('readiness rejects a missing critical column',async () => {
    const columns = Object.entries(EXPECTED_COLUMNS).flatMap(([table,names]) => names.map((column_name) => ({ table_name: table,column_name })))
      .filter((row) => !(row.table_name === 'scope_planned_occurrences' && row.column_name === 'occurrence_number'));
    const result = await inspectCanonicalReadiness({ database: metadataDb({ columns }) });
    assert.equal(result.status,'SCHEMA_INCOMPATIBLE'); assert(result.missing.columns.includes('scope_planned_occurrences.occurrence_number'));
  });
  await test('readiness rejects a missing critical function',async () => {
    const result = await inspectCanonicalReadiness({ database: metadataDb({ functions: EXPECTED_FUNCTIONS.slice(1) }) });
    assert.equal(result.status,'SCHEMA_INCOMPATIBLE'); assert(result.missing.functions.includes(EXPECTED_FUNCTIONS[0]));
  });
  await test('readiness rejects a missing critical trigger',async () => {
    const result = await inspectCanonicalReadiness({ database: metadataDb({ triggers: EXPECTED_TRIGGERS.slice(1) }) });
    assert.equal(result.status,'SCHEMA_INCOMPATIBLE'); assert(result.missing.triggers.includes(EXPECTED_TRIGGERS[0]));
  });
  await test('readiness executes SELECT statements only',async () => {
    const database = metadataDb(); await inspectCanonicalReadiness({ database });
    assert(database.queries.length >= 5); assert(database.queries.every((sql) => /^\s*select\b/i.test(sql)));
  });
  await test('service maps the real definition status to active',async () => {
    const source = fs.readFileSync(path.join(root,'netlify/lib/_scope-annual-catalog-service.js'),'utf8');
    assert.equal((source.match(/\(d\.status='ACTIF'\) as active/g) || []).length,2);
    assert(!/d\.active/.test(source));
    assert(source.includes('c.libelle as competence_label'));
    assert(!source.includes('c.label as competence_label'));
    assert(source.includes("value.toISOString().slice(0,10)"));
  });
  await test('readiness distinguishes another missing table from migration state',async () => {
    const result = await inspectCanonicalReadiness({ database: metadataDb({ tables: EXPECTED_TABLES.filter((name) => name !== 'scope_annual_requirements') }) });
    assert.equal(result.status,'SCHEMA_INCOMPATIBLE'); assert(result.missing.tables.includes('scope_annual_requirements'));
  });
  await test('readiness fails closed on metadata error',async () => {
    const result = await inspectCanonicalReadiness({ database: { query: async () => { throw new Error('relation hidden'); } } });
    assert.equal(result.status,'MIGRATION_REQUIRED'); assert.equal(result.ready,false);
  });
  await test('DRAFT validation accepts the MOA annual fields',async () => assert.equal(validateDraftInput({ year: 2027,requiredOccurrences: 2,windowStart: '2027-01-01',windowEnd: '2027-12-31' }).requiredOccurrences,2));
  await test('DRAFT aliases accept camelCase, snake_case and equal pairs',async () => {
    assert.equal(validateDraftInput({ year: 2027,requiredOccurrences: 2 }).requiredOccurrences,2);
    assert.equal(validateDraftInput({ year: 2027,required_occurrences: 3,window_start: '2027-01-01',window_end: '2027-12-31',variant_code: 'default' }).requiredOccurrences,3);
    assert.equal(validateDraftInput({ year: 2027,requiredOccurrences: 2,required_occurrences: '2',variantCode: 'DEFAULT',variant_code: 'default' }).variantCode,'DEFAULT');
  });
  await test('DRAFT aliases reject every contradictory pair',async () => {
    for(const body of [
      { requiredOccurrences: 2,required_occurrences: 99 },{ requiredOccurrences: 1,windowStart: '2027-01-01',window_start: '2027-02-01' },
      { requiredOccurrences: 1,windowEnd: '2027-10-01',window_end: '2027-11-01' },{ requiredOccurrences: 1,variantCode: 'A',variant_code: 'B' }
    ]) assert.throws(() => validateDraftInput({ year: 2027,...body }),(error) => error.error === 'CONFLICTING_FIELD_ALIASES' && error.status === 422);
  });
  await test('DRAFT date validation accepts real leap dates only',async () => {
    for(const value of ['2027-01-01','2027-02-28','2028-02-29']) assert.equal(validateDraftInput({ year: 2027,requiredOccurrences: 1,windowStart: value }).windowStart,value);
    for(const value of ['0000-01-01','2027-99-99','2027-02-29','2027-04-31','2027-00-10','2027-01-00','abc','2027-1-1']){
      assert.throws(() => validateDraftInput({ year: 2027,requiredOccurrences: 1,windowStart: value }),(error) => error.error === 'INVALID_DATE' && error.status === 422);
    }
  });
  await test('DRAFT validation rejects incoherent windows',async () => assert.throws(() => validateDraftInput({ year: 2027,requiredOccurrences: 1,windowStart: '2027-12-31',windowEnd: '2027-01-01' }),/fin de la fenêtre/));
  await test('service creates only an annual DRAFT',async () => {
    const database = memoryServiceDb();
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),definitionFinder: async () => ({ code: 'DPS-EXERCICE',definition_version_id: '20000000-0000-4000-8000-000000000001' }) });
    const result = await service.createDraft({ code: 'DPS-EXERCICE',year: 2027,requiredOccurrences: 2 },{ sub: 'tester' });
    assert.equal(result.annualRequirement.status,'DRAFT');
  });
  await test('contradictory aliases fail before CREATE or UPDATE writes',async () => {
    const createDatabase = memoryServiceDb();
    const createService = createScopeAnnualCatalogService({ database: createDatabase,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),definitionFinder: async () => ({ code: 'DPS-EXERCICE',definition_version_id: '20000000-0000-4000-8000-000000000001' }) });
    await assert.rejects(() => createService.createDraft({ code: 'DPS-EXERCICE',year: 2027,requiredOccurrences: 2,required_occurrences: 3 },{}),(error) => error.error === 'CONFLICTING_FIELD_ALIASES');
    assert(!createDatabase.statements.some((sql) => /^\s*(insert|update|delete)\b/i.test(sql)));

    const updateDatabase = memoryServiceDb();
    const updateService = createScopeAnnualCatalogService({ database: updateDatabase,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }) });
    await assert.rejects(() => updateService.updateDraft('10000000-0000-4000-8000-000000000001',{ requiredOccurrences: 2,required_occurrences: 3 },{}),(error) => error.error === 'CONFLICTING_FIELD_ALIASES');
    assert(!updateDatabase.statements.some((sql) => /^\s*(insert|update|delete)\b/i.test(sql)));
  });
  await test('snake_case UPDATE is accepted for an in-scope DRAFT',async () => {
    const database = memoryServiceDb();
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }) });
    const result = await service.updateDraft('10000000-0000-4000-8000-000000000001',{ required_occurrences: 4,window_start: '2027-03-01',window_end: '2027-10-31',variant_code: 'winter' },{});
    assert.equal(result.annualRequirement.required_occurrences,4); assert.equal(result.annualRequirement.variant_code,'WINTER');
  });
  await test('future canonical activities are data-driven behind structural guards',async () => {
    const database = memoryServiceDb();
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),
      definitionFinder: async () => ({ code: 'FUTURE-FOCA',definition_version_id: '20000000-0000-4000-8000-000000000001' }) });
    const result = await service.createDraft({ code: 'FUTURE-FOCA',year: 2027,requiredOccurrences: 1 },{});
    assert.equal(result.annualRequirement.status,'DRAFT');
    const source = fs.readFileSync(path.join(root,'netlify/lib/_scope-annual-catalog-service.js'),'utf8');
    assert.match(source,/exists \(select 1 from scope_activity_domain_bindings/);
    assert.match(source,/exists \(select 1 from scope_activity_session_templates/);
    assert.match(source,/exists \(select 1 from scope_activity_periodicities/);
    assert(!/d\.code=any\(\$2::text\[\]\)/.test(source));
  });
  await test('READY pins a public rule and persists snapshot/fingerprint',async () => {
    const database = memoryServiceDb(); const context = fixture('DRAFT');
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),contextLoader: async () => context });
    const result = await service.markReady(context.requirement.annualRequirementId,{ sub: 'tester' });
    assert.match(result.annualRequirement.fingerprint,/^[0-9a-f]{64}$/); assert.equal(result.publicBindings[0].publicRuleVersionId,'60000000-0000-4000-8000-000000000001');
  });
  await test('READY error is expressed as a business error',async () => {
    const database = memoryServiceDb(); const context = fixture('DRAFT');
    const query = database.query.bind(database);
    database.query = async (sql,params) => sql.includes('scope_public_definitions where') ? { rows: [{ public_definition_id: '50000000-0000-4000-8000-000000000001',status: 'ACTIVE' }] } : sql.includes('scope_public_rule_versions where') ? { rows: [] } : query(sql,params);
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),contextLoader: async () => context });
    await assert.rejects(() => service.markReady(context.requirement.annualRequirementId,{}),/règle de public ACTIVE/);
  });
  await test('READY correction creates a DRAFT by explicit supersession',async () => {
    const database = memoryServiceDb(); const context = readyFixture();
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),contextLoader: async () => context });
    const result = await service.reviseReady(context.requirement.annualRequirementId,{ sub: 'tester' });
    assert.equal(result.annualRequirement.status,'DRAFT'); assert.equal(result.supersededAnnualRequirementId,context.requirement.annualRequirementId);
    assert(database.statements.some((sql) => sql.includes("set status='SUPERSEDED'")));
  });
  await test('generation is deterministic and idempotent through conflict-safe inserts',async () => {
    const database = memoryServiceDb(); const context = readyFixture();
    const loader = async (_db,options) => options.refresh ? { ...context,occurrences: [...database.occurrences.values()],sessions: [...database.sessions.values()] } : context;
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),contextLoader: loader });
    await service.generate(context.requirement.annualRequirementId); await service.generate(context.requirement.annualRequirementId);
    assert.equal(database.occurrences.size,2); assert.equal(database.sessions.size,2);
    assert(database.statements.filter((sql) => sql.includes('insert into scope_planned_occurrences')).every((sql) => sql.includes('on conflict')));
  });
  await test('preview is mirror-only and creates no event',async () => {
    const database = memoryServiceDb(); const context = readyFixture();
    const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ status: 'SCHEMA_READY',ready: true }),contextLoader: async () => context });
    const result = await service.previewQuoVadis(context.requirement.annualRequirementId);
    assert.equal(result.mode,'MIRROR'); assert.equal(result.operationalWrites,false); assert.equal(result.eventPublication,false); assert.equal(result.projection.obligations.length,2);
  });
  await test('generated occurrences and sessions remain distinct',async () => {
    const generated = generateAnnualProgram(readyFixture());
    assert.equal(generated.occurrences.length,2); assert.equal(generated.sessions.length,2); assert.notEqual(generated.occurrences[0].plannedOccurrenceId,generated.sessions[0].plannedOccurrenceSessionId);
  });
  await test('ensureScopeSchema contains no runtime C1-C5 migration call',async () => {
    const source = fs.readFileSync(path.join(root,'netlify/lib/_scope-schema.js'),'utf8');
    const body = source.slice(source.indexOf('async function ensureScopeSchema()'),source.indexOf('async function migrateQuoVadisReferentialManagement4()'));
    for(const name of ['migrateCanonicalFoundationsC1','migratePublicEngineMirrorC2B','migratePersonQualificationsC3B','migrateAnnualCatalogC4B','migrateCatalogConvergenceC5B']) assert(!body.includes(`await ${name}(`),name);
  });
  await test('C6 service has no operational-table write',async () => {
    const source = fs.readFileSync(path.join(root,'netlify/lib/_scope-annual-catalog-service.js'),'utf8');
    assert(!/(insert\s+into|update|delete\s+from)\s+scope_(evenements|attendus|participations|population_figee)/i.test(source));
  });
  await test('frontend navigation places annual catalog before annual agenda',async () => {
    const source = fs.readFileSync(path.join(root,'assets/js/scope-ui.js'),'utf8');
    assert(source.indexOf("['catalogue-annuel', 'Catalogue annuel'") < source.indexOf("['agenda-annuel', 'Agenda annuel'"));
  });
  await test('frontend routes list and canonical activity detail',async () => {
    assert.equal(uiLogic.parseHash('#/quo-vadis/catalogue-annuel').qvView,'catalogue-annuel');
    const detail = uiLogic.parseHash('#/quo-vadis/catalogue-annuel/PR-PISTE-GAZ?annee=2027');
    assert.equal(detail.qvView,'catalogue-activite'); assert.equal(detail.qvCatalogCode,'PR-PISTE-GAZ'); assert.equal(detail.qvYear,'2027');
  });
  await test('frontend exposes required controls and exact action wording',async () => {
    const source = fs.readFileSync(path.join(root,'assets/js/scope-ui.js'),'utf8');
    for(const label of ['Année','Recherche','Domaine','État','Réinitialiser','Consulter','Valider pour QUO VADIS','Préparation QUO VADIS']) assert(source.includes(label),label);
  });
  await test('frontend presents migration-required state without SQL detail',async () => {
    const source = fs.readFileSync(path.join(root,'assets/js/scope-ui.js'),'utf8');
    assert(source.includes('Le catalogue annuel n’est pas encore activé sur cet environnement.')); assert(source.includes('Aucune migration n’est lancée depuis cet écran.'));
  });
  await test('status marker is an eight-pixel square',async () => {
    const css = fs.readFileSync(path.join(root,'assets/css/scope.css'),'utf8');
    assert(css.includes('.annual-status i{width:8px;height:8px;flex:0 0 8px'));
  });
  await test('API and UI never offer event publication from annual catalog',async () => {
    const api = fs.readFileSync(path.join(root,'assets/js/scope-api.js'),'utf8');
    const ui = fs.readFileSync(path.join(root,'assets/js/scope-ui.js'),'utf8');
    assert(!/publishAnnual|publier.*événement/i.test(api + ui)); assert(ui.includes('Aucun événement opérationnel créé.'));
  });
  process.stdout.write(`C6-B ${passed}/${passed} PASS\n`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
