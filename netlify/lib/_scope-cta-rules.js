'use strict';

const G1_CYCLE = Object.freeze(['N04b', 'N03b', 'N02b', 'N01b', 'N05a', 'N04a', 'N03a', 'N02a', 'N01a', 'N05b']);
const OTHER_CYCLE = Object.freeze(['N03a', 'N02a', 'N01a', 'N03b', 'N02b', 'N01b']);
const ANCHOR_DATE = '2027-01-01';
const DAY_MS = 86400000;

function dateKey(value) {
  return String(value || '').slice(0, 10);
}

function utcDate(value) {
  return new Date(`${dateKey(value)}T12:00:00Z`);
}

function addDays(value, days) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function cycleIndex(date) {
  return Math.round((utcDate(date) - utcDate(ANCHOR_DATE)) / (7 * DAY_MS));
}

function atCycle(cycle, index) {
  return cycle[((index % cycle.length) + cycle.length) % cycle.length];
}

function assignmentsForFriday(date) {
  const index = cycleIndex(date);
  const g1 = atCycle(G1_CYCLE, index);
  const other = atCycle(OTHER_CYCLE, index);
  return [
    { oi: 'G1', section: g1.slice(0, 3), halfSection: g1 },
    ...['C1', 'B1', 'B2'].map((oi) => ({ oi, section: other.slice(0, 3), halfSection: other }))
  ];
}

function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function thirdMondayOfSeptember(year) {
  const first = new Date(Date.UTC(year, 8, 1));
  const firstMonday = 1 + ((8 - first.getUTCDay()) % 7);
  return `${year}-09-${String(firstMonday + 14).padStart(2, '0')}`;
}

function vaudHolidays(year) {
  const easter = easterSunday(year);
  return [
    { date: `${year}-01-01`, label: 'Nouvel An' },
    { date: `${year}-01-02`, label: 'Nouvel An' },
    { date: addDays(easter, -2), label: 'Vendredi saint' },
    { date: addDays(easter, 1), label: 'Lundi de Pâques' },
    { date: addDays(easter, 39), label: 'Ascension' },
    { date: addDays(easter, 50), label: 'Lundi de Pentecôte' },
    { date: `${year}-08-01`, label: 'Fête nationale' },
    { date: thirdMondayOfSeptember(year), label: 'Lundi du Jeûne' },
    { date: `${year}-12-25`, label: 'Noël' }
  ];
}

function compactAssignments(assignments) {
  const g1 = assignments.find((row) => row.oi === 'G1');
  const others = assignments.filter((row) => ['C1', 'B1', 'B2'].includes(row.oi));
  const shared = others.length === 3 && others.every((row) => row.halfSection === others[0].halfSection);
  return `G1 ${g1.halfSection} ; ${shared ? 'C1/B1/B2 ' + others[0].halfSection : others.map((row) => `${row.oi} ${row.halfSection}`).join(' ; ')}`;
}

function applyCtaRules(rows, year = 2027) {
  const source = (rows || []).map((row) => ({ ...row }));
  const cta = source.filter((row) => row.definitionId === 'CTA-PERMANENCE').sort((a, b) => dateKey(a.startsAt).localeCompare(dateKey(b.startsAt)));
  const byStart = new Map(cta.map((row) => [dateKey(row.startsAt), row]));
  for (const row of cta) {
    const scheduledFriday = String(row.id || '').match(/CTA-PERM-(\d{4}-\d{2}-\d{2})$/)?.[1] || dateKey(row.startsAt);
    const assignments = assignmentsForFriday(scheduledFriday).map((assignment) => ({ ...assignment, provenance: 'MOA_CTA_CONTINUOUS_HALF_SECTION_CYCLE' }));
    Object.assign(row, {
      startsAt: `${scheduledFriday}T18:00`,
      endsAt: `${addDays(scheduledFriday, 3)}T06:00`,
      label: 'Permanence',
      eventLabel: 'Permanence',
      location: '',
      ctaAssignments: assignments,
      ctaPublicStatus: 'HALF_SECTION_ROTATION_MOA_DEMONSTRATED',
      ctaHolidayWindows: []
    });
  }
  byStart.clear();
  cta.forEach((row) => byStart.set(dateKey(row.startsAt), row));

  const coverage = [];
  for (const holiday of vaudHolidays(year)) {
    const weekday = utcDate(holiday.date).getUTCDay();
    let type = 'JOUR_FERIE_ISOLE';
    let startsAt;
    let endsAt;
    let owner;
    let assignments;
    if (weekday === 1) {
      type = 'PROLONGEMENT_WEEK_END';
      owner = cta.filter((row) => dateKey(row.startsAt) < holiday.date).at(-1);
      owner.endsAt = `${addDays(holiday.date, 1)}T06:00`;
      assignments = owner.ctaAssignments;
    } else if (weekday === 5) {
      type = 'FERIE_AVANT_WEEK_END';
      owner = byStart.get(holiday.date) || cta.find((row) => dateKey(row.startsAt) > holiday.date);
      owner.startsAt = `${addDays(holiday.date, -1)}T18:00`;
      assignments = owner.ctaAssignments;
    } else if (weekday === 0 || weekday === 6) {
      type = 'COUVERT_PAR_WEEK_END';
      owner = cta.find((row) => dateKey(row.startsAt) <= holiday.date && dateKey(row.endsAt) >= holiday.date);
      startsAt = owner.startsAt;
      endsAt = owner.endsAt;
      assignments = owner.ctaAssignments;
    } else {
      owner = cta.filter((row) => dateKey(row.startsAt) < holiday.date).at(-1);
      startsAt = `${addDays(holiday.date, -1)}T18:00`;
      endsAt = `${addDays(holiday.date, 1)}T06:00`;
      assignments = owner.ctaAssignments;
      owner.ctaHolidayWindows.push({ startsAt, endsAt, assignments, holidayDate: holiday.date, holidayLabel: holiday.label });
    }
    coverage.push({ holiday, type, owner, startsAt, endsAt, assignments });
  }
  const evidence = coverage.map(({ holiday, type, owner, startsAt, endsAt, assignments }) => ({
    ...holiday,
    type,
    startsAt: type === 'JOUR_FERIE_ISOLE' ? startsAt : owner.startsAt,
    endsAt: type === 'JOUR_FERIE_ISOLE' ? endsAt : owner.endsAt,
    assignments: compactAssignments(assignments),
    ownerId: owner.id
  }));
  const replacements = new Map(cta.map((row) => [row.id, row]));
  return { rows: source.map((row) => replacements.get(row.id) || row), holidayEvidence: evidence };
}

module.exports = {
  ANCHOR_DATE,
  G1_CYCLE,
  OTHER_CYCLE,
  addDays,
  applyCtaRules,
  assignmentsForFriday,
  compactAssignments,
  vaudHolidays
};
