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

module.exports = {
  query,
  transaction
};
