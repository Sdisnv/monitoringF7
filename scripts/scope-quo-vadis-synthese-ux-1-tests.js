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
const coverage = read('netlify/lib/_scope-quo-vadis-coverage.js');
const consolidation = read('netlify/lib/_scope-quo-vadis-consolidation.js');
const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/function renderQuoVadisSynthese/.test(qvUi));
assert.ok(/qv-cockpit/.test(qvUi) && /qv-pilot-kpi/.test(qvUi));
assert.ok(/Préparation 2027 — statut actuel/.test(qvUi));
assert.ok(/Couverture 2026 → 2027/.test(qvUi));
assert.ok(/Navigation rapide/.test(qvUi));
assert.ok(/Ouvrir l’agenda annuel/.test(qvUi));
assert.ok(!/Calendrier 2027/.test(qvUi), 'bloc calendrier de pied de page encore présent');
assert.ok(/qv-programme-status/.test(qvUi) && /id="qv-generate"/.test(qvUi));
assert.ok(/Préparation en cours/.test(qvUi) && /Validation en cours/.test(qvUi) && /Validé/.test(qvUi));
assert.ok(/qvMonthTitle\(month, 2027\)/.test(qvUi));
assert.ok(/length: 12/.test(qvUi));
assert.ok(/qvHref\('agenda', \{ mois: row.key \}\)/.test(qvUi));
assert.ok(!/qvHref\('agenda-annuel'\)\}">\$\{escapeHtml\(row.label\)\}/.test(qvUi));
assert.ok(/qvHref\('activites', \{ domaine: row.code \}\)/.test(qvUi));
assert.ok(/qvHref\('activites', \{ famille: row.code \}\)/.test(qvUi));
assert.ok(/qvHref\('activites', \{ seances: 'oui' \}\)/.test(qvUi));
assert.ok(/applyQuoVadisRouteContext/.test(ui));
assert.ok(/filters.family/.test(qvUi) && /qv-filter-family/.test(qvUi));
assert.ok(/qv-filter-sessions/.test(qvUi));
assert.ok(/qv-status-panel/.test(qvUi));
assert.ok(/Le recalcul met à jour les propositions de planification/.test(qvUi));
assert.ok(/Il ne crée aucun événement opérationnel/.test(qvUi));
assert.ok(/Activités historiques consolidées/.test(qvUi));
assert.ok(/coverage.supplements/.test(qvUi), 'bilan préparation doit lire les données CONSOLIDATION-2');
assert.ok(/qv-pilot-kpis/.test(css) && /qv-status-current/.test(css) && /qv-family-card/.test(css));

const auto = L.parseHash('#/quo-vadis/activites?domaine=AUTO');
assert.strictEqual(auto.qvView, 'activites');
assert.strictEqual(auto.qvDomaine, 'AUTO');

const famille = L.parseHash('#/quo-vadis/activites?famille=FOBA');
assert.strictEqual(famille.qvFamille, 'FOBA');

const seances = L.parseHash('#/quo-vadis/activites?seances=oui');
assert.strictEqual(seances.qvSeances, 'oui');

const janvier = L.parseHash('#/quo-vadis/agenda?mois=2027-01');
assert.strictEqual(janvier.qvView, 'agenda');
assert.strictEqual(janvier.qvMois, '2027-01');

const septembre = L.parseHash('#/quo-vadis/agenda?mois=2027-09');
assert.strictEqual(septembre.qvMois, '2027-09');

assert.ok(!/interpretHistoricalProgramme\s*=/.test(ui));
assert.ok(!/function generateHistoricalObligations/.test(ui));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(coverage.includes('interpretHistoricalProgramme'));
assert.ok(consolidation.includes('hasHumanDecision'));
assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(ui));
assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(service));

console.log('scope-quo-vadis-synthese-ux-1-tests: ok');
