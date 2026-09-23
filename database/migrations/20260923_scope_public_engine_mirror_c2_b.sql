begin;

select pg_advisory_xact_lock(671902276);

create table if not exists scope_public_definitions (
  public_definition_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text not null,
  status text not null default 'INACTIVE',
  owner_type text,
  owner_code text,
  domain_hints text[] not null default '{}',
  valid_from date,
  valid_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_public_definitions_status_chk check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  constraint scope_public_definitions_code_chk check (code ~ '^[A-Z0-9][A-Z0-9_-]*$'),
  constraint scope_public_definitions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to)
);

create table if not exists scope_public_rule_versions (
  public_rule_version_id uuid primary key default gen_random_uuid(),
  public_definition_id uuid not null references scope_public_definitions(public_definition_id) on delete restrict,
  version_number integer not null,
  version_code text not null,
  status text not null default 'DRAFT',
  valid_from date,
  valid_to date,
  schema_version integer not null default 1,
  expression jsonb not null,
  fingerprint text not null,
  approved_at timestamptz,
  approved_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_public_rule_versions_number_chk check (version_number > 0),
  constraint scope_public_rule_versions_status_chk check (status in ('DRAFT','ACTIVE','RETIRED')),
  constraint scope_public_rule_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to),
  constraint scope_public_rule_versions_expression_chk check (jsonb_typeof(expression) = 'object'),
  constraint scope_public_rule_versions_fingerprint_chk check (fingerprint ~ '^[0-9a-f]{64}$'),
  constraint scope_public_rule_versions_number_uk unique (public_definition_id, version_number),
  constraint scope_public_rule_versions_code_uk unique (public_definition_id, version_code)
);

create index if not exists scope_public_rule_versions_lookup_idx
  on scope_public_rule_versions(public_definition_id, status, valid_from, valid_to);

create or replace function scope_public_definitions_guard_code()
returns trigger language plpgsql as $$
begin
  if new.code is distinct from old.code then
    raise exception 'public definition code is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists scope_public_definitions_guard_code_trg on scope_public_definitions;
create trigger scope_public_definitions_guard_code_trg
before update on scope_public_definitions
for each row execute function scope_public_definitions_guard_code();

create or replace function scope_public_rule_versions_guard_active()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(671902277, hashtext(new.public_definition_id::text));
  if tg_op = 'UPDATE' and not (
    (old.status = 'DRAFT' and new.status in ('DRAFT','ACTIVE')) or
    (old.status = 'ACTIVE' and new.status in ('ACTIVE','RETIRED')) or
    (old.status = 'RETIRED' and new.status = 'RETIRED')
  ) then
    raise exception 'invalid public rule version status transition: % -> %', old.status, new.status;
  end if;
  if tg_op = 'UPDATE' and old.status = 'ACTIVE' and (
    new.public_definition_id is distinct from old.public_definition_id or
    new.version_number is distinct from old.version_number or
    new.version_code is distinct from old.version_code or
    new.valid_from is distinct from old.valid_from or
    new.valid_to is distinct from old.valid_to or
    new.schema_version is distinct from old.schema_version or
    new.expression is distinct from old.expression or
    new.fingerprint is distinct from old.fingerprint
  ) then
    raise exception 'active public rule versions are semantically immutable';
  end if;
  if new.status = 'ACTIVE' and exists (
    select 1 from scope_public_rule_versions existing
    where existing.public_definition_id = new.public_definition_id
      and existing.status = 'ACTIVE'
      and existing.public_rule_version_id <> new.public_rule_version_id
      and daterange(coalesce(existing.valid_from, date '0001-01-01'), coalesce(existing.valid_to, date '9999-12-31'), '[]')
        && daterange(coalesce(new.valid_from, date '0001-01-01'), coalesce(new.valid_to, date '9999-12-31'), '[]')
  ) then
    raise exception 'overlapping active public rule versions are forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists scope_public_rule_versions_guard_active_trg on scope_public_rule_versions;
create trigger scope_public_rule_versions_guard_active_trg
before insert or update on scope_public_rule_versions
for each row execute function scope_public_rule_versions_guard_active();

create temporary table scope_public_seed_c2_b (
  code text, label text, description text, owner_type text, owner_code text,
  domain_hints text[], expression jsonb, fingerprint text
) on commit drop;

insert into scope_public_seed_c2_b(code,label,description,owner_type,owner_code,domain_hints,expression,fingerprint) values
('DPS-G1','DPS G1','Public canonique DPS G1','DOMAIN','DPS',array['DPS'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DPS","oiCodes":["G1"]}]}'::jsonb,'7778f2bc26ea44b8a79902dca465c2c7b83704a6af6fd84486e56c2e26146f62'),
('DPS-C1','DPS C1','Public canonique DPS C1','DOMAIN','DPS',array['DPS'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DPS","oiCodes":["C1"]}]}'::jsonb,'b65d781daa91cb8be29eac7b80a20f891ee7bb84993fb3c7d5c154f4b5ba0706'),
('DPS-B1','DPS B1','Public canonique DPS B1','DOMAIN','DPS',array['DPS'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DPS","oiCodes":["B1"]}]}'::jsonb,'f2cdaf01818863f0def1c8931ca056d462f60308845c8edcfa53b988236690f6'),
('DPS-B2','DPS B2','Public canonique DPS B2','DOMAIN','DPS',array['DPS'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DPS","oiCodes":["B2"]}]}'::jsonb,'893e144f4246d8b757305e87f0647375d69f1791ee38a51998271e016dab1b73'),
('DAP-Y1','DAP Y1','Public canonique DAP Y1','DOMAIN','DAP',array['DAP'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DAP","oiCodes":["Y1"]}]}'::jsonb,'d2d8aa3e448d3bc75bad0838a8fdd01543a30d91c728dbef407b0e1e37ec5b95'),
('DAP-Y2','DAP Y2','Public canonique DAP Y2','DOMAIN','DAP',array['DAP'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DAP","oiCodes":["Y2"]}]}'::jsonb,'0ccef1ca89b1c1975baac4566d8bb7abad5a3c24c9fab19fe4c8b3131e59ddd8'),
('DAP-Y3','DAP Y3','Public canonique DAP Y3','DOMAIN','DAP',array['DAP'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DAP","oiCodes":["Y3"]}]}'::jsonb,'092f27f24cc6c53f3e21a54693624a7befc44fe9faf15a7361ce1e44cae052e6'),
('DAP-Y4','DAP Y4','Public canonique DAP Y4','DOMAIN','DAP',array['DAP'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_OI","domainCode":"DAP","oiCodes":["Y4"]}]}'::jsonb,'6d99c50313a40ad615d79d3962bd08b663721fb81bb2cc8a14f1ed0e76be6a6a'),
('FOBA-1','FOBA 1','Public canonique FOBA 1','DOMAIN','FOBA',array['FOBA'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_FOBA_LEVEL","levelCodes":["1"]}]}'::jsonb,'ff8aa4cbf7e887b1db1ebae732d4fc7f12c5830b88ec533d040f92c0a5f38418'),
('FOBA-2','FOBA 2','Public canonique FOBA 2','DOMAIN','FOBA',array['FOBA'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_FOBA_LEVEL","levelCodes":["2"]}]}'::jsonb,'8a4aa61175036deb99225b22f496879475221eff3e803334ddd973b777a5d442'),
('FOBA-3','FOBA 3','Public canonique FOBA 3','DOMAIN','FOBA',array['FOBA'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_FOBA_LEVEL","levelCodes":["3"]}]}'::jsonb,'84054cbb02ecaec8fa73654ddfe0bcff69c368b560d9b3e38d287e9706d9b4a9'),
('AUTO-COND-PL','AUTO COND_PL','Public canonique AUTO COND_PL','DOMAIN','AUTO',array['AUTO'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["COND_PL"]}]}'::jsonb,'c0b8a8ac8eec07ef8a636607a0277eff751ff5026c64391644fd16ff72cd2c89'),
('AUTO-COND-VL','AUTO COND_VL','Public canonique AUTO COND_VL','DOMAIN','AUTO',array['AUTO'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["COND_VL"]}]}'::jsonb,'b22ab28f7891bfdd6ebe367e7eb15a393c9a6cdae667e930928e479f8231b022'),
('AUTO-COND-TP9','AUTO COND_TP9','Public canonique AUTO COND_TP9','DOMAIN','AUTO',array['AUTO'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["COND_TP9"]}]}'::jsonb,'432b4d070a9dfd66cac86035ce2c8469387ef4a893196291028bb99553fda62c'),
('AUTO-GRUTIER','AUTO GRUTIER','Public canonique AUTO GRUTIER','DOMAIN','AUTO',array['AUTO'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["GRUTIER"]}]}'::jsonb,'3572c96062033b3c71dead775bb7fb198b9061ff169f5ba43e9438172e23b419'),
('AUTO-MEA','AUTO MEA','Public canonique AUTO MEA','DOMAIN','AUTO',array['AUTO'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["MEA"]}]}'::jsonb,'21dcb4ce99f8d3c3220d43ddbe22ebc5a326a7fafda37f4b5d8afc3329ab78f7'),
('AUTO-PILOTE-BAT','AUTO PILOTE_BAT','Public canonique AUTO PILOTE_BAT','DOMAIN','AUTO',array['AUTO'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["PILOTE_BAT"]}]}'::jsonb,'37890c536bc78e35442a623967c55e3e68d45a1044ce25fed72ba5e32fe2c81c'),
('FOSPEC-OFSI','FOSPEC OFSI','Public canonique FOSPEC OFSI','DOMAIN','FOSPEC',array['FOSPEC'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["OFSI"]}]}'::jsonb,'da1d396231f560b7714d3430d1d725e0cd9a45d82b8f21cb8736ad736a1b4217'),
('FOSPEC-NAC','FOSPEC NAC','Public canonique FOSPEC NAC','DOMAIN','FOSPEC',array['FOSPEC'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["NAC"]}]}'::jsonb,'59f05abce46fb633c2555a7f013316bca0ea79cef7c62a5e2c0ebcb5eda56055'),
('FOSPEC-OP-VPC','FOSPEC OP_VPC','Public canonique FOSPEC OP_VPC','DOMAIN','FOSPEC',array['FOSPEC'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["OP_VPC"]}]}'::jsonb,'526250dc99ed9b64a3e779d9b1a7780fe25fed211d2da2873587eb5c3f3b7236'),
('FOSPEC-ANTICHUTE','FOSPEC ANTICHUTE','Public canonique FOSPEC ANTICHUTE','DOMAIN','FOSPEC',array['FOSPEC'], '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"predicate":"HAS_COMPETENCE","competenceCodes":["ANTICHUTE"]}]}'::jsonb,'c14388aa6e73942a5e50dccf74cdc04088b5f7495fe63f8e6de38960000afd5e');

insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
select code,label,description,'ACTIVE',owner_type,owner_code,domain_hints,'{"source":"PUBLIC_ENGINE_MIRROR_C2_B"}'::jsonb
from scope_public_seed_c2_b
on conflict (code) do nothing;

insert into scope_public_rule_versions(public_definition_id,version_number,version_code,status,schema_version,expression,fingerprint,approved_at,approved_by,metadata)
select definition.public_definition_id,1,'V1','ACTIVE',1,seed.expression,seed.fingerprint,now(),'C2-B-SEED','{"source":"PUBLIC_ENGINE_MIRROR_C2_B"}'::jsonb
from scope_public_seed_c2_b seed join scope_public_definitions definition on definition.code = seed.code
where not exists (
  select 1 from scope_public_rule_versions existing
  where existing.public_definition_id = definition.public_definition_id and existing.version_number = 1
)
on conflict (public_definition_id,version_number) do nothing;

alter table scope_public_definitions enable row level security;
alter table scope_public_rule_versions enable row level security;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on scope_public_definitions, scope_public_rule_versions from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on scope_public_definitions, scope_public_rule_versions from authenticated;
  end if;
end $$;

insert into monitoring_f7_schema_migrations(version)
values ('scope-public-engine-mirror-c2-b') on conflict (version) do nothing;

commit;
