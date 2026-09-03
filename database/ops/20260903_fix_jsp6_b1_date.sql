-- SCOPE-EVENT-DATA-INTEGRITY-1-R1
-- Correction ciblée : Exercice JSP 6 / JSP B1
--   date actuelle  = 2026-06-18  (snapshot F7 / JSON avril 2026)
--   date métier    = 2026-08-27  (planning CODE 010JB1.445 + rapport de présence)
--
-- CODE_EVENT :
--   planning source     = 010JB1.445
--   forme SCOPE + QUI   = 010JB1JSP.445
--   STAT.COM seul       = 010JB1  (PAS une identité événement)
-- NE PAS modifier code_cours dans cet UPDATE.
--
-- NE PAS EXÉCUTER depuis Cursor. ROLLBACK par défaut.
-- STOP si le SELECT cible ne retourne pas exactement 1 ligne.

-- ========== 1. DIAGNOSTIC STRICT (lecture) ==========
select
  e.evenement_id,
  e.code_cours,
  e.libelle,
  e.domaine_code,
  e.date,
  e.heure_debut,
  e.heure_fin,
  e.statut,
  e.population_figee,
  e.origine,
  e.source_type,
  e.version,
  e.created_at,
  e.updated_at,
  string_agg(c.domaine_code || '/' || c.niveau_code, ', ' order by c.niveau_code) as cibles,
  (
    select count(*) from scope_attendus a
    where a.evenement_id = e.evenement_id and a.inclus is not false
  ) as attendus_inclus,
  (
    select count(*) from scope_participations p
    where p.evenement_id = e.evenement_id
  ) as participations_existantes,
  (
    select count(*) from scope_participations p
    where p.evenement_id = e.evenement_id
      and coalesce(p.statut, 'NON_RENSEIGNE') not in ('NON_RENSEIGNE', 'NON_CONCERNE')
  ) as participations_saisies
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
  and e.date = date '2026-06-18'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1'
group by e.evenement_id;

-- ========== 2. GARDE-FOU NOMBRE DE LIGNES = 1 ==========
select count(*) as nb_cibles
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
  and e.date = date '2026-06-18'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1';
-- STOP si 0 ou >1 ligne.

-- ========== 3. POPULATION 18.06 vs 27.08 (lecture, NIP réels) ==========
-- Attendus actuellement liés à l’événement (date 18.06).
select p.nip, p.nom, p.prenom, att.inclus, att.origine
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
join scope_attendus att on att.evenement_id = e.evenement_id
join scope_personnes p on p.personne_id = att.personne_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
  and e.date = date '2026-06-18'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1'
order by p.nip;

-- Eligible JSP B1 au 18.06.2026 (colonnes prod date_actif / date_inactif).
select distinct p.nip, p.nom, p.prenom, '2026-06-18'::text as date_ref
from scope_affectations a
join scope_personnes p on p.personne_id = a.personne_id
where a.domaine = 'JSP'
  and upper(regexp_replace(a.cible, '[^A-Z0-9]', '', 'g')) in ('B1', 'JSPB1')
  and a.date_actif <= date '2026-06-18'
  and (a.date_inactif is null or date '2026-06-18' <= a.date_inactif)
  and p.archived_at is null
order by p.nip;

-- Eligible JSP B1 au 27.08.2026.
select distinct p.nip, p.nom, p.prenom, '2026-08-27'::text as date_ref
from scope_affectations a
join scope_personnes p on p.personne_id = a.personne_id
where a.domaine = 'JSP'
  and upper(regexp_replace(a.cible, '[^A-Z0-9]', '', 'g')) in ('B1', 'JSPB1')
  and a.date_actif <= date '2026-08-27'
  and (a.date_inactif is null or date '2026-08-27' <= a.date_inactif)
  and p.archived_at is null
order by p.nip;

-- NIP ajoutés si la date passe au 27.08 (éligibles 27.08, pas 18.06).
select p.nip, p.nom, p.prenom
from scope_personnes p
where p.archived_at is null
  and exists (
    select 1 from scope_affectations a
    where a.personne_id = p.personne_id
      and a.domaine = 'JSP'
      and upper(regexp_replace(a.cible, '[^A-Z0-9]', '', 'g')) in ('B1', 'JSPB1')
      and a.date_actif <= date '2026-08-27'
      and (a.date_inactif is null or date '2026-08-27' <= a.date_inactif)
  )
  and not exists (
    select 1 from scope_affectations a
    where a.personne_id = p.personne_id
      and a.domaine = 'JSP'
      and upper(regexp_replace(a.cible, '[^A-Z0-9]', '', 'g')) in ('B1', 'JSPB1')
      and a.date_actif <= date '2026-06-18'
      and (a.date_inactif is null or date '2026-06-18' <= a.date_inactif)
  )
order by p.nip;

-- NIP retirés si la date passe au 27.08 (éligibles 18.06, pas 27.08).
select p.nip, p.nom, p.prenom
from scope_personnes p
where p.archived_at is null
  and exists (
    select 1 from scope_affectations a
    where a.personne_id = p.personne_id
      and a.domaine = 'JSP'
      and upper(regexp_replace(a.cible, '[^A-Z0-9]', '', 'g')) in ('B1', 'JSPB1')
      and a.date_actif <= date '2026-06-18'
      and (a.date_inactif is null or date '2026-06-18' <= a.date_inactif)
  )
  and not exists (
    select 1 from scope_affectations a
    where a.personne_id = p.personne_id
      and a.domaine = 'JSP'
      and upper(regexp_replace(a.cible, '[^A-Z0-9]', '', 'g')) in ('B1', 'JSPB1')
      and a.date_actif <= date '2026-08-27'
      and (a.date_inactif is null or date '2026-08-27' <= a.date_inactif)
  )
order by p.nip;

-- Participations déjà saisies (à protéger).
select p.nip, part.statut, part.role, part.motif_absence
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
join scope_participations part on part.evenement_id = e.evenement_id
join scope_personnes p on p.personne_id = part.personne_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
  and e.date = date '2026-06-18'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1'
order by p.nip;

-- ========== 4. TRANSACTION DATE (ROLLBACK par défaut) ==========
begin;

do $$
declare
  v_event uuid;
  v_code text;
  v_statut text;
  v_figee boolean;
  v_count int;
begin
  select e.evenement_id, e.code_cours, e.statut, e.population_figee
    into v_event, v_code, v_statut, v_figee
  from scope_evenements e
  join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
  join scope_cibles c on c.cible_id = ec.cible_id
  where e.domaine_code = 'JSP'
    and e.libelle = 'Exercice JSP 6'
    and e.date = date '2026-06-18'
    and c.domaine_code = 'JSP'
    and c.niveau_code = 'B1';

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'STOP: attendu exactement 1 événement JSP 6 / B1 au 2026-06-18, trouvé %', v_count;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_event::text));

  update scope_evenements e
     set date = date '2026-08-27',
         version = e.version + 1,
         updated_at = now()
   where e.evenement_id = v_event
     and e.domaine_code = 'JSP'
     and e.libelle = 'Exercice JSP 6'
     and e.date = date '2026-06-18';

  if not found then
    raise exception 'STOP: UPDATE date n’a touché aucune ligne';
  end if;

  insert into scope_journal_metier (
    journal_id, auteur_id, entite, entite_id, action, avant, apres, commentaire
  ) values (
    gen_random_uuid(),
    'ops-jsp6-b1-date',
    'evenement',
    v_event::text,
    'MODIFIER',
    jsonb_build_object('date', '2026-06-18', 'code_cours', v_code),
    jsonb_build_object('date', '2026-08-27', 'code_cours', v_code),
    'SCOPE-EVENT-DATA-INTEGRITY-1-R1: date planning 010JB1.445'
  );

  -- CODE_EVENT, cible, libellé, statut, participations inchangés.
  -- Resync population : UNIQUEMENT après COMMIT, UNIQUEMENT si PLANIFIE,
  -- via reconcileExpectedPopulation({ eventIds: [v_event] }).
  -- INTERDIT si REALISE.
  if v_statut <> 'PLANIFIE' then
    raise notice 'Événement % statut=% : ne pas resynchroniser la population', v_event, v_statut;
  else
    raise notice 'Événement % PLANIFIE figé=% : resync ciblé possible après COMMIT', v_event, v_figee;
  end if;
end $$;

-- Contrôles après UPDATE (toujours dans la transaction).
select e.evenement_id, e.code_cours, e.libelle, e.date, e.statut, e.version
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1'
  and e.date = date '2026-08-27';

select count(*) as autres_jsp6_b1_restes_au_18_06
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
  and e.date = date '2026-06-18'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1';

rollback;
-- commit;
