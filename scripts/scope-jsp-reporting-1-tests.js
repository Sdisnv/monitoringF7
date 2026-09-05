#!/usr/bin/env node
'use strict';

/** SCOPE-JSP-REPORTING-1 - rapport operationnel JSP global/sites. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeJspReportingService } = require('../netlify/lib/_scope-jsp-reporting');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const L = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const uiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const ACTOR = { sub: 'scope-jsp-reporting-1', permissions: ['dashboard:read', 'reports:nominatif', 'personnel:read'] };
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

async function seedPerson(repo, cibles, spec){
  const p = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'JSP',
    date_entree: '2020-01-01'
  });
  for(const row of cibles){
    await repo.insertAffectation({
      personne_id: p.personne_id,
      cible_id: row.cible_id,
      date_debut: spec.dateDebut || '2026-01-01',
      date_fin: spec.dateFin || null
    });
  }
  return p;
}

async function createFrozen(service, cibleRow, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: 'JSP',
    libelle,
    cibleIds: [cibleRow.cible_id]
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function realize(repo, eventId, byNip){
  const event = await repo.getEvent(eventId);
  const attendus = await repo.listAttendus(eventId);
  const people = await repo.listPersonnes({});
  const personById = new Map(people.map((p) => [p.personne_id, p]));
  for(const attendu of attendus.filter((row) => row.inclus !== false)){
    const person = personById.get(attendu.personne_id);
    const spec = (person && byNip[person.nip]) || {};
    await repo.upsertParticipation({
      evenement_id: eventId,
      personne_id: attendu.personne_id,
      statut: spec.statut || 'NON_RENSEIGNE',
      motif_absence: spec.motif || null,
      role: spec.role || 'PARTICIPANT',
      source: 'SAISIE'
    });
  }
  await repo.updateEventIfVersion(eventId, event.version, { statut: 'REALISE' });
}

async function setupWorld(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const g1 = await cible(repo, 'JSP', 'G1');
  const c1 = await cible(repo, 'JSP', 'C1');
  const b1 = await cible(repo, 'JSP', 'B1');
  const dps = await cible(repo, 'DPS', 'G1');

  const people = {
    g1a: await seedPerson(repo, [g1], { nip: 'JSP1001', nom: 'Alpha', prenom: 'Anne', grade: 'JSP' }),
    g1b: await seedPerson(repo, [g1], { nip: 'JSP1002', nom: 'Bravo', prenom: 'Bilel', grade: 'Flm 1' }),
    c1a: await seedPerson(repo, [c1], { nip: 'JSP2001', nom: 'Charlie', prenom: 'Cora', grade: 'Flm 2' }),
    c1b: await seedPerson(repo, [c1], { nip: 'JSP2002', nom: 'Delta', prenom: 'Dina', grade: 'Flm 3' }),
    b1a: await seedPerson(repo, [b1], { nip: 'JSP3001', nom: 'Echo', prenom: 'Eli', grade: 'JSP' }),
    b1b: await seedPerson(repo, [b1], { nip: 'JSP3002', nom: 'Foxtrot', prenom: 'Fia', grade: 'Flm 1' }),
    monitor: await seedPerson(repo, [g1, dps], { nip: 'MON9001', nom: 'Moniteur', prenom: 'Max', grade: 'Sgt' })
  };

  const e1 = await createFrozen(service, g1, '2026-03-05', 'Exercice JSP G1');
  await repo.upsertAttendu({ evenement_id: e1.eventId, personne_id: people.monitor.personne_id, inclus: true, origine: 'TEST' });
  await repo.upsertParticipation({ evenement_id: e1.eventId, personne_id: people.monitor.personne_id, statut: 'PRESENT', role: 'MONITEUR' });
  await realize(repo, e1.eventId, {
    JSP1001: { statut: 'PRESENT' },
    JSP1002: { statut: 'ABSENT_EXCUSE', motif: 'ACTIVITE_SCOLAIRE' },
    MON9001: { statut: 'PRESENT', role: 'MONITEUR' }
  });

  const e2 = await createFrozen(service, c1, '2026-04-10', 'Exercice JSP C1');
  await realize(repo, e2.eventId, {
    JSP2001: { statut: 'ABSENT_NON_EXCUSE' },
    JSP2002: { statut: 'PRESENT' }
  });

  const e3 = await createFrozen(service, b1, '2026-05-15', 'Exercice JSP B1');
  await realize(repo, e3.eventId, {
    JSP3001: { statut: 'PRESENT' },
    JSP3002: { statut: 'ABSENT_EXCUSE', motif: 'ACCIDENT_MALADIE' }
  });

  const cancelled = await createFrozen(service, g1, '2026-06-01', 'Exercice JSP annulé');
  await realize(repo, cancelled.eventId, { JSP1001: { statut: 'ABSENT_NON_EXCUSE' }, JSP1002: { statut: 'ABSENT_NON_EXCUSE' } });
  const cancelledEvent = await repo.getEvent(cancelled.eventId);
  await repo.updateEventIfVersion(cancelled.eventId, cancelledEvent.version, { statut: 'ANNULE' });

  const moved = await createFrozen(service, g1, '2027-01-08', 'Exercice JSP déplacé');
  const movedEvent = await repo.getEvent(moved.eventId);
  await repo.updateEventIfVersion(moved.eventId, movedEvent.version, { date: '2026-11-05' });
  await realize(repo, moved.eventId, { JSP1001: { statut: 'PRESENT' }, JSP1002: { statut: 'ABSENT_NON_EXCUSE' } });

  const outside = await createFrozen(service, b1, '2027-02-03', 'Exercice JSP 2027');
  await realize(repo, outside.eventId, { JSP3001: { statut: 'ABSENT_NON_EXCUSE' }, JSP3002: { statut: 'ABSENT_NON_EXCUSE' } });

  return { repo, service, ids: { e1: e1.eventId, e2: e2.eventId, e3: e3.eventId, moved: moved.eventId, cancelled: cancelled.eventId, outside: outside.eventId } };
}

async function reportFor(site){
  const ctx = await setupWorld();
  const svc = createScopeJspReportingService(ctx.repo);
  const report = await svc.report({ year: 2026, site });
  return { ...ctx, report };
}

function scopeUiHooks(){
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
    document: {
      getElementById(id){ return id === 'scope-root' ? root : null; },
      addEventListener(){},
      querySelectorAll(){ return []; },
      querySelector(){ return null; }
    },
    location: { hash: '#/rapports/jsp', search: '' },
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
  await record('01 - jeunes inclus et moniteurs exclus', async () => {
    const { report } = await reportFor('');
    eq(report.kpis.jeunes, 6);
    eq(report.kpis.expected, 8);
    eq(report.exclusions.monitors, 1);
    ok(!report.persons.some((row) => row.nip === 'MON9001'));
  });

  await record('02 - sites G1 C1 B1 isolés', async () => {
    const g1 = (await reportFor('G1')).report;
    const c1 = (await reportFor('C1')).report;
    const b1 = (await reportFor('B1')).report;
    eq(g1.kpis.jeunes, 2);
    eq(c1.kpis.jeunes, 2);
    eq(b1.kpis.jeunes, 2);
    eq(g1.kpis.exercises, 2);
    eq(c1.kpis.exercises, 1);
    eq(b1.kpis.exercises, 1);
  });

  await record('03 - global coherent et deduplique par NIP', async () => {
    const { report } = await reportFor('');
    const siteExpected = report.siteRows.reduce((sum, row) => sum + row.expected, 0);
    eq(report.kpis.expected, siteExpected);
    eq(report.kpis.jeunes, new Set(report.persons.map((row) => row.nip)).size);
  });

  await record('04 - presents excuses absents distincts', async () => {
    const { report } = await reportFor('');
    eq(report.kpis.present, 4);
    eq(report.kpis.excused, 2);
    eq(report.kpis.absent, 2);
    eq(report.kpis.denominator, 8);
    eq(report.kpis.presenceRate, 50);
  });

  await record('05 - motif excuse conserve sans invention', async () => {
    const { report } = await reportFor('');
    deep(report.motifs.map((row) => row.motif).sort(), ['Accident / maladie', 'Activité scolaire']);
    ok(report.details.some((row) => row.nip === 'JSP2001' && row.motif === 'Absence sans excuse enregistrée'));
  });

  await record('06 - surveillance priorise absents sans excuse', async () => {
    const { report } = await reportFor('');
    eq(report.watchlist[0].nip, 'JSP1002');
    eq(report.watchlist[0].absent, 1);
    ok(report.watchlist[0].excused >= 1);
  });

  await record('07 - excuses frequentes et reguliers identifies', async () => {
    const { report } = await reportFor('');
    ok(report.watchlist.some((row) => row.nip === 'JSP1002' && row.totalAbsences === 2));
    eq(report.regulars[0].nip, 'JSP1001');
    eq(report.regulars[0].presenceRate, 100);
    eq(report.regulars[0].present, 2);
  });

  await record('08 - denominateur base sur attendus reels personne', async () => {
    const { report } = await reportFor('');
    const jsp1001 = report.persons.find((row) => row.nip === 'JSP1001');
    const jsp3001 = report.persons.find((row) => row.nip === 'JSP3001');
    eq(jsp1001.expected, 2);
    eq(jsp3001.expected, 1);
    eq(jsp3001.presenceRate, 100);
  });

  await record('09 - annule exclu et historique conserve cote donnees', async () => {
    const { repo, report, ids } = await reportFor('');
    ok(!report.exercises.some((row) => row.evenementId === ids.cancelled));
    eq(report.exclusions.annules, 1);
    eq((await repo.getEvent(ids.cancelled)).statut, 'ANNULE');
  });

  await record('10 - date deplacee utilisee et 2027 exclu de 2026', async () => {
    const { report, ids } = await reportFor('');
    ok(report.exercises.some((row) => row.evenementId === ids.moved && row.date === '2026-11-05'));
    ok(!report.exercises.some((row) => row.evenementId === ids.outside));
  });

  await record('11 - filtre site recalcule sans pollution', async () => {
    const global = (await reportFor('')).report;
    const c1 = (await reportFor('C1')).report;
    eq(global.kpis.expected, 8);
    eq(c1.kpis.expected, 2);
    ok(c1.persons.every((row) => row.site === 'JSP C1'));
  });

  await record('12 - donnees graphes coherentes', async () => {
    const { report } = await reportFor('');
    eq(report.graphs.evolution.length, report.exercises.length);
    eq(report.graphs.sites.reduce((sum, row) => sum + row.presents, 0), report.kpis.present);
    eq(report.graphs.motifs.reduce((sum, row) => sum + row.value, 0), report.kpis.excused);
  });

  await record('13 - analyse par exercice expose ecart attendu presents', async () => {
    const { report } = await reportFor('');
    const g1 = report.exercises.find((row) => row.libelle === 'Exercice JSP G1');
    eq(g1.expected, 2);
    eq(g1.present, 1);
    eq(g1.gap, -1);
  });

  await record('14 - route et API JSP branchees', async () => {
    const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    const apiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
    eq(L.parseHash('#/rapports/jsp').screen, 'rapport-jsp');
    ok(apiSrc.includes('/reporting/jsp'));
    ok(logicSrc.includes("screen: 'rapport-jsp'"));
  });

  await record('15 - rendu HTML contient les sections demandees', async () => {
    const { report } = await reportFor('');
    const html = scopeUiHooks().renderRapportJspHtml(report);
    for(const needle of [
      'RAPPORT JSP',
      'Participation à surveiller',
      'Participation régulière',
      'Motifs d’excuse',
      'Analyse par exercice',
      'Analyse par site',
      'Évolution du taux de présence',
      'Comparaison des sites',
      'Exporter PDF'
    ]){
      ok(html.includes(needle), `${needle} absent du rendu`);
    }
  });

  await record('16 - PDF JSP genere par moteur REPORT-1', async () => {
    const { repo } = await setupWorld();
    const result = await generateReport(repo, { kind: 'JSP', year: 2026, site: 'G1' }, ACTOR, { generatedAt: '2026-09-04T10:00:00Z' });
    ok(Buffer.isBuffer(result.buffer));
    ok(result.buffer.length > 1000);
    ok(result.filename.includes('SCOPE_Rapport_JSP_G1_2026'));
    ok(result.pages >= 1);
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
  console.log('SCOPE-JSP-REPORTING-1 PASS');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
