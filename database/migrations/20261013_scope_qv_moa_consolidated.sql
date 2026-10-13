-- Additive HSC compatibility and append-only protection of the existing audit journal.
-- Existing Stat.Com, occurrence codes, technical identifiers and journal rows are not updated.
do $$ begin if exists (
    select 1 from (
      select code_cours as code from scope_evenements
      union all select metadata->>'businessCode' from scope_quo_vadis_obligations
      union all select business_code from scope_qv_publication_activities
    ) issued where code ~ '^SCOPE-[0-9]+$' and substring(code from '^SCOPE-([0-9]+)$')::numeric not between 1 and 999
  ) then raise exception 'HSC_IDENTITY_REVIEW_REQUIRED'; end if; if exists (
    select number from (
      select distinct code,substring(code from '(?:SCOPE-|HSC[.])0*([0-9]+)$')::int as number from (
        select code_cours as code from scope_evenements
        union all select metadata->>'businessCode' from scope_quo_vadis_obligations
        union all select business_code from scope_qv_publication_activities
      ) issued where code ~ '^(SCOPE-[0-9]{6,9}|HSC[.][0-9]{3})$'
    ) identities group by number having count(*)>1 or max(number)>999 or min(number)<1
  ) then raise exception 'HSC_IDENTITY_REVIEW_REQUIRED'; end if; end $$;

create sequence if not exists scope_internal_event_code_seq;

select setval('scope_internal_event_code_seq',greatest(c.maximum+1,s.last_value+case when s.is_called then 1 else 0 end),false)
    from scope_internal_event_code_seq s cross join (
      select coalesce(max(substring(code from '(?:SCOPE-|HSC[.])0*([0-9]+)$')::int),0) as maximum from (
        select code_cours as code from scope_evenements
        union all select metadata->>'businessCode' from scope_quo_vadis_obligations
        union all select business_code from scope_qv_publication_activities
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
