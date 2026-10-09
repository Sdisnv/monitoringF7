'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ecawin = require('../assets/js/scope-ecawin');
const statCom = require('../netlify/lib/_scope-statcom-referential');

test('seules les associations MOA explicites sont qualifiées',()=>{
  assert.equal(ecawin.complete,false);
  assert.equal(ecawin.associations.length,12);
  assert.equal(ecawin.activityForStatCom('010JC1'),'EXERCI');
  assert.equal(ecawin.activityForStatCom('COURJSP'),'COURS');
  assert.equal(ecawin.activityForStatCom('COURJS'),'');
  assert.equal(ecawin.activityForStatCom('EMSEA'),'');
  assert.equal(ecawin.isCompatible('COURS','011PR'),false);
  assert.equal(ecawin.isCompatible('EXOFSI','0162F7'),true);
});
test('les trois codes restent distincts et les associations absentes ne sont pas inventées',()=>{
  const rows = ecawin.correspondenceRows([{id:'test',businessCode:'011PR.001',statCom:'011PR',ecawinActivityCode:'EXERCI'},
    {id:'no-code',activityLabel:'Sans code'}, {id:'EM',statCom:'EMSEA'}, {id:'historical',statCom:'010JY3'}]);
  assert.equal(rows[0].scopeOccurrenceCode,'011PR.001');assert.equal(rows[0].activityCode,'EXERCI');
  assert.equal(rows[0].statCom,'011PR');assert.equal(rows[0].associationConfirmed,true);
  assert.equal(rows[0].status,'DESCRIPTION_PENDING');assert.equal(rows[0].exportable,false);
  for(const row of rows.slice(1)){assert.equal(row.activityCode,'');assert.equal(row.exportable,false);}
  assert.equal(rows[1].scopeOccurrenceCode,'');assert.equal(rows[3].statCom,'010JY3');
});
test('le code JSP Y3 historique ne subit plus de conversion automatique',()=>{
  assert.equal(statCom.resolveStatComCode('010JY3','2027-01-01').canonicalCode,'010JY3');
  assert.equal(statCom.resolveStatComCode('010JY3','2027-01-01').successionApplied,false);
  assert.equal(statCom.initialStatComCodes().some(row=>row.code === '010JY3'),false);
  assert.equal(statCom.initialStatComCodes().find(row=>row.code === 'EMSEA').code,'EMSEA');
});

test('les décisions validées conservent les liens de référentiels pour leur reconduction',()=>{
  const consolidation = require('../netlify/lib/_scope-quo-vadis-consolidation');
  const fields = {activityLabel:'Recette',statCom:'011PR',ecawinActivityCode:'EXERCI',
    qualificationCodes:['PAPR'],specialisation:'PAPR',cursusId:'00000000-0000-4000-8000-000000000001',cursus:'Référence de recette'};
  const snapshot = consolidation.businessSnapshot(fields);
  for(const key of ['ecawinActivityCode','qualificationCodes','specialisation','cursusId','cursus']) assert.deepEqual(snapshot[key],fields[key]);
  snapshot.qualificationCodes.push('PABC');assert.deepEqual(fields.qualificationCodes,['PAPR']);
});
