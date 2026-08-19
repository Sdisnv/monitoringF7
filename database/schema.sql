-- Monitoring F7 - schema PostgreSQL optionnel.
-- Compatible Supabase, Neon et PostgreSQL standard.
-- A executer manuellement dans la base avant activation du backend.

create table if not exists monitoring_f7_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists monitoring_f7_user_profiles (
  subject text primary key,
  email text,
  display_name text,
  nip text,
  roles text[] not null default array['sdis-user'],
  permissions text[] not null default array[]::text[],
  provider text not null default 'oidc',
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_f7_records (
  id text primary key,
  payload jsonb not null,
  schema_version integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_f7_imported_events (
  id text primary key,
  payload jsonb not null,
  schema_version integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_f7_reference_periods (
  id text primary key,
  payload jsonb not null,
  schema_version integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_f7_objectives (
  id text primary key,
  payload jsonb not null,
  schema_version integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_f7_audit_entries (
  id text primary key,
  level text not null,
  event_type text not null,
  status text,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  actor_subject text,
  created_at timestamptz not null default now()
);

create table if not exists monitoring_f7_settings (
  key text primary key,
  value jsonb not null,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_f7_sync_changes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  operation text not null,
  payload jsonb,
  actor_subject text,
  created_at timestamptz not null default now()
);

create index if not exists idx_monitoring_f7_records_updated_at on monitoring_f7_records (updated_at desc);
create index if not exists idx_monitoring_f7_imported_events_updated_at on monitoring_f7_imported_events (updated_at desc);
create index if not exists idx_monitoring_f7_reference_periods_updated_at on monitoring_f7_reference_periods (updated_at desc);
create index if not exists idx_monitoring_f7_objectives_updated_at on monitoring_f7_objectives (updated_at desc);
create index if not exists idx_monitoring_f7_audit_entries_created_at on monitoring_f7_audit_entries (created_at desc);
create index if not exists idx_monitoring_f7_sync_changes_entity on monitoring_f7_sync_changes (entity_type, entity_id, created_at desc);

alter table monitoring_f7_user_profiles add column if not exists nip text;
alter table monitoring_f7_user_profiles add column if not exists permissions text[] not null default array[]::text[];
create index if not exists idx_monitoring_f7_user_profiles_email on monitoring_f7_user_profiles (lower(email));

insert into monitoring_f7_schema_migrations(version)
values ('v67.0-auto-core-schema')
on conflict (version) do nothing;

-- SCOPE-IMPL-1A : tables nominatives additifives.
-- Source de vérité SQL : database/migrations/20260819_scope_impl_1a.sql
-- Appliqué au runtime par netlify/functions/_scope-schema.js (ensureScopeSchema).
-- Ne pas DROP les tables monitoring_f7_*.

