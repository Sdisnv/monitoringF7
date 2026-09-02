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
    { value: 'ACCIDENT_MALADIE', label: 'Accident/Maladie' }
  ];
  const MOTIFS_DISPENSE = [
    { value: 'JOKER', label: 'Joker' },
    { value: 'FORMATEUR_PR', label: 'Formateur PR' },
    { value: 'FORMATION_HORS_SDIS', label: 'Formation hors SDIS' },
    { value: 'PAS_CONCERNE', label: 'Pas concerné' }
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

  function motifsDispenseForRow() {
    return MOTIFS_DISPENSE.slice();
  }

  function isDispenseMotif(value) {
    return MOTIFS_DISPENSE.some((m) => m.value === String(value || ''));
  }

  const STATUT_LABELS = {
    PLANIFIE: 'Planifié',
    SAISIE_EN_COURS: 'Saisie en cours',
    A_TRAITER: 'À traiter',
    TRAITE: 'Traité',
    REALISE: 'Réalisé',
    REPORTE: 'Reporté',
    ANNULE: 'Annulé',
    LEGACY_AGGREGATED: 'Historique agrégé'
  };

  const ROLE_LABELS = {
    PARTICIPANT: 'Participant',
    FORMATEUR: 'Formateur',
    MONITEUR: 'Moniteur',
    SURVEILLANT: 'Surveillant',
    AUXILIAIRE: 'Auxiliaire',
    RENFORT: 'Renfort',
    REMPLACANT: 'Remplaçant'
  };
  const ENCADREMENT_ROLE_ORDER = Object.freeze(['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
  const ROLES_ENCADREMENT = new Set(ENCADREMENT_ROLE_ORDER);

  function domaineAffiche(code) {
    const value = String(code || '');
    if (value === 'PR') return 'PAPR';
    if (value === 'GEN') return 'Général';
    return value;
  }

  function niveauAffiche(domaineCode, niveauCode) {
    const domaine = String(domaineCode || '');
    const niveau = String(niveauCode || '');
    if (niveau === 'GEN') return 'Général';
    if (domaine === 'FOBA' && /^[123]$/.test(niveau)) return `FOBA ${niveau}`;
    if (domaine === 'FOCA') {
      if (niveau === 'I') return 'Échelon I';
      if (niveau === 'II') return 'Échelon II';
      if (niveau === 'III_IV' || niveau === 'III-IV' || niveau === 'III/IV') return 'Échelons III et IV';
    }
    return niveau;
  }

  function statutLabel(code) {
    return STATUT_LABELS[code] || code || '';
  }

  function parsePrSessionLabel(label) {
    const text = String(label || '').trim();
    const m = text.match(/^(\d+)(?:\.(\d+))?$/);
    if (!m) return { label: text, major: Number.MAX_SAFE_INTEGER, minor: Number.MAX_SAFE_INTEGER };
    return { label: text, major: Number(m[1]), minor: m[2] == null ? 0 : Number(m[2]) };
  }

  function uniqueSortedPrSessionLabels(labels) {
    const seen = new Set();
    return (labels || [])
      .map((label) => String(label || '').trim())
      .filter(Boolean)
      .filter((label) => {
        if (seen.has(label)) return false;
        seen.add(label);
        return true;
      })
      .sort((a, b) => {
        const left = parsePrSessionLabel(a);
        const right = parsePrSessionLabel(b);
        if (left.major !== right.major) return left.major - right.major;
        if (left.minor !== right.minor) return left.minor - right.minor;
        return left.label.localeCompare(right.label, 'fr', { numeric: true, sensitivity: 'base' });
      });
  }

  function compactPrSessionLabels(labels) {
    const sorted = uniqueSortedPrSessionLabels(labels);
    const parts = [];
    let run = [];
    const flush = () => {
      if (!run.length) return;
      if (run.length >= 3) parts.push(`${run[0].label} à ${run[run.length - 1].label}`);
      else run.forEach((item) => parts.push(item.label));
      run = [];
    };
    for (const label of sorted) {
      const parsed = parsePrSessionLabel(label);
      const last = run[run.length - 1];
      const continuous = last
        && parsed.major === last.major
        && Number.isFinite(parsed.minor)
        && Number.isFinite(last.minor)
        && parsed.minor === last.minor + 1;
      if (!run.length || continuous) run.push(parsed);
      else {
        flush();
        run.push(parsed);
      }
    }
    flush();
    return parts;
  }

  function joinFrenchList(parts) {
    const values = (parts || []).filter(Boolean);
    if (!values.length) return '';
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} et ${values[1]}`;
    return `${values.slice(0, -1).join(', ')} et ${values[values.length - 1]}`;
  }

  function formatPrSessionList(labels) {
    const parts = compactPrSessionLabels(labels);
    return joinFrenchList(parts);
  }

  function formatFormateurPrTooltip(fullName, nip, labels) {
    const sorted = uniqueSortedPrSessionLabels(labels);
    if (!sorted.length) return '';
    const person = `${fullName || 'Personne'}${nip ? ` (${nip})` : ''}`;
    if (sorted.length === 1) {
      return `${person} participe comme Formateur PR à la session ${sorted[0]}.`;
    }
    return `${person} participe comme Formateur PR aux sessions ${formatPrSessionList(sorted)}.`;
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
    const order = ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC'];
    const rank = (code) => {
      const idx = order.indexOf(code);
      return idx === -1 ? order.length + 1 : idx;
    };
    const roots = (arbre || [])
      .filter((d) => d && d.nature !== 'SOUS_DOMAINE' && !d.parentCode)
      .slice()
      .sort((a, b) => {
        const ra = rank(a.code);
        const rb = rank(b.code);
        if (ra !== rb) return ra - rb;
        return String(a.libelleAffiche || a.code).localeCompare(String(b.libelleAffiche || b.code), 'fr');
      });
    const parent = navParentCode(arbre, r.domaine);
    return {
      primary: [
        { id: 'accueil', href: '#/accueil', label: 'Accueil' },
        { id: 'vue', href: '#/vue', label: 'Vue d’ensemble' },
        { id: 'exercices', href: '#/evenements', label: 'Événements' },
        { id: 'cycles', href: '#/cycles', label: 'Cycles' },
        { id: 'statistiques', href: '#/statistiques', label: 'Statistiques' }
      ],
      domains: roots.map((d) => {
        const sous = d.sousDomaines || [];
        const cibles = (d.cibles || []).filter((c) => {
          const niveau = String(c.niveauCode || c.niveau_code || '').toUpperCase();
          return !(niveau === 'GEN' && ['DPS', 'DAP', 'JSP'].includes(String(d.code || '').toUpperCase()));
        });
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
              label: niveauAffiche(d.code, c.niveauCode)
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
        { id: 'suivi', href: '#/reglages/suivi', label: 'Suivi nominatif' },
        { id: 'import-evenements', href: '#/reglages/import-evenements', label: 'Import des événements' },
        { id: 'import-personnel', href: '#/reglages/import-personnel', label: 'Import du personnel' },
        { id: 'utilisateurs', href: '#/reglages/utilisateurs', label: 'Utilisateurs' },
        { id: 'administration', href: '#/reglages/administration', label: 'Administration' }
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
    } else if (state && state.from && state.to) {
      params.from = state.from;
      params.to = state.to;
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

  function participationStatutLabel(statut) {
    if (statut === 'PRESENT') return 'Présent';
    if (statut === 'PERMUTATION') return 'Permutation (présent)';
    if (statut === 'ABSENT_EXCUSE') return 'Excusé';
    if (statut === 'ABSENT_NON_EXCUSE') return 'Non excusé';
    if (statut === 'DISPENSE') return 'Dispensé';
    if (statut === 'NON_RENSEIGNE') return 'Non renseigné';
    if (statut === 'NON_CONCERNE') return 'Non concerné';
    return statut || '—';
  }

  function parseHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    const path = raw.split('?')[0];
    const parts = path.split('/').filter(Boolean);
    if (!parts.length || parts[0] === 'accueil') return { screen: 'accueil', nav: 'accueil' };
    if (parts[0] === 'statistiques') return { screen: 'statistiques', nav: 'statistiques' };
    if (parts[0] === 'cycles') {
      if(parts[1]) return { screen: 'cycle', nav: 'cycles', id: parts[1] };
      return { screen: 'cycles', nav: 'cycles' };
    }
    if (parts[0] === 'evenements') parts[0] = 'exercices';
    if (!parts.length || parts[0] === 'exercices') {
      if (parts[1] === 'nouveau') return { screen: 'nouveau', nav: 'exercices' };
      if (parts[1] === 'import') return { screen: 'import-evenements', nav: 'reglages' };
      if (parts[1] && parts[2] === 'saisie') return { screen: 'saisie', nav: 'exercices', id: parts[1] };
      if (parts[1]) return { screen: 'fiche', nav: 'exercices', id: parts[1] };
      return { screen: 'liste', nav: 'exercices' };
    }
    if (parts[0] === 'vue') {
      if (parts[1] && parts[2]) return { screen: 'vue', nav: 'vue', domaine: parts[1], cible: parts[2] };
      if (parts[1]) return { screen: 'vue', nav: 'vue', domaine: parts[1] };
      return { screen: 'vue', nav: 'vue' };
    }
    if (parts[0] === 'personnel') {
      if (parts[1]) return { screen: 'personne', nav: 'personnel', personneId: parts[1] };
      return { screen: 'personnel', nav: 'personnel' };
    }
    if (parts[0] === 'reglages' && parts[1] === 'personnel') return { screen: 'personnel', nav: 'personnel' };
    if (parts[0] === 'reglages' && parts[1] === 'import-evenements') return { screen: 'import-evenements', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'import-personnel') return { screen: 'import-personnel', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'utilisateurs') return { screen: 'utilisateurs', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'administration') return { screen: 'administration', nav: 'reglages' };
    if (parts[0] === 'rapports') return { screen: 'rapports', nav: 'rapports' };
    if (parts[0] === 'apropos') return { screen: 'apropos', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'apropos') return { screen: 'apropos', nav: 'reglages' };
    if (parts[0] === 'reglages' && parts[1] === 'suivi') {
      return { screen: 'suivi', nav: 'reglages' };
    }
    if (parts[0] === 'reglages' && (!parts[1] || parts[1] === 'objectifs')) {
      return { screen: 'objectifs', nav: 'reglages' };
    }
    return { screen: 'accueil', nav: 'accueil' };
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
    let formateur = 0;
    let excuse = 0;
    let absent = 0;
    let dispense = 0;
    let open = 0;
    for (const row of rows || []) {
      if (!countsInSaisieTaux(row)) continue;
      const s = row.statut;
      if (s === 'PRESENT' || s === 'PERMUTATION') {
        present += 1;
        if (row.role === 'FORMATEUR') formateur += 1;
      }
      else if (s === 'ABSENT_EXCUSE') excuse += 1;
      else if (s === 'ABSENT_NON_EXCUSE') absent += 1;
      else if (s === 'DISPENSE') dispense += 1;
      else if ((s === 'NON_RENSEIGNE' || !s) && !sessionLocked(row)) open += 1;
    }
    return { present, formateur, excuse, absent, dispense, open };
  }

  function countsInSaisieTaux(row) {
    if (!row || row.inclus === false) return false;
    if (row.alreadyCountedInSession) return false;
    const jsp = String(row.jspRole || row.jsp_role || '').toUpperCase();
    if (jsp === 'MONITEUR') return false;
    const role = String(row.role || '').toUpperCase();
    if (role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
    if (ROLES_ENCADREMENT.has(role) && row.inclus !== true) return false;
    return true;
  }

  function participationStatusesForDomaine(domaine) {
    const raw = String(domaine || '').toUpperCase();
    const d = raw === 'PR' ? 'PAPR' : raw;
    const list = [
      ['PRESENT', 'Présent'],
      ['ABSENT_EXCUSE', 'Excusé'],
      ['ABSENT_NON_EXCUSE', 'Absent']
    ];
    if (d !== 'JSP') list.push(['DISPENSE', 'Dispensé']);
    if (d === 'DAP') list.push(['PERMUTATION', 'Permutation']);
    return list;
  }

  function preserveParticipationRole(role) {
    const r = String(role || 'PARTICIPANT').toUpperCase();
    return ROLES_ENCADREMENT.has(r) ? r : 'PARTICIPANT';
  }

  function statusLockedForRole(role) {
    const r = String(role || '').toUpperCase();
    return r === 'FORMATEUR' || r === 'MONITEUR' || r === 'AUXILIAIRE';
  }

  function applyParticipationStatus(row, statut) {
    const next = Object.assign({}, row);
    next.role = preserveParticipationRole(row && row.role);
    if (statusLockedForRole(next.role)) {
      next.presenceEdited = true;
      return next;
    }
    const wasActive = row && row.statut === statut;
    if (wasActive) {
      next.statut = 'NON_RENSEIGNE';
      next.motifAbsence = '';
      next.commentaire = '';
      next.editMotif = false;
    } else {
      next.statut = statut;
      if (statut === 'ABSENT_EXCUSE') {
        if (!next.motifAbsence || isDispenseMotif(next.motifAbsence)) {
          next.motifAbsence = '';
          next.editMotif = true;
        }
      } else if (statut === 'DISPENSE') {
        if (!isDispenseMotif(next.motifAbsence)) {
          next.motifAbsence = '';
          next.commentaire = '';
          next.editMotif = true;
        }
      } else {
        next.motifAbsence = '';
        next.commentaire = '';
        next.editMotif = false;
      }
    }
    next.presenceEdited = true;
    return next;
  }

  function applyExcuseMotif(row, motif) {
    const next = Object.assign({}, row, {
      statut: 'ABSENT_EXCUSE',
      motifAbsence: motif,
      editMotif: false,
      presenceEdited: true,
      role: preserveParticipationRole(row && row.role)
    });
    if (motif !== 'AUTRE') next.commentaire = row && row.motifAbsence === 'AUTRE' ? '' : (row.commentaire || '');
    return next;
  }

  function applyDispenseMotif(row, motif) {
    return Object.assign({}, row, {
      statut: 'DISPENSE',
      motifAbsence: motif,
      editMotif: false,
      presenceEdited: true,
      commentaire: '',
      role: preserveParticipationRole(row && row.role)
    });
  }

  function buildPresenceSavePayload(rows, encadrementIds) {
    const lockedEncadrement = encadrementIds || new Set();
    return (rows || [])
      .filter((r) => {
        if (r.inclus === false || r.alreadyCountedInSession) return false;
        const role = preserveParticipationRole(r.role);
        if (role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
        const locked = lockedEncadrement.has(String(r.personneId));
        return !locked || (role === 'SURVEILLANT' && r.presenceEdited);
      })
      .map((r) => ({
        personneId: r.personneId,
        statut: r.statut,
        role: preserveParticipationRole(r.role),
        motif_absence: r.motifAbsence || null,
        commentaire: r.commentaire || null
      }));
  }

  function excuseBreakdown(rows) {
    const counts = Object.fromEntries(MOTIFS.map((m) => [m.value, 0]));
    for (const row of rows || []) {
      if (!row || row.inclus === false || row.statut !== 'ABSENT_EXCUSE') continue;
      const key = String(row.motifAbsence || row.motif_absence || '');
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
    }
    return MOTIFS.map((m) => ({ value: m.value, label: m.label, count: counts[m.value] || 0 }));
  }

  function clotureDisabled(counters) {
    return false;
  }

  function sessionLocked(row) {
    return Boolean(row && (row.alreadyCountedInSession || row.sessionExcuse || row.sessionDispense));
  }

  function isOpenSaisieRow(row) {
    if (!row || row.inclus === false) return false;
    if (sessionLocked(row)) return false;
    return !row.statut || row.statut === 'NON_RENSEIGNE';
  }

  function hasIncompleteDispense(rows) {
    return (rows || []).some((row) =>
      row
      && row.inclus !== false
      && !sessionLocked(row)
      && row.statut === 'DISPENSE'
      && !isDispenseMotif(row.motifAbsence)
    );
  }
  function hasIncompleteExcuse(rows) {
    return (rows || []).some((row) =>
      row
      && row.inclus !== false
      && !sessionLocked(row)
      && row.statut === 'ABSENT_EXCUSE'
      && !row.motifAbsence
    );
  }

  function closureBlockers(rows) {
    const out = { open: 0, incompleteExcuses: 0, incompleteDispenses: 0, message: '' };
    (rows || []).forEach((row) => {
      if (!row || row.inclus === false || sessionLocked(row)) return;
      if (!row.statut || row.statut === 'NON_RENSEIGNE') out.open += 1;
      if (row.statut === 'ABSENT_EXCUSE' && !row.motifAbsence) out.incompleteExcuses += 1;
      if (row.statut === 'DISPENSE' && !isDispenseMotif(row.motifAbsence)) out.incompleteDispenses += 1;
    });
    const parts = [];
    if (out.incompleteExcuses) parts.push(`${out.incompleteExcuses} absence${out.incompleteExcuses > 1 ? 's excusées sans motif' : ' excusée sans motif'}`);
    if (out.incompleteDispenses) parts.push(`${out.incompleteDispenses} dispense${out.incompleteDispenses > 1 ? 's sans motif' : ' sans motif'}`);
    out.message = parts.length ? `Clôture impossible : ${parts.join(' ; ')}.` : '';
    return out;
  }

  function resetSaisie(rows) {
    return (rows || []).map((row) => Object.assign({}, row, {
      statut: 'NON_RENSEIGNE',
      role: 'PARTICIPANT',
      motifAbsence: '',
      commentaire: ''
    }));
  }

  function normalizeDomaineForContribution(value) {
    const domaine = String(value || '').toUpperCase();
    return domaine === 'PR' ? 'PAPR' : domaine;
  }

  function getEncadrementContribution({ domaine, role, contexte } = {}) {
    const d = normalizeDomaineForContribution(domaine);
    const r = String(role || '').toUpperCase();
    const session = String((contexte && (contexte.type || contexte.kind)) || '').toUpperCase() === 'SESSION';
    const base = {
      role: r,
      domaine: d,
      countsPopulationSuivie: false,
      countsTauxPresence: false,
      countsEffectifEngageEvenement: false,
      countsEffectifConsolideSession: false,
      informatifSeulement: true,
      dedupeByNip: true
    };
    if (r === 'AUXILIAIRE') return base;
    if (r === 'MONITEUR') return base;
    if (r === 'SURVEILLANT') return base;
    if (r === 'FORMATEUR') return Object.assign({}, base, {
      countsEffectifEngageEvenement: d === 'DPS' || d === 'DAP',
      countsEffectifConsolideSession: session && (d === 'AUTO' || d === 'PAPR'),
      informatifSeulement: !(d === 'DPS' || d === 'DAP' || (session && (d === 'AUTO' || d === 'PAPR')))
    });
    return Object.assign({}, base, { dedupeByNip: false });
  }

  function needsConfirmReset(rows, encadrement) {
    if ((encadrement || []).some((row) => row && ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase()))) return true;
    return (rows || []).some((row) => row && row.inclus !== false && (
      (row.statut && row.statut !== 'NON_RENSEIGNE') ||
      ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase()) ||
      row.motifAbsence ||
      row.commentaire
    ));
  }

  function needsConfirmAllPresent(rows) {
    return (rows || []).some((row) => {
      if (row.inclus === false) return false;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return false;
      return row.statut && row.statut !== 'NON_RENSEIGNE' && row.statut !== 'PRESENT';
    });
  }

  function applyAllPresent(rows) {
    return (rows || []).map((row) => {
      if (row.inclus === false) return row;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '', role: 'PARTICIPANT' });
    });
  }

  function applyAllPresentFiltered(rows, cibleCode) {
    return (rows || []).map((row) => {
      if (cibleCode && row.cible !== cibleCode && !(row.cibles || []).includes(cibleCode)) return row;
      if (row.inclus === false) return row;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '', role: 'PARTICIPANT' });
    });
  }

  function saisieAttendusFromFiche(fiche) {
    return ((fiche && fiche.attendus) || []).filter((row) => row && row.inclus !== false);
  }

  function personnelMutationError(error) {
    const info = friendlyError(error);
    const status = Number(error && (error.status || error.statusCode));
    const raw = `${(info && info.title) || ''} ${(info && info.message) || ''} ${(error && error.message) || ''}`;
    if (status === 422 || status === 400 || status === 404) {
      return {
        tone: 'error',
        title: info.title || 'Action refusée',
        message: (error && error.message) || info.message
      };
    }
    if (/<html[\s>]|inactivity timeout|timed?\s*out|timeout|délai d’exécution|delai d.execution|netlify|sql\b/i.test(raw)) {
      return {
        tone: 'error',
        title: 'Enregistrement impossible',
        message: 'L’opération n’a pas pu être enregistrée. Vérifiez la saisie et réessayez.'
      };
    }
    return info;
  }

  function friendlyError(error) {
    const status = Number(error && error.status);
    const code = error && (error.error || error.code);
    const message = String(error && error.message || '');
    const payloadMessage = String(error && error.payload && error.payload.message || '');
    const raw = `${message} ${payloadMessage}`;
    if (/<html[\s>]/i.test(raw) || /inactivity timeout|timed?\s*out|timeout/i.test(raw)) {
      return {
        tone: 'error',
        title: 'Import interrompu',
        message: 'Le traitement n’a pas pu être finalisé. Aucune nouvelle tentative ne sera lancée automatiquement. Erreur technique : délai d’exécution dépassé.'
      };
    }
    if (status === 0 || code === 'network') {
      return { tone: 'error', title: 'Import interrompu', message: 'La réponse du serveur a été interrompue. Relancez une preview avant de décider de réessayer.' };
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
    return cibles.map((c) => {
      if (!c || typeof c !== 'object') return c;
      const domaine = c.domaine_code || c.domaineCode || '';
      const niveau = c.niveau_code || c.niveauCode || c.libelle || '';
      return niveauAffiche(domaine, niveau);
    }).join(' · ');
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
      exercices: 'Aucun événement sur la période choisie.',
      attendus: 'Aucun attendu généré pour cet événement.',
      resultats: 'Aucun résultat nominatif pour cet événement.',
      personnes: 'Aucune personne ne correspond à cette recherche.',
      objectifs: 'Aucun objectif de participation défini.'
    };
    return map[kind] || 'Aucun élément.';
  }

  function loadingMessage(kind) {
    const map = {
      exercices: 'Chargement des événements…',
      personnel: 'Chargement du personnel…',
      dashboard: 'Chargement de la vue d’ensemble…',
      personne: 'Chargement de la fiche…',
      rapports: 'Chargement des rapports…'
    };
    return map[kind] || 'Chargement…';
  }

  function errorMessage(kind) {
    const map = {
      exercices: 'Impossible de charger les événements. Réessayez.',
      personnel: 'Impossible de charger le personnel. Réessayez.',
      dashboard: 'Impossible de charger la vue d’ensemble. Réessayez.',
      personne: 'Impossible de charger la fiche. Réessayez.',
      rapports: 'Impossible de charger les rapports. Réessayez.'
    };
    return map[kind] || 'Impossible de charger les données. Réessayez.';
  }

  function listViewState({ ready, error, count } = {}) {
    if (error) return 'error';
    if (!ready) return 'loading';
    if (!count) return 'empty';
    return 'content';
  }

  const SORT_STATUS_ORDER = Object.freeze({
    PLANIFIE: 10,
    REALISE: 20,
    REPORTE: 30,
    ANNULE: 40,
    LEGACY_AGGREGATED: 50,
    NON_RENSEIGNE: 10,
    PRESENT: 20,
    FORMATEUR: 25,
    ABSENT_EXCUSE: 30,
    ABSENT_NON_EXCUSE: 40,
    DISPENSE: 50,
    PERMUTATION: 60
  });

  const FR_SORT_COLLATOR = new Intl.Collator('fr-CH', { numeric: true, sensitivity: 'base' });

  function cleanSortText(value) {
    return String(value == null ? '' : value).trim();
  }

  function parseSortDate(value) {
    const text = cleanSortText(value).slice(0, 10);
    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return Number(`${m[1]}${m[2]}${m[3]}`);
    m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return Number(`${m[3]}${m[2]}${m[1]}`);
    const timestamp = Date.parse(text);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function parseSortTime(value) {
    const text = cleanSortText(value);
    const m = text.match(/(\d{1,2})[:hH](\d{2})?/);
    if (!m) return null;
    const hours = Number(m[1]);
    const minutes = Number(m[2] || 0);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  }

  function compareSortValues(a, b, type) {
    const kind = type || 'text';
    if (kind === 'date') {
      const da = parseSortDate(a);
      const db = parseSortDate(b);
      if (da !== null || db !== null) return (da ?? Number.MAX_SAFE_INTEGER) - (db ?? Number.MAX_SAFE_INTEGER);
    }
    if (kind === 'time') {
      const ta = parseSortTime(a);
      const tb = parseSortTime(b);
      if (ta !== null || tb !== null) return (ta ?? Number.MAX_SAFE_INTEGER) - (tb ?? Number.MAX_SAFE_INTEGER);
    }
    if (kind === 'number') {
      const na = Number(cleanSortText(a).replace(',', '.'));
      const nb = Number(cleanSortText(b).replace(',', '.'));
      if (Number.isFinite(na) || Number.isFinite(nb)) return (Number.isFinite(na) ? na : Number.MAX_SAFE_INTEGER) - (Number.isFinite(nb) ? nb : Number.MAX_SAFE_INTEGER);
    }
    if (kind === 'status') {
      const sa = SORT_STATUS_ORDER[cleanSortText(a).toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
      const sb = SORT_STATUS_ORDER[cleanSortText(b).toUpperCase()] ?? Number.MAX_SAFE_INTEGER;
      if (sa !== sb) return sa - sb;
    }
    return FR_SORT_COLLATOR.compare(cleanSortText(a), cleanSortText(b));
  }

  function sortRows(rows, sort, columns) {
    const source = Array.isArray(rows) ? rows : [];
    const key = sort && sort.key;
    const dir = sort && sort.dir;
    const column = key && (columns || []).find((item) => item && item.key === key);
    if (!column || !dir) return source.slice();
    const factor = dir === 'desc' ? -1 : 1;
    return source
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const av = typeof column.value === 'function' ? column.value(a.row) : a.row[column.key];
        const bv = typeof column.value === 'function' ? column.value(b.row) : b.row[column.key];
        const cmp = compareSortValues(av, bv, column.type);
        if (cmp) return cmp * factor;
        for (const tie of column.tieBreakers || []) {
          const tav = typeof tie.value === 'function' ? tie.value(a.row) : a.row[tie.key];
          const tbv = typeof tie.value === 'function' ? tie.value(b.row) : b.row[tie.key];
          const tcmp = compareSortValues(tav, tbv, tie.type || 'text');
          if (tcmp) return tcmp * factor;
        }
        return a.index - b.index;
      })
      .map((item) => item.row);
  }

  function nextSort(current, key, defaultDir) {
    const cur = current || {};
    const initial = defaultDir || 'asc';
    if (cur.key !== key) return { key, dir: initial };
    return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' };
  }

  function sortHeaderState(sort, key) {
    const active = sort && sort.key === key && sort.dir;
    return {
      active: Boolean(active),
      className: active ? (sort.dir === 'desc' ? 'is-desc' : 'is-asc') : '',
      ariaSort: active ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none',
      indicator: active ? (sort.dir === 'desc' ? '▼' : '▲') : ''
    };
  }

  function isQualificationEvenement(row) {
    const origine = String((row && (row.origine || row.origine_code)) || '').toUpperCase();
    const mode = String((row && (row.mode_suivi || row.modeSuivi)) || '').toUpperCase();
    if (origine === 'LEGACY_AGGREGATED' || mode === 'LEGACY') return false;
    const libelle = String((row && (row.libelle || row.title)) || '');
    const ext = String((row && (row.identifiant_externe || row.identifiantExterne)) || '');
    if (/^TEST[\s—-]/i.test(libelle.trim())) return true;
    if (/TEST IMPORT SCOPE/i.test(libelle)) return true;
    if (/TEST SCOPE/i.test(libelle)) return true;
    if (/^TEST-/i.test(ext.trim())) return true;
    return false;
  }

  function isTestPersonnelNip(nip) {
    return /^(99\d{3}|TSTR2)/i.test(String(nip || '').trim());
  }

  function shouldRenderPermutations(domaineCode, dataset) {
    if (dataset && dataset.emptyReason === 'HORS_DAP') return false;
    const domaine = String(domaineCode || '').toUpperCase();
    if (domaine && domaine !== 'DAP') return false;
    return true;
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

  function importPreviewFilterCount(id, { standard, all, groups, excluded } = {}) {
    const lines = all || [];
    const previewGroups = groups || [];
    const excludedMap = excluded || {};
    const excludedLine = (line) => Boolean(excludedMap[line.ligneNo]);
    const excludedGroup = (item) => (item.sourceLineNos || []).length && (item.sourceLineNos || []).every((n) => excludedMap[n]);
    if (standard) {
      if (id === 'TOUS') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'REVIEW_REQUIRED' || g.statut === 'CONFLIT' || String(g.statut).indexOf('ERREUR') === 0 || (g.avertissements || []).length)).length;
      if (id === 'A_CREER') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'NEW_EVENT' || g.statut === 'GROUPED')).length;
      if (id === 'DEJA') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'EXACT_MATCH' || g.statut === 'PROBABLE_MATCH')).length;
      if (id === 'GROUPED') return previewGroups.filter((g) => !excludedGroup(g) && g.statut === 'GROUPED').length;
      if (id === 'ERREURS') return lines.filter((l) => !excludedLine(l) && (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')).length;
      if (id === 'ARBITRER') return previewGroups.filter((g) => !excludedGroup(g) && (g.statut === 'REVIEW_REQUIRED' || g.statut === 'A_ARBITRER')).length;
      if (id === 'EXCLUS') return Object.keys(excludedMap).filter((k) => excludedMap[k]).length;
      return 0;
    }
    if (id === 'TOUS') return lines.filter((l) => !excludedLine(l)).length;
    if (id === 'A_CREER') return lines.filter((l) => !excludedLine(l) && (l.statut === 'A_CREER' || l.statut === 'VALIDE' || l.statut === 'NEW_EVENT')).length;
    if (id === 'DEJA') return lines.filter((l) => !excludedLine(l) && ['DEJA_PRESENT', 'DEJA_IMPORTE', 'EXACT_MATCH', 'PROBABLE_MATCH'].includes(l.statut)).length;
    if (id === 'GROUPED') return lines.filter((l) => !excludedLine(l) && Boolean(l.groupKey)).length;
    if (id === 'ERREURS') return lines.filter((l) => !excludedLine(l) && (String(l.statut).indexOf('ERREUR') === 0 || l.statut === 'CONFLIT')).length;
    if (id === 'ARBITRER') return lines.filter((l) => !excludedLine(l) && (l.statut === 'A_ARBITRER' || l.statut === 'REVIEW_REQUIRED')).length;
    if (id === 'EXCLUS') return Object.keys(excludedMap).filter((k) => excludedMap[k]).length;
    if (id === 'NOMINATIF') return lines.filter((l) => !excludedLine(l) && (l.modePropose === 'NOMINATIF' || l.typePropose === 'NOMINATIF')).length;
    if (id === 'QUANTITATIF') return lines.filter((l) => !excludedLine(l) && (l.modePropose === 'QUANTITATIF' || l.typePropose === 'QUANTITATIF')).length;
    return 0;
  }

  function buildImportPreviewFilters(options) {
    const standard = Boolean(options && options.standard);
    const defs = standard ? [
      ['TOUS', 'Points à traiter'], ['A_CREER', 'À créer'], ['DEJA', 'Déjà présents'], ['GROUPED', 'Regroupés'],
      ['ERREURS', 'Erreurs'], ['ARBITRER', 'À contrôler'], ['EXCLUS', 'Exclus']
    ] : [
      ['TOUS', 'Tout'], ['A_CREER', 'À créer'], ['DEJA', 'Déjà présents'], ['GROUPED', 'Regroupés'],
      ['ERREURS', 'Erreurs'], ['ARBITRER', 'À arbitrer'], ['EXCLUS', 'Exclus'],
      ['NOMINATIF', 'Nominatif'], ['QUANTITATIF', 'Quantitatif']
    ];
    return defs
      .map(([id, label]) => ({ id, label, count: importPreviewFilterCount(id, options || {}) }))
      .filter((item) => item.count > 0);
  }

  function defaultImportPreviewFilter(filters) {
    const order = ['TOUS', 'A_CREER', 'DEJA', 'GROUPED'];
    return (order.map((id) => (filters || []).find((f) => f.id === id)).find(Boolean) || (filters || [])[0] || { id: 'TOUS' }).id;
  }

  return {
    MOTIFS,
    MOTIFS_DISPENSE,
    motifsForRow,
    motifsDispenseForRow,
    isDispenseMotif,
    motifsForRow,
    STATUT_LABELS,
    ROLE_LABELS,
    ENCADREMENT_ROLE_ORDER,
    ROLES_ENCADREMENT,
    getEncadrementContribution,
    domaineAffiche,
    niveauAffiche,
    statutLabel,
    formatPrSessionList,
    formatFormateurPrTooltip,
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
    participationStatutLabel,
    parseHash,
    principalCta,
    modeSuiviOf,
    modeLabel,
    volumesEquality,
    liveCounters,
    countsInSaisieTaux,
    participationStatusesForDomaine,
    preserveParticipationRole,
    statusLockedForRole,
    applyParticipationStatus,
    applyExcuseMotif,
    applyDispenseMotif,
    buildPresenceSavePayload,
    excuseBreakdown,
    clotureDisabled,
    needsConfirmAllPresent,
    applyAllPresent,
    applyAllPresentFiltered,
    hasIncompleteExcuse,
    hasIncompleteDispense,
    sessionLocked,
    isOpenSaisieRow,
    closureBlockers,
    resetSaisie,
    needsConfirmReset,
    saisieAttendusFromFiche,
    personnelMutationError,
    friendlyError,
    ciblesLabel,
    displayTauxForList,
    legacyTauxFromRow,
    emptyMessage,
    loadingMessage,
    errorMessage,
    listViewState,
    SORT_STATUS_ORDER,
    cleanSortText,
    parseSortDate,
    parseSortTime,
    compareSortValues,
    sortRows,
    nextSort,
    sortHeaderState,
    isQualificationEvenement,
    isTestPersonnelNip,
    shouldRenderPermutations,
    resolveClientMode,
    importPreviewFilterCount,
    buildImportPreviewFilters,
    defaultImportPreviewFilter,
    oktaLoginHref
  };
});
