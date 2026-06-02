/* Monitoring F7 v66.18 — auth Okta production avec login institutionnel à lien unique. */
(function(){
  const DEFAULT_ACCESS_HASH_HEX = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  const enc = new TextEncoder();
  const sessionManager = window.MonitoringSessionManager;

  function getLocalAuthConfig(){
    const cfg = window.MonitoringConfig?.localAuth || {};
    return {
      requireKnownNip: cfg.requireKnownNip === true,
      sharedAccessEnabled: cfg.sharedAccessEnabled === true && cfg.allowLocalFallback === true,
      allowLocalFallback: cfg.allowLocalFallback === true,
      sharedAccessPasswordHashHex: String(cfg.sharedAccessPasswordHashHex || ''),
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
  function normalizeOidcProfile(payload){
    const now = new Date().toISOString();
    const user = payload?.user || {};
    const roles = Array.isArray(payload?.roles) ? payload.roles : (Array.isArray(user.roles) ? user.roles : []);
    const permissions = Array.isArray(payload?.permissions) ? payload.permissions : (Array.isArray(user.permissions) ? user.permissions : []);
    const displayName = String(user.displayName || user.name || user.email || user.nip || 'Utilisateur SDIS').trim();
    return {
      nip: String(user.nip || user.sub || user.email || ''),
      displayName,
      name: displayName,
      email: user.email || '',
      role: roles[0] || 'sdis-user',
      roles,
      permissions,
      authSource: 'okta-oidc',
      passwordManagedBy: 'institutional-oidc',
      updatedAt: now,
      lastLoginAt: now,
      oidcUser: user
    };
  }
  function exposeMonitoringAuth(user, roles, permissions){
    const authState = {
      isAuthenticated: true,
      mode: 'okta',
      user: user || window.CurrentUser || null,
      roles: Array.isArray(roles) ? roles.slice() : (Array.isArray(window.CurrentRoles) ? Array.from(window.CurrentRoles) : []),
      permissions: Array.isArray(permissions) ? permissions.slice() : (Array.isArray(window.CurrentPermissions) ? Array.from(window.CurrentPermissions) : [])
    };
    try {
      Object.defineProperty(window, 'MonitoringAuth', {
        configurable: true,
        enumerable: true,
        writable: true,
        value: authState
      });
    } catch {
      window.MonitoringAuth = authState;
    }
    return authState;
  }
  function hydrateCurrentUser(payload, profile){
    const user = payload?.user || profile || {};
    const roles = Array.isArray(payload?.roles) ? payload.roles : (Array.isArray(user?.roles) ? user.roles : (Array.isArray(profile?.roles) ? profile.roles : []));
    const permissions = Array.isArray(payload?.permissions) ? payload.permissions : (Array.isArray(user?.permissions) ? user.permissions : (Array.isArray(profile?.permissions) ? profile.permissions : []));
    window.CurrentUser = Object.freeze(Object.assign({}, user, {
      nip: user.nip || profile?.nip || user.email || '',
      displayName: profile?.displayName || user.displayName || user.name || user.email || 'Utilisateur SDIS',
      authSource: 'okta-oidc'
    }));
    window.CurrentRoles = Object.freeze(roles.slice());
    window.CurrentPermissions = Object.freeze(permissions.slice());
    exposeMonitoringAuth(window.CurrentUser, roles, permissions);
  }
  function rehydrateMonitoringAuthFromSession(){
    if(sessionManager?.isLoggedOut?.()) return null;
    const profile = getProfile() || {};
    const session = readSession() || {};
    const source = profile.authSource || session.authSource || '';
    const activeOidcSession = session.active === true && (source === 'okta-oidc' || session.mode === 'institutional-oidc');
    if(!activeOidcSession) return null;
    const user = window.CurrentUser || Object.freeze({
      nip: profile.nip || session.nip || '',
      displayName: profile.displayName || profile.name || session.displayName || 'Utilisateur SDIS',
      roles: Array.isArray(profile.roles) ? profile.roles : (Array.isArray(session.roles) ? session.roles : []),
      permissions: Array.isArray(profile.permissions) ? profile.permissions : (Array.isArray(session.permissions) ? session.permissions : []),
      authSource: 'okta-oidc'
    });
    const roles = Array.isArray(window.CurrentRoles) && window.CurrentRoles.length ? Array.from(window.CurrentRoles) : (Array.isArray(profile.roles) ? profile.roles : (Array.isArray(session.roles) ? session.roles : []));
    const permissions = Array.isArray(window.CurrentPermissions) ? Array.from(window.CurrentPermissions) : (Array.isArray(profile.permissions) ? profile.permissions : (Array.isArray(session.permissions) ? session.permissions : []));
    if(!window.CurrentUser) window.CurrentUser = Object.freeze(Object.assign({}, user));
    if(!window.CurrentRoles) window.CurrentRoles = Object.freeze(roles.slice());
    if(!window.CurrentPermissions) window.CurrentPermissions = Object.freeze(permissions.slice());
    return exposeMonitoringAuth(window.CurrentUser, roles, permissions);
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
    document.body?.classList.add('login-locked');
    document.body?.classList.add('security-locked');
  }
  function syncAuthUI(active){
    document.body?.classList.toggle('auth-locked', !active);
    document.body?.classList.toggle('login-locked', !active);
    document.body?.classList.toggle('security-locked', !active);
    document.body?.classList.toggle('auth-active', !!active);
  }
  function removeAuthLocks(){
    document.querySelector('#authOverlay')?.remove();
    document.querySelector('#loginOverlay')?.remove();
    document.querySelector('#securityModal')?.remove();
    document.body?.classList.remove('auth-locked');
    document.body?.classList.remove('login-locked');
    document.body?.classList.remove('security-locked');
    document.body?.classList.add('auth-active');
  }
  function isOktaAuthenticated(){
    if(!(window.MonitoringAuth?.isAuthenticated === true && window.MonitoringAuth?.mode === 'okta')) rehydrateMonitoringAuthFromSession();
    return window.MonitoringAuth?.isAuthenticated === true && window.MonitoringAuth?.mode === 'okta';
  }
  function hideOverlay(){
    removeAuthLocks();
  }
  function unlock(profile){
    syncAuthUI(true);
    hideOverlay();
    notifySessionChanged(writeSession(profile || getProfile() || {}));
  }
  function unlockOidc(payload){
    const profile = normalizeOidcProfile(payload);
    hydrateCurrentUser(payload, profile);
    setProfile(profile);
    syncAuthUI(true);
    hideOverlay();
    const session = writeSession(profile);
    rehydrateMonitoringAuthFromSession();
    window.MonitoringAuditLog?.logAction('login-okta-oidc', 'Session institutionnelle Okta validée.', { roles: window.CurrentRoles || [] });
    notifySessionChanged(session);
    return session;
  }
  async function checkServerAuthentication(){
    if(sessionManager?.isLoggedOut?.()) return false;
    try{
      const response = await fetch('/.netlify/functions/auth-me', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => null);
      if(response.ok && payload?.ok === true){
        unlockOidc(payload);
        return true;
      }
      return false;
    }catch(error){
      window.MonitoringAuditLog?.logWarning?.('auth-okta-check-failed', 'Contrôle auth-me indisponible.', { message:String(error?.message || error) });
      return false;
    }
  }
  function safeCurrentReturnTo(){
    const fallback = '/';
    try{
      const url = new URL(window.location.href);
      url.searchParams.delete('loggedOut');
      url.searchParams.delete('authError');
      const path = `${url.pathname || '/'}${url.search || ''}${url.hash || ''}`;
      if(!path.startsWith('/') || path.startsWith('//') || /^\s*javascript:/i.test(path)) return fallback;
      return path === '/auth/oidc/callback' ? fallback : (path || fallback);
    }catch{ return fallback; }
  }
  function startOktaLogin(){
    sessionManager?.setLoggedOutFlag?.(false);
    const returnTo = encodeURIComponent(safeCurrentReturnTo());
    const target = `/.netlify/functions/auth-oidc-start?returnTo=${returnTo}`;
    try{
      window.location.assign(target);
    }catch{
      window.location.href = target;
    }
  }
  document.addEventListener('click', function(event){
    const trigger = event.target?.closest?.('#oktaLoginButton, [data-okta-login]');
    if(!trigger) return;
    event.preventDefault();
    startOktaLogin();
  }, true);
  function showInstitutionalLogin(){
    if(isOktaAuthenticated()){ removeAuthLocks(); return; }
    syncAuthUI(false);
    const card = document.querySelector('#authOverlay .auth-card');
    if(!card) return;
    card.innerHTML = `
      <div class="auth-brand-row"><img class="auth-logo" src="assets/img/logo-monitoring-f7.jpeg" alt="Logo Monitoring F7"><h2>Connexion institutionnelle requise</h2></div>
      <p class="auth-note">Connectez-vous avec votre compte institutionnel pour accéder au Monitoring F7.</p>
      <div class="auth-message" id="authMessage">Contrôle de la session en cours…</div>
      <a class="primary auth-submit" id="oktaLoginButton" data-okta-login="true" href="/.netlify/functions/auth-oidc-start" role="button">Se connecter avec Okta</a>`;
    const oktaBtn = document.getElementById('oktaLoginButton');
    if(oktaBtn) oktaBtn.addEventListener('click', (event) => { event.preventDefault(); startOktaLogin(); });
  }
  function restoreLocalFallbackForm(){
    if(isOktaAuthenticated()){ removeAuthLocks(); return; }
    if(!getLocalAuthConfig().allowLocalFallback){ setMessage('Connexion impossible. Veuillez réessayer ou contacter l’administrateur.', 'error'); return; }
    const card = document.querySelector('#authOverlay .auth-card');
    if(!card) return;
    card.innerHTML = `
      <div class="auth-brand-row"><img class="auth-logo" src="assets/img/logo-monitoring-f7.jpeg" alt="Logo Monitoring F7"><h2>Secours local technique</h2></div>
      <p class="auth-note">Mode de secours local réservé au diagnostic lorsque l’authentification institutionnelle est indisponible.</p>
      <form class="auth-form" id="authForm">
        <label for="authNip">Identifiant secours local</label>
        <input autocomplete="username" id="authNip" inputmode="numeric" name="nip" placeholder="Identifiant" required=""/>
        <label for="authPassword">Code secours local</label>
        <input autocomplete="current-password" id="authPassword" name="password" placeholder="Code secours" required="" type="password"/>
        <div class="auth-message" id="authMessage">Secours local navigateur uniquement.</div>
        <button class="primary auth-submit" type="submit">Accéder en secours</button>
        <button class="secondary auth-submit" type="button" id="backToOktaButton">Retour connexion Okta</button>
      </form>`;
    const form = document.getElementById('authForm');
    if(form) form.addEventListener('submit', onSubmit);
    const back = document.getElementById('backToOktaButton');
    if(back) back.addEventListener('click', showInstitutionalLogin);
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
    window.CurrentUser = Object.freeze(Object.assign({}, resolvedProfile));
    window.CurrentRoles = Object.freeze([resolvedProfile.role || 'sdis-user']);
    window.CurrentPermissions = Object.freeze([]);
    window.MonitoringAuditLog?.logWarning?.('login-local-fallback-used', 'Fallback local de secours utilisé.', { source: resolvedProfile.authSource || 'local' });
    setMessage('Accès local de secours autorisé.', 'ok');
    unlock(resolvedProfile);
  }
  document.addEventListener('DOMContentLoaded', async function(){
    syncAuthUI(false);
    const params = new URLSearchParams(window.location.search || '');
    const hadAuthError = params.has('authError');
    const hadLogout = params.has('loggedOut');
    if(hadLogout){
      sessionManager?.setLoggedOutFlag?.(true);
      sessionManager?.clear?.({ clearProfile:true });
      clearSession();
      setProfile({ authSource:'logged-out', displayName:'', updatedAt:new Date().toISOString() });
      try { delete window.MonitoringAuth; delete window.CurrentUser; delete window.CurrentRoles; delete window.CurrentPermissions; } catch {
        window.MonitoringAuth = undefined;
        window.CurrentUser = undefined;
        window.CurrentRoles = undefined;
        window.CurrentPermissions = undefined;
      }
    }
    const oktaActive = hadLogout ? false : await checkServerAuthentication();
    if(oktaActive) return;

    try{
      const session = readSession();
      const profile = getProfile();
      if(session && session.active === true && profile?.authSource === 'okta-oidc'){
        clearSession();
      }
    }catch{ clearSession(); }

    showInstitutionalLogin();
    if(hadAuthError) setMessage('Connexion impossible. Veuillez réessayer ou contacter l’administrateur.', 'error');
    if(hadLogout) setMessage('Déconnexion effectuée. Utilisez le bouton Okta pour vous reconnecter.', 'ok');
  });

  window.MonitoringInstitutionalAuth = Object.freeze({
    checkServerAuthentication,
    showInstitutionalLogin,
    unlockOidc,
    hydrateCurrentUser,
    rehydrateMonitoringAuthFromSession
  });
})();

window.MonitoringInstitutionalAuth?.rehydrateMonitoringAuthFromSession?.();
document.addEventListener('monitoring-f7-auth-session-changed', () => window.MonitoringInstitutionalAuth?.rehydrateMonitoringAuthFromSession?.());
window.MonitoringAuthService = Object.freeze({
  getProfile(){ return window.MonitoringSessionManager?.getProfile?.() || null; },
  saveProfilePatch(patch){ return window.MonitoringSessionManager?.saveProfilePatch?.(patch) || null; },
  getMode(){ return window.MonitoringBackendConfig?.current?.authMode || 'backend'; },
  isBackendAuthPrepared(){
    return true;
  },
  getStatus(){
    const session = this.readSession();
    const profile = this.getProfile();
    const oktaActive = session?.active === true && profile?.authSource === 'okta-oidc';
    return Object.freeze({
      authMode: oktaActive ? 'oidc' : 'oidc-required',
      localSessionActive: !!session,
      backendAuthPrepared: true,
      backendAuthActive: oktaActive,
      authContract: window.MonitoringApiContracts?.get?.('authLogin') || null,
      localAuthConfigured: window.MonitoringConfig?.localAuth?.allowLocalFallback === true,
      localAuthUsers: Array.isArray(window.MonitoringConfig?.localAuth?.users) ? window.MonitoringConfig.localAuth.users.length : 0,
      message: oktaActive ? 'Session institutionnelle active.' : 'Connexion institutionnelle requise.'
    });
  },
  readSession(){
    return window.MonitoringSessionManager?.read?.() || null;
  },
  logout(){
    if((this.getProfile()?.authSource || '') === 'okta-oidc') window.MonitoringSessionManager?.logout?.({ message:'Déconnexion Okta demandée.' });
    else window.MonitoringSessionManager?.logout?.({ message:'Déconnexion locale demandée.' });
  }
});
