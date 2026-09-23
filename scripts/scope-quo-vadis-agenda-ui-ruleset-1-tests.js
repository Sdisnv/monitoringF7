#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const html = read('scope.html');
const packageJson = read('package.json');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const schema = read('netlify/lib/_scope-schema.js');

const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const fiche = ui.slice(ui.indexOf('function renderQuoVadisActivite('), ui.indexOf('function qvArbitrerFilterBar('));
const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const activityStateFn = ui.slice(ui.indexOf('function qvActivityStateHtml('), ui.indexOf('function qvNeutralCell('));
const legend = agenda.slice(agenda.indexOf('qv-agenda-legend'), agenda.indexOf('scope-table-wrap'));
const activitesLegend = activites.slice(activites.indexOf('qv-agenda-legend'), activites.indexOf('scope-table-wrap'));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));

assert.ok(/qvActivityStateHtml\(row\)/.test(agenda));
assert.ok(/scopeStateHtml\(current\.tone, current\.label\)/.test(activityStateFn));
assert.ok(!/qvAgendaStateBadge\(row\)/.test(agenda));
assert.ok(!/qv-agenda-state/.test(agenda));
assert.ok(!/scope-pill/.test(agenda));
assert.ok(!/scope-status-pill/.test(agenda));
assert.ok(/qvActivityStateHtml\(row\)/.test(activites));
assert.ok(/qvAgendaStateBadge/.test(fiche));
assert.ok(/scopeStateHtml/.test(arbitrer));

assert.ok(/scope-state-legend/.test(legend));
assert.ok(/scopeStateHtml\('block', 'À arbitrer'\)/.test(legend));
assert.ok(/scopeStateHtml\('attention', 'Point d’attention'\)/.test(legend));
assert.ok(/scopeStateHtml\('positive', 'Validé'\)/.test(legend));
assert.ok(/scopeStateHtml\('info', 'Planifié'\)/.test(legend));
assert.ok(/scopeStateHtml\('inactive', 'Annulé'\)/.test(legend));
assert.ok(/qv-agenda-swatch is-vacation/.test(legend));
assert.ok(/qv-agenda-swatch is-holiday/.test(legend));
assert.ok(/Vacances scolaires/.test(legend) && /Jour férié/.test(legend));
assert.strictEqual((legend.match(/qv-agenda-swatch/g) || []).length, 2);
assert.ok(!/qv-agenda-swatch is-planned/.test(legend));
assert.ok(!/qv-agenda-swatch is-validated/.test(legend));
assert.ok(!/qv-agenda-swatch is-attention/.test(legend));
assert.ok(!/qv-agenda-swatch is-arbitrate/.test(legend));
assert.ok(!/qv-agenda-swatch is-cancelled/.test(legend));
assert.ok(!/<span class="qv-agenda-state/.test(legend));

assert.ok(/scopeStateHtml\('block', 'À arbitrer'\)/.test(activitesLegend));
assert.strictEqual((activitesLegend.match(/qv-agenda-swatch/g) || []).length, 2);

assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/height:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));
assert.ok(/\.qv-agenda-swatch\.is-vacation/.test(css));
assert.ok(/\.qv-agenda-swatch\.is-holiday/.test(css));
assert.ok(/\.qv-agenda-table \.qv-agenda-date-row\.is-vacation th/.test(css));
assert.ok(/\.qv-agenda-table \.qv-agenda-date-row\.is-holiday th/.test(css));
assert.ok(/background:\s*#eceaf6/.test(css.slice(css.indexOf('.qv-agenda-table .qv-agenda-date-row.is-vacation th'), css.indexOf('.qv-agenda-table .qv-agenda-date-row.is-holiday th'))));
assert.ok(/background:\s*#dce3f7/.test(css.slice(css.indexOf('.qv-agenda-table .qv-agenda-date-row.is-holiday th'), css.indexOf('.qv-agenda-day-bar'))));
assert.ok(/Jour férié —/.test(agenda));
assert.ok(/qv-agenda-holiday-label/.test(agenda));
assert.ok(/marks\.holiday \? 'is-holiday' : marks\.vacation \? 'is-vacation'/.test(agenda.replace(/\s+/g, ' ')));
assert.ok(/qv-agenda-week/.test(agenda));
assert.ok(/id="qv-agenda-prev"/.test(agenda) && /id="qv-agenda-next"/.test(agenda));
assert.ok(/qv-agenda-nav/.test(agenda));
assert.ok(/Conseil/.test(agenda) && /Bon à savoir/.test(agenda));
assert.ok(/\.qv-agenda-view \.qv-agenda-legend\.scope-state-legend li/.test(css));
assert.ok(/\.qv-agenda-state \{/.test(css), 'pastilles fiche encore servies par qvAgendaStateBadge');

assert.ok(!/CREATE TABLE|ALTER TABLE/.test(agenda));
assert.ok(!/netlify deploy/.test(agenda));

const logicSha = execFileSync('git', ['hash-object', 'assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
const headLogicSha = execFileSync('git', ['rev-parse', 'HEAD:assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(logicSha, headLogicSha, 'scope-ui-logic.js ne doit pas changer');
const serviceSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
const headServiceSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(serviceSha, headServiceSha, 'service QUO VADIS ne doit pas changer');
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(service));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-canonical-foundations-c1'/.test(schema));

assert.ok(/scope-quo-vadis-agenda-ui-ruleset-1|scope-quo-vadis-pilot-tabs-1/.test(html));
assert.ok(/scope-quo-vadis-agenda-ui-ruleset-1/.test(css));
assert.ok(/test:scope-quo-vadis-agenda-ui-ruleset-1/.test(packageJson));

console.log('scope-quo-vadis-agenda-ui-ruleset-1-tests: ok');
