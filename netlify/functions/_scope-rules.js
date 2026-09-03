const {
  MOTIFS_CANONIQUES,
  MOTIFS_JSP,
  MOTIFS_HISTORIQUES,
  MOTIFS_DISPENSE,
  MOTIFS_ACCEPTES: MOTIFS_LECTURE,
  STATUT_PERMUTATION,
  normalizeMotifKey,
  emptyExcuseBreakdown
} = require('./_scope-model');

const STATUTS_TAUX = new Set(['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', STATUT_PERMUTATION]);
const MOTIFS = new Set([
  ...Object.values(MOTIFS_CANONIQUES),
  ...Object.values(MOTIFS_JSP),
  ...Object.values(MOTIFS_HISTORIQUES)
]);
const MOTIFS_DISPENSE_SET = new Set(Object.values(MOTIFS_DISPENSE));
const STATUTS_PARTICIPATION = new Set([
  'NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'NON_CONCERNE',
  STATUT_PERMUTATION
]);
const ENCADREMENT_ROLE_ORDER = Object.freeze(['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
const ROLES_ENCADREMENT = new Set(ENCADREMENT_ROLE_ORDER);
const ROLES_EXCEPTION = new Set(['RENFORT', 'REMPLACANT', 'PARTICIPANT']);

class HttpError extends Error {
  constructor(status, error, message, details){
    super(message);
    this.status = status;
    this.error = error;
    this.details = details || null;
  }
}

function isoDate(value){
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(iso){
    if(!isValidYmd(iso[1], iso[2], iso[3])) return null;
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const eu = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if(!eu) return null;
  const day = eu[1].padStart(2, '0');
  const month = eu[2].padStart(2, '0');
  const year = eu[3];
  if(!isValidYmd(year, month, day)) return null;
  return `${year}-${month}-${day}`;
}

function isValidYmd(year, month, day){
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if(!Number.isInteger(y) || y < 1000 || y > 9999) return false;
  if(!Number.isInteger(m) || m < 1 || m > 12) return false;
  if(!Number.isInteger(d) || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isAffectationValide(affectation, dateEvenement){
  const date = isoDate(dateEvenement);
  const debut = isoDate(affectation.date_debut || affectation.dateDebut || affectation.date_actif || affectation.dateActif);
  const fin = affectation.date_fin || affectation.dateFin || affectation.date_inactif || affectation.dateInactif || null;
  if(!date || !debut) return false;
  if(debut > date) return false;
  if(fin && isoDate(fin) < date) return false;
  return true;
}

function personneActiveA(personne, dateEvenement){
  const date = isoDate(dateEvenement);
  if(!date || !personne) return false;
  const sortie = personne.date_sortie || personne.dateSortie || null;
  if(sortie && isoDate(sortie) < date) return false;
  const entree = personne.date_entree || personne.dateEntree || null;
  if(entree && isoDate(entree) > date) return false;
  if(personne.actif === false && !sortie && !entree) return false;
  return true;
}

function round1(value){
  return Math.round(value * 10) / 10;
}

function computeTaux(participations, attendus){
  const inclus = new Set(
    (attendus || [])
      .filter(a => a.inclus !== false)
      .map(a => String(a.personne_id || a.personneId))
  );
  let present = 0;
  let excuse = 0;
  let absent = 0;
  let dispense = 0;
  let nonRenseigne = 0;
  let nonConcerne = 0;
  let permutations = 0;
  const excuses = emptyExcuseBreakdown();
  for(const p of participations || []){
    const id = String(p.personne_id || p.personneId);
    if(!inclus.has(id)) continue;
    const statut = p.statut;
    if(statut === 'PRESENT' || statut === STATUT_PERMUTATION){
      present += 1;
      if(statut === STATUT_PERMUTATION) permutations += 1;
    }
    else if(statut === 'ABSENT_EXCUSE'){
      excuse += 1;
      excuses[normalizeMotifKey(p.motif_absence)] += 1;
    }
    else if(statut === 'ABSENT_NON_EXCUSE') absent += 1;
    else if(statut === 'DISPENSE') dispense += 1;
    else if(statut === 'NON_RENSEIGNE' || statut === 'NON_CONCERNE' || !statut) nonRenseigne += 1;
  }
  const numerator = present;
  const denominator = present + excuse + absent;
  return {
    numerator,
    denominator,
    percentage: denominator === 0 ? null : round1((100 * numerator) / denominator),
    presents: present,
    excuses: excuse,
    nonExcuses: absent,
    dispenses: dispense,
    nonRenseignes: nonRenseigne,
    nonConcernes: nonConcerne,
    permutations,
    excusesPrive: excuses.prive,
    excusesProfessionnel: excuses.professionnel,
    excusesArmee: excuses.armee,
    excusesAccidentMaladie: excuses.accidentMaladie,
    excusesNonPrecise: excuses.nonPrecise
  };
}

function normalizeDomaineForContribution(value){
  const domaine = String(value || '').toUpperCase();
  if(domaine === 'PR') return 'PAPR';
  return domaine;
}

function getEncadrementContribution({ domaine, role, contexte } = {}){
  const d = normalizeDomaineForContribution(domaine);
  const r = String(role || '').toUpperCase();
  const session = String((contexte && (contexte.type || contexte.kind)) || '').toUpperCase() === 'SESSION';
  const base = {
    role: r,
    domaine: d,
    countsPopulationSuivie: false,
    countsTauxPresence: false,
    countsEffectifEngageEvenement: false,
    countsEffectifConsolideSession: false,
    informatifSeulement: true,
    dedupeByNip: true,
    note: ''
  };
  if(r === 'AUXILIAIRE'){
    return { ...base, note: 'AUXILIAIRE visible en encadrement, jamais contributif aux effectifs métier.' };
  }
  if(r === 'MONITEUR'){
    return {
      ...base,
      informatifSeulement: true,
      note: d === 'JSP'
        ? 'JSP suit uniquement les jeunes; MONITEUR est informatif hors population et hors taux.'
        : 'MONITEUR est réservé au contrat JSP standard.'
    };
  }
  if(r === 'SURVEILLANT'){
    return {
      ...base,
      informatifSeulement: true,
      note: d === 'PAPR'
        ? 'SURVEILLANT PAPR est un rôle complémentaire; aucun ajout effectif et aucune double comptabilisation NIP.'
        : 'SURVEILLANT est pertinent uniquement pour PAPR/PR.'
    };
  }
  if(r === 'FORMATEUR'){
    return {
      ...base,
      countsEffectifEngageEvenement: d === 'DPS' || d === 'DAP',
      countsEffectifConsolideSession: session && (d === 'AUTO' || d === 'PAPR'),
      informatifSeulement: !(d === 'DPS' || d === 'DAP' || (session && (d === 'AUTO' || d === 'PAPR'))),
      note: d === 'DPS' || d === 'DAP'
        ? 'FORMATEUR hors population peut contribuer à l’effectif engagé événement, sans toucher au taux.'
        : (d === 'AUTO' || d === 'PAPR')
          ? 'FORMATEUR prévu pour le futur effectif consolidé session, dédupliqué par NIP.'
          : 'FORMATEUR visible en encadrement hors population suivie.'
    };
  }
  return { ...base, dedupeByNip: false, note: 'Rôle non reconnu dans le référentiel encadrement standard.' };
}

function idOfPersonne(row){
  return String(row && (row.personne_id || row.personneId) || '');
}

function nipOfParticipation(row, personnesById){
  const id = idOfPersonne(row);
  const person = personnesById && personnesById.get ? personnesById.get(id) : null;
  return String((person && person.nip) || row.nip || id);
}

function computeEffectifEngageEvenement({ domaine, attendus, participations, personnes } = {}){
  const attenduIds = new Set((attendus || []).filter(a => a.inclus !== false).map(idOfPersonne));
  const personnesById = new Map(Object.entries(personnes || {}).map(([id, p]) => [String(id), p]));
  const nips = new Set();
  for(const p of participations || []){
    const id = idOfPersonne(p);
    if(!id) continue;
    const statut = p.statut;
    if(attenduIds.has(id) && (statut === 'PRESENT' || statut === 'PERMUTATION')){
      nips.add(nipOfParticipation(p, personnesById));
      continue;
    }
    const contribution = getEncadrementContribution({ domaine, role: p.role });
    if(ROLES_ENCADREMENT.has(String(p.role || '').toUpperCase()) && contribution.countsEffectifEngageEvenement){
      nips.add(nipOfParticipation(p, personnesById));
    }
  }
  return { count: nips.size, nips: [...nips].sort() };
}

function validateParticipationPatch(item, ctx = {}){
  const statut = String(item.statut || '');
  if(!STATUTS_PARTICIPATION.has(statut)){
    throw new HttpError(422, 'statut_invalide', `Statut de participation invalide : ${statut}.`);
  }
  const motif = item.motif_absence || item.motifAbsence || null;
  const commentaire = item.commentaire || null;
  const cibleSuivie = item.cible_suivie_id || item.cibleSuivieId || null;
  if(statut === STATUT_PERMUTATION){
    const domaine = String(ctx.domaineCode || ctx.domaine_code || '').toUpperCase();
    if(domaine && domaine !== 'DAP'){
      throw new HttpError(422, 'permutation_hors_dap', 'La permutation n’est définie que pour le domaine DAP.');
    }
    if(motif){
      throw new HttpError(422, 'permutation_sans_motif', 'Une permutation n’est pas une absence : aucun motif d’excuse.');
    }
    return {
      statut,
      motif_absence: null,
      commentaire: commentaire ? String(commentaire) : null,
      cible_suivie_id: cibleSuivie || null
    };
  }
  if(statut === 'DISPENSE'){
    if(motif && !MOTIFS_DISPENSE_SET.has(String(motif))){
      throw new HttpError(422, 'motif_dispense_invalide', 'Le motif de dispense doit appartenir au référentiel (Joker, Formateur PR, Formation hors SDIS, Pas concerné).');
    }
    return {
      statut,
      motif_absence: motif ? String(motif) : null,
      commentaire: commentaire ? String(commentaire) : null,
      cible_suivie_id: null
    };
  }
  if(statut === 'ABSENT_EXCUSE'){
    if(!motif || !MOTIFS.has(String(motif))){
      throw new HttpError(422, 'motif_obligatoire', 'Une absence excusée exige un motif du référentiel (privé, professionnel, armée, accident/maladie).');
    }
    if(motif === 'AUTRE' && !String(commentaire || '').trim()){
      throw new HttpError(422, 'commentaire_obligatoire', 'Le motif AUTRE exige un commentaire.');
    }
  }
  return {
    statut,
    motif_absence: statut === 'ABSENT_EXCUSE' || statut === 'DISPENSE' ? String(motif) : null,
    commentaire: commentaire ? String(commentaire) : null,
    cible_suivie_id: null
  };
}

function isUnsetExpectedStatut(statut){
  const value = String(statut || 'NON_RENSEIGNE').toUpperCase();
  return !value || value === 'NON_RENSEIGNE' || value === 'NON_CONCERNE';
}

function motifOf(row){
  return String((row && (row.motif_absence || row.motifAbsence || row.motif)) || '').trim();
}

function hasValidClosureStatus(participation){
  const statut = String((participation && participation.statut) || '').toUpperCase();
  if(statut === 'PRESENT' || statut === STATUT_PERMUTATION || statut === 'ABSENT_NON_EXCUSE') return true;
  if(statut === 'ABSENT_EXCUSE') return MOTIFS.has(motifOf(participation));
  if(statut === 'DISPENSE'){
    const motif = motifOf(participation);
    return !motif || MOTIFS_DISPENSE_SET.has(motif);
  }
  return false;
}

function incompleteClosureReason(attendu, participation){
  if(!countsInEventEffectif(attendu, participation)) return null;
  if(!participation || isUnsetExpectedStatut(participation.statut)) return 'unset';
  return null;
}

function sessionLockedRow(row){
  return Boolean(row && (row.alreadyCountedInSession || row.already_counted_in_session || row.sessionExcuse || row.sessionDispense));
}

function incompleteExpectedParticipations(attendus, participations){
  const byPersonne = new Map((participations || []).map((row) => [String(row.personne_id || row.personneId), row]));
  const pending = [];
  for(const attendu of attendus || []){
    const participation = byPersonne.get(String(attendu.personne_id || attendu.personneId));
    const reason = incompleteClosureReason(attendu, participation);
    if(!reason) continue;
    pending.push({
      personneId: String(attendu.personne_id || attendu.personneId || ''),
      reason,
      attendu,
      participation: participation || null
    });
  }
  return pending;
}

function countsInEventEffectif(attendu, participation){
  if(!attendu || attendu.inclus === false) return false;
  const jsp = String(attendu.jspRole || attendu.jsp_role || '').toUpperCase();
  if(jsp === 'MONITEUR') return false;
  const role = String((participation && participation.role) || 'PARTICIPANT').toUpperCase();
  if(role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
  return true;
}

function expectedPopulationCoherence(attendus, participations){
  const byPersonne = new Map((participations || []).map((row) => [String(row.personne_id || row.personneId), row]));
  let expected = 0;
  let filled = 0;
  let pending = 0;
  const pendingIds = [];
  for(const attendu of attendus || []){
    const participation = byPersonne.get(String(attendu.personne_id || attendu.personneId));
    if(!countsInEventEffectif(attendu, participation)) continue;
    expected += 1;
    if(incompleteClosureReason(attendu, participation)){
      pending += 1;
      pendingIds.push(String(attendu.personne_id || attendu.personneId));
    } else filled += 1;
  }
  return {
    expected,
    filled,
    pending,
    pendingIds,
    identity: expected === filled + pending
  };
}

function validateCloture(evenement, attendus, participations, options = {}){
  const errors = [];
  if(!evenement) errors.push({ code: 'evenement_introuvable', message: 'Événement introuvable.' });
  else {
    if(evenement.statut !== 'PLANIFIE') errors.push({ code: 'statut_invalide', message: 'La clôture n’est possible que depuis PLANIFIE.' });
    if(!evenement.population_figee) errors.push({ code: 'population_non_figee', message: 'La population n’est pas figée.' });
    if(evenement.origine === 'LEGACY_AGGREGATED') errors.push({ code: 'legacy', message: 'Un événement legacy agrégé ne peut pas être clôturé nominativement.' });
  }
  const byPersonne = new Map((participations || []).map(p => [String(p.personne_id || p.personneId), p]));
  const incomplete = incompleteExpectedParticipations(attendus, participations);
  if(options.requireExpectedFilled !== false && incomplete.length > 0){
    errors.push({
      code: 'saisie_incomplete',
      message: 'Chaque personne attendue sans statut valable doit être renseignée avant clôture.',
      pending: incomplete.length,
      pendingIds: incomplete.map((row) => row.personneId)
    });
  }
  for(const attendu of (attendus || []).filter(a => a.inclus !== false)){
    const p = byPersonne.get(String(attendu.personne_id || attendu.personneId));
    if(!p || isUnsetExpectedStatut(p.statut)) continue;
    if(!countsInEventEffectif(attendu, p)) continue;
    try { validateParticipationPatch(p, { domaineCode: evenement && evenement.domaine_code }); }
    catch(error){
      if(error instanceof HttpError) errors.push({ code: error.error, personne_id: attendu.personne_id, message: error.message });
      else throw error;
    }
  }
  if(errors.length){
    throw new HttpError(422, 'cloture_refusee', 'Clôture refusée.', { errors, pendingPeople: incomplete });
  }
}

function rangesOverlap(aDebut, aFin, bDebut, bFin){
  const aEnd = aFin || '9999-12-31';
  const bEnd = bFin || '9999-12-31';
  return aDebut <= bEnd && bDebut <= aEnd;
}

module.exports = {
  HttpError,
  isoDate,
  isAffectationValide,
  personneActiveA,
  computeTaux,
  round1,
  validateParticipationPatch,
  validateCloture,
  isUnsetExpectedStatut,
  hasValidClosureStatus,
  incompleteExpectedParticipations,
  countsInEventEffectif,
  expectedPopulationCoherence,
  rangesOverlap,
  STATUTS_TAUX,
  MOTIFS,
  MOTIFS_LECTURE,
  MOTIFS_DISPENSE: MOTIFS_DISPENSE_SET,
  STATUTS_PARTICIPATION,
  ROLES_ENCADREMENT,
  ENCADREMENT_ROLE_ORDER,
  getEncadrementContribution,
  computeEffectifEngageEvenement,
  ROLES_EXCEPTION
};
