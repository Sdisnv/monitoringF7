/* Monitoring F7 v61 — configuration backend optionnel futur.
   Par défaut, toute l'application reste locale/offline-first. */
(function(){
  'use strict';

  const DEFAULT_BACKEND_CONFIG = Object.freeze({
    backendEnabled: false,
    apiBaseUrl: '',
    syncEnabled: false,
    authMode: 'local',
    storageMode: 'local',
    auditMode: 'local',
    serverAuthEnabled: false,
    tokenStorage: 'memory',
    requiredRole: 'sdis-user'
  });

  function normalizeConfig(input){
    const cfg = Object.assign({}, DEFAULT_BACKEND_CONFIG, input || {});
    return Object.freeze({
      backendEnabled: cfg.backendEnabled === true,
      apiBaseUrl: cfg.backendEnabled === true ? String(cfg.apiBaseUrl || '').trim().replace(/\/+$/, '') : '',
      syncEnabled: cfg.backendEnabled === true && cfg.syncEnabled === true,
      authMode: cfg.authMode === 'backend' && cfg.backendEnabled === true ? 'backend' : 'local',
      storageMode: cfg.storageMode === 'backend' && cfg.backendEnabled === true ? 'backend' : 'local',
      auditMode: cfg.auditMode === 'backend' && cfg.backendEnabled === true ? 'backend' : 'local',
      serverAuthEnabled: cfg.backendEnabled === true && cfg.authMode === 'backend' && cfg.serverAuthEnabled === true,
      tokenStorage: cfg.tokenStorage === 'localStorage' ? 'localStorage' : 'memory',
      requiredRole: String(cfg.requiredRole || DEFAULT_BACKEND_CONFIG.requiredRole)
    });
  }

  const runtimeOverrides = window.MonitoringBackendConfigOverrides || null;
  const activeConfig = normalizeConfig(runtimeOverrides);

  window.MonitoringBackendConfig = Object.freeze({
    defaults: DEFAULT_BACKEND_CONFIG,
    current: activeConfig,
    isBackendEnabled(){ return activeConfig.backendEnabled === true; },
    isSyncEnabled(){ return activeConfig.backendEnabled === true && activeConfig.syncEnabled === true; },
    getStatus(){
      return Object.freeze({
        backendEnabled: activeConfig.backendEnabled,
        apiBaseUrl: activeConfig.apiBaseUrl,
        syncEnabled: activeConfig.syncEnabled,
        authMode: activeConfig.authMode,
        storageMode: activeConfig.storageMode,
        auditMode: activeConfig.auditMode,
        serverAuthEnabled: activeConfig.serverAuthEnabled,
        tokenStorage: activeConfig.tokenStorage,
        requiredRole: activeConfig.requiredRole,
        localFirst: true,
        mandatoryBackend: false
      });
    }
  });
})();
