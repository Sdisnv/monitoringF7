/* SCOPE-IMPL-1B — helpers UI P0, sans calcul du taux officiel. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeUiLogic = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MOTIFS = [
    { value: 'PRIVE', label: 'Privé' },
    { value: 'PROFESSIONNEL', label: 'Professionnel' },
    { value: 'ARMEE', label: 'Armée' },
    { value: 'ACCIDENT_MALADIE', label: 'Accident / maladie' }
  ];
  const MOTIFS_HISTORIQUES = [
    { value: 'MALADIE', label: 'Maladie (historique)' },
    { value: 'ACCIDENT', label: 'Accident (historique)' },
    { value: 'AUTRE', label: 'Autre (historique)' },
    { value: 'NON_PRECISE', label: 'Non précisé (historique)' }
  ];

  function motifsForRow(row) {
    const extra = MOTIFS_HISTORIQUES.filter((m) => row && row.motifAbsence === m.value);
    return MOTIFS.concat(extra);
  }

  const STATUT_LABELS = {
    PLANIFIE: 'Planifié',
    REALISE: 'Réalisé',
    REPORTE: 'Reporté',
    ANNULE: 'Annulé',
    LEGACY_AGGREGATED: 'Historique agrégé'
  };

  const ROLE_LABELS = {
    PARTICIPANT: 'Participant',
    FORMATEUR: 'Formateur',
    SURVEILLANT: 'Surveillant',
    AUXILIAIRE: 'Auxiliaire',
    RENFORT: 'Renfort',
    REMPLACANT: 'Remplaçant'
  };

  function domaineAffiche(code) {
    return code === 'PR' ? 'PAPR' : String(code || '');
  }

  function statutLabel(code) {
    return STATUT_LABELS[code] || code || '';
  }

  function formatDate(iso) {
    const text = String(iso || '').slice(0, 10);
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return text || '—';
    return `${m[3]}.${m[2]}.${m[1]}`;
  }

  function formatTaux(percentage) {
    if (percentage === null || percentage === undefined || percentage === '') return '—';
    const n = Number(percentage);
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(1).replace('.', ',')} %`;
  }

  function formatGap(gapPct) {
    if (gapPct === null || gapPct === undefined || gapPct === '') return null;
    const n = Number(gapPct);
    if (!Number.isFinite(n)) return null;
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1).replace('.', ',')} pts`;
  }

  function analyticStatusLabel(code) {
    if (code === 'ATTEINT') return 'Atteint';
    if (code === 'ATTENTION') return 'Attention';
    if (code === 'VIGILANCE') return 'Vigilance';
    return 'Non évaluable';
  }

  const CHART_COLORS = Object.freeze({
    officiel: '#171C8F',
    objectif: '#FFA300',
    legacy: '#54585A',
    accent: '#DE000A'
  });

  function participationChartLayout(officiel, legacyPoints) {
    const official = (officiel || []).filter((b) => b && b.month && b.percentage != null);
    const legacy = (legacyPoints || []).filter((p) => p && p.date && p.tauxLegacy != null);
    if (!official.length && !legacy.length) return { mode: 'empty', height: 72, width: 640 };
    if (!official.length) return { mode: 'legacy', height: 112, width: 640 };
    if (official.length < 3) return { mode: 'sparse', height: 132, width: 640 };
    return { mode: 'full', height: 140, width: 640 };
  }

  function participationChartSvg(officiel, legacyPoints, size) {
    const layout = participationChartLayout(officiel, legacyPoints);
    const width = (size && size.width) || layout.width;
    const height = (size && size.height) || layout.height;
    const pad = { l: 36, r: 12, t: 12, b: 24 };
    const buckets = (officiel || []).filter((b) => b && b.month);
    const legacy = (legacyPoints || []).filter((p) => p && p.date && p.tauxLegacy != null);
    if (!buckets.length && !legacy.length) {
      return `<p class="scope-empty scope-chart-empty">Aucune série officielle sur cette période.</p>`;
    }
    const months = [...new Set([
      ...buckets.map((b) => b.month),
      ...legacy.map((p) => String(p.date).slice(0, 7))
    ])].sort();
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const xOf = (month) => {
      if (months.length === 1) return pad.l + innerW / 2;
      const i = months.indexOf(month);
      return pad.l + (i / (months.length - 1)) * innerW;
    };
    const yOf = (pct) => pad.t + innerH * (1 - (Number(pct) / 100));
    const officialPts = buckets
      .filter((b) => b.percentage != null)
      .map((b) => `${xOf(b.month).toFixed(1)},${yOf(b.percentage).toFixed(1)}`);
    const uniqueThresholds = [...new Set(buckets.map((b) => b.thresholdPct).filter((t) => t != null && t !== ''))];
    let objectiveMark = '';
    if (uniqueThresholds.length === 1) {
      const y = yOf(uniqueThresholds[0]);
      objectiveMark = `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="${CHART_COLORS.objectif}" stroke-dasharray="5 4" stroke-width="2" />`;
    } else if (uniqueThresholds.length > 1) {
      objectiveMark = '';
    }
    const ticks = [0, 50, 100].map((v) => {
      const y = yOf(v);
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="#e3e7ec"/><text x="4" y="${y + 4}" font-size="11" fill="#6b7785">${v}</text>`;
    }).join('');
    const monthLabels = months.map((m) => `<text x="${xOf(m)}" y="${height - 6}" font-size="11" text-anchor="middle" fill="#6b7785">${m.slice(5)}</text>`).join('');
    const legacyDots = legacy.map((p) => {
      const month = String(p.date).slice(0, 7);
      return `<circle cx="${xOf(month)}" cy="${yOf(p.tauxLegacy)}" r="3.5" fill="${CHART_COLORS.legacy}" />`;
    }).join('');
    return `<svg class="scope-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution du taux de participation">
      ${ticks}
      ${objectiveMark}
      ${officialPts.length > 1 ? `<polyline fill="none" stroke="${CHART_COLORS.officiel}" stroke-width="2.4" points="${officialPts.join(' ')}" />` : ''}
      ${officialPts.length === 1 ? `<circle cx="${officialPts[0].split(',')[0]}" cy="${officialPts[0].split(',')[1]}" r="4" fill="${CHART_COLORS.officiel}" />` : ''}
      ${legacyDots}
      ${monthLabels}
    </svg>`;
  }

  function sousDomaineNavLabel(node) {
    if (!node) return '';
    if (node.code === 'PR') return 'Protection respiratoire';
    if (node.code === 'AUTO') return 'AUTO';
    return node.libelle || node.libelleAffiche || node.code;
  }

  function navParentCode(arbre, code) {
    const wanted = String(code || '');
    for (const domaine of arbre || []) {
      if ((domaine.sousDomaines || []).some((s) => s.code === wanted)) return domaine.code;
    }
    return null;
  }

  function normalizeNavArbre(arbre, domaines, cibles) {
    if (arbre && arbre.length) return arbre;
    const list = (domaines || []).map((d) => {
      const code = d.code;
      const inferredParent = (code === 'PR' || code === 'AUTO') ? 'FOSPEC' : (d.parentCode || d.parent_code || null);
      return {
        code,
        libelle: d.libelle,
        libelleAffiche: d.libelleAffiche || d.libelle_affiche || (code === 'PR' ? 'PAPR' : code),
        nature: d.nature || (inferredParent ? 'SOUS_DOMAINE' : 'DOMAINE'),
        parentCode: inferredParent
      };
    });
    const roots = list.filter((d) => d.nature !== 'SOUS_DOMAINE' && !d.parentCode);
    return roots.map((d) => ({
      ...d,
      sousDomaines: list.filter((s) => s.parentCode === d.code).map((s) => ({
        ...s,
        cibles: (cibles || []).filter((c) => c.domaineCode === s.code)
      })),
      cibles: (cibles || []).filter((c) => c.domaineCode === d.code)
    }));
  }

  function buildSidebarNav(arbre, route) {
    const r = route || {};
    const roots = (arbre || []).filter((d) => d && d.nature !== 'SOUS_DOMAINE' && !d.parentCode);
    const parent = navParentCode(arbre, r.domaine);
    return {
      primary: [
        { id: 'vue', href: '#/vue', label: 'Vue d’ensemble' },
        { id: 'exercices', href: '#/exercices', label: 'Exercices' }
      ],
      domains: roots.map((d) => {
        const sous = d.sousDomaines || [];
        const cibles = d.cibles || [];
        const showCibles = !sous.length && cibles.length > 0 && cibles.length <= 6;
        const children = sous.length
          ? sous.map((s) => ({
            id: s.code,
            href: `#/vue/${encodeURIComponent(s.code)}`,
            label: sousDomaineNavLabel(s)
          }))
          : (showCibles
            ? cibles.map((c) => ({
              id: c.niveauCode,
              href: `#/vue/${encodeURIComponent(d.code)}/${encodeURIComponent(c.niveauCode)}`,
              label: c.niveauCode
            }))
            : []);
        const childActive = children.some((c) => c.id === r.domaine || c.id === r.cible);
        return {
          id: d.code,
          href: `#/vue/${encodeURIComponent(d.code)}`,
          label: d.libelleAffiche || d.code,
          expanded: d.code === r.domaine || d.code === parent || childActive,
          children
        };
      }),
      settings: [
        { id: 'objectifs', href: '#/reglages/objectifs', label: 'Objectifs' },
        { id: 'suivi', href: '#/reglages/suivi', label: 'Suivi nominatif' }
      ],
      extras: [
        { id: 'personnel', href: '#/personnel', label: 'Personnel' },
        { id: 'rapports', href: '#/rapports', label: 'Rapports' }
      ]
    };
  }

  function currentYear(now) {
    const d = now ? new Date(now) : new Date();
    return String(d.getFullYear());
  }

  function periodParams(state) {
    const preset = String((state && state.preset) || 'YEAR').toUpperCase();
    const year = String((state && state.year) || currentYear());
    const params = { preset, year };
    if (preset === 'MONTH') params.month = String((state && state.month) || '1');
    if (preset === 'QUARTER') params.quarter = String((state && state.quarter) || '1');
    if (preset === 'CUSTOM') {
      params.from = (state && state.from) || `${year}-01-01`;
      params.to = (state && state.to) || `${year}-12-31`;
    }
    if (state && state.domaine) params.domaine = state.domaine;
    if (state && state.cible) params.cible = state.cible;
    return params;
  }

  function alertLevelLabel(level) {
    if (level === 'P0') return 'Action requise';
    if (level === 'P1') return 'Vigilance métier';
    if (level === 'P2') return 'Information';
    return '';
  }

  function objectiveKpiLabel(officiel) {
    const ctx = (officiel && officiel.objectiveContext) || {};
    const distinct = ctx.distinctObjectives || [];
    if (ctx.homogeneous === false && distinct.length > 1) {
      return { title: 'Période non homogène', subtitle: 'Plusieurs objectifs temporels — aucun seuil unique.' };
    }
    if (!officiel || !officiel.objective) {
      return { title: 'Aucun objectif défini', subtitle: '' };
    }
    const o = officiel.objective;
    const pct = Number(o.thresholdPct);
    const title = Number.isFinite(pct) ? `${String(pct).replace('.', ',')} %` : '—';
    const subtitle = o.scope === 'GLOBAL'
      ? 'Global'
      : o.scope === 'DOMAINE'
        ? `Domaine ${o.domaineCode || o.domaine_code || ''}`.trim()
        : 'Cible';
    return { title, subtitle };
  }

  function parseHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    const path = raw.split('?')[0];
    const parts = path.split('/').filter(Boolean);
    if (!parts.length || parts[0] === 'exercices') {
      if (parts[1] === 'nouveau') return { screen: 'nouveau', nav: 'exercices' };
      if (parts[1] === 'import') return { screen: 'import', nav: 'exercices' };
      if (parts[1] && parts[2] === 'saisie') return { screen: 'saisie', nav: 'exercices', id: parts[1] };
      if (parts[1]) return { screen: 'fiche', nav: 'exercices', id: parts[1] };
      return { screen: 'liste', nav: 'exercices' };
    }
    if (parts[0] === 'vue') {
      if (parts[1] && parts[2]) return { screen: 'vue', nav: 'vue', domaine: parts[1], cible: parts[2] };
      if (parts[1]) return { screen: 'vue', nav: 'vue', domaine: parts[1] };
      return { screen: 'vue', nav: 'vue' };
    }
    if (parts[0] === 'personnel') return { screen: 'personnel', nav: 'personnel' };
    if (parts[0] === 'reglages' && parts[1] === 'personnel') return { screen: 'personnel', nav: 'personnel' };
    if (parts[0] === 'rapports') return { screen: 'rapports', nav: 'rapports' };
    if (parts[0] === 'reglages' && parts[1] === 'suivi') {
      return { screen: 'suivi', nav: 'reglages' };
    }
    if (parts[0] === 'reglages' && (!parts[1] || parts[1] === 'objectifs')) {
      return { screen: 'objectifs', nav: 'reglages' };
    }
    return { screen: 'liste', nav: 'exercices' };
  }

  function principalCta({ statut, populationFigee, previewReady, origine, modeSuivi }) {
    if (origine === 'LEGACY_AGGREGATED' || modeSuivi === 'LEGACY') return null;
    if (statut && statut !== 'PLANIFIE') return null;
    if (modeSuivi === 'QUANTITATIF') return { action: 'saisir-volumes', label: 'Saisir les présences' };
    if (populationFigee) return { action: 'saisir', label: 'Saisir les participations' };
    if (previewReady) return { action: 'figer', label: 'Figer la population' };
    return { action: 'generer', label: 'Générer les attendus' };
  }

  function modeSuiviOf(evenement) {
    const explicit = String((evenement && (evenement.mode_suivi || evenement.modeSuivi)) || '').toUpperCase();
    if (explicit === 'NOMINATIF' || explicit === 'QUANTITATIF' || explicit === 'LEGACY') return explicit;
    if (evenement && evenement.origine === 'LEGACY_AGGREGATED') return 'LEGACY';
    return 'NOMINATIF';
  }

  function modeLabel(mode) {
    if (mode === 'QUANTITATIF') return 'Quantitatif';
    if (mode === 'LEGACY') return 'Historique agrégé';
    return 'Nominatif';
  }

  function volumesEquality(volumes) {
    const attendus = Number(volumes && volumes.attendus);
    const presents = Number(volumes && volumes.presents);
    const nonExcuses = Number(volumes && volumes.nonExcuses);
    const dispenses = Number(volumes && volumes.dispenses);
    const permutations = Number((volumes && volumes.permutations) || 0);
    const motifKeys = ['excusesPrive', 'excusesProfessionnel', 'excusesArmee', 'excusesAccidentMaladie', 'excusesNonPrecise'];
    const hasMotifs = motifKeys.some((key) => volumes && volumes[key] !== undefined && volumes[key] !== '');
    const motifSum = motifKeys.reduce((sum, key) => sum + Number((volumes && volumes[key]) || 0), 0);
    const excuses = hasMotifs ? motifSum : Number(volumes && volumes.excuses);
    if (![attendus, presents, excuses, nonExcuses, dispenses, permutations].every((n) => Number.isInteger(n) && n >= 0)) {
      return false;
    }
    if (permutations > presents) return false;
    if (hasMotifs && volumes.excuses !== '' && volumes.excuses != null && Number(volumes.excuses) !== motifSum) {
      return false;
    }
    return attendus === presents + excuses + nonExcuses + dispenses;
  }

  function liveCounters(rows) {
    let present = 0;
    let excuse = 0;
    let absent = 0;
    let dispense = 0;
    let open = 0;
    for (const row of rows || []) {
      if (row.inclus === false) continue;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role) && row.inclus !== true) continue;
      const s = row.statut;
      if (s === 'PRESENT' || s === 'PERMUTATION') present += 1;
      else if (s === 'ABSENT_EXCUSE') excuse += 1;
      else if (s === 'ABSENT_NON_EXCUSE') absent += 1;
      else if (s === 'DISPENSE') dispense += 1;
      else if (s === 'NON_RENSEIGNE' || !s) open += 1;
    }
    return { present, excuse, absent, dispense, open };
  }

  function clotureDisabled(counters) {
    return Number(counters && counters.open) > 0;
  }

  function needsConfirmAllPresent(rows) {
    return (rows || []).some((row) => {
      if (row.inclus === false) return false;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role)) return false;
      return row.statut && row.statut !== 'NON_RENSEIGNE' && row.statut !== 'PRESENT';
    });
  }

  function applyAllPresent(rows) {
    return (rows || []).map((row) => {
      if (row.inclus === false) return row;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '' });
    });
  }

  function applyAllPresentFiltered(rows, cibleCode) {
    return (rows || []).map((row) => {
      if (cibleCode && row.cible !== cibleCode && !(row.cibles || []).includes(cibleCode)) return row;
      if (row.inclus === false) return row;
      if (row.role && ['FORMATEUR', 'SURVEILLANT', 'AUXILIAIRE'].includes(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '' });
    });
  }

  function friendlyError(error) {
    const status = Number(error && error.status);
    const code = error && (error.error || error.code);
    if (status === 0 || code === 'network') {
      return { tone: 'error', title: 'Connexion interrompue', message: 'Le serveur n’est pas joignable. Vérifiez le réseau puis réessayez.' };
    }
    if (status === 401) {
      return {
        tone: 'error',
        title: 'Session institutionnelle requise',
        message: 'Connectez-vous avec Okta. SCOPE live n’utilise pas de jeton technique injecté.',
        okta: true
      };
    }
    if (status === 403) {
      return { tone: 'error', title: 'Action non autorisée', message: 'Votre profil ne permet pas cette modification.' };
    }
    if (status === 409 || code === 'conflict') {
      return {
        tone: 'warning',
        title: 'Séance modifiée ailleurs',
        message: 'Cette séance a été modifiée ailleurs. Rechargez les données avant de poursuivre.',
        conflict: true
      };
    }
    if (status === 422) {
      const details = (error && error.details && error.details.errors) || [];
      const lines = details.map((item) => item.message || item.code).filter(Boolean);
      return {
        tone: 'error',
        title: 'Action refusée',
        message: lines.length ? lines.join(' ') : (error.message || 'La saisie n’est pas complète.'),
        errors: details
      };
    }
    return { tone: 'error', title: 'Impossible de continuer', message: (error && error.message) || 'Une erreur est survenue.' };
  }

  function ciblesLabel(cibles) {
    if (!cibles || !cibles.length) return '—';
    return cibles.map((c) => c.niveau_code || c.niveauCode || c.libelle || c).join(' · ');
  }

  function displayTauxForList(statut, officiel, percentage, extra) {
    if (extra && extra.origine === 'LEGACY_AGGREGATED') {
      const label = formatTaux(percentage);
      return label === '—' ? 'Non nominatif' : `${label} · non nominatif`;
    }
    if (statut !== 'REALISE') return '—';
    if (officiel === false) return '—';
    return formatTaux(percentage);
  }

  function legacyTauxFromRow(legacy) {
    if (!legacy) return null;
    const presents = Number(legacy.nb_presents);
    const payload = legacy.payload_v67 || legacy.payloadV67 || {};
    const attendu = Number(payload.total_attendu || legacy.nb_convoques);
    if (!Number.isFinite(presents) || !Number.isFinite(attendu) || attendu <= 0) return null;
    return Math.round((100 * presents) / attendu * 10) / 10;
  }

  function emptyMessage(kind) {
    const map = {
      exercices: 'Aucun exercice sur la période choisie.',
      attendus: 'Aucun attendu généré pour cet exercice.',
      resultats: 'Aucun résultat nominatif pour cet exercice.',
      personnes: 'Aucune personne ne correspond à cette recherche.',
      objectifs: 'Aucun objectif de participation défini.'
    };
    return map[kind] || 'Aucun élément.';
  }

  function resolveClientMode({ search, sessionLive } = {}) {
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    if (params.get('mode') === 'demo') return 'demo';
    if (params.get('mode') === 'live' && sessionLive) return 'live';
    if (params.get('mode') === 'live') return 'gate';
    return 'demo';
  }

  function oktaLoginHref(returnPath) {
    const raw = String(returnPath || '/scope.html').trim();
    const safe = raw.startsWith('/') && !raw.startsWith('//') && !/^javascript:/i.test(raw)
      ? raw
      : '/scope.html';
    return `/auth/oidc/start?returnTo=${encodeURIComponent(safe)}`;
  }

  return {
    MOTIFS,
    motifsForRow,
    STATUT_LABELS,
    ROLE_LABELS,
    domaineAffiche,
    statutLabel,
    formatDate,
    formatTaux,
    formatGap,
    analyticStatusLabel,
    CHART_COLORS,
    participationChartLayout,
    participationChartSvg,
    sousDomaineNavLabel,
    navParentCode,
    normalizeNavArbre,
    buildSidebarNav,
    currentYear,
    periodParams,
    alertLevelLabel,
    objectiveKpiLabel,
    parseHash,
    principalCta,
    modeSuiviOf,
    modeLabel,
    volumesEquality,
    liveCounters,
    clotureDisabled,
    needsConfirmAllPresent,
    applyAllPresent,
    applyAllPresentFiltered,
    friendlyError,
    ciblesLabel,
    displayTauxForList,
    legacyTauxFromRow,
    emptyMessage,
    resolveClientMode,
    oktaLoginHref
  };
});
