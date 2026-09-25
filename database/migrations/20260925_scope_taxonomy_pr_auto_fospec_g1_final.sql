-- G1-FINAL: PR, AUTO and FOSPEC are independent canonical domains.
begin;

select pg_advisory_xact_lock(671902295);

-- Historical FOSPEC/PR and FOSPEC/AUTO rows are normalized on read and here in storage.
update scope_evenements
set domaine_code = sous_domaine_code,
    sous_domaine_code = null
where domaine_code = 'FOSPEC'
  and sous_domaine_code in ('PR', 'AUTO');

-- Current production rows already carry the canonical domain but retain the old duplicate marker.
update scope_evenements
set sous_domaine_code = null
where domaine_code in ('PR', 'AUTO')
  and sous_domaine_code = domaine_code;

-- Keep the historical referential rows for traceability, but prevent active reuse.
update scope_sous_domaines
set actif = false,
    updated_at = now()
where code in ('PR', 'AUTO')
  and domaine_code = 'FOSPEC'
  and actif is true;

insert into monitoring_f7_schema_migrations(version)
values ('scope-taxonomy-pr-auto-fospec-g1-final')
on conflict (version) do nothing;

commit;
