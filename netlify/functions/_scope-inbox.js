'use strict';
/** Compat DASH-1 : l’inbox est un mapping P0 d’ALERTS-1, pas un second moteur. */
const { classifyOperationalAlert, toInboxItem, todayIso } = require('./_scope-alerts');

function classifyInboxItem(event, extras = {}){
  const alert = classifyOperationalAlert(event, extras);
  if(!alert || alert.level !== 'P0') return null;
  return toInboxItem(alert);
}

module.exports = { classifyInboxItem, todayIso };
