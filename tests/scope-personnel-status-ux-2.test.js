'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const temporal = require('../assets/js/scope-personnel-temporal.js');
const modalApi = require('../assets/js/scope-personnel-activity-modal.js');

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
const html = fs.readFileSync(path.join(__dirname, '../scope.html'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '../netlify/lib/_scope-personnel-service.js'), 'utf8');
const handler = fs.readFileSync(path.join(__dirname, '../netlify/functions/scope-personnel-inactivate.js'), 'utf8');
const modalSrc = fs.readFileSync(path.join(__dirname, '../assets/js/scope-personnel-activity-modal.js'), 'utf8');

assert.ok(ui.includes('data-personnel-more'));
assert.ok(ui.includes('positionPersonnelRowMenu'));
assert.ok(ui.includes('scope-personnel-row-menu'));
assert.ok(ui.includes('Gérer l’activité') || ui.includes("Gérer l'activité"));
assert.ok(modalSrc.includes('Démission du SDIS'));
assert.ok(modalSrc.includes('Clôturer une affectation'));
assert.ok(ui.includes('renderPersonneActivityCard'));
assert.ok(ui.includes('scope-person-manage-activity'));
assert.ok(modalSrc.includes("action: modal.mode === 'correct' ? 'correct' : (resignation ? 'inactivate' : 'close_assignment')"));
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

const calls = ui.match(/renderPersonnelInactivateModal\(\)/g) || [];
assert.strictEqual(calls.length, 2, 'une seule insertion de modale dans le shell');
assert.ok(ui.includes('${renderPersonnelInactivateModal()}${renderModalAllPresent()}'));
const personneBlock = ui.slice(ui.indexOf('function renderPersonne()'), ui.indexOf('function renderModalAllPresent()'));
assert.ok(!personneBlock.includes('renderPersonnelInactivateModal'));
assert.ok((personneBlock.match(/renderPersonneActivityCard\(/g) || []).length === 1);
assert.ok(ui.includes("source: 'directory'"));
assert.ok(ui.includes("source: 'fiche'"));
assert.ok(ui.includes('closePersonnelActivityModal'));
assert.ok(ui.includes("target.closest('[data-activity-cancel]')"));
assert.ok(ui.includes("target.hasAttribute('data-activity-overlay')"));
assert.ok(ui.includes('submitPersonnelActivityModal'));
assert.ok(ui.includes('api.confirmBody(modal)'));
assert.ok(ui.includes('api.beginSubmit(modal)'));
assert.ok(ui.includes('api.failSubmit'));
assert.ok(!ui.includes("getElementById('scope-inactivate-cancel')"));
assert.ok(!ui.includes('withLoading(async () => {\n        const resignation'));
assert.ok(html.includes('scope-personnel-activity-modal.js'));
assert.ok(/scope-personnel-activity-modal\.js\?v=scope-personnel-status-ux-2a|scope-personnel-activity-modal\.js\?v=scope-personnel-design-b[23]/.test(html));

const fixture = {
  id: 'fixture-1',
  nip: '00000',
  label: 'Sap Fixture Test',
  oiLabel: 'DAP Y2',
  mode: 'manage',
  operation: '',
  affectationId: '',
  affectations: [
    { id: 'a1', label: 'DAP Y2' },
    { id: 'a2', label: 'FOBA 1' }
  ],
  date: '',
  comment: '',
  source: 'directory',
  busy: false,
  error: ''
};

const closed = modalApi.close();
assert.strictEqual(closed, null);

const initial = modalApi.render(fixture);
assert.ok(initial.includes('id="scope-activity-modal"'));
assert.ok(initial.includes('data-activity-overlay'));
assert.ok(initial.includes('data-activity-cancel'));
assert.ok(initial.includes('data-activity-confirm'));
assert.ok(initial.includes('Sap Fixture Test'));
assert.ok(initial.includes('NIP 00000 · DAP Y2'));
assert.ok(!initial.includes('<dt>Personne</dt>'));
assert.ok(!initial.includes('scope-inactivate-identity'));
assert.ok(!initial.includes('id="scope-activity-date"'));
assert.ok(initial.includes('disabled'));
assert.ok(!modalApi.canConfirm(fixture));
assert.strictEqual(modalApi.confirmBody(fixture), null);

const assign = modalApi.selectOperation(fixture, 'assignment');
const assignHtml = modalApi.render(assign);
assert.ok(assignHtml.includes('id="scope-activity-date"'));
assert.ok(assignHtml.includes('name="scope-activity-aff"'));
assert.ok(!assignHtml.includes('ensemble des affectations actives'));
assert.ok(!modalApi.canConfirm(assign));
assert.strictEqual(modalApi.confirmBody(assign), null);

const assignReady = Object.assign({}, assign, { date: '2026-06-23', affectationId: 'a2' });
assert.ok(modalApi.canConfirm(assignReady));
const assignBody = modalApi.confirmBody(assignReady);
assert.strictEqual(assignBody.action, 'close_assignment');
assert.strictEqual(assignBody.affectationId, 'a2');
assert.strictEqual(assignBody.dateEffet, '2026-06-23');

const resign = modalApi.selectOperation(fixture, 'resignation');
const resignHtml = modalApi.render(resign);
assert.ok(resignHtml.includes('id="scope-activity-date"'));
assert.ok(resignHtml.includes('ensemble des affectations actives'));
assert.ok(!resignHtml.includes('name="scope-activity-aff"'));
assert.ok(!modalApi.canConfirm(resign));
const resignReady = Object.assign({}, resign, { date: '2026-06-23' });
assert.ok(modalApi.canConfirm(resignReady));
assert.strictEqual(modalApi.confirmBody(resignReady).action, 'inactivate');
assert.strictEqual(modalApi.confirmBody(resignReady).affectationId, undefined);

assert.ok(css.includes('.scope-activity-overlay'));
assert.ok(css.includes('.scope-activity-card'));
assert.ok(css.includes('overflow-x: hidden'));
assert.ok(css.includes('@media (max-width: 560px)'));
assert.ok(css.includes('width: min(440px, 100%)') || css.includes('width:min(440px, 100%)'));
assert.ok(!css.includes('.scope-activity-ops'));

async function runConfirm(state, client){
  if (!state.modal || state.modal.busy) return;
  const body = modalApi.confirmBody(state.modal);
  if (!body) return;
  state.modal = modalApi.beginSubmit(state.modal);
  try {
    await client.inactivatePersonne(body);
    state.modal = modalApi.close();
    state.refreshed += 1;
  } catch (error) {
    state.modal = modalApi.failSubmit(state.modal, error.message);
  }
}

(async () => {
  const calls = [];
  const okClient = {
    inactivatePersonne(body){
      calls.push(body);
      return Promise.resolve({ ok: true });
    }
  };
  const cancelState = { modal: Object.assign({}, resignReady), refreshed: 0 };
  cancelState.modal = modalApi.close();
  assert.strictEqual(cancelState.modal, null);
  assert.strictEqual(calls.length, 0);

  const success = { modal: Object.assign({}, resignReady), refreshed: 0 };
  await Promise.all([runConfirm(success, okClient), runConfirm(success, okClient)]);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(success.modal, null);
  assert.strictEqual(success.refreshed, 1);

  const errClient = {
    inactivatePersonne(){
      calls.push('err');
      return Promise.reject(new Error('refus métier fixture'));
    }
  };
  const failed = { modal: Object.assign({}, assignReady), refreshed: 0 };
  await runConfirm(failed, errClient);
  assert.ok(failed.modal);
  assert.strictEqual(failed.modal.busy, false);
  assert.ok(String(failed.modal.error).includes('refus métier fixture'));
  const failedHtml = modalApi.render(failed.modal);
  assert.ok(failedHtml.includes('scope-activity-error'));
  assert.ok(failedHtml.includes('id="scope-activity-modal"'));
  assert.strictEqual(failed.refreshed, 0);

  console.log('scope-personnel-status-ux-2.test.js PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
