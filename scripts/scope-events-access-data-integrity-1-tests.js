#!/usr/bin/env node
'use strict';

/** SCOPE-EVENTS-ACCESS-DATA-INTEGRITY-1 — accès Événements + URL OIDC propre. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const L = require('../assets/js/scope-ui-logic.js');
const api = require('../assets/js/scope-api.js');
const results = [];

function record(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
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

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return String(name).toLowerCase() === 'content-type' ? 'application/json' : ''; } },
    async json() { return payload; },
    async text() { return JSON.stringify(payload); }
  };
}

function uiHarness(locationInput) {
  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const root = {
    classList: { toggle() {}, remove() {} },
    innerHTML: '',
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
  const location = Object.assign({
    pathname: '/scope.html',
    search: '',
    hash: '#/accueil',
    hostname: 'scope-sdisnv.netlify.app',
    href: ''
  }, locationInput || {});
  const replaceCalls = [];
  const history = {
    replaceState(_state, _title, url) {
      replaceCalls.push(url);
      const parsed = new URL(url, 'https://scope-sdisnv.netlify.app');
      location.pathname = parsed.pathname;
      location.search = parsed.search;
      location.hash = parsed.hash;
    }
  };
  const sessionStorage = memoryStorage();
  const localStorage = memoryStorage();
  const idle = { started: false, stopped: false, start() { this.started = true; }, stop() { this.stopped = true; } };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeApi: { createHttpClient: () => ({
        kind: 'http',
        sessionMe: async () => ({ user: { displayName: 'Alice Martin', roles: ['GESTIONNAIRE'], permissions: ['dashboard:read', 'personnel:read'] } })
      }) },
      ScopeAuthIdle: idle,
      __SCOPE_UI_TEST_HOOKS__: true,
      CurrentRoles: [],
      CurrentPermissions: [],
      addEventListener() {},
      sessionStorage,
      localStorage,
      history
    },
    document: {
      getElementById(id) { return id === 'scope-root' ? root : null; },
      addEventListener() {},
      dispatchEvent() {},
      querySelectorAll() { return []; },
      querySelector() { return null; }
    },
    location,
    history,
    sessionStorage,
    localStorage,
    console,
    clearTimeout,
    setTimeout,
    URL,
    URLSearchParams,
    Event: function Event(type) { this.type = type; }
  };
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(uiSrc, sandbox, { filename: 'scope-ui.js' });
  return { api: sandbox.window.ScopeUiTestHooks, root, location, replaceCalls };
}

(async () => {
  await record('01 — route Événements mappee vers la liste sans route speciale', () => {
    assert.deepStrictEqual(L.parseHash('#/evenements'), { screen: 'liste', nav: 'exercices' });
    assert.deepStrictEqual(L.parseHash('#/exercices'), { screen: 'liste', nav: 'exercices' });
    assert.deepStrictEqual(L.parseHash('#/statistiques'), { screen: 'statistiques', nav: 'statistiques' });
    const nav = L.buildSidebarNav([], { nav: 'accueil' });
    assert.strictEqual(nav.primary.find((item) => item.id === 'exercices').href, '#/evenements');
  });

  await record('02 — URL callback residuel nettoyee avant navigation metier', () => {
    const clean = L.cleanAuthenticatedScopeUrl({
      pathname: '/scope.html',
      search: '?code=abc&state=xyz&mode=live&authError=1&reason=callback',
      hash: '#/evenements',
      hostname: 'scope-sdisnv.netlify.app'
    });
    assert.strictEqual(clean, '/#/evenements');
  });

  await record('03 — nettoyage conserve les parametres non auth', () => {
    const clean = L.cleanAuthenticatedScopeUrl({
      pathname: '/scope.html',
      search: '?code=abc&year=2026&state=xyz',
      hash: '#/statistiques',
      hostname: 'localhost'
    });
    assert.strictEqual(clean, '/scope.html?year=2026#/statistiques');
  });

  await record('04 — session valide remplace scope.html?code/state#/evenements par /#/evenements', async () => {
    const env = uiHarness({
      pathname: '/scope.html',
      search: '?code=okta-code&state=oidc-state',
      hash: '#/evenements',
      hostname: 'scope-sdisnv.netlify.app'
    });
    const ok = await env.api.ensureLiveSession();
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(env.replaceCalls, ['/#/evenements']);
    assert.strictEqual(`${env.location.pathname}${env.location.search}${env.location.hash}`, '/#/evenements');
  });

  await record('05 — login direct Événements conserve la route demandee dans returnTo', () => {
    const env = uiHarness({ hash: '#/evenements' });
    env.api.state.authChecking = false;
    env.api.state.needOkta = true;
    env.api.render();
    assert.ok(env.root.innerHTML.includes('/auth/oidc/start?returnTo=%2Fscope.html%23%2Fevenements'));
  });

  await record('06 — erreur API 403 Événements ne declenche pas une invalidation session', async () => {
    let invalidated = 0;
    const client = api.createHttpClient({
      onUnauthorized() { invalidated += 1; }
    });
    global.fetch = async () => jsonResponse(403, { ok: false, error: 'forbidden', message: 'Interdit.' });
    try { await client.listEvenements({ annee: 2026 }); } catch (_error) {}
    delete global.fetch;
    assert.strictEqual(invalidated, 0);
  });

  await record('07 — erreur API 401 Événements reste une vraie invalidation auth', async () => {
    let invalidated = 0;
    const client = api.createHttpClient({
      onUnauthorized() { invalidated += 1; }
    });
    global.fetch = async () => jsonResponse(401, { ok: false, error: 'unauthorized', message: 'Token invalide.' });
    try { await client.listEvenements({ annee: 2026 }); } catch (_error) {}
    delete global.fetch;
    assert.strictEqual(invalidated, 1);
  });

  await record('08 — rendu #/evenements sans ReferenceError report', () => {
    const env = uiHarness({ hash: '#/evenements' });
    env.api.state.authChecking = false;
    env.api.state.needOkta = false;
    env.api.state.listReady = true;
    env.api.state.listError = null;
    env.api.state.list = [{
      evenement: {
        evenement_id: 'EVT-1',
        date: '2026-08-19',
        statut: 'PLANIFIE',
        origine: 'SCOPE',
        libelle: 'Exercice test',
        domaine_code: 'DPS',
        population_figee: true
      },
      cibles: ['G1'],
      attendusInclus: 1,
      compteurs: { presents: 0, percentage: null }
    }];
    assert.doesNotThrow(() => env.api.render(), /report is not defined|ReferenceError/);
    assert.ok(env.root.innerHTML.includes('Événements'));
    assert.ok(env.root.innerHTML.includes('Exercice test'));
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    console.error(`SCOPE-EVENTS-ACCESS-DATA-INTEGRITY-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENTS-ACCESS-DATA-INTEGRITY-1: ${results.length} PASS`);
})();
