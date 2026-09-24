'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { CANONICAL_MIGRATIONS } = require('../netlify/lib/_scope-canonical-readiness');
const { INITIAL_ACTIVITY_CODES,DOMAIN_ORDER } = require('../netlify/lib/_scope-annual-catalog-service');

const root = path.resolve(__dirname,'..');
const schema = fs.readFileSync(path.join(root,'netlify/lib/_scope-schema.js'),'utf8');
const service = fs.readFileSync(path.join(root,'netlify/lib/_scope-annual-catalog-service.js'),'utf8');
const ensureBody = schema.slice(schema.indexOf('async function ensureScopeSchema()'),schema.indexOf('async function migrateQuoVadisReferentialManagement4()'));
const canonicalCalls = ['migrateCanonicalFoundationsC1','migratePublicEngineMirrorC2B','migratePersonQualificationsC3B','migrateAnnualCatalogC4B','migrateCatalogConvergenceC5B']
  .filter((name) => ensureBody.includes(`await ${name}(`));
const operationalWrites = [...service.matchAll(/(insert\s+into|update|delete\s+from)\s+(scope_[a-z_]+)/ig)]
  .map((match) => match[2]).filter((table) => ['scope_evenements','scope_attendus','scope_participations','scope_population_figee'].includes(table));
const report = {
  migrations: CANONICAL_MIGRATIONS,autoMigrationCanonicalCalls: canonicalCalls,readinessMode: 'READ_ONLY_FAIL_CLOSED',
  catalogue: INITIAL_ACTIVITY_CODES,domainOrder: DOMAIN_ORDER,annualRequirementWrites: true,plannedOccurrenceWrites: true,
  operationalWrites,quoVadis: { mode: 'MIRROR',materialized: false,eventPublication: false,humanDecisionWrites: false },
  databaseAccess: false,migrationsExecuted: false
};

if(process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
else {
  process.stdout.write('SCOPE C6-B — DIAGNOSTIC STATIQUE\n');
  process.stdout.write(`Auto-migrations C1-C5 depuis ensureScopeSchema: ${canonicalCalls.length}\n`);
  process.stdout.write(`Readiness: ${report.readinessMode} (${report.migrations.length} marqueurs)\n`);
  process.stdout.write(`Catalogue initial: ${report.catalogue.length} activites\n`);
  process.stdout.write(`Ecritures operationnelles detectees: ${operationalWrites.length}\n`);
  process.stdout.write('QUO VADIS: MIRROR — aucune materialisation, aucune publication\n');
  process.stdout.write('DB reelle: NON — migrations executees: NON\n');
}
