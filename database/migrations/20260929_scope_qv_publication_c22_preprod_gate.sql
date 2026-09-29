-- C22 preproduction mapping draft only. Never apply from this scope.
-- This closes the gaps demonstrated against the repository's real SCOPE schema.

begin;

alter table scope_evenements
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

create table if not exists scope_evenement_domaines (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  domaine_code text not null references scope_domaines(code) on delete restrict,
  primary key (evenement_id, domaine_code)
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

create index if not exists scope_evenements_qv_date_idx
  on scope_evenements(date, date_fin, heure_debut, heure_fin)
  where publication_key is not null;

alter table scope_evenement_domaines enable row level security;
alter table scope_evenement_roles_qv enable row level security;
alter table scope_evenement_ressources_qv enable row level security;
alter table scope_qv_session_groups enable row level security;
alter table scope_qv_session_events enable row level security;

revoke all on scope_evenement_domaines from anon, authenticated;
revoke all on scope_evenement_roles_qv from anon, authenticated;
revoke all on scope_evenement_ressources_qv from anon, authenticated;
revoke all on scope_qv_session_groups from anon, authenticated;
revoke all on scope_qv_session_events from anon, authenticated;

-- Mandatory safety boundary: the C22 Gate cannot persist a schema change.
rollback;
