const STATUTS_TAUX = new Set(['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE']);
const MOTIFS = new Set(['MALADIE', 'ACCIDENT', 'ARMEE', 'PROFESSIONNEL', 'PRIVE', 'AUTRE']);
const STATUTS_PARTICIPATION = new Set([
  'NON_RENSEIGNE', 'PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'NON_CONCERNE'
]);
const ROLES_ENCADREMENT = new Set(['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE']);
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
  const text = String(value || '').slice(0, 10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function isAffectationValide(affectation, dateEvenement){
  const date = isoDate(dateEvenement);
  const debut = isoDate(affectation.date_debut || affectation.dateDebut);
  const fin = affectation.date_fin || affectation.dateFin || null;
  if(!date || !debut) return false;
  if(debut > date) return false;
  if(fin && isoDate(fin) < date) return false;
  return true;
}

function personneActiveA(personne, dateEvenement){
  if(personne.actif === false) return false;
  const date = isoDate(dateEvenement);
  const sortie = personne.date_sortie || personne.dateSortie || null;
  if(sortie && isoDate(sortie) < date) return false;
  const entree = personne.date_entree || personne.dateEntree || null;
  if(entree && isoDate(entree) > date) return false;
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
  for(const p of participations || []){
    const id = String(p.personne_id || p.personneId);
    if(!inclus.has(id)) continue;
    const statut = p.statut;
    if(statut === 'PRESENT') present += 1;
    else if(statut === 'ABSENT_EXCUSE') excuse += 1;
    else if(statut === 'ABSENT_NON_EXCUSE') absent += 1;
    else if(statut === 'DISPENSE') dispense += 1;
    else if(statut === 'NON_RENSEIGNE') nonRenseigne += 1;
    else if(statut === 'NON_CONCERNE') nonConcerne += 1;
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
    nonConcernes: nonConcerne
  };
}

function validateParticipationPatch(item){
  const statut = String(item.statut || '');
  if(!STATUTS_PARTICIPATION.has(statut)){
    throw new HttpError(422, 'statut_invalide', `Statut de participation invalide : ${statut}.`);
  }
  const motif = item.motif_absence || item.motifAbsence || null;
  const commentaire = item.commentaire || null;
  if(statut === 'ABSENT_EXCUSE'){
    if(!motif || !MOTIFS.has(String(motif))){
      throw new HttpError(422, 'motif_obligatoire', 'Une absence excusée exige un motif du référentiel.');
    }
    if(motif === 'AUTRE' && !String(commentaire || '').trim()){
      throw new HttpError(422, 'commentaire_obligatoire', 'Le motif AUTRE exige un commentaire.');
    }
  }
  return {
    statut,
    motif_absence: statut === 'ABSENT_EXCUSE' ? String(motif) : null,
    commentaire: commentaire ? String(commentaire) : null
  };
}

function validateCloture(evenement, attendus, participations){
  const errors = [];
  if(!evenement) errors.push({ code: 'evenement_introuvable', message: 'Événement introuvable.' });
  else {
    if(evenement.statut !== 'PLANIFIE') errors.push({ code: 'statut_invalide', message: 'La clôture n’est possible que depuis PLANIFIE.' });
    if(!evenement.population_figee) errors.push({ code: 'population_non_figee', message: 'La population n’est pas figée.' });
    if(evenement.origine === 'LEGACY_AGGREGATED') errors.push({ code: 'legacy', message: 'Un événement legacy agrégé ne peut pas être clôturé nominativement.' });
  }
  const byPersonne = new Map((participations || []).map(p => [String(p.personne_id), p]));
  for(const attendu of (attendus || []).filter(a => a.inclus !== false)){
    const p = byPersonne.get(String(attendu.personne_id));
    if(!p || p.statut === 'NON_RENSEIGNE'){
      errors.push({ code: 'non_renseigne', personne_id: attendu.personne_id, message: 'Une personne attendue est encore NON_RENSEIGNE.' });
      continue;
    }
    try { validateParticipationPatch(p); }
    catch(error){
      if(error instanceof HttpError) errors.push({ code: error.error, personne_id: attendu.personne_id, message: error.message });
      else throw error;
    }
  }
  if(errors.length){
    throw new HttpError(422, 'cloture_refusee', 'Clôture refusée.', { errors });
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
  validateParticipationPatch,
  validateCloture,
  rangesOverlap,
  STATUTS_TAUX,
  MOTIFS,
  STATUTS_PARTICIPATION,
  ROLES_ENCADREMENT,
  ROLES_EXCEPTION
};
