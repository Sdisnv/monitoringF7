'use strict';
const {Client}=require('pg');
async function run(){
  const client=new Client({host:'127.0.0.1',port:5432,database:'scope_qv_2027_recipe_20261006',connectionTimeoutMillis:5000});
  await client.connect();
  try{
    await client.query('BEGIN READ ONLY');
    const qualifications=(await client.query('select code,libelle,type,domaine_code,metadata from scope_competence_definitions where actif order by sort_order,code')).rows;
    const cursus=(await client.query(`select d.cursus_id,d.code,d.libelle,s.step_code,s.preferred_month,s.preferred_day,s.usual_start_time,s.usual_end_time
      from scope_quo_vadis_cursus_definitions d join scope_quo_vadis_cursus_versions v using(cursus_id)
      join scope_quo_vadis_cursus_steps s using(cursus_version_id) where d.code='PAPR' and v.active and s.active order by s.ordre`)).rows;
    const themes=(await client.query(`select source_ref,title,metadata->'planningFields'->'themes' as themes,
      metadata->>'humanDecision' as human,metadata->>'automatedSnapshot' as automated,metadata ? 'businessValidation' as validated
      from scope_quo_vadis_obligations where metadata::text ~ 'Phase I' order by source_ref`)).rows;
    console.log(JSON.stringify({qualifications,cursus,themes},null,2));
  }finally{await client.query('ROLLBACK');await client.end();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
