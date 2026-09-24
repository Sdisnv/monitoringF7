'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ui = require('../assets/js/scope-ui-logic');
const preview = require('./scope-annual-catalog-c10-preview');
const { DOMAIN_ORDER } = require('../netlify/lib/_scope-annual-catalog-service');

const ROOT = path.resolve(__dirname,'..');
const read = (file) => fs.readFileSync(path.join(ROOT,file),'utf8');
const source = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const tests = [];
const test = (name,fn) => tests.push({ name,fn });

test('01 undefined annual need has a business summary',() => assert.deepEqual(ui.annualSummary(null,[],0),{
  requirement:'Besoin non défini',period:'Période à définir',contents:'Contenus à définir',quoVadis:'Non préparé dans QUO VADIS'
}));
test('02 defined annual need has correct counts and plurals',() => {
  const one=ui.annualSummary({ requiredOccurrences:1,windowStart:'2027-03-01',windowEnd:'2027-03-31' },[{ occurrenceNumber:1 }],1);
  assert.equal(one.requirement,'1 occurrence'); assert.equal(one.contents,'1 thème défini'); assert.equal(one.quoVadis,'1/1 préparée dans QUO VADIS');
  const many=ui.annualSummary({ requiredOccurrences:4,windowStart:'2027-03-01',windowEnd:'2027-11-30' },[{ occurrenceNumber:1 },{ occurrenceNumber:2 },{ occurrenceNumber:2 },{ occurrenceNumber:4 }],0);
  assert.equal(many.contents,'3 thèmes définis · 1 à préciser'); assert.equal(many.period,'mars – novembre');
});
test('03 variants stay internal until a canonical business model exists',() => {
  const activeRenderer=source.slice(source.indexOf('function renderAnnualCatalogActivity()'),source.indexOf('function renderQuoVadis()'));
  assert.doesNotMatch(source,/availableVariants/); assert.doesNotMatch(activeRenderer,/annual-variant-code/);
  assert.match(source,/variantCode: requirement && requirement\.variantCode \|\| 'DEFAULT'/);
});
test('04 technical activity code is absent from list cell',() => assert.doesNotMatch(source,/row\.label\)}<\/strong><small>\$\{escapeHtml\(row\.code\)/));
test('05 date fields describe a period and use neutral placeholders',() => {
  assert.match(source,/Début de période/); assert.match(source,/Fin de période/); assert.match(source,/placeholder="jj\/mm\/aaaa"/); assert.doesNotMatch(source,/24\/09\/2026/);
});
test('06 annual catalog domain order remains business-defined',() => assert.deepEqual([...DOMAIN_ORDER],['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']));
test('07 workflow vocabulary is MOA-facing',() => {
  for(const label of ['Enregistrer','Valider le besoin','Préparer dans QUO VADIS','Consulter la préparation']) assert(source.includes(label),label);
  assert.equal(ui.annualStatusLabel('DRAFT'),'En préparation'); assert.equal(ui.annualStatusLabel('READY'),'Prêt pour QUO VADIS');
});
test('08 themes stay occurrence-based and free themes remain available',() => {
  assert.match(source,/Occurrence \$\{occurrence\}/); assert.match(source,/Thème libre/); assert.match(source,/Ajouter un thème/); assert.match(source,/\(thème libre\)/); assert.match(source,/<details class="annual-theme-editor">/);
});
test('09 empty permanent sections remain conditional',() => assert.match(source,/requirementParts\.length \? `<section>/));
test('10 family FOCO is technical detail, not normal business frame',() => {
  const frame=source.slice(source.indexOf('<div class="annual-reference-grid">'),source.indexOf('${canManage ? `<details class="annual-internal">'));
  assert.doesNotMatch(frame,/Famille/); assert.match(source,/Famille technique/);
});
test('11 C10 uses open sections rather than nested catalog cards',() => {
  assert.match(css,/annual-activity-c10 \.annual-primary\{border:0;border-bottom:/); assert.doesNotMatch(css,/annual-qv-preparation\{background:/);
});
test('12 status convention remains eight-pixel square plus black text',() => {
  assert.match(css,/annual-status i\{width:8px;height:8px/); assert.match(css,/annual-status\{[^}]*color:#202830/);
});
test('13 responsive contracts cover all requested widths',() => ['1150','960','800'].forEach((width) => assert(css.includes(`max-width:${width}px`),width)));
test('14 list keeps exactly eight business columns',() => assert.match(source,/Domaine<\/th><th>Activité<\/th><th>Besoin \$\{[^}]+\}<\/th><th>Période<\/th><th>Contenus<\/th><th>État<\/th><th>Préparation QV<\/th><th>Action/));
test('15 preview pipeline is read-only and manual-review closed',() => {
  const rows=preview.parseSemicolonSource(read('tests/fixtures/scope-events-real-moa.csv')); const report=preview.buildPreview(rows,'fixture');
  assert.equal(report.mode,'READ_ONLY_PREVIEW'); assert.deepEqual(report.writes,[]); assert.deepEqual(report.seeds,[]); assert.deepEqual(report.collisions,[]);
  assert(report.proposals.some((row) => row.domain==='AUTO' && row.manualReviewRequired));
  assert(report.proposals.some((row) => row.domain==='FOBA' && row.manualReviewRequired));
});
test('16 operational boundaries and QV mirror remain untouched',() => {
  const changed=[source,css,read('assets/js/scope-ui-logic.js'),read('scripts/scope-annual-catalog-c10-preview.js')].join('\n');
  assert.doesNotMatch(changed,/(insert into|update|delete from)\s+(scope_evenements|scope_attendus|scope_participations)/i);
  assert.doesNotMatch(changed,/eventPublication\s*[:=]\s*true/);
});
test('17 readiness action follows the server decision and lifecycle',() => {
  assert.deepEqual(ui.annualReadyAction({ status:'DRAFT' },{ allowed:true }),{ visible:true,enabled:true,message:'' });
  assert.deepEqual(ui.annualReadyAction({ status:'DRAFT' },{ allowed:false,message:'Le public annuel doit encore être défini.' }),
    { visible:true,enabled:false,message:'Le public annuel doit encore être défini.' });
  for(const status of ['READY','SUPERSEDED','CANCELLED']) assert.deepEqual(ui.annualReadyAction({ status },{ allowed:true }),{ visible:false,enabled:false,message:'' });
  assert.match(source,/readyAction\.enabled \? '' : ' disabled'/);
});
test('18 compatible normalized forms are grouped without a false collision',() => {
  const report=preview.buildPreview([
    { source:'TEST',sourceId:'1',rawLabel:'Exercice DPS 1',domain:'DPS' },
    { source:'TEST',sourceId:'2',rawLabel:'Exercice DPS 2',domain:'DPS' }
  ],'compatible');
  assert.deepEqual(report.collisions,[]); assert.equal(report.groups[0].canonicalIdentity,'DPS-EXERCICE'); assert.equal(report.groups[0].sourceRows.length,2);
});
test('19 contradictory identities and domains produce review collisions',() => {
  const aliases=preview.buildPreview([
    { source:'TEST',sourceId:'1',rawLabel:'Exercice DPS',domain:'DPS',definitionCode:'DPS-EXERCICE' },
    { source:'TEST',sourceId:'2',rawLabel:'Exercice DPS',domain:'DAP',definitionCode:'DAP-EXERCICE' }
  ],'aliases');
  assert(aliases.collisions.some((row) => row.type==='NORMALIZED_ALIAS_CONFLICT' && row.reviewRequired && row.candidates.join(',')==='DAP-EXERCICE,DPS-EXERCICE'));
  const domain=preview.buildPreview([{ source:'TEST',sourceId:'3',rawLabel:'Exercice DPS',domain:'DAP',definitionCode:'DPS-EXERCICE' }],'domain');
  assert(domain.collisions.some((row) => row.type==='CANONICAL_CONTEXT_CONFLICT' && row.reviewRequired));
  assert.deepEqual(domain.writes,[]); assert.deepEqual(domain.seeds,[]);
});
test('20 collision output is deterministic',() => {
  const rows=[{ source:'TEST',sourceId:'1',rawLabel:'Exercice DPS',domain:'DPS',definitionCode:'DPS-EXERCICE' },{ source:'TEST',sourceId:'2',rawLabel:'Exercice DPS',domain:'DAP',definitionCode:'DAP-EXERCICE' }];
  assert.equal(JSON.stringify(preview.buildPreview(rows,'stable')),JSON.stringify(preview.buildPreview(rows,'stable')));
});
test('21 C10 text-action overrides stay confined to the annual catalog',() => {
  const c10=css.slice(css.indexOf('/* C8-B annual catalogue MOA workspace */'));
  assert.doesNotMatch(c10,/(^|})\.scope-text-action[{:]|(^|})\.scope-text-action:hover/);
  assert.match(c10,/\.annual-activity-c10 \.scope-text-action\{/);
  assert.match(c10,/\.annual-activity-c10 \.scope-text-action:hover\{[^}]*text-decoration:none/);
  assert.match(css,/\.scope-text-action:hover \{\s*text-decoration: underline;/);
});

(async()=>{ let passed=0; for(const item of tests){ try{ await item.fn(); passed++; process.stdout.write(`PASS ${item.name}\n`); }catch(error){ console.error(`FAIL ${item.name}\n${error.stack}`); process.exitCode=1; } } process.stdout.write(`C10 ${passed}/${tests.length} PASS\n`); })();
