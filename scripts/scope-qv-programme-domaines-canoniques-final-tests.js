'use strict';

const assert = require('node:assert/strict');
const { createFixture } = require('./scope-qv-local-fixture');
const L = require('../assets/js/scope-ui-logic');

async function main(){
  const fixture = createFixture(null);
  const programme = await fixture.service.listProgramme(2027);
  const rows = programme.canonicalProgramme.rows.filter(row => !row.external);
  const byTitle = (title) => rows.filter(row => row.label === title);
  const hasDomain = (titles, domain) => {
    for(const title of titles){
      const matches = byTitle(title);
      assert.ok(matches.length, `${title} absent`);
      assert.ok(matches.every(row => row.domain === domain), `${title}: ${matches.map(row => row.domain)}`);
    }
  };
  let passed = 0;
  const test = (name, run) => { run(); passed++; console.log(`PASS ${name}`); };

  test('F0 gouvernance, hors recrutement NUOVO non prouve', () => {
    hasDomain(['Séance Codir','Séance État-major','Séance COSEC','Assemblée CI',
      'Séance CRDIS','Séance OSR','Séance interSDIS','Conférence des Commandants',
      'Table ouverte avec le Commandant'],'F0');
    assert.equal(byTitle('Test de sélection NUOVO')[0].domain,'DPS');
    assert.ok(byTitle('Recrutement cantonal').every(row => row.domain === 'DPS'));
  });
  test('F1 personnel et integration', () => hasDomain(['Séance chefs de section DPS',
    'Séance chefs de section DPS C1','Séance des chefs de section DAP',
    'Intégration personnel DPS, phase I','Intégration personnel DPS, phase II',
    'Intégration personnel DAP'],'F1'));
  test('F3 prestations internes et externes sans toucher aux Stat.Com', () => {
    hasDomain(['Journée des familles','Noël des familles','Repas du Permanent','Souper annuel',
      'Fête Eau Lac','Tir inter-unités','Passeport-Vacances','Préparation concours de la FVSP',
      'Séance de préparation concours de la FVSP','Séance de préparation Téléthon','Téléthon'],'F3');
    assert.equal(byTitle('Souper annuel')[0].statCom,'070F1');
    assert.equal(byTitle('Tir inter-unités')[0].statCom,'073F56');
  });
  test('F4 materiel, evenement equipement et photo unique', () => {
    hasDomain(['Nettoyage annuel caserne','Préparation Xmas','Séance Préposés mat DPS',
      'Vision locale DPS','Vision locale DAP','Séance responsables MAT SDIS',
      'Équipement personnel DPS + photo individuelle'],'F4');
    assert.equal(byTitle('Équipement personnel DPS + photo individuelle').length,1);
  });
  test('F6 SIC photographie et multi-OI independants du domaine', () => {
    hasDomain(['Séance communication F5/6','Séance audiovisuel et communication F5/6',
      'Séance cadres F5/6','Séance photo du personnel DPS','Séance photo du personnel DAP',
      'Séance photo personnel DPS B1',
      'Séance photo personnel DAP'],'F6');
    const communication = rows.find(row => row.id === 'qv-source-904');
    for(const oi of ['DPS:G1','DAP:Y1']) assert.ok(L.qvProgrammeConfirmedOiCodes(communication).includes(oi));
    const materiel = rows.find(row => row.id === 'qv-source-879');
    for(const oi of ['DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4'])
      assert.ok(L.qvProgrammeConfirmedOiCodes(materiel).includes(oi));
  });
  test('JSP conserve 010JSP; famille ne derive pas du site', () => {
    const jsp = byTitle("Séance d'information JSP '26")[0];
    assert.equal(jsp.domain,'JSP');
    assert.equal(jsp.statCom,'010JSP');
    assert.equal(L.qvProgrammeFamily({ domain:'DPS',family:'Événement' }),'Événement');
    assert.ok(!L.qvProgrammeDomainMatches({ domain:'DPS',family:'FOCO' },'FOCO'));
  });
  test('127 changements de domaine sans modification des cas soldes non verifies', () => {
    const changes = programme.canonicalProgramme.businessRules.institutionalDomains;
    assert.equal(changes.length,127);
    assert.ok(!changes.some(item => /NUOVO|Rapport annuel/.test(item.label)));
    assert.equal(byTitle('Rapport annuel')[0].domain,'F3');
    assert.equal(rows.length,850);
  });

  const selections = [
    byTitle('Séance Codir')[0],byTitle('Journée des familles')[0],
    byTitle('Vision locale DAP')[0],byTitle('Séance communication F5/6')[0]
  ];
  const year2027 = programme.programme.annee;
  for(const row of selections){
    await fixture.service.updateProgrammePreparation(row.id, { year:year2027,
      date:'2027-06-10',startTime:'18:00',endTime:'20:00',status:'PLANIFIE',
      activityLabel:row.label,statCom:row.statCom,oiCodes:row.oiSelections || [],
      publicCodes:row.publics || [],validateBusiness:true });
  }
  const next = await fixture.service.generateProgramme(2028);
  const carried2028 = selections.map(row => next.canonicalProgramme.rows.find(item => item.lineage?.key === row.id));
  test('2028 reprend F0 F3 F4 F6 des modeles valides', () => {
    assert.deepEqual(carried2028.map(row => row?.domain),['F0','F3','F4','F6']);
    assert.ok(carried2028.every(row => row.persistenceDomain === 'INSTITUTIONNEL'));
  });
  for(const row of carried2028){
    await fixture.service.updateProgrammePreparation(row.id, { year:2028,
      date:'2028-06-10',startTime:'18:00',endTime:'20:00',status:'PLANIFIE',
      activityLabel:row.label,statCom:row.statCom,oiCodes:row.ois || [],
      publicCodes:row.publics || [],validateBusiness:true });
  }
  const final = await fixture.service.generateProgramme(2029);
  test('2029 reconduit les memes domaines sans regle liee a 2027', () => {
    const carried2029 = carried2028.map(row => final.canonicalProgramme.rows.find(item => item.lineage?.key === row.lineage.key));
    assert.deepEqual(carried2029.map(row => row?.domain),['F0','F3','F4','F6']);
  });
  console.log(`${passed}/${passed} tests PASS`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
