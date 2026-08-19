'use strict';
const { computeTaux, round1 } = require('./_scope-rules');
const csvImport = require('./_scope-csv-import');

const KINDS = Object.freeze({ OFFICIEL: 'OFFICIEL', LEGACY: 'LEGACY' });
const STATUTS = Object.freeze({
  ATTEINT: 'ATTEINT',
  VIGILANCE: 'VIGILANCE',
  ATTENTION: 'ATTENTION',
  NON_EVALUABLE: 'NON_EVALUABLE'
});
const MODES = Object.freeze({
  NOMINATIF: 'NOMINATIF',
  QUANTITATIF: 'QUANTITATIF',
  LEGACY: 'LEGACY'
});

function inferModeSuivi(row){
  const explicit = String(row?.mode_suivi || row?.modeSuivi || '').toUpperCase();
  if(explicit === MODES.NOMINATIF || explicit === MODES.QUANTITATIF || explicit === MODES.LEGACY){
    return explicit;
  }
  if(row?.origine === 'LEGACY_AGGREGATED') return MODES.LEGACY;
  return MODES.NOMINATIF;
}

function safePercentage(numerator, denominator){
  const num = Number(numerator);
  const den = Number(denominator);
  if(!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  const pct = round1((100 * num) / den);
  if(!Number.isFinite(pct)) return null;
  return pct;
}

function emptyVolumes(){
  return {
    presents: 0,
    excuses: 0,
    nonExcuses: 0,
    dispenses: 0,
    nonRenseignes: 0,
    nonConcernes: 0
  };
}

function volumesFromTaux(taux){
  return {
    presents: Number(taux.presents || 0),
    excuses: Number(taux.excuses || 0),
    nonExcuses: Number(taux.nonExcuses || 0),
    dispenses: Number(taux.dispenses || 0),
    nonRenseignes: Number(taux.nonRenseignes || 0),
    nonConcernes: Number(taux.nonConcernes || 0)
  };
}

function addVolumes(left, right){
  const a = left || emptyVolumes();
  const b = right || emptyVolumes();
  return {
    presents: a.presents + b.presents,
    excuses: a.excuses + b.excuses,
    nonExcuses: a.nonExcuses + b.nonExcuses,
    dispenses: a.dispenses + b.dispenses,
    nonRenseignes: a.nonRenseignes + b.nonRenseignes,
    nonConcernes: a.nonConcernes + b.nonConcernes
  };
}

function officialFromTaux(taux){
  const numerator = Number(taux.numerator || 0);
  const denominator = Number(taux.denominator || 0);
  return {
    numerator,
    denominator,
    percentage: safePercentage(numerator, denominator),
    kind: KINDS.OFFICIEL,
    volumes: volumesFromTaux(taux)
  };
}

function officialFromQuantitatif(row){
  const presents = Number(row.nb_presents);
  const excuses = Number(row.nb_excuses);
  const nonExcuses = Number(row.nb_non_excuses);
  const dispenses = Number(row.nb_dispenses || 0);
  if(![presents, excuses, nonExcuses, dispenses].every((n) => Number.isFinite(n) && n >= 0)){
    return null;
  }
  const attendus = Number(row.nb_attendus);
  if(Number.isFinite(attendus) && attendus !== presents + excuses + nonExcuses + dispenses){
    return null;
  }
  const numerator = presents;
  const denominator = presents + excuses + nonExcuses;
  return {
    numerator,
    denominator,
    percentage: safePercentage(numerator, denominator),
    kind: KINDS.OFFICIEL,
    volumes: {
      presents,
      excuses,
      nonExcuses,
      dispenses,
      nonRenseignes: 0,
      nonConcernes: 0
    }
  };
}

function parsePayload(value){
  if(!value) return {};
  if(typeof value === 'string'){
    try { return JSON.parse(value) || {}; } catch { return {}; }
  }
  return value;
}

function legacyPointFromAggregate(event, legacy){
  const presents = Number(legacy.nb_presents);
  const payload = parsePayload(legacy.payload_v67);
  const totalAttendu = Number(payload.total_attendu || legacy.nb_convoques);
  const percentage = csvImport.legacyTaux({
    nb_presents: presents,
    total_attendu: totalAttendu,
    nb_convoques: legacy.nb_convoques
  });
  return {
    evenementId: event.evenement_id,
    date: event.date,
    domaine: event.domaine_code,
    cibleIds: event.cible_ids || [],
    libelle: event.libelle,
    presents: Number.isFinite(presents) ? presents : null,
    totalAttendu: Number.isFinite(totalAttendu) ? totalAttendu : null,
    tauxLegacy: percentage,
    kind: KINDS.LEGACY
  };
}

function resolveObjective(/* { date, domaine, cible } */){
  return null;
}

function analyticStatus(percentage, objective, config){
  if(percentage == null || !Number.isFinite(Number(percentage))){
    return { status: STATUTS.NON_EVALUABLE, reason: 'denominator_zero' };
  }
  if(!objective || objective.thresholdPct == null){
    return { status: STATUTS.NON_EVALUABLE, reason: 'objectif_absent' };
  }
  const threshold = Number(objective.thresholdPct);
  const taux = Number(percentage);
  if(!Number.isFinite(threshold)){
    return { status: STATUTS.NON_EVALUABLE, reason: 'objectif_absent' };
  }
  if(taux >= threshold) return { status: STATUTS.ATTEINT, reason: 'ge_objectif' };
  const margin = config && config.vigilanceMarginPct;
  if(Number.isFinite(Number(margin)) && Number(margin) > 0 && taux >= threshold - Number(margin)){
    return { status: STATUTS.VIGILANCE, reason: 'marge_vigilance' };
  }
  return { status: STATUTS.ATTENTION, reason: 'lt_objectif' };
}

function gapPct(percentage, objective){
  if(percentage == null || !objective || objective.thresholdPct == null) return null;
  const gap = Number(percentage) - Number(objective.thresholdPct);
  return Number.isFinite(gap) ? round1(gap) : null;
}

module.exports = {
  KINDS,
  STATUTS,
  MODES,
  inferModeSuivi,
  safePercentage,
  emptyVolumes,
  addVolumes,
  officialFromTaux,
  officialFromQuantitatif,
  legacyPointFromAggregate,
  resolveObjective,
  analyticStatus,
  gapPct,
  computeTaux
};
