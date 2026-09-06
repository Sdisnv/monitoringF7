/* SCOPE-IMPL-1B — écrans P0 nominatifs. SCOPE-DATA-5 — import CSV. */
(function () {
  'use strict';
  const L = window.ScopeUiLogic;
  const root = document.getElementById('scope-root');
  if (!root || !L) return;

  const LEGACY_LIVE_KEY = 'scope-live-confirmed';
  const QUAL_KEY = 'scope-include-qualification';
  const SCOPE_SEARCH_MIN_CHARS = 3;
  const SCOPE_SEARCH_DEBOUNCE_MS = 280;

  function readIncludeQualification() {
    try { return sessionStorage.getItem(QUAL_KEY) === '1'; } catch (_error) { return false; }
  }

  function persistIncludeQualification(value) {
    try { sessionStorage.setItem(QUAL_KEY, value ? '1' : '0'); } catch (_error) { /* ignore */ }
  }

  function resolveMode() {
    L.resolveClientMode({ search: location.search });
    return {
      client: window.ScopeApi && typeof window.ScopeApi.createHttpClient === 'function'
        ? window.ScopeApi.createHttpClient({ onUnauthorized: handleUnauthorized })
        : { sessionMe: async () => { throw Object.assign(new Error('Authentification indisponible.'), { status: 401, error: 'unauthorized' }); } }
    };
  }

  const resolved = resolveMode();
  let client = resolved.client;

  const state = {
    year: L.currentYear('2026-08-19'),
    preset: 'YEAR',
    month: '8',
    quarter: '3',
    semester: '2',
    from: '2026-01-01',
    to: '2026-12-31',
    statut: 'tous',
    domaine: 'tous',
    referentiels: { domaines: [], cibles: [] },
    list: [],
    cycles: [],
    cyclesReady: false,
    cyclesError: null,
    cycleDetail: null,
    cycleDetailReady: false,
    cycleDetailError: null,
    navigationSeq: 0,
    currentRoute: null,
    currentRouteKey: '',
    listRequestSeq: 0,
    cyclesRequestSeq: 0,
    cycleDetailRequestSeq: 0,
    cycleFilter: { domaine: 'tous', statut: 'tous' },
    fiche: null,
    ficheReady: false,
    activeFicheId: null,
    ficheRequestSeq: 0,
    preview: null,
    pendingRetraits: [],
    pendingExceptions: [],
    saisie: [],
    cibleFilter: 'tous',
    saisieOpenFilter: false,
    encadrementOpen: false,
    toast: null,
    feedback: null,
    feedbackAction: null,
    feedbackTimer: null,
    loading: false,
    listReady: false,
    listError: null,
    personnelReady: false,
    personnelError: null,
    includeQualification: readIncludeQualification(),
    conflict: false,
    modal: null,
    personQuery: '',
    personHits: [],
    encRole: 'FORMATEUR',
    encSerieComplete: false,
    encRetrait: null,
    encQuery: '',
    encHits: [],
    saisieDirty: false,
    hasUnsavedChanges: false,
    presenceSaveBusy: false,
    presenceCloseBusy: null,
    presenceSaveStatus: 'idle',
    saisieGuard: { stayHash: '', pendingHash: '', restoring: false, allowLeave: false },
    realiseQuery: '',
    realiseGrade: '',
    realiseOi: '',
    realiseCible: '',
    realiseStatut: '',
    realiseSort: { key: 'grade', dir: 'desc' },
    scopeSearchTimers: {},
    scopeSearchTokens: { encadrement: 0, manual: 0 },
    manualPersonQuery: '',
    manualPersonHits: [],
    reopenMotif: '',
    session: null,
    authChecking: true,
    authError: null,
    needOkta: true,
    idleWarn: false,
    idleExpired: false,
    personCount: null,
    importFile: { filename: '', csvText: '', drag: false },
    importPreview: null,
    importExcluded: {},
    importRapport: null,
    importFilter: 'TOUS',
    importDecisions: {},
    importCommitProgress: null,
    personnelSync: {
      filename: '',
      csvText: '',
      drag: false,
      panelOpen: false,
      preview: null,
      rapport: null,
      filter: 'CHANGEMENTS',
      dateEffet: '',
      contexte: 'GENERAL',
      siteJsp: '',
      anneeMonitoring: String(new Date().getFullYear()),
      decisions: {},
      commitPayload: null,
      openRow: null
    },
    personnelDirectory: null,
    personnelQuery: '',
    personnelStatut: 'actifs',
    personnelHistory: null,
    personnelHistoryOpen: false,
    personnelSituationDate: '',
    personnelSituationApplied: false,
    personnelListSeq: 0,
    personnelSearchTimer: null,
    personnelInactivate: null,
    personnelAssignment: null,
    personnelManualAdd: null,
    personnelRowMenuId: null,
    personnelOi: '',
    personnelSpecialization: '',
    personnelSort: { key: '', dir: '' },
    personnelListPage: 1,
    personnelListPageSize: 12,
    eventSort: { key: 'date', dir: 'asc' },
    eventListQuery: '',
    eventListPage: 1,
    eventListPageSize: 12,
    eventPersonnelSort: { key: 'grade', dir: 'desc' },
    previewSort: { key: 'grade', dir: 'asc' },
    personneFiche: null,
    personneEdit: null,
    personneEventFilter: 'tout',
    personneDomainFilter: null,
    personneEventSort: { key: 'date', dir: 'desc' },
    personneRhOpen: false,
    domaineForm: 'DPS',
    dateForm: '2026-03-12',
    libelleForm: '',
    cibleForm: [],
    modeChoice: '',
    modeTouched: false,
    modeSuggestion: null,
    volumes: { attendus: '', presents: '', excuses: '', excusesPrive: '', excusesProfessionnel: '', excusesArmee: '', excusesAccidentMaladie: '', excusesNonPrecise: '', nonExcuses: '', dispenses: '0', permutations: '0' },
    qtyPreview: null,
    objectifs: [],
    objectifForm: {
      portee: 'GLOBAL',
      domaineCode: 'DPS',
      cibleCode: '',
      cibleId: '',
      annee: '2026',
      seuilPct: '',
      dateDebut: '2026-01-01',
      dateFin: '2026-12-31',
      commentaire: ''
    },
    objectifFilters: { annee: '', portee: '', domaine: '', statut: '' },
    objectifSort: { key: null, dir: null },
    objectifMenuId: null,
    objectifPreview: { date: '2026-06-15', domaine: '', cibleCode: '', result: null, looked: false },
    objectifAction: null,
    reportForm: { kind: 'PERIOD', domaine: 'DAP', cible: 'Y4', evenementId: '' },
    jspReport: null,
    jspReportReady: false,
    jspReportError: null,
    jspReportSite: 'TOUS',
    participationReportDomain: 'JSP',
    participationReportSubdomain: '',
    participationReportSpecialisation: 'GEN',
    participationReportBlocks: ['synthese', 'alertes', 'comparaisons', 'graphiques', 'surveillance', 'regularite', 'sous_objectif', 'nominatif', 'motifs', 'evenements'],
    jspReportSeq: 0,
    formationReport: null,
    formationReportReady: false,
    formationReportError: null,
    formationReportSeq: 0,
    objectifFocusId: null,
    dashboard: null,
    dashboardError: null,
    alertCounts: null,
    explainOpen: false,
    graphExplainId: null,
    openGroups: {},
    absencesOpen: false,
    navOpen: false
  };

  function toast(tone, title, message, extra) {
    state.toast = Object.assign({ tone, title, message }, extra || {});
    render();
  }

  function clearToast() { state.toast = null; }

  const ScopeFeedback = {
    show(kind, title, message, extra) {
      if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
      state.feedback = Object.assign({
        kind,
        title,
        message,
        confirmText: '',
        cancelText: 'Annuler',
        progress: false,
        closeable: kind !== 'progress'
      }, extra || {});
      if (state.feedback.kind !== 'confirm') state.feedbackAction = null;
      render();
      if (state.feedback.autoCloseMs) {
        const shown = state.feedback;
        state.feedbackTimer = setTimeout(() => {
          if (state.feedback === shown) {
            state.feedback = null;
            state.feedbackTimer = null;
            render();
          }
        }, state.feedback.autoCloseMs);
      }
    },
    success(title, message) { this.show('success', title, message, { autoCloseMs: 2200 }); },
    error(title, message, extra) { this.show('error', title, message, extra); },
    warning(title, message, extra) { this.show('warning', title, message, extra); },
    info(title, message, extra) { this.show('info', title, message, extra); },
    progress(title, message) { this.show('progress', title, message, { progress: true, closeable: false }); },
    confirm(options, action) {
      state.feedbackAction = action;
      this.show('confirm', options.title, options.message, {
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        tone: options.tone || 'warning',
        errors: options.errors || []
      });
    },
    clear() {
      if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
      state.feedbackTimer = null;
      state.feedback = null;
      state.feedbackAction = null;
      render();
    }
  };
  window.ScopeFeedback = ScopeFeedback;

  function presentFriendlyError(info) {
    if (info && info.okta) {
      return Object.assign({}, info, {
        title: 'Connexion requise',
        message: 'Connectez-vous avec votre compte institutionnel pour accéder à SCOPE.'
      });
    }
    return info;
  }

  function friendlyActionError(error) {
    const info = presentFriendlyError(L.friendlyError(error));
    state.conflict = Boolean(info.conflict);
    if (info.okta) {
      invalidateScopeSession('action-unauthorized');
      state.authError = info;
    }
    return info;
  }

  async function withFeedbackAction(options, fn) {
    state.loading = true;
    if (options && options.progressTitle) {
      ScopeFeedback.progress(options.progressTitle, options.progressMessage || 'Traitement en cours — ne quittez pas cette page.');
    } else {
      render();
    }
    try {
      const result = await fn();
      state.loading = false;
      if (options && options.successTitle) ScopeFeedback.success(options.successTitle, options.successMessage || '');
      else render();
      return result;
    } catch (error) {
      state.loading = false;
      const info = friendlyActionError(error);
      ScopeFeedback.error(info.title, info.message, { errors: info.errors, conflict: info.conflict, okta: info.okta });
      return null;
    }
  }

  async function withLoading(fn) {
    state.loading = true;
    render();
    try {
      await fn();
    } catch (error) {
      const info = presentFriendlyError(L.friendlyError(error));
      state.conflict = Boolean(info.conflict);
      if (info.okta) {
        invalidateScopeSession('loading-unauthorized');
        state.authError = info;
      }
      toast(info.tone, info.title, info.message, { conflict: info.conflict, errors: info.errors, okta: info.okta });
    } finally {
      state.loading = false;
      render();
    }
  }

  function route() { return L.parseHash(location.hash); }

  function routeKey(r) {
    return [r && r.screen, r && r.id, r && r.personneId, r && r.domaine, r && r.cible].filter(Boolean).join(':');
  }

  function resetEventListFilters() {
    state.eventListQuery = '';
    state.statut = 'tous';
    state.domaine = 'tous';
    state.eventListPage = 1;
  }

  function resetPersonnelFilters() {
    state.personnelQuery = '';
    state.personnelStatut = 'actifs';
    state.personnelOi = '';
    state.personnelSpecialization = '';
    state.personnelSort = { key: '', dir: '' };
    state.personnelListPage = 1;
    state.personnelRowMenuId = null;
  }

  function resetCycleFilters() {
    state.cycleFilter = { domaine: 'tous', statut: 'tous' };
  }

  function resetJspReportFilters() {
    state.jspReportSite = 'TOUS';
    state.participationReportDomain = 'JSP';
    state.participationReportSubdomain = '';
    state.participationReportSpecialisation = 'GEN';
    state.jspReport = null;
    state.jspReportReady = false;
    state.jspReportError = null;
    state.jspReportSeq += 1;
  }

  function clearRouteScopedFeedback() {
    clearToast();
    if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
    state.feedbackTimer = null;
    state.feedback = null;
    state.feedbackAction = null;
    state.listError = null;
    state.cyclesError = null;
    state.cycleDetailError = null;
    state.personnelError = null;
    state.dashboardError = null;
  }

  function prepareRouteChange(previous, next) {
    const prevNav = previous && previous.nav;
    const nextNav = next && next.nav;
    if (prevNav && prevNav !== nextNav) {
      clearRouteScopedFeedback();
      if (prevNav === 'exercices') resetEventListFilters();
      if (prevNav === 'personnel') resetPersonnelFilters();
      if (prevNav === 'cycles') resetCycleFilters();
    }
    if (previous && next && routeKey(previous) !== routeKey(next)) {
      state.modal = null;
      if ((previous.screen === 'rapport-jsp' || previous.screen === 'rapport-participation') && !['rapport-jsp', 'rapport-participation'].includes(next.screen)) resetJspReportFilters();
      if (previous.screen === 'rapport-formation' && next.screen !== 'rapport-formation') {
        state.formationReport = null;
        state.formationReportReady = false;
        state.formationReportError = null;
      }
      if (next.screen === 'rapport-jsp' || next.screen === 'rapport-participation') {
        if (next.screen === 'rapport-jsp') state.participationReportDomain = 'JSP';
        if (state.participationReportDomain !== 'FOSPEC') state.participationReportSubdomain = '';
        if (state.participationReportDomain !== 'FOSPEC') state.participationReportSpecialisation = 'GEN';
        state.jspReport = null;
        state.jspReportReady = false;
        state.jspReportError = null;
      }
      if (next.screen === 'rapport-formation') {
        state.formationReport = null;
        state.formationReportReady = false;
        state.formationReportError = null;
      }
      if (next.screen === 'cycle') {
        state.cycleDetail = null;
        state.cycleDetailReady = false;
        state.cycleDetailError = null;
      }
      if (next.screen === 'fiche' || next.screen === 'saisie') {
        state.fiche = null;
        state.ficheReady = false;
        state.preview = null;
        state.saisie = [];
        state.volumes = volumesFromFiche();
        resetEventTransientUi();
      }
      if (next.screen === 'personne') {
        state.personneFiche = null;
        state.personneReady = false;
      }
    }
  }

  function go(hash) {
    const next = L.parseHash(hash);
    if (L.hasUnsavedPresenceChanges && L.hasUnsavedPresenceChanges(state)
      && L.isLeavingSaisieRoute && L.isLeavingSaisieRoute(route(), next)
      && !(state.saisieGuard && state.saisieGuard.allowLeave)) {
      requestLeaveSaisie(hash);
      return;
    }
    location.hash = hash;
  }

  function setUnsavedPresenceChanges(dirty) {
    state.saisieDirty = Boolean(dirty);
    state.hasUnsavedChanges = state.saisieDirty;
  }

  function requestLeaveSaisie(hash) {
    if (!L.hasUnsavedPresenceChanges(state)) {
      location.hash = hash;
      return;
    }
    const plan = L.planSaisieLeave(state);
    state.saisieGuard.pendingHash = hash;
    state.modal = 'unsaved-saisie-leave';
    state.saisieLeaveCopy = plan;
    render();
  }

  function domaineLabel(code) {
    const canon = String(code || '').toUpperCase() === 'PAPR' ? 'PR' : code;
    const d = state.referentiels.domaines.find((x) => x.code === code || x.code === canon);
    const raw = d ? (d.libelleAffiche || L.domaineAffiche(canon || code)) : L.domaineAffiche(canon || code);
    return String(raw).toUpperCase() === 'PAPR' ? 'PR' : raw;
  }

  function ciblesOf(fiche) {
    return (fiche && fiche.cibles) || [];
  }

  function personOf(fiche, id) {
    const map = (fiche && fiche.personnes) || {};
    return map[id] || map[String(id)] || null;
  }

  function displayPerson(fiche, id) {
    const p = personOf(fiche, id);
    return p ? `${p.nom} ${p.prenom}` : 'Personne';
  }

  function nipOf(fiche, id) {
    const p = personOf(fiche, id);
    return p ? p.nip : '';
  }

  function prSessionLabelFromEvent(ev) {
    const explicit = String((ev && (ev.pr_session_label || ev.prSessionLabel)) || '').trim();
    if (explicit) return explicit;
    const key = String((ev && (ev.pr_session_key || ev.prSessionKey)) || '');
    const keyMatch = key.match(/PR:([0-9]+\.[0-9]+)$/);
    if (keyMatch) return keyMatch[1];
    const libelle = String((ev && ev.libelle) || '');
    const match = libelle.match(/exercice\s+pr\s+([0-9]+\.[0-9]+)/i);
    return match ? match[1] : '';
  }

  function isFirstPrSession(fiche) {
    const ev = fiche && fiche.evenement;
    if (!ev || String(ev.domaine_code || '').toUpperCase() !== 'PR') return false;
    const label = prSessionLabelFromEvent(ev);
    return /\b\d+\.1$/.test(label);
  }

  function prSeriesLabels(fiche) {
    const raw = (fiche && fiche.prExerciseParticipation && fiche.prExerciseParticipation.sessionLabels) || [];
    const labels = raw.length ? raw : [prSessionLabelFromEvent(fiche && fiche.evenement)].filter(Boolean);
    return L.uniqueSortedPrSessionLabels ? L.uniqueSortedPrSessionLabels(labels) : labels;
  }

  function prSeriesScopeText(fiche) {
    const labels = prSeriesLabels(fiche);
    if (!labels.length) return '';
    const formatted = L.formatPrSessionList ? L.formatPrSessionList(labels) : labels.join(', ');
    return `Toute la série — sessions PR ${formatted}`;
  }

  function formateurSeriesLabelsFor(personneId) {
    const fiche = state.fiche;
    const attendu = ((fiche && fiche.attendus) || []).find((row) => String(row.personne_id) === String(personneId));
    return (attendu && (attendu.sessionFormateurSessions || attendu.session_formateur_sessions)) || [];
  }

  function currentEncadrementRole(personneId) {
    const row = ((state.fiche && state.fiche.encadrement) || []).find((p) => String(p.personne_id) === String(personneId));
    return row ? String(row.role || '').toUpperCase() : '';
  }

  function beginPersonneEdit() {
    const identite = state.personneFiche && state.personneFiche.identite;
    if (!identite) return;
    state.personneEdit = {
      grade: identite.grade || '',
      nom: identite.nom || '',
      prenom: identite.prenom || '',
      dateEntreeSdis: identite.dateEntreeSdis || identite.date_entree_sdis || identite.dateEntree || identite.date_entree || ''
    };
    render();
  }

  function cancelPersonneEdit() {
    state.personneEdit = null;
    render();
  }

  async function loadReferentiels() {
    const data = await client.referentiels();
    state.referentiels = {
      domaines: data.domaines || [],
      cibles: data.cibles || [],
      arbre: data.arbre || [],
      suiviNominatif: data.suiviNominatif || []
    };
  }

  async function loadList() {
    const token = ++state.listRequestSeq;
    state.listError = null;
    try {
      const data = await client.listEvenements(Object.assign({
        annee: state.year,
        statut: state.statut,
        domaineCode: state.domaine
      }, qualQuery()));
      if (token !== state.listRequestSeq) return null;
      state.list = data.evenements || [];
      state.listReady = true;
      return data;
    } catch (error) {
      if (token !== state.listRequestSeq) return null;
      state.listError = L.friendlyError(error).message || L.errorMessage('exercices');
      throw error;
    }
  }

  async function loadCycles() {
    const token = ++state.cyclesRequestSeq;
    if (typeof client.listCycles !== 'function') {
      state.cycles = [];
      state.cyclesReady = true;
      state.cyclesError = null;
      return;
    }
    state.cyclesError = null;
    try {
      const data = await client.listCycles({
        annee: state.year,
        domaine: state.cycleFilter.domaine,
        statut: state.cycleFilter.statut
      });
      if (token !== state.cyclesRequestSeq || route().screen !== 'cycles') return null;
      state.cycles = data.cycles || [];
      state.cyclesReady = true;
      return data;
    } catch (error) {
      if (token !== state.cyclesRequestSeq || route().screen !== 'cycles') return null;
      state.cyclesError = L.friendlyError(error).message || 'Les cycles n’ont pas pu être chargés.';
      state.cyclesReady = true;
      throw error;
    }
  }

  async function loadCycle(id) {
    const expectedId = String(id);
    const token = ++state.cycleDetailRequestSeq;
    if (typeof client.getCycle !== 'function') {
      state.cycleDetail = null;
      state.cycleDetailReady = true;
      state.cycleDetailError = null;
      return;
    }
    state.cycleDetailError = null;
    try {
      const data = await client.getCycle(id);
      if (token !== state.cycleDetailRequestSeq || route().screen !== 'cycle' || String(route().id) !== expectedId) return null;
      state.cycleDetail = data;
      state.cycleDetailReady = true;
      return data;
    } catch (error) {
      if (token !== state.cycleDetailRequestSeq || route().screen !== 'cycle' || String(route().id) !== expectedId) return null;
      state.cycleDetailError = L.friendlyError(error).message || 'Le cycle n’a pas pu être chargé.';
      state.cycleDetailReady = true;
      throw error;
    }
  }

  async function loadObjectifs() {
    if (!client.listObjectifs) {
      state.objectifs = [];
      return;
    }
    const data = await client.listObjectifs();
    state.objectifs = data.objectifs || [];
  }

  async function loadDashboard() {
    const r = route();
    if (typeof client.dashboard !== 'function') {
      state.dashboard = null;
      return;
    }
    const params = Object.assign(L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
      semester: state.semester,
      from: state.from,
      to: state.to,
      domaine: r.domaine,
      cible: r.cible
    }), qualQuery());
    state.dashboardError = null;
    try {
      state.dashboard = await client.dashboard(params);
    } catch (error) {
      state.dashboardError = L.friendlyError(error).message || L.errorMessage('dashboard');
      throw error;
    }
  }

  async function loadJspReport() {
    const expectedRouteKey = state.currentRouteKey;
    const seq = (state.jspReportSeq || 0) + 1;
    state.jspReportSeq = seq;
    state.jspReportReady = false;
    state.jspReport = null;
    state.jspReportError = null;
    const loader = client.participationReport || client.jspReport;
    if (typeof loader !== 'function') {
      state.jspReportReady = true;
      state.jspReportError = 'Rapport de participation indisponible dans ce mode.';
      return null;
    }
    const params = participationReportParams(periodQuery());
    try {
      const payload = await loader.call(client, params);
      if (seq !== state.jspReportSeq || state.currentRouteKey !== expectedRouteKey || !['rapport-jsp', 'rapport-participation'].includes(route().screen)) return null;
      state.jspReport = payload.report || null;
      state.jspReportReady = true;
      return state.jspReport;
    } catch (error) {
      if (seq !== state.jspReportSeq || state.currentRouteKey !== expectedRouteKey || !['rapport-jsp', 'rapport-participation'].includes(route().screen)) return null;
      state.jspReportError = L.friendlyError(error).message || 'Impossible de charger le rapport JSP.';
      state.jspReportReady = true;
      throw error;
    }
  }

  async function loadFormationReport() {
    const expectedRouteKey = state.currentRouteKey;
    const seq = (state.formationReportSeq || 0) + 1;
    state.formationReportSeq = seq;
    state.formationReportReady = false;
    state.formationReport = null;
    state.formationReportError = null;
    if (typeof client.formationReport !== 'function') {
      state.formationReportReady = true;
      state.formationReportError = 'Rapport global Formation indisponible dans ce mode.';
      return null;
    }
    try {
      const payload = await client.formationReport(periodQuery());
      if (seq !== state.formationReportSeq || state.currentRouteKey !== expectedRouteKey || route().screen !== 'rapport-formation') return null;
      state.formationReport = payload.report || null;
      state.formationReportReady = true;
      return state.formationReport;
    } catch (error) {
      if (seq !== state.formationReportSeq || state.currentRouteKey !== expectedRouteKey || route().screen !== 'rapport-formation') return null;
      state.formationReportError = L.friendlyError(error).message || 'Impossible de charger le rapport global Formation.';
      state.formationReportReady = true;
      throw error;
    }
  }

  async function refreshAlertCounts() {
    if (typeof client.listAlerts !== 'function') return;
    const params = Object.assign(L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
      semester: state.semester,
      from: state.from,
      to: state.to
    }), qualQuery());
    try {
      const data = await client.listAlerts(params);
      state.alertCounts = data.counts || null;
    } catch (_error) {
      /* le compteur header reste facultatif */
    }
  }

  function reloadPeriod() {
    const r = route();
    if (r.screen === 'liste') {
      state.listReady = false;
      state.listError = null;
    }
    if (r.screen === 'cycles') {
      state.cyclesReady = false;
      state.cyclesError = null;
    }
    if (r.screen === 'personnel' || r.screen === 'import-personnel') {
      state.personnelReady = false;
      state.personnelError = null;
      state.personnelSituationApplied = false;
      state.personnelDirectory = null;
    }
    withLoading(async () => {
      const r = route();
      if (r.screen === 'vue') {
        await loadDashboard();
      } else if (r.screen === 'liste') {
        await loadList();
      } else if (r.screen === 'cycles') {
        await loadCycles();
      } else if (r.screen === 'cycle' && r.id) {
        await loadCycle(r.id);
      } else if (r.screen === 'personnel' || r.screen === 'import-personnel') {
        await loadPersonnelDirectory();
      } else if (r.screen === 'personne' && r.personneId) {
        await loadPersonneFiche(r.personneId);
      }
      await refreshAlertCounts();
    });
  }

  async function loadFiche(id) {
    const expectedId = String(id);
    const token = ++state.ficheRequestSeq;
    state.activeFicheId = expectedId;
    state.ficheReady = false;
    state.fiche = null;
    state.preview = null;
    state.saisie = [];
    state.volumes = volumesFromFiche();
    resetEventTransientUi();
    render();
    const data = await client.getEvenement(id);
    if (token !== state.ficheRequestSeq || state.activeFicheId !== expectedId || route().id !== expectedId) return null;
    state.fiche = data;
    state.ficheReady = true;
    state.conflict = false;
    state.encRole = 'FORMATEUR';
    state.encSerieComplete = false;
    state.encRetrait = null;
    buildSaisieFromFiche();
    setUnsavedPresenceChanges(false);
    state.volumes = volumesFromFiche();
    state.qtyPreview = null;
    return data;
  }

  function snapshotSaisieState() {
    return {
      saisie: (state.saisie || []).map((row) => Object.assign({}, row, {
        cibles: Array.isArray(row.cibles) ? row.cibles.slice() : []
      })),
      cibleFilter: state.cibleFilter,
      manualPersonQuery: state.manualPersonQuery,
      manualPersonHits: state.manualPersonHits.slice(),
      scrollY: typeof window !== 'undefined' ? window.scrollY : 0
    };
  }

  async function refreshFichePreservingSaisie(id, snapshot) {
    const expectedId = String(id);
    const token = ++state.ficheRequestSeq;
    state.activeFicheId = expectedId;
    const data = await client.getEvenement(id);
    if (token !== state.ficheRequestSeq || state.activeFicheId !== expectedId || route().id !== expectedId) return null;
    state.fiche = data;
    state.ficheReady = true;
    state.conflict = false;
    state.encRetrait = null;
    buildSaisieFromFiche();
    mergeEditableSaisieState(snapshot);
    state.cibleFilter = snapshot.cibleFilter;
    state.manualPersonQuery = snapshot.manualPersonQuery;
    state.manualPersonHits = snapshot.manualPersonHits;
    state.volumes = volumesFromFiche();
    state.qtyPreview = null;
    render();
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: snapshot.scrollY, left: window.scrollX, behavior: 'auto' }));
    }
    return data;
  }

  async function reloadFicheFromServer(id) {
    const expectedId = String(id);
    const token = ++state.ficheRequestSeq;
    state.activeFicheId = expectedId;
    const data = await client.getEvenement(id);
    if (token !== state.ficheRequestSeq || state.activeFicheId !== expectedId || route().id !== expectedId) return null;
    state.fiche = data;
    state.ficheReady = true;
    state.conflict = false;
    state.encRetrait = null;
    buildSaisieFromFiche();
    setUnsavedPresenceChanges(false);
    state.volumes = volumesFromFiche();
    state.qtyPreview = null;
    return data;
  }

  function mergeEditableSaisieState(snapshot) {
    const previous = new Map(((snapshot && snapshot.saisie) || []).map((row) => [String(row.personneId), row]));
    const encadrementIds = usedEncadrementIds();
    state.saisie = (state.saisie || []).map((row) => {
      const prior = previous.get(String(row.personneId));
      if (!prior || encadrementIds.has(String(row.personneId))) return row;
      return Object.assign({}, row, {
        statut: prior.statut,
        motifAbsence: prior.motifAbsence || '',
        commentaire: prior.commentaire || ''
      });
    });
  }

  function buildPresenceSavePayload(rows, encadrementIds) {
    return L.buildPresenceSavePayload(rows, encadrementIds);
  }

  function volumesFromFiche() {
    const s = state.fiche && (state.fiche.saisieQuantitative || state.fiche.saisie_quantitative);
    if (!s) return { attendus: '', presents: '', excuses: '', excusesPrive: '', excusesProfessionnel: '', excusesArmee: '', excusesAccidentMaladie: '', excusesNonPrecise: '', nonExcuses: '', dispenses: '0', permutations: '0' };
    return {
      attendus: s.nb_attendus == null ? '' : String(s.nb_attendus),
      presents: s.nb_presents == null ? '' : String(s.nb_presents),
      excuses: s.nb_excuses == null ? '' : String(s.nb_excuses),
      excusesPrive: s.nb_excuses_prive == null ? '' : String(s.nb_excuses_prive),
      excusesProfessionnel: s.nb_excuses_professionnel == null ? '' : String(s.nb_excuses_professionnel),
      excusesArmee: s.nb_excuses_armee == null ? '' : String(s.nb_excuses_armee),
      excusesAccidentMaladie: s.nb_excuses_accident_maladie == null ? '' : String(s.nb_excuses_accident_maladie),
      excusesNonPrecise: s.nb_excuses_non_precise == null ? '' : String(s.nb_excuses_non_precise),
      nonExcuses: s.nb_non_excuses == null ? '' : String(s.nb_non_excuses),
      dispenses: String(s.nb_dispenses == null ? 0 : s.nb_dispenses),
      permutations: String(s.nb_permutations == null ? 0 : s.nb_permutations)
    };
  }

  function eventMode(ev) {
    return L.modeSuiviOf(ev || (state.fiche && state.fiche.evenement) || {});
  }

  function cibleForPersonne(personneId) {
    const preview = state.preview && state.preview.personnes
      ? state.preview.personnes.find((p) => p.personneId === personneId)
      : null;
    if (preview && preview.cibles && preview.cibles.length) {
      return preview.cibles.map((c) => c.niveauCode).join(' · ');
    }
    const pending = state.pendingExceptions.find((p) => p.personneId === personneId);
    if (pending) return 'Exception';
    return '—';
  }

  function cibleLabelFromAttendu(attendu) {
    if (!attendu) return '—';
    if (attendu.origine === 'EXCEPTION_AJOUT') return 'Ajout manuel';
    const raw = String(attendu.motif_inclusion || attendu.motifInclusion || '').trim();
    const labels = raw.split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const m = part.match(/^([A-Z]+)_(.+)$/i);
        if (!m) return '';
        const domaine = m[1].toUpperCase();
        if (!['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC', 'PR', 'AUTO'].includes(domaine)) return '';
        return L.niveauAffiche ? L.niveauAffiche(domaine, m[2]) : m[2];
      })
      .filter(Boolean);
    const unique = [...new Set(labels)];
    if (unique.length) return unique.join(' · ');
    return cibleForPersonne(attendu.personne_id);
  }

  function normalizeSearchText(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function personLine(person) {
    return eventPersonLabel(person);
  }

  function eventPersonLabel(person) {
    if (!person) return 'Personne';
    return [person.grade, person.nomFamille || person.nom, person.prenom].filter(Boolean).join(' ') || person.nip || 'Personne';
  }

  function gradeRank(value) {
    const ref = window.ScopePersonnelReferentials;
    if (ref && typeof ref.gradeRank === 'function') return ref.gradeRank(value);
    const code = ref && ref.canonicalGradeCode ? ref.canonicalGradeCode(value) : String(value || '').trim();
    const row = ref && Array.isArray(ref.GRADES) ? ref.GRADES.find((item) => item.code === code) : null;
    return row ? Number(row.rang) : 1000;
  }

  function displayIncorporation(value, domaineCode) {
    const raw = String(value || '').trim();
    if (!raw || raw === '—') return raw;
    if (/^(DPS|DAP|JSP|FOBA|FOCA|FOSPEC|PAPR|AUTO)\b/i.test(raw)) return raw;
    const domaine = String(domaineCode || '').toUpperCase();
    if (domaine === 'JSP' && /^(G1|C1|B1)$/i.test(raw)) return `JSP ${raw.toUpperCase()}`;
    return raw;
  }

  function encadrementGroupOrder() {
    return ['FORMATEUR', 'SURVEILLANT', 'MONITEUR', 'AUXILIAIRE'];
  }

  function encadrementRolesForEvent(fiche) {
    const d = String((fiche && fiche.evenement && (fiche.evenement.domaine_code || fiche.evenement.domaineCode)) || '').toUpperCase();
    const present = new Set(((fiche && fiche.encadrement) || []).map((p) => String(p.role || '').toUpperCase()));
    return encadrementGroupOrder().filter((role) => {
      if (role === 'FORMATEUR' || role === 'AUXILIAIRE') return true;
      if (role === 'MONITEUR') return d === 'JSP' || present.has('MONITEUR');
      if (role === 'SURVEILLANT') return d === 'PR' || d === 'PAPR' || present.has('SURVEILLANT');
      return present.has(role);
    }).concat(encadrementRoleOrder().filter((role) => present.has(role) && !encadrementGroupOrder().includes(role)));
  }

  function encadrementRoleHeading(role, count) {
    const labels = {
      FORMATEUR: 'Formateurs',
      MONITEUR: 'Moniteurs',
      SURVEILLANT: 'Surveillants',
      AUXILIAIRE: 'Auxiliaires'
    };
    return `${labels[role] || (L.ROLE_LABELS[role] || role)} · ${count}`;
  }

  function renderEncadrementGroups(fiche, options) {
    const readOnly = Boolean(options && options.readOnly);
    const byRole = (options && options.byRole) || new Map();
    const encCount = options && options.encCount
      ? options.encCount
      : (role) => ((fiche && fiche.encadrement) || []).filter((p) => p && p.role === role).length;
    const roles = (options && options.roles) || encadrementRolesForEvent(fiche);
    const filled = roles.filter((role) => (byRole.get(role) || []).length);
    const groupHtml = (role) => {
      const people = byRole.get(role) || [];
      const count = role === 'MONITEUR' ? encCount('MONITEUR') : people.length;
      return `<section class="scope-enc-group" data-enc-role="${escapeHtml(role)}" data-filled="${people.length ? 'true' : 'false'}">
        <h3 class="scope-enc-role-title">${escapeHtml(encadrementRoleHeading(role, count))}</h3>
        <div class="scope-enc-people">${people.map((p) => {
          const label = eventPersonLabel(p);
          const remove = readOnly ? '' : `<button type="button" class="scope-remove-action scope-enc-remove" data-enc-remove="${escapeHtml(p.personne_id)}" aria-label="Retirer ${escapeHtml(L.ROLE_LABELS[role] || role)} ${escapeHtml(label)}">${trashIcon()}</button>`;
          return `<div class="scope-enc-person">
            <div class="scope-enc-id">
              <span class="scope-enc-name">${escapeHtml(label)}</span>
              <small class="scope-enc-nip">${p.nip ? `NIP ${escapeHtml(p.nip)}` : ''}</small>
            </div>
            ${remove}
          </div>`;
        }).join('')}</div>
      </section>`;
    };
    return `
      <div class="scope-enc-groups" data-count="${filled.length}">
        ${filled.map(groupHtml).join('')}
      </div>
    `;
  }

  function presenceSaveLabel() {
    if (state.presenceSaveBusy) return 'Enregistrement…';
    if (state.saisieDirty) return 'Non enregistré';
    if (state.presenceSaveStatus === 'error') return 'Erreur';
    if (state.presenceSaveStatus === 'saved') return 'Enregistré';
    return '';
  }

  function personSubLine(person) {
    const cible = person.oiActuel || person.oi || person.affectation || person.cible || '';
    return [`NIP ${person.nip || '—'}`, cible].filter(Boolean).join(' · ');
  }

  function trashIcon() {
    return `<svg class="scope-trash-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 15h10l1-15"></path><path d="M10 10v7"></path><path d="M14 10v7"></path>
    </svg>`;
  }

  function encadrementRoleOrder() {
    return L.ENCADREMENT_ROLE_ORDER || ['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE'];
  }

  function usedEncadrementIds() {
    return new Set(((state.fiche && state.fiche.encadrement) || []).map((p) => String(p.personne_id)));
  }

  function expectedIds() {
    return new Set(((state.fiche && state.fiche.attendus) || [])
      .filter((a) => a.inclus !== false)
      .map((a) => String(a.personne_id)));
  }

  function sortPeopleForEncadrement(rows) {
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    return (rows || []).slice().sort((a, b) => {
      const rankOf = (value) => {
        const r = gradeRank(value);
        return r >= 1000 ? -1 : r;
      };
      const ra = rankOf(a.grade);
      const rb = rankOf(b.grade);
      let grade = 0;
      if (ra >= 0 && rb >= 0 && ra !== rb) grade = rb - ra;
      else if (ra >= 0 && rb < 0) grade = -1;
      else if (ra < 0 && rb >= 0) grade = 1;
      else if (ra < 0 && rb < 0) grade = collator.compare(a.grade || '', b.grade || '');
      return grade
        || collator.compare(a.nomFamille || a.nom || '', b.nomFamille || b.nom || '')
        || collator.compare(a.prenom || '', b.prenom || '')
        || collator.compare(a.nip || '', b.nip || '');
    });
  }

  function buildSaisieFromFiche() {
    const fiche = state.fiche;
    if (!fiche) { state.saisie = []; return; }
    const parts = new Map();
    (fiche.participations || []).forEach((p) => {
      const id = p && (p.personne_id || p.personneId);
      if (id) parts.set(String(id), p);
    });
    const attendus = L.saisieAttendusFromFiche
      ? L.saisieAttendusFromFiche(fiche)
      : (fiche.attendus || []).filter((a) => a.inclus !== false);
    state.saisie = attendus
      .map((a) => {
        const personneId = a.personne_id || a.personneId;
        const part = parts.get(String(personneId)) || {};
        const person = personOf(fiche, personneId) || {};
        const cibleLabel = cibleLabelFromAttendu(a);
        const alreadyCountedInSession = Boolean(a.alreadyCountedInSession || a.already_counted_in_session);
        const sessionHasValidStatus = Boolean(a.sessionHasValidStatus || a.session_has_valid_status);
        const localStatut = part.statut || 'NON_RENSEIGNE';
        const localValid = L.isValidSessionStatut ? L.isValidSessionStatut(localStatut) : (localStatut && localStatut !== 'NON_RENSEIGNE');
        const sessionExcuse = localStatut === 'ABSENT_EXCUSE';
        const sessionDispense = localStatut === 'DISPENSE';
        const coveredInGlobalBilan = Boolean(!localValid && alreadyCountedInSession);
        const displayStatut = localStatut;
        const displayMotif = part.motif_absence || '';
        const sessionExerciseLabel = a.sessionExerciseLabel || a.session_exercise_label
          || (fiche.prExerciseParticipation && fiche.prExerciseParticipation.sessionExerciseLabel)
          || (fiche.sessionParticipation && fiche.sessionParticipation.sessionExerciseLabel)
          || '';
        return {
          personneId,
          nom: displayPerson(fiche, personneId),
          nomFamille: person.nom || '',
          prenom: person.prenom || '',
          grade: person.grade || '',
          nip: nipOf(fiche, personneId),
          cible: cibleLabel,
          cibles: cibleLabel === '—' ? [] : cibleLabel.split(' · '),
          statut: displayStatut,
          motifAbsence: displayMotif,
          commentaire: part.commentaire || '',
          domaineCode: String((fiche.evenement && fiche.evenement.domaine_code) || ''),
          source: part.source || '',
          inclus: true,
          role: part.role || 'PARTICIPANT',
          origine: a.origine,
          manual: a.origine === 'EXCEPTION_AJOUT',
          jspRole: a.jspRole || a.jsp_role || null,
          alreadyCountedInSession,
          coveredInGlobalBilan,
          alreadyCountedTooltip: '',
          sessionExcuse,
          sessionDispense,
          sessionHasValidStatus: localValid,
          sessionMessage: localValid ? (a.sessionMessage || a.session_message || '') : '',
          sessionSummary: localValid ? (a.sessionSummary || a.session_summary || '') : '',
          sessionReferenceEventLabel: a.sessionReferenceEventLabel || a.session_reference_event_label || '',
          sessionReferenceEventDate: a.sessionReferenceEventDate || a.session_reference_event_date || '',
          sessionReferenceLabel: a.sessionReferenceLabel || a.session_reference_label || '',
          sessionExerciseLabel
        };
      });
  }

  function counters() { return L.liveCounters(state.saisie); }

  async function refreshModeSuggestion() {
    if (typeof client.suggestModeSuivi !== 'function') {
      if (!state.modeTouched) state.modeChoice = state.modeChoice || 'QUANTITATIF';
      return;
    }
    const date = state.dateForm;
    const cibleIds = state.cibleForm;
    if (!date || !cibleIds.length) {
      state.modeSuggestion = {
        suggested: null,
        requireExplicit: true,
        message: 'Indiquez la date et la cible pour proposer un mode de suivi.'
      };
      return;
    }
    try {
      const data = await client.suggestModeSuivi({ date, cibles: cibleIds.join(',') });
      state.modeSuggestion = data;
      if (!state.modeTouched) {
        state.modeChoice = data.suggested || '';
      }
    } catch (error) {
      state.modeSuggestion = { message: 'Le mode proposé n’a pas pu être chargé. Choisissez Nominatif ou Quantitatif.' };
    }
  }

  function roleLabel() {
    const roles = (state.session && (state.session.roles || [])) || [];
    if (state.session && state.session.roleLabel) return state.session.roleLabel;
    if (roles.includes('ADMINISTRATEUR')) return 'Administrateur';
    if (roles.includes('GESTIONNAIRE')) return 'Gestionnaire';
    if (roles.includes('UTILISATEUR')) return 'Utilisateur';
    if (roles[0]) return String(roles[0]);
    return state.session ? 'Profil utilisateur' : 'Connexion requise';
  }

  function userLabel() {
    if (state.session && state.session.displayName) return state.session.displayName;
    return 'Connexion requise';
  }

  function userInitials() {
    const label = userLabel();
    return label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SD';
  }

  function clearSensitiveSessionData() {
    state.list = [];
    state.cycles = [];
    state.fiche = null;
    state.saisie = [];
    state.personHits = [];
    state.encHits = [];
    state.manualPersonHits = [];
    state.personnelDirectory = null;
    state.personnelHistory = null;
    state.jspReport = null;
    state.formationReport = null;
    state.objectifs = [];
    state.alertCounts = {};
    state.personCount = null;
    state.modal = null;
    state.feedback = null;
    state.feedbackAction = null;
  }

  function clearLocalAuthState() {
    state.session = null;
    state.authChecking = false;
    state.authError = null;
    state.needOkta = true;
    state.idleWarn = false;
    clearSensitiveSessionData();
    window.CurrentRoles = [];
    window.CurrentPermissions = [];
    try { sessionStorage.removeItem(LEGACY_LIVE_KEY); } catch (_error) { /* ignore */ }
    try { sessionStorage.removeItem(QUAL_KEY); } catch (_error) { /* ignore */ }
    try { localStorage.removeItem('scope_auth_idle_last_activity'); } catch (_error) { /* ignore */ }
    if (window.ScopeAuthIdle && typeof window.ScopeAuthIdle.stop === 'function') window.ScopeAuthIdle.stop();
    try { document.dispatchEvent(new Event('monitoring-f7-auth-session-changed')); } catch (_error) { /* ignore */ }
  }

  function clearScopeSession() {
    clearLocalAuthState();
  }

  function invalidateScopeSession(_reason) {
    clearScopeSession();
    return false;
  }

  function handleUnauthorized(info) {
    invalidateScopeSession((info && info.url) || 'unauthorized');
    state.authError = presentFriendlyError(info || L.friendlyError({ status: 401, error: 'unauthorized' }));
    render();
  }

  function normalizeAuthenticatedLocation() {
    if (!window.history || typeof L.cleanAuthenticatedScopeUrl !== 'function') return;
    const current = `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`;
    const next = L.cleanAuthenticatedScopeUrl({
      pathname: location.pathname || '/',
      search: location.search || '',
      hash: location.hash || '',
      hostname: location.hostname || ''
    });
    if (next && next !== current) window.history.replaceState(null, '', next);
  }

  async function logoutScopeSession() {
    invalidateScopeSession('logout');
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include', headers: { Accept: 'application/json' }, cache: 'no-store' });
    } catch (_error) { /* redirection GET nettoie aussi les cookies HttpOnly */ }
    location.href = '/auth/logout?returnTo=' + encodeURIComponent('/scope.html');
  }

  function hasScopePermission(permission) {
    if (!permission) return true;
    if (window.MonitoringRBAC && typeof window.MonitoringRBAC.has === 'function') {
      return window.MonitoringRBAC.has(permission);
    }
    const permissions = (state.session && state.session.permissions) || [];
    return permissions.includes(permission);
  }

  function periodRangeText(period) {
    let from = (period && period.from) || state.from;
    let to = (period && period.to) || state.to;
    if (!period || (!period.from && !period.to)) {
      if (state.preset === 'YEAR') {
        from = `${state.year}-01-01`;
        to = `${state.year}-12-31`;
      } else if (state.preset === 'SEMESTER') {
        const s2 = String(state.semester) === '2';
        from = `${state.year}-${s2 ? '07' : '01'}-01`;
        to = `${state.year}-${s2 ? '12-31' : '06-30'}`;
      } else if (state.preset === 'QUARTER') {
        const q = Math.max(1, Math.min(4, Number(state.quarter) || 1));
        const start = (q - 1) * 3 + 1;
        const end = start + 2;
        const last = new Date(Number(state.year), end, 0).getDate();
        from = `${state.year}-${String(start).padStart(2, '0')}-01`;
        to = `${state.year}-${String(end).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
      } else if (state.preset === 'MONTH') {
        const m = Math.max(1, Math.min(12, Number(state.month) || 1));
        const last = new Date(Number(state.year), m, 0).getDate();
        from = `${state.year}-${String(m).padStart(2, '0')}-01`;
        to = `${state.year}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
      }
    }
    return `${L.formatDate(from)} → ${L.formatDate(to)}`;
  }

  function periodContextHtml() {
    return `<section class="scope-period-context" aria-label="Période analysée">
      <div>
        <span>Période analysée</span>
        <strong>${escapeHtml(periodRangeText({ from: state.from, to: state.to }))}</strong>
      </div>
      <div class="scope-period-controls">
        ${periodSelect('scope-preset', `
          <option value="YEAR" ${state.preset === 'YEAR' ? 'selected' : ''}>Année</option>
          <option value="SEMESTER" ${state.preset === 'SEMESTER' ? 'selected' : ''}>Semestre</option>
          <option value="QUARTER" ${state.preset === 'QUARTER' ? 'selected' : ''}>Trimestre</option>
          <option value="MONTH" ${state.preset === 'MONTH' ? 'selected' : ''}>Mois</option>
          <option value="CUSTOM" ${state.preset === 'CUSTOM' ? 'selected' : ''}>Personnalisée</option>
        `)}
        ${periodSelect('scope-year', Array.from({length: 9}, (_, i) => String(Number(state.year) - 6 + i)).map((y) => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${escapeHtml(y)}</option>`).join(''))}
        ${state.preset === 'SEMESTER' ? periodSelect('scope-semester', [1, 2].map((s) => `<option value="${s}" ${String(s) === String(state.semester) ? 'selected' : ''}>S${s}</option>`).join('')) : ''}
        ${state.preset === 'QUARTER' ? periodSelect('scope-quarter', [1, 2, 3, 4].map((q) => `<option value="${q}" ${String(q) === String(state.quarter) ? 'selected' : ''}>T${q}</option>`).join('')) : ''}
        ${state.preset === 'MONTH' ? periodSelect('scope-month', ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => `<option value="${i + 1}" ${String(i + 1) === String(Number(state.month)) ? 'selected' : ''}>${m}</option>`).join('')) : ''}
        ${state.preset === 'CUSTOM' ? `<label class="scope-period-date">Du <input id="scope-from" type="date" value="${escapeHtml(state.from)}"></label><label class="scope-period-date">Au <input id="scope-to" type="date" value="${escapeHtml(state.to)}"></label>` : ''}
        <label class="scope-qual-toggle" for="scope-include-qual">Inclure les données de qualification</label>
      </div>
    </section>`;
  }

  function periodSelect(id, optionsHtml) {
    return `<label class="scope-select">
      <span class="visually-hidden">${id === 'scope-preset' ? 'Type de période' : id === 'scope-year' ? 'Année' : id === 'scope-semester' ? 'Semestre' : id === 'scope-quarter' ? 'Trimestre' : 'Mois'}</span>
      <select id="${id}" class="scope-select-control">${optionsHtml}</select>
    </label>`;
  }

  function navIcon(name) {
    const paths = {
      home: '<path d="M3 10.5 12 3l9 7.5V21H14V14H10v7H3Z"/>',
      events: '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      cycles: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
      stats: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
      people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M21.5 20c0-2.5-1.8-4-4.5-4"/>',
      report: '<path d="M7 3h8l5 5v13H7Z"/><path d="M15 3v5h5M10 13h7M10 17h5"/>',
      folder: '<path d="M3 7.5 5.5 5h5l2 2.5H21v12H3Z"/>',
      lock: '<rect x="5" y="10" width="14" height="10" rx="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3V21M4.8 6.5l1.6 1.6M17.6 16l1.6 1.6M3.5 12h2.2M18.3 12H21M4.8 17.5l1.6-1.6M17.6 8l1.6-1.6"/>'
    };
    return `<svg class="scope-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${paths[name] || paths.folder}</svg>`;
  }

  function closeNav() {
    state.navOpen = false;
    root.classList.remove('is-nav-open');
  }

  function sidebarHtml(r) {
    const model = L.buildSidebarNav(
      L.normalizeNavArbre(state.referentiels.arbre, state.referentiels.domaines, state.referentiels.cibles),
      r
    );
    const link = (item, currentPage) => `<a class="scope-nav-link" href="${item.href}" ${currentPage ? 'aria-current="page"' : ''}>${item.icon ? navIcon(item.icon) : ''}<span>${escapeHtml(item.label)}</span></a>`;
    const navSubsection = (label, items) => items.length ? `<div class="scope-nav-subsection">
      <p>${escapeHtml(label)}</p>
      ${items.map((item) => link(item, item.current)).join('')}
    </div>` : '';
    const section = (label) => `<p class="scope-nav-section">${escapeHtml(label)}</p>`;
    const primaryLink = (href, label, current, icon) => link({ href, label, icon }, current);
    const reglagesOpen = state.openGroups.reglages === true || r.nav === 'reglages';
    const domainBlocks = model.domains.map((d) => {
      const expanded = state.openGroups[d.id] != null ? state.openGroups[d.id] : d.expanded;
      const isCurrent = r.domaine === d.id && !r.cible;
      const overview = `<a class="scope-nav-link" href="${d.href}" ${isCurrent ? 'aria-current="page"' : ''}>Vue d’ensemble</a>`;
      return `<div class="scope-nav-group${expanded ? '' : ' is-collapsed'}">
        <button type="button" class="scope-nav-group-head${isCurrent ? ' is-current' : ''}" data-nav-group="${escapeHtml(d.id)}" aria-expanded="${expanded ? 'true' : 'false'}">
          ${navIcon('folder')}
          <span>${escapeHtml(d.label)}</span>
        </button>
        <div class="scope-nav-sub">${overview}${d.children.map((c) => {
          const childCurrent = r.domaine === c.id || (r.domaine === d.id && r.cible === c.id);
          return link(c, childCurrent);
        }).join('')}</div>
      </div>`;
    }).join('');
    const parametres = [
      { href: '#/reglages/utilisateurs', label: 'Utilisateurs', current: r.screen === 'utilisateurs', permission: 'users:admin' },
      { href: '#/reglages/administration', label: 'Administration', current: r.screen === 'administration', permission: 'settings:manage' }
    ].filter((item) => hasScopePermission(item.permission));
    const application = [
      { href: '#/reglages/objectifs', label: 'Objectifs', current: r.screen === 'objectifs', permission: 'references:manage' },
      { href: '#/reglages/suivi', label: 'Suivi nominatif', current: r.screen === 'suivi', permission: 'personnel:manage' }
    ].filter((item) => hasScopePermission(item.permission));
    const importation = [
      { href: '#/reglages/import-evenements', label: 'Événements', current: r.screen === 'import-evenements', permission: 'events:create' },
      { href: '#/reglages/import-personnel', label: 'Personnel', current: r.screen === 'import-personnel', permission: 'personnel:manage' }
    ].filter((item) => hasScopePermission(item.permission));
    const settingsBlock = `
          ${section('Réglages')}
          <div class="scope-nav-group${reglagesOpen ? '' : ' is-collapsed'}">
            <button type="button" class="scope-nav-group-head${r.nav === 'reglages' ? ' is-current' : ''}" data-nav-group="reglages" aria-expanded="${reglagesOpen ? 'true' : 'false'}">
              ${navIcon('settings')}
              <span>Réglages</span>
            </button>
            <div class="scope-nav-sub">
              ${navSubsection('Paramètres', parametres)}
              ${navSubsection('Application', application)}
              ${navSubsection('Importation', importation)}
              ${link({ href: '#/reglages/apropos', label: 'À propos' }, r.screen === 'apropos')}
            </div>
          </div>`;
    return `
      <div class="scope-nav-backdrop" id="scope-nav-backdrop"></div>
      <aside class="scope-sidebar" id="scope-sidebar" aria-label="Navigation principale" aria-modal="${state.navOpen ? 'true' : 'false'}">
        <div class="scope-sidebar-head">
          <p class="scope-sidebar-title">Navigation</p>
          <button type="button" class="scope-nav-close" id="scope-nav-close" aria-label="Fermer la navigation">×</button>
        </div>
        <nav class="scope-nav-scroll">
          ${section('Accueil')}
          ${primaryLink('#/accueil', 'Accueil', r.screen === 'accueil', 'home')}
          ${section('Activité')}
          ${primaryLink('#/evenements', 'Événements', r.nav === 'exercices', 'events')}
          ${primaryLink('#/cycles', 'Cycles', r.nav === 'cycles', 'cycles')}
          ${primaryLink('#/statistiques', 'Statistiques', r.screen === 'statistiques', 'stats')}
          ${hasScopePermission('personnel:read') ? primaryLink('#/personnel', 'Personnel', r.nav === 'personnel', 'people') : ''}
          ${primaryLink('#/rapports', 'Rapports', r.nav === 'rapports', 'report')}
          ${section('Domaines')}
          ${domainBlocks}
          ${settingsBlock}
        </nav>
        <div class="scope-sidebar-inst">
          <img class="scope-sdis-logo" src="assets/img/LogoSDISseulnoir.png" alt="SDIS régional du Nord vaudois" width="160" height="48">
        </div>
      </aside>
    `;
  }

  function headerHtml(r) {
    const logout = `<button type="button" class="scope-btn scope-btn-ghost" id="scope-logout">Déconnexion</button>`;
    return `
      <header class="scope-header">
        <div class="scope-header-inner">
          <button type="button" class="scope-nav-toggle" id="scope-nav-toggle" aria-expanded="${state.navOpen ? 'true' : 'false'}" aria-controls="scope-sidebar">
            <span aria-hidden="true"></span>
            <b>Menu</b>
          </button>
          <div class="scope-brand">
            <img class="scope-logo" src="assets/img/logo-scope-blanc.png" alt="SCOPE" width="300" height="100">
            <p class="scope-tagline">Suivi et analyse de l’activité</p>
          </div>
          <div class="scope-header-spacer"></div>
          <div class="scope-header-tools">
            <input type="checkbox" class="visually-hidden" id="scope-include-qual" ${state.includeQualification ? 'checked' : ''} aria-label="Inclure les données de qualification">
            <div class="scope-user-block">
              <span class="scope-user-avatar" aria-hidden="true">${escapeHtml(userInitials())}</span>
              <div class="scope-user-text">
                <strong class="scope-user">${escapeHtml(userLabel())}</strong>
                <small>${escapeHtml(roleLabel())}</small>
              </div>
            </div>
            ${logout}
          </div>
        </div>
      </header>
    `;
  }

  function bannerHtml() {
    const bits = [];
    const params = new URLSearchParams(location.search.replace(/^\?/, ''));
    if (params.get('authError') === '1') {
      const reason = params.get('reason') || 'callback';
      bits.push(`<div class="scope-banner warning" role="alert">
        <strong>Connexion interrompue</strong>
        <div>La session SCOPE n’a pas pu être ouverte (raison : ${escapeHtml(reason)}). Réessayez de vous connecter.</div>
      </div>`);
    }
    if (state.idleWarn && !state.needOkta) {
      bits.push(`<div class="scope-modal" id="scope-idle-warn" role="alertdialog">
        <div class="scope-card">
          <h3>SESSION BIENTÔT EXPIRÉE</h3>
          <p>Votre session sera fermée dans environ 1 minute en raison de votre inactivité.</p>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="scope-idle-stay">Rester connecté</button>
          </div>
        </div>
      </div>`);
    }
    if (state.loading) bits.push(`<div class="scope-banner info">Chargement…</div>`);
    if (state.toast) {
      bits.push(`<div class="scope-banner ${state.toast.tone}" role="status">
        <strong>${escapeHtml(state.toast.title)}</strong>
        <div>${escapeHtml(state.toast.message || '')}</div>
        ${state.toast.conflict ? '<button type="button" class="scope-btn" id="scope-reload">Recharger</button>' : ''}
      </div>`);
    }
    return bits.join('');
  }

  function loginMessage() {
    const params = new URLSearchParams(location.search.replace(/^\?/, ''));
    if (state.authChecking) return 'Vérification de la session en cours.';
    if (state.idleExpired) return 'Votre session a expiré après une période d’inactivité.';
    if (state.authError && state.authError.message) return state.authError.message;
    if (params.get('authError') === '1') return 'La session SCOPE n’a pas pu être ouverte. Réessayez de vous connecter.';
    return 'Connectez-vous avec votre compte institutionnel pour accéder à SCOPE.';
  }

  function renderLoginScreen() {
    const requested = location.hash && String(location.hash).startsWith('#/')
      ? `/scope.html${location.hash}`
      : '/scope.html';
    const loginHref = L.oktaLoginHref(requested);
    const params = new URLSearchParams(location.search.replace(/^\?/, ''));
    const reason = params.get('authError') === '1' ? params.get('reason') || 'callback' : '';
    const status = state.authChecking
      ? `<div class="scope-login-status" role="status">Vérification de la session...</div>`
      : `<a class="scope-login-submit" id="scope-okta-login" href="${escapeHtml(loginHref)}">Se connecter avec Okta</a>`;
    const alert = reason || state.authError
      ? `<div class="scope-login-alert" role="alert">${escapeHtml(reason ? `Connexion interrompue : ${reason}` : loginMessage())}</div>`
      : '';
    return `
      <main class="scope-login-v1">
        <section class="scope-login-visual" aria-label="SCOPE">
          <div class="scope-login-visual-inner">
            <img class="scope-login-logo" src="assets/img/logo-scope-blanc.png" alt="SCOPE" width="300" height="100">
            <div class="scope-login-rule" aria-hidden="true"></div>
            <p class="scope-login-kicker">Suivi et analyse de l’activité</p>
            <h1>SCOPE</h1>
            <p class="scope-login-copy">Accès réservé aux utilisateurs autorisés du SDIS régional du Nord vaudois.</p>
          </div>
        </section>
        <section class="scope-login-panel" aria-label="Connexion">
          <img class="scope-login-sdis" src="assets/img/LogoSDISseulnoir.png" alt="SDIS régional du Nord vaudois" width="160" height="48">
          <div class="scope-login-card">
            <div class="scope-login-lock" aria-hidden="true">${navIcon('lock')}</div>
            <p class="scope-login-eyebrow">Authentification</p>
            <h2>Connexion SCOPE</h2>
            <p>${escapeHtml(loginMessage())}</p>
            ${alert}
            ${status}
          </div>
        </section>
        <footer class="scope-login-footer">SDIS régional du Nord vaudois</footer>
      </main>
    `;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pageHeaderHtml(options) {
    const o = options || {};
    return `<header class="scope-page-head">
      <div>
        ${o.eyebrow ? `<p class="scope-page-eyebrow">${escapeHtml(o.eyebrow)}</p>` : ''}
        <h1>${o.titleHtml || escapeHtml(o.title || 'SCOPE')}</h1>
        ${o.context ? `<p class="scope-page-context">${escapeHtml(o.context)}</p>` : ''}
        ${o.description ? `<p class="scope-page-desc">${escapeHtml(o.description)}</p>` : ''}
      </div>
      ${o.logo ? '<img class="scope-page-sdis" src="assets/img/LogoSDISseulnoir.png" alt="SDIS régional du Nord vaudois" width="150" height="45">' : ''}
    </header>`;
  }

  function alertCardHtml(alert, options) {
    const ack = options && options.ack;
    const cibles = (alert.metadata && alert.metadata.cibles) || [];
    const cibleText = L.ciblesLabel(cibles);
    const meta = [L.formatDate(alert.eventDate), domaineLabel(alert.domainCode), cibleText]
      .filter((part) => part && part !== '—')
      .join(' · ');
    const ackBtn = ack && alert.level !== 'P0' && alert.fingerprint
      ? `<button type="button" class="scope-btn" data-alert-ack="${escapeHtml(alert.fingerprint)}">Masquer</button>`
      : '';
    return `<article class="scope-alert-card" data-level="${escapeHtml(alert.level)}">
      <p class="scope-alert-level" data-level="${escapeHtml(alert.level)}">
        <span class="scope-alert-level-mark" aria-hidden="true"></span>
        ${escapeHtml(alert.levelLabel || L.alertLevelLabel(alert.level))}
      </p>
      <h3>${escapeHtml(alert.title)}</h3>
      ${meta ? `<p class="scope-alert-card-meta">${escapeHtml(meta)}</p>` : ''}
      <p class="scope-alert-message">${escapeHtml(alert.message)}</p>
      <p class="scope-alert-reason">${escapeHtml(alert.reason)}</p>
      <div class="scope-alert-actions">
        <a class="scope-btn scope-btn-primary" href="${escapeHtml(alert.actionHref)}">${escapeHtml(alert.actionLabel)}</a>
        ${ackBtn}
      </div>
    </article>`;
  }

  function statutBadge(code) {
    return `<span class="scope-badge"><span class="scope-dot ${escapeHtml(code)}"></span>${escapeHtml(L.statutLabel(code))}</span>`;
  }

  function eventBusinessState(item) {
    const stateValue = item && (item.etatMetier || item.etat_metier);
    const code = (stateValue && stateValue.code) || (item && item.evenement && item.evenement.statut) || '';
    const label = (stateValue && stateValue.label) || L.statutLabel(code);
    return { code, label };
  }

  function eventBusinessStateBadge(item) {
    const etat = eventBusinessState(item);
    return `<span class="scope-badge scope-state-badge"><span class="scope-dot ${escapeHtml(etat.code)}"></span>${escapeHtml(etat.label)}</span>`;
  }

  function homePilotIcon(kind) {
    const filled = {
      peopleDuo: '<path d="M8.1 4.6a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Zm8.05 1.35a2.65 2.65 0 1 1 0 5.3 2.65 2.65 0 0 1 0-5.3ZM1.7 20.6c.25-3.55 2.95-5.85 6.4-5.85s6.15 2.3 6.4 5.85H1.7Zm11.35 0c.2-2.35 1.7-4.05 4.1-4.05 2.35 0 3.9 1.7 4.1 4.05h-8.2Z"/>',
      donut: '<path fill-rule="evenodd" d="M12 3.2a8.8 8.8 0 1 1 0 17.6 8.8 8.8 0 0 1 0-17.6Zm0 3.4a5.4 5.4 0 1 0 0 10.8 5.4 5.4 0 0 0 0-10.8Z"/><path d="M12 3.2a8.8 8.8 0 0 1 7.7 4.55L16.4 9.5A5.4 5.4 0 0 0 12 6.6V3.2Z"/>',
      peopleBan: '<path d="M7.6 4.8a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm7.6 1.3a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8ZM2.1 19.6c.2-3.1 2.6-5.15 5.5-5.15s5.3 2.05 5.5 5.15H2.1Zm10.2 0c.15-2 1.45-3.5 3.5-3.5 2 0 3.35 1.5 3.5 3.5h-7Z"/><circle cx="16.6" cy="16.6" r="5.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M13.2 20 20 13.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
      peopleX: '<path d="M7.8 4.7a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2Zm7.7 1.35a2.45 2.45 0 1 1 0 4.9 2.45 2.45 0 0 1 0-4.9ZM2 20.2c.22-3.25 2.7-5.4 5.8-5.4s5.58 2.15 5.8 5.4H2Z"/><path d="M15.1 14.2 21 20.1M21 14.2l-5.9 5.9" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>'
    };
    if (filled[kind]) {
      return `<svg class="scope-home-ico" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${filled[kind]}</svg>`;
    }
    const icons = {
      calendar: '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      events: '<rect x="3" y="5" width="18" height="16" rx="1.8"/><path d="M3 10h18M8 3v4M16 3v4M8 14h4M8 17h8"/>',
      presence: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.2 2.6-5 6-5 1.2 0 2.3.2 3.2.6"/><path d="M14.2 16.2 16.5 18.5 21 14"/>',
      people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M21.5 20c0-2.5-1.8-4-4.5-4"/>',
      analyses: '<path d="M4 19V9M10 19V5M16 19v-7M21 19H3"/><path d="M14.5 7.5 17 5l3 2"/>',
      report: '<path d="M7 3h8l5 5v13H7Z"/><path d="M15 3v5h5M10 13h7M10 17h5"/>',
      objectifs: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.4"/>'
    };
    return `<svg class="scope-home-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${icons[kind] || icons.people}</svg>`;
  }

  function homeTreatDomainKey(code) {
    const raw = String(code || '').toUpperCase();
    if (raw === 'PR' || raw === 'AUTO') return 'FOSPEC';
    return ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC'].indexOf(raw) >= 0 ? raw : null;
  }

  function homeEventEffectif(alert) {
    const id = alert && alert.eventId;
    if (!id) return '—';
    const item = (state.list || []).find((row) => {
      const ev = row && row.evenement;
      return ev && String(ev.evenement_id || ev.id) === String(id);
    });
    if (!item || item.attendusInclus == null || item.attendusInclus === '') return '—';
    return String(item.attendusInclus);
  }

  function homeEventPublic(alert) {
    const cibles = (alert.metadata && alert.metadata.cibles) || [];
    const label = L.ciblesLabel(cibles);
    return label && label !== '—' ? label : '—';
  }

  function homeEventEtat(alert) {
    const id = alert && alert.eventId;
    const item = id ? (state.list || []).find((row) => {
      const ev = row && row.evenement;
      return ev && String(ev.evenement_id || ev.id) === String(id);
    }) : null;
    if (item) return eventBusinessState(item);
    const code = (alert.metadata && alert.metadata.statut) || '';
    return { code, label: code ? L.statutLabel(code) : '—' };
  }

  function homeEventsTableHtml(alerts) {
    const rows = (alerts || []).filter((a) => a.level === 'P0').slice(0, 5);
    if (!rows.length) {
      return '<p class="scope-home-events-empty">Aucun événement à traiter.</p>';
    }
    const body = rows.map((alert) => {
      const etat = homeEventEtat(alert);
      const href = alert.actionHref || '#/vue';
      const action = alert.actionLabel || 'Ouvrir';
      const domainKey = homeTreatDomainKey(alert.domainCode) || alert.domainCode;
      return `<tr>
        <td data-label="Date">${escapeHtml(L.formatDate(alert.eventDate) || '—')}</td>
        <td data-label="Événement">${escapeHtml(alert.title || '—')}</td>
        <td data-label="Domaine">${escapeHtml(domainKey ? domaineLabel(domainKey) : '—')}</td>
        <td data-label="Public / OI">${escapeHtml(homeEventPublic(alert))}</td>
        <td data-label="Effectif">${escapeHtml(homeEventEffectif(alert))}</td>
        <td data-label="État"><span class="scope-badge"><span class="scope-dot ${escapeHtml(etat.code)}"></span>${escapeHtml(etat.label)}</span></td>
        <td data-label="Action"><a class="scope-btn scope-home-action" href="${escapeHtml(href)}">${escapeHtml(action)}</a></td>
      </tr>`;
    }).join('');
    return `<div class="scope-table-wrap"><table class="scope-table scope-home-events-table">
      <thead><tr>
        <th>Date</th>
        <th>Événement</th>
        <th>Domaine</th>
        <th>Public / OI</th>
        <th>Effectif</th>
        <th>État</th>
        <th>Action</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function treatCardsHtml(alerts) {
    const HOME_DOMAIN_ORDER = ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC'];
    const counts = {};
    HOME_DOMAIN_ORDER.forEach((code) => { counts[code] = 0; });
    (alerts || []).filter((a) => a.level === 'P0').forEach((alert) => {
      const key = homeTreatDomainKey(alert.domainCode);
      if (key) counts[key] += 1;
    });
    const iconByDomain = { DPS: 'peopleDuo', DAP: 'peopleDuo', JSP: 'peopleDuo', FOBA: 'peopleDuo', FOCA: 'peopleDuo', FOSPEC: 'peopleDuo' };
    return `<div class="scope-treat-grid">${HOME_DOMAIN_ORDER.map((code) => {
      const count = counts[code];
      const short = count === 0 ? 'Aucune action' : (count === 1 ? 'Action prioritaire' : 'Actions prioritaires');
      return `<a class="scope-treat-card is-${escapeHtml(code.toLowerCase())}" href="#/vue/${encodeURIComponent(code)}">
        <span class="scope-treat-ico" aria-hidden="true">${homePilotIcon(iconByDomain[code])}</span>
        <span class="scope-treat-body">
          <span class="scope-treat-domain">${escapeHtml(domaineLabel(code))}</span>
          <strong>${escapeHtml(String(count))}</strong>
          <span class="scope-treat-label">${escapeHtml(short)}</span>
        </span>
        <span class="scope-treat-chev" aria-hidden="true">›</span>
      </a>`;
    }).join('')}</div>`;
  }

  function volumeCell(value) {
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : '0';
  }

  function volumeShare(value, attendus) {
    const n = Number(value);
    const den = Number(attendus);
    if (!Number.isFinite(n) || !Number.isFinite(den) || den <= 0) return '';
    return `${n} / ${den}`;
  }

  function homeChartCard(C, dataset, options) {
    if (!C || !dataset) return '';
    return C.renderChartCard(dataset, Object.assign({ explain: false, homeLayout: true }, options || {}));
  }

  function renderAccueil() {
    const dash = state.dashboard;
    if (state.dashboardError) {
      return `<div class="scope-crumb">Accueil</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'SCOPE', title: 'Centre de pilotage', context: 'Accueil', logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.dashboardError)}</p></div></div>`;
    }
    if (!dash) {
      return `<div class="scope-crumb">Accueil</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'SCOPE', title: 'Centre de pilotage', context: 'Accueil', logo: true })}<div class="scope-card scope-placeholder"><p>${escapeHtml(L.loadingMessage('dashboard'))}</p></div></div>`;
    }
    const o = dash.officiel || {};
    const volumes = o.volumes || {};
    const attendus = volumes.attendus;
    const taux = o.analyticStatus === 'NON_EVALUABLE' && o.percentage == null ? 'Non évaluable' : L.formatTaux(o.percentage);
    const obj = L.objectiveKpiLabel(o);
    const p0Count = Number((dash.alerts && dash.alerts.counts && dash.alerts.counts.p0) || 0);
    const graphs = dash.graphs || {};
    const C = (typeof window !== 'undefined' && window.ScopeCharts) || (typeof globalThis !== 'undefined' && globalThis.ScopeCharts);
    const HOME_DOMAIN_ORDER = ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC'];
    const HOME_DOMAIN_COLORS = {
      DPS: '#DE000A',
      DAP: '#171C8F',
      JSP: '#FFA300',
      FOBA: '#54585A',
      FOCA: '#64748b',
      FOSPEC: '#1F3A93'
    };
    const chartSize = { width: 640, height: 280 };
    const evolutionCard = homeChartCard(C, graphs.evolution, {
      size: chartSize,
      wide: false,
      hideLegacy: true,
      title: 'Évolution du taux de participation'
    }) || '<div class="scope-card scope-chart-card scope-graph-card is-empty is-home-plot"><div class="scope-graph-head"><h2>Évolution du taux de participation</h2></div><div class="scope-chart-frame"><p class="scope-empty scope-chart-empty">Aucune série officielle sur cette période.</p></div><div class="scope-chart-legend-slot"><p class="scope-chart-legend"></p></div></div>';
    const domainesCard = homeChartCard(C, graphs.domaines, {
      size: chartSize,
      wide: false,
      variant: 'columns',
      order: HOME_DOMAIN_ORDER,
      colors: HOME_DOMAIN_COLORS,
      title: 'Participation par domaine'
    }) || '<div class="scope-card scope-chart-card scope-graph-card is-empty is-home-plot"><div class="scope-graph-head"><h2>Participation par domaine</h2></div><div class="scope-chart-frame"><p class="scope-empty scope-chart-empty">Aucune série officielle sur cette période.</p></div><div class="scope-chart-legend-slot"><p class="scope-chart-legend"></p></div></div>';
    const motifPoints = ((graphs.motifs && graphs.motifs.series && graphs.motifs.series[0]) || {}).points || [];
    const motifTotal = motifPoints.reduce((sum, p) => sum + Number(p.value || 0), 0);
    const excusesCard = homeChartCard(C, graphs.motifs, {
      variant: 'donut',
      size: { width: 320, height: 280 },
      wide: false,
      title: 'Répartition des excuses',
      palette: {
        prive: '#DE000A',
        professionnel: '#171C8F',
        armee: '#FFA300',
        sante: '#54585A',
        nonPrecise: '#8a8e92'
      },
      centerValue: motifTotal,
      centerLabel: 'Excusés'
    }) || '<div class="scope-card scope-chart-card scope-graph-card is-empty is-home-plot"><div class="scope-graph-head"><h2>Répartition des excuses</h2></div><div class="scope-chart-frame"><p class="scope-empty scope-chart-empty">Aucun motif d’excuse sur cette période.</p></div><div class="scope-chart-legend-slot"><p class="scope-chart-legend"></p></div></div>';
    return `
      <div class="scope-crumb">Accueil</div>
      <div class="scope-main scope-home">
        <header class="scope-pilot-head">
          <div>
            <p class="scope-eyebrow">SCOPE</p>
            <h1>Centre de pilotage</h1>
          </div>
          <img class="scope-page-sdis" src="assets/img/LogoSDISseulnoir.png" alt="SDIS régional du Nord vaudois" width="150" height="45">
        </header>
        ${periodContextHtml()}
        <section class="scope-treat" aria-labelledby="scope-treat-title">
          <div class="scope-treat-head">
            <div>
              <p class="scope-eyebrow">Centre de pilotage</p>
              <h2 id="scope-treat-title">À traiter aujourd’hui</h2>
            </div>
            <a class="scope-treat-all" href="#/vue">Voir toutes les actions${p0Count ? ` · ${escapeHtml(String(p0Count))}` : ''}</a>
          </div>
          ${treatCardsHtml((dash.alerts && dash.alerts.alerts) || [])}
        </section>
        <section class="scope-activity-board" aria-label="Synthèse de l’activité">
          <h2 class="scope-activity-title">Synthèse de l’activité</h2>
          <article class="scope-activity-cell is-taux">
            <span class="scope-activity-ico" aria-hidden="true">${homePilotIcon('donut')}</span>
            <span>Taux de participation global</span>
            <strong>${escapeHtml(taux)}</strong>
            <em>${escapeHtml(obj.title === 'Aucun objectif défini' || obj.title === 'Période non homogène' ? obj.title : (obj.title ? `Objectif ${obj.title}` : ''))}</em>
          </article>
          <article class="scope-activity-cell is-excuses">
            <span class="scope-activity-ico" aria-hidden="true">${homePilotIcon('peopleDuo')}</span>
            <span>Excusés</span>
            <strong>${escapeHtml(volumeCell(volumes.excuses))}</strong>
            <em>${escapeHtml(volumeShare(volumes.excuses, attendus))}</em>
          </article>
          <article class="scope-activity-cell is-dispenses">
            <span class="scope-activity-ico" aria-hidden="true">${homePilotIcon('peopleBan')}</span>
            <span>Dispensés</span>
            <strong>${escapeHtml(volumeCell(volumes.dispenses))}</strong>
            <em>${escapeHtml(volumeShare(volumes.dispenses, attendus))}</em>
          </article>
          <article class="scope-activity-cell is-absences">
            <span class="scope-activity-ico" aria-hidden="true">${homePilotIcon('peopleX')}</span>
            <span>Absences non excusées</span>
            <strong>${escapeHtml(volumeCell((dash.absencesNonExcusees && dash.absencesNonExcusees.count) != null ? dash.absencesNonExcusees.count : volumes.nonExcuses))}</strong>
            <em>${escapeHtml(volumeShare((dash.absencesNonExcusees && dash.absencesNonExcusees.count) != null ? dash.absencesNonExcusees.count : volumes.nonExcuses, attendus))}</em>
          </article>
        </section>
        <section class="scope-home-charts scope-dash-split" aria-label="Graphiques">
          ${evolutionCard}
          ${domainesCard}
          ${excusesCard}
        </section>
        <section class="scope-home-events" aria-labelledby="scope-home-events-title">
          <div class="scope-home-events-head">
            <h2 id="scope-home-events-title">Événements à traiter</h2>
            <a class="scope-treat-all" href="#/vue">Voir tous les événements à traiter${p0Count ? ` · ${escapeHtml(String(p0Count))}` : ''}</a>
          </div>
          ${homeEventsTableHtml((dash.alerts && dash.alerts.alerts) || [])}
        </section>
        <section class="scope-quick" aria-label="Accès rapides">
          <h2>Accès rapides</h2>
          <div class="scope-quick-grid">
            <a href="#/evenements"><span class="scope-quick-ico">${homePilotIcon('events')}</span><span><b>Événements</b><small>Programme, saisie et clôture</small></span><span class="scope-quick-chev" aria-hidden="true">›</span></a>
            <a href="#/reglages/suivi"><span class="scope-quick-ico">${homePilotIcon('presence')}</span><span><b>Présences</b><small>Suivi nominatif des participations</small></span><span class="scope-quick-chev" aria-hidden="true">›</span></a>
            <a href="#/personnel"><span class="scope-quick-ico">${homePilotIcon('people')}</span><span><b>Personnel</b><small>Annuaire et fiches individuelles</small></span><span class="scope-quick-chev" aria-hidden="true">›</span></a>
            <a href="#/statistiques"><span class="scope-quick-ico">${homePilotIcon('analyses')}</span><span><b>Analyses</b><small>Statistiques et graphiques de période</small></span><span class="scope-quick-chev" aria-hidden="true">›</span></a>
            <a href="#/rapports"><span class="scope-quick-ico">${homePilotIcon('report')}</span><span><b>Rapports</b><small>Exports institutionnels</small></span><span class="scope-quick-chev" aria-hidden="true">›</span></a>
            <a href="#/reglages/objectifs"><span class="scope-quick-ico">${homePilotIcon('objectifs')}</span><span><b>Objectifs</b><small>Seuils de participation</small></span><span class="scope-quick-chev" aria-hidden="true">›</span></a>
          </div>
        </section>
      </div>
    `;
  }

  function renderStatistiques() {
    const dash = state.dashboard;
    if (!dash && !state.dashboardError) {
      return `<div class="scope-crumb">Statistiques</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Analyse', title: 'Statistiques', context: state.year, logo: true })}<div class="scope-card scope-placeholder"><p>${escapeHtml(L.loadingMessage('dashboard'))}</p></div></div>`;
    }
    if (state.dashboardError) {
      return `<div class="scope-crumb">Statistiques</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Analyse', title: 'Statistiques', context: state.year, logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.dashboardError)}</p></div></div>`;
    }
    const graphs = (dash && dash.graphs) || {};
    const C = (typeof window !== 'undefined' && window.ScopeCharts) || (typeof globalThis !== 'undefined' && globalThis.ScopeCharts);
    const chart = (id, opts) => C ? C.renderChartCard(graphs[id], opts) : '';
    return `
      <div class="scope-crumb">Statistiques</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Analyse', title: 'Statistiques', context: periodLabel(dash.period), description: 'Espace analytique principal SCOPE : GRAPH-1, ANALYTICS-1, OBJECTIVES-1 et ALERTS-1.', logo: true })}
        ${periodContextHtml()}
        <div class="scope-graph-stack">${chart('evolution', { size: { width: 640, height: 136 } })}</div>
        <div class="scope-graph-stack">${chart('domaines')}</div>
        <div class="scope-graph-stack">${chart('children')}</div>
        <div class="scope-graph-grid">${chart('composition')}${chart('motifs')}</div>
        ${L.shouldRenderPermutations(route().domaine, graphs.permutations) ? `<div class="scope-graph-stack">${chart('permutations')}</div>` : ''}
        ${dash.legacy && dash.legacy.eventCount ? `<p class="scope-mode-hint">LEGACY affiché séparément : ${escapeHtml(String(dash.legacy.eventCount))} agrégat(s), hors KPI officiel.</p>` : ''}
      </div>
    `;
  }

  const EVENT_LIST_PAGE_SIZES = [12, 24, 48, 60];

  function eventListPageSize() {
    const n = Number(state.eventListPageSize);
    return EVENT_LIST_PAGE_SIZES.indexOf(n) >= 0 ? n : 12;
  }

  function eventListMatches(item, query) {
    if (!query) return true;
    const ev = item && item.evenement;
    if (!ev) return false;
    const hay = normalizeSearchText([
      ev.libelle,
      ev.code_cours,
      ev.identifiant_externe,
      ev.domaine_code,
      domaineLabel(ev.domaine_code),
      L.ciblesLabel(item.cibles)
    ].filter(Boolean).join(' '));
    return hay.includes(query);
  }

  function renderEventListPagination(total, page, pageSize) {
    if (!total) return '';
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const sizeOpts = EVENT_LIST_PAGE_SIZES.map((n) => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`).join('');
    const pager = totalPages > 1
      ? `<div class="scope-pagination-controls">
          <button type="button" class="scope-btn scope-btn-compact" id="event-page-prev" ${page <= 1 ? 'disabled' : ''}>Précédent</button>
          <button type="button" class="scope-btn scope-btn-compact" id="event-page-next" ${page >= totalPages ? 'disabled' : ''}>Suivant</button>
        </div>`
      : '';
    return `<nav class="scope-pagination" aria-label="Pagination des événements">
      <p class="scope-page-status">${total} événement${total > 1 ? 's' : ''}${totalPages > 1 ? ` · page ${page} / ${totalPages}` : ''}</p>
      <div class="scope-pagination-group">
        ${pager}
        <label class="scope-page-size" for="event-page-size">Lignes
          <select id="event-page-size" class="scope-select-control">${sizeOpts}</select>
        </label>
      </div>
    </nav>`;
  }

  function renderListe() {
    const eventColumns = [
      { key: 'date', type: 'date', value: (item) => item && item.evenement && item.evenement.date, tieBreakers: [
        { key: 'heure', type: 'time', value: (item) => item && item.evenement && item.evenement.heure_debut },
        { key: 'libelle', type: 'text', value: (item) => item && item.evenement && item.evenement.libelle }
      ] },
      { key: 'libelle', type: 'text', value: (item) => item && item.evenement && item.evenement.libelle },
      { key: 'domaine', type: 'text', value: (item) => item && item.evenement && domaineLabel(item.evenement.domaine_code) },
      { key: 'public', type: 'text', value: (item) => L.ciblesLabel(item && item.cibles) },
      { key: 'effectif', type: 'number', value: (item) => item && item.attendusInclus },
      { key: 'etat', type: 'status', value: (item) => eventBusinessState(item).code }
    ];
    const source = state.list || [];
    const view = L.listViewState({
      ready: state.listReady,
      error: state.listError,
      count: source.length
    });
    const pageSize = eventListPageSize();
    const query = normalizeSearchText(String(state.eventListQuery || '').replace(/\s+/g, ' ').trim());
    let pagination = '';
    let body;
    if (view === 'error') {
      body = `<tr><td colspan="7"><div class="scope-empty scope-state-error" role="alert">${escapeHtml(state.listError || L.errorMessage('exercices'))}</div></td></tr>`;
    } else if (view === 'loading') {
      body = `<tr><td colspan="7"><div class="scope-loading-row" role="status">${escapeHtml(L.loadingMessage('exercices'))}</div></td></tr>`;
    } else if (view === 'empty') {
      body = `<tr><td colspan="7"><div class="scope-empty">Aucun événement sur la période choisie.</div></td></tr>`;
    } else {
      const searched = source.filter((item) => eventListMatches(item, query));
      if (!searched.length) {
        body = '<tr><td colspan="7"><div class="scope-empty">Aucun événement ne correspond à la recherche.</div></td></tr>';
      } else {
        const rows = L.sortRows ? L.sortRows(searched, state.eventSort, eventColumns) : searched;
        const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
        const page = Math.min(Math.max(1, Number(state.eventListPage) || 1), totalPages);
        pagination = renderEventListPagination(rows.length, page, pageSize);
        const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
        body = pageRows.map((item) => {
      const ev = item.evenement;
      const isLegacy = ev.origine === 'LEGACY_AGGREGATED';
      const mode = L.modeSuiviOf(ev);
      const legacyPct = isLegacy ? L.legacyTauxFromRow(item.legacy) : null;
      const taux = L.displayTauxForList(
        ev.statut,
        ev.statut === 'REALISE',
        isLegacy ? legacyPct : (item.compteurs && item.compteurs.percentage),
        { origine: ev.origine }
      );
      const action = ev.statut === 'PLANIFIE' && !isLegacy && (ev.population_figee || mode === 'QUANTITATIF') ? 'Saisir' : 'Ouvrir';
      const href = ev.statut === 'PLANIFIE' && !isLegacy && (ev.population_figee || mode === 'QUANTITATIF')
        ? `#/exercices/${ev.evenement_id}/saisie`
        : `#/exercices/${ev.evenement_id}`;
      const statutHtml = isLegacy
        ? '<span class="scope-badge"><span class="scope-dot LEGACY"></span>Historique agrégé</span>'
        : `${eventBusinessStateBadge(item)}<span class="scope-events-mode">${escapeHtml(L.modeLabel(mode))}</span>`;
      const attenduLegacy = item.legacy && ((item.legacy.payload_v67 && item.legacy.payload_v67.total_attendu) || item.legacy.nb_convoques);
      const presents = isLegacy && item.legacy
        ? `${item.legacy.nb_presents} / ${attenduLegacy}`
        : (ev.statut === 'REALISE' ? (item.compteurs.presents ?? '—') : '—');
      const attendusCell = isLegacy ? '—' : (mode === 'QUANTITATIF' ? (item.attendusInclus || '—') : (ev.population_figee ? item.attendusInclus : '—'));
      const effectifBits = [];
      if (presents !== '—') effectifBits.push(String(presents));
      if (taux !== '—') effectifBits.push(String(taux));
      const effectifHtml = `<span class="scope-events-effectif-main">${escapeHtml(String(attendusCell))}</span>${effectifBits.length ? `<small class="scope-events-effectif-sub">${escapeHtml(effectifBits.join(' · '))}</small>` : ''}`;
      return `<tr>
        <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
        <td data-label="Événement"><a class="scope-events-libelle" href="#/exercices/${escapeHtml(ev.evenement_id)}">${escapeHtml(ev.libelle)}</a></td>
        <td data-label="Domaine"><span class="scope-events-domain">${escapeHtml(domaineLabel(ev.domaine_code))}</span></td>
        <td data-label="Public / OI">${escapeHtml(L.ciblesLabel(item.cibles))}</td>
        <td data-label="Effectif">${effectifHtml}</td>
        <td data-label="État">${statutHtml}</td>
        <td data-label="Action"><a class="scope-btn scope-events-list-action" href="${href}">${escapeHtml(action)}</a></td>
      </tr>`;
        }).join('');
      }
    }

    return `
      <div class="scope-crumb">Événements · ${escapeHtml(state.year)}</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Activité', title: 'Événements', context: state.year, description: 'Liste opérationnelle des événements planifiés, réalisés, reportés ou annulés.', logo: true })}
        ${periodContextHtml()}
        <div class="scope-toolbar scope-events-pilot">
          <div class="scope-field scope-events-search">
            <label for="event-list-q">Recherche</label>
            <input id="event-list-q" type="search" placeholder="Rechercher un événement…" value="${escapeHtml(state.eventListQuery || '')}" autocomplete="off">
          </div>
          <div class="scope-field">
            <label>Statut</label>
            <select id="filter-statut">
              <option value="tous">Tous</option>
              <option value="PLANIFIE">Planifié</option>
              <option value="SAISIE_EN_COURS">Saisie en cours</option>
              <option value="A_TRAITER">À traiter</option>
              <option value="TRAITE">Traité</option>
            </select>
          </div>
          <div class="scope-field">
            <label>Domaine</label>
            <select id="filter-domaine">
              <option value="tous">Tous</option>
              ${L.eventDomainFilterItems(state.referentiels.domaines).map((item) => (
                item.type === 'separator'
                  ? '<option disabled class="scope-domain-sep">────────</option>'
                  : `<option value="${escapeHtml(item.code)}">${escapeHtml(item.label)}</option>`
              )).join('')}
            </select>
          </div>
          <button type="button" class="scope-btn scope-btn-primary scope-events-new" id="scope-new">Nouvel événement</button>
        </div>
        <p class="scope-mode-hint">La création manuelle reste disponible pour un événement ponctuel. Les imports sont regroupés dans Réglages → Importation.</p>
        <div class="scope-card scope-table-wrap scope-events-list-wrap">
          <table class="scope-table scope-events-list-table">
            <thead>
              <tr>
                ${sortableHeader('events', 'date', 'DATE', state.eventSort)}
                ${sortableHeader('events', 'libelle', 'ÉVÉNEMENT', state.eventSort)}
                ${sortableHeader('events', 'domaine', 'DOMAINE', state.eventSort)}
                ${sortableHeader('events', 'public', 'PUBLIC / OI', state.eventSort)}
                ${sortableHeader('events', 'effectif', 'EFFECTIF', state.eventSort)}
                ${sortableHeader('events', 'etat', 'ÉTAT', state.eventSort)}
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
          ${pagination}
        </div>
      </div>
    `;
  }

  function cycleRoleLabel(role) {
    const code = String(role || '').toUpperCase();
    if (code === 'FORMATEUR') return 'Formateur';
    if (code === 'MONITEUR') return 'Moniteur JSP';
    if (code === 'SURVEILLANT') return 'Surveillant';
    if (code === 'AUXILIAIRE') return 'Auxiliaire';
    return 'Participant';
  }

  function cycleStatutLabel(statut) {
    const code = String(statut || '').toUpperCase();
    if (code === 'DISPENSE') return 'Dispensé';
    if (code === 'EXCLU') return 'Exclu';
    if (code === 'NON_RENSEIGNE') return 'Non renseigné';
    return 'Actif';
  }

  function cycleMetric(metrics, key) {
    return Number((metrics && metrics[key]) || 0);
  }

  function renderCycles() {
    const rows = state.cycles || [];
    let body;
    if (state.cyclesError) {
      body = `<tr><td colspan="8"><div class="scope-empty scope-state-error" role="alert">${escapeHtml(state.cyclesError)}</div></td></tr>`;
    } else if (!state.cyclesReady) {
      body = `<tr><td colspan="8"><div class="scope-loading-row" role="status">Chargement des cycles…</div></td></tr>`;
    } else if (!rows.length) {
      body = '<tr><td colspan="8"><div class="scope-empty">Aucun cycle de spécialisation sur cette période.</div></td></tr>';
    } else {
      body = rows.map((cycle) => {
        const metrics = cycle.metrics || {};
        const period = [cycle.date_debut, cycle.date_fin].filter(Boolean).map(L.formatDate).join(' – ') || '—';
        return `<tr>
          <td data-label="Cycle"><a href="#/cycles/${escapeHtml(cycle.cycle_id)}">${escapeHtml(cycle.libelle)}</a></td>
          <td data-label="Spécialisation">${escapeHtml(cycle.type_cycle || cycle.domaine_code || '—')}</td>
          <td data-label="Période">${escapeHtml(period)}</td>
          <td data-label="Statut">${statutBadge(cycle.statut || 'PLANIFIE')}</td>
          <td data-label="Population">${escapeHtml(String(cycle.populationCount ?? cycleMetric(metrics, 'populationDistincte')))}</td>
          <td data-label="Présents">${escapeHtml(String(cycleMetric(metrics, 'participantsReconnusDistincts')))}</td>
          <td data-label="Sessions">${escapeHtml(String(cycle.eventCount || 0))}</td>
          <td data-label="Actions"><a class="scope-btn" href="#/cycles/${escapeHtml(cycle.cycle_id)}">Ouvrir</a></td>
        </tr>`;
      }).join('');
    }
    return `
      <div class="scope-crumb">Activité / Cycles</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Spécialisations', title: 'Cycles', context: state.year, description: 'Cycles PAPR et AUTO rattachés aux événements SCOPE.', logo: true })}
        ${periodContextHtml()}
        <div class="scope-toolbar">
          <div class="scope-field">
            <label>Domaine</label>
            <select id="cycle-filter-domaine">
              <option value="tous">Tous</option>
              <option value="PR">PR</option>
              <option value="AUTO">AUTO</option>
            </select>
          </div>
          <div class="scope-field">
            <label>Statut</label>
            <select id="cycle-filter-statut">
              <option value="tous">Tous</option>
              <option value="PLANIFIE">Planifié</option>
              <option value="EN_COURS">En cours</option>
              <option value="TERMINE">Terminé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
        </div>
        <div class="scope-card scope-table-wrap">
          <table class="scope-table">
            <thead><tr><th>Cycle</th><th>Spécialisation</th><th>Période</th><th>STATUT</th><th>Population</th><th>Présents</th><th>Sessions</th><th>Actions</th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCycle() {
    const detail = state.cycleDetail;
    if (state.cycleDetailError) {
      return `<div class="scope-crumb"><a href="#/cycles">Cycles</a></div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Spécialisations', title: 'Cycle', context: 'Erreur', logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.cycleDetailError)}</p></div></div>`;
    }
    if (!state.cycleDetailReady || !detail) {
      return `<div class="scope-crumb"><a href="#/cycles">Cycles</a></div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Spécialisations', title: 'Cycle', context: 'Chargement', logo: true })}<div class="scope-card scope-placeholder"><p>Chargement du cycle…</p></div></div>`;
    }
    const cycle = detail.cycle || {};
    const metrics = detail.metrics || {};
    const evenements = detail.evenements || [];
    const personnes = detail.personnes || [];
    const period = [cycle.date_debut, cycle.date_fin].filter(Boolean).map(L.formatDate).join(' – ') || '—';
    const eventRows = evenements.length ? evenements.map((ev) => `<tr>
      <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
      <td data-label="Code">${escapeHtml(ev.code_cours || ev.identifiant_externe || '—')}</td>
      <td data-label="Événement"><a href="#/exercices/${escapeHtml(ev.evenement_id)}">${escapeHtml(ev.libelle)}</a></td>
      <td data-label="État">${statutBadge(ev.statut)}</td>
    </tr>`).join('') : '<tr><td colspan="4"><div class="scope-empty">Aucune session rattachée.</div></td></tr>';
    const peopleRows = personnes.length ? personnes.map((p) => `<tr>
      <td data-label="Nom">${escapeHtml([p.grade, p.nom, p.prenom].filter(Boolean).join(' ') || 'Personne')}</td>
      <td data-label="NIP">${escapeHtml(p.nip || '—')}</td>
      <td data-label="Rôle">${escapeHtml(cycleRoleLabel(p.role_cycle))}</td>
      <td data-label="Statut">${escapeHtml(cycleStatutLabel(p.statut_cycle))}</td>
      <td data-label="Session">${escapeHtml(p.session_event_id || p.participated_event_id || '—')}</td>
      <td data-label="Exception">${escapeHtml(p.exception_type || '—')}</td>
    </tr>`).join('') : '<tr><td colspan="6"><div class="scope-empty">Aucune personne rattachée.</div></td></tr>';
    return `
      <div class="scope-crumb"><a href="#/cycles">Cycles</a> / ${escapeHtml(cycle.libelle || 'Cycle')}</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Spécialisations', title: cycle.libelle || 'Cycle', context: `${cycle.type_cycle || cycle.domaine_code || '—'} · ${period}`, logo: true })}
        <div class="scope-kpis">
          <article class="scope-kpi scope-kpi-main"><strong>${escapeHtml(String(cycleMetric(metrics, 'populationDistincte')))}</strong><span>Population suivie</span><em>${escapeHtml(cycle.statut || 'PLANIFIE')}</em></article>
          <article class="scope-kpi"><strong>${escapeHtml(String(cycleMetric(metrics, 'participantsReconnusDistincts')))}</strong><span>Présents reconnus</span></article>
          <article class="scope-kpi"><strong>${escapeHtml(String(cycleMetric(metrics, 'formateursDistincts') + cycleMetric(metrics, 'moniteursDistincts') + cycleMetric(metrics, 'surveillantsDistincts') + cycleMetric(metrics, 'auxiliairesDistincts')))}</strong><span>Encadrement visible</span><small>Hors comptage sauf population spécialisée</small></article>
          <article class="scope-kpi"><strong>${escapeHtml(L.formatTaux(metrics.tauxParticipationCycle && metrics.tauxParticipationCycle.percentage))}</strong><span>Taux cycle</span></article>
        </div>
        <div class="scope-card">
          <h2 style="margin-top:0">Identité métier</h2>
          <dl class="scope-meta">
            <div><dt>STAT.COM</dt><dd>${escapeHtml(cycle.stat_com || '—')}</dd></div>
            <div><dt>QUI</dt><dd>${escapeHtml(cycle.qui || '—')}</dd></div>
            <div><dt>Clé</dt><dd>${escapeHtml(cycle.cycle_key || '—')}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(cycle.source_type || 'MANUEL')}</dd></div>
          </dl>
        </div>
        <div class="scope-card scope-table-wrap" style="margin-top:12px">
          <h2>Sessions</h2>
          <table class="scope-table"><thead><tr><th>Date</th><th>Code</th><th>Événement</th><th>État</th></tr></thead><tbody>${eventRows}</tbody></table>
        </div>
        <div class="scope-card scope-table-wrap" style="margin-top:12px">
          <h2>Population et rôles</h2>
          <table class="scope-table"><thead><tr><th>Nom</th><th>NIP</th><th>Rôle</th><th>Statut</th><th>Session</th><th>Exception</th></tr></thead><tbody>${peopleRows}</tbody></table>
        </div>
      </div>
    `;
  }

  function periodLabel(period) {
    if (!period) return state.year;
    if (period.preset === 'MONTH') return `${period.from.slice(5, 7)}.${period.from.slice(0, 4)}`;
    if (period.preset === 'SEMESTER') return `${period.from.slice(5, 7) === '07' ? 'S2' : 'S1'} ${period.from.slice(0, 4)}`;
    if (period.preset === 'QUARTER') return `${period.from.slice(0, 10)} → ${period.to.slice(0, 10)}`;
    if (period.preset === 'CUSTOM') return `${L.formatDate(period.from)} – ${L.formatDate(period.to)}`;
    return period.from ? period.from.slice(0, 4) : state.year;
  }

  function renderVue() {
    const r = route();
    const dash = state.dashboard;
    const crumbs = ['<a href="#/vue">Domaines</a>'];
    if (r.domaine) crumbs.push(`<a href="#/vue/${encodeURIComponent(r.domaine)}">${escapeHtml(domaineLabel(r.domaine))}</a>`);
    if (r.cible) crumbs.push(`<span>${escapeHtml(r.cible)}</span>`);
    if (state.dashboardError) {
      return `<div class="scope-crumb">${crumbs.join(' / ')}</div>
        <div class="scope-main">${pageHeaderHtml({ eyebrow: r.domaine ? 'Domaine' : 'Vue globale', title: domaineLabel(r.domaine || 'SDIS'), context: r.cible ? L.niveauAffiche(r.domaine, r.cible) : 'Vue d’ensemble', logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.dashboardError)}</p></div></div>`;
    }
    if (!dash) {
      return `<div class="scope-crumb">${crumbs.join(' / ')}</div>
        <div class="scope-main">${pageHeaderHtml({ eyebrow: r.domaine ? 'Domaine' : 'Vue globale', title: domaineLabel(r.domaine || 'SDIS'), context: r.cible ? L.niveauAffiche(r.domaine, r.cible) : 'Vue d’ensemble', logo: true })}<div class="scope-card scope-placeholder"><p>${escapeHtml(L.loadingMessage('dashboard'))}</p></div></div>`;
    }
    const o = dash.officiel || {};
    const obj = L.objectiveKpiLabel(o);
    const gapText = L.formatGap(o.gapPct);
    const status = o.analyticStatus || 'NON_EVALUABLE';
    const tauxText = status === 'NON_EVALUABLE' && o.percentage == null
      ? 'Non évaluable'
      : L.formatTaux(o.percentage);
    const numDen = o.denominator
      ? `${o.numerator ?? 0} / ${o.denominator}`
      : 'Aucun événement officiel réalisé';
    const legacyHint = dash.legacy && dash.legacy.eventCount
      ? `+ ${dash.legacy.eventCount} historique${dash.legacy.eventCount > 1 ? 's' : ''}`
      : '';
    const abs = dash.absencesNonExcusees || { count: 0, events: [] };
    const alertItems = ((dash.alerts && dash.alerts.alerts) || []).filter((alert) => (
      state.includeQualification || !L.isQualificationEvenement({
        libelle: alert.title,
        origine: alert.metadata && alert.metadata.origine,
        identifiant_externe: alert.metadata && (alert.metadata.identifiantExterne || alert.metadata.identifiant_externe)
      })
    ));
    const p0Alerts = alertItems.filter((a) => a.level === 'P0');
    const p1Alerts = alertItems.filter((a) => a.level === 'P1');
    const p2Alerts = alertItems.filter((a) => a.level === 'P2');
    const explain = dash.explain || {};
    const exclusions = explain.exclusions || {};
    const graphs = dash.graphs || {};
    const C = (typeof window !== 'undefined' && window.ScopeCharts)
      || (typeof globalThis !== 'undefined' && globalThis.ScopeCharts);
    const evolutionCard = C
      ? C.renderChartCard(graphs.evolution, { size: { width: 640, height: 128 } })
      : '';
    const domainChart = C ? C.renderChartCard(graphs.domaines) : '';
    const childrenChart = C ? C.renderChartCard(graphs.children) : '';
    const compositionChart = C ? C.renderChartCard(graphs.composition) : '';
    const motifsChart = C ? C.renderChartCard(graphs.motifs) : '';
    const permutationChart = (C && L.shouldRenderPermutations(r.domaine, graphs.permutations))
      ? C.renderChartCard(graphs.permutations)
      : '';
    const openGraph = state.graphExplainId && graphs[state.graphExplainId];
    const graphExplainHtml = C && openGraph ? C.renderGraphExplain(openGraph, explain) : '';

    const kpi = `
      <div class="scope-kpis">
        <article class="scope-kpi scope-kpi-main">
          <strong>${escapeHtml(tauxText)}</strong>
          <span>Taux de participation</span>
          <em>${escapeHtml(numDen)}</em>
          <small>${escapeHtml(periodLabel(dash.period))} · officiel · LEGACY exclu</small>
          <span class="scope-status-pill ${escapeHtml(status)}">${escapeHtml(L.analyticStatusLabel(status))}</span>
          <button type="button" class="linkish" id="scope-explain-toggle">Comprendre ce chiffre</button>
        </article>
        <article class="scope-kpi">
          <strong>${escapeHtml(obj.title)}</strong>
          <span>Objectif</span>
          ${obj.subtitle ? `<em>${escapeHtml(obj.subtitle)}</em>` : ''}
        </article>
        <article class="scope-kpi">
          <strong>${gapText ? escapeHtml(gapText) : '—'}</strong>
          <span>Écart à l’objectif</span>
          ${!gapText ? '<small>Non évaluable sans objectif unique</small>' : ''}
        </article>
        <article class="scope-kpi">
          <strong>${escapeHtml(String(o.eventCount || 0))}</strong>
          <span>Événements réalisés</span>
          <em>Nominatif et quantitatif</em>
          ${legacyHint ? `<small>${escapeHtml(legacyHint)}</small>` : '<small>LEGACY non additionné</small>'}
        </article>
        <article class="scope-kpi">
          <strong>${escapeHtml(String(abs.count || 0))}</strong>
          <span>Absences non excusées</span>
          ${abs.count ? '<button type="button" class="linkish" id="scope-absences-toggle">Voir les événements</button>' : '<small>Volume officiel de la période</small>'}
        </article>
      </div>`;

    const explainHtml = state.explainOpen ? `
      <div class="scope-card scope-explain" id="scope-explain">
        <h2>Comprendre ce chiffre</h2>
        <dl>
          <dt>Période</dt><dd>${escapeHtml(dash.period.from)} → ${escapeHtml(dash.period.to)} (${escapeHtml(dash.period.preset || 'YEAR')})</dd>
          <dt>Périmètre</dt><dd>${escapeHtml([r.domaine || 'SDIS', r.cible].filter(Boolean).join(' / '))}</dd>
          <dt>Modes inclus</dt><dd>NOMINATIF et QUANTITATIF. LEGACY exclu du taux officiel.</dd>
          <dt>Événements inclus</dt><dd>${escapeHtml(String((explain.includedEvents || []).length))} réalisé(s) officiel(s)</dd>
          <dt>Numérateur</dt><dd>${escapeHtml(String((explain.totals && explain.totals.numerator) ?? o.numerator ?? 0))}</dd>
          <dt>Dénominateur</dt><dd>${escapeHtml(String((explain.totals && explain.totals.denominator) ?? o.denominator ?? 0))}</dd>
          <dt>Dispensés exclus</dt><dd>${escapeHtml(String(exclusions.dispenses || 0))}</dd>
          <dt>Annulés exclus</dt><dd>${escapeHtml(String(exclusions.annules || 0))}</dd>
          <dt>Reportés exclus</dt><dd>${escapeHtml(String(exclusions.reportes || 0))}</dd>
          <dt>Legacy exclu</dt><dd>${escapeHtml(String(exclusions.legacy || (dash.legacy && dash.legacy.eventCount) || 0))} agrégat(s) historique(s)</dd>
          <dt>Objectif utilisé</dt><dd>${explain.objective && explain.objective.thresholdPct != null ? `${escapeHtml(String(explain.objective.thresholdPct))} %` : 'Aucun'}</dd>
          <dt>Origine de l’objectif</dt><dd>${escapeHtml((explain.objective && explain.objective.scope) || (explain.objectiveContext && explain.objectiveContext.reason) || 'OBJECTIVE_NOT_FOUND')}</dd>
          <dt>Statut analytique</dt><dd>${escapeHtml(explain.analyticStatus || status)}${explain.analyticStatusReason ? ` · ${escapeHtml(explain.analyticStatusReason)}` : ''}</dd>
        </dl>
      </div>` : '';

    const absHtml = state.absencesOpen && abs.events && abs.events.length ? `
      <div class="scope-card scope-panel">
        <h2>Absences non excusées</h2>
        <ul>${abs.events.map((ev) => `<li><a href="#/exercices/${escapeHtml(ev.evenementId)}">${escapeHtml(L.formatDate(ev.date))} · ${escapeHtml(domaineLabel(ev.domaine))} · ${escapeHtml(ev.libelle)}</a> — ${escapeHtml(String(ev.nonExcuses))}</li>`).join('')}</ul>
      </div>` : '';

    const p0Html = p0Alerts.length
      ? `<div class="scope-alert-list">${p0Alerts.map((alert) => alertCardHtml(alert, { ack: false })).join('')}</div>`
      : `<div class="scope-empty">Aucun événement à traiter</div>`;
    const p1Html = p1Alerts.length
      ? `<div class="scope-card scope-inbox scope-inbox-p1">
          <h2>Points de vigilance</h2>
          <div class="scope-alert-list">${p1Alerts.map((alert) => alertCardHtml(alert, { ack: true })).join('')}</div>
        </div>`
      : '';
    const p2Html = p2Alerts.length
      ? `<div class="scope-alert-info">
          <h2>Informations</h2>
          <ul>${p2Alerts.map((alert) => `<li><strong>${escapeHtml(alert.title)}</strong> — ${escapeHtml(alert.message)} <a href="${escapeHtml(alert.actionHref)}">${escapeHtml(alert.actionLabel)}</a></li>`).join('')}</ul>
        </div>`
      : '';

    const eventRows = r.cible && (dash.evenements || []).length
      ? `<div class="scope-card scope-table-wrap scope-panel">
          <h2>Événements officiels</h2>
          <table class="scope-table">
            <thead><tr><th>Date</th><th>Libellé</th><th>Mode</th><th>Taux</th><th></th></tr></thead>
            <tbody>${dash.evenements.map((ev) => `<tr>
              <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
              <td data-label="Libellé">${escapeHtml(ev.libelle)}</td>
              <td data-label="Mode">${escapeHtml(L.modeLabel(ev.modeSuivi))}</td>
              <td data-label="Taux">${escapeHtml(L.formatTaux(ev.percentage))}</td>
              <td data-label="Action"><a class="scope-btn" href="#/exercices/${escapeHtml(ev.evenementId)}">${ev.modeSuivi === 'NOMINATIF' ? 'Ouvrir' : 'Agrégats'}</a></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>`
      : '';

    const legacyNote = dash.legacy && dash.legacy.eventCount
      ? `<p class="scope-inbox-reason">Les ${dash.legacy.eventCount} agrégats LEGACY apparaissent uniquement comme série historique distincte. Ils n’entrent pas dans le taux officiel.</p>`
      : '';

    return `
      <div class="scope-crumb">${crumbs.join(' / ')}</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: r.domaine ? 'Domaine' : 'Vue globale', title: domaineLabel(r.domaine || 'SDIS'), context: r.cible ? L.niveauAffiche(r.domaine, r.cible) : 'Vue d’ensemble', description: 'Lecture métier du périmètre sélectionné, sans recalcul de KPI dans le navigateur.', logo: !r.cible })}
        ${periodContextHtml()}
        ${kpi}
        ${explainHtml}
        ${absHtml}
        <div class="scope-dash-split">
          <div class="scope-card scope-inbox">
            <h2>À traiter</h2>
            ${p0Html}
          </div>
          ${evolutionCard || `<div class="scope-card scope-chart-card is-empty"><h2>Comment évolue notre taux de participation ?</h2><p class="scope-empty scope-chart-empty">Aucune série officielle sur cette période.</p></div>`}
        </div>
        ${legacyNote}
        ${graphExplainHtml}
        ${p1Html}
        ${p2Html}
        ${domainChart ? `<div class="scope-graph-stack">${domainChart}</div>` : ''}
        ${childrenChart ? `<div class="scope-graph-stack">${childrenChart}</div>` : ''}
        ${compositionChart || motifsChart ? `<div class="scope-graph-grid">${compositionChart}${motifsChart}</div>` : ''}
        ${permutationChart ? `<div class="scope-graph-stack">${permutationChart}</div>` : ''}
        ${eventRows}
        ${!r.domaine ? `<p class="scope-inst-line"><img src="assets/img/LogoSDISseulnoir.png" alt="" width="120" height="36">SDIS régional du Nord vaudois</p>` : ''}
      </div>
    `;
  }

  function canReadPersonnel() {
    if (window.MonitoringRBAC && typeof window.MonitoringRBAC.has === 'function') {
      return window.MonitoringRBAC.has('personnel:read');
    }
    const permissions = (state.session && state.session.permissions) || [];
    return permissions.includes('personnel:read');
  }

  function qualQuery() {
    return { includeQualification: state.includeQualification ? '1' : '0' };
  }

  function periodQuery() {
    return Object.assign(L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
      semester: state.semester,
      from: state.from,
      to: state.to
    }), qualQuery());
  }

  async function loadPersonnelDirectory() {
    if (typeof client.listPersonnelDirectory !== 'function' || !canReadPersonnel()) {
      state.personnelDirectory = null;
      state.personnelReady = true;
      state.personnelError = null;
      return;
    }
    state.personnelError = null;
    state.personnelReady = false;
    state.personnelDirectory = null;
    const seq = (state.personnelListSeq = (state.personnelListSeq || 0) + 1);
    try {
      const temporal = window.ScopePersonnelTemporal;
      const period = temporal && temporal.resolveAnalyzedPeriod
        ? temporal.resolveAnalyzedPeriod({
            preset: state.preset,
            year: state.year,
            month: state.month,
            quarter: state.quarter,
            semester: state.semester,
            from: state.from,
            to: state.to
          })
        : { from: state.from, to: state.to, preset: state.preset, year: state.year };
      const payload = await client.listPersonnelDirectory({
        statut: state.personnelStatut === 'tous' ? 'all' : state.personnelStatut,
        from: period.from,
        to: period.to,
        preset: period.preset || state.preset,
        year: period.year || state.year,
        asOf: state.personnelSituationApplied ? (state.personnelSituationDate || '') : ''
      });
      if (seq !== state.personnelListSeq) return;
      state.personnelDirectory = normalizePersonnelDirectory(payload);
      state.personnelReady = true;
    } catch (error) {
      if (seq !== state.personnelListSeq) return;
      state.personnelError = L.friendlyError(error).message || L.errorMessage('personnel');
      state.personnelReady = true;
      throw error;
    }
  }

  async function loadPersonneFiche(id) {
    if (typeof client.getPersonneFiche !== 'function' || !canReadPersonnel()) {
      state.personneFiche = null;
      return;
    }
    const prev = state.personneFiche && state.personneFiche.identite && state.personneFiche.identite.personneId;
    state.personneFiche = await client.getPersonneFiche(id, periodQuery());
    if (prev !== id) {
      state.personneEventFilter = 'tout';
      state.personneDomainFilter = null;
    }
  }

  async function reloadPersonneFiche(id) {
    await loadPersonneFiche(id);
    state.personneEdit = null;
    render();
  }

  function canManagePersonnel() {
    if (window.MonitoringRBAC && typeof window.MonitoringRBAC.has === 'function') {
      return window.MonitoringRBAC.has('personnel:manage');
    }
    const permissions = (state.session && state.session.permissions) || [];
    return permissions.includes('personnel:manage');
  }


  function personnelRowClass(row) {
    const display = personnelDisplay();
    const kind = display && display.previewRowKind ? display.previewRowKind(row) : '';
    if (kind === 'error' || row.statut === 'CONFLIT' || row.statut === 'ERREUR') return 'is-conflict';
    if (kind === 'anomaly') return 'is-anomaly';
    if (kind === 'info') return 'is-info';
    return '';
  }

  function personnelPillClass(statut, row) {
    const display = personnelDisplay();
    if (row && display && display.situationPillClass) return display.situationPillClass(row);
    if (statut === 'ERREUR' || statut === 'ERROR' || statut === 'CONFLIT') return 'err';
    if (statut === 'INCHANGE' || statut === 'IDENTICAL') return 'ok';
    if (statut === 'ABSENT_DU_FICHIER') return 'warn';
    return 'warn';
  }

  function personnelPreviewSourceRows(preview) {
    if (!preview) return [];
    if (preview.rows && preview.rows.length) return preview.rows;
    if (preview.lines && preview.lines.length) return preview.lines;
    return (preview.lignes || []).concat(preview.absents || []) || [];
  }

  function personnelDisplay() {
    return window.ScopePersonnelDisplay || null;
  }

  function personnelRowId(row) {
    const display = personnelDisplay();
    if (display && display.personnelImportRowId) return display.personnelImportRowId(row);
    return String((row && (row.rowId || row.lineNumber)) || '');
  }

  function personnelVisibleRows(preview) {
    const source = personnelPreviewSourceRows(preview);
    const display = personnelDisplay();
    if (display && display.filterPreviewRows) {
      return display.filterPreviewRows(source, state.personnelSync.filter);
    }
    const rows = display && display.previewDetailRows ? display.previewDetailRows(source) : source.filter((row) => {
      const status = row.statut || row.status;
      return status !== 'INCHANGE' && status !== 'IDENTICAL';
    });
    const filter = state.personnelSync.filter;
    if (filter === 'TOUS' || filter === 'CHANGEMENTS') return rows;
    if (filter === 'NOUVEAU') return rows.filter((row) => row.statut === 'NOUVEAU' || row.statut === 'NEW_PERSON' || row.statut === 'NEW_JSP');
    if (filter === 'CHANGEMENT_OI') return rows.filter((row) => row.statut === 'CHANGEMENT_OI' || row.statut === 'NEW_ASSIGNMENT' || row.statut === 'MISSING_ASSIGNMENT');
    if (filter === 'CHANGEMENT_GRADE') return rows.filter((row) => row.statut === 'CHANGEMENT_GRADE' || (row.diff && row.diff.person && row.diff.person.grade));
    if (filter === 'CONFLIT') return rows.filter((row) => row.statut === 'CONFLIT' || row.statut === 'ERROR' || row.statut === 'ERREUR');
    if (filter === 'ABSENT_DU_FICHIER') return rows.filter((row) => row.statut === 'ABSENT_DU_FICHIER' || row.statut === 'ABSENT_DU_NOUVEL_IMPORT');
    return rows.filter((row) => row.statut === filter || row.proposition === filter);
  }

  function personnelDecisionOf(row) {
    const id = personnelRowId(row);
    const patch = state.personnelSync.decisions[id];
    if (patch && patch.decision) return patch.decision;
    if (row && row.decision) return row.decision;
    const display = personnelDisplay();
    if (display && display.personnelImportDefaultDecision) return display.personnelImportDefaultDecision(row);
    return 'IGNORER';
  }

  function personnelDateOf(row) {
    const id = personnelRowId(row);
    const patch = state.personnelSync.decisions[id];
    return (patch && patch.dateEffet) || row.dateEffet || state.personnelSync.dateEffet || '';
  }

  function personnelRequiresDecision(row) {
    const status = String(row && (row.statut || row.status) || '').toUpperCase();
    return status === 'MODIFIED' || status === 'MODIFICATION_IDENTITE';
  }

  function personnelImportDecisionsComplete(preview) {
    const rows = (preview && (preview.rows || preview.detail || preview.lines)) || [];
    return rows.every((row) => {
      if (!personnelRequiresDecision(row)) return true;
      const decision = String(personnelDecisionOf(row) || '').toUpperCase();
      return decision === 'APPLIQUER' || decision === 'IGNORER' || decision === 'CONSERVER';
    });
  }

  function personnelDecisionSelect(row) {
    const current = personnelDecisionOf(row);
    let options = [];
    if (row.statut === 'ABSENT_DU_FICHIER' || row.statut === 'ABSENT_DU_NOUVEL_IMPORT') {
      options = [
        ['CONSERVER', 'Conserver'],
        ['CLOTURER', 'Clôturer l’affectation absente'],
        ['ARCHIVER_SORTI', 'Démission SDIS'],
        ['IGNORER', 'Ne rien faire']
      ];
    } else if (row.statut === 'ARCHIVE_RETROUVE') {
      options = [
        ['EXAMINER', 'Examiner'],
        ['IGNORER', 'Ne rien faire'],
        ['REACTIVER', 'Réactiver']
      ];
    } else if (row.statut === 'CONFLIT') {
      options = [
        ['EXAMINER', 'Examiner'],
        ['IGNORER', 'Ignorer'],
        ['MODIFIER_IDENTITE', 'Corriger l’identité']
      ];
    } else if (personnelRequiresDecision(row)) {
      options = [
        ['EXAMINER', 'Décision requise'],
        ['APPLIQUER', 'Appliquer les modifications'],
        ['IGNORER', 'Conserver les données actuelles']
      ];
    } else if (row.statut === 'NOUVEAU' || row.statut === 'NEW_PERSON' || row.statut === 'NEW_JSP') {
      options = [['CREER', 'Créer'], ['IGNORER', 'Ignorer']];
    } else if (row.statut === 'INCHANGE' || row.statut === 'IDENTICAL' || row.status === 'IDENTICAL') {
      return '<span class="scope-sync-decision-none">Aucune</span>';
    } else {
      options = [['APPLIQUER', 'Appliquer'], ['IGNORER', 'Ignorer'], ['EXAMINER', 'Examiner']];
    }
    return `<select class="scope-sync-decision" data-sync-decision="${escapeHtml(personnelRowId(row))}">
      ${options.map(([value, label]) => `<option value="${value}" ${current === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
    </select>`;
  }

  function oiFilterOptions() {
    const display = personnelDisplay();
    if (display && display.operationalOiOptions) {
      return display.operationalOiOptions(state.referentiels.cibles || []);
    }
    return ['DPS G1', 'DPS C1', 'DPS B1', 'DPS B2', 'DAP Y1', 'DAP Y2', 'DAP Y3', 'DAP Y4', 'JSP G1', 'JSP C1', 'JSP B1'];
  }

  function personnelYearChoices() {
    const current = Number(state.year) || new Date().getFullYear();
    const years = [];
    for (let y = current - 6; y <= current + 2; y += 1) years.push(String(y));
    return years;
  }

  function personnelPeriodMode() {
    return state.preset === 'YEAR' ? 'YEAR' : 'CUSTOM';
  }

  function personnelPeriodControlsHtml() {
    const mode = personnelPeriodMode();
    const years = personnelYearChoices();
    return `<section class="scope-personnel-period" aria-label="Période analysée">
      <div class="scope-personnel-period-label">Période analysée</div>
      <div class="scope-personnel-period-controls">
        <label class="scope-select"><span class="visually-hidden">Mode de période</span>
          <select id="personnel-period-mode" class="scope-select-control">
            <option value="YEAR" ${mode === 'YEAR' ? 'selected' : ''}>Année</option>
            <option value="CUSTOM" ${mode === 'CUSTOM' ? 'selected' : ''}>Personnalisée</option>
          </select>
        </label>
        ${mode === 'YEAR' ? `<label class="scope-select"><span class="visually-hidden">Année</span>
          <select id="personnel-year" class="scope-select-control">
            ${years.map((y) => `<option value="${y}" ${y === String(state.year) ? 'selected' : ''}>${escapeHtml(y)}</option>`).join('')}
          </select>
        </label>` : `<label class="scope-period-date">Du <input id="personnel-from" type="date" value="${escapeHtml(state.from || '')}"></label>
        <label class="scope-period-date">Au <input id="personnel-to" type="date" value="${escapeHtml(state.to || '')}"></label>`}
        <span class="scope-personnel-period-range">${escapeHtml((window.ScopePersonnelTemporal && window.ScopePersonnelTemporal.periodLabel({ preset: state.preset, year: state.year, from: state.from, to: state.to })) || '')}</span>
      </div>
    </section>`;
  }

  function personnelContextBannerHtml(){
    if(state.personnelSituationApplied && state.personnelSituationDate){
      const label = (window.ScopePersonnelDisplay && window.ScopePersonnelDisplay.formatPersonnelDate)
        ? window.ScopePersonnelDisplay.formatPersonnelDate(state.personnelSituationDate)
        : state.personnelSituationDate;
      return `<div class="scope-personnel-context is-asof" role="status">
        <div>
          <strong>Situation historique</strong>
          <span>Au ${escapeHtml(label)} — personnes actives à cette date, pas sur la période.</span>
        </div>
        <button type="button" class="scope-btn" id="scope-quit-personnel-asof">Quitter la situation historique</button>
      </div>`;
    }
    return `<div class="scope-personnel-context is-period" role="status">
      <strong>Période analysée</strong>
      <span>Actifs = au moins un jour d’activité dans la plage affichée.</span>
    </div>`;
  }

  function oiFilterSelectHtml() {
    const display = personnelDisplay();
    const groups = display && display.operationalOiGroups
      ? display.operationalOiGroups(state.referentiels.cibles || [])
      : [
          { label: 'DPS', items: ['DPS G1', 'DPS C1', 'DPS B1', 'DPS B2'] },
          { label: 'DAP', items: ['DAP Y1', 'DAP Y2', 'DAP Y3', 'DAP Y4'] },
          { label: 'JSP', items: ['JSP G1', 'JSP C1', 'JSP B1'] }
        ];
    return `<select id="personnel-oi">
            <option value="">Tous</option>
            ${groups.map((group) => `<optgroup label="${escapeHtml(group.label)}">${group.items.map((label) => `<option value="${escapeHtml(label)}" ${state.personnelOi === label ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</optgroup>`).join('')}
          </select>`;
  }

  function specializationFilterOptions() {
    const display = personnelDisplay();
    if (display && display.specializationFilterOptions) return display.specializationFilterOptions();
    return ['FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'PR-ABC', 'cond VL', 'cond PL', 'JSP'];
  }

  function visiblePersonnelRows() {
    const dir = state.personnelDirectory;
    const people = (dir && dir.personnes) || [];
    const display = personnelDisplay();
    const temporal = window.ScopePersonnelTemporal;
    const period = temporal && temporal.resolveAnalyzedPeriod
      ? temporal.resolveAnalyzedPeriod({ preset: state.preset, year: state.year, from: state.from, to: state.to })
      : { to: state.to };
    const filtered = display && display.filterPersonnelRows
      ? display.filterPersonnelRows(people, {
          q: state.personnelQuery,
          statut: state.personnelStatut,
          oi: state.personnelOi,
          specialization: state.personnelSpecialization,
          asOf: state.personnelSituationApplied ? (state.personnelSituationDate || '') : '',
          period
        })
      : people;
    if (display && display.sortPersonnelRows) return display.sortPersonnelRows(filtered, state.personnelSort);
    return filtered;
  }

  function personnelListPageSize() {
    const n = Number(state.personnelListPageSize);
    return EVENT_LIST_PAGE_SIZES.indexOf(n) >= 0 ? n : 12;
  }

  function renderPersonnelListPagination(total, page, pageSize) {
    if (!total) return '';
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const sizeOpts = EVENT_LIST_PAGE_SIZES.map((n) => `<option value="${n}" ${n === pageSize ? 'selected' : ''}>${n}</option>`).join('');
    const pager = totalPages > 1
      ? `<div class="scope-pagination-controls">
          <button type="button" class="scope-btn scope-btn-compact" id="personnel-page-prev" ${page <= 1 ? 'disabled' : ''}>Précédent</button>
          <button type="button" class="scope-btn scope-btn-compact" id="personnel-page-next" ${page >= totalPages ? 'disabled' : ''}>Suivant</button>
        </div>`
      : '';
    return `<nav class="scope-pagination" aria-label="Pagination du personnel">
      <p class="scope-page-status">${total} personne${total > 1 ? 's' : ''}${totalPages > 1 ? ` · page ${page} / ${totalPages}` : ''}</p>
      <div class="scope-pagination-group">
        ${pager}
        <label class="scope-page-size" for="personnel-page-size">Lignes
          <select id="personnel-page-size" class="scope-select-control">${sizeOpts}</select>
        </label>
      </div>
    </nav>`;
  }

  function sortableHeader(table, key, label, sort) {
    const s = L.sortHeaderState ? L.sortHeaderState(sort, key) : { className: '', ariaSort: 'none', indicator: '' };
    const attr = table === 'personnel' ? 'data-personnel-sort' : `data-scope-sort="${table}" data-sort-key`;
    const data = table === 'personnel'
      ? `data-sort="${escapeHtml(key)}" ${attr}="${escapeHtml(key)}"`
      : `${attr}="${escapeHtml(key)}"`;
    const indicator = s.indicator ? `<span class="scope-table-sort-indicator scope-sort-indicator" aria-hidden="true">${escapeHtml(s.indicator)}</span>` : '';
    return `<th ${data} class="scope-table-sort-header scope-sortable ${s.className}" aria-sort="${s.ariaSort}" scope="col"><button type="button" class="scope-table-sort-control scope-sort-button"><span class="scope-table-sort-label">${escapeHtml(label)}</span>${indicator}</button></th>`;
  }

  function personnelSortHeader(key, label) {
    return sortableHeader('personnel', key, label, state.personnelSort);
  }

  function formatPersonnelDateCell(value) {
    const display = personnelDisplay();
    if (display && display.formatPersonnelDate) {
      const text = display.formatPersonnelDate(value);
      return text || '—';
    }
    const text = String(value || '').trim();
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    return text || '—';
  }

  function parsePersonnelOiFilter(value) {
    if (!value || value === 'tous') return {};
    const parts = String(value).split('/');
    return {
      domaine: parts[0] || '',
      cible: parts.slice(1).join('/') || ''
    };
  }

  function formatPersonnelAffectationLabel(affectation) {
    if (!affectation) return '';
    const display = personnelDisplay();
    if (display && display.formatAssignment) {
      return display.formatAssignment(affectation);
    }
    const domaine = affectation.domaineCode || affectation.domaine_code || affectation.domaine || '';
    const cible = affectation.niveauCode || affectation.niveau_code || affectation.cible || '';
    const domain = String(domaine).trim();
    const target = String(cible).replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
    if (domain && target && domain.toUpperCase() === target.toUpperCase()) return domain;
    if (domain && target && target.toUpperCase().startsWith(`${domain.toUpperCase()} `)) return target;
    const raw = affectation.label || [domain, target].filter(Boolean).join(' ');
    return String(raw || '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
  }

  function normalizePersonnelAffectation(affectation) {
    if (!affectation) return null;
    const domaine = affectation.domaine || affectation.domaineCode || affectation.domaine_code || '';
    const cible = affectation.cible || affectation.niveauCode || affectation.niveau_code || '';
    return Object.assign({}, affectation, {
      affectationId: affectation.affectationId || affectation.id,
      domaineCode: domaine,
      niveauCode: cible,
      role_domaine: affectation.role_domaine || affectation.roleDomaine || '',
      label: affectation.label || [domaine, cible].filter(Boolean).join(' '),
      dateDebut: affectation.dateDebut || affectation.date_actif || affectation.dateActif,
      dateFin: affectation.dateFin || affectation.date_inactif || affectation.dateInactif
    });
  }

  function normalizePersonnelRow(personne) {
    const affectations = (personne.affectations || personne.affectationsOuvertes || []).map(normalizePersonnelAffectation).filter(Boolean);
    const primary = affectations.find((aff) => aff.role_domaine === 'PRINCIPAL' && aff.categorie === 'OI' && !aff.dateFin)
      || affectations.find((aff) => aff.role_domaine === 'PRINCIPAL' && !aff.dateFin)
      || affectations.find((aff) => !aff.dateFin)
      || affectations[0]
      || null;
    const primaryKey = primary && (primary.affectationId || primary.label);
    return Object.assign({}, personne, {
      personneId: personne.personneId || personne.id,
      archivedAt: personne.archivedAt || personne.archived_at || null,
      dateActif: personne.dateActif || personne.date_entree_sdis || personne.dateEntreeSdis || (primary && primary.dateDebut) || '',
      dateInactif: personne.dateInactif || (primary && primary.dateFin) || '',
      affectationPrincipale: personne.affectationPrincipale || primary,
      autresAffectations: personne.autresAffectations || affectations.filter((aff) => {
        const key = aff.affectationId || aff.label;
        return !primaryKey || key !== primaryKey;
      }),
      affectationsOuvertes: affectations
    });
  }

  function normalizePersonnelDirectory(payload) {
    return Object.assign({}, payload || {}, {
      personnes: ((payload && payload.personnes) || []).map(normalizePersonnelRow)
    });
  }

  function personnelIdentityLabel(person) {
    if (!person) return '';
    return [person.grade, person.nom, person.prenom].filter(Boolean).join(' ');
  }

  function isPersonnelAssignmentOpen(assignment) {
    const temporal = window.ScopePersonnelTemporal;
    if (temporal && temporal.isOpenAssignment) return temporal.isOpenAssignment(assignment);
    const end = assignment && (assignment.dateFin || assignment.date_inactif || assignment.dateInactif);
    return Boolean(assignment) && !end;
  }

  function personnelAssignmentLabel(assignment) {
    const display = personnelDisplay();
    if (display && display.formatAssignment) {
      const label = display.formatAssignment(assignment);
      if (label) return label;
    }
    return formatPersonnelAffectationLabel(assignment) || assignment.label || 'Affectation';
  }

  function personnelOpenAssignments(person) {
    const list = (person && (person.affectationsOuvertes || person.affectations || [])) || [];
    return list.map(normalizePersonnelAffectation).filter(Boolean).filter(isPersonnelAssignmentOpen);
  }

  function ficheActivityAssignments(fiche) {
    const personne = fiche && (fiche.personne || fiche);
    const fromPersonne = ((personne && personne.affectations) || []).map(normalizePersonnelAffectation).filter(Boolean);
    if (fromPersonne.length) return fromPersonne;
    const rh = (fiche && fiche.historiqueRh && fiche.historiqueRh.affectations) || [];
    if (rh.length) {
      return rh.map((row) => normalizePersonnelAffectation({
        id: row.affectationId,
        affectationId: row.affectationId,
        domaine: row.domaineCode,
        cible: row.niveauCode,
        label: row.label,
        dateDebut: row.dateDebut,
        dateFin: row.dateFin,
        categorie: row.categorie,
        roleDomaine: row.roleDomaine || row.role_domaine
      })).filter(Boolean);
    }
    return [];
  }

  function closePersonnelRowMenu() {
    if (!state.personnelRowMenuId) return;
    state.personnelRowMenuId = null;
  }

  function positionPersonnelRowMenu() {
    const menu = document.getElementById('scope-personnel-row-menu');
    const id = state.personnelRowMenuId;
    if (!menu || !id) return;
    const trigger = document.querySelector(`[data-personnel-more="${CSS.escape(String(id))}"]`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth || 196;
    const height = menu.offsetHeight || 44;
    let left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    let top = rect.bottom - 2;
    if (top + height > window.innerHeight - 8) {
      top = Math.max(8, rect.top - height + 2);
    }
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
  }

  function personnelActivityReturnFocus(node) {
    if (!node || typeof node.focus !== 'function') return;
    try { node.focus(); } catch (_error) { /* ignore */ }
  }

  function personnelOiMeta(person, identite, assignments) {
    if (assignments && assignments[0] && assignments[0].label) return assignments[0].label;
    const first = (assignments && assignments[0]) || (personnelOpenAssignments(person) || [])[0];
    if (first) return personnelAssignmentLabel(first);
    const oi = identite && (identite.oiPrincipal || identite.oiActuel);
    if (oi && typeof oi === 'object') return oi.label || '';
    return oi || '';
  }

  function closePersonnelActivityModal() {
    if (!state.personnelInactivate) return;
    if (state.personnelInactivate.busy) return;
    const restore = state.personnelInactivate.focusNode;
    const api = personnelActivityModalApi();
    state.personnelInactivate = api && api.close ? api.close() : null;
    render();
    personnelActivityReturnFocus(restore);
  }

  function openPersonnelActivityModal(person, options) {
    const opts = options || {};
    const identite = person && (person.identite || person);
    closePersonnelRowMenu();
    const affectations = (opts.affectations || personnelOpenAssignments(person)).map((aff) => ({
      id: aff.affectationId || aff.id,
      label: personnelAssignmentLabel(aff)
    }));
    state.personnelInactivate = {
      id: identite.personneId || identite.id || person.personneId || person.id,
      nip: identite.nip || '',
      label: personnelIdentityLabel(identite),
      oiLabel: opts.oiLabel || personnelOiMeta(person, identite, affectations),
      mode: opts.mode || 'manage',
      operation: opts.operation || '',
      affectationId: opts.affectationId || '',
      affectations,
      date: '',
      dateDebut: '',
      dateFin: '',
      sabbatical: opts.sabbatical || person.sabbatical || (person.personne && person.personne.sabbatical) || null,
      comment: '',
      source: opts.source || 'directory',
      busy: false,
      error: '',
      focusNode: (typeof document !== 'undefined' && document.activeElement) || null
    };
    render();
  }

  function personnelPrimaryAffectation(personne) {
    return personne.affectationPrincipale
      || (personne.oiPrincipal ? { label: personne.oiPrincipal, dateDebut: personne.dateActif, dateFin: personne.dateInactif } : null)
      || (personne.oiActuel && typeof personne.oiActuel === 'object' ? personne.oiActuel : null)
      || (personne.oiActuel ? { label: personne.oiActuel, dateDebut: personne.dateActif, dateFin: personne.dateInactif } : null)
      || ((personne.affectationsOuvertes || [])[0])
      || null;
  }

  function personnelOtherAffectations(personne, primary) {
    const primaryKey = primary && (primary.affectationId || primary.cibleId || primary.label);
    const explicit = Array.isArray(personne.autresAffectations) ? personne.autresAffectations : null;
    const source = explicit || (personne.affectationsOuvertes || []).filter((aff) => {
      const key = aff.affectationId || aff.cibleId || aff.label;
      return !primaryKey || key !== primaryKey;
    });
    const display = personnelDisplay();
    if (display && display.formatOtherAffectations) {
      return display.formatOtherAffectations(source).labels;
    }
    return source.map(formatPersonnelAffectationLabel).filter(Boolean);
  }

  function personnelOtherAffectationsHtml(labels) {
    if (!labels.length) return '—';
    return `<span class="scope-personnel-specs">${escapeHtml(labels.join(', '))}</span>`;
  }

  function personnelSecondaryOiHtml(personne, primaryLabel) {
    const display = personnelDisplay();
    const seen = new Set([String(primaryLabel || '').toUpperCase()].filter(Boolean));
    const labels = [];
    (personne.affectationsOuvertes || personne.affectations || []).forEach((aff) => {
      if (display && display.isOperationalOiAssignment && !display.isOperationalOiAssignment(aff)) return;
      const label = (display && display.operationalOiLabel)
        ? display.operationalOiLabel(aff)
        : formatPersonnelAffectationLabel(aff);
      const key = String(label || '').toUpperCase();
      if (!label || seen.has(key)) return;
      seen.add(key);
      labels.push(label);
    });
    if (!labels.length) return '';
    return `<small class="scope-personnel-oi-secondary">${escapeHtml(labels.join(', '))}</small>`;
  }

  function personnelStatutCell(personne) {
    const display = personnelDisplay();
    const code = display && display.personTemporalStatut
      ? display.personTemporalStatut(personne)
      : (String(personne.statutTemporel || '').toLowerCase() === 'inactif' ? 'inactif' : 'actif');
    if (code === 'conge_sabbatique') {
      return `<span class="scope-personnel-statut is-sabbatical">Congé sabbatique</span>`;
    }
    const inactive = code === 'inactif';
    return `<span class="scope-personnel-statut${inactive ? ' is-inactive' : ''}">${inactive ? 'Inactif' : 'Actif'}</span>`;
  }

  function personnelImportContextOptions() {
    return [
      ['GENERAL', 'Personnel général'],
      ['PAPR', 'PAPR'],
      ['PR_ABC', 'PR-ABC'],
      ['AUTO_VL_DPS', 'cond VL — DPS'],
      ['AUTO_VL_DAP', 'cond VL — DAP'],
      ['AUTO_PL', 'cond PL'],
      ['FOBA_1', 'FOBA 1'],
      ['FOBA_2', 'FOBA 2'],
      ['FOBA_3', 'FOBA 3'],
      ['JSP_NORD_VAUDOIS', 'JSP Nord vaudois'],
      ['MONITEURS_JSP', 'Moniteurs JSP']
    ];
  }

  function jspImportSiteOptions() {
    const fromRef = (state.referentiels.cibles || []).filter((cible) => {
      const domaine = cible.domaineCode || cible.domaine_code;
      const niveau = String(cible.niveauCode || cible.niveau_code || '').toUpperCase();
      return domaine === 'JSP' && niveau !== 'CAD' && niveau !== 'GEN';
    }).map((cible) => cible.libelle || `JSP ${cible.niveauCode || cible.niveau_code}`);
    const unique = [...new Set(fromRef.length ? fromRef : ['JSP G1', 'JSP C1', 'JSP B1'])];
    return unique;
  }

  function personnelImportRequiresSite(contexte) {
    return false;
  }

  function personnelImportCount(counts, key, fallback) {
    return Number((counts && counts[key]) || (fallback && counts && counts[fallback]) || 0);
  }

  function personnelImportSummaryHtml(counts, preview) {
    const typeLabel = (preview && (preview.contextLabel || preview.populationLabel)) || '';
    const isJsp = Boolean(preview && (preview.siteJsp || preview.siteJspLabel));
    const people = personnelImportCount(counts, 'totalUniqueNips') || personnelImportCount(counts, 'totalLines');
    const identical = personnelImportCount(counts, 'countIdentical', 'IDENTICAL');
    const existing = personnelImportCount(counts, 'countExistingAssignments');
    const errors = personnelImportCount(counts, 'countErrors', 'ERROR');
    const newPersons = personnelImportCount(counts, 'countNewPersons', 'NEW_PERSON');
    const modified = personnelImportCount(counts, 'countModified', 'MODIFIED');
    const newAssignments = personnelImportCount(counts, 'countNewAssignments', 'NEW_ASSIGNMENT');
    const missing = personnelImportCount(counts, 'countMissingAssignments', 'MISSING_ASSIGNMENT');
    const divergences = newPersons + personnelImportCount(counts, 'countNewJsp', 'NEW_JSP') + modified + newAssignments + missing + errors;
    const items = [
      ['Type d’import', typeLabel],
      ['Année', (preview && preview.anneeMonitoring) || state.personnelSync.anneeMonitoring || '']
    ];
    if (isJsp) items.push(['Site JSP', (preview && (preview.siteJspLabel || preview.siteJsp)) || '—']);
    items.push(
      ['Lignes analysées', personnelImportCount(counts, 'totalLines')],
      ['Personnes uniques', personnelImportCount(counts, 'totalUniqueNips')],
      ['Identiques', identical],
      ['Nouvelles personnes', newPersons],
      ['Personnes modifiées', modified],
      ['Nouvelles affectations', newAssignments],
      ['Affectations existantes', existing],
      ['Absents du nouvel import', missing],
      ['Erreurs', errors]
    );
    if (personnelImportCount(counts, 'countNewJsp', 'NEW_JSP')) {
      items.splice(7, 0, ['Nouveaux JSP', personnelImportCount(counts, 'countNewJsp', 'NEW_JSP')]);
    }
    const itemHtml = items.map(([label, value]) => `<div class="scope-import-summary-item"><span class="scope-import-summary-label">${escapeHtml(label)}</span><span class="scope-import-summary-value">${escapeHtml(value)}</span></div>`).join('');
    return `<div class="scope-import-summary">
      <p class="scope-import-summary-hero">${escapeHtml(people)} personne${people > 1 ? 's' : ''} analysée${people > 1 ? 's' : ''} · ${escapeHtml(identical)} identique${identical > 1 ? 's' : ''} · ${escapeHtml(existing)} affectation${existing > 1 ? 's' : ''} existante${existing > 1 ? 's' : ''} · ${escapeHtml(divergences)} divergence${divergences > 1 ? 's' : ''} · ${escapeHtml(errors)} erreur${errors > 1 ? 's' : ''}</p>
      ${itemHtml}
    </div>`;
  }

  function personnelLineModification(row) {
    const display = personnelDisplay();
    if (display && display.previewModificationText) return display.previewModificationText(row);
    return row.statusLabel || row.statut || '';
  }

  function personnelLineSituation(row) {
    const display = personnelDisplay();
    if (display && display.situationLabel) return display.situationLabel(row);
    return row.statusLabel || row.statut || '';
  }

  function personnelLineAffectation(row) {
    const display = personnelDisplay();
    if (display && display.assignmentSides) {
      const sides = display.assignmentSides(row);
      return sides.proposed && sides.proposed !== '—' ? sides.proposed : (sides.current || '—');
    }
    return personnelAssignmentText((row.normalized && row.normalized.assignments) || []);
  }

  function personnelLineName(row) {
    const n = row.normalized || {};
    return [n.grade, n.prenom, n.nom].filter(Boolean).join(' ') || [row.prenom, row.nom].filter(Boolean).join(' ') || '—';
  }

  function personnelNip(row) {
    const display = personnelDisplay();
    if (display && display.previewNip) {
      const nip = display.previewNip(row);
      return nip || '—';
    }
    return row.nip || (row.normalized && row.normalized.nip) || (row.sourceNip) || (row.raw && row.raw.nip) || '—';
  }

  function personnelAssignmentText(list) {
    const display = personnelDisplay();
    if (display && display.formatAssignmentList) return display.formatAssignmentList(list) || '—';
    return (list || []).map((a) => [a.domaine, a.cible, a.role_domaine || a.roleDomaine].filter(Boolean).join(' ')).filter(Boolean).join(', ') || '—';
  }

  function personnelLineCurrent(row) {
    const display = personnelDisplay();
    if (display && display.formatIdentitySide) return display.formatIdentitySide(row, 'current');
    return '—';
  }

  function personnelLineProposed(row) {
    const display = personnelDisplay();
    if (display && display.formatIdentitySide) return display.formatIdentitySide(row, 'proposed');
    return '—';
  }

  function personnelLineCurrentAssignments(row) {
    const display = personnelDisplay();
    if (display && display.assignmentSides) return display.assignmentSides(row).current;
    return '—';
  }

  function personnelLineProposedAssignments(row) {
    const display = personnelDisplay();
    if (display && display.assignmentSides) return display.assignmentSides(row).proposed;
    return personnelAssignmentText((row.normalized && row.normalized.assignments) || []);
  }

  function renderPersonnelDirectory() {
    const canRead = canReadPersonnel();
    const dir = state.personnelDirectory;
    const temporal = window.ScopePersonnelTemporal;
    const period = temporal && temporal.resolveAnalyzedPeriod
      ? temporal.resolveAnalyzedPeriod({ preset: state.preset, year: state.year, from: state.from, to: state.to })
      : { from: state.from, to: state.to, preset: state.preset, year: state.year };
    const allPeople = visiblePersonnelRows();
    const personnelView = L.listViewState({
      ready: state.personnelReady,
      error: state.personnelError,
      count: allPeople.length
    });
    const pageSize = personnelListPageSize();
    const page = personnelView === 'content' && allPeople.length
      ? Math.min(Math.max(1, Number(state.personnelListPage) || 1), Math.max(1, Math.ceil(allPeople.length / pageSize)))
      : 1;
    const people = personnelView === 'content' ? allPeople.slice((page - 1) * pageSize, page * pageSize) : [];
    const pagination = personnelView === 'content' && allPeople.length
      ? renderPersonnelListPagination(allPeople.length, page, pageSize)
      : '';
    let peopleBody;
    if (personnelView === 'error') {
      peopleBody = `<tr><td colspan="11"><div class="scope-empty scope-state-error" role="alert">${escapeHtml(state.personnelError || L.errorMessage('personnel'))}</div></td></tr>`;
    } else if (personnelView === 'loading') {
      peopleBody = `<tr><td colspan="11"><div class="scope-loading-row" role="status">${escapeHtml(L.loadingMessage('personnel'))}</div></td></tr>`;
    } else if (personnelView === 'empty') {
      peopleBody = `<tr><td colspan="11"><div class="scope-empty">${escapeHtml(L.emptyMessage('personnes'))}</div></td></tr>`;
    } else if (!allPeople.length) {
      peopleBody = `<tr><td colspan="11"><div class="scope-empty">Aucune personne ne correspond à la recherche.</div></td></tr>`;
    } else {
      peopleBody = people.map((p) => {
        const primary = personnelPrimaryAffectation(p);
        const display = personnelDisplay();
        const oiLabel = (display && display.primaryOperationalOiLabel)
          ? display.primaryOperationalOiLabel(p)
          : formatPersonnelAffectationLabel(primary);
        const specLabels = (display && display.formatSpecializations)
          ? display.formatSpecializations(p.affectationsOuvertes || p.affectations || []).labels
          : personnelOtherAffectations(p, primary);
        const dateActif = p.dateActif || (primary && primary.dateDebut) || '';
        const dateInactif = p.dateInactif || (primary && primary.dateFin) || '';
        const oiSecondary = personnelSecondaryOiHtml(p, oiLabel);
        const sabbaticalText = (display && display.sabbaticalColumnLabel)
          ? display.sabbaticalColumnLabel(p, period || p.period)
          : (p.sabbaticalRange || '—');
        return `<tr>
              <td data-label="GRADE">${escapeHtml(p.grade || '—')}</td>
              <td data-label="NOM">${escapeHtml(p.nom || '—')}</td>
              <td data-label="PRÉNOM">${escapeHtml(p.prenom || '—')}</td>
              <td data-label="NIP">${escapeHtml(p.nip || '—')}</td>
              <td data-label="OI / INCORPORATION">${oiLabel ? `<span class="scope-personnel-oi-main">${escapeHtml(oiLabel)}</span>${oiSecondary}` : '—'}</td>
              <td data-label="SPÉCIALISATION">${personnelOtherAffectationsHtml(specLabels)}</td>
              <td data-label="STATUT">${personnelStatutCell(p)}</td>
              <td data-label="CONGÉ SABBATIQUE">${escapeHtml(sabbaticalText || '—')}</td>
              <td data-label="DATE ACTIF">${escapeHtml(formatPersonnelDateCell(dateActif))}</td>
              <td data-label="DATE INACTIF">${escapeHtml(formatPersonnelDateCell(dateInactif))}</td>
              <td data-label="ACTIONS"><div class="scope-row-actions"><a class="scope-btn scope-personnel-list-action" href="#/personnel/${escapeHtml(p.personneId)}">Fiche</a>${canManagePersonnel() ? `<span class="scope-row-more"><button type="button" class="scope-row-more-trigger" data-personnel-more="${escapeHtml(p.personneId)}" aria-label="Autres actions" aria-haspopup="menu" aria-expanded="${state.personnelRowMenuId === p.personneId ? 'true' : 'false'}">⋯</button></span>` : ''}</div></td>
            </tr>`;
      }).join('');
    }
    const statutFilters = [
      ['actifs', 'Actifs'],
      ['inactifs', 'Inactifs'],
      ['tous', 'Tous']
    ];
    const specOptions = specializationFilterOptions();
    if (!canRead) {
      return `<div class="scope-card">
        <h2 style="margin-top:0">Personnel</h2>
        <p class="scope-empty">La consultation des fiches individuelles exige la permission personnel:read. Le rôle en lecture agrégée n’y a pas accès.</p>
      </div>`;
    }
    return `<div class="scope-personnel-page">
      ${personnelPeriodControlsHtml()}
      ${personnelContextBannerHtml()}
      <div class="scope-toolbar scope-personnel-pilot">
        <div class="scope-field scope-personnel-search">
          <label for="personnel-q">Recherche</label>
          <input id="personnel-q" type="search" placeholder="Rechercher une personne…" value="${escapeHtml(state.personnelQuery)}" autocomplete="off">
        </div>
        <div class="scope-field">
          <label for="personnel-oi">OI / Incorporation</label>
          ${oiFilterSelectHtml()}
        </div>
        <div class="scope-field">
          <label for="personnel-specialization">Spécialisation</label>
          <select id="personnel-specialization">
            <option value="">Toutes</option>
            ${specOptions.map((label) => `<option value="${escapeHtml(label)}" ${state.personnelSpecialization === label ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </div>
        <div class="scope-field">
          <label for="personnel-statut">Statut</label>
          <select id="personnel-statut">
            ${statutFilters.map(([id, label]) => `<option value="${escapeHtml(id)}" ${state.personnelStatut === id ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select>
        </div>
        <button type="button" class="scope-btn" id="scope-open-personnel-import">Importer du personnel</button>
        ${canManagePersonnel() ? '<button type="button" class="scope-btn scope-btn-primary scope-events-new" id="scope-open-personnel-manual-add">Ajouter une personne / affectation</button>' : ''}
      </div>
      <div class="scope-card scope-table-wrap scope-personnel-list-wrap">
        <table class="scope-table scope-person-table scope-personnel-list-table">
          <thead><tr>${personnelSortHeader('grade', 'GRADE')}${personnelSortHeader('nom', 'NOM')}${personnelSortHeader('prenom', 'PRÉNOM')}${personnelSortHeader('nip', 'NIP')}${personnelSortHeader('oi', 'OI / INCORPORATION')}${personnelSortHeader('specializations', 'SPÉCIALISATION')}${personnelSortHeader('statut', 'STATUT')}${personnelSortHeader('sabbatical', 'CONGÉ SABBATIQUE')}${personnelSortHeader('actif', 'DATE ACTIF')}${personnelSortHeader('inactif', 'DATE INACTIF')}<th>ACTIONS</th></tr></thead>
          <tbody>
            ${peopleBody}
          </tbody>
        </table>
        ${pagination}
      </div>
      ${renderPersonnelHistoryPanel()}
      ${renderPersonnelRowMenu()}
    </div>`;
  }


  function renderPersonnelHistoryPanel(){
    const batches = (state.personnelHistory && state.personnelHistory.batches) || [];
    const open = state.personnelHistoryOpen;
    const openBatch = state.personnelHistory && state.personnelHistory.openBatch;
    if(!open){
      return `<section class="scope-personnel-history">
        <button type="button" class="scope-btn" id="scope-toggle-personnel-history">Afficher l’historique</button>
      </section>`;
    }
    return `<section class="scope-personnel-history is-open">
      <div class="scope-history-head">
        <h3>Historique</h3>
        <button type="button" class="scope-btn" id="scope-toggle-personnel-history">Masquer</button>
      </div>
      <div class="scope-history-asof">
        <label for="personnel-asof">Situation au</label>
        <input id="personnel-asof" type="date" value="${escapeHtml(state.personnelSituationDate || '')}">
        <button type="button" class="scope-btn scope-btn-primary" id="scope-apply-personnel-asof">Appliquer</button>
      </div>
      ${state.personnelSituationApplied && state.personnelSituationDate ? `<p class="scope-history-asof-result">Situation historique au ${escapeHtml((window.ScopePersonnelDisplay && window.ScopePersonnelDisplay.formatPersonnelDate) ? window.ScopePersonnelDisplay.formatPersonnelDate(state.personnelSituationDate) : state.personnelSituationDate)} <button type="button" class="scope-btn scope-btn-small" id="scope-quit-personnel-asof-history">Quitter</button></p>` : ''}
      <ul class="scope-history-list">${batches.length ? batches.map((b) => {
        const d = (window.ScopePersonnelDisplay && window.ScopePersonnelDisplay.formatPersonnelDate)
          ? window.ScopePersonnelDisplay.formatPersonnelDate(b.dateImport || b.dateEffet)
          : String(b.dateImport || '').slice(0,10);
        return `<li><button type="button" class="scope-history-item" data-personnel-batch="${escapeHtml(b.id)}">${escapeHtml(d)} · ${escapeHtml(b.libelle || 'Mise à jour du personnel')}</button></li>`;
      }).join('') : '<li>Aucun import enregistré.</li>'}</ul>
      ${openBatch ? `<div class="scope-history-detail">${escapeHtml(openBatch.libelle || '')}${openBatch.fichier ? ' · ' + escapeHtml(openBatch.fichier) : ''}</div>` : ''}
    </section>`;
  }

  function renderPersonnelRowMenu(){
    const id = state.personnelRowMenuId;
    if(!id) return '';
    const people = visiblePersonnelRows();
    const person = people.find((row) => String(row.personneId) === String(id));
    if(!person) return '';
    const inactive = person.statutTemporel === 'inactif';
    return `<div class="scope-row-more-menu" id="scope-personnel-row-menu" role="menu">
      ${inactive
        ? `<button type="button" role="menuitem" data-correct-person="${escapeHtml(person.personneId)}">Corriger la période</button>`
        : `<button type="button" role="menuitem" data-manage-activity="${escapeHtml(person.personneId)}">Gérer l’activité</button>`}
    </div>`;
  }

  function personnelActivityModalApi(){
    return (typeof window !== 'undefined' && window.ScopePersonnelActivityModal)
      || (typeof require === 'function' ? require('./scope-personnel-activity-modal.js') : null);
  }

  function renderPersonnelInactivateModal(){
    const api = personnelActivityModalApi();
    if(!api || !api.render) return '';
    return api.render(state.personnelInactivate);
  }

  const PERSONNEL_OI_CIBLES = Object.freeze({
    DPS: ['DPS G1', 'DPS C1', 'DPS B1', 'DPS B2'],
    DAP: ['DAP Y1', 'DAP Y2', 'DAP Y3', 'DAP Y4'],
    JSP: ['JSP G1', 'JSP C1', 'JSP B1']
  });
  const PERSONNEL_SPEC_OPTIONS = Object.freeze(['PAPR', 'PR-ABC', 'cond VL', 'cond PL', 'FOBA 1', 'FOBA 2', 'FOBA 3']);

  function closePersonnelAssignmentModal() {
    state.personnelAssignment = null;
    render();
  }

  function personnelGradeOptions() {
    const ref = (typeof window !== 'undefined' && window.ScopePersonnelReferentials)
      || (typeof require === 'function' ? require('./scope-personnel-referentials.js') : null);
    return (ref && Array.isArray(ref.GRADES) ? ref.GRADES : []).map((row) => row.code || row.libelle).filter(Boolean);
  }

  function closePersonnelManualAddModal() {
    state.personnelManualAdd = null;
    render();
  }

  function openPersonnelManualAddModal() {
    state.personnelManualAdd = {
      step: 'search',
      nip: '',
      busy: false,
      error: '',
      found: null,
      unknown: false,
      grade: '',
      nom: '',
      prenom: '',
      dateDebutAnalyse: ''
    };
    render();
  }

  function personnelManualAddAssignmentLabels(person) {
    const display = personnelDisplay();
    const assignments = (person && (person.affectations || person.assignments)) || [];
    const oiList = assignments.filter((a) => String(a.categorie || '').toUpperCase() === 'OI');
    const specList = assignments.filter((a) => String(a.categorie || '').toUpperCase() === 'SPECIALISATION');
    const oi = display && display.formatAssignmentList ? display.formatAssignmentList(oiList) : oiList.map((a) => `${a.domaine || ''} ${a.cible || ''}`.trim()).join(' · ');
    const spec = display && display.formatSpecializations ? display.formatSpecializations(specList, { withPriorityNote: false }).text : specList.map((a) => a.cible || a.domaine || '').join(' · ');
    return { oi: oi || '—', spec: spec || '—' };
  }

  function normalizeManualNip(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
  }

  function readPersonnelManualAddForm(modal) {
    const current = modal || {};
    return {
      nip: String(document.getElementById('scope-manual-nip')?.value || current.nip || '').trim(),
      grade: String(document.getElementById('scope-manual-grade')?.value || current.grade || '').trim(),
      nom: String(document.getElementById('scope-manual-nom')?.value || current.nom || '').trim(),
      prenom: String(document.getElementById('scope-manual-prenom')?.value || current.prenom || '').trim(),
      dateDebutAnalyse: String(document.getElementById('scope-manual-date')?.value || current.dateDebutAnalyse || '').trim()
    };
  }

  function renderPersonnelManualAddModal() {
    const modal = state.personnelManualAdd;
    if (!modal) return '';
    const busy = Boolean(modal.busy);
    const error = modal.error ? `<p class="scope-activity-error" role="alert">${escapeHtml(modal.error)}</p>` : '';
    const fieldError = (key) => modal.fieldErrors && modal.fieldErrors[key]
      ? `<p class="scope-activity-error" role="alert">${escapeHtml(modal.fieldErrors[key])}</p>`
      : '';
    const grades = personnelGradeOptions();
    const found = modal.found;
    const labels = found ? personnelManualAddAssignmentLabels(found) : null;
    const foundBlock = found ? `<div class="scope-activity-fields">
      <label>GRADE</label>
      <input value="${escapeHtml(found.grade || '')}" disabled>
      <label>NOM</label>
      <input value="${escapeHtml(found.nom || '')}" disabled>
      <label>PRÉNOM</label>
      <input value="${escapeHtml(found.prenom || '')}" disabled>
      <label>NIP</label>
      <input value="${escapeHtml(found.nip || '')}" disabled>
      <label>INCORPORATIONS</label>
      <input value="${escapeHtml(labels.oi)}" disabled>
      <label>SPÉCIALISATIONS</label>
      <input value="${escapeHtml(labels.spec)}" disabled>
      <p class="scope-activity-hint">Cette personne existe déjà. Aucun doublon ne sera créé.</p>
    </div>` : '';
    const createFields = modal.unknown ? `<div class="scope-activity-fields">
      <label for="scope-manual-grade">GRADE</label>
      ${grades.length
        ? `<select id="scope-manual-grade" ${busy ? 'disabled' : ''}>
            <option value="">Choisir</option>
            ${grades.map((code) => `<option value="${escapeHtml(code)}" ${modal.grade === code ? 'selected' : ''}>${escapeHtml(code)}</option>`).join('')}
          </select>`
        : `<input id="scope-manual-grade" value="${escapeHtml(modal.grade || '')}" ${busy ? 'disabled' : ''}>`}
      ${fieldError('grade')}
      <label for="scope-manual-nom">NOM</label>
      <input id="scope-manual-nom" value="${escapeHtml(modal.nom || '')}" ${busy ? 'disabled' : ''} autocomplete="family-name">
      ${fieldError('nom')}
      <label for="scope-manual-prenom">PRÉNOM</label>
      <input id="scope-manual-prenom" value="${escapeHtml(modal.prenom || '')}" ${busy ? 'disabled' : ''} autocomplete="given-name">
      ${fieldError('prenom')}
      <label for="scope-manual-date">DATE DE DÉBUT DE L’ANALYSE</label>
      <input id="scope-manual-date" class="scope-activity-date" type="date" value="${escapeHtml(modal.dateDebutAnalyse || '')}" ${busy ? 'disabled' : ''}>
      ${fieldError('dateDebutAnalyse')}
    </div>` : '';
    const cta = found
      ? 'Ajouter une affectation'
      : (modal.unknown ? 'Créer la personne' : 'Rechercher');
    return `<div class="scope-activity-overlay" id="scope-manual-add-modal" data-manual-add-overlay>
      <div class="scope-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-manual-add-title">
        <header class="scope-activity-head">
          <h3 id="scope-manual-add-title">Ajouter une personne / affectation</h3>
          <button type="button" class="scope-activity-x" data-manual-add-cancel aria-label="Fermer">×</button>
        </header>
        <p class="scope-activity-question">Recherchez un NIP exact. S’il existe, ajoutez une affectation. Sinon, créez la personne.</p>
        <div class="scope-activity-fields">
          <label for="scope-manual-nip">NIP</label>
          <input id="scope-manual-nip" value="${escapeHtml(modal.nip || '')}" ${busy || found ? 'disabled' : ''} autocomplete="off">
          ${fieldError('nip')}
        </div>
        ${foundBlock}${createFields}
        ${error}
        <footer class="scope-activity-footer">
          <button type="button" class="scope-btn" data-manual-add-cancel ${busy ? 'disabled' : ''}>Annuler</button>
          <button type="button" class="scope-btn scope-btn-primary" id="scope-manual-add-confirm" ${busy ? 'disabled' : ''}>${escapeHtml(cta)}</button>
        </footer>
      </div>
    </div>`;
  }

  async function submitPersonnelManualAdd() {
    const modal = state.personnelManualAdd;
    if (!modal || modal.busy) return;
    const form = readPersonnelManualAddForm(modal);
    const fieldErrors = {};
    if (!normalizeManualNip(form.nip)) fieldErrors.nip = 'Le NIP est obligatoire.';
    if (modal.unknown) {
      if (!form.nom) fieldErrors.nom = 'Le nom est obligatoire.';
      if (!form.prenom) fieldErrors.prenom = 'Le prénom est obligatoire.';
    }
    if (Object.keys(fieldErrors).length) {
      state.personnelManualAdd = Object.assign({}, modal, form, { fieldErrors, error: '', busy: false });
      render();
      return;
    }
    state.personnelManualAdd = Object.assign({}, modal, form, { busy: true, error: '', fieldErrors: {} });
    render();
    try {
      if (modal.found) {
        const person = modal.found;
        const id = person.id || person.personneId || person.personne_id;
        state.personnelManualAdd = null;
        openPersonnelAssignmentModal(id, person.affectations || person.assignments || []);
        return;
      }
      if (modal.unknown) {
        const payload = await client.createManualPersonne({
          nip: form.nip,
          grade: form.grade,
          nom: form.nom,
          prenom: form.prenom,
          dateEntreeSdis: form.dateDebutAnalyse,
          dateDebutAnalyse: form.dateDebutAnalyse
        });
        const person = payload.personne || payload;
        const id = person.id || person.personneId || person.personne_id;
        state.personnelManualAdd = null;
        await loadPersonnelDirectory();
        openPersonnelAssignmentModal(id, person.affectations || []);
        return;
      }
      try {
        const payload = await client.lookupPersonneByNip(form.nip);
        const person = payload.personne || payload;
        const foundNip = normalizeManualNip(person && person.nip);
        if (!person || foundNip !== normalizeManualNip(form.nip)) {
          throw Object.assign(new Error('NIP introuvable.'), { status: 404, error: 'not_found' });
        }
        state.personnelManualAdd = Object.assign({}, modal, form, { busy: false, found: person, unknown: false, error: '', fieldErrors: {} });
      } catch (error) {
        const status = Number(error && (error.status || error.statusCode));
        const code = error && (error.error || error.code || (error.payload && error.payload.error));
        if (status === 404 || code === 'not_found') {
          state.personnelManualAdd = Object.assign({}, modal, form, { busy: false, found: null, unknown: true, error: '', fieldErrors: {} });
        } else {
          throw error;
        }
      }
      render();
    } catch (error) {
      const info = L.personnelMutationError ? L.personnelMutationError(error) : L.friendlyError(error);
      state.personnelManualAdd = Object.assign({}, modal, form, { busy: false, error: info.message || info.title || String(error) });
      render();
    }
  }

  function assignmentModalCards(modal, busy){
    const card = (id, title, hint, selected) => `<button type="button" class="scope-activity-card${selected ? ' is-selected' : ''}" data-assignment-op="${escapeHtml(id)}" role="radio" aria-checked="${selected ? 'true' : 'false'}" ${busy ? 'disabled' : ''}>
      <span class="scope-activity-card-radio" aria-hidden="true"></span>
      <span class="scope-activity-card-text">
        <strong>${escapeHtml(title)}</strong>
        <em>${escapeHtml(hint)}</em>
      </span>
    </button>`;
    return `${card('add', 'Ajouter une affectation', 'Ajouter une nouvelle incorporation ou spécialisation.', modal.operation === 'add')}
      ${card('close', 'Clôturer une affectation', 'Mettre fin à une affectation existante sans quitter le SDIS.', modal.operation === 'close')}`;
  }

  function openPersonnelAssignmentModal(personneId, assignments) {
    state.personnelAssignment = {
      personneId,
      operation: '',
      categorie: '',
      domaine: '',
      cible: '',
      roleDomaine: '',
      specialization: '',
      dateActif: '',
      affectationId: '',
      dateLastActive: '',
      assignments: (assignments || []).map((aff) => ({
        id: aff.affectationId || aff.id,
        label: personnelAssignmentLabel(aff),
        type: String(aff.categorie || '').toUpperCase() === 'SPECIALISATION' ? 'Spécialisation' : 'Incorporation',
        role: aff.roleDomaine || aff.role_domaine || '',
        dateActif: aff.dateActif || aff.date_actif || aff.dateDebut || aff.date_debut || ''
      })),
      busy: false,
      error: ''
    };
    render();
  }

  function personnelAssignmentCanConfirm(modal) {
    if (!modal || modal.busy || !modal.operation) return false;
    if (modal.operation === 'close') {
      return Boolean(modal.affectationId && modal.dateLastActive);
    }
    if (!modal.dateActif) return false;
    if (modal.categorie === 'OI') {
      return Boolean(modal.domaine && modal.cible && (modal.roleDomaine === 'PRINCIPAL' || modal.roleDomaine === 'SECONDAIRE'));
    }
    if (modal.categorie === 'SPECIALISATION') {
      return Boolean(modal.specialization);
    }
    return false;
  }

  function personnelAssignmentConfirmBody(modal) {
    if (!personnelAssignmentCanConfirm(modal)) return null;
    const display = personnelDisplay();
    if (modal.categorie === 'OI') {
      const parsed = display && display.parseOperationalOiLabel
        ? display.parseOperationalOiLabel(modal.cible)
        : null;
      const domaine = (parsed && parsed.domaine) || modal.domaine;
      const cible = parsed ? parsed.niveau : String(modal.cible || '').replace(/^(DPS|DAP|JSP)\s+/i, '');
      return {
        personneId: modal.personneId,
        categorie: 'OI',
        domaine,
        cible,
        roleDomaine: modal.roleDomaine,
        dateActif: modal.dateActif
      };
    }
    const parts = display && display.assignmentParts
      ? display.assignmentParts(modal.specialization)
      : { domaine: '', cible: '' };
    return {
      personneId: modal.personneId,
      categorie: 'SPECIALISATION',
      domaine: parts.domaine,
      cible: parts.cible,
      dateActif: modal.dateActif
    };
  }

  function personnelAssignmentCloseBody(modal) {
    if (!personnelAssignmentCanConfirm(modal) || modal.operation !== 'close') return null;
    const temporal = window.ScopePersonnelTemporal;
    const last = modal.dateLastActive;
    const dateEffet = temporal && temporal.addDays ? temporal.addDays(last, 1) : last;
    return {
      personneId: modal.personneId,
      action: 'close_assignment',
      affectationId: modal.affectationId,
      dateInactivite: dateEffet,
      dateEffet
    };
  }

  function renderPersonnelAssignmentModal() {
    const modal = state.personnelAssignment;
    if (!modal) return '';
    const busy = Boolean(modal.busy);
    const confirmEnabled = personnelAssignmentCanConfirm(modal);
    const error = modal.error
      ? `<p class="scope-activity-error" role="alert">${escapeHtml(modal.error)}</p>`
      : '';
    const option = (value, label, selected) => `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    const cibles = PERSONNEL_OI_CIBLES[modal.domaine] || [];
    const fmt = (value) => {
      const display = personnelDisplay();
      return display && display.formatPersonnelDate ? (display.formatPersonnelDate(value) || '—') : (value || '—');
    };
    const roleLabel = (role) => String(role || '').toUpperCase() === 'PRINCIPAL' ? 'Principal' : (String(role || '').toUpperCase() === 'SECONDAIRE' ? 'Secondaire' : '');
    const oiFields = modal.operation !== 'add' || modal.categorie !== 'OI' ? '' : `<div class="scope-activity-fields">
      <label for="scope-assign-domaine">DOMAINE</label>
      <select id="scope-assign-domaine" ${busy ? 'disabled' : ''}>
        ${option('', 'Choisir', !modal.domaine)}
        ${['DPS', 'DAP', 'JSP'].map((code) => option(code, code, modal.domaine === code)).join('')}
      </select>
      <label for="scope-assign-cible">CIBLE</label>
      <select id="scope-assign-cible" ${busy || !modal.domaine ? 'disabled' : ''}>
        ${option('', 'Choisir', !modal.cible)}
        ${cibles.map((label) => option(label, label, modal.cible === label)).join('')}
      </select>
      <label for="scope-assign-role">RÔLE</label>
      <select id="scope-assign-role" ${busy ? 'disabled' : ''}>
        ${option('', 'Choisir', !modal.roleDomaine)}
        ${option('PRINCIPAL', 'Principal', modal.roleDomaine === 'PRINCIPAL')}
        ${option('SECONDAIRE', 'Secondaire', modal.roleDomaine === 'SECONDAIRE')}
      </select>
      <label for="scope-assign-date">DATE ACTIF</label>
      <input id="scope-assign-date" class="scope-activity-date" type="date" value="${escapeHtml(modal.dateActif || '')}" ${busy ? 'disabled' : ''}>
    </div>`;
    const specFields = modal.operation !== 'add' || modal.categorie !== 'SPECIALISATION' ? '' : `<div class="scope-activity-fields">
      <label for="scope-assign-spec">SPÉCIALISATION</label>
      <select id="scope-assign-spec" ${busy ? 'disabled' : ''}>
        ${option('', 'Choisir', !modal.specialization)}
        ${PERSONNEL_SPEC_OPTIONS.map((label) => option(label, label, modal.specialization === label)).join('')}
      </select>
      <label for="scope-assign-date">DATE ACTIF</label>
      <input id="scope-assign-date" class="scope-activity-date" type="date" value="${escapeHtml(modal.dateActif || '')}" ${busy ? 'disabled' : ''}>
    </div>`;
    const typeField = modal.operation !== 'add' ? '' : `<div class="scope-activity-fields">
      <label for="scope-assign-type">TYPE</label>
      <select id="scope-assign-type" ${busy ? 'disabled' : ''}>
        ${option('', 'Choisir', !modal.categorie)}
        ${option('OI', 'Incorporation / OI', modal.categorie === 'OI')}
        ${option('SPECIALISATION', 'Spécialisation', modal.categorie === 'SPECIALISATION')}
      </select>
    </div>`;
    const closeFields = modal.operation !== 'close' ? '' : `<div class="scope-activity-fields">
      <fieldset class="scope-activity-affs">
        <legend>AFFECTATION</legend>
        ${(modal.assignments || []).length
          ? (modal.assignments || []).map((aff) => `<label class="scope-activity-aff"><input type="radio" name="scope-assign-aff" value="${escapeHtml(aff.id)}" ${String(modal.affectationId) === String(aff.id) ? 'checked' : ''} ${busy ? 'disabled' : ''}> ${escapeHtml(aff.label)} · ${escapeHtml(aff.type)}${roleLabel(aff.role) ? ` · ${escapeHtml(roleLabel(aff.role))}` : ''} · ${escapeHtml(fmt(aff.dateActif))}</label>`).join('')
          : '<p class="scope-activity-hint">Aucune affectation ouverte à clôturer.</p>'}
      </fieldset>
      <label for="scope-assign-last-active">DERNIER JOUR ACTIF</label>
      <input id="scope-assign-last-active" class="scope-activity-date" type="date" value="${escapeHtml(modal.dateLastActive || '')}" ${busy ? 'disabled' : ''}>
    </div>`;
    const cta = modal.operation === 'close' ? 'Clôturer l’affectation' : (modal.operation === 'add' ? 'Ajouter l’affectation' : 'Confirmer');
    return `<div class="scope-activity-overlay" id="scope-assignment-modal" data-assignment-overlay>
      <div class="scope-activity-dialog" role="dialog" aria-modal="true" aria-labelledby="scope-assignment-title">
        <header class="scope-activity-head">
          <h3 id="scope-assignment-title">Gérer les affectations</h3>
          <button type="button" class="scope-activity-x" data-assignment-cancel aria-label="Fermer">×</button>
        </header>
        <p class="scope-activity-question" id="scope-assignment-question">Que souhaitez-vous faire ?</p>
        <div class="scope-activity-cards" role="radiogroup" aria-labelledby="scope-assignment-question">
          ${assignmentModalCards(modal, busy)}
        </div>
        ${typeField}${oiFields}${specFields}${closeFields}
        ${error}
        <footer class="scope-activity-footer">
          <button type="button" class="scope-btn" data-assignment-cancel ${busy ? 'disabled' : ''}>Annuler</button>
          <button type="button" class="scope-btn scope-btn-primary" data-assignment-confirm ${confirmEnabled ? '' : 'disabled'}>${busy ? 'Enregistrement…' : escapeHtml(cta)}</button>
        </footer>
      </div>
    </div>`;
  }

  async function submitPersonnelAssignmentModal() {
    const modal = state.personnelAssignment;
    if (!modal || modal.busy) return;
    const closeBody = modal.operation === 'close' ? personnelAssignmentCloseBody(modal) : null;
    const addBody = modal.operation === 'add' ? personnelAssignmentConfirmBody(modal) : null;
    const body = closeBody || addBody;
    if (!body) return;
    state.personnelAssignment = Object.assign({}, modal, { busy: true, error: '' });
    render();
    try {
      if (closeBody) await client.inactivatePersonne(closeBody);
      else await client.createPersonnelAffectation(addBody);
      const personneId = state.personnelAssignment.personneId;
      state.personnelAssignment = null;
      await reloadPersonneFiche(personneId);
      await refreshAlertCounts();
      ScopeFeedback.success(closeBody ? 'Affectation clôturée' : 'Affectation ajoutée', closeBody ? 'L’affectation a été clôturée.' : 'L’affectation a été enregistrée.');
    } catch (error) {
      const info = L.personnelMutationError ? L.personnelMutationError(error) : L.friendlyError(error);
      state.personnelAssignment = Object.assign({}, state.personnelAssignment || modal, {
        busy: false,
        error: info.message || info.title || 'L’opération n’a pas pu être enregistrée.'
      });
      render();
    }
  }

  function renderPersonneActivityCard(fiche, identite){
    if (!canManagePersonnel()) return '';
    const statut = identite.statutRh || (identite.archivee ? 'INACTIF' : 'ACTIF');
    return `<div class="scope-fiche-toolbar">
      <button type="button" class="scope-btn" id="scope-person-manage-activity">${identite.archivee || statut === 'INACTIF' ? 'Corriger la période' : 'Gérer l’activité'}</button>
    </div>`;
  }


  function renderPersonnel(options) {
    const importMode = Boolean(options && options.importMode);
    const showImportPanel = importMode || state.personnelSync.panelOpen;
    const allowed = canManagePersonnel() && typeof client.previewPersonnelSync === 'function';
    const preview = state.personnelSync.preview;
    const rapport = state.personnelSync.rapport;
    const summary = (preview && (preview.importSummary || preview.summary)) || {};
    const rows = personnelVisibleRows(preview);
    const counts = (preview && (preview.counts || preview.summary)) || {};
    const display = personnelDisplay();
    const previewCanCommit = Boolean(preview && preview.canCommit !== false && personnelImportCount(counts, 'countErrors', 'ERROR') === 0
      && personnelImportDecisionsComplete(preview)
      && !(preview.dateEffetRequise && !state.personnelSync.dateEffet)
      && (display && display.importCanCommit ? display.importCanCommit(preview) : true));
    const filters = display && display.importFilterButtons ? display.importFilterButtons(preview) : [
      { id: 'CHANGEMENTS', label: 'À traiter' },
      { id: 'TOUS', label: 'Tous' }
    ];
    const emptyState = display && display.importEmptyState ? display.importEmptyState(preview, state.personnelSync.filter, rows.length) : null;
    const commitLabel = preview && display && display.importIsFullyIdentical && display.importIsFullyIdentical(preview)
      ? 'Aucune modification à importer'
      : 'Valider l’import';
    return `
      <div class="scope-crumb">Personnel</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: importMode ? 'Réglages / Importation' : 'Personnel', title: importMode ? 'Import du personnel' : 'Personnel', context: importMode ? 'Synchronisation CSV' : 'Annuaire nominatif', description: importMode ? '' : 'Annuaire nominatif. Les taux individuels restent dans la fiche.', logo: true })}
        ${''}
        ${renderPersonnelDirectory()}
        ${showImportPanel ? `<div class="scope-card" style="margin-top:12px" id="scope-personnel-import-panel">
          <h2 style="margin-top:0">Import du personnel</h2>
          <p class="scope-mode-hint">Analyse comparative par NIP uniquement. Sélection, lecture et analyse ne modifient pas la base. La validation DB nécessite une action distincte.</p>
          ${live && state.personCount != null ? `<p><strong>${state.personCount}</strong> personne(s) nominative(s) en base SCOPE.</p>` : ''}
          ${!live ? '<p class="scope-empty">Connectez-vous pour importer le personnel.</p>' : ''}
          ${live && !canManagePersonnel() ? '<p class="scope-empty">L’import personnel est réservé aux profils habilités (personnel:manage).</p>' : ''}
          ${allowed ? `
          <div id="scope-sync-drop" class="scope-import-drop ${state.personnelSync.drag ? 'is-drag' : ''}">
            <p>Glissez un CSV personnel (NIP;GRADE;NOM;PRENOM;OI) ou</p>
            <label class="scope-btn">
              Sélectionner un fichier CSV
              <input id="scope-sync-file" type="file" accept=".csv,text/csv" hidden>
            </label>
            <p class="scope-import-file">${escapeHtml(state.personnelSync.filename || 'Aucun fichier')}</p>
          </div>
          <div class="scope-sync-toolbar">
            <div class="scope-field"><label for="scope-sync-context">Type d’import</label>
              <select id="scope-sync-context">
                ${personnelImportContextOptions().map(([value, label]) => `<option value="${escapeHtml(value)}" ${state.personnelSync.contexte === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
              </select>
            </div>
            ${personnelImportRequiresSite(state.personnelSync.contexte) ? `<div class="scope-field"><label for="scope-sync-site">Site JSP</label>
              <select id="scope-sync-site">
                <option value="">Choisir un site</option>
                ${jspImportSiteOptions().map((site) => `<option value="${escapeHtml(site)}" ${state.personnelSync.siteJsp === site ? 'selected' : ''}>${escapeHtml(site)}</option>`).join('')}
              </select>
            </div>` : ''}
            <div class="scope-field"><label for="scope-sync-year">Année de monitoring</label>
              <input id="scope-sync-year" type="number" min="2000" max="2100" value="${escapeHtml(state.personnelSync.anneeMonitoring || '')}">
            </div>
            <div class="scope-field"><label for="scope-sync-date">Date d’effet globale</label>
              <input id="scope-sync-date" type="date" value="${escapeHtml(state.personnelSync.dateEffet || '')}">
            </div>
            <div class="scope-actions">
              <button type="button" class="scope-btn scope-btn-primary" id="scope-sync-preview" ${!state.personnelSync.csvText || (personnelImportRequiresSite(state.personnelSync.contexte) && !state.personnelSync.siteJsp) ? 'disabled' : ''}>Analyser le fichier</button>
              <button type="button" class="scope-btn" id="scope-sync-commit" ${previewCanCommit && !rapport ? '' : 'disabled'}>${commitLabel}</button>
            </div>
          </div>
          ` : ''}
        </div>` : ''}
        ${showImportPanel && preview ? `<div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Prévisualisation de l’import</h3>
          ${personnelImportSummaryHtml(counts, preview)}
          <p class="scope-sync-summary">Analyse terminée · 0 écriture DB · ${escapeHtml(preview.populationLabel || preview.contextLabel || '')}</p>
          ${preview.dateEffetRequise ? '<p class="scope-mode-hint">Une date d’effet est obligatoire avant commit. Elle n’est jamais inventée.</p>' : ''}
          ${previewCanCommit ? '<p>Aucune écriture tant que vous n’avez pas confirmé explicitement « Valider l’import ».</p>' : '<p class="scope-mode-hint">Validation bloquée : conflit, erreur, date d’effet manquante ou décision d’identité à renseigner.</p>'}
          <div class="scope-sync-filters" role="tablist">
            ${filters.map((item) => `<button type="button" class="scope-btn ${state.personnelSync.filter === item.id ? 'scope-btn-primary' : ''}" data-sync-filter="${item.id}">${escapeHtml(item.label)}${item.id !== 'CHANGEMENTS' && item.id !== 'TOUS' && item.count != null ? ` (${item.count})` : ''}</button>`).join('')}
          </div>
          <div class="scope-actions" style="margin:8px 0 12px">
            <button type="button" class="scope-btn" id="scope-sync-apply-all">Appliquer à tous</button>
            <button type="button" class="scope-btn" id="scope-sync-ignore-all">Ignorer tous</button>
          </div>
          <div class="scope-table-wrap scope-sync-table-wrap">
            <table class="scope-table scope-sync-table">
              <thead><tr><th>NIP</th><th>Personne</th><th>Modification</th><th>Affectation</th><th>Situation</th><th>Action</th><th>Date d’effet</th></tr></thead>
              <tbody>
                ${rows.map((row) => `
                  <tr class="${personnelRowClass(row)}">
                    <td data-label="NIP">${escapeHtml(personnelNip(row))}</td>
                    <td data-label="Personne">${escapeHtml(personnelLineName(row))}</td>
                    <td data-label="Modification">${escapeHtml(personnelLineModification(row))}</td>
                    <td data-label="Affectation">${escapeHtml(personnelLineAffectation(row))}</td>
                    <td data-label="Situation"><span class="scope-import-pill ${personnelPillClass(row.statut, row)}">${escapeHtml(personnelLineSituation(row))}</span></td>
                    <td data-label="Action">${personnelDecisionSelect(row)}</td>
                    <td data-label="Date d’effet"><input type="date" class="scope-sync-row-date" data-sync-date="${escapeHtml(personnelRowId(row))}" value="${escapeHtml(personnelDateOf(row))}" ${row.statut === 'INCHANGE' || row.statut === 'IDENTICAL' || row.status === 'IDENTICAL' ? 'disabled' : ''}></td>
                  </tr>
                  ${row.infos && row.infos.length && personnelLineModification(row).indexOf(row.infos[0]) < 0 ? `<tr class="scope-sync-detail"><td colspan="7">${escapeHtml((row.infos || []).join(' · '))}</td></tr>` : ''}
                `).join('') || `<tr><td colspan="7"><div class="scope-import-empty"><h4>${escapeHtml((emptyState && emptyState.title) || 'Aucune ligne dans ce filtre')}</h4><p>${escapeHtml((emptyState && emptyState.text) || '')}</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>` : ''}
        ${showImportPanel && rapport ? `<div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">IMPORT TERMINÉ</h3>
          <p>${escapeHtml(rapport.successMessage || (rapport.summary ? `${rapport.summary.analysed || 0} lignes analysées · ${rapport.summary.mutations || 0} mutation(s)` : `${rapport.personsTouched || 0} personne(s) touchée(s) · ${rapport.assignmentsCreated || 0} affectation(s) créée(s)`))}</p>
        </div>` : ''}
      </div>
    `;
  }

  function motifLabel(code) {
    if (code === 'prive') return 'Privé';
    if (code === 'professionnel') return 'Professionnel';
    if (code === 'armee') return 'Armée';
    if (code === 'accidentMaladie') return 'Accident / maladie';
    if (code === 'nonPrecise') return 'Non précisé (historique)';
    return code;
  }

  function rhTypeLabel(type, motif) {
    if (type === 'ACTIF') return 'ACTIF';
    if (type === 'INDISPONIBLE') return motif === 'CONGE_SABBATIQUE' ? 'Congé sabbatique' : 'INDISPONIBLE';
    if (type === 'SORTI') return 'SORTI';
    if (type === 'DEMISSIONNAIRE') return 'DEMISSIONNAIRE';
    return type || '—';
  }

  function personEventColumns() {
    const display = personnelDisplay();
    return [
      { key: 'date', type: 'date', value: (row) => row && row.date, tieBreakers: [
        { key: 'libelle', type: 'text', value: (row) => row && row.libelle }
      ] },
      { key: 'libelle', type: 'text', value: (row) => row && row.libelle },
      { key: 'domaine', type: 'text', value: (row) => domaineLabel(row && row.domaine) },
      { key: 'cible', type: 'text', value: (row) => display && display.ficheEventCible ? display.ficheEventCible(row) : (row && (row.oiAtDate || row.sousDomaine)) },
      { key: 'statut', type: 'text', value: (row) => display && display.ficheEventStatutLabel ? display.ficheEventStatutLabel(row) : (row && row.statutParticipation) },
      { key: 'informations', type: 'text', value: (row) => display && display.ficheEventInformations ? display.ficheEventInformations(row) : (row && row.motif) }
    ];
  }

  function personEventsFiltered(fiche) {
    const statut = state.personneEventFilter || 'tout';
    const domaine = state.personneDomainFilter;
    const filtered = (fiche.evenements || []).filter((row) => {
      if (domaine) {
        const codes = domaine === 'FOSPEC' ? ['FOSPEC', 'PR', 'AUTO'] : [domaine];
        if (!codes.includes(row.domaine)) return false;
      }
      const s = String(row.statutParticipation || row.statut || '').toUpperCase();
      if (statut === 'presents') return s === 'PRESENT' || s === 'PERMUTATION';
      if (statut === 'excuses') return s === 'ABSENT_EXCUSE' || s === 'EXCUSE';
      if (statut === 'non_excuses') return s === 'ABSENT_NON_EXCUSE' || s === 'ABSENT';
      if (statut === 'dispenses') return s === 'DISPENSE';
      return true;
    });
    return L.sortRows ? L.sortRows(filtered, state.personneEventSort, personEventColumns()) : filtered;
  }

  function renderPersonne() {
    const fiche = state.personneFiche;
    const identite = fiche && fiche.identite;
    if (!canReadPersonnel()) {
      return `<div class="scope-crumb"><a href="#/personnel">Personnel</a></div>
        <div class="scope-main"><div class="scope-card"><p class="scope-empty">Fiche individuelle réservée aux profils habilités (personnel:read).</p></div></div>`;
    }
    if (!fiche || !identite) {
      return `<div class="scope-crumb"><a href="#/personnel">Personnel</a></div>
        <div class="scope-main"><div class="scope-card"><p>Chargement de la fiche…</p></div></div>`;
    }
    const display = personnelDisplay();
    const ficheSabbatical = fiche.sabbatical || (fiche.personne && fiche.personne.sabbatical) || null;
    const identity = display && display.ficheIdentityView
      ? display.ficheIdentityView(identite, fiche.personne, ficheSabbatical)
      : {
          grade: identite.grade || '—',
          nom: identite.nom || '—',
          prenom: identite.prenom || '—',
          nip: identite.nip || '—',
          statut: identite.archivee || identite.statutRh === 'INACTIF' ? 'Inactif' : 'Actif',
          sabbaticalRange: '',
          dateEntreeSdis: identite.dateEntreeSdis,
          dateInactivite: identite.dateInactif
        };
    const fmtDate = (value) => {
      if (!value) return '—';
      const text = display && display.formatPersonnelDate ? display.formatPersonnelDate(value) : L.formatDate(value);
      return text || '—';
    };
    const assignments = (fiche.personne && fiche.personne.affectations && fiche.personne.affectations.length)
      ? fiche.personne.affectations
      : ficheActivityAssignments(fiche);
    const temporal = (typeof window !== 'undefined' && window.ScopePersonnelTemporal)
      || (typeof globalThis !== 'undefined' && globalThis.ScopePersonnelTemporal);
    const consultDate = temporal && temporal.ficheConsultationDate
      ? temporal.ficheConsultationDate(
        fiche.period,
        state.personnelSituationApplied ? state.personnelSituationDate : ''
      )
      : (state.personnelSituationDate || '');
    const incorporations = display && display.ficheIncorporationRows
      ? display.ficheIncorporationRows(assignments, fiche.period, consultDate)
      : [];
    const specs = display && display.ficheSpecializationView
      ? display.ficheSpecializationView(assignments, consultDate)
      : { labels: [], empty: true };
    const kpi = fiche.kpi || {};
    const vol = kpi.volumes || {};
    const official = display && display.ficheParticipationIsOfficial
      ? display.ficheParticipationIsOfficial(kpi)
      : Boolean(vol && Object.prototype.hasOwnProperty.call(vol, 'attendus'));
    const status = kpi.analyticStatus || 'NON_EVALUABLE';
    const kpiCell = (value) => official && value != null && value !== '' ? String(value) : '—';
    const tauxText = !official
      ? '—'
      : (status === 'NON_EVALUABLE' && kpi.percentage == null ? 'Non évaluable' : L.formatTaux(kpi.percentage));
    const events = personEventsFiltered(fiche);
    const eventFilters = [
      ['tout', 'Tout'],
      ['presents', 'Présents'],
      ['excuses', 'Excusés'],
      ['non_excuses', 'Absents'],
      ['dispenses', 'Dispensés']
    ];
    const domainCodes = Array.from(new Set((fiche.evenements || []).map((row) => row.domaine).filter(Boolean)));
    const eventStatut = (row) => (display && display.ficheEventStatutLabel ? display.ficheEventStatutLabel(row) : L.participationStatutLabel(row.statutParticipation));
    const eventInfo = (row) => (display && display.ficheEventInformations ? display.ficheEventInformations(row) : (row.motif || '—'));
    const eventCible = (row) => (display && display.ficheEventCible ? display.ficheEventCible(row) : (row.oiAtDate || row.sousDomaine || '—'));
    const edit = state.personneEdit;
    const editBlock = canManagePersonnel() ? (edit ? `
        <div class="scope-card scope-person-edit">
          <h2>Modifier l’identité</h2>
          <div class="scope-form-grid">
            <div class="scope-field"><label for="person-edit-nip">NIP</label><input id="person-edit-nip" value="${escapeHtml(identite.nip || '')}" readonly aria-readonly="true"></div>
            <div class="scope-field"><label for="person-edit-grade">Grade</label><input id="person-edit-grade" value="${escapeHtml(edit.grade || '')}"></div>
            <div class="scope-field"><label for="person-edit-nom">Nom</label><input id="person-edit-nom" value="${escapeHtml(edit.nom || '')}"></div>
            <div class="scope-field"><label for="person-edit-prenom">Prénom</label><input id="person-edit-prenom" value="${escapeHtml(edit.prenom || '')}"></div>
            <div class="scope-field"><label for="person-edit-entree">Date de début de l’analyse</label><input id="person-edit-entree" type="date" value="${escapeHtml(edit.dateEntreeSdis || '')}"></div>
          </div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="person-edit-save">Enregistrer</button>
            <button type="button" class="scope-btn" id="person-edit-cancel">Annuler</button>
          </div>
        </div>` : '') : '';
    const identityField = (label, value, extra) => `<div class="scope-fiche-field"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${extra || ''}</div>`;
    const statutExtra = identity.statut === 'Congé sabbatique' && identity.sabbaticalRange
      ? `<em class="scope-fiche-sabbatical-range">${escapeHtml(identity.sabbaticalRange)}</em>`
      : '';
    const titleHtml = `${escapeHtml(identity.grade === '—' ? '' : identity.grade)}${identity.grade !== '—' ? ' ' : ''}${escapeHtml(identity.prenom === '—' ? '' : identity.prenom)} <span class="scope-person-nom">${escapeHtml(identity.nom)}</span>`.replace(/^\s+/, '');
    const specHtml = specs.empty
      ? '<p class="scope-fiche-empty">Aucune spécialisation</p>'
      : `<p class="scope-fiche-specs">${escapeHtml(specs.labels.join(' · '))}</p>`;
    const incHtml = incorporations.length
      ? `<ul class="scope-fiche-oi">${incorporations.map((row) => {
          const role = row.role === 'principale' ? 'Incorporation principale' : (row.role === 'secondaire' ? 'Incorporation secondaire' : '');
          const dates = [
            row.actifDepuis ? `Actif depuis ${fmtDate(row.actifDepuis)}` : '',
            row.inactifDepuis ? `${row.closed ? 'Inactif depuis' : 'Jusqu’au'} ${fmtDate(row.inactifDepuis)}` : ''
          ].filter(Boolean).join(' · ');
          return `<li><strong>${escapeHtml(row.label)}</strong>${role ? `<small>${escapeHtml(role)}</small>` : ''}${dates ? `<span>${escapeHtml(dates)}</span>` : ''}</li>`;
        }).join('')}</ul>`
      : '<p class="scope-fiche-empty">—</p>';
    const period = fiche.period || {};
    const C = (typeof window !== 'undefined' && window.ScopeCharts) || (typeof globalThis !== 'undefined' && globalThis.ScopeCharts);
    const graphs = fiche.graphs || {};
    const domainYearChart = C ? C.renderChartCard(graphs.domainesAnnees, {
      title: 'Participation par domaine et par année',
      explain: false,
      personLayout: true,
      wide: true,
      size: { width: 560, height: 210 }
    }) : '';
    const specYearChart = C ? C.renderChartCard(graphs.specialisationsAnnees, {
      title: 'Participation par spécialisation et par année',
      explain: false,
      personLayout: true,
      wide: true,
      size: { width: 560, height: 210 }
    }) : '';
    const repartitionChart = C ? C.renderChartCard(graphs.repartition || graphs.composition, {
      title: 'Répartition des participations',
      variant: 'donut',
      explain: false,
      personLayout: true,
      size: { width: 420, height: 210 }
    }) : '';

    return `
      <div class="scope-crumb"><a href="#/personnel">Personnel</a> · ${escapeHtml(identite.prenom)} ${escapeHtml(identite.nom)}</div>
      <div class="scope-main scope-fiche-personnel">
        ${pageHeaderHtml({
          eyebrow: 'Personnel',
          titleHtml,
          context: `NIP ${identity.nip}`,
          logo: true
        })}
        ${periodContextHtml()}
        <div class="scope-fiche-toolbar-row">
          <a class="scope-btn scope-btn-secondary scope-btn-compact" href="#/personnel">Retour au personnel</a>
          ${renderPersonneActivityCard(fiche, identite)}
          ${canManagePersonnel() && !edit ? `<button type="button" class="scope-btn" id="person-add-assignment">Gérer les affectations</button>` : ''}
          ${canManagePersonnel() && !edit ? `<button type="button" class="scope-btn" id="person-edit-open">Modifier</button>` : ''}
          ${canReadPersonnel() ? `<button type="button" class="scope-btn scope-btn-secondary" id="person-export-pdf">Exporter en PDF</button>` : ''}
        </div>
        ${editBlock}
        <div class="scope-fiche-top">
        <section class="scope-fiche-block scope-fiche-identity">
          <h2>Identité</h2>
          <div class="scope-fiche-identity-grid">
          ${identityField('GRADE', identity.grade)}
          ${identityField('NOM', identity.nom)}
          ${identityField('PRÉNOM', identity.prenom)}
          ${identityField('NIP', identity.nip)}
          ${identityField('STATUT', identity.statut, statutExtra)}
          </div>
        </section>
        <section class="scope-fiche-block scope-fiche-situation">
          <h2>Situation / périmètre analysé</h2>
          <div class="scope-fiche-identity-grid">
          ${identityField('DATE DE DÉBUT DE L’ANALYSE', fmtDate(identity.dateEntreeSdis))}
          ${identityField('DATE D’INACTIVITÉ', identity.statut === 'Inactif' ? fmtDate(identity.dateInactivite) : '—')}
          ${identityField('CONGÉ SABBATIQUE', identity.sabbaticalRange || '—')}
          ${identityField('PÉRIMÈTRE ANALYSÉ', `${fmtDate(period.from)} — ${fmtDate(period.to)}`)}
          </div>
        </section>
        </div>
        <div class="scope-fiche-split">
        <section class="scope-fiche-block">
          <h2>INCORPORATIONS</h2>
          ${incHtml}
        </section>
        <section class="scope-fiche-block">
          <h2>SPÉCIALISATIONS</h2>
          ${specHtml}
        </section>
        </div>
        <section class="scope-fiche-block scope-fiche-participation">
          <h2>SYNTHÈSE PARTICIPATION</h2>
          <div class="scope-kpis scope-person-kpis">
            <article class="scope-kpi"><strong>${escapeHtml(kpiCell(vol.attendus))}</strong><span>Événements attendus</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(kpiCell(vol.presents))}</strong><span>Présents</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(kpiCell(vol.excuses))}</strong><span>Excusés</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(kpiCell(vol.nonExcuses))}</strong><span>Absents</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(kpiCell(vol.dispenses))}</strong><span>Dispensés</span></article>
            <article class="scope-kpi scope-kpi-main"><strong>${escapeHtml(tauxText)}</strong><span>Taux de participation</span></article>
          </div>
        </section>
        <section class="scope-fiche-block scope-fiche-analyse">
          <h2>ANALYSE INDIVIDUELLE</h2>
          <div class="scope-fiche-charts">
            <div class="scope-fiche-chart-year">${domainYearChart}</div>
            <div class="scope-fiche-chart-year">${specYearChart}</div>
            <div class="scope-fiche-chart-donut">${repartitionChart}</div>
          </div>
        </section>
        <section class="scope-fiche-block scope-fiche-history">
          <h2>HISTORIQUE DES ÉVÉNEMENTS</h2>
          <div class="scope-fiche-filters">
            <label class="scope-field">DOMAINE
              <select id="scope-fiche-domaine">
                <option value="">Tous</option>
                ${domainCodes.map((code) => `<option value="${escapeHtml(code)}" ${state.personneDomainFilter === code ? 'selected' : ''}>${escapeHtml(domaineLabel(code))}</option>`).join('')}
              </select>
            </label>
            <div class="scope-sync-filters" role="group" aria-label="Statut">
              ${eventFilters.map(([id, label]) => `<button type="button" class="scope-btn ${state.personneEventFilter === id ? 'scope-btn-primary' : ''}" data-person-events="${id}">${escapeHtml(label)}</button>`).join('')}
            </div>
          </div>
          <div class="scope-table-wrap scope-fiche-table-wrap">
            <table class="scope-table scope-fiche-events-table">
              <thead><tr>${sortableHeader('personne-events', 'date', 'DATE', state.personneEventSort)}${sortableHeader('personne-events', 'libelle', 'ÉVÉNEMENT', state.personneEventSort)}${sortableHeader('personne-events', 'domaine', 'DOMAINE', state.personneEventSort)}${sortableHeader('personne-events', 'cible', 'CIBLE / OI', state.personneEventSort)}${sortableHeader('personne-events', 'statut', 'STATUT', state.personneEventSort)}${sortableHeader('personne-events', 'informations', 'INFORMATIONS', state.personneEventSort)}</tr></thead>
              <tbody>
                ${events.map((ev) => `<tr>
                  <td data-label="DATE">${escapeHtml(L.formatDate(ev.date) || '—')}</td>
                  <td data-label="ÉVÉNEMENT">${ev.href ? `<a class="scope-events-libelle" href="${escapeHtml(ev.href)}">${escapeHtml(ev.libelle || '—')}</a>` : escapeHtml(ev.libelle || '—')}</td>
                  <td data-label="DOMAINE">${escapeHtml(domaineLabel(ev.domaine))}</td>
                  <td data-label="CIBLE / OI">${escapeHtml(eventCible(ev))}</td>
                  <td data-label="STATUT">${escapeHtml(eventStatut(ev))}</td>
                  <td data-label="INFORMATIONS">${escapeHtml(eventInfo(ev))}</td>
                </tr>`).join('') || '<tr><td colspan="6">Aucun événement nominatif sur la période.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function canNominatif() {
    if (window.MonitoringRBAC && typeof window.MonitoringRBAC.has === 'function') {
      return window.MonitoringRBAC.has('reports:nominatif');
    }
    const permissions = (state.session && state.session.permissions) || [];
    return permissions.includes('reports:nominatif');
  }

  function reportButton(id) {
    return `<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" data-report-event="${escapeHtml(id)}">Générer le rapport</button>`;
  }

  function renderRapports() {
    const form = state.reportForm;
    const domainPeriodRoots = ['DPS', 'DAP', 'JSP'];
    const targetDomaines = (state.referentiels.domaines || []).map((d) => d.code);
    const cibles = (state.referentiels.cibles || []).filter((c) => c.domaineCode === form.domaine);
    const events = (state.list || []).slice(0, 40);
    return `
      <div class="scope-crumb">Rapports</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Production', title: 'Rapports', context: 'PDF serveur', description: 'Aperçu et téléchargement issus du même document REPORT-1.', logo: true })}
        ${periodContextHtml()}
        <div class="scope-card">
          <h2 style="margin-top:0">Pilotage Formation</h2>
          <p class="scope-mode-hint">Vision consolidée des domaines Formation, objectifs, alertes, tendances et événements à surveiller.</p>
          <div class="scope-actions">
            <a class="scope-btn scope-btn-secondary" href="#/rapports/formation">Ouvrir le rapport global Formation</a>
          </div>
        </div>
        <div class="scope-card">
          <h2 style="margin-top:0">Participation</h2>
          <p class="scope-mode-hint">Rapport de participation configurable par domaine et périmètre, avec écran et PDF fondés sur le même modèle serveur.</p>
          <div class="scope-actions">
            <a class="scope-btn scope-btn-secondary" href="#/rapports/participation">Ouvrir le rapport de participation</a>
          </div>
        </div>
        <div class="scope-card">
          <h2 style="margin-top:0">Rapports spécialisés existants</h2>
          <p class="scope-mode-hint">SCOPE-REPORT-1 — génération serveur. L’aperçu affiche exactement le PDF qui sera téléchargé. Aucun chiffre n’est recalculé dans le navigateur.</p>
          <div class="scope-report-grid">
            <div class="scope-field"><label>Type de rapport</label>
              <select id="report-kind">
                <option value="PERIOD" ${form.kind === 'PERIOD' ? 'selected' : ''}>Période SDIS</option>
                <option value="DOMAIN" ${form.kind === 'DOMAIN' ? 'selected' : ''}>Domaine / période</option>
                <option value="TARGET" ${form.kind === 'TARGET' ? 'selected' : ''}>Cible / OI</option>
                <option value="EVENT" ${form.kind === 'EVENT' ? 'selected' : ''}>Événement</option>
              </select>
            </div>
            ${form.kind === 'DOMAIN' || form.kind === 'TARGET' ? `<div class="scope-field"><label>Domaine</label>
              <select id="report-domaine">
                ${(form.kind === 'DOMAIN' ? domainPeriodRoots : targetDomaines).map((code) => `<option value="${escapeHtml(code)}" ${form.domaine === code ? 'selected' : ''}>${escapeHtml(domaineLabel(code))}</option>`).join('')}
              </select>
            </div>` : ''}
            ${form.kind === 'TARGET' ? `<div class="scope-field"><label>Cible / OI</label>
              <select id="report-cible">
                ${cibles.map((c) => `<option value="${escapeHtml(c.niveauCode)}" ${form.cible === c.niveauCode ? 'selected' : ''}>${escapeHtml(L.niveauAffiche(c.domaineCode, c.niveauCode))}</option>`).join('')}
              </select>
            </div>` : ''}
            ${form.kind === 'EVENT' ? `<div class="scope-field"><label>Événement</label>
              <select id="report-event">
                ${events.map((item) => {
                  const ev = item.evenement || item;
                  return `<option value="${escapeHtml(ev.evenement_id)}" ${form.evenementId === ev.evenement_id ? 'selected' : ''}>${escapeHtml(ev.date)} · ${escapeHtml(ev.libelle)}</option>`;
                }).join('') || '<option value="">Aucun événement sur l’année</option>'}
              </select>
            </div>` : ''}
          </div>
          <p style="color:var(--scope-muted);font-size:13px">Période : celle du bandeau (année, trimestre, mois ou plage). REPORT-1 n’ouvre pas de seconde période.</p>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="report-generate">Générer le rapport</button>
          </div>
        </div>
      </div>
    `;
  }

  function jspPercent(value) {
    return L.formatTaux(value);
  }

  function jspPersonName(row) {
    return [row.grade, row.prenom, row.nom].filter(Boolean).join(' ') || '—';
  }

  function jspBarChart(title, rows, keys) {
    const max = Math.max(1, ...rows.flatMap((row) => keys.map((key) => Number(row[key.id] || 0))));
    return `<div class="scope-card scope-jsp-chart"><h3>${escapeHtml(title)}</h3>
      <div class="scope-chart-legend">${keys.map((key) => `<span><i class="scope-jsp-bar-${escapeHtml(key.id)}"></i>${escapeHtml(key.label)} · volume</span>`).join('')}</div>
      <div class="scope-jsp-bars">
        ${rows.map((row) => `<div class="scope-jsp-bar-row">
          <span>${escapeHtml(row.label || row.site || row.date || '')}</span>
          <div class="scope-jsp-bar-stack">
            ${keys.map((key) => `<i class="scope-jsp-bar scope-jsp-bar-${escapeHtml(key.id)}" style="width:${Math.max(2, Math.round((Number(row[key.id] || 0) / max) * 100))}%" title="${escapeHtml(key.label)} ${escapeHtml(String(row[key.id] || 0))}"></i>`).join('')}
          </div>
        </div>`).join('') || '<p class="scope-mode-hint">Aucune donnée disponible pour la période sélectionnée.</p>'}
      </div>
    </div>`;
  }

  function jspLineChart(title, points) {
    const rows = points || [];
    return `<div class="scope-card scope-jsp-chart"><h3>${escapeHtml(title)}</h3>
      <div class="scope-chart-legend"><span><i class="scope-jsp-bar-presents"></i>Taux de présence · pourcentage · périmètre sélectionné</span></div>
      <div class="scope-jsp-trend">
        ${rows.map((point) => `<div class="scope-jsp-trend-item">
          <span class="scope-jsp-trend-date">${escapeHtml(point.label || point.date || '')}</span>
          <b style="height:${Math.max(4, Math.round(Number(point.value || 0)))}%" title="${escapeHtml(point.exercise || '')}">${escapeHtml(jspPercent(point.value))}</b>
        </div>`).join('') || '<p class="scope-mode-hint">Aucune donnée disponible pour la période sélectionnée.</p>'}
      </div>
    </div>`;
  }

  function jspKpi(label, value) {
    return `<div class="scope-mini-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value == null ? '—' : value))}</strong></div>`;
  }

  function participationDomainOptions() {
    const preferred = ['DPS', 'DAP', 'JSP', 'FOSPEC', 'FOBA', 'FOCA'];
    const present = new Set((state.referentiels.domaines || []).map((d) => d.code).filter(Boolean));
    return preferred.filter((code) => present.has(code) || code === 'FOSPEC');
  }

  function participationSubdomainOptions(domain) {
    return String(domain || '').toUpperCase() === 'FOSPEC'
      ? [['', 'Tous les sous-domaines'], ['PR', 'PR'], ['AUTO', 'AUTO']]
      : [];
  }

  function participationSpecialisationOptions(domain) {
    const code = String(domain || '').toUpperCase();
    const sub = String(state.participationReportSubdomain || '').toUpperCase();
    if (code === 'FOSPEC' && sub === 'PR') return [['GEN', 'PAPR'], ['ABC', 'PAPR ABC']];
    if (code === 'FOSPEC' && sub === 'AUTO') return [['VL', 'Cond VL'], ['PL', 'Cond PL']];
    return [];
  }

  function participationPerimeterOptions(domain) {
    const code = String(domain || 'JSP').toUpperCase();
    const sub = String(state.participationReportSubdomain || '').toUpperCase();
    if (code === 'JSP') return [['TOUS', 'Global du domaine'], ['G1', 'JSP G1'], ['C1', 'JSP C1'], ['B1', 'JSP B1']];
    if (code === 'PR') return [['TOUS', 'Global du domaine'], ['G1', 'DPS G1'], ['C1', 'DPS C1'], ['B1', 'DPS B1'], ['B2', 'DPS B2']];
    if (code === 'FOSPEC' && sub === 'PR') return [['TOUS', 'Global'], ['G1', 'DPS G1'], ['C1', 'DPS C1'], ['B1', 'DPS B1'], ['B2', 'DPS B2']];
    if (code === 'FOSPEC' && sub === 'AUTO') {
      const dps = [['G1', 'DPS G1'], ['C1', 'DPS C1'], ['B1', 'DPS B1'], ['B2', 'DPS B2']];
      const dap = [['Y1', 'DAP Y1'], ['Y2', 'DAP Y2'], ['Y3', 'DAP Y3'], ['Y4', 'DAP Y4']];
      return [['TOUS', 'Global']].concat(state.participationReportSpecialisation === 'PL' ? dps : dps.concat(dap));
    }
    if (code === 'FOSPEC') return [['TOUS', 'Global du domaine'], ['PR', 'PR'], ['AUTO', 'AUTO']];
    const rows = (state.referentiels.cibles || [])
      .filter((c) => String(c.domaineCode || c.domaine_code || '').toUpperCase() === code)
      .filter((c) => String(c.niveauCode || c.niveau_code || '').toUpperCase() !== 'GEN')
      .map((c) => {
        const value = String(c.niveauCode || c.niveau_code || '').toUpperCase();
        return [value, L.niveauAffiche(code, value)];
      });
    return [['TOUS', 'Global du domaine']].concat(rows);
  }

  function participationBlockOptions() {
    return [
      ['synthese', 'Synthèse générale / KPI'],
      ['alertes', 'Alertes prioritaires'],
      ['comparaisons', 'Comparaison sites / OI / cibles'],
      ['graphiques', 'Graphiques'],
      ['surveillance', 'Participation à surveiller'],
      ['regularite', 'Participation régulière'],
      ['sous_objectif', 'Personnes sous l’objectif'],
      ['nominatif', 'Analyse nominative'],
      ['motifs', 'Motifs d’excuse'],
      ['evenements', 'Analyse par événement']
    ];
  }

  function blockEnabled(key) {
    return (state.participationReportBlocks || []).includes(key);
  }

  function blockHtml(key, html) {
    return blockEnabled(key) ? html : '';
  }

  function jspPersonRows(rows, variant) {
    return (rows || []).map((row) => {
      const absence = variant === 'watch' ? `<td>${escapeHtml(String(row.totalAbsences || 0))}</td><td>${escapeHtml(jspPercent(row.absenceRate))}</td>` : '';
      const alertClass = variant === 'all' && (row.absent > 0 || row.underObjective) ? ' class="scope-row-alert"' : '';
      return `<tr${alertClass}>
        <td>${escapeHtml(row.grade || '')}</td><td>${escapeHtml(row.nom || '')}</td><td>${escapeHtml(row.prenom || '')}</td><td>${escapeHtml(row.site || '')}</td>
        <td>${escapeHtml(String(row.expected || 0))}</td><td>${escapeHtml(String(row.present || 0))}</td><td>${escapeHtml(String(row.excused || 0))}</td><td>${escapeHtml(String(row.absent || 0))}</td>
        ${absence}<td>${escapeHtml(jspPercent(row.presenceRate))}</td>
      </tr>`;
    }).join('');
  }

  function renderRapportJsp() {
    const report = state.jspReport;
    const site = state.jspReportSite || 'TOUS';
    if (state.jspReportError) {
      return `<div class="scope-crumb">Rapports / Participation</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Production', title: 'RAPPORT DE PARTICIPATION', context: 'Participation', logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.jspReportError)}</p></div></div>`;
    }
    if (!state.jspReportReady || !report) {
      return `<div class="scope-crumb">Rapports / Participation</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Production', title: 'RAPPORT DE PARTICIPATION', context: 'Participation', logo: true })}<div class="scope-card scope-placeholder"><p>Chargement du rapport de participation…</p></div></div>`;
    }
    const k = report.kpis || {};
    const siteRows = report.siteRows || [];
    const persons = report.persons || [];
    const watch = report.watchlist || [];
    const regulars = report.regulars || [];
    const exercises = report.exercises || [];
    const motifs = report.motifs || [];
    const details = report.details || [];
    const graphRows = (report.graphs && report.graphs.sites || []).map((row) => Object.assign({ label: row.label }, row));
    const motifRows = (report.graphs && report.graphs.motifs || []).slice(0, 8).map((row) => ({ label: row.label, count: row.value }));
    return `
      <div class="scope-crumb">Rapports / Participation</div>
      <div class="scope-main" ${report.domaine === 'JSP' ? 'aria-label="RAPPORT JSP"' : ''}>
        ${pageHeaderHtml({ eyebrow: 'Production', title: 'RAPPORT DE PARTICIPATION', context: `${report.domaine || state.participationReportDomain} · ${report.perimeterLabel || report.siteLabel || 'Global du domaine'}`, logo: true })}
        ${periodContextHtml()}
        <div class="scope-card">
          <div class="scope-report-filter-row">
            <a class="scope-btn scope-btn-secondary" href="#/rapports">Retour aux rapports</a>
            <div class="scope-report-grid scope-report-grid-filters">
            <div class="scope-field"><label>Domaine</label>
              <select id="participation-report-domain">
                ${participationDomainOptions().map((value) => `<option value="${escapeHtml(value)}" ${state.participationReportDomain === value ? 'selected' : ''}>${escapeHtml(domaineLabel(value))}</option>`).join('')}
              </select>
            </div>
            ${participationSubdomainOptions(state.participationReportDomain).length ? `<div class="scope-field"><label>Sous-domaine</label>
              <select id="participation-report-subdomain">
                ${participationSubdomainOptions(state.participationReportDomain).map(([value, label]) => `<option value="${escapeHtml(value)}" ${state.participationReportSubdomain === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
              </select>
            </div>` : ''}
            ${participationSpecialisationOptions(state.participationReportDomain).length ? `<div class="scope-field"><label>Spécialisation</label>
              <select id="participation-report-specialisation">
                ${participationSpecialisationOptions(state.participationReportDomain).map(([value, label]) => `<option value="${escapeHtml(value)}" ${state.participationReportSpecialisation === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
              </select>
            </div>` : ''}
            <div class="scope-field"><label>Périmètre</label>
              <select id="jsp-report-site">
                ${participationPerimeterOptions(state.participationReportDomain).map(([value, label]) => `<option value="${escapeHtml(value)}" ${site === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
              </select>
            </div>
            </div>
          </div>
          <div class="scope-report-blocks">
            ${participationBlockOptions().map(([value, label]) => `<label><input type="checkbox" data-participation-block="${escapeHtml(value)}" ${blockEnabled(value) ? 'checked' : ''}> ${escapeHtml(label)}</label>`).join('')}
          </div>
          <div class="scope-mini-kpi-grid">
            ${jspKpi(report.domaine === 'JSP' ? 'JSP concernés' : 'Personnes concernées', k.participants || k.jeunes || 0)}
            ${jspKpi('Événements comptabilisés', k.exercises || 0)}
            ${jspKpi('Participations attendues', k.expected || 0)}
            ${jspKpi('Présents', k.present || 0)}
            ${jspKpi('Excusés', k.excused || 0)}
            ${jspKpi('Absents', k.absent || 0)}
            ${jspKpi('Taux de présence', jspPercent(k.presenceRate))}
            ${jspKpi('Taux excusés', jspPercent(k.excusedRate))}
            ${jspKpi('Taux absences non excusées', jspPercent(k.absentRate))}
          </div>
          <div class="scope-actions"><button type="button" class="scope-btn scope-btn-secondary" id="jsp-report-pdf">Exporter PDF</button></div>
        </div>
        ${blockHtml('graphiques', `<div class="scope-jsp-chart-grid">
          ${jspLineChart('Évolution du taux de présence', (report.graphs && report.graphs.evolution) || [])}
          ${jspBarChart('Comparaison des sites', graphRows, [{ id: 'presents', label: 'Présents' }, { id: 'excuses', label: 'Excusés' }, { id: 'absents', label: 'Absents' }])}
          ${jspBarChart('Motifs d’excuse', motifRows, [{ id: 'count', label: 'Excuses' }])}
        </div>`)}
        ${blockHtml('comparaisons', `<div class="scope-card"><h2>Analyse par site</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Périmètre</th><th>Personnes</th><th>Événements</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Taux de présence</th></tr></thead><tbody>${siteRows.map((row) => `<tr><td>${escapeHtml(row.site)}</td><td>${row.participants || row.jeunes || 0}</td><td>${row.exercises || 0}</td><td>${row.expected || 0}</td><td>${row.present || 0}</td><td>${row.excused || 0}</td><td>${row.absent || 0}</td><td>${escapeHtml(jspPercent(row.presenceRate))}</td></tr>`).join('')}</tbody></table></div></div>`)}
        ${blockHtml('alertes', `<div class="scope-card"><h2>Alertes prioritaires</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Personne</th><th>Périmètre</th><th>Cause</th><th>Taux constaté</th><th>Absences non excusées</th><th>Objectif</th><th>Écart</th></tr></thead><tbody>${(report.alerts || []).map((row) => `<tr><td>${escapeHtml(jspPersonName(row))}</td><td>${escapeHtml(row.perimeter || '')}</td><td>${escapeHtml(row.cause)}</td><td>${escapeHtml(row.objective == null ? '—' : jspPercent(row.value))}</td><td>${escapeHtml(row.objective == null ? String(row.value ?? 0) : String(row.absent || 0))}</td><td>${escapeHtml(row.objective == null ? 'Objectif non défini' : jspPercent(row.objective))}</td><td>${escapeHtml(row.gap == null ? '—' : jspPercent(row.gap))}</td></tr>`).join('') || '<tr><td colspan="7">Aucune alerte prioritaire.</td></tr>'}</tbody></table></div></div>`)}
        ${blockHtml('surveillance', `<div class="scope-card"><h2>Participation à surveiller</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Grade</th><th>Nom</th><th>Prénom</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Absences totales</th><th>Taux d’absence</th><th>Taux de présence</th></tr></thead><tbody>${jspPersonRows(watch, 'watch') || '<tr><td colspan="11">Aucune situation à afficher.</td></tr>'}</tbody></table></div></div>`)}
        ${blockHtml('regularite', `<div class="scope-card"><h2>Participation régulière</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Grade</th><th>Nom</th><th>Prénom</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Taux de présence</th></tr></thead><tbody>${jspPersonRows(regulars, 'regular') || '<tr><td colspan="9">Aucune participation régulière à afficher.</td></tr>'}</tbody></table></div></div>`)}
        ${blockHtml('sous_objectif', `<div class="scope-card"><h2>Personnes sous l’objectif</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Grade</th><th>Nom</th><th>Prénom</th><th>NIP</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Taux</th><th>Objectif</th><th>Écart</th></tr></thead><tbody>${(report.underObjective || []).map((row) => `<tr><td>${escapeHtml(row.grade || '')}</td><td>${escapeHtml(row.nom || '')}</td><td>${escapeHtml(row.prenom || '')}</td><td>${escapeHtml(row.nip || '')}</td><td>${escapeHtml(row.perimeter || row.site || '')}</td><td>${row.expected || 0}</td><td>${row.present || 0}</td><td>${escapeHtml(jspPercent(row.presenceRate))}</td><td>${escapeHtml(row.objectivePct == null ? 'Objectif non défini' : jspPercent(row.objectivePct))}</td><td>${escapeHtml(row.objectiveGap == null ? '—' : jspPercent(row.objectiveGap))}</td></tr>`).join('') || `<tr><td colspan="10">${escapeHtml(report.objective ? 'Aucune personne sous l’objectif.' : 'Objectif non défini')}</td></tr>`}</tbody></table></div></div>`)}
        ${blockHtml('nominatif', `<div class="scope-card"><h2>Analyse nominative complète</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Grade</th><th>Nom</th><th>Prénom</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Taux de présence</th></tr></thead><tbody>${jspPersonRows(persons, 'all') || '<tr><td colspan="9">Aucune personne attendue sur la période.</td></tr>'}</tbody></table></div></div>`)}
        ${blockHtml('motifs', `<div class="scope-card"><h2>Motifs d’excuse</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Motif</th><th>Nombre</th><th>Part des excuses</th></tr></thead><tbody>${motifs.map((row) => `<tr><td>${escapeHtml(row.motif)}</td><td>${row.count || 0}</td><td>${escapeHtml(jspPercent(row.share))}</td></tr>`).join('') || '<tr><td colspan="3">Aucun motif enregistré.</td></tr>'}</tbody></table></div><details class="scope-details"><summary>Détail motifs et absences</summary><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Date</th><th>Événement</th><th>Périmètre</th><th>Personne</th><th>Statut</th><th>Motif</th></tr></thead><tbody>${details.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.exercice)}</td><td>${escapeHtml(row.site)}</td><td>${escapeHtml(jspPersonName(row))}</td><td>${escapeHtml(row.statut)}</td><td>${escapeHtml(row.motif)}</td></tr>`).join('') || '<tr><td colspan="6">Aucun détail.</td></tr>'}</tbody></table></div></details></div>`)}
        ${blockHtml('evenements', `<div class="scope-card"><h2>Analyse par exercice et événement</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Date</th><th>Événement</th><th>Domaine</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Dispensés</th><th>À renseigner</th><th>Taux</th><th>Objectif</th><th>Écart objectif</th></tr></thead><tbody>${exercises.map((row) => `<tr${row.underObjective ? ' class="scope-row-alert"' : ''}><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.libelle)}</td><td>${escapeHtml(row.domaine || report.domaine || '')}</td><td>${escapeHtml(row.site)}</td><td>${row.expected || 0}</td><td>${row.present || 0}</td><td>${row.excused || 0}</td><td>${row.absent || 0}</td><td>${row.dispensed || 0}</td><td>${row.nonRenseigne || 0}</td><td>${escapeHtml(jspPercent(row.presenceRate))}</td><td>${escapeHtml(row.objectivePct == null ? 'Objectif non défini' : jspPercent(row.objectivePct))}</td><td>${escapeHtml(row.objectiveGap == null ? '—' : jspPercent(row.objectiveGap))}</td></tr>`).join('') || '<tr><td colspan="13">Aucun événement comptabilisé.</td></tr>'}</tbody></table></div></div>`)}
      </div>
    `;
  }

  function renderFormationReport() {
    const report = state.formationReport;
    if (state.formationReportError) {
      return `<div class="scope-crumb">Rapports / Pilotage Formation</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Commandement', title: 'RAPPORT GLOBAL FORMATION', context: 'Formation', logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.formationReportError)}</p></div></div>`;
    }
    if (!state.formationReportReady || !report) {
      return `<div class="scope-crumb">Rapports / Pilotage Formation</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'Commandement', title: 'RAPPORT GLOBAL FORMATION', context: 'Formation', logo: true })}<div class="scope-card scope-placeholder"><p>Chargement du rapport global Formation…</p></div></div>`;
    }
    const k = report.kpis || {};
    const domainRows = report.domainRows || [];
    const alerts = report.alerts || [];
    const people = report.peopleToWatch || [];
    const events = report.eventsToWatch || [];
    const graphRows = (report.graphs && report.graphs.domains || []).map((row) => ({ label: row.label, taux: row.taux, objectif: row.objectif }));
    return `
      <div class="scope-crumb">Rapports / Pilotage Formation</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Commandement', title: 'RAPPORT GLOBAL FORMATION', context: periodRangeText(report.period), logo: true })}
        ${periodContextHtml()}
        <div class="scope-card">
          <div class="scope-report-filter-row">
            <a class="scope-btn scope-btn-secondary" href="#/rapports">Retour aux rapports</a>
            <div></div>
          </div>
          <div class="scope-mini-kpi-grid">
            ${jspKpi('Événements comptabilisés', k.exercises || 0)}
            ${jspKpi('Personnes distinctes', k.participants || 0)}
            ${jspKpi('Participations attendues', k.expected || 0)}
            ${jspKpi('Présents', k.present || 0)}
            ${jspKpi('Excusés', k.excused || 0)}
            ${jspKpi('Absents', k.absent || 0)}
            ${jspKpi('Taux global', jspPercent(k.presenceRate))}
            ${jspKpi('Domaines sous objectif', k.domainsUnderObjective || 0)}
            ${jspKpi('Événements sous objectif', k.eventsUnderObjective || 0)}
            ${jspKpi('Personnes sous objectif', k.peopleUnderObjective || 0)}
          </div>
          <div class="scope-actions"><button type="button" class="scope-btn scope-btn-secondary" id="formation-report-pdf">Exporter PDF Commandement</button></div>
        </div>
        <div class="scope-jsp-chart-grid">
          ${jspBarChart('Comparaison des domaines', graphRows, [{ id: 'taux', label: 'Taux réel' }, { id: 'objectif', label: 'Objectif' }])}
          ${jspLineChart('Évolution globale Formation', (report.graphs && report.graphs.evolution) || [])}
        </div>
        <div class="scope-card"><h2>Analyse par domaine</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Domaine</th><th>Personnes</th><th>Événements</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Taux</th><th>Objectif</th><th>Écart</th><th>Statut</th></tr></thead><tbody>${domainRows.map((row) => `<tr${row.underObjective ? ' class="scope-row-alert"' : ''}><td>${escapeHtml(row.label)}</td><td>${row.participants || 0}</td><td>${row.exercises || 0}</td><td>${row.expected || 0}</td><td>${row.present || 0}</td><td>${row.excused || 0}</td><td>${row.absent || 0}</td><td>${escapeHtml(jspPercent(row.presenceRate))}</td><td>${escapeHtml(row.objectivePct == null ? 'Objectif non défini' : jspPercent(row.objectivePct))}</td><td>${escapeHtml(row.objectiveGap == null ? '—' : jspPercent(row.objectiveGap))}</td><td>${escapeHtml(row.status || '')}</td></tr>`).join('') || '<tr><td colspan="11">Aucune donnée disponible pour la période sélectionnée.</td></tr>'}</tbody></table></div></div>
        <div class="scope-card"><h2>Alertes Formation</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Type</th><th>Élément</th><th>Taux constaté</th><th>Absences non excusées</th><th>Objectif</th><th>Écart</th></tr></thead><tbody>${alerts.map((row) => `<tr><td>${escapeHtml(row.type)}</td><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.objective == null ? '—' : jspPercent(row.value))}</td><td>${escapeHtml(row.objective == null ? String(row.value ?? 0) : '—')}</td><td>${escapeHtml(row.objective == null ? 'Objectif non défini' : jspPercent(row.objective))}</td><td>${escapeHtml(row.gap == null ? '—' : jspPercent(row.gap))}</td></tr>`).join('') || '<tr><td colspan="6">Aucune alerte prioritaire.</td></tr>'}</tbody></table></div></div>
        <div class="scope-card"><h2>Personnes à surveiller par domaine</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Domaine</th><th>Grade</th><th>Nom</th><th>Prénom</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Taux</th><th>Écart</th></tr></thead><tbody>${people.map((row) => `<tr><td>${escapeHtml(row.domaineLabel || row.domaine || '')}</td><td>${escapeHtml(row.grade || '')}</td><td>${escapeHtml(row.nom || '')}</td><td>${escapeHtml(row.prenom || '')}</td><td>${escapeHtml(row.site || '')}</td><td>${row.expected || 0}</td><td>${row.present || 0}</td><td>${row.excused || 0}</td><td>${row.absent || 0}</td><td>${escapeHtml(jspPercent(row.presenceRate))}</td><td>${escapeHtml(row.objectiveGap == null ? '—' : jspPercent(row.objectiveGap))}</td></tr>`).join('') || '<tr><td colspan="11">Aucune personne à surveiller.</td></tr>'}</tbody></table></div></div>
        <div class="scope-card"><h2>Événements à surveiller</h2><div class="scope-table-wrap"><table class="scope-table"><thead><tr><th>Date</th><th>Domaine</th><th>Événement</th><th>Périmètre</th><th>Attendus</th><th>Présents</th><th>Excusés</th><th>Absents</th><th>Taux</th><th>Objectif</th><th>Écart</th></tr></thead><tbody>${events.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.domaineLabel || row.domaine || '')}</td><td>${escapeHtml(row.libelle)}</td><td>${escapeHtml(row.site || '')}</td><td>${row.expected || 0}</td><td>${row.present || 0}</td><td>${row.excused || 0}</td><td>${row.absent || 0}</td><td>${escapeHtml(jspPercent(row.presenceRate))}</td><td>${escapeHtml(row.objectivePct == null ? 'Objectif non défini' : jspPercent(row.objectivePct))}</td><td>${escapeHtml(row.objectiveGap == null ? '—' : jspPercent(row.objectiveGap))}</td></tr>`).join('') || '<tr><td colspan="11">Aucun événement sous objectif.</td></tr>'}</tbody></table></div></div>
        <div class="scope-card"><h2>Lecture positive</h2><p class="scope-mode-hint">${escapeHtml((report.positiveDomains || []).length ? `Domaines atteignant l’objectif : ${(report.positiveDomains || []).map((row) => row.label).join(', ')}.` : 'Aucun objectif de domaine atteint sur la période sélectionnée.')}</p></div>
      </div>
    `;
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function objectifPorteeLabel(row) {
    const ux = L.objectifUxFromRow(row, state.referentiels.cibles);
    return ux.porteeLabel;
  }

  function objectifCibleLabel(row) {
    const ux = L.objectifUxFromRow(row, state.referentiels.cibles);
    return ux.cibleLabel || '—';
  }

  function objectifDomaineLabel(row) {
    const ux = L.objectifUxFromRow(row, state.referentiels.cibles);
    return ux.domaineUx || '—';
  }

  function objectifAppliqueCard(resolved) {
    if (!resolved) {
      return `<div class="scope-card scope-kpi-card scope-objectif-applique" id="obj-applique-result" tabindex="-1">
          <p class="scope-page-eyebrow">Résultat</p>
          <h2 style="margin:0">AUCUN OBJECTIF DÉFINI</h2>
          <p>Aucun objectif de participation n’est défini pour ce périmètre à cette date.</p>
        </div>`;
    }
    const ux = L.objectifUxFromRow(resolved, state.referentiels.cibles);
    const debut = L.formatDate(resolved.dateDebut);
    const fin = resolved.dateFin ? L.formatDate(resolved.dateFin) : 'ouverte';
    const source = ux.domaineUx && ux.cibleUx ? `${ux.domaineUx} / ${ux.cibleUx}` : (ux.domaineUx || ux.porteeLabel);
    return `<div class="scope-card scope-kpi-card scope-objectif-applique" id="obj-applique-result" tabindex="-1">
          <p class="scope-page-eyebrow">Résultat</p>
          <h2 style="margin:0">OBJECTIF APPLIQUÉ</h2>
          <p class="scope-kpi"><strong>${escapeHtml(L.formatTaux(resolved.thresholdPct))}</strong></p>
          <p>Portée : ${escapeHtml(ux.porteeLabel)}</p>
          <p>Domaine : ${escapeHtml(ux.domaineUx || '—')}</p>
          <p>Cible : ${escapeHtml(ux.cibleLabel || '—')}</p>
          <p>Période : ${escapeHtml(debut)} → ${escapeHtml(fin)}</p>
          <p>Source : ${escapeHtml(source || ux.porteeLabel)}</p>
        </div>`;
  }

  function fillObjectifFormFromRow(row) {
    if (!row) return;
    const ux = L.objectifUxFromRow(row, state.referentiels.cibles);
    const debut = row.dateDebut || '';
    const year = L.extractCalendarYear(debut) || String(state.year || '2026');
    state.objectifForm = Object.assign({}, state.objectifForm, {
      portee: ux.portee || row.scope || 'GLOBAL',
      domaineCode: ux.domaineUx || row.domaineCode || 'DPS',
      cibleCode: ux.cibleUx || '',
      cibleId: row.cibleId || '',
      annee: year,
      seuilPct: row.thresholdPct != null ? String(row.thresholdPct) : '',
      dateDebut: row.dateDebut || '',
      dateFin: row.dateFin || '',
      commentaire: row.commentaire || ''
    });
  }

  function renderObjectifRowMenu(today) {
    const id = state.objectifMenuId;
    const row = (state.objectifs || []).find((item) => item.objectifId === id);
    if (!row) return '';
    const future = L.objectifIsFuture(row, today);
    const actif = row.actif !== false;
    return `<div class="scope-row-more-menu" id="scope-objectif-row-menu" role="menu">
      ${future ? `<button type="button" role="menuitem" data-obj-edit="${escapeHtml(row.objectifId)}">Modifier</button>` : `<button type="button" role="menuitem" data-obj-protege="${escapeHtml(row.objectifId)}">Modifier</button>`}
      ${actif ? `<button type="button" role="menuitem" data-obj-periode="${escapeHtml(row.objectifId)}">Nouvelle période</button>` : ''}
      ${actif && !row.dateFin ? `<button type="button" role="menuitem" data-obj-cloturer="${escapeHtml(row.objectifId)}">Clôturer</button>` : ''}
      ${future ? `<button type="button" role="menuitem" class="is-danger" data-obj-supprimer="${escapeHtml(row.objectifId)}">Supprimer</button>` : ''}
    </div>`;
  }

  function positionObjectifRowMenu() {
    const menu = document.getElementById('scope-objectif-row-menu');
    const id = state.objectifMenuId;
    if (!menu || !id) return;
    const trigger = document.querySelector(`[data-obj-more="${CSS.escape(String(id))}"]`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = menu.offsetWidth || 196;
    const height = menu.offsetHeight || 88;
    let left = rect.right - width;
    if (left < 8) left = 8;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    let top = rect.bottom - 2;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height + 2);
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
  }

  function renderObjectifs() {
    const form = state.objectifForm;
    const filters = state.objectifFilters || {};
    const preview = state.objectifPreview || {};
    const today = todayIso();
    const domainOpts = L.objectifDomainOptions();
    const formCibles = L.objectifCibleOptions(form.domaineCode, state.referentiels.cibles);
    const previewCibles = L.objectifCibleOptions(preview.domaine, state.referentiels.cibles);
    const filtered = L.filterObjectifs(state.objectifs || [], filters, today, state.referentiels.cibles);
    const rows = L.sortObjectifs(filtered, state.objectifSort, today);
    const action = state.objectifAction;
    const focus = (state.objectifs || []).find((row) => row.objectifId === state.objectifFocusId);
    const canWrite = hasScopePermission('references:manage');
    const years = Array.from({ length: 8 }, (_, i) => String(2024 + i));
    const hint = L.objectifHint(form);
    const domainSelect = (id, value, emptyLabel) => `<select id="${id}">
              ${emptyLabel ? `<option value="">${escapeHtml(emptyLabel)}</option>` : ''}
              ${domainOpts.map((d) => `<option value="${escapeHtml(d.code)}" ${d.code === value ? 'selected' : ''}>${escapeHtml(d.label)}</option>`).join('')}
            </select>`;
    const modal = (action === 'create' || action === 'edit') ? `<div class="scope-modal"><div class="scope-card">
          <h3>${action === 'edit' ? 'Modifier l’objectif' : 'Nouvel objectif'}</h3>
          <div class="scope-field"><label>Portée</label>
            <select id="obj-portee">
              <option value="GLOBAL" ${form.portee === 'GLOBAL' ? 'selected' : ''}>Général — objectif par défaut</option>
              <option value="DOMAINE" ${form.portee === 'DOMAINE' ? 'selected' : ''}>Domaine — ensemble d’un domaine</option>
              <option value="CIBLE" ${form.portee === 'CIBLE' ? 'selected' : ''}>Cible — population précise</option>
            </select>
          </div>
          ${form.portee !== 'GLOBAL' ? `<div class="scope-field" style="margin-top:8px"><label>Domaine</label>${domainSelect('obj-domaine', form.domaineCode)}</div>` : ''}
          ${form.portee === 'CIBLE' ? `<div class="scope-field" style="margin-top:8px"><label>Cible</label>
            <select id="obj-cible">${formCibles.map((c) => `<option value="${escapeHtml(c.code)}" ${c.code === form.cibleCode ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('') || '<option value="">Aucune</option>'}</select>
          </div>` : ''}
          ${hint ? `<p class="scope-mode-hint">${escapeHtml(hint)}</p>` : ''}
          <div class="scope-field" style="margin-top:8px"><label>Année</label>
            <select id="obj-annee">${years.map((y) => `<option value="${y}" ${form.annee === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
          </div>
          <div class="scope-field" style="margin-top:8px"><label>Date de début</label><input id="obj-debut" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" value="${escapeHtml(L.formatUiDate(form.dateDebut))}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Date de fin</label><input id="obj-fin" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" value="${escapeHtml(L.formatUiDate(form.dateFin))}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Objectif de participation (%)</label><input id="obj-seuil" type="number" min="0" max="100" step="0.1" value="${escapeHtml(form.seuilPct)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Commentaire</label><textarea id="obj-commentaire">${escapeHtml(form.commentaire)}</textarea></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-save">Enregistrer l’objectif</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div></div>` : '';
    const clotureModal = action === 'cloturer' && focus ? `<div class="scope-modal"><div class="scope-card">
          <h3>Clôturer l’objectif</h3>
          <p>${escapeHtml(objectifPorteeLabel(focus))} · ${escapeHtml(L.formatTaux(focus.thresholdPct))}</p>
          <div class="scope-field"><label>Dernier jour d’application</label><input id="obj-cloture-date" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" value="${escapeHtml(L.formatUiDate(form.dateFin || form.dateDebut))}"></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-cloture-save">Clôturer</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div></div>` : '';
    const periodeModal = action === 'periode' && focus ? `<div class="scope-modal"><div class="scope-card">
          <h3>Nouvelle période</h3>
          <p>La période précédente est clôturée la veille. L’historique conserve l’ancien seuil.</p>
          <div class="scope-field"><label>Nouveau début</label><input id="obj-periode-debut" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" value="${escapeHtml(L.formatUiDate(form.dateDebut))}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Nouveau seuil %</label><input id="obj-periode-seuil" type="number" min="0" max="100" step="0.1" value="${escapeHtml(form.seuilPct)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Fin</label><input id="obj-periode-fin" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" value="${escapeHtml(L.formatUiDate(form.dateFin))}"></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-periode-save">Enregistrer l’objectif</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div></div>` : '';
    const deleteModal = action === 'supprimer' && focus ? `<div class="scope-modal"><div class="scope-card">
          <h3>SUPPRIMER L’OBJECTIF ?</h3>
          <p>Cette action supprimera définitivement cet objectif futur.</p>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-danger" id="obj-delete-confirm">Supprimer</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div></div>` : '';
    const protectModal = action === 'protege' && focus ? `<div class="scope-modal"><div class="scope-card">
          <h3>Historique protégé</h3>
          <p>${escapeHtml(L.historiqueProtegeMessage())}</p>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" data-obj-periode="${focus.objectifId}">Nouvelle période</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div></div>` : '';
    return `
      <div class="scope-crumb">Réglages / Objectifs</div>
      <div class="scope-main">
        ${pageHeaderHtml({
          eyebrow: 'Réglages / Application',
          title: 'OBJECTIFS DE PARTICIPATION',
          context: 'Référentiel temporel',
          description: 'Définissez les seuils de participation utilisés par les analyses et rapports SCOPE.',
          logo: true
        })}
        <div class="scope-card">
          <p><strong>Général</strong> — Objectif par défaut utilisé lorsqu’aucun objectif plus précis n’est défini.</p>
          <p><strong>Domaine</strong> — Objectif applicable à l’ensemble d’un domaine.</p>
          <p><strong>Cible</strong> — Objectif applicable à une population plus précise à l’intérieur d’un domaine.</p>
          <p class="scope-mode-hint">Priorité : Cible → Domaine → Général</p>
        </div>
        <div class="scope-toolbar">
          <div class="scope-field">
            <label>Période / année</label>
            <select id="obj-filter-annee">
              <option value="">Toutes</option>
              ${years.map((y) => `<option value="${y}" ${filters.annee === y ? 'selected' : ''}>${y}</option>`).join('')}
            </select>
          </div>
          <div class="scope-field">
            <label>Portée</label>
            <select id="obj-filter-portee">
              <option value="">Toutes</option>
              <option value="GLOBAL" ${filters.portee === 'GLOBAL' ? 'selected' : ''}>Général</option>
              <option value="DOMAINE" ${filters.portee === 'DOMAINE' ? 'selected' : ''}>Domaine</option>
              <option value="CIBLE" ${filters.portee === 'CIBLE' ? 'selected' : ''}>Cible</option>
            </select>
          </div>
          <div class="scope-field">
            <label>Domaine</label>
            <select id="obj-filter-domaine">
              <option value="">Tous</option>
              ${domainOpts.map((d) => `<option value="${escapeHtml(d.code)}" ${filters.domaine === d.code ? 'selected' : ''}>${escapeHtml(d.label)}</option>`).join('')}
            </select>
          </div>
          <div class="scope-field">
            <label>Statut</label>
            <select id="obj-filter-statut">
              <option value="">Tous</option>
              <option value="ACTIF" ${filters.statut === 'ACTIF' ? 'selected' : ''}>Actif</option>
              <option value="FUTUR" ${filters.statut === 'FUTUR' ? 'selected' : ''}>Futur</option>
              <option value="TERMINE" ${filters.statut === 'TERMINE' ? 'selected' : ''}>Terminé</option>
            </select>
          </div>
          ${canWrite ? '<button type="button" class="scope-btn scope-btn-primary" id="obj-add">Nouvel objectif</button>' : ''}
        </div>
        <div class="scope-card">
          <div class="scope-table-wrap">
            <table class="scope-table" id="obj-table">
              <thead><tr>
                ${sortableHeader('objectifs', 'periode', 'PÉRIODE', state.objectifSort)}
                ${sortableHeader('objectifs', 'portee', 'PORTÉE', state.objectifSort)}
                ${sortableHeader('objectifs', 'domaine', 'DOMAINE', state.objectifSort)}
                ${sortableHeader('objectifs', 'cible', 'CIBLE', state.objectifSort)}
                ${sortableHeader('objectifs', 'objectif', 'OBJECTIF', state.objectifSort)}
                ${sortableHeader('objectifs', 'debut', 'DÉBUT', state.objectifSort)}
                ${sortableHeader('objectifs', 'fin', 'FIN', state.objectifSort)}
                ${sortableHeader('objectifs', 'statut', 'STATUT', state.objectifSort)}
                <th>ACTIONS</th>
              </tr></thead>
              <tbody>
                ${rows.map((row) => {
                  const life = L.objectifLifecycleStatus(row, today);
                  return `<tr>
                    <td data-label="Période">${escapeHtml(L.objectifPeriodLabel(row))}</td>
                    <td data-label="Portée">${escapeHtml(objectifPorteeLabel(row))}</td>
                    <td data-label="Domaine">${escapeHtml(objectifDomaineLabel(row))}</td>
                    <td data-label="Cible">${escapeHtml(objectifCibleLabel(row))}</td>
                    <td data-label="Objectif">${escapeHtml(L.formatTaux(row.thresholdPct))}</td>
                    <td data-label="Début">${escapeHtml(L.formatDate(row.dateDebut))}</td>
                    <td data-label="Fin">${row.dateFin ? escapeHtml(L.formatDate(row.dateFin)) : 'Ouverte'}</td>
                    <td data-label="Statut">${escapeHtml(L.objectifLifecycleLabel(life))}</td>
                    <td data-label="Actions">
                      ${canWrite ? `<span class="scope-row-more">
                        <button type="button" class="scope-row-more-trigger" data-obj-more="${row.objectifId}" aria-label="Actions" aria-haspopup="menu" aria-expanded="${state.objectifMenuId === row.objectifId ? 'true' : 'false'}">⋯</button>
                      </span>` : ''}
                    </td>
                  </tr>`;
                }).join('') || `<tr><td colspan="9">${escapeHtml(L.emptyMessage('objectifs'))}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="scope-card" style="margin-top:16px">
          <h2>OBJECTIF APPLIQUÉ</h2>
          <p class="scope-mode-hint">Vérifiez quel objectif sera utilisé pour une date et un périmètre donnés.</p>
          <div class="scope-toolbar">
            <div class="scope-field"><label>Date</label><input id="obj-preview-date" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" value="${escapeHtml(L.formatUiDate(preview.date || ''))}"></div>
            <div class="scope-field"><label>Domaine</label>${domainSelect('obj-preview-domaine', preview.domaine, 'Aucun')}</div>
            <div class="scope-field"><label>Cible</label>
              <select id="obj-preview-cible">
                <option value="">Aucune</option>
                ${previewCibles.map((c) => `<option value="${escapeHtml(c.code)}" ${c.code === preview.cibleCode ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
              </select>
            </div>
            <button type="button" class="scope-btn scope-btn-primary" id="obj-preview">Vérifier l’objectif</button>
          </div>
          ${preview.looked ? objectifAppliqueCard(preview.result) : ''}
        </div>
      </div>
      ${modal}${clotureModal}${periodeModal}${deleteModal}${protectModal}
      ${state.objectifMenuId ? renderObjectifRowMenu(today) : ''}
    `;
  }

  function renderNouveau() {
    const domaine = state.domaineForm || 'DPS';
    const cibles = L.sortCiblesForEventForm
      ? L.sortCiblesForEventForm(state.referentiels.cibles.filter((c) => c.domaineCode === domaine))
      : state.referentiels.cibles.filter((c) => c.domaineCode === domaine);
    const suggestion = state.modeSuggestion;
    const chosen = state.modeChoice;
    const requireExplicit = Boolean(suggestion && suggestion.requireExplicit);
    const prHint = domaine === 'PR'
      ? '<p class="scope-mode-hint">Général / PAPR = tous les PAPR actifs à la date, y compris PR-ABC. PR-ABC = uniquement les personnes PR-ABC actives. Le ciblage est stocké sur la cible, jamais déduit du libellé.</p>'
      : '';
    return `
      <div class="scope-crumb">Événements / Nouvel événement</div>
      <div class="scope-main">
        <div class="scope-card" style="max-width:640px">
          <h2 style="margin-top:0">Créer un événement</h2>
          <div class="scope-field"><label>Date</label><input id="new-date" type="date" value="${escapeHtml(state.dateForm || `${state.year}-03-12`)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Domaine</label>
            <select id="new-domaine">${state.referentiels.domaines.map((d) => `<option value="${d.code}" ${d.code === domaine ? 'selected' : ''}>${escapeHtml(d.libelleAffiche || L.domaineAffiche(d.code))}</option>`).join('')}</select>
          </div>
          <div class="scope-field" style="margin-top:8px"><label>Cible(s)</label>
            ${prHint}
            <div id="new-cibles" class="scope-chips">
              ${cibles.map((c) => `<label style="display:inline-flex;gap:6px;align-items:center;font-size:13px">
                <input type="checkbox" value="${c.cibleId}" ${state.cibleForm.includes(c.cibleId) ? 'checked' : ''}> ${escapeHtml(L.niveauAffiche(c.domaineCode, c.niveauCode))}
              </label>`).join('') || '<span class="scope-empty">Aucune cible</span>'}
            </div>
          </div>
          <div class="scope-field"><label>Libellé</label><input id="new-libelle" type="text" placeholder="Habileté incendie" value="${escapeHtml(state.libelleForm || '')}"></div>
          <fieldset class="scope-field scope-mode-choice" style="margin-top:12px">
            <legend>Mode de suivi</legend>
            <p class="scope-mode-hint" style="margin:0 0 8px">${escapeHtml((suggestion && suggestion.message) || 'Choisissez Nominatif ou Quantitatif. Le mode n’est jamais changé sans votre accord.')}</p>
            ${requireExplicit ? '<p class="scope-mode-hint">Les cibles n’ont pas la même règle : le choix est obligatoire.</p>' : ''}
            <label class="scope-radio"><input type="radio" name="new-mode" value="NOMINATIF" ${chosen === 'NOMINATIF' ? 'checked' : ''}> Nominatif</label>
            <label class="scope-radio"><input type="radio" name="new-mode" value="QUANTITATIF" ${chosen === 'QUANTITATIF' ? 'checked' : ''}> Quantitatif</label>
          </fieldset>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="new-save">Créer</button>
            <a class="scope-btn" href="#/exercices">Annuler</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderSuiviNominatif() {
    const tree = (state.referentiels && state.referentiels.arbre) || [];
    const rules = (state.referentiels && state.referentiels.suiviNominatif) || [];
    return `
      <div class="scope-crumb">Réglages / Suivi nominatif</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages / Application', title: 'Suivi nominatif', context: 'Configuration', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Suivi nominatif configurable</h2>
          <p class="scope-mode-hint">Le nominatif est possible pour tous les domaines, sous-domaines et cibles. Ce réglage propose un mode à la création ou à l’import. Il ne transforme pas les événements existants et ne crée pas de personnes fictives.</p>
          <p>Résolution : <strong>CIBLE &gt; SOUS-DOMAINE &gt; DOMAINE &gt; GLOBAL</strong>.</p>
          <div class="scope-table-wrap">
            <table class="scope-table">
              <thead><tr><th>Portée</th><th>Nominatif autorisé</th><th>Début</th></tr></thead>
              <tbody>
                ${rules.length ? rules.map((row) => `<tr>
                  <td data-label="Portée">${escapeHtml(row.portee)}${row.domaineCode ? ` · ${escapeHtml(row.domaineCode)}` : ''}${row.sousDomaineCode ? ` / ${escapeHtml(row.sousDomaineCode)}` : ''}</td>
                  <td data-label="Nominatif">${row.nominatifAutorise ? 'Oui' : 'Non'}</td>
                  <td data-label="Début">${escapeHtml(L.formatDate(row.dateDebut))}</td>
                </tr>`).join('') : '<tr><td colspan="3">Règle par défaut : nominatif possible.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="scope-card" style="margin-top:12px">
          <h2 style="margin-top:0">Référentiel</h2>
          <p class="scope-mode-hint">PR (PAPR) et AUTO sont des sous-domaines de FOSPEC. Les codes domaine PR/AUTO sont conservés pour les événements et les cibles.</p>
          ${tree.map((d) => `
            <p><strong>${escapeHtml(d.libelleAffiche || d.code)}</strong> — ${escapeHtml(d.libelle || '')}</p>
            ${(d.sousDomaines || []).map((s) => `<p style="margin-left:16px">${escapeHtml(s.libelleAffiche || s.code)} — ${escapeHtml(s.libelle || '')}</p>`).join('')}
          `).join('')}
        </div>
      </div>
    `;
  }

  function volumesBlock(saisie, opts) {
    const s = saisie || {};
    const t = (opts && opts.taux) || {};
    const officiel = Boolean(opts && opts.officiel);
    return `
      <div class="scope-card" style="margin-top:12px">
        <h3 style="margin-top:0">Présences</h3>
        <dl class="scope-meta">
          <div><dt>Attendus</dt><dd>${escapeHtml(String(s.nb_attendus ?? '—'))}</dd></div>
          <div><dt>Présents</dt><dd>${escapeHtml(String(s.nb_presents ?? '—'))}</dd></div>
          <div><dt>Excusés</dt><dd>${escapeHtml(String(s.nb_excuses ?? '—'))}</dd></div>
          <div><dt>dont privé</dt><dd>${escapeHtml(String(s.nb_excuses_prive ?? '—'))}</dd></div>
          <div><dt>dont professionnel</dt><dd>${escapeHtml(String(s.nb_excuses_professionnel ?? '—'))}</dd></div>
          <div><dt>dont armée</dt><dd>${escapeHtml(String(s.nb_excuses_armee ?? '—'))}</dd></div>
          <div><dt>dont accident/maladie</dt><dd>${escapeHtml(String(s.nb_excuses_accident_maladie ?? '—'))}</dd></div>
          ${Number(s.nb_excuses_non_precise) > 0 ? `<div><dt>dont non précisé</dt><dd>${escapeHtml(String(s.nb_excuses_non_precise))}</dd></div>` : ''}
          <div><dt>Non excusés</dt><dd>${escapeHtml(String(s.nb_non_excuses ?? '—'))}</dd></div>
          <div><dt>Dispensés</dt><dd>${escapeHtml(String(s.nb_dispenses ?? '—'))}</dd></div>
          ${Number(s.nb_permutations) > 0 ? `<div><dt>Dont permutations</dt><dd>${escapeHtml(String(s.nb_permutations))}</dd></div>` : ''}
        </dl>
      </div>
      <div class="scope-card" style="margin-top:12px">
        <h3 style="margin-top:0">${officiel ? 'Taux officiel SCOPE' : 'Aperçu du taux'}</h3>
        ${officiel ? '' : '<p style="color:var(--scope-muted);margin-top:0">Ce n’est pas un KPI officiel réalisé. L’événement n’est pas encore clôturé.</p>'}
        <p style="font-size:28px;margin:8px 0 0">${escapeHtml(L.formatTaux(t.percentage))}</p>
        <p style="color:var(--scope-muted);margin-top:4px">${escapeHtml(String(t.numerator ?? '—'))} / ${escapeHtml(String(t.denominator ?? '—'))}</p>
      </div>`;
  }

  function eventIdentityBand(ev, fiche, options) {
    const preview = options && options.preview;
    const mode = eventMode(ev);
    const isLegacy = ev.origine === 'LEGACY_AGGREGATED';
    const horaire = [ev.heure_debut, ev.heure_fin].filter(Boolean).join('–');
    const bits = [
      L.formatDate(ev.date),
      horaire,
      domaineLabel(ev.domaine_code),
      L.ciblesLabel(ciblesOf(fiche)),
      L.modeLabel(mode)
    ].filter(Boolean);
    if (isLegacy) bits.push('Aucune population (legacy)');
    else if (mode !== 'QUANTITATIF' && ev.population_figee) bits.push('Population figée');
    else if (mode !== 'QUANTITATIF' && preview) bits.push('Preview prête');
    return `<header class="scope-event-identity">
      <h1 class="scope-event-title">${escapeHtml(ev.libelle)}</h1>
      <p class="scope-event-meta">${bits.map((bit) => `<span class="scope-event-meta-item">${escapeHtml(bit)}</span>`).join('<span class="scope-event-meta-sep">·</span>')}
        ${isLegacy ? '<span class="scope-badge"><span class="scope-dot LEGACY"></span>Historique agrégé</span>' : statutBadge(ev.statut)}
      </p>
    </header>`;
  }

  function eventCycleSummary(fiche) {
    const cycle = fiche && fiche.cycle;
    if (!cycle || !cycle.cycle_id) return '';
    const period = [cycle.date_debut, cycle.date_fin].filter(Boolean).map(L.formatDate).join(' – ') || (cycle.annee ? String(cycle.annee) : '—');
    const progress = cycle.exigibleCount
      ? `${cycle.realisedCount || 0}/${cycle.exigibleCount} réalisé${Number(cycle.realisedCount || 0) > 1 ? 's' : ''}`
      : 'Aucun événement exigible';
    const cancelled = Number(cycle.cancelledCount || 0);
    return `<div class="scope-fiche-cycle">
      <a href="#/cycles/${escapeHtml(cycle.cycle_id)}">${escapeHtml(cycle.libelle || 'Cycle')}</a>
      <span>${escapeHtml(period)}</span>
      <span>${escapeHtml(String(cycle.eventCount || 0))} événement${Number(cycle.eventCount || 0) > 1 ? 's' : ''}</span>
      <span>${escapeHtml(progress)}${cancelled ? ` · ${cancelled} annulé${cancelled > 1 ? 's' : ''}` : ''}</span>
    </div>`;
  }

  function renderFicheIdentity(ev, fiche) {
    const mode = eventMode(ev);
    const isLegacy = ev.origine === 'LEGACY_AGGREGATED';
    const horaire = [ev.heure_debut, ev.heure_fin].filter(Boolean).join(' – ');
    const publicOi = L.ciblesLabel(ciblesOf(fiche));
    const meta = [
      L.formatDate(ev.date),
      horaire || null,
      domaineLabel(ev.domaine_code),
      publicOi && publicOi !== '—' ? publicOi : null
    ].filter(Boolean);
    const tech = [isLegacy ? L.modeLabel('LEGACY') : L.modeLabel(mode)];
    if (!isLegacy && mode !== 'QUANTITATIF' && ev.population_figee) tech.push('Population figée');
    return `<header class="scope-fiche-identity">
      <div>
        <p class="scope-page-eyebrow">Événement</p>
        <h1>${escapeHtml(ev.libelle)}</h1>
        <p class="scope-fiche-meta-line">${meta.map((bit) => `<span>${escapeHtml(bit)}</span>`).join('<span class="scope-event-meta-sep">·</span>')}</p>
        <div class="scope-fiche-identity-status">
          ${eventBusinessStateBadge(fiche)}
          ${tech.map((item) => `<span class="scope-fiche-tech">${escapeHtml(item)}</span>`).join('')}
        </div>
        ${eventCycleSummary(fiche)}
      </div>
    </header>`;
  }

  function renderFicheSummary(fiche, ev, mode, previewCount, jeunesCount) {
    const items = [];
    const qty = mode === 'QUANTITATIF' ? fiche.saisieQuantitative : null;
    const c = (fiche && fiche.compteurs) || {};
    const legacy = fiche && fiche.legacy;
    if (qty) {
      items.push({ label: 'Attendus', value: qty.nb_attendus ?? '—' });
      items.push({ label: 'Présents', value: qty.nb_presents ?? '—' });
      if (qty.nb_excuses != null && qty.nb_excuses !== '') items.push({ label: 'Excusés', value: qty.nb_excuses });
      if (qty.nb_non_excuses != null && qty.nb_non_excuses !== '') items.push({ label: 'Non excusés', value: qty.nb_non_excuses });
      if (qty.nb_dispenses != null && qty.nb_dispenses !== '') items.push({ label: 'Dispensés', value: qty.nb_dispenses });
      if (c.percentage != null && c.percentage !== '') items.push({ label: 'Aperçu du taux', value: L.formatTaux(c.percentage) });
    } else if (ev.origine === 'LEGACY_AGGREGATED' && legacy) {
      const att = (legacy.payload_v67 && legacy.payload_v67.total_attendu) || legacy.nb_convoques;
      items.push({ label: 'Présents', value: legacy.nb_presents ?? '—' });
      if (att != null && att !== '') items.push({ label: 'Attendus', value: att });
      items.push({ label: 'Taux historique', value: L.formatTaux(L.legacyTauxFromRow(legacy)) });
    } else {
      if (previewCount != null) items.push({ label: 'Attendus', value: previewCount });
      if (jeunesCount) items.push({ label: 'Jeunes JSP', value: jeunesCount });
      if (c.presents != null && c.presents !== '') items.push({ label: 'Présents', value: c.presents });
      if (c.open != null && c.open !== '') items.push({ label: 'À renseigner', value: c.open, emphasis: Number(c.open) > 0 });
    }
    if (!items.length) return '';
    let extra = '';
    if (qty && (Number(qty.nb_excuses_prive) || Number(qty.nb_excuses_professionnel) || Number(qty.nb_excuses_armee) || Number(qty.nb_excuses_accident_maladie) || Number(qty.nb_excuses_non_precise) || Number(qty.nb_permutations))) {
      extra = `<p class="scope-fiche-tech-note">${[
        Number(qty.nb_excuses_prive) ? `Privé ${qty.nb_excuses_prive}` : '',
        Number(qty.nb_excuses_professionnel) ? `Professionnel ${qty.nb_excuses_professionnel}` : '',
        Number(qty.nb_excuses_armee) ? `Armée ${qty.nb_excuses_armee}` : '',
        Number(qty.nb_excuses_accident_maladie) ? `Accident/maladie ${qty.nb_excuses_accident_maladie}` : '',
        Number(qty.nb_excuses_non_precise) ? `Non précisé ${qty.nb_excuses_non_precise}` : '',
        Number(qty.nb_permutations) ? `Permutations ${qty.nb_permutations}` : ''
      ].filter(Boolean).join(' · ')}</p>`;
    }
    if (ev.origine === 'LEGACY_AGGREGATED' && legacy) {
      extra += `<p class="scope-fiche-tech-note">Historique non nominatif, hors taux SCOPE.${legacy.payload_v67 && legacy.payload_v67.a_comptabiliser != null ? ` Comptabilisé : ${legacy.payload_v67.a_comptabiliser ? 'oui' : 'non'}.` : ''}${legacy.payload_v67 && legacy.payload_v67.nb_permutation != null ? ` Permutations : ${legacy.payload_v67.nb_permutation}.` : ''}</p>`;
    }
    return `<section class="scope-card scope-fiche-section">
      <div class="scope-section-header"><h2 class="scope-section-title">Synthèse</h2></div>
      ${renderKpiGrid(items, 'Synthèse de l’événement')}
      ${extra}
    </section>`;
  }

  function renderFicheLifecycleActions(ev, isLegacy, qty) {
    if (isLegacy || qty) return '';
    const canEdit = ev.statut === 'PLANIFIE' || ev.statut === 'REPORTE';
    const canPostpone = ev.statut === 'PLANIFIE';
    const canCancel = ev.statut !== 'ANNULE' && ev.statut !== 'REALISE';
    return [
      canEdit ? '<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="edit-event">Modifier l’événement</button>' : '',
      canPostpone ? '<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="postpone-event">Reporter</button>' : '',
      canCancel ? '<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact scope-fiche-cancel" id="cancel-event">Annuler</button>' : ''
    ].join('');
  }

  function renderFichePrimaryAction(cta, lifecycleActions = '') {
    if (!cta && !lifecycleActions) return '';
    return `<section class="scope-card scope-fiche-section scope-fiche-primary">
      <div class="scope-section-header"><h2 class="scope-section-title">Action</h2></div>
      <div class="scope-actions scope-event-toolbar scope-fiche-primary-actions">
        ${cta ? `<button type="button" class="scope-btn scope-btn-primary scope-fiche-cta" data-cta="${cta.action}">${escapeHtml(cta.label)}</button>` : ''}
        ${lifecycleActions || ''}
      </div>
    </section>`;
  }

  function renderFicheSecondaryActions(ev, extraActions, isLegacy) {
    return `<section class="scope-card scope-fiche-section scope-fiche-secondary">
      <div class="scope-section-header"><h2 class="scope-section-title">Autres actions</h2></div>
      <div class="scope-actions scope-event-toolbar scope-fiche-secondary-actions">${extraActions || ''}${reportButton(ev.evenement_id)}</div>
    </section>`;
  }

  function renderFiche() {
    const fiche = state.fiche;
    if (!fiche) {
      const loading = state.loading || !state.ficheReady;
      return `<div class="scope-crumb">Événements</div><div class="scope-main"><div class="scope-card scope-placeholder"><p>${escapeHtml(loading ? 'Chargement de l’événement…' : 'Événement introuvable.')}</p></div></div>`;
    }
    const ev = fiche.evenement;
    const mode = eventMode(ev);
    if (ev.statut === 'REALISE') return renderRealise();
    const cta = L.principalCta({
      statut: ev.statut,
      populationFigee: ev.population_figee,
      previewReady: Boolean(state.preview),
      origine: ev.origine,
      modeSuivi: mode
    });
    const isLegacy = ev.origine === 'LEGACY_AGGREGATED';
    const qty = mode === 'QUANTITATIF';
    const previewPeople = (!qty && state.preview)
      ? (state.preview.personnes || []).filter((p) => !state.pendingRetraits.includes(p.personneId))
      : [];
    const previewCount = (!qty && state.preview) ? previewPeople.length + ((state.pendingExceptions || []).length) : null;
    const jeunesCount = (!qty && state.preview)
      ? (((state.preview.jeunes) || previewPeople.filter((p) => p.jspRole === 'JEUNE')).filter((p) => !state.pendingRetraits.includes(p.personneId))).length
      : 0;
    const extraActions = [
      qty && ev.statut === 'PLANIFIE'
        ? '<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="convert-nominatif">Passer en nominatif</button>'
        : ''
    ].join('');
    const lifecycleActions = renderFicheLifecycleActions(ev, isLegacy, qty);
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)}</div>
      <div class="scope-main scope-event-fiche">
        ${renderFicheIdentity(ev, fiche)}
        ${renderFicheSummary(fiche, ev, mode, previewCount, jeunesCount)}
        ${renderFichePrimaryAction(cta, lifecycleActions)}
        ${qty || !state.preview ? '' : renderPreviewList()}
        ${renderFicheSecondaryActions(ev, extraActions, isLegacy)}
      </div>
      ${state.modal === 'convert-nominatif' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Passer en nominatif</h3>
        <p>Les volumes quantitatifs de cet événement seront supprimés. Cette action n’est possible qu’avant clôture.</p>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="convert-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="convert-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
      ${state.modal === 'edit-event' ? renderEditEventModal(ev, fiche) : ''}
      ${state.modal === 'postpone-event' ? renderPostponeEventModal(ev) : ''}
    `;
  }

  function previewPersonFields(p) {
    const fromFiche = personOf(state.fiche, p && (p.personneId || p.personne_id)) || {};
    return {
      grade: (p && p.grade) || fromFiche.grade || '',
      nom: (p && (p.nomFamille || p.nom)) || fromFiche.nomFamille || fromFiche.nom || '',
      prenom: (p && p.prenom) || fromFiche.prenom || ''
    };
  }

  function previewInclusionLabel(p) {
    if (p.motifInclusion === 'exception_ajout') return 'Ajout manuel';
    if (p.jspRole === 'MONITEUR') return 'Moniteur JSP';
    if (p.jspRole === 'JEUNE') return 'Jeune JSP';
    return 'Affectation';
  }

  function previewCibleLabel(p) {
    return (p.cibles || []).map((c) => {
      if (c && typeof c === 'object') {
        return L.niveauAffiche(c.domaineCode || c.domaine_code, c.niveauCode || c.niveau_code);
      }
      return c;
    }).filter(Boolean).join(' · ') || 'Exception';
  }

  function openEditEventModal(opts) {
    const ev = state.fiche && state.fiche.evenement;
    if (!ev) return;
    const heureDebut = String(ev.heure_debut || '').slice(0, 5);
    const heureFin = String(ev.heure_fin || '').slice(0, 5);
    state.editEventForm = {
      libelle: ev.libelle || '',
      date: String(ev.date || '').slice(0, 10),
      heureDebut,
      heureFin,
      cibleIds: ciblesOf(state.fiche).map((c) => c.cible_id || c.cibleId).filter(Boolean),
      statut: ev.statut || 'PLANIFIE',
      motif: '',
      warning: '',
      confirmed: false
    };
    state.modal = 'edit-event';
    render();
  }

  function renderEditEventModal(ev, fiche) {
    const form = state.editEventForm || {};
    const domaine = String(ev.domaine_code || ev.domaineCode || '');
    const cibles = L.sortCiblesForEventForm
      ? L.sortCiblesForEventForm((state.referentiels.cibles || []).filter((c) => c.domaineCode === domaine))
      : (state.referentiels.cibles || []).filter((c) => c.domaineCode === domaine);
    const selected = new Set(form.cibleIds || []);
    const cibleDisabled = ev.statut !== 'PLANIFIE';
    const warning = form.warning
      ? `<p class="scope-mode-hint">${escapeHtml(form.warning)}</p>`
      : '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Modifier l’événement</h3>
      <p>L’identité de l’événement (code) ne change pas. Les présences déjà saisies sont conservées.</p>
      <p class="scope-mode-hint">Code : ${escapeHtml(ev.code_cours || '—')}</p>
      <div class="scope-field"><label>Libellé</label><input id="edit-event-libelle" type="text" value="${escapeHtml(form.libelle || '')}"></div>
      <div class="scope-field"><label>Date</label><input id="edit-event-date" type="date" value="${escapeHtml(form.date || '')}"></div>
      <div class="scope-field"><label>Heure de début</label><input id="edit-event-debut" type="time" value="${escapeHtml(form.heureDebut || '')}"></div>
      <div class="scope-field"><label>Heure de fin</label><input id="edit-event-fin" type="time" value="${escapeHtml(form.heureFin || '')}"></div>
      <div class="scope-field"><label>Domaine</label><input type="text" value="${escapeHtml(domaineLabel(domaine))}" disabled></div>
      <div class="scope-field"><label>Cible / OI</label>
        <div id="edit-event-cibles" class="scope-chips">
          ${cibles.map((c) => `<label style="display:inline-flex;gap:6px;align-items:center;font-size:13px">
            <input type="checkbox" value="${escapeHtml(c.cibleId)}" ${selected.has(c.cibleId) ? 'checked' : ''}${cibleDisabled ? ' disabled' : ''}> ${escapeHtml(L.niveauAffiche(c.domaineCode, c.niveauCode))}
          </label>`).join('') || '<span class="scope-empty">Aucune cible</span>'}
        </div>
      </div>
      <div class="scope-field"><label>Motif de modification</label><textarea id="edit-event-motif">${escapeHtml(form.motif || '')}</textarea></div>
      ${warning}
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="edit-event-ok">${form.confirmed ? 'Confirmer et enregistrer' : 'Enregistrer les modifications'}</button>
        <button type="button" class="scope-btn" id="edit-event-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderPostponeEventModal(ev) {
    const form = state.editEventForm || {};
    const warning = form.warning
      ? `<p class="scope-mode-hint">${escapeHtml(form.warning)}</p>`
      : '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Reporter</h3>
      <p>L’événement reste le même. Le code est conservé et la nouvelle date sera utilisée par les statistiques.</p>
      <p class="scope-mode-hint">Code : ${escapeHtml(ev.code_cours || '—')}</p>
      <div class="scope-field"><label>Nouvelle date</label><input id="edit-event-date" type="date" value="${escapeHtml(form.date || '')}"></div>
      <div class="scope-field"><label>Heure de début</label><input id="edit-event-debut" type="time" value="${escapeHtml(form.heureDebut || '')}"></div>
      <div class="scope-field"><label>Heure de fin</label><input id="edit-event-fin" type="time" value="${escapeHtml(form.heureFin || '')}"></div>
      <div class="scope-field"><label>Motif du report</label><textarea id="edit-event-motif">${escapeHtml(form.motif || '')}</textarea></div>
      ${warning}
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="edit-event-ok">${form.confirmed ? 'Confirmer le report' : 'Reporter'}</button>
        <button type="button" class="scope-btn" id="edit-event-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function previewSortColumns() {
    return [
      { key: 'grade', type: 'number', value: (p) => gradeRank(previewPersonFields(p).grade), tieBreakers: [
        { key: 'nom', type: 'text', value: (p) => previewPersonFields(p).nom },
        { key: 'prenom', type: 'text', value: (p) => previewPersonFields(p).prenom },
        { key: 'nip', type: 'text', value: (p) => p && p.nip }
      ] },
      { key: 'nom', type: 'text', value: (p) => previewPersonFields(p).nom, tieBreakers: [
        { key: 'prenom', type: 'text', value: (p) => previewPersonFields(p).prenom },
        { key: 'grade', type: 'number', value: (p) => gradeRank(previewPersonFields(p).grade) },
        { key: 'nip', type: 'text', value: (p) => p && p.nip }
      ] },
      { key: 'prenom', type: 'text', value: (p) => previewPersonFields(p).prenom, tieBreakers: [
        { key: 'nom', type: 'text', value: (p) => previewPersonFields(p).nom },
        { key: 'grade', type: 'number', value: (p) => gradeRank(previewPersonFields(p).grade) },
        { key: 'nip', type: 'text', value: (p) => p && p.nip }
      ] },
      { key: 'nip', type: 'text', value: (p) => p && p.nip },
      { key: 'cible', type: 'text', value: (p) => previewCibleLabel(p) },
      { key: 'motif', type: 'text', value: (p) => previewInclusionLabel(p) }
    ];
  }

  function previewRowsHtml(rows) {
    const sorted = L.sortRows ? L.sortRows(rows || [], state.previewSort, previewSortColumns()) : (rows || []).slice();
    return sorted.length ? sorted.map((p) => {
      const id = previewPersonFields(p);
      return `<tr>
        <td data-label="Grade">${escapeHtml(id.grade || '—')}</td>
        <td data-label="Nom">${escapeHtml(id.nom || '—')}</td>
        <td data-label="Prénom">${escapeHtml(id.prenom || '—')}</td>
        <td data-label="NIP">${escapeHtml(p.nip)}</td>
        <td data-label="Cible">${escapeHtml(previewCibleLabel(p))}</td>
        <td data-label="Motif d’inclusion">${escapeHtml(previewInclusionLabel(p))}</td>
        <td data-label="Action"><button type="button" class="scope-remove-action scope-icon-action" data-retrait="${p.personneId}" aria-label="Retirer" title="Retirer">${trashIcon()}</button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="7"><div class="scope-empty">${escapeHtml(L.emptyMessage('attendus'))}</div></td></tr>`;
  }

  function previewTableHtml(rows) {
    return `<div class="scope-table-wrap scope-fiche-preview-wrap">
      <table class="scope-table scope-fiche-preview-table">
        <thead><tr>
          ${sortableHeader('event-preview', 'grade', 'Grade', state.previewSort)}
          ${sortableHeader('event-preview', 'nom', 'Nom', state.previewSort)}
          ${sortableHeader('event-preview', 'prenom', 'Prénom', state.previewSort)}
          ${sortableHeader('event-preview', 'nip', 'NIP', state.previewSort)}
          ${sortableHeader('event-preview', 'cible', 'Cible', state.previewSort)}
          ${sortableHeader('event-preview', 'motif', 'Motif d’inclusion', state.previewSort)}
          <th>Action</th>
        </tr></thead>
        <tbody>${previewRowsHtml(rows)}</tbody>
      </table>
    </div>`;
  }

  function renderPreviewList() {
    const people = (state.preview.personnes || []).filter((p) => !state.pendingRetraits.includes(p.personneId));
    const extras = state.pendingExceptions;
    const rows = people.concat(extras);
    const jeunes = ((state.preview && state.preview.jeunes) || people.filter((p) => p.jspRole === 'JEUNE')).filter((p) => !state.pendingRetraits.includes(p.personneId));
    const splitJsp = Boolean(jeunes.length);
    const hitLabel = (p) => [p.grade, p.nomFamille || p.nom, p.prenom].filter(Boolean).join(' ');
    return `
      <section class="scope-card scope-fiche-section scope-fiche-preview">
        <div class="scope-section-header">
          <h2 class="scope-section-title">Population attendue</h2>
          <p class="scope-fiche-preview-count">${rows.length} personne${rows.length > 1 ? 's' : ''}${splitJsp ? ` · ${jeunes.length} jeune${jeunes.length > 1 ? 's' : ''}` : ''}</p>
        </div>
        <div class="scope-toolbar scope-fiche-preview-toolbar">
          <div class="scope-field">
            <label for="preview-q">Ajouter une personne</label>
            <input id="preview-q" type="search" placeholder="Nom, prénom ou NIP" value="${escapeHtml(state.personQuery)}" autocomplete="off">
          </div>
        </div>
        ${state.personHits.length ? `<div class="scope-fiche-hits">${state.personHits.map((p) => `
          <div class="scope-fiche-hit">
            <span>${escapeHtml(hitLabel(p) || 'Personne')} · ${escapeHtml(p.nip)}</span>
            <button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" data-add-ex="${p.personne_id}">Ajouter</button>
          </div>`).join('')}</div>` : (state.personQuery ? `<div class="scope-empty">${escapeHtml(L.emptyMessage('personnes'))}</div>` : '')}
        ${splitJsp ? `
        <h3 class="scope-section-sub">Jeunes JSP · ${jeunes.length}</h3>
        ${previewTableHtml(jeunes)}
        ${extras.length ? `<h3 class="scope-section-sub">Ajouts manuels · ${extras.length}</h3>
        ${previewTableHtml(extras)}` : ''}` : previewTableHtml(rows)}
        <p class="scope-fiche-tech-note">Les ajouts et retraits préparés ici sont appliqués au figer. Les taux jeunes JSP et moniteurs JSP restent distincts.</p>
      </section>
    `;
  }

  function renderSaisie() {
    const fiche = state.fiche;
    if (!fiche) {
      const loading = state.loading || !state.ficheReady;
      return `<div class="scope-crumb">Événements / Saisie</div><div class="scope-main"><div class="scope-card scope-placeholder"><p>${escapeHtml(loading ? 'Chargement de l’événement…' : 'Événement introuvable.')}</p></div></div>`;
    }
    const ev = fiche.evenement;
    if (eventMode(ev) === 'QUANTITATIF') return renderSaisieQuantitative();
    const niveaux = [...new Set(state.saisie.map((r) => r.cible).filter((x) => x && x !== '—'))];
    const filteredRaw = (state.cibleFilter === 'tous' ? state.saisie : state.saisie.filter((r) => r.cible === state.cibleFilter || (r.cibles || []).includes(state.cibleFilter)))
      .filter((r) => !state.saisieOpenFilter || (L.isOpenSaisieRow ? L.isOpenSaisieRow(r) : (!r.statut || r.statut === 'NON_RENSEIGNE')));
    const filtered = sortSaisieRows(filteredRaw);
    const openCount = L.liveCounters(state.saisie).open;
    const saveBusy = Boolean(state.presenceSaveBusy);
    const closeBusy = state.presenceCloseBusy;
    const hasIncompleteExcuse = L.hasIncompleteExcuse ? L.hasIncompleteExcuse(state.saisie) : false;
    const hasIncompleteDispense = L.hasIncompleteDispense ? L.hasIncompleteDispense(state.saisie) : false;
    const closeLabel = closeBusy === 'save' ? 'Enregistrement…' : (closeBusy === 'close' ? 'Clôture…' : 'Clôturer');
    const saveState = presenceSaveLabel();
    const lifecycleActions = renderFicheLifecycleActions(ev, ev.origine === 'LEGACY_AGGREGATED', false);
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Saisie</div>
      <div class="scope-main scope-event-saisie">
        ${eventIdentityBand(ev, fiche)}
        ${renderPresenceKpis(niveaux, fiche)}
        ${lifecycleActions ? `<section class="scope-card scope-fiche-section scope-fiche-primary"><div class="scope-section-header"><h2 class="scope-section-title">Actions événement</h2></div><div class="scope-actions scope-event-toolbar scope-fiche-primary-actions">${lifecycleActions}</div></section>` : ''}
        ${hasIncompleteExcuse ? '<p class="scope-presence-warning">Choisissez un motif pour chaque absence excusée avant la clôture.</p>' : ''}
        ${hasIncompleteDispense ? '<p class="scope-presence-warning">Choisissez un motif pour chaque dispense avant la clôture.</p>' : ''}
        <div class="scope-actions scope-event-toolbar scope-saisie-toolbar">
          <button type="button" class="scope-btn scope-btn-primary scope-btn-compact" id="save-part" ${saveBusy ? 'disabled' : ''}>${saveBusy ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="all-present" ${saveBusy ? 'disabled' : ''}>Tous présents</button>
          <button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="scope-saisie-back">Retour aux événements</button>
          <button type="button" class="scope-btn scope-btn-secondary scope-btn-compact scope-fiche-cancel" id="reset-saisie" ${saveBusy ? 'disabled' : ''}>Réinitialiser la saisie</button>
          <button type="button" class="scope-btn scope-btn-secondary scope-btn-compact scope-fiche-cancel" id="cloturer" ${saveBusy || closeBusy ? 'disabled' : ''}>${escapeHtml(closeLabel)}</button>
        </div>
        ${saveState ? `<p class="scope-save-state" role="status">${escapeHtml(saveState)}</p>` : ''}
        ${renderEncadrementBlock()}
        <section class="scope-presence-section" id="scope-saisie-presences">
          <div class="scope-section-header">
            <h2 class="scope-section-heading">Présences</h2>
            <p class="scope-saisie-open" role="status">${escapeHtml(String(openCount))} présence${openCount === 1 ? '' : 's'} à renseigner</p>
          </div>
          <div class="scope-presence-toolbar">
            ${renderManualParticipantBlock()}
            <div class="scope-filter-group">
              <span class="scope-filter-label" id="saisie-open-filter-label">Présences</span>
              <div class="scope-segmented" role="group" aria-labelledby="saisie-open-filter-label">
                <button type="button" class="scope-segmented-item" data-saisie-open-filter="all" aria-pressed="${!state.saisieOpenFilter}">Tous</button>
                <button type="button" class="scope-segmented-item" data-saisie-open-filter="open" aria-pressed="${Boolean(state.saisieOpenFilter)}">Personnel non renseigné</button>
              </div>
            </div>
            ${niveaux.length > 1 ? `<div class="scope-filter-group">
              <span class="scope-filter-label" id="cible-filter-label">Cible</span>
              <div class="scope-segmented" role="group" aria-labelledby="cible-filter-label">
              <button type="button" class="scope-segmented-item" data-cible-filter="tous" aria-pressed="${state.cibleFilter === 'tous'}">Tous</button>
              ${niveaux.map((n) => `<button type="button" class="scope-segmented-item" data-cible-filter="${escapeHtml(n)}" aria-pressed="${state.cibleFilter === n}">${escapeHtml(n)}</button>`).join('')}
            </div></div>` : ''}
          </div>
        ${(() => {
          const isJsp = String((ev.domaine_code || ev.domaineCode || '')).toUpperCase() === 'JSP';
          const jeunes = filtered.filter((row) => row.jspRole === 'JEUNE');
          const autres = filtered.filter((row) => row.jspRole !== 'JEUNE' && row.jspRole !== 'MONITEUR');
          if (!isJsp || !jeunes.length) {
            return filtered.length ? renderSaisieRows(filtered) : `<div class="scope-empty">${escapeHtml(L.emptyMessage('attendus'))}</div>`;
          }
          return `
          <h3 class="scope-section-sub">Jeunes JSP · ${jeunes.length}</h3>
          ${jeunes.length ? renderSaisieRows(jeunes) : `<div class="scope-empty">Aucun jeune attendu.</div>`}
          ${autres.length ? `<h3 class="scope-section-sub">Autres attendus · ${autres.length}</h3>${renderSaisieRows(autres)}` : ''}`;
        })()}
        </section>
      </div>
      ${state.modal === 'edit-event' ? renderEditEventModal(ev, fiche) : ''}
      ${state.modal === 'postpone-event' ? renderPostponeEventModal(ev) : ''}
    `;
  }

  function rowsForCible(label) {
    return (state.saisie || []).filter((row) => row && (row.cible === label || (row.cibles || []).includes(label)));
  }

  function saisieDomaine() {
    return String((state.fiche && state.fiche.evenement && state.fiche.evenement.domaine_code) || '').toUpperCase();
  }

  function countStatuses(rows) {
    return L.liveCounters(rows);
  }

  function renderExcuseBreakdown(rows) {
    const items = L.excuseBreakdown ? L.excuseBreakdown(rows, saisieDomaine()) : [];
    const total = items.reduce((sum, item) => sum + Number(item.count || 0), 0);
    if (!total) return '<p>Aucune absence excusée</p>';
    return `<dl>${items.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(String(item.count || 0))}</dd></div>`).join('')}</dl>`;
  }

  function renderKpiCard(kind, value, label, options) {
    const detail = options && options.detailHtml ? `<div class="scope-kpi-popover" role="tooltip">${options.detailHtml}</div>` : '';
    const tab = detail ? ' tabindex="0"' : '';
    const hint = detail ? ' aria-haspopup="true"' : '';
    const marker = detail ? '<span class="scope-kpi-info" aria-hidden="true">i</span>' : '';
    return `<div class="scope-kpi-card is-${escapeHtml(kind)}${detail ? ' has-detail' : ''}"${tab}${hint}><strong>${escapeHtml(String(value || 0))}</strong><span>${escapeHtml(label)}${marker}</span>${detail}</div>`;
  }

  function renderKpiGrid(items, ariaLabel) {
    return `<div class="scope-kpi-grid" role="group" aria-label="${escapeHtml(ariaLabel)}">${(items || []).filter(Boolean).map((it) => `<article class="scope-kpi-unit${it.featured ? ' is-featured' : ''}${it.emphasis ? ' is-open' : ''}"${it.title ? ` title="${escapeHtml(it.title)}" tabindex="0"` : ''}>
        <span class="scope-kpi-unit-label">${escapeHtml(it.label)}</span>
        <span class="scope-kpi-unit-value">${escapeHtml(String(it.value ?? 0))}</span>
      </article>`).join('')}</div>`;
  }

  function renderPresenceKpis(niveaux, fiche) {
    const rows = state.saisie || [];
    const local = L.sessionPresenceKpis ? L.sessionPresenceKpis(rows) : Object.assign({ attendus: 0 }, countStatuses(rows));
    const c = local;
    const openVal = c.open;
    const openLabel = 'À renseigner';
    const attendus = c.attendus;
    const domaine = String((fiche && fiche.evenement && fiche.evenement.domaine_code) || '').toUpperCase();
    const showDispense = Boolean(c.dispense) || domaine !== 'JSP';
    const excuseDetail = renderExcuseBreakdown(rows);
    const excuseTitle = String(excuseDetail).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return renderKpiGrid([
      { label: 'Attendus', value: attendus },
      { label: 'Présents', value: c.present },
      { label: 'Excusés', value: c.excuse, title: excuseTitle },
      { label: 'Absents', value: c.absent },
      showDispense ? { label: 'Dispensés', value: c.dispense } : null,
      { label: openLabel, value: openVal, emphasis: Number(openVal) > 0 }
    ], 'Compteurs de présence').replace('<div class="scope-kpi-grid"', '<div class="scope-kpi-grid scope-saisie-kpis"');
  }

  function sortIdentityTieBreak(a, b) {
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    const txt = (value) => String(value == null ? '' : value);
    const nom = collator.compare(txt(a && (a.nomFamille || a.nom)), txt(b && (b.nomFamille || b.nom)));
    if (nom) return nom;
    const prenom = collator.compare(txt(a && a.prenom), txt(b && b.prenom));
    if (prenom) return prenom;
    const oi = collator.compare(txt(a && a.cible), txt(b && b.cible));
    if (oi) return oi;
    return collator.compare(txt(a && a.nip), txt(b && b.nip));
  }

  function sortByGradeHierarchy(rows, dir) {
    const factor = dir === 'desc' ? -1 : 1;
    return (rows || []).slice().sort((a, b) => {
      const ga = gradeRank(a && a.grade);
      const gb = gradeRank(b && b.grade);
      if (ga !== gb) return (ga - gb) * factor;
      return sortIdentityTieBreak(a, b);
    });
  }

  function presenceRank(row) {
    const code = String((row && row.statut) || 'NON_RENSEIGNE').toUpperCase();
    const order = {
      PRESENT: 1,
      ABSENT_EXCUSE: 2,
      ABSENT_NON_EXCUSE: 3,
      DISPENSE: 4,
      PERMUTATION: 5,
      NON_RENSEIGNE: 6
    };
    return order[code] || 6;
  }

  function sortSaisieIdentityAfter(a, b, extra) {
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    const txt = (value) => String(value == null ? '' : value);
    const nom = collator.compare(txt(a && (a.nomFamille || a.nom)), txt(b && (b.nomFamille || b.nom)));
    if (nom) return nom;
    const prenom = collator.compare(txt(a && a.prenom), txt(b && b.prenom));
    if (prenom) return prenom;
    if (extra === 'grade-first') {
      const g = gradeRank(a && a.grade) - gradeRank(b && b.grade);
      if (g) return g;
      const cible = collator.compare(txt(a && a.cible), txt(b && b.cible));
      if (cible) return cible;
    } else if (extra === 'cible-first') {
      const g = gradeRank(a && a.grade) - gradeRank(b && b.grade);
      if (g) return g;
    }
    return collator.compare(txt(a && a.nip), txt(b && b.nip));
  }

  function sortByPresenceStatus(rows, dir) {
    const factor = dir === 'desc' ? -1 : 1;
    return (rows || []).slice().sort((a, b) => {
      const ra = presenceRank(a);
      const rb = presenceRank(b);
      if (ra !== rb) return (ra - rb) * factor;
      return sortSaisieIdentityAfter(a, b, 'grade-first');
    });
  }

  function sortByCible(rows, dir) {
    const factor = dir === 'desc' ? -1 : 1;
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    const txt = (value) => String(value == null ? '' : value);
    return (rows || []).slice().sort((a, b) => {
      const cmp = collator.compare(txt(a && a.cible), txt(b && b.cible));
      if (cmp) return cmp * factor;
      return sortSaisieIdentityAfter(a, b, 'cible-first');
    });
  }

  function sortSaisieRows(rows) {
    const key = state.eventPersonnelSort && state.eventPersonnelSort.key;
    const dir = state.eventPersonnelSort && state.eventPersonnelSort.dir;
    if (key === 'grade') return sortByGradeHierarchy(rows, dir);
    if (key === 'presence') return sortByPresenceStatus(rows, dir);
    if (key === 'cible') return sortByCible(rows, dir);
    const columns = [
      { key: 'nom', type: 'text', value: (row) => row && (row.nomFamille || row.nom), tieBreakers: [
        { key: 'prenom', type: 'text', value: (row) => row && row.prenom },
        { key: 'grade', type: 'number', value: (row) => gradeRank(row && row.grade) },
        { key: 'nip', type: 'text', value: (row) => row && row.nip }
      ] },
      { key: 'prenom', type: 'text', value: (row) => row && row.prenom, tieBreakers: [
        { key: 'nom', type: 'text', value: (row) => row && (row.nomFamille || row.nom) },
        { key: 'grade', type: 'number', value: (row) => gradeRank(row && row.grade) },
        { key: 'nip', type: 'text', value: (row) => row && row.nip }
      ] },
      { key: 'grade', type: 'number', value: (row) => gradeRank(row && row.grade), tieBreakers: [
        { key: 'nom', type: 'text', value: (row) => row && (row.nomFamille || row.nom) },
        { key: 'prenom', type: 'text', value: (row) => row && row.prenom },
        { key: 'oi', type: 'text', value: (row) => row && row.cible },
        { key: 'nip', type: 'text', value: (row) => row && row.nip }
      ] },
      { key: 'nip', type: 'text', value: (row) => row && row.nip },
      { key: 'cible', type: 'text', value: (row) => row && row.cible },
      { key: 'presence', type: 'status', value: (row) => row && row.role === 'FORMATEUR' && row.statut === 'PRESENT' ? 'FORMATEUR' : row && row.statut }
    ];
    return L.sortRows ? L.sortRows(rows, state.eventPersonnelSort, columns) : (rows || []).slice();
  }

  function renderPersonSuggestions(kind, rows) {
    const action = kind === 'encadrement' ? 'data-enc-add' : 'data-manual-add';
    const query = kind === 'encadrement' ? state.encQuery : state.manualPersonQuery;
    if (!String(query || '').trim() || String(query || '').trim().length < SCOPE_SEARCH_MIN_CHARS) return '';
    if (!rows.length) return `<p class="scope-lookup-empty">Aucune personne correspondante.</p>`;
    return `<div class="scope-person-suggestions" role="listbox">
      ${rows.map((p) => `<button type="button" ${action}="${escapeHtml(p.personne_id)}" role="option">
        <span>${escapeHtml(personLine(p))}</span>
        <small>${escapeHtml(personSubLine(p))}</small>
      </button>`).join('')}
    </div>`;
  }

  function renderEncadrementBlock() {
    const fiche = state.fiche || {};
    const enc = (fiche && fiche.encadrement) || (state.fiche && state.fiche.encadrement) || [];
    const encCount = (role) => enc.filter((p) => p && p.role === role).length;
    const encRows = sortPeopleForEncadrement(enc.map((p) => {
      const person = personOf(fiche, p.personne_id) || {};
      return Object.assign({}, p, person, { personne_id: p.personne_id, role: p.role });
    }));
    const byRole = new Map();
    encRows.forEach((p) => {
      const role = String(p.role || '').toUpperCase() || 'ENCADREMENT';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push(p);
    });
    const roles = encadrementRolesForEvent(fiche);
    return `
      <section class="scope-encadrement-block" data-enc-editable="true">
        <div class="scope-section-header">
          <h2 class="scope-section-heading">Encadrement</h2>
        </div>
        <div class="scope-toolbar scope-enc-toolbar">
          <div class="scope-field">
            <label for="enc-role">Rôle</label>
            <select id="enc-role" class="scope-enc-role" aria-label="Rôle d’encadrement">
              <option value="FORMATEUR" ${state.encRole === 'FORMATEUR' ? 'selected' : ''}>Formateur</option>
              <option value="MONITEUR" ${state.encRole === 'MONITEUR' ? 'selected' : ''}>Moniteur</option>
              <option value="SURVEILLANT" ${state.encRole === 'SURVEILLANT' ? 'selected' : ''}>Surveillant</option>
              <option value="AUXILIAIRE" ${state.encRole === 'AUXILIAIRE' ? 'selected' : ''}>Auxiliaire</option>
            </select>
          </div>
          <div class="scope-field scope-lookup-field scope-person-lookup">
            <label for="enc-q">Recherche</label>
            <input id="enc-q" type="search" placeholder="Rechercher nom, prénom ou NIP..." value="${escapeHtml(state.encQuery)}" autocomplete="off">
            <div id="enc-suggestions" class="scope-suggestion-anchor"></div>
          </div>
          <button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="enc-add">Ajouter</button>
          ${state.encRole === 'FORMATEUR' && isFirstPrSession(fiche) ? `<button type="button" id="enc-serie-complete" class="scope-serie-toggle ${state.encSerieComplete ? 'is-on' : ''}" role="switch" aria-checked="${state.encSerieComplete ? 'true' : 'false'}" title="Ajoute automatiquement ce formateur à toutes les sessions de cette série PR.">
            <span class="scope-switch-track" aria-hidden="true"><span class="scope-switch-thumb"></span></span>
            <span class="scope-serie-label">Formateur pour toute la série</span>
            <span class="scope-info-tip" tabindex="0" aria-describedby="enc-serie-help">ⓘ<span id="enc-serie-help" class="scope-tooltip" role="tooltip">Ajoute automatiquement ce formateur à toutes les sessions de cette série PR.</span></span>
            ${state.encSerieComplete ? `<span class="scope-serie-range">${escapeHtml(prSeriesScopeText(fiche))}</span>` : ''}
          </button>` : ''}
        </div>
        ${renderEncadrementGroups(fiche, { readOnly: false, byRole, roles, encCount })}
        <p class="scope-fiche-tech-note">L’encadrement est affiché séparément de l’effectif participant selon les règles du domaine.</p>
      </section>
    `;
  }

  function renderManualParticipantBlock() {
    return `
      <div class="scope-presence-add">
        <div class="scope-lookup-field scope-person-lookup">
          <label class="visually-hidden" for="manual-person-q">Ajouter un participant à cet événement</label>
          <input id="manual-person-q" class="scope-field is-compact" type="search" placeholder="Rechercher une personne à ajouter..." value="${escapeHtml(state.manualPersonQuery)}" autocomplete="off" aria-label="Ajouter un participant à cet événement">
          <div id="manual-person-suggestions" class="scope-suggestion-anchor"></div>
        </div>
      </div>
    `;
  }

  function renderSaisieQuantitative() {
    const fiche = state.fiche;
    const ev = fiche.evenement;
    const v = state.volumes;
    const equal = L.volumesEquality(v);
    const preview = state.qtyPreview;
    const previewTaux = preview && preview.taux;
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Présences</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">Saisir les présences</h2>
          <p style="color:var(--scope-muted);margin-top:0">${escapeHtml(ev.libelle)} · ${escapeHtml(L.formatDate(ev.date))} · ${escapeHtml(domaineLabel(ev.domaine_code))} · ${escapeHtml(L.ciblesLabel(ciblesOf(fiche)))} · Quantitatif</p>
          <form class="scope-qty-form" id="qty-form" autocomplete="off">
            <div class="scope-field scope-qty-field"><label for="qty-attendus">Attendus</label><input id="qty-attendus" name="attendus" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.attendus)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-presents">Présents</label><input id="qty-presents" name="presents" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.presents)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-excuses-prive">Excusés privé</label><input id="qty-excuses-prive" name="excusesPrive" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.excusesPrive)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-excuses-pro">Excusés professionnel</label><input id="qty-excuses-pro" name="excusesProfessionnel" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.excusesProfessionnel)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-excuses-armee">Excusés armée</label><input id="qty-excuses-armee" name="excusesArmee" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.excusesArmee)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-excuses-am">Excusés accident/maladie</label><input id="qty-excuses-am" name="excusesAccidentMaladie" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.excusesAccidentMaladie)}"></div>
            ${Number(v.excusesNonPrecise) > 0 ? `<div class="scope-field scope-qty-field"><label for="qty-excuses-np">Excusés non précisé (historique)</label><input id="qty-excuses-np" name="excusesNonPrecise" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.excusesNonPrecise)}"></div>` : ''}
            <div class="scope-field scope-qty-field"><label for="qty-non-excuses">Non excusés</label><input id="qty-non-excuses" name="nonExcuses" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.nonExcuses)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-dispenses">Dispensés</label><input id="qty-dispenses" name="dispenses" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.dispenses)}"></div>
            ${ev.domaine_code === 'DAP' ? `<div class="scope-field scope-qty-field"><label for="qty-permutations">Dont permutations</label><input id="qty-permutations" name="permutations" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.permutations || '0')}"></div>` : ''}
          </form>
          <p class="scope-qty-error" ${equal ? 'hidden' : ''}>Présents + excusés (somme des motifs) + non excusés + dispensés doit être égal aux attendus. Les permutations sont un sous-ensemble des présents, jamais additionnées une seconde fois.</p>
          <div class="scope-card scope-qty-preview">
            <h3 style="margin-top:0">Aperçu du taux</h3>
            <p style="color:var(--scope-muted);margin-top:0">${escapeHtml((preview && preview.message) || 'Aperçu calculé par le serveur. Ce n’est pas encore un taux officiel réalisé.')}</p>
            <p style="font-size:28px;margin:8px 0 0">${escapeHtml(L.formatTaux(previewTaux && previewTaux.percentage))}</p>
            <p style="color:var(--scope-muted);margin-top:4px">${escapeHtml(String((previewTaux && previewTaux.numerator) ?? '—'))} / ${escapeHtml(String((previewTaux && previewTaux.denominator) ?? '—'))}</p>
          </div>
          <div class="scope-actions scope-qty-actions">
            <button type="button" class="scope-btn" id="qty-save">Enregistrer</button>
            <button type="button" class="scope-btn scope-btn-primary" id="qty-cloturer" ${equal ? '' : 'disabled'}>Clôturer</button>
            <a class="scope-btn" href="#/exercices">Retour aux événements</a>
            <a class="scope-btn" href="#/exercices/${escapeHtml(ev.evenement_id)}">Retour fiche</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderSaisieRows(rows) {
    const domaine = state.fiche && state.fiche.evenement && state.fiche.evenement.domaine_code;
    const statuses = L.participationStatusesForDomaine ? L.participationStatusesForDomaine(domaine) : [['PRESENT', 'Présent'], ['ABSENT_EXCUSE', 'Excusé'], ['ABSENT_NON_EXCUSE', 'Absent'], ['DISPENSE', 'Dispensé']];
    const statusPressed = (row, value) => row.statut === value;
    const statusVariant = {
      PRESENT: 'is-present',
      ABSENT_EXCUSE: 'is-excused',
      ABSENT_NON_EXCUSE: 'is-absent',
      DISPENSE: 'is-exempt',
      PERMUTATION: 'is-permutation'
    };
    const motifControl = (row) => {
      const motifLocked = Boolean(L.sessionLocked && L.sessionLocked(row));
      const lockAttr = motifLocked ? ' disabled aria-disabled="true"' : '';
      const motifOptions = (motifs) => {
        const operational = (motifs || []).filter((m) => (m.group || 'operationnel') === 'operationnel');
        const administrative = (motifs || []).filter((m) => m.group === 'administratif');
        const render = (items) => items.map((m) => `<option value="${escapeHtml(m.value)}" ${row.motifAbsence === m.value ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('');
        if (!administrative.length) return render(operational);
        return `<optgroup label="Dispenses métier">${render(operational)}</optgroup><optgroup label="Situations particulières">${render(administrative)}</optgroup>`;
      };
      if (row.statut === 'DISPENSE') {
        const motifs = L.motifsDispenseForRow ? L.motifsDispenseForRow(row) : [];
        const selected = motifs.find((m) => m.value === row.motifAbsence);
        if (selected && !row.editMotif) {
          return `<div class="scope-motif-control is-compact"><button type="button" class="scope-motif-compact" data-motif-edit="${escapeHtml(row.personneId)}" aria-label="Modifier le motif de dispense"${lockAttr}>${escapeHtml(selected.label)}</button></div>`;
        }
        return `<div class="scope-motif-control is-open"><label class="visually-hidden" for="motif-${escapeHtml(row.personneId)}">Motif de dispense</label><select id="motif-${escapeHtml(row.personneId)}" class="scope-motif-select" data-dispense-motif aria-label="Motif de dispense"${lockAttr}>${row.motifAbsence ? '' : '<option value="" disabled selected>Motif</option>'}${motifOptions(motifs)}</select></div>`;
      }
      if (row.statut !== 'ABSENT_EXCUSE') return '';
      const motifs = L.motifsForRow ? L.motifsForRow(row, saisieDomaine()) : L.MOTIFS;
      const selected = motifs.find((m) => m.value === row.motifAbsence);
      if (selected && !row.editMotif) {
        return `<div class="scope-motif-control is-compact"><button type="button" class="scope-motif-compact" data-motif-edit="${escapeHtml(row.personneId)}" aria-label="Modifier le motif d’excuse"${lockAttr}>${escapeHtml(selected.label)}</button></div>`;
      }
      return `<div class="scope-motif-control is-open"><label class="visually-hidden" for="motif-${escapeHtml(row.personneId)}">Motif d’excuse</label><select id="motif-${escapeHtml(row.personneId)}" class="scope-motif-select" data-motif aria-label="Motif d’excuse"${lockAttr}>${row.motifAbsence ? '' : '<option value="" disabled selected>Motif</option>'}${motifs.map((m) => `<option value="${escapeHtml(m.value)}" ${row.motifAbsence === m.value ? 'selected' : ''}>${escapeHtml(m.label)}</option>`).join('')}</select></div>`;
    };
    const justificatifCell = (row) => {
      const comment = row.statut === 'ABSENT_EXCUSE' && row.motifAbsence === 'AUTRE'
        ? `<input data-comment type="text" placeholder="Commentaire obligatoire" value="${escapeHtml(row.commentaire)}" class="scope-excuse-comment">`
        : '';
      const why = row.manual ? '<span class="scope-muted-inline">Ajout ponctuel</span>' : '';
      const manual = row.manual
        ? `<button type="button" class="scope-remove-action scope-icon-action" data-manual-remove="${escapeHtml(row.personneId)}" aria-label="Retirer l’ajout manuel" title="Retirer l’ajout manuel">${trashIcon()}</button>`
        : '';
      return [motifControl(row), comment, why, manual].filter(Boolean).join('');
    };
    const roleFlag = (row) => {
      const role = String(row.role || '').toUpperCase();
      if (L.ROLES_ENCADREMENT && L.ROLES_ENCADREMENT.has(role)) {
        return `<span class="scope-enc-role-flag">${escapeHtml((L.ROLE_LABELS && L.ROLE_LABELS[role]) || role)}</span>`;
      }
      return '';
    };
    const statusFilled = (row) => Boolean(row && L.isValidSessionStatut && L.isValidSessionStatut(row.statut));
    return `
      <div class="scope-table-scroll">
        <table class="scope-table scope-saisie-table">
          <thead><tr>
            ${sortableHeader('event-personnel', 'grade', 'GRADE', state.eventPersonnelSort)}
            ${sortableHeader('event-personnel', 'nom', 'NOM', state.eventPersonnelSort)}
            ${sortableHeader('event-personnel', 'prenom', 'PRÉNOM', state.eventPersonnelSort)}
            ${sortableHeader('event-personnel', 'nip', 'NIP', state.eventPersonnelSort)}
            ${sortableHeader('event-personnel', 'cible', 'CIBLE', state.eventPersonnelSort)}
            ${sortableHeader('event-personnel', 'presence', 'STATUT', state.eventPersonnelSort)}
            <th>INFORMATIONS</th>
          </tr></thead>
          <tbody>
            ${rows.map((row) => {
              const coveredGlobally = Boolean(L.coveredInGlobalBilan && L.coveredInGlobalBilan(row));
              const roleLocked = L.statusLockedForRole ? L.statusLockedForRole(row.role) : false;
              const statusDisabled = Boolean(roleLocked || coveredGlobally);
              const tooltipId = `scope-session-counted-${escapeHtml(row.personneId)}`;
              const tooltipText = (L.sessionExplainTooltip ? L.sessionExplainTooltip(row) : (row.sessionMessage || row.alreadyCountedTooltip || '')) || '';
              const rowClass = [
                row.manual ? 'scope-row-manual' : '',
                row.statut === 'ABSENT_EXCUSE' ? 'scope-row-session-excuse' : '',
                row.statut === 'DISPENSE' ? 'scope-row-session-dispense' : '',
                coveredGlobally ? 'scope-row-session-counted' : '',
                tooltipText ? 'scope-row-has-tooltip' : ''
              ].filter(Boolean).join(' ');
              const blockedAttrs = tooltipText
                ? ` tabindex="0" aria-describedby="${tooltipId}"`
                : '';
              const role = roleFlag(row);
              const filled = statusFilled(row);
              return `<tr data-pid="${row.personneId}" class="${rowClass}"${blockedAttrs}>
              <td data-label="GRADE">${escapeHtml(row.grade || '')}${tooltipText ? `<span id="${tooltipId}" class="scope-session-counted-tooltip" role="tooltip">${escapeHtml(tooltipText)}</span>` : ''}</td>
              <td data-label="NOM">${escapeHtml(row.nomFamille || row.nom || '')}${role}</td>
              <td data-label="PRÉNOM">${escapeHtml(row.prenom || '')}</td>
              <td data-label="NIP">${escapeHtml(row.nip)}</td>
              <td data-label="CIBLE">${escapeHtml(displayIncorporation(row.cible, domaine))}</td>
              <td data-label="STATUT">
                <div class="scope-status-cluster">
                  <div class="scope-status-row scope-segmented scope-status-control-group ${filled ? 'is-compact' : 'is-open'}" data-status-group role="radiogroup" aria-label="Statut de participation"${filled && !statusDisabled ? ' tabindex="0"' : ''}>
                    ${statuses.map(([v, l]) => {
                      const on = statusPressed(row, v);
                      const variant = on ? (statusVariant[v] || '') : '';
                      return `<button type="button" role="radio" class="scope-segmented-item scope-status-control${on ? ` is-selected ${variant}` : ''}" data-status="${v}" aria-checked="${on}" aria-pressed="${on}"${statusDisabled ? ' disabled aria-disabled="true"' : ''}>${l}</button>`;
                    }).join('')}
                  </div>
                </div>
              </td>
              <td data-label="INFORMATIONS" class="scope-justificatif-cell">${justificatifCell(row)}</td>
            </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function realiseStatutLabel(row) {
    if (!row) return '';
    if (row.statut === 'PERMUTATION') return 'Permutation';
    return (L.participationStatutLabel && L.participationStatutLabel(row.statut)) || row.statut || '';
  }

  function uniqueFilterValues(rows, pick) {
    const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    return [...new Set((rows || []).map(pick).filter((value) => value && value !== '—'))].sort((a, b) => collator.compare(a, b));
  }

  function filterRealiseRows(rows) {
    const q = normalizeSearchText(state.realiseQuery);
    return (rows || []).filter((row) => {
      const localValid = L.isValidSessionStatut ? L.isValidSessionStatut(row.statut) : (row.statut && row.statut !== 'NON_RENSEIGNE');
      if (!localValid) return false;
      if (q) {
        const hay = normalizeSearchText([row.grade, row.nomFamille, row.prenom, row.nom, row.nip].join(' '));
        if (!hay.includes(q)) return false;
      }
      if (state.realiseGrade && String(row.grade || '') !== state.realiseGrade) return false;
      if (state.realiseOi && String(row.cible || '') !== state.realiseOi) return false;
      if (state.realiseCible && String(row.cible || '') !== state.realiseCible) return false;
      if (state.realiseStatut && String(row.statut || '') !== state.realiseStatut) return false;
      return true;
    });
  }

  function sortRealiseRows(rows) {
    if (state.realiseSort && state.realiseSort.key === 'grade') {
      return sortByGradeHierarchy(rows, state.realiseSort.dir);
    }
    const columns = [
      { key: 'grade', type: 'number', value: (row) => gradeRank(row && row.grade), tieBreakers: [
        { key: 'nom', type: 'text', value: (row) => row && (row.nomFamille || row.nom) },
        { key: 'prenom', type: 'text', value: (row) => row && row.prenom },
        { key: 'oi', type: 'text', value: (row) => row && row.cible },
        { key: 'nip', type: 'text', value: (row) => row && row.nip }
      ] },
      { key: 'nom', type: 'text', value: (row) => row && (row.nomFamille || row.nom), tieBreakers: [
        { key: 'prenom', type: 'text', value: (row) => row && row.prenom },
        { key: 'nip', type: 'text', value: (row) => row && row.nip }
      ] },
      { key: 'prenom', type: 'text', value: (row) => row && row.prenom },
      { key: 'nip', type: 'text', value: (row) => row && row.nip },
      { key: 'oi', type: 'text', value: (row) => row && row.cible },
      { key: 'cible', type: 'text', value: (row) => row && row.cible },
      { key: 'statut', type: 'status', value: (row) => row && row.statut }
    ];
    return L.sortRows ? L.sortRows(rows, state.realiseSort, columns) : (rows || []).slice();
  }

  function renderRealiseKpis(fiche, rows) {
    const t = (fiche && fiche.compteurs) || {};
    return `${renderKpiGrid([
      { label: 'Taux officiel', value: L.formatTaux(t.percentage), featured: true },
      { label: 'Présents', value: t.presents },
      { label: 'Excusés', value: t.excuses },
      { label: 'Absents', value: t.nonExcuses },
      { label: 'Dispensés', value: t.dispenses }
    ], 'Taux et compteurs')}${fiche && fiche.jsp && fiche.jsp.tauxJeunes ? `<p class="scope-mode-hint">Jeunes JSP : ${escapeHtml(L.formatTaux(fiche.jsp.tauxJeunes.percentage))}</p>` : ''}`;
  }

  function renderRealiseToolbar(ev, fiche) {
    const session = fiche && (fiche.prExerciseParticipation || fiche.sessionParticipation);
    const multi = Boolean(session && session.isMultiSession);
    const sessionReportAvailable = !multi || Boolean(session && session.allSessionsClosed);
    const sessionReportTooltip = 'Disponible lorsque toutes les séances sont clôturées.';
    return `<div class="scope-actions scope-event-toolbar scope-realise-toolbar">
      <a class="scope-btn" href="#/exercices">Retour aux événements</a>
      <button type="button" class="scope-btn" id="reopen">Réouvrir</button>
      <button type="button" class="scope-btn" data-report-event="${escapeHtml(ev.evenement_id)}">Générer le rapport</button>
      ${multi ? `<button type="button" class="scope-btn" data-report-session="${escapeHtml(ev.evenement_id)}" ${sessionReportAvailable ? '' : `disabled aria-disabled="true" title="${escapeHtml(sessionReportTooltip)}"`}>Rapport détaillé</button>` : ''}
    </div>`;
  }

  function renderRealiseEncadrement(fiche) {
    const enc = (fiche && fiche.encadrement) || [];
    const encCount = (role) => enc.filter((p) => p && p.role === role).length;
    const encRows = sortPeopleForEncadrement(enc.map((p) => {
      const person = personOf(fiche, p.personne_id) || {};
      return Object.assign({}, p, person, { personne_id: p.personne_id, role: p.role });
    }));
    const byRole = new Map();
    encRows.forEach((p) => {
      const role = String(p.role || '').toUpperCase() || 'ENCADREMENT';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push(p);
    });
    return `<section class="scope-encadrement-block is-readonly" data-enc-readonly="true">
      <div class="scope-section-header"><h2 class="scope-section-heading">Encadrement</h2></div>
      ${renderEncadrementGroups(fiche, { readOnly: true, byRole, roles: encadrementRolesForEvent(fiche), encCount })}
      <p class="scope-fiche-tech-note">L’encadrement est affiché séparément de l’effectif participant selon les règles du domaine.</p>
    </section>`;
  }

  function renderRealiseModals() {
    return `      ${state.modal === 'reopen' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Réouvrir l’événement</h3>
        <p>La séance redevient planifiée et sort du KPI tant qu’elle n’est pas reclôturée.</p>
        <div class="scope-field"><label>Motif</label><textarea id="reopen-motif"></textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="reopen-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="reopen-cancel">Annuler</button>
        </div>
      </div></div>` : ''}`;
  }

  function renderRealise() {
    const fiche = state.fiche;
    const ev = fiche.evenement;
    const mode = eventMode(ev);
    const t = fiche.compteurs || {};
    const rows = state.saisie || [];
    const reopenQuantitatif = mode === 'QUANTITATIF'
      ? `<div class="scope-modal"><div class="scope-card">
        <h3>Réouvrir l’événement</h3>
        <p>La séance redevient planifiée et sort du KPI tant qu’elle n’est pas reclôturée. Les volumes sont conservés.</p>
        <div class="scope-field"><label>Motif</label><textarea id="reopen-motif"></textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="reopen-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="reopen-cancel">Annuler</button>
        </div>
      </div></div>`
      : '';
    if (mode === 'QUANTITATIF') {
      const saisie = fiche.saisieQuantitative || {};
      return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Réalisé</div>
      <div class="scope-main scope-event-realise">
        ${eventIdentityBand(ev, fiche)}
        ${renderRealiseKpis(fiche, rows)}
        ${renderRealiseToolbar(ev, fiche)}
        ${volumesBlock(saisie, { taux: t, officiel: true })}
      </div>
      ${state.modal === 'reopen' ? reopenQuantitatif : ''}
    `;
    }
    const filtered = sortRealiseRows(filterRealiseRows(rows));
    const grades = uniqueFilterValues(rows, (row) => row.grade);
    const cibles = uniqueFilterValues(rows, (row) => row.cible);
    const statuts = uniqueFilterValues(rows, (row) => row.statut);
    const filtersActive = Boolean(state.realiseQuery || state.realiseGrade || state.realiseOi || state.realiseCible || state.realiseStatut);
    const domaineCode = ev.domaine_code || ev.domaineCode;
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Réalisé</div>
      <div class="scope-main scope-event-realise">
        ${eventIdentityBand(ev, fiche)}
        ${renderRealiseKpis(fiche, rows)}
        ${renderRealiseToolbar(ev, fiche)}
        ${renderRealiseEncadrement(fiche)}
        <section class="scope-presence-section scope-realise-participants">
          <div class="scope-section-header">
            <h2 class="scope-section-heading">Participants</h2>
          </div>
          <div class="scope-toolbar scope-realise-pilot">
            <div class="scope-field">
              <label for="realise-q">RECHERCHE</label>
              <input id="realise-q" type="search" placeholder="Rechercher une personne…" value="${escapeHtml(state.realiseQuery)}" autocomplete="off">
            </div>
            <div class="scope-field">
              <label for="realise-grade">GRADE</label>
              <select id="realise-grade">
                <option value="">Tous</option>
                ${grades.map((g) => `<option value="${escapeHtml(g)}" ${state.realiseGrade === g ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('')}
              </select>
            </div>
            <div class="scope-field">
              <label for="realise-oi">INCORPORATION</label>
              <select id="realise-oi">
                <option value="">Toutes</option>
                ${cibles.map((g) => `<option value="${escapeHtml(g)}" ${state.realiseOi === g ? 'selected' : ''}>${escapeHtml(displayIncorporation(g, domaineCode))}</option>`).join('')}
              </select>
            </div>
            <div class="scope-field">
              <label for="realise-cible">CIBLE</label>
              <select id="realise-cible">
                <option value="">Toutes</option>
                ${cibles.map((g) => `<option value="${escapeHtml(g)}" ${state.realiseCible === g ? 'selected' : ''}>${escapeHtml(displayIncorporation(g, domaineCode))}</option>`).join('')}
              </select>
            </div>
            <div class="scope-field">
              <label for="realise-statut">STATUT</label>
              <select id="realise-statut">
                <option value="">Tous</option>
                ${statuts.map((g) => `<option value="${escapeHtml(g)}" ${state.realiseStatut === g ? 'selected' : ''}>${escapeHtml(realiseStatutLabel({ statut: g }))}</option>`).join('')}
              </select>
            </div>
            ${filtersActive ? '<button type="button" class="scope-btn scope-btn-secondary scope-btn-compact" id="realise-filters-reset">Réinitialiser les filtres</button>' : ''}
          </div>
          ${filtered.length ? `<div class="scope-table-scroll"><table class="scope-table scope-realise-table">
            <thead><tr>
              ${sortableHeader('event-realise', 'grade', 'GRADE', state.realiseSort)}
              ${sortableHeader('event-realise', 'nom', 'NOM', state.realiseSort)}
              ${sortableHeader('event-realise', 'prenom', 'PRÉNOM', state.realiseSort)}
              ${sortableHeader('event-realise', 'nip', 'NIP', state.realiseSort)}
              ${sortableHeader('event-realise', 'oi', 'INCORPORATION', state.realiseSort)}
              ${sortableHeader('event-realise', 'cible', 'CIBLE', state.realiseSort)}
              ${sortableHeader('event-realise', 'statut', 'STATUT', state.realiseSort)}
              <th>INFORMATIONS</th>
              <th>ACTION</th>
            </tr></thead>
            <tbody>
              ${filtered.map((r) => `<tr>
                <td data-label="GRADE">${escapeHtml(r.grade || '')}</td>
                <td data-label="NOM">${escapeHtml(r.nomFamille || r.nom || '')}</td>
                <td data-label="PRÉNOM">${escapeHtml(r.prenom || '')}</td>
                <td data-label="NIP">${escapeHtml(r.nip || '')}</td>
                <td data-label="INCORPORATION">${escapeHtml(displayIncorporation(r.cible && r.cible !== '—' ? r.cible : '', domaineCode))}</td>
                <td data-label="CIBLE">${escapeHtml(displayIncorporation(r.cible && r.cible !== '—' ? r.cible : '', domaineCode))}</td>
                <td data-label="STATUT">${escapeHtml(realiseStatutLabel(r))}</td>
                <td data-label="INFORMATIONS">${escapeHtml((L.informationMotifLabel && L.informationMotifLabel(r)) || '')}</td>
                <td data-label="ACTION">${canReadPersonnel() && r.personneId ? `<a class="scope-btn scope-realise-fiche-action" href="#/personnel/${escapeHtml(r.personneId)}">Fiche</a>` : ''}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>` : `<div class="scope-empty">${escapeHtml(L.emptyMessage('resultats'))}</div>`}
        </section>
      </div>
      ${renderRealiseModals()}
    `;
  }

  function renderModalAllPresent() {
    if (state.modal !== 'all-present') return '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Tous présents</h3>
      <p>Des présences sont déjà saisies. Continuer écrasera ces statuts pour le groupe affiché, hors encadrement.</p>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="all-present-ok">Confirmer</button>
        <button type="button" class="scope-btn" id="all-present-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalEncadrementRetrait() {
    const data = state.encRetrait;
    if (!data) return '';
    const labels = (data.labels || []).join(', ');
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Retirer le Formateur</h3>
      <p>Cette personne est Formateur sur plusieurs sessions PR${labels ? ` : ${escapeHtml(labels)}` : ''}.</p>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="enc-remove-session">Retirer de cette session</button>
        <button type="button" class="scope-btn" id="enc-remove-serie">Retirer de toute la série</button>
        <button type="button" class="scope-btn" id="enc-remove-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalResetSaisie() {
    if (state.modal !== 'reset-saisie') return '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Réinitialiser la saisie</h3>
      <p>Les statuts et motifs déjà saisis seront remis à Non renseigné. La population attendue et l’encadrement sont conservés.</p>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="reset-saisie-ok">Confirmer</button>
        <button type="button" class="scope-btn" id="reset-saisie-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalClotureIncomplete() {
    if (state.modal !== 'cloture-incomplete') return '';
    const people = state.clotureIncompletePeople || [];
    const count = people.length;
    const rows = people.map((p) => `<li>${escapeHtml(L.formatIncompletePersonLabel ? L.formatIncompletePersonLabel(p) : [p.grade, p.prenom, p.nomFamille || p.nom, p.nip ? `NIP ${p.nip}` : ''].filter(Boolean).join(' — '))}</li>`).join('');
    return `<div class="scope-modal"><div class="scope-card">
      <h3>CLÔTURE IMPOSSIBLE</h3>
      <p>Certaines personnes restent à renseigner pour finaliser l'exercice.</p>
      <ul class="scope-feedback-errors">${rows}</ul>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="cloture-incomplete-show">Afficher les personnes à renseigner</button>
        <button type="button" class="scope-btn" id="cloture-incomplete-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalUnsavedSaisie() {
    if (state.modal !== 'unsaved-saisie-leave') return '';
    const copy = state.saisieLeaveCopy || (L.planSaisieLeave ? L.planSaisieLeave(state) : {});
    return `<div class="scope-modal"><div class="scope-card">
      <h3>${escapeHtml(copy.title || 'MODIFICATIONS NON ENREGISTRÉES')}</h3>
      <p>${escapeHtml(copy.message || 'Des modifications n’ont pas encore été enregistrées.')}</p>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="scope-saisie-leave-save">Enregistrer et quitter</button>
        <button type="button" class="scope-btn" id="scope-saisie-leave-discard">Quitter sans enregistrer</button>
        <button type="button" class="scope-btn" id="scope-saisie-leave-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalPersonnelSync() {
    if (state.modal !== 'personnel-sync') return '';
    const preview = state.personnelSync.preview;
    const pending = state.personnelSync.commitPayload || {};
    const summary = (preview && (preview.importSummary || preview.summary)) || {};
    const applied = pending.appliedCount != null
      ? pending.appliedCount
      : (summary.countNewAssignments || 0);
    const createdPersons = pending.createdPersons != null
      ? pending.createdPersons
      : (summary.countNewPersons || summary.nouveaux || 0);
    const modified = pending.modifiedPersons != null
      ? pending.modifiedPersons
      : (summary.countModified || summary.changementsOi || 0);
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Confirmer l’import</h3>
      <p>Confirmer l’import de ces modifications dans SCOPE ? Cette action écrira en base. L’analyse et la prévisualisation n’ont effectué aucune écriture.</p>
      <p>${createdPersons} nouvelle(s) personne(s) · ${modified} personne(s) modifiée(s) · ${applied} nouvelle(s) affectation(s) · ${summary.countErrors || summary.conflits || 0} erreur(s).</p>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="scope-sync-commit-ok">Valider l’import</button>
        <button type="button" class="scope-btn" id="scope-sync-commit-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalCancel() {
    if (state.modal !== 'cancel-event') return '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Annuler l’événement</h3>
      <p>L’événement sera conservé dans l’historique mais exclu des statistiques.</p>
      <div class="scope-field"><label>Motif</label><textarea id="cancel-motif"></textarea></div>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="cancel-ok">Confirmer l’annulation</button>
        <button type="button" class="scope-btn" id="cancel-dismiss">Retour</button>
      </div>
    </div></div>`;
  }

  function importPill(statut) {
    const labels = {
      A_CREER: 'À créer', VALIDE: 'À créer', DEJA_PRESENT: 'Déjà présent', DEJA_IMPORTE: 'Déjà importé',
      ERREUR: 'Erreur', ERREUR_REFERENTIEL: 'Erreur de référentiel', ERREUR_DATE: 'Date invalide',
      ERREUR_MODE: 'Mode invalide', CONFLIT: 'Conflit', A_ARBITRER: 'À arbitrer', EXCLU: 'Exclu',
      AVERTISSEMENT: 'Avertissement', NEW_EVENT: 'Nouveau',       EXACT_MATCH: 'Reconnu',
      DIVERGENCE: 'Divergence',
      PROBABLE_MATCH: 'Probable', GROUPED: 'Regroupé', REVIEW_REQUIRED: 'À contrôler'
    };
    const err = String(statut || '').indexOf('ERREUR') === 0 || statut === 'CONFLIT';
    const warn = statut === 'A_ARBITRER' || statut === 'AVERTISSEMENT' || statut === 'DEJA_PRESENT' || statut === 'DEJA_IMPORTE' || statut === 'DIVERGENCE';
    const cls = err ? 'err' : (warn ? 'warn' : 'ok');
    return `<span class="scope-import-pill ${cls}">${escapeHtml(labels[statut] || statut)}</span>`;
  }

  function importLineVisible(line) {
    const filter = state.importFilter || 'TOUS';
    const excluded = Boolean(state.importExcluded[line.ligneNo]);
    if (filter === 'EXCLUS') return excluded;
    if (excluded && filter !== 'TOUS') return false;
    if (filter === 'TOUS') return true;
    if (filter === 'A_CREER') return line.statut === 'A_CREER' || line.statut === 'VALIDE' || line.statut === 'NEW_EVENT';
    if (filter === 'DEJA') return ['DEJA_PRESENT', 'DEJA_IMPORTE', 'EXACT_MATCH', 'PROBABLE_MATCH'].includes(line.statut);
    if (filter === 'GROUPED') return Boolean(line.groupKey);
    if (filter === 'ERREURS') return String(line.statut).indexOf('ERREUR') === 0 || line.statut === 'CONFLIT';
    if (filter === 'ARBITRER') return line.statut === 'A_ARBITRER' || line.statut === 'REVIEW_REQUIRED';
    if (filter === 'NOMINATIF') return line.modePropose === 'NOMINATIF' || line.typePropose === 'NOMINATIF';
    if (filter === 'QUANTITATIF') return line.modePropose === 'QUANTITATIF' || line.typePropose === 'QUANTITATIF';
    return true;
  }

  function importStandardGroupVisible(item) {
    const filter = state.importFilter || 'TOUS';
    const status = item.statut;
    const excluded = (item.sourceLineNos || []).length && (item.sourceLineNos || []).every((n) => state.importExcluded[n]);
    if (filter === 'EXCLUS') return excluded;
    if (excluded) return false;
    if (filter === 'TOUS') {
      return status === 'REVIEW_REQUIRED' || status === 'CONFLIT' || String(status).indexOf('ERREUR') === 0 || (item.avertissements || []).length;
    }
    if (filter === 'A_CREER') return status === 'NEW_EVENT' || status === 'GROUPED';
    if (filter === 'DEJA') return status === 'EXACT_MATCH' || status === 'PROBABLE_MATCH';
    if (filter === 'GROUPED') return status === 'GROUPED';
    if (filter === 'ERREURS') return String(status).indexOf('ERREUR') === 0 || status === 'CONFLIT';
    if (filter === 'ARBITRER') return status === 'REVIEW_REQUIRED' || status === 'A_ARBITRER';
    return true;
  }

  function importFilterCount(id, { standard, all, groups }) {
    const excludedLines = (line) => Boolean(state.importExcluded[line.ligneNo]);
    const groupExcluded = (item) => (item.sourceLineNos || []).length && (item.sourceLineNos || []).every((n) => state.importExcluded[n]);
    if (standard) {
      if (id === 'TOUS') return groups.filter((g) => !groupExcluded(g) && (g.statut === 'REVIEW_REQUIRED' || g.statut === 'CONFLIT' || String(g.statut).indexOf('ERREUR') === 0 || (g.avertissements || []).length)).length;
      if (id === 'A_CREER') return groups.filter((g) => !groupExcluded(g) && (g.statut === 'NEW_EVENT' || g.statut === 'GROUPED')).length;
      if (id === 'DEJA') return groups.filter((g) => !groupExcluded(g) && (g.statut === 'EXACT_MATCH' || g.statut === 'PROBABLE_MATCH')).length;
      if (id === 'GROUPED') return groups.filter((g) => !groupExcluded(g) && g.statut === 'GROUPED').length;
      if (id === 'ERREURS') return all.filter((l) => !excludedLines(l) && (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')).length;
      if (id === 'ARBITRER') return groups.filter((g) => !groupExcluded(g) && (g.statut === 'REVIEW_REQUIRED' || g.statut === 'A_ARBITRER')).length;
      if (id === 'EXCLUS') return Object.keys(state.importExcluded).filter((k) => state.importExcluded[k]).length;
      return 0;
    }
    if (id === 'TOUS') return all.filter((l) => !excludedLines(l)).length;
    if (id === 'A_CREER') return all.filter((l) => !excludedLines(l) && (l.statut === 'A_CREER' || l.statut === 'VALIDE' || l.statut === 'NEW_EVENT')).length;
    if (id === 'DEJA') return all.filter((l) => !excludedLines(l) && ['DEJA_PRESENT', 'DEJA_IMPORTE', 'EXACT_MATCH', 'PROBABLE_MATCH'].includes(l.statut)).length;
    if (id === 'GROUPED') return all.filter((l) => !excludedLines(l) && Boolean(l.groupKey)).length;
    if (id === 'ERREURS') return all.filter((l) => !excludedLines(l) && (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')).length;
    if (id === 'ARBITRER') return all.filter((l) => !excludedLines(l) && (l.statut === 'A_ARBITRER' || l.statut === 'REVIEW_REQUIRED')).length;
    if (id === 'EXCLUS') return Object.keys(state.importExcluded).filter((k) => state.importExcluded[k]).length;
    if (id === 'NOMINATIF') return all.filter((l) => !excludedLines(l) && (l.modePropose === 'NOMINATIF' || l.typePropose === 'NOMINATIF')).length;
    if (id === 'QUANTITATIF') return all.filter((l) => !excludedLines(l) && (l.modePropose === 'QUANTITATIF' || l.typePropose === 'QUANTITATIF')).length;
    return 0;
  }

  function buildImportFilters({ standard, all, groups }) {
    if (L && typeof L.buildImportPreviewFilters === 'function') {
      return L.buildImportPreviewFilters({ standard, all, groups, excluded: state.importExcluded });
    }
    const defs = standard ? [
      ['TOUS', 'Points à traiter'], ['A_CREER', 'À créer'], ['DEJA', 'Déjà présents'], ['GROUPED', 'Regroupés'],
      ['ERREURS', 'Erreurs'], ['ARBITRER', 'À contrôler'], ['EXCLUS', 'Exclus']
    ] : [
      ['TOUS', 'Tout'], ['A_CREER', 'À créer'], ['DEJA', 'Déjà présents'], ['GROUPED', 'Regroupés'],
      ['ERREURS', 'Erreurs'], ['ARBITRER', 'À arbitrer'], ['EXCLUS', 'Exclus'],
      ['NOMINATIF', 'Nominatif'], ['QUANTITATIF', 'Quantitatif']
    ];
    return defs
      .map(([id, label]) => ({ id, label, count: importFilterCount(id, { standard, all, groups }) }))
      .filter((item) => item.count > 0);
  }

  function defaultImportFilter(filters) {
    if (L && typeof L.defaultImportPreviewFilter === 'function') return L.defaultImportPreviewFilter(filters);
    const order = ['TOUS', 'A_CREER', 'DEJA', 'GROUPED'];
    return (order.map((id) => filters.find((f) => f.id === id)).find(Boolean) || filters[0] || { id: 'TOUS' }).id;
  }

  function renderImport() {
    const live = typeof client.previewImportEvenements === 'function';
    const preview = state.importPreview;
    const rapport = state.importRapport;
    const all = (preview && preview.lignes) || [];
    const previewGroups = (preview && preview.groups) || [];
    const native = preview && (preview.format === 'SCOPE_EXERCICES_CSV_1' || preview.profil === 'SCOPE_EXERCICES_CSV_1');
    const standard = preview && (preview.format === 'SCOPE_EVENT_STANDARD_CSV_1' || preview.profil === 'SCOPE_EVENT_STANDARD_CSV_1');
    const f7 = preview && (preview.format === 'monitoring_exercices_sdis_22cols' || preview.profil === 'monitoring_exercices_sdis_22cols');
    const filters = preview ? buildImportFilters({ standard, all, groups: previewGroups }) : [];
    if (preview && filters.length && !filters.some((item) => item.id === state.importFilter)) {
      state.importFilter = defaultImportFilter(filters);
    }
    const visibleCandidates = standard && (state.importFilter || 'TOUS') === 'TOUS'
      ? all.filter((l) => String(l.statut).indexOf('ERREUR') === 0 || ['CONFLIT', 'REVIEW_REQUIRED', 'A_ARBITRER'].includes(l.statut) || (l.avertissements || []).length)
      : all;
    const lignes = visibleCandidates.filter(importLineVisible);
    const blocking = all.filter((l) => {
      if (state.importExcluded[l.ligneNo]) return false;
      if (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT' || l.statut === 'REVIEW_REQUIRED') return true;
      if (l.statut === 'A_ARBITRER' && !(state.importDecisions[l.ligneNo] && state.importDecisions[l.ligneNo].mode)) return true;
      return false;
    });
    const creatable = all.some((l) => {
      if (state.importExcluded[l.ligneNo]) return false;
      if (l.statut === 'A_CREER' || l.statut === 'VALIDE' || l.statut === 'NEW_EVENT' || l.statut === 'GROUPED') return true;
      if (l.statut === 'A_ARBITRER' && state.importDecisions[l.ligneNo] && state.importDecisions[l.ligneNo].mode) return true;
      return false;
    });
    const canCommit = live && preview && !rapport && !state.loading && !state.importCommitProgress && blocking.length === 0 && (creatable || all.some((l) => !state.importExcluded[l.ligneNo]));
    const summary = (preview && preview.summary) || {};
    const byDomaine = summary.byDomaine || {};
    const modes = summary.modes || {};
    const lineCards = lignes.map((l) => {
      const excluded = Boolean(state.importExcluded[l.ligneNo]);
      const decision = state.importDecisions[l.ligneNo] || {};
      const cibles = l.publicCible || l.cibleCodes || l.niveauCode || (l.cibles || []).map((c) => c.niveauCode).join(' | ');
      const sous = l.sousDomaineAffiche || l.sousDomaine || '';
      return `<article class="scope-import-card ${String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT' ? 'is-error' : ''}">
        <header>
          <strong>Ligne ${l.ligneNo}</strong>
          ${importPill(l.statut)}
          <span class="scope-import-type">${escapeHtml(l.modePropose || l.typePropose || '—')}</span>
        </header>
        <p class="scope-import-meta">${escapeHtml(L.formatDate(l.date))} · ${escapeHtml(l.domaine || '')}${sous ? ` / ${escapeHtml(sous)}` : ''} · ${escapeHtml(cibles || '—')}</p>
        <p class="scope-import-libelle">${escapeHtml(l.libelle || '')}</p>
        ${standard ? `<p class="scope-import-mode">CODE COURS : ${escapeHtml(l.codeCours || '—')} · Stat.Com : ${escapeHtml(l.statCom || '—')}</p>` : ''}
        ${native ? `<p class="scope-import-mode">Mode demandé : ${escapeHtml(l.modeDemande || '—')} · Mode proposé : ${escapeHtml(l.modePropose || '—')}</p>` : ''}
        <p class="scope-import-reason">${escapeHtml(l.raison || l.statutLibelle || '')}</p>
        <p class="scope-import-action">Action : ${escapeHtml(l.actionPrevue || '—')}</p>
        ${l.statut === 'A_ARBITRER' ? `<div class="scope-field"><label>Arbitrage du mode</label>
          <select data-import-decision="${l.ligneNo}">
            <option value="">Choisir…</option>
            <option value="NOMINATIF" ${decision.mode === 'NOMINATIF' ? 'selected' : ''}>Nominatif</option>
            <option value="QUANTITATIF" ${decision.mode === 'QUANTITATIF' ? 'selected' : ''}>Quantitatif</option>
          </select>
        </div>` : ''}
        <label class="scope-import-exclude">
          <input type="checkbox" data-exclude-line="${l.ligneNo}" ${excluded ? 'checked' : ''}>
          Exclure cette ligne
        </label>
      </article>`;
    }).join('');
    const standardIssueLines = standard
      ? all.filter((l) => String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')
      : [];
    const standardItems = standard
      ? previewGroups.concat(standardIssueLines.map((line) => ({
        statut: line.statut,
        actionPrevue: line.actionPrevue,
        lignes: [line],
        sourceLineNos: [line.ligneNo],
        cibles: line.cibles || [],
        cibleCodes: line.cibleCodes || '',
        publicCible: line.publicCible || line.cibleCodes || '',
        codeCours: line.codeCours,
        codeParts: line.codeParts,
        date: line.date,
        domaineStockage: line.domaineStockage,
        sousDomaine: line.sousDomaine,
        libelle: line.libelle,
        heureDebut: line.heureDebut,
        heureFin: line.heureFin,
        responsable: line.responsable,
        salle: line.salle,
        raison: line.raison,
        avertissements: line.avertissements || []
      }))).filter(importStandardGroupVisible)
      : [];
    const standardCards = standardItems.map((g) => {
      const lines = g.lignes || [];
      const first = lines[0] || {};
      const isIssue = g.statut === 'REVIEW_REQUIRED' || g.statut === 'CONFLIT' || String(g.statut).indexOf('ERREUR') === 0;
      const cibles = g.publicCible || g.cibleCodes || (g.cibles || []).map((c) => c.niveauCode).join(' | ') || first.publicCible || first.cibleCodes || '—';
      const sourceLines = (g.sourceLineNos || []).join(', ');
      const population = g.populationLabel || (g.populationCount === 0 || g.populationCount ? `${g.populationCount} ${g.populationCount > 1 ? 'personnes' : 'personne'}` : (g.population || '—'));
      const detailRows = lines.map((line) => `<tr>
        <td>${escapeHtml(String(line.ligneNo || '—'))}</td>
        <td>${escapeHtml(line.codeCours || '—')}</td>
        <td>${escapeHtml(line.source && (line.source.public_cible || line.source.cibles) || line.cibleCodes || '—')}</td>
        <td>${escapeHtml(line.raison || line.statutLibelle || '')}</td>
      </tr>`).join('');
      return `<article class="scope-import-event ${isIssue ? 'is-attention' : ''}">
        <header class="scope-import-event-head">
          <div>
            <strong>${escapeHtml(g.libelle || first.libelle || 'Événement sans libellé')}</strong>
            <p>${escapeHtml(L.formatDate(g.date || first.date))}${g.heureDebut ? ` · ${escapeHtml(g.heureDebut)}` : ''}${g.heureFin ? `-${escapeHtml(g.heureFin)}` : ''}</p>
          </div>
          ${importPill(g.statut)}
        </header>
        <div class="scope-import-event-grid">
          <div><span>STAT.COM</span><strong>${escapeHtml((g.codeParts && g.codeParts.statCom) || first.statCom || '—')}</strong></div>
          <div><span>QUI</span><strong>${escapeHtml((g.codeParts && g.codeParts.qui) || first.qui || '—')}</strong></div>
          <div><span>Publics</span><strong>${escapeHtml(cibles)}</strong></div>
          <div><span>Événement SCOPE</span><strong>1</strong></div>
          <div><span>Lignes source</span><strong>${escapeHtml(String((g.sourceLineNos || []).length || 1))}</strong></div>
          <div><span>Population</span><strong>${escapeHtml(String(population))}</strong></div>
        </div>
        ${isIssue ? `<div class="scope-import-decision"><strong>${escapeHtml(g.raison || first.raison || 'Point à contrôler')}</strong><p>Action : ${escapeHtml(g.actionPrevue || first.actionPrevue || 'ARBITRER')}</p></div>` : ''}
        <details class="scope-import-source">
          <summary>Consulter les lignes source ${escapeHtml(sourceLines ? `(${sourceLines})` : '')}</summary>
          <table><thead><tr><th>Ligne</th><th>CODE COURS</th><th>Cible source</th><th>Message</th></tr></thead><tbody>${detailRows}</tbody></table>
        </details>
      </article>`;
    }).join('');
    const cards = standard ? standardCards : lineCards;
    const formatBanner = !preview
      ? ''
      : standard
        ? '<p class="scope-import-format is-scope">Format détecté : <strong>événements standard</strong> (CODE COURS conservé, regroupement métier, population nominative).</p>'
        : native
        ? '<p class="scope-import-format is-scope">Format détecté : <strong>programme SCOPE</strong> (événements PLANIFIE nominatifs ou quantitatifs). Aucun LEGACY.</p>'
        : f7
          ? '<p class="scope-import-format is-f7">Format détecté : <strong>historique Monitoring F7</strong> (22 colonnes). Conservé pour la transition. Ce n’est pas le programme SCOPE natif.</p>'
          : '';
    const resume = preview && standard ? `
      <div class="scope-import-resume">
        <h3 class="scope-import-title">IMPORT DU PROGRAMME</h3>
        <div class="scope-import-kpis">
          ${[
            ['LIGNES LUES', summary.nbLignes || 0],
            ['ÉVÉNEMENTS', summary.eventsDetected || 0],
            ['NOUVEAUX', summary.nouveaux || 0],
            ['REGROUPEMENTS', summary.regroupes || 0],
            ['RECONNUS', summary.reconnus || 0],
            ['À CONTRÔLER', summary.aControler || 0],
            ['ERREURS', summary.erreurs || 0]
          ].map(([label, value]) => `<div class="scope-import-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('')}
        </div>
        <h4 class="scope-import-section-title">Points à traiter</h4>
        <p class="scope-mode-hint">Aucune écriture tant que vous n’avez pas confirmé. Le CODE COURS source est conservé et verrouillé. La vue par défaut n’ouvre que les erreurs, arbitrages et anomalies.</p>
      </div>` : preview && native ? `
      <div class="scope-import-resume">
        <h3 class="scope-import-title">Programme à importer</h3>
        <p>${summary.nbLignes || 0} ligne(s) analysée(s)</p>
        <ul>
          <li>${summary.A_CREER || summary.aCreer || 0} événement(s) à créer</li>
          <li>${(summary.DEJA_PRESENT || 0) + (summary.DEJA_IMPORTE || 0)} déjà présent(s) / déjà importé(s)</li>
          <li>${summary.ERREUR || 0} erreur(s)</li>
          <li>${summary.A_ARBITRER || 0} ligne(s) à arbitrer</li>
        </ul>
        <p>Modes proposés : ${modes.NOMINATIF || 0} nominatif · ${modes.QUANTITATIF || 0} quantitatif</p>
        <p>Répartition : ${Object.keys(byDomaine).length ? Object.keys(byDomaine).sort().map((k) => `${escapeHtml(k)} ${byDomaine[k]}`).join(' · ') : '—'}</p>
        <p class="scope-mode-hint">Aucune écriture tant que vous n’avez pas confirmé. Population non figée. Aucun attendu ni volume inventé.</p>
      </div>` : (preview ? `<p>Valides ${summary.VALIDE || summary.A_CREER || 0} · Avertissements ${summary.AVERTISSEMENT || 0} · Erreurs ${summary.ERREUR || 0}. Aucune écriture tant que vous n’avez pas confirmé.</p>` : '');
    const yearsHint = rapport && rapport.created && rapport.created.length
      ? [...new Set(rapport.created.map((c) => String(c.date || '').slice(0, 4)).filter(Boolean))]
      : [];
    const periodNote = yearsHint.length && !yearsHint.includes(String(state.year))
      ? `<p class="scope-mode-hint">Les événements importés sont en ${escapeHtml(yearsHint.join(', '))}. Le bandeau affiche ${escapeHtml(String(state.year))} : changez l’année pour les voir.</p>`
      : '';
    const progress = state.importCommitProgress;
    const progressOverlay = progress ? `<div class="scope-modal-backdrop"><div class="scope-modal" role="status" aria-live="polite">
      <h3>${escapeHtml(progress.title || 'Import du programme en cours')}</h3>
      <p>${escapeHtml(progress.phase || 'Préparation...')}</p>
      <div class="scope-loading-row">Merci de garder cette fenêtre ouverte. Aucune relance automatique ne sera effectuée.</div>
    </div></div>` : '';
    return `
      <div class="scope-crumb">Réglages / Import des événements</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages / Importation', title: 'Import des événements', context: 'Programme CSV', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Importer un programme d’événements</h2>
          <p>Ce parcours recommandé alimente le programme SCOPE. Après import, la base SCOPE reste la source de vérité. Aucun agrégat n’est transformé en personnes.</p>
          <p class="scope-mode-hint">Trois formats : <strong>événements standard</strong> avec CODE COURS, <strong>programme SCOPE</strong> (date ; domaine ; cibles ; libellé ; mode) ou <strong>historique Monitoring F7</strong> (22 colonnes). Le fichier est reconnu à l’en-tête.</p>
          ${live ? '' : '<p class="scope-empty">Connectez-vous pour valider l’import.</p>'}
          <p><a class="scope-btn" href="assets/csv/SCOPE_Programme_Exercices_Exemple.csv" download>Télécharger un exemple SCOPE</a></p>
          <div id="scope-import-drop" class="scope-import-drop ${state.importFile.drag ? 'is-drag' : ''}">
            <p>Glissez un fichier CSV ici ou</p>
            <label class="scope-btn">
              Choisir un fichier
              <input id="scope-import-file" type="file" accept=".csv,text/csv" hidden>
            </label>
            <p class="scope-import-file">${escapeHtml(state.importFile.filename || 'Aucun fichier')}</p>
          </div>
          <div class="scope-actions">
            <button type="button" class="scope-btn" id="scope-import-preview" ${!state.importFile.csvText || !live ? 'disabled' : ''}>Contrôler (preview)</button>
            <button type="button" class="scope-btn scope-btn-primary" id="scope-import-commit" ${canCommit ? '' : 'disabled'}>Confirmer l’import</button>
            <a class="scope-btn" href="#/evenements">Retour à la liste</a>
          </div>
          ${formatBanner}
        </div>
        ${preview ? `<div class="scope-card" style="margin-top:12px">
          ${resume}
          <div class="scope-sync-filters" role="tablist">
            ${filters.map((item) => `<button type="button" class="scope-btn ${state.importFilter === item.id ? 'scope-btn-primary' : ''}" data-import-filter="${item.id}">${escapeHtml(item.label)} (${escapeHtml(String(item.count))})</button>`).join('')}
          </div>
          <div class="scope-import-list">${cards || '<p class="scope-empty">Aucune ligne pour ce filtre.</p>'}</div>
        </div>` : ''}
        ${rapport ? `<div class="scope-card" style="margin-top:12px">
          <h3 class="scope-import-title">Programme importé</h3>
          <p>${rapport.summary.imported} événement(s) créé(s) · ${rapport.summary.dejaImporte || 0} déjà présent(s) · ${rapport.summary.exclus || 0} exclu(s) · ${rapport.summary.erreurs || 0} erreur · ${rapport.summary.rollback || 0} rollback</p>
          ${periodNote}
          <div class="scope-actions"><a class="scope-btn scope-btn-primary" id="scope-import-see" href="#/evenements">Voir les événements</a></div>
        </div>` : ''}
        ${progressOverlay}
      </div>
    `;
  }

  function renderImportPersonnel() {
    return renderPersonnel({ importMode: true }).replace('<div class="scope-crumb">Personnel</div>', '<div class="scope-crumb">Réglages / Importation / Personnel</div>');
  }

  function renderUtilisateurs() {
    const canAdmin = hasScopePermission('users:admin');
    return `
      <div class="scope-crumb">Réglages / Utilisateurs</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages / Paramètres', title: 'Utilisateurs', context: 'Accès et rôles', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Utilisateurs</h2>
          <p>SCOPE s’appuie sur les comptes institutionnels. Cette page expose les droits disponibles sans recréer une gestion utilisateur locale.</p>
          <dl class="scope-meta">
            <div><dt>Comptes</dt><dd>identité institutionnelle</dd></div>
            <div><dt>Rôles</dt><dd>Administration, commandement, formation, instruction, consultation.</dd></div>
            <div><dt>Administration</dt><dd>${canAdmin ? 'Droits d’administration détectés.' : 'Non visible avec votre profil actuel.'}</dd></div>
            <div><dt>Gestion</dt><dd>Fonctions d’administration disponibles pour les profils habilités.</dd></div>
          </dl>
        </div>
      </div>
    `;
  }

  function renderAdministration() {
    return `
      <div class="scope-crumb">Réglages / Administration</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages / Paramètres', title: 'Administration', context: 'Capacités réelles', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Administration</h2>
          <p>Les fonctions administratives réelles exposées dans SCOPE sont les objectifs, le suivi nominatif, les imports, l’audit technique et les réglages serveur déjà protégés par RBAC.</p>
          <div class="scope-home-links">
            ${hasScopePermission('references:manage') ? '<a href="#/reglages/objectifs">Objectifs</a>' : ''}
            ${hasScopePermission('personnel:manage') ? '<a href="#/reglages/suivi">Suivi nominatif</a><a href="#/reglages/import-personnel">Import du personnel</a>' : ''}
            ${hasScopePermission('events:create') ? '<a href="#/reglages/import-evenements">Import des événements</a>' : ''}
            ${hasScopePermission('users:admin') ? '<a href="#/reglages/utilisateurs">Utilisateurs</a>' : ''}
          </div>
          <p class="scope-mode-hint">Aucune pseudo-administration n’a été ajoutée. Les capacités absentes restent documentées plutôt que simulées.</p>
        </div>
      </div>
    `;
  }

  function renderApropos() {
    return `
      <div class="scope-crumb">Réglages / À propos</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages', title: 'À propos', context: 'Application', logo: true })}
        <div class="scope-card scope-about-hero">
          <img src="assets/img/logo-scope-blanc.png" alt="SCOPE">
          <p class="scope-eyebrow">Suivi et analyse de l’activité</p>
          <h2>À propos de SCOPE</h2>
          <p>SCOPE accompagne le SDIS régional du Nord vaudois dans le suivi des événements, de la participation, des objectifs, du personnel et des rapports d’activité.</p>
        </div>
        <div class="scope-card">
          <h2 style="margin-top:0">Cadre institutionnel</h2>
          <div class="scope-about-inst"><img src="assets/img/LogoSDISseulnoir.png" alt="SDIS régional du Nord vaudois"><span>SDIS régional du Nord vaudois</span></div>
          <dl class="scope-meta">
            <div><dt>Application</dt><dd>SCOPE</dd></div>
            <div><dt>Périmètre</dt><dd>Activité, participation, objectifs, personnel et rapports</dd></div>
            <div><dt>Accès</dt><dd>Réservé aux profils habilités</dd></div>
            <div><dt>Institution</dt><dd>SDIS régional du Nord vaudois</dd></div>
          </dl>
        </div>
      </div>
    `;
  }

  function readQtyVolumes() {
    const field = (id, fallback) => {
      const el = document.getElementById(id);
      return el ? el.value : fallback;
    };
    state.volumes = {
      attendus: field('qty-attendus', state.volumes.attendus),
      presents: field('qty-presents', state.volumes.presents),
      excusesPrive: field('qty-excuses-prive', state.volumes.excusesPrive),
      excusesProfessionnel: field('qty-excuses-pro', state.volumes.excusesProfessionnel),
      excusesArmee: field('qty-excuses-armee', state.volumes.excusesArmee),
      excusesAccidentMaladie: field('qty-excuses-am', state.volumes.excusesAccidentMaladie),
      excusesNonPrecise: field('qty-excuses-np', state.volumes.excusesNonPrecise || '0'),
      nonExcuses: field('qty-non-excuses', state.volumes.nonExcuses),
      dispenses: field('qty-dispenses', state.volumes.dispenses || '0'),
      permutations: field('qty-permutations', state.volumes.permutations || '0')
    };
    const motifSum = ['excusesPrive', 'excusesProfessionnel', 'excusesArmee', 'excusesAccidentMaladie', 'excusesNonPrecise']
      .reduce((sum, key) => sum + (state.volumes[key] === '' ? 0 : Number(state.volumes[key] || 0)), 0);
    state.volumes.excuses = String(motifSum);
    const num = (key) => state.volumes[key] === '' ? undefined : Number(state.volumes[key]);
    return {
      attendus: num('attendus'),
      presents: num('presents'),
      excusesPrive: num('excusesPrive') || 0,
      excusesProfessionnel: num('excusesProfessionnel') || 0,
      excusesArmee: num('excusesArmee') || 0,
      excusesAccidentMaladie: num('excusesAccidentMaladie') || 0,
      excusesNonPrecise: num('excusesNonPrecise') || 0,
      nonExcuses: num('nonExcuses'),
      dispenses: num('dispenses') || 0,
      permutations: num('permutations') || 0
    };
  }

  function bindQuantitatifSaisie() {
    const form = document.getElementById('qty-form');
    if (!form) return;
    const errorEl = document.querySelector('.scope-qty-error');
    const clotureBtn = document.getElementById('qty-cloturer');
    let timer = null;
    const refreshLocal = () => {
      readQtyVolumes();
      const equal = L.volumesEquality(state.volumes);
      if (clotureBtn) clotureBtn.disabled = !equal;
      if (errorEl) errorEl.hidden = equal;
    };
    const requestPreview = () => {
      const id = route().id;
      if (typeof client.previewTauxQuantitatif !== 'function') return;
      const body = readQtyVolumes();
      client.previewTauxQuantitatif(id, body).then((data) => {
        state.qtyPreview = data;
        const box = document.querySelector('.scope-qty-preview');
        if (!box || !data) return;
        const t = data.taux || {};
        box.innerHTML = `<h3 style="margin-top:0">Aperçu du taux</h3>
          <p style="color:var(--scope-muted);margin-top:0">${escapeHtml(data.message || '')}</p>
          <p style="font-size:28px;margin:8px 0 0">${escapeHtml(L.formatTaux(t.percentage))}</p>
          <p style="color:var(--scope-muted);margin-top:4px">${escapeHtml(String(t.numerator ?? '—'))} / ${escapeHtml(String(t.denominator ?? '—'))}</p>`;
      }).catch(() => {});
    };
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        refreshLocal();
        clearTimeout(timer);
        timer = setTimeout(requestPreview, 280);
      });
    });
    requestPreview();
    document.getElementById('qty-save')?.addEventListener('click', () => {
      const id = route().id;
      const body = readQtyVolumes();
      withLoading(async () => {
        const res = await client.enregistrerSaisieQuantitative(id, body, state.fiche.evenement.version);
        await reloadFicheFromServer(id);
        toast('success', 'Enregistré', 'Les présences ont été enregistrées.');
        state.fiche.evenement.version = res.version;
      });
    });
    document.getElementById('qty-cloturer')?.addEventListener('click', () => {
      const id = route().id;
      const body = readQtyVolumes();
      withLoading(async () => {
        if (!L.volumesEquality(state.volumes)) {
          throw { status: 422, error: 'volumes_incoherents', message: 'Présents + excusés + non excusés + dispensés doit être égal aux attendus.' };
        }
        await client.enregistrerSaisieQuantitative(id, body, state.fiche.evenement.version);
        await reloadFicheFromServer(id);
        await client.cloturer(id, state.fiche.evenement.version);
        await reloadFicheFromServer(id);
        go(`#/exercices/${id}`);
      });
    });
  }

  function renderScopeFeedback() {
    const fb = state.feedback;
    if (!fb) return '';
    const kind = fb.kind || 'info';
    const title = fb.title || '';
    const message = fb.message || '';
    const mark = kind === 'success' ? '✓'
      : kind === 'error' ? '!'
        : kind === 'warning' || kind === 'confirm' ? '!'
          : kind === 'progress' ? ''
            : 'i';
    const progress = fb.progress ? '<div class="scope-feedback-progress" aria-hidden="true"></div>' : '';
    const errors = Array.isArray(fb.errors) && fb.errors.length
      ? `<ul class="scope-feedback-errors">${fb.errors.slice(0, Number(fb.errorsMax || 5)).map((e) => `<li>${escapeHtml(e.message || e.code || String(e))}</li>`).join('')}</ul>`
      : '';
    const actions = kind === 'confirm'
      ? `<div class="scope-feedback-actions"><button type="button" class="scope-btn" id="scope-feedback-cancel">${escapeHtml(fb.cancelText || 'Annuler')}</button><button type="button" class="scope-btn scope-btn-primary" id="scope-feedback-confirm">${escapeHtml(fb.confirmText || 'Confirmer')}</button></div>`
      : fb.closeable === false ? '' : `<div class="scope-feedback-actions"><button type="button" class="scope-btn scope-btn-primary" id="scope-feedback-close">${escapeHtml(fb.closeText || 'OK')}</button></div>`;
    return `<div class="scope-feedback-overlay is-${escapeHtml(kind)}" role="${kind === 'confirm' || kind === 'error' ? 'dialog' : 'status'}" aria-modal="${kind === 'confirm' || kind === 'error' ? 'true' : 'false'}">
      <div class="scope-feedback-card">
        ${progress || `<div class="scope-feedback-mark" aria-hidden="true">${escapeHtml(mark)}</div>`}
        <h2>${escapeHtml(title)}</h2>
        ${message ? `<p>${escapeHtml(message)}</p>` : ''}
        ${errors}
        ${actions}
      </div>
    </div>`;
  }

  function render() {
    if (state.authChecking || state.needOkta) {
      root.classList.toggle('is-nav-open', false);
      root.innerHTML = renderLoginScreen();
      bind();
      return;
    }
    const r = route();
    const body = r.screen === 'accueil' ? renderAccueil()
      : r.screen === 'vue' ? renderVue()
        : r.screen === 'statistiques' ? renderStatistiques()
      : r.screen === 'cycles' ? renderCycles()
        : r.screen === 'cycle' ? renderCycle()
      : r.screen === 'personnel' ? renderPersonnel()
        : r.screen === 'personne' ? renderPersonne()
        : r.screen === 'rapports' ? renderRapports()
          : (r.screen === 'rapport-jsp' || r.screen === 'rapport-participation') ? renderRapportJsp()
          : r.screen === 'rapport-formation' ? renderFormationReport()
        : r.screen === 'objectifs' ? renderObjectifs()
          : r.screen === 'suivi' ? renderSuiviNominatif()
            : r.screen === 'import-evenements' ? renderImport()
              : r.screen === 'import-personnel' ? renderImportPersonnel()
                : r.screen === 'utilisateurs' ? renderUtilisateurs()
                  : r.screen === 'administration' ? renderAdministration()
                    : r.screen === 'apropos' ? renderApropos()
          : r.screen === 'nouveau' ? renderNouveau()
            : r.screen === 'saisie' ? renderSaisie()
              : r.screen === 'fiche' ? renderFiche()
                : r.screen === 'import' ? renderImport()
                  : renderListe();
    root.classList.toggle('is-nav-open', Boolean(state.navOpen));
    root.innerHTML = `<div class="scope-app-shell">${sidebarHtml(r)}<div class="scope-workspace">${headerHtml(r)}${bannerHtml()}<div class="scope-content">${body}</div></div></div>${renderPersonnelInactivateModal()}${renderModalAllPresent()}${renderPersonnelAssignmentModal()}${renderPersonnelManualAddModal()}${renderModalEncadrementRetrait()}${renderModalResetSaisie()}${renderModalClotureIncomplete()}${renderModalUnsavedSaisie()}${renderModalCancel()}${renderModalPersonnelSync()}${renderScopeFeedback()}`;
    bind();
    if (state.objectifMenuId) positionObjectifRowMenu();
    const statutSel = document.getElementById('filter-statut');
    const domaineSel = document.getElementById('filter-domaine');
    if (statutSel) statutSel.value = state.statut;
    if (domaineSel) domaineSel.value = state.domaine;
    const cycleDomaineSel = document.getElementById('cycle-filter-domaine');
    const cycleStatutSel = document.getElementById('cycle-filter-statut');
    if (cycleDomaineSel) cycleDomaineSel.value = state.cycleFilter.domaine;
    if (cycleStatutSel) cycleStatutSel.value = state.cycleFilter.statut;
  }

  function bind() {
    document.getElementById('scope-feedback-close')?.addEventListener('click', () => ScopeFeedback.clear());
    document.getElementById('scope-feedback-cancel')?.addEventListener('click', () => ScopeFeedback.clear());
    document.getElementById('scope-feedback-confirm')?.addEventListener('click', async () => {
      const action = state.feedbackAction;
      state.feedback = null;
      state.feedbackAction = null;
      render();
      if (typeof action === 'function') await action();
    });
    document.getElementById('scope-include-qual')?.addEventListener('change', (e) => {
      state.includeQualification = Boolean(e.target.checked);
      persistIncludeQualification(state.includeQualification);
      reloadPeriod();
    });
    document.getElementById('scope-year')?.addEventListener('change', (e) => {
      state.year = e.target.value;
      if (state.preset === 'YEAR') {
        state.from = `${state.year}-01-01`;
        state.to = `${state.year}-12-31`;
      }
      reloadPeriod();
    });
    document.getElementById('scope-preset')?.addEventListener('change', (e) => {
      state.preset = e.target.value;
      render();
      reloadPeriod();
    });
    document.getElementById('scope-month')?.addEventListener('change', (e) => {
      state.month = e.target.value;
      reloadPeriod();
    });
    document.getElementById('scope-semester')?.addEventListener('change', (e) => {
      state.semester = e.target.value;
      reloadPeriod();
    });
    document.getElementById('scope-quarter')?.addEventListener('change', (e) => {
      state.quarter = e.target.value;
      reloadPeriod();
    });
    document.getElementById('scope-from')?.addEventListener('change', (e) => {
      state.from = e.target.value;
      reloadPeriod();
    });
    document.getElementById('scope-to')?.addEventListener('change', (e) => {
      state.to = e.target.value;
      reloadPeriod();
    });
    document.getElementById('scope-explain-toggle')?.addEventListener('click', () => {
      state.explainOpen = !state.explainOpen;
      render();
    });
    root.querySelectorAll('[data-graph-explain]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-graph-explain');
        state.graphExplainId = state.graphExplainId === id ? null : id;
        render();
      });
    });
    document.getElementById('scope-absences-toggle')?.addEventListener('click', () => {
      state.absencesOpen = !state.absencesOpen;
      render();
    });
    root.querySelectorAll('[data-alert-ack]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const fp = btn.getAttribute('data-alert-ack');
        if (!fp || typeof client.acquitterAlerte !== 'function') return;
        withLoading(async () => {
          await client.acquitterAlerte({ fingerprint: fp });
          await loadDashboard();
          await refreshAlertCounts();
        });
      });
    });
    document.getElementById('scope-nav-toggle')?.addEventListener('click', () => {
      state.navOpen = !state.navOpen;
      render();
    });
    document.getElementById('scope-nav-close')?.addEventListener('click', () => {
      closeNav();
      render();
    });
    document.getElementById('scope-nav-backdrop')?.addEventListener('click', () => {
      closeNav();
      render();
    });
    root.querySelectorAll('[data-nav-group]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-nav-group');
        if (!id) return;
        const currently = btn.getAttribute('aria-expanded') === 'true';
        state.openGroups = currently ? {} : { [id]: true };
        render();
      });
    });
    root.querySelectorAll('.scope-sidebar a[href^="#/"]').forEach((a) => {
      a.addEventListener('click', () => {
        if (state.navOpen) closeNav();
      });
    });
    document.getElementById('scope-reload')?.addEventListener('click', () => {
      const r = route();
      withLoading(async () => {
        clearToast();
        if (r.screen === 'personne' && r.personneId) await loadPersonneFiche(r.personneId);
        else if (r.screen === 'cycle' && r.id) await loadCycle(r.id);
        else if (r.id) await loadFiche(r.id);
        else if (r.screen === 'vue' || r.screen === 'accueil' || r.screen === 'statistiques') await loadDashboard();
        else if (r.screen === 'personnel' || r.screen === 'import-personnel') await loadPersonnelDirectory();
        else if (r.screen === 'cycles') await loadCycles();
        else await loadList();
        await refreshAlertCounts();
      });
    });
    document.getElementById('filter-statut')?.addEventListener('change', (e) => {
      state.statut = e.target.value;
      state.eventListPage = 1;
      withLoading(loadList);
    });
    document.getElementById('filter-domaine')?.addEventListener('change', (e) => {
      state.domaine = e.target.value;
      state.eventListPage = 1;
      withLoading(loadList);
    });
    document.getElementById('cycle-filter-domaine')?.addEventListener('change', (e) => {
      state.cycleFilter.domaine = e.target.value;
      state.cyclesReady = false;
      withLoading(loadCycles);
    });
    document.getElementById('cycle-filter-statut')?.addEventListener('change', (e) => {
      state.cycleFilter.statut = e.target.value;
      state.cyclesReady = false;
      withLoading(loadCycles);
    });
    document.getElementById('scope-idle-stay')?.addEventListener('click', () => {
      state.idleWarn = false;
      if (window.ScopeAuthIdle) window.ScopeAuthIdle.stayConnected();
      render();
    });
    document.getElementById('scope-logout')?.addEventListener('click', () => {
      logoutScopeSession();
    });
    document.getElementById('obj-add')?.addEventListener('click', () => {
      const period = L.yearToObjectifPeriod(state.objectifForm.annee || String(state.year || '2026'));
      state.objectifAction = 'create';
      state.objectifFocusId = null;
      state.objectifForm = Object.assign({}, state.objectifForm, period, {
        seuilPct: '',
        commentaire: '',
        cibleId: '',
        cibleCode: ''
      });
      render();
    });
    document.getElementById('obj-cancel')?.addEventListener('click', () => {
      state.objectifAction = null;
      state.objectifFocusId = null;
      render();
    });
    document.getElementById('obj-portee')?.addEventListener('change', (e) => {
      state.objectifForm.portee = e.target.value;
      render();
    });
    document.getElementById('obj-domaine')?.addEventListener('change', (e) => {
      state.objectifForm.domaineCode = e.target.value;
      state.objectifForm.cibleId = '';
      state.objectifForm.cibleCode = '';
      render();
    });
    document.getElementById('obj-cible')?.addEventListener('change', (e) => {
      state.objectifForm.cibleCode = e.target.value;
    });
    document.getElementById('obj-annee')?.addEventListener('change', (e) => {
      state.objectifForm.annee = e.target.value;
      Object.assign(state.objectifForm, L.yearToObjectifPeriod(e.target.value));
      render();
    });
    document.getElementById('obj-debut')?.addEventListener('change', (e) => {
      const next = L.periodFromStart(e.target.value);
      if (next.dateDebut) Object.assign(state.objectifForm, next);
      render();
    });
    document.getElementById('obj-fin')?.addEventListener('change', (e) => {
      const iso = L.toIsoDate(e.target.value);
      if (iso) state.objectifForm.dateFin = iso;
    });
    ['obj-filter-annee', 'obj-filter-portee', 'obj-filter-domaine', 'obj-filter-statut'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', (e) => {
        const key = id.replace('obj-filter-', '');
        state.objectifFilters[key] = e.target.value;
        render();
      });
    });
    document.getElementById('obj-preview-domaine')?.addEventListener('change', (e) => {
      state.objectifPreview.domaine = e.target.value;
      state.objectifPreview.cibleCode = '';
      state.objectifPreview.cibleId = '';
      state.objectifPreview.result = null;
      state.objectifPreview.looked = false;
      render();
    });
    document.getElementById('obj-preview-cible')?.addEventListener('change', (e) => {
      state.objectifPreview.cibleCode = e.target.value;
    });
    document.getElementById('obj-preview')?.addEventListener('click', () => {
      const date = L.toIsoDate((document.getElementById('obj-preview-date') || {}).value);
      const domaine = (document.getElementById('obj-preview-domaine') || {}).value;
      const cibleCode = (document.getElementById('obj-preview-cible') || {}).value;
      state.objectifPreview.date = date;
      state.objectifPreview.domaine = domaine;
      state.objectifPreview.cibleCode = cibleCode;
      if (!date) {
        toast('error', 'Action refusée', 'La date est obligatoire.');
        return;
      }
      const query = Object.assign({ date }, L.objectifPreviewQuery({ domaine, cibleCode }));
      withLoading(async () => {
        const data = await client.resolveObjectif(query);
        state.objectifPreview.result = data.objectif || null;
        state.objectifPreview.looked = true;
      }).then(() => {
        const card = document.getElementById('obj-applique-result');
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card.focus();
        }
      });
    });
    root.querySelectorAll('[data-obj-more]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-obj-more');
        state.objectifMenuId = state.objectifMenuId === id ? null : id;
        render();
      });
    });
    root.querySelectorAll('[data-obj-edit]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-obj-edit');
        const row = state.objectifs.find((item) => item.objectifId === id);
        state.objectifMenuId = null;
        state.objectifAction = 'edit';
        state.objectifFocusId = id;
        fillObjectifFormFromRow(row);
        render();
      });
    });
    root.querySelectorAll('[data-obj-supprimer]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-obj-supprimer');
        state.objectifMenuId = null;
        state.objectifAction = 'supprimer';
        state.objectifFocusId = id;
        render();
      });
    });
    root.querySelectorAll('[data-obj-protege]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-obj-protege');
        state.objectifMenuId = null;
        state.objectifAction = 'protege';
        state.objectifFocusId = id;
        render();
      });
    });
    document.getElementById('obj-delete-confirm')?.addEventListener('click', () => {
      const id = state.objectifFocusId;
      withLoading(async () => {
        await client.deleteObjectif(id);
        state.objectifAction = null;
        state.objectifFocusId = null;
        await loadObjectifs();
        clearToast();
        toast('success', 'Objectif supprimé', 'L’objectif futur a été retiré.');
      });
    });
    root.querySelectorAll('[data-obj-cloturer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.objectifAction = 'cloturer';
        state.objectifFocusId = btn.getAttribute('data-obj-cloturer');
        const row = state.objectifs.find((item) => item.objectifId === state.objectifFocusId);
        state.objectifForm.dateFin = row && row.dateDebut ? row.dateDebut : '';
        render();
      });
    });
    root.querySelectorAll('[data-obj-periode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.objectifAction = 'periode';
        state.objectifFocusId = btn.getAttribute('data-obj-periode');
        const row = state.objectifs.find((item) => item.objectifId === state.objectifFocusId);
        const next = L.nextObjectifPeriod(row);
        state.objectifForm.seuilPct = row ? String(row.thresholdPct) : '';
        state.objectifForm.dateDebut = next.dateDebut;
        state.objectifForm.dateFin = next.dateFin;
        render();
      });
    });
    document.getElementById('obj-periode-debut')?.addEventListener('change', (e) => {
      const next = L.periodFromStart(e.target.value);
      if (next.dateDebut) Object.assign(state.objectifForm, next);
      render();
    });
    document.getElementById('obj-periode-fin')?.addEventListener('change', (e) => {
      const iso = L.toIsoDate(e.target.value);
      if (iso) state.objectifForm.dateFin = iso;
    });
    document.getElementById('obj-save')?.addEventListener('click', () => {
      const portee = (document.getElementById('obj-portee') || {}).value;
      const domaineCode = (document.getElementById('obj-domaine') || {}).value;
      const cibleCode = (document.getElementById('obj-cible') || {}).value;
      const seuilPct = Number((document.getElementById('obj-seuil') || {}).value);
      const dateDebut = L.toIsoDate((document.getElementById('obj-debut') || {}).value);
      const dateFinRaw = (document.getElementById('obj-fin') || {}).value;
      const dateFin = dateFinRaw ? L.toIsoDate(dateFinRaw) : null;
      if (!Number.isFinite(seuilPct) || seuilPct < 0 || seuilPct > 100) {
        toast('error', 'Action refusée', 'L’objectif de participation doit être compris entre 0 et 100 %.');
        return;
      }
      if (!dateDebut) {
        toast('error', 'Action refusée', 'La date de début est obligatoire.');
        return;
      }
      if (dateFinRaw && !dateFin) {
        toast('error', 'Action refusée', 'La date de fin est invalide.');
        return;
      }
      if (dateFin && dateFin < dateDebut) {
        toast('error', 'Action refusée', 'La date de fin doit être postérieure à la date de début.');
        return;
      }
      if (portee !== 'GLOBAL' && !domaineCode) {
        toast('error', 'Action refusée', 'Le domaine est obligatoire pour cette portée.');
        return;
      }
      if (portee === 'CIBLE' && !cibleCode) {
        toast('error', 'Action refusée', 'La cible est obligatoire pour cette portée.');
        return;
      }
      const mapped = L.objectifFormToEngine({
        portee,
        domaineCode,
        cibleCode
      }, state.referentiels.cibles);
      if (portee === 'CIBLE' && !mapped.cibleId && mapped.portee === 'CIBLE') {
        toast('error', 'Action refusée', 'La cible est obligatoire pour cette portée.');
        return;
      }
      const payload = {
        portee: mapped.portee,
        domaineCode: mapped.domaineCode,
        cibleId: mapped.cibleId,
        seuilPct,
        dateDebut,
        dateFin,
        commentaire: (document.getElementById('obj-commentaire') || {}).value
      };
      withLoading(async () => {
        if (state.objectifAction === 'edit' && state.objectifFocusId) {
          await client.patchObjectif(state.objectifFocusId, payload);
        } else {
          await client.createObjectif(payload);
        }
        state.objectifAction = null;
        state.objectifFocusId = null;
        await loadObjectifs();
        clearToast();
        toast('success', 'Objectif enregistré', 'La nouvelle période est active pour les analyses et rapports SCOPE.');
      });
    });
    document.getElementById('obj-cloture-save')?.addEventListener('click', () => {
      const id = state.objectifFocusId;
      const dateFin = L.toIsoDate((document.getElementById('obj-cloture-date') || {}).value);
      if (!dateFin) {
        toast('error', 'Action refusée', 'La date de clôture est obligatoire.');
        return;
      }
      withLoading(async () => {
        await client.cloturerObjectif(id, { dateFin });
        state.objectifAction = null;
        state.objectifFocusId = null;
        await loadObjectifs();
        clearToast();
        toast('success', 'Période clôturée', 'L’historique conserve ce seuil jusqu’à la date de fin.');
      });
    });
    document.getElementById('obj-periode-save')?.addEventListener('click', () => {
      const id = state.objectifFocusId;
      const dateDebut = L.toIsoDate((document.getElementById('obj-periode-debut') || {}).value);
      const dateFinRaw = (document.getElementById('obj-periode-fin') || {}).value;
      const dateFin = dateFinRaw ? L.toIsoDate(dateFinRaw) : null;
      if (!dateDebut) {
        toast('error', 'Action refusée', 'La date de début de la nouvelle période est obligatoire.');
        return;
      }
      if (dateFinRaw && !dateFin) {
        toast('error', 'Action refusée', 'La date de fin est invalide.');
        return;
      }
      withLoading(async () => {
        await client.nouvellePeriodeObjectif(id, {
          dateDebut,
          seuilPct: document.getElementById('obj-periode-seuil').value,
          dateFin
        });
        state.objectifAction = null;
        state.objectifFocusId = null;
        await loadObjectifs();
        clearToast();
        toast('success', 'Objectif enregistré', 'La nouvelle période est active pour les analyses et rapports SCOPE.');
      });
    });
    document.getElementById('scope-new')?.addEventListener('click', () => go('#/exercices/nouveau'));
    const eventListSearch = document.getElementById('event-list-q');
    if (eventListSearch) {
      eventListSearch.addEventListener('input', (e) => {
        const el = e.target;
        const pos = el.selectionStart;
        state.eventListQuery = el.value;
        state.eventListPage = 1;
        render();
        const next = document.getElementById('event-list-q');
        if (next) {
          next.focus();
          try { next.setSelectionRange(pos, pos); } catch (_err) {}
        }
      });
    }
    document.getElementById('event-page-size')?.addEventListener('change', (e) => {
      const n = Number(e.target.value);
      state.eventListPageSize = EVENT_LIST_PAGE_SIZES.indexOf(n) >= 0 ? n : 12;
      state.eventListPage = 1;
      render();
    });
    document.getElementById('event-page-prev')?.addEventListener('click', () => {
      state.eventListPage = Math.max(1, (Number(state.eventListPage) || 1) - 1);
      render();
    });
    document.getElementById('event-page-next')?.addEventListener('click', () => {
      state.eventListPage = (Number(state.eventListPage) || 1) + 1;
      render();
    });
    document.getElementById('scope-import-preview')?.addEventListener('click', () => {
      withLoading(async () => {
        state.importRapport = null;
        state.importPreview = await client.previewImportEvenements({
          csvText: state.importFile.csvText,
          filename: state.importFile.filename,
          decisions: state.importDecisions
        });
        state.importExcluded = {};
        const preview = state.importPreview || {};
        const standard = preview.format === 'SCOPE_EVENT_STANDARD_CSV_1' || preview.profil === 'SCOPE_EVENT_STANDARD_CSV_1';
        state.importFilter = defaultImportFilter(buildImportFilters({
          standard,
          all: preview.lignes || [],
          groups: preview.groups || []
        }));
      });
    });
    document.getElementById('scope-import-commit')?.addEventListener('click', () => {
      const excludedLineNos = Object.keys(state.importExcluded).filter((k) => state.importExcluded[k]).map(Number);
      withLoading(async () => {
        try {
          state.importCommitProgress = { title: 'Import du programme en cours', phase: 'Préparation...' };
          render();
          state.importCommitProgress = { title: 'Import du programme en cours', phase: 'Création des événements et constitution des populations...' };
          render();
          state.importRapport = await client.commitImportEvenements({
            csvText: state.importFile.csvText,
            filename: state.importFile.filename,
            excludedLineNos,
            previewToken: state.importPreview && state.importPreview.previewToken,
            decisions: state.importDecisions
          });
          state.importCommitProgress = { title: 'Import du programme en cours', phase: 'Finalisation...' };
          render();
          await loadList();
          toast('success', 'Programme importé', `${state.importRapport.summary.imported} événement(s) créé(s).`);
        } finally {
          state.importCommitProgress = null;
        }
      });
    });
    document.getElementById('scope-import-file')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) readImportFile(file);
    });
    const drop = document.getElementById('scope-import-drop');
    if (drop) {
      drop.addEventListener('dragover', (e) => { e.preventDefault(); state.importFile.drag = true; drop.classList.add('is-drag'); });
      drop.addEventListener('dragleave', () => { state.importFile.drag = false; drop.classList.remove('is-drag'); });
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        state.importFile.drag = false;
        drop.classList.remove('is-drag');
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) readImportFile(file);
      });
    }
    root.querySelectorAll('[data-exclude-line]').forEach((input) => {
      input.addEventListener('change', () => {
        const no = Number(input.getAttribute('data-exclude-line'));
        state.importExcluded[no] = input.checked;
        render();
      });
    });
    root.querySelectorAll('[data-import-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.importFilter = btn.getAttribute('data-import-filter');
        render();
      });
    });
    root.querySelectorAll('[data-import-decision]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const no = Number(sel.getAttribute('data-import-decision'));
        state.importDecisions[no] = { mode: sel.value || null };
        withLoading(async () => {
          state.importPreview = await client.previewImportEvenements({
            csvText: state.importFile.csvText,
            filename: state.importFile.filename,
            decisions: state.importDecisions
          });
        });
      });
    });
    document.getElementById('new-domaine')?.addEventListener('change', (e) => {
      state.domaineForm = e.target.value;
      state.cibleForm = [];
      state.modeTouched = false;
      withLoading(async () => { await refreshModeSuggestion(); });
    });
    document.getElementById('new-date')?.addEventListener('change', (e) => {
      state.dateForm = e.target.value;
      state.modeTouched = false;
      withLoading(async () => { await refreshModeSuggestion(); });
    });
    document.getElementById('new-libelle')?.addEventListener('input', (e) => {
      state.libelleForm = e.target.value;
    });
    document.querySelectorAll('#new-cibles input[type="checkbox"]').forEach((box) => {
      box.addEventListener('change', () => {
        state.cibleForm = [...document.querySelectorAll('#new-cibles input:checked')].map((n) => n.value);
        state.modeTouched = false;
        withLoading(async () => { await refreshModeSuggestion(); });
      });
    });
    document.querySelectorAll('input[name="new-mode"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        state.modeTouched = true;
        state.modeChoice = radio.value;
      });
    });
    document.getElementById('new-save')?.addEventListener('click', () => {
      const date = document.getElementById('new-date').value;
      const domaineCode = document.getElementById('new-domaine').value;
      const libelle = document.getElementById('new-libelle').value;
      const cibleIds = [...document.querySelectorAll('#new-cibles input:checked')].map((n) => n.value);
      const modeSuivi = (document.querySelector('input[name="new-mode"]:checked') || {}).value;
      withLoading(async () => {
        if (!date || !libelle || !cibleIds.length) {
          throw { status: 422, error: 'incomplet', message: 'Date, domaine, au moins une cible et un libellé sont requis.' };
        }
        if (!modeSuivi) {
          throw { status: 422, error: 'mode_requis', message: 'Choisissez le mode de suivi : Nominatif ou Quantitatif.' };
        }
        const created = await client.createEvenement({ date, domaineCode, libelle, cibleIds, modeSuivi });
        state.modeTouched = false;
        state.modeChoice = '';
        state.cibleForm = [];
        state.libelleForm = '';
        go(`#/exercices/${created.evenement.evenement_id}`);
      });
    });
    root.querySelector('[data-cta="generer"]')?.addEventListener('click', () => {
      const id = route().id;
      withLoading(async () => {
        state.preview = await client.previewAttendus(id);
        state.pendingRetraits = [];
        state.pendingExceptions = [];
      });
    });
    root.querySelector('[data-cta="figer"]')?.addEventListener('click', () => {
      const id = route().id;
      withLoading(async () => {
        let version = state.fiche.evenement.version;
        const frozen = await client.figer(id, version);
        version = frozen.version;
        for (const personneId of state.pendingRetraits) {
          const res = await client.retirerAttendu(id, { personneId }, version);
          version = res.version;
        }
        for (const person of state.pendingExceptions) {
          const res = await client.ajouterException(id, { personneId: person.personneId, role: 'RENFORT' }, version);
          version = res.version;
        }
        state.preview = null;
        await loadFiche(id);
        toast('success', 'Population figée', 'Vous pouvez saisir les participations.');
      });
    });
    root.querySelector('[data-cta="saisir"]')?.addEventListener('click', () => go(`#/exercices/${route().id}/saisie`));
    root.querySelector('[data-cta="saisir-volumes"]')?.addEventListener('click', () => go(`#/exercices/${route().id}/saisie`));
    document.getElementById('convert-nominatif')?.addEventListener('click', () => { state.modal = 'convert-nominatif'; render(); });
    document.getElementById('convert-cancel')?.addEventListener('click', () => { state.modal = null; render(); });
    document.getElementById('convert-ok')?.addEventListener('click', () => {
      const id = route().id;
      withLoading(async () => {
        await client.convertirNominatif(id, { confirmation: true }, state.fiche.evenement.version);
        state.modal = null;
        await loadFiche(id);
        toast('success', 'Mode nominatif', 'Les volumes ont été supprimés. Vous pouvez générer la population.');
      });
    });
    document.getElementById('edit-event')?.addEventListener('click', () => openEditEventModal());
    document.getElementById('postpone-event')?.addEventListener('click', () => {
      openEditEventModal();
      if (state.editEventForm) {
        state.editEventForm.statut = 'REPORTE';
        state.modal = 'postpone-event';
        render();
      }
    });
    document.getElementById('edit-event-cancel')?.addEventListener('click', () => { state.modal = null; render(); });
    document.getElementById('edit-event-cibles')?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!state.editEventForm) return;
        state.editEventForm.cibleIds = [...document.getElementById('edit-event-cibles').querySelectorAll('input:checked')].map((el) => el.value);
      });
    });
    ['edit-event-libelle', 'edit-event-date', 'edit-event-debut', 'edit-event-fin', 'edit-event-statut', 'edit-event-motif'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', (e) => {
        if (!state.editEventForm) return;
        const map = {
          'edit-event-libelle': 'libelle',
          'edit-event-date': 'date',
          'edit-event-debut': 'heureDebut',
          'edit-event-fin': 'heureFin',
          'edit-event-statut': 'statut',
          'edit-event-motif': 'motif'
        };
        state.editEventForm[map[id]] = e.target.value;
      });
      document.getElementById(id)?.addEventListener('change', (e) => {
        if (!state.editEventForm) return;
        const map = {
          'edit-event-libelle': 'libelle',
          'edit-event-date': 'date',
          'edit-event-debut': 'heureDebut',
          'edit-event-fin': 'heureFin',
          'edit-event-statut': 'statut',
          'edit-event-motif': 'motif'
        };
        state.editEventForm[map[id]] = e.target.value;
      });
    });
    document.getElementById('edit-event-ok')?.addEventListener('click', () => {
      const id = route().id;
      const form = state.editEventForm || {};
      const cibleIds = form.cibleIds || [];
      if (!cibleIds.length) {
        toast('error', 'Cible obligatoire', 'Choisissez au moins une cible.');
        return;
      }
      if (form.statut === 'REPORTE' && !String(form.motif || '').trim()) {
        toast('error', 'Motif obligatoire', 'Indiquez le motif du report.');
        return;
      }
      withLoading(async () => {
        const payload = form.statut === 'REPORTE' ? {
          date: form.date,
          heureDebut: form.heureDebut || null,
          heureFin: form.heureFin || null,
          statut: 'REPORTE',
          motif: form.motif,
          confirmPopulationImpact: Boolean(form.confirmed)
        } : {
          libelle: form.libelle,
          date: form.date,
          heureDebut: form.heureDebut || null,
          heureFin: form.heureFin || null,
          cibleIds,
          statut: form.statut,
          motif: form.motif,
          confirmPopulationImpact: Boolean(form.confirmed)
        };
        if (client.previewModifierEvenement && !form.confirmed) {
          const preview = await client.previewModifierEvenement(id, payload);
          const hors = (preview.impact && preview.impact.horsPopulation) || [];
          if (hors.length) {
            state.editEventForm.warning = hors.length === 1
              ? 'Une personne déjà prévue ne correspond plus à la nouvelle date ou cible. Ses présences seront conservées.'
              : `${hors.length} personnes déjà prévues ne correspondent plus à la nouvelle date ou cible. Leurs présences seront conservées.`;
            state.editEventForm.confirmed = true;
            render();
            return;
          }
        }
        await client.patchEvenement(id, payload, state.fiche.evenement.version);
        state.modal = null;
        await loadFiche(id);
        toast('success', 'Événement mis à jour', 'Les modifications ont été enregistrées.');
      });
    });
    bindQuantitatifSaisie();
    document.getElementById('preview-q')?.addEventListener('input', (e) => {
      state.personQuery = e.target.value;
      const q = state.personQuery.trim();
      if (q.length < SCOPE_SEARCH_MIN_CHARS) { state.personHits = []; render(); return; }
      withLoading(async () => {
        const data = await client.listPersonnes(q);
        state.personHits = data.personnes || [];
      });
    });
    root.querySelectorAll('[data-add-ex]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-add-ex');
        const person = state.personHits.find((p) => p.personne_id === id);
        if (!person) return;
        if (state.pendingExceptions.some((p) => p.personneId === id)) return;
        state.pendingExceptions.push({
          personneId: id, nom: person.nom, prenom: person.prenom, nip: person.nip, cibles: [], motifInclusion: 'exception_ajout'
        });
        state.personHits = [];
        state.personQuery = '';
        render();
      });
    });
    root.querySelectorAll('[data-retrait]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-retrait');
        state.pendingExceptions = state.pendingExceptions.filter((p) => p.personneId !== id);
        if (!state.pendingRetraits.includes(id)) state.pendingRetraits.push(id);
        render();
      });
    });
    document.getElementById('all-present')?.addEventListener('click', () => {
      const visible = visibleSaisie();
      if (L.needsConfirmAllPresent(visible)) {
        state.modal = 'all-present';
        render();
        return;
      }
      applyPresent();
      setUnsavedPresenceChanges(true);
    });
    document.getElementById('reset-saisie')?.addEventListener('click', () => {
      if (L.needsConfirmReset && L.needsConfirmReset(state.saisie, (state.fiche && state.fiche.encadrement) || [])) {
        ScopeFeedback.confirm({
          title: 'Réinitialiser la saisie',
          message: 'Les présences, justificatifs et l’encadrement de cet événement seront effacés. La population convoquée restera inchangée.',
          confirmText: 'Réinitialiser',
          cancelText: 'Annuler'
        }, () => resetSaisie());
        return;
      }
      resetSaisie();
    });
    document.getElementById('all-present-ok')?.addEventListener('click', () => { state.modal = null; applyPresent(); setUnsavedPresenceChanges(true); });
    document.getElementById('all-present-cancel')?.addEventListener('click', () => { state.modal = null; render(); });
    document.getElementById('reset-saisie-ok')?.addEventListener('click', () => { state.modal = null; resetSaisie(); });
    document.getElementById('reset-saisie-cancel')?.addEventListener('click', () => { state.modal = null; render(); });
    root.querySelectorAll('[data-status-group]').forEach((group) => {
      const openGroup = () => {
        group.classList.remove('is-compact');
        group.classList.add('is-open');
      };
      group.addEventListener('focusin', openGroup);
      group.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (group.classList.contains('is-compact')) {
            e.preventDefault();
            openGroup();
          }
        }
      });
    });
    root.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const group = btn.closest('[data-status-group]');
        const selected = btn.getAttribute('aria-checked') === 'true';
        if (group && group.classList.contains('is-compact') && selected) {
          e.preventDefault();
          group.classList.remove('is-compact');
          group.classList.add('is-open');
          return;
        }
        const pid = btn.closest('[data-pid]').getAttribute('data-pid');
        const statut = btn.getAttribute('data-status');
        const idx = state.saisie.findIndex((r) => r.personneId === pid);
        const row = idx >= 0 ? state.saisie[idx] : null;
        if (!row || (L.statusLockedForRole && L.statusLockedForRole(row.role)) || (L.sessionLocked && L.sessionLocked(row))) return;
        state.saisie[idx] = L.applyParticipationStatus(row, statut);
        if (state.saisie[idx]) state.saisie[idx].editMotif = false;
        setUnsavedPresenceChanges(true);
        render();
      });
    });
    root.querySelectorAll('[data-motif-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.closest('[data-pid]').getAttribute('data-pid');
        const idx = state.saisie.findIndex((r) => r.personneId === pid);
        if (idx < 0) return;
        if (L.sessionLocked && L.sessionLocked(state.saisie[idx])) return;
        state.saisie[idx] = L.applyExcuseMotif(state.saisie[idx], btn.getAttribute('data-motif-chip'));
        setUnsavedPresenceChanges(true);
        render();
      });
    });
    root.querySelectorAll('[data-motif]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const pid = sel.closest('[data-pid]').getAttribute('data-pid');
        const idx = state.saisie.findIndex((r) => r.personneId === pid);
        const row = idx >= 0 ? state.saisie[idx] : null;
        if (row && !(L.sessionLocked && L.sessionLocked(row))) {
          state.saisie[idx] = L.applyExcuseMotif(row, sel.value);
          if (state.saisie[idx]) state.saisie[idx].editMotif = false;
          setUnsavedPresenceChanges(true);
          render();
        }
      });
    });
    root.querySelectorAll('[data-dispense-motif]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const pid = sel.closest('[data-pid]').getAttribute('data-pid');
        const idx = state.saisie.findIndex((r) => r.personneId === pid);
        const row = idx >= 0 ? state.saisie[idx] : null;
        if (row && L.applyDispenseMotif && !(L.sessionLocked && L.sessionLocked(row))) {
          state.saisie[idx] = L.applyDispenseMotif(row, sel.value);
          if (state.saisie[idx]) state.saisie[idx].editMotif = false;
          setUnsavedPresenceChanges(true);
          render();
        }
      });
    });
    root.querySelectorAll('[data-motif-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = state.saisie.find((r) => r.personneId === btn.getAttribute('data-motif-edit'));
        if (row && !(L.sessionLocked && L.sessionLocked(row))) { row.editMotif = true; render(); }
      });
    });
    root.querySelectorAll('[data-comment]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const pid = inp.closest('[data-pid]').getAttribute('data-pid');
        const row = state.saisie.find((r) => r.personneId === pid);
        if (row && !(L.sessionLocked && L.sessionLocked(row))) {
          row.commentaire = inp.value;
          setUnsavedPresenceChanges(true);
        }
      });
    });
    root.querySelectorAll('[data-cible-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.cibleFilter = btn.getAttribute('data-cible-filter');
        render();
      });
    });
    root.querySelectorAll('[data-saisie-open-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.saisieOpenFilter = btn.getAttribute('data-saisie-open-filter') === 'open';
        render();
      });
    });
    root.querySelectorAll('tr.scope-row-has-tooltip').forEach((row) => {
      const tip = row.querySelector('.scope-session-counted-tooltip');
      if (!tip || !L.placeSessionTooltip) return;
      const place = () => L.placeSessionTooltip(row, tip);
      row.addEventListener('mouseenter', place);
      row.addEventListener('focusin', place);
      row.addEventListener('mouseleave', () => { tip.style.visibility = ''; });
      row.addEventListener('focusout', () => { tip.style.visibility = ''; });
    });
    document.getElementById('save-part')?.addEventListener('click', () => saveParticipations());
    document.getElementById('scope-saisie-back')?.addEventListener('click', () => requestLeaveSaisie('#/exercices'));
    document.getElementById('scope-saisie-leave-cancel')?.addEventListener('click', () => {
      state.modal = null;
      state.saisieGuard.pendingHash = '';
      render();
    });
    document.getElementById('scope-saisie-leave-discard')?.addEventListener('click', () => {
      const target = state.saisieGuard.pendingHash || '#/exercices';
      setUnsavedPresenceChanges(false);
      state.modal = null;
      state.saisieGuard.allowLeave = true;
      state.saisieGuard.pendingHash = '';
      location.hash = target;
    });
    document.getElementById('scope-saisie-leave-save')?.addEventListener('click', () => {
      finishLeaveSaisie('save');
    });
    document.getElementById('cloturer')?.addEventListener('click', () => onCloturerClick());
    document.getElementById('cloture-incomplete-show')?.addEventListener('click', () => {
      state.modal = null;
      state.saisieOpenFilter = true;
      render();
      const target = document.getElementById('scope-saisie-presences');
      if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
    });
    document.getElementById('cloture-incomplete-cancel')?.addEventListener('click', () => { state.modal = null; state.clotureIncompletePeople = []; render(); });
    document.getElementById('enc-role')?.addEventListener('change', (e) => {
      state.encRole = e.target.value || 'FORMATEUR';
      if (state.encRole !== 'FORMATEUR') state.encSerieComplete = false;
      render();
    });
    document.getElementById('enc-add')?.addEventListener('click', () => {
      if (state.encHits.length === 1) addEncadrement(state.encHits[0].personne_id);
    });
    document.getElementById('enc-serie-complete')?.addEventListener('click', () => {
      state.encSerieComplete = !state.encSerieComplete;
      render();
    });
    document.getElementById('enc-q')?.addEventListener('input', (e) => {
      searchPersonnes(e.target.value, 'encadrement');
    });
    document.getElementById('manual-person-q')?.addEventListener('input', (e) => {
      searchPersonnes(e.target.value, 'manual');
    });
    document.getElementById('realise-q')?.addEventListener('input', (e) => {
      state.realiseQuery = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const node = document.getElementById('realise-q');
      if (node) {
        node.focus();
        try { node.setSelectionRange(pos, pos); } catch (_error) { /* ignore */ }
      }
    });
    document.getElementById('realise-grade')?.addEventListener('change', (e) => { state.realiseGrade = e.target.value; render(); });
    document.getElementById('realise-oi')?.addEventListener('change', (e) => { state.realiseOi = e.target.value; render(); });
    document.getElementById('realise-cible')?.addEventListener('change', (e) => { state.realiseCible = e.target.value; render(); });
    document.getElementById('realise-statut')?.addEventListener('change', (e) => { state.realiseStatut = e.target.value; render(); });
    document.getElementById('realise-filters-reset')?.addEventListener('click', () => {
      state.realiseQuery = '';
      state.realiseGrade = '';
      state.realiseOi = '';
      state.realiseCible = '';
      state.realiseStatut = '';
      render();
    });
    root.querySelectorAll('[data-enc-add]').forEach((btn) => {
      btn.addEventListener('click', () => addEncadrement(btn.getAttribute('data-enc-add')));
    });
    root.querySelectorAll('[data-enc-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const personneId = btn.getAttribute('data-enc-remove');
        const role = currentEncadrementRole(personneId);
        const labels = role === 'FORMATEUR' ? formateurSeriesLabelsFor(personneId) : [];
        if (role === 'FORMATEUR' && labels.length > 1) {
          state.encRetrait = { personneId, labels };
          render();
          return;
        }
        removeEncadrement(personneId, 'SESSION');
      });
    });
    document.getElementById('enc-remove-session')?.addEventListener('click', () => {
      const personneId = state.encRetrait && state.encRetrait.personneId;
      state.encRetrait = null;
      if (personneId) removeEncadrement(personneId, 'SESSION');
    });
    document.getElementById('enc-remove-serie')?.addEventListener('click', () => {
      const personneId = state.encRetrait && state.encRetrait.personneId;
      state.encRetrait = null;
      if (personneId) removeEncadrement(personneId, 'SERIE');
    });
    document.getElementById('enc-remove-cancel')?.addEventListener('click', () => {
      state.encRetrait = null;
      render();
    });
    root.querySelectorAll('[data-manual-add]').forEach((btn) => {
      btn.addEventListener('click', () => addManualParticipant(btn.getAttribute('data-manual-add')));
    });
    root.querySelectorAll('[data-manual-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const personneId = btn.getAttribute('data-manual-remove');
        ScopeFeedback.confirm({
          title: 'Retirer l’ajout manuel',
          message: 'Cette personne sera retirée uniquement de la population de cet événement.',
          confirmText: 'Retirer',
          cancelText: 'Annuler'
        }, () => removeManualParticipant(personneId));
      });
    });
    bindReports();
    bindPersonnelSync();
    document.getElementById('reopen')?.addEventListener('click', () => { state.modal = 'reopen'; render(); });
    document.getElementById('reopen-cancel')?.addEventListener('click', () => { state.modal = null; render(); });
    document.getElementById('cancel-event')?.addEventListener('click', () => { state.modal = 'cancel-event'; render(); });
    document.getElementById('cancel-dismiss')?.addEventListener('click', () => { state.modal = null; render(); });
    document.getElementById('cancel-ok')?.addEventListener('click', () => {
      const motif = document.getElementById('cancel-motif').value;
      if (!String(motif || '').trim()) {
        toast('error', 'Motif obligatoire', 'Indiquez le motif de l’annulation.');
        return;
      }
      const id = route().id;
      withLoading(async () => {
        await client.annuler(id, motif, state.fiche.evenement.version);
        state.modal = null;
        await loadFiche(id);
      });
    });
    document.getElementById('reopen-ok')?.addEventListener('click', () => {
      const motif = document.getElementById('reopen-motif').value;
      const id = route().id;
      withLoading(async () => {
        await client.reouvrir(id, motif, state.fiche.evenement.version);
        state.modal = null;
        await loadFiche(id);
        go(`#/exercices/${id}`);
      });
    });
  }

  function bindReports() {
    document.getElementById('report-kind')?.addEventListener('change', (e) => {
      state.reportForm.kind = e.target.value;
      if (state.reportForm.kind === 'DOMAIN' && !['DPS', 'DAP', 'JSP'].includes(state.reportForm.domaine)) {
        state.reportForm.domaine = 'DPS';
      }
      render();
    });
    document.getElementById('report-domaine')?.addEventListener('change', (e) => {
      state.reportForm.domaine = e.target.value;
      const first = (state.referentiels.cibles || []).find((c) => c.domaineCode === state.reportForm.domaine);
      state.reportForm.cible = first ? first.niveauCode : '';
      render();
    });
    document.getElementById('report-cible')?.addEventListener('change', (e) => {
      state.reportForm.cible = e.target.value;
    });
    document.getElementById('report-event')?.addEventListener('change', (e) => {
      state.reportForm.evenementId = e.target.value;
    });
    document.getElementById('report-generate')?.addEventListener('click', () => generateCurrentReport());
    document.getElementById('participation-report-domain')?.addEventListener('change', (e) => {
      state.participationReportDomain = e.target.value || 'JSP';
      state.participationReportSubdomain = '';
      state.participationReportSpecialisation = 'GEN';
      state.jspReportSite = 'TOUS';
      state.jspReport = null;
      state.jspReportReady = false;
      state.jspReportError = null;
      render();
      loadJspReport().then(() => render()).catch(() => render());
    });
    document.getElementById('participation-report-subdomain')?.addEventListener('change', (e) => {
      state.participationReportSubdomain = e.target.value || '';
      state.participationReportSpecialisation = state.participationReportSubdomain === 'AUTO' ? 'VL' : 'GEN';
      state.jspReportSite = 'TOUS';
      state.jspReport = null;
      state.jspReportReady = false;
      state.jspReportError = null;
      render();
      loadJspReport().then(() => render()).catch(() => render());
    });
    document.getElementById('participation-report-specialisation')?.addEventListener('change', (e) => {
      state.participationReportSpecialisation = e.target.value || '';
      if (state.participationReportSpecialisation === 'PL' && /^Y[1-4]$/.test(String(state.jspReportSite || ''))) state.jspReportSite = 'TOUS';
      state.jspReport = null;
      state.jspReportReady = false;
      state.jspReportError = null;
      render();
      loadJspReport().then(() => render()).catch(() => render());
    });
    document.getElementById('jsp-report-site')?.addEventListener('change', (e) => {
      state.jspReportSite = e.target.value || 'TOUS';
      state.jspReport = null;
      state.jspReportReady = false;
      state.jspReportError = null;
      render();
      loadJspReport().then(() => render()).catch(() => render());
    });
    root.querySelectorAll('[data-participation-block]').forEach((input) => {
      input.addEventListener('change', () => {
        const selected = [...root.querySelectorAll('[data-participation-block]:checked')].map((node) => node.getAttribute('data-participation-block')).filter(Boolean);
        state.participationReportBlocks = selected.length ? selected : ['synthese'];
        state.jspReport = null;
        state.jspReportReady = false;
        render();
        loadJspReport().then(() => render()).catch(() => render());
      });
    });
    document.getElementById('jsp-report-pdf')?.addEventListener('click', () => generateJspReportPdf());
    document.getElementById('formation-report-pdf')?.addEventListener('click', () => generateFormationReportPdf());
    root.querySelectorAll('[data-report-event]').forEach((btn) => {
      btn.addEventListener('click', () => generateEventReport(btn.getAttribute('data-report-event')));
    });
    root.querySelectorAll('[data-report-session]').forEach((btn) => {
      btn.addEventListener('click', () => generateSessionReport(btn.getAttribute('data-report-session')));
    });
  }

  function bindPersonnelSync() {
    const dateInput = document.getElementById('scope-sync-date');
    dateInput?.addEventListener('change', (e) => {
      state.personnelSync.dateEffet = e.target.value;
    });
    document.getElementById('scope-sync-context')?.addEventListener('change', (e) => {
      state.personnelSync.contexte = e.target.value;
      if (!personnelImportRequiresSite(state.personnelSync.contexte)) state.personnelSync.siteJsp = '';
      state.personnelSync.preview = null;
      render();
    });
    document.getElementById('scope-sync-site')?.addEventListener('change', (e) => {
      state.personnelSync.siteJsp = e.target.value;
      state.personnelSync.preview = null;
      render();
    });
    document.getElementById('scope-sync-year')?.addEventListener('change', (e) => {
      state.personnelSync.anneeMonitoring = e.target.value;
    });
    document.getElementById('scope-sync-preview')?.addEventListener('click', () => {
      withLoading(async () => {
        toast('info', 'Analyse du fichier en cours…', 'Aucune écriture DB ne sera effectuée.');
        state.personnelSync.rapport = null;
        state.personnelSync.preview = await client.previewPersonnelSync({
          csvText: state.personnelSync.csvText,
          filename: state.personnelSync.filename,
          dateEffetGlobale: state.personnelSync.dateEffet || undefined,
          contexte: state.personnelSync.contexte,
          importType: state.personnelSync.contexte,
          siteJsp: state.personnelSync.siteJsp || undefined,
          anneeMonitoring: Number(state.personnelSync.anneeMonitoring) || new Date().getFullYear()
        });
        const display = personnelDisplay();
        state.personnelSync.filter = display && display.defaultImportFilter
          ? display.defaultImportFilter(state.personnelSync.preview)
          : 'CHANGEMENTS';
        state.personnelSync.decisions = display && display.seedPersonnelImportDecisions
          ? display.seedPersonnelImportDecisions(state.personnelSync.preview, {}, state.personnelSync.dateEffet)
          : {};
        state.personnelSync.commitPayload = null;
        toast('success', 'Analyse terminée', 'Prévisualisation disponible. Aucune écriture DB effectuée.');
      });
    });
    document.getElementById('scope-sync-apply-all')?.addEventListener('click', () => {
      const display = personnelDisplay();
      if (display && display.applyMassPersonnelImportDecision) {
        state.personnelSync.decisions = display.applyMassPersonnelImportDecision(
          state.personnelSync.preview,
          state.personnelSync.decisions,
          'APPLIQUER',
          state.personnelSync.dateEffet
        );
      }
      render();
    });
    document.getElementById('scope-sync-ignore-all')?.addEventListener('click', () => {
      const display = personnelDisplay();
      if (display && display.applyMassPersonnelImportDecision) {
        state.personnelSync.decisions = display.applyMassPersonnelImportDecision(
          state.personnelSync.preview,
          state.personnelSync.decisions,
          'IGNORER',
          state.personnelSync.dateEffet
        );
      }
      render();
    });
    document.getElementById('scope-sync-commit')?.addEventListener('click', () => {
      const preview = state.personnelSync.preview;
      const display = personnelDisplay();
      const date = state.personnelSync.dateEffet || '';
      const decisions = display && display.personnelImportCommitDecisions
        ? display.personnelImportCommitDecisions(preview, state.personnelSync.decisions, date)
        : [];
      const appliedCount = display && display.personnelImportAppliedMutationCount
        ? display.personnelImportAppliedMutationCount(preview, state.personnelSync.decisions, date)
        : decisions.filter((item) => {
          const d = String(item.decision || '').toUpperCase();
          return d === 'APPLIQUER' || d === 'CREER';
        }).length;
      state.personnelSync.commitPayload = { decisions, appliedCount };
      state.modal = 'personnel-sync';
      render();
    });
    document.getElementById('scope-sync-commit-cancel')?.addEventListener('click', () => {
      state.modal = null;
      render();
    });
    document.getElementById('scope-sync-commit-ok')?.addEventListener('click', () => {
      const preview = state.personnelSync.preview;
      const decisions = (state.personnelSync.commitPayload && state.personnelSync.commitPayload.decisions) || [];
      withLoading(async () => {
        toast('info', 'Import en cours…', 'Écriture DB SCOPE après confirmation explicite.');
        const rapport = await client.commitPersonnelSync({
          csvText: state.personnelSync.csvText,
          filename: state.personnelSync.filename,
          contexte: state.personnelSync.contexte,
          importType: state.personnelSync.contexte,
          siteJsp: state.personnelSync.siteJsp || undefined,
          anneeMonitoring: Number(state.personnelSync.anneeMonitoring) || new Date().getFullYear(),
          fingerprint: preview && preview.fingerprint,
          importId: preview && preview.importId,
          dateEffet: state.personnelSync.dateEffet || undefined,
          dateEffetGlobale: state.personnelSync.dateEffet || undefined,
          idempotencyKey: preview && preview.importId,
          decisions
        });
        const created = Number(rapport && (rapport.assignmentsCreated || (rapport.summary && rapport.summary.assignmentsCreated)) || 0);
        const ctx = String(state.personnelSync.contexte || '').toUpperCase();
        const successMessage = ctx === 'PR_ABC'
          ? `Import PR-ABC terminé — ${created} affectation(s) créée(s).`
          : `Import terminé — ${created} affectation(s) créée(s).`;
        state.modal = null;
        state.personnelSync.preview = null;
        state.personnelSync.decisions = {};
        state.personnelSync.commitPayload = null;
        state.personnelSync.rapport = Object.assign({}, rapport, { successMessage });
        if (typeof loadPersonnelDirectory === 'function') await loadPersonnelDirectory();
        toast('success', 'IMPORT TERMINÉ', successMessage);
      });
    });
    document.getElementById('scope-sync-file')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) readPersonnelFile(file);
    });
    const drop = document.getElementById('scope-sync-drop');
    if (drop) {
      drop.addEventListener('dragover', (e) => { e.preventDefault(); state.personnelSync.drag = true; drop.classList.add('is-drag'); });
      drop.addEventListener('dragleave', () => { state.personnelSync.drag = false; drop.classList.remove('is-drag'); });
      drop.addEventListener('drop', (e) => {
        e.preventDefault();
        state.personnelSync.drag = false;
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) readPersonnelFile(file);
        else render();
      });
    }
    root.querySelectorAll('[data-sync-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personnelSync.filter = btn.getAttribute('data-sync-filter');
        render();
      });
    });
    root.querySelectorAll('[data-sync-decision]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const id = sel.getAttribute('data-sync-decision');
        state.personnelSync.decisions[id] = Object.assign({}, state.personnelSync.decisions[id], { decision: sel.value });
      });
    });
    root.querySelectorAll('[data-sync-date]').forEach((input) => {
      input.addEventListener('change', () => {
        const id = input.getAttribute('data-sync-date');
        state.personnelSync.decisions[id] = Object.assign({}, state.personnelSync.decisions[id], { dateEffet: input.value });
      });
    });
    const personnelSearch = document.getElementById('personnel-q');
    if (personnelSearch) {
      const applyPersonnelSearch = (value, pos) => {
        state.personnelQuery = value;
        state.personnelListPage = 1;
        render();
        const next = document.getElementById('personnel-q');
        if (next) {
          next.focus();
          try { next.setSelectionRange(pos, pos); } catch (_err) {}
        }
      };
      personnelSearch.addEventListener('input', (e) => {
        const el = e.target;
        const pos = el.selectionStart;
        if (state.personnelSearchTimer) window.clearTimeout(state.personnelSearchTimer);
        if (!String(el.value || '').trim()) {
          applyPersonnelSearch('', pos);
          return;
        }
        state.personnelSearchTimer = window.setTimeout(() => applyPersonnelSearch(el.value, pos), 80);
      });
      personnelSearch.addEventListener('search', (e) => {
        applyPersonnelSearch(e.target.value, e.target.selectionStart);
      });
      personnelSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (state.personnelSearchTimer) window.clearTimeout(state.personnelSearchTimer);
          applyPersonnelSearch(personnelSearch.value, personnelSearch.selectionStart);
        }
      });
    }
    document.getElementById('personnel-oi')?.addEventListener('change', (e) => {
      state.personnelOi = e.target.value;
      state.personnelListPage = 1;
      render();
    });
    document.getElementById('personnel-specialization')?.addEventListener('change', (e) => {
      state.personnelSpecialization = e.target.value;
      state.personnelListPage = 1;
      render();
    });
    document.getElementById('personnel-statut')?.addEventListener('change', (e) => {
      state.personnelStatut = e.target.value || 'actifs';
      state.personnelListPage = 1;
      withLoading(loadPersonnelDirectory);
    });
    document.getElementById('personnel-page-size')?.addEventListener('change', (e) => {
      const n = Number(e.target.value);
      state.personnelListPageSize = EVENT_LIST_PAGE_SIZES.indexOf(n) >= 0 ? n : 12;
      state.personnelListPage = 1;
      render();
    });
    document.getElementById('personnel-page-prev')?.addEventListener('click', () => {
      state.personnelListPage = Math.max(1, (Number(state.personnelListPage) || 1) - 1);
      render();
    });
    document.getElementById('personnel-page-next')?.addEventListener('click', () => {
      state.personnelListPage = (Number(state.personnelListPage) || 1) + 1;
      render();
    });
    root.querySelectorAll('[data-personnel-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const display = personnelDisplay();
        const key = th.getAttribute('data-personnel-sort');
        state.personnelSort = display && display.nextPersonnelSort
          ? display.nextPersonnelSort(state.personnelSort, key)
          : { key, dir: state.personnelSort && state.personnelSort.key === key && state.personnelSort.dir === 'asc' ? 'desc' : 'asc' };
        state.personnelListPage = 1;
        render();
      });
    });
    root.querySelectorAll('[data-scope-sort][data-sort-key]').forEach((th) => {
      th.addEventListener('click', () => {
        const table = th.getAttribute('data-scope-sort');
        const key = th.getAttribute('data-sort-key');
        if (table === 'events') {
          const initial = key === 'date' ? 'desc' : 'asc';
          state.eventSort = L.nextSort ? L.nextSort(state.eventSort, key, initial) : { key, dir: 'asc' };
          render();
        }
        if (table === 'personne-events') {
          const initial = key === 'date' ? 'desc' : 'asc';
          state.personneEventSort = L.nextSort ? L.nextSort(state.personneEventSort, key, initial) : { key, dir: initial };
          render();
        }
        if (table === 'event-personnel') {
          state.eventPersonnelSort = L.nextSort ? L.nextSort(state.eventPersonnelSort, key, 'asc') : { key, dir: 'asc' };
          render();
        }
        if (table === 'event-realise') {
          const initial = key === 'grade' ? 'desc' : 'asc';
          state.realiseSort = L.nextSort ? L.nextSort(state.realiseSort, key, initial) : { key, dir: initial };
          render();
        }
        if (table === 'event-preview') {
          state.previewSort = L.nextSort ? L.nextSort(state.previewSort, key, 'asc') : { key, dir: 'asc' };
          render();
        }
        if (table === 'objectifs') {
          state.objectifSort = L.nextSort ? L.nextSort(state.objectifSort, key, key === 'debut' || key === 'fin' ? 'desc' : 'asc') : { key, dir: 'asc' };
          render();
        }
      });
    });
    root.querySelectorAll('[data-personnel-statut]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personnelStatut = btn.getAttribute('data-personnel-statut');
        withLoading(loadPersonnelDirectory);
      });
    });

    document.getElementById('scope-toggle-personnel-history')?.addEventListener('click', async () => {
      state.personnelHistoryOpen = !state.personnelHistoryOpen;
      if(state.personnelHistoryOpen && !state.personnelHistory && client.listPersonnelHistory){
        state.personnelHistory = await client.listPersonnelHistory();
      }
      render();
    });
    document.getElementById('scope-apply-personnel-asof')?.addEventListener('click', () => {
      state.personnelSituationDate = document.getElementById('personnel-asof')?.value || '';
      state.personnelSituationApplied = Boolean(state.personnelSituationDate);
      withLoading(loadPersonnelDirectory);
    });
    const quitAsOf = () => {
      state.personnelSituationApplied = false;
      state.personnelSituationDate = '';
      withLoading(loadPersonnelDirectory);
    };
    document.getElementById('scope-quit-personnel-asof')?.addEventListener('click', quitAsOf);
    document.getElementById('scope-quit-personnel-asof-history')?.addEventListener('click', quitAsOf);
    document.getElementById('personnel-period-mode')?.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'YEAR') {
        state.preset = 'YEAR';
        state.from = `${state.year}-01-01`;
        state.to = `${state.year}-12-31`;
      } else {
        state.preset = 'CUSTOM';
      }
      state.personnelSituationApplied = false;
      reloadPeriod();
    });
    document.getElementById('personnel-year')?.addEventListener('change', (e) => {
      state.year = e.target.value;
      state.preset = 'YEAR';
      state.from = `${state.year}-01-01`;
      state.to = `${state.year}-12-31`;
      state.personnelSituationApplied = false;
      reloadPeriod();
    });
    document.getElementById('personnel-from')?.addEventListener('change', (e) => {
      state.from = e.target.value;
      state.preset = 'CUSTOM';
      state.personnelSituationApplied = false;
      reloadPeriod();
    });
    document.getElementById('personnel-to')?.addEventListener('change', (e) => {
      state.to = e.target.value;
      state.preset = 'CUSTOM';
      state.personnelSituationApplied = false;
      reloadPeriod();
    });
    root.querySelectorAll('[data-personnel-more]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-personnel-more');
        state.personnelRowMenuId = state.personnelRowMenuId === id ? null : id;
        render();
      });
    });
    root.querySelectorAll('[data-manage-activity]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-manage-activity');
        const person = visiblePersonnelRows().find((row) => String(row.personneId) === String(id));
        if(person) openPersonnelActivityModal(person, { source: 'directory' });
      });
    });
    document.getElementById('scope-person-manage-activity')?.addEventListener('click', () => {
      const fiche = state.personneFiche;
      const identite = fiche && fiche.identite;
      if(!identite) return;
      const assignments = ficheActivityAssignments(fiche);
      const inactive = identite.archivee || identite.statutRh === 'INACTIF';
      openPersonnelActivityModal(Object.assign({}, identite, { affectations: assignments }), {
        mode: inactive ? 'correct' : 'manage',
        source: 'fiche',
        affectations: assignments.filter(isPersonnelAssignmentOpen),
        sabbatical: fiche.sabbatical || (fiche.personne && fiche.personne.sabbatical) || null
      });
    });
    root.querySelectorAll('[data-correct-person]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const id = btn.getAttribute('data-correct-person');
        const person = visiblePersonnelRows().find((row) => String(row.personneId) === String(id));
        openPersonnelActivityModal(person || { personneId: id, id }, { mode: 'correct', source: 'directory' });
      });
    });
    if(state.personnelRowMenuId){
      requestAnimationFrame(positionPersonnelRowMenu);
    }
    root.querySelectorAll('[data-personnel-batch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        withLoading(async () => {
          const detail = await client.listPersonnelHistory({ batchId: btn.getAttribute('data-personnel-batch') });
          state.personnelHistory = Object.assign({}, state.personnelHistory || {}, { openBatch: detail.batch || detail });
          render();
        });
      });
    });
    root.querySelectorAll('[data-person-events]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personneEventFilter = btn.getAttribute('data-person-events');
        render();
      });
    });
    document.getElementById('scope-fiche-domaine')?.addEventListener('change', (e) => {
      state.personneDomainFilter = e.target.value || null;
      render();
    });
    root.querySelectorAll('[data-person-domaine]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personneDomainFilter = btn.getAttribute('data-person-domaine') || null;
        render();
      });
    });
    document.getElementById('scope-person-rh')?.addEventListener('toggle', (e) => {
      state.personneRhOpen = e.target.open;
    });
    document.getElementById('person-edit-open')?.addEventListener('click', beginPersonneEdit);
    document.getElementById('person-export-pdf')?.addEventListener('click', () => {
      const fiche = state.personneFiche;
      const identite = fiche && fiche.identite;
      const id = (identite && (identite.personneId || identite.id)) || (route() && route().personneId);
      if (!id) return;
      openReport(Object.assign({
        kind: 'PERSON',
        personneId: id
      }, periodQuery()));
    });
    document.getElementById('person-add-assignment')?.addEventListener('click', () => {
      const fiche = state.personneFiche;
      const identite = fiche && fiche.identite;
      if (!identite) return;
      openPersonnelAssignmentModal(
        identite.personneId || identite.id,
        (ficheActivityAssignments(fiche) || []).filter(isPersonnelAssignmentOpen)
      );
    });
    document.getElementById('person-edit-cancel')?.addEventListener('click', cancelPersonneEdit);
    document.getElementById('person-edit-save')?.addEventListener('click', () => {
      const fiche = state.personneFiche;
      const id = fiche && fiche.identite && fiche.identite.personneId;
      if (!id || !client.updatePersonne) return;
      const body = {
        grade: document.getElementById('person-edit-grade')?.value || '',
        nom: document.getElementById('person-edit-nom')?.value || '',
        prenom: document.getElementById('person-edit-prenom')?.value || '',
        dateEntreeSdis: document.getElementById('person-edit-entree')?.value || null
      };
      withFeedbackAction({
        progressTitle: 'Mise à jour de la personne',
        successTitle: 'Personne mise à jour',
        successMessage: 'La fiche a été relue depuis le serveur.'
      }, async () => {
        await client.updatePersonne(id, body);
        await reloadPersonneFiche(id);
      });
    });
  }

  function openPersonnelImportPanel() {
    state.personnelSync.panelOpen = true;
    render();
  }

  function bindPersonnelImportDelegation() {
    root.addEventListener('click', (event) => {
      const trigger = event.target && event.target.closest
        ? event.target.closest('#scope-open-personnel-import')
        : null;
      if (!trigger) {
        const add = event.target && event.target.closest
          ? event.target.closest('#scope-open-personnel-manual-add')
          : null;
        if (!add) return;
        event.preventDefault();
        openPersonnelManualAddModal();
        return;
      }
      event.preventDefault();
      openPersonnelImportPanel();
    });
  }

  async function submitPersonnelActivityModal() {
    const api = personnelActivityModalApi();
    const modal = state.personnelInactivate;
    if (!api || !modal || modal.busy) return;
    const dateEl = document.getElementById('scope-activity-date');
    const fromEl = document.getElementById('scope-activity-date-from');
    const toEl = document.getElementById('scope-activity-date-to');
    const commentEl = document.getElementById('scope-activity-comment');
    if (dateEl) modal.date = dateEl.value;
    if (fromEl) modal.dateDebut = fromEl.value;
    if (toEl) modal.dateFin = toEl.value;
    if (commentEl) modal.comment = commentEl.value;
    const body = api.confirmBody(modal);
    if (!body) return;
    state.personnelInactivate = api.beginSubmit(modal);
    if (!state.personnelInactivate || !state.personnelInactivate.busy) return;
    render();
    try {
      const submit = body.action === 'sabbatical' && typeof client.createPersonnelSabbatical === 'function'
        ? client.createPersonnelSabbatical(body)
        : body.action === 'end_sabbatical' && typeof client.endPersonnelSabbatical === 'function'
          ? client.endPersonnelSabbatical(body)
          : client.inactivatePersonne(body);
      await submit;
      const source = state.personnelInactivate.source;
      const personneId = state.personnelInactivate.id;
      const action = body.action;
      state.personnelInactivate = api.close();
      state.personnelRowMenuId = null;
      if (source === 'fiche' || (route().screen === 'personne' && route().personneId)) {
        await reloadPersonneFiche(personneId);
        await refreshAlertCounts();
      } else {
        await loadPersonnelDirectory();
        render();
      }
      const success = action === 'sabbatical'
        ? ['Congé enregistré', 'Le congé sabbatique a été enregistré.']
        : action === 'end_sabbatical'
          ? ['Congé terminé', 'Le congé sabbatique a été clôturé.']
          : ['Activité mise à jour', 'L’opération a été enregistrée.'];
      ScopeFeedback.success(success[0], success[1]);
    } catch (error) {
      const info = L.personnelMutationError ? L.personnelMutationError(error) : L.friendlyError(error);
      state.personnelInactivate = api.failSubmit(state.personnelInactivate, info.message || info.title);
      render();
    }
  }

  function bindPersonnelActivityChrome() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!target || !target.closest) return;
      if (target.closest('[data-activity-cancel]')) {
        event.preventDefault();
        closePersonnelActivityModal();
        return;
      }
      if (target.hasAttribute && target.hasAttribute('data-activity-overlay')) {
        closePersonnelActivityModal();
        return;
      }
      const op = target.closest('[data-activity-op]');
      if (op && state.personnelInactivate && !state.personnelInactivate.busy) {
        event.preventDefault();
        const api = personnelActivityModalApi();
        state.personnelInactivate = api.selectOperation(state.personnelInactivate, op.getAttribute('data-activity-op'));
        render();
        return;
      }
      if (target.closest('[data-activity-confirm]')) {
        event.preventDefault();
        submitPersonnelActivityModal();
        return;
      }
      if (target.closest('[data-manual-add-cancel]')) {
        event.preventDefault();
        closePersonnelManualAddModal();
        return;
      }
      if (target.hasAttribute && target.hasAttribute('data-manual-add-overlay')) {
        closePersonnelManualAddModal();
        return;
      }
      if (target.closest('#scope-manual-add-confirm')) {
        event.preventDefault();
        submitPersonnelManualAdd();
        return;
      }
      if (target.closest('[data-assignment-cancel]')) {
        event.preventDefault();
        closePersonnelAssignmentModal();
        return;
      }
      if (target.hasAttribute && target.hasAttribute('data-assignment-overlay')) {
        closePersonnelAssignmentModal();
        return;
      }
      const assignOp = target.closest('[data-assignment-op]');
      if (assignOp && state.personnelAssignment && !state.personnelAssignment.busy) {
        event.preventDefault();
        state.personnelAssignment.operation = assignOp.getAttribute('data-assignment-op');
        state.personnelAssignment.error = '';
        render();
        return;
      }
      if (target.closest('[data-assignment-confirm]')) {
        event.preventDefault();
        submitPersonnelAssignmentModal();
        return;
      }
      if (state.objectifMenuId) {
        if (target.closest('[data-obj-more]') || target.closest('#scope-objectif-row-menu')) return;
        state.objectifMenuId = null;
        render();
        return;
      }
      if (!state.personnelRowMenuId) return;
      if (target.closest('[data-personnel-more]') || target.closest('#scope-personnel-row-menu') || target.closest('[data-activity-overlay]')) return;
      state.personnelRowMenuId = null;
      render();
    });
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target && state.personnelAssignment && !state.personnelAssignment.busy) {
        if (target.id === 'scope-assign-type') {
          state.personnelAssignment.categorie = target.value;
          state.personnelAssignment.domaine = '';
          state.personnelAssignment.cible = '';
          state.personnelAssignment.roleDomaine = '';
          state.personnelAssignment.specialization = '';
          render();
          document.getElementById('scope-assign-type')?.focus();
          return;
        }
        if (target.id === 'scope-assign-domaine') {
          state.personnelAssignment.domaine = target.value;
          state.personnelAssignment.cible = '';
          render();
          document.getElementById('scope-assign-domaine')?.focus();
          return;
        }
        if (target.id === 'scope-assign-cible') {
          state.personnelAssignment.cible = target.value;
          render();
          document.getElementById('scope-assign-cible')?.focus();
          return;
        }
        if (target.id === 'scope-assign-role') {
          state.personnelAssignment.roleDomaine = target.value;
          render();
          document.getElementById('scope-assign-role')?.focus();
          return;
        }
        if (target.id === 'scope-assign-spec') {
          state.personnelAssignment.specialization = target.value;
          render();
          document.getElementById('scope-assign-spec')?.focus();
          return;
        }
        if (target.id === 'scope-assign-date') {
          state.personnelAssignment.dateActif = target.value;
          render();
          document.getElementById('scope-assign-date')?.focus();
          return;
        }
        if (target.id === 'scope-assign-last-active') {
          state.personnelAssignment.dateLastActive = target.value;
          render();
          document.getElementById('scope-assign-last-active')?.focus();
          return;
        }
        if (target.name === 'scope-assign-aff') {
          state.personnelAssignment.affectationId = target.value;
          render();
          return;
        }
      }
      if (!target || !state.personnelInactivate || state.personnelInactivate.busy) return;
      if (target.id === 'scope-activity-date') {
        state.personnelInactivate.date = target.value;
        render();
        document.getElementById('scope-activity-date')?.focus();
        return;
      }
      if (target.id === 'scope-activity-date-from') {
        state.personnelInactivate.dateDebut = target.value;
        render();
        document.getElementById('scope-activity-date-from')?.focus();
        return;
      }
      if (target.id === 'scope-activity-date-to') {
        state.personnelInactivate.dateFin = target.value;
        render();
        document.getElementById('scope-activity-date-to')?.focus();
        return;
      }
      if (target.name === 'scope-activity-aff') {
        state.personnelInactivate.affectationId = target.value;
        render();
      }
    });
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!target || !state.personnelInactivate) return;
      if (target.id === 'scope-activity-comment') {
        state.personnelInactivate.comment = target.value;
      }
    });
    window.addEventListener('resize', () => {
      if (state.personnelRowMenuId) positionPersonnelRowMenu();
      if (state.objectifMenuId) positionObjectifRowMenu();
    });
    document.addEventListener('scroll', () => {
      if (!state.personnelRowMenuId) return;
      state.personnelRowMenuId = null;
      render();
    }, true);
  }

  function reportPeriodPayload() {
    return L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
      semester: state.semester,
      from: state.from,
      to: state.to
    });
  }

  function participationReportParams(base) {
    const domain = String(state.participationReportDomain || 'JSP').toUpperCase();
    const subdomain = domain === 'FOSPEC' ? String(state.participationReportSubdomain || '').toUpperCase() : '';
    const payload = Object.assign({}, base || {}, {
      domaine: domain,
      blocks: (state.participationReportBlocks || []).join(',')
    });
    if (subdomain) {
      payload.sousDomaine = subdomain;
      const specialisation = String(state.participationReportSpecialisation || '').toUpperCase();
      if (specialisation) payload.specialisation = specialisation;
    }
    if (state.jspReportSite && state.jspReportSite !== 'TOUS') payload.perimeter = state.jspReportSite;
    return payload;
  }

  function generateEventReport(evenementId) {
    const body = Object.assign(reportPeriodPayload(), {
      kind: 'EVENT',
      evenementId,
      nominatif: canNominatif()
    });
    delete body.domaine;
    delete body.cible;
    openReport(body);
  }

  function generateSessionReport(evenementId) {
    const body = Object.assign(reportPeriodPayload(), {
      kind: 'SESSION',
      evenementId,
      nominatif: canNominatif()
    });
    delete body.domaine;
    delete body.cible;
    openReport(body);
  }

  function generateCurrentReport() {
    const form = state.reportForm;
    const body = Object.assign(reportPeriodPayload(), { kind: form.kind });
    if (form.kind === 'PERIOD') {
      delete body.domaine;
      delete body.cible;
    } else if (form.kind === 'DOMAIN') {
      body.domaine = form.domaine;
      delete body.cible;
    } else if (form.kind === 'TARGET') {
      body.domaine = form.domaine;
      body.cible = form.cible;
    } else {
      body.evenementId = form.evenementId || (document.getElementById('report-event') && document.getElementById('report-event').value);
      body.nominatif = canNominatif();
      delete body.domaine;
      delete body.cible;
    }
    openReport(body);
  }

  function generateJspReportPdf() {
    const body = participationReportParams(Object.assign(reportPeriodPayload(), { kind: 'PARTICIPATION' }));
    delete body.cible;
    openReport(body);
  }

  function generateFormationReportPdf() {
    const body = Object.assign(reportPeriodPayload(), { kind: 'FORMATION' });
    delete body.domaine;
    delete body.cible;
    openReport(body);
  }

  function openReport(body) {
    if (typeof client.generateReport !== 'function') return;
    withLoading(async () => {
      const result = await client.generateReport(Object.assign({}, body, qualQuery()));
      if (window.ScopePdfViewer) window.ScopePdfViewer.open(result);
      else toast('success', 'Rapport généré', result.filename);
    });
  }

  function visibleSaisie() {
    if (state.cibleFilter === 'tous') return state.saisie;
    return state.saisie.filter((r) => r.cible === state.cibleFilter || (r.cibles || []).includes(state.cibleFilter));
  }

  function applyPresent() {
    if (state.cibleFilter === 'tous') state.saisie = L.applyAllPresent(state.saisie);
    else state.saisie = L.applyAllPresentFiltered(state.saisie, state.cibleFilter);
    render();
  }

  function resetSaisie() {
    clearPresenceSearchState();
    const id = route().id;
    if (client.resetParticipations && state.fiche && state.fiche.evenement) {
      return withFeedbackAction({
        progressTitle: 'Réinitialisation de la saisie',
        successTitle: 'Saisie réinitialisée',
        successMessage: 'Les présences, justificatifs et l’encadrement ont été effacés.'
      }, async () => {
        await client.resetParticipations(id, state.fiche.evenement.version);
        await loadFiche(id);
      });
    }
    state.saisie = L.resetSaisie ? L.resetSaisie(state.saisie) : state.saisie.map((row) => Object.assign({}, row, {
      statut: 'NON_RENSEIGNE',
      role: 'PARTICIPANT',
      motifAbsence: '',
      commentaire: ''
    }));
    render();
  }

  function resetEventTransientUi() {
    clearPresenceSearchState();
    state.encRole = 'FORMATEUR';
    state.encSerieComplete = false;
    state.encRetrait = null;
    state.realiseQuery = '';
    state.realiseGrade = '';
    state.realiseOi = '';
    state.realiseCible = '';
    state.realiseStatut = '';
    state.realiseSort = { key: 'grade', dir: 'desc' };
  }

  function clearPresenceSearchState() {
    state.encQuery = '';
    state.encHits = [];
    state.manualPersonQuery = '';
    state.manualPersonHits = [];
    state.scopeSearchTokens.encadrement = (state.scopeSearchTokens.encadrement || 0) + 1;
    state.scopeSearchTokens.manual = (state.scopeSearchTokens.manual || 0) + 1;
    clearTimeout(state.scopeSearchTimers.encadrement);
    clearTimeout(state.scopeSearchTimers.manual);
    const enc = document.getElementById('enc-suggestions');
    const manual = document.getElementById('manual-person-suggestions');
    if (enc) enc.innerHTML = '';
    if (manual) manual.innerHTML = '';
  }

  function searchPersonnes(value, kind) {
    const q = String(value || '').trim();
    if (kind === 'encadrement') {
      state.encQuery = q;
      state.encHits = [];
    } else {
      state.manualPersonQuery = q;
      state.manualPersonHits = [];
    }
    clearTimeout(state.scopeSearchTimers[kind]);
    const targetId = kind === 'encadrement' ? 'enc-suggestions' : 'manual-person-suggestions';
    const target = document.getElementById(targetId);
    if (q.length < SCOPE_SEARCH_MIN_CHARS) {
      if (target) target.innerHTML = '';
      return;
    }
    const token = (state.scopeSearchTokens[kind] || 0) + 1;
    state.scopeSearchTokens[kind] = token;
    state.scopeSearchTimers[kind] = setTimeout(() => {
      client.listPersonnes(q).then((data) => {
        if (state.scopeSearchTokens[kind] !== token) return;
      const hits = (data.personnes || []).filter((p) => {
        const text = normalizeSearchText([p.grade, p.nom, p.prenom, p.nip].join(' '));
        return text.includes(normalizeSearchText(q));
      });
        if (kind === 'encadrement') {
          const used = usedEncadrementIds();
          state.encHits = sortPeopleForEncadrement(hits.filter((p) => !used.has(String(p.personne_id))));
          renderSuggestionList(kind, state.encHits);
        } else {
          const expected = expectedIds();
          state.manualPersonHits = sortPeopleForEncadrement(hits.filter((p) => !expected.has(String(p.personne_id))));
          renderSuggestionList(kind, state.manualPersonHits);
        }
      }).catch((error) => {
        if (state.scopeSearchTokens[kind] !== token) return;
        const info = L.friendlyError(error);
        toast(info.tone, info.title, info.message);
      });
    }, SCOPE_SEARCH_DEBOUNCE_MS);
  }

  function renderSuggestionList(kind, rows) {
    const targetId = kind === 'encadrement' ? 'enc-suggestions' : 'manual-person-suggestions';
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = renderPersonSuggestions(kind, rows || []);
    target.querySelectorAll('[data-enc-add]').forEach((btn) => {
      btn.addEventListener('click', () => addEncadrement(btn.getAttribute('data-enc-add')));
    });
    target.querySelectorAll('[data-manual-add]').forEach((btn) => {
      btn.addEventListener('click', () => addManualParticipant(btn.getAttribute('data-manual-add')));
    });
  }

  async function persistParticipations() {
    if (state.presenceSaveBusy) return { ok: false, reason: 'in_flight' };
    if (!L.hasUnsavedPresenceChanges(state)) {
      return { ok: true, skipped: true, version: state.fiche && state.fiche.evenement && state.fiche.evenement.version };
    }
    const id = route().id;
    const encadrementIds = usedEncadrementIds();
    const payload = buildPresenceSavePayload(state.saisie, encadrementIds);
    state.presenceSaveBusy = true;
    render();
    try {
      const res = await client.enregistrerParticipations(id, payload, state.fiche.evenement.version);
      await reloadFicheFromServer(id);
      const version = (res && res.version) || (state.fiche && state.fiche.evenement && state.fiche.evenement.version);
      if (version && state.fiche && state.fiche.evenement) state.fiche.evenement.version = version;
      setUnsavedPresenceChanges(false);
      state.presenceSaveStatus = 'saved';
      return { ok: true, version };
    } catch (error) {
      state.presenceSaveStatus = 'error';
      return { ok: false, reason: 'save_failed', error, status: error && error.status, conflict: Boolean(error && error.status === 409) };
    } finally {
      state.presenceSaveBusy = false;
      render();
    }
  }

  function saveParticipations() {
    if (!L.canStartPresenceSave(state)) return;
    withFeedbackAction({
      progressTitle: 'Enregistrement des présences',
      successTitle: 'Présences enregistrées',
      successMessage: 'Les participations ont été enregistrées.'
    }, async () => {
      const saved = await persistParticipations();
      if (!saved.ok) {
        if (saved.reason === 'in_flight') return;
        throw saved.error || new Error(saved.reason);
      }
    });
  }

  function confirmClotureAfterSave() {
    const incomplete = L.listIncompleteClosureRows ? L.listIncompleteClosureRows(state.saisie) : [];
    const session = (state.fiche && (state.fiche.prExerciseParticipation || state.fiche.sessionParticipation)) || {};
    const multi = Boolean(session.isMultiSession);
    const last = Boolean(session.isLastSession);
    if (multi && !last) {
      ScopeFeedback.confirm({
        title: 'Clôturer la séance',
        message: 'La séance sera clôturée. Les personnes non renseignées restent disponibles pour les séances suivantes.',
        confirmText: 'Clôturer'
      }, cloturer);
      return;
    }
    const missing = last && multi
      ? (session.unfilledPeople || []).map((p) => Object.assign({
        personneId: p.personneId || p.personne_id,
        grade: p.grade,
        prenom: p.prenom,
        nomFamille: p.nom || p.nomFamille,
        nom: p.nom,
        nip: p.nip
      }, p))
      : incomplete;
    if (missing.length) {
      state.clotureIncompletePeople = missing;
      state.modal = 'cloture-incomplete';
      render();
      return;
    }
    ScopeFeedback.confirm({
      title: last && multi ? 'Clôturer l’exercice' : 'Clôturer l’événement',
      message: last && multi
        ? 'La session complète sera clôturée.'
        : 'La saisie sera enregistrée et l’événement marqué comme réalisé.',
      confirmText: last && multi ? 'Clôturer l’exercice' : 'Clôturer',
      cancelText: 'Annuler'
    }, cloturer);
  }

  async function onCloturerClick() {
    if (state.presenceSaveBusy || state.presenceCloseBusy) return;
    if (L.hasUnsavedPresenceChanges(state)) {
      state.presenceCloseBusy = 'save';
      render();
      const saved = await persistParticipations();
      state.presenceCloseBusy = null;
      if (!saved.ok) {
        const info = saved.error ? L.friendlyError(saved.error) : {};
        if (info.conflict || saved.conflict) {
          ScopeFeedback.error(info.title || 'Séance modifiée ailleurs', info.message || 'Cette séance a été modifiée ailleurs. Rechargez les données avant de poursuivre.', { conflict: true });
        } else {
          ScopeFeedback.error('Saisie non enregistrée', L.PRESENCE_SAVE_FAILED_CLOSE_MESSAGE || 'La saisie n’a pas pu être enregistrée. L’événement n’a pas été clôturé.');
        }
        render();
        return;
      }
    }
    confirmClotureAfterSave();
  }

  async function finishLeaveSaisie(choice) {
    const target = state.saisieGuard.pendingHash || '#/exercices';
    const result = await L.orchestrateLeaveSaisie({
      dirty: L.hasUnsavedPresenceChanges(state),
      saisieDirty: state.saisieDirty,
      choice,
      saveInFlight: state.presenceSaveBusy,
      save: persistParticipations
    });
    if (choice === 'stay' || result.navigated === false && result.ok) {
      state.modal = null;
      state.saisieGuard.pendingHash = '';
      render();
      return;
    }
    if (!result.ok) {
      state.modal = null;
      ScopeFeedback.error('Saisie non enregistrée', result.message || 'La saisie n’a pas pu être enregistrée.');
      render();
      return;
    }
    if (result.discarded) setUnsavedPresenceChanges(false);
    state.modal = null;
    state.saisieGuard.allowLeave = true;
    state.saisieGuard.pendingHash = '';
    location.hash = target;
  }

  function cloturer() {
    const id = route().id;
    state.presenceCloseBusy = 'close';
    withFeedbackAction({
      progressTitle: 'Clôture…',
      successTitle: 'Événement clôturé',
      successMessage: 'La saisie est enregistrée et l’événement est marqué comme réalisé.'
    }, async () => {
      try {
        await client.cloturer(id, state.fiche.evenement.version);
        setUnsavedPresenceChanges(false);
        await loadFiche(id);
        state.saisieGuard.allowLeave = true;
        go(`#/exercices/${id}`);
      } finally {
        state.presenceCloseBusy = null;
      }
    });
  }

  function addEncadrement(personneId) {
    const id = route().id;
    const role = state.encRole || document.getElementById('enc-role')?.value || 'FORMATEUR';
    const serieComplete = role === 'FORMATEUR' && state.encSerieComplete && isFirstPrSession(state.fiche);
    const snapshot = snapshotSaisieState();
    withFeedbackAction({
      progressTitle: 'Ajout à l’encadrement',
      successTitle: 'Encadrement ajouté',
      successMessage: serieComplete ? 'Le Formateur a été ajouté à toute la série PR.' : 'La personne est hors du taux principal.'
    }, async () => {
      await client.ajouterEncadrement(id, { personneId, role, serieComplete }, state.fiche.evenement.version);
      state.encQuery = '';
      state.encHits = [];
      state.encSerieComplete = false;
      await refreshFichePreservingSaisie(id, snapshot);
    });
  }

  function removeEncadrement(personneId, scope) {
    const id = route().id;
    const snapshot = snapshotSaisieState();
    const serie = String(scope || 'SESSION').toUpperCase() === 'SERIE';
    withFeedbackAction({
      progressTitle: 'Retrait de l’encadrement',
      successTitle: 'Encadrement retiré',
      successMessage: serie ? 'Le Formateur a été retiré de toute la série PR.' : 'La personne peut être sélectionnée de nouveau.'
    }, async () => {
      await client.retirerEncadrement(id, { personneId, scope: scope || 'SESSION' }, state.fiche.evenement.version);
      await refreshFichePreservingSaisie(id, snapshot);
    });
  }

  function addManualParticipant(personneId) {
    const id = route().id;
    withFeedbackAction({
      progressTitle: 'Ajout du participant',
      successTitle: 'Personne ajoutée',
      successMessage: 'Ajout nominatif propre à cet événement.'
    }, async () => {
      await client.ajouterException(id, { personneId, role: 'PARTICIPANT' }, state.fiche.evenement.version);
      state.manualPersonQuery = '';
      state.manualPersonHits = [];
      await loadFiche(id);
    });
  }

  function removeManualParticipant(personneId) {
    const row = state.saisie.find((item) => item.personneId === personneId);
    if (!row || !row.manual) {
      ScopeFeedback.error('Retrait refusé', 'Seuls les ajouts manuels sont retirables ici.');
      return;
    }
    const id = route().id;
    withFeedbackAction({
      progressTitle: 'Retrait du participant',
      successTitle: 'Ajout retiré',
      successMessage: 'La personne reste dans le référentiel SCOPE.'
    }, async () => {
      await client.retirerAttendu(id, { personneId }, state.fiche.evenement.version);
      await loadFiche(id);
    });
  }

  async function ensureLiveSession() {
    if (typeof client.sessionMe !== 'function') {
      clearLocalAuthState();
      state.authError = presentFriendlyError(L.friendlyError({ status: 401, error: 'unauthorized' }));
      return false;
    }
    try {
      const params = new URLSearchParams(location.search.replace(/^\?/, ''));
      if (params.get('idle') === '1') state.idleExpired = true;
    } catch (_err) { /* ignore */ }
    try {
      const data = await client.sessionMe();
      normalizeAuthenticatedLocation();
      state.session = data.user || null;
      state.authChecking = false;
      state.authError = null;
      window.CurrentRoles = (state.session && state.session.roles) || [];
      window.CurrentPermissions = (state.session && state.session.permissions) || [];
      document.dispatchEvent(new Event('monitoring-f7-auth-session-changed'));
      state.needOkta = false;
      if (window.ScopeAuthIdle && typeof window.ScopeAuthIdle.start === 'function') {
        window.ScopeAuthIdle.start({
          onWarn() {
            state.idleWarn = true;
            render();
          },
          onExpire() {
            state.idleExpired = true;
            if (window.ScopeAuthIdle.redirectToLogout) window.ScopeAuthIdle.redirectToLogout();
          }
        });
      }
      return true;
    } catch (error) {
      const info = presentFriendlyError(L.friendlyError(error));
      clearLocalAuthState();
      state.authError = info;
      return false;
    }
  }

  function readImportFile(file) {
    const name = String(file.name || '');
    if (!/\.csv$/i.test(name)) {
      toast('error', 'Fichier refusé', 'Seuls les fichiers CSV sont acceptés.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.importFile = { filename: name, csvText: String(reader.result || ''), drag: false };
      state.importPreview = null;
      state.importRapport = null;
      state.importExcluded = {};
      state.importDecisions = {};
      state.importFilter = 'TOUS';
      render();
    };
    reader.readAsText(file, 'UTF-8');
  }

  function readPersonnelFile(file) {
    const name = String(file.name || '');
    if (!/\.csv$/i.test(name)) {
      toast('error', 'Fichier refusé', 'Seuls les fichiers CSV sont acceptés.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.personnelSync.filename = name;
      state.personnelSync.csvText = String(reader.result || '');
      state.personnelSync.drag = false;
      state.personnelSync.preview = null;
      state.personnelSync.rapport = null;
      state.personnelSync.decisions = {};
      render();
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function onRoute() {
    if (state.saisieGuard && state.saisieGuard.restoring) {
      state.saisieGuard.restoring = false;
      return;
    }
    const incoming = route();
    const stay = L.parseHash(state.saisieGuard && state.saisieGuard.stayHash);
    if (
      L.hasUnsavedPresenceChanges(state)
      && stay.screen === 'saisie'
      && L.isLeavingSaisieRoute(stay, incoming)
      && !(state.saisieGuard && state.saisieGuard.allowLeave)
    ) {
      state.saisieGuard.pendingHash = location.hash;
      state.saisieGuard.restoring = true;
      state.modal = 'unsaved-saisie-leave';
      state.saisieLeaveCopy = L.planSaisieLeave(state);
      location.hash = state.saisieGuard.stayHash;
      render();
      return;
    }
    if (state.saisieGuard) state.saisieGuard.allowLeave = false;
    if (state.needOkta) {
      render();
      return;
    }
    const r = route();
    const previousRoute = state.currentRoute;
    prepareRouteChange(previousRoute, r);
    state.currentRoute = r;
    state.currentRouteKey = routeKey(r);
    state.navigationSeq += 1;
    if (r.screen === 'liste' || r.screen === 'rapports') {
      state.listReady = false;
      state.listError = null;
    }
    if (r.screen === 'cycles') {
      state.cyclesReady = false;
      state.cyclesError = null;
    }
    if (r.screen === 'cycle') {
      state.cycleDetailReady = false;
      state.cycleDetailError = null;
    }
    if (r.screen === 'personnel') {
      state.personnelReady = false;
      state.personnelError = null;
    }
    if (r.screen === 'vue') {
      state.dashboardError = null;
    }
    if (r.screen === 'rapport-jsp' || r.screen === 'rapport-participation') {
      state.jspReportReady = false;
      state.jspReportError = null;
    }
    if (r.screen === 'rapport-formation') {
      state.formationReportReady = false;
      state.formationReportError = null;
    }
    if ((r.screen === 'fiche' || r.screen === 'saisie') && r.id && state.activeFicheId !== String(r.id)) {
      state.activeFicheId = String(r.id);
      state.ficheReady = false;
      state.fiche = null;
      state.preview = null;
      state.saisie = [];
      state.volumes = volumesFromFiche();
      resetEventTransientUi();
      render();
    }
    await withLoading(async () => {
      if (!state.referentiels.domaines.length) await loadReferentiels();
      if (r.screen === 'objectifs') await loadObjectifs();
      if (client.listPersonnes && state.personCount == null) {
        const people = await client.listPersonnes();
        state.personCount = (people.personnes || []).length;
      }
      if (r.screen === 'liste' || r.screen === 'rapports' || r.screen === 'accueil') await loadList();
      if (r.screen === 'rapport-jsp' || r.screen === 'rapport-participation') await loadJspReport();
      if (r.screen === 'rapport-formation') await loadFormationReport();
      if (r.screen === 'cycles') await loadCycles();
      if (r.screen === 'cycle' && r.id) await loadCycle(r.id);
      if (r.screen === 'vue' || r.screen === 'accueil' || r.screen === 'statistiques') await loadDashboard();
      if (r.screen === 'objectifs') await loadObjectifs();
      if (r.screen === 'personnel' || r.screen === 'import-personnel') {
        if (client.listPersonnes) {
          const people = await client.listPersonnes();
          state.personCount = (people.personnes || []).length;
        }
        await loadPersonnelDirectory();
      }
      if (r.screen === 'personne' && r.personneId) await loadPersonneFiche(r.personneId);
      if ((r.screen === 'fiche' || r.screen === 'saisie') && r.id) await loadFiche(r.id);
      await refreshAlertCounts();
    });
    if (r.screen === 'saisie' && r.id) {
      state.saisieGuard.stayHash = `#/exercices/${r.id}/saisie`;
    } else if (r.screen !== 'saisie') {
      state.saisieGuard.stayHash = '';
    }
  }

  if (window.__SCOPE_UI_TEST_HOOKS__) {
    window.ScopeUiTestHooks = {
      state,
      renderSaisieHtml(fiche, rows = []) {
        state.fiche = fiche;
        state.ficheReady = true;
        state.saisie = rows;
        return renderSaisie();
      },
      prepareRouteChange,
      resetEventListFilters,
      resetPersonnelFilters,
      resetCycleFilters,
      renderRapportsHtml() {
        return renderRapports();
      },
      renderRapportJspHtml(report) {
        state.jspReport = report;
        state.jspReportReady = true;
        state.jspReportError = null;
        if (report && report.blocks) state.participationReportBlocks = report.blocks;
        if (report && report.domaine) state.participationReportDomain = report.domaine;
        if (report && report.sousDomaine != null) state.participationReportSubdomain = report.sousDomaine || '';
        if (report && report.specialisation != null) state.participationReportSpecialisation = report.specialisation || 'GEN';
        if (report && report.siteFilter) state.jspReportSite = report.siteFilter;
        return renderRapportJsp();
      },
      buildParticipationReportParams(base) {
        return participationReportParams(base || {});
      },
      renderFormationReportHtml(report) {
        state.formationReport = report;
        state.formationReportReady = true;
        state.formationReportError = null;
        return renderFormationReport();
      },
      render,
      ensureLiveSession,
      userLabel,
      clearLocalAuthState,
      clearScopeSession,
      invalidateScopeSession,
      handleUnauthorized,
      logoutScopeSession
    };
    return;
  }

  window.addEventListener('hashchange', onRoute);
  window.addEventListener('beforeunload', (event) => {
    if (L.shouldWarnBeforeUnload && L.shouldWarnBeforeUnload(state, route())) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.personnelInactivate) {
        closePersonnelActivityModal();
        return;
      }
      if (state.personnelAssignment) {
        closePersonnelAssignmentModal();
        return;
      }
      if (state.objectifMenuId) {
        state.objectifMenuId = null;
        render();
        return;
      }
      if (state.personnelRowMenuId) {
        state.personnelRowMenuId = null;
        render();
        return;
      }
      if (state.navOpen) {
        closeNav();
        render();
      }
    }
  });
  bindPersonnelImportDelegation();
  bindPersonnelActivityChrome();

  (async function boot() {
    render();
    const ok = await ensureLiveSession();
    render();
    if (!ok) return;
    if (!location.hash) location.hash = '#/accueil';
    else await onRoute();
  })();
})();
