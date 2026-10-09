const { response, verifyAccess, verifyToken, bearerToken, parseBody, resolveSessionUser } = require('../lib/_auth-utils');
const { requirePermission } = require('../lib/_rbac');
const personnel = require('../lib/_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{
    claims = await verifyAccess(event);
    claims = await resolveSessionUser(claims);
    requirePermission(claims, 'personnel:manage');
  }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event);
    if(!body || !(body.fileText || body.csvText)) return response(400, { ok:false, error:'missing_file_text' });
    const result = await personnel.analyzeImport(Object.assign({}, body, { createdBy:claims.sub || claims.email || claims.nip || '' }));
    return response(200, { ok:true, result });
  }catch(error){
    return response(400, { ok:false, error:'scope_personnel_import_analyze_failed', message:String(error.message || error) });
  }
};
