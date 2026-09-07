-- SCOPE-GENERIC-EXERCISE-SESSIONS-1
-- Fondation additive Exercice -> Session(s).
-- scope_evenements reste la session operationnelle.
-- pr_exercise_group_key/pr_session_key restent en compatibilite legacy.

create table if not exists scope_exercices (
  exercice_id uuid primary key default gen_random_uuid(),
  exercice_key text,
  domaine_code text not null references scope_domaines(code),
  code text,
  libelle text not null,
  annee integer,
  mode_session text not null default 'SINGLE',
  nombre_sessions_attendu integer not null default 1,
  consolidation_active boolean not null default false,
  source text not null default 'MANUEL',
  cycle_id uuid references scope_cycles(cycle_id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_exercices_mode_session_chk check (mode_session in ('SINGLE','MULTI')),
  constraint scope_exercices_nb_sessions_chk check (nombre_sessions_attendu >= 1),
  constraint scope_exercices_libelle_chk check (length(trim(libelle)) > 0),
  constraint scope_exercices_source_chk check (source in ('MANUEL','IMPORT','ARBITRAGE_MOA','BACKFILL','LEGACY_BRIDGE')),
  constraint scope_exercices_multi_chk check (
    (mode_session = 'SINGLE' and nombre_sessions_attendu = 1)
    or (mode_session = 'MULTI' and nombre_sessions_attendu >= 2)
  )
);

create unique index if not exists scope_exercices_exercice_key_uq
  on scope_exercices (exercice_key)
  where exercice_key is not null;

create index if not exists scope_exercices_lookup_idx
  on scope_exercices (domaine_code, annee, mode_session);

alter table scope_evenements
  add column if not exists exercice_id uuid references scope_exercices(exercice_id) on delete set null;

alter table scope_evenements
  add column if not exists session_index integer;

alter table scope_evenements
  add column if not exists session_label text;

alter table scope_evenements drop constraint if exists scope_evenements_session_index_chk;

alter table scope_evenements add constraint scope_evenements_session_index_chk
  check (session_index is null or session_index >= 1);

create index if not exists scope_evenements_exercice_id_idx
  on scope_evenements (exercice_id);

create unique index if not exists scope_evenements_exercice_session_uq
  on scope_evenements (exercice_id, session_index)
  where exercice_id is not null and session_index is not null;

insert into monitoring_f7_schema_migrations(version)
values ('scope-generic-exercise-sessions-1')
on conflict (version) do nothing;
