#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const logic = require('../assets/js/scope-ui-logic.js');
const uiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');

const sampleArbre = [
  { code: 'DPS', libelleAffiche: 'DPS', cibles: [{ domaineCode: 'DPS', niveauCode: 'G1' }] },
  { code: 'DAP', libelleAffiche: 'DAP', cibles: [{ domaineCode: 'DAP', niveauCode: 'Y4' }] },
  { code: 'FOSPEC', libelleAffiche: 'FOSPEC', sousDomaines: [{ code: 'PR', libelleAffiche: 'PR' }, { code: 'AUTO', libelleAffiche: 'AUTO' }], cibles: [] }
];

let passed = 0;

async function record(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error && error.stack || error);
    process.exit(1);
  }
}

function makeNode(attrs = {}) {
  return {
    value: attrs.value || '',
    checked: attrs.checked || false,
    innerHTML: '',
    dataset: {},
    style: {},
    classList: { toggle(){}, add(){}, remove(){} },
    addEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    getAttribute(name){ return attrs[name] || null; },
    setAttribute(){},
    removeAttribute(){},
    focus(){}
  };
}

function uiHooks(hash, permissions) {
  const root = makeNode();
  const allowed = new Set(permissions || []);
  const location = { hash: hash || '#/accueil', search: '', pathname: '/scope.html', hostname: 'scope-sdisnv.netlify.app' };
  const storage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn){ if (typeof fn === 'function') fn(); },
    encodeURIComponent,
    URLSearchParams,
    Event: function Event(type){ this.type = type; },
    CSS: { escape(value){ return String(value); } },
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
      CurrentPermissions: permissions || [],
      MonitoringRBAC: { has(permission){ return allowed.has(permission); } },
      location,
      history: { replaceState(){} },
      addEventListener(){},
      scrollTo(){},
      document: null,
      localStorage: storage,
      sessionStorage: storage
    }
  };
  context.window.document = context.document;
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(uiSource, context, { filename: 'scope-ui.js' });
  const hooks = context.window.ScopeUiTestHooks;
  hooks.state.referentiels.arbre = sampleArbre;
  hooks.state.referentiels.domaines = sampleArbre;
  hooks.state.authChecking = false;
  hooks.state.needOkta = false;
  hooks.state.session = { name: 'Admin SCOPE', roles: ['ADMINISTRATEUR'], permissions: permissions || [] };
  return hooks;
}

function dashboardPayload() {
  return {
    officiel: { percentage: 78.6, numerator: 11, denominator: 14, eventCount: 3, analyticStatus: 'OK' },
    period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' },
    absencesNonExcusees: { count: 0, events: [] },
    alerts: { alerts: [] },
    explain: { exclusions: {}, includedEvents: [], totals: {} },
    graphs: {},
    evenements: []
  };
}

(async () => {
  await record('01 - cache-bust UI FRONT-FINITION-1', () => {
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-front-finition-1'));
  });

  await record('02 - vue contextuelle alignee Pilotage avec retours utiles', () => {
    const hooks = uiHooks('#/vue/FOSPEC/PR', ['dashboard:read', 'personnel:read', 'reports:nominatif']);
    hooks.state.dashboard = dashboardPayload();
    const html = hooks.renderShellHtml('#/vue/FOSPEC/PR', { alerts: [], counts: {} });
    assert.ok(html.includes('<a href="#/statistiques">Pilotage / Analyses</a>'));
    assert.ok(html.includes('Retour aux analyses'));
    assert.ok(html.includes('href="#/evenements">Événements</a>'));
    assert.ok(html.includes('data-vue-report="FOSPEC"'));
    assert.ok(html.includes('href="#/rapports">Hub Rapports</a>'));
    assert.ok(!html.includes('Domaines / FOSPEC'));
  });

  await record('03 - sous-vues rapport cycle et fiche gardent un retour clair', () => {
    const hooks = uiHooks('#/rapports/participation', ['dashboard:read', 'reports:nominatif']);
    hooks.state.jspReportReady = false;
    assert.ok(hooks.renderShellHtml('#/rapports/participation', {}).includes('Retour aux rapports'));
    hooks.state.formationReportReady = false;
    assert.ok(hooks.renderShellHtml('#/rapports/formation', {}).includes('Retour aux rapports'));
    assert.ok(hooks.renderCycleHtml({ cycle: { libelle: 'Cycle PR', type_cycle: 'PR' }, pilotage: {}, metrics: {}, evenements: [], personnes: [] }).includes('Retour aux cycles'));
    hooks.state.personneFiche = null;
    assert.ok(hooks.renderShellHtml('#/personnel/P-1', {}).includes('Retour au personnel'));
  });

  await record('04 - administration secondaire propose le retour hub', () => {
    const hooks = uiHooks('#/reglages/utilisateurs', ['users:admin', 'personnel:manage', 'references:manage', 'events:create']);
    hooks.state.adminUsersReady = true;
    const users = hooks.renderUtilisateursHtml();
    assert.ok(users.includes('Retour administration'));
    assert.ok(hooks.renderShellHtml('#/reglages/objectifs', {}).includes('Retour administration'));
    assert.ok(hooks.renderShellHtml('#/reglages/import-evenements', {}).includes('Retour administration'));
    assert.ok(hooks.renderShellHtml('#/reglages/import-personnel', {}).includes('Retour administration'));
    assert.ok(hooks.renderShellHtml('#/reglages/apropos', {}).includes('Retour administration'));
  });

  await record('05 - utilisateurs: libelles fonctionnels et table triable', () => {
    const hooks = uiHooks('#/reglages/utilisateurs', ['users:admin']);
    hooks.state.adminUsersReady = true;
    hooks.state.adminRoles = ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR'];
    hooks.state.adminUsers = [
      { subject: 'okta|z', email: 'zeta@example.test', displayName: 'Zeta SCOPE', roles: ['UTILISATEUR'], active: true },
      { subject: 'okta|a', email: 'alpha@example.test', displayName: 'Alpha SCOPE', roles: ['ADMINISTRATEUR'], active: false, lastLoginAt: '2026-01-02' }
    ];
    const html = hooks.renderUtilisateursHtml();
    assert.ok(html.includes('Identifiant de connexion'));
    assert.ok(html.includes('Identifiant secondaire'));
    assert.ok(!html.includes('Identifiant auth / subject'));
    assert.ok(!html.includes('Identifiant auth éventuel'));
    assert.ok(html.includes('data-scope-sort="admin-users" data-sort-key="displayName"'));
    assert.ok(html.includes('data-scope-sort="admin-users" data-sort-key="lastLoginAt"'));
    assert.ok(!/data-scope-sort="admin-users" data-sort-key="actions"/.test(html));
    assert.ok(html.indexOf('Alpha SCOPE') < html.indexOf('Zeta SCOPE'));
    assert.ok(html.includes('compte authentifié par Okta'));
  });

  await record('06 - menu cible stable sans groupe Domaines', () => {
    const hooks = uiHooks('#/statistiques', ['personnel:read', 'references:manage', 'personnel:manage', 'events:create', 'users:admin']);
    const html = hooks.renderShellHtml('#/statistiques', { alerts: [], counts: {} });
    ['Accueil', 'Activité', 'Événements', 'Cycles', 'Pilotage', 'Vigilance', 'Analyses', 'Personnel', 'Rapports', 'Administration'].forEach((label) => {
      assert.ok(html.includes(label), `${label} absent`);
    });
    assert.ok(!html.includes('<p class="scope-nav-section">Domaines</p>'));
    assert.strictEqual((html.match(/aria-expanded="true"/g) || []).length, 1);
  });

  console.log(`\nSCOPE-FRONT-FINITION-1: ${passed} tests PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
