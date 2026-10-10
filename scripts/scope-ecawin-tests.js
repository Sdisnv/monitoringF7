'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ecawin = require('../assets/js/scope-ecawin');
const statCom = require('../netlify/lib/_scope-statcom-referential');

test('seules les associations MOA explicites sont qualifiées',()=>{
  assert.equal(ecawin.complete,true);
  assert.equal(ecawin.associations.length,61);
  assert.equal(ecawin.associations.filter(row=>row.active).length,60);
  assert.equal(new Set(ecawin.associations.map(row=>row.statCom)).size,61);
  assert.equal(ecawin.associations.find(row=>row.statCom === '0153F7').description,'Instrcution AUTO BAT');
  assert.equal(ecawin.associations.some(row=>row.activityCode === 'EXERPO'),false);
  assert.deepEqual(ecawin.unresolvedAssociations,[]);
  assert.equal(ecawin.activityForStatCom('CONCOUR'),'EXERCI');
  assert.equal(ecawin.activityForStatCom('CONCOU'),'');
  assert.equal(ecawin.activityForStatCom('CONCOURS'),'');
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
  assert.equal(rows[0].status,'QUALIFIED');assert.equal(rows[0].exportable,true);
  assert.equal(rows[0].officialDescription,'Exercice PR');
  for(const row of rows.slice(1)){assert.equal(row.activityCode,'');assert.equal(row.exportable,false);}
  assert.equal(rows[1].scopeOccurrenceCode,'');assert.equal(rows[3].statCom,'010JY3');
  assert.equal(rows[2].status,'SCOPE_ONLY');assert.equal(rows[3].status,'HISTORICAL_ONLY');
  assert.equal(ecawin.isCompatible('EXERCI','010JY3'),false);
});
test('la capture conservee est la source exacte du registre',()=>{
  const fs = require('node:fs');
  const path = require('node:path');
  const crypto = require('node:crypto');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',ecawin.sourceImage.path))).digest('hex'),ecawin.sourceImage.sha256);
  assert.ok(ecawin.associations.every(row=>row.description && row.source === (row.statCom === 'CONCOUR' ? 'MOA_CONCOUR_20261010' : ecawin.source)));
});
test('une reference suspendue, absente ou expiree ne devient pas exportable',()=>{
  const row = {statCom:'011PR',ecawinActivityCode:'EXERCI',startsAt:'2027-06-15T14:00:00'};
  for(const references of [[],[{code:'011PR',active:false}],
    [{code:'011PR',active:true,validTo:'2026-12-31'}],[{code:'011PR',active:true,validFrom:'2028-01-01'}]]){
    const result = ecawin.correspondenceRows([row],references)[0];
    assert.equal(result.associationConfirmed,true);
    assert.equal(result.exportable,false);
    assert.equal(result.status,'REFERENCE_NOT_APPLICABLE');
  }
  assert.equal(ecawin.correspondenceRows([row],[{code:'011PR',active:true,validFrom:'2023-01-01'}])[0].exportable,true);
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
