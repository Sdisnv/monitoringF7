-- SCOPE — QUO-VADIS-AGENDA-UX-2
-- Centralise les adresses de convocation dans scope_lieux.
-- Les mises à jour déterministes (salle historique → lieu) sont appliquées
-- par migrateQuoVadisAgendaUx2() dans netlify/lib/_scope-schema.js.
-- Aucune adresse n’est inventée. Une adresse déjà renseignée n’est jamais écrasée.

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-agenda-ux-2')
on conflict (version) do nothing;
