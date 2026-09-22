-- Additive definitions for QUO VADIS referential administration.
begin;
select pg_advisory_xact_lock(671902274);
alter table scope_quo_vadis_cursus_definitions
  add column if not exists domain_code text references scope_domaines(code),
  add column if not exists cible_id uuid references scope_cibles(cible_id),
  add column if not exists duration_months integer;
alter table scope_quo_vadis_cursus_steps
  add column if not exists duration_minutes integer,
  add column if not exists lieu_id uuid references scope_lieux(lieu_id),
  add column if not exists cible_id uuid references scope_cibles(cible_id),
  add column if not exists preferred_month integer,
  add column if not exists active boolean not null default true;
alter table scope_quo_vadis_planning_rules
  add column if not exists cible_id uuid references scope_cibles(cible_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'scope_qv_cursus_duration_months_chk') then
    alter table scope_quo_vadis_cursus_definitions add constraint scope_qv_cursus_duration_months_chk check (duration_months is null or duration_months > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scope_qv_cursus_step_duration_minutes_chk') then
    alter table scope_quo_vadis_cursus_steps add constraint scope_qv_cursus_step_duration_minutes_chk check (duration_minutes is null or duration_minutes > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scope_qv_cursus_step_preferred_month_chk') then
    alter table scope_quo_vadis_cursus_steps add constraint scope_qv_cursus_step_preferred_month_chk check (preferred_month is null or preferred_month between 1 and 12);
  end if;
end $$;

alter table scope_quo_vadis_cursus_definitions enable row level security;
alter table scope_quo_vadis_cursus_steps enable row level security;
alter table scope_quo_vadis_planning_rules enable row level security;
do $$
declare table_name text; role_name text;
begin
  foreach table_name in array array['scope_quo_vadis_cursus_definitions','scope_quo_vadis_cursus_steps','scope_quo_vadis_planning_rules'] loop
    foreach role_name in array array['anon','authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role_name) then
        execute format('revoke all on %I from %I', table_name, role_name);
      end if;
    end loop;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-referential-management-4') on conflict (version) do nothing;
commit;
