'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildStaticControl, DRIVE_IDS } = require('./scope-qv-2027-sql-materialisation-repair-1');

async function run(){
  const first = await buildStaticControl();
  const second = await buildStaticControl();
  assert.deepEqual(second, first, 'the static control must be deterministic');
  const saved = JSON.parse(fs.readFileSync(path.resolve(__dirname,
    '../outputs/qv-2027-sql-materialisation-repair-1/static-control.json'), 'utf8'));
  assert.deepEqual(saved, first, 'the reviewed artifact must match the current candidate');
  assert.equal(first.metrics.inbound, 850);
  assert.equal(first.metrics.classified, 850);
  assert.equal(first.metrics.localDecisions, 15);
  assert.equal(first.metrics.localInstructions, 12);
  assert.equal(first.metrics.localDrives, 3);
  assert.equal(first.metrics.tourDeFrance, 0);
  assert.equal(first.metrics.duplicatePublicationKeys, 0);
  assert.equal(first.metrics.undated, 0);
  assert.equal(first.metrics.transformationErrors, 0);
  assert.equal(first.metrics.blockingCalendarReview, 0);
  assert.equal(first.records.length, 850);
  assert.equal(Object.values(first.metrics.theoreticalEmptyTargetActions).reduce((a, b) => a + b, 0), 850);
  assert(DRIVE_IDS.every((id) => first.records.some((row) => row.id === id && row.localDecision
    && row.linkedInstructionId && row.theoreticalEmptyTargetAction === 'BLOCKED')));
  assert(first.records.every((row) => row.sqlPublicationKey && row.model && row.domain));
  assert(first.records.some((row) => row.domain === 'F3' && row.sqlDomain === 'INSTITUTIONNEL'));
  assert(first.records.every((row) => !row.oiCodes.includes('SDIS')));
  assert(first.records.filter((row) => row.room === 'R-G1-EM').every((row) =>
    row.roomCode === 'R-G1-ETAT-MAJOR'));
  assert(!first.source.candidate.includes('SCOPE_C19'));
  console.log('QV 2027 SQL materialisation static control: PASS');
}

run().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
