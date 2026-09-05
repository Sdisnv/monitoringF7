'use strict';
const assert = require('assert');
const populations = require('../assets/js/scope-personnel-populations.js');
const svc = require('../netlify/lib/_scope-personnel-service.js');
const { computeTaux } = require('../netlify/lib/_scope-rules.js');

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
const doubleDomaine = person('C', [
  oi({ cible: 'G1', role_domaine: 'PRINCIPAL' }),
  oi({ domaine: 'DAP', cible: 'Y2', role_domaine: 'PRINCIPAL' })
]);
const intraB1G1 = person('Q', [
  oi({ cible: 'B1', role_domaine: 'PRINCIPAL' }),
  oi({ cible: 'G1', role_domaine: 'SECONDAIRE' })
]);
const intraG1B1 = person('R', [
  oi({ cible: 'G1', role_domaine: 'PRINCIPAL' }),
  oi({ cible: 'B1', role_domaine: 'SECONDAIRE' })
]);
const sameCibleTwice = person('S', [
  oi({ cible: 'G1', role_domaine: 'PRINCIPAL' }),
  oi({ id: 'dup', cible: 'G1', role_domaine: 'SECONDAIRE' })
]);
const papr = person('D', [oi(), spec({ domaine: 'PR', cible: 'PR' })]);
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
const assignmentEnded = person('T', [oi({ dateActif: '2026-01-01', dateInactif: '2026-04-30' })]);

const all = [
  dpsG1, dapY2, doubleDomaine, intraB1G1, intraG1B1, sameCibleTwice, papr, paprClosed,
  vlDpsOnly, vlDpsAndPl, vlDapAndPl, plSansDps, foba1, fobaEvol, jeuneG1, moniteurG1,
  jeuneOnly, inactive, inactiveOpen, assignmentEnded
];

function pop(domaine, cible, extra){
  return populations.resolvePopulationAtDate(all, Object.assign({ domaine, cible, date: D }, extra || {}));
}

assert.strictEqual(pop('DPS', 'G1').kind, 'POPULATION');

// A
assert.ok(nips(pop('DPS', 'G1')).includes('A'));
assert.strictEqual(pop('DPS', 'G1').personnes.filter((row) => row.nip === 'A').length, 1);
assert.strictEqual(pop('DPS', 'G1').personnes.find((row) => row.nip === 'A').inclusion.kind, 'OI_PRINCIPAL');

// B intra-domaine B1 principal / G1 secondaire
assert.ok(nips(pop('DPS', 'B1')).includes('Q'));
assert.ok(nips(pop('DPS', 'G1')).includes('Q'));
assert.strictEqual(pop('DPS', 'G1').personnes.find((row) => row.nip === 'Q').inclusion.kind, 'OI_SECONDAIRE');
assert.ok(!pop('DPS', 'G1').personnes.find((row) => row.nip === 'Q').statut);

// C inverse
assert.ok(nips(pop('DPS', 'G1')).includes('R'));
assert.ok(nips(pop('DPS', 'B1')).includes('R'));
assert.strictEqual(pop('DPS', 'B1').personnes.find((row) => row.nip === 'R').inclusion.kind, 'OI_SECONDAIRE');

// D dédoublonnage même cible
assert.strictEqual(pop('DPS', 'G1').personnes.filter((row) => row.nip === 'S').length, 1);

// E double domaine
assert.ok(nips(pop('DPS', 'G1')).includes('C'));
assert.ok(nips(pop('DAP', 'Y2')).includes('C'));
assert.strictEqual(pop('DPS', 'G1').personnes.filter((row) => row.nip === 'C').length, 1);

// F inactive + affectation ouverte
assert.ok(!nips(pop('DPS', 'G1')).includes('P'));

// G affectation terminée
assert.ok(!nips(pop('DPS', 'G1')).includes('T'));
assert.ok(nips(populations.resolvePopulationAtDate([assignmentEnded], { domaine: 'DPS', cible: 'G1', date: '2026-04-30' })).includes('T'));

// H AUTO
assert.deepStrictEqual(nips(pop('AUTO', 'VL_DPS')), ['F']);
assert.ok(!nips(pop('AUTO', 'VL_DPS')).includes('G'));
assert.deepStrictEqual(nips(pop('AUTO', 'PL')), ['G', 'H']);
assert.ok(!nips(pop('AUTO', 'PL')).includes('I'));
assert.ok(pop('AUTO', 'PL').anomalies.some((row) => row.nip === 'I' && row.code === 'PL_SANS_DPS'));
assert.deepStrictEqual(nips(pop('AUTO', 'VL_DAP')), ['H']);

// I FOBA
assert.deepStrictEqual(nips(pop('FOBA', '1')), ['J']);
assert.deepStrictEqual(nips(populations.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: '1', date: '2026-03-15' })), ['K']);
assert.deepStrictEqual(nips(populations.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: '2', date: '2026-03-15' })), []);
assert.deepStrictEqual(nips(populations.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: 'FOBA 2', date: D })), ['K']);
assert.deepStrictEqual(nips(populations.resolvePopulationAtDate([fobaEvol], { domaine: 'FOBA', cible: '1', date: D })), []);

// J / K JSP
const jeunes = pop('JSP', 'G1', { jspRole: 'JEUNE' });
const moniteurs = pop('JSP', 'G1', { jspRole: 'MONITEUR' });
assert.deepStrictEqual(nips(jeunes), ['L', 'N']);
assert.deepStrictEqual(nips(moniteurs), ['M']);
assert.ok(jeunes.personnes.every((row) => row.jspRole === 'JEUNE'));
assert.ok(moniteurs.personnes.every((row) => row.jspRole === 'MONITEUR'));
assert.ok(!nips(jeunes).includes('M'));
assert.ok(!nips(moniteurs).includes('L'));

// L NIP unique
['DPS G1', 'DPS B1', 'DAP Y2'].forEach((label) => {
  const [domaine, cible] = label.split(' ');
  assert.ok(uniqueNips(pop(domaine, cible)));
});
assert.ok(uniqueNips(jeunes));
assert.ok(uniqueNips(moniteurs));
assert.ok(uniqueNips(pop('AUTO', 'PL')));
assert.ok(uniqueNips(pop('PAPR')));

assert.deepStrictEqual(nips(pop('PAPR')), ['D']);
assert.ok(populations.resolvePopulationAtDate([paprClosed], { domaine: 'PR', date: '2026-04-30' }).personnes.some((row) => row.nip === 'E'));
assert.ok(!populations.resolvePopulationAtDate([paprClosed], { domaine: 'PR', date: '2026-05-01' }).personnes.some((row) => row.nip === 'E'));

assert.ok(!nips(pop('DPS', 'G1')).includes('O'));
assert.ok(svc.getPopulationAtDate);

const member = pop('DPS', 'G1').personnes.find((row) => row.nip === 'Q');
assert.ok(member.oiPrincipal.indexOf('B1') >= 0);
assert.ok(member.oiSecondaires.some((label) => label.indexOf('G1') >= 0));
assert.ok(member.affectationsPertinentes.length >= 1);
assert.strictEqual(member.origine, 'CALCULEE');

const manual = populations.addExistingPersonToPopulation(pop('DPS', 'G1'), dapY2, D);
assert.ok(manual.ok && manual.added);
assert.ok(manual.population.personnes.some((row) => row.nip === 'B' && row.origine === 'MANUELLE'));
const again = populations.addExistingPersonToPopulation(manual.population, dapY2, D);
assert.ok(again.ok && again.added === false);
assert.strictEqual(again.population.personnes.filter((row) => row.nip === 'B').length, 1);
const inactiveAdd = populations.addExistingPersonToPopulation(pop('DPS', 'G1'), inactiveOpen, D);
assert.ok(!inactiveAdd.ok);

const taux = computeTaux(
  [
    { personne_id: '1', statut: 'PRESENT' },
    { personne_id: '2', statut: 'PRESENT' },
    { personne_id: '3', statut: 'DISPENSE' }
  ],
  [{ personne_id: '1' }, { personne_id: '2' }, { personne_id: '3' }]
);
assert.strictEqual(taux.denominator, 2);
assert.strictEqual(taux.presents, 2);
assert.strictEqual(taux.dispenses, 1);
assert.strictEqual(taux.percentage, 100);

console.log('scope-personnel-populations-metier.test.js PASS');
