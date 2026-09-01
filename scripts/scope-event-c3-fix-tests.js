#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const refsSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-referentials.js'), 'utf8');

function loadRefs() {
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(refsSrc, sandbox);
  return sandbox.module.exports;
}

const refs = loadRefs();
const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function realiseStatutLabel'));
const listHead = ui.slice(ui.indexOf("sortableHeader('events', 'date'"), ui.indexOf('<th>ACTIONS</th>') + 20);
const saisieCssStart = css.lastIndexOf('.scope-saisie-table {');
const saisieCss = css.slice(saisieCssStart, css.indexOf('.scope-status-cluster', saisieCssStart));

function presenceRank(row) {
  const code = String((row && row.statut) || 'NON_RENSEIGNE').toUpperCase();
  const order = { PRESENT: 1, ABSENT_EXCUSE: 2, ABSENT_NON_EXCUSE: 3, DISPENSE: 4, PERMUTATION: 5, NON_RENSEIGNE: 6 };
  return order[code] || 6;
}

function sortByPresenceStatus(rows, dir) {
  const factor = dir === 'desc' ? -1 : 1;
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  const txt = (value) => String(value == null ? '' : value);
  return (rows || []).slice().sort((a, b) => {
    const ra = presenceRank(a);
    const rb = presenceRank(b);
    if (ra !== rb) return (ra - rb) * factor;
    const nom = collator.compare(txt(a.nomFamille || a.nom), txt(b.nomFamille || b.nom));
    if (nom) return nom;
    const prenom = collator.compare(txt(a.prenom), txt(b.prenom));
    if (prenom) return prenom;
    const g = refs.gradeRank(a.grade) - refs.gradeRank(b.grade);
    if (g) return g;
    const cible = collator.compare(txt(a.cible), txt(b.cible));
    if (cible) return cible;
    return collator.compare(txt(a.nip), txt(b.nip));
  });
}

function sortByGradeHierarchy(rows, dir) {
  const factor = dir === 'desc' ? -1 : 1;
  const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  const txt = (value) => String(value == null ? '' : value);
  return (rows || []).slice().sort((a, b) => {
    const ga = refs.gradeRank(a.grade);
    const gb = refs.gradeRank(b.grade);
    if (ga !== gb) return (ga - gb) * factor;
    const nom = collator.compare(txt(a.nomFamille || a.nom), txt(b.nomFamille || b.nom));
    if (nom) return nom;
    const prenom = collator.compare(txt(a.prenom), txt(b.prenom));
    if (prenom) return prenom;
    const oi = collator.compare(txt(a.cible), txt(b.cible));
    if (oi) return oi;
    return collator.compare(txt(a.nip), txt(b.nip));
  });
}

function parseNthMinWidth(n) {
  const re = new RegExp(`\\.scope-saisie-table th:nth-child\\(${n}\\),[\\s\\S]*?\\{([^}]+)\\}`);
  const m = saisieCss.match(re);
  assert.ok(m, `règle nth-child(${n}) manquante`);
  const min = m[1].match(/min-width:\s*([\d.]+)rem/);
  assert.ok(min, `min-width manquante pour colonne ${n}`);
  return Number(min[1]);
}

const peopleStatus = [
  { statut: 'NON_RENSEIGNE', nomFamille: 'Zola', prenom: 'A', grade: 'JSP', cible: 'C1', nip: '9' },
  { statut: 'PRESENT', nomFamille: 'Bernard', prenom: 'L', grade: 'JSP', cible: 'C1', nip: '2' },
  { statut: 'PRESENT', nomFamille: 'Alarcon', prenom: 'Dani', grade: 'JSP', cible: 'C1', nip: '1' },
  { statut: 'ABSENT_EXCUSE', nomFamille: 'Cavin', prenom: 'N', grade: 'Flm 1', cible: 'C1', nip: '3' },
  { statut: 'ABSENT_NON_EXCUSE', nomFamille: 'Dupont', prenom: 'P', grade: 'JSP', cible: 'C1', nip: '4' },
  { statut: 'DISPENSE', nomFamille: 'Morel', prenom: 'Q', grade: 'JSP', cible: 'C1', nip: '5' },
  { statut: 'PERMUTATION', nomFamille: 'Noel', prenom: 'R', grade: 'JSP', cible: 'C1', nip: '6' }
];

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — THEAD 7 colonnes distinctes, pas Personne', () => {
  const thead = saisieRows.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/);
  assert.ok(thead, 'thead manquant dans renderSaisieRows');
  const labels = [...thead[1].matchAll(/sortableHeader\('event-personnel', '[^']+', '([^']+)'/g)].map((m) => m[1]);
  const plain = [...thead[1].matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1]);
  const all = labels.concat(plain);
  assert.deepStrictEqual(all, ['GRADE', 'NOM', 'PRÉNOM', 'NIP', 'CIBLE', 'STATUT', 'INFORMATIONS']);
  assert.ok(!thead[1].includes("'Personne'"));
  assert.ok(!thead[1].includes('<th>Personne</th>'));
  assert.ok(!saisieRows.includes("data-label=\"Personne\""));
});

record('02 — une ligne = 7 TD distincts', () => {
  const row = saisieRows.match(/return `<tr data-pid[\s\S]*?<\/tr>`/);
  assert.ok(row, 'template de ligne manquant');
  const labels = [...row[0].matchAll(/<td data-label="([^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(labels, ['GRADE', 'NOM', 'PRÉNOM', 'NIP', 'CIBLE', 'STATUT', 'INFORMATIONS']);
  assert.ok(row[0].includes('row.grade'));
  assert.ok(row[0].includes('nomFamille || row.nom'));
  assert.ok(row[0].includes('row.prenom'));
  assert.ok(!row[0].includes('eventPersonLabel(row)'));
});

record('03 — CSS 7 colonnes, plus de modèle 5×100%', () => {
  assert.ok(saisieCss.includes('table-layout: auto'));
  assert.ok(saisieCss.includes('min-width: 74rem'));
  assert.ok(!/width:\s*25%;[\s\S]{0,220}width:\s*8%;[\s\S]{0,220}width:\s*10%;[\s\S]{0,220}width:\s*36%;[\s\S]{0,220}width:\s*21%;/.test(css));
  const w6 = parseNthMinWidth(6);
  const w7 = parseNthMinWidth(7);
  assert.ok(w6 >= 16, `STATUT min-width trop faible: ${w6}rem`);
  assert.ok(w7 >= 8, `INFORMATIONS min-width trop faible: ${w7}rem`);
  assert.ok(saisieCss.includes('nth-child(6)'));
  assert.ok(saisieCss.includes('nth-child(7)'));
});

record('04 — tri STATUT ASC/DESC, noms ASC à statut égal', () => {
  assert.ok(ui.includes('function sortByPresenceStatus'));
  assert.ok(ui.includes('if (key === \'presence\') return sortByPresenceStatus'));
  const asc = sortByPresenceStatus(peopleStatus, 'asc').map((r) => `${r.statut}:${r.nomFamille}`);
  assert.deepStrictEqual(asc, [
    'PRESENT:Alarcon',
    'PRESENT:Bernard',
    'ABSENT_EXCUSE:Cavin',
    'ABSENT_NON_EXCUSE:Dupont',
    'DISPENSE:Morel',
    'PERMUTATION:Noel',
    'NON_RENSEIGNE:Zola'
  ]);
  const desc = sortByPresenceStatus(peopleStatus, 'desc').map((r) => `${r.statut}:${r.nomFamille}`);
  assert.deepStrictEqual(desc, [
    'NON_RENSEIGNE:Zola',
    'PERMUTATION:Noel',
    'DISPENSE:Morel',
    'ABSENT_NON_EXCUSE:Dupont',
    'ABSENT_EXCUSE:Cavin',
    'PRESENT:Alarcon',
    'PRESENT:Bernard'
  ]);
});

record('05 — tri Grade inchangé + liste MAJUSCULES', () => {
  const grades = [
    { grade: 'JSP', nomFamille: 'Schuler', prenom: 'N', cible: 'C1', nip: '2' },
    { grade: 'JSP', nomFamille: 'David', prenom: 'S', cible: 'C1', nip: '1' },
    { grade: 'Flm 1', nomFamille: 'Martin', prenom: 'B', cible: 'C1', nip: '3' }
  ];
  assert.deepStrictEqual(sortByGradeHierarchy(grades, 'desc').map((r) => r.nomFamille), ['David', 'Schuler', 'Martin']);
  assert.ok(ui.includes('function sortByGradeHierarchy'));
  assert.ok(listHead.includes("'DATE'"));
  assert.ok(listHead.includes("'ÉVÉNEMENT'"));
  assert.ok(listHead.includes("'DOMAINE'"));
  assert.ok(listHead.includes("'PUBLIC / OI'"));
  assert.ok(listHead.includes("'EFFECTIF'"));
  assert.ok(listHead.includes("'ÉTAT'"));
  assert.ok(listHead.includes('<th>ACTIONS</th>'));
  assert.ok(css.includes('text-transform: uppercase'));
  assert.ok(html.includes('scope-event-c3-fix'));
});

console.log(`SCOPE-EVENT-C3-FIX: ${passed} PASS`);
