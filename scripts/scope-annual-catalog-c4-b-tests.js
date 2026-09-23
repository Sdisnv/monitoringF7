'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../netlify/lib/_scope-annual-catalog');
const ddl = require('../netlify/lib/_scope-annual-catalog-ddl');
const { runDiagnostic } = require('./scope-annual-catalog-c4-b-diagnostic');

const ROOT = path.resolve(__dirname,'..');
const MIGRATION = path.join(ROOT,'database/migrations/20260924_scope_annual_catalog_c4_b.sql');
const SCHEMA = path.join(ROOT,'netlify/lib/_scope-schema.js');
const tests = [];
function test(name,fn){ tests.push({ name,fn }); }
function errors(result){ return result.errors.map((row) => row.code); }
function uuid(seed){ return `${seed.padEnd(8,'0').slice(0,8)}-0000-4000-8000-000000000000`; }

const ids = {
  version: uuid('a1'),session1: uuid('b1'),session2: uuid('b2'),public: uuid('c1'),rule: uuid('c2'),qualification: uuid('d1'),role: uuid('e1'),requirement: uuid('f1')
};
const sessions = [
  { sessionTemplateId: ids.session1,code: 'S1',sequence: 1,label: 'Preparation',durationMinutes: 90 },
  { sessionTemplateId: ids.session2,code: 'S2',sequence: 2,label: 'Exercice',durationMinutes: 180,dependsOnSessionTemplateId: ids.session1,publicContinuity: 'SAME' }
];
const definitionInput = {
  definition: { code: 'EX-DPS-DAP',activityType: 'EXERCISE' },
  domainBindings: [{ domainCode: 'DPS',bindingRole: 'PRIMARY' },{ domainCode: 'DAP',bindingRole: 'SECONDARY' }],
  sessionTemplates: sessions,periodicity: { type: 'TIMES_PER_YEAR',occurrencesPerCycle: 2 },
  publicBindings: [{ publicDefinitionId: ids.public,operator: 'UNION' }],
  qualificationBindings: [{ competenceId: ids.qualification,bindingType: 'PREREQUISITE' }],
  roleRequirements: [{ roleDefinitionId: ids.role,minimumCount: 1,recommendedCount: 2 }],
  planningConstraints: [{ type: 'SESSION_ORDER',severity: 'HARD',config: { beforeSessionCode: 'S1',afterSessionCode: 'S2' } }],
  statisticalContributions: [{ statcomCode: 'DPS',mode: 'FULL_DURATION' },{ statcomCode: 'DAP',mode: 'PERCENTAGE',value: 50 }]
};
function readyRequirement(overrides = {},sessionTemplates = sessions,periodicity = { type: 'ANNUAL' }){
  const requirement = { id: ids.requirement,status: 'READY',requiredOccurrences: 1,...overrides };
  const snapshot = {
    definition: { code: 'EX-DPS-DAP',activityType: 'EXERCISE' },version: { id: ids.version },requirement: structuredClone(requirement),
    domainBindings: [],sessionTemplates: structuredClone(sessionTemplates),periodicity: structuredClone(periodicity),publicBindings: [],
    qualificationBindings: [],roleRequirements: [],locationRequirements: [],responsibleRequirements: [],planningConstraints: [],statisticalContributions: []
  };
  return { ...requirement,snapshot,fingerprint: catalog.fingerprint(snapshot) };
}

test('01 stable definition identity is separate from version configuration',() => {
  const sql = ddl.DDL.join('\n');
  assert.match(sql,/alter table scope_event_definitions add column if not exists family_code/);
  assert.match(sql,/alter table scope_event_definition_versions add column if not exists status/);
  assert.match(ddl.GUARD_SQL,/active C4 activity definition versions cannot be deleted/);
  assert.match(ddl.GUARD_SQL,/active activity definition versions are semantically immutable/);
});

test('02 DPS-DAP is one valid multi-domain activity',() => {
  assert.equal(catalog.validateDefinitionContract(definitionInput).valid,true);
  assert.equal(definitionInput.domainBindings.length,2);
  assert.match(ddl.DDL.join('\n'),/scope_activity_domain_primary_uk/);
});

test('03 session templates support arbitrary N',() => {
  const many = Array.from({ length: 12 },(_,i) => ({ sessionTemplateId: uuid(`s${i}`),code: `S${i + 1}`,sequence: i + 1,label: `Session ${i + 1}`,durationMinutes: 30 }));
  assert.equal(catalog.validateSessionTemplates(many).valid,true);
  assert.doesNotMatch(ddl.DDL.join('\n'),/session_count\s*<=|sequence\s*<=/i);
  const backwards = structuredClone(sessions); backwards[0].dependsOnSessionTemplateId = ids.session2;
  assert.ok(errors(catalog.validateSessionTemplates(backwards)).includes('SESSION_DEPENDENCY_MUST_PRECEDE'));
});

test('04 generator creates required occurrences and all sessions',() => {
  const result = catalog.generateAnnualProgram({ requirement: readyRequirement({ requiredOccurrences: 3 }),periodicity: { type: 'ANNUAL' },sessionTemplates: sessions });
  assert.equal(result.complete,true); assert.equal(result.occurrences.length,3); assert.equal(result.sessions.length,6);
});

test('05 periodicity combinations are strict',() => {
  for(const input of [{ type: 'ANNUAL' },{ type: 'TIMES_PER_YEAR',occurrencesPerCycle: 2 },{ type: 'EVERY_N_MONTHS',intervalValue: 6 },{ type: 'EVERY_N_YEARS',intervalValue: 2 },{ type: 'ONE_OFF',anchorYear: 2027 },{ type: 'CURRICULUM' },{ type: 'ON_DEMAND' }]) assert.equal(catalog.validatePeriodicity(input).valid,true,input.type);
  assert.equal(catalog.validatePeriodicity({ type: 'EVERY_N_MONTHS' }).valid,false);
  assert.equal(catalog.validatePeriodicity({ type: 'ANNUAL',intervalValue: 1 }).valid,false);
});

test('06 public bindings reference C2-B definitions and restricted operators',() => {
  assert.equal(catalog.validateDefinitionContract(definitionInput).valid,true);
  const bad = structuredClone(definitionInput); bad.publicBindings[0].operator = 'XOR';
  assert.ok(errors(catalog.validateDefinitionContract(bad)).includes('UNKNOWN_PUBLIC_OPERATOR'));
  assert.match(ddl.DDL.join('\n'),/references scope_public_definitions\(public_definition_id\)/);
});

test('07 READY pins exactly one active public rule version',() => {
  const base = { ...definitionInput,requirement: { id: ids.requirement,year: 2027,status: 'DRAFT' },version: { id: ids.version },publicBindings: [{ publicDefinitionId: ids.public }],publicDefinitions: [{ publicDefinitionId: ids.public,status: 'ACTIVE' }] };
  const valid = catalog.prepareAnnualRequirementReady({ ...base,publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE',validFrom: '2026-01-01' }] });
  assert.equal(valid.valid,true); assert.equal(valid.publicBindings[0].publicRuleVersionId,ids.rule); assert.match(valid.requirement.fingerprint,/^[0-9a-f]{64}$/);
  assert.ok(errors(catalog.prepareAnnualRequirementReady({ ...base,publicRuleVersions: [] })).includes('MISSING_PUBLIC_RULE_VERSION'));
  assert.ok(errors(catalog.prepareAnnualRequirementReady({ ...base,publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE' },{ publicRuleVersionId: uuid('c3'),publicDefinitionId: ids.public,status: 'ACTIVE' }] })).includes('AMBIGUOUS_PUBLIC_RULE_VERSION'));
  const explicit = { ...base,publicBindings: [{ publicDefinitionId: ids.public,publicRuleVersionId: ids.rule }] };
  assert.equal(catalog.prepareAnnualRequirementReady({ ...explicit,publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE',validFrom: '2026-01-01' }] }).valid,true);
  assert.ok(errors(catalog.prepareAnnualRequirementReady({ ...explicit,publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE',validFrom: '2028-01-01' }] })).includes('MISSING_PUBLIC_RULE_VERSION'));
  assert.ok(errors(catalog.prepareAnnualRequirementReady({ ...explicit,publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE',validFrom: '2020-01-01',validTo: '2026-12-31' }] })).includes('MISSING_PUBLIC_RULE_VERSION'));
  assert.equal(catalog.prepareAnnualRequirementReady({ ...explicit,publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE',validFrom: '2026-01-01',validTo: null }] }).valid,true);
});

test('08 qualification bindings keep prerequisite, taught and renewed separate',() => {
  for(const bindingType of catalog.QUALIFICATION_BINDING_TYPES){
    const fixture = structuredClone(definitionInput); fixture.qualificationBindings = [{ competenceId: ids.qualification,bindingType }];
    assert.equal(catalog.validateDefinitionContract(fixture).valid,true,bindingType);
  }
});

test('09 role requirements do not assign a holder',() => {
  assert.equal(catalog.validateDefinitionContract(definitionInput).valid,true);
  const bad = structuredClone(definitionInput); bad.roleRequirements[0].personne_id = 'P-1';
  assert.ok(errors(catalog.validateDefinitionContract(bad)).includes('PERSON_ASSIGNMENT_FORBIDDEN'));
});

test('10 planning constraints validate all severities and reject free-form types',() => {
  for(const severity of catalog.CONSTRAINT_SEVERITIES) assert.equal(catalog.validatePlanningConstraint({ type: 'CAPACITY',severity,config: { maximum: 20 } }).valid,true);
  assert.equal(catalog.validatePlanningConstraint({ type: 'SQL',severity: 'HARD',config: { query: 'select 1' } }).valid,false);
  for(const [type,config] of [
    ['CAPACITY',{ maximum: 10,minimum: 0 }],['DURATION',{ minutes: 90 }],['MONTH',{ months: [1,6,12] }],
    ['WEEKDAY',{ weekdays: [1,5] }],['DATE_WINDOW',{ start: '2027-01-01',end: '2027-12-31' }],
    ['TIME_WINDOW',{ start: '08:30',end: '12:00' }],['SESSION_SPACING',{ minimumMinutes: 60 }],
    ['SESSION_ORDER',{ beforeSessionCode: 'S1',afterSessionCode: 'S2' }],
    ['INCOMPATIBILITY',{ activityCodes: ['A','B'] }],['RESOURCE_AVAILABILITY',{ resourceCodes: ['ROOM-A'] }]
  ]) assert.equal(catalog.validatePlanningConstraint({ type,severity: 'HARD',config }).valid,true,type);
  for(const [type,config] of [
    ['CAPACITY',{ maximum: -4 }],['DURATION',{ minutes: 'nonsense' }],['MONTH',{ months: 'not-an-array' }],
    ['MONTH',{ months: [0,13] }],['WEEKDAY',{ weekdays: [0,8] }],['DATE_WINDOW',{ start: 'invalid',end: '2027-12-31' }],
    ['DATE_WINDOW',{ start: '2027-12-31',end: '2027-01-01' }],['TIME_WINDOW',{ start: '15:00',end: '08:00' }],
    ['SESSION_SPACING',{ minimumMinutes: 0 }],['SESSION_ORDER',{ beforeSessionCode: 'S1',afterSessionCode: 'S1' }],
    ['INCOMPATIBILITY',{ activityCodes: [] }],['RESOURCE_AVAILABILITY',{ resourceCodes: 'ROOM-A' }]
  ]) assert.equal(catalog.validatePlanningConstraint({ type,severity: 'HARD',config }).valid,false,`${type} invalid`);
  const orderContract = (sessionTemplates,orders) => ({ ...structuredClone(definitionInput),sessionTemplates,
    planningConstraints: orders.map(([beforeSessionCode,afterSessionCode]) => ({ type: 'SESSION_ORDER',severity: 'HARD',config: { beforeSessionCode,afterSessionCode } })) });
  assert.equal(catalog.validateDefinitionContract(orderContract(sessions,[['S1','S2']])).valid,true,'known order');
  assert.ok(errors(catalog.validateDefinitionContract(orderContract(sessions,[['UNKNOWN','S1']]))).includes('UNKNOWN_SESSION_ORDER_REFERENCE'));
  assert.ok(errors(catalog.validateDefinitionContract(orderContract(sessions,[['S1','UNKNOWN']]))).includes('UNKNOWN_SESSION_ORDER_REFERENCE'));
  assert.ok(errors(catalog.validateDefinitionContract(orderContract(sessions,[['UNKNOWN1','UNKNOWN2']]))).includes('UNKNOWN_SESSION_ORDER_REFERENCE'));
  assert.ok(errors(catalog.validateDefinitionContract(orderContract(sessions,[['S1','S1']]))).includes('INVALID_SESSION_ORDER_CONFIG'));
  assert.ok(errors(catalog.validateDefinitionContract(orderContract([sessions[0]],[['S1','S2']]))).includes('UNKNOWN_SESSION_ORDER_REFERENCE'),'other-version session rejected');
  const threeSessions = [...sessions,{ sessionTemplateId: uuid('b3'),code: 'S3',sequence: 3,label: 'Debrief',durationMinutes: 45,dependsOnSessionTemplateId: ids.session2 }];
  assert.equal(catalog.validateDefinitionContract(orderContract(threeSessions,[['S1','S2'],['S2','S3']])).valid,true,'multiple known orders');
});

test('11 an activity supports multiple Stat.Com contributions',() => {
  assert.equal(definitionInput.statisticalContributions.length,2);
  assert.equal(catalog.validateDefinitionContract(definitionInput).valid,true);
  assert.match(ddl.DDL.join('\n'),/scope_activity_statistical_contributions/);
});

test('12 contribution modes are strictly validated',() => {
  assert.equal(catalog.validateStatisticalContribution({ statcomCode: 'A',mode: 'FULL_DURATION' }).valid,true);
  assert.equal(catalog.validateStatisticalContribution({ statcomCode: 'A',mode: 'FIXED_MINUTES',value: 30 }).valid,true);
  assert.equal(catalog.validateStatisticalContribution({ statcomCode: 'A',mode: 'PERCENTAGE',value: 25 }).valid,true);
  assert.equal(catalog.validateStatisticalContribution({ statcomCode: 'A',mode: 'MANUAL' }).valid,true);
  assert.equal(catalog.validateStatisticalContribution({ statcomCode: 'A',mode: 'PERCENTAGE',value: 101 }).valid,false);
});

test('13 FOSPEC remains data-driven',() => {
  for(const code of ['OFSI','VPC','NAC','ANTICHUTE','SANITAIRE','FUTURE_SPECIALITY']){
    const fixture = structuredClone(definitionInput); fixture.qualificationBindings = [{ competenceId: uuid(code),bindingType: 'TAUGHT',metadata: { code } }];
    assert.equal(catalog.validateDefinitionContract(fixture).valid,true,code);
  }
});

test('14 AUTO remains data-driven',() => {
  for(const code of ['COND_PL','COND_VL','COND_TP9','PILOTE_BAT','MACHINISTE_EA','GRUTIER','CARISTE','FUTURE_AUTO']){
    const fixture = structuredClone(definitionInput); fixture.qualificationBindings = [{ competenceId: uuid(code),bindingType: 'PREREQUISITE',metadata: { code } }];
    assert.equal(catalog.validateDefinitionContract(fixture).valid,true,code);
  }
});

test('15 C4-B creates no CADET structure or seed',() => {
  const implementation = [fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-annual-catalog.js'),'utf8'),ddl.DDL.join('\n'),fs.readFileSync(MIGRATION,'utf8')].join('\n');
  assert.doesNotMatch(implementation,/CADET/i);
});

test('16 JSP-CAD stays fail-closed at READY',() => {
  const result = catalog.prepareAnnualRequirementReady({ requirement: { year: 2027,status: 'DRAFT' },publicBindings: [{ publicDefinitionId: ids.public }],publicDefinitions: [{ publicDefinitionId: ids.public,status: 'INACTIVE',code: 'JSP-CAD' }],publicRuleVersions: [] });
  assert.equal(result.valid,false); assert.ok(errors(result).includes('PUBLIC_DEFINITION_NOT_ACTIVE'));
});

test('17 annual generation is deterministic and input-pure',() => {
  const input = { requirement: readyRequirement({ requiredOccurrences: 2 }),periodicity: { type: 'ANNUAL' },sessionTemplates: sessions };
  const before = JSON.stringify(input); const first = catalog.generateAnnualProgram(input); const second = catalog.generateAnnualProgram(input);
  assert.deepEqual(first,second); assert.equal(first.complete,true); assert.equal(JSON.stringify(input),before);
  const staleSnapshot = structuredClone(input); staleSnapshot.requirement.snapshot.periodicity = { type: 'ON_DEMAND' };
  assert.ok(errors(catalog.generateAnnualProgram(staleSnapshot)).includes('INVALID_ANNUAL_REQUIREMENT_SNAPSHOT'));
  const divergentSession = structuredClone(input); divergentSession.sessionTemplates[0].durationMinutes = 999;
  assert.ok(errors(catalog.generateAnnualProgram(divergentSession)).includes('GENERATION_INPUT_DIVERGES_FROM_SNAPSHOT'));
  const divergentPeriodicity = structuredClone(input); divergentPeriodicity.periodicity = { type: 'TIMES_PER_YEAR',occurrencesPerCycle: 2 };
  assert.ok(errors(catalog.generateAnnualProgram(divergentPeriodicity)).includes('GENERATION_INPUT_DIVERGES_FROM_SNAPSHOT'));
  const divergentOccurrences = structuredClone(input); divergentOccurrences.requirement.requiredOccurrences = 3;
  assert.ok(errors(catalog.generateAnnualProgram(divergentOccurrences)).includes('GENERATION_INPUT_DIVERGES_FROM_SNAPSHOT'));
});

test('18 catalogue contracts forbid person assignment',() => {
  const bad = structuredClone(definitionInput); bad.responsibleRequirements = [{ fonction: 'CHEF',personId: 'P-1' }];
  assert.ok(errors(catalog.validateDefinitionContract(bad)).includes('PERSON_ASSIGNMENT_FORBIDDEN'));
  assert.doesNotMatch(ddl.DDL.join('\n'),/personne_id|person_id/i);
});

test('19 generator creates no operational event, expected population or participation',() => {
  const source = fs.readFileSync(path.join(ROOT,'netlify/lib/_scope-annual-catalog.js'),'utf8');
  assert.doesNotMatch(source,/require\(['"](?:pg|\.\/_scope-db)|fetch\s*\(|scope_evenements|scope_attendus|scope_participations/);
});

test('20 QV projection is pure and carries only identifiers',() => {
  const generated = catalog.generateAnnualProgram({ requirement: readyRequirement({ label: 'Exercice' }),periodicity: { type: 'ANNUAL' },sessionTemplates: sessions });
  const before = JSON.stringify(generated); const projected = catalog.projectToQuoVadis({ requirement: { label: 'Exercice' },definition: { domain: 'DPS' },...generated });
  assert.equal(projected.obligations.length,1); assert.equal(projected.sessionIntents.length,2); assert.equal(projected.obligations[0].noOperationalEventCreated,true); assert.equal(JSON.stringify(generated),before);
});

test('21 standalone migration and runtime DDL are structurally identical',() => {
  const migration = fs.readFileSync(MIGRATION,'utf8').replace(/\s+/g,' ');
  for(const statement of [...ddl.DDL,ddl.GUARD_SQL,...ddl.CHILD_TABLES.map(ddl.childTriggerSql),ddl.PROTECTION_SQL]){
    assert.ok(migration.includes(statement.replace(/\s+/g,' ').trim()),statement.slice(0,80));
  }
  const schema = fs.readFileSync(SCHEMA,'utf8');
  assert.match(schema,/require\('\.\/_scope-annual-catalog-ddl'\)/); assert.match(schema,/migrateAnnualCatalogC4B/);
});

test('22 DDL is structurally idempotent and protected',() => {
  const sql = ddl.DDL.join('\n').toLowerCase();
  assert.ok(ddl.DDL.filter((statement) => /^create (table|(?:unique )?index)/i.test(statement)).every((statement) => /if not exists/i.test(statement)));
  assert.ok(ddl.DDL.filter((statement) => /add column/i.test(statement)).every((statement) => /if not exists/i.test(statement)));
  for(const constraint of ['scope_event_definitions_activity_type_chk','scope_event_definition_versions_status_chk','scope_event_definition_versions_fingerprint_chk']){
    assert.match(sql,new RegExp(`drop constraint if exists ${constraint}`));
    assert.match(sql,new RegExp(`add constraint ${constraint}`));
  }
  for(const table of ['scope_activity_domain_bindings','scope_activity_session_templates','scope_activity_periodicities','scope_annual_requirements','scope_activity_public_bindings','scope_activity_qualification_bindings','scope_activity_role_requirements','scope_location_categories','scope_activity_location_requirements','scope_activity_responsible_requirements','scope_activity_planning_constraints','scope_activity_statistical_contributions','scope_planned_occurrences','scope_planned_occurrence_sessions']){
    assert.match(sql,new RegExp(`create table if not exists ${table}`)); assert.match(ddl.PROTECTION_SQL,new RegExp(`'${table}'`));
  }
  assert.match(ddl.PROTECTION_SQL,/enable row level security/); assert.match(ddl.PROTECTION_SQL,/revoke all/);
  assert.match(ddl.GUARD_SQL,/requires one primary domain/); assert.match(ddl.GUARD_SQL,/planned session template does not belong/);
  assert.match(ddl.GUARD_SQL,/supersedes_annual_requirement_id is distinct from old\.supersedes_annual_requirement_id/);
  assert.match(ddl.GUARD_SQL,/version\.valid_from.*coalesce\(new\.window_start,make_date\(new\.year,1,1\)\)/s);
  assert.match(ddl.GUARD_SQL,/session order constraints must reference templates from the same activity definition version/);
  const ready = (fields) => ({ status: 'READY',year: 2027,snapshot: { a: 1 },fingerprint: 'a'.repeat(64),...fields });
  assert.equal(catalog.validateAnnualRequirementMutation(ready({ supersedesAnnualRequirementId: 'A' }),ready({ supersedesAnnualRequirementId: 'A' })).valid,true,'camel only');
  assert.equal(catalog.validateAnnualRequirementMutation(ready({ supersedes_annual_requirement_id: 'A' }),ready({ supersedes_annual_requirement_id: 'A' })).valid,true,'snake only');
  assert.equal(catalog.validateAnnualRequirementMutation(ready({ supersedesAnnualRequirementId: 'A' }),ready({ supersedesAnnualRequirementId: 'A',supersedes_annual_requirement_id: 'A' })).valid,true,'identical aliases');
  assert.ok(errors(catalog.validateAnnualRequirementMutation(ready({ supersedesAnnualRequirementId: null }),ready({ supersedesAnnualRequirementId: null,supersedes_annual_requirement_id: 'A' }))).includes('CONFLICTING_FIELD_ALIASES'));
  assert.ok(errors(catalog.validateAnnualRequirementMutation(ready({ supersedesAnnualRequirementId: 'A' }),ready({ supersedesAnnualRequirementId: 'A',supersedes_annual_requirement_id: null }))).includes('CONFLICTING_FIELD_ALIASES'));
  assert.ok(errors(catalog.validateAnnualRequirementMutation(ready({ supersedesAnnualRequirementId: 'A' }),ready({ supersedes_annual_requirement_id: 'B' }))).includes('READY_ANNUAL_REQUIREMENT_SEMANTICALLY_IMMUTABLE'));
  assert.equal(catalog.validateAnnualRequirementMutation({ status: 'DRAFT',supersedesAnnualRequirementId: null },{ status: 'DRAFT',supersedes_annual_requirement_id: 'A' }).valid,true,'draft mutation');
  assert.equal(catalog.validateAnnualRequirementMutation(ready({ supersedesAnnualRequirementId: 'A' }),{ ...ready({ supersedesAnnualRequirementId: 'A' }),status: 'SUPERSEDED' }).valid,true);
});

test('23 legacy diagnostic classifies without producing writes',() => {
  const report = runDiagnostic([{ domain: 'DPS',label: 'Definition',definitionId: 'D1' },{ domain: 'AUTO',label: 'Test recette' },{ domain: 'DAP',label: 'Repeated' },{ domain: 'DAP',label: 'Repeated' },{ domain: 'DAP',label: 'Repeated' }]);
  assert.deepEqual(report.counts,{ A: 1,B: 1,C: 0,D: 1 }); assert.equal(report.mode,'READ_ONLY_DIAGNOSTIC'); assert.equal(report.generatedAt,null);
});

let failed = 0;
for(const { name,fn } of tests){
  try { fn(); process.stdout.write(`PASS ${name}\n`); }
  catch(error){ failed += 1; process.stderr.write(`FAIL ${name}\n${error.stack}\n`); }
}
process.stdout.write(`RESULT ${tests.length - failed}/${tests.length} PASS\n`);
if(failed) process.exitCode = 1;
