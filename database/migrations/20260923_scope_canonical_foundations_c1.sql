-- SCOPE — CHANTIER-1 / PHASE C1
-- Fondations canoniques additives. Aucun consommateur fonctionnel n'est bascule.

begin;
select pg_advisory_xact_lock(671902275);

create table if not exists scope_ois (
  oi_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  actif boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_ois_code_chk check (length(trim(code)) > 0),
  constraint scope_ois_libelle_chk check (length(trim(libelle)) > 0)
);

create table if not exists scope_domaine_ois (
  domaine_oi_id uuid primary key default gen_random_uuid(),
  domaine_code text not null references scope_domaines(code),
  oi_id uuid not null references scope_ois(oi_id),
  valid_from date not null default date '1900-01-01',
  valid_to date,
  actif boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_domaine_ois_dates_chk check (valid_to is null or valid_from <= valid_to),
  constraint scope_domaine_ois_unique unique (domaine_code, oi_id, valid_from)
);
create index if not exists scope_domaine_ois_active_idx
  on scope_domaine_ois(domaine_code, oi_id, valid_from, valid_to) where actif is true;

create table if not exists scope_pr_parcours (
  parcours_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  actif boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_pr_parcours_code_chk check (length(trim(code)) > 0),
  constraint scope_pr_parcours_libelle_chk check (length(trim(libelle)) > 0)
);

create table if not exists scope_pr_parcours_aliases (
  alias text primary key,
  parcours_id uuid not null references scope_pr_parcours(parcours_id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint scope_pr_parcours_alias_chk check (length(trim(alias)) > 0)
);

create table if not exists scope_competence_definitions (
  competence_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  type text not null,
  domaine_code text references scope_domaines(code),
  actif boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_competence_type_chk check (type in ('QUALIFICATION','SPECIALITE','HABILITATION','AUTRE')),
  constraint scope_competence_code_chk check (length(trim(code)) > 0),
  constraint scope_competence_libelle_chk check (length(trim(libelle)) > 0)
);
create index if not exists scope_competence_domain_type_idx
  on scope_competence_definitions(domaine_code, type, actif, sort_order);

create table if not exists scope_competence_aliases (
  domaine_code text not null references scope_domaines(code),
  alias text not null,
  competence_id uuid not null references scope_competence_definitions(competence_id),
  legacy_context text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint scope_competence_alias_pk primary key (domaine_code, alias),
  constraint scope_competence_alias_chk check (length(trim(alias)) > 0)
);

create table if not exists scope_foba_niveaux (
  niveau_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  actif boolean not null default true,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_foba_niveaux_code_chk check (length(trim(code)) > 0),
  constraint scope_foba_niveaux_libelle_chk check (length(trim(libelle)) > 0)
);

create table if not exists scope_legacy_cible_oi_mappings (
  cible_id uuid not null references scope_cibles(cible_id) on delete restrict,
  oi_id uuid not null references scope_ois(oi_id) on delete restrict,
  mapping_method text not null default 'SEEDED_C1',
  mapping_status text not null,
  confidence numeric(4,3) not null default 1,
  validated_at timestamptz,
  validated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_legacy_cible_oi_pk primary key (cible_id, oi_id),
  constraint scope_legacy_cible_oi_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
  constraint scope_legacy_cible_oi_confidence_chk check (confidence between 0 and 1)
);

create table if not exists scope_legacy_cible_pr_parcours_mappings (
  cible_id uuid not null references scope_cibles(cible_id) on delete restrict,
  parcours_id uuid not null references scope_pr_parcours(parcours_id) on delete restrict,
  mapping_method text not null default 'SEEDED_C1',
  mapping_status text not null,
  confidence numeric(4,3) not null default 1,
  validated_at timestamptz,
  validated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_legacy_cible_pr_pk primary key (cible_id, parcours_id),
  constraint scope_legacy_cible_pr_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
  constraint scope_legacy_cible_pr_confidence_chk check (confidence between 0 and 1)
);

create table if not exists scope_legacy_cible_competence_mappings (
  cible_id uuid not null references scope_cibles(cible_id) on delete restrict,
  competence_id uuid not null references scope_competence_definitions(competence_id) on delete restrict,
  mapping_method text not null default 'SEEDED_C1',
  mapping_status text not null,
  confidence numeric(4,3) not null default 1,
  validated_at timestamptz,
  validated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_legacy_cible_competence_pk primary key (cible_id, competence_id),
  constraint scope_legacy_cible_competence_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
  constraint scope_legacy_cible_competence_confidence_chk check (confidence between 0 and 1)
);

create table if not exists scope_legacy_cible_foba_niveau_mappings (
  cible_id uuid not null references scope_cibles(cible_id) on delete restrict,
  niveau_id uuid not null references scope_foba_niveaux(niveau_id) on delete restrict,
  mapping_method text not null default 'SEEDED_C1',
  mapping_status text not null,
  confidence numeric(4,3) not null default 1,
  validated_at timestamptz,
  validated_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_legacy_cible_foba_pk primary key (cible_id, niveau_id),
  constraint scope_legacy_cible_foba_status_chk check (mapping_status in ('CONFIRMED','COMPOSITE','AMBIGUOUS','REVIEW_REQUIRED')),
  constraint scope_legacy_cible_foba_confidence_chk check (confidence between 0 and 1)
);

create table if not exists scope_legacy_cible_reviews (
  cible_id uuid primary key references scope_cibles(cible_id) on delete restrict,
  classification text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_legacy_cible_reviews_class_chk check (classification in ('AMBIGUOUS','REVIEW_REQUIRED','UNMAPPED')),
  constraint scope_legacy_cible_reviews_reason_chk check (length(trim(reason)) > 0)
);

insert into scope_ois(code, libelle, sort_order, metadata)
values
  ('G1','G1',1,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('C1','C1',2,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('B1','B1',3,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('B2','B2',4,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('Y1','Y1',5,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('Y2','Y2',6,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('Y3','Y3',7,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('Y4','Y4',8,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb)
on conflict (code) do nothing;

insert into scope_domaine_ois(domaine_code, oi_id, valid_from, metadata)
select seed.domaine_code, oi.oi_id, date '1900-01-01', '{"source":"CANONICAL_FOUNDATIONS_C1","validity":"UNBOUNDED_LEGACY"}'::jsonb
from (values
  ('DPS','G1'),('DPS','C1'),('DPS','B1'),('DPS','B2'),
  ('DAP','Y1'),('DAP','Y2'),('DAP','Y3'),('DAP','Y4'),
  ('JSP','G1'),('JSP','C1'),('JSP','B1')
) as seed(domaine_code, oi_code)
join scope_ois oi on oi.code = seed.oi_code
on conflict (domaine_code, oi_id, valid_from) do nothing;

insert into scope_pr_parcours(code, libelle, sort_order, metadata)
values
  ('GENERAL','Général',1,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('PAPR','PAPR',2,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('PABC','PABC',3,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb)
on conflict (code) do nothing;

insert into scope_pr_parcours_aliases(alias, parcours_id, metadata)
select seed.alias, p.parcours_id, jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','legacy',seed.legacy)
from (values
  ('GENERAL','GENERAL',false),('PAPR','PAPR',false),('PABC','PABC',false),
  ('ABC','PABC',true),('PRABC','PABC',true),('PR-ABC','PABC',true)
) as seed(alias, parcours_code, legacy)
join scope_pr_parcours p on p.code = seed.parcours_code
on conflict (alias) do nothing;

insert into scope_competence_definitions(code, libelle, type, domaine_code, sort_order, metadata)
values
  ('COND_PL','cond PL','QUALIFICATION','AUTO',1,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('COND_TP9','cond TP9','QUALIFICATION','AUTO',2,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('COND_VL','cond VL','QUALIFICATION','AUTO',3,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('GRUTIER','Grutier','QUALIFICATION','AUTO',4,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('MEA','MEA','QUALIFICATION','AUTO',5,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('PILOTE_BAT','Pilote BAT','QUALIFICATION','AUTO',6,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('ANTICHUTE','Antichute','SPECIALITE','FOSPEC',1,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('NAC','NAC','SPECIALITE','FOSPEC',2,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('OFSI','OFSI','SPECIALITE','FOSPEC',3,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('OP_VPC','OP VPC','SPECIALITE','FOSPEC',4,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb)
on conflict (code) do nothing;

insert into scope_competence_aliases(domaine_code, alias, competence_id, legacy_context, metadata)
select seed.domaine_code, seed.alias, c.competence_id, seed.legacy_context,
       jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','preserveLegacyContext',seed.legacy_context is not null)
from (values
  ('AUTO','PL','COND_PL',null),('AUTO','TP9','COND_TP9',null),('AUTO','VL','COND_VL',null),
  ('AUTO','VL_DPS','COND_VL','DPS'),('AUTO','VL_DAP','COND_VL','DAP'),
  ('AUTO','GRUTIER','GRUTIER',null),('AUTO','MEA','MEA',null),('AUTO','BAT','PILOTE_BAT',null)
) as seed(domaine_code, alias, competence_code, legacy_context)
join scope_competence_definitions c on c.code = seed.competence_code
on conflict (domaine_code, alias) do nothing;

insert into scope_foba_niveaux(code, libelle, sort_order, metadata)
values
  ('1','FOBA 1',1,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('2','FOBA 2',2,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb),
  ('3','FOBA 3',3,'{"source":"CANONICAL_FOUNDATIONS_C1"}'::jsonb)
on conflict (code) do nothing;

insert into scope_legacy_cible_oi_mappings(cible_id, oi_id, mapping_status, confidence, metadata)
select c.cible_id, oi.oi_id,
       case when c.domaine_code = 'PR' then 'COMPOSITE' else 'CONFIRMED' end,
       case when c.domaine_code = 'PR' then 0.950 else 1.000 end,
       jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','legacyKey',c.domaine_code || '/' || c.niveau_code)
from scope_cibles c
join scope_ois oi on oi.code = c.niveau_code
where (c.domaine_code = 'DPS' and c.niveau_code in ('G1','C1','B1','B2'))
   or (c.domaine_code = 'DAP' and c.niveau_code in ('Y1','Y2','Y3','Y4'))
   or (c.domaine_code = 'JSP' and c.niveau_code in ('G1','C1','B1'))
   or (c.domaine_code = 'PR' and c.niveau_code in ('G1','C1','B1','B2'))
on conflict (cible_id, oi_id) do nothing;

insert into scope_legacy_cible_pr_parcours_mappings(cible_id, parcours_id, mapping_status, confidence, metadata)
select c.cible_id, p.parcours_id,
       case when c.niveau_code in ('G1','C1','B1','B2') then 'COMPOSITE' else 'CONFIRMED' end,
       case when c.niveau_code in ('G1','C1','B1','B2') then 0.950 else 1.000 end,
       jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','legacyKey',c.domaine_code || '/' || c.niveau_code)
from scope_cibles c
join scope_pr_parcours p on p.code = case
  when c.niveau_code = 'ABC' then 'PABC'
  when c.niveau_code in ('PAPR','G1','C1','B1','B2') then 'PAPR'
end
where c.domaine_code = 'PR' and c.niveau_code in ('PAPR','ABC','G1','C1','B1','B2')
on conflict (cible_id, parcours_id) do nothing;

insert into scope_legacy_cible_competence_mappings(cible_id, competence_id, mapping_status, confidence, metadata)
select c.cible_id, d.competence_id, 'CONFIRMED', 1.000,
       jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','legacyKey',c.domaine_code || '/' || c.niveau_code)
from scope_cibles c
join (values
  ('VL','COND_VL'),('PL','COND_PL'),('TP9','COND_TP9'),
  ('GRUTIER','GRUTIER'),('MEA','MEA'),('BAT','PILOTE_BAT')
) as seed(niveau_code, competence_code) on seed.niveau_code = c.niveau_code
join scope_competence_definitions d on d.code = seed.competence_code
where c.domaine_code = 'AUTO'
on conflict (cible_id, competence_id) do nothing;

insert into scope_legacy_cible_foba_niveau_mappings(cible_id, niveau_id, mapping_status, confidence, metadata)
select c.cible_id, n.niveau_id, 'CONFIRMED', 1.000,
       jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','legacyKey',c.domaine_code || '/' || c.niveau_code)
from scope_cibles c
join scope_foba_niveaux n on n.code = c.niveau_code
where c.domaine_code = 'FOBA' and c.niveau_code in ('1','2','3')
on conflict (cible_id, niveau_id) do nothing;

insert into scope_legacy_cible_reviews(cible_id, classification, reason, metadata)
select c.cible_id, seed.classification, seed.reason,
       jsonb_build_object('source','CANONICAL_FOUNDATIONS_C1','legacyKey',c.domaine_code || '/' || c.niveau_code)
from scope_cibles c
join (values
  ('FOCA','GEN','AMBIGUOUS','FOCA/GEN ne permet pas de conclure à un niveau ou parcours.'),
  ('JSP','CAD','AMBIGUOUS','JSP/CAD doit être comparé aux rôles JSP et moniteurs.'),
  ('FOSPEC','GEN','AMBIGUOUS','FOSPEC/GEN est un périmètre générique, pas une spécialité.'),
  ('PR','GEN','AMBIGUOUS','PR/GEN ne doit pas être assimilé automatiquement à PAPR.'),
  ('FOCO','DPS','UNMAPPED','Aucun mapping C1 certain.'),
  ('FOCO','DAP','UNMAPPED','Aucun mapping C1 certain.'),
  ('FOCO','JSP','UNMAPPED','Aucun mapping C1 certain.'),
  ('DPS','GEN','UNMAPPED','Aucun mapping C1 certain.'),
  ('DAP','GEN','UNMAPPED','Aucun mapping C1 certain.'),
  ('JSP','GEN','UNMAPPED','Aucun mapping C1 certain.')
) as seed(domaine_code, niveau_code, classification, reason)
  on seed.domaine_code = c.domaine_code and seed.niveau_code = c.niveau_code
on conflict (cible_id) do nothing;

do $$
declare table_name text; role_name text;
begin
  foreach table_name in array array[
    'scope_ois','scope_domaine_ois','scope_pr_parcours','scope_pr_parcours_aliases',
    'scope_competence_definitions','scope_competence_aliases','scope_foba_niveaux',
    'scope_legacy_cible_oi_mappings','scope_legacy_cible_pr_parcours_mappings',
    'scope_legacy_cible_competence_mappings','scope_legacy_cible_foba_niveau_mappings',
    'scope_legacy_cible_reviews'
  ] loop
    execute format('alter table %I enable row level security', table_name);
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role_name) then
        execute format('revoke all on %I from %I', table_name, role_name);
      end if;
    end loop;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version)
values ('scope-canonical-foundations-c1') on conflict (version) do nothing;

commit;
