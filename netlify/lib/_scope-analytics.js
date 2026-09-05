'use strict';
const { computeTaux, round1 } = require('./_scope-rules');
const csvImport = require('./_scope-csv-import');
const { resolveObjective: resolveObjectiveFromRows } = require('./_scope-objectives');

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
    nonConcernes: 0,
    attendus: 0,
    permutations: 0,
    excusesPrive: 0,
    excusesProfessionnel: 0,
    excusesArmee: 0,
    excusesAccidentMaladie: 0,
    excusesNonPrecise: 0
  };
}

function volumesFromTaux(taux){
  const base = emptyVolumes();
  for(const key of Object.keys(base)){
    if(taux && taux[key] != null) base[key] = Number(taux[key] || 0);
  }
  base.presents = Number(taux.presents || 0);
  base.excuses = Number(taux.excuses || 0);
  base.nonExcuses = Number(taux.nonExcuses || 0);
  base.dispenses = Number(taux.dispenses || 0);
  base.nonRenseignes = Number(taux.nonRenseignes || 0);
  base.nonConcernes = Number(taux.nonConcernes || 0);
  return base;
}

function addVolumes(left, right){
  const a = left || emptyVolumes();
  const b = right || emptyVolumes();
  const out = emptyVolumes();
  for(const key of Object.keys(out)){
    out[key] = Number(a[key] || 0) + Number(b[key] || 0);
  }
  return out;
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

function readIntegerField(body, names){
  for(const name of names){
    if(body && body[name] !== undefined && body[name] !== null && body[name] !== ''){
      const raw = body[name];
      if(typeof raw === 'number' && Number.isInteger(raw)) return { value: raw };
      if(typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) return { value: Number(raw.trim()) };
      const n = Number(raw);
      if(Number.isInteger(n)) return { value: n };
      return { error: 'not_integer', field: name };
    }
  }
  return { missing: true };
}

function parseQuantitatifInput(body){
  const attendus = readIntegerField(body, ['attendus', 'nb_attendus', 'nbAttendus']);
  const presents = readIntegerField(body, ['presents', 'nb_presents', 'nbPresents']);
  const excuses = readIntegerField(body, ['excuses', 'nb_excuses', 'nbExcuses', 'absents_excuses', 'absentsExcuses']);
  const nonExcuses = readIntegerField(body, ['nonExcuses', 'nb_non_excuses', 'nbNonExcuses', 'absents_non_excuses', 'absentsNonExcuses']);
  let dispenses = readIntegerField(body, ['dispenses', 'nb_dispenses', 'nbDispenses']);
  if(dispenses.missing) dispenses = { value: 0 };
  let permutations = readIntegerField(body, ['permutations', 'nb_permutations', 'nbPermutations']);
  if(permutations.missing) permutations = { value: 0 };
  const prive = readIntegerField(body, ['excusesPrive', 'nb_excuses_prive', 'nbExcusesPrive']);
  const professionnel = readIntegerField(body, ['excusesProfessionnel', 'nb_excuses_professionnel', 'nbExcusesProfessionnel']);
  const armee = readIntegerField(body, ['excusesArmee', 'nb_excuses_armee', 'nbExcusesArmee']);
  const accident = readIntegerField(body, ['excusesAccidentMaladie', 'nb_excuses_accident_maladie', 'nbExcusesAccidentMaladie']);
  const nonPrecise = readIntegerField(body, ['excusesNonPrecise', 'nb_excuses_non_precise', 'nbExcusesNonPrecise']);
  for(const item of [attendus, presents, excuses, nonExcuses, dispenses, permutations, prive, professionnel, armee, accident, nonPrecise]){
    if(item.error) return item;
  }
  if(attendus.missing || presents.missing || nonExcuses.missing){
    return { error: 'missing' };
  }
  const anyMotif = ![prive, professionnel, armee, accident, nonPrecise].every((item) => item.missing);
  let breakdown;
  let excusesValue;
  if(anyMotif){
    breakdown = {
      nb_excuses_prive: prive.missing ? 0 : prive.value,
      nb_excuses_professionnel: professionnel.missing ? 0 : professionnel.value,
      nb_excuses_armee: armee.missing ? 0 : armee.value,
      nb_excuses_accident_maladie: accident.missing ? 0 : accident.value,
      nb_excuses_non_precise: nonPrecise.missing ? 0 : nonPrecise.value
    };
    const sum = breakdown.nb_excuses_prive + breakdown.nb_excuses_professionnel
      + breakdown.nb_excuses_armee + breakdown.nb_excuses_accident_maladie
      + breakdown.nb_excuses_non_precise;
    if(!excuses.missing && excuses.value !== sum){
      return { error: 'motifs_incoherents' };
    }
    excusesValue = sum;
  } else {
    if(excuses.missing) return { error: 'missing' };
    excusesValue = excuses.value;
    breakdown = {
      nb_excuses_prive: 0,
      nb_excuses_professionnel: 0,
      nb_excuses_armee: 0,
      nb_excuses_accident_maladie: 0,
      nb_excuses_non_precise: excusesValue
    };
  }
  for(const item of [
    attendus, presents, { value: excusesValue }, nonExcuses, dispenses, permutations,
    { value: breakdown.nb_excuses_prive }, { value: breakdown.nb_excuses_professionnel },
    { value: breakdown.nb_excuses_armee }, { value: breakdown.nb_excuses_accident_maladie },
    { value: breakdown.nb_excuses_non_precise }
  ]){
    if(item.value < 0) return { error: 'negative' };
  }
  return {
    row: {
      nb_attendus: attendus.value,
      nb_presents: presents.value,
      nb_excuses: excusesValue,
      nb_non_excuses: nonExcuses.value,
      nb_dispenses: dispenses.value,
      nb_permutations: permutations.value,
      ...breakdown
    }
  };
}

function officialFromQuantitatif(row){
  const presents = Number(row.nb_presents);
  const excuses = Number(row.nb_excuses);
  const nonExcuses = Number(row.nb_non_excuses);
  const dispenses = Number(row.nb_dispenses || 0);
  const permutations = Number(row.nb_permutations || 0);
  if(![presents, excuses, nonExcuses, dispenses].every((n) => Number.isFinite(n) && n >= 0)){
    return null;
  }
  if(Number.isFinite(permutations) && permutations < 0) return null;
  if(permutations > presents) return null;
  const attendus = Number(row.nb_attendus);
  if(Number.isFinite(attendus) && attendus !== presents + excuses + nonExcuses + dispenses){
    return null;
  }
  const motifFields = [
    row.nb_excuses_prive, row.nb_excuses_professionnel, row.nb_excuses_armee,
    row.nb_excuses_accident_maladie, row.nb_excuses_non_precise
  ];
  const hasMotifs = motifFields.some((n) => n != null);
  const excusesPrive = Number(row.nb_excuses_prive || 0);
  const excusesProfessionnel = Number(row.nb_excuses_professionnel || 0);
  const excusesArmee = Number(row.nb_excuses_armee || 0);
  const excusesAccidentMaladie = Number(row.nb_excuses_accident_maladie || 0);
  const excusesNonPrecise = hasMotifs
    ? Number(row.nb_excuses_non_precise || 0)
    : excuses;
  if(hasMotifs){
    const sum = excusesPrive + excusesProfessionnel + excusesArmee + excusesAccidentMaladie + Number(row.nb_excuses_non_precise || 0);
    if(sum !== excuses) return null;
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
      attendus: Number.isFinite(attendus) ? attendus : presents + excuses + nonExcuses + dispenses,
      nonRenseignes: 0,
      nonConcernes: 0,
      permutations: Number.isFinite(permutations) ? permutations : 0,
      excusesPrive: hasMotifs ? excusesPrive : 0,
      excusesProfessionnel: hasMotifs ? excusesProfessionnel : 0,
      excusesArmee: hasMotifs ? excusesArmee : 0,
      excusesAccidentMaladie: hasMotifs ? excusesAccidentMaladie : 0,
      excusesNonPrecise: hasMotifs ? Number(row.nb_excuses_non_precise || 0) : excuses
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

function resolveObjective(query){
  return resolveObjectiveFromRows(query || {});
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
  parseQuantitatifInput,
  officialFromQuantitatif,
  legacyPointFromAggregate,
  resolveObjective,
  analyticStatus,
  gapPct,
  computeTaux
};
