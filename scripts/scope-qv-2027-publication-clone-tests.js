'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { run } = require('./scope-qv-2027-publication-clone');

test('C23 current candidate: clone publication is exact and read-only replay is idempotent', async () => {
  const result = await run();
  assert.equal(result.mode,'DRY_RUN');
  assert.deepEqual(result.plan,{ CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 });
  assert.equal(result.preparations,850);
  assert.equal(result.waiting,725);
  assert.equal(result.localDecisions,15);
  assert.equal(result.verification.reconciliation.status,'MATCH');
  assert.equal(result.verification.reconciliation.summary.MATCHED,125);
  assert.equal(result.verification.proof.published,125);
  assert.equal(result.verification.proof.foba,4);
  assert.equal(result.verification.proof.roomLocationMismatch,0);
  assert.equal(result.verification.proof.missingEventCodes,0);
  assert.equal(result.verification.proof.completedHistoricalCodes,33);
});
