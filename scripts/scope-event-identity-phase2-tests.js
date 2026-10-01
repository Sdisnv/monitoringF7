'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const codes = require('../netlify/lib/_scope-event-code');
const functional = require('../netlify/lib/_scope-functional-catalog');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');

const ROOT = path.resolve(__dirname,'..');
let passed = 0;
function test(name,fn){ fn(); passed += 1; console.log(`PASS ${String(passed).padStart(2,'0')} - ${name}`); }

test('allocation initiale chronologique et séquences Stat.Com indépendantes',() => {
  const result = codes.initialAllocations([
    { eventId:'pr-late',statCom:'011PR',startsAt:'2027-03-01T19:00',oiCodes:['G1'] },
    { eventId:'pr-early',statCom:'011PR',startsAt:'2027-01-01T19:00',oiCodes:['G1'] },
    { eventId:'jsp',statCom:'010JC1',startsAt:'2027-02-01T19:00',oiCodes:['C1'] }
  ]);
  assert.equal(result.find((row) => row.eventId === 'pr-early').eventCode,'011PR.001');
  assert.equal(result.find((row) => row.eventId === 'pr-late').eventCode,'011PR.002');
  assert.equal(result.find((row) => row.eventId === 'jsp').eventCode,'010JC1.001');
});

test('code validé gelé et ajout ultérieur en fin de séquence',() => {
  const result = codes.initialAllocations([
    { eventId:'existing',eventCode:'011PR.125',statCom:'011PR',startsAt:'2027-12-01T19:00' },
    { eventId:'new-january',statCom:'011PR',startsAt:'2027-01-01T19:00' }
  ],['011PR.127']);
  assert.equal(result.length,1);
  assert.equal(result[0].eventCode,'011PR.128');
});

test('numéro supprimé réservé et jamais réutilisé',() => {
  const result = codes.initialAllocations([{ eventId:'after-delete',statCom:'011PR',startsAt:'2027-01-01T19:00' }],['011PR.125','011PR.127']);
  assert.equal(result[0].eventCode,'011PR.128');
});

test('simultanéité multi-OI reçoit des numéros distincts dans l’ordre SCOPE',() => {
  const result = codes.initialAllocations(['B2','G1','B1','C1'].map((oi) => ({ eventId:`event-${oi}`,statCom:'070F1',startsAt:'2027-01-06T18:00',oiCodes:[oi] })));
  assert.deepEqual(result.map((row) => row.eventId),['event-G1','event-C1','event-B1','event-B2']);
  assert.deepEqual(result.map((row) => row.eventCode),['070F1.001','070F1.002','070F1.003','070F1.004']);
});

test('070F1.005 peut coexister comme code exercice et code événement',() => {
  const input = Array.from({ length:5 },(_,index) => ({
    eventId:`foba-${index + 1}`,
    statCom:'070F1',
    exerciseCode:'070F1.005',
    startsAt:`2027-01-${String(index + 1).padStart(2,'0')}T18:00`
  }));
  const result = codes.initialAllocations(input);
  assert.equal(result[4].eventCode,'070F1.005');
  assert.equal(input[4].exerciseCode,'070F1.005');
});

test('égalité stricte sans ordre métier utilise a b c de façon déterministe',() => {
  const input=['c','a','b'].map((eventId) => ({ eventId,statCom:'011PR',startsAt:'2027-01-01T19:00' }));
  const result=codes.initialAllocations(input);
  assert.deepEqual(result.map((row) => row.eventCode),['011PR.001a','011PR.001b','011PR.001c']);
  assert.deepEqual(result.map((row) => row.eventId),['a','b','c']);
});

test('idempotence et tri naturel',() => {
  const input=[{ eventId:'one',statCom:'011PR',startsAt:'2027-01-01T19:00' }];
  const first=codes.initialAllocations(input);
  const second=codes.initialAllocations([{ ...input[0],eventCode:first[0].eventCode }],[first[0].eventCode]);
  assert.equal(second.length,0);
  assert.deepEqual(['011PR.010','011PR.001b','011PR.001a','010JC1.002'].sort(codes.compareEventCodes),['010JC1.002','011PR.001a','011PR.001b','011PR.010']);
  assert.ok('011PR.001a'.toLowerCase().includes('011pr.001'));
});

test('PR 1 redevient six occurrences et aucune fausse session',() => {
  const rows=functional.programmeActivityPresentation(programme.rows).filter((row) => /^Exercice PR 1(?:[.]|$)/.test(row.label));
  assert.equal(rows.length,6);
  assert.deepEqual(rows.map((row) => row.occurrenceIndex),[1,2,3,4,5,6]);
  assert.ok(rows.every((row) => row.activityLabel === 'Exercice PR 1'));
  assert.ok(rows.every((row) => row.sessionCount === 1 && row.sessionLabel === 'Aucune session distincte'));
  assert.ok(rows.every((row) => row.eventCode === null && !('eventBusinessCode' in row)));
});

test('PR 2.x est une série de six occurrences sans code événement inventé',() => {
  const rows=functional.programmeActivityPresentation(programme.rows).filter((row) => /^Exercice PR 2[.]/.test(row.label));
  assert.equal(rows.length,6);
  assert.deepEqual(rows.map((row) => row.occurrenceIndex),[1,2,3,4,5,6]);
  assert.ok(rows.every((row) => row.activityLabel === 'Exercice PR 2' && row.eventCode === null));
});

test('migration additive garantit persistance unicité et non-réutilisation',() => {
  const sql=fs.readFileSync(path.join(ROOT,'database/migrations/20260930_scope_event_identity_phase2.sql'),'utf8');
  assert.match(sql,/scope_event_code_sequences/);
  assert.match(sql,/scope_event_code_allocations/);
  assert.match(sql,/unique\(statcom_code,sequence_number,suffix\)/i);
  assert.match(sql,/scope_evenements_code_cours_uq/);
  assert.doesNotMatch(sql,/delete\s+from\s+scope_event_code_allocations/i);
});

test('publication alloue le code à l’événement et ne l’efface plus à la mise à jour',() => {
  const store=fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-qv-publication-postgres-store.js'),'utf8');
  assert.match(store,/prepareEventCodes/);
  assert.match(store,/eventCodeFor/);
  assert.match(store,/target\.event\.status, `QV:\$\{target\.publicationKey\}`, eventCode/);
  assert.doesNotMatch(store,/target\.event\.status,\s*null,\s*target\.source\.definitionId/);
});

console.log(`SCOPE EVENT IDENTITY PHASE 2: ${passed}/11 tests PASS`);
