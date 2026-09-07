#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); }
  };
}

function hooks(sessionMe, options = {}) {
  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const root = {
    classList: { toggle() {}, remove() {} },
    innerHTML: '',
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
  const sessionStorage = memoryStorage({ 'scope-live-confirmed': '1' });
  const localStorage = memoryStorage({ scope_auth_idle_last_activity: '1' });
  const idle = { start() {}, stop() {} };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeApi: { createHttpClient: () => ({ kind: 'http', sessionMe }) },
      ScopeAuthIdle: idle,
      __SCOPE_UI_TEST_HOOKS__: true,
      CurrentRoles: [],
      CurrentPermissions: [],
      addEventListener() {},
      sessionStorage,
      localStorage
    },
    document: {
      getElementById(id) { return id === 'scope-root' ? root : null; },
      addEventListener() {},
      dispatchEvent() {},
      querySelectorAll() { return []; },
      querySelector() { return null; }
    },
    location: { hash: options.hash || '#/statistiques', search: options.search || '', href: '' },
    sessionStorage,
    localStorage,
    console,
    clearTimeout,
    setTimeout,
    URLSearchParams,
    Event: function Event(type) { this.type = type; }
  };
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(uiSrc, sandbox, { filename: 'scope-ui.js' });
  return { root, api: sandbox.window.ScopeUiTestHooks };
}

(async () => {
  await record('01 — login non authentifie reprend la composition ORION/SCOPE', async () => {
    const env = hooks(async () => { const err = new Error('unauthorized'); err.status = 401; throw err; });
    await env.api.ensureLiveSession();
    env.api.render();
    const html = env.root.innerHTML;
    assert.ok(html.includes('scope-login-v1'));
    assert.ok(html.includes('scope-login-visual'));
    assert.ok(html.includes('scope-login-dashboard'));
    assert.ok(html.includes('scope-login-panel'));
    assert.ok(html.includes('logo-scope-blanc.png'));
    assert.ok(html.includes('LogoSDISseulnoir.png'));
    assert.ok(html.includes('Suivi et analyse de l’activité'));
  });

  await record('02 — panneau analytique sans donnees personnelles reelles', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Taux de réalisation'));
    assert.ok(ui.includes('Personnel suivi'));
    assert.ok(ui.includes('Analyse métier'));
    assert.ok(ui.includes('Données fiables'));
    assert.ok(ui.includes('Accessible 24/7'));
    assert.ok(!ui.includes('Mode démonstration'));
    assert.ok(!ui.includes('Utilisateur SCOPE'));
  });

  await record('03 — carte de connexion cible et support institutionnel', async () => {
    const env = hooks(async () => { const err = new Error('unauthorized'); err.status = 401; throw err; });
    await env.api.ensureLiveSession();
    env.api.render();
    const html = env.root.innerHTML;
    assert.ok(html.includes('<h1>Connexion</h1>'));
    assert.ok(html.includes('Accès réservé au personnel autorisé du<br>SDIS régional du Nord vaudois.'));
    assert.ok(html.includes('Se connecter à SCOPE'));
    assert.ok(html.includes('mailto:info@sdisnv.ch'));
    assert.ok(html.includes('info@sdisnv.ch'));
  });

  await record('04 — bouton garde le mecanisme Okta et les deep-links', async () => {
    const env = hooks(async () => { const err = new Error('unauthorized'); err.status = 401; throw err; }, { hash: '#/personnel/42' });
    await env.api.ensureLiveSession();
    env.api.render();
    const html = env.root.innerHTML;
    assert.ok(html.includes('id="scope-okta-login"'));
    assert.ok(html.includes('data-auth-provider="okta"'));
    assert.ok(html.includes('returnTo='));
    assert.ok(html.includes('%2Fscope.html%23%2Fpersonnel%2F42'));
  });

  await record('05 — responsive mobile sans split et sans overflow horizontal', () => {
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('grid-template-columns: minmax(380px, 36%) minmax(0, 1fr)'));
    assert.ok(css.includes('@media (max-width: 960px)'));
    assert.ok(css.includes('grid-template-columns: 1fr'));
    assert.ok(css.includes('@media (max-width: 560px)'));
    assert.ok(css.includes('.scope-login-dashboard {\n    display: none;'));
    assert.ok(css.includes('overflow-x: hidden'));
  });

  await record('06 — cache-bust SCOPE visuel uniquement', () => {
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    assert.ok(html.includes('assets/css/scope.css?v=scope-login-visual-alignment-orion-1'));
    assert.ok(html.includes('assets/js/scope-ui.js?v=scope-login-visual-alignment-orion-1'));
    assert.ok(html.includes('assets/js/scope-auth-idle.js?v=scope-login-1'));
    assert.ok(!html.includes('scope-demo.js'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();
