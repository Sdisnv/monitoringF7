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
  const sessionStorage = memoryStorage(Object.assign({ 'scope-live-confirmed': '1' }, options.session || {}));
  const localStorage = memoryStorage({ scope_auth_idle_last_activity: '1' });
  const idle = { started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; } };
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
  return { root, sandbox, idle, sessionStorage, localStorage, api: sandbox.window.ScopeUiTestHooks };
}

(async () => {
  await record('01 — source sans moteur DEMO ni script charge', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.strictEqual(fs.existsSync(path.join(ROOT, 'assets/js/scope-demo.js')), false);
    assert.ok(!html.includes('scope-demo.js'));
    assert.ok(!ui.includes('ScopeDemo'));
    assert.ok(!ui.includes('createDemoClient'));
    assert.ok(!ui.includes('scope-confirm-live'));
    assert.ok(!ui.includes('scope-stay-demo'));
    assert.ok(!css.includes('.scope-banner.demo'));
  });

  await record('02 — resolveClientMode force live meme via URL/storage', async () => {
    assert.strictEqual(L.resolveClientMode({ search: '' }), 'live');
    assert.strictEqual(L.resolveClientMode({ search: '?mode=demo', sessionLive: true }), 'live');
    assert.strictEqual(L.resolveClientMode({ search: '?mode=live', sessionLive: false }), 'live');
  });

  await record('03 — non authentifie rend uniquement le login', async () => {
    const env = hooks(async () => { throw { status: 401, error: 'unauthorized' }; });
    env.api.render();
    assert.ok(env.root.innerHTML.includes('scope-login-v1'));
    assert.ok(env.root.innerHTML.includes('Vérification de la session'));
    assert.ok(!env.root.innerHTML.includes('scope-sidebar'));
    assert.ok(!env.root.innerHTML.includes('Centre de pilotage'));
    const ok = await env.api.ensureLiveSession();
    env.api.render();
    assert.strictEqual(ok, false);
    assert.ok(env.root.innerHTML.includes('Connexion SCOPE'));
    assert.ok(env.root.innerHTML.includes('Se connecter avec Okta'));
    assert.ok(!env.sessionStorage.map.has('scope-live-confirmed'));
  });

  await record('04 — authentifie rend l app et le vrai utilisateur', async () => {
    const env = hooks(async () => ({
      user: {
        displayName: 'Alice Martin',
        roles: ['GESTIONNAIRE'],
        permissions: ['dashboard:read', 'personnel:read']
      }
    }), { hash: '#/accueil' });
    const ok = await env.api.ensureLiveSession();
    env.api.render();
    assert.strictEqual(ok, true);
    assert.strictEqual(env.api.userLabel(), 'Alice Martin');
    assert.ok(env.idle.started);
    assert.ok(!env.root.innerHTML.includes('Connexion SCOPE'));
    assert.ok(env.root.innerHTML.includes('Alice Martin'));
    assert.ok(!env.root.innerHTML.includes('Profil SCOPE'));
  });

  await record('05 — route directe non auth reste refusee', async () => {
    const env = hooks(async () => { throw { status: 401, error: 'unauthorized' }; }, { hash: '#/personnel/42' });
    env.api.render();
    assert.ok(env.root.innerHTML.includes('scope-login-v1'));
    assert.ok(!env.root.innerHTML.includes('Fiche individuelle'));
  });

  await record('06 — erreur auth ne retombe pas en DEMO', async () => {
    const env = hooks(async () => { throw { status: 500, error: 'auth_unavailable', message: 'Service auth indisponible.' }; });
    const ok = await env.api.ensureLiveSession();
    env.api.render();
    assert.strictEqual(ok, false);
    assert.ok(env.root.innerHTML.includes('Service auth indisponible.'));
    assert.ok(!env.root.innerHTML.includes('Mode démonstration'));
    assert.ok(!env.root.innerHTML.includes('scope-sidebar'));
  });

  await record('07 — logout nettoie local et retourne vers SCOPE sans mode', async () => {
    const env = hooks(async () => ({ user: { displayName: 'Bob Dupont', roles: ['UTILISATEUR'], permissions: [] } }));
    env.sandbox.fetch = async () => ({ ok: true });
    await env.api.ensureLiveSession();
    await env.api.logoutScopeSession();
    assert.strictEqual(env.sandbox.location.href, '/auth/logout?returnTo=%2Fscope.html');
    assert.ok(!env.sessionStorage.map.has('scope-live-confirmed'));
    assert.ok(!env.localStorage.map.has('scope_auth_idle_last_activity'));
  });

  await record('08 — responsive login present desktop/mobile', async () => {
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('.scope-login-v1'));
    assert.ok(css.includes('grid-template-columns: minmax(320px, 36%) minmax(0, 1fr)'));
    assert.ok(css.includes('@media (max-width: 960px)'));
    assert.ok(css.includes('@media (max-width: 560px)'));
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
