#!/usr/bin/env node
// UX-EVENT-1 — refonte visuelle fiche / saisie / encadrement (structure).
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');

const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function renderRealise'));
const encBlock = ui.slice(ui.indexOf('function renderEncadrementBlock'), ui.indexOf('function renderManualParticipantBlock'));
const eventCssStart = css.indexOf('/* === UX-EVENT-1');
const eventCss = eventCssStart >= 0 ? css.slice(eventCssStart) : '';

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

record('01 — aucun bouton Convoqué dans l’UI saisie', () => {
  assert.ok(!saisieRows.includes('Convoqué'));
  assert.ok(!saisieRows.includes('is-convoque'));
  assert.ok(logicSrc.includes('NON_RENSEIGNE'));
  assert.ok(ui.includes("next.statut = 'NON_RENSEIGNE'") || logicSrc.includes("next.statut = 'NON_RENSEIGNE'"));
});

record('02 — NON_RENSEIGNE toujours supporté techniquement', () => {
  const c = logic.liveCounters([
    { inclus: true, role: 'PARTICIPANT', statut: 'NON_RENSEIGNE' },
    { inclus: true, role: 'PARTICIPANT', statut: 'PRESENT' }
  ]);
  assert.strictEqual(c.open, 1);
  assert.ok(logicSrc.includes("'NON_RENSEIGNE'"));
});

record('03 — aucun radius 999 sur statut/motif saisie', () => {
  assert.ok(!saisieRows.includes('scope-status-chip'));
  assert.ok(!saisieRows.includes('scope-motif-chip'));
  assert.ok(eventCss.includes('border-radius: var(--scope-radius-xs)'));
  assert.ok(!/scope-motif-select[^{]*\{[^}]*999/.test(eventCss));
  assert.ok(!/scope-event-saisie \.scope-status-row button[^{]*\{[^}]*999/.test(eventCss));
});

record('04 — StatusControl segmented 28px / rayon 3', () => {
  assert.ok(saisieRows.includes('scope-segmented'));
  assert.ok(saisieRows.includes('scope-status-control'));
  assert.ok(saisieRows.includes('role="radiogroup"'));
  assert.ok(saisieRows.includes('aria-checked='));
  assert.ok(css.includes('--scope-h-compact: 28px') || css.includes('--scope-h-compact:28px'));
  assert.ok(css.includes('--scope-radius-xs: 3px') || css.includes('--scope-radius-xs:3px'));
  assert.ok(eventCss.includes('height: var(--scope-h-compact)'));
});

record('05 — motif select conditionnel', () => {
  assert.ok(saisieRows.includes('scope-motif-select'));
  assert.ok(saisieRows.includes('data-motif'));
  assert.ok(saisieRows.includes("row.statut === 'ABSENT_EXCUSE'"));
  assert.ok(eventCss.includes('max-height: 32px'));
});

record('06 — KPI strip une ligne, encadrement hors KPI', () => {
  const kpis = ui.slice(ui.indexOf('function renderPresenceKpis'), ui.indexOf('function sortSaisieRows'));
  assert.ok(kpis.includes('scope-kpi-strip is-line') || kpis.includes('scope-kpi-strip is-metrics is-line'));
  assert.ok(!kpis.includes('renderKpiCard'));
  assert.ok(!kpis.includes('encCount'));
  assert.ok(ui.includes("item('Attendus'") || kpis.includes("'Attendus'"));
});

record('07 — encadrement groupé par rôle', () => {
  assert.ok(ui.includes('const byRole = new Map'));
  assert.ok(ui.includes('encadrementRolesForEvent'));
  assert.ok(ui.includes('scope-enc-role-title'));
  assert.ok(ui.includes('FORMATEUR'));
  assert.ok(ui.includes('AUXILIAIRE'));
});

record('08 — tri encadrement grade / nom / prénom', () => {
  const sortFn = ui.slice(ui.indexOf('function sortPeopleForEncadrement'), ui.indexOf('function buildSaisieFromFiche'));
  assert.ok(sortFn.includes('gradeRank'));
  assert.ok(sortFn.includes('nomFamille'));
  assert.ok(sortFn.includes('prenom'));
  assert.ok(encBlock.includes('sortPeopleForEncadrement'));
});

record('09 — ajout participant compact', () => {
  const manual = ui.slice(ui.indexOf('function renderManualParticipantBlock'), ui.indexOf('function renderSaisieQuantitative'));
  assert.ok(manual.includes('Ajouter un participant à cet événement'));
  assert.ok(!manual.includes('scope-card scope-manual-participant-card'));
  assert.ok(ui.includes('id="manual-person-q"'));
  assert.ok(ui.includes('scope-presence-toolbar'));
});

record('10 — table conservée à viewport étroit', () => {
  assert.ok(eventCss.includes('scope-event-saisie .scope-table thead'));
  assert.ok(eventCss.includes('display: table-header-group'));
  assert.ok(eventCss.includes('content: none'));
  assert.ok(saisieRows.includes('scope-table-scroll'));
  assert.ok(saisieRows.includes('scope-table scope-saisie-table'));
});

record('11 — rôle visible sans dépendre du NIP', () => {
  assert.ok(ui.includes('scope-enc-role-title'));
  assert.ok(ui.includes('scope-enc-name'));
  assert.ok(ui.includes('NIP '));
  assert.ok(saisieRows.includes('scope-enc-role-flag'));
});

record('12 — focus clavier StatusControl', () => {
  assert.ok(css.includes('.scope-status-control:focus-visible'));
  assert.ok(css.includes('outline: var(--scope-focus-ring)'));
  assert.ok(saisieRows.includes('role="radio"'));
});

record('13 — cache et suite branchées', () => {
  assert.ok(html.includes('assets/css/scope.css?v=scope-ux-event-1') || html.includes('assets/css/scope.css?v=scope-ux-event-2'));
  assert.ok(html.includes('scope-ui.js?v=scope-ux-event-1') || html.includes('scope-ui.js?v=scope-ux-event-2'));
  assert.ok(pkg.includes('scope-ux-event-1-tests.js'));
});

record('14 — métier gelé: applyParticipationStatus / payload / motifs', () => {
  assert.ok(typeof logic.applyParticipationStatus === 'function');
  assert.ok(typeof logic.buildPresenceSavePayload === 'function');
  assert.ok(typeof logic.applyExcuseMotif === 'function');
  const next = logic.applyParticipationStatus({ statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }, 'PRESENT');
  assert.strictEqual(next.statut, 'PRESENT');
  const open = logic.applyParticipationStatus({ statut: 'PRESENT', role: 'PARTICIPANT' }, 'PRESENT');
  assert.strictEqual(open.statut, 'NON_RENSEIGNE');
});

if (failures.length) {
  process.exitCode = 1;
  console.error(`\nSCOPE-UX-EVENT-1: ${passed} PASS, ${failures.length} NOK`);
} else {
  console.log(`\nSCOPE-UX-EVENT-1: ${passed} PASS`);
}
