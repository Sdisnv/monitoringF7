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

const WEEKDAY_LABELS = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche'
};

const DAY_CLASS_LABELS = {
  PREFERE: 'Préféré',
  AUTORISE: 'Possible',
  DECONSEILLE: 'Déconseillé',
  INTERDIT: 'À éviter sauf dérogation'
};

function addDays(date, days){
  const d = new Date(`${dateOnly(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function monthStart(year, month){
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function domainLabel(code){
  const value = String(code || '').toUpperCase();
  if(value === 'PR') return 'PAPR';
  return value || 'SCOPE';
}

function normalizeCode(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

function dayPolicyForDomain(domain){
  const base = {
    MONDAY: 'AUTORISE',
    TUESDAY: 'AUTORISE',
    WEDNESDAY: 'AUTORISE',
    THURSDAY: 'PREFERE',
    FRIDAY: 'DECONSEILLE',
    SATURDAY: 'AUTORISE',
    SUNDAY: 'DECONSEILLE'
  };
  if(String(domain || '').toUpperCase() === 'DAP') return Object.assign({}, base, { FRIDAY: 'AUTORISE' });
  return base;
}

function usualTimeForDomain(domain){
  const d = String(domain || '').toUpperCase();
  if(d === 'JSP') return { start: '18:30', end: '20:30', minutes: 120 };
  if(d === 'FOBA' || d === 'FOCA') return { start: '19:00', end: '21:30', minutes: 150 };
  return { start: '19:30', end: '21:30', minutes: 120 };
}

function isWeekend(date){
  const day = weekdayName(date);
  return day === 'SATURDAY' || day === 'SUNDAY';
}

function hasHolidayWeekend(calendarRows, date){
  const day = weekdayName(date);
  if(day !== 'SATURDAY' && day !== 'SUNDAY') return false;
  const saturday = day === 'SATURDAY' ? dateOnly(date) : addDays(date, -1);
  const sunday = day === 'SUNDAY' ? dateOnly(date) : addDays(date, 1);
  return (calendarRows || []).some((row) => {
    const kind = String(row.type_jour || row.typeJour || '').toUpperCase();
    const d = dateOnly(row.jour);
    return (kind === 'FERIE' || kind === 'WEEKEND_FERIE') && (d === saturday || d === sunday);
  });
}

function classifyDate(date, domain, calendarRows){
  const day = weekdayName(date);
  const policy = dayPolicyForDomain(domain);
  let dayClass = policy[day] || 'AUTORISE';
  const reasons = [`${WEEKDAY_LABELS[day] || day}: ${DAY_CLASS_LABELS[dayClass] || dayClass}.`];
  const special = (calendarRows || []).filter((row) => dateOnly(row.jour) === dateOnly(date));
  if(special.length){
    dayClass = 'DECONSEILLE';
    reasons.push(`Date particulière: ${special.map((row) => row.libelle).join(', ')}.`);
  }
  if(hasHolidayWeekend(calendarRows, date)){
    dayClass = 'DECONSEILLE';
    reasons.push('Week-end lié à un jour férié: dérogation nécessaire pour une instruction de section.');
  } else if(isWeekend(date) && dayClass === 'AUTORISE'){
    reasons.push('Week-end autorisé si compatible avec les contraintes métier.');
  }
  return { dayClass, reasons, weekday: WEEKDAY_LABELS[day] || day };
}

function compactEventCode(prefix, index){
  const raw = `${normalizeCode(prefix).replace(/-/g, '').slice(0, 9)}${String(index).padStart(3, '0')}`;
  return raw.slice(0, 15);
}

function monthForDomain(domain, index){
  const order = {
    DPS: 2,
    DAP: 3,
    FOBA: 4,
    FOCA: 5,
    JSP: 6,
    PR: 8,
    AUTO: 9,
    FOSPEC: 10
  };
  return Math.min(12, (order[String(domain || '').toUpperCase()] || 11) + (Number(index || 0) % 2));
}

function monthLabel(year, month){
  return new Intl.DateTimeFormat('fr-CH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00Z`));
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
    cursusId: row.cursus_id || null,
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
    preferredDay: row.preferred_day,
    preferredDayLabel: WEEKDAY_LABELS[row.preferred_day] || row.preferred_day || '',
    retenu: row.retenu === true,
    justification: row.justification || ''
  };
}

function mapCatalogue(row){
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    domain: row.domain || '',
    domainLabel: row.domain_label || domainLabel(row.domain),
    description: row.description || '',
    versionId: row.version_id || null,
    modeOrganisation: row.mode_organisation || 'SIMPLE',
    sessionCount: Number(row.session_count || 1),
    policyVersionId: row.policy_version_id || null,
    statcomCode: row.statcom_code || null,
    status: row.status || 'ACTIF',
    selected: row.selected !== false
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

  async function ensureDefaultCursusSelections(programme){
    await db.query(`
      insert into scope_quo_vadis_cursus_programmes(programme_id, cursus_id, retenu, justification, metadata)
      select $1, d.cursus_id, case when d.code = 'CI-DPS' then true else false end,
             case when d.code = 'CI-DPS' then 'Cursus CI DPS retenu pour 2027.' else null end,
             '{"source":"QUO-VADIS-PILOTAGE-2"}'::jsonb
        from scope_quo_vadis_cursus_definitions d
       where d.statut = 'ACTIF'
      on conflict (programme_id, cursus_id) do nothing
    `, [programme.programmeId]);
  }

  async function loadCatalogue(){
    const definitions = await db.query(`
      select d.definition_id as id,
             'DEFINITION' as source,
             d.label as title,
             d.domain,
             d.description,
             d.status,
             v.definition_version_id as version_id,
             v.mode_organisation,
             v.session_count,
             v.policy_version_id,
             v.statcom_code,
             true as selected
        from scope_event_definitions d
        left join lateral (
          select *
            from scope_event_definition_versions v
           where v.definition_id = d.definition_id
             and v.active is true
             and (v.valid_from is null or v.valid_from <= '2027-12-31')
             and (v.valid_to is null or v.valid_to >= '2027-01-01')
           order by v.valid_from desc nulls last, v.version_code desc
           limit 1
        ) v on true
       where d.status = 'ACTIF'
       order by d.domain, d.label
    `).catch(() => ({ rows: [] }));
    if(definitions.rows.length) return definitions.rows.map(mapCatalogue);
    const fallback = await db.query(`
      select c.cible_id as id,
             'CIBLE' as source,
             concat(coalesce(d.libelle, c.domaine_code), ' ', c.libelle) as title,
             c.domaine_code as domain,
             c.libelle as description,
             'ACTIF' as status,
             null as version_id,
             'SIMPLE' as mode_organisation,
             1 as session_count,
             null as policy_version_id,
             null as statcom_code,
             true as selected
        from scope_cibles c
        join scope_domaines d on d.code = c.domaine_code
       where c.actif is true
       order by c.domaine_code, c.niveau_code
    `).catch(() => ({ rows: [] }));
    return fallback.rows.map(mapCatalogue);
  }

  function programmeSummary(qv){
    const obligations = qv.obligations || [];
    const proposals = qv.proposals || [];
    const retained = proposals.filter((row) => row.status === 'RETENU').length;
    const conflicts = proposals.filter((row) => {
      const summary = row.conflictSummary || {};
      return summary.conflict || summary.requiresDerogation || summary.constraint === 'A_VERIFIER';
    }).length;
    return {
      totalActivites: obligations.length,
      planifiees: obligations.filter((row) => row.scopeEvenementId || row.statut === 'PLANIFIE').length,
      aArbitrer: obligations.filter((row) => ['A_PLANIFIER','PROPOSE'].includes(row.statut)).length,
      datesProposees: proposals.length,
      datesRetenues: retained,
      conflits: conflicts,
      cursusRetenus: (qv.cursusSelections || []).filter((row) => row.retenu).length,
      datesFutures: (qv.futureDates || []).length
    };
  }

  function buildAlerts(qv){
    const obligationsById = new Map((qv.obligations || []).map((row) => [row.obligationId, row]));
    const rows = [];
    for(const proposal of qv.proposals || []){
      const summary = proposal.conflictSummary || {};
      const obligation = obligationsById.get(proposal.obligationId) || {};
      let type = '';
      if(summary.conflict) type = 'Conflit';
      else if(summary.requiresDerogation || proposal.dayClass === 'INTERDIT' || proposal.dayClass === 'DECONSEILLE') type = 'Dérogation';
      else if(summary.constraint === 'A_VERIFIER' || summary.prerequisite === 'A_VERIFIER' || summary.astreinte === 'A_VERIFIER') type = 'À vérifier';
      else if(summary.imposedDate) type = 'Information';
      if(!type) continue;
      rows.push({
        type,
        proposalId: proposal.proposalId,
        obligationId: proposal.obligationId,
        title: obligation.title || 'Activité',
        domain: obligation.domain || '',
        domainLabel: domainLabel(obligation.domain),
        startsAt: proposal.startsAt,
        endsAt: proposal.endsAt,
        dayClass: proposal.dayClass,
        dayClassLabel: DAY_CLASS_LABELS[proposal.dayClass] || proposal.dayClass,
        lieuLibre: proposal.lieuLibre || obligation.lieuLibre || '',
        reasons: proposal.reasons || [],
        action: type === 'Information' ? 'Consulter' : 'Arbitrer'
      });
    }
    return rows;
  }

  function buildAnnualBreakdown(qv){
    const proposalsByObligation = new Map();
    for(const proposal of qv.proposals || []){
      const list = proposalsByObligation.get(proposal.obligationId) || [];
      list.push(proposal);
      proposalsByObligation.set(proposal.obligationId, list);
    }
    const domains = new Map();
    const months = new Map();
    for(const obligation of qv.obligations || []){
      const key = obligation.domain || 'SCOPE';
      if(!domains.has(key)) domains.set(key, { code: key, label: domainLabel(key), total: 0, positionnees: 0, aArbitrer: 0, alertes: 0 });
      const item = domains.get(key);
      const proposals = proposalsByObligation.get(obligation.obligationId) || [];
      const hasAlert = proposals.some((row) => {
        const summary = row.conflictSummary || {};
        return summary.conflict || summary.requiresDerogation || summary.constraint === 'A_VERIFIER' || summary.prerequisite === 'A_VERIFIER' || summary.astreinte === 'A_VERIFIER';
      });
      item.total += 1;
      if(obligation.statut === 'PLANIFIE' || obligation.scopeEvenementId) item.positionnees += 1;
      else item.aArbitrer += 1;
      if(hasAlert) item.alertes += 1;
      const firstDate = proposals.map((row) => dateOnly(row.startsAt)).filter(Boolean).sort()[0];
      if(firstDate){
        const monthKey = firstDate.slice(0, 7);
        if(!months.has(monthKey)){
          const month = Number(monthKey.slice(5, 7));
          months.set(monthKey, { month, label: monthLabel(qv.programme.annee, month), total: 0, positionnees: 0, alertes: 0 });
        }
        const monthItem = months.get(monthKey);
        monthItem.total += 1;
        if(obligation.statut === 'PLANIFIE' || obligation.scopeEvenementId) monthItem.positionnees += 1;
        if(hasAlert) monthItem.alertes += 1;
      }
    }
    return {
      domains: Array.from(domains.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
      months: Array.from(months.values()).sort((a, b) => a.month - b.month)
    };
  }

  function buildPlanning(qv){
    const calendarByDate = new Map((qv.calendarDays || []).map((row) => [row.jour, row]));
    const proposalsByObligation = new Map();
    for(const proposal of qv.proposals || []){
      const list = proposalsByObligation.get(proposal.obligationId) || [];
      list.push(proposal);
      proposalsByObligation.set(proposal.obligationId, list);
    }
    const obligationsById = new Map((qv.obligations || []).map((row) => [row.obligationId, row]));
    const months = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return {
        month,
        label: monthLabel(qv.programme.annee, month),
        days: []
      };
    });
    for(const proposal of qv.proposals || []){
      const date = dateOnly(proposal.startsAt);
      const monthIndex = Number(date.slice(5, 7)) - 1;
      if(monthIndex < 0 || monthIndex > 11) continue;
      const obligation = obligationsById.get(proposal.obligationId) || {};
      const day = months[monthIndex].days.find((row) => row.date === date) || {
        date,
        day: Number(date.slice(8, 10)),
        weekday: WEEKDAY_LABELS[weekdayName(date)] || '',
        weekend: isWeekend(date),
        calendar: calendarByDate.get(date) || null,
        items: []
      };
      if(!months[monthIndex].days.includes(day)) months[monthIndex].days.push(day);
      day.items.push({
        proposalId: proposal.proposalId,
        obligationId: proposal.obligationId,
        title: obligation.title || 'Activité',
        domain: obligation.domain || '',
        startsAt: proposal.startsAt,
        endsAt: proposal.endsAt,
        status: proposal.status,
        dayClass: proposal.dayClass,
        dayClassLabel: DAY_CLASS_LABELS[proposal.dayClass] || proposal.dayClass,
        reasons: proposal.reasons || [],
        conflictSummary: proposal.conflictSummary || {}
      });
    }
    months.forEach((month) => month.days.sort((a, b) => a.date.localeCompare(b.date)));
    return { months };
  }

  async function listProgramme(annee = 2027){
    const programme = await ensureProgramme(annee);
    await ensureDefaultCursusSelections(programme);
    const [obligations, proposals, calendar, lieux, cursus, cursusSelections, rules, futureDates, dps, catalogue] = await Promise.all([
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
        select d.cursus_id, d.code, d.libelle, v.version_code, s.step_code, s.libelle as step_label, s.ordre,
               s.logical_year, s.usual_start_time, s.usual_end_time, s.crosses_midnight, s.preferred_day,
               cp.retenu, cp.justification
          from scope_quo_vadis_cursus_definitions d
          join scope_quo_vadis_cursus_versions v on v.cursus_id = d.cursus_id
          join scope_quo_vadis_cursus_steps s on s.cursus_version_id = v.cursus_version_id
          left join scope_quo_vadis_cursus_programmes cp on cp.cursus_id = d.cursus_id and cp.programme_id = $1
         order by d.code, v.version_code, s.ordre
      `, [programme.programmeId]),
      db.query(`
        select d.cursus_id, d.code, d.libelle, cp.retenu, cp.justification
          from scope_quo_vadis_cursus_definitions d
          left join scope_quo_vadis_cursus_programmes cp on cp.cursus_id = d.cursus_id and cp.programme_id = $1
         where d.statut = 'ACTIF'
         order by d.libelle
      `, [programme.programmeId]),
      db.query(`select * from scope_quo_vadis_planning_rules where active is true order by domain nulls last, code`),
      db.query(`select * from scope_quo_vadis_future_dates where target_year = $1 order by date_debut, activite_label`, [programme.annee]),
      db.query(`select * from scope_quo_vadis_dps_organisation_versions order by oi_code, valid_from`),
      loadCatalogue()
    ]);
    const result = {
      programme,
      obligations: obligations.rows.map(mapObligation),
      proposals: proposals.rows.map(mapProposal),
      calendarDays: calendar.rows.map(mapCalendarDay),
      lieux: lieux.rows.map(mapLieu),
      cursus: cursus.rows.map(mapCursus),
      cursusSelections: cursusSelections.rows.map((row) => ({
        cursusId: row.cursus_id,
        code: row.code,
        libelle: row.libelle,
        retenu: row.retenu === true,
        justification: row.justification || ''
      })),
      catalogue,
      rules: rules.rows.map((row) => ({
        ruleId: row.rule_id,
        code: row.code,
        versionCode: row.version_code,
        domain: row.domain,
        domainLabel: domainLabel(row.domain),
        dayPolicy: row.day_policy || {},
        dayPolicyLabels: Object.fromEntries(Object.entries(row.day_policy || {}).map(([day, value]) => [WEEKDAY_LABELS[day] || day, DAY_CLASS_LABELS[value] || value])),
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
    result.summary = programmeSummary(result);
    result.alerts = buildAlerts(result);
    result.breakdown = buildAnnualBreakdown(result);
    result.planning = buildPlanning(result);
    result.engineNotes = [
      'Les dates proposées restent indicatives: l’utilisateur arbitre.',
      'Plusieurs activités peuvent partager le même jour.',
      'Les dérogations sont possibles et doivent être justifiées.',
      'Aucune présence ni population opérationnelle n’est créée par QUO VADIS.'
    ];
    return result;
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

  async function generateCatalogueObligations(programme, calendarRows){
    const catalogue = await loadCatalogue();
    let touched = 0;
    let index = 0;
    for(const item of catalogue.filter((row) => row.selected !== false)){
      index += 1;
      const month = monthForDomain(item.domain, index);
      const first = monthStart(programme.annee, month);
      const date = addDays(first, 7 + (index % 14));
      const time = usualTimeForDomain(item.domain);
      const classification = classifyDate(date, item.domain, calendarRows);
      const obligation = await upsertObligation(programme, {
        sourceType: item.source === 'DEFINITION' ? 'DEFINITION' : 'RECURRENT',
        sourceRef: item.versionId || item.id,
        title: item.title,
        domain: item.domain || null,
        priority: 60 + index,
        statcomPolicy: item.statcomCode ? 'OBLIGATOIRE' : 'A_CONFIRMER',
        numberingPattern: item.sessionCount > 1 ? '1.1' : null,
        metadata: {
          source: 'QUO-VADIS-PILOTAGE-2',
          catalogueSource: item.source,
          definitionVersionId: item.versionId,
          modeOrganisation: item.modeOrganisation,
          sessionCount: item.sessionCount,
          codeEvenementPreview: compactEventCode(item.domain || item.title, index),
          noOperationalEventCreated: true
        }
      });
      if(!obligation) continue;
      touched += 1;
      await insertProposal(obligation, {
        startsAt: `${isoLocalDateTime(date, time.start)}+00:00`,
        endsAt: addMinutesIso(date, time.start, time.minutes),
        dayClass: classification.dayClass,
        reasons: [
          `Activité issue du catalogue SCOPE (${item.domainLabel}).`,
          `Horaire indicatif ${time.start}–${time.end}, modifiable.`,
          ...classification.reasons
        ],
        conflictSummary: {
          simultaneousEventsAllowed: true,
          requiresDerogation: classification.dayClass === 'INTERDIT' || classification.dayClass === 'DECONSEILLE',
          source: 'catalogue'
        }
      });
    }
    return touched;
  }

  async function generateDpsInstructionObligations(programme, calendarRows){
    const dps = await db.query(`select * from scope_quo_vadis_dps_organisation_versions where valid_from <= $1 and (valid_to is null or valid_to >= $2) order by oi_code`, [`${programme.annee}-12-31`, `${programme.annee}-01-01`]);
    const order = [
      { code: 'KICK-OFF', label: 'KICK-OFF', sites: ['G1','C1','B1','B2'], month: 2 },
      { code: 'ABC', label: 'ABC', sites: ['G1'], month: 3 },
      { code: 'VARIA-BASE', label: 'VARIA', sites: ['C1','B1','B2'], month: 4 },
      { code: 'VARIA-G1', label: 'VARIA', sites: ['G1'], month: 5 },
      { code: 'FEU', label: 'FEU', sites: ['C1','B1','B2'], month: 6 },
      { code: 'PIONNIER', label: 'PIONNIER', sites: ['G1'], month: 9 }
    ];
    const knownSites = new Set(dps.rows.map((row) => row.oi_code));
    let touched = 0;
    for(const [idx, item] of order.entries()){
      for(const site of item.sites.filter((s) => knownSites.has(s))){
        const date = addDays(monthStart(programme.annee, item.month), 5 + idx);
        const classification = classifyDate(date, 'DPS', calendarRows);
        const isPionnier = item.code === 'PIONNIER';
        const obligation = await upsertObligation(programme, {
          sourceType: 'DPS_RULE',
          sourceRef: `${site}:${item.code}:2027`,
          title: `${site} — ${item.label}`,
          domain: 'DPS',
          cibleCodes: [site],
          priority: 30 + idx,
          statcomPolicy: 'A_CONFIRMER',
          metadata: {
            source: 'QUO-VADIS-PILOTAGE-2',
            ordreMetier: idx + 1,
            prerequis: item.code === 'KICK-OFF' ? [] : ['Demi-sections concernées réalisées avant instruction de section'],
            pionnierAstreinte: isPionnier ? 'À vérifier semaine N et semaine N-1' : null,
            derogationPossible: true,
            noOperationalEventCreated: true
          }
        });
        if(!obligation) continue;
        touched += 1;
        await insertProposal(obligation, {
          startsAt: `${isoLocalDateTime(date, '19:30')}+00:00`,
          endsAt: addMinutesIso(date, '19:30', 120),
          dayClass: classification.dayClass,
          reasons: [
            `Ordre métier ${idx + 1}: ${item.label}.`,
            item.code === 'KICK-OFF' ? 'Démarrage commun tous sites.' : 'Prérequis demi-sections à contrôler avant validation.',
            isPionnier ? 'Contrainte PIONNIER: astreinte semaine N et N-1 à vérifier.' : 'Dérogation possible si arbitrée.',
            ...classification.reasons
          ],
          conflictSummary: {
            simultaneousEventsAllowed: true,
            requiresDerogation: classification.dayClass === 'INTERDIT' || classification.dayClass === 'DECONSEILLE',
            prerequisite: item.code === 'KICK-OFF' ? 'OK' : 'A_VERIFIER',
            astreinte: isPionnier ? 'A_VERIFIER' : null
          }
        });
      }
    }
    return touched;
  }

  async function generateProgramme(annee = 2027){
    const programme = await ensureProgramme(annee);
    const before = await listProgramme(programme.annee);
    await seedCalendar(programme);
    await ensureDefaultCursusSelections(programme);
    const calendarRows = (await db.query(`select * from scope_quo_vadis_calendar_days where programme_id = $1`, [programme.programmeId])).rows;

    const steps = await db.query(`
      select s.*, c.cohorte_id, c.code as cohorte_code, c.current_logical_year
        from scope_quo_vadis_cursus_steps s
        join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id
        join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
        join scope_quo_vadis_cohortes c on c.cursus_version_id = v.cursus_version_id
        join scope_quo_vadis_cursus_programmes cp on cp.cursus_id = d.cursus_id and cp.programme_id = $1 and cp.retenu is true
       where d.code = 'CI-DPS'
         and ((c.code = 'CI-DPS-2026' and s.logical_year = 2) or (c.code = 'CI-DPS-2027' and s.logical_year = 1))
       order by c.code, s.ordre
    `, [programme.programmeId]);
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
      const classification = classifyDate(date, 'DPS', calendarRows);
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
          crossesMidnight: row.crosses_midnight === true,
          selectedCursus: true
        }
      });
      if(obligation){
        created += 1;
        await insertProposal(obligation, {
          startsAt: starts,
          endsAt: ends,
          dayClass: row.preferred_day === weekdayName(date) ? 'PREFERE' : classification.dayClass,
          reasons: [
            'Cursus CI DPS positionne les modules par année logique.',
            row.crosses_midnight ? 'Module traversant minuit supporté par date de fin distincte.' : 'Horaire habituel prérempli et modifiable.',
            ...classification.reasons,
            'Aucun événement SCOPE opérationnel, attendu ou participation créé.'
          ],
          conflictSummary: {
            simultaneousEventsAllowed: true,
            requiresDerogation: classification.dayClass === 'INTERDIT' || classification.dayClass === 'DECONSEILLE'
          }
        });
      }
    }

    const catalogueTouched = await generateCatalogueObligations(programme, calendarRows);
    const dpsTouched = await generateDpsInstructionObligations(programme, calendarRows);

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

    const after = await listProgramme(programme.annee);
    const beforeSummary = before.summary || {};
    const afterSummary = after.summary || {};
    const newProposals = Math.max(0, Number(afterSummary.datesProposees || 0) - Number(beforeSummary.datesProposees || 0));
    return Object.assign(after, {
      generation: {
        ok: true,
        before: beforeSummary,
        after: afterSummary,
        newObligations: Math.max(0, Number(afterSummary.totalActivites || 0) - Number(beforeSummary.totalActivites || 0)),
        newProposals,
        unchangedProposals: Math.max(0, Number(afterSummary.datesProposees || 0) - newProposals),
        attentionPoints: Number(afterSummary.conflits || 0),
        obligationsTouched: created + catalogueTouched + dpsTouched + futureDates.rows.length,
        catalogueTouched,
        dpsTouched,
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

  async function setCursusSelection(annee, body = {}){
    const programme = await ensureProgramme(annee);
    await ensureDefaultCursusSelections(programme);
    const code = String(body.code || body.cursusCode || '').trim();
    const retenu = body.retenu !== false;
    const result = await db.query(
      `update scope_quo_vadis_cursus_programmes cp
          set retenu = $3,
              justification = $4,
              updated_at = now(),
              metadata = cp.metadata || '{"source":"QUO-VADIS-PILOTAGE-2","userSelection":true}'::jsonb
         from scope_quo_vadis_cursus_definitions d
        where d.cursus_id = cp.cursus_id
          and cp.programme_id = $1
          and d.code = $2
        returning d.code, d.libelle, cp.retenu, cp.justification`,
      [programme.programmeId, code, retenu, body.justification || null]
    );
    if(!result.rows[0]) return { updated: false };
    return { updated: true, cursus: result.rows[0], quoVadis: await listProgramme(programme.annee) };
  }

  async function retainProposal(proposalId, body = {}){
    const proposal = await db.query(
      `select p.*, o.programme_id
         from scope_quo_vadis_proposals p
         join scope_quo_vadis_obligations o on o.obligation_id = p.obligation_id
        where p.proposal_id = $1`,
      [proposalId]
    );
    if(!proposal.rows[0]) return { updated: false };
    const row = proposal.rows[0];
    await db.query(`update scope_quo_vadis_proposals set status = case when proposal_id = $1 then 'RETENU' else 'ECARTE' end, updated_at = now() where obligation_id = $2`, [proposalId, row.obligation_id]);
    await db.query(
      `update scope_quo_vadis_obligations
          set selected_proposal_id = $1,
              statut = 'PLANIFIE',
              metadata = metadata || $3::jsonb,
              updated_at = now()
        where obligation_id = $2`,
      [proposalId, row.obligation_id, JSON.stringify({ arbitrage: { retainedAt: new Date().toISOString(), justification: body.justification || null, noOperationalEventCreated: true } })]
    );
    const programme = await db.query(`select annee from scope_quo_vadis_programmes where programme_id = $1`, [row.programme_id]);
    return { updated: true, quoVadis: await listProgramme(programme.rows[0] && programme.rows[0].annee || 2027) };
  }

  return { listProgramme, generateProgramme, createFutureDate, setCursusSelection, retainProposal };
}

module.exports = { createScopeQuoVadisService };
