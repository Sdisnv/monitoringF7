'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const { rowsFromWorkbook } = require('../netlify/lib/_scope-annual-catalog-import');
const { initialStatComCodes } = require('../netlify/lib/_scope-statcom-referential');
const { DEFAULT_WORKBOOK } = require('./scope-annual-catalog-c15-diagnostic');
const { createFixture } = require('./scope-qv-local-fixture');
const { createCatalogUiHarness } = require('./scope-annual-catalog-ui-harness');
const referenceSnapshot = require('./fixtures/scope-qv-business-references.json');

function emseaFixture(){
  const references = structuredClone(referenceSnapshot);
  references.statcoms.push(initialStatComCodes().find((row) => row.code === 'EMSEA'));
  return createFixture(null,{ references });
}

function body(row, extra = {}){
  return { year:2027,date:'2027-01-12',startTime:'18:00',endTime:'21:00',status:'PLANIFIE',
    activityLabel:row.label,statCom:'EMSEA',domain:'F0',oiCodes:['SDIS'],publicCodes:[],...extra };
}

async function existingEmseaFixture(){
  const fixture = emseaFixture();
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

test('EMSEA est canonique pour État-major, distinct de EXEC et soldé au forfait',() => {
  const rows = rowsFromWorkbook(fs.readFileSync(DEFAULT_WORKBOOK)).rows.filter((row) => row.sourceStatCom === 'EMSEA');
  assert.equal(rows.length,11);
  assert.deepEqual(rows.map((row) => row.sourceRow),[51,207,291,393,505,559,680,767,837,862,921]);
  assert.ok(rows.every((row) => row.activityLabel === 'Séance EM' && row.activityCode === 'ADMIN'
    && row.historicalDomain === 'F0' && row.historicalSubdomain === 'SDIS' && row.personnel === 'EM'));
  const emsea = initialStatComCodes().find((row) => row.code === 'EMSEA');
  assert.ok(emsea);
  assert.equal(emsea.valid_from,'2026-01-01');
  assert.equal(emsea.metadata.settlementMode,'FORFAIT');
  assert.equal(emsea.metadata.hourAccounting,false);
  assert.equal(emsea.metadata.notEquivalentTo,'EXEC');
  assert.equal(initialStatComCodes().some((row) => row.code === 'EXEC'),false);
});

test('EMSEA est accepté sans conversion, mais reste réservé aux séances État-major',async () => {
  const fresh = emseaFixture();
  const row = (await fresh.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === 'qv-source-862');
  await fresh.service.updateProgrammePreparation(row.id,body(row,{themes:['Ordre du jour']}));
  assert.equal(fresh.preparations[0].statcom_code,'EMSEA');
  assert.deepEqual(fresh.preparations[0].metadata.planningFields.themes,['Ordre du jour']);
  assert.equal(fresh.preparations[0].metadata.humanDecision,true);
  const { fixture } = await existingEmseaFixture();
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{statCom:'EMSEA2'})),/référentiel canonique/);
  const other = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.label.startsWith('Exercice PR 1'));
  await assert.rejects(fixture.service.updateProgrammePreparation(other.id,body(other,{domain:'F7'})),/réservé aux séances État-major/);
  assert.equal(fixture.preparations[0].statcom_code,'EMSEA');
});

test('un code canonique valide reste enregistrable',async () => {
  const fixture = emseaFixture();
  const row = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.label.startsWith('Exercice PR 1'));
  await fixture.service.updateProgrammePreparation(row.id,body(row,{statCom:'011PR',domain:'F7'}));
  assert.equal(fixture.preparations[0].statcom_code,'011PR');
});

test('la fiche affiche EMSEA canonique et le gabarit PR/DPS/État-major reste commun',async () => {
  const { fixture,row } = await existingEmseaFixture();
  const qv = await fixture.service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,
    session:{name:'Test',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  const cases = [
    qv.canonicalProgramme.rows.find((item) => item.label.startsWith('Exercice PR 1')),
    qv.canonicalProgramme.rows.find((item) => item.id === 'qv-source-852'),
    qv.canonicalProgramme.rows.find((item) => item.id === row.id)
  ];
  for(const item of cases){
    harness.context.location.hash = `#/quo-vadis/programme/${item.id}`;
    harness.hooks.render();
    const html = harness.root.innerHTML;
    for(const marker of ['qv-programme-fiche-head','qv-programme-info-grid','qv-programme-reference',
      'qv-programme-preparation','Informations de l’événement','Planification','Préparation QUO VADIS',
      'qv-programme-save','qv-programme-validate']) assert.ok(html.includes(marker),`${item.id}: ${marker}`);
    assert.equal((html.match(/class="qv-programme-info-panel"/g) || []).length,2,item.id);
    if(item.id === row.id){
      assert.match(html,/<option value="EMSEA" selected>EMSEA(?:&nbsp;)+Séance État-major \(forfait\)<\/option>/);
      assert.doesNotMatch(html,/EMSEA(?:&nbsp;)+À contrôler/);
      assert.doesNotMatch(html,/EXEC/);
    }
  }
  const published = { ...cases[1],publishedEventId:'linked-event-dps' };
  const publishedQv = { ...qv,canonicalProgramme:{ ...qv.canonicalProgramme,rows:qv.canonicalProgramme.rows.map((item) => item.id === published.id ? published : item) } };
  harness.hooks.renderQuoVadisProgrammeHtml(publishedQv);
  harness.context.location.hash = `#/quo-vadis/programme/${published.id}`;
  harness.hooks.render();
  const publishedHtml = harness.root.innerHTML;
  assert.match(publishedHtml,/class="qv-programme-workflow"/);
  assert.ok(publishedHtml.indexOf('qv-programme-workflow') < publishedHtml.indexOf('qv-programme-preparation'));
  assert.match(publishedHtml,/#\/exercices\/linked-event-dps/);
});

test('Enregistrer et valider conserve EMSEA et les modifications métier',async () => {
  const { fixture,row } = await existingEmseaFixture();
  const beforePublished = structuredClone(fixture.published);
  const lieu = referenceSnapshot.lieux.find((item) => item.code === 'G1-CASERNE');
  const salle = referenceSnapshot.salles.find((item) => item.code === 'G1-ETAT-MAJOR');
  await fixture.service.updateProgrammePreparation(row.id,body(row,{activityLabel:'Séance État-major - bilan',
    themes:['Bilan annuel'],date:'2027-01-13',startTime:'18:15',endTime:'21:15',
    responsableFonctionCode:'Quartier-maître',oiCodes:['DPS:G1'],publicCodes:['GEN:SAPEUR'],
    lieuId:lieu.lieu_id,salleTheorieId:salle.salle_id,validateBusiness:true}));
  const saved = fixture.preparations[0];
  assert.equal(saved.statcom_code,'EMSEA');
  assert.equal(saved.title,'Séance État-major - bilan');
  assert.deepEqual(saved.metadata.planningFields.themes,['Bilan annuel']);
  assert.equal(saved.imposed_start_at,'2027-01-13T18:15:00');
  assert.equal(saved.imposed_end_at,'2027-01-13T21:15:00');
  assert.equal(saved.metadata.planningFields.responsibleLabel,'Quartier-maître');
  assert.deepEqual(saved.metadata.planningFields.oiCodes,['DPS:G1']);
  assert.deepEqual(saved.metadata.planningFields.publicCodes,['GEN:SAPEUR']);
  assert.equal(saved.lieu_id,lieu.lieu_id);
  assert.equal(saved.salle_theorie_id,salle.salle_id);
  assert.equal(saved.metadata.businessValidation.year,2027);
  assert.equal(saved.metadata.humanDecision,true);
  assert.deepEqual(fixture.published,beforePublished);
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
