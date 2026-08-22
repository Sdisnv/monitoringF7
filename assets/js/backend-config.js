/* Monitoring F7 v66.0 — configuration backend.
   La configuration effective est activée par MonitoringBackendConfigOverrides dans config.js. */
(function(){
  'use strict';

  const DEFAULT_BACKEND_CONFIG = Object.freeze({
    backendEnabled: false,
    apiBaseUrl: '',
    syncEnabled: false,
    authMode: 'local',
    storageMode: 'local',
    centralStorageEnabled: false,
    auditMode: 'local',
    serverAuthEnabled: false,
    oidcEnabled: false,
    storageDriver: 'local',
    contractCheckEnabled: true,
    mockBackendEnabled: false,
    tokenStorage: 'memory',
    requiredRole: 'UTILISATEUR'
  });

  function normalizeConfig(input){
    const cfg = Object.assign({}, DEFAULT_BACKEND_CONFIG, input || {});
    return Object.freeze({
      backendEnabled: cfg.backendEnabled === true,
      apiBaseUrl: cfg.backendEnabled === true ? String(cfg.apiBaseUrl || '').trim().replace(/\/+$/, '') : '',
      syncEnabled: cfg.backendEnabled === true && cfg.syncEnabled === true,
      authMode: cfg.authMode === 'backend' && cfg.backendEnabled === true ? 'backend' : 'local',
      storageMode: cfg.storageMode === 'backend' && cfg.backendEnabled === true ? 'backend' : 'local',
      centralStorageEnabled: cfg.backendEnabled === true && cfg.storageMode === 'backend' && cfg.centralStorageEnabled === true,
      auditMode: cfg.auditMode === 'backend' && cfg.backendEnabled === true ? 'backend' : 'local',
      serverAuthEnabled: cfg.backendEnabled === true && cfg.authMode === 'backend' && cfg.serverAuthEnabled === true,
      oidcEnabled: cfg.backendEnabled === true && cfg.authMode === 'backend' && cfg.serverAuthEnabled === true && cfg.oidcEnabled === true,
      storageDriver: cfg.backendEnabled === true && cfg.storageMode === 'backend' && cfg.storageDriver === 'postgres' ? 'postgres' : 'local',
      contractCheckEnabled: cfg.contractCheckEnabled !== false,
      mockBackendEnabled: false,
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
        centralStorageEnabled: activeConfig.centralStorageEnabled,
        auditMode: activeConfig.auditMode,
        serverAuthEnabled: activeConfig.serverAuthEnabled,
        oidcEnabled: activeConfig.oidcEnabled,
        storageDriver: activeConfig.storageDriver,
        contractCheckEnabled: activeConfig.contractCheckEnabled,
        mockBackendEnabled: activeConfig.mockBackendEnabled,
        tokenStorage: activeConfig.tokenStorage,
        requiredRole: activeConfig.requiredRole,
        localFirst: false,
        mandatoryBackend: activeConfig.backendEnabled === true
      });
    }
  });
})();
