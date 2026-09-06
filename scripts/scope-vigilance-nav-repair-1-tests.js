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
  { code: 'DAP', libelleAffiche: 'DAP', cibles: [{ domaineCode: 'DAP', niveauCode: 'Y1' }] },
  { code: 'JSP', libelleAffiche: 'JSP', cibles: [{ domaineCode: 'JSP', niveauCode: 'B1' }] },
  { code: 'FOBA', libelleAffiche: 'FOBA', cibles: [{ domaineCode: 'FOBA', niveauCode: '1' }] },
  { code: 'FOCA', libelleAffiche: 'FOCA', cibles: [{ domaineCode: 'FOCA', niveauCode: 'I' }] },
  { code: 'FOSPEC', libelleAffiche: 'FOSPEC', cibles: [{ domaineCode: 'FOSPEC', niveauCode: 'PR' }] }
];

let passed = 0;

async function record(name, fn){
  try{
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }catch(error){
    console.error(`FAIL ${name}`);
    console.error(error && error.stack || error);
    process.exit(1);
  }
}

function makeNode(attrs = {}){
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
    removeAttribute(){}
  };
}

function uiHooks(hash){
  const root = makeNode();
  const location = { hash: hash || '#/vigilance', search: '', pathname: '/scope.html', hostname: 'scope-sdisnv.netlify.app' };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn){ if(typeof fn === 'function') fn(); },
    encodeURIComponent,
    URLSearchParams,
    Event: function Event(type){ this.type = type; },
    location,
    localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
    sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} },
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
      CurrentPermissions: [],
      location,
      history: { replaceState(){} },
      addEventListener(){},
      scrollTo(){},
      document: null,
      localStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
    }
  };
  context.window.document = context.document;
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(uiSource, context, { filename: 'scope-ui.js' });
  return context.window.ScopeUiTestHooks;
}

(async () => {
  await record('01 — modèle commun contient Vigilance toujours visible', async () => {
    const nav = logic.buildSidebarNav(sampleArbre, { screen: 'vigilance', nav: 'vigilance' });
    const item = nav.primary.find((row) => row.id === 'vigilance');
    assert.ok(item, 'entrée Vigilance absente du modèle primaire');
    assert.strictEqual(item.href, '#/vigilance');
    assert.strictEqual(item.current, true);
    assert.ok(!item.permission, 'Vigilance ne doit pas dépendre d’une permission spécifique');
  });

  await record('02 — route directe reconnue sans retour accueil', async () => {
    const route = logic.parseHash('#/vigilance');
    assert.deepStrictEqual(route, { screen: 'vigilance', nav: 'vigilance' });
    assert.strictEqual(logic.parseHash('#/accueil').screen, 'accueil');
    assert.strictEqual(logic.parseHash('#/evenements').screen, 'liste');
    assert.strictEqual(logic.parseHash('#/cycles').screen, 'cycles');
    assert.strictEqual(logic.parseHash('#/statistiques').screen, 'statistiques');
    assert.strictEqual(logic.parseHash('#/rapports').screen, 'rapports');
  });

  await record('03 — shell rend le menu actif et la page vide avec 0 alerte', async () => {
    const hooks = uiHooks('#/vigilance');
    hooks.state.referentiels.arbre = sampleArbre;
    hooks.state.referentiels.domaines = sampleArbre;
    const shell = hooks.renderShellHtml('#/vigilance', {
      counts: { active: 0, people: 0, data: 0, p2: 0 },
      alerts: []
    });
    assert.ok(shell.includes('href="#/vigilance"'), 'href menu Vigilance absent');
    assert.ok(shell.includes('Vigilance participation'), 'libellé Vigilance absent');
    assert.ok(/href="#\/vigilance" aria-current="page"/.test(shell), 'menu Vigilance non actif');
    assert.ok(shell.includes('À traiter · 0'), 'compteur zéro absent ou bloquant');
    assert.ok(shell.includes('Aucune situation de vigilance pour la période sélectionnée.'), 'état vide légitime absent');
  });

  await record('04 — cache-bust route vers le JS corrigé', async () => {
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-analyses-statistiques-1') || htmlSource.includes('scope-ui.js?v=scope-vigilance-nav-repair-1'));
  });

  console.log(`\nSCOPE-VIGILANCE-NAV-REPAIR-1: ${passed} tests PASS`);
})();
