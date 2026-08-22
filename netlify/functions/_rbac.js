const ROLE_PERMISSIONS = Object.freeze({
  UTILISATEUR: [
    'dashboard:read',
    'events:create',
    'events:update',
    'data:export',
    'personnel:read',
    'reports:nominatif'
  ],
  GESTIONNAIRE: [
    'dashboard:read',
    'events:create',
    'events:update',
    'effectifs:manage',
    'personnel:read',
    'personnel:manage',
    'references:manage',
    'data:import',
    'data:export',
    'reports:nominatif',
    'audit:read'
  ],
  ADMINISTRATEUR: [
    'dashboard:read',
    'events:create',
    'events:update',
    'events:delete',
    'effectifs:manage',
    'personnel:read',
    'personnel:manage',
    'references:manage',
    'data:import',
    'data:export',
    'reports:nominatif',
    'users:admin',
    'admin:manage',
    'audit:read',
    'settings:manage'
  ]
});

const ROLE_LABELS = Object.freeze({
  UTILISATEUR: 'Utilisateur',
  GESTIONNAIRE: 'Gestionnaire',
  ADMINISTRATEUR: 'Administrateur'
});

const ROLE_ALIASES = Object.freeze({
  utilisateur: 'UTILISATEUR',
  user: 'UTILISATEUR',
  sdis_user: 'UTILISATEUR',
  sdis_instructeur: 'UTILISATEUR',
  sdis_readonly: 'UTILISATEUR',
  gestionnaire: 'GESTIONNAIRE',
  manager: 'GESTIONNAIRE',
  commandement: 'GESTIONNAIRE',
  sdis_commandement: 'GESTIONNAIRE',
  sdis_chef_formation: 'GESTIONNAIRE',
  sdis_formation: 'GESTIONNAIRE',
  administrateur: 'ADMINISTRATEUR',
  administration: 'ADMINISTRATEUR',
  admin: 'ADMINISTRATEUR',
  sdis_admin: 'ADMINISTRATEUR'
});

const ROLE_PRIORITY = Object.freeze(['ADMINISTRATEUR', 'GESTIONNAIRE', 'UTILISATEUR']);
const KNOWN_ROLES = Object.freeze(ROLE_PRIORITY.slice().reverse());
const WRITE_PERMISSIONS = new Set(['events:create', 'events:update', 'data:import', 'effectifs:manage', 'personnel:manage', 'references:manage', 'settings:manage']);

function roleKey(value){
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeRole(role){
  const raw = String(role || '').trim();
  const upper = raw.toUpperCase();
  if(ROLE_PERMISSIONS[upper]) return upper;
  return ROLE_ALIASES[roleKey(raw)] || '';
}

function normalizeRoles(roles){
  const input = Array.isArray(roles) ? roles : [roles];
  const valid = input.map(normalizeRole).filter(Boolean);
  return valid.length ? Array.from(new Set(valid)) : ['UTILISATEUR'];
}

function dominantRole(roles){
  const normalized = normalizeRoles(roles);
  return ROLE_PRIORITY.find(role => normalized.includes(role)) || 'UTILISATEUR';
}

function permissionsForRoles(roles, extraPermissions){
  const set = new Set();
  normalizeRoles(roles).forEach(role => (ROLE_PERMISSIONS[role] || []).forEach(p => set.add(p)));
  (Array.isArray(extraPermissions) ? extraPermissions : []).map(String).filter(Boolean).forEach(p => set.add(p));
  return Array.from(set).sort();
}

function hasPermission(claimsOrUser, permission){
  const roles = normalizeRoles(claimsOrUser && claimsOrUser.roles);
  return permissionsForRoles(roles, claimsOrUser && claimsOrUser.permissions).includes(permission);
}

function requirePermission(claimsOrUser, permission){
  if(!hasPermission(claimsOrUser, permission)){
    const err = new Error('forbidden');
    err.statusCode = 403;
    throw err;
  }
}

function canWriteRecords(claimsOrUser){
  const permissions = permissionsForRoles(claimsOrUser && claimsOrUser.roles, claimsOrUser && claimsOrUser.permissions);
  return permissions.some(permission => WRITE_PERMISSIONS.has(permission));
}

function isAdminRole(roles){
  return normalizeRoles(roles).includes('ADMINISTRATEUR');
}

module.exports = {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLE_ALIASES,
  KNOWN_ROLES,
  normalizeRole,
  normalizeRoles,
  dominantRole,
  permissionsForRoles,
  hasPermission,
  requirePermission,
  canWriteRecords,
  isAdminRole
};
