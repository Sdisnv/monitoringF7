-- SCOPE-PERMUTATION-RECOVERY-FINAL-1
-- Trace minimale des permutations et rattrapages.

alter table scope_evenements add column if not exists exercise_equivalence_key text;

create index if not exists scope_evenements_equivalence_idx
  on scope_evenements (domaine_code, exercise_equivalence_key);

create table if not exists scope_permutations (
  permutation_id uuid primary key,
  personne_id text not null references scope_personnes(id),
  source_evenement_id uuid not null references scope_evenements(evenement_id),
  source_exercise_key text not null,
  source_cible_id uuid references scope_cibles(cible_id),
  source_date date,
  rattrapage_evenement_id uuid references scope_evenements(evenement_id),
  rattrapage_cible_id uuid references scope_cibles(cible_id),
  rattrapage_date date,
  statut text not null,
  regularisation_motif text,
  commentaire text,
  auteur_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_permutations_statut_chk check (statut in ('A_RATTRAPER','RATTRAPPE','A_REGULARISER','REGULARISE')),
  constraint scope_permutations_regularisation_chk check (
    statut <> 'REGULARISE' or regularisation_motif is not null
  )
);

create unique index if not exists scope_permutations_open_source_idx
  on scope_permutations(personne_id, source_evenement_id);

create index if not exists scope_permutations_lookup_idx
  on scope_permutations(personne_id, source_exercise_key, statut);
