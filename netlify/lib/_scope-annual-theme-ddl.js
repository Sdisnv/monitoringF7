'use strict';

const TABLES = Object.freeze([
  'scope_theme_definitions','scope_theme_versions','scope_activity_theme_bindings','scope_annual_requirement_theme_assignments'
]);

const DDL = Object.freeze([
  `create table if not exists scope_theme_definitions (
    theme_definition_id uuid primary key default gen_random_uuid(),code text not null unique,status text not null default 'ACTIVE',
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),created_by text,
    updated_at timestamptz not null default now(),updated_by text,
    constraint scope_theme_definitions_code_chk check (code=upper(trim(code)) and code ~ '^[A-Z0-9][A-Z0-9_-]{0,79}$'),
    constraint scope_theme_definitions_status_chk check (status in ('ACTIVE','INACTIVE')))`,
  `create table if not exists scope_theme_versions (
    theme_version_id uuid primary key default gen_random_uuid(),theme_definition_id uuid not null references scope_theme_definitions(theme_definition_id) on delete restrict,
    version_number integer not null,label text not null,description text,status text not null default 'DRAFT',provenance text not null,
    fingerprint text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),created_by text,
    updated_at timestamptz not null default now(),updated_by text,
    constraint scope_theme_versions_number_chk check (version_number>0),
    constraint scope_theme_versions_label_chk check (length(trim(label)) between 1 and 160),
    constraint scope_theme_versions_status_chk check (status in ('DRAFT','ACTIVE','RETIRED')),
    constraint scope_theme_versions_fingerprint_chk check (fingerprint is null or fingerprint ~ '^[0-9a-f]{64}$'),
    constraint scope_theme_versions_uk unique (theme_definition_id,version_number))`,
  `create unique index if not exists scope_theme_versions_active_uk on scope_theme_versions(theme_definition_id) where status='ACTIVE'`,
  `create table if not exists scope_activity_theme_bindings (
    activity_theme_binding_id uuid primary key default gen_random_uuid(),definition_id uuid not null references scope_event_definitions(definition_id) on delete restrict,
    theme_definition_id uuid not null references scope_theme_definitions(theme_definition_id) on delete restrict,status text not null default 'ACTIVE',
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),created_by text,
    updated_at timestamptz not null default now(),updated_by text,
    constraint scope_activity_theme_bindings_status_chk check (status in ('ACTIVE','INACTIVE')),
    constraint scope_activity_theme_bindings_uk unique (definition_id,theme_definition_id))`,
  `create index if not exists scope_activity_theme_bindings_lookup_idx on scope_activity_theme_bindings(definition_id,status,theme_definition_id)`,
  `create table if not exists scope_annual_requirement_theme_assignments (
    annual_theme_assignment_id uuid primary key default gen_random_uuid(),annual_requirement_id uuid not null references scope_annual_requirements(annual_requirement_id) on delete restrict,
    occurrence_number integer not null,theme_version_id uuid references scope_theme_versions(theme_version_id) on delete restrict,
    free_label text,free_normalized text,session_template_id uuid references scope_activity_session_templates(session_template_id) on delete restrict,
    sort_order integer not null default 100,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),created_by text,updated_at timestamptz not null default now(),updated_by text,
    constraint scope_annual_theme_assignment_owner_chk check (num_nonnulls(theme_version_id,free_label)=1),
    constraint scope_annual_theme_assignment_free_chk check ((free_label is null and free_normalized is null) or
      (length(trim(free_label)) between 1 and 160 and length(trim(free_normalized)) between 1 and 160)),
    constraint scope_annual_theme_assignment_occurrence_chk check (occurrence_number>0),
    constraint scope_annual_theme_assignment_sort_chk check (sort_order>0))`,
  `create unique index if not exists scope_annual_theme_assignment_canonical_uk
    on scope_annual_requirement_theme_assignments(annual_requirement_id,occurrence_number,coalesce(session_template_id,'00000000-0000-0000-0000-000000000000'::uuid),theme_version_id)
    where theme_version_id is not null`,
  `create unique index if not exists scope_annual_theme_assignment_free_uk
    on scope_annual_requirement_theme_assignments(annual_requirement_id,occurrence_number,coalesce(session_template_id,'00000000-0000-0000-0000-000000000000'::uuid),free_normalized)
    where free_label is not null`,
  `create index if not exists scope_annual_theme_assignment_requirement_idx
    on scope_annual_requirement_theme_assignments(annual_requirement_id,occurrence_number,sort_order)`
]);

const GUARD_SQL = `create or replace function scope_normalize_theme_label(value text)
returns text language sql immutable strict as $$
  select upper(trim(regexp_replace(regexp_replace(
    normalize(replace(replace(replace(replace(trim(value),'œ','oe'),'Œ','OE'),'æ','ae'),'Æ','AE'),NFKD) collate "C",
    U&'[\\0300-\\036F]','','g'),'[^ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]+',' ','g')) collate "C")
$$;

create or replace function scope_theme_definitions_guard_code()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' and exists (select 1 from scope_theme_versions where theme_definition_id=old.theme_definition_id)
    then raise exception 'theme definition with versions cannot be deleted'; end if;
  if tg_op='UPDATE' and new.code is distinct from old.code then raise exception 'theme definition code is immutable'; end if;
  if tg_op='UPDATE' and old.status='ACTIVE' and new.status='INACTIVE' and exists (
    select 1 from scope_theme_versions tv join scope_annual_requirement_theme_assignments a on a.theme_version_id=tv.theme_version_id
      join scope_annual_requirements r on r.annual_requirement_id=a.annual_requirement_id
     where tv.theme_definition_id=old.theme_definition_id and r.status='READY')
    then raise exception 'theme definition used by a ready annual requirement cannot be deactivated'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists scope_theme_definitions_guard_code_trg on scope_theme_definitions;
create trigger scope_theme_definitions_guard_code_trg before update or delete on scope_theme_definitions
for each row execute function scope_theme_definitions_guard_code();

create or replace function scope_theme_versions_guard_active()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' and old.status='ACTIVE' then raise exception 'active theme version cannot be deleted'; end if;
  if tg_op='UPDATE' and old.status='ACTIVE' and (new.theme_definition_id is distinct from old.theme_definition_id or
    new.version_number is distinct from old.version_number or new.label is distinct from old.label or
    new.description is distinct from old.description or new.provenance is distinct from old.provenance or
    new.fingerprint is distinct from old.fingerprint or new.metadata is distinct from old.metadata)
    then raise exception 'active theme version is semantically immutable'; end if;
  if tg_op='UPDATE' and not ((old.status='DRAFT' and new.status in ('DRAFT','ACTIVE')) or
    (old.status='ACTIVE' and new.status in ('ACTIVE','RETIRED')) or (old.status='RETIRED' and new.status='RETIRED'))
    then raise exception 'invalid theme version status transition'; end if;
  if tg_op='UPDATE' and old.status='ACTIVE' and new.status='RETIRED' and exists (
    select 1 from scope_annual_requirement_theme_assignments a join scope_annual_requirements r on r.annual_requirement_id=a.annual_requirement_id
     where a.theme_version_id=old.theme_version_id and r.status='READY')
    then raise exception 'theme version pinned by a ready annual requirement cannot be retired'; end if;
  if new.status='ACTIVE' and (new.fingerprint is null or new.fingerprint !~ '^[0-9a-f]{64}$')
    then raise exception 'active theme version requires a fingerprint'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists scope_theme_versions_guard_active_trg on scope_theme_versions;
create trigger scope_theme_versions_guard_active_trg before insert or update or delete on scope_theme_versions
for each row execute function scope_theme_versions_guard_active();

create or replace function scope_activity_theme_binding_guard()
returns trigger language plpgsql as $$ begin
  if tg_op in ('UPDATE','DELETE') and old.status='ACTIVE' and (tg_op='DELETE' or new.status<>'ACTIVE' or
    new.definition_id is distinct from old.definition_id or new.theme_definition_id is distinct from old.theme_definition_id) and exists (
    select 1 from scope_annual_requirement_theme_assignments a join scope_theme_versions tv on tv.theme_version_id=a.theme_version_id
      join scope_annual_requirements r on r.annual_requirement_id=a.annual_requirement_id
      join scope_event_definition_versions av on av.definition_version_id=r.definition_version_id
     where tv.theme_definition_id=old.theme_definition_id and av.definition_id=old.definition_id and r.status='READY')
    then raise exception 'theme binding used by a ready annual requirement is immutable'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists scope_activity_theme_binding_guard_trg on scope_activity_theme_bindings;
create trigger scope_activity_theme_binding_guard_trg before update or delete on scope_activity_theme_bindings
for each row execute function scope_activity_theme_binding_guard();

create or replace function scope_annual_requirement_theme_count_guard()
returns trigger language plpgsql as $$ declare new_definition uuid; begin
  if tg_op='UPDATE' and new.required_occurrences<old.required_occurrences and exists (
    select 1 from scope_annual_requirement_theme_assignments a where a.annual_requirement_id=old.annual_requirement_id
      and a.occurrence_number>new.required_occurrences)
    then raise exception 'annual requirement still has themes beyond requested occurrence count'; end if;
  if tg_op='UPDATE' and new.definition_version_id is distinct from old.definition_version_id and exists (
    select 1 from scope_annual_requirement_theme_assignments a where a.annual_requirement_id=old.annual_requirement_id) then
    select definition_id into new_definition from scope_event_definition_versions
      where definition_version_id=new.definition_version_id;
    if new_definition is null then raise exception 'annual requirement target version not found'; end if;
    if exists (select 1 from scope_annual_requirement_theme_assignments a
      join scope_theme_versions tv on tv.theme_version_id=a.theme_version_id
      join scope_theme_definitions td on td.theme_definition_id=tv.theme_definition_id
      where a.annual_requirement_id=old.annual_requirement_id and
        (tv.status<>'ACTIVE' or td.status<>'ACTIVE' or not exists (select 1 from scope_activity_theme_bindings b
          where b.definition_id=new_definition and b.theme_definition_id=tv.theme_definition_id and b.status='ACTIVE')))
      then raise exception 'annual requirement themes are incompatible with target version'; end if;
    if exists (select 1 from scope_annual_requirement_theme_assignments a
      where a.annual_requirement_id=old.annual_requirement_id and a.session_template_id is not null and not exists (
        select 1 from scope_activity_session_templates st where st.session_template_id=a.session_template_id
          and st.definition_version_id=new.definition_version_id))
      then raise exception 'annual requirement theme sessions are incompatible with target version'; end if;
  end if;
  return new;
end $$;
drop trigger if exists scope_annual_requirement_theme_count_guard_trg on scope_annual_requirements;
create trigger scope_annual_requirement_theme_count_guard_trg before update on scope_annual_requirements
for each row execute function scope_annual_requirement_theme_count_guard();

create or replace function scope_annual_theme_assignment_guard()
returns trigger language plpgsql as $$ declare row_value record; requirement_status text; required_count integer;
  requirement_version uuid; requirement_definition uuid; theme_definition uuid; begin
  if tg_op='DELETE' then row_value := old; else row_value := new; end if;
  if tg_op<>'DELETE' and row_value.free_label is not null and
    row_value.free_normalized is distinct from scope_normalize_theme_label(row_value.free_label)
    then raise exception 'free theme normalization is inconsistent'; end if;
  select r.status,r.required_occurrences,r.definition_version_id,v.definition_id
    into requirement_status,required_count,requirement_version,requirement_definition
    from scope_annual_requirements r join scope_event_definition_versions v on v.definition_version_id=r.definition_version_id
    where r.annual_requirement_id=row_value.annual_requirement_id;
  if requirement_status is null then raise exception 'annual requirement not found'; end if;
  if requirement_status<>'DRAFT' then raise exception 'themes of a non-draft annual requirement are immutable'; end if;
  if row_value.occurrence_number>required_count then raise exception 'theme occurrence exceeds annual requirement'; end if;
  if row_value.theme_version_id is not null then
    select tv.theme_definition_id into theme_definition from scope_theme_versions tv join scope_theme_definitions td
      on td.theme_definition_id=tv.theme_definition_id
      where tv.theme_version_id=row_value.theme_version_id and tv.status='ACTIVE' and td.status='ACTIVE';
    if theme_definition is null or not exists (select 1 from scope_activity_theme_bindings b
      where b.definition_id=requirement_definition and b.theme_definition_id=theme_definition and b.status='ACTIVE')
      then raise exception 'theme version is not active and bound to the activity'; end if;
  end if;
  if row_value.session_template_id is not null and not exists (select 1 from scope_activity_session_templates st
    where st.session_template_id=row_value.session_template_id and st.definition_version_id=requirement_version)
    then raise exception 'theme session template does not belong to annual requirement version'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists scope_annual_theme_assignment_guard_trg on scope_annual_requirement_theme_assignments;
create trigger scope_annual_theme_assignment_guard_trg before insert or update or delete on scope_annual_requirement_theme_assignments
for each row execute function scope_annual_theme_assignment_guard();`;

const PROTECTION_SQL = `do $$ declare table_name text; role_name text; begin
  foreach table_name in array array['scope_theme_definitions','scope_theme_versions','scope_activity_theme_bindings','scope_annual_requirement_theme_assignments'] loop
    execute format('alter table %I enable row level security',table_name);
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname=role_name) then execute format('revoke all on %I from %I',table_name,role_name); end if;
    end loop;
  end loop;
end $$;`;

module.exports = { TABLES,DDL,GUARD_SQL,PROTECTION_SQL };
