begin;

select pg_advisory_xact_lock(671902278);

do $$
declare old_id uuid; canonical_id uuid;
begin
  select competence_id into old_id from scope_competence_definitions where code = 'OP_VPC';
  select competence_id into canonical_id from scope_competence_definitions where code = 'VPC';
  if old_id is not null and canonical_id is null then
    update scope_competence_definitions
      set code = 'VPC', libelle = 'VPC', metadata = metadata || '{"legacyCodes":["OP_VPC"],"normalizedBy":"C3-B"}'::jsonb, updated_at = now()
      where competence_id = old_id;
  elsif old_id is not null and canonical_id is not null and old_id <> canonical_id then
    raise exception 'C3-B refuses duplicate VPC and OP_VPC qualification identities';
  end if;
end $$;

create temporary table scope_qualification_seed_c3_b (
  code text, libelle text, type text, domaine_code text, sort_order integer
) on commit drop;

insert into scope_qualification_seed_c3_b(code,libelle,type,domaine_code,sort_order) values
('PAPR','PAPR','QUALIFICATION','PR',1),
('PABC','PABC','SPECIALITE','PR',2),
('MACHINISTE_EA','Machiniste EA','QUALIFICATION','AUTO',20),
('GRUTIER_A','Grutier A','QUALIFICATION','AUTO',21),
('GRUTIER_C','Grutier C','QUALIFICATION','AUTO',22),
('CARISTE','Cariste','QUALIFICATION','AUTO',23),
('VPC','VPC','SPECIALITE','FOSPEC',3),
('SANITAIRE','Sanitaire','SPECIALITE','FOSPEC',5);

insert into scope_competence_definitions(code,libelle,type,domaine_code,sort_order,metadata)
select code,libelle,type,domaine_code,sort_order,'{"source":"PERSON_QUALIFICATIONS_C3_B"}'::jsonb
from scope_qualification_seed_c3_b
on conflict (code) do nothing;

create temporary table scope_qualification_alias_seed_c3_b (
  domaine_code text, alias text, competence_code text, legacy_context text
) on commit drop;

insert into scope_qualification_alias_seed_c3_b(domaine_code,alias,competence_code,legacy_context) values
('PR','PR','PAPR',null),('PR','PAPR','PAPR',null),
('PR','ABC','PABC',null),('PR','PRABC','PABC',null),('PR','PR-ABC','PABC',null),('PR','PABC','PABC',null),
('FOSPEC','VPC','VPC',null),('FOSPEC','OP_VPC','VPC',null),('FOSPEC','OP VPC','VPC',null),
('FOSPEC','OFSI','OFSI',null),('FOSPEC','NAC','NAC',null),('FOSPEC','ANTICHUTE','ANTICHUTE',null),('FOSPEC','SANITAIRE','SANITAIRE',null),
('AUTO','MACHINISTE_EA','MACHINISTE_EA',null),('AUTO','GRUTIER_A','GRUTIER_A',null),
('AUTO','GRUTIER_C','GRUTIER_C',null),('AUTO','CARISTE','CARISTE',null);

insert into scope_competence_aliases(domaine_code,alias,competence_id,legacy_context,metadata)
select seed.domaine_code,seed.alias,definition.competence_id,seed.legacy_context,'{"source":"PERSON_QUALIFICATIONS_C3_B"}'::jsonb
from scope_qualification_alias_seed_c3_b seed
join scope_competence_definitions definition on definition.code = seed.competence_code
on conflict (domaine_code,alias) do update
set competence_id = excluded.competence_id, legacy_context = excluded.legacy_context,
    metadata = scope_competence_aliases.metadata || excluded.metadata;

create table if not exists scope_competence_implications (
  competence_implication_id uuid primary key default gen_random_uuid(),
  competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
  implied_competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
  status text not null default 'ACTIVE', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint scope_competence_implications_distinct_chk check (competence_id <> implied_competence_id),
  constraint scope_competence_implications_status_chk check (status in ('ACTIVE','INACTIVE')),
  constraint scope_competence_implications_uk unique (competence_id,implied_competence_id)
);

insert into scope_competence_implications(competence_id,implied_competence_id,metadata)
select child.competence_id,parent.competence_id,'{"source":"PERSON_QUALIFICATIONS_C3_B","rule":"PABC_IMPLIES_PAPR","synthesize":false}'::jsonb
from scope_competence_definitions child cross join scope_competence_definitions parent
where child.code = 'PABC' and parent.code = 'PAPR'
on conflict (competence_id,implied_competence_id) do nothing;

create table if not exists scope_person_qualifications (
  person_qualification_id uuid primary key default gen_random_uuid(),
  personne_id text not null references scope_personnes(id) on delete restrict,
  competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
  valid_from date not null, valid_to date, status text not null default 'REVIEW_REQUIRED',
  supersedes_person_qualification_id uuid references scope_person_qualifications(person_qualification_id) on delete restrict,
  created_at timestamptz not null default now(), created_by text,
  validated_at timestamptz, validated_by text,
  invalidated_at timestamptz, invalidated_by text, invalidation_reason text,
  metadata jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  constraint scope_person_qualifications_dates_chk check (valid_to is null or valid_from <= valid_to),
  constraint scope_person_qualifications_status_chk check (status in ('CONFIRMED','REVIEW_REQUIRED','INVALIDATED')),
  constraint scope_person_qualifications_validation_chk check (status <> 'CONFIRMED' or validated_at is not null),
  constraint scope_person_qualifications_invalidation_chk check (status <> 'INVALIDATED' or (invalidated_at is not null and length(trim(invalidation_reason)) > 0))
);

create index if not exists scope_person_qualifications_lookup_idx
  on scope_person_qualifications(personne_id,competence_id,status,valid_from,valid_to);
create unique index if not exists scope_person_qualifications_open_confirmed_uk
  on scope_person_qualifications(personne_id,competence_id) where status = 'CONFIRMED' and valid_to is null;

create table if not exists scope_person_qualification_evidence (
  person_qualification_evidence_id uuid primary key default gen_random_uuid(),
  person_qualification_id uuid not null references scope_person_qualifications(person_qualification_id) on delete restrict,
  source_type text not null, source_entity text not null, source_id text not null,
  source_import_batch_id text references scope_personnel_import_batches(id) on delete restrict,
  source_import_line_id text references scope_personnel_import_lines(id) on delete restrict,
  legacy_domain text, legacy_target text, legacy_code text, legacy_context text,
  source_valid_from date not null, source_valid_to date, confidence numeric(4,3) not null default 1,
  source_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), created_by text,
  constraint scope_person_qualification_evidence_source_uk unique (source_type,source_entity,source_id),
  constraint scope_person_qualification_evidence_dates_chk check (source_valid_to is null or source_valid_from <= source_valid_to),
  constraint scope_person_qualification_evidence_confidence_chk check (confidence between 0 and 1),
  constraint scope_person_qualification_evidence_source_chk check (length(trim(source_type)) > 0 and length(trim(source_entity)) > 0 and length(trim(source_id)) > 0)
);

create index if not exists scope_person_qualification_evidence_qualification_idx
  on scope_person_qualification_evidence(person_qualification_id,source_valid_from,source_valid_to);

create or replace function scope_person_qualifications_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'person qualification history is append-only';
  end if;
  perform pg_advisory_xact_lock(671902279, hashtext(new.personne_id || ':' || new.competence_id::text));
  if tg_op = 'UPDATE' and (
    new.personne_id is distinct from old.personne_id or new.competence_id is distinct from old.competence_id or
    new.valid_from is distinct from old.valid_from or new.valid_to is distinct from old.valid_to or
    new.supersedes_person_qualification_id is distinct from old.supersedes_person_qualification_id
  ) then raise exception 'person qualification corrections are append-only'; end if;
  if tg_op = 'UPDATE' and not (
    new.status = old.status or
    (old.status = 'REVIEW_REQUIRED' and new.status in ('CONFIRMED','INVALIDATED')) or
    (old.status = 'CONFIRMED' and new.status = 'INVALIDATED')
  ) then raise exception 'invalid person qualification status transition: % -> %', old.status, new.status; end if;
  if tg_op = 'INSERT' and new.supersedes_person_qualification_id is not null then
    if new.status <> 'REVIEW_REQUIRED' then
      raise exception 'a superseding person qualification must start in REVIEW_REQUIRED';
    end if;
    if new.supersedes_person_qualification_id = new.person_qualification_id then
      raise exception 'person qualification cannot supersede itself';
    end if;
    if not exists (
      select 1 from scope_person_qualifications superseded
      where superseded.person_qualification_id = new.supersedes_person_qualification_id
        and superseded.personne_id = new.personne_id and superseded.competence_id = new.competence_id
        and superseded.status = 'CONFIRMED'
    ) then raise exception 'superseded person qualification must be confirmed for the same person and competence'; end if;
    if exists (
      with recursive ancestors as (
        select person_qualification_id,supersedes_person_qualification_id
        from scope_person_qualifications where person_qualification_id = new.supersedes_person_qualification_id
        union all
        select parent.person_qualification_id,parent.supersedes_person_qualification_id
        from scope_person_qualifications parent join ancestors child
          on parent.person_qualification_id = child.supersedes_person_qualification_id
      ) select 1 from ancestors where person_qualification_id = new.person_qualification_id
    ) then raise exception 'person qualification supersession cycle detected'; end if;
  end if;
  if new.status = 'CONFIRMED' and exists (
    select 1 from scope_person_qualifications existing
    where existing.personne_id = new.personne_id and existing.competence_id = new.competence_id
      and existing.status = 'CONFIRMED' and existing.person_qualification_id <> new.person_qualification_id
      and daterange(existing.valid_from,coalesce(existing.valid_to,date '9999-12-31'),'[]')
        && daterange(new.valid_from,coalesce(new.valid_to,date '9999-12-31'),'[]')
  ) then raise exception 'overlapping confirmed person qualifications are forbidden'; end if;
  if new.status = 'CONFIRMED' and exists (
    select 1 from scope_competence_implications implication
    where implication.competence_id = new.competence_id and implication.status = 'ACTIVE'
      and not exists (
        select 1 from scope_person_qualifications required
        where required.personne_id = new.personne_id and required.competence_id = implication.implied_competence_id
          and required.status = 'CONFIRMED' and required.valid_from <= new.valid_from
          and coalesce(required.valid_to,date '9999-12-31') >= coalesce(new.valid_to,date '9999-12-31')
      )
  ) then raise exception 'confirmed person qualification is missing an implied qualification'; end if;
  if tg_op = 'UPDATE' and old.status = 'CONFIRMED' and new.status = 'INVALIDATED' and exists (
    select 1
    from scope_person_qualifications dependent
    join scope_competence_implications implication
      on implication.competence_id = dependent.competence_id
     and implication.implied_competence_id = old.competence_id
     and implication.status = 'ACTIVE'
    where dependent.personne_id = old.personne_id and dependent.status = 'CONFIRMED'
      and not exists (
        select 1 from scope_person_qualifications replacement
        where replacement.personne_id = dependent.personne_id
          and replacement.competence_id = old.competence_id
          and (replacement.status = 'CONFIRMED' or (
            replacement.status = 'REVIEW_REQUIRED'
            and replacement.supersedes_person_qualification_id = old.person_qualification_id
            and current_setting('scope.person_qualification_supersession',true) = old.person_qualification_id::text || ':' || replacement.person_qualification_id::text
          ))
          and replacement.person_qualification_id <> old.person_qualification_id
          and replacement.valid_from <= dependent.valid_from
          and coalesce(replacement.valid_to,date '9999-12-31') >= coalesce(dependent.valid_to,date '9999-12-31')
      )
  ) then raise exception 'required person qualification still covers a confirmed dependent qualification'; end if;
  return new;
end $$;

drop trigger if exists scope_person_qualifications_guard_trg on scope_person_qualifications;
create trigger scope_person_qualifications_guard_trg before insert or update or delete on scope_person_qualifications
for each row execute function scope_person_qualifications_guard();

create or replace function scope_supersede_person_qualification(
  p_superseded_id uuid, p_replacement_id uuid, p_actor text, p_reason text
) returns void language plpgsql as $$
declare superseded scope_person_qualifications%rowtype;
declare replacement scope_person_qualifications%rowtype;
begin
  if p_superseded_id = p_replacement_id then raise exception 'person qualification cannot supersede itself'; end if;
  if length(trim(coalesce(p_reason,''))) = 0 then raise exception 'person qualification supersession reason is required'; end if;
  select * into superseded from scope_person_qualifications where person_qualification_id = p_superseded_id for update;
  if not found then raise exception 'superseded person qualification does not exist'; end if;
  select * into replacement from scope_person_qualifications where person_qualification_id = p_replacement_id for update;
  if not found then raise exception 'replacement person qualification does not exist'; end if;
  if superseded.status <> 'CONFIRMED' then raise exception 'superseded person qualification is not replaceable'; end if;
  if replacement.status <> 'REVIEW_REQUIRED' then raise exception 'replacement person qualification must be REVIEW_REQUIRED'; end if;
  if replacement.personne_id <> superseded.personne_id then raise exception 'supersession person mismatch'; end if;
  if replacement.competence_id <> superseded.competence_id then raise exception 'supersession competence mismatch'; end if;
  if replacement.supersedes_person_qualification_id is distinct from superseded.person_qualification_id then
    raise exception 'replacement does not reference the superseded person qualification';
  end if;
  if exists (
    with recursive ancestors as (
      select person_qualification_id,supersedes_person_qualification_id
      from scope_person_qualifications where person_qualification_id = superseded.person_qualification_id
      union all
      select parent.person_qualification_id,parent.supersedes_person_qualification_id
      from scope_person_qualifications parent join ancestors child
        on parent.person_qualification_id = child.supersedes_person_qualification_id
    ) select 1 from ancestors where person_qualification_id = replacement.person_qualification_id
  ) then raise exception 'person qualification supersession cycle detected'; end if;
  perform set_config('scope.person_qualification_supersession',superseded.person_qualification_id::text || ':' || replacement.person_qualification_id::text,true);
  update scope_person_qualifications set status = 'INVALIDATED',invalidated_at = now(),invalidated_by = p_actor,
    invalidation_reason = p_reason,updated_at = now() where person_qualification_id = superseded.person_qualification_id;
  update scope_person_qualifications set status = 'CONFIRMED',validated_at = coalesce(validated_at,now()),validated_by = coalesce(validated_by,p_actor),
    updated_at = now() where person_qualification_id = replacement.person_qualification_id;
  perform set_config('scope.person_qualification_supersession','',true);
exception when others then
  perform set_config('scope.person_qualification_supersession','',true);
  raise;
end $$;

create or replace function scope_person_qualification_evidence_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'person qualification evidence history is append-only';
  end if;
  if new is distinct from old then
    raise exception 'person qualification evidence is immutable';
  end if;
  return new;
end $$;

drop trigger if exists scope_person_qualification_evidence_guard_trg on scope_person_qualification_evidence;
create trigger scope_person_qualification_evidence_guard_trg before update or delete on scope_person_qualification_evidence
for each row execute function scope_person_qualification_evidence_guard();

create table if not exists scope_event_role_definitions (
  event_role_definition_id uuid primary key default gen_random_uuid(), code text not null unique,
  label text not null, domain_code text references scope_domaines(code), active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint scope_event_role_definitions_code_chk check (code ~ '^[A-Z0-9][A-Z0-9_]*$'),
  constraint scope_event_role_definitions_label_chk check (length(trim(label)) > 0)
);

create table if not exists scope_event_role_aliases (
  alias text primary key, event_role_definition_id uuid not null references scope_event_role_definitions(event_role_definition_id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint scope_event_role_aliases_alias_chk check (length(trim(alias)) > 0)
);

create table if not exists scope_event_person_roles (
  event_person_role_id uuid primary key default gen_random_uuid(),
  evenement_id uuid not null references scope_evenements(evenement_id) on delete restrict,
  personne_id text not null references scope_personnes(id) on delete restrict,
  event_role_definition_id uuid not null references scope_event_role_definitions(event_role_definition_id) on delete restrict,
  source_type text not null default 'MANUAL', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), created_by text,
  constraint scope_event_person_roles_uk unique (evenement_id,personne_id,event_role_definition_id)
);

create temporary table scope_event_role_seed_c3_b(code text,label text,domain_code text,alias text) on commit drop;
insert into scope_event_role_seed_c3_b(code,label,domain_code,alias) values
('FORMATEUR_PR','Formateur PR','PR',null),
('FORMATEUR_MAISON_FEU','Formateur maison feu','PR','FMF'),
('CHEF_PISTE','Chef de piste','PR',null),
('MONITEUR_JSP','Moniteur JSP','JSP',null),
('AIDE_MONITEUR_JSP','Aide-moniteur JSP','JSP',null),
('MONITEUR_CONDUITE','Moniteur de conduite','AUTO',null),
('FORMATEUR_C1_118','Formateur C1/118','AUTO',null),
('FORMATEUR_EA','Formateur EA','AUTO',null);

insert into scope_event_role_definitions(code,label,domain_code,metadata)
select code,label,domain_code,'{"source":"PERSON_QUALIFICATIONS_C3_B"}'::jsonb from scope_event_role_seed_c3_b
on conflict (code) do nothing;
insert into scope_event_role_aliases(alias,event_role_definition_id,metadata)
select seed.alias,definition.event_role_definition_id,'{"source":"PERSON_QUALIFICATIONS_C3_B"}'::jsonb
from scope_event_role_seed_c3_b seed join scope_event_role_definitions definition on definition.code = seed.code
where seed.alias is not null on conflict (alias) do nothing;

create temporary table scope_public_seed_c3_b (
  code text,label text,description text,owner_code text,expression jsonb,fingerprint text
) on commit drop;
insert into scope_public_seed_c3_b(code,label,description,owner_code,expression,fingerprint) values
('DPS-GEN','DPS général','Public canonique DPS général','DPS','{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DPS","oiCodes":["G1","C1","B1","B2"]}]}'::jsonb,'b980d6c0497d647ce8371c320f5bf07646825bfd262bd8c14aea9fd1099055fb'),
('DAP-GEN','DAP général','Public canonique DAP général','DAP','{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DAP","oiCodes":["Y1","Y2","Y3","Y4"]}]}'::jsonb,'a32aca436ae345ce4184f89c0199c5b449b157f00ab85a05a48e6b545011a241'),
('JSP-GEN','Jeunes JSP','Public canonique Jeunes JSP','JSP','{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_JSP_ROLE","roles":["JEUNE"],"oiCodes":["G1","C1","B1"]}]}'::jsonb,'a5126fa544a0f5fac7e97356a36368c41187331b12c0d18c2777cc29e7fd08dd'),
('PR-PAPR','PR PAPR','Public canonique PR PAPR','PR','{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["PAPR"]}]}'::jsonb,'7c8993e336713849f0b55c666a4e5d7785f5088ea7c2922e4c73dd773177b44a'),
('PR-PABC','PR PABC','Public canonique PR PABC','PR','{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["PABC"]}]}'::jsonb,'292a773f8de0c2fec66bc11b409a9171ce7768f7d05a15ffca90d6e474beac34'),
('FOSPEC-VPC','FOSPEC VPC','Public canonique FOSPEC VPC','FOSPEC','{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["VPC"]}]}'::jsonb,'b3cd580cf9e173776da11bfab3fb98450b020c46605f78fe30df91c82ef33197');

update scope_public_rule_versions version set status = 'RETIRED', updated_at = now()
from scope_public_definitions definition
where version.public_definition_id = definition.public_definition_id and definition.code = 'FOSPEC-OP-VPC' and version.status = 'ACTIVE';
update scope_public_definitions set status = 'ARCHIVED', metadata = metadata || '{"canonicalReplacement":"FOSPEC-VPC"}'::jsonb, updated_at = now()
where code = 'FOSPEC-OP-VPC';

insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
select code,label,description,'ACTIVE','DOMAIN',owner_code,array[owner_code],'{"source":"PERSON_QUALIFICATIONS_C3_B"}'::jsonb
from scope_public_seed_c3_b on conflict (code) do nothing;
insert into scope_public_rule_versions(public_definition_id,version_number,version_code,status,schema_version,expression,fingerprint,approved_at,approved_by,metadata)
select definition.public_definition_id,1,'C3-B-V1','ACTIVE',1,seed.expression,seed.fingerprint,now(),'C3-B-SEED','{"source":"PERSON_QUALIFICATIONS_C3_B"}'::jsonb
from scope_public_seed_c3_b seed join scope_public_definitions definition on definition.code = seed.code
where not exists (select 1 from scope_public_rule_versions existing where existing.public_definition_id = definition.public_definition_id)
on conflict (public_definition_id,version_number) do nothing;

create temporary table scope_public_review_seed_c3_b(
  code text,label text,description text,owner_code text,resolution_status text,reason text
) on commit drop;
insert into scope_public_review_seed_c3_b values
('JSP-CAD','JSP cadets','Public JSP cadets en attente de données fiables','JSP','REVIEW_REQUIRED','La date de naissance fiable manque au modèle Personne actuel.'),
('PR-GEN','PR général','Public PR général non résolu','PR','AMBIGUOUS','PR/GEN ne doit pas être assimilé à une qualification.'),
('FOCA-GEN','FOCA général','Public FOCA général non résolu','FOCA','REVIEW_REQUIRED','La taxonomie FOCA est en remaniement.'),
('FOSPEC-GEN','FOSPEC général','Public FOSPEC général non résolu','FOSPEC','AMBIGUOUS','FOSPEC/GEN est un périmètre statistique, pas une qualification.'),
('FOCO-DPS','FOCO DPS','Dimension statistique FOCO DPS non résolue','FOCO','UNRESOLVED','Dimension de formation continue, pas qualification.'),
('FOCO-DAP','FOCO DAP','Dimension statistique FOCO DAP non résolue','FOCO','UNRESOLVED','Dimension de formation continue, pas qualification.'),
('FOCO-JSP','FOCO JSP','Cas FOCO JSP maintenu hors résolution','FOCO','UNRESOLVED','JSP reste hors statistiques FOCO.');
insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
select code,label,description,'INACTIVE','DOMAIN',owner_code,array[owner_code],
  jsonb_build_object('source','PERSON_QUALIFICATIONS_C3_B','resolutionStatus',resolution_status,'reason',reason)
from scope_public_review_seed_c3_b on conflict (code) do nothing;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'scope_competence_implications','scope_person_qualifications','scope_person_qualification_evidence',
    'scope_event_role_definitions','scope_event_role_aliases','scope_event_person_roles'
  ] loop
    execute format('alter table %I enable row level security',table_name);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on %I from anon',table_name); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on %I from authenticated',table_name); end if;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version) values ('scope-person-qualifications-c3-b') on conflict (version) do nothing;

commit;
