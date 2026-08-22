const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { requirePermission, KNOWN_ROLES, ROLE_PERMISSIONS, isAdminRole, normalizeRoles } = require('./_rbac');
const users = require('./_user-store');
const audit = require('./_audit-store');

function claimsFrom(event){ return verifyToken(bearerToken(event), 'access'); }
exports.handler = async function(event){
  let claims;
  try{ claims = claimsFrom(event); requirePermission(claims, 'users:admin'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized', message:String(error.message || error) }); }
  try{
    if(event.httpMethod === 'GET'){
      const list = await users.listUsers();
      return response(200, { ok:true, users:list, roles:KNOWN_ROLES, rolePermissions:ROLE_PERMISSIONS });
    }
    if(event.httpMethod === 'POST' || event.httpMethod === 'PUT'){
      const body = parseBody(event);
      if(!body) return response(400, { ok:false, error:'invalid_json' });
      const currentSubject = String(claims.sub || '').toLowerCase();
      const targetSubject = String(body.subject || body.email || body.nip || '').toLowerCase();
      const requestedRoles = normalizeRoles(body.roles || [body.role || 'UTILISATEUR']);
      if(currentSubject && targetSubject === currentSubject && !isAdminRole(requestedRoles)){
        if(body.confirmRemoveOwnAdmin !== true) return response(409, { ok:false, error:'own_admin_removal_requires_confirmation' });
      }
      const before = targetSubject ? await users.getUser(targetSubject) : null;
      const saved = await users.upsertUser(body);
      await audit.addAudit({ eventType: before ? 'user-update' : 'user-create', message: before ? 'Utilisateur modifié.' : 'Utilisateur créé.', actorSubject:claims.sub, context:{ entity:saved.subject, beforeRoles:before?.roles || [], afterRoles:saved.roles, active:saved.active } });
      return response(200, { ok:true, user:saved });
    }
    return response(405, { ok:false, error:'method_not_allowed' });
  }catch(error){
    await audit.addAudit({ level:'error', status:'failure', eventType:'admin-users-error', message:String(error.message || error), actorSubject:claims.sub });
    return response(500, { ok:false, error:'admin_users_failed', message:String(error.message || error) });
  }
};
