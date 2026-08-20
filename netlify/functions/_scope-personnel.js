'use strict';
/**
 * SCOPE-MODEL-2-R1 — personnel temporel.
 * L’identité (scope_personnes / NIP) est stable.
 * Les périodes décrivent l’éligibilité À UNE DATE.
 * Une indisponibilité RH n’est pas une excuse d’exercice.
 */
const { isoDate, rangesOverlap, HttpError } = require('./_scope-rules');

const TYPES_PERIODE = Object.freeze({
  ACTIF: 'ACTIF',
  INDISPONIBLE: 'INDISPONIBLE',
  SORTI: 'SORTI',
  DEMISSIONNAIRE: 'DEMISSIONNAIRE'
});

const MOTIFS_INDISPONIBLE = Object.freeze({
  CONGE_SABBATIQUE: 'CONGE_SABBATIQUE',
  AUTRE: 'AUTRE'
});

function addDays(date, days){
  const day = isoDate(date);
  if(!day) return null;
  const dt = new Date(`${day}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

function dayBefore(date){
  return addDays(date, -1);
}

function periodCovers(periode, date){
  const day = isoDate(date);
  const debut = isoDate(periode.date_debut || periode.dateDebut);
  const rawFin = periode.date_fin || periode.dateFin;
  const fin = rawFin ? isoDate(rawFin) : null;
  if(!day || !debut) return false;
  if(debut > day) return false;
  if(fin && fin < day) return false;
  return true;
}

function evaluateEligibility(personne, periodes, date){
  const day = isoDate(date);
  if(!day) return { eligible: false, reason: 'date_invalide' };
  const covering = (periodes || []).filter((row) => periodCovers(row, day));
  if(covering.some((row) => row.type === TYPES_PERIODE.INDISPONIBLE)){
    const row = covering.find((item) => item.type === TYPES_PERIODE.INDISPONIBLE);
    return {
      eligible: false,
      reason: 'indisponible',
      motif: row.motif || MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE
    };
  }
  if(covering.some((row) => row.type === TYPES_PERIODE.ACTIF)){
    return { eligible: true, reason: 'actif' };
  }
  if(covering.some((row) => row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE)){
    const row = covering.find((item) => item.type === TYPES_PERIODE.SORTI || item.type === TYPES_PERIODE.DEMISSIONNAIRE);
    return { eligible: false, reason: row.type === TYPES_PERIODE.DEMISSIONNAIRE ? 'demissionnaire' : 'sorti' };
  }
  return fallbackDates(personne, day);
}

function fallbackDates(personne, day){
  if(!personne) return { eligible: false, reason: 'personne_absente' };
  const sortie = personne.date_sortie || personne.dateSortie || null;
  if(sortie && isoDate(sortie) < day) return { eligible: false, reason: 'sorti' };
  const entree = personne.date_entree || personne.dateEntree || null;
  if(entree && isoDate(entree) > day) return { eligible: false, reason: 'non_arrive' };
  if(personne.actif === false && !sortie && !entree) return { eligible: false, reason: 'inactif' };
  return { eligible: true, reason: 'fallback_dates' };
}

function assertPeriodCompatible(existing, next){
  const type = String(next.type || '').toUpperCase();
  if(!Object.prototype.hasOwnProperty.call(TYPES_PERIODE, type) && !Object.values(TYPES_PERIODE).includes(type)){
    throw new HttpError(422, 'type_periode_invalide', 'Type de période RH invalide.');
  }
  const debut = isoDate(next.date_debut || next.dateDebut);
  const rawFin = next.date_fin || next.dateFin;
  const fin = rawFin ? isoDate(rawFin) : null;
  if(!debut) throw new HttpError(400, 'date_debut_obligatoire', 'La date de début de période est obligatoire.');
  if(fin && fin < debut) throw new HttpError(422, 'dates_incoherentes', 'La fin de période ne peut pas précéder le début.');
  if(type === TYPES_PERIODE.INDISPONIBLE){
    const motif = String(next.motif || MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE).toUpperCase();
    if(!Object.values(MOTIFS_INDISPONIBLE).includes(motif)){
      throw new HttpError(422, 'motif_indisponible_invalide', 'Motif d’indisponibilité invalide.');
    }
  }
  const sameKind = (existing || []).filter((row) => {
    if(type === TYPES_PERIODE.INDISPONIBLE) return row.type === TYPES_PERIODE.INDISPONIBLE;
    if(type === TYPES_PERIODE.ACTIF) return row.type === TYPES_PERIODE.ACTIF;
    return row.type === TYPES_PERIODE.SORTI || row.type === TYPES_PERIODE.DEMISSIONNAIRE;
  });
  for(const row of sameKind){
    if(next.periode_id && row.periode_id === next.periode_id) continue;
    if(rangesOverlap(row.date_debut, row.date_fin, debut, fin)){
      throw new HttpError(422, 'chevauchement_periode', 'Chevauchement de périodes RH du même type.');
    }
  }
  return { type, date_debut: debut, date_fin: fin, motif: next.motif || (type === TYPES_PERIODE.INDISPONIBLE ? MOTIFS_INDISPONIBLE.CONGE_SABBATIQUE : null) };
}

function deriveStatutCourant(periodes, today){
  const day = isoDate(today) || isoDate(new Date().toISOString());
  const covering = (periodes || []).filter((row) => periodCovers(row, day));
  if(covering.some((row) => row.type === TYPES_PERIODE.DEMISSIONNAIRE)){
    return { statut_rh: 'DEMISSIONNAIRE', actif: false };
  }
  if(covering.some((row) => row.type === TYPES_PERIODE.SORTI)){
    return { statut_rh: 'SORTI', actif: false };
  }
  if(covering.some((row) => row.type === TYPES_PERIODE.INDISPONIBLE)){
    return { statut_rh: 'INACTIF', actif: true };
  }
  if(covering.some((row) => row.type === TYPES_PERIODE.ACTIF)){
    return { statut_rh: 'ACTIF', actif: true };
  }
  return { statut_rh: 'ACTIF', actif: true };
}

function periodFromPersonneRow(personne){
  const debut = isoDate(personne.date_entree) || '2020-01-01';
  const sortie = isoDate(personne.date_sortie);
  if(sortie){
    return [
      { type: TYPES_PERIODE.ACTIF, date_debut: debut, date_fin: sortie, motif: null, source: 'BACKFILL' },
      {
        type: personne.statut_rh === 'DEMISSIONNAIRE' ? TYPES_PERIODE.DEMISSIONNAIRE : TYPES_PERIODE.SORTI,
        date_debut: sortie,
        date_fin: null,
        motif: null,
        source: 'BACKFILL'
      }
    ];
  }
  const type = personne.statut_rh === 'DEMISSIONNAIRE'
    ? TYPES_PERIODE.DEMISSIONNAIRE
    : (personne.statut_rh === 'SORTI' ? TYPES_PERIODE.SORTI : TYPES_PERIODE.ACTIF);
  if(type === TYPES_PERIODE.ACTIF && personne.actif === false){
    return [{ type: TYPES_PERIODE.SORTI, date_debut: debut, date_fin: null, motif: null, source: 'BACKFILL' }];
  }
  return [{ type, date_debut: debut, date_fin: null, motif: null, source: 'BACKFILL' }];
}

module.exports = {
  TYPES_PERIODE,
  MOTIFS_INDISPONIBLE,
  addDays,
  dayBefore,
  periodCovers,
  evaluateEligibility,
  assertPeriodCompatible,
  deriveStatutCourant,
  periodFromPersonneRow
};
