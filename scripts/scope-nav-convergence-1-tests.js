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
  { code: 'JSP', libelleAffiche: 'JSP', cibles: [{ domaineCode: 'JSP', niveauCode: 'B1' }] },
  { code: 'FOBA', libelleAffiche: 'FOBA', cibles: [{ domaineCode: 'FOBA', niveauCode: '1' }] },
  { code: 'FOCA', libelleAffiche: 'FOCA', cibles: [{ domaineCode: 'FOCA', niveauCode: 'I' }] },
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
    checked: false,
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
  return context.window.ScopeUiTestHooks;
}

function renderNav(hash, permissions) {
  const hooks = uiHooks(hash, permissions);
  hooks.state.referentiels.arbre = sampleArbre;
  hooks.state.referentiels.domaines = sampleArbre;
  const shell = hooks.renderShellHtml(hash, { counts: { active: 0, people: 0, data: 0, p2: 0 }, alerts: [] });
  const match = shell.match(/<nav class="scope-nav-scroll">([\s\S]*?)<\/nav>/);
  assert.ok(match, 'navigation introuvable dans le shell');
  return match[1];
}

function groupState(nav, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = nav.match(new RegExp(`data-nav-group="${escaped}" aria-expanded="(true|false)"`));
  assert.ok(match, `groupe ${id} absent`);
  return match[1];
}

(async () => {
  await record('01 — modèle commun conforme au menu cible', async () => {
    const nav = logic.buildSidebarNav(sampleArbre, { screen: 'statistiques', nav: 'statistiques' });
    assert.strictEqual(nav.home.label, 'Accueil');
    assert.deepStrictEqual(nav.groups.map((group) => group.id), ['activite', 'pilotage', 'administration']);
    assert.deepStrictEqual(nav.groups[0].items.map((item) => `${item.label}:${item.href}`), ['Événements:#/evenements', 'Cycles:#/cycles']);
    assert.deepStrictEqual(nav.groups[1].items.map((item) => `${item.label}:${item.href}`), ['Vigilance:#/vigilance', 'Analyses:#/statistiques']);
    assert.deepStrictEqual(nav.direct.map((item) => `${item.label}:${item.href}`), ['Personnel:#/personnel', 'Rapports:#/rapports']);
    assert.ok(!nav.settings.some((item) => item.label === 'Droits et profils'), 'surface Droits et profils artificielle');
  });

  await record('02 — rendu menu sans grande section Domaines', async () => {
    const nav = renderNav('#/accueil', ['personnel:read', 'references:manage', 'personnel:manage', 'events:create', 'users:admin', 'settings:manage']);
    ['Accueil', 'Activité', 'Événements', 'Cycles', 'Pilotage', 'Vigilance', 'Analyses', 'Personnel', 'Rapports', 'Administration'].forEach((label) => {
      assert.ok(nav.includes(label), `${label} absent`);
    });
    assert.ok(!nav.includes('<p class="scope-nav-section">Domaines</p>'), 'section Domaines encore visible');
    assert.ok(!nav.includes('href="#/vue/'), 'liens domaines visibles dans le menu principal');
  });

  await record('03 — routes historiques conservées', async () => {
    assert.strictEqual(logic.parseHash('#/evenements').screen, 'liste');
    assert.strictEqual(logic.parseHash('#/cycles').screen, 'cycles');
    assert.strictEqual(logic.parseHash('#/vigilance').screen, 'vigilance');
    assert.strictEqual(logic.parseHash('#/statistiques').screen, 'statistiques');
    assert.strictEqual(logic.parseHash('#/personnel').screen, 'personnel');
    assert.strictEqual(logic.parseHash('#/rapports').screen, 'rapports');
    assert.deepStrictEqual(logic.parseHash('#/vue/FOSPEC/PR'), { screen: 'vue', nav: 'vue', domaine: 'FOSPEC', cible: 'PR' });
  });

  await record('04 — RBAC masque les entrées sensibles', async () => {
    const nav = renderNav('#/accueil', []);
    assert.ok(!nav.includes('href="#/personnel"'), 'Personnel direct visible sans personnel:read');
    assert.ok(!nav.includes('href="#/reglages/utilisateurs"'), 'Utilisateurs visible sans users:admin');
    assert.ok(!nav.includes('href="#/reglages/objectifs"'), 'Objectifs visible sans references:manage');
    assert.ok(nav.includes('href="#/reglages/apropos"'), 'À propos doit rester accessible');
  });

  await record('05 — état actif et accordéon exclusif', async () => {
    const nav = renderNav('#/statistiques', ['personnel:read']);
    assert.strictEqual(groupState(nav, 'pilotage'), 'true');
    assert.strictEqual(groupState(nav, 'activite'), 'false');
    assert.strictEqual(groupState(nav, 'administration'), 'false');
    assert.ok(/href="#\/statistiques" aria-current="page"[\s\S]*?<span>Analyses<\/span>/.test(nav), 'Analyses non actif');
    assert.strictEqual((nav.match(/aria-expanded="true"/g) || []).length, 1, 'plusieurs groupes ouverts');
  });

  await record('06 — aucun lien mort dans le menu visible', async () => {
    const nav = renderNav('#/accueil', ['personnel:read', 'references:manage', 'personnel:manage', 'events:create', 'users:admin', 'settings:manage']);
    const hrefs = [...nav.matchAll(/href="(#[^"]+)"/g)].map((match) => match[1]);
    assert.ok(hrefs.length >= 10, 'menu incomplet');
    hrefs.forEach((href) => {
      const route = logic.parseHash(href);
      assert.ok(href === '#/accueil' || route.screen !== 'accueil', `route invalide ou ambiguë: ${href}`);
    });
  });

  await record('07 — cache-bust NAV-CONVERGENCE branché', async () => {
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-nav-convergence-1') || htmlSource.includes('scope-ui.js?v=scope-domaines-rapports-close-1'));
  });

  console.log(`\nSCOPE-NAV-CONVERGENCE-1: ${passed} tests PASS`);
})();
