#!/usr/bin/env node
'use strict';
/** SCOPE-GRAPH-1 — datasets serveur, rendu SVG, tokens, pas de calcul de taux frontend. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeObjectivesService } = require('../netlify/functions/_scope-objectives-service');
const { createScopeDashboardService } = require('../netlify/functions/_scope-dashboard-service');
const {
  ROOT_DOMAINES,
  FOSPEC_FAMILY,
  packFromEvents,
  motifsDataset,
  permutationsDataset,
  compositionDataset,
  evolutionDataset
} = require('../netlify/functions/_scope-graphs');
const { STATUTS, KINDS, emptyVolumes } = require('../netlify/functions/_scope-analytics');
const charts = require('../assets/js/scope-charts.js');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'assets/data/scope/monitoring_exercices_sdis_2026.csv');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function seedPeople(repo, cibleId, count, prefix){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeWithStatuses(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, { sub: 'test' });
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, { sub: 'test' });
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, { sub: 'test' });
}

function ctx(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const objectives = createScopeObjectivesService(repo);
  const dashboard = createScopeDashboardService(repo);
  return { repo, service, objectives, dashboard };
}

async function enableDap(repo, dateBascule){
  const y4 = await repo.findCible('DAP', 'Y4');
  await repo.upsertRegleBascule({
    portee: 'CIBLE',
    cible_id: y4.cible_id,
    domaine_code: 'DAP',
    date_bascule: dateBascule || '2026-01-01',
    commentaire: 'GRAPH-1 tests'
  });
  return y4;
}

(async () => {
  await record('1 — aucune donnée officielle : pas de 0 % artificiel', async () => {
    const { dashboard } = ctx();
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(dash.officiel.percentage, null);
    assert.strictEqual(dash.graphs.contract, 'SCOPE-GRAPH-1');
    assert.strictEqual(dash.graphs.evolution.emptyReason, 'AUCUNE_SERIE_OFFICIELLE');
    const html = charts.renderLineChart(dash.graphs.evolution);
    assert.ok(!html.includes('0 %') && !html.includes('0,0'), html);
    assert.ok(html.includes('Aucune série officielle'));
  });

  await record('2 — NON_EVALUABLE conservé sur les barres domaine', async () => {
    const { dashboard } = ctx();
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const points = dash.graphs.domaines.series[0].points;
    assert.strictEqual(points.length, 6);
    assert.ok(points.every((p) => p.percentage == null && p.analyticStatus === STATUTS.NON_EVALUABLE));
    const svg = charts.renderBarChart(dash.graphs.domaines);
    assert.ok(svg.includes('Non évaluable'));
    assert.ok(!svg.includes('0 %'));
  });

  await record('3 — taux officiel serveur sur la courbe', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'G3');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Officiel', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      ...Array(8).fill('PRESENT'), 'ABSENT_NON_EXCUSE', 'ABSENT_NON_EXCUSE'
    ]);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(dash.officiel.percentage, 80);
    const evo = dash.graphs.evolution.series.find((s) => s.id === 'officiel').points.find((p) => p.label === '2026-03');
    assert.strictEqual(evo.percentage, 80);
    assert.strictEqual(evo.numerator, 8);
    assert.strictEqual(evo.denominator, 10);
    const svg = charts.renderLineChart(dash.graphs.evolution);
    assert.ok(svg.includes('polyline') || svg.includes('circle'));
    assert.ok(svg.includes('#171C8F'));
  });

  await record('4 — objectif unique tracé', async () => {
    const { repo, service, objectives, dashboard } = ctx();
    await objectives.createObjectif({ portee: 'GLOBAL', seuilPct: 85, dateDebut: '2026-01-01' }, { sub: 'test' });
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 10, 'G4');
    const created = await service.createEvenement({
      date: '2026-04-02', domaineCode: 'DPS', libelle: 'Obj', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, Array(10).fill('PRESENT'));
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const evo = dash.graphs.evolution.series.find((s) => s.id === 'officiel').points[0];
    assert.strictEqual(evo.thresholdPct, 85);
    const svg = charts.renderLineChart(dash.graphs.evolution);
    assert.ok(svg.includes('#FFA300'));
    assert.ok(svg.includes('stroke-dasharray'));
  });

  await record('5 — objectif non homogène : pas de ligne unique', async () => {
    const mixed = evolutionDataset({
      officiel: [{
        month: '2026-03',
        percentage: 80,
        numerator: 8,
        denominator: 10,
        eventCount: 2,
        thresholdPct: null,
        objective: null,
        objectiveContext: { homogeneous: false, distinctObjectives: [{ objectifId: 'a' }, { objectifId: 'b' }], reason: 'OBJECTIVES_MULTIPLES' }
      }],
      legacy: []
    });
    assert.strictEqual(mixed.series[0].points[0].thresholdPct, null);
    assert.strictEqual(mixed.series[0].points[0].objective, null);
    assert.ok(!charts.renderLineChart(mixed).includes('stroke-dasharray'));
    const twoLines = evolutionDataset({
      officiel: [
        { month: '2026-01', percentage: 80, numerator: 8, denominator: 10, eventCount: 1, thresholdPct: 80, objective: { thresholdPct: 80 }, objectiveContext: { homogeneous: true } },
        { month: '2026-02', percentage: 90, numerator: 9, denominator: 10, eventCount: 1, thresholdPct: 90, objective: { thresholdPct: 90 }, objectiveContext: { homogeneous: true } }
      ],
      legacy: []
    });
    assert.ok(!charts.renderLineChart(twoLines).includes('stroke-dasharray'));

    const { repo, service, objectives, dashboard } = ctx();
    await objectives.createObjectif({ portee: 'DOMAINE', domaineCode: 'FOSPEC', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 'test' });
    await objectives.createObjectif({ portee: 'DOMAINE', domaineCode: 'PR', seuilPct: 90, dateDebut: '2026-01-01' }, { sub: 'test' });
    const fos = await repo.findCible('FOSPEC', 'GEN');
    const pr = await repo.findCible('PR', 'G1');
    const p1 = await seedPeople(repo, fos.cible_id, 4, 'F5');
    const p2 = await seedPeople(repo, pr.cible_id, 4, 'P5');
    const a = await service.createEvenement({ date: '2026-03-01', domaineCode: 'FOSPEC', libelle: 'FOSPEC', cibleIds: [fos.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, a.evenement.evenement_id, p1, Array(4).fill('PRESENT'));
    const b = await service.createEvenement({ date: '2026-03-15', domaineCode: 'PR', libelle: 'PR', cibleIds: [pr.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, b.evenement.evenement_id, p2, Array(4).fill('PRESENT'));
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const fospec = dash.graphs.domaines.series[0].points.find((p) => p.id === 'FOSPEC');
    assert.ok(fospec.objectiveContext && fospec.objectiveContext.homogeneous === false);
    assert.strictEqual(fospec.objective, null);
    assert.strictEqual(fospec.gapPct, null);
    const bar = charts.renderBarChart(dash.graphs.domaines);
    const fospecBlock = bar.split('FOSPEC')[1] || '';
    assert.ok(!fospecBlock.split('</a>')[0].includes('stroke-dasharray'));
  });

  await record('6-7 — LEGACY séparé, jamais fusionné', async () => {
    const { repo, service, dashboard } = ctx();
    await enableDap(repo, '2026-08-19');
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.ok(dash.legacy.eventCount >= 8);
    assert.strictEqual(dash.officiel.eventCount, 0);
    const evo = dash.graphs.evolution;
    assert.strictEqual(evo.emptyReason, 'UNIQUEMENT_LEGACY');
    const off = evo.series.find((s) => s.id === 'officiel');
    const leg = evo.series.find((s) => s.id === 'legacy');
    assert.ok(leg.points.length >= 1);
    assert.ok(off.points.every((p) => p.kind === KINDS.OFFICIEL));
    assert.ok(leg.points.every((p) => p.kind === KINDS.LEGACY));
    assert.ok(leg.points.every((p) => p.objective == null));
    const svg = charts.renderLineChart(evo);
    assert.ok(svg.includes('#54585A'));
    assert.ok(!svg.includes('polyline') || off.points.every((p) => p.value == null));
  });

  await record('8 — agrégation somme/somme, pas de moyenne de %', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const c1 = await repo.findCible('DPS', 'C1');
    const p1 = await seedPeople(repo, g1.cible_id, 10, 'A8');
    const p2 = await seedPeople(repo, c1.cible_id, 5, 'B8');
    const a = await service.createEvenement({ date: '2026-02-01', domaineCode: 'DPS', libelle: 'G1', cibleIds: [g1.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, a.evenement.evenement_id, p1, Array(10).fill('PRESENT'));
    const b = await service.createEvenement({ date: '2026-02-10', domaineCode: 'DPS', libelle: 'C1', cibleIds: [c1.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, b.evenement.evenement_id, p2, Array(5).fill('ABSENT_NON_EXCUSE'));
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const dps = dash.graphs.domaines.series[0].points.find((p) => p.id === 'DPS');
    assert.strictEqual(dps.numerator, 10);
    assert.strictEqual(dps.denominator, 15);
    assert.notStrictEqual(dps.percentage, 50);
    assert.strictEqual(dps.percentage, dash.officiel.percentage);
  });

  await record('9-13 — domaines MODEL-2, PR/AUTO sous FOSPEC', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const pr = await repo.findCible('PR', 'G1');
    const auto = await repo.findCible('AUTO', 'VL');
    const fos = await repo.findCible('FOSPEC', 'GEN');
    const pDps = await seedPeople(repo, g1.cible_id, 10, 'D9');
    const pPr = await seedPeople(repo, pr.cible_id, 5, 'P9');
    const pAuto = await seedPeople(repo, auto.cible_id, 4, 'U9');
    const pFos = await seedPeople(repo, fos.cible_id, 10, 'F9');
    const e1 = await service.createEvenement({ date: '2026-05-01', domaineCode: 'DPS', libelle: 'DPS', cibleIds: [g1.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, e1.evenement.evenement_id, pDps, Array(10).fill('PRESENT'));
    const e2 = await service.createEvenement({ date: '2026-05-02', domaineCode: 'FOSPEC', libelle: 'FOSPEC', cibleIds: [fos.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, e2.evenement.evenement_id, pFos, Array(10).fill('PRESENT'));
    const e3 = await service.createEvenement({ date: '2026-05-03', domaineCode: 'PR', libelle: 'PR', cibleIds: [pr.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, e3.evenement.evenement_id, pPr, Array(5).fill('ABSENT_NON_EXCUSE'));
    const e4 = await service.createEvenement({ date: '2026-05-04', domaineCode: 'AUTO', libelle: 'AUTO', cibleIds: [auto.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, e4.evenement.evenement_id, pAuto, Array(4).fill('PRESENT'));
    const sdis = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(sdis.domaines.length, 8);
    const ids = sdis.graphs.domaines.series[0].points.map((p) => p.id);
    assert.deepStrictEqual(ids, ROOT_DOMAINES.slice());
    assert.ok(!ids.includes('PR'));
    assert.ok(!ids.includes('AUTO'));
    const fospec = sdis.graphs.domaines.series[0].points.find((p) => p.id === 'FOSPEC');
    assert.strictEqual(fospec.numerator, 14);
    assert.strictEqual(fospec.denominator, 19);
    assert.ok(fospec.href.includes('#/vue/FOSPEC'));
    const fospecView = await dashboard.dashboard({ year: 2026, preset: 'YEAR', domaine: 'FOSPEC' });
    assert.strictEqual(fospecView.graphs.domaines.emptyReason, 'CONTEXTE_DRILL');
    const kids = fospecView.graphs.children.series[0].points;
    assert.deepStrictEqual(kids.map((p) => p.id).sort(), ['AUTO', 'PR']);
    assert.ok(kids.find((p) => p.id === 'PR').label.includes('Protection respiratoire'));
    assert.strictEqual(kids.find((p) => p.id === 'PR').numerator, 0);
    assert.strictEqual(kids.find((p) => p.id === 'PR').denominator, 5);
    assert.strictEqual(kids.find((p) => p.id === 'AUTO').percentage, 100);
    const dpsView = await dashboard.dashboard({ year: 2026, preset: 'YEAR', domaine: 'DPS' });
    const oi = dpsView.graphs.children.series[0].points.map((p) => p.id);
    assert.ok(oi.includes('G1') && oi.includes('C1') && oi.includes('B1') && oi.includes('B2'));
    assert.ok(!oi.includes('Y1'));
  });

  await record('10-11 — sous-domaines DAP Y1-Y4', async () => {
    const { repo, service, dashboard } = ctx();
    const y4 = await enableDap(repo);
    const people = await seedPeople(repo, y4.cible_id, 4, 'Y4');
    const created = await service.createEvenement({
      date: '2026-06-01', domaineCode: 'DAP', libelle: 'Y4', cibleIds: [y4.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, Array(4).fill('PRESENT'));
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR', domaine: 'DAP' });
    const ids = dash.graphs.children.series[0].points.map((p) => p.id);
    assert.deepStrictEqual(ids.sort(), ['Y1', 'Y2', 'Y3', 'Y4']);
    assert.strictEqual(dash.graphs.children.grain, 'CIBLE');
    const y4p = dash.graphs.children.series[0].points.find((p) => p.id === 'Y4');
    assert.strictEqual(y4p.percentage, 100);
    assert.ok(y4p.href.includes('/Y4'));
  });

  await record('14-17 — composition présents / excusés / non excusés / dispensés', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 8, 'C4');
    const created = await service.createEvenement({
      date: '2026-07-01', domaineCode: 'DPS', libelle: 'Mix', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'PRESENT',
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      'ABSENT_NON_EXCUSE',
      'DISPENSE',
      'DISPENSE'
    ]);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const points = dash.graphs.composition.series[0].points;
    const byId = Object.fromEntries(points.map((p) => [p.id, p]));
    assert.strictEqual(byId.presents.value, 3);
    assert.strictEqual(byId.excuses.value, 2);
    assert.strictEqual(byId.nonExcuses.value, 1);
    assert.strictEqual(byId.dispenses.value, 2);
    assert.strictEqual(byId.dispenses.inDenominator, false);
    assert.strictEqual(byId.presents.inDenominator, true);
    assert.strictEqual(dash.officiel.denominator, 6);
    const svg = charts.renderStackedBar(dash.graphs.composition);
    assert.ok(svg.includes('hors dén'));
    assert.ok(svg.includes('scope-hatch-dispense'));
  });

  await record('18-22 — motifs d’excuse + non précisé historique seulement si volume', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 4, 'M5');
    const created = await service.createEvenement({
      date: '2026-07-08', domaineCode: 'DPS', libelle: 'Motifs', cibleIds: [g1.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'ARMEE' },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'ACCIDENT_MALADIE' }
    ]);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const points = dash.graphs.motifs.series[0].points;
    const ids = points.map((p) => p.id);
    assert.deepStrictEqual(ids, ['PRIVE', 'PROFESSIONNEL', 'ARMEE', 'ACCIDENT_MALADIE']);
    assert.ok(points.every((p) => p.value === 1));
    const emptyHist = motifsDataset({ volumes: emptyVolumes() });
    assert.ok(!emptyHist.series[0].points.some((p) => p.id === 'NON_PRECISE'));
    const volumes = emptyVolumes();
    volumes.excusesNonPrecise = 3;
    volumes.excusesPrive = 1;
    const hist = motifsDataset({ volumes });
    assert.ok(hist.series[0].points.some((p) => p.id === 'NON_PRECISE' && p.value === 3));
    const svg = charts.renderBarChart(dash.graphs.motifs);
    assert.ok(svg.includes('Privé'));
    assert.ok(!svg.toLowerCase().includes('pie') && !svg.includes('camembert'));
  });

  await record('23-25 — permutation DAP sans double comptage, absente hors DAP', async () => {
    const { repo, service, dashboard } = ctx();
    const y4 = await enableDap(repo);
    const people = await seedPeople(repo, y4.cible_id, 5, 'PM');
    const created = await service.createEvenement({
      date: '2026-07-12', domaineCode: 'DAP', libelle: 'Perm', cibleIds: [y4.cible_id]
    }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, [
      'PRESENT', 'PRESENT', 'PERMUTATION', 'ABSENT_NON_EXCUSE', 'DISPENSE'
    ]);
    const dap = await dashboard.dashboard({ year: 2026, preset: 'YEAR', domaine: 'DAP' });
    const vol = dap.officiel.volumes;
    assert.strictEqual(vol.presents, 3);
    assert.strictEqual(vol.permutations, 1);
    const points = dap.graphs.permutations.series[0].points;
    const hors = points.find((p) => p.id === 'presentHorsPermutation').value;
    const perm = points.find((p) => p.id === 'permutations').value;
    assert.strictEqual(hors + perm, vol.presents);
    assert.strictEqual(perm, 1);
    assert.strictEqual(points.find((p) => p.id === 'permutations').subsetOf, 'presents');
    const dps = await dashboard.dashboard({ year: 2026, preset: 'YEAR', domaine: 'DPS' });
    assert.strictEqual(dps.graphs.permutations.emptyReason, 'HORS_DAP');
    assert.strictEqual(charts.renderChartCard(dps.graphs.permutations), '');
    const sdis = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(sdis.graphs.permutations.emptyReason, 'HORS_DAP');
  });

  await record('26 — PeriodContext YEAR vs MONTH', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const p1 = await seedPeople(repo, g1.cible_id, 4, 'PC');
    const a = await service.createEvenement({ date: '2026-03-12', domaineCode: 'DPS', libelle: 'Mars', cibleIds: [g1.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, a.evenement.evenement_id, p1, Array(4).fill('PRESENT'));
    const year = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const month = await dashboard.dashboard({ year: 2026, preset: 'MONTH', month: 6 });
    assert.ok(year.graphs.composition.series[0].points.some((p) => p.id === 'presents' && p.value === 4));
    assert.strictEqual(month.graphs.evolution.emptyReason, 'AUCUNE_SERIE_OFFICIELLE');
    assert.strictEqual(month.officiel.eventCount, 0);
  });

  await record('27-28 — drill-down href + explain graphique', async () => {
    const { repo, service, dashboard } = ctx();
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 2, 'DR');
    const created = await service.createEvenement({ date: '2026-08-01', domaineCode: 'DPS', libelle: 'Drill', cibleIds: [g1.cible_id] }, { sub: 'test' });
    await closeWithStatuses(service, created.evenement.evenement_id, people, ['PRESENT', 'PRESENT']);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    const dps = dash.graphs.domaines.series[0].points.find((p) => p.id === 'DPS');
    assert.strictEqual(dps.href, '#/vue/DPS');
    const card = charts.renderChartCard(dash.graphs.domaines);
    assert.ok(card.includes('data-graph-explain="domaines"'));
    assert.ok(card.includes('#/vue/DPS'));
    const panel = charts.renderGraphExplain(dash.graphs.evolution, dash.explain);
    assert.ok(panel.includes('Comprendre ce graphique'));
    assert.ok(panel.includes('OFFICIEL'));
  });

  await record('29 — absence de calcul de taux frontend', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const chartSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-charts.js'), 'utf8');
    for(const src of [ui, chartSrc]){
      assert.ok(!src.includes('computeTaux'));
      assert.ok(!src.includes('officialFromTaux'));
      assert.ok(!src.includes('officialFromQuantitatif'));
      assert.ok(!src.includes('safePercentage'));
    }
    assert.ok(chartSrc.includes('Aucun calcul de taux'));
    assert.ok(ui.includes('dash.graphs'));
    assert.ok(ui.includes('ScopeCharts'));
  });

  await record('30 — responsive 1200 / 1024 / 768 + hauteur évolution', async () => {
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('@media (max-width: 1200px)'));
    assert.ok(css.includes('@media (max-width: 1024px)'));
    assert.ok(css.includes('@media (max-width: 768px)'));
    assert.ok(css.includes('.scope-graph-grid { grid-template-columns: 1fr; }'));
    assert.ok(css.includes('max-height: 140px'));
    assert.ok(css.includes('max-height: 188px'));
    assert.ok(css.includes('overflow-x: hidden'));
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    assert.ok(html.includes('scope-charts.js'));
  });

  await record('31 — tokens couleurs centralisés', async () => {
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    const chartSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-charts.js'), 'utf8');
    assert.ok(css.includes('--scope-chart-primary: #171C8F'));
    assert.ok(css.includes('--scope-chart-secondary: #DE000A'));
    assert.ok(css.includes('--scope-chart-neutral: #54585A'));
    assert.ok(css.includes('--scope-chart-warning: #FFA300'));
    assert.strictEqual(charts.TOKENS.primary, '#171C8F');
    assert.strictEqual(charts.colorOf('present'), '#171C8F');
    assert.strictEqual(charts.colorOf('nonExcuse'), '#DE000A');
    assert.strictEqual(charts.colorOf('excuse'), '#FFA300');
    assert.strictEqual(charts.colorOf('dispense'), '#54585A');
    assert.strictEqual(charts.colorOf('legacy'), charts.colorOf('dispense'));
    assert.ok(!chartSrc.includes('#de000a'));
  });

  await record('32 — LEGACY hors objectif officiel + contrat REPORT-1', async () => {
    const { repo, service, objectives, dashboard } = ctx();
    await enableDap(repo, '2026-08-19');
    await objectives.createObjectif({ portee: 'GLOBAL', seuilPct: 80, dateDebut: '2026-01-01' }, { sub: 'test' });
    const csvText = fs.readFileSync(CSV_PATH, 'utf8');
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const graphs = await dashboard.graphs({ year: 2026, preset: 'YEAR' });
    assert.strictEqual(graphs.pdfReady, true);
    assert.strictEqual(graphs.renderer, 'svg');
    const legacyPoints = graphs.evolution.series.find((s) => s.id === 'legacy').points;
    assert.ok(legacyPoints.length >= 1);
    assert.ok(legacyPoints.every((p) => p.objective == null && p.thresholdPct == null));
    assert.ok(graphs.evolution.explain.note.includes('fusion'));
  });

  await record('route /analytics/graphs déclarée + pas de librairie lourde', async () => {
    const scopeJs = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    assert.ok(scopeJs.includes('/analytics/graphs'));
    assert.ok(!pkg.includes('chart.js') && !pkg.includes('d3') && !pkg.includes('"recharts"'));
    assert.strictEqual(packFromEvents([]).percentage, null);
    const perm = permutationsDataset({ volumes: emptyVolumes() }, 'FOCA');
    assert.strictEqual(perm.emptyReason, 'HORS_DAP');
    const evo = evolutionDataset({ officiel: [], legacy: [] });
    assert.strictEqual(evo.emptyReason, 'AUCUNE_SERIE_OFFICIELLE');
    const comp = compositionDataset({ volumes: emptyVolumes() });
    assert.strictEqual(comp.emptyReason, 'AUCUNE_COMPOSITION');
    charts.formatPct(null);
    assert.strictEqual(charts.formatPct(null), 'Non évaluable');
    assert.strictEqual(charts.formatGap(null), '');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    console.error(`\nSCOPE-GRAPH-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`\nSCOPE-GRAPH-1: ${results.length} PASS`);
})();
