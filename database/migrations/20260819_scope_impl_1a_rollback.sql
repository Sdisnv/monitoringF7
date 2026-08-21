-- Rollback SCOPE-IMPL-1A — uniquement avant saisie nominative réelle.
-- Ne pas exécuter une fois le pilote commencé (perdrait les attendus/participations).
-- Les tables monitoring_f7_* ne sont pas touchées.

drop table if exists scope_journal_metier;
drop table if exists scope_legacy_aggregates;
drop table if exists scope_participations;
drop table if exists scope_attendus;
drop table if exists scope_evenement_cibles;
drop table if exists scope_evenements;
drop table if exists scope_affectations;
drop table if exists scope_personnes;
drop table if exists scope_cibles;
drop table if exists scope_domaines;

delete from monitoring_f7_schema_migrations where version = 'scope-impl-1a';
