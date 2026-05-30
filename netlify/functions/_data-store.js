const { response, verifyToken, bearerToken } = require('./_auth-utils');

const STORE_NAME = process.env.MONITORING_F7_BLOBS_STORE || 'monitoring-f7';

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
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  return !(roles.includes('sdis-admin') || roles.includes('sdis-user'));
}

function validateArrayPayload(body, key){
  if(!body || typeof body !== 'object') return { ok:false, error:'invalid_json' };
  if(!Array.isArray(body[key])) return { ok:false, error:`missing_${key}` };
  return { ok:true, data:body[key] };
}

async function readCollection(collection){
  const store = getBlobsStore();
  if(!store) return { ok:false, statusCode:503, error:'central_storage_not_configured' };
  const raw = await store.get(`${collection}.json`, { type:'json' });
  return { ok:true, data: raw || [], updatedAt:null };
}

async function writeCollection(collection, items, schemaVersion){
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
  return {
    ok:false,
    error:'central_storage_not_configured',
    message:'Stockage central optionnel non configuré. Installer/activer Netlify Blobs avant usage serveur.'
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
      return response(200, { ok:true, [options.responseKey]: Array.isArray(stored) ? stored : [], schemaVersion: result.data?.schemaVersion || 4, updatedAt: result.data?.updatedAt || null });
    }catch(error){
      return response(500, { ok:false, error:'central_storage_read_failed', message:String(error.message || error) });
    }
  }

  if(event.httpMethod === 'PUT'){
    if(forbiddenIfNoWrite(claims)) return response(403, { ok:false, error:'forbidden' });
    let body;
    try{ body = JSON.parse(event.body || '{}'); }
    catch{ return response(400, { ok:false, error:'invalid_json' }); }
    const validation = validateArrayPayload(body, options.requestKey);
    if(!validation.ok) return response(400, { ok:false, error:validation.error });
    try{
      const result = await writeCollection(options.collection, validation.data, body.schemaVersion || 4);
      if(!result.ok) return response(result.statusCode || 503, storageUnavailablePayload());
      return response(200, { ok:true, updatedAt:result.updatedAt });
    }catch(error){
      return response(500, { ok:false, error:'central_storage_write_failed', message:String(error.message || error) });
    }
  }

  return response(405, { ok:false, error:'method_not_allowed' });
}

module.exports = {
  handleCollection
};
