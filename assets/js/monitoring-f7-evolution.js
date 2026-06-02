/* Monitoring F7 v66.19 — couche d'évolution non destructive.
   Objectifs: professionnaliser la lecture COD, préserver localStorage, préparer Netlify + GitHub. */
(function(){
  'use strict';

  const APP_VERSION = window.MonitoringConfig?.version || 'v66.19';
  const DATA_SCHEMA_VERSION = 3;
  const KEYS = {
    records: 'monitoring_exercices_sdis_v2',
    refs: 'monitoring_exercices_sdis_references_v1',
    imported: 'monitoring_exercices_sdis_imported_events_v1',
    objectives: 'monitoring_exercices_sdis_objectifs_v1',
    periods: 'monitoring_exercices_sdis_reference_periods_v1',
    meta: 'monitoring_f7_data_meta_v1',
    admin: 'monitoring_f7_admin_profile_v1',
    adminLock: 'monitoring_f7_admin_lock_v1'
  };
  const TEMP_ADMIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  const EVENT_STATUS = ['importé','à traiter','prioritaire','en cours','traité','ignoré / non comptabilisé'];

  function $(id){ return document.getElementById(id); }
  function readJSON(key, fallback){
    try{
      const raw=localStorage.getItem(key);
      if(!raw) return fallback;
      const parsed=JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    }catch{ return fallback; }
  }
  function writeJSON(key, value){
    if(!Object.values(KEYS).includes(key) && !key.startsWith('monitoring_sdis_auth_')) return;
    localStorage.setItem(key, JSON.stringify(value));
  }
  function toArray(v){ return Array.isArray(v) ? v : []; }
  function nowIso(){ return new Date().toISOString(); }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function uid(){ return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`); }
  async function sha256Hex(value){
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(value)));
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  function eventKey(e){
    return [e.dateExercice||'', e.domain||'', e.subStructure||'', e.template||'', e.statCom||''].map(x=>String(x).trim().toLowerCase()).join('|');
  }
  function normalizeDate(raw){
    const v=String(raw||'').trim();
    if(!v) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m=v.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2}|\d{4})$/);
    if(m){ let yy=m[3]; if(yy.length===2) yy='20'+yy; return `${yy}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
    const d=new Date(v); return Number.isNaN(d.getTime()) ? v : d.toISOString().slice(0,10);
  }
  function normalizeImportedEvent(raw){
    const s=raw && typeof raw==='object' ? raw : {};
    return {
      id:String(s.id||uid()),
      dateExercice:normalizeDate(s.dateExercice || s.dateEvenement || s.date || s.Date || ''),
      domain:String(s.domain || s.domaine || s.Domaine || '').trim().toUpperCase(),
      subStructure:String(s.subStructure || s.publicCible || s.public || s['Public cible'] || '').trim(),
      template:String(s.template || s.evenement || s['Événement'] || s.Evenement || s.nom || '').trim(),
      statCom:String(s.statCom || s['Stat.Com'] || s.statistique || '').trim(),
      status:String(s.status || s.statutTraitement || s.statut || 'importé').trim() || 'importé',
      createdAt:String(s.createdAt || nowIso()),
      updatedAt:String(s.updatedAt || '')
    };
  }


  function fmtLocalDate(value){
    if(!value) return '—';
    const raw=String(value).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(raw)){
      const [y,m,d]=raw.slice(0,10).split('-');
      return `${d}.${m}.${y}`;
    }
    const d=new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString('fr-CH');
  }
  function showOperationalMessage(message, level='info'){
    const bar=$('f7OperationalMessage');
    if(!bar) return;
    bar.hidden=false;
    bar.className=`f7-message-bar ${level}`;
    bar.textContent=String(message || '');
    clearTimeout(showOperationalMessage._timer);
    showOperationalMessage._timer=setTimeout(()=>{ bar.hidden=true; }, level==='error' ? 9000 : 5200);
  }
  function formatOperationalError(prefix, err){
    const detail = err?.message ? String(err.message) : String(err || '');
    return detail ? `${prefix} ${detail}` : prefix;
  }
  window.MonitoringUiMessage = Object.freeze({
    info: message => showOperationalMessage(message, 'info'),
    ok: message => showOperationalMessage(message, 'ok'),
    warn: message => showOperationalMessage(message, 'warn'),
    error: message => showOperationalMessage(message, 'error')
  });
  function switchMainTab(name){
    document.querySelectorAll('.tab-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.tabTarget===name));
    document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active', panel.id===`tab-${name}`));
    if(name==='events') setTimeout(renderEventManagementTable, 0);
    if(name==='effectifs') setTimeout(renderEffectifsLibrary, 0);
  }
  const SESSION_REFERENCE_DATE_ISO = window.MonitoringEventRules?.sessionReferenceDateIso || (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();
  function eventDateIso(row){
    return (window.MonitoringEventRules?.normalizeEventDate
      ? window.MonitoringEventRules.normalizeEventDate(row.dateExercice || row.dateEvenement || row.date || '')
      : normalizeDate(row.dateExercice || row.dateEvenement || row.date || '')).slice(0, 10);
  }
  function eventIsClosed(row){
    if(window.MonitoringEventRules?.isEventClosed) return window.MonitoringEventRules.isEventClosed(row);
    const s=String(row.status || row.statutTraitement || '').toLowerCase();
    return row.aComptabiliser === true || ['traité','traite','effectué','effectue','clôturé','cloture','annulé','annule','ignoré / non comptabilisé','ignore / non comptabilise'].includes(s);
  }
  function hasValidEventDate(row){
    return /^\d{4}-\d{2}-\d{2}$/.test(eventDateIso(row));
  }
  function eventIsDueAtSessionDate(row){
    const iso = eventDateIso(row);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso <= SESSION_REFERENCE_DATE_ISO;
  }
  function eventIsPriority(row){
    return window.MonitoringEventRules?.isEventToProcess
      ? window.MonitoringEventRules.isEventToProcess(row)
      : eventIsDueAtSessionDate(row) && !eventIsClosed(row);
  }
  function migrateMeta(){
    const meta = readJSON(KEYS.meta, null) || {};
    const next = {
      appVersion: APP_VERSION,
      dataSchemaVersion: Math.max(Number(meta.dataSchemaVersion||0), DATA_SCHEMA_VERSION),
      lastMigrationAt: meta.dataSchemaVersion === DATA_SCHEMA_VERSION ? meta.lastMigrationAt || nowIso() : nowIso(),
      storageMode: window.MonitoringOnlineDataService?.isReady?.() ? 'postgres-online-first' : 'local-cache-fallback',
      destructiveImportsDefault: false
    };
    writeJSON(KEYS.meta, next);
    if(meta.dataSchemaVersion !== DATA_SCHEMA_VERSION) window.MonitoringAuditLog?.logAction('storage-migration', 'Métadonnées stockage contrôlées.', { dataSchemaVersion: DATA_SCHEMA_VERSION, appVersion: APP_VERSION });
  }

  function moveExistingUi(){
    const effectifsMount=$('f7EffectifsMount');
    const ref=document.querySelector('.effectifs-ref-wrap');
    if(effectifsMount && ref && !effectifsMount.contains(ref)) effectifsMount.appendChild(ref);

    const saisieMount=$('f7SaisieEventsMount');
    const eventSelect=$('eventSelect');
    const formCard=eventSelect ? eventSelect.closest('section.card') : null;
    if(saisieMount && formCard && !saisieMount.contains(formCard)) saisieMount.appendChild(formCard);

    const importMount=$('f7LegacyImportMount');
    ['importJsonBtn','importEventsBtn','jsonFileInput','eventsFileInput','importStatus'].forEach(id=>{
      const el=$(id); if(importMount && el && !importMount.contains(el)) importMount.appendChild(el.closest('button') || el);
    });

    const backupMount=$('f7BackupLegacyMount');
    ['exportJsonBtn','importJsonBtn'].forEach(id=>{ const el=$(id); if(backupMount && el && !backupMount.contains(el)) backupMount.appendChild(el); });

    const adminActions=$('f7AdminActionsMount');
    ['clearDataBtn','seedBtn','deleteFilteredEventsBtn'].forEach(id=>{ const el=$(id); if(adminActions && el && !adminActions.contains(el)) adminActions.appendChild(el); });

    const dash=$('tab-dashboard');
    if(dash && !document.querySelector('.f7-dashboard-clean-note')){
      const note=document.createElement('div');
      note.className='wrap f7-dashboard-clean-note';
      note.innerHTML='<div class="footer-note">Vue monitoring en lecture/synthèse. La saisie, les imports, les effectifs, l’administration et les sauvegardes sont déplacés dans leurs onglets dédiés.</div>';
      dash.prepend(note);
    }
  }

  function parseCsv(text){
    const lines=String(text||'').split(/\r?\n/).filter(l=>l.trim());
    if(!lines.length) return [];
    const sep=(lines[0].match(/;/g)||[]).length >= (lines[0].match(/,/g)||[]).length ? ';' : ',';
    const parseLine=line=>{
      const out=[]; let cur='', quoted=false;
      for(let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"' && line[i+1]==='"'){cur+='"';i++;continue;}
        if(ch==='"'){quoted=!quoted;continue;}
        if(ch===sep && !quoted){out.push(cur.trim());cur='';continue;}
        cur+=ch;
      }
      out.push(cur.trim()); return out;
    };
    const headers=parseLine(lines[0]).map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const vals=parseLine(line); const obj={}; headers.forEach((h,i)=>obj[h]=vals[i]||''); return obj;
    });
  }
  async function parseImportFile(file){
    const maxBytes = 5 * 1024 * 1024;
    if(!file || file.size > maxBytes) throw new Error('Fichier trop volumineux ou absent (limite 5 Mo pour import CSV/JSON).');
    const text=await file.text();
    if(text.length > maxBytes) throw new Error('Import refusé : contenu trop volumineux.');
    if(file.name.toLowerCase().endsWith('.json')){
      const parsed=JSON.parse(text);
      window.MonitoringAuditLog?.logInfo('import-json-preview', 'Prévisualisation import JSON locale.', { fileSize: file.size });
      if(Array.isArray(parsed)) return parsed.map(normalizeImportedEvent);
      if(Array.isArray(parsed.importedEvents)) return parsed.importedEvents.map(normalizeImportedEvent);
      if(Array.isArray(parsed.events)) return parsed.events.map(normalizeImportedEvent);
      if(Array.isArray(parsed.records)) return parsed.records.map(normalizeImportedEvent);
      return [];
    }
    window.MonitoringAuditLog?.logInfo('import-csv-preview', 'Prévisualisation import CSV locale.', { fileSize: file.size });
    return parseCsv(text).map(normalizeImportedEvent).filter(e=>e.template || e.dateExercice || e.domain);
  }

  let previewRows=[];
  function renderPreview(rows){
    const existing = new Map(toArray(readJSON(KEYS.imported, [])).map(e=>[eventKey(normalizeImportedEvent(e)), normalizeImportedEvent(e)]));
    const body=$('f7ImportPreviewBody'); const wrap=document.querySelector('.f7-preview-wrap'); const summary=$('f7ImportSummary');
    if(!body||!summary) return;
    body.innerHTML='';
    const stats={detected:rows.length, added:0, existing:0, updated:0, ignored:0};
    previewRows=rows.map(row=>{
      const key=eventKey(row); const old=existing.get(key);
      let decision='ajouté';
      if(old){ decision='déjà existant — statut conservé'; stats.existing++; }
      else stats.added++;
      return {row, decision, old};
    });
    previewRows.forEach(item=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${escapeHtml(item.row.dateExercice)}</td><td>${escapeHtml(item.row.domain)}</td><td>${escapeHtml(item.row.subStructure)}</td><td>${escapeHtml(item.row.template)}</td><td>${escapeHtml(item.row.statCom)}</td><td>${escapeHtml(item.decision)}</td>`;
      body.appendChild(tr);
    });
    if(wrap) wrap.hidden=false;
    summary.className='f7-status-box ok';
    summary.textContent=`Résumé pré-import\nÉvénements détectés : ${stats.detected}\nAjoutés : ${stats.added}\nDéjà existants : ${stats.existing}\nMis à jour : ${stats.updated}\nIgnorés : ${stats.ignored}\n\nAucune donnée existante ne sera supprimée.`;
    const btn=$('f7CommitImportBtn'); if(btn) btn.disabled=!rows.length;
  }
  function commitPreview(){
    const current=toArray(readJSON(KEYS.imported, [])).map(normalizeImportedEvent);
    const byKey=new Map(current.map(e=>[eventKey(e), e]));
    let added=0, existing=0;
    previewRows.forEach(({row})=>{
      const key=eventKey(row);
      if(byKey.has(key)){ existing++; return; }
      byKey.set(key, {...row, status: row.status || 'importé', createdAt:nowIso()}); added++;
    });
    writeJSON(KEYS.imported, Array.from(byKey.values()));
    const summary=$('f7ImportSummary');
    if(summary){ summary.className='f7-status-box ok'; summary.textContent=`Import intégré sans suppression.\nAjoutés : ${added}\nDéjà existants conservés : ${existing}\nRecharge conseillée pour synchroniser toutes les listes internes de l’application.`; }
    window.MonitoringAuditLog?.logAction('import-local-commit', 'Import local intégré sans suppression.', { added, existing });
    renderEventManagementTable();
  }

  function renderEventManagementTable(){
    const tbody=document.querySelector('#overdueTable tbody');
    if(!tbody) return;
    const imported=toArray(readJSON(KEYS.imported, [])).map(normalizeImportedEvent).map(e=>({...e, source:'import'}));
    const records=toArray(readJSON(KEYS.records, [])).map(r=>({...r, status:r.status || (r.aComptabiliser ? 'traité' : 'à traiter'), source:'formation'}));
    const rows=[...imported, ...records].filter(eventIsPriority).sort((a,b)=>eventDateIso(a).localeCompare(eventDateIso(b)) || String(a.template).localeCompare(String(b.template),'fr'));
    window.MonitoringAuditLog?.logInfo('events-to-process-filter', 'Liste événements à traiter filtrée sur la date de connexion.', { referenceDate: SESSION_REFERENCE_DATE_ISO, count: rows.length });
    tbody.innerHTML='';
    if(!rows.length){
      tbody.innerHTML='<tr><td colspan="7" class="ok">Aucun événement non traité à afficher.</td></tr>';
    }
    rows.forEach(row=>{
      const tr=document.createElement('tr');
      if(String(row.status||'').toLowerCase()==='prioritaire') tr.classList.add('f7-priority-row');
      tr.innerHTML=`<td>${escapeHtml(fmtLocalDate(row.dateExercice)||'—')}</td><td>${escapeHtml(row.domain||'—')}</td><td>${escapeHtml(row.subStructure||'—')}</td><td><strong>${escapeHtml(row.template||'—')}</strong><div class="small muted">${escapeHtml(row.source==='import'?'Importé':'Saisi')}</div></td><td>${escapeHtml(row.statCom||'')}</td><td>${escapeHtml(row.status || 'à traiter')}</td><td><div class="f7-row-actions"><button class="compact-btn secondary" data-f7-treat="${escapeHtml(row.id)}" data-source="${escapeHtml(row.source)}" type="button">Traiter</button><button class="compact-btn" data-f7-edit="${escapeHtml(row.id)}" data-source="${escapeHtml(row.source)}" type="button">Modifier</button></div></td>`;
      tbody.appendChild(tr);
    });
    const badge=$('overdueCount');
    if(badge) badge.textContent=`${rows.length} à traiter · jusqu’au ${fmtLocalDate(SESSION_REFERENCE_DATE_ISO)}`;
    tbody.querySelectorAll('[data-f7-treat]').forEach(btn=>btn.addEventListener('click', ()=>openEventForEdit(btn.dataset.f7Treat, btn.dataset.source, true)));
    tbody.querySelectorAll('[data-f7-edit]').forEach(btn=>btn.addEventListener('click', ()=>openEventForEdit(btn.dataset.f7Edit, btn.dataset.source, false)));
  }
  function updateProjectionStrip(){
    const situation=$('f7ProjectionSituation');
    const priority=$('f7ProjectionPriority');
    const date=$('f7ProjectionDate');
    const rate=($('kpiTaux')?.textContent || '0.0%').trim();
    const abs=($('kpiAbsents')?.textContent || '0').trim();
    const exercises=($('kpiExercices')?.textContent || '0').trim();
    const present=($('kpiPresents')?.textContent || '0').trim();
    const alerts=Array.from(document.querySelectorAll('#kpiBusinessAlerts .kpi-alert')).map(el=>el.textContent.trim()).filter(Boolean);
    const risk=alerts[0] && !alerts[0].includes('Aucune alerte') ? alerts[0] : 'Aucune alerte majeure sur la sélection';
    const current=`${exercises} exercice${exercises==='1'?'':'s'} comptabilisé${exercises==='1'?'':'s'}`;
    const presence=`Présence ${rate} · ${present} présents · ${abs} absents non excusés`;
    const decision=risk.includes('Aucune alerte') ? 'Maintenir le suivi et traiter les événements ouverts' : 'Traiter le point de vigilance prioritaire';
    if(situation) situation.textContent=`Présence ${rate} · absents non excusés ${abs}`;
    if(priority) priority.textContent=risk;
    if(date) date.textContent=`Référence locale ${fmtLocalDate(SESSION_REFERENCE_DATE_ISO)}`;
    if($('f7CodSituation')) $('f7CodSituation').textContent=current;
    if($('f7CodPresence')) $('f7CodPresence').textContent=presence;
    if($('f7CodRisk')) $('f7CodRisk').textContent=risk;
    if($('f7CodDecision')) $('f7CodDecision').textContent=decision;
    if($('f7CodReference')) $('f7CodReference').textContent=`Référence locale ${fmtLocalDate(SESSION_REFERENCE_DATE_ISO)}`;
  }
  function observeProjectionData(){
    const targets=['kpiTaux','kpiAbsents','kpiPresents','kpiExercices','kpiBusinessAlerts'].map($).filter(Boolean);
    if(!targets.length || typeof MutationObserver === 'undefined') return;
    const observer=new MutationObserver(updateProjectionStrip);
    targets.forEach(el=>observer.observe(el, { childList:true, subtree:true, characterData:true }));
  }
  function setRecordsDensity(mode, silent=false){
    const wrap=document.querySelector('.records-table-wrap');
    if(!wrap) return;
    const summary=mode !== 'full';
    wrap.classList.toggle('records-view-summary', summary);
    wrap.classList.toggle('records-view-full', !summary);
    $('recordsSummaryViewBtn')?.classList.toggle('active', summary);
    $('recordsFullViewBtn')?.classList.toggle('active', !summary);
    $('recordsSummaryViewBtn')?.setAttribute('aria-pressed', String(summary));
    $('recordsFullViewBtn')?.setAttribute('aria-pressed', String(!summary));
    try{ localStorage.setItem('monitoring_f7_records_density_v65_4', summary ? 'summary' : 'full'); }catch{}
    if(!silent) showOperationalMessage(summary ? 'Vue synthèse activée : lecture courte des événements.' : 'Vue détails activée : toutes les colonnes sont affichées.', 'info');
  }
  function toggleProjectionMode(){
    const active=!document.body.classList.contains('f7-projection-mode');
    document.body.classList.toggle('f7-projection-mode', active);
    const btn=$('f7ProjectionToggle');
    if(btn){
      btn.setAttribute('aria-pressed', String(active));
      btn.textContent=active ? 'Quitter projection' : 'Mode projection';
    }
    updateProjectionStrip();
    showOperationalMessage(active ? 'Mode projection COD activé.' : 'Mode projection COD désactivé.', active ? 'ok' : 'info');
  }
  function updateStoredEventStatus(id, source, status){
    const key=source==='import' ? KEYS.imported : KEYS.records;
    const arr=toArray(readJSON(key, []));
    const next=arr.map(item=>String(item.id)===String(id) ? {...item, status, statutTraitement:status, updatedAt:nowIso()} : item);
    writeJSON(key,next);
  }
  function onStatusChange(e){
    updateStoredEventStatus(e.target.dataset.eventId, e.target.dataset.source, e.target.value);
    renderEventManagementTable();
  }
  function markEventInProgress(id, source){
    openEventForEdit(id, source, true);
  }
  function setTreatmentMode(active){
    const mount=$('f7SaisieEventsMount');
    if(!mount) return;
    mount.classList.toggle('f7-treatment-mode', !!active);
    let banner=$('f7TreatmentBanner');
    if(active){
      if(!banner){ banner=document.createElement('div'); banner.id='f7TreatmentBanner'; banner.className='f7-treatment-banner'; mount.insertBefore(banner, mount.children[2] || null); }
      banner.textContent='Mode traitement actif : compléter ou corriger les données puis enregistrer depuis la saisie événements.';
      const status=$('eventStatus'); if(status && !['Effectué','Annulé'].includes(status.value)) status.value='Effectué';
    }else if(banner){ banner.remove(); }
  }
  function openEventForEdit(id, source, treatmentMode=false){
    switchMainTab('events');
    setTimeout(()=>{
      const select=$('eventSelect');
      if(source==='import' && select){
        select.value=id;
        select.dispatchEvent(new Event('change', {bubbles:true}));
      }else{
        const tableBtn=document.querySelector(`[data-edit="${CSS.escape(String(id))}"]`);
        if(tableBtn) tableBtn.click();
      }
      setTreatmentMode(treatmentMode);
      $('f7SaisieEventsMount')?.scrollIntoView({behavior:'smooth', block:'start'});
    }, 0);
  }

  function summarizePeriod(period){
    const org=period?.organes||{}; const dom=period?.domaines||{}; const foba=period?.foba||{};
    const totalOI=['dpsG1','dpsC1','dpsB1','dpsB2','dapY1','dapY2','dapY3','dapY4'].reduce((n,k)=>n+(Number(org[k])||0),0);
    const totalSpec=['pr','autoVl','autoPl'].reduce((n,k)=>n+(Number(dom[k])||0),0)+['foba1','foba2','foba3'].reduce((n,k)=>n+(Number(foba[k])||0),0);
    return `OI ${totalOI} • Spécialisations ${totalSpec}`;
  }
  function renderEffectifsLibrary(){
    const tbody=$('f7EffectifsLibraryBody'); if(!tbody) return;
    const periods=toArray(readJSON(KEYS.periods, []));
    const count=$('f7EffectifsLibraryCount'); if(count) count.textContent=`${periods.length} effectif${periods.length>1?'s':''}`;
    tbody.innerHTML='';
    if(!periods.length){ tbody.innerHTML='<tr><td colspan="7" class="muted">Aucun effectif enregistré.</td></tr>'; return; }
    periods.sort((a,b)=>String(b.dateEffective||'').localeCompare(String(a.dateEffective||''))).forEach(period=>{
      const tr=document.createElement('tr');
      const name=period?.suivi?.commentaire || period?.suivi?.updatedBy || `Effectif du ${fmtLocalDate(period.dateEffective)}`;
      tr.innerHTML=`<td><strong>${escapeHtml(name)}</strong></td><td>${escapeHtml(fmtLocalDate(period.dateEffective))}</td><td>${escapeHtml(fmtLocalDate(period.dateEnd))}</td><td>${escapeHtml(fmtLocalDate(period.createdAt))}</td><td>${escapeHtml(fmtLocalDate(period.updatedAt || period?.suivi?.updatedAt))}</td><td>${escapeHtml(summarizePeriod(period))}</td><td><div class="f7-row-actions"><button class="compact-btn" data-f7-preview-effectif="${escapeHtml(period.id)}" type="button">Aperçu</button><button class="compact-btn primary" data-f7-load-effectif="${escapeHtml(period.id)}" type="button">Charger</button><button class="compact-btn danger-btn" data-f7-delete-effectif="${escapeHtml(period.id)}" type="button">Supprimer</button></div></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('[data-f7-preview-effectif]').forEach(btn=>btn.addEventListener('click',()=>previewEffectif(btn.dataset.f7PreviewEffectif)));
    tbody.querySelectorAll('[data-f7-load-effectif]').forEach(btn=>btn.addEventListener('click',()=>loadEffectif(btn.dataset.f7LoadEffectif)));
    tbody.querySelectorAll('[data-f7-delete-effectif]').forEach(btn=>btn.addEventListener('click',()=>deleteEffectif(btn.dataset.f7DeleteEffectif)));
  }
  function findEffectif(id){ return toArray(readJSON(KEYS.periods, [])).find(p=>String(p.id)===String(id)); }
  function previewEffectif(id){
    const p=findEffectif(id); const box=$('f7EffectifsPreview'); if(!p||!box) return;
    box.hidden=false; box.className='f7-status-box ok';
    box.textContent=`Aperçu effectif\nNom : ${p?.suivi?.commentaire || '—'}\nDate : ${fmtLocalDate(p.dateEffective)}\nRésumé : ${summarizePeriod(p)}\n\nAucune donnée n’a été chargée dans le formulaire.`;
  }
  function loadEffectif(id){
    const p=findEffectif(id); if(!p) return;
    if(!confirm('Charger cet effectif dans le formulaire de référence ?\n\nCette action ne supprime aucun effectif enregistré, mais remplace la sélection active affichée.')) return;
    const select=$('referencePeriodSelect');
    if(select){ select.value=id; select.dispatchEvent(new Event('change', {bubbles:true})); }
    const box=$('f7EffectifsPreview'); if(box){ box.hidden=false; box.className='f7-status-box ok'; box.textContent='Effectif chargé dans le formulaire de référence.'; }
  }
  function deleteEffectif(id){
    const periods=toArray(readJSON(KEYS.periods, []));
    if(periods.length<=1){ alert('Suppression refusée : au moins un effectif de référence doit rester disponible.'); return; }
    if(!confirm('Supprimer définitivement cet effectif enregistré ?\n\nUne sauvegarde JSON est recommandée avant suppression.')) return;
    writeJSON(KEYS.periods, periods.filter(p=>String(p.id)!==String(id)));
    window.MonitoringAuditLog?.logAction('sensitive-delete-effectif', 'Suppression effectif de référence local.', {});
    renderEffectifsLibrary();
  }

  function storageSnapshot(){
    const keys=[KEYS.records,KEYS.imported,KEYS.refs,KEYS.periods,KEYS.objectives,KEYS.meta];
    const data={type:'MonitoringF7Backup', appVersion:APP_VERSION, exportedAt:nowIso(), localStorage:{}};
    keys.forEach(k=>data.localStorage[k]=readJSON(k,null));
    return data;
  }
  function downloadJSON(name, data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href);
  }
  async function restoreBackup(file){
    const maxBytes = 8 * 1024 * 1024;
    if(!file || file.size > maxBytes) throw new Error('Sauvegarde refusée : fichier absent ou supérieur à 8 Mo.');
    const parsed=JSON.parse(await file.text());
    if(!parsed || parsed.type!=='MonitoringF7Backup' || !parsed.localStorage || typeof parsed.localStorage !== 'object') throw new Error('Format de sauvegarde Monitoring F7 invalide.');
    const allowedKeys = new Set([KEYS.records,KEYS.imported,KEYS.refs,KEYS.periods,KEYS.objectives,KEYS.meta]);
    const incomingKeys = Object.keys(parsed.localStorage);
    if(incomingKeys.some(k=>!allowedKeys.has(k))) throw new Error('Sauvegarde refusée : clé de stockage non autorisée détectée.');
    if(!confirm('Restaurer cette sauvegarde complète ? Les données locales actuelles seront remplacées par le contenu de la sauvegarde.')) return;
    incomingKeys.forEach(k=>{ const v=parsed.localStorage[k]; if(v===null || typeof v==='undefined') localStorage.removeItem(k); else writeJSON(k,v); });
    window.MonitoringAuditLog?.logAction('rollback-import', 'Restauration sauvegarde complète locale effectuée.', { keys: incomingKeys.length });
    const st=$('f7BackupStatus'); if(st){ st.className='f7-status-box ok'; st.textContent='Sauvegarde restaurée. Recharge de la page recommandée.'; }
  }

  function renderAdminStats(){
    const el=$('f7AdminStats'); if(!el) return;
    const imported=toArray(readJSON(KEYS.imported, []));
    const records=toArray(readJSON(KEYS.records, []));
    const periods=toArray(readJSON(KEYS.periods, []));
    const meta=readJSON(KEYS.meta, {});
    const used=Object.keys(localStorage).reduce((n,k)=>n+String(localStorage.getItem(k)||'').length,0);
    el.innerHTML=[
      ['Version application', APP_VERSION],
      ['Schéma données', meta.dataSchemaVersion || DATA_SCHEMA_VERSION],
      ['Dernière migration', meta.lastMigrationAt ? new Date(meta.lastMigrationAt).toLocaleString('fr-CH') : '—'],
      ['Événements importés', imported.length],
      ['Formations stockées', records.length],
      ['Périodes effectifs', periods.length],
      ['Stockage local', `${Math.round(used/1024)} Ko`]
    ].map(([label,val])=>`<div class="f7-admin-stat"><strong>${escapeHtml(val)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  }
  async function unlockAdmin(){
    const code=$('f7AdminCode')?.value || '';
    const hash = await sha256Hex(code);
    let valid = false;
    if(window.MonitoringOnlineDataService?.isReady?.() && window.MonitoringApiClient?.verifyAdminCode){
      const res = await window.MonitoringApiClient.verifyAdminCode(hash);
      valid = res?.ok === true && res.data?.ok === true && res.data?.valid === true;
      if(!valid){
        const profile=readJSON(KEYS.admin, null);
        const expected=profile?.hash || TEMP_ADMIN_HASH;
        valid = hash === expected;
      }
    }else{
      const profile=readJSON(KEYS.admin, null);
      const expected=profile?.hash || TEMP_ADMIN_HASH;
      valid = hash === expected;
    }
    if(!valid){
      const msg=$('f7AdminMessage'); if(msg){ msg.className='f7-status-box error'; msg.textContent='Code Admin incorrect.'; }
      showOperationalMessage('Code Admin incorrect.', 'error');
      return;
    }
    $('f7AdminLocked').hidden=true; $('f7AdminContent').hidden=false; renderAdminStats();
    showOperationalMessage('Administration locale déverrouillée.', 'ok');
  }
  async function setAdminCode(){
    const profile=readJSON(KEYS.admin, null);
    const expected=profile?.hash || TEMP_ADMIN_HASH;
    const current=prompt('Code Admin actuel :');
    if(!current) return;
    const currentHash = await sha256Hex(current);
    const centralReady = window.MonitoringOnlineDataService?.isReady?.() && window.MonitoringApiClient?.updateAdminCode;
    if(!centralReady && currentHash !== expected){
      const msg=$('f7AdminMessage'); if(msg){ msg.className='f7-status-box error'; msg.textContent='Code Admin actuel incorrect. Modification refusée.'; }
      showOperationalMessage('Modification du code Admin refusée.', 'error');
      return;
    }
    const next=prompt('Nouveau code Admin central (minimum 6 caractères) :');
    if(!next) return;
    if(next.length<6){ alert('Code trop court. Minimum 6 caractères.'); return; }
    const nextHash = await sha256Hex(next);
    if(centralReady){
      const res = await window.MonitoringApiClient.updateAdminCode(currentHash, nextHash, { body:{ initializeIfMissing:true } });
      if(!res?.ok || res.data?.ok !== true){
        const msg=$('f7AdminMessage'); if(msg){ msg.className='f7-status-box error'; msg.textContent=res?.data?.error === 'current_admin_code_invalid' ? 'Code Admin actuel incorrect. Modification refusée.' : 'Modification serveur refusée.'; }
        showOperationalMessage('Modification du code Admin refusée.', 'error');
        return;
      }
    }
    writeJSON(KEYS.admin, {hash:nextHash, updatedAt:nowIso(), scope:centralReady ? 'server-cache' : 'local'});
    const msg=$('f7AdminMessage'); if(msg){ msg.className='f7-status-box ok'; msg.textContent=centralReady ? 'Code Admin central mis à jour.' : 'Code Admin local mis à jour.'; }
    showOperationalMessage(centralReady ? 'Code Admin central mis à jour.' : 'Code Admin local mis à jour.', 'ok');
  }

  function getAuthProfile(){ return window.MonitoringSessionManager?.getProfile?.() || {}; }
  function updateUserZone(){
    const auth=window.MonitoringAuth || {};
    const profile=getAuthProfile();
    const oidcUser=auth.mode === 'okta' && auth.isAuthenticated === true ? (auth.user || window.CurrentUser || {}) : null;
    const source=oidcUser || profile || {};
    const nip=source.nip || source.email || profile.nip || '—';
    const label=source.displayName || source.name || source.email || (nip !== '—' && !oidcUser ? `NIP ${nip}` : 'Utilisateur SDIS');
    const sessionForStatus = window.MonitoringSessionManager?.read?.() || window.MonitoringAuthService?.readSession?.() || readAuthSessionForUI?.();
    const sessionActive = !!(sessionForStatus && sessionForStatus.active === true);
    const isOidc = !!oidcUser || profile.authSource === 'okta-oidc' || sessionForStatus?.mode === 'institutional-oidc';
    const display=$('userDisplayName'); if(display) display.textContent=label;
    const status=$('userSessionStatus'); if(status) status.textContent=isOidc ? 'Connecté via Okta' : (sessionActive ? 'Session locale de secours' : 'Connexion institutionnelle requise');
    const name=$('userMenuName'); if(name) name.textContent=label;
    const nipEl=$('userMenuNip'); if(nipEl) nipEl.textContent=isOidc ? 'Okta/OIDC' : `NIP ${nip}`;
  }
  function readAuthSessionForUI(){
    return window.MonitoringSessionManager?.read?.() || null;
  }
  function formatSessionDate(value){
    if(!value) return '—';
    try{ return new Date(value).toLocaleString('fr-CH'); }catch{ return '—'; }
  }
  function ensureUserModal(){
    return window.MonitoringUserModal?.ensure?.() || document.getElementById('f7UserLocalModal');
  }
  function closeUserModal(){ if(window.MonitoringUserModal?.close) window.MonitoringUserModal.close(); else { const modal=document.getElementById('f7UserLocalModal'); if(modal) modal.style.display='none'; } }
  function openUserModal(title, html){
    if(window.MonitoringUserModal?.open) return window.MonitoringUserModal.open(title, html);
    const modal=ensureUserModal(); if(!modal) return null;
    const titleEl=modal.querySelector('#f7UserLocalModalTitle'); if(titleEl) titleEl.textContent=title;
    const body=modal.querySelector('#f7UserLocalModalBody'); if(body) body.innerHTML=html;
    modal.style.display='flex';
    return modal;
  }
  function showLocalProfilePanel(){
    const profile=window.MonitoringSessionManager?.getProfile?.() || window.MonitoringAuthService?.getProfile?.() || getAuthProfile();
    const session=window.MonitoringSessionManager?.read?.() || window.MonitoringAuthService?.readSession?.() || readAuthSessionForUI();
    const nip=profile.nip || session?.nip || '—';
    const displayName=profile.displayName || profile.name || 'Utilisateur SDIS';
    const authSource=profile.authSource || 'local';
    window.MonitoringAuditLog?.logAction('profile-local-open', 'Accès au profil local.', { mode:'local-browser-only' });
    openUserModal('Profil local Monitoring F7', `<div class="f7-user-summary"><strong>${escapeHtml(displayName)}</strong><br><span>NIP local : ${escapeHtml(nip)}</span></div><p>Ce profil sert uniquement à personnaliser l’interface sur ce navigateur. Il ne crée pas de compte serveur et ne synchronise pas l’utilisateur entre postes.</p><div class="f7-user-info-grid"><strong>Session</strong><span>${session?.active ? 'active' : 'non active'}</span><strong>Accès</strong><span>${escapeHtml(authSource)}</span><strong>Début session</strong><span>${escapeHtml(formatSessionDate(session?.startedAt))}</span><strong>Date référence</strong><span>${escapeHtml(session?.referenceDate || window.MONITORING_F7_SESSION_REFERENCE_DATE || '—')}</span><strong>Origine</strong><span>${escapeHtml(session?.source || (location.protocol==='file:'?'local-file':'served-origin'))}</span><strong>Version</strong><span>${escapeHtml(APP_VERSION)}</span></div><p class="f7-user-note">Une persistance centralisée multi-postes nécessitera une phase backend ultérieure avec authentification réelle.</p>`);
  }
  function showLocalSettingsPanel(){
    const profile=window.MonitoringSessionManager?.getProfile?.() || window.MonitoringAuthService?.getProfile?.() || getAuthProfile();
    const displayName=profile.displayName || profile.name || '';
    window.MonitoringAuditLog?.logAction('settings-local-open', 'Accès aux paramètres utilisateur locaux.', { mode:'local-browser-only' });
    openUserModal('Préférences locales', `<p>Ces préférences sont conservées uniquement dans ce navigateur. Elles ne créent pas de compte serveur.</p><label class="f7-user-field-label">Nom affiché dans l’interface</label><input id="f7LocalDisplayNameInput" type="text" value="${escapeHtml(displayName)}" placeholder="Utilisateur SDIS" class="f7-user-input"><div class="f7-user-actions"><button type="button" id="f7LocalSettingsCancel" class="f7-user-secondary-btn">Annuler</button><button type="button" id="f7LocalSettingsSave" class="f7-user-primary-btn">Enregistrer localement</button></div><p class="f7-user-note">Le NIP et le code d’accès local restent gérés par la configuration administrateur. Aucun backend réel n’est activé en ${escapeHtml(APP_VERSION)}.</p>`);
    setTimeout(()=>{
      document.getElementById('f7LocalSettingsCancel')?.addEventListener('click', closeUserModal);
      document.getElementById('f7LocalSettingsSave')?.addEventListener('click', ()=>{
        const value=(document.getElementById('f7LocalDisplayNameInput')?.value || '').trim();
        if(window.MonitoringSessionManager?.saveProfilePatch) window.MonitoringSessionManager.saveProfilePatch({ displayName:value });
        else window.MonitoringAuthService?.saveProfilePatch?.({ displayName:value });
        window.MonitoringAuditLog?.logAction('settings-local-save', 'Préférences locales enregistrées.', { fields:['displayName'] });
        updateUserZone();
        showOperationalMessage('Préférences locales enregistrées.', 'ok');
        closeUserModal();
      });
    },0);
  }
  function showSessionInformationPanel(){
    const session=window.MonitoringSessionManager?.read?.() || window.MonitoringAuthService?.readSession?.() || readAuthSessionForUI();
    const authStatus=window.MonitoringAuthService?.getStatus?.() || {};
    const backendStatus=window.MonitoringBackendConfig?.getStatus?.() || {};
    const profile=window.MonitoringSessionManager?.getProfile?.() || {};
    window.MonitoringAuditLog?.logAction('session-info-open', 'Information session consultée.', { mode: profile.authSource === 'okta-oidc' ? 'institutional-oidc' : 'local-browser-only' });
    openUserModal('Session Monitoring F7', `<div class="f7-user-info-grid"><strong>Mode</strong><span>${profile.authSource === 'okta-oidc' ? 'authentification institutionnelle Okta/OIDC' : 'secours local navigateur'}</span><strong>Auth serveur</strong><span>${profile.authSource === 'okta-oidc' ? 'active' : (backendStatus.serverAuthEnabled ? 'préparée' : 'désactivée')}</span><strong>Backend</strong><span>${backendStatus.backendEnabled ? 'activé' : 'désactivé'}</span><strong>Stockage</strong><span>${backendStatus.centralStorageEnabled ? 'PostgreSQL central online-first' : 'cache navigateur local'}</span><strong>Session active</strong><span>${session?.active ? 'oui' : 'non'}</span><strong>Début session</strong><span>${escapeHtml(formatSessionDate(session?.startedAt))}</span><strong>Date référence</strong><span>${escapeHtml(session?.referenceDate || window.MONITORING_F7_SESSION_REFERENCE_DATE || '—')}</span><strong>Version</strong><span>${escapeHtml(APP_VERSION)}</span></div><p class="f7-user-note">${escapeHtml(authStatus.message || 'Authentification institutionnelle prioritaire.')}</p>`);
  }
  async function refreshOnlineDataAfterAuth(){
    if(!window.MonitoringOnlineDataService?.hydrate) return;
    try{
      if(sessionStorage.getItem('monitoring_f7_online_hydrated_v1') === '1') return;
      sessionStorage.setItem('monitoring_f7_online_hydrated_v1', '1');
    }catch{}
    const result = await window.MonitoringOnlineDataService.hydrate();
    if(result?.hydrated?.length){
      showOperationalMessage('Données serveur synchronisées.', 'ok');
      setTimeout(() => location.reload(), 250);
    }
  }
  function bindUserMenu(){
    const btn=$('userMenuButton'); const menu=$('userMenu');
    if(btn && menu){
      btn.addEventListener('click', ()=>{ const hidden=menu.hidden; menu.hidden=!hidden; btn.setAttribute('aria-expanded', String(hidden)); });
      document.addEventListener('click', e=>{ if(!btn.contains(e.target) && !menu.contains(e.target)){ menu.hidden=true; btn.setAttribute('aria-expanded','false'); } });
    }
    $('userLogoutBtn')?.addEventListener('click', ()=>{ if(confirm('Déconnecter la session Monitoring F7 ?')){ showOperationalMessage('Déconnexion en cours.', 'info'); window.MonitoringAuthService?.logout?.(); } });
    document.querySelectorAll('[data-user-action]').forEach(item=>item.addEventListener('click', (event)=>{
      event.preventDefault();
      event.stopPropagation();
      const action=item.dataset.userAction;
      if(menu){ menu.hidden=true; btn?.setAttribute('aria-expanded','false'); }
      if(action==='backup'){ showOperationalMessage('Export rapide de la sauvegarde locale.', 'info'); $('f7FullBackupBtn')?.click(); return; }
      if(action==='session'){ showSessionInformationPanel(); return; }
      if(action==='profile'){ showLocalProfilePanel(); return; }
      if(action==='settings'){ showLocalSettingsPanel(); return; }
    }));
    updateUserZone();
  }



  function renderDiagnosticLocal(){
    const logApi = window.MonitoringAuditLog;
    const statsEl = $('f7DiagnosticStats');
    const body = $('f7DiagnosticLogBody');
    if(!logApi || !statsEl || !body) return;
    const diagnostics = logApi.getLogDiagnostics();
    const logs = logApi.getLogs().slice(-80).reverse();
    const backendStatus = window.MonitoringApiClient?.getBackendStatus ? window.MonitoringApiClient.getBackendStatus() : { backendEnabled:false, storageMode:'local', authMode:'local', syncEnabled:false };
    const syncStatus = window.MonitoringSyncService?.getStatus ? window.MonitoringSyncService.getStatus() : { status:'inactive', lastSyncAttemptAt:null };
    const serverStatus = window.MonitoringSyncService?.getServerStatus ? window.MonitoringSyncService.getServerStatus() : null;
    const contractStatus = window.MonitoringBackendContractCheck?.run ? window.MonitoringBackendContractCheck.run() : null;
    statsEl.innerHTML = [
      ['Version application', diagnostics.appVersion || APP_VERSION],
      ['Journal local navigateur', `${diagnostics.logEntries}/${diagnostics.maxEntries}`],
      ['IndexedDB navigateur', diagnostics.indexedDBAvailable ? 'Disponible' : 'Indisponible'],
      ['localStorage navigateur', diagnostics.localStorageAvailable ? 'Disponible' : 'Indisponible'],
      ['Cache local navigateur', `${diagnostics.storageApproxKo || 0} Ko`],
      ['Migration cache local', diagnostics.lastMigrationAt ? fmtLocalDate(diagnostics.lastMigrationAt) : '—'],
      ['Mode backend', backendStatus.backendEnabled ? 'Actif' : 'Désactivé'],
      ['Mode stockage', backendStatus.storageMode || 'local'],
      ['Stockage central', backendStatus.centralStorageEnabled ? 'Actif' : 'Inactif'],
      ['Mode auth', backendStatus.authMode || 'local'],
      ['Auth serveur', backendStatus.serverAuthEnabled ? 'Contrat actif' : 'Inactif par défaut'],
      ['Schéma données', window.MonitoringDataSchema ? `v${window.MonitoringDataSchema.schemaVersion}` : 'Non chargé'],
      ['Contrats API', contractStatus ? `${contractStatus.contractCount} vérifiés` : (window.MonitoringApiContracts ? 'Documentés' : 'Non chargés')],
      ['Mock backend', backendStatus.mockBackendEnabled ? 'Actif' : 'Désactivé'],
      ['Synchronisation', syncStatus.syncEnabled ? 'Active' : 'Inactive'],
      ['Prérequis sync', syncStatus.readiness?.ready ? 'Réunis' : 'Incomplets'],
      ['File sync', `${syncStatus.queueLength || 0} opération${(syncStatus.queueLength || 0)>1?'s':''}`],
      ['Dernière sync locale', syncStatus.lastSyncAttemptAt ? fmtLocalDate(syncStatus.lastSyncAttemptAt) : 'Aucune'],
      ['Serveur partagé records', serverStatus?.collections ? String(serverStatus.collections.records || 0) : 'Non testé'],
      ['Serveur partagé événements', serverStatus?.collections ? String(serverStatus.collections.importedEvents || 0) : 'Non testé'],
      ['Serveur partagé effectifs', serverStatus?.collections ? String(serverStatus.collections.referencePeriods || 0) : 'Non testé']
    ].map(([label,val])=>`<div class="f7-admin-stat"><strong>${escapeHtml(val)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
    if(!logs.length){ body.innerHTML='<tr><td colspan="4" class="muted">Aucun événement journalisé.</td></tr>'; return; }
    body.innerHTML = logs.map(entry => `<tr><td>${escapeHtml(fmtLocalDate(entry.at))}</td><td><strong>${escapeHtml(entry.level || 'info')}</strong></td><td>${escapeHtml(entry.eventType || '—')}</td><td>${escapeHtml(entry.message || '')}</td></tr>`).join('');
  }

  function bindDiagnosticEvents(){
    $('f7RefreshLogsBtn')?.addEventListener('click', renderDiagnosticLocal);
    $('f7CheckBackendContractsBtn')?.addEventListener('click', ()=>{
      const result = window.MonitoringBackendContractCheck?.run ? window.MonitoringBackendContractCheck.run() : null;
      const box = $('f7BackendContractStatus');
      if(!result){
        if(box) box.textContent = 'Vérificateur contrats backend non chargé.';
        showOperationalMessage('Vérificateur contrats backend non chargé.', 'error');
        return;
      }
      const message = window.MonitoringBackendContractCheck.format(result);
      if(box) box.textContent = message;
      window.MonitoringAuditLog?.logInfo('backend-contract-check', 'Vérification locale des contrats backend exécutée.', result);
      showOperationalMessage(result.ok ? 'Contrats backend vérifiés localement : OK.' : 'Contrats backend vérifiés avec points à corriger.', result.ok ? 'ok' : 'warn');
      renderDiagnosticLocal();
    });
    $('f7CheckSyncReadinessBtn')?.addEventListener('click', async()=>{
      const result = window.MonitoringSyncService?.syncNow ? await window.MonitoringSyncService.syncNow() : null;
      const box = $('f7SyncReadinessStatus');
      if(!result){
        if(box) box.textContent = 'Service de synchronisation non chargé.';
        showOperationalMessage('Service de synchronisation non chargé.', 'error');
        return;
      }
      const missing = result.readiness?.missing || [];
      const message = result.readiness?.ready
        ? `${result.message} File locale : ${result.queueLength || 0} opération.`
        : `${result.message} File locale : ${result.queueLength || 0} opération.`;
      if(box) box.textContent = message;
      window.MonitoringAuditLog?.logInfo('sync-readiness-check', 'Contrôle local des prérequis de synchronisation exécuté.', result);
      showOperationalMessage(missing.length ? 'Synchronisation non prête : prérequis manquants.' : 'Synchronisation serveur exécutée.', missing.length ? 'warn' : 'ok');
      renderDiagnosticLocal();
    });
    $('f7ExportLogsBtn')?.addEventListener('click', ()=>{ window.MonitoringAuditLog?.exportLogs(); renderDiagnosticLocal(); });
    $('f7ClearLogsBtn')?.addEventListener('click', ()=>{
      if(!confirm('Vider le journal local de diagnostic ?\n\nCette action ne supprime pas les données métier Monitoring F7.')) return;
      window.MonitoringAuditLog?.clearLogs();
      renderDiagnosticLocal();
    });
    document.addEventListener('monitoring-f7-audit-log-updated', ()=>{
      if(document.querySelector('[data-management-pane="diagnostic"]')?.classList.contains('active')) renderDiagnosticLocal();
    });
  }

  function bindEvolutionEvents(){
    $('f7PreviewImportBtn')?.addEventListener('click', async()=>{
      const file=$('f7ImportFile')?.files?.[0];
      const summary=$('f7ImportSummary');
      if(!file){ if(summary){summary.className='f7-status-box error';summary.textContent='Sélectionne d’abord un fichier CSV ou JSON.';} return; }
      try{ renderPreview(await parseImportFile(file)); }
      catch(err){ window.MonitoringAuditLog?.logError('import-error', 'Prévisualisation import locale impossible.', { error:err }); const message=formatOperationalError('Import impossible.', err); if(summary){summary.className='f7-status-box error';summary.textContent=message;} showOperationalMessage(message, 'error'); }
    });
    $('f7CommitImportBtn')?.addEventListener('click', commitPreview);
    $('f7FullBackupBtn')?.addEventListener('click', ()=>{ window.MonitoringAuditLog?.logAction('export-json', 'Sauvegarde complète locale exportée.', {}); downloadJSON(`monitoring-f7-sauvegarde-complete-${new Date().toISOString().slice(0,10)}.json`, storageSnapshot()); });
    $('f7RestoreFile')?.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(f) try{ await restoreBackup(f); showOperationalMessage('Sauvegarde restaurée. Recharge conseillée.', 'ok'); }catch(err){ window.MonitoringAuditLog?.logError('rollback-import-error', 'Restauration sauvegarde complète impossible.', { error:err }); const message=formatOperationalError('Restauration impossible.', err); const st=$('f7BackupStatus'); if(st){ st.className='f7-status-box error'; st.textContent=message; } showOperationalMessage(message, 'error'); } });
    $('f7AdminUnlockBtn')?.addEventListener('click', unlockAdmin);
    $('f7AdminSetCodeBtn')?.addEventListener('click', setAdminCode);
    document.querySelectorAll('[data-management-target]').forEach(btn=>btn.addEventListener('click',()=>{
      const target=btn.dataset.managementTarget;
      document.querySelectorAll('[data-management-target]').forEach(b=>b.classList.toggle('active', b===btn));
      document.querySelectorAll('[data-management-pane]').forEach(pane=>pane.classList.toggle('active', pane.dataset.managementPane===target));
      if(target==='effectifs') renderEffectifsLibrary();
      if(target==='diagnostic') renderDiagnosticLocal();
      const label=btn.textContent?.trim() || 'Gestion';
      showOperationalMessage(`Section ${label} ouverte.`, 'info');
    }));
    document.querySelectorAll('.tab-btn[data-tab-target="events"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderEventManagementTable, 0)));
    document.querySelectorAll('.tab-btn[data-tab-target="effectifs"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderEffectifsLibrary, 0)));
    document.addEventListener('monitoring-f7-auth-session-changed', updateUserZone);
    document.addEventListener('monitoring-f7-auth-session-changed', refreshOnlineDataAfterAuth, { once:true });
    $('recordsSummaryViewBtn')?.addEventListener('click', ()=>setRecordsDensity('summary'));
    $('recordsFullViewBtn')?.addEventListener('click', ()=>setRecordsDensity('full'));
    $('f7ProjectionToggle')?.addEventListener('click', toggleProjectionMode);
    document.addEventListener('monitoring-f7-auth-session-changed', ()=>{ const p=window.MonitoringSessionManager?.getProfile?.() || {}; showOperationalMessage(p.authSource === 'okta-oidc' ? 'Connexion Okta active. Profil utilisateur mis à jour.' : 'Session locale de secours active. Profil utilisateur mis à jour.', 'ok'); });
  }

  window.addEventListener('load', ()=>{
    migrateMeta();
    moveExistingUi();
    bindEvolutionEvents();
    renderEventManagementTable();
    updateProjectionStrip();
    observeProjectionData();
    renderEffectifsLibrary();
    bindUserMenu();
    bindDiagnosticEvents();
    renderAdminStats();
    renderDiagnosticLocal();
    try{ setRecordsDensity(localStorage.getItem('monitoring_f7_records_density_v65_4') || localStorage.getItem('monitoring_f7_records_density_v65_3') || localStorage.getItem('monitoring_f7_records_density_v65_2') || localStorage.getItem('monitoring_f7_records_density_v65') || localStorage.getItem('monitoring_f7_records_density_v64') || localStorage.getItem('monitoring_f7_records_density_v62') || localStorage.getItem('monitoring_f7_records_density_v61') || localStorage.getItem('monitoring_f7_records_density_v60') || localStorage.getItem('monitoring_f7_records_density_v59') || 'summary', true); }catch{ setRecordsDensity('summary', true); }
  });
})();
