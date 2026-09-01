#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const refsSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-referentials.js'), 'utf8');

function loadRefs() {
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(refsSrc, sandbox);
  return sandbox.module.exports;
}

const refs = loadRefs();
const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function realiseStatutLabel'));
const saisie = ui.slice(ui.indexOf('function renderSaisie()'), ui.indexOf('function rowsForCible'));
const realise = ui.slice(ui.indexOf('function renderRealise()'), ui.indexOf('function renderModalAllPresent'));
const toolbar = ui.slice(ui.indexOf('function renderRealiseToolbar'), ui.indexOf('function renderRealiseEncadrement'));
const realiseEnc = ui.slice(ui.indexOf('function renderRealiseEncadrement'), ui.indexOf('function renderRealiseModals'));

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
  { grade: 'Flm 2', nomFamille: 'Zola', prenom: 'A', cible: 'C1', nip: '9' },
  { grade: 'JSP', nomFamille: 'Schuler', prenom: 'Nathan', cible: 'C1', nip: '7' },
  { grade: 'JSP', nomFamille: 'David', prenom: 'Samuel', cible: 'C1', nip: '1' },
  { grade: 'Flm 1', nomFamille: 'Martin', prenom: 'B', cible: 'C1', nip: '3' },
  { grade: 'JSP', nomFamille: 'Jaquet', prenom: 'Sylvain', cible: 'C1', nip: '4' }
];

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — réalisé: entêtes, Annuler absent, encadrement RO', () => {
  ['GRADE', 'NOM', 'PRÉNOM', 'NIP', 'INCORPORATION', 'CIBLE', 'STATUT'].forEach((label) => {
    assert.ok(realise.includes(`'${label}'`) || realise.includes(`>${label}<`), label);
  });
  assert.ok(realise.includes('<th>INFORMATIONS</th>'));
  assert.ok(realise.includes('<th>ACTION</th>'));
  assert.ok(!toolbar.includes('Annuler l’événement'));
  assert.ok(!realise.includes('Annuler l’événement'));
  assert.ok(realiseEnc.includes('readOnly: true'));
  assert.ok(!realiseEnc.includes('id="enc-q"'));
  assert.ok(!realiseEnc.includes('data-enc-remove'));
  assert.ok(toolbar.includes('id="reopen"'));
});

record('02 — tri Grade: noms ASC dans un grade DESC', () => {
  const desc = sortByGradeHierarchy(people, 'desc').map((row) => `${row.grade} ${row.nomFamille}`);
  assert.deepStrictEqual(desc, [
    'JSP David',
    'JSP Jaquet',
    'JSP Schuler',
    'Flm 1 Martin',
    'Flm 2 Zola'
  ]);
  assert.ok(ui.includes('return sortIdentityTieBreak(a, b)'));
});

record('03 — saisie: colonnes séparées, pas Personne, statut compact, toolbar unique', () => {
  assert.ok(!saisieRows.includes("'Personne'"));
  assert.ok(!saisieRows.includes('<th>Personne</th>'));
  assert.ok(saisieRows.includes("'GRADE'"));
  assert.ok(saisieRows.includes("'NOM'"));
  assert.ok(saisieRows.includes("'PRÉNOM'"));
  assert.ok(saisieRows.includes('data-label="GRADE"'));
  assert.ok(saisieRows.includes('data-label="NOM"'));
  assert.ok(saisieRows.includes('data-label="PRÉNOM"'));
  assert.ok(!saisieRows.includes('eventPersonLabel(row)'));
  assert.ok(saisieRows.includes('is-compact'));
  assert.ok(saisieRows.includes('data-status-group'));
  assert.ok(saisieRows.includes('scope-motif-compact'));
  assert.ok(ui.includes("classList.contains('is-compact')"));
  assert.strictEqual(saisie.split('id="save-part"').length - 1, 1);
  assert.ok(saisie.includes('renderEncadrementBlock()'));
});

record('04 — liste: Nouvel événement présent, cache C2', () => {
  assert.ok(ui.includes('id="scope-new"'));
  assert.ok(ui.includes('Nouvel événement'));
  assert.ok(css.includes('.scope-events-new'));
  assert.ok(html.includes('scope-event-design-c2'));
});

console.log(`SCOPE-EVENT-DESIGN-C2: ${passed} PASS`);
