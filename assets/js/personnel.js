/* SCOPE Personnel 1B - UI nominative serveur/PostgreSQL. */
(function(){
  'use strict';

  const TARGETS = { DPS:['G1','C1','B1','B2'], DAP:['Y1','Y2','Y3','Y4'], JSP:['JSP G1','JSP C1','JSP B1'], PR:['PR'], AUTO:['cond VL','cond PL'] };
  const state = { rows:[], sortKey:'nom', sortDir:'asc', batchId:null };
  const $ = id => document.getElementById(id);
  const escape = value => window.MonitoringSecurity?.escapeHTML ? window.MonitoringSecurity.escapeHTML(value) : String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  async function api(path, options){
    const res = await fetch(path, Object.assign({ credentials:'include', cache:'no-store', headers:{ Accept:'application/json', 'Content-Type':'application/json' } }, options || {}));
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false) throw new Error(data.message || data.error || `HTTP ${res.status}`);
    return data;
  }
  function setStatus(message, kind){
    const box = $('scopePersonnelStatus');
    if(!box) return;
    box.textContent = message;
    box.className = `f7-status-box ${kind || ''}`.trim();
  }
  function assignmentLabel(a){
    const role = a.roleDomaine ? ` ${a.roleDomaine === 'PRINCIPAL' ? 'principal' : 'secondaire'}` : '';
    return `${a.domaine} ${a.cible}${role}`;
  }
  function activeAssignments(person){
    const today = new Date().toISOString().slice(0, 10);
    return (person.affectations || []).filter(a => !a.dateInactif || String(a.dateInactif).slice(0, 10) >= today);
  }
  function contextAssignment(person){
    const domain = $('scopePersonnelDomain')?.value || '';
    const target = $('scopePersonnelTarget')?.value || '';
    const list = activeAssignments(person).filter(a => (!domain || a.domaine === domain) && (!target || a.cible === target));
    return list.map(assignmentLabel).join(', ') || '-';
  }
  function otherAssignments(person){
    const current = new Set(contextAssignment(person).split(', ').filter(v => v && v !== '-'));
    return activeAssignments(person).map(assignmentLabel).filter(label => !current.has(label)).slice(0, 4).join(', ') || '-';
  }
  function sortRows(rows){
    const key = state.sortKey;
    const dir = state.sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => String(a[key] || '').localeCompare(String(b[key] || ''), 'fr', { numeric:true, sensitivity:'base' }) * dir);
  }
  function renderRows(){
    const body = $('scopePersonnelBody');
    if(!body) return;
    const rows = sortRows(state.rows);
    const count = $('scopePersonnelCount');
    if(count) count.textContent = `${rows.length} personne${rows.length > 1 ? 's' : ''}`;
    if(!rows.length){
      body.innerHTML = '<tr><td colspan="9" class="muted">Aucune personne nominative dans PostgreSQL pour ce filtre.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(person => {
      const active = activeAssignments(person).length;
      const inactive = (person.affectations || []).length - active;
      return `<tr><td><strong>${escape(person.nip)}</strong></td><td>${escape(person.grade || '-')}</td><td>${escape(person.nom || '-')}</td><td>${escape(person.prenom || '-')}</td><td>${escape(contextAssignment(person))}</td><td>${escape(otherAssignments(person))}</td><td>${active}</td><td>${inactive}</td><td><button class="compact-btn" data-open-person="${escape(person.id)}" type="button">Fiche</button></td></tr>`;
    }).join('');
    body.querySelectorAll('[data-open-person]').forEach(btn => btn.addEventListener('click', () => openPerson(btn.dataset.openPerson)));
  }
  async function loadPersonnel(){
    if(!$('tab-personnel')) return;
    const params = new URLSearchParams();
    const q = $('scopePersonnelSearch')?.value.trim();
    const domaine = $('scopePersonnelDomain')?.value;
    const cible = $('scopePersonnelTarget')?.value;
    if(q) params.set('q', q);
    if(domaine) params.set('domaine', domaine);
    if(cible) params.set('cible', cible);
    try{
      const data = await api(`/.netlify/functions/scope-personnel-list?${params.toString()}`);
      state.rows = data.personnes || [];
      renderRows();
      setStatus('Liste PERSONNEL chargée depuis PostgreSQL.', 'ok');
    }catch(error){
      state.rows = [];
      renderRows();
      setStatus(`Personnel indisponible : ${error.message}`, 'error');
    }
  }
  function updateTargetOptions(){
    const domain = $('scopePersonnelDomain')?.value || '';
    const select = $('scopePersonnelTarget');
    if(!select) return;
    select.innerHTML = '<option value="">Toutes</option>' + (TARGETS[domain] || []).map(v => `<option>${escape(v)}</option>`).join('');
  }
  function renderImportPreview(result){
    state.batchId = result.batchId;
    const card = $('scopePersonnelPreviewCard');
    const summary = $('scopePersonnelImportSummary');
    const body = $('scopePersonnelImportBody');
    if(card) card.hidden = false;
    const c = result.counts || {};
    if(summary) summary.innerHTML = [['Lignes', c.totalLines], ['NIP uniques', c.totalUniqueNips], ['Identiques', c.countIdentical], ['Nouvelles personnes', c.countNewPersons], ['Modifications', c.countModified], ['Nouvelles affectations', c.countNewAssignments], ['Affectations absentes', c.countMissingAssignments], ['Erreurs', c.countErrors]].map(([label, value]) => `<span><strong>${escape(value || 0)}</strong>${escape(label)}</span>`).join('');
    if(body) body.innerHTML = (result.lines || []).map(line => `<tr class="${line.status === 'ERROR' ? 'scope-row-error' : ''}"><td>${line.lineNumber}</td><td>${escape(line.normalized?.nip || '-')}</td><td>${escape(line.status)}</td><td><pre>${escape(JSON.stringify(line.diff || {}, null, 2))}</pre></td><td>${escape((line.errors || []).join(', ') || '-')}</td></tr>`).join('');
    setStatus('Analyse terminée. Aucune Personne ni affectation n’a encore été modifiée.', c.countErrors ? 'warn' : 'ok');
  }
  async function analyzeImport(){
    const file = $('scopePersonnelFile')?.files?.[0];
    if(!file){ setStatus('Sélectionne un fichier CSV.', 'error'); return; }
    try{
      const data = await api('/.netlify/functions/scope-personnel-import-analyze', {
        method:'POST',
        body:JSON.stringify({
          fileText:await file.text(),
          filename:file.name,
          importType:$('scopePersonnelImportContext')?.value || 'OI',
          contexte:$('scopePersonnelImportContext')?.value || 'OI',
          anneeMonitoring:Number($('scopePersonnelYear')?.value) || new Date().getFullYear()
        })
      });
      renderImportPreview(data.result);
    }catch(error){ setStatus(`Analyse impossible : ${error.message}`, 'error'); }
  }
  async function commitImport(){
    if(!state.batchId){ setStatus('Aucun batch à valider.', 'error'); return; }
    if(!confirm('Valider transactionnellement cet import PERSONNEL ?')) return;
    try{
      const data = await api('/.netlify/functions/scope-personnel-import-commit', { method:'POST', body:JSON.stringify({ batchId:state.batchId }) });
      setStatus(`Commit terminé : ${data.personsTouched || 0} personne(s), ${data.assignmentsCreated || 0} affectation(s) créée(s).`, 'ok');
      await loadPersonnel();
    }catch(error){ setStatus(`Commit refusé : ${error.message}`, 'error'); }
  }
  function groupAssignments(assignments){
    return (assignments || []).reduce((acc, a) => {
      const key = a.categorie === 'SPECIALISATION' ? 'Spécialisations' : a.domaine;
      if(!acc[key]) acc[key] = [];
      acc[key].push(a);
      return acc;
    }, {});
  }
  async function savePersonDate(id){
    const data = await api('/.netlify/functions/scope-personnel-detail', { method:'PUT', body:JSON.stringify({ id, dateEntreeSdis:$('scopePersonDateEntree')?.value || '' }) });
    renderPersonDetail(data.personne);
    await loadPersonnel();
  }
  async function saveAssignmentDates(affectationId){
    const dateActif = document.querySelector(`[data-aff-actif="${CSS.escape(affectationId)}"]`)?.value || '';
    const dateInactif = document.querySelector(`[data-aff-inactif="${CSS.escape(affectationId)}"]`)?.value || '';
    const data = await api('/.netlify/functions/scope-personnel-detail', { method:'PUT', body:JSON.stringify({ affectationId, dateActif, dateInactif }) });
    renderPersonDetail(data.personne);
    await loadPersonnel();
  }
  function renderPersonDetail(person){
    const card = $('scopePersonnelDetailCard');
    const title = $('scopePersonnelDetailTitle');
    const body = $('scopePersonnelDetailBody');
    if(!card || !body || !person) return;
    card.hidden = false;
    if(title) title.textContent = `${person.grade || ''} ${person.prenom || ''} ${person.nom || ''}`.trim() || 'Fiche personne';
    const groups = groupAssignments(person.affectations);
    const groupHtml = Object.entries(groups).map(([name, assignments]) => `<section class="scope-person-group"><h3>${escape(name)}</h3>${assignments.map(a => `<div class="scope-aff-row"><strong>${escape(a.cible)}</strong><span>${escape(a.roleDomaine || '')}</span><label>Actif<input type="date" data-aff-actif="${escape(a.id)}" value="${escape(String(a.dateActif || '').slice(0, 10))}"></label><label>Inactif<input type="date" data-aff-inactif="${escape(a.id)}" value="${escape(String(a.dateInactif || '').slice(0, 10))}"></label><button class="compact-btn" data-save-aff="${escape(a.id)}" type="button">Enregistrer</button></div>`).join('')}</section>`).join('');
    body.innerHTML = `<div class="scope-person-head"><div><strong>NIP ${escape(person.nip)}</strong><span>${escape(person.grade || '')} ${escape(person.prenom || '')} ${escape(person.nom || '')}</span></div><label>Date entrée SDIS<input id="scopePersonDateEntree" type="date" value="${escape(String(person.dateEntreeSdis || '').slice(0, 10))}"></label><button class="compact-btn primary" id="scopeSavePersonDate" type="button">Enregistrer fiche</button></div>${groupHtml || '<p class="muted">Aucune affectation enregistrée.</p>'}`;
    $('scopeSavePersonDate')?.addEventListener('click', () => savePersonDate(person.id).catch(error => setStatus(`Enregistrement fiche impossible : ${error.message}`, 'error')));
    body.querySelectorAll('[data-save-aff]').forEach(btn => btn.addEventListener('click', () => saveAssignmentDates(btn.dataset.saveAff).catch(error => setStatus(`Enregistrement affectation impossible : ${error.message}`, 'error'))));
  }
  async function openPerson(id){
    try{
      const data = await api(`/.netlify/functions/scope-personnel-detail?id=${encodeURIComponent(id)}`);
      renderPersonDetail(data.personne);
    }catch(error){ setStatus(`Fiche indisponible : ${error.message}`, 'error'); }
  }
  function bind(){
    if(!$('tab-personnel')) return;
    if($('scopePersonnelYear')) $('scopePersonnelYear').value = String(new Date().getFullYear());
    $('scopePersonnelSearch')?.addEventListener('input', () => { clearTimeout(bind.searchTimer); bind.searchTimer = setTimeout(loadPersonnel, 250); });
    $('scopePersonnelDomain')?.addEventListener('change', () => { updateTargetOptions(); loadPersonnel(); });
    $('scopePersonnelTarget')?.addEventListener('change', loadPersonnel);
    $('scopePersonnelAnalyzeBtn')?.addEventListener('click', analyzeImport);
    $('scopePersonnelCommitBtn')?.addEventListener('click', commitImport);
    $('scopePersonnelCloseDetail')?.addEventListener('click', () => { $('scopePersonnelDetailCard').hidden = true; });
    document.querySelectorAll('#scopePersonnelTable thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
      const key = th.dataset.sort;
      state.sortDir = state.sortKey === key && state.sortDir === 'asc' ? 'desc' : 'asc';
      state.sortKey = key;
      renderRows();
    }));
    document.querySelectorAll('.tab-btn[data-tab-target="personnel"]').forEach(btn => btn.addEventListener('click', () => setTimeout(loadPersonnel, 0)));
  }
  document.addEventListener('DOMContentLoaded', bind);
  document.addEventListener('monitoring-f7-auth-session-changed', () => setTimeout(loadPersonnel, 100));
  window.ScopePersonnelUI = Object.freeze({ loadPersonnel });
})();
