'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const fixture = require('./scope-c20-quo-vadis-integration-architecture-1');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;

function test(name, fn){
  try{
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  }catch(error){
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function common(programme, targetSnapshot){
  return { year: 2027, programme, targetSnapshot: targetSnapshot || [], referentials: fixture.REFERENTIALS, generatedAt: fixture.GENERATED_AT };
}

const programmeA = fixture.buildDataset();
const runA = planner.buildPublicationPlan(common(programmeA, []));
const snapshotA = planner.simulateAppliedPlan(runA, []);
const runB = planner.buildPublicationPlan(common(programmeA, snapshotA));
const programmeC = fixture.buildDataset().map((row) => row.caseId === 'SIMPLE-VULCAIN'
  ? { ...row, classification: { ...row.classification, roomCode: 'R-G1-JURA' } }
  : row);
const runC = planner.buildPublicationPlan(common(programmeC, snapshotA));
const snapshotC = planner.simulateAppliedPlan(runC, snapshotA);
const runD = planner.buildPublicationPlan(common(fixture.buildDataset(), snapshotC));

test('mapping creates nineteen explained decisions', () => assert.strictEqual(runA.decisions.length, 19));
test('publication identity ignores label and date', () => {
  const source = programmeA.find((row) => row.caseId === 'SIMPLE-VULCAIN');
  const changed = { ...source, label: 'Autre libellé', schedule: { startsAt: '2027-12-01T08:00', endsAt: '2027-12-01T10:00' } };
  assert.strictEqual(planner.canonicalPublicationKey(source), planner.canonicalPublicationKey(changed));
});
test('publication identity distinguishes operational units', () => {
  const foba = programmeA.filter((row) => row.caseId.startsWith('FOBA-PHASE-II-'));
  assert.strictEqual(new Set(foba.map(planner.canonicalPublicationKey)).size, 4);
});
test('Stat.Com.xxx is enforced', () => {
  const bad = { ...programmeA[1], business: { statComCode: '070F1', businessCode: 'QV-123' } };
  const plan = planner.buildPublicationPlan(common([bad], []));
  assert.strictEqual(plan.decisions[0].action, 'BLOCKED');
  assert.match(plan.decisions[0].reason, /STATCOM_DOT_3_DIGITS/);
});
test('external activity has no code and is not published', () => {
  const row = runA.decisions.find((item) => item.caseId === 'EXTERNE-HISTORIQUE');
  assert.strictEqual(row.action, 'NOT_PUBLISHED');
  assert.strictEqual(row.businessCode, null);
});
test('run A creates every ready case only', () => assert.deepStrictEqual(runA.summary, { CREATE: 10, UPDATE: 0, UNCHANGED: 0, BLOCKED: 8, NOT_PUBLISHED: 1 }));
test('run A is read-only by contract', () => {
  assert.strictEqual(runA.dryRun, true);
  assert.strictEqual(runA.writable, false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(planner, 'executePublicationPlan'), false);
});
test('CTA is one 60-hour multi-day event', () => {
  const row = runA.decisions.find((item) => item.caseId === 'CTA-60H');
  assert.strictEqual(row.target.event.durationMinutes, 3600);
  assert.strictEqual(row.target.event.startDate, '2027-01-01');
  assert.strictEqual(row.target.event.endDate, '2027-01-04');
  assert.strictEqual(row.target.event.crossesMidnight, true);
});
test('FOBA is one activity with four linked OI units', () => {
  const rows = runA.decisions.filter((item) => item.caseId.startsWith('FOBA-PHASE-II-'));
  assert.strictEqual(rows.length, 4);
  assert.strictEqual(new Set(rows.map((row) => row.target.source.definitionId)).size, 1);
  assert.strictEqual(new Set(rows.map((row) => row.target.source.occurrenceId)).size, 1);
  assert.strictEqual(new Set(rows.map((row) => row.businessCode)).size, 1);
  assert.deepStrictEqual(rows.flatMap((row) => row.target.relations.oiCodes).sort(), ['B1', 'B2', 'C1', 'G1']);
});
test('JSP keeps canonical Stat.Com', () => {
  const row = runA.decisions.find((item) => item.caseId === 'JSP-C1');
  assert.strictEqual(row.action, 'CREATE');
  assert.strictEqual(row.target.activity.statComCode, '010JC1');
});
test('EMSEA is publishable without Stat.Com', () => {
  const row = runA.decisions.find((item) => item.caseId === 'EMSEA-SANS-STATCOM');
  assert.strictEqual(row.action, 'CREATE');
  assert.strictEqual(row.target.activity.statComCode, null);
  assert.strictEqual(row.target.event.primaryDomain, 'INSTITUTIONNEL');
});
test('multi-session structure is preserved', () => {
  const rows = runA.decisions.filter((item) => item.caseId.startsWith('MULTI-SESSION-'));
  assert.strictEqual(rows.length, 6);
  assert.ok(rows.every((row) => row.action === 'BLOCKED'));
  assert.strictEqual(new Set(rows.map((row) => row.session.groupId)).size, 1);
  assert.deepStrictEqual(rows.map((row) => row.session.index).sort(), [1, 2, 3, 4, 5, 6]);
  assert.ok(rows.every((row) => row.session.count === 6));
  assert.ok(rows.every((row) => row.reason === 'SOURCE_NOT_VALIDATED'));
});
test('provenance is bidirectional and complete', () => {
  for(const row of runA.decisions.filter((item) => item.target)){
    assert.ok(row.target.source.definitionId);
    assert.ok(row.target.source.occurrenceId);
    assert.ok(row.target.source.sessionId);
    assert.ok(row.target.source.sourceRecordIds.length > 0);
    assert.ok(row.target.publicationKey);
  }
});
test('run B is fully idempotent', () => assert.deepStrictEqual(runB.summary, { CREATE: 0, UPDATE: 0, UNCHANGED: 10, BLOCKED: 8, NOT_PUBLISHED: 1 }));
test('run C changes exactly one existing event', () => assert.deepStrictEqual(runC.summary, { CREATE: 0, UPDATE: 1, UNCHANGED: 9, BLOCKED: 8, NOT_PUBLISHED: 1 }));
test('run C has no extra create', () => assert.strictEqual(runC.summary.CREATE, 0));
test('run D changes exactly the same event back', () => {
  assert.deepStrictEqual(runD.summary, { CREATE: 0, UPDATE: 1, UNCHANGED: 9, BLOCKED: 8, NOT_PUBLISHED: 1 });
  const c = runC.decisions.find((row) => row.action === 'UPDATE');
  const d = runD.decisions.find((row) => row.action === 'UPDATE');
  assert.strictEqual(c.publicationKey, d.publicationKey);
  assert.strictEqual(c.eventId, d.eventId);
});
test('A and C snapshots contain no duplicate publication key', () => {
  assert.strictEqual(new Set(snapshotA.map((row) => row.publicationKey)).size, snapshotA.length);
  assert.strictEqual(new Set(snapshotC.map((row) => row.publicationKey)).size, snapshotC.length);
});
test('incomplete information is blocked explicitly', () => {
  const row = runA.decisions.find((item) => item.caseId === 'INFORMATION-INSUFFISANTE');
  assert.strictEqual(row.action, 'BLOCKED');
  assert.strictEqual(row.reason, 'SOURCE_NOT_VALIDATED');
});
test('blocking conflict is never best-effort published', () => {
  const row = runA.decisions.find((item) => item.caseId === 'CONFLIT-BLOQUANT');
  assert.strictEqual(row.action, 'BLOCKED');
  assert.match(row.reason, /ROOM_CONFLICT/);
});
test('existing attendance protects an update', () => {
  const protectedSnapshot = snapshotA.map((row) => row.publicationKey === planner.canonicalPublicationKey(programmeA.find((item) => item.caseId === 'SIMPLE-VULCAIN'))
    ? { ...row, operationalState: { participations: 1 } }
    : row);
  const plan = planner.buildPublicationPlan(common(programmeC, protectedSnapshot));
  const row = plan.decisions.find((item) => item.caseId === 'SIMPLE-VULCAIN');
  assert.strictEqual(row.action, 'BLOCKED');
  assert.strictEqual(row.humanReview, true);
});
test('removed source becomes cancellation update', () => {
  const source = programmeA[0];
  const key = planner.canonicalPublicationKey(source);
  const plan = planner.buildPublicationPlan(common(programmeA.slice(1), snapshotA.filter((row) => row.publicationKey === key)));
  const row = plan.decisions.find((item) => item.publicationKey === key);
  assert.strictEqual(row.action, 'UPDATE');
  assert.strictEqual(row.target.event.status, 'ANNULE');
});
test('removed source with operational data is blocked', () => {
  const source = programmeA[0];
  const key = planner.canonicalPublicationKey(source);
  const target = snapshotA.find((row) => row.publicationKey === key);
  const plan = planner.buildPublicationPlan(common([], [{ ...target, operationalState: { permutations: 1 } }]));
  assert.strictEqual(plan.decisions[0].action, 'BLOCKED');
  assert.strictEqual(plan.decisions[0].humanReview, true);
});
test('duplicate source identity is blocked', () => {
  const source = programmeA[0];
  const plan = planner.buildPublicationPlan(common([source, { ...source, caseId: 'DUPLICATE' }], []));
  assert.ok(plan.decisions.every((row) => row.action === 'BLOCKED'));
});
test('duplicate target identity is blocked', () => {
  const source = programmeA[0];
  const target = snapshotA.find((row) => row.publicationKey === planner.canonicalPublicationKey(source));
  const plan = planner.buildPublicationPlan(common([source], [target, { ...target, eventId: 'duplicate-event' }]));
  assert.strictEqual(plan.decisions[0].action, 'BLOCKED');
  assert.strictEqual(plan.decisions[0].reason, 'DUPLICATE_SCOPE_PUBLICATION_KEY');
});
test('unknown canonical reference is blocked', () => {
  const source = programmeA[0];
  const bad = { ...source, classification: { ...source.classification, locationCode: 'CASERNE-SDIS' } };
  const plan = planner.buildPublicationPlan(common([bad], []));
  assert.strictEqual(plan.decisions[0].action, 'BLOCKED');
  assert.match(plan.decisions[0].reason, /CASERNE-SDIS/);
});
test('execution blueprint requires one transaction and rollback', () => {
  const blueprint = planner.buildExecutionBlueprint(runA);
  assert.strictEqual(blueprint.executable, false);
  assert.strictEqual(blueprint.transactionRequired, true);
  assert.strictEqual(blueprint.rollback, 'FULL_TRANSACTION_ROLLBACK');
  assert.strictEqual(new Set(blueprint.operations.map((row) => row.transactionBoundary)).size, 1);
});
test('additive SQL contract cannot persist in C20', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260929_scope_qv_publication_c20.sql'), 'utf8');
  assert.match(sql, /scope_qv_publication_links/);
  assert.match(sql, /scope_evenement_ois/);
  assert.match(sql, /scope_evenement_public_rule_versions/);
  assert.match(sql, /alter table scope_evenements add column if not exists date_fin/);
  assert.match(sql, /rollback;\s*$/);
  assert.doesNotMatch(sql, /\bcommit\s*;/i);
});
test('proof covers sections A through AZ', () => {
  const markdown = fixture.buildMarkdown(fixture.buildProof());
  for(const title of ['A. Verdict', 'Z. Multi-session', 'AA. Temps/date/durée', 'AZ. Recommandation C21']) assert.ok(markdown.includes(`## ${title}`));
});
test('C19 invariants remain referenced', () => {
  const proof = fixture.buildProof();
  assert.strictEqual(proof.c19Baseline.definitions, 345);
  assert.strictEqual(proof.c19Baseline.programmeObjects, 622);
  assert.strictEqual(proof.c19Baseline.lifecycleObjects, 635);
  assert.strictEqual(proof.c19Baseline.cta, 53);
});

console.log(`\n${passed}/${passed} C20 tests PASS`);
