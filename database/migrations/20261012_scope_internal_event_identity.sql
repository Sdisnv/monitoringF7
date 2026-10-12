-- Independent SCOPE identity for internal unpaid events without Stat.Com.
-- No historic event, occurrence code, Stat.Com or allocation is changed.
create sequence if not exists scope_internal_event_code_seq;

-- Keep any already imported identity and never move the sequence backwards.
select setval('scope_internal_event_code_seq',greatest(c.maximum+1,
  s.last_value+case when s.is_called then 1 else 0 end),false)
from scope_internal_event_code_seq s cross join (
  select coalesce(max(substring(code from '^SCOPE-([0-9]+)$')::bigint),0) as maximum from (
    select code_cours as code from scope_evenements
    union all select metadata->>'businessCode' from scope_quo_vadis_obligations
    union all select business_code from scope_qv_publication_activities
  ) issued where code ~ '^SCOPE-[0-9]{6,18}$'
) c;

alter table scope_qv_publication_activities
  drop constraint if exists scope_qv_publication_activities_code_chk,
  drop constraint if exists scope_qv_publication_activities_statcom_chk,
  add constraint scope_qv_publication_activities_code_chk check (
    business_code is null or business_code ~ '^[^.]+[.][0-9]{3}$'
    or (stat_com_code is null and business_code ~ '^SCOPE-[0-9]{6,}$')
  ),
  add constraint scope_qv_publication_activities_statcom_chk check (
    business_code is null or stat_com_code is not null or business_code ~ '^SCOPE-[0-9]{6,}$'
  );
