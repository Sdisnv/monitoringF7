const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const db = require('./_postgres');
const audit = require('./_audit-store');

const ADMIN_CODE_KEY = 'admin_code_hash';
const DEFAULT_ADMIN_HASH = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

function claimsFrom(event){
  return verifyToken(bearerToken(event), 'access');
}

function validHash(value){
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

async function ensureSettingsTable(){
  await db.query(`create table if not exists monitoring_f7_settings (
    key text primary key,
    value jsonb not null,
    updated_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
}

async function currentAdminHash(){
  await ensureSettingsTable();
  const result = await db.query('select value from monitoring_f7_settings where key=$1', [ADMIN_CODE_KEY]);
  const value = result.rows?.[0]?.value;
  return { hash:String(value?.hash || DEFAULT_ADMIN_HASH), exists:!!result.rows?.[0] };
}

async function saveAdminHash(hash, actor){
  await ensureSettingsTable();
  await db.query(`insert into monitoring_f7_settings(key,value,updated_by,updated_at)
    values($1,$2::jsonb,$3,now())
    on conflict(key) do update set value=excluded.value, updated_by=excluded.updated_by, updated_at=now()`,
    [ADMIN_CODE_KEY, JSON.stringify({ hash }), actor || null]);
}

exports.handler = async function(event){
  let claims;
  try{ claims = claimsFrom(event); }
  catch(error){ return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) }); }

  try{
    if(event.httpMethod === 'POST'){
      const body = parseBody(event);
      if(!body || !validHash(body.hash)) return response(400, { ok:false, error:'invalid_hash' });
      const current = await currentAdminHash();
      const ok = String(body.hash).toLowerCase() === current.hash.toLowerCase();
      await audit.addAudit({ eventType:'admin-code-verify', status:ok ? 'success' : 'failure', message:ok ? 'Code admin vérifié.' : 'Code admin refusé.', actorSubject:claims.sub });
      return response(200, { ok:true, valid:ok });
    }

    if(event.httpMethod === 'PUT'){
      requirePermission(claims, 'settings:manage');
      const body = parseBody(event);
      if(!body || !validHash(body.currentHash) || !validHash(body.nextHash)) return response(400, { ok:false, error:'invalid_hash' });
      const current = await currentAdminHash();
      const matchesCurrent = String(body.currentHash).toLowerCase() === current.hash.toLowerCase();
      const initializeEmptyDatabase = current.exists === false && body.initializeIfMissing === true;
      if(!matchesCurrent && !initializeEmptyDatabase) return response(409, { ok:false, error:'current_admin_code_invalid' });
      await saveAdminHash(String(body.nextHash).toLowerCase(), claims.sub);
      await audit.addAudit({ eventType:'admin-code-update', message:'Code admin central mis à jour.', actorSubject:claims.sub });
      return response(200, { ok:true, updatedAt:new Date().toISOString() });
    }

    return response(405, { ok:false, error:'method_not_allowed' });
  }catch(error){
    return response(error.statusCode || 500, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'admin_settings_failed', message:String(error.message || error) });
  }
};
