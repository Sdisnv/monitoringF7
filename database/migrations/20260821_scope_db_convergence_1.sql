-- SCOPE DB-CONVERGENCE-1
-- Structure-only migration for the SCOPE backend around the new Personnel model.
-- Do not redefine scope_personnes or scope_affectations: production keeps the
-- nominative model already deployed there.

create table if not exists monitoring_f7_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

insert into monitoring_f7_schema_migrations(version)
values ('20260821_scope_db_convergence_1')
on conflict (version) do nothing;

create table if not exists scope_domaines (
  code text primary key,
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scope_sous_domaines (
  code text primary key,
  domaine_code text not null references scope_domaines(code),
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scope_cibles (
  cible_id uuid primary key default gen_random_uuid(),
  domaine_code text not null references scope_domaines(code),
  niveau_code text not null,
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_cibles_unique unique (domaine_code, niveau_code)
);

create table if not exists scope_suivi_nominatif (
  suivi_id uuid primary key default gen_random_uuid(),
  portee text not null,
  domaine_code text references scope_domaines(code),
  sous_domaine_code text references scope_sous_domaines(code),
  cible_id uuid references scope_cibles(cible_id),
  nominatif_autorise boolean not null default true,
  date_debut date not null,
  date_fin date,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_suivi_nominatif_portee_chk check (portee in ('GLOBAL','DOMAINE','SOUS_DOMAINE','CIBLE')),
  constraint scope_suivi_nominatif_dates_chk check (date_fin is null or date_fin >= date_debut)
);

create table if not exists scope_personne_periodes (
  periode_id uuid primary key,
  personne_id text not null references scope_personnes(id),
  type text not null,
  date_debut date not null,
  date_fin date,
  motif text,
  source text not null default 'MANUEL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_personne_periodes_dates_chk check (date_fin is null or date_fin >= date_debut)
);

create table if not exists scope_evenements (
  evenement_id uuid primary key,
  date date not null,
  domaine_code text not null references scope_domaines(code),
  sous_domaine_code text references scope_sous_domaines(code),
  libelle text not null,
  statut text not null,
  origine text not null default 'NOMINATIF',
  mode_suivi text not null default 'NOMINATIF',
  population_figee boolean not null default false,
  population_version integer not null default 0,
  figee_at timestamptz,
  figee_par text,
  cloture_at timestamptz,
  cloture_par text,
  version integer not null default 1,
  identifiant_externe text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_evenements_statut_chk check (statut in ('PLANIFIE','REALISE','REPORTE','ANNULE')),
  constraint scope_evenements_origine_chk check (origine in ('NOMINATIF','LEGACY_AGGREGATED')),
  constraint scope_evenements_mode_suivi_chk check (mode_suivi in ('NOMINATIF','QUANTITATIF','LEGACY')),
  constraint scope_evenements_version_chk check (version >= 1)
);

create table if not exists scope_evenement_cibles (
  evenement_id uuid not null references scope_evenements(evenement_id),
  cible_id uuid not null references scope_cibles(cible_id),
  primary key (evenement_id, cible_id)
);

create table if not exists scope_attendus (
  evenement_id uuid not null references scope_evenements(evenement_id),
  personne_id text not null references scope_personnes(id),
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

create table if not exists scope_participations (
  evenement_id uuid not null references scope_evenements(evenement_id),
  personne_id text not null references scope_personnes(id),
  statut text not null,
  motif_absence text,
  commentaire text,
  role text not null default 'PARTICIPANT',
  source text not null default 'SAISIE',
  auteur_id text,
  cible_suivie_id uuid references scope_cibles(cible_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (evenement_id, personne_id),
  constraint scope_participations_statut_chk check (statut in (
    'NON_RENSEIGNE','PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','NON_CONCERNE'
  )),
  constraint scope_participations_role_chk check (role in (
    'PARTICIPANT','FORMATEUR','SURVEILLANT','AUXILIAIRE','RENFORT','REMPLACANT'
  ))
);

create table if not exists scope_saisies_quantitatives (
  evenement_id uuid primary key references scope_evenements(evenement_id),
  nb_convoques integer not null default 0,
  nb_presents integer not null default 0,
  nb_excuses integer not null default 0,
  nb_absents integer not null default 0,
  commentaire text,
  auteur_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  evenement_id uuid references scope_evenements(evenement_id),
  fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scope_imports (
  import_id uuid primary key,
  source_filename text,
  source_sha256 text,
  imported_par text,
  statut text not null default 'COMMITE',
  nb_lignes integer not null default 0,
  rapport jsonb,
  created_at timestamptz not null default now()
);

create table if not exists scope_import_lignes (
  import_id uuid not null references scope_imports(import_id),
  ligne_no integer not null,
  fingerprint text not null,
  statut text not null,
  type_propose text,
  evenement_id uuid references scope_evenements(evenement_id),
  legacy_id uuid references scope_legacy_aggregates(legacy_id),
  payload_source jsonb,
  raison text,
  action text,
  created_at timestamptz not null default now(),
  primary key (import_id, ligne_no)
);

create table if not exists scope_objectifs (
  objectif_id uuid primary key default gen_random_uuid(),
  portee text not null,
  domaine_code text references scope_domaines(code),
  sous_domaine_code text references scope_sous_domaines(code),
  cible_id uuid references scope_cibles(cible_id),
  seuil_pct numeric(5,2),
  date_debut date not null,
  date_fin date,
  actif boolean not null default true,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_objectifs_dates_chk check (date_fin is null or date_fin >= date_debut)
);

create table if not exists scope_regles_bascule (
  regle_id uuid primary key default gen_random_uuid(),
  portee text not null,
  cible_id uuid references scope_cibles(cible_id),
  domaine_code text references scope_domaines(code),
  date_bascule date not null,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scope_alertes_acquittements (
  acquittement_id uuid primary key,
  fingerprint text not null,
  code text not null,
  entity_type text not null,
  entity_id text not null,
  utilisateur_id text not null,
  commentaire text,
  created_at timestamptz not null default now(),
  constraint scope_alertes_acquittements_unique unique (utilisateur_id, fingerprint)
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

create index if not exists scope_suivi_nominatif_lookup on scope_suivi_nominatif (portee, domaine_code, sous_domaine_code, cible_id, date_debut);
create index if not exists scope_personne_periodes_personne on scope_personne_periodes (personne_id, date_debut);
create index if not exists scope_evenements_date_statut_domaine on scope_evenements (date, statut, domaine_code);
create index if not exists scope_evenements_identifiant_externe on scope_evenements (identifiant_externe);
create index if not exists scope_evenement_cibles_cible on scope_evenement_cibles (cible_id);
create index if not exists scope_attendus_evenement on scope_attendus (evenement_id);
create index if not exists scope_attendus_personne on scope_attendus (personne_id);
create index if not exists scope_participations_evenement_statut on scope_participations (evenement_id, statut);
create index if not exists scope_participations_personne on scope_participations (personne_id);
create index if not exists scope_legacy_aggregates_fingerprint on scope_legacy_aggregates (fingerprint);
create index if not exists scope_import_lignes_fingerprint on scope_import_lignes (fingerprint);
create index if not exists scope_objectifs_portee on scope_objectifs (portee, domaine_code, sous_domaine_code, cible_id, actif);
create index if not exists scope_regles_bascule_portee on scope_regles_bascule (portee, domaine_code, cible_id);
create index if not exists scope_journal_entite on scope_journal_metier (entite, entite_id, at desc);
