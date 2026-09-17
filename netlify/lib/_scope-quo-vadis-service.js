const db = require('./_postgres');
const coverage = require('./_scope-quo-vadis-coverage');

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
  PREFERE: 'Préférée',
  AUTORISE: 'Possible',
  DECONSEILLE: 'Déconseillée',
  INTERDIT: 'Interdite'
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
  const hasFerie = special.some((row) => ['FERIE', 'VEILLE_FERIE', 'WEEKEND_FERIE'].includes(String(row.type_jour || row.typeJour || '').toUpperCase()));
  const hasVacances = special.some((row) => String(row.type_jour || row.typeJour || '').toUpperCase() === 'VACANCES_SCOLAIRES');
  if(hasFerie){
    dayClass = 'INTERDIT';
    reasons.push(`Jour férié: ${special.filter((row) => String(row.type_jour || row.typeJour || '').toUpperCase().includes('FERIE')).map((row) => row.libelle).join(', ')}. Dérogation nécessaire.`);
  } else if(hasVacances){
    dayClass = 'DECONSEILLE';
    reasons.push(`Vacances scolaires: ${special.map((row) => row.libelle).join(', ')}.`);
  } else if(special.length){
    dayClass = 'DECONSEILLE';
    reasons.push(`Date particulière: ${special.map((row) => row.libelle).join(', ')}.`);
  }
  if(hasHolidayWeekend(calendarRows, date)){
    dayClass = dayClass === 'INTERDIT' ? 'INTERDIT' : 'DECONSEILLE';
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
    activityKind: row.activity_kind || (row.metadata && row.metadata.activityKind) || '',
    periodicityYears: row.periodicity_years == null ? null : Number(row.periodicity_years),
    includeInProgramme: row.include_in_programme !== false,
    lastOccurrence: dateOnly(row.last_occurrence),
    classification: row.classification || {},
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

const TYPE_JOUR_LABELS = {
  FERIE: 'Jour férié',
  VACANCES_SCOLAIRES: 'Vacances scolaires',
  VEILLE_FERIE: 'Veille de férié',
  WEEKEND_FERIE: 'Week-end férié',
  NEUTRALISATION_INTERNE: 'Neutralisation interne',
  DEROGATION: 'Dérogation'
};

function mapCalendarDay(row){
  const typeJour = row.type_jour || '';
  return {
    calendarDayId: row.calendar_day_id,
    jour: dateOnly(row.jour),
    typeJour,
    typeLabel: TYPE_JOUR_LABELS[typeJour] || 'Contrainte de calendrier',
    libelle: row.libelle,
    neutralise: row.neutralise === true
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

const LIEU_A_DEFINIR = 'Lieu à définir';

function lieuLabel(lieu){
  if(!lieu) return '';
  return [lieu.nomCourt || lieu.nom_court, lieu.localite].filter(Boolean).join(' · ');
}

function displayLieuLabel(lieu, fallbackLibre){
  const resolved = lieuLabel(lieu) || String(fallbackLibre || '').trim();
  return resolved || LIEU_A_DEFINIR;
}

function indexLieux(rows){
  const byId = new Map();
  const byOi = new Map();
  (rows || []).forEach((row) => {
    const id = row.lieuId || row.lieu_id;
    if(id) byId.set(String(id), row);
    const oi = String(row.oiCode || row.oi_code || '').toUpperCase();
    if(oi && !byOi.has(oi)) byOi.set(oi, row);
  });
  return { byId, byOi };
}

function resolveActivityLieu(obligation, retained, lieux){
  const index = indexLieux(lieux);
  const lieuId = (retained && retained.lieuId) || obligation.lieuId || null;
  if(lieuId && index.byId.get(String(lieuId))) return index.byId.get(String(lieuId));
  const oi = String((obligation.cibleCodes || [])[0] || '').toUpperCase();
  if(oi && index.byOi.get(oi)) return index.byOi.get(oi);
  return null;
}

function normalizeActivityTitle(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(g1|c1|b1|b2)\s*[—\-:.]+\s*/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleTokens(value){
  return normalizeActivityTitle(value).split(/\s+/).filter((token) => token.length >= 4);
}

function scoreHistoricalMatch(activity, row){
  const domainA = String(activity.domain || '').toUpperCase();
  const domainB = String(row.domain || '').toUpperCase();
  if(domainA && domainB && domainA !== domainB) return { score: 0, confidence: '', uncertain: true };
  const wanted = normalizeActivityTitle(activity.title || (activity.metadata && activity.metadata.displayLabel));
  const found = normalizeActivityTitle(row.title);
  if(!wanted || !found) return { score: 0, confidence: '', uncertain: true };
  let score = 0;
  if(wanted === found) score += 70;
  else if(wanted.includes(found) || found.includes(wanted)) score += 55;
  else {
    const overlap = titleTokens(wanted).filter((token) => titleTokens(found).includes(token));
    if(overlap.length) score += 18 + overlap.length * 10;
  }
  const oi = String((activity.cibleCodes || [])[0] || '').toUpperCase();
  const rowOi = String(row.sousDomaine || '').toUpperCase();
  if(oi && (rowOi === oi || String(row.title || '').toUpperCase().includes(oi))) score += 18;
  const exercice = normalizeActivityTitle(row.exerciceLibelle || row.codeEvenement);
  if(exercice && wanted && (wanted.includes(exercice) || exercice.includes(wanted.split(' ')[0] || ''))) score += 12;
  if(score < 55) return { score: 0, confidence: '', uncertain: true };
  return {
    score,
    confidence: score >= 80 ? 'Correspondance probable' : 'Correspondance à confirmer',
    uncertain: score < 80
  };
}

function mapHistoricalEvent(row){
  return {
    date: dateOnly(row.date),
    weekday: WEEKDAY_LABELS[weekdayName(row.date)] || '',
    domain: row.domaine_code || '',
    sousDomaine: row.sous_domaine_code || '',
    title: row.libelle || row.exercice_libelle || '',
    exerciceLibelle: row.exercice_libelle || '',
    codeEvenement: row.code_cours || row.code_source || row.exercice_code || '',
    startsAt: row.heure_debut_prevue || row.heure_debut || '',
    endsAt: row.heure_fin_prevue || row.heure_fin || '',
    lieu: String(row.salle || '').trim() || LIEU_A_DEFINIR,
    organisation: [row.sous_domaine_code, row.session_label].filter(Boolean).join(' · '),
    statcomCode: row.statcom_code || row.exercice_statcom || '',
    statut: row.statut || '',
    hiddenAt: row.hidden_at || null
  };
}

function mapCursus(row){
  const logicalYear = Number(row.logical_year);
  return {
    cursusId: row.cursus_id || null,
    code: row.code,
    libelle: row.libelle,
    versionCode: row.version_code,
    stepId: row.step_id || null,
    stepCode: row.step_code,
    stepLabel: row.step_label,
    ordre: Number(row.ordre),
    logicalYear,
    startYearLabel: logicalYear === 2 ? 'Début du cursus 2026' : 'Début du cursus 2027',
    yearLabel: `Année ${logicalYear || 1}`,
    usualStartTime: row.usual_start_time,
    usualEndTime: row.usual_end_time,
    crossesMidnight: row.crosses_midnight === true,
    preferredDay: row.preferred_day,
    preferredDayLabel: WEEKDAY_LABELS[row.preferred_day] || row.preferred_day || '',
    retenu: row.retenu === true,
    stepRetenu: row.step_retenu !== false,
    justification: row.justification || ''
  };
}

function activityMatchKey(domain, oi, title){
  return `${String(domain || '').toUpperCase()}|${String(oi || '').toUpperCase()}|${coverage.normalizeTitle(title)}`;
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

  async function ensureDefaultCursusStepSelections(programme){
    await db.query(`
      insert into scope_quo_vadis_cursus_step_programmes(programme_id, step_id, retenu, metadata)
      select $1, s.step_id, true, '{"source":"QUO-VADIS-COVERAGE-1"}'::jsonb
        from scope_quo_vadis_cursus_steps s
        join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id
        join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
       where d.statut = 'ACTIF'
      on conflict (programme_id, step_id) do nothing
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
        activityId: proposal.obligationId,
        title: obligation.title || 'Activité',
        domain: obligation.domain || '',
        domainLabel: domainLabel(obligation.domain),
        startsAt: proposal.startsAt,
        endsAt: proposal.endsAt,
        dayClass: proposal.dayClass,
        dayClassLabel: DAY_CLASS_LABELS[proposal.dayClass] || proposal.dayClass,
        lieu: displayLieuLabel(resolveActivityLieu(obligation, proposal, qv.lieux || []), proposal.lieuLibre || obligation.lieuLibre),
        reasons: proposal.reasons || [],
        action: type === 'Information' ? 'Consulter' : 'Arbitrer'
      });
    }
    for(const activity of qv.activities || []){
      if(!activity.knownDateClash) continue;
      rows.push({
        type: 'Information',
        proposalId: activity.proposalId || null,
        obligationId: activity.obligationId,
        activityId: activity.activityId,
        title: activity.title,
        domain: activity.domain || '',
        domainLabel: activity.domainLabel || domainLabel(activity.domain),
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
        dayClass: activity.dayClass,
        dayClassLabel: activity.dayClassLabel || '',
        lieu: activity.lieu || LIEU_A_DEFINIR,
        reasons: ['Une date annoncée est déjà enregistrée ce jour.'],
        action: 'Consulter la fiche'
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
          const year = Number(monthKey.slice(0, 4));
          const month = Number(monthKey.slice(5, 7));
          months.set(monthKey, { month, year, key: monthKey, label: monthLabel(year, month), total: 0, positionnees: 0, alertes: 0 });
        }
        const monthItem = months.get(monthKey);
        monthItem.total += 1;
        if(obligation.statut === 'PLANIFIE' || obligation.scopeEvenementId) monthItem.positionnees += 1;
        if(hasAlert) monthItem.alertes += 1;
      }
    }
    return {
      domains: Array.from(domains.values()).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
      months: Array.from(months.values()).sort((a, b) => String(a.key || '').localeCompare(String(b.key || '')))
    };
  }

  async function loadHistoricalEventRows(year, domain){
    try {
      const result = await db.query(`
        select e.evenement_id, e.date, e.domaine_code, e.sous_domaine_code, e.libelle,
               e.code_cours, e.code_source, e.heure_debut, e.heure_fin,
               e.heure_debut_prevue, e.heure_fin_prevue, e.salle, e.session_index,
               e.session_label, e.exercice_id, e.statut, e.hidden_at, e.statcom_code,
               e.exercise_equivalence_key,
               x.code as exercice_code, x.libelle as exercice_libelle, x.mode_session,
               x.statcom_code as exercice_statcom
          from scope_evenements e
          left join scope_exercices x on x.exercice_id = e.exercice_id
         where extract(year from e.date) = $1
           and ($2::text is null or e.domaine_code = $2)
         order by e.date desc, e.libelle
      `, [year, domain || null]);
      return result.rows.map(mapHistoricalEvent);
    } catch (error) {
      console.error('QUO VADIS: historique 2026 indisponible (lecture salle)', error && error.message ? error.message : error);
      throw error;
    }
  }

  async function listActivityReferences(annee, activityId){
    const qv = await listProgramme(annee);
    const activity = (qv.activities || []).find((row) => String(row.activityId) === String(activityId));
    if(!activity) return { activityId, references: [] };
    const year = Number(qv.programme && qv.programme.annee || annee || 2027) - 1;
    const rows = await loadHistoricalEventRows(year, activity.domain || null);
    const scored = rows
      .map((row) => {
        const match = scoreHistoricalMatch(activity, row);
        return {
          row: Object.assign({}, row, {
            confidence: match.confidence,
            uncertain: match.uncertain
          }),
          score: match.score
        };
      })
      .filter((item) => item.score >= 55)
      .sort((a, b) => b.score - a.score || String(b.row.date).localeCompare(String(a.row.date)))
      .slice(0, 3)
      .map((item) => ({
        date: item.row.date,
        weekday: item.row.weekday,
        title: item.row.title,
        startsAt: item.row.startsAt,
        endsAt: item.row.endsAt,
        lieu: item.row.lieu,
        organisation: item.row.organisation || item.row.sousDomaine || '',
        confidence: item.row.confidence,
        uncertain: item.row.uncertain
      }));
    return { activityId, references: scored };
  }

  function buildActivities(qv){
    const proposalsByObligation = new Map();
    for(const proposal of qv.proposals || []){
      const list = proposalsByObligation.get(proposal.obligationId) || [];
      list.push(proposal);
      proposalsByObligation.set(proposal.obligationId, list);
    }
    return (qv.obligations || []).map((obligation) => {
      const proposals = (proposalsByObligation.get(obligation.obligationId) || []).sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
      const retained = proposals.find((row) => row.status === 'RETENU') || proposals[0] || {};
      const conflict = retained.conflictSummary || {};
      const lieu = resolveActivityLieu(obligation, retained, qv.lieux || []);
      const lieuId = (lieu && (lieu.lieuId || lieu.lieu_id)) || retained.lieuId || obligation.lieuId || null;
      const knownSameDay = (qv.futureDates || []).some((row) => row.dateDebut && row.dateDebut === dateOnly(retained.startsAt || obligation.imposedStartAt) && obligation.sourceType !== 'FUTURE_DATE');
      const hasAttention = conflict.conflict || conflict.requiresDerogation || conflict.constraint === 'A_VERIFIER' || conflict.prerequisite === 'A_VERIFIER' || conflict.astreinte === 'A_VERIFIER' || knownSameDay;
      const cursus = obligation.sourceType === 'CURSUS' ? 'CI DPS' : '';
      const metadata = obligation.metadata || {};
      const sourceLabels = {
        DEFINITION: 'Référentiel formation',
        CURSUS: 'Cursus retenu',
        DPS_RULE: 'Règle DPS',
        FUTURE_DATE: 'Date annoncée',
        HISTORIQUE: 'Référence 2026',
        CYCLIQUE: 'Activité cyclique',
        OPTIONNELLE: 'Activité optionnelle',
        RECURRENT: 'Configuration annuelle',
        MANUAL: 'Saisie manuelle'
      };
      return {
        activityId: obligation.obligationId,
        obligationId: obligation.obligationId,
        title: metadata.displayLabel || obligation.title,
        domain: obligation.domain || '',
        domainLabel: domainLabel(obligation.domain),
        cibleCodes: obligation.cibleCodes || [],
        specialisation: obligation.domain === 'PR' || obligation.domain === 'AUTO' ? (obligation.cibleCodes || []).join(', ') : '',
        cursus,
        specCursus: [obligation.domain === 'PR' || obligation.domain === 'AUTO' ? (obligation.cibleCodes || []).join(', ') : '', cursus].filter(Boolean).join(' · '),
        status: obligation.statut,
        proposalId: retained.proposalId || null,
        startsAt: retained.startsAt || obligation.imposedStartAt || null,
        endsAt: retained.endsAt || obligation.imposedEndAt || null,
        weekday: retained.startsAt ? (WEEKDAY_LABELS[weekdayName(retained.startsAt)] || '') : '',
        lieuId,
        lieu: displayLieuLabel(lieu, retained.lieuLibre || obligation.lieuLibre),
        dayClass: retained.dayClass || '',
        dayClassLabel: retained.dayClass ? (DAY_CLASS_LABELS[retained.dayClass] || retained.dayClass) : '',
        reasons: (retained.reasons || []).concat(knownSameDay ? ['Une date annoncée est déjà enregistrée ce jour.'] : []),
        attention: hasAttention,
        attentionType: conflict.conflict ? 'Conflit' : conflict.requiresDerogation ? 'Dérogation' : (conflict.prerequisite === 'A_VERIFIER' || conflict.astreinte === 'A_VERIFIER' || conflict.constraint === 'A_VERIFIER') ? 'À vérifier' : knownSameDay ? 'Information' : '',
        proposals: proposals.map((proposal) => {
          const proposalLieu = resolveActivityLieu(obligation, proposal, qv.lieux || []);
          return Object.assign({}, proposal, {
            lieuId: (proposalLieu && (proposalLieu.lieuId || proposalLieu.lieu_id)) || proposal.lieuId || null,
            lieu: displayLieuLabel(proposalLieu, proposal.lieuLibre || obligation.lieuLibre),
            dayClassLabel: DAY_CLASS_LABELS[proposal.dayClass] || proposal.dayClass || ''
          });
        }),
        sourceType: obligation.sourceType,
        sourceLabel: sourceLabels[obligation.sourceType] || 'Configuration annuelle',
        activityKind: obligation.activityKind || metadata.activityKind || '',
        family: (obligation.classification && obligation.classification.family) || metadata.family || '',
        subcategory: (obligation.classification && obligation.classification.subcategory) || metadata.subcategory || '',
        statcomCode: obligation.statcomCode || metadata.statcomCode || '',
        knownDate: obligation.sourceType === 'FUTURE_DATE',
        knownDateClash: knownSameDay
      };
    });
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
      const lieu = resolveActivityLieu(obligation, proposal, qv.lieux || []);
      day.items.push({
        proposalId: proposal.proposalId,
        obligationId: proposal.obligationId,
        activityId: proposal.obligationId,
        title: obligation.title || 'Activité',
        domain: obligation.domain || '',
        cibleCodes: obligation.cibleCodes || [],
        startsAt: proposal.startsAt,
        endsAt: proposal.endsAt,
        status: proposal.status,
        lieu: displayLieuLabel(lieu, proposal.lieuLibre || obligation.lieuLibre),
        knownDate: obligation.sourceType === 'FUTURE_DATE',
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
    await ensureDefaultCursusStepSelections(programme);
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
        select d.cursus_id, d.code, d.libelle, v.version_code, s.step_id, s.step_code, s.libelle as step_label, s.ordre,
               s.logical_year, s.usual_start_time, s.usual_end_time, s.crosses_midnight, s.preferred_day,
               cp.retenu, cp.justification, coalesce(csp.retenu, true) as step_retenu
          from scope_quo_vadis_cursus_definitions d
          join scope_quo_vadis_cursus_versions v on v.cursus_id = d.cursus_id
          join scope_quo_vadis_cursus_steps s on s.cursus_version_id = v.cursus_version_id
          left join scope_quo_vadis_cursus_programmes cp on cp.cursus_id = d.cursus_id and cp.programme_id = $1
          left join scope_quo_vadis_cursus_step_programmes csp on csp.programme_id = $1 and csp.step_id = s.step_id
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
      futureDates: futureDates.rows.map((row) => {
        const meta = row.metadata || {};
        const lieu = (lieux.rows.map(mapLieu).find((item) => String(item.lieuId) === String(row.lieu_id)) || null);
        return {
          futureDateId: row.future_date_id,
          targetYear: Number(row.target_year),
          dateDebut: dateOnly(row.date_debut),
          heureDebut: row.heure_debut || '',
          dateFin: dateOnly(row.date_fin),
          heureFin: row.heure_fin || '',
          activiteLabel: row.activite_label,
          domain: row.domain || '',
          cibleCode: meta.cibleCode || '',
          specialisation: meta.specialisation || '',
          lieuId: row.lieu_id || null,
          lieuLibre: row.lieu_libre || '',
          lieu: displayLieuLabel(lieu, row.lieu_libre),
          remarque: row.remarque || '',
          convertedObligationId: row.converted_obligation_id || null,
          statutLabel: row.converted_obligation_id ? 'prise en compte' : 'à prendre en compte'
        };
      }),
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
    result.activities = buildActivities(result);
    const knownClashDays = new Set((result.activities || []).filter((row) => row.knownDateClash).map((row) => dateOnly(row.startsAt)));
    result.futureDates = (result.futureDates || []).map((row) => Object.assign({}, row, {
      statutLabel: knownClashDays.has(row.dateDebut) ? 'conflit éventuel' : row.statutLabel
    }));
    result.alerts = buildAlerts(result);
    result.breakdown = buildAnnualBreakdown(result);
    result.planning = buildPlanning(result);
    result.engineNotes = [
      'Les dates proposées restent indicatives: l’utilisateur arbitre.',
      'Plusieurs activités peuvent partager le même jour.',
      'Les dérogations sont possibles et doivent être justifiées.',
      'Aucune présence ni population opérationnelle n’est créée par QUO VADIS.',
      'Le programme 2026 sert de référence historique; les dates 2027 sont recherchées selon les règles.'
    ];
    try {
      const historicalRows = await loadYearEventRows(programme.annee - 1);
      const coverageReport = coverage.summarizeCoverage(historicalRows, programme.annee);
      result.coverage = {
        sourceLines: coverageReport.sourceLines,
        recognized: coverageReport.recognized,
        duplicated: coverageReport.duplicated,
        sessions: coverageReport.sessions,
        excluded: coverageReport.excluded,
        ignored: coverageReport.ignored,
        previouslyIgnored: coverageReport.ignored,
        previouslyLost: coverageReport.generable,
        cursusDeferred: coverageReport.cursusDeferred,
        cyclicDeferred: coverageReport.cyclicDeferred,
        generable: coverageReport.generable,
        reasonCounts: coverageReport.reasonCounts,
        traces: coverageReport.traces
      };
    } catch (error) {
      console.error('QUO VADIS: historique 2026 indisponible', error);
      result.coverage = (programme.metadata && programme.metadata.coverage) || null;
    }
    result.personnelView = {
      hideInternalPrep: String(programme.statut || '').toUpperCase() === 'VALIDE'
    };
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
      [`${programme.annee}-10-16`, 'VACANCES_SCOLAIRES', 'Vacances scolaires vaudoises - automne', 'SEED_CORE_1', true],
      [`${Number(programme.annee) + 1}-01-01`, 'FERIE', 'Nouvel An', 'SEED_CORE_1', true]
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
      `insert into scope_quo_vadis_obligations(programme_id, source_type, source_ref, cursus_step_id, cohorte_id, title, domain, cible_codes, statut, priority, imposed_start_at, imposed_end_at, statcom_policy, lieu_id, lieu_libre, numbering_pattern, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8::text[],'PROPOSE',$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
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
        payload.lieuId || null,
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
    const retained = await db.query(
      `select 1 from scope_quo_vadis_proposals where obligation_id = $1 and status = 'RETENU' limit 1`,
      [obligation.obligation_id]
    );
    if(retained.rowCount) return;
    await db.query(
      `insert into scope_quo_vadis_proposals(obligation_id, starts_at, ends_at, day_class, reasons, conflict_summary, lieu_id, lieu_libre)
       select $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8
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
        payload.lieuId || obligation.lieu_id || null,
        payload.lieuLibre || obligation.lieu_libre || null
      ]
    );
  }

  async function stampObligationModel(obligation, payload){
    if(!obligation) return;
    await db.query(
      `update scope_quo_vadis_obligations
          set activity_kind = coalesce($2, activity_kind),
              periodicity_years = coalesce($3, periodicity_years),
              include_in_programme = coalesce($4, include_in_programme),
              last_occurrence = coalesce($5::date, last_occurrence),
              classification = coalesce($6::jsonb, classification),
              statcom_code = coalesce($7, statcom_code),
              updated_at = now()
        where obligation_id = $1`,
      [
        obligation.obligation_id,
        payload.activityKind || null,
        payload.periodicityYears == null ? null : Number(payload.periodicityYears),
        payload.includeInProgramme == null ? null : payload.includeInProgramme,
        payload.lastOccurrence || null,
        payload.classification ? JSON.stringify(payload.classification) : null,
        payload.statcomCode || null
      ]
    );
  }

  async function loadRulesByDomain(){
    const result = await db.query(`select * from scope_quo_vadis_planning_rules where active is true`);
    const map = {};
    result.rows.forEach((row) => {
      if(!row.domain) return;
      map[String(row.domain).toUpperCase()] = {
        dayPolicy: row.day_policy || {},
        timePolicy: row.time_policy || {}
      };
    });
    return map;
  }

  async function loadYearEventRows(year){
    const result = await db.query(
      `select e.evenement_id, e.date, e.domaine_code, e.sous_domaine_code, e.libelle,
              e.code_cours, e.code_source, e.heure_debut, e.heure_fin,
              e.heure_debut_prevue, e.heure_fin_prevue, e.salle, e.session_index,
              e.session_label, e.exercice_id, e.statut, e.hidden_at, e.statcom_code,
              e.exercise_equivalence_key,
              x.code as exercice_code, x.libelle as exercice_libelle, x.mode_session,
              x.statcom_code as exercice_statcom
         from scope_evenements e
         left join scope_exercices x on x.exercice_id = e.exercice_id
        where extract(year from e.date) = $1
        order by e.date, e.libelle`,
      [Number(year)]
    );
    return result.rows;
  }

  async function existingActivityKeys(programmeId){
    const result = await db.query(
      `select domain, title, cible_codes from scope_quo_vadis_obligations where programme_id = $1`,
      [programmeId]
    );
    const keys = new Set();
    result.rows.forEach((row) => {
      const oi = (row.cible_codes || [])[0] || '';
      keys.add(activityMatchKey(row.domain, oi, row.title));
      keys.add(activityMatchKey(row.domain, '', row.title));
    });
    return keys;
  }

  async function insertRankedProposal(obligation, options){
    const slot = coverage.pickProposalSlot({
      year: options.year,
      month: options.month,
      domain: options.domain,
      activity: options.activity,
      calendarRows: options.calendarRows,
      rulesByDomain: options.rulesByDomain,
      preferredWeekday: options.preferredWeekday
    });
    if(!slot) return false;
    const time = coverage.usualTime(options.domain, options.activity);
    await insertProposal(obligation, {
      startsAt: `${isoLocalDateTime(slot.date, time.start)}+00:00`,
      endsAt: addMinutesIso(slot.date, time.start, time.minutes),
      dayClass: slot.dayClass,
      lieuId: options.lieuId,
      lieuLibre: options.lieuLibre,
      reasons: (options.reasons || []).concat(slot.reasons),
      conflictSummary: Object.assign({
        simultaneousEventsAllowed: true,
        requiresDerogation: slot.dayClass === 'DECONSEILLE',
        source: options.source || 'ranked-slot'
      }, options.conflictSummary || {})
    });
    return true;
  }

  async function generateHistoricalObligations(programme, calendarRows, rulesByDomain){
    const rows = await loadYearEventRows(Number(programme.annee) - 1).catch((error) => {
      console.error('QUO VADIS: historique 2026 indisponible', error);
      throw error;
    });
    const report = coverage.summarizeCoverage(rows, programme.annee);
    let touched = 0;
    for(const [index, item] of report.activities.entries()){
      const sourceType = item.kind === 'CYCLIQUE' ? 'CYCLIQUE' : (item.kind === 'OPTIONNELLE' ? 'OPTIONNELLE' : 'HISTORIQUE');
      const month = Number(String(item.date || '').slice(5, 7) || monthForDomain(item.domain, index));
      const obligation = await upsertObligation(programme, {
        sourceType,
        sourceRef: `H2026:${item.activityKey}`.slice(0, 120),
        title: item.title,
        domain: item.domain || null,
        cibleCodes: item.oi ? [item.oi] : [],
        priority: 40 + index,
        statcomPolicy: item.statcomCode ? 'OBLIGATOIRE' : 'A_CONFIRMER',
        lieuLibre: item.salle || null,
        metadata: {
          source: 'QUO-VADIS-COVERAGE-1',
          activityKind: item.kind,
          family: item.family,
          subcategory: item.subcategory,
          organisationalLevel: item.organisationalLevel,
          instructionKind: item.instructionKind,
          theme: item.theme,
          statcomCode: item.statcomCode,
          lastOccurrence: item.date,
          noOperationalEventCreated: true,
          historicalReferenceOnly: true
        }
      });
      if(!obligation) continue;
      await stampObligationModel(obligation, {
        activityKind: item.kind,
        periodicityYears: item.periodicityYears,
        includeInProgramme: true,
        lastOccurrence: item.date,
        classification: {
          family: item.family,
          subcategory: item.subcategory,
          organisationalLevel: item.organisationalLevel,
          instructionKind: item.instructionKind,
          theme: item.theme
        },
        statcomCode: item.statcomCode || null
      });
      touched += 1;
      await insertRankedProposal(obligation, {
        year: programme.annee,
        month: month || 2,
        domain: item.domain,
        activity: item,
        calendarRows,
        rulesByDomain,
        lieuLibre: item.salle || null,
        source: 'historique-2026',
        reasons: [
          `Référence historique ${item.date ? item.date.split('-').reverse().join('.') : '2026'} — date 2027 recherchée selon les règles, jamais recopiée.`,
          item.kind === 'OPTIONNELLE' ? 'Activité optionnelle: reconduction à confirmer par la MOA.' : 'Activité annuelle issue du programme 2026.'
        ]
      });
    }
    return { touched, report };
  }

  async function generateCatalogueObligations(programme, calendarRows, rulesByDomain, knownKeys){
    const catalogue = await loadCatalogue();
    let touched = 0;
    let index = 0;
    for(const item of catalogue.filter((row) => row.selected !== false)){
      index += 1;
      const key = activityMatchKey(item.domain, '', item.title);
      if(knownKeys && (knownKeys.has(key) || knownKeys.has(activityMatchKey(item.domain, '', coverage.normalizeInstructionTitle({ domaine_code: item.domain, libelle: item.title }).title)))) continue;
      const month = monthForDomain(item.domain, index);
      const time = coverage.usualTime(item.domain, { startsAt: '' });
      const obligation = await upsertObligation(programme, {
        sourceType: item.source === 'DEFINITION' ? 'DEFINITION' : 'RECURRENT',
        sourceRef: item.versionId || item.id,
        title: item.title,
        domain: item.domain || null,
        priority: 60 + index,
        statcomPolicy: item.statcomCode ? 'OBLIGATOIRE' : 'A_CONFIRMER',
        numberingPattern: item.sessionCount > 1 ? '1.1' : null,
        metadata: {
          source: 'QUO-VADIS-COVERAGE-1',
          catalogueSource: item.source,
          definitionVersionId: item.versionId,
          modeOrganisation: item.modeOrganisation,
          sessionCount: item.sessionCount,
          family: coverage.formationFamily(item.domain),
          subcategory: coverage.formationSubcategory(item.domain, '', item.title),
          statcomCode: item.statcomCode || '',
          codeEvenementPreview: compactEventCode(item.domain || item.title, index),
          noOperationalEventCreated: true
        }
      });
      if(!obligation) continue;
      await stampObligationModel(obligation, {
        activityKind: 'ANNUELLE',
        periodicityYears: 1,
        includeInProgramme: true,
        classification: {
          family: coverage.formationFamily(item.domain),
          subcategory: coverage.formationSubcategory(item.domain, '', item.title),
          organisationalLevel: coverage.organisationalLevel(item.domain, '')
        },
        statcomCode: item.statcomCode || null
      });
      touched += 1;
      await insertRankedProposal(obligation, {
        year: programme.annee,
        month,
        domain: item.domain,
        activity: { startsAt: time.start, endsAt: time.end },
        calendarRows,
        rulesByDomain,
        source: 'catalogue',
        reasons: [
          `Activité issue du catalogue SCOPE (${item.domainLabel}).`,
          `Horaire indicatif ${time.start}–${time.end}, modifiable.`
        ]
      });
    }
    return touched;
  }

  async function generateDpsInstructionObligations(programme, calendarRows, rulesByDomain, knownKeys){
    const dps = await db.query(`select * from scope_quo_vadis_dps_organisation_versions where valid_from <= $1 and (valid_to is null or valid_to >= $2) order by oi_code`, [`${programme.annee}-12-31`, `${programme.annee}-01-01`]);
    const lieuxRows = await db.query(`select * from scope_lieux where actif is not false`);
    const lieuxByOi = indexLieux(lieuxRows.rows.map(mapLieu)).byOi;
    const order = [
      { code: 'KICK-OFF', label: 'KICK-OFF', instructionKind: 'kick-off', sites: ['G1','C1','B1','B2'], month: 2 },
      { code: 'ABC', label: 'ABC', instructionKind: 'section', sites: ['G1'], month: 3 },
      { code: 'VARIA-BASE', label: 'VARIA', instructionKind: 'section', sites: ['C1','B1','B2'], month: 4 },
      { code: 'VARIA-G1', label: 'VARIA', instructionKind: 'section', sites: ['G1'], month: 5 },
      { code: 'FEU', label: 'FEU', instructionKind: 'section', sites: ['C1','B1','B2'], month: 6 },
      { code: 'PIONNIER', label: 'PIONNIER', instructionKind: 'section', sites: ['G1'], month: 9 }
    ];
    const knownSites = new Set(dps.rows.map((row) => row.oi_code));
    let touched = 0;
    for(const [idx, item] of order.entries()){
      for(const site of item.sites.filter((s) => knownSites.has(s))){
        const title = item.instructionKind === 'kick-off' ? 'KICK-OFF' : `Instr. section — ${item.label}`;
        const key = activityMatchKey('DPS', site, title);
        if(knownKeys && (knownKeys.has(key) || knownKeys.has(activityMatchKey('DPS', site, `${site} — ${item.label}`)))) continue;
        const isPionnier = item.code === 'PIONNIER';
        const siteLieu = lieuxByOi.get(String(site).toUpperCase()) || null;
        const lieuId = siteLieu && (siteLieu.lieuId || siteLieu.lieu_id) || null;
        const activity = { oi: site, instructionKind: item.instructionKind, theme: item.label, startsAt: '19:30', endsAt: '21:30' };
        const obligation = await upsertObligation(programme, {
          sourceType: 'DPS_RULE',
          sourceRef: `${site}:${item.code}:2027`,
          title,
          domain: 'DPS',
          cibleCodes: [site],
          priority: 30 + idx,
          statcomPolicy: 'A_CONFIRMER',
          lieuId,
          metadata: {
            source: 'QUO-VADIS-COVERAGE-1',
            ordreMetier: idx + 1,
            instructionKind: item.instructionKind,
            theme: item.label,
            family: 'FOCO',
            subcategory: 'DPS',
            prerequis: item.code === 'KICK-OFF' ? [] : ['Demi-sections concernées réalisées avant instruction de section'],
            pionnierAstreinte: isPionnier ? 'À vérifier semaine N et semaine N-1' : null,
            derogationPossible: true,
            noOperationalEventCreated: true
          }
        });
        if(!obligation) continue;
        if(lieuId && !obligation.lieu_id){
          await db.query('update scope_quo_vadis_obligations set lieu_id = $2, updated_at = now() where obligation_id = $1 and lieu_id is null', [obligation.obligation_id, lieuId]);
          obligation.lieu_id = lieuId;
        }
        await stampObligationModel(obligation, {
          activityKind: 'ANNUELLE',
          periodicityYears: 1,
          includeInProgramme: true,
          classification: { family: 'FOCO', subcategory: 'DPS', organisationalLevel: 'DPS', instructionKind: item.instructionKind, theme: item.label }
        });
        touched += 1;
        await insertRankedProposal(obligation, {
          year: programme.annee,
          month: item.month,
          domain: 'DPS',
          activity,
          calendarRows,
          rulesByDomain,
          lieuId,
          source: 'dps-rule',
          reasons: [
            `Ordre métier ${idx + 1}: ${title}.`,
            item.code === 'KICK-OFF' ? 'Démarrage commun tous sites.' : 'Prérequis demi-sections à contrôler avant validation.',
            isPionnier ? 'Contrainte PIONNIER: astreinte semaine N et N-1 à vérifier.' : 'Dérogation possible si arbitrée.',
            coverage.SECTION_SITES.has(site) && item.instructionKind === 'section' ? 'Règle métier: samedi préféré pour les instructions de section C1, B1 et B2.' : ''
          ].filter(Boolean),
          conflictSummary: {
            prerequisite: item.code === 'KICK-OFF' ? 'OK' : 'A_VERIFIER',
            astreinte: isPionnier ? 'A_VERIFIER' : null
          }
        });
      }
    }
    return touched;
  }

  async function generateCursusObligations(programme, calendarRows){
    const steps = await db.query(`
      select s.*, c.cohorte_id, c.code as cohorte_code, c.current_logical_year,
             coalesce(csp.retenu, true) as step_retenu
        from scope_quo_vadis_cursus_steps s
        join scope_quo_vadis_cursus_versions v on v.cursus_version_id = s.cursus_version_id
        join scope_quo_vadis_cursus_definitions d on d.cursus_id = v.cursus_id
        join scope_quo_vadis_cohortes c on c.cursus_version_id = v.cursus_version_id
        join scope_quo_vadis_cursus_programmes cp on cp.cursus_id = d.cursus_id and cp.programme_id = $1 and cp.retenu is true
        left join scope_quo_vadis_cursus_step_programmes csp on csp.programme_id = $1 and csp.step_id = s.step_id
       where d.code = 'CI-DPS'
         and coalesce(csp.retenu, true) is true
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
      const startYearLabel = Number(row.logical_year) === 2 ? 'Début du cursus 2026' : 'Début du cursus 2027';
      const obligation = await upsertObligation(programme, {
        sourceType: 'CURSUS',
        sourceRef: `${row.cohorte_code}:${row.step_code}`,
        cursusStepId: row.step_id,
        cohorteId: row.cohorte_id,
        title: row.libelle,
        domain: 'DPS',
        priority: 20 + index,
        statcomPolicy: row.step_code === 'M10' ? 'OBLIGATOIRE' : 'A_CONFIRMER',
        metadata: {
          source: 'QUO-VADIS-COVERAGE-1',
          displayLabel: `${row.libelle} · ${startYearLabel} · Année ${row.logical_year}`,
          logicalYear: row.logical_year,
          startYearLabel,
          activityKind: 'CURSUS',
          family: 'FOCO',
          subcategory: 'DPS',
          noOperationalEventCreated: true,
          crossesMidnight: row.crosses_midnight === true,
          selectedCursus: true
        }
      });
      if(!obligation) continue;
      await stampObligationModel(obligation, {
        activityKind: 'CURSUS',
        periodicityYears: 1,
        includeInProgramme: true,
        classification: { family: 'FOCO', subcategory: 'DPS', organisationalLevel: 'DPS' }
      });
      created += 1;
      await insertProposal(obligation, {
        startsAt: starts,
        endsAt: ends,
        dayClass: row.preferred_day === weekdayName(date) ? 'PREFERE' : classification.dayClass,
        reasons: [
          'Cursus CI DPS: modules générés uniquement si le cursus est activé pour 2027.',
          `${startYearLabel} · Année ${row.logical_year}.`,
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
    return created;
  }

  async function generateProgramme(annee = 2027){
    const programme = await ensureProgramme(annee);
    const before = await listProgramme(programme.annee);
    await seedCalendar(programme);
    await ensureDefaultCursusSelections(programme);
    await ensureDefaultCursusStepSelections(programme);
    const calendarRows = (await db.query(`select * from scope_quo_vadis_calendar_days where programme_id = $1`, [programme.programmeId])).rows;
    const rulesByDomain = await loadRulesByDomain();

    const historical = await generateHistoricalObligations(programme, calendarRows, rulesByDomain);
    const knownKeys = await existingActivityKeys(programme.programmeId);
    const catalogueTouched = await generateCatalogueObligations(programme, calendarRows, rulesByDomain, knownKeys);
    const dpsTouched = await generateDpsInstructionObligations(programme, calendarRows, rulesByDomain, knownKeys);
    const created = await generateCursusObligations(programme, calendarRows);

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
        cibleCodes: (row.metadata && row.metadata.cibleCode) ? [row.metadata.cibleCode] : [],
        priority: 10,
        imposedStartAt: row.heure_debut ? `${isoLocalDateTime(row.date_debut, row.heure_debut)}+00:00` : null,
        imposedEndAt: row.heure_fin ? `${isoLocalDateTime(row.date_fin || row.date_debut, row.heure_fin)}+00:00` : null,
        lieuId: row.lieu_id || null,
        lieuLibre: row.lieu_libre || null,
        metadata: { source: 'QUO-VADIS-COVERAGE-1', convertedFromFutureDate: row.future_date_id }
      });
      if(obligation){
        await db.query('update scope_quo_vadis_future_dates set converted_obligation_id = $1, updated_at = now() where future_date_id = $2', [obligation.obligation_id, row.future_date_id]);
        if(row.heure_debut){
          await insertProposal(obligation, {
            startsAt: `${isoLocalDateTime(row.date_debut, row.heure_debut)}+00:00`,
            endsAt: row.heure_fin ? `${isoLocalDateTime(row.date_fin || row.date_debut, row.heure_fin)}+00:00` : addMinutesIso(row.date_debut, row.heure_debut, 120),
            dayClass: 'PREFERE',
            reasons: ['Date annoncée reprise sans double saisie.', 'Décision finale conservée côté utilisateur.'],
            conflictSummary: { imposedDate: true, simultaneousEventsAllowed: true },
            lieuId: row.lieu_id || null,
            lieuLibre: row.lieu_libre || null
          });
        }
      }
    }

    const coveragePayload = {
      sourceLines: historical.report.sourceLines,
      recognized: historical.report.recognized,
      duplicated: historical.report.duplicated,
      sessions: historical.report.sessions,
      excluded: historical.report.excluded,
      ignored: historical.report.ignored,
      previouslyIgnored: historical.report.previouslyIgnored,
      cursusDeferred: historical.report.cursusDeferred,
      cyclicDeferred: historical.report.cyclicDeferred,
      generable: historical.report.generable,
      reasonCounts: historical.report.reasonCounts,
      traces: historical.report.traces
    };
    await db.query(
      `update scope_quo_vadis_programmes
          set metadata = coalesce(metadata, '{}'::jsonb) || $2::jsonb,
              updated_at = now()
        where programme_id = $1`,
      [programme.programmeId, JSON.stringify({ coverage: coveragePayload, source: 'QUO-VADIS-COVERAGE-1' })]
    );

    const after = await listProgramme(programme.annee);
    const beforeSummary = before.summary || {};
    const afterSummary = after.summary || {};
    const newProposals = Math.max(0, Number(afterSummary.datesProposees || 0) - Number(beforeSummary.datesProposees || 0));
    return Object.assign(after, {
      coverage: coveragePayload,
      generation: {
        ok: true,
        before: beforeSummary,
        after: afterSummary,
        newObligations: Math.max(0, Number(afterSummary.totalActivites || 0) - Number(beforeSummary.totalActivites || 0)),
        newProposals,
        unchangedProposals: Math.max(0, Number(afterSummary.datesProposees || 0) - newProposals),
        attentionPoints: Number(afterSummary.conflits || 0),
        obligationsTouched: historical.touched + created + catalogueTouched + dpsTouched + futureDates.rows.length,
        historicalTouched: historical.touched,
        catalogueTouched,
        dpsTouched,
        coverage: coveragePayload,
        operationalEventsCreated: 0,
        attendusCreated: 0,
        participationsCreated: 0
      }
    });
  }

  async function createFutureDate(body){
    const targetYear = Number(body && (body.targetYear || body.annee || body.year) || 2027);
    const autreLieu = String(body.lieuId || '') === 'autre' || body.autreLieu === true;
    const lieuId = autreLieu ? null : (body.lieuId || null);
    const lieuLibre = autreLieu ? (body.lieuLibre || body.lieuExceptionnel || null) : (body.lieuLibre || null);
    const metadata = {
      source: 'UI',
      cibleCode: body.cibleCode || body.cible || '',
      specialisation: body.specialisation || body.cursus || ''
    };
    const result = await db.query(
      `insert into scope_quo_vadis_future_dates(target_year, date_debut, heure_debut, date_fin, heure_fin, activite_label, domain, lieu_id, lieu_libre, remarque, metadata)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       returning *`,
      [
        targetYear,
        body.dateDebut || body.date || `${targetYear}-01-01`,
        body.heureDebut || null,
        body.dateFin || body.dateDebut || null,
        body.heureFin || null,
        body.activiteLabel || body.label || 'Date annoncée',
        body.domain || body.domaine || null,
        lieuId,
        lieuLibre,
        body.remarque || null,
        JSON.stringify(metadata)
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

  async function setCursusStepSelection(annee, body = {}){
    const programme = await ensureProgramme(annee);
    await ensureDefaultCursusStepSelections(programme);
    const stepId = String(body.stepId || body.step_id || '').trim();
    const retenu = body.retenu !== false;
    const result = await db.query(
      `insert into scope_quo_vadis_cursus_step_programmes(programme_id, step_id, retenu, metadata, updated_at)
       values ($1,$2,$3,'{"source":"QUO-VADIS-COVERAGE-1","userSelection":true}'::jsonb, now())
       on conflict (programme_id, step_id) do update
         set retenu = excluded.retenu, updated_at = now(), metadata = scope_quo_vadis_cursus_step_programmes.metadata || '{"userSelection":true}'::jsonb
       returning *`,
      [programme.programmeId, stepId, retenu]
    );
    if(!result.rows[0]) return { updated: false };
    return { updated: true, step: result.rows[0], quoVadis: await listProgramme(programme.annee) };
  }

  async function setProgrammeStatus(annee, body = {}){
    const programme = await ensureProgramme(annee);
    const statut = String(body.statut || body.status || '').toUpperCase();
    const allowed = ['PREPARATION', 'VALIDATION', 'VALIDE'];
    if(!allowed.includes(statut)) return { updated: false, error: 'Statut de programme invalide.' };
    await db.query(
      `update scope_quo_vadis_programmes
          set statut = $2,
              metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb,
              updated_at = now()
        where programme_id = $1`,
      [programme.programmeId, statut, JSON.stringify({ programmeStatus: { statut, updatedAt: new Date().toISOString() } })]
    );
    return { updated: true, statut, quoVadis: await listProgramme(programme.annee) };
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
    if(body.lieuId || body.lieuLibre){
      await db.query(
        `update scope_quo_vadis_proposals set lieu_id = $2, lieu_libre = $3, updated_at = now() where proposal_id = $1`,
        [proposalId, body.lieuId || null, body.lieuLibre || null]
      );
    }
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

  return { listProgramme, generateProgramme, createFutureDate, setCursusSelection, setCursusStepSelection, setProgrammeStatus, retainProposal, listActivityReferences };
}

module.exports = { createScopeQuoVadisService };
