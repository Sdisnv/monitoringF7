'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { rowsFromWorkbook } = require('../netlify/lib/_scope-annual-catalog-import');
const gate = require('./scope-c19-preprod-gate-1');

let passed = 0;
function test(name,callback){
  callback();
  passed += 1;
  process.stdout.write(`PASS ${String(passed).padStart(2,'0')} — ${name}\n`);
}

const input = fs.readFileSync(gate.DEFAULT_WORKBOOK);
const source = rowsFromWorkbook(input);
const report = gate.buildGate();

test('les cellules de date vides restent nulles',() => {
  const rows = source.rows.filter((row) => row.sourceRow >= 924);
  assert.equal(rows.length,6);
  assert.ok(rows.every((row) => row.date === null));
  assert.equal(source.rows.some((row) => row.date === '1899-12-30'),false);
});

test('la réconciliation 2026 ne perd aucune ligne silencieusement',() => {
  assert.equal(report.gate1.sourceRows2026,847);
  assert.equal(report.gate1.analyzedRows,847);
  assert.equal(report.gate1.silentLoss,0);
  assert.equal(Object.values(report.gate1.rowDisposition).reduce((sum,value) => sum + value,0),847);
});

test('les lignes 2027 explicites restent distinctes de la génération annuelle',() => {
  assert.equal(report.gate3.explicitSourceRows2027,72);
  assert.equal(report.gate3.generatedSessions,72);
  assert.equal(report.gate3.fullYear,false);
  assert.equal(report.gate3.firstDate,'2027-01-05');
  assert.equal(report.gate3.lastDate,'2027-03-04');
});

test('chaque événement de preview conserve sa preuve source',() => {
  assert.equal(report.preview.events.length,72);
  assert.ok(report.preview.events.every((event) => event.provenance === 'SOURCE_WORKBOOK_DATE'));
  assert.ok(report.preview.events.every((event) => event.sourceEvidence && Number.isInteger(event.sourceEvidence.row)));
});

test('le calendrier officiel 2026 et 2027 est complet',() => {
  assert.deepEqual(gate.CALENDAR[2026].holidays,['2026-01-01','2026-01-02','2026-04-03','2026-04-06','2026-05-14','2026-05-25','2026-08-01','2026-09-21','2026-12-25']);
  assert.deepEqual(gate.CALENDAR[2027].holidays,['2027-01-01','2027-01-02','2027-03-26','2027-03-29','2027-05-06','2027-05-17','2027-08-01','2027-09-20','2027-12-25']);
  assert.equal(gate.CALENDAR[2026].vacations.length,9);
  assert.equal(gate.CALENDAR[2027].vacations.length,9);
});

test('faits calendaires et règles métier restent séparés',() => {
  assert.equal(report.calendar.factRuleSeparation,true);
  assert.equal(report.calendar.businessRules.publicHolidayEve,'À ARBITRER');
  assert.equal(report.calendar.businessRules.schoolVacationEve,'À ARBITRER');
});

test('aucun tournus CTA n’est inventé',() => {
  assert.equal(report.inventory.ctaTurnSource,null);
  assert.equal(report.gate2.ctaTurn,'MANQUANT');
  assert.equal(report.gate3.ctaPlacements,0);
});

test('les OI JSP interdits Y1 à Y4 ne sont jamais produits',() => {
  const invalid = report.preview.events.flatMap((event) => event.oiCodes || []).filter((code) => /^JSP:Y[1-4]$/.test(code));
  assert.deepEqual(invalid,[]);
});

test('les arbitrages structurants sont tous explicites',() => {
  const codes = report.arbitrations.map((row) => row.code);
  for(const code of ['CTA-TURN','QV27-COVERAGE','UNDATED-FOCA','HISTORY-RECONDUCTION','CALENDAR-BUSINESS-RULES','STATCOM-MISSING']) assert.ok(codes.includes(code));
  assert.equal(report.undatedRows.length,6);
});

test('le verdict ne peut pas masquer les gates bloqués',() => {
  assert.equal(report.gates.gate1,'PASS');
  assert.equal(report.gates.gate2,'NOK');
  assert.equal(report.gates.gate3,'NOK');
  assert.equal(report.gates.gate4,'BLOCKED');
  assert.equal(report.gates.global,'NOK');
  assert.equal(report.operationalWrites,false);
  assert.equal(report.databaseWrites,false);
});

process.stdout.write(`C19-PREPROD-GATE-1: ${passed}/10 PASS\n`);
