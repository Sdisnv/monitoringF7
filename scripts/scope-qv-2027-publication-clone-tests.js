'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { run } = require('./scope-qv-annual-report-clone-proof');
const { run: runReadOnly } = require('./scope-qv-2027-publication-clone');

test('C23 current candidate: clone publication dry-run retains the wider reconciliation proofs', async () => {
  const result = await runReadOnly();
  assert.equal(result.mode,'DRY_RUN');
  assert.deepEqual(result.plan,{ CREATE:0,UPDATE:1,UNCHANGED:124,BLOCKED:725,NOT_PUBLISHED:0 });
  assert.equal(result.preparations,850);
  assert.equal(result.waiting,725);
  assert.equal(result.localDecisions,15);
  assert.equal(result.verification.reconciliation.status,'MISMATCH');
  assert.equal(result.verification.reconciliation.summary.MATCHED,124);
  assert.equal(result.verification.reconciliation.summary.DRIFT,1);
  assert.equal(result.verification.proof.published,125);
  assert.equal(result.verification.proof.foba,4);
  assert.equal(result.verification.proof.roomLocationMismatch,0);
  assert.equal(result.verification.proof.missingEventCodes,0);
  assert.equal(result.verification.proof.completedHistoricalCodes,33);
});

test('C23 clone: Rapport annuel updates the same event and rolls back without collateral changes', async () => {
  const result = await run();
  assert.deepEqual(result.plan,{ CREATE:0,UPDATE:1,UNCHANGED:124,BLOCKED:725,NOT_PUBLISHED:0 });
  assert.equal(result.preparations.total,850);
  assert.equal(result.preparations.waiting,725);
  assert.equal(result.preparations.localDecisions,15);
  assert.equal(result.caseId,'qv-source-923');
  assert.equal(result.before.eventId,result.simulated.eventId);
  assert.equal(result.afterRollback.eventId,result.before.eventId);
  assert.equal(result.simulated.publishedEvents,125);
  assert.equal(result.afterRollback.date,'2027-03-04');
  assert.equal(result.protectedTablesUnchanged,true);
  assert.equal(result.otherEventsUnchanged,true);
  assert.equal(result.transaction,'ROLLBACK');
});
