'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createMemoryRepo}=require('../netlify/lib/_scope-memory');
const {createScopeService}=require('../netlify/lib/_scope-service');
const {createScopeAnalyticsService}=require('../netlify/lib/_scope-analytics-service');
const {createScopeParticipationReportingService}=require('../netlify/lib/_scope-jsp-reporting');
const {parsePeriod}=require('../netlify/lib/_scope-period');

async function scenario(){
  const repo=createMemoryRepo();
  const person=await repo.insertPersonne({nip:'ROADMAP-CIVIL',nom:'Recette',prenom:'Civil',date_entree:'2026-01-01'});
  const cible=await repo.findCible('JSP','G1');
  await repo.insertAffectation({personne_id:person.personne_id,cible_id:cible.cible_id,date_debut:'2026-01-01'});
  const events=[];
  for(const [date,evaluated] of [['2027-12-31',true],['2028-01-01',true],['2028-01-28',true],['2028-12-31',true],['2028-01-29',false],['2029-01-01',true]]){
    const event=await repo.insertEvenement({date,domaine_code:'JSP',libelle:'Activité du cycle métier 2027',
      statut:'REALISE',origine:'NOMINATIF',mode_suivi:'NOMINATIF',population_figee:true,
      source_type:'QUO_VADIS',code_source:'ROADMAP-CYCLE-2027',engine_snapshot:{businessYear:2027},
      participationEvaluation:evaluated,cible_ids:[cible.cible_id]});
    await repo.upsertAttendu({evenement_id:event.evenement_id,personne_id:person.personne_id,inclus:true});
    await repo.upsertParticipation({evenement_id:event.evenement_id,personne_id:person.personne_id,statut:'PRESENT'});
    events.push(event);
  }
  return {repo,person,cible,events};
}
test('QV-STAT-001: le cycle 2027 ne change ni les bornes civiles ni les contributions de 2028',async()=>{
  const {repo,person,events}=await scenario();
  const analytics=createScopeAnalyticsService(repo);
  for(const [year,count] of [[2027,1],[2028,3],[2029,1]]){
    const period=parsePeriod({preset:'YEAR',year});
    assert.equal(period.from,`${year}-01-01`);assert.equal(period.to,`${year}-12-31`);
    const result=await analytics.evaluate({preset:'YEAR',year,personneId:person.personne_id});
    assert.equal(result.officiel.eventCount,count);assert.equal(result.officiel.numerator,count);
    const bundle=await repo.loadAnalyticsBundle(period);
    assert.ok(bundle.events.every(event=>event.date.startsWith(String(year))));
    assert.ok(!bundle.events.some(event=>event.evenement_id===events[4].evenement_id));
  }
  assert.equal((await repo.listParticipations(events[4].evenement_id)).length,1);
  assert.equal((await repo.listEvenements({annee:2028})).length,4);
});
test('les rapports individuels, OI, domaine et agreges reutilisent la date civile sans double comptage',async()=>{
  const {repo,person,cible}=await scenario();
  const analytics=createScopeAnalyticsService(repo);
  const query={preset:'YEAR',year:2028};
  const byOi=await analytics.evaluate({...query,cibleId:cible.cible_id,domaineCode:'JSP'});
  const byDomain=await analytics.evaluate({...query,domaineCode:'JSP'});
  assert.equal(byOi.officiel.eventCount,3);assert.equal(byDomain.officiel.eventCount,3);
  const reporting=createScopeParticipationReportingService(repo);
  const report=await reporting.report({...query,domaine:'JSP'});
  assert.equal(report.kpis.expected,3);assert.equal(report.kpis.present,3);
  assert.equal(report.exercises.length,3);
  assert.ok(report.persons.some(item=>item.nip===person.nip));
  const aggregate=await reporting.formationReport(query);
  assert.equal(aggregate.kpis.expected,3);assert.equal(aggregate.kpis.present,3);
});
test('la population applicable utilise la date reelle A+1 et non le numero du cycle',async()=>{
  const {repo,person,cible}=await scenario();
  const expired=await repo.insertPersonne({nip:'ROADMAP-EXPIRED',nom:'Recette',prenom:'Expire',date_entree:'2026-01-01'});
  await repo.insertAffectation({personne_id:expired.personne_id,cible_id:cible.cible_id,
    date_debut:'2026-01-01',date_fin:'2027-12-31'});
  const event=await repo.insertEvenement({date:'2028-01-28',domaine_code:'JSP',libelle:'Population datée',
    cible_ids:[cible.cible_id],engine_snapshot:{businessYear:2027},participationEvaluation:true});
  const preview=await createScopeService(repo).previewAttendus(event.evenement_id);
  assert.deepEqual(preview.personnes.map(item=>item.personneId),[person.personne_id]);
  assert.deepEqual(await repo.listAttendus(event.evenement_id),[]);
});
