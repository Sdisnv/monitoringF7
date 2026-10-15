'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Client}=require('pg');
const {DATABASE,hashes}=require('./scope-qv-pr13-complement-diagnostic');
const {correctionSql}=require('./lib/scope-qv-ci-foca-go');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const L=require('../assets/js/scope-ui-logic');
const root=path.resolve(__dirname,'..'),out=path.join(root,'output/qv-complement'),evidence=path.join(root,'docs/captures/qv-complement');
const source=JSON.parse(fs.readFileSync(path.join(out,'source.json'),'utf8'));
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});await client.connect();let open=false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    await client.query("set lock_timeout='3s';set statement_timeout='60s'");
    const tables=['scope_quo_vadis_obligations','scope_evenements','scope_affectations','scope_participations','scope_attendus','scope_journal_metier',
      'scope_qv_publication_links','scope_event_code_allocations','scope_quo_vadis_cursus_definitions','scope_quo_vadis_cohortes','scope_person_qualifications'];
    const original=await hashes(client.query.bind(client),tables);await client.query('BEGIN');open=true;
    const shadows={scope_quo_vadis_obligations:source.preparations,scope_quo_vadis_cursus_definitions:source.cursus,
      scope_competence_definitions:source.qualifications,scope_quo_vadis_programmes:null,scope_evenements:null,scope_qv_publication_links:null,
      scope_journal_metier:null,scope_event_code_allocations:null,scope_quo_vadis_proposals:null,scope_quo_vadis_calendar_days:null,
      scope_quo_vadis_cursus_programmes:null,scope_quo_vadis_cursus_step_programmes:null};
    for(const [table,rows] of Object.entries(shadows)){
      await client.query(`create temp table ${table} (like public.${table} including all) on commit drop`);
      if(rows) await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(rows)]);
      else await client.query(`insert into pg_temp.${table} select * from public.${table}`);
    }
    for(const [table,rows,key] of [['scope_evenements',source.events,'evenement_id'],['scope_qv_publication_links',source.links,'publication_unit_id']])
      for(const row of rows){await client.query(`delete from pg_temp.${table} where ${key}=$1`,[row[key]]);
        await client.query(`insert into pg_temp.${table} select * from jsonb_populate_record(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(row)]);}
    await client.query('update scope_quo_vadis_programmes set metadata=$2::jsonb,periode_debut=$3,periode_fin=$4 where programme_id=$1',
      [source.programme.programme_id,JSON.stringify(source.programme.metadata),source.programme.periode_debut,source.programme.periode_fin]);
    let queue=Promise.resolve();const query=(sql,params)=>{const next=queue.then(()=>client.query(sql,params));queue=next.catch(()=>{});return next;};
    const service=createScopeQuoVadisService({database:{query}}),before=await service.listProgramme(2027);
    const proof=(await query(correctionSql({manageTransaction:false}))).at(-1).rows[0].proof;
    assert.equal(proof.results.filter(row=>row.status==='CORRECTED').length,2);
    const after=await service.listProgramme(2027);
    assert.deepEqual(after.canonicalProgramme.rows,before.canonicalProgramme.rows);
    const {hooks}=createCatalogUiHarness();const html=hooks.renderQuoVadisProgrammeHtml(after);
    const foca=html.match(/<select id="qv-filter-cursus"[^>]*>[\s\S]*?<optgroup label="FOCA">([\s\S]*?)<\/optgroup>/)[1];
    assert.ok(foca.indexOf('Cursus C groupe')<foca.indexOf('Cursus CI DAP'));assert.ok(foca.indexOf('Cursus CI DAP')<foca.indexOf('Cursus CI DPS'));
    for(const code of ['CI-DAP','CI-DPS']){
      const previous=before.cursusSelections.find(item=>item.code===code),next=after.cursusSelections.find(item=>item.code===code);
      assert.equal(next.domainCode,'FOCA');assert.equal(next.cursusId,previous.cursusId);
    }
    const conduites=after.canonicalProgramme.rows.filter(row=>row.conduiteRule==='QV-DAP-001');assert.equal(conduites.length,16);
    for(const row of conduites){assert.equal(row.conduiteSlots.length,4);assert.equal(row.conduiteSlots[0].conduiteStartsAt.slice(11),'18:30');}
    // A future lineage fixture uses the same existing slot source, without operational creation.
    await query('SAVEPOINT future');
    let future=(await query('select programme_id from scope_quo_vadis_programmes where annee=2028')).rows[0];
    if(!future){
      future={...source.programme,programme_id:require('node:crypto').randomUUID(),annee:2028,code:'RECIPE-QV-2028',
        libelle:'Fixture reconduction 2028',periode_debut:'2028-01-01',periode_fin:'2028-12-31',metadata:{source:'RECIPE_ONLY'}};
      await query('insert into pg_temp.scope_quo_vadis_programmes select * from jsonb_populate_record(null::pg_temp.scope_quo_vadis_programmes,$1::jsonb)',[JSON.stringify(future)]);
    }
    const parent=conduites[0],row=source.preparations.find(item=>item.source_ref===parent.id);
    const fixture={...row,obligation_id:require('node:crypto').randomUUID(),programme_id:future.programme_id,source_ref:'RECIPE:CONDUITE:DAP:2028',
      title:parent.label,source_type:'HISTORIQUE',include_in_programme:true,statcom_code:'01522F7',imposed_start_at:'2028-03-01T18:30:00+01:00',imposed_end_at:'2028-03-01T21:30:00+01:00',
      metadata:{lineage:{key:'RECIPE:DAP:2028'},activityType:'Conduite',reconductedBusiness:{family:'AUTO',domain:'F7',oiCodes:['DAP:Y1'],publicCodes:['AUTO:3']}}};
    await query('insert into pg_temp.scope_quo_vadis_obligations select * from jsonb_populate_record(null::pg_temp.scope_quo_vadis_obligations,$1::jsonb)',[JSON.stringify(fixture)]);
    const nextYear=(await service.listProgramme(2028)).canonicalProgramme.rows.find(item=>item.id===fixture.source_ref);
    assert.equal(nextYear.conduiteSlots.length,4);assert.equal(nextYear.conduiteSlots[0].conduiteStartsAt.slice(11),'18:30');
    await query('ROLLBACK TO SAVEPOINT future');await query('RELEASE SAVEPOINT future');
    const freeRows=after.canonicalProgramme.rows.filter(row=>(row.publicFreeLabels || []).some(label=>L.qvProgrammePublicReferenceCode(label)!==label));
    for(const row of freeRows) for(const label of row.publicFreeLabels){
      const code=L.qvProgrammePublicReferenceCode(label);if(code!==label) assert.ok(hooks.filterQuoVadisProgrammeRows(after,{cible:code}).some(item=>item.id===row.id));
    }
    fs.mkdirSync(out,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
    fs.writeFileSync(path.join(out,'current.json'),JSON.stringify(after));
    await query('ROLLBACK');open=false;const final=await hashes(client.query.bind(client),tables);assert.deepEqual(final,original);
    fs.writeFileSync(path.join(evidence,'clone-results.json'),JSON.stringify({status:'PASS',clone:DATABASE,rollbackVerified:true,productionWrites:false,
      checks:['T-W: deux cursus existants sous FOCA, mêmes identifiants, ordre filtre/fiche commun',
        'A-G: 16 conduites DAP, quatre places exactes ; restitution 2028 via fixture de lignée sur le moteur existant',
        'R-S: publics libres reconnus par les filtres sans conversion persistante',
        'X-Z: toutes les lignes Programme identiques après rattachement, Stat.Com/codes et historiques conservés'],
      cursus:proof,rows:after.canonicalProgramme.rows.length,publicHashes:{before:original,after:final}},null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',cursus:2,dap:conduites.length,rows:after.canonicalProgramme.rows.length,rollbackVerified:true}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
