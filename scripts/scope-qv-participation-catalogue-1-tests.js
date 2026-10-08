'use strict';

const assert = require('node:assert/strict');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const participation = require('../netlify/lib/_scope-participation-catalogue');
const { ScopeQvPostgresStore } = require('../netlify/lib/_scope-qv-publication-postgres-store');
const { describeEventSeries } = require('../netlify/lib/_scope-cycle-rules');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');

async function main(){
  assert.deepEqual(participation.normalizeDecision({ tracking:false }),{
    tracking:false,populationKind:'NONE',populationCode:null,evaluationMode:'NONE',
    evaluationGroupCode:null,evaluationSessionIndex:null
  });
  assert.throws(() => participation.normalizeDecision({ tracking:true }),/public évalué/);
  assert.equal(participation.serializeRule(null).status,'A_QUALIFIER');

  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const event = async (code) => repo.insertEvenement({
    date:'2027-05-12',domaine_code:'PR',libelle:code,code_source:code,
    source_type:'QUO_VADIS',origine:'NOMINATIF'
  });
  const unknown = await event('QV-UNKNOWN');
  const no = await event('QV-NO');
  const yes = await event('QV-YES');
  repo.setCatalogueParticipationRule('QV-NO',{ tracking:false });
  repo.setCatalogueParticipationRule('QV-YES',{
    tracking:true,population_kind:'QUALIFICATION',population_code:'PAPR',evaluation_mode:'MULTI_SESSION'
  });
  assert.equal((await repo.listEvenements({ year:2027 })).length,3);
  const listed = await service.listEvenements({ year:2027 });
  assert.deepEqual(listed.evenements.map((row) => row.evenement.code_source),['QV-YES']);
  const preview = await service.previewAttendus(yes.evenement_id);
  assert.equal(preview.resolutionStatus,'INCOMPLETE');
  assert.deepEqual(preview.personnes,[]);
  await assert.rejects(service.previewAttendus(unknown.evenement_id),{ error:'participation_catalogue_non_suivie' });
  await assert.rejects(service.previewAttendus(no.evenement_id),{ error:'participation_catalogue_non_suivie' });
  await assert.rejects(service.figerPopulation(yes.evenement_id,{ baseVersion:yes.version },{ sub:'test' }),
    { error:'population_catalogue_incomplete' });
  assert.deepEqual(await repo.listAttendus(yes.evenement_id),[]);
  assert.deepEqual(await repo.listAttendus(no.evenement_id),[]);
  assert.deepEqual(await repo.listAttendus(unknown.evenement_id),[]);
  const prRows = programme.rows.filter((row) => /^Exercice PR [1-4][.]/.test(row.label));
  assert.equal(prRows.length,24);
  assert.equal(new Set(prRows.map((row) => row.id)).size,24);
  const store = new ScopeQvPostgresStore({
    connectionString:'postgresql://127.0.0.1:55432/scope_qv_2027_recipe_20261006',
    deploymentMode:'clone',allowCloneConnection:true,expectedDatabase:'scope_qv_2027_recipe_20261006'
  });
  const calls = [];
  store.query = async (sql,params) => {
    calls.push({ sql,params });
    if(sql.startsWith('select to_regclass')) return { rows:[{ table_name:'scope_activity_participation_rules' }] };
    return sql.startsWith('select r.evaluation_group_code')
      ? { rows:[{ evaluation_group_code:'PR2',evaluation_session_index:3 }] }
      : { rows:[] };
  };
  await store.attachParticipationSeries('event-1',{
    source:{ year:2027,definitionId:'QV26-EXERCICE-PR-2-3-5B63EA54' },
    session:{ index:1,count:1 }
  });
  assert.deepEqual(calls[2].params,['event-1','QV:2027:PR2','QV:2027:PR2.3',3]);
  assert.equal(describeEventSeries({ domaine_code:'PR',pr_exercise_group_key:'QV:2027:PR2',session_index:3 }).sessionNumber,3);
  await store.pool.end();

  const e2eRepo = createMemoryRepo();
  const e2e = createScopeService(e2eRepo);
  const persons = createScopePersonService(e2eRepo);
  const analytics = createScopeAnalyticsService(e2eRepo);
  const actor = { sub:'participation-catalogue-test',permissions:['events:create','events:update','references:manage'] };
  const prCible = await e2eRepo.findCible('PR','GEN');
  const papr = await e2eRepo.insertPersonne({ personne_id:'papr-fixture',nip:'990001',nom:'Papr',prenom:'Test',date_entree:'2026-01-01' });
  const other = await e2eRepo.insertPersonne({ personne_id:'non-papr-fixture',nip:'990002',nom:'Autre',prenom:'Test',date_entree:'2026-01-01' });
  const inactive = await e2eRepo.insertPersonne({ personne_id:'inactive-fixture',nip:'990003',nom:'Inactif',prenom:'Test',actif:false,date_sortie:'2026-12-31' });
  for(const person of [papr,other]) await e2eRepo.insertAffectation({ personne_id:person.personne_id,cible_id:prCible.cible_id,date_debut:'2026-01-01' });
  const sourceIds = ['QV26-EXERCICE-PR-1-1-30B1E01A','QV26-EXERCICE-PR-1-2-A4FDA43C'];
  const prEvents = [];
  for(let index=0;index<sourceIds.length;index++){
    e2eRepo.setCatalogueParticipationRule(sourceIds[index],{
      tracking:true,population_kind:'QUALIFICATION',population_code:'PAPR',evaluation_mode:'MULTI_SESSION',
      evaluation_group_code:'PR1',evaluation_session_index:index+1
    });
    const created = await e2eRepo.insertEvenement({ date:`2027-03-${String(2+index).padStart(2,'0')}`,
      domaine_code:'PR',libelle:`Exercice PR 1.${index+1}`,source_type:'QUO_VADIS',code_source:sourceIds[index],
      mode_suivi:'NOMINATIF',statut:'PLANIFIE',cible_ids:[prCible.cible_id],
      pr_exercise_group_key:'QV:2027:PR1',pr_session_key:`QV:2027:PR1.${index+1}`,session_index:index+1 });
    prEvents.push(created);
  }
  const missing = await e2e.previewAttendus(prEvents[0].evenement_id);
  assert.equal(missing.resolutionStatus,'INCOMPLETE');
  assert.equal(missing.count,0);
  e2eRepo.setCatalogueParticipationRule('QV-PUBLIC-PAPR',{ tracking:true,population_kind:'PUBLIC',
    population_code:'PR-PAPR',evaluation_mode:'EVENT' });
  const publicEvent = await e2eRepo.insertEvenement({ date:'2027-03-04',domaine_code:'PR',libelle:'Public PAPR canonique',
    source_type:'QUO_VADIS',code_source:'QV-PUBLIC-PAPR',statut:'PLANIFIE',mode_suivi:'NOMINATIF' });
  assert.equal((await e2e.previewAttendus(publicEvent.evenement_id)).resolutionStatus,'INCOMPLETE');
  await assert.rejects(e2e.figerPopulation(prEvents[0].evenement_id,{ baseVersion:prEvents[0].version },actor),
    { error:'population_catalogue_incomplete' });
  assert.equal((await e2eRepo.listAttendus(prEvents[0].evenement_id)).length,0);
  e2eRepo.setPersonQualification({ personQualificationId:'papr-fact-1',personneId:papr.personne_id,
    competenceCode:'PAPR',validFrom:'2026-01-01',validTo:null,status:'CONFIRMED' });
  assert.deepEqual((await e2e.previewAttendus(publicEvent.evenement_id)).personnes.map((row) => row.personneId),[papr.personne_id]);
  for(const ev of prEvents){
    const preview = await e2e.previewAttendus(ev.evenement_id);
    assert.equal(preview.resolutionStatus,'COMPLETE');
    assert.deepEqual(preview.personnes.map((row) => row.personneId),[papr.personne_id]);
    await e2e.figerPopulation(ev.evenement_id,{ baseVersion:(await e2eRepo.getEvent(ev.evenement_id)).version },actor);
    assert.deepEqual((await e2eRepo.listAttendus(ev.evenement_id)).map((row) => row.personne_id),[papr.personne_id]);
    await e2e.enregistrerParticipations(ev.evenement_id,{ baseVersion:(await e2eRepo.getEvent(ev.evenement_id)).version,
      participations:[{ personneId:papr.personne_id,statut:'PRESENT' }] },actor);
    await e2e.cloturer(ev.evenement_id,{ baseVersion:(await e2eRepo.getEvent(ev.evenement_id)).version },actor);
  }
  const period = { from:'2027-03-01',to:'2027-03-31',preset:'CUSTOM' };
  const evaluated = await analytics.evaluate({ ...period,personneId:papr.personne_id });
  assert.equal(evaluated.officiel.eventCount,1);
  const fiche = await persons.fiche(papr.personne_id,period);
  assert.equal(fiche.kpi.eventCount,1);
  assert.equal(fiche.kpi.numerator,1);
  const otherFiche = await persons.fiche(other.personne_id,period);
  assert.equal(otherFiche.kpi.eventCount,0);

  const plannedIds = programme.rows.filter((row) => row.definitionId && !sourceIds.includes(row.definitionId))
    .map((row) => row.definitionId);
  const [noCode,unknownCode] = [...new Set(plannedIds)].slice(0,2);
  assert.ok(noCode && unknownCode);
  e2eRepo.setCatalogueParticipationRule(noCode,{ tracking:false,population_kind:'NONE',evaluation_mode:'NONE' });
  const noEvent = await e2eRepo.insertEvenement({ date:'2027-03-08',domaine_code:'DPS',libelle:'Activité planifiée non suivie',
    source_type:'QUO_VADIS',code_source:noCode,statut:'PLANIFIE',mode_suivi:'NOMINATIF' });
  const unknownEvent = await e2eRepo.insertEvenement({ date:'2027-03-09',domaine_code:'DPS',libelle:'Activité à qualifier',
    source_type:'QUO_VADIS',code_source:unknownCode,statut:'PLANIFIE',mode_suivi:'NOMINATIF' });
  assert.ok(programme.rows.some((row) => row.definitionId === noCode));
  assert.ok(programme.rows.some((row) => row.definitionId === unknownCode));
  const operational = await e2e.listEvenements({ year:2027 });
  assert.deepEqual(operational.evenements.map((row) => row.evenement.evenement_id).sort(),
    [...prEvents.map((row) => row.evenement_id),publicEvent.evenement_id].sort());
  assert.ok((await e2eRepo.listEvenements({ annee:2027 })).some((row) => row.evenement_id === noEvent.evenement_id));
  for(const ev of [noEvent,unknownEvent]){
    await assert.rejects(e2e.previewAttendus(ev.evenement_id),{ error:'participation_catalogue_non_suivie' });
    assert.equal((await e2eRepo.listAttendus(ev.evenement_id)).length,0);
    assert.equal((await e2eRepo.listParticipations(ev.evenement_id)).length,0);
  }
  assert.equal((await persons.fiche(other.personne_id,period)).kpi.eventCount,0);
  assert.equal((await analytics.evaluate(period)).includedEvents.length,1);

  for(const [code,mode] of [['QV-MULTI-UNLINKED','MULTI_SESSION'],['QV-CURSUS-UNLINKED','CURSUS']]){
    e2eRepo.setCatalogueParticipationRule(code,{ tracking:true,population_kind:'PUBLIC',
      population_code:'PR-PAPR',evaluation_mode:mode });
    const unlinked = await e2eRepo.insertEvenement({ date:'2027-03-15',domaine_code:'PR',libelle:code,
      source_type:'QUO_VADIS',code_source:code,statut:'PLANIFIE',mode_suivi:'NOMINATIF' });
    assert.equal((await e2e.previewAttendus(unlinked.evenement_id)).resolutionStatus,'INCOMPLETE');
    await assert.rejects(e2e.figerPopulation(unlinked.evenement_id,{ baseVersion:unlinked.version },actor),
      { error:'population_catalogue_incomplete' });
    assert.equal((await e2eRepo.listAttendus(unlinked.evenement_id)).length,0);
  }

  e2eRepo.setCatalogueParticipationRule('QV-SDIS-ALL',{ tracking:true,population_kind:'SDIS',
    population_code:'SDIS-TOUS',evaluation_mode:'EVENT' });
  const allEvent = await e2eRepo.insertEvenement({ date:'2027-04-01',domaine_code:'PR',libelle:'SDIS entier',
    source_type:'QUO_VADIS',code_source:'QV-SDIS-ALL',statut:'PLANIFIE',mode_suivi:'NOMINATIF' });
  const allPreview = await e2e.previewAttendus(allEvent.evenement_id);
  assert.equal(allPreview.resolutionStatus,'COMPLETE');
  assert.deepEqual(allPreview.personnes.map((row) => row.personneId).sort(),[papr.personne_id,other.personne_id].sort());
  assert.ok(!allPreview.personnes.some((row) => row.personneId === inactive.personne_id));
  console.log('PARTICIPATION-CATALOGUE-1 E2E PASS: PAPR daté, PR consolidé, fiche individuelle, Non/inconnu exclus, SDIS éligible');
}

main().catch((error) => { console.error(error);process.exitCode=1; });
