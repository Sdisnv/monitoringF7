const { STATUT_PERMUTATION } = require('./_scope-model');
const { getEncadrementContribution, round1 } = require('./_scope-rules');

const ROLES_CYCLE = new Set(['PARTICIPANT', 'FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
const STATUTS_PRESENTS = new Set(['PRESENT', STATUT_PERMUTATION]);
const STATUTS_ABSENCE = new Set(['ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE']);
const SESSION_COUNTING_ROLES = new Set(['PARTICIPANT', 'FORMATEUR', 'SURVEILLANT']);
const STATUTS_PR_EXERCISE_RECONNUS = new Set(['PRESENT', STATUT_PERMUTATION, 'DISPENSE']);
const STATUTS_SESSION_VALIDES = new Set(['PRESENT', STATUT_PERMUTATION, 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE']);
const MOTIF_DISPENSE_LABELS = Object.freeze({
  JOKER: 'Joker',
  FORMATEUR_PR: 'Formateur PR',
  FORMATION_HORS_SDIS: 'Formation hors SDIS',
  PAS_CONCERNE: 'Pas concerné'
});
const MOTIF_EXCUSE_LABELS = Object.freeze({
  PRIVE: 'Privé',
  PROFESSIONNEL: 'Professionnel',
  ARMEE: 'Armée',
  ACCIDENT_MALADIE: 'Accident/Maladie'
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
  return {
    current,
    groupKey,
    events: sortSessionEvents(events.filter((event) => prExerciseGroupKey(event) === groupKey))
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
  const eventsById = new Map(events.map((event) => [eventId(event), event]));
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
    const key = dedupeKey(participation, personnesById);
    if(!key) continue;
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
  for(const [key, rows] of countedByPerson.entries()){
    rows.sort((a, b) => (eventOrder.get(a.eventId) ?? 9999) - (eventOrder.get(b.eventId) ?? 9999));
    const first = rows[0] || {};
    if(first.statut === 'DISPENSE') dispenseKeys.add(key);
    else presentKeys.add(key);
  }
  for(const [key, rows] of countedByPerson.entries()){
    const reference = rows[0] || {};
    const outsideCurrent = currentEventId
      ? rows.filter((row) => row.eventId !== currentEventId)
      : rows;
    if(!outsideCurrent.length) continue;
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
      const sessionDispense = reference.statut === 'DISPENSE';
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
        referenceQuality: reference.role === 'FORMATEUR' ? 'Formateur PR' : 'PAPR',
        referenceRelation: relation,
        formateurSessionLabels,
        sessionDispense,
        sessionExcuse: false,
        sessionExerciseLabel: exerciseLabel,
        sessionMessage: sessionDispense
          ? `${personDisplayName(person)} est dispensé de cet exercice pour la raison suivante : ${motifDispenseLabel(motif) || '—'}.`
          : '',
        sessionSummary: sessionDispense ? `Dispensé de l’exercice ${exerciseLabel}` : ''
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
  const excuseKeys = new Set();
  for(const [key, rows] of excuseByPerson.entries()){
    rows.sort((a, b) => (eventOrder.get(a.eventId) ?? 9999) - (eventOrder.get(b.eventId) ?? 9999));
    const reference = rows[0] || {};
    const outsideCurrent = currentEventId ? rows.filter((row) => row.eventId !== currentEventId) : rows;
    if(!outsideCurrent.length) continue;
    excuseKeys.add(key);
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
        referenceQuality: 'PAPR',
        referenceRelation: relation,
        formateurSessionLabels: [],
        sessionDispense: false,
        sessionExcuse: true,
        sessionExerciseLabel: exerciseLabel,
        sessionMessage: `${personDisplayName(person)} a été excusé lors de la session d’exercice ${exerciseLabel}.`,
        sessionSummary: motifExcuseLabel(reference.motif)
      };
    }
  }

  const validByPerson = new Map();
  for(const participation of input.participations || []){
    const eid = eventId(participation);
    if(!groupEventIds.has(eid)) continue;
    const key = dedupeKey(participation, personnesById);
    if(!key) continue;
    const statut = normalizeUpper(participation.statut);
    if(!STATUTS_SESSION_VALIDES.has(statut)) continue;
    const set = validByPerson.get(key) || new Set();
    set.add(statut);
    validByPerson.set(key, set);
  }
  const unfilledKeys = [...population].filter((key) => !validByPerson.has(key));
  const unfilledPeople = [];
  const seenUnfilled = new Set();
  for(const person of personnesById.values()){
    const key = dedupeKey(person, personnesById);
    if(!unfilledKeys.includes(key) || seenUnfilled.has(key)) continue;
    seenUnfilled.add(key);
    unfilledPeople.push({
      personneId: personneId(person),
      grade: person.grade || '',
      nom: person.nom || '',
      prenom: person.prenom || '',
      nip: person.nip || ''
    });
  }
  const lastEventId = events.length ? eventId(events[events.length - 1]) : '';
  const resolvedKeys = new Set([...countedKeys, ...excuseKeys, ...validByPerson.keys()]);

  return {
    groupKey: group.groupKey || null,
    sessionKey: prSessionKey(group.current) || null,
    eventIds: [...groupEventIds],
    isMultiSession: events.length > 1,
    isLastSession: Boolean(currentEventId && lastEventId && currentEventId === lastEventId),
    sessionExerciseLabel: sessionExerciseLabel(events, group.groupKey),
    unfilledPeople,
    byPersonneId,
    kpis: {
      population: population.size,
      presents: presentKeys.size,
      dispenses: dispenseKeys.size,
      excuses: excuseByPerson.size,
      absents: 0,
      open: Math.max(0, population.size - resolvedKeys.size)
    },
    details: {
      population: sortedValues(population),
      counted: sortedValues(countedKeys),
      presents: sortedValues(presentKeys),
      dispenses: sortedValues(dispenseKeys),
      open: sortedValues(new Set(unfilledKeys)),
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
  prSessionLabel,
  prExerciseEvents,
  sortSessionEvents,
  sessionExerciseLabel,
  MOTIF_DISPENSE_LABELS,
  computePrExerciseParticipationState,
  computeSessionParticipationState,
  computeStandardEventMetricsUnchanged
};
