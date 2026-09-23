'use strict';

const { CIBLES } = require('../netlify/lib/_scope-schema');
const { diagnoseLegacyTargets } = require('../netlify/lib/_scope-canonical-foundations');

const targets = CIBLES.map(([domaine_code, niveau_code, libelle], index) => ({
  cible_id: `STATIC-${String(index + 1).padStart(3, '0')}`,
  domaine_code,
  niveau_code,
  libelle
}));
const report = diagnoseLegacyTargets(targets);

if(process.argv.includes('--json')){
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}else{
  console.log('SCOPE canonical foundations C1 — diagnostic statique dry-run');
  console.log(`scope_cibles: ${report.total}`);
  console.log(`mappées automatiquement: ${report.mappedAutomatically}`);
  console.log(`composites: ${report.composite}`);
  console.log(`ambiguës: ${report.ambiguous}`);
  console.log(`sans mapping C1: ${report.unmapped}`);
  for(const row of report.details.filter((item) => item.classification !== 'MAPPED')){
    console.log(`${row.classification.padEnd(10)} ${row.key.padEnd(12)} ${row.reason || ''}`);
  }
}
