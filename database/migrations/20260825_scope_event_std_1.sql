-- SCOPE-EVENT-STD-1 — événements standard : identité métier, source, code cours immuable côté service.

alter table scope_evenements add column if not exists internal_event_id text;
update scope_evenements
set internal_event_id = evenement_id::text
where internal_event_id is null;
alter table scope_evenements alter column internal_event_id set not null;

create unique index if not exists scope_evenements_internal_event_id_uq
  on scope_evenements (internal_event_id);

alter table scope_evenements add column if not exists code_cours text;
alter table scope_evenements add column if not exists code_source text;
alter table scope_evenements add column if not exists source_type text;
alter table scope_evenements add column if not exists heure_debut text;
alter table scope_evenements add column if not exists heure_fin text;
alter table scope_evenements add column if not exists salle text;
alter table scope_evenements add column if not exists responsable text;

update scope_evenements
set source_type = case
  when origine = 'IMPORT_CSV' then 'CSV'
  when origine = 'LEGACY_AGGREGATED' then 'LEGACY'
  else 'MANUEL'
end
where source_type is null;

create unique index if not exists scope_evenements_code_cours_uq
  on scope_evenements (code_cours)
  where code_cours is not null;

create index if not exists scope_evenements_standard_match_idx
  on scope_evenements (date, domaine_code, sous_domaine_code, heure_debut, heure_fin);
