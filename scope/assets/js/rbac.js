/* Monitoring F7 v66.0 — RBAC institutionnel centralisé côté frontend. */
(function(){
  'use strict';
  const ROLE_PERMISSIONS = Object.freeze({
    'sdis-admin': ['dashboard:read','events:create','events:update','events:delete','effectifs:manage','personnel:manage','references:manage','data:import','data:export','personnel:read','reports:nominatif','users:admin','audit:read','settings:manage'],
    'sdis-commandement': ['dashboard:read','events:create','events:update','effectifs:manage','personnel:manage','references:manage','data:import','data:export','personnel:read','reports:nominatif','audit:read'],
    'sdis-chef-formation': ['dashboard:read','events:create','events:update','effectifs:manage','personnel:manage','references:manage','data:import','data:export','personnel:read','reports:nominatif','audit:read'],
    'sdis-formation': ['dashboard:read','events:create','events:update','effectifs:manage','personnel:manage','references:manage','data:import','data:export','personnel:read','reports:nominatif'],
    'sdis-instructeur': ['dashboard:read','events:create','events:update','data:export','personnel:read','reports:nominatif'],
    'sdis-user': ['dashboard:read','events:create','events:update','data:export','personnel:read','reports:nominatif'],
    'sdis-readonly': ['dashboard:read','data:export']
  });
  function roles(){ return Array.isArray(window.CurrentRoles) ? Array.from(window.CurrentRoles) : []; }
  function explicitPermissions(){ return Array.isArray(window.CurrentPermissions) ? Array.from(window.CurrentPermissions) : []; }
  function permissions(){
    const set = new Set(explicitPermissions());
    roles().forEach(role => (ROLE_PERMISSIONS[role] || []).forEach(p => set.add(p)));
    return Array.from(set).sort();
  }
  function has(permission){ return permissions().includes(permission); }
  function requirePermission(permission){ if(!has(permission)) throw new Error('Accès refusé: permission '+permission); return true; }
  function applyUIRestrictions(root){
    const base = root || document;
    base.querySelectorAll('[data-rbac-permission]').forEach(el => {
      const ok = has(el.getAttribute('data-rbac-permission'));
      el.hidden = !ok;
      el.disabled = !ok;
    });
  }
  const api = Object.freeze({ ROLE_PERMISSIONS, roles, permissions, has, require:requirePermission, applyUIRestrictions });
  window.MonitoringRBAC = api;
  document.addEventListener('DOMContentLoaded', () => applyUIRestrictions(document));
  document.addEventListener('monitoring-f7-auth-session-changed', () => applyUIRestrictions(document));
})();
