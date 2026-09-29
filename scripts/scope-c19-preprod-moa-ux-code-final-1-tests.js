'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const functional = require('../netlify/lib/_scope-functional-catalog');
const final = require('./scope-c19-preprod-moa-ux-code-final-1');

const ROOT = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/styles.css'), 'utf8');
const report = final.buildReport();
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('01 conserve les 345 définitions', () => assert.equal(report.definitionsAfter, 345));
test('02 conserve exactement les 622 objets programme', () => assert.equal(report.objectsAfter, 622));
test('03 attribue un code à chaque définition dotée d’un Stat.Com', () => {
  assert.equal(report.preview.definitions.filter((row) => row.statCom && row.code).length, 329);
  assert.equal(report.preview.definitions.filter((row) => row.statCom && !row.code).length, 0);
});
test('04 laisse sans code les 16 définitions sans Stat.Com démontré', () => {
  assert.equal(report.preview.definitions.filter((row) => !row.statCom).length, 16);
  assert(report.preview.definitions.filter((row) => !row.statCom).every((row) => row.code === ''));
});
test('05 impose strictement STATCOM.xxx', () => {
  assert(report.preview.definitions.filter((row) => row.code).every((row) => row.code === `${row.statCom}.${row.code.slice(-3)}`));
  assert(report.preview.definitions.filter((row) => row.code).every((row) => /^[A-Z0-9]+\.\d{3}$/.test(row.code)));
});
test('06 évite toute collision entre définitions', () => {
  const codes = report.preview.definitions.map((row) => row.code).filter(Boolean);
  assert.equal(new Set(codes).size, codes.length);
});
test('07 produit les compteurs .001 puis .002', () => {
  assert.equal(functional.allocateActivityCode('070F7', []), '070F7.001');
  assert.equal(functional.allocateActivityCode('070F7', ['070F7.001']), '070F7.002');
});
test('08 reste stable entre deux constructions', () => {
  const again = final.buildReport();
  assert.deepEqual(again.preview.definitions.map((row) => row.code), report.preview.definitions.map((row) => row.code));
  assert.deepEqual(again.preview.events.map((row) => row.code), report.preview.events.map((row) => row.code));
});
test('09 conserve tous les identifiants techniques', () => assert(report.migration.every((row) => row.technicalId)));
test('10 élimine QV26/QV27 des champs métier définition', () => assert.equal(report.codeControls.legacyVisibleAfter, 0));
test('11 élimine QV26/QV27 des champs métier programme', () => assert.equal(report.codeControls.objectLegacyVisibleCodes, 0));
test('12 aligne chaque code programme sur son propre Stat.Com', () => assert.equal(report.codeControls.objectStatComMismatches, 0));
test('13 conserve la chaîne technique des 622 objets', () => {
  assert(report.preview.events.every((row) => row.technicalId && row.definitionTechnicalId));
});
test('14 laisse l’externe sans Stat.Com ni code', () => {
  const row = report.transverseProof.find((item) => item.key === 'EXTERNE');
  assert.equal(row.statCom, '');
  assert.equal(row.businessCode, '');
  assert.ok(row.activityId);
});
test('15 conserve les 87 Stat.Com PDF', () => assert.equal(report.statCom.pdfOfficialCount, 87));
test('16 distingue exactement les quatre extensions SCOPE', () => {
  assert.deepEqual(report.statCom.extensions.map((row) => row.code), ['010JB1', '010JC1', '010JG1', 'COURJSP']);
  assert(report.statCom.extensions.every((row) => row.status === 'EXTENSION SCOPE' && !row.presentPdf && row.presentScope));
});
test('17 conserve les 53 permanences CTA', () => assert.equal(report.canonical.ctaWeeks, 53));
test('18 conserve les 11 occurrences EMSEA sans faux code', () => {
  assert.equal(report.canonical.emseaOccurrences, 11);
  const emsea = report.transverseProof.find((row) => row.key === 'EMSEA');
  assert.equal(emsea.statCom, '');
  assert.equal(emsea.businessCode, '');
});
test('19 conserve les huit preuves transverses', () => {
  assert.deepEqual(report.transverseProof.map((row) => row.key), ['DPS','DAP','JSP','PR','FOBA','CTA','EMSEA','EXTERNE']);
});
test('20 centralise la réconciliation du code dans l’UI', () => {
  assert.match(app, /async function reconcileBusinessCode/);
  assert.match(app, /allocateActivityCode|\/api\/activity-code/);
});
test('21 sépare Code et Stat.Com au catalogue', () => assert.match(app, /<th>Code<\/th><th>Stat\.Com<\/th>/));
test('22 affiche le libellé métier Code', () => assert.match(app, /replace\('Code généré automatiquement','Code'\)/));
test('23 supprime Yverdon-les-Bains du référentiel de lieux visible', () => assert.match(app, /row\[0\]!==\'L-YVERDON\'/));
test('24 compose l’identité écran 2 sur cinq colonnes intentionnelles', () => assert.match(css, /definition-grid\{grid-template-columns:minmax\(210px/));
test('25 respecte les proportions MOA de l’écran 3', () => assert.match(css, /automation-constraints\{grid-template-columns:minmax\(180px,1fr\).*1\.16fr.*\.7fr/));
test('26 rend les listes longues explicitement scrollables', () => assert.match(css, /automation-constraints select\[multiple\].*overflow-y:scroll/));
test('27 utilise un multi-public sur le besoin annuel', () => assert.match(app, /choice\('Publics concernés','annual-publics'/));
test('28 garde Date Début Fin Durée à 36 px et calcule 12 h 30', () => {
  assert.match(css, /--control-height:36px/);
  assert.equal(report.codeControls.durationExample, '12 h 30');
});
test('29 crée l’événement externe sans code ni Stat.Com', () => {
  assert.match(app, /makeDef\('known-local-'\+Date\.now\(\),'','',val/);
  assert.match(app, /\{code:'',businessCode:'',statCom:''/);
});
test('30 conserve actions sobres et états SCOPE', () => {
  assert.match(css, /text-button\{text-decoration:none!important\}/);
  for (const color of ['#2f9e5a','#de000a','#c98412','#4f84d6','#8b949e']) assert(css.toLowerCase().includes(color.toLowerCase()));
});
test('31 produit exactement le rapport A à BL', () => {
  const headings = [...final.markdown(report).matchAll(/^## ([A-Z]{1,2})\./gm)].map((match) => match[1]);
  const expected = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...Array.from({length:26},(_,i)=>`A${String.fromCharCode(65+i)}`), ...Array.from({length:12},(_,i)=>`B${String.fromCharCode(65+i)}`)];
  assert.deepEqual(headings, expected);
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log(`PASS ${name}`); }
    catch (error) { failed += 1; console.error(`FAIL ${name}`); console.error(error.stack || error); }
  }
  console.log(`\nMOA UX CODE FINAL ciblé: ${tests.length - failed}/${tests.length} PASS`);
  process.exitCode = failed ? 1 : 0;
})();
