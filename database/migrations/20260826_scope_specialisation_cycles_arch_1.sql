-- SCOPE-SPECIALISATION-CYCLES-ARCH-1
-- Add an optional analytic cycle layer for alternative PAPR/AUTO sessions.
-- Operational events remain the source of truth; standard events keep cycle_id null.

create table if not exists scope_cycles (
  cycle_id uuid primary key default gen_random_uuid(),
  cycle_key text,
  annee integer,
  domaine_code text not null references scope_domaines(code),
  type_cycle text,
  libelle text not null,
  statut text not null default 'PLANIFIE',
  stat_com text,
  qui text,
  date_debut date,
  date_fin date,
  source_type text not null default 'MANUEL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_cycles_domaine_chk check (domaine_code in ('PR','AUTO')),
  constraint scope_cycles_statut_chk check (statut in ('PLANIFIE','REALISE','REPORTE','ANNULE')),
  constraint scope_cycles_dates_chk check (date_fin is null or date_debut is null or date_debut <= date_fin),
  constraint scope_cycles_libelle_chk check (length(trim(libelle)) > 0),
  constraint scope_cycles_source_type_chk check (source_type in ('MANUEL','IMPORT','ARBITRAGE_MOA'))
);

create unique index if not exists scope_cycles_cycle_key_uq
  on scope_cycles (cycle_key)
  where cycle_key is not null;

create index if not exists scope_cycles_rapprochement_idx
  on scope_cycles (domaine_code, annee, type_cycle, stat_com, qui, date_debut, date_fin);

alter table scope_evenements
  add column if not exists cycle_id uuid references scope_cycles(cycle_id) on delete set null;

create index if not exists scope_evenements_cycle_id_idx
  on scope_evenements (cycle_id);

create table if not exists scope_cycle_personnes (
  cycle_id uuid not null references scope_cycles(cycle_id) on delete cascade,
  personne_id text not null references scope_personnes(id),
  role_cycle text not null default 'PARTICIPANT',
  statut_cycle text not null default 'ACTIF',
  session_event_id uuid references scope_evenements(evenement_id) on delete set null,
  participated_event_id uuid references scope_evenements(evenement_id) on delete set null,
  exception_type text,
  exercise_scope jsonb not null default '[]'::jsonb,
  source text not null default 'MANUEL',
  date_debut date,
  date_fin date,
  commentaire text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cycle_id, personne_id, role_cycle),
  constraint scope_cycle_personnes_role_chk check (role_cycle in (
    'PARTICIPANT','FORMATEUR','SURVEILLANT','AUXILIAIRE'
  )),
  constraint scope_cycle_personnes_statut_chk check (statut_cycle in (
    'ACTIF','DISPENSE','EXCLU','NON_RENSEIGNE'
  )),
  constraint scope_cycle_personnes_exception_chk check (
    exception_type is null or exception_type in ('DISPENSE_EXERCICE_INTERNE')
  ),
  constraint scope_cycle_personnes_source_chk check (source in (
    'MANUEL','IMPORT','HERITAGE','ARBITRAGE_MOA'
  )),
  constraint scope_cycle_personnes_dates_chk check (date_fin is null or date_debut is null or date_debut <= date_fin)
);

create index if not exists scope_cycle_personnes_personne_idx
  on scope_cycle_personnes (personne_id);

create index if not exists scope_cycle_personnes_role_idx
  on scope_cycle_personnes (cycle_id, role_cycle, statut_cycle);

create index if not exists scope_cycle_personnes_session_event_idx
  on scope_cycle_personnes (session_event_id);
