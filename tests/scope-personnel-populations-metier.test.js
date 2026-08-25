'use strict';
const assert = require('assert');
const display = require('../assets/js/scope-personnel-display.js');
const svc = require('../netlify/functions/_scope-personnel-service.js');

function oi(overrides){
  return Object.assign({
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'G1',
    role_domaine: 'PRINCIPAL',
    dateActif: '2026-01-01',
    dateInactif: null
  }, overrides || {});
}

function spec(overrides){
  return Object.assign({
    categorie: 'SPECIALISATION',
    domaine: 'AUTO',
    cible: 'VL_DPS',
    role_domaine: null,
    dateActif: '2026-01-01',
    dateInactif: null
  }, overrides || {});
}

function person(nip, assignments, extra){
  return Object.assign({
    id: 'p-' + nip,
    nip,
    nom: 'TEST',
    prenom: nip,
    grade: 'Sgt',
    affectations: assignments || [],
    periodes: []
  }, extra || {});
}

function nips(result){
  return result.personnes.map((row) => row.nip).sort();
}

function uniqueNips(result){
  const values = result.personnes.map((row) => row.nip);
  return values.length === new Set(values).size;
}

const D = '2026-05-15';

const dpsG1 = person('A', [oi()]);
const dapY2 = person('B', [oi({ domaine: 'DAP', cible: 'Y2' })]);
const double = person('C', [
  oi({ cible: 'G1', role_domaine: 'PRINCIPAL' }),
  oi({ domaine: 'DAP', cible: 'Y2', role_domaine: 'SECONDAIRE' })
]);
const papr = person('D', [
  oi(),
  spec({ domaine: 'PR', cible: 'PR' })
]);
const paprClosed = person('E', [
  oi(),
  spec({ domaine: 'PR', cible: 'PR', dateActif: '2026-01-01', dateInactif: '2026-04-30' })
]);
const vlDpsOnly = person('F', [oi(), spec({ cible: 'VL_DPS' })]);
const vlDpsAndPl = person('G', [oi(), spec({ cible: 'VL_DPS' }), spec({ cible: 'PL' })]);
const vlDapAndPl = person('H', [
  oi(),
  oi({ domaine: 'DAP', cible: 'Y2', role_domaine: 'SECONDAIRE' }),
  spec({ cible: 'VL_DAP' }),
  spec({ cible: 'PL' })
]);
const plSansDps = person('I', [
  oi({ domaine: 'DAP', cible: 'Y2' }),
  spec({ cible: 'PL' })
]);
const foba1 = person('J', [spec({ domaine: 'FOBA', cible: '1' })]);
const fobaEvol = person('K', [
  spec({ domaine: 'FOBA', cible: '1', dateActif: '2026-01-01', dateInactif: '2026-03-31' }),
  spec({ domaine: 'FOBA', cible: '2', dateActif: '2026-04-01', dateInactif: null })
]);
const jeuneG1 = person('L', [oi({ domaine: 'JSP', cible: 'JSP G1' })], { grade: 'Flm 2' });
const moniteurG1 = person('M', [
  oi(),
  oi({ domaine: 'JSP', cible: 'JSP G1', role_domaine: 'SECONDAIRE' })
]);
const jeuneOnly = person('N', [oi({ domaine: 'JSP', cible: 'JSP G1' })], { grade: 'JSP' });
const inactive = person('O', [oi({ dateActif: '2026-01-01', dateInactif: '2026-04-19' })], {
  periodes: [{ type: 'SORTI', date_debut: '2026-04-20', date_fin: null }]
});
const inactiveOpen = person('P', [oi()], {
  periodes: [{ type: 'SORTI', date_debut: '2026-04-20', date_fin: null }]
});

const all = [
  dpsG1, dapY2, double, papr, paprClosed, vlDpsOnly, vlDpsAndPl, vlDapAndPl,
  plSansDps, foba1, fobaEvol, jeuneG1, moniteurG1, jeuneOnly, inactive, inactiveOpen
];

function pop(domaine, cible, extra){
  return display.resolvePopulationAtDate(all, Object.assign({ domaine, cible, date: D }, extra || {}));
}

assert.deepStrictEqual(nips(pop('DPS', 'G1')), ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'M']);
assert.deepStrictEqual(nips(pop('DAP', 'Y2')), ['B', 'C', 'H', 'I']);
assert.strictEqual(pop('DPS', 'G1').personnes.filter((row) => row.nip === 'C').length, 1);
assert.ok(uniqueNips(pop('DPS', 'G1')));
assert.ok(uniqueNips(pop('DAP', 'Y2')));

assert.deepStrictEqual(nips(pop('PAPR')), ['D']);
assert.strictEqual(pop('PR', '', { date: '2026-04-30' }).personnes.some((row) => row.nip === 'E'), true);
assert.strictEqual(pop('PR', '', { date: '2026-05-01' }).personnes.some((row) => row.nip === 'E'), false);

assert.deepStrictEqual(nips(pop('AUTO', 'VL_DPS')), ['F']);
assert.ok(!nips(pop('AUTO', 'VL_DPS')).includes('G'));
assert.deepStrictEqual(nips(pop('AUTO', 'PL')), ['G', 'H']);
assert.ok(!nips(pop('AUTO', 'PL')).includes('I'));
assert.ok(pop('AUTO', 'PL').anomalies.some((row) => row.nip === 'I' && row.code === 'PL_SANS_DPS'));
assert.deepStrictEqual(nips(pop('AUTO', 'VL_DAP')), ['H']);
assert.ok(nips(pop('AUTO', 'VL_DAP')).includes('H'));
assert.ok(nips(pop('AUTO', 'PL')).includes('H'));

assert.deepStrictEqual(nips(pop('FOBA', '1')), ['J']);
assert.deepStrictEqual(nips(display.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: '1', date: '2026-03-15' })), ['K']);
assert.deepStrictEqual(nips(display.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: '2', date: '2026-03-15' })), []);
assert.deepStrictEqual(nips(display.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: 'FOBA 2', date: '2026-05-15' })), ['K']);
assert.deepStrictEqual(nips(display.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: '1', date: '2026-05-15' })), []);

const jeunes = pop('JSP', 'G1', { jspRole: 'JEUNE' });
const moniteurs = pop('JSP', 'G1', { jspRole: 'MONITEUR' });
assert.deepStrictEqual(nips(jeunes), ['L', 'N']);
assert.deepStrictEqual(nips(moniteurs), ['M']);
assert.ok(jeunes.personnes.every((row) => row.jspRole === 'JEUNE'));
assert.ok(moniteurs.personnes.every((row) => row.jspRole === 'MONITEUR'));
assert.ok(!nips(jeunes).includes('M'));
assert.ok(!nips(moniteurs).includes('L'));
assert.ok(uniqueNips(jeunes));
assert.ok(uniqueNips(moniteurs));

assert.ok(!nips(pop('DPS', 'G1')).includes('O'));
assert.ok(!nips(pop('DPS', 'G1')).includes('P'));
assert.ok(!nips(pop('AUTO', 'VL_DPS')).includes('O'));
assert.ok(!nips(pop('PAPR')).includes('O'));
assert.ok(!nips(pop('FOBA', '1')).includes('O'));
assert.ok(!nips(pop('JSP', 'G1', { jspRole: 'JEUNE' })).includes('O'));

assert.ok(svc.getPopulationAtDate);
assert.ok(display.belongsToPopulationAtDate(dpsG1, { domaine: 'DPS', cible: 'G1', date: D }));
assert.ok(!display.belongsToPopulationAtDate(inactive, { domaine: 'DPS', cible: 'G1', date: D }));

all.forEach((row) => {
  const result = display.resolvePopulationAtDate([row, row], { domaine: 'DPS', cible: 'G1', date: D });
  assert.ok(uniqueNips(result));
});

console.log('scope-personnel-populations-metier.test.js PASS');
