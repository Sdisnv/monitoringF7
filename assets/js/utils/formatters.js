/* Monitoring F7 v52 — formatage métier centralisé. */
(function(){
  'use strict';
  function percent(value){ const n = Number(value); return Number.isFinite(n) ? `${n.toFixed(1)}%` : '0.0%'; }
  function signedPoints(value){ const n = Number(value); if(!Number.isFinite(n)) return '0.0 pt'; return `${n >= 0 ? '+' : ''}${n.toFixed(1)} pt`; }
  function integer(value){ const n = parseInt(value || '0', 10); return Number.isFinite(n) ? String(n) : '0'; }
  const api = Object.freeze({ percent, signedPoints, integer });
  window.MonitoringFormatters = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.formatters = api;
})();
