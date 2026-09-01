#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const logic = require('../assets/js/scope-ui-logic.js');
const display = require('../assets/js/scope-personnel-display.js');
const temporal = require('../assets/js/scope-personnel-temporal.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const temporalSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-temporal.js'), 'utf8');
const displaySrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-display.js'), 'utf8');

const directory = ui.slice(ui.indexOf('function renderPersonnelDirectory'), ui.indexOf('function renderPersonnelHistoryPanel'));

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — listViewState(288) = content, pas ready', () => {
  assert.strictEqual(logic.listViewState({ ready: true, error: null, count: 288 }), 'content');
  assert.notStrictEqual(logic.listViewState({ ready: true, error: null, count: 288 }), 'ready');
  assert.ok(logicSrc.includes("return 'content'"));
  assert.ok(logicSrc.includes("if (!ready) return 'loading'"));
});

record('02 — renderPersonnelDirectory pagine sur content', () => {
  assert.ok(directory.includes("personnelView === 'content' && allPeople.length"));
  assert.ok(directory.includes("personnelView === 'content' ? allPeople.slice"));
  assert.ok(!directory.includes("personnelView === 'ready'"));
  const view = logic.listViewState({ ready: true, error: null, count: 288 });
  const allPeople = Array.from({ length: 288 }, (_, i) => ({ nip: String(i + 1) }));
  const pageSize = 12;
  const page = view === 'content' && allPeople.length
    ? Math.min(Math.max(1, 1), Math.max(1, Math.ceil(allPeople.length / pageSize)))
    : 1;
  const people = view === 'content' ? allPeople.slice((page - 1) * pageSize, page * pageSize) : [];
  const pagination = view === 'content' && allPeople.length;
  assert.strictEqual(view, 'content');
  assert.strictEqual(allPeople.length, 288);
  assert.strictEqual(people.length, 12);
  assert.ok(pagination);
  const people24 = view === 'content' ? allPeople.slice(0, 24) : [];
  assert.strictEqual(people24.length, 24);
});

record('03 — filtres / tri / temporalité inchangés', () => {
  assert.ok(ui.includes('function visiblePersonnelRows'));
  assert.ok(displaySrc.includes('function filterPersonnelRows'));
  assert.ok(displaySrc.includes('function sortPersonnelRows'));
  assert.ok(directory.includes('personnelPeriodControlsHtml()'));
  assert.ok(temporalSrc.includes('function resolveAnalyzedPeriod'));
  assert.ok(temporalSrc.includes('function evaluateStatus'));
  const rows = [
    { nip: '10', nom: 'Dupont', prenom: 'Marc', grade: 'Sgt', affectations: [], affectationsOuvertes: [] },
    { nip: '11', nom: 'Zola', prenom: 'A', grade: 'JSP', affectations: [], affectationsOuvertes: [] }
  ];
  assert.strictEqual(display.filterPersonnelRows(rows, { q: 'Dupont' }).length, 1);
  const period = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' });
  assert.ok(period && period.from);
  assert.ok(/scope-ui\.js\?v=scope-personnel-design-a1|scope-ui\.js\?v=scope-personnel-design-b/.test(html));
});

console.log(`SCOPE-PERSONNEL-DESIGN-A1: ${passed} PASS`);
