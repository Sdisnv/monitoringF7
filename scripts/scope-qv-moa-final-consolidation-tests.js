'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {createFixture} = require('./scope-qv-local-fixture');
const {createCatalogUiHarness} = require('./scope-annual-catalog-ui-harness');

test('les fiches créées et transformées utilisent les mêmes panneaux, champs et trois actions',async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  const transformed = qv.canonicalProgramme.rows.find((row) => row.id === 'qv-source-918');
  const manual = {...transformed,id:'QV27:MANUAL:TEST',manualCreation:true,businessCode:'011PR.040'};
  qv.canonicalProgramme.rows.push(manual);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,
    session:{name:'Test',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  const fields = [];
  for(const id of [transformed.id,manual.id,'nouveau']){
    harness.context.location.hash = `#/quo-vadis/programme/${encodeURIComponent(id)}`;
    harness.hooks.render();
    const html = harness.root.innerHTML;
    assert.match(html,/qv-programme-info-grid/);
    assert.match(html,/qv-programme-preparation/);
    for(const action of ['save','validate','plan']) assert.equal((html.match(new RegExp(`id="qv-programme-${action}"`,'g')) || []).length,1);
    fields.push([...html.matchAll(/(?:input|select)[^>]+id="(qv-programme-[^"]+)"/g)].map((match) => match[1]).sort());
  }
  assert.deepEqual(fields[0],fields[1]);
  assert.deepEqual(fields[1],fields[2]);
});

test('la notification centrale conserve le formulaire et distingue les quatre types accessibles',() => {
  const harness = createCatalogUiHarness();
  const attributes = {};
  const host = {innerHTML:'',setAttribute:(key,value) => {attributes[key]=value;},querySelector:() => null};
  const get = harness.context.document.getElementById;
  harness.context.document.getElementById = (id) => id === 'scope-notification-host' ? host : get(id);
  harness.root.innerHTML = '<input value="Saisie à conserver">';
  for(const kind of ['success','info','warning','error']){
    harness.context.window.ScopeFeedback.notify(kind,'Test','Message de recette');
    assert.equal(harness.root.innerHTML,'<input value="Saisie à conserver">');
    assert.match(host.innerHTML,/<svg[^>]*aria-hidden="true"/);
    assert.match(host.innerHTML,/aria-label="Fermer la notification"/);
    assert.equal(attributes.role,kind === 'error' ? 'alert' : 'status');
    assert.equal(attributes['aria-live'],kind === 'error' ? 'assertive' : 'polite');
  }
});

test('une confirmation critique conserve son action et sa priorité sur les notifications',() => {
  const harness = createCatalogUiHarness();
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false});
  const action = () => {};
  harness.context.window.ScopeFeedback.confirm({title:'Confirmation critique',message:'Confirmer la suppression ?'},action);
  const html = harness.root.innerHTML;
  harness.context.window.ScopeFeedback.notify('success','Succès','Notification secondaire');
  assert.equal(harness.hooks.state.feedback.kind,'confirm');
  assert.equal(harness.hooks.state.feedbackAction,action);
  assert.equal(harness.root.innerHTML,html);
  assert.match(html,/aria-modal="true"/);
});

test('l’Agenda rend un véritable sélecteur des trois formats PDF',async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false});
  harness.context.location.hash = '#/quo-vadis/agenda-annuel';
  harness.hooks.render();
  const html = harness.root.innerHTML;
  assert.match(html,/id="qv-export-programme-variant"/);
  assert.match(html,/value="compact">Liste compacte/);
  assert.match(html,/value="monthly"[^>]*>Planning mensuel/);
  assert.doesNotMatch(html,/\$\{qvProgrammePdfControl/);
});
