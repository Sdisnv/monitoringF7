/* Monitoring F7 v66 — administration utilisateurs et audit trail institutionnels. */
(function(){
  'use strict';
  const ROLES = [
    { value:'sdis-readonly', label:'Lecture seule' },
    { value:'sdis-user', label:'Saisie standard' },
    { value:'sdis-instructeur', label:'Instructeur' },
    { value:'sdis-formation', label:'Formation' },
    { value:'sdis-chef-formation', label:'Chef formation' },
    { value:'sdis-commandement', label:'Commandement' },
    { value:'sdis-admin', label:'Administrateur' }
  ];
  const QUICK_PROFILES = [
    { value:'readonly', label:'Lecture seule', roles:['sdis-readonly'] },
    { value:'write', label:'Lecture + écriture', roles:['sdis-user'] },
    { value:'formation-chief', label:'Chef formation', roles:['sdis-chef-formation'] },
    { value:'admin', label:'Admin', roles:['sdis-admin'] }
  ];
  const ROLE_LABELS = Object.freeze(ROLES.reduce((acc, role) => Object.assign(acc, { [role.value]: role.label }), {}));
  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function canAdmin(){ return window.MonitoringRBAC?.has?.('users:admin') === true; }
  function roleLabel(role){ return ROLE_LABELS[role] || role; }
  function mount(){
    const pane = $('f7-pane-admin'); if(!pane || $('f7InstitutionalAdmin')) return;
    const box = document.createElement('section');
    box.id = 'f7InstitutionalAdmin';
    box.className = 'f7-management-pane-card';
    box.setAttribute('data-rbac-permission','users:admin');
    box.innerHTML = `<h2 class="section-title"><span>Administration institutionnelle</span></h2>
      <p class="footer-note">Gestion rapide des droits côté PostgreSQL. Okta reste l’identité principale : aucun mot de passe local n’est créé.</p>
      <div class="grid-3">
        <div><label>E-mail / NIP Okta</label><input id="f7UserSubject" placeholder="prenom.nom@sdisnv.ch"></div>
        <div><label>Nom affiché</label><input id="f7UserDisplayName" placeholder="Prénom NOM"></div>
        <div><label>Profil rapide</label><select id="f7QuickProfile">${QUICK_PROFILES.map(p=>`<option value="${p.value}">${p.label}</option>`).join('')}</select></div>
      </div>
      <div class="grid-3">
        <div><label>Rôles détaillés</label><select id="f7UserRoles" multiple size="7">${ROLES.map(r=>`<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
        <div><label>État</label><select id="f7UserActive"><option value="true">Actif</option><option value="false">Désactivé</option></select></div>
        <div><label>Lecture pratique</label><div class="f7-status-box">Lecture seule = consultation. Lecture + écriture = saisie. Chef formation = pilotage formation. Admin = droits complets.</div></div>
      </div>
      <div class="f7-action-row"><button class="compact-btn primary" id="f7CreateUserBtn" type="button">Créer / modifier utilisateur</button><button class="compact-btn" id="f7RefreshUsersBtn" type="button">Actualiser</button><button class="compact-btn" id="f7LoadAuditBtn" type="button">Charger audit trail</button></div>
      <div class="f7-status-box" id="f7UsersStatus">Réservé aux administrateurs.</div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Utilisateur</th><th>Rôles</th><th>Permissions</th><th>État</th><th>Dernière connexion</th><th>Action</th></tr></thead><tbody id="f7UsersTable"><tr><td colspan="6">Non chargé.</td></tr></tbody></table></div>
      <h3>Audit trail</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Résultat</th><th>Détail</th></tr></thead><tbody id="f7AuditTable"><tr><td colspan="5">Non chargé.</td></tr></tbody></table></div>`;
    pane.appendChild(box);
    $('f7QuickProfile')?.addEventListener('change', applyQuickProfile);
    $('f7CreateUserBtn')?.addEventListener('click', saveUser);
    $('f7RefreshUsersBtn')?.addEventListener('click', loadUsers);
    $('f7LoadAuditBtn')?.addEventListener('click', loadAudit);
    window.MonitoringRBAC?.applyUIRestrictions?.();
    applyQuickProfile();
    if(canAdmin()) loadUsers();
  }
  function applyQuickProfile(){
    const profile = QUICK_PROFILES.find(item => item.value === $('f7QuickProfile')?.value) || QUICK_PROFILES[1];
    Array.from($('f7UserRoles')?.options || []).forEach(o => o.selected = profile.roles.includes(o.value));
  }
  function selectedRoles(){ return Array.from($('f7UserRoles')?.selectedOptions || []).map(o=>o.value); }
  function setStatus(msg, type){ const el=$('f7UsersStatus'); if(el){ el.className='f7-status-box '+(type||''); el.textContent=msg; } }
  async function loadUsers(){
    if(!canAdmin()){ setStatus('Accès refusé : rôle admin requis.', 'error'); return; }
    const res = await window.MonitoringApiClient.listUsers();
    if(!res.ok || !res.data?.ok){ setStatus('Chargement utilisateurs impossible.', 'error'); return; }
    const tbody=$('f7UsersTable');
    tbody.innerHTML = (res.data.users||[]).map(u => `<tr><td><strong>${esc(u.displayName)}</strong><br><span>${esc(u.subject||u.email)}</span></td><td>${esc((u.roles||[]).map(roleLabel).join(', '))}</td><td>${esc((u.permissions||[]).join(', '))}</td><td>${u.active?'Actif':'Désactivé'}</td><td>${esc(u.lastLoginAt||'—')}</td><td><button class="compact-btn" data-edit-user="${esc(u.subject)}">Reprendre</button></td></tr>`).join('') || '<tr><td colspan="6">Aucun utilisateur.</td></tr>';
    tbody.querySelectorAll('[data-edit-user]').forEach(btn => btn.addEventListener('click', () => {
      const u=(res.data.users||[]).find(x=>x.subject===btn.getAttribute('data-edit-user')); if(!u) return;
      $('f7UserSubject').value=u.subject||u.email||''; $('f7UserDisplayName').value=u.displayName||'';
      $('f7UserActive').value = u.active === false ? 'false' : 'true';
      Array.from($('f7UserRoles').options).forEach(o => o.selected=(u.roles||[]).includes(o.value));
    }));
    setStatus('Utilisateurs chargés.', 'ok');
  }
  async function saveUser(){
    const subject=$('f7UserSubject')?.value.trim().toLowerCase(); if(!subject){ setStatus('E-mail / NIP obligatoire.', 'error'); return; }
    const roles = selectedRoles();
    if(!roles.length){ setStatus('Sélectionne au moins un rôle.', 'error'); return; }
    const user={ subject, email:subject.includes('@')?subject:'', displayName:$('f7UserDisplayName')?.value.trim()||subject, roles, active:$('f7UserActive')?.value !== 'false' };
    const res = await window.MonitoringApiClient.saveUser(user);
    if(!res.ok || !res.data?.ok){ setStatus(res.data?.error || 'Enregistrement refusé.', 'error'); return; }
    setStatus('Utilisateur enregistré.', 'ok'); loadUsers();
  }
  async function loadAudit(){
    if(window.MonitoringRBAC?.has?.('audit:read') !== true){ setStatus('Accès audit refusé.', 'error'); return; }
    const res = await window.MonitoringApiClient.listAuditLog(100);
    const tbody=$('f7AuditTable');
    if(!res.ok || !res.data?.ok){ tbody.innerHTML='<tr><td colspan="5">Audit indisponible.</td></tr>'; return; }
    tbody.innerHTML=(res.data.entries||[]).map(e=>`<tr><td>${esc(e.created_at||e.createdAt)}</td><td>${esc(e.actor_subject||'—')}</td><td>${esc(e.event_type||'')}</td><td>${esc(e.status||'')}</td><td>${esc(e.message||'')}</td></tr>`).join('') || '<tr><td colspan="5">Aucune entrée.</td></tr>';
  }
  document.addEventListener('DOMContentLoaded', mount);
  document.addEventListener('monitoring-f7-auth-session-changed', mount);
})();
