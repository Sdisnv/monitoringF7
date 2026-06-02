let pool = null;

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
  return getPool().query(text, params || []);
}

async function transaction(callback){
  const client = await getPool().connect();
  try{
    await client.query('begin');
    const result = await callback(client);
    await client.query('commit');
    return result;
  }catch(error){
    try{ await client.query('rollback'); }catch{}
    throw error;
  }finally{
    client.release();
  }
}

let schemaReady = false;
async function ensureCoreSchema(){
  if(schemaReady) return true;
  await query(`create table if not exists monitoring_f7_schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )`);
  await query(`create table if not exists monitoring_f7_user_profiles (
    subject text primary key,
    email text,
    display_name text,
    nip text,
    roles text[] not null default array['sdis-user'],
    permissions text[] not null default array[]::text[],
    provider text not null default 'oidc',
    active boolean not null default true,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
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
  await query(`insert into monitoring_f7_schema_migrations(version) values ('v66.21-auto-core-schema') on conflict (version) do nothing`);
  schemaReady = true;
  return true;
}

module.exports = {
  query,
  transaction,
  ensureCoreSchema
};
