'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const planner=require('../netlify/lib/_scope-qv-publication-plan');
const fixture=require('./scope-c20-quo-vadis-integration-architecture-1');
const item=()=>fixture.buildDataset().find(row=>row.caseId==='SIMPLE-VULCAIN');
const plan=programme=>planner.buildPublicationPlan({year:2027,programme,referentials:fixture.REFERENTIALS,
  targetSnapshot:[],generatedAt:fixture.GENERATED_AT});
test('une activite externe reste au planning sans publication ni population SCOPE',()=>{
  const source={...item(),externalActivity:true,participationEvaluation:true};
  const before=structuredClone(source);
  const decision=plan([source]).decisions[0];
  assert.equal(decision.action,'NOT_PUBLISHED');assert.equal(decision.reason,'EXTERNAL_ACTIVITY_OUTSIDE_SCOPE');
  assert.equal(decision.target,null);assert.deepEqual(source,before);
});
test('une activite interne non evaluee reste publiable apres les gardes existants',()=>{
  const enabled=plan([item()]).decisions[0];
  const disabled=plan([{...item(),participationEvaluation:false}]).decisions[0];
  assert.equal(enabled.action,'CREATE');assert.equal(disabled.action,'CREATE');
  assert.equal(disabled.target.event.participationEvaluation,false);
  assert.deepEqual(disabled.target.relations,enabled.target.relations);
});
