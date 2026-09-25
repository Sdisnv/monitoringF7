'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../netlify/lib/_scope-annual-catalog');
const ddl = require('../netlify/lib/_scope-annual-theme-ddl');
const { createScopeAnnualCatalogService,DOMAIN_ORDER,validateDraftInput } = require('../netlify/lib/_scope-annual-catalog-service');
const ui = require('../assets/js/scope-ui-logic');
const { createCatalogUiHarness,catalogPayload,activityPayload,draftRequirement,visibleText } = require('./scope-annual-catalog-ui-harness');

const ROOT = path.resolve(__dirname,'..');
const MIGRATION = path.join(ROOT,'database/migrations/20260924_scope_annual_catalog_themes_c8_b.sql');
const read = (file) => fs.readFileSync(path.join(ROOT,file),'utf8');
const ids = {
  definition: '10000000-0000-4000-8000-000000000001',version: '20000000-0000-4000-8000-000000000001',
  requirement: '30000000-0000-4000-8000-000000000001',session: '40000000-0000-4000-8000-000000000001',
  public: '50000000-0000-4000-8000-000000000001',rule: '60000000-0000-4000-8000-000000000001',
  theme: '70000000-0000-4000-8000-000000000001',themeVersion: '80000000-0000-4000-8000-000000000001'
};

const availableTheme = { themeVersionId: ids.themeVersion,themeDefinitionId: ids.theme,definitionId: ids.definition,
  code: 'FEU',label: 'Feu',status: 'ACTIVE',versionNumber: 1 };
const base = {
  definition: { definitionId: ids.definition,code: 'DPS-INSTRUCTION-SECTION',activityType: 'INSTRUCTION',domain: 'DPS',label: 'Instruction de section DPS' },
  version: { definitionVersionId: ids.version,definitionId: ids.definition,status: 'ACTIVE' },
  requirement: { annualRequirementId: ids.requirement,year: 2027,status: 'DRAFT',requiredOccurrences: 3,windowStart: '2027-03-01',windowEnd: '2027-11-30' },
  domainBindings: [{ domainCode: 'DPS',bindingRole: 'PRIMARY' }],
  sessionTemplates: [{ sessionTemplateId: ids.session,code: 'S1',sequence: 1,label: 'Instruction',durationMinutes: 120 }],
  periodicity: { type: 'ON_DEMAND' },
  publicBindings: [{ publicDefinitionId: ids.public,operator: 'UNION' }],
  publicDefinitions: [{ publicDefinitionId: ids.public,status: 'ACTIVE' }],
  publicRuleVersions: [{ publicRuleVersionId: ids.rule,publicDefinitionId: ids.public,status: 'ACTIVE',validFrom: '2027-01-01',validTo: '2027-12-31' }],
  qualificationBindings: [],roleRequirements: [],locationRequirements: [],responsibleRequirements: [],planningConstraints: [],statisticalContributions: [],
  availableThemes: [availableTheme],themeVersions: [availableTheme],
  activityThemeBindings: [{ definitionId: ids.definition,themeDefinitionId: ids.theme,status: 'ACTIVE' }],themeAssignments: []
};
const canonical = (occurrenceNumber = 1,extra = {}) => ({ occurrenceNumber,themeVersionId: ids.themeVersion,sortOrder: 1,...extra });
const free = (occurrenceNumber = 1,label = 'Manœuvre hydraulique',extra = {}) => ({ occurrenceNumber,freeLabel: label,sortOrder: 1,...extra });
const errorCodes = (result) => result.errors.map((row) => row.code);
const readyInput = (assignments = []) => {
  const prepared = catalog.prepareAnnualRequirementReady({ ...base,themeAssignments: assignments });
  assert.equal(prepared.valid,true,JSON.stringify(prepared.errors));
  return { ...base,requirement: prepared.requirement,publicBindings: prepared.publicBindings,themeAssignments: assignments };
};

const tests = [];
function test(name,fn){ tests.push({ name,fn }); }

test('01 canonical theme assignment is valid',() => assert.equal(catalog.validateThemeAssignments({ ...base,themeAssignments: [canonical()] }).valid,true));
test('02 free annual theme is valid and normalized',() => {
  const result = catalog.validateThemeAssignments({ ...base,themeAssignments: [free(1,'  Manœuvre   hydraulique ')] });
  assert.equal(result.valid,true); assert.equal(result.value[0].freeNormalized,'MANOEUVRE HYDRAULIQUE'); assert.equal(result.value[0].kind,'FREE');
});
test('03 zero themes is valid',() => assert.equal(catalog.validateThemeAssignments(base).valid,true));
test('04 several themes can target one occurrence',() => assert.equal(catalog.validateThemeAssignments({ ...base,themeAssignments: [canonical(),free()] }).valid,true));
test('05 one canonical theme can be reused on several occurrences',() => assert.equal(catalog.validateThemeAssignments({ ...base,themeAssignments: [canonical(1),canonical(2)] }).valid,true));
test('06 unbound canonical theme is rejected',() => assert(errorCodes(catalog.validateThemeAssignments({ ...base,activityThemeBindings: [],themeAssignments: [canonical()] })).includes('THEME_NOT_BOUND_TO_ACTIVITY')));
test('07 theme bound to another activity is rejected',() => assert(errorCodes(catalog.validateThemeAssignments({ ...base,activityThemeBindings: [{ definitionId: 'other',themeDefinitionId: ids.theme,status: 'ACTIVE' }],themeAssignments: [canonical()] })).includes('THEME_NOT_BOUND_TO_ACTIVITY')));
test('08 session from another version is rejected',() => assert(errorCodes(catalog.validateThemeAssignments({ ...base,themeAssignments: [canonical(1,{ sessionTemplateId: '90000000-0000-4000-8000-000000000001' })] })).includes('THEME_SESSION_TEMPLATE_OUTSIDE_ACTIVITY')));
test('09 canonical and free together are rejected',() => assert(errorCodes(catalog.validateThemeAssignments({ ...base,themeAssignments: [{ ...canonical(),freeLabel: 'Libre' }] })).includes('THEME_CANONICAL_XOR_FREE_REQUIRED')));
test('10 READY snapshot and fingerprint cover themes',() => {
  const ready = readyInput([canonical(),free(2)]); assert.equal(ready.requirement.snapshot.themeAssignments.length,2);
  assert.equal(catalog.fingerprint(ready.requirement.snapshot),ready.requirement.fingerprint);
});
test('11 external theme mutation after snapshot is detected',() => {
  const ready = readyInput([free(1,'Version A')]); ready.themeAssignments = [free(1,'Version B')];
  assert(errorCodes(catalog.generateAnnualProgram(ready)).includes('GENERATION_INPUT_DIVERGES_FROM_SNAPSHOT'));
});
test('12 READY assignments are protected by SQL guard',() => assert.match(ddl.GUARD_SQL,/themes of a non-draft annual requirement are immutable/));
test('13 supersession copies themes into the new DRAFT',() => assert.match(read('netlify/lib/_scope-annual-catalog-service.js'),/copiedBy: 'C8_B_REVISION'/));
test('14 generation with themes is deterministic',() => {
  const ready = readyInput([canonical(1),free(2)]); assert.deepEqual(catalog.generateAnnualProgram(ready),catalog.generateAnnualProgram(ready));
});
test('15 persistence rerun is conflict-safe and assignments are unique',() => {
  const source = read('netlify/lib/_scope-annual-catalog-service.js'); assert.match(source,/on conflict \(annual_requirement_id,occurrence_number\) do nothing/);
  assert.match(ddl.DDL.join('\n'),/scope_annual_theme_assignment_canonical_uk/); assert.match(ddl.DDL.join('\n'),/scope_annual_theme_assignment_free_uk/);
});
test('16 QV projection carries occurrence themes',() => {
  const ready = readyInput([canonical(1),free(2)]); const generated = catalog.generateAnnualProgram(ready);
  const projected = catalog.projectToQuoVadis({ ...ready,...generated });
  assert.equal(projected.obligations[0].themes[0].kind,'CANONICAL'); assert.equal(projected.obligations[1].themes[0].kind,'FREE');
});
test('17 free theme is explicitly identified in QV',() => {
  const ready = readyInput([free()]); const generated = catalog.generateAnnualProgram(ready);
  assert.equal(catalog.projectToQuoVadis({ ...ready,...generated }).obligations[0].themes[0].free,true);
});
test('18 C8 writes no operational event',() => assert.doesNotMatch(read('netlify/lib/_scope-annual-catalog-service.js'),/(insert into|update|delete from)\s+scope_evenements/i));
test('19 C8 writes no expected population',() => assert.doesNotMatch(read('netlify/lib/_scope-annual-catalog-service.js'),/(insert into|update|delete from)\s+scope_attendus/i));
test('20 C8 writes no participation',() => assert.doesNotMatch(read('netlify/lib/_scope-annual-catalog-service.js'),/(insert into|update|delete from)\s+scope_participations/i));
test('21 QV mirror keeps human decisions empty',() => {
  const ready = readyInput([canonical()]); const projected = catalog.projectToQuoVadis({ ...ready,...catalog.generateAnnualProgram(ready) });
  assert.equal(projected.sessionIntents[0].startsAt,null); assert.equal(projected.sessionIntents[0].endsAt,null); assert.equal(projected.obligations[0].noOperationalEventCreated,true);
});
test('22 empty UI sections are hidden by logic',() => { assert.equal(ui.annualSectionHasData([]),false); assert.equal(ui.annualSectionHasData([{ a: 1 }]),true); });
test('23 technical enums have business labels',() => {
  assert.equal(ui.annualStatusLabel('DRAFT'),'En préparation'); assert.equal(ui.annualStatusLabel('READY'),'Prêt pour QUO VADIS');
  assert.equal(ui.annualEnumLabel('FULL_DURATION'),'Toute la durée'); assert.equal(ui.annualEnumLabel('PER_PARTICIPANT'),'Pour chaque participant');
});
test('24 business domain order is exact',() => assert.deepEqual(DOMAIN_ORDER,['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']));
test('25 future families are not blocked by nine-code SQL',() => assert.doesNotMatch(read('netlify/lib/_scope-annual-catalog-service.js'),/d\.code=any\(\$2::text\[\]\)/));
test('26 date placeholder is never a field value',() => {
  assert.equal(ui.annualDraftDateValue({ value: '',placeholder: 'jj/mm/aaaa' }),null);
  assert.match(read('assets/js/scope-ui.js'),/placeholder="jj\/mm\/aaaa" value="\$\{escapeHtml\(requirement/);
});
test('27 contradictory theme aliases fail before writes',async () => {
  const writes = []; const database = { transaction: (fn) => fn(database),query: async (sql) => {
    if(/^\s*(insert|update|delete)\b/i.test(sql)) writes.push(sql);
    if(sql.includes('from scope_annual_requirements r')) return { rows: [{ annual_requirement_id: ids.requirement,definition_version_id: ids.version,definition_code: 'DPS-INSTRUCTION-SECTION',status: 'DRAFT' }] };
    return { rows: [] };
  }};
  const service = createScopeAnnualCatalogService({ database,readinessInspector: async () => ({ ready: true,status: 'SCHEMA_READY' }),contextLoader: async () => base });
  await assert.rejects(() => service.replaceThemeAssignments(ids.requirement,{ assignments: [{ occurrenceNumber: 1,occurrence_number: 2,freeLabel: 'Libre' }] },{}),(error) => error.error === 'CONFLICTING_FIELD_ALIASES');
  assert.equal(writes.length,0);
});
test('28 invalid dates still fail before SQL',() => assert.throws(() => validateDraftInput({ year: 2027,requiredOccurrences: 1,windowStart: '2027-02-29' }),(error) => error.error === 'INVALID_DATE'));
test('29 Auth permission remains references:manage',() => {
  const source = read('netlify/functions/scope.js'); const route = source.slice(source.indexOf("'/annual-catalog/requirements/:id/themes'"),source.indexOf("'/annual-catalog/requirements/:id/revise'"));
  assert.match(route,/hasPermission\(claims,'references:manage'\)/); assert.doesNotMatch(route,/OKTA|OIDC/);
});
test('30 readiness includes C8 without runtime auto-migration',() => {
  assert.match(read('netlify/lib/_scope-canonical-readiness.js'),/scope-annual-catalog-themes-c8-b/);
  const schema = read('netlify/lib/_scope-schema.js'); const ensure = schema.slice(schema.indexOf('async function ensureScopeSchema()'),schema.indexOf('async function migrateQuoVadisReferentialManagement4()'));
  assert.doesNotMatch(ensure,/await migrateAnnualCatalogThemesC8B\(/);
});
test('31 migration and runtime DDL are structurally identical',() => {
  const migration = fs.readFileSync(MIGRATION,'utf8').replace(/\s+/g,' ');
  for(const statement of [...ddl.DDL,ddl.GUARD_SQL,ddl.PROTECTION_SQL]) assert(migration.includes(statement.replace(/\s+/g,' ').trim()),statement.slice(0,90));
});
test('32 DDL has lifecycle, RLS and revoke guards',() => {
  assert.equal(ddl.TABLES.length,4); assert.match(ddl.GUARD_SQL,/active theme version is semantically immutable/);
  assert.match(ddl.GUARD_SQL,/theme version is not active and bound to the activity/); assert.match(ddl.PROTECTION_SQL,/enable row level security/); assert.match(ddl.PROTECTION_SQL,/revoke all/);
});
test('33 list and detail use the approved MOA vocabulary',() => {
  const { hooks } = createCatalogUiHarness();
  const list = visibleText(hooks.renderAnnualCatalogHtml(catalogPayload()));
  const detail = visibleText(hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement:draftRequirement(),readyTransition:{ allowed:true,message:null } })));
  for(const label of ['Besoin 2027','Période','Contenus','QUO VADIS','Consulter la fiche ›']) assert(list.includes(label),label);
  for(const label of ['Thèmes par occurrence','Préparation dans QUO VADIS','Valider le besoin','Détails techniques']) assert(detail.includes(label),label);
  assert.match(read('assets/js/scope-ui.js'),/annualThemeAssignments/);
});
test('34 buttons are softer than state red and responsive breakpoints exist',() => {
  const css = read('assets/css/scope.css'); assert.match(css,/annual-button-primary\{background:#5f91c7/); assert.doesNotMatch(css,/annual-button-primary\{background:#de000a/);
  for(const width of ['1150','960','800']) assert(css.includes(`max-width:${width}px`),width);
});
test('35 no canonical theme is seeded or promoted automatically',() => {
  const migration = fs.readFileSync(MIGRATION,'utf8'); assert.doesNotMatch(migration,/insert into scope_theme_definitions/i);
  assert.match(read('docs/SCOPE_ANNUAL_CATALOG_THEMES_C8_B.md'),/ne seede aucun theme et ne backfille aucun libelle historique/i);
});
test('36 repair protects theme definitions only when referenced by READY',() => {
  assert.match(ddl.GUARD_SQL,/old\.status='ACTIVE' and new\.status='INACTIVE' and exists \([\s\S]*scope_theme_versions tv join scope_annual_requirement_theme_assignments a[\s\S]*r\.status='READY'/);
  assert.match(ddl.GUARD_SQL,/tv\.theme_definition_id=old\.theme_definition_id and r\.status='READY'/);
});
test('37 repair protects READY binding identity even when status stays ACTIVE',() => {
  const guard = ddl.GUARD_SQL.slice(ddl.GUARD_SQL.indexOf('create or replace function scope_activity_theme_binding_guard'),ddl.GUARD_SQL.indexOf('create or replace function scope_annual_requirement_theme_count_guard'));
  assert.match(guard,/new\.definition_id is distinct from old\.definition_id/);
  assert.match(guard,/new\.theme_definition_id is distinct from old\.theme_definition_id/);
  assert.match(guard,/r\.status='READY'/);
});
test('38 repair validates every assignment before a DRAFT version change',() => {
  const guard = ddl.GUARD_SQL.slice(ddl.GUARD_SQL.indexOf('create or replace function scope_annual_requirement_theme_count_guard'),ddl.GUARD_SQL.indexOf('create or replace function scope_annual_theme_assignment_guard'));
  assert.match(guard,/new\.definition_version_id is distinct from old\.definition_version_id/);
  assert.match(guard,/b\.definition_id=new_definition and b\.theme_definition_id=tv\.theme_definition_id and b\.status='ACTIVE'/);
  assert.match(guard,/st\.session_template_id=a\.session_template_id[\s\S]*st\.definition_version_id=new\.definition_version_id/);
  assert.doesNotMatch(guard,/(delete from|update)\s+scope_annual_requirement_theme_assignments/i);
});
test('39 repair enforces the JavaScript free-theme normalization contract in SQL',() => {
  for(const [label,expected] of [
    ['  Manœuvre   hydraulique ','MANOEUVRE HYDRAULIQUE'],
    ['École','ECOLE'],['e\u0301COLE','ECOLE'],['Œuvre Æther ﬁn','OEUVRE AETHER FIN'],['Feu / ABC','FEU ABC']
  ]) assert.equal(catalog.normalizeThemeLabel(label),expected,label);
  assert.match(ddl.GUARD_SQL,/scope_normalize_theme_label\(value text\)[\s\S]*normalize\([\s\S]*NFKD\)/);
  assert.match(ddl.GUARD_SQL,/row_value\.free_normalized is distinct from scope_normalize_theme_label\(row_value\.free_label\)/);
  assert.match(ddl.GUARD_SQL,/tg_op<>'DELETE' and row_value\.free_label is not null/);
});
test('40 repair-2 makes SQL normalization independent from database locale',() => {
  for(const [label,expected] of [
    ['ı',''],['i','I'],['I','I'],['é','E'],['É','E'],['e\u0301','E'],
    ['œ','OE'],['Œ','OE'],['æ','AE'],['Æ','AE'],['  Feu   ABC  ','FEU ABC'],
    ['Feu / ABC','FEU ABC'],['Ordinaire 123','ORDINAIRE 123'],['ABC ı é / œ','ABC E OE']
  ]) assert.equal(catalog.normalizeThemeLabel(label),expected,label);
  const normalizer = ddl.GUARD_SQL.slice(0,ddl.GUARD_SQL.indexOf('create or replace function scope_theme_definitions_guard_code'));
  assert.match(normalizer,/normalize\([\s\S]*NFKD\) collate "C"/);
  assert(normalizer.includes('[^ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789]+'));
  assert.doesNotMatch(normalizer,/'gi'/);
  assert((normalizer.match(/collate "C"/g) || []).length >= 2);
});

(async () => {
  let passed = 0;
  for(const item of tests){
    try { await item.fn(); passed += 1; process.stdout.write(`PASS ${item.name}\n`); }
    catch(error){ process.stderr.write(`FAIL ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
  }
  process.stdout.write(`C8-B ${passed}/${tests.length} PASS\n`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
