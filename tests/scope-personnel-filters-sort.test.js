'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const display = require('../assets/js/scope-personnel-display.js');

function person(overrides, assignments){
  return Object.assign({
    nip: '1',
    nom: 'A',
    prenom: 'B',
    grade: 'Sgt',
    affectationsOuvertes: assignments || [],
    affectations: assignments || []
  }, overrides || {});
}

function oi(domaine, cible, extra){
  return Object.assign({
    categorie: 'OI',
    domaine,
    cible,
    role_domaine: 'PRINCIPAL',
    dateActif: '2026-01-01',
    dateInactif: null
  }, extra || {});
}

function spec(domaine, cible){
  return {
    categorie: 'SPECIALISATION',
    domaine,
    cible,
    dateActif: '2026-01-01',
    dateInactif: null
  };
}

function ids(rows){
  return rows.map((row) => row.nip).join(',');
}

const rows = [
  person({ nip: '10', nom: 'Dupont', prenom: 'Marc', grade: 'Sgt' }, [oi('DPS', 'G1'), spec('PR', 'PR')]),
  person({ nip: '2', nom: 'Dupont', prenom: 'Zoé', grade: 'Cpl' }, [oi('DPS', 'B1'), spec('AUTO', 'PL')]),
  person({ nip: '100', nom: 'Martin', prenom: 'Anne', grade: 'Flm 2' }, [
    oi('JSP', 'JSP G1'),
    oi('DPS', 'G1', { role_domaine: 'SECONDAIRE' })
  ]),
  person({ nip: '3', nom: 'Bernard', prenom: 'Luc', grade: 'Sgt' }, [oi('DAP', 'Y2'), spec('AUTO', 'VL_DAP')]),
  person({ nip: '4', nom: 'Noel', prenom: 'Paul', grade: 'Sgt' }, [
    oi('DAP', 'Y1', { role_domaine: 'PRINCIPAL' }),
    oi('DPS', 'G1', { role_domaine: 'SECONDAIRE' }),
    spec('FOBA', '1')
  ]),
  person({ nip: '5', nom: 'Viret', prenom: 'Léa', grade: 'Sgt' }, [oi('DPS', 'G1'), spec('AUTO', 'VL_DPS')]),
  person({ nip: '6', nom: 'Archive', prenom: 'Jean', grade: 'Sgt', statutTemporel: 'inactif' }, [oi('DPS', 'G1')])
];

const oiOptions = display.operationalOiOptions([
  { domaineCode: 'AUTO', niveauCode: 'PL' },
  { domaineCode: 'FOBA', niveauCode: '1' },
  { domaineCode: 'FOCA', niveauCode: 'GEN' },
  { domaineCode: 'FOSPEC', niveauCode: 'GEN' },
  { domaineCode: 'PR', niveauCode: 'PR' },
  { domaineCode: 'DPS', niveauCode: 'G1' },
  { domaineCode: 'DPS', niveauCode: 'C1' },
  { domaineCode: 'DAP', niveauCode: 'Y2' },
  { domaineCode: 'JSP', niveauCode: 'GEN' },
  { domaineCode: 'JSP', niveauCode: 'G1' }
]);
assert.deepStrictEqual(oiOptions, ['DPS G1', 'DPS C1', 'DAP Y2', 'JSP G1']);
assert.ok(!oiOptions.some((label) => label.includes('/') || /AUTO|FOBA|FOCA|FOSPEC|^PR$/.test(label)));
assert.deepStrictEqual(display.specializationFilterOptions(), ['FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'cond VL', 'cond PL', 'JSP']);

assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'DPS G1', statut: 'tous' })), '10,100,4,5,6');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'DPS G1', statut: 'actifs' })), '10,100,4,5');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'DAP Y2' })), '3');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'JSP G1' })), '100');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { specialization: 'PAPR' })), '10');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { specialization: 'cond VL' })), '3,5');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { specialization: 'cond PL' })), '2');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { specialization: 'FOBA 1' })), '4');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { specialization: 'JSP' })), '100');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'DPS G1', specialization: 'PAPR' })), '10');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'DPS B1', specialization: 'cond PL' })), '2');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'DAP Y2', specialization: 'cond VL' })), '3');
assert.strictEqual(ids(display.filterPersonnelRows(rows, { oi: 'JSP G1', specialization: 'JSP' })), '100');
assert.strictEqual(ids(display.filterPersonnelRows(rows, {
  q: 'Dupont',
  oi: 'DPS G1',
  specialization: 'PAPR',
  statut: 'actifs'
})), '10');
assert.ok(!ids(display.filterPersonnelRows(rows, { statut: 'actifs' })).includes('6'));
assert.strictEqual(ids(display.filterPersonnelRows(rows, { statut: 'inactifs' })), '6');

assert.strictEqual(ids(display.sortPersonnelRows(rows, { key: 'nip', dir: 'asc' })), '2,3,4,5,6,10,100');
assert.strictEqual(ids(display.sortPersonnelRows(rows, { key: 'nip', dir: 'desc' })), '100,10,6,5,4,3,2');
const namesAsc = display.sortPersonnelRows(rows, { key: 'nom', dir: 'asc' }).map((row) => row.nom);
assert.ok(namesAsc.indexOf('Archive') < namesAsc.indexOf('Dupont'));
assert.ok(namesAsc.indexOf('Bernard') < namesAsc.indexOf('Dupont'));
const identityRows = [
  person({ nip: '4', nom: 'Dupont', prenom: 'Zoé', grade: 'Sap' }),
  person({ nip: '3', nom: 'Dupont', prenom: 'Alain', grade: 'Plt' }),
  person({ nip: '1', nom: 'Bernard', prenom: 'Marc', grade: 'Cpl' }),
  person({ nip: '2', nom: 'Dupont', prenom: 'Alain', grade: 'Cpl' })
];
assert.deepStrictEqual(
  display.sortPersonnelRows(identityRows, { key: '', dir: '' }).map((row) => `${row.nom} ${row.prenom} ${row.grade}`),
  ['Bernard Marc Cpl', 'Dupont Alain Cpl', 'Dupont Alain Plt', 'Dupont Zoé Sap']
);
const specAsc = display.sortPersonnelRows([
  person({ nip: 'a' }, [spec('PR', 'PR'), spec('AUTO', 'PL')]),
  person({ nip: 'b' }, [spec('FOBA', '2'), spec('PR', 'PR')])
], { key: 'specializations', dir: 'asc' });
assert.deepStrictEqual(specAsc.map((row) => row.nip), ['b', 'a']);

assert.strictEqual(display.formatPersonnelDate('2026-01-01T00:00:00.000Z'), '01.01.2026');
assert.strictEqual(display.operationalOiLabel(oi('DPS', 'G1')), 'DPS G1');
assert.strictEqual(display.formatAssignment(oi('DAP', 'Y2')), 'DAP Y2');
assert.ok(!String(display.formatAssignment(oi('DPS', 'G1'))).includes('/'));
assert.deepStrictEqual(display.nextPersonnelSort({}, 'nom'), { key: 'nom', dir: 'asc' });
assert.deepStrictEqual(display.nextPersonnelSort({ key: 'nom', dir: 'asc' }, 'nom'), { key: 'nom', dir: 'desc' });
assert.deepStrictEqual(display.nextPersonnelSort({ key: 'nom', dir: 'desc' }, 'nom'), { key: 'nom', dir: 'asc' });

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
assert.ok(ui.includes('for="personnel-oi">OI / Incorporation<'));
assert.ok(ui.includes('personnel-specialization'));
assert.ok(ui.includes("personnelSortHeader('nip', 'NIP')"));
assert.ok(ui.includes("personnelSortHeader('grade', 'GRADE')"));
assert.ok(ui.includes("personnelSortHeader('nom', 'NOM')"));
assert.ok(ui.includes("personnelSortHeader('prenom', 'PRÉNOM')"));
assert.ok(!ui.includes('OI principal'));
assert.ok(!ui.includes('OI PRINCIPAL'));
assert.ok(ui.includes('<optgroup'));
assert.deepStrictEqual(display.operationalOiGroups([]).map((g)=>g.label), ['DPS','DAP','JSP']);

console.log('scope-personnel-filters-sort.test.js PASS');
