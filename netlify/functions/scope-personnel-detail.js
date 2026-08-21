const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, event.httpMethod === 'GET' ? 'dashboard:read' : 'effectifs:manage'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  try{
    const params = event.queryStringParameters || {};
    if(event.httpMethod === 'GET'){
      const personne = await personnel.getPersonne(params.id);
      return personne ? response(200, { ok:true, personne }) : response(404, { ok:false, error:'not_found' });
    }
    if(event.httpMethod === 'PUT'){
      const body = parseBody(event);
      if(!body) return response(400, { ok:false, error:'invalid_json' });
      if(body.affectationId) return response(200, { ok:true, personne:await personnel.updateAffectation(body.affectationId, body) });
      return response(200, { ok:true, personne:await personnel.updatePersonne(body.id || params.id, body) });
    }
    return response(405, { ok:false, error:'method_not_allowed' });
  }catch(error){
    return response(500, { ok:false, error:'scope_personnel_detail_failed', message:String(error.message || error) });
  }
};
