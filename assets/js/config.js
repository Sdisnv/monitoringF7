/* Configuration externe future. La logique historique reste chargée par app.js. */
window.MonitoringConfig = Object.freeze({
  appName: 'Monitoring F7',
  version: 'v65.5.2',
  localAuth: Object.freeze({
    mode: 'local-browser-only',
    notice: 'Authentification institutionnelle Okta/OIDC prioritaire. Secours local technique uniquement.',
    requireKnownNip: false,
    sharedAccessEnabled: true,
    sharedAccessPasswordHashHex: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    users: Object.freeze([])
  })
});

window.MonitoringBackendConfigOverrides = Object.freeze({
  backendEnabled: true,
  apiBaseUrl: '',
  syncEnabled: false,
  authMode: 'backend',
  storageMode: 'backend',
  centralStorageEnabled: true,
  auditMode: 'local',
  serverAuthEnabled: true,
  oidcEnabled: true,
  storageDriver: 'postgres',
  contractCheckEnabled: true,
  tokenStorage: 'memory',
  requiredRole: 'sdis-user'
});

(function(){
  'use strict';

  function localTodayIso(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const sessionReferenceDateIso = localTodayIso();
  window.MONITORING_F7_SESSION_REFERENCE_DATE = sessionReferenceDateIso;

  function normalizeEventDate(value){
    const raw = String(value || '').trim();
    if(!raw) return '';
    if(/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const match = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/);
    if(match){
      let [, dd, mm, yy] = match;
      if(yy.length === 2) yy = `20${yy}`;
      return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }

  function isEventClosed(row){
    const status = String(row?.status || row?.statutTraitement || '').trim().toLowerCase();
    const closedStatuses = ['traité', 'traite', 'effectué', 'effectue', 'clôturé', 'cloture', 'annulé', 'annule', 'ignoré / non comptabilisé', 'ignore / non comptabilise'];
    return row?.aComptabiliser === true || closedStatuses.includes(status);
  }

  function isEventToProcess(row){
    const iso = normalizeEventDate(row?.dateExercice || row?.dateEvenement || row?.date || '');
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso <= sessionReferenceDateIso && !isEventClosed(row);
  }

  window.MonitoringEventRules = Object.freeze({
    sessionReferenceDateIso,
    localTodayIso,
    normalizeEventDate,
    isEventClosed,
    isEventToProcess
  });
})();
