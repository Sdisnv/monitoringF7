-- SCOPE C4-B canonical annual catalogue foundations. Additive only.
begin;

select pg_advisory_xact_lock(671902280);

alter table scope_event_definitions add column if not exists family_code text;

alter table scope_event_definitions add column if not exists activity_type text not null default 'OTHER';

alter table scope_event_definitions drop constraint if exists scope_event_definitions_activity_type_chk;

alter table scope_event_definitions add constraint scope_event_definitions_activity_type_chk check (activity_type in ('EXERCISE','TRAINING','TEST','CURRICULUM','INSTRUCTION','OTHER'));

alter table scope_event_definition_versions add column if not exists status text not null default 'ACTIVE';

alter table scope_event_definition_versions add column if not exists description text;

alter table scope_event_definition_versions add column if not exists fingerprint text;

alter table scope_event_definition_versions drop constraint if exists scope_event_definition_versions_status_chk;

alter table scope_event_definition_versions add constraint scope_event_definition_versions_status_chk check (status in ('DRAFT','ACTIVE','RETIRED'));

alter table scope_event_definition_versions drop constraint if exists scope_event_definition_versions_fingerprint_chk;

alter table scope_event_definition_versions add constraint scope_event_definition_versions_fingerprint_chk check (fingerprint is null or fingerprint ~ '^[0-9a-f]{64}$');

create table if not exists scope_activity_domain_bindings (
    definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    domain_code text not null references scope_domaines(code) on delete restrict,
    binding_role text not null default 'SECONDARY',metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_domain_bindings_pk primary key (definition_version_id,domain_code),
    constraint scope_activity_domain_bindings_role_chk check (binding_role in ('PRIMARY','SECONDARY')));

create unique index if not exists scope_activity_domain_primary_uk on scope_activity_domain_bindings(definition_version_id) where binding_role='PRIMARY';

create table if not exists scope_activity_session_templates (
    session_template_id uuid primary key default gen_random_uuid(),
    definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    code text not null,sequence integer not null,label text not null,mandatory boolean not null default true,
    duration_minutes integer not null,min_offset_minutes integer,max_offset_minutes integer,
    depends_on_session_template_id uuid,public_continuity text not null default 'INHERIT',location_continuity text not null default 'INHERIT',
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_session_templates_code_uk unique (definition_version_id,code),
    constraint scope_activity_session_templates_sequence_uk unique (definition_version_id,sequence),
    constraint scope_activity_session_templates_pair_uk unique (definition_version_id,session_template_id),
    constraint scope_activity_session_templates_dependency_fk foreign key (definition_version_id,depends_on_session_template_id)
      references scope_activity_session_templates(definition_version_id,session_template_id) on delete restrict,
    constraint scope_activity_session_templates_values_chk check (sequence>0 and duration_minutes>0 and (min_offset_minutes is null or min_offset_minutes>=0)
      and (max_offset_minutes is null or max_offset_minutes>=0) and (min_offset_minutes is null or max_offset_minutes is null or min_offset_minutes<=max_offset_minutes)),
    constraint scope_activity_session_templates_public_chk check (public_continuity in ('INHERIT','SAME','INDEPENDENT')),
    constraint scope_activity_session_templates_location_chk check (location_continuity in ('INHERIT','SAME','INDEPENDENT')));

create table if not exists scope_activity_periodicities (
    definition_version_id uuid primary key references scope_event_definition_versions(definition_version_id) on delete restrict,
    periodicity_type text not null,interval_value integer,anchor_date date,anchor_year integer,occurrences_per_cycle integer,
    tolerance_before_days integer not null default 0,tolerance_after_days integer not null default 0,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_periodicities_type_chk check (periodicity_type in ('ANNUAL','TIMES_PER_YEAR','EVERY_N_MONTHS','EVERY_N_YEARS','ONE_OFF','CURRICULUM','ON_DEMAND')),
    constraint scope_activity_periodicities_interval_chk check (((periodicity_type in ('EVERY_N_MONTHS','EVERY_N_YEARS')) and interval_value>0)
      or ((periodicity_type not in ('EVERY_N_MONTHS','EVERY_N_YEARS')) and interval_value is null)),
    constraint scope_activity_periodicities_occurrences_chk check ((periodicity_type='TIMES_PER_YEAR' and occurrences_per_cycle>0)
      or (periodicity_type<>'TIMES_PER_YEAR' and (occurrences_per_cycle is null or occurrences_per_cycle>0))),
    constraint scope_activity_periodicities_anchor_chk check (periodicity_type<>'ONE_OFF' or anchor_date is not null or anchor_year is not null),
    constraint scope_activity_periodicities_tolerance_chk check (tolerance_before_days>=0 and tolerance_after_days>=0));

create table if not exists scope_annual_requirements (
    annual_requirement_id uuid primary key default gen_random_uuid(),year integer not null,
    definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    variant_code text,required_occurrences integer not null default 1,window_start date,window_end date,priority integer not null default 100,
    status text not null default 'DRAFT',source_type text not null default 'MANUAL',source_id text,
    supersedes_annual_requirement_id uuid references scope_annual_requirements(annual_requirement_id) on delete restrict,
    snapshot jsonb not null default '{}'::jsonb,fingerprint text,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),created_by text,updated_at timestamptz not null default now(),updated_by text,
    constraint scope_annual_requirements_status_chk check (status in ('DRAFT','READY','CANCELLED','SUPERSEDED')),
    constraint scope_annual_requirements_year_chk check (year between 2000 and 2200),
    constraint scope_annual_requirements_occurrences_chk check (required_occurrences>0),
    constraint scope_annual_requirements_window_chk check (window_end is null or window_start is null or window_start<=window_end),
    constraint scope_annual_requirements_fingerprint_chk check (fingerprint is null or fingerprint ~ '^[0-9a-f]{64}$'),
    constraint scope_annual_requirements_source_uk unique (year,source_type,source_id));

create index if not exists scope_annual_requirements_lookup_idx on scope_annual_requirements(year,status,definition_version_id);

create unique index if not exists scope_annual_requirements_current_uk on scope_annual_requirements(year,definition_version_id,coalesce(variant_code,'')) where status in ('DRAFT','READY');

create table if not exists scope_activity_public_bindings (
    public_binding_id uuid primary key default gen_random_uuid(),definition_version_id uuid references scope_event_definition_versions(definition_version_id) on delete restrict,
    annual_requirement_id uuid references scope_annual_requirements(annual_requirement_id) on delete restrict,
    public_definition_id uuid not null references scope_public_definitions(public_definition_id) on delete restrict,
    public_rule_version_id uuid references scope_public_rule_versions(public_rule_version_id) on delete restrict,
    group_code text not null default 'DEFAULT',operator text not null default 'UNION',binding_type text not null default 'TARGET',
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_public_bindings_owner_chk check (num_nonnulls(definition_version_id,annual_requirement_id)=1),
    constraint scope_activity_public_bindings_operator_chk check (operator in ('UNION','INTERSECTION','EXCLUSION')),
    constraint scope_activity_public_bindings_type_chk check (binding_type='TARGET'),
    constraint scope_activity_public_bindings_uk unique nulls not distinct (definition_version_id,annual_requirement_id,group_code,public_definition_id,binding_type));

create index if not exists scope_activity_public_bindings_requirement_idx on scope_activity_public_bindings(annual_requirement_id) where annual_requirement_id is not null;

create table if not exists scope_activity_qualification_bindings (
    qualification_binding_id uuid primary key default gen_random_uuid(),definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,binding_type text not null,mandatory boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_qualification_bindings_type_chk check (binding_type in ('PREREQUISITE','TAUGHT','RENEWED')),
    constraint scope_activity_qualification_bindings_uk unique (definition_version_id,competence_id,binding_type));

create table if not exists scope_activity_role_requirements (
    role_requirement_id uuid primary key default gen_random_uuid(),definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    role_definition_id uuid not null references scope_event_role_definitions(event_role_definition_id) on delete restrict,
    qualification_competence_id uuid references scope_competence_definitions(competence_id) on delete restrict,
    minimum_count integer not null default 0,recommended_count integer not null default 0,mandatory boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_role_requirements_counts_chk check (minimum_count>=0 and recommended_count>=minimum_count),
    constraint scope_activity_role_requirements_uk unique nulls not distinct (definition_version_id,role_definition_id,qualification_competence_id));

create table if not exists scope_location_categories (
    location_category_id uuid primary key default gen_random_uuid(),code text not null unique,label text not null,active boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_location_categories_code_chk check (length(trim(code))>0),constraint scope_location_categories_label_chk check (length(trim(label))>0));

create table if not exists scope_activity_location_requirements (
    location_requirement_id uuid primary key default gen_random_uuid(),definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    requirement_type text not null,lieu_id uuid references scope_lieux(lieu_id) on delete restrict,salle_id uuid references scope_salles_theorie(salle_id) on delete restrict,
    location_category_id uuid references scope_location_categories(location_category_id) on delete restrict,alternative_group text not null default 'DEFAULT',
    minimum_count integer not null default 1,mandatory boolean not null default true,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_location_requirements_type_chk check (requirement_type in ('EXACT_LOCATION','EXACT_ROOM','LOCATION_CATEGORY')),
    constraint scope_activity_location_requirements_target_chk check ((requirement_type='EXACT_LOCATION' and lieu_id is not null and salle_id is null and location_category_id is null)
      or (requirement_type='EXACT_ROOM' and lieu_id is null and salle_id is not null and location_category_id is null)
      or (requirement_type='LOCATION_CATEGORY' and lieu_id is null and salle_id is null and location_category_id is not null)),
    constraint scope_activity_location_requirements_count_chk check (minimum_count>0));

create table if not exists scope_activity_responsible_requirements (
    responsible_requirement_id uuid primary key default gen_random_uuid(),definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    responsable_fonction_code text references scope_responsable_fonctions(code) on delete restrict,
    role_definition_id uuid references scope_event_role_definitions(event_role_definition_id) on delete restrict,
    qualification_competence_id uuid references scope_competence_definitions(competence_id) on delete restrict,
    minimum_count integer not null default 1,recommended_count integer not null default 1,mandatory boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_responsible_requirements_target_chk check (num_nonnulls(responsable_fonction_code,role_definition_id,qualification_competence_id)>0),
    constraint scope_activity_responsible_requirements_counts_chk check (minimum_count>=0 and recommended_count>=minimum_count));

create table if not exists scope_activity_planning_constraints (
    planning_constraint_id uuid primary key default gen_random_uuid(),definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    session_template_id uuid,code text not null,constraint_type text not null,severity text not null,config jsonb not null,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_planning_constraints_session_fk foreign key (definition_version_id,session_template_id)
      references scope_activity_session_templates(definition_version_id,session_template_id) on delete restrict,
    constraint scope_activity_planning_constraints_type_chk check (constraint_type in ('DATE_WINDOW','MONTH','WEEKDAY','TIME_WINDOW','DURATION','SESSION_SPACING','SESSION_ORDER','CAPACITY','INCOMPATIBILITY','RESOURCE_AVAILABILITY')),
    constraint scope_activity_planning_constraints_severity_chk check (severity in ('HARD','SOFT','INFORMATIVE')),
    constraint scope_activity_planning_constraints_config_chk check (jsonb_typeof(config)='object' and case constraint_type
      when 'DATE_WINDOW' then config ?& array['start','end'] and config - array['start','end']='{}'::jsonb
        and jsonb_typeof(config->'start')='string' and jsonb_typeof(config->'end')='string'
        and config->>'start' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and config->>'end' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and config->>'start'<=config->>'end'
      when 'MONTH' then config ? 'months' and config - array['months']='{}'::jsonb and jsonb_typeof(config->'months')='array' and jsonb_array_length(config->'months')>0
      when 'WEEKDAY' then config ? 'weekdays' and config - array['weekdays']='{}'::jsonb and jsonb_typeof(config->'weekdays')='array' and jsonb_array_length(config->'weekdays')>0
      when 'TIME_WINDOW' then config ?& array['start','end'] and config - array['start','end']='{}'::jsonb
        and jsonb_typeof(config->'start')='string' and jsonb_typeof(config->'end')='string'
        and config->>'start' ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
        and config->>'end' ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$' and config->>'start'<config->>'end'
      when 'DURATION' then config ? 'minutes' and config - array['minutes']='{}'::jsonb
        and jsonb_typeof(config->'minutes')='number' and config->>'minutes' ~ '^[1-9][0-9]*$'
      when 'SESSION_SPACING' then config ? 'minimumMinutes' and config - array['minimumMinutes']='{}'::jsonb
        and jsonb_typeof(config->'minimumMinutes')='number' and config->>'minimumMinutes' ~ '^[1-9][0-9]*$'
      when 'SESSION_ORDER' then config ?& array['beforeSessionCode','afterSessionCode'] and config - array['beforeSessionCode','afterSessionCode']='{}'::jsonb
        and jsonb_typeof(config->'beforeSessionCode')='string' and jsonb_typeof(config->'afterSessionCode')='string'
        and length(trim(config->>'beforeSessionCode'))>0 and length(trim(config->>'afterSessionCode'))>0 and config->>'beforeSessionCode'<>config->>'afterSessionCode'
      when 'CAPACITY' then case when config ? 'maximum' and config - array['maximum','minimum']='{}'::jsonb
        and jsonb_typeof(config->'maximum')='number' and config->>'maximum' ~ '^[1-9][0-9]*$'
        and (not (config ? 'minimum') or (jsonb_typeof(config->'minimum')='number' and config->>'minimum' ~ '^[0-9]+$'))
        then not (config ? 'minimum') or (config->>'minimum')::numeric<=(config->>'maximum')::numeric else false end
      when 'INCOMPATIBILITY' then config ? 'activityCodes' and config - array['activityCodes']='{}'::jsonb
        and jsonb_typeof(config->'activityCodes')='array' and jsonb_array_length(config->'activityCodes')>0
      when 'RESOURCE_AVAILABILITY' then config ? 'resourceCodes' and config - array['resourceCodes']='{}'::jsonb
        and jsonb_typeof(config->'resourceCodes')='array' and jsonb_array_length(config->'resourceCodes')>0
      else false end),
    constraint scope_activity_planning_constraints_uk unique (definition_version_id,code));

create table if not exists scope_activity_statistical_contributions (
    statistical_contribution_id uuid primary key default gen_random_uuid(),definition_version_id uuid not null references scope_event_definition_versions(definition_version_id) on delete restrict,
    session_template_id uuid,statcom_code text not null references scope_statcom_referentiel(code) on delete restrict,
    mode text not null,value numeric(10,3),aggregation_rule text not null default 'PER_SESSION',metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_activity_statistical_contributions_session_fk foreign key (definition_version_id,session_template_id)
      references scope_activity_session_templates(definition_version_id,session_template_id) on delete restrict,
    constraint scope_activity_statistical_contributions_mode_chk check (mode in ('FULL_DURATION','FIXED_MINUTES','PERCENTAGE','MANUAL')),
    constraint scope_activity_statistical_contributions_value_chk check ((mode in ('FULL_DURATION','MANUAL') and value is null)
      or (mode='FIXED_MINUTES' and value>0) or (mode='PERCENTAGE' and value>0 and value<=100)),
    constraint scope_activity_statistical_contributions_aggregation_chk check (aggregation_rule in ('PER_SESSION','PER_OCCURRENCE','PER_PARTICIPANT')),
    constraint scope_activity_statistical_contributions_uk unique nulls not distinct (definition_version_id,session_template_id,statcom_code,aggregation_rule));

create table if not exists scope_planned_occurrences (
    planned_occurrence_id uuid primary key,annual_requirement_id uuid not null references scope_annual_requirements(annual_requirement_id) on delete restrict,
    occurrence_number integer not null,status text not null default 'GENERATED',preferred_window_start date,preferred_window_end date,
    metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_planned_occurrences_number_chk check (occurrence_number>0),
    constraint scope_planned_occurrences_status_chk check (status in ('GENERATED','UNDER_REVIEW','APPROVED','REJECTED','PUBLISHED')),
    constraint scope_planned_occurrences_window_chk check (preferred_window_end is null or preferred_window_start is null or preferred_window_start<=preferred_window_end),
    constraint scope_planned_occurrences_uk unique (annual_requirement_id,occurrence_number));

create table if not exists scope_planned_occurrence_sessions (
    planned_occurrence_session_id uuid primary key,planned_occurrence_id uuid not null references scope_planned_occurrences(planned_occurrence_id) on delete restrict,
    session_template_id uuid not null references scope_activity_session_templates(session_template_id) on delete restrict,
    sequence integer not null,status text not null default 'GENERATED',preferred_date date,preferred_start_time time,preferred_end_time time,
    preferred_window_start date,preferred_window_end date,metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
    constraint scope_planned_occurrence_sessions_sequence_chk check (sequence>0),
    constraint scope_planned_occurrence_sessions_status_chk check (status in ('GENERATED','UNDER_REVIEW','APPROVED','REJECTED','PUBLISHED')),
    constraint scope_planned_occurrence_sessions_window_chk check (preferred_window_end is null or preferred_window_start is null or preferred_window_start<=preferred_window_end),
    constraint scope_planned_occurrence_sessions_uk unique (planned_occurrence_id,sequence),
    constraint scope_planned_occurrence_sessions_template_uk unique (planned_occurrence_id,session_template_id));

alter table scope_quo_vadis_obligations add column if not exists planned_occurrence_id uuid references scope_planned_occurrences(planned_occurrence_id) on delete restrict;

alter table scope_quo_vadis_proposals add column if not exists planned_occurrence_session_id uuid references scope_planned_occurrence_sessions(planned_occurrence_session_id) on delete restrict;

create unique index if not exists scope_qv_obligations_planned_occurrence_uk on scope_quo_vadis_obligations(planned_occurrence_id) where planned_occurrence_id is not null;

create unique index if not exists scope_qv_proposals_planned_session_uk on scope_quo_vadis_proposals(planned_occurrence_session_id) where planned_occurrence_session_id is not null;

create or replace function scope_activity_definition_version_guard()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' and old.status='ACTIVE' and old.fingerprint is not null then raise exception 'active C4 activity definition versions cannot be deleted'; end if;
  if tg_op='UPDATE' and old.status='ACTIVE' and old.fingerprint is not null and (
    new.definition_id is distinct from old.definition_id or new.version_code is distinct from old.version_code or
    new.valid_from is distinct from old.valid_from or new.valid_to is distinct from old.valid_to or
    new.mode_organisation is distinct from old.mode_organisation or new.session_count is distinct from old.session_count or
    new.policy_version_id is distinct from old.policy_version_id or new.population_rule is distinct from old.population_rule or
    new.numbering_pattern is distinct from old.numbering_pattern or new.description is distinct from old.description or
    new.fingerprint is distinct from old.fingerprint
  ) then raise exception 'active activity definition versions are semantically immutable'; end if;
  if tg_op='UPDATE' and old.fingerprint is not null and not ((old.status='DRAFT' and new.status in ('DRAFT','ACTIVE')) or
    (old.status='ACTIVE' and new.status in ('ACTIVE','RETIRED')) or (old.status='RETIRED' and new.status='RETIRED'))
    then raise exception 'invalid activity definition version status transition'; end if;
  if tg_op='UPDATE' and old.status='DRAFT' and new.status='ACTIVE'
    and (new.fingerprint is null or new.fingerprint !~ '^[0-9a-f]{64}$')
    then raise exception 'active activity definition version requires a canonical fingerprint'; end if;
  if tg_op='UPDATE' and old.status='DRAFT' and new.status='ACTIVE' then
    if (select count(*) from scope_activity_domain_bindings where definition_version_id=new.definition_version_id and binding_role='PRIMARY')<>1
      then raise exception 'active activity definition version requires one primary domain'; end if;
    if not exists (select 1 from scope_activity_session_templates where definition_version_id=new.definition_version_id)
      then raise exception 'active activity definition version requires a session template'; end if;
    if not exists (select 1 from scope_activity_periodicities where definition_version_id=new.definition_version_id)
      then raise exception 'active activity definition version requires periodicity'; end if;
    if exists (select 1 from scope_activity_session_templates child join scope_activity_session_templates parent
      on parent.session_template_id=child.depends_on_session_template_id
      where child.definition_version_id=new.definition_version_id and parent.sequence>=child.sequence)
      then raise exception 'session dependencies must point to an earlier sequence'; end if;
    if exists (select 1 from scope_activity_planning_constraints constraint_row
      where constraint_row.definition_version_id=new.definition_version_id and constraint_row.constraint_type='SESSION_ORDER'
        and (not exists (select 1 from scope_activity_session_templates session_row where session_row.definition_version_id=new.definition_version_id
              and upper(session_row.code)=upper(constraint_row.config->>'beforeSessionCode'))
          or not exists (select 1 from scope_activity_session_templates session_row where session_row.definition_version_id=new.definition_version_id
              and upper(session_row.code)=upper(constraint_row.config->>'afterSessionCode'))))
      then raise exception 'session order constraints must reference templates from the same activity definition version'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists scope_activity_definition_version_guard_trg on scope_event_definition_versions;
create trigger scope_activity_definition_version_guard_trg before insert or update or delete on scope_event_definition_versions
for each row execute function scope_activity_definition_version_guard();

create or replace function scope_activity_version_child_guard()
returns trigger language plpgsql as $$ declare owner_id uuid; owner_status text; begin
  if tg_op='DELETE' then owner_id=old.definition_version_id; else owner_id=new.definition_version_id; end if;
  select status into owner_status from scope_event_definition_versions where definition_version_id=owner_id;
  if owner_status='ACTIVE' then raise exception 'children of an active activity definition version are immutable'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create or replace function scope_annual_requirement_guard()
returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' then raise exception 'annual requirement history is append-only'; end if;
  if tg_op='UPDATE' and not ((old.status='DRAFT' and new.status in ('DRAFT','READY','CANCELLED')) or
    (old.status='READY' and new.status in ('READY','SUPERSEDED','CANCELLED')) or
    (old.status='CANCELLED' and new.status='CANCELLED') or (old.status='SUPERSEDED' and new.status='SUPERSEDED'))
    then raise exception 'invalid annual requirement status transition'; end if;
  if tg_op='UPDATE' and old.status='READY' and (
    new.year is distinct from old.year or new.definition_version_id is distinct from old.definition_version_id or
    new.variant_code is distinct from old.variant_code or new.required_occurrences is distinct from old.required_occurrences or
    new.window_start is distinct from old.window_start or new.window_end is distinct from old.window_end or
    new.priority is distinct from old.priority or new.source_type is distinct from old.source_type or
    new.source_id is distinct from old.source_id or new.supersedes_annual_requirement_id is distinct from old.supersedes_annual_requirement_id or
    new.snapshot is distinct from old.snapshot or new.fingerprint is distinct from old.fingerprint
  ) then raise exception 'ready annual requirements are semantically immutable'; end if;
  if new.status='READY' then
    if jsonb_typeof(new.snapshot)<>'object' or new.snapshot='{}'::jsonb or new.fingerprint is null or new.fingerprint !~ '^[0-9a-f]{64}$'
      then raise exception 'ready annual requirement requires snapshot and fingerprint'; end if;
    if exists (select 1 from scope_activity_public_bindings binding where binding.annual_requirement_id=new.annual_requirement_id
      and binding.public_rule_version_id is null) then raise exception 'ready annual requirement has an unpinned public binding'; end if;
    if exists (select 1 from scope_activity_public_bindings binding
      join scope_public_rule_versions version on version.public_rule_version_id=binding.public_rule_version_id
      where binding.annual_requirement_id=new.annual_requirement_id
        and (version.public_definition_id<>binding.public_definition_id or version.status<>'ACTIVE'
          or (version.valid_from is not null and version.valid_from>coalesce(new.window_start,make_date(new.year,1,1)))
          or (version.valid_to is not null and version.valid_to<coalesce(new.window_start,make_date(new.year,1,1)))))
      then raise exception 'ready annual requirement has an invalid public rule version'; end if;
    if not exists (select 1 from scope_event_definition_versions version
      where version.definition_version_id=new.definition_version_id and version.status='ACTIVE'
        and version.fingerprint ~ '^[0-9a-f]{64}$')
      then raise exception 'ready annual requirement requires an active activity definition version'; end if;
  end if;
  return new;
end $$;
drop trigger if exists scope_annual_requirement_guard_trg on scope_annual_requirements;
create trigger scope_annual_requirement_guard_trg before insert or update or delete on scope_annual_requirements
for each row execute function scope_annual_requirement_guard();

create or replace function scope_activity_public_binding_guard()
returns trigger language plpgsql as $$ declare version_id uuid; requirement_id uuid; version_status text; requirement_status text; begin
  if tg_op='DELETE' then version_id=old.definition_version_id; requirement_id=old.annual_requirement_id;
  else version_id=new.definition_version_id; requirement_id=new.annual_requirement_id; end if;
  if version_id is not null then
    select status into version_status from scope_event_definition_versions
      where definition_version_id=version_id;
    if version_status='ACTIVE' then raise exception 'public bindings of an active activity definition version are immutable'; end if;
  else
    select status into requirement_status from scope_annual_requirements
      where annual_requirement_id=requirement_id;
    if requirement_status<>'DRAFT' then raise exception 'public bindings of a non-draft annual requirement are immutable'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists scope_activity_public_binding_guard_trg on scope_activity_public_bindings;
create trigger scope_activity_public_binding_guard_trg before insert or update or delete on scope_activity_public_bindings
for each row execute function scope_activity_public_binding_guard();

create or replace function scope_planned_occurrence_session_guard()
returns trigger language plpgsql as $$ declare expected_version_id uuid; template_version_id uuid; template_sequence integer; begin
  select requirement.definition_version_id into expected_version_id
    from scope_planned_occurrences occurrence join scope_annual_requirements requirement
      on requirement.annual_requirement_id=occurrence.annual_requirement_id
    where occurrence.planned_occurrence_id=new.planned_occurrence_id;
  select definition_version_id,sequence into template_version_id,template_sequence
    from scope_activity_session_templates where session_template_id=new.session_template_id;
  if expected_version_id is null or template_version_id is distinct from expected_version_id
    then raise exception 'planned session template does not belong to the annual requirement activity version'; end if;
  if new.sequence<>template_sequence then raise exception 'planned session sequence must match its template'; end if;
  return new;
end $$;
drop trigger if exists scope_planned_occurrence_session_guard_trg on scope_planned_occurrence_sessions;
create trigger scope_planned_occurrence_session_guard_trg before insert or update on scope_planned_occurrence_sessions
for each row execute function scope_planned_occurrence_session_guard();

drop trigger if exists scope_activity_domain_bindings_immutable_trg on scope_activity_domain_bindings; create trigger scope_activity_domain_bindings_immutable_trg before insert or update or delete on scope_activity_domain_bindings for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_session_templates_immutable_trg on scope_activity_session_templates; create trigger scope_activity_session_templates_immutable_trg before insert or update or delete on scope_activity_session_templates for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_periodicities_immutable_trg on scope_activity_periodicities; create trigger scope_activity_periodicities_immutable_trg before insert or update or delete on scope_activity_periodicities for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_qualification_bindings_immutable_trg on scope_activity_qualification_bindings; create trigger scope_activity_qualification_bindings_immutable_trg before insert or update or delete on scope_activity_qualification_bindings for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_role_requirements_immutable_trg on scope_activity_role_requirements; create trigger scope_activity_role_requirements_immutable_trg before insert or update or delete on scope_activity_role_requirements for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_location_requirements_immutable_trg on scope_activity_location_requirements; create trigger scope_activity_location_requirements_immutable_trg before insert or update or delete on scope_activity_location_requirements for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_responsible_requirements_immutable_trg on scope_activity_responsible_requirements; create trigger scope_activity_responsible_requirements_immutable_trg before insert or update or delete on scope_activity_responsible_requirements for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_planning_constraints_immutable_trg on scope_activity_planning_constraints; create trigger scope_activity_planning_constraints_immutable_trg before insert or update or delete on scope_activity_planning_constraints for each row execute function scope_activity_version_child_guard();

drop trigger if exists scope_activity_statistical_contributions_immutable_trg on scope_activity_statistical_contributions; create trigger scope_activity_statistical_contributions_immutable_trg before insert or update or delete on scope_activity_statistical_contributions for each row execute function scope_activity_version_child_guard();

do $$ declare table_name text; role_name text; begin
  foreach table_name in array array[
    'scope_activity_domain_bindings','scope_activity_session_templates','scope_activity_periodicities','scope_annual_requirements',
    'scope_activity_public_bindings','scope_activity_qualification_bindings','scope_activity_role_requirements','scope_location_categories',
    'scope_activity_location_requirements','scope_activity_responsible_requirements','scope_activity_planning_constraints',
    'scope_activity_statistical_contributions','scope_planned_occurrences','scope_planned_occurrence_sessions'
  ] loop
    execute format('alter table %I enable row level security',table_name);
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname=role_name) then execute format('revoke all on %I from %I',table_name,role_name); end if;
    end loop;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version) values ('scope-annual-catalog-c4-b') on conflict (version) do nothing;

commit;
