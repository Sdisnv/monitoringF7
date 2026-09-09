'use strict';

const { HttpError, computeTaux } = require('./_scope-rules');

const ENGINE = Object.freeze({
  SIMPLE: 'SIMPLE',
  LEGACY_PR_MULTI: 'LEGACY_PR_MULTI',
  MULTI_SESSION_V2: 'MULTI_SESSION_V2'
});

const FINAL_STATUSES = new Set(['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE']);
const SATISFYING_STATUSES = new Set(['PRESENT', 'DISPENSE']);
const SUPPORT_ROLES = new Set(['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
const FINAL_MULTISESSION_STATUSES = new Set(['CLOTUREE', 'CLOTURE', 'REALISE']);

function norm(value){
  return String(value || '').trim();
}

function upper(value){
  return norm(value).toUpperCase();
}

function personId(row){
  return norm(row && (row.personne_id || row.personneId || row.id));
}

function eventId(row){
  return norm(row && (row.evenement_id || row.evenementId || row.event_id || row.eventId));
}

function dateOnly(value){
  return value ? String(value).slice(0, 10) : '';
}

function sessionLabel(event, fallback){
  const explicit = norm(event && (event.session_label || event.sessionLabel));
  if(explicit) return explicit;
  const label = norm(event && (event.libelle || event.label));
  const dap = label.match(/\bDAP\s+([0-9]+(?:\.[0-9]+)?)\b/i);
  if(dap) return `DAP ${dap[1]}`;
  const index = Number(event && (event.session_index || event.sessionIndex));
  return Number.isFinite(index) && index > 0 ? `Session ${index}` : (fallback || label || 'session');
}

function sortSessions(rows){
  return (rows || []).slice().sort((a, b) => {
    const sa = Number(a.sequence || a.session_sequence || a.sessionIndex || a.session_index || 0);
    const sb = Number(b.sequence || b.session_sequence || b.sessionIndex || b.session_index || 0);
    return (sa - sb) || String(a.date || '').localeCompare(String(b.date || '')) || String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr', { numeric: true });
  });
}

function mergePerson(personnes, id, fallback = {}){
  return (personnes && (personnes[String(id)] || personnes[id])) || fallback || {};
}

function targetPopulationSet(populationRows, personnes){
  const set = new Set();
  for(const row of populationRows || []){
    const id = personId(row);
    if(!id) continue;
    const p = mergePerson(personnes, id, row);
    const nip = norm(row.nip || p.nip);
    set.add(nip ? `NIP:${nip}` : `ID:${id}`);
  }
  return set;
}

function buildState(input = {}){
  const multisession = input.multisession || null;
  if(!multisession) return null;
  const currentEventId = norm(input.currentEventId || input.current_event_id);
  const sessions = sortSessions(input.sessions || []);
  const allSessionsClosed = sessions.every((row) => upper(row.statut) === 'REALISE' || upper(row.status) === 'CLOTUREE' || upper(row.status) === 'ANNULEE');
  const eventsById = new Map(sessions.map((row) => [eventId(row), row]));
  const personnes = input.personnes || {};
  const populationRows = input.population || [];
  const populationKeys = targetPopulationSet(populationRows, personnes);
  const byPersonneId = {};
  const contributions = new Map();
  const sessionRanks = new Map(sessions.map((row, index) => [eventId(row), index + 1]));

  for(const row of populationRows){
    const pid = personId(row);
    if(!pid) continue;
    byPersonneId[pid] = {
      personneId: pid,
      isTargetPopulation: true,
      engine: ENGINE.MULTI_SESSION_V2,
      finalStatus: null,
      countedEventId: null,
      countedRole: null,
      countedStatut: null,
      countedMotif: null,
      finalEventId: null,
      finalMotif: null,
      referenceEventId: null,
      referenceEventLabel: null,
      referenceEventDate: null,
      referenceSessionLabel: null,
      alreadyCountedInSession: false,
      sessionHasValidStatus: false,
      sessionMessage: ''
    };
  }

  const finalByPerson = new Map();
  const supportByPerson = new Map();
  for(const row of input.participations || []){
    const pid = personId(row);
    if(!pid) continue;
    const role = upper(row.role || 'PARTICIPANT');
    const statut = upper(row.statut || 'NON_RENSEIGNE');
    const eid = eventId(row);
    const isTarget = Boolean(byPersonneId[pid]);
    if(SUPPORT_ROLES.has(role)){
      const list = supportByPerson.get(pid) || [];
      list.push(row);
      supportByPerson.set(pid, list);
    }
    if(!isTarget) continue;
    const state = byPersonneId[pid];
    if(eid === currentEventId && FINAL_STATUSES.has(statut)){
      state.sessionHasValidStatus = true;
    }
    const satisfies = role === 'PARTICIPANT'
      ? SATISFYING_STATUSES.has(statut)
      : (role === 'FORMATEUR' && statut === 'PRESENT');
    const finalCandidate = FINAL_STATUSES.has(statut) || satisfies;
    if(!finalCandidate) continue;
    const rank = sessionRanks.get(eid) || Number.MAX_SAFE_INTEGER;
    const priority = statut === 'PRESENT' || (role === 'FORMATEUR' && statut === 'PRESENT') ? 4
      : statut === 'DISPENSE' ? 3
        : statut === 'ABSENT_EXCUSE' ? 2
          : statut === 'ABSENT_NON_EXCUSE' ? 1
            : 0;
    const current = finalByPerson.get(pid);
    if(!current || priority > current.priority || (priority === current.priority && rank < current.rank)){
      finalByPerson.set(pid, { row, role, statut, rank, priority });
    }
    if(satisfies && !contributions.has(pid)){
      contributions.set(pid, { row, role, statut, rank });
    }
  }

  const missing = [];
  let presents = 0;
  let excuses = 0;
  let absents = 0;
  let dispenses = 0;
  for(const row of populationRows){
    const pid = personId(row);
    if(!pid) continue;
    const state = byPersonneId[pid];
    const final = finalByPerson.get(pid);
    const contribution = contributions.get(pid);
    let finalStatus = final && (final.role === 'FORMATEUR' && final.statut === 'PRESENT' ? 'PRESENT' : final.statut);
    if(finalStatus && !allSessionsClosed && !['PRESENT', 'DISPENSE'].includes(finalStatus)){
      finalStatus = null;
    }
    state.finalStatus = finalStatus || null;
    if(final && finalStatus){
      state.finalEventId = eventId(final.row);
      state.finalMotif = final.row.motif_absence || final.row.motifAbsence || final.row.reason || null;
    }
    if(finalStatus === 'PRESENT') presents += 1;
    else if(finalStatus === 'DISPENSE') dispenses += 1;
    else if(finalStatus === 'ABSENT_EXCUSE') excuses += 1;
    else if(finalStatus === 'ABSENT_NON_EXCUSE') absents += 1;
    else {
      const p = mergePerson(personnes, pid, row);
      missing.push({ personneId: pid, nip: p.nip || row.nip || null, grade: p.grade || row.grade || null, nom: p.nom || row.nom || null, prenom: p.prenom || row.prenom || null });
    }
    if(contribution){
      const event = eventsById.get(eventId(contribution.row)) || {};
      state.countedEventId = eventId(contribution.row);
      state.countedRole = contribution.role;
      state.countedStatut = contribution.statut;
      state.countedMotif = contribution.row.motif_absence || null;
      state.referenceEventId = eventId(event);
      state.referenceEventLabel = event.libelle || null;
      state.referenceEventDate = dateOnly(event.date) || null;
      state.referenceSessionLabel = sessionLabel(event);
      if(state.countedEventId && state.countedEventId !== currentEventId){
        const date = state.referenceEventDate ? ` — ${state.referenceEventDate.split('-').reverse().join('.')}` : '';
        state.alreadyCountedInSession = true;
        state.sessionMessage = `Participation déjà enregistrée lors de la session ${state.referenceSessionLabel}${date}.`;
      }
    }
    const support = supportByPerson.get(pid) || [];
    state.formateurSessionLabels = support
      .filter((item) => upper(item.role) === 'FORMATEUR')
      .map((item) => sessionLabel(eventsById.get(eventId(item)) || item))
      .filter(Boolean);
  }

  const denominator = Math.max(0, populationRows.length - dispenses);
  return {
    engine: ENGINE.MULTI_SESSION_V2,
    isMultiSession: true,
    multisession,
    multisessionId: multisession.multisession_id || multisession.id,
    code: multisession.code || null,
    label: multisession.label || null,
    sessionCount: sessions.length,
    currentSessionIndex: Math.max(1, sessions.findIndex((row) => eventId(row) === currentEventId) + 1),
    sessions,
    byPersonneId,
    unfilledPeople: missing,
    kpis: {
      population: populationRows.length,
      participationAcquise: presents,
      restentATraiter: missing.length,
      aRenseigner: missing.length,
      dispenses
    },
    statistics: {
      numerator: presents,
      denominator,
      percentage: denominator === 0 ? null : Math.round((1000 * presents) / denominator) / 10,
      presents,
      excuses,
      nonExcuses: absents,
      dispenses,
      population: populationRows.length,
      officiel: false,
      kind: ENGINE.MULTI_SESSION_V2
    },
    allSessionsClosed,
    globalStatus: FINAL_MULTISESSION_STATUSES.has(upper(multisession.status))
      ? 'CLOTURE'
      : (allSessionsClosed ? 'A_FINALISER' : 'EN_COURS')
  };
}

function decorateAttendus(attendus, state){
  if(!state || !state.byPersonneId) return attendus || [];
  return (attendus || []).map((row) => {
    const s = state.byPersonneId[String(row.personne_id || row.personneId)];
    if(!s) return row;
    return Object.assign({}, row, {
      already_counted_in_session: Boolean(s.alreadyCountedInSession),
      alreadyCountedInSession: Boolean(s.alreadyCountedInSession),
      sessionHasValidStatus: Boolean(s.sessionHasValidStatus),
      session_counted_event_id: s.countedEventId,
      session_counted_role: s.countedRole,
      session_counted_statut: s.countedStatut,
      session_reference_event_id: s.referenceEventId,
      session_reference_label: s.referenceSessionLabel,
      session_reference_event_label: s.referenceEventLabel,
      session_reference_event_date: s.referenceEventDate,
      session_formateur_sessions: s.formateurSessionLabels || [],
      sessionReferenceEventId: s.referenceEventId,
      sessionReferenceLabel: s.referenceSessionLabel,
      sessionReferenceEventLabel: s.referenceEventLabel,
      sessionReferenceEventDate: s.referenceEventDate,
      sessionFormateurSessions: s.formateurSessionLabels || [],
      sessionExerciseLabel: state.label || '',
      sessionMessage: s.sessionMessage || ''
    });
  });
}

function calculateStatistics(participations, population){
  return computeTaux(participations || [], population || []);
}

function validateFinalClosure(state){
  if(!state) throw new HttpError(422, 'multisession_v2_introuvable', 'Multi-session introuvable.');
  if(!state.allSessionsClosed){
    throw new HttpError(422, 'multisession_v2_sessions_ouvertes', 'Clôture du Multi-session impossible : toutes les sessions doivent d’abord être clôturées.', {
      openSessions: (state.sessions || []).filter((row) => !['REALISE', 'CLOTUREE', 'ANNULEE'].includes(upper(row.statut)) && !['CLOTUREE', 'ANNULEE'].includes(upper(row.status)))
        .map((row) => ({ eventId: eventId(row), label: row.libelle || row.label || null, status: row.status || row.statut || null }))
    });
  }
  if(state.unfilledPeople && state.unfilledPeople.length){
    throw new HttpError(422, 'multisession_v2_incomplete', `Clôture du Multi-session impossible : ${state.unfilledPeople.length} personne(s) restent à renseigner.`, {
      unfilledPeople: state.unfilledPeople
    });
  }
  return true;
}

module.exports = {
  ENGINE,
  FINAL_STATUSES,
  SUPPORT_ROLES,
  buildState,
  decorateAttendus,
  calculateStatistics,
  validateFinalClosure,
  sortSessions,
  sessionLabel
};
