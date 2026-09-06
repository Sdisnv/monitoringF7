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
  const MOTIFS_JSP = [
    { value: 'PRIVE', label: 'Privé' },
    { value: 'ACTIVITE_SCOLAIRE', label: 'Activité scolaire' },
    { value: 'ACTIVITE_EXTRA_SCOLAIRE', label: 'Activité extra-scolaire' },
    { value: 'NON_JUSTIFIE', label: 'Non justifié' }
  ];
  const MOTIFS_DISPENSE = [
    { value: 'FORMATEUR_PR', label: 'Formateur PR', group: 'operationnel' },
    { value: 'FORMATION_HORS_SDIS', label: 'Formation hors SDIS', group: 'operationnel' },
    { value: 'JOKER', label: 'Joker', group: 'operationnel' },
    { value: 'AUTO_RETRAIT', label: 'Auto-retrait', group: 'administratif' },
    { value: 'DEMISSION_EN_COURS', label: 'Démission en cours', group: 'administratif' },
    { value: 'NON_CONCERNE', label: 'Non concerné', group: 'administratif' }
  ];
  const MOTIFS_DISPENSE_HISTORIQUES = [
    { value: 'PAS_CONCERNE', label: 'Non concerné', group: 'administratif', legacy: true }
  ];
  const MOTIFS_HISTORIQUES = [
    { value: 'MALADIE', label: 'Maladie (historique)' },
    { value: 'ACCIDENT', label: 'Accident (historique)' },
    { value: 'AUTRE', label: 'Autre (historique)' },
    { value: 'NON_PRECISE', label: 'Non précisé (historique)' }
  ];

  function isJspDomaine(code) {
    return String(code || '').toUpperCase() === 'JSP';
  }

  function motifsSaisieForDomaine(domaineCode) {
    return isJspDomaine(domaineCode) ? MOTIFS_JSP.slice() : MOTIFS.slice();
  }

  function motifCatalogue() {
    return MOTIFS.concat(MOTIFS_JSP, MOTIFS_DISPENSE, MOTIFS_DISPENSE_HISTORIQUES, MOTIFS_HISTORIQUES);
  }

  function motifsForRow(row, domaineCode) {
    const domaine = domaineCode || row && (row.domaineCode || row.domaine_code);
    const base = motifsSaisieForDomaine(domaine);
    const extra = MOTIFS.concat(MOTIFS_JSP, MOTIFS_HISTORIQUES).filter((m) => {
      if (!row || row.motifAbsence !== m.value) return false;
      return !base.some((item) => item.value === m.value);
    });
    return base.concat(extra);
  }

  function motifsDispenseForRow(row) {
    const motifs = MOTIFS_DISPENSE.slice();
    if (row && row.motifAbsence === 'PAS_CONCERNE') motifs.push(MOTIFS_DISPENSE_HISTORIQUES[0]);
    return motifs;
  }

  function isDispenseMotif(value) {
    return MOTIFS_DISPENSE.concat(MOTIFS_DISPENSE_HISTORIQUES).some((m) => m.value === String(value || ''));
  }

  function motifShortLabel(code) {
    const value = String(code || '');
    if (!value) return '';
    const hit = motifCatalogue().find((m) => m.value === value);
    if (!hit) return value;
    return String(hit.label || '').replace(/\s*\(historique\)\s*$/i, '');
  }

  function informationMotifLabel(row) {
    const statut = String((row && (row.statut || row.statutParticipation)) || '').toUpperCase();
    if (statut !== 'ABSENT_EXCUSE' && statut !== 'EXCUSE' && statut !== 'DISPENSE') return '';
    return motifShortLabel(row && (row.motifAbsence || row.motif_absence || row.sessionMotif || row.motif));
  }

  function sessionExplainTooltip(row) {
    if (!row) return '';
    if (row.sessionMessage) return String(row.sessionMessage);
    if (coveredInGlobalBilan(row)) {
      const reference = String(row.sessionReferenceEventLabel || row.session_reference_event_label || row.referenceEventLabel || row.sessionReferenceLabel || row.session_reference_label || '').trim();
      const date = String(row.sessionReferenceEventDate || row.session_reference_event_date || row.referenceEventDate || '').trim();
      if (reference) return `Déjà comptabilisé lors de ${reference}${date ? ` — ${formatDate(date)}` : ''}.`;
    }
    const name = [row.prenom, row.nomFamille || row.nom].filter(Boolean).join(' ') || 'Cette personne';
    const motif = informationMotifLabel(row);
    const exercise = String(row.sessionExerciseLabel || '').trim();
    const statut = String(row.statut || '').toUpperCase();
    if (statut === 'ABSENT_EXCUSE' || statut === 'EXCUSE' || row.sessionExcuse) {
      const motifBit = motif ? ` pour motif ${motif}` : '';
      const sessionBit = exercise ? ` lors de la session d’exercice ${exercise}` : '';
      return `${name} a été excusé${motifBit}${sessionBit}.`;
    }
    if (statut === 'DISPENSE' || row.sessionDispense) {
      return `${name} est dispensé de cet exercice pour la raison suivante : ${motif || '—'}.`;
    }
    return '';
  }

  function placeSessionTooltip(anchor, tooltip, viewport) {
    const vp = viewport || { width: (typeof window !== 'undefined' && window.innerWidth) || 1024, height: (typeof window !== 'undefined' && window.innerHeight) || 768 };
    const row = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : (anchor || { left: 0, right: 240, top: 0, bottom: 44 });
    const tw = Math.min(360, Math.max(160, vp.width - 16));
    const th = (tooltip && tooltip.offsetHeight) || 72;
    let left = Number(row.right || 0) + 8;
    if (left + tw > vp.width - 8) left = Number(row.left || 0) - tw - 8;
    if (left < 8) left = 8;
    let top = Number(row.top || 0);
    if (top + th > vp.height - 8) top = Math.max(8, Number(row.top || 0) - th - 8);
    if (tooltip && tooltip.style) {
      tooltip.style.position = 'fixed';
      tooltip.style.left = `${Math.round(left)}px`;
      tooltip.style.top = `${Math.round(top)}px`;
      tooltip.style.width = `${Math.round(tw)}px`;
      tooltip.style.visibility = 'visible';
      tooltip.style.opacity = '1';
    }
    return { left, top, width: tw };
  }

  const STATUT_LABELS = {
    PLANIFIE: 'Planifié',
    SAISIE_EN_COURS: 'Saisie en cours',
    A_TRAITER: 'À traiter',
    TRAITE: 'Traité',
    REALISE: 'Réalisé',
    EN_COURS: 'En cours',
    TERMINE: 'Terminé',
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
    const value = String(code || '').toUpperCase();
    if (value === 'PAPR' || value === 'PR') return 'PR';
    if (value === 'GEN') return 'Général';
    return String(code || '');
  }

  function isPrDomaine(code) {
    const value = String(code || '').toUpperCase();
    return value === 'PR' || value === 'PAPR';
  }

  function niveauAffiche(domaineCode, niveauCode) {
    const domaine = String(domaineCode || '');
    const niveau = String(niveauCode || '');
    const compactNiveau = niveau.toUpperCase().replace(/[\s/_-]+/g, '');
    if (isPrDomaine(domaine) && (niveau === 'GEN' || compactNiveau === 'GEN')) return 'Général / PAPR';
    if (isPrDomaine(domaine) && (compactNiveau === 'ABC' || compactNiveau === 'PRABC')) return 'PR-ABC';
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
        libelleAffiche: (code === 'PR' || code === 'PAPR' || String(d.libelleAffiche || d.libelle_affiche || '').toUpperCase() === 'PAPR') ? 'PR' : (d.libelleAffiche || d.libelle_affiche || code),
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

  const EVENT_DOMAIN_GROUPS = Object.freeze([
    ['AUTO', 'PR'],
    ['DPS', 'DAP', 'JSP'],
    ['FOBA', 'FOCA', 'FOSPEC']
  ]);

  const OBJECTIF_PORTEE_LABELS = Object.freeze({
    GLOBAL: 'Général',
    DOMAINE: 'Domaine',
    CIBLE: 'Cible'
  });

  const OBJECTIF_UX_DOMAINES = Object.freeze(['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC']);
  const OBJECTIF_UX_CIBLES = Object.freeze({
    DPS: ['G1', 'C1', 'B1', 'B2'],
    DAP: ['Y1', 'Y2', 'Y3', 'Y4'],
    JSP: ['G1', 'C1', 'B1'],
    FOBA: ['1', '2', '3'],
    FOCA: [],
    FOSPEC: ['AUTO', 'PR']
  });
  // Niveau UX futur (hors lot) : Domaine → Cible → PÉRIMÈTRE. Non implémenté.
  const OBJECTIF_FUTURE_LEVEL = 'PERIMETRE';

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function isValidYmd(year, month, day) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isInteger(y) || y < 1000 || y > 9999) return false;
    if (!Number.isInteger(m) || m < 1 || m > 12) return false;
    if (!Number.isInteger(d) || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function toIsoDate(value) {
    const text = String(value || '').trim();
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso && isValidYmd(iso[1], iso[2], iso[3])) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const eu = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (eu && isValidYmd(eu[3], pad2(eu[2]), pad2(eu[1]))) {
      return `${eu[3]}-${pad2(eu[2])}-${pad2(eu[1])}`;
    }
    return '';
  }

  function formatUiDate(value) {
    const iso = toIsoDate(value);
    if (!iso) return '';
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  }

  function extractCalendarYear(value) {
    const s = String(value || '').trim();
    if (/^\d{4}$/.test(s)) return s;
    const iso = s.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (iso) return iso[1];
    const eu = s.match(/^\d{1,2}[./]\d{1,2}[./](\d{4})$/);
    if (eu) return eu[1];
    return '';
  }

  function yearToObjectifPeriod(year) {
    const y = extractCalendarYear(year);
    if (!y) return { dateDebut: '', dateFin: '' };
    return { dateDebut: `${y}-01-01`, dateFin: `${y}-12-31` };
  }

  function periodFromStart(start) {
    const iso = toIsoDate(start);
    const y = extractCalendarYear(iso || start);
    if (!iso || !y) return { dateDebut: iso || '', dateFin: '' };
    return { dateDebut: iso, dateFin: `${y}-12-31` };
  }

  function nextObjectifPeriod(row) {
    const end = toIsoDate(row && (row.dateFin || row.date_fin)) || toIsoDate(row && (row.dateDebut || row.date_debut));
    const y = Number(extractCalendarYear(end) || '2026') + 1;
    return yearToObjectifPeriod(String(y));
  }

  function objectifOverlapsYear(row, year) {
    const y = extractCalendarYear(year);
    if (!y) return true;
    const start = `${y}-01-01`;
    const end = `${y}-12-31`;
    const aStart = String((row && (row.dateDebut || row.date_debut)) || '').slice(0, 10);
    const aEnd = String((row && (row.dateFin || row.date_fin)) || '9999-12-31').slice(0, 10);
    if (!aStart) return false;
    return aStart <= end && start <= aEnd;
  }

  function objectifLifecycleStatus(row, todayIso) {
    if (!row || row.actif === false) return 'TERMINE';
    const today = String(todayIso || '').slice(0, 10);
    const debut = String(row.dateDebut || row.date_debut || '').slice(0, 10);
    const fin = String(row.dateFin || row.date_fin || '').slice(0, 10);
    if (debut && today && debut > today) return 'FUTUR';
    if (fin && today && fin < today) return 'TERMINE';
    return 'ACTIF';
  }

  function objectifIsFuture(row, todayIso) {
    return objectifLifecycleStatus(row, todayIso) === 'FUTUR';
  }

  function objectifHistoryProtected(row, todayIso) {
    const life = objectifLifecycleStatus(row, todayIso);
    return life === 'ACTIF' || life === 'TERMINE';
  }

  function historiqueProtegeMessage() {
    return 'Cet objectif est déjà utilisé pour une période active ou passée. Pour préserver l’historique, créez une nouvelle période.';
  }

  function objectifLifecycleLabel(status) {
    if (status === 'ACTIF') return 'Actif';
    if (status === 'FUTUR') return 'Futur';
    return 'Terminé';
  }

  function objectifPeriodLabel(row) {
    const debut = String((row && row.dateDebut) || '').slice(0, 10);
    const fin = String((row && row.dateFin) || '').slice(0, 10);
    if (/^\d{4}-01-01$/.test(debut) && /^\d{4}-12-31$/.test(fin) && debut.slice(0, 4) === fin.slice(0, 4)) {
      return debut.slice(0, 4);
    }
    if (/^\d{4}-01-01$/.test(debut) && !fin) return `${debut.slice(0, 4)} (ouverte)`;
    return [debut, fin].filter(Boolean).join(' → ') || '—';
  }

  function objectifUxFromRow(row, cibles) {
    const scope = String((row && (row.scope || row.portee)) || '').toUpperCase();
    const domaine = String((row && (row.domaineCode || row.domaine_code)) || '').toUpperCase();
    const cibleId = (row && (row.cibleId || row.cible_id)) || '';
    if (scope === 'GLOBAL' || (!scope && !domaine)) {
      return { portee: 'GLOBAL', porteeLabel: 'Général', domaineUx: '', cibleUx: '', cibleLabel: '—' };
    }
    if (domaine === 'PR' || domaine === 'AUTO') {
      return { portee: 'CIBLE', porteeLabel: 'Cible', domaineUx: 'FOSPEC', cibleUx: domaine, cibleLabel: domaine };
    }
    if (scope === 'CIBLE') {
      const cible = (cibles || []).find((c) => c.cibleId === cibleId || c.cible_id === cibleId);
      const niveau = cible ? String(cible.niveauCode || cible.niveau_code || '') : '';
      const label = cible ? (niveauAffiche(cible.domaineCode || cible.domaine_code, niveau) || niveau) : '—';
      const domaineUx = String((cible && (cible.domaineCode || cible.domaine_code)) || domaine).toUpperCase();
      return { portee: 'CIBLE', porteeLabel: 'Cible', domaineUx, cibleUx: niveau, cibleLabel: label };
    }
    return { portee: 'DOMAINE', porteeLabel: 'Domaine', domaineUx: domaine, cibleUx: '', cibleLabel: '—' };
  }

  function objectifFormToEngine(form, cibles) {
    const portee = String((form && form.portee) || 'GLOBAL').toUpperCase();
    const domaine = String((form && form.domaineCode) || '').toUpperCase();
    const cibleCode = String((form && (form.cibleCode || form.cibleId)) || '').toUpperCase();
    if (portee === 'GLOBAL') return { portee: 'GLOBAL', domaineCode: null, cibleId: null };
    if (portee === 'DOMAINE') return { portee: 'DOMAINE', domaineCode: domaine || null, cibleId: null };
    if (domaine === 'FOSPEC' && (cibleCode === 'PR' || cibleCode === 'AUTO')) {
      return { portee: 'DOMAINE', domaineCode: cibleCode, cibleId: null };
    }
    const row = (cibles || []).find((c) => String(c.domaineCode).toUpperCase() === domaine && String(c.niveauCode).toUpperCase() === cibleCode);
    return { portee: 'CIBLE', domaineCode: domaine || null, cibleId: (row && row.cibleId) || null };
  }

  function objectifPreviewQuery(preview) {
    const domaine = String((preview && preview.domaine) || '').toUpperCase();
    const cibleCode = String((preview && preview.cibleCode) || '').toUpperCase();
    if (!domaine) return { analysisGrain: 'GLOBAL' };
    if (domaine === 'FOSPEC' && (cibleCode === 'PR' || cibleCode === 'AUTO')) {
      return { domaine: cibleCode, analysisGrain: 'DOMAINE' };
    }
    if (cibleCode) return { domaine, cible: cibleCode, analysisGrain: 'CIBLE' };
    return { domaine, analysisGrain: 'DOMAINE' };
  }

  function objectifCibleOptions(domaine, cibles) {
    const code = String(domaine || '').toUpperCase();
    const allowed = OBJECTIF_UX_CIBLES[code] || [];
    return allowed.map((niveau) => {
      if (code === 'FOSPEC') return { code: niveau, label: niveau, cibleId: '' };
      const row = (cibles || []).find((c) => String(c.domaineCode).toUpperCase() === code && String(c.niveauCode) === niveau);
      return {
        code: niveau,
        label: code === 'FOBA' ? `FOBA ${niveau}` : niveau,
        cibleId: row ? row.cibleId : ''
      };
    });
  }

  function objectifHint(form) {
    const portee = String((form && form.portee) || '').toUpperCase();
    const domaine = String((form && form.domaineCode) || '').toUpperCase();
    const cible = String((form && form.cibleCode) || '').toUpperCase();
    if (portee === 'GLOBAL') return 'Cet objectif sera utilisé lorsqu’aucun objectif de domaine ou de cible plus précis n’existe.';
    if (portee === 'DOMAINE' && domaine) {
      return `Cet objectif s’appliquera à l’ensemble du domaine ${domaine} sauf lorsqu’un objectif plus précis existe pour une cible ${domaine}.`;
    }
    if (portee === 'CIBLE' && domaine === 'FOSPEC' && cible) {
      return `Cet objectif s’appliquera uniquement au sous-domaine ${cible} de FOSPEC.`;
    }
    if (portee === 'CIBLE' && domaine && cible) {
      const label = domaine === 'FOBA' ? `FOBA ${cible}` : `${domaine} ${cible}`;
      return `Cet objectif s’appliquera uniquement à ${label}.`;
    }
    return '';
  }

  function filterObjectifs(rows, filters, todayIso, cibles) {
    const f = filters || {};
    return (rows || []).filter((row) => {
      if (String(row.domaineCode || '').toUpperCase() === 'PAPR') return false;
      const ux = objectifUxFromRow(row, cibles);
      if (f.portee && ux.portee !== String(f.portee).toUpperCase()) return false;
      if (f.domaine && ux.domaineUx !== String(f.domaine).toUpperCase()) return false;
      if (f.statut && objectifLifecycleStatus(row, todayIso) !== f.statut) return false;
      if (f.annee && !objectifOverlapsYear(row, f.annee)) return false;
      return true;
    });
  }

  function sortObjectifsDefault(rows, todayIso) {
    const rank = { ACTIF: 0, FUTUR: 1, TERMINE: 2 };
    return (rows || []).slice().sort((a, b) => {
      const ra = rank[objectifLifecycleStatus(a, todayIso)] ?? 9;
      const rb = rank[objectifLifecycleStatus(b, todayIso)] ?? 9;
      if (ra !== rb) return ra - rb;
      return String(b.dateDebut || '').localeCompare(String(a.dateDebut || ''));
    });
  }

  function sortObjectifs(rows, sort, todayIso) {
    const source = (rows || []).slice();
    if (!sort || !sort.key) return sortObjectifsDefault(source, todayIso);
    return sortRows(source, sort, [
      { key: 'periode', type: 'text', value: (r) => objectifPeriodLabel(r) },
      { key: 'portee', type: 'text', value: (r) => objectifUxFromRow(r).porteeLabel },
      { key: 'domaine', type: 'text', value: (r) => objectifUxFromRow(r).domaineUx || '' },
      { key: 'cible', type: 'text', value: (r) => objectifUxFromRow(r).cibleLabel || '' },
      { key: 'objectif', type: 'number', value: (r) => Number(r.thresholdPct) },
      { key: 'debut', type: 'date', value: (r) => r.dateDebut },
      { key: 'fin', type: 'date', value: (r) => r.dateFin || '' },
      { key: 'statut', type: 'text', value: (r) => objectifLifecycleStatus(r, todayIso) }
    ]);
  }

  function objectifDomainOptions() {
    return OBJECTIF_UX_DOMAINES.map((code) => ({ type: 'domain', code, label: code }));
  }

  function eventDomainFilterItems(domaines) {
    const list = (domaines || []).filter((d) => {
      const code = String((d && d.code) || '').toUpperCase();
      return code && code !== 'PAPR';
    });
    const byCode = new Map(list.map((d) => [String(d.code).toUpperCase(), d]));
    const used = new Set();
    const items = [];
    const labelOf = (d, code) => {
      if (code === 'PR' || String((d && (d.libelleAffiche || d.libelle_affiche)) || '').toUpperCase() === 'PAPR') return 'PR';
      return (d && (d.libelleAffiche || d.libelle_affiche || d.libelle)) || code;
    };
    EVENT_DOMAIN_GROUPS.forEach((group, gi) => {
      if (gi > 0) items.push({ type: 'separator', id: `sep-${gi}` });
      group.forEach((code) => {
        const d = byCode.get(code);
        items.push({ type: 'domain', code, label: labelOf(d, code) });
        used.add(code);
      });
    });
    const rest = list.filter((d) => !used.has(String(d.code).toUpperCase()));
    if (rest.length) {
      items.push({ type: 'separator', id: 'sep-rest' });
      rest.forEach((d) => {
        const code = String(d.code).toUpperCase();
        items.push({ type: 'domain', code, label: labelOf(d, code) });
      });
    }
    return items;
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
    if (preset === 'SEMESTER') params.semester = String((state && state.semester) || '1');
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

  const PRESENCE_SAVE_FAILED_CLOSE_MESSAGE = 'La saisie n’a pas pu être enregistrée. L’événement n’a pas été clôturé.';

  function hasUnsavedPresenceChanges(stateLike) {
    return Boolean(stateLike && (stateLike.hasUnsavedChanges || stateLike.saisieDirty));
  }

  function canStartPresenceSave(stateLike) {
    return !Boolean(stateLike && (stateLike.saveInFlight || stateLike.presenceSaveBusy));
  }

  function nextEventVersionAfterSave(saveResult, previousVersion) {
    if (saveResult && saveResult.version != null) return saveResult.version;
    if (saveResult && saveResult.evenement && saveResult.evenement.version != null) return saveResult.evenement.version;
    return previousVersion;
  }

  function isLeavingSaisieRoute(current, next) {
    if (!current || current.screen !== 'saisie') return false;
    if (!next) return true;
    if (next.screen === 'saisie' && String(next.id) === String(current.id)) return false;
    return true;
  }

  function shouldWarnBeforeUnload(stateLike, routeLike) {
    return hasUnsavedPresenceChanges(stateLike) && Boolean(routeLike && routeLike.screen === 'saisie');
  }

  function planSaisieLeave(stateLike) {
    if (!hasUnsavedPresenceChanges(stateLike)) {
      return { action: 'LEAVE', title: '', message: '' };
    }
    return {
      action: 'PROMPT',
      title: 'MODIFICATIONS NON ENREGISTRÉES',
      message: 'Des modifications n’ont pas encore été enregistrées.'
    };
  }

  async function orchestrateClosePresence(ctx) {
    const context = ctx || {};
    const order = [];
    if (context.saveInFlight || context.presenceSaveBusy) {
      return { ok: false, reason: 'in_flight', closed: false, order };
    }
    let version = context.version;
    if (hasUnsavedPresenceChanges(context) || context.dirty) {
      order.push('save');
      if (typeof context.save !== 'function') {
        return { ok: false, reason: 'save_failed', closed: false, order, message: PRESENCE_SAVE_FAILED_CLOSE_MESSAGE, dirty: true };
      }
      const saved = await context.save();
      if (!saved || saved.ok === false) {
        const conflict = Boolean(saved && (saved.conflict || saved.status === 409 || (saved.error && saved.error.status === 409)));
        return {
          ok: false,
          reason: conflict ? 'conflict' : 'save_failed',
          closed: false,
          order,
          dirty: true,
          conflict,
          message: conflict
            ? (saved.message || 'Cette séance a été modifiée ailleurs. Rechargez les données avant de poursuivre.')
            : PRESENCE_SAVE_FAILED_CLOSE_MESSAGE
        };
      }
      version = nextEventVersionAfterSave(saved, version);
    }
    if (context.isLastSession && typeof context.unfilledAfterSave === 'function') {
      order.push('unfilled');
      const missing = await context.unfilledAfterSave(version) || [];
      if (missing.length) {
        return { ok: false, reason: 'unfilled', closed: false, order, version, unfilled: missing, dirty: false };
      }
    }
    order.push('close');
    if (typeof context.close === 'function') await context.close(version);
    return { ok: true, closed: true, order, version, dirty: false };
  }

  async function orchestrateLeaveSaisie(ctx) {
    const context = ctx || {};
    if (!hasUnsavedPresenceChanges(context) && !context.dirty) {
      return { ok: true, navigated: true, saved: false, discarded: false };
    }
    const choice = String(context.choice || 'save');
    if (choice === 'stay') return { ok: true, navigated: false, saved: false };
    if (choice === 'discard') return { ok: true, navigated: true, discarded: true, dirty: false };
    if (context.saveInFlight || context.presenceSaveBusy) {
      return { ok: false, reason: 'in_flight', navigated: false };
    }
    const saved = typeof context.save === 'function' ? await context.save() : { ok: false };
    if (!saved || saved.ok === false) {
      return {
        ok: false,
        reason: 'save_failed',
        navigated: false,
        dirty: true,
        message: 'La saisie n’a pas pu être enregistrée.'
      };
    }
    return { ok: true, navigated: true, saved: true, dirty: false, version: nextEventVersionAfterSave(saved, context.version) };
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
    if (parts[0] === 'rapports' && parts[1] === 'formation') return { screen: 'rapport-formation', nav: 'rapports' };
    if (parts[0] === 'rapports' && parts[1] === 'participation') return { screen: 'rapport-participation', nav: 'rapports' };
    if (parts[0] === 'rapports' && parts[1] === 'jsp') return { screen: 'rapport-jsp', nav: 'rapports' };
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
      else if (s === 'ABSENT_EXCUSE') {
        if (isIncompleteClosureRow(row)) open += 1;
        else excuse += 1;
      }
      else if (s === 'ABSENT_NON_EXCUSE') absent += 1;
      else if (s === 'DISPENSE') {
        if (isIncompleteClosureRow(row)) open += 1;
        else dispense += 1;
      }
      else if (isIncompleteClosureRow(row)) open += 1;
    }
    return { present, formateur, excuse, absent, dispense, open };
  }

  function countsInSaisieTaux(row) {
    if (!row || row.inclus === false) return false;
    const jsp = String(row.jspRole || row.jsp_role || '').toUpperCase();
    if (jsp === 'MONITEUR') return false;
    const role = String(row.role || '').toUpperCase();
    if (role === 'AUXILIAIRE' || role === 'MONITEUR') return false;
    if (ROLES_ENCADREMENT.has(role) && row.inclus !== true) return false;
    return true;
  }

  function sessionPresenceKpis(rows) {
    const counters = liveCounters(rows);
    let attendus = 0;
    for (const row of rows || []) {
      if (countsInSaisieTaux(row)) attendus += 1;
    }
    return Object.assign({ attendus }, counters);
  }

  function coveredInGlobalBilan(row) {
    return Boolean(row && (
      row.coveredInGlobalBilan
      || row.alreadyCountedInSession
      || row.already_counted_in_session
    ));
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
    if (sessionLocked(next)) return row;
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
    if (sessionLocked(row)) return row;
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
    if (sessionLocked(row)) return row;
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
        if (r.inclus === false) return false;
        if (coveredInGlobalBilan(r)) return false;
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

  function excuseBreakdown(rows, domaineCode) {
    const motifs = motifsSaisieForDomaine(domaineCode);
    const counts = Object.fromEntries(motifs.map((m) => [m.value, 0]));
    for (const row of rows || []) {
      if (!row || row.inclus === false || row.statut !== 'ABSENT_EXCUSE') continue;
      const key = String(row.motifAbsence || row.motif_absence || '');
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
    }
    return motifs.map((m) => ({ value: m.value, label: m.label, count: counts[m.value] || 0 }));
  }

  function clotureDisabled(counters) {
    return false;
  }

  function sessionLocked(row) {
    return coveredInGlobalBilan(row);
  }

  function isValidSessionStatut(statut) {
    const value = String(statut || '').toUpperCase();
    return value === 'PRESENT' || value === 'PERMUTATION' || value === 'ABSENT_EXCUSE' || value === 'ABSENT_NON_EXCUSE' || value === 'DISPENSE';
  }

  function isIncompleteClosureRow(row) {
    if (!row || row.inclus === false) return false;
    if (!countsInSaisieTaux(row)) return false;
    if (coveredInGlobalBilan(row)) return false;
    if (statusLockedForRole(row.role)) return false;
    if (!row.statut || row.statut === 'NON_RENSEIGNE' || row.statut === 'NON_CONCERNE') return true;
    if (row.statut === 'ABSENT_EXCUSE' && !row.motifAbsence) return true;
    if (row.statut === 'DISPENSE' && !isDispenseMotif(row.motifAbsence)) return true;
    return false;
  }

  function isOpenSaisieRow(row) {
    return isIncompleteClosureRow(row);
  }

  function listIncompleteClosureRows(rows) {
    return (rows || []).filter((row) => isIncompleteClosureRow(row));
  }

  function formatIncompletePersonLabel(row) {
    const grade = String((row && row.grade) || '').trim();
    const prenom = String((row && row.prenom) || '').trim();
    const nom = String((row && (row.nomFamille || row.nom)) || '').trim();
    const nip = String((row && row.nip) || '').trim();
    const identity = [prenom, nom].filter(Boolean).join(' ') || 'Personne';
    return [grade, identity, nip ? `NIP ${nip}` : ''].filter(Boolean).join(' — ');
  }

  function hasIncompleteDispense(rows) {
    return (rows || []).some((row) =>
      row
      && row.inclus !== false
      && !coveredInGlobalBilan(row)
      && !statusLockedForRole(row.role)
      && row.statut === 'DISPENSE'
      && !isDispenseMotif(row.motifAbsence)
    );
  }
  function hasIncompleteExcuse(rows) {
    return (rows || []).some((row) =>
      row
      && row.inclus !== false
      && !coveredInGlobalBilan(row)
      && !statusLockedForRole(row.role)
      && row.statut === 'ABSENT_EXCUSE'
      && !row.motifAbsence
    );
  }

  function closureBlockers(rows) {
    const out = { open: 0, incompleteExcuses: 0, incompleteDispenses: 0, message: '' };
    (rows || []).forEach((row) => {
      if (!row || row.inclus === false || coveredInGlobalBilan(row) || statusLockedForRole(row.role) || !countsInSaisieTaux(row)) return;
      if (isIncompleteClosureRow(row) && (!row.statut || row.statut === 'NON_RENSEIGNE' || row.statut === 'NON_CONCERNE')) out.open += 1;
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
      if (coveredInGlobalBilan(row)) return false;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return false;
      return row.statut && row.statut !== 'NON_RENSEIGNE' && row.statut !== 'PRESENT';
    });
  }

  function applyAllPresent(rows) {
    return (rows || []).map((row) => {
      if (row.inclus === false) return row;
      if (coveredInGlobalBilan(row)) return row;
      if (row.role && ROLES_ENCADREMENT.has(row.role)) return row;
      return Object.assign({}, row, { statut: 'PRESENT', motifAbsence: null, commentaire: '', role: 'PARTICIPANT' });
    });
  }

  function applyAllPresentFiltered(rows, cibleCode) {
    return (rows || []).map((row) => {
      if (cibleCode && row.cible !== cibleCode && !(row.cibles || []).includes(cibleCode)) return row;
      if (row.inclus === false) return row;
      if (coveredInGlobalBilan(row)) return row;
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
    if (code === 'personnel_stale') {
      return {
        tone: 'warning',
        title: 'Import du personnel',
        message: payloadMessage || message || 'Les données du personnel ont été modifiées depuis l’analyse. Rechargez et analysez à nouveau le fichier avant de poursuivre.',
        conflict: true
      };
    }
    if (code === 'scope_personnel_import_commit_failed') {
      return {
        tone: 'error',
        title: 'Import du personnel',
        message: payloadMessage || message || 'L’import du personnel n’a pas pu être validé.'
      };
    }
    if (code === 'rapport_session_incomplete') {
      return {
        tone: 'error',
        title: 'Rapport détaillé indisponible',
        message: payloadMessage || message || 'Le rapport détaillé sera disponible lorsque toutes les séances seront clôturées.'
      };
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
    if (/column .+ of relation|relation .+ does not exist|duplicate key value|violates .+ constraint|syntax error at or near|postgres|pg_/i.test(raw)) {
      return {
        tone: 'error',
        title: 'Action impossible',
        message: 'Le service SCOPE n’a pas pu terminer cette action. Réessayez. Si le problème continue, contactez l’administrateur.'
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

  function sortCiblesForEventForm(cibles) {
    const rank = (niveau) => {
      const code = String(niveau || '').toUpperCase();
      if (code === 'GEN') return 0;
      if (code === 'ABC') return 1;
      return 10;
    };
    return (cibles || []).slice().sort((a, b) => {
      const da = String(a.domaineCode || a.domaine_code || '');
      const db = String(b.domaineCode || b.domaine_code || '');
      if (da !== db) return da.localeCompare(db, 'fr');
      const na = String(a.niveauCode || a.niveau_code || '');
      const nb = String(b.niveauCode || b.niveau_code || '');
      const diff = rank(na) - rank(nb);
      if (diff) return diff;
      return na.localeCompare(nb, 'fr');
    });
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

  function resolveClientMode() {
    return 'live';
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
    MOTIFS_JSP,
    MOTIFS_DISPENSE,
    motifsForRow,
    motifsDispenseForRow,
    isDispenseMotif,
    motifShortLabel,
    informationMotifLabel,
    sessionExplainTooltip,
    placeSessionTooltip,
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
    EVENT_DOMAIN_GROUPS,
    eventDomainFilterItems,
    OBJECTIF_PORTEE_LABELS,
    OBJECTIF_UX_DOMAINES,
    OBJECTIF_UX_CIBLES,
    OBJECTIF_FUTURE_LEVEL,
    toIsoDate,
    formatUiDate,
    extractCalendarYear,
    yearToObjectifPeriod,
    periodFromStart,
    nextObjectifPeriod,
    objectifOverlapsYear,
    objectifLifecycleStatus,
    objectifLifecycleLabel,
    objectifIsFuture,
    objectifHistoryProtected,
    historiqueProtegeMessage,
    objectifPeriodLabel,
    objectifUxFromRow,
    objectifFormToEngine,
    objectifPreviewQuery,
    objectifCibleOptions,
    objectifHint,
    filterObjectifs,
    sortObjectifsDefault,
    sortObjectifs,
    objectifDomainOptions,
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
    sessionPresenceKpis,
    coveredInGlobalBilan,
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
    isValidSessionStatut,
    sessionLocked,
    isOpenSaisieRow,
    isIncompleteClosureRow,
    listIncompleteClosureRows,
    formatIncompletePersonLabel,
    motifsSaisieForDomaine,
    closureBlockers,
    resetSaisie,
    needsConfirmReset,
    saisieAttendusFromFiche,
    personnelMutationError,
    friendlyError,
    ciblesLabel,
    sortCiblesForEventForm,
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
    oktaLoginHref,
    hasUnsavedPresenceChanges,
    canStartPresenceSave,
    nextEventVersionAfterSave,
    isLeavingSaisieRoute,
    shouldWarnBeforeUnload,
    planSaisieLeave,
    orchestrateClosePresence,
    orchestrateLeaveSaisie,
    PRESENCE_SAVE_FAILED_CLOSE_MESSAGE
  };
});
