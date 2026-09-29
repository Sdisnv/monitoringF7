drop schema if exists c22_gate cascade;
create schema c22_gate;
set search_path = c22_gate, public;

create table scope_activities (
  id uuid primary key,
  source_year integer not null check (source_year between 2000 and 2100),
  definition_id text not null,
  activity_key text not null,
  libelle text not null,
  statcom_code text,
  code_metier text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (source_year, activity_key),
  unique (source_year, code_metier),
  check (code_metier is null or code_metier ~ '^[[:alnum:]]+\.[0-9]{3}$')
);

create table scope_evenements (
  id uuid primary key,
  publication_key text not null unique,
  activite_id uuid not null references scope_activities(id) on delete restrict,
  source_year integer not null,
  statut text not null check (statut in ('PLANIFIE','REPORTE','ANNULE')),
  libelle text not null,
  domaine_code text not null,
  famille text,
  type_evenement text,
  debut timestamp without time zone not null,
  fin timestamp without time zone not null,
  duree_minutes integer not null check (duree_minutes > 0),
  lieu_code text,
  salle_code text,
  responsable_id text,
  entree_service text,
  priorite integer,
  date_fixe boolean not null default false,
  journee_reservee boolean not null default false,
  permutation_autorisee boolean not null default false,
  exception_metier text,
  publication_fingerprint text not null,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  check (fin > debut)
);

create table scope_qv_publication_links (
  id uuid primary key,
  evenement_id uuid not null unique references scope_evenements(id) on delete restrict,
  publication_key text not null unique,
  source_year integer not null,
  definition_id text not null,
  occurrence_id text not null,
  session_id text not null,
  publication_unit_id text not null,
  source_record_ids jsonb not null check (jsonb_typeof(source_record_ids) = 'array'),
  last_synced_fingerprint text not null,
  last_synced_at timestamptz not null,
  unique (source_year, definition_id, occurrence_id, session_id, publication_unit_id)
);

create table scope_evenement_domaines (
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  domaine_code text not null,
  primary key (evenement_id, domaine_code)
);
create table scope_evenement_cibles (
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  cible_code text not null,
  primary key (evenement_id, cible_code)
);
create table scope_evenement_ois (
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  oi_code text not null,
  primary key (evenement_id, oi_code)
);
create table scope_evenement_publics (
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  public_code text not null,
  primary key (evenement_id, public_code)
);
create table scope_evenement_roles (
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  role_code text not null,
  primary key (evenement_id, role_code)
);
create table scope_evenement_ressources (
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  ressource_code text not null,
  primary key (evenement_id, ressource_code)
);

create table scope_session_groupes (
  group_id text primary key,
  activite_id uuid not null references scope_activities(id) on delete restrict,
  session_count integer not null check (session_count >= 1),
  created_at timestamptz not null
);
create table scope_session_evenements (
  group_id text not null references scope_session_groupes(group_id) on delete restrict,
  evenement_id uuid not null unique references scope_evenements(id) on delete restrict,
  session_index integer not null check (session_index >= 1),
  session_label text,
  primary key (group_id, session_index, evenement_id)
);

create table scope_donnees_operationnelles (
  id uuid primary key,
  evenement_id uuid not null references scope_evenements(id) on delete restrict,
  kind text not null check (kind in ('ATTENDU','PARTICIPATION','PERMUTATION','RATTRAPAGE','DECISION')),
  payload jsonb not null,
  created_at timestamptz not null
);

create table scope_publication_runs (
  run_id text primary key,
  plan_id text not null,
  plan_fingerprint text not null,
  source_year integer not null,
  actor_id text not null,
  process_id text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null check (status in ('STARTED','SUCCESS','NO_OP','FAILURE','STALE_PLAN','FORBIDDEN','REJECTED')),
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
  rolled_back boolean not null default false
);

create index scope_evenements_source_year_idx on scope_evenements(source_year);
create index scope_evenements_debut_idx on scope_evenements(debut);
create index scope_qv_links_definition_idx on scope_qv_publication_links(source_year, definition_id);
create index scope_operationnel_evenement_idx on scope_donnees_operationnelles(evenement_id, kind);

alter table scope_activities enable row level security;
alter table scope_evenements enable row level security;
alter table scope_qv_publication_links enable row level security;
alter table scope_evenement_domaines enable row level security;
alter table scope_evenement_cibles enable row level security;
alter table scope_evenement_ois enable row level security;
alter table scope_evenement_publics enable row level security;
alter table scope_evenement_roles enable row level security;
alter table scope_evenement_ressources enable row level security;
alter table scope_session_groupes enable row level security;
alter table scope_session_evenements enable row level security;
alter table scope_donnees_operationnelles enable row level security;
alter table scope_publication_runs enable row level security;

revoke all on schema c22_gate from public;
revoke all on all tables in schema c22_gate from public;
