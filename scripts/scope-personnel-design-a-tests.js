#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const display = require('../assets/js/scope-personnel-display.js');
const refs = require('../assets/js/scope-personnel-referentials.js');
const temporal = require('../assets/js/scope-personnel-temporal.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const displaySrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-display.js'), 'utf8');
const temporalSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-personnel-temporal.js'), 'utf8');

const directory = ui.slice(ui.indexOf('function renderPersonnelDirectory'), ui.indexOf('function renderPersonnelHistoryPanel'));
const c4Css = css.slice(css.indexOf('SCOPE-EVENT-C4-FINISH'));
const aCss = css.slice(css.indexOf('SCOPE-PERSONNEL-DESIGN-A'));

function person(overrides, assignments) {
  return Object.assign({
    nip: '1',
    nom: 'A',
    prenom: 'B',
    grade: 'Sgt',
    affectationsOuvertes: assignments || [],
    affectations: assignments || []
  }, overrides || {});
}

let passed = 0;
function record(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

record('01 — entêtes MAJUSCULES + GRADE/NOM/PRÉNOM séparés', () => {
  const thead = directory.match(/<thead><tr>([\s\S]*?)<\/tr><\/thead>/);
  assert.ok(thead);
  const labels = [...thead[1].matchAll(/personnelSortHeader\('[^']+', '([^']+)'/g)].map((m) => m[1]);
  const plain = [...thead[1].matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1]);
  assert.deepStrictEqual(labels.concat(plain), [
    'GRADE', 'NOM', 'PRÉNOM', 'NIP', 'OI / INCORPORATION', 'SPÉCIALISATION', 'STATUT', 'DATE ACTIF', 'DATE INACTIF', 'ACTIONS'
  ]);
  assert.ok(directory.includes('data-label="GRADE"'));
  assert.ok(directory.includes('data-label="NOM"'));
  assert.ok(directory.includes('data-label="PRÉNOM"'));
  assert.ok(!directory.includes('<th>Personne</th>'));
  assert.ok(!directory.includes('eventPersonLabel'));
  const row = directory.match(/return `<tr>[\s\S]*?<\/tr>`/);
  const tdOrder = [...row[0].matchAll(/data-label="([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(tdOrder[0], 'GRADE');
  assert.strictEqual(tdOrder[1], 'NOM');
  assert.strictEqual(tdOrder[2], 'PRÉNOM');
});

record('02 — tri Grade hiérarchique + DESC sans inverser les noms', () => {
  const rows = [
    person({ nip: '1', nom: 'Zola', prenom: 'A', grade: 'JSP' }),
    person({ nip: '2', nom: 'Bernard', prenom: 'L', grade: 'JSP' }),
    person({ nip: '3', nom: 'Martin', prenom: 'B', grade: 'Recrue' }),
    person({ nip: '4', nom: 'Noel', prenom: 'C', grade: 'Flm 1' }),
    person({ nip: '5', nom: 'Petit', prenom: 'D', grade: 'Flm 2' }),
    person({ nip: '6', nom: 'Roux', prenom: 'E', grade: 'Flm 3' })
  ];
  const asc = display.sortPersonnelRows(rows, { key: 'grade', dir: 'asc' }).map((r) => r.grade);
  const rec = asc.indexOf('Recrue');
  assert.ok(rec >= 0);
  assert.deepStrictEqual(asc.slice(rec, rec + 5), ['Recrue', 'Flm 3', 'Flm 2', 'Flm 1', 'JSP']);
  const descSame = display.sortPersonnelRows(rows, { key: 'grade', dir: 'desc' })
    .filter((r) => r.grade === 'JSP')
    .map((r) => r.nom);
  assert.deepStrictEqual(descSame, ['Bernard', 'Zola']);
  assert.ok(refs.gradeRank('Recrue') < refs.gradeRank('Flm 3'));
  assert.ok(refs.gradeRank('Flm 3') < refs.gradeRank('Flm 2'));
  assert.ok(refs.gradeRank('Flm 2') < refs.gradeRank('Flm 1'));
  assert.ok(refs.gradeRank('Flm 1') < refs.gradeRank('JSP'));
});

record('03 — actions visibles + pagination 12/24/48/60', () => {
  assert.ok(directory.includes('scope-personnel-list-action'));
  assert.ok(directory.includes('>Fiche</a>'));
  assert.ok(aCss.includes('white-space: nowrap'));
  assert.ok(aCss.includes('min-width: 5.5rem'));
  assert.ok(aCss.includes('overflow: visible'));
  assert.ok(ui.includes('const EVENT_LIST_PAGE_SIZES = [12, 24, 48, 60]'));
  assert.ok(ui.includes('function renderPersonnelListPagination'));
  assert.ok(ui.includes('id="personnel-page-size"'));
  assert.ok(ui.includes('personnelListPageSize: 12'));
});

record('04 — recherche / filtres', () => {
  assert.ok(directory.includes('placeholder="Rechercher une personne…"'));
  assert.ok(directory.includes('for="personnel-q">Recherche<'));
  assert.ok(directory.includes('for="personnel-oi">OI / Incorporation<'));
  assert.ok(directory.includes('id="personnel-specialization"'));
  assert.ok(directory.includes('id="personnel-statut"'));
  const rows = [
    person({ nip: '10', nom: 'Dupont', prenom: 'Marc', grade: 'Sgt' }, [{
      categorie: 'OI', domaine: 'DPS', cible: 'G1', role_domaine: 'PRINCIPAL', dateActif: '2026-01-01', dateInactif: null
    }])
  ];
  assert.ok(display.filterPersonnelRows(rows, { q: 'Sgt' }).length === 1);
  assert.ok(display.filterPersonnelRows(rows, { q: 'DPS G1' }).length === 1);
  assert.ok(display.filterPersonnelRows(rows, { q: 'zzz' }).length === 0);
});

record('05 — liens internes non soulignés + pas de temporalité cassée', () => {
  assert.ok(c4Css.includes('.scope-app a:not(.scope-btn):link'));
  assert.ok(c4Css.includes('text-decoration: none'));
  assert.ok(aCss.includes('.scope-btn.scope-personnel-list-action:visited'));
  assert.ok(directory.includes('personnelPeriodControlsHtml()'));
  assert.ok(directory.includes("personnelSortHeader('actif', 'DATE ACTIF')"));
  assert.ok(directory.includes("personnelSortHeader('inactif', 'DATE INACTIF')"));
  assert.ok(temporalSrc.includes('function resolveAnalyzedPeriod'));
  assert.ok(temporalSrc.includes('function evaluateStatus'));
  assert.ok(!displaySrc.includes('function resolveAnalyzedPeriod'));
  const year2026 = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' });
  assert.ok(year2026 && year2026.from);
});

console.log(`SCOPE-PERSONNEL-DESIGN-A: ${passed} PASS`);
