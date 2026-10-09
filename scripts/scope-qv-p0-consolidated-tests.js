'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const L = require('../assets/js/scope-ui-logic');
const {createCatalogUiHarness} = require('./scope-annual-catalog-ui-harness');
const {createFixture} = require('./scope-qv-local-fixture');

test('un 401 exige une session SCOPE sans imposer Okta',() => {
  const error = L.friendlyError({status:401});
  assert.equal(error.sessionRequired,true);
  assert.equal(error.okta,false);
  assert.doesNotMatch(error.message,/okta/i);
});

test('configuration indisponible : aucun fournisseur inventé et nouvelle tentative accessible',async () => {
  const harness = createCatalogUiHarness();
  harness.context.fetch = async () => {throw new Error('offline');};
  const config = await harness.hooks.loadAuthConfig();
  assert.equal(config.oktaEnabled,false);
  assert.equal(config.localEnabled,false);
  harness.hooks.state.authChecking = false;
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/scope-auth-config-retry/);
  assert.doesNotMatch(harness.root.innerHTML,/id="scope-okta-login"/);
});

test('connexion LOCAL : la route courante charge son programme sans rechargement',async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  let programmeRequests = 0;
  const harness = createCatalogUiHarness({client:{
    sessionMe:async () => ({user:{nip:'recipe',roles:['GESTIONNAIRE'],permissions:['references:manage']}}),
    referentiels:async () => ({domaines:[],cibles:[]}),
    quoVadisProgramme:async () => {programmeRequests++;return {quoVadis:qv};}
  }});
  harness.context.location.hash = '#/quo-vadis/programme';
  harness.context.fetch = async () => ({ok:true,json:async () => ({ok:true,localEnabled:true,oktaEnabled:false,methods:['local']})});
  await harness.hooks.submitLocalLogin({preventDefault(){},currentTarget:{elements:{nip:{value:'recipe'},password:{value:'recipe-password'}}}});
  assert.equal(programmeRequests,1);
  assert.equal(harness.hooks.state.quoVadisReady,true);
  assert.equal(harness.hooks.state.needOkta,false);
  assert.match(harness.root.innerHTML,/Créer une activité/);
});

test('confirmation d’enregistrement conservée au retour vers le programme',() => {
  const harness = createCatalogUiHarness();
  const host = {innerHTML:'',setAttribute(){},querySelector(){return null;}};
  const get = harness.context.document.getElementById;
  harness.context.document.getElementById = id => id === 'scope-notification-host' ? host : get(id);
  harness.context.window.ScopeFeedback.notify('success','Programme','Activité planifiée.',{preserveRoute:true});
  harness.hooks.prepareRouteChange({screen:'quo-vadis',qvView:'programme-fiche',qvProgrammeItemId:'manual'},
    {screen:'quo-vadis',qvView:'programme'});
  assert.equal(harness.hooks.state.toast.message,'Activité planifiée.');
});

test('présentation des permanences sans altérer les verrouillages',() => {
  for(const row of [{definitionId:'CTA-PERMANENCE'},{label:'Permanence week-end B1'},{title:'Permanence jour férié'},{activityLabel:'Permanence ordinaire'}])
    assert.equal(L.qvProgrammeIsPermanence(row),true);
  assert.equal(L.qvProgrammeIsPermanence({label:'Exercice DPS'}),false);
  for(const [row,lock] of [[{definitionId:'CTA-PERMANENCE'},'CTA_PERMANENCE'],[{publishedEventId:'event'},'EVENEMENT_PUBLIE'],
    [{externalHistorical:true},'REFERENCE_EXTERNE'],[{fixedDate:true},'DATE_VERROUILLEE']]) assert.equal(L.qvProgrammeDragLock(row),lock);
});
