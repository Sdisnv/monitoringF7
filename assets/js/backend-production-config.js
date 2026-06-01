/* Monitoring F7 v66 — activation contrôlée backend PostgreSQL Netlify/Supabase.
   Ce fichier doit être chargé avant backend-config.js. */
(function(){
  'use strict';

  window.MonitoringBackendConfigOverrides = Object.freeze({
    backendEnabled: true,
    apiBaseUrl: '',
    syncEnabled: false,
    authMode: 'backend',
    storageMode: 'backend',
    centralStorageEnabled: true,
    auditMode: 'local',
    serverAuthEnabled: true,
    oidcEnabled: false,
    storageDriver: 'postgres',
    contractCheckEnabled: true,
    mockBackendEnabled: false,
    tokenStorage: 'memory',
    requiredRole: 'sdis-user'
  });
})();
