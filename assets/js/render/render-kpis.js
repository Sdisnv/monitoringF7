/* Monitoring F7 v52 — façade rendu KPI.
   Les blocs métier complexes restent dans app.js; ces helpers supportent les extractions progressives. */
(function(){
  'use strict';
  function setKpiText(el, value, className){
    if(window.MonitoringDomUtils && typeof window.MonitoringDomUtils.setText === 'function'){
      window.MonitoringDomUtils.setText(el, value, className);
      return;
    }
    if(!el) return;
    el.textContent = String(value ?? '');
    if(className) el.className = className;
  }
  function formatPercent(value){
    return window.MonitoringFormatters?.percent ? window.MonitoringFormatters.percent(value) : `${Number(value || 0).toFixed(1)}%`;
  }
  const api = Object.freeze({ setKpiText, formatPercent });
  window.MonitoringRenderKpis = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.kpis = api;
})();
