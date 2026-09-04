const { STATUT_PERMUTATION } = require('./_scope-model');
const { getEncadrementContribution, round1 } = require('./_scope-rules');

const ROLES_CYCLE = new Set(['PARTICIPANT', 'FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
const STATUTS_PRESENTS = new Set(['PRESENT', STATUT_PERMUTATION]);
const STATUTS_ABSENCE = new Set(['ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE']);
const SESSION_COUNTING_ROLES = new Set(['PARTICIPANT', 'FORMATEUR', 'SURVEILLANT']);
const STATUTS_PR_EXERCISE_RECONNUS = new Set(['PRESENT', STATUT_PERMUTATION, 'DISPENSE']);
const STATUTS_SESSION_VALIDES = new Set(['PRESENT', STATUT_PERMUTATION, 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE']);
const STATUTS_EVENT_EXIGIBLES = new Set(['PLANIFIE', 'REPORTE', 'REALISE']);
const MOTIF_DISPENSE_LABELS = Object.freeze({
  JOKER: 'Joker',
  FORMATEUR_PR: 'Formateur PR',
  FORMATION_HORS_SDIS: 'Formation hors SDIS',
  PAS_CONCERNE: 'Pas concerné',
  DEMISSION_EN_COURS: 'Démission en cours'
});
const MOTIF_EXCUSE_LABELS = Object.freeze({
  PRIVE: 'Privé',
  PROFESSIONNEL: 'Professionnel',
  ARMEE: 'Armée',
  ACCIDENT_MALADIE: 'Accident/Maladie',
  ACTIVITE_SCOLAIRE: 'Activité scolaire',
  ACTIVITE_EXTRA_SCOLAIRE: 'Activité extra-scolaire',
  NON_JUSTIFIE: 'Non justifié'
});

function normalizeText(value){
  return String(value || '').trim();
}

function normalizeUpper(value){
  return normalizeText(value).toUpperCase();
}

function normalizeDomain(value){
  const code = normalizeUpper(value);
  return code === 'PAPR' ? 'PR' : code;
}

function personneId(row){
  return normalizeText(row && (row.personne_id || row.personneId || row.id));
}

function eventId(row){
  return normalizeText(row && (row.evenement_id || row.evenementId || row.eventId || row.id));
}

function cycleId(row){
  return normalizeText(row && (row.cycle_id || row.cycleId));
}

function personneLookup(personnes){
  if(personnes instanceof Map) return personnes;
  if(Array.isArray(personnes)) return new Map(personnes.map((p) => [personneId(p), p]));
  return new Map(Object.entries(personnes || {}).map(([id, p]) => [String(id), p]));
}

function dedupeKey(row, personnesById){
  const id = personneId(row);
  const person = personnesById.get(id) || {};
  const nip = normalizeText(row && row.nip) || normalizeText(person.nip);
  return nip ? `NIP:${nip}` : (id ? `ID:${id}` : '');
}

function addPerson(set, row, personnesById){
  const key = dedupeKey(row, personnesById);
  if(key) set.add(key);
  return key;
}

function isSessionCountingParticipation(row, personnesById, population){
  const role = normalizeUpper(row && row.role || 'PARTICIPANT');
  const statut = normalizeUpper(row && row.statut || 'NON_RENSEIGNE');
  const source = normalizeUpper(row && row.source);
  if(!SESSION_COUNTING_ROLES.has(role)) return false;
  if(role === 'PARTICIPANT') return STATUTS_PR_EXERCISE_RECONNUS.has(statut);
  if(!STATUTS_PRESENTS.has(statut)) return false;
  const key = dedupeKey(row, personnesById);
  if(!key || !population.has(key)) return false;
  if(role === 'SURVEILLANT') return source === 'SAISIE';
  return true;
}

function sortedValues(set){
  return [...set].sort();
}

function classifyPrGlobalSessionStatut(statuts){
  const set = statuts instanceof Set ? statuts : new Set(statuts || []);
  if(set.has('PRESENT') || set.has(STATUT_PERMUTATION)) return 'PRESENT';
  if(set.has('DISPENSE')) return 'DISPENSE';
  if(set.has('ABSENT_EXCUSE')) return 'ABSENT_EXCUSE';
  if(set.has('ABSENT_NON_EXCUSE')) return 'ABSENT_NON_EXCUSE';
  return null;
}

function cycleTechnicalIdentity(input = {}){
  return {
    cycleId: normalizeText(input.cycle_id || input.cycleId),
    cycleKey: normalizeText(input.cycle_key || input.cycleKey)
  };
}

function sameTechnicalCycle(a, b){
  const left = cycleTechnicalIdentity(a);
  const right = cycleTechnicalIdentity(b);
  if(left.cycleId && right.cycleId) return left.cycleId === right.cycleId;
  if(left.cycleKey && right.cycleKey) return left.cycleKey === right.cycleKey;
  return false;
}

function buildCycleProposal(input = {}){
  return {
    domaine: normalizeDomain(input.domaine_code || input.domaineCode || input.domaine),
    annee: Number(input.annee || input.year || 0) || null,
    typeCycle: normalizeUpper(input.type_cycle || input.typeCycle || input.type_session || input.typeSession),
    statCom: normalizeText(input.stat_com || input.statCom),
    qui: normalizeText(input.qui),
    familleLibelle: normalizeText(input.famille_libelle || input.familleLibelle || input.libelle_normalise || input.libelleNormalise),
    dateDebut: normalizeText(input.date_debut || input.dateDebut),
    dateFin: normalizeText(input.date_fin || input.dateFin)
  };
}

function proposeCycleLink(rows = []){
  const proposals = rows.map(buildCycleProposal);
  if(proposals.length < 2){
    return { action: 'REVIEW_REQUIRED', automatic: false, evidence: [], reason: 'Un cycle alternatif exige plusieurs événements candidats.' };
  }
  const first = proposals[0];
  const evidence = [];
  if(first.domaine && proposals.every((p) => p.domaine === first.domaine)) evidence.push('DOMAINE');
  if(first.statCom && proposals.every((p) => p.statCom === first.statCom)) evidence.push('STAT.COM');
  if(first.qui && proposals.every((p) => p.qui === first.qui)) evidence.push('QUI');
  if(first.familleLibelle && proposals.every((p) => p.familleLibelle === first.familleLibelle)) evidence.push('FAMILLE_LIBELLE');
  if(first.annee && proposals.every((p) => p.annee === first.annee)) evidence.push('ANNEE');
  const strong = ['DOMAINE', 'STAT.COM', 'QUI', 'FAMILLE_LIBELLE'].every((name) => evidence.includes(name));
  return {
    action: strong ? 'PROPOSED_MATCH' : 'REVIEW_REQUIRED',
    automatic: false,
    evidence,
    reason: strong
      ? 'Indices suffisants pour proposer un cycle; le rattachement reste explicite.'
      : 'Indices insuffisants ou ambigus; aucun rattachement automatique.'
  };
}

function roleCycle(row){
  return normalizeUpper(row && (row.role_cycle || row.roleCycle || row.role_session || row.roleSession || row.role || 'PARTICIPANT'));
}

function statutCycle(row){
  return normalizeUpper(row && (row.statut_cycle || row.statutCycle || row.statut_session || row.statutSession || row.statut || 'ACTIF'));
}

function assignedEventId(row){
  return normalizeText(row && (row.session_event_id || row.sessionEventId || row.assigned_event_id || row.assignedEventId));
}

function participatedEventId(row){
  return normalizeText(row && (row.participated_event_id || row.participatedEventId || row.session_participee_id || row.sessionParticipeeId));
}

function eventBelongsToCycle(event, cycle){
  const id = cycleId(cycle);
  return !id || cycleId(event) === id;
}

function cycleEvents(input, cycle){
  return (input.evenements || input.events || []).filter((event) => eventBelongsToCycle(event, cycle));
}

function eventStatut(row){
  return normalizeUpper(row && row.statut);
}

function eventContributionState(event){
  const statut = eventStatut(event) || 'PLANIFIE';
  const id = eventId(event);
  const countable = statut === 'REALISE';
  const exigible = STATUTS_EVENT_EXIGIBLES.has(statut);
  return {
    eventId: id || null,
    statut,
    exigible,
    countable,
    contributesToStatistics: countable,
    contributesToCycleCompletion: exigible,
    reason: statut === 'ANNULE'
      ? 'EVENEMENT_ANNULE_NON_EXIGIBLE'
      : (countable ? 'EVENEMENT_REALISE_COMPTABILISABLE' : 'EVENEMENT_NON_REALISE_NON_COMPTABILISABLE')
  };
}

function isEventStatisticallyCountable(event){
  return eventContributionState(event).countable;
}

function isEventCycleExigible(event){
  return eventContributionState(event).exigible;
}

function resolveCycleCompletion(input = {}){
  const cycle = input.cycle || {};
  const events = cycleEvents(input, cycle);
  const contributions = events.map(eventContributionState);
  const exigibles = contributions.filter((row) => row.exigible);
  const realised = exigibles.filter((row) => row.countable);
  const planned = exigibles.filter((row) => row.statut === 'PLANIFIE');
  const postponed = exigibles.filter((row) => row.statut === 'REPORTE');
  const cancelled = contributions.filter((row) => row.statut === 'ANNULE');
  const complete = exigibles.length > 0 && realised.length === exigibles.length;
  return {
    cycleId: cycleId(cycle) || null,
    eventCount: events.length,
    exigibleCount: exigibles.length,
    realisedCount: realised.length,
    cancelledCount: cancelled.length,
    plannedCount: planned.length,
    postponedCount: postponed.length,
    complete,
    statut: complete ? 'COMPLET' : 'INCOMPLET',
    events: contributions
  };
}

function mapEventCounts(events){
  const counts = {};
  for(const event of events){
    if(!isEventCycleExigible(event)) continue;
    const id = eventId(event);
    if(id) counts[id] = { eventId: id, codeCours: event.code_cours || event.codeCours || null, date: event.date || null, population: 0, presents: 0 };
  }
  return counts;
}

function prExerciseGroupKey(event){
  const explicit = normalizeText(event && (event.pr_exercise_group_key || event.prExerciseGroupKey));
  if(explicit) return explicit;
  const cyclePart = cycleId(event) || 'NO_CYCLE';
  const libelle = normalizeText(event && (event.libelle || event.label));
  const match = libelle.match(/exercice\s+pr\s+([0-9]+)(?:\.[0-9]+)?/i);
  return match ? `${cyclePart}:PR:${match[1]}` : '';
}

function reportingYearPeriodForEvent(event){
  const date = normalizeText(event && event.date).slice(0, 10);
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? { from: `${year}-01-01`, to: `${year}-12-31`, preset: 'YEAR' } : null;
}

function normalizeReportingPeriod(period, current){
  if(period && period.from && period.to){
    return { from: normalizeText(period.from).slice(0, 10), to: normalizeText(period.to).slice(0, 10), preset: period.preset || 'CUSTOM' };
  }
  return reportingYearPeriodForEvent(current);
}

function eventInReportingPeriod(event, period){
  if(!period || !period.from || !period.to) return true;
  const date = normalizeText(event && event.date).slice(0, 10);
  return Boolean(date && date >= period.from && date <= period.to);
}

function resolveSessionReportingScope(input = {}){
  const events = input.evenements || input.events || [];
  const currentId = normalizeText(input.currentEventId || input.current_event_id);
  const current = events.find((event) => eventId(event) === currentId) || input.currentEvent || input.current_event || {};
  const groupKey = prExerciseGroupKey(current);
  const currentCycleId = cycleId(current);
  const period = normalizeReportingPeriod(input.reportingPeriod || input.period, current);
  let scoped = groupKey
    ? events.filter((event) => prExerciseGroupKey(event) === groupKey)
    : (currentCycleId ? events.filter((event) => cycleId(event) === currentCycleId) : events.filter((event) => eventId(event) === eventId(current)));
  if(currentCycleId) scoped = scoped.filter((event) => cycleId(event) === currentCycleId);
  scoped = scoped.filter((event) => eventInReportingPeriod(event, period));
  return {
    current,
    groupKey,
    cycleId: currentCycleId || null,
    period,
    events: sortSessionEvents(scoped)
  };
}

function prSessionKey(event){
  const explicit = normalizeText(event && (event.pr_session_key || event.prSessionKey));
  if(explicit) return explicit;
  const cyclePart = cycleId(event) || 'NO_CYCLE';
  const libelle = normalizeText(event && (event.libelle || event.label));
  const match = libelle.match(/exercice\s+pr\s+([0-9]+\.[0-9]+)/i);
  return match ? `${cyclePart}:PR:${match[1]}` : '';
}

function prSessionLabel(event){
  const explicit = normalizeText(event && (event.pr_session_label || event.prSessionLabel));
  if(explicit) return explicit;
  const libelle = normalizeText(event && (event.libelle || event.label));
  const match = libelle.match(/exercice\s+pr\s+([0-9]+\.[0-9]+)/i);
  if(match) return match[1];
  const key = prSessionKey(event);
  const keyMatch = key.match(/PR:([0-9]+\.[0-9]+)$/);
  return keyMatch ? keyMatch[1] : normalizeText(event && (event.code_cours || event.codeCours)) || normalizeText(eventId(event));
}

function parseSessionOrder(event){
  const label = prSessionLabel(event);
  const m = String(label || '').match(/^(\d+)(?:\.(\d+))?$/);
  if(!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, String(event && event.date || ''), String(event && (event.libelle || ''))];
  return [Number(m[1]), m[2] == null ? 0 : Number(m[2]), String(event && event.date || ''), String(event && (event.libelle || ''))];
}

function sortSessionEvents(events){
  return (events || []).slice().sort((a, b) => {
    const left = parseSessionOrder(a);
    const right = parseSessionOrder(b);
    for(let i = 0; i < left.length; i += 1){
      if(left[i] < right[i]) return -1;
      if(left[i] > right[i]) return 1;
    }
    return 0;
  });
}

function sessionExerciseLabel(events, groupKey){
  const first = (events && events[0]) || {};
  const libelle = normalizeText(first.libelle || first.label);
  const pr = libelle.match(/exercice\s+pr\s+(\d+)/i);
  if(pr) return `PR ${pr[1]}`;
  const trimmed = libelle.replace(/\s*\|.*$/, '').trim();
  if(trimmed) return trimmed;
  const key = normalizeText(groupKey);
  const keyMatch = key.match(/PR:(\d+)/);
  if(keyMatch) return `PR ${keyMatch[1]}`;
  return trimmed || 'session';
}

function personDisplayName(person){
  return [normalizeText(person && person.prenom), normalizeText(person && person.nom)].filter(Boolean).join(' ') || 'Cette personne';
}

function motifExcuseLabel(code){
  const key = normalizeUpper(code);
  return MOTIF_EXCUSE_LABELS[key] || normalizeText(code);
}

function motifDispenseLabel(code){
  const key = normalizeUpper(code);
  return MOTIF_DISPENSE_LABELS[key] || normalizeText(code);
}

function prExerciseEvents(input = {}){
  const events = input.evenements || input.events || [];
  const currentId = normalizeText(input.currentEventId || input.current_event_id);
  const current = events.find((event) => eventId(event) === currentId) || input.currentEvent || input.current_event || {};
  const groupKey = prExerciseGroupKey(current);
  if(!groupKey){
    return { current, groupKey: '', events: currentId ? events.filter((event) => eventId(event) === currentId) : [] };
  }
  return resolveSessionReportingScope(input);
}

function computeCycleMetrics(input = {}){
  const cycle = input.cycle || {};
  const domaine = normalizeDomain(cycle.domaine_code || cycle.domaineCode || input.domaine || input.domaineCode);
  const personnesById = personneLookup(input.personnes);
  const events = cycleEvents(input, cycle);
  const completion = resolveCycleCompletion({ cycle, evenements: events });
  const countableEventIds = new Set(completion.events.filter((row) => row.contributesToStatistics).map((row) => row.eventId).filter(Boolean));
  const cycleEventIds = new Set(events.map(eventId).filter(Boolean));
  const population = new Set();
  const participantsReconnus = new Set();
  const nonRenseignes = new Set();
  const absencesQualifiees = new Set();
  const formateurs = new Set();
  const moniteurs = new Set();
  const surveillants = new Set();
  const auxiliaires = new Set();
  const dispensesInternes = new Set();
  const assignedByPerson = new Map();
  const participatedByPerson = new Map();
  const sessionCounts = mapEventCounts(events);

  for(const row of input.cyclePersonnes || input.cycle_personnes || []){
    if(cycleId(row) && cycleId(cycle) && cycleId(row) !== cycleId(cycle)) continue;
    const role = roleCycle(row);
    if(!ROLES_CYCLE.has(role)) continue;
    const status = statutCycle(row);
    if(status === 'EXCLU') continue;
    const key = addPerson(new Set(), row, personnesById);
    if(!key) continue;
    if(role === 'PARTICIPANT'){
      population.add(key);
      if(status === 'NON_RENSEIGNE') nonRenseignes.add(key);
      const assigned = assignedEventId(row);
      if(assigned) assignedByPerson.set(key, assigned);
      const participated = participatedEventId(row);
      if(participated) participatedByPerson.set(key, participated);
      if(normalizeUpper(row.exception_type || row.exceptionType) === 'DISPENSE_EXERCICE_INTERNE') dispensesInternes.add(key);
      if(assigned && sessionCounts[assigned]) sessionCounts[assigned].population += 1;
    } else if(role === 'FORMATEUR') formateurs.add(key);
    else if(role === 'MONITEUR') moniteurs.add(key);
    else if(role === 'SURVEILLANT') surveillants.add(key);
    else if(role === 'AUXILIAIRE') auxiliaires.add(key);
  }

  for(const participation of input.participations || []){
    const eid = eventId(participation);
    if(!cycleEventIds.has(eid) || !countableEventIds.has(eid)) continue;
    const role = normalizeUpper(participation.role || 'PARTICIPANT');
    const statut = normalizeUpper(participation.statut || 'NON_RENSEIGNE');
    const key = addPerson(new Set(), participation, personnesById);
    if(!key) continue;
    if(role === 'FORMATEUR') formateurs.add(key);
    else if(role === 'MONITEUR') moniteurs.add(key);
    else if(role === 'SURVEILLANT') surveillants.add(key);
    else if(role === 'AUXILIAIRE') auxiliaires.add(key);
    if(isSessionCountingParticipation(participation, personnesById, population)){
      population.add(key);
      participantsReconnus.add(key);
      participatedByPerson.set(key, eid);
      if(sessionCounts[eid]) sessionCounts[eid].presents += 1;
    } else if(role === 'PARTICIPANT' && statut === 'NON_RENSEIGNE'){
      nonRenseignes.add(key);
    } else if(role === 'PARTICIPANT' && STATUTS_ABSENCE.has(statut) && assignedByPerson.get(key) === eid){
      absencesQualifiees.add(key);
    }
  }

  const effectif = new Set([...participantsReconnus]);
  for(const key of formateurs){
    const contribution = getEncadrementContribution({ domaine, role: 'FORMATEUR', contexte: { type: 'SESSION' } });
    if(contribution.countsEffectifConsolideSession && population.has(key)) effectif.add(key);
  }

  const denominator = population.size;
  return {
    populationDistincte: population.size,
    participantsReconnusDistincts: participantsReconnus.size,
    nonRenseignesDistincts: nonRenseignes.size,
    formateursDistincts: formateurs.size,
    moniteursDistincts: moniteurs.size,
    surveillantsDistincts: surveillants.size,
    auxiliairesDistincts: auxiliaires.size,
    absencesQualifieesDistinctes: absencesQualifiees.size,
    dispensesInternesDistinctes: dispensesInternes.size,
    effectifEngageCycle: effectif.size,
    tauxParticipationCycle: {
      officiel: false,
      readyForOfficialContract: true,
      numerator: participantsReconnus.size,
      denominator,
      percentage: denominator === 0 ? null : round1((100 * participantsReconnus.size) / denominator),
      contrat: domaine === 'PR' ? 'CYCLE_PAPR_ALTERNATIF_PREPARED' : 'CYCLE_ALTERNATIF_PREPARED'
    },
    sessionCounts: Object.values(sessionCounts),
    completion,
    distributionSessions: [...assignedByPerson.entries()].map(([personKey, assignedEventIdValue]) => ({
      personKey,
      assignedEventId: assignedEventIdValue,
      participatedEventId: participatedByPerson.get(personKey) || null
    })).sort((a, b) => a.personKey.localeCompare(b.personKey)),
    details: {
      population: sortedValues(population),
      participantsReconnus: sortedValues(participantsReconnus),
      nonRenseignes: sortedValues(nonRenseignes),
      formateurs: sortedValues(formateurs),
      moniteurs: sortedValues(moniteurs),
      surveillants: sortedValues(surveillants),
      auxiliaires: sortedValues(auxiliaires),
      absencesQualifiees: sortedValues(absencesQualifiees),
      dispensesInternes: sortedValues(dispensesInternes),
      effectifEngageCycle: sortedValues(effectif)
    }
  };
}

function computePrExerciseParticipationState(input = {}){
  const cycle = input.cycle || {};
  const personnesById = personneLookup(input.personnes);
  const allEvents = cycleEvents(input, cycle);
  const group = prExerciseEvents({ ...input, evenements: allEvents });
  const events = group.events.filter(isEventCycleExigible);
  const groupEventIds = new Set(events.map(eventId).filter(Boolean));
  const currentEventId = normalizeText(input.currentEventId || input.current_event_id);
  const eventOrder = new Map(events.map((event, index) => [eventId(event), index]));
  const eventsById = new Map(events.map((event) => [eventId(event), event]));
  const currentOrder = currentEventId && eventOrder.has(currentEventId) ? eventOrder.get(currentEventId) : null;
  const population = new Set();
  const countedByPerson = new Map();
  const attendusByPerson = new Map();
  const validByPerson = new Map();
  const validRowsByPerson = new Map();
  const currentValidKeys = new Set();

  for(const attendu of input.attendus || input.expected || []){
    if(attendu && attendu.inclus === false) continue;
    const eid = eventId(attendu);
    if(eid && groupEventIds.size && !groupEventIds.has(eid)) continue;
    const key = addPerson(new Set(), attendu, personnesById);
    if(!key) continue;
    population.add(key);
    attendusByPerson.set(key, personneId(attendu));
  }

  for(const row of input.cyclePersonnes || input.cycle_personnes || []){
    if(cycleId(row) && cycleId(cycle) && cycleId(row) !== cycleId(cycle)) continue;
    if(roleCycle(row) !== 'PARTICIPANT' || statutCycle(row) === 'EXCLU') continue;
    const key = addPerson(new Set(), row, personnesById);
    if(key) population.add(key);
  }

  for(const participation of input.participations || []){
    const eid = eventId(participation);
    if(!groupEventIds.has(eid)) continue;
    const key = dedupeKey(participation, personnesById);
    if(!key) continue;
    if(isValidSessionDecision(participation)){
      const statut = normalizeUpper(participation.statut);
      const set = validByPerson.get(key) || new Set();
      set.add(statut);
      validByPerson.set(key, set);
      const rows = validRowsByPerson.get(key) || [];
      rows.push({
        eventId: eid,
        personneId: personneId(participation),
        role: normalizeUpper(participation.role || 'PARTICIPANT'),
        statut,
        source: normalizeUpper(participation.source),
        motif: normalizeUpper(participation.motif_absence || participation.motifAbsence || participation.motif)
      });
      validRowsByPerson.set(key, rows);
      if(currentEventId && eid === currentEventId) currentValidKeys.add(key);
    }
    if(!isSessionCountingParticipation(participation, personnesById, population)) continue;
    const rows = countedByPerson.get(key) || [];
    rows.push({
      eventId: eid,
      personneId: personneId(participation),
      role: normalizeUpper(participation.role || 'PARTICIPANT'),
      statut: normalizeUpper(participation.statut || 'NON_RENSEIGNE'),
      source: normalizeUpper(participation.source),
      motif: normalizeUpper(participation.motif_absence || participation.motifAbsence || participation.motif)
    });
    countedByPerson.set(key, rows);
  }

  const byPersonneId = {};
  const countedKeys = new Set(countedByPerson.keys());
  const presentKeys = new Set();
  const dispenseKeys = new Set();
  const excuseKeys = new Set();
  const absentKeys = new Set();
  for(const [key, statuts] of validByPerson.entries()){
    const decision = classifyPrGlobalSessionStatut(statuts);
    if(decision === 'PRESENT') presentKeys.add(key);
    else if(decision === 'DISPENSE') dispenseKeys.add(key);
    else if(decision === 'ABSENT_EXCUSE') excuseKeys.add(key);
    else if(decision === 'ABSENT_NON_EXCUSE') absentKeys.add(key);
  }
  for(const [key, rows] of countedByPerson.entries()){
    rows.sort((a, b) => (eventOrder.get(a.eventId) ?? 9999) - (eventOrder.get(b.eventId) ?? 9999));
    const outsideCurrent = currentEventId
      ? rows.filter((row) => row.eventId !== currentEventId)
      : rows;
    if(!outsideCurrent.length) continue;
    if(currentValidKeys.has(key)) continue;
    const reference = outsideCurrent[0] || rows[0] || {};
    const referenceOrder = eventOrder.get(reference.eventId);
    const referenceEvent = eventsById.get(reference.eventId) || {};
    const relation = currentOrder != null && referenceOrder != null && currentOrder < referenceOrder
      ? 'BEFORE_REFERENCE'
      : 'AFTER_REFERENCE';
    const formateurSessionLabels = rows
      .filter((row) => row.role === 'FORMATEUR')
      .map((row) => prSessionLabel(eventsById.get(row.eventId) || { evenement_id: row.eventId }));
    for(const person of personnesById.values()){
      const id = personneId(person);
      if(!id || dedupeKey(person, personnesById) !== key) continue;
      const exerciseLabel = sessionExerciseLabel(events, group.groupKey);
      const motif = normalizeUpper(reference.motif || '');
      byPersonneId[id] = {
        alreadyCountedInSession: true,
        countedEventId: reference.eventId,
        countedRole: reference.role,
        countedStatut: reference.statut,
        countedSource: reference.source,
        countedMotif: motif || null,
        referenceEventId: reference.eventId,
        referenceSessionLabel: prSessionLabel(referenceEvent),
        referenceEventLabel: referenceEvent.libelle || '',
        referenceEventDate: referenceEvent.date || '',
        referenceQuality: reference.role === 'FORMATEUR' ? 'Formateur PR' : 'PAPR',
        referenceRelation: relation,
        formateurSessionLabels,
        sessionDispense: false,
        sessionExcuse: false,
        sessionExerciseLabel: exerciseLabel,
        sessionMessage: '',
        sessionSummary: '',
        sessionHasValidStatus: true
      };
    }
  }

  const excuseByPerson = new Map();
  for(const participation of input.participations || []){
    const eid = eventId(participation);
    if(!groupEventIds.has(eid)) continue;
    if(normalizeUpper(participation.statut) !== 'ABSENT_EXCUSE') continue;
    const key = dedupeKey(participation, personnesById);
    if(!key) continue;
    const rows = excuseByPerson.get(key) || [];
    rows.push({
      eventId: eid,
      personneId: personneId(participation),
      motif: normalizeUpper(participation.motif_absence || participation.motifAbsence || participation.motif),
      statut: 'ABSENT_EXCUSE'
    });
    excuseByPerson.set(key, rows);
  }
  for(const [key, rows] of excuseByPerson.entries()){
    rows.sort((a, b) => (eventOrder.get(a.eventId) ?? 9999) - (eventOrder.get(b.eventId) ?? 9999));
    const outsideCurrent = currentEventId ? rows.filter((row) => row.eventId !== currentEventId) : rows;
    if(!outsideCurrent.length) continue;
    if(currentValidKeys.has(key)) continue;
    const reference = outsideCurrent[0] || rows[0] || {};
    const referenceEvent = eventsById.get(reference.eventId) || {};
    const exerciseLabel = sessionExerciseLabel(events, group.groupKey);
    const referenceOrder = eventOrder.get(reference.eventId);
    const relation = currentOrder != null && referenceOrder != null && currentOrder < referenceOrder
      ? 'BEFORE_REFERENCE'
      : 'AFTER_REFERENCE';
    for(const person of personnesById.values()){
      const id = personneId(person);
      if(!id || dedupeKey(person, personnesById) !== key) continue;
      if(byPersonneId[id] && !byPersonneId[id].sessionExcuse) continue;
      byPersonneId[id] = {
        alreadyCountedInSession: true,
        countedEventId: reference.eventId,
        countedRole: 'PARTICIPANT',
        countedStatut: 'ABSENT_EXCUSE',
        countedSource: 'SAISIE',
        countedMotif: reference.motif || null,
        referenceEventId: reference.eventId,
        referenceSessionLabel: prSessionLabel(referenceEvent),
        referenceEventLabel: referenceEvent.libelle || '',
        referenceEventDate: referenceEvent.date || '',
        referenceQuality: 'PAPR',
        referenceRelation: relation,
        formateurSessionLabels: [],
        sessionDispense: false,
        sessionExcuse: false,
        sessionExerciseLabel: exerciseLabel,
        sessionMessage: '',
        sessionSummary: '',
        sessionHasValidStatus: true
      };
    }
  }

  for(const [key, rows] of validRowsByPerson.entries()){
    const outsideCurrent = currentEventId ? rows.filter((row) => row.eventId !== currentEventId) : rows;
    if(!outsideCurrent.length) continue;
    if(currentValidKeys.has(key)) continue;
    outsideCurrent.sort((a, b) => (eventOrder.get(a.eventId) ?? 9999) - (eventOrder.get(b.eventId) ?? 9999));
    const reference = outsideCurrent[0] || {};
    const referenceEvent = eventsById.get(reference.eventId) || {};
    const exerciseLabel = sessionExerciseLabel(events, group.groupKey);
    const referenceOrder = eventOrder.get(reference.eventId);
    const relation = currentOrder != null && referenceOrder != null && currentOrder < referenceOrder
      ? 'BEFORE_REFERENCE'
      : 'AFTER_REFERENCE';
    for(const person of personnesById.values()){
      const id = personneId(person);
      if(!id || dedupeKey(person, personnesById) !== key) continue;
      if(byPersonneId[id]) continue;
      byPersonneId[id] = {
        alreadyCountedInSession: true,
        countedEventId: reference.eventId,
        countedRole: reference.role,
        countedStatut: reference.statut,
        countedSource: reference.source,
        countedMotif: reference.motif || null,
        referenceEventId: reference.eventId,
        referenceSessionLabel: prSessionLabel(referenceEvent),
        referenceEventLabel: referenceEvent.libelle || '',
        referenceEventDate: referenceEvent.date || '',
        referenceQuality: reference.role === 'FORMATEUR' ? 'Formateur PR' : 'PAPR',
        referenceRelation: relation,
        formateurSessionLabels: [],
        sessionDispense: false,
        sessionExcuse: false,
        sessionExerciseLabel: exerciseLabel,
        sessionMessage: '',
        sessionSummary: '',
        sessionHasValidStatus: true
      };
    }
  }

  const unfilledKeys = [...population].filter((key) => !validByPerson.has(key));
  const unfilledPeople = [];
  const seenUnfilled = new Set();
  const personByKey = new Map();
  for(const person of personnesById.values()){
    const key = dedupeKey(person, personnesById);
    if(key && !personByKey.has(key)) personByKey.set(key, person);
    const id = personneId(person);
    if(!id) continue;
    if(validByPerson.has(key)){
      if(!byPersonneId[id]){
        byPersonneId[id] = {
          alreadyCountedInSession: false,
          sessionExcuse: false,
          sessionDispense: false,
          sessionMessage: '',
          sessionSummary: '',
          sessionExerciseLabel: sessionExerciseLabel(events, group.groupKey),
          sessionHasValidStatus: true
        };
      } else {
        byPersonneId[id].sessionHasValidStatus = true;
      }
    }
  }
  for(const key of unfilledKeys){
    if(seenUnfilled.has(key)) continue;
    seenUnfilled.add(key);
    const person = personByKey.get(key);
    unfilledPeople.push({
      personneId: person ? personneId(person) : (attendusByPerson.get(key) || ''),
      grade: (person && person.grade) || '',
      nom: (person && person.nom) || '',
      prenom: (person && person.prenom) || '',
      nip: (person && person.nip) || (String(key).startsWith('NIP:') ? key.slice(4) : '')
    });
  }
  const lastEventId = events.length ? eventId(events[events.length - 1]) : '';
  const allSessionsClosed = events.length > 0 && events.every((event) => normalizeUpper(event && event.statut) === 'REALISE');
  const resolvedKeys = new Set([...countedKeys, ...excuseKeys, ...validByPerson.keys()]);
  const coverageBalanced = population.size === validByPerson.size + unfilledKeys.length;

  return {
    groupKey: group.groupKey || null,
    sessionKey: prSessionKey(group.current) || null,
    eventIds: [...groupEventIds],
    isMultiSession: events.length > 1,
    isLastSession: Boolean(currentEventId && lastEventId && currentEventId === lastEventId),
    allSessionsClosed,
    sessionExerciseLabel: sessionExerciseLabel(events, group.groupKey),
    unfilledPeople,
    byPersonneId,
    kpis: {
      population: population.size,
      presents: presentKeys.size,
      dispenses: dispenseKeys.size,
      excuses: excuseKeys.size,
      absents: absentKeys.size,
      open: Math.max(0, population.size - resolvedKeys.size)
    },
    details: {
      population: sortedValues(population),
      counted: sortedValues(countedKeys),
      presents: sortedValues(presentKeys),
      dispenses: sortedValues(dispenseKeys),
      excuses: sortedValues(excuseKeys),
      absents: sortedValues(absentKeys),
      open: sortedValues(new Set(unfilledKeys)),
      validSession: sortedValues(validByPerson),
      coverageBalanced,
      attendusByPerson: Object.fromEntries(attendusByPerson.entries())
    },
    coverage: {
      population: population.size,
      covered: validByPerson.size,
      unfilled: unfilledKeys.length,
      balanced: coverageBalanced
    }
  };
}

function computeSessionParticipationState(input = {}){
  const cycle = input.cycle || {};
  const events = cycleEvents(input, cycle);
  const currentId = normalizeText(input.currentEventId || input.current_event_id);
  const current = events.find((event) => eventId(event) === currentId) || input.currentEvent || input.current_event || {};
  if(prExerciseGroupKey(current)) return computePrExerciseParticipationState(input);
  const legacyEvents = events.map((event) => ({ ...event, pr_exercise_group_key: '__LEGACY_CYCLE_SCOPE__' }));
  return computePrExerciseParticipationState({
    ...input,
    evenements: legacyEvents,
    currentEvent: currentId ? null : { ...current, pr_exercise_group_key: '__LEGACY_CYCLE_SCOPE__' }
  });
}

function computeStandardEventMetricsUnchanged(input = {}){
  const event = input.evenement || input.event || {};
  return {
    standard: !cycleId(event),
    cycleId: cycleId(event) || null
  };
}

function isValidSessionStatut(statut){
  return STATUTS_SESSION_VALIDES.has(normalizeUpper(statut));
}

function isValidSessionDecision(participation){
  const role = normalizeUpper(participation && participation.role || 'PARTICIPANT');
  const statut = normalizeUpper(participation && participation.statut);
  const source = normalizeUpper(participation && participation.source);
  if(!STATUTS_SESSION_VALIDES.has(statut)) return false;
  if(role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
  if(role === 'SURVEILLANT' && source !== 'SAISIE') return false;
  return true;
}

function canCloseLastSession(state){
  if(!state || !state.isMultiSession || !state.isLastSession) return true;
  return (state.unfilledPeople || []).length === 0;
}

function personHasValidStatusInSession(input = {}){
  const state = computePrExerciseParticipationState(input);
  const id = personneId({ personne_id: input.personneId || input.personne_id });
  if(id && state.byPersonneId[id] && state.byPersonneId[id].sessionHasValidStatus) return true;
  const personnesById = personneLookup(input.personnes);
  const key = dedupeKey({ personne_id: id }, personnesById);
  return Boolean(key && (state.details.validSession || []).includes(key));
}

function collapsePersonSessionHistory(rows){
  const groups = new Map();
  const singles = [];
  for(const row of rows || []){
    const key = normalizeText(row && (row.prExerciseGroupKey || row.pr_exercise_group_key));
    if(!key){
      singles.push(row);
      continue;
    }
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  const out = singles.slice();
  for(const list of groups.values()){
    const valid = list.filter((row) => isValidSessionStatut(row.statutParticipation || row.statut));
    out.push(...valid);
  }
  return out;
}

module.exports = {
  ROLES_CYCLE,
  buildCycleProposal,
  cycleTechnicalIdentity,
  sameTechnicalCycle,
  proposeCycleLink,
  computeCycleMetrics,
  eventContributionState,
  isEventStatisticallyCountable,
  isEventCycleExigible,
  resolveCycleCompletion,
  prExerciseGroupKey,
  prSessionKey,
  prSessionLabel,
  prExerciseEvents,
  resolveSessionReportingScope,
  normalizeReportingPeriod,
  eventInReportingPeriod,
  sortSessionEvents,
  sessionExerciseLabel,
  MOTIF_DISPENSE_LABELS,
  isValidSessionStatut,
  isValidSessionDecision,
  canCloseLastSession,
  personHasValidStatusInSession,
  collapsePersonSessionHistory,
  computePrExerciseParticipationState,
  computeSessionParticipationState,
  computeStandardEventMetricsUnchanged
};
