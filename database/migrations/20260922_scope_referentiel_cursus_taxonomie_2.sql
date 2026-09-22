-- Additive SCOPE taxonomy alignment. Existing events and annual decisions are untouched.
alter table scope_domaines drop constraint if exists scope_domaines_code_chk;
alter table scope_domaines add constraint scope_domaines_code_chk
  check (code in ('DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','PR','AUTO'));

insert into scope_domaines(code, libelle, actif, nature, parent_code, libelle_affiche)
values ('FOCO', 'Formation continue', true, 'DOMAINE', null, 'FOCO')
on conflict (code) do update set nature = 'DOMAINE', parent_code = null, libelle_affiche = 'FOCO';

update scope_domaines set nature = 'DOMAINE', parent_code = null, libelle_affiche = code
where code in ('PR', 'AUTO');

insert into scope_cibles(cible_id, domaine_code, niveau_code, libelle, actif)
values
  (gen_random_uuid(), 'FOCO', 'DPS', 'DPS', true),
  (gen_random_uuid(), 'FOCO', 'DAP', 'DAP', true),
  (gen_random_uuid(), 'FOCO', 'JSP', 'JSP', true),
  (gen_random_uuid(), 'PR', 'PAPR', 'PAPR', true),
  (gen_random_uuid(), 'AUTO', 'TP9', 'cond TP9', true),
  (gen_random_uuid(), 'AUTO', 'GRUTIER', 'Grutier', true),
  (gen_random_uuid(), 'AUTO', 'MEA', 'MEA', true),
  (gen_random_uuid(), 'AUTO', 'BAT', 'Pilote BAT', true)
on conflict (domaine_code, niveau_code) do nothing;

alter table scope_quo_vadis_cursus_step_programmes alter column retenu set default false;
alter table scope_quo_vadis_future_dates add column if not exists cursus_id uuid
  references scope_quo_vadis_cursus_definitions(cursus_id);

do $$
declare
  table_name text;
  role_name text;
begin
  foreach table_name in array array[
    'scope_domaines', 'scope_cibles', 'scope_quo_vadis_cursus_definitions',
    'scope_quo_vadis_cursus_versions', 'scope_quo_vadis_cursus_steps',
    'scope_quo_vadis_cursus_programmes', 'scope_quo_vadis_cursus_step_programmes',
    'scope_quo_vadis_future_dates'
  ] loop
    execute format('alter table %I enable row level security', table_name);
    foreach role_name in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = role_name) then
        execute format('revoke all on %I from %I', table_name, role_name);
      end if;
    end loop;
  end loop;
end $$;

insert into monitoring_f7_schema_migrations(version)
values ('scope-referentiel-cursus-taxonomie-2') on conflict (version) do nothing;
