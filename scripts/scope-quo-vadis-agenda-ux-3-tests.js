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
const logicSrc = read('assets/js/scope-ui-logic.js');
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const filters = ui.slice(ui.indexOf('function qvAgendaFilterBar('), ui.indexOf('function qvActiveFiltersMeta('));
const legend = agenda.slice(agenda.indexOf('qv-agenda-legend'), agenda.indexOf('scope-table-wrap'));
const binding = ui.slice(ui.indexOf('document.getElementById(\'qv-filter-reset\')'), ui.indexOf('const setAgendaMonth'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/id="qv-agenda-prev"/.test(agenda) && /id="qv-agenda-next"/.test(agenda));
assert.ok(/qv-agenda-nav-side/.test(agenda));
assert.ok(/qv-agenda-nav-chevron/.test(agenda));
assert.ok(/\.scope-btn\.qv-agenda-nav-side/.test(css));
assert.ok(/border:\s*1\.5px solid var\(--scope-blue\)/.test(css.slice(css.indexOf('.scope-btn.qv-agenda-nav-side'), css.indexOf('.qv-agenda-nav-chevron'))));
assert.ok(/background:\s*#f4f6fb/.test(css.slice(css.indexOf('.scope-btn.qv-agenda-nav-side'), css.indexOf('.qv-agenda-nav-chevron'))));
assert.ok(/color:\s*var\(--scope-blue\)/.test(css.slice(css.indexOf('.scope-btn.qv-agenda-nav-side'), css.indexOf('.qv-agenda-nav-chevron'))));
assert.ok(/:focus-visible/.test(css.slice(css.indexOf('.scope-btn.qv-agenda-nav-side'), css.indexOf('.qv-agenda-month-select'))));

assert.ok(/id="qv-filter-reset"/.test(filters));
assert.ok(/aria-label="Réinitialiser les filtres"/.test(filters));
assert.ok(/title="Réinitialiser les filtres"/.test(filters));
assert.ok(/qvCockpitIcon\('refresh'\)/.test(filters));
assert.ok(!/>\s*Réinitialiser les filtres\s*</.test(filters));
assert.ok(!/\$\{qvCockpitIcon\('refresh'\)\} Réinitialiser les filtres/.test(filters));
assert.ok(/width:\s*36px/.test(css.slice(css.indexOf('.qv-agenda-filters .qv-filter-reset'), css.indexOf('.qv-agenda-meta-row'))));
assert.ok(/addEventListener\('click'/.test(binding));
assert.ok(/quoVadisFilters/.test(binding));

assert.ok(/qv-agenda-swatch/.test(ui.slice(ui.indexOf('function qvAgendaStateBadge'), ui.indexOf('function qvAgendaDayTitle'))));
assert.ok(/font-size:\s*inherit/.test(css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-state.is-planned'))));
assert.ok(/min-height:\s*26px/.test(css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-state.is-planned'))));
assert.ok(/border-radius:\s*4px/.test(css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-state.is-planned'))));
assert.ok(!/border-radius:\s*999/.test(css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-table {'))));

assert.ok(!/Jour normal/.test(legend));
assert.ok(/Vacances scolaires/.test(legend) && /Jour férié/.test(legend));
assert.ok(/Planifié/.test(legend) && /Validé/.test(legend));
assert.ok(!/<span class="qv-agenda-state/.test(legend));
assert.ok((legend.match(/qv-agenda-swatch/g) || []).length === 2);
assert.ok(!/data-qv-row-menu/.test(agenda) && !/>…</.test(agenda));
assert.ok(/qv-agenda-week/.test(agenda));
assert.ok(!/<td[^>]*>\s*Semaine/.test(agenda));
assert.strictEqual(L.qvIsoWeek('2027-02-02'), 5);
assert.ok(/scope-quo-vadis-agenda-ux-[123]|scope-quo-vadis-toutes-activites-ux-[1234]|scope-quo-vadis-a-arbitrer-redesign-1|scope-quo-vadis-a-arbitrer-ux-[23]/.test(html));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));

console.log('scope-quo-vadis-agenda-ux-3-tests: ok');
