-- SCOPE-MODEL-2 : référentiel métier, motifs d’excuse, permutation DAP,
-- quantitatif détaillé, suivi nominatif configurable.
-- Additive. Aucune suppression de données. Aucune table monitoring_f7_*.

alter table scope_domaines add column if not exists nature text;
alter table scope_domaines add column if not exists parent_code text;
alter table scope_domaines add column if not exists libelle_affiche text;

update scope_domaines
set nature = coalesce(nature, 'DOMAINE'),
    libelle_affiche = coalesce(libelle_affiche, case when code = 'PR' then 'PAPR' else code end);

update scope_domaines
set parent_code = 'FOSPEC',
    nature = 'SOUS_DOMAINE',
    libelle_affiche = case when code = 'PR' then 'PAPR' else 'AUTO' end
where code in ('PR', 'AUTO');

update scope_domaines
set libelle = 'Protection respiratoire', libelle_affiche = 'PAPR'
where code = 'PR';

alter table scope_domaines drop constraint if exists scope_domaines_nature_chk;
alter table scope_domaines add constraint scope_domaines_nature_chk
  check (nature in ('DOMAINE', 'SOUS_DOMAINE'));

alter table scope_domaines drop constraint if exists scope_domaines_parent_fk;
alter table scope_domaines
  add constraint scope_domaines_parent_fk
  foreign key (parent_code) references scope_domaines(code);

create table if not exists scope_sous_domaines (
  code text primary key,
  domaine_parent text not null references scope_domaines(code),
  libelle text not null,
  libelle_affiche text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into scope_sous_domaines(code, domaine_parent, libelle, libelle_affiche, actif)
values
  ('PR', 'FOSPEC', 'Protection respiratoire', 'PAPR', true),
  ('AUTO', 'FOSPEC', 'Automobile', 'AUTO', true)
on conflict (code) do update set
  domaine_parent = excluded.domaine_parent,
  libelle = excluded.libelle,
  libelle_affiche = excluded.libelle_affiche,
  updated_at = now();

alter table scope_evenements add column if not exists sous_domaine_code text;
update scope_evenements
set sous_domaine_code = domaine_code
where domaine_code in ('PR', 'AUTO') and sous_domaine_code is null;

alter table scope_participations add column if not exists cible_suivie_id uuid;
alter table scope_participations drop constraint if exists scope_participations_statut_chk;
alter table scope_participations add constraint scope_participations_statut_chk check (statut in (
  'NON_RENSEIGNE','PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','NON_CONCERNE','PERMUTATION'
));
alter table scope_participations drop constraint if exists scope_participations_motif_val_chk;
alter table scope_participations add constraint scope_participations_motif_val_chk check (
  motif_absence is null or motif_absence in (
    'PRIVE','PROFESSIONNEL','ARMEE','ACCIDENT_MALADIE','MALADIE','ACCIDENT','AUTRE','NON_PRECISE'
  )
);
alter table scope_participations drop constraint if exists scope_participations_permutation_motif_chk;
alter table scope_participations add constraint scope_participations_permutation_motif_chk check (
  statut <> 'PERMUTATION' or motif_absence is null
);

alter table scope_saisies_quantitatives add column if not exists nb_excuses_prive integer;
alter table scope_saisies_quantitatives add column if not exists nb_excuses_professionnel integer;
alter table scope_saisies_quantitatives add column if not exists nb_excuses_armee integer;
alter table scope_saisies_quantitatives add column if not exists nb_excuses_accident_maladie integer;
alter table scope_saisies_quantitatives add column if not exists nb_excuses_non_precise integer;
alter table scope_saisies_quantitatives add column if not exists nb_permutations integer;

update scope_saisies_quantitatives
set nb_excuses_prive = coalesce(nb_excuses_prive, 0),
    nb_excuses_professionnel = coalesce(nb_excuses_professionnel, 0),
    nb_excuses_armee = coalesce(nb_excuses_armee, 0),
    nb_excuses_accident_maladie = coalesce(nb_excuses_accident_maladie, 0),
    nb_excuses_non_precise = coalesce(
      nb_excuses_non_precise,
      case
        when coalesce(nb_excuses_prive,0) + coalesce(nb_excuses_professionnel,0)
           + coalesce(nb_excuses_armee,0) + coalesce(nb_excuses_accident_maladie,0) = 0
        then nb_excuses
        else 0
      end
    ),
    nb_permutations = coalesce(nb_permutations, 0);

alter table scope_saisies_quantitatives alter column nb_excuses_prive set default 0;
alter table scope_saisies_quantitatives alter column nb_excuses_professionnel set default 0;
alter table scope_saisies_quantitatives alter column nb_excuses_armee set default 0;
alter table scope_saisies_quantitatives alter column nb_excuses_accident_maladie set default 0;
alter table scope_saisies_quantitatives alter column nb_excuses_non_precise set default 0;
alter table scope_saisies_quantitatives alter column nb_permutations set default 0;
alter table scope_saisies_quantitatives alter column nb_excuses_prive set not null;
alter table scope_saisies_quantitatives alter column nb_excuses_professionnel set not null;
alter table scope_saisies_quantitatives alter column nb_excuses_armee set not null;
alter table scope_saisies_quantitatives alter column nb_excuses_accident_maladie set not null;
alter table scope_saisies_quantitatives alter column nb_excuses_non_precise set not null;
alter table scope_saisies_quantitatives alter column nb_permutations set not null;

alter table scope_saisies_quantitatives drop constraint if exists scope_saisies_q_motifs_chk;
alter table scope_saisies_quantitatives add constraint scope_saisies_q_motifs_chk check (
  nb_excuses = nb_excuses_prive + nb_excuses_professionnel + nb_excuses_armee
    + nb_excuses_accident_maladie + nb_excuses_non_precise
);
alter table scope_saisies_quantitatives drop constraint if exists scope_saisies_q_perm_chk;
alter table scope_saisies_quantitatives add constraint scope_saisies_q_perm_chk check (
  nb_permutations >= 0 and nb_permutations <= nb_presents
);

alter table scope_personnes add column if not exists statut_rh text;
update scope_personnes
set statut_rh = coalesce(statut_rh, case when actif = false then 'INACTIF' else 'ACTIF' end);
alter table scope_personnes alter column statut_rh set default 'ACTIF';
alter table scope_personnes alter column statut_rh set not null;
alter table scope_personnes drop constraint if exists scope_personnes_statut_rh_chk;
alter table scope_personnes add constraint scope_personnes_statut_rh_chk
  check (statut_rh in ('ACTIF','INACTIF','SORTI','DEMISSIONNAIRE'));

create table if not exists scope_suivi_nominatif (
  suivi_id uuid primary key,
  portee text not null,
  domaine_code text references scope_domaines(code),
  sous_domaine_code text references scope_sous_domaines(code),
  cible_id uuid references scope_cibles(cible_id),
  nominatif_autorise boolean not null,
  date_debut date not null,
  date_fin date,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_suivi_portee_chk check (portee in ('GLOBAL','DOMAINE','SOUS_DOMAINE','CIBLE')),
  constraint scope_suivi_dates_chk check (date_fin is null or date_fin >= date_debut)
);

insert into scope_suivi_nominatif(
  suivi_id, portee, nominatif_autorise, date_debut, commentaire
) values (
  '8c0a0002-2026-4000-8000-000000000001',
  'GLOBAL', true, date '2020-01-01',
  'MODEL-2 : le suivi nominatif est possible pour tous les domaines. Ne change pas le mode des événements existants.'
)
on conflict (suivi_id) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-model-2')
on conflict (version) do nothing;
