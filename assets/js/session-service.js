/* Monitoring F7 v67.0 — service session/profil, OIDC prioritaire avec secours local. */
(function(){
  'use strict';

  const AUTH_SESSION_KEY = 'monitoring_sdis_auth_session_v1';
  const AUTH_PROFILE_KEY = 'monitoring_sdis_auth_profile_v1';
  const AUTH_SESSION_BACKUP_KEY = 'monitoring_sdis_auth_session_backup_v1';
  const ADMIN_LOCK_KEY = 'monitoring_f7_admin_lock_v1';
  const LOGGED_OUT_KEY = 'monitoring_f7_logged_out_v1';
  const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

  function parseJson(raw){
    if(!raw) return null;
    if(raw === '1' || raw === 'true') return { active:true, legacy:true };
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch { return null; }
  }

  function getProfile(){
    try { return JSON.parse(localStorage.getItem(AUTH_PROFILE_KEY) || 'null'); } catch { return null; }
  }

  function setProfile(profile){
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile || {}));
    return profile || {};
  }

  function setLoggedOutFlag(active){
    try {
      if(active) {
        localStorage.setItem(LOGGED_OUT_KEY, JSON.stringify({ active:true, at:new Date().toISOString() }));
        sessionStorage.setItem(LOGGED_OUT_KEY, '1');
      } else {
        localStorage.removeItem(LOGGED_OUT_KEY);
        sessionStorage.removeItem(LOGGED_OUT_KEY);
      }
    } catch {}
  }

  function isLoggedOut(){
    try {
      if(sessionStorage.getItem(LOGGED_OUT_KEY) === '1') return true;
      const saved = JSON.parse(localStorage.getItem(LOGGED_OUT_KEY) || 'null');
      return saved?.active === true;
    } catch { return false; }
  }

  function saveProfilePatch(patch){
    const current = getProfile() || {};
    const next = Object.assign({}, current, patch || {}, { updatedAt:new Date().toISOString() });
    setProfile(next);
    exposeMonitoringAuthFromProfile(next);
    return next;
  }

  function clearSession(options){
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_LOCK_KEY);
    try { localStorage.removeItem(AUTH_SESSION_BACKUP_KEY); } catch {}
    if(options?.clearProfile === true) {
      try { localStorage.removeItem(AUTH_PROFILE_KEY); } catch {}
    }
    if(options?.lockUi !== false) document.body?.classList.add('auth-locked');
  }

  function readSession(options){
    const sessionRaw = sessionStorage.getItem(AUTH_SESSION_KEY);
    const localRaw = localStorage.getItem(AUTH_SESSION_BACKUP_KEY);
    const parsed = parseJson(sessionRaw) || parseJson(localRaw);
    if(!parsed){
      if(options?.cleanup !== false) clearSession({ lockUi:false });
      return null;
    }
    if(parsed.startedAt && Date.now() - Date.parse(parsed.startedAt) > SESSION_MAX_AGE_MS){
      clearSession();
      return null;
    }
    if(!sessionRaw && parsed.active === true){
      try { sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(parsed)); } catch {}
    }
    exposeMonitoringAuthFromProfile(getProfile(), parsed);
    return parsed;
  }

  function exposeMonitoringAuthFromProfile(profile, session){
    if(isLoggedOut()) return null;
    const p = profile || getProfile() || {};
    const s = session || null;
    const activeOidcSession = s?.active === true && (s?.authSource === 'okta-oidc' || s?.mode === 'institutional-oidc');
    if(!activeOidcSession) return null;
    const roles = Array.isArray(p.roles) ? p.roles : (Array.isArray(s?.roles) ? s.roles : []);
    const permissions = Array.isArray(p.permissions) ? p.permissions : (Array.isArray(s?.permissions) ? s.permissions : []);
    const user = Object.freeze(Object.assign({}, window.CurrentUser || {}, {
      nip: p.nip || s?.nip || window.CurrentUser?.nip || '',
      displayName: p.displayName || p.name || s?.displayName || window.CurrentUser?.displayName || 'Utilisateur SDIS',
      roles,
      permissions,
      authSource: 'okta-oidc'
    }));
    window.CurrentUser = user;
    window.CurrentRoles = Object.freeze(roles.slice());
    window.CurrentPermissions = Object.freeze(permissions.slice());
    const authState = {
      isAuthenticated: true,
      mode: 'okta',
      user,
      roles: window.CurrentRoles,
      permissions: window.CurrentPermissions
    };
    try {
      Object.defineProperty(window, 'MonitoringAuth', { configurable:true, enumerable:true, writable:true, value:authState });
    } catch {
      window.MonitoringAuth = authState;
    }
    return authState;
  }

  function buildSessionPayload(profile){
    return {
      active: true,
      mode: profile?.authSource === 'okta-oidc' ? 'institutional-oidc' : 'local-browser-only',
      authSource: profile?.authSource || 'local',
      displayName: profile?.displayName || profile?.name || '',
      roles: Array.isArray(profile?.roles) ? profile.roles : [],
      permissions: Array.isArray(profile?.permissions) ? profile.permissions : [],
      nip: profile?.nip || '',
      startedAt: new Date().toISOString(),
      referenceDate: window.MonitoringEventRules?.sessionReferenceDateIso || new Date().toISOString().slice(0,10),
      source: location.protocol === 'file:' ? 'local-file' : 'served-origin',
      version: window.MonitoringConfig?.version || 'v67.0'
    };
  }

  function writeSession(profile){
    setLoggedOutFlag(false);
    const sessionPayload = buildSessionPayload(profile || getProfile() || {});
    const raw = JSON.stringify(sessionPayload);
    sessionStorage.setItem(AUTH_SESSION_KEY, raw);
    try { localStorage.setItem(AUTH_SESSION_BACKUP_KEY, raw); } catch {}
    exposeMonitoringAuthFromProfile(profile || getProfile() || {}, sessionPayload);
    return sessionPayload;
  }

  function notify(session){
    document.dispatchEvent(new CustomEvent('monitoring-f7-auth-session-changed', { detail: { session: session || readSession() } }));
  }

  function logout(options){
    const profile = getProfile() || {};
    window.MonitoringAuditLog?.logAction(profile.authSource === 'okta-oidc' ? 'logout-okta-oidc' : 'logout-local', options?.message || 'Déconnexion demandée.', {});
    setLoggedOutFlag(true);
    clearSession({ lockUi:false, clearProfile:true });
    try { delete window.MonitoringAuth; delete window.CurrentUser; delete window.CurrentRoles; delete window.CurrentPermissions; } catch {
      window.MonitoringAuth = undefined;
      window.CurrentUser = undefined;
      window.CurrentRoles = undefined;
      window.CurrentPermissions = undefined;
    }
    if(profile.authSource === 'okta-oidc' && options?.serverLogout !== false){
      try { sessionStorage.removeItem('monitoring_f7_online_hydrated_v1'); } catch {}
      location.assign('/.netlify/functions/auth-logout?returnTo=/%3FloggedOut%3D1');
      return;
    }
    if(options?.reload !== false) location.reload();
  }

  exposeMonitoringAuthFromProfile(getProfile(), readSession({ cleanup:false }));

  window.MonitoringSessionManager = Object.freeze({
    keys: Object.freeze({ AUTH_SESSION_KEY, AUTH_PROFILE_KEY, AUTH_SESSION_BACKUP_KEY, ADMIN_LOCK_KEY }),
    maxAgeMs: SESSION_MAX_AGE_MS,
    getProfile,
    setProfile,
    setLoggedOutFlag,
    isLoggedOut,
    saveProfilePatch,
    read: readSession,
    write: writeSession,
    clear: clearSession,
    notify,
    logout
  });
})();
