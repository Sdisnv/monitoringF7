/* SCOPE-IMPL-1B — écrans P0 nominatifs. SCOPE-DATA-5 — import CSV. */
(function () {
  'use strict';
  const L = window.ScopeUiLogic;
  const root = document.getElementById('scope-root');
  if (!root || !L) return;

  const LIVE_KEY = 'scope-live-confirmed';

  function liveConfirmed() {
    try { return sessionStorage.getItem(LIVE_KEY) === '1'; } catch { return false; }
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
    domaineForm: 'DPS',
    dateForm: '2026-03-12',
    libelleForm: '',
    cibleForm: [],
    modeChoice: '',
    modeTouched: false,
    modeSuggestion: null,
    volumes: { attendus: '', presents: '', excuses: '', nonExcuses: '', dispenses: '0' },
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
    objectifFocusId: null,
    dashboard: null,
    explainOpen: false,
    absencesOpen: false
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
    state.referentiels = { domaines: data.domaines || [], cibles: data.cibles || [] };
  }

  async function loadList() {
    const data = await client.listEvenements({
      annee: state.year,
      statut: state.statut,
      domaineCode: state.domaine
    });
    state.list = data.evenements || [];
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
    const params = L.periodParams({
      preset: state.preset,
      year: state.year,
      month: state.month,
      quarter: state.quarter,
      from: state.from,
      to: state.to,
      domaine: r.domaine,
      cible: r.cible
    });
    state.dashboard = await client.dashboard(params);
  }

  function reloadPeriod() {
    withLoading(async () => {
      const r = route();
      if (r.screen === 'vue') await loadDashboard();
      else if (r.screen === 'liste') await loadList();
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
    if (!s) return { attendus: '', presents: '', excuses: '', nonExcuses: '', dispenses: '0' };
    return {
      attendus: s.nb_attendus == null ? '' : String(s.nb_attendus),
      presents: s.nb_presents == null ? '' : String(s.nb_presents),
      excuses: s.nb_excuses == null ? '' : String(s.nb_excuses),
      nonExcuses: s.nb_non_excuses == null ? '' : String(s.nb_non_excuses),
      dispenses: String(s.nb_dispenses == null ? 0 : s.nb_dispenses)
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
          origine: a.origine
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
    if (roles.includes('sdis-admin')) return 'Administration';
    if (roles.includes('sdis-user')) return 'Utilisateur SDIS';
    if (roles[0]) return String(roles[0]);
    return state.session ? 'Session live' : 'Session requise';
  }

  function userLabel() {
    if (mode !== 'live') return 'Démonstration';
    if (state.session && state.session.displayName) return state.session.displayName;
    return 'LIVE Monitoring';
  }

  function headerHtml(nav) {
    const years = [String(Number(state.year) - 1), state.year, String(Number(state.year) + 1)]
      .filter((v, i, a) => a.indexOf(v) === i);
    const logout = mode === 'live'
      ? `<a class="scope-btn scope-btn-ghost" href="/auth/logout?returnTo=/">Déconnexion</a>`
      : '';
    const navButtons = `
        <button type="button" data-nav="vue" aria-current="${nav === 'vue' ? 'page' : 'false'}">Vue d’ensemble</button>
        <button type="button" data-nav="exercices" aria-current="${nav === 'exercices' ? 'page' : 'false'}">Exercices</button>
        <button type="button" data-nav="personnel" aria-current="${nav === 'personnel' ? 'page' : 'false'}">Personnel</button>`;
    const menuExtras = `
        <a href="#/reglages/objectifs" ${nav === 'reglages' ? 'aria-current="page"' : ''}>Réglages · Objectifs</a>`;
    return `
      <header class="scope-header${mode === 'live' ? ' live-mode' : ''}">
        <div class="scope-header-inner">
          <div class="scope-brand">
            <img class="scope-logo" src="assets/img/logo-scope-blanc.png" alt="SCOPE" width="300" height="100">
            <p class="scope-tagline">Suivi et analyse de l’activité</p>
          </div>
          <div class="scope-header-spacer"></div>
          <div class="scope-header-tools">
            <div class="scope-period">
              <label class="scope-field" style="margin:0">
                <span class="visually-hidden">Type de période</span>
                <select id="scope-preset">
                  <option value="YEAR" ${state.preset === 'YEAR' ? 'selected' : ''}>Année</option>
                  <option value="QUARTER" ${state.preset === 'QUARTER' ? 'selected' : ''}>Trimestre</option>
                  <option value="MONTH" ${state.preset === 'MONTH' ? 'selected' : ''}>Mois</option>
                  <option value="CUSTOM" ${state.preset === 'CUSTOM' ? 'selected' : ''}>Plage</option>
                </select>
              </label>
              <label class="scope-field" style="margin:0">
                <span class="visually-hidden">Année</span>
                <select id="scope-year">${years.map((y) => `<option value="${y}" ${y === state.year ? 'selected' : ''}>${escapeHtml(y)}</option>`).join('')}</select>
              </label>
              ${state.preset === 'QUARTER' ? `<label class="scope-field" style="margin:0">
                <span class="visually-hidden">Trimestre</span>
                <select id="scope-quarter">${[1, 2, 3, 4].map((q) => `<option value="${q}" ${String(q) === String(state.quarter) ? 'selected' : ''}>T${q}</option>`).join('')}</select>
              </label>` : ''}
              ${state.preset === 'MONTH' ? `<label class="scope-field" style="margin:0">
                <span class="visually-hidden">Mois</span>
                <select id="scope-month">${['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => `<option value="${i + 1}" ${String(i + 1) === String(Number(state.month)) ? 'selected' : ''}>${m}</option>`).join('')}</select>
              </label>` : ''}
              ${state.preset === 'CUSTOM' ? `<input id="scope-from" type="date" value="${escapeHtml(state.from)}"><input id="scope-to" type="date" value="${escapeHtml(state.to)}">` : ''}
            </div>
            <div class="scope-user-block">
              <div class="scope-user-text">
                <strong class="scope-user">${escapeHtml(userLabel())}</strong>
                ${mode === 'live' ? `<small>${escapeHtml(roleLabel())}</small>` : ''}
              </div>
            </div>
            <button type="button" class="scope-btn scope-btn-ghost" id="scope-header-menu" aria-expanded="false" aria-controls="scope-header-menu-panel">Menu</button>
            ${logout}
          </div>
        </div>
        <div class="scope-header-menu-panel" id="scope-header-menu-panel" hidden>${navButtons}${menuExtras}</div>
      </header>
      <nav class="scope-nav" aria-label="Navigation principale">
        <div class="scope-nav-inner">${navButtons}</div>
      </nav>
    `;
  }

  function bannerHtml() {
    const bits = [];
    const params = new URLSearchParams(location.search.replace(/^\?/, ''));
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
      bits.push(`<div class="scope-banner live">Mode LIVE — base PostgreSQL Monitoring. Session Okta. Toute saisie est réelle. Pas de données fictives. <a class="scope-btn" href="/auth/logout?returnTo=/">Se déconnecter</a></div>`);
    } else {
      bits.push(`<div class="scope-banner demo">Mode démonstration — aucune écriture dans PostgreSQL Monitoring. Le personnel affiché est local et fictif.</div>`);
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

  function statutBadge(code) {
    return `<span class="scope-badge"><span class="scope-dot ${escapeHtml(code)}"></span>${escapeHtml(L.statutLabel(code))}</span>`;
  }

  function renderListe() {
    const rows = state.list;
    const body = rows.length ? rows.map((item) => {
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
      return `<tr>
        <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
        <td data-label="Domaine">${escapeHtml(domaineLabel(ev.domaine_code))}</td>
        <td data-label="Cible(s)">${escapeHtml(L.ciblesLabel(item.cibles))}</td>
        <td data-label="Libellé">${escapeHtml(ev.libelle)}</td>
        <td data-label="Statut">${statutHtml}</td>
        <td data-label="Attendus">${attendusCell}</td>
        <td data-label="Présents">${presents}</td>
        <td data-label="Taux">${escapeHtml(taux)}</td>
        <td data-label="Action"><a class="scope-btn" href="${href}">${action}</a></td>
      </tr>`;
    }).join('') : `<tr><td colspan="9"><div class="scope-empty">${escapeHtml(L.emptyMessage('exercices'))}</div></td></tr>`;

    return `
      <div class="scope-crumb">Exercices · ${escapeHtml(state.year)}</div>
      <div class="scope-main">
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
          <a class="scope-btn" id="scope-import" href="#/exercices/import">Importer un programme CSV</a>
          <button type="button" class="scope-btn scope-btn-primary" id="scope-new">Nouvel exercice</button>
        </div>
        <div class="scope-card scope-table-wrap">
          <table class="scope-table">
            <thead>
              <tr>
                <th>Date</th><th>Domaine</th><th>Cible(s)</th><th>Libellé</th>
                <th>Statut</th><th>Attendus</th><th>Présents</th><th>Taux</th><th>Action</th>
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
    const crumbs = ['<a href="#/vue">Vue d’ensemble</a>'];
    if (r.domaine) crumbs.push(`<a href="#/vue/${encodeURIComponent(r.domaine)}">${escapeHtml(domaineLabel(r.domaine))}</a>`);
    if (r.cible) crumbs.push(`<span>${escapeHtml(r.cible)}</span>`);
    if (!dash) {
      return `<div class="scope-crumb">${crumbs.join(' · ')}</div>
        <div class="scope-main"><div class="scope-card scope-placeholder"><p>Chargement de la vue d’ensemble…</p></div></div>`;
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
    const inbox = dash.inbox || [];
    const explain = dash.explain || {};
    const exclusions = explain.exclusions || {};
    const chart = L.participationChartSvg(dash.timeseries && dash.timeseries.officiel, dash.legacy && dash.legacy.points);

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

    const inboxRows = inbox.length
      ? inbox.map((item) => `<tr>
          <td data-label="Date">${escapeHtml(L.formatDate(item.date))}</td>
          <td data-label="Domaine">${escapeHtml(domaineLabel(item.domaine))}</td>
          <td data-label="Cible">${escapeHtml(L.ciblesLabel(item.cibles))}</td>
          <td data-label="Libellé">${escapeHtml(item.libelle)}</td>
          <td data-label="Mode">${escapeHtml(L.modeLabel(item.modeSuivi))}</td>
          <td data-label="Raison"><span class="scope-inbox-reason">${escapeHtml(item.reason)}</span></td>
          <td data-label="Action"><a class="scope-btn scope-btn-primary" href="${escapeHtml(item.cta && item.cta.href)}">${escapeHtml((item.cta && item.cta.label) || 'Ouvrir')}</a></td>
        </tr>`).join('')
      : `<tr><td colspan="7"><div class="scope-empty">Aucun exercice à traiter sur cette période.</div></td></tr>`;

    const domainCards = (dash.domaines || []).map((d) => {
      const off = d.officiel || {};
      const dGap = L.formatGap(off.gapPct);
      const dObj = L.objectiveKpiLabel(off);
      return `<a class="scope-domain-card" href="#/vue/${encodeURIComponent(d.code)}">
        <strong>${escapeHtml(d.libelleAffiche || d.code)}</strong>
        <span>${escapeHtml(L.formatTaux(off.percentage))}</span>
        <small>${escapeHtml(dObj.title)}${dGap ? ` · ${escapeHtml(dGap)}` : ''}</small>
        <small>${escapeHtml(String(off.eventCount || 0))} événement(s) · ${escapeHtml(L.analyticStatusLabel(off.analyticStatus))}</small>
      </a>`;
    }).join('');

    const cibleCards = (dash.cibles || []).map((c) => {
      const off = c.officiel || {};
      return `<a class="scope-cible-card" href="#/vue/${encodeURIComponent(r.domaine)}/${encodeURIComponent(c.niveauCode)}">
        <strong>${escapeHtml(c.niveauCode)}</strong>
        <span>${escapeHtml(L.formatTaux(off.percentage))}</span>
        <small>${escapeHtml(String(off.eventCount || 0))} événement(s) · ${escapeHtml(L.analyticStatusLabel(off.analyticStatus))}</small>
      </a>`;
    }).join('');

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
      <div class="scope-crumb">${crumbs.join(' · ')}</div>
      <div class="scope-main">
        ${kpi}
        ${explainHtml}
        ${absHtml}
        <div class="scope-card scope-inbox">
          <h2>Exercices à traiter</h2>
          <div class="scope-table-wrap">
            <table class="scope-table">
              <thead>
                <tr><th>Date</th><th>Domaine</th><th>Cible</th><th>Libellé</th><th>Mode</th><th>Raison</th><th>Action</th></tr>
              </thead>
              <tbody>${inboxRows}</tbody>
            </table>
          </div>
        </div>
        <div class="scope-card scope-panel">
          <h2>Évolution du taux de participation</h2>
          ${chart}
          <p class="scope-chart-legend">
            <span><i></i>Taux officiel (mensuel, somme / somme)</span>
            <span><i class="obj"></i>Objectif lorsqu’il est unique</span>
            <span><i class="legacy"></i>LEGACY historique, hors KPI</span>
          </p>
          ${legacyNote}
        </div>
        ${domainCards ? `<div class="scope-panel"><h2 class="scope-card" style="box-shadow:none;border:0;padding:0 0 8px;background:transparent">Participation par domaine</h2><div class="scope-domain-grid">${domainCards}</div></div>` : ''}
        ${cibleCards ? `<div class="scope-panel"><h2 class="scope-card" style="box-shadow:none;border:0;padding:0 0 8px;background:transparent">Cibles</h2><div class="scope-domain-grid">${cibleCards}</div></div>` : ''}
        ${eventRows}
      </div>
    `;
  }

  function renderPlaceholder(title, crumb) {
    return `
      <div class="scope-crumb">${escapeHtml(crumb)}</div>
      <div class="scope-main">
        <div class="scope-card scope-placeholder">
          <h2 style="margin-top:0">${escapeHtml(title)}</h2>
          <p>Cet écran fera partie de SCOPE, mais il n’est pas construit dans le pilote P0. Utilisez Exercices pour la saisie nominative.</p>
          ${mode === 'live' && state.personCount != null ? `<p><strong>${state.personCount}</strong> personne(s) nominative(s) en base SCOPE.</p>` : ''}
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
            <select id="obj-cible">${cibles.map((c) => `<option value="${c.cibleId}" ${c.cibleId === form.cibleId ? 'selected' : ''}>${escapeHtml(c.niveauCode)}</option>`).join('')}</select>
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
      <div class="scope-crumb">Exercices / Nouvel exercice</div>
      <div class="scope-main">
        <div class="scope-card" style="max-width:640px">
          <h2 style="margin-top:0">Créer un exercice</h2>
          <div class="scope-field"><label>Date</label><input id="new-date" type="date" value="${escapeHtml(state.dateForm || `${state.year}-03-12`)}"></div>
          <div class="scope-field" style="margin-top:8px"><label>Domaine</label>
            <select id="new-domaine">${state.referentiels.domaines.map((d) => `<option value="${d.code}" ${d.code === domaine ? 'selected' : ''}>${escapeHtml(d.libelleAffiche || L.domaineAffiche(d.code))}</option>`).join('')}</select>
          </div>
          <div class="scope-field" style="margin-top:8px"><label>Cible(s)</label>
            <div id="new-cibles" class="scope-chips">
              ${cibles.map((c) => `<label style="display:inline-flex;gap:6px;align-items:center;font-size:13px">
                <input type="checkbox" value="${c.cibleId}" ${state.cibleForm.includes(c.cibleId) ? 'checked' : ''}> ${escapeHtml(c.niveauCode)}
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
          <div><dt>Non excusés</dt><dd>${escapeHtml(String(s.nb_non_excuses ?? '—'))}</dd></div>
          <div><dt>Dispensés</dt><dd>${escapeHtml(String(s.nb_dispenses ?? '—'))}</dd></div>
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
    if (!fiche) return `<div class="scope-main"><div class="scope-empty">Exercice introuvable.</div></div>`;
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
      <div class="scope-crumb">Exercices / ${escapeHtml(ev.libelle)}</div>
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
          ${cta ? `<div class="scope-actions"><button type="button" class="scope-btn scope-btn-primary" data-cta="${cta.action}">${escapeHtml(cta.label)}</button>${extraActions}${ev.statut !== 'ANNULE' ? '<button type="button" class="scope-btn" id="cancel-event">Annuler l’exercice</button>' : ''}</div>` : (!isLegacy && ev.statut !== 'ANNULE' ? `<div class="scope-actions">${extraActions}<button type="button" class="scope-btn" id="cancel-event">Annuler l’exercice</button></div>` : '')}
        </div>
        ${qty && saisie ? volumesBlock(saisie, { taux: fiche.compteurs, officiel: false }) : ''}
        ${legacyBlock}
        ${previewBlock}
      </div>
      ${state.modal === 'convert-nominatif' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Passer en nominatif</h3>
        <p>Les volumes quantitatifs de cet exercice seront supprimés. Cette action n’est possible qu’avant clôture.</p>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="convert-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="convert-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
    `;
  }

  function renderPreviewList() {
    const people = (state.preview.personnes || []).filter((p) => !state.pendingRetraits.includes(p.personneId));
    const extras = state.pendingExceptions;
    const rows = people.concat(extras);
    const body = rows.length ? rows.map((p) => `
      <tr>
        <td data-label="Nom">${escapeHtml(`${p.nom} ${p.prenom}`)}</td>
        <td data-label="NIP">${escapeHtml(p.nip)}</td>
        <td data-label="Cible">${escapeHtml((p.cibles || []).map((c) => c.niveauCode || c).join(' · ') || 'Exception')}</td>
        <td data-label="Motif">${escapeHtml(p.motifInclusion === 'exception_ajout' ? 'Ajout manuel' : 'Affectation')}</td>
        <td data-label="Action"><button type="button" class="scope-btn" data-retrait="${p.personneId}">Retirer</button></td>
      </tr>
    `).join('') : `<tr><td colspan="5"><div class="scope-empty">${escapeHtml(L.emptyMessage('attendus'))}</div></td></tr>`;
    return `
      <div class="scope-card" style="margin-top:12px">
        <h3 style="margin-top:0">Attendus générés · ${rows.length}</h3>
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
        <div class="scope-table-wrap">
          <table class="scope-table">
            <thead><tr><th>Nom</th><th>NIP</th><th>Cible</th><th>Inclusion</th><th></th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <p style="color:var(--scope-muted);font-size:12px">Le gel calcule la population côté serveur. Les ajouts et retraits préparés ici sont appliqués ensuite, sans envoyer une liste nominative comme source de vérité.</p>
      </div>
    `;
  }

  function renderSaisie() {
    const fiche = state.fiche;
    if (!fiche) return `<div class="scope-main"><div class="scope-empty">Exercice introuvable.</div></div>`;
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
      <div class="scope-crumb">Exercices / ${escapeHtml(ev.libelle)} / Saisie</div>
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
        <div class="scope-card" style="margin-top:12px">
          ${filtered.length ? renderSaisieRows(filtered) : `<div class="scope-empty">${escapeHtml(L.emptyMessage('attendus'))}</div>`}
        </div>
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
      <div class="scope-crumb">Exercices / ${escapeHtml(ev.libelle)} / Présences</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">Saisir les présences</h2>
          <p style="color:var(--scope-muted);margin-top:0">${escapeHtml(ev.libelle)} · ${escapeHtml(L.formatDate(ev.date))} · ${escapeHtml(domaineLabel(ev.domaine_code))} · ${escapeHtml(L.ciblesLabel(ciblesOf(fiche)))} · Quantitatif</p>
          <form class="scope-qty-form" id="qty-form" autocomplete="off">
            <div class="scope-field scope-qty-field"><label for="qty-attendus">Attendus</label><input id="qty-attendus" name="attendus" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.attendus)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-presents">Présents</label><input id="qty-presents" name="presents" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.presents)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-excuses">Excusés</label><input id="qty-excuses" name="excuses" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.excuses)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-non-excuses">Non excusés</label><input id="qty-non-excuses" name="nonExcuses" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.nonExcuses)}"></div>
            <div class="scope-field scope-qty-field"><label for="qty-dispenses">Dispensés</label><input id="qty-dispenses" name="dispenses" type="number" inputmode="numeric" min="0" step="1" value="${escapeHtml(v.dispenses)}"></div>
          </form>
          <p class="scope-qty-error" ${equal ? 'hidden' : ''}>Présents + excusés + non excusés + dispensés doit être égal aux attendus. Aucune correction automatique.</p>
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
                  ${[['PRESENT', 'Présent'], ['ABSENT_EXCUSE', 'Excusé'], ['ABSENT_NON_EXCUSE', 'Absent'], ['DISPENSE', 'Dispensé']].map(([v, l]) => `
                    <button type="button" data-status="${v}" aria-pressed="${row.statut === v}">${l}</button>
                  `).join('')}
                </div>
                ${row.statut === 'ABSENT_EXCUSE' ? `<select data-motif style="margin-top:6px;height:36px">
                  <option value="">Motif</option>
                  ${L.MOTIFS.map((m) => `<option value="${m.value}" ${row.motifAbsence === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
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
      <div class="scope-crumb">Exercices / ${escapeHtml(ev.libelle)} / Réalisé</div>
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
          <button type="button" class="scope-btn" id="cancel-event">Annuler l’exercice</button>
        </div>
        ${volumesBlock(saisie, { taux: t, officiel: true })}
        <details class="scope-card scope-details" style="margin-top:12px">
          <summary>Historique des corrections</summary>
          ${(fiche.journal || []).length ? `<ul>${fiche.journal.map((j) => `<li>${escapeHtml(j.action)} · ${escapeHtml(j.commentaire || '')}</li>`).join('')}</ul>` : '<p>Aucune correction.</p>'}
        </details>
      </div>
      ${state.modal === 'reopen' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Réouvrir l’exercice</h3>
        <p>La séance redevient planifiée et sort du KPI tant qu’elle n’est pas reclôturée. Les volumes sont conservés.</p>
        <div class="scope-field"><label>Motif</label><textarea id="reopen-motif"></textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="reopen-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="reopen-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
      ${state.modal === 'cancel-event' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Annuler l’exercice</h3>
        <p>L’exercice passera à Annulé. Il n’entre plus dans le taux officiel.</p>
        <div class="scope-field"><label>Motif</label><textarea id="cancel-motif">Qualification SCOPE</textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="cancel-ok">Confirmer l’annulation</button>
          <button type="button" class="scope-btn" id="cancel-dismiss">Retour</button>
        </div>
      </div></div>` : ''}
    `;
    }
    return `
      <div class="scope-crumb">Exercices / ${escapeHtml(ev.libelle)} / Réalisé</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">${escapeHtml(ev.libelle)}</h2>
          <p style="font-size:28px;margin:8px 0 0">${escapeHtml(L.formatTaux(t.percentage))}</p>
          <p style="color:var(--scope-muted);margin-top:4px">Taux de participation officiel</p>
          <div class="scope-kpis">
            <div class="scope-kpi"><strong>${t.presents ?? 0}</strong><span>Présents</span></div>
            <div class="scope-kpi"><strong>${t.excuses ?? 0}</strong><span>Absents excusés</span></div>
            <div class="scope-kpi"><strong>${t.nonExcuses ?? 0}</strong><span>Absents non excusés</span></div>
            <div class="scope-kpi"><strong>${t.dispenses ?? 0}</strong><span>Dispensés</span></div>
          </div>
          <button type="button" class="scope-btn" id="reopen">Réouvrir</button>
          <button type="button" class="scope-btn" id="cancel-event">Annuler l’exercice</button>
        </div>
        <div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Liste nominative</h3>
          ${rows.length ? `<table class="scope-table"><thead><tr><th>Nom</th><th>NIP</th><th>Statut</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td data-label="Nom">${escapeHtml(r.nom)}</td><td data-label="NIP">${escapeHtml(r.nip)}</td><td data-label="Statut">${escapeHtml(r.statut === 'PRESENT' ? 'Présent' : r.statut === 'ABSENT_EXCUSE' ? 'Excusé' : r.statut === 'ABSENT_NON_EXCUSE' ? 'Absent' : r.statut === 'DISPENSE' ? 'Dispensé' : r.statut)}</td></tr>`).join('')}
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
        <h3>Réouvrir l’exercice</h3>
        <p>La séance redevient planifiée et sort du KPI tant qu’elle n’est pas reclôturée.</p>
        <div class="scope-field"><label>Motif</label><textarea id="reopen-motif"></textarea></div>
        <div class="scope-actions">
          <button type="button" class="scope-btn scope-btn-primary" id="reopen-ok">Confirmer</button>
          <button type="button" class="scope-btn" id="reopen-cancel">Annuler</button>
        </div>
      </div></div>` : ''}
      ${state.modal === 'cancel-event' ? `<div class="scope-modal"><div class="scope-card">
        <h3>Annuler l’exercice</h3>
        <p>L’exercice passera à Annulé. Les attendus et participations sont conservés. Il n’entre plus dans le taux officiel.</p>
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

  function renderModalCancel() {
    if (state.modal !== 'cancel-event') return '';
    return `<div class="scope-modal"><div class="scope-card">
      <h3>Annuler l’exercice</h3>
      <p>L’exercice passera à Annulé. Les attendus et participations sont conservés. Il n’entre plus dans le taux officiel.</p>
      <div class="scope-field"><label>Motif</label><textarea id="cancel-motif">Qualification SCOPE</textarea></div>
      <div class="scope-actions">
        <button type="button" class="scope-btn scope-btn-primary" id="cancel-ok">Confirmer l’annulation</button>
        <button type="button" class="scope-btn" id="cancel-dismiss">Retour</button>
      </div>
    </div></div>`;
  }

  function importPill(statut) {
    const cls = statut === 'ERREUR' ? 'err' : (statut === 'AVERTISSEMENT' ? 'warn' : 'ok');
    return `<span class="scope-import-pill ${cls}">${escapeHtml(statut)}</span>`;
  }

  function renderImport() {
    const live = mode === 'live' && typeof client.previewImportEvenements === 'function';
    const preview = state.importPreview;
    const rapport = state.importRapport;
    const lignes = (preview && preview.lignes) || [];
    const includedErrors = lignes.filter((l) => l.statut === 'ERREUR' && !state.importExcluded[l.ligneNo]);
    const canCommit = live && preview && !rapport && includedErrors.length === 0 && lignes.some((l) => !state.importExcluded[l.ligneNo]);
    const cards = lignes.map((l) => {
      const excluded = Boolean(state.importExcluded[l.ligneNo]);
      return `<article class="scope-import-card ${l.statut === 'ERREUR' ? 'is-error' : ''}">
        <header>
          <strong>Ligne ${l.ligneNo}</strong>
          ${importPill(l.statut)}
          <span class="scope-import-type">${escapeHtml(l.typePropose || '—')}</span>
        </header>
        <p class="scope-import-meta">${escapeHtml(L.formatDate(l.date))} · ${escapeHtml(l.domaine || '')} · ${escapeHtml(l.publicCible || l.niveauCode || '')}</p>
        <p class="scope-import-libelle">${escapeHtml(l.libelle || '')}</p>
        <p class="scope-import-reason">${escapeHtml(l.raison || '')}</p>
        <p class="scope-import-action">Action : ${escapeHtml(l.actionPrevue || '—')}</p>
        <label class="scope-import-exclude">
          <input type="checkbox" data-exclude-line="${l.ligneNo}" ${excluded ? 'checked' : ''}>
          Exclure cette ligne
        </label>
      </article>`;
    }).join('');
    return `
      <div class="scope-crumb">Exercices / Importer un programme CSV</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">Importer un programme CSV</h2>
          <p>Le CSV alimente SCOPE. Après import, PostgreSQL reste la source de vérité. Aucun agrégat n’est transformé en personnes.</p>
          ${live ? '' : '<p class="scope-empty">L’écriture d’import est disponible en mode LIVE uniquement.</p>'}
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
            <a class="scope-btn" href="#/exercices">Retour à la liste</a>
          </div>
        </div>
        ${preview ? `<div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Preview · ${preview.summary.nbLignes} ligne(s)</h3>
          <p>Valides ${preview.summary.VALIDE || 0} · Avertissements ${preview.summary.AVERTISSEMENT || 0} · Erreurs ${preview.summary.ERREUR || 0}. Aucune écriture tant que vous n’avez pas confirmé.</p>
          <div class="scope-import-list">${cards}</div>
        </div>` : ''}
        ${rapport ? `<div class="scope-card" style="margin-top:12px">
          <h3 style="margin-top:0">Rapport d’import</h3>
          <p>Importées : ${rapport.summary.imported} · Déjà présentes : ${rapport.summary.dejaImporte} · Exclues : ${rapport.summary.exclus}</p>
          <div class="scope-actions"><a class="scope-btn scope-btn-primary" href="#/exercices">Retour à la liste</a></div>
        </div>` : ''}
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
      excuses: field('qty-excuses', state.volumes.excuses),
      nonExcuses: field('qty-non-excuses', state.volumes.nonExcuses),
      dispenses: field('qty-dispenses', state.volumes.dispenses || '0')
    };
    return {
      attendus: state.volumes.attendus === '' ? undefined : Number(state.volumes.attendus),
      presents: state.volumes.presents === '' ? undefined : Number(state.volumes.presents),
      excuses: state.volumes.excuses === '' ? undefined : Number(state.volumes.excuses),
      nonExcuses: state.volumes.nonExcuses === '' ? undefined : Number(state.volumes.nonExcuses),
      dispenses: state.volumes.dispenses === '' ? 0 : Number(state.volumes.dispenses)
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
    const body = r.screen === 'vue' ? renderVue()
      : r.screen === 'personnel' ? renderPlaceholder('Personnel', 'Personnel')
        : r.screen === 'objectifs' ? renderObjectifs()
          : r.screen === 'nouveau' ? renderNouveau()
            : r.screen === 'saisie' ? renderSaisie()
              : r.screen === 'fiche' ? renderFiche()
                : r.screen === 'import' ? renderImport()
                  : renderListe();
    root.innerHTML = headerHtml(r.nav) + bannerHtml() + body + renderModalAllPresent() + renderModalCancel();
    bind();
    const statutSel = document.getElementById('filter-statut');
    const domaineSel = document.getElementById('filter-domaine');
    if (statutSel) statutSel.value = state.statut;
    if (domaineSel) domaineSel.value = state.domaine;
  }

  function bind() {
    document.getElementById('scope-confirm-live')?.addEventListener('click', () => {
      try { sessionStorage.setItem('scope-live-confirmed', '1'); } catch {}
      const params = new URLSearchParams(location.search.replace(/^\?/, ''));
      if (params.get('mode') === 'live') location.reload();
      else location.search = '?mode=live';
    });
    document.getElementById('scope-stay-demo')?.addEventListener('click', () => {
      try { sessionStorage.removeItem('scope-live-confirmed'); } catch {}
      location.search = '';
      location.hash = '#/exercices';
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
    document.getElementById('scope-absences-toggle')?.addEventListener('click', () => {
      state.absencesOpen = !state.absencesOpen;
      render();
    });
    document.getElementById('scope-header-menu')?.addEventListener('click', () => {
      const panel = document.getElementById('scope-header-menu-panel');
      const btn = document.getElementById('scope-header-menu');
      if (!panel || !btn) return;
      const open = panel.classList.toggle('open');
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    root.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nav = btn.getAttribute('data-nav');
        go(nav === 'vue' ? '#/vue' : nav === 'personnel' ? '#/personnel' : '#/exercices');
      });
    });
    document.getElementById('scope-reload')?.addEventListener('click', () => {
      const r = route();
      withLoading(async () => {
        clearToast();
        if (r.id) await loadFiche(r.id);
        else if (r.screen === 'vue') await loadDashboard();
        else await loadList();
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
          filename: state.importFile.filename
        });
        state.importExcluded = {};
      });
    });
    document.getElementById('scope-import-commit')?.addEventListener('click', () => {
      const excludedLineNos = Object.keys(state.importExcluded).filter((k) => state.importExcluded[k]).map(Number);
      withLoading(async () => {
        state.importRapport = await client.commitImportEvenements({
          csvText: state.importFile.csvText,
          filename: state.importFile.filename,
          excludedLineNos
        });
        toast('success', 'Import terminé', `${state.importRapport.summary.imported} événement(s) créé(s).`);
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
    await withLoading(async () => {
      if (!state.referentiels.domaines.length) await loadReferentiels();
      if (mode === 'live' && client.listPersonnes && state.personCount == null) {
        const people = await client.listPersonnes();
        state.personCount = (people.personnes || []).length;
      }
      if (r.screen === 'liste') await loadList();
      if (r.screen === 'vue') await loadDashboard();
      if (r.screen === 'objectifs') await loadObjectifs();
      if (r.screen === 'personnel' && client.listPersonnes) {
        const people = await client.listPersonnes();
        state.personCount = (people.personnes || []).length;
      }
      if ((r.screen === 'fiche' || r.screen === 'saisie') && r.id) await loadFiche(r.id);
    });
  }

  window.addEventListener('hashchange', onRoute);
  (async function boot() {
    if (mode === 'live') {
      const ok = await ensureLiveSession();
      render();
      if (!ok) return;
    }
    if (!location.hash) location.hash = '#/vue';
    else await onRoute();
  })();
})();
