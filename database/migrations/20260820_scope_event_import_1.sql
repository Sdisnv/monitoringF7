-- SCOPE-EVENT-IMPORT-1 — origine IMPORT_CSV + identifiant externe.
-- Idempotent. Ne touche pas aux tables monitoring_f7_* ni ORION.

alter table scope_evenements drop constraint if exists scope_evenements_origine_chk;

alter table scope_evenements add constraint scope_evenements_origine_chk
  check (origine in ('NOMINATIF','LEGACY_AGGREGATED','IMPORT_CSV'));

alter table scope_evenements add column if not exists identifiant_externe text;

create unique index if not exists scope_evenements_identifiant_externe_uq
  on scope_evenements (identifiant_externe)
  where identifiant_externe is not null;
