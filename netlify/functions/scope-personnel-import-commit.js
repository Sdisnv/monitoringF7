const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const users = require('./_user-store');
const personnel = require('./_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{
    claims = verifyToken(bearerToken(event), 'access');
    claims = await users.getUserByIdentity([claims.sub, claims.email, claims.nip]) || claims;
    requirePermission(claims, 'personnel:manage');
  }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event);
    if(!body?.batchId) return response(400, { ok:false, error:'missing_batch_id' });
    return response(200, await personnel.commitImport(body.batchId, claims.sub || claims.email || claims.nip || ''));
  }catch(error){
    return response(409, { ok:false, error:'scope_personnel_import_commit_failed', message:String(error.message || error) });
  }
};
