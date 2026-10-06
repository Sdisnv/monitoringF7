'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const L = require('../assets/js/scope-ui-logic');
const { readWorkbook } = require('./scope-qv-business-audit');
const { createFixture } = require('./scope-qv-local-fixture');

const workbookPath = '/Users/thierrygrunig/Documents/Professionel/SDIS Nord vaudois/3-Opérationnel/3.0 Organisation/2026/2026 QUO VADIS SDIS Nord vaudois.xlsx';
const workbook = readWorkbook(workbookPath);
const historical = require('../netlify/lib/data/scope-qv-history-2026.json');
const ui = fs.readFileSync(require.resolve('../assets/js/scope-ui'), 'utf8');
const extract = (name) => {
  const start = ui.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, `${name} absent`);
  const end = ui.indexOf('\n  function ', start + 1);
  return ui.slice(start, end < 0 ? undefined : end);
};
let passed = 0;
async function test(name, run) {
  await run();
  passed += 1;
  console.log(`PASS ${name}`);
}

async function main() {
  const rows = (await createFixture(null).service.listProgramme(2027)).canonicalProgramme.rows.filter(row => !row.external);
  const byId = new Map(rows.map(row => [row.id, row]));
  const source = new Map(workbook.rows.map(row => [row.sourceLine, row]));
  const filterContext = { L, state: { quoVadisFilters: {} }, qvProgrammeVisualState: () => ({ label:'Validé', tone:'positive' }),
    qvProgrammeFamily:L.qvProgrammeFamily, qvProgrammeDate:row => String(row.startsAt || '').slice(0,10),
    qvProgrammeEventCodeLabel:() => '', qvProgrammePublicLabel:() => '', qvProgrammeProvenance:() => '',
    qvProgrammeCompareRows:() => 0 };
  vm.createContext(filterContext);
  vm.runInContext(extract('qvProgrammePublicCodes') + extract('qvNormalizeSearch') + extract('qvProgrammeFilteredRows'), filterContext);
  const filter = (oi, domain, candidates = rows) => {
    filterContext.state.quoVadisFilters = { oi, domain };
    return Array.from(filterContext.qvProgrammeFilteredRows({ canonicalProgramme:{ rows:candidates } }));
  };

  await test('classeur 2026 direct et projection historique identiques', () => {
    assert.equal(workbook.sha256, '58ef7c358e44cd7ddc0d6ecbf6a386b06df2029f000a8c12b041538e72066742');
    assert.equal(workbook.sha256, historical.sha256);
    assert.deepEqual(workbook.rows, historical.rows);
    assert.equal(workbook.rows.length, 919);
  });
  await test('programme 2027 porte 850 seances et conserve les identites source', () => {
    assert.equal(rows.length, 850);
    for (const line of [863, 865, 869, 878, 879, 880, 904, 923]) assert.ok(byId.has(`qv-source-${line}`));
    assert.equal(byId.get('qv-source-904').startsAt, '2027-02-03T18:00');
  });
  await test('OI pur DPS:G1 sans DAP:Y1', () => {
    const row = byId.get('qv-source-906');
    assert.ok(row);
    assert.ok(filter('DPS:G1', 'tous', [row]).includes(row));
    assert.ok(!filter('DAP:Y1', 'tous', [row]).includes(row));
  });
  await test('communication F6 G1 et Y1 par deux filtres OI et son domaine', () => {
    const row = byId.get('qv-source-904');
    assert.equal(source.get(904).domainF7, 'F5/6');
    assert.deepEqual(source.get(904).ois, ['G1','Y1']);
    assert.equal(row.domain, 'F6');
    assert.ok(filter('DPS:G1', 'F6', [row]).includes(row));
    assert.ok(filter('DAP:Y1', 'F6', [row]).includes(row));
    assert.ok(!filter('DAP:Y2', 'F6', [row]).includes(row));
  });
  await test('materiel SDIS reste F4 et ressort sous chacun des huit OI', () => {
    const row = byId.get('qv-source-879');
    assert.equal(source.get(879).domainF7, 'F4');
    assert.equal(row.domain, 'F4');
    for (const oi of ['DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4']) {
      assert.ok(filter(oi, 'F4', [row]).includes(row), oi);
    }
  });
  await test('G1 explicite sous DAP devient DPS:G1 sans deduction depuis DAP', () => {
    const row = byId.get('qv-source-880');
    assert.ok(source.get(880).ois.includes('G1'));
    assert.ok(row.oiSelections.includes('DPS:G1'));
    assert.ok(filter('DPS:G1', 'F1/8', [row]).includes(row));
    assert.equal(L.qvNormalizeOiSelections({ domain:'DAP' }, ['G1']).status, 'NORMALIZED');
  });
  await test('aucune cellule OI utilisateur ne contient texte technique ou point-virgule', () => {
    const context = { L, escapeHtml:String, qvProgrammeCtaLines:() => [] };
    vm.createContext(context);
    vm.runInContext(extract('qvProgrammeOiHtml'), context);
    for (const row of rows) {
      const html = context.qvProgrammeOiHtml(row);
      assert.doesNotMatch(html, /À qualifier\s*:|;/, row.id);
    }
    assert.equal(L.qvProgrammeOiLabel(byId.get('qv-source-880')), 'G1, Y1, Y2, Y3, Y4');
  });
  await test('filtre Domaine prepare les codes institutionnels et le filtre OI reste canonique', () => {
    const context = { L, escapeHtml:String, state:{ quoVadisFilters:{} }, qvProgrammeFamily:L.qvProgrammeFamily,
      qvProgrammeVisualState:() => ({ label:'Validé' }), qvProgrammeYearChoices:() => [2027], qvProgrammeYear:() => 2027,
      qvProgrammeMonthChoices:() => [],
      qvCockpitIcon:() => '', qvProgrammePublicCodeLabel:String,
      qvFilterOptions:(values,getter) => [...new Set(values.map(getter).filter(Boolean))] };
    vm.createContext(context);
    vm.runInContext(extract('qvProgrammeLieuCatalogue') + extract('qvCanonicalLieuLabel') + extract('qvProgrammePublicCodes') + extract('qvProgrammePublicFilterOptions') + extract('qvProgrammeFilterBar'), context);
    const html = context.qvProgrammeFilterBar({ canonicalProgramme:{ rows },statComCodes:[{code:'070F56',label:'Séance communication F5/6'}] });
    for(const code of ['F0','F1','F2','F3','F4','F5','F6','F7','F8']) {
      assert.ok(html.includes(`<option value="${code}"`), code);
    }
    assert.ok(!html.includes('<option value="Gouvernance"'));
    assert.ok(html.includes('F0 Gouvernance'));
    assert.ok(html.includes('F1 Personnel'));
    assert.ok(html.includes('F4 Matériel'));
    assert.ok(html.includes('F8 Finances'));
    assert.ok(html.includes('<option class="qv-oi-parent" value="DPS"'));
    assert.ok(html.includes('<option class="qv-oi-child" value="DPS:G1"'));
    assert.ok(html.includes('<option class="qv-oi-parent" value="DAP"'));
    assert.ok(html.includes('<option class="qv-oi-child" value="DAP:Y1"'));
    assert.ok(html.includes('value="DPS:G1" >&nbsp;&nbsp;&nbsp;G1</option>'));
    assert.ok(html.includes('value="DAP:Y1" >&nbsp;&nbsp;&nbsp;Y1</option>'));
    assert.ok(html.includes('<option value="SDIS-ALL"'));
    assert.ok(html.includes('<optgroup label="DPS"><option value="Caserne'));
    assert.ok(html.includes('<optgroup label="DAP"><option value="Local'));
    assert.ok(!html.includes('>L-G1</option>'));
    assert.ok(html.includes('class="qv-statcom-code">070F56</span><span class="qv-statcom-label">Séance communication F5/6'));
    assert.ok(html.indexOf('<option value="FOSPEC"') < html.indexOf('<option value="AUTO"'));
    assert.ok(!html.includes('Conduite / PR'));
  });
  await test('periode affiche le mois sans repeter l annee de la page', () => {
    const context = { qvProgrammeYear:() => 2028,
      qvMonthChoices:() => [{value:'2028-01',label:'Janvier 2028'}] };
    vm.createContext(context);
    vm.runInContext(extract('qvProgrammeMonthChoices'), context);
    assert.equal(context.qvProgrammeMonthChoices()[0].label,'Janvier');
  });
  await test('Fourriers et echelons historiques preserves, rapport annuel inchange en attente du solde', () => {
    assert.equal(source.get(878).domainF7, 'F1/8');
    assert.equal(source.get(880).domainF7, 'F1/8');
    assert.equal(byId.get('qv-source-878').domain, 'F1/8');
    assert.equal(byId.get('qv-source-880').domain, 'F1/8');
    assert.equal(byId.get('qv-source-865').domain, 'F1/8');
    assert.deepEqual(byId.get('qv-source-865').publics, ['ECH:II','ECH:III','ECH:IV']);
    assert.equal(source.get(923).domainF7, 'F3');
    assert.equal(byId.get('qv-source-923').domain, 'F3');
    assert.equal(byId.get('qv-source-923').target, 'SDIS-ALL');
    assert.deepEqual(byId.get('qv-source-923').publics, []);
    const context = { L };
    vm.createContext(context);
    vm.runInContext(extract('qvProgrammePublicLabel'), context);
    assert.equal(context.qvProgrammePublicLabel(byId.get('qv-source-923')), 'SDIS (tous)');
    filterContext.state.quoVadisFilters = { cible:'SDIS-ALL' };
    assert.ok(Array.from(filterContext.qvProgrammeFilteredRows({ canonicalProgramme:{ rows:[byId.get('qv-source-923')] } })).length === 1);
  });
  await test('les classifications non arbitrees ne sont pas deduites en masse', () => {
    assert.equal(source.get(859).domainF7, 'F2/3');
    assert.equal(byId.get('qv-source-859').domain, 'DPS');
    assert.equal(source.get(871).domainF7, 'F1/8');
    assert.equal(byId.get('qv-source-871').domain, 'DPS');
  });
  await test('domaine fonctionnel affiche, domaine technique institutionnel sauvegarde', async () => {
    const fixture = createFixture(null);
    const row = byId.get('qv-source-904');
    const updated = await fixture.service.updateProgrammePreparation(row.id, { year:2027, date:'2027-02-03', startTime:'18:00', endTime:'20:00',
      status:'PLANIFIE', activityLabel:row.activityLabel, statCom:row.statCom, oiCodes:row.oiSelections, publicCodes:[] });
    assert.equal(fixture.preparations.length, 1);
    assert.equal(fixture.preparations[0].domain, 'INSTITUTIONNEL');
    assert.equal(fixture.preparations[0].metadata.planningFields.domain, 'F6');
    assert.deepEqual(fixture.preparations[0].metadata.planningFields.oiCodes, ['DPS:G1','DAP:Y1']);
    const presented = updated.quoVadis.canonicalProgramme.rows.find(item => item.id === row.id);
    assert.equal(presented.domain, 'F6');
    assert.deepEqual(presented.oiSelections, ['DPS:G1','DAP:Y1']);
  });
  await test('reconduction validee garde F6 sans ecrire un domaine SQL inconnu', async () => {
    const fixture = createFixture(null);
    const row = byId.get('qv-source-904');
    await fixture.service.updateProgrammePreparation(row.id, { year:2027, date:'2027-02-03', startTime:'18:00', endTime:'20:00',
      status:'PLANIFIE', activityLabel:row.activityLabel, statCom:row.statCom, oiCodes:row.oiSelections, publicCodes:[], validateBusiness:true });
    const future = await fixture.service.generateProgramme(2028);
    const carried = future.canonicalProgramme.rows.find(item => item.lineage && item.lineage.key === row.id);
    assert.ok(carried);
    assert.equal(carried.domain, 'F6');
    assert.equal(carried.persistenceDomain, 'INSTITUTIONNEL');
    assert.equal(fixture.preparations.find(item => item.programme_id === 'local-qv-2028' && item.metadata.lineage?.key === row.id).domain, 'INSTITUTIONNEL');
  });
  console.log(`${passed}/${passed} tests PASS`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
