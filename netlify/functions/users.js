const { response, verifyToken, bearerToken, parseBody } = require('./_auth-utils');
const { permissionsForRoles, requirePermission } = require('./_rbac');
const { auditEntry } = require('./_audit-server');
const db = require('./_postgres');

const ALLOWED_ROLES = ['sdis-admin','sdis-commandement','sdis-chef-formation','sdis-formation','sdis-instructeur','sdis-user','sdis-readonly'];
function sanitizeRoles(input){
  const roles = Array.isArray(input) ? input.filter(r => ALLOWED_ROLES.includes(String(r))) : ['sdis-user'];
  return roles.length ? Array.from(new Set(roles)) : ['sdis-user'];
}
function publicRow(row){
  const roles = sanitizeRoles(row.roles);
  return {
    subject: row.subject,
    email: row.email || '',
    nip: row.nip || row.email || row.subject,
    displayName: row.display_name || row.email || row.subject,
    roles,
    permissions: permissionsForRoles(roles, row.permissions || []),
    active: row.active !== false,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
async function listUsers(){
  await db.ensureCoreSchema();
  const r = await db.query('select subject,email,display_name,nip,roles,permissions,active,last_login_at,created_at,updated_at from monitoring_f7_user_profiles order by lower(coalesce(display_name,email,subject)) asc');
  return (r.rows || []).map(publicRow);
}
exports.handler = async function(event){
  let claims;
  try{ claims = verifyToken(bearerToken(event), 'access'); requirePermission(claims, 'users:admin'); }
  catch(error){ return response(error.statusCode || 401, { ok:false, error:error.statusCode === 403 ? 'forbidden' : 'unauthorized', message:String(error.message || error) }); }
  try{
    if(event.httpMethod === 'GET') return response(200, { ok:true, users: await listUsers(), roles: ALLOWED_ROLES });
    const body = parseBody(event);
    if(!body) return response(400, { ok:false, error:'invalid_json' });
    if(event.httpMethod === 'POST'){
      await db.ensureCoreSchema();
      const subject = String(body.subject || body.email || '').trim().toLowerCase();
      if(!subject) return response(400, { ok:false, error:'missing_subject' });
      const roles = sanitizeRoles(body.roles);
      await db.query(`insert into monitoring_f7_user_profiles(subject,email,display_name,nip,roles,permissions,provider,active,updated_at)
        values($1,$2,$3,$4,$5,$6,'oidc',$7,now())
        on conflict(subject) do update set email=excluded.email, display_name=excluded.display_name, nip=excluded.nip, roles=excluded.roles, permissions=excluded.permissions, active=excluded.active, updated_at=now()`,
        [subject, body.email || subject, body.displayName || subject, body.nip || null, roles, body.permissions || [], body.active !== false]);
      await auditEntry({ eventType:'user-upsert', actor:claims.sub, message:'Création ou modification utilisateur', context:{ subject, roles, active:body.active !== false }});
      return response(200, { ok:true, users: await listUsers() });
    }
    if(event.httpMethod === 'PUT'){
      await db.ensureCoreSchema();
      const subject = String(body.subject || '').trim().toLowerCase();
      if(!subject) return response(400, { ok:false, error:'missing_subject' });
      const current = await db.query('select roles from monitoring_f7_user_profiles where subject=$1', [subject]);
      if(subject === String(claims.sub || '').toLowerCase() && Array.isArray(current.rows?.[0]?.roles) && current.rows[0].roles.includes('sdis-admin') && !sanitizeRoles(body.roles).includes('sdis-admin') && body.confirmSelfAdminRemoval !== true){
        return response(409, { ok:false, error:'self_admin_removal_requires_confirmation' });
      }
      const roles = sanitizeRoles(body.roles);
      await db.query(`update monitoring_f7_user_profiles set email=$2, display_name=$3, nip=$4, roles=$5, permissions=$6, active=$7, updated_at=now() where subject=$1`,
        [subject, body.email || subject, body.displayName || subject, body.nip || null, roles, body.permissions || [], body.active !== false]);
      await auditEntry({ eventType:'user-update', actor:claims.sub, message:'Modification utilisateur', context:{ subject, roles, active:body.active !== false }});
      return response(200, { ok:true, users: await listUsers() });
    }
    return response(405, { ok:false, error:'method_not_allowed' });
  }catch(error){
    return response(500, { ok:false, error:'users_failed', message:String(error.message || error) });
  }
};
