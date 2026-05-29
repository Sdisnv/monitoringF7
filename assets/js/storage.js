/* Monitoring F7 v61 — StorageService central IndexedDB + localStorage fallback non destructif. */
(function(){
  'use strict';

  const APP_VERSION = window.MonitoringConfig?.version || 'v61';
  const STORAGE_SCHEMA_VERSION = 1;
  const DB_NAME = 'MonitoringF7Storage';
  const DB_VERSION = 1;
  const STORE_DATA = 'data';
  const STORE_META = 'meta';
  const BACKUP_KEY = 'monitoring_f7_storage_backup_before_migration_v56';
  const MIGRATION_FLAG_KEY = 'monitoring_f7_storage_migration_v56_done';
  const KNOWN_KEYS = [
    'monitoring_exercices_sdis_v2',
    'monitoring_exercices_sdis_references_v1',
    'monitoring_exercices_sdis_imported_events_v1',
    'monitoring_exercices_sdis_objectifs_v1',
    'monitoring_exercices_sdis_reference_periods_v1'
  ];

  const state = {
    db: null,
    indexedDBAvailable: false,
    localStorageAvailable: false,
    initialized: false,
    initializing: null,
    cache: new Map(),
    errors: [],
    lastBackupAt: null,
    lastMigrationAt: null,
    migrationHistory: []
  };

  function now(){ return new Date().toISOString(); }

  function log(type, message, data){
    const entry = { type, message, data: data || null, at: now() };
    state.errors.push(entry);
    if(state.errors.length > 20) state.errors.shift();
    if(window.MonitoringSecurity?.logSecurity) window.MonitoringSecurity.logSecurity(type, message, data);
    else console.warn('[Monitoring F7 stockage]', type, message, data || '');
  }

  function canUseLocalStorage(){
    try {
      const k = '__monitoring_f7_storage_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return true;
    } catch { return false; }
  }

  function checkIndexedDB(){
    try {
      if(!('indexedDB' in window)) return { ok:false, reason:'IndexedDB indisponible dans ce navigateur.' };
      return { ok:true };
    } catch(err){ return { ok:false, reason:err?.message || 'IndexedDB inaccessible.' }; }
  }

  function openDB(){
    return new Promise((resolve, reject) => {
      const support = checkIndexedDB();
      if(!support.ok) return reject(new Error(support.reason));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if(!db.objectStoreNames.contains(STORE_DATA)) db.createObjectStore(STORE_DATA, { keyPath:'key' });
        if(!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath:'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Ouverture IndexedDB impossible.'));
      request.onblocked = () => log('indexeddb-blocked', 'Mise à niveau IndexedDB bloquée par un autre onglet.');
    });
  }

  function idbGet(storeName, key){
    if(!state.db) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      try {
        const tx = state.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error || new Error('Lecture IndexedDB impossible.'));
      } catch(err){ reject(err); }
    });
  }

  function idbPut(storeName, value){
    if(!state.db) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      try {
        const tx = state.db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Transaction IndexedDB échouée.'));
        tx.objectStore(storeName).put(value);
      } catch(err){ reject(err); }
    });
  }

  function idbDelete(storeName, key){
    if(!state.db) return Promise.resolve(false);
    return new Promise((resolve, reject) => {
      try {
        const tx = state.db.transaction(storeName, 'readwrite');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error || new Error('Suppression IndexedDB échouée.'));
        tx.objectStore(storeName).delete(key);
      } catch(err){ reject(err); }
    });
  }

  function readLocalRaw(key){
    if(!state.localStorageAvailable) return null;
    try { return localStorage.getItem(key); }
    catch(err){ log('localstorage-read-failed', `Lecture localStorage impossible pour ${key}`, { message:err?.message }); return null; }
  }

  function writeLocalRaw(key, raw){
    if(!state.localStorageAvailable) return false;
    try { localStorage.setItem(key, raw); return true; }
    catch(err){ log('localstorage-write-failed', `Écriture localStorage impossible pour ${key}`, { message:err?.message }); return false; }
  }

  function parseJSON(raw, fallback, key){
    try { return raw ? JSON.parse(raw) : fallback; }
    catch(err){
      log('storage-corrupt', `JSON local corrompu pour ${key}`, { message:err?.message });
      if(state.localStorageAvailable){ try { localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw || ''); } catch {} }
      return fallback;
    }
  }

  function buildEnvelope(key, value, sourceVersion){
    const previous = state.cache.get(key);
    const previousEnvelope = previous && typeof previous === 'object' && previous.__monitoringF7Envelope ? previous : null;
    return {
      __monitoringF7Envelope: true,
      key,
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      sourceVersion: sourceVersion || previousEnvelope?.sourceVersion || APP_VERSION,
      createdAt: previousEnvelope?.createdAt || now(),
      updatedAt: now(),
      migrationHistory: Array.isArray(previousEnvelope?.migrationHistory) ? previousEnvelope.migrationHistory : [],
      data: value
    };
  }

  function unwrap(value){
    return value && typeof value === 'object' && value.__monitoringF7Envelope ? value.data : value;
  }

  function validateStoredData(key, value){
    const data = unwrap(value);
    const result = { ok:true, warnings:[], key };
    if(data === undefined) { result.ok = false; result.warnings.push('Donnée undefined.'); return result; }
    if(key.includes('references') || key.includes('objectifs')) {
      if(data !== null && typeof data !== 'object') { result.ok = false; result.warnings.push('Objet attendu.'); }
    }
    if(key.includes('imported_events') || key.includes('reference_periods') || key.includes('_v2')) {
      if(!Array.isArray(data)) { result.ok = false; result.warnings.push('Tableau attendu.'); }
    }
    if(Array.isArray(data) && data.length > 50000) result.warnings.push('Volume de lignes inhabituel.');
    return result;
  }

  function getJSON(key, fallback = null, validator = null){
    if(state.cache.has(key)) {
      const cached = unwrap(state.cache.get(key));
      if(typeof validator === 'function' && !validator(cached)) return fallback;
      return cached;
    }
    const parsed = parseJSON(readLocalRaw(key), fallback, key);
    if(typeof validator === 'function' && !validator(parsed)) {
      log('storage-invalid', `Données locales invalides pour ${key}`);
      return fallback;
    }
    if(parsed !== fallback && parsed !== null) state.cache.set(key, buildEnvelope(key, parsed, 'localStorage'));
    return parsed;
  }

  function setJSON(key, value){
    const envelope = buildEnvelope(key, value, APP_VERSION);
    state.cache.set(key, envelope);
    const localOk = writeLocalRaw(key, JSON.stringify(value));
    if(state.db) {
      idbPut(STORE_DATA, envelope).catch(err => log('indexeddb-write-failed', `Écriture IndexedDB impossible pour ${key}`, { message:err?.message }));
    }
    return localOk || !!state.db;
  }

  function remove(key){
    state.cache.delete(key);
    let ok = true;
    if(state.localStorageAvailable) {
      try { localStorage.removeItem(key); } catch(err){ ok = false; log('storage-remove-failed', `Suppression localStorage impossible pour ${key}`, { message:err?.message }); }
    }
    if(state.db) idbDelete(STORE_DATA, key).catch(err => log('indexeddb-delete-failed', `Suppression IndexedDB impossible pour ${key}`, { message:err?.message }));
    return ok;
  }

  function snapshot(keys){
    const data = {};
    (keys || KNOWN_KEYS).forEach(key => { data[key] = readLocalRaw(key); });
    return data;
  }

  function restore(snapshotData){
    Object.entries(snapshotData || {}).forEach(([key, value]) => {
      try {
        if(value == null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
        state.cache.delete(key);
      } catch(err){ log('storage-rollback-failed', `Rollback incomplet pour ${key}`, { message: err?.message }); }
    });
  }

  function exportBackup(){
    const backup = {
      type: 'Monitoring F7 storage backup',
      appVersion: APP_VERSION,
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      exportedAt: now(),
      data: {}
    };
    KNOWN_KEYS.forEach(key => { backup.data[key] = getJSON(key, null); });
    return backup;
  }

  async function saveData(key, value){
    setJSON(key, value);
    return true;
  }

  async function loadData(key, fallback = null){
    if(state.db){
      try {
        const item = await idbGet(STORE_DATA, key);
        if(item) { state.cache.set(key, item); return unwrap(item); }
      } catch(err){ log('indexeddb-read-failed', `Lecture IndexedDB impossible pour ${key}`, { message:err?.message }); }
    }
    return getJSON(key, fallback);
  }

  async function saveMeta(){
    const meta = {
      key:'storage-meta',
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      updatedAt: now(),
      lastBackupAt: state.lastBackupAt,
      lastMigrationAt: state.lastMigrationAt,
      migrationHistory: state.migrationHistory
    };
    if(state.db) await idbPut(STORE_META, meta);
    if(state.localStorageAvailable) writeLocalRaw('monitoring_f7_storage_meta_v56', JSON.stringify(meta));
  }

  async function createBackupBeforeMigration(){
    const backup = exportBackup();
    backup.reason = 'Sauvegarde automatique avant migration douce localStorage vers IndexedDB';
    if(state.localStorageAvailable) writeLocalRaw(BACKUP_KEY, JSON.stringify(backup));
    state.lastBackupAt = backup.exportedAt;
    return backup;
  }

  async function migrateLegacyStorageIfNeeded(){
    if(!state.db) return { migrated:false, reason:'IndexedDB indisponible, localStorage conservé.' };
    const already = readLocalRaw(MIGRATION_FLAG_KEY);
    if(already) return { migrated:false, reason:'Migration déjà effectuée.' };

    await createBackupBeforeMigration();
    const migratedKeys = [];
    for(const key of KNOWN_KEYS){
      const raw = readLocalRaw(key);
      if(!raw) continue;
      const parsed = parseJSON(raw, null, key);
      const validation = validateStoredData(key, parsed);
      if(!validation.ok){
        log('storage-migration-skip-invalid', `Migration ignorée pour ${key}`, validation);
        continue;
      }
      const envelope = buildEnvelope(key, parsed, 'legacy-localStorage');
      envelope.migrationHistory.push({ at:now(), from:'localStorage', to:'IndexedDB', appVersion:APP_VERSION, nonDestructive:true });
      await idbPut(STORE_DATA, envelope);
      state.cache.set(key, envelope);
      migratedKeys.push(key);
    }
    state.lastMigrationAt = now();
    state.migrationHistory.push({ at:state.lastMigrationAt, appVersion:APP_VERSION, migratedKeys, nonDestructive:true });
    window.MonitoringAuditLog?.logAction('storage-migration', 'Migration stockage locale non destructive terminée.', { migratedKeys });
    writeLocalRaw(MIGRATION_FLAG_KEY, JSON.stringify({ at:state.lastMigrationAt, appVersion:APP_VERSION, migratedKeys }));
    await saveMeta();
    if(migratedKeys.length) log('storage-migration-ok', 'Migration douce stockage effectuée.', { migratedKeys });
    return { migrated:true, migratedKeys };
  }

  async function warmCacheFromIndexedDB(){
    if(!state.db) return;
    await Promise.all(KNOWN_KEYS.map(async key => {
      try {
        const item = await idbGet(STORE_DATA, key);
        if(item) state.cache.set(key, item);
      } catch(err){ log('indexeddb-cache-failed', `Cache IndexedDB impossible pour ${key}`, { message:err?.message }); }
    }));
  }

  async function initStorage(){
    if(state.initialized) return getStorageDiagnostics();
    if(state.initializing) return state.initializing;
    state.initializing = (async () => {
      state.localStorageAvailable = canUseLocalStorage();
      const idbSupport = checkIndexedDB();
      if(idbSupport.ok){
        try {
          state.db = await openDB();
          state.indexedDBAvailable = true;
          await migrateLegacyStorageIfNeeded();
          await warmCacheFromIndexedDB();
        } catch(err){
          state.indexedDBAvailable = false;
          log('indexeddb-open-failed', 'IndexedDB indisponible. Monitoring F7 continue avec localStorage.', { message:err?.message });
        }
      } else {
        log('indexeddb-unavailable', idbSupport.reason);
      }
      state.initialized = true;
      return getStorageDiagnostics();
    })();
    return state.initializing;
  }

  function approximateLocalStorageUsage(){
    if(!state.localStorageAvailable) return null;
    try {
      let total = 0;
      for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        total += (key?.length || 0) + (localStorage.getItem(key)?.length || 0);
      }
      return Math.round(total / 1024);
    } catch { return null; }
  }

  function getStorageDiagnostics(){
    return {
      appVersion: APP_VERSION,
      storageSchemaVersion: STORAGE_SCHEMA_VERSION,
      indexedDBAvailable: state.indexedDBAvailable,
      localStorageAvailable: state.localStorageAvailable,
      quotaApproxKb: approximateLocalStorageUsage(),
      lastBackupAt: state.lastBackupAt || parseJSON(readLocalRaw(BACKUP_KEY), {})?.exportedAt || null,
      lastMigrationAt: state.lastMigrationAt || parseJSON(readLocalRaw(MIGRATION_FLAG_KEY), {})?.at || null,
      migrationHistory: state.migrationHistory,
      cachedKeys: [...state.cache.keys()],
      recentErrors: state.errors.slice(-10)
    };
  }

  window.MonitoringStorage = Object.freeze({
    initStorage,
    saveData,
    loadData,
    exportBackup,
    validateStoredData,
    migrateLegacyStorageIfNeeded,
    getStorageDiagnostics,
    getJSON,
    setJSON,
    remove,
    snapshot,
    restore,
    checkIndexedDB
  });

  initStorage().catch(err => log('storage-init-failed', 'Initialisation stockage impossible.', { message:err?.message }));
})();
