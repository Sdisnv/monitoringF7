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
  const PERSONNEL_STORAGE_KEY = 'monitoring_f7_personnel_sdis_csv_v1';
  const PERSONNEL_CSV_URL = 'assets/data/PersonnelSDIS.csv';
  let personnelDirectory = [];
  const ROLE_LABELS = Object.freeze(ROLES.reduce((acc, role) => Object.assign(acc, { [role.value]: role.label }), {}));
  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function normalizeHeader(value){ return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function normalizeNip(value){ return String(value || '').replace(/\D+/g, '').trim(); }
  function canAdmin(){ return window.MonitoringRBAC?.has?.('users:admin') === true; }
  function roleLabel(role){ return ROLE_LABELS[role] || role; }
  function roleBadges(roles){
    return (Array.isArray(roles) ? roles : []).map(role => `<span class="f7-role-badge">${esc(roleLabel(role))}</span>`).join(' ');
  }
  function mount(){
    const pane = $('f7-pane-admin'); if(!pane || $('f7InstitutionalAdmin')) return;
    const box = document.createElement('section');
    box.id = 'f7InstitutionalAdmin';
    box.className = 'f7-management-pane-card';
    box.setAttribute('data-rbac-permission','users:admin');
    box.innerHTML = `<h2 class="section-title"><span>Administration institutionnelle</span></h2>
      <p class="footer-note">Gestion rapide des droits côté PostgreSQL. Okta reste l’identité principale : aucun mot de passe local n’est créé.</p>
      <div class="grid-3">
        <div><label>NIP / identifiant</label><input id="f7UserNip" inputmode="numeric" placeholder="48364"></div>
        <div><label>Nom affiché</label><input id="f7UserDisplayName" placeholder="Grade Prénom NOM"></div>
        <div><label>E-mail / identifiant Okta</label><input id="f7UserSubject" placeholder="Optionnel si le NIP est utilisé"></div>
      </div>
      <div class="grid-3">
        <div><label>Profil rapide</label><select id="f7QuickProfile">${QUICK_PROFILES.map(p=>`<option value="${p.value}">${p.label}</option>`).join('')}</select></div>
        <div><label>Rôles détaillés</label><select id="f7UserRoles" multiple size="7">${ROLES.map(r=>`<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
        <div><label>État</label><select id="f7UserActive"><option value="true">Actif</option><option value="false">Désactivé</option></select></div>
      </div>
      <div class="f7-status-box">Lecture seule = consultation. Lecture + écriture = saisie. Chef formation = pilotage formation. Admin = droits complets.</div>
      <div class="grid-3">
        <div><label>Importer PersonnelSDIS.csv</label><input id="f7PersonnelCsvFile" type="file" accept=".csv,text/csv"></div>
        <div><label>Profil créé par import</label><select id="f7CsvQuickProfile">${QUICK_PROFILES.map(p=>`<option value="${p.value}">${p.label}</option>`).join('')}</select></div>
        <div><label>&nbsp;</label><button class="compact-btn" id="f7ImportPersonnelCsvBtn" type="button">Mettre à jour la liste / importer</button></div>
      </div>
      <div class="f7-status-box" id="f7PersonnelStatus">Référentiel personnel non chargé.</div>
      <div class="f7-action-row"><button class="compact-btn primary" id="f7CreateUserBtn" type="button">Créer / modifier utilisateur</button><button class="compact-btn" id="f7RefreshUsersBtn" type="button">Actualiser</button><button class="compact-btn" id="f7LoadAuditBtn" type="button">Charger audit trail</button></div>
      <div class="f7-status-box" id="f7UsersStatus">Réservé aux administrateurs.</div>
      <div class="table-scroll"><table class="data-table f7-users-table"><thead><tr><th>Utilisateur</th><th>NIP / identité</th><th>Droits</th><th>État</th><th>Dernière connexion</th><th>Action</th></tr></thead><tbody id="f7UsersTable"><tr><td colspan="6">Non chargé.</td></tr></tbody></table></div>
      <h3>Audit trail</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Résultat</th><th>Détail</th></tr></thead><tbody id="f7AuditTable"><tr><td colspan="5">Non chargé.</td></tr></tbody></table></div>`;
    pane.appendChild(box);
    $('f7QuickProfile')?.addEventListener('change', applyQuickProfile);
    $('f7UserNip')?.addEventListener('input', applyPersonnelFromNip);
    $('f7CreateUserBtn')?.addEventListener('click', saveUser);
    $('f7ImportPersonnelCsvBtn')?.addEventListener('click', importPersonnelCsv);
    $('f7RefreshUsersBtn')?.addEventListener('click', loadUsers);
    $('f7LoadAuditBtn')?.addEventListener('click', loadAudit);
    window.MonitoringRBAC?.applyUIRestrictions?.();
    applyQuickProfile();
    loadPersonnelDirectory();
    if(canAdmin()) loadUsers();
  }
  function applyQuickProfile(){
    const profile = QUICK_PROFILES.find(item => item.value === $('f7QuickProfile')?.value) || QUICK_PROFILES[1];
    Array.from($('f7UserRoles')?.options || []).forEach(o => o.selected = profile.roles.includes(o.value));
  }
  function setPersonnelStatus(msg, type){
    const el = $('f7PersonnelStatus');
    if(el){ el.className = 'f7-status-box ' + (type || ''); el.textContent = msg; }
  }
  async function loadPersonnelDirectory(){
    try{
      const saved = localStorage.getItem(PERSONNEL_STORAGE_KEY);
      if(saved){
        personnelDirectory = parsePersonnelCsv(saved);
        setPersonnelStatus(`Référentiel personnel chargé depuis la dernière importation manuelle : ${personnelDirectory.length} personne(s).`, 'ok');
        return;
      }
    }catch{}
    try{
      const response = await fetch(PERSONNEL_CSV_URL, { cache:'no-store' });
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      personnelDirectory = parsePersonnelCsv(text);
      setPersonnelStatus(`Référentiel PersonnelSDIS embarqué chargé : ${personnelDirectory.length} personne(s).`, 'ok');
    }catch(error){
      personnelDirectory = [];
      setPersonnelStatus(`Référentiel PersonnelSDIS indisponible : ${error?.message || error}`, 'warn');
    }
  }
  function findPersonnelByNip(nip){
    const normalized = normalizeNip(nip);
    if(!normalized) return null;
    return personnelDirectory.find(person => normalizeNip(person.nip) === normalized) || null;
  }
  function applyPersonnelFromNip(){
    const person = findPersonnelByNip($('f7UserNip')?.value);
    if(!person) return;
    if($('f7UserDisplayName')) $('f7UserDisplayName').value = person.displayName;
    if($('f7UserSubject') && !$('f7UserSubject').value.trim()) $('f7UserSubject').value = person.subject || person.nip || '';
    setPersonnelStatus(`NIP reconnu : ${person.displayName}${person.oi ? ` (${person.oi})` : ''}.`, 'ok');
  }
  function selectedRoles(){ return Array.from($('f7UserRoles')?.selectedOptions || []).map(o=>o.value); }
  function setStatus(msg, type){ const el=$('f7UsersStatus'); if(el){ el.className='f7-status-box '+(type||''); el.textContent=msg; } }
  async function loadUsers(){
    if(!canAdmin()){ setStatus('Accès refusé : rôle admin requis.', 'error'); return; }
    const res = await window.MonitoringApiClient.listUsers();
    if(!res.ok || !res.data?.ok){ setStatus('Chargement utilisateurs impossible.', 'error'); return; }
    const tbody=$('f7UsersTable');
    tbody.innerHTML = (res.data.users||[]).map(u => `<tr><td><strong>${esc(u.displayName)}</strong></td><td><strong>${esc(u.nip || '—')}</strong><br><span>${esc(u.email || u.subject || '—')}</span></td><td class="f7-rights-cell">${roleBadges(u.roles)}</td><td>${u.active?'Actif':'Désactivé'}</td><td>${esc(u.lastLoginAt||'—')}</td><td><button class="compact-btn" data-edit-user="${esc(u.subject)}">Reprendre</button></td></tr>`).join('') || '<tr><td colspan="6">Aucun utilisateur.</td></tr>';
    tbody.querySelectorAll('[data-edit-user]').forEach(btn => btn.addEventListener('click', () => {
      const u=(res.data.users||[]).find(x=>x.subject===btn.getAttribute('data-edit-user')); if(!u) return;
      $('f7UserSubject').value=u.subject||u.email||''; $('f7UserDisplayName').value=u.displayName||'';
      $('f7UserNip').value=u.nip||'';
      $('f7UserActive').value = u.active === false ? 'false' : 'true';
      Array.from($('f7UserRoles').options).forEach(o => o.selected=(u.roles||[]).includes(o.value));
    }));
    setStatus('Utilisateurs chargés.', 'ok');
  }
  async function saveUser(){
    const nip = $('f7UserNip')?.value.trim() || '';
    const subject=($('f7UserSubject')?.value.trim() || nip).toLowerCase(); if(!subject){ setStatus('NIP / identifiant obligatoire.', 'error'); return; }
    const roles = selectedRoles();
    if(!roles.length){ setStatus('Sélectionne au moins un rôle.', 'error'); return; }
    const user={ subject, email:subject.includes('@')?subject:'', displayName:$('f7UserDisplayName')?.value.trim()||subject, nip, roles, active:$('f7UserActive')?.value !== 'false' };
    const res = await window.MonitoringApiClient.saveUser(user);
    if(!res.ok || !res.data?.ok){ setStatus(res.data?.error || 'Enregistrement refusé.', 'error'); return; }
    setStatus('Utilisateur enregistré.', 'ok'); loadUsers();
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
      grade: indexOf(['grade', 'rang']),
      prenom: indexOf(['prenom', 'prénom']),
      nom: indexOf(['nom', 'name']),
      email: indexOf(['email', 'e mail', 'mail', 'adresse email', 'adresse mail']),
      nip: indexOf(['nip', 'eca', 'identifiant', 'matricule']),
      oi: indexOf(['oi', 'organe', 'organisation', 'affectation'])
    };
    return lines.slice(1).map(line => {
      const values = parseCsvLine(line, sep);
      const grade = idx.grade >= 0 ? values[idx.grade] : '';
      const prenom = idx.prenom >= 0 ? values[idx.prenom] : '';
      const nom = idx.nom >= 0 ? values[idx.nom] : '';
      const email = idx.email >= 0 ? values[idx.email] : '';
      const nip = idx.nip >= 0 ? values[idx.nip] : '';
      const oi = idx.oi >= 0 ? values[idx.oi] : '';
      const displayName = [grade, prenom, nom].map(v => String(v || '').trim()).filter(Boolean).join(' ') || email || nip;
      const subject = String(email || nip || '').trim().toLowerCase();
      return { subject, email, nip, oi, grade, prenom, nom, displayName };
    }).filter(user => user.subject && user.displayName);
  }
  async function importPersonnelCsv(){
    if(!canAdmin()){ setStatus('Accès refusé : rôle admin requis.', 'error'); return; }
    const file = $('f7PersonnelCsvFile')?.files?.[0];
    if(!file){ setStatus('Sélectionne PersonnelSDIS.csv.', 'error'); return; }
    const profile = QUICK_PROFILES.find(item => item.value === $('f7CsvQuickProfile')?.value) || QUICK_PROFILES[1];
    try{
      const text = await file.text();
      const users = parsePersonnelCsv(text);
      if(!users.length){ setStatus('Aucun utilisateur exploitable dans le CSV.', 'error'); return; }
      try { localStorage.setItem(PERSONNEL_STORAGE_KEY, text); } catch {}
      personnelDirectory = users;
      let ok = 0; let failed = 0;
      for(const user of users){
        const res = await window.MonitoringApiClient.saveUser(Object.assign({}, user, { roles:profile.roles, active:true }));
        if(res.ok && res.data?.ok) ok++; else failed++;
      }
      setStatus(`Import PersonnelSDIS terminé : ${ok} utilisateur(s) créé(s)/mis à jour, ${failed} échec(s).`, failed ? 'warn' : 'ok');
      loadUsers();
    }catch(error){
      setStatus(`Import CSV impossible : ${error?.message || error}`, 'error');
    }
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
