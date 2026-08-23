-- SCOPE-PERSONNEL-IMPORT-POPULATIONS-1
-- Import nominatif multi-populations (PAPR, AUTO VL DPS/DAP, AUTO PL, FOBA, JSP).
-- Additif. Idempotent. Non destructif.
-- Ne redéfinit pas scope_personnes. Ne supprime aucune affectation.
-- JSP : Flamme = grade Personne ; site = cible d’affectation.
-- Ne crée PAS scope_affectations.niveau.
-- CAD/GEN JSP conservés. Ne touche pas ORION.

insert into monitoring_f7_schema_migrations(version)
values ('scope-personnel-import-populations-1')
on conflict (version) do nothing;

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
