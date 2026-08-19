'use strict';
const { parsePeriod, inPeriod, monthKey } = require('./_scope-period');
const {
  KINDS,
  MODES,
  inferModeSuivi,
  emptyVolumes,
  addVolumes,
  officialFromTaux,
  officialFromQuantitatif,
  legacyPointFromAggregate,
  resolveObjective,
  analyticStatus,
  gapPct,
  computeTaux,
  safePercentage
} = require('./_scope-analytics');

function truthy(value){
  const text = String(value == null ? '' : value).toLowerCase();
  if(['0', 'false', 'no', 'non'].includes(text)) return false;
  if(['1', 'true', 'yes', 'oui'].includes(text)) return true;
  return value !== false;
}

function exclusionBucket(){
  return {
    legacy: 0,
    annules: 0,
    reportes: 0,
    planifies: 0,
    dispenses: 0,
    encadrement: 0,
    nonRenseignes: 0,
    horsPeriode: 0,
    horsPerimetre: 0,
    quantitatifSansVolumes: 0
  };
}

function officialTotals(rows){
  let numerator = 0;
  let denominator = 0;
  let volumes = emptyVolumes();
  for(const row of rows){
    numerator += Number(row.numerator || 0);
    denominator += Number(row.denominator || 0);
    volumes = addVolumes(volumes, row.volumes);
  }
  return {
    numerator,
    denominator,
    percentage: safePercentage(numerator, denominator),
    kind: KINDS.OFFICIEL,
    eventCount: rows.length,
    volumes
  };
}

function timeseriesFromOfficial(rows){
  const buckets = new Map();
  for(const row of rows){
    const key = monthKey(row.date);
    if(!key) continue;
    const current = buckets.get(key) || { month: key, numerator: 0, denominator: 0, eventCount: 0, kind: KINDS.OFFICIEL };
    current.numerator += Number(row.numerator || 0);
    current.denominator += Number(row.denominator || 0);
    current.eventCount += 1;
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((bucket) => ({
      ...bucket,
      percentage: safePercentage(bucket.numerator, bucket.denominator)
    }));
}

function timeseriesFromLegacy(points){
  const buckets = new Map();
  for(const point of points){
    const key = monthKey(point.date);
    if(!key) continue;
    const current = buckets.get(key) || { month: key, eventCount: 0, kind: KINDS.LEGACY, points: [] };
    current.eventCount += 1;
    current.points.push(point);
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function looksLikeUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function resolveQuery(repo, query){
  const resolved = Object.assign({}, query || {});
  const raw = resolved.cibleId || resolved.cible || null;
  if(!raw || looksLikeUuid(raw) || typeof repo.findCible !== 'function'){
    if(looksLikeUuid(raw)) resolved.cibleId = raw;
    return resolved;
  }
  const text = String(raw);
  const parts = text.split('/');
  if(parts.length === 2){
    const cible = await repo.findCible(parts[0], parts[1]);
    if(cible) resolved.cibleId = cible.cible_id;
    return resolved;
  }
  const domaine = resolved.domaineCode || resolved.domaine;
  if(domaine){
    const cible = await repo.findCible(domaine, text);
    if(cible) resolved.cibleId = cible.cible_id;
  }
  return resolved;
}

function createScopeAnalyticsService(repo){
  async function loadBundle(query, period){
    if(typeof repo.loadAnalyticsBundle === 'function'){
      return repo.loadAnalyticsBundle({
        from: period.from,
        to: period.to,
        domaineCode: query.domaineCode || query.domaine || null,
        cibleId: looksLikeUuid(query.cibleId) ? query.cibleId : (looksLikeUuid(query.cible) ? query.cible : null),
        evenementId: query.evenementId || query.evenement_id || null,
        personneId: query.personneId || query.personne_id || null
      });
    }
    const evenementId = query.evenementId || query.evenement_id || null;
    const domaineCode = query.domaineCode || query.domaine || null;
    const cibleId = looksLikeUuid(query.cibleId) ? query.cibleId : (looksLikeUuid(query.cible) ? query.cible : null);
    const personneId = query.personneId || query.personne_id || null;
    const events = evenementId
      ? [await repo.getEvent(evenementId)].filter(Boolean)
      : await repo.listEvenements({ domaine: domaineCode || undefined });
    const bundle = { events: [], attendusByEvent: {}, participationsByEvent: {}, cibleIdsByEvent: {}, legacyByEvent: {}, quantitatifByEvent: {} };
    for(const event of events){
      if(!inPeriod(event.date, period)) continue;
      if(domaineCode && event.domaine_code !== domaineCode) continue;
      const cibleIds = await repo.listEventCibleIds(event.evenement_id);
      if(cibleId && !cibleIds.includes(cibleId)) continue;
      bundle.events.push({ ...event, mode_suivi: inferModeSuivi(event), cible_ids: cibleIds });
      bundle.cibleIdsByEvent[event.evenement_id] = cibleIds;
      bundle.attendusByEvent[event.evenement_id] = await repo.listAttendus(event.evenement_id);
      bundle.participationsByEvent[event.evenement_id] = await repo.listParticipations(event.evenement_id);
      if(repo.getLegacyByEvenementId){
        bundle.legacyByEvent[event.evenement_id] = await repo.getLegacyByEvenementId(event.evenement_id);
      }
      if(repo.getQuantitatifSaisie){
        bundle.quantitatifByEvent[event.evenement_id] = await repo.getQuantitatifSaisie(event.evenement_id);
      }
    }
    bundle.personneId = personneId;
    return bundle;
  }

  function classify(event, bundle){
    const mode = inferModeSuivi(event);
    const attendus = bundle.attendusByEvent[event.evenement_id] || [];
    const participations = bundle.participationsByEvent[event.evenement_id] || [];
    const personneId = bundle.personneId || null;

    if(mode === MODES.LEGACY || event.origine === 'LEGACY_AGGREGATED'){
      return { include: false, reason: 'legacy', mode };
    }
    if(personneId && mode !== MODES.NOMINATIF){
      return { include: false, reason: 'personne_non_nominatif', mode };
    }
    if(event.statut === 'ANNULE') return { include: false, reason: 'annule', mode };
    if(event.statut === 'REPORTE') return { include: false, reason: 'reporte', mode };
    if(event.statut === 'PLANIFIE') return { include: false, reason: 'planifie', mode };
    if(event.statut !== 'REALISE') return { include: false, reason: 'statut_non_realise', mode };

    if(mode === MODES.QUANTITATIF){
      if(personneId) return { include: false, reason: 'personne_non_nominatif', mode };
      const qty = bundle.quantitatifByEvent[event.evenement_id];
      const official = qty ? officialFromQuantitatif(qty) : null;
      if(!official) return { include: false, reason: 'quantitatif_sans_volumes', mode };
      return { include: true, reason: null, mode, official };
    }

    let attendusUse = attendus;
    let partsUse = participations;
    if(personneId){
      attendusUse = attendus.filter((a) => String(a.personne_id) === String(personneId));
      partsUse = participations.filter((p) => String(p.personne_id) === String(personneId));
      if(!attendusUse.length) return { include: false, reason: 'personne_hors_attendus', mode };
    }
    const official = officialFromTaux(computeTaux(partsUse, attendusUse));
    return { include: true, reason: null, mode, official, attendus: attendusUse, participations: partsUse };
  }

  async function evaluate(query){
    const resolved = await resolveQuery(repo, query || {});
    const period = parsePeriod(resolved);
    const includeLegacyVisual = resolved.includeLegacyVisual === undefined ? true : truthy(resolved.includeLegacyVisual);
    const bundle = await loadBundle(resolved, period);
    bundle.personneId = resolved.personneId || resolved.personne_id || bundle.personneId || null;
    const domaineCode = resolved.domaineCode || resolved.domaine || null;
    const cibleId = resolved.cibleId || null;
    const evenementId = resolved.evenementId || resolved.evenement_id || null;
    const personneId = bundle.personneId;

    const exclusions = exclusionBucket();
    const included = [];
    const excludedEvents = [];
    const legacyPoints = [];

    for(const event of bundle.events){
      const mode = inferModeSuivi(event);
      const classified = classify(event, bundle);
      if(mode === MODES.LEGACY || event.origine === 'LEGACY_AGGREGATED'){
        exclusions.legacy += 1;
        const legacy = bundle.legacyByEvent[event.evenement_id];
        if(legacy && includeLegacyVisual){
          legacyPoints.push(legacyPointFromAggregate({ ...event, cible_ids: bundle.cibleIdsByEvent[event.evenement_id] || [] }, legacy));
        }
        excludedEvents.push({ evenementId: event.evenement_id, date: event.date, libelle: event.libelle, reason: 'legacy', modeSuivi: MODES.LEGACY });
        continue;
      }
      if(!classified.include){
        if(classified.reason === 'annule') exclusions.annules += 1;
        else if(classified.reason === 'reporte') exclusions.reportes += 1;
        else if(classified.reason === 'planifie') exclusions.planifies += 1;
        else if(classified.reason === 'quantitatif_sans_volumes') exclusions.quantitatifSansVolumes += 1;
        else if(classified.reason === 'personne_non_nominatif' || classified.reason === 'personne_hors_attendus'){
          exclusions.horsPerimetre += 1;
        }
        excludedEvents.push({
          evenementId: event.evenement_id,
          date: event.date,
          libelle: event.libelle,
          reason: classified.reason,
          modeSuivi: classified.mode
        });
        continue;
      }
      const volumes = classified.official.volumes || emptyVolumes();
      exclusions.dispenses += volumes.dispenses;
      exclusions.nonRenseignes += volumes.nonRenseignes;
      exclusions.encadrement += (classified.participations || []).filter((p) => p.role && p.role !== 'PARTICIPANT' && p.role !== 'RENFORT' && p.role !== 'REMPLACANT').length;
      included.push({
        evenementId: event.evenement_id,
        date: event.date,
        libelle: event.libelle,
        domaine: event.domaine_code,
        modeSuivi: classified.mode,
        numerator: classified.official.numerator,
        denominator: classified.official.denominator,
        percentage: classified.official.percentage,
        volumes,
        kind: KINDS.OFFICIEL
      });
    }

    const officiel = officialTotals(included);
    const objective = resolveObjective({
      date: period.to,
      domaine: domaineCode,
      cible: cibleId
    });
    const status = analyticStatus(officiel.percentage, objective, { vigilanceMarginPct: null });
    const perimeter = { domaine: domaineCode || null, cible: cibleId || null, evenementId: evenementId || null, personneId: personneId || null };

    return {
      period,
      scope: perimeter,
      officiel: {
        ...officiel,
        objective,
        gapPct: gapPct(officiel.percentage, objective),
        analyticStatus: status.status,
        analyticStatusReason: status.reason
      },
      legacy: includeLegacyVisual ? {
        kind: KINDS.LEGACY,
        eventCount: legacyPoints.length,
        points: legacyPoints,
        globalKpi: null,
        globalKpiReason: 'contrat_legacy_non_homogene'
      } : undefined,
      exclusions,
      includedEvents: included,
      excludedEvents,
      objective,
      vigilanceMarginPct: null
    };
  }

  async function summary(query){
    const evaluated = await evaluate(query);
    return {
      period: evaluated.period,
      scope: evaluated.scope,
      officiel: evaluated.officiel,
      legacy: evaluated.legacy,
      exclusions: evaluated.exclusions,
      explainRef: {
        from: evaluated.period.from,
        to: evaluated.period.to,
        domaine: evaluated.scope.domaine,
        cible: evaluated.scope.cible,
        evenementId: evaluated.scope.evenementId,
        personneId: evaluated.scope.personneId
      }
    };
  }

  async function explain(query){
    const evaluated = await evaluate(query);
    return {
      period: evaluated.period,
      perimeter: evaluated.scope,
      kind: KINDS.OFFICIEL,
      includedEvents: evaluated.includedEvents,
      excludedEvents: evaluated.excludedEvents,
      totals: {
        numerator: evaluated.officiel.numerator,
        denominator: evaluated.officiel.denominator,
        percentage: evaluated.officiel.percentage,
        eventCount: evaluated.officiel.eventCount,
        volumes: evaluated.officiel.volumes
      },
      exclusions: evaluated.exclusions,
      objective: evaluated.objective,
      analyticStatus: evaluated.officiel.analyticStatus,
      legacy: evaluated.legacy
    };
  }

  async function timeseries(query){
    const evaluated = await evaluate(query);
    return {
      period: evaluated.period,
      scope: evaluated.scope,
      officiel: timeseriesFromOfficial(evaluated.includedEvents),
      legacy: timeseriesFromLegacy((evaluated.legacy && evaluated.legacy.points) || [])
    };
  }

  return { summary, explain, timeseries, evaluate };
}

module.exports = { createScopeAnalyticsService };
