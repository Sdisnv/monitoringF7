#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');

const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function realiseStatutLabel'));
const statutTd = saisieRows.slice(saisieRows.indexOf('data-label="STATUT"'), saisieRows.indexOf('data-label="INFORMATIONS"'));
const infoTd = saisieRows.slice(saisieRows.indexOf('data-label="INFORMATIONS"'), saisieRows.indexOf('</tr>`'));
const saisieCssStart = css.lastIndexOf('.scope-saisie-table {');
const saisieCss = css.slice(saisieCssStart, css.indexOf('.scope-status-cluster', saisieCssStart));
const c4Css = css.slice(css.indexOf('SCOPE-EVENT-C4-FINISH'));
const motifCompactCss = css.slice(
  css.indexOf('.scope-justificatif-cell .scope-motif-compact {'),
  css.indexOf('.scope-justificatif-cell .scope-motif-compact:focus-visible')
);

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — motif Excusé hors STATUT, dans INFORMATIONS', () => {
  assert.ok(statutTd.includes('scope-status-cluster'));
  assert.ok(statutTd.includes('data-status-group'));
  assert.ok(!statutTd.includes('motifControl(row)'));
  assert.ok(!statutTd.includes('scope-motif-compact'));
  assert.ok(infoTd.includes('justificatifCell(row)'));
  assert.ok(saisieRows.includes('return [motifControl(row), comment, why, manual]'));
  assert.ok(saisieRows.includes("row.statut !== 'ABSENT_EXCUSE'"));
});

record('02 — motif compact = texte, pas badge', () => {
  assert.ok(saisieRows.includes('scope-motif-compact'));
  assert.ok(motifCompactCss.includes('background: transparent'));
  assert.ok(motifCompactCss.includes('border: 0'));
  assert.ok(motifCompactCss.includes('font-weight: 400'));
  assert.ok(motifCompactCss.includes('color: var(--scope-ink)'));
  assert.ok(!motifCompactCss.includes('warning-soft'));
  assert.ok(!motifCompactCss.includes('#ead9b5'));
});

record('03 — statut compact + réouverture inchangés', () => {
  assert.ok(saisieRows.includes("filled ? 'is-compact' : 'is-open'"));
  assert.ok(css.includes('.scope-status-control-group.is-compact .scope-status-control:not(.is-selected)'));
  assert.ok(css.includes('.scope-status-control-group.is-compact:hover .scope-status-control'));
  assert.ok(css.includes('.scope-status-control-group.is-compact:focus-within .scope-status-control'));
  assert.ok(css.includes('.scope-status-control-group.is-open .scope-status-control'));
});

record('04 — contours statut non coupés + 7 colonnes', () => {
  assert.ok(c4Css.includes('overflow: visible'));
  assert.ok(c4Css.includes('padding: 8px 10px'));
  assert.ok(c4Css.includes('min-height: 44px'));
  assert.ok(saisieCss.includes('table-layout: auto'));
  assert.ok(saisieCss.includes('nth-child(6)'));
  assert.ok(saisieCss.includes('nth-child(7)'));
  assert.ok(!/width:\s*25%;[\s\S]{0,220}width:\s*8%;[\s\S]{0,220}width:\s*10%;[\s\S]{0,220}width:\s*36%;[\s\S]{0,220}width:\s*21%;/.test(css));
  const thead = saisieRows.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/);
  const labels = [...thead[1].matchAll(/sortableHeader\('event-personnel', '[^']+', '([^']+)'/g)].map((m) => m[1]);
  const plain = [...thead[1].matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1]);
  assert.deepStrictEqual(labels.concat(plain), ['GRADE', 'NOM', 'PRÉNOM', 'NIP', 'CIBLE', 'STATUT', 'INFORMATIONS']);
});

record('05 — liens internes: repos / hover / focus / visited', () => {
  assert.ok(c4Css.includes('.scope-app a:not(.scope-btn):link'));
  assert.ok(c4Css.includes('.scope-app a:not(.scope-btn):visited'));
  assert.ok(c4Css.includes('color: inherit'));
  assert.ok(c4Css.includes('.scope-events-libelle:hover'));
  assert.ok(c4Css.includes('color: var(--scope-red)'));
  assert.ok(c4Css.includes('.scope-events-libelle:focus-visible'));
  assert.ok(c4Css.includes('outline: 2px solid var(--scope-red)'));
  assert.ok(!css.includes('.scope-events-libelle:hover {\n  color: var(--scope-red);\n  text-decoration: underline;'));
  assert.ok(html.includes('scope-event-c4-finish'));
});

console.log(`SCOPE-EVENT-C4-FINISH: ${passed} PASS`);
