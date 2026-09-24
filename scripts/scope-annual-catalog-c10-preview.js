'use strict';

const fs = require('node:fs');
const path = require('node:path');
const convergence = require('../netlify/lib/_scope-catalog-convergence');
const statCom = require('../netlify/lib/_scope-statcom-referential');

function parseSemicolonSource(source){
  const lines = String(source || '').replace(/^\uFEFF/,'').split(/\r?\n/).filter((line) => line.trim());
  if(!lines.length) return [];
  const headers = lines.shift().split(';').map((value) => value.trim());
  return lines.map((line,index) => {
    const values = line.split(';');
    const row = Object.fromEntries(headers.map((header,column) => [header,String(values[column] || '').replace(/^"|"$/g,'').trim()]));
    return {
      source: 'C10_CATALOG_SOURCE_PREVIEW',sourceId: row['Code cours'] || row.identifiant_externe || String(index + 1),
      rawLabel: row['Événement'] || row.libelle || row.modele || '',domain: row.Qui || row.domaine || '',
      publicCodes: [row.Cible || row.cibles || row.public_cible || ''].filter(Boolean),statcomCode: row['Stat.Com'] || row.statcom_code || ''
    };
  });
}

function collisionAnalysis(rows,classifications,aliases){
  const decorated = classifications.map((classification,index) => {
    const input = rows[index] || {};
    const inferred = convergence.classifyLegacyActivity({ source: classification.source,sourceId: classification.sourceId,rawLabel: classification.rawLabel });
    return {
      sourceId: classification.sourceId || String(index + 1),source: classification.source,
      label: classification.rawLabel,normalizedLabel: classification.normalizedLabel,
      domain: classification.detectedDomainCodes[0] || null,classification: classification.classification,
      proposedDefinitionCode: classification.proposedDefinitionCode || null,
      explicitDefinitionCode: String(input.definitionCode || input.definition_code || '').trim().toUpperCase() || null,
      inferredDefinitionCode: inferred.proposedDefinitionCode || null,
      reasons: classification.reasons || []
    };
  });
  const grouped = (keyOf) => decorated.reduce((map,row) => {
    const key = keyOf(row);
    if(!key) return map;
    if(!map.has(key)) map.set(key,[]);
    map.get(key).push(row);
    return map;
  },new Map());
  const candidates = (entries) => [...new Set(entries.flatMap((row) => [row.explicitDefinitionCode,row.proposedDefinitionCode,row.inferredDefinitionCode]).filter(Boolean))].sort();
  const sourceRows = (entries) => entries.map((row) => ({ sourceId: row.sourceId,label: row.label,domain: row.domain,classification: row.classification })).sort((a,b) => `${a.sourceId}|${a.label}`.localeCompare(`${b.sourceId}|${b.label}`,'fr'));
  const collisions = [];
  for(const [normalizedKey,entries] of grouped((row) => `${row.source}|${row.normalizedLabel}`)){
    const identities = candidates(entries);
    if(identities.length > 1) collisions.push({ type: 'NORMALIZED_ALIAS_CONFLICT',normalizedKey,sourceRows: sourceRows(entries),candidates: identities,reason: 'Une même forme normalisée pointe vers plusieurs identités.',reviewRequired: true });
  }
  for(const [normalizedKey,entries] of grouped((row) => row.sourceId ? `${row.source}|${row.sourceId}` : '')){
    const identities = candidates(entries);
    if(entries.length > 1 && identities.length > 1) collisions.push({ type: 'SOURCE_IDENTITY_CONFLICT',normalizedKey,sourceRows: sourceRows(entries),candidates: identities,reason: 'Une même identité source pointe vers plusieurs activités.',reviewRequired: true });
  }
  for(const row of decorated.filter((entry) => entry.reasons.includes('CONTRADICTORY_CANONICAL_IDENTITY'))){
    const normalizedKey = `${row.source}|${row.sourceId || row.normalizedLabel}`;
    if(!collisions.some((collision) => collision.normalizedKey === normalizedKey)) collisions.push({
      type: 'CANONICAL_CONTEXT_CONFLICT',normalizedKey,sourceRows: sourceRows([row]),candidates: candidates([row]),
      reason: 'L’identité canonique explicite est incompatible avec le domaine ou le libellé.',reviewRequired: true
    });
  }
  for(const alias of aliases || []) if(alias.status === 'REVIEW_REQUIRED') collisions.push({
    type: 'ALIAS_CONFLICT',normalizedKey: `${alias.sourceType}|${alias.normalizedValue}`,sourceRows: [],candidates: [],
    reason: alias.justification || 'Alias contradictoire.',reviewRequired: true
  });
  const groups = [...grouped((row) => row.proposedDefinitionCode || '').entries()].filter(([,entries]) => entries.length > 1)
    .map(([canonicalIdentity,entries]) => ({ canonicalIdentity,sourceRows: sourceRows(entries),reviewRequired: entries.some((row) => !['A','B'].includes(row.classification)) }))
    .sort((a,b) => a.canonicalIdentity.localeCompare(b.canonicalIdentity));
  return { collisions: collisions.sort((a,b) => `${a.type}|${a.normalizedKey}`.localeCompare(`${b.type}|${b.normalizedKey}`)),groups };
}

function buildPreview(rows,sourceName = 'SOURCE_NON_PRECISEE'){
  const report = convergence.buildConvergenceDiagnostic(rows,{ knownStatComCodes: statCom.initialStatComCodes().map((row) => row.code) });
  const analysis = collisionAnalysis(rows,report.classifications,report.aliases);
  const byDomain = {};
  for(const row of report.classifications){
    const domain = row.detectedDomainCodes[0] || 'NON_CLASSE';
    byDomain[domain] = byDomain[domain] || { candidates: 0,autoPromotable: 0,reviewRequired: 0 };
    byDomain[domain].candidates += 1;
    if(convergence.AUTO_PROMOTABLE.has(row.classification)) byDomain[domain].autoPromotable += 1;
    else byDomain[domain].reviewRequired += 1;
  }
  return {
    mode: 'READ_ONLY_PREVIEW',sourceName,sourceCount: rows.length,corpusExhaustive: false,
    pipeline: ['source','preview','normalisation','classification','collisions','regroupement','validation_moa','import_idempotent','journal_preuve'],
    counts: report.counts,byDomain,groups: analysis.groups,collisions: analysis.collisions,proposals: report.classifications.map((row) => ({ sourceId: row.sourceId,label: row.rawLabel,domain: row.detectedDomainCodes[0] || null,
      classification: row.classification,proposedDefinitionCode: row.proposedDefinitionCode,confidence: row.confidence,manualReviewRequired: row.manualReviewRequired,reasons: row.reasons })),
    writes: [],seeds: [],limitations: report.limitations
  };
}

if(require.main === module){
  const filename = process.argv[2] || path.resolve(__dirname,'../tests/fixtures/scope-events-real-moa.csv');
  const rows = parseSemicolonSource(fs.readFileSync(filename,'utf8'));
  process.stdout.write(`${JSON.stringify(buildPreview(rows,path.basename(filename)),null,2)}\n`);
}

module.exports = { parseSemicolonSource,collisionAnalysis,buildPreview };
