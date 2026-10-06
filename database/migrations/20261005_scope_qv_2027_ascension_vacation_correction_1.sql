begin;

do $$
declare
  target_programme uuid;
  existing_count integer;
begin
  select programme_id into target_programme
  from scope_quo_vadis_programmes
  where annee = 2027;

  if target_programme is null then
    raise exception 'Programme QV 2027 absent : vacances Ascension non ajoutees';
  end if;

  select count(*) into existing_count
  from scope_quo_vadis_calendar_days
  where programme_id = target_programme
    and jour = date '2027-05-06'
    and type_jour = 'VACANCES_SCOLAIRES';

  if existing_count > 1 then
    raise exception 'Plusieurs vacances Ascension existent deja pour QV 2027';
  elsif existing_count = 1 then
    if not exists (
      select 1 from scope_quo_vadis_calendar_days
      where programme_id = target_programme
        and jour = date '2027-05-06'
        and type_jour = 'VACANCES_SCOLAIRES'
        and libelle = 'Vacances scolaires vaudoises - Ascension'
        and source = 'CALENDAR_VD_FINAL_3'
        and neutralise = true
        and metadata @> '{"historizedForProgramme":true,"dateFin":"2027-05-09"}'::jsonb
    ) then
      raise exception 'Vacances Ascension QV 2027 deja presentes mais divergentes';
    end if;
  else
    insert into scope_quo_vadis_calendar_days
      (programme_id, jour, type_jour, libelle, source, neutralise, metadata)
    values
      (target_programme, date '2027-05-06', 'VACANCES_SCOLAIRES',
       'Vacances scolaires vaudoises - Ascension', 'CALENDAR_VD_FINAL_3', true,
       '{"historizedForProgramme":true,"dateFin":"2027-05-09"}'::jsonb);
  end if;
end
$$;

commit;
