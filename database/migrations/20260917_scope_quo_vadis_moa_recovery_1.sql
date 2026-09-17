-- QUO VADIS MOA-RECOVERY-1
-- Politique PLANIF-FOCO (famille, pas un domaine parallèle).
-- Aucune écriture sur les événements / présences / participations 2026.

insert into scope_quo_vadis_planning_rules(code, version_code, domain, day_policy, time_policy, duration_minutes, metadata)
values (
  'PLANIF-FOCO',
  '2027',
  null,
  '{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,
  '{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,
  120,
  '{"source":"QUO-VADIS-MOA-RECOVERY-1","family":"FOCO"}'::jsonb
)
on conflict (code, version_code) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-moa-recovery-1')
on conflict (version) do nothing;
