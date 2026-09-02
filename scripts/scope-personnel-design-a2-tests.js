#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const display = require('../assets/js/scope-personnel-display.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');

const directory = ui.slice(ui.indexOf('function renderPersonnelDirectory'), ui.indexOf('function renderPersonnelHistoryPanel'));
const aCss = css.slice(css.indexOf('SCOPE-PERSONNEL-DESIGN-A'));
const colActions = aCss.match(/\.scope-personnel-list-table th:nth-child\(11\),[\s\S]*?\.scope-personnel-list-table td:nth-child\(11\) \{([^}]+)\}/);

function person(overrides) {
  return Object.assign({
    nip: '1',
    nom: 'A',
    prenom: 'B',
    grade: 'Sgt',
    affectationsOuvertes: [],
    affectations: []
  }, overrides || {});
}

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — recherche insensible aux accents et à la casse', () => {
  const grunig = person({ nip: '100', nom: 'Grünig', prenom: 'Thierry' });
  const leo = person({ nip: '101', nom: 'Martin', prenom: 'Léo' });
  const muller = person({ nip: '102', nom: 'Müller', prenom: 'Anne' });
  const rows = [grunig, leo, muller];
  assert.strictEqual(display.filterPersonnelRows(rows, { q: 'GRU' }).map((r) => r.nip).join(','), '100');
  assert.strictEqual(display.filterPersonnelRows(rows, { q: 'grunig' }).map((r) => r.nip).join(','), '100');
  assert.strictEqual(display.filterPersonnelRows(rows, { q: 'GRÜNIG' }).map((r) => r.nip).join(','), '100');
  assert.strictEqual(display.filterPersonnelRows(rows, { q: 'LEO' }).map((r) => r.nip).join(','), '101');
  assert.strictEqual(display.filterPersonnelRows(rows, { q: 'MULLER' }).map((r) => r.nip).join(','), '102');
  assert.strictEqual(grunig.nom, 'Grünig');
  assert.strictEqual(leo.prenom, 'Léo');
  assert.strictEqual(muller.nom, 'Müller');
});

record('02 — affichage conserve les accents', () => {
  assert.ok(directory.includes('escapeHtml(p.nom || \'—\')'));
  assert.ok(directory.includes('escapeHtml(p.prenom || \'—\')'));
  assert.ok(!directory.includes('foldSearchText(p.nom'));
  assert.ok(!directory.includes('foldSearchText(p.prenom'));
});

record('03 — ACTIONS largeur et alignement cohérents, Fiche et … visibles', () => {
  assert.ok(colActions, 'règle colonne ACTIONS manquante');
  assert.ok(colActions[1].includes('width: 1%'));
  assert.ok(colActions[1].includes('min-width: 9rem'));
  assert.ok(colActions[1].includes('text-align: center'));
  assert.ok(aCss.includes('justify-content: center'));
  assert.ok(directory.includes('scope-personnel-list-action'));
  assert.ok(directory.includes('>Fiche</a>'));
  assert.ok(directory.includes('data-personnel-more'));
  assert.ok(aCss.includes('overflow: visible'));
  assert.ok(aCss.includes('white-space: nowrap'));
  assert.ok(/scope-personnel-design-a2|scope-personnel-design-b/.test(html));
});

console.log(`SCOPE-PERSONNEL-DESIGN-A2: ${passed} PASS`);
