/* Monitoring F7 v66.0 — façade API online-first PostgreSQL/Okta. */
(function(){
  'use strict';

  let accessToken = null;

  function getConfig(){
    return window.MonitoringBackendConfig?.current || { backendEnabled:false, apiBaseUrl:'', syncEnabled:false, authMode:'local', storageMode:'local', auditMode:'local', serverAuthEnabled:false };
  }

  function isBackendEnabled(){
    const cfg = getConfig();
    return cfg.backendEnabled === true;
  }

  function getBackendStatus(){
    const status = window.MonitoringBackendConfig?.getStatus ? window.MonitoringBackendConfig.getStatus() : getConfig();
    return Object.freeze(Object.assign({}, status, {
      statusLabel: isBackendEnabled() ? 'backend online actif' : 'local uniquement',
      lastCheckedAt: new Date().toISOString()
    }));
  }

  function disabledResponse(method, path){
    return Promise.resolve(Object.freeze({
      ok: false,
      status: 0,
      disabled: true,
      localMode: true,
      method,
      path: String(path || ''),
      message: 'Backend désactivé en v65 : aucune requête distante effectuée.'
    }));
  }

  async function request(method, path, body, options){
    if(!isBackendEnabled()) return disabledResponse(method, path);
    const cfg = getConfig();
    const base = String(cfg.apiBaseUrl || '').replace(/\/+$/, '');
    const endpoint = `${base}/${String(path || '').replace(/^\/+/, '')}`;
    const fetchOptions = Object.assign({
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin'
    }, options || {});
    fetchOptions.headers = Object.assign({}, fetchOptions.headers || {});
    if(accessToken) fetchOptions.headers.Authorization = `Bearer ${accessToken}`;
    if(body !== undefined && body !== null) fetchOptions.body = JSON.stringify(body);
    try{
      const response = await fetch(endpoint, fetchOptions);
      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await response.json() : await response.text();
      return { ok: response.ok, status: response.status, data: payload };
    }catch(error){
      return { ok:false, status:0, error:String(error?.message || error), message:'Erreur API distante non bloquante.' };
    }
  }

  async function loginServer(credentials, options){
    const response = await request('POST', '/auth/login', credentials, options);
    if(response?.ok && response.data?.accessToken) accessToken = String(response.data.accessToken);
    return response;
  }

  async function logoutServer(options){
    const response = await request('POST', '/auth/logout', null, options);
    accessToken = null;
    return response;
  }

  async function refreshSession(body, options){
    const response = await request('POST', '/auth/refresh', body || {}, options);
    if(response?.ok && response.data?.accessToken) accessToken = String(response.data.accessToken);
    return response;
  }

  window.MonitoringApiClient = Object.freeze({
    apiGet(path, options){ return request('GET', path, null, options); },
    apiPost(path, body, options){ return request('POST', path, body, options); },
    apiPut(path, body, options){ return request('PUT', path, body, options); },
    apiDelete(path, options){ return request('DELETE', path, null, options); },
    loginServer,
    logoutServer,
    getCurrentUser(options){ return request('GET', '/auth/me', null, options); },
    refreshSession,
    listRecords(options){ return request('GET', '/records', null, options); },
    replaceRecords(records, options){ return request('PUT', '/records', { records, schemaVersion: window.MonitoringDataSchema?.schemaVersion || 4 }, options); },
    replaceImportedEvents(importedEvents, options){ return request('PUT', '/imported-events', { importedEvents }, options); },
    replaceReferencePeriods(referencePeriods, options){ return request('PUT', '/reference-periods', { referencePeriods }, options); },
    listObjectives(options){ return request('GET', '/objectives', null, options); },
    replaceObjectives(objectives, options){ return request('PUT', '/objectives', { objectives, schemaVersion: window.MonitoringDataSchema?.schemaVersion || 4 }, options); },
    getDataStatus(options){ return request('GET', '/data/status', null, options); },
    listUsers(options){ return request('GET', '/admin/users', null, options); },
    saveUser(user, options){ return request('POST', '/admin/users', user, options); },
    listAudit(options){ return request('GET', '/audit-log', null, options); },
    listAuditLog(limit, options){ return request('GET', `/audit-log?limit=${encodeURIComponent(limit || 100)}`, null, options); },
    appendAudit(entry, options){ return request('POST', '/audit-log', entry, options); },
    getAdminSettings(options){ return request('GET', '/admin/settings', null, options); },
    saveAdminSettings(settings, options){ return request('PUT', '/admin/settings', settings, options); },
    verifyAdminCode(hash, options){ return request('POST', '/admin/settings', { hash }, options); },
    updateAdminCode(currentHash, nextHash, options){ return request('PUT', '/admin/settings', Object.assign({ currentHash, nextHash }, options?.body || {}), options); },
    setAccessToken(token){ accessToken = token ? String(token) : null; },
    clearAccessToken(){ accessToken = null; },
    getAccessToken(){ return accessToken; },
    isBackendEnabled,
    getBackendStatus
  });
})();
