'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const display = require('../assets/js/scope-personnel-display.js');
const svc = require('../netlify/functions/_scope-personnel-service.js');

function spec(overrides){
  return Object.assign({
    categorie: 'SPECIALISATION',
    domaine: 'AUTO',
    cible: 'VL_DPS',
    role_domaine: null,
    date_actif: '2026-01-01',
    date_inactif: null
  }, overrides || {});
}

function oi(overrides){
  return Object.assign({
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'G1',
    role_domaine: 'PRINCIPAL',
    date_actif: '2026-01-01',
    date_inactif: null
  }, overrides || {});
}

function csv(body){
  return `NIP;GRADE;NOM;PRENOM;OI\n${body}`;
}

function previewOf({ contexte, file, persons, assignments }){
  const resolved = svc.resolveImportContext(contexte);
  const existingPersons = new Map();
  (persons || []).forEach((row) => existingPersons.set(row.nip, row));
  const existingAssignments = new Map();
  (assignments || []).forEach((row) => {
    if(!existingAssignments.has(row.nip)) existingAssignments.set(row.nip, []);
    existingAssignments.get(row.nip).push(row);
  });
  const rows = svc.normalizeRows(svc.parsePersonnelCsv(file), resolved.code, null);
  return svc.buildPreview({
    rows,
    existingPersons,
    existingAssignments,
    population: [],
    resolved,
    siteJsp: null,
    anneeMonitoring: 2026,
    filename: 'order.csv'
  });
}

function identicalPreview(n){
  const lines = [];
  for(let i = 0; i < n; i += 1){
    const nip = `NIP${String(i + 1).padStart(3, '0')}`;
    lines.push({
      status: 'IDENTICAL',
      statut: 'IDENTICAL',
      nip,
      normalized: { nip, grade: 'Sgt', nom: 'DUPONT', prenom: 'Marc' },
      infos: [],
      warnings: [],
      errors: [],
      diff: { newAssignments: [], existingAssignments: [{ domaine: 'AUTO', cible: 'VL_DAP' }] }
    });
  }
  return {
    needsWrite: false,
    canCommit: true,
    counts: {
      totalLines: n,
      totalUniqueNips: n,
      countIdentical: n,
      countExistingAssignments: n,
      countNewPersons: 0,
      countModified: 0,
      countNewAssignments: 0,
      countErrors: 0,
      countMissingAssignments: 0
    },
    lines
  };
}

function run(){
  assert.deepStrictEqual(display.SPECIALIZATION_DISPLAY_ORDER, ['FOBA 1', 'FOBA 2', 'FOBA 3', 'PAPR', 'cond VL', 'cond PL', 'JSP']);
  assert.strictEqual(display.formatSpecializations([
    { domaine:'AUTO', cible:'PL' },
    { domaine:'PR', cible:'PR' },
    { domaine:'FOBA', cible:'2' },
    { domaine:'AUTO', cible:'VL_DPS' }
  ]).text, 'FOBA 2, PAPR, cond VL, cond PL');
  assert.strictEqual(display.formatSpecializations([
    { domaine:'AUTO', cible:'VL_DAP' },
    { domaine:'AUTO', cible:'VL_DPS' }
  ]).text, 'cond VL');

  const fiftyEight = identicalPreview(58);
  assert.strictEqual(display.importIsFullyIdentical(fiftyEight), true);
  assert.strictEqual(display.importCanCommit(fiftyEight), false);
  assert.strictEqual(display.filterPreviewRows(fiftyEight.lines, 'CHANGEMENTS').length, 0);
  assert.strictEqual(display.filterPreviewRows(fiftyEight.lines, 'TOUS').length, 0);
  const empty = display.importEmptyState(fiftyEight, 'CHANGEMENTS', 0);
  assert.strictEqual(empty.title, 'Aucune divergence détectée');
  assert.ok(empty.text.includes('58 personnes analysées'));
  assert.ok(empty.text.includes('58 affectations déjà conformes'));
  assert.ok(empty.text.includes('Aucune modification n’est nécessaire'));

  const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
  assert.ok(ui.includes('Aucune modification à importer'));
  assert.ok(ui.includes('Valider l’import'));
  assert.ok(ui.includes('scope-import-summary-label'));
  assert.ok(ui.includes('scope-import-summary-value'));
  const filters = display.importFilterButtons(fiftyEight).map((item) => item.id);
  assert.deepStrictEqual(filters, ['CHANGEMENTS', 'TOUS']);
  assert.ok(!filters.includes('CHANGEMENT_OI'));
  assert.ok(!filters.includes('CHANGEMENT_GRADE'));

  const plPreview = previewOf({
    contexte: 'AUTO_VL_DPS',
    file: csv('NIP001;Sgt;DUPONT;Marc;DPS G1'),
    persons: [{ id:'p1', nip:'NIP001', grade:'Sgt', nom:'DUPONT', prenom:'Marc' }],
    assignments: [
      Object.assign(oi(), { nip: 'NIP001' }),
      Object.assign(spec({ cible: 'VL_DPS' }), { nip: 'NIP001' }),
      Object.assign(spec({ cible: 'PL' }), { nip: 'NIP001' })
    ]
  });
  assert.strictEqual(plPreview.wrote, false);
  assert.strictEqual(plPreview.needsWrite, false);
  assert.strictEqual(plPreview.lines[0].status, 'IDENTICAL');
  assert.ok((plPreview.lines[0].infos || []).includes(display.MSG_PL_PRIORITY));
  assert.strictEqual((plPreview.lines[0].errors || []).length, 0);
  assert.strictEqual(display.previewRowKind(plPreview.lines[0]), 'info');
  assert.strictEqual(display.filterPreviewRows(plPreview.lines, 'INFOS').length, 1);
  assert.strictEqual(display.filterPreviewRows(plPreview.lines, 'CHANGEMENTS').length, 0);
  assert.ok(display.previewModificationText(plPreview.lines[0]).includes(display.MSG_PL_PRIORITY));
  assert.strictEqual(display.situationLabel(plPreview.lines[0]), 'Information');
  const planned = svc.planCommitMutations(plPreview, []);
  assert.strictEqual(planned.personInserts.length + planned.personUpdates.length + planned.assignmentInserts.length + planned.assignmentClosures.length, 0);

  ['PAPR', 'AUTO_VL_DPS', 'AUTO_VL_DAP', 'AUTO_PL', 'FOBA_1', 'FOBA_2', 'FOBA_3', 'JSP_FLM_1'].forEach((code) => {
    const resolved = svc.resolveImportContext(code);
    assert.ok(resolved && resolved.code, code);
  });

  console.log('scope-personnel-import-ux-order tests ok');
}

run();
