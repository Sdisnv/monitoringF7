/* Monitoring F7 v61 — contrats API documentés côté client, inactifs tant que backendEnabled=false. */
(function(){
  'use strict';

  const json = 'application/json';
  const contracts = Object.freeze({
    authLogin: {
      method: 'POST',
      path: '/auth/login',
      auth: 'none',
      request: { nip:'string', password:'string' },
      response: { accessToken:'string', refreshToken:'string?', user:'MonitoringUser', expiresAt:'ISODateTime' },
      errors: [400,401,423,429]
    },
    authMe: {
      method: 'GET',
      path: '/auth/me',
      auth: 'bearer',
      response: { user:'MonitoringUser', roles:'string[]', permissions:'string[]' },
      errors: [401,403]
    },
    authRefresh: {
      method: 'POST',
      path: '/auth/refresh',
      auth: 'refresh-token',
      response: { accessToken:'string', expiresAt:'ISODateTime' },
      errors: [401,403]
    },
    authLogout: {
      method: 'POST',
      path: '/auth/logout',
      auth: 'bearer',
      response: { ok:'boolean' },
      errors: [401]
    },
    recordsList: {
      method: 'GET',
      path: '/records',
      auth: 'bearer',
      response: { records:'MonitoringRecord[]', schemaVersion: window.MonitoringDataSchema?.schemaVersion || 4 },
      errors: [401,403,409]
    },
    recordsReplace: {
      method: 'PUT',
      path: '/records',
      auth: 'bearer',
      request: { records:'MonitoringRecord[]', schemaVersion: window.MonitoringDataSchema?.schemaVersion || 4 },
      response: { ok:'boolean', updatedAt:'ISODateTime' },
      errors: [400,401,403,409]
    },
    importedEventsReplace: {
      method: 'PUT',
      path: '/imported-events',
      auth: 'bearer',
      request: { importedEvents:'ImportedEvent[]' },
      response: { ok:'boolean', updatedAt:'ISODateTime' },
      errors: [400,401,403,409]
    },
    referencePeriodsReplace: {
      method: 'PUT',
      path: '/reference-periods',
      auth: 'bearer',
      request: { referencePeriods:'ReferencePeriod[]' },
      response: { ok:'boolean', updatedAt:'ISODateTime' },
      errors: [400,401,403,409]
    }
  });

  const roles = Object.freeze({
    sdisUser: ['read:monitoring','write:local-draft'],
    sdisAdmin: ['read:monitoring','write:monitoring','manage:reference-periods','export:audit'],
    sdisReadOnly: ['read:monitoring']
  });

  window.MonitoringApiContracts = Object.freeze({
    version: window.MonitoringConfig?.version || 'v61',
    contentType: json,
    auth: Object.freeze({
      requiredForBackend: true,
      mode: 'bearer-token-or-secure-http-session',
      localFallback: true,
      syncEnabledByDefault: false
    }),
    roles,
    contracts,
    list(){ return contracts; },
    get(name){ return contracts[name] || null; }
  });
})();
