\set ON_ERROR_STOP on

begin;

do $$
begin
  if to_regclass('public.scope_qv_publication_links') is not null
     and exists (select 1 from scope_qv_publication_links) then
    raise exception 'C23_REPAIR_ROLLBACK_REFUSED: publication provenance exists; restore the reviewed backup instead';
  end if;
  if exists (
    select 1 from scope_evenements
     where publication_key is not null
        or publication_fingerprint is not null
        or date_fin is not null
        or famille is not null
        or type_evenement is not null
        or lieu_id is not null
        or salle_theorie_id is not null
        or entree_service is not null
        or duree_planifiee_minutes is not null
        or priorite is not null
        or date_fixe
        or journee_reservee
        or permutation_autorisee
        or exception_metier is not null
  ) then
    raise exception 'C23_REPAIR_ROLLBACK_REFUSED: migrated event columns contain data; restore the reviewed backup instead';
  end if;
end $$;

delete from monitoring_f7_schema_migrations
 where version = 'scope-qv-publication-c23-repair-1';

drop table if exists scope_qv_session_events;
drop table if exists scope_qv_session_groups;
drop table if exists scope_evenement_ressources_qv;
drop table if exists scope_evenement_roles_qv;
drop table if exists scope_evenement_public_rule_versions;
drop table if exists scope_evenement_publics_qv;
drop table if exists scope_evenement_ois;
drop table if exists scope_evenement_cibles_qv;
drop table if exists scope_evenement_domaines;
drop table if exists scope_qv_publication_runs;
drop table if exists scope_qv_publication_links;
drop table if exists scope_qv_publication_activities;

drop index if exists scope_evenements_qv_date_idx;
drop index if exists scope_evenements_publication_key_uq;

alter table scope_evenements drop constraint if exists scope_evenements_duree_planifiee_chk;
alter table scope_evenements
  drop column if exists exception_metier,
  drop column if exists permutation_autorisee,
  drop column if exists journee_reservee,
  drop column if exists date_fixe,
  drop column if exists priorite,
  drop column if exists duree_planifiee_minutes,
  drop column if exists entree_service,
  drop column if exists salle_theorie_id,
  drop column if exists lieu_id,
  drop column if exists type_evenement,
  drop column if exists famille,
  drop column if exists publication_fingerprint,
  drop column if exists publication_key,
  drop column if exists date_fin;

commit;
