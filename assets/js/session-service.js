/* Monitoring F7 v65.5 — service session/profil, OIDC prioritaire avec secours local. */
(function(){
  'use strict';

  const AUTH_SESSION_KEY = 'monitoring_sdis_auth_session_v1';
  const AUTH_PROFILE_KEY = 'monitoring_sdis_auth_profile_v1';
  const AUTH_SESSION_BACKUP_KEY = 'monitoring_sdis_auth_session_backup_v1';
  const ADMIN_LOCK_KEY = 'monitoring_f7_admin_lock_v1';
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

  function saveProfilePatch(patch){
    const current = getProfile() || {};
    const next = Object.assign({}, current, patch || {}, { updatedAt:new Date().toISOString() });
    setProfile(next);
    return next;
  }

  function clearSession(options){
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_LOCK_KEY);
    try { localStorage.removeItem(AUTH_SESSION_BACKUP_KEY); } catch {}
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
    return parsed;
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
      version: window.MonitoringConfig?.version || 'v65.5'
    };
  }

  function writeSession(profile){
    const sessionPayload = buildSessionPayload(profile || getProfile() || {});
    const raw = JSON.stringify(sessionPayload);
    sessionStorage.setItem(AUTH_SESSION_KEY, raw);
    try { localStorage.setItem(AUTH_SESSION_BACKUP_KEY, raw); } catch {}
    return sessionPayload;
  }

  function notify(session){
    document.dispatchEvent(new CustomEvent('monitoring-f7-auth-session-changed', { detail: { session: session || readSession() } }));
  }

  function logout(options){
    const profile = getProfile() || {};
    window.MonitoringAuditLog?.logAction(profile.authSource === 'okta-oidc' ? 'logout-okta-oidc' : 'logout-local', options?.message || 'Déconnexion demandée.', {});
    clearSession({ lockUi:false });
    if(profile.authSource === 'okta-oidc' && options?.serverLogout !== false){
      location.href = '/.netlify/functions/auth-logout';
      return;
    }
    if(options?.reload !== false) location.reload();
  }

  window.MonitoringSessionManager = Object.freeze({
    keys: Object.freeze({ AUTH_SESSION_KEY, AUTH_PROFILE_KEY, AUTH_SESSION_BACKUP_KEY, ADMIN_LOCK_KEY }),
    maxAgeMs: SESSION_MAX_AGE_MS,
    getProfile,
    setProfile,
    saveProfilePatch,
    read: readSession,
    write: writeSession,
    clear: clearSession,
    notify,
    logout
  });
})();

