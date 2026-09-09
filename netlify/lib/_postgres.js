const { AsyncLocalStorage } = require('async_hooks');

let pool = null;
const metricsStore = new AsyncLocalStorage();

function getDatabaseUrl(){
  const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || '';
  if(!url) throw new Error('DATABASE_URL manquant. Configurer Supabase ou Neon dans les variables Netlify.');
  return url;
}

function getPool(){
  if(pool) return pool;
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    max: Number(process.env.MONITORING_F7_PG_POOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000
  });
  return pool;
}

async function query(text, params){
  const metrics = metricsStore.getStore();
  const acquireStart = Date.now();
  const client = await getPool().connect();
  const acquiredAt = Date.now();
  if(metrics){
    metrics.dbAcquireMs += acquiredAt - acquireStart;
    metrics.queryCount += 1;
  }
  try{
    const sqlStart = Date.now();
    const result = await client.query(text, params || []);
    if(metrics) metrics.sqlMs += Date.now() - sqlStart;
    return result;
  }finally{
    client.release();
  }
}

async function transaction(callback){
  const metrics = metricsStore.getStore();
  const acquireStart = Date.now();
  const client = await getPool().connect();
  if(metrics) metrics.dbAcquireMs += Date.now() - acquireStart;
  const instrumented = metrics ? Object.assign(Object.create(Object.getPrototypeOf(client)), client, {
    query: async (text, params) => {
      metrics.queryCount += 1;
      const sqlStart = Date.now();
      const result = await client.query(text, params || []);
      metrics.sqlMs += Date.now() - sqlStart;
      return result;
    }
  }) : client;
  try{
    await instrumented.query('begin');
    const result = await callback(instrumented);
    await instrumented.query('commit');
    return result;
  }catch(error){
    try{
      await instrumented.query('rollback');
    }catch{}
    throw error;
  }finally{
    client.release();
  }
}

let schemaReady = false;
let coreSchemaPromise = null;
async function ensureCoreSchema(){
  if(schemaReady) return true;
  if(coreSchemaPromise) return coreSchemaPromise;
  coreSchemaPromise = (async () => {
  await query(`create table if not exists monitoring_f7_schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_user_profiles (
    subject text primary key,
    email text,
    display_name text,
    nip text,
    roles text[] not null default array['UTILISATEUR'],
    permissions text[] not null default array[]::text[],
    provider text not null default 'oidc',
    active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`alter table monitoring_f7_user_profiles alter column roles set default array['UTILISATEUR']`);
  await query(`create table if not exists monitoring_f7_records (
    id text primary key,
    payload jsonb not null,
    schema_version integer not null default 4,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_imported_events (
    id text primary key,
    payload jsonb not null,
    schema_version integer not null default 4,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_reference_periods (
    id text primary key,
    payload jsonb not null,
    schema_version integer not null default 4,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_objectives (
    id text primary key,
    payload jsonb not null,
    schema_version integer not null default 4,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_audit_entries (
    id text primary key,
    level text not null,
    event_type text not null,
    status text,
    message text not null,
    context jsonb not null default '{}'::jsonb,
    actor_subject text,
    created_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_settings (
    key text primary key,
    value jsonb not null,
    updated_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await query(`create index if not exists idx_monitoring_f7_records_updated_at on monitoring_f7_records (updated_at desc)`);
  await query(`create index if not exists idx_monitoring_f7_imported_events_updated_at on monitoring_f7_imported_events (updated_at desc)`);
  await query(`create index if not exists idx_monitoring_f7_reference_periods_updated_at on monitoring_f7_reference_periods (updated_at desc)`);
  await query(`create index if not exists idx_monitoring_f7_objectives_updated_at on monitoring_f7_objectives (updated_at desc)`);
  await query(`create index if not exists idx_monitoring_f7_audit_entries_created_at on monitoring_f7_audit_entries (created_at desc)`);
  await query(`insert into monitoring_f7_schema_migrations(version) values ('v67.0-auto-core-schema') on conflict (version) do nothing`);
  schemaReady = true;
  return true;
  })();
  try{
    return await coreSchemaPromise;
  }finally{
    coreSchemaPromise = null;
  }
}

function createMetrics(label){
  return {
    label: label || '',
    startedAt: Date.now(),
    queryCount: 0,
    dbAcquireMs: 0,
    sqlMs: 0,
    transformMs: 0
  };
}

async function withMetrics(label, callback){
  const metrics = createMetrics(label);
  return metricsStore.run(metrics, async () => {
    try{
      return await callback(metrics);
    }finally{
      metrics.totalMs = Date.now() - metrics.startedAt;
    }
  });
}

function currentMetrics(){
  const metrics = metricsStore.getStore();
  if(!metrics) return null;
  return Object.assign({}, metrics, { totalMs: Date.now() - metrics.startedAt });
}

module.exports = {
  query,
  transaction,
  ensureCoreSchema,
  withMetrics,
  currentMetrics
};
