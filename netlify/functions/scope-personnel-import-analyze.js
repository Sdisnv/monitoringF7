const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'personnel:manage'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event);
    if(!body || !body.fileText) return response(400, { ok:false, error:'missing_file_text' });
    const result = await personnel.analyzeImport(Object.assign({}, body, { createdBy:claims.sub || claims.email || claims.nip || '' }));
    return response(200, { ok:true, result });
  }catch(error){
    return response(400, { ok:false, error:'scope_personnel_import_analyze_failed', message:String(error.message || error) });
  }
};
