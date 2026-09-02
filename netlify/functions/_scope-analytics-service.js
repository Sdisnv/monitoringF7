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
  analyticStatus,
  gapPct,
  computeTaux,
  safePercentage
} = require('./_scope-analytics');
const {
  inferAnalysisGrain,
  resolveEventObjective,
  collectObjectiveContext
} = require('./_scope-objectives');
const { isQualificationEvenement, wantsQualification } = require('./_scope-qualification');
const { filterAttendusEligibleAtDate } = require('./_scope-personnel');

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
    const current = buckets.get(key) || {
      month: key, numerator: 0, denominator: 0, eventCount: 0, kind: KINDS.OFFICIEL, applied: []
    };
    current.numerator += Number(row.numerator || 0);
    current.denominator += Number(row.denominator || 0);
    current.eventCount += 1;
    current.applied.push(row.appliedObjective || null);
    buckets.set(key, current);
  }
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((bucket) => {
      const context = collectObjectiveContext(bucket.applied);
      return {
        month: bucket.month,
        numerator: bucket.numerator,
        denominator: bucket.denominator,
        eventCount: bucket.eventCount,
        kind: bucket.kind,
        percentage: safePercentage(bucket.numerator, bucket.denominator),
        thresholdPct: context.objective ? context.objective.thresholdPct : null,
        objective: context.objective,
        objectiveContext: {
          homogeneous: context.homogeneous,
          distinctObjectives: context.distinctObjectives,
          reason: context.reason
        }
      };
    });
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
  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month)).map((bucket) => ({
    ...bucket,
    thresholdPct: null,
    objective: null,
    objectiveContext: { homogeneous: true, distinctObjectives: [], reason: 'LEGACY_HORS_OBJECTIF_OFFICIEL' }
  }));
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
    let bundle;
    if(typeof repo.loadAnalyticsBundle === 'function'){
      bundle = await repo.loadAnalyticsBundle({
        from: period.from,
        to: period.to,
        domaineCode: query.domaineCode || query.domaine || null,
        cibleId: looksLikeUuid(query.cibleId) ? query.cibleId : (looksLikeUuid(query.cible) ? query.cible : null),
        evenementId: query.evenementId || query.evenement_id || null,
        personneId: query.personneId || query.personne_id || null
      });
    } else {
      const evenementId = query.evenementId || query.evenement_id || null;
      const domaineCode = query.domaineCode || query.domaine || null;
      const cibleId = looksLikeUuid(query.cibleId) ? query.cibleId : (looksLikeUuid(query.cible) ? query.cible : null);
      const personneId = query.personneId || query.personne_id || null;
      const events = evenementId
        ? [await repo.getEvent(evenementId)].filter(Boolean)
        : await repo.listEvenements({ domaine: domaineCode || undefined });
      bundle = { events: [], attendusByEvent: {}, participationsByEvent: {}, cibleIdsByEvent: {}, legacyByEvent: {}, quantitatifByEvent: {} };
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
    }
    if(typeof repo.listAllPeriodes === 'function'){
      const periodes = await repo.listAllPeriodes();
      const periodesByPersonne = new Map();
      for(const row of periodes || []){
        const pid = String(row.personne_id || row.personneId || '');
        if(!periodesByPersonne.has(pid)) periodesByPersonne.set(pid, []);
        periodesByPersonne.get(pid).push(row);
      }
      bundle.periodesByPersonne = periodesByPersonne;
    } else {
      bundle.periodesByPersonne = new Map();
    }
    if(!wantsQualification(query)){
      bundle.events = (bundle.events || []).filter((event) => !isQualificationEvenement(event));
    }
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

    let attendusUse = filterAttendusEligibleAtDate(attendus, bundle.periodesByPersonne, event.date);
    let partsUse = participations;
    if(personneId){
      attendusUse = attendusUse.filter((a) => String(a.personne_id) === String(personneId));
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
    const grain = inferAnalysisGrain(resolved);
    const objectives = typeof repo.listObjectifs === 'function'
      ? await repo.listObjectifs({ actif: true })
      : [];

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
      const appliedObjective = resolveEventObjective(
        {
          date: event.date,
          domaine_code: event.domaine_code,
          cible_ids: bundle.cibleIdsByEvent[event.evenement_id] || event.cible_ids || []
        },
        { objectives, grain, queryCibleId: cibleId }
      );
      const part = personneId && (classified.participations || []).length
        ? classified.participations[0]
        : null;
      included.push({
        evenementId: event.evenement_id,
        date: event.date,
        libelle: event.libelle,
        domaine: event.domaine_code,
        sousDomaine: event.sous_domaine_code || null,
        cibleIds: bundle.cibleIdsByEvent[event.evenement_id] || event.cible_ids || [],
        modeSuivi: classified.mode,
        numerator: classified.official.numerator,
        denominator: classified.official.denominator,
        percentage: classified.official.percentage,
        volumes,
        kind: KINDS.OFFICIEL,
        appliedObjective,
        statutParticipation: part ? part.statut : null,
        motif: part && part.motif_absence ? part.motif_absence : null,
        cibleSuivieId: part && (part.cible_suivie_id || part.cibleSuivieId) ? (part.cible_suivie_id || part.cibleSuivieId) : null
      });
    }

    const officiel = officialTotals(included);
    const objectiveContext = collectObjectiveContext(included.map((row) => row.appliedObjective));
    const objective = objectiveContext.objective;
    const status = analyticStatus(officiel.percentage, objective, { vigilanceMarginPct: null });
    const perimeter = { domaine: domaineCode || null, cible: cibleId || null, evenementId: evenementId || null, personneId: personneId || null };
    const gap = gapPct(officiel.percentage, objective);

    return {
      period,
      scope: perimeter,
      analysisGrain: grain,
      officiel: {
        ...officiel,
        objective,
        gapPct: gap,
        analyticStatus: status.status,
        analyticStatusReason: status.reason,
        objectiveContext: {
          homogeneous: objectiveContext.homogeneous,
          distinctObjectives: objectiveContext.distinctObjectives,
          reason: objectiveContext.reason
        }
      },
      legacy: includeLegacyVisual ? {
        kind: KINDS.LEGACY,
        eventCount: legacyPoints.length,
        points: legacyPoints,
        globalKpi: null,
        globalKpiReason: 'contrat_legacy_non_homogene',
        objective: null,
        gapPct: null
      } : undefined,
      exclusions,
      includedEvents: included,
      excludedEvents,
      objective,
      objectiveContext,
      vigilanceMarginPct: null
    };
  }

  async function summary(query){
    return summaryFrom(await evaluate(query));
  }

  function summaryFrom(evaluated){
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
    return explainFrom(await evaluate(query));
  }

  function explainFrom(evaluated){
    return {
      period: evaluated.period,
      perimeter: evaluated.scope,
      analysisGrain: evaluated.analysisGrain,
      kind: KINDS.OFFICIEL,
      includedEvents: evaluated.includedEvents,
      excludedEvents: evaluated.excludedEvents,
      totals: {
        numerator: evaluated.officiel.numerator,
        denominator: evaluated.officiel.denominator,
        percentage: evaluated.officiel.percentage,
        eventCount: evaluated.officiel.eventCount,
        volumes: evaluated.officiel.volumes,
        excuseMotifs: {
          prive: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.excusesPrive) || 0),
          professionnel: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.excusesProfessionnel) || 0),
          armee: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.excusesArmee) || 0),
          accidentMaladie: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.excusesAccidentMaladie) || 0),
          nonPrecise: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.excusesNonPrecise) || 0),
          total: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.excuses) || 0)
        },
        permutations: Number((evaluated.officiel.volumes && evaluated.officiel.volumes.permutations) || 0)
      },
      exclusions: evaluated.exclusions,
      objective: evaluated.objective,
      gapPct: evaluated.officiel.gapPct,
      analyticStatus: evaluated.officiel.analyticStatus,
      analyticStatusReason: evaluated.officiel.analyticStatusReason,
      objectiveContext: evaluated.officiel.objectiveContext,
      objectiveSelection: {
        hierarchy: 'CIBLE > DOMAINE > GLOBAL',
        grain: evaluated.analysisGrain,
        reason: (evaluated.objectiveContext && evaluated.objectiveContext.reason) || 'OBJECTIVE_NOT_FOUND'
      },
      vigilanceMarginPct: null,
      legacy: evaluated.legacy
    };
  }

  async function timeseries(query){
    return timeseriesFrom(await evaluate(query));
  }

  function timeseriesFrom(evaluated){
    return {
      period: evaluated.period,
      scope: evaluated.scope,
      officiel: timeseriesFromOfficial(evaluated.includedEvents),
      legacy: timeseriesFromLegacy((evaluated.legacy && evaluated.legacy.points) || [])
    };
  }

  async function snapshot(query){
    const evaluated = await evaluate(query);
    return {
      evaluated,
      summary: summaryFrom(evaluated),
      explain: explainFrom(evaluated),
      timeseries: timeseriesFrom(evaluated)
    };
  }

  async function directoryRates(query){
    const resolved = await resolveQuery(repo, query || {});
    const period = parsePeriod(resolved);
    const bundle = await loadBundle({
      from: period.from,
      to: period.to,
      domaineCode: resolved.domaineCode || resolved.domaine || null,
      includeQualification: resolved.includeQualification,
      include_qualification: resolved.include_qualification
    }, period);
    const acc = new Map();
    for(const event of bundle.events){
      const classified = classify(event, bundle);
      if(!classified.include || classified.mode !== MODES.NOMINATIF) continue;
      const attendus = bundle.attendusByEvent[event.evenement_id] || [];
      const parts = bundle.participationsByEvent[event.evenement_id] || [];
      const byPid = new Map();
      for(const part of parts){
        byPid.set(String(part.personne_id || part.personneId), part);
      }
      for(const attendu of filterAttendusEligibleAtDate(attendus, bundle.periodesByPersonne, event.date)){
        if(attendu.inclus === false) continue;
        const pid = String(attendu.personne_id || attendu.personneId);
        const part = byPid.get(pid);
        const official = officialFromTaux(computeTaux(part ? [part] : [], [attendu]));
        const row = acc.get(pid) || {
          numerator: 0,
          denominator: 0,
          eventCount: 0,
          volumes: emptyVolumes()
        };
        row.numerator += Number(official.numerator || 0);
        row.denominator += Number(official.denominator || 0);
        row.volumes = addVolumes(row.volumes, official.volumes);
        row.eventCount += 1;
        acc.set(pid, row);
      }
    }
    const rates = {};
    for(const [pid, row] of acc.entries()){
      rates[pid] = {
        numerator: row.numerator,
        denominator: row.denominator,
        percentage: safePercentage(row.numerator, row.denominator),
        eventCount: row.eventCount,
        volumes: row.volumes
      };
    }
    return { period, rates };
  }

  return { summary, explain, timeseries, evaluate, snapshot, directoryRates };
}

module.exports = { createScopeAnalyticsService };
