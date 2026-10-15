'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {prepare,correctionSql}=require('./lib/scope-qv-dap-family-go');
const consolidation=require('../netlify/lib/_scope-quo-vadis-consolidation');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/qv-moa-consolide'),evidence=path.join(root,'docs/captures/qv-moa-consolide');
const source=JSON.parse(fs.readFileSync(path.join(out,'source.json'),'utf8'));
const preflight=JSON.parse(fs.readFileSync(path.join(out,'dap-preflight.json'),'utf8'));
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    await client.query("set lock_timeout='3s';set statement_timeout='30s';set time zone 'UTC'");
    const protectedTables=['scope_quo_vadis_obligations','scope_evenements','scope_affectations','scope_participations','scope_attendus','scope_journal_metier','scope_qv_publication_links','scope_event_code_allocations'];
    const original=await hashes(client.query.bind(client),protectedTables);
    await client.query('BEGIN');open=true;
    const targetsById=new Map(preflight.rows.map(({record})=>[record.obligation_id,record]));
    const shadows={scope_quo_vadis_obligations:source.preparations.map(row=>targetsById.get(row.obligation_id)||row),
      scope_quo_vadis_programmes:null,scope_quo_vadis_cursus_definitions:source.cursus,scope_competence_definitions:source.qualifications,
      scope_evenements:null,scope_qv_publication_links:null,scope_event_code_allocations:null,
      scope_journal_metier:null,scope_quo_vadis_proposals:null,scope_quo_vadis_calendar_days:null,
      scope_quo_vadis_cursus_programmes:null,scope_quo_vadis_cursus_step_programmes:null};
    for(const [table,rows] of Object.entries(shadows)){
      await client.query(`create temp table ${table} (like public.${table} including all) on commit drop`);
      await client.query(`insert into pg_temp.${table} select * from public.${table}`);
      if(rows){await client.query(`delete from pg_temp.${table}`);await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(rows)]);}
    }
    for(const [table,rows,key] of [['scope_evenements',source.events,'evenement_id'],['scope_qv_publication_links',source.links,'publication_unit_id']]){
      for(const row of rows){await client.query(`delete from pg_temp.${table} where ${key}=$1`,[row[key]]);
        await client.query(`insert into pg_temp.${table} select * from jsonb_populate_record(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(row)]);}
    }
    await client.query('update pg_temp.scope_quo_vadis_programmes set metadata=$2::jsonb,periode_debut=$3,periode_fin=$4 where programme_id=$1',
      [source.programme.programme_id,JSON.stringify(source.programme.metadata),source.programme.periode_debut,source.programme.periode_fin]);
    let queue=Promise.resolve(),n=0;
    const query=(sql,params)=>{const next=queue.then(()=>client.query(sql,params));queue=next.catch(()=>{});return next;};
    const database={query,transaction:async work=>{const name=`moa_${++n}`;await query(`SAVEPOINT ${name}`);
      try{const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}}};
    const service=createScopeQuoVadisService({database}),before=await service.listProgramme(2027);
    const {hooks}=createCatalogUiHarness();const html=hooks.renderQuoVadisProgrammeHtml(before);
    const select=id=>html.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`))[1];
    const options=id=>[...select(id).matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map(m=>({value:m[1],label:m[2]}));
    const families=['SDIS','DPS','DAP','JSP','Permanent','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR'];
    assert.deepEqual(L.qvProgrammeFamilyCatalogue(),families);
    assert.deepEqual(options('qv-filter-family').map(item=>item.value),['tous',...families,'__EMPTY__']);
    assert.ok(!options('qv-filter-family').some(item=>item.value==='Exercice'));
    assert.match(select('qv-filter-family'),/<optgroup label="Organisation">/);assert.match(select('qv-filter-family'),/<optgroup label="Formation">/);
    assert.deepEqual(options('qv-filter-oi').map(item=>item.value),['tous','SDIS','DPS','DPS:G1','DPS:C1','DPS:B1','DPS:B2','DAP','DAP:Y1','DAP:Y2','DAP:Y3','DAP:Y4','JSP','JSP:G1','JSP:C1','JSP:B1']);
    for(const [id,items,other,labeler] of [['qv-filter-cursus',before.cursusSelections,'Autres cursus',L.qvProgrammeCursusLabel],
      ['qv-filter-specialisation',before.qualifications,'Autres spécialisations',item=>item.label]]){
      const groups=L.qvProgrammeReferenceGroups(items,other,labeler);assert.equal(groups.flatMap(g=>g.items).length,items.length);
      for(const group of groups){assert.match(select(id),new RegExp(`<optgroup label="${group.group}">`));
        assert.deepEqual(group.items.map(labeler),group.items.map(labeler).sort((a,b)=>a.localeCompare(b,'fr')));}
      for(const item of items.filter(item=>!families.includes(item.domainCode))) assert.ok(groups.find(group=>group.group===other).items.includes(item));
    }
    const tests=['1-8: eleven families, Permanent, no selectable Exercice, empty last, native grey groups, catalogue-based French sorting, SDIS first'];
    await query('SAVEPOINT permanent');
    const ref=preflight.rows.find(({record})=>record.metadata.planningFields?.family==='DAP').record;
    const changed=await service.updateProgrammePreparation(ref.source_ref,{...ref.metadata.planningFields,year:2027,saveAction:'SAVE',family:'Permanent'},{actor:'recipe.p0'});
    const permanent=changed.quoVadis.canonicalProgramme.rows.find(row=>row.id===ref.source_ref);assert.equal(permanent.family,'Permanent');
    assert.equal(changed.quoVadis.breakdown.families.find(item=>item.code==='Permanent').total,1);
    assert.equal(hooks.filterQuoVadisProgrammeRows(changed.quoVadis,{family:'Permanent'}).length,1);
    const fiche=hooks.renderQuoVadisProgrammeFicheHtml(changed.quoVadis,ref.source_ref);
    assert.match(fiche,/<option value="Permanent" selected>Permanent<\/option>/);
    const reconduction=consolidation.proposedReconductionSnapshot({metadata:{businessValidation:{fields:{family:'Permanent',statCom:ref.statcom_code}}}});
    assert.equal(reconduction.fields.family,'Permanent');
    await query('ROLLBACK TO SAVEPOINT permanent');await query('RELEASE SAVEPOINT permanent');
    tests.push('3/12: actual service saves Permanent in a temporary fixture, statistics/filter retrieve it, reconduction retains it');
    const plan=prepare(preflight);assert.equal(plan.filter(row=>row.status==='CONFORME').length,16);
    fs.mkdirSync(out,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
    fs.writeFileSync(path.join(out,'dap-approved.sql'),correctionSql(plan,{commit:true}));
    const result=await query(correctionSql(plan,{manageTransaction:false}));
    const proof=result.at(-1).rows[0].proof;
    assert.equal(proof.results.filter(row=>row.status==='CORRECTED').length,16);
    assert.equal(proof.results.filter(row=>row.status==='CONFORME').length,16);
    const after=await service.listProgramme(2027),corrected=new Set(proof.results.filter(row=>row.status==='CORRECTED').map(row=>row.sourceRef));
    for(const old of before.canonicalProgramme.rows){
      const row=after.canonicalProgramme.rows.find(item=>item.id===old.id);assert.ok(row);
      for(const key of ['statCom','code','businessCode','domain','programmeDomain','startsAt','endsAt','oiSelections','ois','publics','responsible','themes','location','room',
        'status','publishedEventId','publishedEventCode','businessValidation','publicationRevision','humanDecision']) assert.deepEqual(row[key],old[key],`${row.id}:${key}`);
      assert.equal(row.family,corrected.has(row.id)?'DAP':old.family,`${row.id}:family`);
    }
    for(const entry of plan){const row=after.canonicalProgramme.rows.find(r=>r.id===entry.sourceRef);assert.equal(row.family,'DAP');}
    tests.push('9-13: exact authorised SQL corrects 16 remaining DAP families; 16 manual corrections untouched; all 32 exercise/cadre rows DAP; every protected field unchanged');
    // A fresh divergence blocks just that target; rerun is otherwise idempotent.
    await query('SAVEPOINT divergence');
    const first=plan.find(item=>item.status==='CANDIDATE');
    await query("update scope_quo_vadis_obligations set metadata=jsonb_set(metadata,'{planningFields,family}','\"Exercice\"'),updated_at=now() where obligation_id=$1",[first.id]);
    for(const table of ['moa_dap_targets','moa_dap_before','moa_dap_journal_before','moa_dap_integrity','moa_dap_results']) await query(`drop table ${table}`);
    const rerun=(await query(correctionSql(plan,{manageTransaction:false}))).at(-1).rows[0].proof;
    assert.equal(rerun.results.filter(row=>row.status==='BLOCKED').length,1);assert.equal(rerun.results.filter(row=>row.status==='CORRECTED').length,0);
    await query('ROLLBACK TO SAVEPOINT divergence');await query('RELEASE SAVEPOINT divergence');
    tests.push('11/12: concurrent target blocked individually, already-corrected targets remain untouched; rerun cannot overwrite later decisions');
    fs.writeFileSync(path.join(out,'current.json'),JSON.stringify(after));
    fs.writeFileSync(path.join(evidence,'dap-plan.json'),JSON.stringify({readAt:preflight.at,rows:plan},null,2)+'\n');
    await query('ROLLBACK');open=false;
    const final=await hashes(client.query.bind(client),protectedTables);assert.deepEqual(final,original);
    fs.writeFileSync(path.join(evidence,'targeted-results.json'),JSON.stringify({status:'PASS',tests,sourceReadAt:source.at,
      productionWrites:false,clone:DATABASE,rollbackVerified:true,publicCloneHashes:{before:original,after:final},
      familyCorrectionCloneProof:proof,rows:after.canonicalProgramme.rows.length},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,correctedInRollback:16,alreadyConform:16,rollbackVerified:true}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
