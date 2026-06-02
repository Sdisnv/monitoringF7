/* Monitoring F7 v66.22 — administration utilisateurs et audit trail. */
(function(){
  'use strict';

  const PERSONNEL_STORAGE_KEY = 'monitoring_f7_personnel_sdis_csv_v1';
  const PERSONNEL_CSV_URL = 'assets/data/PersonnelSDIS.csv';
  const ROLES = [
    { value:'sdis-readonly', label:'Lecture seule' },
    { value:'sdis-user', label:'Lecture + écriture' },
    { value:'sdis-instructeur', label:'Instructeur' },
    { value:'sdis-formation', label:'Formation' },
    { value:'sdis-chef-formation', label:'Chef formation' },
    { value:'sdis-commandement', label:'Commandement' },
    { value:'sdis-admin', label:'Admin' }
  ];
  const QUICK_PROFILES = [
    { value:'readonly', label:'Lecture seule', roles:['sdis-readonly'] },
    { value:'write', label:'Lecture + écriture', roles:['sdis-user'] },
    { value:'formation-chief', label:'Chef formation', roles:['sdis-chef-formation'] },
    { value:'admin', label:'Admin', roles:['sdis-admin'] }
  ];
  const ROLE_LABELS = Object.freeze(ROLES.reduce((acc, role) => Object.assign(acc, { [role.value]: role.label }), {}));
  let personnelDirectory = [];

  function escape(value){ return window.MonitoringSecurity?.escapeHTML ? window.MonitoringSecurity.escapeHTML(value) : String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function normalizeHeader(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function normalizeNip(value){ return String(value || '').replace(/\D+/g, '').trim(); }
  function roleLabel(role){ return ROLE_LABELS[role] || role; }
  function roleBadges(roles){ return (Array.isArray(roles) ? roles : []).map(role => `<span class="f7-role-badge">${escape(roleLabel(role))}</span>`).join(' '); }
  function selectedRolesFromForm(form){ return Array.from(form.querySelectorAll('[name="roles"]:checked')).map(input => input.value); }
  function quickProfile(value){ return QUICK_PROFILES.find(profile => profile.value === value) || QUICK_PROFILES[1]; }

  async function api(path, options){
    const res = await fetch(path, Object.assign({ credentials:'include', headers:{ 'Accept':'application/json', 'Content-Type':'application/json' }, cache:'no-store' }, options || {}));
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }

  function parseCsvLine(line, sep){
    const out=[]; let cur=''; let quoted=false;
    for(let i=0;i<String(line).length;i++){
      const ch=line[i];
      if(ch === '"' && line[i+1] === '"'){ cur += '"'; i++; continue; }
      if(ch === '"'){ quoted = !quoted; continue; }
      if(ch === sep && !quoted){ out.push(cur.trim()); cur=''; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function parsePersonnelCsv(text){
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    if(lines.length < 2) throw new Error('CSV vide ou sans données.');
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const headers = parseCsvLine(lines[0], sep).map(normalizeHeader);
    const indexOf = names => headers.findIndex(header => names.includes(header));
    const idx = {
      nip: indexOf(['nip', 'eca', 'identifiant', 'matricule']),
      grade: indexOf(['grade', 'rang']),
      nom: indexOf(['nom', 'name']),
      prenom: indexOf(['prenom']),
      oi: indexOf(['oi', 'organe', 'organisation', 'affectation']),
      email: indexOf(['email', 'e mail', 'mail', 'adresse email', 'adresse mail'])
    };
    return lines.slice(1).map(line => {
      const values = parseCsvLine(line, sep);
      const nip = idx.nip >= 0 ? values[idx.nip] : '';
      const grade = idx.grade >= 0 ? values[idx.grade] : '';
      const nom = idx.nom >= 0 ? values[idx.nom] : '';
      const prenom = idx.prenom >= 0 ? values[idx.prenom] : '';
      const oi = idx.oi >= 0 ? values[idx.oi] : '';
      const email = idx.email >= 0 ? values[idx.email] : '';
      const displayName = [grade, prenom, nom].map(v => String(v || '').trim()).filter(Boolean).join(' ') || email || nip;
      const subject = String(email || nip || '').trim().toLowerCase();
      return { subject, email, nip, grade, prenom, nom, oi, displayName };
    }).filter(user => user.subject && user.displayName);
  }

  async function loadPersonnelDirectory(root){
    const status = root?.querySelector('#adminPersonnelStatus');
    try{
      const saved = localStorage.getItem(PERSONNEL_STORAGE_KEY);
      if(saved){
        personnelDirectory = parsePersonnelCsv(saved);
        if(status) status.textContent = `Référentiel personnel chargé depuis la dernière importation manuelle : ${personnelDirectory.length} personne(s).`;
        return;
      }
    }catch{}
    try{
      const res = await fetch(PERSONNEL_CSV_URL, { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      personnelDirectory = parsePersonnelCsv(await res.text());
      if(status) status.textContent = `Référentiel PersonnelSDIS embarqué chargé : ${personnelDirectory.length} personne(s).`;
    }catch(error){
      personnelDirectory = [];
      if(status) status.textContent = `Référentiel PersonnelSDIS indisponible : ${error.message || error}`;
    }
  }

  function findPersonnelByNip(nip){
    const normalized = normalizeNip(nip);
    return normalized ? personnelDirectory.find(person => normalizeNip(person.nip) === normalized) || null : null;
  }

  function applyPersonnelFromNip(form, root){
    const person = findPersonnelByNip(form.nip.value);
    const status = root.querySelector('#adminPersonnelStatus');
    if(!person) return;
    form.displayName.value = person.displayName;
    if(!form.subject.value.trim()) form.subject.value = person.subject || person.nip || '';
    if(status) status.textContent = `NIP reconnu : ${person.displayName}${person.oi ? ` (${person.oi})` : ''}.`;
  }

  function applyQuickProfile(form, select){
    const roles = quickProfile(select.value).roles;
    ROLES.forEach(role => {
      const input = form.querySelector(`[name="roles"][value="${role.value}"]`);
      if(input) input.checked = roles.includes(role.value);
    });
  }

  function renderUserForm(root){
    return `<div class="card f7-user-admin-card">
      <h3>Créer / modifier un utilisateur</h3>
      <form id="adminUserForm" class="grid-form f7-user-admin-form">
        <label>NIP / identifiant<input name="nip" inputmode="numeric" placeholder="48364"></label>
        <label>Nom affiché<input name="displayName" placeholder="Grade Prénom NOM"></label>
        <label>E-mail / identifiant Okta<input name="subject" placeholder="Optionnel si le NIP est utilisé"></label>
        <label>Profil rapide<select id="adminQuickProfile">${QUICK_PROFILES.map(profile => `<option value="${profile.value}">${profile.label}</option>`).join('')}</select></label>
        <label>Actif<select name="active"><option value="true">Actif</option><option value="false">Désactivé</option></select></label>
        <fieldset class="f7-role-fieldset"><legend>Droits</legend>${ROLES.map(role => `<label class="f7-role-choice"><input type="checkbox" name="roles" value="${role.value}"><span>${role.label}</span></label>`).join('')}</fieldset>
        <div class="f7-status-box" id="adminPersonnelStatus">Référentiel personnel non chargé.</div>
        <div class="grid-3">
          <label>Importer PersonnelSDIS.csv<input id="adminPersonnelCsvFile" type="file" accept=".csv,text/csv"></label>
          <label>Profil créé par import<select id="adminCsvQuickProfile">${QUICK_PROFILES.map(profile => `<option value="${profile.value}">${profile.label}</option>`).join('')}</select></label>
          <label>&nbsp;<button class="compact-btn" id="adminImportPersonnelBtn" type="button">Mettre à jour la liste / importer</button></label>
        </div>
        <button class="primary" type="submit">Enregistrer utilisateur</button>
        <span id="adminUserMessage" class="footer-note"></span>
      </form>
    </div>`;
  }

  function fillUserForm(root, user){
    const form = root.querySelector('#adminUserForm');
    if(!form || !user) return;
    form.nip.value = user.nip || '';
    form.displayName.value = user.displayName || '';
    form.subject.value = user.subject || user.email || user.nip || '';
    form.active.value = String(user.active !== false);
    ROLES.forEach(role => {
      const input = form.querySelector(`[name="roles"][value="${role.value}"]`);
      if(input) input.checked = (user.roles || []).includes(role.value);
    });
  }

  async function importPersonnelCsv(root){
    const file = root.querySelector('#adminPersonnelCsvFile')?.files?.[0];
    const msg = root.querySelector('#adminUserMessage');
    if(!file){ if(msg) msg.textContent = 'Sélectionne PersonnelSDIS.csv.'; return; }
    const profile = quickProfile(root.querySelector('#adminCsvQuickProfile')?.value);
    try{
      const text = await file.text();
      const users = parsePersonnelCsv(text);
      localStorage.setItem(PERSONNEL_STORAGE_KEY, text);
      personnelDirectory = users;
      let ok = 0; let failed = 0;
      for(const user of users){
        try{
          await api('/.netlify/functions/admin-users', { method:'POST', body:JSON.stringify(Object.assign({}, user, { roles:profile.roles, active:true })) });
          ok++;
        }catch{ failed++; }
      }
      if(msg) msg.textContent = `Import PersonnelSDIS terminé : ${ok} utilisateur(s) créé(s)/mis à jour, ${failed} échec(s).`;
      await renderUsers();
    }catch(error){
      if(msg) msg.textContent = `Import CSV impossible : ${error.message || error}`;
    }
  }

  async function renderUsers(){
    const root = document.getElementById('adminUsersApp');
    if(!root || !window.MonitoringRBAC?.has?.('users:admin')) return;
    root.innerHTML = '<p>Chargement des utilisateurs…</p>';
    try{
      const data = await api('/.netlify/functions/admin-users');
      const rows = (data.users || []).map(u => `<tr><td><strong>${escape(u.displayName)}</strong></td><td><strong>${escape(u.nip || '—')}</strong><br><span>${escape(u.email || u.subject || '—')}</span></td><td class="f7-rights-cell">${roleBadges(u.roles)}</td><td>${u.active ? 'Actif' : 'Désactivé'}</td><td>${escape(u.lastLoginAt || '—')}</td><td><button type="button" class="compact-btn" data-edit-user="${escape(u.subject)}">Modifier</button></td></tr>`).join('');
      root.innerHTML = `${renderUserForm(root)}<div class="table-wrap"><table class="f7-users-table"><thead><tr><th>Nom</th><th>NIP / identité</th><th>Droits</th><th>Statut</th><th>Dernière connexion</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Aucun utilisateur applicatif enregistré.</td></tr>'}</tbody></table></div>`;
      const form = root.querySelector('#adminUserForm');
      const quick = root.querySelector('#adminQuickProfile');
      applyQuickProfile(form, quick);
      await loadPersonnelDirectory(root);
      quick?.addEventListener('change', () => applyQuickProfile(form, quick));
      form.nip?.addEventListener('input', () => applyPersonnelFromNip(form, root));
      root.querySelector('#adminImportPersonnelBtn')?.addEventListener('click', () => importPersonnelCsv(root));
      const usersBySubject = Object.fromEntries((data.users || []).map(u => [u.subject, u]));
      root.querySelectorAll('[data-edit-user]').forEach(btn => btn.addEventListener('click', () => fillUserForm(root, usersBySubject[btn.getAttribute('data-edit-user')])));
      form?.addEventListener('submit', async event => {
        event.preventDefault();
        const msg = root.querySelector('#adminUserMessage');
        const subject = (form.subject.value.trim() || form.nip.value.trim()).toLowerCase();
        const roles = selectedRolesFromForm(form);
        if(!subject){ msg.textContent = 'NIP / identifiant obligatoire.'; return; }
        if(!roles.length){ msg.textContent = 'Sélectionne au moins un droit.'; return; }
        const payload = { subject, email:subject.includes('@') ? subject : '', displayName:form.displayName.value.trim() || subject, nip:form.nip.value.trim(), active:form.active.value === 'true', roles };
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
