const { response, verifyToken, bearerToken, publicUser, findUser } = require('./_auth-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'GET') return response(405, { ok:false, error:'method_not_allowed' });
  try{
    const token = bearerToken(event);
    const claims = verifyToken(token, 'access');
    const user = findUser(claims.sub);
    if(!user && claims.provider !== 'oidc') return response(403, { ok:false, error:'user_disabled_or_unknown' });
    const safeUser = user ? publicUser(user) : {
      nip: String(claims.sub || ''),
      displayName: String(claims.displayName || claims.sub || 'Utilisateur SDIS'),
      roles: Array.isArray(claims.roles) ? claims.roles : ['sdis-user'],
      permissions: []
    };
    return response(200, { ok:true, user:safeUser, roles:safeUser.roles, permissions:safeUser.permissions });
  }catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }
};
