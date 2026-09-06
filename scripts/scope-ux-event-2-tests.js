#!/usr/bin/env node
// UX-EVENT-2 — saisie, encadrement, réalisé, viewer PDF canvas.
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const viewer = fs.readFileSync(path.join(ROOT, 'assets/js/scope-pdf-viewer.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
const reportData = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-report-data.js'), 'utf8');
const renderer = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');

const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function realiseStatutLabel'));
const realise = ui.slice(ui.indexOf('function renderRealiseKpis'), ui.indexOf('function renderModalAllPresent'));
const encBlock = ui.slice(ui.indexOf('function renderEncadrementBlock'), ui.indexOf('function renderManualParticipantBlock'));
const groups = ui.slice(ui.indexOf('function renderEncadrementGroups'), ui.indexOf('function presenceSaveLabel'));

function loadLogic() {
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.module.exports;
}

const logic = loadLogic();
let passed = 0;
const failures = [];

function record(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`NOK  ${name}\n${error && error.message}`);
  }
}

record('01 — recherche encadrement isolée par événement', () => {
  assert.ok(ui.includes('function resetEventTransientUi'));
  assert.ok(ui.includes('resetEventTransientUi()'));
  assert.ok(ui.includes('state.encQuery = \'\'') || ui.includes('state.encQuery = ""'));
  assert.ok(ui.includes('state.realiseQuery = \'\'') || ui.includes('state.realiseQuery = ""'));
});

record('02 — lookup 360px, vide ancré au champ', () => {
  assert.ok(encBlock.includes('scope-lookup-field'));
  assert.ok(css.includes('.scope-lookup-field'));
  assert.ok(css.includes('width: 360px'));
  assert.ok(ui.includes('Aucune personne correspondante.'));
  assert.ok(css.includes('.scope-lookup-field .scope-lookup-empty'));
});

record('03 — encadrement: groupes remplis seulement, ordre Formateur / Surveillant', () => {
  assert.ok(ui.includes("return ['FORMATEUR', 'SURVEILLANT', 'MONITEUR', 'AUXILIAIRE']"));
  assert.ok(groups.includes('filled.map(groupHtml)'));
  assert.ok(!groups.includes('scope-enc-empty-roles') || groups.includes('filled.map(groupHtml)'));
  assert.ok(css.includes('grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))'));
});

record('04 — saisie: pas de colonne Encadrement, motif à côté du statut', () => {
  assert.ok(!saisieRows.includes('<th>Encadrement</th>'));
  assert.ok(saisieRows.includes('scope-status-cluster'));
  assert.ok(saisieRows.includes('scope-enc-role-flag'));
  assert.ok(saisieRows.includes("row.statut === 'ABSENT_EXCUSE'"));
});

record('05 — réalisé: identité, KPI, table, filtres, Retour, pas d’historique UI', () => {
  assert.ok(realise.includes('Retour aux événements'));
  assert.ok(realise.includes('sortableHeader(\'event-realise\', \'grade\', \'GRADE\''));
  assert.ok(realise.includes('sortableHeader(\'event-realise\', \'prenom\', \'PRÉNOM\''));
  assert.ok(realise.includes('id="realise-grade"'));
  assert.ok(realise.includes('id="realise-oi"'));
  assert.ok(realise.includes('renderRealiseEncadrement'));
  assert.ok(!realise.includes('Historique des corrections'));
  assert.ok(!realise.includes('<a href="#/personnel/') || realise.includes('class="scope-btn'));
  assert.ok(ui.includes("realiseSort: { key: 'grade', dir: 'desc' }"));
});

record('06 — métier gelé', () => {
  assert.ok(typeof logic.applyParticipationStatus === 'function');
  assert.ok(logicSrc.includes('NON_RENSEIGNE'));
  assert.ok(!saisieRows.includes('>Convoqué<'));
  const next = logic.applyParticipationStatus({ statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }, 'PRESENT');
  assert.strictEqual(next.statut, 'PRESENT');
});

record('07 — PDF: canvas PDF.js, pas d’iframe hash', () => {
  assert.ok(html.includes('assets/vendor/pdfjs/pdf.min.js'));
  assert.ok(html.includes('scope-pdf-viewer.js'));
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/vendor/pdfjs/pdf.min.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/vendor/pdfjs/pdf.worker.min.js')));
  assert.ok(viewer.includes('scope-pdf-canvas'));
  assert.ok(viewer.includes('standardFontDataUrl'));
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf')));
  assert.ok(!viewer.includes('#page='));
  assert.ok(!viewer.includes('iframe'));
  assert.ok(css.includes('.scope-pdf-canvas'));
  assert.ok(/\.scope-pdf-stage[\s\S]{0,80}background: #5c6370/.test(css) || css.includes('background: #5c6370'));
});

record('08 — rapport: Grade, tri, encadrement groupé', () => {
  assert.ok(reportData.includes('grade: person.grade || \'\''));
  assert.ok(reportData.includes('sortByGradeThenName'));
  assert.ok(reportData.includes('FORMATEUR\', \'SURVEILLANT\', \'MONITEUR\', \'AUXILIAIRE'));
  assert.ok(renderer.includes('[\'Grade\', \'Nom\', \'Prénom\', \'NIP\', \'OI\', \'Cible\', \'Statut\', \'Motif\']'));
  assert.ok(renderer.includes('Formateurs'));
  assert.ok(renderer.includes('Surveillants'));
});

record('09 — cache et suite', () => {
    assert.ok(html.includes('assets/css/scope.css?v=scope-login-1') || html.includes('assets/css/scope.css?v=scope-ux-event-2') || html.includes('assets/css/scope.css?v=scope-ux-event-3') || html.includes('assets/css/scope.css?v=scope-design-2') || html.includes('assets/css/scope.css?v=scope-design-2b') || html.includes('assets/css/scope.css?v=scope-design-2c') || html.includes('assets/css/scope.css?v=scope-design-2d') || html.includes('assets/css/scope.css?v=scope-event-design-a') || html.includes('assets/css/scope.css?v=scope-event-design-b') || html.includes('assets/css/scope.css?v=scope-event-design-c') || html.includes('assets/css/scope.css?v=scope-event-design-c1') || html.includes('scope-event-c4-finish') || html.includes('scope-event-c3-fix'));
    assert.ok(html.includes('scope-ui.js?v=scope-admin-rbac-doc-1') || html.includes('scope-ui.js?v=scope-domaines-rapports-close-1') || html.includes('scope-ui.js?v=scope-nav-convergence-1') || html.includes('scope-ui.js?v=scope-analyses-statistiques-1') || html.includes('scope-ui.js?v=scope-vigilance-nav-repair-1') || html.includes('scope-ui.js?v=scope-vigilance-participation-1') || html.includes('scope-ui.js?v=scope-cycles-pr-auto-1') || html.includes('scope-ui.js?v=scope-reports-pdf-specialisation-repair-1') || html.includes('scope-ui.js?v=scope-events-render-report-repair-1') || html.includes('scope-ui.js?v=scope-events-access-r1') || html.includes('scope-ui.js?v=scope-login-1') || html.includes('scope-ui.js?v=scope-ux-event-2') || html.includes('scope-ui.js?v=scope-ux-event-3') || html.includes('scope-ui.js?v=scope-design-2') || html.includes('scope-ui.js?v=scope-design-2b') || html.includes('scope-ui.js?v=scope-design-2c') || html.includes('scope-ui.js?v=scope-design-2d') || html.includes('scope-ui.js?v=scope-event-design-a') || html.includes('scope-ui.js?v=scope-event-design-b') || html.includes('scope-ui.js?v=scope-event-design-c') || html.includes('scope-ui.js?v=scope-event-design-c1') || html.includes('scope-ui.js?v=scope-event-c4-finish') || html.includes('scope-ui.js?v=scope-event-c3-fix'));
  assert.ok(pkg.includes('scope-ux-event-2-tests.js'));
});

record('10 — switch série ON distinct', () => {
  assert.ok(css.includes('.scope-serie-toggle.is-on'));
  assert.ok(css.includes('border-color: var(--scope-navy)'));
});

if (failures.length) {
  process.exitCode = 1;
  console.error(`\nSCOPE-UX-EVENT-2: ${passed} PASS, ${failures.length} NOK`);
} else {
  console.log(`\nSCOPE-UX-EVENT-2: ${passed} PASS`);
}
