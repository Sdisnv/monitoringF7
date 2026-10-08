'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const TABLE = 'scope_activity_participation_rules';
const MIGRATIONS = [
  '20261007_scope_qv_catalogue_publics.sql',
  '20261007_scope_qv_participation_catalogue_1.sql'
].map((name) => fs.readFileSync(path.join(__dirname,'../database/migrations',name),'utf8'));
const COMPARABLE = [
  'scope_activity_functional_profiles','scope_activity_public_bindings',
  'scope_activity_statistical_contributions','scope_annual_requirements',
  'scope_public_definitions','scope_public_rule_versions','scope_quo_vadis_planning_rules'
];

async function fingerprint(client,table){
  const { rows } = await client.query(`select count(*)::integer as count,
    md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
    from ${table} t`);
  return rows[0];
}

async function securityShape(client){
  const { rows } = await client.query(`select c.relname,c.relrowsecurity,c.relforcerowsecurity,
    c.relacl::text as acl,coalesce(jsonb_agg(jsonb_build_object(
      'name',p.policyname,'command',p.cmd,'roles',p.roles,'using',p.qual,'check',p.with_check)
      order by p.policyname) filter (where p.policyname is not null),'[]'::jsonb) as policies
    from pg_class c left join pg_policies p on p.schemaname='public' and p.tablename=c.relname
    where c.relnamespace='public'::regnamespace and c.relname=any($1::text[])
    group by c.oid order by c.relname`,[COMPARABLE]);
  assert.equal(rows.length,COMPARABLE.length);
  return rows;
}

async function withRole(client,role,work){
  await client.query('savepoint role_probe');
  try{
    await client.query(`set role ${role}`);
    return await work();
  }finally{
    await client.query('rollback to savepoint role_probe');
    await client.query('release savepoint role_probe');
  }
}

async function denied(client,role,sql,values=[]){
  await withRole(client,role,async () => {
    await assert.rejects(client.query(sql,values),(error) => error.code === '42501');
  });
}

async function run(){
  const client = new Client({ connectionString:`postgresql://127.0.0.1:55432/${DATABASE}` });
  await client.connect();
  let open = false;
  try{
    assert.equal((await client.query('select current_database() as name')).rows[0].name,DATABASE);
    assert.equal((await client.query(`select to_regclass($1) as table_name`,[TABLE])).rows[0].table_name,null);
    const existingRoles = await client.query(`select rolname from pg_roles
      where rolname in ('anon','authenticated','service_role','scope_qv_rls_probe')`);
    assert.equal(existingRoles.rowCount,0);
    const before = {};
    for(const table of COMPARABLE) before[table] = await fingerprint(client,table);
    const beforeSecurity = await securityShape(client);
    const beforePreparations = await fingerprint(client,'scope_quo_vadis_obligations');
    const beforeEvents = await fingerprint(client,'scope_evenements');
    await client.query('begin'); open = true;
    await client.query('create role anon nologin');
    await client.query('create role authenticated nologin');
    await client.query('create role service_role nologin bypassrls');
    await client.query('create role scope_qv_rls_probe nologin');
    await client.query('grant usage on schema public to anon, authenticated, service_role, scope_qv_rls_probe');
    for(let pass=0;pass<2;pass++) for(const sql of MIGRATIONS) await client.query(sql);
    const rules = await fingerprint(client,TABLE);
    assert.equal(rules.count,24);
    const seeded = await client.query(`select evaluation_group_code,count(*)::integer as n
      from ${TABLE} where source='MOA_PR_1_4_20261007'
      group by evaluation_group_code order by evaluation_group_code`);
    assert.deepEqual(seeded.rows,[{evaluation_group_code:'PR1',n:6},{evaluation_group_code:'PR2',n:6},
      {evaluation_group_code:'PR3',n:6},{evaluation_group_code:'PR4',n:6}]);
    const publics = await client.query(`select code from scope_public_definitions
      where code in ('SDIS-TOUS','DPS-CHEFS-SECTION-REMPLACANTS') order by code`);
    assert.deepEqual(publics.rows.map((row) => row.code),['DPS-CHEFS-SECTION-REMPLACANTS','SDIS-TOUS']);
    const config = (await client.query(`select c.relrowsecurity,c.relacl,
      (select count(*)::integer from pg_policies where schemaname='public' and tablename=$1) as policies
      from pg_class c where c.oid=$1::regclass`,[TABLE])).rows[0];
    assert.equal(config.relrowsecurity,true);
    assert.equal(config.policies,0);
    const privileges = (await client.query(`select
      has_table_privilege('anon',$1,'SELECT,INSERT,UPDATE,DELETE') as anon,
      has_table_privilege('authenticated',$1,'SELECT,INSERT,UPDATE,DELETE') as authenticated,
      has_table_privilege('service_role',$1,'SELECT') as service_select,
      has_table_privilege('service_role',$1,'INSERT') as service_insert,
      has_table_privilege('service_role',$1,'UPDATE') as service_update,
      has_table_privilege('service_role',$1,'DELETE') as service_delete`,[TABLE])).rows[0];
    assert.equal(privileges.anon,false);
    assert.equal(privileges.authenticated,false);
    for(const key of ['service_select','service_insert','service_update','service_delete']) assert.equal(privileges[key],true);
    assert.equal((await client.query(`select count(*)::integer as n from aclexplode(
      coalesce((select relacl from pg_class where oid=$1::regclass),acldefault('r',
      (select relowner from pg_class where oid=$1::regclass)))) where grantee=0`,[TABLE])).rows[0].n,0);
    const definitionId = (await client.query(`select definition_id from scope_event_definitions
      where code='QV26-RAPPORT-ANNUEL-FF60DF89'`)).rows[0].definition_id;
    const insert = `insert into ${TABLE}
      (definition_id,version_number,tracking,population_kind,evaluation_mode,source,created_by)
      values ($1,1,false,'NONE','NONE','SECURITY_PROBE','clone-proof')`;
    for(const role of ['anon','authenticated']){
      await denied(client,role,`select * from ${TABLE} limit 1`);
      await denied(client,role,insert,[definitionId]);
      await denied(client,role,`update ${TABLE} set source='SECURITY_PROBE' where definition_id=$1`,[definitionId]);
      await denied(client,role,`delete from ${TABLE} where definition_id=$1`,[definitionId]);
    }
    await client.query(`grant select,insert,update,delete on ${TABLE} to scope_qv_rls_probe`);
    const rls = await withRole(client,'scope_qv_rls_probe',async () => {
      const visible = (await client.query(`select count(*)::integer as n from ${TABLE}`)).rows[0].n;
      const updated = await client.query(`update ${TABLE} set source='SECURITY_PROBE'`);
      const deleted = await client.query(`delete from ${TABLE}`);
      return { visible,updated:updated.rowCount,deleted:deleted.rowCount };
    });
    assert.deepEqual(rls,{visible:0,updated:0,deleted:0});
    await denied(client,'scope_qv_rls_probe',insert,[definitionId]);
    const backend = await withRole(client,'service_role',async () => {
      const visible = (await client.query(`select count(*)::integer as n from ${TABLE}`)).rows[0].n;
      await client.query(insert,[definitionId]);
      const updated = await client.query(`update ${TABLE} set source='SECURITY_PROBE_UPDATED'
        where definition_id=$1`,[definitionId]);
      const deleted = await client.query(`delete from ${TABLE} where definition_id=$1`,[definitionId]);
      return {visible,updated:updated.rowCount,deleted:deleted.rowCount};
    });
    assert.deepEqual(backend,{visible:24,updated:1,deleted:1});
    assert.deepEqual(await fingerprint(client,TABLE),rules);
    for(const table of COMPARABLE.filter((name) => !['scope_public_definitions','scope_public_rule_versions'].includes(name)))
      assert.deepEqual(await fingerprint(client,table),before[table]);
    assert.deepEqual(await fingerprint(client,'scope_quo_vadis_obligations'),beforePreparations);
    assert.deepEqual(await fingerprint(client,'scope_evenements'),beforeEvents);
    assert.deepEqual(await securityShape(client),beforeSecurity);
    await client.query('rollback'); open = false;
    assert.equal((await client.query(`select to_regclass($1) as table_name`,[TABLE])).rows[0].table_name,null);
    for(const table of COMPARABLE) assert.deepEqual(await fingerprint(client,table),before[table]);
    assert.deepEqual(await fingerprint(client,'scope_quo_vadis_obligations'),beforePreparations);
    assert.deepEqual(await fingerprint(client,'scope_evenements'),beforeEvents);
    assert.deepEqual(await securityShape(client),beforeSecurity);
    assert.equal((await client.query(`select count(*)::integer as n from pg_roles
      where rolname in ('anon','authenticated','service_role','scope_qv_rls_probe')`)).rows[0].n,0);
    return {verdict:'PASS',model:'RLS_ON_DEFAULT_DENY_BACKEND_ONLY',migrationPasses:2,
      prRules:rules.count,series:seeded.rows,publics:publics.rows.length,rls,backend,
      anonAndAuthenticated:'CRUD_DENIED',publicGrants:0,existingTables:'UNCHANGED',
      existingPoliciesAndAcl:'UNCHANGED',rollback:'PASS'};
  }finally{
    if(open) await client.query('rollback');
    await client.end();
  }
}

if(require.main === module) run().then((proof) => console.log(JSON.stringify(proof,null,2)))
  .catch((error) => { console.error(error.stack || error);process.exitCode=1; });

module.exports = { run };
