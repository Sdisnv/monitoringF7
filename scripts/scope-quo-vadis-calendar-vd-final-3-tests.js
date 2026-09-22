#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const service = require('../netlify/lib/_scope-quo-vadis-service');
const coverage = require('../netlify/lib/_scope-quo-vadis-coverage');
const calendar = service._calendar;

const holidays = [
  ['2027-01-01', 'Nouvel An'],
  ['2027-01-02', 'Saint-Berchtold'],
  ['2027-03-26', 'Vendredi saint'],
  ['2027-03-29', 'Lundi de Paques'],
  ['2027-05-06', 'Ascension'],
  ['2027-05-17', 'Lundi de Pentecote'],
  ['2027-08-01', 'Fete nationale'],
  ['2027-09-20', 'Lundi du Jeune federal'],
  ['2027-12-25', 'Noel']
].map(([jour, libelle]) => ({ jour, type_jour: 'FERIE', libelle, neutralise: true }));
const vacations = [
  ['2026-12-24', '2027-01-10'],
  ['2027-02-06', '2027-02-14'],
  ['2027-03-26', '2027-04-11'],
  ['2027-07-03', '2027-08-22'],
  ['2027-10-09', '2027-10-24'],
  ['2027-12-24', '2028-01-09']
].map(([jour, dateFin]) => ({ jour, type_jour: 'VACANCES_SCOLAIRES', libelle: 'Vacances scolaires vaudoises', neutralise: true, metadata: { dateFin } }));
const bridge = { jour: '2027-05-07', type_jour: 'NEUTRALISATION_INTERNE', libelle: 'Pont de l’Ascension', neutralise: true };
const rows = holidays.concat(vacations, bridge);

holidays.forEach((row) => assert.strictEqual(calendar.classifyDate(row.jour, 'DPS', rows).dayClass, 'INTERDIT'));
['2027-04-02', '2027-04-05', '2027-05-13', '2027-05-24'].forEach((date) => {
  assert.ok(!calendar.calendarRowsForDate(rows, date).some((row) => calendar.calendarType(row) === 'FERIE'));
});

['2027-03-25', '2027-03-28', '2027-05-05', '2027-05-16', '2027-07-31', '2027-09-19', '2027-12-24'].forEach((date) => {
  assert.ok(calendar.calendarRowsForDate(rows, date).some((row) => calendar.calendarType(row) === 'VEILLE_FERIE'), `veille absente: ${date}`);
  assert.strictEqual(calendar.classifyDate(date, 'DPS', rows).dayClass, 'INTERDIT');
});

const future = [{ jour: '2030-05-30', type_jour: 'FERIE', libelle: 'Ferie futur', neutralise: true }];
assert.ok(calendar.calendarRowsForDate(future, '2030-05-29').some((row) => calendar.calendarType(row) === 'VEILLE_FERIE'));
assert.strictEqual(calendar.classifyDate('2030-05-29', 'DPS', future).dayClass, 'INTERDIT');

['2027-01-01', '2027-01-10', '2027-02-06', '2027-02-14', '2027-03-26', '2027-04-11', '2027-07-03', '2027-08-01', '2027-08-22', '2027-10-09', '2027-10-24', '2027-12-24', '2028-01-09'].forEach((date) => {
  assert.ok(calendar.calendarRowsForDate(rows, date).some((row) => calendar.calendarType(row) === 'VACANCES_SCOLAIRES'), `vacances absentes: ${date}`);
  assert.strictEqual(calendar.classifyDate(date, 'DPS', rows).dayClass, 'INTERDIT');
});
['2027-01-11', '2027-08-23'].forEach((date) => assert.ok(!calendar.calendarRowsForDate(rows, date).some((row) => calendar.calendarType(row) === 'VACANCES_SCOLAIRES')));
assert.strictEqual(calendar.classifyDate('2027-05-07', 'DPS', rows).dayClass, 'INTERDIT');
assert.ok(!calendar.calendarRowsForDate(rows, '2027-05-07').some((row) => calendar.calendarType(row) === 'FERIE'));

const august = coverage.pickProposalSlot({ year: 2027, month: 8, domain: 'DPS', activity: {}, calendarRows: rows });
assert.ok(august && august.date >= '2027-08-23', `proposition pendant les vacances: ${august && august.date}`);

const serviceSource = read('netlify/lib/_scope-quo-vadis-service.js');
assert.ok(serviceSource.includes("source in ('SEED_CORE_1', 'CALENDAR_VD_FINAL_3')"));
assert.ok(serviceSource.includes("`${year}-03-26`, 'Vendredi saint'"));
assert.ok(/deriveAscensionBridges/.test(serviceSource));
assert.ok(!serviceSource.includes("`${year}-05-07`, 'Pont de l’Ascension'"));

const ui = read('assets/js/scope-ui.js');
const logicSource = read('assets/js/scope-ui-logic.js');
assert.ok(/id="qv-legend-holidays"/.test(ui) && /id="qv-legend-vacations"/.test(ui));
assert.ok(/CALENDRIER 2027–2028/.test(ui));
assert.ok(/Contraintes de planification/.test(ui) && /veille de chaque jour férié/.test(ui));
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(ui));
assert.ok(/scrollIntoView/.test(ui));
assert.ok(/scope-quo-vadis-calendar-vd-final-[34]/.test(read('scope.html')) || /scope-quo-vadis-agenda-ux-[12]/.test(read('scope.html')) || /scope-quo-vadis-a-arbitrer-redesign-1|scope-quo-vadis-a-arbitrer-ux-[23]/.test(read('scope.html')));

const sandbox = { window: {}, document: { addEventListener() {} }, console };
sandbox.window = sandbox;
vm.runInNewContext(logicSource, sandbox);
const logic = sandbox.window.ScopeUiLogic;
const route = logic.parseHash('#/quo-vadis/agenda?mois=2027-03&jour=2027-03-06');
assert.strictEqual(route.qvMois, '2027-03');
assert.strictEqual(route.qvJour, '2027-03-06');
const visible = logic.qvExpandCalendarDays(calendar.enrichCalendarRows(rows));
assert.ok(visible['2027-08-01'].some((row) => logic.qvCalendarKind(row) === 'FERIE'));
assert.ok(!visible['2027-03-25'], 'une veille neutralisée ne doit pas être affichée comme jour férié');

console.log('scope-quo-vadis-calendar-vd-final-3-tests: PASS');
