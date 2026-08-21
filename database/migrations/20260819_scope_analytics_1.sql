-- SCOPE-ANALYTICS-1 : mode_suivi additif.
-- Mapping : LEGACY_AGGREGATED → LEGACY, autres → NOMINATIF.
-- Ne réécrit pas les agrégats legacy. Idempotent.

alter table scope_evenements add column if not exists mode_suivi text;

update scope_evenements
set mode_suivi = 'LEGACY'
where origine = 'LEGACY_AGGREGATED'
  and (mode_suivi is null or mode_suivi not in ('NOMINATIF','QUANTITATIF','LEGACY'));

update scope_evenements
set mode_suivi = 'NOMINATIF'
where mode_suivi is null
   or mode_suivi not in ('NOMINATIF','QUANTITATIF','LEGACY');

alter table scope_evenements drop constraint if exists scope_evenements_mode_suivi_chk;
alter table scope_evenements add constraint scope_evenements_mode_suivi_chk
  check (mode_suivi in ('NOMINATIF','QUANTITATIF','LEGACY'));

alter table scope_evenements alter column mode_suivi set default 'NOMINATIF';
alter table scope_evenements alter column mode_suivi set not null;

create index if not exists scope_evenements_analytics_idx
  on scope_evenements (date, statut, mode_suivi, domaine_code);

create index if not exists scope_evenement_cibles_cible_evt
  on scope_evenement_cibles (cible_id, evenement_id);

create index if not exists scope_participations_evenement_statut
  on scope_participations (evenement_id, statut);
