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

assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-core-1'/.test(schema));
assert.ok(/async function migrateQuoVadisCore1/.test(schema));
assert.ok(/'QV-2027'/.test(schema));
assert.ok(/'2028-03-31'/.test(schema), '2027 programme must allow period through annual report 2028');
assert.ok(/FRIDAY":"INTERDIT/.test(schema), 'default training Friday exclusion missing');
assert.ok(/DAP-VENDREDI-AUTORISE/.test(schema) && /FRIDAY":"AUTORISE/.test(schema), 'DAP Friday exception missing');
assert.ok(/'M10','Module 10 - test final'.*'18:00','08:00',true,'SATURDAY'/s.test(schema), 'CI DPS module 10 overnight Saturday rule missing');
assert.ok(!/numbering_pattern[^;]+['"][^'"]*\/[^'"]*['"]/i.test(schema), 'numbering pattern must not contain slash');

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
assert.ok(/function renderQuoVadis/.test(ui));
assert.ok(/QUO VADIS 2027/.test(ui));
assert.ok(/data-qv-tab/.test(ui));
assert.ok(/qv-generate/.test(ui));
assert.ok(/qv-future-save/.test(ui));
assert.ok(/Aucune route QUO VADIS ne réécrit/.test(ui));

console.log('scope-quo-vadis-core-1-tests: ok');
