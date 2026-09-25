'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const label = require('../assets/js/scope-activity-label');
const importer = require('../netlify/lib/_scope-annual-catalog-import');
const importDdl = require('../netlify/lib/_scope-annual-catalog-import-ddl');
const { createScopeAnnualCatalogService } = require('../netlify/lib/_scope-annual-catalog-service');
const { createCatalogUiHarness,catalogPayload,activityPayload,visibleText } = require('./scope-annual-catalog-ui-harness');
const { DEFAULT_WORKBOOK,markdown } = require('./scope-annual-catalog-c15-diagnostic');
const { buildPreview } = require('./scope-annual-catalog-c15-preview');

const ROOT = path.resolve(__dirname,'..');
const read = (file) => fs.readFileSync(path.join(ROOT,file),'utf8');
const workbookPath = process.env.SCOPE_C15_WORKBOOK || DEFAULT_WORKBOOK;
if(!fs.existsSync(workbookPath)) throw new Error(`Classeur C15 introuvable: ${workbookPath}`);
const workbook = fs.readFileSync(workbookPath);
const preview = importer.analyzeWorkbook(workbook,{ fileName:path.basename(workbookPath) });
const rows = importer.rowsFromWorkbook(workbook).rows;
const tests = [];
const test = (name,fn) => tests.push({ name,fn });
const major = (row) => ['DPS','DAP','FOBA','JSP','EM'].filter((code) => row.crosses[code]);

function createImportCycleDatabase(){
  const state = { aliases:new Map(),definitions:new Map(),versions:new Map(),runs:new Map(),decisions:new Map(),writes:0 };
  let sequence = 0;
  const result = (rows = [],rowCount = rows.length) => ({ rows,rowCount });
  const client = { async query(sql,params = []){
    const query = sql.replace(/\s+/g,' ').trim();
    const writes = /^(insert|update|delete)\b/i.test(query);
    if(writes) state.writes += 1;
    if(/select a\.normalized_value,d\.code from scope_activity_legacy_aliases/.test(query)){
      return result([...state.aliases].map(([normalized_value,code]) => ({ normalized_value,code })));
    }
    if(/select d\.proposal_id,d\.decision as action/.test(query)){
      return result([...state.decisions.values()].filter((row) => row.payload.humanDecision).map((row) => ({
        proposal_id:row.proposalId,action:row.action,target_definition_code:row.targetDefinitionCode,comment:row.comment
      })));
    }
    if(/select import_run_id,status from scope_catalog_import_runs/.test(query)){
      const run = state.runs.get(`${params[0]}|${params[1]}`);
      return result(run ? [{ import_run_id:run.id,status:run.status }] : []);
    }
    if(/select definition_id,code from scope_event_definitions where code=\$1/.test(query)){
      const definition = state.definitions.get(params[0]);
      return result(definition ? [definition] : []);
    }
    if(/^insert into scope_event_definitions/.test(query)){
      const definition = { definition_id:`definition-${++sequence}`,code:params[0] };
      state.definitions.set(definition.code,definition);
      return result([definition],1);
    }
    if(/select coalesce\(max/.test(query)) return result([{ value:(state.versions.get(params[0]) || 0) + 1 }]);
    if(/^insert into scope_event_definition_versions/.test(query)){
      state.versions.set(params[0],(state.versions.get(params[0]) || 0) + 1);
      return result([{ definition_version_id:`version-${++sequence}` }],1);
    }
    if(/^insert into scope_theme_definitions/.test(query)) return result([{ theme_definition_id:`theme-${++sequence}` }],1);
    if(/^insert into scope_activity_legacy_aliases/.test(query)){
      const definition = [...state.definitions.values()].find((row) => row.definition_id === params[2]);
      state.aliases.set(params[1],definition.code);
      return result([],1);
    }
    if(/^insert into scope_catalog_import_runs/.test(query)){
      const run = { id:`run-${state.runs.size + 1}`,status:params[3] };
      state.runs.set(`${params[0]}|${params[2]}`,run);
      return result([{ import_run_id:run.id }],1);
    }
    if(/^insert into scope_catalog_import_decisions/.test(query)){
      const payload = JSON.parse(params[6]);
      const key = `${params[1]}|${params[2]}`;
      if(!state.decisions.has(key)) state.decisions.set(key,{ proposalId:params[3],action:params[4],targetDefinitionCode:params[5] || null,payload,comment:params[7] || null });
      return result([],state.decisions.has(key) ? 1 : 0);
    }
    return result([],writes ? 1 : 0);
  } };
  return { state,database:{ query:client.query.bind(client),transaction:async (fn) => fn(client) } };
}

test('01 lit le classeur réel et réconcilie 925 lignes événementielles',() => {
  assert.equal(preview.summary.source.physicalRows,929); assert.equal(preview.summary.source.eventRows,925);
  assert.equal(preview.summary.reconciliation.sourceRows,preview.summary.reconciliation.groupedRows);
  assert.equal(preview.summary.reconciliation.classifiedRows,925);
});
test('02 retrouve 48 colonnes métier et 365 libellés sources',() => {
  assert.equal(preview.summary.source.usedColumns,48); assert.equal(preview.summary.source.distinctRawLabels,365);
  assert.equal(preview.summary.normalization.distinctThemes,80);
  for(const column of importer.REQUIRED_COLUMNS) assert(preview.source.headers.includes(column),column);
});
test('03 applique strictement le parsing activité barre verticale thème',() => {
  const cases = [
    ['Exercice PR 1.1 | Base','Exercice PR 1.1','Base'],
    ['Cursus JSP - module 1 | Petzi découvre les pin-pon','Cursus JSP - module 1','Petzi découvre les pin-pon'],
    ['Formation BIKABLO | Facilitation visuelle','Formation BIKABLO','Facilitation visuelle'],
    ['Formation antichute','Formation antichute',null]
  ];
  for(const [raw,activity,theme] of cases) assert.deepEqual(label.splitActivityThemeLabel(raw),{ activity,theme });
});
test('04 compose les libellés avec le point médian',() => {
  assert.equal(label.formatActivityThemeLabel('Exercice PR 1.1 | Base'),'Exercice PR 1.1 · Base');
  assert.equal(label.formatActivityThemeLabel('Formation antichute'),'Formation antichute');
});
test('05 ne préfixe jamais le thème dans le libellé composé',() => {
  for(const row of rows) assert(!/·\s*Thème\b/i.test(label.formatActivityThemeLabel(row.rawLabel)));
});
test('06 conserve les tirets internes',() => {
  assert.equal(label.formatActivityThemeLabel('Cursus TP9 - module 3.1 | Drive'),'Cursus TP9 - module 3.1 · Drive');
});
test('07 interprète un cas DPS seul depuis les vraies croix',() => assert(rows.some((row) => major(row).join(',') === 'DPS')));
test('08 interprète un cas DAP seul depuis les vraies croix',() => assert(rows.some((row) => major(row).join(',') === 'DAP')));
test('09 interprète un cas DPS et DAP',() => assert(rows.some((row) => major(row).includes('DPS') && major(row).includes('DAP'))));
test('10 retrouve DPS DAP FOBA JSP sur BIKABLO',() => {
  const found = rows.filter((row) => row.activityLabel === 'Formation BIKABLO').flatMap(major);
  for(const value of ['DPS','DAP','FOBA','JSP']) assert(found.includes(value),value);
});
test('11 AUTO traverse plusieurs populations et reste domaine de premier niveau',() => {
  const found = preview.proposals.find((row) => /Cursus cond VL - module 2\.0/i.test(row.activityLabel));
  assert(found); assert.equal(found.primaryDomain,'AUTO'); assert(found.majorPopulations.includes('DPS')); assert(found.majorPopulations.includes('DAP'));
});
test('12 conserve les activités portant plusieurs OI',() => assert(preview.proposals.some((row) => row.oiCodes.length >= 4)));
test('13 conserve FOBA associé à des exercices DPS ou DAP',() => assert(preview.proposals.some((row) => /Exercice (DPS|DAP)/i.test(row.activityLabel) && row.fobaLevels.length)));
test('14 ne crée jamais GEN comme OI',() => assert(preview.proposals.every((row) => row.oiCodes.every((code) => !code.endsWith(':GEN')))));
test('15 ne transforme pas CADET en domaine',() => assert(preview.proposals.every((row) => !row.domainCodes.includes('CADET'))));
test('16 maintient PR AUTO et FOSPEC comme domaines distincts',() => {
  for(const domain of ['PR','AUTO','FOSPEC']) assert(preview.proposals.some((row) => row.primaryDomain === domain),domain);
  assert(preview.proposals.filter((row) => ['PR','AUTO'].includes(row.primaryDomain)).every((row) => !row.domainCodes.includes('FOSPEC')));
});
test('16b traduit VPC exclusivement vers le canon C3',() => {
  const vpc = preview.proposals.filter((row) => row.specializations.includes('VPC'));
  assert.equal(vpc.length,9);
  assert(vpc.every((row) => row.publicCodes.includes('FOSPEC-VPC')));
  assert(vpc.every((row) => !row.publicCodes.includes('FOSPEC-OP-VPC') && !row.specializations.includes('OP_VPC')));
});
test('17 ne confond pas famille technique et domaine',() => assert(preview.proposals.every((row) => !row.familyCodes.includes(row.primaryDomain))));
test('17b traite FOCO comme famille lorsque les croix démontrent le public',() => {
  const kickoff = preview.proposals.find((row) => row.activityLabel === 'Instr demi-sct - KICK-OFF');
  assert(kickoff); assert.equal(kickoff.primaryDomain,'DPS'); assert(kickoff.familyCodes.includes('FOCO')); assert(kickoff.majorPopulations.includes('DPS'));
  const bikablo = preview.proposals.find((row) => row.activityLabel === 'Formation BIKABLO');
  assert(bikablo.familyCodes.includes('FOCA')); assert.deepEqual([...bikablo.majorPopulations].sort(),['DAP','DPS','FOBA','JSP']);
});
test('18 produit un regroupement et une empreinte déterministes',() => {
  const again = importer.analyzeWorkbook(workbook,{ fileName:path.basename(workbookPath) });
  assert.equal(again.previewFingerprint,preview.previewFingerprint); assert.deepEqual(again.summary,preview.summary);
});
test('18b classe les collisions comme arbitrages explicites',() => {
  const collisions = preview.proposals.filter((row) => row.collisions.length);
  assert.equal(collisions.length,1); assert(collisions.every((row) => row.classification === 'REVIEW_REQUIRED'));
});
test('19 retrouve les répétitions annoncées et réconcilie les groupes',() => {
  const expected = new Map([['Conduite, formation continue',74],['Instr demi-sct - KICK-OFF',29],['Instr demi-sct - VARIA',28],['Instr demi-sct - FEU',18],['Exercice DPS-DAP 2',16]]);
  for(const [name,count] of expected) assert.equal(preview.proposals.find((row) => row.activityLabel === name).sourceRowCount,count,name);
  assert.equal(preview.summary.normalization.activityRoots,345);
});
test('20 détecte 148 lignes multi-populations',() => assert.equal(preview.summary.target.multiPopulationRows,148));
test('21 préserve une décision humaine explicite',() => {
  const candidate = preview.proposals.find((row) => row.classification === 'UNRESOLVED'); assert(candidate);
  const decided = importer.applyHumanDecisions(preview,[{ proposalId:candidate.proposalId,action:'IGNORE',comment:'Décision MOA' }]);
  const result = decided.proposals.find((row) => row.proposalId === candidate.proposalId);
  assert.equal(result.classification,'IGNORED'); assert.equal(result.humanDecision.comment,'Décision MOA');
  assert.equal(decided.summary.decisions.UNRESOLVED,preview.summary.decisions.UNRESOLVED - 1);
  assert.equal(decided.summary.decisions.IGNORED,preview.summary.decisions.IGNORED + 1);
});
test('22 le dry-run de service ne lance ni transaction ni écriture',async () => {
  const calls = []; const database = { async query(sql){ calls.push(sql);return { rows:[] }; },transaction(){ throw new Error('transaction interdite'); } };
  const service = createScopeAnnualCatalogService({ database,readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  const result = await service.previewImport({ fileName:'2026.xlsx',xlsxBase64:workbook.toString('base64') });
  assert.equal(result.preview.databaseWrites,false); assert(calls.every((sql) => /^\s*select/i.test(sql)));
});
test('23 le Catalogue rend création import et filtre archives',() => {
  const { hooks } = createCatalogUiHarness(); const payload = catalogPayload(); hooks.state.annualCatalogMode = 'create';
  let html = hooks.renderAnnualCatalogHtml(payload); assert.match(html,/annual-activity-create/); assert.match(html,/annual-filter-archives/); assert.match(html,/Créer/);
  hooks.state.annualCatalogMode = 'import';html = hooks.renderAnnualCatalogHtml(payload);assert.match(html,/annual-import-preview-form/);assert.match(html,/dry-run/);
});
test('24 la fiche rend modification archivage restauration et versionnement',() => {
  const { hooks } = createCatalogUiHarness(); hooks.state.annualCatalogDefinitionEdit = true;
  let html = hooks.renderAnnualCatalogActivityHtml(activityPayload()); assert.match(html,/annual-activity-edit-form/); assert.match(html,/Archiver/);assert.match(html,/nouvelle version/);
  const archived = activityPayload(); archived.activity.active = false;hooks.state.annualCatalogDefinitionEdit = false;html = hooks.renderAnnualCatalogActivityHtml(archived);assert.match(html,/Restaurer/);assert.doesNotMatch(html,/id="annual-activity-edit"/);
});
test('25 refuse le hard-delete d’une activité utilisée',async () => {
  const client = { async query(sql){
    if(/select definition_id,code/.test(sql)) return { rows:[{ definition_id:'definition-1',code:'DPS-TEST' }] };
    if(/annual_requirement_count/.test(sql)) return { rows:[{ annual_requirement_count:1,event_count:0,alias_count:0,import_decision_count:0 }] };
    return { rows:[] };
  } };
  const database = { transaction:async (fn) => fn(client),query:client.query };
  const service = createScopeAnnualCatalogService({ database,readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  await assert.rejects(() => service.deleteUnusedActivity('DPS-TEST'),(error) => error && error.error === 'activite_utilisee_archivage_requis');
});
test('25b réserve le hard-delete aux activités sans aucune trace C15',async () => {
  const scenarios = [
    ['besoin',{ annual_requirement_count:1,event_count:0,alias_count:0,import_decision_count:0 }],
    ['événement',{ annual_requirement_count:0,event_count:1,alias_count:0,import_decision_count:0 }],
    ['alias',{ annual_requirement_count:0,event_count:0,alias_count:1,import_decision_count:0 }],
    ['décision',{ annual_requirement_count:0,event_count:0,alias_count:0,import_decision_count:1 }]
  ];
  const makeService = (usage,calls = []) => {
    const client = { async query(sql){ calls.push(sql);
      if(/select definition_id,code/.test(sql)) return { rows:[{ definition_id:'definition-1',code:'DPS-TEST' }] };
      if(/annual_requirement_count/.test(sql)) return { rows:[usage] };
      if(/select definition_version_id/.test(sql)) return { rows:[{ definition_version_id:'version-1' }] };
      return { rows:[],rowCount:1 };
    } };
    return createScopeAnnualCatalogService({ database:{ transaction:async (fn) => fn(client),query:client.query },readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  };
  const blankCalls = [];
  assert.equal((await makeService({ annual_requirement_count:0,event_count:0,alias_count:0,import_decision_count:0 },blankCalls).deleteUnusedActivity('DPS-TEST')).deleted,true);
  assert(blankCalls.some((sql) => /scope_activity_legacy_aliases/.test(sql) && /alias_count/.test(sql)));
  assert(blankCalls.some((sql) => /scope_catalog_import_decisions/.test(sql) && /import_decision_count/.test(sql)));
  assert(blankCalls.every((sql) => !/delete from scope_activity_legacy_aliases/.test(sql)));
  for(const [name,usage] of scenarios){
    await assert.rejects(() => makeService(usage).deleteUnusedActivity('DPS-TEST'),(error) => error && error.status === 409 && error.error === 'activite_utilisee_archivage_requis',name);
  }
});
test('26 ne contient aucune écriture vers les structures opérationnelles',() => {
  const source = [read('netlify/lib/_scope-annual-catalog-import.js'),read('netlify/lib/_scope-annual-catalog-service.js'),read('netlify/lib/_scope-annual-catalog-import-ddl.js')].join('\n');
  assert.doesNotMatch(source,/(insert into|update|delete from)\s+(scope_evenements|scope_attendus|scope_participations|scope_presences)/i);
  assert.match(source,/operationalWrites:false,eventPublication:false/);
});
test('27 modernise les contrôles sans modifier les primitives globales',() => {
  const css = read('assets/css/scope.css'); assert.match(css,/C15 — administration et import du Catalogue/);assert.match(css,/\.annual-button-primary/);
  const block = css.slice(css.indexOf('/* C15')); assert.doesNotMatch(block,/gradient|border-radius:\s*(?:[1-9]\d|[4-9])px|box-shadow:(?!none)/);
});
test('28 couvre les largeurs 1500 1150 960 et 800 sans cartes mobiles',() => {
  const css = read('assets/css/scope.css'); for(const width of [1150,960,800]) assert(css.includes(`@media(max-width:${width}px)`),width);
  assert.match(css,/annual-import-table-wrap\{max-width:100%/); assert.doesNotMatch(css,/annual-catalog-table[^{}]*display:\s*block/);
});
test('29 garde une parité structurelle entre migration et DDL partagé',() => {
  const migration = read('database/migrations/20260925_scope_annual_catalog_import_c15.sql');
  for(const fragment of ['scope_catalog_import_runs','scope_catalog_import_decisions','scope_catalog_import_decision_guard','enable row level security','revoke all']){
    assert(migration.includes(fragment),fragment); assert(`${importDdl.DDL.join('\n')}\n${importDdl.GUARD_SQL}\n${importDdl.PROTECTION_SQL}`.includes(fragment),fragment);
  }
});
test('30 produit un artefact preview lisible et exhaustif',() => {
  const report = markdown(preview); assert.match(report,/925 lignes source → 925 lignes regroupées → 345 propositions/);assert.match(report,/Formation BIKABLO/);assert.match(report,/AUTO_IMPORT/);
  assert.doesNotMatch(report,/databaseWrites=true|eventPublication=true/);
});
test('31 génère les six états UX depuis le renderer réel',() => {
  const directory = fs.mkdtempSync(path.join(require('node:os').tmpdir(),'scope-c15-ui-'));
  const files = buildPreview(directory);
  for(const key of ['catalogue','creation','import','withoutRequirement','withRequirement','edit','archived']){
    assert(fs.existsSync(files[key]),key); assert.match(fs.readFileSync(files[key],'utf8'),/<section|<div/);
  }
  assert.match(fs.readFileSync(files.import,'utf8'),/925 lignes → 345 groupes → 345 propositions/);
});
test('32 crée une définition et active une version canonique',async () => {
  const calls = []; const client = { async query(sql){ calls.push(sql);
    if(/select definition_id from scope_event_definitions/.test(sql)) return { rows:[] };
    if(/insert into scope_event_definitions/.test(sql)) return { rows:[{ definition_id:'definition-new',code:'DPS-NOUVELLE-ACTIVITE' }] };
    if(/select coalesce\(max/.test(sql)) return { rows:[{ value:1 }] };
    if(/insert into scope_event_definition_versions/.test(sql)) return { rows:[{ definition_version_id:'version-new' }] };
    return { rows:[] };
  } };
  const service = createScopeAnnualCatalogService({ database:{ transaction:async (fn) => fn(client),query:client.query },readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  const result = await service.createActivity({ label:'Nouvelle activité',primaryDomain:'DPS',activityType:'TRAINING',durationMinutes:90 },{ sub:'reviewer' });
  assert.equal(result.activity.versionCode,'C15-V1'); assert.equal(result.operationalWrites,false);
  assert(calls.some((sql) => /set status='ACTIVE'/.test(sql)));
});
test('32b crée les liaisons VPC canoniques et rejette une référence absente',async () => {
  const calls = []; const client = { async query(sql,params){ calls.push({ sql,params });
    if(/select definition_id from scope_event_definitions/.test(sql)) return { rows:[] };
    if(/insert into scope_event_definitions/.test(sql)) return { rows:[{ definition_id:'definition-vpc',code:'FOSPEC-FORMATION-VPC' }],rowCount:1 };
    if(/select coalesce\(max/.test(sql)) return { rows:[{ value:1 }] };
    if(/insert into scope_event_definition_versions/.test(sql)) return { rows:[{ definition_version_id:'version-vpc' }],rowCount:1 };
    return { rows:[],rowCount:1 };
  } };
  const service = createScopeAnnualCatalogService({ database:{ transaction:async (fn) => fn(client),query:client.query },readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  await service.createActivity({ label:'Formation VPC',primaryDomain:'FOSPEC',activityType:'TRAINING',durationMinutes:120,
    publicCodes:['FOSPEC-VPC'],qualificationCodes:['VPC'] },{ sub:'reviewer' });
  assert(calls.some((call) => /scope_activity_public_bindings/.test(call.sql) && call.params[1] === 'FOSPEC-VPC'));
  assert(calls.some((call) => /scope_activity_qualification_bindings/.test(call.sql) && call.params[1] === 'VPC' && /actif=true/.test(call.sql)));

  let activated = false;
  const invalid = { async query(sql){
    if(/select definition_id from scope_event_definitions/.test(sql)) return { rows:[] };
    if(/insert into scope_event_definitions/.test(sql)) return { rows:[{ definition_id:'definition-invalid',code:'FOSPEC-INVALIDE' }],rowCount:1 };
    if(/select coalesce\(max/.test(sql)) return { rows:[{ value:1 }] };
    if(/insert into scope_event_definition_versions/.test(sql)) return { rows:[{ definition_version_id:'version-invalid' }],rowCount:1 };
    if(/scope_activity_public_bindings/.test(sql)) return { rows:[],rowCount:0 };
    if(/set status='ACTIVE'/.test(sql)) activated = true;
    return { rows:[],rowCount:1 };
  } };
  const invalidService = createScopeAnnualCatalogService({ database:{ transaction:async (fn) => fn(invalid),query:invalid.query },readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  await assert.rejects(() => invalidService.createActivity({ label:'Formation invalide',primaryDomain:'FOSPEC',activityType:'TRAINING',durationMinutes:120,
    publicCodes:['FOSPEC-INCONNU'] },{ sub:'reviewer' }),(error) => error && error.status === 422 && error.error === 'reference_canonique_introuvable');
  assert.equal(activated,false);
});
test('33 versionne une modification et clone toute la configuration canonique',async () => {
  const calls = []; const client = { async query(sql){ calls.push(sql);
    if(/from scope_event_definitions d/.test(sql)) return { rows:[{ definition_id:'definition-1',code:'DPS-TEST',label:'Avant',domain:'DPS',family_code:null,activity_type:'TRAINING',definition_version_id:'version-old',description:'Description' }] };
    if(/select domain_code,binding_role/.test(sql)) return { rows:[{ domain_code:'DPS',binding_role:'PRIMARY' },{ domain_code:'DAP',binding_role:'SECONDARY' }] };
    if(/select duration_minutes/.test(sql)) return { rows:[{ duration_minutes:120 }] };
    if(/select periodicity_type/.test(sql)) return { rows:[{ periodicity_type:'ANNUAL' }] };
    if(/join scope_public_definitions/.test(sql)) return { rows:[{ code:'DPS-G1' }] };
    if(/join scope_competence_definitions/.test(sql)) return { rows:[{ code:'COND_VL' }] };
    if(/select statcom_code as code/.test(sql)) return { rows:[{ code:'0120F7' }] };
    if(/join scope_theme_definitions/.test(sql)) return { rows:[{ label:'FEU' }] };
    if(/select coalesce\(max/.test(sql)) return { rows:[{ value:2 }] };
    if(/insert into scope_event_definition_versions/.test(sql)) return { rows:[{ definition_version_id:'version-new' }] };
    if(/insert into scope_theme_definitions/.test(sql)) return { rows:[{ theme_definition_id:'theme-feu' }] };
    return { rows:[] };
  } };
  const service = createScopeAnnualCatalogService({ database:{ transaction:async (fn) => fn(client),query:client.query },readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  const result = await service.updateActivity('DPS-TEST',{ label:'Après' },{ sub:'reviewer' });
  assert.equal(result.versioned,true); assert.equal(result.activity.versionCode,'C15-V2');
  assert(calls.some((sql) => /scope_activity_public_bindings/.test(sql) && /insert into/.test(sql)));
  assert(calls.some((sql) => /scope_activity_qualification_bindings/.test(sql) && /insert into/.test(sql)));
  assert(calls.some((sql) => /scope_activity_statistical_contributions/.test(sql) && /insert into/.test(sql)));
  assert(calls.some((sql) => /depends_on_session_template_id=parent_new/.test(sql)));
  for(const table of ['scope_activity_role_requirements','scope_activity_location_requirements','scope_activity_responsible_requirements','scope_activity_planning_constraints']){
    assert(calls.some((sql) => sql.includes(`insert into ${table}`)),table);
  }
  assert(calls.some((sql) => /status='RETIRED'/.test(sql)) && calls.some((sql) => /status='ACTIVE'/.test(sql)));
  assert(calls.filter((sql) => /status='RETIRED'/.test(sql)).every((sql) => !/valid_to/.test(sql)));
});
test('34 archive et restaure sans détruire la définition',async () => {
  const calls = []; const database = { async query(sql){ calls.push(sql);return { rows:[{ code:'DPS-TEST',label:'Test' }] }; } };
  const service = createScopeAnnualCatalogService({ database,readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  assert.equal((await service.archiveActivity('DPS-TEST',{ sub:'reviewer' })).archived,true);
  assert.equal((await service.restoreActivity('DPS-TEST',{ sub:'reviewer' })).restored,true);
  assert(calls.every((sql) => /update scope_event_definitions/.test(sql)));
  assert(calls.some((sql) => /status='ARCHIVE'/.test(sql)) && calls.some((sql) => /status='ACTIF'/.test(sql)));
});
test('35 recharge les arbitrages humains lors d’un nouveau dry-run',async () => {
  const candidate = preview.proposals.find((row) => row.classification === 'UNRESOLVED');
  const database = { async query(sql){
    if(/scope_catalog_import_decisions/.test(sql)) return { rows:[{ proposal_id:candidate.proposalId,action:'IGNORE',comment:'Arbitrage conservé' }] };
    return { rows:[] };
  } };
  const service = createScopeAnnualCatalogService({ database,readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  const result = await service.previewImport({ fileName:'2026.xlsx',xlsxBase64:workbook.toString('base64') });
  const decided = result.preview.proposals.find((row) => row.proposalId === candidate.proposalId);
  assert.equal(decided.classification,'IGNORED'); assert.equal(decided.humanDecision.comment,'Arbitrage conservé');
});
test('36 rend le vrai second import identique idempotent après création des alias',async () => {
  const { database,state } = createImportCycleDatabase();
  const service = createScopeAnnualCatalogService({ database,readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }) });
  const decisions = preview.proposals.filter((row) => ['REVIEW_REQUIRED','UNRESOLVED'].includes(row.classification)).map((row) => ({ proposalId:row.proposalId,action:'IGNORE' }));
  const first = await service.applyImport({ fileName:'2026.xlsx',xlsxBase64:workbook.toString('base64'),previewFingerprint:preview.previewFingerprint,decisions },{ sub:'reviewer' });
  assert.equal(first.idempotent,false); assert.equal(first.imported,296);
  assert.equal(state.runs.size,1);assert.equal(state.definitions.size,296);assert.equal([...state.versions.values()].reduce((sum,value) => sum + value,0),296);
  const aliasPreview = importer.analyzeWorkbook(workbook,{ fileName:'2026.xlsx',existing:state.aliases });
  assert.equal(aliasPreview.previewFingerprint,preview.previewFingerprint);
  assert.equal(aliasPreview.summary.decisions.MERGE,296);
  const before = { runs:state.runs.size,definitions:state.definitions.size,versions:[...state.versions.values()].reduce((sum,value) => sum + value,0),writes:state.writes };
  const second = await service.applyImport({ fileName:'2026.xlsx',xlsxBase64:workbook.toString('base64'),previewFingerprint:aliasPreview.previewFingerprint,decisions },{ sub:'reviewer' });
  assert.equal(second.idempotent,true); assert.equal(second.importRunId,first.importRunId);assert.equal(second.importFingerprint,first.importFingerprint);
  assert.deepEqual({ runs:state.runs.size,definitions:state.definitions.size,versions:[...state.versions.values()].reduce((sum,value) => sum + value,0),writes:state.writes },before);
  assert.equal([...state.decisions.values()].filter((row) => row.payload.humanDecision).length,18);
});

(async () => {
  let passed = 0;
  for(const item of tests){
    try { await item.fn();passed += 1;process.stdout.write(`PASS ${item.name}\n`); }
    catch(error){ console.error(`FAIL ${item.name}\n${error.stack}`);process.exitCode = 1; }
  }
  process.stdout.write(`C15 ${passed}/${tests.length} PASS\n`);
})();
