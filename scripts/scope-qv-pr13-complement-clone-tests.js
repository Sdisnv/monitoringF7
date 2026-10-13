'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const reconciliation=require('../netlify/lib/_scope-qv-programme-reconciliation');
const logic=require('../assets/js/scope-ui-logic');
const planner=require('../netlify/lib/_scope-qv-publication-plan');
const hsc=require('../netlify/lib/_scope-hsc-preflight');
const ddl=require('../netlify/lib/_scope-qv-moa-20261013-ddl');
const {DATABASE,directory,hashes,rowEvidence}=require('./scope-qv-pr13-complement-diagnostic');
const {BASELINE,baselineService,seedPublishedAliases,migrate}=require('./lib/scope-qv-pr13-complement-recipe');
const root=path.resolve(__dirname,'..');
async function run() {
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  const results=[],collisions=[];
  const record=async(name,work)=>{await work();results.push({name,status:'PASS'});console.log('PASS '+name);};
  try {
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client.query.bind(client),tables);
    const responsibleCodes=(await client.query('select code from scope_responsable_fonctions order by code')).rows;
    const preflight=fs.readFileSync(path.join(root,'database/ops/20261013_scope_hsc_preflight_readonly.sql'),'utf8');
    await record('standalone production HSC preflight is executable and strictly read-only on clone',async()=>{
      assert.ok(preflight.includes(hsc.guard));assert.ok(preflight.includes('BEGIN READ ONLY;'));
      const result=await client.query(preflight.replace(/^\\set ON_ERROR_STOP on\n/,''));
      assert.ok(result.some(item=>item.rows?.some(row=>row.result==='HSC_PREFLIGHT_READY_FOR_MOA')));
      assert.deepEqual(await hashes(client.query.bind(client),tables),before);
    });
    await client.query('BEGIN');open=true;
    await client.query("set local lock_timeout='3s'");
    await client.query('select pg_advisory_xact_lock(hashtext($1))',['SCOPE_ROADMAP_V1_CLONE_RECIPE']);
    let queue=Promise.resolve(),number=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const adapter={query,transaction:async work=>{
      const name=`pr13_${++number}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}
    }};
    const previous=baselineService()({database:adapter}),baseline=await previous.listProgramme(2027);
    const aliases=await seedPublishedAliases(query,baseline);
    const old=await previous.listProgramme(2027);
    const newService=createScopeQuoVadisService({database:adapter});
    await record('targeted migration guard is shared with standalone SQL and idempotent',async()=>{
      assert.ok(fs.readFileSync(path.join(root,'database/migrations/20261013_scope_qv_moa_consolidated.sql'),'utf8')
        .includes(ddl.statements.join(';\n\n')));
      await migrate(query);const once=await hashes(query,tables);await migrate(query);
      assert.deepEqual(await hashes(query,tables),once);
      await query(fs.readFileSync(path.join(root,'database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    });
    let qv=await newService.listProgramme(2027);
    await record('both exact published aliases are reconciled once without writes to either preparation or publication',async()=>{
      for(const id of aliases) {
        const prior=old.canonicalProgramme.rows.find(row=>row.id===id),current=qv.canonicalProgramme.rows.find(row=>row.id===id);
        assert.ok(prior && logic.qvProgrammeIsActive(prior));
        assert.equal(current.programmeReconciliation?.status,'LINKED_TO_PUBLISHED_OCCURRENCE',JSON.stringify(qv.publicationReconciliation));
        assert.equal(logic.qvProgrammeIsActive(current),false);
        const original=qv.canonicalProgramme.rows.find(row=>row.id===current.programmeReconciliation.itemId);
        assert.equal(original.publishedEventId,current.programmeReconciliation.eventId);
        for(const field of ['statCom','businessCode','code','definitionId','occurrenceId','sessionId','humanDecision'])
          assert.deepEqual(current[field],prior[field],id+':'+field);
        collisions.push({environment:'CONTROLLED_CLONE_FIXTURE_NOT_PRODUCTION',before:[rowEvidence(original),rowEvidence(prior)],
          after:{activeItemId:original.id,eventId:original.publishedEventId,aliasPreserved:rowEvidence(current)}});
        assert.equal(planner.readiness({programmeReconciliation:current.programmeReconciliation},{}).action,'NOT_PUBLISHED');
        const stable=await hashes(query,['scope_evenements','scope_quo_vadis_obligations','scope_participations','scope_affectations','scope_attendus','scope_journal_metier']);
        await assert.rejects(newService.updateProgrammePreparation(id,{year:2027,saveAction:'SAVE',
          ...require('../netlify/lib/_scope-qv-programme-revisions').fieldsFromProgrammeRow(current,qv)}),
          error=>error.error==='programme_occurrence_deja_publiee');
        assert.deepEqual(await hashes(query,Object.keys(stable)),stable);
      }
      assert.equal(qv.publicationReconciliation.blocking,false);
      for(const id of ['qv-source-870','qv-source-888']) {
        const source=qv.canonicalProgramme.rows.find(row=>row.id===id);
        const fields=require('../netlify/lib/_scope-qv-programme-revisions').fieldsFromProgrammeRow(source,qv);
        const created=await newService.createProgrammePreparation({year:2027,domain:'F7',activityLabel:fields.activityLabel,
          date:fields.date,startTime:fields.startTime,endTime:fields.endTime,statCom:fields.statCom,oiCodes:fields.oiCodes});
        assert.equal(created.reason,'PROGRAMME_OCCURRENCE_EXISTS');assert.equal(created.existingItemId,id);
      }
    });
    await record('different OI, actual year, session, theme or decision is not silently collapsed',async()=>{
      const row=qv.canonicalProgramme.rows.find(row=>row.id==='qv-source-870');
      for(const patch of [
        {startsAt:'2028-01-18T19:00',endsAt:'2028-01-18T21:00'},
        {ois:['DAP:Y3'],oiSelections:['DAP:Y3']},{sessionIndex:2},{statCom:'013Y3'}
      ]) {
        assert.equal(reconciliation.reconcilePublishedOccurrences([row,{...row,...patch,id:'legitimate',publishedEventId:null}]).entries.length,0);
        collisions.push({environment:'UNIT_CASE',status:'EXCLUDED_DISTINCT_OCCURRENCE',difference:patch});
      }
      const changed={...row,id:'human-theme',publishedEventId:null,themes:['Décision distincte']};
      const resolved=reconciliation.reconcilePublishedOccurrences([row,changed]);
      assert.equal(resolved.blocking,true);assert.equal(logic.qvProgrammeIsActive(resolved.rows[1]),true);
      const index=qv.canonicalProgramme.rows.findIndex(item=>item.id===aliases[0]);
      await query('SAVEPOINT distinct_decision');
      await query(`update scope_quo_vadis_obligations set metadata=jsonb_set(metadata,'{planningFields,themes}',$2::jsonb)
        where source_ref=$1`,[aliases[0],JSON.stringify(['Décision distincte'])]);
      const actual=await newService.listProgramme(2027);assert.equal(actual.publicationReconciliation.blocking,true);
      assert.ok(index>=0);
      await assert.rejects(newService.setProgrammeStatus(2027,{statut:'VALIDE'}),error=>error.error==='programme_publication_rapprochement_bloquant');
      await query('ROLLBACK TO SAVEPOINT distinct_decision');await query('RELEASE SAVEPOINT distinct_decision');
    });
    await record('DAP sessions 1.1/1.2 are restored from real 2026 sources, distinct from DPS, without invented hours or themes',async()=>{
      const grouped=qv.canonicalProgramme.rows.filter(row=>/^Formation groupée DAP 1\.[12]$/.test(row.label));
      assert.equal(grouped.length,2);
      for(const [index,row] of grouped.entries()) {
        assert.equal(row.statCom,'0130F7');assert.deepEqual(row.oiSelections.slice().sort(),['DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4']);
        assert.equal(row.sessionCount,2);assert.equal(row.sessionIndex,index+1);assert.equal(row.occurrenceId,'QV27:DAP-GROUP:1');
        assert.equal(row.dapGroupedProposal.sourceDate,['2026-04-23','2026-05-07'][index]);
        assert.equal(row.dapGroupedProposal.proposedDate,['2027-04-22','2027-05-06'][index]);
        assert.equal(row.startsAt,null);assert.equal(row.endsAt,null);assert.deepEqual(row.themes,[]);assert.deepEqual(row.publics,[]);
        assert.deepEqual(row.publicFreeLabels,['DAP']);
        assert.equal(row.publishedEventId,undefined);
      }
      for(const row of baseline.canonicalProgramme.rows.filter(row=>/^Formation groupée 1\./.test(row.label)))
        assert.deepEqual(qv.canonicalProgramme.rows.find(item=>item.id===row.id),row);
      const dapExercises=qv.canonicalProgramme.rows.filter(row=>logic.qvProgrammeIsActive(row) && /^Exercice DAP [1-5]$/.test(row.label));
      assert.equal(dapExercises.length,16);assert.ok(dapExercises.every(row=>row.label!=='Exercice DAP 5'));
      const same=reconciliation.restoreDapGroupedFormation(qv.canonicalProgramme.rows,[],[]);
      assert.equal(same.rows.length,qv.canonicalProgramme.rows.length);
    });
    await record('confirmed manual DAP programming is reused instead of duplicated or overwritten',async()=>{
      await query('SAVEPOINT manual_dap');
      const source=qv.canonicalProgramme.rows.find(row=>row.id==='QV27:DAP-GROUP:1.1');
      const fields={activityLabel:source.label,domain:'F7',statCom:source.statCom,date:'2027-04-22',startTime:'18:30',endTime:'21:30',
        oiCodes:source.oiSelections,publicCodes:[],themes:['Thème humain conservé'],responsibleLabel:'C DAP'};
      await query(`insert into scope_quo_vadis_obligations(programme_id,source_type,source_ref,title,domain,statcom_code,metadata)
        values($1,'MANUAL','QV27:MANUAL:RECIPE-DAP-GROUP',$2,'DAP',$3,$4::jsonb)`,
        [qv.programme.programmeId,source.label,source.statCom,JSON.stringify({source:'QV_PROGRAMME_PREPARATION',humanDecision:true,
          manualSource:{id:'QV27:MANUAL:RECIPE-DAP-GROUP',label:source.label,domain:'F7',manualCreation:true},planningFields:fields})]);
      const actual=await newService.listProgramme(2027),rows=actual.canonicalProgramme.rows.filter(row=>row.label===source.label);
      assert.equal(rows.length,1);assert.equal(rows[0].id,'QV27:MANUAL:RECIPE-DAP-GROUP');assert.deepEqual(rows[0].themes,fields.themes);
      assert.equal(rows[0].startsAt.slice(0,16),'2027-04-22T18:30');
      await query('ROLLBACK TO SAVEPOINT manual_dap');await query('RELEASE SAVEPOINT manual_dap');
    });
    await record('HSC migration blocks malformed codes, alias collisions and conflicting allocation links',async()=>{
      const ids=['qv-source-870','qv-source-888'].map(id=>qv.canonicalProgramme.rows.find(row=>row.id===id).publishedEventId);
      const cases=[
        {sql:"update scope_evenements set code_cours='HSC.000' where evenement_id=$1",params:[ids[0]],error:/HSC_INVALID_CODE/},
        {sql:"update scope_quo_vadis_obligations set metadata=metadata || jsonb_build_object('businessCode',case source_ref when 'qv-source-870' then 'SCOPE-000041' else 'HSC.041' end) where source_ref in ('qv-source-870','qv-source-888')",params:[],error:/HSC_ALIAS_COLLISION/},
        {sql:"update scope_evenements set code_cours='HSC.042' where evenement_id=$1",params:[ids[0]],error:/HSC_ALLOCATION_MISMATCH/}
      ];
      for(const test of cases) {
        await query('SAVEPOINT invalid_hsc');await query(test.sql,test.params);
        await assert.rejects(adapter.transaction(tx=>tx.query(hsc.guard)),test.error);
        await query('ROLLBACK TO SAVEPOINT invalid_hsc');await query('RELEASE SAVEPOINT invalid_hsc');
      }
    });
    qv=await newService.listProgramme(2027);
    const current=new Map(qv.canonicalProgramme.rows.map(row=>[row.id,row]));
    for(const row of baseline.canonicalProgramme.rows) {
      const after=current.get(row.id);assert.ok(after,row.id);
      for(const field of ['statCom','code','businessCode','definitionId','occurrenceId','sessionId','publishedEventId','publishedEventCode'])
        assert.deepEqual(after[field],row[field],`${row.id}:${field}`);
    }
    const during=await hashes(query,tables);
    for(const table of ['scope_evenements','scope_qv_publication_links','scope_event_code_allocations','scope_event_code_sequences',
      'scope_affectations','scope_participations','scope_attendus','scope_journal_metier','scope_personnes'])
      assert.deepEqual(during[table],before[table],table);
    assert.deepEqual((await query('select code from scope_responsable_fonctions order by code')).rows,responsibleCodes);
    await client.query('ROLLBACK');open=false;const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    const proof={baseline:BASELINE,database:DATABASE,productionWrites:false,productionSql:'NOT_VERIFIED',results,collisions,
      dap:qv.canonicalProgramme.rows.filter(row=>row.dapGroupedProposal).map(row=>({...rowEvidence(row),proposal:row.dapGroupedProposal})),
      statComComparison:{compared:baseline.canonicalProgramme.rows.length,identical:baseline.canonicalProgramme.rows.length,differences:[]},
      preserved:'Published events, allocations, assignments, attendance, personnel and journal byte-identical; responsible codes unchanged',
      rollback:{tables:tables.length,status:'PASS'},before,after,status:'PASS'};
    fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'postgres-integrity.json'),JSON.stringify(proof,null,2)+'\n');
    console.log(JSON.stringify({tests:results.length,statCom:proof.statComComparison,rollback:proof.rollback}));
  } finally {if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
