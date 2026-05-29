   (function(){
    'use strict';
  
    const APP_VERSION = 'v61';
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
    
    // Get admin hash from window.ENV (set by env.js) - NO HARDCODED VALUE
    const TEMP_ADMIN_HASH = (window.ENV && window.ENV.temporaryPasswordHashHex) || null;
    
    // Validate that the hash exists - prevent silent failures
    if (!TEMP_ADMIN_HASH && typeof console !== 'undefined') {
      console.error('[Monitoring] Missing temporaryPasswordHashHex in window.ENV. Admin code will not work. Please check env.js configuration.');
    }
    
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
        storageMode: 'localStorage/offline-first',
        destructiveImportsDefault: false
      };
      writeJSON(KEYS.meta, next);
      if(meta.dataSchemaVersion !== DATA_SCHEMA_VERSION) window.MonitoringAuditLog?.logAction('storage-migration', 'Métadonnées stockage v61 contrôlées.', { dataSchemaVersion: DATA_SCHEMA_VERSION });
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
      try{ localStorage.setItem('monitoring_f7_records_density_v61', summary ? 'summary' : 'full'); }catch{}
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
      const profile=readJSON(KEYS.admin, null);
      
      // Check if admin hash is configured
      if (!TEMP_ADMIN_HASH) {
        const msg=$('f7AdminMessage'); 
        if(msg){ 
          msg.className='f7-status-box error'; 
          msg.textContent='Erreur de configuration: code Admin non défini. Contactez l\'administrateur.'; 
        }
        window.MonitoringAuditLog?.logError('admin-config-error', 'Missing temporaryPasswordHashHex in ENV for admin unlock', {});
        return;
      }
      
      const expected=profile?.hash || TEMP_ADMIN_HASH;
      const hash = await sha256Hex(code);
      
      if(hash !== expected){
        const msg=$('f7AdminMessage'); 
        if(msg){ 
          msg.className='f7-status-box error'; 
          msg.textContent='Code Admin incorrect.'; 
        }
        return;
      }
      $('f7AdminLocked').hidden=true; 
      $('f7AdminContent').hidden=false; 
      renderAdminStats();
    }
    
    async function setAdminCode(){
      const current=prompt('Nouveau code Admin local (minimum 6 caractères recommandé) :');
      if(!current) return;
      if(current.length<4){ alert('Code trop court.'); return; }
      writeJSON(KEYS.admin, {hash:await sha256Hex(current), updatedAt:nowIso()});
      const msg=$('f7AdminMessage'); if(msg){ msg.className='f7-status-box ok'; msg.textContent='Code Admin local mis à jour.'; }
    }
  
    function getAuthProfile(){ return readJSON('monitoring_sdis_auth_profile_v1', null) || {}; }
    function updateUserZone(){
      const profile=getAuthProfile();
      const nip=profile.nip || '—';
      const label=profile.displayName || profile.name || (nip !== '—' ? `NIP ${nip}` : 'Utilisateur SDIS');
      const sessionForStatus = window.MonitoringAuthService?.readSession?.() || readAuthSessionForUI?.();
      const sessionActive = !!(sessionForStatus && sessionForStatus.active === true);
      const display=$('userDisplayName'); if(display) display.textContent=label;
      const status=$('userSessionStatus'); if(status) status.textContent=sessionActive ? 'Session locale active — navigateur uniquement' : 'Connexion locale requise';
      const name=$('userMenuName'); if(name) name.textContent=label;
      const nipEl=$('userMenuNip'); if(nipEl) nipEl.textContent=`NIP ${nip}`;
    }
    function readAuthSessionForUI(){
      const parse=raw=>{ if(!raw) return null; if(raw==='1'||raw==='true') return {active:true, legacy:true}; try{ const parsed=JSON.parse(raw); return parsed && typeof parsed==='object' ? parsed : null; }catch{ return null; } };
      return parse(sessionStorage.getItem('monitoring_sdis_auth_session_v1')) || parse(localStorage.getItem('monitoring_sdis_auth_session_backup_v1'));
    }
    function formatSessionDate(value){
      if(!value) return '—';
      try{ return new Date(value).toLocaleString('fr-CH'); }catch{ return '—'; }
    }
    function ensureUserModal(){
      let modal=document.getElementById('f7UserLocalModal');
      if(modal) return modal;
      modal=document.createElement('div');
      modal.id='f7UserLocalModal';
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-modal','true');
      modal.style.cssText='position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.42);padding:18px;';
      modal.innerHTML='<div style="width:min(560px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 80px rgba(15,23,42,.35);border:1px solid rgba(15,23,42,.12);"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid rgba(15,23,42,.08);"><h3 id="f7UserLocalModalTitle" style="margin:0;font-size:18px;color:#111827;">Profil local Monitoring F7</h3><button type="button" id="f7UserLocalModalClose" style="border:0;background:#f3f4f6;border-radius:999px;padding:8px 11px;cursor:pointer;">✕</button></div><div id="f7UserLocalModalBody" style="padding:18px 20px;color:#1f2937;font-size:14px;line-height:1.55;"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', e=>{ if(e.target===modal) closeUserModal(); });
      modal.querySelector('#f7UserLocalModalClose')?.addEventListener('click', closeUserModal);
      return modal;
    }
    function closeUserModal(){ const modal=document.getElementById('f7UserLocalModal'); if(modal) modal.style.display='none'; }
    function openUserModal(title, html){
      const modal=ensureUserModal();
      const titleEl=modal.querySelector('#f7UserLocalModalTitle'); if(titleEl) titleEl.textContent=title;
      const body=modal.querySelector('#f7UserLocalModalBody'); if(body) body.innerHTML=html;
      modal.style.display='flex';
    }
    function showLocalProfilePanel(){
      const profile=window.MonitoringAuthService?.getProfile?.() || getAuthProfile();
      const session=window.MonitoringAuthService?.readSession?.() || readAuthSessionForUI();
      const nip=profile.nip || session?.nip || '—';
      const displayName=profile.displayName || profile.name || 'Utilisateur SDIS';
      window.MonitoringAuditLog?.logAction('profile-local-open', 'Accès au profil local.', { mode:'local-browser-only' });
      openUserModal('Profil local Monitoring F7', `<div style="background:#f8fafc;border:1px solid rgba(15,23,42,.08);border-radius:12px;padding:14px;margin-bottom:14px;"><strong>${escapeHtml(displayName)}</strong><br><span style="color:#64748b;">NIP local : ${escapeHtml(nip)}</span></div><p>Ce profil est enregistré uniquement dans ce navigateur. Le NIP protège l’accès local à l’interface, mais ne constitue pas une authentification institutionnelle serveur. Les données restent stockées localement via localStorage / IndexedDB.</p><div style="display:grid;grid-template-columns:150px 1fr;gap:8px 12px;margin-top:14px;"><strong>Session</strong><span>${session?.active ? 'active' : 'non active'}</span><strong>Début session</strong><span>${escapeHtml(formatSessionDate(session?.startedAt))}</span><strong>Date référence</strong><span>${escapeHtml(session?.referenceDate || window.MONITORING_F7_SESSION_REFERENCE_DATE || '—')}</span><strong>Origine</strong><span>${escapeHtml(session?.source || (location.protocol==='file:'?'local-file':'served-origin'))}</span><strong>Version</strong><span>${escapeHtml(APP_VERSION)}</span></div><p style="margin-top:14px;color:#64748b;font-size:13px;">Une persistance centralisée multi-postes nécessitera une phase backend ultérieure avec authentification réelle.</p>`);
    }
    function showLocalSettingsPanel(){
      const profile=window.MonitoringAuthService?.getProfile?.() || getAuthProfile();
      const displayName=profile.displayName || profile.name || '';
      window.MonitoringAuditLog?.logAction('settings-local-open', 'Accès aux paramètres utilisateur locaux.', { mode:'local-browser-only' });
      openUserModal('Paramètres utilisateur locaux', `<p>Ces paramètres sont conservés uniquement dans ce navigateur. Ils ne sont pas synchronisés entre postes et ne remplacent pas un compte serveur.</p><label style="display:block;font-weight:700;margin-top:12px;margin-bottom:6px;">Nom affiché dans l’interface</label><input id="f7LocalDisplayNameInput" type="text" value="${escapeHtml(displayName)}" placeholder="Utilisateur SDIS" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font-size:14px;"><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;"><button type="button" id="f7LocalSettingsCancel" style="border:1px solid #cbd5e1;background:#fff;border-radius:10px;padding:9px 12px;cursor:pointer;">Annuler</button><button type="button" id="f7LocalSettingsSave" style="border:0;background:#b91c1c;color:#fff;border-radius:10px;padding:9px 12px;cursor:pointer;font-weight:700;">Enregistrer localement</button></div><p style="margin-top:14px;color:#64748b;font-size:13px;">Le NIP et le mot de passe local restent gérés par la barrière d’accès locale. Aucun backend réel n’est activé en ${escapeHtml(APP_VERSION)}.</p>`);
      setTimeout(()=>{
        document.getElementById('f7LocalSettingsCancel')?.addEventListener('click', closeUserModal);
        document.getElementById('f7LocalSettingsSave')?.addEventListener('click', ()=>{
          const value=(document.getElementById('f7LocalDisplayNameInput')?.value || '').trim();
          window.MonitoringAuthService?.saveProfilePatch?.({ displayName:value });
          window.MonitoringAuditLog?.logAction('settings-local-save', 'Paramètres utilisateur locaux enregistrés.', { fields:['displayName'] });
          updateUserZone();
          closeUserModal();
        });
      },0);
    }
    function showSessionInformationPanel(){
      const session=window.MonitoringAuthService?.readSession?.() || readAuthSessionForUI();
      window.MonitoringAuditLog?.logAction('session-info-open', 'Information session locale consultée.', { mode:'local-browser-only' });
      openUserModal('Information session Monitoring F7', `<div style="display:grid;grid-template-columns:150px 1fr;gap:8px 12px;"><strong>Mode</strong><span>offline-first / navigateur local uniquement</span><strong>Sécurité</strong><span>barrière UX locale, pas une authentification institutionnelle serveur</span><strong>Stockage</strong><span>localStorage / IndexedDB conservés</span><strong>Session active</strong><span>${session?.active ? 'oui' : 'non'}</span><strong>Début session</strong><span>${escapeHtml(formatSessionDate(session?.startedAt))}</span><strong>Date référence</strong><span>${escapeHtml(session?.referenceDate || window.MONITORING_F7_SESSION_REFERENCE_DATE || '—')}</span><strong>Version</strong><span>${escapeHtml(APP_VERSION)}</span></div><p style="margin-top:14px;">Cette version est adaptée à un pilote local/offline-first. Une persistance centralisée nécessitera une phase backend ultérieure.</p>`);
    }
    function bindUserMenu(){
      const btn=$('userMenuButton'); const menu=$('userMenu');
      if(btn && menu){
        btn.addEventListener('click', ()=>{ const hidden=menu.hidden; menu.hidden=!hidden; btn.setAttribute('aria-expanded', String(hidden)); });
        document.addEventListener('click', e=>{ if(!btn.contains(e.target) && !menu.contains(e.target)){ menu.hidden=true; btn.setAttribute('aria-expanded','false'); } });
      }
      $('userLogoutBtn')?.addEventListener('click', ()=>{ if(confirm('Déconnecter la session locale Monitoring F7 ?')){ window.MonitoringAuditLog?.logAction('logout-local', 'Déconnexion locale depuis le menu utilisateur.', {}); sessionStorage.removeItem('monitoring_sdis_auth_session_v1'); sessionStorage.removeItem('monitoring_f7_admin_lock_v1'); try{ localStorage.removeItem('monitoring_sdis_auth_session_backup_v1'); }catch{} location.reload(); } });
      document.querySelectorAll('[data-user-action]').forEach(item=>item.addEventListener('click', (event)=>{
        event.preventDefault();
        event.stopPropagation();
        const action=item.dataset.userAction;
        if(menu){ menu.hidden=true; btn?.setAttribute('aria-expanded','false'); }
        if(action==='backup'){ $('f7FullBackupBtn')?.click(); return; }
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
      statsEl.innerHTML = [
        ['Version application', diagnostics.appVersion || APP_VERSION],
        ['Entrées journal', `${diagnostics.logEntries}/${diagnostics.maxEntries}`],
        ['IndexedDB', diagnostics.indexedDBAvailable ? 'Disponible' : 'Indisponible'],
        ['localStorage', diagnostics.localStorageAvailable ? 'Disponible' : 'Indisponible'],
        ['Stockage approx.', `${diagnostics.storageApproxKo || 0} Ko`],
        ['Dernière migration', diagnostics.lastMigrationAt ? fmtLocalDate(diagnostics.lastMigrationAt) : '—'],
        ['Mode backend', backendStatus.backendEnabled ? 'Préparé' : 'Désactivé'],
        ['Mode stockage', backendStatus.storageMode || 'local'],
        ['Mode auth', backendStatus.authMode || 'local'],
        ['Auth serveur', backendStatus.serverAuthEnabled ? 'Contrat actif' : 'Inactif par défaut'],
        ['Schéma données', window.MonitoringDataSchema ? `v${window.MonitoringDataSchema.schemaVersion}` : 'Non chargé'],
        ['Contrats API', window.MonitoringApiContracts ? 'Documentés' : 'Non chargés'],
        ['Synchronisation', syncStatus.syncEnabled ? 'Préparée' : 'Inactive'],
        ['Dernière tentative sync', syncStatus.lastSyncAttemptAt ? fmtLocalDate(syncStatus.lastSyncAttemptAt) : 'Aucune']
      ].map(([label,val])=>`<div class="f7-admin-stat"><strong>${escapeHtml(val)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
      if(!logs.length){ body.innerHTML='<tr><td colspan="4" class="muted">Aucun événement journalisé.</td></tr>'; return; }
      body.innerHTML = logs.map(entry => `<tr><td>${escapeHtml(fmtLocalDate(entry.at))}</td><td><strong>${escapeHtml(entry.level || 'info')}</strong></td><td>${escapeHtml(entry.eventType || '—')}</td><td>${escapeHtml(entry.message || '')}</td></tr>`).join('');
    }
  
    function bindDiagnosticEvents(){
      $('f7RefreshLogsBtn')?.addEventListener('click', renderDiagnosticLocal);
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
        catch(err){ window.MonitoringAuditLog?.logError('import-error', 'Prévisualisation import locale impossible.', { error:err }); if(summary){summary.className='f7-status-box error';summary.textContent=`Import impossible : ${err.message}`;} }
      });
      $('f7CommitImportBtn')?.addEventListener('click', commitPreview);
      $('f7FullBackupBtn')?.addEventListener('click', ()=>{ window.MonitoringAuditLog?.logAction('export-json', 'Sauvegarde complète locale exportée.', {}); downloadJSON(`monitoring-f7-sauvegarde-complete-${new Date().toISOString().slice(0,10)}.json`, storageSnapshot()); });
      $('f7RestoreFile')?.addEventListener('change', async e=>{ const f=e.target.files?.[0]; if(f) try{ await restoreBackup(f); }catch(err){ window.MonitoringAuditLog?.logError('rollback-import-error', 'Restauration sauvegarde complète impossible.', { error:err }); const st=$('f7BackupStatus'); if(st){ st.className='f7-status-box error'; st.textContent=err.message; } } });
      $('f7AdminUnlockBtn')?.addEventListener('click', unlockAdmin);
      $('f7AdminSetCodeBtn')?.addEventListener('click', setAdminCode);
      document.querySelectorAll('[data-management-target]').forEach(btn=>btn.addEventListener('click',()=>{
        const target=btn.dataset.managementTarget;
        document.querySelectorAll('[data-management-target]').forEach(b=>b.classList.toggle('active', b===btn));
        document.querySelectorAll('[data-management-pane]').forEach(pane=>pane.classList.toggle('active', pane.dataset.managementPane===target));
        if(target==='effectifs') renderEffectifsLibrary();
        if(target==='diagnostic') renderDiagnosticLocal();
      }));
      document.querySelectorAll('.tab-btn[data-tab-target="events"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderEventManagementTable, 0)));
      document.querySelectorAll('.tab-btn[data-tab-target="effectifs"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(renderEffectifsLibrary, 0)));
      document.addEventListener('monitoring-f7-auth-session-changed', updateUserZone);
      $('recordsSummaryViewBtn')?.addEventListener('click', ()=>setRecordsDensity('summary'));
      $('recordsFullViewBtn')?.addEventListener('click', ()=>setRecordsDensity('full'));
      $('f7ProjectionToggle')?.addEventListener('click', toggleProjectionMode);
      document.addEventListener('monitoring-f7-auth-session-changed', ()=>showOperationalMessage('Session locale active. Profil utilisateur mis à jour.', 'ok'));
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
      try{ setRecordsDensity(localStorage.getItem('monitoring_f7_records_density_v61') || localStorage.getItem('monitoring_f7_records_density_v60') || localStorage.getItem('monitoring_f7_records_density_v59') || 'summary', true); }catch{ setRecordsDensity('summary', true); }
    });
  })();