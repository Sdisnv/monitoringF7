#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const html = read('scope.html');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const schema = read('netlify/lib/_scope-schema.js');
const logicSrc = read('assets/js/scope-ui-logic.js');
const referentials = require('../netlify/lib/_scope-quo-vadis-referentials');

const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const notes = ui.slice(ui.indexOf('function qvOfficialLieux('), ui.indexOf('function renderQuoVadisActivites('));
const filtered = ui.slice(ui.indexOf('function qvFilteredActivities('), ui.indexOf('function qvActivitySortValue('));
const sortFn = ui.slice(ui.indexOf('function qvSortActivities('), ui.indexOf('function qvFilterOptions('));
const monthFn = ui.slice(ui.indexOf('function qvBuildMonth('), ui.indexOf('function qvMonthActivityCount('));
const addressCss = css.slice(css.indexOf('.qv-note-addresses {'), css.indexOf('.qv-activity-salle'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.deepStrictEqual([...referentials.SCOPE_SITE_ORDER], ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);
assert.deepStrictEqual([...L.SCOPE_SITE_ORDER], [...referentials.SCOPE_SITE_ORDER]);
assert.ok(L.scopeSiteRank('G1') < L.scopeSiteRank('C1'));
assert.ok(L.scopeSiteRank('C1') < L.scopeSiteRank('B1'));
assert.ok(L.scopeSiteRank('B1') < L.scopeSiteRank('B2'));
assert.ok(L.scopeSiteRank('B2') < L.scopeSiteRank('Y1'));
assert.ok(L.scopeSiteRank('Y1') < L.scopeSiteRank('Y2'));
assert.ok(L.scopeSiteRank('Y2') < L.scopeSiteRank('Y3'));
assert.ok(L.scopeSiteRank('Y3') < L.scopeSiteRank('Y4'));
assert.ok(L.scopeSiteRank('Y4') < L.scopeSiteRank(''));
assert.ok(L.scopeSiteRank('') === L.SCOPE_SITE_ORDER.length);

const case1 = ['Y3', 'B1', 'G1', 'Y1', 'C1', 'B2', 'Y4', 'Y2'].map((site, index) => ({
  startsAt: '2027-06-03T19:00:00',
  oiCode: site,
  activityId: `id-${index}`
})).sort(L.compareQvActivities);
assert.deepStrictEqual(case1.map((row) => row.oiCode), ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);

const case2 = [
  { startsAt: '2027-06-03T19:00:00', oiCode: 'Y4', activityId: 'y4' },
  { startsAt: '2027-06-03T19:30:00', oiCode: 'G1', activityId: 'g1' }
].sort(L.compareQvActivities);
assert.deepStrictEqual(case2.map((row) => row.oiCode), ['Y4', 'G1']);

const case3 = [
  { startsAt: '2027-06-03T19:00:00', oiCode: 'Y1', activityId: 'y1' },
  { startsAt: '2027-06-03T19:00:00', activityId: 'none' },
  { startsAt: '2027-06-03T19:00:00', oiCode: 'B2', activityId: 'b2' },
  { startsAt: '2027-06-03T19:00:00', oiCode: 'G1', activityId: 'g1' }
].sort(L.compareQvActivities);
assert.deepStrictEqual(case3.map((row) => row.activityId), ['g1', 'b2', 'y1', 'none']);

const case4 = [
  { startsAt: '2027-06-03T19:00:00', oiCode: 'G1', activityId: 'EV-B' },
  { startsAt: '2027-06-03T19:00:00', oiCode: 'G1', activityId: 'EV-A' }
].sort(L.compareQvActivities);
assert.deepStrictEqual(case4.map((row) => row.activityId), ['EV-A', 'EV-B']);

assert.ok(/compareQvActivities/.test(sortFn));
assert.ok(/qvSortActivities\(rows, qv\)/.test(filtered));
assert.ok(/qvSortActivities\(byDate\[date\] \|\| \[\], qv\)/.test(monthFn));
assert.ok(/return qvSortActivities\(rows\)/.test(filtered) === false);

assert.ok(/qvCockpitIcon\('bulb'\)/.test(notes));
assert.ok(/qvCockpitIcon\('building'\)/.test(notes));
assert.ok(/qvCockpitIcon\('pin'\)/.test(notes));
assert.ok(/Bon à savoir/.test(notes));
assert.ok(/Salles de théorie disponibles \(rappel\)/.test(notes));
assert.ok(/Adresses des sites/.test(notes));
assert.ok(/sortByScopeSiteOrder/.test(notes));
assert.ok(/salleLieux/.test(notes));
assert.ok(/\['G1', 'C1', 'B1', 'B2'\]\.includes\(L\.extractSiteCode/.test(notes));
assert.ok(/salleLieux\.map/.test(notes));
assert.ok(/lieux\.map\(\(lieu\) => \{\s*const line/.test(notes));
assert.ok(/Aucune salle de théorie/.test(notes));
assert.ok(/qvFormatSalleRappel/.test(notes));
assert.ok(/room\.children/.test(notes));
assert.ok(/qvCockpitIcon\('pin'\)/.test(notes));
assert.ok(/qv-note-addresses/.test(notes));
assert.ok(/qv-note-address/.test(notes));
assert.ok(!/Centre SDIS/.test(notes));
assert.ok(!/Centre SDIS/.test(ui));
assert.ok(!/grid-template-columns:\s*minmax\(86px/.test(addressCss));
assert.ok(/display:\s*block/.test(addressCss));
assert.ok(/overflow-wrap:\s*break-word/.test(addressCss));

assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Caserne G1' && row.adresseLigne1 === 'Arsenal 8' && row.localite === 'Yverdon-les-Bains'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Caserne C1' && row.adresseLigne1 === 'Chemin du Borné-nau'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Caserne B1' && row.adresseLigne1 === 'Petite-Amérique 2'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Caserne B2' && row.adresseLigne1 === 'En Chenaux'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Local Y1' && row.adresseLigne1 === 'Chemin du Grassis 1'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Local Y2' && row.adresseLigne1 === 'Chemin des Pâquis 4'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Local Y3' && row.adresseLigne1 === "Grand'rue 1"));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.nomCourt === 'Local Y4' && row.adresseLigne1 === 'Route de la Cour 2'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Vulcain'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Jura' && row.parentCode === 'G1-VULCAIN'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Alpes' && row.parentCode === 'G1-VULCAIN'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Oxygène'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'O2' && row.parentCode === 'G1-OXYGENE'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'O3' && row.parentCode === 'G1-OXYGENE'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Flashover'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Backdraft'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'État-major'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Théorie C1'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.libelle === 'Théorie B1'));
assert.ok(!referentials.THEORY_ROOMS.some((row) => /Y[1-4]/.test(row.lieuCode)));

assert.ok(!/scope-pagination/.test(activites));
assert.ok(/qv-month-separator/.test(activites));
assert.ok(/qvAgendaStateBadge\(row\)/.test(activites));
assert.ok(/qv-agenda-nav-side qv-export-btn/.test(activites));
assert.ok(/Spécialisation · cursus/.test(activites));
assert.ok(!/<th>Point d’attention<\/th>/.test(activites));

assert.ok(/scope-quo-vadis-toutes-activites-ux-4|scope-quo-vadis-a-arbitrer-redesign-1|scope-quo-vadis-a-arbitrer-ux-2/.test(html));
assert.ok(/scope-quo-vadis-toutes-activites-ux-4/.test(css));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-toutes-activites-ux-1'/.test(schema));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));

console.log('scope-quo-vadis-toutes-activites-ux-4-tests: ok');
