/* Monitoring F7 v61 — journalisation locale légère pour diagnostic pilote SDIS.
   Journal client-only modifiable localement : ne constitue pas un audit trail sécurisé ou infalsifiable. */
(function(){
  'use strict';

  const APP_VERSION = (window.MonitoringConfig && window.MonitoringConfig.version) || 'v61';
  const LOG_KEY = 'monitoring_f7_audit_log_v56'; // clé conservée pour préserver le journal local existant
  const MAX_ENTRIES = 1000;
  const EVENT_TYPES = new Set(['info','warning','error','action']);

  function now(){ return new Date().toISOString(); }
  function safeString(value, maxLen = 240){
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
  }
  function sanitizeContext(context){
    const src = context && typeof context === 'object' ? context : {};
    const out = {};
    Object.entries(src).forEach(([key, value]) => {
      if(/password|token|secret|credential|nip|csv|json|content|fileText|raw/i.test(key)) return;
      if(value == null) return;
      if(typeof value === 'number' || typeof value === 'boolean') out[key] = value;
      else if(value instanceof Error) out[key] = safeString(value.message, 180);
      else if(Array.isArray(value)) out[key] = `array(${value.length})`;
      else if(typeof value === 'object') out[key] = safeString(JSON.stringify(value).replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '"…"'), 180);
      else out[key] = safeString(value, 180);
    });
    return out;
  }
  function readLogs(){
    try{
      const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }catch{
      return [];
    }
  }
  function writeLogs(logs){
    const trimmed = (Array.isArray(logs) ? logs : []).slice(-MAX_ENTRIES);
    try{ localStorage.setItem(LOG_KEY, JSON.stringify(trimmed)); }
    catch(err){
      try{ localStorage.setItem(LOG_KEY, JSON.stringify(trimmed.slice(-Math.floor(MAX_ENTRIES / 2)))); }
      catch{ /* impossible de journaliser sans stockage */ }
    }
  }
  function addLog(level, eventType, message, context){
    const type = EVENT_TYPES.has(level) ? level : 'info';
    const entry = {
      id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      at: now(),
      level: type,
      eventType: safeString(eventType || type, 80),
      status: type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'ok'),
      version: APP_VERSION,
      message: safeString(message || eventType || type, 260),
      context: sanitizeContext(context)
    };
    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs);
    document.dispatchEvent(new CustomEvent('monitoring-f7-audit-log-updated', { detail: { count: logs.length } }));
    return entry;
  }
  function estimateLocalStorageBytes(){
    try{
      return Object.keys(localStorage).reduce((total, key) => total + key.length + String(localStorage.getItem(key) || '').length, 0);
    }catch{ return 0; }
  }
  function getLogDiagnostics(){
    const logs = readLogs();
    const lastMigration = (() => {
      try{
        const meta = JSON.parse(localStorage.getItem('monitoring_f7_data_meta_v1') || '{}');
        return meta.lastMigrationAt || null;
      }catch{ return null; }
    })();
    const storageDiagnostics = window.MonitoringStorage?.getStorageDiagnostics ? window.MonitoringStorage.getStorageDiagnostics() : null;
    return {
      appVersion: APP_VERSION,
      logEntries: logs.length,
      maxEntries: MAX_ENTRIES,
      oldestEntryAt: logs[0]?.at || null,
      newestEntryAt: logs[logs.length - 1]?.at || null,
      localStorageAvailable: (() => { try{ localStorage.setItem('__mf7_probe','1'); localStorage.removeItem('__mf7_probe'); return true; }catch{ return false; } })(),
      indexedDBAvailable: typeof indexedDB !== 'undefined',
      storageApproxKo: Math.round(estimateLocalStorageBytes() / 1024),
      lastMigrationAt: lastMigration || storageDiagnostics?.lastMigrationAt || null,
      storageDiagnostics
    };
  }
  function clearLogs(){
    localStorage.removeItem(LOG_KEY);
    document.dispatchEvent(new CustomEvent('monitoring-f7-audit-log-updated', { detail: { count: 0 } }));
    addLog('action', 'journal-clear', 'Journal local vidé par l’utilisateur.', {});
  }
  function exportLogs(){
    const exportedAt = now();
    const payload = {
      type: 'MonitoringF7SupportLog',
      app: 'Monitoring F7',
      appVersion: APP_VERSION,
      exportedAt,
      clientOnlyNotice: 'Journal local de diagnostic, modifiable par l’utilisateur, non infalsifiable et non centralisé.',
      diagnostics: getLogDiagnostics(),
      events: readLogs()
    };
    const date = exportedAt.slice(0,10);
    const time = exportedAt.slice(11,16).replace(':','');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `monitoring-f7-journal-support-${APP_VERSION}-${date}_${time}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    addLog('action', 'journal-export', 'Journal support exporté.', { entries: payload.events.length });
  }

  const api = Object.freeze({
    logInfo: (eventType, message, context) => addLog('info', eventType, message, context),
    logWarning: (eventType, message, context) => addLog('warning', eventType, message, context),
    logError: (eventType, message, context) => addLog('error', eventType, message, context),
    logAction: (eventType, message, context) => addLog('action', eventType, message, context),
    getLogs: readLogs,
    clearLogs,
    exportLogs,
    getLogDiagnostics,
    maxEntries: MAX_ENTRIES
  });
  window.MonitoringAuditLog = api;

  window.addEventListener('error', event => {
    api.logError('window.onerror', event.message || 'Erreur JavaScript globale.', { source: event.filename, line: event.lineno, col: event.colno });
  });
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    api.logError('unhandledrejection', reason?.message || String(reason || 'Promesse rejetée.'), {});
  });
  document.addEventListener('DOMContentLoaded', () => {
    api.logInfo('application-open', 'Ouverture application Monitoring F7.', { userAgent: navigator.userAgent ? 'available' : 'unknown' });
  });
})();
