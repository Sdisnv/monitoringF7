begin;

insert into scope_statcom_referentiel
  (code,label,domain,category,oi_code,specialization,specialization_label,valid_from,valid_to,active,metadata)
values
  ('EMSEA','Séance État-major (forfait)','ADMIN','SEANCE','F0',null,null,'2026-01-01',null,true,
    '{"source":"Décision MOA 08.10.2026","sourceList":"Séances État-major QUO VADIS","canonicalActivity":"Séance État-major","settlementMode":"FORFAIT","hourAccounting":false,"notEquivalentTo":"EXEC"}'::jsonb)
on conflict (code) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-qv-statcom-emsea-20261008')
on conflict (version) do nothing;

commit;
