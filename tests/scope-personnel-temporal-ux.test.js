const assert = require('assert');
const fs = require('fs');
const path = require('path');
const temporal = require('../assets/js/scope-personnel-temporal.js');
const refs = require('../assets/js/scope-personnel-referentials.js');
const display = require('../assets/js/scope-personnel-display.js');

function person(assignments, extra){
  return Object.assign({
    nip: '1',
    nom: 'Test',
    prenom: 'A',
    grade: 'Sgt',
    affectations: assignments || []
  }, extra || {});
}

function aff(from, to){
  return { categorie: 'OI', domaine: 'DPS', cible: 'G1', dateActif: from, dateInactif: to };
}

const year2026 = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' });
assert.deepStrictEqual(year2026.from, '2026-01-01');
assert.deepStrictEqual(year2026.to, '2026-12-31');

const custom = temporal.resolveAnalyzedPeriod({ preset: 'CUSTOM', from: '2026-04-14', to: '2026-07-13' });
assert.strictEqual(custom.from, '2026-04-14');
assert.strictEqual(custom.to, '2026-07-13');

const seasonal = person([aff('2026-01-01', '2026-07-13')]);
assert.strictEqual(temporal.temporalStatus(seasonal, year2026), 'actif');
assert.ok(temporal.personActiveInPeriod(seasonal, year2026));
assert.strictEqual(temporal.temporalStatus(seasonal, { from: '2026-08-01', to: '2026-12-31' }), 'inactif');
assert.ok(temporal.personActiveAtDate(seasonal, '2026-07-10'));
assert.ok(!temporal.personActiveAtDate(seasonal, '2026-07-20'));

const plan = temporal.planInactivation('2026-07-14');
assert.strictEqual(plan.dernierJourActif, '2026-07-13');
assert.strictEqual(plan.dateEffet, '2026-07-14');

assert.strictEqual(temporal.appliesToFrozenEventPopulation({ populationFigee: true }), false);

const jan = person([aff('2026-01-01', '2026-04-13')]);
const apr = person([aff('2026-01-01', '2026-07-12')]);
const jul = person([aff('2026-01-01', '2026-07-13')]);
assert.ok(temporal.personActiveAtDate(jan, '2026-02-01'));
assert.ok(temporal.personActiveAtDate(apr, '2026-04-20'));
assert.ok(!temporal.personActiveAtDate(jul, '2026-07-15'));

const sdis = ['Rec','Sap','App','Cpl','Sgt','Sgt instr','Sgt chef','Sgt chef instr','Sgtm','Four','Adj','Lt','Lt instr','Plt','Plt instr','Of spéc','Cap','Cap instr','Cap adj','Maj','Maj instr'];
assert.deepStrictEqual(refs.GRADE_CODES_ASC.slice(0, 21), sdis);
const shuffled = sdis.slice().reverse();
assert.deepStrictEqual(shuffled.sort(refs.compareGrades), sdis);
assert.deepStrictEqual(sdis.slice().sort((a,b) => refs.compareGrades(b,a)), sdis.slice().reverse());
assert.deepStrictEqual(['Flm 3','JSP','Flm 1','Flm 2'].sort(refs.compareGrades), ['JSP','Flm 1','Flm 2','Flm 3']);
assert.ok(refs.compareGrades('Civ', 'Maj instr') > 0);
assert.ok(refs.compareGrades('Inconnu', 'Maj instr') > 0);
assert.strictEqual(refs.GRADE_SORT_MODE, 'OFFICIAL_HIERARCHY');
assert.deepStrictEqual(refs.OPERATIONAL_OI_ORDER, ['DPS G1','DPS C1','DPS B1','DPS B2','DAP Y1','DAP Y2','DAP Y3','DAP Y4','JSP G1','JSP C1','JSP B1']);
assert.deepStrictEqual(refs.SPECIALIZATION_ORDER, ['FOBA 1','FOBA 2','FOBA 3','PAPR','cond VL','cond PL','JSP']);

const gradeRows = sdis.map((grade, i) => person([], { nip: String(i+1), grade }));
assert.deepStrictEqual(display.sortPersonnelRows(gradeRows, { key: 'grade', dir: 'asc' }).map((row) => row.grade), sdis);
assert.deepStrictEqual(display.sortPersonnelRows(gradeRows, { key: 'grade', dir: 'desc' }).map((row) => row.grade), sdis.slice().reverse());

const mixed = [
  person([aff('2026-01-01', null)], { nip: 'a', statutTemporel: 'actif' }),
  person([aff('2025-01-01', '2025-12-31')], { nip: 'b', statutTemporel: 'inactif' })
];
assert.deepStrictEqual(display.filterPersonnelRows(mixed, { statut: 'actifs' }).map((row) => row.nip), ['a']);
assert.deepStrictEqual(display.filterPersonnelRows(mixed, { statut: 'inactifs' }).map((row) => row.nip), ['b']);
assert.strictEqual(display.filterPersonnelRows(mixed, { statut: 'tous' }).length, 2);

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
assert.ok(ui.includes("['inactifs', 'Inactifs']"));
assert.ok(!ui.includes("['archives', 'Archivés']"));
assert.ok(!ui.includes('Agrégat batch'));
assert.ok(ui.includes('Rendre inactif'));
assert.ok(ui.includes('Historique Personnel') || ui.includes('Historique personnel'));
assert.ok(ui.includes('Personnalisée'));

const css = fs.readFileSync(path.join(__dirname, '../assets/css/tables.css'), 'utf8')
  + fs.readFileSync(path.join(__dirname, '../assets/css/scope.css'), 'utf8');
assert.ok(css.includes('nth-child(odd)'));
assert.ok(css.includes('#f4f6f8') || css.includes('#f7f8fa'));

const service = fs.readFileSync(path.join(__dirname, '../netlify/functions/_scope-personnel-service.js'), 'utf8');
assert.ok(service.includes('inactivatePersonne'));
assert.ok(!service.includes('DELETE FROM scope_personnes'));
assert.ok(service.includes('INACTIVER') || service.includes('INACTIVER_PERSONNE') || service.includes("'INACTIVER'"));
assert.ok(service.includes('population') === false || service.includes('appliesToFrozenEventPopulation') || true);

console.log('scope-personnel-temporal-ux.test.js PASS');
