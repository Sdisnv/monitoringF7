'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const {createScopeQuoVadisService}=require('../netlify/lib/_scope-quo-vadis-service');
const {baselineService}=require('./lib/scope-qv-pr13-complement-recipe');
const {createCatalogUiHarness}=require('./scope-annual-catalog-ui-harness');
const {hashes,DATABASE}=require('./scope-qv-pr13-complement-diagnostic');
const L=require('../assets/js/scope-ui-logic');
const consolidation=require('../netlify/lib/_scope-quo-vadis-consolidation');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'output/qv-familles-filtres');
const evidence=path.join(root,'docs/captures/qv-familles-filtres');
const families=['SDIS','DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR'];
const source=JSON.parse(fs.readFileSync(path.join(out,'production-readonly.json'),'utf8'));
const publications=JSON.parse(fs.readFileSync(path.join(out,'production-publications-readonly.json'),'utf8'));

function inventory(qv){
  return qv.canonicalProgramme.rows.map(row=>{
    const stored=source.preparations.find(item=>item.source_ref===row.id);
    const ois=L.qvProgrammeConfirmedOiCodes(row);
    const dap=L.qvProgrammeFilterType(row)==='Exercice'
      && L.qvProgrammeProposedFamily({...row,family:'Exercice'})==='DAP';
    const current=row.family || '';
    const expected=dap?'DAP':families.includes(current)?current:null;
    const category=expected && current!==expected?'ANOMALIE_CERTAINE':expected?'CONFORME':'ARBITRAGE_MOA';
    return {id:row.id,technicalId:stored?.obligation_id || row.publishedEventId || row.id,
      date:row.startsAt?.slice(0,10) || '',activity:row.activityLabel || row.label,statCom:row.statCom || '',
      ois,currentFamily:current,expectedFamily:expected,nature:L.qvProgrammeFilterType(row),category,
      justification:dap?'Définition canonique Exercice DAP + nature Exercice + Stat.Com officiel 013Yx + OI qualifié DAP:Yx ; décision MOA du 15.10.2026'
        :expected?'Famille explicite appartenant au référentiel MOA ; aucune réinterprétation'
          :'Famille absente ou ancienne nature ; correspondance non démontrée, décision MOA requise',
      certainty:expected?'CERTAIN':'NON_DEMONTRE',humanDecision:stored?.metadata?.humanDecision===true,
      publishedEventId:row.publishedEventId || null,sourceFamily:stored?.metadata?.canonicalRow?.family || '',
      status:row.status,active:L.qvProgrammeIsActive(row),updatedAt:stored?.updated_at || null};
  });
}

async function run(){
  assert.equal(source.readOnly,'on');assert.equal(publications.readOnly,'on');
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  const tests=[];
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    await client.query("set lock_timeout='3s'; set statement_timeout='30s'");
    const tables=['scope_quo_vadis_programmes','scope_quo_vadis_obligations','scope_evenements','scope_qv_publication_links',
      'scope_affectations','scope_participations','scope_attendus','scope_journal_metier','scope_event_code_allocations'];
    const initial=await hashes(client.query.bind(client),tables);
    await client.query('BEGIN');open=true;
    await client.query("set local lock_timeout='3s'; set local statement_timeout='30s'");
    // Session-private tables leave the existing MOA recipe, its locks and all public data untouched.
    const shadows={scope_quo_vadis_programmes:null,scope_quo_vadis_obligations:source.preparations,
      scope_quo_vadis_cursus_definitions:source.cursus,scope_competence_definitions:publications.qualifications,
      scope_evenements:null,scope_qv_publication_links:null,scope_event_code_allocations:null,
      scope_journal_metier:null,scope_quo_vadis_proposals:null,scope_quo_vadis_calendar_days:null,
      scope_quo_vadis_cursus_programmes:null,scope_quo_vadis_cursus_step_programmes:null,scope_event_code_sequences:null};
    for(const [table,rows] of Object.entries(shadows)){
      await client.query(`create temp table ${table} (like public.${table} including all) on commit drop`);
      await client.query(`insert into pg_temp.${table} select * from public.${table}`);
      if(rows){
        await client.query(`delete from pg_temp.${table}`);
        await client.query(`insert into pg_temp.${table} select * from jsonb_populate_recordset(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(rows)]);
      }
    }
    // The live recipe holds a DDL lock on this new table. Only its code-reader is needed by the creation fixture.
    await client.query('create temp table scope_qv_publication_activities (business_code text) on commit drop');
    await client.query('update pg_temp.scope_quo_vadis_programmes set metadata=$2::jsonb,periode_debut=$3,periode_fin=$4 where programme_id=$1',
      [source.programme.programme_id,JSON.stringify(source.programme.metadata),source.programme.periode_debut,source.programme.periode_fin]);
    for(const [table,rows,key] of [['scope_evenements',publications.events,'evenement_id'],
      ['scope_qv_publication_links',publications.links,'publication_unit_id'],['scope_event_code_allocations',publications.allocations || [],'evenement_id']]){
      for(const row of rows){
        await client.query(`delete from pg_temp.${table} where ${key}=$1`,[row[key]]);
        await client.query(`insert into pg_temp.${table} select * from jsonb_populate_record(null::pg_temp.${table},$1::jsonb)`,[JSON.stringify(row)]);
      }
    }
    let savepoint=0;
    let queue=Promise.resolve();
    const query=async(sql,params)=>{
      const write=String(sql).match(/\b(?:insert\s+into|update|delete\s+from)\s+([a-z_.]+)/i);
      if(write) assert.ok(Object.hasOwn(shadows,write[1].replace('pg_temp.','')),`Unexpected write target: ${write[1]}`);
      const next=queue.then(()=>client.query(sql,params));queue=next.catch(()=>{});return next;
    };
    const database={query,transaction:async work=>{
      const name=`families_${++savepoint}`;await query(`SAVEPOINT ${name}`);
      try{const value=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return value;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}
    }};
    const baseline=await baselineService('95d8bdff3f2c923f5d4e5a81a6fd1e3cc9bdd43c')({database}).listProgramme(2027);
    const service=createScopeQuoVadisService({database});
    const qv=await service.listProgramme(2027);
    const before=baseline.canonicalProgramme.rows;
    assert.equal(qv.canonicalProgramme.rows.length,before.length);
    const protectedFields=['id','family','domain','programmeDomain','statCom','code','businessCode','ois','oiSelections','publics',
      'startsAt','endsAt','themes','businessValidation','humanDecision','publishedEventId','publishedEventCode','publicationRevision'];
    for(const old of before){
      const row=qv.canonicalProgramme.rows.find(item=>item.id===old.id);assert.ok(row);
      for(const field of protectedFields) assert.deepEqual(row[field],old[field],`${row.id}:${field}`);
    }
    tests.push('K/L: all persisted occurrence identities, families, dates, OI, Stat.Com, decisions and publications identical to main');
    assert.deepEqual(L.qvProgrammeFamilyCatalogue(before),families);
    const examples=qv.canonicalProgramme.rows.filter(row=>row.label==='Exercice DAP 1');
    assert.equal(examples.length,4);
    for(const row of examples){
      assert.equal(row.family,'DAP');assert.equal(L.qvProgrammeFilterType(row),'Exercice');
      const raw={...row,family:'Exercice'};
      assert.equal(L.qvProgrammeProposedFamily(raw),'DAP');assert.equal(raw.family,'Exercice');
    }
    assert.equal(examples.find(row=>row.statCom==='013Y4').startsAt.slice(0,10),'2027-03-24');
    assert.equal(L.qvProgrammeProposedFamily({label:'Exercice DAP 1',family:'Exercice',statCom:'011PR',oiSelections:['DAP:Y4']}),'');
    tests.push('A/B/C: four current MOA-corrected DAP exercises retained; proposed defaults use Stat.Com and qualified OI, not title');
    const {hooks}=createCatalogUiHarness();
    const html=hooks.renderQuoVadisProgrammeHtml(qv);
    const options=(markup,id)=>{
      const block=markup.match(new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`));assert.ok(block,id);
      return [...block[1].matchAll(/<option value="([^"]*)"([^>]*)>([\s\S]*?)<\/option>/g)].map(match=>({value:match[1],attrs:match[2],label:match[3]}));
    };
    const familyOptions=options(html,'qv-filter-family');
    assert.deepEqual(familyOptions.slice(2).map(item=>item.value),families);
    const cursus=options(html,'qv-filter-cursus');
    for(const code of ['CI-DPS','CI-DAP','C-GROUPE','TP9','OFSI-BASE']){
      const ref=qv.cursusSelections.find(item=>item.code===code);assert.ok(ref,code);
      assert.ok(cursus.some(item=>item.value===ref.cursusId && item.label===L.qvProgrammeCursusLabel(ref)));
    }
    const specs=options(html,'qv-filter-specialisation');
    assert.ok(qv.qualifications.every(item=>specs.some(option=>option.value===item.code && option.label===item.label)));
    const fiche=hooks.renderQuoVadisProgrammeFicheHtml(qv,examples[0].id);
    assert.deepEqual(options(fiche,'qv-programme-family').filter(item=>item.value).map(item=>item.value),families);
    assert.deepEqual(options(fiche,'qv-programme-cursus').filter(item=>!item.attrs.includes('disabled') && item.value).map(item=>item.value),
      cursus.filter(item=>item.value!=='tous' && qv.cursusSelections.some(ref=>ref.cursusId===item.value)).map(item=>item.value));
    tests.push('D: fiche/filter use the same exact ten families, real cursus IDs (all five required) and qualification catalogue');
    const filter=values=>hooks.filterQuoVadisProgrammeRows(qv,values);
    assert.ok(examples.every(row=>filter({family:'DAP'}).some(item=>item.id===row.id)));
    tests.push('E: effective DAP filter retrieves all four MOA examples');
    const fixtures=[
      {id:'fixture-cursus',label:'Cursus fixture',family:'SDIS',cursusId:qv.cursusSelections.find(item=>item.code==='TP9').cursusId},
      {id:'fixture-multispec',label:'Spécialisations fixture',family:'PR',qualificationCodes:qv.qualifications.slice(0,2).map(item=>item.code)},
      {id:'fixture-cancelled',label:'Annulation fixture',family:'SDIS',status:'ANNULE',publishedEventId:'fixture-published'},
      {id:'fixture-public',label:'Public historique fixture',family:'PR',publics:['PR:FORMATEURS']},
      {id:'fixture-reserve',label:'Réserve fixture',family:'DPS',publics:['N06'],oiSelections:['DPS:G1']}
    ].map(row=>({external:false,...row}));
    const fixtureQv={...qv,canonicalProgramme:{...qv.canonicalProgramme,rows:[...qv.canonicalProgramme.rows,...fixtures]}};
    assert.deepEqual(hooks.filterQuoVadisProgrammeRows(fixtureQv,{cursus:fixtures[0].cursusId}).filter(row=>row.id.startsWith('fixture')).map(row=>row.id),['fixture-cursus']);
    for(const code of fixtures[1].qualificationCodes) assert.ok(hooks.filterQuoVadisProgrammeRows(fixtureQv,{specialisation:code}).some(row=>row.id==='fixture-multispec'));
    assert.ok(hooks.filterQuoVadisProgrammeRows(fixtureQv,{status:'Annulé'}).some(row=>row.id==='fixture-cancelled'));
    assert.ok(hooks.filterQuoVadisProgrammeRows(fixtureQv,{cible:'PR:FORMATEUR-PR'}).some(row=>row.id==='fixture-public'));
    assert.ok(hooks.filterQuoVadisProgrammeRows(fixtureQv,{cible:'N06',oi:'DPS:G1'}).some(row=>row.id==='fixture-reserve'));
    tests.push('F/G/H/I: real-ID cursus, both multiselected specialisations, cancelled publication, historical public aliases and reserve N06 actually filter');
    const publicOptions=options(html,'qv-filter-cible');
    assert.equal(publicOptions.filter(item=>item.label==='Formateur PR').length,1);
    assert.ok(publicOptions.some(item=>item.value==='N06'));
    assert.equal(new Set(publicOptions.map(item=>item.value)).size,publicOptions.length);
    assert.equal(new Set(publicOptions.map(item=>item.label.replace(/&nbsp;/g,'').trim())).size,publicOptions.length);
    const historical=qv.canonicalProgramme.rows.find(row=>row.family==='Exercice' && !row.publishedEventId
      && row.preparation && row.status!=='ANNULE' && row.statCom==='013Y4');assert.ok(historical);
    const historicFiche=hooks.renderQuoVadisProgrammeFicheHtml(qv,historical.id);
    assert.match(historicFiche,/<option value="Exercice" selected disabled>Exercice · valeur historique conservée<\/option>/);
    tests.push('J/K: public aliases deduplicated visually; historical family displayed disabled without becoming an official reference');
    const types=L.qvProgrammeActivityTypes(qv);
    const dapType=types.find(item=>item.definitionId===examples[0].definitionId);assert.ok(dapType);
    assert.equal(dapType.defaults.family,'DAP');assert.equal(dapType.defaults.activityType,'Exercice');
    await assert.rejects(service.createProgrammePreparation({year:2027,activityLabel:'Test famille interdite',domain:'F7',family:'Exercice',
      statCom:'013Y4',oiCodes:['DAP:Y4']},{actor:'recipe.p0'}),error=>error.error==='programme_famille_invalide');
    const created=await service.createProgrammePreparation({year:2027,programmeTypeId:dapType.id,activityLabel:'Test nouvelle proposition DAP',domain:'F7',
      statCom:'013Y4',oiCodes:['DAP:Y4'],date:'2027-12-15',startTime:'19:00',endTime:'21:30'},{actor:'recipe.p0'});
    assert.ok(created.created);const newRow=created.quoVadis.canonicalProgramme.rows.find(row=>row.id===created.itemId);
    assert.equal(newRow.family,'DAP');assert.equal(L.qvProgrammeFilterType(newRow),'Exercice');
    const historicalFields={...source.preparations.find(item=>item.source_ref===historical.id).metadata.planningFields};
    delete historicalFields.family;
    const retained=await service.updateProgrammePreparation(historical.id,{...historicalFields,year:2027,saveAction:'SAVE',
      themes:[...(historicalFields.themes || []),'Témoin local sans changement de famille']},{actor:'recipe.p0'});
    const retainedRow=retained.quoVadis.canonicalProgramme.rows.find(item=>item.id===historical.id);
    assert.equal(retainedRow.family,'Exercice');assert.equal(retainedRow.statCom,historical.statCom);
    for(const row of examples){
      const reference=source.preparations.find(item=>item.source_ref===row.id);
      const original=JSON.stringify(reference);
      const snapshot=consolidation.proposedReconductionSnapshot(reference);
      assert.equal(snapshot.fields.family,'DAP');assert.equal(snapshot.fields.statCom,row.statCom);
      assert.equal(snapshot.activityType,'Exercice');
      assert.equal(JSON.stringify(reference),original);
      if(reference.metadata.businessValidation.fields.family==='Exercice') assert.equal(snapshot.familyProposal.requiresValidation,true);
    }
    tests.push('C/K/L: actual service creates new DAP proposal with separate Exercice nature, rejects legacy new family, validated reconduction snapshot preserves DAP/Stat.Com');
    const rows=inventory(qv),counts={};for(const row of rows) counts[row.category]=(counts[row.category] || 0)+1;
    fs.mkdirSync(out,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
    fs.writeFileSync(path.join(out,'current.json'),JSON.stringify(qv));
    fs.writeFileSync(path.join(evidence,'inventory-2027.json'),JSON.stringify({readAt:source.at,readOnly:true,counts,rows},null,2)+'\n');
    const summary={status:'PASS',base:'95d8bdf',productionReadOnly:true,productionWrites:false,sourceReadAt:source.at,
      publicationReadAt:publications.at,rows:rows.length,activeRows:qv.canonicalProgramme.rows.filter(L.qvProgrammeIsActive).length,
      tests,protectedFields,statComIdenticalPercent:100,inventory:counts,
      dapExamples:rows.filter(row=>examples.some(item=>item.id===row.id)),
      cursusReferences:qv.cursusSelections.map(({cursusId,code,libelle})=>({cursusId,code,libelle})),
      originalTables:tables.length};
    await client.query('ROLLBACK');open=false;
    const finalHashes=await hashes(client.query.bind(client),tables);
    assert.deepEqual(finalHashes,initial);
    summary.rollbackVerified=true;summary.publicCloneDataUnchanged=true;
    summary.publicCloneHashes={before:initial,after:finalHashes};
    fs.writeFileSync(path.join(evidence,'targeted-results.json'),JSON.stringify(summary,null,2)+'\n');
    console.log(JSON.stringify({status:'PASS',tests:tests.length,rows:rows.length,inventory:counts,rollbackVerified:true}));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={inventory};
