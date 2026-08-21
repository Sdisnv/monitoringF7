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

create table if not exists scope_personnes (
  id text primary key,
  nip text not null unique,
  grade text,
  nom text,
  prenom text,
  date_entree_sdis date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists scope_personnel_import_batches (
  id text primary key,
  import_type text not null,
  contexte text,
  annee_monitoring integer not null,
  filename text,
  status text not null,
  total_lines integer not null default 0,
  total_unique_nips integer not null default 0,
  count_identical integer not null default 0,
  count_new_persons integer not null default 0,
  count_modified integer not null default 0,
  count_new_assignments integer not null default 0,
  count_missing_assignments integer not null default 0,
  count_errors integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

create table if not exists scope_affectations (
  id text primary key,
  personne_id text not null references scope_personnes(id),
  categorie text not null,
  domaine text not null,
  cible text not null,
  role_domaine text,
  date_actif date not null,
  date_inactif date,
  source_import_batch_id text references scope_personnel_import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_affectations_dates_chk check (date_inactif is null or date_actif <= date_inactif),
  constraint scope_affectations_categorie_chk check (categorie in ('OI','SPECIALISATION')),
  constraint scope_affectations_role_chk check (role_domaine is null or role_domaine in ('PRINCIPAL','SECONDAIRE'))
);

create table if not exists scope_personnel_import_lines (
  id text primary key,
  batch_id text not null references scope_personnel_import_batches(id) on delete cascade,
  line_number integer not null,
  nip text,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  status text not null,
  diff_payload jsonb not null default '{}'::jsonb,
  errors_payload jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_scope_personnes_nip on scope_personnes (nip);
create index if not exists idx_scope_affectations_personne on scope_affectations (personne_id);
create index if not exists idx_scope_affectations_scope on scope_affectations (domaine, cible, role_domaine, date_actif, date_inactif);
create index if not exists idx_scope_import_lines_batch on scope_personnel_import_lines (batch_id, line_number);

alter table monitoring_f7_user_profiles add column if not exists nip text;
alter table monitoring_f7_user_profiles add column if not exists permissions text[] not null default array[]::text[];
create index if not exists idx_monitoring_f7_user_profiles_email on monitoring_f7_user_profiles (lower(email));

insert into monitoring_f7_schema_migrations(version)
values ('v67.0-auto-core-schema')
on conflict (version) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-personnel-1b')
on conflict (version) do nothing;
