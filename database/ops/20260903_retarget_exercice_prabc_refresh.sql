-- SCOPE-PRABC-JSP-PRESENCE-R2
-- Correction PONCTUELLE de l’événement de recette :
--   libellé = Exercice PR-ABC | Refresh
--   date    = 2026-04-21
--   domaine = PR
--   statut  = PLANIFIE
--
-- NE PAS exécuter automatiquement. Valider le SELECT de diagnostic, puis la transaction.
-- STOP si 0 ou >1 événement. Ne touche aucun RÉALISÉ. Ne change pas code_cours.
-- Ne crée aucune Personne. Population = affectations PR-ABC actives à la date (pas un 18 écrit).

-- ========== DIAGNOSTIC (lecture seule) ==========
select
  e.evenement_id,
  e.code_cours,
  e.libelle,
  e.date,
  e.domaine_code,
  e.statut,
  e.population_figee,
  e.version,
  string_agg(c.domaine_code || '/' || c.niveau_code, ', ' order by c.niveau_code) as cibles,
  (
    select count(*) from scope_attendus a
    where a.evenement_id = e.evenement_id and a.inclus is not false
  ) as attendus_inclus
from scope_evenements e
left join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
left join scope_cibles c on c.cible_id = ec.cible_id
where e.libelle = 'Exercice PR-ABC | Refresh'
  and e.date = date '2026-04-21'
  and e.domaine_code = 'PR'
group by e.evenement_id;

-- ========== TRANSACTION (après validation MOA du diagnostic) ==========
begin;

do $$
declare
  v_event uuid;
  v_statut text;
  v_code text;
  v_abc uuid;
  v_count int;
begin
  select e.evenement_id, e.statut, e.code_cours
    into v_event, v_statut, v_code
  from scope_evenements e
  where e.libelle = 'Exercice PR-ABC | Refresh'
    and e.date = date '2026-04-21'
    and e.domaine_code = 'PR';

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'STOP: attendu exactement 1 événement PLANIFIÉ, trouvé %', v_count;
  end if;
  if v_statut <> 'PLANIFIE' then
    raise exception 'STOP: l’événement % n’est pas PLANIFIE (statut=%)', v_event, v_statut;
  end if;

  select cible_id into strict v_abc
  from scope_cibles
  where domaine_code = 'PR' and niveau_code = 'ABC' and coalesce(actif, true) = true;

  perform pg_advisory_xact_lock(hashtext(v_event::text));

  delete from scope_evenement_cibles where evenement_id = v_event;
  insert into scope_evenement_cibles(evenement_id, cible_id) values (v_event, v_abc);

  -- Recalcul attendus depuis affectations PR-ABC actives à la date, personnes non archivées.
  with expected as (
    select distinct a.personne_id
    from scope_affectations a
    join scope_personnes p on p.personne_id = a.personne_id
    join scope_cibles c on c.domaine_code = a.domaine
      and (
        upper(c.niveau_code) = case
          when regexp_replace(upper(replace(replace(replace(a.cible, '/', ''), '-', ''), '_', '')), '\s', '', 'g') in ('ABC','PRABC') then 'ABC'
          else upper(a.cible)
        end
        or upper(c.libelle) = upper(a.cible)
        or upper(c.libelle) = upper(concat(a.domaine, ' ', a.cible))
      )
    where c.cible_id = v_abc
      and a.date_actif <= date '2026-04-21'
      and (a.date_inactif is null or date '2026-04-21' <= a.date_inactif)
      and p.archived_at is null
  )
  insert into scope_attendus(evenement_id, personne_id, inclus, origine, origine_retrait, motif_inclusion)
  select v_event, expected.personne_id, true, 'REGLE', null, 'affectation_valide_a_date'
  from expected
  on conflict (evenement_id, personne_id) do update
    set inclus = true,
        origine = 'REGLE',
        origine_retrait = null,
        motif_inclusion = excluded.motif_inclusion;

  update scope_attendus a
  set inclus = false,
      origine_retrait = 'EXCEPTION_RETRAIT'
  where a.evenement_id = v_event
    and a.inclus is not false
    and a.origine is distinct from 'EXCEPTION_AJOUT'
    and not exists (
      select 1
      from scope_affectations aff
      join scope_personnes p on p.personne_id = aff.personne_id
      join scope_cibles c on c.domaine_code = aff.domaine
        and (
          upper(c.niveau_code) = case
            when regexp_replace(upper(replace(replace(replace(aff.cible, '/', ''), '-', ''), '_', '')), '\s', '', 'g') in ('ABC','PRABC') then 'ABC'
            else upper(aff.cible)
          end
          or upper(c.libelle) = upper(aff.cible)
          or upper(c.libelle) = upper(concat(aff.domaine, ' ', aff.cible))
        )
      where c.cible_id = v_abc
        and aff.personne_id = a.personne_id
        and aff.date_actif <= date '2026-04-21'
        and (aff.date_inactif is null or date '2026-04-21' <= aff.date_inactif)
        and p.archived_at is null
    );

  insert into scope_participations(evenement_id, personne_id, statut, role, source)
  select a.evenement_id, a.personne_id, 'NON_RENSEIGNE', 'PARTICIPANT', 'SYNC_POPULATION'
  from scope_attendus a
  where a.evenement_id = v_event
    and a.inclus is not false
    and not exists (
      select 1 from scope_participations p
      where p.evenement_id = a.evenement_id and p.personne_id = a.personne_id
    );

  update scope_participations p
  set statut = 'NON_CONCERNE',
      source = 'SYNC_POPULATION'
  where p.evenement_id = v_event
    and p.role = 'PARTICIPANT'
    and exists (
      select 1 from scope_attendus a
      where a.evenement_id = p.evenement_id
        and a.personne_id = p.personne_id
        and a.inclus = false
        and a.origine is distinct from 'EXCEPTION_AJOUT'
    )
    and coalesce(p.statut, 'NON_RENSEIGNE') in ('NON_RENSEIGNE', 'NON_CONCERNE');

  update scope_evenements
  set population_version = coalesce(population_version, 0) + 1,
      version = version + 1,
      updated_at = now()
  where evenement_id = v_event
    and statut = 'PLANIFIE';

  insert into scope_journal_metier(journal_id, auteur_id, entite, entite_id, action, apres)
  values (
    gen_random_uuid(),
    'ops-prabc-jsp-presence-r2',
    'evenement',
    v_event::text,
    'RETARGET_CIBLES',
    jsonb_build_object(
      'libelle', 'Exercice PR-ABC | Refresh',
      'date', '2026-04-21',
      'from', 'PR/GEN',
      'to', 'PR/ABC',
      'code_cours', v_code
    )
  );
end $$;

-- Contrôle post-correction (dans la même transaction)
select
  e.evenement_id,
  e.code_cours,
  e.statut,
  string_agg(c.domaine_code || '/' || c.niveau_code, ', ') as cibles,
  count(*) filter (where a.inclus is not false) as attendus_inclus
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
left join scope_attendus a on a.evenement_id = e.evenement_id
where e.libelle = 'Exercice PR-ABC | Refresh'
  and e.date = date '2026-04-21'
  and e.domaine_code = 'PR'
group by e.evenement_id, e.code_cours, e.statut;

-- attendus_inclus doit égaler le nombre d’affectations PR-ABC actives au 2026-04-21.
-- COMMIT uniquement après contrôle. ROLLBACK par défaut.

rollback;
-- commit;
