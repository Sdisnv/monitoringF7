'use strict';

const seriesApi = require('../../assets/js/scope-event-series.js');

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

const DAY_RANK = {
  PREFERE: 0,
  AUTORISE: 1,
  DECONSEILLE: 8
};

const DEFAULT_DAY_POLICY = {
  MONDAY: 'AUTORISE',
  TUESDAY: 'AUTORISE',
  WEDNESDAY: 'AUTORISE',
  THURSDAY: 'PREFERE',
  FRIDAY: 'DECONSEILLE',
  SATURDAY: 'AUTORISE',
  SUNDAY: 'DECONSEILLE'
};

const DPS_THEMES = ['KICK-OFF', 'ABC', 'VARIA', 'FEU', 'PIONNIER'];
const SECTION_SITES = new Set(['C1', 'B1', 'B2']);
const RECIPE_NOISE = /\b(recette|sandbox|dummy|lorem|fixture|placeholder|donnee technique)\b/;
const TEST_PREFIX = /^(test|essai)\b/;

function dateOnly(value){
  if(!value) return '';
  if(value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function pad2(value){
  return String(value).padStart(2, '0');
}

function weekdayName(date){
  return ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'][new Date(`${dateOnly(date)}T12:00:00Z`).getUTCDay()];
}

function addDays(date, days){
  const d = new Date(`${dateOnly(date)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function calendarDate(row){
  return dateOnly(row && (row.jour || row.date));
}

function calendarType(row){
  return String(row && (row.type_jour || row.typeJour) || '').toUpperCase();
}

function calendarEndDate(row){
  const metadata = row && row.metadata || {};
  return dateOnly(metadata.dateFin || metadata.date_fin || metadata.endDate || metadata.fin || calendarDate(row));
}

function enrichCalendarRows(calendarRows){
  const rows = Array.isArray(calendarRows) ? calendarRows.slice() : [];
  const existing = new Set(rows.map((row) => `${calendarDate(row)}|${calendarType(row)}`));
  rows.filter((row) => calendarType(row) === 'FERIE').forEach((holiday) => {
    const eve = addDays(calendarDate(holiday), -1);
    if(existing.has(`${eve}|VEILLE_FERIE`)) return;
    existing.add(`${eve}|VEILLE_FERIE`);
    rows.push({ jour: eve, type_jour: 'VEILLE_FERIE', libelle: `Veille de ${holiday.libelle || 'jour férié'}`, neutralise: true });
  });
  return rows;
}

function normalizeTitle(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(g1|c1|b1|b2)\s*[—\-:.]+\s*/i, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function organisationalLevel(domain, oi){
  const d = String(domain || '').toUpperCase();
  if(['DPS', 'DAP', 'JSP'].includes(d)) return d;
  if(['FOBA', 'FOCA', 'FOSPEC', 'PR', 'AUTO'].includes(d)) return 'SDIS';
  return d || 'SDIS';
}

function formationFamily(domain){
  const d = String(domain || '').toUpperCase();
  if(['DPS', 'DAP', 'JSP'].includes(d)) return 'FOCO';
  if(d === 'FOBA') return 'FOBA';
  if(d === 'FOCA') return 'FOCA';
  if(d === 'FOCO') return 'FOCO';
  if(['FOSPEC', 'PR', 'AUTO', 'VPC', 'NAC', 'OFSI'].includes(d)) return 'FOSPEC';
  return '';
}

function formationSubcategory(domain, oi, title){
  const d = String(domain || '').toUpperCase();
  const cible = String(oi || '').toUpperCase();
  const text = String(title || '').toUpperCase();
  if(d === 'FOBA'){
    if(/FOBA\s*3/.test(cible + ' ' + text)) return 'FOBA 3';
    if(/FOBA\s*2/.test(cible + ' ' + text)) return 'FOBA 2';
    if(/FOBA\s*1/.test(cible + ' ' + text)) return 'FOBA 1';
    return 'FOBA';
  }
  if(d === 'DPS' || d === 'DAP' || d === 'JSP') return d;
  if(d === 'PR') return 'PR';
  if(d === 'AUTO') return 'AUTO';
  if(/VPC/.test(cible + text)) return 'VPC';
  if(/NAC/.test(cible + text)) return 'NAC';
  if(/OFSI/.test(cible + text)) return 'OFSI';
  return d || '';
}

function detectTheme(title){
  const upper = String(title || '').toUpperCase();
  return DPS_THEMES.find((theme) => upper.includes(theme)) || '';
}

function normalizeInstructionTitle(row){
  const domain = String(row.domaine_code || row.domain || '').toUpperCase();
  const raw = String(row.libelle || row.title || '').trim();
  const stripped = raw.replace(/^(G1|C1|B1|B2)\s*[—\-–:.]+\s*/i, '').trim() || raw;
  const theme = detectTheme(stripped);
  const demi = /demi[-\s]?section/i.test(stripped);
  const section = /instr/i.test(stripped) || (domain === 'DPS' && Boolean(theme) && theme !== 'KICK-OFF');
  if(domain === 'DPS' && demi){
    return {
      title: theme ? `Instr. demi-section — ${theme}` : 'Instr. demi-section',
      instructionKind: 'demi-section',
      theme
    };
  }
  if(domain === 'DPS' && (section || theme)){
    if(theme === 'KICK-OFF') return { title: 'KICK-OFF', instructionKind: 'kick-off', theme };
    return {
      title: theme ? `Instr. section — ${theme}` : stripped,
      instructionKind: 'section',
      theme
    };
  }
  return { title: stripped, instructionKind: '', theme };
}

function isRecipeOrTechnicalNoise(title){
  const hay = normalizeTitle(title);
  if(!hay) return false;
  if(RECIPE_NOISE.test(hay)) return true;
  if(TEST_PREFIX.test(hay) && !/\btest final\b/.test(hay)) return true;
  return false;
}

function isGenericNumberedExercise(title){
  return /^exercice\s+[a-z]+\s+\d+$/i.test(String(title || '').trim());
}

function activityKindFromRow(row, title){
  const hay = `${title || ''} ${row.libelle || ''} ${row.exercice_libelle || ''}`.toLowerCase();
  if(/\brevue\b/.test(hay) || /revue\s+des\s+effectifs/.test(hay)){
    return { kind: 'CYCLIQUE', periodicityYears: 5, optional: false };
  }
  if(/\bci\s*dps\b/.test(hay) || (/module\s+\d+/.test(hay) && /dps/.test(hay))){
    return { kind: 'CURSUS', periodicityYears: 1, optional: false };
  }
  if(/assembl[ée]e|c[ée]r[ée]monie|\boptionnel/.test(hay)){
    return { kind: 'OPTIONNELLE', periodicityYears: 1, optional: true };
  }
  return { kind: 'ANNUELLE', periodicityYears: 1, optional: false };
}

function nextDueYear(lastYear, periodicityYears){
  const period = Number(periodicityYears || 1);
  if(!lastYear || period <= 1) return Number(lastYear || 0) + 1;
  return Number(lastYear) + period;
}

function isNiveauToken(oi, number){
  const u = String(oi || '').toUpperCase();
  const n = String(number);
  return u === `FOBA ${n}` || u === `FOBA${n}` || u === `Y${n}` || u === n;
}

function describeSeries(row){
  return seriesApi.describeEventSeries({
    libelle: row.libelle || row.title || '',
    label: row.libelle || row.title || '',
    domaine_code: row.domaine_code || row.domain || '',
    domain: row.domaine_code || row.domain || '',
    pr_exercise_group_key: row.pr_exercise_group_key,
    prExerciseGroupKey: row.pr_exercise_group_key,
    pr_session_key: row.pr_session_key,
    prSessionKey: row.pr_session_key,
    exercice_id: row.exercice_id,
    session_index: row.session_index,
    session_label: row.session_label,
    mode_session: row.mode_session,
    nombre_sessions_attendu: row.nombre_sessions_attendu,
    cycle_id: row.cycle_id,
    exercice: {
      mode_session: row.mode_session,
      nombre_sessions_attendu: row.nombre_sessions_attendu
    }
  });
}

function recurringBaseTitle(title, domain, oi){
  const raw = String(title || '').trim();
  if(/\d+\.\d+/.test(raw)) return null;
  const match = raw.match(/^(exercice)\s+([a-z0-9]+)\s+(\d+)$/i);
  if(!match) return null;
  if(isNiveauToken(oi, match[3])) return null;
  const token = String(match[2] || '').toUpperCase();
  const dom = String(domain || '').toUpperCase();
  if(['FOBA', 'FOCA', 'PR', 'AUTO'].includes(token) || ['FOBA', 'FOCA'].includes(dom)) return null;
  if(token !== dom && !raw.toUpperCase().includes(dom)) return null;
  return `Exercice ${token}`;
}

function multiSessionTitle(series, domain, normalizedTitle){
  const family = String((series && series.family) || '').toUpperCase();
  const exercise = series && series.exerciseNumber;
  const dom = String(domain || '').toUpperCase();
  if(exercise && family && family !== dom){
    return `${dom} ${family} ${exercise}`.replace(/\s+/g, ' ').trim();
  }
  if(exercise){
    return `${dom} ${exercise}`.replace(/\s+/g, ' ').trim();
  }
  return String(normalizedTitle || '').replace(/\s+\d+\.\d+\s*$/, '').trim() || normalizedTitle;
}

function sessionIdentity(row, normalizedTitle){
  const series = describeSeries(row);
  const domain = String(row.domaine_code || row.domain || '').toUpperCase();
  const oi = String(row.sous_domaine_code || row.sousDomaine || '').toUpperCase();
  const mode = String(row.mode_session || '').toUpperCase();
  const expected = Number(row.nombre_sessions_attendu || 0);
  if(series && series.seriesType === 'MULTI_SESSION' && series.seriesKey){
    return {
      multi: true,
      activityKey: `${domain}|${oi}|${series.seriesKey}`,
      title: multiSessionTitle(series, domain, normalizedTitle),
      sessionNumber: Number(series.sessionNumber || row.session_index || 1),
      sessionLabel: series.sessionLabel || `${series.exerciseNumber || 1}.${series.sessionNumber || 1}`,
      sessionCount: expected > 1 ? expected : null,
      seriesKey: series.seriesKey
    };
  }
  if(mode === 'MULTI' && (row.exercice_id || row.exercise_equivalence_key)){
    const key = String(row.exercice_id || row.exercise_equivalence_key);
    return {
      multi: true,
      activityKey: `${domain}|${oi}|EXERCICE:${key}`,
      title: String(row.exercice_libelle || normalizedTitle).replace(/\s+\d+\.\d+\s*$/, '').trim() || normalizedTitle,
      sessionNumber: Number(row.session_index || 1),
      sessionLabel: row.session_label || String(row.session_index || 1),
      sessionCount: expected > 1 ? expected : null,
      seriesKey: key
    };
  }
  const recurring = recurringBaseTitle(normalizedTitle, domain, oi);
  if(recurring){
    const occurrence = Number(String(normalizedTitle).match(/(\d+)\s*$/)[1]);
    return {
      multi: true,
      activityKey: `${domain}|${oi}|RECUR:${normalizeTitle(recurring)}`,
      title: recurring,
      sessionNumber: occurrence,
      sessionLabel: String(occurrence),
      sessionCount: null,
      seriesKey: `RECUR:${domain}:${oi}:${normalizeTitle(recurring)}`
    };
  }
  return {
    multi: false,
    activityKey: `${domain}|${oi}|${normalizeTitle(normalizedTitle)}`,
    title: normalizedTitle,
    sessionNumber: Number(row.session_index || 1),
    sessionLabel: row.session_label || '',
    sessionCount: 1,
    seriesKey: ''
  };
}

function classifyLine(row){
  const date = dateOnly(row.date);
  const domain = String(row.domaine_code || row.domain || '').toUpperCase();
  const oi = String(row.sous_domaine_code || row.sousDomaine || '').toUpperCase();
  const normalized = normalizeInstructionTitle(row);
  const title = normalized.title;
  const kindInfo = activityKindFromRow(row, title);
  const identity = sessionIdentity(row, title);
  const base = {
    date,
    domain,
    oi,
    title: identity.title,
    rawTitle: row.libelle || '',
    kind: kindInfo.kind,
    periodicityYears: kindInfo.periodicityYears,
    optional: kindInfo.optional,
    instructionKind: normalized.instructionKind,
    theme: normalized.theme,
    organisationalLevel: organisationalLevel(domain, oi),
    family: formationFamily(domain),
    subcategory: formationSubcategory(domain, oi, identity.title),
    specialisation: ['PR', 'AUTO'].includes(domain) ? (oi || domain) : '',
    statcomCode: row.statcom_code || row.exercice_statcom || '',
    salle: String(row.salle || '').trim(),
    startsAt: row.heure_debut_prevue || row.heure_debut || '',
    endsAt: row.heure_fin_prevue || row.heure_fin || '',
    preferredWeekday: date ? weekdayName(date) : '',
    activityKey: `${identity.activityKey}|${kindInfo.kind}`,
    evenementId: String(row.evenement_id || ''),
    sessionNumber: identity.sessionNumber,
    sessionLabel: identity.sessionLabel,
    sessionCount: identity.sessionCount,
    multiSession: identity.multi,
    seriesKey: identity.seriesKey,
    keep: false,
    category: '',
    reason: ''
  };

  if(row.hidden_at){
    return Object.assign(base, { category: 'exclu', reason: 'Événement masqué' });
  }
  if(String(row.statut || '').toUpperCase() === 'ANNULE'){
    return Object.assign(base, { category: 'exclu', reason: 'Annulé volontairement' });
  }
  if(isRecipeOrTechnicalNoise(row.libelle || title)){
    return Object.assign(base, { category: 'exclu', reason: 'Donnée de recette ou technique' });
  }
  if(!domain){
    return Object.assign(base, { category: 'ignore', reason: 'Domaine non reconnu' });
  }
  if(!title){
    return Object.assign(base, { category: 'ignore', reason: 'Libellé non reconnu' });
  }
  return Object.assign(base, {
    keep: kindInfo.kind !== 'CURSUS',
    category: 'retenu',
    reason: kindInfo.kind === 'CURSUS'
      ? 'Cursus: reconduite seulement si le cursus est activé pour 2027'
      : (identity.multi ? 'Session consolidée dans une activité métier' : 'Activité métier reconnue')
  });
}

function classifyHistoricalRow(row, seenKeys, sessionGroups){
  const item = classifyLine(row);
  if(item.category !== 'retenu') return item;
  const sessionStamp = `${item.activityKey}|${item.sessionNumber || 1}`;
  if(item.multiSession && sessionGroups && sessionGroups.has(sessionStamp)){
    return Object.assign({}, item, { category: 'duplicate', keep: false, reason: 'Doublon de la même séance' });
  }
  if(item.multiSession && sessionGroups && sessionGroups.has(item.activityKey)){
    if(sessionGroups) sessionGroups.add(sessionStamp);
    return Object.assign({}, item, { category: 'session', keep: false, reason: 'Session d’une même activité métier' });
  }
  if(!item.multiSession && seenKeys && seenKeys.has(item.activityKey)){
    return Object.assign({}, item, { category: 'duplicate', keep: false, reason: 'Doublon de la même activité annuelle' });
  }
  if(sessionGroups){
    sessionGroups.add(item.activityKey);
    sessionGroups.add(sessionStamp);
  }
  if(seenKeys) seenKeys.add(item.activityKey);
  return item;
}

function needsHumanArbitration(activity, extras){
  const extra = extras || {};
  if(activity.kind === 'OPTIONNELLE'){
    return { needed: true, reason: 'Activité optionnelle: reconduction à confirmer' };
  }
  if(activity.ambiguous || extra.ambiguous){
    return { needed: true, reason: 'Activité historique ambiguë' };
  }
  if(!activity.statcomCode && ['PR', 'AUTO', 'FOBA', 'FOCA'].includes(String(activity.domain || '').toUpperCase())){
    return { needed: true, reason: 'STAT.COM manquant ou ambigu' };
  }
  const oi = String(activity.oi || extra.oi || '').toUpperCase();
  const hasLieu = extra.lieuId || extra.lieuLibre || extra.lieuResolved || activity.salle
    || ['G1', 'C1', 'B1', 'B2'].includes(oi);
  if(!hasLieu){
    return { needed: true, reason: 'Lieu réellement indéterminé' };
  }
  if(extra.announcedClash || extra.conflict){
    return { needed: true, reason: extra.conflictReason || 'Conflit avec une date annoncée' };
  }
  return { needed: false, reason: '' };
}

function interpretHistoricalProgramme(rows, targetYear){
  const seenKeys = new Set();
  const sessionGroups = new Set();
  const traces = [];
  const reasonCounts = {};
  const grouped = new Map();
  let recognized = 0;
  let duplicated = 0;
  let sessions = 0;
  let excluded = 0;
  let ignored = 0;
  let recipeExcluded = 0;
  let cursusDeferred = 0;
  let cyclicDeferred = 0;
  let cyclicDue = 0;
  let optionalCount = 0;

  (rows || []).forEach((row) => {
    const item = classifyHistoricalRow(row, seenKeys, sessionGroups);
    const lastYear = Number(String(item.date || '').slice(0, 4) || 0);
    const dueYear = nextDueYear(lastYear, item.periodicityYears);
    let conserved = 'NON';
    let conservedReason = item.reason;
    if(item.category === 'exclu'){
      excluded += 1;
      if(item.reason.indexOf('recette') !== -1) recipeExcluded += 1;
    } else if(item.category === 'session'){
      sessions += 1;
      const bucket = grouped.get(item.activityKey);
      if(bucket){
        bucket.sessions.push({
          date: item.date,
          sessionNumber: item.sessionNumber,
          sessionLabel: item.sessionLabel,
          salle: item.salle,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          evenementId: item.evenementId,
          preferredWeekday: item.preferredWeekday,
          statcomCode: item.statcomCode
        });
        if(item.statcomCode && !bucket.statcomCode) bucket.statcomCode = item.statcomCode;
        if(item.salle && !bucket.salle) bucket.salle = item.salle;
        if(item.oi && bucket.cibleCodes && !bucket.cibleCodes.includes(item.oi)) bucket.cibleCodes.push(item.oi);
      }
    } else if(item.category === 'duplicate') duplicated += 1;
    else if(item.category === 'ignore') ignored += 1;
    else {
      recognized += 1;
      if(item.kind === 'CURSUS'){
        cursusDeferred += 1;
        conservedReason = 'Cursus: reconduite seulement si le cursus est activé pour 2027';
      } else if(item.kind === 'CYCLIQUE' && dueYear !== Number(targetYear)){
        cyclicDeferred += 1;
        conservedReason = `Activité cyclique ${item.periodicityYears} ans: prochaine échéance ${dueYear}`;
      } else {
        conserved = item.kind === 'OPTIONNELLE' ? 'CONFIRMER' : 'OUI';
        if(item.kind === 'CYCLIQUE') cyclicDue += 1;
        if(item.kind === 'OPTIONNELLE') optionalCount += 1;
        grouped.set(item.activityKey, Object.assign({}, item, {
          lastYear,
          dueYear,
          cibleCodes: item.oi ? [item.oi] : [],
          sessions: [{
            date: item.date,
            sessionNumber: item.sessionNumber,
            sessionLabel: item.sessionLabel,
            salle: item.salle,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            evenementId: item.evenementId,
            preferredWeekday: item.preferredWeekday,
            statcomCode: item.statcomCode
          }]
        }));
      }
    }
    reasonCounts[conservedReason] = (reasonCounts[conservedReason] || 0) + 1;
    traces.push({
      sourceDate: item.date,
      title: item.rawTitle || item.title,
      domain: item.domain,
      oi: item.oi,
      type: item.kind,
      family: item.family,
      subcategory: item.subcategory,
      classification: item.category,
      conserved,
      reason: conservedReason,
      activityKey: item.activityKey
    });
  });

  const activities = Array.from(grouped.values()).map((item) => {
    const sessionCount = Math.max(item.sessions.length, Number(item.sessionCount || 1));
    const arbitration = needsHumanArbitration(item);
    return Object.assign({}, item, {
      sessionCount,
      multiSession: sessionCount > 1 || item.multiSession === true,
      numberingPattern: sessionCount > 1 ? '1.1' : null,
      propose2027: true,
      needsArbitration: arbitration.needed,
      arbitrationReason: arbitration.reason,
      preferredWeekday: (item.sessions[0] && item.sessions[0].preferredWeekday) || item.preferredWeekday
    });
  });

  return {
    sourceLines: (rows || []).length,
    recognized,
    recognizedActivities: activities.length,
    duplicated,
    sessions,
    excluded,
    recipeExcluded,
    ignored,
    cursusDeferred,
    cyclicDeferred,
    cyclicDue,
    optionalCount,
    generable: activities.length,
    proposed: activities.length,
    previouslyIgnored: ignored,
    reasonCounts,
    activities,
    traces
  };
}

function summarizeCoverage(rows, targetYear){
  return interpretHistoricalProgramme(rows, targetYear);
}

function dayPolicyForActivity(domain, activity, rulesByDomain){
  const base = Object.assign({}, DEFAULT_DAY_POLICY);
  const d = String(domain || '').toUpperCase();
  if(d === 'DAP') base.FRIDAY = 'AUTORISE';
  if(d === 'FOBA' || d === 'FOCA') base.FRIDAY = 'INTERDIT';
  const rule = rulesByDomain && (rulesByDomain[d] || rulesByDomain['*']);
  const fromRule = rule && (rule.dayPolicy || rule.day_policy);
  const policy = fromRule ? Object.assign({}, DEFAULT_DAY_POLICY, fromRule) : base;
  if(activity && activity.instructionKind === 'section' && SECTION_SITES.has(String(activity.oi || '').toUpperCase())){
    policy.SATURDAY = 'PREFERE';
    policy.THURSDAY = 'AUTORISE';
    policy.SUNDAY = 'DECONSEILLE';
  }
  return policy;
}

function classifyCandidateDate(date, policy, calendarRows){
  const day = weekdayName(date);
  let dayClass = (policy && policy[day]) || 'AUTORISE';
  const reasons = [`${WEEKDAY_LABELS[day] || day}: ${DAY_CLASS_LABELS[dayClass] || dayClass}.`];
  const target = dateOnly(date);
  const special = enrichCalendarRows(calendarRows).filter((row) => {
    const start = calendarDate(row);
    const inVacation = calendarType(row) === 'VACANCES_SCOLAIRES' && start <= target && target <= calendarEndDate(row);
    return (start === target || inVacation) && row.neutralise !== false;
  });
  const hasFerie = special.some((row) => ['FERIE', 'VEILLE_FERIE', 'WEEKEND_FERIE'].includes(calendarType(row)));
  const hasVacances = special.some((row) => calendarType(row) === 'VACANCES_SCOLAIRES');
  const hasConstraint = special.some((row) => calendarType(row) === 'NEUTRALISATION_INTERNE');
  if(hasFerie){
    dayClass = 'INTERDIT';
    reasons.push('Jour férié: proposition interdite.');
  } else if(hasVacances){
    dayClass = 'INTERDIT';
    reasons.push('Vacances scolaires: proposition interdite.');
  } else if(hasConstraint){
    dayClass = 'INTERDIT';
    reasons.push('Contrainte de planification: proposition interdite.');
  }
  return { date: dateOnly(date), weekday: day, dayClass, reasons, rank: DAY_RANK[dayClass] == null ? 9 : DAY_RANK[dayClass] };
}

function pickProposalSlot({ year, month, domain, activity, calendarRows, rulesByDomain, preferredWeekday, blockedDates }){
  const policy = dayPolicyForActivity(domain, activity, rulesByDomain);
  const wantedMonth = Math.min(12, Math.max(1, Number(month || 2)));
  const blocked = blockedDates instanceof Set ? blockedDates : new Set(blockedDates || []);
  const candidates = [];
  const last = new Date(Date.UTC(year, wantedMonth, 0)).getUTCDate();
  for(let day = 1; day <= last; day += 1){
    const date = `${year}-${pad2(wantedMonth)}-${pad2(day)}`;
    if(blocked.has(date)) continue;
    const classified = classifyCandidateDate(date, policy, calendarRows);
    if(classified.dayClass === 'INTERDIT') continue;
    let rank = classified.rank;
    if(preferredWeekday && classified.weekday === preferredWeekday && rank <= 1) rank -= 0.2;
    candidates.push(Object.assign({}, classified, { rank }));
  }
  candidates.sort((a, b) => a.rank - b.rank || a.date.localeCompare(b.date));
  return candidates[0] || null;
}

function usualTime(domain, activity){
  const d = String(domain || '').toUpperCase();
  if(activity && activity.startsAt && /^\d{2}:\d{2}/.test(activity.startsAt)){
    return { start: String(activity.startsAt).slice(0, 5), end: String(activity.endsAt || '').slice(0, 5) || '21:30', minutes: 120 };
  }
  if(d === 'JSP') return { start: '18:30', end: '20:30', minutes: 120 };
  if(d === 'FOBA' || d === 'FOCA') return { start: '19:00', end: '21:30', minutes: 150 };
  return { start: '19:30', end: '21:30', minutes: 120 };
}

function resolveUsualLieu(activity, lieux){
  const index = { byId: new Map(), byOi: new Map(), byName: new Map() };
  (lieux || []).forEach((row) => {
    const id = row.lieuId || row.lieu_id;
    if(id) index.byId.set(String(id), row);
    const oi = String(row.oiCode || row.oi_code || '').toUpperCase();
    if(oi && !index.byOi.has(oi)) index.byOi.set(oi, row);
    const name = normalizeTitle(row.nomCourt || row.nom_court || row.nomComplet || row.nom_complet || '');
    if(name) index.byName.set(name, row);
  });
  const salle = normalizeTitle(activity && activity.salle);
  if(salle && index.byName.get(salle)) return { lieu: index.byName.get(salle), source: 'historique' };
  const oi = String((activity && (activity.oi || (activity.cibleCodes || [])[0])) || '').toUpperCase();
  if(oi && index.byOi.get(oi)) return { lieu: index.byOi.get(oi), source: 'caserne-oi' };
  if(activity && activity.salle) return { lieu: null, lieuLibre: activity.salle, source: 'salle-historique' };
  return { lieu: null, lieuLibre: null, source: '' };
}

module.exports = {
  WEEKDAY_LABELS,
  DAY_CLASS_LABELS,
  DEFAULT_DAY_POLICY,
  SECTION_SITES,
  dateOnly,
  weekdayName,
  normalizeTitle,
  normalizeInstructionTitle,
  activityKindFromRow,
  classifyHistoricalRow,
  interpretHistoricalProgramme,
  summarizeCoverage,
  dayPolicyForActivity,
  pickProposalSlot,
  usualTime,
  organisationalLevel,
  formationFamily,
  formationSubcategory,
  nextDueYear,
  isRecipeOrTechnicalNoise,
  isGenericNumberedExercise,
  needsHumanArbitration,
  resolveUsualLieu
};
