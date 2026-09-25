'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const importer = require('../netlify/lib/_scope-annual-catalog-import');
const statCom = require('../netlify/lib/_scope-statcom-referential');
const { DEFAULT_WORKBOOK } = require('./scope-annual-catalog-c15-diagnostic');

const ROOT = path.resolve(__dirname,'..');
const migration = fs.readFileSync(path.join(ROOT,'database/migrations/20260925_scope_statcom_jsp_repair_2.sql'),'utf8');
const schema = fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-schema.js'),'utf8');
const service = fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-annual-catalog-service.js'),'utf8');
const workbookPath = process.env.SCOPE_C15_WORKBOOK || DEFAULT_WORKBOOK;
const workbook = fs.readFileSync(workbookPath);
const preview = importer.analyzeWorkbook(workbook,{ fileName:path.basename(workbookPath) });
const tests = [];
const test = (name,fn) => tests.push({ name,fn });

test('01 expose les quatre références JSP canoniques exactes',() => {
  const rows = new Map(statCom.initialStatComCodes().map((row) => [row.code,row]));
  assert.deepEqual([...['010JB1','010JC1','010JG1'].map((code) => [code,rows.get(code).domain,rows.get(code).category,rows.get(code).oi,rows.get(code).specialization])],
    [['010JB1','JSP','EXERCI','B1',null],['010JC1','JSP','EXERCI','C1',null],['010JG1','JSP','EXERCI','G1',null]]);
  assert.deepEqual([rows.get('COURJSP').domain,rows.get('COURJSP').category,rows.get('COURJSP').oi,rows.get('COURJSP').specialization],['JSP','COURS',null,null]);
  for(const code of ['010JB1','010JC1','010JG1','COURJSP']) assert.equal(rows.get(code).active,true);
  assert.equal(rows.has('010JY3'),false);
});

test('02 applique la succession seulement à partir du 01.01.2026',() => {
  assert.deepEqual(statCom.resolveStatComCode('010JY3','2026-01-01'),{ sourceCode:'010JY3',canonicalCode:'010JC1',successionApplied:true,effectiveFrom:'2026-01-01' });
  assert.deepEqual(statCom.resolveStatComCode('010JY3','2025-12-31'),{ sourceCode:'010JY3',canonicalCode:'010JY3',successionApplied:false,effectiveFrom:null });
  assert.equal(statCom.resolveStatComCode('010JC1','2026-09-14').canonicalCode,'010JC1');
  assert.equal(statCom.resolveStatComCode('013Y3','2026-09-14').canonicalCode,'013Y3');
});

test('03 conserve la provenance 010JY3 et produit 010JC1 dans le vrai XLSX',() => {
  const rows = importer.rowsFromWorkbook(workbook).rows;
  const source = rows.find((row) => row.sourceRow === 619);
  assert.equal(source.sourceStatCom,'010JY3');
  assert.equal(source.statCom,'010JC1');
  assert.equal(source.statComResolution.successionApplied,true);
  const proposal = preview.proposals.find((row) => row.activityLabel === 'Séance interne cadres JSP');
  assert(proposal.sourceStatComCodes.includes('010JY3'));
  assert(proposal.statComCodes.includes('010JC1'));
  assert(!proposal.statComCodes.includes('010JY3'));
  assert(proposal.statComResolutions.some((row) => row.sourceCode === '010JY3' && row.canonicalCode === '010JC1'));
});

test('04 rend les 290 propositions Stat.Com résolvables avec le seed partagé',() => {
  const active = new Set(statCom.initialStatComCodes().filter((row) => row.active).map((row) => row.code));
  const referenced = preview.proposals.filter((row) => row.classification === 'AUTO_IMPORT' && row.statComCodes.length);
  const unresolved = referenced.filter((row) => row.statComCodes.some((code) => !active.has(code)));
  assert.equal(referenced.length,290);
  assert.deepEqual(unresolved.map((row) => ({ activity:row.activityLabel,codes:row.statComCodes.filter((code) => !active.has(code)) })),[]);
});

test('05 maintient les 80 thèmes et les réparations C15',() => {
  assert.equal(preview.summary.normalization.distinctThemes,80);
  assert.match(service,/scope_statcom_referentiel where code=\$2 and active=true/);
  assert.doesNotMatch(service,/scope_statcom_referentiel where code=\$2 and actif=true/);
  assert.match(service,/sourceStatComCodes:proposal\.sourceStatComCodes/);
  assert.match(service,/statComResolutions:proposal\.statComResolutions/);
});

test('06 garde migration seed et DDL runtime en parité',() => {
  for(const code of ['010JB1','010JC1','010JG1','COURJSP']){
    assert(migration.includes(`'${code}'`),code);
    assert(schema.includes("'010JB1','010JC1','010JG1','COURJSP'"),code);
  }
  assert.match(migration,/on conflict \(code\) do nothing/);
  assert.match(migration,/scope-statcom-jsp-repair-2/);
  assert.match(schema,/async function migrateStatComJspRepair2\(\)/);
  assert.doesNotMatch(migration,/\('010JY3'/);
});

(async () => {
  let passed = 0;
  for(const item of tests){
    try { await item.fn();passed += 1;process.stdout.write(`PASS ${item.name}\n`); }
    catch(error){ console.error(`FAIL ${item.name}\n${error.stack}`);process.exitCode = 1; }
  }
  process.stdout.write(`C16-REPAIR-2 ${passed}/${tests.length} PASS\n`);
})();
