/* Monitoring F7 v52 — helpers numériques centralisés. */
(function(){
  'use strict';
  function toInt(value){ const n = parseInt(value || '0', 10); return Number.isFinite(n) ? Math.max(0, n) : 0; }
  function toNumber(value, fallback = 0){ const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function clamp(value, min, max){ const n = toNumber(value, min); return Math.min(max, Math.max(min, n)); }
  function round1(value){ return Math.round(toNumber(value) * 10) / 10; }
  function safePercent(numerator, denominator){ return denominator > 0 ? round1((100 * numerator) / denominator) : 0; }
  const api = Object.freeze({ toInt, toNumber, clamp, round1, safePercent });
  window.MonitoringNumberUtils = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.numbers = api;
})();
