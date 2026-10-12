'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { generateQuoVadisProgrammeReport } = require('../netlify/lib/_scope-report-service');

const claims = { sub: 'qv-export-proof', roles: ['ADMINISTRATEUR'], permissions: ['dashboard:read'] };
const options = { generatedAt: '2026-10-12T10:00:00.000Z' };

function exportPayload(mode = 'annual', themes = ['Base']) {
  return {
    rows: [{
      id: 'QV-EXPORT-001:PR:1.1', code: '011PR.001', date: '20.04.2027',
      dateIso: '2027-04-20', endDateIso: '2027-04-20', monthKey: '2027-04',
      horaire: '18:30 - 21:30', domaine: 'PR', oi: 'G1', publicCible: 'PR',
      activite: 'Exercice PR 1.1', themes,
      specCursus: '', statcom: '011PR', lieu: 'Caserne G1', adresse: '',
      salleTheorie: '', responsable: 'C PR', etat: 'Planifié'
    }],
    meta: { mode, year: 2027, monthKey: mode === 'monthly' ? '2027-04' : '',
      periodLabel: mode === 'monthly' ? 'avril 2027' : 'Toute l’année',
      filterSummary: 'QV-EXPORT-001' }
  };
}

async function generateProof(directory = path.resolve(__dirname, '../output/pdf/qv-export-001')) {
  fs.mkdirSync(directory, { recursive: true });
  const manifest = [];
  for (const mode of ['annual', 'compact', 'monthly']) {
    for (const themed of [true, false]) {
      const payload = exportPayload(mode, themed ? ['Base'] : []);
      const before = JSON.stringify(payload);
      const result = await generateQuoVadisProgrammeReport(null, payload, claims, options);
      if (JSON.stringify(payload) !== before) throw new Error('Export source mutated');
      const filename = path.join(directory, `qv-export-001-${mode}-${themed ? 'avec' : 'sans'}-theme.pdf`);
      fs.writeFileSync(filename, result.buffer);
      manifest.push({ path: filename, mode, themed, pages: result.pages,
        rows: result.meta.rows, sha256: result.sha256, downloadFilename: result.filename });
      process.stdout.write(`${filename} | ${result.pages} page(s) | ${result.meta.rows} séance(s)\n`);
    }
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

if (require.main === module) {
  generateProof(process.argv[2]).catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = { claims, options, exportPayload, generateProof };
