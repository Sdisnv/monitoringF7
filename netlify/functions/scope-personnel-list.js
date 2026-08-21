const { response, verifyToken, bearerToken } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'dashboard:read'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  try{
    const params = event.queryStringParameters || {};
    const personnes = await personnel.listPersonnel({ q:params.q || '', domaine:params.domaine || '', cible:params.cible || '' });
    return response(200, { ok:true, personnes });
  }catch(error){
    return response(500, { ok:false, error:'scope_personnel_list_failed', message:String(error.message || error) });
  }
};
