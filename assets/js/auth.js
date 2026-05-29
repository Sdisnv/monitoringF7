/* Barrière de login locale - usage interne, non équivalent à une authentification serveur. */
(function(){
  const AUTH_SESSION_KEY = 'monitoring_sdis_auth_session_v1';
  const AUTH_PROFILE_KEY = 'monitoring_sdis_auth_profile_v1';
  const AUTH_SESSION_BACKUP_KEY = 'monitoring_sdis_auth_session_backup_v1';
  const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
  
  // Get hash from window.ENV (set by env.js) - NO HARDCODED VALUE
  const TEMP_HASH_HEX = (window.ENV && window.ENV.temporaryPasswordHashHex) || null;
  
  const enc = new TextEncoder();

  // Validate that the hash exists - prevent silent failures
  if (!TEMP_HASH_HEX) {
    console.error('[Security] Missing temporaryPasswordHashHex in window.ENV. Please check env.js configuration.');
  }

  function toHex(buffer){
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  
  async function sha256Hex(value){
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(value)));
    return toHex(digest);
  }
  
  function getProfile(){
    try { return JSON.parse(localStorage.getItem(AUTH_PROFILE_KEY) || 'null'); } catch { return null; }
  }
  
  function setProfile(profile){
    localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
  }
  
  function setMessage(text, type){
    const el = document.getElementById('authMessage');
    if(!el) return;
    el.textContent = text;
    el.classList.remove('error','ok');
    if(type) el.classList.add(type);
  }
  
  function parseSession(raw){
    if(!raw) return null;
    if(raw === '1' || raw === 'true') return { active: true, legacy: true };
    try {
      const parsed = JSON.parse(raw);
      if(!(parsed && typeof parsed === 'object')) return null;
      if(parsed.startedAt && Date.now() - Date.parse(parsed.startedAt) > SESSION_MAX_AGE_MS){
        clearSession();
        return null;
      }
      return parsed;
    } catch { return null; }
  }
  
  function readSession(){
    const sessionRaw = sessionStorage.getItem(AUTH_SESSION_KEY);
    const localRaw = localStorage.getItem(AUTH_SESSION_BACKUP_KEY);
    let parsed = parseSession(sessionRaw) || parseSession(localRaw);
    if(!parsed){
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(AUTH_SESSION_BACKUP_KEY);
      return null;
    }
    if(!sessionRaw && parsed.active === true){
      try { sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(parsed)); } catch {}
    }
    return parsed;
  }
  
  function writeSession(profile){
    const sessionPayload = {
      active: true,
      mode: 'local-browser-only',
      nip: profile?.nip || '',
      startedAt: new Date().toISOString(),
      referenceDate: window.MonitoringEventRules?.sessionReferenceDateIso || new Date().toISOString().slice(0,10),
      source: location.protocol === 'file:' ? 'local-file' : 'served-origin',
      version: (window.MonitoringConfig && window.MonitoringConfig.version) || 'v61'
    };
    const raw = JSON.stringify(sessionPayload);
    sessionStorage.setItem(AUTH_SESSION_KEY, raw);
    try { localStorage.setItem(AUTH_SESSION_BACKUP_KEY, raw); } catch {}
    return sessionPayload;
  }
  
  function notifySessionChanged(session){
    document.dispatchEvent(new CustomEvent('monitoring-f7-auth-session-changed', { detail: { session: session || readSession() } }));
  }
  
  function clearSession(){
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem('monitoring_f7_admin_lock_v1');
    try { localStorage.removeItem(AUTH_SESSION_BACKUP_KEY); } catch {}
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
  
  function showChangeBlock(){
    const block = document.getElementById('authChangeBlock');
    if(block) block.hidden = false;
  }
  
  async function onSubmit(e){
    e.preventDefault();
    const nip = (document.getElementById('authNip')?.value || '').trim();
    const password = document.getElementById('authPassword')?.value || '';
    const newPassword = document.getElementById('authNewPassword')?.value || '';
    const confirm = document.getElementById('authNewPasswordConfirm')?.value || '';
    
    if(!nip){ 
      setMessage('NIP ECA obligatoire.', 'error'); 
      return; 
    }

    // Check if temporary password hash is configured
    if (!TEMP_HASH_HEX) {
      setMessage('Erreur de configuration: hash manquant. Contactez l\'administrateur.', 'error');
      window.MonitoringAuditLog?.logError('login-config-error', 'Missing temporaryPasswordHashHex in ENV', {});
      return;
    }

    const profile = getProfile();
    const hash = await sha256Hex(password);

    if(!profile){
      if(hash !== TEMP_HASH_HEX){
        window.MonitoringAuditLog?.logWarning('login-local-failed', 'Échec login local.', { reason:'temporary-password' });
        setMessage('Mot de passe temporaire incorrect.', 'error');
        return;
      }
      showChangeBlock();
      if(!newPassword || !confirm){
        setMessage('Première connexion : remplace le mot de passe temporaire.', 'error');
        return;
      }
      if(newPassword !== confirm){
        setMessage('La confirmation du nouveau mot de passe ne correspond pas.', 'error');
        return;
      }
      if(newPassword === '1234' || newPassword.length < 6){
        setMessage('Choisis un mot de passe différent de 1234, au minimum 6 caractères.', 'error');
        return;
      }
      setProfile({ 
        nip, 
        passwordHash: await sha256Hex(newPassword), 
        createdAt: new Date().toISOString(), 
        temporaryPasswordReplaced: true 
      });
      window.MonitoringAuditLog?.logAction('login-local', 'Première connexion locale validée et mot de passe remplacé.', {});
      setMessage('Mot de passe remplacé. Accès autorisé.', 'ok');
      unlock({ nip });
      return;
    }

    if(!profile || typeof profile !== 'object' || !profile.nip || !profile.passwordHash || profile.nip !== nip || profile.passwordHash !== hash){
      window.MonitoringAuditLog?.logWarning('login-local-failed', 'Échec login local.', { reason:'credentials' });
      setMessage('NIP ECA ou mot de passe incorrect.', 'error');
      return;
    }
    
    window.MonitoringAuditLog?.logAction('login-local', 'Login local validé.', {});
    unlock(profile);
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
    }catch{ 
      clearSession(); 
    }
    
    const profile = getProfile();
    if(!profile) showChangeBlock();
    const form = document.getElementById('authForm');
    if(form) form.addEventListener('submit', onSubmit);
  });
})();

window.MonitoringAuthService = Object.freeze({
  getProfile(){ 
    try { 
      return JSON.parse(localStorage.getItem('monitoring_sdis_auth_profile_v1') || 'null'); 
    } catch { 
      return null; 
    } 
  },
  
  saveProfilePatch(patch){ 
    const current = this.getProfile() || {}; 
    const next = Object.assign({}, current, patch || {}, { updatedAt: new Date().toISOString() }); 
    localStorage.setItem('monitoring_sdis_auth_profile_v1', JSON.stringify(next)); 
    return next; 
  },
  
  getMode(){ 
    return window.MonitoringBackendConfig?.current?.authMode || 'local'; 
  },
  
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
      message: prepared ? 'Contrat auth serveur prêt, non activé par défaut en v61.' : 'Session locale navigateur conservée.'
    });
  },
  
  readSession(){
    const parse = raw => {
      if(!raw) return null;
      if(raw === '1' || raw === 'true') return { active:true, legacy:true };
      try { 
        const parsed = JSON.parse(raw); 
        return parsed && typeof parsed === 'object' ? parsed : null; 
      } catch { 
        return null; 
      }
    };
    return parse(sessionStorage.getItem('monitoring_sdis_auth_session_v1')) || parse(localStorage.getItem('monitoring_sdis_auth_session_backup_v1'));
  },
  
  logout(){ 
    window.MonitoringAuditLog?.logAction('logout-local', 'Déconnexion locale demandée.', {}); 
    sessionStorage.removeItem('monitoring_sdis_auth_session_v1'); 
    sessionStorage.removeItem('monitoring_f7_admin_lock_v1'); 
    try { 
      localStorage.removeItem('monitoring_sdis_auth_session_backup_v1'); 
    } catch {} 
    location.reload(); 
  }
});

window.MonitoringSessionManager = Object.freeze({
  read(){ return window.MonitoringAuthService.readSession(); },
  logout(){ return window.MonitoringAuthService.logout(); }
});