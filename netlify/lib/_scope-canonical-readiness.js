'use strict';

const db = require('./_postgres');

const CANONICAL_MIGRATIONS = Object.freeze([
  'scope-canonical-foundations-c1',
  'scope-public-engine-mirror-c2-b',
  'scope-person-qualifications-c3-b',
  'scope-annual-catalog-c4-b',
  'scope-catalog-convergence-c5-b',
  'scope-annual-catalog-themes-c8-b'
]);

const REQUIRED_TABLES = Object.freeze([
  'scope_ois','scope_competence_definitions','scope_public_definitions','scope_public_rule_versions',
  'scope_person_qualifications','scope_event_role_definitions','scope_activity_domain_bindings',
  'scope_activity_session_templates','scope_activity_periodicities','scope_annual_requirements',
  'scope_activity_public_bindings','scope_activity_qualification_bindings','scope_activity_role_requirements',
  'scope_activity_location_requirements','scope_activity_responsible_requirements',
  'scope_activity_planning_constraints','scope_activity_statistical_contributions',
  'scope_location_categories','scope_planned_occurrences','scope_planned_occurrence_sessions','scope_activity_legacy_aliases',
  'scope_theme_definitions','scope_theme_versions','scope_activity_theme_bindings','scope_annual_requirement_theme_assignments'
]);

const REQUIRED_COLUMNS = Object.freeze({
  scope_event_definitions: ['definition_id','code','label','domain','family_code','activity_type','status','metadata'],
  scope_event_definition_versions: ['definition_version_id','definition_id','version_code','status','description','fingerprint','metadata'],
  scope_annual_requirements: ['annual_requirement_id','year','definition_version_id','variant_code','required_occurrences','window_start','window_end','status','snapshot','fingerprint'],
  scope_planned_occurrences: ['planned_occurrence_id','annual_requirement_id','occurrence_number','status'],
  scope_planned_occurrence_sessions: ['planned_occurrence_session_id','planned_occurrence_id','session_template_id','sequence','status'],
  scope_theme_definitions: ['theme_definition_id','code','status','metadata'],
  scope_theme_versions: ['theme_version_id','theme_definition_id','version_number','label','status','fingerprint'],
  scope_annual_requirement_theme_assignments: ['annual_theme_assignment_id','annual_requirement_id','occurrence_number','theme_version_id','free_label','session_template_id'],
  scope_quo_vadis_obligations: ['planned_occurrence_id'],
  scope_quo_vadis_proposals: ['planned_occurrence_session_id']
});

const REQUIRED_FUNCTIONS = Object.freeze([
  'scope_public_definitions_guard_code','scope_public_rule_versions_guard_active',
  'scope_person_qualifications_guard','scope_activity_definition_version_guard',
  'scope_annual_requirement_guard','scope_planned_occurrence_session_guard',
  'scope_qv_proposal_catalog_link_guard','scope_qv_obligation_catalog_link_guard',
  'scope_normalize_theme_label','scope_theme_definitions_guard_code','scope_theme_versions_guard_active','scope_activity_theme_binding_guard',
  'scope_annual_requirement_theme_count_guard','scope_annual_theme_assignment_guard'
]);

const REQUIRED_TRIGGERS = Object.freeze([
  'scope_public_definitions_guard_code_trg','scope_public_rule_versions_guard_active_trg',
  'scope_person_qualifications_guard_trg','scope_activity_definition_version_guard_trg',
  'scope_annual_requirement_guard_trg','scope_planned_occurrence_session_guard_trg',
  'scope_qv_proposal_catalog_link_guard_trg','scope_qv_obligation_catalog_link_guard_trg',
  'scope_theme_definitions_guard_code_trg','scope_theme_versions_guard_active_trg','scope_activity_theme_binding_guard_trg',
  'scope_annual_requirement_theme_count_guard_trg','scope_annual_theme_assignment_guard_trg'
]);

function values(rows,key){ return new Set((rows || []).map((row) => String(row[key] || ''))); }

async function inspectCanonicalReadiness(options = {}){
  const database = options.database || db;
  try{
    const [migrationResult,tableResult,columnResult,functionResult,triggerResult] = await Promise.all([
      database.query('select version from monitoring_f7_schema_migrations where version = any($1::text[])', [CANONICAL_MIGRATIONS]),
      database.query(`select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1::text[])`, [REQUIRED_TABLES.concat(Object.keys(REQUIRED_COLUMNS))]),
      database.query(`select table_name,column_name from information_schema.columns where table_schema = 'public' and table_name = any($1::text[])`, [Object.keys(REQUIRED_COLUMNS)]),
      database.query(`select proname as function_name from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and proname = any($1::text[])`, [REQUIRED_FUNCTIONS]),
      database.query(`select tgname as trigger_name from pg_trigger where not tgisinternal and tgname = any($1::text[])`, [REQUIRED_TRIGGERS])
    ]);
    const migrations = values(migrationResult.rows,'version');
    const tables = values(tableResult.rows,'table_name');
    const functions = values(functionResult.rows,'function_name');
    const triggers = values(triggerResult.rows,'trigger_name');
    const columns = new Set((columnResult.rows || []).map((row) => `${row.table_name}.${row.column_name}`));
    const missing = {
      migrations: CANONICAL_MIGRATIONS.filter((name) => !migrations.has(name)),
      tables: REQUIRED_TABLES.concat(Object.keys(REQUIRED_COLUMNS)).filter((name,index,array) => array.indexOf(name) === index && !tables.has(name)),
      columns: Object.entries(REQUIRED_COLUMNS).flatMap(([table,names]) => names.map((name) => `${table}.${name}`)).filter((name) => !columns.has(name)),
      functions: REQUIRED_FUNCTIONS.filter((name) => !functions.has(name)),
      triggers: REQUIRED_TRIGGERS.filter((name) => !triggers.has(name))
    };
    const structureMissing = missing.tables.length + missing.columns.length + missing.functions.length + missing.triggers.length;
    const status = missing.migrations.length ? 'MIGRATION_REQUIRED' : structureMissing ? 'SCHEMA_INCOMPATIBLE' : 'SCHEMA_READY';
    const capabilities = {
      canonicalFoundations: migrations.has(CANONICAL_MIGRATIONS[0]),publicEngine: migrations.has(CANONICAL_MIGRATIONS[1]),
      personQualifications: migrations.has(CANONICAL_MIGRATIONS[2]),annualCatalog: migrations.has(CANONICAL_MIGRATIONS[3]) && status === 'SCHEMA_READY',
      catalogConvergence: migrations.has(CANONICAL_MIGRATIONS[4]) && status === 'SCHEMA_READY',
      annualThemes: migrations.has(CANONICAL_MIGRATIONS[5]) && status === 'SCHEMA_READY',quoVadisMirror: status === 'SCHEMA_READY'
    };
    return {
      status,
      ready: status === 'SCHEMA_READY',
      migrations: CANONICAL_MIGRATIONS.map((version) => ({ version,applied: migrations.has(version) })),
      missing,
      incompatible: status === 'SCHEMA_INCOMPATIBLE' ? { structure: true } : null,
      capabilities
    };
  }catch(error){
    return {
      status: 'MIGRATION_REQUIRED',ready: false,migrations: CANONICAL_MIGRATIONS.map((version) => ({ version,applied: false })),
      missing: { migrations: [...CANONICAL_MIGRATIONS],tables: [],columns: [],functions: [],triggers: [] },
      incompatible: null,
      capabilities: { canonicalFoundations: false,publicEngine: false,personQualifications: false,annualCatalog: false,catalogConvergence: false,quoVadisMirror: false },
      diagnostic: 'La readiness canonique ne peut pas être établie sur cet environnement.'
    };
  }
}

module.exports = {
  CANONICAL_MIGRATIONS,REQUIRED_TABLES,REQUIRED_COLUMNS,REQUIRED_FUNCTIONS,REQUIRED_TRIGGERS,inspectCanonicalReadiness
};
