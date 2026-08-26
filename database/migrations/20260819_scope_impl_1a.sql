-- SCOPE-IMPL-1A — schéma nominatif pilote.
-- Additif : ne modifie aucune table monitoring_f7_*.
-- Idempotent. Seed domaines/cibles aligné sur netlify/functions/_scope-schema.js.
-- UUID cibles : gen_random_uuid() + UNIQUE (domaine_code, niveau_code).
-- Le runtime JS utilise randomUUID() + ON CONFLICT DO NOTHING : pas de doublon.

insert into monitoring_f7_schema_migrations(version)
values ('scope-impl-1a')
on conflict (version) do nothing;

create table if not exists scope_domaines (
  code text primary key,
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_domaines_code_chk check (code in ('FOBA','FOCA','DPS','DAP','PR','AUTO','FOSPEC','JSP'))
);

insert into scope_domaines(code, libelle, actif) values
  ('FOBA', 'Formation de base', true),
  ('FOCA', 'Formation des cadres', true),
  ('DPS', 'Défense incendie et protection contre les sinistres', true),
  ('DAP', 'Détachement d’appui', true),
  ('PR', 'Premiers secours', true),
  ('AUTO', 'Automobile', true),
  ('FOSPEC', 'Formations spéciales', true),
  ('JSP', 'Jeunes sapeurs-pompiers', true)
on conflict (code) do nothing;

create table if not exists scope_cibles (
  cible_id uuid primary key,
  domaine_code text not null references scope_domaines(code),
  niveau_code text not null,
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_cibles_unique unique (domaine_code, niveau_code)
);

insert into scope_cibles(cible_id, domaine_code, niveau_code, libelle, actif) values
  (gen_random_uuid(), 'FOBA', '1', 'FOBA 1', true),
  (gen_random_uuid(), 'FOBA', '2', 'FOBA 2', true),
  (gen_random_uuid(), 'FOBA', '3', 'FOBA 3', true),
  (gen_random_uuid(), 'FOCA', 'GEN', 'FOCA', true),
  (gen_random_uuid(), 'DPS', 'GEN', 'DPS', true),
  (gen_random_uuid(), 'DPS', 'G1', 'DPS G1', true),
  (gen_random_uuid(), 'DPS', 'C1', 'DPS C1', true),
  (gen_random_uuid(), 'DPS', 'B1', 'DPS B1', true),
  (gen_random_uuid(), 'DPS', 'B2', 'DPS B2', true),
  (gen_random_uuid(), 'DAP', 'GEN', 'DAP', true),
  (gen_random_uuid(), 'DAP', 'Y1', 'DAP Y1', true),
  (gen_random_uuid(), 'DAP', 'Y2', 'DAP Y2', true),
  (gen_random_uuid(), 'DAP', 'Y3', 'DAP Y3', true),
  (gen_random_uuid(), 'DAP', 'Y4', 'DAP Y4', true),
  (gen_random_uuid(), 'PR', 'G1', 'PAPR G1', true),
  (gen_random_uuid(), 'PR', 'C1', 'PAPR C1', true),
  (gen_random_uuid(), 'PR', 'B1', 'PAPR B1', true),
  (gen_random_uuid(), 'PR', 'B2', 'PAPR B2', true),
  (gen_random_uuid(), 'PR', 'GEN', 'PAPR GEN', true),
  (gen_random_uuid(), 'AUTO', 'VL', 'AUTO VL', true),
  (gen_random_uuid(), 'AUTO', 'PL', 'AUTO PL', true),
  (gen_random_uuid(), 'FOSPEC', 'GEN', 'FOSPEC', true),
  (gen_random_uuid(), 'JSP', 'G1', 'JSP G1', true),
  (gen_random_uuid(), 'JSP', 'C1', 'JSP C1', true),
  (gen_random_uuid(), 'JSP', 'B1', 'JSP B1', true),
  (gen_random_uuid(), 'JSP', 'CAD', 'JSP CAD', true),
  (gen_random_uuid(), 'JSP', 'GEN', 'JSP GEN', true)
on conflict (domaine_code, niveau_code) do nothing;

create table if not exists scope_personnes (
  personne_id uuid primary key,
  nip text not null unique,
  nom text not null,
  prenom text not null,
  grade text,
  actif boolean not null default true,
  date_entree date,
  date_sortie date,
  source text not null default 'MANUEL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_personnes_dates_chk check (date_sortie is null or date_entree is null or date_sortie >= date_entree)
);

create table if not exists scope_affectations (
  affectation_id uuid primary key,
  personne_id uuid not null references scope_personnes(personne_id),
  cible_id uuid not null references scope_cibles(cible_id),
  date_debut date not null,
  date_fin date,
  source text not null default 'MANUEL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_affectations_dates_chk check (date_fin is null or date_fin >= date_debut)
);

create unique index if not exists scope_affectations_open_unique
  on scope_affectations (personne_id, cible_id)
  where date_fin is null;

create index if not exists scope_affectations_personne_cible_date
  on scope_affectations (personne_id, cible_id, date_debut);

create table if not exists scope_evenements (
  evenement_id uuid primary key,
  date date not null,
  domaine_code text not null references scope_domaines(code),
  libelle text not null,
  statut text not null,
  origine text not null default 'NOMINATIF',
  population_figee boolean not null default false,
  population_version integer not null default 0,
  figee_at timestamptz,
  figee_par text,
  cloture_at timestamptz,
  cloture_par text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_evenements_statut_chk check (statut in ('PLANIFIE','REALISE','REPORTE','ANNULE')),
  constraint scope_evenements_origine_chk check (origine in ('NOMINATIF','LEGACY_AGGREGATED')),
  constraint scope_evenements_libelle_chk check (length(trim(libelle)) > 0),
  constraint scope_evenements_version_chk check (version >= 1)
);

create index if not exists scope_evenements_date_statut_domaine
  on scope_evenements (date, statut, domaine_code);

create table if not exists scope_evenement_cibles (
  evenement_id uuid not null references scope_evenements(evenement_id),
  cible_id uuid not null references scope_cibles(cible_id),
  primary key (evenement_id, cible_id)
);

create table if not exists scope_attendus (
  evenement_id uuid not null references scope_evenements(evenement_id),
  personne_id uuid not null references scope_personnes(personne_id),
  inclus boolean not null default true,
  origine text not null,
  origine_retrait text,
  motif_inclusion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (evenement_id, personne_id),
  constraint scope_attendus_origine_chk check (origine in ('REGLE','EXCEPTION_AJOUT')),
  constraint scope_attendus_retrait_chk check (origine_retrait is null or origine_retrait = 'EXCEPTION_RETRAIT')
);

create index if not exists scope_attendus_evenement on scope_attendus (evenement_id);

create table if not exists scope_participations (
  evenement_id uuid not null references scope_evenements(evenement_id),
  personne_id uuid not null references scope_personnes(personne_id),
  statut text not null,
  motif_absence text,
  commentaire text,
  role text not null default 'PARTICIPANT',
  source text not null default 'SAISIE',
  auteur_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (evenement_id, personne_id),
  constraint scope_participations_statut_chk check (statut in (
    'NON_RENSEIGNE','PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','NON_CONCERNE'
  )),
  constraint scope_participations_role_chk check (role in (
    'PARTICIPANT','FORMATEUR','MONITEUR','SURVEILLANT','AUXILIAIRE','RENFORT','REMPLACANT'
  )),
  constraint scope_participations_motif_chk check (
    statut <> 'ABSENT_EXCUSE' or motif_absence is not null
  ),
  constraint scope_participations_motif_val_chk check (
    motif_absence is null or motif_absence in ('MALADIE','ACCIDENT','ARMEE','PROFESSIONNEL','PRIVE','AUTRE')
  ),
  constraint scope_participations_autre_chk check (
    motif_absence is distinct from 'AUTRE'
    or (commentaire is not null and length(trim(commentaire)) > 0)
  )
);

create index if not exists scope_participations_evenement_statut
  on scope_participations (evenement_id, statut);

create index if not exists scope_participations_personne
  on scope_participations (personne_id);

create table if not exists scope_legacy_aggregates (
  legacy_id uuid primary key,
  source_record_id text,
  date date not null,
  domaine_code text not null references scope_domaines(code),
  libelle text,
  nb_convoques integer,
  nb_presents integer,
  nb_excuses integer,
  nb_absents integer,
  payload_v67 jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scope_journal_metier (
  journal_id uuid primary key,
  at timestamptz not null default now(),
  auteur_id text,
  entite text not null,
  entite_id text not null,
  action text not null,
  avant jsonb,
  apres jsonb,
  commentaire text
);

create index if not exists scope_journal_entite
  on scope_journal_metier (entite, entite_id, at desc);
