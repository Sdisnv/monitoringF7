/* SCOPE — façade RBAC frontend. Les permissions viennent du serveur. */
(function(){
  'use strict';

  function roles(){
    return Array.isArray(window.CurrentRoles) ? Array.from(window.CurrentRoles) : [];
  }

  function permissions(){
    return Array.isArray(window.CurrentPermissions) ? Array.from(new Set(window.CurrentPermissions.map(String))).sort() : [];
  }

  function has(permission){
    return permissions().includes(String(permission || ''));
  }

  function requirePermission(permission){
    if(!has(permission)) throw new Error('Accès refusé: permission '+permission);
    return true;
  }

  function applyUIRestrictions(root){
    const base = root || document;
    base.querySelectorAll('[data-rbac-permission]').forEach(el => {
      const ok = has(el.getAttribute('data-rbac-permission'));
      el.hidden = !ok;
      el.disabled = !ok;
    });
  }

  const api = Object.freeze({ roles, permissions, has, require:requirePermission, applyUIRestrictions });
  window.MonitoringRBAC = api;
  document.addEventListener('DOMContentLoaded', () => applyUIRestrictions(document));
  document.addEventListener('monitoring-f7-auth-session-changed', () => applyUIRestrictions(document));
})();
