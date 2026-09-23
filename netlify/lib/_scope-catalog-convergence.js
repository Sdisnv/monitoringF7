'use strict';

const annualCatalog = require('./_scope-annual-catalog');

const CLASSIFICATIONS = Object.freeze(['A','B','C','D','E','F']);
const AUTO_PROMOTABLE = new Set(['A','B']);

const INITIAL_ACTIVITY_BLUEPRINTS = Object.freeze([
  blueprint('DPS-EXERCICE','Exercice DPS','DPS','EXERCISE','FOCO','ON_DEMAND','DPS-GEN','0120F7'),
  blueprint('DPS-INSTRUCTION-SECTION','Instruction de section DPS','DPS','INSTRUCTION','FOCO','ON_DEMAND','DPS-GEN','0120F7'),
  blueprint('DPS-INSTRUCTION-DEMI-SECTION','Instruction de demi-section DPS','DPS','INSTRUCTION','FOCO','ON_DEMAND','DPS-GEN','0120F7'),
  blueprint('DPS-DAP-EXERCICE','Exercice DPS-DAP','DPS','EXERCISE','FOCO','ON_DEMAND',['DPS-GEN','DAP-GEN'],['0120F7','0130F7'],['DPS','DAP']),
  blueprint('DAP-EXERCICE','Exercice DAP','DAP','EXERCISE','FOCO','ON_DEMAND','DAP-GEN','0130F7'),
  blueprint('JSP-EXERCICE','Exercice JSP','JSP','EXERCISE','JSP','ON_DEMAND','JSP-GEN','010JSP'),
  blueprint('PR-EXERCICE-PAPR','Exercice PR PAPR','PR','EXERCISE','PR','ANNUAL','PR-PAPR','011PR'),
  blueprint('PR-PISTE-GAZ','Piste gaz PR','PR','TEST','PR','EVERY_N_MONTHS','PR-PAPR','011PR',null,{ intervalValue: 24 }),
  blueprint('PR-TEST-PHYSIQUE','Test physique PR','PR','TEST','PR','ANNUAL','PR-PAPR','011PR')
]);

const REVIEW_REQUIRED_BLUEPRINTS = Object.freeze([
  reviewBlueprint('JSP-CAD','Exercice JSP cadets','JSP','BIRTH_DATE_AND_TEMPORAL_RULE_UNRESOLVED'),
  reviewBlueprint('PR-EXERCICE-PABC','Exercice PR PABC','PR','PABC_PERIODICITY_UNRESOLVED'),
  reviewBlueprint('PR-SIMULATEUR','Simulateur PR','PR','CURRICULUM_LINK_UNRESOLVED'),
  reviewBlueprint('PR-CURSUS-CANDIDAT-PAPR','Cursus candidat PAPR','PR','CANDIDATE_PUBLIC_UNRESOLVED'),
  reviewBlueprint('FOCA-CI-DAP','Cursus CI DAP','FOCA','FIVE_MODULE_DETAILS_UNRESOLVED'),
  reviewBlueprint('AUTO-TRUCK','Formation AUTO TRUCK','AUTO','TRUCK_MEANING_UNRESOLVED'),
  reviewBlueprint('AUTO-CAR','Formation AUTO CAR','AUTO','CAR_MEANING_UNRESOLVED')
]);

const ALIAS_RULES = Object.freeze([
  rule('DPS-EXERCICE','DPS',/^exercice\s+dps(?:\s+(?:g1|c1|b1|b2|gen))?(?:\s+\d+)?$/),
  rule('DPS-INSTRUCTION-DEMI-SECTION','DPS',/^(?:instr(?:uction)?\.?\s+)?demi[-\s]?section(?:\s+dps)?(?:\s+.*)?$/),
  rule('DPS-INSTRUCTION-SECTION','DPS',/^(?:instr(?:uction)?\.?)\s+section(?:\s+dps)?(?:\s+.*)?$/),
  rule('DPS-DAP-EXERCICE','DPS',/^exercice\s+dps[-\s/]dap(?:\s+\d+)?$/),
  rule('DPS-DAP-EXERCICE','DAP',/^exercice\s+dps[-\s/]dap(?:\s+\d+)?$/),
  rule('DAP-EXERCICE','DAP',/^exercice\s+dap(?:\s+(?:y1|y2|y3|y4|gen))?(?:\s+\d+)?$/),
  rule('JSP-EXERCICE','JSP',/^exercice\s+jsp(?:\s+(?:g1|c1|b1|gen))?(?:\s+\d+)?$/),
  rule('PR-EXERCICE-PAPR','PR',/^(?:exercice\s+)?pr(?:\s+papr)?(?:\s+\d+(?:\.\d+)?)?(?:\s+base)?$/),
  rule('PR-PISTE-GAZ','PR',/^(?:exercice\s+)?piste\s+gaz(?:\s+pr)?$/),
  rule('PR-TEST-PHYSIQUE','PR',/^test\s+physique(?:\s+pr)?$/)
]);

function blueprint(code,label,primaryDomain,activityType,familyCode,periodicityType,publicCodes,statComCodes,domainCodes,periodicity = {}){
  const domains = domainCodes || [primaryDomain];
  return Object.freeze({ code,label,primaryDomain,domainCodes: Object.freeze(domains),activityType,familyCode,
    periodicity: Object.freeze({ type: periodicityType,...periodicity }),sessionTemplates: Object.freeze([{ code: 'S1',sequence: 1,label,durationMinutes: 120 }]),
    publicCodes: Object.freeze(Array.isArray(publicCodes) ? publicCodes : [publicCodes]),
    statisticalContributions: Object.freeze((Array.isArray(statComCodes) ? statComCodes : [statComCodes]).map((statcomCode) => ({ statcomCode,mode: domains.length > 1 ? 'MANUAL' : 'FULL_DURATION',aggregationRule: 'PER_PARTICIPANT' }))),
    status: 'ACTIVE',confidence: 'HIGH' });
}

function reviewBlueprint(code,label,domain,reason){ return Object.freeze({ code,label,domain,status: 'REVIEW_REQUIRED',reason }); }
function rule(definitionCode,domain,pattern){ return Object.freeze({ definitionCode,domain,pattern }); }
function blueprintFingerprint(row){
  return annualCatalog.fingerprint({ code:row.code,activityType:row.activityType,familyCode:row.familyCode,domainCodes:row.domainCodes,
    sessionTemplates:row.sessionTemplates,periodicity:row.periodicity,publicCodes:row.publicCodes,statisticalContributions:row.statisticalContributions });
}

function normalizeLabel(value){
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[–—]/g,'-').replace(/[^a-z0-9./_-]+/g,' ').replace(/\s+/g,' ').trim();
}
function upper(value){ return String(value || '').trim().toUpperCase(); }
function unique(values){ return [...new Set((values || []).filter(Boolean))].sort(); }

function classifyLegacyActivity(input = {}){
  const source = String(input.source || input.sourceType || 'LEGACY');
  const sourceId = String(input.sourceId || input.id || input.evenement_id || '');
  const rawLabel = String(input.rawLabel || input.label || input.libelle || input.title || '').trim();
  const normalizedLabel = normalizeLabel(rawLabel);
  const explicitCode = upper(input.definitionCode || input.definition_code);
  const domain = upper(input.domain || input.domainCode || input.domaine_code || input.domaine);
  const base = { source,sourceId,rawLabel,normalizedLabel,proposedDefinitionCode: null,classification: 'F',confidence: 0,
    reasons: [],aliases: [],detectedDomainCodes: domain ? [domain] : [],detectedPublicCodes: [],
    detectedSessionInformation: { detected: false,confidence: 'NONE',token: null },detectedPeriodicity: null,
    detectedStatCom: unique([input.statcomCode || input.statcom_code]),warnings: [],manualReviewRequired: true };
  if(!rawLabel){ base.reasons.push('EMPTY_LABEL'); return base; }
  const technicalNoise=/\b(recette|sandbox|dummy|fixture|placeholder|donnee technique)\b/.test(normalizedLabel)
    || /^(test|essai)\b/.test(normalizedLabel) && !/^test physique(?: pr)?$/.test(normalizedLabel);
  if(technicalNoise){
    return result(base,'E',1,null,['TECHNICAL_OR_RECIPE_DATA']);
  }
  if(explicitCode && INITIAL_ACTIVITY_BLUEPRINTS.some((row) => row.code === explicitCode)){
    const explicitDefinition = INITIAL_ACTIVITY_BLUEPRINTS.find((row) => row.code === explicitCode);
    const labelCandidates = unique(ALIAS_RULES.filter((row) => row.pattern.test(normalizedLabel)).map((row) => row.definitionCode));
    const unresolvedLabelCode = /\b(cadet|truck|car)\b/.test(normalizedLabel)
      ? normalizedLabel.includes('cadet') ? 'JSP-CAD' : normalizedLabel.includes('truck') ? 'AUTO-TRUCK' : 'AUTO-CAR'
      : null;
    const contradictoryDomain = Boolean(domain && !explicitDefinition.domainCodes.includes(domain));
    const contradictoryLabel = labelCandidates.some((code) => code !== explicitCode)
      || Boolean(unresolvedLabelCode && unresolvedLabelCode !== explicitCode);
    if(contradictoryDomain || contradictoryLabel){
      return result(base,'C',0,null,['CONTRADICTORY_CANONICAL_IDENTITY']);
    }
    return result(base,'A',1,explicitCode,['EXPLICIT_CANONICAL_DEFINITION']);
  }
  if(/\b(cadet|truck|car)\b/.test(normalizedLabel)){
    const code = normalizedLabel.includes('cadet') ? 'JSP-CAD' : normalizedLabel.includes('truck') ? 'AUTO-TRUCK' : 'AUTO-CAR';
    return result(base,'C',0.55,code,['KNOWN_UNRESOLVED_BUSINESS_TERM']);
  }
  if(/\bceremonie|assemblee|inauguration\b/.test(normalizedLabel)){
    return result(base,'D',0.9,null,['ONE_OFF_OR_COMPOSITE_HISTORICAL_ACTIVITY']);
  }
  const match = ALIAS_RULES.find((row) => (!domain || row.domain === domain) && row.pattern.test(normalizedLabel));
  if(match){
    const stable = normalizedLabel === normalizeLabel(INITIAL_ACTIVITY_BLUEPRINTS.find((row) => row.code === match.definitionCode).label);
    const classified = result(base,stable ? 'A' : 'B',stable ? 1 : 0.95,match.definitionCode,[stable ? 'EXACT_STABLE_LABEL' : 'SITE_PUBLIC_OR_OCCURRENCE_VARIANT']);
    classified.aliases = [aliasFromClassification(classified)];
    classified.detectedPublicCodes = detectPublicCodes(domain,normalizedLabel,input);
    classified.detectedSessionInformation = detectSessionInformation(input,normalizedLabel);
    if(classified.detectedSessionInformation.warning) classified.warnings.push(classified.detectedSessionInformation.warning);
    classified.detectedPeriodicity = INITIAL_ACTIVITY_BLUEPRINTS.find((row) => row.code === match.definitionCode).periodicity;
    return classified;
  }
  if(domain && /^exercice\b/.test(normalizedLabel)) return result(base,'C',0.5,null,['EXERCISE_FAMILY_WITHOUT_CERTAIN_DEFINITION']);
  return result(base,'F',0,null,['INSUFFICIENT_BUSINESS_EVIDENCE']);
}

function result(base,classification,confidence,code,reasons){
  return { ...base,classification,confidence,proposedDefinitionCode: code,reasons,
    manualReviewRequired: !AUTO_PROMOTABLE.has(classification) };
}

function detectPublicCodes(domain,label,input){
  const explicit = input.publicCodes || input.cibleCodes || input.cible_codes || [];
  const values = Array.isArray(explicit) ? explicit.slice() : [explicit];
  const candidates = domain === 'DPS' ? ['G1','C1','B1','B2','GEN'] : domain === 'DAP' ? ['Y1','Y2','Y3','Y4','GEN'] : domain === 'JSP' ? ['G1','C1','B1','GEN'] : [];
  for(const code of candidates) if(new RegExp(`(?:^|\\s)${code.toLowerCase()}(?:$|\\s)`).test(label)) values.push(`${domain}-${code}`);
  return unique(values.map((value) => canonicalPublicCode(domain,value)));
}

function canonicalPublicCode(domain,value){
  const raw=upper(value).replaceAll('_','-').replace(/\s+/g,'-');
  if(!raw) return '';
  if(raw.startsWith(`${domain}-`)) return raw;
  if(domain==='PR' && ['PR','PAPR'].includes(raw)) return 'PR-PAPR';
  if(domain==='PR' && ['ABC','PABC','PR-ABC'].includes(raw)) return 'PR-PABC';
  if(domain==='AUTO') return `AUTO-${raw.replace(/^COND-/,'COND-')}`;
  if(['DPS','DAP','JSP','FOBA'].includes(domain)) return `${domain}-${raw.replace(new RegExp(`^${domain}-`),'')}`;
  return raw;
}

function detectSessionInformation(input,label){
  const explicit = input.seriesKey || input.series_key || input.sessionIndex || input.session_index || input.mode_session === 'MULTI';
  const token = (label.match(/\b\d+\.\d+\b/) || [])[0] || null;
  if(explicit) return { detected: true,confidence: 'HIGH',token: token || String(input.sessionIndex || input.session_index || '') };
  return token ? { detected: true,confidence: 'LOW',token,warning: 'NUMBERING_ALONE_IS_NOT_A_SESSION_CONTRACT' }
    : { detected: false,confidence: 'NONE',token: null };
}

function aliasFromClassification(row){
  return { sourceValue: row.rawLabel,normalizedValue: row.normalizedLabel,sourceType: row.source,
    definitionCode: row.proposedDefinitionCode,confidence: row.confidence,provenance: row.sourceId || row.source,
    justification: row.reasons.join(','),status: AUTO_PROMOTABLE.has(row.classification) ? 'CONFIRMED' : 'REVIEW_REQUIRED' };
}

function buildLegacyAliases(classifications = []){
  const byKey = new Map();
  for(const row of classifications){
    if(!AUTO_PROMOTABLE.has(row.classification) || !row.proposedDefinitionCode) continue;
    const alias = aliasFromClassification(row);
    const key = `${alias.sourceType}|${alias.normalizedValue}`;
    const previous = byKey.get(key);
    if(previous && previous.definitionCode !== alias.definitionCode){
      byKey.set(key,{ ...alias,status: 'REVIEW_REQUIRED',definitionCode: null,justification: 'CONFLICTING_CONFIRMED_ALIASES' });
    }else if(!previous) byKey.set(key,alias);
  }
  return [...byKey.values()].sort((a,b) => `${a.sourceType}|${a.normalizedValue}`.localeCompare(`${b.sourceType}|${b.normalizedValue}`));
}

function buildAnnualRequirements2027({ definitions = [],publicDefinitions = [],publicRuleVersions = [] } = {}){
  const byCode = new Map(definitions.map((row) => [upper(row.code),row]));
  return INITIAL_ACTIVITY_BLUEPRINTS.filter((row) => ['PR-EXERCICE-PAPR','PR-TEST-PHYSIQUE'].includes(row.code)).map((blueprint) => {
    const resolved = byCode.get(blueprint.code);
    const publicDefinition = publicDefinitions.find((row) => upper(row.code) === blueprint.publicCodes[0]);
    const draft = { id: resolved && (resolved.annualRequirementId || resolved.annual_requirement_id) || '',year: 2027,status: 'DRAFT',requiredOccurrences: 1,
      label: blueprint.label,sourceType: 'C5_B_CANONICAL',sourceId: blueprint.code };
    if(!resolved || !(resolved.definitionVersionId || resolved.definition_version_id) || !publicDefinition){
      return { code: blueprint.code,status: 'REVIEW_REQUIRED',requirement: draft,errors: ['CANONICAL_REFERENCES_UNRESOLVED'] };
    }
    const publicDefinitionId = publicDefinition.publicDefinitionId || publicDefinition.public_definition_id;
    const contract = blueprintContract(blueprint,resolved,draft,publicDefinitionId);
    const prepared = annualCatalog.prepareAnnualRequirementReady({ ...contract,publicDefinitions,publicRuleVersions });
    return { code: blueprint.code,status: prepared.valid ? 'READY' : 'REVIEW_REQUIRED',requirement: prepared.requirement,errors: prepared.errors };
  });
}

function blueprintContract(blueprint,resolved,requirement,publicDefinitionId){
  const versionId = resolved.definitionVersionId || resolved.definition_version_id;
  return { definition: { code: blueprint.code,label: blueprint.label,activityType: blueprint.activityType },version: { definitionVersionId: versionId },requirement,
    domainBindings: blueprint.domainCodes.map((domainCode,index) => ({ domainCode,bindingRole: index ? 'SECONDARY' : 'PRIMARY' })),
    sessionTemplates: blueprint.sessionTemplates.map((row,index) => ({ ...row,sessionTemplateId: resolved.sessionTemplateIds && resolved.sessionTemplateIds[index] || `${versionId}:S${index + 1}` })),
    periodicity: blueprint.periodicity,publicBindings: [{ publicDefinitionId,operator: 'UNION' }],qualificationBindings: [],roleRequirements: [],
    locationRequirements: [],responsibleRequirements: [],planningConstraints: [],statisticalContributions: blueprint.statisticalContributions };
}

function hasHumanDecision(obligation,proposals = []){
  const metadata = obligation.metadata || {};
  return obligation.sourceType === 'HUMAN_DECISION' || obligation.source_type === 'MANUAL' || Boolean(metadata.arbitrage || metadata.manualDecision || metadata.userSelection)
    || proposals.some((row) => ['RETENU','ECARTE'].includes(upper(row.status)) && metadata.autoPositioned !== true);
}

function reconcileQuoVadisMirror({ projection = {},existingObligations = [],existingProposals = [],classifications = [] } = {}){
  const allowed = new Set(classifications.filter((row) => AUTO_PROMOTABLE.has(row.classification)).map((row) => row.proposedDefinitionCode));
  const protectedIds = [];
  const links = [];
  const proposalLinks = [];
  const canonicalOnly = [];
  for(const canonical of projection.obligations || []){
    if(canonical.definitionCode && !allowed.has(canonical.definitionCode)){ canonicalOnly.push(canonical); continue; }
    const existing = existingObligations.find((row) => row.plannedOccurrenceId === canonical.plannedOccurrenceId || row.planned_occurrence_id === canonical.plannedOccurrenceId
      || upper(row.definitionCode || row.definition_code) === upper(canonical.definitionCode));
    if(!existing){ canonicalOnly.push(canonical); continue; }
    const own = existingProposals.filter((row) => String(row.obligationId || row.obligation_id) === String(existing.obligationId || existing.obligation_id));
    const protectedDecision = hasHumanDecision(existing,own);
    if(protectedDecision) protectedIds.push(existing.obligationId || existing.obligation_id);
    links.push({ obligationId: existing.obligationId || existing.obligation_id,plannedOccurrenceId: canonical.plannedOccurrenceId,
      action: protectedDecision ? 'LINK_ONLY_PRESERVE_DECISION' : 'LINK_CANONICAL',humanDecisionProtected: protectedDecision });
    const intents = (projection.sessionIntents || []).filter((row) => row.plannedOccurrenceId === canonical.plannedOccurrenceId).sort((a,b) => Number(a.sequence) - Number(b.sequence));
    const proposals = own.slice().sort((a,b) => String(a.startsAt || a.starts_at || '').localeCompare(String(b.startsAt || b.starts_at || '')));
    intents.forEach((intent,index) => {
      const proposal = proposals.find((row) => row.plannedOccurrenceSessionId === intent.plannedOccurrenceSessionId || row.planned_occurrence_session_id === intent.plannedOccurrenceSessionId) || proposals[index];
      if(proposal) proposalLinks.push({ proposalId: proposal.proposalId || proposal.proposal_id,plannedOccurrenceSessionId: intent.plannedOccurrenceSessionId,
        action: protectedDecision ? 'LINK_ONLY_PRESERVE_DATE' : 'LINK_CANONICAL_SESSION',humanDecisionProtected: protectedDecision });
    });
  }
  for(const existing of existingObligations){
    const id = existing.obligationId || existing.obligation_id;
    if(!links.some((row) => String(row.obligationId) === String(id)) && hasHumanDecision(existing,existingProposals.filter((row) => String(row.obligationId || row.obligation_id) === String(id)))) protectedIds.push(id);
  }
  return { links,proposalLinks,canonicalOnly,humanDecisionProtected: unique(protectedIds),writes: [],operationalWrites: false };
}

function compareLegacyAndCanonical({ legacy = [],canonical = [],legacySessions = [],canonicalSessions = [],unresolved = [] } = {}){
  const legacyByKey = new Map(legacy.map((row) => [comparisonKey(row),row]));
  const canonicalByKey = new Map(canonical.map((row) => [comparisonKey(row),row]));
  const matched = []; const legacyOnly = []; const canonicalOnly = [];
  const sameDefinitionDifferentMetadata = []; const domainDifferences = []; const publicDifferences = []; const statComDifferences = []; const planningDifferences = [];
  for(const [key,row] of legacyByKey){
    const other = canonicalByKey.get(key);
    if(!other){ legacyOnly.push(row); continue; }
    matched.push({ key,legacy: row,canonical: other });
    compareField(row,other,'domainCodes',domainDifferences,key);
    compareField(row,other,'publicCodes',publicDifferences,key);
    compareField(row,other,'statComCodes',statComDifferences,key);
    compareField(row,other,'planning',planningDifferences,key);
    if(JSON.stringify(stripComparisonFields(row)) !== JSON.stringify(stripComparisonFields(other))) sameDefinitionDifferentMetadata.push({ key,legacy: row,canonical: other });
  }
  for(const [key,row] of canonicalByKey) if(!legacyByKey.has(key)) canonicalOnly.push(row);
  const sameOccurrenceDifferentSessions = compareSessions(legacySessions,canonicalSessions);
  return { matched,legacyOnly,canonicalOnly,sameDefinitionDifferentMetadata,sameOccurrenceDifferentSessions,domainDifferences,publicDifferences,
    statComDifferences,planningDifferences,humanDecisionProtected: legacy.filter((row) => row.humanDecisionProtected === true),unresolved,
    warnings: unresolved.length ? ['UNRESOLVED_ITEMS_REQUIRE_MANUAL_REVIEW'] : [] };
}

function comparisonKey(row){ return String(row.plannedOccurrenceId || row.planned_occurrence_id || row.sourceRef || row.source_ref || row.definitionCode || row.definition_code || row.code || ''); }
function normalizedArray(value){ return unique(Array.isArray(value) ? value.map(upper) : value == null ? [] : [upper(value)]); }
function compareField(left,right,field,output,key){ if(JSON.stringify(normalizedArray(left[field])) !== JSON.stringify(normalizedArray(right[field]))) output.push({ key,legacy: left[field] || [],canonical: right[field] || [] }); }
function stripComparisonFields(row){ const copy = { ...row }; for(const key of ['domainCodes','publicCodes','statComCodes','planning']) delete copy[key]; return copy; }
function compareSessions(left,right){
  const count = (rows) => rows.reduce((map,row) => map.set(String(row.plannedOccurrenceId || row.planned_occurrence_id || row.occurrenceId || ''),(map.get(String(row.plannedOccurrenceId || row.planned_occurrence_id || row.occurrenceId || '')) || 0) + 1),new Map());
  const a = count(left); const b = count(right); const differences = [];
  for(const key of new Set([...a.keys(),...b.keys()])) if((a.get(key) || 0) !== (b.get(key) || 0)) differences.push({ key,legacySessions: a.get(key) || 0,canonicalSessions: b.get(key) || 0 });
  return differences;
}

function buildConvergenceDiagnostic(rows = [],{ knownStatComCodes = [] } = {}){
  const classifications = rows.map(classifyLegacyActivity);
  const knownStatCom = new Set(knownStatComCodes.map(upper));
  if(knownStatCom.size) for(const row of classifications){
    const unknown=row.detectedStatCom.filter((code) => !knownStatCom.has(upper(code)));
    if(unknown.length) row.warnings.push(`UNKNOWN_STATCOM_CODE:${unknown.join(',')}`);
  }
  const counts = Object.fromEntries(CLASSIFICATIONS.map((code) => [code,classifications.filter((row) => row.classification === code).length]));
  const aliases = buildLegacyAliases(classifications);
  return { mode: 'READ_ONLY_DIAGNOSTIC',corpusExhaustive: false,sourceCount: rows.length,counts,classifications,aliases,
    proposedDefinitions: unique(classifications.map((row) => row.proposedDefinitionCode)),creatableDefinitions: unique(classifications.filter((row) => AUTO_PROMOTABLE.has(row.classification)).map((row) => row.proposedDefinitionCode)),
    annualRequirements: 0,occurrences: 0,sessions: 0,quoVadisProjections: 0,humanDecisionsProtected: 0,
    statComErrors: classifications.filter((row) => row.warnings.some((warning) => warning.startsWith('UNKNOWN_STATCOM_CODE:'))),
    unresolvedPublics: [],unresolvedQualifications: [],multiDomainActivities: [],multiSessionActivities: classifications.filter((row) => row.detectedSessionInformation.detected),
    reviewRequired: classifications.filter((row) => row.manualReviewRequired),limitations: ['FULL_QUO_VADIS_WORKBOOK_NOT_AVAILABLE'] };
}

module.exports = { CLASSIFICATIONS,AUTO_PROMOTABLE,INITIAL_ACTIVITY_BLUEPRINTS,REVIEW_REQUIRED_BLUEPRINTS,blueprintFingerprint,normalizeLabel,classifyLegacyActivity,
  buildLegacyAliases,buildAnnualRequirements2027,reconcileQuoVadisMirror,compareLegacyAndCanonical,buildConvergenceDiagnostic,hasHumanDecision };
