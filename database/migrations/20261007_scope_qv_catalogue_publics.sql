-- Operator-run only. The DPS function population remains unresolved until dated personnel-function facts are supplied.
-- One statement keeps this seed atomic both standalone and inside a clone rollback transaction.
do $migration$ begin
perform pg_advisory_xact_lock(671902276);
drop table if exists pg_temp.scope_qv_catalogue_public_seed;

create temporary table scope_qv_catalogue_public_seed on commit drop as
select * from (values
  ('SDIS-TOUS','Tout le SDIS','SDIS',array['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']::text[],
   '{"predicate":"PERSON_ELIGIBLE_AT"}'::jsonb,'858cc7d5cc80eca95b2ed88b4d59abe045a49a9ac97f2e024d7700123d860f91'),
  ('DPS-CHEFS-SECTION-REMPLACANTS','Chefs de section DPS et remplaçants','DPS',array['DPS']::text[],
   '{"op":"ALL","children":[{"predicate":"PERSON_ELIGIBLE_AT"},{"op":"ALL","children":[{"predicate":"HAS_DOMAIN_ASSIGNMENT","domainCodes":["DPS"]},{"predicate":"HAS_PERSON_FUNCTION","functionCodes":["DPS_CHEF_SECTION","DPS_REMPLACANT_CHEF_SECTION"]}]}]}'::jsonb,
   'd2815c11eed54d696e82e9e8591a49ebcf5643182e1e3a4cd644d9b975ddcab9')
) as seed(code,label,owner_code,domain_hints,expression,fingerprint);

insert into scope_public_definitions(code,label,description,status,owner_type,owner_code,domain_hints,metadata)
select code,label,'Public canonique ' || label,'ACTIVE','DOMAIN',owner_code,domain_hints,
  '{"source":"QV_CATALOGUE_CANONIQUE_20261007","personFunctionMapping":"PENDING_INDEX_SYNC"}'::jsonb
from scope_qv_catalogue_public_seed on conflict (code) do nothing;

if exists (select 1 from scope_qv_catalogue_public_seed s join scope_public_definitions d using (code)
  where d.label<>s.label or d.status<>'ACTIVE' or d.owner_type<>'DOMAIN'
    or d.owner_code<>s.owner_code or d.domain_hints<>s.domain_hints) then
  raise exception 'QV Catalogue public definition conflict';
end if;

insert into scope_public_rule_versions(public_definition_id,version_number,version_code,status,schema_version,expression,fingerprint,approved_at,approved_by,metadata)
select d.public_definition_id,1,'V1','ACTIVE',1,s.expression,s.fingerprint,now(),'QV-MOA-20261007',
  '{"source":"QV_CATALOGUE_CANONIQUE_20261007","personFunctionMapping":"PENDING_INDEX_SYNC"}'::jsonb
from scope_qv_catalogue_public_seed s join scope_public_definitions d using (code)
where not exists (select 1 from scope_public_rule_versions v where v.public_definition_id=d.public_definition_id)
on conflict (public_definition_id,version_number) do nothing;

if exists (select 1 from scope_qv_catalogue_public_seed s join scope_public_definitions d using (code)
  left join scope_public_rule_versions v on v.public_definition_id=d.public_definition_id and v.status='ACTIVE'
  where v.fingerprint is distinct from s.fingerprint or v.expression is distinct from s.expression
    or v.schema_version<>1) then
  raise exception 'QV Catalogue public rule conflict';
end if;
end $migration$;
