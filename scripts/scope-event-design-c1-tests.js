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
const saisie = ui.slice(ui.indexOf('function renderSaisie()'), ui.indexOf('function rowsForCible'));
const encBlock = ui.slice(ui.indexOf('function renderEncadrementBlock'), ui.indexOf('function renderManualParticipantBlock'));
const groups = ui.slice(ui.indexOf('function renderEncadrementGroups'), ui.indexOf('function presenceSaveLabel'));
const toolbar = ui.slice(ui.indexOf('function renderRealiseToolbar'), ui.indexOf('function renderRealiseEncadrement'));
const realiseEnc = ui.slice(ui.indexOf('function renderRealiseEncadrement'), ui.indexOf('function renderRealiseModals'));
const realise = ui.slice(ui.indexOf('function renderRealise()'), ui.indexOf('function renderModalAllPresent'));
const gradeSort = ui.slice(ui.indexOf('function sortIdentityTieBreak'), ui.indexOf('function sortSaisieRows'));

function sortByGradeHierarchy(rows, dir) {
  const factor = dir === 'desc' ? -1 : 1;
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  const txt = (value) => String(value == null ? '' : value);
  return (rows || []).slice().sort((a, b) => {
    const ga = refs.gradeRank(a && a.grade);
    const gb = refs.gradeRank(b && b.grade);
    if (ga !== gb) return (ga - gb) * factor;
    const nom = collator.compare(txt(a && (a.nomFamille || a.nom)), txt(b && (b.nomFamille || b.nom)));
    if (nom) return nom;
    const prenom = collator.compare(txt(a && a.prenom), txt(b && b.prenom));
    if (prenom) return prenom;
    const oi = collator.compare(txt(a && a.cible), txt(b && b.cible));
    if (oi) return oi;
    return collator.compare(txt(a && a.nip), txt(b && b.nip));
  });
}

const people = [
  { grade: 'Flm 1', nomFamille: 'Bernard', prenom: 'A', cible: 'C1', nip: '2' },
  { grade: 'JSP', nomFamille: 'Schuler', prenom: 'Nathan', cible: 'C1', nip: '7' },
  { grade: 'JSP', nomFamille: 'David', prenom: 'Samuel', cible: 'C1', nip: '1' },
  { grade: 'Flm 1', nomFamille: 'Albert', prenom: 'B', cible: 'C1', nip: '3' },
  { grade: 'JSP', nomFamille: 'Jaquet', prenom: 'Sylvain', cible: 'C1', nip: '4' }
];

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — saisie: encadrement éditable', () => {
  assert.ok(saisie.includes('renderEncadrementBlock()'));
  assert.ok(encBlock.includes('id="enc-q"'));
  assert.ok(encBlock.includes('id="enc-add"'));
  assert.ok(encBlock.includes('id="enc-role"'));
  assert.ok(encBlock.includes('Formateur'));
  assert.ok(encBlock.includes('Moniteur'));
  assert.ok(encBlock.includes('Surveillant'));
  assert.ok(encBlock.includes('Auxiliaire'));
  assert.ok(encBlock.includes('readOnly: false'));
  assert.ok(groups.includes('data-enc-remove'));
  assert.ok(encBlock.includes('data-enc-editable="true"'));
});

record('02 — réalisé: encadrement lecture seule, sans annulation', () => {
  assert.ok(realise.includes('renderRealiseEncadrement'));
  assert.ok(realiseEnc.includes('Encadrement'));
  assert.ok(realiseEnc.includes('readOnly: true'));
  assert.ok(realiseEnc.includes('data-enc-readonly="true"'));
  assert.ok(!realiseEnc.includes('id="enc-q"'));
  assert.ok(!realiseEnc.includes('id="enc-add"'));
  assert.ok(!realiseEnc.includes('data-enc-remove'));
  assert.ok(!toolbar.includes('Annuler l’événement'));
  assert.ok(!toolbar.includes('id="cancel-event"'));
  assert.ok(!realise.includes('Annuler l’événement'));
  assert.ok(!realise.includes('id="enc-q"'));
  assert.ok(!realise.includes('id="enc-add"'));
  assert.ok(toolbar.includes('id="reopen"'));
  assert.ok(toolbar.includes('Retour aux événements'));
  assert.ok(toolbar.includes('data-report-event') || toolbar.includes('reportButton'));
});

record('03 — une seule toolbar saisie', () => {
  assert.strictEqual(saisie.split('id="save-part"').length - 1, 1);
  assert.strictEqual(saisie.split('id="all-present"').length - 1, 1);
  assert.strictEqual(saisie.split('id="cloturer"').length - 1, 1);
});

record('04 — tri Grade: hiérarchie inversée, Nom ASC dans le grade', () => {
  assert.ok(gradeSort.includes('if (ga !== gb) return (ga - gb) * factor'));
  assert.ok(gradeSort.includes('return sortIdentityTieBreak(a, b)'));
  assert.ok(!gradeSort.includes('sortIdentityTieBreak(a, b) * factor'));
  const asc = sortByGradeHierarchy(people, 'asc').map((row) => `${row.grade} ${row.nomFamille}`);
  const desc = sortByGradeHierarchy(people, 'desc').map((row) => `${row.grade} ${row.nomFamille}`);
  assert.deepStrictEqual(asc, [
    'Flm 1 Albert',
    'Flm 1 Bernard',
    'JSP David',
    'JSP Jaquet',
    'JSP Schuler'
  ]);
  assert.deepStrictEqual(desc, [
    'JSP David',
    'JSP Jaquet',
    'JSP Schuler',
    'Flm 1 Albert',
    'Flm 1 Bernard'
  ]);
  assert.ok(html.includes('scope-event-design-c1') || html.includes('scope-event-design-c2'));
});

console.log(`SCOPE-EVENT-DESIGN-C1: ${passed} PASS`);
