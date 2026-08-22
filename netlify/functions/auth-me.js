const { response, verifyToken, bearerToken, publicUser, findUser } = require('./_auth-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const token = bearerToken(event);
    const claims = verifyToken(token, 'access');
    const localUser = findUser(claims.sub);
    if(!localUser && claims.provider !== 'oidc') return response(403, { ok:false, error:'user_disabled_or_unknown' });

    let safeUser = localUser ? publicUser(localUser) : null;
    if(!safeUser && claims.provider === 'oidc'){
      let stored = null;
      try{
        stored = await require('./_user-store').getUserByIdentity([claims.sub, claims.email, claims.nip]);
      }catch(error){
        return response(503, { ok:false, error:'user_profile_unavailable', message:'Profil applicatif SCOPE indisponible.' });
      }
      if(stored && stored.active === false) return response(403, { ok:false, error:'user_disabled' });
      if(!stored) return response(403, { ok:false, error:'user_profile_missing', message:'Profil applicatif SCOPE introuvable.' });
      safeUser = stored;
    }
    return response(200, { ok:true, user:safeUser, role:safeUser.role, roles:safeUser.roles, permissions:safeUser.permissions });
  }catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }
};
