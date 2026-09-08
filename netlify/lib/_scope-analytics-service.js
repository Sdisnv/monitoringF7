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
const {
  computeMultiSessionParticipationState,
  isValidSessionStatut,
  prSessionLabel,
  sessionExerciseLabel
} = require('./_scope-cycle-rules');
const { PERMUTATION_STATUS } = require('./_scope-model');
const { isPermutationCatchupAttendu } = require('./_scope-rules');

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
  let eventCount = 0;
  let volumes = emptyVolumes();
  for(const row of rows){
    numerator += Number(row.numerator || 0);
    denominator += Number(row.denominator || 0);
    eventCount += row.eventCountContribution == null ? 1 : Number(row.eventCountContribution || 0);
    volumes = addVolumes(volumes, row.volumes);
  }
  return {
    numerator,
    denominator,
    percentage: safePercentage(numerator, denominator),
    kind: KINDS.OFFICIEL,
    eventCount,
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
    current.eventCount += row.eventCountContribution == null ? 1 : Number(row.eventCountContribution || 0);
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

function personEligibleByDates(person, date){
  if(!person) return true;
  const day = String(date || '').slice(0, 10);
  const entree = String(person.date_entree || person.dateEntree || '').slice(0, 10);
  const sortie = String(person.date_sortie || person.dateSortie || '').slice(0, 10);
  if(entree && entree > day) return false;
  if(sortie && sortie < day) return false;
  return person.actif !== false || Boolean(sortie) || Boolean(entree);
}

function filterEligibleAttendus(attendus, bundle, date){
  const rows = filterAttendusEligibleAtDate(attendus, bundle.periodesByPersonne, date);
  const people = bundle.personnesById;
  if(!(people instanceof Map)) return rows;
  return rows.filter((row) => {
    const pid = String(row.personne_id || row.personneId || '');
    return personEligibleByDates(people.get(pid), date);
  });
}

function eventIdOf(row){
  return String(row && (row.evenement_id || row.evenementId) || '');
}

function fulfilledPermutationPersonIdsForEvent(bundle, event){
  const eventId = eventIdOf(event);
  if(String(event && event.domaine_code || '').toUpperCase() !== 'DAP' || !eventId) return new Set();
  return new Set((bundle.permutations || [])
    .filter((row) =>
      String(row.source_evenement_id || '') === eventId
      && String(row.statut || '').toUpperCase() === PERMUTATION_STATUS.RATTRAPPE
      && row.rattrapage_evenement_id
    )
    .map((row) => String(row.personne_id || ''))
    .filter(Boolean));
}

function multiSessionGroupKey(event){
  const explicit = event && (event.pr_exercise_group_key || event.prExerciseGroupKey);
  if(explicit) return String(explicit);
  const domaine = String(event && (event.domaine_code || event.domaineCode) || '').toUpperCase();
  const libelle = String(event && event.libelle || '');
  const dapGrouped = libelle.match(/formation\s+group[eé]e\s+dap\s+(\d+)(?:\.\d+)?/i);
  if(domaine === 'DAP' && dapGrouped){
    const year = String(event && event.date || '').slice(0, 4) || 'unknown';
    return `DAP_FORMATION_GROUPEE:${year}:${dapGrouped[1]}`;
  }
  const exerciseId = event && (event.exercice_id || event.exerciceId);
  const count = Number(event && (event.nombre_sessions_attendu || event.nombreSessionsAttendu || 0));
  const active = event && (event.consolidation_active === true || event.consolidationActive === true);
  if(exerciseId && (active || count > 1)) return `EXERCICE:${exerciseId}`;
  return '';
}

function isMultiSessionConsolidatedEvent(event){
  return Boolean(multiSessionGroupKey(event));
}

function consolidatedVolumesFromSessionState(state){
  const k = (state && state.kpis) || {};
  return Object.assign({}, emptyVolumes(), {
    attendus: Number(k.population || 0),
    presents: Number(k.presents || 0),
    realisationsDirectes: Number(k.presents || 0),
    excuses: Number(k.excuses || 0),
    nonExcuses: Number(k.absents || 0),
    dispenses: Number(k.dispenses || 0),
    nonRenseignes: Number(k.open || 0)
  });
}

function officialFromSessionState(state){
  const volumes = consolidatedVolumesFromSessionState(state);
  const numerator = Number(volumes.presents || 0);
  const denominator = numerator + Number(volumes.excuses || 0) + Number(volumes.nonExcuses || 0);
  return {
    numerator,
    denominator,
    percentage: safePercentage(numerator, denominator),
    kind: KINDS.OFFICIEL,
    eventCount: 1,
    volumes
  };
}

function officialFromPersonSessionRows(rows){
  const statuses = new Set((rows || [])
    .map((row) => String(row && row.statut || '').toUpperCase())
    .filter((status) => isValidSessionStatut(status)));
  let volumes = Object.assign({}, emptyVolumes(), { attendus: statuses.size ? 1 : 0 });
  if(statuses.has('PRESENT')){
    volumes = Object.assign(volumes, { presents: 1, realisationsDirectes: 1 });
    return { numerator: 1, denominator: 1, percentage: 100, kind: KINDS.OFFICIEL, eventCount: 1, volumes };
  }
  if(statuses.has('DISPENSE')){
    volumes = Object.assign(volumes, { dispenses: 1 });
    return { numerator: 0, denominator: 0, percentage: null, kind: KINDS.OFFICIEL, eventCount: 1, volumes };
  }
  if(statuses.has('ABSENT_EXCUSE')){
    volumes = Object.assign(volumes, { excuses: 1 });
    return { numerator: 0, denominator: 1, percentage: 0, kind: KINDS.OFFICIEL, eventCount: 1, volumes };
  }
  if(statuses.has('ABSENT_NON_EXCUSE')){
    volumes = Object.assign(volumes, { nonExcuses: 1 });
    return { numerator: 0, denominator: 1, percentage: 0, kind: KINDS.OFFICIEL, eventCount: 1, volumes };
  }
  volumes = Object.assign(volumes, { nonRenseignes: 1 });
  return { numerator: 0, denominator: 0, percentage: null, kind: KINDS.OFFICIEL, eventCount: 0, volumes };
}

function isCatchupOnlyTrace(attendus, participations){
  const expected = attendus || [];
  if(!expected.length || expected.some((row) => !isPermutationCatchupAttendu(row))) return false;
  return (participations || []).some((row) => String(row.statut || '').toUpperCase() === 'PRESENT');
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
    if(typeof repo.listPersonnes === 'function'){
      const people = await repo.listPersonnes({});
      bundle.personnesById = new Map((people || []).map((row) => [String(row.personne_id || row.personneId || row.id || ''), row]));
    } else {
      bundle.personnesById = new Map();
    }
    if(!wantsQualification(query)){
      bundle.events = (bundle.events || []).filter((event) => !isQualificationEvenement(event));
    }
    if(typeof repo.listPermutations === 'function'){
      const sourceEvenementIds = (bundle.events || [])
        .filter((event) => String(event.domaine_code || '').toUpperCase() === 'DAP')
        .map((event) => event.evenement_id)
        .filter(Boolean);
      bundle.permutations = sourceEvenementIds.length
        ? await repo.listPermutations({ sourceEvenementIds })
        : [];
    } else {
      bundle.permutations = [];
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

    let attendusUse = filterEligibleAttendus(attendus, bundle, event.date);
    let partsUse = participations;
    if(personneId){
      attendusUse = attendusUse.filter((a) => String(a.personne_id) === String(personneId));
      partsUse = participations.filter((p) => String(p.personne_id) === String(personneId));
      if(!attendusUse.length) return { include: false, reason: 'personne_hors_attendus', mode };
      if(event.pr_exercise_group_key || event.prExerciseGroupKey){
        const statut = partsUse[0] && partsUse[0].statut;
        if(!isValidSessionStatut(statut)){
          return { include: false, reason: 'session_sans_statut_valable', mode };
        }
      }
    }
    const catchupOnlyTrace = personneId && isCatchupOnlyTrace(attendusUse, partsUse);
    const official = officialFromTaux(computeTaux(partsUse, attendusUse, {
      fulfilledPermutationPersonIds: fulfilledPermutationPersonIdsForEvent(bundle, event)
    }));
    return { include: true, reason: null, mode, official, attendus: attendusUse, participations: partsUse, catchupOnlyTrace };
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
    const handledMultiSessionGroups = new Set();

    for(const event of bundle.events){
      const mode = inferModeSuivi(event);
      const groupKey = multiSessionGroupKey(event);
      if(!evenementId && groupKey && isMultiSessionConsolidatedEvent(event)){
        if(handledMultiSessionGroups.has(groupKey)) continue;
        const groupEvents = (bundle.events || []).filter((row) => multiSessionGroupKey(row) === groupKey);
        const allClosed = groupEvents.length > 1 && groupEvents.every((row) => row.statut === 'REALISE');
        if(allClosed){
          handledMultiSessionGroups.add(groupKey);
          const eventIds = groupEvents.map((row) => row.evenement_id);
          const groupAttendus = eventIds.flatMap((id) => bundle.attendusByEvent[id] || []);
          const groupParticipations = eventIds.flatMap((id) => bundle.participationsByEvent[id] || []);
          const state = computeMultiSessionParticipationState({
            cycle: { cycle_id: null, domaine_code: event.domaine_code || null },
            evenements: groupEvents,
            attendus: groupAttendus,
            participations: groupParticipations,
            personnes: bundle.personnesById || new Map(),
            currentEventId: event.evenement_id
          });
          const personGroupParticipations = personneId
            ? groupParticipations.filter((row) => String(row.personne_id || row.personneId || '') === String(personneId))
            : [];
          const personGroupAttendus = personneId
            ? groupAttendus.filter((row) => String(row.personne_id || row.personneId || '') === String(personneId) && row.inclus !== false)
            : [];
          if(personneId && !personGroupAttendus.length) continue;
          const official = personneId
            ? officialFromPersonSessionRows(personGroupParticipations)
            : officialFromSessionState(state);
          const cibles = [...new Set(eventIds.flatMap((id) => bundle.cibleIdsByEvent[id] || []))];
          const appliedObjective = resolveEventObjective(
            { date: event.date, domaine_code: event.domaine_code, cible_ids: cibles },
            { objectives, grain, queryCibleId: cibleId }
          );
          included.push({
            evenementId: event.evenement_id,
            date: event.date,
            libelle: state.sessionExerciseLabel || sessionExerciseLabel(groupEvents, groupKey),
            domaine: event.domaine_code,
            sousDomaine: event.sous_domaine_code || null,
            cibleIds: cibles,
            modeSuivi: mode,
            numerator: official.numerator,
            denominator: official.denominator,
            percentage: official.percentage,
            volumes: official.volumes,
            kind: KINDS.OFFICIEL,
            eventCountContribution: 1,
            appliedObjective,
            statutParticipation: personneId ? null : null,
            motif: null,
            cibleSuivieId: null,
            prExerciseGroupKey: groupKey,
            sessionLabels: groupEvents.map((row) => prSessionLabel(row)).filter(Boolean)
          });
          continue;
        }
      }
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
        else if(classified.reason === 'personne_non_nominatif' || classified.reason === 'personne_hors_attendus' || classified.reason === 'session_sans_statut_valable'){
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
        eventCountContribution: classified.catchupOnlyTrace ? 0 : 1,
        appliedObjective,
        statutParticipation: part ? part.statut : null,
        motif: part && part.motif_absence ? part.motif_absence : null,
        cibleSuivieId: part && (part.cible_suivie_id || part.cibleSuivieId) ? (part.cible_suivie_id || part.cibleSuivieId) : null,
        prExerciseGroupKey: multiSessionGroupKey(event) || null
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
    const cibleId = looksLikeUuid(resolved.cibleId) ? resolved.cibleId : (looksLikeUuid(resolved.cible) ? resolved.cible : null);
    const grain = inferAnalysisGrain(resolved);
    const objectives = typeof repo.listObjectifs === 'function'
      ? await repo.listObjectifs({ actif: true })
      : [];
    const bundle = await loadBundle({
      from: period.from,
      to: period.to,
      domaineCode: resolved.domaineCode || resolved.domaine || null,
      cibleId,
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
      const fulfilledPermutationPersonIds = fulfilledPermutationPersonIdsForEvent(bundle, event);
      for(const attendu of filterEligibleAttendus(attendus, bundle, event.date)){
        if(attendu.inclus === false) continue;
        if(isPermutationCatchupAttendu(attendu)) continue;
        const pid = String(attendu.personne_id || attendu.personneId);
        const part = byPid.get(pid);
        const official = officialFromTaux(computeTaux(part ? [part] : [], [attendu], { fulfilledPermutationPersonIds }));
        const row = acc.get(pid) || {
          numerator: 0,
          denominator: 0,
          eventCount: 0,
          volumes: emptyVolumes(),
          applied: []
        };
        row.numerator += Number(official.numerator || 0);
        row.denominator += Number(official.denominator || 0);
        row.volumes = addVolumes(row.volumes, official.volumes);
        row.eventCount += 1;
        row.applied.push(resolveEventObjective(
          {
            date: event.date,
            domaine_code: event.domaine_code,
            cible_ids: bundle.cibleIdsByEvent[event.evenement_id] || event.cible_ids || []
          },
          { objectives, grain, queryCibleId: cibleId }
        ));
        acc.set(pid, row);
      }
    }
    const rates = {};
    for(const [pid, row] of acc.entries()){
      const context = collectObjectiveContext(row.applied);
      const objective = context.objective;
      const gap = gapPct(safePercentage(row.numerator, row.denominator), objective);
      const status = analyticStatus(safePercentage(row.numerator, row.denominator), objective, { vigilanceMarginPct: null });
      rates[pid] = {
        numerator: row.numerator,
        denominator: row.denominator,
        percentage: safePercentage(row.numerator, row.denominator),
        eventCount: row.eventCount,
        volumes: row.volumes,
        objective,
        gapPct: gap,
        analyticStatus: status.status,
        analyticStatusReason: status.reason,
        objectiveContext: {
          homogeneous: context.homogeneous,
          distinctObjectives: context.distinctObjectives,
          reason: context.reason
        }
      };
    }
    return { period, rates };
  }

  return { summary, explain, timeseries, evaluate, snapshot, directoryRates };
}

module.exports = { createScopeAnalyticsService };
