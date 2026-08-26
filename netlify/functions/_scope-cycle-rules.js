const { STATUT_PERMUTATION } = require('./_scope-model');
const { getEncadrementContribution, round1 } = require('./_scope-rules');

const ROLES_CYCLE = new Set(['PARTICIPANT', 'FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
const STATUTS_PRESENTS = new Set(['PRESENT', STATUT_PERMUTATION]);
const STATUTS_ABSENCE = new Set(['ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE']);
const SESSION_COUNTING_ROLES = new Set(['PARTICIPANT', 'FORMATEUR', 'SURVEILLANT']);
const STATUTS_PR_EXERCISE_RECONNUS = new Set(['PRESENT', STATUT_PERMUTATION, 'DISPENSE']);

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

function mapEventCounts(events){
  const counts = {};
  for(const event of events){
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

function prSessionKey(event){
  const explicit = normalizeText(event && (event.pr_session_key || event.prSessionKey));
  if(explicit) return explicit;
  const cyclePart = cycleId(event) || 'NO_CYCLE';
  const libelle = normalizeText(event && (event.libelle || event.label));
  const match = libelle.match(/exercice\s+pr\s+([0-9]+\.[0-9]+)/i);
  return match ? `${cyclePart}:PR:${match[1]}` : '';
}

function prExerciseEvents(input = {}){
  const events = input.evenements || input.events || [];
  const currentId = normalizeText(input.currentEventId || input.current_event_id);
  const current = events.find((event) => eventId(event) === currentId) || input.currentEvent || input.current_event || {};
  const groupKey = prExerciseGroupKey(current);
  if(!groupKey){
    return { current, groupKey: '', events: currentId ? events.filter((event) => eventId(event) === currentId) : [] };
  }
  return {
    current,
    groupKey,
    events: events.filter((event) => prExerciseGroupKey(event) === groupKey)
  };
}

function computeCycleMetrics(input = {}){
  const cycle = input.cycle || {};
  const domaine = normalizeDomain(cycle.domaine_code || cycle.domaineCode || input.domaine || input.domaineCode);
  const personnesById = personneLookup(input.personnes);
  const events = cycleEvents(input, cycle);
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
    if(!cycleEventIds.has(eid)) continue;
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
  const events = group.events;
  const groupEventIds = new Set(events.map(eventId).filter(Boolean));
  const currentEventId = normalizeText(input.currentEventId || input.current_event_id);
  const eventOrder = new Map(events.map((event, index) => [eventId(event), index]));
  const currentOrder = currentEventId && eventOrder.has(currentEventId) ? eventOrder.get(currentEventId) : null;
  const population = new Set();
  const countedByPerson = new Map();
  const attendusByPerson = new Map();

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
    if(currentOrder !== null && eventOrder.has(eid) && eventOrder.get(eid) > currentOrder) continue;
    const key = dedupeKey(participation, personnesById);
    if(!key) continue;
    if(!isSessionCountingParticipation(participation, personnesById, population)) continue;
    const rows = countedByPerson.get(key) || [];
    rows.push({
      eventId: eid,
      personneId: personneId(participation),
      role: normalizeUpper(participation.role || 'PARTICIPANT'),
      statut: normalizeUpper(participation.statut || 'NON_RENSEIGNE'),
      source: normalizeUpper(participation.source)
    });
    countedByPerson.set(key, rows);
  }

  const byPersonneId = {};
  const countedKeys = new Set(countedByPerson.keys());
  const presentKeys = new Set();
  const dispenseKeys = new Set();
  for(const [key, rows] of countedByPerson.entries()){
    const first = rows[0] || {};
    if(first.statut === 'DISPENSE') dispenseKeys.add(key);
    else presentKeys.add(key);
  }
  for(const [key, rows] of countedByPerson.entries()){
    const outsideCurrent = currentEventId
      ? rows.filter((row) => row.eventId !== currentEventId)
      : rows;
    if(!outsideCurrent.length) continue;
    for(const person of personnesById.values()){
      const id = personneId(person);
      if(!id || dedupeKey(person, personnesById) !== key) continue;
      byPersonneId[id] = {
        alreadyCountedInSession: true,
        countedEventId: outsideCurrent[0].eventId,
        countedRole: outsideCurrent[0].role,
        countedStatut: outsideCurrent[0].statut
      };
    }
  }

  return {
    groupKey: group.groupKey || null,
    sessionKey: prSessionKey(group.current) || null,
    eventIds: [...groupEventIds],
    byPersonneId,
    kpis: {
      population: population.size,
      presents: presentKeys.size,
      dispenses: dispenseKeys.size,
      excuses: 0,
      absents: 0,
      open: Math.max(0, population.size - countedKeys.size)
    },
    details: {
      population: sortedValues(population),
      counted: sortedValues(countedKeys),
      presents: sortedValues(presentKeys),
      dispenses: sortedValues(dispenseKeys),
      open: sortedValues(new Set([...population].filter((key) => !countedKeys.has(key)))),
      attendusByPerson: Object.fromEntries(attendusByPerson.entries())
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

module.exports = {
  ROLES_CYCLE,
  buildCycleProposal,
  cycleTechnicalIdentity,
  sameTechnicalCycle,
  proposeCycleLink,
  computeCycleMetrics,
  prExerciseGroupKey,
  prSessionKey,
  computePrExerciseParticipationState,
  computeSessionParticipationState,
  computeStandardEventMetricsUnchanged
};
