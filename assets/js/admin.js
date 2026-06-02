/* Monitoring F7 v66.0 — administration utilisateurs et audit trail. */
(function(){
  'use strict';
  function escape(value){ return window.MonitoringSecurity?.escapeHTML ? window.MonitoringSecurity.escapeHTML(value) : String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  async function api(path, options){
    const res = await fetch(path, Object.assign({ credentials:'include', headers:{ 'Accept':'application/json', 'Content-Type':'application/json' }, cache:'no-store' }, options || {}));
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }
  const roleOptions = ['sdis-admin','sdis-commandement','sdis-formation','sdis-instructeur','sdis-user','sdis-readonly'];
  function selectedRolesFromForm(form){ return roleOptions.filter(role => form.querySelector(`[name="role-${role}"]`)?.checked); }
  async function renderUsers(){
    const root = document.getElementById('adminUsersApp');
    if(!root || !window.MonitoringRBAC?.has?.('users:admin')) return;
    root.innerHTML = '<p>Chargement des utilisateurs…</p>';
    try{
      const data = await api('/.netlify/functions/admin-users');
      const rows = (data.users || []).map(u => `<tr><td>${escape(u.displayName)}</td><td>${escape(u.email || u.nip || u.subject)}</td><td>${escape((u.roles || []).join(', '))}</td><td>${u.active ? 'Actif' : 'Désactivé'}</td><td>${escape(u.lastLoginAt || '—')}</td><td><button type="button" data-edit-user="${escape(u.subject)}">Modifier</button></td></tr>`).join('');
      root.innerHTML = `<div class="card"><h3>Créer / modifier un utilisateur</h3><form id="adminUserForm" class="grid-form"><label>E-mail / sujet Okta<input name="subject" required placeholder="prenom.nom@sdis…"></label><label>Nom affiché<input name="displayName" placeholder="Grade Prénom NOM"></label><label>NIP / identifiant<input name="nip" placeholder="Optionnel"></label><label>Actif<select name="active"><option value="true">Actif</option><option value="false">Désactivé</option></select></label><fieldset><legend>Rôles</legend>${roleOptions.map(role => `<label style="display:inline-flex;gap:6px;margin-right:10px"><input type="checkbox" name="role-${role}" ${role==='sdis-user'?'checked':''}>${role}</label>`).join('')}</fieldset><button class="primary" type="submit">Enregistrer utilisateur</button><span id="adminUserMessage" class="footer-note"></span></form></div><div class="table-wrap"><table><thead><tr><th>Nom</th><th>Identité</th><th>Rôles</th><th>Statut</th><th>Dernière connexion</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Aucun utilisateur applicatif enregistré.</td></tr>'}</tbody></table></div>`;
      const usersBySubject = Object.fromEntries((data.users || []).map(u => [u.subject, u]));
      root.querySelectorAll('[data-edit-user]').forEach(btn => btn.addEventListener('click', () => {
        const u = usersBySubject[btn.getAttribute('data-edit-user')]; if(!u) return;
        const form = root.querySelector('#adminUserForm'); form.subject.value = u.subject || u.email || u.nip || ''; form.displayName.value = u.displayName || ''; form.nip.value = u.nip || ''; form.active.value = String(u.active !== false);
        roleOptions.forEach(role => { const cb = form.querySelector(`[name="role-${role}"]`); if(cb) cb.checked = (u.roles || []).includes(role); });
      }));
      root.querySelector('#adminUserForm')?.addEventListener('submit', async event => {
        event.preventDefault(); const form = event.currentTarget; const msg = root.querySelector('#adminUserMessage');
        const payload = { subject:form.subject.value.trim(), email:form.subject.value.trim(), displayName:form.displayName.value.trim(), nip:form.nip.value.trim(), active:form.active.value === 'true', roles:selectedRolesFromForm(form) };
        try{ await api('/.netlify/functions/admin-users', { method:'POST', body:JSON.stringify(payload) }); msg.textContent = 'Utilisateur enregistré.'; await renderUsers(); }
        catch(error){ msg.textContent = 'Erreur: '+error.message; }
      });
    }catch(error){ root.innerHTML = `<p class="footer-note">Administration utilisateurs indisponible ou accès refusé : ${escape(error.message)}</p>`; }
  }
  async function renderAudit(){
    const root = document.getElementById('adminAuditApp');
    if(!root || !window.MonitoringRBAC?.has?.('audit:read')) return;
    root.innerHTML = '<p>Chargement audit trail…</p>';
    try{
      const data = await api('/.netlify/functions/audit-log?limit=200');
      const rows = (data.entries || []).map(e => `<tr><td>${escape(e.createdAt)}</td><td>${escape(e.actorSubject || '—')}</td><td>${escape(e.eventType)}</td><td>${escape(e.status)}</td><td>${escape(e.message)}</td></tr>`).join('');
      root.innerHTML = `<button type="button" id="refreshAuditTrail">Actualiser</button><div class="table-wrap"><table><thead><tr><th>Date/heure</th><th>Utilisateur</th><th>Action</th><th>Résultat</th><th>Message</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Aucune entrée audit serveur.</td></tr>'}</tbody></table></div>`;
      root.querySelector('#refreshAuditTrail')?.addEventListener('click', renderAudit);
    }catch(error){ root.innerHTML = `<p class="footer-note">Audit trail indisponible ou accès refusé : ${escape(error.message)}</p>`; }
  }
  document.addEventListener('DOMContentLoaded', () => { renderUsers(); renderAudit(); });
  document.addEventListener('monitoring-f7-auth-session-changed', () => { setTimeout(() => { renderUsers(); renderAudit(); }, 100); });
  window.MonitoringAdminUI = Object.freeze({ renderUsers, renderAudit });
})();
