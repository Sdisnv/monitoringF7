'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classifyLocation, classifyRoom } = require('./scope-qv-2027-sql-recette-readonly');

const locations = [
  { code:'B1-CASERNE', nom_court:'Caserne B1', site_code:'B1', localite:'Yvonand' },
  { code:'G1-CASERNE', nom_court:'Caserne G1', site_code:'G1', localite:'Yverdon-les-Bains' }
];
const rooms = [
  { code:'B1-THEORIE', libelle:'Théorie B1', lieu_id:'b1' },
  { code:'G1-ETAT-MAJOR', libelle:'État-major', lieu_id:'g1' },
  { code:'G1-VULCAIN', libelle:'Vulcain', lieu_id:'g1' }
];

assert.equal(classifyLocation({ location:'Caserne B1' }, locations).status, 'MATCHED');
assert.equal(classifyLocation({ location:'Caserne SDIS' }, locations).status, 'AMBIGUOUS');
assert.equal(classifyLocation({ location:'Yvonand' }, locations).status, 'AMBIGUOUS');
assert.equal(classifyLocation({ location:'À définir' }, locations).status, 'UNMATCHED');
assert.equal(classifyRoom({ room:'R-G1-EM' }, rooms).code, 'R-G1-ETAT-MAJOR');
assert.equal(classifyRoom({ room:'Salle de théorie', business:{ lieuId:'b1' } }, rooms).code, 'R-B1-THEORIE');
assert.equal(classifyRoom({ room:'Salle de théorie', business:{ lieuId:'g1' } }, rooms).status, 'AMBIGUOUS');
assert.equal(classifyRoom({ room:'Compactus équipement' }, rooms).status, 'UNMATCHED');

const report = JSON.parse(fs.readFileSync(path.resolve(__dirname,
  '../outputs/qv-2027-sql-recette/local-readonly-diff.json'), 'utf8'));
assert.equal(report.target.database, 'scope_qv_2027_recipe_20261006');
assert.equal(report.target.host, '127.0.0.1');
assert.equal(report.candidate.count, 850);
assert.equal(report.candidate.localDecisions, 15);
assert.equal(report.candidate.tourDeFrance, 0);
assert.equal(report.locations.total, 57);
assert.equal(report.locations.alreadyMapped, 737);
assert.equal(report.rooms.total, 116);
assert.equal(report.rooms.compatibleForeignKeys, 93);
assert.equal(report.diff.snapshot, 125);
assert.equal(report.diff.matchedKeys, 125);
assert.equal(report.diff.duplicates, 0);
assert.equal(Object.values(report.diff.summary).reduce((a, b) => a + b, 0), 850);
assert.deepEqual(report.reconciled.summary,
  { CREATE:0,UPDATE:0,UNCHANGED:125,BLOCKED:725,NOT_PUBLISHED:0 });
console.log('QV 2027 local SQL read-only gate: PASS');
