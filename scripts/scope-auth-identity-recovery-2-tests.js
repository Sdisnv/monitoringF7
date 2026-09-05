#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const identity = require('../netlify/functions/_auth-identity');
const L = require('../assets/js/scope-ui-logic.js');
const api = require('../assets/js/scope-api.js');

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function memoryStorage(initial){
  const map = new Map(Object.entries(initial || {}));
  return {
    map,
    getItem(k){ return map.has(k) ? map.get(k) : null; },
    setItem(k, v){ map.set(k, String(v)); },
    removeItem(k){ map.delete(k); }
  };
}

function headers(contentType){
  return { get(name){ return String(name).toLowerCase() === 'content-type' ? contentType : ''; } };
}

function jsonResponse(status, payload){
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: headers('application/json'),
    async json(){ return payload; },
    async text(){ return JSON.stringify(payload); }
  };
}

function uiHarness(fetchImpl, rawFetch){
  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const sessionStorage = memoryStorage({ 'scope-live-confirmed': '1', 'scope-include-qualification': '1' });
  const localStorage = memoryStorage({ scope_auth_idle_last_activity: '123' });
  const root = {
    classList: { toggle(){}, remove(){} },
    innerHTML: '',
    querySelectorAll(){ return []; },
    querySelector(){ return null; }
  };
  const idle = {
    stopped: false,
    started: false,
    AUTH_IDLE_STORAGE_KEY: 'scope_auth_idle_last_activity',
    start(){ this.started = true; },
    stop(){ this.stopped = true; },
    isStarted(){ return this.started; }
  };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeApi: { createHttpClient: () => ({ kind: 'http', sessionMe: fetchImpl }) },
      ScopeDemo: { createDemoClient: () => ({ kind: 'demo' }) },
      ScopeAuthIdle: idle,
      __SCOPE_UI_TEST_HOOKS__: true,
      CurrentRoles: ['ADMINISTRATEUR'],
      CurrentPermissions: ['admin:manage'],
      addEventListener(){},
      sessionStorage,
      localStorage
    },
    document: {
      getElementById(id){ return id === 'scope-root' ? root : null; },
      addEventListener(){},
      dispatchEvent(){},
      querySelectorAll(){ return []; },
      querySelector(){ return null; }
    },
    location: { hash: '#/accueil', search: '?mode=live', href: '' },
    sessionStorage,
    localStorage,
    console,
    clearTimeout,
    setTimeout,
    URLSearchParams,
    Blob,
    Event: function Event(type){ this.type = type; },
    fetch: rawFetch || (async () => jsonResponse(200, { ok: true })),
    require,
    module: { exports: {} },
    exports: {}
  };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(uiSrc, sandbox, { filename: 'scope-ui.js' });
  return { hooks: sandbox.window.ScopeUiTestHooks, root, sessionStorage, localStorage, window: sandbox.window, location: sandbox.location };
}

(async () => {
  await record('A /auth/me 401 => session frontend deconnectee', async () => {
    const { hooks } = uiHarness(async () => { const err = new Error('Token invalide.'); err.status = 401; throw err; });
    hooks.state.session = { displayName: 'Ancien Utilisateur', roles: ['ADMINISTRATEUR'], permissions: ['admin:manage'] };
    const okSession = await hooks.ensureLiveSession();
    eq(okSession, false);
    eq(hooks.state.session, null);
    eq(hooks.state.needOkta, true);
  });

  await record('B /auth/me 401 => aucune vue metier rendue', async () => {
    const { hooks, root } = uiHarness(async () => { const err = new Error('Token invalide.'); err.status = 401; throw err; });
    await hooks.ensureLiveSession();
    hooks.render();
    ok(root.innerHTML.includes('Connexion requise'));
    ok(!root.innerHTML.includes('scope-sidebar'));
    ok(!root.innerHTML.includes('Centre de pilotage'));
  });

  await record('C /auth/me 401 => aucune identite precedente conservee', async () => {
    const { hooks, root } = uiHarness(async () => { const err = new Error('Token invalide.'); err.status = 401; throw err; });
    hooks.state.session = { displayName: 'SCOPE', roles: ['ADMINISTRATEUR'], permissions: ['admin:manage'] };
    await hooks.ensureLiveSession();
    hooks.render();
    ok(!root.innerHTML.includes('scope-user'));
    ok(!root.innerHTML.includes('ADMINISTRATEUR'));
  });

  await record('D chaine SCOPE rejetee comme displayName utilisateur', () => {
    eq(identity.isApplicationIdentity('SCOPE'), true);
    eq(identity.resolveHumanIdentity({ displayName: 'SCOPE' }), '');
  });

  await record('E claims.name SCOPE + given/family valides => given/family utilises', () => {
    eq(identity.displayNameFromClaims({ name: 'SCOPE', given_name: 'Thierry', family_name: 'Grunig' }), 'Thierry Grunig');
  });

  await record('F aucun claim humain valable => pas de faux utilisateur fabrique', () => {
    eq(identity.displayNameFromClaims({ name: 'SCOPE', iss: 'https://issuer.example', aud: 'scope-client' }), '');
  });

  await record('G logout => nettoyage integral etat frontend', () => {
    const { hooks } = uiHarness(async () => ({ ok: true }));
    hooks.state.session = { displayName: 'Thierry Grunig', roles: ['ADMINISTRATEUR'], permissions: ['admin:manage'] };
    hooks.state.list = [{ id: 'secret' }];
    hooks.state.personnelDirectory = { rows: [{ nip: '1' }] };
    hooks.clearScopeSession();
    eq(hooks.state.session, null);
    eq(hooks.state.list.length, 0);
    eq(hooks.state.personnelDirectory, null);
  });

  await record('H logout => endpoint serveur appele', async () => {
    const calls = [];
    const { hooks } = uiHarness(async () => ({ ok: true }), async (url, opts) => {
      calls.push({ url, method: opts && opts.method });
      return jsonResponse(200, { ok: true });
    });
    await hooks.logoutScopeSession();
    ok(calls.some((call) => call.url === '/auth/logout' && call.method === 'POST'));
  });

  await record('I logout => retour ecran connexion', async () => {
    const { hooks, location } = uiHarness(async () => ({ ok: true }));
    await hooks.logoutScopeSession();
    ok(String(location.href).includes('/auth/logout?returnTo='));
    ok(String(location.href).includes('scope.html'));
  });

  await record('J reconnexion => identite correcte restauree', async () => {
    const { hooks } = uiHarness(async () => ({ user: { displayName: 'Alice Martin', roles: ['GESTIONNAIRE'], permissions: ['dashboard:read'] } }));
    const okSession = await hooks.ensureLiveSession();
    eq(okSession, true);
    eq(hooks.userLabel(), 'Alice Martin');
  });

  await record('K ancienne identite ne survit jamais a nouvelle session', async () => {
    const { hooks } = uiHarness(async () => ({ user: { displayName: 'Alice Martin', roles: ['UTILISATEUR'], permissions: [] } }));
    hooks.state.session = { displayName: 'Ancien Utilisateur', roles: ['ADMINISTRATEUR'], permissions: ['admin:manage'] };
    await hooks.ensureLiveSession();
    eq(hooks.state.session.displayName, 'Alice Martin');
    ok(!hooks.userLabel().includes('Ancien'));
  });

  await record('L 401 API metier apres boot => invalidation globale session', async () => {
    let invalidated = 0;
    const client = api.createHttpClient({
      baseUrl: '/api/scope',
      onUnauthorized(){ invalidated += 1; }
    });
    global.fetch = async () => jsonResponse(401, { ok: false, error: 'unauthorized', message: 'Token invalide.' });
    try { await client.dashboard({ year: 2026 }); } catch (_error) {}
    delete global.fetch;
    eq(invalidated, 1);
  });

  await record('M permissions/roles vides apres invalidation', () => {
    const { hooks, window } = uiHarness(async () => ({ ok: true }));
    hooks.invalidateScopeSession('test');
    eq(window.CurrentRoles.length, 0);
    eq(window.CurrentPermissions.length, 0);
  });

  await record('N sessionStorage/localStorage concernes nettoyes', () => {
    const { hooks, sessionStorage, localStorage } = uiHarness(async () => ({ ok: true }));
    hooks.invalidateScopeSession('test');
    eq(sessionStorage.map.has('scope-live-confirmed'), false);
    eq(sessionStorage.map.has('scope-include-qualification'), false);
    eq(localStorage.map.has('scope_auth_idle_last_activity'), false);
  });

  await record('O controleur idle/session stoppe', () => {
    const { hooks, window } = uiHarness(async () => ({ ok: true }));
    hooks.invalidateScopeSession('test');
    eq(window.ScopeAuthIdle.stopped, true);
  });

  await record('P absence de fallback dangereux vers SCOPE', () => {
    const sources = [
      fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'assets/js/auth.js'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'assets/js/session-service.js'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_auth-utils.js'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_oidc-utils.js'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'netlify/functions/_user-store.js'), 'utf8')
    ].join('\n');
    ok(!/displayName\s*\|\|\s*['"]SCOPE['"]/.test(sources));
    ok(!/userName\s*\|\|\s*['"]SCOPE['"]/.test(sources));
    ok(!/name\s*\|\|\s*['"]SCOPE['"]/.test(sources));
    ok(!/Utilisateur SCOPE/.test(sources));
  });

  await record('Q aucune session invalide comme session partielle', () => {
    const { hooks, root } = uiHarness(async () => ({ ok: true }));
    hooks.state.session = { displayName: 'SCOPE', roles: ['UTILISATEUR'], permissions: ['dashboard:read'] };
    hooks.invalidateScopeSession('test');
    hooks.render();
    ok(root.innerHTML.includes('Connexion requise'));
    ok(!root.innerHTML.includes('scope-user-block'));
    ok(!root.innerHTML.includes('scope-sidebar'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
  console.log('SCOPE-AUTH-IDENTITY-RECOVERY-2: PASS');
})();
