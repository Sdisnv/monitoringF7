/* Monitoring F7 v66 — administration utilisateurs et audit trail institutionnels. */
(function(){
  'use strict';
  const ROLES = ['sdis-admin','sdis-commandement','sdis-formation','sdis-instructeur','sdis-user','sdis-readonly'];
  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function canAdmin(){ return window.MonitoringRBAC?.hasPermission?.('users:admin') === true; }
  function mount(){
    const pane = $('f7-pane-admin'); if(!pane || $('f7InstitutionalAdmin')) return;
    const box = document.createElement('section');
    box.id = 'f7InstitutionalAdmin';
    box.className = 'f7-management-pane-card';
    box.setAttribute('data-rbac-permission','users:admin');
    box.innerHTML = `<h2 class="section-title"><span>Administration institutionnelle</span></h2>
      <p class="footer-note">Gestion des profils autorisés côté PostgreSQL. Okta reste l’identité principale : aucun mot de passe local n’est créé.</p>
      <div class="grid-3">
        <div><label>E-mail / NIP Okta</label><input id="f7UserSubject" placeholder="prenom.nom@sdisnv.ch"></div>
        <div><label>Nom affiché</label><input id="f7UserDisplayName" placeholder="Prénom NOM"></div>
        <div><label>Rôles</label><select id="f7UserRoles" multiple size="6">${ROLES.map(r=>`<option value="${r}">${r}</option>`).join('')}</select></div>
      </div>
      <div class="f7-action-row"><button class="compact-btn primary" id="f7CreateUserBtn" type="button">Créer / modifier utilisateur</button><button class="compact-btn" id="f7RefreshUsersBtn" type="button">Actualiser</button><button class="compact-btn" id="f7LoadAuditBtn" type="button">Charger audit trail</button></div>
      <div class="f7-status-box" id="f7UsersStatus">Réservé aux administrateurs.</div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Utilisateur</th><th>Rôles</th><th>Permissions</th><th>État</th><th>Dernière connexion</th><th>Action</th></tr></thead><tbody id="f7UsersTable"><tr><td colspan="6">Non chargé.</td></tr></tbody></table></div>
      <h3>Audit trail</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Résultat</th><th>Détail</th></tr></thead><tbody id="f7AuditTable"><tr><td colspan="5">Non chargé.</td></tr></tbody></table></div>`;
    pane.appendChild(box);
    $('f7CreateUserBtn')?.addEventListener('click', saveUser);
    $('f7RefreshUsersBtn')?.addEventListener('click', loadUsers);
    $('f7LoadAuditBtn')?.addEventListener('click', loadAudit);
    window.MonitoringRBAC?.applyUiGuards?.();
    if(canAdmin()) loadUsers();
  }
  function selectedRoles(){ return Array.from($('f7UserRoles')?.selectedOptions || []).map(o=>o.value); }
  function setStatus(msg, type){ const el=$('f7UsersStatus'); if(el){ el.className='f7-status-box '+(type||''); el.textContent=msg; } }
  async function loadUsers(){
    if(!canAdmin()){ setStatus('Accès refusé : rôle admin requis.', 'error'); return; }
    const res = await window.MonitoringApiClient.listUsers();
    if(!res.ok || !res.data?.ok){ setStatus('Chargement utilisateurs impossible.', 'error'); return; }
    const tbody=$('f7UsersTable');
    tbody.innerHTML = (res.data.users||[]).map(u => `<tr><td><strong>${esc(u.displayName)}</strong><br><span>${esc(u.subject||u.email)}</span></td><td>${esc((u.roles||[]).join(', '))}</td><td>${esc((u.permissions||[]).join(', '))}</td><td>${u.active?'Actif':'Désactivé'}</td><td>${esc(u.lastLoginAt||'—')}</td><td><button class="compact-btn" data-edit-user="${esc(u.subject)}">Reprendre</button></td></tr>`).join('') || '<tr><td colspan="6">Aucun utilisateur.</td></tr>';
    tbody.querySelectorAll('[data-edit-user]').forEach(btn => btn.addEventListener('click', () => {
      const u=(res.data.users||[]).find(x=>x.subject===btn.getAttribute('data-edit-user')); if(!u) return;
      $('f7UserSubject').value=u.subject||u.email||''; $('f7UserDisplayName').value=u.displayName||'';
      Array.from($('f7UserRoles').options).forEach(o => o.selected=(u.roles||[]).includes(o.value));
    }));
    setStatus('Utilisateurs chargés.', 'ok');
  }
  async function saveUser(){
    const subject=$('f7UserSubject')?.value.trim().toLowerCase(); if(!subject){ setStatus('E-mail / NIP obligatoire.', 'error'); return; }
    const user={ subject, email:subject.includes('@')?subject:'', displayName:$('f7UserDisplayName')?.value.trim()||subject, roles:selectedRoles(), active:true };
    const res = await window.MonitoringApiClient.apiPost('/users', user);
    if(!res.ok || !res.data?.ok){ setStatus(res.data?.error || 'Enregistrement refusé.', 'error'); return; }
    setStatus('Utilisateur enregistré.', 'ok'); loadUsers();
  }
  async function loadAudit(){
    if(window.MonitoringRBAC?.hasPermission?.('audit:read') !== true){ setStatus('Accès audit refusé.', 'error'); return; }
    const res = await window.MonitoringApiClient.listAuditLog(100);
    const tbody=$('f7AuditTable');
    if(!res.ok || !res.data?.ok){ tbody.innerHTML='<tr><td colspan="5">Audit indisponible.</td></tr>'; return; }
    tbody.innerHTML=(res.data.entries||[]).map(e=>`<tr><td>${esc(e.created_at||e.createdAt)}</td><td>${esc(e.actor_subject||'—')}</td><td>${esc(e.event_type||'')}</td><td>${esc(e.status||'')}</td><td>${esc(e.message||'')}</td></tr>`).join('') || '<tr><td colspan="5">Aucune entrée.</td></tr>';
  }
  document.addEventListener('DOMContentLoaded', mount);
  document.addEventListener('monitoring-f7-auth-session-changed', mount);
})();
