'use strict';

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

function activityKindFromRow(row, title){
  const hay = `${title || ''} ${row.libelle || ''} ${row.exercice_libelle || ''}`.toLowerCase();
  if(/\brevue\b/.test(hay) || /revue\s+des\s+effectifs/.test(hay)){
    return { kind: 'CYCLIQUE', periodicityYears: 5, optional: false };
  }
  if(/\bci\s*dps\b/.test(hay) || /module\s+\d+/.test(hay) && /dps/.test(hay)){
    return { kind: 'CURSUS', periodicityYears: 1, optional: false };
  }
  if(/assembl[ée]e|c[ée]r[ée]monie|optionnel/.test(hay)){
    return { kind: 'OPTIONNELLE', periodicityYears: 1, optional: true };
  }
  return { kind: 'ANNUELLE', periodicityYears: 1, optional: false };
}

function nextDueYear(lastYear, periodicityYears){
  const period = Number(periodicityYears || 1);
  if(!lastYear || period <= 1) return Number(lastYear || 0) + 1;
  return Number(lastYear) + period;
}

function classifyHistoricalRow(row, seenKeys, sessionGroups){
  const date = dateOnly(row.date);
  const domain = String(row.domaine_code || row.domain || '').toUpperCase();
  const oi = String(row.sous_domaine_code || row.sousDomaine || '').toUpperCase();
  const normalized = normalizeInstructionTitle(row);
  const title = normalized.title;
  const kindInfo = activityKindFromRow(row, title);
  const eventId = String(row.evenement_id || '');
  const sessionIndex = Number(row.session_index || 1);
  const equivalence = String(row.exercise_equivalence_key || row.exercice_id || normalizeTitle(title));
  const sessionKey = eventId || `${date}|${domain}|${oi}|${equivalence}`;
  const activityKey = `${domain}|${oi}|${equivalence}|${kindInfo.kind}`;
  const base = {
    date,
    domain,
    oi,
    title,
    rawTitle: row.libelle || '',
    kind: kindInfo.kind,
    periodicityYears: kindInfo.periodicityYears,
    optional: kindInfo.optional,
    instructionKind: normalized.instructionKind,
    theme: normalized.theme,
    organisationalLevel: organisationalLevel(domain, oi),
    family: formationFamily(domain),
    subcategory: formationSubcategory(domain, oi, title),
    statcomCode: row.statcom_code || row.exercice_statcom || '',
    salle: String(row.salle || '').trim(),
    startsAt: row.heure_debut_prevue || row.heure_debut || '',
    endsAt: row.heure_fin_prevue || row.heure_fin || '',
    activityKey,
    evenementId: eventId,
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
  if(!domain){
    return Object.assign(base, { category: 'ignore', reason: 'Domaine non reconnu' });
  }
  if(!title){
    return Object.assign(base, { category: 'ignore', reason: 'Libellé non reconnu' });
  }
  if(sessionIndex > 1 || (sessionGroups && sessionGroups.has(sessionKey))){
    if(sessionGroups) sessionGroups.add(sessionKey);
    return Object.assign(base, { category: 'session', reason: 'Session d’un même événement' });
  }
  if(sessionGroups) sessionGroups.add(sessionKey);
  if(seenKeys && seenKeys.has(activityKey)){
    return Object.assign(base, { category: 'duplicate', reason: 'Doublon de la même activité annuelle' });
  }
  if(seenKeys) seenKeys.add(activityKey);
  return Object.assign(base, {
    keep: kindInfo.kind !== 'CURSUS',
    category: 'retenu',
    reason: kindInfo.kind === 'CURSUS' ? 'Traitée par le cursus lorsqu’il est activé' : 'Activité opérationnelle pertinente'
  });
}

function summarizeCoverage(rows, targetYear){
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
  let cursusDeferred = 0;
  let cyclicDeferred = 0;

  (rows || []).forEach((row) => {
    const item = classifyHistoricalRow(row, seenKeys, sessionGroups);
    const lastYear = Number(String(item.date || '').slice(0, 4) || 0);
    const dueYear = nextDueYear(lastYear, item.periodicityYears);
    let conserved = 'NON';
    let conservedReason = item.reason;
    if(item.category === 'exclu') excluded += 1;
    else if(item.category === 'session') sessions += 1;
    else if(item.category === 'duplicate') duplicated += 1;
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
        conserved = 'OUI';
        grouped.set(item.activityKey, Object.assign({}, item, { lastYear, dueYear }));
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
      reason: conservedReason
    });
  });

  return {
    sourceLines: (rows || []).length,
    recognized,
    duplicated,
    sessions,
    excluded,
    ignored,
    cursusDeferred,
    cyclicDeferred,
    generable: grouped.size,
    previouslyIgnored: Math.max(0, (rows || []).length - recognized - duplicated - sessions - excluded),
    reasonCounts,
    activities: Array.from(grouped.values()),
    traces
  };
}

function dayPolicyForActivity(domain, activity, rulesByDomain){
  const base = Object.assign({}, DEFAULT_DAY_POLICY);
  if(String(domain || '').toUpperCase() === 'DAP') base.FRIDAY = 'AUTORISE';
  if(String(domain || '').toUpperCase() === 'FOBA' || String(domain || '').toUpperCase() === 'FOCA') base.FRIDAY = 'INTERDIT';
  const rule = rulesByDomain && (rulesByDomain[String(domain || '').toUpperCase()] || rulesByDomain['*']);
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
  const special = (calendarRows || []).filter((row) => dateOnly(row.jour || row.date) === dateOnly(date) && row.neutralise !== true);
  const hasFerie = special.some((row) => String(row.type_jour || row.typeJour || '').toUpperCase().includes('FERIE'));
  const hasVacances = special.some((row) => String(row.type_jour || row.typeJour || '').toUpperCase() === 'VACANCES_SCOLAIRES');
  if(hasFerie){
    dayClass = 'INTERDIT';
    reasons.push('Jour férié: proposition interdite.');
  } else if(hasVacances && dayClass !== 'INTERDIT'){
    dayClass = 'DECONSEILLE';
    reasons.push('Vacances scolaires: date déconseillée.');
  }
  return { date: dateOnly(date), weekday: day, dayClass, reasons, rank: DAY_RANK[dayClass] == null ? 9 : DAY_RANK[dayClass] };
}

function pickProposalSlot({ year, month, domain, activity, calendarRows, rulesByDomain, preferredWeekday }){
  const policy = dayPolicyForActivity(domain, activity, rulesByDomain);
  const wantedMonth = Math.min(12, Math.max(1, Number(month || 2)));
  const candidates = [];
  const last = new Date(Date.UTC(year, wantedMonth, 0)).getUTCDate();
  for(let day = 1; day <= last; day += 1){
    const date = `${year}-${pad2(wantedMonth)}-${pad2(day)}`;
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
  summarizeCoverage,
  dayPolicyForActivity,
  pickProposalSlot,
  usualTime,
  organisationalLevel,
  formationFamily,
  formationSubcategory,
  nextDueYear
};
