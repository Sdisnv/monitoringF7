'use strict';
/**
 * SCOPE-MODEL-2 — vérité métier structurée.
 *
 * PR / AUTO : codes domaine conservés (FK, cibles, événements).
 * Ils sont aussi des SOUS-DOMAINES de FOSPEC. Pas de détournement de « cible ».
 *
 * Motifs d’excuse canoniques : PRIVE, PROFESSIONNEL, ARMEE, ACCIDENT_MALADIE.
 * Historique : MALADIE, ACCIDENT, AUTRE lus, jamais inventés.
 *
 * PERMUTATION : statut nominatif DAP, compte comme PRÉSENCE, jamais additionné
 * une seconde fois aux présents. Hors DAP : refusé.
 *
 * Taux officiel inchangé : présents / (présents + excusés + non_excusés).
 */
const MOTIFS_CANONIQUES = Object.freeze({
  PRIVE: 'PRIVE',
  PROFESSIONNEL: 'PROFESSIONNEL',
  ARMEE: 'ARMEE',
  ACCIDENT_MALADIE: 'ACCIDENT_MALADIE'
});

const MOTIFS_HISTORIQUES = Object.freeze({
  MALADIE: 'MALADIE',
  ACCIDENT: 'ACCIDENT',
  AUTRE: 'AUTRE',
  NON_PRECISE: 'NON_PRECISE'
});

const MOTIFS_SAISIE_NOUVELLE = new Set(Object.values(MOTIFS_CANONIQUES));
const MOTIFS_ACCEPTES = new Set([
  ...Object.values(MOTIFS_CANONIQUES),
  ...Object.values(MOTIFS_HISTORIQUES)
]);

const STATUT_PERMUTATION = 'PERMUTATION';

function domaineAffiche(code, domaine){
  if(domaine && domaine.libelle_affiche) return domaine.libelle_affiche;
  if(code === 'PR') return 'PAPR';
  return String((domaine && domaine.libelle) || code || '');
}

function domaineCodesForFilter(code){
  if(!code) return null;
  const text = String(code).toUpperCase();
  if(text === 'FOSPEC') return ['FOSPEC', 'PR', 'AUTO'];
  return [text];
}

function isSousDomaineFospec(code){
  return code === 'PR' || code === 'AUTO';
}

function normalizeMotifKey(motif){
  const text = String(motif || '').toUpperCase();
  if(text === 'PRIVE') return 'prive';
  if(text === 'PROFESSIONNEL') return 'professionnel';
  if(text === 'ARMEE') return 'armee';
  if(text === 'ACCIDENT_MALADIE' || text === 'MALADIE' || text === 'ACCIDENT') return 'accidentMaladie';
  return 'nonPrecise';
}

function emptyExcuseBreakdown(){
  return {
    prive: 0,
    professionnel: 0,
    armee: 0,
    accidentMaladie: 0,
    nonPrecise: 0
  };
}

function addExcuseBreakdown(left, right){
  const a = left || emptyExcuseBreakdown();
  const b = right || emptyExcuseBreakdown();
  return {
    prive: a.prive + b.prive,
    professionnel: a.professionnel + b.professionnel,
    armee: a.armee + b.armee,
    accidentMaladie: a.accidentMaladie + b.accidentMaladie,
    nonPrecise: a.nonPrecise + b.nonPrecise
  };
}

function excuseTotalFromBreakdown(b){
  const x = b || emptyExcuseBreakdown();
  return x.prive + x.professionnel + x.armee + x.accidentMaladie + x.nonPrecise;
}

function emptyModelVolumes(){
  return {
    attendus: 0,
    presents: 0,
    excuses: 0,
    nonExcuses: 0,
    dispenses: 0,
    nonRenseignes: 0,
    nonConcernes: 0,
    permutations: 0,
    excusesPrive: 0,
    excusesProfessionnel: 0,
    excusesArmee: 0,
    excusesAccidentMaladie: 0,
    excusesNonPrecise: 0
  };
}

function volumesFromBreakdown(base, excuses){
  const e = excuses || emptyExcuseBreakdown();
  return Object.assign({}, emptyModelVolumes(), base || {}, {
    excuses: excuseTotalFromBreakdown(e),
    excusesPrive: e.prive,
    excusesProfessionnel: e.professionnel,
    excusesArmee: e.armee,
    excusesAccidentMaladie: e.accidentMaladie,
    excusesNonPrecise: e.nonPrecise
  });
}

function quantitatifEquality(row){
  const attendus = Number(row.nb_attendus);
  const presents = Number(row.nb_presents);
  const excuses = Number(row.nb_excuses);
  const nonExcuses = Number(row.nb_non_excuses);
  const dispenses = Number(row.nb_dispenses || 0);
  const permutations = Number(row.nb_permutations || 0);
  if(![attendus, presents, excuses, nonExcuses, dispenses, permutations].every((n) => Number.isInteger(n) && n >= 0)){
    return false;
  }
  if(permutations > presents) return false;
  const detail = excuseTotalFromBreakdown({
    prive: Number(row.nb_excuses_prive || 0),
    professionnel: Number(row.nb_excuses_professionnel || 0),
    armee: Number(row.nb_excuses_armee || 0),
    accidentMaladie: Number(row.nb_excuses_accident_maladie || 0),
    nonPrecise: Number(row.nb_excuses_non_precise || 0)
  });
  if(detail !== excuses) return false;
  return attendus === presents + excuses + nonExcuses + dispenses;
}

function resolveSuiviNominatif(rules, { date, domaineCode, sousDomaineCode, cibleId }){
  const day = String(date || '').slice(0, 10);
  const covering = (rules || []).filter((row) => {
    if(row.nominatif_autorise !== true && row.nominatifAutorise !== true && row.nominatif_autorise !== false && row.nominatifAutorise !== false){
      return false;
    }
    const debut = String(row.date_debut || row.dateDebut || '').slice(0, 10);
    const fin = row.date_fin || row.dateFin ? String(row.date_fin || row.dateFin).slice(0, 10) : null;
    if(!debut || day < debut) return false;
    if(fin && day > fin) return false;
    return true;
  });
  const porteeRank = { CIBLE: 4, SOUS_DOMAINE: 3, DOMAINE: 2, GLOBAL: 1 };
  const scored = covering.map((row) => {
    const portee = String(row.portee || '').toUpperCase();
    let ok = false;
    if(portee === 'CIBLE' && cibleId && String(row.cible_id || row.cibleId) === String(cibleId)) ok = true;
    if(portee === 'SOUS_DOMAINE' && sousDomaineCode && String(row.sous_domaine_code || row.sousDomaineCode) === String(sousDomaineCode)) ok = true;
    if(portee === 'DOMAINE' && domaineCode && String(row.domaine_code || row.domaineCode) === String(domaineCode)) ok = true;
    if(portee === 'GLOBAL') ok = true;
    return ok ? { row, rank: porteeRank[portee] || 0 } : null;
  }).filter(Boolean).sort((a, b) => b.rank - a.rank);
  if(!scored.length) return { possible: true, source: 'DEFAUT', rule: null };
  const top = scored[0].row;
  const possible = top.nominatif_autorise !== false && top.nominatifAutorise !== false;
  return { possible, source: String(top.portee || '').toUpperCase(), rule: top };
}

function canPhysicallyDeletePersonne({ attendusCount, participationsCount, journalCount }){
  return Number(attendusCount || 0) === 0
    && Number(participationsCount || 0) === 0
    && Number(journalCount || 0) === 0;
}

module.exports = {
  MOTIFS_CANONIQUES,
  MOTIFS_HISTORIQUES,
  MOTIFS_SAISIE_NOUVELLE,
  MOTIFS_ACCEPTES,
  STATUT_PERMUTATION,
  domaineAffiche,
  domaineCodesForFilter,
  isSousDomaineFospec,
  normalizeMotifKey,
  emptyExcuseBreakdown,
  addExcuseBreakdown,
  excuseTotalFromBreakdown,
  emptyModelVolumes,
  volumesFromBreakdown,
  quantitatifEquality,
  resolveSuiviNominatif,
  canPhysicallyDeletePersonne
};
