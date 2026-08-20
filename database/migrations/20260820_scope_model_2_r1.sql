-- SCOPE-MODEL-2-R1 : historisation temporelle du personnel.
-- Additive. Idempotente. Aucune table monitoring_f7_* n’est touchée.
-- L’identité reste scope_personnes (NIP unique). Les périodes décrivent
-- l’éligibilité à une date. Une population figée (scope_attendus) n’est
-- jamais recalculée par ce script.

create table if not exists scope_personne_periodes (
  periode_id uuid primary key,
  personne_id uuid not null references scope_personnes(personne_id),
  type text not null,
  date_debut date not null,
  date_fin date,
  motif text,
  source text not null default 'MANUEL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_periode_type_chk check (type in ('ACTIF','INDISPONIBLE','SORTI','DEMISSIONNAIRE')),
  constraint scope_periode_dates_chk check (date_fin is null or date_fin >= date_debut)
);

create index if not exists scope_personne_periodes_personne_dates
  on scope_personne_periodes (personne_id, date_debut);

insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
select gen_random_uuid(), p.personne_id, 'ACTIF',
       coalesce(p.date_entree, date '2020-01-01'),
       p.date_sortie,
       null, 'BACKFILL'
from scope_personnes p
where not exists (
  select 1 from scope_personne_periodes x where x.personne_id = p.personne_id
)
  and coalesce(p.statut_rh, 'ACTIF') not in ('SORTI','DEMISSIONNAIRE')
  and p.actif is not false;

insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
select gen_random_uuid(), p.personne_id, 'ACTIF',
       coalesce(p.date_entree, date '2020-01-01'),
       coalesce(p.date_sortie, current_date),
       null, 'BACKFILL'
from scope_personnes p
where not exists (
  select 1 from scope_personne_periodes x where x.personne_id = p.personne_id
)
  and (p.date_sortie is not null or p.statut_rh in ('SORTI','DEMISSIONNAIRE') or p.actif is false);

insert into scope_personne_periodes(periode_id, personne_id, type, date_debut, date_fin, motif, source)
select gen_random_uuid(), p.personne_id,
       case when p.statut_rh = 'DEMISSIONNAIRE' then 'DEMISSIONNAIRE' else 'SORTI' end,
       coalesce(p.date_sortie, coalesce(p.date_entree, date '2020-01-01')),
       null, null, 'BACKFILL'
from scope_personnes p
where (p.date_sortie is not null or p.statut_rh in ('SORTI','DEMISSIONNAIRE') or p.actif is false)
  and not exists (
    select 1 from scope_personne_periodes x
    where x.personne_id = p.personne_id and x.type in ('SORTI','DEMISSIONNAIRE')
  );

insert into monitoring_f7_schema_migrations(version)
values ('scope-model-2-r1')
on conflict (version) do nothing;
