'use strict';
const assert = require('assert');
const display = require('../assets/js/scope-personnel-display.js');
const svc = require('../netlify/functions/_scope-personnel-service.js');
const ctx = require('../netlify/functions/_scope-personnel-import-contexts.js');

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

function preview(contexte, file, persons, assignments){
  const resolved = svc.resolveImportContext(contexte);
  const personsMap = new Map();
  (persons || []).forEach((row) => personsMap.set(row.nip, row));
  const assignmentsMap = new Map();
  (assignments || []).forEach((row) => {
    if(!assignmentsMap.has(row.nip)) assignmentsMap.set(row.nip, []);
    assignmentsMap.get(row.nip).push(row);
  });
  const rows = svc.normalizeRows(svc.parsePersonnelCsv(file), resolved.code, null);
  return svc.buildPreview({
    rows,
    existingPersons: personsMap,
    existingAssignments: assignmentsMap,
    population: [],
    resolved,
    siteJsp: null,
    anneeMonitoring: 2026,
    filename: 'auto.csv'
  });
}

function person(){
  return { id:'p1', nip:'NIP001', grade:'Sgt', nom:'DUPONT', prenom:'Marc' };
}

function run(){
  assert.strictEqual(display.formatSpecializations([
    { domaine:'PR', cible:'PR' },
    { domaine:'AUTO', cible:'VL_DPS' }
  ]).text, 'PAPR, cond VL');
  assert.strictEqual(display.formatSpecializations([
    { domaine:'AUTO', cible:'VL_DPS' },
    { domaine:'AUTO', cible:'PL' }
  ]).text, 'cond VL, cond PL');
  assert.strictEqual(display.formatSpecializations([
    { domaine:'AUTO', cible:'VL_DAP' },
    { domaine:'AUTO', cible:'PL' }
  ]).text, 'cond VL, cond PL');
  assert.strictEqual(display.formatSpecializations([
    { domaine:'FOBA', cible:'2' },
    { domaine:'PR', cible:'PR' }
  ]).text, 'FOBA 2, PAPR');
  assert.strictEqual(display.formatSpecializations([
    { domaine:'AUTO', cible:'VL_DPS' },
    { domaine:'AUTO', cible:'VL_DAP' },
    { domaine:'AUTO', cible:'PL' }
  ]).text, 'cond VL, cond PL');
  assert.ok(!display.formatSpecializations([{ domaine:'PR', cible:'PR' }]).text.includes('PR PR'));
  assert.ok(!/AUTO_VL_DPS|VL_DPS|FOBA_2/.test(display.formatSpecializations([
    { domaine:'AUTO', cible:'VL_DPS' },
    { domaine:'FOBA', cible:'2' }
  ]).text));

  const dpsOnly = [oi(), spec({ cible:'VL_DPS' })];
  assert.strictEqual(display.countsInVlDpsEffectif(dpsOnly, '2026-03-15'), true);
  assert.strictEqual(display.countsInPlEffectif(dpsOnly, '2026-03-15'), false);

  const both = [oi(), spec({ cible:'VL_DPS' }), spec({ cible:'PL' })];
  assert.strictEqual(display.countsInVlDpsEffectif(both, '2026-03-15'), false);
  assert.strictEqual(display.countsInPlEffectif(both, '2026-03-15'), true);
  assert.ok(display.evaluateAutoSpecializations(both, '2026-03-15', 'AUTO_VL_DPS').infos.includes(display.MSG_PL_PRIORITY));
  assert.strictEqual(display.evaluateAutoSpecializations(both, '2026-03-15', 'AUTO_VL_DPS').anomalies.length, 0);

  const timed = [
    oi(),
    spec({ cible:'VL_DPS', date_actif:'2026-01-01' }),
    spec({ cible:'PL', date_actif:'2026-06-01' })
  ];
  assert.strictEqual(display.countsInVlDpsEffectif(timed, '2026-05-15'), true);
  assert.strictEqual(display.countsInPlEffectif(timed, '2026-05-15'), false);
  assert.strictEqual(display.countsInVlDpsEffectif(timed, '2026-06-15'), false);
  assert.strictEqual(display.countsInPlEffectif(timed, '2026-06-15'), true);

  const closedPl = [
    oi(),
    spec({ cible:'VL_DPS', date_actif:'2026-01-01' }),
    spec({ cible:'PL', date_actif:'2026-06-01', date_inactif:'2026-08-31' })
  ];
  assert.strictEqual(display.countsInVlDpsEffectif(closedPl, '2026-09-01'), true);
  assert.strictEqual(display.countsInPlEffectif(closedPl, '2026-09-01'), false);

  const dapVl = [oi({ domaine:'DAP', cible:'Y2' }), spec({ cible:'VL_DAP' })];
  assert.strictEqual(display.countsInVlDapEffectif(dapVl, '2026-03-15'), true);

  const doubleInc = [
    oi({ domaine:'DAP', cible:'Y2' }),
    oi({ domaine:'DPS', cible:'G1' }),
    spec({ cible:'VL_DAP' }),
    spec({ cible:'PL' })
  ];
  assert.strictEqual(display.countsInVlDapEffectif(doubleInc, '2026-03-15'), true);
  assert.strictEqual(display.countsInPlEffectif(doubleInc, '2026-03-15'), true);
  assert.strictEqual(display.countsInVlDpsEffectif(doubleInc, '2026-03-15'), false);

  const plWithoutDps = [oi({ domaine:'DAP', cible:'Y2' }), spec({ cible:'PL' })];
  const bad = display.evaluateAutoSpecializations(plWithoutDps, '2026-03-15', 'AUTO_PL');
  assert.ok(bad.anomalies.includes(display.MSG_PL_WITHOUT_DPS));
  assert.strictEqual(display.countsInPlEffectif(plWithoutDps, '2026-03-15'), false);

  const dapVlPlNoDps = [oi({ domaine:'DAP', cible:'Y2' }), spec({ cible:'VL_DAP' }), spec({ cible:'PL' })];
  assert.strictEqual(display.countsInVlDapEffectif(dapVlPlNoDps, '2026-03-15'), true);
  assert.ok(display.evaluateAutoSpecializations(dapVlPlNoDps, '2026-03-15', 'AUTO_VL_DAP').anomalies.includes(display.MSG_PL_WITHOUT_DPS));

  assert.ok(!Object.keys(ctx.IMPORT_CONTEXTS).some((code) => /PL.*DAP|DAP.*PL/.test(code)));
  assert.ok(!Object.keys(ctx.IMPORT_CONTEXTS).includes('AUTO_PL_DAP'));

  const counts = svc.computeEffectifsFromAssignments([
    Object.assign(oi(), { personne_id:'p-vl' }),
    Object.assign(spec({ cible:'VL_DPS' }), { personne_id:'p-vl' }),
    Object.assign(oi(), { personne_id:'p-both' }),
    Object.assign(spec({ cible:'VL_DPS' }), { personne_id:'p-both' }),
    Object.assign(spec({ cible:'PL' }), { personne_id:'p-both' })
  ], '2026-03-15');
  assert.strictEqual(counts['AUTO VL_DPS'], 1);
  assert.strictEqual(counts['AUTO PL'], 1);

  const importVlOnPl = preview('AUTO_VL_DPS', csv('NIP001;Sgt;DUPONT;Marc;DPS G1'), [person()], [
    Object.assign(oi(), { nip:'NIP001' }),
    Object.assign(spec({ cible:'PL' }), { nip:'NIP001' })
  ]);
  assert.strictEqual(importVlOnPl.wrote, false);
  assert.strictEqual(importVlOnPl.lines[0].status, 'NEW_ASSIGNMENT');
  assert.ok((importVlOnPl.lines[0].infos || []).includes(display.MSG_PL_PRIORITY));
  assert.ok(!(importVlOnPl.lines[0].errors || []).length);
  assert.strictEqual(importVlOnPl.lines[0].diff.newAssignments[0].cible, 'VL_DPS');
  assert.ok(!importVlOnPl.lines[0].diff.newAssignments.some((row) => row.cible === 'PL' && row.date_inactif));

  const importPlOnVl = preview('AUTO_PL', csv('NIP001;Sgt;DUPONT;Marc;DPS G1'), [person()], [
    Object.assign(oi(), { nip:'NIP001' }),
    Object.assign(spec({ cible:'VL_DPS' }), { nip:'NIP001' })
  ]);
  assert.strictEqual(importPlOnVl.lines[0].status, 'NEW_ASSIGNMENT');
  assert.ok((importPlOnVl.lines[0].infos || []).includes(display.MSG_PL_PRIORITY));
  assert.strictEqual(importPlOnVl.lines[0].diff.newAssignments[0].cible, 'PL');

  const importPlDapDps = preview('AUTO_PL', csv('NIP001;Sgt;DUPONT;Marc;DAP Y2'), [person()], [
    Object.assign(oi({ domaine:'DAP', cible:'Y2' }), { nip:'NIP001' }),
    Object.assign(oi({ domaine:'DPS', cible:'G1' }), { nip:'NIP001' })
  ]);
  assert.strictEqual(importPlDapDps.lines[0].status, 'NEW_ASSIGNMENT');
  assert.ok(!(importPlDapDps.lines[0].warnings || []).includes(display.MSG_PL_WITHOUT_DPS));

  const importPlDapOnly = preview('AUTO_PL', csv('NIP001;Sgt;DUPONT;Marc;DAP Y2'), [person()], [
    Object.assign(oi({ domaine:'DAP', cible:'Y2' }), { nip:'NIP001' })
  ]);
  assert.ok((importPlDapOnly.lines[0].warnings || []).includes(display.MSG_PL_WITHOUT_DPS));
  assert.strictEqual(importPlDapOnly.lines[0].status, 'NEW_ASSIGNMENT');

  const importDapWithPl = preview('AUTO_VL_DAP', csv('NIP001;Sgt;DUPONT;Marc;DAP Y2'), [person()], [
    Object.assign(oi({ domaine:'DAP', cible:'Y2' }), { nip:'NIP001' }),
    Object.assign(oi({ domaine:'DPS', cible:'G1' }), { nip:'NIP001' }),
    Object.assign(spec({ cible:'PL' }), { nip:'NIP001' })
  ]);
  assert.strictEqual(importDapWithPl.lines[0].status, 'NEW_ASSIGNMENT');
  assert.strictEqual(importDapWithPl.lines[0].diff.newAssignments[0].cible, 'VL_DAP');
  assert.strictEqual(importDapWithPl.lines[0].diff.auto.countsInVlDapEffectif, true);
  assert.ok(!(importDapWithPl.lines[0].infos || []).includes(display.MSG_PL_PRIORITY));

  console.log('scope-auto-specializations-priority tests ok');
}

run();
