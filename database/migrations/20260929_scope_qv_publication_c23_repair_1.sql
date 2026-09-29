\set ON_ERROR_STOP on

begin;

do $$
declare
  missing text;
begin
  select string_agg(required_table, ', ' order by required_table)
    into missing
    from unnest(array[
      'monitoring_f7_schema_migrations',
      'scope_cibles',
      'scope_domaines',
      'scope_evenement_cibles',
      'scope_evenements',
      'scope_lieux',
      'scope_ois',
      'scope_participations',
      'scope_public_rule_versions',
      'scope_salles_theorie'
    ]) required_table
   where to_regclass('public.' || required_table) is null;
  if missing is not null then
    raise exception 'C23_REPAIR_MISSING_PRECONDITION_TABLES: %', missing;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated') then
    raise exception 'C23_REPAIR_MISSING_CLIENT_ROLES';
  end if;
end $$;

alter table scope_domaines drop constraint if exists scope_domaines_code_chk;
alter table scope_domaines add constraint scope_domaines_code_chk
  check (code in ('FOBA','FOCO','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP','INSTITUTIONNEL'));

insert into scope_domaines(code, libelle, actif)
values ('INSTITUTIONNEL', 'Institutionnel', true)
on conflict (code) do nothing;

alter table scope_evenements
  add column if not exists date_fin date,
  add column if not exists publication_key text,
  add column if not exists publication_fingerprint text,
  add column if not exists famille text,
  add column if not exists type_evenement text,
  add column if not exists lieu_id uuid references scope_lieux(lieu_id) on delete restrict,
  add column if not exists salle_theorie_id uuid references scope_salles_theorie(salle_id) on delete restrict,
  add column if not exists entree_service text,
  add column if not exists duree_planifiee_minutes integer,
  add column if not exists priorite integer,
  add column if not exists date_fixe boolean not null default false,
  add column if not exists journee_reservee boolean not null default false,
  add column if not exists permutation_autorisee boolean not null default false,
  add column if not exists exception_metier text;

alter table scope_evenements drop constraint if exists scope_evenements_duree_planifiee_chk;
alter table scope_evenements add constraint scope_evenements_duree_planifiee_chk
  check (duree_planifiee_minutes is null or duree_planifiee_minutes > 0);

create unique index if not exists scope_evenements_publication_key_uq
  on scope_evenements(publication_key)
  where publication_key is not null;

create index if not exists scope_evenements_qv_date_idx
  on scope_evenements(date, date_fin, heure_debut, heure_fin)
  where publication_key is not null;

create table if not exists scope_qv_publication_activities (
  publication_activity_id uuid primary key default gen_random_uuid(),
  source_year integer not null,
  source_definition_id text not null,
  activity_key text not null,
  label text not null,
  stat_com_code text,
  business_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_publication_activities_identity_uq unique (source_year, activity_key),
  constraint scope_qv_publication_activities_code_uq unique (source_year, business_code),
  constraint scope_qv_publication_activities_code_chk check (
    business_code is null or business_code ~ '^[^.]+[.][0-9]{3}$'
  ),
  constraint scope_qv_publication_activities_statcom_chk check (
    business_code is null or stat_com_code is not null
  )
);

create table if not exists scope_qv_publication_links (
  publication_link_id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null unique references scope_evenements(evenement_id) on delete restrict,
  publication_activity_id uuid not null references scope_qv_publication_activities(publication_activity_id) on delete restrict,
  source_year integer not null,
  source_definition_id text not null,
  source_occurrence_id text not null,
  source_session_id text not null,
  publication_unit_id text not null,
  publication_key text not null unique,
  source_revision text,
  source_record_ids jsonb not null default '[]'::jsonb,
  last_synced_fingerprint text not null,
  last_synced_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_publication_links_source_uq unique (
    source_year, source_definition_id, source_occurrence_id, source_session_id, publication_unit_id
  )
);

create table if not exists scope_qv_publication_runs (
  publication_run_id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  plan_fingerprint text not null,
  source_year integer not null,
  actor_id text not null,
  process_id text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  result text not null,
  planned_create_count integer not null default 0,
  planned_update_count integer not null default 0,
  planned_unchanged_count integer not null default 0,
  planned_blocked_count integer not null default 0,
  planned_not_published_count integer not null default 0,
  create_count integer not null default 0,
  update_count integer not null default 0,
  unchanged_count integer not null default 0,
  blocked_count integer not null default 0,
  not_published_count integer not null default 0,
  error_code text,
  rolled_back boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  constraint scope_qv_publication_runs_result_chk check (
    result in ('STARTED','SUCCESS','NO_OP','FAILURE','STALE_PLAN','FORBIDDEN','REJECTED')
  )
);

create index if not exists scope_qv_publication_runs_year_started_idx
  on scope_qv_publication_runs(source_year, started_at desc);

create table if not exists scope_evenement_domaines (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  domaine_code text not null references scope_domaines(code) on delete restrict,
  primary key (evenement_id, domaine_code)
);

create table if not exists scope_evenement_cibles_qv (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  cible_code text not null,
  primary key (evenement_id, cible_code)
);

create table if not exists scope_evenement_ois (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  oi_id uuid not null references scope_ois(oi_id) on delete restrict,
  primary key (evenement_id, oi_id)
);

create table if not exists scope_evenement_publics_qv (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  public_code text not null,
  primary key (evenement_id, public_code)
);

create table if not exists scope_evenement_public_rule_versions (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  public_rule_version_id uuid not null references scope_public_rule_versions(public_rule_version_id) on delete restrict,
  primary key (evenement_id, public_rule_version_id)
);

create table if not exists scope_evenement_roles_qv (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  role_code text not null,
  primary key (evenement_id, role_code)
);

create table if not exists scope_evenement_ressources_qv (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  ressource_code text not null,
  primary key (evenement_id, ressource_code)
);

create table if not exists scope_qv_session_groups (
  session_group_id text primary key,
  publication_activity_id uuid not null references scope_qv_publication_activities(publication_activity_id) on delete restrict,
  session_count integer not null check (session_count >= 1),
  created_at timestamptz not null default now()
);

create table if not exists scope_qv_session_events (
  session_group_id text not null references scope_qv_session_groups(session_group_id) on delete restrict,
  evenement_id uuid not null unique references scope_evenements(evenement_id) on delete restrict,
  session_index integer not null check (session_index >= 1),
  session_label text,
  primary key (session_group_id, session_index, evenement_id)
);

alter table scope_qv_publication_activities enable row level security;
alter table scope_qv_publication_links enable row level security;
alter table scope_qv_publication_runs enable row level security;
alter table scope_evenement_domaines enable row level security;
alter table scope_evenement_cibles_qv enable row level security;
alter table scope_evenement_ois enable row level security;
alter table scope_evenement_publics_qv enable row level security;
alter table scope_evenement_public_rule_versions enable row level security;
alter table scope_evenement_roles_qv enable row level security;
alter table scope_evenement_ressources_qv enable row level security;
alter table scope_qv_session_groups enable row level security;
alter table scope_qv_session_events enable row level security;

revoke all on scope_qv_publication_activities from anon, authenticated;
revoke all on scope_qv_publication_links from anon, authenticated;
revoke all on scope_qv_publication_runs from anon, authenticated;
revoke all on scope_evenement_domaines from anon, authenticated;
revoke all on scope_evenement_cibles_qv from anon, authenticated;
revoke all on scope_evenement_ois from anon, authenticated;
revoke all on scope_evenement_publics_qv from anon, authenticated;
revoke all on scope_evenement_public_rule_versions from anon, authenticated;
revoke all on scope_evenement_roles_qv from anon, authenticated;
revoke all on scope_evenement_ressources_qv from anon, authenticated;
revoke all on scope_qv_session_groups from anon, authenticated;
revoke all on scope_qv_session_events from anon, authenticated;

insert into monitoring_f7_schema_migrations(version)
values ('scope-qv-publication-c23-repair-1')
on conflict (version) do nothing;

do $$
declare
  missing text;
begin
  select string_agg(required_table, ', ' order by required_table)
    into missing
    from unnest(array[
      'scope_qv_publication_activities',
      'scope_qv_publication_links',
      'scope_qv_publication_runs',
      'scope_evenement_domaines',
      'scope_evenement_cibles_qv',
      'scope_evenement_ois',
      'scope_evenement_publics_qv',
      'scope_evenement_public_rule_versions',
      'scope_evenement_roles_qv',
      'scope_evenement_ressources_qv',
      'scope_qv_session_groups',
      'scope_qv_session_events'
    ]) required_table
   where to_regclass('public.' || required_table) is null;
  if missing is not null then
    raise exception 'C23_REPAIR_POSTCONDITION_FAILED: %', missing;
  end if;
  if not exists (
    select 1 from monitoring_f7_schema_migrations
     where version = 'scope-qv-publication-c23-repair-1'
  ) then
    raise exception 'C23_REPAIR_MIGRATION_MARKER_MISSING';
  end if;
end $$;

commit;
