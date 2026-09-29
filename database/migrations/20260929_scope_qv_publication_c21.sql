-- C21 local contract review only. Never applied by this scope.
-- It complements the C20 draft by separating canonical activity codes from
-- publication materializations and by adding an execution audit trail.

begin;

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

alter table scope_qv_publication_links
  add column if not exists publication_activity_id uuid
  references scope_qv_publication_activities(publication_activity_id) on delete restrict;

alter table scope_qv_publication_links
  add column if not exists source_record_ids jsonb not null default '[]'::jsonb;

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

alter table scope_qv_publication_activities enable row level security;
alter table scope_qv_publication_runs enable row level security;

revoke all on scope_qv_publication_activities from anon, authenticated;
revoke all on scope_qv_publication_runs from anon, authenticated;

-- Mandatory safety boundary: this architecture draft cannot persist.
rollback;
