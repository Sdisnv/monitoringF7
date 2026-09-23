'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const convergence = require('../netlify/lib/_scope-catalog-convergence');
const catalog = require('../netlify/lib/_scope-annual-catalog');
const ddl = require('../netlify/lib/_scope-catalog-convergence-ddl');
const qualifications = require('../netlify/lib/_scope-person-qualifications');

const ROOT = path.resolve(__dirname,'..');
const MIGRATION = path.join(ROOT,'database/migrations/20260925_scope_catalog_convergence_c5_b.sql');
const tests = [];
function test(name,fn){ tests.push({ name,fn }); }
function uuid(value){ const hex=crypto.createHash('sha256').update(value).digest('hex').slice(0,32).split(''); hex[12]='5'; hex[16]=((parseInt(hex[16],16)&3)|8).toString(16); return `${hex.slice(0,8).join('')}-${hex.slice(8,12).join('')}-${hex.slice(12,16).join('')}-${hex.slice(16,20).join('')}-${hex.slice(20).join('')}`; }
function readyFixture(sessionCount = 1){
  const sessions = Array.from({ length: sessionCount },(_,index) => ({ sessionTemplateId: uuid(`session-${index}`),code:`S${index + 1}`,sequence:index + 1,label:`Session ${index + 1}`,durationMinutes:120 }));
  const requirement = { id:uuid('requirement'),year:2027,status:'DRAFT',requiredOccurrences:1,label:'Exercice DPS-DAP' };
  const input = { definition:{ code:'DPS-DAP-EXERCICE',label:'Exercice DPS-DAP',activityType:'EXERCISE' },version:{ definitionVersionId:uuid('version') },requirement,
    domainBindings:[{ domainCode:'DPS',bindingRole:'PRIMARY' },{ domainCode:'DAP',bindingRole:'SECONDARY' }],sessionTemplates:sessions,periodicity:{ type:'ANNUAL' },
    publicBindings:[{ publicDefinitionId:uuid('public-dps'),publicRuleVersionId:uuid('rule-dps'),publicCode:'DPS-GEN' },{ publicDefinitionId:uuid('public-dap'),publicRuleVersionId:uuid('rule-dap'),publicCode:'DAP-GEN' }],
    qualificationBindings:[],roleRequirements:[],locationRequirements:[],responsibleRequirements:[],planningConstraints:[],
    statisticalContributions:[{ statcomCode:'0120F7',mode:'MANUAL' },{ statcomCode:'0130F7',mode:'MANUAL' }],
    publicDefinitions:[{ publicDefinitionId:uuid('public-dps'),status:'ACTIVE' },{ publicDefinitionId:uuid('public-dap'),status:'ACTIVE' }],
    publicRuleVersions:[{ publicRuleVersionId:uuid('rule-dps'),publicDefinitionId:uuid('public-dps'),status:'ACTIVE' },{ publicRuleVersionId:uuid('rule-dap'),publicDefinitionId:uuid('public-dap'),status:'ACTIVE' }] };
  const prepared = catalog.prepareAnnualRequirementReady(input);
  assert.equal(prepared.valid,true);
  return { ...input,requirement:prepared.requirement };
}

test('01 classifier covers A-F with trace fields',() => {
  const rows = [
    { source:'FIXTURE',sourceId:'A',domain:'DPS',label:'Exercice DPS' },
    { source:'FIXTURE',sourceId:'B',domain:'DPS',label:'Exercice DPS G1 2' },
    { source:'FIXTURE',sourceId:'C',domain:'AUTO',label:'Exercice TRUCK 1.1' },
    { source:'FIXTURE',sourceId:'D',domain:'FOBA',label:'Cérémonie de remise des casques' },
    { source:'FIXTURE',sourceId:'E',domain:'DPS',label:'TEST RECETTE DPS' },
    { source:'FIXTURE',sourceId:'F',domain:'FOCA',label:'Activité inconnue' }
  ].map(convergence.classifyLegacyActivity);
  assert.deepEqual(rows.map((row) => row.classification),['A','B','C','D','E','F']);
  for(const row of rows) for(const key of ['source','sourceId','rawLabel','normalizedLabel','classification','confidence','reasons','warnings','manualReviewRequired']) assert.ok(Object.hasOwn(row,key),key);
});

test('02 C and F are never auto-promoted',() => {
  const rows = ['Exercice TRUCK 1.1','Libellé opaque'].map((label) => convergence.classifyLegacyActivity({ domain:'AUTO',label }));
  assert.equal(convergence.buildLegacyAliases(rows).length,0);
});

test('02b business test is not confused with technical test data',() => {
  const row=convergence.classifyLegacyActivity({ domain:'PR',label:'Test physique PR' });
  assert.equal(row.classification,'A'); assert.equal(row.proposedDefinitionCode,'PR-TEST-PHYSIQUE');
});

test('03 aliases are deterministic and idempotent',() => {
  const row = convergence.classifyLegacyActivity({ source:'HIST',sourceId:'1',domain:'DPS',label:'Exercice DPS G1 1' });
  assert.deepEqual(convergence.buildLegacyAliases([row,row]),convergence.buildLegacyAliases([row]));
});

test('04 initial catalogue has unique activity identities',() => {
  const codes = convergence.INITIAL_ACTIVITY_BLUEPRINTS.map((row) => row.code);
  assert.equal(new Set(codes).size,codes.length); assert.equal(codes.length,9);
  for(const row of convergence.INITIAL_ACTIVITY_BLUEPRINTS) assert.match(ddl.SEED_SQL,new RegExp(convergence.blueprintFingerprint(row)));
});

test('05 DPS GEN is a public, not a definition per site',() => {
  const dps = convergence.INITIAL_ACTIVITY_BLUEPRINTS.find((row) => row.code==='DPS-EXERCICE');
  assert.deepEqual(dps.publicCodes,['DPS-GEN']); assert.equal(convergence.INITIAL_ACTIVITY_BLUEPRINTS.some((row) => /-(G1|C1|B1|B2)$/.test(row.code)),false);
});

test('06 DAP GEN is a public, not a definition per site',() => {
  const dap = convergence.INITIAL_ACTIVITY_BLUEPRINTS.find((row) => row.code==='DAP-EXERCICE');
  assert.deepEqual(dap.publicCodes,['DAP-GEN']); assert.equal(convergence.INITIAL_ACTIVITY_BLUEPRINTS.some((row) => /-Y[1-4]$/.test(row.code)),false);
});

test('07 JSP expected public is young JSP only',() => {
  const jsp = convergence.INITIAL_ACTIVITY_BLUEPRINTS.find((row) => row.code==='JSP-EXERCICE');
  assert.deepEqual(jsp.publicCodes,['JSP-GEN']);
  const publicDefinition = qualifications.PUBLIC_DEFINITIONS_C3.find((row) => row.code==='JSP-GEN');
  assert.match(JSON.stringify(publicDefinition.version.expression),/HAS_JSP_ROLE/); assert.doesNotMatch(JSON.stringify(publicDefinition.version.expression),/MONITEUR/);
});

test('08 no CADET structure is auto-created',() => {
  assert.equal(convergence.INITIAL_ACTIVITY_BLUEPRINTS.some((row) => /CADET/.test(row.code)),false);
  assert.equal(convergence.REVIEW_REQUIRED_BLUEPRINTS.find((row) => row.code==='JSP-CAD').status,'REVIEW_REQUIRED');
});

test('09 DPS-DAP remains one multi-domain activity',() => {
  const row = convergence.INITIAL_ACTIVITY_BLUEPRINTS.find((entry) => entry.code==='DPS-DAP-EXERCICE');
  assert.deepEqual(row.domainCodes,['DPS','DAP']); assert.equal(convergence.INITIAL_ACTIVITY_BLUEPRINTS.filter((entry) => entry.code.includes('DPS-DAP')).length,1);
});

test('10 DPS-DAP contributions are multiple and manual',() => {
  const row = convergence.INITIAL_ACTIVITY_BLUEPRINTS.find((entry) => entry.code==='DPS-DAP-EXERCICE');
  assert.deepEqual(row.statisticalContributions.map((entry) => entry.statcomCode),['0120F7','0130F7']);
  assert.ok(row.statisticalContributions.every((entry) => entry.mode==='MANUAL'));
});

test('11 FOCO DPS and DAP stay distinguishable',() => {
  const row = convergence.INITIAL_ACTIVITY_BLUEPRINTS.find((entry) => entry.code==='DPS-DAP-EXERCICE');
  assert.equal(new Set(row.statisticalContributions.map((entry) => entry.statcomCode)).size,2);
});

test('12 FOSPEC is data-driven',() => {
  for(const code of ['OFSI','VPC','NAC','ANTICHUTE','SANITAIRE','FUTURE_SPECIALITY']){
    const fixture=readyFixture(); fixture.qualificationBindings=[{ competenceId:uuid(code),bindingType:'TAUGHT',metadata:{ code } }];
    assert.equal(catalog.validateDefinitionContract(fixture).valid,true,code);
  }
});

test('13 VPC aliases converge on VPC',() => {
  for(const alias of ['VPC','OP_VPC','OP VPC']) assert.equal(qualifications.canonicalizeQualification('FOSPEC',alias).qualificationCode,'VPC');
});

test('14 AUTO is data-driven',() => {
  for(const code of ['COND_PL','GRUTIER_A','CARISTE','FUTURE_AUTO']){
    const fixture=readyFixture(); fixture.qualificationBindings=[{ competenceId:uuid(code),bindingType:'TAUGHT',metadata:{ code } }];
    assert.equal(catalog.validateDefinitionContract(fixture).valid,true,code);
  }
});

test('15 roles remain separate from qualifications',() => {
  const roleCodes=new Set(qualifications.EVENT_ROLE_DEFINITIONS.map((row) => row.code));
  assert.equal(qualifications.ALL_QUALIFICATION_CODES.some((code) => roleCodes.has(code)),false);
});

test('16 annual generation is deterministic',() => {
  const input=readyFixture(); const first=catalog.generateAnnualProgram(input); const second=catalog.generateAnnualProgram(input);
  assert.deepEqual(first,second); assert.equal(first.complete,true);
});

test('17 annual snapshot and fingerprint remain enforced',() => {
  const input=readyFixture(); input.requirement.snapshot.periodicity={ type:'ON_DEMAND' };
  assert.equal(catalog.generateAnnualProgram(input).complete,false);
});

test('18 multi-session generation preserves one occurrence',() => {
  const input=readyFixture(3); const generated=catalog.generateAnnualProgram(input);
  assert.equal(generated.occurrences.length,1); assert.equal(generated.sessions.length,3);
});

test('19 CATALOG_C4 is explicit in SQL and runtime contracts',() => {
  assert.match(ddl.DDL.join('\n'),/CATALOG_C4/);
  assert.match(fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-quo-vadis-consolidation.js'),'utf8'),/CATALOG_C4/);
});

test('20 projection carries occurrence and session links',() => {
  const input=readyFixture(2); const generated=catalog.generateAnnualProgram(input); const projection=catalog.projectToQuoVadis({ ...input,...generated });
  assert.equal(projection.obligations[0].plannedOccurrenceId,generated.occurrences[0].plannedOccurrenceId);
  assert.ok(projection.sessionIntents.every((row) => row.plannedOccurrenceSessionId && row.plannedOccurrenceId));
});

test('21 preserveDecision creates link-only reconciliation',() => {
  const canonical={ sourceType:'CATALOG_C4',definitionCode:'DPS-EXERCICE',plannedOccurrenceId:'O1' };
  const classification=convergence.classifyLegacyActivity({ domain:'DPS',label:'Exercice DPS' });
  const result=convergence.reconcileQuoVadisMirror({ projection:{ obligations:[canonical] },classifications:[classification],existingObligations:[{ obligationId:'L1',definitionCode:'DPS-EXERCICE',metadata:{ arbitrage:true } }] });
  assert.equal(result.links[0].action,'LINK_ONLY_PRESERVE_DECISION'); assert.deepEqual(result.humanDecisionProtected,['L1']);
});

test('22 HUMAN_DECISION and human date remain unchanged',() => {
  const existing={ obligationId:'L1',definitionCode:'DPS-EXERCICE',sourceType:'HUMAN_DECISION',selectedProposalId:'P1' };
  const proposal={ obligationId:'L1',proposalId:'P1',status:'RETENU',startsAt:'2027-06-01T19:30:00Z' };
  const before=JSON.stringify({ existing,proposal });
  const result=convergence.reconcileQuoVadisMirror({ projection:{ obligations:[{ definitionCode:'DPS-EXERCICE',plannedOccurrenceId:'O1' }],sessionIntents:[{ plannedOccurrenceId:'O1',plannedOccurrenceSessionId:'S1',sequence:1 }] },classifications:[convergence.classifyLegacyActivity({ domain:'DPS',label:'Exercice DPS' })],existingObligations:[existing],existingProposals:[proposal] });
  assert.equal(JSON.stringify({ existing,proposal }),before);
  assert.equal(result.proposalLinks[0].action,'LINK_ONLY_PRESERVE_DATE');
});

test('23 second mirror generation creates no duplicate link',() => {
  const input={ projection:{ obligations:[{ definitionCode:'DPS-EXERCICE',plannedOccurrenceId:'O1' }] },classifications:[convergence.classifyLegacyActivity({ domain:'DPS',label:'Exercice DPS' })],existingObligations:[{ obligationId:'L1',plannedOccurrenceId:'O1' }] };
  assert.deepEqual(convergence.reconcileQuoVadisMirror(input),convergence.reconcileQuoVadisMirror(input));
  assert.equal(convergence.reconcileQuoVadisMirror(input).links.length,1);
});

test('24 mirror comparison reports structural differences',() => {
  const result=convergence.compareLegacyAndCanonical({ legacy:[{ sourceRef:'O1',domainCodes:['DPS'],publicCodes:['DPS-GEN'],statComCodes:['0120F7'],humanDecisionProtected:true }],canonical:[{ sourceRef:'O1',domainCodes:['DPS','DAP'],publicCodes:['DPS-GEN','DAP-GEN'],statComCodes:['0120F7','0130F7'] }],legacySessions:[{ occurrenceId:'O1' }],canonicalSessions:[{ occurrenceId:'O1' },{ occurrenceId:'O1' }] });
  assert.equal(result.matched.length,1); assert.equal(result.domainDifferences.length,1); assert.equal(result.publicDifferences.length,1); assert.equal(result.statComDifferences.length,1); assert.equal(result.sameOccurrenceDifferentSessions.length,1); assert.equal(result.humanDecisionProtected.length,1);
});

test('25 C/F disappearance never absorbs or deletes human decisions',() => {
  const result=convergence.reconcileQuoVadisMirror({ projection:{ obligations:[{ definitionCode:'AUTO-TRUCK',plannedOccurrenceId:'O1' }] },classifications:[convergence.classifyLegacyActivity({ domain:'AUTO',label:'Exercice TRUCK 1.1' })],existingObligations:[{ obligationId:'L1',definitionCode:'AUTO-TRUCK',sourceType:'HUMAN_DECISION' }] });
  assert.equal(result.links.length,0); assert.equal(result.operationalWrites,false); assert.deepEqual(result.writes,[]);
});

test('26 projection retains every domain, public and Stat.Com contribution',() => {
  const input=readyFixture(); const generated=catalog.generateAnnualProgram(input); const projected=catalog.projectToQuoVadis({ ...input,...generated }); const row=projected.obligations[0];
  assert.deepEqual(row.domainCodes,['DPS','DAP']); assert.deepEqual(row.publicCodes,['DPS-GEN','DAP-GEN']); assert.deepEqual(row.statComCodes,['0120F7','0130F7']);
});

test('27 standalone migration and runtime are structurally equivalent',() => {
  const migration=fs.readFileSync(MIGRATION,'utf8').replace(/\s+/g,' ');
  for(const statement of [...ddl.DDL,ddl.SEED_SQL,ddl.PROTECTION_SQL]) assert.ok(migration.includes(statement.replace(/\s+/g,' ').trim()),statement.slice(0,90));
  const schema=fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-schema.js'),'utf8');
  assert.match(schema,/migrateCatalogConvergenceC5B/); assert.match(schema,/_scope-catalog-convergence-ddl/);
  const sql=[ddl.DDL.join('\n'),ddl.SEED_SQL,ddl.PROTECTION_SQL].join('\n');
  assert.match(sql,/primary key/); assert.match(sql,/references scope_event_definitions/); assert.match(sql,/unique \(source_type,normalized_value\)/);
  assert.match(sql,/enable row level security/); assert.match(sql,/revoke all/); assert.match(sql,/conflicting C5-B-V1/);
  assert.doesNotMatch(sql,/drop (table|column)|truncate/i);
  const c4=fs.readFileSync(path.join(ROOT,'database/migrations/20260924_scope_annual_catalog_c4_b.sql'),'utf8');
  assert.match(c4,/planned_occurrence_id uuid references scope_planned_occurrences/); assert.match(c4,/planned_occurrence_session_id uuid references scope_planned_occurrence_sessions/);
});

test('28 C5-B contains no operational writes or person assignment',() => {
  const source=fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-catalog-convergence.js'),'utf8');
  assert.doesNotMatch(source,/scope_(evenements|attendus|participations)|fetch\s*\(|require\(['"]\.\/_postgres/);
  assert.doesNotMatch(ddl.SEED_SQL,/personne_id|person_id/i);
});

test('29 2027 requirements become READY only with resolved pinned public rules',() => {
  const unresolved=convergence.buildAnnualRequirements2027(); assert.ok(unresolved.every((row) => row.status==='REVIEW_REQUIRED'));
  const definitions=['PR-EXERCICE-PAPR','PR-TEST-PHYSIQUE'].map((code) => ({ code,definitionVersionId:uuid(`${code}-version`),annualRequirementId:uuid(`${code}-requirement`),sessionTemplateIds:[uuid(`${code}-session`)] }));
  const publicDefinitionId=uuid('pr-public'); const publicRuleVersionId=uuid('pr-rule');
  const resolved=convergence.buildAnnualRequirements2027({ definitions,publicDefinitions:[{ code:'PR-PAPR',publicDefinitionId,status:'ACTIVE' }],publicRuleVersions:[{ publicDefinitionId,publicRuleVersionId,status:'ACTIVE' }] });
  assert.ok(resolved.every((row) => row.status==='READY' && /^[0-9a-f]{64}$/.test(row.requirement.fingerprint)));
});

test('30 explicit canonical identity is fail-closed on contradictory evidence',() => {
  const valid=convergence.classifyLegacyActivity({ definitionCode:'DPS-EXERCICE',domain:'DPS',label:'Exercice DPS' });
  assert.equal(valid.classification,'A'); assert.equal(valid.manualReviewRequired,false);
  const partial=convergence.classifyLegacyActivity({ definitionCode:'DPS-EXERCICE',label:'Activite annuelle' });
  assert.equal(partial.classification,'A'); assert.equal(partial.manualReviewRequired,false);
  const contradictory=[
    { definitionCode:'DPS-EXERCICE',domain:'AUTO',label:'Formation AUTO TRUCK' },
    { definitionCode:'DAP-EXERCICE',domain:'DPS',label:'Exercice DPS' },
    { definitionCode:'DPS-EXERCICE',domain:'DPS',label:'Exercice DAP' },
    { definitionCode:'JSP-EXERCICE',domain:'JSP',label:'Exercice JSP cadet' },
    { definitionCode:'DPS-EXERCICE',domain:'AUTO',label:'Libelle opaque' }
  ].map(convergence.classifyLegacyActivity);
  assert.ok(contradictory.every((row) => !['A','B'].includes(row.classification) && row.manualReviewRequired));
  assert.ok(contradictory.every((row) => row.reasons.includes('CONTRADICTORY_CANONICAL_IDENTITY')));
  assert.equal(convergence.buildLegacyAliases(contradictory).length,0);
});

test('31 SQL guards enforce obligation occurrence and proposal session coherence',() => {
  const sql=ddl.DDL.join('\n');
  assert.match(sql,/scope_qv_proposal_catalog_link_guard_trg before insert or update of obligation_id,planned_occurrence_session_id/);
  assert.match(sql,/obligation_occurrence is distinct from session_occurrence/);
  assert.match(sql,/scope_qv_obligation_catalog_link_guard_trg before update of planned_occurrence_id/);
  assert.match(sql,/session\.planned_occurrence_id is distinct from new\.planned_occurrence_id/);
  const accepted=({ sourceType,obligationOccurrence,sessionOccurrence,sessionLinked }) => {
    if(sourceType==='CATALOG_C4' && !obligationOccurrence) return false;
    return !sessionLinked || obligationOccurrence===sessionOccurrence;
  };
  assert.equal(accepted({ sourceType:'CATALOG_C4',obligationOccurrence:'O1',sessionOccurrence:'O1',sessionLinked:true }),true);
  assert.equal(accepted({ sourceType:'CATALOG_C4',obligationOccurrence:'O1',sessionOccurrence:'O2',sessionLinked:true }),false);
  assert.equal(accepted({ sourceType:'CATALOG_C4',obligationOccurrence:'R1-O1',sessionOccurrence:'R2-O1',sessionLinked:true }),false);
  assert.equal(accepted({ sourceType:'MANUAL',obligationOccurrence:null,sessionOccurrence:null,sessionLinked:false }),true);
  assert.equal(accepted({ sourceType:'CATALOG_C4',obligationOccurrence:null,sessionOccurrence:null,sessionLinked:false }),false);
  const coherent={ sourceType:'CATALOG_C4',obligationOccurrence:'O1',sessionOccurrence:'O1',sessionLinked:true };
  assert.equal(accepted({ ...coherent,sessionOccurrence:'O2' }),false);
  assert.equal(accepted({ ...coherent,obligationOccurrence:'O2' }),false);
});

test('32 confirmed aliases preserve every semantic proof field',() => {
  const sql=ddl.DDL.join('\n');
  const fields=['source_type','source_value','normalized_value','definition_id','confidence','provenance','justification','metadata','status'];
  for(const field of fields) assert.match(sql,new RegExp(`new\\.${field} is distinct from old\\.${field}`),field);
  const original={ status:'CONFIRMED',source_type:'LEGACY',source_value:'Exercice DPS',normalized_value:'exercice dps',definition_id:'D1',confidence:1,
    provenance:'fixture',justification:'confirmed',metadata:{ source:'C5-B' } };
  const rejected=(before,after) => before.status==='CONFIRMED' && fields.some((field) => JSON.stringify(before[field])!==JSON.stringify(after[field]));
  for(const field of fields.filter((value) => value!=='status')){
    const changed={ ...original,[field]:field==='metadata' ? { source:'changed' } : `${String(original[field])}-changed` };
    assert.equal(rejected(original,changed),true,field);
  }
  assert.equal(rejected(original,{ ...original,status:'REVIEW_REQUIRED' }),true);
  assert.equal(rejected(original,{ ...original }),false);
  assert.equal(rejected({ ...original,status:'REVIEW_REQUIRED' },{ ...original,status:'REVIEW_REQUIRED',confidence:0.5 }),false);
});

let failed=0;
for(const { name,fn } of tests){ try{ fn(); process.stdout.write(`PASS ${name}\n`); }catch(error){ failed+=1; process.stderr.write(`FAIL ${name}\n${error.stack}\n`); } }
process.stdout.write(`RESULT ${tests.length-failed}/${tests.length} PASS\n`);
if(failed) process.exitCode=1;
