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
const annual = ui.slice(ui.indexOf('function qvCalendarMarkVisible'), ui.indexOf('function renderQuoVadisAgenda('));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/function qvCalendarMarkVisible/.test(annual), 'index calendaire non diagnosticable');
assert.ok(!/if \(!row\.jour \|\| row\.neutralise\) return/.test(annual), 'les jours fériés/vacances neutralisés pour le moteur ne doivent plus être masqués du calendrier');
assert.ok(/kind\.includes\('FERIE'\) \|\| kind === 'VACANCES_SCOLAIRES'/.test(annual.replace(/\s+/g, ' ')));
assert.ok(/NEUTRALISATION_INTERNE/.test(annual));
assert.ok(/qvCalendarKind\(row\)\.includes\('FERIE'\)/.test(annual));
assert.ok(/qvCalendarKind\(row\) === 'VACANCES_SCOLAIRES'/.test(annual));
assert.ok(/VACANCES_SCOLAIRES/.test(annual) && /FERIE/.test(annual));

assert.ok(/has-activity/.test(annual));
assert.ok(/\.qv-mini-day\.has-activity span\s*\{[^}]*background:\s*var\(--scope-red\)/.test(css.replace(/\s+/g, ' ')));
assert.ok(/qvMonthActivityCount\(month\)/.test(annual));

assert.ok(/has-holiday/.test(annual) && /is-holiday/.test(annual));
assert.ok(/has-vacation/.test(annual) && /is-school-break/.test(annual));
assert.ok(/has-announced-date/.test(annual));
assert.ok(/is-break-start/.test(annual) && /is-break-end/.test(annual));
assert.ok(/\.qv-mini-day\.has-holiday:not\(\.has-activity\) span/.test(css));
assert.ok(/\.qv-mini-day\.has-activity\.has-holiday/.test(css));
assert.ok(/\.qv-mini-day\.has-activity\.has-vacation/.test(css));
assert.ok(/#eceaf6/.test(css) && /#dce3f7/.test(css));

assert.ok(/if \(activityCount\) \{/.test(annual));
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(annual));
assert.ok(/qvHref\('agenda', \{ mois: month\.key \}\)/.test(annual));
assert.ok(!/qvHref\('agenda-annuel', \{ jour:/.test(annual));

assert.ok(!/Nouvel An/.test(annual));
assert.ok(!/Vacances scolaires vaudoises/.test(annual));
assert.ok(/calendarDays/.test(annual));
assert.ok(/metadata: row\.metadata \|\| \{\}/.test(service));

const janvier = L.parseHash('#/quo-vadis/agenda?mois=2027-01');
assert.strictEqual(janvier.qvView, 'agenda');
assert.strictEqual(janvier.qvMois, '2027-01');
const jour = L.parseHash('#/quo-vadis/agenda?mois=2027-03&jour=2027-03-06');
assert.strictEqual(jour.qvMois, '2027-03');
assert.strictEqual(jour.qvJour, '2027-03-06');

assert.ok(/qv-cockpit-row/.test(qvUi));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(!/interpretHistoricalProgramme\s*=/.test(ui));

console.log('scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests: ok');
