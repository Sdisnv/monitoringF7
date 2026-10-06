'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { Client } = require('pg');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');
const historical = require('../netlify/lib/data/scope-qv-history-2026.json');
const logic = require('../assets/js/scope-ui-logic');

const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const expectedSteps = {
  'CI-DPS': Array.from({ length: 10 }, (_, index) => `M${String(index + 1).padStart(2, '0')}`),
  'CI-DAP': ['M01','M02','M03','M04','M05'],
  'C-GROUPE': ['M01','M02','M03','M04'],
  PAPR: ['M01','M02','M03','M04','M05','M06','M07'],
  TP9: ['M01','M02','M03.1','M03.2','LIBRE'],
  'COND-VL': ['M01.0','M02.0','M03.1','M03.2','M04.1','M04.2'],
  MEA: ['M01.0', ...Array.from({ length: 8 }, (_, index) => [`M${String(index + 2).padStart(2, '0')}.1`, `M${String(index + 2).padStart(2, '0')}.2`]).flat()],
  JSP: ['M01','M02'],
  'OFSI-BASE': ['M01'],
  'OPERATEUR-VPC': ['M01'],
  'ELEVATEUR-S2': ['M01']
};

test('the direct 2026 workbook is the exact historical evidence used for cursus', () => {
  const workbook = readWorkbook(workbookPath);
  assert.equal(workbook.sha256, '58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742');
  assert.deepEqual(workbook.rows, historical.rows);
  const rows = workbook.rows;
  const modules = (pattern) => [...new Set(rows.flatMap((row) => {
    const match = row.title.match(pattern);
    return match ? [match[1]] : [];
  }))].sort((a, b) => Number(a) - Number(b));
  assert.deepEqual(modules(/^Cursus CI DPS - module (\d+)\b/), Array.from({ length: 10 }, (_, index) => String(index + 1)));
  assert.deepEqual(modules(/^Cursus CI DAP - module (\d+)\b/), ['1','2','3','4','5']);
  assert.deepEqual(modules(/^Cursus c groupe - module (\d+)\b/), ['1','2','3','4']);
  assert.deepEqual(modules(/^Cursus PAPR - module (\d+)\b/), ['1','2','3','4','5','6','7']);
  assert.deepEqual(modules(/^Cursus JSP - module (\d+)\b/), ['1','2']);
  assert.deepEqual(modules(/^Cursus cond VL - module (\d+\.\d+)\b/), ['1.0','2.0','3.1','3.2','4.1','4.2']);
  assert.deepEqual(modules(/^Cursus MEA - module (\d+\.\d+)\b/), ['1.0', ...Array.from({ length: 8 }, (_, index) => [`${index + 2}.1`, `${index + 2}.2`]).flat()]);
  assert.deepEqual(modules(/^Cursus TP9 - module (\d+(?:\.\d+)?)\b/), ['1','2','3.1','3.2']);
  assert.equal(rows.filter((row) => row.title === 'Cursus TP9 - conduite libre').length, 2);
  for (const [line, title] of [[266,'Cursus OFSI - formation de base'],[49,'Cursus opérateur VPC - module 1'],[114,'Cursus élévateur à timon S2 - module 1']])
    assert.equal(rows.find((row) => row.sourceLine === line).title, title);
  for (const line of [890,899,902]) assert.equal(rows.find((row) => row.sourceLine === line).date.slice(0,4), '2027');
});

test('only proven 2027 modules get Cursus type; JSP projections are superseded, not deleted', async () => {
  const fixture = createFixture(null);
  const qv = await fixture.service.listProgramme(2027);
  const rows = qv.canonicalProgramme.rows.filter((row) => !row.external);
  assert.equal(rows.length, 850);
  assert.deepEqual(Object.fromEntries(['models','occurrences','sessions','oiMaterializations','programmeItems','toReview']
    .map((key) => [key,qv.canonicalProgramme.target[key]])),
  { models:258,occurrences:848,sessions:848,oiMaterializations:1233,programmeItems:848,toReview:723 });
  const modules = rows.filter((row) => row.activityKind === 'CURSUS');
  assert.equal(modules.length, 7);
  const superseded = modules.filter((row) => row.cursusReconciliation && row.cursusReconciliation.status === 'SUPERSEDED_BY_VALIDATED_MODULE');
  assert.deepEqual(superseded.map((row) => [row.cursusStepCode,row.cursusReconciliation.supersededBy,row.cursusReconciliation.historicalSourceLine]),
    [['M01','qv-source-886',6],['M02','qv-source-903',8]]);
  assert.equal(rows.filter((row) => !row.cursusReconciliation).length, 848);
  assert.equal(rows.filter((row) => !row.cursusReconciliation && row.status === 'VALIDATED').length, 125);
  assert.equal(rows.filter((row) => !row.cursusReconciliation && row.status !== 'VALIDATED').length, 723);
  for (const row of modules) assert.equal(logic.qvProgrammeFilterType({ ...row,label:'Libellé sans mot-clé' }), 'Cursus');
  assert.equal(logic.qvProgrammeFilterType({ sourceType:'CURSUS',label:'Autre libellé' }), 'Cursus');
  for (const row of rows.filter((item) => /^(?:PABC|Pilote BAT|Grutier|FOBA)\b/i.test(item.label || '')))
    assert.notEqual(logic.qvProgrammeFilterType(row), 'Cursus');
  const byId = new Map(rows.map((row) => [row.id,row]));
  for (const [id, code, step, publics, ois] of [
    ['qv-source-886','JSP','M01',['JSP:1'],['B1','C1','G1']],
    ['qv-source-890','MEA','M01.0',['AUTO:1','AUTO:5'],[]],
    ['qv-source-899','PAPR','M01',['PR:2'],[]],
    ['qv-source-902','COND-VL','M01.0',['AUTO:3'],[]],
    ['qv-source-903','JSP','M02',['JSP:1'],['B1','C1','G1']]
  ]) {
    const row = byId.get(id);
    assert.equal(row.cursusCode, code);
    assert.equal(row.cursusStepCode, step);
    assert.deepEqual(row.publics, publics);
    assert.deepEqual(row.ois, ois);
  }
  await assert.rejects(() => fixture.service.updateProgrammePreparation(superseded[0].id, { year:2027 }),
    (error) => error.message.includes('module est déjà validé'));
  assert.equal(fixture.preparations.length, 0);
  const ui = fs.readFileSync('assets/js/scope-ui.js','utf8');
  assert.match(ui, /\['Cours', 'Cursus', 'Formation'/);
  const extract = (name) => ui.slice(ui.indexOf(`  function ${name}(`), ui.indexOf('\n  function ',ui.indexOf(`  function ${name}(`) + 1));
  const navContext = { qvView:() => 'programme',route:() => ({}),qvHref:(view) => `#/${view}`,
    escapeHtml:(value) => String(value) };
  vm.createContext(navContext);
  vm.runInContext(extract('renderQuoVadisNav'),navContext);
  assert.match(navContext.renderQuoVadisNav(qv), /Programme annuel <span>848<\/span>/);
  const preview = ui.slice(ui.indexOf("document.getElementById('qv-preview-2028')"),
    ui.indexOf("document.getElementById('qv-calculate-2028')"));
  assert.match(preview, /cursusReconciliation\.status === 'SUPERSEDED_BY_VALIDATED_MODULE'/);
  const context = { L:logic,state:{ quoVadisFilters:{ type:'Cursus' } },
    qvProgrammeVisualState:() => ({ label:'Validé',tone:'positive' }),
    qvProgrammeDate:(row) => String(row.startsAt || '').slice(0,10),
    qvProgrammeEventCodeLabel:() => '',qvProgrammePublicLabel:() => '',
    qvProgrammeProvenance:() => '',qvProgrammeCompareRows:() => 0 };
  vm.createContext(context);
  vm.runInContext(extract('qvProgrammePublicCodes') + extract('qvNormalizeSearch') + extract('qvProgrammeFilteredRows'),context);
  const filtered = context.qvProgrammeFilteredRows(qv).map((row) => row.id);
  assert.deepEqual(Array.from(filtered),['qv-source-886','qv-source-890','qv-source-899','qv-source-902','qv-source-903']);
});

test('a later human decision or publication keeps a projected module visible', async () => {
  const fixture = createFixture(null);
  const first = await fixture.service.listProgramme(2027);
  const projection = first.canonicalProgramme.rows.find((row) => row.cursusReconciliation?.historicalSourceLine === 6);
  fixture.preparations.push({ obligation_id:'local-human-jsp',programme_id:'local-qv-2027',source_type:'MANUAL',
    source_ref:projection.id,title:projection.label,domain:'JSP',cible_codes:projection.publics,statut:'PLANIFIE',
    metadata:{ source:'QV_PROGRAMME_PREPARATION',humanDecision:true,planningFields:{} } });
  const human = await fixture.service.listProgramme(2027);
  assert.equal(human.canonicalProgramme.rows.find((row) => row.id === projection.id).cursusReconciliation, null);
  fixture.preparations.pop();
  fixture.published.publication_unit_id = projection.id;
  const published = await fixture.service.listProgramme(2027);
  assert.equal(published.canonicalProgramme.rows.find((row) => row.id === projection.id).cursusReconciliation, null);
});

test('local clone: ordered referential, five links and protected counts', { skip: !process.env.SCOPE_QV_CURSUS_CLONE_URL }, async () => {
  const url = new URL(process.env.SCOPE_QV_CURSUS_CLONE_URL);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '55432');
  assert.equal(url.pathname, '/scope_qv_2027_recipe_20261006');
  const client = new Client({ connectionString:url.href, connectionTimeoutMillis:5000, statement_timeout:30000 });
  await client.connect();
  try {
    await client.query('begin read only');
    const { rows } = await client.query(`select d.code,array_agg(s.step_code order by s.ordre) as steps
      from scope_quo_vadis_cursus_definitions d
      join scope_quo_vadis_cursus_versions v on v.cursus_id=d.cursus_id and v.active is true
      join scope_quo_vadis_cursus_steps s on s.cursus_version_id=v.cursus_version_id
      group by d.code order by d.code`);
    assert.deepEqual(Object.fromEntries(rows.map((row) => [row.code,row.steps])), expectedSteps);
    const workbookByLine = new Map(readWorkbook(workbookPath).rows.map((row) => [row.sourceLine,row]));
    const { rows:provenance } = await client.query(`select d.code,t.step_code,t.metadata->>'sourceLine' as source_line,
      t.metadata->>'sourceYear' as source_year
      from scope_quo_vadis_cursus_definitions d
      join scope_quo_vadis_cursus_versions v on v.cursus_id=d.cursus_id and v.version_code='2027'
      join scope_quo_vadis_cursus_steps t on t.cursus_version_id=v.cursus_version_id
      where d.code<>'CI-DPS' order by d.code,t.ordre`);
    assert.equal(provenance.length, 49);
    for (const step of provenance) {
      const source = workbookByLine.get(Number(step.source_line));
      assert.ok(source && source.title.startsWith('Cursus '), `${step.code} ${step.step_code}`);
      assert.equal(source.date.slice(0,4), step.source_year, `${step.code} ${step.step_code}`);
    }
    const { rows:linked } = await client.query(`select o.source_ref,d.code,t.step_code,o.cible_codes,o.statcom_code,
      o.metadata->>'humanDecision' as human_decision
      from scope_quo_vadis_obligations o
      join scope_quo_vadis_cursus_steps t on t.step_id=o.cursus_step_id
      join scope_quo_vadis_cursus_versions v on v.cursus_version_id=t.cursus_version_id
      join scope_quo_vadis_cursus_definitions d on d.cursus_id=v.cursus_id
      where o.source_ref like 'qv-source-%' order by o.source_ref`);
    assert.deepEqual(linked.map((row) => [row.source_ref,row.code,row.step_code,row.human_decision]), [
      ['qv-source-886','JSP','M01','false'],['qv-source-890','MEA','M01.0','false'],
      ['qv-source-899','PAPR','M01','false'],['qv-source-902','COND-VL','M01.0','false'],
      ['qv-source-903','JSP','M02','false']
    ]);
    const { rows:counts } = await client.query(`select
      (select count(*)::int from scope_quo_vadis_obligations o join scope_quo_vadis_programmes p using(programme_id)
       where p.annee=2027 and o.metadata->>'source'='QV_PROGRAMME_PREPARATION') as preparations,
      (select count(*)::int from scope_quo_vadis_obligations o join scope_quo_vadis_programmes p using(programme_id)
       where p.annee=2027 and o.metadata->>'source'='QV_PROGRAMME_PREPARATION' and o.statut='PLANIFIE') as planned,
      (select count(*)::int from scope_quo_vadis_obligations o join scope_quo_vadis_programmes p using(programme_id)
       where p.annee=2027 and o.metadata->>'source'='QV_PROGRAMME_PREPARATION' and o.statut='A_PLANIFIER') as waiting,
      (select count(*)::int from scope_qv_publication_links where source_year=2027) as publications,
      (select count(*)::int from scope_participations) as participations,
      (select count(*)::int from scope_attendus) as attendus,
      (select count(*)::int from scope_affectations) as affectations,
      (select count(*)::int from scope_quo_vadis_obligations o join scope_quo_vadis_programmes p using(programme_id)
       where p.annee=2027 and o.source_type='CURSUS') as generated_cursus`);
    assert.deepEqual(counts[0], { preparations:850,planned:125,waiting:725,publications:125,
      participations:6156,attendus:5952,affectations:636,generated_cursus:10 });
    await client.query('rollback');
  } finally {
    await client.end();
  }
});
