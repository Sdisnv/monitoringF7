pragma foreign_keys = on;

create table c21_publication_activities (
  activity_id text primary key,
  source_year integer not null,
  definition_id text not null,
  label text not null,
  statcom_code text,
  business_code text,
  created_at text not null,
  updated_at text not null,
  unique (source_year, definition_id),
  unique (source_year, business_code),
  check (business_code is null or business_code glob '*.[0-9][0-9][0-9]')
);

create table c21_events (
  event_id text primary key,
  publication_key text not null unique,
  activity_id text not null references c21_publication_activities(activity_id) on delete restrict,
  source_year integer not null,
  status text not null,
  label text not null,
  primary_domain text not null,
  family text,
  event_type text,
  starts_at text not null,
  ends_at text not null,
  duration_minutes integer not null,
  location_code text,
  room_code text,
  responsible_id text,
  entry_service text,
  priority integer,
  fixed_date integer not null default 0,
  day_exclusive integer not null default 0,
  permutation_allowed integer not null default 0,
  business_exception text,
  published_fingerprint text not null,
  version integer not null default 1,
  created_at text not null,
  updated_at text not null,
  check (status in ('PLANIFIE','REPORTE','ANNULE')),
  check (duration_minutes > 0),
  check (fixed_date in (0,1)),
  check (day_exclusive in (0,1)),
  check (permutation_allowed in (0,1)),
  check (version >= 1)
);

create table c21_qv_publication_links (
  provenance_id text primary key,
  event_id text not null unique references c21_events(event_id) on delete restrict,
  publication_key text not null unique,
  source_year integer not null,
  definition_id text not null,
  occurrence_id text not null,
  session_id text not null,
  publication_unit_id text not null,
  source_record_ids text not null,
  last_synced_fingerprint text not null,
  last_synced_at text not null,
  unique (source_year, definition_id, occurrence_id, session_id, publication_unit_id)
);

create table c21_event_domains (
  event_id text not null references c21_events(event_id) on delete restrict,
  domain_code text not null,
  primary key (event_id, domain_code)
);

create table c21_event_targets (
  event_id text not null references c21_events(event_id) on delete restrict,
  target_code text not null,
  primary key (event_id, target_code)
);

create table c21_event_ois (
  event_id text not null references c21_events(event_id) on delete restrict,
  oi_code text not null,
  primary key (event_id, oi_code)
);

create table c21_event_publics (
  event_id text not null references c21_events(event_id) on delete restrict,
  public_code text not null,
  primary key (event_id, public_code)
);

create table c21_event_roles (
  event_id text not null references c21_events(event_id) on delete restrict,
  role_code text not null,
  primary key (event_id, role_code)
);

create table c21_event_resources (
  event_id text not null references c21_events(event_id) on delete restrict,
  resource_code text not null,
  primary key (event_id, resource_code)
);

create table c21_session_groups (
  group_id text primary key,
  activity_id text not null references c21_publication_activities(activity_id) on delete restrict,
  session_count integer not null,
  created_at text not null,
  check (session_count >= 1)
);

create table c21_session_events (
  group_id text not null references c21_session_groups(group_id) on delete restrict,
  event_id text not null unique references c21_events(event_id) on delete restrict,
  session_index integer not null,
  session_label text,
  primary key (group_id, session_index, event_id),
  check (session_index >= 1)
);

create table c21_operational_data (
  operational_id text primary key,
  event_id text not null references c21_events(event_id) on delete restrict,
  kind text not null,
  payload text not null,
  created_at text not null,
  check (kind in ('ATTENDU','PARTICIPATION','PERMUTATION','RATTRAPAGE','DECISION'))
);

create table c21_publication_runs (
  run_id text primary key,
  plan_id text not null,
  plan_fingerprint text not null,
  source_year integer not null,
  actor_id text not null,
  process_id text not null,
  started_at text not null,
  completed_at text,
  status text not null,
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
  rolled_back integer not null default 0,
  check (status in ('STARTED','SUCCESS','NO_OP','FAILURE','STALE_PLAN','FORBIDDEN','REJECTED')),
  check (rolled_back in (0,1))
);
