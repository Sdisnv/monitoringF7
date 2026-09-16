-- SCOPE — QUO-VADIS-CORE-1
-- Additive planning foundation only. No 2026 event, attendu or participation data is rewritten.

create table if not exists scope_lieux (
  lieu_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  nom_court text not null,
  nom_complet text,
  adresse_ligne1 text,
  npa text,
  localite text,
  oi_code text,
  site_code text,
  actif boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_lieux_code_chk check (length(trim(code)) > 0),
  constraint scope_lieux_nom_chk check (length(trim(nom_court)) > 0)
);
create index if not exists scope_lieux_oi_idx on scope_lieux(oi_code, actif);

insert into scope_lieux(code, nom_court, oi_code, metadata)
values
  ('G1-CASERNE', 'Caserne G1', 'G1', '{"source":"QUO-VADIS-CORE-1","addressKnown":false}'::jsonb),
  ('B1-CASERNE', 'Caserne B1', 'B1', '{"source":"QUO-VADIS-CORE-1","addressKnown":false}'::jsonb),
  ('C1-CASERNE', 'Caserne C1', 'C1', '{"source":"QUO-VADIS-CORE-1","addressKnown":false}'::jsonb),
  ('B2-CASERNE', 'Caserne B2', 'B2', '{"source":"QUO-VADIS-CORE-1","addressKnown":false}'::jsonb)
on conflict (code) do update set nom_court = excluded.nom_court, oi_code = excluded.oi_code, updated_at = now();

create table if not exists scope_quo_vadis_programmes (
  programme_id uuid primary key default gen_random_uuid(),
  annee integer not null unique,
  code text not null unique,
  libelle text not null,
  periode_debut date not null,
  periode_fin date not null,
  statut text not null default 'PREPARATION',
  published_at timestamptz,
  archived_at timestamptz,
  revision integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_programmes_statut_chk check (statut in ('PREPARATION','PUBLIE','ARCHIVE')),
  constraint scope_qv_programmes_dates_chk check (periode_debut <= periode_fin),
  constraint scope_qv_programmes_annee_chk check (annee >= 2027)
);

create table if not exists scope_quo_vadis_programme_history (
  history_id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
  revision integer not null,
  change_type text not null,
  snapshot jsonb not null default '{}'::jsonb,
  changed_by text,
  changed_at timestamptz not null default now()
);

create table if not exists scope_quo_vadis_calendar_days (
  calendar_day_id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
  jour date not null,
  type_jour text not null,
  libelle text not null,
  source text not null default 'MANUEL',
  neutralise boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint scope_qv_calendar_type_chk check (type_jour in ('VACANCES_SCOLAIRES','FERIE','VEILLE_FERIE','WEEKEND_FERIE','NEUTRALISATION_INTERNE','DEROGATION')),
  constraint scope_qv_calendar_unique unique(programme_id, jour, type_jour, libelle)
);
create index if not exists scope_qv_calendar_day_idx on scope_quo_vadis_calendar_days(programme_id, jour);

create table if not exists scope_quo_vadis_planning_rules (
  rule_id uuid primary key default gen_random_uuid(),
  code text not null,
  version_code text not null,
  domain text references scope_domaines(code),
  definition_version_id uuid references scope_event_definition_versions(definition_version_id),
  valid_from date,
  valid_to date,
  day_policy jsonb not null default '{}'::jsonb,
  time_policy jsonb not null default '{}'::jsonb,
  duration_minutes integer,
  forbidden_periods jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  capacity jsonb not null default '{}'::jsonb,
  default_lieu_id uuid references scope_lieux(lieu_id),
  derogation_allowed boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_rules_unique unique(code, version_code),
  constraint scope_qv_rules_duration_chk check (duration_minutes is null or duration_minutes > 0),
  constraint scope_qv_rules_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to)
);

create table if not exists scope_quo_vadis_cursus_definitions (
  cursus_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  libelle text not null,
  description text,
  statut text not null default 'ACTIF',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_cursus_statut_chk check (statut in ('ACTIF','INACTIF','ARCHIVE'))
);

create table if not exists scope_quo_vadis_cursus_versions (
  cursus_version_id uuid primary key default gen_random_uuid(),
  cursus_id uuid not null references scope_quo_vadis_cursus_definitions(cursus_id) on delete cascade,
  version_code text not null,
  valid_from date,
  valid_to date,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_cursus_versions_unique unique(cursus_id, version_code),
  constraint scope_qv_cursus_versions_dates_chk check (valid_to is null or valid_from is null or valid_from <= valid_to)
);

create table if not exists scope_quo_vadis_cursus_steps (
  step_id uuid primary key default gen_random_uuid(),
  cursus_version_id uuid not null references scope_quo_vadis_cursus_versions(cursus_version_id) on delete cascade,
  step_code text not null,
  libelle text not null,
  ordre integer not null,
  logical_year integer not null default 1,
  definition_version_id uuid references scope_event_definition_versions(definition_version_id),
  usual_start_time text,
  usual_end_time text,
  crosses_midnight boolean not null default false,
  preferred_day text,
  metadata jsonb not null default '{}'::jsonb,
  constraint scope_qv_cursus_steps_unique unique(cursus_version_id, step_code),
  constraint scope_qv_cursus_steps_order_chk check (ordre >= 1),
  constraint scope_qv_cursus_steps_year_chk check (logical_year >= 1)
);

create table if not exists scope_quo_vadis_cohortes (
  cohorte_id uuid primary key default gen_random_uuid(),
  cursus_version_id uuid not null references scope_quo_vadis_cursus_versions(cursus_version_id),
  code text not null unique,
  libelle text not null,
  start_year integer not null,
  current_logical_year integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists scope_quo_vadis_future_dates (
  future_date_id uuid primary key default gen_random_uuid(),
  target_year integer not null,
  date_debut date not null,
  heure_debut text,
  date_fin date,
  heure_fin text,
  activite_label text not null,
  domain text references scope_domaines(code),
  lieu_id uuid references scope_lieux(lieu_id),
  lieu_libre text,
  remarque text,
  converted_obligation_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_future_year_chk check (target_year >= 2027),
  constraint scope_qv_future_label_chk check (length(trim(activite_label)) > 0)
);
create index if not exists scope_qv_future_year_idx on scope_quo_vadis_future_dates(target_year, date_debut);

create table if not exists scope_quo_vadis_dps_organisation_versions (
  organisation_id uuid primary key default gen_random_uuid(),
  oi_code text not null,
  valid_from date not null,
  valid_to date,
  sections jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_dps_dates_chk check (valid_to is null or valid_from <= valid_to),
  constraint scope_qv_dps_unique unique(oi_code, valid_from)
);

create table if not exists scope_quo_vadis_obligations (
  obligation_id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references scope_quo_vadis_programmes(programme_id) on delete cascade,
  source_type text not null,
  source_ref text,
  definition_version_id uuid references scope_event_definition_versions(definition_version_id),
  cursus_step_id uuid references scope_quo_vadis_cursus_steps(step_id),
  cohorte_id uuid references scope_quo_vadis_cohortes(cohorte_id),
  title text not null,
  domain text references scope_domaines(code),
  cible_codes text[] not null default array[]::text[],
  statut text not null default 'A_PLANIFIER',
  priority integer not null default 100,
  imposed_start_at timestamptz,
  imposed_end_at timestamptz,
  selected_proposal_id uuid,
  scope_evenement_id uuid references scope_evenements(evenement_id) on delete set null,
  exercise_id uuid references scope_exercices(exercice_id) on delete set null,
  statcom_policy text not null default 'A_CONFIRMER',
  statcom_code text,
  lieu_id uuid references scope_lieux(lieu_id),
  lieu_libre text,
  numbering_pattern text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_obligations_source_chk check (source_type in ('DEFINITION','RECURRENT','MULTI_SESSION','CURSUS','DPS_RULE','FUTURE_DATE','MANUAL')),
  constraint scope_qv_obligations_statut_chk check (statut in ('A_PLANIFIER','PROPOSE','PLANIFIE','NON_RETENU','ANNULE')),
  constraint scope_qv_obligations_statcom_chk check (statcom_policy in ('OBLIGATOIRE','FACULTATIF','NON_APPLICABLE','A_CONFIRMER')),
  constraint scope_qv_obligations_title_chk check (length(trim(title)) > 0)
);
create index if not exists scope_qv_obligations_programme_idx on scope_quo_vadis_obligations(programme_id, statut, domain);
create index if not exists scope_qv_obligations_event_idx on scope_quo_vadis_obligations(scope_evenement_id) where scope_evenement_id is not null;
create unique index if not exists scope_qv_obligations_source_uq on scope_quo_vadis_obligations(programme_id, source_type, coalesce(source_ref, ''));

create table if not exists scope_quo_vadis_proposals (
  proposal_id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references scope_quo_vadis_obligations(obligation_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  day_class text not null default 'AUTORISE',
  status text not null default 'PROPOSE',
  reasons jsonb not null default '[]'::jsonb,
  conflict_summary jsonb not null default '{}'::jsonb,
  lieu_id uuid references scope_lieux(lieu_id),
  lieu_libre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_qv_proposals_day_chk check (day_class in ('PREFERE','AUTORISE','DECONSEILLE','INTERDIT')),
  constraint scope_qv_proposals_status_chk check (status in ('PROPOSE','RETENU','ECARTE','DEROGATION')),
  constraint scope_qv_proposals_dates_chk check (starts_at < ends_at)
);
create index if not exists scope_qv_proposals_obligation_idx on scope_quo_vadis_proposals(obligation_id, starts_at);

do $$
begin
  alter table scope_quo_vadis_obligations
    add constraint scope_qv_obligations_selected_proposal_fk
    foreign key (selected_proposal_id) references scope_quo_vadis_proposals(proposal_id) on delete set null not valid;
exception
  when duplicate_object then null;
end $$;

insert into scope_quo_vadis_programmes(annee, code, libelle, periode_debut, periode_fin, statut, metadata)
values (2027, 'QV-2027', 'Programme QUO VADIS 2027', '2027-01-01', '2028-03-31', 'PREPARATION',
        '{"source":"QUO-VADIS-CORE-1","firstNativeProgramme":true}'::jsonb)
on conflict (annee) do nothing;

insert into scope_quo_vadis_planning_rules(code, version_code, domain, day_policy, time_policy, duration_minutes, metadata)
values
  ('FORMATION-GENERALE','2027','FOBA',
   '{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"INTERDIT","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,
   '{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb, 120,
   '{"source":"QUO-VADIS-CORE-1","rule":"friday_excluded_training"}'::jsonb),
  ('DAP-VENDREDI-AUTORISE','2027','DAP',
   '{"MONDAY":"AUTORISE","TUESDAY":"AUTORISE","WEDNESDAY":"AUTORISE","THURSDAY":"PREFERE","FRIDAY":"AUTORISE","SATURDAY":"AUTORISE","SUNDAY":"DECONSEILLE"}'::jsonb,
   '{"usualStart":"19:30","usualEnd":"21:30"}'::jsonb, 120,
   '{"source":"QUO-VADIS-CORE-1","exception":"DAP may allow Friday"}'::jsonb)
on conflict (code, version_code) do nothing;

insert into scope_quo_vadis_cursus_definitions(code, libelle, description, metadata)
values ('CI-DPS', 'CI DPS', 'Cursus générique CI DPS sur deux années logiques.', '{"source":"QUO-VADIS-CORE-1"}'::jsonb)
on conflict (code) do nothing;

insert into scope_quo_vadis_cursus_versions(cursus_id, version_code, valid_from, metadata)
select d.cursus_id, '2027', '2027-01-01', '{"source":"QUO-VADIS-CORE-1"}'::jsonb
from scope_quo_vadis_cursus_definitions d
where d.code = 'CI-DPS'
on conflict (cursus_id, version_code) do nothing;

insert into scope_quo_vadis_cursus_steps(cursus_version_id, step_code, libelle, ordre, logical_year, usual_start_time, usual_end_time, crosses_midnight, preferred_day, metadata)
select v.cursus_version_id, s.step_code, s.libelle, s.ordre, s.logical_year, s.usual_start_time, s.usual_end_time, s.crosses_midnight, s.preferred_day, s.metadata::jsonb
from scope_quo_vadis_cursus_versions v
join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
cross join (values
  ('M01','Module 1',1,1,'19:30','21:30',false,'THURSDAY','{"module":1}'),
  ('M02','Module 2',2,1,'19:30','21:30',false,'THURSDAY','{"module":2}'),
  ('M03','Module 3',3,1,'19:30','21:30',false,'THURSDAY','{"module":3}'),
  ('M04','Module 4',4,1,'19:30','21:30',false,'THURSDAY','{"module":4}'),
  ('M05','Module 5',5,1,'19:30','21:30',false,'THURSDAY','{"module":5}'),
  ('M06','Module 6',6,2,'19:30','21:30',false,'THURSDAY','{"module":6}'),
  ('M07','Module 7',7,2,'19:30','21:30',false,'THURSDAY','{"module":7}'),
  ('M08','Module 8',8,2,'19:30','21:30',false,'THURSDAY','{"module":8}'),
  ('M09','Module 9',9,2,'19:30','21:30',false,'THURSDAY','{"module":9}'),
  ('M10','Module 10 - test final',10,2,'18:00','08:00',true,'SATURDAY','{"module":10,"finalTest":true}')
) as s(step_code, libelle, ordre, logical_year, usual_start_time, usual_end_time, crosses_midnight, preferred_day, metadata)
where d.code = 'CI-DPS' and v.version_code = '2027'
on conflict (cursus_version_id, step_code) do nothing;

insert into scope_quo_vadis_cohortes(cursus_version_id, code, libelle, start_year, current_logical_year, metadata)
select v.cursus_version_id, c.code, c.libelle, c.start_year, c.current_logical_year, c.metadata::jsonb
from scope_quo_vadis_cursus_versions v
join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
cross join (values
  ('CI-DPS-2026', 'CI DPS cohorte 2026', 2026, 2, '{"source":"QUO-VADIS-CORE-1","programme2027Scope":"modules 6-10"}'),
  ('CI-DPS-2027', 'CI DPS cohorte 2027', 2027, 1, '{"source":"QUO-VADIS-CORE-1","programme2027Scope":"modules 1-5"}')
) as c(code, libelle, start_year, current_logical_year, metadata)
where d.code = 'CI-DPS' and v.version_code = '2027'
on conflict (code) do nothing;

insert into scope_quo_vadis_cursus_programmes(programme_id, cursus_id, retenu, justification, metadata)
select p.programme_id, d.cursus_id, true, 'Cursus CI DPS retenu pour valider la planification 2027 sur deux années.', '{"source":"QUO-VADIS-PILOTAGE-2","defaultSelection":true}'::jsonb
from scope_quo_vadis_programmes p
join scope_quo_vadis_cursus_definitions d on d.code = 'CI-DPS'
where p.annee = 2027
on conflict (programme_id, cursus_id) do nothing;

insert into scope_quo_vadis_dps_organisation_versions(oi_code, valid_from, sections, metadata)
values
  ('G1', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]},{"section":"N04","halfSections":["N04a","N04b"]},{"section":"N05","halfSections":["N05a","N05b"]},{"section":"N06","reserve":true,"label":"G1 N06"}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb),
  ('C1', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb),
  ('B1', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb),
  ('B2', '2027-02-01', '[{"section":"N01","halfSections":["N01a","N01b"]},{"section":"N02","halfSections":["N02a","N02b"]},{"section":"N03","halfSections":["N03a","N03b"]}]'::jsonb, '{"source":"QUO-VADIS-CORE-1","configurableChangeDate":true}'::jsonb)
on conflict (oi_code, valid_from) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-core-1')
on conflict (version) do nothing;
