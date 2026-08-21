-- Rollback SCOPE-OBJECTIVES-1 (pré-production uniquement).
-- Ne pas exécuter en production si des objectifs métier ont été saisis.

drop table if exists scope_objectifs;
delete from monitoring_f7_schema_migrations where version = 'scope-objectives-1';
