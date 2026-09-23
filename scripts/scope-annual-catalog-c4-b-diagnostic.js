'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { classifyLegacyCandidates } = require('../netlify/lib/_scope-annual-catalog');

function runDiagnostic(rows){
  const candidates = classifyLegacyCandidates(rows);
  const counts = Object.fromEntries(['A','B','C','D'].map((classification) => [classification,candidates.filter((row) => row.classification === classification).length]));
  return { generatedAt: null,mode: 'READ_ONLY_DIAGNOSTIC',counts,candidates };
}

if(require.main === module){
  const filename = process.argv[2];
  const rows = filename ? JSON.parse(fs.readFileSync(path.resolve(filename),'utf8')) : [];
  process.stdout.write(`${JSON.stringify(runDiagnostic(rows),null,2)}\n`);
}

module.exports = { runDiagnostic };
