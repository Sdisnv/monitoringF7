'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');
const {Client} = require('pg');
const {createScopeQuoVadisService} = require('../netlify/lib/_scope-quo-vadis-service');
const cycles = require('../netlify/lib/_scope-programme-cycle');
const root = path.resolve(__dirname, '..');
const DATABASE = 'scope_qv_2027_recipe_20261006';
const directory = path.join(root, 'docs/captures/qv-pr13-complement-20261013');

async function hashes(query, tables) {
  const result = {};
  for (const table of tables) {
    assert.match(table, /^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    result[table] = (await query(`select count(*)::int as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
      from "${table}" t`)).rows[0];
  }
  return result;
}
function rowEvidence(row) {
  const fields = ['id','definitionId','occurrenceId','sessionId','label','eventLabel','themes','startsAt','endsAt',
    'statCom','code','businessCode','domain','ois','oiSelections','publics','publicFreeLabels','personnel','responsible','sourceLine',
    'historicalProposal','projectionEvidence','provenance','status','external','humanDecision','preparation',
    'publishedEventId','publishedEventCode','publishedEventDate','publishedEventStart','publishedEventEnd',
    'publishedEventOiSelections','publicationReconciliation','programmeReconciliation'];
  return Object.fromEntries(fields.filter(key => row[key] !== undefined).map(key => [key,row[key]]));
}
async function inventory(query) {
  const rows = async sql => (await query(sql)).rows;
  const referentialTables = (await rows(`select tablename from pg_tables where schemaname='public'
    and tablename ~ '^scope_.*(fonction|role|definition|catalog|referent)' order by tablename`)).map(row => row.tablename);
  const references = {};
  for (const table of referentialTables) {
    assert.match(table,/^scope_[a-z0-9_]+$/);
    const found = await rows(`select to_jsonb(t) as row from "${table}" t
      where to_jsonb(t)::text ~* 'fourrier|foca|communication|publication'`);
    if (found.length) references[table] = found.map(({row}) => ({
      ...Object.fromEntries(Object.entries(row).filter(([,value])=>value==null || typeof value!=='object')),
      fullRowSha256:createHash('sha256').update(JSON.stringify(row)).digest('hex')
    }));
  }
  const result = {
    publications: await rows(`select l.*,to_jsonb(e) as event,
      array(select o.code from scope_evenement_ois x join scope_ois o using(oi_id)
        where x.evenement_id=e.evenement_id order by o.code) as ois,
      array(select cible_code from scope_evenement_cibles_qv x where x.evenement_id=e.evenement_id order by cible_code) as targets,
      array(select public_code from scope_evenement_publics_qv x where x.evenement_id=e.evenement_id order by public_code) as publics
      from scope_qv_publication_links l join scope_evenements e using(evenement_id) where l.source_year=2027`),
    groupedDapEvents: await rows(`select to_jsonb(e) as event,
      array(select o.code from scope_evenement_ois x join scope_ois o using(oi_id)
        where x.evenement_id=e.evenement_id order by o.code) as ois,
      array(select public_code from scope_evenement_publics_qv x where x.evenement_id=e.evenement_id order by public_code) as publics,
      array(select c.domaine_code || ':' || c.niveau_code from scope_evenement_cibles x join scope_cibles c using(cible_id)
        where x.evenement_id=e.evenement_id order by c.domaine_code,c.niveau_code) as targets
      from scope_evenements e where libelle ~* 'formation group.*DAP' order by date,libelle`),
    preparations: await rows(`select source_ref,title,domain,statcom_code,imposed_start_at,imposed_end_at,statut,
      jsonb_build_object('source',metadata->'source','humanDecision',metadata->'humanDecision',
        'automatedSnapshot',metadata->'automatedSnapshot','planningFields',metadata->'planningFields',
        'businessCode',metadata->'businessCode','businessValidation',metadata->'businessValidation',
        'publicationRevision',metadata->'publicationRevision','validationWithdrawal',metadata->'validationWithdrawal',
        'lineage',metadata->'lineage','manualSourceId',metadata->'manualSource'->'id') as metadata,
      md5(metadata::text) as full_metadata_hash
      from scope_quo_vadis_obligations where programme_id=(select programme_id from scope_quo_vadis_programmes where annee=2027)
      and (title ~* 'formation group.*DAP|s[ée]ance (instruction|personnel) DAP'
        or source_ref in ('qv-source-870','qv-source-888')) order by source_ref`),
    internalCodes: await rows(`select code,count(*)::int from (
      select code_cours as code from scope_evenements union all
      select metadata->>'businessCode' from scope_quo_vadis_obligations union all
      select business_code from scope_qv_publication_activities union all
      select event_code from scope_event_code_allocations
    ) issued where code ~ '^(SCOPE-|HSC[.])' group by code order by code`),
    constraints: await rows(`select conrelid::regclass::text as relation,conname,contype,pg_get_constraintdef(oid) as definition
      from pg_constraint where conrelid in ('scope_evenements'::regclass,'scope_event_code_allocations'::regclass,
        'scope_qv_publication_links'::regclass,'scope_qv_publication_activities'::regclass) order by relation,conname`),
    indexes:await rows(`select tablename,indexname,indexdef from pg_indexes where schemaname='public'
      and tablename in ('scope_evenements','scope_event_code_allocations','scope_qv_publication_links','scope_qv_publication_activities')
      order by tablename,indexname`),
    referentialTablesSearched:referentialTables,references
  };
  const eventFields=['evenement_id','internal_event_id','libelle','date','date_fin','heure_debut','heure_fin',
    'heure_debut_prevue','heure_fin_prevue','code_cours','code_source','statcom_code','source_type','publication_key',
    'exercise_equivalence_key','pr_exercise_group_key','pr_session_key','session_index','session_label',
    'definition_version_id','domaine_code','statut','version','responsable','lieu_id','salle_theorie_id','updated_at'];
  for(const row of [...result.publications,...result.groupedDapEvents]) {
    const event=row.event;
    row.event=Object.fromEntries(eventFields.filter(field=>event[field]!==undefined).map(field=>[field,event[field]]));
    row.fullEventSha256=createHash('sha256').update(JSON.stringify(event)).digest('hex');
    for(const [field,value] of Object.entries(row)) if(field!=='event' && value && typeof value==='object'
      && !Array.isArray(value)) {
      if(value instanceof Date) {row[field]=value.toISOString();continue;}
      row[field+'Sha256']=createHash('sha256').update(JSON.stringify(value)).digest('hex');delete row[field];
    }
  }
  return result;
}
async function run() {
  const afterMode=process.argv.includes('--after');
  const client = new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();
  let open = false;
  try {
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before=await hashes(client.query.bind(client),tables);
    await client.query('BEGIN READ ONLY');open=true;
    const raw=await inventory(client.query.bind(client));
    await client.query('ROLLBACK');open=false;
    await client.query('BEGIN');open=true;
    let queue=Promise.resolve(),number=0;
    const query=(...args)=>{const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;};
    const adapter={query,transaction:async work=>{
      const name=`complement_${++number}`;await query(`SAVEPOINT ${name}`);
      try {const result=await work({query});await query(`RELEASE SAVEPOINT ${name}`);return result;}
      catch(error){await query(`ROLLBACK TO SAVEPOINT ${name}`);await query(`RELEASE SAVEPOINT ${name}`);throw error;}
    }};
    const makeService=afterMode?createScopeQuoVadisService:require('./lib/scope-qv-pr13-complement-recipe').baselineService();
    const qv=await makeService({database:adapter}).listProgramme(2027);
    const programme=qv.canonicalProgramme.rows;
    const active=programme.filter(row=>!row.external && !row.jspDirectionReconciliation && !row.cursusReconciliation);
    const collisions=[];
    for(let i=0;i<active.length;i++) for(let j=i+1;j<active.length;j++)
      if(cycles.sameOccurrence(active[i],active[j])) collisions.push([rowEvidence(active[i]),rowEvidence(active[j])]);
    const result={target:'LOCAL_CLONE',productionSql:'NOT_AVAILABLE',baseline:'66b38c6',raw,
      rawCount:programme.length,activeCount:active.length,collisions,
      dap:programme.filter(row=>/DAP/.test(row.label||'') && (/Séance|group/.test(row.label||''))).map(rowEvidence)};
    await client.query('ROLLBACK');open=false;
    const after=await hashes(client.query.bind(client),tables);assert.deepEqual(after,before);
    result.rollback={identicalTables:tables.length,before,after,status:'PASS'};
    if(afterMode) result.baseline='CURRENT_WORKING_TREE_AFTER_COMPLEMENT';
    fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,afterMode?'diagnostic-after.json':'diagnostic-before.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({rawCount:result.rawCount,activeCount:result.activeCount,collisions:result.collisions.length,
      dap:result.dap.length,groupedDapEvents:raw.groupedDapEvents.map(row=>({id:row.event.evenement_id,date:row.event.date,
        publics:row.publics,targets:row.targets})),referentialTables:raw.referentialTablesSearched.length,rollback:tables.length}));
  } finally {if(open) await client.query('ROLLBACK');await client.end();}
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={DATABASE,directory,hashes,inventory,rowEvidence};
