'use strict';
/** SCOPE-REPORT-1 — rendu PDFKit. Affiche les chiffres serveur, ne les calcule pas. */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { INSTITUTION, CHART_TOKENS, hexToRgb, colorOf } = require('./_scope-chart-tokens');
const { drawLineChart, drawBarChart, drawStackedBar, drawGroupedChart, drawDonutChart, chartHeight } = require('./_scope-pdf-charts');
const { domaineLabel } = require('./_scope-report-data');

const LOGO_SCOPE = path.join(__dirname, '../../assets/img/logo-scope-blanc.png');
const LOGO_SDIS = path.join(__dirname, '../../assets/img/LogoSDISblanc.png');
const SIGNATURE_CANDIDATES = [
  path.join(__dirname, '../../assets/img/MCE_Signature.png'),
  path.join(process.cwd(), 'assets/img/MCE_Signature.png')
];
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const HEADER_H = 58;
const FOOTER_H = 36;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 6;

const TYPE = Object.freeze({
  section: 16,
  sectionGap: 14,
  notesGap: 18,
  body: 11,
  conclusion: 14,
  conclusionGap: 14,
  legend: 8,
  blockShift: 28,
  ink: 'anthracite'
});
const SIGNATURE_FIT = Object.freeze([336, 96]);

function resolveSignaturePrPath(options){
  const required = !options || options.required !== false;
  for(const candidate of SIGNATURE_CANDIDATES){
    try {
      if(fs.existsSync(candidate)) return candidate;
    } catch (_err) { /* continue */ }
  }
  if(required){
    throw new Error('Signature PR introuvable: MCE_Signature.png n’est pas résolu pour le rendu PDF.');
  }
  return null;
}

const SIGNATURE_PR = (() => {
  try { return resolveSignaturePrPath({ required: false }); }
  catch (_err) { return SIGNATURE_CANDIDATES[0]; }
})();

function headerLogoLayout(){
  const fitted = (imgW, imgH, fitW, fitH) => {
    const s = Math.min(fitW / imgW, fitH / imgH);
    return { w: imgW * s, h: imgH * s, s };
  };
  const scope = fitted(300, 100, 92, 36);
  const sdis = fitted(715, 431, 120, 42);
  const scopePadL = (16 / 300) * scope.w;
  const sdisPadR = ((715 - 1 - 714) / 715) * sdis.w;
  const scopeX = MARGIN - scopePadL;
  const sdisX = PAGE_W - MARGIN - sdis.w + sdisPadR;
  return {
    inset: MARGIN,
    scopeX,
    sdisX,
    scopeFit: [92, 36],
    sdisFit: [120, 42],
    scopeW: scope.w,
    sdisW: sdis.w,
    scopeH: scope.h,
    sdisH: sdis.h,
    scopeVisualLeft: scopeX + scopePadL,
    sdisVisualRight: sdisX + sdis.w - sdisPadR
  };
}

function rgb(hex){
  return hexToRgb(hex);
}

function formatTaux(value){
  if(value == null || !Number.isFinite(Number(value))) return 'Non évaluable';
  const n = Number(value);
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${text.replace('.', ',')} %`;
}

function formatGap(gap){
  if(gap == null || !Number.isFinite(Number(gap))) return '—';
  const n = Number(gap);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1).replace('.', ',')} pts`;
}

function formatVolume(officiel){
  if(!officiel || !officiel.denominator) return 'Aucun événement officiel réalisé';
  return `${officiel.numerator ?? 0} / ${officiel.denominator}`;
}

function periodLabel(period){
  if(!period) return '—';
  const preset = period.preset || 'CUSTOM';
  return `${period.from} - ${period.to} (${preset})`;
}

function formatDisplayDate(value){
  const text = String(value || '');
  const day = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(day) return `${day[3]}.${day[2]}.${day[1]}`;
  return text || '—';
}

function formatDisplayDateTime(value){
  if(!value) return '';
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return formatDisplayDate(value);
  const parts = new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const pick = (type) => (parts.find((p) => p.type === type) || {}).value || '';
  return `${pick('day')}.${pick('month')}.${pick('year')} à ${pick('hour')}:${pick('minute')}`;
}

function hasLogo(file){
  try { return fs.existsSync(file); } catch { return false; }
}

class ScopePdfRenderer {
  constructor(model, meta){
    this.model = model;
    this.meta = meta || {};
    const generated = new Date((meta && meta.generatedAt) || Date.now());
    this.doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      compress: false,
      bufferPages: true,
      info: {
        Title: model.title,
        Author: 'SCOPE — SDIS régional du Nord vaudois',
        Creator: 'SCOPE-REPORT-1',
        CreationDate: generated,
        ModDate: generated
      }
    });
    this.doc.on('pageAdded', () => this.drawChrome());
    this.drawChrome();
    this.doc.y = HEADER_H + 18;
    const origAddPage = this.doc.addPage.bind(this.doc);
    this.doc.addPage = (opts) => {
      if (this._lockPages && !this._forcePage) return this.doc;
      return origAddPage(opts);
    };
    this._lockPages = true;
    this._forcePage = false;
    this._pageIndex = 1;
  }

  nextPage(){
    this._forcePage = true;
    this.doc.addPage();
    this._forcePage = false;
    this._pageIndex += 1;
    this.doc.y = HEADER_H + 18;
  }

  drawChrome(){
    const doc = this.doc;
    const logos = headerLogoLayout();
    doc.save();
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(rgb(INSTITUTION.red));
    if(hasLogo(LOGO_SCOPE)){
      doc.image(LOGO_SCOPE, logos.scopeX, 11, { fit: logos.scopeFit, valign: 'center' });
    }
    if(hasLogo(LOGO_SDIS)){
      doc.image(LOGO_SDIS, logos.sdisX, 8, { fit: logos.sdisFit, valign: 'center' });
    }
    const titleX = logos.scopeX + logos.scopeW + 10;
    const titleW = Math.max(160, logos.sdisX - titleX - 8);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text('SCOPE — Suivi et analyse de l’activité', titleX, 16, { width: titleW });
    doc.font('Helvetica').fontSize(8)
      .text(this.model.kind === 'SESSION' ? '' : (this.model.subtitle || ''), titleX, 30, { width: titleW });
    doc.restore();
  }

  drawFooters(pageCount){
    const doc = this.doc;
    const generated = this.meta.generatedAt || new Date().toISOString();
    const date = String(generated).slice(0, 16).replace('T', ' ');
    for(let i = 0; i < pageCount; i += 1){
      doc.switchToPage(i);
      doc.save();
      doc.moveTo(MARGIN, PAGE_H - FOOTER_H).lineTo(PAGE_W - MARGIN, PAGE_H - FOOTER_H)
        .strokeColor(rgb(INSTITUTION.red)).lineWidth(1.2).stroke();
      doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(7)
        .text(`Page ${i + 1} / ${pageCount}  ·  Généré le ${formatDisplayDateTime(generated) || date}  ·  SCOPE`, MARGIN, PAGE_H - FOOTER_H + 6, { width: 360 });
      doc.text('Taux officiels : moteur SCOPE. Les données LEGACY, lorsqu’elles sont affichées, restent distinctes du KPI officiel.', MARGIN, PAGE_H - FOOTER_H + 18, { width: PAGE_W - 2 * MARGIN });
      doc.restore();
    }
  }

  ensure(h){
    if(this.doc.y + h > CONTENT_BOTTOM){
      this.nextPage();
    }
  }

  heading(text, size, tone){
    this.ensure(22);
    const color = tone === 'ink' ? INSTITUTION.ink : (tone === 'anthracite' ? INSTITUTION.anthracite : INSTITUTION.redDark);
    this.doc.fillColor(rgb(color)).font('Helvetica-Bold').fontSize(size || 13)
      .text(text, MARGIN, this.doc.y, { width: PAGE_W - 2 * MARGIN });
    this.doc.moveDown(0.35);
  }

  iconHeading(kind, text, size, opts){
    if(opts && opts.spaceBefore) this.doc.y += opts.spaceBefore;
    const fontSize = size || TYPE.section;
    const after = opts && opts.after != null ? opts.after : TYPE.sectionGap;
    const plain = !kind || kind === 'plain' || kind === 'none';
    this.ensure(fontSize + after + 4);
    const startY = this.doc.y;
    this.doc.font('Helvetica-Bold').fontSize(fontSize);
    const lineH = this.doc.currentLineHeight();
    const iconCy = startY + lineH / 2;
    const x = MARGIN;
    if(!plain){
      this.doc.save();
      if(kind === 'identity'){
        this.doc.circle(x + 4.5, iconCy, 4.5).fill(rgb(INSTITUTION.red));
      } else if(kind === 'chart'){
        this.doc.rect(x + 1, iconCy - 4.5, 9, 9).fill(rgb(CHART_TOKENS.primary));
      } else if(kind === 'people'){
        this.doc.circle(x + 4.5, iconCy - 2.2, 3.2).fill(rgb(INSTITUTION.anthracite));
        this.doc.rect(x + 1.5, iconCy + 1.4, 6, 3.2).fill(rgb(INSTITUTION.anthracite));
      } else if(kind === 'kpi'){
        this.doc.rect(x + 1, iconCy - 4.5, 9, 9).fill(rgb(INSTITUTION.red));
      } else {
        this.doc.rect(x + 1, iconCy - 4.5, 9, 9).fill(rgb(INSTITUTION.anthracite));
      }
      this.doc.restore();
    }
    const textX = plain ? x : x + 16;
    this.doc.fillColor(rgb(INSTITUTION.anthracite || INSTITUTION.ink)).font('Helvetica-Bold').fontSize(fontSize)
      .text(text, textX, startY, { width: PAGE_W - textX - MARGIN, lineBreak: false });
    this.doc.y = startY + lineH + after;
  }

  para(text, opts){
    const width = PAGE_W - 2 * MARGIN;
    const size = (opts && opts.size) || 8.5;
    const rest = Object.assign({}, opts || {});
    delete rest.size;
    delete rest.bold;
    this.ensure(size + 6);
    this.doc.fillColor(rgb(INSTITUTION.ink)).font((opts && opts.bold) ? 'Helvetica-Bold' : 'Helvetica').fontSize(size)
      .text(text, MARGIN, this.doc.y, Object.assign({ width }, rest));
  }

  eventStatutLabel(row){
    if(!row) return '';
    if(row.statut === 'ABSENT_NON_EXCUSE' || row.statutLabel === 'Non excusé') return 'Absent';
    return row.statutLabel || '';
  }

  drawDonutLegend(points, x, y, w){
    const size = TYPE.legend;
    const rowH = 12;
    const sw = 8;
    const labelW = 92;
    const volW = 36;
    const pctW = Math.max(36, w - sw - 10 - labelW - volW);
    const total = (points || []).reduce((sum, p) => sum + Number(p.value || 0), 0) || 1;
    (points || []).forEach((p, i) => {
      const ly = y + i * rowH;
      this.doc.rect(x, ly + 2, sw, sw).fill(rgb(p.token === 'dispense' ? CHART_TOKENS.neutral : colorOf(p.token)));
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica').fontSize(size)
        .text(String(p.label || ''), x + sw + 6, ly, { width: labelW, lineBreak: false });
      this.doc.text(String(p.value || 0), x + sw + 6 + labelW, ly, { width: volW, align: 'right', lineBreak: false });
      this.doc.text(`${Math.round(100 * Number(p.value || 0) / total)} %`, x + sw + 6 + labelW + volW, ly, {
        width: pctW, align: 'right', lineBreak: false
      });
    });
    return y + (points || []).length * rowH;
  }

  drawLineSeriesLegend(series, x, y, w){
    const size = TYPE.legend;
    const items = series || [];
    const col = items.length ? w / items.length : w;
    items.forEach((s, i) => {
      const lx = x + i * col;
      const fill = s.token === 'dispense' ? CHART_TOKENS.neutral : colorOf(s.token);
      this.doc.rect(lx, y + 2, 8, 8).fill(rgb(fill));
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica').fontSize(size)
        .text(s.label || '', lx + 12, y, { width: col - 16, lineBreak: false });
    });
    return y + 14;
  }

  paraWithBoldRate(text){
    const size = TYPE.body;
    const width = PAGE_W - 2 * MARGIN;
    this.ensure(size * 3);
    const match = String(text || '').match(/(\d+,\d+\s*%|\d+\s*%)/);
    if(!match){
      this.para(text, { size });
      return;
    }
    const idx = match.index;
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica').fontSize(size)
      .text(text.slice(0, idx), MARGIN, this.doc.y, { width, continued: true });
    this.doc.font('Helvetica-Bold').text(match[0], { continued: true });
    this.doc.font('Helvetica').text(text.slice(idx + match[0].length), { continued: false, width });
  }

  drawPrPersonLine(row){
    const width = PAGE_W - 2 * MARGIN;
    this.ensure(TYPE.body + 6);
    const y = this.doc.y;
    const name = [row.grade, row.prenom, row.nom].filter(Boolean).join(' ');
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica').fontSize(TYPE.body);
    const bulletW = this.doc.widthOfString('·  ');
    this.doc.text('·  ', MARGIN, y, { lineBreak: false });
    this.doc.font('Helvetica-Bold').fontSize(TYPE.body);
    const nameW = this.doc.widthOfString(name);
    const xName = MARGIN + bulletW;
    this.doc.text(name, xName, y, { lineBreak: false });
    this.doc.font('Helvetica').fontSize(TYPE.body)
      .text(` (${row.nip || ''})`, xName + nameW, y, { width: Math.max(48, width - bulletW - nameW) });
    this.doc.y = y + TYPE.body + 4;
  }

  kv(rows, options){
    const cols = (options && options.cols) || 2;
    const rowH = (options && options.rowH) || 28;
    const col = (PAGE_W - 2 * MARGIN) / cols;
    let x = MARGIN;
    let y = this.doc.y;
    rows.forEach((row, i) => {
      if(i > 0 && i % cols === 0){
        y += rowH;
        x = MARGIN;
      } else if(i % cols){
        x = MARGIN + col * (i % cols);
      }
      this.ensure(rowH + 4);
      if(this.doc.y > y && i % cols === 0) y = this.doc.y;
      this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(7).text(row.label, x, y, { width: col - 8 });
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(9.5).text(String(row.value), x, y + 10, { width: col - 8 });
    });
    this.doc.y = y + rowH + 2;
  }

  personPanel(title, x, y, w, h, rows, body){
    const doc = this.doc;
    doc.save();
    doc.rect(x, y, w, h).strokeColor(rgb(INSTITUTION.line)).lineWidth(0.6).stroke();
    doc.rect(x, y, w, 14).fill(rgb(INSTITUTION.anthracite));
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7)
      .text(String(title || '').toUpperCase(), x + 6, y + 3.5, { width: w - 12 });
    if(rows && rows.length){
      const colW = (w - 16) / 2;
      rows.forEach((row, i) => {
        const cx = x + 6 + (i % 2) * colW;
        const cy = y + 20 + Math.floor(i / 2) * 22;
        doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(6)
          .text(row[0], cx, cy, { width: colW - 6 });
        doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
          .text(String(row[1] == null || row[1] === '' ? '—' : row[1]), cx, cy + 8, { width: colW - 6 });
      });
    } else {
      doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica').fontSize(8)
        .text(body || '—', x + 6, y + 20, { width: w - 12, height: h - 26 });
    }
    doc.restore();
  }

  personKpiStrip(m){
    const v = (m.officiel && m.officiel.volumes) || {};
    const cells = [
      ['Événements attendus', String(v.attendus != null ? v.attendus : (m.officiel && m.officiel.eventCount) || 0)],
      ['Présents', String(v.presents || 0)],
      ['Excusés', String(v.excuses || 0)],
      ['Absents', String(v.nonExcuses || 0)],
      ['Dispensés', String(v.dispenses || 0)],
      ['Taux de participation', formatTaux(m.officiel && m.officiel.percentage)]
    ];
    const gap = 5;
    const w = (PAGE_W - 2 * MARGIN - gap * 5) / 6;
    const h = 42;
    const y = this.doc.y;
    cells.forEach((cell, i) => {
      const x = MARGIN + i * (w + gap);
      this.doc.rect(x, y, w, h).strokeColor(rgb(INSTITUTION.line)).lineWidth(0.5).stroke();
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(11)
        .text(cell[1], x + 3, y + 6, { width: w - 6, align: 'center' });
      this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(6)
        .text(cell[0], x + 3, y + 24, { width: w - 6, align: 'center' });
    });
    this.doc.y = y + h + 8;
  }

  personCharts(m){
    const innerW = PAGE_W - 2 * MARGIN;
    const gap = 8;
    const colW = (innerW - gap) / 2;
    const h = 118;
    let y = this.doc.y;
    const left = m.graphs && m.graphs.domainesAnnees;
    const right = m.graphs && m.graphs.specialisationsAnnees;
    if(left){
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(left.question || 'Participation par domaine et par année', MARGIN, y, { width: colW });
      drawGroupedChart(this.doc, left, { x: MARGIN, y: y + 12, w: colW, h });
    }
    if(right){
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(right.question || 'Participation par spécialisation et par année', MARGIN + colW + gap, y, { width: colW });
      drawGroupedChart(this.doc, right, { x: MARGIN + colW + gap, y: y + 12, w: colW, h });
    }
    this.doc.y = y + 12 + h + 18;
    if(m.graphs && m.graphs.repartition){
      const donut = Object.assign({}, m.graphs.repartition, { type: 'donut' });
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(donut.question || 'Répartition des participations', MARGIN, this.doc.y, { width: innerW });
      const boxY = this.doc.y + 12;
      const endY = drawDonutChart(this.doc, donut, { x: MARGIN, y: boxY, w: innerW, h: 122 });
      this.doc.y = Math.max(boxY + 122, endY) + 6;
    }
  }

  banner(text, tone){
    this.ensure(36);
    const fill = tone === 'legacy' ? CHART_TOKENS.neutral : INSTITUTION.red;
    this.doc.rect(MARGIN, this.doc.y, PAGE_W - 2 * MARGIN, 28).fill(rgb(fill));
    this.doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text(text, MARGIN + 8, this.doc.y + 9, { width: PAGE_W - 2 * MARGIN - 16 });
    this.doc.y += 36;
  }

  kpiOfficial(officiel, options){
    const o = officiel || {};
    if(options && options.event){
      const v = o.volumes || {};
      const innerW = PAGE_W - 2 * MARGIN;
      const gap = 5;
      const cells = [
        ['Taux officiel', formatTaux(o.percentage)],
        ['Présents', String(v.presents || 0)],
        ['Excusés', String(v.excuses || 0)],
        ['Absents', String(v.nonExcuses || 0)],
        ['Dispensés', String(v.dispenses || 0)]
      ];
      const w = (innerW - gap * 4) / 5;
      const h = 36;
      const y = this.doc.y;
      cells.forEach((cell, i) => {
        const x = MARGIN + i * (w + gap);
        this.doc.rect(x, y, w, h).strokeColor(rgb(INSTITUTION.line)).lineWidth(0.5).stroke();
        this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(9)
          .text(cell[1], x + 3, y + 5, { width: w - 6, align: 'center' });
        this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(6)
          .text(cell[0], x + 3, y + 21, { width: w - 6, align: 'center' });
      });
      this.doc.y = y + h + 6;
      return;
    }
    const homogeneous = !(o.objectiveContext && o.objectiveContext.homogeneous === false);
    const objText = homogeneous && o.objective && o.objective.thresholdPct != null
      ? formatTaux(o.objective.thresholdPct)
      : (o.objectiveContext && o.objectiveContext.homogeneous === false
        ? 'Plusieurs objectifs ont été applicables sur cette période.'
        : 'Aucun objectif unique');
    this.kv([
      { label: 'Taux officiel', value: formatTaux(o.percentage) },
      { label: 'Numérateur / dénominateur', value: formatVolume(o) },
      { label: 'Objectif', value: objText },
      { label: 'Écart', value: homogeneous ? formatGap(o.gapPct) : '—' },
      { label: 'Événements officiels', value: String(o.eventCount || 0) },
      { label: 'Statut analytique', value: o.analyticStatus || 'NON_EVALUABLE' }
    ]);
  }

  volumes(officiel, { dap } = {}){
    const v = (officiel && officiel.volumes) || {};
    this.heading('Composition des participations', 11);
    this.kv([
      { label: 'Présents', value: String(v.presents || 0) },
      { label: 'Excusés', value: String(v.excuses || 0) },
      { label: 'Non excusés', value: String(v.nonExcuses || 0) },
      { label: 'Dispensés (hors dénominateur)', value: String(v.dispenses || 0) }
    ]);
    if(dap){
      this.para(`dont permutations : ${Number(v.permutations || 0)}  (sous-ensemble des présents, jamais additionnées)`);
    }
  }

  motifs(officiel, options){
    const v = (officiel && officiel.volumes) || {};
    const rows = [
      ['Privé', v.excusesPrive],
      ['Professionnel', v.excusesProfessionnel],
      ['Armée', v.excusesArmee],
      ['Accident / maladie', v.excusesAccidentMaladie]
    ];
    if(Number(v.excusesNonPrecise || 0) > 0) rows.push(['Non précisé (historique)', v.excusesNonPrecise]);
    const hasAny = rows.some((r) => Number(r[1] || 0) > 0);
    if(!hasAny && options && options.skipEmpty) return;
    if(options && options.compact){
      this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(7)
        .text('Motifs d’excuse', MARGIN, this.doc.y, { width: PAGE_W - 2 * MARGIN });
      this.para(rows.map((r) => `${r[0]} : ${Number(r[1] || 0)}`).join('   '), { size: 8 });
      return;
    }
    this.heading('Motifs d’excuse', 11);
    if(!hasAny){
      this.para('Aucun motif d’excuse sur cette période.');
      return;
    }
    rows.forEach((r) => this.para(`${r[0]} : ${Number(r[1] || 0)}`));
  }

  chart(title, dataset){
    if(!dataset || ['HORS_DAP', 'CONTEXTE_SDIS', 'CONTEXTE_CIBLE', 'CONTEXTE_DRILL'].includes(dataset.emptyReason)) return;
    const h = chartHeight(dataset) + 18;
    this.ensure(h + 16);
    this.heading(dataset.question || title, 11);
    const box = { x: MARGIN, y: this.doc.y, w: PAGE_W - 2 * MARGIN, h: chartHeight(dataset) };
    if(dataset.type === 'line') drawLineChart(this.doc, dataset, box);
    else if(dataset.type === 'grouped' || dataset.type === 'year-series'){
      const endY = drawGroupedChart(this.doc, dataset, box);
      this.doc.y = Math.max(box.y + box.h, endY) + 6;
      return;
    } else if(dataset.type === 'donut'){
      const endY = drawDonutChart(this.doc, dataset, Object.assign({}, box, { h: Math.max(box.h, 120) }));
      this.doc.y = endY + 6;
      return;
    } else if(dataset.type === 'stacked'){
      const endY = drawStackedBar(this.doc, dataset, box);
      this.doc.y = Math.max(box.y + box.h, endY) + 6;
      return;
    } else {
      const endY = drawBarChart(this.doc, dataset, box);
      this.doc.y = endY + 6;
      return;
    }
    this.doc.y = box.y + box.h + 8;
  }

  table(headers, rows, widths, options){
    const width = PAGE_W - 2 * MARGIN;
    const cols = widths || headers.map(() => width / headers.length);
    const aligns = (options && options.align) || [];
    const wrap = (options && options.wrap) || [];
    const headerH = 16;
    const baseRowH = (options && options.rowH) || 18;
    const paintRow = (cells, y, { header, zebra, rowH }) => {
      const h = header ? headerH : rowH;
      if(header) this.doc.rect(MARGIN, y, width, headerH).fill(rgb('#f4f5f8'));
      else if(zebra) this.doc.rect(MARGIN, y, width, h).fill(rgb('#f7f8fa'));
      let x = MARGIN;
      cells.forEach((cell, i) => {
        const align = header ? (aligns[i] || 'left') : (aligns[i] || 'left');
        this.doc.fillColor(rgb(INSTITUTION.ink))
          .font(header ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(header ? 7 : 8)
          .text(String(cell == null ? '' : cell), x + 2, y + 4, {
            width: cols[i] - 4,
            height: h - 5,
            align,
            ellipsis: !wrap[i],
            lineBreak: Boolean(wrap[i])
          });
        x += cols[i];
        this.doc.y = y;
      });
      this.doc.y = y + h;
    };
    const measureRowH = (cells) => {
      let h = baseRowH;
      cells.forEach((cell, i) => {
        if(!wrap[i]) return;
        this.doc.font('Helvetica').fontSize(8);
        const textH = this.doc.heightOfString(String(cell == null ? '' : cell), { width: cols[i] - 4 });
        h = Math.max(h, Math.min(52, textH + 8));
      });
      return h;
    };
    const drawHeader = () => {
      this.ensure(headerH + baseRowH);
      paintRow(headers, this.doc.y, { header: true, rowH: headerH });
    };
    drawHeader();
    rows.forEach((row, idx) => {
      const rowH = measureRowH(row);
      if(this.doc.y + rowH > CONTENT_BOTTOM){
        this.nextPage();
        drawHeader();
      }
      paintRow(row, this.doc.y, { zebra: idx % 2 === 1, rowH });
    });
    this.doc.y += 8;
  }

  eventsTable(events){
    if(!events || !events.length){
      this.para('Aucun événement officiel réalisé sur la période.');
      return;
    }
    this.heading('Événements officiels', 11);
    this.table(
      ['Date', 'Domaine', 'Libellé', 'Taux'],
      events.slice(0, 40).map((ev) => [
        ev.date,
        ev.domaine || '',
        ev.libelle || '',
        formatTaux(ev.percentage)
      ]),
      [70, 70, 250, 70]
    );
  }

  alerts(alerts){
    const p0 = (alerts && alerts.p0) || [];
    const p1 = (alerts && alerts.p1) || [];
    if(!p0.length && !p1.length) return;
    this.heading('Points d’attention', 11);
    p0.forEach((a) => this.para(`P0 — ${a.title || a.code || ''} : ${a.message || ''}`));
    p1.forEach((a) => this.para(`P1 — ${a.title || a.code || ''} : ${a.message || ''}`));
  }

  renderEncadrement(m){
    if(!m.encadrement || !m.encadrement.length) return;
    this.iconHeading('people', 'Encadrement (hors taux)', TYPE.section, { after: TYPE.sectionGap });
    const roleLabels = {
      FORMATEUR: 'Formateurs',
      SURVEILLANT: 'Surveillants',
      MONITEUR: 'Moniteurs',
      AUXILIAIRE: 'Auxiliaires'
    };
    const groups = [];
    m.encadrement.forEach((r) => {
      const role = String(r.role || '').toUpperCase();
      const last = groups[groups.length - 1];
      if (!last || last.role !== role) groups.push({ role, rows: [r] });
      else last.rows.push(r);
    });
    groups.forEach((group) => {
      this.heading(roleLabels[group.role] || group.role, 11);
      this.table(
        ['Grade', 'Nom', 'Prénom', 'NIP'],
        group.rows.map((r) => [r.grade || '', r.nom, r.prenom, r.nip]),
        [52, 150, 130, 70],
        { rowH: 15 }
      );
    });
  }

  renderPersonBody(m){
    const display = require('../../assets/js/scope-personnel-display.js');
    const p = m.personne || {};
    const innerW = PAGE_W - 2 * MARGIN;
    const gap = 8;
    let y = this.doc.y;
    const col1 = Math.floor((innerW - gap) * 0.44);
    const col2 = innerW - col1 - gap;
    const hId = 112;
    this.personPanel('Identité', MARGIN, y, col1, hId, [
      ['Grade', p.grade || '—'],
      ['Nom', p.nom || '—'],
      ['Prénom', p.prenom || '—'],
      ['NIP', p.nip || '—'],
      ['Statut', p.statut || '—']
    ]);
    this.personPanel('Situation / périmètre analysé', MARGIN + col1 + gap, y, col2, hId, [
      ['Date de début de l’analyse', formatDisplayDate(p.dateEntreeSdis)],
      ['Date d’inactivité', p.dateInactivite ? formatDisplayDate(p.dateInactivite) : '—'],
      ['Congé sabbatique', p.sabbaticalRange && p.sabbaticalRange !== '—' ? p.sabbaticalRange : '—'],
      ['Périmètre analysé', `${formatDisplayDate(m.period && m.period.from)} — ${formatDisplayDate(m.period && m.period.to)}`]
    ]);
    y += hId + gap;
    const hSit = 64;
    const inc = (m.incorporations || []).map((row) => {
      const extra = [row.role, row.actifDepuis ? `actif ${formatDisplayDate(row.actifDepuis)}` : '']
        .filter(Boolean).join(' · ');
      return extra ? `${row.label} — ${extra}` : row.label;
    }).join('\n') || '—';
    this.personPanel('Incorporations', MARGIN, y, col1, hSit, null, inc);
    this.personPanel('Spécialisations', MARGIN + col1 + gap, y, col2, hSit, null,
      (m.specializations && m.specializations.length) ? m.specializations.join(' · ') : 'Aucune spécialisation');
    this.doc.y = y + hSit + 10;
    this.heading('Synthèse de participation', 11, 'ink');
    this.personKpiStrip(m);
    this.heading('Analyse individuelle', 11, 'ink');
    this.personCharts(m);
    this.nextPage();
    this.heading('Historique des événements évalués', 12);
    const rows = (m.evenements || []).map((row) => [
      formatDisplayDate(row.date),
      row.libelle || '—',
      domaineLabel(row.domaine) || row.domaine || '—',
      display.ficheEventCible ? display.ficheEventCible(row) : (row.oiAtDate || '—'),
      display.ficheEventStatutLabel ? display.ficheEventStatutLabel(row) : (row.statutParticipation || '—'),
      display.ficheEventInformations ? display.ficheEventInformations(row) : '—'
    ]);
    if(!rows.length) this.para('Aucun événement nominatif sur la période.');
    else {
      this.table(
        ['Date', 'Événement', 'Domaine', 'Cible / OI', 'Statut', 'Informations'],
        rows,
        [52, 178, 50, 62, 58, 59],
        { wrap: [false, true, false, false, false, true], align: ['left', 'left', 'left', 'left', 'left', 'left'] }
      );
    }
  }

  renderEventBody(m){
    const dap = m.domaine === 'DAP' || (m.event && m.event.domaine === 'DAP');
    this.iconHeading('identity', 'Détail de l’exercice', TYPE.section, { after: TYPE.sectionGap });
    this.kv([
      { label: 'Date de l’exercice', value: formatDisplayDate(m.event.date) },
      { label: 'Statut', value: m.event.statutLabel },
      { label: 'Mode de suivi', value: m.event.modeLabel },
      { label: 'Domaine', value: domaineLabel(m.event.domaine) || domaineLabel(m.domaine) || '—' },
      { label: 'Spécialisation', value: m.event.specialization || ((m.event.domaine === 'PR' || m.domaine === 'PR') ? 'PAPR' : '—') },
      { label: 'Cible(s) / OI', value: (m.event.cibles || []).map((c) => c.code).join(', ') || '—' }
    ], { cols: 3, rowH: 22 });
    this.iconHeading('kpi', 'Synthèse de participation', TYPE.section, { after: TYPE.sectionGap });
    this.kpiOfficial(m.officiel, { event: true });
    if(dap){
      const v = (m.officiel && m.officiel.volumes) || {};
      this.para(`dont permutations : ${Number(v.permutations || 0)}  (sous-ensemble des présents, jamais additionnées)`);
    }
    this.motifs(m.officiel, { skipEmpty: true, compact: true });
    this.renderEncadrement(m);
    if(m.nominatif && m.nominatif.length){
      this.iconHeading('people', 'Liste nominative', TYPE.section, { spaceBefore: 4, after: TYPE.sectionGap });
      this.table(
        ['Grade', 'Nom', 'Prénom', 'NIP', 'OI', 'Cible', 'Statut', 'Motif'],
        m.nominatif.map((r) => [
          r.grade || '', r.nom, r.prenom, r.nip, r.oi, r.cible || r.oi || '',
          this.eventStatutLabel(r),
          r.permutation ? 'Permutation ⊂ présents' : (r.motifLabel || '')
        ]),
        [38, 72, 62, 42, 36, 42, 52, 155],
        {
          align: ['left', 'left', 'left', 'left', 'left', 'left', 'left', 'left'],
          rowH: 13,
          wrap: [false, false, false, false, false, false, false, true]
        }
      );
    } else if(m.quantitative){
      this.para('Suivi quantitatif : aucun nom n’est inventé.');
    }
    this.drawDomainSignature(m);
  }

  drawDomainSignature(m){
    this.ensure(118);
    const isPr = m.domaine === 'PR' || (m.event && m.event.domaine === 'PR');
    if(isPr && m.signatureImage){
      const person = m.signaturePerson || {};
      const name = [person.grade, person.prenom, person.nom].filter(Boolean).join(' ') || '—';
      const y = this.doc.y + 2;
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(11)
        .text(name, MARGIN, y, { width: 320 });
      const signaturePath = resolveSignaturePrPath({ required: process.env.NODE_ENV !== 'production' });
      this.doc.image(signaturePath, MARGIN, y + 10, { fit: SIGNATURE_FIT });
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(9)
        .text(m.signatureFunction || 'CHEF PROTECTION RESPIRATOIRE', MARGIN, y + 96, { width: 320 });
      this.doc.y = y + 118;
      return;
    }
    this.doc.moveDown(0.3);
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(10)
      .text(m.signatureFunction || m.signatureRole || 'Responsable de domaine', MARGIN, this.doc.y);
    this.doc.moveDown(1.2);
    this.doc.font('Helvetica').fontSize(11).text('____________________________', MARGIN, this.doc.y);
  }

  renderSessionBody(m){
    const v = (m.officiel && m.officiel.volumes) || {};
    const rates = m.rates || {};
    const innerW = PAGE_W - 2 * MARGIN;
    this.iconHeading('identity', 'Détail de l’exercice', TYPE.section, { after: TYPE.sectionGap });
    this.kv([
      { label: 'Domaine', value: domaineLabel(m.domaine) || '—' },
      { label: 'Spécialisation', value: m.specialization || '—' },
      { label: 'Nom de l’exercice', value: m.exerciseLabel || (m.event && m.event.libelle) || '—' },
      { label: 'Période / dates', value: `${formatDisplayDate((m.sessionDates && m.sessionDates.from) || (m.seances && m.seances[0] && m.seances[0].date) || (m.period && m.period.from))} - ${formatDisplayDate((m.sessionDates && m.sessionDates.to) || (m.seances && m.seances[m.seances.length - 1] && m.seances[m.seances.length - 1].date) || (m.period && m.period.to))}` },
      { label: 'Nombre de séances', value: m.sessionCountLabel || `${m.sessionCount || 0} séances` },
      { label: 'Population attendue', value: String(m.population != null ? m.population : 0) },
      { label: 'Statut', value: (m.event && m.event.statutLabel) || '—' },
      { label: 'Année analysée', value: String((m.period && m.period.from) || '').slice(0, 4) || '—' }
    ], { rowH: 24 });
    this.iconHeading('kpi', 'Synthèse de participation', TYPE.section, { spaceBefore: TYPE.blockShift, after: TYPE.sectionGap });
    const gap = 5;
    const cells = [
      ['Population attendue', String(m.population != null ? m.population : 0)],
      ['Participants', String(v.presents || 0)],
      ['Taux de participation', formatTaux(rates.participation != null ? rates.participation : (m.officiel && m.officiel.percentage))],
      ['Excusés', `${v.excuses || 0}${rates.excuses != null ? `  (${formatTaux(rates.excuses)})` : ''}`],
      ['Absents', `${v.nonExcuses || 0}${rates.absents != null ? `  (${formatTaux(rates.absents)})` : ''}`],
      ['Dispensés', `${v.dispenses || 0}${rates.dispenses != null ? `  (${formatTaux(rates.dispenses)})` : ''}`]
    ];
    const w = (innerW - gap * 5) / 6;
    const h = 38;
    let y = this.doc.y;
    cells.forEach((cell, i) => {
      const x = MARGIN + i * (w + gap);
      this.doc.rect(x, y, w, h).strokeColor(rgb(INSTITUTION.line)).lineWidth(0.5).stroke();
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(cell[1], x + 3, y + 5, { width: w - 6, align: 'center' });
      this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(6)
        .text(cell[0], x + 3, y + 22, { width: w - 6, align: 'center' });
    });
    this.doc.y = y + h + 4;
    this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(7.5)
      .text('Les volumes globaux sont dédupliqués au niveau personne. Les dispensés restent hors du dénominateur du taux officiel.', MARGIN, this.doc.y, { width: innerW });
    this.iconHeading('chart', 'Analyse graphique', TYPE.section, { spaceBefore: TYPE.blockShift, after: TYPE.sectionGap });
    const colGap = 18;
    const colW = (innerW - colGap) / 2;
    const chartH = 102;
    const chartRowY = this.doc.y;
    const leftX = MARGIN;
    const rightX = MARGIN + colW + colGap;
    if(m.graphs && m.graphs.repartition){
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(m.graphs.repartition.question, leftX, chartRowY, { width: colW });
      drawDonutChart(this.doc, Object.assign({}, m.graphs.repartition, { legendPlacement: 'none' }), {
        x: leftX, y: chartRowY + 12, w: colW, h: chartH
      });
    }
    if(m.graphs && m.graphs.tauxSeances){
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(m.graphs.tauxSeances.question, rightX, chartRowY, { width: colW });
      drawBarChart(this.doc, m.graphs.tauxSeances, { x: rightX, y: chartRowY + 12, w: colW, h: chartH });
    }
    this.doc.y = chartRowY + 12 + chartH + 8;
    const donutPoints = ((((m.graphs && m.graphs.repartition && m.graphs.repartition.series) || [])[0] || {}).points) || [];
    if(donutPoints.length){
      this.doc.y = this.drawDonutLegend(donutPoints, leftX, this.doc.y, colW) + 6;
    }
    if(m.graphs && m.graphs.volumesSeances && (m.seances || []).length){
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(8)
        .text(m.graphs.volumesSeances.question, MARGIN, this.doc.y, { width: innerW });
      const boxY = this.doc.y + 10;
      const volH = 92;
      const endY = drawGroupedChart(this.doc, m.graphs.volumesSeances, {
        x: MARGIN, y: boxY, w: innerW, h: volH, legend: 'external'
      });
      this.doc.y = Math.max(boxY + volH, endY) + 16;
      this.doc.y = this.drawLineSeriesLegend(m.graphs.volumesSeances.series, MARGIN, this.doc.y, innerW);
    }

    this.nextPage();
    this.iconHeading('kpi', 'Détail par séance', TYPE.section, { after: TYPE.sectionGap });
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(10)
      .text(`Taux de participation global : ${formatTaux(rates.participation != null ? rates.participation : (m.officiel && m.officiel.percentage))}`, MARGIN, this.doc.y, { width: innerW });
    this.doc.moveDown(0.35);
    this.table(
      ['Date', 'Séance', 'Présents', 'Excusés', 'Absents', 'Dispensés', 'Taux'],
      (m.seances || []).map((s) => [
        formatDisplayDate(s.date),
        s.label || '',
        String(s.presents || 0),
        String(s.excuses || 0),
        String(s.absents || 0),
        String(s.dispenses || 0),
        formatTaux(s.percentage)
      ]),
      [70, 90, 58, 58, 58, 62, 63],
      { align: ['left', 'left', 'right', 'right', 'right', 'right', 'right'], rowH: 15 }
    );

    this.iconHeading('people', 'Personnel dispensé', TYPE.section, { spaceBefore: 10, after: TYPE.sectionGap });
    if(m.dispenses && m.dispenses.length){
      this.table(
        ['Grade', 'Nom', 'Prénom', 'NIP', 'OI', 'Motif de dispense', 'Séance'],
        m.dispenses.map((r) => [
          r.grade || '', r.nom || '', r.prenom || '', r.nip || '', r.oi || '',
          r.motifLabel || '', r.seanceLabel || ''
        ]),
        [40, 72, 64, 44, 36, 130, 73],
        {
          align: ['left', 'left', 'left', 'left', 'left', 'left', 'left'],
          rowH: 14,
          wrap: [false, false, false, false, false, true, false]
        }
      );
    } else {
      this.para('Aucune personne dispensée sur l’exercice.');
    }

    this.iconHeading('people', 'Personnel n’ayant pas participé à l’exercice', TYPE.section, { spaceBefore: 10, after: TYPE.sectionGap });
    this.para('Les personnes ci-dessous n’ont participé à aucune des séances composant l’exercice et sont identifiées selon leur statut final enregistré dans SCOPE.');
    if(m.nonParticipants && m.nonParticipants.length){
      this.table(
        ['Grade', 'Nom', 'Prénom', 'NIP', 'OI', 'Statut', 'Motif', 'Séance'],
        m.nonParticipants.map((r) => [
          r.grade || '', r.nom || '', r.prenom || '', r.nip || '', r.oi || '',
          r.statutLabel === 'Non excusé' ? 'Absent' : (r.statutLabel || ''),
          r.motifLabel || '', r.seanceLabel || ''
        ]),
        [40, 70, 62, 44, 36, 52, 100, 55],
        {
          align: ['left', 'left', 'left', 'left', 'left', 'left', 'left', 'left'],
          rowH: 14,
          wrap: [false, false, false, false, false, false, true, false]
        }
      );
    } else {
      this.para('Aucune personne absente ou excusée sur l’exercice.');
    }

    this.iconHeading('plain', 'Information évaluation du personnel', TYPE.section, { spaceBefore: 8, after: TYPE.notesGap });
    (m.readingNotes || []).forEach((note) => {
      this.doc.moveDown(0.35);
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(TYPE.body)
        .text(note.title, MARGIN, this.doc.y, { width: innerW });
      this.para(note.text, { size: TYPE.body });
      this.doc.moveDown(0.45);
    });

    this.iconHeading('plain', 'Méthodologie de calcul du taux de participation', TYPE.section, { spaceBefore: 8, after: TYPE.notesGap });
    this.para(m.tauxExplanation || '', { size: TYPE.body });

    while(this._pageIndex < 3) this.nextPage();
    this.iconHeading('plain', 'CONCLUSION', TYPE.conclusion, { after: TYPE.conclusionGap });
    (m.conclusion || []).forEach((paragraph, i) => {
      if(i === 0) this.paraWithBoldRate(paragraph);
      else this.para(paragraph, { size: TYPE.body });
      this.doc.moveDown(0.55);
    });
    if(m.prSuspensionText && m.nonParticipants && m.nonParticipants.length){
      this.doc.moveDown(0.35);
      this.para(m.prSuspensionText, { size: TYPE.body });
      this.doc.moveDown(0.55);
      m.nonParticipants.forEach((r) => this.drawPrPersonLine(r));
    }
    this.doc.moveDown(1.1);
    this.drawDomainSignature(m);
  }

  render(){
    const m = this.model;
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(14)
      .text(m.title, MARGIN, this.doc.y, { width: PAGE_W - 2 * MARGIN });
    this.doc.moveDown(0.12);
    if(m.kind === 'SESSION'){
      this.para(`Établi le ${formatDisplayDateTime(this.meta.generatedAt) || ''}`);
    } else if(m.kind === 'EVENT' && m.event){
      this.para(m.subtitle || '');
      this.para(`Établi le ${formatDisplayDateTime(this.meta.generatedAt) || formatDisplayDate(m.event.date)}`);
    } else if(m.kind === 'PERSON'){
      this.para(m.subtitle || 'Fiche individuelle');
      this.para('Synthèse de participation');
      this.para(`Période analysée : ${formatDisplayDate(m.period && m.period.from)} - ${formatDisplayDate(m.period && m.period.to)}`);
      this.para(`Auteur : ${this.meta.authorLabel || 'session SCOPE'}  ·  ${formatDisplayDateTime(this.meta.generatedAt) || this.meta.generatedAt || ''}`);
    } else {
      this.para(`Période : ${periodLabel(m.period)}`);
      this.para(`Périmètre : ${m.subtitle}`);
      this.para(`Auteur : ${this.meta.authorLabel || 'session SCOPE'}  ·  ${formatDisplayDateTime(this.meta.generatedAt) || this.meta.generatedAt || ''}`);
    }
    this.doc.moveDown(0.3);

    if(m.isLegacy){
      this.banner(m.legacy && m.legacy.banner ? m.legacy.banner : 'Historique agrégé — données non nominatives.', 'legacy');
      this.kv([
        { label: 'Taux LEGACY (hors KPI officiel)', value: formatTaux(m.legacy && m.legacy.tauxLegacy) },
        { label: 'Présents / attendu', value: `${(m.legacy && m.legacy.presents) ?? '—'} / ${(m.legacy && m.legacy.attendu) ?? '—'}` },
        { label: 'Mode', value: (m.event && m.event.modeLabel) || 'LEGACY' },
        { label: 'Liste nominative', value: 'Aucune — non nominatif' }
      ]);
      this.para('Ce document ne présente pas un taux officiel SCOPE et n’applique aucun objectif officiel.');
      return;
    }

    if(m.kind === 'PERSON'){
      this.renderPersonBody(m);
      return;
    }

    if(m.kind === 'SESSION'){
      this.renderSessionBody(m);
      return;
    }

    if(m.kind === 'EVENT' && m.event){
      this.renderEventBody(m);
      return;
    }

    if(m.event){
      this.kv([
        { label: 'Date', value: m.event.date },
        { label: 'Statut', value: m.event.statutLabel },
        { label: 'Mode de suivi', value: m.event.modeLabel },
        { label: 'Domaine', value: domaineLabel(m.event.domaine) },
        { label: 'Sous-domaine', value: m.event.sousDomaine ? domaineLabel(m.event.sousDomaine) : '—' },
        { label: 'Cible(s) / OI', value: (m.event.cibles || []).map((c) => c.code).join(', ') || '—' }
      ]);
    }

    this.heading('Synthèse officielle', 12);
    this.kpiOfficial(m.officiel);
    if(m.absencesNonExcusees) this.para(`Absences non excusées : ${m.absencesNonExcusees.count || 0}`);
    if(m.inboxCount) this.para(`Exercices à traiter (P0) : ${m.inboxCount}`);
    if(m.legacy && m.legacy.eventCount){
      this.para(`${m.legacy.eventCount} événement(s) LEGACY : série historique distincte, hors KPI officiel.`);
    }

    const dap = m.domaine === 'DAP' || (m.event && m.event.domaine === 'DAP');
    if(m.kind === 'PERIOD'){
      if(m.graphs) this.chart('Évolution', m.graphs.evolution);
      this.nextPage();
      this.heading('Domaines', 12);
      if(m.domaines && m.domaines.length){
        this.table(
          ['Domaine', 'Taux', 'Objectif', 'Écart', 'Volume', 'Év.'],
          m.domaines.map((d) => [
            d.id || d.label,
            formatTaux(d.percentage),
            d.objective && d.objective.thresholdPct != null ? formatTaux(d.objective.thresholdPct) : (d.objectiveContext && d.objectiveContext.homogeneous === false ? 'Non homogène' : '—'),
            formatGap(d.gapPct),
            d.denominator ? `${d.numerator}/${d.denominator}` : '—',
            String(d.eventCount || 0)
          ]),
          [80, 70, 90, 70, 80, 40]
        );
      }
      if(m.graphs) this.chart('Domaines', m.graphs.domaines);
      this.nextPage();
      this.heading('Détail', 12);
      this.volumes(m.officiel, { dap: false });
      this.motifs(m.officiel);
      if(m.graphs){
        this.chart('Composition', m.graphs.composition);
        this.chart('Motifs', m.graphs.motifs);
        this.chart('Permutations', m.graphs.permutations);
        this.chart('Sous-domaines / OI', m.graphs.children);
      }
      this.alerts(m.alerts);
      this.eventsTable(m.events);
    } else {
      this.volumes(m.officiel, { dap });
      this.motifs(m.officiel);
      if(m.graphs){
        this.chart('Évolution', m.graphs.evolution);
        this.chart('Domaines', m.graphs.domaines);
        this.chart('Sous-domaines / OI', m.graphs.children);
        this.chart('Composition', m.graphs.composition);
        this.chart('Motifs', m.graphs.motifs);
        this.chart('Permutations', m.graphs.permutations);
      }
      this.alerts(m.alerts);
      this.eventsTable(m.events);
    }

    if(m.nominatif && m.nominatif.length){
      this.heading('Liste nominative', 12);
      this.para(`${m.nominatif.length} participant(s) attendu(s). Les dispensés restent hors du dénominateur du taux officiel.`);
      this.table(
        ['Grade', 'Nom', 'Prénom', 'NIP', 'OI', 'Cible', 'Statut', 'Motif'],
        m.nominatif.map((r) => [
          r.grade || '', r.nom, r.prenom, r.nip, r.oi, r.cible || r.oi || '', r.statutLabel,
          r.permutation ? 'Permutation ⊂ présents' : (r.motifLabel || '')
        ]),
        [42, 78, 68, 48, 36, 48, 64, 75]
      );
    }
  }

  async finalize(){
    const doc = this.doc;
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    const ended = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
    this.render();
    const range = doc.bufferedPageRange();
    this.drawFooters(range.count);
    doc.end();
    const buffer = await ended;
    return { buffer, pages: range.count };
  }
}

function renderReportPdf(model, meta){
  const renderer = new ScopePdfRenderer(model, meta);
  return renderer.finalize();
}

module.exports = { renderReportPdf, formatTaux, formatGap, LOGO_SCOPE, LOGO_SDIS, SIGNATURE_PR, SIGNATURE_FIT, TYPE, MARGIN, headerLogoLayout, resolveSignaturePrPath, PAGE_W };
