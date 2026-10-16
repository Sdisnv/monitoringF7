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


function prepareAssignmentReview(input={}){
  const logic=require('../../assets/js/scope-ui-logic');
  const profile=logic.qvProgrammeAssignmentProfile(input.programmeRow || {});
  const issues=[],notVerified=new Set();
  const add=(level,code,details={})=>issues.push({level,code,...details});
  if(!profile.confirmed) notVerified.add('PARAMETRES_NON_CONFIRMES');
  if(!Array.isArray(input.eligiblePersonIds)) notVerified.add('PUBLIC_APPLICABLE_DATE');
  if(!Array.isArray(input.requiredPersonIds)) notVerified.add('PERSONNES_OBLIGATOIREMENT_CONCERNEES');
  if(!Array.isArray(input.availability)) notVerified.add('DISPONIBILITES_INDIVIDUELLES');
  if(!Array.isArray(input.sessions)) notVerified.add('SESSIONS_A_CONTROLER');
  if(!input.annualSectionComposition) notVerified.add('COMPOSITION_ANNUELLE_SECTIONS');
  if(profile.responsibleRequired && !Array.isArray(input.responsiblePersonIds)) notVerified.add('RESPONSABLE_IDENTIFIE_PAR_REGLE');
  const eligible=new Set(input.eligiblePersonIds || []),required=new Set([...(input.requiredPersonIds || []),
    ...(profile.responsibleRequired?input.responsiblePersonIds || []:[])]);
  const sessions=input.sessions || [];
  const role=row=>upper(row.role || 'PARTICIPANT');
  const trainingCounts=[],coverage=new Set(),supervisors=[];
  for(const session of sessions){
    const nominations=session.nominations || [];
    const participants=unique(nominations.filter(row=>!['NON_CONCERNE','DISPENSE'].includes(upper(row.statut)))
      .map(personId));
    const actual=new Set(participants);
    const counted=unique(nominations.filter(row=>!['AUXILIAIRE','FORMATEUR','MONITEUR','SURVEILLANT'].includes(role(row))
      && !['NON_CONCERNE','DISPENSE'].includes(upper(row.statut))).map(personId));
    for(const row of nominations){
      if(!personId(row)) {add(LEVELS.BLOCKING,'IDENTITE_ABSENTE',{sessionId:session.id});continue;}
      if(role(row)==='AUXILIAIRE' && row.manual!==true) add(LEVELS.BLOCKING,'AUXILIAIRE_MANUEL',{sessionId:session.id,personId:personId(row)});
      if(Array.isArray(input.eligiblePersonIds) && role(row)==='PARTICIPANT' && !eligible.has(personId(row))
        && !(input.authorizedExternalPersonIds || []).includes(personId(row))) add(LEVELS.BLOCKING,'PERSONNE_NON_CONCERNEE',{sessionId:session.id,personId:personId(row)});
      if(upper(row.statut)==='DISPENSE') continue; // Kept in the input and in attendance; never removed.
      if(counted.includes(personId(row))) coverage.add(personId(row));
      if(role(row)==='SURVEILLANT') supervisors.push(personId(row));
    }
    const check=evaluateAssignmentConstraints({...input,currentEvent:session.event,
      events:sessions.map(item=>item.event).concat(input.otherEvents || []),candidatePersonIds:participants,
      candidatePersonIdsByEvent:Object.fromEntries(sessions.map(item=>[eventId(item.event),unique((item.nominations || []).map(personId))]))});
    issues.push(...check.issues.map(item=>({...item,sessionId:session.id})));
    for(const constraint of input.availability || []){
      if(!actual.has(personId(constraint))) continue;
      const timing=overlap(intervalForEvent(session.event || {}),intervalForEvent(constraint));
      if(timing.overlaps) add(timing.certain?LEVELS.BLOCKING:LEVELS.WARNING,'INDISPONIBILITE_INDIVIDUELLE',{sessionId:session.id,personId:personId(constraint)});
    }
    if(profile.maxParticipants && counted.length>profile.maxParticipants) add(LEVELS.BLOCKING,'CAPACITE_SESSION',{sessionId:session.id,maximum:profile.maxParticipants,actual:counted.length});
    if(profile.distinctSupervisors && nominations.filter(row=>role(row)==='SURVEILLANT').length!==1)
      add(LEVELS.BLOCKING,'SURVEILLANT_PAR_SESSION',{sessionId:session.id});
    if(profile.preposeFromConcernedPublic && (!session.preposePersonId || !eligible.has(session.preposePersonId)
      || !counted.includes(session.preposePersonId))) add(LEVELS.BLOCKING,'PREPOSE_APR_REQUIS_DANS_PUBLIC',{sessionId:session.id});
    if(profile.trainersManual){
      if(!Array.isArray(input.trainerPersonIds)) notVerified.add('FORMATEURS_DESIGNES_MANUELLEMENT');
      for(const id of input.trainerPersonIds || []) if(!nominations.some(row=>personId(row)===id && role(row)==='FORMATEUR' && row.manual===true))
        add(LEVELS.BLOCKING,'FORMATEUR_TOUTES_SESSIONS',{sessionId:session.id,personId:id});
    }
    if(profile.profile==='INSTRUCTION_DPS'){
      if(!input.personSections) notVerified.add('COHERENCE_DEMI_SECTION_SECTION');
      const targets=(input.programmeRow?.publics || []).filter(code=>/^N0[1-6][ab]?$/.test(code));
      if(input.personSections) for(const id of counted){
        if((input.authorizedExternalPersonIds || []).includes(id)) continue;
        const section=input.personSections[id];
        if(!section || !targets.some(code=>code.length===3?section.startsWith(code):section===code))
          add(LEVELS.BLOCKING,'SECTION_INCOMPATIBLE',{sessionId:session.id,personId:id});
      }
    }
    trainingCounts.push({sessionId:session.id,participants:counted.length,exemptions:nominations.filter(row=>upper(row.statut)==='DISPENSE').length,
      auxiliaries:nominations.filter(row=>role(row)==='AUXILIAIRE').length,
      echelons:Object.fromEntries(profile.balanceEchelons.map(echelon=>[echelon,counted.filter(id=>input.echelons?.[id]===echelon).length]))});
  }
  if(profile.sessionCount && sessions.length!==profile.sessionCount) add(LEVELS.BLOCKING,'NOMBRE_SESSIONS',{expected:profile.sessionCount,actual:sessions.length});
  if(profile.distinctSupervisors && (supervisors.length!==profile.distinctSupervisors || new Set(supervisors).size!==profile.distinctSupervisors))
    add(LEVELS.BLOCKING,'SURVEILLANTS_DIFFERENTS',{expected:profile.distinctSupervisors,actual:new Set(supervisors).size});
  const missing=[...required].filter(id=>!coverage.has(id) && !sessions.some(session=>(session.nominations || []).some(row=>personId(row)===id && upper(row.statut)==='DISPENSE')));
  if(missing.length) add(LEVELS.BLOCKING,'PERSONNES_OBLIGATOIRES_ABSENTES',{personIds:missing});
  if(!input.echelons) notVerified.add('REPARTITION_ECHELONS');
  if(profile.coverageEchelons) for(const id of eligible) if(profile.coverageEchelons.includes(input.echelons?.[id]) && !coverage.has(id))
    add(LEVELS.WARNING,'COUVERTURE_PAPR_A_COMPLETER',{personId:id});
  if(profile.distribution==='PROPORTIONAL'){
    notVerified.add('PROPORTION_PAR_PUBLIC_OI');
    if(trainingCounts.length && Math.max(...trainingCounts.map(row=>row.participants))-Math.min(...trainingCounts.map(row=>row.participants))>1)
      add(LEVELS.WARNING,'REPARTITION_SESSIONS_A_ARBITRER');
  }
  // Availability remains bounded by the facts supplied; no automatic move and no ProgJour activation.
  notVerified.add('VACANCES_PERMANENT');
  const alternatives=[];
  for(const id of missing){
    for(const session of sessions){
      if(session.nonMovable || session.priority || !Array.isArray(input.eligiblePersonIds) || !eligible.has(id)) continue;
      const count=trainingCounts.find(row=>row.sessionId===session.id)?.participants || 0;
      if(profile.maxParticipants && count>=profile.maxParticipants) continue;
      if((input.availability || []).some(fact=>personId(fact)===id && overlap(intervalForEvent(session.event || {}),intervalForEvent(fact)).overlaps)) continue;
      const review=evaluateAssignmentConstraints({...input,currentEvent:session.event,
        events:sessions.map(item=>item.event).concat(input.otherEvents || []),candidatePersonIds:[id],
        candidatePersonIdsByEvent:Object.fromEntries(sessions.map(item=>[eventId(item.event),unique((item.nominations || []).map(personId))]))});
      if(review.status==='COMPATIBLE') alternatives.push({personId:id,sessionId:session.id,decisionRequired:true,
        constraintsNotVerified:[...notVerified]});
    }
  }
  return {status:issues.some(row=>row.level===LEVELS.BLOCKING)?'BLOQUANT':notVerified.size?'INCOMPLETE':issues.length?'ATTENTION':'COMPATIBLE',
    readOnly:true,assignmentWrites:false,profile,issues,notVerified:[...notVerified],sessions:trainingCounts,alternatives,
    statisticalContributionsPerExercise:profile.statisticalContributionsPerExercise || null};
}

module.exports = { LEVELS, intervalForEvent, overlap, evaluateAssignmentConstraints, prepareAssignmentReview };
