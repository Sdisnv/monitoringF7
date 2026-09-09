-- SCOPE — CONFIGURATION-FORMATION-UX-REFERENTIALS-FINISH-5
-- Migration additive : référentiel administrable des statuts configurables.
-- La liste métier des motifs est désormais portée par les policies serveur, pas par une liste DB hardcodée.

alter table scope_participations drop constraint if exists scope_participations_motif_val_chk;
alter table scope_participations add constraint scope_participations_motif_val_chk check (
  motif_absence is null or length(trim(motif_absence)) > 0
);

create table if not exists scope_participation_statuses (
  status_id text primary key,
  label text not null,
  base_status text not null,
  actif boolean not null default true,
  historique boolean not null default false,
  display_order integer not null default 999,
  group_code text not null default 'operationnel',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scope_participation_statuses_base_chk check (base_status in ('PRESENT','ABSENT_EXCUSE','ABSENT_NON_EXCUSE','DISPENSE','PERMUTATION')),
  constraint scope_participation_statuses_id_chk check (length(trim(status_id)) > 0),
  constraint scope_participation_statuses_label_chk check (length(trim(label)) > 0)
);

insert into scope_participation_statuses(status_id, label, base_status, actif, historique, display_order, group_code, metadata)
values
  ('PRESENT', 'Présent', 'PRESENT', true, false, 10, 'operationnel', '{"source":"STATUS_LIBRARY","system_behavior":"PRESENT"}'::jsonb),
  ('ABSENT_EXCUSE', 'Excusé', 'ABSENT_EXCUSE', true, false, 20, 'operationnel', '{"source":"STATUS_LIBRARY","system_behavior":"ABSENT_EXCUSE"}'::jsonb),
  ('ABSENT_NON_EXCUSE', 'Absent', 'ABSENT_NON_EXCUSE', true, false, 30, 'operationnel', '{"source":"STATUS_LIBRARY","system_behavior":"ABSENT_NON_EXCUSE"}'::jsonb),
  ('DISPENSE', 'Dispensé', 'DISPENSE', true, false, 40, 'operationnel', '{"source":"STATUS_LIBRARY","system_behavior":"DISPENSE"}'::jsonb),
  ('PERMUTATION', 'Permutation', 'PERMUTATION', true, false, 50, 'operationnel', '{"source":"STATUS_LIBRARY","system_behavior":"PERMUTATION","special_engine":true}'::jsonb)
on conflict (status_id) do nothing;

insert into monitoring_f7_schema_migrations(version)
values ('scope-configuration-formation-ux-referentials-finish-5')
on conflict (version) do nothing;
