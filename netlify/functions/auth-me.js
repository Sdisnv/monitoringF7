const { response, verifyToken, bearerToken, publicUser, publicOidcUserFromClaims, findUser } = require('../lib/_auth-utils');
const { hasHumanIdentity } = require('../lib/_auth-identity');

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
        stored = await require('../lib/_user-store').getUserByIdentity([claims.sub, claims.email, claims.nip]);
      }catch(error){
        stored = null;
      }
      if(stored && stored.active === false) return response(403, { ok:false, error:'user_disabled' });
      safeUser = stored || publicOidcUserFromClaims(claims);
    }
    if(!hasHumanIdentity(safeUser)) return response(401, { ok:false, error:'unusable_identity', message:'Identité utilisateur indisponible.' });
    return response(200, { ok:true, user:safeUser, role:safeUser.role, roles:safeUser.roles, permissions:safeUser.permissions });
  }catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }
};
