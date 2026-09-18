#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const html = read('scope.html');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const schema = read('netlify/lib/_scope-schema.js');
const pdfRenderer = read('netlify/lib/_scope-pdf-renderer.js');
const report = read('netlify/lib/_scope-report-service.js');
const referentials = require('../netlify/lib/_scope-quo-vadis-referentials');
const { renderQuoVadisProgrammePdf } = require('../netlify/lib/_scope-pdf-renderer');

const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const filters = ui.slice(ui.indexOf('function qvActivitesFilterBar('), ui.indexOf('function qvSallesForLieu('));
const notes = ui.slice(ui.indexOf('function qvActivitesSecondaryCards('), ui.indexOf('function renderQuoVadisActivites('));
const filtered = ui.slice(ui.indexOf('function qvFilteredActivities('), ui.indexOf('function qvActivitySortValue('));
const badge = ui.slice(ui.indexOf('function qvAgendaStateBadge('), ui.indexOf('function qvAgendaDayTitle('));
const csv = ui.slice(ui.indexOf('const downloadQuoVadisCsv'), ui.indexOf('document.getElementById(\'qv-export-excel\')'));
const annualCss = css.slice(css.indexOf('.qv-mini-week-head,'), css.indexOf('.qv-mini-day.has-vacation'));
const periodCss = css.slice(css.indexOf('.qv-period-seg {'), css.indexOf('.qv-activities-table .qv-col-date'));
const periodActiveCss = css.slice(css.indexOf('.qv-period-seg-btn.is-active'), css.indexOf('.qv-period-seg-btn:focus-visible'));
const searchCss = css.slice(css.indexOf('.qv-filter-search-control {'), css.indexOf('.qv-agenda-check {'));
const stateCss = css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-state.is-planned'));
const laterTableCss = css.slice(css.lastIndexOf('.scope-table.qv-activities-table tbody tr.qv-month-separator'));
const navCss = css.slice(css.indexOf('.scope-btn.qv-agenda-nav-side {'), css.indexOf('.scope-btn.qv-agenda-nav-side:hover:not(:disabled)'));
const exportCss = css.slice(css.indexOf('.qv-export-actions {'), css.indexOf('.qv-export-icon.is-excel') + 80);
const qvPdf = pdfRenderer.slice(pdfRenderer.indexOf('renderQuoVadisProgramme('), pdfRenderer.indexOf('async finalizeQuoVadisProgramme('));

assert.ok(/qv-period-seg/.test(filters));
assert.ok(/data-qv-period="tous"/.test(filters) || /value: 'tous', label: 'Tous'/.test(ui));
assert.ok(/Tous/.test(filters) && /Mois/.test(filters) && /Trimestre/.test(filters) && /Semestre/.test(filters));
assert.ok(/background:\s*#e8ecf8/.test(periodActiveCss));
assert.ok(/box-shadow:\s*inset 0 0 0 1\.5px var\(--scope-blue\)/.test(periodActiveCss));
assert.ok(/color:\s*var\(--scope-blue\)/.test(periodActiveCss));
assert.ok(!/background:\s*var\(--scope-blue\)/.test(periodActiveCss));
assert.ok(!/color:\s*#fff/.test(periodActiveCss));
assert.ok(!/#171C8F[^;]*;\s*color:\s*#fff/.test(periodCss));
assert.ok(/background:\s*#fff/.test(periodCss));
assert.ok(/:hover:not\(\.is-active\)[\s\S]*background:\s*#f4f6fb/.test(periodCss));
assert.ok(/:focus-visible/.test(periodCss));
assert.ok(!/qv-period-seg-btn--tous|data-qv-period="tous"[^>]*style/.test(filters));

assert.ok(/qv-agenda-nav-side qv-export-btn/.test(activites));
assert.ok(/qv-export-icon is-pdf/.test(activites) && /qv-export-icon is-excel/.test(activites));
assert.ok(/Exporter PDF/.test(activites) && /Exporter pour Excel/.test(activites));
assert.ok(/background:\s*#f4f6fb/.test(navCss));
assert.ok(/border:\s*1\.5px solid var\(--scope-blue\)/.test(navCss));
assert.ok(/height:\s*36px/.test(navCss));
assert.ok(/border-radius:\s*8px/.test(navCss));
assert.ok(/color:\s*var\(--scope-red\)/.test(exportCss));
assert.ok(/color:\s*var\(--scope-ok\)/.test(exportCss));
assert.ok(!/background:\s*var\(--scope-red\)/.test(exportCss));
assert.ok(!/background:\s*var\(--scope-ok\)/.test(exportCss));

assert.ok(/qv-filter-search-icon/.test(filters));
assert.ok(/Rechercher une activité, un domaine, un lieu…/.test(filters));
assert.ok(/flex:\s*0 0 38px/.test(searchCss));
assert.ok(/padding:\s*0 12px 0 4px/.test(searchCss));
assert.ok(/height:\s*var\(--scope-h-control\)/.test(searchCss));
assert.ok(!/position:\s*absolute/.test(searchCss));
assert.ok(/pointer-events:\s*none/.test(searchCss));

assert.ok(/<th>Spécialisation · cursus<\/th>/.test(activites));
assert.ok(!/Spécialisation \/ cursus/.test(activites));
assert.ok(!/SPÉCIALISATION \/ CURSUS/.test(activites));
assert.ok(/Spécialisation · cursus/.test(csv));
assert.ok(/Spécialisation · cursus/.test(qvPdf));
assert.ok(!/Spé\. \/ cursus/.test(qvPdf));

assert.ok(!/scope-pagination/.test(activites));
assert.ok(!/qv-activites-page|pageSize|EVENT_LIST_PAGE/.test(activites));
assert.ok(/return qvSortActivities\(rows(?:, qv)?\)/.test(filtered));
assert.ok(/qv-month-separator/.test(activites));
assert.ok(/background:\s*#5b6570/.test(laterTableCss));
assert.ok(/qvAgendaStateBadge\(row\)/.test(activites));
assert.ok(/qv-agenda-state/.test(badge));
assert.ok(/font-weight:\s*400/.test(stateCss));
assert.ok(/font-size:\s*inherit/.test(stateCss));
assert.ok(!/font-weight:\s*700/.test(stateCss));
assert.ok(/border-radius:\s*4px/.test(stateCss));
assert.ok(!/<th>Point d’attention<\/th>/.test(activites));

assert.ok(/Bon à savoir/.test(notes));
assert.ok(/La période d’affichage réduit la liste\./.test(notes));
assert.ok(/Le tableau reste unique et chronologique\./.test(notes));
assert.ok(/Cliquez une ligne pour ouvrir la fiche détaillée de l’activité\./.test(notes));
assert.ok(/qvCockpitIcon\('bulb'\)/.test(notes));
assert.ok(/qvCockpitIcon\('building'\)/.test(notes));
assert.ok(/qvCockpitIcon\('pin'\)/.test(notes));
assert.ok(/Salles de théorie disponibles \(rappel\)/.test(notes));
assert.ok(/qv-note-salles/.test(notes) && /qv-note-none/.test(notes));
assert.ok(/Adresses des sites/.test(notes));
assert.ok(!/Centre SDIS/.test(notes) && !/Centre SDIS/.test(activites));
assert.ok(referentials.OFFICIAL_LIEUX.every((row) => /^(Caserne|Local) /.test(row.nomCourt)));
assert.ok(referentials.OFFICIAL_LIEUX.every((row) => !row.npa));
assert.ok(!referentials.OFFICIAL_LIEUX.some((row) => /Centre SDIS/i.test(JSON.stringify(row))));

assert.ok(/Adresse du lieu/.test(csv));
assert.ok(/Point d’attention/.test(csv));
assert.ok(/Salle théorie/.test(csv));
assert.ok(/Responsable/.test(csv));

assert.ok(/qvExportMeta/.test(qvPdf));
assert.ok(/this\.doc\.y = y/.test(qvPdf));
assert.ok(/countLabel/.test(qvPdf));
assert.ok(/#5b6570/.test(qvPdf));
assert.ok(/#eceaf6/.test(qvPdf) && /#dce3f7/.test(qvPdf));
assert.ok(/kind !== 'QUO_VADIS'/.test(pdfRenderer));
assert.ok(/landscape:\s*true/.test(pdfRenderer));
assert.ok(/publicCible/.test(report) && /salleTheorie/.test(report));
assert.ok(!/addPage\(\).*mois/.test(qvPdf.toLowerCase()));

assert.ok(/font-size:\s*10px/.test(annualCss));
assert.ok(/\.qv-mini-week \{\s*color:\s*#3d4650;\s*font-size:\s*11px;\s*font-weight:\s*700;/.test(annualCss.replace(/\s+/g, ' ').replace('.qv-mini-week {', '.qv-mini-week {')));
assert.ok(/font-size:\s*11px/.test(css.slice(css.indexOf('.qv-mini-week {'), css.indexOf('.qv-mini-day.has-vacation'))));
assert.ok(/font-weight:\s*700/.test(css.slice(css.indexOf('.qv-mini-week {'), css.indexOf('.qv-mini-day.has-vacation'))));

assert.ok(/scope-quo-vadis-toutes-activites-ux-[34]/.test(html));
assert.ok(/scope-quo-vadis-toutes-activites-ux-[34]/.test(css));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-toutes-activites-ux-1'/.test(schema));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));

function sampleRows() {
  const months = [
    { key: '2027-02', label: 'Février 2027', n: 12 },
    { key: '2027-03', label: 'Mars 2027', n: 18 },
    { key: '2027-04', label: 'Avril 2027', n: 14 }
  ];
  const rows = [];
  months.forEach((month) => {
    for (let i = 1; i <= month.n; i += 1) {
      const day = String(Math.min(28, i)).padStart(2, '0');
      rows.push({
        date: `${day}.${month.key.slice(5, 7)}.2027`,
        monthKey: month.key,
        monthLabel: month.label,
        horaire: '19:00 – 21:30',
        domaine: i % 3 === 0 ? 'FOBA' : 'JSP',
        oi: i % 4 === 0 ? 'G1' : '—',
        publicCible: 'SP',
        activite: i === 2
          ? 'Exercice FOBA 1 | Cérémonie de remise des casques — libellé volontairement long pour contrôler le wrap'
          : `Exercice ${month.label} ${i}`,
        specCursus: i % 5 === 0 ? 'CI DPS · Année 2' : '—',
        statcom: '—',
        lieu: 'Caserne G1',
        salleTheorie: i % 2 === 0 ? 'Vulcain' : 'Oxygène',
        responsable: i % 3 === 0 ? 'C FOBA' : 'Resp for JSP',
        etat: ['Planifié', 'Validé', 'À arbitrer', 'Point d’attention', 'Annulé'][i % 5],
        calendarKind: i === 1 ? 'is-holiday' : (i === 3 ? 'is-vacation' : '')
      });
    }
  });
  return rows;
}

async function inspectPdf(buffer) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
  pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      width: viewport.width,
      height: viewport.height,
      items: content.items.map((item) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }))
    });
  }
  return { numPages: doc.numPages, pages };
}

(async () => {
  const generatedAt = '2026-09-18T11:53:00.000Z';
  const { buffer, pages } = await renderQuoVadisProgrammePdf(sampleRows(), {
    search: 'Toutes',
    domain: 'Tous',
    oi: 'Tous',
    status: 'Tous',
    month: 'Tous'
  }, { generatedAt, authorLabel: 'SCOPE UX-3' });

  assert.ok(pages >= 2, 'le PDF doit paginer uniquement par remplissage');
  const info = await inspectPdf(buffer);
  assert.ok(info.pages[0].width > info.pages[0].height, 'A4 paysage');
  assert.ok(Math.abs(info.pages[0].width - 841.89) < 1);
  assert.ok(Math.abs(info.pages[0].height - 595.28) < 1);

  const page1Text = info.pages[0].items.map((item) => item.str).join(' ');
  assert.ok(/QUO VADIS 2027/.test(page1Text));
  assert.ok(/Programme annuel préparatoire/.test(page1Text));
  assert.ok(/Toutes les activités/.test(page1Text));
  assert.ok(/Spécialisation ·/.test(page1Text));
  assert.ok(/cursus/.test(page1Text));
  assert.ok(!/Spé\. \/ cursus/.test(page1Text));
  assert.ok(!/LEGACY/.test(page1Text));
  assert.ok(/FÉVRIER 2027|Février 2027/i.test(page1Text));
  assert.ok(/12 activités/.test(page1Text));
  assert.ok(/Page 1 \/ /.test(page1Text));
  assert.ok(/SCOPE/.test(page1Text));

  const headerLabels = ['Date', 'Horaire', 'Domaine', 'OI', 'Public cible', 'Activité', 'Stat.Com', 'Lieu', 'Responsable', 'État'];
  const headerItems = info.pages[0].items.filter((item) => headerLabels.includes(item.str));
  assert.ok(headerItems.length >= 8, 'entête horizontal présent');
  const headerYs = headerItems.map((item) => item.y);
  const headerSpread = Math.max(...headerYs) - Math.min(...headerYs);
  assert.ok(headerSpread < 14, `entête en escalier détecté (spread ${headerSpread.toFixed(2)}pt)`);

  const tableTop = Math.max(...headerYs);
  const pageTop = info.pages[0].height;
  const gapFromTop = pageTop - tableTop;
  assert.ok(gapFromTop < 210, `zone blanche excessive avant le tableau (${gapFromTop.toFixed(1)}pt)`);

  const lastPageText = info.pages[info.numPages - 1].items.map((item) => item.str).join(' ');
  assert.ok(new RegExp(`Page ${info.numPages} / ${info.numPages}`).test(lastPageText));
  assert.ok(/Généré le/.test(lastPageText));
  assert.ok(!/LEGACY/.test(lastPageText));

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-qv-ux3-'));
  const pdfPath = path.join(outDir, 'SCOPE_QUO_VADIS_2027_Programme.pdf');
  fs.writeFileSync(pdfPath, buffer);
  console.log(`scope-quo-vadis-toutes-activites-ux-3-tests: ok (${pages} pages, headerSpread=${headerSpread.toFixed(2)}pt, gap=${gapFromTop.toFixed(1)}pt)`);
  console.log(`pdf-preview: ${pdfPath}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
