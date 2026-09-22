#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const lieux = require('../netlify/lib/_scope-quo-vadis-lieux');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const logicSrc = read('assets/js/scope-ui-logic.js');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const schema = read('netlify/lib/_scope-schema.js');
const html = read('scope.html');
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const filters = ui.slice(ui.indexOf('function qvAgendaFilterBar('), ui.indexOf('function qvActiveFiltersMeta('));
const annual = ui.slice(ui.indexOf('function qvRenderMiniMonth'), ui.indexOf('function renderQuoVadisAgendaAnnuel'));
const binding = ui.slice(ui.indexOf('const agendaDay = route().qvJour'), ui.indexOf("root.querySelectorAll('[data-qv-open]')"));
const legend = agenda.slice(agenda.indexOf('qv-agenda-legend'), agenda.indexOf('scope-table-wrap'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/id="qv-agenda-prev"/.test(agenda) && /id="qv-agenda-next"/.test(agenda));
assert.ok(/qv-agenda-nav-chevron/.test(agenda));
assert.ok(/qv-agenda-month-trigger/.test(agenda) && /qv-agenda-month-panel/.test(agenda));
assert.ok(/événement/.test(agenda) && /journées/.test(agenda));
assert.ok(/background:\s*#eef2f7/.test(css));
assert.ok(/\.qv-agenda-nav-chevron[\s\S]{0,80}scope-blue/.test(css));

assert.ok(/Rechercher un événement, un domaine, un public cible, un lieu/.test(filters));
assert.ok(/qvCockpitIcon\('search'\)/.test(filters));
assert.ok(/qv-filter-domain/.test(filters) && /qv-filter-family/.test(filters));
assert.ok(/qv-filter-oi/.test(filters) && /qv-filter-specialisation/.test(filters));
assert.ok(/Public cible/.test(filters) && /qv-filter-cible/.test(filters));
assert.ok(/qv-filter-lieu/.test(filters) && /qv-filter-cursus/.test(filters) && /qv-filter-status/.test(filters));
assert.ok(/Séances multiples/.test(filters) && /Points d’attention/.test(filters));
assert.ok(/qv-agenda-check/.test(filters));
assert.ok(!/scope-switch/.test(filters));
assert.ok(/Réinitialiser les filtres/.test(filters));
assert.ok(/qvCockpitIcon\('refresh'\)/.test(filters));
assert.ok(/qvCibleLabel/.test(ui));
assert.ok(/filters\.cible/.test(ui) && /filters\.oi/.test(ui));
assert.ok(!/cibleCodes \|\| \[qvOiCode/.test(ui));

assert.ok(!/Jour normal/.test(legend));
assert.ok(/Vacances scolaires/.test(legend));
assert.ok(/Jour férié/.test(legend));
assert.ok(/Planifié/.test(legend));
assert.ok(/Validé/.test(legend));
assert.ok(/Point d’attention/.test(legend));
assert.ok(/À arbitrer/.test(legend));
assert.ok(/Annulé/.test(legend));
assert.ok(!/<span class="qv-agenda-state/.test(legend));
assert.ok((legend.match(/qv-agenda-swatch/g) || []).length === 2);

assert.ok(/Horaire/.test(agenda) && /Domaine/.test(agenda) && />OI</.test(agenda));
assert.ok(/Public cible/.test(agenda) && /Événement/.test(agenda));
assert.ok(/Stat\.Com/.test(agenda) && /Lieu/.test(agenda));
assert.ok(/Adresse convocation/.test(agenda) && />État</.test(agenda));
assert.ok(!/<th>Attention<\/th>/.test(agenda));
assert.ok(!/<th>SEM/.test(agenda));
assert.ok(!/data-qv-row-menu/.test(agenda) && !/>…</.test(agenda));
assert.ok(/qv-agenda-week/.test(agenda));
assert.ok(!/<td[^>]*>\s*Semaine/.test(agenda));
assert.ok(/font-style:\s*normal/.test(css.slice(css.indexOf('.qv-agenda-week'), css.indexOf('.qv-agenda-table .qv-agenda-row'))));
assert.ok(/qvActivityStateHtml/.test(agenda));
assert.ok(/qv-agenda-swatch/.test(ui.slice(ui.indexOf('function qvAgendaStateBadge'), ui.indexOf('function qvAgendaDayTitle'))));
assert.ok(/status === 'PLANIFIE'/.test(ui) && /validated/.test(ui));
assert.ok(/PLANIFIE: 'Positionnée'/.test(ui));
assert.ok(/status === 'ANNULE'/.test(ui));
assert.ok(/marks\.holiday \? 'is-holiday' : marks\.vacation \? 'is-vacation'/.test(agenda.replace(/\s+/g, ' ')));
assert.ok(/#5b6570/.test(css) && /#eceaf6/.test(css) && /#dce3f7/.test(css));

assert.ok(/qv-mini-week/.test(annual));
assert.ok(/qvIsoWeek/.test(annual));
assert.ok(/\.qv-mini-week[\s\S]{0,180}font-style:\s*normal/.test(css));
assert.ok(/has-activity/.test(annual) && /has-holiday/.test(annual) && /has-vacation/.test(annual));
assert.ok(/requestAnimationFrame/.test(binding) && /scrollIntoView/.test(binding));
assert.strictEqual(L.qvIsoWeek('2027-02-02'), 5);

assert.ok(/qvConvocationAddress/.test(ui));
assert.ok(/adresseLigne1/.test(ui) && /lieu\.npa/.test(ui) && /lieu\.localite/.test(ui));
assert.ok(!/Av\. des Sports 2/.test(ui));
assert.ok(!/Rue du Jura 20/.test(ui));
assert.ok(!/Ch\. de la Plaine 5/.test(ui));
assert.ok(!/Yverdon-les-Bains/.test(agenda));
assert.ok(!/Av\. des Sports 2/.test(schema));
assert.ok(/planLieuAddressConsolidation/.test(schema));
assert.ok(/scope_lieux/.test(schema.slice(schema.indexOf('migrateQuoVadisAgendaUx2'))));
assert.ok(!/insert into scope_evenements/.test(schema.slice(schema.indexOf('migrateQuoVadisAgendaUx2'))));
assert.ok(/lieuId/.test(ui.slice(ui.indexOf('function qvLieuRecord'), ui.indexOf('function qvOiCode'))));

const casernes = [
  { lieu_id: 'g1', code: 'G1-CASERNE', nom_court: 'Caserne G1', oi_code: 'G1', adresse_ligne1: '', npa: '', localite: '' },
  { lieu_id: 'b1', code: 'B1-CASERNE', nom_court: 'Caserne B1', oi_code: 'B1', adresse_ligne1: '', npa: '', localite: '' },
  { lieu_id: 'c1', code: 'C1-CASERNE', nom_court: 'Caserne C1', oi_code: 'C1', adresse_ligne1: '', npa: '', localite: '' },
  { lieu_id: 'b2', code: 'B2-CASERNE', nom_court: 'Caserne B2', oi_code: 'B2', adresse_ligne1: '', npa: '', localite: '' }
];
const historical = lieux.planLieuAddressConsolidation(casernes, ['Caserne G1', 'Caserne C1', 'Caserne G1', 'Local JSP']);
assert.strictEqual(historical.lieuxAnalyzed, 4);
assert.strictEqual(historical.sallesAnalyzed, 3);
assert.strictEqual(historical.addressesFound, 0);
assert.strictEqual(historical.lieuxEnriched, 0);
assert.ok(historical.duplicatesAvoided >= 2);
assert.ok(historical.inserts.some((row) => row.code === 'LOCAL-JSP'));
assert.ok(!historical.inserts.some((row) => /YVERDON|GRANDSON|PLAINE/.test(row.code)));
assert.ok(historical.updates.every((row) => !row.adresseLigne1));

const parsed = lieux.parseSwissAddress('Caserne G1, Av. des Sports 2, 1400 Yverdon-les-Bains');
assert.ok(parsed);
assert.strictEqual(parsed.adresseLigne1, 'Av. des Sports 2');
assert.strictEqual(parsed.npa, '1400');
assert.strictEqual(parsed.localite, 'Yverdon-les-Bains');
assert.strictEqual(lieux.parseSwissAddress('Caserne G1'), null);

const enrich = lieux.planLieuAddressConsolidation(casernes, ['Caserne G1, Av. des Sports 2, 1400 Yverdon-les-Bains']);
assert.strictEqual(enrich.addressesFound, 1);
assert.strictEqual(enrich.lieuxEnriched, 1);
assert.strictEqual(enrich.updates[0].lieuId, 'g1');
assert.strictEqual(enrich.updates[0].adresseLigne1, 'Av. des Sports 2');

const keep = lieux.planLieuAddressConsolidation([{
  lieu_id: 'g1', code: 'G1-CASERNE', nom_court: 'Caserne G1', oi_code: 'G1',
  adresse_ligne1: 'Rue déjà connue 9', npa: '1400', localite: 'Yverdon-les-Bains'
}], ['Caserne G1, Av. des Sports 2, 1400 Yverdon-les-Bains']);
assert.strictEqual(keep.updates.length, 0, 'adresse existante non écrasée');

assert.ok(/qv-agenda-check-box/.test(css));
assert.ok(/border-radius:\s*4px/.test(css.slice(css.indexOf('.qv-agenda-check-box'), css.indexOf('.qv-agenda-check input:checked'))));
assert.ok(!/qv-agenda-legend[\s\S]{0,400}border-radius:\s*999/.test(css));
assert.ok(/scope-quo-vadis-final-ux-referential-3/.test(html));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(/qvCalendarMarkVisible/.test(logicSrc));

console.log('scope-quo-vadis-agenda-ux-2-tests: ok');
console.log(JSON.stringify({
  lieuxAnalyzed: historical.lieuxAnalyzed,
  sallesAnalyzed: historical.sallesAnalyzed,
  addressesFound: historical.addressesFound,
  lieuxEnriched: historical.lieuxEnriched,
  duplicatesAvoided: historical.duplicatesAvoided,
  lieuxWithoutAddress: historical.lieuxWithoutAddress,
  inserts: historical.inserts.map((row) => row.code)
}));
