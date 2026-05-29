/* Monitoring F7 v61 — service de synchronisation future, inactif par défaut. */
(function(){
  'use strict';

  const QUEUE_KEY = 'monitoring_f7_sync_queue_v57';
  const STATUS_KEY = 'monitoring_f7_sync_status_v57';

  function readJson(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }catch{ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch{}
  }
  function isSyncEnabled(){
    return window.MonitoringBackendConfig?.isSyncEnabled ? window.MonitoringBackendConfig.isSyncEnabled() : false;
  }
  function getQueue(){ return readJson(QUEUE_KEY, []); }
  function getStatus(){
    const saved = readJson(STATUS_KEY, {});
    return Object.freeze(Object.assign({
      syncEnabled: false,
      status: 'inactive',
      queueLength: getQueue().length,
      lastSyncAttemptAt: null,
      lastSyncSuccessAt: null,
      lastConflictAt: null,
      message: 'Synchronisation inactive en v61.'
    }, saved, { syncEnabled: isSyncEnabled(), queueLength: getQueue().length }));
  }
  function enqueue(type, payload){
    const queue = getQueue();
    queue.push({ id:`sync-${Date.now()}-${Math.random().toString(16).slice(2)}`, type:String(type || 'unknown'), payload:payload || null, createdAt:new Date().toISOString(), status:'queued-local' });
    writeJson(QUEUE_KEY, queue);
    return getStatus();
  }
  async function syncNow(){
    const status = Object.assign({}, getStatus(), { lastSyncAttemptAt:new Date().toISOString() });
    if(!isSyncEnabled()){
      status.status = 'inactive';
      status.message = 'Backend/sync désactivés : aucune synchronisation effectuée.';
      writeJson(STATUS_KEY, status);
      return Object.freeze(status);
    }
    status.status = 'prepared-not-implemented';
    status.message = 'Synchronisation future préparée, non implémentée en v61.';
    writeJson(STATUS_KEY, status);
    return Object.freeze(status);
  }
  function clearQueue(){ writeJson(QUEUE_KEY, []); return getStatus(); }

  window.MonitoringSyncService = Object.freeze({ isSyncEnabled, getStatus, getQueue, enqueue, syncNow, clearQueue });
})();
