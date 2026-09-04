#!/usr/bin/env node
'use strict';

/** SCOPE-REPORTING-2 - moteur transversal de rapports de participation. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeParticipationReportingService, createScopeJspReportingService } = require('../netlify/functions/_scope-jsp-reporting');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const ACTOR = { sub: 'scope-reporting-2', permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'] };
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
  const jspG1 = await cible(repo, 'JSP', 'G1');
  const jspC1 = await cible(repo, 'JSP', 'C1');
  const dpsForMonitor = await cible(repo, 'DPS', 'B1');

  await person(repo, [dpsG1], { nip: 'DPS001', grade: 'Maj', nom: 'Haut', prenom: 'Alice' });
  await person(repo, [dpsG1], { nip: 'DPS002', grade: 'Sap', nom: 'Bas', prenom: 'Bob' });
  await person(repo, [dpsC1], { nip: 'DPS003', grade: 'Cpl', nom: 'Centre', prenom: 'Cara' });
  await person(repo, [jspG1], { nip: 'JSP001', grade: 'JSP', nom: 'Jeune', prenom: 'Jade' });
  await person(repo, [jspG1], { nip: 'JSP002', grade: 'Flm 1', nom: 'Excuse', prenom: 'Eli' });
  await person(repo, [jspC1], { nip: 'JSP003', grade: 'Flm 2', nom: 'Absent', prenom: 'Ana' });
  const monitor = await person(repo, [jspG1, dpsForMonitor], { nip: 'MON001', grade: 'Sgt', nom: 'Moniteur', prenom: 'Max' });

  await objectifs.createObjectif({ portee: 'DOMAINE', domaineCode: 'DPS', seuilPct: 80, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);
  await objectifs.createObjectif({ portee: 'CIBLE', cibleId: dpsG1.cible_id, seuilPct: 75, dateDebut: '2026-01-01', dateFin: '2026-12-31' }, ACTOR);

  const eDpsG1 = await frozen(service, 'DPS', dpsG1, '2026-03-01', 'DPS G1');
  await realize(repo, eDpsG1, {
    DPS001: { statut: 'PRESENT' },
    DPS002: { statut: 'ABSENT_NON_EXCUSE' }
  });
  const eDpsC1 = await frozen(service, 'DPS', dpsC1, '2026-04-01', 'DPS C1');
  await realize(repo, eDpsC1, { DPS003: { statut: 'ABSENT_EXCUSE', motif: 'PRIVE' } });
  const cancelled = await frozen(service, 'DPS', dpsG1, '2026-05-01', 'DPS annulé');
  await realize(repo, cancelled, { DPS001: { statut: 'ABSENT_NON_EXCUSE' }, DPS002: { statut: 'ABSENT_NON_EXCUSE' } });
  const cancelledEvent = await repo.getEvent(cancelled);
  await repo.updateEventIfVersion(cancelled, cancelledEvent.version, { statut: 'ANNULE' });
  const out = await frozen(service, 'DPS', dpsG1, '2027-01-01', 'DPS 2027');
  await realize(repo, out, { DPS001: { statut: 'ABSENT_NON_EXCUSE' } });

  const eJspG1 = await frozen(service, 'JSP', jspG1, '2026-03-08', 'JSP G1');
  await repo.upsertAttendu({ evenement_id: eJspG1, personne_id: monitor.personne_id, inclus: true, origine: 'TEST' });
  await repo.upsertParticipation({ evenement_id: eJspG1, personne_id: monitor.personne_id, statut: 'PRESENT', role: 'MONITEUR' });
  await realize(repo, eJspG1, {
    JSP001: { statut: 'PRESENT' },
    JSP002: { statut: 'ABSENT_EXCUSE', motif: 'ACTIVITE_SCOLAIRE' },
    MON001: { statut: 'PRESENT', role: 'MONITEUR' }
  });
  const eJspC1 = await frozen(service, 'JSP', jspC1, '2026-04-08', 'JSP C1');
  await realize(repo, eJspC1, { JSP003: { statut: 'ABSENT_NON_EXCUSE' } });

  return { repo, service, ids: { cancelled, out } };
}

async function report(query){
  const { repo, ids } = await setup();
  const svc = createScopeParticipationReportingService(repo);
  return { repo, ids, report: await svc.report(Object.assign({ year: 2026 }, query || {})) };
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
  await record('01 - rapport global domaine DPS', async () => {
    const { report: r } = await report({ domaine: 'DPS' });
    eq(r.domaine, 'DPS');
    eq(r.perimeterLabel, 'Global du domaine');
    eq(r.kpis.participants, 3);
    eq(r.kpis.expected, 3);
  });

  await record('02 - filtre OI G1 et periode 2026', async () => {
    const { report: r } = await report({ domaine: 'DPS', perimeter: 'G1' });
    eq(r.perimeterLabel, 'DPS G1');
    eq(r.kpis.participants, 2);
    eq(r.kpis.expected, 2);
    ok(r.exercises.every((row) => row.date.startsWith('2026')));
  });

  await record('03 - PDF et ecran partagent domaine/perimetre/blocs', async () => {
    const { repo } = await setup();
    const result = await generateReport(repo, {
      kind: 'PARTICIPATION',
      domaine: 'DPS',
      perimeter: 'G1',
      year: 2026,
      blocks: 'synthese,evenements'
    }, ACTOR, { generatedAt: '2026-09-04T10:00:00Z' });
    ok(result.filename.includes('SCOPE_Rapport_Participation_DPS_G1_2026'));
    ok(result.pages >= 1);
    ok(result.buffer.length > 1000);
  });

  await record('04 - JSP global et sites G1 C1 avec moniteurs exclus', async () => {
    const { repo } = await setup();
    const jsp = createScopeJspReportingService(repo);
    const global = await jsp.report({ year: 2026 });
    const g1 = await jsp.report({ year: 2026, site: 'G1' });
    const c1 = await jsp.report({ year: 2026, site: 'C1' });
    eq(global.kpis.jeunes, 3);
    eq(global.exclusions.monitors, 1);
    eq(g1.kpis.jeunes, 2);
    eq(c1.kpis.jeunes, 1);
    ok(!global.persons.some((row) => row.nip === 'MON001'));
  });

  await record('05 - absent vs excuse et motifs nominatifs', async () => {
    const { report: r } = await report({ domaine: 'JSP' });
    eq(r.kpis.present, 1);
    eq(r.kpis.excused, 1);
    eq(r.kpis.absent, 1);
    ok(r.details.some((row) => row.nip === 'JSP002' && row.motif === 'Activité scolaire'));
    ok(r.details.some((row) => row.nip === 'JSP003' && row.motif === 'Absence sans excuse enregistrée'));
  });

  await record('06 - classement surveillance et regularite', async () => {
    const { report: r } = await report({ domaine: 'JSP' });
    eq(r.watchlist[0].nip, 'JSP003');
    eq(r.regulars[0].nip, 'JSP001');
  });

  await record('07 - tri grade descendant puis nom prenom', async () => {
    const { report: r } = await report({ domaine: 'DPS' });
    deep(r.persons.map((row) => row.nip), ['DPS001', 'DPS003', 'DPS002']);
  });

  await record('08 - objectif et personnes sous objectif', async () => {
    const { report: r } = await report({ domaine: 'DPS', perimeter: 'G1' });
    eq(r.objective.thresholdPct, 75);
    ok(r.underObjective.some((row) => row.nip === 'DPS002' && row.objectiveGap === -75));
    ok(!r.underObjective.some((row) => row.nip === 'DPS001'));
  });

  await record('09 - alerte rouge cause objectif ou absence', async () => {
    const { report: r } = await report({ domaine: 'DPS', perimeter: 'G1' });
    ok(r.alerts.some((row) => row.nip === 'DPS002' && /absence|objectif/i.test(row.cause)));
    const html = hooks().renderRapportJspHtml(r);
    ok(html.includes('scope-row-alert'));
    ok(html.includes('Personnes sous l’objectif'));
  });

  await record('10 - comparaison subdivisions et dedup NIP', async () => {
    const { report: r } = await report({ domaine: 'DPS' });
    eq(r.siteRows.find((row) => row.code === 'G1').participants, 2);
    eq(r.siteRows.find((row) => row.code === 'C1').participants, 1);
    eq(r.kpis.participants, new Set(r.persons.map((row) => row.nip)).size);
  });

  await record('11 - annule exclu et evenement 2027 hors periode', async () => {
    const { report: r, ids } = await report({ domaine: 'DPS' });
    ok(!r.exercises.some((row) => row.evenementId === ids.cancelled));
    ok(!r.exercises.some((row) => row.evenementId === ids.out));
    eq(r.exclusions.annules, 1);
  });

  await record('12 - configuration blocs ecran et PDF sans section vide forcee', async () => {
    const { report: r } = await report({ domaine: 'DPS', blocks: 'synthese,evenements' });
    deep(r.blocks, ['synthese', 'evenements']);
    const html = hooks().renderRapportJspHtml(r);
    ok(html.includes('Analyse par événement'));
    ok(!html.includes('Participation régulière</h2>'));
  });

  await record('13 - absence objectif ne fabrique aucun seuil', async () => {
    const { report: r } = await report({ domaine: 'JSP' });
    eq(r.objective, null);
    eq(r.objectiveLabel, 'Objectif non défini');
    eq(r.underObjective.length, 0);
  });

  await record('14 - API route et kind transversal declares', async () => {
    const scopeSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    const apiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
    const reportSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-report-data.js'), 'utf8');
    ok(scopeSrc.includes('/reporting/participation'));
    ok(apiSrc.includes('participationReport'));
    ok(reportSrc.includes('PARTICIPATION'));
    eq(L.parseHash('#/rapports/participation').screen, 'rapport-participation');
  });

  await record('15 - non regression reporting existant preserve', async () => {
    const { repo } = await setup();
    const legacy = await generateReport(repo, { kind: 'DOMAIN', domaine: 'DPS', year: 2026 }, ACTOR, { generatedAt: '2026-09-04T10:00:00Z' });
    ok(legacy.filename.includes('SCOPE_DPS_2026'));
    ok(legacy.buffer.length > 1000);
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
  console.log('SCOPE-REPORTING-2 PASS');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
