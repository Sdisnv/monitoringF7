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
const logicSrc = read('assets/js/scope-ui-logic.js');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));
const annual = ui.slice(ui.indexOf('function qvCalendarIndex'), ui.indexOf('function renderQuoVadisAgenda('));
const yearGridRule = (css.match(/\.qv-year-grid\s*\{[^}]+\}/) || [''])[0];

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/function renderQuoVadisAgendaAnnuel/.test(annual));
assert.ok(/qvYearMonths\(qv\)/.test(annual));
assert.ok(/length: 12/.test(qvUi));
assert.ok(/qvBuildMonth\(qv, 2028, 1\)/.test(annual));
assert.ok(/qvBuildMonth\(qv, 2028, 2\)/.test(annual));
assert.ok(/qvBuildMonth\(qv, 2028, 3\)/.test(annual));
assert.ok(/Clôture du programme — janvier à mars 2028/.test(annual));
assert.ok(/Janvier – mars 2028/.test(annual));

assert.ok(yearGridRule.includes('display: grid'));
assert.ok(yearGridRule.includes('repeat(3, minmax(0, 1fr))'));
assert.ok(yearGridRule.includes('align-items: stretch'));
assert.ok(!yearGridRule.includes('align-items: start'));
assert.ok(/\.qv-year-month\s*\{/.test(css));
assert.ok(/text-transform:\s*uppercase/.test(css));

assert.ok(/qvMonthActivityCount\(month\)/.test(annual));
assert.ok(/cell\.items/.test(annual));
assert.ok(/qvActivityCountLabel\(count\)/.test(annual));
assert.ok(!/label: '2 activités'/.test(annual));
assert.ok(!/Nouvel An/.test(annual));
assert.ok(!/Vacances scolaires vaudoises/.test(annual));

assert.ok(/qvHref\('agenda', \{ mois: month\.key \}\)/.test(annual));
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(annual));
assert.ok(!/qvHref\('agenda-annuel', \{ jour:/.test(annual));
assert.ok(/applyQuoVadisRouteContext/.test(ui));
assert.ok(/state.quoVadisAgendaMonth = r.qvMois/.test(qvUi));

assert.ok(/is-activity/.test(annual) && /Activité proposée/.test(annual));
assert.ok(/is-known/.test(annual) && /Date annoncée/.test(annual));
assert.ok(/is-holiday/.test(annual) && /Jour férié/.test(annual));
assert.ok(/is-vacation/.test(annual) && /Vacances scolaires/.test(annual));
assert.ok(/calendarDays/.test(annual));
assert.ok(/futureDates/.test(annual));
assert.ok(/VACANCES_SCOLAIRES/.test(annual));
assert.ok(/FERIE/.test(annual));

const janvier = L.parseHash('#/quo-vadis/agenda?mois=2027-01');
assert.strictEqual(janvier.qvView, 'agenda');
assert.strictEqual(janvier.qvMois, '2027-01');
const fevrier = L.parseHash('#/quo-vadis/agenda?mois=2027-02&jour=2027-02-15');
assert.strictEqual(fevrier.qvMois, '2027-02');
assert.strictEqual(fevrier.qvJour, '2027-02-15');
const mars28 = L.parseHash('#/quo-vadis/agenda?mois=2028-03');
assert.strictEqual(mars28.qvMois, '2028-03');

assert.ok(/qv-cockpit-row/.test(qvUi), 'Synthèse GRID-1 ne doit pas être cassée');
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(!/interpretHistoricalProgramme\s*=/.test(ui));
assert.ok(!/function generateHistoricalObligations/.test(ui));

console.log('scope-quo-vadis-agenda-annuel-ux-1-tests: ok');
