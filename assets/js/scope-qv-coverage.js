(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory(require('./scope-event-series.js'));
  else root.ScopeQvCoverage=factory(root.ScopeEventSeries);
})(typeof window!=='undefined'?window:globalThis,function(seriesApi){
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
  rows.filter((row) => {
    const label = String(row && row.libelle || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return calendarType(row) === 'FERIE' && label.includes('ASCENSION') && weekdayName(calendarDate(row)) === 'THURSDAY';
  }).forEach((holiday) => {
    const bridge = addDays(calendarDate(holiday), 1);
    if(existing.has(`${bridge}|NEUTRALISATION_INTERNE`)) return;
    existing.add(`${bridge}|NEUTRALISATION_INTERNE`);
    rows.push({
      jour: bridge,
      type_jour: 'NEUTRALISATION_INTERNE',
      libelle: 'Pont de l’Ascension',
      neutralise: true,
      metadata: { constraintKind: 'PONT_ASCENSION', derivedFromHoliday: calendarDate(holiday) }
    });
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
    codeCours: String(row.code_cours || row.codeCours || '').trim(),
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
        if(item.codeCours && !bucket.codeCours) bucket.codeCours = item.codeCours;
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

function applicablePlanningRule(domain, activity, rulesByDomain, date){
  const d = String(domain || '').toUpperCase();
  const cible = String(activity && ((activity.cibleCodes || [])[0] || activity.cibleCode || activity.oi || activity.publicCible) || '').toUpperCase();
  for(const key of [cible && `${d}:${cible}`,d,'*'].filter(Boolean)){
    const candidates = rulesByDomain && rulesByDomain[key];
    const versions = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
    const applicable = versions.filter(rule => !date || (!rule.validFrom || rule.validFrom <= date) && (!rule.validTo || rule.validTo >= date));
    if(applicable.length) return applicable.sort((a,b) => Number(b.priority || 0) - Number(a.priority || 0)
      || String(b.validFrom || '').localeCompare(String(a.validFrom || ''))
      || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
  }
  return null;
}

function dayPolicyForActivity(domain, activity, rulesByDomain, date){
  const base = Object.assign({}, DEFAULT_DAY_POLICY);
  const d = String(domain || '').toUpperCase();
  if(d === 'DAP') base.FRIDAY = 'AUTORISE';
  if(d === 'FOBA' || d === 'FOCA') base.FRIDAY = 'INTERDIT';
  const rule = applicablePlanningRule(domain, activity, rulesByDomain, date);
  const fromRule = rule && (rule.dayPolicy || rule.day_policy);
  const policy = fromRule ? Object.assign({}, DEFAULT_DAY_POLICY, fromRule) : base;
  if(activity && activity.instructionKind === 'section' && SECTION_SITES.has(String(activity.oi || '').toUpperCase())){
    policy.SATURDAY = 'PREFERE';
    policy.THURSDAY = 'AUTORISE';
    policy.SUNDAY = 'DECONSEILLE';
  }
  if(activity && ['section','kick-off'].includes(activity.instructionKind) && String(activity.oi || '').toUpperCase() === 'G1') policy.MONDAY = 'PREFERE';
  if(isOsrTraining(activity)) policy.FRIDAY = 'AUTORISE';
  return policy;
}

function isOsrTraining(activity){
  if(!activity) return false;
  const definition=activity.definitionId || activity.sessionStructure?.definitionId;
  const publics=activity.publics || activity.publicCodes || [];
  return definition==='QV26-MISE-A-NIVEAU-ANNUELLE-OSR-9977BB10'
    && (activity.statCom || activity.statcom_code)==='0171F7' && publics.includes('ENC:OSR')
    && publics.every(code=>['ENC:OSR','ENC:CI-DPS'].includes(code)) && !(activity.publicFreeLabels || []).length;
}

function programmeDayControl(row,qv){
  if(row.externalActivity || row.businessValidation || row.definitionId==='CTA-PERMANENCE' || !row.startsAt) return null;
  const date=dateOnly(row.startsAt),rules={};
  for(const rule of qv.rules || []) {
    if(rule.active===false || rule.definitionVersionId && rule.definitionVersionId!==row.definitionVersionId) continue;
    const key=rule.cibleCode?`${rule.domain}:${rule.cibleCode}`:rule.domain;
    (rules[key] ||= []).push(rule);
  }
  const domain=isOsrTraining(row)?'DPS':row.planningDomain || row.domain;
  const rule=applicablePlanningRule(domain,row,rules,date);
  const policy=dayPolicyForActivity(domain,row,rules,date);
  const label=String(row.activityLabel || row.label || '');
  const kind=/instr(?:uction)?\s+demi[-\s]*(?:sct|section)/i.test(label)?'demi-section'
    :/instr(?:uction)?\s+(?:sct|section)/i.test(label)?'section':'';
  const sites=[...new Set((row.oiSelections || row.ois || []).map(code=>String(code).replace(/^DPS:/,'')))];
  const target=new Date(`${date}T00:00:00Z`),offset=(target.getUTCDay()+2)%7;
  target.setUTCDate(target.getUTCDate()-offset);
  if(kind==='section' && sites[0]==='G1' && /PIONNIER.*CSU|CSU.*PIONNIER/i.test(label)) target.setUTCDate(target.getUTCDate()-7);
  const reference=qv.ctaParameters?.instructionWeeks?.find(item=>item.friday===target.toISOString().slice(0,10));
  const assignment=reference?.assignments.find(item=>item.oi===sites[0]);
  const expected=kind==='demi-section'?assignment?.halfSection:assignment?.section;
  const activeHalves=qv.ctaParameters?.demiSectionsOperationnelles?.[sites[0]] || [];
  const activePublic=kind==='demi-section'?activeHalves.includes(expected):activeHalves.some(code=>code.slice(0,3)===expected);
  const ctaInstruction=Boolean(domain==='DPS' && kind && sites.length===1 && expected && (row.publics || []).includes(expected)
    && activePublic);
  let calendar=qv.calendarDays;
  if(ctaInstruction){
    if(weekdayName(date)==='SATURDAY') policy.SATURDAY='AUTORISE';
    calendar=(calendar || []).filter(item=>calendarType(item)!=='VACANCES_SCOLAIRES');
  }
  const assessment=classifyCandidateDate(date,policy,calendar);
  if(!['INTERDIT','DECONSEILLE'].includes(assessment.dayClass)) return null;
  return {...assessment,ruleCode:rule?.code || '',derogationAllowed:rule?.derogationAllowed!==false};
}

// A location is descriptive unless its exclusive occupation is explicitly recorded.
function reservationConflicts(rows,assess){
  const active=rows.filter(row=>!row.external && row.startsAt && row.endsAt && !['ANNULE','NON_RETENU'].includes(row.status));
  const location=row=>Object.hasOwn(row,'lieuId')?row.lieuId:row.business?.lieuId;
  const room=row=>Object.hasOwn(row,'salleTheorieId')?row.salleTheorieId:row.business?.salleTheorieId;
  const exclusive=row=>row.exclusiveLocation===true || row.business?.exclusiveLocation===true;
  const resources=row=>row.resourceCodes || row.resources || row.business?.resourceCodes || [];
  const conflicts=[];
  for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++) {
    const left=active[i],right=active[j];
    if(left.id===right.id || left.reservationOwner && left.reservationOwner===right.reservationOwner) continue;
    const start=row=>String(row.startsAt).slice(0,16),end=row=>String(row.endsAt).slice(0,16);
    const overlap=start(left)<end(right) && start(right)<end(left);
    const minutes=value=>Date.parse(`${value}:00Z`)/60000;
    const gap=Math.max(minutes(start(left))-minutes(end(right)),minutes(start(right))-minutes(end(left)));
    const causes=[];
    if(room(left) && room(left)===room(right) && (overlap || gap<30))
      causes.push({code:'ROOM_CONFLICT',level:'BLOCKING',kind:overlap?'OVERLAP':'TURNAROUND',minimumGapMinutes:30});
    if(overlap && location(left) && location(left)===location(right) && (exclusive(left) || exclusive(right)))
      causes.push({code:'RESOURCE_CONFLICT',level:'BLOCKING',resourceCodes:[`LOCATION:${location(left)}`]});
    const shared=resources(left).filter(code=>resources(right).includes(code));
    if(overlap && shared.length) causes.push({code:'RESOURCE_CONFLICT',level:'BLOCKING',resourceCodes:shared});
    let actual=causes;
    if(assess && causes.length){
      const slot=row=>({date:dateOnly(row.startsAt),endDate:dateOnly(row.endsAt),startTime:String(row.startsAt).slice(11,16),
        endTime:String(row.endsAt).slice(11,16),roomCode:room(row) || '',resourceCodes:[...resources(row),
          ...(location(row) && (exclusive(left) || exclusive(right))?[`LOCATION:${location(row)}`]:[])],priority:100});
      actual=causes.filter(cause=>cause.code==='ROOM_CONFLICT').concat(
        assess(slot(left),slot(right)).causes.filter(cause=>cause.code==='RESOURCE_CONFLICT'));
    }
    if(actual.length) conflicts.push({leftId:left.id,rightId:right.id,leftLabel:left.label || left.activityLabel,
      rightLabel:right.label || right.activityLabel,date:dateOnly(left.startsAt),
      leftStartsAt:left.startsAt,leftEndsAt:left.endsAt,rightStartsAt:right.startsAt,rightEndsAt:right.endsAt,
      roomLabel:left.room || left.roomLabel || right.room || right.roomLabel || '',causes:actual,blocking:true});
  }
  return conflicts;
}

function personnelConflicts(rows){
  const active=rows.filter(row=>!row.external && row.startsAt && row.endsAt && !['ANNULE','NON_RETENU'].includes(row.status));
  const em=row=>row.statCom==='EMSEA' || row.definitionId==='QV26-SEANCE-EM-ED042EBD';
  const publics=row=>row.publics || row.publicCodes || [];
  const emFunctions=['CMDT:CDT','CMDT:C-OP','CMDT:C-LOG','CMDT:C-FOR','CMDT:QM'];
  const roles=row=>[...publics(row).filter(code=>code.startsWith('CMDT:')),
    ...(em(row)?emFunctions:[]),
    ...(row.definitionId==='QV26-SEANCE-DIRECTION-JSP-32B2ACA4'?['CMDT:C-FOR']:[])];
  const result=[];
  for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++){
    const a=active[i],b=active[j];
    if(a.id===b.id || a.reservationOwner && a.reservationOwner===b.reservationOwner
      || String(a.startsAt).slice(0,16)>=String(b.endsAt).slice(0,16)
      || String(b.startsAt).slice(0,16)>=String(a.endsAt).slice(0,16)) continue;
    const shared=[...new Set(roles(a).filter(role=>roles(b).includes(role)))];
    const echelon=(em(a) && publics(b).includes('ECH:IV')) || (em(b) && publics(a).includes('ECH:IV'));
    if(!shared.length && !echelon) continue;
    const priority=em(a)!==em(b)?(em(a)?a:b):null,other=priority && (priority===a?b:a);
    result.push({leftId:a.id,rightId:b.id,leftLabel:a.label || a.activityLabel,rightLabel:b.label || b.activityLabel,
      date:dateOnly(a.startsAt),sharedFunctions:shared,echelonIV:echelon,
      evidence:'MOA_FUNCTION_PARTICIPATION',priorityId:priority?.id || null,repositionId:other?.id || null,
      repositionLabel:other?.label || other?.activityLabel || '',automaticMove:false});
  }
  return result;
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

function pickProposalSlot({ year, month, domain, activity, calendarRows, rulesByDomain, preferredWeekday, requiredWeekday, blockedDates }){
  const wantedMonth = Math.min(12, Math.max(1, Number(month || 2)));
  const blocked = blockedDates instanceof Set ? blockedDates : new Set(blockedDates || []);
  const candidates = [];
  const last = new Date(Date.UTC(year, wantedMonth, 0)).getUTCDate();
  for(let day = 1; day <= last; day += 1){
    const date = `${year}-${pad2(wantedMonth)}-${pad2(day)}`;
    if(blocked.has(date)) continue;
    const policy = dayPolicyForActivity(domain, activity, rulesByDomain, date);
    const classified = classifyCandidateDate(date, policy, calendarRows);
    if(requiredWeekday && classified.weekday !== requiredWeekday) continue;
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
    const start = String(activity.startsAt).slice(0, 5);
    const end = String(activity.endsAt || '').slice(0, 5);
    const asMinutes = (value) => Number(value.slice(0,2)) * 60 + Number(value.slice(3,5));
    const duration = /^\d{2}:\d{2}$/.test(end) ? asMinutes(end) - asMinutes(start) : 0;
    return { start, end: end || '21:30', minutes: duration > 0 ? duration : 120 };
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

// Exact canonical definitions, not title matching. Mixed preparations still require qualified relations.
const PREPARATION_PAIRS = [
  ['QV26-EXERCICE-DAP-1-9890D687','QV26-COURS-DE-CADRES-EXERCICE-DAP-1-871DAD30','DAP'],
  ['QV26-EXERCICE-DAP-2-6285EF74','QV26-COURS-DE-CADRES-EXERCICE-DAP-2-1E456232','DAP'],
  ['QV26-EXERCICE-DAP-3-618B0715','QV26-COURS-DE-CADRES-EXERCICE-DAP-3-8C02654D','DAP'],
  ['QV26-EXERCICE-DAP-4-46753B3A','QV26-COURS-DE-CADRES-EXERCICE-DAP-4-CF22E79B','DAP'],
  ['QV26-EXERCICE-DPS-1-6A16603D','QV26-COURS-DE-CADRES-EXERCICE-DPS-1-EC74513E','DPS'],
  ['QV26-EXERCICE-DPS-2-54E09232','QV26-COURS-DE-CADRES-EXERCICE-DPS-2-D7F0BFF7','DPS'],
  ['QV26-EXERCICE-DPS-3-29F948D1','QV26-COURS-DE-CADRES-EXERCICE-DPS-3-D4DA4C84','DPS']
];

const GROUPED_PREPARATIONS = [
  {id:'DPS-GROUP-1',definitionId:'QV26-FORMATION-GROUPEE-1-1-3D8CCE58',
    courseDefinitionId:'QV26-COURS-DE-CADRES-FORMATION-GROUPEE-DPS-87729EC5',
    sessionSourceIds:Array.from({length:6},(_,index)=>`QV26-FORMATION-GROUPEE-1-1-3D8CCE58:O1:S${index+1}`),
    oiCodes:['DPS:G1','DPS:C1','DPS:B1','DPS:B2'],statCom:'0120F7',courseStatCom:'0162F7'},
  {id:'DAP-GROUP-1',definitionId:'DAP-FORMATION-GROUPEE',
    courseSourceId:'QV27:MANUAL:26ff9a06-a58a-4da0-8e63-2486118fc62b',
    sessionSourceIds:['QV27:DAP-GROUP:1.1','QV27:DAP-GROUP:1.2'],
    oiCodes:['DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4'],statCom:'0130F7',courseStatCom:'0130F7'}
];

function preparationControlAffects(control,id){
  return control.courseId===id || (control.exerciseIds || [control.exerciseId]).includes(id);
}

function preparationControls(input){
  const rows=(input || []).filter(row=>!row.external && !row.excluded && !row.dapExerciseExcluded
    && !row.programmeReconciliation && !['ANNULE','NON_RETENU'].includes(row.status));
  const definition=row=>row.definitionId || row.sessionStructure?.definitionId;
  const ois=row=>row.oiSelections || row.ois || [];
  const label=row=>row?.activityLabel || row?.label || 'Cours absent';
  const localDay=value=>{
    let day=dateOnly(value);
    if(value instanceof Date || /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(value || ''))){
      const parsed=new Date(value);
      if(Number.isNaN(parsed.getTime())) return '';
      const parts=new Intl.DateTimeFormat('fr-CH',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(parsed);
      day=['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day+'T00:00:00Z'))
      && new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day ? day : '';
  };
  const controls=[];
  const relations=rows.filter(row=>PREPARATION_PAIRS.some(([id])=>id===definition(row))
    || ['QV26-EXERCICE-DPS-DAP-1-7F1E9444','QV26-EXERCICE-DPS-DAP-2-668A88B6'].includes(definition(row)))
    .map(exercise=>({exercise,members:[exercise],group:null}));
  for(const group of GROUPED_PREPARATIONS){
    const known=row=>[row.id,row.lineage?.initialOccurrence,row.lineage?.key].some(id=>group.sessionSourceIds.includes(id));
    const members=rows.filter(row=>definition(row)===group.definitionId && known(row))
      .sort((a,b)=>localDay(a.startsAt).localeCompare(localDay(b.startsAt)) || String(a.id).localeCompare(String(b.id)));
    if(members.length) relations.push({exercise:members[0],members,group});
    for(const exercise of rows.filter(row=>definition(row)===group.definitionId && !known(row)))
      relations.push({exercise,members:[exercise],group:{...group,ambiguous:true}});
  }
  for(const {exercise,members,group} of relations){
    const pair=PREPARATION_PAIRS.find(([id])=>id===definition(exercise));
    const sameOi=(row,codes)=>ois(row).length===codes.length && codes.every(code=>ois(row).includes(code));
    const sites=ois(exercise),oi=sites.length===1?sites[0]:sites.join(', ');
    const expected=pair && (pair[2]==='DAP'?/^DAP:(Y[1-4])$/:/^DPS:(G1|C1|B1|B2)$/).exec(oi);
    const qualified=group ? !group.ambiguous && members.every(row=>sameOi(row,group.oiCodes) && row.statCom===group.statCom)
      : expected && exercise.statCom===(pair[2]==='DAP'?'013':'012')+expected[1];
    const matching=qualified?rows.filter(course=>group
      ? (group.courseDefinitionId ? definition(course)===group.courseDefinitionId
        : [course.id,course.lineage?.initialOccurrence,course.lineage?.key].includes(group.courseSourceId))
          && sameOi(course,group.oiCodes) && course.statCom===group.courseStatCom
      : definition(course)===pair[1] && course.statCom===exercise.statCom && ois(course).length===1 && ois(course)[0]===oi):[];
    const sections=row=>(row.publics || row.publicCodes || []).filter(code=>/^N0[1-6][ab]?$/.test(code));
    const candidates=matching.filter(course=>!sections(course).length || !sections(exercise).length
      || sections(course).some(left=>sections(exercise).some(right=>left===right
        || left.length===3 && right.startsWith(left) || right.length===3 && left.startsWith(right))));
    const scopeConflict=matching.length>0 && candidates.length===0;
    const course=candidates.length===1?candidates[0]:null;
    const exerciseDate=members.every(row=>localDay(row.startsAt))?localDay(exercise.startsAt):'',courseDate=course && localDay(course.endsAt || course.startsAt);
    const days=exerciseDate && courseDate ? Math.round((Date.parse(exerciseDate+'T00:00:00Z')-Date.parse(courseDate+'T00:00:00Z'))/86400000):null;
    const status=!qualified || candidates.length>1 || scopeConflict ? 'MOA_REQUIRED' : !course || !exerciseDate || !courseDate ? 'A_CONTROLER'
      : days<0 ? 'NON_CONFORME_CRITIQUE' : days<14 ? 'A_CONTROLER' : 'CONFORME';
    const cause=!qualified?'Relation préparatoire qualifiée à confirmer par la MOA.' : scopeConflict?'Les sections ou demi-sections du cours et de l’exercice ne correspondent pas.' : candidates.length>1?'Plusieurs cours correspondants : arbitrage MOA requis.'
      : !course?'Cours de cadres correspondant absent.' : !courseDate?'Cours de cadres sans date.' : !exerciseDate?'Exercice sans date.'
        : days<0?'Le cours a lieu après l’exercice.' : days<14?'Le délai minimal de préparation n’est pas respecté.' : 'Délai minimal respecté.';
    const identity=[exercise.id,course?.id || null,oi,exerciseDate,courseDate,14];
    if(group) identity.push(group.id,members.map(row=>[row.id,localDay(row.startsAt)]).sort(([a],[b])=>a.localeCompare(b)));
    const key=JSON.stringify(identity);
    const exception=[...members.flatMap(row=>row.preparationDerogations || []),...(course?.preparationDerogations || [])]
      .find(item=>item.key===key && item.motif?.trim() && item.actor && item.at);
    const message=`${label(exercise)} · OI ${oi || 'à qualifier'} · ${group?'Première séance':'Exercice'} ${exerciseDate || 'sans date'} · ${label(course)} ${courseDate || 'sans date'} · Délai ${days==null?'non calculable':days+' jours'} ; minimum 14 jours. ${cause}`;
    controls.push({rule:'QV-EXERCICE-PREPARATION-001',key,exerciseId:exercise.id,exerciseIds:members.map(row=>row.id),
      ...(group?{groupId:group.id,firstSessionId:exercise.id}:{}),courseId:course?.id || null,oi,
      exerciseDate,courseDate,days,minimumDays:14,status,message,exception:exception || null,
      blocking:status!=='CONFORME' && !exception && !members.every(row=>row.publishedEventId),
      exceptionAllowed:Boolean(course && courseDate && exerciseDate && qualified)});
  }
  return controls;
}

return {
  preparationControls,
  preparationControlAffects,
  GROUPED_PREPARATIONS,
  PREPARATION_PAIRS,
  WEEKDAY_LABELS,
  DAY_CLASS_LABELS,
  DEFAULT_DAY_POLICY,
  applicablePlanningRule,
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
  isOsrTraining,
  programmeDayControl,
  reservationConflicts,
  personnelConflicts,
  classifyCandidateDate,
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

});
