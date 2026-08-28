'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const temporal = require('../assets/js/scope-personnel-temporal.js');

function aff(id, domaine, cible, from, to, extra){
  return Object.assign({
    id,
    categorie: domaine === 'FOBA' ? 'SPECIALISATION' : 'OI',
    domaine,
    cible,
    dateActif: from,
    dateInactif: to
  }, extra || {});
}

function person(assignments){
  return { nip: 'UX2', nom: 'Test', prenom: 'A', grade: 'Sap', affectations: assignments };
}

const dap = aff('dap', 'DAP', 'Y2', '2026-01-01', null);
const foba = aff('foba', 'FOBA', '1', '2026-01-01', null);
const source = person([dap, foba]);

const plan = temporal.planInactivation('2026-06-23');
assert.strictEqual(plan.dateEffet, '2026-06-23');
assert.strictEqual(plan.dernierJourActif, '2026-06-22');

const closeFoba = temporal.planSingleAssignmentClosure(foba, '2026-06-23');
assert.ok(closeFoba.canProceed);
assert.strictEqual(closeFoba.close[0].dateInactif, '2026-06-22');
assert.strictEqual(closeFoba.close[0].assignment.id, 'foba');

const afterCloseFoba = person([
  dap,
  Object.assign({}, foba, { dateInactif: closeFoba.close[0].dateInactif })
]);
assert.ok(temporal.personActiveAtDate(afterCloseFoba, '2026-06-23'));
assert.ok(temporal.assignmentCoversDate(afterCloseFoba.affectations[0], '2026-08-01'));
assert.ok(!temporal.assignmentCoversDate(afterCloseFoba.affectations[1], '2026-06-23'));
assert.ok(temporal.assignmentCoversDate(afterCloseFoba.affectations[1], '2026-06-22'));
assert.strictEqual(temporal.evaluateStatus(afterCloseFoba, { preset: 'YEAR', year: '2026' }), 'actif');

const resignation = temporal.planAssignmentClosures(source.affectations, '2026-06-23');
assert.strictEqual(resignation.close.length, 2);
const afterResign = person(source.affectations.map((row) => Object.assign({}, row, { dateInactif: '2026-06-22' })));
assert.ok(temporal.personActiveAtDate(afterResign, '2026-06-22'));
assert.ok(!temporal.personActiveAtDate(afterResign, '2026-06-23'));
assert.strictEqual(temporal.evaluateStatus(afterResign, { preset: 'YEAR', year: '2026' }), 'inactif');
assert.strictEqual(temporal.evaluateStatus(afterResign, { preset: 'YEAR', year: '2026' }, '2026-06-22'), 'actif');

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../assets/css/scope.css'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '../netlify/functions/_scope-personnel-service.js'), 'utf8');
const handler = fs.readFileSync(path.join(__dirname, '../netlify/functions/scope-personnel-inactivate.js'), 'utf8');

assert.ok(ui.includes('data-personnel-more'));
assert.ok(ui.includes('positionPersonnelRowMenu'));
assert.ok(ui.includes('scope-personnel-row-menu'));
assert.ok(ui.includes('Gérer l’activité') || ui.includes("Gérer l'activité"));
assert.ok(ui.includes('Démission du SDIS'));
assert.ok(ui.includes('Clôturer une affectation'));
assert.ok(ui.includes('renderPersonneActivityCard'));
assert.ok(ui.includes('scope-person-manage-activity'));
assert.ok(ui.includes("action: modal.mode === 'correct' ? 'correct' : (resignation ? 'inactivate' : 'close_assignment')"));
assert.ok(!ui.includes('<details class="scope-row-more">'));
assert.ok(css.includes('position: fixed'));
assert.ok(css.includes('.scope-row-more-menu'));
assert.ok(service.includes('closePersonneAffectation'));
assert.ok(service.includes("kind: 'DEMISSION_SDIS'"));
assert.ok(service.includes('planSingleAssignmentClosure'));
assert.ok(service.includes("|| 'Démission du SDIS'"));
assert.ok(handler.includes("'close_assignment'"));
assert.ok(handler.includes("'CLOTURER_AFFECTATION'"));
assert.ok(handler.includes('syncExpectedPopulationForPersonnes'));

console.log('scope-personnel-status-ux-2.test.js PASS');
