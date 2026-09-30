'use strict';

const CONSOLIDATED_STATE = Object.freeze({
  SATISFIED: 'SATISFAIT',
  IN_PROGRESS: 'EN_COURS',
  TODO: 'A_REALISER',
  CATCHUP_REQUIRED: 'RATTRAPAGE_REQUIS',
  SATISFIED_BY_CATCHUP: 'SATISFAIT_PAR_RATTRAPAGE',
  EXEMPT: 'DISPENSE',
  NOT_CONCERNED: 'NON_CONCERNE',
  REVIEW: 'A_CONTROLER'
});

const CLOSED_STATES = new Set([
  CONSOLIDATED_STATE.SATISFIED,
  CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP,
  CONSOLIDATED_STATE.EXEMPT,
  CONSOLIDATED_STATE.NOT_CONCERNED
]);

function text(value){
  return String(value == null ? '' : value).trim();
}

function upper(value){
  return text(value).toUpperCase();
}

function eventId(row){
  return text(row && (row.evenement_id || row.evenementId || row.event_id || row.eventId || row.id));
}

function personId(row){
  return text(row && (row.personne_id || row.personneId || row.person_id || row.personId));
}

function requiredSessionCount(events){
  const configured = (events || [])
    .filter((event) => event && (event.consolidation_active === true || event.consolidationActive === true))
    .map((event) => Number(event.nombre_sessions_attendu || event.nombreSessionsAttendu || 1))
    .filter((value) => Number.isFinite(value) && value > 0);
  return configured.length ? Math.max(...configured) : 1;
}

function participationProvenance(rows){
  return (rows || []).map((row) => ({
    type: 'PARTICIPATION',
    eventId: eventId(row) || null,
    participationId: row.participation_id || row.participationId || null,
    statut: upper(row.statut || row.attendance_status),
    role: upper(row.role || 'PARTICIPANT'),
    source: upper(row.source) || null,
    motif: upper(row.motif_absence || row.motifAbsence || row.reason || row.motif) || null
  }));
}

function permutationForCell(permutations, person, eventIds){
  return (permutations || []).find((row) => (
    (!person || personId(row) === person)
    && eventIds.has(text(row.source_evenement_id || row.sourceEvenementId))
  )) || null;
}

function catchupResult(permutation, participations, eventsById){
  if(!permutation) return null;
  const status = upper(permutation.statut);
  const targetId = text(permutation.rattrapage_evenement_id || permutation.rattrapageEvenementId);
  const provenance = {
    type: 'PERMUTATION',
    permutationId: permutation.permutation_id || permutation.permutationId || null,
    sourceEventId: text(permutation.source_evenement_id || permutation.sourceEvenementId) || null,
    catchupEventId: targetId || null,
    sourceExerciseKey: text(permutation.source_exercise_key || permutation.sourceExerciseKey) || null,
    statut: status || null
  };
  if(['A_RATTRAPER', 'A_REGULARISER'].includes(status)){
    return { state: CONSOLIDATED_STATE.CATCHUP_REQUIRED, provenance };
  }
  if(status !== 'RATTRAPPE') return null;
  const targetParticipation = (participations || []).find((row) => (
    eventId(row) === targetId
    && personId(row) === personId(permutation)
    && upper(row.role || 'PARTICIPANT') === 'PARTICIPANT'
    && upper(row.statut || row.attendance_status) === 'PRESENT'
  ));
  const targetEvent = eventsById.get(targetId) || {};
  const sourceKey = text(permutation.source_exercise_key || permutation.sourceExerciseKey);
  const targetKey = text(targetEvent.exercise_equivalence_key || targetEvent.exerciseEquivalenceKey);
  if(targetParticipation && sourceKey && targetKey && sourceKey === targetKey){
    return {
      state: CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP,
      provenance: [provenance, ...participationProvenance([targetParticipation])]
    };
  }
  return { state: CONSOLIDATED_STATE.REVIEW, provenance, reason: 'RATTRAPAGE_INCOHERENT' };
}

function consolidateCell(cell, context){
  if(!cell || !cell.expected){
    return { state: CONSOLIDATED_STATE.NOT_CONCERNED, provenance: [] };
  }
  const eventIds = new Set((context.obligation && context.obligation.eventIds || [cell.eventId]).map(text).filter(Boolean));
  const personRows = (context.participations || []).filter((row) => (
    eventIds.has(eventId(row)) && personId(row) === context.personId
  ));
  const participantRows = personRows.filter((row) => upper(row.role || 'PARTICIPANT') === 'PARTICIPANT');
  const statuses = new Set(participantRows.map((row) => upper(row.statut || row.attendance_status)).filter(Boolean));
  const permutation = permutationForCell(context.permutations, context.personId, eventIds);
  const catchup = catchupResult(permutation, context.participations, context.eventsById);
  if(catchup){
    return {
      ...catchup,
      provenance: Array.isArray(catchup.provenance) ? catchup.provenance : [catchup.provenance]
    };
  }
  if(statuses.has('NON_CONCERNE')){
    const incompatible = [...statuses].some((status) => status !== 'NON_CONCERNE' && status !== 'NON_RENSEIGNE');
    return {
      state: incompatible ? CONSOLIDATED_STATE.REVIEW : CONSOLIDATED_STATE.NOT_CONCERNED,
      reason: incompatible ? 'DECISIONS_HUMAINES_CONTRADICTOIRES' : null,
      provenance: participationProvenance(participantRows)
    };
  }
  const presentEvents = new Set(participantRows
    .filter((row) => upper(row.statut || row.attendance_status) === 'PRESENT')
    .map(eventId)
    .filter(Boolean));
  const required = requiredSessionCount(context.events);
  if(presentEvents.size >= required){
    return { state: CONSOLIDATED_STATE.SATISFIED, provenance: participationProvenance(participantRows), requiredSessions: required, completedSessions: presentEvents.size };
  }
  if(presentEvents.size > 0){
    return { state: CONSOLIDATED_STATE.IN_PROGRESS, provenance: participationProvenance(participantRows), requiredSessions: required, completedSessions: presentEvents.size };
  }
  if(upper(cell.status) === 'REALISE' && ['FORMATEUR', 'SURVEILLANT'].includes(upper(cell.role))){
    return {
      state: CONSOLIDATED_STATE.SATISFIED,
      provenance: participationProvenance(personRows),
      reason: 'REGLE_CYCLE_ENCADREMENT_EXISTANTE',
      requiredSessions: 1,
      completedSessions: 1
    };
  }
  if(statuses.has('DISPENSE')){
    return { state: CONSOLIDATED_STATE.EXEMPT, provenance: participationProvenance(participantRows) };
  }
  if(statuses.has('PERMUTATION')){
    return { state: CONSOLIDATED_STATE.CATCHUP_REQUIRED, provenance: participationProvenance(participantRows), reason: 'PERMUTATION_SANS_OBLIGATION_LIEE' };
  }
  return { state: CONSOLIDATED_STATE.TODO, provenance: participationProvenance(participantRows) };
}

function personState(cells){
  const states = (cells || []).filter((cell) => cell.expected).map((cell) => cell.consolidatedState);
  if(!states.length) return CONSOLIDATED_STATE.NOT_CONCERNED;
  if(states.includes(CONSOLIDATED_STATE.REVIEW)) return CONSOLIDATED_STATE.REVIEW;
  if(states.includes(CONSOLIDATED_STATE.CATCHUP_REQUIRED)) return CONSOLIDATED_STATE.CATCHUP_REQUIRED;
  if(states.every((state) => state === CONSOLIDATED_STATE.NOT_CONCERNED)) return CONSOLIDATED_STATE.NOT_CONCERNED;
  if(states.every((state) => [CONSOLIDATED_STATE.EXEMPT, CONSOLIDATED_STATE.NOT_CONCERNED].includes(state))) return CONSOLIDATED_STATE.EXEMPT;
  if(states.every((state) => CLOSED_STATES.has(state))){
    return states.includes(CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP)
      ? CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP
      : CONSOLIDATED_STATE.SATISFIED;
  }
  if(states.includes(CONSOLIDATED_STATE.IN_PROGRESS) || states.some((state) => CLOSED_STATES.has(state))){
    return CONSOLIDATED_STATE.IN_PROGRESS;
  }
  return CONSOLIDATED_STATE.TODO;
}

function round1(value){
  return Math.round(value * 10) / 10;
}

function consolidatePilotage(pilotage, input = {}){
  const obligations = pilotage && pilotage.obligations || [];
  const obligationByKey = new Map(obligations.map((item) => [item.obligationKey, item]));
  const events = input.evenements || input.events || [];
  const eventsById = new Map(events.map((event) => [eventId(event), event]));
  const rows = (pilotage && pilotage.individualRows || []).map((row) => {
    if(!row.isPopulation) return { ...row, consolidatedState: row.isEncadrement ? 'ENCADREMENT' : CONSOLIDATED_STATE.NOT_CONCERNED };
    const cells = (row.obligations || []).map((cell) => {
      const obligation = obligationByKey.get(cell.obligationKey) || { eventIds: [cell.eventId].filter(Boolean) };
      const obligationEvents = (obligation.eventIds || []).map((id) => eventsById.get(text(id))).filter(Boolean);
      const result = consolidateCell(cell, {
        obligation,
        events: obligationEvents,
        eventsById,
        participations: input.participations || [],
        permutations: input.permutations || [],
        personId: text(row.personneId || row.personne_id)
      });
      return { ...cell, consolidatedState: result.state, consolidationReason: result.reason || null, provenance: result.provenance || [], requiredSessions: result.requiredSessions || 1, completedSessions: result.completedSessions || 0 };
    });
    const consolidatedState = personState(cells);
    const expectedCells = cells.filter((cell) => cell.expected);
    const satisfiedCount = expectedCells.filter((cell) => [CONSOLIDATED_STATE.SATISFIED, CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP].includes(cell.consolidatedState)).length;
    const closedCount = expectedCells.filter((cell) => CLOSED_STATES.has(cell.consolidatedState)).length;
    return {
      ...row,
      consolidatedState,
      obligations: cells,
      obligationSatisfiedCount: satisfiedCount,
      obligationSatisfiedPct: expectedCells.length ? round1((100 * satisfiedCount) / expectedCells.length) : null,
      treatedCount: closedCount,
      progressionPct: expectedCells.length ? round1((100 * closedCount) / expectedCells.length) : null
    };
  });
  const population = rows.filter((row) => row.isPopulation);
  const satisfied = population.filter((row) => [CONSOLIDATED_STATE.SATISFIED, CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP].includes(row.consolidatedState));
  const treated = population.filter((row) => CLOSED_STATES.has(row.consolidatedState));
  const remaining = population.filter((row) => !CLOSED_STATES.has(row.consolidatedState));
  const kpis = {
    ...(pilotage && pilotage.kpis || {}),
    population: population.length,
    complete: satisfied.length,
    obligationsSatisfaites: satisfied.length,
    obligationSatisfied: satisfied.length,
    incomplete: remaining.length,
    dossiersTraites: treated.length,
    treated: treated.length,
    resteATraiter: remaining.length,
    remainingObligations: remaining.length,
    realised: population.filter((row) => row.consolidatedState === CONSOLIDATED_STATE.SATISFIED).length,
    satisfiedByCatchup: population.filter((row) => row.consolidatedState === CONSOLIDATED_STATE.SATISFIED_BY_CATCHUP).length,
    catchupRequired: population.filter((row) => row.consolidatedState === CONSOLIDATED_STATE.CATCHUP_REQUIRED).length,
    inProgress: population.filter((row) => row.consolidatedState === CONSOLIDATED_STATE.IN_PROGRESS).length,
    toDo: population.filter((row) => row.consolidatedState === CONSOLIDATED_STATE.TODO).length,
    toReview: population.filter((row) => row.consolidatedState === CONSOLIDATED_STATE.REVIEW).length,
    progression: population.length ? round1((100 * treated.length) / population.length) : null,
    tauxTraitement: population.length ? round1((100 * treated.length) / population.length) : null,
    tauxObligations: population.length ? round1((100 * satisfied.length) / population.length) : null,
    couvertureCycle: population.length ? round1((100 * satisfied.length) / population.length) : null
  };
  return { ...pilotage, individualRows: rows, kpis, consolidationVersion: 'SCOPE-PILOTAGE-CONSOLIDATION-1' };
}

module.exports = {
  CONSOLIDATED_STATE,
  consolidateCell,
  consolidatePilotage,
  personState,
  requiredSessionCount
};
