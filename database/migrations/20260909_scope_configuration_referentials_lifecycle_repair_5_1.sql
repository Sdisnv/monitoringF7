-- SCOPE — CONFIGURATION-REFERENTIALS-LIFECYCLE-REPAIR-5.1
-- No destructive schema change is required. The lifecycle repair is implemented
-- in the SCOPE service/runtime and keeps existing referential rows intact.
insert into monitoring_f7_schema_migrations(version)
values ('scope-configuration-referentials-lifecycle-repair-5-1')
on conflict (version) do nothing;
