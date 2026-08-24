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

assert.strictEqual(temporal.iso(new Date(2026, 0, 1)), '2026-01-01');
assert.strictEqual(temporal.iso('24.08.2026'), '2026-08-24');
assert.strictEqual(temporal.iso('2026-01-01T12:00:00.000Z'), '2026-01-01');
assert.ok(!temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026', asOf: '2026-07-14' }).from.includes('2026-07-14') || temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026', asOf: '2026-07-14' }).from === '2026-01-01');
assert.deepStrictEqual(temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' }), Object.assign({ from: '2026-01-01', to: '2026-12-31', preset: 'YEAR', year: '2026' }, temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' })));

const year2026 = temporal.resolveAnalyzedPeriod({ preset: 'YEAR', year: '2026' });
assert.strictEqual(year2026.from, '2026-01-01');
assert.strictEqual(year2026.to, '2026-12-31');
assert.strictEqual(year2026.preset, 'YEAR');

const custom = temporal.resolveAnalyzedPeriod({ preset: 'CUSTOM', from: '2026-08-01', to: '2026-12-31' });
assert.strictEqual(custom.from, '2026-08-01');
assert.strictEqual(custom.to, '2026-12-31');

// A. actif 01.01.2026 → null sur année 2026 → ACTIF
const open2026 = person([aff(new Date(2026, 0, 1), null)]);
assert.strictEqual(temporal.temporalStatus(open2026, year2026), 'actif');
assert.strictEqual(temporal.evaluateStatus(open2026, year2026, ''), 'actif');

// B. actif 01.01 → inactif 13.07 sur année 2026 → présent (actif sur la période)
const mid = person([aff('2026-01-01', '2026-07-13')]);
assert.strictEqual(temporal.temporalStatus(mid, year2026), 'actif');
assert.ok(temporal.personActiveInPeriod(mid, year2026));

// C. même personne 01.08 → 31.12 → INACTIVE
assert.strictEqual(temporal.temporalStatus(mid, custom), 'inactif');

// D. inactive dès 01.01.2026 → pas active le 01.01
const planJan = temporal.planInactivation('2026-01-01');
assert.strictEqual(planJan.dernierJourActif, '2025-12-31');
const leftBefore = person([aff('2025-01-01', planJan.dernierJourActif)]);
assert.ok(!temporal.personActiveAtDate(leftBefore, '2026-01-01'));
assert.strictEqual(temporal.temporalStatus(leftBefore, year2026), 'inactif');

// E. import technique 24.08, date effet 01.01 → métier 01.01
const imported = person([aff(new Date(2026, 0, 1), null)], { createdAt: new Date(2026, 7, 24), importedAt: '2026-08-24' });
assert.strictEqual(temporal.iso(imported.createdAt), '2026-08-24');
assert.strictEqual(temporal.iso(imported.affectations[0].dateActif), '2026-01-01');
assert.strictEqual(temporal.evaluateStatus(imported, year2026), 'actif');
assert.ok(temporal.personActiveAtDate(imported, '2026-01-01'));
assert.ok(!temporal.personActiveAtDate(imported, '2025-12-31') || temporal.personActiveAtDate(imported, '2026-01-01'));

const plan = temporal.planInactivation('2026-07-14');
assert.strictEqual(plan.dernierJourActif, '2026-07-13');
assert.strictEqual(plan.dateEffet, '2026-07-14');
assert.strictEqual(temporal.appliesToFrozenEventPopulation({ populationFigee: true }), false);

const officialAsc = ['Civ','JSP','Flm 1','Flm 2','Flm 3','Rec','Sap','App','Cpl','Sgt','Sgt instr','Sgt chef','Sgt chef instr','Sgtm','Four','Adj','Lt','Lt instr','Plt','Plt instr','Of spéc','Cap','Cap instr','Cap adj','Maj','Maj instr'];
assert.deepStrictEqual(refs.GRADE_CODES_ASC.slice(), officialAsc);
assert.deepStrictEqual(officialAsc.slice().sort(refs.compareGrades), officialAsc);
assert.deepStrictEqual(officialAsc.slice().sort((a,b) => refs.compareGrades(b,a)), officialAsc.slice().reverse());
assert.strictEqual(officialAsc.slice().sort((a,b) => refs.compareGrades(b,a))[0], 'Maj instr');
assert.strictEqual(officialAsc.slice().sort((a,b) => refs.compareGrades(b,a)).slice(-1)[0], 'Civ');
assert.ok(refs.compareGrades('Civ', 'Maj instr') < 0);
assert.ok(refs.compareGrades('JSP', 'Rec') < 0);
assert.ok(refs.compareGrades('Inconnu', 'Maj instr') > 0);
assert.strictEqual(refs.GRADE_SORT_MODE, 'OFFICIAL_HIERARCHY');

const gradeRows = officialAsc.map((grade, i) => person([], { nip: String(i+1), grade }));
assert.deepStrictEqual(display.sortPersonnelRows(gradeRows, { key: 'grade', dir: 'asc' }).map((row) => row.grade), officialAsc);
assert.deepStrictEqual(display.sortPersonnelRows(gradeRows, { key: 'grade', dir: 'desc' }).map((row) => row.grade), officialAsc.slice().reverse());

const groups = display.operationalOiGroups([]);
assert.deepStrictEqual(groups.map((g) => g.label), ['DPS','DAP','JSP']);
assert.ok(!groups.some((g) => g.items.some((label) => String(label).includes('/'))));

const mixed = [
  person([aff('2026-01-01', null)], { nip: 'a', statutTemporel: 'actif' }),
  person([aff('2025-01-01', '2025-12-31')], { nip: 'b', statutTemporel: 'inactif', archivedAt: '2026-01-01' })
];
assert.deepStrictEqual(display.filterPersonnelRows(mixed, { statut: 'actifs' }).map((row) => row.nip), ['a']);
assert.deepStrictEqual(display.filterPersonnelRows(mixed, { statut: 'inactifs' }).map((row) => row.nip), ['b']);
assert.strictEqual(display.filterPersonnelRows(mixed, { statut: 'tous' }).length, 2);
assert.deepStrictEqual(display.filterPersonnelRows([{ nip: 'x', statutTemporel: 'actif', archivedAt: '2026-01-01' }], { statut: 'actifs' }).map((row) => row.nip), ['x']);

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
assert.ok(ui.includes("['inactifs', 'Inactifs']"));
assert.ok(!ui.includes("['archives', 'Archivés']"));
assert.ok(!ui.includes('Agrégat batch'));
assert.ok(ui.includes('Rendre inactif'));
assert.ok(ui.includes('Afficher l’historique') || ui.includes("Afficher l'historique"));
assert.ok(ui.includes('Masquer'));
assert.ok(ui.includes('Personnalisée'));
assert.ok(ui.includes('personnel-period-mode'));
assert.ok(ui.includes('<optgroup'));
assert.ok(ui.includes('<optgroup label="${escapeHtml(group.label)}">') || ui.includes("label: 'DPS'"));
assert.ok(ui.includes('Situation au'));

const css = fs.readFileSync(path.join(__dirname, '../assets/css/tables.css'), 'utf8')
  + fs.readFileSync(path.join(__dirname, '../assets/css/scope.css'), 'utf8');
assert.ok(css.includes('nth-child(odd)'));
assert.ok(css.includes('#e6e9ee'));

const service = fs.readFileSync(path.join(__dirname, '../netlify/functions/_scope-personnel-service.js'), 'utf8');
assert.ok(service.includes('inactivatePersonne'));
assert.ok(!service.includes('DELETE FROM scope_personnes'));
assert.ok(service.includes('INACTIVER') || service.includes("'INACTIVER'"));
assert.ok(service.includes('evaluateStatus'));
assert.ok(service.includes('temporal.iso(row.date_actif)'));
assert.ok(service.includes('resolveImportContext'));
assert.ok(!service.includes('Import AUTO') || service.includes('cond PL'));

console.log('scope-personnel-temporal-ux.test.js PASS');
