'use strict';
/** SCOPE-REPORT-1 — graphiques PDF à partir des datasets GRAPH-1. Aucun calcul de taux. */

const { CHART_TOKENS, INSTITUTION, hexToRgb, colorOf } = require('./_scope-chart-tokens');

function rgb(hex){
  return hexToRgb(hex);
}

function uniqueThreshold(points){
  const valued = (points || []).filter((p) => p && p.value != null);
  if(!valued.length) return null;
  const thresholds = valued.map((p) => p.thresholdPct);
  if(thresholds.some((t) => t == null || t === '')) return null;
  const unique = [...new Set(thresholds.map(Number))];
  return unique.length === 1 && Number.isFinite(unique[0]) ? unique[0] : null;
}

function drawLineChart(doc, dataset, box){
  const x = box.x;
  const y = box.y;
  const w = box.w;
  const h = box.h;
  const pad = { l: 28, r: 8, t: 8, b: 18 };
  const series = (dataset && dataset.series) || [];
  const official = ((series.find((s) => s.id === 'officiel') || {}).points || []).filter((p) => p && p.label);
  const legacy = ((series.find((s) => s.id === 'legacy') || {}).points || []).filter((p) => p && p.value != null);
  doc.save();
  doc.rect(x, y, w, h).strokeColor(rgb(INSTITUTION.line)).lineWidth(0.6).stroke();
  if(!official.some((p) => p.value != null) && !legacy.length){
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(9).font('Helvetica')
      .text(dataset.emptyReason === 'UNIQUEMENT_LEGACY'
        ? 'Aucun taux officiel. LEGACY visible hors KPI.'
        : 'Aucune série officielle sur cette période.', x + 10, y + h / 2 - 6, { width: w - 20, align: 'center' });
    doc.restore();
    return;
  }
  const months = [...new Set([...official.map((p) => p.label), ...legacy.map((p) => p.label)])].sort();
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const xOf = (month) => {
    if(months.length === 1) return x + pad.l + innerW / 2;
    return x + pad.l + (months.indexOf(month) / (months.length - 1)) * innerW;
  };
  const yOf = (pct) => y + pad.t + innerH * (1 - Number(pct) / 100);
  doc.strokeColor(rgb(INSTITUTION.line)).lineWidth(0.4);
  [0, 50, 100].forEach((v) => {
    const yy = yOf(v);
    doc.moveTo(x + pad.l, yy).lineTo(x + w - pad.r, yy).stroke();
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(7).text(String(v), x + 2, yy - 4, { width: 24 });
  });
  const threshold = uniqueThreshold(official);
  if(threshold != null){
    const yy = yOf(threshold);
    doc.strokeColor(rgb(CHART_TOKENS.warning)).lineWidth(1).dash(4, { space: 3 })
      .moveTo(x + pad.l, yy).lineTo(x + w - pad.r, yy).stroke().undash();
  }
  const pts = official.filter((p) => p.value != null);
  if(pts.length){
    doc.strokeColor(rgb(CHART_TOKENS.primary)).lineWidth(1.4).undash();
    pts.forEach((p, i) => {
      const xx = xOf(p.label);
      const yy = yOf(p.value);
      if(i === 0) doc.moveTo(xx, yy);
      else doc.lineTo(xx, yy);
    });
    if(pts.length > 1) doc.stroke();
    pts.forEach((p) => {
      doc.circle(xOf(p.label), yOf(p.value), 2.2).fill(rgb(CHART_TOKENS.primary));
    });
  }
  legacy.forEach((p) => {
    doc.circle(xOf(p.label), yOf(p.value), 2.4).fill(rgb(CHART_TOKENS.neutral));
  });
  months.forEach((m) => {
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(7)
      .text(String(m).slice(5), xOf(m) - 10, y + h - 12, { width: 20, align: 'center' });
  });
  doc.restore();
}

function drawBarChart(doc, dataset, box){
  const points = ((dataset && dataset.series && dataset.series[0]) || {}).points || [];
  const x = box.x;
  let y = box.y;
  const w = box.w;
  if(!points.length){
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(9)
      .text('Non évaluable — aucune barre officielle.', x, y);
    return y + 16;
  }
  const rowH = 16;
  const labelW = 88;
  const valueW = 70;
  const barW = w - labelW - valueW - 8;
  points.forEach((p) => {
    const evaluable = p.value != null && Number.isFinite(Number(p.value));
    doc.fillColor(rgb(INSTITUTION.ink)).fontSize(8).font('Helvetica')
      .text(String(p.label || ''), x, y + 3, { width: labelW - 4 });
    doc.rect(x + labelW, y + 3, barW, 10).fill(rgb('#f3f5f8'));
    if(evaluable){
      const bw = Math.max(1, (Number(p.value) / 100) * barW);
      doc.rect(x + labelW, y + 3, bw, 10).fill(rgb(CHART_TOKENS.primary));
      const obj = p.objective && p.objective.thresholdPct != null ? Number(p.objective.thresholdPct) : null;
      if(obj != null){
        const ox = x + labelW + (obj / 100) * barW;
        doc.strokeColor(rgb(CHART_TOKENS.warning)).lineWidth(1).dash(2, { space: 2 })
          .moveTo(ox, y + 1).lineTo(ox, y + 15).stroke().undash();
      }
    }
    const valueText = evaluable ? `${String(p.value).replace('.', ',')} %` : 'Non évaluable';
    const vol = p.denominator ? `${p.numerator}/${p.denominator}` : '';
    doc.fillColor(rgb(INSTITUTION.ink)).fontSize(7)
      .text([valueText, vol].filter(Boolean).join(' · '), x + labelW + barW + 4, y + 4, { width: valueW });
    y += rowH;
  });
  return y;
}

function drawStackedBar(doc, dataset, box){
  const points = ((dataset && dataset.series && dataset.series[0]) || {}).points || [];
  const usable = points.filter((p) => Number(p.value || 0) >= 0);
  const x = box.x;
  const y = box.y;
  const w = box.w;
  if(!usable.some((p) => Number(p.value || 0) > 0)){
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(9).text('Aucune composition officielle.', x, y);
    return y + 16;
  }
  const total = usable.reduce((sum, p) => sum + Number(p.value || 0), 0) || 1;
  let cx = x;
  usable.forEach((p) => {
    const bw = (Number(p.value || 0) / total) * w;
    const fill = p.token === 'dispense' ? CHART_TOKENS.neutral : colorOf(p.token);
    if(bw > 0){
      doc.rect(cx, y, bw, 14).fill(rgb(fill));
      if(p.token === 'dispense'){
        doc.save();
        doc.strokeColor(rgb('#ffffff')).lineWidth(0.6);
        for(let s = cx; s < cx + bw; s += 4){
          doc.moveTo(s, y + 14).lineTo(s + 4, y).stroke();
        }
        doc.restore();
      }
    }
    cx += bw;
  });
  let ly = y + 20;
  usable.forEach((p) => {
    const extra = p.inDenominator === false ? ' hors dén.' : (p.subsetOf ? ' ⊂ présents' : '');
    doc.rect(x, ly + 1, 8, 8).fill(rgb(p.token === 'dispense' ? CHART_TOKENS.neutral : colorOf(p.token)));
    doc.fillColor(rgb(INSTITUTION.ink)).fontSize(8)
      .text(`${p.label} ${p.value}${extra}`, x + 12, ly, { width: w - 12 });
    ly += 12;
  });
  return ly;
}

function groupedPalette(index){
  const keys = ['primary', 'secondary', 'warning', 'neutral'];
  return CHART_TOKENS[keys[index % keys.length]];
}

function drawGroupedChart(doc, dataset, box){
  const series = (dataset && dataset.series) || [];
  const categories = (dataset.categories && dataset.categories.length)
    ? dataset.categories.slice()
    : [...new Set(series.flatMap((s) => (s.points || []).map((p) => p.label)))];
  const x = box.x;
  const y = box.y;
  const w = box.w;
  const h = box.h;
  if(!series.length || !categories.length){
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(9)
      .text('Non évaluable — aucune série officielle.', x, y + h / 2 - 6, { width: w, align: 'center' });
    return y + h;
  }
  const pad = { l: 22, r: 6, t: 6, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const useLines = categories.length > 6;
  doc.save();
  doc.rect(x, y, w, h).strokeColor(rgb(INSTITUTION.line)).lineWidth(0.6).stroke();
  [0, 50, 100].forEach((v) => {
    const yy = y + pad.t + innerH * (1 - v / 100);
    doc.strokeColor(rgb(INSTITUTION.line)).lineWidth(0.4).moveTo(x + pad.l, yy).lineTo(x + w - pad.r, yy).stroke();
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(6).text(String(v), x + 2, yy - 4, { width: 18 });
  });
  if(useLines){
    const xOf = (i) => categories.length === 1
      ? x + pad.l + innerW / 2
      : x + pad.l + (i / (categories.length - 1)) * innerW;
    const yOf = (pct) => y + pad.t + innerH * (1 - Number(pct) / 100);
    series.forEach((s, si) => {
      const pts = categories.map((cat, i) => {
        const point = (s.points || []).find((p) => String(p.label) === String(cat));
        if(!point || point.value == null || !Number.isFinite(Number(point.value))) return null;
        return { x: xOf(i), y: yOf(point.value) };
      }).filter(Boolean);
      if(!pts.length) return;
      doc.strokeColor(rgb(groupedPalette(si))).lineWidth(1.4);
      pts.forEach((pt, i) => {
        if(i === 0) doc.moveTo(pt.x, pt.y);
        else doc.lineTo(pt.x, pt.y);
      });
      if(pts.length > 1) doc.stroke();
      pts.forEach((pt) => {
        doc.circle(pt.x, pt.y, 2).fill(rgb(groupedPalette(si)));
      });
    });
  } else {
    const groupW = innerW / categories.length;
    const barW = Math.min(12, Math.max(4, (groupW * 0.72) / series.length));
    categories.forEach((cat, ci) => {
      const gx = x + pad.l + groupW * ci + (groupW - barW * series.length) / 2;
      series.forEach((s, si) => {
        const point = (s.points || []).find((p) => String(p.label) === String(cat));
        if(!point || point.value == null || !Number.isFinite(Number(point.value))) return;
        const bh = Math.max(2, (Number(point.value) / 100) * innerH);
        const bx = gx + si * barW;
        const by = y + pad.t + innerH - bh;
        doc.rect(bx, by, barW - 1, bh).fill(rgb(groupedPalette(si)));
      });
    });
  }
  const step = categories.length > 8 ? Math.ceil(categories.length / 6) : 1;
  categories.forEach((cat, ci) => {
    if(ci % step !== 0 && ci !== categories.length - 1) return;
    const gx = useLines
      ? (categories.length === 1 ? x + pad.l + innerW / 2 : x + pad.l + (ci / (categories.length - 1)) * innerW)
      : x + pad.l + (innerW / categories.length) * ci + (innerW / categories.length) / 2;
    doc.fillColor(rgb(INSTITUTION.ink)).fontSize(6).font('Helvetica')
      .text(String(cat), gx - 16, y + h - 14, { width: 32, align: 'center' });
  });
  let lx = x + pad.l;
  const ly = y + h + 2;
  series.forEach((s, i) => {
    doc.rect(lx, ly, 6, 6).fill(rgb(groupedPalette(i)));
    doc.fillColor(rgb(INSTITUTION.ink)).fontSize(6).font('Helvetica').text(s.label, lx + 8, ly, { width: 64 });
    lx += 72;
  });
  doc.restore();
  return ly + 10;
}

function drawDonutChart(doc, dataset, box){
  const allPoints = ((((dataset && dataset.series) || [])[0] || {}).points || []);
  const points = allPoints.filter((p) => Number(p.value || 0) > 0);
  const x = box.x;
  const y = box.y;
  const w = box.w;
  const h = box.h;
  if(!points.length){
    doc.fillColor(rgb(INSTITUTION.muted)).fontSize(9)
      .text('Non évaluable — données insuffisantes.', x, y + h / 2 - 6, { width: w, align: 'center' });
    return y + 28;
  }
  const cx = x + Math.min(w * 0.32, 110);
  const cy = y + h / 2;
  const r = Math.min(h / 2 - 6, 48);
  const rInner = r * 0.62;
  const total = points.reduce((sum, p) => sum + Number(p.value || 0), 0) || 1;
  if(points.length === 1){
    const fill = rgb(points[0].token === 'dispense' ? CHART_TOKENS.neutral : colorOf(points[0].token));
    doc.circle(cx, cy, r).fill(fill);
    doc.circle(cx, cy, rInner).fill('#ffffff');
    doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(11)
      .text('100 %', cx - 22, cy - 10, { width: 44, align: 'center' });
    doc.font('Helvetica').fontSize(7)
      .text(points[0].label, cx - 28, cy + 4, { width: 56, align: 'center' });
  } else {
    let angle = -Math.PI / 2;
    points.forEach((p) => {
      const sweep = (Number(p.value || 0) / total) * Math.PI * 2;
      const start = angle;
      const end = angle + sweep;
      const fill = rgb(p.token === 'dispense' ? CHART_TOKENS.neutral : colorOf(p.token));
      doc.save();
      doc.moveTo(cx, cy);
      doc.path(`M ${cx} ${cy} L ${cx + r * Math.cos(start)} ${cy + r * Math.sin(start)} A ${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)} Z`)
        .fill(fill);
      doc.restore();
      angle = end;
    });
    doc.circle(cx, cy, rInner).fill('#ffffff');
  }
  let ly = y + 8;
  const lx = cx + r + 20;
  const legend = allPoints.length ? allPoints : points;
  legend.forEach((p) => {
    const share = `${Math.round(100 * Number(p.value || 0) / total)} %`;
    doc.rect(lx, ly, 7, 7).fill(rgb(p.token === 'dispense' ? CHART_TOKENS.neutral : colorOf(p.token)));
    doc.fillColor(rgb(INSTITUTION.ink)).fontSize(7)
      .text(`${p.label} ${p.value || 0} — ${share}`, lx + 11, ly, { width: w - (lx - x) - 12 });
    ly += 12;
  });
  return Math.max(y + h, ly);
}

function chartHeight(dataset){
  if(!dataset) return 0;
  if(dataset.type === 'grouped' || dataset.type === 'year-series') return 138;
  if(dataset.type === 'donut') return 120;
  if(dataset.type === 'line') return 92;
  if(dataset.type === 'stacked') return 64;
  const n = (((dataset.series && dataset.series[0]) || {}).points || []).length;
  return Math.max(24, n * 16 + 8);
}

module.exports = { drawLineChart, drawBarChart, drawStackedBar, drawGroupedChart, drawDonutChart, chartHeight };
