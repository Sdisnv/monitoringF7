'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const { buildExtraction, calendarConstraint } = require('./scope-qv-2027-no-go-final-extraction');

const root = path.resolve(__dirname, '..');
const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const expectedLines = [309, 347, 350, 389, 421, 433];
const expectedDates = ['2027-05-12', '2027-05-21', '2027-05-26', '2027-06-04', '2027-06-08', '2027-06-15'];

async function main() {
  const source = readWorkbook(workbookPath);
  const byLine = new Map(source.rows.map((row) => [row.sourceLine, row]));
  const programme = await createFixture(null).service.listProgramme(2027);
  const rows = programme.canonicalProgramme.rows.filter((row) => !row.external);
  const modules = rows.filter((row) => /^Formation groupée 1\.[1-6]$/.test(row.label))
    .sort((a, b) => a.label.localeCompare(b.label));
  const calendar = programme.calendarDays;
  const expanded = L.qvExpandCalendarDays(calendar);
  const holidays = new Set(calendar.filter((row) => row.typeJour === 'FERIE').map((row) => row.jour));
  const bridges = new Set(calendar.filter((row) => row.typeJour === 'NEUTRALISATION_INTERNE').map((row) => row.jour));

  assert.equal(rows.length, 850);
  assert.equal(rows.filter((row) => !row.startsAt).length, 0);
  assert.equal(rows.filter((row) => row.label === 'Groupe de travail FOCA').length, 0);
  assert.equal(modules.length, 6);
  assert.deepEqual(modules.map((row) => row.label), expectedLines.map((_, index) => `Formation groupée 1.${index + 1}`));
  assert.deepEqual(modules.map((row) => row.startsAt.slice(0, 10)), expectedDates);
  assert.equal(new Set(modules.map((row) => row.occurrenceId)).size, 6);
  assert.equal(new Set(modules.map((row) => row.sessionId)).size, 6);
  const weekly = new Map();
  for (let index = 0; index < modules.length; index++) {
    const row = modules[index];
    const historical = byLine.get(expectedLines[index]);
    assert.equal(historical.title.split(' | ')[0], row.label);
    assert.equal(historical.statCom, '0162F7');
    assert.equal(row.business.sourceLine, expectedLines[index]);
    assert.equal(row.business.sourcePersonnel, 'DPS | OFSI | FOBA 2 | FOBA 3');
    assert.equal(row.statCom, '0162F7');
    assert.equal(L.qvProgrammeFunctionalDomain(row), 'F7');
    assert.deepEqual(row.ois, ['B1', 'B2', 'C1', 'G1']);
    assert.deepEqual(row.publics, ['FOSPEC:3', 'FOBA:2', 'FOBA:3']);
    assert.equal(row.startsAt.slice(11), '18:30');
    assert.equal(row.endsAt.slice(11), '22:00');
    assert.equal(row.business.location, 'Caserne G1');
    assert.equal(row.responsible, 'C for');
    assert.equal(row.sessionCount, 1);
    assert.equal(calendarConstraint(row.startsAt, expanded, holidays, bridges).length, 0);
    assert.ok(!rows.some((other) => other.id !== row.id && other.definitionId !== 'CTA-PERMANENCE'
      && other.location === 'Caserne G1' && other.startsAt < row.endsAt && other.endsAt > row.startsAt),
    `Caserne G1 occupée : ${row.startsAt}`);
    const date = new Date(`${row.startsAt.slice(0, 10)}T12:00:00Z`);
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const key = weekStart.toISOString().slice(0, 10);
    weekly.set(key, (weekly.get(key) || 0) + 1);
  }
  assert.equal(weekly.size, 6);
  assert.ok([...weekly.values()].every((count) => count >= 1 && count <= 2));

  const suppers = rows.filter((row) => row.label === 'Souper annuel');
  assert.equal(byLine.get(832).statCom, '070F1');
  assert.equal(byLine.get(844).statCom, '');
  assert.deepEqual(suppers.map((row) => row.ois[0]), ['G1', 'B2']);
  assert.ok(suppers.every((row) => row.statCom === '070F1'));
  assert.equal(suppers.find((row) => row.ois.includes('B2')).historicalProposal.sourceLine, 844);

  const ascension = cta.vaudSchoolVacations(2027).find((row) => row.jour === '2027-05-06');
  assert.equal(ascension.typeJour, 'VACANCES_SCOLAIRES');
  assert.equal(ascension.metadata.dateFin, '2027-05-09');
  assert.equal(ascension.libelle, 'Vacances scolaires vaudoises - Ascension');
  const migration = fs.readFileSync(path.join(root,
    'database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql'), 'utf8');
  for (const value of ["date '2027-05-06'", '2027-05-09', ascension.libelle,
    'CALENDAR_VD_FINAL_3', "'VACANCES_SCOLAIRES'", 'begin;', 'commit;']) assert.ok(migration.includes(value), value);
  assert.ok(!/\bdelete\b|\btruncate\b/i.test(migration));

  const extraction = await buildExtraction();
  assert.equal(extraction.reviews.filter((row) => row.Groupe === 'AUTRE_EXCEPTION').length, 0);
  assert.equal(extraction.reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE').length, 15);
  assert.equal(extraction.counts.instructionLocalReview, 12);
  assert.equal(extraction.counts.conduitesDps, 56);
  assert.equal(extraction.counts.conduitesDap, 16);
  assert.equal(extraction.counts.ctaAfter, 0);
  assert.equal(extraction.counts.multiOiPhysical, 178);
  assert.equal(extraction.counts.oiAssociations, 1236);
  const xlsx = path.join(root, 'outputs/qv-2027-final/SCOPE_QV_2027_70_CONFLITS_CALENDRIER.xlsx');
  assert.ok(fs.existsSync(xlsx) && fs.statSync(xlsx).size > 10000);
  console.log('PASS QV correction ciblée 1: Souper, 6 modules, 70 cas initiaux, 0 bloquant, 15 locaux, 1 exclu, invariants');
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
