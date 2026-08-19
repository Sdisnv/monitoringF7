-- SCOPE-DATA-5-R1 — bascule nominative par cible (additif).
-- Ne modifie aucune table monitoring_f7_*.
-- Seed uniquement DAP/Y4 = 2026-08-19. Aucune autre règle, aucune règle globale.

insert into monitoring_f7_schema_migrations(version)
values ('scope-data-5-r1')
on conflict (version) do nothing;

alter table scope_regles_bascule add column if not exists regle_id uuid;
alter table scope_regles_bascule add column if not exists portee text;
alter table scope_regles_bascule add column if not exists cible_id uuid references scope_cibles(cible_id);
alter table scope_regles_bascule add column if not exists created_at timestamptz default now();

update scope_regles_bascule set portee = 'DOMAINE' where portee is null;
update scope_regles_bascule set regle_id = gen_random_uuid() where regle_id is null;

alter table scope_regles_bascule drop constraint if exists scope_regles_bascule_pkey;
alter table scope_regles_bascule alter column domaine_code drop not null;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'scope_regles_bascule' and constraint_type = 'PRIMARY KEY'
  ) then
    alter table scope_regles_bascule alter column regle_id set default gen_random_uuid();
    alter table scope_regles_bascule alter column regle_id set not null;
    alter table scope_regles_bascule add primary key (regle_id);
  end if;
end $$;

create unique index if not exists scope_regles_bascule_cible_uidx
  on scope_regles_bascule (cible_id) where portee = 'CIBLE';
create unique index if not exists scope_regles_bascule_domaine_uidx
  on scope_regles_bascule (domaine_code) where portee = 'DOMAINE';
create unique index if not exists scope_regles_bascule_global_uidx
  on scope_regles_bascule ((true)) where portee = 'GLOBAL';

insert into scope_regles_bascule (portee, cible_id, domaine_code, date_bascule, commentaire)
select 'CIBLE', cible_id, 'DAP', date '2026-08-19',
       'Pilote nominatif DAP/Y4. Seule cible qualifiée. Pas une règle domaine DAP.'
from scope_cibles
where domaine_code = 'DAP' and niveau_code = 'Y4'
on conflict (cible_id) where portee = 'CIBLE' do nothing;
