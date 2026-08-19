-- Rollback SCOPE-EVENT-Q1 (pré-production uniquement).
-- Ne pas exécuter en production si des saisies quantitatives métier existent.

drop table if exists scope_saisies_quantitatives;
delete from monitoring_f7_schema_migrations where version = 'scope-event-q1';
