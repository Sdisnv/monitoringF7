'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const canonical = require('../netlify/lib/_scope-canonical-foundations');
const { CIBLES, DOMAINES_MODEL_2 } = require('../netlify/lib/_scope-schema');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migration = read('database/migrations/20260923_scope_canonical_foundations_c1.sql');
const schema = read('netlify/lib/_scope-schema.js');
const service = read('netlify/lib/_scope-service.js');
const qvService = read('netlify/lib/_scope-quo-vadis-service.js');
const statcom = read('netlify/lib/_scope-statcom-referential.js');

function codes(rows){
  return rows.map((row) => row.code);
}

function classification(domain, level){
  return canonical.classifyLegacyTarget({ domaine_code: domain, niveau_code: level });
}

function mapping(domain, level, type){
  return classification(domain, level).mappings.find((row) => row.type === type);
}

function extractSqlReviewContract(source){
  const block = source.match(/insert into scope_legacy_cible_reviews[\s\S]*?join \(values([\s\S]*?)\) as seed\(domaine_code, niveau_code, classification, reason\)/);
  assert.ok(block, 'structured review seed block missing from standalone migration');
  const rows = [];
  const tuple = /\('([^']+)','([^']+)','(AMBIGUOUS|UNMAPPED)','([^']+)'\)/g;
  let match;
  while((match = tuple.exec(block[1]))){
    rows.push({ key: `${match[1]}/${match[2]}`, classification: match[3], reason: match[4] });
  }
  return rows.sort((left, right) => left.key.localeCompare(right.key));
}

assert.strictEqual(DOMAINES_MODEL_2.PR.nature, 'DOMAINE');
assert.strictEqual(DOMAINES_MODEL_2.AUTO.nature, 'DOMAINE');
assert.strictEqual(DOMAINES_MODEL_2.PR.parentCode, null);
assert.strictEqual(DOMAINES_MODEL_2.AUTO.parentCode, null);

assert.deepStrictEqual(codes(canonical.ORGANISATIONAL_UNITS), ['G1','C1','B1','B2','Y1','Y2','Y3','Y4']);
assert.deepStrictEqual(canonical.DOMAIN_ORGANISATIONAL_UNITS.DPS, ['G1','C1','B1','B2']);
assert.deepStrictEqual(canonical.DOMAIN_ORGANISATIONAL_UNITS.DAP, ['Y1','Y2','Y3','Y4']);
assert.deepStrictEqual(canonical.DOMAIN_ORGANISATIONAL_UNITS.JSP, ['G1','C1','B1']);

assert.deepStrictEqual(codes(canonical.PR_ACTIVITY_TRACKS), ['GENERAL','PAPR','PABC']);
assert.strictEqual(canonical.PR_ACTIVITY_TRACK_ALIASES.ABC, 'PABC');
assert.strictEqual(canonical.PR_ACTIVITY_TRACK_ALIASES.PRABC, 'PABC');
assert.strictEqual(canonical.PR_ACTIVITY_TRACK_ALIASES['PR-ABC'], 'PABC');

const auto = canonical.COMPETENCE_DEFINITIONS.filter((row) => row.domainCode === 'AUTO');
assert.deepStrictEqual(codes(auto), ['COND_PL','COND_TP9','COND_VL','GRUTIER','MEA','PILOTE_BAT']);
assert.ok(auto.every((row) => row.type === 'QUALIFICATION'));
const vlAliases = canonical.COMPETENCE_ALIASES.filter((row) => ['VL_DPS','VL_DAP'].includes(row.alias));
assert.deepStrictEqual(vlAliases.map((row) => row.competenceCode), ['COND_VL','COND_VL']);
assert.deepStrictEqual(vlAliases.map((row) => row.legacyContext), ['DPS','DAP']);

const fospec = canonical.COMPETENCE_DEFINITIONS.filter((row) => row.domainCode === 'FOSPEC');
assert.deepStrictEqual(codes(fospec), ['ANTICHUTE','NAC','OFSI','OP_VPC']);
assert.ok(fospec.every((row) => row.type === 'SPECIALITE'));
assert.deepStrictEqual(codes(canonical.FOBA_LEVELS), ['1','2','3']);

for(const code of ['G1','C1','B1','B2']) assert.strictEqual(mapping('DPS', code, 'OI').code, code);
for(const code of ['Y1','Y2','Y3','Y4']) assert.strictEqual(mapping('DAP', code, 'OI').code, code);
for(const code of ['G1','C1','B1']) assert.strictEqual(mapping('JSP', code, 'OI').code, code);
assert.strictEqual(mapping('PR', 'PAPR', 'PR_ACTIVITY_TRACK').code, 'PAPR');
assert.strictEqual(mapping('PR', 'ABC', 'PR_ACTIVITY_TRACK').code, 'PABC');
for(const code of ['G1','C1','B1','B2']){
  const result = classification('PR', code);
  assert.strictEqual(result.classification, 'COMPOSITE');
  assert.deepStrictEqual(result.mappings.map((row) => row.type), ['OI','PR_ACTIVITY_TRACK']);
}
assert.strictEqual(classification('FOSPEC', 'GEN').classification, 'AMBIGUOUS');
assert.strictEqual(classification('FOCA', 'GEN').classification, 'AMBIGUOUS');
assert.strictEqual(classification('JSP', 'CAD').classification, 'AMBIGUOUS');

const targets = CIBLES.map(([domaine_code, niveau_code, libelle], index) => ({
  cible_id: `legacy-${index + 1}`, domaine_code, niveau_code, libelle
}));
const before = JSON.stringify(targets);
const first = canonical.diagnoseLegacyTargets(targets);
const second = canonical.diagnoseLegacyTargets(targets);
assert.strictEqual(JSON.stringify(targets), before, 'diagnostic must not mutate legacy targets');
assert.deepStrictEqual(second, first, 'mapping diagnostic must be idempotent');
assert.deepStrictEqual({
  total: first.total, mapped: first.mappedAutomatically, composite: first.composite,
  ambiguous: first.ambiguous, unmapped: first.unmapped
}, { total: 36, mapped: 22, composite: 4, ambiguous: 4, unmapped: 6 });

const runtimeReviews = first.details
  .filter((row) => ['AMBIGUOUS', 'UNMAPPED'].includes(row.classification))
  .map(({ key, classification, reason }) => ({ key, classification, reason }))
  .sort((left, right) => left.key.localeCompare(right.key));
const sqlReviews = extractSqlReviewContract(migration);
assert.strictEqual(runtimeReviews.length, 10, 'runtime must produce 10 C1 reviews');
assert.strictEqual(runtimeReviews.filter((row) => row.classification === 'AMBIGUOUS').length, 4);
assert.strictEqual(runtimeReviews.filter((row) => row.classification === 'UNMAPPED').length, 6);
assert.deepStrictEqual(sqlReviews, runtimeReviews, 'standalone SQL and runtime review contracts must match');
assert.ok(/if\(\['AMBIGUOUS', 'UNMAPPED'\]\.includes\(classification\.classification\)\)/.test(schema));
assert.ok(/values \(\$1,\$2,\$3,\$4::jsonb\)[\s\S]*?classification\.classification, classification\.reason/.test(schema));

assert.deepStrictEqual(Object.fromEntries(runtimeReviews.map((row) => [row.key, row.classification])), {
  'DAP/GEN': 'UNMAPPED',
  'DPS/GEN': 'UNMAPPED',
  'FOCA/GEN': 'AMBIGUOUS',
  'FOCO/DAP': 'UNMAPPED',
  'FOCO/DPS': 'UNMAPPED',
  'FOCO/JSP': 'UNMAPPED',
  'FOSPEC/GEN': 'AMBIGUOUS',
  'JSP/CAD': 'AMBIGUOUS',
  'JSP/GEN': 'UNMAPPED',
  'PR/GEN': 'AMBIGUOUS'
});

for(const table of [
  'scope_ois','scope_domaine_ois','scope_pr_parcours','scope_pr_parcours_aliases',
  'scope_competence_definitions','scope_competence_aliases','scope_foba_niveaux',
  'scope_legacy_cible_oi_mappings','scope_legacy_cible_pr_parcours_mappings',
  'scope_legacy_cible_competence_mappings','scope_legacy_cible_foba_niveau_mappings','scope_legacy_cible_reviews'
]){
  assert.ok(migration.includes(`create table if not exists ${table}`), `${table} missing from migration`);
  assert.ok(schema.includes(`create table if not exists ${table}`), `${table} missing from runtime schema`);
}
assert.ok(!/\b(drop|truncate)\s+table\b/i.test(migration));
assert.ok(!/\b(update|delete from)\s+scope_(cibles|attendus|participations|evenements)\b/i.test(migration));
assert.ok(!/insert into scope_(attendus|participations|evenements)\b/i.test(migration));
assert.ok(/on conflict \(code\) do nothing/.test(migration));
assert.ok(/scope-canonical-foundations-c1/.test(schema));
for(const code of [
  ...codes(canonical.ORGANISATIONAL_UNITS), ...codes(canonical.PR_ACTIVITY_TRACKS),
  ...codes(canonical.COMPETENCE_DEFINITIONS), ...codes(canonical.FOBA_LEVELS)
]) assert.ok(migration.includes(`'${code}'`), `canonical seed ${code} missing from standalone migration`);
assert.ok(migration.includes("('AUTO','VL_DPS','COND_VL','DPS')"));
assert.ok(migration.includes("('AUTO','VL_DAP','COND_VL','DAP')"));
assert.deepStrictEqual(sqlReviews.find((row) => row.key === 'FOSPEC/GEN'), {
  key: 'FOSPEC/GEN', classification: 'AMBIGUOUS',
  reason: 'FOSPEC/GEN est un périmètre générique, pas une spécialité.'
});
assert.ok(!/where c\.domaine_code = 'PR' and c\.niveau_code = 'GEN'/.test(migration), 'PR/GEN must not be auto-mapped');

const diffNames = childProcess.execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' })
  .trim().split(/\n/).filter(Boolean);
for(const forbidden of [
  'netlify/lib/_scope-service.js', 'netlify/lib/_scope-memory.js', 'netlify/lib/_scope-personnel-import-contexts.js',
  'netlify/lib/_scope-quo-vadis-service.js', 'netlify/lib/_scope-statcom-referential.js',
  'netlify/lib/_auth-utils.js', 'netlify/lib/_oidc-utils.js'
]) assert.ok(!diffNames.includes(forbidden), `${forbidden} must remain unchanged`);

assert.ok(service.includes('function assignedPopulationLocked(evenement)'));
assert.ok(service.includes('allowsAssignedPopulationResyncForReason'));
assert.ok(service.includes('syncExpectedPopulationForEvents'));
assert.ok(service.includes('syncExpectedPopulationForPersonnes'));
assert.ok(qvService.includes('operationalEventsCreated: 0'));
assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(qvService));
assert.ok(statcom.includes('INITIAL_STATCOM_CODES'));

(async () => {
  const repo = createMemoryRepo();
  const ciblesBefore = JSON.stringify(await repo.listCibles());
  const event = await createScopeService(repo).createEvenement({
    date: '2027-02-12', domaineCode: 'DPS', libelle: 'Contrôle C1',
    cibleIds: [(await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'G1').cible_id]
  }, { sub: 'canonical-c1-test' });
  assert.strictEqual(event.evenement.domaine_code, 'DPS');
  assert.strictEqual(JSON.stringify(await repo.listCibles()), ciblesBefore, 'event flow must not rewrite legacy targets');
  assert.deepStrictEqual(await repo.listAttendus(event.evenement.evenement_id), []);
  assert.deepStrictEqual(await repo.listParticipations(event.evenement.evenement_id), []);
  console.log('scope-canonical-foundations-c1-tests: ok');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
