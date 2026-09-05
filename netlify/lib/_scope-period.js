'use strict';
const { HttpError, isoDate } = require('./_scope-rules');

const PRESETS = Object.freeze(['YEAR', 'SEMESTER', 'MONTH', 'QUARTER', 'CUSTOM']);
const MAX_SPAN_DAYS = 3660;

function pad2(value){
  return String(value).padStart(2, '0');
}

function utcDate(iso){
  return new Date(`${iso}T00:00:00.000Z`);
}

function lastDayOfMonth(year, month){
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function yearBounds(year){
  const y = Number(year);
  return { from: `${y}-01-01`, to: `${y}-12-31`, preset: 'YEAR' };
}

function monthBounds(year, month){
  const y = Number(year);
  const m = Number(month);
  const last = lastDayOfMonth(y, m);
  return { from: `${y}-${pad2(m)}-01`, to: `${y}-${pad2(m)}-${pad2(last)}`, preset: 'MONTH' };
}

function quarterBounds(year, quarter){
  const y = Number(year);
  const q = Number(quarter);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const last = lastDayOfMonth(y, endMonth);
  return {
    from: `${y}-${pad2(startMonth)}-01`,
    to: `${y}-${pad2(endMonth)}-${pad2(last)}`,
    preset: 'QUARTER'
  };
}

function semesterBounds(year, semester){
  const y = Number(year);
  const s = Number(semester);
  const fromMonth = s === 2 ? 7 : 1;
  const toMonth = s === 2 ? 12 : 6;
  return {
    from: `${y}-${pad2(fromMonth)}-01`,
    to: `${y}-${pad2(toMonth)}-${pad2(lastDayOfMonth(y, toMonth))}`,
    preset: 'SEMESTER'
  };
}

function spanDays(from, to){
  return Math.round((utcDate(to) - utcDate(from)) / 86400000) + 1;
}

function parsePeriod(query){
  const presetInput = String(query?.preset || query?.periode || '').toUpperCase();
  const presetRaw = presetInput === 'SEMESTRE' || presetInput === 'HALF' ? 'SEMESTER' : presetInput;
  const preset = PRESETS.includes(presetRaw) ? presetRaw : null;
  const fromHint = isoDate(query?.from || query?.date_from || query?.debut);
  const toHint = isoDate(query?.to || query?.date_to || query?.fin);

  let period;
  if(fromHint && toHint){
    period = { from: fromHint, to: toHint, preset: preset || 'CUSTOM' };
  }else if(preset === 'SEMESTER' && query?.year && (query?.semester || query?.semestre)){
    period = semesterBounds(query.year, query.semester || query.semestre);
  }else if(preset === 'MONTH' && query?.year && query?.month){
    period = monthBounds(query.year, query.month);
  }else if(preset === 'QUARTER' && query?.year && query?.quarter){
    period = quarterBounds(query.year, query.quarter);
  }else if(preset === 'YEAR' && (query?.year || query?.annee)){
    period = yearBounds(query.year || query.annee);
  }else if(query?.year || query?.annee){
    period = yearBounds(query.year || query.annee);
  }else{
    period = yearBounds(new Date().getUTCFullYear());
  }

  if(!isoDate(period.from) || !isoDate(period.to)){
    throw new HttpError(400, 'periode_invalide', 'Période invalide : dates ISO YYYY-MM-DD requises.');
  }
  if(period.from > period.to){
    throw new HttpError(400, 'periode_inversee', 'Période invalide : from doit être ≤ to.');
  }
  if(spanDays(period.from, period.to) > MAX_SPAN_DAYS){
    throw new HttpError(400, 'periode_trop_longue', 'Période trop longue (maximum 10 ans).');
  }
  return period;
}

function inPeriod(dateIso, period){
  const date = isoDate(dateIso);
  if(!date || !period) return false;
  return date >= period.from && date <= period.to;
}

function monthKey(dateIso){
  return String(isoDate(dateIso) || '').slice(0, 7);
}

module.exports = {
  PRESETS,
  MAX_SPAN_DAYS,
  parsePeriod,
  yearBounds,
  monthBounds,
  semesterBounds,
  quarterBounds,
  inPeriod,
  monthKey
};
