-- SCOPE-EVENT-Q1 : saisie quantitative métier, additif, idempotent.
-- Un événement QUANTITATIF n’utilise pas scope_attendus / scope_participations / scope_personnes.

create table if not exists scope_saisies_quantitatives (
  evenement_id uuid primary key references scope_evenements(evenement_id),
  nb_attendus integer not null,
  nb_presents integer not null,
  nb_excuses integer not null,
  nb_non_excuses integer not null,
  nb_dispenses integer not null default 0,
  auteur_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_saisies_q_nonneg_chk check (
    nb_attendus >= 0
    and nb_presents >= 0
    and nb_excuses >= 0
    and nb_non_excuses >= 0
    and nb_dispenses >= 0
  ),
  constraint scope_saisies_q_eq_chk check (
    nb_attendus = nb_presents + nb_excuses + nb_non_excuses + nb_dispenses
  )
);

create index if not exists scope_saisies_quantitatives_updated
  on scope_saisies_quantitatives (updated_at desc);
