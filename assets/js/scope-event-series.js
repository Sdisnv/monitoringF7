/* SCOPE-EVENT-SERIES-SEMANTIC-CONTRACT-1
   Contrat unique INDIVIDUAL vs MULTI_SESSION.
   Un entier isolé (FOBA 1, JSP 4) n’est jamais une séance.
   La notation X.Y détecte une série ; la clé persistée reste la source de vérité. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeEventSeries = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SERIES_TYPE = Object.freeze({
    INDIVIDUAL: 'INDIVIDUAL',
    MULTI_SESSION: 'MULTI_SESSION'
  });

  const FAMILY_TOKENS = Object.freeze([
    { token: 'PR-ABC', domain: 'PR', family: 'ABC' },
    { token: 'PAPR-ABC', domain: 'PR', family: 'ABC' },
    { token: 'PRABC', domain: 'PR', family: 'ABC' },
    { token: 'TRUCK', domain: 'AUTO', family: 'TRUCK' },
    { token: 'CAR', domain: 'AUTO', family: 'CAR' },
    { token: 'PAPR', domain: 'PR', family: null },
    { token: 'FOBA', domain: 'FOBA', family: null },
    { token: 'FOCA', domain: 'FOCA', family: null },
    { token: 'FOSPEC', domain: 'FOSPEC', family: null },
    { token: 'AUTO', domain: 'AUTO', family: null },
    { token: 'JSP', domain: 'JSP', family: null },
    { token: 'DPS', domain: 'DPS', family: null },
    { token: 'DAP', domain: 'DAP', family: null },
    { token: 'PR', domain: 'PR', family: null }
  ]);

  const FAMILY_PATTERN = FAMILY_TOKENS.map((row) => row.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const XY_RE = new RegExp('(?:^|[^A-Z0-9])(?:(' + FAMILY_PATTERN + ')\\s+)?(\\d+)\\.(\\d+)(?!\\.\\d)', 'gi');

  function text(value){
    return String(value == null ? '' : value).trim();
  }

  function upper(value){
    return text(value).toUpperCase();
  }

  function normalizeDomain(value){
    const code = upper(value);
    if(code === 'PAPR') return 'PR';
    return code;
  }

  function cyclePart(event){
    return text(event && (event.cycle_id || event.cycleId)) || 'NO_CYCLE';
  }

  function familyMeta(token){
    const key = upper(token);
    return FAMILY_TOKENS.find((row) => row.token === key) || null;
  }

  function exerciseIdOf(event){
    return text(event && (event.exercice_id || event.exerciceId || event.exercise_id || event.exerciseId));
  }

  function exerciseMode(event){
    return upper(event && (
      event.mode_session
      || event.modeSession
      || (event.exercice && (event.exercice.mode_session || event.exercice.modeSession))
    ));
  }

  function expectedSessionCount(event){
    const value = event && (
      event.nombre_sessions_attendu
      || event.nombreSessionsAttendu
      || (event.exercice && (event.exercice.nombre_sessions_attendu || event.exercice.nombreSessionsAttendu))
    );
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? count : null;
  }

  function consolidationActive(event){
    const value = event && (
      event.consolidation_active
      || event.consolidationActive
      || (event.exercice && (event.exercice.consolidation_active || event.exercice.consolidationActive))
    );
    return value === true;
  }

  function semanticSeriesKey({ domain, family, exerciseNumber, cycleId }){
    const cycle = text(cycleId) || 'NO_CYCLE';
    const dom = normalizeDomain(domain) || 'SCOPE';
    if(dom === 'PR' && family === 'ABC') return `${cycle}:PR-ABC:${exerciseNumber}`;
    if(dom === 'AUTO' && (family === 'CAR' || family === 'TRUCK')) return `${cycle}:AUTO:${family}:${exerciseNumber}`;
    if(family) return `${cycle}:${dom}:${family}:${exerciseNumber}`;
    return `${cycle}:${dom}:${exerciseNumber}`;
  }

  function emptyIndividual(domain, source){
    return {
      seriesType: SERIES_TYPE.INDIVIDUAL,
      seriesKey: '',
      sessionKey: '',
      sessionLabel: '',
      exerciseNumber: null,
      sessionNumber: null,
      family: null,
      domain: normalizeDomain(domain) || '',
      source: source || 'none',
      persisted: false
    };
  }

  function parseSeriesNotation(libelle, options = {}){
    const raw = text(libelle);
    const domainHint = normalizeDomain(options.domain || options.domaine || options.domaine_code);
    const cycleId = options.cycleId || options.cycle_id || null;
    if(!raw) return emptyIndividual(domainHint, 'none');
    XY_RE.lastIndex = 0;
    let last = null;
    let match;
    while((match = XY_RE.exec(raw))){
      last = match;
    }
    if(!last){
      return emptyIndividual(domainHint, 'integer_or_unrelated');
    }
    const meta = familyMeta(last[1]);
    const exerciseNumber = Number(last[2]);
    const sessionNumber = Number(last[3]);
    const domain = (meta && meta.domain) || domainHint || '';
    const family = meta ? meta.family : null;
    const seriesKey = semanticSeriesKey({ domain, family, exerciseNumber, cycleId });
    return {
      seriesType: SERIES_TYPE.MULTI_SESSION,
      seriesKey,
      sessionKey: `${seriesKey}.${sessionNumber}`,
      sessionLabel: `${exerciseNumber}.${sessionNumber}`,
      exerciseNumber,
      sessionNumber,
      family,
      domain,
      source: 'notation',
      persisted: false
    };
  }

  function dapGroupedSeries(event){
    const domain = normalizeDomain(event && (event.domaine_code || event.domaineCode || event.domain));
    const libelle = text(event && (event.libelle || event.label));
    const dap = libelle.match(/formation\s+group[eé]e\s+dap\s+(\d+)(?:\.[0-9]+)?/i);
    if(domain !== 'DAP' || !dap) return null;
    const year = text(event && event.date).slice(0, 4) || 'unknown';
    const exerciseNumber = Number(dap[1]);
    const sessionMatch = libelle.match(/formation\s+group[eé]e\s+dap\s+(\d+)\.(\d+)/i);
    const sessionNumber = sessionMatch ? Number(sessionMatch[2]) : null;
    const seriesKey = `DAP_FORMATION_GROUPEE:${year}:${exerciseNumber}`;
    return {
      seriesType: SERIES_TYPE.MULTI_SESSION,
      seriesKey,
      sessionKey: sessionNumber ? `${seriesKey}.${sessionNumber}` : '',
      sessionLabel: sessionNumber ? `${exerciseNumber}.${sessionNumber}` : String(exerciseNumber),
      exerciseNumber,
      sessionNumber,
      family: 'FORMATION_GROUPEE',
      domain: 'DAP',
      source: 'dap_grouped',
      persisted: false
    };
  }

  function withSessionFields(base, event){
    const explicitSession = text(event && (event.pr_session_key || event.prSessionKey));
    const explicitLabel = text(event && (event.pr_session_label || event.prSessionLabel || event.session_label || event.sessionLabel));
    const sessionIndex = Number(event && (event.session_index || event.sessionIndex));
    const notation = parseSeriesNotation(event && (event.libelle || event.label), {
      domain: base.domain || (event && (event.domaine_code || event.domaineCode)),
      cycleId: event && (event.cycle_id || event.cycleId)
    });
    const sessionNumber = Number.isInteger(sessionIndex) && sessionIndex > 0
      ? sessionIndex
      : (notation.sessionNumber || base.sessionNumber || null);
    const sessionKey = explicitSession
      || (sessionNumber && base.seriesKey ? `${base.seriesKey}.${sessionNumber}` : (notation.sessionKey || base.sessionKey || ''));
    const sessionLabel = explicitLabel
      || (notation.sessionLabel && notation.seriesKey === base.seriesKey ? notation.sessionLabel : '')
      || (sessionNumber ? String(sessionNumber) : (base.sessionLabel || ''));
    return Object.assign({}, base, {
      sessionKey,
      sessionLabel,
      sessionNumber,
      exerciseNumber: base.exerciseNumber || notation.exerciseNumber || null,
      family: base.family || notation.family || null
    });
  }

  function describeEventSeries(event = {}){
    const domain = normalizeDomain(event.domaine_code || event.domaineCode || event.domain);
    const explicitKey = text(event.pr_exercise_group_key || event.prExerciseGroupKey);
    if(explicitKey){
      return withSessionFields({
        seriesType: SERIES_TYPE.MULTI_SESSION,
        seriesKey: explicitKey,
        sessionKey: '',
        sessionLabel: '',
        exerciseNumber: null,
        sessionNumber: null,
        family: null,
        domain,
        source: 'persisted_group_key',
        persisted: true
      }, event);
    }

    const exId = exerciseIdOf(event);
    const count = expectedSessionCount(event);
    if(exId && (exerciseMode(event) === 'MULTI' || consolidationActive(event) || (count && count > 1))){
      return withSessionFields({
        seriesType: SERIES_TYPE.MULTI_SESSION,
        seriesKey: `EXERCICE:${exId}`,
        sessionKey: '',
        sessionLabel: '',
        exerciseNumber: null,
        sessionNumber: null,
        family: null,
        domain,
        source: 'persisted_exercise',
        persisted: true
      }, event);
    }

    const dap = dapGroupedSeries(event);
    if(dap) return withSessionFields(dap, event);

    const notation = parseSeriesNotation(event.libelle || event.label, {
      domain,
      cycleId: event.cycle_id || event.cycleId
    });
    if(notation.seriesType === SERIES_TYPE.MULTI_SESSION){
      return withSessionFields(notation, event);
    }
    return emptyIndividual(domain, notation.source);
  }

  function seriesPersistenceFields(event = {}){
    const series = describeEventSeries(event);
    if(series.seriesType !== SERIES_TYPE.MULTI_SESSION || !series.seriesKey){
      return {
        pr_exercise_group_key: null,
        pr_session_key: null
      };
    }
    return {
      pr_exercise_group_key: series.seriesKey,
      pr_session_key: series.sessionKey || null
    };
  }

  return {
    SERIES_TYPE,
    parseSeriesNotation,
    describeEventSeries,
    seriesPersistenceFields,
    semanticSeriesKey
  };
});
