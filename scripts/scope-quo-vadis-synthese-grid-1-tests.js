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
const synthese = ui.slice(ui.indexOf('function renderQuoVadisSynthese'), ui.indexOf('function qvCalendarIndex'));
const rowRule = (css.match(/\.qv-cockpit-row\s*\{[^}]+\}/) || [''])[0];

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/qv-pilot-kpi/.test(synthese));
assert.strictEqual((synthese.match(/qvPilotKpi\(item\)/) || []).length, 1);
assert.ok(synthese.includes("label: 'Activités prévues'"));
assert.ok(synthese.includes("label: 'Séances consolidées'"));
assert.ok(synthese.includes("label: 'Dates proposées'"));
assert.ok(synthese.includes("label: 'À arbitrer'"));
assert.ok(synthese.includes("label: 'Alertes'"));
assert.ok(synthese.includes("label: 'Dates annoncées'"));

assert.strictEqual((synthese.match(/class="qv-cockpit-row"/g) || []).length, 3);
assert.ok(!/qv-cockpit-grid/.test(ui));
assert.ok(!/qv-cockpit-grid/.test(css));

const order = [
  'Préparation 2027 — statut actuel',
  'Couverture 2026 → 2027',
  'Progression par domaine',
  'Progression par mois',
  'Familles de formation',
  'Statut du planning',
  'Navigation rapide'
].map((label) => qvUi.indexOf(label));
order.forEach((index, i) => assert.ok(index > 0, `bloc manquant: ${i}`));
order.slice(1).forEach((index, i) => assert.ok(index > order[i], 'ordre des blocs cockpit incorrect'));

assert.ok(/length: 12/.test(qvUi));
assert.ok(/qvMonthTitle\(month, 2027\)/.test(qvUi));
assert.ok(/qvHref\('activites', \{ domaine: row.code \}\)/.test(synthese));
assert.ok(/qvHref\('agenda', \{ mois: row.key \}\)/.test(synthese));
assert.ok(/qvHref\('activites', \{ famille: row.code \}\)/.test(synthese));
assert.ok(/qvHref\('agenda-annuel'\)/.test(synthese));
assert.ok(/id="qv-programme-status"/.test(synthese));
assert.ok(/id="qv-generate"/.test(synthese));
assert.ok(/qv-quick-nav/.test(synthese) && /qv-quick-nav-btn/.test(synthese));
assert.ok(/Ouvrir l’agenda annuel →/.test(synthese));
assert.ok(/qv-section-icon is-circle/.test(synthese));
assert.ok(/applyQuoVadisRouteContext/.test(ui));
assert.ok(/function qvHref/.test(qvUi));
assert.ok(/state.quoVadisAgendaMonth = r.qvMois/.test(qvUi));

assert.ok(rowRule.includes('display: grid'));
assert.ok(rowRule.includes('grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)'));
assert.ok(rowRule.includes('align-items: stretch'));
assert.ok(!rowRule.includes('align-items: start'));
assert.ok(/\.qv-quick-nav\s*\{/.test(css));
assert.ok(/\.qv-family-grid\s*\{[^}]*repeat\(4/.test(css.replace(/\s+/g, ' ')));

const janvier = L.parseHash('#/quo-vadis/agenda?mois=2027-01');
assert.strictEqual(janvier.qvView, 'agenda');
assert.strictEqual(janvier.qvMois, '2027-01');
assert.strictEqual(L.parseHash('#/quo-vadis/activites?domaine=AUTO').qvDomaine, 'AUTO');
assert.strictEqual(L.parseHash('#/quo-vadis/activites?famille=FOBA').qvFamille, 'FOBA');

assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(!/interpretHistoricalProgramme\s*=/.test(ui));
assert.ok(!/function generateHistoricalObligations/.test(ui));

console.log('scope-quo-vadis-synthese-grid-1-tests: ok');
