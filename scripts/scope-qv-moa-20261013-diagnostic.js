'use strict';
const {spawnSync}=require('node:child_process');
const {Client}=require('pg');
const fs=require('node:fs');
const path=require('node:path');
const SITE='6def8d4d-78c6-4112-bb76-6891df0e0a52';
async function run(){
  const production=process.argv.includes('--production-readonly');
  let connection;
  if(production){
    const resolve=node=>typeof node==='string' && /^postgres(?:ql)?:\/\//.test(node.trim()) ? node.trim()
      : node && typeof node==='object' ? Object.values(node).map(resolve).find(Boolean) : null;
    for(const name of ['DATABASE_URL','SCOPE_DATABASE_URL']){
      const value=spawnSync('netlify',['env:get',name,'--site',SITE,'--context','production','--scope','functions','--json'],
        {encoding:'utf8',timeout:30000});
      if(value.status!==0) continue;
      const clean=value.stdout.replace(/\u001b\[[0-9;]*m/g,'').trim();
      let resolved;try{resolved=JSON.parse(clean);}catch{resolved=clean;}
      connection=resolve(resolved) || '';
      if(!connection) connection=clean.match(/postgres(?:ql)?:\/\/[^\s"']+/)?.[0] || '';
      if(/^postgres(?:ql)?:\/\//.test(connection)) break;
      console.error('Connection metadata only:',JSON.stringify({name,type:typeof resolved,keys:resolved && typeof resolved==='object'?Object.keys(resolved):[]}));
    }
    if(!/^postgres(?:ql)?:\/\//.test(connection)) throw new Error('SCOPE connection not resolved; no secret printed.');
  }
  const client=new Client(production?{connectionString:connection,connectionTimeoutMillis:8000}
    :{host:'127.0.0.1',port:5432,database:'scope_qv_2027_recipe_20261006',connectionTimeoutMillis:5000});
  await client.connect();
  try{
    await client.query('BEGIN READ ONLY');await client.query("set local statement_timeout='10s'");
    const transaction=(await client.query('show transaction_read_only')).rows[0].transaction_read_only;
    if(transaction!=='on') throw new Error('Read-only transaction required');
    const query=async sql=>(await client.query(sql)).rows;
    const result={target:production?'SCOPE_PRODUCTION_READ_ONLY':'LOCAL_CLONE_READ_ONLY',transactionReadOnly:true,
      programme:await query("select annee,statut,metadata->'programmeCycle' as cycle from scope_quo_vadis_programmes where annee=2027"),
      internalCodes:await query(`select code,count(*)::int as count from (
        select code_cours as code from scope_evenements
        union all select metadata->>'businessCode' from scope_quo_vadis_obligations
        union all select business_code from scope_qv_publication_activities
      ) issued where code ~ '^(SCOPE-[0-9]+|HSC[.][0-9]+)$' group by code order by code`),
      papr1:await query(`select p.publication_unit_id,e.evenement_id,e.code_cours,e.statcom_code,e.version,
        array(select c.cible_code from scope_evenement_cibles_qv c where c.evenement_id=e.evenement_id order by c.cible_code) as targets,
        array(select o.code from scope_evenement_ois x join scope_ois o using(oi_id) where x.evenement_id=e.evenement_id order by o.code) as ois
        from scope_qv_publication_links p join scope_evenements e using(evenement_id)
        where p.source_year=2027 and p.publication_unit_id='qv-source-899'`),
      responsables:await query('select code,libelle,metadata from scope_responsable_fonctions order by code'),
      crimson:await query(`select source_ref,title,statcom_code,statut,metadata->'planningFields' as fields
        from scope_quo_vadis_obligations where title ilike '%CRIMSON%'`),
      journalCounts:await query('select entite,count(*)::int as count from scope_journal_metier group by entite order by entite'),
      migrations:await query("select version from monitoring_f7_schema_migrations where version like '%20261012%' order by version")};
    await client.query('ROLLBACK');
    const directory=path.resolve(__dirname,'../docs/captures/qv-moa-20261013');fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,production?'production-readonly.json':'clone-diagnostic.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
  }finally{await client.end();}
}
run().catch(error=>{console.error(error.code || 'SCOPE_READONLY_DIAGNOSTIC_FAILED',error.message.replace(/postgres(?:ql)?:\/\/\S+/g,'[connection hidden]'));process.exitCode=1;});
