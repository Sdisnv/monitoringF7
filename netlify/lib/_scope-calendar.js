'use strict';
/**
 * Calendrier métier SCOPE — Europe/Zurich.
 *
 * « Aujourd’hui » et les comparaisons d’échéance (échu / futur) sont des dates
 * civiles suisses, jamais la date UTC du navigateur ni Date#toISOString().
 *
 * Timezone : Europe/Zurich (CET/CEST, DST géré par Intl).
 * Comparaison : chaînes YYYY-MM-DD, ordre lexicographique = ordre civil.
 * Minuit : à 00:00:00 Europe/Zurich le jour J, today = J ; un événement daté
 * J-1 est échu. Un événement daté J n’est pas échu (il l’est dès J+1 00:00 Zurich).
 *
 * Injection de tests : passer `today` (YYYY-MM-DD) ou `now` (Date) — jamais
 * laisser le client décider de l’échéance.
 */
const { isoDate } = require('./_scope-rules');

const TIMEZONE = 'Europe/Zurich';

function todayZurichIso(now){
  const date = now instanceof Date ? now : new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return fmt.format(date);
}

function calendarDate(value, now){
  if(value instanceof Date) return todayZurichIso(value);
  const text = isoDate(value);
  if(text) return text;
  return todayZurichIso(now);
}

function isEchu(eventDate, today){
  const date = isoDate(eventDate);
  const ref = isoDate(today);
  if(!date || !ref) return false;
  return date < ref;
}

module.exports = {
  TIMEZONE,
  todayZurichIso,
  calendarDate,
  isEchu
};
