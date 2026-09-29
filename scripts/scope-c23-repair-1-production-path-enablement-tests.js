'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { run } = require('./scope-c23-repair-1-production-path-enablement');

const ROOT = path.resolve(__dirname, '..');

async function main(){
  const migration = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c23_repair_1.sql'), 'utf8');
  const rollback = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c23_repair_1_rollback.sql'), 'utf8');
  const executor = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-qv-publication-executor.js'), 'utf8');
  const store = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-qv-publication-postgres-store.js'), 'utf8');
  const checks = [];
  const check = (name, task) => { task(); checks.push(name); console.log(`PASS ${String(checks.length).padStart(2, '0')} ${name}`); };

  check('persistent migration commits', () => assert.match(migration, /commit;\s*$/));
  check('migration stops on SQL errors', () => assert.match(migration, /\\set ON_ERROR_STOP on/));
  check('migration records one version marker', () => assert.match(migration, /scope-qv-publication-c23-repair-1/));
  check('migration keeps raw canonical publics', () => assert.match(migration, /scope_evenement_publics_qv/));
  check('migration keeps raw canonical targets', () => assert.match(migration, /scope_evenement_cibles_qv/));
  check('rollback refuses published provenance', () => assert.match(rollback, /ROLLBACK_REFUSED/));
  check('production execution remains disabled by default', () => assert.match(executor, /SCOPE_QV_PRODUCTION_EXECUTION_ENABLED/));
  check('production approval binds the exact plan', () => assert.match(executor, /authorization\.planFingerprint/));
  check('store requires exact target identity', () => assert.match(store, /QV_POSTGRES_PRODUCTION_TARGET_REFUSED/));
  check('store uses PostgreSQL transactions', () => { assert.match(store, /begin read only/); assert.match(store, /rollback/); assert.match(store, /commit/); });
  check('store never logs a connection string', () => assert.doesNotMatch(store, /console\.(log|error).*connection/i));

  const report = await run();
  check('clone recipe passes', () => assert.strictEqual(report.verdict, 'PASS'));
  check('C22 lifecycle is unchanged', () => assert.deepStrictEqual(report.lifecycle, { total:635, ready:118, humanReview:19, blocked:485, notPublished:13 }));
  check('first pass creates 118', () => assert.strictEqual(report.firstPass.created, 118));
  check('second pass is 118 unchanged', () => assert.strictEqual(report.secondPass.unchanged, 118));
  check('UUID identities remain stable', () => assert.strictEqual(report.uuidStable, true));
  check('intermediate failure rolls back', () => assert.strictEqual(report.rollback.injectedFailure, 'ROLLED_BACK'));
  check('retry succeeds once', () => assert.strictEqual(report.rollback.retryUpdated, 1));
  check('final reconciliation matches 118', () => assert.strictEqual(report.reconciliation.MATCHED, 118));
  check('three existing 2027 events are preserved', () => assert.strictEqual(report.existingEventsPreserved, 3));
  check('publication keys stay unique', () => assert.strictEqual(report.duplicatePublicationKeys, 0));
  check('CTA keeps 53 sixty-hour events', () => assert.strictEqual(report.cta60Hours, 53));
  check('Stat.Com remains 87 plus four', () => assert.deepStrictEqual(report.statCom, { pdf:87, extensions:4 }));
  check('FOBA 070F1.005 stays one activity and four events', () => assert.deepStrictEqual(report.foba070F1005, { materializations:4, activities:1 }));
  check('undated sessions remain blocked', () => assert.strictEqual(report.undatedSessionsBlocked, 12));
  check('all production guards are proven', () => assert(Object.values(report.guards).every((value) => value === 'PASS')));
  console.log(`\n${checks.length}/${checks.length} C23-REPAIR-1 checks PASS`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
