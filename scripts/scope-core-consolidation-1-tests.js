#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeParticipationReportingService, FORMATION_DOMAINES } = require('../netlify/functions/_scope-jsp-reporting');
const { computeTaux, validateCloture } = require('../netlify/functions/_scope-rules');
const { evaluateEligibility, filterAttendusEligibleAtDate, TYPES_PERIODE } = require('../netlify/functions/_scope-personnel');
const contract = require('../netlify/functions/_scope-core-contract');
const cycles = require('../netlify/functions/_scope-cycle-rules');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-core-consolidation-1', permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'] };
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

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRows, spec){
  const p = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: spec.dateEntree || '2020-01-01',
    date_sortie: spec.dateSortie || null
  });
  for(const c of cibleRows){
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: c.cible_id, date_debut: spec.affDebut || '2020-01-01', date_fin: spec.affFin || null });
  }
  return p;
}

async function frozen(service, domaineCode, cibleRows, date, libelle, patch = {}){
  const rows = Array.isArray(cibleRows) ? cibleRows : [cibleRows];
  const created = await service.createEvenement({ date, domaineCode, libelle, cibleIds: rows.map((row) => row.cible_id), ...patch }, ACTOR);
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
      motif_absence: spec.motif || null,
      role: spec.role || 'PARTICIPANT'
    });
  }
  await repo.updateEventIfVersion(eventId, event.version, { statut: 'REALISE' });
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const objectives = createScopeObjectivesService(repo);
  const dpsG1 = await cible(repo, 'DPS', 'G1');
  const dpsC1 = await cible(repo, 'DPS', 'C1');
  const dpsB1 = await cible(repo, 'DPS', 'B1');
  const dpsB2 = await cible(repo, 'DPS', 'B2');
  const dapY1 = await cible(repo, 'DAP', 'Y1');
  const prGen = await cible(repo, 'PR', 'GEN');
  const prAbc = await cible(repo, 'PR', 'ABC');
  const autoVl = await cible(repo, 'AUTO', 'VL');
  const autoPl = await cible(repo, 'AUTO', 'PL');

  await person(repo, [dpsG1], { nip: 'DPS-A', grade: 'Maj', nom: 'Alpha', prenom: 'Alice' });
  await person(repo, [dpsC1], { nip: 'DPS-B', grade: 'Sap', nom: 'Beta', prenom: 'Bob' });
  await person(repo, [dapY1], { nip: 'DAP-P', grade: 'Sgt', nom: 'Permute', prenom: 'Paul' });
  await person(repo, [prGen, dpsG1], { nip: 'PR-G1', grade: 'Sgt', nom: 'Respire', prenom: 'Rita' });
  await person(repo, [prAbc, dpsB2], { nip: 'PR-B2', grade: 'Sap', nom: 'Masque', prenom: 'Marc' });
  await person(repo, [prAbc, dpsG1], { nip: 'PR-F', grade: 'Lt', nom: 'Formateur', prenom: 'Franck' });
  await person(repo, [prAbc, dpsC1], { nip: 'PR-S', grade: 'Cpl', nom: 'Surveillant', prenom: 'Sam' });
  await person(repo, [prAbc, dpsB1], { nip: 'PR-X', grade: 'Sap', nom: 'Auxiliaire', prenom: 'Alex' });
  await person(repo, [autoVl], { nip: 'AUTO-VL', grade: 'Four', nom: 'Volant', prenom: 'Val' });
  await person(repo, [autoPl], { nip: 'AUTO-PL', grade: 'App', nom: 'Poids', prenom: 'Pat' });

  await objectives.createObjectif({ portee: 'DOMAINE', domaineCode: 'DPS', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
  await objectives.createObjectif({ portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 75, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
  await objectives.createObjectif({ portee: 'DOMAINE', domaineCode: 'AUTO', seuilPct: 70, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
  await objectives.createObjectif({ portee: 'DOMAINE', domaineCode: 'FOSPEC', seuilPct: 70, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);

  const dpsOk = await frozen(service, 'DPS', dpsG1, '2026-03-01', 'DPS au-dessus');
  await realize(repo, dpsOk, { 'DPS-A': { statut: 'PRESENT' } });
  const dpsBad = await frozen(service, 'DPS', dpsC1, '2026-04-01', 'DPS sous objectif');
  await realize(repo, dpsBad, { 'DPS-B': { statut: 'ABSENT_NON_EXCUSE' } });
  const dap = await frozen(service, 'DAP', dapY1, '2026-05-01', 'DAP permutation');
  await realize(repo, dap, { 'DAP-P': { statut: 'PERMUTATION' } });
  const pr1 = await frozen(service, 'PR', prAbc, '2026-06-01', 'PAPR ABC session 1');
  await realize(repo, pr1, {
    'PR-B2': { statut: 'ABSENT_NON_EXCUSE' },
    'PR-F': { statut: 'PRESENT', role: 'FORMATEUR' },
    'PR-S': { statut: 'PRESENT', role: 'SURVEILLANT' },
    'PR-X': { statut: 'PRESENT', role: 'AUXILIAIRE' }
  });
  const pr2 = await frozen(service, 'PR', prAbc, '2026-06-02', 'PAPR ABC session 2');
  await realize(repo, pr2, {
    'PR-B2': { statut: 'PRESENT' },
    'PR-F': { statut: 'PRESENT', role: 'FORMATEUR' },
    'PR-S': { statut: 'PRESENT', role: 'SURVEILLANT' },
    'PR-X': { statut: 'PRESENT', role: 'AUXILIAIRE' }
  });
  const prGenEvent = await frozen(service, 'PR', prGen, '2026-06-03', 'PAPR session');
  await realize(repo, prGenEvent, { 'PR-G1': { statut: 'PRESENT' } });
  const auto = await frozen(service, 'AUTO', autoVl, '2026-07-01', 'Conduite VL');
  await realize(repo, auto, { 'AUTO-VL': { statut: 'PRESENT' } });

  return { repo, service, ids: { dpsOk, dpsBad, dap, pr1, pr2, prGenEvent, auto } };
}

function uiHooks(){
  const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
  const root = { classList: { toggle(){} }, innerHTML: '', querySelectorAll(){ return []; }, querySelector(){ return null; } };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeDemo: { createDemoClient: () => ({}) },
      ScopeApi: null,
      __SCOPE_UI_TEST_HOOKS__: true,
      addEventListener(){},
      sessionStorage: { getItem(){ return null; }, setItem(){}, removeItem(){} }
    },
    document: { getElementById(id){ return id === 'scope-root' ? root : null; }, addEventListener(){}, querySelectorAll(){ return []; }, querySelector(){ return null; } },
    location: { hash: '#/rapports/participation', search: '' },
    console,
    clearTimeout,
    setTimeout,
    URLSearchParams,
    Blob,
    require,
    module: { exports: {} },
    exports: {}
  };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(uiSrc, sandbox, { filename: 'scope-ui.js' });
  return sandbox.window.ScopeUiTestHooks;
}

(async () => {
  await record('01 temporalite actif / sortie historique / sortie avant evenement', () => {
    const periodes = [{ type: TYPES_PERIODE.ACTIF, date_debut: '2020-01-01', date_fin: '2026-06-30' }, { type: TYPES_PERIODE.SORTI, date_debut: '2026-07-01', date_fin: null }];
    eq(evaluateEligibility({ actif: true }, periodes, '2026-06-01').eligible, true);
    eq(evaluateEligibility({ actif: true }, periodes, '2026-07-02').eligible, false);
    const map = new Map([['p1', periodes]]);
    deep(filterAttendusEligibleAtDate([{ personne_id: 'p1' }], map, '2026-06-01').map((row) => row.personne_id), ['p1']);
    deep(filterAttendusEligibleAtDate([{ personne_id: 'p1' }], map, '2026-07-02'), []);
  });

  await record('02 statuts officiels et DAP permutation', () => {
    const attendus = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ personne_id: id }));
    const taux = computeTaux([
      { personne_id: 'a', statut: 'PRESENT' },
      { personne_id: 'b', statut: 'PERMUTATION' },
      { personne_id: 'c', statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
      { personne_id: 'd', statut: 'ABSENT_NON_EXCUSE' },
      { personne_id: 'e', statut: 'DISPENSE' }
    ], attendus);
    eq(taux.numerator, 2);
    eq(taux.denominator, 4);
    eq(taux.permutations, 1);
    eq(taux.dispenses, 1);
  });

  await record('03 cloture intermediaire et finale', () => {
    const event = { statut: 'PLANIFIE', population_figee: true, domaine_code: 'PR' };
    const attendus = [{ personne_id: 'a' }, { personne_id: 'b' }];
    const parts = [{ personne_id: 'a', statut: 'PRESENT' }, { personne_id: 'b', statut: 'NON_RENSEIGNE' }];
    validateCloture(event, attendus, parts, { requireExpectedFilled: false });
    assert.throws(() => validateCloture(event, attendus, parts, { requireExpectedFilled: true }), /Clôture refusée/);
    eq(cycles.canCloseLastSession({ isMultiSession: true, isLastSession: true, unfilledPeople: ['b'] }), false);
  });

  await record('04 hierarchies et tri institutionnel central', () => {
    deep(contract.ORDERS.DPS, ['G1', 'C1', 'B1', 'B2']);
    deep(contract.ORDERS.DAP, ['Y1', 'Y2', 'Y3', 'Y4']);
    deep(contract.ORDERS.JSP, ['G1', 'C1', 'B1']);
    eq(contract.fospecSpecialisationLabel('PR', 'GEN'), 'PAPR');
    eq(contract.fospecSpecialisationLabel('PR', 'ABC'), 'PAPR ABC');
    eq(contract.fospecSpecialisationLabel('AUTO', 'VL'), 'Cond VL');
    eq(contract.fospecSpecialisationLabel('AUTO', 'PL'), 'Cond PL');
    const sorted = [
      { grade: 'Sap', nom: 'Zulu', prenom: 'A', siteCode: 'B2', nip: '3' },
      { grade: 'Lt', nom: 'Alpha', prenom: 'A', siteCode: 'G1', nip: '1' },
      { grade: 'Sgt', nom: 'Beta', prenom: 'B', siteCode: 'C1', nip: '2' }
    ].sort((a, b) => contract.compareInstitutional(a, b, { domain: 'DPS' }));
    deep(sorted.map((row) => row.nip), ['1', '2', '3']);
  });

  await record('05 FOSPEC PR PAPR/PAPR ABC par DPS et AUTO libelles', async () => {
    const { repo } = await setup();
    const svc = createScopeParticipationReportingService(repo);
    const prAbc = await svc.report({ domaine: 'FOSPEC', sousDomaine: 'PR', specialisation: 'ABC', perimeter: 'B2', year: 2026 });
    eq(prAbc.perimeterLabel, 'DPS B2');
    eq(prAbc.siteRows.find((row) => row.code === 'B2').participants, 1);
    ok(!prAbc.siteRows.some((row) => row.site === 'PAPR' || row.site === 'PAPR ABC' || row.site === 'Global PR'));
    const prGen = await svc.report({ domaine: 'FOSPEC', sousDomaine: 'PR', specialisation: 'GEN', perimeter: 'G1', year: 2026 });
    eq(prGen.kpis.present, 1);
    const auto = await svc.report({ domaine: 'FOSPEC', sousDomaine: 'AUTO', specialisation: 'VL', year: 2026 });
    eq(auto.siteRows.find((row) => row.code === 'VL').site, 'Cond VL');
    ok(!auto.siteRows.some((row) => row.site === 'AUTO VL' || row.site === 'VL'));
  });

  await record('06 PR contributions consolidees roles encadrement', async () => {
    const { repo } = await setup();
    const pr = await createScopeParticipationReportingService(repo).report({ domaine: 'FOSPEC', sousDomaine: 'PR', specialisation: 'ABC', year: 2026 });
    eq(pr.persons.find((row) => row.nip === 'PR-F').expected, 1);
    ok(!pr.persons.some((row) => row.nip === 'PR-S'));
    ok(!pr.persons.some((row) => row.nip === 'PR-X'));
    eq(pr.kpis.participants, 2);
  });

  await record('07 Formation sans duplication PR/FOSPEC et faits uniques', async () => {
    const { repo } = await setup();
    const f = await createScopeParticipationReportingService(repo).formationReport({ year: 2026 });
    deep(FORMATION_DOMAINES, ['DPS', 'DAP', 'JSP', 'FOSPEC', 'FOBA', 'FOCA']);
    ok(f.domainRows.some((row) => row.domaine === 'FOSPEC'));
    ok(!f.domainRows.some((row) => row.domaine === 'PR' || row.domaine === 'AUTO'));
    eq(f.graphs.evolution.every((row) => row.exercise === 'Formation globale'), true);
    ok(f.kpis.expected <= f.domainRows.reduce((sum, row) => sum + Number(row.expected || 0), 0));
  });

  await record('08 UX Reporting-3-R1 retour filtres alertes blocks graphiques', async () => {
    const h = uiHooks();
    const html = h.renderRapportJspHtml({
      kind: 'PARTICIPATION',
      domaine: 'FOSPEC',
      sousDomaine: 'PR',
      specialisation: 'ABC',
      siteFilter: 'B2',
      perimeterLabel: 'DPS B2',
      kpis: {},
      siteRows: [],
      persons: [],
      watchlist: [],
      regulars: [],
      alerts: [],
      underObjective: [],
      exercises: [{ date: '2026-06-01', libelle: 'PAPR ABC', domaine: 'PR', site: 'DPS B2', expected: 1, present: 0, excused: 0, absent: 1, dispensed: 0, nonRenseigne: 0, presenceRate: 0, objectivePct: 75, objectiveGap: -75, underObjective: true }],
      motifs: [],
      details: [],
      graphs: { evolution: [], sites: [], motifs: [] },
      blocks: ['synthese', 'alertes', 'graphiques', 'evenements']
    });
    ok(html.includes('Retour aux rapports'));
    ok(html.includes('Sous-domaine'));
    ok(html.includes('Spécialisation'));
    ok(html.includes('PAPR ABC'));
    ok(html.includes('DPS B2'));
    ok(html.includes('Taux constaté'));
    ok(html.includes('Objectif'));
    ok(html.includes('Écart'));
    ok(html.includes('Aucune donnée disponible'));
    ok(html.includes('scope-row-alert'));
    ok(!html.includes('Global PR'));
    ok(!html.includes('<th>Valeur</th>'));
    ok(!html.includes('Participation régulière</h2>'));
  });

  await record('09 Pilotage Formation retour et PDF alertes sobres', async () => {
    const { repo } = await setup();
    const f = await createScopeParticipationReportingService(repo).formationReport({ year: 2026 });
    const html = uiHooks().renderFormationReportHtml(f);
    ok(html.includes('Retour aux rapports'));
    ok(html.includes('Comparaison des domaines'));
    ok(html.includes('Taux réel · volume'));
    const pdfSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
    ok(pdfSrc.includes('highlightRows: (f.eventsToWatch || []).slice(0, 24).map((row) => row.underObjective)'));
    ok(!pdfSrc.includes("'Valeur'"));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
  console.log('SCOPE-CORE-CONSOLIDATION-1: PASS');
})();
