-- SCOPE-DATA-5 — import CSV exercices (additif).
-- Ne modifie aucune table monitoring_f7_*.
-- Idempotent. Aucun seed de règle de bascule (décision MOA).

insert into monitoring_f7_schema_migrations(version)
values ('scope-data-5')
on conflict (version) do nothing;

create table if not exists scope_regles_bascule (
  domaine_code text primary key references scope_domaines(code),
  date_bascule date not null,
  commentaire text,
  updated_at timestamptz not null default now()
);

create table if not exists scope_imports (
  import_id uuid primary key,
  source_filename text,
  source_sha256 text,
  imported_at timestamptz not null default now(),
  imported_par text,
  statut text not null,
  nb_lignes integer not null default 0,
  rapport jsonb,
  constraint scope_imports_statut_chk check (statut in ('COMMITE','REFUSE','PARTIEL'))
);

create table if not exists scope_import_lignes (
  import_id uuid not null references scope_imports(import_id),
  ligne_no integer not null,
  fingerprint text not null,
  statut text not null,
  type_propose text,
  evenement_id uuid references scope_evenements(evenement_id),
  legacy_id uuid references scope_legacy_aggregates(legacy_id),
  payload_source jsonb,
  raison text,
  action text,
  primary key (import_id, ligne_no),
  constraint scope_import_lignes_statut_chk check (statut in (
    'IMPORTE','IGNORE','ERREUR','DEJA_IMPORTE','EXCLU'
  ))
);

create unique index if not exists scope_import_lignes_fingerprint_imported
  on scope_import_lignes (fingerprint) where statut = 'IMPORTE';

alter table scope_legacy_aggregates
  add column if not exists evenement_id uuid references scope_evenements(evenement_id);

alter table scope_legacy_aggregates
  add column if not exists fingerprint text;
