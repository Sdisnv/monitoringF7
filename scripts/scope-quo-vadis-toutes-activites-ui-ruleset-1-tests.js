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
const coverage = read('netlify/lib/_scope-quo-vadis-coverage.js');
const schema = read('netlify/lib/_scope-schema.js');

const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const fiche = ui.slice(ui.indexOf('function renderQuoVadisActivite('), ui.indexOf('function qvArbitrerFilterBar('));
const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const stateFn = ui.slice(ui.indexOf('function qvAgendaState('), ui.indexOf('function qvAgendaStateBadge('));
const activityStateFn = ui.slice(ui.indexOf('function qvActivityStateHtml('), ui.indexOf('function qvNeutralCell('));
const calendarClass = ui.slice(ui.indexOf('function qvActivityCalendarClass('), ui.indexOf('function qvMonthSeparatorLabel('));
const legend = activites.slice(activites.indexOf('qv-agenda-legend'), activites.indexOf('scope-table-wrap'));
const rulesetCss = css.slice(css.indexOf('/* scope-ui-ruleset-1'), css.indexOf('/* QUO VADIS — pilotage annuel */'));
const vacationCss = css.slice(css.indexOf('.qv-activites-row.is-vacation td'), css.indexOf('.qv-month-separator th'));
const laterVacationCss = css.slice(css.indexOf('.scope-table.qv-activities-table tbody tr.qv-activites-row.is-vacation td'));

assert.ok(/function qvActivityStateHtml/.test(ui));
assert.ok(/qvActivityStateHtml\(row\)/.test(activites));
assert.ok(/scopeStateHtml\(current\.tone, current\.label\)/.test(activityStateFn));
assert.ok(!/qvAgendaStateBadge\(row\)/.test(activites));
assert.ok(/qvActivityStateHtml\(row\)/.test(agenda));
assert.ok(/qvAgendaStateBadge/.test(fiche));
assert.ok(!/qv-agenda-state/.test(activites));
assert.ok(!/scope-pill/.test(activites));
assert.ok(!/scope-status-pill/.test(activites));
assert.ok(!/border-radius:\s*999/.test(activites));

assert.ok(/tone: 'inactive', label: 'Annulé'/.test(stateFn));
assert.ok(/tone: 'block', label: 'À arbitrer'/.test(stateFn));
assert.ok(/tone: 'attention', label: 'Point d’attention'/.test(stateFn));
assert.ok(/tone: 'positive', label: 'Validé'/.test(stateFn));
assert.ok(/tone: 'info', label: 'Planifié'/.test(stateFn));
assert.ok(/status === 'PLANIFIE'/.test(stateFn));
assert.ok(/status === 'PROPOSE' \|\| status === 'A_PLANIFIER'/.test(stateFn));

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

assert.ok(/scopeStateHtml/.test(arbitrer));
assert.ok(/scope-state-legend qv-arbitrer-legend/.test(arbitrer));

assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/width:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(/height:\s*var\(--scope-state-swatch-size\)/.test(rulesetCss));
assert.ok(!/\.scope-state \{[^}]*background:\s*#/.test(rulesetCss.replace(/\n/g, ' ')));
assert.ok(/font-weight:\s*400/.test(rulesetCss));
assert.ok(/color:\s*var\(--scope-ink\)/.test(rulesetCss));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));
assert.ok(/--scope-state-positive:\s*#2f9e5a/.test(css));
assert.ok(/--scope-state-block:\s*var\(--scope-red\)/.test(css));
assert.ok(/--scope-state-attention:\s*#c98412/.test(css));
assert.ok(/--scope-state-info:\s*#4f84d6/.test(css));
assert.ok(/--scope-state-inactive:\s*#8b949e/.test(css));

assert.ok(/qvActivityCalendarClass/.test(activites));
assert.ok(/marks\.holiday \? 'is-holiday' : marks\.vacation \? 'is-vacation'/.test(calendarClass));
assert.ok(/background:\s*#eceaf6/.test(vacationCss));
assert.ok(/background:\s*#dce3f7/.test(vacationCss));
assert.ok(/#eceaf6/.test(laterVacationCss) && /#dce3f7/.test(laterVacationCss));
assert.ok(/\.qv-activites-row\.is-vacation:nth-child\(even\) td/.test(css));
assert.ok(/\.qv-activites-row\.is-holiday:nth-child\(even\) td/.test(css));
assert.ok(/qv-month-separator/.test(activites));
assert.ok(/qvMonthSeparatorLabel/.test(activites));
assert.ok(/qv-export-btn/.test(activites));
assert.ok(/qvActivitesFilterBar\(qv\)/.test(activites));
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(activites));
assert.ok(!/netlify deploy/.test(activites));

const logicSha = execFileSync('git', ['hash-object', 'assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
const headLogicSha = execFileSync('git', ['rev-parse', 'HEAD:assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(logicSha, headLogicSha, 'scope-ui-logic.js ne doit pas changer');
const serviceSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
const headServiceSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(serviceSha, headServiceSha, 'service QUO VADIS ne doit pas changer');
const coverageSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-coverage.js'], { cwd: root, encoding: 'utf8' }).trim();
const headCoverageSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-coverage.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(coverageSha, headCoverageSha, 'coverage QUO VADIS ne doit pas changer');
const schemaSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-schema.js'], { cwd: root, encoding: 'utf8' }).trim();
const headSchemaSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-schema.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(schemaSha, headSchemaSha, 'schéma SCOPE ne doit pas changer');
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(service));
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(coverage));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-canonical-foundations-c1'/.test(schema));

assert.ok(/scope-quo-vadis-toutes-activites-ui-ruleset-1|scope-quo-vadis-agenda-ui-ruleset-1|scope-quo-vadis-pilot-tabs-1/.test(html));
assert.ok(/scope-quo-vadis-toutes-activites-ui-ruleset-1/.test(css));
assert.ok(/test:scope-quo-vadis-toutes-activites-ui-ruleset-1/.test(packageJson));

console.log('scope-quo-vadis-toutes-activites-ui-ruleset-1-tests: ok');
