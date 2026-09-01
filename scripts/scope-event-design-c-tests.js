#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const refsSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-referentials.js'), 'utf8');

function loadRefs() {
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(refsSrc, sandbox);
  return sandbox.module.exports;
}

const refs = loadRefs();
let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — Grade Nom Prénom', () => {
  const fn = ui.slice(ui.indexOf('function eventPersonLabel'), ui.indexOf('function gradeRank'));
  assert.ok(fn.includes('person.grade'));
  assert.ok(fn.includes('person.nomFamille || person.nom'));
  assert.ok(fn.includes('person.prenom'));
  assert.ok(fn.indexOf('person.grade') < fn.indexOf('person.nomFamille'));
  assert.ok(fn.indexOf('person.nomFamille') < fn.indexOf('person.prenom'));
  assert.ok(!fn.includes('person.grade, person.prenom'));
});

record('02 — hiérarchie Recrue → Flm 3 → Flm 2 → Flm 1 → JSP', () => {
  const codes = refs.GRADE_CODES_ASC;
  const rec = codes.indexOf('Rec');
  assert.ok(rec >= 0);
  assert.deepStrictEqual(Array.from(codes.slice(rec, rec + 5)), ['Rec', 'Flm 3', 'Flm 2', 'Flm 1', 'JSP']);
  assert.ok(refs.compareGrades('Rec', 'Flm 3') < 0);
  assert.ok(refs.compareGrades('Flm 3', 'Flm 2') < 0);
  assert.ok(refs.compareGrades('Flm 2', 'Flm 1') < 0);
  assert.ok(refs.compareGrades('Flm 1', 'JSP') < 0);
  assert.strictEqual(refs.gradeRank('Rec'), codes.indexOf('Rec'));
  assert.strictEqual(refs.GRADES.find((row) => row.code === 'Rec').rang, codes.indexOf('Rec'));
});

record('03 — tri Grade puis Nom Prénom Incorporation', () => {
  const sortFn = ui.slice(ui.indexOf('function sortRealiseRows'), ui.indexOf('function renderRealiseKpis'));
  assert.ok(sortFn.includes("key: 'grade'"));
  assert.ok(sortFn.includes("key: 'nom'"));
  assert.ok(sortFn.includes("key: 'prenom'"));
  assert.ok(sortFn.includes("key: 'oi'"));
  assert.ok(sortFn.includes('gradeRank'));
});

record('04 — une seule toolbar saisie', () => {
  const saisie = ui.slice(ui.indexOf('function renderSaisie()'), ui.indexOf('function rowsForCible'));
  const save = saisie.split('id="save-part"').length - 1;
  const allPresent = saisie.split('id="all-present"').length - 1;
  const cloturer = saisie.split('id="cloturer"').length - 1;
  assert.strictEqual(save, 1);
  assert.strictEqual(allPresent, 1);
  assert.strictEqual(cloturer, 1);
  assert.ok(ui.includes('Participants'));
  assert.ok(html.includes('scope-event-design-c'));
});

console.log(`SCOPE-EVENT-DESIGN-C: ${passed} PASS`);
