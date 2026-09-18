-- SCOPE — QUO-VADIS-TOUTES-ACTIVITES-UX-1
-- Référentiels centralisés : 8 lieux officiels, salles théorie, fonctions responsables.
-- Les créations/upserts déterministes sont appliquées par
-- migrateQuoVadisToutesActivitesUx1() dans netlify/lib/_scope-schema.js.
-- Aucun NPA n’est inventé. Une adresse déjà renseignée n’est jamais écrasée.
-- Aucune salle n’est créée pour B2 ni Y1–Y4.

insert into monitoring_f7_schema_migrations(version)
values ('scope-quo-vadis-toutes-activites-ux-1')
on conflict (version) do nothing;
