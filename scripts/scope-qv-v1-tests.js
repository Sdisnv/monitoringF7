'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../assets/js/scope-ui-logic'),C=require('../assets/js/scope-qv-coverage'),CTA=require('../netlify/lib/_scope-cta-rules');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const qv=require('../output/qv-v1-tests19-33/current.json');
test('Families preserve explicit values independently of domain, OI and Stat.Com',()=>{
  assert.equal(L.qvProgrammeFamily({domain:'PR',family:'FOSPEC'}),'FOSPEC');
  assert.equal(L.qvProgrammeFamily({domain:'AUTO'}),'');
  assert.equal(L.qvProgrammeFamily({domain:'F1',family:'DAP',ois:['Y1'],statCom:'070F23'}),'DAP');
  assert.deepEqual(L.qvProgrammeFamilyCatalogue().slice(0,4),['SDIS','DPS','DAP','JSP']);
  for(const family of ['Autre','Sans famille spécifique','Transversale / non qualifiée']) assert.equal(L.qvProgrammeFamily({family}),'');
  assert.ok(L.qvProgrammeFamilyCatalogue([{family:'Institutionnelle'}]).includes('Institutionnelle'));
  const {hooks}=createCatalogUiHarness();
  const programme=hooks.renderQuoVadisProgrammeHtml(qv);
  const arbitrer=hooks.renderQuoVadisArbitrerHtml(qv);
  for(const html of [programme,arbitrer]){
    const select=html.match(/<select id="qv-filter-family">([\s\S]*?)<\/select>/)[1];
    assert.match(select,/value="SDIS"/);assert.match(select,/value="__EMPTY__"/);
    assert.ok(select.indexOf('value="SDIS"')<select.indexOf('value="DPS"'));
  }
  const missing=hooks.quoVadisProgrammeExport(qv,{family:'__EMPTY__'}).rows;
  assert.ok(missing.length);assert.ok(missing.every(row=>!row.famille));
  const unsafe='Historique "><img src=x onerror=alert(1)>';
  const withHistory={...qv,canonicalProgramme:{...qv.canonicalProgramme,rows:[...qv.canonicalProgramme.rows,{...qv.canonicalProgramme.rows[0],family:unsafe}]}};
  const escaped=hooks.renderQuoVadisProgrammeHtml(withHistory);
  assert.doesNotMatch(escaped,/<img src=x onerror/);assert.match(escaped,/&lt;img src=x onerror/);
});
test('CTA exception requires real type, active public and matching canonical week',()=>{
  const row={label:'Instr demi-sct - KICK-OFF',ois:['G1'],publics:['N04a'],startsAt:'2027-02-06T08:00',domain:'DPS'};
  assert.equal(C.programmeDayControl(row,qv),null);
  assert.ok(C.programmeDayControl({...row,publics:['N06a']},qv));
  assert.ok(C.programmeDayControl({...row,label:'Séance instruction DPS'},qv));
  assert.ok(C.programmeDayControl({...row,publics:['N01a']},qv));
  assert.ok(C.programmeDayControl({...row,domain:'PR',statCom:'011PR'},qv));
  const holiday={...row,startsAt:'2027-01-01T08:00',publics:[CTA.instructionPublicForDate('2027-01-01','G1','demi-section')]};
  assert.equal(C.programmeDayControl(holiday,qv).dayClass,'INTERDIT');
  assert.equal(qv.ctaParameters.reinitialisationAnnuelle,false);
});
test('CSV includes family, code-only domain and keeps OI/Public neighbours',()=>{
  const {hooks}=createCatalogUiHarness();
  const model=hooks.quoVadisProgrammeExport(qv),csv=hooks.quoVadisProgrammeCsvText(model.rows);
  assert.match(csv.split('\r\n')[0],/"Domaine";"Famille";"OI";"Public cible"/);
  assert.doesNotMatch(csv,/F0 Gouvernance|F1 Personnel|F7 Formation|undefined/);
  assert.ok(model.rows.every(row=>Object.hasOwn(row,'famille')));
});
test('Technical review errors are rendered as business messages',()=>{
  assert.doesNotMatch(L.friendlyError({error:'HUMAN_REVIEW_REQUIRED',message:'undefined internal-id'}).message,/undefined|HUMAN_REVIEW_REQUIRED|internal-id/);
});
