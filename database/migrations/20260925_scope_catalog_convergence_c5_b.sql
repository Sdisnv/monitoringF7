-- SCOPE C5-B convergence catalogue to QUO VADIS mirror. Additive only.
begin;
select pg_advisory_xact_lock(671902281);

create table if not exists scope_activity_legacy_aliases (
  alias_id uuid primary key default gen_random_uuid(),source_type text not null,source_value text not null,normalized_value text not null,
  definition_id uuid references scope_event_definitions(definition_id) on delete restrict,confidence numeric(4,3) not null,
  provenance text not null,justification text not null,status text not null,metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  constraint scope_activity_legacy_aliases_confidence_chk check (confidence between 0 and 1),
  constraint scope_activity_legacy_aliases_status_chk check (status in ('CONFIRMED','REVIEW_REQUIRED','REJECTED')),
  constraint scope_activity_legacy_aliases_target_chk check (status<>'CONFIRMED' or definition_id is not null),
  constraint scope_activity_legacy_aliases_uk unique (source_type,normalized_value));
create index if not exists scope_activity_legacy_aliases_definition_idx on scope_activity_legacy_aliases(definition_id,status);

alter table scope_quo_vadis_obligations drop constraint if exists scope_qv_obligations_source_chk;
alter table scope_quo_vadis_obligations add constraint scope_qv_obligations_source_chk
  check (source_type in ('DEFINITION','RECURRENT','MULTI_SESSION','CURSUS','DPS_RULE','FUTURE_DATE','HISTORIQUE','CYCLIQUE','OPTIONNELLE','MANUAL','CATALOG_C4'));
alter table scope_quo_vadis_obligations drop constraint if exists scope_qv_obligations_catalog_c4_link_chk;
alter table scope_quo_vadis_obligations add constraint scope_qv_obligations_catalog_c4_link_chk
  check (source_type<>'CATALOG_C4' or planned_occurrence_id is not null);

create or replace function scope_qv_proposal_catalog_link_guard() returns trigger language plpgsql as $$ declare
  obligation_occurrence uuid; session_occurrence uuid;
begin
  if new.planned_occurrence_session_id is null then return new; end if;
  select planned_occurrence_id into obligation_occurrence from scope_quo_vadis_obligations where obligation_id=new.obligation_id;
  select planned_occurrence_id into session_occurrence from scope_planned_occurrence_sessions where planned_occurrence_session_id=new.planned_occurrence_session_id;
  if obligation_occurrence is distinct from session_occurrence then raise exception 'proposal session must belong to obligation planned occurrence'; end if;
  return new;
end $$;

drop trigger if exists scope_qv_proposal_catalog_link_guard_trg on scope_quo_vadis_proposals;
create trigger scope_qv_proposal_catalog_link_guard_trg before insert or update of obligation_id,planned_occurrence_session_id on scope_quo_vadis_proposals
  for each row execute function scope_qv_proposal_catalog_link_guard();

create or replace function scope_qv_obligation_catalog_link_guard() returns trigger language plpgsql as $$ begin
  if new.planned_occurrence_id is distinct from old.planned_occurrence_id and exists (
    select 1 from scope_quo_vadis_proposals proposal join scope_planned_occurrence_sessions session
      on session.planned_occurrence_session_id=proposal.planned_occurrence_session_id
    where proposal.obligation_id=new.obligation_id and session.planned_occurrence_id is distinct from new.planned_occurrence_id
  ) then raise exception 'obligation planned occurrence must own every linked proposal session'; end if;
  return new;
end $$;

drop trigger if exists scope_qv_obligation_catalog_link_guard_trg on scope_quo_vadis_obligations;
create trigger scope_qv_obligation_catalog_link_guard_trg before update of planned_occurrence_id on scope_quo_vadis_obligations
  for each row execute function scope_qv_obligation_catalog_link_guard();

create or replace function scope_activity_legacy_alias_guard() returns trigger language plpgsql as $$ begin
  if tg_op='DELETE' and old.status='CONFIRMED' then raise exception 'confirmed activity aliases cannot be deleted'; end if;
  if tg_op='UPDATE' and old.status='CONFIRMED' and (new.source_type is distinct from old.source_type or new.source_value is distinct from old.source_value
    or new.normalized_value is distinct from old.normalized_value or new.definition_id is distinct from old.definition_id
    or new.confidence is distinct from old.confidence or new.provenance is distinct from old.provenance
    or new.justification is distinct from old.justification or new.metadata is distinct from old.metadata or new.status is distinct from old.status) then
    raise exception 'confirmed activity alias identity is immutable'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end $$;
drop trigger if exists scope_activity_legacy_alias_guard_trg on scope_activity_legacy_aliases;
create trigger scope_activity_legacy_alias_guard_trg before update or delete on scope_activity_legacy_aliases
  for each row execute function scope_activity_legacy_alias_guard();

insert into scope_event_definitions(code,label,domain,description,status,metadata,family_code,activity_type)
values
('DPS-EXERCICE','Exercice DPS','DPS','Activite canonique DPS, site et occurrence portes annuellement.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'FOCO','EXERCISE'),
('DPS-INSTRUCTION-SECTION','Instruction de section DPS','DPS','Instruction de section canonique.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'FOCO','INSTRUCTION'),
('DPS-INSTRUCTION-DEMI-SECTION','Instruction de demi-section DPS','DPS','Instruction de demi-section canonique.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'FOCO','INSTRUCTION'),
('DPS-DAP-EXERCICE','Exercice DPS-DAP','DPS','Activite unique avec domaines DPS et DAP.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH","multiDomain":true}'::jsonb,'FOCO','EXERCISE'),
('DAP-EXERCICE','Exercice DAP','DAP','Activite canonique DAP, site et occurrence portes annuellement.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'FOCO','EXERCISE'),
('JSP-EXERCICE','Exercice JSP','JSP','Public attendu limite aux jeunes JSP.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH","noCadetStructure":true}'::jsonb,'JSP','EXERCISE'),
('PR-EXERCICE-PAPR','Exercice PR PAPR','PR','Exercice des personnes qualifiees PAPR.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'PR','EXERCISE'),
('PR-PISTE-GAZ','Piste gaz PR','PR','Activite piste gaz; la conformite individuelle reste hors C5-B.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'PR','TEST'),
('PR-TEST-PHYSIQUE','Test physique PR','PR','Test physique annuel; la conformite individuelle reste hors C5-B.','ACTIF','{"source":"CATALOG_CONVERGENCE_C5_B","confidence":"HIGH"}'::jsonb,'PR','TEST')
on conflict (code) do nothing;

insert into scope_event_definition_versions(definition_id,version_code,valid_from,mode_organisation,session_count,population_rule,active,metadata,status,description,fingerprint)
select d.definition_id,'C5-B-V1','2027-01-01','SIMPLE',1,'{}'::jsonb,true,
  '{"source":"CATALOG_CONVERGENCE_C5_B","reviewRequired":false}'::jsonb,'DRAFT',d.description,
  case d.code
    when 'DPS-EXERCICE' then '37398ad46c8c0eb34bdf42712aa0bbf813126c01243a715f15bf65bd7f69ab49'
    when 'DPS-INSTRUCTION-SECTION' then 'd2da64c73118661ae15b5ef19d228a242c488aaf40b1f0fdc1de4b5ce7404ce6'
    when 'DPS-INSTRUCTION-DEMI-SECTION' then 'dcb96ac1ff7809ef20ccd57c86487c3cc308b151d588cc4eb33cd65f4fd7dc73'
    when 'DPS-DAP-EXERCICE' then 'f15cb153982df9957afc9503c449348115e59275c22f3963622811c3e3873e6a'
    when 'DAP-EXERCICE' then '4cd8f0646a788c77d87b92080c46760c8567b0b1a84dbbd97a0afb49fe8d42fe'
    when 'JSP-EXERCICE' then 'acd2decdf701f20b87a21e6a9c802bb8d40b8caea874d6c2460e00095d8525ed'
    when 'PR-EXERCICE-PAPR' then '6b9897d03ba2abf2e9e1c0308615e6672d9bfa3706406c552e1c97758b2ba859'
    when 'PR-PISTE-GAZ' then '7a550392d282f727d77da6a571c4581415a91295d88abcaf48f2b17c8b2d0982'
    when 'PR-TEST-PHYSIQUE' then 'a489fa0779cac3382e108082567a13b7f059bf1318a6c644c8fb9ec370a9cb2e'
  end
from scope_event_definitions d where d.code in ('DPS-EXERCICE','DPS-INSTRUCTION-SECTION','DPS-INSTRUCTION-DEMI-SECTION','DPS-DAP-EXERCICE','DAP-EXERCICE','JSP-EXERCICE','PR-EXERCICE-PAPR','PR-PISTE-GAZ','PR-TEST-PHYSIQUE')
on conflict (definition_id,version_code) do nothing;

do $$ begin
  if exists (
    select 1 from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
    where v.version_code='C5-B-V1' and d.code in ('DPS-EXERCICE','DPS-INSTRUCTION-SECTION','DPS-INSTRUCTION-DEMI-SECTION','DPS-DAP-EXERCICE','DAP-EXERCICE','JSP-EXERCICE','PR-EXERCICE-PAPR','PR-PISTE-GAZ','PR-TEST-PHYSIQUE')
      and v.fingerprint<>case d.code
        when 'DPS-EXERCICE' then '37398ad46c8c0eb34bdf42712aa0bbf813126c01243a715f15bf65bd7f69ab49'
        when 'DPS-INSTRUCTION-SECTION' then 'd2da64c73118661ae15b5ef19d228a242c488aaf40b1f0fdc1de4b5ce7404ce6'
        when 'DPS-INSTRUCTION-DEMI-SECTION' then 'dcb96ac1ff7809ef20ccd57c86487c3cc308b151d588cc4eb33cd65f4fd7dc73'
        when 'DPS-DAP-EXERCICE' then 'f15cb153982df9957afc9503c449348115e59275c22f3963622811c3e3873e6a'
        when 'DAP-EXERCICE' then '4cd8f0646a788c77d87b92080c46760c8567b0b1a84dbbd97a0afb49fe8d42fe'
        when 'JSP-EXERCICE' then 'acd2decdf701f20b87a21e6a9c802bb8d40b8caea874d6c2460e00095d8525ed'
        when 'PR-EXERCICE-PAPR' then '6b9897d03ba2abf2e9e1c0308615e6672d9bfa3706406c552e1c97758b2ba859'
        when 'PR-PISTE-GAZ' then '7a550392d282f727d77da6a571c4581415a91295d88abcaf48f2b17c8b2d0982'
        when 'PR-TEST-PHYSIQUE' then 'a489fa0779cac3382e108082567a13b7f059bf1318a6c644c8fb9ec370a9cb2e' end
  ) then raise exception 'C5-B refuses a conflicting C5-B-V1 activity definition version'; end if;
end $$;

insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata)
select v.definition_version_id,d.domain,'PRIMARY','{"source":"CATALOG_CONVERGENCE_C5_B"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where v.version_code='C5-B-V1' and v.status='DRAFT' on conflict (definition_version_id,domain_code) do nothing;
insert into scope_activity_domain_bindings(definition_version_id,domain_code,binding_role,metadata)
select v.definition_version_id,'DAP','SECONDARY','{"source":"CATALOG_CONVERGENCE_C5_B","singleActivity":true}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where d.code='DPS-DAP-EXERCICE' and v.version_code='C5-B-V1' and v.status='DRAFT' on conflict (definition_version_id,domain_code) do nothing;

insert into scope_activity_session_templates(definition_version_id,code,sequence,label,mandatory,duration_minutes,public_continuity,location_continuity,metadata)
select v.definition_version_id,'S1',1,d.label,true,120,'INHERIT','INHERIT','{"source":"CATALOG_CONVERGENCE_C5_B"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where v.version_code='C5-B-V1' and v.status='DRAFT' on conflict (definition_version_id,code) do nothing;

insert into scope_activity_periodicities(definition_version_id,periodicity_type,interval_value,metadata)
select v.definition_version_id,
  case when d.code in ('PR-EXERCICE-PAPR','PR-TEST-PHYSIQUE') then 'ANNUAL' when d.code='PR-PISTE-GAZ' then 'EVERY_N_MONTHS' else 'ON_DEMAND' end,
  case when d.code='PR-PISTE-GAZ' then 24 else null end,'{"source":"CATALOG_CONVERGENCE_C5_B"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where v.version_code='C5-B-V1' and v.status='DRAFT' on conflict (definition_version_id) do nothing;

insert into scope_activity_public_bindings(definition_version_id,public_definition_id,group_code,operator,binding_type,metadata)
select v.definition_version_id,p.public_definition_id,'DEFAULT','UNION','TARGET','{"source":"CATALOG_CONVERGENCE_C5_B"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
join scope_public_definitions p on p.code=case
  when d.code in ('DPS-EXERCICE','DPS-INSTRUCTION-SECTION','DPS-INSTRUCTION-DEMI-SECTION','DPS-DAP-EXERCICE') then 'DPS-GEN'
  when d.code='DAP-EXERCICE' then 'DAP-GEN' when d.code='JSP-EXERCICE' then 'JSP-GEN' else 'PR-PAPR' end
where v.version_code='C5-B-V1' and v.status='DRAFT' on conflict on constraint scope_activity_public_bindings_uk do nothing;
insert into scope_activity_public_bindings(definition_version_id,public_definition_id,group_code,operator,binding_type,metadata)
select v.definition_version_id,p.public_definition_id,'DEFAULT','UNION','TARGET','{"source":"CATALOG_CONVERGENCE_C5_B","secondaryDomain":"DAP"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
join scope_public_definitions p on p.code='DAP-GEN'
where d.code='DPS-DAP-EXERCICE' and v.version_code='C5-B-V1' and v.status='DRAFT'
on conflict on constraint scope_activity_public_bindings_uk do nothing;

insert into scope_activity_qualification_bindings(definition_version_id,competence_id,binding_type,mandatory,metadata)
select v.definition_version_id,c.competence_id,'PREREQUISITE',true,'{"source":"CATALOG_CONVERGENCE_C5_B"}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
join scope_competence_definitions c on c.code='PAPR'
where d.code in ('PR-EXERCICE-PAPR','PR-PISTE-GAZ','PR-TEST-PHYSIQUE') and v.version_code='C5-B-V1' and v.status='DRAFT'
on conflict (definition_version_id,competence_id,binding_type) do nothing;

insert into scope_activity_statistical_contributions(definition_version_id,statcom_code,mode,aggregation_rule,metadata)
select v.definition_version_id,x.statcom_code,case when d.code='DPS-DAP-EXERCICE' then 'MANUAL' else 'FULL_DURATION' end,'PER_PARTICIPANT',
  jsonb_build_object('source','CATALOG_CONVERGENCE_C5_B','reviewRequired',d.code='DPS-DAP-EXERCICE')
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
cross join lateral (select unnest(case when d.code='DPS-DAP-EXERCICE' then array['0120F7','0130F7']
  when d.domain='DPS' then array['0120F7'] when d.domain='DAP' then array['0130F7'] when d.domain='JSP' then array['010JSP'] else array['011PR'] end)) x(statcom_code)
where v.version_code='C5-B-V1' and v.status='DRAFT'
on conflict on constraint scope_activity_statistical_contributions_uk do nothing;

update scope_event_definition_versions v set status='ACTIVE',updated_at=now()
from scope_event_definitions d where d.definition_id=v.definition_id and v.version_code='C5-B-V1' and v.status='DRAFT';

insert into scope_annual_requirements(year,definition_version_id,variant_code,required_occurrences,status,source_type,source_id,metadata)
select 2027,v.definition_version_id,'DEFAULT',1,'DRAFT','C5_B_CANONICAL',d.code,
  '{"source":"CATALOG_CONVERGENCE_C5_B","readyRequiresPinnedPublicRule":true}'::jsonb
from scope_event_definition_versions v join scope_event_definitions d on d.definition_id=v.definition_id
where v.version_code='C5-B-V1' and d.code in ('PR-EXERCICE-PAPR','PR-TEST-PHYSIQUE')
on conflict (year,source_type,source_id) do nothing;

insert into scope_activity_legacy_aliases(source_type,source_value,normalized_value,definition_id,confidence,provenance,justification,status,metadata)
select 'LEGACY_LABEL',x.source_value,x.normalized_value,d.definition_id,1,'C5-B_DECISION','High-confidence business alias','CONFIRMED','{"source":"CATALOG_CONVERGENCE_C5_B"}'::jsonb
from (values
  ('Exercice DPS','exercice dps','DPS-EXERCICE'),('Exercice DAP','exercice dap','DAP-EXERCICE'),
  ('Exercice JSP','exercice jsp','JSP-EXERCICE'),('Exercice PR PAPR','exercice pr papr','PR-EXERCICE-PAPR'),
  ('Piste gaz PR','piste gaz pr','PR-PISTE-GAZ'),('Test physique PR','test physique pr','PR-TEST-PHYSIQUE'),
  ('Instruction de section DPS','instruction de section dps','DPS-INSTRUCTION-SECTION'),
  ('Instruction de demi-section DPS','instruction de demi-section dps','DPS-INSTRUCTION-DEMI-SECTION'),
  ('Exercice DPS-DAP','exercice dps-dap','DPS-DAP-EXERCICE')
) x(source_value,normalized_value,definition_code) join scope_event_definitions d on d.code=x.definition_code
on conflict (source_type,normalized_value) do nothing;

insert into scope_activity_legacy_aliases(source_type,source_value,normalized_value,definition_id,confidence,provenance,justification,status,metadata)
select 'VERSIONED_MOA_FIXTURE',x.source_value,x.normalized_value,d.definition_id,0.95,x.provenance,'Site, public or occurrence variant','CONFIRMED',
  '{"source":"CATALOG_CONVERGENCE_C5_B","fixtureOnly":true}'::jsonb
from (values
  ('Exercice DPS 1','exercice dps 1','DPS-EXERCICE','014G1DPS.20'),
  ('Exercice DAP 1','exercice dap 1','DAP-EXERCICE','013Y1DAP.14'),
  ('Exercice JSP 1','exercice jsp 1','JSP-EXERCICE','010JC1JSP.2,010JB1JSP.3'),
  ('Exercice JSP 2','exercice jsp 2','JSP-EXERCICE','010JC1JSP.4'),
  ('Exercice JSP 2027','exercice jsp 2027','JSP-EXERCICE','010JC1JSP.140'),
  ('Exercice PR 1.1 | Base','exercice pr 1.1 base','PR-EXERCICE-PAPR','011PRPR.10')
) x(source_value,normalized_value,definition_code,provenance) join scope_event_definitions d on d.code=x.definition_code
on conflict (source_type,normalized_value) do nothing;

do $$ declare role_name text; begin
  alter table scope_activity_legacy_aliases enable row level security;
  foreach role_name in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname=role_name) then execute format('revoke all on scope_activity_legacy_aliases from %I',role_name); end if;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version) values ('scope-catalog-convergence-c5-b') on conflict (version) do nothing;
commit;
