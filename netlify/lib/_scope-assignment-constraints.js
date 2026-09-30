'use strict';

const LEVELS = Object.freeze({ BLOCKING: 'BLOQUANT', WARNING: 'ATTENTION', INFO: 'INFORMATION' });
const ENCADREMENT_ROLES = new Set(['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE', 'RENFORT', 'REMPLACANT']);
const CANCELLED = new Set(['ANNULE', 'SUPPRIME']);

function text(value){ return String(value == null ? '' : value).trim(); }
function upper(value){ return text(value).toUpperCase(); }
function unique(values){ return [...new Set((values || []).map(text).filter(Boolean))].sort(); }
function eventId(row){ return text(row && (row.evenement_id || row.eventId || row.id)); }
function personId(row){ return text(row && (row.personne_id || row.personneId || row.personId || row.id)); }

function dateOnly(value){
  const day = text(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function timeOnly(value){
  const match = text(value).match(/^(\d{1,2}):(\d{2})/);
  if(!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if(hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function plusDays(day, count){
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function intervalForEvent(event){
  const startDate = dateOnly(event && event.date);
  const endDate = dateOnly(event && (event.date_fin || event.dateFin)) || startDate;
  const startTime = timeOnly(event && (event.heure_debut_prevue || event.heureDebutPrevue || event.heure_debut || event.heureDebut));
  const endTime = timeOnly(event && (event.heure_fin_prevue || event.heureFinPrevue || event.heure_fin || event.heureFin));
  if(!startDate || !startTime || !endTime) return { certain: false, startDate, endDate, startTime, endTime };
  let normalizedEndDate = endDate;
  if(normalizedEndDate === startDate && endTime <= startTime) normalizedEndDate = plusDays(normalizedEndDate, 1);
  const start = Date.parse(`${startDate}T${startTime}:00Z`);
  const end = Date.parse(`${normalizedEndDate}T${endTime}:00Z`);
  if(!Number.isFinite(start) || !Number.isFinite(end) || end <= start){
    return { certain: false, startDate, endDate: normalizedEndDate, startTime, endTime };
  }
  return { certain: true, start, end, startDate, endDate: normalizedEndDate, startTime, endTime };
}

function overlap(left, right){
  if(left.certain && right.certain) return { certain: true, overlaps: left.start < right.end && right.start < left.end };
  const mayShareDate = Boolean(left.startDate && right.startDate
    && left.startDate <= (right.endDate || right.startDate)
    && right.startDate <= (left.endDate || left.startDate));
  return { certain: false, overlaps: mayShareDate };
}

function relationMap(rows){
  return new Map((rows || []).map((row) => [eventId(row), {
    oiCodes: unique(row.oi_codes || row.oiCodes),
    resourceCodes: unique(row.resource_codes || row.resourceCodes),
    roomId: text(row.room_id || row.roomId || row.salle_theorie_id),
    sessionGroupId: text(row.session_group_id || row.sessionGroupId || row.multisession_id || row.exercice_id || row.pr_exercise_group_key),
    sessionIndex: Number(row.session_index || row.sessionIndex || row.sequence || 0) || null
  }]));
}

function participantState(events, attendus, participations, candidatePersonIds, candidatePersonIdsByEvent){
  const byEvent = new Map((events || []).map((event) => [eventId(event), {
    expected: new Set(),
    encadrement: new Set(),
    roles: new Map()
  }]));
  for(const row of attendus || []){
    const state = byEvent.get(eventId(row));
    if(state && row.inclus !== false) state.expected.add(personId(row));
  }
  for(const row of participations || []){
    const state = byEvent.get(eventId(row));
    if(!state || upper(row.statut) === 'NON_CONCERNE') continue;
    const id = personId(row);
    const role = upper(row.role || 'PARTICIPANT');
    if(ENCADREMENT_ROLES.has(role)) state.encadrement.add(id);
    state.roles.set(id, role);
  }
  for(const [id, ids] of Object.entries(candidatePersonIdsByEvent || {})){
    const state = byEvent.get(text(id));
    if(state) for(const person of ids || []) state.expected.add(text(person));
  }
  const current = byEvent.get(text(candidatePersonIds && candidatePersonIds.eventId));
  if(current){
    for(const id of candidatePersonIds.personIds || []) current.expected.add(text(id));
  }
  return byEvent;
}

function shared(left, right){
  const rightSet = new Set(right || []);
  return unique([...(left || [])].filter((value) => rightSet.has(value)));
}

function issue(level, code, current, other, details = {}){
  return {
    level,
    code,
    eventId: eventId(current),
    conflictingEventId: eventId(other),
    conflictingEventLabel: other.libelle || null,
    date: dateOnly(other.date),
    ...details
  };
}

function evaluateAssignmentConstraints(input = {}){
  const current = input.currentEvent || {};
  const currentId = eventId(current);
  const events = (input.events || []).filter((row) => eventId(row) && !CANCELLED.has(upper(row.statut)));
  const relations = relationMap(input.relations);
  const participants = participantState(events, input.attendus, input.participations, {
    eventId: currentId,
    personIds: input.candidatePersonIds || []
  }, input.candidatePersonIdsByEvent);
  const currentPeople = participants.get(currentId) || { expected: new Set(), encadrement: new Set(), roles: new Map() };
  const currentRelation = relations.get(currentId) || {};
  const currentInterval = intervalForEvent(current);
  const issues = [];

  for(const other of events){
    if(eventId(other) === currentId) continue;
    const otherInterval = intervalForEvent(other);
    const timing = overlap(currentInterval, otherInterval);
    const otherPeople = participants.get(eventId(other)) || { expected: new Set(), encadrement: new Set(), roles: new Map() };
    const otherRelation = relations.get(eventId(other)) || {};
    const sharedPeople = shared(
      new Set([...currentPeople.expected, ...currentPeople.encadrement]),
      new Set([...otherPeople.expected, ...otherPeople.encadrement])
    );
    if(timing.overlaps && sharedPeople.length){
      const encadrement = sharedPeople.filter((id) => currentPeople.encadrement.has(id) || otherPeople.encadrement.has(id));
      issues.push(issue(timing.certain ? LEVELS.BLOCKING : LEVELS.WARNING,
        encadrement.length ? 'ENCADREMENT_TEMPOREL' : 'PERSONNE_TEMPOREL', current, other, {
          personIds: sharedPeople,
          encadrementPersonIds: encadrement,
          reason: timing.certain ? 'CHEVAUCHEMENT_TEMPOREL_CERTAIN' : 'HORAIRE_INCOMPLET_CONTROLE_REQUIS'
        }));
    }
    if(timing.certain && timing.overlaps && currentRelation.roomId && currentRelation.roomId === otherRelation.roomId){
      issues.push(issue(LEVELS.BLOCKING, 'SALLE_EXCLUSIVE', current, other, { roomId: currentRelation.roomId }));
    }
    const sharedResources = shared(currentRelation.resourceCodes, otherRelation.resourceCodes);
    if(timing.certain && timing.overlaps && sharedResources.length){
      issues.push(issue(LEVELS.BLOCKING, 'RESSOURCE_EXCLUSIVE', current, other, { resourceCodes: sharedResources }));
    }
    const sharedOis = shared(currentRelation.oiCodes, otherRelation.oiCodes);
    if(timing.overlaps && sharedOis.length){
      issues.push(issue(LEVELS.WARNING, 'OI_SIMULTANE', current, other, {
        oiCodes: sharedOis,
        reason: 'OI_COMMUN_SANS_PREUVE_D_EXCLUSIVITE'
      }));
    }
    if(currentRelation.sessionGroupId && currentRelation.sessionGroupId === otherRelation.sessionGroupId
      && currentRelation.sessionIndex && otherRelation.sessionIndex){
      const currentDay = dateOnly(current.date);
      const otherDay = dateOnly(other.date);
      const inverted = (currentRelation.sessionIndex < otherRelation.sessionIndex && currentDay > otherDay)
        || (currentRelation.sessionIndex > otherRelation.sessionIndex && currentDay < otherDay);
      if(inverted){
        issues.push(issue(LEVELS.BLOCKING, 'ORDRE_SESSIONS', current, other, {
          sessionGroupId: currentRelation.sessionGroupId,
          sessionIndexes: [currentRelation.sessionIndex, otherRelation.sessionIndex]
        }));
      }
    }
  }

  const deduped = [...new Map(issues.map((row) => [
    [row.level, row.code, row.conflictingEventId, ...(row.personIds || []), ...(row.resourceCodes || [])].join('|'), row
  ])).values()].sort((left, right) =>
    ['BLOQUANT', 'ATTENTION', 'INFORMATION'].indexOf(left.level) - ['BLOQUANT', 'ATTENTION', 'INFORMATION'].indexOf(right.level)
    || text(left.conflictingEventLabel).localeCompare(text(right.conflictingEventLabel), 'fr'));
  const summary = {
    BLOQUANT: deduped.filter((row) => row.level === LEVELS.BLOCKING).length,
    ATTENTION: deduped.filter((row) => row.level === LEVELS.WARNING).length,
    INFORMATION: deduped.filter((row) => row.level === LEVELS.INFO).length
  };
  return {
    status: summary.BLOQUANT ? 'BLOQUANT' : summary.ATTENTION ? 'ATTENTION' : 'COMPATIBLE',
    summary,
    issues: deduped,
    evaluatedPersonIds: unique([...currentPeople.expected, ...currentPeople.encadrement]),
    readOnly: true
  };
}

module.exports = { LEVELS, intervalForEvent, overlap, evaluateAssignmentConstraints };
