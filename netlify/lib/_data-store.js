const { response, verifyToken, bearerToken } = require('./_auth-utils');
const { canWriteRecords } = require('./_rbac');
const audit = require('./_audit-store');
const postgresStore = require('./_data-store-postgres');

const STORE_NAME = process.env.MONITORING_F7_BLOBS_STORE || 'monitoring-f7';

function storageDriver(){
  const driver = String(process.env.MONITORING_F7_STORAGE_DRIVER || '').trim().toLowerCase();
  if(driver === 'postgres' || driver === 'postgresql') return 'postgres';
  if(process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL) return 'postgres';
  return 'blobs';
}

function getBlobsStore(){
  try{
    const { getStore } = require('@netlify/blobs');
    return getStore(STORE_NAME);
  }catch(error){
    return null;
  }
}

function requireAccess(event){
  const claims = verifyToken(bearerToken(event), 'access');
  return claims;
}

function forbiddenIfNoWrite(claims){
  return !canWriteRecords(claims);
}

function validatePayload(body, key, options){
  if(!body || typeof body !== 'object') return { ok:false, error:'invalid_json' };
  if(options?.objectPayload === true){
    if(!body[key] || typeof body[key] !== 'object' || Array.isArray(body[key])) return { ok:false, error:`missing_${key}` };
    return { ok:true, data:body[key] };
  }
  if(!Array.isArray(body[key])) return { ok:false, error:`missing_${key}` };
  return { ok:true, data:body[key] };
}

async function readCollection(collection){
  if(storageDriver() === 'postgres') return postgresStore.readCollection(collection);
  const store = getBlobsStore();
  if(!store) return { ok:false, statusCode:503, error:'central_storage_not_configured' };
  const raw = await store.get(`${collection}.json`, { type:'json' });
  return { ok:true, data: raw || [], updatedAt:null };
}

async function writeCollection(collection, items, schemaVersion){
  if(storageDriver() === 'postgres') return postgresStore.writeCollection(collection, items, schemaVersion);
  const store = getBlobsStore();
  if(!store) return { ok:false, statusCode:503, error:'central_storage_not_configured' };
  const payload = {
    schemaVersion: schemaVersion || 4,
    updatedAt: new Date().toISOString(),
    items
  };
  await store.setJSON(`${collection}.json`, payload);
  return { ok:true, updatedAt:payload.updatedAt };
}

function storageUnavailablePayload(){
  const driver = storageDriver();
  return {
    ok:false,
    error:'central_storage_not_configured',
    storageDriver: driver,
    message: driver === 'postgres'
      ? 'Stockage PostgreSQL optionnel non configuré. Renseigner DATABASE_URL et executer database/schema.sql avant usage serveur.'
      : 'Stockage central optionnel non configuré. Installer/activer Netlify Blobs avant usage serveur.'
  };
}

async function handleCollection(event, options){
  let claims;
  try{ claims = requireAccess(event); }
  catch(error){ return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) }); }

  if(event.httpMethod === 'GET'){
    try{
      const result = await readCollection(options.collection);
      if(!result.ok) return response(result.statusCode || 503, storageUnavailablePayload());
      const stored = result.data && typeof result.data === 'object' && Array.isArray(result.data.items) ? result.data.items : result.data;
      const payload = options.objectPayload === true ? (Array.isArray(stored) ? (stored[0] || {}) : (stored || {})) : (Array.isArray(stored) ? stored : []);
      return response(200, { ok:true, [options.responseKey]: payload, schemaVersion: result.data?.schemaVersion || 4, updatedAt: result.data?.updatedAt || null });
    }catch(error){
      return response(500, { ok:false, error:'central_storage_read_failed', message:String(error.message || error) });
    }
  }

  if(event.httpMethod === 'PUT'){
    if(forbiddenIfNoWrite(claims)) return response(403, { ok:false, error:'forbidden' });
    let body;
    try{ body = JSON.parse(event.body || '{}'); }
    catch{ return response(400, { ok:false, error:'invalid_json' }); }
    const validation = validatePayload(body, options.requestKey, options);
    if(!validation.ok) return response(400, { ok:false, error:validation.error });
    try{
      const items = options.objectPayload === true ? [validation.data] : validation.data;
      const result = await writeCollection(options.collection, items, body.schemaVersion || 4);
      if(!result.ok) return response(result.statusCode || 503, storageUnavailablePayload());
      await audit.addAudit({ eventType:`${options.collection}-upsert`, message:'Collection serveur mise à jour.', actorSubject:claims.sub, context:{ collection:options.collection, count:items.length, schemaVersion:body.schemaVersion || 4 } });
      return response(200, { ok:true, updatedAt:result.updatedAt });
    }catch(error){
      return response(500, { ok:false, error:'central_storage_write_failed', message:String(error.message || error) });
    }
  }

  return response(405, { ok:false, error:'method_not_allowed' });
}

module.exports = {
  handleCollection,
  storageDriver
};
