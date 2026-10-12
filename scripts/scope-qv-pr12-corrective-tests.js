'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const logic=require('../assets/js/scope-ui-logic');
const cycle=require('../netlify/lib/_scope-programme-cycle');
const papr=require('../netlify/lib/_scope-qv-papr-rules');
const revisions=require('../netlify/lib/_scope-qv-programme-revisions');
const codes=require('../netlify/lib/_scope-event-code');
const planner=require('../netlify/lib/_scope-qv-publication-plan');
const fixture=require('./scope-c20-quo-vadis-integration-architecture-1');
const item=()=>fixture.buildDataset().find(row=>row.caseId==='SIMPLE-VULCAIN');
const plan=source=>planner.buildPublicationPlan({year:2027,programme:[source],referentials:fixture.REFERENTIALS,
  targetSnapshot:[],generatedAt:fixture.GENERATED_AT}).decisions[0];
test('explicit planning change is major for a publication, not an editorial change',()=>{
  assert.deepEqual(revisions.revisionChanges({planningStatus:'PLANIFIE'},{planningStatus:'A_PLANIFIER'}),
    {changedFields:['planningStatus'],kind:'MAJOR'});
});
test('PAPR preparation belongs to 2027 without changing cycle boundaries or other activities',()=>{
  const bounds={year:2027,startDate:'2027-03-05',endDate:'2028-02-10'};
  for(const [module,date] of [[1,'2027-02-02'],[2,'2027-02-16']]){
    const row={label:`Cursus PAPR - module ${module}`};row.preparatoryCycle=papr.preparatoryCycle(row,2027);
    assert.equal(cycle.classifyProgrammeDate(bounds,date,row),'PREPARATORY_CURSUS');
  }
  assert.equal(cycle.classifyProgrammeDate(bounds,'2027-02-16'),'OUTSIDE_CYCLE');
  assert.equal(papr.preparatoryCycle({label:'Cursus PAPR - module 3'},2027),null);
  assert.equal(papr.preparatoryCycle({label:'Cursus PAPR - module 1'},2028),null);
  assert.deepEqual(bounds,{year:2027,startDate:'2027-03-05',endDate:'2028-02-10'});
});
test('internal manifestations use qualified DPS/DAP publics and the stable C scrt reference',()=>{
  const source={label:'Journée des familles',domain:'F3'};
  for(const domain of ['DPS','DAP']){
    const defaults=logic.qvProgrammeManifestationDefaults(source,[`${domain}:${domain==='DPS'?'G1':'Y4'}`]);
    assert.deepEqual(defaults.publicCodes,[`GEN:SAPEUR-${domain}`,'FOBA:1','FOBA:2']);
    assert.deepEqual(defaults.responsibleSelections,[{kind:'REFERENCE',code:'C scrt',label:'C sct'}]);
    assert.equal(defaults.sold,false);assert.equal(defaults.ecawinExport,true);
  }
  assert.deepEqual(logic.qvProgrammeManifestationDefaults(source,['UNQUALIFIED:G1']).publicCodes,[]);
  assert.equal(logic.qvProgrammeManifestationDefaults({...source,externalActivity:true},['DPS:G1']),null);
});
test('unpaid internal event is publishable with independent evaluation and export flags',()=>{
  const source={...item(),sold:false,ecawinExport:true,ecawinActivityCode:'EXERCI',
    participationEvaluation:false,business:{statComCode:null,businessCode:'SCOPE-000001'}};
  const decision=plan(source);assert.equal(decision.action,'CREATE');
  assert.equal(decision.target.activity.statComCode,null);
  assert.equal(decision.target.event.sold,false);assert.equal(decision.target.event.ecawinExport,true);
  assert.equal(decision.target.event.participationEvaluation,false);
  assert.deepEqual(decision.target.relations,plan(item()).target.relations);
  assert.equal(plan({...source,participationEvaluation:true,ecawinExport:false}).action,'CREATE');
  assert.equal(plan({...source,business:{statComCode:null,businessCode:null}}).reason,'INTERNAL_SCOPE_CODE_REQUIRED');
});
test('internal identity never parses as Stat.Com and is allocated by the database sequence',async()=>{
  assert.equal(codes.parseEventCode('SCOPE-000001'),null);
  assert.match(await codes.allocateInternalEventCode(async sql=>{
    assert.equal(sql,"select nextval('scope_internal_event_code_seq')::text as number");return {rows:[{number:'12'}]};
  }),/^SCOPE-000012$/);
});
test('default flags retain historic publication fingerprints',()=>{
  const original=plan(item()).target;
  assert.equal(planner.targetFingerprint(original),planner.targetFingerprint({...original,
    event:{...original.event,sold:true,ecawinExport:false,ecawinActivityCode:''}}));
});
test('ECAwin UI keeps dropdown and independent controls, without the search field',()=>{
  const ui=fs.readFileSync(require.resolve('../assets/js/scope-ui'),'utf8');
  assert.doesNotMatch(ui,/qv-programme-ecawin-search/);
  for(const id of ['qv-programme-ecawin','qv-programme-sold','qv-programme-ecawin-export']) assert.ok(ui.includes(`id="${id}"`));
  assert.match(ui,/dataset\.manual==='true'/);
});
