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
const pkgText = read('package.json');
const annual = ui.slice(ui.indexOf('function qvCalendarMarkVisible'), ui.indexOf('function renderQuoVadisAgenda('));
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

function seedVacations() {
  const start = service.indexOf('const vacations = [');
  const block = service.slice(start, service.indexOf('];', start));
  return [...block.matchAll(/\[`\$\{(year|next)\}-(\d{2}-\d{2})`, `\$\{(year|next)\}-(\d{2}-\d{2})`, '([^']+)'\]/g)]
    .map((match) => {
      const yearOf = (token) => (token === 'next' ? '2028' : '2027');
      return { debut: `${yearOf(match[1])}-${match[2]}`, fin: `${yearOf(match[3])}-${match[4]}`, libelle: match[5] };
    });
}

function seedHolidays() {
  const block = service.slice(service.indexOf('const holidays = [') + 'const holidays = ['.length, service.indexOf('];', service.indexOf('const holidays = [')));
  return [...block.matchAll(/\[`\$\{year\}-(\d{2}-\d{2})`, '([^']+)'\]|\[`\$\{next\}-(\d{2}-\d{2})`, '([^']+)'\]/g)]
    .map((match) => (match[1] ? { date: `2027-${match[1]}`, libelle: match[2] } : { date: `2028-${match[3]}`, libelle: match[4] }));
}

function calendarFixture() {
  const days = [];
  seedHolidays().forEach((row) => {
    days.push({ jour: row.date, typeJour: 'FERIE', libelle: row.libelle, neutralise: true, metadata: { historizedForProgramme: true } });
  });
  seedVacations().forEach((row) => {
    days.push({
      jour: row.debut,
      typeJour: 'VACANCES_SCOLAIRES',
      libelle: row.libelle,
      neutralise: true,
      metadata: { historizedForProgramme: true, dateFin: row.fin }
    });
  });
  return days;
}

function overlay(marks, hasActivity) {
  if (hasActivity) return 'activity';
  if (marks.holiday) return 'holiday';
  if (marks.vacation) return 'vacation';
  return '';
}

const days = calendarFixture();
const byDate = L.qvExpandCalendarDays(days);
const ete = seedVacations().find((row) => row.libelle.includes('ete'));
assert.ok(ete, 'période d’été absente du seed');
assert.strictEqual(ete.debut, '2027-07-03');
assert.ok(ete.fin > ete.debut, 'plage VACANCES_SCOLAIRES sans date de fin');

let cursor = ete.debut;
let covered = 0;
while (cursor && cursor <= ete.fin) {
  assert.ok(byDate[cursor] && byDate[cursor].some((row) => L.qvCalendarKind(row) === 'VACANCES_SCOLAIRES'), `jour intermédiaire non reconnu: ${cursor}`);
  covered += 1;
  cursor = L.qvShiftDateKey(cursor, 1);
}
assert.ok(covered > 2, 'la plage d’été doit couvrir plus que le jour de début');

const winter = seedVacations().find((row) => row.debut === '2027-12-24');
assert.ok(winter, 'période de Noël / Nouvel An absente du référentiel');
assert.strictEqual(winter.fin, '2028-01-09');
assert.ok(byDate['2027-12-25'] && byDate['2027-12-25'].some((row) => L.qvCalendarKind(row) === 'VACANCES_SCOLAIRES'));
assert.ok(byDate['2028-01-02'] && byDate['2028-01-02'].some((row) => L.qvCalendarKind(row) === 'VACANCES_SCOLAIRES'));

const firstAugust = L.qvCalendarMarksForDate(byDate, '2027-08-01');
assert.ok(firstAugust.vacation && firstAugust.holiday, '1er août: vacances + férié requis');
assert.strictEqual(overlay(firstAugust, false), 'holiday');
assert.strictEqual(overlay(firstAugust, true), 'activity');

const christmas = L.qvCalendarMarksForDate(byDate, '2027-12-25');
assert.ok(christmas.holiday && christmas.vacation);
assert.strictEqual(overlay(christmas, false), 'holiday');

const periods = L.qvVacationPeriods(days);
assert.ok(periods.every((row) => row.debut && row.fin && row.libelle));
assert.strictEqual(periods.filter((row) => row.libelle.includes('sport') && row.debut.startsWith('2027-02')).length, 1, 'période sport 2027 dupliquée jour par jour');
assert.ok(!periods.some((row) => row.debut === row.fin && row.fin !== row.debut));
const sport = periods.find((row) => row.libelle.includes('sport') && row.debut.startsWith('2027-02'));
assert.strictEqual(sport.debut, '2027-02-06');
assert.strictEqual(sport.fin, '2027-02-14');
assert.ok(periods.some((row) => row.debut === '2027-12-24' && row.fin === '2028-01-09'));
const sortedDebuts = periods.map((row) => row.debut);
assert.ok(sortedDebuts.every((value, index) => index === 0 || value >= sortedDebuts[index - 1]), 'périodes non triées');

const holidays = L.qvHolidayEntries(days);
const holidayDates = holidays.map((row) => row.date);
assert.ok(holidayDates.every((value, index) => index === 0 || value >= holidayDates[index - 1]), 'jours fériés non triés');
assert.ok(holidays.some((row) => row.date === '2027-08-01' && /Fete nationale/i.test(row.libelle)));

const janvier = L.parseHash('#/quo-vadis/agenda?mois=2027-01');
assert.strictEqual(janvier.qvView, 'agenda');
assert.strictEqual(janvier.qvMois, '2027-01');
const sixMars = L.parseHash('#/quo-vadis/agenda?mois=2027-03&jour=2027-03-06');
assert.strictEqual(sixMars.qvView, 'agenda');
assert.strictEqual(sixMars.qvMois, '2027-03');
assert.strictEqual(sixMars.qvJour, '2027-03-06');
assert.ok(/qvHref\('agenda', \{ mois: month\.key, jour: cell\.date \}\)/.test(annual));
assert.ok(/qvHref\('agenda', \{ mois: month\.key \}\)/.test(annual));
assert.ok(/id="\$\{escapeHtml\(L\.qvAgendaDayAnchorId\(group\.date\)\)\}"/.test(agenda));
assert.strictEqual(L.qvAgendaDayAnchorId('2027-03-06'), 'qv-agenda-day-2027-03-06');
assert.ok(/scrollIntoView/.test(ui));
assert.ok(/qvAgendaDayAnchorId\(agendaDay\)/.test(ui) || /qvAgendaDayAnchorId\(jour\)/.test(ui));
assert.ok(!/filters\.jour/.test(ui.slice(ui.indexOf('function qvFilteredActivities'), ui.indexOf('function qvSortActivities'))));

const pkg = JSON.parse(pkgText);
const scriptKeys = [...pkgText.matchAll(/^\s+"([^"]+)":/gm)]
  .map((match) => match[1])
  .filter((key, index, all) => {
    const scriptsStart = pkgText.indexOf('"scripts"');
    const depsStart = pkgText.indexOf('"dependencies"');
    const pos = pkgText.indexOf(`"${key}":`, scriptsStart);
    return pos > scriptsStart && pos < depsStart;
  });
const uniqueScriptKeys = [...new Set(scriptKeys)];
assert.strictEqual(scriptKeys.length, uniqueScriptKeys.length, `clé npm dupliquée: ${scriptKeys.filter((key, i) => scriptKeys.indexOf(key) !== i).join(', ')}`);
assert.strictEqual(pkg.scripts['test:scope-quo-vadis-agenda-annuel-calendar-markers-repair-1'], 'node scripts/scope-quo-vadis-agenda-annuel-calendar-markers-repair-1-tests.js');
assert.ok(pkg.scripts['test:scope-quo-vadis-calendar-reference-complete-2']);

assert.ok(!/Nouvel An/.test(annual));
assert.ok(!/Vacances scolaires vaudoises/.test(annual));
assert.ok(!/2027-12-24/.test(annual));
assert.ok(!/2027-08-01/.test(annual));
assert.ok(!/2027-03-06/.test(annual));
assert.ok(/qvExpandCalendarDays/.test(annual) || /L\.qvExpandCalendarDays/.test(annual));
assert.ok(/calendarDays/.test(annual));
assert.ok(/metadata\.dateFin/.test(logicSrc) || /meta\.dateFin/.test(logicSrc));
assert.ok(/async function listProgramme[\s\S]*?await seedCalendar\(programme\)/.test(service));
assert.ok(/calendarRowsForDate\(calendarRows, date\)/.test(service));
assert.ok(!/qvExpandCalendarDays/.test(service), 'le moteur CONSOLIDATION-2 ne doit pas étendre les plages');

assert.ok(/id="qv-legend-holidays"/.test(annual) && /id="qv-legend-vacations"/.test(annual));
assert.ok(/type="button" class="qv-legend-action"/.test(annual));
assert.ok(/aria-haspopup="dialog"/.test(annual) && /aria-expanded/.test(annual));
assert.ok(/CALENDRIER 2027–2028/.test(annual));
assert.ok(/Aucune période renseignée pour le périmètre QUO VADIS/.test(annual));
assert.ok(/qvVacationPeriods/.test(annual) && /qvHolidayEntries/.test(annual));
assert.ok(/id="qv-calendar-dialog-close"/.test(annual));
assert.ok(/Escape/.test(ui) && /quoVadisCalendarModal/.test(ui));
assert.ok(/\.qv-legend-action:focus-visible/.test(css));
assert.ok(/\.qv-mini-day\.has-activity span\s*\{[^}]*background:\s*var\(--scope-red\)/.test(css.replace(/\s+/g, ' ')));
assert.ok(/\.qv-mini-day\.has-holiday:not\(\.has-activity\) span/.test(css));
assert.ok(/\.qv-mini-day\.has-vacation/.test(css) && /#eceaf6/.test(css));
assert.ok(/scope-quo-vadis-calendar-(?:reference-complete-2|vd-final-[34])/.test(html) || /scope-quo-vadis-agenda-ux-[12]/.test(html));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(!/interpretHistoricalProgramme\s*=/.test(ui));

const emptyPeriods = L.qvVacationPeriods([]);
const emptyHolidays = L.qvHolidayEntries([]);
assert.strictEqual(emptyPeriods.length, 0);
assert.strictEqual(emptyHolidays.length, 0);

console.log('scope-quo-vadis-calendar-reference-complete-2-tests: ok');
