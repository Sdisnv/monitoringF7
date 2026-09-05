#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeParticipationReportingService } = require('../netlify/lib/_scope-jsp-reporting');
const identity = require('../netlify/lib/_auth-identity');
const contract = require('../netlify/lib/_scope-core-contract');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-auth-identity-recovery-1', permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deep(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function uiHooks(fetchImpl){
  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const storage = new Map([['scope-live-confirmed', '1'], ['scope-include-qualification', '1']]);
  const root = { classList: { toggle(){}, remove(){} }, innerHTML: '', querySelectorAll(){ return []; }, querySelector(){ return null; } };
  const location = { hash: '#/accueil', search: '?mode=live', href: '' };
  const sessionStorage = { getItem(k){ return storage.get(k) || null; }, setItem(k, v){ storage.set(k, String(v)); }, removeItem(k){ storage.delete(k); } };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeApi: { createHttpClient: () => ({ kind: 'http' }) },
      ScopeDemo: { createDemoClient: () => ({ kind: 'demo' }) },
      ScopeAuthIdle: { stopped: false, stop(){ this.stopped = true; } },
      __SCOPE_UI_TEST_HOOKS__: true,
      CurrentRoles: ['UTILISATEUR'],
      CurrentPermissions: ['dashboard:read'],
      addEventListener(){},
      sessionStorage
    },
    document: { getElementById(id){ return id === 'scope-root' ? root : null; }, addEventListener(){}, dispatchEvent(){}, querySelectorAll(){ return []; }, querySelector(){ return null; } },
    location,
    sessionStorage,
    console,
    clearTimeout,
    setTimeout,
    URLSearchParams,
    Blob,
    Event: function Event(type){ this.type = type; },
    fetch: fetchImpl || (async () => ({ ok: true })),
    require,
    module: { exports: {} },
    exports: {}
  };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(uiSrc, sandbox, { filename: 'scope-ui.js' });
  return { hooks: sandbox.window.ScopeUiTestHooks, storage, location, window: sandbox.window };
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRows, spec){
  const p = await repo.insertPersonne({ nip: spec.nip, nom: spec.nom, prenom: spec.prenom, grade: spec.grade || 'Sap', date_entree: '2020-01-01' });
  for(const c of cibleRows){
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: c.cible_id, date_debut: '2020-01-01' });
  }
  return p;
}

async function frozen(service, domaineCode, cibleRow, date, libelle){
  const created = await service.createEvenement({ date, domaineCode, libelle, cibleIds: [cibleRow.cible_id] }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return created.evenement.evenement_id;
}

async function realize(repo, eventId, byNip){
  const event = await repo.getEvent(eventId);
  const people = new Map((await repo.listPersonnes({})).map((p) => [p.personne_id, p]));
  for(const attendu of (await repo.listAttendus(eventId)).filter((row) => row.inclus !== false)){
    const p = people.get(attendu.personne_id);
    const spec = (p && byNip[p.nip]) || {};
    await repo.upsertParticipation({
      evenement_id: eventId,
      personne_id: attendu.personne_id,
      statut: spec.statut || 'NON_RENSEIGNE',
      role: spec.role || 'PARTICIPANT'
    });
  }
  await repo.updateEventIfVersion(eventId, event.version, { statut: 'REALISE' });
}

async function setupAutoAndPr(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const dpsG1 = await cible(repo, 'DPS', 'G1');
  const dpsC1 = await cible(repo, 'DPS', 'C1');
  const dpsB2 = await cible(repo, 'DPS', 'B2');
  const dapY1 = await cible(repo, 'DAP', 'Y1');
  const dapY4 = await cible(repo, 'DAP', 'Y4');
  const autoVl = await cible(repo, 'AUTO', 'VL');
  const autoPl = await cible(repo, 'AUTO', 'PL');
  const prAbc = await cible(repo, 'PR', 'ABC');
  await person(repo, [autoVl, dpsG1], { nip: 'VL-G1', nom: 'Auto', prenom: 'Gilles' });
  await person(repo, [autoVl, dapY1], { nip: 'VL-Y1', nom: 'Auto', prenom: 'Yves' });
  await person(repo, [autoPl, dpsC1], { nip: 'PL-C1', nom: 'Poids', prenom: 'Celine' });
  await person(repo, [autoPl, dapY4], { nip: 'PL-Y4', nom: 'Poids', prenom: 'Yann' });
  await person(repo, [prAbc, dpsB2], { nip: 'PR-B2', nom: 'Respire', prenom: 'Bruno' });
  const evVl = await frozen(service, 'AUTO', autoVl, '2026-03-01', 'Cond VL');
  await realize(repo, evVl, { 'VL-G1': { statut: 'PRESENT' }, 'VL-Y1': { statut: 'PRESENT' } });
  const evPl = await frozen(service, 'AUTO', autoPl, '2026-04-01', 'Cond PL');
  await realize(repo, evPl, { 'PL-C1': { statut: 'PRESENT' }, 'PL-Y4': { statut: 'PRESENT' } });
  const evPr = await frozen(service, 'PR', prAbc, '2026-05-01', 'PAPR ABC');
  await realize(repo, evPr, { 'PR-B2': { statut: 'PRESENT' } });
  return repo;
}

(async () => {
  await record('A identite reelle utilisee quand claims disponibles', () => {
    eq(identity.displayNameFromClaims({ name: 'SCOPE', given_name: 'Thierry', family_name: 'Grunig', email: 'thierry@example.test', preferred_username: 'tgrunig' }), 'Thierry Grunig');
    eq(identity.displayNameFromClaims({ name: 'Thierry Grunig', email: 'thierry@example.test' }), 'Thierry Grunig');
  });

  await record('B aucun fallback SCOPE comme utilisateur', () => {
    eq(identity.isApplicationIdentity('SCOPE'), true);
    eq(identity.displayNameFromClaims({ name: 'SCOPE', email: 'thierry@example.test' }), 'thierry@example.test');
    eq(identity.displayNameFromUser({ display_name: 'SCOPE', email: 'thierry@example.test', subject: '00u123' }), 'thierry@example.test');
    ok(!identity.displayNameFromClaims({ name: 'SCOPE' }).includes('SCOPE'));
  });

  await record('C logout nettoie etat/session frontend', () => {
    const { hooks, storage, window } = uiHooks();
    hooks.state.session = { displayName: 'Thierry Grunig', roles: ['ADMINISTRATEUR'], permissions: ['admin:manage'] };
    hooks.clearLocalAuthState();
    eq(hooks.state.session, null);
    eq(hooks.state.needOkta, true);
    eq(window.CurrentRoles.length, 0);
    eq(window.CurrentPermissions.length, 0);
    eq(storage.get('scope-live-confirmed'), undefined);
    eq(storage.get('scope-include-qualification'), undefined);
    eq(window.ScopeAuthIdle.stopped, true);
  });

  await record('D reconnexion restaure correctement identite', () => {
    const { hooks } = uiHooks();
    hooks.state.session = { displayName: 'Thierry Grunig', roles: ['UTILISATEUR'], permissions: [] };
    eq(hooks.userLabel(), 'Thierry Grunig');
    hooks.clearLocalAuthState();
    hooks.state.needOkta = false;
    hooks.state.session = { displayName: 'Alice Martin', roles: ['GESTIONNAIRE'], permissions: ['events:write'] };
    eq(hooks.userLabel(), 'Alice Martin');
    const merged = identity.mergeStoredUserWithIdentity(
      { displayName: 'Ancien Utilisateur', email: 'ancien@example.test', roles: ['ADMINISTRATEUR'] },
      { displayName: 'Alice Martin', email: 'alice@example.test', roles: ['UTILISATEUR'] }
    );
    eq(merged.displayName, 'Alice Martin');
  });

  await record('E aucune identite obsolete apres logout', async () => {
    const calls = [];
    const { hooks, location } = uiHooks(async (url, opts) => {
      calls.push({ url, method: opts && opts.method });
      return { ok: true };
    });
    hooks.state.session = { displayName: 'Ancien Utilisateur', roles: ['ADMINISTRATEUR'], permissions: ['admin:manage'] };
    await hooks.logoutScopeSession();
    eq(hooks.state.session, null);
    ok(calls.some((call) => call.url === '/auth/logout' && call.method === 'POST'));
    ok(String(location.href).includes('/auth/logout?returnTo='));
  });

  await record('F Cond PL = DPS seulement', async () => {
    const repo = await setupAutoAndPr();
    const report = await createScopeParticipationReportingService(repo).report({ domaine: 'FOSPEC', sousDomaine: 'AUTO', specialisation: 'PL', year: 2026 });
    deep(report.siteRows.map((row) => row.code), ['G1', 'C1', 'B1', 'B2']);
    eq(report.siteRows.find((row) => row.code === 'C1').present, 1);
    ok(!report.siteRows.some((row) => /^Y[1-4]$/.test(row.code)));
  });

  await record('G Cond VL = DPS + DAP', async () => {
    const repo = await setupAutoAndPr();
    const report = await createScopeParticipationReportingService(repo).report({ domaine: 'FOSPEC', sousDomaine: 'AUTO', specialisation: 'VL', year: 2026 });
    deep(report.siteRows.map((row) => row.code), ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);
    eq(report.siteRows.find((row) => row.code === 'G1').present, 1);
    eq(report.siteRows.find((row) => row.code === 'Y1').present, 1);
  });

  await record('H ordre institutionnel des perimetres', () => {
    deep(contract.autoPerimeterCodes('PL'), ['G1', 'C1', 'B1', 'B2']);
    deep(contract.autoPerimeterCodes('VL'), ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);
  });

  await record('I non regression FOSPEC PR PAPR ABC DPS', async () => {
    const repo = await setupAutoAndPr();
    const report = await createScopeParticipationReportingService(repo).report({ domaine: 'FOSPEC', sousDomaine: 'PR', specialisation: 'ABC', perimeter: 'B2', year: 2026 });
    eq(report.perimeterLabel, 'DPS B2');
    eq(report.kpis.present, 1);
  });

  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  await record('J logout bouton action sans ancien lien passif', () => {
    ok(uiSrc.includes('id="scope-logout"'));
    ok(uiSrc.includes('logoutScopeSession()'));
    ok(!uiSrc.includes('href="/auth/logout?returnTo=/"'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
  console.log('SCOPE-AUTH-IDENTITY-RECOVERY-1: PASS');
})();
