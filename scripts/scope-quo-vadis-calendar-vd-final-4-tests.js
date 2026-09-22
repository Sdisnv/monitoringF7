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

const rows = [
  { jour: '2027-05-06', type_jour: 'FERIE', libelle: 'Ascension', neutralise: true },
  { jour: '2027-07-03', type_jour: 'VACANCES_SCOLAIRES', libelle: 'Vacances d’ete', neutralise: true, metadata: { dateFin: '2027-08-22' } }
];
const enriched = calendar.enrichCalendarRows(rows);
const at = (date) => calendar.calendarRowsForDate(rows, date);
const hasType = (date, type) => at(date).some((row) => calendar.calendarType(row) === type);

assert.ok(hasType('2027-05-06', 'FERIE'));
assert.ok(hasType('2027-05-05', 'VEILLE_FERIE'));
assert.ok(hasType('2027-05-07', 'NEUTRALISATION_INTERNE'));
assert.ok(!hasType('2027-05-05', 'FERIE'));
assert.ok(!hasType('2027-05-07', 'FERIE'));
assert.strictEqual(at('2027-05-07').find((row) => calendar.calendarType(row) === 'NEUTRALISATION_INTERNE').metadata.constraintKind, 'PONT_ASCENSION');

function allDatesExcept(year, month, allowed) {
  const result = new Set();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= last; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (date !== allowed) result.add(date);
  }
  return result;
}

function proposalOnOnly(date, calendarRows) {
  const [year, month] = date.split('-').map(Number);
  return coverage.pickProposalSlot({
    year,
    month,
    domain: 'DPS',
    activity: {},
    calendarRows,
    blockedDates: allDatesExcept(year, month, date)
  });
}

assert.strictEqual(proposalOnOnly('2027-05-06', rows), null, 'FERIE accepté par le moteur');
assert.strictEqual(proposalOnOnly('2027-05-05', rows), null, 'VEILLE_FERIE acceptée par le moteur');
assert.strictEqual(proposalOnOnly('2027-05-07', rows), null, 'PONT_ASCENSION accepté par le moteur');
assert.strictEqual(proposalOnOnly('2027-07-08', rows), null, 'vacances acceptées par le moteur');
assert.strictEqual(proposalOnOnly('2027-06-03', rows).date, '2027-06-03', 'journée normale refusée par le moteur');

const future = [{ jour: '2030-05-30', type_jour: 'FERIE', libelle: 'Ascension', neutralise: true }];
assert.ok(calendar.calendarRowsForDate(future, '2030-05-29').some((row) => calendar.calendarType(row) === 'VEILLE_FERIE'));
assert.ok(calendar.calendarRowsForDate(future, '2030-05-31').some((row) => row.metadata && row.metadata.constraintKind === 'PONT_ASCENSION'));
assert.strictEqual(proposalOnOnly('2030-05-29', future), null);
assert.strictEqual(proposalOnOnly('2030-05-31', future), null);

const logicSource = read('assets/js/scope-ui-logic.js');
const sandbox = { window: {}, document: { addEventListener() {} }, console };
sandbox.window = sandbox;
vm.runInNewContext(logicSource, sandbox);
const logic = sandbox.window.ScopeUiLogic;
const expanded = logic.qvExpandCalendarDays(enriched);
assert.ok(expanded['2027-07-08'].some((row) => logic.qvCalendarKind(row) === 'VACANCES_SCOLAIRES'));
assert.ok(!expanded['2027-05-05'], 'VEILLE_FERIE affichée comme jour férié');
assert.ok(!expanded['2027-05-07'], 'PONT_ASCENSION affiché comme jour férié');
const constraints = logic.qvCalendarConstraints(enriched);
assert.ok(constraints.some((row) => row.date === '2027-05-05' && row.type === 'Veille de jour férié'));
assert.ok(constraints.some((row) => row.date === '2027-05-07' && row.type === 'Pont de l’Ascension'));

const route = logic.parseHash('#/quo-vadis/agenda?mois=2027-03&jour=2027-03-06');
assert.strictEqual(route.qvMois, '2027-03');
assert.strictEqual(route.qvJour, '2027-03-06');
assert.strictEqual(logic.qvAgendaDayAnchorId(route.qvJour), 'qv-agenda-day-2027-03-06');

const ui = read('assets/js/scope-ui.js');
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const binding = ui.slice(ui.indexOf('const agendaDay = route().qvJour'), ui.indexOf("root.querySelectorAll('[data-qv-open]')"));
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(ui));
assert.ok(/id="\$\{escapeHtml\(L\.qvAgendaDayAnchorId\(group\.date\)\)\}"/.test(agenda));
assert.ok(/requestAnimationFrame/.test(binding) && /scrollIntoView/.test(binding));
assert.ok(binding.indexOf('requestAnimationFrame') < binding.indexOf('scrollIntoView'));
assert.ok(!/qvJour/.test(ui.slice(ui.indexOf('function qvFilteredActivities'), ui.indexOf('function qvActivitySortValue'))), 'jour utilisé comme filtre du mois');
assert.ok(/scope-quo-vadis-calendar-vd-final-4/.test(read('scope.html')) || /scope-quo-vadis-agenda-ux-[123]/.test(read('scope.html')) || /scope-quo-vadis-toutes-activites-ux-[1234]/.test(read('scope.html')) || /scope-quo-vadis-a-arbitrer-redesign-1|scope-quo-vadis-a-arbitrer-ux-[23]/.test(read('scope.html')));

const frames = [];
const scrolls = [];
const rootNode = {
  innerHTML: '',
  classList: { toggle() {}, add() {}, remove() {} },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};
const anchorNode = {
  setAttribute() {},
  scrollIntoView(options) { scrolls.push(options); },
  focus() {}
};
const storage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const location = { hash: '#/quo-vadis/agenda?mois=2027-03&jour=2027-03-06', search: '', pathname: '/scope.html', hostname: 'localhost' };
const documentMock = {
  body: { classList: { toggle() {}, add() {}, remove() {} } },
  getElementById(id) {
    if (id === 'scope-root') return rootNode;
    if (id === 'qv-agenda-day-2027-03-06' && rootNode.innerHTML.includes(`id="${id}"`)) return anchorNode;
    return null;
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  dispatchEvent() {}
};
const uiSandbox = {
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) { frames.push(callback); },
  encodeURIComponent,
  URLSearchParams,
  Event: function Event(type) { this.type = type; },
  location,
  localStorage: storage,
  sessionStorage: storage,
  document: documentMock,
  window: {
    __SCOPE_UI_TEST_HOOKS__: true,
    ScopeUiLogic: logic,
    ScopeCharts: null,
    CurrentRoles: [],
    CurrentPermissions: [],
    MonitoringRBAC: { has() { return false; } },
    location,
    history: { replaceState() {} },
    addEventListener() {},
    scrollTo() {},
    requestAnimationFrame(callback) { frames.push(callback); },
    document: documentMock,
    localStorage: storage,
    sessionStorage: storage
  }
};
uiSandbox.globalThis = uiSandbox.window;
vm.createContext(uiSandbox);
vm.runInContext(ui, uiSandbox, { filename: 'assets/js/scope-ui.js' });
const hooks = uiSandbox.window.ScopeUiTestHooks;
hooks.state.authChecking = false;
hooks.state.needOkta = false;
hooks.state.session = { name: 'Test SCOPE', roles: ['LECTEUR'], permissions: [] };
hooks.state.quoVadisReady = true;
hooks.state.quoVadis = {
  programme: { annee: 2027, statut: 'PREPARATION' },
  activities: [
    { activityId: 'a1', startsAt: '2027-03-01T19:30:00+00:00', endsAt: '2027-03-01T21:30:00+00:00', title: 'Activité précédente', domain: 'DPS' },
    { activityId: 'a2', startsAt: '2027-03-06T08:00:00+00:00', endsAt: '2027-03-06T10:00:00+00:00', title: 'Activité A', domain: 'DPS' },
    { activityId: 'a3', startsAt: '2027-03-06T10:00:00+00:00', endsAt: '2027-03-06T12:00:00+00:00', title: 'Activité B', domain: 'DPS' },
    { activityId: 'a4', startsAt: '2027-03-06T14:00:00+00:00', endsAt: '2027-03-06T16:00:00+00:00', title: 'Activité C', domain: 'DPS' }
  ],
  calendarDays: [],
  futureDates: [],
  lieux: [],
  cursus: [],
  rules: []
};
hooks.render();
assert.ok(rootNode.innerHTML.includes('Mars 2027'), 'mois demandé non ouvert');
assert.ok(rootNode.innerHTML.includes('qv-agenda-day-2027-03-01'), 'jour précédent supprimé par le paramètre jour');
assert.ok(rootNode.innerHTML.includes('qv-agenda-day-2027-03-06'), 'ancre du jour demandé absente');
assert.strictEqual((rootNode.innerHTML.match(/qv-agenda-day-2027-03-06/g) || []).length, 1, 'une ancre par activité au lieu d’une ancre par jour');
assert.ok(rootNode.innerHTML.includes('Activité A') && rootNode.innerHTML.includes('Activité B') && rootNode.innerHTML.includes('Activité C'));
assert.strictEqual(scrolls.length, 0, 'scroll exécuté avant la fin du rendu');
assert.ok(frames.length > 0, 'scroll post-rendu non planifié');
frames.splice(0).forEach((callback) => callback());
assert.strictEqual(scrolls.length, 1);
assert.strictEqual(scrolls[0].block, 'start');

console.log('scope-quo-vadis-calendar-vd-final-4-tests: PASS');
