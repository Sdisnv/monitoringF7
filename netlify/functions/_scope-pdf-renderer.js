'use strict';
/** SCOPE-REPORT-1 — rendu PDFKit. Affiche les chiffres serveur, ne les calcule pas. */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { INSTITUTION, CHART_TOKENS, hexToRgb } = require('./_scope-chart-tokens');
const { drawLineChart, drawBarChart, drawStackedBar, chartHeight } = require('./_scope-pdf-charts');
const { domaineLabel } = require('./_scope-report-data');

const LOGO_SCOPE = path.join(__dirname, '../../assets/img/logo-scope-blanc.png');
const LOGO_SDIS = path.join(__dirname, '../../assets/img/LogoSDISblanc.png');
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const HEADER_H = 58;
const FOOTER_H = 42;
const CONTENT_BOTTOM = PAGE_H - FOOTER_H - 8;

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
  return `${period.from} → ${period.to} (${preset})`;
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
  }

  nextPage(){
    this._forcePage = true;
    this.doc.addPage();
    this._forcePage = false;
    this.doc.y = HEADER_H + 18;
  }

  drawChrome(){
    const doc = this.doc;
    doc.save();
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(rgb(INSTITUTION.red));
    if(hasLogo(LOGO_SCOPE)){
      doc.image(LOGO_SCOPE, 16, 10, { fit: [92, 36], valign: 'center' });
    }
    if(hasLogo(LOGO_SDIS)){
      doc.image(LOGO_SDIS, PAGE_W - 148, 8, { fit: [120, 42], valign: 'center' });
    }
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
      .text('SCOPE — Suivi et analyse de l’activité', 112, 14, { width: 300 });
    doc.font('Helvetica').fontSize(8)
      .text(this.model.subtitle || '', 112, 28, { width: 300 });
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
        .strokeColor(rgb(INSTITUTION.line)).lineWidth(0.6).stroke();
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

  heading(text, size){
    this.ensure(22);
    this.doc.fillColor(rgb(INSTITUTION.redDark)).font('Helvetica-Bold').fontSize(size || 13)
      .text(text, MARGIN, this.doc.y, { width: PAGE_W - 2 * MARGIN });
    this.doc.moveDown(0.35);
  }

  para(text, opts){
    const width = PAGE_W - 2 * MARGIN;
    this.ensure(16);
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica').fontSize(9)
      .text(text, MARGIN, this.doc.y, Object.assign({ width }, opts || {}));
  }

  kv(rows){
    const col = (PAGE_W - 2 * MARGIN) / 2;
    let x = MARGIN;
    let y = this.doc.y;
    rows.forEach((row, i) => {
      if(i > 0 && i % 2 === 0){
        y += 28;
        x = MARGIN;
      } else if(i % 2 === 1){
        x = MARGIN + col;
      }
      this.ensure(32);
      if(this.doc.y > y && i % 2 === 0) y = this.doc.y;
      this.doc.fillColor(rgb(INSTITUTION.muted)).font('Helvetica').fontSize(7).text(row.label, x, y, { width: col - 8 });
      this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(10).text(String(row.value), x, y + 10, { width: col - 8 });
    });
    this.doc.y = y + 32;
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
      this.kv([
        { label: 'Taux officiel', value: formatTaux(o.percentage) },
        { label: 'Présents', value: String(v.presents || 0) },
        { label: 'Excusés', value: String(v.excuses || 0) },
        { label: 'Absents', value: String(v.nonExcuses || 0) },
        { label: 'Dispensés', value: String(v.dispenses || 0) }
      ]);
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
    else if(dataset.type === 'stacked'){
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

  table(headers, rows, widths){
    const width = PAGE_W - 2 * MARGIN;
    const cols = widths || headers.map(() => width / headers.length);
    const rowH = 18;
    const headerH = 16;
    const paintRow = (cells, y, { header, zebra }) => {
      if(header) this.doc.rect(MARGIN, y, width, headerH).fill(rgb('#f4f5f8'));
      else if(zebra) this.doc.rect(MARGIN, y, width, rowH).fill(rgb('#f7f8fa'));
      let x = MARGIN;
      const h = header ? headerH : rowH;
      cells.forEach((cell, i) => {
        this.doc.fillColor(rgb(INSTITUTION.ink))
          .font(header ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(header ? 7 : 8)
          .text(String(cell == null ? '' : cell), x + 2, y + 4, {
            width: cols[i] - 4,
            height: h - 5,
            ellipsis: true,
            lineBreak: false
          });
        x += cols[i];
        this.doc.y = y;
      });
      this.doc.y = y + h;
    };
    const drawHeader = () => {
      this.ensure(headerH + rowH);
      paintRow(headers, this.doc.y, { header: true });
    };
    drawHeader();
    rows.forEach((row, idx) => {
      if(this.doc.y + rowH > CONTENT_BOTTOM){
        this.nextPage();
        drawHeader();
      }
      paintRow(row, this.doc.y, { zebra: idx % 2 === 1 });
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
    this.heading('Encadrement (hors taux)', 12);
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
        [60, 140, 120, 80]
      );
    });
  }

  renderEventBody(m){
    const dap = m.domaine === 'DAP' || (m.event && m.event.domaine === 'DAP');
    const identity = [
      { label: 'Date de l’exercice', value: formatDisplayDate(m.event.date) },
      { label: 'Statut', value: m.event.statutLabel },
      { label: 'Mode de suivi', value: m.event.modeLabel },
      { label: 'Domaine', value: domaineLabel(m.event.parentDomaine || m.event.domaine) },
      { label: 'Cible(s) / OI', value: (m.event.cibles || []).map((c) => c.code).join(', ') || '—' }
    ];
    if(m.event.sousDomaine) identity.splice(4, 0, { label: 'Sous-domaine', value: domaineLabel(m.event.sousDomaine) });
    this.kv(identity);
    this.heading('Synthèse', 12);
    this.kpiOfficial(m.officiel, { event: true });
    if(dap){
      const v = (m.officiel && m.officiel.volumes) || {};
      this.para(`dont permutations : ${Number(v.permutations || 0)}  (sous-ensemble des présents, jamais additionnées)`);
    }
    this.motifs(m.officiel, { skipEmpty: true });
    this.renderEncadrement(m);
    if(m.nominatif && m.nominatif.length){
      this.heading('Liste nominative', 12);
      this.table(
        ['Grade', 'Nom', 'Prénom', 'NIP', 'OI', 'Cible', 'Statut', 'Motif'],
        m.nominatif.map((r) => [
          r.grade || '', r.nom, r.prenom, r.nip, r.oi, r.cible || r.oi || '',
          r.statutLabel,
          r.permutation ? 'Permutation ⊂ présents' : (r.motifLabel || '')
        ]),
        [42, 78, 68, 48, 36, 48, 64, 75]
      );
    } else if(m.quantitative){
      this.para('Suivi quantitatif : aucun nom n’est inventé.');
    }
  }

  render(){
    const m = this.model;
    this.doc.fillColor(rgb(INSTITUTION.ink)).font('Helvetica-Bold').fontSize(16)
      .text(m.title, MARGIN, this.doc.y, { width: PAGE_W - 2 * MARGIN });
    this.doc.moveDown(0.2);
    if(m.kind === 'EVENT' && m.event){
      this.para(m.subtitle || '');
      this.para(`Établi le ${formatDisplayDateTime(this.meta.generatedAt) || formatDisplayDate(m.event.date)}`);
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

    if(m.kind === 'EVENT' && m.event){
      this.renderEventBody(m);
      return;
    }

    if(m.event){
      this.kv([
        { label: 'Date', value: m.event.date },
        { label: 'Statut', value: m.event.statutLabel },
        { label: 'Mode de suivi', value: m.event.modeLabel },
        { label: 'Domaine', value: domaineLabel(m.event.parentDomaine || m.event.domaine) },
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

module.exports = { renderReportPdf, formatTaux, formatGap, LOGO_SCOPE, LOGO_SDIS };
