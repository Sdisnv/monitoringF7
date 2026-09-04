#!/usr/bin/env node
'use strict';

/** SCOPE-REPORTING-3 - consolidation reporting transversal et Formation. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeParticipationReportingService } = require('../netlify/functions/_scope-jsp-reporting');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { parsePeriod } = require('../netlify/functions/_scope-period');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const ACTOR = { sub: 'scope-reporting-3', permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deep(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRows, spec){
  const p = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom,
    prenom: spec.prenom,
    grade: spec.grade,
    date_entree: '2020-01-01'
  });
  for(const c of cibleRows){
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: c.cible_id, date_debut: '2026-01-01' });
  }
  return p;
}

async function frozen(service, domaineCode, cibleRow, date, libelle){
  const created = await service.createEvenement({ date, domaineCode, libelle, cibleIds: [cibleRow.cible_id] }, ACTOR);
  const done = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return done.evenement.evenement_id;
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
  const objectifs = createScopeObjectivesService(repo);
  const dpsG1 = await cible(repo, 'DPS', 'G1');
  const dpsC1 = await cible(repo, 'DPS', 'C1');
  const dpsB1 = await cible(repo, 'DPS', 'B1');
  const dpsB2 = await cible(repo, 'DPS', 'B2');
  const dapY1 = await cible(repo, 'DAP', 'Y1');
  const prAbc = await cible(repo, 'PR', 'ABC');
  const autoVl = await cible(repo, 'AUTO', 'VL');
  const jspG1 = await cible(repo, 'JSP', 'G1');
  const jspCad = await cible(repo, 'JSP', 'CAD');

  await person(repo, [dpsG1], { nip: 'DPS001', grade: 'Maj', nom: 'Alpha', prenom: 'Alice' });
  await person(repo, [dpsC1], { nip: 'DPS002', grade: 'Cpl', nom: 'Beta', prenom: 'Bob' });
  await person(repo, [dapY1], { nip: 'DAP001', grade: 'Lt', nom: 'Delta', prenom: 'Dana' });
  await person(repo, [prAbc, dpsG1], { nip: 'PR001', grade: 'Sgt', nom: 'Respire', prenom: 'Rita' });
  await person(repo, [prAbc, dpsB2], { nip: 'PR002', grade: 'Sap', nom: 'Masque', prenom: 'Marc' });
  await person(repo, [autoVl], { nip: 'AUTO01', grade: 'Four', nom: 'Volant', prenom: 'Val' });
  const jspJeune = await person(repo, [jspG1], { nip: 'JSP001', grade: 'Flm 1', nom: 'Jeune', prenom: 'Jade' });
  await person(repo, [jspG1], { nip: 'JSP002', grade: 'Flm 2', nom: 'Absent', prenom: 'Ana' });
  const monitor = await person(repo, [jspG1, dpsB1], { nip: 'MON001', grade: 'Sgt', nom: 'Moniteur', prenom: 'Max' });
  await person(repo, [jspCad], { nip: 'CAD001', grade: 'Cap', nom: 'Cadre', prenom: 'Claire' });

  await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'DPS', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
  await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 75, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
  await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'FOSPEC', seuilPct: 70, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);

  const eDpsS1 = await frozen(service, 'DPS', dpsG1, '2026-03-05', 'DPS S1');
  await realize(repo, eDpsS1, { DPS001: { statut: 'PRESENT' } });
  const eDpsS2 = await frozen(service, 'DPS', dpsC1, '2026-09-05', 'DPS S2');
  await realize(repo, eDpsS2, { DPS002: { statut: 'ABSENT_NON_EXCUSE' } });
  const ePr = await frozen(service, 'PR', prAbc, '2026-04-12', 'PAPR ABC');
  await realize(repo, ePr, { PR001: { statut: 'PRESENT' }, PR002: { statut: 'ABSENT_NON_EXCUSE' } });
  const eAuto = await frozen(service, 'AUTO', autoVl, '2026-08-20', 'AUTO VL');
  await realize(repo, eAuto, { AUTO01: { statut: 'PRESENT' } });
  const eJsp = await frozen(service, 'JSP', jspG1, '2026-05-10', 'JSP G1');
  await repo.upsertAttendu({ evenement_id: eJsp, personne_id: monitor.personne_id, inclus: true, origine: 'TEST' });
  await repo.upsertParticipation({ evenement_id: eJsp, personne_id: monitor.personne_id, statut: 'PRESENT', role: 'MONITEUR' });
  await realize(repo, eJsp, { JSP001: { statut: 'ABSENT_EXCUSE', motif: 'ACTIVITE_SCOLAIRE' }, JSP002: { statut: 'ABSENT_NON_EXCUSE' }, MON001: { statut: 'PRESENT', role: 'MONITEUR' } });

  return { repo, service, ids: { eDpsS1, eDpsS2, ePr, eAuto, eJsp, jspJeune } };
}

function hooks(){
  const root = { classList: { toggle(){} }, innerHTML: '', querySelectorAll(){ return []; }, querySelector(){ return null; } };
  const sandbox = {
    window: {
      ScopeUiLogic: L,
      ScopeDemo: { createDemoClient: () => ({}) },
      ScopeApi: null,
      __SCOPE_UI_TEST_HOOKS__: true,
      addEventListener(){},
      clearTimeout,
      setTimeout,
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
  await record('01 - navigation rapports generique', async () => {
    const h = hooks();
    const html = h.renderRapportsHtml();
    eq(L.parseHash('#/rapports/formation').screen, 'rapport-formation');
    eq(L.parseHash('#/rapports/participation').screen, 'rapport-participation');
    ok(html.includes('Pilotage Formation'));
    ok(html.includes('Rapport de participation configurable'));
    ok(!html.includes('<h2 style="margin-top:0">Rapport JSP</h2>'));
  });

  await record('02 - semestres serveur et client', async () => {
    deep(parsePeriod({ preset: 'SEMESTER', year: 2026, semester: 1 }), { from: '2026-01-01', to: '2026-06-30', preset: 'SEMESTER' });
    deep(parsePeriod({ preset: 'SEMESTER', year: 2026, semester: 2 }), { from: '2026-07-01', to: '2026-12-31', preset: 'SEMESTER' });
    deep(L.periodParams({ preset: 'SEMESTER', year: 2026, semester: 2 }), { preset: 'SEMESTER', year: '2026', semester: '2' });
  });

  await record('03 - domaines et perimetres JSP sans CAD', async () => {
    const h = hooks();
    h.state.referentiels.domaines = ['DPS', 'DAP', 'JSP', 'PR', 'AUTO', 'FOBA', 'FOCA', 'FOSPEC'].map((code) => ({ code }));
    h.state.referentiels.cibles = [{ domaineCode: 'JSP', niveauCode: 'CAD' }];
    const html = h.renderRapportJspHtml({ kind: 'PARTICIPATION', domaine: 'JSP', siteFilter: 'TOUS', kpis: {}, siteRows: [], persons: [], watchlist: [], regulars: [], exercises: [], motifs: [], details: [], graphs: {}, blocks: ['synthese'] });
    ok(html.includes('<option value="JSP" selected>JSP</option>'));
    ok(html.includes('JSP G1'));
    ok(!html.includes('JSP CAD'));
  });

  await record('04 - PR PAPR ventile par site DPS et ordre institutionnel', async () => {
    const { repo } = await setup();
    const svc = createScopeParticipationReportingService(repo);
    const r = await svc.report({ domaine: 'PR', year: 2026 });
    deep(r.siteRows.map((row) => row.code), ['G1', 'C1', 'B1', 'B2']);
    eq(r.siteRows.find((row) => row.code === 'G1').participants, 1);
    eq(r.siteRows.find((row) => row.code === 'B2').participants, 1);
    ok(!r.siteRows.some((row) => /^PR /.test(row.site)));
  });

  await record('05 - ordre DAP institutionnel', async () => {
    const { repo } = await setup();
    const r = await createScopeParticipationReportingService(repo).report({ domaine: 'DAP', year: 2026 });
    deep(r.siteRows.map((row) => row.code), ['Y1', 'Y2', 'Y3', 'Y4']);
  });

  await record('06 - tri grade nom prenom', async () => {
    const { repo } = await setup();
    const r = await createScopeParticipationReportingService(repo).report({ domaine: 'PR', year: 2026 });
    deep(r.persons.map((row) => row.nip), ['PR001', 'PR002']);
  });

  await record('07 - S1 et S2 filtrent reellement les evenements', async () => {
    const { repo } = await setup();
    const svc = createScopeParticipationReportingService(repo);
    const s1 = await svc.report({ domaine: 'DPS', preset: 'SEMESTER', year: 2026, semester: 1 });
    const s2 = await svc.report({ domaine: 'DPS', preset: 'SEMESTER', year: 2026, semester: 2 });
    ok(s1.exercises.every((row) => row.date <= '2026-06-30'));
    ok(s2.exercises.every((row) => row.date >= '2026-07-01'));
    eq(s1.kpis.present, 1);
    eq(s2.kpis.absent, 1);
  });

  await record('08 - blocs ecran PDF coherents', async () => {
    const { repo } = await setup();
    const svc = createScopeParticipationReportingService(repo);
    const r = await svc.report({ domaine: 'PR', year: 2026, blocks: 'synthese,evenements' });
    deep(r.blocks, ['synthese', 'evenements']);
    const html = hooks().renderRapportJspHtml(r);
    ok(html.includes('Analyse par exercice et événement'));
    ok(!html.includes('Participation régulière</h2>'));
    const pdf = await generateReport(repo, { kind: 'PARTICIPATION', domaine: 'PR', year: 2026, blocks: 'synthese,evenements' }, ACTOR, { generatedAt: '2026-09-04T10:00:00Z' });
    ok(pdf.buffer.length > 1000);
  });

  await record('09 - statuts humains et alertes rouges', async () => {
    const { repo } = await setup();
    const r = await createScopeParticipationReportingService(repo).report({ domaine: 'JSP', year: 2026 });
    ok(r.details.some((row) => row.statut === 'Excusé'));
    ok(!r.details.some((row) => /^[A-ZÉÈ_]+$/.test(row.statut)));
    const html = hooks().renderRapportJspHtml(r);
    ok(html.includes('scope-row-alert'));
  });

  await record('10 - personnes et evenements sous objectif', async () => {
    const { repo } = await setup();
    const r = await createScopeParticipationReportingService(repo).report({ domaine: 'PR', year: 2026 });
    ok(r.underObjective.some((row) => row.nip === 'PR002'));
    ok(r.eventsUnderObjective.some((row) => row.libelle === 'PAPR ABC'));
    const html = hooks().renderRapportJspHtml(r);
    ok(html.includes('Écart objectif'));
  });

  await record('11 - graphiques avec legendes et absence donnees explicite', async () => {
    const { repo } = await setup();
    const r = await createScopeParticipationReportingService(repo).report({ domaine: 'FOCA', year: 2026 });
    const html = hooks().renderRapportJspHtml(r);
    ok(html.includes('scope-chart-legend'));
    ok(html.includes('Aucune donnée disponible pour la période sélectionnée.'));
  });

  await record('12 - FOSPEC libelles et evolution PR AUTO', async () => {
    const { repo } = await setup();
    const r = await createScopeParticipationReportingService(repo).report({ domaine: 'FOSPEC', year: 2026 });
    deep(r.siteRows.map((row) => row.site), ['PR', 'AUTO']);
    ok(r.graphs.evolution.some((row) => row.exercise === 'PAPR ABC'));
    ok(r.graphs.evolution.some((row) => row.exercise === 'AUTO VL'));
  });

  await record('13 - rapport global Formation et comparaison domaines', async () => {
    const { repo } = await setup();
    const f = await createScopeParticipationReportingService(repo).formationReport({ year: 2026 });
    eq(f.kind, 'FORMATION');
    ok(f.domainRows.some((row) => row.label === 'DPS'));
    ok(f.domainRows.some((row) => row.label === 'PR/PAPR'));
    ok(f.graphs.domains.length >= 3);
    eq(f.kpis.expected, f.domainRows.filter((row) => row.domaine !== 'FOSPEC').reduce((sum, row) => sum + Number(row.expected || 0), 0));
  });

  await record('14 - alertes Formation personnes et evenements', async () => {
    const { repo } = await setup();
    const f = await createScopeParticipationReportingService(repo).formationReport({ year: 2026 });
    ok(f.alerts.some((row) => row.type === 'Domaine sous objectif' || row.type === 'Événement sous objectif'));
    ok(f.peopleToWatch.some((row) => row.domaine === 'PR'));
    ok(f.eventsToWatch.some((row) => row.domaine === 'PR'));
    const html = hooks().renderFormationReportHtml(f);
    ok(html.includes('RAPPORT GLOBAL FORMATION'));
    ok(html.includes('scope-row-alert'));
  });

  await record('15 - PDF commandement Formation sans page blanche apparente', async () => {
    const { repo } = await setup();
    const pdf = await generateReport(repo, { kind: 'FORMATION', year: 2026 }, ACTOR, { generatedAt: '2026-09-04T10:00:00Z' });
    ok(pdf.filename.includes('SCOPE_Rapport_Global_Formation_2026'));
    ok(pdf.pages >= 1);
    ok(pdf.buffer.length > 1000);
  });

  await record('16 - objectifs non inventes et duplicate PARTICIPATION corrige', async () => {
    const { repo } = await setup();
    const foca = await createScopeParticipationReportingService(repo).report({ domaine: 'FOCA', year: 2026 });
    eq(foca.objective, null);
    const reportSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-report-data.js'), 'utf8');
    eq((reportSrc.match(/(^|[\s,{])PARTICIPATION:\s*'PARTICIPATION'/g) || []).length, 1);
    ok(!reportSrc.includes("PARTICIPATION: 'SESSION'"));
  });

  for(const row of results){
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else console.error(`NOK ${row.name}\n${row.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length){
    console.error(`FAIL ${failed.length}`);
    process.exit(1);
  }
  console.log('SCOPE-REPORTING-3 PASS');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
