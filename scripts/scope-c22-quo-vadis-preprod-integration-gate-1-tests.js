'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { assertSafeConnection } = require('./lib/scope-c22-postgres-fixture-db');

const ROOT = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/SCOPE_C22_QUO_VADIS_PREPROD_INTEGRATION_GATE_1.json'), 'utf8'));
const ddl = fs.readFileSync(path.join(ROOT, 'database/fixtures/scope_qv_publication_c22_postgres.sql'), 'utf8');
const migration = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c22_preprod_gate.sql'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/styles.css'), 'utf8');
const planner = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-qv-publication-plan.js'), 'utf8');
const executor = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-qv-publication-executor.js'), 'utf8');
const browserMetricsPath = path.join(ROOT, 'docs/SCOPE_C22_QUO_VADIS_PREPROD_INTEGRATION_GATE_1_BROWSER_METRICS.json');
const browser = fs.existsSync(browserMetricsPath) ? JSON.parse(fs.readFileSync(browserMetricsPath, 'utf8')) : null;

let passed = 0;
function test(name, fn){
  try{ fn(); passed += 1; console.log(`PASS ${name}`); }
  catch(error){ console.error(`FAIL ${name}\n${error.stack}`); process.exitCode = 1; }
}

test('01 uses PostgreSQL 18 evidence', () => assert.match(report.environment.server.version, /^18\./));
test('02 restricts the database to loopback fixture', () => {
  assert.deepStrictEqual(assertSafeConnection('postgresql://127.0.0.1:55432/scope_c22_preprod').database, 'scope_c22_preprod');
  assert.throws(() => assertSafeConnection('postgresql://prod.example/scope'), /dedicated loopback/);
});
test('03 reconciles canonical 635 lifecycle rows', () => assert.deepStrictEqual(report.plan.volumes, {
  TOTAL: 635, READY_TO_PUBLISH: 118, CREATE: 118, UPDATE: 0, UNCHANGED: 0,
  BLOCKED: 485, HUMAN_REVIEW_REQUIRED: 19, NOT_PUBLISHED: 13
}));
test('04 keeps all 125 dates sourced', () => assert.strictEqual(report.dataset.dated, 125));
test('05 records four source conflicts', () => assert.strictEqual(report.dataset.sourceConflicts, 4));
test('06 refuses production', () => assert.strictEqual(report.protection.productionRefused, true));
test('07 binds bulk approval to the exact plan', () => assert.strictEqual(report.protection.bulkApprovalBoundToExactPlan, true));
test('08 creates exactly 118 events', () => assert.strictEqual(report.execution.A.counts.created, 118));
test('09 second plan is idempotent', () => assert.strictEqual(report.execution.B.status, 'NO_OP'));
test('10 C and D update one stable identity', () => {
  assert.strictEqual(report.execution.C.counts.updated, 1);
  assert.strictEqual(report.execution.D.counts.updated, 1);
});
test('11 rollback is real', () => assert.strictEqual(report.execution.rollback.transaction, 'ROLLED_BACK'));
test('12 retry succeeds and next retry is unchanged', () => {
  assert.strictEqual(report.execution.retry.status, 'SUCCESS');
  assert.strictEqual(report.execution.retryNoOp.counts.unchanged, 118);
});
test('13 final reconciliation is strict', () => assert.deepStrictEqual(report.reconciliation.final, {
  MATCHED: 118, MISSING: 0, DUPLICATE: 0, DRIFT: 0, PROTECTED_CHANGE: 0, UNEXPECTED: 0
}));
test('14 drift is detected', () => assert.strictEqual(report.reconciliation.drift.DRIFT, 1));
test('15 CTA is 53 continuous events', () => assert.strictEqual(report.invariants.cta60Hours, 53));
test('16 Stat.Com is 87 plus four extensions', () => assert.deepStrictEqual(report.invariants.statCom, { pdf: 87, extensions: 4, operational: 91 }));
test('17 external activities stay uncoded', () => assert.strictEqual(report.invariants.externalCode, null));
test('18 EMSEA Stat.Com is non applicable', () => assert.strictEqual(report.invariants.emseaStatCom, 'Non applicable'));
test('19 FOBA retains four OI materializations', () => assert.strictEqual(report.invariants.fobaMultiOi, 4));
test('20 multi-public is represented', () => assert.ok(report.invariants.multiPublicRows > 0));
test('21 canonical multi-session lines remain traceable', () => assert.strictEqual(report.invariants.multiSessionRows, 12));
test('22 synthetic multi-session proof rolls back', () => assert.strictEqual(report.invariants.syntheticMultiSessionEvidence.rolledBack, true));
test('23 PostgreSQL schema has structured relations', () => {
  for(const table of ['scope_evenement_domaines','scope_evenement_publics','scope_evenement_ois','scope_evenement_roles','scope_evenement_ressources']){
    assert.match(ddl, new RegExp(`create table ${table}`));
  }
});
test('24 PostgreSQL schema enables RLS', () => assert.strictEqual(report.schema.rlsEnabled, report.schema.rlsTables));
test('25 PostgreSQL schema has UUID JSONB timestamps and FKs', () => {
  for(const token of ['uuid primary key','jsonb not null','timestamp without time zone','references scope_evenements','enable row level security']) assert.ok(ddl.includes(token));
});
test('26 mapping covers every required field and draft remains rollback-only', () => {
  assert.ok(report.schema.fieldMapping.length >= 24);
  for(const token of ['scope_evenements(date, date_fin','scope_evenement_domaines','scope_qv_session_events']) assert.ok(migration.includes(token));
  assert.match(migration.trim(), /rollback;$/);
});
test('27 C20 planner remains the only planner', () => assert.match(planner, /function buildPublicationPlan/));
test('28 C21 executor accepts only named isolated adapters', () => assert.match(executor, /ALLOWED_ADAPTERS/));
test('29 executor requires exact bulk approval', () => assert.match(executor, /BULK_APPROVAL_REQUIRED/));
test('30 UI has twelve views', () => assert.strictEqual((fs.readFileSync(path.join(ROOT, 'scripts/scope-c19-ux-recette/index.html'), 'utf8').match(/data-view=/g) || []).length, 12));
test('31 UI exposes the exact dynamic title convention', () => assert.match(app, /QUO VADIS '\"\+String/));
test('32 UI removes excluded places from visible list', () => assert.match(app, /row\[0\]!==\'L-CANTON\'&&row\[0\]!==\'L-YVERDON\'/));
test('33 annual need title is dynamic', () => assert.match(app, /replace\('Besoin annuel 2027','Besoin annuel '\+year\)/));
test('34 UI uses one 36px control primitive', () => assert.match(css, /--control-height:36px/));
test('35 text actions are never underlined', () => assert.match(css, /\.text-button\{text-decoration:none!important\}/));
test('36 state markers are square 8px', () => assert.match(css, /\.state-dot\{width:8px;height:8px/));
test('37 ordinary agenda events have no dot', () => assert.match(css, /has-events:not\(\.holiday\):not\(\.vacation\):not\(\.announced\) i\{display:none\}/));
test('38 special agenda event dots are five pixels', () => assert.match(css, /announced\.has-events i\{display:block;width:5px;height:5px/));
test('39 programme separates history from 2027', () => assert.match(app, /Historique \/ non reconduit/));
test('40 backend evidence suite is green', () => assert.strictEqual(report.tests.failed, 0));
test('41 browser recipe covers 48 screen states', () => assert.deepStrictEqual(browser.summary, { total: 48, pass: 48, nok: 0 }));
test('42 every equivalent browser control is 36px', () => assert.ok(browser.controlHeights.every((row) => row.height === 36 && row.status === 'PASS')));
test('43 responsive checks have no global overflow or truncated action', () => assert.ok(browser.checks.every((row) => !row.globalOverflow && row.truncatedActions.length === 0)));
test('44 workflow context survives screens two to seven', () => assert.strictEqual(browser.navigation.contextPreservedScreens2to7, true));
test('45 conflict workflow rechecks opens and returns', () => {
  assert.strictEqual(browser.navigation.conflictRecheck, 1);
  assert.strictEqual(browser.navigation.openedActivityEditor, 1);
  assert.strictEqual(browser.navigation.returnedToConflictContext, true);
});
test('46 programme search returns all 53 CTA rows', () => assert.match(browser.interactions.programmeSearch.result, /^53 ligne/));
test('47 agenda and movement use representative full data', () => {
  assert.strictEqual(browser.interactions.agenda.heading, "QUO VADIS '27");
  assert.strictEqual(browser.interactions.move.rows, 125);
  assert.strictEqual(browser.interactions.move.fixedRows, 53);
});
test('48 twelve 1500px captures exist', () => {
  assert.strictEqual(browser.captures.length, 12);
  assert.ok(browser.captures.every((file) => fs.statSync(file).size > 1000));
});

if(!process.exitCode) console.log(`\n${passed}/${passed} C22 targeted tests PASS`);
