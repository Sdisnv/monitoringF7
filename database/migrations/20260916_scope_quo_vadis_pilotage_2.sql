-- SCOPE — QUO-VADIS-PILOTAGE-2
-- Additif uniquement. Sélection des cursus par programme, sans toucher aux données opérationnelles 2026.

create table if not exists scope_quo_vadis_cursus_programmes (
  programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
  cursus_id uuid not null references scope_quo_vadis_cursus_definitions(cursus_id) on delete cascade,
  retenu boolean not null default false,
  justification text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_cursus_programmes_pk primary key(programme_id, cursus_id)
);

insert into scope_quo_vadis_cursus_programmes(programme_id, cursus_id, retenu, justification, metadata)
select p.programme_id, d.cursus_id, true, 'Cursus CI DPS retenu pour valider la planification 2027 sur deux années.', '{"source":"QUO-VADIS-PILOTAGE-2","defaultSelection":true}'::jsonb
from scope_quo_vadis_programmes p
join scope_quo_vadis_cursus_definitions d on d.code = 'CI-DPS'
where p.annee = 2027
on conflict (programme_id, cursus_id) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-pilotage-2')
on conflict (version) do nothing;
