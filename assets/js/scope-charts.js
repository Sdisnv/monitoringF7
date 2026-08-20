/* SCOPE-GRAPH-1 — rendu SVG des datasets serveur. Aucun calcul de taux. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ScopeCharts = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const TOKENS = Object.freeze({
    primary: '#171C8F',
    secondary: '#DE000A',
    neutral: '#54585A',
    warning: '#FFA300'
  });

  const TOKEN_BY_KEY = Object.freeze({
    officiel: 'primary',
    present: 'primary',
    prive: 'primary',
    excuse: 'warning',
    objectif: 'warning',
    permutation: 'warning',
    professionnel: 'warning',
    nonExcuse: 'secondary',
    sante: 'secondary',
    legacy: 'neutral',
    dispense: 'neutral',
    armee: 'neutral',
    nonPrecise: 'neutral'
  });

  const HIDDEN_REASONS = Object.freeze([
    'HORS_DAP',
    'CONTEXTE_SDIS',
    'CONTEXTE_CIBLE',
    'CONTEXTE_DRILL'
  ]);

  const EMPTY_COPY = Object.freeze({
    AUCUNE_SERIE_OFFICIELLE: 'Aucune série officielle sur cette période.',
    UNIQUEMENT_LEGACY: 'Aucun taux officiel. Les points historiques LEGACY restent visibles, hors KPI.',
    NON_EVALUABLE: 'Non évaluable — aucun taux officiel pour ce périmètre.',
    AUCUNE_COMPOSITION: 'Aucune composition officielle à afficher.',
    AUCUN_MOTIF: 'Aucun motif d’excuse sur cette période.',
    AUCUNE_PERMUTATION: 'Aucune permutation sur cette période.',
    AUCUNE_DONNEE: 'Aucune donnée officielle à représenter.',
    PERIODE_NON_HOMOGENE: 'Plusieurs objectifs s’appliquent : aucune ligne unique n’est tracée.'
  });

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function colorOf(token) {
    const key = TOKEN_BY_KEY[token] || token;
    return TOKENS[key] || TOKENS.primary;
  }

  function formatPct(value) {
    if (value == null || !Number.isFinite(Number(value))) return 'Non évaluable';
    const n = Number(value);
    const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${text.replace('.', ',')} %`;
  }

  function formatGap(gap) {
    if (gap == null || !Number.isFinite(Number(gap))) return '';
    const n = Number(gap);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1).replace('.', ',')} pts`;
  }

  function formatVolume(point) {
    if (!point) return '';
    if (point.denominator) return `${point.numerator ?? 0} / ${point.denominator}`;
    if (point.value != null && point.percentage == null) return String(point.value);
    return point.eventCount ? `${point.eventCount} év.` : '';
  }

  function emptyState(reason) {
    const text = EMPTY_COPY[reason] || EMPTY_COPY.AUCUNE_DONNEE;
    return `<p class="scope-empty scope-chart-empty">${escapeHtml(text)}</p>`;
  }

  function legendHtml(items) {
    return `<p class="scope-chart-legend">${(items || []).map((item) => {
      const cls = item.className || item.token || 'off';
      return `<span><i class="${escapeHtml(cls)}"></i>${escapeHtml(item.label)}</span>`;
    }).join('')}</p>`;
  }

  function hatchDefs() {
    return `<defs>
      <pattern id="scope-hatch-dispense" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="${TOKENS.neutral}"/>
        <path d="M0 6 L6 0" stroke="#fff" stroke-width="1.4"/>
      </pattern>
    </defs>`;
  }

  function uniqueObjectiveThreshold(points) {
    const valued = (points || []).filter((p) => p && p.value != null);
    if (!valued.length) return null;
    const thresholds = valued.map((p) => p.thresholdPct);
    if (thresholds.some((t) => t == null || t === '')) return null;
    const unique = [...new Set(thresholds.map(Number))];
    return unique.length === 1 && Number.isFinite(unique[0]) ? unique[0] : null;
  }

  function renderLineChart(dataset, size) {
    const width = (size && size.width) || 640;
    const height = (size && size.height) || 128;
    const pad = { l: 36, r: 12, t: 10, b: 22 };
    const series = (dataset && dataset.series) || [];
    const official = ((series.find((s) => s.id === 'officiel') || {}).points || [])
      .filter((p) => p && p.label);
    const legacy = ((series.find((s) => s.id === 'legacy') || {}).points || [])
      .filter((p) => p && p.value != null);
    if (!official.length && !legacy.length) return emptyState(dataset && dataset.emptyReason);
    const months = [...new Set([
      ...official.map((p) => p.label),
      ...legacy.map((p) => p.label)
    ])].sort();
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const xOf = (month) => {
      if (months.length === 1) return pad.l + innerW / 2;
      return pad.l + (months.indexOf(month) / (months.length - 1)) * innerW;
    };
    const yOf = (pct) => pad.t + innerH * (1 - (Number(pct) / 100));
    const officialPts = official.filter((p) => p.value != null);
    const polyline = officialPts.map((p) => `${xOf(p.label).toFixed(1)},${yOf(p.value).toFixed(1)}`);
    const threshold = uniqueObjectiveThreshold(official);
    let objectiveMark = '';
    if (threshold != null) {
      const y = yOf(threshold);
      objectiveMark = `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="${TOKENS.warning}" stroke-dasharray="5 4" stroke-width="2" />`;
    }
    const ticks = [0, 50, 100].map((v) => {
      const y = yOf(v);
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y}" y2="${y}" stroke="#e3e7ec"/><text x="4" y="${y + 4}" font-size="11" fill="#6b7785">${v}</text>`;
    }).join('');
    const monthLabels = months.map((m) => `<text x="${xOf(m)}" y="${height - 4}" font-size="11" text-anchor="middle" fill="#6b7785">${escapeHtml(String(m).slice(5))}</text>`).join('');
    const officialMark = polyline.length > 1
      ? `<polyline fill="none" stroke="${TOKENS.primary}" stroke-width="2.4" points="${polyline.join(' ')}" />`
      : (polyline.length === 1
        ? `<circle cx="${polyline[0].split(',')[0]}" cy="${polyline[0].split(',')[1]}" r="4" fill="${TOKENS.primary}" />`
        : '');
    const officialDots = officialPts.map((p) => {
      const title = `${p.label} · ${formatPct(p.value)}${p.numerator != null ? ` · ${p.numerator}/${p.denominator}` : ''}`;
      return `<circle cx="${xOf(p.label)}" cy="${yOf(p.value)}" r="3" fill="${TOKENS.primary}"><title>${escapeHtml(title)}</title></circle>`;
    }).join('');
    const legacyDots = legacy.map((p) => {
      const title = `LEGACY ${p.id || p.label} · ${formatPct(p.value)} · hors KPI officiel`;
      return `<circle cx="${xOf(p.label)}" cy="${yOf(p.value)}" r="3.5" fill="${TOKENS.neutral}"><title>${escapeHtml(title)}</title></circle>`;
    }).join('');
    return `<svg class="scope-chart scope-chart-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml((dataset && dataset.question) || 'Évolution du taux')}">
      ${ticks}
      ${objectiveMark}
      ${officialMark}
      ${officialDots}
      ${legacyDots}
      ${monthLabels}
    </svg>`;
  }

  function renderBarChart(dataset, size) {
    const points = ((dataset && dataset.series && dataset.series[0]) || {}).points || [];
    if (!points.length) return emptyState(dataset && dataset.emptyReason);
    const width = (size && size.width) || 640;
    const rowH = 44;
    const pad = { l: 132, r: 118, t: 8, b: 8 };
    const height = pad.t + pad.b + points.length * rowH;
    const innerW = width - pad.l - pad.r;
    const rows = points.map((p, i) => {
      const y = pad.t + i * rowH;
      const evaluable = p.value != null && Number.isFinite(Number(p.value));
      const barW = evaluable ? Math.max(2, (Number(p.value) / 100) * innerW) : 0;
      const obj = p.objective && p.objective.thresholdPct != null ? Number(p.objective.thresholdPct) : null;
      const objX = obj != null ? pad.l + (obj / 100) * innerW : null;
      const href = p.href ? ` href="${escapeHtml(p.href)}"` : '';
      const tag = p.href ? 'a' : 'g';
      const valueText = evaluable ? formatPct(p.value) : 'Non évaluable';
      const gap = formatGap(p.gapPct);
      const vol = formatVolume(p);
      const title = `${p.label} · ${valueText}${vol ? ` · ${vol}` : ''}${obj != null ? ` · objectif ${obj} %` : ''}${gap ? ` · ${gap}` : ''}`;
      return `<${tag}${href} class="scope-chart-hit">
        <title>${escapeHtml(title)}</title>
        <text x="8" y="${y + 28}" font-size="13" fill="#1f2730">${escapeHtml(p.label)}</text>
        <rect x="${pad.l}" y="${y + 12}" width="${innerW}" height="20" fill="#f3f5f8" rx="2"/>
        ${evaluable ? `<rect x="${pad.l}" y="${y + 12}" width="${barW.toFixed(1)}" height="20" fill="${TOKENS.primary}" rx="2"/>` : ''}
        ${objX != null ? `<line x1="${objX}" x2="${objX}" y1="${y + 8}" y2="${y + 36}" stroke="${TOKENS.warning}" stroke-dasharray="3 3" stroke-width="2"/>` : ''}
        <text x="${width - 8}" y="${y + 22}" font-size="12" text-anchor="end" fill="#1f2730">${escapeHtml(valueText)}</text>
        <text x="${width - 8}" y="${y + 36}" font-size="10" text-anchor="end" fill="#6b7785">${escapeHtml([vol, gap].filter(Boolean).join(' · '))}</text>
      </${tag}>`;
    }).join('');
    return `<svg class="scope-chart scope-chart-bar" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml((dataset && dataset.question) || 'Comparaison')}">
      ${rows}
    </svg>`;
  }

  function renderStackedBar(dataset, size) {
    const points = ((dataset && dataset.series && dataset.series[0]) || {}).points || [];
    const usable = points.filter((p) => Number(p.value || 0) >= 0);
    if (!usable.length || !usable.some((p) => Number(p.value || 0) > 0)) {
      return emptyState(dataset && dataset.emptyReason);
    }
    const width = (size && size.width) || 640;
    const height = (size && size.height) || 88;
    const pad = { l: 8, r: 8, t: 16, b: 28 };
    const innerW = width - pad.l - pad.r;
    const total = usable.reduce((sum, p) => sum + Number(p.value || 0), 0) || 1;
    let x = pad.l;
    const segs = usable.map((p) => {
      const w = (Number(p.value || 0) / total) * innerW;
      const fill = p.token === 'dispense' ? 'url(#scope-hatch-dispense)' : colorOf(p.token);
      const title = `${p.label} : ${p.value}${p.inDenominator === false ? ' · hors dénominateur' : ''}${p.subsetOf ? ` · inclus dans ${p.subsetOf}` : ''}`;
      const body = `<rect x="${x.toFixed(1)}" y="${pad.t}" width="${Math.max(0, w).toFixed(1)}" height="28" fill="${fill}"><title>${escapeHtml(title)}</title></rect>`;
      x += w;
      return body;
    }).join('');
    const labels = usable.map((p) => {
      const extra = p.inDenominator === false ? ' hors dén.' : (p.subsetOf ? ' ⊂ présents' : '');
      return `<span><i class="${escapeHtml(p.token || 'off')}"></i>${escapeHtml(p.label)} ${escapeHtml(String(p.value))}${escapeHtml(extra)}</span>`;
    }).join('');
    return `<svg class="scope-chart scope-chart-stacked" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml((dataset && dataset.question) || 'Composition')}">
      ${hatchDefs()}
      ${segs}
    </svg>
    <p class="scope-chart-legend">${labels}</p>`;
  }

  function renderPlot(dataset, size) {
    if (!dataset) return emptyState('AUCUNE_DONNEE');
    if (dataset.type === 'line') return renderLineChart(dataset, size);
    if (dataset.type === 'stacked') return renderStackedBar(dataset, size);
    return renderBarChart(dataset, size);
  }

  function renderChartCard(dataset, options) {
    const opts = options || {};
    if (!dataset) return '';
    if (HIDDEN_REASONS.includes(dataset.emptyReason)) return '';
    const wide = opts.wide || dataset.type === 'bar' || dataset.id === 'evolution';
    const mode = dataset.emptyReason === 'AUCUNE_SERIE_OFFICIELLE' ? 'empty'
      : (dataset.emptyReason === 'UNIQUEMENT_LEGACY' ? 'legacy' : 'full');
    const plot = renderPlot(dataset, opts.size);
    const legend = dataset.type === 'line'
      ? legendHtml([
          { className: 'off', label: 'Taux officiel (mensuel, somme / somme)' },
          { className: 'obj', label: 'Objectif lorsqu’il est unique' },
          { className: 'legacy', label: 'LEGACY historique, hors KPI' }
        ])
      : (dataset.type === 'bar' ? legendHtml([
          { className: 'off', label: 'Taux officiel' },
          { className: 'obj', label: 'Objectif résolu, si unique' }
        ]) : '');
    const explainBtn = `<button type="button" class="linkish scope-graph-explain-btn" data-graph-explain="${escapeHtml(dataset.id)}">Comprendre ce graphique</button>`;
    return `<div class="scope-card scope-chart-card scope-graph-card is-${escapeHtml(mode)}${wide ? ' is-wide' : ''}" data-graph="${escapeHtml(dataset.id)}">
      <div class="scope-graph-head">
        <h2>${escapeHtml(dataset.question)}</h2>
        ${explainBtn}
      </div>
      <div class="scope-chart-frame is-${escapeHtml(dataset.type)}">${plot}</div>
      ${dataset.type === 'stacked' ? '' : legend}
    </div>`;
  }

  function renderGraphExplain(dataset, dashExplain) {
    if (!dataset) return '';
    const meta = dataset.explain || {};
    const period = meta.period || (dashExplain && dashExplain.period) || {};
    const perimeter = meta.perimeter || (dashExplain && dashExplain.perimeter) || {};
    const exclusions = meta.exclusions || (dashExplain && dashExplain.exclusions) || {};
    const included = meta.includedEventCount != null
      ? meta.includedEventCount
      : (dashExplain && dashExplain.includedEvents ? dashExplain.includedEvents.length : 0);
    return `<div class="scope-card scope-explain" data-graph-explain-panel="${escapeHtml(dataset.id)}">
      <h2>Comprendre ce graphique</h2>
      <dl>
        <dt>Question</dt><dd>${escapeHtml(dataset.question || '')}</dd>
        <dt>Période</dt><dd>${escapeHtml(period.from || '—')} → ${escapeHtml(period.to || '—')}</dd>
        <dt>Périmètre</dt><dd>${escapeHtml([perimeter.domaine || 'SDIS', perimeter.cible].filter(Boolean).join(' / '))}</dd>
        <dt>Source</dt><dd>${escapeHtml(dataset.kind || 'OFFICIEL')}</dd>
        <dt>Événements inclus</dt><dd>${escapeHtml(String(included))}</dd>
        <dt>Objectif</dt><dd>${meta.objective && meta.objective.thresholdPct != null ? `${escapeHtml(String(meta.objective.thresholdPct))} %` : 'Aucun ou non homogène'}</dd>
        <dt>Legacy</dt><dd>${escapeHtml(String(exclusions.legacy || 0))} agrégat(s) historique(s), hors KPI officiel</dd>
        <dt>Note</dt><dd>${escapeHtml(meta.note || '')}</dd>
      </dl>
    </div>`;
  }

  return {
    TOKENS,
    TOKEN_BY_KEY,
    HIDDEN_REASONS,
    escapeHtml,
    colorOf,
    formatPct,
    formatGap,
    emptyState,
    legendHtml,
    renderLineChart,
    renderBarChart,
    renderStackedBar,
    renderChartCard,
    renderGraphExplain
  };
});
