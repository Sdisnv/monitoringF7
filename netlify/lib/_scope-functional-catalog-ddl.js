'use strict';

const DDL = Object.freeze([
  `create table if not exists scope_activity_functional_profiles (
    definition_version_id uuid primary key references scope_event_definition_versions(definition_version_id) on delete restrict,
    recurrence_kind text not null default 'NON_RECURRENT',default_occurrences integer not null default 1,default_sites text[] not null default '{}',
    default_public_codes text[] not null default '{}',calendar_rules jsonb not null default '{}'::jsonb,
    priority integer not null default 100,permutation_allowed boolean not null default false,day_exclusive boolean not null default false,
    indispensable_role_codes text[] not null default '{}',resource_codes text[] not null default '{}',
    rule_mode text not null default 'GENERAL',custom_rule jsonb,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_functional_profiles_recurrence_chk check (recurrence_kind in ('RECURRENT','NON_RECURRENT')),
    constraint scope_activity_functional_profiles_occurrences_chk check (default_occurrences>0),
    constraint scope_activity_functional_profiles_priority_chk check (priority>0),
    constraint scope_activity_functional_profiles_rule_chk check (rule_mode in ('GENERAL','CUSTOM') and (rule_mode='GENERAL' or jsonb_typeof(custom_rule)='object')))`,
  `alter table scope_activity_functional_profiles add column if not exists default_public_codes text[] not null default '{}'`,
  `alter table scope_activity_functional_profiles add column if not exists calendar_rules jsonb not null default '{}'::jsonb`,
  `alter table scope_activity_functional_profiles add column if not exists priority integer not null default 100`,
  `alter table scope_activity_functional_profiles add column if not exists permutation_allowed boolean not null default false`,
  `alter table scope_activity_functional_profiles add column if not exists day_exclusive boolean not null default false`,
  `alter table scope_activity_functional_profiles add column if not exists indispensable_role_codes text[] not null default '{}'`,
  `alter table scope_activity_functional_profiles add column if not exists resource_codes text[] not null default '{}'`,
  `create table if not exists scope_catalog_convergence_links (
    convergence_link_id uuid primary key default gen_random_uuid(),source_definition_id uuid not null references scope_event_definitions(definition_id) on delete restrict,
    target_definition_id uuid references scope_event_definitions(definition_id) on delete restrict,action text not null,confidence text not null,
    evidence jsonb not null,source_snapshot jsonb not null,source_sha256 text,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),created_by text,
    constraint scope_catalog_convergence_links_action_chk check (action in ('MERGE_SAFE','KEEP_DISTINCT','REVIEW_REQUIRED')),
    constraint scope_catalog_convergence_links_confidence_chk check (confidence in ('HIGH','MEDIUM','LOW')),
    constraint scope_catalog_convergence_links_target_chk check (action<>'MERGE_SAFE' or target_definition_id is not null),
    constraint scope_catalog_convergence_links_source_uk unique (source_definition_id))`,
  `create index if not exists scope_catalog_convergence_links_target_idx on scope_catalog_convergence_links(target_definition_id,action)`,
  `create table if not exists scope_annual_program_entries (
    annual_program_entry_id uuid primary key default gen_random_uuid(),annual_requirement_id uuid not null unique references scope_annual_requirements(annual_requirement_id) on delete restrict,
    program_state text not null default 'ACTIVE',extraordinary boolean not null default false,occurrence_override integer,site_codes text[] not null default '{}',
    config_override jsonb not null default '{}'::jsonb,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),created_by text,updated_at timestamptz not null default now(),updated_by text,
    constraint scope_annual_program_entries_state_chk check (program_state in ('ACTIVE','INACTIVE')),
    constraint scope_annual_program_entries_occurrences_chk check (occurrence_override is null or occurrence_override>0))`,
  `create index if not exists scope_annual_program_entries_state_idx on scope_annual_program_entries(program_state,annual_requirement_id)`,
  `create table if not exists scope_planned_site_slots (
    planned_site_slot_id uuid primary key,planned_occurrence_session_id uuid not null references scope_planned_occurrence_sessions(planned_occurrence_session_id) on delete restrict,
    site_code text not null,preferred_date date,preferred_start_time time,preferred_end_time time,location_label text,responsible_label text,
    label_complement text,final_label text,
    status text not null default 'PROPOSED',public_codes text[] not null default '{}',role_codes text[] not null default '{}',
    resource_codes text[] not null default '{}',fixed_date boolean not null default false,day_exclusive boolean not null default false,
    permutation_allowed boolean not null default false,priority integer not null default 100,manual_lock boolean not null default false,
    validation_status text not null default 'DRAFT',metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_planned_site_slots_status_chk check (status in ('PROPOSED','CONFIRMED','VALIDATED','ARBITRATION_REQUIRED','DISABLED')),
    constraint scope_planned_site_slots_validation_chk check (validation_status in ('DRAFT','ARBITRATION_REQUIRED','VALIDATED','LOCKED')),
    constraint scope_planned_site_slots_priority_chk check (priority>0),
    constraint scope_planned_site_slots_time_chk check (preferred_end_time is null or preferred_start_time is null or preferred_start_time<preferred_end_time),
    constraint scope_planned_site_slots_uk unique (planned_occurrence_session_id,site_code))`,
  `alter table scope_planned_site_slots add column if not exists label_complement text`,
  `alter table scope_planned_site_slots add column if not exists final_label text`,
  `alter table scope_planned_site_slots add column if not exists role_codes text[] not null default '{}'`,
  `alter table scope_planned_site_slots add column if not exists resource_codes text[] not null default '{}'`,
  `alter table scope_planned_site_slots add column if not exists fixed_date boolean not null default false`,
  `alter table scope_planned_site_slots add column if not exists day_exclusive boolean not null default false`,
  `alter table scope_planned_site_slots add column if not exists permutation_allowed boolean not null default false`,
  `alter table scope_planned_site_slots add column if not exists priority integer not null default 100`,
  `alter table scope_planned_site_slots add column if not exists manual_lock boolean not null default false`,
  `alter table scope_planned_site_slots add column if not exists validation_status text not null default 'DRAFT'`,
  `create index if not exists scope_planned_site_slots_schedule_idx on scope_planned_site_slots(preferred_date,preferred_start_time,preferred_end_time) where status<>'DISABLED'`
]);

const PROTECTION_SQL = `do $$ declare table_name text; role_name text; begin
  foreach table_name in array array['scope_activity_functional_profiles','scope_catalog_convergence_links','scope_annual_program_entries','scope_planned_site_slots'] loop
    execute format('alter table %I enable row level security',table_name);
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname=role_name) then execute format('revoke all on %I from %I',table_name,role_name); end if;
    end loop;
  end loop;
end $$`;

module.exports={ DDL,PROTECTION_SQL };
