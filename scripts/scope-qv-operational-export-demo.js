'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createFixture } = require('./scope-qv-local-fixture');
const { createCatalogUiHarness } = require('./scope-annual-catalog-ui-harness');
const { generateQuoVadisProgrammeReport } = require('../netlify/lib/_scope-report-service');

const root = path.resolve(__dirname, '..');
const pdfDir = path.join(root, 'output/pdf');
const csvDir = path.join(root, 'output/csv');
const claims = { sub: 'local-demo', roles: ['ADMINISTRATEUR'], permissions: ['dashboard:read'] };

async function main() {
  const programme = await createFixture(null).service.listProgramme(2027);
  const hooks = createCatalogUiHarness().hooks;
  const samples = [
    ['SCOPE_QV_2027_annuel_complet.pdf', {}, 'tableau'],
    ['SCOPE_QV_2027_annuel_filtre_PR_ABC.pdf', { q: 'Exercice PR-ABC' }, 'tableau'],
    ['SCOPE_QV_2027_avril_complet.pdf', { month: '2027-04', period: 'mois' }, 'mensuelle'],
    ['SCOPE_QV_2027_avril_filtre_PR_ABC.pdf', { month: '2027-04', period: 'mois', q: 'Exercice PR-ABC' }, 'mensuelle']
  ];
  fs.mkdirSync(pdfDir, { recursive: true });
  for (const [name, filters, mode] of samples) {
    const body = hooks.quoVadisProgrammeExport(programme, filters, mode);
    const report = await generateQuoVadisProgrammeReport(null, body, claims);
    const filename = path.join(pdfDir, name);
    fs.writeFileSync(filename, report.buffer);
    process.stdout.write(`${filename} | ${body.rows.length} seances | ${report.pages} pages\n`);
  }
  if (process.argv.includes('--pdf-only')) return;
  fs.mkdirSync(csvDir, { recursive: true });
  const filtered = hooks.quoVadisProgrammeExport(programme, { q: 'Exercice PR-ABC' });
  const csv = path.join(csvDir, 'SCOPE_QV_2027_filtre_PR_ABC.csv');
  fs.writeFileSync(csv, hooks.quoVadisProgrammeCsvText(filtered.rows));
  process.stdout.write(`${csv} | ${filtered.rows.length} seances\n`);
}

main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
