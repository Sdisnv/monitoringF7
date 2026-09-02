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

function yearBoundsFromDate(date){
  const y = String(date || '').slice(0, 4);
  if(!/^\d{4}$/.test(y)) return null;
  return { from: `${y}-01-01`, to: `${y}-12-31`, preset: 'YEAR' };
}

function dateInPeriod(date, period){
  const d = String(date || '').slice(0, 10);
  if(!period || !period.from || !period.to) return true;
  return d >= period.from && d <= period.to;
}

function canonicalExerciseKey(event){
  const domaine = displayDomaineCode(event && (event.domaine_code || event.domaineCode));
  const group = prExerciseGroupKey(event);
  const gm = String(group || '').match(/:(PR|AUTO|FOBA|FOCA|DPS|DAP|JSP):(\d+)\s*$/i);
  if(gm) return `${displayDomaineCode(gm[1])}:${gm[2]}`;
  const label = sessionExerciseLabel([event], group);
  const lm = String(label || '').match(/^(PR|AUTO|FOBA|FOCA)\s+(\d+)$/i);
  if(lm) return `${String(lm[1]).toUpperCase()}:${lm[2]}`;
  return `${domaine}:${String(label || '').toUpperCase()}`;
}

function specializationForDomaine(domaine){
  return displayDomaineCode(domaine) === 'PR' ? 'PAPR' : '';
}

function readingNotesFor(domaine, typeCycle){
  const d = displayDomaineCode(domaine);
  const type = String(typeCycle || '').toUpperCase();
  const notes = [{
    id: 'FORMATEUR',
    title: 'Formateur',
    text: 'Le personnel engagé comme formateur est affiché séparément de l’effectif participant selon les règles du domaine. Lorsqu’un formateur appartient également à la population évaluée et possède un statut de participation valable, il ne doit pas être compté deux fois.'
  }];
  if(d === 'PR'){
    notes.push({
      id: 'SURVEILLANT',
      title: 'Surveillant',
      text: 'Pour PR : le Surveillant est une fonction d’encadrement exercée par un participant PAPR ; il ne constitue pas une personne supplémentaire dans l’effectif.'
    });
  }
  if(d === 'PR' || d === 'AUTO' || d === 'FOBA' || d === 'FOCA' || type.includes('FORMATION')){
    notes.push({
      id: 'AUXILIAIRE',
      title: 'Auxiliaire',
      text: 'Un auxiliaire est une fonction d’appui. Il ne doit pas être intégré aux effectifs de participation statistique.'
    });
  }
  if(d === 'JSP'){
    notes.push({
      id: 'MONITEUR',
      title: 'Moniteur',
      text: 'Pour JSP, le moniteur est informatif : il n’entre ni dans la population suivie des jeunes ni dans le taux officiel.'
    });
  }
  notes.push(
    {
      id: 'EXCUSE',
      title: 'Excusé',
      text: 'Une personne excusée n’a pas participé à l’exercice. Son absence est documentée par un motif reconnu.'
    },
    {
      id: 'DISPENSE',
      title: 'Dispensé',
      text: 'Une personne dispensée est exclue de l’obligation de participation à la séance concernée selon un motif reconnu. Elle n’est pas traitée comme absente dans le taux officiel : le moteur SCOPE l’exclut du dénominateur.'
    },
    {
      id: 'ABSENT',
      title: 'Absent',
      text: 'Une personne absente n’a pas participé et ne dispose pas d’un motif d’excuse ou de dispense reconnu.'
    }
  );
  return notes;
}

const TAUX_EXPLANATION = 'Le taux de participation compare le nombre de personnes ayant effectivement participé à l’exercice avec le nombre de personnes statistiquement attendues. Les personnes dispensées sont exclues du calcul lorsque la règle métier prévoit qu’elles ne sont pas soumises à l’obligation de participation. Les personnes excusées et absentes restent prises en compte dans le dénominateur conformément aux règles SCOPE. Une personne participant à plusieurs séances d’un même exercice n’est comptée qu’une seule fois dans le bilan global.';

function formatPctFr(value){
  if(value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return text.replace('.', ',');
}

function buildConclusion({ percentage, objectiveThreshold, domaine, nonParticipants }){
  const tauxText = formatPctFr(percentage);
  const paragraphs = [];
  if(tauxText == null){
    paragraphs.push('L’analyse des présences ne permet pas d’établir un taux de participation global évaluable.');
  } else if(objectiveThreshold == null || !Number.isFinite(Number(objectiveThreshold))){
    paragraphs.push(`L’analyse des présences démontre un taux de participation global de ${tauxText} %. Aucun objectif de participation n’est configuré pour ce périmètre dans SCOPE.`);
  } else {
    const obj = Number(objectiveThreshold);
    const gap = round1(Number(percentage) - obj);
    const objText = formatPctFr(obj);
    paragraphs.push(`L’analyse des présences démontre un taux de participation global de ${tauxText} %.`);
    if(gap === 0){
      paragraphs.push(`Le taux atteint l’objectif fixé à ${objText} %.`);
    } else if(gap < 0){
      paragraphs.push(`Il se situe ${formatPctFr(Math.abs(gap))} points de pourcentage en dessous de l’objectif de participation fixé à ${objText} %. Des mesures seront prises afin d’améliorer le taux de participation aux exercices.`);
    } else {
      paragraphs.push(`Le taux de participation global se situe ${formatPctFr(gap)} points de pourcentage au-dessus de l’objectif fixé à ${objText} %. L’ensemble du personnel assigné est remercié pour son engagement au profit du SDIS régional du Nord vaudois.`);
    }
  }
  const prSuspension = displayDomaineCode(domaine) === 'PR' && nonParticipants && nonParticipants.length
    ? 'Le personnel suivant n’ayant pas participé à cet exercice est suspendu, avec effet dès la fin de la dernière séance de l’exercice, de l’engagement opérationnel en qualité de porteur d’appareil de protection respiratoire (PAPR), jusqu’à sa prochaine participation à un exercice PR :'
    : '';
  if(prSuspension) paragraphs.push(prSuspension);
  return { paragraphs, prSuspension };
}

function mapNominativeRow(row, eventsById, attendus, ciblesById){
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
    .map((row) => mapNominativeRow(row, eventsById, attendus, ciblesById))
    .sort(compareNomPrenomGrade);

  const dispensesList = classified
    .filter((row) => row.decision === 'DISPENSE')
    .map((row) => mapNominativeRow(row, eventsById, attendus, ciblesById))
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
    dispenses: dispensesList,
    signatureRole,
    specialization: specializationForDomaine(domaineCode),
    sessionCountLabel: `${events.length} séance${events.length > 1 ? 's' : ''}`,
    canonicalKey: canonicalExerciseKey(current),
    graphs: {
      repartition: {
        id: 'session-repartition',
        type: 'donut',
        legendPlacement: 'bottom',
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
          { label: 'Présents', token: 'present', points: seances.map((s) => ({ label: s.label, value: share(s.presents, s.populationRenseignee) })) },
          { label: 'Excusés', token: 'excuse', points: seances.map((s) => ({ label: s.label, value: share(s.excuses, s.populationRenseignee) })) },
          { label: 'Absents', token: 'nonExcuse', points: seances.map((s) => ({ label: s.label, value: share(s.absents, s.populationRenseignee) })) },
          { label: 'Dispensés', token: 'dispense', points: seances.map((s) => ({ label: s.label, value: share(s.dispenses, s.populationRenseignee) })) }
        ]
      },
      historique: null
    },
    coverage: state.coverage,
    parasiteNonRenseigne: seances.every((s) => s.nonRenseignes === 0)
      && Number((officiel.volumes && officiel.volumes.nonRenseignes) || 0) === 0
  };
}

function subsetBundle(bundle, events){
  const ids = new Set(events.map(eventId));
  const attendus = (bundle.attendus || []).filter((row) => ids.has(eventId(row)));
  const participations = (bundle.participations || []).filter((row) => ids.has(eventId(row)));
  const current = events[0] || bundle.current;
  return {
    current,
    events,
    attendus,
    participations,
    personnes: bundle.personnes,
    cibles: bundle.cibles,
    cycle: bundle.cycle,
    state: computeSessionParticipationState({
      evenements: events,
      currentEventId: eventId(current),
      currentEvent: current,
      attendus,
      participations,
      personnes: bundle.personnes,
      cycle: bundle.cycle || {}
    }),
    ids: [...ids]
  };
}

function historiqueDataset(points){
  const years = points.map((p) => String(p.year));
  return {
    id: 'session-historique',
    type: 'grouped',
    question: 'Évolution / comparaison historique',
    categories: years,
    series: [
      { label: 'Taux de participation', token: 'present', points: points.map((p) => ({ label: String(p.year), value: p.participation })) },
      { label: 'Taux Excusés', token: 'excuse', points: points.map((p) => ({ label: String(p.year), value: p.excuses })) },
      { label: 'Taux Absents', token: 'nonExcuse', points: points.map((p) => ({ label: String(p.year), value: p.absents })) },
      { label: 'Taux Dispensés', token: 'dispense', points: points.map((p) => ({ label: String(p.year), value: p.dispenses })) }
    ]
  };
}

async function collectHistoricalPoints(repo, { domaine, canonicalKey, currentYear, currentRates }){
  if(!canonicalKey || !currentYear) return [];
  const candidates = typeof repo.listEvenements === 'function'
    ? await repo.listEvenements({ domaine })
    : [];
  const peers = (candidates || []).filter((event) => {
    const year = Number(String(event.date || '').slice(0, 4));
    if(!Number.isFinite(year) || year > Number(currentYear)) return false;
    return canonicalExerciseKey(event) === canonicalKey;
  });
  const years = [...new Set(peers.map((event) => String(event.date).slice(0, 4)))].sort();
  const ids = peers.filter((event) => String(event.date).slice(0, 4) !== String(currentYear)).map(eventId);
  let attendus = [];
  let participations = [];
  let personnes = [];
  let cibles = [];
  if(ids.length){
    [attendus, participations, personnes, cibles] = await Promise.all([
      repo.listAttendusForEvents ? repo.listAttendusForEvents(ids) : [],
      repo.listParticipationsForEvents ? repo.listParticipationsForEvents(ids) : [],
      repo.listPersonnes ? repo.listPersonnes({}) : [],
      repo.listCibles ? repo.listCibles() : []
    ]);
  }
  const points = [];
  for(const year of years){
    if(year === String(currentYear)){
      points.push({
        year,
        participation: currentRates.participation,
        excuses: currentRates.excuses,
        absents: currentRates.absents,
        dispenses: currentRates.dispenses
      });
      continue;
    }
    const events = sortSessionEvents(peers.filter((event) => String(event.date).slice(0, 4) === year));
    if(!events.length) continue;
    const yearIds = new Set(events.map(eventId));
    const dataset = buildSessionDataset({
      current: events[0],
      events,
      attendus: attendus.filter((row) => yearIds.has(eventId(row))),
      participations: participations.filter((row) => yearIds.has(eventId(row))),
      personnes,
      cibles,
      cycle: {},
      state: computeSessionParticipationState({
        evenements: events,
        currentEventId: eventId(events[0]),
        currentEvent: events[0],
        attendus: attendus.filter((row) => yearIds.has(eventId(row))),
        participations: participations.filter((row) => yearIds.has(eventId(row))),
        personnes,
        cycle: {}
      })
    });
    points.push({
      year,
      participation: dataset.rates.participation,
      excuses: dataset.rates.excuses,
      absents: dataset.rates.absents,
      dispenses: dataset.rates.dispenses
    });
  }
  return points;
}

async function collectMultisessionReport(repo, evenementId, options = {}){
  const bundle = await loadSessionBundle(repo, evenementId);
  const currentDate = bundle.current && bundle.current.date;
  const defaultPeriod = yearBoundsFromDate(currentDate);
  const period = options.period || defaultPeriod;
  const inPeriodEvents = (bundle.events || []).filter((event) => dateInPeriod(event.date, period));
  const primaryEvents = inPeriodEvents.length
    ? inPeriodEvents
    : (bundle.events || []).filter((event) => dateInPeriod(event.date, defaultPeriod));
  const primary = subsetBundle(bundle, primaryEvents.length ? primaryEvents : [bundle.current]);
  const dataset = buildSessionDataset(primary);
  dataset.period = period;
  dataset.periodStrict = {
    from: period.from,
    to: period.to,
    eventDates: (primary.events || []).map((event) => String(event.date).slice(0, 10))
  };
  const currentYear = String((period && period.to) || currentDate || '').slice(0, 4);
  const historyPoints = await collectHistoricalPoints(repo, {
    domaine: dataset.domaine,
    canonicalKey: dataset.canonicalKey,
    currentYear,
    currentRates: dataset.rates
  });
  dataset.graphs.historique = historyPoints.length ? historiqueDataset(historyPoints) : null;
  dataset.historyYears = historyPoints.map((p) => p.year);
  const { resolveObjective } = require('./_scope-objectives');
  const objectives = typeof repo.listObjectifs === 'function' ? await repo.listObjectifs({ actif: true }) : [];
  const last = primary.events[primary.events.length - 1];
  const objective = resolveObjective({
    date: (last && last.date) || currentDate,
    domaineCode: dataset.domaine,
    analysisGrain: 'DOMAINE',
    objectives
  });
  dataset.objective = objective && Number.isFinite(Number(objective.thresholdPct)) ? objective : null;
  const conclusion = buildConclusion({
    percentage: dataset.officiel && dataset.officiel.percentage,
    objectiveThreshold: dataset.objective && dataset.objective.thresholdPct,
    domaine: dataset.domaine,
    nonParticipants: dataset.nonParticipants
  });
  dataset.conclusion = conclusion.paragraphs;
  dataset.prSuspensionText = conclusion.prSuspension;
  dataset.readingNotes = readingNotesFor(dataset.domaine, primary.cycle && (primary.cycle.type_cycle || primary.cycle.typeCycle));
  dataset.tauxExplanation = TAUX_EXPLANATION;
  let signer = null;
  if(displayDomaineCode(dataset.domaine) === 'PR' && typeof repo.getPersonneByNip === 'function'){
    signer = await repo.getPersonneByNip('1506');
  }
  dataset.signaturePerson = signer ? {
    grade: signer.grade || '',
    prenom: signer.prenom || '',
    nom: signer.nom || '',
    nip: signer.nip || '1506'
  } : (displayDomaineCode(dataset.domaine) === 'PR' ? { grade: '', prenom: '', nom: '', nip: '1506' } : null);
  dataset.signatureImage = displayDomaineCode(dataset.domaine) === 'PR' ? 'MCE_Signature.png' : null;
  dataset.signatureFunction = displayDomaineCode(dataset.domaine) === 'PR'
    ? 'CHEF PROTECTION RESPIRATOIRE'
    : dataset.signatureRole;
  return dataset;
}

module.exports = {
  classifyGlobalSessionStatut,
  signatureRoleForExercise,
  canonicalExerciseKey,
  readingNotesFor,
  buildConclusion,
  TAUX_EXPLANATION,
  collectMultisessionReport,
  buildSessionDataset,
  loadSessionBundle
};
