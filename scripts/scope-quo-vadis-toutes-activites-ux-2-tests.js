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
const pdfRenderer = read('netlify/lib/_scope-pdf-renderer.js');
const report = read('netlify/lib/_scope-report-service.js');
const logicSrc = read('assets/js/scope-ui-logic.js');
const referentials = require('../netlify/lib/_scope-quo-vadis-referentials');

const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const filters = ui.slice(ui.indexOf('function qvActivitesFilterBar('), ui.indexOf('function qvSallesForLieu('));
const notes = ui.slice(ui.indexOf('function qvActivitesSecondaryCards('), ui.indexOf('function renderQuoVadisActivites('));
const filtered = ui.slice(ui.indexOf('function qvFilteredActivities('), ui.indexOf('function qvActivitySortValue('));
const calendarClass = ui.slice(ui.indexOf('function qvActivityCalendarClass('), ui.indexOf('function qvMonthSeparatorLabel('));
const badge = ui.slice(ui.indexOf('function qvAgendaStateBadge('), ui.indexOf('function qvAgendaDayTitle('));
const binding = ui.slice(ui.indexOf('const readQvFilters'), ui.indexOf('const setAgendaMonth'));
const csv = ui.slice(ui.indexOf('const downloadQuoVadisCsv'), ui.indexOf('document.getElementById(\'qv-export-excel\')'));
const annual = ui.slice(ui.indexOf('function qvRenderMiniMonth('), ui.indexOf('function renderQuoVadisAgendaAnnuel('));
const stateCss = css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-state.is-planned'));
const laterTableCss = css.slice(css.lastIndexOf('.scope-table.qv-activities-table tbody tr.qv-month-separator'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(!/scope-pagination/.test(activites), 'aucune pagination écran');
assert.ok(!/qv-activites-page|pageSize|EVENT_LIST_PAGE/.test(activites));
assert.ok(!/ sur \$\{/.test(activites), 'compteur sans tranche paginée');
assert.ok(/qvActivityCountLabel\(rows\.length\)/.test(activites));
assert.ok(/return qvSortActivities\(rows(?:, qv)?\)/.test(filtered));
assert.ok(!/pageSize|scope-pagination/.test(filtered));

assert.ok(/qv-month-separator/.test(activites));
assert.ok(/qv-month-bar/.test(activites));
assert.ok(/qv-month-bar-label/.test(activites));
assert.ok(/qvMonthSeparatorLabel/.test(activites));
assert.ok(/background:\s*#5b6570/.test(laterTableCss));
assert.ok(/font-weight:\s*700/.test(laterTableCss));
assert.ok(/text-transform:\s*uppercase/.test(laterTableCss));
assert.ok(!/float:\s*right/.test(css.slice(css.indexOf('.qv-month-bar'), css.indexOf('.qv-activites-notes'))));

assert.ok(/qvAgendaStateBadge\(row\)/.test(activites));
assert.ok(/qv-agenda-state/.test(badge));
assert.ok(/qv-agenda-swatch/.test(badge));
assert.ok(/font-weight:\s*400/.test(stateCss));
assert.ok(/font-size:\s*inherit/.test(stateCss));
assert.ok(/min-height:\s*26px/.test(stateCss));
assert.ok(/border-radius:\s*4px/.test(stateCss));
assert.ok(!/border-radius:\s*999/.test(css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-table {'))));

assert.ok(/qv-period-seg/.test(filters));
assert.ok(/data-qv-period/.test(filters));
assert.ok(/Période d’affichage/.test(filters));
assert.ok(/Tous/.test(filters) && /Mois/.test(filters) && /Trimestre/.test(filters) && /Semestre/.test(filters));
assert.ok(/id="qv-filter-period"/.test(filters));
assert.ok(/qv-filter-month/.test(filters) && /qv-filter-quarter/.test(filters) && /qv-filter-semester/.test(filters));
assert.ok(/qv-activites-filters-primary/.test(filters));
assert.ok(/qv-activites-filters-secondary/.test(filters));
assert.ok(/id="qv-filter-reset"/.test(filters));
assert.ok(/aria-label="Réinitialiser les filtres"/.test(filters));
assert.ok(/qvCockpitIcon\('refresh'\)/.test(filters));
assert.ok(!/>\s*Réinitialiser les filtres\s*</.test(filters));
assert.ok(/querySelectorAll\('\[data-qv-period\]'\)/.test(binding));
assert.ok(/period: 'tous'/.test(ui));

assert.ok(/Salle théorie/.test(activites) && /Responsable/.test(activites));
assert.ok(!/<th>Point d’attention<\/th>/.test(activites));
assert.ok(/qv-col-salle/.test(activites) && /qv-col-resp/.test(activites) && /qv-col-title/.test(activites));
assert.ok(/min-width:\s*0/.test(css.slice(css.indexOf('.qv-activites-view'), css.indexOf('.qv-activities-table'))));
assert.ok(/overflow-x:\s*auto/.test(css.slice(css.indexOf('.qv-activites-wrap'), css.indexOf('.qv-agenda-filters.qv-activites-filters'))));
assert.ok(/min-width:\s*0/.test(css.slice(css.indexOf('.scope-content {'), css.indexOf('.scope-header {'))));

assert.ok(/qvActivityCalendarClass/.test(activites));
assert.ok(/is-holiday/.test(activites) && /is-vacation/.test(activites));
assert.ok(/marks\.holiday \? 'is-holiday' : marks\.vacation \? 'is-vacation'/.test(calendarClass));
assert.ok(/#eceaf6/.test(laterTableCss) && /#dce3f7/.test(laterTableCss));
assert.ok(/\.qv-activites-row\.is-vacation:nth-child\(even\) td/.test(css));
assert.ok(/\.qv-activites-row\.is-holiday:nth-child\(even\) td/.test(css));

assert.ok(/data-qv-open/.test(activites));
assert.ok(/qv-row-open/.test(activites));
assert.ok(/qvActivitesSecondaryCards/.test(activites));
assert.ok(/Bon à savoir/.test(notes));
assert.ok(/Salles de théorie/.test(notes));
assert.ok(/Adresses des sites/.test(notes));
assert.ok(!/Centre SDIS/.test(notes) && !/Centre SDIS/.test(activites));
assert.ok(!/Centre SDIS/.test(ui));
assert.ok(referentials.OFFICIAL_LIEUX.every((row) => /^(Caserne|Local) /.test(row.nomCourt)));
assert.ok(!referentials.OFFICIAL_LIEUX.some((row) => /Centre SDIS/i.test(JSON.stringify(row))));

assert.ok(/Adresse du lieu/.test(csv));
assert.ok(/Salle théorie/.test(csv));
assert.ok(/Responsable/.test(csv));
assert.ok(/Point d’attention/.test(csv));
assert.ok(/qvProgrammeTable/.test(pdfRenderer));
assert.ok(/landscape:\s*true/.test(pdfRenderer));
assert.ok(/publicCible/.test(report) && /salleTheorie/.test(report));

assert.ok(/qv-mini-week/.test(annual));
assert.ok(/L\.qvIsoWeek\(dated\.date\)/.test(annual));
assert.strictEqual(L.qvIsoWeek('2027-02-02'), 5);
assert.ok(/font-size:\s*10px/.test(css.slice(css.indexOf('.qv-mini-week-head,'), css.indexOf('.qv-mini-day.has-vacation'))));

assert.ok(/scope-quo-vadis-toutes-activites-ux-[234]|scope-quo-vadis-a-arbitrer-redesign-1/.test(html));
assert.ok(/scope-quo-vadis-toutes-activites-ux-[234]/.test(css));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-toutes-activites-ux-1'/.test(schema));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(/--scope-blue/.test(css.slice(css.indexOf('.qv-period-seg-btn.is-active'), css.indexOf('.qv-period-seg-btn:focus-visible'))));
assert.ok(!/#de000a|#c41230|var\(--scope-red\)/.test(css.slice(css.indexOf('.qv-period-seg {'), css.indexOf('.qv-activities-table .qv-col-date'))));

console.log('scope-quo-vadis-toutes-activites-ux-2-tests: ok');
