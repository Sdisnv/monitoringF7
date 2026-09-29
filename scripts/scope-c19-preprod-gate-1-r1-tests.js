'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const r1 = require('./scope-c19-preprod-gate-1-r1');
const statCom = require('../netlify/lib/_scope-statcom-referential');
const functional = require('../netlify/lib/_scope-functional-catalog');

const root = path.resolve(__dirname, '..');
const report = r1.buildReport();

assert.strictEqual(report.verdict, 'PASS');
assert.strictEqual(report.restrictions.generated2027, false);
assert.strictEqual(report.restrictions.databaseWrites, false);
assert.strictEqual(report.statCom.canonical.table, 'scope_statcom_referentiel');
assert.deepStrictEqual(report.statCom.totals, { A: 26, C: 12, B: 1 });
assert.strictEqual(report.statCom.missingRows.length, 39);
assert.strictEqual(report.statCom.emsea.rows.length, 11);
assert.deepStrictEqual(statCom.resolveStatComCode('010JY3', '2025-12-31').canonicalCode, '010JY3');
assert.deepStrictEqual(statCom.resolveStatComCode('010JY3', '2026-01-01').canonicalCode, '010JC1');

assert.strictEqual(report.cta.capacities.G1.halfSectionMaximum, 8);
assert.strictEqual(report.cta.capacities.G1.sectionMaximum, 15);
assert.strictEqual(report.cta.capacities.G1.implemented, false);
assert.strictEqual(report.cta.capacities.C1, null);
assert.strictEqual(report.cta.capacities.B1, null);
assert.strictEqual(report.cta.capacities.B2, null);
assert.strictEqual(report.cta.reserve.section, 'N06');
assert.notStrictEqual(report.cta.rotations.cta, report.cta.rotations.halfSections);

assert.strictEqual(report.definitions2026AbsentFromPartial2027.rows.length, 302);
assert.deepStrictEqual(report.definitions2026AbsentFromPartial2027.totals, { G: 3, D: 13, H: 6, A: 210, B: 56, E: 5, C: 9 });
assert.strictEqual(report.definitions2026AbsentFromPartial2027.trueMoaCount, 9);
assert.strictEqual(report.undatedFoca.total, 6);
assert.strictEqual(report.undatedFoca.dateFound, false);
assert.deepStrictEqual(report.publicCandidates.totals, {
  'CORRESPONDANCE CANONIQUE RETROUVEE': 5,
  'REELLEMENT INCONNUE': 3,
  'VALEUR EXTERIEURE AU REFERENTIEL PUBLIC': 4
});

const base = { date: '2027-03-02', startTime: '19:00', endTime: '21:00', scopeDomain: 'DPS' };
const fullG1 = { ...base, activityLabel: 'Exercice DPS G1', activityClass: 'DPS_EXERCISE', coverage: 'FULL_OI', organisationUnit: 'G1' };
const fullC1 = { ...base, activityLabel: 'Exercice DPS C1', activityClass: 'DPS_EXERCISE', coverage: 'FULL_OI', organisationUnit: 'C1' };
const partialG1 = { ...base, activityLabel: 'Instruction N01a', activityClass: 'DPS_INSTRUCTION', coverage: 'PARTIAL', organisationUnit: 'G1', publicCodes: ['DPS-G1-N01A'] };
const jspG1 = { ...base, activityLabel: 'Exercice JSP G1', activityClass: 'JSP_EXERCISE', coverage: 'FULL_OI', organisationUnit: 'G1' };
assert.strictEqual(functional.compatibilityBetween(fullG1, fullC1).state, 'COMPATIBLE');
assert.strictEqual(functional.compatibilityBetween(fullG1, jspG1).state, 'CONFLICT');
assert.strictEqual(functional.compatibilityBetween(partialG1, jspG1).state, 'COMPATIBLE');

r1.writeOutputs(report);
assert.ok(fs.existsSync(path.join(root, 'docs/SCOPE_C19_PREPROD_GATE_1_R1.json')));
assert.ok(fs.existsSync(path.join(root, 'docs/SCOPE_C19_PREPROD_GATE_1_R1.md')));
console.log('C19-PREPROD-GATE-1-R1 targeted tests: PASS');
