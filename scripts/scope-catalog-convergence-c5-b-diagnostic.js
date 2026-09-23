'use strict';

const fs = require('node:fs');
const path = require('node:path');
const convergence = require('../netlify/lib/_scope-catalog-convergence');
const statCom = require('../netlify/lib/_scope-statcom-referential');

function parseFixture(file){
  const lines=fs.readFileSync(file,'utf8').trim().split(/\r?\n/); const headers=lines.shift().split(';');
  return lines.map((line,index) => { const values=line.split(';'); const row=Object.fromEntries(headers.map((header,i) => [header,values[i] || '']));
    return { source:'VERSIONED_MOA_FIXTURE',sourceId:row['Code cours'] || String(index+1),rawLabel:row['Événement'],domain:row.Qui,publicCodes:[row.Cible],statcomCode:row['Stat.Com'] };
  });
}

const file=path.resolve(__dirname,'../tests/fixtures/scope-events-real-moa.csv');
const report=convergence.buildConvergenceDiagnostic(parseFixture(file),{ knownStatComCodes:statCom.initialStatComCodes().map((row) => row.code) });
report.catalogue={ creatable:convergence.INITIAL_ACTIVITY_BLUEPRINTS.map((row) => row.code),reviewRequired:convergence.REVIEW_REQUIRED_BLUEPRINTS };
report.annualRequirements={ readyCandidates:['PR-EXERCICE-PAPR','PR-TEST-PHYSIQUE'],databaseSeedStatus:'DRAFT_PENDING_PINNED_PUBLIC_RULE' };
report.generation={ occurrences:0,sessions:0,reason:'DATABASE_SEEDS_NOT_EXECUTED' };
report.projection={ sourceType:'CATALOG_C4',mode:'MIRROR',count:0,operationalWrites:false,humanDecisionsProtected:0 };
report.multiDomainActivities=convergence.INITIAL_ACTIVITY_BLUEPRINTS.filter((row) => row.domainCodes.length>1).map((row) => row.code);
report.unresolvedQualifications=report.classifications.filter((row) => row.classification==='C' && row.detectedDomainCodes.some((domain) => ['AUTO','FOSPEC','PR'].includes(domain)));
report.unresolved={ statComErrors:report.statComErrors.length,publics:report.unresolvedPublics.length,qualifications:report.unresolvedQualifications.length,
  multiDomain:report.multiDomainActivities.length,multiSession:report.multiSessionActivities.length };
if(process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
else {
  process.stdout.write('SCOPE C5-B — DIAGNOSTIC DE CONVERGENCE\n');
  process.stdout.write(`Sources analysées: ${report.sourceCount}\n`);
  process.stdout.write(`A-F: ${Object.entries(report.counts).map(([key,value]) => `${key}=${value}`).join(' ')}\n`);
  process.stdout.write(`Définitions créables: ${report.catalogue.creatable.length}\nAliases confirmables: ${report.aliases.length}\n`);
  process.stdout.write(`AnnualRequirements 2027: ${report.annualRequirements.readyCandidates.length} candidats, seed DRAFT\nOccurrences/sessions/projections: 0/0/0 (migration non exécutée)\n`);
  process.stdout.write(`Décisions humaines protégées: 0 (diagnostic sans état DB)\nErreurs Stat.Com: ${report.statComErrors.length}\n`);
  process.stdout.write(`Multi-domaines: ${report.multiDomainActivities.length}\nMulti-session détecté: ${report.multiSessionActivities.length}\n`);
  process.stdout.write(`REVIEW_REQUIRED: ${report.reviewRequired.length + report.catalogue.reviewRequired.length}\n`);
  process.stdout.write('Corpus exhaustif: NON — classeur QUO VADIS complet absent\nMode: MIRROR — aucune écriture opérationnelle\n');
}
