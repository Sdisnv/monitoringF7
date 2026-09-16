const db = require('./_postgres');

function dateOnly(value){
  if(!value) return null;
  if(value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function isoLocalDateTime(date, time){
  return `${dateOnly(date)}T${String(time || '00:00').slice(0, 5)}:00`;
}

function addMinutesIso(date, time, minutes){
  const d = new Date(`${isoLocalDateTime(date, time)}Z`);
  d.setUTCMinutes(d.getUTCMinutes() + Number(minutes || 120));
  return d.toISOString().replace('.000Z', '+00:00');
}

function weekdayName(date){
  return ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date(`${dateOnly(date)}T12:00:00Z`).getUTCDay()];
}

function mapProgramme(row){
  if(!row) return null;
  return {
    programmeId: row.programme_id,
    annee: Number(row.annee),
    code: row.code,
    libelle: row.libelle,
    periodeDebut: dateOnly(row.periode_debut),
    periodeFin: dateOnly(row.periode_fin),
    statut: row.statut,
    revision: Number(row.revision || 1),
    metadata: row.metadata || {}
  };
}

function mapObligation(row){
  return {
    obligationId: row.obligation_id,
    programmeId: row.programme_id,
    sourceType: row.source_type,
    sourceRef: row.source_ref,
    title: row.title,
    domain: row.domain,
    cibleCodes: row.cible_codes || [],
    statut: row.statut,
    priority: Number(row.priority || 100),
    imposedStartAt: row.imposed_start_at || null,
    imposedEndAt: row.imposed_end_at || null,
    scopeEvenementId: row.scope_evenement_id || null,
    statcomPolicy: row.statcom_policy,
    statcomCode: row.statcom_code || null,
    lieuId: row.lieu_id || null,
    lieuLibre: row.lieu_libre || null,
    numberingPattern: row.numbering_pattern || null,
    metadata: row.metadata || {},
    proposalCount: Number(row.proposal_count || 0)
  };
}

function mapProposal(row){
  return {
    proposalId: row.proposal_id,
    obligationId: row.obligation_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dayClass: row.day_class,
    status: row.status,
    reasons: row.reasons || [],
    conflictSummary: row.conflict_summary || {},
    lieuId: row.lieu_id || null,
    lieuLibre: row.lieu_libre || null
  };
}

function mapCalendarDay(row){
  return {
    calendarDayId: row.calendar_day_id,
    jour: dateOnly(row.jour),
    typeJour: row.type_jour,
    libelle: row.libelle,
    source: row.source,
    neutralise: row.neutralise === true,
    metadata: row.metadata || {}
  };
}

function mapLieu(row){
  return {
    lieuId: row.lieu_id,
    code: row.code,
    nomCourt: row.nom_court,
    nomComplet: row.nom_complet || '',
    adresseLigne1: row.adresse_ligne1 || '',
    npa: row.npa || '',
    localite: row.localite || '',
    oiCode: row.oi_code || '',
    actif: row.actif !== false
  };
}

function mapCursus(row){
  return {
    code: row.code,
    libelle: row.libelle,
    versionCode: row.version_code,
    stepCode: row.step_code,
    stepLabel: row.step_label,
    ordre: Number(row.ordre),
    logicalYear: Number(row.logical_year),
    usualStartTime: row.usual_start_time,
    usualEndTime: row.usual_end_time,
    crossesMidnight: row.crosses_midnight === true,
    preferredDay: row.preferred_day
  };
}

function createScopeQuoVadisService(){
  async function getProgrammeByYear(annee){
    const result = await db.query('select * from scope_quo_vadis_programmes where annee = $1', [Number(annee)]);
    return mapProgramme(result.rows[0]);
  }

  async function ensureProgramme(annee){
    const year = Number(annee || 2027);
    const existing = await getProgrammeByYear(year);
    if(existing) return existing;
    const result = await db.query(
      `insert into scope_quo_vadis_programmes(annee, code, libelle, periode_debut, periode_fin, statut, metadata)
       values ($1,$2,$3,$4,$5,'PREPARATION',$6::jsonb)
       on conflict (annee) do update set updated_at = now()
       returning *`,
      [
        year,
        `QV-${year}`,
        `Programme QUO VADIS ${year}`,
        `${year}-01-01`,
        `${year + 1}-03-31`,
        JSON.stringify({ source: 'QUO-VADIS-CORE-1', generated: true })
      ]
    );
    return mapProgramme(result.rows[0]);
  }

  async function listProgramme(annee = 2027){
    const programme = await ensureProgramme(annee);
    const [obligations, proposals, calendar, lieux, cursus, rules, futureDates, dps] = await Promise.all([
      db.query(
        `select o.*, count(p.proposal_id)::int as proposal_count
           from scope_quo_vadis_obligations o
           left join scope_quo_vadis_proposals p on p.obligation_id = o.obligation_id
          where o.programme_id = $1
          group by o.obligation_id
          order by o.priority, o.created_at, o.title`,
        [programme.programmeId]
      ),
      db.query(
        `select p.*
           from scope_quo_vadis_proposals p
           join scope_quo_vadis_obligations o on o.obligation_id = p.obligation_id
          where o.programme_id = $1
          order by p.starts_at, p.created_at`,
        [programme.programmeId]
      ),
      db.query(
        `select * from scope_quo_vadis_calendar_days where programme_id = $1 order by jour, type_jour, libelle`,
        [programme.programmeId]
      ),
      db.query(`select * from scope_lieux order by actif desc, oi_code nulls last, nom_court`),
      db.query(`
        select d.code, d.libelle, v.version_code, s.step_code, s.libelle as step_label, s.ordre,
               s.logical_year, s.usual_start_time, s.usual_end_time, s.crosses_midnight, s.preferred_day
          from scope_quo_vadis_cursus_definitions d
          join scope_quo_vadis_cursus_versions v on v.cursus_id = d.cursus_id
          join scope_quo_vadis_cursus_steps s on s.cursus_version_id = v.cursus_version_id
         order by d.code, v.version_code, s.ordre
      `),
      db.query(`select * from scope_quo_vadis_planning_rules where active is true order by domain nulls last, code`),
      db.query(`select * from scope_quo_vadis_future_dates where target_year = $1 order by date_debut, activite_label`, [programme.annee]),
      db.query(`select * from scope_quo_vadis_dps_organisation_versions order by oi_code, valid_from`)
    ]);
    return {
      programme,
      obligations: obligations.rows.map(mapObligation),
      proposals: proposals.rows.map(mapProposal),
      calendarDays: calendar.rows.map(mapCalendarDay),
      lieux: lieux.rows.map(mapLieu),
      cursus: cursus.rows.map(mapCursus),
      rules: rules.rows.map((row) => ({
        ruleId: row.rule_id,
        code: row.code,
        versionCode: row.version_code,
        domain: row.domain,
        dayPolicy: row.day_policy || {},
        timePolicy: row.time_policy || {},
        durationMinutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
        derogationAllowed: row.derogation_allowed !== false,
        metadata: row.metadata || {}
      })),
      futureDates: futureDates.rows.map((row) => ({
        futureDateId: row.future_date_id,
        targetYear: Number(row.target_year),
        dateDebut: dateOnly(row.date_debut),
        heureDebut: row.heure_debut || '',
        dateFin: dateOnly(row.date_fin),
        heureFin: row.heure_fin || '',
        activiteLabel: row.activite_label,
        domain: row.domain || '',
        lieuLibre: row.lieu_libre || '',
        remarque: row.remarque || '',
        convertedObligationId: row.converted_obligation_id || null
      })),
      dpsOrganisation: dps.rows.map((row) => ({
        organisationId: row.organisation_id,
        oiCode: row.oi_code,
        validFrom: dateOnly(row.valid_from),
        validTo: dateOnly(row.valid_to),
        sections: row.sections || [],
        metadata: row.metadata || {}
      }))
    };
  }

  async function seedCalendar(programme){
    const days = [
      [`${programme.annee}-01-01`, 'FERIE', 'Nouvel An', 'SEED_CORE_1', true],
      [`${programme.annee}-04-02`, 'FERIE', 'Vendredi saint', 'SEED_CORE_1', true],
      [`${programme.annee}-04-05`, 'FERIE', 'Lundi de Paques', 'SEED_CORE_1', true],
      [`${programme.annee}-05-13`, 'FERIE', 'Ascension', 'SEED_CORE_1', true],
      [`${programme.annee}-05-24`, 'FERIE', 'Lundi de Pentecote', 'SEED_CORE_1', true],
      [`${programme.annee}-08-01`, 'FERIE', 'Fete nationale', 'SEED_CORE_1', true],
      [`${programme.annee}-09-20`, 'FERIE', 'Lundi du Jeune federal', 'SEED_CORE_1', true],
      [`${programme.annee}-12-25`, 'FERIE', 'Noel', 'SEED_CORE_1', true],
      [`${programme.annee}-02-13`, 'VACANCES_SCOLAIRES', 'Vacances scolaires vaudoises - sport', 'SEED_CORE_1', true],
      [`${programme.annee}-04-10`, 'VACANCES_SCOLAIRES', 'Vacances scolaires vaudoises - printemps', 'SEED_CORE_1', true],
      [`${programme.annee}-07-03`, 'VACANCES_SCOLAIRES', 'Vacances scolaires vaudoises - ete', 'SEED_CORE_1', true],
      [`${programme.annee}-10-16`, 'VACANCES_SCOLAIRES', 'Vacances scolaires vaudoises - automne', 'SEED_CORE_1', true]
    ];
    for(const row of days){
      await db.query(
        `insert into scope_quo_vadis_calendar_days(programme_id, jour, type_jour, libelle, source, neutralise, metadata)
         values ($1,$2,$3,$4,$5,$6,'{"historizedForProgramme":true}'::jsonb)
         on conflict (programme_id, jour, type_jour, libelle) do nothing`,
        [programme.programmeId, ...row]
      );
    }
  }

  async function upsertObligation(programme, payload){
    const result = await db.query(
      `insert into scope_quo_vadis_obligations(programme_id, source_type, source_ref, cursus_step_id, cohorte_id, title, domain, cible_codes, statut, priority, imposed_start_at, imposed_end_at, statcom_policy, lieu_libre, numbering_pattern, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8::text[],'PROPOSE',$9,$10,$11,$12,$13,$14,$15::jsonb)
       on conflict do nothing
       returning *`,
      [
        programme.programmeId,
        payload.sourceType,
        payload.sourceRef,
        payload.cursusStepId || null,
        payload.cohorteId || null,
        payload.title,
        payload.domain || null,
        payload.cibleCodes || [],
        payload.priority || 100,
        payload.imposedStartAt || null,
        payload.imposedEndAt || null,
        payload.statcomPolicy || 'A_CONFIRMER',
        payload.lieuLibre || null,
        payload.numberingPattern || null,
        JSON.stringify(payload.metadata || {})
      ]
    );
    if(result.rows[0]) return result.rows[0];
    const existing = await db.query(
      `select * from scope_quo_vadis_obligations
        where programme_id = $1 and source_type = $2 and coalesce(source_ref,'') = coalesce($3,'')
        order by created_at
        limit 1`,
      [programme.programmeId, payload.sourceType, payload.sourceRef || null]
    );
    return existing.rows[0] || null;
  }

  async function insertProposal(obligation, payload){
    await db.query(
      `insert into scope_quo_vadis_proposals(obligation_id, starts_at, ends_at, day_class, reasons, conflict_summary, lieu_libre)
       select $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7
       where not exists (
         select 1 from scope_quo_vadis_proposals
         where obligation_id = $1 and starts_at = $2::timestamptz and ends_at = $3::timestamptz
       )`,
      [
        obligation.obligation_id,
        payload.startsAt,
        payload.endsAt,
        payload.dayClass,
        JSON.stringify(payload.reasons || []),
        JSON.stringify(payload.conflictSummary || {}),
        payload.lieuLibre || null
      ]
    );
  }

  async function generateProgramme(annee = 2027){
    const programme = await ensureProgramme(annee);
    await seedCalendar(programme);

    const steps = await db.query(`
      select s.*, c.cohorte_id, c.code as cohorte_code, c.current_logical_year
        from scope_quo_vadis_cursus_steps s
        join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id
        join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
        join scope_quo_vadis_cohortes c on c.cursus_version_id = v.cursus_version_id
       where d.code = 'CI-DPS'
         and ((c.code = 'CI-DPS-2026' and s.logical_year = 2) or (c.code = 'CI-DPS-2027' and s.logical_year = 1))
       order by c.code, s.ordre
    `);
    const baseDates = {
      'CI-DPS-2026': ['2027-02-06','2027-03-06','2027-04-10','2027-05-08','2027-06-12'],
      'CI-DPS-2027': ['2027-09-02','2027-09-23','2027-10-21','2027-11-18','2027-12-09']
    };
    let created = 0;
    for(const [index, row] of steps.rows.entries()){
      const dates = baseDates[row.cohorte_code] || [];
      const stepOffset = row.cohorte_code === 'CI-DPS-2026' ? row.ordre - 6 : row.ordre - 1;
      const date = dates[Math.max(0, stepOffset)] || `${programme.annee}-09-02`;
      const starts = `${isoLocalDateTime(date, row.usual_start_time)}+00:00`;
      const ends = row.crosses_midnight
        ? `${isoLocalDateTime(new Date(new Date(`${date}T12:00:00Z`).getTime() + 86400000), row.usual_end_time)}+00:00`
        : addMinutesIso(date, row.usual_start_time, 120);
      const obligation = await upsertObligation(programme, {
        sourceType: 'CURSUS',
        sourceRef: `${row.cohorte_code}:${row.step_code}`,
        cursusStepId: row.step_id,
        cohorteId: row.cohorte_id,
        title: `${row.cohorte_code} - ${row.libelle}`,
        domain: 'DPS',
        priority: 20 + index,
        statcomPolicy: row.step_code === 'M10' ? 'OBLIGATOIRE' : 'A_CONFIRMER',
        metadata: {
          source: 'QUO-VADIS-CORE-1',
          logicalYear: row.logical_year,
          noOperationalEventCreated: true,
          crossesMidnight: row.crosses_midnight === true
        }
      });
      if(obligation){
        created += 1;
        await insertProposal(obligation, {
          startsAt: starts,
          endsAt: ends,
          dayClass: row.preferred_day === weekdayName(date) ? 'PREFERE' : 'AUTORISE',
          reasons: [
            'Cursus CI DPS positionne les modules par année logique.',
            row.crosses_midnight ? 'Module traversant minuit supporté par date de fin distincte.' : 'Horaire habituel prérempli et modifiable.',
            'Aucun événement SCOPE opérationnel, attendu ou participation créé.'
          ],
          conflictSummary: { simultaneousEventsAllowed: true }
        });
      }
    }

    const futureDates = await db.query(
      `select * from scope_quo_vadis_future_dates
        where target_year = $1 and converted_obligation_id is null
        order by date_debut, activite_label`,
      [programme.annee]
    );
    for(const row of futureDates.rows){
      const obligation = await upsertObligation(programme, {
        sourceType: 'FUTURE_DATE',
        sourceRef: String(row.future_date_id),
        title: row.activite_label,
        domain: row.domain || null,
        priority: 10,
        imposedStartAt: row.heure_debut ? `${isoLocalDateTime(row.date_debut, row.heure_debut)}+00:00` : null,
        imposedEndAt: row.heure_fin ? `${isoLocalDateTime(row.date_fin || row.date_debut, row.heure_fin)}+00:00` : null,
        lieuLibre: row.lieu_libre || null,
        metadata: { source: 'QUO-VADIS-CORE-1', convertedFromFutureDate: row.future_date_id }
      });
      if(obligation){
        await db.query('update scope_quo_vadis_future_dates set converted_obligation_id = $1, updated_at = now() where future_date_id = $2', [obligation.obligation_id, row.future_date_id]);
        if(row.heure_debut){
          await insertProposal(obligation, {
            startsAt: `${isoLocalDateTime(row.date_debut, row.heure_debut)}+00:00`,
            endsAt: row.heure_fin ? `${isoLocalDateTime(row.date_fin || row.date_debut, row.heure_fin)}+00:00` : addMinutesIso(row.date_debut, row.heure_debut, 120),
            dayClass: 'PREFERE',
            reasons: ['Date future connue reprise sans double saisie.', 'Décision finale conservée côté utilisateur.'],
            conflictSummary: { imposedDate: true, simultaneousEventsAllowed: true },
            lieuLibre: row.lieu_libre || null
          });
        }
      }
    }

    return Object.assign(await listProgramme(programme.annee), {
      generation: {
        ok: true,
        obligationsTouched: created + futureDates.rows.length,
        operationalEventsCreated: 0,
        attendusCreated: 0,
        participationsCreated: 0
      }
    });
  }

  async function createFutureDate(body){
    const targetYear = Number(body && (body.targetYear || body.annee || body.year) || 2027);
    const result = await db.query(
      `insert into scope_quo_vadis_future_dates(target_year, date_debut, heure_debut, date_fin, heure_fin, activite_label, domain, lieu_libre, remarque, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'{"source":"UI"}'::jsonb)
       returning *`,
      [
        targetYear,
        body.dateDebut || body.date || `${targetYear}-01-01`,
        body.heureDebut || null,
        body.dateFin || null,
        body.heureFin || null,
        body.activiteLabel || body.label || 'Activite future',
        body.domain || body.domaine || null,
        body.lieuLibre || null,
        body.remarque || null
      ]
    );
    return { futureDate: result.rows[0] };
  }

  return { listProgramme, generateProgramme, createFutureDate };
}

module.exports = { createScopeQuoVadisService };
