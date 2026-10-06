'use strict';

const G1_CYCLE = Object.freeze(['N04b', 'N03b', 'N02b', 'N01b', 'N05a', 'N04a', 'N03a', 'N02a', 'N01a', 'N05b']);
const OTHER_CYCLE = Object.freeze(['N03b', 'N02b', 'N01b', 'N03a', 'N02a', 'N01a']);
const ANCHOR_DATE = '2026-02-13';
const DAY_MS = 86400000;
const CONDUITE_PER_HALF = 2;
const DPS_SITES = Object.freeze(['G1', 'C1', 'B1', 'B2']);

function operationalHalfSections(oi) {
  const site = String(oi || '').replace(/^(DPS|DAP|JSP):/, '').toUpperCase();
  if (site === 'G1') return [...G1_CYCLE];
  if (site === 'C1' || site === 'B1' || site === 'B2') return [...OTHER_CYCLE];
  return [];
}

function isReserveHalfSection(oi, code) {
  const site = String(oi || '').replace(/^(DPS|DAP|JSP):/, '').toUpperCase();
  const half = String(code || '');
  if (site === 'G1') return /^N06/.test(half);
  if (site === 'C1' || site === 'B1' || site === 'B2') return /^N04/.test(half);
  return false;
}

function expectedAnnualConduites() {
  return DPS_SITES.reduce((count, site) => count + operationalHalfSections(site).length * CONDUITE_PER_HALF, 0);
}

function conduiteEngineOptions() {
  return { ctaResolver: instructionPublicForDate, operationalHalvesForOi: operationalHalfSections };
}

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
  if (dateKey(date) < ANCHOR_DATE) return [];
  const index = cycleIndex(date);
  const g1 = atCycle(G1_CYCLE, index + G1_CYCLE.indexOf('N05a'));
  const other = atCycle(OTHER_CYCLE, index + OTHER_CYCLE.indexOf('N01a'));
  return [
    { oi: 'G1', section: g1.slice(0, 3), halfSection: g1 },
    ...['C1', 'B1', 'B2'].map((oi) => ({ oi, section: other.slice(0, 3), halfSection: other }))
  ];
}

function instructionPublicForDate(date, oi, kind, pionnierException = false) {
  const weekday = utcDate(date).getUTCDay();
  const friday = addDays(date, -((weekday + 2) % 7));
  const referenceFriday = pionnierException && kind === 'section' && oi === 'G1' ? addDays(friday, -7) : friday;
  const assignment = assignmentsForFriday(referenceFriday).find(row => row.oi === oi);
  return assignment ? (kind === 'demi-section' ? assignment.halfSection : assignment.section) : null;
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

// Verified annual periods, not offsets from the 2027 school calendar.
const SCHOOL_CALENDAR_SOURCE = 'https://www.vd.ch/formation/jours-feries-et-vacances-scolaires';
const SCHOOL_PERIODS = {
  2026: [['2025-12-20', '2026-01-04', 'hiver'], ['2026-02-14', '2026-02-22', 'sport'], ['2026-04-03', '2026-04-19', 'printemps'], ['2026-05-14', '2026-05-17', 'Ascension'], ['2026-06-27', '2026-08-16', 'ete'], ['2026-10-10', '2026-10-25', 'automne'], ['2026-12-24', '2027-01-10', 'hiver']],
  2027: [['2026-12-24', '2027-01-10', 'hiver'], ['2027-02-06', '2027-02-14', 'sport'], ['2027-03-26', '2027-04-11', 'printemps'], ['2027-05-06', '2027-05-09', 'Ascension'], ['2027-07-03', '2027-08-22', 'ete'], ['2027-10-09', '2027-10-24', 'automne'], ['2027-12-24', '2028-01-09', 'hiver']],
  2028: [['2027-12-24', '2028-01-09', 'hiver'], ['2028-02-12', '2028-02-20', 'sport'], ['2028-04-14', '2028-04-30', 'printemps'], ['2028-05-25', '2028-05-28', 'Ascension'], ['2028-07-01', '2028-08-20', 'ete'], ['2028-10-14', '2028-10-29', 'automne'], ['2028-12-23', '2029-01-07', 'hiver']]
};

function vaudSchoolVacations(year) {
  return (SCHOOL_PERIODS[year] || []).map(([start, end, name]) => ({ jour: start, typeJour: 'VACANCES_SCOLAIRES',
    libelle: `Vacances scolaires vaudoises - ${name}`, source: SCHOOL_CALENDAR_SOURCE,
    metadata: { dateFin: end, sourceUrl: `${SCHOOL_CALENDAR_SOURCE}/jours-feries-et-vacances-scolaires-${year}` } }));
}

function compactAssignments(assignments) {
  const g1 = assignments.find((row) => row.oi === 'G1');
  const others = assignments.filter((row) => ['C1', 'B1', 'B2'].includes(row.oi));
  const shared = others.length === 3 && others.every((row) => row.halfSection === others[0].halfSection);
  return `G1 ${g1.halfSection} ; ${shared ? 'C1/B1/B2 ' + others[0].halfSection : others.map((row) => `${row.oi} ${row.halfSection}`).join(' ; ')}`;
}

function applyCtaRules(rows, year = 2027, holidays = vaudHolidays(year)) {
  const fridayOf = row => String(row.id || '').match(/CTA-PERM-(\d{4}-\d{2}-\d{2})$/)?.[1] || dateKey(row.startsAt);
  const source = (rows || []).filter(row => row.definitionId !== 'CTA-PERMANENCE'
    || (!row.ctaHolidayOnly && fridayOf(row) >= ANCHOR_DATE)).map((row) => ({ ...row }));
  const cta = source.filter((row) => row.definitionId === 'CTA-PERMANENCE')
    .sort((a, b) => fridayOf(a).localeCompare(fridayOf(b)));
  if (!cta.length) return { rows: source, holidayEvidence: [] };
  for (const row of cta) {
    const scheduledFriday = fridayOf(row);
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
  const intervals = cta.map((row) => ({ start: row.startsAt, end: row.endsAt, row }));
  for (const holiday of holidays) {
    if (holiday.date < ANCHOR_DATE) continue;
    intervals.push({ start: `${addDays(holiday.date, -1)}T18:00`,
      end: `${addDays(holiday.date, 1)}T06:00`, holiday });
  }
  intervals.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const groups = [];
  for (const interval of intervals) {
    const group = groups[groups.length - 1];
    if (group && interval.start <= group.end) {
      group.end = group.end > interval.end ? group.end : interval.end;
      group.intervals.push(interval);
    } else groups.push({ start: interval.start, end: interval.end, intervals: [interval] });
  }
  const replacements = new Map();
  const omitted = new Set();
  const added = [];
  const evidence = [];
  for (const group of groups) {
    const standards = group.intervals.filter((interval) => interval.row).map((interval) => interval.row);
    const holidayIntervals = group.intervals.filter((interval) => interval.holiday);
    if (!standards.length && year !== 2027) {
      const prior = cta.filter((row) => row.startsAt < group.start).at(-1);
      if (prior) for (const interval of holidayIntervals) evidence.push({
        ...interval.holiday, type: 'JOUR_FERIE_ISOLE',
        holidayStartsAt: interval.start, holidayEndsAt: interval.end,
        startsAt: interval.start, endsAt: interval.end,
        assignments: compactAssignments(prior.ctaAssignments),
        ctaAssignments: prior.ctaAssignments, ownerId: prior.id
      });
      continue;
    }
    let owner = standards[0];
    if (!owner) {
      const firstHoliday = holidayIntervals[0].holiday.date;
      const weekday = utcDate(firstHoliday).getUTCDay();
      const referenceFriday = addDays(firstHoliday, -((weekday + 2) % 7));
      const assignments = assignmentsForFriday(referenceFriday)
        .map((assignment) => ({ ...assignment, provenance: 'MOA_CTA_CONTINUOUS_HALF_SECTION_CYCLE' }));
      owner = { id: `CTA-PERM-FERIE-${firstHoliday}`, definitionId: 'CTA-PERMANENCE',
        occurrenceId: `CTA-PERM-FERIE-${firstHoliday}:O1`, sessionId: `CTA-PERM-FERIE-${firstHoliday}:S1`,
        label: 'Permanence', eventLabel: 'Permanence', status: 'CALCULE', kind: 'RECURRENCE',
        domain: 'DPS', family: 'Permanence', ois: [...DPS_SITES], publics: [], external: false,
        ctaHolidayOnly: true, ctaReferenceFriday: referenceFriday, ctaAssignments: assignments,
        ctaPublicStatus: 'HALF_SECTION_ROTATION_MOA_DEMONSTRATED' };
      added.push(owner);
    }
    owner.startsAt = group.start;
    owner.endsAt = group.end;
    owner.ctaHolidayWindows = holidayIntervals.map((interval) => ({
      startsAt: interval.start, endsAt: interval.end,
      holidayDate: interval.holiday.date, holidayLabel: interval.holiday.label,
      assignments: owner.ctaAssignments
    }));
    for (const row of standards) {
      if (row !== owner) omitted.add(row.id);
      replacements.set(row.id, owner);
    }
    for (const interval of holidayIntervals) evidence.push({
      ...interval.holiday, type: standards.length ? 'FUSION_WEEK_END' : 'JOUR_FERIE_ISOLE',
      holidayStartsAt: interval.start, holidayEndsAt: interval.end,
      startsAt: group.start, endsAt: group.end,
      assignments: compactAssignments(owner.ctaAssignments),
      ctaAssignments: owner.ctaAssignments, ownerId: owner.id
    });
  }
  const resultRows = source.filter((row) => !omitted.has(row.id))
    .map((row) => replacements.get(row.id) || row);
  for (const holidayRow of added) {
    const next = resultRows.findIndex((row) => row.definitionId === 'CTA-PERMANENCE' && row.startsAt > holidayRow.startsAt);
    resultRows.splice(next < 0 ? resultRows.length : next, 0, holidayRow);
  }
  return { rows: resultRows, holidayEvidence: evidence };
}

function generateYear(year, template = {}) {
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  let friday = addDays(first, -((utcDate(first).getUTCDay() + 2) % 7));
  const rows = [];
  while (friday <= addDays(last, 7)) {
    rows.push({ domain: template.domain || 'DPS', family: template.family || 'Permanence', ois: ['G1', 'C1', 'B1', 'B2'],
      status: 'CALCULE', kind: 'RECURRENCE', id: `CTA-PERM-${friday}`, definitionId: 'CTA-PERMANENCE',
      startsAt: `${friday}T18:00`, endsAt: `${addDays(friday, 3)}T06:00`,
      label: 'Permanence', eventDisplayLabel: 'Permanence', external: false });
    friday = addDays(friday, 7);
  }
  const result = applyCtaRules(rows, year, vaudHolidays(year).concat(vaudHolidays(year + 1).filter(holiday => holiday.date <= `${year + 1}-01-02`)));
  return { ...result, rows: result.rows.filter(row => dateKey(row.startsAt) <= last && dateKey(row.endsAt) >= first),
    holidayEvidence: result.holidayEvidence.filter(holiday => holiday.date.startsWith(`${year}-`)) };
}

module.exports = {
  ANCHOR_DATE,
  G1_CYCLE,
  OTHER_CYCLE,
  CONDUITE_PER_HALF,
  DPS_SITES,
  addDays,
  applyCtaRules,
  assignmentsForFriday,
  compactAssignments,
  conduiteEngineOptions,
  expectedAnnualConduites,
  generateYear,
  instructionPublicForDate,
  isReserveHalfSection,
  operationalHalfSections,
  vaudHolidays,
  vaudSchoolVacations
};
