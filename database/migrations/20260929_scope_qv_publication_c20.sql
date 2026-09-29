-- C20 architecture contract only. Do not apply in C20.
-- This additive target is reserved for a future, explicitly authorized C21 execution lot.

begin;

alter table scope_domaines drop constraint if exists scope_domaines_code_chk;
alter table scope_domaines add constraint scope_domaines_code_chk
  check (code in ('FOBA','FOCO','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP','INSTITUTIONNEL'));

insert into scope_domaines(code, libelle, actif)
values ('INSTITUTIONNEL', 'Institutionnel', true)
on conflict (code) do nothing;

alter table scope_evenements add column if not exists date_fin date;
alter table scope_evenements add column if not exists publication_key text;
alter table scope_evenements add column if not exists publication_fingerprint text;

create unique index if not exists scope_evenements_publication_key_uq
  on scope_evenements(publication_key)
  where publication_key is not null;

create table if not exists scope_qv_publication_links (
  publication_link_id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null unique references scope_evenements(evenement_id) on delete restrict,
  source_year integer not null,
  source_definition_id text not null,
  source_occurrence_id text not null,
  source_session_id text not null,
  publication_unit_id text not null,
  publication_key text not null unique,
  source_revision text,
  last_synced_fingerprint text not null,
  last_synced_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_publication_links_source_uq unique (
    source_year, source_definition_id, source_occurrence_id, source_session_id, publication_unit_id
  )
);

create table if not exists scope_evenement_ois (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  oi_id uuid not null references scope_ois(oi_id) on delete restrict,
  primary key (evenement_id, oi_id)
);

create table if not exists scope_evenement_public_rule_versions (
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  public_rule_version_id uuid not null references scope_public_rule_versions(public_rule_version_id) on delete restrict,
  primary key (evenement_id, public_rule_version_id)
);

alter table scope_qv_publication_links enable row level security;
alter table scope_evenement_ois enable row level security;
alter table scope_evenement_public_rule_versions enable row level security;

revoke all on scope_qv_publication_links from anon, authenticated;
revoke all on scope_evenement_ois from anon, authenticated;
revoke all on scope_evenement_public_rule_versions from anon, authenticated;

rollback;
