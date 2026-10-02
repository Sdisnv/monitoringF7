'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readXlsx } = require('../netlify/lib/_scope-xlsx-reader');
const source = process.argv[2] || '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const bytes = fs.readFileSync(source);
const sheet = readXlsx(bytes, { sheetName: "QUO VADIS '26" });
const text = value => String(value == null ? '' : value).trim();
const date = serial => new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000).toISOString().slice(0, 10);
const time = serial => {
  if (typeof serial !== 'number') return text(serial);
  const minutes = Math.round(serial * 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};
const oiColumns = { G1: 31, C1: 32, B1: 33, B2: 34, Y1: 38, Y2: 39, Y3: 40, Y4: 41 };
const rows = sheet.rows.flatMap((row, index) => {
  if (index < 4 || typeof row[4] !== 'number' || !row[7]) return [];
  return [{ sourceLine: index + 1, date: date(row[4]), start: time(row[5]), end: time(row[6]), code: text(row[1]),
    title: text(row[7]), personnel: text(row[11]), location: text(row[9]), domain: text(row[14]),
    domainF7: text(row[12]), subDomain: text(row[13]), qui: text(row[14]),
    responsible: text(row[15]), room: text(row[16]), statCom: text(row[19]),
    ois: Object.entries(oiColumns).filter(([, column]) => text(row[column])).map(([oi]) => oi) }];
});
if (rows.length !== 919) throw new Error(`Source unexpected: ${rows.length} rows`);
const output = { sourceWorkbook: path.basename(source), sourceSheet: sheet.sheetName, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), rows };
fs.writeFileSync(path.join(__dirname, '../netlify/lib/data/scope-qv-history-2026.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`QUO VADIS 2026: ${rows.length} source rows, workbook read directly, unchanged`);
