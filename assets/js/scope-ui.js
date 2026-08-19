/* SCOPE-IMPL-1B — écrans P0 nominatifs. */
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
    personCount: null
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

  async function loadFiche(id) {
    const data = await client.getEvenement(id);
    state.fiche = data;
    state.conflict = false;
    buildSaisieFromFiche();
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
    return `
      <header class="scope-header${mode === 'live' ? ' live-mode' : ''}">
        <div class="scope-header-inner">
          <div class="scope-brand">
            <img class="scope-logo" src="assets/img/logo-scope-blanc.png" alt="SCOPE" width="300" height="100">
            <p class="scope-tagline">Suivi et analyse de l’activité</p>
          </div>
          <div class="scope-header-spacer"></div>
          <div class="scope-header-tools">
            <label class="scope-field" style="margin:0">
              <span class="visually-hidden">Période</span>
              <select id="scope-year">${years.map((y) => `<option value="${y}" ${y === state.year ? 'selected' : ''}>Année ${y}</option>`).join('')}</select>
            </label>
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
        <div class="scope-header-menu-panel" id="scope-header-menu-panel" hidden>${navButtons}</div>
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
      const taux = L.displayTauxForList(ev.statut, ev.statut === 'REALISE', item.compteurs && item.compteurs.percentage);
      const action = ev.statut === 'PLANIFIE' && ev.population_figee ? 'Saisir' : 'Ouvrir';
      const href = ev.statut === 'PLANIFIE' && ev.population_figee ? `#/exercices/${ev.evenement_id}/saisie` : `#/exercices/${ev.evenement_id}`;
      return `<tr>
        <td data-label="Date">${escapeHtml(L.formatDate(ev.date))}</td>
        <td data-label="Domaine">${escapeHtml(domaineLabel(ev.domaine_code))}</td>
        <td data-label="Cible(s)">${escapeHtml(L.ciblesLabel(item.cibles))}</td>
        <td data-label="Libellé">${escapeHtml(ev.libelle)}</td>
        <td data-label="Statut">${statutBadge(ev.statut)}</td>
        <td data-label="Attendus">${ev.population_figee ? item.attendusInclus : '—'}</td>
        <td data-label="Présents">${ev.statut === 'REALISE' ? (item.compteurs.presents ?? '—') : '—'}</td>
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

  function renderNouveau() {
    const domaine = state.domaineForm || 'DPS';
    const cibles = state.referentiels.cibles.filter((c) => c.domaineCode === domaine);
    return `
      <div class="scope-crumb">Exercices / Nouvel exercice</div>
      <div class="scope-main">
        <div class="scope-card" style="max-width:640px">
          <h2 style="margin-top:0">Créer un exercice</h2>
          <div class="scope-field"><label>Date</label><input id="new-date" type="date" value="${state.year}-03-12"></div>
          <div class="scope-field" style="margin-top:8px"><label>Domaine</label>
            <select id="new-domaine">${state.referentiels.domaines.map((d) => `<option value="${d.code}" ${d.code === domaine ? 'selected' : ''}>${escapeHtml(d.libelleAffiche || L.domaineAffiche(d.code))}</option>`).join('')}</select>
          </div>
          <div class="scope-field" style="margin-top:8px"><label>Cible(s)</label>
            <div id="new-cibles" class="scope-chips">
              ${cibles.map((c) => `<label style="display:inline-flex;gap:6px;align-items:center;font-size:13px">
                <input type="checkbox" value="${c.cibleId}"> ${escapeHtml(c.niveauCode)}
              </label>`).join('') || '<span class="scope-empty">Aucune cible</span>'}
            </div>
          </div>
          <div class="scope-field"><label>Libellé</label><input id="new-libelle" type="text" placeholder="Habileté incendie"></div>
          <div class="scope-actions">
            <button type="button" class="scope-btn scope-btn-primary" id="new-save">Créer</button>
            <a class="scope-btn" href="#/exercices">Annuler</a>
          </div>
        </div>
      </div>
    `;
  }

  function renderFiche() {
    const fiche = state.fiche;
    if (!fiche) return `<div class="scope-main"><div class="scope-empty">Exercice introuvable.</div></div>`;
    const ev = fiche.evenement;
    if (ev.statut === 'REALISE') return renderRealise();
    const cta = L.principalCta({
      statut: ev.statut,
      populationFigee: ev.population_figee,
      previewReady: Boolean(state.preview)
    });
    const previewBlock = state.preview ? renderPreviewList() : '';
    return `
      <div class="scope-crumb">Exercices / ${escapeHtml(ev.libelle)}</div>
      <div class="scope-main">
        <div class="scope-card">
          <h2 style="margin-top:0">${escapeHtml(ev.libelle)}</h2>
          <dl class="scope-meta">
            <div><dt>Date</dt><dd>${escapeHtml(L.formatDate(ev.date))}</dd></div>
            <div><dt>Domaine</dt><dd>${escapeHtml(domaineLabel(ev.domaine_code))}</dd></div>
            <div><dt>Cibles</dt><dd>${escapeHtml(L.ciblesLabel(ciblesOf(fiche)))}</dd></div>
            <div><dt>Statut</dt><dd>${statutBadge(ev.statut)}</dd></div>
            <div><dt>Version</dt><dd>${escapeHtml(String(ev.version))}</dd></div>
            <div><dt>Population</dt><dd>${ev.population_figee ? 'Figée' : (state.preview ? 'Preview prête' : 'Non générée')}</dd></div>
          </dl>
          ${cta ? `<div class="scope-actions"><button type="button" class="scope-btn scope-btn-primary" data-cta="${cta.action}">${escapeHtml(cta.label)}</button>${ev.statut !== 'ANNULE' ? '<button type="button" class="scope-btn" id="cancel-event">Annuler l’exercice</button>' : ''}</div>` : (ev.statut !== 'ANNULE' ? `<div class="scope-actions"><button type="button" class="scope-btn" id="cancel-event">Annuler l’exercice</button></div>` : '')}
        </div>
        ${previewBlock}
      </div>
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
    const t = fiche.compteurs || {};
    const rows = state.saisie;
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

  function render() {
    const r = route();
    const body = r.screen === 'vue' ? renderPlaceholder('Vue d’ensemble', 'Vue d’ensemble')
      : r.screen === 'personnel' ? renderPlaceholder('Personnel', 'Personnel')
        : r.screen === 'nouveau' ? renderNouveau()
          : r.screen === 'saisie' ? renderSaisie()
            : r.screen === 'fiche' ? renderFiche()
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
      withLoading(async () => { await loadList(); });
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
    document.getElementById('scope-new')?.addEventListener('click', () => go('#/exercices/nouveau'));
    document.getElementById('new-domaine')?.addEventListener('change', (e) => {
      state.domaineForm = e.target.value;
      render();
    });
    document.getElementById('new-save')?.addEventListener('click', () => {
      const date = document.getElementById('new-date').value;
      const domaineCode = document.getElementById('new-domaine').value;
      const libelle = document.getElementById('new-libelle').value;
      const cibleIds = [...document.querySelectorAll('#new-cibles input:checked')].map((n) => n.value);
      withLoading(async () => {
        if (!date || !libelle || !cibleIds.length) {
          throw { status: 422, error: 'incomplet', message: 'Date, domaine, au moins une cible et un libellé sont requis.' };
        }
        const created = await client.createEvenement({ date, domaineCode, libelle, cibleIds });
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
    if (!location.hash) location.hash = '#/exercices';
    else await onRoute();
  })();
})();
