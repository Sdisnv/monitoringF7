'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const cta = require('../netlify/lib/_scope-cta-rules');
const L = require('../assets/js/scope-ui-logic');
const consolidation = require('../netlify/lib/_scope-quo-vadis-consolidation');
const {createFixture} = require('./scope-qv-local-fixture');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');
const refs = require('./fixtures/scope-qv-business-references.json');
let passed = 0;
async function test(name,fn){await fn();console.log(`PASS ${++passed} - ${name}`);}

async function main(){
  await test('aucune permanence avant le 13.02.2026, y compris projection erronée existante',()=>{
    for(const date of ['2025-12-26','2026-01-02','2026-02-06']) assert.deepEqual(cta.assignmentsForFriday(date),[]);
    const projection = cta.applyCtaRules([{id:'CTA-PERM-2026-01-02',definitionId:'CTA-PERMANENCE',startsAt:'2026-01-02T18:00',endsAt:'2026-01-05T06:00'},
      {id:'real',kind:'SCOPE_EVENT',startsAt:'2026-01-02T18:00',endsAt:'2026-01-05T06:00'}],2026);
    assert.ok(!projection.rows.some(row=>row.definitionId==='CTA-PERMANENCE'));
    assert.ok(projection.rows.some(row=>row.id==='real'));
  });
  await test('premier intervalle et groupes exactement MOA',()=>{
    const first = cta.generateYear(2026).rows[0];
    assert.equal(first.startsAt,'2026-02-13T18:00');assert.equal(first.endsAt,'2026-02-16T06:00');
    assert.deepEqual(first.ctaAssignments.map(row=>row.halfSection),['N05a','N01a','N01a','N01a']);
  });
  await test('47/53/53 fenêtres couvrantes, aucun redémarrage annuel',()=>{
    for(const [year,count] of [[2026,47],[2027,53],[2028,53]]) assert.equal(cta.generateYear(year).rows.length,count);
    for(const [year,date] of [[2026,'2027-01-01'],[2027,'2027-12-31']]){
      const a=cta.generateYear(year).rows.find(row=>row.id===`CTA-PERM-${date}`);
      const b=cta.generateYear(year+1).rows.find(row=>row.id===`CTA-PERM-${date}`);
      assert.deepEqual(a,b);
    }
  });
  const fixture = createFixture();
  const initial = await fixture.service.listProgramme(2027);
  const rows = initial.canonicalProgramme.rows.filter(row=>!row.external);
  const source = rows.find(row=>row.domain==='DPS' && row.definitionId!=='CTA-PERMANENCE' && !row.publishedEventId && rows.some(other=>other.id!==row.id && other.definitionId===row.definitionId));
  const sibling = rows.find(row=>row.id!==source.id && row.definitionId===source.definitionId);
  const locationG1 = refs.lieux.find(row=>row.oi_code==='G1');
  const locationC1 = refs.lieux.find(row=>row.oi_code==='C1');
  const roomG1 = refs.salles.find(row=>row.code==='G1-JURA');
  const roomC1 = refs.salles.find(row=>row.lieu_id===locationC1.lieu_id);
  const payload = {activityLabel:'Instruction de section - version validée',statCom:'012G1',date:'2027-03-11',startTime:'19:00',endTime:'21:30',
    oiCodes:['DPS:G1','JSP:C1'],publicCodes:['N03a','AUTO:CAND-EA'],lieuId:locationG1.lieu_id,salleTheorieId:roomG1.salle_id,
    responsableFonctionCode:'Chef OP',validateBusiness:true};
  const saved = await fixture.service.updateProgrammePreparation(source.id,payload);
  const current = saved.quoVadis.canonicalProgramme.rows.find(row=>row.id===source.id);
  await test('activité, Stat.Com et OI atomiques persistés',()=>{
    assert.equal(current.activityLabel,payload.activityLabel);assert.equal(current.eventDisplayLabel,payload.activityLabel);
    assert.equal(current.statCom,payload.statCom);assert.deepEqual(current.oiSelections,payload.oiCodes);
    assert.deepEqual(current.publics,payload.publicCodes);
  });
  await test('provenance distingue modifications et simples confirmations',()=>{
    assert.ok(current.businessValidation.changedFields.includes('activityLabel'));
    assert.ok(current.businessValidation.changedFields.includes('statCom'));
    assert.ok(!current.businessValidation.changedFields.includes('domain'));
    assert.ok(!current.businessValidation.changedFields.includes('family'));
    assert.ok(!current.businessValidation.changedFields.includes('sessionStructure'));
  });
  await test('salle canonique et lieu canonique persistés',()=>{
    assert.equal(current.lieuId,locationG1.lieu_id);assert.equal(current.salleTheorieId,roomG1.salle_id);
  });
  await test('etat propose persiste et transitions incompatibles refusees',async()=>{
    const isolated=createFixture();
    const proposed={...payload,date:null,startTime:null,endTime:null,status:'PROPOSE',validateBusiness:false};
    const result=await isolated.service.updateProgrammePreparation(source.id,proposed);
    assert.equal(result.quoVadis.canonicalProgramme.rows.find(row=>row.id===source.id).status,'PROPOSE');
    assert.equal((await isolated.service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.id===source.id).status,'PROPOSE');
    await assert.rejects(isolated.service.updateProgrammePreparation(source.id,{...proposed,status:'PLANIFIE'}),/incompatible avec la date/);
    await assert.rejects(isolated.service.updateProgrammePreparation(source.id,{...payload,status:'A_PLANIFIER'}),/incompatible avec la date/);
  });
  await test('prévisualisation 2028 répétable sans écriture',async()=>{
    const before=JSON.stringify({preparations:fixture.preparations,programmes:fixture.programmes,proposals:fixture.proposals});
    const first=await fixture.service.previewProgramme(2028);
    const second=await fixture.service.previewProgramme(2028);
    assert.equal(first.dryRun,true);
    assert.equal(first.sourceYear,2027);
    assert.equal(first.targetYear,2028);
    assert.deepEqual(first.quoVadis.canonicalProgramme.rows,second.quoVadis.canonicalProgramme.rows);
    assert.ok(first.quoVadis.canonicalProgramme.rows.some(row=>row.activityLabel===payload.activityLabel));
    assert.equal(JSON.stringify({preparations:fixture.preparations,programmes:fixture.programmes,proposals:fixture.proposals}),before);
  });
  await test('autres occurrences indépendantes inchangées',()=>{
    assert.ok(sibling,'une occurrence indépendante doit exister');
    assert.deepEqual(saved.quoVadis.canonicalProgramme.rows.find(row=>row.id===sibling.id),sibling);
  });
  await test('Stat.Com inconnu rejeté et absence légitime acceptée',async()=>{
    await assert.rejects(fixture.service.updateProgrammePreparation(source.id,{...payload,statCom:'FAUX'}),error=>error.code==='programme_statcom_invalide' || error.message.includes('référentiel'));
    const none=await fixture.service.updateProgrammePreparation(source.id,{...payload,statCom:'',validateBusiness:false});
    assert.equal(none.quoVadis.canonicalProgramme.rows.find(row=>row.id===source.id).statCom,'');
  });
  await test('salle incompatible rejetée, absence de salle acceptée',async()=>{
    await assert.rejects(fixture.service.updateProgrammePreparation(source.id,{...payload,lieuId:locationC1.lieu_id}),/correspond pas au lieu/);
    const none=await fixture.service.updateProgrammePreparation(source.id,{...payload,salleTheorieId:null,validateBusiness:false});
    assert.equal(none.quoVadis.canonicalProgramme.rows.find(row=>row.id===source.id).salleTheorieId,null);
  });
  await test('alias caserne résolu par le vrai lieu UUID',async()=>{
    const alias=await fixture.service.updateProgrammePreparation(source.id,{...payload,lieuId:'caserne-g1'});
    assert.equal(alias.quoVadis.canonicalProgramme.rows.find(row=>row.id===source.id).lieuId,locationG1.lieu_id);
  });
  for(const site of ['G1','C1','B1']) await test(`DPS:${site} et JSP:${site} distincts sans perte`,()=>{
    const normalized=L.qvNormalizeOiSelections({domain:'DPS'},[`DPS:${site}`,`JSP:${site}`]);
    assert.deepEqual(normalized.codes,[`DPS:${site}`,`JSP:${site}`]);
    assert.equal(L.qvFormatOiSelections(normalized.codes), `${site} ; JSP ${site}`);
  });
  await test('anciennes valeurs qualifiées selon contexte, ambiguës conservées',()=>{
    assert.deepEqual(L.qvNormalizeOiSelections({domain:'DPS'},['G1','C1']).codes,['DPS:G1','DPS:C1']);
    assert.deepEqual(L.qvNormalizeOiSelections({domain:'JSP'},['G1','C1']).codes,['JSP:G1','JSP:C1']);
    // MOA 02.10.2026 : G1/C1/B1/B2 sont les casernes DPS du référentiel, donc déterminées hors domaine DPS aussi.
    assert.deepEqual(L.qvNormalizeOiSelections({domain:'AUTO'},['G1']).codes,['DPS:G1']);
    assert.equal(L.qvNormalizeOiSelections({domain:'AUTO'},['G1']).status,'NORMALIZED');
    assert.equal(L.qvFormatOiSelections(L.qvNormalizeOiSelections({domain:'AUTO'},['G1']).codes),'G1');
    // Une ambiguïté réelle reste visible : G1 n'est pas un site DAP du référentiel (DAP = Y1..Y4).
    assert.equal(L.qvNormalizeOiSelections({domain:'DAP'},['G1']).status,'AMBIGUOUS');
    assert.deepEqual(L.qvNormalizeOiSelections({domain:'DAP'},['G1']).codes,['G1']);
    assert.equal(L.qvNormalizeOiSelections({domain:'AUTO'},['Z9']).status,'AMBIGUOUS');
  });
  await test('validation métier refuse un OI historique non qualifié',async()=>{
    const ambiguous=rows.find(row=>row.ambiguousOis.includes('G1'));
    await assert.rejects(fixture.service.updateProgrammePreparation(ambiguous.id,{...payload,oiCodes:['G1'],statCom:''}),/Qualifier les anciens OI/);
  });
  await test('Candidats machiniste EA atomique distinct de Machiniste EA',()=>{
    assert.equal(L.qvProgrammePublicLabel('AUTO:CAND-EA'),'Candidats machiniste EA');
    assert.equal(L.qvProgrammePublicLabel('AUTO:5'),'Machiniste EA');
    assert.equal(L.qvProgrammePublicCatalogue()[0].group,'Général');
  });
  await fixture.service.updateProgrammePreparation(source.id,payload);
  await test('recalcul de N conserve les corrections validées et les occurrences indépendantes',async()=>{
    const sameYear=await fixture.service.generateProgramme(2027);
    const kept=sameYear.canonicalProgramme.rows.find(row=>row.id===source.id);
    assert.equal(kept.activityLabel,payload.activityLabel);assert.equal(kept.statCom,payload.statCom);
    assert.deepEqual(sameYear.canonicalProgramme.rows.find(row=>row.id===sibling.id),sibling);
  });
  await test('rechargement depuis une nouvelle instance du vrai service',async()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qv-business-'));const file=path.join(dir,'preparations.json');
    try{
      await createFixture(file).service.updateProgrammePreparation(source.id,payload);
      const reload=(await createFixture(file).service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.id===source.id);
      assert.equal(reload.activityLabel,payload.activityLabel);assert.equal(reload.statCom,payload.statCom);
      assert.equal(reload.salleTheorieId,roomG1.salle_id);assert.deepEqual(reload.oiSelections,payload.oiCodes);
      assert.deepEqual(reload.businessValidation.fields.publicCodes,payload.publicCodes);
    } finally {fs.rmSync(dir,{recursive:true});}
  });
  const generated=await fixture.service.generateProgramme(2028);
  const next=generated.canonicalProgramme.rows.find(row=>row.lineage && row.lineage.key===source.id);
  await test('API annuelle conserve les prolongations CTA à la frontière de janvier suivant',()=>{
    const expected=cta.generateYear(2028).rows.at(-1);
    const actual=generated.canonicalProgramme.rows.find(row=>row.id===expected.id);
    assert.equal(actual.startsAt,expected.startsAt);assert.equal(actual.endsAt,'2029-01-02T06:00');
  });
  await test('N+1 reprend dernière version validée libellé, Stat.Com, OI, public, responsable, lieu, salle',()=>{
    assert.ok(next);assert.equal(next.activityLabel,payload.activityLabel);assert.equal(next.statCom,payload.statCom);
    assert.deepEqual(next.oiSelections,payload.oiCodes);assert.deepEqual(next.publics,payload.publicCodes);
    assert.equal(next.responsible,'Chef OP');assert.equal(next.lieuId,locationG1.lieu_id);assert.equal(next.salleTheorieId,roomG1.salle_id);
  });
  await test('date, workflow, validation annuelle, présences non copiés',()=>{
    const obligation=generated.obligations.find(row=>row.metadata.lineage && row.metadata.lineage.key===source.id);
    assert.equal(obligation.imposedStartAt,null);assert.equal(obligation.statut,'A_PLANIFIER');
    for(const key of ['date','startTime','endTime','statut','lifecycleDecision','participants','presences','excuses']) assert.ok(!(key in obligation.metadata.reconductedBusiness));
    assert.ok(!obligation.metadata.businessValidation);assert.ok(!obligation.metadata.humanDecision);
    assert.ok(!next.startsAt || next.startsAt.startsWith('2028-'));assert.notEqual(next.startsAt,current.startsAt);
  });
  await test('filiation précise et structure de session conservées sans multiplication',()=>{
    assert.equal(next.lineage.parentYear,2027);assert.equal(next.lineage.parentOccurrence,source.id);
    assert.equal(next.lineage.initialOccurrence,source.id);assert.ok(next.lineage.referenceValidatedAt);
    const obligation=generated.obligations.find(row=>row.metadata.lineage && row.metadata.lineage.key===source.id);
    assert.equal(fixture.proposals.filter(row=>row.obligation_id===obligation.obligationId).length,1);
  });
  await test('brouillon N ultérieur non validé ne remplace pas snapshot validé',async()=>{
    await fixture.service.updateProgrammePreparation(source.id,{...payload,activityLabel:'Brouillon non validé',validateBusiness:false});
    const recalculated=await fixture.service.generateProgramme(2028);
    assert.equal(recalculated.canonicalProgramme.rows.find(row=>row.id===next.id).activityLabel,payload.activityLabel);
  });
  await test('correction humaine N+1 validée survit au recalcul, puis N+2 la reprend',async()=>{
    await fixture.service.updateProgrammePreparation(next.id,{...payload,year:2028,date:'2028-04-06',activityLabel:'Référence validée 2028',statCom:'012C1',oiCodes:['DPS:C1'],publicCodes:['N01a'],lieuId:locationC1.lieu_id,salleTheorieId:roomC1.salle_id});
    const recalculated=await fixture.service.generateProgramme(2028);
    const kept=recalculated.canonicalProgramme.rows.find(row=>row.id===next.id);
    assert.equal(kept.activityLabel,'Référence validée 2028');assert.equal(kept.statCom,'012C1');assert.deepEqual(kept.publics,['N01a']);
    const later=await fixture.service.generateProgramme(2029);
    const descendant=later.canonicalProgramme.rows.find(row=>row.lineage && row.lineage.key===source.id);
    assert.equal(descendant.activityLabel,'Référence validée 2028');assert.equal(descendant.lineage.parentYear,2028);
  });
  await test('annulation annuelle ne détruit ni corrections ni validation',async()=>{
    const before=fixture.preparations.find(row=>row.source_ref===source.id);
    const validation=structuredClone(before.metadata.businessValidation);
    await fixture.service.updateProgrammePreparation(source.id,{lifecycleAction:'CANCEL_YEAR'});
    assert.equal(before.title,'Brouillon non validé');assert.deepEqual(before.metadata.businessValidation,validation);
  });
  await test('absence de validation récente: plus ancienne version validée propre à la lignée',()=>{
    const row=fixture.preparations.find(row=>row.source_ref===source.id);
    const candidates=[{...row,annee:2027},{...row,annee:2028,metadata:{...row.metadata,businessValidation:null}}];
    assert.equal(consolidation.latestValidatedReferences(candidates,2029)[0].annee,2027);
    assert.equal(consolidation.latestValidatedReferences(candidates,2027).length,0);
  });
  await test('lignées indépendantes jamais fusionnées par libellé identique',()=>{
    assert.equal(consolidation.equivalent({title:'Même activité',domain:'DPS',metadata:{lineage:{key:'a'}}},{title:'Même activité',domain:'DPS',metadata:{lineage:{key:'b'}}}),false);
  });
  await test('désactivation production empêche la future reconduction',()=>{
    const row=fixture.preparations.find(row=>row.source_ref===source.id);
    assert.deepEqual(consolidation.latestValidatedReferences([{...row,annee:2027,metadata:{...row.metadata,lifecycleDecision:{futureGenerationDisabled:true}}}],2028),[]);
  });
  await test('désactivation N+1 non validée bloque la reprise de la validation N en N+2',async()=>{
    const isolated=createFixture();
    await isolated.service.updateProgrammePreparation(source.id,payload);
    const generated=await isolated.service.generateProgramme(2028);
    const child=generated.canonicalProgramme.rows.find(row=>row.lineage && row.lineage.key===source.id);
    assert.ok(!child.businessValidation);
    const draftFuture=await isolated.service.generateProgramme(2029);
    assert.ok(draftFuture.canonicalProgramme.rows.some(row=>row.lineage && row.lineage.key===source.id));
    await isolated.service.updateProgrammePreparation(child.id,{year:2028,lifecycleAction:'DISABLE_PRODUCTION'});
    const future=await isolated.service.generateProgramme(2029);
    assert.ok(!future.canonicalProgramme.rows.some(row=>row.lineage && row.lineage.key===source.id));
  });
  const ui=fs.readFileSync(require.resolve('../assets/js/scope-ui'),'utf8');
  const extract=name=>ui.slice(ui.indexOf(`  function ${name}(`),ui.indexOf('\n  function ',ui.indexOf(`  function ${name}(`)+1));
  const context={L,escapeHtml:String};vm.createContext(context);
  vm.runInContext(extract('qvProgrammeOiOptions'),context);
  await test('checkbox groupées aux valeurs internes uniques, libellés courts',()=>{
    const html=context.qvProgrammeOiOptions(['DPS:G1']);
    assert.match(html,/value="DPS:G1" checked/);assert.match(html,/value="JSP:G1" ><span>JSP G1/);
    const values=[...html.matchAll(/value="([^"]+)"/g)].map(match=>match[1]);assert.equal(values.length,new Set(values).size);
    assert.ok(!ui.includes('if (input.value === event.target.value) input.checked'));
  });
  await test('filtres Programme conservés pendant le rendu, contexte appliqué seulement à la navigation',()=>{
    const ctx={state:{quoVadisFilters:{}},L};vm.createContext(ctx);vm.runInContext(extract('applyQuoVadisRouteContext'),ctx);
    const route={screen:'quo-vadis',qvView:'programme'};ctx.applyQuoVadisRouteContext(route);
    ctx.state.quoVadisFilters.q='Référence validée';ctx.state.quoVadisFilters.cible='AUTO:CAND-EA';
    ctx.applyQuoVadisRouteContext(route);assert.equal(ctx.state.quoVadisFilters.q,'Référence validée');assert.equal(ctx.state.quoVadisFilters.cible,'AUTO:CAND-EA');
    ctx.applyQuoVadisRouteContext({...route,qvMode:'mensuelle',qvMois:'2027-02'});assert.equal(ctx.state.quoVadisFilters.month,'2027-02');
    assert.equal(L.qvProgrammeFamily({domain:'DPS',family:'Événement'}),'FOCO');
  });
  await test('recherche par libellé du nouveau public et par OI qualifié',()=>{
    const ctx={L,state:{quoVadisFilters:{q:'Candidats machiniste EA'}},qvProgrammeVisualState:()=>({label:'Validé'}),
      qvProgrammeFamily:L.qvProgrammeFamily,qvProgrammeDate:()=>'',qvProgrammeEventCodeLabel:()=>'',
      qvProgrammePublicLabel:row=>L.qvFormatPublicLabels(row.publics),qvProgrammeProvenance:()=>'',qvProgrammeCompareRows:()=>0};
    vm.createContext(ctx);vm.runInContext(extract('qvNormalizeSearch')+extract('qvProgrammeFilteredRows'),ctx);
    const qv={canonicalProgramme:{rows:[{id:'candidate',publics:['AUTO:CAND-EA'],oiSelections:['JSP:G1']},{id:'machinist',publics:['AUTO:5']}]}};
    assert.deepEqual(Array.from(ctx.qvProgrammeFilteredRows(qv),row=>row.id),['candidate']);
    ctx.state.quoVadisFilters.q='JSP G1';
    assert.deepEqual(Array.from(ctx.qvProgrammeFilteredRows(qv),row=>row.id),['candidate']);
  });
  await test('enrichissement explicite, sans substitution code cours/Stat.Com, sans règle TP9 rétroactive',()=>{
    const context={statComCodes:refs.statcoms,lieux:[],sallesTheorie:[]};
    const row=L.qvEnrichBusinessReference({title:'Instr sct ABC',domain:'DPS',ois:['G1'],personnel:'Section 3A',statCom:'012G1',code:'FAUX'},context);
    assert.equal(row.classification,'REGLE_GENERALISABLE');assert.deepEqual(row.publicCodes,['N03a']);assert.equal(row.statCom,'012G1');
    const amb=L.qvEnrichBusinessReference({title:'Conduite TP9000',domain:'AUTO',ois:['C1'],personnel:'Inconnu'},context);
    // L'OI C1 est determine (caserne DPS) ; c'est le public qui reste ambigu, sans TP9 retroactif invente.
    assert.equal(amb.classification,'AMBIGU');assert.deepEqual(amb.oiSelections,['DPS:C1']);assert.ok(!amb.publicCodes.includes('AUTO:2'));
  });
  await test('cibles SCOPE démontrent OI/public, et succession Stat.Com datée réutilisée',()=>{
    const context={statComCodes:refs.statcoms,statComSuccessions:require('../netlify/lib/_scope-statcom-referential').STATCOM_SUCCESSIONS};
    const row=L.qvEnrichBusinessReference({title:'Exercice JSP 1',domaine_code:'JSP',oi_codes:[],business_targets:[{domain:'JSP',code:'C1',label:'JSP C1'}]},context);
    assert.deepEqual(row.oiSelections,['JSP:C1']);assert.deepEqual(row.publicCodes,['JSP:1']);assert.equal(row.statCom,'');
    const succession=L.qvEnrichBusinessReference({title:'Séance cadres JSP',date:'2026-09-14',statCom:'010JY3'},context);
    assert.equal(succession.statCom,'010JC1');assert.equal(succession.sourceStatCom,'010JY3');
    assert.ok(succession.evidence.some(item=>item.rule==='CANONICAL_DATED_STATCOM_SUCCESSION'));
    assert.ok(!row.evidence.some(item=>item.rule==='EXPLICIT_PERSONNEL_PUBLIC'));
  });
  await test('enrichissement historique identique après nouvelle instance sans mutation de la source',async()=>{
    const events=[{evenement_id:'real-history',date:'2026-06-15',domaine_code:'JSP',libelle:'Exercice JSP 1',statcom_code:'010JC1',oi_codes:[],
      business_targets:[{domain:'JSP',code:'C1',label:'JSP C1'}],public_codes:['JSP:1']}];
    const raw=structuredClone(events);
    const first=await createFixture(null,{events}).service.listProgramme(2027);
    const second=await createFixture(null,{events}).service.listProgramme(2027);
    const row=first.historicalAgenda2026.events.find(row=>row.eventId==='real-history');
    assert.equal(row.business.classification,'REGLE_GENERALISABLE');assert.deepEqual(row.business.oiSelections,['JSP:C1']);
    assert.deepEqual(second.historicalAgenda2026.events.find(row=>row.eventId==='real-history').business,row.business);
    assert.deepEqual(events,raw);
  });
  await test('paramètres SQL des modifications entièrement typables, verrou commun au recalcul',()=>{
    for(const query of fixture.queries.filter(query=>/update scope_quo_vadis_obligations set title=\$3|set statut=\$2,metadata/.test(query.sql))){
      const used=new Set([...query.sql.matchAll(/\$(\d+)/g)].map(match=>Number(match[1])));
      for(let index=1;index<=query.params.length;index++)assert.ok(used.has(index),`SQL unused parameter $${index}`);
    }
    assert.ok(fixture.queries.some(query=>query.params[0]==='QUO-VADIS:2027'));
  });
  await test('sauvegarde et génération n’écrivent aucun événement ou présence',()=>{
    assert.ok(!fixture.queries.some(query=>/^(update|insert into|delete from) scope_(evenements|participations|evenement_ois)\b/i.test(query.sql.trim())));
  });
  console.log(`QV BUSINESS CONSOLIDATION: ${passed}/${passed} PASS`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
