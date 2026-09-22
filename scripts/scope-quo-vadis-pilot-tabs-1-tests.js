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
const coverage = read('netlify/lib/_scope-quo-vadis-coverage.js');

const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));
const alertes = ui.slice(ui.indexOf('function renderQuoVadisAlertes('), ui.indexOf('function renderQuoVadisCursus('));
const cursus = ui.slice(ui.indexOf('function renderQuoVadisCursus('), ui.indexOf('function renderQuoVadisRegles('));
const regles = ui.slice(ui.indexOf('function renderQuoVadisRegles('), ui.indexOf('function qvFieldError('));
const dates = ui.slice(ui.indexOf('function renderQuoVadisDatesConnues('), ui.indexOf('function renderQuoVadis('));
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const arbitrer = ui.slice(ui.indexOf('function qvArbitrerFilterBar('), ui.indexOf('function renderQuoVadisAlertes('));
const legend = agenda.slice(agenda.lastIndexOf('qv-agenda-legend'), agenda.indexOf('qv-agenda-table-wrap'));

assert.ok(alertes.includes('function renderQuoVadisAlertes'), 'renderer Alertes manquant');
assert.ok(/<h2>Alertes<\/h2>/.test(alertes));
assert.ok(/Points d’attention à examiner avant toute validation opérationnelle/.test(alertes));
assert.ok(/qv-alert-new/.test(alertes) && /Nouvelle alerte/.test(alertes));
assert.ok(/qvSoftBtn\('qv-alert-new'/.test(alertes));
assert.ok(/qv-filter-q/.test(alertes) && /qv-filter-domain/.test(alertes) && /qv-filter-gravity/.test(alertes) && /qv-filter-status/.test(alertes));
assert.ok(/Réinitialiser/.test(alertes));
assert.ok(/<th>Type<\/th>/.test(alertes));
assert.ok(/Action possible/.test(alertes));
assert.ok(/Consulter ›/.test(alertes));
assert.ok(/Aucun point d’attention pour le moment/.test(alertes));
assert.ok(!/scope-pill/.test(alertes), 'Alertes: pastille interdite');
assert.ok(!/triangle|pictogramme|exclamation/.test(alertes.toLowerCase()));
assert.ok(!/scope-btn-primary/.test(alertes), 'Alertes: bouton primaire interdit');
assert.ok(/qvPilotStateLegendHtml/.test(alertes));
assert.ok(/escapeHtml\(row\.type\)/.test(alertes), 'Type doit rester du texte');

assert.ok(/qv-cursus-view/.test(cursus));
assert.ok(/Rechercher un cursus/.test(cursus));
assert.ok(/data-qv-cursus-select/.test(cursus));
assert.ok(/Prévu en 2027/.test(cursus) && /Non prévu en 2027/.test(cursus));
assert.ok(/data-qv-cursus-plan/.test(cursus));
assert.ok(/1\. Planning 2027/.test(cursus));
assert.ok(/2\. Modules du cursus/.test(cursus));
assert.ok(/Inclus 2027/.test(cursus));
assert.ok(/data-qv-cursus-step/.test(cursus));
assert.ok(/Début du cursus 2026/.test(cursus) && /Début du cursus 2027/.test(cursus));
assert.ok(/Année 1/.test(cursus));
assert.ok(/automatically décochés|automatiquement décochés/.test(cursus));
assert.ok(/qvSoftBtn\('qv-cursus-save'/.test(cursus));
assert.ok(!/scope-btn-primary/.test(cursus));
assert.ok(!/scope-pill/.test(cursus));
assert.ok(/disabled/.test(cursus), 'modules inactifs si cursus non prévu');

assert.ok(/Règles de planification/.test(regles));
assert.ok(/jours recommandés, possibles ou déconseillés/.test(regles));
assert.ok(/qvSoftBtn\('qv-rules-edit'/.test(regles));
assert.ok(/qvDayChipsHtml/.test(regles));
assert.ok(/qv-day-chips/.test(ui) && /qv-day-chip/.test(ui));
assert.ok(/Lu/.test(ui) && /Di/.test(ui));
assert.ok(/qv-day-legend/.test(regles));
assert.ok(/Préféré/.test(regles) && /Possible/.test(regles) && /Déconseillé/.test(regles) && /Interdit/.test(regles));
assert.ok(!/Friday:|Lundi: /.test(regles));
assert.ok(!/scope-btn-primary/.test(regles));
assert.ok(!/scope-pill/.test(regles));

assert.ok(/qv-dates-view/.test(dates));
assert.ok(/Nouvelle date annoncée/.test(dates));
assert.ok(/Dates déjà saisies/.test(dates));
assert.ok(/1\. Activité/.test(dates) && /2\. Date et horaire/.test(dates) && /3\. Lieu et complément/.test(dates));
assert.ok(/Date de début/.test(dates) && /Heure de début/.test(dates) && /Date de fin/.test(dates) && /Heure de fin/.test(dates));
assert.ok(/Séances sur plusieurs jours/.test(dates));
assert.ok(/qv-future-save/.test(dates) && /qv-soft-btn/.test(dates));
assert.ok(!/scope-btn-primary/.test(dates));
assert.ok(/Aucune date annoncée/.test(dates));
assert.ok(/consommée au prochain recalcul/.test(dates));
assert.ok(/scope-form-section/.test(dates));
assert.ok(/qv-future-lieu-id/.test(dates));
assert.ok(!/id="qv-future-end-date"[^>]*required/.test(dates));
assert.ok(!/scope-pill/.test(dates));

assert.ok(/\.scope-btn\.qv-soft-btn/.test(css));
assert.ok(/background:\s*#f4f6fb/.test(css));
assert.ok(/\.qv-day-chip\.is-pref/.test(css) && /#cfe8d6/.test(css));
assert.ok(/\.qv-day-chip\.is-ok/.test(css) && /#edf6ef/.test(css));
assert.ok(/\.qv-day-chip\.is-warn/.test(css) && /#f7ead0/.test(css));
assert.ok(/\.qv-day-chip\.is-off/.test(css) && /#f6d9db/.test(css));
assert.ok(/\.qv-cursus-view/.test(css) && /\.qv-dates-view/.test(css));
assert.ok(/grid-template-columns:\s*minmax\(0,\s*1\.62fr\)/.test(css));
assert.ok(/overflow-x:\s*auto/.test(css.slice(css.indexOf('.qv-pilot-table-wrap'), css.indexOf('.qv-pilot-table-wrap') + 80)));

assert.ok(/scopeStateHtml\('block', 'À arbitrer'\)/.test(legend));
assert.ok(/scopeStateHtml\('attention', 'Point d’attention'\)/.test(legend));
assert.ok(/scopeStateHtml\('positive', 'Validé'\)/.test(legend));
assert.ok(/qvActivityStateHtml\(row\)/.test(agenda));
assert.ok(/qvActivityStateHtml\(row\)/.test(activites));
assert.ok(/scope-state-swatch/.test(arbitrer) || /qvActivityStateHtml/.test(arbitrer) || /scopeStateHtml/.test(arbitrer));
assert.ok(/--scope-state-swatch-size:\s*8px/.test(css));
assert.ok(/#2f9e5a/.test(css) && /#DE000A/.test(css) && /#c98412/.test(css) && /#4f84d6/.test(css) && /#8b949e/.test(css));

assert.ok(!/THURSDAY|MONDAY|SATURDAY|PREFERRED|ALLOWED|FORBIDDEN|source_ref|metadata|CORE-1|day_policy/.test(alertes + cursus + regles + dates));
assert.ok(!/scope-pill success/.test(qvUi));

const logicSha = execFileSync('git', ['hash-object', 'assets/js/scope-ui-logic.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.ok(logicSha, 'scope-ui-logic.js hashable');
assert.ok(read('assets/js/scope-ui-logic.js').includes('SHARED_DOMAIN_GROUPS'));
const serviceSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
const headServiceSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-service.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(serviceSha, headServiceSha, 'service QUO VADIS ne doit pas changer');
const coverageSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-quo-vadis-coverage.js'], { cwd: root, encoding: 'utf8' }).trim();
const headCoverageSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-quo-vadis-coverage.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(coverageSha, headCoverageSha, 'coverage QUO VADIS ne doit pas changer');
const schemaSha = execFileSync('git', ['hash-object', 'netlify/lib/_scope-schema.js'], { cwd: root, encoding: 'utf8' }).trim();
const headSchemaSha = execFileSync('git', ['rev-parse', 'HEAD:netlify/lib/_scope-schema.js'], { cwd: root, encoding: 'utf8' }).trim();
assert.strictEqual(schemaSha, headSchemaSha, 'schéma SCOPE ne doit pas changer');
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(alertes + cursus + regles + dates));
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(service));
assert.ok(!/CREATE TABLE|ALTER TABLE/.test(coverage));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION/.test(schema));

assert.ok(/scope-quo-vadis-pilot-tabs-1/.test(html));
assert.ok(/scope-quo-vadis-pilot-tabs-1/.test(css));
assert.ok(/test:scope-quo-vadis-pilot-tabs-1/.test(packageJson));

console.log('scope-quo-vadis-pilot-tabs-1-tests: ok');
