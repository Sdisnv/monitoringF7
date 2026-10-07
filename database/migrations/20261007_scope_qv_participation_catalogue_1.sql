create table if not exists scope_activity_participation_rules (
  rule_id uuid primary key default gen_random_uuid(),
  definition_id uuid not null references scope_event_definitions(definition_id) on delete restrict,
  version_number integer not null check (version_number > 0),
  tracking boolean not null,
  population_kind text not null check (population_kind in ('NONE','PUBLIC','QUALIFICATION','OI','SDIS')),
  population_code text,
  evaluation_mode text not null check (evaluation_mode in ('NONE','EVENT','MULTI_SESSION','CURSUS')),
  evaluation_group_code text,
  evaluation_session_index integer check (evaluation_session_index > 0),
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  constraint scope_activity_participation_rules_version_uk unique (definition_id, version_number),
  constraint scope_activity_participation_rules_consistent_chk check (
    (tracking and population_kind <> 'NONE' and population_code is not null and evaluation_mode <> 'NONE')
    or (not tracking and population_kind = 'NONE' and population_code is null and evaluation_mode = 'NONE')
  )
);
create unique index if not exists scope_activity_participation_rules_active_uk
  on scope_activity_participation_rules(definition_id) where superseded_at is null;

-- MOA-confirmed PR 1-4 only. Each source definition is named explicitly;
-- neither title similarity nor historical DPS markings qualify another activity.
with confirmed(code, exercise, session_index) as (values
  ('QV26-EXERCICE-PR-1-1-30B1E01A','PR1',1),
  ('QV26-EXERCICE-PR-1-2-A4FDA43C','PR1',2),
  ('QV26-EXERCICE-PR-1-3-391FD1A4','PR1',3),
  ('QV26-EXERCICE-PR-1-4-05672DF4','PR1',4),
  ('QV26-EXERCICE-PR-1-5-9E9A60D0','PR1',5),
  ('QV26-EXERCICE-PR-1-6-09414D98','PR1',6),
  ('QV26-EXERCICE-PR-2-1-45588F47','PR2',1),
  ('QV26-EXERCICE-PR-2-2-4CAB2E94','PR2',2),
  ('QV26-EXERCICE-PR-2-3-5B63EA54','PR2',3),
  ('QV26-EXERCICE-PR-2-4-68D0B0F1','PR2',4),
  ('QV26-EXERCICE-PR-2-5-10E2D2B9','PR2',5),
  ('QV26-EXERCICE-PR-2-6-38AAE638','PR2',6),
  ('QV26-EXERCICE-PR-3-1-D96B09DB','PR3',1),
  ('QV26-EXERCICE-PR-3-2-9759EEEC','PR3',2),
  ('QV26-EXERCICE-PR-3-3-9A2F199A','PR3',3),
  ('QV26-EXERCICE-PR-3-4-E1C6C663','PR3',4),
  ('QV26-EXERCICE-PR-3-5-DB2C8980','PR3',5),
  ('QV26-EXERCICE-PR-3-6-ECD69510','PR3',6),
  ('QV26-EXERCICE-PR-4-1-C882C1EA','PR4',1),
  ('QV26-EXERCICE-PR-4-2-3E5EE567','PR4',2),
  ('QV26-EXERCICE-PR-4-3-E71C19DA','PR4',3),
  ('QV26-EXERCICE-PR-4-4-C4008BC3','PR4',4),
  ('QV26-EXERCICE-PR-4-5-7CF12C15','PR4',5),
  ('QV26-EXERCICE-PR-4-6-BBE76EDB','PR4',6)
)
insert into scope_activity_participation_rules
  (definition_id,version_number,tracking,population_kind,population_code,evaluation_mode,
   evaluation_group_code,evaluation_session_index,source,metadata,created_by)
select d.definition_id,1,true,'QUALIFICATION','PAPR','MULTI_SESSION',
  confirmed.exercise,confirmed.session_index,'MOA_PR_1_4_20261007',
  '{"populationResolution":"INCOMPLETE","annualOccurrences":6,"themesAreAnnual":true,"datesAreAnnual":true,"timesAreAnnual":true}'::jsonb,
  'moa-confirmed-rule'
from confirmed join scope_event_definitions d on d.code=confirmed.code
where not exists (select 1 from scope_activity_participation_rules r where r.definition_id=d.definition_id);
