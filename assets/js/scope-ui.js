/* SCOPE-IMPL-1B — écrans P0 nominatifs. SCOPE-DATA-5 — import CSV. */
(function () {
  'use strict';
  const L = window.ScopeUiLogic;
  const root = document.getElementById('scope-root');
  if (!root || !L) return;

  const LIVE_KEY = 'scope-live-confirmed';
  const QUAL_KEY = 'scope-include-qualification';

  function liveConfirmed() {
    try { return sessionStorage.getItem(LIVE_KEY) === '1'; } catch (_error) { return false; }
  }

  function readIncludeQualification() {
    try { return sessionStorage.getItem(QUAL_KEY) === '1'; } catch (_error) { return false; }
  }

  function persistIncludeQualification(value) {
    try { sessionStorage.setItem(QUAL_KEY, value ? '1' : '0'); } catch (_error) { /* ignore */ }
  }

  function resolveMode() {
    const decision = L.resolveClientMode({ search: location.search, sessionLive: liveConfirmed() });
    if (decision === 'live' && window.ScopeApi) {
      return { mode: 'live', client: window.ScopeApi.createHttpClient({}), gate: false };
    }
    return {
      mode: 'demo',
      client: window.ScopeDemo.createDemoClient({}),
      gate: decision === 'gate'
    };
  }

  const resolved = resolveMode();
  let client = resolved.client;
  let mode = resolved.mode;
  let liveGate = resolved.gate;

  const state = {
    year: L.currentYear('2026-08-19'),
    preset: 'YEAR',
    month: '8',
    quarter: '3',
    from: '2026-01-01',
    to: '2026-12-31',
    statut: 'tous',
    domaine: 'tous',
    referentiels: { domaines: [], cibles: [] },
    list: [],
    fiche: null,
    preview: null,
    pendingRetraits: [],
    pendingExceptions: [],
    saisie: [],
    cibleFilter: 'tous',
    encadrementOpen: false,
    toast: null,
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
    reopenMotif: '',
    session: null,
    needOkta: false,
    personCount: null,
    importFile: { filename: '', csvText: '', drag: false },
    importPreview: null,
    importExcluded: {},
    importRapport: null,
    importFilter: 'TOUS',
    importDecisions: {},
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
    personnelInactivate: null,
    personnelOi: '',
    personnelSpecialization: '',
    personnelSort: { key: '', dir: '' },
    personneFiche: null,
    personneEventFilter: 'tout',
    personneDomainFilter: null,
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
      cibleId: '',
      seuilPct: '',
      dateDebut: '2026-01-01',
      dateFin: '',
      commentaire: ''
    },
    objectifAction: null,
    reportForm: { kind: 'PERIOD', domaine: 'DAP', cible: 'Y4', evenementId: '' },
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

  async function withLoading(fn) {
    state.loading = true;
    render();
    try {
      await fn();
    } catch (error) {
      const info = L.friendlyError(error);
      state.conflict = Boolean(info.conflict);
      if (info.okta) state.needOkta = true;
      toast(info.tone, info.title, info.message, { conflict: info.conflict, errors: info.errors, okta: info.okta });
    } finally {
      state.loading = false;
      render();
    }
  }

  function route() { return L.parseHash(location.hash); }

  function go(hash) {
    location.hash = hash;
  }

  function domaineLabel(code) {
    const d = state.referentiels.domaines.find((x) => x.code === code);
    return d ? (d.libelleAffiche || L.domaineAffiche(code)) : L.domaineAffiche(code);
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
    state.listError = null;
    try {
      const data = await client.listEvenements(Object.assign({
        annee: state.year,
        statut: state.statut,
        domaineCode: state.domaine
      }, qualQuery()));
      state.list = data.evenements || [];
      state.listReady = true;
    } catch (error) {
      state.listError = L.friendlyError(error).message || L.errorMessage('exercices');
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

  async function refreshAlertCounts() {
    if (typeof client.listAlerts !== 'function') return;
    const params = Object.assign(L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
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
      } else if (r.screen === 'personnel' || r.screen === 'import-personnel') {
        await loadPersonnelDirectory();
      } else if (r.screen === 'personne' && r.personneId) {
        await loadPersonneFiche(r.personneId);
      }
      await refreshAlertCounts();
    });
  }

  async function loadFiche(id) {
    const data = await client.getEvenement(id);
    state.fiche = data;
    state.conflict = false;
    buildSaisieFromFiche();
    state.volumes = volumesFromFiche();
    state.qtyPreview = null;
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

  function buildSaisieFromFiche() {
    const fiche = state.fiche;
    if (!fiche) { state.saisie = []; return; }
    const parts = new Map((fiche.participations || []).map((p) => [p.personne_id, p]));
    state.saisie = (fiche.attendus || [])
      .filter((a) => a.inclus !== false)
      .map((a) => {
        const part = parts.get(a.personne_id) || {};
        return {
          personneId: a.personne_id,
          nom: displayPerson(fiche, a.personne_id),
          nip: nipOf(fiche, a.personne_id),
          cible: cibleForPersonne(a.personne_id),
          cibles: [cibleForPersonne(a.personne_id)],
          statut: part.statut || 'NON_RENSEIGNE',
          motifAbsence: part.motif_absence || '',
          commentaire: part.commentaire || '',
          inclus: true,
          role: part.role || 'PARTICIPANT',
          origine: a.origine,
          jspRole: a.jspRole || a.jsp_role || null
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
    if (mode !== 'live') return 'Démonstration';
    if (state.session && state.session.roleLabel) return state.session.roleLabel;
    if (roles.includes('ADMINISTRATEUR')) return 'Administrateur';
    if (roles.includes('GESTIONNAIRE')) return 'Gestionnaire';
    if (roles.includes('UTILISATEUR')) return 'Utilisateur';
    if (roles[0]) return String(roles[0]);
    return state.session ? 'Session live' : 'Session requise';
  }

  function userLabel() {
    if (mode !== 'live') return 'Démonstration';
    if (state.session && state.session.displayName) return state.session.displayName;
    return 'LIVE Monitoring';
  }

  function userInitials() {
    const label = userLabel();
    return label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SC';
  }

  function hasScopePermission(permission) {
    if (!permission) return true;
    if (mode !== 'live') return true;
    if (window.MonitoringRBAC && typeof window.MonitoringRBAC.has === 'function') {
      return window.MonitoringRBAC.has(permission);
    }
    const permissions = (state.session && state.session.permissions) || [];
    return permissions.includes(permission);
  }

  function periodContextHtml() {
    return `<section class="scope-period-context" aria-label="Période analysée">
      <div>
        <span>Période analysée</span>
        <strong>${escapeHtml(periodLabel({ preset: state.preset, from: state.from, to: state.to }))}</strong>
        <em class="scope-period-range">${escapeHtml((window.ScopePersonnelTemporal && window.ScopePersonnelTemporal.periodLabel({ preset: state.preset, year: state.year, month: state.month, quarter: state.quarter, from: state.from, to: state.to })) || '')}</em>
      </div>
      <div class="scope-period-controls">
        ${periodSelect('scope-preset', `
          <option value="YEAR" ${state.preset === 'YEAR' ? 'selected' : ''}>Année</option>
          <option value="QUARTER" ${state.preset === 'QUARTER' ? 'selected' : ''}>Trimestre</option>
          <option value="MONTH" ${state.preset === 'MONTH' ? 'selected' : ''}>Mois</option>
          <option value="CUSTOM" ${state.preset === 'CUSTOM' ? 'selected' : ''}>Personnalisée</option>
        `)}
        ${periodSelect('scope-year', Array.from({length: 9}, (_, i) => String(Number(state.year) - 6 + i)).map((y) => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${escapeHtml(y)}</option>`).join(''))}
        ${state.preset === 'QUARTER' ? periodSelect('scope-quarter', [1, 2, 3, 4].map((q) => `<option value="${q}" ${String(q) === String(state.quarter) ? 'selected' : ''}>T${q}</option>`).join('')) : ''}
        ${state.preset === 'MONTH' ? periodSelect('scope-month', ['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => `<option value="${i + 1}" ${String(i + 1) === String(Number(state.month)) ? 'selected' : ''}>${m}</option>`).join('')) : ''}
        ${state.preset === 'CUSTOM' ? `<label class="scope-period-date">Du <input id="scope-from" type="date" value="${escapeHtml(state.from)}"></label><label class="scope-period-date">Au <input id="scope-to" type="date" value="${escapeHtml(state.to)}"></label>` : ''}
      </div>
    </section>`;
  }

  function periodSelect(id, optionsHtml) {
    return `<label class="scope-select">
      <span class="visually-hidden">${id === 'scope-preset' ? 'Type de période' : id === 'scope-year' ? 'Année' : id === 'scope-quarter' ? 'Trimestre' : 'Mois'}</span>
      <select id="${id}" class="scope-select-control">${optionsHtml}</select>
    </label>`;
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
    const link = (item, currentPage) => `<a class="scope-nav-link" href="${item.href}" ${currentPage ? 'aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
    const navSubsection = (label, items) => items.length ? `<div class="scope-nav-subsection">
      <p>${escapeHtml(label)}</p>
      ${items.map((item) => link(item, item.current)).join('')}
    </div>` : '';
    const section = (label) => `<p class="scope-nav-section">${escapeHtml(label)}</p>`;
    const primaryLink = (href, label, current) => link({ href, label }, current);
    const reglagesOpen = state.openGroups.reglages === true || r.nav === 'reglages';
    const domainBlocks = model.domains.map((d) => {
      const expanded = state.openGroups[d.id] != null ? state.openGroups[d.id] : d.expanded;
      const isCurrent = r.domaine === d.id && !r.cible;
      const overview = `<a class="scope-nav-link" href="${d.href}" ${isCurrent ? 'aria-current="page"' : ''}>Vue d’ensemble</a>`;
      return `<div class="scope-nav-group${expanded ? '' : ' is-collapsed'}">
        <button type="button" class="scope-nav-group-head${isCurrent ? ' is-current' : ''}" data-nav-group="${escapeHtml(d.id)}" aria-expanded="${expanded ? 'true' : 'false'}">
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
          ${primaryLink('#/accueil', 'Accueil', r.screen === 'accueil')}
          ${section('Activité')}
          ${primaryLink('#/evenements', 'Événements', r.nav === 'exercices')}
          ${primaryLink('#/statistiques', 'Statistiques', r.screen === 'statistiques')}
          ${hasScopePermission('personnel:read') ? primaryLink('#/personnel', 'Personnel', r.nav === 'personnel') : ''}
          ${primaryLink('#/rapports', 'Rapports', r.nav === 'rapports')}
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
    const logout = mode === 'live'
      ? `<a class="scope-btn scope-btn-ghost" href="/auth/logout?returnTo=/">Déconnexion</a>`
      : '';
    return `
      <header class="scope-header${mode === 'live' ? ' live-mode' : ''}">
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
            <span class="scope-mode-pill">${mode === 'live' ? 'LIVE' : 'DEMO'}</span>
            <label class="scope-qual-toggle">
              <input type="checkbox" id="scope-include-qual" ${state.includeQualification ? 'checked' : ''}>
              Inclure les données de qualification
            </label>
            ${(state.alertCounts && Number(state.alertCounts.p0) > 0)
              ? `<a class="scope-alerts-count" href="#/vue" aria-label="À traiter, ${Number(state.alertCounts.p0)}">${escapeHtml(`À traiter · ${Number(state.alertCounts.p0)}`)}</a>`
              : ''}
            <div class="scope-user-block">
              <span class="scope-user-avatar" aria-hidden="true">${escapeHtml(userInitials())}</span>
              <div class="scope-user-text">
                <strong class="scope-user">${escapeHtml(userLabel())}</strong>
                ${mode === 'live' ? `<small>${escapeHtml(roleLabel())}</small>` : ''}
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
    const liveHref = `?mode=live${location.hash || '#/accueil'}`;
    if (params.get('authError') === '1') {
      const reason = params.get('reason') || 'callback';
      bits.push(`<div class="scope-banner warning" role="alert">
        <strong>Connexion Okta interrompue</strong>
        <div>Le callback SCOPE n’a pas pu créer la session (raison : ${escapeHtml(reason)}). Réessayez « Se connecter avec Okta ». Aucun jeton n’est injecté.</div>
      </div>`);
    }
    if (liveGate) {
      bits.push(`<div class="scope-banner warning" role="alertdialog">
        <strong>Connexion live demandée</strong>
        <div>Le paramètre URL ne suffit pas. Confirmez pour écrire dans PostgreSQL Monitoring. Les données de démonstration ne doivent pas être envoyées en production.</div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="scope-confirm-live">Confirmer le mode live</button>
          <button type="button" class="scope-btn" id="scope-stay-demo">Rester en démonstration</button>
        </div>
      </div>`);
    } else if (mode === 'live' && state.needOkta) {
      bits.push(`<div class="scope-banner warning" role="alertdialog">
        <strong>Session Okta requise</strong>
        <div>Le mode LIVE s’appuie sur la session institutionnelle du navigateur (cookie HttpOnly). Aucun jeton technique n’est injecté.</div>
        <div class="scope-actions">
          <a class="scope-btn scope-btn-primary" id="scope-okta-login" href="${escapeHtml(L.oktaLoginHref('/scope.html?mode=live'))}">Se connecter avec Okta</a>
        </div>
      </div>`);
    } else if (mode === 'live') {
      bits.push(`<div class="scope-banner live">Mode LIVE — PostgreSQL Monitoring, session Okta. Toute saisie est réelle.</div>`);
    } else {
      bits.push(`<div class="scope-banner demo">
        <strong>Mode démonstration</strong>
        <div>Mode démonstration — aucune écriture dans PostgreSQL Monitoring. Le personnel affiché est local et fictif.</div>
        <div class="scope-actions">
          <a class="scope-btn scope-btn-primary" id="scope-start-live" href="${escapeHtml(liveHref)}">Passer en mode LIVE</a>
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
        <h1>${escapeHtml(o.title || 'SCOPE')}</h1>
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

  function renderAccueil() {
    const dash = state.dashboard;
    if (state.dashboardError) {
      return `<div class="scope-crumb">Accueil</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'SCOPE', title: 'Centre de pilotage', context: 'Accueil', logo: true })}<div class="scope-card scope-placeholder"><p class="scope-state-error" role="alert">${escapeHtml(state.dashboardError)}</p></div></div>`;
    }
    if (!dash) {
      return `<div class="scope-crumb">Accueil</div><div class="scope-main">${pageHeaderHtml({ eyebrow: 'SCOPE', title: 'Centre de pilotage', context: 'Accueil', logo: true })}<div class="scope-card scope-placeholder"><p>${escapeHtml(L.loadingMessage('dashboard'))}</p></div></div>`;
    }
    const o = dash.officiel || {};
    const taux = o.analyticStatus === 'NON_EVALUABLE' && o.percentage == null ? 'Non évaluable' : L.formatTaux(o.percentage);
    const alerts = ((dash.alerts && dash.alerts.alerts) || []).filter((a) => a.level === 'P0').slice(0, 4);
    const graphs = dash.graphs || {};
    const C = (typeof window !== 'undefined' && window.ScopeCharts) || (typeof globalThis !== 'undefined' && globalThis.ScopeCharts);
    const evolutionCard = C ? C.renderChartCard(graphs.evolution, { size: { width: 640, height: 118 } }) : '';
    const planned = (state.list || []).filter((item) => item.evenement && item.evenement.statut === 'PLANIFIE').length;
    return `
      <div class="scope-crumb">Accueil</div>
      <div class="scope-main scope-home">
        ${pageHeaderHtml({ eyebrow: 'SCOPE', title: 'Centre de pilotage', context: periodLabel(dash.period), logo: true })}
        ${periodContextHtml()}
        <section class="scope-home-hero">
          <div>
            <p class="scope-eyebrow">Centre de pilotage</p>
            <h1>À traiter aujourd’hui</h1>
            <p>SCOPE présente les alertes métier, la période analysée et les accès principaux sans recalculer les KPI dans le navigateur.</p>
          </div>
          <div class="scope-home-status">
            <strong>${escapeHtml(String((dash.alerts && dash.alerts.counts && dash.alerts.counts.p0) || 0))}</strong>
            <span>action(s) P0</span>
          </div>
        </section>
        <div class="scope-dash-split">
          <div class="scope-card scope-inbox">
            <h2>Centre de pilotage</h2>
            ${alerts.length ? `<div class="scope-alert-list">${alerts.map((alert) => alertCardHtml(alert, { ack: false })).join('')}</div>` : '<div class="scope-empty">Aucune action prioritaire.</div>'}
          </div>
          ${evolutionCard || '<div class="scope-card scope-chart-card is-empty"><h2>Évolution du taux de participation</h2><p class="scope-empty scope-chart-empty">Aucune série officielle sur cette période.</p></div>'}
        </div>
        <section class="scope-card">
          <h2>Synthèse de l’activité</h2>
          <div class="scope-kpis">
            <article class="scope-kpi scope-kpi-main"><strong>${escapeHtml(taux)}</strong><span>Taux de participation</span><em>${escapeHtml(periodLabel(dash.period))}</em></article>
            <article class="scope-kpi"><strong>${escapeHtml(String(o.eventCount || 0))}</strong><span>Événements réalisés</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(String(planned))}</strong><span>Événements planifiés</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(String((dash.absencesNonExcusees && dash.absencesNonExcusees.count) || 0))}</strong><span>Absences non excusées</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(L.formatGap(o.gapPct) || 'Non évaluable')}</strong><span>Objectif / écart</span></article>
          </div>
        </section>
        <section class="scope-home-links">
          <a href="#/evenements">Événements</a>
          <a href="#/statistiques">Statistiques</a>
          <a href="#/personnel">Personnel</a>
          <a href="#/rapports">Rapports</a>
          <a href="#/reglages/objectifs">Objectifs</a>
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

  function renderListe() {
    const rows = state.list;
    const view = L.listViewState({
      ready: state.listReady,
      error: state.listError,
      count: rows.length
    });
    let body;
    if (view === 'error') {
      body = `<tr><td colspan="9"><div class="scope-empty scope-state-error" role="alert">${escapeHtml(state.listError || L.errorMessage('exercices'))}</div></td></tr>`;
    } else if (view === 'loading') {
      body = `<tr><td colspan="9"><div class="scope-loading-row" role="status">${escapeHtml(L.loadingMessage('exercices'))}</div></td></tr>`;
    } else if (view === 'empty') {
      body = `<tr><td colspan="9"><div class="scope-empty">${escapeHtml(L.emptyMessage('exercices'))}</div></td></tr>`;
    } else {
      body = rows.map((item) => {
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
        : `${statutBadge(ev.statut)}<span class="scope-mode-hint">${escapeHtml(L.modeLabel(mode))}</span>`;
      const attenduLegacy = item.legacy && ((item.legacy.payload_v67 && item.legacy.payload_v67.total_attendu) || item.legacy.nb_convoques);
      const presents = isLegacy && item.legacy
        ? `${item.legacy.nb_presents} / ${attenduLegacy}`
        : (ev.statut === 'REALISE' ? (item.compteurs.presents ?? '—') : '—');
      const attendusCell = isLegacy ? '—' : (mode === 'QUANTITATIF' ? (item.attendusInclus || '—') : (ev.population_figee ? item.attendusInclus : '—'));
      const horaire = [ev.heure_debut, ev.heure_fin].filter(Boolean).join('–') || '—';
      return `<tr>
        <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
        <td data-label="Heure">${escapeHtml(horaire)}</td>
        <td data-label="Code">${escapeHtml(ev.code_cours || ev.identifiant_externe || '—')}</td>
        <td data-label="Événement">${escapeHtml(ev.libelle)}</td>
        <td data-label="Domaine">${escapeHtml(domaineLabel(ev.domaine_code))}</td>
        <td data-label="Public">${escapeHtml(L.ciblesLabel(item.cibles))}</td>
        <td data-label="Effectif">${attendusCell}${presents !== '—' ? ` · ${escapeHtml(String(presents))}` : ''}${taux !== '—' ? ` · ${escapeHtml(taux)}` : ''}</td>
        <td data-label="État">${statutHtml}</td>
        <td data-label="Actions"><a class="scope-btn" href="${href}">${action}</a></td>
      </tr>`;
      }).join('');
    }

    return `
      <div class="scope-crumb">Événements · ${escapeHtml(state.year)}</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Activité', title: 'Événements', context: state.year, description: 'Liste opérationnelle des événements planifiés, réalisés, reportés ou annulés.', logo: true })}
        ${periodContextHtml()}
        <div class="scope-toolbar">
          <div class="scope-field">
            <label>Statut</label>
            <select id="filter-statut">
              <option value="tous">Tous</option>
              <option value="PLANIFIE">Planifié</option>
              <option value="REALISE">Réalisé</option>
              <option value="REPORTE">Reporté</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
          <div class="scope-field">
            <label>Domaine</label>
            <select id="filter-domaine">
              <option value="tous">Tous</option>
              ${state.referentiels.domaines.map((d) => `<option value="${d.code}">${escapeHtml(d.libelleAffiche || L.domaineAffiche(d.code))}</option>`).join('')}
            </select>
          </div>
          <button type="button" class="scope-btn scope-btn-primary" id="scope-new">Nouvel événement</button>
        </div>
        <p class="scope-mode-hint">La création manuelle reste disponible pour un événement ponctuel. Les imports sont regroupés dans Réglages → Importation.</p>
        <div class="scope-card scope-table-wrap">
          <table class="scope-table">
            <thead>
              <tr>
                <th>Date</th><th>Heure</th><th>Code</th><th>Événement</th>
                <th>Domaine</th><th>Public</th><th>Effectif</th><th>État</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function periodLabel(period) {
    if (!period) return state.year;
    if (period.preset === 'MONTH') return `${period.from.slice(5, 7)}.${period.from.slice(0, 4)}`;
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
      from: state.from,
      to: state.to
    }), qualQuery());
  }

  async function loadPersonnelDirectory() {
    if (mode !== 'live' || typeof client.listPersonnelDirectory !== 'function' || !canReadPersonnel()) {
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
            from: state.from,
            to: state.to
          })
        : { from: state.from, to: state.to, preset: state.preset, year: state.year };
      const payload = await client.listPersonnelDirectory({
        q: state.personnelQuery,
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
    if (mode !== 'live' || typeof client.getPersonneFiche !== 'function' || !canReadPersonnel()) {
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
    if (preview.lines) return preview.lines;
    return preview.rows || (preview.lignes || []).concat(preview.absents || []) || [];
  }

  function personnelDisplay() {
    return window.ScopePersonnelDisplay || null;
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
    const patch = state.personnelSync.decisions[row.rowId];
    return (patch && patch.decision) || row.decision || 'IGNORER';
  }

  function personnelDateOf(row) {
    const patch = state.personnelSync.decisions[row.rowId];
    return (patch && patch.dateEffet) || row.dateEffet || state.personnelSync.dateEffet || '';
  }

  function personnelDecisionSelect(row) {
    const current = personnelDecisionOf(row);
    let options = [];
    if (row.statut === 'ABSENT_DU_FICHIER' || row.statut === 'ABSENT_DU_NOUVEL_IMPORT') {
      options = [
        ['CONSERVER', 'Conserver'],
        ['CLOTURER', 'Clôturer'],
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
    } else if (row.statut === 'NOUVEAU' || row.statut === 'NEW_PERSON' || row.statut === 'NEW_JSP') {
      options = [['CREER', 'Créer'], ['IGNORER', 'Ignorer']];
    } else if (row.statut === 'INCHANGE' || row.statut === 'IDENTICAL') {
      options = [['IGNORER', 'Aucune']];
    } else {
      options = [['APPLIQUER', 'Appliquer'], ['IGNORER', 'Ignorer'], ['EXAMINER', 'Examiner']];
    }
    return `<select class="scope-sync-decision" data-sync-decision="${escapeHtml(row.rowId)}">
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
    return ['FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'cond VL', 'cond PL', 'JSP'];
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

  function personnelSortHeader(key, label) {
    const sort = state.personnelSort || {};
    const active = sort.key === key && sort.dir;
    const cls = active ? (sort.dir === 'desc' ? 'is-desc' : 'is-asc') : '';
    const aria = active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none';
    return `<th data-sort="${key}" data-personnel-sort="${key}" class="${cls}" aria-sort="${aria}"><span>${label}</span></th>`;
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
    return escapeHtml(labels.join(', '));
  }

  function personnelImportContextOptions() {
    return [
      ['GENERAL', 'Personnel général'],
      ['PAPR', 'PAPR'],
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
    const live = mode === 'live';
    const canRead = canReadPersonnel();
    const dir = state.personnelDirectory;
    const people = visiblePersonnelRows();
    const personnelView = L.listViewState({
      ready: state.personnelReady,
      error: state.personnelError,
      count: people.length
    });
    let peopleBody;
    if (personnelView === 'error') {
      peopleBody = `<tr><td colspan="9"><div class="scope-empty scope-state-error" role="alert">${escapeHtml(state.personnelError || L.errorMessage('personnel'))}</div></td></tr>`;
    } else if (personnelView === 'loading') {
      peopleBody = `<tr><td colspan="9"><div class="scope-loading-row" role="status">${escapeHtml(L.loadingMessage('personnel'))}</div></td></tr>`;
    } else if (personnelView === 'empty') {
      peopleBody = `<tr><td colspan="9"><div class="scope-empty">${escapeHtml(L.emptyMessage('personnes'))}</div></td></tr>`;
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
        return `<tr>
              <td data-label="NIP">${escapeHtml(p.nip || '—')}</td>
              <td data-label="GRADE">${escapeHtml(p.grade || '—')}</td>
              <td data-label="NOM">${escapeHtml(p.nom || '—')}</td>
              <td data-label="PRÉNOM">${escapeHtml(p.prenom || '—')}</td>
              <td data-label="OI">${escapeHtml(oiLabel || '—')}</td>
              <td data-label="SPÉCIALISATIONS">${personnelOtherAffectationsHtml(specLabels)}</td>
              <td data-label="ACTIF">${escapeHtml(formatPersonnelDateCell(dateActif))}</td>
              <td data-label="INACTIF">${escapeHtml(formatPersonnelDateCell(dateInactif))}</td>
              <td data-label="ACTIONS"><div class="scope-row-actions"><a class="scope-btn scope-btn-small" href="#/personnel/${escapeHtml(p.personneId)}">Fiche</a>${canManagePersonnel() ? `<details class="scope-row-more"><summary aria-label="Autres actions">⋯</summary><div class="scope-row-more-menu">${p.statutTemporel !== 'inactif' ? `<button type="button" data-inactivate-person="${escapeHtml(p.personneId)}" data-inactivate-nip="${escapeHtml(p.nip || '')}" data-inactivate-label="${escapeHtml([p.grade, p.prenom, p.nom].filter(Boolean).join(' '))}">Rendre inactif</button>` : `<button type="button" data-correct-person="${escapeHtml(p.personneId)}">Corriger la période</button>`}</div></details>` : ''}</div></td>
            </tr>`;
      }).join('');
    }
    const statutFilters = [
      ['actifs', 'Actifs'],
      ['inactifs', 'Inactifs'],
      ['tous', 'Tous']
    ];
    const oiOptions = oiFilterOptions();
    const specOptions = specializationFilterOptions();
    if (!live) {
      return `<div class="scope-card">
        <h2 style="margin-top:0">Personnel</h2>
        <p class="scope-mode-hint">SCOPE-PERSON-1 — fiche individuelle nominative. La liste et les taux individuels sont disponibles en mode LIVE uniquement. Aucun nominatif n’est inventé en démonstration.</p>
      </div>`;
    }
    if (!canRead) {
      return `<div class="scope-card">
        <h2 style="margin-top:0">Personnel</h2>
        <p class="scope-empty">La consultation des fiches individuelles exige la permission personnel:read. Le rôle en lecture agrégée n’y a pas accès.</p>
      </div>`;
    }
    return `<div class="scope-card scope-personnel-page">
      <header class="scope-personnel-head">
        <h2>Personnel</h2>
        <p>Annuaire nominatif. Les taux individuels restent dans la fiche.</p>
      </header>
      ${personnelPeriodControlsHtml()}
      ${personnelContextBannerHtml()}
      <div class="scope-personnel-toolbar">
        <div class="scope-field scope-personnel-search"><label for="personnel-q">Recherche</label>
          <input id="personnel-q" type="search" placeholder="Nom, prénom ou NIP" value="${escapeHtml(state.personnelQuery)}">
        </div>
        <div class="scope-personnel-filters">
          <div class="scope-field"><label for="personnel-oi">OI</label>
            ${oiFilterSelectHtml()}
          </div>
          <div class="scope-field"><label for="personnel-specialization">Spécialisation</label>
            <select id="personnel-specialization">
              <option value="">Toutes</option>
              ${specOptions.map((label) => `<option value="${escapeHtml(label)}" ${state.personnelSpecialization === label ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="scope-personnel-status" role="tablist" aria-label="Statut">
          ${statutFilters.map(([id, label]) => `<button type="button" class="scope-btn ${state.personnelStatut === id ? 'scope-btn-primary' : ''}" data-personnel-statut="${id}">${escapeHtml(label)}</button>`).join('')}
        </div>
        <div class="scope-personnel-import-action">
          <button type="button" class="scope-btn" id="scope-open-personnel-import">Importer du personnel</button>
        </div>
      </div>
      <p class="scope-personnel-count">${personnelView === 'loading' ? 'Chargement…' : (people.length + ' personne(s)')}${state.personnelSituationApplied ? ' — situation à la date' : ''}</p>
      <div class="scope-table-wrap">
        <table class="scope-table scope-person-table">
          <thead><tr>${personnelSortHeader('nip', 'NIP')}${personnelSortHeader('grade', 'GRADE')}${personnelSortHeader('nom', 'NOM')}${personnelSortHeader('prenom', 'PRÉNOM')}${personnelSortHeader('oi', 'OI')}${personnelSortHeader('specializations', 'SPÉCIALISATIONS')}${personnelSortHeader('actif', 'ACTIF')}${personnelSortHeader('inactif', 'INACTIF')}<th>ACTIONS</th></tr></thead>
          <tbody>
            ${peopleBody}
          </tbody>
        </table>
      </div>
      ${renderPersonnelHistoryPanel()}
      ${renderPersonnelInactivateModal()}
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

  function renderPersonnelInactivateModal(){
    const modal = state.personnelInactivate;
    if(!modal) return '';
    const temporal = window.ScopePersonnelTemporal;
    const plan = temporal && temporal.planInactivation && modal.date ? temporal.planInactivation(modal.date) : null;
    const lastActive = plan && plan.dernierJourActif
      ? ((window.ScopePersonnelDisplay && window.ScopePersonnelDisplay.formatPersonnelDate)
        ? window.ScopePersonnelDisplay.formatPersonnelDate(plan.dernierJourActif)
        : plan.dernierJourActif)
      : '—';
    return `<div class="scope-modal-backdrop" id="scope-inactivate-modal">
      <div class="scope-modal scope-modal-inactivate" role="dialog" aria-labelledby="scope-inactivate-title">
        <h3 id="scope-inactivate-title">${modal.mode === 'correct' ? 'Corriger l’inactivité' : 'Rendre la personne inactive'}</h3>
        <dl class="scope-inactivate-identity">
          <dt>Personne</dt>
          <dd>${escapeHtml(modal.label || '—')}</dd>
          <dt>NIP</dt>
          <dd>${escapeHtml(modal.nip || '—')}</dd>
        </dl>
        <label for="scope-inactivate-date">Date d’inactivité</label>
        <input id="scope-inactivate-date" type="date" required value="${escapeHtml(modal.date || '')}">
        <p class="scope-mode-hint">Premier jour où cette personne ne sera plus considérée comme active.</p>
        <p class="scope-inactivate-last">Dernier jour actif : <strong>${escapeHtml(lastActive)}</strong></p>
        <label for="scope-inactivate-comment">Commentaire</label>
        <input id="scope-inactivate-comment" type="text" value="${escapeHtml(modal.comment || '')}" placeholder="Facultatif">
        <div class="scope-modal-actions">
          <button type="button" class="scope-btn" id="scope-inactivate-cancel">Annuler</button>
          <button type="button" class="scope-btn scope-inactivate-confirm" id="scope-inactivate-confirm">Confirmer l’inactivation</button>
        </div>
      </div>
    </div>`;
  }


  function renderPersonnel(options) {
    const importMode = Boolean(options && options.importMode);
    const live = mode === 'live';
    const showImportPanel = importMode || state.personnelSync.panelOpen;
    const allowed = live && canManagePersonnel() && typeof client.previewPersonnelSync === 'function';
    const preview = state.personnelSync.preview;
    const rapport = state.personnelSync.rapport;
    const summary = (preview && (preview.importSummary || preview.summary)) || {};
    const rows = personnelVisibleRows(preview);
    const counts = (preview && (preview.counts || preview.summary)) || {};
    const display = personnelDisplay();
    const previewCanCommit = Boolean(preview && preview.canCommit !== false && personnelImportCount(counts, 'countErrors', 'ERROR') === 0
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
        ${pageHeaderHtml({ eyebrow: importMode ? 'Réglages / Importation' : 'Personnel', title: importMode ? 'Import du personnel' : 'Personnel', context: importMode ? 'Synchronisation CSV' : 'Annuaire et fiches individuelles', logo: true })}
        ${''}
        ${renderPersonnelDirectory()}
        ${showImportPanel ? `<div class="scope-card" style="margin-top:12px" id="scope-personnel-import-panel">
          <h2 style="margin-top:0">Import du personnel</h2>
          <p class="scope-mode-hint">Analyse comparative par NIP uniquement. Sélection, lecture et analyse ne modifient pas la base. La validation DB nécessite une action distincte.</p>
          ${live && state.personCount != null ? `<p><strong>${state.personCount}</strong> personne(s) nominative(s) en base SCOPE.</p>` : ''}
          ${!live ? '<p class="scope-empty">L’import du personnel est disponible en mode LIVE uniquement.</p>' : ''}
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
          ${previewCanCommit ? '<p>Aucune écriture tant que vous n’avez pas confirmé explicitement « Valider l’import ».</p>' : '<p class="scope-mode-hint">Validation bloquée : conflit, erreur ou date d’effet manquante.</p>'}
          <div class="scope-sync-filters" role="tablist">
            ${filters.map((item) => `<button type="button" class="scope-btn ${state.personnelSync.filter === item.id ? 'scope-btn-primary' : ''}" data-sync-filter="${item.id}">${escapeHtml(item.label)}${item.id !== 'CHANGEMENTS' && item.id !== 'TOUS' && item.count != null ? ` (${item.count})` : ''}</button>`).join('')}
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
                    <td data-label="Date d’effet"><input type="date" class="scope-sync-row-date" data-sync-date="${escapeHtml(row.rowId)}" value="${escapeHtml(personnelDateOf(row))}" ${row.statut === 'INCHANGE' || row.statut === 'IDENTICAL' ? 'disabled' : ''}></td>
                  </tr>
                  ${row.infos && row.infos.length && personnelLineModification(row).indexOf(row.infos[0]) < 0 ? `<tr class="scope-sync-detail"><td colspan="7">${escapeHtml((row.infos || []).join(' · '))}</td></tr>` : ''}
                `).join('') || `<tr><td colspan="7"><div class="scope-import-empty"><h4>${escapeHtml((emptyState && emptyState.title) || 'Aucune ligne dans ce filtre')}</h4><p>${escapeHtml((emptyState && emptyState.text) || '')}</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>` : ''}
        ${showImportPanel && rapport ? `<div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Import terminé</h3>
          <p>${rapport.summary ? `${rapport.summary.analysed || 0} lignes analysées · ${rapport.summary.mutations || 0} mutation(s)` : `${rapport.personsTouched || 0} personne(s) touchée(s) · ${rapport.assignmentsCreated || 0} affectation(s) créée(s)`}</p>
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

  function personEventsFiltered(fiche) {
    const statut = state.personneEventFilter || 'tout';
    const domaine = state.personneDomainFilter;
    return (fiche.evenements || []).filter((row) => {
      if (domaine) {
        const codes = domaine === 'FOSPEC' ? ['FOSPEC', 'PR', 'AUTO'] : [domaine];
        if (!codes.includes(row.domaine)) return false;
      }
      if (statut === 'presents') return row.statutParticipation === 'PRESENT' || row.statutParticipation === 'PERMUTATION';
      if (statut === 'excuses') return row.statutParticipation === 'ABSENT_EXCUSE';
      if (statut === 'non_excuses') return row.statutParticipation === 'ABSENT_NON_EXCUSE';
      if (statut === 'dispenses') return row.statutParticipation === 'DISPENSE';
      return true;
    });
  }

  function renderPersonne() {
    const live = mode === 'live';
    const fiche = state.personneFiche;
    const identite = fiche && fiche.identite;
    if (!live) {
      return `<div class="scope-crumb"><a href="#/personnel">Personnel</a></div>
        <div class="scope-main"><div class="scope-card"><p class="scope-empty">La fiche individuelle nominative est disponible en mode LIVE uniquement. Aucun événement nominatif n’est inventé en démonstration.</p></div></div>`;
    }
    if (!canReadPersonnel()) {
      return `<div class="scope-crumb"><a href="#/personnel">Personnel</a></div>
        <div class="scope-main"><div class="scope-card"><p class="scope-empty">Fiche individuelle réservée aux profils habilités (personnel:read).</p></div></div>`;
    }
    if (!fiche || !identite) {
      return `<div class="scope-crumb"><a href="#/personnel">Personnel</a></div>
        <div class="scope-main"><div class="scope-card"><p>Chargement de la fiche…</p></div></div>`;
    }
    const kpi = fiche.kpi || {};
    const vol = kpi.volumes || {};
    const status = kpi.analyticStatus || 'NON_EVALUABLE';
    const tauxText = status === 'NON_EVALUABLE' && kpi.percentage == null
      ? 'Non évaluable'
      : L.formatTaux(kpi.percentage);
    const numDen = kpi.denominator
      ? `${kpi.numerator ?? 0} / ${kpi.denominator}`
      : 'Aucune donnée nominative sur la période';
    const obj = fiche.objectif || {};
    const explain = fiche.explain || {};
    const exclusions = explain.exclusions || {};
    const graphs = fiche.graphs || {};
    const C = (typeof window !== 'undefined' && window.ScopeCharts)
      || (typeof globalThis !== 'undefined' && globalThis.ScopeCharts);
    const evolutionCard = C ? C.renderChartCard(graphs.evolution, { size: { width: 640, height: 128 } }) : '';
    const domainChart = C ? C.renderChartCard(graphs.domaines) : '';
    const childrenChart = C ? C.renderChartCard(graphs.children) : '';
    const compositionChart = C ? C.renderChartCard(graphs.composition) : '';
    const motifsChart = C ? C.renderChartCard(graphs.motifs) : '';
    const permutationChart = (C && vol.permutations && L.shouldRenderPermutations('DAP', graphs.permutations))
      ? C.renderChartCard(graphs.permutations)
      : '';
    const events = personEventsFiltered(fiche);
    const eventFilters = [
      ['tout', 'Tout'],
      ['presents', 'Présents'],
      ['excuses', 'Excusés'],
      ['non_excuses', 'Non excusés'],
      ['dispenses', 'Dispensés']
    ];
    const permNote = (vol.permutations && L.shouldRenderPermutations('DAP', graphs.permutations))
      ? `Présences : ${vol.presents} · dont permutations : ${vol.permutations}`
      : '';
    const motifs = kpi.motifs || {};
    const motifSum = Object.values(motifs).reduce((s, n) => s + Number(n || 0), 0);
    const rh = fiche.historiqueRh || {};
    const openGraph = state.graphExplainId && graphs[state.graphExplainId];
    const graphExplainHtml = C && openGraph ? C.renderGraphExplain(openGraph, explain) : '';

    return `
      <div class="scope-crumb"><a href="#/personnel">Personnel</a> · ${escapeHtml(identite.prenom)} ${escapeHtml(identite.nom)}</div>
      <div class="scope-main">
        <header class="scope-person-head">
          <h1>${escapeHtml(identite.prenom)} ${escapeHtml(identite.nom)}</h1>
          <p class="scope-person-meta">${escapeHtml(identite.nip || '—')} · ${escapeHtml(identite.grade || '—')} · ${escapeHtml((identite.oiActuel && identite.oiActuel.label) || '—')} · ${escapeHtml(identite.statutRh || '—')}</p>
          <p class="scope-person-period">Période analysée : ${escapeHtml(periodLabel(fiche.period))}</p>
          ${identite.archivee ? `<p class="scope-person-banner is-archive">${escapeHtml(identite.libelleStatut)}</p>` : ''}
          ${identite.conge ? `<p class="scope-person-banner is-conge">${escapeHtml(identite.conge.libelle)}</p>` : ''}
        </header>
        <div class="scope-kpis scope-person-kpis">
          <article class="scope-kpi scope-kpi-main">
            <strong>${escapeHtml(tauxText)}</strong>
            <span>Taux de participation</span>
            <em>${escapeHtml(numDen)}</em>
            <small>Nominatif uniquement · QUANTITATIF et LEGACY exclus</small>
            <span class="scope-status-pill ${escapeHtml(status)}">${escapeHtml(L.analyticStatusLabel(status))}</span>
            <button type="button" class="linkish" id="scope-explain-toggle">Comprendre ce chiffre</button>
          </article>
          <article class="scope-kpi"><strong>${escapeHtml(String(vol.attendus || 0))}</strong><span>Attendus</span></article>
          <article class="scope-kpi"><strong>${escapeHtml(String(vol.presents || 0))}</strong><span>Présents</span>${permNote ? `<small>${escapeHtml(permNote)}</small>` : ''}</article>
          <article class="scope-kpi"><strong>${escapeHtml(String(vol.excuses || 0))}</strong><span>Excusés</span></article>
          <article class="scope-kpi"><strong>${escapeHtml(String(vol.nonExcuses || 0))}</strong><span>Non excusés</span><small>Volume factuel — pas une alerte</small></article>
          <article class="scope-kpi"><strong>${escapeHtml(String(vol.dispenses || 0))}</strong><span>Dispensés</span><small>Hors dénominateur</small></article>
        </div>
        ${fiche.jsp && fiche.jsp.role ? `<div class="scope-card" style="margin-top:12px">
          <h2>${fiche.jsp.role === 'JEUNE' ? 'Participation JSP' : 'Participation comme moniteur JSP'}</h2>
          <p class="scope-mode-hint">${fiche.jsp.role === 'JEUNE'
            ? 'Taux calculé uniquement sur les événements JSP où cette personne était attendue comme jeune.'
            : 'Taux calculé uniquement sur les événements JSP où cette personne était attendue comme moniteur. Les exercices DPS/DAP n’y figurent pas.'}</p>
          <div class="scope-kpis">
            <article class="scope-kpi"><strong>${escapeHtml(fiche.jsp.participationJsp && fiche.jsp.participationJsp.rate != null ? `${fiche.jsp.participationJsp.rate} %` : '—')}</strong><span>Taux JSP</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(String((fiche.jsp.participationJsp && fiche.jsp.participationJsp.expected) || 0))}</strong><span>Attendus</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(String((fiche.jsp.participationJsp && fiche.jsp.participationJsp.present) || 0))}</strong><span>Présents</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(String((fiche.jsp.participationJsp && fiche.jsp.participationJsp.excused) || 0))}</strong><span>Excusés</span></article>
            <article class="scope-kpi"><strong>${escapeHtml(String((fiche.jsp.participationJsp && fiche.jsp.participationJsp.absent) || 0))}</strong><span>Absents</span></article>
          </div>
        </div>` : ''}
        ${state.explainOpen ? `<div class="scope-card scope-explain" id="scope-explain">
          <h2>Comprendre ce chiffre</h2>
          <dl>
            <dt>Période</dt><dd>${escapeHtml(fiche.period.from)} → ${escapeHtml(fiche.period.to)} (${escapeHtml(fiche.period.preset || 'YEAR')})</dd>
            <dt>Modes inclus</dt><dd>${escapeHtml(explain.modesInclus || 'NOMINATIF uniquement')}</dd>
            <dt>Événements inclus</dt><dd>${escapeHtml(String((explain.includedEvents || []).length))} nominatif(s) réalisé(s)</dd>
            <dt>Numérateur</dt><dd>${escapeHtml(String(kpi.numerator ?? 0))} (présents, permutations comprises)</dd>
            <dt>Dénominateur</dt><dd>${escapeHtml(String(kpi.denominator ?? 0))} (présents + excusés + non excusés)</dd>
            <dt>Dispensés exclus</dt><dd>${escapeHtml(String(vol.dispenses || exclusions.dispenses || 0))}</dd>
            <dt>Non renseignés</dt><dd>${escapeHtml(String(vol.nonRenseignes || 0))} — non présentés comme absences</dd>
            <dt>QUANTITATIF / LEGACY</dt><dd>Jamais attribués à cette personne</dd>
            <dt>Objectif</dt><dd>${escapeHtml(obj.message || 'Aucun objectif défini.')}</dd>
            <dt>Statut analytique</dt><dd>${escapeHtml(status)}${kpi.analyticStatusReason ? ` · ${escapeHtml(kpi.analyticStatusReason)}` : ''}</dd>
          </dl>
        </div>` : ''}
        <div class="scope-person-split">
          ${evolutionCard || `<div class="scope-card scope-chart-card is-empty"><h2>La participation de cette personne évolue-t-elle ?</h2><p class="scope-empty">Aucune série nominative sur cette période.</p></div>`}
          ${domainChart || ''}
        </div>
        ${graphExplainHtml}
        ${childrenChart || ''}
        <div class="scope-card scope-panel">
          <h2>Participation par domaine</h2>
          <div class="scope-domain-pills">
            ${(fiche.domaines || []).map((d) => `<button type="button" class="scope-btn ${state.personneDomainFilter === d.code ? 'scope-btn-primary' : ''}" data-person-domaine="${escapeHtml(d.code)}">${escapeHtml(d.libelle)} · ${d.eventCount ? escapeHtml(L.formatTaux(d.percentage)) : 'Non évaluable'}</button>`).join('')}
            ${state.personneDomainFilter ? '<button type="button" class="scope-btn" data-person-domaine="">Tous les domaines</button>' : ''}
          </div>
        </div>
        <div class="scope-card scope-table-wrap scope-panel">
          <h2>Historique des événements</h2>
          <p class="scope-mode-hint">Plus récent d’abord — lecture métier de la période courante, pas une chronologie RH.</p>
          <div class="scope-sync-filters">
            ${eventFilters.map(([id, label]) => `<button type="button" class="scope-btn ${state.personneEventFilter === id ? 'scope-btn-primary' : ''}" data-person-events="${id}">${escapeHtml(label)}</button>`).join('')}
          </div>
          <table class="scope-table">
            <thead><tr><th>Date</th><th>Domaine</th><th>Sous-domaine</th><th>OI à la date</th><th>Libellé</th><th>Statut</th><th>Motif</th><th></th></tr></thead>
            <tbody>
              ${events.map((ev) => `<tr>
                <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
                <td data-label="Domaine">${escapeHtml(domaineLabel(ev.domaine))}</td>
                <td data-label="Sous-domaine">${escapeHtml(ev.sousDomaine || '—')}</td>
                <td data-label="OI à la date">${escapeHtml(ev.oiAtDate || '—')}${ev.permutation && ev.oiAccueil ? `<small>Accueil ${escapeHtml(ev.oiAccueil)}</small>` : ''}</td>
                <td data-label="Libellé">${escapeHtml(ev.libelle)}</td>
                <td data-label="Statut">${escapeHtml(L.participationStatutLabel(ev.statutParticipation))}${ev.permutation ? ' · permutation' : ''}</td>
                <td data-label="Motif">${escapeHtml(ev.motif || '—')}</td>
                <td data-label="Action"><a class="scope-btn" href="${escapeHtml(ev.href)}">Événement</a></td>
              </tr>`).join('') || '<tr><td colspan="8">Aucun événement nominatif sur la période.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${compositionChart || motifsChart ? `<div class="scope-graph-grid">${compositionChart || ''}${motifsChart || ''}</div>` : ''}
        ${permutationChart || ''}
        <div class="scope-card">
          <h2>Motifs d’excuse</h2>
          <p>${motifSum ? Object.entries(motifs).filter(([, n]) => Number(n) > 0).map(([k, n]) => `${motifLabel(k)} : ${n}`).join(' · ') : 'Aucun motif d’excuse sur la période.'}</p>
          ${motifSum && vol.excuses != null ? `<p class="scope-mode-hint">Somme des motifs : ${motifSum} · absences excusées : ${vol.excuses}</p>` : ''}
        </div>
        <div class="scope-card scope-person-alerts">
          <h2>Alertes individuelles</h2>
          <p>Absences non excusées : <strong>${escapeHtml(String(vol.nonExcuses || 0))}</strong></p>
          <p class="scope-mode-hint">${escapeHtml((fiche.alertesPersonne && fiche.alertesPersonne.message) || 'Aucune alerte individuelle active.')}</p>
        </div>
        <details class="scope-card scope-details" ${state.personneRhOpen ? 'open' : ''} id="scope-person-rh">
          <summary>Historique administratif / affectations</summary>
          <p class="scope-mode-hint">Historique RH distinct des absences aux événements.</p>
          <ul class="scope-rh-list">
            ${(rh.periodes || []).map((row) => `<li><strong>${escapeHtml(L.formatDate(row.date_debut))}${row.date_fin ? ` – ${escapeHtml(L.formatDate(row.date_fin))}` : ' → en cours'}</strong> · ${escapeHtml(rhTypeLabel(row.type, row.motif))}${row.motif && row.type !== 'INDISPONIBLE' ? ` · ${escapeHtml(row.motif)}` : ''}</li>`).join('') || '<li>Aucune période RH.</li>'}
          </ul>
          <h3>Affectations</h3>
          <ul class="scope-rh-list">
            ${(rh.affectations || []).map((row) => `<li><strong>${escapeHtml(L.formatDate(row.dateDebut))}${row.dateFin ? ` – ${escapeHtml(L.formatDate(row.dateFin))}` : ' → en cours'}</strong> · ${escapeHtml(row.label || '—')}</li>`).join('') || '<li>Aucune affectation.</li>'}
          </ul>
        </details>
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
    return `<button type="button" class="scope-btn" data-report-event="${escapeHtml(id)}">Générer le rapport</button>`;
  }

  function renderRapports() {
    const form = state.reportForm;
    const roots = ['FOBA', 'FOCA', 'DPS', 'DAP', 'FOSPEC', 'JSP'];
    const targetDomaines = (state.referentiels.domaines || []).map((d) => d.code);
    const cibles = (state.referentiels.cibles || []).filter((c) => c.domaineCode === form.domaine);
    const events = (state.list || []).slice(0, 40);
    const demo = mode !== 'live';
    return `
      <div class="scope-crumb">Rapports</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Production', title: 'Rapports', context: 'PDF serveur', description: 'Aperçu et téléchargement issus du même document REPORT-1.', logo: true })}
        ${periodContextHtml()}
        <div class="scope-card">
          <h2 style="margin-top:0">Rapports</h2>
          <p class="scope-mode-hint">SCOPE-REPORT-1 — génération serveur. L’aperçu affiche exactement le PDF qui sera téléchargé. Aucun chiffre n’est recalculé dans le navigateur.</p>
          ${demo ? `<p class="scope-mode-hint">La génération PDF est disponible en mode LIVE uniquement.</p>` : ''}
          <div class="scope-report-grid">
            <div class="scope-field"><label>Type de rapport</label>
              <select id="report-kind">
                <option value="PERIOD" ${form.kind === 'PERIOD' ? 'selected' : ''}>Période SDIS</option>
                <option value="DOMAIN" ${form.kind === 'DOMAIN' ? 'selected' : ''}>Domaine</option>
                <option value="TARGET" ${form.kind === 'TARGET' ? 'selected' : ''}>Cible / OI</option>
                <option value="EVENT" ${form.kind === 'EVENT' ? 'selected' : ''}>Événement</option>
              </select>
            </div>
            ${form.kind === 'DOMAIN' || form.kind === 'TARGET' ? `<div class="scope-field"><label>Domaine</label>
              <select id="report-domaine">
                ${(form.kind === 'DOMAIN' ? roots : targetDomaines).map((code) => `<option value="${escapeHtml(code)}" ${form.domaine === code ? 'selected' : ''}>${escapeHtml(domaineLabel(code))}</option>`).join('')}
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
            <button type="button" class="scope-btn scope-btn-primary" id="report-generate" ${demo ? 'disabled' : ''}>Générer le rapport</button>
          </div>
        </div>
      </div>
    `;
  }

  function objectifPorteeLabel(row) {
    if (row.scope === 'GLOBAL') return 'Global';
    if (row.scope === 'DOMAINE') return `Domaine ${domaineLabel(row.domaineCode)}`;
    const cible = state.referentiels.cibles.find((c) => c.cibleId === row.cibleId);
    if (cible) return `${domaineLabel(cible.domaineCode)} / ${cible.niveauCode}`;
    return row.cibleId ? `Cible ${row.cibleId.slice(0, 8)}` : 'Cible';
  }

  function renderObjectifs() {
    const form = state.objectifForm;
    const cibles = state.referentiels.cibles.filter((c) => c.domaineCode === form.domaineCode);
    const rows = state.objectifs || [];
    const action = state.objectifAction;
    const focus = rows.find((row) => row.objectifId === state.objectifFocusId);
    return `
      <div class="scope-crumb">Réglages / Objectifs</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages / Application', title: 'Objectifs', context: 'Référentiel temporel', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Objectifs de participation</h2>
          <p class="scope-mode-hint">Référentiel temporel du KPI officiel SCOPE (nominatif + quantitatif réalisé). Un changement de seuil ouvre une nouvelle période : l’historique n’est pas réécrit. Aucun objectif réel du SDIS n’est proposé ici.</p>
          <div class="scope-actions" style="margin:12px 0">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-add">Ajouter</button>
          </div>
          <div class="scope-table-wrap">
            <table class="scope-table">
              <thead><tr><th>Portée</th><th>Seuil</th><th>Début</th><th>Fin</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                ${rows.map((row) => `
                  <tr>
                    <td data-label="Portée">${escapeHtml(objectifPorteeLabel(row))}</td>
                    <td data-label="Seuil">${escapeHtml(L.formatTaux(row.thresholdPct))}</td>
                    <td data-label="Début">${escapeHtml(L.formatDate(row.dateDebut))}</td>
                    <td data-label="Fin">${row.dateFin ? escapeHtml(L.formatDate(row.dateFin)) : 'Ouverte'}</td>
                    <td data-label="Statut">${escapeHtml(row.statut === 'NEUTRALISE' ? 'Neutralisé' : row.statut === 'CLOTURE' ? 'Clôturé' : 'Ouvert')}</td>
                    <td data-label="Actions">
                      ${row.actif && !row.dateFin ? `<button type="button" class="scope-btn" data-obj-cloturer="${row.objectifId}">Clôturer</button>` : ''}
                      ${row.actif ? `<button type="button" class="scope-btn" data-obj-periode="${row.objectifId}">Nouvelle période</button>` : ''}
                      ${row.actif ? `<button type="button" class="scope-btn" data-obj-neutraliser="${row.objectifId}">Neutraliser</button>` : ''}
                    </td>
                  </tr>
                `).join('') || `<tr><td colspan="6">${escapeHtml(L.emptyMessage('objectifs'))}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        ${action === 'create' ? `
        <div class="scope-card" style="margin-top:16px;max-width:640px">
          <h3 style="margin-top:0">Ajouter un objectif</h3>
          <div class="scope-field"><label>Portée</label>
            <select id="obj-portee">
              <option value="GLOBAL" ${form.portee === 'GLOBAL' ? 'selected' : ''}>Global</option>
              <option value="DOMAINE" ${form.portee === 'DOMAINE' ? 'selected' : ''}>Domaine</option>
              <option value="CIBLE" ${form.portee === 'CIBLE' ? 'selected' : ''}>Cible</option>
            </select>
          </div>
          ${form.portee !== 'GLOBAL' ? `<div class="scope-field" style="margin-top:8px"><label>Domaine</label>
            <select id="obj-domaine">${state.referentiels.domaines.map((d) => `<option value="${d.code}" ${d.code === form.domaineCode ? 'selected' : ''}>${escapeHtml(d.libelleAffiche || L.domaineAffiche(d.code))}</option>`).join('')}</select>
          </div>` : ''}
          ${form.portee === 'CIBLE' ? `<div class="scope-field" style="margin-top:8px"><label>Cible</label>
            <select id="obj-cible">${cibles.map((c) => `<option value="${c.cibleId}" ${c.cibleId === form.cibleId ? 'selected' : ''}>${escapeHtml(L.niveauAffiche(c.domaineCode, c.niveauCode))}</option>`).join('')}</select>
          </div>` : ''}
          <div class="scope-field" style="margin-top:8px"><label>Seuil %</label><input id="obj-seuil" type="number" min="0" max="100" step="0.1" value="${escapeHtml(form.seuilPct)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Date de début</label><input id="obj-debut" type="date" value="${escapeHtml(form.dateDebut)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Date de fin (facultative)</label><input id="obj-fin" type="date" value="${escapeHtml(form.dateFin)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Commentaire</label><textarea id="obj-commentaire">${escapeHtml(form.commentaire)}</textarea></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-save">Enregistrer</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div>` : ''}
        ${action === 'cloturer' && focus ? `
        <div class="scope-card" style="margin-top:16px;max-width:640px">
          <h3 style="margin-top:0">Clôturer la période</h3>
          <p>${escapeHtml(objectifPorteeLabel(focus))} · ${escapeHtml(L.formatTaux(focus.thresholdPct))}</p>
          <div class="scope-field"><label>Date de fin</label><input id="obj-cloture-date" type="date" value="${escapeHtml(form.dateFin || form.dateDebut)}"></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-cloture-save">Clôturer</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div>` : ''}
        ${action === 'periode' && focus ? `
        <div class="scope-card" style="margin-top:16px;max-width:640px">
          <h3 style="margin-top:0">Préparer une nouvelle période</h3>
          <p>La période précédente sera clôturée la veille. L’historique conserve l’ancien seuil.</p>
          <div class="scope-field"><label>Nouveau début</label><input id="obj-periode-debut" type="date" value="${escapeHtml(form.dateDebut)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Nouveau seuil %</label><input id="obj-periode-seuil" type="number" min="0" max="100" step="0.1" value="${escapeHtml(form.seuilPct)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Fin (facultative)</label><input id="obj-periode-fin" type="date" value="${escapeHtml(form.dateFin)}"></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="obj-periode-save">Créer la période</button>
            <button type="button" class="scope-btn" id="obj-cancel">Annuler</button>
          </div>
        </div>` : ''}
      </div>
    `;
  }

  function renderNouveau() {
    const domaine = state.domaineForm || 'DPS';
    const cibles = state.referentiels.cibles.filter((c) => c.domaineCode === domaine);
    const suggestion = state.modeSuggestion;
    const chosen = state.modeChoice;
    const requireExplicit = Boolean(suggestion && suggestion.requireExplicit);
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

  function renderFiche() {
    const fiche = state.fiche;
    if (!fiche) return `<div class="scope-main"><div class="scope-empty">Événement introuvable.</div></div>`;
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
    const previewBlock = mode === 'QUANTITATIF' ? '' : (state.preview ? renderPreviewList() : '');
    const isLegacy = ev.origine === 'LEGACY_AGGREGATED';
    const legacy = fiche.legacy;
    const legacyPct = L.legacyTauxFromRow(legacy);
    const legacyBlock = isLegacy && legacy ? `
        <div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Historique agrégé</h3>
          <p style="margin:0 0 8px;color:var(--scope-muted)">Non nominatif — ces chiffres ne sont jamais mélangés au taux SCOPE.</p>
          <dl class="scope-meta">
            <div><dt>Présents</dt><dd>${escapeHtml(String(legacy.nb_presents ?? '—'))} / ${escapeHtml(String((legacy.payload_v67 && legacy.payload_v67.total_attendu) || legacy.nb_convoques || '—'))}</dd></div>
            <div><dt>Taux legacy</dt><dd>${escapeHtml(L.formatTaux(legacyPct))}</dd></div>
            <div><dt>Comptabilisé</dt><dd>${legacy.payload_v67 && legacy.payload_v67.a_comptabiliser ? 'Oui' : 'Non'}</dd></div>
            <div><dt>Permutation</dt><dd>${escapeHtml(String((legacy.payload_v67 && legacy.payload_v67.nb_permutation) ?? '—'))}</dd></div>
          </dl>
        </div>` : '';
    const qty = mode === 'QUANTITATIF';
    const saisie = fiche.saisieQuantitative;
    const extraActions = qty && ev.statut === 'PLANIFIE'
      ? '<button type="button" class="scope-btn" id="convert-nominatif">Passer en nominatif</button>'
      : '';
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)}</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">${escapeHtml(ev.libelle)}</h2>
          <dl class="scope-meta">
            <div><dt>Date</dt><dd>${escapeHtml(L.formatDate(ev.date))}</dd></div>
            <div><dt>Domaine</dt><dd>${escapeHtml(domaineLabel(ev.domaine_code))}</dd></div>
            <div><dt>Cible(s)</dt><dd>${escapeHtml(L.ciblesLabel(ciblesOf(fiche)))}</dd></div>
            <div><dt>Statut</dt><dd>${isLegacy ? '<span class="scope-badge"><span class="scope-dot LEGACY"></span>Historique agrégé</span>' : statutBadge(ev.statut)}</dd></div>
            <div><dt>Mode</dt><dd>${escapeHtml(L.modeLabel(mode))}</dd></div>
            <div><dt>Version</dt><dd>${escapeHtml(String(ev.version))}</dd></div>
            ${qty ? '' : `<div><dt>Population</dt><dd>${isLegacy ? 'Aucune (legacy)' : (ev.population_figee ? 'Figée' : (state.preview ? 'Preview prête' : 'Non générée'))}</dd></div>`}
          </dl>
          ${cta ? `<div class="scope-actions"><button type="button" class="scope-btn scope-btn-primary" data-cta="${cta.action}">${escapeHtml(cta.label)}</button>${extraActions}${ev.statut !== 'ANNULE' ? '<button type="button" class="scope-btn" id="cancel-event">Annuler l’événement</button>' : ''}${reportButton(ev.evenement_id)}</div>` : `<div class="scope-actions">${!isLegacy && ev.statut !== 'ANNULE' ? `${extraActions}<button type="button" class="scope-btn" id="cancel-event">Annuler l’événement</button>` : ''}${reportButton(ev.evenement_id)}</div>`}
        </div>
        ${qty && saisie ? volumesBlock(saisie, { taux: fiche.compteurs, officiel: false }) : ''}
        ${legacyBlock}
        ${previewBlock}
      </div>
      ${state.modal === 'convert-nominatif' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Passer en nominatif</h3>
        <p>Les volumes quantitatifs de cet événement seront supprimés. Cette action n’est possible qu’avant clôture.</p>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="convert-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="convert-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
    `;
  }

  function previewRowsHtml(rows) {
    return rows.length ? rows.map((p) => `
      <tr>
        <td data-label="Nom">${escapeHtml(`${p.nom} ${p.prenom}`)}</td>
        <td data-label="NIP">${escapeHtml(p.nip)}</td>
        <td data-label="Cible">${escapeHtml((p.cibles || []).map((c) => c.niveauCode || c).join(' · ') || 'Exception')}</td>
        <td data-label="Motif">${escapeHtml(p.motifInclusion === 'exception_ajout' ? 'Ajout manuel' : (p.jspRole === 'MONITEUR' ? 'Moniteur JSP' : p.jspRole === 'JEUNE' ? 'Jeune JSP' : 'Affectation'))}</td>
        <td data-label="Action"><button type="button" class="scope-btn" data-retrait="${p.personneId}">Retirer</button></td>
      </tr>
    `).join('') : `<tr><td colspan="5"><div class="scope-empty">${escapeHtml(L.emptyMessage('attendus'))}</div></td></tr>`;
  }

  function renderPreviewList() {
    const people = (state.preview.personnes || []).filter((p) => !state.pendingRetraits.includes(p.personneId));
    const extras = state.pendingExceptions;
    const rows = people.concat(extras);
    const jeunes = ((state.preview && state.preview.jeunes) || people.filter((p) => p.jspRole === 'JEUNE')).filter((p) => !state.pendingRetraits.includes(p.personneId));
    const moniteurs = ((state.preview && state.preview.moniteurs) || people.filter((p) => p.jspRole === 'MONITEUR')).filter((p) => !state.pendingRetraits.includes(p.personneId));
    const splitJsp = Boolean(jeunes.length || moniteurs.length);
    const body = previewRowsHtml(rows);
    return `
      <div class="scope-card" style="margin-top:12px">
        <h3 style="margin-top:0">Attendus générés · ${rows.length}${splitJsp ? ` · jeunes ${jeunes.length} · moniteurs ${moniteurs.length}` : ''}</h3>
        <div class="scope-toolbar">
          <div class="scope-field" style="min-width:220px">
            <label>Ajouter une personne</label>
            <input id="preview-q" type="search" placeholder="Nom ou NIP" value="${escapeHtml(state.personQuery)}">
          </div>
        </div>
        ${state.personHits.length ? `<div class="scope-card" style="margin-bottom:8px">${state.personHits.map((p) => `
          <div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--scope-line)">
            <span>${escapeHtml(p.nom)} ${escapeHtml(p.prenom)} · ${escapeHtml(p.nip)}</span>
            <button type="button" class="scope-btn" data-add-ex="${p.personne_id}">Ajouter</button>
          </div>`).join('')}</div>` : (state.personQuery ? `<div class="scope-empty">${escapeHtml(L.emptyMessage('personnes'))}</div>` : '')}
        ${splitJsp ? `
        <h3 style="margin-top:16px">JEUNES JSP · ${jeunes.length}</h3>
        <div class="scope-table-wrap">
          <table class="scope-table">
            <thead><tr><th>Nom</th><th>NIP</th><th>Cible</th><th>Inclusion</th><th></th></tr></thead>
            <tbody>${previewRowsHtml(jeunes)}</tbody>
          </table>
        </div>
        <h3 style="margin-top:16px">MONITEURS JSP · ${moniteurs.length}</h3>
        <div class="scope-table-wrap">
          <table class="scope-table">
            <thead><tr><th>Nom</th><th>NIP</th><th>Cible</th><th>Inclusion</th><th></th></tr></thead>
            <tbody>${previewRowsHtml(moniteurs)}</tbody>
          </table>
        </div>
        ${extras.length ? `<h3 style="margin-top:16px">Ajouts manuels · ${extras.length}</h3>
        <div class="scope-table-wrap">
          <table class="scope-table">
            <thead><tr><th>Nom</th><th>NIP</th><th>Cible</th><th>Inclusion</th><th></th></tr></thead>
            <tbody>${previewRowsHtml(extras)}</tbody>
          </table>
        </div>` : ''}` : `<div class="scope-table-wrap">
          <table class="scope-table">
            <thead><tr><th>Nom</th><th>NIP</th><th>Cible</th><th>Inclusion</th><th></th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>`}
        <p style="color:var(--scope-muted);font-size:12px">Le gel calcule la population côté serveur. Les ajouts et retraits préparés ici sont appliqués ensuite, sans envoyer une liste nominative comme source de vérité. Les taux jeunes JSP et moniteurs JSP restent distincts.</p>
      </div>
    `;
  }

  function renderSaisie() {
    const fiche = state.fiche;
    if (!fiche) return `<div class="scope-main"><div class="scope-empty">Événement introuvable.</div></div>`;
    const ev = fiche.evenement;
    if (eventMode(ev) === 'QUANTITATIF') return renderSaisieQuantitative();
    const c = counters();
    const niveaux = [...new Set(state.saisie.map((r) => r.cible).filter((x) => x && x !== '—'))];
    const filtered = state.cibleFilter === 'tous' ? state.saisie : state.saisie.filter((r) => r.cible === state.cibleFilter || (r.cibles || []).includes(state.cibleFilter));
    const disabledCloture = L.clotureDisabled(c);
    const enc = (fiche.encadrement || []).map((p) => {
      const person = personOf(fiche, p.personne_id);
      return `${person ? person.nom + ' ' + person.prenom : p.personne_id} · ${L.ROLE_LABELS[p.role] || p.role}`;
    });
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Saisie</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">${escapeHtml(ev.libelle)}</h2>
          <p style="color:var(--scope-muted);margin-top:0">${escapeHtml(L.formatDate(ev.date))} · ${escapeHtml(domaineLabel(ev.domaine_code))} · ${escapeHtml(L.ciblesLabel(ciblesOf(fiche)))}</p>
          <div class="scope-kpis">
            <div class="scope-kpi"><strong>${c.present}</strong><span>Présents</span></div>
            <div class="scope-kpi"><strong>${c.excuse}</strong><span>Excusés</span></div>
            <div class="scope-kpi"><strong>${c.absent}</strong><span>Absents</span></div>
            <div class="scope-kpi"><strong>${c.dispense}</strong><span>Dispensés</span></div>
            <div class="scope-kpi"><strong>${c.open}</strong><span>À renseigner</span></div>
          </div>
          <div class="scope-actions">
            <button type="button" class="scope-btn" id="all-present">Tout présent</button>
            <button type="button" class="scope-btn scope-btn-primary" id="save-part">Enregistrer</button>
            <button type="button" class="scope-btn" id="cloturer" ${disabledCloture ? 'disabled' : ''}>Clôturer</button>
          </div>
        </div>
        ${niveaux.length > 1 ? `<div class="scope-chips">
          <button type="button" data-cible-filter="tous" aria-pressed="${state.cibleFilter === 'tous'}">Tous</button>
          ${niveaux.map((n) => `<button type="button" data-cible-filter="${escapeHtml(n)}" aria-pressed="${state.cibleFilter === n}">${escapeHtml(n)}</button>`).join('')}
        </div>` : ''}
        ${(() => {
          const isJsp = String((ev.domaine_code || ev.domaineCode || '')).toUpperCase() === 'JSP';
          const jeunes = filtered.filter((row) => row.jspRole === 'JEUNE');
          const moniteurs = filtered.filter((row) => row.jspRole === 'MONITEUR');
          const autres = filtered.filter((row) => row.jspRole !== 'JEUNE' && row.jspRole !== 'MONITEUR');
          if (!isJsp || !(jeunes.length || moniteurs.length)) {
            return `<div class="scope-card" style="margin-top:12px">${filtered.length ? renderSaisieRows(filtered) : `<div class="scope-empty">${escapeHtml(L.emptyMessage('attendus'))}</div>`}</div>`;
          }
          return `
        <div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">JEUNES JSP · ${jeunes.length}</h3>
          ${jeunes.length ? renderSaisieRows(jeunes) : `<div class="scope-empty">Aucun jeune attendu.</div>`}
        </div>
        <div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">MONITEURS JSP · ${moniteurs.length}</h3>
          ${moniteurs.length ? renderSaisieRows(moniteurs) : `<div class="scope-empty">Aucun moniteur attendu.</div>`}
        </div>
        ${autres.length ? `<div class="scope-card" style="margin-top:12px"><h3 style="margin-top:0">Autres attendus · ${autres.length}</h3>${renderSaisieRows(autres)}</div>` : ''}`;
        })()}
        <details class="scope-details scope-card" style="margin-top:12px" ${state.encadrementOpen ? 'open' : ''}>
          <summary>Encadrement</summary>
          <p style="color:var(--scope-muted);font-size:13px">Hors taux principal. Une personne déjà attendue ne peut pas être ajoutée une seconde fois.</p>
          ${enc.length ? `<ul>${enc.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p>Aucun encadrement.</p>'}
          <div class="scope-toolbar">
            <div class="scope-field"><label>Rôle</label>
              <select id="enc-role">
                <option value="FORMATEUR">Formateur</option>
                <option value="SURVEILLANT">Surveillant</option>
                <option value="AUXILIAIRE">Auxiliaire</option>
              </select>
            </div>
            <div class="scope-field" style="min-width:220px"><label>Personne</label>
              <input id="enc-q" type="search" placeholder="Nom ou NIP">
            </div>
          </div>
          <div id="enc-hits"></div>
        </details>
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
            <a class="scope-btn" href="#/exercices/${escapeHtml(ev.evenement_id)}">Retour</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderSaisieRows(rows) {
    const isDap = state.fiche && state.fiche.evenement && state.fiche.evenement.domaine_code === 'DAP';
    const statuses = [['PRESENT', 'Présent'], ['ABSENT_EXCUSE', 'Excusé'], ['ABSENT_NON_EXCUSE', 'Absent'], ['DISPENSE', 'Dispensé']];
    if (isDap) statuses.push(['PERMUTATION', 'Permutation']);
    return `
      <div class="scope-table-wrap scope-saisie-desktop">
        <table class="scope-table">
          <thead><tr><th>Nom</th><th>NIP</th><th>Cible</th><th>Présence</th></tr></thead>
          <tbody>
            ${rows.map((row) => `<tr data-pid="${row.personneId}">
              <td data-label="Nom">${escapeHtml(row.nom)}</td>
              <td data-label="NIP">${escapeHtml(row.nip)}</td>
              <td data-label="Cible">${escapeHtml(row.cible)}</td>
              <td data-label="Présence">
                <div class="scope-status-row">
                  ${statuses.map(([v, l]) => `
                    <button type="button" data-status="${v}" aria-pressed="${row.statut === v}">${l}</button>
                  `).join('')}
                </div>
                ${row.statut === 'ABSENT_EXCUSE' ? `<select data-motif style="margin-top:6px;height:36px">
                  <option value="">Motif</option>
                  ${(L.motifsForRow ? L.motifsForRow(row) : L.MOTIFS).map((m) => `<option value="${m.value}" ${row.motifAbsence === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
                </select>` : ''}
                ${row.statut === 'ABSENT_EXCUSE' && row.motifAbsence === 'AUTRE' ? `<input data-comment type="text" placeholder="Commentaire obligatoire" value="${escapeHtml(row.commentaire)}" style="margin-top:6px;height:36px;width:100%">` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderRealise() {
    const fiche = state.fiche;
    const ev = fiche.evenement;
    const mode = eventMode(ev);
    const t = fiche.compteurs || {};
    const rows = state.saisie;
    if (mode === 'QUANTITATIF') {
      const saisie = fiche.saisieQuantitative || {};
      return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Réalisé</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">${escapeHtml(ev.libelle)}</h2>
          <dl class="scope-meta">
            <div><dt>Date</dt><dd>${escapeHtml(L.formatDate(ev.date))}</dd></div>
            <div><dt>Domaine</dt><dd>${escapeHtml(domaineLabel(ev.domaine_code))}</dd></div>
            <div><dt>Cible(s)</dt><dd>${escapeHtml(L.ciblesLabel(ciblesOf(fiche)))}</dd></div>
            <div><dt>Statut</dt><dd>${statutBadge(ev.statut)}</dd></div>
            <div><dt>Mode</dt><dd>Quantitatif</dd></div>
          </dl>
          <p style="font-size:28px;margin:16px 0 0">${escapeHtml(L.formatTaux(t.percentage))}</p>
          <p style="color:var(--scope-muted);margin-top:4px">Taux officiel SCOPE</p>
          <p style="color:var(--scope-muted);margin-top:4px">${escapeHtml(String(t.numerator ?? '—'))} / ${escapeHtml(String(t.denominator ?? '—'))}</p>
          <button type="button" class="scope-btn" id="reopen">Réouvrir</button>
          <button type="button" class="scope-btn" id="cancel-event">Annuler l’événement</button>
          ${reportButton(ev.evenement_id)}
        </div>
        ${volumesBlock(saisie, { taux: t, officiel: true })}
        <details class="scope-card scope-details" style="margin-top:12px">
          <summary>Historique des corrections</summary>
          ${(fiche.journal || []).length ? `<ul>${fiche.journal.map((j) => `<li>${escapeHtml(j.action)} · ${escapeHtml(j.commentaire || '')}</li>`).join('')}</ul>` : '<p>Aucune correction.</p>'}
        </details>
      </div>
      ${state.modal === 'reopen' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Réouvrir l’événement</h3>
        <p>La séance redevient planifiée et sort du KPI tant qu’elle n’est pas reclôturée. Les volumes sont conservés.</p>
        <div class="scope-field"><label>Motif</label><textarea id="reopen-motif"></textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="reopen-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="reopen-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
      ${state.modal === 'cancel-event' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Annuler l’événement</h3>
        <p>L’événement passera à Annulé. Il n’entre plus dans le taux officiel.</p>
        <div class="scope-field"><label>Motif</label><textarea id="cancel-motif">Qualification SCOPE</textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="cancel-ok">Confirmer l’annulation</button>
          <button type="button" class="scope-btn" id="cancel-dismiss">Retour</button>
        </div>
      </div></div>` : ''}
    `;
    }
    return `
      <div class="scope-crumb">Événements / ${escapeHtml(ev.libelle)} / Réalisé</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">${escapeHtml(ev.libelle)}</h2>
          <p style="font-size:28px;margin:8px 0 0">${escapeHtml(L.formatTaux(t.percentage))}</p>
          <p style="color:var(--scope-muted);margin-top:4px">Taux de participation officiel</p>
          ${fiche.jsp && (fiche.jsp.tauxJeunes || fiche.jsp.tauxMoniteurs) ? `<p class="scope-mode-hint">Jeunes JSP : ${escapeHtml(L.formatTaux(fiche.jsp.tauxJeunes && fiche.jsp.tauxJeunes.percentage))} · Moniteurs JSP : ${escapeHtml(L.formatTaux(fiche.jsp.tauxMoniteurs && fiche.jsp.tauxMoniteurs.percentage))}</p>` : ''}
          <div class="scope-kpis">
            <div class="scope-kpi"><strong>${t.presents ?? 0}</strong><span>Présents</span></div>
            <div class="scope-kpi"><strong>${t.excuses ?? 0}</strong><span>Absents excusés</span></div>
            <div class="scope-kpi"><strong>${t.nonExcuses ?? 0}</strong><span>Absents non excusés</span></div>
            <div class="scope-kpi"><strong>${t.dispenses ?? 0}</strong><span>Dispensés</span></div>
          </div>
          <button type="button" class="scope-btn" id="reopen">Réouvrir</button>
          <button type="button" class="scope-btn" id="cancel-event">Annuler l’événement</button>
          ${reportButton(ev.evenement_id)}
        </div>
        <div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Liste nominative</h3>
          ${rows.length ? `<table class="scope-table"><thead><tr><th>Nom</th><th>NIP</th><th>Statut</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td data-label="Nom">${canReadPersonnel() && r.personneId ? `<a href="#/personnel/${escapeHtml(r.personneId)}">${escapeHtml(r.nom)}</a>` : escapeHtml(r.nom)}</td><td data-label="NIP">${escapeHtml(r.nip)}</td><td data-label="Statut">${escapeHtml(r.statut === 'PRESENT' ? 'Présent' : r.statut === 'ABSENT_EXCUSE' ? 'Excusé' : r.statut === 'ABSENT_NON_EXCUSE' ? 'Absent' : r.statut === 'DISPENSE' ? 'Dispensé' : r.statut)}</td></tr>`).join('')}
          </tbody></table>` : `<div class="scope-empty">${escapeHtml(L.emptyMessage('resultats'))}</div>`}
        </div>
        <details class="scope-card scope-details" style="margin-top:12px">
          <summary>Encadrement</summary>
          ${(fiche.encadrement || []).length ? `<ul>${fiche.encadrement.map((p) => `<li>${escapeHtml(displayPerson(fiche, p.personne_id))} · ${escapeHtml(L.ROLE_LABELS[p.role] || p.role)}</li>`).join('')}</ul>` : '<p>Aucun encadrement.</p>'}
        </details>
        <details class="scope-card scope-details" style="margin-top:12px">
          <summary>Historique des corrections</summary>
          ${(fiche.journal || []).length ? `<ul>${fiche.journal.map((j) => `<li>${escapeHtml(j.action)} · ${escapeHtml(j.commentaire || '')}</li>`).join('')}</ul>` : '<p>Aucune correction.</p>'}
        </details>
      </div>
      ${state.modal === 'reopen' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Réouvrir l’événement</h3>
        <p>La séance redevient planifiée et sort du KPI tant qu’elle n’est pas reclôturée.</p>
        <div class="scope-field"><label>Motif</label><textarea id="reopen-motif"></textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="reopen-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="reopen-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
      ${state.modal === 'cancel-event' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Annuler l’événement</h3>
        <p>L’événement passera à Annulé. Les attendus et participations sont conservés. Il n’entre plus dans le taux officiel.</p>
        <div class="scope-field"><label>Motif</label><textarea id="cancel-motif">Qualification SCOPE</textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="cancel-ok">Confirmer l’annulation</button>
          <button type="button" class="scope-btn" id="cancel-dismiss">Retour</button>
        </div>
      </div></div>` : ''}
    `;
  }

  function renderModalAllPresent() {
    if (state.modal !== 'all-present') return '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Tout présent</h3>
      <p>Des présences sont déjà saisies. Continuer écrasera ces statuts pour le groupe affiché, hors encadrement.</p>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="all-present-ok">Confirmer</button>
        <button type="button" class="scope-btn" id="all-present-cancel">Annuler</button>
      </div>
    </div></div>`;
  }

  function renderModalPersonnelSync() {
    if (state.modal !== 'personnel-sync') return '';
    const preview = state.personnelSync.preview;
    const summary = (preview && (preview.importSummary || preview.summary)) || {};
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Confirmer l’import</h3>
      <p>Confirmer l’import de ces modifications dans SCOPE ? Cette action écrira en base. L’analyse et la prévisualisation n’ont effectué aucune écriture.</p>
      <p>${summary.countNewPersons || summary.nouveaux || 0} nouvelle(s) personne(s) · ${summary.countModified || summary.changementsOi || 0} personne(s) modifiée(s) · ${summary.countNewAssignments || 0} nouvelle(s) affectation(s) · ${summary.countErrors || summary.conflits || 0} erreur(s).</p>
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
      <p>L’événement passera à Annulé. Les attendus et participations sont conservés. Il n’entre plus dans le taux officiel.</p>
      <div class="scope-field"><label>Motif</label><textarea id="cancel-motif">Qualification SCOPE</textarea></div>
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
      AVERTISSEMENT: 'Avertissement', NEW_EVENT: 'Nouveau', EXACT_MATCH: 'Reconnu',
      PROBABLE_MATCH: 'Probable', GROUPED: 'Regroupé', REVIEW_REQUIRED: 'À contrôler'
    };
    const err = String(statut || '').indexOf('ERREUR') === 0 || statut === 'CONFLIT';
    const warn = statut === 'A_ARBITRER' || statut === 'AVERTISSEMENT' || statut === 'DEJA_PRESENT' || statut === 'DEJA_IMPORTE';
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
    const live = mode === 'live' && typeof client.previewImportEvenements === 'function';
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
    const canCommit = live && preview && !rapport && blocking.length === 0 && (creatable || all.some((l) => !state.importExcluded[l.ligneNo]));
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
    return `
      <div class="scope-crumb">Réglages / Import des événements</div>
      <div class="scope-main">
        ${pageHeaderHtml({ eyebrow: 'Réglages / Importation', title: 'Import des événements', context: 'Programme CSV', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Importer un programme d’événements</h2>
          <p>Ce parcours recommandé alimente le programme SCOPE. Après import, PostgreSQL reste la source de vérité. Aucun agrégat n’est transformé en personnes.</p>
          <p class="scope-mode-hint">Trois formats : <strong>événements standard</strong> avec CODE COURS, <strong>programme SCOPE</strong> (date ; domaine ; cibles ; libellé ; mode) ou <strong>historique Monitoring F7</strong> (22 colonnes). Le fichier est reconnu à l’en-tête.</p>
          ${live ? '' : '<p class="scope-empty">L’écriture d’import est disponible en mode LIVE uniquement.</p>'}
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
        ${pageHeaderHtml({ eyebrow: 'Réglages / Paramètres', title: 'Utilisateurs', context: 'Okta / RBAC', logo: true })}
        <div class="scope-card">
          <h2 style="margin-top:0">Utilisateurs</h2>
          <p>SCOPE utilise la session institutionnelle Okta/OIDC et le RBAC serveur. La source de vérité des comptes reste l’identité institutionnelle ; cette page n’invente pas de gestion utilisateur locale.</p>
          <dl class="scope-meta">
            <div><dt>Okta / OIDC</dt><dd>Disponible via `/auth/me`, `/auth/oidc/start`, `/auth/logout`.</dd></div>
            <div><dt>Rôles</dt><dd>admin, commandement, chef-formation, formation, instructeur, user, readonly.</dd></div>
            <div><dt>Administration</dt><dd>${canAdmin ? 'Permission users:admin détectée.' : 'Non visible sans users:admin.'}</dd></div>
            <div><dt>Gestion serveur</dt><dd>Fonctions admin-users présentes, hors création décorative dans ce lot.</dd></div>
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
        ${pageHeaderHtml({ eyebrow: 'Réglages', title: 'À propos', context: mode === 'live' ? 'LIVE' : 'DEMO', logo: true })}
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
            <div><dt>Environnement</dt><dd>${mode === 'live' ? 'LIVE' : 'DEMO'}</dd></div>
            <div><dt>Déploiement</dt><dd>Netlify scope-sdisnv</dd></div>
            <div><dt>Version source</dt><dd>SCOPE-QUAL-FINISH-1 · 197119c</dd></div>
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
        await loadFiche(id);
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
        await loadFiche(id);
        await client.cloturer(id, state.fiche.evenement.version);
        await loadFiche(id);
        go(`#/exercices/${id}`);
      });
    });
  }

  function render() {
    const r = route();
    const body = r.screen === 'accueil' ? renderAccueil()
      : r.screen === 'vue' ? renderVue()
        : r.screen === 'statistiques' ? renderStatistiques()
      : r.screen === 'personnel' ? renderPersonnel()
        : r.screen === 'personne' ? renderPersonne()
        : r.screen === 'rapports' ? renderRapports()
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
    root.innerHTML = `<div class="scope-app-shell">${sidebarHtml(r)}<div class="scope-workspace">${headerHtml(r)}${bannerHtml()}<div class="scope-content">${body}</div></div></div>${renderModalAllPresent()}${renderModalCancel()}${renderModalPersonnelSync()}`;
    bind();
    const statutSel = document.getElementById('filter-statut');
    const domaineSel = document.getElementById('filter-domaine');
    if (statutSel) statutSel.value = state.statut;
    if (domaineSel) domaineSel.value = state.domaine;
  }

  function bind() {
    document.getElementById('scope-confirm-live')?.addEventListener('click', () => {
      try { sessionStorage.setItem('scope-live-confirmed', '1'); } catch (_error) {}
      const params = new URLSearchParams(location.search.replace(/^\?/, ''));
      if (params.get('mode') === 'live') location.reload();
      else location.search = '?mode=live';
    });
    document.getElementById('scope-stay-demo')?.addEventListener('click', () => {
      try { sessionStorage.removeItem('scope-live-confirmed'); } catch (_error) {}
      location.search = '';
      location.hash = '#/exercices';
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
        else if (r.id) await loadFiche(r.id);
        else if (r.screen === 'vue' || r.screen === 'accueil' || r.screen === 'statistiques') await loadDashboard();
        else if (r.screen === 'personnel' || r.screen === 'import-personnel') await loadPersonnelDirectory();
        else await loadList();
        await refreshAlertCounts();
      });
    });
    document.getElementById('filter-statut')?.addEventListener('change', (e) => {
      state.statut = e.target.value;
      withLoading(loadList);
    });
    document.getElementById('filter-domaine')?.addEventListener('change', (e) => {
      state.domaine = e.target.value;
      withLoading(loadList);
    });
    document.getElementById('obj-add')?.addEventListener('click', () => {
      state.objectifAction = 'create';
      state.objectifFocusId = null;
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
      render();
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
        state.objectifForm.seuilPct = row ? String(row.thresholdPct) : '';
        state.objectifForm.dateDebut = '';
        state.objectifForm.dateFin = '';
        render();
      });
    });
    root.querySelectorAll('[data-obj-neutraliser]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-obj-neutraliser');
        withLoading(async () => {
          await client.desactiverObjectif(id, { motif: 'Neutralisation TEST / hors MOA' });
          await loadObjectifs();
          toast('success', 'Objectif neutralisé', 'Il ne s’applique plus, y compris à l’historique.');
        });
      });
    });
    document.getElementById('obj-save')?.addEventListener('click', () => {
      const portee = (document.getElementById('obj-portee') || {}).value;
      const domaineCode = (document.getElementById('obj-domaine') || {}).value;
      const cibleId = (document.getElementById('obj-cible') || {}).value;
      withLoading(async () => {
        await client.createObjectif({
          portee,
          domaineCode: portee === 'GLOBAL' ? null : domaineCode,
          cibleId: portee === 'CIBLE' ? cibleId : null,
          seuilPct: document.getElementById('obj-seuil').value,
          dateDebut: document.getElementById('obj-debut').value,
          dateFin: document.getElementById('obj-fin').value || null,
          commentaire: document.getElementById('obj-commentaire').value
        });
        state.objectifAction = null;
        await loadObjectifs();
        toast('success', 'Objectif enregistré', 'La nouvelle période est active pour le KPI officiel.');
      });
    });
    document.getElementById('obj-cloture-save')?.addEventListener('click', () => {
      const id = state.objectifFocusId;
      withLoading(async () => {
        await client.cloturerObjectif(id, { dateFin: document.getElementById('obj-cloture-date').value });
        state.objectifAction = null;
        state.objectifFocusId = null;
        await loadObjectifs();
        toast('success', 'Période clôturée', 'L’historique conserve ce seuil jusqu’à la date de fin.');
      });
    });
    document.getElementById('obj-periode-save')?.addEventListener('click', () => {
      const id = state.objectifFocusId;
      withLoading(async () => {
        await client.nouvellePeriodeObjectif(id, {
          dateDebut: document.getElementById('obj-periode-debut').value,
          seuilPct: document.getElementById('obj-periode-seuil').value,
          dateFin: document.getElementById('obj-periode-fin').value || null
        });
        state.objectifAction = null;
        state.objectifFocusId = null;
        await loadObjectifs();
        toast('success', 'Nouvelle période', 'L’ancien seuil reste applicable sur sa période.');
      });
    });
    document.getElementById('scope-new')?.addEventListener('click', () => go('#/exercices/nouveau'));
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
        state.importRapport = await client.commitImportEvenements({
          csvText: state.importFile.csvText,
          filename: state.importFile.filename,
          excludedLineNos,
          previewToken: state.importPreview && state.importPreview.previewToken,
          decisions: state.importDecisions
        });
        await loadList();
        toast('success', 'Programme importé', `${state.importRapport.summary.imported} événement(s) créé(s).`);
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
    bindQuantitatifSaisie();
    document.getElementById('preview-q')?.addEventListener('input', (e) => {
      state.personQuery = e.target.value;
      const q = state.personQuery.trim();
      if (q.length < 2) { state.personHits = []; render(); return; }
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
    });
    document.getElementById('all-present-ok')?.addEventListener('click', () => { state.modal = null; applyPresent(); });
    document.getElementById('all-present-cancel')?.addEventListener('click', () => { state.modal = null; render(); });
    root.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.closest('[data-pid]').getAttribute('data-pid');
        const statut = btn.getAttribute('data-status');
        const row = state.saisie.find((r) => r.personneId === pid);
        if (!row) return;
        row.statut = statut;
        if (statut !== 'ABSENT_EXCUSE') { row.motifAbsence = ''; row.commentaire = ''; }
        render();
      });
    });
    root.querySelectorAll('[data-motif]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const pid = sel.closest('[data-pid]').getAttribute('data-pid');
        const row = state.saisie.find((r) => r.personneId === pid);
        if (row) { row.motifAbsence = sel.value; render(); }
      });
    });
    root.querySelectorAll('[data-comment]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const pid = inp.closest('[data-pid]').getAttribute('data-pid');
        const row = state.saisie.find((r) => r.personneId === pid);
        if (row) row.commentaire = inp.value;
      });
    });
    root.querySelectorAll('[data-cible-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.cibleFilter = btn.getAttribute('data-cible-filter');
        render();
      });
    });
    document.getElementById('save-part')?.addEventListener('click', saveParticipations);
    document.getElementById('cloturer')?.addEventListener('click', cloturer);
    document.getElementById('enc-q')?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      const box = document.getElementById('enc-hits');
      if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; return; }
      client.listPersonnes(q).then((data) => {
        box.innerHTML = (data.personnes || []).map((p) => `
          <div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0">
            <span>${escapeHtml(p.nom)} ${escapeHtml(p.prenom)}</span>
            <button type="button" class="scope-btn" data-enc="${p.personne_id}">Ajouter</button>
          </div>`).join('') || `<div class="scope-empty">${escapeHtml(L.emptyMessage('personnes'))}</div>`;
        box.querySelectorAll('[data-enc]').forEach((btn) => {
          btn.addEventListener('click', () => addEncadrement(btn.getAttribute('data-enc')));
        });
      }).catch((error) => {
        const info = L.friendlyError(error);
        toast(info.tone, info.title, info.message);
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
    root.querySelectorAll('[data-report-event]').forEach((btn) => {
      btn.addEventListener('click', () => generateEventReport(btn.getAttribute('data-report-event')));
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
        state.personnelSync.decisions = {};
        toast('success', 'Analyse terminée', 'Prévisualisation disponible. Aucune écriture DB effectuée.');
      });
    });
    document.getElementById('scope-sync-commit')?.addEventListener('click', () => {
      state.modal = 'personnel-sync';
      render();
    });
    document.getElementById('scope-sync-commit-cancel')?.addEventListener('click', () => {
      state.modal = null;
      render();
    });
    document.getElementById('scope-sync-commit-ok')?.addEventListener('click', () => {
      const preview = state.personnelSync.preview;
      const decisions = Object.keys(state.personnelSync.decisions).map((rowId) => Object.assign({ rowId }, state.personnelSync.decisions[rowId]));
      personnelPreviewSourceRows(preview).forEach((row) => {
        const date = personnelDateOf(row);
        const decision = personnelDecisionOf(row);
        if (decision !== row.decision || (date && date !== row.dateEffet)) {
          if (!decisions.some((d) => d.rowId === row.rowId)) {
            decisions.push({ rowId: row.rowId, nip: row.nip, decision, dateEffet: date || undefined });
          }
        }
      });
      withLoading(async () => {
        toast('info', 'Import en cours…', 'Écriture DB SCOPE après confirmation explicite.');
        state.personnelSync.rapport = await client.commitPersonnelSync({
          csvText: state.personnelSync.csvText,
          filename: state.personnelSync.filename,
          contexte: state.personnelSync.contexte,
          importType: state.personnelSync.contexte,
          siteJsp: state.personnelSync.siteJsp || undefined,
          anneeMonitoring: Number(state.personnelSync.anneeMonitoring) || new Date().getFullYear(),
          fingerprint: preview.fingerprint,
          importId: preview.importId,
          dateEffetGlobale: state.personnelSync.dateEffet || undefined,
          idempotencyKey: preview.importId,
          decisions
        });
        state.modal = null;
        const people = await client.listPersonnes();
        state.personCount = (people.personnes || []).length;
        toast('success', 'Import terminé', `${(state.personnelSync.rapport.summary && state.personnelSync.rapport.summary.mutations) || 0} mutation(s).`);
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
      personnelSearch.addEventListener('change', () => {
        state.personnelQuery = personnelSearch.value.trim();
        withLoading(loadPersonnelDirectory);
      });
      personnelSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          state.personnelQuery = personnelSearch.value.trim();
          withLoading(loadPersonnelDirectory);
        }
      });
    }
    document.getElementById('personnel-oi')?.addEventListener('change', (e) => {
      state.personnelOi = e.target.value;
      render();
    });
    document.getElementById('personnel-specialization')?.addEventListener('change', (e) => {
      state.personnelSpecialization = e.target.value;
      render();
    });
    root.querySelectorAll('[data-personnel-sort]').forEach((th) => {
      th.addEventListener('click', () => {
        const display = personnelDisplay();
        const key = th.getAttribute('data-personnel-sort');
        state.personnelSort = display && display.nextPersonnelSort
          ? display.nextPersonnelSort(state.personnelSort, key)
          : { key, dir: state.personnelSort && state.personnelSort.key === key && state.personnelSort.dir === 'asc' ? 'desc' : 'asc' };
        render();
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
    document.getElementById('scope-inactivate-date')?.addEventListener('change', (e) => {
      if(state.personnelInactivate){
        state.personnelInactivate.date = e.target.value;
        render();
      }
    });
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
    root.querySelectorAll('[data-inactivate-person]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personnelInactivate = {
          id: btn.getAttribute('data-inactivate-person'),
          label: btn.getAttribute('data-inactivate-label') || '',
          nip: btn.getAttribute('data-inactivate-nip') || '',
          mode: 'inactivate',
          date: ''
        };
        render();
      });
    });
    root.querySelectorAll('[data-correct-person]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personnelInactivate = {
          id: btn.getAttribute('data-correct-person'),
          mode: 'correct',
          date: ''
        };
        render();
      });
    });
    document.getElementById('scope-inactivate-cancel')?.addEventListener('click', () => {
      state.personnelInactivate = null;
      render();
    });
    document.getElementById('scope-inactivate-confirm')?.addEventListener('click', () => {
      const date = document.getElementById('scope-inactivate-date')?.value;
      const comment = document.getElementById('scope-inactivate-comment')?.value || '';
      if(!date){ toast('error', 'Date obligatoire', 'La date d’inactivité est obligatoire.'); return; }
      const modal = state.personnelInactivate;
      withLoading(async () => {
        await client.inactivatePersonne({
          personneId: modal.id,
          dateInactivite: date,
          commentaire: comment,
          action: modal.mode === 'correct' ? 'correct' : 'inactivate'
        });
        state.personnelInactivate = null;
        await loadPersonnelDirectory();
      });
    });
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
    root.querySelectorAll('[data-person-domaine]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.personneDomainFilter = btn.getAttribute('data-person-domaine') || null;
        render();
      });
    });
    document.getElementById('scope-person-rh')?.addEventListener('toggle', (e) => {
      state.personneRhOpen = e.target.open;
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
      if (!trigger) return;
      event.preventDefault();
      openPersonnelImportPanel();
    });
  }

  function reportPeriodPayload() {
    return L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
      from: state.from,
      to: state.to
    });
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

  function saveParticipations() {
    const id = route().id;
    const payload = state.saisie
      .filter((r) => r.inclus !== false && r.role === 'PARTICIPANT')
      .map((r) => ({
        personneId: r.personneId,
        statut: r.statut,
        motif_absence: r.motifAbsence || null,
        commentaire: r.commentaire || null
      }));
    withLoading(async () => {
      const res = await client.enregistrerParticipations(id, payload, state.fiche.evenement.version);
      await loadFiche(id);
      toast('success', 'Enregistré', 'Les participations ont été enregistrées.');
      state.fiche.evenement.version = res.version;
    });
  }

  function cloturer() {
    const id = route().id;
    withLoading(async () => {
      await client.cloturer(id, state.fiche.evenement.version);
      await loadFiche(id);
      go(`#/exercices/${id}`);
    });
  }

  function addEncadrement(personneId) {
    const id = route().id;
    const role = document.getElementById('enc-role')?.value || 'FORMATEUR';
    withLoading(async () => {
      await client.ajouterEncadrement(id, { personneId, role }, state.fiche.evenement.version);
      await loadFiche(id);
      toast('success', 'Encadrement ajouté', 'La personne est hors du taux principal.');
    });
  }

  async function ensureLiveSession() {
    if (mode !== 'live' || typeof client.sessionMe !== 'function') return true;
    try {
      const data = await client.sessionMe();
      state.session = data.user || null;
      window.CurrentRoles = (state.session && state.session.roles) || [];
      window.CurrentPermissions = (state.session && state.session.permissions) || [];
      document.dispatchEvent(new Event('monitoring-f7-auth-session-changed'));
      state.needOkta = false;
      return true;
    } catch (error) {
      const info = L.friendlyError(error);
      state.session = null;
      state.needOkta = Boolean(info.okta) || Number(error && error.status) === 401;
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
    if (mode === 'live' && state.needOkta) {
      render();
      return;
    }
    const r = route();
    if (r.screen === 'liste' || r.screen === 'rapports') {
      state.listReady = false;
      state.listError = null;
    }
    if (r.screen === 'personnel') {
      state.personnelReady = false;
      state.personnelError = null;
    }
    if (r.screen === 'vue') {
      state.dashboardError = null;
    }
    await withLoading(async () => {
      if (!state.referentiels.domaines.length) await loadReferentiels();
      if (r.screen === 'objectifs') await loadObjectifs();
      if (mode === 'live' && client.listPersonnes && state.personCount == null) {
        const people = await client.listPersonnes();
        state.personCount = (people.personnes || []).length;
      }
      if (r.screen === 'liste' || r.screen === 'rapports' || r.screen === 'accueil') await loadList();
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
  }

  window.addEventListener('hashchange', onRoute);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.navOpen) {
      closeNav();
      render();
    }
  });
  bindPersonnelImportDelegation();

  (async function boot() {
    if (mode === 'live') {
      const ok = await ensureLiveSession();
      render();
      if (!ok) return;
    }
    if (!location.hash) location.hash = '#/accueil';
    else await onRoute();
  })();
})();
