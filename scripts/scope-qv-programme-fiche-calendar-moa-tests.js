'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const L = require('../assets/js/scope-ui-logic');
const { createFixture } = require('./scope-qv-local-fixture');
const { createCatalogUiHarness } = require('./scope-annual-catalog-ui-harness');

const references = () => structuredClone(require('./fixtures/scope-qv-business-references.json'));
const body = (row, extra = {}) => ({
  year:2027,date:String(row.startsAt || '').slice(0,10),
  startTime:String(row.startsAt || '').slice(11,16),endTime:String(row.endsAt || '').slice(11,16),
  status:'PLANIFIE',activityLabel:row.activityLabel || row.label,statCom:row.statCom,
  oiCodes:row.oiSelections || [],publicCodes:row.publics || [],...extra
});

test('PR-ABC reprend les OI 2026 sans effacer un événement publié ou une décision humaine', async () => {
  const fixture = createFixture(null);
  const id = 'QV26-EXERCICE-PR-ABC-75229C6D:O1:S1';
  const initial = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((row) => row.id === id);
  assert.deepEqual(initial.ois, []);
  assert.deepEqual(L.qvProgrammeConfirmedOiCodes(initial), []);
  const eventId = '00000000-0000-4000-8000-000000000001';
  const originalQuery = fixture.database.query;
  fixture.database.query = (sql, params) => /from scope_qv_publication_links l\s+join scope_evenements e/i.test(sql)
    ? Promise.resolve({ rows: [{ publication_unit_id:id, evenement_id:eventId, oi_codes:['B2'],
      libelle:'Exercice PR-ABC', date:'2027-04-20', heure_debut:'18:30', heure_fin:'21:30', statut:'PUBLIE', version:1 }] })
    : originalQuery(sql, params);
  const published = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((row) => row.id === id);
  assert.equal(published.publishedEventId, eventId);
  assert.deepEqual(published.ois, ['B2']);
  fixture.preparations.push({ obligation_id:'local-prabc-human', programme_id:'local-qv-2027', source_type:'MANUAL',
    source_ref:id, metadata:{ source:'QV_PROGRAMME_PREPARATION', humanDecision:true,
      planningFields:{ oiCodes:['C1'] } } });
  const decided = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((row) => row.id === id);
  assert.equal(decided.publishedEventId, eventId);
  assert.deepEqual(decided.ois, ['C1']);
});

test('PR-ABC reste enregistrable avec le public PABC et sans OI', async () => {
  const fixture = createFixture(null);
  const id = 'QV26-EXERCICE-PR-ABC-75229C6D:O1:S1';
  const row = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === id);
  const saved = await fixture.service.updateProgrammePreparation(id, body(row, { oiCodes:[], publicCodes:['PR:3'] }));
  assert.equal(saved.updated, true);
  const reread = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === id);
  assert.deepEqual(reread.ois, []);
  assert.deepEqual(reread.publics, ['PR:3']);
  assert.equal(reread.humanDecision, true);
});

test('010JSP, G1/État-major, Chef JSP et domaine préparatoire persistent ensemble', async () => {
  const refs = references();
  refs.statcoms.find((row) => row.code === '010JSP').valid_from = new Date(2023,0,1);
  const fixture = createFixture(null,{ references:refs });
  const before = await fixture.service.listProgramme(2027);
  const row = before.canonicalProgramme.rows.find((item) => item.id === 'qv-source-918');
  const lieu = refs.lieux.find((item) => item.code === 'G1-CASERNE');
  const salle = refs.salles.find((item) => item.code === 'G1-ETAT-MAJOR');
  assert.equal(salle.lieu_id,lieu.lieu_id);
  const saved = await fixture.service.updateProgrammePreparation(row.id,body(row,{
    domain:'F7',lieuId:lieu.lieu_id,salleTheorieId:salle.salle_id,responsableFonctionCode:'Chef JSP'
  }));
  assert.equal(saved.updated,true);
  const preparation = fixture.preparations.find((item) => item.source_ref === row.id);
  assert.equal(preparation.statcom_code,'010JSP');
  assert.equal(preparation.lieu_id,lieu.lieu_id);
  assert.equal(preparation.salle_theorie_id,salle.salle_id);
  assert.equal(preparation.responsable_fonction_code,'C JSP');
  assert.equal(preparation.metadata.humanDecision,true);
  assert.equal(preparation.metadata.planningFields.domain,'F7');
  assert.equal(preparation.domain,'JSP');
  const reread = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === row.id);
  assert.equal(reread.statCom,'010JSP');
  assert.equal(reread.lieuId,lieu.lieu_id);
  assert.equal(reread.salleTheorieId,salle.salle_id);
  assert.equal(reread.responsableFonctionCode,'C JSP');
  assert.equal(L.qvProgrammeFunctionalDomain(reread),'F7');
  assert.equal(reread.domain,'JSP');
  const jspGroup = L.qvResponsableGroups().flat();
  assert.equal(jspGroup.indexOf('Chef JSP') + 1,jspGroup.indexOf('Chef site JSP'));
});

test('date, heures et Stat.Com restent strictement validés', async () => {
  const fixture = createFixture(null);
  const row = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === 'qv-source-918');
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{date:'16.02.2027'})),/AAAA-MM-JJ/);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{startTime:'18:30 libre'})),/HH:MM/);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{endTime:'18:30'})),/doit suivre/);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{date:null})),/ensemble/);
  const refs = references();
  refs.statcoms.find((item) => item.code === '010JSP').valid_to = '2026-12-31';
  const invalid = createFixture(null,{references:refs});
  await assert.rejects(invalid.service.updateProgrammePreparation(row.id,body(row)),/référentiel canonique/);
});

test('Autre lieu réutilise une référence et refuse un doublon libre', async () => {
  const refs = references();
  const fixture = createFixture(null,{references:refs});
  const row = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === 'qv-source-918');
  const autre = refs.lieux.find((item) => item.code === 'G1-CASERNE');
  const saved = await fixture.service.updateProgrammePreparation(row.id,body(row,{lieuId:autre.lieu_id}));
  assert.equal(saved.updated,true);
  assert.equal(fixture.preparations[0].lieu_id,autre.lieu_id);
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{lieuLibre:'Caserne G1'})),/existe déjà/);
});

test('un lieu ponctuel reste hors référentiel; conserver crée puis réutilise la référence', async () => {
  const refs = references();
  const fixture = createFixture(null,{references:refs});
  const rows = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows;
  const first = rows.find((item) => item.id === 'qv-source-918');
  const second = rows.find((item) => item.id !== first.id && !item.external && !item.jspDirectionReconciliation);
  const initialCount = refs.lieux.length;
  await fixture.service.updateProgrammePreparation(first.id,body(first,{lieuLibre:'Salle des Tilleuls'}));
  assert.equal(refs.lieux.length,initialCount);
  await fixture.service.updateProgrammePreparation(first.id,body(first,{lieuLibre:'Salle des Tilleuls',keepLieuInReferential:true}));
  assert.equal(refs.lieux.length,initialCount + 1);
  const created = refs.lieux.at(-1);
  const preparation = fixture.preparations.find((item) => item.source_ref === first.id);
  assert.equal(preparation.lieu_id,created.lieu_id);
  assert.equal(preparation.lieu_libre,null);
  assert.equal(preparation.metadata.planningFields.lieuId,created.lieu_id);
  await fixture.service.updateProgrammePreparation(second.id,body(second,{lieuLibre:'Salle des Tilleuls',keepLieuInReferential:true}));
  assert.equal(refs.lieux.length,initialCount + 1);
  assert.equal(fixture.preparations.find((item) => item.source_ref === second.id).lieu_id,created.lieu_id);
});

test('SDIS ne peut pas être enregistré avec des OI individuels', async () => {
  const fixture = createFixture(null);
  const row = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((item) => item.id === 'qv-source-918');
  await assert.rejects(fixture.service.updateProgrammePreparation(row.id,body(row,{oiCodes:['SDIS','DPS:G1']})),/SDIS/);
  assert.equal(fixture.preparations.length,0);
});

test('À arbitrer exige une décision humaine explicite, indépendamment du statut de préparation', async () => {
  const fixture = createFixture(null);
  for(const [index,statut,needsArbitration] of [[1,'A_PLANIFIER',false],[2,'PROPOSE',false],[3,'PROPOSE',true]]){
    fixture.preparations.push({obligation_id:`decision-${index}`,programme_id:'local-qv-2027',source_type:'HISTORIQUE',
      source_ref:`historique-${index}`,title:`Activité ${index}`,domain:'F7',cible_codes:[],statut,
      metadata:{needsArbitration},include_in_programme:true});
  }
  const qv = await fixture.service.listProgramme(2027);
  assert.equal(qv.summary.aArbitrer,1);
  assert.equal(qv.activities.filter((row) => row.needsArbitration).length,1);
  assert.equal(qv.activities.find((row) => row.title === 'Activité 3').needsArbitration,true);
  assert.equal(L.qvNeedsArbitrationRow({status:'A_PLANIFIER'}),false);
  assert.equal(L.qvNeedsArbitrationRow({status:'PROPOSE'}),false);
  assert.equal(L.qvNeedsArbitrationRow({status:'PROPOSE',needsArbitration:true}),true);
});

test('PR 1/2/3 conservent les séances canoniques ordonnées, les horaires et les exceptions de journée', async () => {
  const rows = (await createFixture(null).service.listProgramme(2027)).canonicalProgramme.rows;
  for(const group of [1,2,3]){
    const series = rows.filter((row) => new RegExp(`^Exercice PR ${group}\\.[1-6]$`).test(row.eventDisplayLabel || ''))
      .sort((a,b) => a.startsAt.localeCompare(b.startsAt));
    assert.equal(series.length,6);
    assert.deepEqual(series.map((row) => row.eventDisplayLabel),Array.from({length:6},(_,index) => `Exercice PR ${group}.${index + 1}`));
    assert.ok(series.every((row) => [2,3,4].includes(new Date(`${row.startsAt.slice(0,10)}T12:00:00Z`).getUTCDay())));
    assert.ok(series.every((row) => row.endsAt.slice(11,16) === '21:30' || row.startsAt.slice(11,16) === '08:00'));
    if(group === 3) assert.ok(series.every((row) => row.startsAt.slice(11,16) === '18:30'));
    else {
      assert.equal(series.filter((row) => row.startsAt.slice(11,16) === '08:00').length,1);
      assert.ok(series.filter((row) => row.startsAt.slice(11,16) !== '08:00').every((row) => row.startsAt.slice(11,16) === '19:00'));
    }
  }
});

test('fiche Programme rend calendrier, heure, domaine, Stat.Com aligné et lieux Autres existants', async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  qv.rules = [{ ruleId:'rule-jsp-test',code:'PLANIF-JSP',versionCode:'2027',domain:'JSP',name:'Règle JSP',
    dayPolicyLabels:{Mardi:'Autorisé'},timePolicy:{usualStart:'18:30',usualEnd:'21:30'},
    durationMinutes:180,derogationAllowed:false,priority:1 }];
  qv.lieux.push({ lieuId:'lieu-test-autre',code:'HOTEL-VILLE',nomCourt:'Hôtel de Ville',actif:true });
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,
    session:{name:'Test',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  harness.context.location.hash = '#/quo-vadis/programme/qv-source-918';
  harness.hooks.render();
  const html = harness.root.innerHTML;
  assert.match(html,/id="qv-programme-date" type="text"[^>]*value="16\.02\.2027"/);
  assert.match(html,/id="qv-programme-date-picker" type="button"[^>]*aria-controls="qv-programme-calendar"/);
  assert.equal((html.match(/id="qv-programme-date"/g) || []).length,1);
  assert.match(html,/id="qv-programme-calendar"[^>]*hidden/);
  assert.match(html,/data-qv-calendar-date="2027-02-16"/);
  assert.match(html,/id="qv-programme-start" type="time" step="60"/);
  assert.match(html,/id="qv-programme-end" type="time" step="60"/);
  assert.match(html,/id="qv-programme-domain"/);
  assert.match(html,/>F3 Opérationnel<\/option>/);
  assert.match(html,/>F4 Logistique<\/option>/);
  assert.doesNotMatch(html,/F3 Prestations|F4 Matériel/);
  assert.match(html,/class="qv-programme-reference" open/);
  assert.match(html,/id="qv-programme-full-rule-content"[^>]*hidden[^>]*>[\s\S]*Règle JSP[\s\S]*PLANIF-JSP/);
  assert.equal((html.match(/id="qv-programme-save"/g) || []).length,1);
  assert.equal((html.match(/id="qv-programme-validate"/g) || []).length,1);
  const preparation = html.slice(html.indexOf('<section class="scope-card qv-programme-preparation">'));
  for(const labels of [['Activité','Thème'],['Date','Début','Fin','État de planification'],
    ['Stat.Com','Domaine','Famille','Responsable'],['OI','Lieu','Salle','Public cible']]){
    let previous = -1;
    for(const label of labels){
      const index = preparation.indexOf(`>${label}<`,previous + 1);
      assert.ok(index > previous,`${label} reste à sa place dans la grille`);
      previous = index;
    }
  }
  assert.ok(preparation.indexOf('Gestion de l’événement dans le planning') > preparation.indexOf('Public cible'));
  const statcom = html.match(/<select id="qv-programme-statcom">([\s\S]*?)<\/select>/)?.[1] || '';
  assert.match(statcom,/010JSP(?:&nbsp;)+Exercice JSP/);
  assert.doesNotMatch(statcom,/·/);
  assert.match(html,/id="qv-programme-autre"/);
  assert.match(html,/id="qv-programme-lieu-keep" type="checkbox"/);
  assert.match(html,/value="lieu-test-autre"[^>]*>Hôtel de Ville/);
  assert.ok(html.indexOf('>Chef JSP</option>') < html.indexOf('>Chef site JSP</option>'));
});

test('Programme, ancienne route agenda, Agenda annuel et Synthèse gardent la même source 2027', async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,quoVadisProgrammeMode:'mensuelle'});
  const first = qv.canonicalProgramme.rows.find((row) => row.startsAt?.startsWith('2027-01') && !row.external && !row.jspDirectionReconciliation);
  const itemLink = encodeURIComponent(first.id);
  harness.context.location.hash = '#/quo-vadis/programme?mode=mensuelle&mois=2027-01';
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/qv-programme-view/);
  assert.ok(harness.root.innerHTML.includes(itemLink));
  harness.context.location.hash = '#/quo-vadis/agenda?mois=2027-01';
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/qv-programme-view/);
  assert.ok(harness.root.innerHTML.includes(itemLink));
  assert.doesNotMatch(harness.root.innerHTML,/qv-agenda-view/);
  harness.context.location.hash = '#/quo-vadis/agenda-annuel?annee=2027';
  harness.hooks.render();
  assert.ok(harness.root.innerHTML.includes(`jour=${first.startsAt.slice(0,10)}`));
  assert.ok(harness.root.innerHTML.includes(first.activityLabel || first.label));
  harness.context.location.hash = '#/quo-vadis/synthese';
  harness.hooks.render();
  assert.match(harness.root.innerHTML,new RegExp(`<strong>${qv.canonicalProgramme.target.sessions}<\\/strong>\\s*<span class="qv-pilot-kpi-label">Séances consolidées`));
  assert.match(harness.root.innerHTML,/Références 2026/);
  assert.doesNotMatch(harness.root.innerHTML,/Dates proposées/);
});

test('tableau et mois conservent les identités, filtres et liens de fiche', async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state, { authChecking:false, needOkta:false,
    quoVadisProgrammePageSize:'all', quoVadisProgrammeMode:'tableau' });
  harness.hooks.state.quoVadisFilters.period = 'mois';
  harness.hooks.state.quoVadisFilters.month = '2027-02';
  harness.context.location.hash = '#/quo-vadis/programme?mois=2027-02';
  harness.hooks.render();
  const fiche = '#/quo-vadis/programme/qv-source-923';
  assert.ok(harness.root.innerHTML.includes(fiche));
  harness.hooks.state.quoVadisProgrammeMode = 'mensuelle';
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/qv-programme-monthly/);
  assert.ok(harness.root.innerHTML.includes(fiche));
  assert.match(harness.root.innerHTML,/data-qv-programme-month="2027-03"/);
  harness.hooks.state.quoVadisFilters.month = '2027-03';
  harness.context.location.hash = '#/quo-vadis/programme?mois=2027-03';
  harness.hooks.render();
  assert.doesNotMatch(harness.root.innerHTML,/href="#\/quo-vadis\/programme\/qv-source-923"/);
  assert.match(harness.root.innerHTML,/data-qv-programme-month="2027-02"/);
  harness.context.location.hash = fiche;
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/Rapport annuel/);
  harness.context.location.hash = '#/quo-vadis/programme?mois=2027-03';
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/qv-programme-monthly/);
});

test('Agenda annuel 2028 présente le programme et le bandeau 2028, sans compteur 2027 déguisé', async () => {
  const fixture = createFixture(null);
  const qv2027 = await fixture.service.listProgramme(2027);
  const qv2028 = await fixture.service.listProgramme(2028);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv2027);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,quoVadisYears:{2028:qv2028}});
  harness.context.location.hash = '#/quo-vadis/agenda-annuel?annee=2028';
  harness.hooks.render();
  const html = harness.root.innerHTML;
  assert.match(html,/QUO VADIS 2028/);
  assert.match(html,new RegExp(`Programme annuel <span>${qv2028.canonicalProgramme.target.sessions}<\\/span>`));
  assert.ok(html.includes(encodeURIComponent(qv2028.canonicalProgramme.rows.find((row) => row.startsAt?.startsWith('2028-01')).id)));
  assert.match(html,/Synthèse 2027/);
});

test('Alertes identifie les deux conflits Rapport annuel sans les confondre avec À arbitrer', async () => {
  const qv = await createFixture(null).service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false});
  harness.context.location.hash = '#/quo-vadis/alertes';
  harness.hooks.render();
  const html = harness.root.innerHTML;
  for(const alert of qv.alerts.filter((row) => row.programmeItemId)){
    assert.ok(html.includes(alert.title));
    assert.ok(html.includes(encodeURIComponent(alert.programmeItemId)));
    assert.ok(html.includes(alert.startsAt.slice(11,16)));
  }
  assert.match(html,/<th>OI<\/th><th>Public cible<\/th><th>Lieu<\/th><th>Problème<\/th>/);
  assert.match(html,/is-conflict/);
  assert.match(html,/Conflit détecté/);
  assert.equal(qv.alerts.filter((row) => row.programmeItemId).every((row) =>
    row.reasons.some((reason) => reason.includes('23.02.2027')) &&
    row.reasons.every((reason) => !reason.includes('2027-02-23'))),true);
  assert.doesNotMatch(html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0] || '',/<span class="scope-state-label">À arbitrer<\/span>/);
});

test('Direction JSP reste mensuelle, sans effacer la projection technique', async () => {
  const fixture = createFixture(null);
  const rows = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows;
  const series = rows.filter((row) => row.label === 'Séance Direction JSP');
  assert.equal(series.length,11);
  assert.deepEqual(series.filter((row) => !row.jspDirectionReconciliation).map((row) => row.startsAt.slice(0,10)),[
    '2027-01-13','2027-02-16','2027-03-10','2027-04-20','2027-05-28',
    '2027-06-22','2027-08-19','2027-09-22','2027-10-25','2027-11-24'
  ]);
  const duplicate = series.find((row) => row.startsAt.startsWith('2027-02-23'));
  assert.equal(duplicate.external,false);
  assert.equal(duplicate.jspDirectionReconciliation.status,'SUPERSEDED_BY_MONTHLY_EXPLICIT');
  assert.equal(duplicate.jspDirectionReconciliation.supersededBy,'qv-source-918');
});

test('Rapport annuel porte la priorité annuelle, réserve sa date et expose les conflits', async () => {
  const fixture = createFixture(null);
  const qv = await fixture.service.listProgramme(2027);
  const rows = qv.canonicalProgramme.rows;
  const annual = rows.find((row) => row.id === 'qv-source-923');
  assert.equal(annual.startsAt.slice(0,10),'2027-02-23');
  assert.equal(annual.statCom,'071F3');
  assert.equal(annual.annualReportRule.priority,'ABSOLUTE');
  assert.notEqual(annual.fixedDate,true);
  assert.equal(annual.annualReportConstraint.date,'2027-02-23');
  assert.equal(annual.annualReportConstraint.status,'PRIORITY_DATE');
  assert.notEqual(L.qvProgrammeDragLock(annual),'DATE_VERROUILLEE');
  const blocked = rows.filter((row) => row.annualReportConstraint?.status === 'BLOCKED_BY_ANNUAL_REPORT').map((row) => row.label).sort();
  assert.deepEqual(blocked,['Formation MEA 1.2','Séance COSEC']);
  assert.deepEqual(qv.alerts.filter((row) => row.programmeItemId).map((row) => row.title).sort(),blocked);
  const other = rows.find((row) => row.id === 'qv-source-918');
  await assert.rejects(fixture.service.updateProgrammePreparation(other.id,body(other,{date:'2027-02-23'})),/réservé au Rapport annuel/);
  assert.equal(fixture.preparations.length,0);
  assert.equal(fixture.queries.some((entry) => /(?:update|insert into) scope_evenements/i.test(entry.sql)),false);
});

test('déplacer le Rapport annuel transfère la contrainte et conserve les décisions existantes', async () => {
  const fixture = createFixture(null);
  const initial = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows;
  const annual = initial.find((row) => row.id === 'qv-source-923');
  const human = initial.find((row) => row.label === 'Formation opérateur VPC 1.1' && row.startsAt.startsWith('2027-03-04'));
  assert.ok(human);
  await fixture.service.updateProgrammePreparation(human.id,body(human));
  const saved = await fixture.service.updateProgrammePreparation(annual.id,body(annual,{date:'2027-03-04'}));
  assert.equal(saved.updated,true);
  const preparation = fixture.preparations.find((row) => row.source_ref === annual.id);
  assert.equal(preparation.metadata.humanDecision,true);
  assert.equal(preparation.metadata.planningFields.date,'2027-03-04');
  const after = await fixture.service.listProgramme(2027);
  const moved = after.canonicalProgramme.rows.find((row) => row.id === annual.id);
  assert.equal(moved.annualReportConstraint.date,'2027-03-04');
  assert.equal(moved.annualReportRule.priority,'ABSOLUTE');
  assert.equal(after.canonicalProgramme.rows.filter((row) => row.annualReportConstraint?.status === 'BLOCKED_BY_ANNUAL_REPORT'
    && row.startsAt.startsWith('2027-02-23')).length,0);
  const protectedConflict = after.canonicalProgramme.rows.find((row) => row.id === human.id);
  assert.equal(protectedConflict.startsAt.slice(0,16),human.startsAt.slice(0,16));
  assert.equal(protectedConflict.humanDecision,true);
  assert.equal(protectedConflict.annualReportConstraint.status,'BLOCKED_BY_ANNUAL_REPORT');
  assert.equal(protectedConflict.annualReportConstraint.resolution,'MANUAL_PROTECTED');
  assert.ok(after.alerts.some((row) => row.programmeItemId === human.id && row.type === 'Conflit'));
  assert.equal(after.canonicalProgramme.rows.find((row) => row.id === 'qv-source-918').startsAt,
    initial.find((row) => row.id === 'qv-source-918').startsAt);
  assert.equal(fixture.queries.some((entry) => /(?:update|insert into) scope_evenements/i.test(entry.sql)),false);
  const nextYear = await fixture.service.listProgramme(2028);
  assert.equal(nextYear.canonicalProgramme.rows.some((row) => row.annualReportRule),false);
});

test('la préparation RA ne déplace jamais son événement déjà publié', async () => {
  const fixture = createFixture(null);
  fixture.published.publication_unit_id = 'qv-source-923';
  fixture.published.date = '2027-03-04';
  const before = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((row) => row.id === 'qv-source-923');
  assert.equal(before.publishedEventDate,'2027-03-04');
  assert.equal(before.annualReportConstraint.publishedDateMismatch,true);
  assert.equal(before.annualReportConstraint.status,'PUBLICATION_UPDATE_REQUIRED');
  const qv = await fixture.service.listProgramme(2027);
  assert.ok(qv.alerts.some((row) =>
    row.programmeItemId === before.id && row.type === 'À vérifier'));
  const harness = createCatalogUiHarness();
  harness.hooks.renderQuoVadisProgrammeHtml(qv);
  Object.assign(harness.hooks.state,{authChecking:false,needOkta:false,
    session:{name:'Test',roles:['GESTIONNAIRE'],permissions:['references:manage']}});
  harness.context.location.hash = '#/quo-vadis/programme/qv-source-923';
  harness.hooks.render();
  assert.match(harness.root.innerHTML,/Publication à coordonner/);
  assert.match(harness.root.innerHTML,/mise à jour doit être coordonnée sur le même événement/);
  assert.match(harness.root.innerHTML,/href="#\/exercices\/local-published"/);
  const saved = await fixture.service.updateProgrammePreparation(before.id,body(before,{date:'2027-02-23'}));
  assert.equal(saved.updated,true);
  const after = (await fixture.service.listProgramme(2027)).canonicalProgramme.rows.find((row) => row.id === before.id);
  assert.equal(after.startsAt.slice(0,10),'2027-02-23');
  assert.equal(after.publishedEventDate,'2027-03-04');
  assert.equal(after.annualReportConstraint.publishedDateMismatch,true);
  assert.equal(after.publishedEventId,before.publishedEventId);
  assert.equal(fixture.published.date,'2027-03-04');
  assert.equal(fixture.queries.some((entry) => /(?:update|insert into) scope_evenements/i.test(entry.sql)),false);
});
