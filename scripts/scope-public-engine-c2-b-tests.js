'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const engine = require('../netlify/lib/_scope-public-engine');
const foundations = require('../netlify/lib/_scope-public-foundations');
const { adaptLegacyPersonnelFacts } = require('../netlify/lib/_scope-public-legacy-adapter');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('database/migrations/20260923_scope_public_engine_mirror_c2_b.sql');
const schema = read('netlify/lib/_scope-schema.js');

function version(code, overrides){
  const definition = foundations.PUBLIC_DEFINITIONS.find((row) => row.code === code);
  assert.ok(definition, `missing definition ${code}`);
  return { ...definition.version, ...(overrides || {}) };
}

function evaluate(code, facts, date = '2027-06-15', overrides){
  return engine.evaluatePublicRule({ ruleVersion: version(code, overrides), evaluationDate: date, ...facts });
}

const validRule = { op: 'ALL', children: [
  { predicate: 'HAS_OI', domainCode: 'DPS', oiCodes: ['G1'] },
  { predicate: 'PERSON_ELIGIBLE_AT' }
] };
assert.strictEqual(engine.validatePublicRule(validRule).valid, true);
assert.strictEqual(engine.validatePublicRule({ predicate: 'HAS_OI', domainCode: 'DAP', oiCodes: ['Y1'] }).valid, true);
assert.strictEqual(engine.validatePublicRule({ predicate: 'HAS_JSP_ROLE', roles: ['JEUNE'], oiCodes: ['G1','C1','B1'] }).valid, true);
for(const invalidRelation of [
  { predicate: 'HAS_OI', domainCode: 'DPS', oiCodes: ['Y1'] },
  { predicate: 'HAS_OI', domainCode: 'DAP', oiCodes: ['G1'] },
  { predicate: 'HAS_JSP_ROLE', roles: ['JEUNE'], oiCodes: ['Y1'] },
  { predicate: 'HAS_JSP_ROLE', roles: ['MONITEUR'], oiCodes: ['B2'] }
]) assert.strictEqual(engine.validatePublicRule(invalidRelation).valid, false, JSON.stringify(invalidRelation));
assert.strictEqual(engine.fingerprintPublicRule(validRule), engine.fingerprintPublicRule({ op: 'ALL', children: [...validRule.children].reverse() }));
for(const invalid of [
  {}, { op: 'SOME', children: [{ predicate: 'PERSON_ELIGIBLE_AT' }] }, { op: 'ALL', children: [] },
  { op: 'NOT', children: [] }, { op: 'NOT', children: [{ predicate: 'PERSON_ELIGIBLE_AT' }, { predicate: 'PERSON_ELIGIBLE_AT' }] },
  { predicate: 'HAS_PR_TRACK', trackCodes: ['PAPR'] }, { predicate: 'HAS_OI', domainCode: 'DPS', oiCodes: ['ZZ'] },
  { predicate: 'PERSON_ELIGIBLE_AT', label: 'Active' }, { predicate: 'HAS_COMPETENCE', competenceCodes: [] }
]) assert.strictEqual(engine.validatePublicRule(invalid).valid, false, JSON.stringify(invalid));

let deep = { predicate: 'PERSON_ELIGIBLE_AT' };
for(let index = 0; index < 9; index += 1) deep = { op: 'NOT', children: [deep] };
assert.strictEqual(engine.validatePublicRule(deep).valid, false);
assert.strictEqual(engine.validatePublicRule({ predicate: 'PERSON_ELIGIBLE_AT', padding: 'x'.repeat(engine.LIMITS.maxJsonBytes) }).valid, false);

assert.strictEqual(foundations.PUBLIC_DEFINITIONS.length, 21);
assert.strictEqual(new Set(foundations.PUBLIC_DEFINITIONS.map((row) => row.code)).size, 21);
assert.ok(foundations.PUBLIC_DEFINITIONS.every((row) => row.version.fingerprint === engine.fingerprintPublicRule(row.version.expression)));
assert.ok(!foundations.PUBLIC_DEFINITIONS.some((row) => /PAPR|PABC|GEN|JSP-CAD/.test(row.code)));
assert.deepStrictEqual(
  foundations.PUBLIC_DEFINITIONS.filter((row) => row.ownerCode === 'AUTO').map((row) => row.code),
  ['AUTO-COND-PL','AUTO-COND-VL','AUTO-COND-TP9','AUTO-GRUTIER','AUTO-MEA','AUTO-PILOTE-BAT']
);
assert.strictEqual(foundations.UNRESOLVED_PUBLIC_CANDIDATES.length, 12);
assert.deepStrictEqual(foundations.UNRESOLVED_PUBLIC_CANDIDATES.filter((row) => row.code.startsWith('PR-')).map((row) => row.code), ['PR-GEN','PR-PAPR','PR-PABC']);

const persons = [
  { personne_id: 'P1', actif: true, date_entree: '2020-01-01' },
  { personne_id: 'P1', actif: true },
  { personne_id: 'P2', actif: true },
  { personne_id: 'P3', actif: false }
];
const baseFacts = {
  persons, periods: [],
  assignments: [
    { id: 'A1', personne_id: 'P1', domaine_code: 'DPS', niveau_code: 'G1', date_debut: '2027-01-01', date_fin: '2027-06-15' },
    { id: 'A2', personne_id: 'P2', domaine_code: 'DPS', niveau_code: 'G1', date_debut: '2027-06-16' }
  ], competencies: [], fobaLevels: [], jspRoles: []
};
const boundary = evaluate('DPS-G1', baseFacts);
assert.deepStrictEqual(boundary.personIds, ['P1'], 'inclusive end and future start must be respected');
assert.strictEqual(boundary.traces.length, 1, 'default traces are included-only');
assert.strictEqual(boundary.personIds.filter((id) => id === 'P1').length, 1, 'persons must be deduplicated');
assert.strictEqual(boundary.ruleFingerprint.length, 64);
assert.strictEqual(boundary.resultFingerprint.length, 64);
assert.deepStrictEqual(Object.keys(boundary.tracesByPerson), ['P1']);
assert.strictEqual(boundary.tracesByPerson.P1.trace.children.find((child) => child.predicate === 'HAS_OI').evidence[0].oiCode, 'G1');
assert.throws(() => evaluate('DPS-G1', baseFacts, '2027-02-31'), /ISO date/);

const canonicalFixtureFacts = {
  persons: [
    { personneId: 'DPS', actif: true }, { personneId: 'DAP', actif: true },
    { personneId: 'F1', actif: true }, { personneId: 'F2', actif: true }, { personneId: 'F3', actif: true },
    { personneId: 'VL', actif: true }, { personneId: 'PL', actif: true }, { personneId: 'MEA', actif: true },
    { personneId: 'BAT', actif: true }, { personneId: 'OFSI', actif: true }, { personneId: 'NONE', actif: true }
  ],
  periods: [],
  assignments: [
    { id: 'OI-DPS', personneId: 'DPS', domainCode: 'DPS', oiCode: 'G1', validFrom: '2027-01-01' },
    { id: 'OI-DAP', personneId: 'DAP', domainCode: 'DAP', oiCode: 'Y1', validFrom: '2027-01-01' },
    { id: 'OI-DPS-2', personneId: 'DPS', domainCode: 'DAP', oiCode: 'Y1', validFrom: '2027-01-01' }
  ],
  fobaLevels: [
    { id: 'FOBA-1', personneId: 'F1', levelCode: '1' },
    { id: 'FOBA-2', personneId: 'F2', levelCode: '2' },
    { id: 'FOBA-3', personneId: 'F3', levelCode: '3' }
  ],
  competencies: [
    { id: 'C-VL', personneId: 'VL', competenceCode: 'COND_VL' },
    { id: 'C-PL', personneId: 'PL', competenceCode: 'COND_PL' },
    { id: 'C-MEA', personneId: 'MEA', competenceCode: 'MEA' },
    { id: 'C-BAT', personneId: 'BAT', competenceCode: 'PILOTE_BAT' },
    { id: 'C-OFSI', personneId: 'OFSI', competenceCode: 'OFSI' }
  ],
  jspRoles: []
};
for(const [code, expected] of [
  ['DPS-G1', ['DPS']], ['DAP-Y1', ['DAP','DPS']], ['FOBA-1', ['F1']], ['FOBA-2', ['F2']], ['FOBA-3', ['F3']],
  ['AUTO-COND-VL', ['VL']], ['AUTO-COND-PL', ['PL']], ['AUTO-MEA', ['MEA']], ['AUTO-PILOTE-BAT', ['BAT']],
  ['FOSPEC-OFSI', ['OFSI']]
]){
  const canonicalResult = evaluate(code, canonicalFixtureFacts);
  assert.deepStrictEqual(canonicalResult.personIds, expected, `${code} fixture`);
}
assert.deepStrictEqual(evaluate('DPS-G1', canonicalFixtureFacts).personIds, ['DPS'], 'multi-OI must not duplicate a person');
assert.deepStrictEqual(evaluate('DAP-Y1', canonicalFixtureFacts).personIds, ['DAP','DPS'], 'multi-public facts remain independently evaluable');
assert.ok(!evaluate('DPS-G1', canonicalFixtureFacts).personIds.includes('NONE'), 'person without assignment must remain excluded');

const assignmentWindowFacts = {
  persons: [{ personneId: 'A', actif: true }], periods: [], competencies: [], fobaLevels: [], jspRoles: [],
  assignments: [{ id: 'AW', personneId: 'A', domainCode: 'DPS', oiCode: 'G1', validFrom: '2027-06-10', validTo: '2027-06-20' }]
};
for(const [date, expected] of [
  ['2027-06-09', []], ['2027-06-10', ['A']], ['2027-06-15', ['A']],
  ['2027-06-20', ['A']], ['2027-06-21', []]
]) assert.deepStrictEqual(evaluate('DPS-G1', assignmentWindowFacts, date).personIds, expected, `assignment date ${date}`);
assignmentWindowFacts.assignments[0].validTo = null;
assert.deepStrictEqual(evaluate('DPS-G1', assignmentWindowFacts, '2030-01-01').personIds, ['A'], 'open-ended assignment');
assignmentWindowFacts.assignments[0].validFrom = null;
assert.deepStrictEqual(evaluate('DPS-G1', assignmentWindowFacts).personIds, [], 'assignment without start');
assignmentWindowFacts.assignments[0].validFrom = 'invalid';
assert.deepStrictEqual(evaluate('DPS-G1', assignmentWindowFacts).personIds, [], 'assignment with invalid start');

const anyRule = { expression: { op: 'ANY', children: [
  { predicate: 'HAS_COMPETENCE', competenceCodes: ['COND_PL'] },
  { predicate: 'HAS_COMPETENCE', competenceCodes: ['COND_VL'] }
] } };
assert.deepStrictEqual(engine.evaluatePublicRule({ ruleVersion: anyRule, evaluationDate: '2027-06-15', ...canonicalFixtureFacts }).personIds, ['PL','VL']);
const notRule = { expression: { op: 'ALL', children: [
  { predicate: 'PERSON_ELIGIBLE_AT' },
  { op: 'NOT', children: [{ predicate: 'HAS_COMPETENCE', competenceCodes: ['COND_PL'] }] }
] } };
assert.ok(!engine.evaluatePublicRule({ ruleVersion: notRule, evaluationDate: '2027-06-15', ...canonicalFixtureFacts }).personIds.includes('PL'));

const competenceWindowFacts = {
  persons: [{ personneId: 'Q', actif: true }], periods: [], assignments: [], fobaLevels: [], jspRoles: [],
  competencies: [{ id: 'Q1', personneId: 'Q', competenceCode: 'MEA', validFrom: '2027-06-10', validTo: '2027-06-20' }]
};
for(const [date, expected] of [
  ['2027-06-09', []], ['2027-06-10', ['Q']], ['2027-06-15', ['Q']],
  ['2027-06-20', ['Q']], ['2027-06-21', []]
]) assert.deepStrictEqual(evaluate('AUTO-MEA', competenceWindowFacts, date).personIds, expected, `competence date ${date}`);
competenceWindowFacts.competencies[0].validTo = null;
assert.deepStrictEqual(evaluate('AUTO-MEA', competenceWindowFacts, '2030-01-01').personIds, ['Q'], 'open-ended competence');

const domainRule = { expression: { predicate: 'HAS_DOMAIN_ASSIGNMENT', domainCodes: ['DPS'] } };
assert.deepStrictEqual(engine.evaluatePublicRule({ ruleVersion: domainRule, evaluationDate: '2027-06-15', ...canonicalFixtureFacts }).personIds, ['DPS']);
const jspRule = { expression: { predicate: 'HAS_JSP_ROLE', roles: ['MONITEUR'], oiCodes: ['G1'] } };
assert.deepStrictEqual(engine.evaluatePublicRule({
  ruleVersion: jspRule, evaluationDate: '2027-06-15', persons: [{ personneId: 'J1' }], periods: [],
  assignments: [], competencies: [], fobaLevels: [], jspRoles: [{ personneId: 'J1', role: 'MONITEUR', oiCode: 'G1' }]
}).personIds, ['J1']);

const personnelFacts = {
  persons: [{ personneId: 'X', actif: true }], assignments: [{ personneId: 'X', domainCode: 'DPS', oiCode: 'G1', validFrom: '2027-01-01' }],
  competencies: [], fobaLevels: [], jspRoles: []
};
assert.deepStrictEqual(evaluate('DPS-G1', { ...personnelFacts, periods: [{ personneId: 'X', type: 'DEMISSIONNAIRE', validFrom: '2027-01-01' }] }).personIds, [], 'demission');
assert.deepStrictEqual(evaluate('DPS-G1', { ...personnelFacts, periods: [
  { personneId: 'X', type: 'DEMISSIONNAIRE', validFrom: '2027-01-01', validTo: '2027-05-31' },
  { personneId: 'X', type: 'ACTIF', validFrom: '2027-06-01' }
] }).personIds, ['X'], 'reactivation');
assert.deepStrictEqual(evaluate('DPS-G1', { ...personnelFacts, periods: [
  { personneId: 'X', type: 'ACTIF', validFrom: '2027-01-01' },
  { personneId: 'X', type: 'DEMISSIONNAIRE', validFrom: '2027-01-01' }
] }).personIds, ['X'], 'legacy priority ACTIF over DEMISSIONNAIRE');

const missingPeriods = engine.evaluatePublicRule({
  ruleVersion: version('DPS-G1'), evaluationDate: '2027-06-15', persons: personnelFacts.persons,
  assignments: personnelFacts.assignments, competencies: [], fobaLevels: [], jspRoles: []
});
assert.strictEqual(missingPeriods.complete, false);
assert.strictEqual(missingPeriods.resolutionStatus, 'INCOMPLETE');
assert.ok(missingPeriods.warnings.includes('MISSING_INPUT_PERIODS'));
assert.deepStrictEqual(evaluate('DPS-G1', { ...personnelFacts, periods: [] }).personIds, ['X'], 'explicit empty periods are authoritative');

const exclusion = engine.explainPersonExclusion({ ruleVersion: version('DPS-G1'), evaluationDate: '2027-06-15', personId: 'P2', ...baseFacts });
assert.strictEqual(exclusion.matched, false);
assert.strictEqual(exclusion.trace.kind, 'OPERATOR');
assert.ok(exclusion.trace.children.some((child) => child.predicate === 'HAS_OI' && child.matched === false));
for(const [state, reason] of [['UNRESOLVED','UNRESOLVED'], ['AMBIGUOUS','AMBIGUOUS'], ['INCOMPLETE','INPUT_INCOMPLETE']]){
  const explained = engine.explainPersonExclusion({
    ruleVersion: version('DPS-G1', { resolutionStatus: state }), evaluationDate: '2027-06-15', personId: 'P1', ...baseFacts
  });
  assert.strictEqual(explained.complete, false);
  assert.strictEqual(explained.reason, reason);
}
const unresolvedUnknownPerson = engine.explainPersonExclusion({
  ruleVersion: version('DPS-G1', { resolutionStatus: 'UNRESOLVED' }), evaluationDate: '2027-06-15',
  personId: 'UNKNOWN', ...baseFacts
});
assert.strictEqual(unresolvedUnknownPerson.complete, false);
assert.strictEqual(unresolvedUnknownPerson.reason, 'UNRESOLVED');
const outsideExplanation = engine.explainPersonExclusion({
  ruleVersion: version('DPS-G1', { validFrom: '2027-06-16' }), evaluationDate: '2027-06-15', personId: 'P1', ...baseFacts
});
assert.strictEqual(outsideExplanation.complete, false);
assert.strictEqual(outsideExplanation.reason, 'RULE_VERSION_NOT_APPLICABLE');
const missingInputExplanation = engine.explainPersonExclusion({
  ruleVersion: version('DPS-G1'), evaluationDate: '2027-06-15', personId: 'P1', ...baseFacts, periods: undefined
});
assert.strictEqual(missingInputExplanation.complete, false);
assert.strictEqual(missingInputExplanation.reason, 'INPUT_INCOMPLETE');

const expired = evaluate('DPS-G1', baseFacts, '2027-06-16');
assert.deepStrictEqual(expired.personIds, ['P2']);
const outsideVersion = evaluate('DPS-G1', baseFacts, '2027-06-15', { validFrom: '2027-06-16' });
assert.strictEqual(outsideVersion.complete, false);
assert.strictEqual(outsideVersion.resolutionStatus, 'INCOMPLETE');
assert.deepStrictEqual(outsideVersion.personIds, []);

const missingCompetencies = engine.evaluatePublicRule({ ruleVersion: version('AUTO-COND-PL'), evaluationDate: '2027-06-15', persons, periods: [] });
assert.strictEqual(missingCompetencies.resolutionStatus, 'INCOMPLETE');
assert.ok(missingCompetencies.warnings.includes('MISSING_INPUT_COMPETENCIES'));
const unresolved = evaluate('DPS-G1', baseFacts, '2027-06-15', { resolutionStatus: 'UNRESOLVED' });
assert.strictEqual(unresolved.resolutionStatus, 'UNRESOLVED');
assert.deepStrictEqual(unresolved.personIds, []);
const missingMapping = engine.evaluatePublicRule({
  ruleVersion: version('DPS-G1'), evaluationDate: '2027-06-15', ...baseFacts,
  canonicalMappings: { resolutionStatus: 'UNRESOLVED', warnings: ['OI_MAPPING_MISSING'] }
});
assert.strictEqual(missingMapping.resolutionStatus, 'UNRESOLVED');
assert.ok(missingMapping.warnings.includes('OI_MAPPING_MISSING'));
const ambiguousMapping = engine.evaluatePublicRule({
  ruleVersion: version('DPS-G1'), evaluationDate: '2027-06-15', ...baseFacts,
  canonicalMappings: { resolutionStatus: 'AMBIGUOUS' }
});
assert.strictEqual(ambiguousMapping.resolutionStatus, 'AMBIGUOUS');

const multiSessionFacts = {
  persons: [{ personneId: 'P', actif: true }], periods: [],
  assignments: [{ id: 'M1', personneId: 'P', domainCode: 'DAP', oiCode: 'Y1', validFrom: '2027-06-21' }],
  competencies: [], fobaLevels: [], jspRoles: []
};
assert.deepStrictEqual(evaluate('DAP-Y1', multiSessionFacts, '2027-06-20').personIds, []);
assert.deepStrictEqual(evaluate('DAP-Y1', multiSessionFacts, '2027-06-21').personIds, ['P']);

const legacyAdapted = adaptLegacyPersonnelFacts({ persons: [{ personne_id: 'P1', actif: true }], periods: [], assignments: [
  { affectation_id: 'L1', personne_id: 'P1', domaine_code: 'AUTO', niveau_code: 'PL', date_debut: '2020-01-01' }
] });
assert.strictEqual(legacyAdapted.complete, true);
assert.strictEqual(legacyAdapted.competencies[0].competenceCode, 'COND_PL');
assert.deepStrictEqual(evaluate('AUTO-COND-PL', legacyAdapted).personIds, ['P1']);
const prAdapted = adaptLegacyPersonnelFacts({ assignments: [{ personne_id: 'P1', domaine_code: 'PR', niveau_code: 'PAPR' }] });
assert.strictEqual(prAdapted.resolutionStatus, 'UNRESOLVED');
assert.strictEqual(prAdapted.competencies.length, 0, 'PAPR must not be promoted to a person competence');
const pabcAdapted = adaptLegacyPersonnelFacts({ assignments: [{ personne_id: 'P1', domaine_code: 'PR', niveau_code: 'ABC' }] });
assert.strictEqual(pabcAdapted.resolutionStatus, 'UNRESOLVED');
assert.strictEqual(pabcAdapted.competencies.length, 0, 'PABC must not be promoted to a person competence');
const vlContexts = adaptLegacyPersonnelFacts({ assignments: [
  { id: 'VL-DPS', personne_id: 'P1', domaine_code: 'AUTO', niveau_code: 'VL_DPS', date_debut: '2020-01-01' },
  { id: 'VL-DAP', personne_id: 'P2', domaine_code: 'AUTO', niveau_code: 'VL_DAP', date_debut: '2020-01-01' }
] });
assert.deepStrictEqual(vlContexts.competencies.map((row) => row.competenceCode), ['COND_VL','COND_VL']);
assert.deepStrictEqual(vlContexts.competencies.map((row) => [row.legacyCode, row.legacyContext]), [['VL_DPS','DPS'],['VL_DAP','DAP']]);
const vlTrace = evaluate('AUTO-COND-VL', { ...vlContexts, persons: [{ personneId: 'P1' }, { personneId: 'P2' }], periods: [] });
assert.deepStrictEqual(vlTrace.personIds, ['P1','P2']);
assert.deepStrictEqual(vlTrace.traces.map((row) => {
  const evidence = row.trace.children.find((child) => child.predicate === 'HAS_COMPETENCE').evidence[0];
  return [evidence.competenceCode, evidence.legacyCode, evidence.legacyContext];
}), [['COND_VL','VL_DPS','DPS'],['COND_VL','VL_DAP','DAP']]);

const parity = engine.compareLegacyAndCanonical({ complete: true, personIds: ['P2', 'P1', 'P1'] }, { complete: true, personIds: ['P1', 'P3'], resolutionStatus: 'COMPLETE' });
assert.deepStrictEqual(parity.commonPersonIds, ['P1']);
assert.deepStrictEqual(parity.legacyOnlyPersonIds, ['P2']);
assert.deepStrictEqual(parity.canonicalOnlyPersonIds, ['P3']);
assert.deepStrictEqual(parity.differences.map((row) => row.probableCause), ['CANONICAL_RULE_EXCLUDED','LEGACY_RULE_EXCLUDED']);
const incompleteParity = engine.compareLegacyAndCanonical({ complete: true, personIds: ['P1'] }, unresolved);
assert.strictEqual(incompleteParity.complete, false);
assert.strictEqual(incompleteParity.resolutionStatus, 'UNRESOLVED');

assert.strictEqual(engine.validateRuleVersionSet([
  { publicDefinitionId: 'D1', status: 'ACTIVE', validFrom: '2027-01-01', validTo: '2027-06-30' },
  { publicDefinitionId: 'D1', status: 'ACTIVE', validFrom: '2027-06-30' }
]).valid, false, 'inclusive active version overlap must be rejected');
for(const [from, to, expected] of [
  ['DRAFT','DRAFT',true], ['DRAFT','ACTIVE',true], ['ACTIVE','ACTIVE',true], ['ACTIVE','RETIRED',true],
  ['RETIRED','RETIRED',true], ['ACTIVE','DRAFT',false], ['RETIRED','ACTIVE',false], ['RETIRED','DRAFT',false]
]) assert.strictEqual(engine.validateRuleStatusTransition(from, to), expected, `${from} -> ${to}`);

for(const table of ['scope_public_definitions', 'scope_public_rule_versions']){
  assert.ok(migration.includes(`create table if not exists ${table}`));
  assert.ok(schema.includes(`create table if not exists ${table}`));
  assert.ok(migration.includes(`alter table ${table} enable row level security`));
}
assert.ok(migration.includes('active public rule versions are semantically immutable'));
assert.ok(migration.includes('overlapping active public rule versions are forbidden'));
assert.ok(migration.includes('public definition code is immutable'));
for(const fragment of [
  "old.status = 'DRAFT' and new.status in ('DRAFT','ACTIVE')",
  "old.status = 'ACTIVE' and new.status in ('ACTIVE','RETIRED')",
  "old.status = 'RETIRED' and new.status = 'RETIRED'",
  'invalid public rule version status transition'
]){
  assert.ok(migration.includes(fragment), `standalone lifecycle missing: ${fragment}`);
  assert.ok(schema.includes(fragment), `runtime lifecycle missing: ${fragment}`);
}
assert.ok(schema.includes("const LATEST_SCOPE_SCHEMA_VERSION = 'scope-annual-catalog-c4-b'"));
assert.ok(!/references scope_(evenements|attendus|exercices|cibles)/i.test(migration));
assert.ok(!/\b(update|delete from|alter table)\s+scope_(evenements|attendus|participations|cibles)\b/i.test(migration));
assert.ok(!/insert into scope_(evenements|attendus|participations|cibles)\b/i.test(migration));
assert.ok(!/HAS_PR_TRACK/.test(migration));
for(const row of foundations.PUBLIC_DEFINITIONS){
  assert.ok(migration.includes(`('${row.code}'`), `SQL seed missing ${row.code}`);
  assert.ok(migration.includes(row.version.fingerprint), `SQL fingerprint missing ${row.code}`);
}

const diffNames = childProcess.execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim().split(/\n/).filter(Boolean);
for(const forbidden of [
  'netlify/lib/_scope-service.js', 'netlify/lib/_scope-rules.js', 'netlify/lib/_scope-target-resolution.js',
  'netlify/lib/_scope-memory.js', 'assets/js/scope-personnel-populations.js', 'netlify/lib/_scope-quo-vadis-service.js',
  'netlify/lib/_scope-statcom-referential.js', 'netlify/lib/_auth-utils.js', 'netlify/lib/_oidc-utils.js'
]) assert.ok(!diffNames.includes(forbidden), `${forbidden} must remain unchanged`);

console.log('scope-public-engine-c2-b-tests: ok');
