'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { participationEvaluation } = require('../netlify/lib/_scope-participation-catalogue');
const consolidation = require('../netlify/lib/_scope-quo-vadis-consolidation');
const planner = require('../netlify/lib/_scope-qv-publication-plan');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createPgRepo } = require('../netlify/lib/_scope-pg');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeParticipationReportingService } = require('../netlify/lib/_scope-jsp-reporting');
const catalog = require('../netlify/lib/_scope-generic-event-catalog');
const { createScopeAnnualCatalogService } = require('../netlify/lib/_scope-annual-catalog-service');
const fixture = require('./scope-c20-quo-vadis-integration-architecture-1');

const item = () => fixture.buildDataset().find((row) => row.caseId === 'SIMPLE-VULCAIN');
const plan = (programme, targetSnapshot = []) => planner.buildPublicationPlan({
  year:2027, programme, targetSnapshot, referentials:fixture.REFERENTIALS, generatedAt:fixture.GENERATED_AT
});

function annualFixture(){
  const queries = [];
  const definition = { definition_id:'type-id',code:'MOA-TYPE',metadata:{ retained:'unchanged' } };
  let rule = { rule_id:'rule-id',version_number:1,tracking:true,population_kind:'OI',population_code:'G1',
    evaluation_mode:'EVENT',evaluation_group_code:null,evaluation_session_index:null };
  const database = {
    transaction:async (fn) => fn(database),
    async query(sql, params = []){
      queries.push({ sql,params });
      if(sql.startsWith('select definition_id,code,metadata')) return { rows:[structuredClone(definition)] };
      if(sql.startsWith('select * from scope_activity_participation_rules')) return { rows:[structuredClone(rule)] };
      if(sql.startsWith('select r.* from scope_activity_participation_rules')) return { rows:[structuredClone(rule)] };
      if(sql.startsWith('select exists(')) return { rows:[{ used:true }] };
      if(sql.startsWith('select 1 from scope_ois')) return { rows:[{ exists:true }] };
      if(sql.startsWith('insert into scope_activity_participation_rules')){
        rule = { ...rule,version_number:params[1],tracking:params[2],population_kind:params[3],
          population_code:params[4],evaluation_mode:params[5],evaluation_group_code:params[6],evaluation_session_index:params[7] };
        return { rows:[structuredClone(rule)] };
      }
      if(sql.startsWith('update scope_event_definitions')) Object.assign(definition.metadata,JSON.parse(params[1]));
      return { rows:[] };
    }
  };
  const service = createScopeAnnualCatalogService({ database,
    readinessInspector:async () => ({ ready:true,status:'SCHEMA_READY' }),
    contextLoader:async () => ({ definition:{ definitionId:definition.definition_id,code:definition.code,metadata:definition.metadata },
      version:{},requirement:null }) });
  const body = () => ({ baseVersion:rule.version_number,tracking:rule.tracking,populationKind:rule.population_kind,
    populationCode:rule.population_code,evaluationMode:rule.evaluation_mode,
    evaluationGroupCode:rule.evaluation_group_code,evaluationSessionIndex:rule.evaluation_session_index });
  return { service,definition,queries,body };
}

test('default true, strict booleans and occurrence priority over the future type default', () => {
  assert.equal(participationEvaluation(), true);
  assert.equal(participationEvaluation({ participationEvaluation:'false' }), true);
  const type = { metadata:{ participationEvaluationDefault:false } };
  assert.equal(participationEvaluation({}, type), false);
  assert.equal(participationEvaluation({ year:2027 }, type), true);
  assert.equal(participationEvaluation({ date:'2027-04-01' }, type), true);
  assert.equal(participationEvaluation({ date:'2026-04-01' }, type), true);
  assert.equal(participationEvaluation({ participationEvaluation:true }, type), true);
  assert.equal(participationEvaluation({ metadata:{ planningFields:{ participationEvaluation:false } } },
    { metadata:{ participationEvaluationDefault:true } }), false);
  assert.equal(participationEvaluation({ engine_snapshot:{ participationEvaluation:false } },
    { metadata:{ participationEvaluationDefault:true } }), false);
  assert.equal(catalog.normalizeDefinition({ domain:'DPS',label:'Type futur',metadata:type.metadata })
    .metadata.participationEvaluationDefault, false);
});

test('reconduction retains the validated individual choice including false', () => {
  const fields = { participationEvaluation:false, publicCodes:['CMDT:CODIR'], publicFreeLabels:['Descriptif'],
    date:'2027-04-01' };
  assert.deepEqual(consolidation.businessSnapshot(fields), {
    publicCodes:['CMDT:CODIR'], publicFreeLabels:['Descriptif'], participationEvaluation:false
  });
  const validated = { annee:2027, metadata:{ lineage:{ key:'MOA12' },
    businessValidation:{ validatedAt:'2026-10-12T12:00:00Z', fields:consolidation.businessSnapshot(fields) } } };
  const next = consolidation.latestValidatedReferences([validated], 2028);
  assert.equal(next[0].metadata.businessValidation.fields.participationEvaluation, false);
  assert.equal(consolidation.latestValidatedReferences([{ ...validated, metadata:{ ...validated.metadata,
    lifecycleDecision:{ futureGenerationDisabled:true } } }], 2028).length, 0);
});

test('publication carries the flag without removing events, relations or session shape', () => {
  const enabled = plan([item()]).decisions[0];
  const disabled = plan([{ ...item(), metadata:{ planningFields:{ participationEvaluation:false } } }]).decisions[0];
  assert.equal(enabled.action, 'CREATE');
  assert.equal(enabled.target.event.participationEvaluation, true);
  assert.equal(disabled.action, 'CREATE');
  assert.equal(disabled.target.event.participationEvaluation, false);
  assert.equal(enabled.publicationKey, disabled.publicationKey);
  assert.deepEqual(enabled.target.relations, disabled.target.relations);
  assert.deepEqual(enabled.target.session, disabled.target.session);
  assert.equal(plan([{ ...item(), definition:{ metadata:{ participationEvaluationDefault:false } } }])
    .decisions[0].target.event.participationEvaluation, true);
  assert.equal(plan([{ ...item(), year:2028, definition:{ metadata:{ participationEvaluationDefault:false } } }])
    .decisions[0].target.event.participationEvaluation, false);
  assert.equal(plan([{ ...item(), participationEvaluation:true,
    definition:{ metadata:{ participationEvaluationDefault:false } } }]).decisions[0]
    .target.event.participationEvaluation, true);
});

test('legacy true fingerprints stay stable; false updates remain idempotent and operationally protected', () => {
  const first = plan([item()]);
  const target = structuredClone(first.decisions[0].target);
  delete target.event.participationEvaluation;
  assert.equal(planner.targetFingerprint(target), first.decisions[0].target.fingerprint);
  const snapshot = planner.simulateAppliedPlan(first, []);
  assert.equal(plan([item()], snapshot).decisions[0].action, 'UNCHANGED');
  const nextItem = { ...item(), participationEvaluation:false };
  const changed = plan([nextItem], snapshot);
  assert.equal(changed.decisions[0].action, 'UPDATE');
  assert.ok(changed.decisions[0].changedFields.includes('event.participationEvaluation'));
  const after = planner.simulateAppliedPlan(changed, snapshot);
  assert.equal(plan([nextItem], after).decisions[0].action, 'UNCHANGED');
  const protectedSnapshot = structuredClone(snapshot);
  protectedSnapshot[0].operationalState = { participations:1 };
  assert.equal(plan([nextItem], protectedSnapshot).decisions[0].action, 'BLOCKED');
  assert.equal(plan([{ ...nextItem, status:'A_PLANIFIER' }]).decisions[0].action, 'BLOCKED');
});

test('CMDT:CODIR publishes as a preserved declaration without any nominative public relation', () => {
  const source = { ...item(),classification:{ ...item().classification,publicCodes:['CMDT:CODIR'] } };
  const published = plan([source]).decisions[0];
  assert.equal(published.action, 'CREATE');
  assert.deepEqual(published.target.relations.publicCodes, []);
  assert.deepEqual(published.target.event.descriptivePublics, [{ code:'CMDT:CODIR',label:'Membres du Codir' }]);
  assert.deepEqual(source.classification.publicCodes, ['CMDT:CODIR']);
  const realPublics = item().classification.publicCodes;
  const mixed = plan([{ ...source,classification:{ ...source.classification,publicCodes:[...realPublics,'CMDT:CODIR'] } }]);
  assert.equal(mixed.decisions[0].action, 'CREATE');
  assert.deepEqual(mixed.decisions[0].target.relations.publicCodes, [...realPublics].sort());
  const unknown = plan([{ ...source,classification:{ ...source.classification,publicCodes:['CMDT:UNKNOWN'] } }]);
  assert.equal(unknown.decisions[0].action, 'BLOCKED');
  assert.match(unknown.decisions[0].reason, /UNKNOWN_REFERENCES:publics:CMDT:UNKNOWN/);
});

test('operational lists filter false while full lists and stored history remain readable', async () => {
  const repo = createMemoryRepo();
  const legacy = await repo.insertEvenement({ date:'2027-04-01',domaine_code:'DPS',libelle:'Legacy',
    source_type:'QUO_VADIS',code_source:'WITHOUT-RULE' });
  const disabled = await repo.insertEvenement({ date:'2027-04-02',domaine_code:'DPS',libelle:'Disabled',
    participationEvaluation:false });
  await repo.upsertAttendu({ evenement_id:disabled.evenement_id,personne_id:'history',inclus:true });
  await repo.upsertParticipation({ evenement_id:disabled.evenement_id,personne_id:'history',statut:'PRESENT' });
  const before = [await repo.listAttendus(disabled.evenement_id), await repo.listParticipations(disabled.evenement_id)];
  assert.equal(legacy.participationEvaluation, true);
  assert.deepEqual((await repo.listEvenements({ participationOnly:true })).map((row) => row.evenement_id),
    [legacy.evenement_id]);
  const listed = await createScopeService(repo).listEvenements({ year:2027 });
  assert.deepEqual(listed.evenements.map((row) => row.evenement.evenement_id), [legacy.evenement_id]);
  assert.equal((await repo.listEvenements({ annee:2027 })).length, 2);
  assert.equal((await repo.getEvent(disabled.evenement_id)).participationEvaluation, false);
  assert.deepEqual([await repo.listAttendus(disabled.evenement_id), await repo.listParticipations(disabled.evenement_id)], before);
});

test('future type metadata uses existing definitions; explicit choices override it', async () => {
  const repo = createMemoryRepo();
  const definition = await repo.upsertEventDefinition({ code:'MOA-TYPE',domain:'DPS',label:'Type',
    metadata:{ participationEvaluationDefault:false } });
  const inherited = await repo.insertEvenement({ date:'2028-04-01',domaine_code:'DPS',libelle:'Inherited',code_source:'MOA-TYPE' });
  const legacy2027 = await repo.insertEvenement({ date:'2027-04-01',domaine_code:'DPS',libelle:'MOA 2027',code_source:'MOA-TYPE' });
  const explicit = await repo.insertEvenement({ date:'2027-04-02',domaine_code:'DPS',libelle:'Explicit',
    code_source:'MOA-TYPE',participationEvaluation:true });
  assert.equal(inherited.participationEvaluation, false);
  assert.equal(legacy2027.participationEvaluation, true);
  assert.equal(explicit.participationEvaluation, true);
  await repo.upsertEventDefinition({ ...definition,metadata:{ participationEvaluationDefault:true } });
  assert.equal((await repo.getEvent(explicit.evenement_id)).participationEvaluation, true);
});

test('participation statistics exclude disabled events without touching their expected population or presences', async () => {
  const repo = createMemoryRepo();
  const person = await repo.insertPersonne({ nip:'MOA12-TEST',nom:'Test',prenom:'Participation',date_entree:'2026-01-01' });
  const cible = await repo.findCible('JSP','G1');
  await repo.insertAffectation({ personne_id:person.personne_id,cible_id:cible.cible_id,date_debut:'2026-01-01' });
  const events = [];
  for(const flag of [true, false]){
    const event = await repo.insertEvenement({ date:'2027-04-01',domaine_code:'JSP',libelle:String(flag),
      statut:'REALISE',origine:'NOMINATIF',mode_suivi:'NOMINATIF',population_figee:true,
      participationEvaluation:flag,cible_ids:[cible.cible_id] });
    await repo.upsertAttendu({ evenement_id:event.evenement_id,personne_id:person.personne_id,inclus:true });
    await repo.upsertParticipation({ evenement_id:event.evenement_id,personne_id:person.personne_id,statut:'PRESENT' });
    events.push(event);
  }
  const period = { from:'2027-04-01',to:'2027-04-30',preset:'CUSTOM' };
  const bundle = await repo.loadAnalyticsBundle(period);
  assert.deepEqual(bundle.events.map((row) => row.evenement_id), [events[0].evenement_id]);
  const analytics = await createScopeAnalyticsService(repo).evaluate({ ...period,personneId:person.personne_id });
  assert.equal(analytics.officiel.eventCount, 1);
  const report = await createScopeParticipationReportingService(repo).report({ ...period,domaine:'JSP' });
  assert.equal(report.kpis.expected, 1);
  assert.equal(report.kpis.present, 1);
  assert.equal(report.exercises.length, 1);
  assert.ok(!JSON.stringify(report).includes(events[1].evenement_id));
  assert.equal((await repo.listAttendus(events[1].evenement_id)).length, 1);
  assert.equal((await repo.listParticipations(events[1].evenement_id)).length, 1);
});

test('evaluation does not bypass qualification or dated assignment population engines', async () => {
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = await repo.findCible('DPS','G1');
  const active = await repo.insertPersonne({ nip:'MOA12-ACTIVE',nom:'Actif',prenom:'Test',date_entree:'2026-01-01' });
  const expired = await repo.insertPersonne({ nip:'MOA12-EXPIRED',nom:'Expire',prenom:'Test',date_entree:'2026-01-01' });
  for(const person of [active, expired]) await repo.insertAffectation({ personne_id:person.personne_id,
    cible_id:cible.cible_id,date_debut:'2026-01-01',date_fin:person === expired ? '2026-12-31' : null });
  const event = await repo.insertEvenement({ date:'2027-04-01',domaine_code:'DPS',libelle:'Dated assignments',
    participationEvaluation:true,cible_ids:[cible.cible_id] });
  assert.deepEqual((await service.previewAttendus(event.evenement_id)).personnes.map((row) => row.personneId), [active.personne_id]);
  repo.setCatalogueParticipationRule('MOA12-QUAL', { tracking:true,population_kind:'QUALIFICATION',
    population_code:'PAPR',evaluation_mode:'EVENT' });
  const qual = await repo.insertEvenement({ date:'2027-04-01',domaine_code:'PR',libelle:'Qualifications',
    source_type:'QUO_VADIS',code_source:'MOA12-QUAL',participationEvaluation:true });
  assert.equal((await service.previewAttendus(qual.evenement_id)).resolutionStatus, 'INCOMPLETE');
  assert.deepEqual(await repo.listAttendus(qual.evenement_id), []);
});

test('existing annual participation action edits and reloads the type default without changing tracking semantics', async () => {
  const fixture = annualFixture();
  assert.equal((await fixture.service.getActivity('MOA-TYPE')).participationEvaluationDefault, true);
  const saved = await fixture.service.updateParticipationRule('MOA-TYPE', {
    ...fixture.body(),participationEvaluationDefault:false
  }, { sub:'moa12' });
  assert.equal(saved.participationEvaluationDefault, false);
  assert.equal(saved.participation.tracking, true);
  assert.equal(saved.participation.populationKind, 'OI');
  assert.equal(saved.participation.populationCode, 'G1');
  assert.equal(saved.participation.evaluationMode, 'EVENT');
  assert.equal((await fixture.service.getActivity('MOA-TYPE')).participationEvaluationDefault, false);
  assert.deepEqual(fixture.definition.metadata, { retained:'unchanged',participationEvaluationDefault:false });
  assert.ok(!fixture.queries.some(({ sql }) => /^(update|insert into|delete from) scope_(event_definition_versions|evenements|attendus|participations)\b/.test(sql)));
});

test('invalid type booleans and stale form versions cannot persist metadata', async () => {
  const fixture = annualFixture();
  for(const value of ['false',0,null]) await assert.rejects(fixture.service.updateParticipationRule('MOA-TYPE', {
    ...fixture.body(),participationEvaluationDefault:value
  }), { error:'participation_evaluation_default_invalide' });
  assert.equal(fixture.queries.length, 0);
  await assert.rejects(fixture.service.updateParticipationRule('MOA-TYPE', {
    ...fixture.body(),baseVersion:0,participationEvaluationDefault:false
  }), { error:'regle_participation_obsolete' });
  assert.deepEqual(fixture.definition.metadata, { retained:'unchanged' });
});

test('legacy form payloads preserve the configured type default and historical population guards', async () => {
  const fixture = annualFixture();
  fixture.definition.metadata.participationEvaluationDefault = false;
  const saved = await fixture.service.updateParticipationRule('MOA-TYPE', fixture.body(), { sub:'legacy-client' });
  assert.equal(saved.participationEvaluationDefault, false);
  assert.ok(!fixture.queries.some(({ sql }) => sql.startsWith('update scope_event_definitions')));
  await assert.rejects(fixture.service.updateParticipationRule('MOA-TYPE', {
    baseVersion:saved.participation.versionNumber,tracking:false,participationEvaluationDefault:true
  }), { error:'regle_participation_utilisee' });
  assert.equal(fixture.definition.metadata.participationEvaluationDefault, false);
});

test('historical events without an individual flag ignore later type changes; explicit false stays false', () => {
  const type = { metadata:{ participationEvaluationDefault:false } };
  for(const statut of ['REALISE','TERMINE','TERMINEE','CLOTURE','CLOTUREE','TRAITE']){
    assert.equal(participationEvaluation({ date:'2028-04-01',statut }, type), true);
    assert.equal(participationEvaluation({ date:'2028-04-01',statut,
      engine_snapshot:{ participationEvaluation:false } }, type), false);
  }
});

test('future event insertion freezes either type default, preserving realised events and their status', async () => {
  const repo = createMemoryRepo();
  const definition = await repo.upsertEventDefinition({ code:'FUTURE-FREEZE',domain:'DPS',label:'Future freeze',
    metadata:{ participationEvaluationDefault:true } });
  const enabled = await repo.insertEvenement({ date:'2028-04-01',domaine_code:'DPS',libelle:'Enabled',code_source:definition.code });
  assert.equal(enabled.engine_snapshot.participationEvaluation, true);
  await repo.updateEventIfVersion(enabled.evenement_id, enabled.version, { statut:'REALISE' });
  await repo.upsertEventDefinition({ ...definition,metadata:{ participationEvaluationDefault:false } });
  assert.equal((await repo.getEvent(enabled.evenement_id)).participationEvaluation, true);
  assert.equal((await repo.getEvent(enabled.evenement_id)).statut, 'REALISE');
  const disabled = await repo.insertEvenement({ date:'2028-04-02',domaine_code:'DPS',libelle:'Disabled',code_source:definition.code });
  assert.equal(disabled.engine_snapshot.participationEvaluation, false);
  await repo.updateEventIfVersion(disabled.evenement_id, disabled.version, { statut:'REALISE' });
  await repo.upsertEventDefinition({ ...definition,metadata:{ participationEvaluationDefault:true } });
  assert.equal((await repo.getEvent(disabled.evenement_id)).participationEvaluation, false);
  const legacy = await repo.getEvent(enabled.evenement_id);
  await repo.updateEventIfVersion(legacy.evenement_id, legacy.version, { engine_snapshot:null });
  await repo.upsertEventDefinition({ ...definition,metadata:{ participationEvaluationDefault:false } });
  assert.equal((await repo.getEvent(legacy.evenement_id)).participationEvaluation, true);
});

test('missing C23 link, programme or obligation table uses the same safe SQL fallback for all event readers', async () => {
  for(const missing of ['scope_qv_publication_links','scope_quo_vadis_programmes','scope_quo_vadis_obligations']){
    const calls = [];
    const repo = createPgRepo({ query:async (sql) => {
      calls.push(sql);
      if(sql.startsWith('select to_regclass')){
        for(const table of ['scope_qv_publication_links','scope_quo_vadis_programmes','scope_quo_vadis_obligations'])
          assert.ok(sql.includes(`to_regclass('${table}')`));
        return { rows:[{ ready:false }] };
      }
      if(sql.includes(missing)) throw Object.assign(new Error(`relation ${missing} does not exist`), { code:'42P01' });
      return { rows:[] };
    } });
    assert.deepEqual(await repo.listEvenements({ participationOnly:true }), []);
    assert.equal(await repo.getEvent('event-id'), null);
    assert.deepEqual((await repo.loadAnalyticsBundle({ from:'2028-01-01',to:'2028-12-31' })).events, []);
    await repo.listCycleEvents('cycle-id');
    await repo.listPrExerciseEvents('pr-group');
    await repo.listExerciseEvents('exercise-id');
    assert.equal(calls.filter((sql) => sql.startsWith('select to_regclass')).length, 1);
    const eventQueries = calls.filter((sql) => sql.includes('from scope_evenements e'));
    assert.ok(eventQueries.length >= 4);
    assert.ok(eventQueries.every((sql) => !sql.includes('scope_qv_publication_links')));
    assert.ok(eventQueries.every((sql) => sql.includes("upper(e.statut) in ('REALISE'")));
  }
});

test('closed multi-session rates survive type flips and disabling one session without losing stored history', async () => {
  const repo = createMemoryRepo();
  const definition = await repo.upsertEventDefinition({ code:'MULTI-FREEZE',domain:'PR',label:'Multi freeze',
    metadata:{ participationEvaluationDefault:true } });
  const person = await repo.insertPersonne({ nip:'MOA12-MULTI',nom:'Multi',prenom:'Test',date_entree:'2026-01-01' });
  const events = [];
  for(let session=1;session<=2;session++){
    const event = await repo.insertEvenement({ date:`2028-04-0${session}`,domaine_code:'PR',libelle:`Exercice PR 1.${session}`,
      code_source:definition.code,statut:'PLANIFIE',pr_exercise_group_key:'MOA12:PR1',
      pr_session_key:`MOA12:PR1.${session}`,session_index:session });
    await repo.upsertAttendu({ evenement_id:event.evenement_id,personne_id:person.personne_id,inclus:true });
    await repo.upsertParticipation({ evenement_id:event.evenement_id,personne_id:person.personne_id,statut:'PRESENT' });
    await repo.updateEventIfVersion(event.evenement_id,event.version,{ statut:'REALISE' });
    events.push(event);
  }
  const analytics = createScopeAnalyticsService(repo);
  const period = { from:'2028-04-01',to:'2028-04-30',preset:'CUSTOM',personneId:person.personne_id };
  const before = (await analytics.evaluate(period)).officiel;
  assert.equal(before.eventCount, 1);
  assert.equal(before.numerator, 1);
  await repo.upsertEventDefinition({ ...definition,metadata:{ participationEvaluationDefault:false } });
  assert.deepEqual((await analytics.evaluate(period)).officiel, before);
  const first = await repo.getEvent(events[0].evenement_id);
  const history = [await repo.listAttendus(first.evenement_id),await repo.listParticipations(first.evenement_id)];
  await repo.updateEventIfVersion(first.evenement_id,first.version,{
    engine_snapshot:{ ...first.engine_snapshot,participationEvaluation:false }
  });
  assert.deepEqual((await analytics.evaluate(period)).officiel, before);
  assert.deepEqual([await repo.listAttendus(first.evenement_id),await repo.listParticipations(first.evenement_id)], history);
  assert.equal((await repo.getEvent(first.evenement_id)).statut, 'REALISE');
});

test('evaluated ABSENT plus unevaluated PRESENT contributes exactly 0/1 globally, individually and in the directory', async () => {
  const repo = createMemoryRepo();
  const person = await repo.insertPersonne({ nip:'MOA12-ABSENT',nom:'Absent',prenom:'Test',date_entree:'2026-01-01' });
  const events = [];
  for(const [index, flag, statut] of [[1,true,'ABSENT_NON_EXCUSE'],[2,false,'PRESENT']]){
    const event = await repo.insertEvenement({ date:`2028-04-0${index}`,domaine_code:'PR',
      libelle:`Exercice PR 2.${index}`,statut:'REALISE',participationEvaluation:flag,
      pr_exercise_group_key:'MOA12:PR2',pr_session_key:`MOA12:PR2.${index}`,session_index:index });
    await repo.upsertAttendu({ evenement_id:event.evenement_id,personne_id:person.personne_id,inclus:true });
    await repo.upsertParticipation({ evenement_id:event.evenement_id,personne_id:person.personne_id,statut });
    events.push(event);
  }
  const period = { from:'2028-04-01',to:'2028-04-30',preset:'CUSTOM',domaineCode:'PR' };
  const analytics = createScopeAnalyticsService(repo);
  const global = (await analytics.evaluate(period)).officiel;
  const individual = (await analytics.evaluate({ ...period,personneId:person.personne_id })).officiel;
  const directory = (await analytics.directoryRates(period)).rates[person.personne_id];
  for(const rate of [global,individual,directory]){
    assert.ok(rate);
    assert.deepEqual({ numerator:rate.numerator,denominator:rate.denominator,eventCount:rate.eventCount,percentage:rate.percentage },
      { numerator:0,denominator:1,eventCount:1,percentage:0 });
  }
  assert.equal((await repo.getEvent(events[1].evenement_id)).participationEvaluation, false);
  assert.equal((await repo.getEvent(events[1].evenement_id)).statut, 'REALISE');
  assert.equal((await repo.listAttendus(events[1].evenement_id)).length, 1);
  assert.equal((await repo.listParticipations(events[1].evenement_id))[0].statut, 'PRESENT');
});
