'use strict';

const NORMALIZE_VPC_SQL = `do $$
declare old_id uuid; canonical_id uuid;
begin
  select competence_id into old_id from scope_competence_definitions where code = 'OP_VPC';
  select competence_id into canonical_id from scope_competence_definitions where code = 'VPC';
  if old_id is not null and canonical_id is null then
    update scope_competence_definitions
      set code='VPC',libelle='VPC',metadata=metadata || '{"legacyCodes":["OP_VPC"],"normalizedBy":"C3-B"}'::jsonb,updated_at=now()
      where competence_id=old_id;
  elsif old_id is not null and canonical_id is not null and old_id <> canonical_id then
    raise exception 'C3-B refuses duplicate VPC and OP_VPC qualification identities';
  end if;
end $$`;

const DDL = Object.freeze([
  `create table if not exists scope_competence_implications (
    competence_implication_id uuid primary key default gen_random_uuid(),
    competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
    implied_competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
    status text not null default 'ACTIVE',metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_competence_implications_distinct_chk check (competence_id <> implied_competence_id),
    constraint scope_competence_implications_status_chk check (status in ('ACTIVE','INACTIVE')),
    constraint scope_competence_implications_uk unique (competence_id,implied_competence_id))`,
  `create table if not exists scope_person_qualifications (
    person_qualification_id uuid primary key default gen_random_uuid(),
    personne_id text not null references scope_personnes(id) on delete restrict,
    competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
    valid_from date not null,valid_to date,status text not null default 'REVIEW_REQUIRED',
    supersedes_person_qualification_id uuid references scope_person_qualifications(person_qualification_id) on delete restrict,
    created_at timestamptz not null default now(),created_by text,validated_at timestamptz,validated_by text,
    invalidated_at timestamptz,invalidated_by text,invalidation_reason text,
    metadata jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now(),
    constraint scope_person_qualifications_dates_chk check (valid_to is null or valid_from <= valid_to),
    constraint scope_person_qualifications_status_chk check (status in ('CONFIRMED','REVIEW_REQUIRED','INVALIDATED')),
    constraint scope_person_qualifications_validation_chk check (status <> 'CONFIRMED' or validated_at is not null),
    constraint scope_person_qualifications_invalidation_chk check (status <> 'INVALIDATED' or (invalidated_at is not null and length(trim(invalidation_reason)) > 0)))`,
  `create index if not exists scope_person_qualifications_lookup_idx on scope_person_qualifications(personne_id,competence_id,status,valid_from,valid_to)`,
  `create unique index if not exists scope_person_qualifications_open_confirmed_uk on scope_person_qualifications(personne_id,competence_id) where status='CONFIRMED' and valid_to is null`,
  `create table if not exists scope_person_qualification_evidence (
    person_qualification_evidence_id uuid primary key default gen_random_uuid(),
    person_qualification_id uuid not null references scope_person_qualifications(person_qualification_id) on delete restrict,
    source_type text not null,source_entity text not null,source_id text not null,
    source_import_batch_id text references scope_personnel_import_batches(id) on delete restrict,
    source_import_line_id text references scope_personnel_import_lines(id) on delete restrict,
    legacy_domain text,legacy_target text,legacy_code text,legacy_context text,
    source_valid_from date not null,source_valid_to date,confidence numeric(4,3) not null default 1,
    source_payload jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),created_by text,
    constraint scope_person_qualification_evidence_source_uk unique (source_type,source_entity,source_id),
    constraint scope_person_qualification_evidence_dates_chk check (source_valid_to is null or source_valid_from <= source_valid_to),
    constraint scope_person_qualification_evidence_confidence_chk check (confidence between 0 and 1),
    constraint scope_person_qualification_evidence_source_chk check (length(trim(source_type)) > 0 and length(trim(source_entity)) > 0 and length(trim(source_id)) > 0))`,
  `create index if not exists scope_person_qualification_evidence_qualification_idx on scope_person_qualification_evidence(person_qualification_id,source_valid_from,source_valid_to)`,
  `create table if not exists scope_event_role_definitions (
    event_role_definition_id uuid primary key default gen_random_uuid(),code text not null unique,label text not null,
    domain_code text references scope_domaines(code),active boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_event_role_definitions_code_chk check (code ~ '^[A-Z0-9][A-Z0-9_]*$'),
    constraint scope_event_role_definitions_label_chk check (length(trim(label)) > 0))`,
  `create table if not exists scope_event_role_aliases (
    alias text primary key,event_role_definition_id uuid not null references scope_event_role_definitions(event_role_definition_id) on delete restrict,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),
    constraint scope_event_role_aliases_alias_chk check (length(trim(alias)) > 0))`,
  `create table if not exists scope_event_person_roles (
    event_person_role_id uuid primary key default gen_random_uuid(),
    evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
    personne_id text not null references scope_personnes(id) on delete restrict,
    event_role_definition_id uuid not null references scope_event_role_definitions(event_role_definition_id) on delete restrict,
    source_type text not null default 'MANUAL',metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),created_by text,
    constraint scope_event_person_roles_uk unique (evenement_id,personne_id,event_role_definition_id))`
]);

const GUARD_SQL = `create or replace function scope_person_qualifications_guard()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' then
    raise exception 'person qualification history is append-only';
  end if;
  perform pg_advisory_xact_lock(671902279,hashtext(new.personne_id || ':' || new.competence_id::text));
  if tg_op='UPDATE' and (new.personne_id is distinct from old.personne_id or new.competence_id is distinct from old.competence_id or
    new.valid_from is distinct from old.valid_from or new.valid_to is distinct from old.valid_to or
    new.supersedes_person_qualification_id is distinct from old.supersedes_person_qualification_id)
    then raise exception 'person qualification corrections are append-only'; end if;
  if tg_op='UPDATE' and not (new.status=old.status or (old.status='REVIEW_REQUIRED' and new.status in ('CONFIRMED','INVALIDATED')) or
    (old.status='CONFIRMED' and new.status='INVALIDATED'))
    then raise exception 'invalid person qualification status transition: % -> %',old.status,new.status; end if;
  if tg_op='INSERT' and new.supersedes_person_qualification_id is not null then
    if new.status<>'REVIEW_REQUIRED' then
      raise exception 'a superseding person qualification must start in REVIEW_REQUIRED';
    end if;
    if new.supersedes_person_qualification_id=new.person_qualification_id then
      raise exception 'person qualification cannot supersede itself';
    end if;
    if not exists (select 1 from scope_person_qualifications superseded
      where superseded.person_qualification_id=new.supersedes_person_qualification_id
        and superseded.personne_id=new.personne_id and superseded.competence_id=new.competence_id
        and superseded.status='CONFIRMED') then
      raise exception 'superseded person qualification must be confirmed for the same person and competence';
    end if;
    if exists (with recursive ancestors as (
        select person_qualification_id,supersedes_person_qualification_id
        from scope_person_qualifications where person_qualification_id=new.supersedes_person_qualification_id
        union all
        select parent.person_qualification_id,parent.supersedes_person_qualification_id
        from scope_person_qualifications parent join ancestors child
          on parent.person_qualification_id=child.supersedes_person_qualification_id
      ) select 1 from ancestors where person_qualification_id=new.person_qualification_id) then
      raise exception 'person qualification supersession cycle detected';
    end if;
  end if;
  if new.status='CONFIRMED' and exists (select 1 from scope_person_qualifications existing
    where existing.personne_id=new.personne_id and existing.competence_id=new.competence_id and existing.status='CONFIRMED'
      and existing.person_qualification_id<>new.person_qualification_id
      and daterange(existing.valid_from,coalesce(existing.valid_to,date '9999-12-31'),'[]') && daterange(new.valid_from,coalesce(new.valid_to,date '9999-12-31'),'[]'))
    then raise exception 'overlapping confirmed person qualifications are forbidden'; end if;
  if new.status='CONFIRMED' and exists (
    select 1 from scope_competence_implications implication
    where implication.competence_id=new.competence_id and implication.status='ACTIVE'
      and not exists (
        select 1 from scope_person_qualifications required
        where required.personne_id=new.personne_id and required.competence_id=implication.implied_competence_id
          and required.status='CONFIRMED' and required.valid_from<=new.valid_from
          and coalesce(required.valid_to,date '9999-12-31')>=coalesce(new.valid_to,date '9999-12-31')
      )
  ) then raise exception 'confirmed person qualification is missing an implied qualification'; end if;
  if tg_op='UPDATE' and old.status='CONFIRMED' and new.status='INVALIDATED' and exists (
    select 1
    from scope_person_qualifications dependent
    join scope_competence_implications implication
      on implication.competence_id=dependent.competence_id
     and implication.implied_competence_id=old.competence_id
     and implication.status='ACTIVE'
    where dependent.personne_id=old.personne_id and dependent.status='CONFIRMED'
      and not exists (
        select 1 from scope_person_qualifications replacement
        where replacement.personne_id=dependent.personne_id
          and replacement.competence_id=old.competence_id
          and (replacement.status='CONFIRMED' or (
            replacement.status='REVIEW_REQUIRED'
            and replacement.supersedes_person_qualification_id=old.person_qualification_id
            and current_setting('scope.person_qualification_supersession',true)=old.person_qualification_id::text || ':' || replacement.person_qualification_id::text
          ))
          and replacement.person_qualification_id<>old.person_qualification_id
          and replacement.valid_from<=dependent.valid_from
          and coalesce(replacement.valid_to,date '9999-12-31')>=coalesce(dependent.valid_to,date '9999-12-31')
      )
  ) then raise exception 'required person qualification still covers a confirmed dependent qualification'; end if;
  return new;
end $$`;

const SUPERSESSION_SQL = `create or replace function scope_supersede_person_qualification(
  p_superseded_id uuid,p_replacement_id uuid,p_actor text,p_reason text
) returns void language plpgsql as $$
declare superseded scope_person_qualifications%rowtype;
declare replacement scope_person_qualifications%rowtype;
begin
  if p_superseded_id=p_replacement_id then raise exception 'person qualification cannot supersede itself'; end if;
  if length(trim(coalesce(p_reason,'')))=0 then raise exception 'person qualification supersession reason is required'; end if;
  select * into superseded from scope_person_qualifications where person_qualification_id=p_superseded_id for update;
  if not found then raise exception 'superseded person qualification does not exist'; end if;
  select * into replacement from scope_person_qualifications where person_qualification_id=p_replacement_id for update;
  if not found then raise exception 'replacement person qualification does not exist'; end if;
  if superseded.status<>'CONFIRMED' then raise exception 'superseded person qualification is not replaceable'; end if;
  if replacement.status<>'REVIEW_REQUIRED' then raise exception 'replacement person qualification must be REVIEW_REQUIRED'; end if;
  if replacement.personne_id<>superseded.personne_id then raise exception 'supersession person mismatch'; end if;
  if replacement.competence_id<>superseded.competence_id then raise exception 'supersession competence mismatch'; end if;
  if replacement.supersedes_person_qualification_id is distinct from superseded.person_qualification_id then
    raise exception 'replacement does not reference the superseded person qualification';
  end if;
  if exists (with recursive ancestors as (
      select person_qualification_id,supersedes_person_qualification_id
      from scope_person_qualifications where person_qualification_id=superseded.person_qualification_id
      union all
      select parent.person_qualification_id,parent.supersedes_person_qualification_id
      from scope_person_qualifications parent join ancestors child
        on parent.person_qualification_id=child.supersedes_person_qualification_id
    ) select 1 from ancestors where person_qualification_id=replacement.person_qualification_id) then
    raise exception 'person qualification supersession cycle detected';
  end if;
  perform set_config('scope.person_qualification_supersession',superseded.person_qualification_id::text || ':' || replacement.person_qualification_id::text,true);
  update scope_person_qualifications set status='INVALIDATED',invalidated_at=now(),invalidated_by=p_actor,
    invalidation_reason=p_reason,updated_at=now() where person_qualification_id=superseded.person_qualification_id;
  update scope_person_qualifications set status='CONFIRMED',validated_at=coalesce(validated_at,now()),validated_by=coalesce(validated_by,p_actor),
    updated_at=now() where person_qualification_id=replacement.person_qualification_id;
  perform set_config('scope.person_qualification_supersession','',true);
exception when others then
  perform set_config('scope.person_qualification_supersession','',true);
  raise;
end $$`;

const EVIDENCE_GUARD_SQL = `create or replace function scope_person_qualification_evidence_guard()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' then
    raise exception 'person qualification evidence history is append-only';
  end if;
  if new is distinct from old then
    raise exception 'person qualification evidence is immutable';
  end if;
  return new;
end $$`;

module.exports = { NORMALIZE_VPC_SQL, DDL, GUARD_SQL, SUPERSESSION_SQL, EVIDENCE_GUARD_SQL };
