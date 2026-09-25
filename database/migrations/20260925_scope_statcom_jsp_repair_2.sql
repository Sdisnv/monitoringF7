begin;

insert into scope_statcom_referentiel
  (code,label,domain,category,oi_code,specialization,specialization_label,valid_from,valid_to,active,metadata)
values
  ('010JB1','Exercices JSP B1','JSP','EXERCI','B1',null,null,'2026-01-01',null,true,'{"source":"QUO VADIS ''26","sourceList":"Liste des activités et Stat COMM pour saisie dans ECAWIN","sourceOrder":88}'::jsonb),
  ('010JC1','Exercices JSP C1','JSP','EXERCI','C1',null,null,'2026-01-01',null,true,'{"source":"QUO VADIS ''26","sourceList":"Liste des activités et Stat COMM pour saisie dans ECAWIN","sourceOrder":89}'::jsonb),
  ('010JG1','Exercices JSP G1','JSP','EXERCI','G1',null,null,'2026-01-01',null,true,'{"source":"QUO VADIS ''26","sourceList":"Liste des activités et Stat COMM pour saisie dans ECAWIN","sourceOrder":90}'::jsonb),
  ('COURJSP','Cours JSP','JSP','COURS',null,null,null,'2026-01-01',null,true,'{"source":"QUO VADIS ''26","sourceList":"Liste des activités et Stat COMM pour saisie dans ECAWIN","sourceOrder":91}'::jsonb)
on conflict (code) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-statcom-jsp-repair-2')
on conflict (version) do nothing;

commit;
