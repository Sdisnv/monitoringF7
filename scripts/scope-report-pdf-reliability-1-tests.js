#!/usr/bin/env node
'use strict';

/** SCOPE-REPORT-PDF-RELIABILITY-1 - PDF download and detailed PR report coherence. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { generateReport } = require('../netlify/lib/_scope-report-service');

const ROOT = path.join(__dirname, '..');
const viewerSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-pdf-viewer.js'), 'utf8');
const apiSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const results = [];
const CLAIMS = {
  roles: ['sdis-admin'],
  sub: 'scope-report-pdf-reliability-1',
  displayName: 'Test PDF Reliability'
};

const SESSION_EXPECTED = Object.freeze([
  { label: 'PR 1.1', presents: 14, excuses: 1, absents: 0, dispenses: 7, numerator: 14, denominator: 15, percentage: 93.3 },
  { label: 'PR 1.2', presents: 12, excuses: 1, absents: 0, dispenses: 0, numerator: 12, denominator: 13, percentage: 92.3 },
  { label: 'PR 1.3', presents: 14, excuses: 0, absents: 0, dispenses: 0, numerator: 14, denominator: 14, percentage: 100 },
  { label: 'PR 1.4', presents: 13, excuses: 0, absents: 0, dispenses: 0, numerator: 13, denominator: 13, percentage: 100 },
  { label: 'PR 1.5', presents: 13, excuses: 0, absents: 0, dispenses: 0, numerator: 13, denominator: 13, percentage: 100 },
  { label: 'PR 1.6', presents: 13, excuses: 0, absents: 1, dispenses: 1, numerator: 13, denominator: 14, percentage: 92.9 }
]);

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function personId(index){
  return `p${String(index).padStart(3, '0')}`;
}

function personIds(from, to){
  const ids = [];
  for(let index = from; index <= to; index += 1) ids.push(personId(index));
  return ids;
}

function event(id, section, date){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-pdf-reliability-1',
    domaine_code: 'PR',
    statut: 'REALISE',
    date,
    libelle: `Exercice PR 1.${section}`,
    code_cours: `PAPR.PR1.2026.${section}`,
    pr_exercise_group_key: 'PAPR:PR:1',
    pr_session_key: `PAPR:PR:1.${section}`,
    population_figee: true
  };
}

async function addParticipant(repo, id, nip){
  await repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Nom${id}`,
    prenom: `Prenom${id}`,
    grade: 'Sap',
    skipPeriodes: true
  });
  await repo.upsertCyclePersonne({
    cycle_id: 'cycle-pr-pdf-reliability-1',
    personne_id: id,
    role_cycle: 'PARTICIPANT',
    statut_cycle: 'ACTIF'
  });
  for(let section = 1; section <= 6; section += 1){
    await repo.upsertAttendu({ evenement_id: `pr1-s${section}`, personne_id: id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({
      evenement_id: `pr1-s${section}`,
      personne_id: id,
      statut: 'NON_RENSEIGNE',
      role: 'PARTICIPANT',
      source: 'GENERATION'
    });
  }
}

async function setParticipation(repo, eventId, personneId, statut, patch = {}){
  await repo.upsertParticipation({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: patch.role || 'PARTICIPANT',
    source: patch.source || 'SAISIE',
    motif_absence: patch.motif_absence || null
  });
}

async function setupFixture(){
  const repo = createMemoryRepo();
  await repo.insertCycle({
    cycle_id: 'cycle-pr-pdf-reliability-1',
    cycle_key: 'PAPR-PDF-RELIABILITY-1',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'PR 1'
  });
  const dates = ['2026-03-04', '2026-03-06', '2026-03-09', '2026-03-12', '2026-03-16', '2026-03-19'];
  for(let section = 1; section <= 6; section += 1){
    const created = await repo.insertEvenement(event(`pr1-s${section}`, section, dates[section - 1]));
    await repo.updateEventIfVersion(created.evenement_id, 1, { population_figee: true });
  }
  for(let index = 1; index <= 78; index += 1){
    await addParticipant(repo, personId(index), String(86000 + index));
  }
  await repo.insertPersonne({ personne_id: 'surv', nip: '86991', nom: 'Surveillant', prenom: 'Sarah', grade: 'Sap', skipPeriodes: true });
  await repo.insertPersonne({ personne_id: 'aux', nip: '86992', nom: 'Auxiliaire', prenom: 'Alex', grade: 'Civil', skipPeriodes: true });

  for(const id of personIds(1, 14)) await setParticipation(repo, 'pr1-s1', id, 'PRESENT');
  await setParticipation(repo, 'pr1-s1', personId(15), 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' });
  for(const id of personIds(16, 22)) await setParticipation(repo, 'pr1-s1', id, 'DISPENSE', { motif_absence: 'JOKER' });

  for(const id of personIds(23, 34)) await setParticipation(repo, 'pr1-s2', id, 'PRESENT');
  await setParticipation(repo, 'pr1-s2', personId(35), 'ABSENT_EXCUSE', { motif_absence: 'PROFESSIONNEL' });

  for(const id of personIds(36, 49)) await setParticipation(repo, 'pr1-s3', id, 'PRESENT');
  for(const id of personIds(50, 62)) await setParticipation(repo, 'pr1-s4', id, 'PRESENT');
  for(const id of personIds(63, 75)) await setParticipation(repo, 'pr1-s5', id, 'PRESENT');

  for(const id of personIds(1, 12)) await setParticipation(repo, 'pr1-s6', id, 'PRESENT');
  await setParticipation(repo, 'pr1-s6', personId(76), 'PRESENT', { role: 'FORMATEUR' });
  await setParticipation(repo, 'pr1-s6', personId(77), 'ABSENT_NON_EXCUSE');
  await setParticipation(repo, 'pr1-s6', personId(78), 'DISPENSE', { motif_absence: 'FORMATEUR_PR' });
  await setParticipation(repo, 'pr1-s6', 'surv', 'NON_CONCERNE', { role: 'SURVEILLANT', source: 'ENCADREMENT' });
  await setParticipation(repo, 'pr1-s6', 'aux', 'NON_CONCERNE', { role: 'AUXILIAIRE', source: 'ENCADREMENT' });

  return repo;
}

function makeElement(tag, options = {}){
  const element = {
    tagName: String(tag || '').toUpperCase(),
    children: [],
    parentNode: null,
    attributes: {},
    style: {},
    className: '',
    textContent: '',
    disabled: false,
    events: {},
    clickCount: 0,
    classList: {
      add(){},
      remove(){}
    },
    setAttribute(name, value){ this.attributes[name] = String(value); },
    addEventListener(name, handler){ this.events[name] = handler; },
    appendChild(child){ child.parentNode = this; this.children.push(child); return child; },
    removeChild(child){ this.children = this.children.filter((item) => item !== child); child.parentNode = null; return child; },
    remove(){ if(this.parentNode) this.parentNode.removeChild(this); },
    click(){ this.clickCount += 1; if(options.onClick) options.onClick(this); },
    querySelector(selector){ return (this._selectors && this._selectors[selector]) || null; }
  };
  Object.defineProperty(element, 'innerHTML', {
    get(){ return this._innerHTML || ''; },
    set(value){
      this._innerHTML = String(value || '');
      if(this.className === 'scope-pdf-overlay'){
        this._selectors = {
          '.scope-pdf-page-label': makeElement('span'),
          '[data-pdf-prev]': makeElement('button'),
          '[data-pdf-next]': makeElement('button'),
          '[data-pdf-zoom-out]': makeElement('button'),
          '[data-pdf-zoom-in]': makeElement('button'),
          '[data-pdf-download]': makeElement('button'),
          '[data-pdf-close]': makeElement('button'),
          '.scope-pdf-stage': makeElement('div'),
          '.scope-pdf-canvas': makeElement('canvas')
        };
      }
    }
  });
  if(tag === 'a' && options.supportsDownload) element.download = '';
  if(tag === 'canvas'){
    element.getContext = () => ({});
  }
  return element;
}

function loadViewerHarness(options = {}){
  const createdAnchors = [];
  const timers = [];
  const revoked = [];
  let createdUrlCount = 0;
  const supportsDownload = options.supportsDownload !== false;
  const body = makeElement('body');
  const document = {
    body,
    createElement(tag){
      const element = makeElement(tag, {
        supportsDownload,
        onClick: tag === 'a' ? (anchor) => createdAnchors.push(anchor) : null
      });
      return element;
    },
    getElementsByTagName(){ return []; },
    addEventListener(){}
  };
  const context = {
    console,
    document,
    navigator: { userAgent: options.userAgent || 'Mozilla/5.0 Chrome/126 Safari/537.36' },
    location: { href: '' },
    Blob,
    File: typeof File === 'function' ? File : null,
    URL: {
      createObjectURL(blob){
        createdUrlCount += 1;
        return `blob:https://scope-sdisnv.netlify.app/test-${createdUrlCount}`;
      },
      revokeObjectURL(url){ revoked.push(url); }
    },
    openCalls: [],
    open(url, target, features){
      context.openCalls.push({ url, target, features });
      return options.openReturnsFalse ? null : {};
    },
    setTimeout(fn, delay){
      const id = timers.length + 1;
      timers.push({ id, fn, delay, cleared: false });
      return id;
    },
    clearTimeout(id){
      const timer = timers.find((item) => item.id === id);
      if(timer) timer.cleared = true;
    }
  };
  context.window = context;
  vm.runInNewContext(viewerSrc, context, { filename: 'scope-pdf-viewer.js' });
  return {
    context,
    createdAnchors,
    timers,
    revoked,
    runTimers(delay){
      for(const timer of timers.filter((item) => item.delay === delay && !item.cleared)) timer.fn();
    },
    get createdUrlCount(){ return createdUrlCount; }
  };
}

function graphPointMap(graph){
  const points = graph.series && graph.series[0] && graph.series[0].points || [];
  return Object.fromEntries(points.map((point) => [point.label, point]));
}

function serieByLabel(graph, label){
  return (graph.series || []).find((serie) => serie.label === label);
}

let repoPromise = null;
let sessionPromise = null;
let eventPromise = null;
let generatedSessionPromise = null;

async function repo(){
  if(!repoPromise) repoPromise = setupFixture();
  return repoPromise;
}

async function sessionReport(){
  if(!sessionPromise){
    sessionPromise = repo().then((r) => collectReport(r, { kind: 'SESSION', evenementId: 'pr1-s6' }, { includeNominatif: true }));
  }
  return sessionPromise;
}

async function eventReport(){
  if(!eventPromise){
    eventPromise = repo().then((r) => collectReport(r, { kind: 'EVENT', evenementId: 'pr1-s6' }, { includeNominatif: true }));
  }
  return eventPromise;
}

async function generatedSession(){
  if(!generatedSessionPromise){
    generatedSessionPromise = repo().then((r) => generateReport(r, {
      kind: 'SESSION',
      evenementId: 'pr1-s6',
      nominatif: true
    }, CLAIMS, { generatedAt: '2026-09-04T10:00:00.000Z' }));
  }
  return generatedSessionPromise;
}

(async () => {
  await record('01 generation Blob PDF valide', async () => {
    const generated = await generatedSession();
    assert.ok(Buffer.isBuffer(generated.buffer));
    assert.strictEqual(generated.buffer.subarray(0, 4).toString('ascii'), '%PDF');
    const blob = new Blob([generated.buffer], { type: 'application/pdf' });
    assert.strictEqual(blob.type, 'application/pdf');
  });

  await record('02 MIME type PDF correct', async () => {
    assert.ok(apiSrc.includes("new Blob([buffer], { type: 'application/pdf' })"));
    const generated = await generatedSession();
    assert.ok(generated.buffer.length > 1000);
  });

  await record('03 filename SESSION correct', async () => {
    const model = await sessionReport();
    const generated = await generatedSession();
    assert.strictEqual(model.filename, 'SCOPE_Rapport_participation_PR_1_2026.pdf');
    assert.strictEqual(generated.filename, model.filename);
  });

  await record('04 filename EVENT correct', async () => {
    const model = await eventReport();
    assert.strictEqual(model.filename, 'SCOPE_Exercice_PR_GEN_2026-03-19.pdf');
  });

  await record('05 viewer recoit le bon Blob URL', async () => {
    const harness = loadViewerHarness();
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    harness.context.ScopePdfViewer.open({ blob, filename: 'SCOPE Test.pdf', pages: 1 });
    const url = harness.context.ScopePdfViewer._test.ensureDownloadUrl();
    assert.strictEqual(url, 'blob:https://scope-sdisnv.netlify.app/test-1');
    assert.strictEqual(harness.createdUrlCount, 1);
  });

  await record('06 download recoit le bon filename', async () => {
    const harness = loadViewerHarness();
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    harness.context.ScopePdfViewer.open({ blob, filename: 'SCOPE Test final.pdf', pages: 1 });
    harness.context.ScopePdfViewer.download();
    assert.strictEqual(harness.createdAnchors.length, 1);
    assert.strictEqual(harness.createdAnchors[0].download, 'SCOPE_Test_final.pdf');
    assert.strictEqual(harness.createdAnchors[0].href, 'blob:https://scope-sdisnv.netlify.app/test-1');
  });

  await record('07 Blob URL non revoquee avant declenchement', async () => {
    const harness = loadViewerHarness();
    harness.context.ScopePdfViewer.open({ blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }), filename: 'SCOPE.pdf' });
    harness.context.ScopePdfViewer.download();
    assert.strictEqual(harness.createdAnchors[0].clickCount, 1);
    assert.deepStrictEqual(harness.revoked, []);
  });

  await record('08 Blob URL liberee apres usage', async () => {
    const harness = loadViewerHarness();
    harness.context.ScopePdfViewer.open({ blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }), filename: 'SCOPE.pdf' });
    harness.context.ScopePdfViewer.download();
    harness.runTimers(60000);
    assert.deepStrictEqual(harness.revoked, ['blob:https://scope-sdisnv.netlify.app/test-1']);
  });

  await record('09 viewer reste utilisable', async () => {
    const harness = loadViewerHarness();
    harness.context.ScopePdfViewer.open({ blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }), filename: 'SCOPE.pdf', pages: 2 });
    assert.strictEqual(typeof harness.context.ScopePdfViewer.open, 'function');
    assert.strictEqual(typeof harness.context.ScopePdfViewer.close, 'function');
    assert.strictEqual(typeof harness.context.ScopePdfViewer.download, 'function');
    assert.ok(harness.context.document.body.children.some((node) => node.className === 'scope-pdf-overlay'));
  });

  await record('10 download ne regenere pas le PDF', async () => {
    assert.ok(!/generateReport\s*\(/.test(viewerSrc));
    assert.ok(!/fetch\s*\(/.test(viewerSrc));
    assert.ok(/current\.blob/.test(viewerSrc));
  });

  await record('11 fallback Safari present', async () => {
    const harness = loadViewerHarness({
      supportsDownload: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    });
    harness.context.ScopePdfViewer.open({ blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }), filename: 'SCOPE.pdf' });
    harness.context.ScopePdfViewer.download();
    assert.deepStrictEqual(harness.context.openCalls, [{
      url: 'blob:https://scope-sdisnv.netlify.app/test-1',
      target: '_blank',
      features: 'noopener'
    }]);
  });

  await record('12 aucune tentative de fetch reseau vers Blob URL', async () => {
    assert.ok(!/fetch\s*\(\s*url/.test(viewerSrc));
    assert.ok(!/fetch\s*\(\s*downloadUrl/.test(viewerSrc));
  });

  await record('13 denominateur officiel global = 70', async () => {
    const model = await sessionReport();
    assert.strictEqual(model.population, 78);
    assert.strictEqual(model.officiel.denominator, 70);
  });

  await record('14 taux officiel global = 95.7', async () => {
    const model = await sessionReport();
    assert.strictEqual(model.officiel.numerator, 67);
    assert.strictEqual(model.officiel.percentage, 95.7);
  });

  await record('15 graphique population Presents 67/78 approx 86', async () => {
    const model = await sessionReport();
    const point = graphPointMap(model.graphs.repartition).Présents;
    assert.strictEqual(model.graphs.repartition.question, 'Répartition de la population par statut');
    assert.strictEqual(point.value, 67);
    assert.strictEqual(Math.round((100 * point.value) / model.population), 86);
  });

  await record('16 graphique population Excuses 2/78 approx 3', async () => {
    const model = await sessionReport();
    const point = graphPointMap(model.graphs.repartition).Excusés;
    assert.strictEqual(point.value, 2);
    assert.strictEqual(Math.round((100 * point.value) / model.population), 3);
  });

  await record('17 graphique population Absents 1/78 approx 1', async () => {
    const model = await sessionReport();
    const point = graphPointMap(model.graphs.repartition).Absents;
    assert.strictEqual(point.value, 1);
    assert.strictEqual(Math.round((100 * point.value) / model.population), 1);
  });

  await record('18 graphique population Dispenses 8/78 approx 10', async () => {
    const model = await sessionReport();
    const point = graphPointMap(model.graphs.repartition).Dispensés;
    assert.strictEqual(point.value, 8);
    assert.strictEqual(Math.round((100 * point.value) / model.population), 10);
  });

  for(let index = 0; index < SESSION_EXPECTED.length; index += 1){
    const expected = SESSION_EXPECTED[index];
    await record(`${19 + index} ${expected.label} valeurs et taux`, async () => {
      const model = await sessionReport();
      const row = model.seances[index];
      assert.strictEqual(row.label, expected.label);
      assert.strictEqual(row.presents, expected.presents);
      assert.strictEqual(row.excuses, expected.excuses);
      assert.strictEqual(row.absents, expected.absents);
      assert.strictEqual(row.dispenses, expected.dispenses);
      assert.strictEqual(row.numerator, expected.numerator);
      assert.strictEqual(row.denominator, expected.denominator);
      assert.strictEqual(row.percentage, expected.percentage);
    });
  }

  await record('25 valeurs graphiques = valeurs du tableau source', async () => {
    const model = await sessionReport();
    const graph = model.graphs.volumesSeances;
    assert.strictEqual(graph.question, 'Répartition des statuts par séance (%)');
    const presents = serieByLabel(graph, 'Présents').points;
    const excuses = serieByLabel(graph, 'Excusés').points;
    const absents = serieByLabel(graph, 'Absents').points;
    const dispenses = serieByLabel(graph, 'Dispensés').points;
    for(let index = 0; index < SESSION_EXPECTED.length; index += 1){
      const row = model.seances[index];
      const filled = row.presents + row.excuses + row.absents + row.dispenses;
      assert.strictEqual(presents[index].value, filled ? Math.round((1000 * row.presents) / filled) / 10 : 0);
      assert.strictEqual(excuses[index].value, filled ? Math.round((1000 * row.excuses) / filled) / 10 : 0);
      assert.strictEqual(absents[index].value, filled ? Math.round((1000 * row.absents) / filled) / 10 : 0);
      assert.strictEqual(dispenses[index].value, filled ? Math.round((1000 * row.dispenses) / filled) / 10 : 0);
    }
  });

  await record('26 bilan global non somme naive des seances', async () => {
    const model = await sessionReport();
    const localPresents = model.seances.reduce((sum, row) => sum + row.presents, 0);
    assert.strictEqual(localPresents, 79);
    assert.strictEqual(model.officiel.volumes.presents, 67);
  });

  await record('27 DISPENSE motif Formateur PR reste dispense', async () => {
    const model = await sessionReport();
    const row = model.dispenses.find((item) => item.nip === '86078');
    assert.ok(row);
    assert.strictEqual(row.statut, 'DISPENSE');
    assert.strictEqual(row.motif, 'FORMATEUR_PR');
    assert.strictEqual(row.motifLabel, 'Formateur PR');
    assert.strictEqual(model.officiel.denominator, 70);
  });

  await record('28 role FORMATEUR distinct du motif Formateur PR', async () => {
    const event = await eventReport();
    const formateur = event.encadrement.find((item) => item.nip === '86076');
    const dispense = event.nominatif.find((item) => item.nip === '86078');
    assert.ok(formateur);
    assert.strictEqual(formateur.role, 'FORMATEUR');
    assert.ok(dispense);
    assert.strictEqual(dispense.statut, 'DISPENSE');
    assert.strictEqual(dispense.motifLabel, 'Formateur PR');
    assert.ok(!event.encadrement.some((item) => item.nip === '86078'));
  });

  await record('29 SURVEILLANT encadrement sans KPI', async () => {
    const event = await eventReport();
    assert.ok(event.encadrement.some((item) => item.nip === '86991' && item.role === 'SURVEILLANT'));
    assert.ok(!event.nominatif.some((item) => item.nip === '86991'));
    assert.strictEqual(event.officiel.numerator, 13);
    assert.strictEqual(event.officiel.denominator, 14);
  });

  await record('30 AUXILIAIRE encadrement sans KPI', async () => {
    const event = await eventReport();
    assert.ok(event.encadrement.some((item) => item.nip === '86992' && item.role === 'AUXILIAIRE'));
    assert.ok(!event.nominatif.some((item) => item.nip === '86992'));
    assert.strictEqual(event.officiel.percentage, 92.9);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const result of results){
    console.log(`${result.status} ${result.name}${result.proof ? `\n${result.proof}` : ''}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-REPORT-PDF-RELIABILITY-1: ${failed.length} test(s) en echec`);
    process.exit(1);
  }
  console.log(`\nSCOPE-REPORT-PDF-RELIABILITY-1: ${results.length} tests PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
