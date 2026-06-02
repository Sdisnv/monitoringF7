const ROLE_PERMISSIONS = Object.freeze({
  'sdis-admin': ['dashboard:read','events:create','events:update','events:delete','effectifs:manage','references:manage','data:import','data:export','users:admin','audit:read','settings:manage'],
  'sdis-commandement': ['dashboard:read','events:create','events:update','effectifs:manage','references:manage','data:import','data:export','audit:read'],
  'sdis-formation': ['dashboard:read','events:create','events:update','effectifs:manage','references:manage','data:import','data:export'],
  'sdis-instructeur': ['dashboard:read','events:create','events:update','data:export'],
  'sdis-user': ['dashboard:read','events:create','events:update','data:export'],
  'sdis-readonly': ['dashboard:read','data:export']
});
const KNOWN_ROLES = Object.freeze(Object.keys(ROLE_PERMISSIONS));
const WRITE_PERMISSIONS = new Set(['events:create','events:update','data:import','effectifs:manage','references:manage','settings:manage']);
function normalizeRoles(roles){
  const input = Array.isArray(roles) ? roles : [];
  const valid = input.map(String).filter(role => ROLE_PERMISSIONS[role]);
  return valid.length ? Array.from(new Set(valid)) : ['sdis-user'];
}
function permissionsForRoles(roles, extraPermissions){
  const set = new Set();
  normalizeRoles(roles).forEach(role => (ROLE_PERMISSIONS[role] || []).forEach(p => set.add(p)));
  (Array.isArray(extraPermissions) ? extraPermissions : []).map(String).forEach(p => set.add(p));
  return Array.from(set).sort();
}
function hasPermission(claimsOrUser, permission){
  const roles = normalizeRoles(claimsOrUser?.roles);
  return permissionsForRoles(roles, claimsOrUser?.permissions).includes(permission);
}
function requirePermission(claimsOrUser, permission){
  if(!hasPermission(claimsOrUser, permission)){ const err = new Error('forbidden'); err.statusCode = 403; throw err; }
}
function canWriteRecords(claimsOrUser){
  const permissions = permissionsForRoles(claimsOrUser?.roles, claimsOrUser?.permissions);
  return permissions.some(permission => WRITE_PERMISSIONS.has(permission));
}
module.exports = { ROLE_PERMISSIONS, KNOWN_ROLES, normalizeRoles, permissionsForRoles, hasPermission, requirePermission, canWriteRecords };
