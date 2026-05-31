/* Monitoring F7 v52 — façade calculs synthèse.
   La logique SDIS complète est conservée dans app.js; seules les fonctions pures sans dépendance commencent à être exposées. */
(function(){
  'use strict';
  function safeRate(numerator, denominator){
    return window.MonitoringNumberUtils?.safePercent ? window.MonitoringNumberUtils.safePercent(numerator, denominator) : (denominator > 0 ? Math.round((100 * numerator / denominator) * 10) / 10 : 0);
  }
  function sum(values){ return (Array.isArray(values) ? values : []).reduce((acc, value) => acc + (Number(value) || 0), 0); }
  const api = Object.freeze({ safeRate, sum });
  window.MonitoringCalculationsSummary = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.summary = api;
})();
