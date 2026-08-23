-- SCOPE-JSP-GRADE-MODEL-FIX-1
-- Flamme JSP = grade de la Personne, pas scope_affectations.niveau.
-- Idempotent. Compatible si la colonne niveau a déjà été créée par le runtime.
-- Recopie FLM_1/2/3 vers Personne.grade si le grade est vide, puis retire la colonne.
-- Ne touche pas scope_cibles.niveau_code (référentiel sites/niveaux d’exercice).
-- Ne touche pas ORION.

insert into monitoring_f7_schema_migrations(version)
values ('scope-jsp-grade-model-fix-1')
on conflict (version) do nothing;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scope_affectations'
      and column_name = 'niveau'
  ) then
    update scope_personnes p
    set grade = case a.niveau
      when 'FLM_1' then 'Flm 1'
      when 'FLM_2' then 'Flm 2'
      when 'FLM_3' then 'Flm 3'
      else p.grade
    end
    from scope_affectations a
    where a.personne_id = p.id
      and a.niveau in ('FLM_1', 'FLM_2', 'FLM_3')
      and (p.grade is null or btrim(p.grade) = '');

    alter table scope_affectations drop constraint if exists scope_affectations_niveau_chk;
    drop index if exists scope_affectations_population_idx;
    drop index if exists scope_affectations_open_unique;
    alter table scope_affectations drop column if exists niveau;
  end if;
end $$;

create unique index if not exists scope_affectations_open_unique
  on scope_affectations (
    personne_id,
    categorie,
    domaine,
    cible,
    coalesce(role_domaine, '')
  )
  where date_inactif is null;
