alter table scope_evenements add column if not exists pr_exercise_group_key text;
alter table scope_evenements add column if not exists pr_session_key text;

update scope_evenements
set
  pr_exercise_group_key = coalesce(
    pr_exercise_group_key,
    case
      when upper(coalesce(domaine_code, '')) = 'PR'
       and libelle ~* 'exercice[[:space:]]+pr[[:space:]]+[0-9]+(\\.[0-9]+)?'
      then concat(
        coalesce(cycle_id::text, 'NO_CYCLE'),
        ':PR:',
        substring(libelle from '(?i)exercice[[:space:]]+pr[[:space:]]+([0-9]+)(?:\\.[0-9]+)?')
      )
      else null
    end
  ),
  pr_session_key = coalesce(
    pr_session_key,
    case
      when upper(coalesce(domaine_code, '')) = 'PR'
       and libelle ~* 'exercice[[:space:]]+pr[[:space:]]+[0-9]+\\.[0-9]+'
      then concat(
        coalesce(cycle_id::text, 'NO_CYCLE'),
        ':PR:',
        substring(libelle from '(?i)exercice[[:space:]]+pr[[:space:]]+([0-9]+\\.[0-9]+)')
      )
      else null
    end
  )
where upper(coalesce(domaine_code, '')) = 'PR'
  and (pr_exercise_group_key is null or pr_session_key is null);

create index if not exists scope_evenements_pr_exercise_group_idx
  on scope_evenements (cycle_id, pr_exercise_group_key)
  where pr_exercise_group_key is not null;
