'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildCurrentCandidateDataset } = require('./lib/scope-c22-canonical-dataset');

const INPUT = path.resolve(__dirname,'../outputs/qv-2027-sql-recette/local-readonly-diff.json');
const OUTPUT = path.resolve(__dirname,'../outputs/qv-2027-sql-recette/update-review.json');
const DATE_FIELDS = new Set(['event.startsAt','event.endsAt','event.startDate','event.endDate']);

function classify(row){
  const fields = row.changedFields || [];
  if(row.id.startsWith('CTA-PERM-')){
    return fields.some((field) => DATE_FIELDS.has(field))
      ? { category:'BLOCKED_REAL_CONFLICT',reason:'CTA_PUBLISHED_DATE_DIFFERS_FROM_CANONICAL_PREPARATION' }
      : { category:'NO_CHANGE_REQUIRED',reason:'CTA_PUBLISHED_SITE_ASSIGNMENT_MUST_NOT_BE_REPLACED_BY_GLOBAL_PREPARATION' };
  }
  if(fields.includes('event.primaryDomain'))
    return { category:'BLOCKED_REAL_CONFLICT',reason:'PUBLISHED_SQL_DOMAIN_DIFFERS_FROM_CURRENT_BUSINESS_MAPPING' };
  if(fields.includes('relations.targetCodes') || fields.includes('event.family'))
    return { category:'BLOCKED_REAL_CONFLICT',reason:'PUBLISHED_TARGET_OR_FAMILY_DIFFERS_FROM_PREPARATION' };
  if(fields.includes('event.locationCode'))
    return { category:'BLOCKED_REAL_CONFLICT',reason:'PUBLISHED_LOCATION_DIFFERS_FROM_PREPARATION' };
  if(fields.includes('event.responsibleId'))
    return { category:'BLOCKED_REAL_CONFLICT',reason:'PUBLISHED_RESPONSIBLE_DIFFERS_FROM_PREPARATION' };
  if(fields.includes('relations.publicCodes') && (row.before?.['relations.publicCodes'] || []).length === 0
    && (row.after?.['relations.publicCodes'] || []).length > 0)
    return { category:'SAFE_UPDATE',reason:'CANONICAL_PUBLIC_ADDITION_AFTER_PRESERVING_UNSPECIFIED_FIELDS' };
  return { category:'NO_CHANGE_REQUIRED',reason:'ADAPTER_DEFAULT_OR_ABSENT_SOURCE_FIELD_MUST_PRESERVE_PUBLICATION' };
}

async function buildReview(){
  const diff = JSON.parse(fs.readFileSync(INPUT,'utf8'));
  const dataset = await buildCurrentCandidateDataset();
  const byId = new Map(dataset.programme.map((row) => [row.caseId,row]));
  const updates = diff.diff.changedRows.filter((row) => row.action === 'UPDATE'
    && !['qv-source-862','qv-source-921'].includes(row.id));
  assert.equal(updates.length,110);
  const rows = updates.map((row) => {
    const source = byId.get(row.id);
    assert.ok(source,row.id);
    return { id:row.id,label:source.label,...classify(row),changedFields:row.changedFields,
      before:row.before,after:row.after,
      canonicalStatus:source.status,sourceDomain:source.raw.domain,sourceLocation:source.raw.location,
      sourceOiSelections:source.raw.oiSelections,provenance:source.provenance };
  });
  const counts = Object.fromEntries(['SAFE_UPDATE','NO_CHANGE_REQUIRED','BLOCKED_REAL_CONFLICT']
    .map((key) => [key,rows.filter((row) => row.category === key).length]));
  assert.equal(Object.values(counts).reduce((a,b) => a+b,0),110);
  return { kind:'QV_2027_INITIAL_110_UPDATE_REVIEW',counts,rows };
}

if(require.main === module) buildReview().then((review) => {
  fs.writeFileSync(OUTPUT,JSON.stringify(review,null,2)+'\n');
  console.log(JSON.stringify({ count:review.rows.length,counts:review.counts },null,2));
}).catch((error) => { console.error(error.stack || error);process.exitCode=1; });

module.exports = { buildReview, classify };
