'use strict';
const assert = require('assert');
const display = require('../assets/js/scope-personnel-display.js');

function run(){
  assert.strictEqual(display.compactAssignmentLabel('PR', 'PR'), 'PAPR');
  assert.notStrictEqual(display.compactAssignmentLabel('PR', 'PR'), 'PR PR');
  assert.strictEqual(display.formatAssignment({ domaine: 'PR', cible: 'PR' }), 'PAPR');
  assert.strictEqual(display.formatAssignment({ domaine: 'PR', cible: 'PR', roleDomaine: 'PRINCIPAL' }), 'PAPR');
  assert.strictEqual(display.formatAssignment('PR PR'), 'PAPR');

  assert.strictEqual(display.compactAssignmentLabel('DPS', 'B1'), 'DPS B1');
  assert.strictEqual(display.compactAssignmentLabel('DAP', 'Y2'), 'DAP Y2');
  assert.strictEqual(display.compactAssignmentLabel('FOBA', '1'), 'FOBA 1');
  assert.strictEqual(display.compactAssignmentLabel('AUTO', 'VL_DPS'), 'cond VL');
  assert.strictEqual(display.compactAssignmentLabel('AUTO', 'PL'), 'cond PL');
  assert.strictEqual(display.compactAssignmentLabel('JSP', 'JSP G1'), 'JSP G1');
  assert.strictEqual(display.compactAssignmentLabel('JSP', 'JSP C1'), 'JSP C1');

  const identical = {
    statut: 'IDENTICAL',
    nip: 'NIP001',
    normalized: { nip: 'NIP001', grade: 'Sgt', nom: 'DUPONT', prenom: 'Marc' },
    diff: {
      identity: {
        grade: { current: 'Sgt', proposed: 'Sgt' },
        nom: { current: 'DUPONT', proposed: 'DUPONT' },
        prenom: { current: 'Marc', proposed: 'Marc' }
      },
      person: {},
      newAssignments: [],
      existingAssignments: [{ domaine: 'PR', cible: 'PR' }]
    }
  };
  const gradeChange = {
    statut: 'MODIFIED',
    nip: 'NIP001',
    normalized: { nip: 'NIP001', grade: 'Sgt', nom: 'DUPONT', prenom: 'Marc' },
    diff: {
      identity: {
        grade: { current: 'Cpl', proposed: 'Sgt' },
        nom: { current: 'DUPONT', proposed: 'DUPONT' },
        prenom: { current: 'Marc', proposed: 'Marc' }
      },
      person: { grade: { before: 'Cpl', after: 'Sgt' } }
    }
  };
  const newAssignment = {
    statut: 'NEW_ASSIGNMENT',
    nip: 'NIP002',
    normalized: { nip: 'NIP002', grade: 'Sgt', nom: 'DUPONT', prenom: 'Marc', assignments: [{ domaine: 'PR', cible: 'PR' }] },
    diff: {
      identity: {
        grade: { current: 'Sgt', proposed: 'Sgt' },
        nom: { current: 'DUPONT', proposed: 'DUPONT' },
        prenom: { current: 'Marc', proposed: 'Marc' }
      },
      person: {},
      population: { specialization: { current: '', proposed: '' }, oiSite: { current: '', proposed: '' } },
      newAssignments: [{ domaine: 'PR', cible: 'PR' }]
    }
  };
  const anomaly = {
    statut: 'IDENTICAL',
    nip: 'NIP003',
    warnings: ['cond VL — DPS sans rattachement DPS cohérent.']
  };

  const detail = display.previewDetailRows([identical, gradeChange, newAssignment, anomaly]);
  assert.ok(!detail.some((row) => row.nip === 'NIP001' && row.statut === 'IDENTICAL'));
  assert.deepStrictEqual(detail.map((row) => row.nip), ['NIP001', 'NIP002', 'NIP003']);
  assert.strictEqual(display.isStrictlyIdenticalPreviewRow(identical), true);
  assert.strictEqual(display.isStrictlyIdenticalPreviewRow(gradeChange), false);

  const counts = { countIdentical: 1, countModified: 1, countNewAssignments: 1 };
  assert.strictEqual(counts.countIdentical, 1);

  const gradeFields = display.identityDiffFields(gradeChange);
  assert.deepStrictEqual(gradeFields.map((field) => field.key), ['grade']);
  assert.strictEqual(display.formatIdentitySide(gradeChange, 'current'), 'Grade : Cpl');
  assert.strictEqual(display.formatIdentitySide(gradeChange, 'proposed'), 'Grade : Sgt');
  assert.ok(!display.formatIdentitySide(gradeChange, 'current').includes('Nom'));
  assert.ok(!display.formatIdentitySide(gradeChange, 'proposed').includes('Prénom'));

  assert.strictEqual(display.formatIdentitySide(newAssignment, 'current'), '—');
  assert.strictEqual(display.formatIdentitySide(newAssignment, 'proposed'), '—');
  assert.strictEqual(display.assignmentSides(newAssignment).proposed, 'PAPR');
  assert.notStrictEqual(display.assignmentSides(newAssignment).proposed, 'PR PR');

  console.log('scope-personnel-import-ux tests ok');
}

run();
