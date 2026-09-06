#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const logic = require('../assets/js/scope-ui-logic.js');
const charts = require('../assets/js/scope-charts.js');
const uiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const apiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const personServiceSource = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-person-service.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');

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
    removeAttribute(){},
    focus(){}
  };
}

function uiHooks(hash){
  const root = makeNode();
  const location = { hash: hash || '#/statistiques', search: '', pathname: '/scope.html', hostname: 'scope-sdisnv.netlify.app' };
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
      ScopeCharts: charts,
      ScopePersonnelReferentials: { gradeRank(value){ return { Cap: 80, Lt: 40, Sgt: 90 }[String(value || '')] ?? 1000; } },
      CurrentRoles: [],
      CurrentPermissions: [],
      MonitoringRBAC: { has(permission){ return permission === 'personnel:read'; } },
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

function sampleDashboard(){
  const official = {
    percentage: 80,
    numerator: 16,
    denominator: 20,
    eventCount: 3,
    volumes: { presents: 16, excuses: 2, nonExcuses: 2, dispenses: 1 },
    objective: { thresholdPct: 85, scope: 'GLOBAL' },
    gapPct: -5,
    analyticStatus: 'VIGILANCE'
  };
  return {
    period: { from: '2026-01-01', to: '2026-12-31', preset: 'YEAR' },
    scope: {},
    officiel: official,
    domaines: [
      { code: 'DPS', libelle: 'DPS', libelleAffiche: 'DPS', officiel: Object.assign({}, official, { percentage: 90, numerator: 9, denominator: 10, volumes: { presents: 9, excuses: 1, nonExcuses: 0, dispenses: 0 }, gapPct: 5 }) },
      { code: 'DAP', libelle: 'DAP', libelleAffiche: 'DAP', officiel: Object.assign({}, official, { percentage: 55, numerator: 11, denominator: 20, volumes: { presents: 11, excuses: 0, nonExcuses: 9, dispenses: 2 }, gapPct: -30 }) }
    ],
    cibles: [
      { cibleId: 'cible-y4', domaineCode: 'DAP', niveauCode: 'Y4', libelle: 'Y4', officiel: Object.assign({}, official, { percentage: 55, numerator: 11, denominator: 20, gapPct: -30 }) }
    ],
    evenements: [
      { evenementId: 'ev-2', date: '2026-09-10', libelle: 'Exercice 80', domaine: 'DAP', modeSuivi: 'NOMINATIF', percentage: 80, numerator: 8, denominator: 10 },
      { evenementId: 'ev-1', date: '2026-03-10', libelle: 'Exercice 9', domaine: 'DPS', modeSuivi: 'NOMINATIF', percentage: 9, numerator: 1, denominator: 11 }
    ],
    timeseries: {
      officiel: [
        { month: '2026-03', percentage: 70, numerator: 7, denominator: 10, eventCount: 1 },
        { month: '2026-09', percentage: 80, numerator: 8, denominator: 10, eventCount: 1 }
      ],
      legacy: []
    },
    graphs: {},
    legacy: { eventCount: 0, points: [] },
    alerts: { alerts: [] }
  };
}

function samplePersonnel(){
  return {
    personnes: [
      {
        personneId: 'p2',
        grade: 'Cap',
        nom: 'Bravo',
        prenom: 'Anne',
        nip: '2002',
        oiActuel: 'DAP Y4',
        affectationPrincipale: { domaine: 'DAP', cible: 'Y4', label: 'DAP Y4' },
        autresAffectations: [{ domaine: 'FOSPEC', cible: 'AUTO VL', label: 'AUTO VL' }],
        affectationsOuvertes: [{ domaine: 'DAP', cible: 'Y4', label: 'DAP Y4' }, { domaine: 'FOSPEC', cible: 'AUTO VL', label: 'AUTO VL' }],
        taux: { percentage: 9, numerator: 1, denominator: 11, eventCount: 3, volumes: { presents: 1, excuses: 2, nonExcuses: 8, dispenses: 1 }, objective: { thresholdPct: 85 }, gapPct: -76, analyticStatus: 'VIGILANCE' }
      },
      {
        personneId: 'p1',
        grade: 'Lt',
        nom: 'Alpha',
        prenom: 'Marc',
        nip: '1001',
        oiActuel: 'DPS G1',
        affectationPrincipale: { domaine: 'DPS', cible: 'G1', label: 'DPS G1' },
        autresAffectations: [{ domaine: 'FOSPEC', cible: 'PR ABC', label: 'PR-ABC' }],
        affectationsOuvertes: [{ domaine: 'DPS', cible: 'G1', label: 'DPS G1' }, { domaine: 'FOSPEC', cible: 'PR ABC', label: 'PR-ABC' }],
        taux: { percentage: 80, numerator: 8, denominator: 10, eventCount: 2, volumes: { presents: 8, excuses: 1, nonExcuses: 1, dispenses: 0 }, objective: { thresholdPct: 85 }, gapPct: -5, analyticStatus: 'ATTENTION' }
      }
    ]
  };
}

(async () => {
  await record('01 — tri commun numérique, date suisse et stabilité', async () => {
    const rows = [{ label: 'B', taux: '80 %', date: '10.09.2026' }, { label: 'A', taux: '9 %', date: '02.01.2026' }, { label: 'C', taux: '80 %', date: '01.01.2026' }];
    assert.deepStrictEqual(logic.sortRows(rows, { key: 'taux', dir: 'asc' }, [{ key: 'taux', type: 'number', value: (row) => row.taux }]).map((row) => row.label), ['A', 'B', 'C']);
    assert.deepStrictEqual(logic.sortRows(rows, { key: 'date', dir: 'asc' }, [{ key: 'date', type: 'date', value: (row) => row.date }]).map((row) => row.label), ['C', 'A', 'B']);
  });

  await record('02 — Statistiques rend global, domaine, OI, objectif, évolution et individuel', async () => {
    const hooks = uiHooks('#/statistiques');
    hooks.state.referentiels.cibles = [{ cibleId: 'cible-y4', domaineCode: 'DAP', niveauCode: 'Y4' }];
    const html = hooks.renderStatistiquesHtml(sampleDashboard(), samplePersonnel());
    assert.ok(html.includes('Analyses'));
    assert.ok(html.includes('Taux global'));
    assert.ok(html.includes('Comparaison des périmètres'));
    assert.ok(html.includes('Événements officiels'));
    assert.ok(html.includes('Analyse individuelle'));
    assert.ok(html.includes('Objectif'));
    assert.ok(html.includes('+10,0 pts') || html.includes('+10.0 pts'));
    assert.ok(html.includes('DPS'));
    assert.ok(html.includes('DAP'));
    assert.ok(html.includes('AUTO VL'));
    assert.ok(html.includes('#/personnel/p1'));
    assert.ok(html.includes('scope-ui.js') === false, 'le hook rend le fragment, pas le HTML shell');
  });

  await record('03 — filtres Analyses domaine/OI/spécialisation et includeQualification sont branchés', async () => {
    assert.ok(apiSource.includes('analyticsPersonnelDirectory(params)'));
    assert.ok(uiSource.includes("id=\"analysis-domaine\""));
    assert.ok(uiSource.includes("id=\"analysis-cible\""));
    assert.ok(uiSource.includes("id=\"analysis-specialisation\""));
    assert.ok(uiSource.includes("id=\"analysis-person-q\""));
    assert.ok(uiSource.includes("r.screen === 'vue' || r.screen === 'accueil' || r.screen === 'statistiques'"));
    assert.ok(uiSource.includes('includeQualification'));
    assert.ok(personServiceSource.includes('domaine: domaineFilter || undefined'));
    assert.ok(personServiceSource.includes('cibleId: query.cibleId'));
  });

  await record('04 — tri Vigilance par priorité, valeur, écart; Action non triable', async () => {
    const hooks = uiHooks('#/vigilance');
    const html = hooks.renderVigilanceHtml({
      counts: { active: 2, people: 2, data: 0, p2: 0 },
      alerts: [
        { level: 'P1', code: 'SOUS_OBJECTIF', domainCode: 'DPS', title: 'Bravo', message: '80 %', metadata: { grade: 'Cap', nom: 'Bravo', prenom: 'Anne', vigilanceType: 'SOUS_OBJECTIF', percentage: 80, thresholdPct: 85, gapPct: -5 } },
        { level: 'P0', code: 'ABSENCE_NON_EXCUSEE', domainCode: 'DAP', title: 'Alpha', message: '9 %', metadata: { grade: 'Lt', nom: 'Alpha', prenom: 'Marc', vigilanceType: 'ABSENCE_NON_EXCUSEE', absenceCount: 9 } }
      ]
    });
    assert.ok(html.includes('data-scope-sort="vigilance" data-sort-key="priorite"'));
    assert.ok(html.includes('data-scope-sort="vigilance" data-sort-key="valeur"'));
    assert.ok(html.includes('data-scope-sort="vigilance" data-sort-key="ecart"'));
    assert.ok(!/data-scope-sort="vigilance" data-sort-key="action"/.test(html));
    assert.ok(html.indexOf('Alpha') < html.indexOf('Bravo'), 'P0 doit précéder P1 par défaut');
  });

  await record('05 — Cycles et Analyses utilisent le helper sortable commun', async () => {
    ['cycles', 'cycle-events', 'cycle-people', 'cycle-matrix', 'analyses', 'analyses-events', 'analyses-people'].forEach((table) => {
      assert.ok(uiSource.includes(`sortableHeader('${table}'`), table);
      assert.ok(uiSource.includes(`table === '${table}'`), table);
    });
    assert.ok(uiSource.includes('gradeRank(row && row.grade)'));
  });

  await record('06 — cache et suite branchés', async () => {
    assert.ok(htmlSource.includes('scope-ui.js?v=scope-domaines-rapports-close-1') || htmlSource.includes('scope-ui.js?v=scope-nav-convergence-1') || htmlSource.includes('scope-ui.js?v=scope-analyses-statistiques-1') || htmlSource.includes('scope-ui.js?v=scope-admin-rbac-doc-1'));
    assert.ok(pkg.includes('scope-analyses-statistiques-1-tests.js'));
  });

  console.log(`\nSCOPE-ANALYSES-STATISTIQUES-1: ${passed} tests PASS`);
})();
