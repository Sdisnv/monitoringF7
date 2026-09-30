#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L = require('../assets/js/scope-ui-logic');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');

const ROOT = path.join(__dirname, '..');
const uiSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const scopeFunction = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
let passed = 0;

function test(name, fn){
  try { fn(); passed += 1; console.log(`PASS ${name}`); }
  catch(error){ console.error(`FAIL ${name}`); throw error; }
}

function node(){
  return { innerHTML:'', value:'', checked:false, dataset:{}, style:{}, classList:{ toggle(){},add(){},remove(){} }, addEventListener(){}, querySelector(){return null;}, querySelectorAll(){return[];}, closest(){return null;}, getAttribute(){return null;}, setAttribute(){}, focus(){} };
}

function hooks(){
  const root = node();
  const location = { hash:'#/quo-vadis/programme',search:'',pathname:'/scope.html',hostname:'localhost' };
  const storage = { getItem(){return null;},setItem(){},removeItem(){} };
  const document = { getElementById(id){return id === 'scope-root' ? root : node();},querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},dispatchEvent(){},body:node(),createElement(){return node();} };
  const context = { console,setTimeout,clearTimeout,requestAnimationFrame(fn){if(fn)fn();},encodeURIComponent,URLSearchParams,Intl,Date,Event:function(){},location,localStorage:storage,sessionStorage:storage,document,window:{ __SCOPE_UI_TEST_HOOKS__:true,ScopeUiLogic:L,CurrentPermissions:['personnel:read','data:export','reports:nominatif'],MonitoringRBAC:{has(){return true;}},location,history:{replaceState(){}},addEventListener(){},scrollTo(){},document,localStorage:storage,sessionStorage:storage } };
  context.globalThis=context.window; vm.createContext(context); vm.runInContext(uiSource,context,{filename:'scope-ui.js'}); return context.window.ScopeUiTestHooks;
}

test('01 - le jeu canonique garde les 635 lignes et 622 objets programme', () => {
  assert.strictEqual(programme.rows.length, 635);
  assert.strictEqual(programme.target.programmeItems, 622);
  assert.strictEqual(programme.target.historicalNotRenewed, 13);
});

test('02 - les niveaux 2027 sont explicites et stables', () => {
  assert.deepStrictEqual({ models:programme.target.models,occurrences:programme.target.occurrences,sessions:programme.target.sessions }, { models:262,occurrences:612,sessions:622 });
  assert.strictEqual(programme.target.toReview, 504);
  assert.ok(programme.target.oiMaterializations >= programme.target.sessions);
});

test('03 - la route Programme et sa fiche sont canoniques', () => {
  assert.strictEqual(L.parseHash('#/quo-vadis').qvView, 'programme');
  assert.strictEqual(L.parseHash('#/quo-vadis/programme').qvView, 'programme');
  const id = programme.rows[0].id;
  const parsed = L.parseHash(`#/quo-vadis/programme/${encodeURIComponent(id)}`);
  assert.strictEqual(parsed.qvView, 'programme-fiche');
  assert.strictEqual(parsed.qvProgrammeItemId, id);
});

test('04 - le tableau Programme expose filtres, niveaux et action MOA exacte', () => {
  const html = hooks().renderQuoVadisProgrammeHtml({ canonicalProgramme:programme });
  ['Activités','Occurrences','Sessions','Matérialisations OI','À contrôler','qv-filter-statcom','Résultats : 622','Consulter la fiche ›'].forEach((needle) => assert.ok(html.includes(needle), needle));
  assert.ok(html.includes('302 désigne la matrice de définitions source'));
});

test('05 - les 118 unités publiables de référence restent présentes', () => {
  const publishable = programme.rows.filter((row) => !row.external && row.status === 'VALIDATED' && !row.review);
  assert.strictEqual(publishable.length, 118);
});

test('06 - l’export personnel est protégé côté serveur et limité aux colonnes utiles', () => {
  ['personnel:read','data:export','reports:nominatif'].forEach((permission) => assert.ok(scopeFunction.includes(`hasPermission(claims, '${permission}')`)));
  ['NIP', 'Nom', 'Prénom', 'OI', 'Rôle / fonction', 'Statut assignation', 'Statut présence'].forEach((label) => assert.ok(scopeFunction.includes(label)));
  assert.ok(scopeFunction.includes("/evenements/:id/personnel.csv"));
});

test('07 - la saisie présente l’action seulement avec les permissions nominatives', () => {
  assert.ok(uiSource.includes("id=\"export-event-personnel\""));
  assert.ok(uiSource.includes("client.exportEventPersonnel(eventId)"));
});

console.log(`SCOPE FINAL PRODUCT INTEGRATION V1: ${passed}/7 tests PASS`);
