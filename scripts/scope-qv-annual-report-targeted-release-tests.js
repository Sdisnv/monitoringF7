'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { REPORT,PRODUCTION,PLAN,parseArgs,assertSingleReportPlan } = require('./scope-qv-annual-report-targeted-release');

const clone = ['--target','clone','--expected-host','127.0.0.1',
  '--expected-database','scope_qv_2027_recipe_20261006'];
const production = ['--target','production','--expected-host',PRODUCTION.host,
  '--expected-database',PRODUCTION.database];
const confirmation = ['--apply','--confirm-event-id',REPORT.eventId,
  '--confirm-old-date',REPORT.oldDate,'--confirm-new-date',REPORT.newDate];

test('Rapport annuel defaults to dry-run with an explicit target',() => {
  assert.deepEqual(parseArgs(clone),{mode:'clone',host:'127.0.0.1',
    database:'scope_qv_2027_recipe_20261006',apply:false});
  assert.equal(parseArgs(production).apply,false);
  assert.throws(() => parseArgs([]));
  assert.throws(() => parseArgs(['--target','clone']));
  assert.throws(() => parseArgs([...clone,'--unknown']));
});

test('Rapport annuel refuses an unexpected production target',() => {
  assert.throws(() => parseArgs(['--target','production','--expected-host','127.0.0.1',
    '--expected-database',PRODUCTION.database]));
  assert.throws(() => parseArgs(['--target','production','--expected-host',PRODUCTION.host,
    '--expected-database','scope_qv_2027_recipe_20261006']));
});

test('Rapport annuel apply requires exact event and dates',() => {
  assert.equal(parseArgs([...clone,...confirmation]).apply,true);
  assert.throws(() => parseArgs([...clone,'--apply']));
  assert.throws(() => parseArgs([...clone,...confirmation.slice(0,-1),'2027-02-24']));
  assert.throws(() => parseArgs([...clone,...confirmation,'--apply']));
});

test('Rapport annuel production apply has a separate gate',() => {
  const before = process.env.SCOPE_QV_RA_PRODUCTION_APPLY_ENABLED;
  try{
    delete process.env.SCOPE_QV_RA_PRODUCTION_APPLY_ENABLED;
    assert.throws(() => parseArgs([...production,...confirmation]));
    process.env.SCOPE_QV_RA_PRODUCTION_APPLY_ENABLED = 'YES';
    assert.equal(parseArgs([...production,...confirmation]).apply,true);
  }finally{
    if(before === undefined) delete process.env.SCOPE_QV_RA_PRODUCTION_APPLY_ENABLED;
    else process.env.SCOPE_QV_RA_PRODUCTION_APPLY_ENABLED = before;
  }
});

test('Rapport annuel refuses an unapproved publication plan before update',() => {
  assert.deepEqual(PLAN,{CREATE:0,UPDATE:1,UNCHANGED:124,BLOCKED:725,NOT_PUBLISHED:0});
  assert.throws(() => assertSingleReportPlan({summary:{...PLAN,CREATE:1},decisions:[]},[]));
  assert.throws(() => assertSingleReportPlan({summary:PLAN,decisions:[]},[]));
  assert.throws(() => assertSingleReportPlan({summary:PLAN,decisions:Array(850).fill({action:'BLOCKED'})},
    Array(125).fill({eventId:REPORT.eventId,publicationKey:REPORT.publicationKey})));
});
