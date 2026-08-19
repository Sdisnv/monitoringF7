-- SCOPE-OBJECTIVES-1 : référentiel temporel d’objectifs, additif, idempotent.
-- Aucun seuil métier SDIS n’est saisi ici. Les valeurs 80/85/90 sont des exemples d’architecture.

create table if not exists scope_objectifs (
  objectif_id uuid primary key,
  portee text not null,
  domaine_code text references scope_domaines(code),
  cible_id uuid references scope_cibles(cible_id),
  date_debut date not null,
  date_fin date,
  seuil_pct numeric(5,1) not null,
  actif boolean not null default true,
  commentaire text,
  auteur_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_objectifs_portee_chk check (portee in ('GLOBAL','DOMAINE','CIBLE')),
  constraint scope_objectifs_coherence_chk check (
    (portee = 'GLOBAL' and domaine_code is null and cible_id is null)
    or (portee = 'DOMAINE' and domaine_code is not null and cible_id is null)
    or (portee = 'CIBLE' and cible_id is not null)
  ),
  constraint scope_objectifs_seuil_chk check (seuil_pct >= 0 and seuil_pct <= 100),
  constraint scope_objectifs_dates_chk check (date_fin is null or date_fin >= date_debut)
);

create index if not exists scope_objectifs_portee_dates_idx
  on scope_objectifs (portee, domaine_code, cible_id, date_debut);

create index if not exists scope_objectifs_actif_idx
  on scope_objectifs (actif, date_debut);
