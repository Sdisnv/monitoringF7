begin;

create table if not exists scope_catalog_import_runs (
  import_run_id uuid primary key default gen_random_uuid(),source_sha256 text not null,source_name text not null,source_year integer not null,
  preview_fingerprint text not null,status text not null,summary jsonb not null,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),created_by text,applied_at timestamptz,applied_by text,
  constraint scope_catalog_import_runs_sha_chk check (source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint scope_catalog_import_runs_preview_chk check (preview_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint scope_catalog_import_runs_year_chk check (source_year between 2000 and 2200),
  constraint scope_catalog_import_runs_status_chk check (status in ('APPLIED','PARTIAL')),
  constraint scope_catalog_import_runs_source_uk unique (source_sha256,preview_fingerprint)
);

create table if not exists scope_catalog_import_decisions (
  import_decision_id uuid primary key default gen_random_uuid(),import_run_id uuid not null references scope_catalog_import_runs(import_run_id) on delete restrict,
  source_sha256 text not null,proposal_key text not null,proposal_id text not null,decision text not null,target_definition_id uuid references scope_event_definitions(definition_id) on delete restrict,
  payload jsonb not null,comment text,decided_at timestamptz not null default now(),decided_by text,
  constraint scope_catalog_import_decisions_decision_chk check (decision in ('IMPORT','MERGE','IGNORE','REVIEW_REQUIRED')),
  constraint scope_catalog_import_decisions_target_chk check (decision<>'MERGE' or target_definition_id is not null),
  constraint scope_catalog_import_decisions_source_uk unique (source_sha256,proposal_key)
);

create index if not exists scope_catalog_import_decisions_run_idx on scope_catalog_import_decisions(import_run_id,decision);
create index if not exists scope_catalog_import_decisions_target_idx on scope_catalog_import_decisions(target_definition_id) where target_definition_id is not null;

create or replace function scope_catalog_import_decision_guard()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' then raise exception 'catalog import decisions are append-only'; end if;
  if tg_op='UPDATE' and (new.import_run_id is distinct from old.import_run_id or new.source_sha256 is distinct from old.source_sha256
    or new.proposal_key is distinct from old.proposal_key or new.proposal_id is distinct from old.proposal_id
    or new.decision is distinct from old.decision or new.target_definition_id is distinct from old.target_definition_id
    or new.payload is distinct from old.payload or new.comment is distinct from old.comment
    or new.decided_at is distinct from old.decided_at or new.decided_by is distinct from old.decided_by)
    then raise exception 'catalog import decisions are immutable'; end if;
  return new;
end $$;

drop trigger if exists scope_catalog_import_decision_guard_trg on scope_catalog_import_decisions;
create trigger scope_catalog_import_decision_guard_trg before update or delete on scope_catalog_import_decisions
for each row execute function scope_catalog_import_decision_guard();

do $$ declare table_name text; role_name text; begin
  foreach table_name in array array['scope_catalog_import_runs','scope_catalog_import_decisions'] loop
    execute format('alter table %I enable row level security',table_name);
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname=role_name) then execute format('revoke all on %I from %I',table_name,role_name); end if;
    end loop;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version)
values ('scope-annual-catalog-import-c15')
on conflict (version) do nothing;

commit;
