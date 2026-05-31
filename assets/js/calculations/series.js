/* Monitoring F7 v52 — façade calculs séries.
   Les calculs multi-sessions restent dans app.js pour éviter une régression métier. */
(function(){
  'use strict';
  function sortSeriesKey(a, b){ return String(a || '').localeCompare(String(b || ''), 'fr-CH', { numeric: true, sensitivity: 'base' }); }
  function normalizeSeriesLabel(value){ return String(value || '').trim(); }
  const api = Object.freeze({ sortSeriesKey, normalizeSeriesLabel });
  window.MonitoringCalculationsSeries = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.series = api;
})();
