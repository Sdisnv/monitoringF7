-- SCOPE — QUO-VADIS-COVERAGE-AND-MODEL-1
-- Additif uniquement. Programme 2026 lu en référence, jamais réécrit.

alter table scope_quo_vadis_programmes drop constraint if exists scope_qv_programmes_statut_chk;
alter table scope_quo_vadis_programmes
  add constraint scope_qv_programmes_statut_chk
  check (statut in ('PREPARATION','VALIDATION','VALIDE','PUBLIE','ARCHIVE'));

alter table scope_quo_vadis_obligations drop constraint if exists scope_qv_obligations_source_chk;
alter table scope_quo_vadis_obligations
  add constraint scope_qv_obligations_source_chk
  check (source_type in ('DEFINITION','RECURRENT','MULTI_SESSION','CURSUS','DPS_RULE','FUTURE_DATE','HISTORIQUE','CYCLIQUE','OPTIONNELLE','MANUAL'));

alter table scope_quo_vadis_obligations add column if not exists activity_kind text;
alter table scope_quo_vadis_obligations add column if not exists periodicity_years integer;
alter table scope_quo_vadis_obligations add column if not exists include_in_programme boolean;
alter table scope_quo_vadis_obligations add column if not exists last_occurrence date;
alter table scope_quo_vadis_obligations add column if not exists classification jsonb not null default '{}'::jsonb;

create table if not exists scope_quo_vadis_cursus_step_programmes (
  programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
  step_id uuid not null references scope_quo_vadis_cursus_steps(step_id) on delete cascade,
  retenu boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint scope_qv_cursus_step_programmes_pk primary key(programme_id, step_id)
);

insert into scope_quo_vadis_planning_rules(code, version_code, domain, day_policy, time_policy, duration_minutes, metadata)
values
  ('PLANIF-DPS','2027','DPS','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,120,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-DAP','2027','DAP','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"AUTORISE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,120,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-JSP','2027','JSP','{"MONDAY":"AUTORISE","TUESDAY":"PREFERE","WEDNESDAY":"AUTORISE","THURSDAY":"AUTORISE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"18:30","usualEnd":"20:30"}'::jsonb,120,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-FOBA','2027','FOBA','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"INTERDIT","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:00","usualEnd":"21:30"}'::jsonb,150,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-FOCA','2027','FOCA','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"INTERDIT","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:00","usualEnd":"21:30"}'::jsonb,150,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-FOSPEC','2027','FOSPEC','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,120,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-PR','2027','PR','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,120,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb),
  ('PLANIF-AUTO','2027','AUTO','{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"DECONSEILLE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,'{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb,120,'{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb)
on conflict (code, version_code) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-coverage-1')
on conflict (version) do nothing;
