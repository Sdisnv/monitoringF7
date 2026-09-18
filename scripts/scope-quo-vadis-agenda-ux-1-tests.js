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
const html = read('scope.html');
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const annual = ui.slice(ui.indexOf('function qvRenderMiniMonth'), ui.indexOf('function renderQuoVadisAgendaAnnuel'));
const binding = ui.slice(ui.indexOf('const agendaDay = route().qvJour'), ui.indexOf("root.querySelectorAll('[data-qv-open]')"));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/function renderQuoVadisAgenda/.test(agenda));
assert.ok(/qv-agenda-nav/.test(agenda));
assert.ok(/qv-agenda-month-select/.test(agenda));
assert.ok(/id="qv-agenda-prev"/.test(agenda) && /id="qv-agenda-next"/.test(agenda));
assert.ok(/id="qv-agenda-month"/.test(agenda));
assert.ok(/événement/.test(agenda) && /journées/.test(agenda) && / · /.test(agenda));

assert.ok(/function qvAgendaFilterBar/.test(ui));
assert.ok(/Rechercher un événement, un domaine, un public cible, un lieu/.test(ui));
assert.ok(/Public cible/.test(agenda) || /Public cible/.test(ui));
assert.ok(/qv-filter-cible/.test(ui));
assert.ok(/qv-filter-oi/.test(ui));
assert.ok(/qvCibleLabel/.test(ui));
assert.ok(/Séances multiples/.test(ui) && /Points d’attention/.test(ui));
assert.ok(/Réinitialiser les filtres/.test(ui));
assert.ok(/filters\.oi/.test(ui.slice(ui.indexOf('function qvFilteredActivities'), ui.indexOf('function qvActivitySortValue'))));

assert.ok(/Horaire/.test(agenda) && /Domaine/.test(agenda) && />OI</.test(agenda));
assert.ok(/Public cible/.test(agenda) && /Événement/.test(agenda));
assert.ok(/Stat\.Com/.test(agenda) && /Lieu/.test(agenda));
assert.ok(/Adresse convocation/.test(agenda) && />État</.test(agenda));
assert.ok(!/<th>Attention<\/th>/.test(agenda));
assert.ok(!/<th>SEM/.test(agenda));
assert.ok(!/qv-agenda-dot/.test(agenda));
assert.ok(!/data-qv-row-menu/.test(agenda) && !/>…</.test(agenda));
assert.ok(/colspan="9"/.test(agenda));
assert.ok(/qv-agenda-week/.test(agenda));
assert.ok(/qvAgendaDayTitle/.test(agenda));
assert.ok(!/<td[^>]*>\s*Semaine/.test(agenda));
assert.ok(!/qvAgendaDayTitle[\s\S]{0,200}Vacances scolaires/.test(agenda));

assert.ok(/qvConvocationAddress/.test(agenda));
assert.ok(/adresseLigne1/.test(ui));
assert.ok(/lieu\.npa/.test(ui) && /lieu\.localite/.test(ui));
assert.ok(!/Av\. des Sports 2/.test(agenda));
assert.ok(!/Yverdon-les-Bains/.test(agenda));

assert.ok(/qvAgendaState/.test(agenda));
assert.ok(/Validé/.test(agenda));
assert.ok(/Planifié/.test(agenda));
assert.ok(/Point d’attention/.test(agenda));
assert.ok(/À arbitrer/.test(agenda));
assert.ok(/Annulé/.test(agenda));
assert.ok(/PLANIFIE: 'Positionnée'/.test(ui), 'libellé métier Positionnée conservé hors Agenda');
assert.ok(/status === 'PLANIFIE'/.test(ui) && /validated/.test(ui));
assert.ok(/status === 'ANNULE'/.test(ui));
assert.ok(/is-cancelled/.test(agenda));

assert.ok(/is-normal/.test(agenda) && /is-vacation/.test(agenda) && /is-holiday/.test(agenda));
assert.ok(/marks\.holiday \? 'is-holiday' : marks\.vacation \? 'is-vacation'/.test(agenda.replace(/\s+/g, ' ')));
assert.ok(/qvCalendarKind\(row\) === 'FERIE'/.test(agenda));
assert.ok(/Jour férié —/.test(agenda));
assert.ok(/qv-agenda-week/.test(agenda));
assert.ok(/qvAgendaDayTitle/.test(agenda));
assert.ok(!/<td[^>]*>\s*Semaine/.test(agenda));
assert.ok(/font-style:\s*normal/.test(css.slice(css.indexOf('.qv-agenda-week'), css.indexOf('.qv-agenda-table .qv-agenda-row'))));
assert.ok(!/qv-agenda-week[^}]*italic/.test(css));
assert.ok(/#5b6570/.test(css) && /#eceaf6/.test(css) && /#dce3f7/.test(css));
assert.ok(/border-radius:\s*4px/.test(css.slice(css.indexOf('.qv-agenda-state'), css.indexOf('.qv-agenda-state.is-planned'))));
assert.ok(!/qv-agenda-state[\s\S]{0,120}border-radius:\s*999/.test(css));

assert.strictEqual(L.qvIsoWeek('2027-02-02'), 5);
assert.strictEqual(L.qvIsoWeek('2027-02-06'), 5);
assert.strictEqual(L.qvIsoWeek('2027-02-15'), 7);
assert.strictEqual(L.qvIsoWeek('2027-03-06'), 9);

const calendar = L.qvExpandCalendarDays([
  { jour: '2027-02-06', typeJour: 'VACANCES_SCOLAIRES', libelle: 'sport', metadata: { dateFin: '2027-02-14' }, neutralise: true },
  { jour: '2027-08-01', typeJour: 'FERIE', libelle: 'Fete nationale', metadata: {}, neutralise: true },
  { jour: '2027-08-01', typeJour: 'VACANCES_SCOLAIRES', libelle: 'ete', metadata: { dateFin: '2027-08-22' }, neutralise: true },
  { jour: '2027-05-05', typeJour: 'VEILLE_FERIE', libelle: 'Veille', metadata: {}, neutralise: true },
  { jour: '2027-05-07', typeJour: 'NEUTRALISATION_INTERNE', libelle: 'Pont', metadata: { constraintKind: 'PONT_ASCENSION' }, neutralise: true }
]);
const sixth = L.qvCalendarMarksForDate(calendar, '2027-02-06');
assert.ok(sixth.vacation && !sixth.holiday);
const firstAugust = L.qvCalendarMarksForDate(calendar, '2027-08-01');
assert.ok(firstAugust.holiday && firstAugust.vacation);
assert.ok(!calendar['2027-05-05'], 'veille férié affichée');
assert.ok(!calendar['2027-05-07'], 'pont affiché comme férié');

assert.ok(/qv-mini-week/.test(annual));
assert.ok(/qvIsoWeek/.test(annual));
assert.ok(/has-activity/.test(annual) && /has-holiday/.test(annual) && /has-vacation/.test(annual));
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(annual));
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(ui));
assert.ok(/id="\$\{escapeHtml\(L\.qvAgendaDayAnchorId\(group\.date\)\)\}"/.test(agenda));
assert.ok(/requestAnimationFrame/.test(binding) && /scrollIntoView/.test(binding));
assert.ok(binding.indexOf('requestAnimationFrame') < binding.indexOf('scrollIntoView'));
assert.ok(!/qvJour/.test(ui.slice(ui.indexOf('function qvFilteredActivities'), ui.indexOf('function qvActivitySortValue'))), 'jour utilisé comme filtre du mois');

const sixMars = L.parseHash('#/quo-vadis/agenda?mois=2027-03&jour=2027-03-06');
assert.strictEqual(sixMars.qvView, 'agenda');
assert.strictEqual(sixMars.qvMois, '2027-03');
assert.strictEqual(sixMars.qvJour, '2027-03-06');
assert.strictEqual(L.qvAgendaDayAnchorId('2027-03-06'), 'qv-agenda-day-2027-03-06');

assert.ok(/Conseil/.test(agenda) && /Bon à savoir/.test(agenda));
assert.ok(/fiche détaillée/.test(agenda));
assert.ok(/Agenda annuel/.test(agenda));
assert.ok(/scope-quo-vadis-agenda-ux-[123]/.test(html));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(!/interpretHistoricalProgramme\s*=/.test(ui));
assert.ok(/qvCalendarMarkVisible/.test(logicSrc));
assert.ok(/dateFin/.test(logicSrc));

console.log('scope-quo-vadis-agenda-ux-1-tests: ok');
