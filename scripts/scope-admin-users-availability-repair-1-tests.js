#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

process.env.MONITORING_F7_AUTH_SECRET = 'scope-admin-users-availability-repair-secret';
process.env.MONITORING_F7_AUTH_USERS = '[]';

const logic = require('../assets/js/scope-ui-logic.js');
const authUtils = require('../netlify/lib/_auth-utils.js');
const userStore = require('../netlify/lib/_user-store.js');
const auditStore = require('../netlify/lib/_audit-store.js');
const rbac = require('../netlify/lib/_rbac.js');
const adminUsersFunction = require('../netlify/functions/admin-users.js');

const htmlSource = read('scope.html');
const apiSource = read('assets/js/scope-api.js');
const uiSource = read('assets/js/scope-ui.js');
const adminUsersSource = read('netlify/functions/admin-users.js');
const userStoreSource = read('netlify/lib/_user-store.js');

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

function tokenFor(roles) {
  return authUtils.signToken({
    typ: 'access',
    sub: 'admin@example.test',
    email: 'admin@example.test',
    nip: 'admin@example.test',
    roles,
    permissions: [],
    provider: 'oidc',
    displayName: 'Admin Test'
  }, 3600);
}

function event(method, token, body) {
  return {
    httpMethod: method,
    headers: { authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function json(res) {
  return JSON.parse(res.body || '{}');
}

function installUserStoreMock(options = {}) {
  const users = (options.users || []).slice();
  userStore.getUserByIdentity = async () => options.identityUser === undefined ? null : options.identityUser;
  userStore.listUsers = async () => {
    if (options.listError) throw new Error(options.listError);
    return users;
  };
  userStore.getUser = async (subject) => users.find((user) => user.subject === subject) || null;
  userStore.upsertUser = async (input) => {
    if (options.upsertError) throw new Error(options.upsertError);
    const subject = String(input.subject || input.email || input.nip || '').toLowerCase();
    const saved = {
      subject,
      email: input.email || '',
      displayName: input.displayName || '',
      nip: input.nip || '',
      roles: rbac.normalizeRoles(input.roles || [input.role || 'UTILISATEUR']),
      role: rbac.dominantRole(input.roles || [input.role || 'UTILISATEUR']),
      permissions: rbac.permissionsForRoles(input.roles || [input.role || 'UTILISATEUR'], input.permissions || []),
      active: input.active !== false,
      lastLoginAt: null
    };
    const index = users.findIndex((user) => user.subject === subject);
    if (index >= 0) users[index] = saved;
    else users.push(saved);
    return saved;
  };
  auditStore.addAudit = async () => ({ ok: true });
  return users;
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

function uiHooks(apiClient, permissions = ['users:admin']) {
  const root = makeNode();
  const allowed = new Set(permissions || []);
  const storage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
  const location = { hash: '#/reglages/utilisateurs', search: '', pathname: '/scope.html', hostname: 'scope-sdisnv.netlify.app' };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn){ if (typeof fn === 'function') fn(); },
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
      ScopeApi: apiClient ? { createHttpClient(){ return apiClient; } } : null,
      CurrentRoles: ['ADMINISTRATEUR'],
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
  return { hooks: context.window.ScopeUiTestHooks, root };
}

(async () => {
  await record('01 - cause racine: client API admin-users cache-buste', async () => {
    assert.ok(apiSource.includes("listAdminUsers() { return directRequest('GET', '/.netlify/functions/admin-users'); }"));
    assert.ok(apiSource.includes("saveAdminUser(body) { return directRequest('POST', '/.netlify/functions/admin-users', body || {}); }"));
    assert.ok(htmlSource.includes('scope-api.js?v=scope-admin-users-availability-repair-1'));
    assert.ok(!htmlSource.includes('scope-api.js?v=scope-auth-idle-1'));
    assert.ok(uiSource.includes("state.adminUsersError = 'Gestion utilisateurs indisponible.'"));
  });

  await record('02 - ADMINISTRATEUR bootstrap autorise GET liste vide legitime', async () => {
    installUserStoreMock({ users: [] });
    const res = await adminUsersFunction.handler(event('GET', tokenFor(['ADMINISTRATEUR'])));
    const body = json(res);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(body.users, []);
    assert.deepStrictEqual(body.roles, ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR']);
    assert.ok(body.rolePermissions.ADMINISTRATEUR.includes('users:admin'));
  });

  await record('03 - non admin refuse par API en 403 sans permission detournee', async () => {
    installUserStoreMock({ users: [] });
    const res = await adminUsersFunction.handler(event('GET', tokenFor(['UTILISATEUR'])));
    const body = json(res);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(body.error, 'forbidden');
    assert.ok(!/response && response\.status === 403[\s\S]{0,160}onUnauthorized/.test(apiSource), '403 ne doit pas declencher logout global');
    assert.strictEqual(logic.friendlyError({ status: 403, error: 'forbidden' }).okta, undefined);
  });

  await record('04 - UI liste vide: pas de message indisponible', async () => {
    const { hooks } = uiHooks({
      listAdminUsers: async () => ({ users: [], roles: ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR'], rolePermissions: rbac.ROLE_PERMISSIONS }),
      saveAdminUser: async () => ({ ok: true })
    });
    await hooks.loadAdminUsers();
    const html = hooks.renderUtilisateursHtml();
    assert.ok(html.includes('Aucun profil applicatif enregistré.'));
    assert.ok(!html.includes('Gestion utilisateurs indisponible.'));
    assert.ok(html.includes('Ajouter un profil applicatif'));
  });

  await record('05 - UI erreur backend: erreur controlee, pas de fausse liste vide', async () => {
    const { hooks } = uiHooks({
      listAdminUsers: async () => { throw { status: 500, error: 'admin_users_failed', message: 'Base utilisateurs indisponible' }; },
      saveAdminUser: async () => ({ ok: true })
    });
    await assert.rejects(() => hooks.loadAdminUsers());
    const html = hooks.renderUtilisateursHtml();
    assert.ok(html.includes('Base utilisateurs indisponible'));
    assert.ok(!html.includes('Aucun profil applicatif enregistré.'));
  });

  await record('06 - UI ancien client reproduit le symptome et reste detectable', async () => {
    const { hooks } = uiHooks({ sessionMe: async () => ({ ok: true }) });
    await hooks.loadAdminUsers();
    const html = hooks.renderUtilisateursHtml();
    assert.ok(html.includes('Gestion utilisateurs indisponible.'));
    assert.ok(!html.includes('Aucun profil applicatif enregistré.'));
  });

  await record('07 - CRUD existant: create update active passent par admin-users', async () => {
    const store = installUserStoreMock({ users: [] });
    const adminToken = tokenFor(['ADMINISTRATEUR']);
    const create = await adminUsersFunction.handler(event('POST', adminToken, {
      subject: 'user@example.test',
      email: 'user@example.test',
      displayName: 'User Test',
      role: 'GESTIONNAIRE',
      active: true
    }));
    assert.strictEqual(create.statusCode, 200);
    assert.strictEqual(json(create).user.role, 'GESTIONNAIRE');
    const update = await adminUsersFunction.handler(event('POST', adminToken, {
      subject: 'user@example.test',
      email: 'user@example.test',
      displayName: 'User Test',
      roles: ['UTILISATEUR'],
      active: false
    }));
    assert.strictEqual(update.statusCode, 200);
    assert.strictEqual(json(update).user.active, false);
    assert.strictEqual(store.length, 1);
  });

  await record('08 - source utilisateurs reste monitoring_f7_user_profiles, sans Personne fallback', async () => {
    assert.ok(userStoreSource.includes('monitoring_f7_user_profiles'));
    assert.ok(!/scope_personnes|scope_affectations/i.test(userStoreSource));
    assert.ok(adminUsersSource.includes("requirePermission(claims, 'users:admin')"));
    assert.ok(!/admin:users/.test(adminUsersSource + apiSource + uiSource));
    assert.deepStrictEqual(rbac.KNOWN_ROLES, ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR']);
  });

  console.log(`\nSCOPE-ADMIN-USERS-AVAILABILITY-REPAIR-1: ${passed} tests PASS`);
})();
