'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {execFileSync} = require('node:child_process');
const {Client} = require('pg');
const {createScopeQuoVadisService} = require('../netlify/lib/_scope-quo-vadis-service');
const logic = require('../assets/js/scope-ui-logic');
const cta = require('../netlify/lib/_scope-cta-rules');

const BASELINE = '6f0eb8b2f6aaad6d7a6ab7946304e3b9d3c76ba3';
const DATABASE = 'scope_qv_2027_recipe_20261006';
const root = path.resolve(__dirname,'..');

// Resolve every repository dependency from the same fixed commit, including JSON and UI helpers.
function baselineService(){
  const cache = new Map();
  const load = relative => {
    if(cache.has(relative)) return cache.get(relative).exports;
    const source = execFileSync('git',['show',`${BASELINE}:${relative}`],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    if(relative.endsWith('.json')){
      const exports = JSON.parse(source);
      cache.set(relative,{exports});
      return exports;
    }
    const filename = path.join(root,relative);
    const loaded = new Module(filename,module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(relative,loaded);
    const original = Module.createRequire(filename);
    loaded.require = request => {
      if(!request.startsWith('.')) return original(request);
      const target = path.relative(root,path.resolve(path.dirname(filename),request));
      return load(path.extname(target) ? target : `${target}.js`);
    };
    loaded._compile(source,filename);
    return loaded.exports;
  };
  return load('netlify/lib/_scope-quo-vadis-service.js');
}

async function hashes(client,tables){
  const result = {};
  for(const table of tables){
    assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    result[table] = (await client.query(`select count(*)::int as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash from ${table} t`)).rows[0];
  }
  return result;
}

function preserved(rows){
  return rows.map(row => Object.fromEntries(['id','code','businessCode','publishedEventId','publishedEventCode',
    'occurrenceId','sessionId','definitionId','statCom','domain','programmeDomain','persistenceDomain',
    'startsAt','endsAt','ois','publics','themes','status','humanDecision','businessValidation']
    .map(key=>[key,row[key]]))).sort((a,b)=>a.id.localeCompare(b.id));
}

async function run(){
  const client = new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();
  let open = false;
  const proof = {baseline:BASELINE,database:DATABASE,host:'127.0.0.1',port:5432,
    fixtureClosingDate:'2028-02-02',fixtureOnly:true,productionWrites:false};
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables = (await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before = await hashes(client,tables);
    await client.query('BEGIN');
    open = true;
    await client.query(`select pg_advisory_xact_lock(hashtext($1))`,['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue = Promise.resolve();
    const query = (...args) => {
      const result = queue.then(()=>client.query(...args));
      queue = result.catch(()=>{});
      return result;
    };
    const database = {query,transaction:work=>work({query})};
    const service = createScopeQuoVadisService({database});
    const baseline = await baselineService().createScopeQuoVadisService({database}).listProgramme(2027);
    const current = await service.listProgramme(2027);
    assert.equal(baseline.canonicalProgramme.rows.length,867);
    assert.deepEqual(preserved(current.canonicalProgramme.rows),preserved(baseline.canonicalProgramme.rows));
    proof.baselineRows = 867;
    proof.stableStatComAndProtectedFields = 867;
    assert.equal(current.programmeCycle.endDate,null);
    assert.equal(current.canonicalProgramme.rows.find(row=>row.id==='qv-source-923').businessCycleYear,2026);
    const type = logic.qvProgrammeActivityTypes(current).find(row=>/codir/i.test(row.label));
    assert.ok(type?.definitionId,'Codir must be a demonstrated existing type');
    const body = {...type.defaults,year:2027,programmeTypeId:type.id,activityLabel:'Séance Codir',
      date:'2028-01-28',startTime:'18:00',endTime:'20:00'};
    await assert.rejects(service.createProgrammePreparation(body),error=>error.error==='programme_cycle_cloture_inconnue');
    console.log('PASS fixed baseline and unknown closure');
    const configured = await service.setProgrammeCycle(2027,{endDate:'2028-02-02',parametersDefined:true});
    assert.equal(configured.programmeCycle.endDate,'2028-02-02');
    assert.equal(configured.programmeCycle.closingReport.sourceType,'FUTURE_DATE');
    const configuredAgain = await service.setProgrammeCycle(2027,{endDate:'2028-02-02',parametersDefined:true});
    assert.equal(configuredAgain.programmeCycle.closingReport.itemId,configured.programmeCycle.closingReport.itemId);
    await assert.rejects(service.createProgrammePreparation({...body,date:'2028-02-02'}),
      error=>error.error==='programme_rapport_annuel_exclusif');
    proof.closingReportPriorityPreserved=true;
    const extended = await service.listProgramme(2027);
    proof.automaticExtension2027 = extended.programmeCycle.automaticExtension;
    console.log(JSON.stringify({extensionProposals:proof.automaticExtension2027.historicalExplicitNextYear.length,
      missingCadence:proof.automaticExtension2027.missingCadence}));
    await service.setProgrammeCycle(2027,{parametersDefined:false});
    const pendingParameters = await service.listProgramme(2027);
    assert.equal(pendingParameters.programmeCycle.parametersDefined,false);
    assert.equal(pendingParameters.canonicalProgramme.rows.some(row=>row.cycleExtension),false);
    await assert.rejects(service.generateProgramme(2027),error=>error.error==='programme_cycle_parametres_manquants');
    await service.setProgrammeCycle(2027,{parametersDefined:true});
    proof.explicitFalseParametersSuppressNewAutomaticExtension = true;
    assert.deepEqual(preserved(extended.canonicalProgramme.rows.filter(row=>baseline.canonicalProgramme.rows.some(old=>old.id===row.id))),
      preserved(baseline.canonicalProgramme.rows));
    const newCta = extended.canonicalProgramme.rows.filter(row=>row.definitionId==='CTA-PERMANENCE'
      && row.startsAt.slice(0,10)>='2028-01-01');
    assert.ok(newCta.length);
    for(const row of newCta){
      assert.ok(row.startsAt.slice(0,10)<='2028-02-02');
      const friday = row.id.match(/CTA-PERM-(\d{4}-\d{2}-\d{2})$/)?.[1];
      if(friday) assert.deepEqual(row.ctaAssignments.map(({provenance,...rest})=>rest),cta.assignmentsForFriday(friday));
    }
    const proposedCodir = extended.canonicalProgramme.rows.find(row=>row.cycleExtension
      && row.definitionId === type.definitionId && row.startsAt.slice(0,10)==='2028-01-28');
    assert.ok(proposedCodir,'Existing historical January source must generate the Codir proposal');
    assert.equal(proposedCodir.cycleExtension.sourceLine,893);
    const proposedDuplicate = await service.createProgrammePreparation({...body,startTime:'08:00',endTime:'09:30'});
    assert.equal(proposedDuplicate.reason,'PROGRAMME_OCCURRENCE_EXISTS');
    assert.equal(proposedDuplicate.existingItemId,proposedCodir.id);
    proof.existingAutomaticJanuaryCodirProposed = true;
    const savedProposal = await service.updateProgrammePreparation(proposedCodir.id,{...body,startTime:'08:00',endTime:'09:30',
      saveAction:'VALIDATE',themes:['Theme de recette']});
    const preparedProposal = savedProposal.quoVadis.canonicalProgramme.rows.find(row=>row.id===proposedCodir.id);
    assert.ok(preparedProposal.businessCode.startsWith(`${body.statCom}.`));
    assert.deepEqual(savedProposal.quoVadis.activities.find(row=>row.sourceRef===proposedCodir.id).themes,['Theme de recette']);
    assert.equal(savedProposal.quoVadis.canonicalProgramme.rows.filter(row=>row.id===proposedCodir.id).length,1);
    proof.automaticProposalEditableAndThemeExported = true;
    const created = await service.createProgrammePreparation(body);
    assert.equal(created.created,true);
    const manual = created.quoVadis.canonicalProgramme.rows.find(row=>row.id===created.itemId);
    assert.equal(manual.startsAt.slice(0,16),'2028-01-28T18:00');
    assert.equal(manual.definitionId,type.definitionId);
    assert.equal(manual.businessCycleYear,2027);
    assert.equal(manual.civilYear,2028);
    const duplicate = await service.createProgrammePreparation({...body,activityLabel:'Human alternative title'});
    assert.equal(duplicate.reason,'PROGRAMME_OCCURRENCE_EXISTS');
    assert.equal(duplicate.existingItemId,created.itemId);
    assert.equal(duplicate.existingCycleYear,2027);
    await assert.rejects(service.createProgrammePreparation({...body,programmeTypeId:'forged'}),error=>error.error==='programme_type_invalide');
    await assert.rejects(service.createProgrammePreparation({...body,date:'2028-02-03'}),error=>error.error==='programme_date_hors_cycle');
    const validated = await service.updateProgrammePreparation(created.itemId,{...body,activityLabel:'Intitule humain Codir',
      saveAction:'VALIDATE',participationEvaluation:false});
    const decided = validated.quoVadis.canonicalProgramme.rows.find(row=>row.id===created.itemId);
    assert.equal(decided.participationEvaluation,false);
    const agenda = validated.quoVadis.activities.find(row=>row.sourceRef===created.itemId);
    assert.ok(agenda);
    await assert.rejects(service.generateProgramme(2028),error=>error.error==='programme_cycle_parametres_manquants');
    console.log('PASS manual A+1, exact duplicates and future guard');
    await service.setProgrammeCycle(2028,{endDate:'2029-02-02',parametersDefined:true});
    const future = await service.generateProgramme(2028);
    assert.equal(future.programmeCycle.startDate,'2028-02-03');
    assert.equal(future.canonicalProgramme.rows.some(row=>row.id===created.itemId),false);
    const reconducted = future.canonicalProgramme.rows.find(row=>row.label==='Intitule humain Codir');
    assert.ok(reconducted);
    assert.equal(reconducted.definitionId,type.definitionId);
    assert.equal(reconducted.sessionStructure.definitionId,type.definitionId);
    const reconductedDuplicate = await service.createProgrammePreparation({...body,year:2028,activityLabel:'Autre titre humain',
      date:reconducted.startsAt.slice(0,10),startTime:reconducted.startsAt.slice(11,16),endTime:reconducted.endsAt.slice(11,16),
      oiCodes:reconducted.oiSelections,statCom:reconducted.statCom});
    assert.equal(reconductedDuplicate.reason,'PROGRAMME_OCCURRENCE_EXISTS');
    proof.customHumanTitleRetainsTypeAcrossReconduction = true;
    const futureCodir = future.canonicalProgramme.rows.find(row=>row.cycleExtension
      && row.definitionId===type.definitionId && row.startsAt.startsWith('2029-01-'));
    assert.ok(futureCodir,'Cycle 2028 must also extend its demonstrated Codir profile into January 2029');
    assert.equal(futureCodir.businessValidation,null);
    assert.equal(futureCodir.businessCode,'');
    proof.automaticExtension2028 = future.programmeCycle.automaticExtension;
    assert.ok(future.canonicalProgramme.rows.every(row=>row.preparation || !row.startsAt
      || row.startsAt.slice(0,10)>='2028-02-03' && row.startsAt.slice(0,10)<='2029-02-02'));
    const unchanged = (await service.listProgramme(2027)).canonicalProgramme.rows.find(row=>row.id===created.itemId);
    assert.deepEqual(preserved([unchanged]),preserved([decided]));
    const final = await service.listProgramme(2027);
    const baselineIds = new Set(baseline.canonicalProgramme.rows.map(row=>row.id));
    assert.deepEqual(preserved(final.canonicalProgramme.rows.filter(row=>baselineIds.has(row.id))),preserved(baseline.canonicalProgramme.rows));
    proof.final867ProtectedRowsUnchanged = true;
    proof.manualAPlusOnePreserved = true;
    proof.exactDuplicateReturnsExisting = true;
    proof.continuousCtaExtension = newCta.length;
    proof.futureGenerationBounds = future.programmeCycle;
    proof.operationalEventsCreated = future.generation.operationalEventsCreated;
    await client.query('SAVEPOINT late_closing_report');
    try{
      await client.query(`update scope_quo_vadis_future_dates set date_debut=$2,date_fin=$2
        where future_date_id=$1`,[configured.programmeCycle.closingReport.itemId,'2028-03-04']);
      await service.setProgrammeCycle(2027,{endDate:'2028-03-04',closingReport:configured.programmeCycle.closingReport,parametersDefined:true});
      await service.setProgrammeCycle(2028,{startDate:'2028-03-05',parametersDefined:true});
      const late = await service.listProgramme(2027);
      const instructions = late.canonicalProgramme.rows.filter(row=>logic.qvDpsInstructionKind(row)
        && row.startsAt?.startsWith('2028-') && row.startsAt.slice(0,10)<='2028-03-04');
      assert.ok(instructions.length>0,'A March closing report must keep February 2028 DPS instructions in cycle 2027');
      for(const row of instructions){
        assert.match(row.id,/^QV28:/);
        assert.equal(row.businessCycleYear,2027);
        assert.equal(row.civilYear,2028);
        assert.equal(row.programmeCycle.year,2027);
        assert.equal(row.cycleExtension.civilYear,2028);
      }
      const target = instructions[0];
      const fields = {year:2027,date:target.startsAt.slice(0,10),startTime:target.startsAt.slice(11,16),
        endTime:target.endsAt.slice(11,16),activityLabel:target.label,domain:'F7',statCom:target.statCom,
        oiCodes:target.oiSelections,publicCodes:target.publics,responsibleSelections:[{kind:'FREE',label:'Responsable recette DPS'}],
        saveAction:'SAVE',participationEvaluation:false};
      const human = await service.updateProgrammePreparation(target.id,fields);
      assert.equal(human.updated,true);
      const stored = (await client.query('select metadata from scope_quo_vadis_obligations where obligation_id=$1',
        [human.preparation.id])).rows[0].metadata;
      assert.equal(stored.programmeCycle.year,2027);
      assert.equal(stored.programmeCycle.civilYear,2028);
      const reopened = await service.listProgramme(2027);
      assert.equal(reopened.canonicalProgramme.rows.filter(row=>row.id===target.id).length,1);
      const retained = reopened.canonicalProgramme.rows.find(row=>row.id===target.id);
      assert.equal(retained.participationEvaluation,false);
      assert.equal(retained.responsible,'Responsable recette DPS');
      const following = await service.generateProgramme(2028);
      assert.equal(following.programmeCycle.startDate,'2028-03-05');
      const precedingIds = new Set(instructions.map(row=>row.id));
      assert.equal(following.canonicalProgramme.rows.some(row=>precedingIds.has(row.id)),false);
      assert.ok(following.canonicalProgramme.rows.filter(row=>logic.qvDpsInstructionKind(row)
        && row.startsAt?.startsWith('2028-')).every(row=>row.startsAt.slice(0,10)>='2028-03-05'));
      const preservedLate = await service.listProgramme(2027);
      assert.deepEqual(preserved(preservedLate.canonicalProgramme.rows.filter(row=>baselineIds.has(row.id))),
        preserved(baseline.canonicalProgramme.rows));
      assert.deepEqual(preserved([preservedLate.canonicalProgramme.rows.find(row=>row.id===target.id)]),preserved([retained]));
      proof.lateClosingDps = {fixtureClosingDate:'2028-03-04',fixtureOnly:true,civilYear:2028,cycleYear:2027,
        instructions:instructions.length,conduites:late.canonicalProgramme.rows.filter(row=>row.conduiteEvidence
          && row.startsAt?.startsWith('2028-') && row.startsAt.slice(0,10)<='2028-03-04').length,
        humanDecisionPreserved:true,followingCycleStart:'2028-03-05',followingCycleDoesNotRecreatePrecedingInstructions:true,
        original867Unchanged:true};
    }finally{
      await client.query('ROLLBACK TO SAVEPOINT late_closing_report');
    }
    const preparationTables = new Set(['scope_quo_vadis_programmes','scope_quo_vadis_obligations','scope_quo_vadis_proposals',
      'scope_quo_vadis_calendar_days','scope_quo_vadis_cursus_programmes','scope_quo_vadis_cursus_step_programmes',
      'scope_quo_vadis_future_dates','scope_event_code_sequences']);
    const protectedTables = tables.filter(table=>!preparationTables.has(table));
    const during = await hashes(client,protectedTables);
    for(const table of protectedTables) assert.deepEqual(during[table],before[table],`Protected table changed: ${table}`);
    proof.protectedTablesUnchangedDuring = protectedTables.length;
    await client.query('ROLLBACK');
    open = false;
    assert.deepEqual(await hashes(client,tables),before);
    proof.allTablesUnchangedAfterRollback = tables.length;
    proof.transaction = 'BEGIN/ROLLBACK';
    proof.status = 'PASS';
    const output = path.join(root,'docs/captures/qv-roadmap-v1-20261012/cycles-clone-integrity.json');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({status:proof.status,baseline:BASELINE,baselineRows:proof.baselineRows,
      cycle2027Proposals:proof.automaticExtension2027.historicalExplicitNextYear.length,
      cycle2028Proposals:proof.automaticExtension2028.historicalExplicitNextYear.length,
      missingCadence2027:proof.automaticExtension2027.missingCadence,
      protectedTablesUnchangedDuring:proof.protectedTablesUnchangedDuring,
      allTablesUnchangedAfterRollback:proof.allTablesUnchangedAfterRollback,
      customHumanTitleRetainsTypeAcrossReconduction:proof.customHumanTitleRetainsTypeAcrossReconduction,
      lateClosingDps:proof.lateClosingDps,
      transaction:proof.transaction,output},null,2));
  }finally{
    if(open) await client.query('ROLLBACK');
    await client.end();
  }
}

if(require.main === module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports = {run,baselineService};
