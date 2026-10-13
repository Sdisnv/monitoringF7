-- Additive HSC compatibility and append-only protection of the existing audit journal.
-- Existing Stat.Com, occurrence codes, technical identifiers and journal rows are not updated.
do $$ declare next_number bigint; begin
  if exists (select 1 from (select code_cours as code from scope_evenements
  union all select metadata->>'businessCode' from scope_quo_vadis_obligations
  union all select business_code from scope_qv_publication_activities
  union all select event_code from scope_event_code_allocations) codes where
    code like 'HSC.%' and (code !~ '^HSC[.][0-9]{3}$' or code='HSC.000')
    or code like 'SCOPE-%' and (code !~ '^SCOPE-[0-9]{6,9}$'
      or case when code ~ '^SCOPE-[0-9]{6,9}$' then substring(code from 7)::numeric not between 1 and 999 else false end)
  ) then raise exception 'HSC_INVALID_CODE'; end if;
  if exists (select number from (
    select distinct code,substring(code from '(?:SCOPE-|HSC[.])0*([0-9]+)$')::int as number
    from (select code_cours as code from scope_evenements
  union all select metadata->>'businessCode' from scope_quo_vadis_obligations
  union all select business_code from scope_qv_publication_activities
  union all select event_code from scope_event_code_allocations) codes where code ~ '^(SCOPE-[0-9]{6,9}|HSC[.][0-9]{3})$'
  ) identities group by number having count(*)>1)
  then raise exception 'HSC_ALIAS_COLLISION'; end if;
  if exists (select code from (
    select code_cours as code,evenement_id from scope_evenements
    union all select event_code,evenement_id from scope_event_code_allocations
    union all select a.business_code,l.evenement_id from scope_qv_publication_activities a
      join scope_qv_publication_links l using(publication_activity_id)
  ) links where code ~ '^(SCOPE-|HSC[.])' group by code having count(distinct evenement_id)>1)
  then raise exception 'HSC_MULTIPLE_EVENTS'; end if;
  if exists (select 1 from scope_event_code_allocations a join scope_evenements e using(evenement_id)
    where (a.event_code ~ '^(SCOPE-|HSC[.])' or e.code_cours ~ '^(SCOPE-|HSC[.])')
      and e.code_cours is not null and a.event_code <> e.code_cours)
  then raise exception 'HSC_ALLOCATION_MISMATCH'; end if;
  if exists (select 1 from scope_qv_publication_links l left join scope_evenements e using(evenement_id)
    left join scope_qv_publication_activities a using(publication_activity_id)
    where e.evenement_id is null or a.publication_activity_id is null)
  then raise exception 'HSC_ORPHAN_PUBLICATION_LINK'; end if;
  if to_regclass('scope_internal_event_code_seq') is not null then
    execute 'select last_value + case when is_called then 1 else 0 end from scope_internal_event_code_seq' into next_number;
    if next_number>999 then raise exception 'HSC_SEQUENCE_EXHAUSTED'; end if;
  end if;
end $$;

create sequence if not exists scope_internal_event_code_seq;

select setval('scope_internal_event_code_seq',greatest(c.maximum+1,s.last_value+case when s.is_called then 1 else 0 end),false)
    from scope_internal_event_code_seq s cross join (
      select coalesce(max(substring(code from '(?:SCOPE-|HSC[.])0*([0-9]+)$')::int),0) as maximum from (
        select code_cours as code from scope_evenements
        union all select metadata->>'businessCode' from scope_quo_vadis_obligations
        union all select business_code from scope_qv_publication_activities
        union all select event_code from scope_event_code_allocations
      ) issued where code ~ '^(SCOPE-[0-9]{6,9}|HSC[.][0-9]{3})$'
    ) c;

alter table scope_qv_publication_activities
    drop constraint if exists scope_qv_publication_activities_code_chk,
    drop constraint if exists scope_qv_publication_activities_statcom_chk,
    add constraint scope_qv_publication_activities_code_chk check (business_code is null
      or business_code ~ '^[^.]+[.][0-9]{3}$' or (stat_com_code is null and business_code ~ '^SCOPE-[0-9]{6,}$')),
    add constraint scope_qv_publication_activities_statcom_chk check (business_code is null or stat_com_code is not null
      or business_code ~ '^(SCOPE-[0-9]{6,}|HSC[.][0-9]{3})$');

create or replace function scope_journal_append_only_20261013() returns trigger language plpgsql as $$
    begin raise exception 'SCOPE_AUDIT_APPEND_ONLY'; end $$;

drop trigger if exists scope_journal_append_only_20261013 on scope_journal_metier;

create trigger scope_journal_append_only_20261013 before update or delete on scope_journal_metier
    for each row execute function scope_journal_append_only_20261013();

drop trigger if exists scope_journal_no_truncate_20261013 on scope_journal_metier;

create trigger scope_journal_no_truncate_20261013 before truncate on scope_journal_metier
    for each statement execute function scope_journal_append_only_20261013();
