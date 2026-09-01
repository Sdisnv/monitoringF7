#!/usr/bin/env node
// SCOPE-MOA-UX-R2 — garde-fous reprise navigation, pages métier et PDFKit Netlify.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logicSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const charts = fs.readFileSync(path.join(ROOT, 'assets/js/scope-charts.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const toml = fs.readFileSync(path.join(ROOT, 'netlify.scope.toml'), 'utf8');
const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
const apiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const pgRepo = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pg.js'), 'utf8');
const L = require(path.join(ROOT, 'assets/js/scope-ui-logic.js'));

const arbre = [
  { code: 'FOSPEC', libelleAffiche: 'FOSPEC', cibles: [] },
  { code: 'JSP', libelleAffiche: 'JSP', cibles: [] },
  { code: 'DAP', libelleAffiche: 'DAP', cibles: [{ domaineCode: 'DAP', niveauCode: 'Y1' }, { domaineCode: 'DAP', niveauCode: 'Y2' }] },
  { code: 'AUTO', libelleAffiche: 'AUTO', cibles: [] },
  { code: 'DPS', libelleAffiche: 'DPS', cibles: [] },
  { code: 'FOCA', libelleAffiche: 'FOCA', cibles: [{ domaineCode: 'FOCA', niveauCode: 'GEN' }, { domaineCode: 'FOCA', niveauCode: 'I' }, { domaineCode: 'FOCA', niveauCode: 'II' }, { domaineCode: 'FOCA', niveauCode: 'III_IV' }] },
  { code: 'FOBA', libelleAffiche: 'FOBA', cibles: [{ domaineCode: 'FOBA', niveauCode: '1' }, { domaineCode: 'FOBA', niveauCode: '2' }, { domaineCode: 'FOBA', niveauCode: '3' }] }
];

let passed = 0;
async function record(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

(async () => {
  await record('01 — menu contient Accueil explicite', async () => {
    assert.strictEqual(L.parseHash('#/accueil').screen, 'accueil');
    assert.ok(ui.includes("primaryLink('#/accueil', 'Accueil'"));
  });

  await record('02 — ordre domaines DPS DAP JSP FOBA FOCA FOSPEC puis complémentaire', async () => {
    const labels = L.buildSidebarNav(arbre, {}).domains.map((d) => d.id);
    assert.deepStrictEqual(labels.slice(0, 6), ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC']);
    assert.strictEqual(labels[6], 'AUTO');
  });

  await record('03 — chevrons supprimés du drawer', async () => {
    assert.ok(!ui.includes('scope-nav-caret'));
    assert.ok(!css.includes('scope-nav-caret'));
  });

  await record('04 — accordéon exclusif', async () => {
    assert.ok(ui.includes('state.openGroups = currently ? {} : { [id]: true }'));
  });

  await record('05 — drawer type ORION overlay fermé par défaut', async () => {
    assert.ok(css.includes('transform: translateX(-105%)'));
    assert.ok(css.includes('.scope-nav-backdrop'));
    assert.ok(ui.includes('scope-nav-toggle'));
    assert.ok(ui.includes('scope-nav-close'));
  });

  await record('06 — Réglages structuré', async () => {
    ['Paramètres', 'Application', 'Importation', 'À propos'].forEach((label) => assert.ok(ui.includes(label)));
    assert.ok(ui.includes('#/reglages/apropos'));
    assert.strictEqual(L.parseHash('#/reglages/apropos').nav, 'reglages');
  });

  await record('07 — import événements absent de la page principale', async () => {
    const liste = ui.slice(ui.indexOf('function renderListe'), ui.indexOf('function periodLabel'));
    assert.ok(!liste.includes('#/reglages/import-evenements'));
    assert.ok(!liste.includes('Importer un programme'));
    assert.ok(ui.includes('function renderImport'));
  });

  await record('08 — import personnel visible depuis Personnel principal', async () => {
    assert.ok(ui.includes('function renderPersonnel(options)'));
    assert.ok(ui.includes('const importMode = Boolean(options && options.importMode)'));
    assert.ok(ui.includes('Importer du personnel'));
    assert.ok(ui.includes('scope-open-personnel-import'));
    assert.ok(ui.includes('function openPersonnelImportPanel()'));
    assert.ok(ui.includes('state.personnelSync.panelOpen = true'));
    assert.ok(ui.includes('function bindPersonnelImportDelegation()'));
    assert.ok(ui.includes("closest('#scope-open-personnel-import')"));
    assert.ok(ui.includes('openPersonnelImportPanel();'));
    assert.ok(ui.includes('id="scope-personnel-import-panel"'));
    assert.ok(!ui.includes('catch {'));
    assert.ok(ui.includes('L’import personnel est réservé aux profils habilités (personnel:manage).'));
    assert.ok(ui.includes('Analyser le fichier'));
    assert.ok(ui.includes('Valider l’import'));
    assert.ok(ui.includes('previewPersonnelSync'));
    assert.ok(ui.includes('renderPersonnel({ importMode: true })'));
    const analyzeHandler = ui.slice(ui.indexOf("document.getElementById('scope-sync-preview')"), ui.indexOf("document.getElementById('scope-sync-commit')"));
    assert.ok(analyzeHandler.includes('previewPersonnelSync'));
    assert.ok(!analyzeHandler.includes('commitPersonnelSync'));
  });

  await record('09 — importation accessible depuis Réglages', async () => {
    assert.strictEqual(L.parseHash('#/reglages/import-evenements').screen, 'import-evenements');
    assert.strictEqual(L.parseHash('#/reglages/import-personnel').screen, 'import-personnel');
  });

  await record('10 — libellés FOBA 1/2/3', async () => {
    assert.strictEqual(L.niveauAffiche('FOBA', '1'), 'FOBA 1');
    assert.strictEqual(L.niveauAffiche('FOBA', '2'), 'FOBA 2');
    assert.strictEqual(L.niveauAffiche('FOBA', '3'), 'FOBA 3');
  });

  await record('11 — libellés FOCA attendus', async () => {
    assert.strictEqual(L.niveauAffiche('FOCA', 'GEN'), 'Général');
    assert.strictEqual(L.niveauAffiche('FOCA', 'I'), 'Échelon I');
    assert.strictEqual(L.niveauAffiche('FOCA', 'II'), 'Échelon II');
    assert.strictEqual(L.niveauAffiche('FOCA', 'III_IV'), 'Échelons III et IV');
  });

  await record('12 — GEN visible en Général', async () => {
    assert.strictEqual(L.domaineAffiche('GEN'), 'Général');
    assert.strictEqual(L.niveauAffiche('GEN', 'GEN'), 'Général');
  });

  await record('13 — routage domaines stable', async () => {
    ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC', 'PR', 'AUTO'].forEach((code) => {
      const r = L.parseHash(`#/vue/${code}`);
      assert.strictEqual(r.screen, 'vue');
      assert.strictEqual(r.domaine, code);
    });
    assert.strictEqual(L.parseHash('#/vue/DAP/Y4').cible, 'Y4');
  });

  await record('14 — headers de pages métier réutilisables', async () => {
    assert.ok(ui.includes('function pageHeaderHtml'));
    ['Centre de pilotage', 'Statistiques', 'Événements', 'Personnel', 'Rapports', 'Objectifs'].forEach((label) => assert.ok(ui.includes(label)));
  });

  await record('15 — logo SDIS noir via asset officiel', async () => {
    assert.ok(ui.includes('assets/img/LogoSDISseulnoir.png'));
    assert.ok(css.includes('.scope-page-sdis'));
    assert.ok(toml.includes('assets/img/LogoSDISseulnoir.png'));
  });

  await record('16 — logo SCOPE agrandi R2', async () => {
    assert.ok(css.includes('height: 48px'));
    assert.ok(html.includes('scope-ui-logic.js?v=scope-event-participation-ux-1'));
    assert.ok(html.includes('scope-charts.js?v=scope-design-2b') || html.includes('scope-charts.js?v=scope-design-2') || html.includes('scope-charts.js?v=scope-moa-ux-r2'));
    assert.ok(html.includes('scope.css?v=scope-design-2b') || html.includes('scope.css?v=scope-design-2') || html.includes('scope.css?v=scope-ux-event-1') || html.includes('scope.css?v=scope-ux-event-2') || html.includes('scope.css?v=scope-ux-event-3'));
    assert.ok(html.includes('scope-personnel-display.js?v=scope-table-sorting-visual-ux-2'));
    assert.ok(html.includes('scope-personnel-activity-modal.js?v=scope-personnel-status-ux-2a'));
    assert.ok(html.includes('scope-ui.js?v=scope-design-2b') || html.includes('scope-ui.js?v=scope-design-2') || html.includes('scope-ui.js?v=scope-ux-event-1') || html.includes('scope-ui.js?v=scope-ux-event-2') || html.includes('scope-ui.js?v=scope-ux-event-3'));
  });

  await record('17 — période hors header', async () => {
    assert.ok(ui.includes('periodContextHtml'));
    assert.ok(!/function headerHtml[\s\S]*scope-period-context/.test(ui));
  });

  await record('18 — bloc écarts de participation compact', async () => {
    assert.ok(charts.includes("dataset && dataset.id === 'domaines'"));
    assert.ok(charts.includes('const rowH = compact ? 30 : 44'));
    assert.ok(css.includes('[data-graph="domaines"]'));
  });

  await record('19 — terminologie Événements visible', async () => {
    assert.ok(ui.includes('Événements'));
    assert.ok(!ui.includes('>Exercices<'));
  });

  await record('20 — PDFKit AFM inclus dans bundle SCOPE', async () => {
    assert.ok(pkg.includes('"pdfkit"'));
    assert.ok(toml.includes('netlify/functions/data/**'));
    assert.ok(toml.includes('node_modules/pdfkit/js/data/**'));
    assert.ok(fs.existsSync(path.join(ROOT, 'netlify/functions/data/Helvetica.afm')));
    assert.ok(fs.existsSync(path.join(ROOT, 'node_modules/pdfkit/js/data/Helvetica.afm')));
  });

  await record('21 — RBAC navigation préservé', async () => {
    ['users:admin', 'settings:manage', 'references:manage', 'personnel:manage', 'events:create'].forEach((perm) => assert.ok(ui.includes(perm)));
  });

  await record('22 — TEST masqués et LEGACY inchangés', async () => {
    assert.ok(ui.includes('scope-include-qual'));
    assert.ok(logicSource.includes('isQualificationEvenement'));
    assert.ok(ui.includes('LEGACY exclu'));
  });

  await record('23 — responsive 1200/1024/800 présent', async () => {
    assert.ok(css.includes('@media (max-width: 1200px)'));
    assert.ok(css.includes('@media (max-width: 1024px)'));
    assert.ok(css.includes('@media (max-width: 800px)'));
    assert.ok(css.includes('min-height: 44px'));
  });

  await record('24 — accès production R1-R1 conservé sans CTA technique', async () => {
    assert.ok(!ui.includes('scope-start-live'));
    assert.ok(ui.includes('?mode=live'));
    assert.ok(!ui.includes('Aucun jeton'));
    assert.ok(ui.includes('scope-confirm-live'));
  });

  await record('25 — tableau Personnel métier définitif', async () => {
    const directory = ui.slice(ui.indexOf('function renderPersonnelDirectory'), ui.indexOf('function renderPersonnel(options)'));
    assert.ok(directory.includes("personnelSortHeader('nip', 'NIP')"));
    assert.ok(directory.includes("personnelSortHeader('oi', 'OI')"));
    assert.ok(directory.includes("personnelSortHeader('specializations', 'SPÉCIALISATIONS')"));
    assert.ok(directory.includes('data-label="OI"'));
    assert.ok(directory.includes('data-label="SPÉCIALISATIONS"'));
    assert.ok(directory.includes('data-label="NIP"'));
    assert.ok(directory.includes('data-label="PRÉNOM"'));
    assert.ok(directory.includes('personnelOtherAffectationsHtml'));
    assert.ok(directory.includes('scope-btn-small'));
    assert.ok(!directory.includes('Taux période'));
    assert.ok(!directory.includes('OI actuel'));
    assert.ok(!directory.includes('Affectation principale'));
    assert.ok(css.includes('.scope-person-table tbody tr:nth-child(even)'));
  });

  await record('26 — Personnel charge les fonctions nominatives', async () => {
    assert.ok(apiSource.includes('scope-personnel-list'));
    assert.ok(apiSource.includes('scope-personnel-detail'));
    assert.ok(apiSource.includes('scope-personnel-import-analyze'));
    assert.ok(apiSource.includes('scope-personnel-import-commit'));
    assert.ok(apiSource.includes('scope-personnel-effectif-at-date'));
    assert.ok(ui.includes('normalizePersonnelDirectory'));
    assert.ok(!/listPersonnelDirectory\(params\)\s*\{\s*return request\('GET', `\/personnel/.test(apiSource));
  });

  await record('27 — référentiels tolèrent scope_suivi_nominatif sans date_fin', async () => {
    const start = pgRepo.indexOf('async listSuiviNominatif()');
    const end = pgRepo.indexOf('async listCibles()', start);
    const block = pgRepo.slice(start, end);
    assert.ok(block.includes('information_schema.columns'));
    assert.ok(block.includes("existing.has('date_fin') ? 'date_fin' : 'null::date as date_fin'"));
    assert.ok(!block.includes('select * from scope_suivi_nominatif'));
  });

  console.log(`SCOPE-MOA-UX-R2: ${passed} PASS`);
})();
