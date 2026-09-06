#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const logic = require('../assets/js/scope-ui-logic.js');
const rbac = require('../netlify/lib/_rbac.js');
const uiSource = read('assets/js/scope-ui.js');
const apiSource = read('assets/js/scope-api.js');
const htmlSource = read('scope.html');
const navSource = read('assets/js/scope-ui-logic.js');
const scopeSource = read('netlify/functions/scope.js');
const adminUsersSource = read('netlify/functions/admin-users.js');
const usersSource = read('netlify/functions/users.js');
const adminSettingsSource = read('netlify/functions/admin-settings.js');
const authMeSource = read('netlify/functions/auth-me.js');
const userStoreSource = read('netlify/lib/_user-store.js');
const schemaSource = read('database/schema.sql');
const rbacDoc = read('docs/MATRICE_RBAC_V66.md');
const personnelAnalyzeSource = read('netlify/functions/scope-personnel-import-analyze.js');
const personnelCommitSource = read('netlify/functions/scope-personnel-import-commit.js');

const sampleArbre = [
  { code: 'DPS', libelleAffiche: 'DPS', cibles: [{ domaineCode: 'DPS', niveauCode: 'G1' }] },
  { code: 'DAP', libelleAffiche: 'DAP', cibles: [{ domaineCode: 'DAP', niveauCode: 'Y4' }] },
  { code: 'JSP', libelleAffiche: 'JSP', cibles: [{ domaineCode: 'JSP', niveauCode: 'B1' }] },
  { code: 'FOBA', libelleAffiche: 'FOBA', cibles: [{ domaineCode: 'FOBA', niveauCode: '1' }] },
  { code: 'FOCA', libelleAffiche: 'FOCA', cibles: [{ domaineCode: 'FOCA', niveauCode: 'I' }] },
  { code: 'FOSPEC', libelleAffiche: 'FOSPEC', sousDomaines: [{ code: 'PR', libelleAffiche: 'PR' }], cibles: [] }
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
  const storage = { getItem(){ return null; }, setItem(){}, removeItem(){} };
  const location = { hash: hash || '#/accueil', search: '', pathname: '/scope.html', hostname: 'scope-sdisnv.netlify.app' };
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
      ScopeApi: null,
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
  return { hooks: context.window.ScopeUiTestHooks, root };
}

function renderNav(hash, permissions) {
  const { hooks } = uiHooks(hash, permissions);
  hooks.state.referentiels.arbre = sampleArbre;
  hooks.state.referentiels.domaines = sampleArbre;
  return hooks.renderShellHtml(hash, { counts: {}, alerts: [] });
}

(async () => {
  await record('01 - menu Administration utile et sans entree Acces > Administration', async () => {
    const nav = logic.buildSidebarNav(sampleArbre, logic.parseHash('#/reglages/utilisateurs'));
    assert.deepStrictEqual(nav.groups.map((group) => group.id), ['activite', 'pilotage', 'administration']);
    const sections = nav.groups.find((group) => group.id === 'administration').sections;
    assert.deepStrictEqual(sections.map((section) => section.label), ['Application', 'Imports', 'Accès', '']);
    assert.deepStrictEqual(sections[0].items.map((item) => `${item.label}:${item.permission}`), ['Objectifs:references:manage', 'Suivi nominatif:personnel:manage']);
    assert.deepStrictEqual(sections[1].items.map((item) => `${item.label}:${item.permission}`), ['Événements:events:create', 'Personnel:personnel:manage']);
    assert.deepStrictEqual(sections[2].items.map((item) => `${item.label}:${item.permission}`), ['Utilisateurs:users:admin']);
    assert.ok(!nav.settings.some((item) => item.href === '#/reglages/administration'), 'entree redondante Administration presente dans Acces');
    assert.strictEqual(logic.parseHash('#/reglages/administration').screen, 'administration');
  });

  await record('02 - Personne et Utilisateur restent deux modeles separes', async () => {
    assert.ok(/create table if not exists scope_personnes/i.test(schemaSource));
    assert.ok(/create table if not exists monitoring_f7_user_profiles/i.test(schemaSource));
    assert.ok(/nip text not null unique/i.test(schemaSource), 'NIP personne attendu comme cle metier unique');
    assert.ok(/subject text primary key/i.test(schemaSource), 'subject utilisateur attendu comme identite auth');
    assert.ok(!/scope_personnes|scope_affectations/i.test(userStoreSource), 'user-store ne doit pas joindre le personnel metier');
    assert.ok(/getUserByIdentity\(\[claims\.sub, claims\.email, claims\.nip\]\)/.test(authMeSource + adminUsersSource + scopeSource));
    assert.ok(/Personne != Utilisateur/.test(rbacDoc));
    assert.ok(/ne crée pas de jointure fonctionnelle avec `scope_personnes`/.test(rbacDoc));
  });

  await record('03 - RBAC source de verite limite aux trois profils V1', async () => {
    assert.deepStrictEqual(rbac.KNOWN_ROLES, ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR']);
    assert.ok(rbac.hasPermission({ roles: ['UTILISATEUR'] }, 'personnel:read'));
    assert.ok(!rbac.hasPermission({ roles: ['UTILISATEUR'] }, 'users:admin'));
    assert.ok(!rbac.hasPermission({ roles: ['UTILISATEUR'] }, 'personnel:manage'));
    assert.ok(rbac.hasPermission({ roles: ['GESTIONNAIRE'] }, 'references:manage'));
    assert.ok(rbac.hasPermission({ roles: ['GESTIONNAIRE'] }, 'personnel:manage'));
    assert.ok(!rbac.hasPermission({ roles: ['GESTIONNAIRE'] }, 'users:admin'));
    assert.ok(rbac.hasPermission({ roles: ['ADMINISTRATEUR'] }, 'users:admin'));
    assert.ok(rbac.hasPermission({ roles: ['ADMINISTRATEUR'] }, 'settings:manage'));
    assert.deepStrictEqual(rbac.normalizeRoles(['sdis-admin', 'sdis-commandement', 'sdis-user']), ['ADMINISTRATEUR', 'GESTIONNAIRE', 'UTILISATEUR']);
  });

  await record('04 - frontend masque les surfaces sensibles sans creer de securite illusoire', async () => {
    const anonymousShell = renderNav('#/accueil', []);
    assert.ok(!anonymousShell.includes('href="#/reglages/objectifs"'), 'Objectifs visible sans references:manage');
    assert.ok(!anonymousShell.includes('href="#/reglages/suivi"'), 'Suivi visible sans personnel:manage');
    assert.ok(!anonymousShell.includes('href="#/reglages/import-personnel"'), 'Import personnel visible sans personnel:manage');
    assert.ok(!anonymousShell.includes('href="#/reglages/utilisateurs"'), 'Utilisateurs visible sans users:admin');
    assert.ok(anonymousShell.includes('href="#/reglages/apropos"'), 'A propos doit rester visible');
    const adminShell = renderNav('#/reglages/utilisateurs', ['references:manage', 'personnel:manage', 'events:create', 'users:admin', 'settings:manage', 'personnel:read']);
    assert.ok(adminShell.includes('href="#/reglages/utilisateurs"'));
    assert.ok(!adminShell.includes('href="#/reglages/administration"'), 'le menu ne doit pas afficher Acces > Administration');
  });

  await record('05 - Objectifs: lecture authentifiee, ecriture protegee references:manage', async () => {
    assert.ok(/method === 'GET' && path === '\/objectifs'[\s\S]*?objectives\.listObjectifs\(queryOf\(event\)\)/.test(scopeSource));
    assert.ok(/method === 'GET' && path === '\/objectifs\/resolution'[\s\S]*?objectives\.resolveObjectif\(queryOf\(event\)\)/.test(scopeSource));
    assert.ok(/method === 'POST' && path === '\/objectifs'[\s\S]*?hasPermission\(claims, 'references:manage'\)/.test(scopeSource));
    assert.ok(/method === 'PATCH'[\s\S]*?hasPermission\(claims, 'references:manage'\)/.test(scopeSource));
    assert.ok(/method === 'DELETE'[\s\S]*?hasPermission\(claims, 'references:manage'\)/.test(scopeSource));
    assert.ok(/listObjectifs\(params\).*\/objectifs/.test(apiSource));
    assert.ok(/createObjectif\(body\).*POST', '\/objectifs'/.test(apiSource));
  });

  await record('06 - Imports: evenements events:create et personnel personnel:manage', async () => {
    assert.ok(/\/imports\/evenements\/preview'[\s\S]*?hasPermission\(claims, 'events:create'\)/.test(scopeSource));
    assert.ok(/\/imports\/evenements\/commit'[\s\S]*?hasPermission\(claims, 'events:create'\)/.test(scopeSource));
    assert.ok(/requirePermission\(claims, 'personnel:manage'\)/.test(personnelAnalyzeSource));
    assert.ok(/requirePermission\(claims, 'personnel:manage'\)/.test(personnelCommitSource));
    assert.ok(/createdBy:claims\.sub \|\| claims\.email \|\| claims\.nip/.test(personnelAnalyzeSource));
    assert.ok(/syncExpectedPopulationFromNips/.test(personnelCommitSource));
  });

  await record('07 - Utilisateurs: page reelle adossee a admin-users et protegee users:admin', async () => {
    assert.ok(/listAdminUsers\(\).*admin-users/.test(apiSource));
    assert.ok(/saveAdminUser\(body\).*admin-users/.test(apiSource));
    assert.ok(/requirePermission\(claims, 'users:admin'\)/.test(adminUsersSource));
    assert.ok(/rolePermissions:ROLE_PERMISSIONS/.test(adminUsersSource));
    assert.ok(/own_admin_removal_requires_confirmation/.test(adminUsersSource));
    assert.ok(/user-create|user-update/.test(adminUsersSource));
    assert.ok(/requirePermission\(claims, 'users:admin'\)/.test(usersSource));
    assert.ok(!/scope_personnes|scope_affectations/i.test(adminUsersSource), 'admin-users ne doit pas administrer les personnes metier');
    const { hooks } = uiHooks('#/reglages/utilisateurs', ['users:admin']);
    hooks.state.adminUsersReady = true;
    hooks.state.adminRoles = ['UTILISATEUR', 'GESTIONNAIRE', 'ADMINISTRATEUR'];
    hooks.state.adminUsers = [{ subject: 'okta|123', email: 'chef@example.test', displayName: 'Chef SCOPE', nip: 'A-1', roles: ['ADMINISTRATEUR'], active: true }];
    const html = hooks.renderUtilisateursHtml();
    assert.ok(html.includes('Ajouter un profil applicatif'));
    assert.ok(html.includes('Profils autorisés'));
    assert.ok(html.includes('Chef SCOPE'));
    assert.ok(html.includes('Personne'));
    assert.ok(html.includes('Utilisateur'));
  });

  await record('08 - 401 et 403 conservent leur sens', async () => {
    assert.ok(/catch\(error\)\{\s*return response\(401, \{ ok:false, error:'unauthorized'/.test(authMeSource), 'auth-me doit garder 401 pour token invalide');
    assert.ok(/return response\(403, \{ ok:false, error:'user_disabled_or_unknown'/.test(authMeSource));
    assert.ok(/return response\(403, \{ ok:false, error:'user_disabled'/.test(authMeSource));
    assert.ok(/response && response\.status === 401/.test(apiSource));
    assert.ok(!/response && response\.status === 403[\s\S]{0,160}onUnauthorized/.test(apiSource), '403 ne doit pas declencher onUnauthorized');
    const info401 = logic.friendlyError({ status: 401, error: 'unauthorized' });
    const info403 = logic.friendlyError({ status: 403, error: 'forbidden' });
    assert.strictEqual(info401.okta, true);
    assert.strictEqual(info403.okta, undefined);
    assert.strictEqual(info403.title, 'Action non autorisée');
  });

  await record('09 - A propos et documentation sans exposition technique sensible', async () => {
    assert.ok(/function renderApropos\(\)/.test(uiSource));
    const aboutSlice = uiSource.slice(uiSource.indexOf('function renderApropos'), uiSource.indexOf('function renderNotFound'));
    assert.ok(/À propos de SCOPE/.test(aboutSlice));
    assert.ok(!/DATABASE_URL|OKTA_CLIENT_SECRET|MONITORING_F7_AUTH_SECRET|NETLIFY_DATABASE_URL/.test(aboutSlice));
    assert.ok(/settings:manage/.test(adminSettingsSource));
    assert.ok(/route technique directe/.test(rbacDoc));
    assert.ok(/Un masquage de menu n'est pas une protection de sécurité/.test(rbacDoc));
  });

  await record('10 - cache bust et suite dediee ADMIN-RBAC-DOC-1 branches', async () => {
    assert.ok(htmlSource.includes('scope-ui-logic.js?v=scope-admin-rbac-doc-1'));
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-front-finition-1') || htmlSource.includes('scope-ui.js?v=scope-admin-rbac-doc-1'));
    const pkg = JSON.parse(read('package.json'));
    assert.ok(pkg.scripts['test:scope'].includes('scripts/scope-admin-rbac-doc-1-tests.js'));
    assert.ok(!/sdis-admin` \| Administration complète/.test(rbacDoc), 'ancienne matrice legacy affichee comme contrat actuel');
    assert.ok(/UTILISATEUR/.test(navSource) === false, 'la navigation ne doit pas hardcoder les roles');
  });

  console.log(`\nSCOPE-ADMIN-RBAC-DOC-1: ${passed} tests PASS`);
})();
