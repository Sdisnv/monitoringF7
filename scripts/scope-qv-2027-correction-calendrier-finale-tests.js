'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');
const { _calendar } = require('../netlify/lib/_scope-quo-vadis-service');
const { createFixture } = require('./scope-qv-local-fixture');
const { buildExtraction, calendarConstraint, calendarVerdict } = require('./scope-qv-2027-no-go-final-extraction');
const baseline = require('../outputs/qv-2027-final/SCOPE_QV_2027_CONTROLE_MOA_PAR_OI.json');
const decisions = require('../netlify/lib/data/scope-qv-2027-calendar-arbitrages.json');

async function main() {
  const qv = await createFixture(null).service.listProgramme(2027);
  const rows = qv.canonicalProgramme.rows.filter((row) => !row.external);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const initial70 = baseline.reviews.filter((row) => row.Groupe === 'AUTRE_EXCEPTION');
  const initial12 = baseline.reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE');
  const after = await buildExtraction();
  const reviewIds = new Set(after.reviews.filter((row) => row.Groupe === 'AUTRE_EXCEPTION').map((row) => row.Occurrence));
  const local15 = after.reviews.filter((row) => row.Groupe === 'INSTRUCTION_LOCALE');
  const localIds = new Set(local15.map((row) => row.Occurrence));
  const expanded = L.qvExpandCalendarDays(qv.calendarDays);
  const holidays = new Set(qv.calendarDays.filter((row) => row.typeJour === 'FERIE').map((row) => row.jour));
  const bridges = new Set(qv.calendarDays.filter((row) => row.typeJour === 'NEUTRALISATION_INTERNE').map((row) => row.jour));
  const blocking = (row) => calendarConstraint(row.startsAt, expanded, holidays, bridges)
    .filter((flag) => flag !== 'VACANCES_SCOLAIRES');

  assert.equal(initial70.length, 70);
  assert.equal(initial12.length, 12);
  assert.equal(rows.length, 850);
  assert.equal(rows.filter((row) => !row.startsAt).length, 0);
  assert.equal(decisions.moves.length, 19);
  assert.equal(decisions.humanReview.length, 0);
  assert.deepEqual(decisions.excludedNonRecurring.map((item) => item.definitionId),
    ['QV26-TOUR-DE-FRANCE-FEMMES-26-4BF12176']);
  const results = initial70.map((before) => {
    const row = byId.get(before.Occurrence);
    if (decisions.excludedNonRecurring.some((item) => before.Occurrence.startsWith(`${item.definitionId}:`))) {
      assert.equal(row, undefined);
      assert.ok(!reviewIds.has(before.Occurrence));
      return 'EXCLU_NON_RECURRENT';
    }
    assert.ok(row, `Occurrence disparue : ${before.Occurrence}`);
    const date = row.startsAt.slice(0, 10);
    if (before.Conflit === 'VACANCES_SCOLAIRES') {
      assert.equal(date, before.Date);
      assert.deepEqual(blocking(row), []);
      return 'CONFORME_VACANCES';
    }
    if (date !== before.Date) {
      assert.equal(row.calendarAdjustment?.rule, 'MOA_CALENDAR_FINAL_2027');
      assert.deepEqual(blocking(row), []);
      assert.equal(row.calendarAdjustment.theoreticalDate, before.Date);
      return 'REPOSITIONNE';
    }
    assert.ok(localIds.has(row.id), `Contrôle local absent : ${row.id}`);
    assert.equal(row.review, false);
    assert.equal(row.calendarReview, undefined);
    return 'CONTROLE_MANUEL_LOCAL';
  });
  assert.deepEqual(['CONFORME_VACANCES', 'REPOSITIONNE', 'CONTROLE_MANUEL_LOCAL', 'EXCLU_NON_RECURRENT']
    .map((key) => results.filter((item) => item === key).length), [47, 19, 3, 1]);
  assert.equal(reviewIds.size, 0);
  assert.equal(local15.length, 15);
  assert.ok(initial12.every((row) => localIds.has(row.Occurrence)));
  for (const before of initial12) {
    const row = byId.get(before.Occurrence);
    assert.equal(row.startsAt.slice(0, 10), before.Date);
    assert.ok(!row.calendarAdjustment || row.calendarAdjustment.rule !== 'MOA_CALENDAR_FINAL_2027');
  }
  assert.equal(after.reviews.length, 15);
  assert.equal(after.counts.instructionLocalReview, 12);
  assert.equal(after.counts.localManualReview, 15);
  assert.equal(after.counts.blockingHumanReview, 0);
  assert.equal(after.counts.old70Breakdown.localReview, 3);
  assert.equal(after.counts.old70Breakdown.humanReview, 0);
  assert.equal(after.counts.conduitesDps, 56);
  assert.equal(after.counts.conduitesDap, 16);
  assert.equal(after.counts.ctaAfter, 0);
  assert.equal(rows.filter((row) => row.label === 'Groupe de travail FOCA').length, 0);
  assert.deepEqual(rows.filter((row) => /^Formation groupée 1\.[1-6]$/.test(row.label)).map((row) => row.label),
    ['Formation groupée 1.1', 'Formation groupée 1.2', 'Formation groupée 1.3',
      'Formation groupée 1.4', 'Formation groupée 1.5', 'Formation groupée 1.6']);
  assert.equal(rows.find((row) => row.label === 'Souper annuel' && row.ois.includes('B2')).statCom, '070F1');
  assert.equal(after.counts.oiAssociations, 1239);
  assert.equal(rows.filter((row) => row.definitionId === decisions.excludedNonRecurring[0].definitionId).length, 0);

  const drives = rows.filter((row) => row.label === L.QV_CONDUITE_LABEL && row.statCom === '0152F7');
  assert.equal(drives.length, 56);
  for (const drive of drives) {
    const source = byId.get(drive.conduiteEvidence?.sourceId);
    assert.ok(source, `Instruction absente : ${drive.id}`);
    assert.equal(L.qvDpsInstructionKind(source), 'demi-section');
    assert.deepEqual(drive.ois, source.ois);
    assert.ok(source.publics.includes(drive.conduiteEvidence.halfSection));
    assert.equal(drive.startsAt, source.endsAt);
    assert.equal(drive.endsAt.slice(0, 10), drive.startsAt.slice(0, 10));
    assert.equal(Number(drive.endsAt.slice(11, 13)) * 60 + Number(drive.endsAt.slice(14))
      - Number(drive.startsAt.slice(11, 13)) * 60 - Number(drive.startsAt.slice(14)), 60);
  }
  for (const site of ['B1', 'B2', 'C1']) {
    const first = byId.get(`QV27:CONDUITE:${site}:N02a:2027-02-20:1030`);
    const second = byId.get(`QV27:CONDUITE:${site}:N02a:2027-09-18:1030`);
    assert.ok(first && second);
    assert.notEqual(first.conduiteEvidence.sourceId, second.conduiteEvidence.sourceId);
    assert.equal(byId.get(first.conduiteEvidence.sourceId).label, 'Instr demi-sct - KICK-OFF');
    assert.equal(byId.get(second.conduiteEvidence.sourceId).label, 'Instr demi-sct - FEU');
    assert.ok(initial12.some((item) => item.Occurrence === second.conduiteEvidence.sourceId));
    assert.ok(localIds.has(second.id));
    assert.equal(second.review, false);
    assert.equal(second.calendarReview, undefined);
    assert.equal(second.startsAt, '2027-09-18T10:30');
  }
  for (const item of decisions.moves.filter((move) => move.sourceId)) {
    const drive = byId.get(item.id);
    assert.equal(drive.conduiteEvidence.sourceId, item.sourceId);
    assert.equal(drive.startsAt.slice(11), '10:30');
  }
  for (const item of decisions.moves.filter((move) => move.id.startsWith('QV27:DAPCOND:'))) {
    const drive = byId.get(item.id);
    assert.ok(drive.conduiteSlots.every((slot) => Object.entries(slot).every(([key, value]) =>
      typeof value !== 'string' || !value.includes('T') || value.startsWith(item.to))));
  }

  const vacation = qv.calendarDays.find((row) => row.jour === '2027-04-02' && row.typeJour === 'VACANCES_SCOLAIRES')
    || cta.vaudSchoolVacations(2027).find((row) => row.jour <= '2027-04-02' && row.metadata.dateFin >= '2027-04-02');
  assert.ok(vacation);
  assert.equal(_calendar.isBlockingCalendarRow(vacation), false);
  assert.notEqual(_calendar.classifyDate('2027-04-02', 'DPS', qv.calendarDays).dayClass, 'INTERDIT');
  const ordinary = (date) => ({ id: `TEST:${date}`, definitionId: 'TEST', label: 'Formation test',
    startsAt: `${date}T19:00`, endsAt: `${date}T21:00` });
  const verdictFor = (date) => calendarVerdict(ordinary(date),
    calendarConstraint(`${date}T19:00`, expanded, holidays, bridges), new Map());
  assert.equal(verdictFor('2027-04-02').decision, 'CONFORME_PAR_REGLE');
  assert.equal(verdictFor('2027-03-26').decision, 'HUMAN_REVIEW_REEL');
  assert.equal(verdictFor('2027-07-31').decision, 'HUMAN_REVIEW_REEL');
  assert.equal(verdictFor('2027-03-27').decision, 'HUMAN_REVIEW_REEL');
  assert.deepEqual(calendarConstraint('2027-07-31T19:00', expanded, holidays, bridges),
    ['WEEKEND_FERIE', 'VEILLE_FERIE', 'VACANCES_SCOLAIRES']);
  for (const date of ['2027-03-26', '2027-03-25', '2027-03-27'])
    assert.equal(_calendar.classifyDate(date, 'DPS', qv.calendarDays).dayClass, 'INTERDIT', date);
  assert.equal(_calendar.classifyDate('2027-05-15', 'DPS', qv.calendarDays).dayClass, 'INTERDIT');
  const monday = rows.find((row) => row.calendarAdjustment?.rule === 'G1_LUNDI_FERIE_DEPLACE_MARDI');
  assert.equal(monday.startsAt.slice(0, 10), '2027-03-30');

  const migration = fs.readFileSync(path.resolve(__dirname,
    '../database/migrations/20261005_scope_qv_2027_ascension_vacation_correction_1.sql'), 'utf8');
  assert.ok(migration.includes('begin;') && migration.includes('commit;'));
  assert.ok(migration.includes('2027-05-06') && migration.includes('2027-05-09'));
  assert.ok(!/\bdelete\b|\btruncate\b/i.test(migration));
  console.log('PASS QV calendrier final : 47 conformes, 19 repositionnés, 0 bloquant, 15 contrôles locaux, 1 exclu, invariants et migration');
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
