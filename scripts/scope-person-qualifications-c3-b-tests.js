'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const qualifications = require('../netlify/lib/_scope-person-qualifications');
const engine = require('../netlify/lib/_scope-public-engine');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'database/migrations/20260923_scope_person_qualifications_c3_b.sql'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'netlify/lib/_scope-schema.js'), 'utf8');
const ddl = fs.readFileSync(path.join(root, 'netlify/lib/_scope-person-qualifications-ddl.js'), 'utf8');
const runtime = schema + ddl + fs.readFileSync(path.join(root, 'netlify/lib/_scope-person-qualifications.js'), 'utf8');
const runtimeDdl = require('../netlify/lib/_scope-person-qualifications-ddl');

function assignment(id, personneId, domaine, cible, from = '2027-01-01', to = null, extra = {}){
  return { id, personne_id: personneId, categorie: 'SPECIALISATION', domaine, cible, date_actif: from, date_inactif: to, ...extra };
}

const catalog = qualifications.ALL_QUALIFICATION_CODES;
assert.ok(catalog.includes('PAPR') && catalog.includes('PABC'));
assert.ok(catalog.includes('VPC') && !catalog.includes('OP_VPC'));
assert.strictEqual(qualifications.canonicalizeQualification('FOSPEC', 'OP_VPC').qualificationCode, 'VPC');
assert.strictEqual(qualifications.canonicalizeQualification('FOSPEC', 'OP VPC').qualificationCode, 'VPC');

const backfill = qualifications.buildPersonQualificationBackfill([
  assignment('PL', 'AUTO-1', 'AUTO', 'PL'),
  assignment('TP9', 'AUTO-2', 'AUTO', 'TP9'),
  assignment('BAT', 'AUTO-3', 'AUTO', 'BAT'),
  assignment('VLDPS', 'VL', 'AUTO', 'VL_DPS'),
  assignment('VLDAP', 'VL', 'AUTO', 'VL_DAP'),
  assignment('EA', 'AUTO-4', 'AUTO', 'MACHINISTE_EA'),
  assignment('PAPR', 'PR-OK', 'PR', 'PR'),
  assignment('PABC', 'PR-OK', 'PR', 'PR-ABC'),
  assignment('PABC-ONLY', 'PR-REVIEW', 'PR', 'ABC'),
  assignment('OFSI', 'FO-1', 'FOSPEC', 'OFSI'),
  assignment('VPC', 'FO-2', 'FOSPEC', 'VPC'),
  assignment('OPVPC', 'FO-2', 'FOSPEC', 'OP_VPC'),
  assignment('NAC', 'FO-3', 'FOSPEC', 'NAC'),
  assignment('ANTI', 'FO-4', 'FOSPEC', 'ANTICHUTE'),
  assignment('SAN', 'FO-5', 'FOSPEC', 'SANITAIRE')
]);
assert.strictEqual(backfill.qualifications.filter((row) => row.personneId === 'VL' && row.competenceCode === 'COND_VL').length, 1);
assert.deepStrictEqual(
  backfill.qualifications.find((row) => row.personneId === 'VL').evidence.map((row) => row.legacyContext).sort(),
  ['DAP', 'DPS']
);
assert.strictEqual(backfill.qualifications.filter((row) => row.personneId === 'FO-2' && row.competenceCode === 'VPC').length, 1);
assert.strictEqual(backfill.qualifications.find((row) => row.personneId === 'FO-2').evidence.length, 2);
assert.strictEqual(backfill.qualifications.find((row) => row.personneId === 'PR-OK' && row.competenceCode === 'PABC').status, 'CONFIRMED');
assert.strictEqual(backfill.qualifications.find((row) => row.personneId === 'PR-REVIEW').status, 'REVIEW_REQUIRED');
assert.ok(backfill.diagnostics.some((row) => row.reason === 'PABC_WITHOUT_COMPATIBLE_PAPR'));
assert.ok(!backfill.qualifications.some((row) => row.personneId === 'PR-REVIEW' && row.competenceCode === 'PAPR'));
assert.deepStrictEqual(qualifications.toCanonicalCompetenceFacts([
  { personQualificationId: 'BAD-PABC',personneId: 'BAD',competenceCode: 'PABC',validFrom: '2027-01-01',status: 'CONFIRMED' }
]), [], 'PABC without PAPR must remain fail-closed even for externally supplied rows');

const prImplications = [{ qualificationCode: 'PABC',impliedQualificationCode: 'PAPR' }];
const paprA = { personQualificationId: 'PAPR-A',personneId: 'PR-LIFE',competenceCode: 'PAPR',validFrom: '2027-01-01',validTo: '2027-12-31',status: 'CONFIRMED',evidence: ['E-A'] };
const paprB = { personQualificationId: 'PAPR-B',personneId: 'PR-LIFE',competenceCode: 'PAPR',validFrom: '2027-01-01',validTo: '2027-12-31',status: 'REVIEW_REQUIRED',supersedesPersonQualificationId: 'PAPR-A',evidence: ['E-B'] };
const pabcLife = { personQualificationId: 'PABC',personneId: 'PR-LIFE',competenceCode: 'PABC',validFrom: '2027-03-01',validTo: '2027-10-31',status: 'CONFIRMED' };
assert.strictEqual(qualifications.validateQualificationLifecycleMutation({
  qualification: paprA,nextStatus: 'INVALIDATED',qualifications: [paprA,pabcLife],implications: prImplications
}).valid, false, 'invalidating the only PAPR covering PABC must be rejected');
const validSupersession = qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: paprB,qualifications: [paprA,paprB,pabcLife],implications: prImplications
});
assert.strictEqual(validSupersession.valid, true, 'case 1: a covering supersession must be accepted');
assert.deepStrictEqual(validSupersession.qualifications.map((row) => [row.personQualificationId,row.status]),
  [['PAPR-A','INVALIDATED'],['PAPR-B','CONFIRMED'],['PABC','CONFIRMED']]);
assert.strictEqual(validSupersession.qualifications[0].evidence[0], 'E-A', 'case 8: superseded evidence remains present');
assert.strictEqual(validSupersession.qualifications[1].evidence[0], 'E-B', 'case 8: replacement evidence remains present');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: { ...paprB,validFrom: '2027-06-01' },qualifications: [paprA,paprB,pabcLife],implications: prImplications
}).valid, false, 'case 2: partial dependent coverage must be rejected');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: { ...paprB,personneId: 'OTHER' },qualifications: [paprA,paprB,pabcLife],implications: prImplications
}).valid, false, 'case 3: person mismatch must be rejected');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: { ...paprB,competenceCode: 'PABC' },qualifications: [paprA,paprB,pabcLife],implications: prImplications
}).valid, false, 'case 4: competence mismatch must be rejected');
const paprC = { personQualificationId: 'PAPR-C',personneId: 'PR-LIFE',competenceCode: 'PAPR',validFrom: '2028-01-01',validTo: null,status: 'CONFIRMED' };
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: { ...paprB,validTo: null },qualifications: [paprA,paprB,paprC,pabcLife],implications: prImplications
}).valid, false, 'case 5: overlap with a third confirmed qualification must be rejected');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: paprB,qualifications: [paprA,paprB],implications: prImplications
}).valid, true, 'case 6: replacement without a dependent qualification must be accepted');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: {},replacement: paprB,qualifications: [paprB],implications: prImplications
}).valid, false, 'missing superseded qualification must be rejected');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: { ...paprA,status: 'INVALIDATED' },replacement: paprB,qualifications: [paprA,paprB],implications: prImplications
}).valid, false, 'a non-confirmed superseded qualification must be rejected');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: paprA,replacement: { ...paprB,supersedesPersonQualificationId: 'OTHER' },qualifications: [paprA,paprB],implications: prImplications
}).valid, false, 'a mismatched supersession reference must be rejected');
assert.strictEqual(qualifications.validateQualificationSupersession({
  superseded: { ...paprA,supersedesPersonQualificationId: 'PAPR-B' },replacement: paprB,
  qualifications: [{ ...paprA,supersedesPersonQualificationId: 'PAPR-B' },paprB],implications: prImplications
}).valid, false, 'a supersession cycle must be rejected');
assert.strictEqual(qualifications.validateQualificationLifecycleMutation({
  qualification: { ...pabcLife,status: 'REVIEW_REQUIRED',validTo: '2028-01-31' },nextStatus: 'CONFIRMED',
  qualifications: [paprA],implications: prImplications
}).valid, false, 'PABC extending beyond PAPR cannot be confirmed');
assert.strictEqual(qualifications.validateQualificationLifecycleMutation({
  qualification: paprA,nextStatus: 'CONFIRMED',qualifications: [],implications: prImplications
}).valid, true, 'PAPR alone is valid');

for(const [legacy, canonical] of [['PL','COND_PL'],['TP9','COND_TP9'],['BAT','PILOTE_BAT'],['MACHINISTE_EA','MACHINISTE_EA']]){
  assert.strictEqual(qualifications.canonicalizeQualification('AUTO', legacy).qualificationCode, canonical);
}
const rejectedStatCom = qualifications.mapLegacyQualificationAssignment(assignment('S', 'P', 'FOSPEC', 'OFSI', '2027-01-01', null, { source_type: 'STATCOM' }));
assert.strictEqual(rejectedStatCom.reason, 'NON_PERSONAL_SOURCE');
assert.strictEqual(rejectedStatCom.mapped, false);

const competenceFacts = qualifications.toCanonicalCompetenceFacts(backfill.qualifications);
const paprDefinition = qualifications.PUBLIC_DEFINITIONS_C3.find((row) => row.code === 'PR-PAPR');
const people = [{ personneId: 'PR-OK', actif: true }, { personneId: 'PR-REVIEW', actif: true }];
const paprResult = engine.evaluatePublicRule({
  ruleVersion: paprDefinition.version, evaluationDate: '2027-06-15', competenceCodes: catalog,
  persons: people, periods: [], assignments: [], competencies: competenceFacts, fobaLevels: [], jspRoles: []
});
assert.deepStrictEqual(paprResult.personIds, ['PR-OK']);

const temporal = qualifications.buildPersonQualificationBackfill([
  assignment('T1', 'TEMP', 'AUTO', 'PL', '2027-01-10', '2027-01-20'),
  assignment('T2', 'TEMP', 'AUTO', 'PL', '2027-02-01', null)
]);
assert.strictEqual(temporal.qualifications.length, 2, 'interruption and reactivation must remain separate intervals');
const temporalFacts = qualifications.toCanonicalCompetenceFacts(temporal.qualifications);
const plDefinition = require('../netlify/lib/_scope-public-foundations').PUBLIC_DEFINITIONS.find((row) => row.code === 'AUTO-COND-PL');
for(const [date, included] of [['2027-01-09',false],['2027-01-10',true],['2027-01-20',true],['2027-01-21',false],['2027-02-01',true]]){
  const result = engine.evaluatePublicRule({
    ruleVersion: plDefinition.version,evaluationDate: date,persons: [{ personneId: 'TEMP',actif: true }],periods: [],
    assignments: [],competencies: temporalFacts,fobaLevels: [],jspRoles: []
  });
  assert.strictEqual(result.personIds.includes('TEMP'), included, `qualification boundary ${date}`);
}

const customCodes = [...catalog, 'FUTURE_SPECIALITE'];
const customRule = { op: 'ALL', children: [
  { predicate: 'PERSON_ELIGIBLE_AT' },
  { predicate: 'HAS_COMPETENCE', competenceCodes: ['FUTURE_SPECIALITE'] }
] };
assert.strictEqual(engine.validatePublicRule(customRule, { competenceCodes: customCodes }).valid, true);
assert.strictEqual(engine.validatePublicRule(customRule).valid, false, 'unknown code remains fail-closed without catalog');
const customResult = engine.evaluatePublicRule({
  ruleVersion: { expression: customRule }, evaluationDate: '2027-06-15', competenceCodes: customCodes,
  persons: [{ personneId: 'EXT', actif: true }], periods: [], assignments: [],
  competencies: [{ personneId: 'EXT', competenceCode: 'FUTURE_SPECIALITE', validFrom: '2027-01-01' }], fobaLevels: [], jspRoles: []
});
assert.deepStrictEqual(customResult.personIds, ['EXT']);

assert.ok(qualifications.EVENT_ROLE_DEFINITIONS.some((row) => row.code === 'FORMATEUR_C1_118'));
assert.ok(!catalog.includes('FORMATEUR_C1_118'), 'event role must not become a qualification');
const youthRoles = qualifications.deriveJspYouthRoleFacts(
  [{ personneId: 'Y', grade: 'Flamme 2' }, { personneId: 'A', grade: 'Capitaine' }],
  [{ id: 'J1', personneId: 'Y', domainCode: 'JSP', oiCode: 'G1', validFrom: '2027-01-01' },
   { id: 'J2', personneId: 'A', domainCode: 'JSP', oiCode: 'G1', validFrom: '2027-01-01' }]
);
assert.deepStrictEqual(youthRoles.map((row) => row.personneId), ['Y']);
assert.ok(!catalog.includes('CADET'));
assert.ok(!migration.includes("('CADET'"));

for(const table of [
  'scope_competence_implications','scope_person_qualifications','scope_person_qualification_evidence',
  'scope_event_role_definitions','scope_event_role_aliases','scope_event_person_roles'
]){
  assert.ok(migration.includes(`create table if not exists ${table}`), `standalone missing ${table}`);
  assert.ok(ddl.includes(`create table if not exists ${table}`), `runtime DDL missing ${table}`);
  assert.ok(migration.includes(`alter table ${table} enable row level security`) || migration.includes("foreach table_name"));
  assert.ok(schema.includes(`'${table}'`));
}
const compactSql = (value) => String(value).replace(/\s+/g, '').replace(/;/g, '');
for(const statement of runtimeDdl.DDL){
  assert.ok(compactSql(migration).includes(compactSql(statement)), 'standalone/runtime DDL structural divergence');
}
assert.ok(compactSql(migration).includes(compactSql(runtimeDdl.GUARD_SQL)), 'standalone/runtime guard divergence');
assert.ok(compactSql(migration).includes(compactSql(runtimeDdl.SUPERSESSION_SQL)), 'standalone/runtime supersession divergence');
assert.ok(compactSql(migration).includes(compactSql(runtimeDdl.EVIDENCE_GUARD_SQL)), 'standalone/runtime evidence guard divergence');
for(const fragment of [
  "tg_op = 'DELETE'",'person qualification history is append-only',
  'person qualification evidence history is append-only','person qualification evidence is immutable',
  'before insert or update or delete on scope_person_qualifications',
  'before update or delete on scope_person_qualification_evidence',
  'required person qualification still covers a confirmed dependent qualification'
]){
  assert.ok(migration.includes(fragment), `standalone append-only guard missing ${fragment}`);
  assert.ok(runtime.includes(fragment.replaceAll(' = ', '=')) || runtime.includes(fragment), `runtime append-only guard missing ${fragment}`);
}
for(const fragment of [
  'supersedes_person_qualification_id uuid references scope_person_qualifications(person_qualification_id) on delete restrict',
  "old.status='CONFIRMED' and new.status='INVALIDATED'"
]){
  assert.ok(compactSql(migration).includes(compactSql(fragment)), `standalone legitimate append-only workflow missing ${fragment}`);
  assert.ok(compactSql(runtime).includes(compactSql(fragment)), `runtime legitimate append-only workflow missing ${fragment}`);
}
assert.ok(!/before\s+insert\s+or\s+update\s+or\s+delete\s+on\s+scope_person_qualification_evidence/i.test(migration),
  'evidence INSERT must remain available for additional observations');
assert.ok(schema.includes('personQualificationDdl.SUPERSESSION_SQL'), 'runtime does not install the atomic supersession function');
assert.ok(runtimeDdl.GUARD_SQL.includes('overlapping confirmed person qualifications are forbidden'),
  'ordinary overlapping confirmed qualifications must remain forbidden');
assert.ok(runtimeDdl.GUARD_SQL.includes("replacement.status='REVIEW_REQUIRED'")
  && runtimeDdl.GUARD_SQL.includes("current_setting('scope.person_qualification_supersession',true)"),
  'the invalidation guard must recognize only the planned replacement');
const invalidateAt = runtimeDdl.SUPERSESSION_SQL.indexOf("set status='INVALIDATED'");
const confirmAt = runtimeDdl.SUPERSESSION_SQL.indexOf("set status='CONFIRMED'");
assert.ok(invalidateAt >= 0 && confirmAt > invalidateAt,
  'the SQL contract must invalidate A then confirm B inside one atomic function call');
assert.ok(runtimeDdl.SUPERSESSION_SQL.includes("replacement.status<>'REVIEW_REQUIRED'")
  && runtimeDdl.SUPERSESSION_SQL.includes('supersession person mismatch')
  && runtimeDdl.SUPERSESSION_SQL.includes('supersession competence mismatch'),
  'the SQL supersession contract must reject invalid source states and identities');
assert.ok(runtimeDdl.SUPERSESSION_SQL.includes('for update'),
  'the SQL contract must serialize concurrent replacement attempts');
const reviewSeedBlock = migration.match(/insert into scope_public_review_seed_c3_b values([\s\S]*?);\ninsert into scope_public_definitions/);
assert.ok(reviewSeedBlock, 'standalone unresolved seed block missing');
const standaloneReviews = [...reviewSeedBlock[1].matchAll(/\('([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)'\)/g)]
  .map((match) => ({
    code: match[1],label: match[2],description: match[3],ownerCode: match[4],
    resolutionStatus: match[5],reason: match[6]
  }));
assert.deepStrictEqual(standaloneReviews, qualifications.UNRESOLVED_PUBLICS_C3,
  'standalone/runtime unresolved public seeds must match exactly');
for(const field of ['row.code','row.label','row.description','row.ownerCode','row.resolutionStatus','row.reason']){
  assert.ok(schema.includes(field), `runtime unresolved seed does not use explicit ${field}`);
}
for(const fragment of [
  'PABC_IMPLIES_PAPR','person qualification corrections are append-only',
  'overlapping confirmed person qualifications are forbidden','scope_person_qualification_evidence_source_uk',
  'confirmed person qualification is missing an implied qualification',
  "code = 'OP_VPC'","code = 'VPC'",'FOSPEC-VPC','JSP-CAD'
]){
  assert.ok(migration.includes(fragment), `standalone missing ${fragment}`);
  assert.ok(runtime.includes(fragment), `runtime missing ${fragment}`);
}
assert.ok(migration.includes('synthesize":false') && schema.includes('synthesize: false'));
assert.ok(schema.includes("const LATEST_SCOPE_SCHEMA_VERSION = 'scope-annual-catalog-c4-b'"));
assert.ok(!/\b(insert into|update|delete from)\s+scope_(attendus|participations|evenements)\b/i.test(migration));
assert.ok(!/\b(alter table|delete from|update)\s+scope_(attendus|participations|evenements)\b/i.test(migration));
assert.ok(!migration.includes('insert into scope_person_qualifications') && !migration.includes('insert into scope_person_qualification_evidence'),
  'migration must not invent possessions; backfill remains explicit');
assert.ok(!/create temporary table [^(]+\((?:code|label|domain_code|alias)(?:,|\))/i.test(migration),
  'temporary seed columns must have explicit SQL types');

console.log('scope-person-qualifications-c3-b-tests: ok');
