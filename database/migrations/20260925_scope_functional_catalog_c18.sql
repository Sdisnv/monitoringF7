-- C18: permanent catalogue definitions and usable annual programming.
begin;

select pg_advisory_xact_lock(671902296);

create table if not exists scope_activity_functional_profiles (
  definition_version_id uuid primary key references scope_event_definition_versions(definition_version_id) on delete restrict,
  recurrence_kind text not null default 'NON_RECURRENT',default_occurrences integer not null default 1,default_sites text[] not null default '{}',
  default_public_codes text[] not null default '{}',calendar_rules jsonb not null default '{}'::jsonb,
  priority integer not null default 100,permutation_allowed boolean not null default false,day_exclusive boolean not null default false,
  indispensable_role_codes text[] not null default '{}',resource_codes text[] not null default '{}',
  rule_mode text not null default 'GENERAL',custom_rule jsonb,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint scope_activity_functional_profiles_recurrence_chk check (recurrence_kind in ('RECURRENT','NON_RECURRENT')),
  constraint scope_activity_functional_profiles_occurrences_chk check (default_occurrences>0),
  constraint scope_activity_functional_profiles_priority_chk check (priority>0),
  constraint scope_activity_functional_profiles_rule_chk check (rule_mode in ('GENERAL','CUSTOM') and (rule_mode='GENERAL' or jsonb_typeof(custom_rule)='object'))
);
alter table scope_activity_functional_profiles add column if not exists default_public_codes text[] not null default '{}';
alter table scope_activity_functional_profiles add column if not exists calendar_rules jsonb not null default '{}'::jsonb;
alter table scope_activity_functional_profiles add column if not exists priority integer not null default 100;
alter table scope_activity_functional_profiles add column if not exists permutation_allowed boolean not null default false;
alter table scope_activity_functional_profiles add column if not exists day_exclusive boolean not null default false;
alter table scope_activity_functional_profiles add column if not exists indispensable_role_codes text[] not null default '{}';
alter table scope_activity_functional_profiles add column if not exists resource_codes text[] not null default '{}';

create table if not exists scope_catalog_convergence_links (
  convergence_link_id uuid primary key default gen_random_uuid(),source_definition_id uuid not null references scope_event_definitions(definition_id) on delete restrict,
  target_definition_id uuid references scope_event_definitions(definition_id) on delete restrict,action text not null,confidence text not null,
  evidence jsonb not null,source_snapshot jsonb not null,source_sha256 text,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),created_by text,
  constraint scope_catalog_convergence_links_action_chk check (action in ('MERGE_SAFE','KEEP_DISTINCT','REVIEW_REQUIRED')),
  constraint scope_catalog_convergence_links_confidence_chk check (confidence in ('HIGH','MEDIUM','LOW')),
  constraint scope_catalog_convergence_links_target_chk check (action<>'MERGE_SAFE' or target_definition_id is not null),
  constraint scope_catalog_convergence_links_source_uk unique (source_definition_id)
);
create index if not exists scope_catalog_convergence_links_target_idx on scope_catalog_convergence_links(target_definition_id,action);

create table if not exists scope_annual_program_entries (
  annual_program_entry_id uuid primary key default gen_random_uuid(),annual_requirement_id uuid not null unique references scope_annual_requirements(annual_requirement_id) on delete restrict,
  program_state text not null default 'ACTIVE',extraordinary boolean not null default false,occurrence_override integer,site_codes text[] not null default '{}',
  config_override jsonb not null default '{}'::jsonb,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),created_by text,updated_at timestamptz not null default now(),updated_by text,
  constraint scope_annual_program_entries_state_chk check (program_state in ('ACTIVE','INACTIVE')),
  constraint scope_annual_program_entries_occurrences_chk check (occurrence_override is null or occurrence_override>0)
);
create index if not exists scope_annual_program_entries_state_idx on scope_annual_program_entries(program_state,annual_requirement_id);

create table if not exists scope_planned_site_slots (
  planned_site_slot_id uuid primary key,planned_occurrence_session_id uuid not null references scope_planned_occurrence_sessions(planned_occurrence_session_id) on delete restrict,
  site_code text not null,preferred_date date,preferred_start_time time,preferred_end_time time,location_label text,responsible_label text,
  label_complement text,final_label text,
  status text not null default 'PROPOSED',public_codes text[] not null default '{}',role_codes text[] not null default '{}',
  resource_codes text[] not null default '{}',fixed_date boolean not null default false,day_exclusive boolean not null default false,
  permutation_allowed boolean not null default false,priority integer not null default 100,manual_lock boolean not null default false,
  validation_status text not null default 'DRAFT',metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint scope_planned_site_slots_status_chk check (status in ('PROPOSED','CONFIRMED','VALIDATED','ARBITRATION_REQUIRED','DISABLED')),
  constraint scope_planned_site_slots_validation_chk check (validation_status in ('DRAFT','ARBITRATION_REQUIRED','VALIDATED','LOCKED')),
  constraint scope_planned_site_slots_priority_chk check (priority>0),
  constraint scope_planned_site_slots_time_chk check (preferred_end_time is null or preferred_start_time is null or preferred_start_time<preferred_end_time),
  constraint scope_planned_site_slots_uk unique (planned_occurrence_session_id,site_code)
);
alter table scope_planned_site_slots add column if not exists label_complement text;
alter table scope_planned_site_slots add column if not exists final_label text;
alter table scope_planned_site_slots add column if not exists role_codes text[] not null default '{}';
alter table scope_planned_site_slots add column if not exists resource_codes text[] not null default '{}';
alter table scope_planned_site_slots add column if not exists fixed_date boolean not null default false;
alter table scope_planned_site_slots add column if not exists day_exclusive boolean not null default false;
alter table scope_planned_site_slots add column if not exists permutation_allowed boolean not null default false;
alter table scope_planned_site_slots add column if not exists priority integer not null default 100;
alter table scope_planned_site_slots add column if not exists manual_lock boolean not null default false;
alter table scope_planned_site_slots add column if not exists validation_status text not null default 'DRAFT';
create index if not exists scope_planned_site_slots_schedule_idx on scope_planned_site_slots(preferred_date,preferred_start_time,preferred_end_time) where status<>'DISABLED';

-- JSP: ten annual realizations of one permanent definition, independently scheduled for G1/C1/B1.
insert into scope_activity_functional_profiles as profile(definition_version_id,recurrence_kind,default_occurrences,default_sites,rule_mode,metadata)
select v.definition_version_id,'RECURRENT',10,array['G1','C1','B1'],'GENERAL','{"source":"C18","evidence":"QUO_VADIS_2026_JSP_1_10"}'::jsonb
from scope_event_definitions d join scope_event_definition_versions v on v.definition_id=d.definition_id and v.status='ACTIVE'
where d.code='JSP-EXERCICE'
on conflict (definition_version_id) do update set recurrence_kind='RECURRENT',default_occurrences=10,default_sites=array['G1','C1','B1'],updated_at=now()
where (profile.recurrence_kind,profile.default_occurrences,profile.default_sites) is distinct from ('RECURRENT',10,array['G1','C1','B1']::text[]);

insert into scope_catalog_convergence_links(source_definition_id,target_definition_id,action,confidence,evidence,source_snapshot,source_sha256,metadata,created_by)
select source.definition_id,target.definition_id,'MERGE_SAFE','HIGH',
  '{"type":"RECURRENT_OCCURRENCES","numbers":"1-10","sameDomain":"JSP","samePublic":"JSP-GEN"}'::jsonb,
  jsonb_build_object('code',source.code,'label',source.label,'metadata',source.metadata,'versionMetadata',source_version.metadata),source_version.metadata->>'sourceSha256','{"source":"C18"}'::jsonb,'C18'
from scope_event_definitions source join scope_event_definition_versions source_version on source_version.definition_id=source.definition_id and source_version.status='ACTIVE'
cross join scope_event_definitions target
where source.metadata->>'source'='C15_QUO_VADIS_2026' and source.label ~ '^Exercice JSP ([1-9]|10)$' and target.code='JSP-EXERCICE'
on conflict (source_definition_id) do nothing;

update scope_event_definitions set status='ARCHIVE',metadata=metadata || '{"convergedBy":"C18","targetCode":"JSP-EXERCICE"}'::jsonb,updated_at=now()
where metadata->>'source'='C15_QUO_VADIS_2026' and label ~ '^Exercice JSP ([1-9]|10)$' and code<>'JSP-EXERCICE'
  and (status<>'ARCHIVE' or metadata->>'convergedBy' is distinct from 'C18' or metadata->>'targetCode' is distinct from 'JSP-EXERCICE');

-- Strongly evidenced multi-session activity: same domain, publics, Stat.Com, theme and continuous 1.1-1.6 sequence.
insert into scope_event_definitions(code,label,domain,description,status,metadata,family_code,activity_type)
values ('DPS-FORMATION-GROUPEE','Formation groupée','DPS','Formation permanente composée de six séances obligatoires.','ACTIF',
  '{"source":"C18_CONVERGENCE","sourceLabels":["Formation groupée 1.1","Formation groupée 1.2","Formation groupée 1.3","Formation groupée 1.4","Formation groupée 1.5","Formation groupée 1.6"],"confidence":"HIGH"}'::jsonb,'FOCO','TRAINING')
on conflict (code) do nothing;

insert into scope_event_definition_versions(definition_id,version_code,valid_from,mode_organisation,session_count,population_rule,active,metadata,status,description,fingerprint)
select definition_id,'C18-V1','2027-01-01','MULTI_SESSION',6,'{}'::jsonb,true,'{"source":"C18_CONVERGENCE","ruleMode":"GENERAL"}'::jsonb,
  'DRAFT','Six séances 1.1 à 1.6 liées dans une seule définition.','ed8b7ab53c9c366294a13a230a55e875f21d8b03b33d81152a0b9f59eaaf844e'
from scope_event_definitions where code='DPS-FORMATION-GROUPEE'
on conflict (definition_id,version_code) do nothing;

insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata)
select v.definition_version_id,'DPS','PRIMARY','{"source":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='DPS-FORMATION-GROUPEE' and v.version_code='C18-V1' and v.status='DRAFT'
on conflict (definition_version_id,domain_code) do nothing;

insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,public_continuity,location_continuity,metadata)
select v.definition_version_id,format('1.%s',sequence),sequence,format('Séance 1.%s',sequence),true,120,'SAME','INDEPENDENT',
  jsonb_build_object('source','C18_CONVERGENCE','sourceLabel',format('Formation groupée 1.%s',sequence))
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id cross join generate_series(1,6) sequence
where d.code='DPS-FORMATION-GROUPEE' and v.version_code='C18-V1' and v.status='DRAFT'
on conflict (definition_version_id,code) do nothing;

insert into scope_activity_periodicities(definition_version_id,periodicity_type,metadata)
select v.definition_version_id,'ANNUAL','{"source":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='DPS-FORMATION-GROUPEE' and v.version_code='C18-V1' and v.status='DRAFT'
on conflict (definition_version_id) do nothing;

insert into scope_activity_public_bindings(definition_version_id,public_definition_id,public_rule_version_id,group_code,operator,binding_type,metadata)
select target.definition_version_id,b.public_definition_id,b.public_rule_version_id,b.group_code,b.operator,b.binding_type,
  b.metadata || '{"copiedBy":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions target join scope_event_definitions td on td.definition_id=target.definition_id
cross join lateral (select sv.definition_version_id from scope_event_definitions sd join scope_event_definition_versions sv on sv.definition_id=sd.definition_id and sv.status='ACTIVE'
  where sd.label='Formation groupée 1.1' and sd.metadata->>'source'='C15_QUO_VADIS_2026' limit 1) source
join scope_activity_public_bindings b on b.definition_version_id=source.definition_version_id
where td.code='DPS-FORMATION-GROUPEE' and target.version_code='C18-V1' and target.status='DRAFT'
on conflict on constraint scope_activity_public_bindings_uk do nothing;

insert into scope_activity_qualification_bindings(definition_version_id,competence_id,binding_type,mandatory,metadata)
select target.definition_version_id,b.competence_id,b.binding_type,b.mandatory,b.metadata || '{"copiedBy":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions target join scope_event_definitions td on td.definition_id=target.definition_id
cross join lateral (select sv.definition_version_id from scope_event_definitions sd join scope_event_definition_versions sv on sv.definition_id=sd.definition_id and sv.status='ACTIVE'
  where sd.label='Formation groupée 1.1' and sd.metadata->>'source'='C15_QUO_VADIS_2026' limit 1) source
join scope_activity_qualification_bindings b on b.definition_version_id=source.definition_version_id
where td.code='DPS-FORMATION-GROUPEE' and target.version_code='C18-V1' and target.status='DRAFT'
on conflict (definition_version_id,competence_id,binding_type) do nothing;

insert into scope_activity_statistical_contributions(definition_version_id,session_template_id,statcom_code,mode,value,aggregation_rule,metadata)
select target.definition_version_id,null,b.statcom_code,b.mode,b.value,b.aggregation_rule,b.metadata || '{"copiedBy":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions target join scope_event_definitions td on td.definition_id=target.definition_id
cross join lateral (select sv.definition_version_id from scope_event_definitions sd join scope_event_definition_versions sv on sv.definition_id=sd.definition_id and sv.status='ACTIVE'
  where sd.label='Formation groupée 1.1' and sd.metadata->>'source'='C15_QUO_VADIS_2026' limit 1) source
join scope_activity_statistical_contributions b on b.definition_version_id=source.definition_version_id
where td.code='DPS-FORMATION-GROUPEE' and target.version_code='C18-V1' and target.status='DRAFT'
on conflict on constraint scope_activity_statistical_contributions_uk do nothing;

insert into scope_activity_functional_profiles(definition_version_id,recurrence_kind,default_occurrences,default_sites,rule_mode,metadata)
select v.definition_version_id,'RECURRENT',1,array['G1'],'GENERAL','{"source":"C18_CONVERGENCE","multiSession":true}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='DPS-FORMATION-GROUPEE' and v.version_code='C18-V1'
on conflict (definition_version_id) do nothing;

update scope_event_definition_versions set status='ACTIVE',updated_at=now()
where definition_id=(select definition_id from scope_event_definitions where code='DPS-FORMATION-GROUPEE') and version_code='C18-V1' and status='DRAFT';

insert into scope_catalog_convergence_links(source_definition_id,target_definition_id,action,confidence,evidence,source_snapshot,source_sha256,metadata,created_by)
select source.definition_id,target.definition_id,'MERGE_SAFE','HIGH',
  '{"type":"MULTI_SESSION","sequence":"1.1-1.6","sameDomain":true,"samePublics":true,"sameStatCom":true,"sameTheme":true}'::jsonb,
  jsonb_build_object('code',source.code,'label',source.label,'metadata',source.metadata,'versionMetadata',source_version.metadata),source_version.metadata->>'sourceSha256','{"source":"C18"}'::jsonb,'C18'
from scope_event_definitions source join scope_event_definition_versions source_version on source_version.definition_id=source.definition_id and source_version.status='ACTIVE'
cross join scope_event_definitions target
where source.metadata->>'source'='C15_QUO_VADIS_2026' and source.label ~ '^Formation groupée 1\.[1-6]$' and target.code='DPS-FORMATION-GROUPEE'
on conflict (source_definition_id) do nothing;

update scope_event_definitions set status='ARCHIVE',metadata=metadata || '{"convergedBy":"C18","targetCode":"DPS-FORMATION-GROUPEE"}'::jsonb,updated_at=now()
where metadata->>'source'='C15_QUO_VADIS_2026' and label ~ '^Formation groupée 1\.[1-6]$'
  and (status<>'ARCHIVE' or metadata->>'convergedBy' is distinct from 'C18' or metadata->>'targetCode' is distinct from 'DPS-FORMATION-GROUPEE');

-- Strongly evidenced PR 1 multi-session activity: 1.1-1.6 share PR domain, PAPR public/specialization, 011PR Stat.Com and Base source theme.
insert into scope_event_definitions(code,label,domain,description,status,metadata,family_code,activity_type)
values ('PR-EXERCICE-1','Exercice PR','PR','Exercice PR composé de six séances obligatoires pour chaque occurrence.','ACTIF',
  '{"source":"C18_CONVERGENCE","sourceLabels":["Exercice PR 1.1","Exercice PR 1.2","Exercice PR 1.3","Exercice PR 1.4","Exercice PR 1.5","Exercice PR 1.6"],"confidence":"HIGH"}'::jsonb,'PR','EXERCISE')
on conflict (code) do nothing;

update scope_event_definitions set label='Exercice PR',description='Exercice PR composé de six séances obligatoires pour chaque occurrence.',updated_at=now()
where code='PR-EXERCICE-1' and metadata->>'source'='C18_CONVERGENCE'
  and (label,description) is distinct from ('Exercice PR','Exercice PR composé de six séances obligatoires pour chaque occurrence.');

insert into scope_event_definition_versions(definition_id,version_code,valid_from,mode_organisation,session_count,population_rule,active,metadata,status,description,fingerprint)
select definition_id,'C18-V1','2027-01-01','MULTI_SESSION',6,'{}'::jsonb,true,'{"source":"C18_CONVERGENCE","ruleMode":"GENERAL","sourceSeries":"Exercice PR 1.1-1.6"}'::jsonb,
  'DRAFT','Six séances PR 1.1 à PR 1.6 liées dans une seule définition.','8e446d9c3c6a394d46fd70641aa491e4c65d62ba54190feae21fe60d6fc0d4cd'
from scope_event_definitions where code='PR-EXERCICE-1'
on conflict (definition_id,version_code) do nothing;

insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata)
select v.definition_version_id,'PR','PRIMARY','{"source":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='PR-EXERCICE-1' and v.version_code='C18-V1' and v.status='DRAFT'
on conflict (definition_version_id,domain_code) do nothing;

insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,public_continuity,location_continuity,metadata)
select v.definition_version_id,format('S%s',sequence),sequence,format('Séance %s',sequence),true,120,'SAME','INDEPENDENT',
  jsonb_build_object('source','C18_CONVERGENCE','sourceLabel',format('Exercice PR 1.%s',sequence))
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id cross join generate_series(1,6) sequence
where d.code='PR-EXERCICE-1' and v.version_code='C18-V1' and v.status='DRAFT'
on conflict (definition_version_id,code) do nothing;

insert into scope_activity_periodicities(definition_version_id,periodicity_type,metadata)
select v.definition_version_id,'ANNUAL','{"source":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='PR-EXERCICE-1' and v.version_code='C18-V1' and v.status='DRAFT'
on conflict (definition_version_id) do nothing;

insert into scope_activity_public_bindings(definition_version_id,public_definition_id,public_rule_version_id,group_code,operator,binding_type,metadata)
select target.definition_version_id,b.public_definition_id,b.public_rule_version_id,b.group_code,b.operator,b.binding_type,
  b.metadata || '{"copiedBy":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions target join scope_event_definitions td on td.definition_id=target.definition_id
cross join lateral (select sv.definition_version_id from scope_event_definitions sd join scope_event_definition_versions sv on sv.definition_id=sd.definition_id and sv.status='ACTIVE'
  where sd.label='Exercice PR 1.1' and sd.metadata->>'source'='C15_QUO_VADIS_2026' limit 1) source
join scope_activity_public_bindings b on b.definition_version_id=source.definition_version_id
where td.code='PR-EXERCICE-1' and target.version_code='C18-V1' and target.status='DRAFT'
on conflict on constraint scope_activity_public_bindings_uk do nothing;

insert into scope_activity_qualification_bindings(definition_version_id,competence_id,binding_type,mandatory,metadata)
select target.definition_version_id,b.competence_id,b.binding_type,b.mandatory,b.metadata || '{"copiedBy":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions target join scope_event_definitions td on td.definition_id=target.definition_id
cross join lateral (select sv.definition_version_id from scope_event_definitions sd join scope_event_definition_versions sv on sv.definition_id=sd.definition_id and sv.status='ACTIVE'
  where sd.label='Exercice PR 1.1' and sd.metadata->>'source'='C15_QUO_VADIS_2026' limit 1) source
join scope_activity_qualification_bindings b on b.definition_version_id=source.definition_version_id
where td.code='PR-EXERCICE-1' and target.version_code='C18-V1' and target.status='DRAFT'
on conflict (definition_version_id,competence_id,binding_type) do nothing;

insert into scope_activity_statistical_contributions(definition_version_id,session_template_id,statcom_code,mode,value,aggregation_rule,metadata)
select target.definition_version_id,null,b.statcom_code,b.mode,b.value,b.aggregation_rule,b.metadata || '{"copiedBy":"C18_CONVERGENCE"}'::jsonb
from scope_event_definition_versions target join scope_event_definitions td on td.definition_id=target.definition_id
cross join lateral (select sv.definition_version_id from scope_event_definitions sd join scope_event_definition_versions sv on sv.definition_id=sd.definition_id and sv.status='ACTIVE'
  where sd.label='Exercice PR 1.1' and sd.metadata->>'source'='C15_QUO_VADIS_2026' limit 1) source
join scope_activity_statistical_contributions b on b.definition_version_id=source.definition_version_id
where td.code='PR-EXERCICE-1' and target.version_code='C18-V1' and target.status='DRAFT'
on conflict on constraint scope_activity_statistical_contributions_uk do nothing;

insert into scope_activity_functional_profiles(definition_version_id,recurrence_kind,default_occurrences,default_sites,rule_mode,metadata)
select v.definition_version_id,'RECURRENT',1,array['G1'],'GENERAL','{"source":"C18_CONVERGENCE","multiSession":true}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='PR-EXERCICE-1' and v.version_code='C18-V1'
on conflict (definition_version_id) do nothing;

update scope_event_definition_versions set status='ACTIVE',updated_at=now()
where definition_id=(select definition_id from scope_event_definitions where code='PR-EXERCICE-1') and version_code='C18-V1' and status='DRAFT';

insert into scope_catalog_convergence_links(source_definition_id,target_definition_id,action,confidence,evidence,source_snapshot,source_sha256,metadata,created_by)
select source.definition_id,target.definition_id,'MERGE_SAFE','HIGH',
  '{"type":"MULTI_SESSION","sequence":"1.1-1.6","sameDomain":"PR","samePublics":true,"sameStatCom":"011PR","sameSpecialization":"PAPR","sameTheme":"Base"}'::jsonb,
  jsonb_build_object('code',source.code,'label',source.label,'metadata',source.metadata,'versionMetadata',source_version.metadata),source_version.metadata->>'sourceSha256','{"source":"C18"}'::jsonb,'C18'
from scope_event_definitions source join scope_event_definition_versions source_version on source_version.definition_id=source.definition_id and source_version.status='ACTIVE'
cross join scope_event_definitions target
where source.metadata->>'source'='C15_QUO_VADIS_2026' and source.label ~ '^Exercice PR 1\.[1-6]$' and target.code='PR-EXERCICE-1'
on conflict (source_definition_id) do nothing;

update scope_event_definitions set status='ARCHIVE',metadata=metadata || '{"convergedBy":"C18","targetCode":"PR-EXERCICE-1"}'::jsonb,updated_at=now()
where metadata->>'source'='C15_QUO_VADIS_2026' and label ~ '^Exercice PR 1\.[1-6]$'
  and (status<>'ARCHIVE' or metadata->>'convergedBy' is distinct from 'C18' or metadata->>'targetCode' is distinct from 'PR-EXERCICE-1');

do $$ declare table_name text; role_name text; begin
  foreach table_name in array array['scope_activity_functional_profiles','scope_catalog_convergence_links','scope_annual_program_entries','scope_planned_site_slots'] loop
    execute format('alter table %I enable row level security',table_name);
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname=role_name) then execute format('revoke all on %I from %I',table_name,role_name); end if;
    end loop;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version) values ('scope-functional-catalog-c18') on conflict (version) do nothing;

commit;
