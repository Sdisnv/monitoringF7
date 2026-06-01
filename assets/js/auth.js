/* Barrière de login locale - usage interne, non équivalent à une authentification serveur. */
(function(){
  const DEFAULT_ACCESS_HASH_HEX = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // 1234
  const enc = new TextEncoder();
  const sessionManager = window.MonitoringSessionManager;

  function getLocalAuthConfig(){
    const cfg = window.MonitoringConfig?.localAuth || {};
    return {
      requireKnownNip: cfg.requireKnownNip === true,
      sharedAccessEnabled: cfg.sharedAccessEnabled !== false,
      sharedAccessPasswordHashHex: String(cfg.sharedAccessPasswordHashHex || DEFAULT_ACCESS_HASH_HEX),
      users: Array.isArray(cfg.users) ? cfg.users : []
    };
  }
  function toHex(buffer){
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  async function sha256Hex(value){
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(value)));
    return toHex(digest);
  }
  function getProfile(){
    return sessionManager?.getProfile?.() || null;
  }
  function setProfile(profile){
    return sessionManager?.setProfile?.(profile) || profile;
  }
  function buildProfile(nip, source, existing, configuredUser){
    const now = new Date().toISOString();
    const previous = existing && typeof existing === 'object' ? existing : {};
    const next = Object.assign({}, previous, {
      nip,
      displayName: configuredUser?.displayName || configuredUser?.name || previous.displayName || previous.name || `NIP ${nip}`,
      role: configuredUser?.role || previous.role || 'sdis-user',
      authSource: source,
      passwordManagedBy: source === 'legacy-profile' ? 'legacy-local-profile' : 'local-configuration',
      updatedAt: now,
      lastLoginAt: now
    });
    if(!next.createdAt) next.createdAt = now;
    if(source !== 'legacy-profile'){
      delete next.passwordHash;
      delete next.temporaryPasswordReplaced;
    }
    return next;
  }
  function setMessage(text, type){
    const el = document.getElementById('authMessage');
    if(!el) return;
    el.textContent = text;
    el.classList.remove('error','ok');
    if(type) el.classList.add(type);
  }
  function readSession(){
    return sessionManager?.read?.() || null;
  }
  function writeSession(profile){
    return sessionManager?.write?.(profile) || null;
  }
  function notifySessionChanged(session){
    if(sessionManager?.notify) sessionManager.notify(session || readSession());
    else document.dispatchEvent(new CustomEvent('monitoring-f7-auth-session-changed', { detail: { session: session || readSession() } }));
  }
  function clearSession(){
    sessionManager?.clear?.();
    document.body?.classList.add('auth-locked');
  }
  function syncAuthUI(active){
    document.body?.classList.toggle('auth-locked', !active);
    document.body?.classList.toggle('auth-active', !!active);
  }
  function unlock(profile){
    syncAuthUI(true);
    const overlay = document.getElementById('authOverlay');
    if(overlay) overlay.classList.add('auth-hidden');
    notifySessionChanged(writeSession(profile || getProfile() || {}));
  }
  function findConfiguredUser(nip){
    return getLocalAuthConfig().users.find(user => String(user?.nip || '') === String(nip || '') && user.active !== false) || null;
  }
  function credentialsError(reason){
    window.MonitoringAuditLog?.logWarning('login-local-failed', 'Échec login local.', { reason });
    setMessage('NIP ECA ou mot de passe incorrect.', 'error');
  }
  async function resolveLocalProfile(nip, passwordHash, currentProfile){
    const cfg = getLocalAuthConfig();
    const configuredUser = findConfiguredUser(nip);
    if(configuredUser){
      const userHash = String(configuredUser.passwordHashHex || cfg.sharedAccessPasswordHashHex || '');
      if(userHash && userHash === passwordHash) return buildProfile(nip, 'configured-user', currentProfile, configuredUser);
      return null;
    }

    if(currentProfile?.nip === nip && currentProfile?.passwordHash === passwordHash){
      return buildProfile(nip, 'legacy-profile', currentProfile, null);
    }

    if(cfg.requireKnownNip) return null;
    if(cfg.sharedAccessEnabled && cfg.sharedAccessPasswordHashHex === passwordHash){
      return buildProfile(nip, 'shared-local-access', currentProfile, null);
    }
    return null;
  }
  async function onSubmit(e){
    e.preventDefault();
    const nip = (document.getElementById('authNip')?.value || '').trim();
    const password = document.getElementById('authPassword')?.value || '';
    if(!nip){ setMessage('NIP ECA obligatoire.', 'error'); return; }
    if(!password){ setMessage('Mot de passe obligatoire.', 'error'); return; }

    const profile = getProfile();
    const hash = await sha256Hex(password);
    const resolvedProfile = await resolveLocalProfile(nip, hash, profile);
    if(!resolvedProfile){ credentialsError('credentials'); return; }
    setProfile(resolvedProfile);
    window.MonitoringAuditLog?.logAction('login-local', 'Login local validé.', { source: resolvedProfile.authSource || 'local' });
    setMessage('Accès local autorisé.', 'ok');
    unlock(resolvedProfile);
  }
  document.addEventListener('DOMContentLoaded', function(){
    syncAuthUI(false);
    const overlay = document.getElementById('authOverlay');
    try{
      const session = readSession();
      if(session && session.active === true){
        if(session.legacy) writeSession(getProfile() || {});
        if(overlay) overlay.classList.add('auth-hidden');
        syncAuthUI(true);
        return;
      }
    }catch{ clearSession(); }
    const form = document.getElementById('authForm');
    if(form) form.addEventListener('submit', onSubmit);
  });
})();

window.MonitoringAuthService = Object.freeze({
  getProfile(){ return window.MonitoringSessionManager?.getProfile?.() || null; },
  saveProfilePatch(patch){ return window.MonitoringSessionManager?.saveProfilePatch?.(patch) || null; },
  getMode(){ return window.MonitoringBackendConfig?.current?.authMode || 'local'; },
  isBackendAuthPrepared(){
    const cfg = window.MonitoringBackendConfig?.current || {};
    return cfg.backendEnabled === true && cfg.authMode === 'backend' && cfg.serverAuthEnabled === true && window.MonitoringApiClient?.isBackendEnabled?.() === true;
  },
  getStatus(){
    const prepared = this.isBackendAuthPrepared();
    return Object.freeze({
      authMode: this.getMode(),
      localSessionActive: !!this.readSession(),
      backendAuthPrepared: prepared,
      backendAuthActive: false,
      authContract: window.MonitoringApiContracts?.get?.('authLogin') || null,
      localAuthConfigured: true,
      localAuthUsers: Array.isArray(window.MonitoringConfig?.localAuth?.users) ? window.MonitoringConfig.localAuth.users.length : 0,
      message: prepared ? 'Contrat auth serveur prêt, non activé par défaut en v65.4.' : 'Session locale navigateur conservée.'
    });
  },
  readSession(){
    return window.MonitoringSessionManager?.read?.() || null;
  },
  logout(){ window.MonitoringSessionManager?.logout?.({ message:'Déconnexion locale demandée.' }); }
});
