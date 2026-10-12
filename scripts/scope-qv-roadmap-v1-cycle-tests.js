'use strict';

const assert = require('node:assert/strict');
const {test} = require('node:test');
const cycles = require('../netlify/lib/_scope-programme-cycle');
const {createScopeQuoVadisService} = require('../netlify/lib/_scope-quo-vadis-service');

const reports = [
  {itemId:'actual-2027',sourceType:'PROGRAMME_ITEM',actualDate:'2027-02-23',closesCycleYear:2026},
  {itemId:'fixture-2028',sourceType:'FUTURE_DATE',actualDate:'2028-02-02',closesCycleYear:2027}
];

test('closing reports define business years independently of civil dates',()=>{
  const cycle = cycles.resolveProgrammeCycle(2027,{},reports);
  assert.equal(cycle.startDate,'2027-02-24');
  assert.equal(cycle.endDate,'2028-02-02');
  assert.equal(cycle.generationAllowed,true);
  const explicitlyPending = cycles.resolveProgrammeCycle(2027,{programmeCycle:{parametersDefined:false}},reports);
  assert.equal(explicitlyPending.parametersDefined,false);
  assert.equal(explicitlyPending.generationAllowed,false);
  assert.equal(cycles.classifyProgrammeDate(cycle,'2028-01-28'),'IN_CYCLE');
  assert.equal(cycles.classifyProgrammeDate(cycle,'2028-02-03'),'OUTSIDE_CYCLE');
  const next = cycles.resolveProgrammeCycle(2028,{},reports);
  assert.equal(next.startDate,'2028-02-03');
  assert.equal(next.endDate,null);
  assert.equal(next.parametersDefined,false);
  assert.equal(next.generationAllowed,false);
});

test('missing and ambiguous closing dates remain pending',()=>{
  assert.equal(cycles.resolveProgrammeCycle(2027,{},reports.slice(0,1)).endDate,null);
  assert.equal(cycles.resolveProgrammeCycle(2027,{},reports.concat({...reports[1],itemId:'other'})).endDate,null);
  assert.equal(cycles.date('2028-13-01'),null);
  assert.equal(cycles.date('2028-02-30'),null);
  assert.equal(cycles.date(new Date(NaN)),null);
  assert.equal(cycles.date(new Date(2028,0,1)),'2028-01-01');
  assert.equal(cycles.resolveProgrammeCycle(2027,{programmeCycle:{closingReport:{itemId:'fixture-2028',sourceType:'PROGRAMME_ITEM'}}},reports).endDate,null);
});

test('exact occurrence matching preserves domain-qualified OI and human titles',()=>{
  const left = {definitionId:'definition',activityLabel:'Human title',statCom:'CODE',oiSelections:['DPS:G1'],
    startsAt:'2028-01-28T18:00',endsAt:'2028-01-28T20:00'};
  assert.equal(cycles.sameOccurrence(left,{...left,activityLabel:'Type title'}),true);
  assert.equal(cycles.sameOccurrence(left,{...left,oiSelections:['JSP:G1']}),false);
  assert.equal(cycles.sameOccurrence(left,{...left,oiSelections:['G1']}),false);
  assert.equal(cycles.sameOccurrence(left,{...left,startsAt:'2028-01-29T18:00'}),false);
  assert.equal(cycles.sameOccurrence(left,{...left,startsAt:new Date('2028-01-28T18:00:00Z'),endsAt:new Date('2028-01-28T20:00:00Z')}),true);
});

test('cycle GET validates its year before querying PostgreSQL',async()=>{
  const service = createScopeQuoVadisService({database:{query:()=>{throw new Error('Unexpected SQL');}}});
  await assert.rejects(service.getProgrammeCycle('invalid'),error=>error.status===422 && error.error==='programme_annee_invalide');
  await assert.rejects(service.getProgrammeCycle(2101),error=>error.status===422);
});
