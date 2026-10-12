'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Client}=require('pg');
const {createPgRepo}=require('../netlify/lib/_scope-pg');
const {createScopeAnalyticsService}=require('../netlify/lib/_scope-analytics-service');
const DATABASE='scope_qv_2027_recipe_20261006';
async function fingerprint(client,table){
  assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
  return (await client.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash from ${table} t`)).rows[0];
}
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:DATABASE,connectionTimeoutMillis:5000});
  await client.connect();let open=false;
  try{
    const identity=(await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity,{name:DATABASE,host:'127.0.0.1/32',port:5432});
    const tables=(await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row=>row.tablename);
    const before={};for(const table of tables) before[table]=await fingerprint(client,table);
    await client.query('BEGIN');open=true;
    const catalogue=(await client.query("select to_regclass('scope_activity_participation_rules') as name")).rows[0].name;
    if(!catalogue) await client.query(fs.readFileSync(path.join(__dirname,'../database/migrations/20261007_scope_qv_participation_catalogue_1.sql'),'utf8'));
    let queue=Promise.resolve();
    const repo=createPgRepo({query:(...args)=>{
      const next=queue.then(()=>client.query(...args));queue=next.catch(()=>{});return next;
    }});
    const reference=(await client.query(`select a.personne_id,e.domaine_code from scope_attendus a
      join scope_evenements e on e.evenement_id=a.evenement_id where a.inclus is true
      and e.domaine_code='JSP' order by a.personne_id limit 1`)).rows[0];
    assert.ok(reference,'Une personne existante du clone avec un historique JSP est nécessaire.');
    const events=[];
    for(const [date,evaluated] of [['2028-01-28',true],['2028-01-29',false],['2028-01-01',true]]){
      const event=await repo.insertEvenement({date,domaine_code:reference.domaine_code,
        libelle:'RECETTE ROADMAP Cycle métier 2027 / date civile 2028',statut:'REALISE',
        origine:'NOMINATIF',mode_suivi:'NOMINATIF',population_figee:true,participationEvaluation:evaluated,
        engine_snapshot:{businessYear:2027}});
      await repo.upsertAttendu({evenement_id:event.evenement_id,personne_id:reference.personne_id,inclus:true,origine:'REGLE'});
      await repo.upsertParticipation({evenement_id:event.evenement_id,personne_id:reference.personne_id,statut:'PRESENT'});
      events.push(event);
    }
    assert.ok(!(await repo.listEvenements({annee:2027})).some(event=>events.some(item=>item.evenement_id===event.evenement_id)));
    assert.ok((await repo.listEvenements({annee:2028})).some(event=>event.evenement_id===events[0].evenement_id));
    const analytics=createScopeAnalyticsService(repo);
    const prior=await analytics.evaluate({preset:'YEAR',year:2027,evenementId:events[0].evenement_id});
    const civil=await analytics.evaluate({preset:'YEAR',year:2028,evenementId:events[0].evenement_id});
    assert.equal(prior.officiel.eventCount,0);assert.equal(civil.officiel.eventCount,1);
    assert.equal(events[2].date,'2028-01-01');
    const boundaryPrior=await analytics.evaluate({preset:'YEAR',year:2027,evenementId:events[2].evenement_id});
    const boundaryCivil=await analytics.evaluate({preset:'YEAR',year:2028,evenementId:events[2].evenement_id});
    assert.equal(boundaryPrior.officiel.eventCount,0);assert.equal(boundaryCivil.officiel.eventCount,1);
    const excluded=await repo.loadAnalyticsBundle({from:'2028-01-01',to:'2028-12-31',evenementId:events[1].evenement_id});
    assert.equal(excluded.events.length,0);
    assert.equal((await repo.listParticipations(events[1].evenement_id)).length,1);
    await client.query('ROLLBACK');open=false;
    const after={};for(const table of tables) after[table]=await fingerprint(client,table);
    assert.deepEqual(after,before);
    const output=path.resolve(__dirname,'../docs/captures/qv-roadmap-v1-20261012/statistics-clone-integrity.json');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    const report={database:DATABASE,host:'127.0.0.1',port:5432,businessYear:2027,civilYear:2028,
      count2027:0,count2028:1,testedCivilDates:['2028-01-01','2028-01-28'],unevaluatedContribution:0,historicalPresencePreserved:true,
      personAndNipCreated:false,assignmentsChanged:false,productionWrites:false,
      rollbackAllTablesUnchanged:tables.length,verdict:'PASS'};
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }finally{if(open) await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
