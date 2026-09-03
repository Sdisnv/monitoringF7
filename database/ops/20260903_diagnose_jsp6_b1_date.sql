-- SCOPE-EVENT-DATA-INTEGRITY-1
-- Diagnostic READ ONLY + correction CONDITIONNELLE de date
-- Événement visé : Exercice JSP 6 / domaine JSP / cible B1
--
-- PREUVE REPO (non-DB) :
--   assets/data/monitoring_exercices_sdis_2026_2026-04-24_1446.json
--     id F7 = 0396d5f6-2113-4878-a288-f3b4dcc04ac8
--     dateExercice = 2026-06-18
--     template = Exercice JSP 6
--     statCom = 010JB1
--     subStructure = JSP B1
--   monitoring-f7-sauvegarde-complete-2026-06-02.json
--     id F7 = 23a29c2b-1dfc-46a5-bf9c-78af414de808
--     dateExercice = 2026-06-18
--
-- OBSOLÈTE COMME HOTFIX : la date se corrige via patchEvenement (SCOPE-EVENT-EDIT-1).
-- L’UPDATE commenté ci-dessous ne doit pas être exécuté.
--
-- NE PAS EXÉCUTER depuis Cursor. ROLLBACK par défaut.

-- ========== 1. INVENTAIRE JSP 6 (lecture) ==========
select
  e.evenement_id,
  e.code_cours,
  e.libelle,
  e.date,
  e.domaine_code,
  e.statut,
  e.origine,
  e.source_type,
  e.identifiant_externe,
  e.created_at,
  e.updated_at,
  e.version,
  e.population_figee,
  string_agg(c.domaine_code || '/' || c.niveau_code, ', ' order by c.niveau_code) as cibles,
  (
    select count(*) from scope_attendus a
    where a.evenement_id = e.evenement_id and a.inclus is not false
  ) as attendus_inclus,
  (
    select count(*) from scope_participations p
    where p.evenement_id = e.evenement_id
      and coalesce(p.statut, 'NON_RENSEIGNE') not in ('NON_RENSEIGNE', 'NON_CONCERNE')
  ) as participations_saisies
from scope_evenements e
left join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
left join scope_cibles c on c.cible_id = ec.cible_id
where e.domaine_code = 'JSP'
  and e.libelle = 'Exercice JSP 6'
group by e.evenement_id
order by e.date, e.code_cours;

-- ========== 2. CIBLE B1 AU 18.06.2026 (doit matcher 0 ou 1 ligne) ==========
select
  e.evenement_id,
  e.code_cours,
  e.libelle,
  e.date,
  e.domaine_code,
  e.statut,
  e.created_at,
  e.updated_at,
  e.version
from scope_evenements e
join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
join scope_cibles c on c.cible_id = ec.cible_id
where e.libelle = 'Exercice JSP 6'
  and e.domaine_code = 'JSP'
  and e.date = date '2026-06-18'
  and c.domaine_code = 'JSP'
  and c.niveau_code = 'B1';

-- ========== 3. JOURNAL DES CHANGEMENTS DE DATE (lecture) ==========
select
  j.journal_id,
  j.entite_id,
  j.action,
  j.auteur_id,
  j.created_at,
  j.avant,
  j.apres,
  j.commentaire
from scope_journal_metier j
where j.entite = 'evenement'
  and (
    j.action in ('MODIFIER', 'CREER', 'CREER_IMPORT_STANDARD', 'RETARGET_CIBLES')
    or coalesce(j.apres::text, '') ilike '%date%'
    or coalesce(j.avant::text, '') ilike '%date%'
  )
  and j.entite_id in (
    select e.evenement_id::text
    from scope_evenements e
    where e.domaine_code = 'JSP' and e.libelle = 'Exercice JSP 6'
  )
order by j.created_at;

-- ========== 4. ANOMALIES 2026 — dates vs journal MODIFIER (lecture) ==========
select
  e.evenement_id,
  e.code_cours,
  e.libelle,
  e.date as date_actuelle,
  e.domaine_code,
  e.updated_at,
  j.created_at as journal_at,
  j.auteur_id,
  j.avant,
  j.apres
from scope_evenements e
left join scope_journal_metier j
  on j.entite = 'evenement'
 and j.entite_id = e.evenement_id::text
 and j.action = 'MODIFIER'
 and coalesce(j.apres::text, '') ilike '%"date"%'
where extract(year from e.date) = 2026
order by e.updated_at desc
limit 200;

-- ========== 5. UPDATE CONDITIONNEL — NE PAS DÉCOMMENTER SANS PREUVE JOURNAL 2026-08-27 ==========
-- La transaction ci-dessous est volontairement inactive.
-- Elle n’est PAS la correction recommandée : la source F7 confirme 2026-06-18.

begin;

-- select evenement_id, code_cours, date, statut
-- from scope_evenements e
-- join scope_evenement_cibles ec on ec.evenement_id = e.evenement_id
-- join scope_cibles c on c.cible_id = ec.cible_id
-- where e.libelle = 'Exercice JSP 6'
--   and e.domaine_code = 'JSP'
--   and e.date = date '2026-06-18'
--   and c.domaine_code = 'JSP'
--   and c.niveau_code = 'B1';
-- STOP si 0 ou >1 ligne.

-- update scope_evenements e
-- set date = date '2026-08-27',
--     version = e.version + 1,
--     updated_at = now()
-- where e.evenement_id = (
--     select e2.evenement_id
--     from scope_evenements e2
--     join scope_evenement_cibles ec on ec.evenement_id = e2.evenement_id
--     join scope_cibles c on c.cible_id = ec.cible_id
--     where e2.libelle = 'Exercice JSP 6'
--       and e2.domaine_code = 'JSP'
--       and e2.date = date '2026-06-18'
--       and c.domaine_code = 'JSP'
--       and c.niveau_code = 'B1'
--   )
--   and e.domaine_code = 'JSP'
--   and e.libelle = 'Exercice JSP 6'
--   and e.date = date '2026-06-18'
--   and e.statut in ('PLANIFIE', 'REALISE', 'REPORTE');
-- -- 1 row only. code_cours, cibles, participations, statut inchangés.
-- -- AUCUN resync population ici (REALISE interdit ; PLANIFIÉ : évaluer après SELECT attendus).

rollback;
-- commit;
