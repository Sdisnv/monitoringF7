/* Monitoring F7 v65 — service de synchronisation future, inactif par défaut. */
(function(){
  'use strict';

  const QUEUE_KEY = 'monitoring_f7_sync_queue_v65';
  const LEGACY_QUEUE_KEY = 'monitoring_f7_sync_queue_v57';
  const STATUS_KEY = 'monitoring_f7_sync_status_v65';
  const SERVER_STATUS_KEY = 'monitoring_f7_server_status_v1';

  function readJson(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }catch{ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch{}
  }
  function isSyncEnabled(){
    return window.MonitoringBackendConfig?.isSyncEnabled ? window.MonitoringBackendConfig.isSyncEnabled() : false;
  }
  function getConfig(){ return window.MonitoringBackendConfig?.current || {}; }
  function getQueue(){
    const current = readJson(QUEUE_KEY, null);
    if(Array.isArray(current)) return current;
    const legacy = readJson(LEGACY_QUEUE_KEY, []);
    return Array.isArray(legacy) ? legacy : [];
  }
  function checkReadiness(){
    const cfg = getConfig();
    const missing = [];
    if(cfg.backendEnabled !== true) missing.push('backendEnabled');
    if(cfg.authMode !== 'backend' || cfg.serverAuthEnabled !== true) missing.push('serverAuthEnabled');
    if(cfg.storageMode !== 'backend' || cfg.centralStorageEnabled !== true) missing.push('centralStorageEnabled');
    if(cfg.syncEnabled !== true) missing.push('syncEnabled');
    if(!window.MonitoringApiClient) missing.push('apiClient');
    return Object.freeze({
      ready: missing.length === 0,
      missing,
      backendEnabled: cfg.backendEnabled === true,
      serverAuthEnabled: cfg.serverAuthEnabled === true,
      centralStorageEnabled: cfg.centralStorageEnabled === true,
      syncEnabled: cfg.syncEnabled === true,
      queueLength: getQueue().length,
      checkedAt: new Date().toISOString()
    });
  }
  function getStatus(){
    const saved = readJson(STATUS_KEY, {});
    const readiness = checkReadiness();
    return Object.freeze(Object.assign({
      syncEnabled: false,
      status: 'inactive',
      queueLength: getQueue().length,
      lastSyncAttemptAt: null,
      lastSyncSuccessAt: null,
      lastConflictAt: null,
      readiness,
      message: readiness.ready ? 'Synchronisation online-first active.' : 'Synchronisation inactive.'
    }, saved, { syncEnabled: isSyncEnabled(), queueLength: getQueue().length, readiness }));
  }
  function enqueue(type, payload){
    const queue = getQueue();
    queue.push({ id:`sync-${Date.now()}-${Math.random().toString(16).slice(2)}`, type:String(type || 'unknown'), payload:payload || null, createdAt:new Date().toISOString(), status:'queued-local', attempts:0 });
    writeJson(QUEUE_KEY, queue);
    return getStatus();
  }
  function planSync(){
    const readiness = checkReadiness();
    const queue = getQueue();
    return Object.freeze({
      ready: readiness.ready,
      missing: readiness.missing,
      queueLength: queue.length,
      operations: queue.map(item => ({ id:item.id, type:item.type, status:item.status, createdAt:item.createdAt })),
      message: readiness.ready ? 'Prérequis réunis, exécution sync possible après recette.' : `Prérequis manquants : ${readiness.missing.join(', ')}.`
    });
  }
  async function syncNow(){
    const status = Object.assign({}, getStatus(), { lastSyncAttemptAt:new Date().toISOString() });
    const readiness = checkReadiness();
    if(!readiness.ready){
      status.status = 'inactive';
      status.readiness = readiness;
      status.message = `Synchronisation non exécutée. Prérequis manquants : ${readiness.missing.join(', ')}.`;
      writeJson(STATUS_KEY, status);
      return Object.freeze(status);
    }
    if(window.MonitoringOnlineDataService?.publishLocal) await window.MonitoringOnlineDataService.publishLocal();
    if(window.MonitoringOnlineDataService?.hydrate) await window.MonitoringOnlineDataService.hydrate();
    if(window.MonitoringApiClient?.getDataStatus){
      const server = await window.MonitoringApiClient.getDataStatus();
      if(server?.ok && server.data?.ok) {
        status.server = server.data;
        writeJson(SERVER_STATUS_KEY, server.data);
      }
    }
    status.status = 'synced';
    status.readiness = readiness;
    status.lastSyncSuccessAt = new Date().toISOString();
    status.message = 'Synchronisation serveur exécutée.';
    writeJson(STATUS_KEY, status);
    return Object.freeze(status);
  }
  function getServerStatus(){ return readJson(SERVER_STATUS_KEY, null); }
  function clearQueue(){ writeJson(QUEUE_KEY, []); return getStatus(); }

  window.MonitoringSyncService = Object.freeze({ isSyncEnabled, checkReadiness, getStatus, getServerStatus, getQueue, enqueue, planSync, syncNow, clearQueue });
})();
