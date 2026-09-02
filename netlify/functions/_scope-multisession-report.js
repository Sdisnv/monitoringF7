'use strict';
/** SCOPE-MULTISESSION-REPORT-1 — dataset unique serveur. Réutilise le moteur session R4 et computeTaux. */

const { HttpError, computeTaux, round1 } = require('./_scope-rules');
const {
  computeSessionParticipationState,
  isValidSessionDecision,
  prExerciseGroupKey,
  prSessionLabel,
  sortSessionEvents,
  sessionExerciseLabel,
  MOTIF_DISPENSE_LABELS
} = require('./_scope-cycle-rules');
const { displayDomaineCode, STATUT_PERMUTATION } = require('./_scope-model');

const MOTIF_EXCUSE_LABELS = Object.freeze({
  PRIVE: 'Privé',
  PROFESSIONNEL: 'Professionnel',
  ARMEE: 'Armée',
  ACCIDENT_MALADIE: 'Accident / maladie',
  NON_PRECISE: 'Non précisé (historique)',
  MALADIE: 'Maladie (historique)',
  ACCIDENT: 'Accident (historique)',
  AUTRE: 'Autre (historique)'
});

const STATUT_LABELS = Object.freeze({
  PRESENT: 'Présent',
  PERMUTATION: 'Présent',
  ABSENT_EXCUSE: 'Excusé',
  ABSENT_NON_EXCUSE: 'Absent',
  DISPENSE: 'Dispensé'
});

function eventId(row){
  return String((row && (row.evenement_id || row.evenementId || row.id)) || '');
}

function personId(row){
  return String((row && (row.personne_id || row.personneId || row.id)) || '');
}

function personKey(row, personnesById){
  const id = personId(row);
  const person = personnesById.get(id) || {};
  const nip = String((row && row.nip) || person.nip || '').trim();
  return nip ? `NIP:${nip}` : (id ? `ID:${id}` : '');
}

function classifyGlobalSessionStatut(statuts){
  const set = statuts instanceof Set ? statuts : new Set(statuts || []);
  if(set.has('PRESENT') || set.has(STATUT_PERMUTATION)) return 'PRESENT';
  if(set.has('DISPENSE')) return 'DISPENSE';
  if(set.has('ABSENT_EXCUSE')) return 'ABSENT_EXCUSE';
  if(set.has('ABSENT_NON_EXCUSE')) return 'ABSENT_NON_EXCUSE';
  return null;
}

function signatureRoleForExercise({ domaineCode, typeCycle, libelle } = {}){
  const domaine = displayDomaineCode(domaineCode);
  const type = String(typeCycle || '').toUpperCase();
  const label = String(libelle || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if(domaine === 'PR') return 'Chef PR';
  if(domaine === 'AUTO') return 'Of auto';
  if(
    type.includes('FORMATION')
    || type === 'FOBA'
    || type === 'FOCA'
    || label.includes('FORMATION GROUPEE')
  ) return 'Chef formation';
  return domaine ? `Responsable ${domaine}` : 'Responsable de domaine';
}

function motifLabel(statut, motif){
  const code = String(motif || '').toUpperCase();
  if(!code) return '';
  if(statut === 'DISPENSE') return MOTIF_DISPENSE_LABELS[code] || code;
  if(statut === 'ABSENT_EXCUSE') return MOTIF_EXCUSE_LABELS[code] || code;
  return code;
}

function formatTaux(percentage){
  if(percentage == null || !Number.isFinite(Number(percentage))) return null;
  return Number(percentage);
}

function rateOnDenom(count, denominator){
  if(!denominator) return null;
  return round1((100 * Number(count || 0)) / denominator);
}

function seanceDisplayLabel(event){
  const raw = prSessionLabel(event) || '';
  if(/^\d+\.\d+$/.test(raw)) return `PR ${raw}`;
  return raw || event.libelle || eventId(event);
}

function compareNomPrenomGrade(a, b){
  const nom = String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base' });
  if(nom) return nom;
  const prenom = String(a.prenom || '').localeCompare(String(b.prenom || ''), 'fr', { sensitivity: 'base' });
  if(prenom) return prenom;
  return String(a.grade || '').localeCompare(String(b.grade || ''), 'fr', { sensitivity: 'base' });
}

function officialFromVolumes(volumes, eventCount){
  const presents = Number(volumes.presents || 0);
  const excuses = Number(volumes.excuses || 0);
  const absents = Number(volumes.nonExcuses || 0);
  const denominator = presents + excuses + absents;
  const numerator = presents;
  return {
    percentage: formatTaux(denominator ? round1((100 * numerator) / denominator) : null),
    numerator,
    denominator,
    eventCount,
    volumes: {
      presents,
      excuses,
      nonExcuses: absents,
      dispenses: Number(volumes.dispenses || 0),
      nonRenseignes: 0,
      permutations: Number(volumes.permutations || 0)
    }
  };
}

async function loadSessionBundle(repo, evenementId){
  if(!evenementId) throw new HttpError(400, 'evenement_requis', 'Le rapport de participation exige un identifiant d’événement.');
  const current = await repo.getEvent(evenementId);
  if(!current) throw new HttpError(404, 'evenement_introuvable', 'Événement introuvable.');
  const groupKey = prExerciseGroupKey(current);
  let events = [current];
  if(groupKey && typeof repo.listPrExerciseEvents === 'function'){
    const grouped = await repo.listPrExerciseEvents(groupKey);
    if(grouped && grouped.length) events = sortSessionEvents(grouped);
  } else if(current.cycle_id && typeof repo.listCycleEvents === 'function'){
    const cycleEvents = await repo.listCycleEvents(current.cycle_id);
    if(cycleEvents && cycleEvents.length) events = sortSessionEvents(cycleEvents);
  }
  const ids = events.map(eventId).filter(Boolean);
  const [attendus, participations, personnes, cibles, cycle] = await Promise.all([
    repo.listAttendusForEvents ? repo.listAttendusForEvents(ids) : [],
    repo.listParticipationsForEvents ? repo.listParticipationsForEvents(ids) : [],
    repo.listPersonnes ? repo.listPersonnes({}) : [],
    repo.listCibles ? repo.listCibles() : [],
    current.cycle_id && repo.getCycle ? repo.getCycle(current.cycle_id) : null
  ]);
  const state = computeSessionParticipationState({
    evenements: events,
    currentEventId: eventId(current),
    currentEvent: current,
    attendus,
    participations,
    personnes,
    cycle: cycle || {}
  });
  return { current, events, attendus, participations, personnes, cibles, cycle, state, ids };
}

function buildSessionDataset(bundle){
  const { current, events, attendus, participations, personnes, cibles, cycle, state } = bundle;
  const personnesById = new Map((personnes || []).map((p) => [personId(p), p]));
  const ciblesById = new Map((cibles || []).map((c) => [String(c.cible_id || c.cibleId), c]));
  const eventsById = new Map(events.map((event) => [eventId(event), event]));

  const validByKey = new Map();
  const rowsByKey = new Map();
  for(const participation of participations || []){
    if(!isValidSessionDecision(participation)) continue;
    const key = personKey(participation, personnesById);
    if(!key) continue;
    const statut = String(participation.statut || '').toUpperCase();
    const set = validByKey.get(key) || new Set();
    set.add(statut);
    validByKey.set(key, set);
    const list = rowsByKey.get(key) || [];
    list.push(participation);
    rowsByKey.set(key, list);
  }

  const populationKeys = new Set((state.details && state.details.population) || []);
  let presents = 0;
  let excuses = 0;
  let absents = 0;
  let dispenses = 0;
  let permutations = 0;
  const classified = [];
  for(const key of populationKeys){
    const decision = classifyGlobalSessionStatut(validByKey.get(key));
    const person = [...personnesById.values()].find((p) => personKey(p, personnesById) === key) || {};
    const rows = (rowsByKey.get(key) || []).slice().sort((a, b) => {
      const ea = eventsById.get(eventId(a));
      const eb = eventsById.get(eventId(b));
      return events.indexOf(ea) - events.indexOf(eb);
    });
    const match = rows.find((row) => {
      const statut = String(row.statut || '').toUpperCase();
      if(!decision) return false;
      if(decision === 'PRESENT') return statut === 'PRESENT' || statut === STATUT_PERMUTATION;
      return statut === decision;
    }) || rows[0] || null;
    if(decision === 'PRESENT'){
      presents += 1;
      if(match && String(match.statut).toUpperCase() === STATUT_PERMUTATION) permutations += 1;
    } else if(decision === 'ABSENT_EXCUSE') excuses += 1;
    else if(decision === 'ABSENT_NON_EXCUSE') absents += 1;
    else if(decision === 'DISPENSE') dispenses += 1;
    classified.push({
      key,
      decision,
      person,
      match,
      rows
    });
  }

  const volumes = {
    presents,
    excuses,
    nonExcuses: absents,
    dispenses,
    permutations,
    nonRenseignes: 0
  };
  const officiel = officialFromVolumes(volumes, events.length);
  const denom = officiel.denominator;
  const population = populationKeys.size;

  const seances = events.map((event) => {
    const eid = eventId(event);
    const localAttendus = (attendus || []).filter((row) => eventId(row) === eid && row.inclus !== false);
    const localParts = (participations || []).filter((row) => eventId(row) === eid && isValidSessionDecision(row));
    const taux = computeTaux(localParts, localAttendus);
    const filled = Number(taux.presents || 0) + Number(taux.excuses || 0) + Number(taux.nonExcuses || 0) + Number(taux.dispenses || 0);
    return {
      eventId: eid,
      date: event.date,
      libelle: event.libelle,
      label: seanceDisplayLabel(event),
      statut: event.statut,
      populationRenseignee: filled,
      presents: taux.presents,
      excuses: taux.excuses,
      absents: taux.nonExcuses,
      dispenses: taux.dispenses,
      percentage: taux.percentage,
      numerator: taux.numerator,
      denominator: taux.denominator,
      nonRenseignes: 0
    };
  });

  const nonParticipants = classified
    .filter((row) => row.decision === 'ABSENT_EXCUSE' || row.decision === 'ABSENT_NON_EXCUSE')
    .map((row) => {
      const person = row.person || {};
      const part = row.match || {};
      const seance = eventsById.get(eventId(part));
      const attendu = (attendus || []).find((a) => personId(a) === personId(person) || personId(a) === personId(part));
      const cible = attendu ? ciblesById.get(String(attendu.cible_id)) : null;
      return {
        grade: person.grade || '',
        nom: person.nom || '',
        prenom: person.prenom || '',
        nip: person.nip || '',
        oi: (cible && (cible.niveau_code || cible.niveauCode)) || '',
        statut: row.decision,
        statutLabel: STATUT_LABELS[row.decision] || row.decision,
        motif: part.motif_absence || part.motifAbsence || null,
        motifLabel: motifLabel(row.decision, part.motif_absence || part.motifAbsence),
        seanceLabel: seance ? (prSessionLabel(seance) || seance.libelle || '') : '',
        seanceDate: seance ? seance.date : ''
      };
    })
    .sort(compareNomPrenomGrade);

  const domaineCode = displayDomaineCode(current.domaine_code || current.domaineCode);
  const exerciseLabel = state.sessionExerciseLabel || sessionExerciseLabel(events, state.groupKey);
  const dates = events.map((event) => String(event.date || '')).filter(Boolean).sort();
  const allRealised = events.every((event) => String(event.statut).toUpperCase() === 'REALISE');
  const signatureRole = signatureRoleForExercise({
    domaineCode,
    typeCycle: cycle && (cycle.type_cycle || cycle.typeCycle),
    libelle: (cycle && cycle.libelle) || current.libelle || exerciseLabel
  });

  const donutPoints = [
    { label: 'Présents', value: presents, token: 'present' },
    { label: 'Excusés', value: excuses, token: 'excuse' },
    { label: 'Absents', value: absents, token: 'nonExcuse' },
    { label: 'Dispensés', value: dispenses, token: 'dispense' }
  ];
  const seanceLabels = seances.map((s) => s.label);
  const share = (count, filled) => (filled ? round1((100 * count) / filled) : 0);

  return {
    kind: 'SESSION',
    domaine: domaineCode,
    exerciseLabel,
    sessionCount: events.length,
    isMultiSession: events.length > 1,
    period: { from: dates[0] || current.date, to: dates[dates.length - 1] || current.date, preset: 'CUSTOM' },
    event: {
      id: eventId(current),
      date: current.date,
      libelle: current.libelle,
      domaine: domaineCode,
      statut: allRealised ? 'REALISE' : current.statut,
      statutLabel: allRealised ? 'Réalisé' : (current.statut === 'PLANIFIE' ? 'Planifié' : current.statut)
    },
    population,
    officiel,
    rates: {
      participation: officiel.percentage,
      excuses: rateOnDenom(excuses, denom),
      absents: rateOnDenom(absents, denom),
      dispenses: rateOnDenom(dispenses, population)
    },
    seances,
    nonParticipants,
    signatureRole,
    graphs: {
      repartition: {
        id: 'session-repartition',
        type: 'donut',
        question: 'Répartition globale des participations',
        series: [{ id: 'repartition', points: donutPoints }]
      },
      tauxSeances: {
        id: 'session-taux',
        type: 'bar',
        question: 'Taux de participation par séance',
        series: [{
          id: 'taux',
          points: seances.map((s) => ({
            label: s.label,
            value: s.percentage,
            numerator: s.numerator,
            denominator: s.denominator
          }))
        }]
      },
      volumesSeances: {
        id: 'session-volumes',
        type: 'grouped',
        question: 'Volumes par statut et par séance',
        categories: seanceLabels,
        series: [
          { label: 'Présents', points: seances.map((s) => ({ label: s.label, value: share(s.presents, s.populationRenseignee) })) },
          { label: 'Excusés', points: seances.map((s) => ({ label: s.label, value: share(s.excuses, s.populationRenseignee) })) },
          { label: 'Absents', points: seances.map((s) => ({ label: s.label, value: share(s.absents, s.populationRenseignee) })) },
          { label: 'Dispensés', points: seances.map((s) => ({ label: s.label, value: share(s.dispenses, s.populationRenseignee) })) }
        ]
      }
    },
    coverage: state.coverage,
    parasiteNonRenseigne: seances.every((s) => s.nonRenseignes === 0)
      && Number((officiel.volumes && officiel.volumes.nonRenseignes) || 0) === 0
  };
}

async function collectMultisessionReport(repo, evenementId){
  const bundle = await loadSessionBundle(repo, evenementId);
  return buildSessionDataset(bundle);
}

module.exports = {
  classifyGlobalSessionStatut,
  signatureRoleForExercise,
  collectMultisessionReport,
  buildSessionDataset,
  loadSessionBundle
};
