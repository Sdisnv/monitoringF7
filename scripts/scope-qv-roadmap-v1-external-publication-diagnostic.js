'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const planner = require('../netlify/lib/_scope-qv-publication-plan');

const base = {year:2027,status:'VALIDATED',referencesValidated:true,label:'Activite externe',
  source:{definitionId:'MANUAL-EXTERNAL',occurrenceId:'EXTERNAL:1',sessionId:'EXTERNAL:1:1'},
  schedule:{startsAt:'2027-03-01T18:00',endsAt:'2027-03-01T21:00'},business:{},
  classification:{primaryDomain:'F7',publicCodes:['GEN:SAPEUR']}};
const input = programme => ({year:2027,programme:[programme],targetSnapshot:[],
  referentials:{domains:['F7'],publics:['GEN:SAPEUR']}});
const explicit = planner.buildPublicationPlan(input({...base,externalActivity:true})).decisions[0];
const mapped = planner.buildPublicationPlan(input({...base,externalHistorical:true})).decisions[0];
const unevaluated = planner.buildPublicationPlan(input({...base,participationEvaluation:false})).decisions[0];
assert.equal(mapped.action,'NOT_PUBLISHED');
assert.equal(explicit.action,'NOT_PUBLISHED');
assert.equal(explicit.target,null);
assert.equal(mapped.target,null);
assert.equal(unevaluated.action,'CREATE');
assert.equal(unevaluated.target.event.participationEvaluation,false);
const proof = {source:'PURE_PLANNER_FIXTURES',externalActivityOnly:{action:explicit.action,reason:explicit.reason},
  recognizedExternalHistorical:{action:mapped.action,reason:mapped.reason},
  internalUnevaluated:{action:unevaluated.action,participationEvaluation:unevaluated.target.event.participationEvaluation},
  requiresCallerExclusion:explicit.action === 'CREATE',
  interpretation:'External activities are excluded from operational publication. Internal statistical opt-out does not prevent publication.',
  productionWrites:false};
const output=path.resolve(__dirname,'../docs/captures/qv-roadmap-v1-20261012/external-publication-diagnostic.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
