const { response, verifyToken, bearerToken } = require('../lib/_auth-utils');
const { requirePermission } = require('../lib/_rbac');
const personnel = require('../lib/_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'dashboard:read'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  try{
    const params = event.queryStringParameters || {};
    if(!params.domaine) return response(400, { ok:false, error:'missing_domaine' });
    return response(200, { ok:true, effectif:await personnel.effectifAtDate(params) });
  }catch(error){
    return response(500, { ok:false, error:'scope_personnel_effectif_failed', message:String(error.message || error) });
  }
};
