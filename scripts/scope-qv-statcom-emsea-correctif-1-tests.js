'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { rowsFromWorkbook } = require('../netlify/lib/_scope-annual-catalog-import');
const { initialStatComCodes } = require('../netlify/lib/_scope-statcom-referential');
const { DEFAULT_WORKBOOK } = require('./scope-annual-catalog-c15-diagnostic');
const { createFixture } = require('./scope-qv-local-fixture');
const { createCatalogUiHarness } = require('./scope-annual-catalog-ui-harness');

function body(row, extra = {}){
  return { year:2027,date:'2027-01-12',startTime:'18:00',endTime:'21:00',status:'PLANIFIE',
    activityLabel:row.label,statCom:'EMSEA',domain:'F0',oiCodes:['SDIS'],publicCodes:[],...extra };
}

async function existingEmseaFixture(){
  const fixture = createFixture(null);
  const row = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === 'qv-source-862');
  assert.ok(row);
  fixture.preparations.push({ obligation_id:'emsea-existing',programme_id:'local-qv-2027',source_type:'MANUAL',
    source_ref:row.id,title:row.label,domain:'INSTITUTIONNEL',cible_codes:[],statut:'PLANIFIE',
    statcom_code:'EMSEA',imposed_start_at:'2027-01-12T18:00',imposed_end_at:'2027-01-12T21:00',
    lieu_id:null,lieu_libre:null,salle_theorie_id:null,responsable_fonction_code:null,
    metadata:{ source:'QV_PROGRAMME_PREPARATION',canonicalProgrammeItemId:row.id,
      lineage:{ key:row.id,initialSource:'QUO VADIS 2026',initialSourceLine:862,initialOccurrence:row.id },
      planningFields:{ date:'2027-01-12',startTime:'18:00',endTime:'21:00',activityLabel:row.label,
        statCom:'EMSEA',domain:'F0',family:'',oiCodes:['SDIS'],publicCodes:[],themes:[] } } });
  return { fixture,row };
}

test('EMSEA reste un code source historique non résolu, sans alias inventé',() => {
  const rows = rowsFromWorkbook(fs.readFileSync(DEFAULT_WORKBOOK)).rows.filter((row) => row.sourceStatCom === 'EMSEA');
  assert.equal(rows.length,11);
  assert.deepEqual(rows.map((row) => row.sourceRow),[51,207,291,393,505,559,680,767,837,862,921]);
  assert.ok(rows.every((row) => row.activityLabel === 'Séance EM' && row.activityCode === 'ADMIN'
    && row.historicalDomain === 'F0' && row.historicalSubdomain === 'SDIS' && row.personnel === 'EM'));
  assert.equal(initialStatComCodes().some((row) => row.code === 'EMSEA'),false);
});

test('un nouveau code inconnu ou un changement explicite reste refusé',async () => {
  const fresh = createFixture(null);
  const row = (await fresh.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === 'qv-source-862');
  await assert.rejects(fresh.service.updateProgrammePreparation(row.id,body(row)),/référentiel canonique/);
  const { fixture } = await existingEmseaFixture();
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{statCom:'EMSEA2'})),/référentiel canonique/);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{validateBusiness:true})),/référentiel canonique/);
  assert.equal(fixture.preparations[0].statcom_code,'EMSEA');
});

test('un code canonique valide reste enregistrable',async () => {
  const { fixture,row } = await existingEmseaFixture();
  await fixture.service.updateProgrammePreparation(row.id,body(row,{statCom:'070F0'}));
  assert.equal(fixture.preparations[0].statcom_code,'070F0');
});

test('la fiche conserve EMSEA comme À contrôler',async () => {
  const { fixture,row } = await existingEmseaFixture();
  const qv = await fixture.service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,
    session:{name:'Test',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  harness.context.location.hash = `#/quo-vadis/programme/${row.id}`;
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/<option value="EMSEA" selected disabled>EMSEA(?:&nbsp;)+À contrôler<\/option>/);
});

test('date puis heure conservent le code historique et la même préparation',async () => {
  const { fixture,row } = await existingEmseaFixture();
  const before = structuredClone(fixture.preparations[0]);
  const publishedBefore = structuredClone(fixture.published);
  await fixture.service.updateProgrammePreparation(row.id,body(row,{date:'2027-01-13'}));
  assert.equal(fixture.preparations.length,1);
  assert.equal(fixture.preparations[0].obligation_id,before.obligation_id);
  assert.equal(fixture.preparations[0].imposed_start_at,'2027-01-13T18:00:00');
  await fixture.service.updateProgrammePreparation(row.id,body(row,{date:'2027-01-13',startTime:'18:30',endTime:'21:30'}));
  const after = fixture.preparations[0];
  assert.equal(after.imposed_start_at,'2027-01-13T18:30:00');
  assert.equal(after.imposed_end_at,'2027-01-13T21:30:00');
  for(const field of ['obligation_id','source_ref','title','domain','statcom_code','lieu_id','lieu_libre',
    'salle_theorie_id','responsable_fonction_code']) assert.deepEqual(after[field],before[field],field);
  assert.deepEqual(after.cible_codes,before.cible_codes);
  assert.deepEqual(after.metadata.lineage,before.metadata.lineage);
  assert.deepEqual(fixture.published,publishedBefore);
  assert.ok(!fixture.queries.some(({ sql }) => /^(update|insert into|delete from) scope_evenements\b/i.test(sql.trim())));
});
