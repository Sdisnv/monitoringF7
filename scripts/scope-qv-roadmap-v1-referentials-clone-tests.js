'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { Client } = require('pg');

const DATABASE = 'scope_qv_2027_recipe_20261006';
const VERSIONS = ['scope-qv-moa-responsible-20261012', 'scope-qv-roadmap-responsible-20261012'];
const RECIPE_LOCK = 'SCOPE_ROADMAP_V1_CLONE_RECIPE';

async function hashes(client, tables) {
  const result = {};
  for (const table of tables) {
    assert.match(table, /^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    result[table] = (await client.query(`select count(*)::integer as count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) as hash
      from public."${table}" t`)).rows[0];
  }
  return result;
}

function schemaMigrations(client) {
  const filename = path.resolve(__dirname, '../netlify/lib/_scope-schema.js');
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = compiled.require.bind(compiled);
  const query = (...args) => client.query(...args);
  const adapter = { query, transaction: work => work({ query }) };
  compiled.require = id => id === './_postgres' ? adapter : nativeRequire(id);
  compiled._compile(fs.readFileSync(filename, 'utf8') +
    '\nmodule.exports.recipeMigrations = [migrateQuoVadisMoaResponsible20261012, migrateQuoVadisRoadmapResponsible20261012];\n', filename);
  return compiled.exports.recipeMigrations;
}

async function run() {
  const client = new Client({ host:'127.0.0.1',port:5432,database:DATABASE,
    application_name:'scope-roadmap-referentials-recipe',connectionTimeoutMillis:5000 });
  await client.connect();
  let open = false;
  try {
    const identity = (await client.query('select current_database() as name,inet_server_addr()::text as host,inet_server_port() as port')).rows[0];
    assert.deepEqual(identity, { name:DATABASE,host:'127.0.0.1/32',port:5432 });
    const competitors = (await client.query(`select pid,application_name,state from pg_stat_activity
      where datname=current_database() and pid<>pg_backend_pid() and xact_start is not null
        and state<>'idle' order by pid`)).rows;
    if (process.argv.includes('--probe')) {
      console.log(JSON.stringify({ database:DATABASE,competitors,ready:competitors.length === 0 }));
      return;
    }
    assert.equal(competitors.length,0,'Another clone transaction is active; wait for its completion.');
    await client.query('BEGIN'); open = true;
    const lock = (await client.query('select pg_try_advisory_xact_lock(hashtext($1)) as acquired',[RECIPE_LOCK])).rows[0];
    assert.equal(lock.acquired,true,'The coordinated cycle clone recipe still holds its lock.');
    await client.query("SET LOCAL lock_timeout='1s'");
    const tables = (await client.query(`select tablename from pg_tables where schemaname='public'
      and (tablename like 'scope_%' or tablename='monitoring_f7_schema_migrations') order by tablename`)).rows.map(row => row.tablename);
    for (const required of ['scope_responsable_fonctions','scope_quo_vadis_obligations','scope_evenements','scope_participations']) assert.ok(tables.includes(required));
    for (const table of tables) assert.match(table,/^(scope_[a-z0-9_]+|monitoring_f7_schema_migrations)$/);
    await client.query(`LOCK TABLE ${tables.map(table => `public."${table}"`).join(',')} IN SHARE ROW EXCLUSIVE MODE NOWAIT`);
    const before = await hashes(client,tables);
    const functions = (await client.query('select * from scope_responsable_fonctions order by code')).rows;
    const section = functions.find(row => row.code === 'C scrt');
    assert.ok(section,'The historical C scrt reference must already exist on the clone.');
    for (const code of ['Pr\u00e9sidente CI','Pr\u00e9sidente Codir']) assert.ok(functions.some(row => row.code === code));
    await client.query('delete from monitoring_f7_schema_migrations where version=any($1::text[])',[VERSIONS]);
    await client.query("update scope_responsable_fonctions set libelle='C scrt' where code='C scrt'");
    const migrations = schemaMigrations(client);
    for (const migrate of migrations) await migrate();
    const first = await hashes(client,tables);
    const updated = (await client.query('select * from scope_responsable_fonctions order by code')).rows;
    assert.deepEqual(updated.map(row => row.code),functions.map(row => row.code));
    const corrected = updated.find(row => row.code === 'C scrt');
    assert.equal(corrected.libelle,'C sct');
    const stableFields = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['libelle','updated_at'].includes(key)));
    assert.deepEqual(stableFields(corrected),stableFields(section));
    assert.equal(updated.filter(row => row.actif && row.libelle === 'C sct').length,1);
    for (const code of ['Pr\u00e9sidente CI','Pr\u00e9sidente Codir']) {
      const previous = functions.find(row => row.code === code);
      const current = updated.find(row => row.code === code);
      assert.equal(current.libelle,code.replace('Pr\u00e9sidente ','Pr\u00e9sidentE '));
      for (const field of Object.keys(previous).filter(key => !['libelle','metadata','updated_at'].includes(key))) assert.deepEqual(current[field],previous[field]);
    }
    for (const table of tables.filter(table => !['scope_responsable_fonctions','monitoring_f7_schema_migrations'].includes(table))) assert.deepEqual(first[table],before[table]);
    for (const migrate of migrations) await migrate();
    assert.deepEqual(await hashes(client,tables),first,'A second migration pass must be byte-identical.');
    await client.query('ROLLBACK'); open = false;
    const after = await hashes(client,tables);
    assert.deepEqual(after,before,'ROLLBACK must restore every clone table hash.');
    const proof = { database:DATABASE,host:'127.0.0.1',port:5432,transaction:'BEGIN/ROLLBACK',
      adapter:['query','transaction'],coordinatedLock:RECIPE_LOCK,stableCode:'C scrt',newLabel:'C sct',
      functionIdsPreserved:true,noDuplicateChoices:true,inclusiveHistoricalCodesPreserved:true,
      obligationsAndDecisionsUnchanged:true,allOtherTablesUnchanged:true,idempotence:true,
      rollbackAllTablesUnchanged:tables.length,productionWrites:false,before,after,verdict:'PASS' };
    const output = path.resolve(__dirname,'../docs/captures/qv-roadmap-v1-20261012/referentials-clone-integrity.json');
    fs.mkdirSync(path.dirname(output),{recursive:true});
    fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n');
    const { before:ignoredBefore,after:ignoredAfter,...summary } = proof;
    console.log(JSON.stringify(summary));
  } finally {
    if (open) await client.query('ROLLBACK');
    await client.end();
  }
}

run().catch(error => {console.error(error);process.exitCode=1;});
