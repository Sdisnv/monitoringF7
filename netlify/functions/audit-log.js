const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission } = require('./_rbac');
const audit = require('./_audit-store');
function claimsFrom(event){ return verifyToken(bearerToken(event), 'access'); }
exports.handler = async function(event){
  let claims;
  try{ claims = claimsFrom(event); }
  catch(error){ return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) }); }
  try{
    if(event.httpMethod === 'GET'){
      requirePermission(claims, 'audit:read');
      const limit = Number(event.queryStringParameters?.limit || 100);
      return response(200, { ok:true, entries: await audit.listAudit(limit) });
    }
    if(event.httpMethod === 'POST'){
      const body = parseBody(event) || {};
      const entry = await audit.addAudit({ level:body.level || 'info', eventType:body.eventType || 'frontend-event', status:body.status || 'success', message:body.message || 'Événement frontend.', actorSubject:claims.sub, source:'frontend', context:body.context || {} });
      return response(200, { ok:true, entry });
    }
    return response(405, { ok:false, error:'method_not_allowed' });
  }catch(error){
    return response(error.statusCode || 500, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'audit_failed', message:String(error.message || error) });
  }
};
