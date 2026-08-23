-- SCOPE-PERSONNEL-IMPORT-POPULATIONS-1
-- Import nominatif multi-populations (PAPR, AUTO VL DPS/DAP, AUTO PL, FOBA, JSP Flm+site).
-- Additif. Idempotent. Non destructif.
-- Ne redéfinit pas scope_personnes. Ne supprime aucune affectation.
-- Site JSP = cible d’affectation ; niveau Flamme = colonne niveau (dimensions distinctes).
-- CAD/GEN JSP conservés (niveau NULL). Ne touche pas ORION.

insert into monitoring_f7_schema_migrations(version)
values ('scope-personnel-import-populations-1')
on conflict (version) do nothing;

alter table scope_affectations
  add column if not exists niveau text;

alter table scope_affectations
  drop constraint if exists scope_affectations_niveau_chk;

alter table scope_affectations
  add constraint scope_affectations_niveau_chk
  check (niveau is null or niveau in ('FLM_1', 'FLM_2', 'FLM_3'));

drop index if exists scope_affectations_open_unique;

create unique index if not exists scope_affectations_open_unique
  on scope_affectations (
    personne_id,
    categorie,
    domaine,
    cible,
    coalesce(niveau, ''),
    coalesce(role_domaine, '')
  )
  where date_inactif is null;

create index if not exists scope_affectations_population_idx
  on scope_affectations (domaine, cible, niveau, date_actif, date_inactif);

create table if not exists scope_personnel_import_batches (
  id text primary key,
  import_type text not null,
  contexte text,
  site_jsp text,
  annee_monitoring integer not null,
  filename text,
  status text not null,
  total_lines integer not null default 0,
  total_unique_nips integer not null default 0,
  count_identical integer not null default 0,
  count_new_persons integer not null default 0,
  count_new_jsp integer not null default 0,
  count_modified integer not null default 0,
  count_new_assignments integer not null default 0,
  count_existing_assignments integer not null default 0,
  count_missing_assignments integer not null default 0,
  count_closures integer not null default 0,
  count_errors integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);

alter table scope_personnel_import_batches add column if not exists site_jsp text;
alter table scope_personnel_import_batches add column if not exists count_new_jsp integer not null default 0;
alter table scope_personnel_import_batches add column if not exists count_existing_assignments integer not null default 0;
alter table scope_personnel_import_batches add column if not exists count_closures integer not null default 0;

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

create index if not exists idx_scope_import_lines_batch
  on scope_personnel_import_lines (batch_id, line_number);
