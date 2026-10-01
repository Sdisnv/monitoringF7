-- Event codes are allocated once, per Stat.Com, when an operational event is published.
-- This migration is additive and is not executed by the local recipe.
begin;

create table if not exists scope_event_code_sequences (
  statcom_code text primary key references scope_statcom_referentiel(code) on delete restrict,
  last_number integer not null default 0 check (last_number between 0 and 999),
  updated_at timestamptz not null default now()
);

create table if not exists scope_event_code_allocations (
  event_code text primary key,
  evenement_id uuid not null unique,
  statcom_code text not null references scope_statcom_referentiel(code) on delete restrict,
  sequence_number integer not null check (sequence_number between 1 and 999),
  suffix text not null default '' check (suffix = '' or suffix ~ '^[a-z]$'),
  state text not null default 'ACTIVE' check (state in ('ACTIVE','RETIRED')),
  allocated_at timestamptz not null default now(),
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint scope_event_code_allocations_format_chk
    check (event_code = statcom_code || '.' || lpad(sequence_number::text,3,'0') || suffix),
  constraint scope_event_code_allocations_rank_uq unique(statcom_code,sequence_number,suffix)
);

insert into scope_event_code_sequences(statcom_code,last_number)
select upper(m[1]),max((m[2])::integer)
from scope_evenements e
cross join lateral regexp_match(upper(trim(e.code_cours)),'^([A-Z0-9]+)[.]([0-9]{3})[a-z]?$','i') m
join scope_statcom_referentiel r on r.code=upper(m[1])
where upper(coalesce(e.statcom_code,''))=upper(m[1])
group by upper(m[1])
on conflict(statcom_code) do update set last_number=greatest(scope_event_code_sequences.last_number,excluded.last_number),updated_at=now();

insert into scope_event_code_allocations(event_code,evenement_id,statcom_code,sequence_number,suffix,metadata)
select upper(m[1]) || '.' || m[2] || lower(coalesce(m[3],'')),e.evenement_id,upper(m[1]),(m[2])::integer,
       lower(coalesce(m[3],'')),jsonb_build_object('source','PREEXISTING_SCOPE_EVENT')
from scope_evenements e
cross join lateral regexp_match(trim(e.code_cours),'^([A-Za-z0-9]+)[.]([0-9]{3})([a-z]?)$') m
join scope_statcom_referentiel r on r.code=upper(m[1])
where upper(coalesce(e.statcom_code,''))=upper(m[1])
on conflict do nothing;

create unique index if not exists scope_evenements_code_cours_uq
  on scope_evenements(code_cours) where code_cours is not null and trim(code_cours) <> '';
create index if not exists scope_evenements_code_cours_search_idx
  on scope_evenements(lower(code_cours) text_pattern_ops) where code_cours is not null;
create index if not exists scope_event_code_allocations_statcom_sort_idx
  on scope_event_code_allocations(statcom_code,sequence_number,suffix);

alter table scope_event_code_sequences enable row level security;
alter table scope_event_code_allocations enable row level security;
revoke all on scope_event_code_sequences from anon,authenticated;
revoke all on scope_event_code_allocations from anon,authenticated;

insert into monitoring_f7_schema_migrations(version)
values ('scope-event-identity-phase2')
on conflict(version) do nothing;

commit;
