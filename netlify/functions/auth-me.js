const { response, verifyToken, bearerToken, publicUser, findUser } = require('./_auth-utils');
const { normalizeRoles, permissionsForRoles } = require('./_rbac');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const token = bearerToken(event);
    const claims = verifyToken(token, 'access');
    const localUser = findUser(claims.sub);
    if(!localUser && claims.provider !== 'oidc') return response(403, { ok:false, error:'user_disabled_or_unknown' });

    let safeUser = localUser ? publicUser(localUser) : null;
    if(!safeUser){
      try{
        const stored = await require('./_user-store').getUser(claims.sub);
        if(stored && stored.active === false) return response(403, { ok:false, error:'user_disabled' });
        if(stored) safeUser = stored;
      }catch(error){ /* base indisponible: l'OIDC signé reste utilisable */ }
    }
    if(!safeUser){
      const roles = normalizeRoles(claims.roles);
      safeUser = {
        subject: String(claims.sub || ''),
        nip: String(claims.nip || claims.email || claims.sub || ''),
        email: String(claims.email || ''),
        displayName: String(claims.displayName || claims.email || claims.sub || 'Utilisateur SDIS'),
        roles,
        permissions: permissionsForRoles(roles, claims.permissions),
        active: true
      };
    }
    return response(200, { ok:true, user:safeUser, roles:safeUser.roles, permissions:safeUser.permissions });
  }catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }
};
