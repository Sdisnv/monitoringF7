-- SCOPE-GENERIC-EVENT-SESSION-POLICY-ARCHITECTURE-1
-- Catalogue formation additif : definitions, versions et policy versions.
-- Les evenements sans definition restent legacy. PR legacy n'est pas migre.

create table if not exists scope_event_definitions (
  definition_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  domain text not null references scope_domaines(code),
  description text,
  status text not null default 'ACTIF',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_event_definitions_status_chk check (status in ('ACTIF','INACTIF','ARCHIVE')),
  constraint scope_event_definitions_code_chk check (length(trim(code)) > 0),
  constraint scope_event_definitions_label_chk check (length(trim(label)) > 0)
);

create index if not exists scope_event_definitions_domain_idx
  on scope_event_definitions(domain, status);

create table if not exists scope_participation_policy_versions (
  policy_version_id uuid primary key default gen_random_uuid(),
  policy_code text not null,
  domain text not null references scope_domaines(code),
  version_code text not null,
  valid_from date,
  valid_to date,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_policy_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to),
  constraint scope_policy_versions_unique unique(policy_code, version_code),
  constraint scope_policy_versions_code_chk check (length(trim(policy_code)) > 0),
  constraint scope_policy_versions_version_chk check (length(trim(version_code)) > 0)
);

create index if not exists scope_policy_versions_domain_dates_idx
  on scope_participation_policy_versions(domain, valid_from, valid_to)
  where active is true;

create table if not exists scope_event_definition_versions (
  definition_version_id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references scope_event_definitions(definition_id),
  version_code text not null,
  valid_from date,
  valid_to date,
  mode_organisation text not null default 'SIMPLE',
  session_count integer not null default 1,
  policy_version_id uuid references scope_participation_policy_versions(policy_version_id),
  population_rule jsonb not null default '{}'::jsonb,
  numbering_pattern text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_event_definition_versions_mode_chk check (mode_organisation in ('SIMPLE','MULTI_SESSION')),
  constraint scope_event_definition_versions_sessions_chk check (
    (mode_organisation = 'SIMPLE' and session_count = 1)
    or (mode_organisation = 'MULTI_SESSION' and session_count >= 2)
  ),
  constraint scope_event_definition_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to),
  constraint scope_event_definition_versions_unique unique(definition_id, version_code)
);

create index if not exists scope_event_definition_versions_lookup_idx
  on scope_event_definition_versions(definition_id, valid_from, valid_to)
  where active is true;

alter table scope_exercices
  add column if not exists definition_version_id uuid references scope_event_definition_versions(definition_version_id);

alter table scope_exercices
  add column if not exists policy_version_id uuid references scope_participation_policy_versions(policy_version_id);

alter table scope_exercices
  add column if not exists engine_route text;

alter table scope_exercices
  add column if not exists configuration_snapshot jsonb;

alter table scope_evenements
  add column if not exists definition_version_id uuid references scope_event_definition_versions(definition_version_id);

alter table scope_evenements
  add column if not exists policy_version_id uuid references scope_participation_policy_versions(policy_version_id);

alter table scope_evenements
  add column if not exists engine_route text;

alter table scope_evenements
  add column if not exists engine_snapshot jsonb;

alter table scope_evenements drop constraint if exists scope_evenements_engine_route_chk;
alter table scope_evenements add constraint scope_evenements_engine_route_chk
  check (engine_route is null or engine_route in ('SIMPLE_LEGACY','PR_LEGACY','GENERIC_SIMPLE','GENERIC_MULTI_SESSION'));

alter table scope_exercices drop constraint if exists scope_exercices_engine_route_chk;
alter table scope_exercices add constraint scope_exercices_engine_route_chk
  check (engine_route is null or engine_route in ('SIMPLE_LEGACY','PR_LEGACY','GENERIC_SIMPLE','GENERIC_MULTI_SESSION'));

insert into scope_participation_policy_versions(policy_code, domain, version_code, valid_from, valid_to, config, metadata)
values (
  'DAP-MULTISESSION',
  'DAP',
  '2026',
  '2026-01-01',
  '2026-12-31',
  '{
    "domainCode":"DAP",
    "policyVersion":"dap-multisession-2026",
    "activeStatuses":["NON_RENSEIGNE","PRESENT","ABSENT_EXCUSE","ABSENT_NON_EXCUSE","DISPENSE"],
    "excuseMotifs":["PRIVE","PROFESSIONNEL","ARMEE","ACCIDENT_MALADIE"],
    "dispenseMotifs":["FORMATION_HORS_SDIS","AUTRE"],
    "roles":["PARTICIPANT","FORMATEUR","MONITEUR"],
    "behavior":{"propagationScope":"ALL_EXERCISE_SESSIONS","deduplicationScope":"EXERCISE"}
  }'::jsonb,
  '{"source":"generic_event_session_policy_architecture_1","explicit":true}'::jsonb
)
on conflict (policy_code, version_code) do nothing;

insert into scope_event_definitions(code, label, domain, description, status, metadata)
values (
  'DAP-FORMATION-GROUPEE',
  'Formation groupée DAP',
  'DAP',
  'Premier modèle générique raccordable au Multi-session V2 validé.',
  'ACTIF',
  '{"source":"generic_event_session_policy_architecture_1","explicit":true}'::jsonb
)
on conflict (code) do nothing;

insert into scope_event_definition_versions(definition_id, version_code, valid_from, valid_to, mode_organisation, session_count, policy_version_id, population_rule, numbering_pattern, metadata)
select d.definition_id,
       '2026',
       '2026-01-01',
       '2026-12-31',
       'MULTI_SESSION',
       2,
       pv.policy_version_id,
       '{"type":"SCOPE_TARGET_RULE","domain":"DAP","scope":"CIBLES_EVENEMENT"}'::jsonb,
       '{label} {index.major}.{index.minor}',
       '{"source":"generic_event_session_policy_architecture_1","reference":"DAP-FORMATION-GROUPEE-1-2026"}'::jsonb
from scope_event_definitions d
join scope_participation_policy_versions pv on pv.policy_code = 'DAP-MULTISESSION' and pv.version_code = '2026'
where d.code = 'DAP-FORMATION-GROUPEE'
on conflict (definition_id, version_code) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-generic-event-session-policy-architecture-1')
on conflict (version) do nothing;
