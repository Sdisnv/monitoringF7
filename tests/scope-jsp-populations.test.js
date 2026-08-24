'use strict';
const assert = require('assert');
const display = require('../assets/js/scope-personnel-display.js');
const svc = require('../netlify/functions/_scope-personnel-service.js');
const ctx = require('../netlify/functions/_scope-personnel-import-contexts.js');

function csv(body){
  return `NIP;GRADE;NOM;PRENOM;OI\n${body}`;
}

function personRow(overrides){
  return Object.assign({
    id: 'p1',
    nip: 'NIP001',
    grade: 'Sgt',
    nom: 'DUPONT',
    prenom: 'Marc',
    date_entree_sdis: '2020-02-03',
    archived_at: null
  }, overrides || {});
}

function aff(overrides){
  return Object.assign({
    id: 'a1',
    categorie: 'OI',
    domaine: 'DPS',
    cible: 'G1',
    role_domaine: 'PRINCIPAL',
    date_actif: '2026-01-01',
    date_inactif: null
  }, overrides || {});
}

function previewOf({ contexte, file, persons, assignments, population }){
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
    population: population || [],
    resolved,
    siteJsp: null,
    anneeMonitoring: 2026,
    filename: 'jsp.csv'
  });
}

function run(){
  assert.strictEqual(ctx.resolveImportContext('JSP_NORD_VAUDOIS').label, 'JSP Nord vaudois');
  assert.strictEqual(ctx.resolveImportContext('MONITEURS_JSP').jspPopulation, 'MONITEURS');
  assert.ok(!ctx.visibleImportContexts().some((row) => String(row.code).indexOf('JSP_FLM_') === 0));
  assert.ok(ctx.visibleImportContexts().some((row) => row.code === 'JSP_NORD_VAUDOIS'));
  assert.ok(ctx.visibleImportContexts().some((row) => row.code === 'MONITEURS_JSP'));
  assert.strictEqual(ctx.normalizeJspGrade('Cadet'), 'Cadet');

  const flm1 = previewOf({ contexte:'JSP_NORD_VAUDOIS', file: csv('JSP001;Flm 1;MARTIN;Lea;JSP G1') });
  assert.strictEqual(flm1.lines[0].status, 'NEW_JSP');
  assert.strictEqual(flm1.lines[0].normalized.grade, 'Flm 1');
  assert.strictEqual(flm1.lines[0].diff.newAssignments[0].cible, 'JSP G1');
  assert.ok(!(flm1.lines[0].errors || []).length);

  const flm2 = previewOf({ contexte:'JSP_NORD_VAUDOIS', file: csv('JSP002;Flm 2;BERNARD;Luc;JSP C1') });
  assert.strictEqual(flm2.lines[0].normalized.grade, 'Flm 2');
  assert.strictEqual(flm2.lines[0].diff.newAssignments[0].cible, 'JSP C1');

  const cadet = previewOf({ contexte:'JSP_NORD_VAUDOIS', file: csv('JSP003;Cadet;PETIT;Nina;JSP B1') });
  assert.strictEqual(cadet.lines[0].normalized.grade, 'Cadet');
  assert.strictEqual(cadet.lines[0].diff.newAssignments[0].cible, 'JSP B1');
  assert.ok(!(cadet.lines[0].errors || []).length);

  const gradeChange = previewOf({
    contexte:'JSP_NORD_VAUDOIS',
    file: csv('JSP001;Flm 2;MARTIN;Lea;JSP G1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' })],
    assignments: [Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' })]
  });
  assert.strictEqual(gradeChange.lines[0].status, 'MODIFIED');
  assert.strictEqual(gradeChange.lines[0].diff.person.grade.after, 'Flm 2');
  assert.strictEqual(gradeChange.lines[0].diff.newAssignments.length, 0);

  const siteChange = previewOf({
    contexte:'JSP_NORD_VAUDOIS',
    file: csv('JSP001;Flm 1;MARTIN;Lea;JSP C1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' })],
    assignments: [Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' })]
  });
  assert.strictEqual(siteChange.lines[0].diff.newAssignments[0].cible, 'JSP C1');
  const siteMut = svc.planCommitMutations(siteChange, []);
  assert.strictEqual(siteMut.assignmentClosures.length, 0);

  const same = previewOf({
    contexte:'JSP_NORD_VAUDOIS',
    file: csv('JSP001;Flm 1;MARTIN;Lea;JSP G1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' })],
    assignments: [Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' })]
  });
  assert.strictEqual(same.lines[0].status, 'IDENTICAL');
  assert.strictEqual(svc.planCommitMutations(same, []).personInserts.length, 0);

  const absentYouth = previewOf({
    contexte:'JSP_NORD_VAUDOIS',
    file: csv('JSP099;Flm 1;NOUVEAU;Leo;JSP G1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' })],
    assignments: [Object.assign(aff({ domaine:'JSP', cible:'JSP G1' }), { nip:'JSP001' })],
    population: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Flm 1' })]
  });
  const missing = absentYouth.lines.find((line) => line.status === 'ABSENT_DU_NOUVEL_IMPORT');
  assert.ok(missing);
  assert.strictEqual(missing.decision, 'CONSERVER');
  assert.strictEqual(svc.planCommitMutations(absentYouth, []).assignmentClosures.length, 0);

  const dpsMonitor = previewOf({
    contexte:'MONITEURS_JSP',
    file: csv('NIP001;Sgt;DUPONT;Marc;JSP G1'),
    persons: [personRow()],
    assignments: [Object.assign(aff(), { nip:'NIP001' })]
  });
  assert.strictEqual(dpsMonitor.lines[0].status, 'NEW_ASSIGNMENT');
  assert.strictEqual(dpsMonitor.lines[0].normalized.grade, 'Sgt');
  assert.strictEqual(dpsMonitor.lines[0].diff.newAssignments[0].cible, 'JSP G1');
  assert.ok(ctx.isJspMonitor((dpsMonitor.lines[0].normalized.assignments || []).concat([aff()])));

  const dapMonitor = previewOf({
    contexte:'MONITEURS_JSP',
    file: csv('NIP001;Cpl;DUPONT;Marc;JSP C1'),
    persons: [personRow({ grade:'Cpl' })],
    assignments: [Object.assign(aff({ domaine:'DAP', cible:'Y2' }), { nip:'NIP001' })]
  });
  assert.strictEqual(dapMonitor.lines[0].diff.newAssignments[0].cible, 'JSP C1');
  assert.strictEqual(dapMonitor.lines[0].normalized.grade, 'Cpl');

  const bothOi = previewOf({
    contexte:'MONITEURS_JSP',
    file: csv('NIP001;Sgt;DUPONT;Marc;JSP G1'),
    persons: [personRow()],
    assignments: [
      Object.assign(aff(), { nip:'NIP001' }),
      Object.assign(aff({ id:'a2', domaine:'DAP', cible:'Y2' }), { nip:'NIP001' })
    ]
  });
  assert.notStrictEqual(bothOi.lines[0].status, 'NEW_PERSON');
  assert.strictEqual(svc.planCommitMutations(bothOi, []).personInserts.length, 0);

  const unknown = previewOf({ contexte:'MONITEURS_JSP', file: csv('NIP999;Sgt;INCONNU;Paul;JSP G1') });
  assert.strictEqual(unknown.lines[0].status, 'ERROR');
  assert.ok((unknown.lines[0].errors || []).some((msg) => msg.includes('absent du personnel SDIS')));

  const noSdis = previewOf({
    contexte:'MONITEURS_JSP',
    file: csv('JSP001;Sgt;MARTIN;Lea;JSP G1'),
    persons: [personRow({ nip:'JSP001', nom:'MARTIN', prenom:'Lea', grade:'Sgt' })]
  });
  assert.strictEqual(noSdis.lines[0].status, 'ERROR');
  assert.ok((noSdis.lines[0].errors || []).some((msg) => msg.includes('OI SDIS')));

  const monitorGone = previewOf({
    contexte:'MONITEURS_JSP',
    file: csv('NIP002;Sgt;AUTRE;Paul;JSP G1'),
    persons: [personRow(), personRow({ id:'p2', nip:'NIP002', nom:'AUTRE', prenom:'Paul' })],
    assignments: [
      Object.assign(aff(), { nip:'NIP001' }),
      Object.assign(aff({ id:'a2', domaine:'JSP', cible:'JSP G1' }), { nip:'NIP001' }),
      Object.assign(aff({ id:'a3' }), { nip:'NIP002' })
    ],
    population: [personRow()]
  });
  const gone = monitorGone.lines.find((line) => line.status === 'ABSENT_DU_NOUVEL_IMPORT' && line.normalized.nip === 'NIP001');
  assert.ok(gone);
  const goneMut = svc.planCommitMutations(monitorGone, []);
  assert.strictEqual(goneMut.personUpdates.length, 0);
  assert.strictEqual(goneMut.assignmentClosures.length, 0);

  const youthEvents = [
    { domaine:'JSP', statutParticipation:'PRESENT' },
    { domaine:'JSP', statutParticipation:'EXCUSE' },
    { domaine:'JSP', statutParticipation:'ABSENT' }
  ];
  const youthRate = display.jspParticipation(youthEvents);
  assert.strictEqual(youthRate.expected, 3);
  assert.strictEqual(youthRate.present, 1);
  assert.strictEqual(youthRate.excused, 1);
  assert.strictEqual(youthRate.absent, 1);

  const mixed = youthEvents.concat([{ domaine:'DPS', statutParticipation:'PRESENT' }]);
  const monitorRate = display.jspParticipation(mixed);
  assert.strictEqual(monitorRate.expected, 3);
  assert.ok(display.classifyJspRole(personRow(), [aff(), aff({ domaine:'JSP', cible:'JSP G1' })]) === 'MONITEUR');
  assert.ok(display.classifyJspRole({ grade:'Flm 1' }, [aff({ domaine:'JSP', cible:'JSP G1' })]) === 'JEUNE');

  console.log('scope-jsp-populations tests ok');
}

run();
