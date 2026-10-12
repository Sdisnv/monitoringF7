'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {Client} = require('pg');
const {createScopeQuoVadisService} = require('../netlify/lib/_scope-quo-vadis-service');
const {BASELINE,baselineService,currentService,responsibleMigration,preservedFields,input} = require('./scope-qv-moa-backend-20261012-helpers');
const ecawin = require('../assets/js/scope-ecawin');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const getRow = (data,id) => data.canonicalProgramme.rows.find(row => row.id === id);

async function fingerprint(client,table){
  assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
  return (await client.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from ${table} t`)).rows[0];
}

async function run(){
  const client = new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();
  let open = false;
  const report = {sourceBaseline:BASELINE,database:DATABASE,host:'127.0.0.1',port:5432,productionWrites:false};
  try{
    const identity = (await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity,{name:DATABASE,host:'127.0.0.1/32',port:5432});
    const tables = (await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row => row.tablename);
    const before = {};
    for(const table of tables) before[table] = await fingerprint(client,table);
    await client.query('begin');
    open = true;
    let queue = Promise.resolve();
    const query = (...args) => {
      const next = queue.then(() => client.query(...args));
      queue = next.catch(() => {});
      return next;
    };
    const database = {query,transaction:work => work({query})};
    const service = createScopeQuoVadisService({database});
    const baseline = baselineService();
    const rawBefore = baseline.rawProgramme2027().rows;
    const rawAfter = currentService().rawProgramme2027().rows;
    assert.deepEqual(preservedFields(rawAfter),preservedFields(rawBefore));
    report.sourceOverlayRowsCompared = rawAfter.length;
    const original = await baseline.createScopeQuoVadisService({database}).listProgramme(2027);
    const current = await service.listProgramme(2027);
    assert.deepEqual(preservedFields(current.canonicalProgramme.rows),preservedFields(original.canonicalProgramme.rows));
    const nativeBefore = original.canonicalProgramme.rows;
    const nativeAfter = current.canonicalProgramme.rows;
    console.log(JSON.stringify({sourceOverlayRows:rawBefore.length,nativeRows2027:nativeBefore.length}));
    assert.equal(nativeBefore.length,867);
    assert.deepEqual(preservedFields(nativeAfter),preservedFields(nativeBefore));
    report.rawRows2027Compared = nativeAfter.length;
    report.rawStatComEqual = nativeAfter.length;
    report.rawIdsUnchanged = true;
    report.rows2027Compared = current.canonicalProgramme.rows.length;
    report.statComEqual = report.rows2027Compared;
    const decisions = (await client.query(`select source_ref,metadata->'planningFields' as fields
      from scope_quo_vadis_obligations where metadata->>'source'='QV_PROGRAMME_PREPARATION'
        and (metadata->>'humanDecision'='true' or metadata ? 'businessValidation')`)).rows;
    const explicit = new Map(decisions.map(row => [row.source_ref,row.fields || {}]));
    let defaulted = 0;
    let undecided = 0;
    for(const row of current.canonicalProgramme.rows){
      const fields = explicit.get(row.id);
      if(fields && Object.prototype.hasOwnProperty.call(fields,'ecawinActivityCode')){
        assert.equal(row.ecawinActivityCode,fields.ecawinActivityCode);
      }else if(ecawin.activityForStatCom(row.statCom) === 'EXERCI'){
        assert.equal(row.ecawinActivityCode,'EXERCI');
        defaulted++;
      }else{
        assert.equal(row.ecawinActivityCode,'');
        undecided++;
      }
    }
    report.confirmedExerciDefaults = defaulted;
    report.otherOrUnknownNotForced = undecided;
    const nonForced = current.ecawinCorrespondence.filter(row=>row.activityCode !== 'EXERCI')
      .map(row=>({id:row.programmeItemId,label:row.scopeDescription,statCom:row.statCom,
        activityCode:row.activityCode,suggestedActivityCode:row.suggestedActivityCode,status:row.status}));
    const stableBefore = (await client.query('select * from scope_responsable_fonctions order by code')).rows;
    const migrate = responsibleMigration(database);
    await migrate();
    const stableAfter = (await client.query('select * from scope_responsable_fonctions order by code')).rows;
    assert.deepEqual(stableAfter.map(row => row.code),stableBefore.map(row => row.code));
    for(const old of stableBefore){
      const migrated = stableAfter.find(row => row.code === old.code);
      assert.equal(migrated.actif,old.actif);
      assert.deepEqual(migrated.created_at,old.created_at);
      if(/^Présidente (CI|Codir)$/.test(old.code)) assert.equal(migrated.libelle,old.code.replace('Présidente ','PrésidentE '));
      else assert.deepEqual(migrated,old);
    }
    const referenceHash = await fingerprint(client,'scope_responsable_fonctions');
    await migrate();
    assert.deepEqual(await fingerprint(client,'scope_responsable_fonctions'),referenceHash);
    report.responsibleStableCodesPreserved = true;
    report.inclusiveMigrationIdempotent = true;
    const series = current.canonicalProgramme.rows.filter(row => /^Exercice PR 1\.[1-6]$/.test(row.eventDisplayLabel));
    assert.equal(series.length,6);
    for(const row of series){
      for(let pass=0;pass<2;pass++){
        const saved = await service.updateProgrammePreparation(row.id,input(row));
        const reopened = getRow(saved.quoVadis,row.id);
        assert.equal(reopened.activityLabel,row.eventDisplayLabel);
        assert.deepEqual(reopened.themes,row.themes);
        assert.equal(reopened.statCom,row.statCom);
        assert.equal(reopened.code,row.code);
      }
    }
    report.prTitlesAndThemesPreserved = series.map(row => row.eventDisplayLabel);
    const row = series[5];
    const selections = [{kind:'REFERENCE',code:'Présidente Codir'},{kind:'REFERENCE',code:'Présidente CI'},
      {kind:'FREE',label:'Présidente  libre'},{kind:'FREE',label:'À affecter'}];
    const saved = await service.updateProgrammePreparation(row.id,input(row,{responsibleSelections:selections,
      publicCodes:['CMDT:CODIR'],publicFreeLabels:['Invités  libres'],participationEvaluation:false,saveAction:'VALIDATE'}));
    const selected = getRow(saved.quoVadis,row.id);
    assert.equal(selected.responsibleSelections[0].code,'Présidente Codir');
    assert.equal(selected.responsibleSelections[0].label,'PrésidentE Codir');
    assert.equal(selected.responsibleSelections[1].label,'PrésidentE CI');
    assert.equal(selected.responsibleSelections[2].label,'Présidente  libre');
    assert.equal(selected.responsibleSelections.length,3);
    assert.deepEqual(selected.publics,['CMDT:CODIR']);
    assert.equal(selected.participationEvaluation,false);
    const obligation = (await client.query(`select * from scope_quo_vadis_obligations where source_ref=$1
      and programme_id=(select programme_id from scope_quo_vadis_programmes where annee=2027 order by created_at desc limit 1)`,[row.id])).rows[0];
    assert.equal(obligation.metadata.planningFields.participationEvaluation,false);
    assert.equal(obligation.metadata.businessValidation.fields.participationEvaluation,false);
    await client.query(`update scope_quo_vadis_obligations set metadata=jsonb_set(metadata,
      '{planningFields,responsibleSelections,0,label}',$2::jsonb) where obligation_id=$1`,
    [obligation.obligation_id,JSON.stringify('Présidente  Codir historique')]);
    const resaved = await service.updateProgrammePreparation(row.id,input(row,{responsibleSelections:selections}));
    assert.equal(getRow(resaved.quoVadis,row.id).responsibleSelections[0].label,'Présidente  Codir historique');
    await service.updateActivityPlanning(obligation.obligation_id,{salleTheorieId:null});
    const reopened = getRow(await service.listProgramme(2027),row.id);
    assert.equal(reopened.participationEvaluation,false);
    assert.equal(reopened.activityLabel,row.eventDisplayLabel);
    report.flagAndHistoricalLabelsPersisted = true;
    for(const statCom of ['010JY3','COURJS']){
      await client.query(`update scope_quo_vadis_obligations set statcom_code=$2,
        metadata=jsonb_set(metadata,'{planningFields,statCom}',$3::jsonb) where obligation_id=$1`,
      [obligation.obligation_id,statCom,JSON.stringify(statCom)]);
      const savedHistorical = await service.updateProgrammePreparation(row.id,input(row,{statCom,ecawinActivityCode:'EXERCI'}));
      assert.equal(getRow(savedHistorical.quoVadis,row.id).statCom,statCom);
      assert.equal(savedHistorical.quoVadis.ecawinCorrespondence.find(item => item.programmeItemId === row.id).exportable,false);
    }
    report.incompatibleHistoricalStatComPreserved = true;
    await client.query('rollback');
    open = false;
    const after = {};
    for(const table of tables) after[table] = await fingerprint(client,table);
    assert.deepEqual(after,before,'Clone content changed after ROLLBACK');
    report.rollbackAllTablesUnchanged = tables.length;
    report.status = 'PASS';
    const output = path.resolve(__dirname,'../docs/captures/qv-moa-20261012/backend-clone-integrity.json');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    fs.writeFileSync(path.join(path.dirname(output),'ecawin-non-forced-2027.json'),JSON.stringify({
      sourceBaseline:BASELINE,description:'Autres activités ou cas non qualifiés : conservés, aucune attribution forcée.',
      count:nonForced.length,occurrences:nonForced},null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }finally{
    if(open) await client.query('rollback');
    await client.end();
  }
}

run().catch(error => {console.error(error);process.exitCode=1;});
