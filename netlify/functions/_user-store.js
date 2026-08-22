const db = require('./_postgres');
const { normalizeRoles, permissionsForRoles, dominantRole, ROLE_LABELS } = require('./_rbac');
function subjectFor(input){ return String(input.subject || input.email || input.nip || '').trim().toLowerCase(); }
function publicUser(row){
  const roles = normalizeRoles(row.roles || []);
  const explicitPermissions = Array.isArray(row.permissions) ? row.permissions : [];
  const role = dominantRole(roles);
  return { subject:row.subject, nip:row.nip || row.email || row.subject, email:row.email || '', displayName:row.display_name || row.displayName || row.email || row.subject, role, roleLabel:ROLE_LABELS[role] || role, roles, permissions:permissionsForRoles(roles, explicitPermissions), explicitPermissions, active:row.active !== false, lastLoginAt:row.last_login_at || row.lastLoginAt || null, provider:row.provider || 'oidc', createdAt:row.created_at || row.createdAt || null, updatedAt:row.updated_at || row.updatedAt || null };
}
async function ensureUser(user){
  await db.ensureCoreSchema();
  const subject = subjectFor(user);
  if(!subject) return null;
  const roles = normalizeRoles(user.roles || ['UTILISATEUR']);
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  const result = await db.query(`insert into monitoring_f7_user_profiles(subject,email,display_name,nip,roles,permissions,provider,active,last_login_at,updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,true,now(),now())
    on conflict (subject) do update set email=coalesce(excluded.email, monitoring_f7_user_profiles.email), display_name=coalesce(excluded.display_name, monitoring_f7_user_profiles.display_name), nip=coalesce(excluded.nip, monitoring_f7_user_profiles.nip), last_login_at=now(), updated_at=now()
    returning *`, [subject, user.email || null, user.displayName || user.name || null, user.nip || null, roles, permissions, user.provider || 'oidc']);
  return publicUser(result.rows[0]);
}
async function listUsers(){ await db.ensureCoreSchema(); const r = await db.query('select * from monitoring_f7_user_profiles order by active desc, display_name asc, email asc'); return (r.rows || []).map(publicUser); }
async function getUser(subject){ await db.ensureCoreSchema(); const r = await db.query('select * from monitoring_f7_user_profiles where subject=$1', [String(subject || '').toLowerCase()]); return r.rows[0] ? publicUser(r.rows[0]) : null; }
async function getUserByIdentity(values){
  await db.ensureCoreSchema();
  const identities = Array.from(new Set((Array.isArray(values) ? values : [values]).map(value => String(value || '').trim().toLowerCase()).filter(Boolean)));
  if(!identities.length) return null;
  const r = await db.query(`select * from monitoring_f7_user_profiles
    where lower(subject) = any($1::text[])
       or lower(coalesce(email,'')) = any($1::text[])
       or lower(coalesce(nip,'')) = any($1::text[])
    order by active desc, updated_at desc
    limit 1`, [identities]);
  return r.rows[0] ? publicUser(r.rows[0]) : null;
}
async function upsertUser(input){
  await db.ensureCoreSchema();
  const subject = subjectFor(input); if(!subject) throw new Error('subject_required');
  const roles = normalizeRoles(input.roles || [input.role || 'UTILISATEUR']);
  const permissions = Array.isArray(input.permissions) ? input.permissions : [];
  const r = await db.query(`insert into monitoring_f7_user_profiles(subject,email,display_name,nip,roles,permissions,provider,active,updated_at)
    values ($1,$2,$3,$4,$5,$6,'oidc',$7,now())
    on conflict (subject) do update set email=excluded.email, display_name=excluded.display_name, nip=excluded.nip, roles=excluded.roles, permissions=excluded.permissions, active=excluded.active, updated_at=now()
    returning *`, [subject, input.email || null, input.displayName || null, input.nip || null, roles, permissions, input.active !== false]);
  return publicUser(r.rows[0]);
}
module.exports = { ensureUser, listUsers, getUser, getUserByIdentity, upsertUser, publicUser };
