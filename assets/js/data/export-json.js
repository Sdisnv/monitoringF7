/* Monitoring F7 v61 — helpers export JSON centralisés. */
(function(){
  'use strict';
  function createExportMeta(extra = {}){
    return Object.assign({
      type: 'MonitoringF7Export',
      app: 'Monitoring F7',
      version: (window.MonitoringConfig && window.MonitoringConfig.version) || 'v61',
      exportedAt: new Date().toISOString()
    }, extra || {});
  }
  function safeJsonStringify(payload, spacing = 2){
    try { return JSON.stringify(payload, null, spacing); }
    catch(err){ throw new Error('Export JSON impossible : données non sérialisables.'); }
  }
  const api = Object.freeze({ createExportMeta, safeJsonStringify });
  window.MonitoringDataExportJson = api;
  window.MonitoringF7 = window.MonitoringF7 || {};
  window.MonitoringF7.exportJson = api;
})();
