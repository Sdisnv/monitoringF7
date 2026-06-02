/* Monitoring F7 v65.5 — authentification institutionnelle OIDC prioritaire, secours local conservé. */
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
  function hydrateCurrentUser(payload, profile){
    const user = payload?.user || profile || {};
    const roles = Array.isArray(payload?.roles) ? payload.roles : (Array.isArray(profile?.roles) ? profile.roles : []);
    const permissions = Array.isArray(payload?.permissions) ? payload.permissions : (Array.isArray(profile?.permissions) ? profile.permissions : []);
    window.CurrentUser = Object.freeze(Object.assign({}, user, {
      displayName: profile?.displayName || user.displayName || user.name || 'Utilisateur SDIS',
      authSource: 'okta-oidc'
    }));
    window.CurrentRoles = Object.freeze(roles.slice());
    window.CurrentPermissions = Object.freeze(permissions.slice());
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
  function hideOverlay(){
    const overlay = document.getElementById('authOverlay');
    if(overlay) overlay.classList.add('auth-hidden');
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
    window.MonitoringAuditLog?.logAction('login-okta-oidc', 'Session institutionnelle Okta validée.', { roles: window.CurrentRoles || [] });
    notifySessionChanged(session);
    return session;
  }
  async function checkServerAuthentication(){
    try{
      const response = await fetch('/.netlify/functions/auth-me', {
        method: 'GET',
        credentials: 'same-origin',
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
  function showInstitutionalLogin(){
    syncAuthUI(false);
    const card = document.querySelector('#authOverlay .auth-card');
    if(!card) return;
    card.innerHTML = `
      <div class="auth-brand-row"><img class="auth-logo" src="assets/img/logo-monitoring-f7.jpeg" alt="Logo Monitoring F7"><h2>Connexion institutionnelle requise</h2></div>
      <p class="auth-note">Monitoring F7 utilise désormais l’authentification institutionnelle Okta/OIDC. La connexion locale NIP reste uniquement un secours technique.</p>
      <div class="auth-message" id="authMessage">Session Okta non détectée ou expirée.</div>
      <button class="primary auth-submit" type="button" id="oktaLoginButton">Connexion Okta</button>
      <button class="secondary auth-submit" type="button" id="localFallbackButton">Secours local technique</button>`;
    const oktaBtn = document.getElementById('oktaLoginButton');
    if(oktaBtn) oktaBtn.addEventListener('click', () => { window.location.href = '/.netlify/functions/auth-oidc-start'; });
    const fallbackBtn = document.getElementById('localFallbackButton');
    if(fallbackBtn) fallbackBtn.addEventListener('click', restoreLocalFallbackForm);
  }
  function restoreLocalFallbackForm(){
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
    window.MonitoringAuditLog?.logAction('login-local', 'Login local de secours validé.', { source: resolvedProfile.authSource || 'local' });
    setMessage('Accès local de secours autorisé.', 'ok');
    unlock(resolvedProfile);
  }
  document.addEventListener('DOMContentLoaded', async function(){
    syncAuthUI(false);
    const oktaActive = await checkServerAuthentication();
    if(oktaActive) return;

    try{
      const session = readSession();
      const profile = getProfile();
      if(session && session.active === true && profile?.authSource === 'okta-oidc'){
        clearSession();
      }
    }catch{ clearSession(); }

    showInstitutionalLogin();
  });

  window.MonitoringInstitutionalAuth = Object.freeze({
    checkServerAuthentication,
    showInstitutionalLogin,
    unlockOidc,
    hydrateCurrentUser
  });
})();

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
      authMode: oktaActive ? 'oidc' : 'local-fallback',
      localSessionActive: !!session,
      backendAuthPrepared: true,
      backendAuthActive: oktaActive,
      authContract: window.MonitoringApiContracts?.get?.('authLogin') || null,
      localAuthConfigured: true,
      localAuthUsers: Array.isArray(window.MonitoringConfig?.localAuth?.users) ? window.MonitoringConfig.localAuth.users.length : 0,
      message: oktaActive ? 'Authentification institutionnelle Okta/OIDC active.' : 'Connexion institutionnelle requise. Secours local disponible uniquement pour diagnostic.'
    });
  },
  readSession(){
    return window.MonitoringSessionManager?.read?.() || null;
  },
  logout(){
    if((this.getProfile()?.authSource || '') === 'okta-oidc') window.location.href = '/.netlify/functions/auth-logout';
    else window.MonitoringSessionManager?.logout?.({ message:'Déconnexion locale demandée.' });
  }
});
