const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const personnel = require('./_scope-personnel-service');

exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'personnel:manage'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized' }); }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const body = parseBody(event) || {};
    const id = body.personneId || body.id || (event.queryStringParameters || {}).id;
    const action = String(body.action || 'inactivate').toLowerCase();
    const personne = action === 'correct' || action === 'reactivate'
      ? await personnel.correctPersonneInactivation(id, body, claims)
      : await personnel.inactivatePersonne(id, body, claims);
    return response(200, { ok:true, personne });
  }catch(error){
    return response(error.statusCode || 500, { ok:false, error:'scope_personnel_inactivate_failed', message:String(error.message || error) });
  }
};
