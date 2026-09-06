#!/usr/bin/env node
'use strict';

/** SCOPE-DOMAINES-RAPPORTS-CLOSE-1 - cloture V1 Domaines/Rapports. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { computeTaux, countsInEventEffectif, HttpError } = require('../netlify/lib/_scope-rules');
const { CIBLES, DOMAINES_MODEL_2 } = require('../netlify/lib/_scope-schema');
const { sanitizeQuery } = require('../netlify/lib/_scope-report-service');

const ROOT = path.join(__dirname, '..');
const uiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const logic = require('../assets/js/scope-ui-logic.js');
const htmlSource = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const apiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const functionSource = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
const reportServiceSource = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-report-service.js'), 'utf8');

const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function makeNode(){
  return {
    value: '',
    checked: false,
    innerHTML: '',
    dataset: {},
    style: {},
    classList: { toggle(){}, add(){}, remove(){} },
    addEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    getAttribute(){ return null; },
    setAttribute(){},
    removeAttribute(){},
    focus(){}
  };
}

function uiHooks(hash = '#/accueil'){
  const root = makeNode();
  const storage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
  const location = { hash, search: '', pathname: '/scope.html', hostname: 'scope-sdisnv.netlify.app' };
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn){ if(typeof fn === 'function') fn(); },
    encodeURIComponent,
    URLSearchParams,
    Event: function Event(type){ this.type = type; },
    location,
    localStorage: storage,
    sessionStorage: storage,
    document: {
      getElementById(id){ return id === 'scope-root' ? root : makeNode(); },
      querySelector(){ return null; },
      querySelectorAll(){ return []; },
      addEventListener(){},
      dispatchEvent(){},
      body: makeNode()
    },
    window: {
      __SCOPE_UI_TEST_HOOKS__: true,
      ScopeUiLogic: logic,
      ScopeCharts: null,
      CurrentRoles: [],
      CurrentPermissions: ['dashboard:read', 'personnel:read', 'reports:nominatif'],
      MonitoringRBAC: { has(){ return true; } },
      location,
      history: { replaceState(){} },
      addEventListener(){},
      scrollTo(){},
      localStorage: storage,
      sessionStorage: storage
    }
  };
  sandbox.window.document = sandbox.document;
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(uiSource, sandbox, { filename: 'scope-ui.js' });
  return sandbox.window.ScopeUiTestHooks;
}

function ciblesFor(domain){
  return CIBLES.filter((row) => row[0] === domain).map((row) => row[1]);
}

(async () => {
  await record('01 domaines V1 presents dans le modele central sans menu Domaines principal', () => {
    ['DPS', 'DAP', 'JSP', 'FOBA', 'FOCA', 'FOSPEC'].forEach((domain) => {
      assert.ok(DOMAINES_MODEL_2[domain], `${domain} absent du modele`);
    });
    ['G1', 'C1', 'B1', 'B2'].forEach((target) => assert.ok(ciblesFor('DPS').includes(target), `DPS ${target} absent`));
    ['Y1', 'Y2', 'Y3', 'Y4'].forEach((target) => assert.ok(ciblesFor('DAP').includes(target), `DAP ${target} absent`));
    ['G1', 'C1', 'B1'].forEach((target) => assert.ok(ciblesFor('JSP').includes(target), `JSP ${target} absent`));
    assert.deepStrictEqual(ciblesFor('FOBA'), ['1', '2', '3']);
    assert.deepStrictEqual(ciblesFor('FOCA'), ['GEN']);
    assert.strictEqual(DOMAINES_MODEL_2.PR.parentCode, 'FOSPEC');
    assert.strictEqual(DOMAINES_MODEL_2.AUTO.parentCode, 'FOSPEC');
    const nav = logic.buildSidebarNav([], { screen: 'accueil', nav: 'accueil' });
    assert.ok(!nav.groups.some((group) => group.id === 'domaines'));
    assert.ok(!uiSource.includes('<p class="scope-nav-section">Domaines</p>'));
  });

  await record('02 deep-links #/vue restent fonctionnels et contextualises', () => {
    [
      ['#/vue/DPS/G1', 'DPS', 'G1'],
      ['#/vue/DAP/Y4', 'DAP', 'Y4'],
      ['#/vue/JSP/B1', 'JSP', 'B1'],
      ['#/vue/FOBA/1', 'FOBA', '1'],
      ['#/vue/FOCA/GEN', 'FOCA', 'GEN'],
      ['#/vue/FOSPEC/PR', 'FOSPEC', 'PR'],
      ['#/vue/FOSPEC/AUTO', 'FOSPEC', 'AUTO']
    ].forEach(([hash, domain, target]) => {
      assert.deepStrictEqual(logic.parseHash(hash), { screen: 'vue', nav: 'vue', domaine: domain, cible: target });
      const html = uiHooks(hash).renderShellHtml(hash, { counts: {}, alerts: [] });
      assert.ok(html.includes('Périmètre'));
      assert.ok(html.includes('Rapport de participation'));
      assert.ok(html.includes('href="#/rapports"'));
      assert.ok(html.includes(`data-vue-report="${domain}"`));
      assert.ok(html.includes(`data-vue-cible="${target}"`));
      assert.ok(!html.includes('<a href="#/vue">Domaines</a>'));
    });
  });

  await record('03 navigation contextuelle Domaines conserve PR/ABC et AUTO/PL distincts', () => {
    const hooks = uiHooks('#/vue/FOSPEC/PR');
    hooks.openParticipationReportFromVue('DAP', 'Y4');
    assert.strictEqual(hooks.state.participationReportDomain, 'DAP');
    assert.strictEqual(hooks.state.participationReportSubdomain, '');
    assert.strictEqual(hooks.state.jspReportSite, 'Y4');
    hooks.openParticipationReportFromVue('PR', 'ABC');
    assert.strictEqual(hooks.state.participationReportDomain, 'FOSPEC');
    assert.strictEqual(hooks.state.participationReportSubdomain, 'PR');
    assert.strictEqual(hooks.state.participationReportSpecialisation, 'ABC');
    hooks.openParticipationReportFromVue('AUTO', 'PL');
    assert.strictEqual(hooks.state.participationReportDomain, 'FOSPEC');
    assert.strictEqual(hooks.state.participationReportSubdomain, 'AUTO');
    assert.strictEqual(hooks.state.participationReportSpecialisation, 'PL');
    assert.strictEqual(hooks.state.jspReportSite, 'TOUS');
  });

  await record('04 regles metier stabilisees inchangees', () => {
    const taux = computeTaux([
      { personne_id: 'a', statut: 'PRESENT' },
      { personne_id: 'b', statut: 'PERMUTATION' },
      { personne_id: 'c', statut: 'DISPENSE', motif_absence: 'PAS_CONCERNE' },
      { personne_id: 'd', statut: 'ABSENT_NON_EXCUSE' }
    ], [
      { personne_id: 'a' },
      { personne_id: 'b' },
      { personne_id: 'c' },
      { personne_id: 'd' }
    ]);
    assert.strictEqual(taux.presents, 2);
    assert.strictEqual(taux.permutations, 1);
    assert.strictEqual(taux.dispenses, 1);
    assert.strictEqual(taux.denominator, 3);
    assert.strictEqual(countsInEventEffectif({ personne_id: 'jsp-mon', jspRole: 'MONITEUR' }, { role: 'PARTICIPANT' }), false);
    assert.strictEqual(countsInEventEffectif({ personne_id: 'enc' }, { role: 'MONITEUR' }), false);
  });

  await record('05 hub Rapports est une restitution officielle, pas un doublon dashboard', () => {
    const html = uiHooks('#/rapports').renderRapportsHtml();
    assert.ok(html.includes('Restitution'));
    assert.ok(html.includes('Exports officiels'));
    assert.ok(html.includes('Exports par objet'));
    assert.ok(html.includes('Type de restitution'));
    assert.ok(html.includes('Préparer le PDF'));
    assert.ok(html.includes('Le navigateur ne recalcule aucun chiffre.'));
    assert.ok(!html.includes('REPORT-1'));
    assert.ok(!html.includes('PDF serveur'));
    assert.ok(!html.includes('Rapports spécialisés existants'));
  });

  await record('06 exports source et API officiels restent cartographies', () => {
    assert.ok(uiSource.includes('person-export-pdf'));
    assert.ok(uiSource.includes('data-report-event'));
    assert.ok(uiSource.includes('data-report-session'));
    assert.ok(apiSource.includes('participationReport'));
    assert.ok(apiSource.includes('formationReport'));
    assert.ok(apiSource.includes('generateReport'));
    assert.ok(functionSource.includes("/reports/event/:id"));
    assert.ok(functionSource.includes('/reporting/participation'));
    assert.ok(functionSource.includes('/reporting/formation'));
  });

  await record('07 contrat PDF serveur refuse les chiffres client et garde le nominatif cote serveur', () => {
    assert.throws(
      () => sanitizeQuery({ kind: 'PERIOD', year: 2026, percentage: 99 }),
      (error) => error instanceof HttpError && error.error === 'payload_interdit'
    );
    assert.throws(
      () => sanitizeQuery({ kind: 'PARTICIPATION', domaine: 'JSP', specialisation: 'ABC', year: 2026 }),
      (error) => error instanceof HttpError && error.error === 'payload_invalide'
    );
    assert.deepStrictEqual(
      sanitizeQuery({ kind: 'PARTICIPATION', domaine: 'FOSPEC', sousDomaine: 'PR', specialisation: 'ABC', year: 2026 }).specialisation,
      'ABC'
    );
    assert.deepStrictEqual(
      sanitizeQuery({ kind: 'PARTICIPATION', domaine: 'FOSPEC', sousDomaine: 'AUTO', specialisation: 'PL', year: 2026 }).specialisation,
      'PL'
    );
    assert.ok(reportServiceSource.includes("hasPermission(claims, 'dashboard:read')"));
    assert.ok(reportServiceSource.includes("hasPermission(claims, 'personnel:read')"));
    assert.ok(reportServiceSource.includes("hasPermission(claims, 'reports:nominatif')"));
  });

  await record('08 cache-bust SCOPE-DOMAINES-RAPPORTS-CLOSE-1 branche', () => {
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-domaines-rapports-close-1') || htmlSource.includes('scope-ui.js?v=scope-admin-rbac-doc-1'));
    assert.ok(!htmlSource.includes('scope-ui.js?v=scope-nav-convergence-1"></script>'));
  });

  const failed = results.filter((result) => result.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}${result.proof ? `\n${result.proof}` : ''}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-DOMAINES-RAPPORTS-CLOSE-1: ${failed.length} test(s) en echec`);
    process.exit(1);
  }
  console.log(`\nSCOPE-DOMAINES-RAPPORTS-CLOSE-1: ${results.length} tests PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
