const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const migration = read('database/migrations/20260916_scope_quo_vadis_core_1.sql');
const schema = read('netlify/lib/_scope-schema.js');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const fn = read('netlify/functions/scope.js');
const api = read('assets/js/scope-api.js');
const ui = read('assets/js/scope-ui.js');
const logic = read('assets/js/scope-ui-logic.js');

function extractDpsSections(src, oiCode) {
  const match = src.match(new RegExp(`\\('${oiCode}',\\s*'2027-02-01',\\s*'(\\[[^']+\\])'::jsonb`));
  assert.ok(match, `DPS organisation ${oiCode} 2027-02-01 missing`);
  return JSON.parse(match[1]);
}

function assertDpsSeed(src, label) {
  const expectedHalves = (section) => [`${section}a`, `${section}b`];
  const bySection = (rows) => new Map(rows.map((row) => [row.section, row]));
  const g1 = bySection(extractDpsSections(src, 'G1'));
  assert.deepStrictEqual(Array.from(g1.keys()), ['N01', 'N02', 'N03', 'N04', 'N05', 'N06'], `${label}: G1 must contain N01 to N06`);
  for (const section of ['N01', 'N02', 'N03', 'N04', 'N05']) {
    assert.deepStrictEqual(g1.get(section).halfSections, expectedHalves(section), `${label}: G1 ${section} halves mismatch`);
  }
  assert.strictEqual(g1.get('N06').reserve, true, `${label}: G1 N06 must be reserve`);
  assert.ok(!g1.get('N06').halfSections, `${label}: G1 N06 must not be split into halves`);

  for (const oi of ['C1', 'B1', 'B2']) {
    const rows = extractDpsSections(src, oi);
    assert.deepStrictEqual(rows.map((row) => row.section), ['N01', 'N02', 'N03'], `${label}: ${oi} must contain exactly three sections`);
    for (const row of rows) {
      assert.deepStrictEqual(row.halfSections, expectedHalves(row.section), `${label}: ${oi} ${row.section} halves mismatch`);
      assert.ok(!row.reserve, `${label}: ${oi} ${row.section} must not be reserve`);
    }
  }
}

function assertNoQuoVadisAmbiguousSelects(src) {
  assert.ok(
    /select v\.cursus_version_id, s\.step_code, s\.libelle, s\.ordre, s\.logical_year, s\.usual_start_time, s\.usual_end_time, s\.crosses_midnight, s\.preferred_day, s\.metadata::jsonb/.test(src),
    'cursus step seed must qualify columns from values alias s'
  );
  assert.ok(
    /select v\.cursus_version_id, c\.code, c\.libelle, c\.start_year, c\.current_logical_year, c\.metadata::jsonb/.test(src),
    'cohort seed must qualify columns from values alias c'
  );
  assert.ok(!/select v\.cursus_version_id, step_code, libelle, ordre/.test(src), 'ambiguous cursus step select remains');
  assert.ok(!/select v\.cursus_version_id, code, libelle, start_year/.test(src), 'ambiguous cohort select remains');
}

for (const src of [migration, schema, service]) {
  assert.ok(!/\b(drop|truncate)\s+table\b/i.test(src), 'QUO VADIS must not drop/truncate business tables');
  assert.ok(!/delete\s+from\s+scope_(evenements|attendus|participations|personnes|affectations)\b/i.test(src), 'QUO VADIS must not delete SCOPE business data');
}

assert.ok(/create table if not exists scope_quo_vadis_programmes/.test(migration));
assert.ok(/constraint scope_qv_programmes_annee_chk check \(annee >= 2027\)/.test(migration));
assert.ok(/create table if not exists scope_quo_vadis_obligations/.test(migration));
assert.ok(/scope_evenement_id uuid references scope_evenements/.test(migration));
assert.ok(/exercise_id uuid references scope_exercices/.test(migration));
assert.ok(/create table if not exists scope_quo_vadis_proposals/.test(migration));
assert.ok(/create table if not exists scope_lieux/.test(migration));
assert.ok(/create table if not exists scope_quo_vadis_cursus_steps/.test(migration));
assert.ok(/create table if not exists scope_quo_vadis_future_dates/.test(migration));
assert.ok(/create table if not exists scope_quo_vadis_dps_organisation_versions/.test(migration));
assert.ok(/scope_qv_obligations_source_uq/.test(migration), 'generator obligations need an idempotent source key');
assertDpsSeed(migration, 'migration');
assertNoQuoVadisAmbiguousSelects(migration);

assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-annual-catalog-c4-b'/.test(schema));
assert.ok(/async function migrateQuoVadisCore1/.test(schema));
assert.ok(/async function migrateQuoVadisPilotage2/.test(schema));
assert.ok(/'QV-2027'/.test(schema));
assert.ok(/'2028-03-31'/.test(schema), '2027 programme must allow period through annual report 2028');
assert.ok(/FRIDAY":"INTERDIT/.test(schema), 'default training Friday exclusion missing');
assert.ok(/DAP-VENDREDI-AUTORISE/.test(schema) && /FRIDAY":"AUTORISE/.test(schema), 'DAP Friday exception missing');
assert.ok(/'M10','Module 10 - test final'.*'18:00','08:00',true,'SATURDAY'/s.test(schema), 'CI DPS module 10 overnight Saturday rule missing');
assert.ok(!/numbering_pattern[^;]+['"][^'"]*\/[^'"]*['"]/i.test(schema), 'numbering pattern must not contain slash');
assertDpsSeed(schema, 'runtime schema');
assertNoQuoVadisAmbiguousSelects(schema);

assert.ok(/generateProgramme/.test(service));
assert.ok(/operationalEventsCreated:\s*0/.test(service));
assert.ok(/attendusCreated:\s*0/.test(service));
assert.ok(/participationsCreated:\s*0/.test(service));
assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(service), 'generator must not create operational events or presence rows');
assert.ok(/simultaneousEventsAllowed:\s*true/.test(service), 'generator must allow simultaneous events');
assert.ok(/convertedFromFutureDate/.test(service), 'future date conversion metadata missing');
assert.ok(/crossesMidnight/.test(service), 'overnight event support missing');

assert.ok(/createScopeQuoVadisService/.test(fn));
assert.ok(/\/quo-vadis\/programmes\/:annee/.test(fn));
assert.ok(/\/quo-vadis\/programmes\/:annee\/generate/.test(fn));
assert.ok(/\/quo-vadis\/future-dates/.test(fn));

assert.ok(/quoVadisProgramme/.test(api));
assert.ok(/generateQuoVadisProgramme/.test(api));
assert.ok(/createQuoVadisFutureDate/.test(api));

assert.ok(/parts\[0\] === 'quo-vadis'/.test(logic));
assert.ok(/href: '#\/quo-vadis'/.test(logic));
assert.ok(/const activity = \[[\s\S]*id: 'quo-vadis'[\s\S]*const pilotage = \[/.test(logic), 'QUO VADIS must be in Activité navigation');
assert.ok(!/const pilotage = \[[\s\S]*id: 'quo-vadis'/.test(logic), 'QUO VADIS must not be in Pilotage navigation');
assert.ok(/function renderQuoVadis/.test(ui));
assert.ok(/QUO VADIS 2027/.test(ui));
assert.ok(/qv-subnav/.test(ui));
assert.ok(/qv-generate/.test(ui));
assert.ok(/qv-future-save/.test(ui));
assert.ok(/Aucun événement opérationnel n’a été créé/.test(ui));

console.log('scope-quo-vadis-core-1-tests: ok');
