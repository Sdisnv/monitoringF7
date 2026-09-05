const { response, parseBody, verifyToken, signToken, bearerToken, publicUser, findUser } = require('../lib/_auth-utils');
const { ACCESS_COOKIE, ACCESS_TTL_SECONDS, secureCookie } = require('../lib/_oidc-utils');

function claimsForAccess(claims){
  const next = Object.assign({}, claims || {});
  delete next.iat;
  delete next.exp;
  next.typ = 'access';
  return next;
}

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  const body = parseBody(event);
  if(body === null) return response(400, { ok:false, error:'invalid_json' });
  try{
    let claims;
    if(body && body.refreshToken){
      claims = verifyToken(body.refreshToken, 'refresh');
      const user = findUser(claims.sub);
      if(!user) return response(403, { ok:false, error:'user_disabled_or_unknown' });
      const safeUser = publicUser(user);
      claims = { typ:'access', sub:safeUser.nip, roles:safeUser.roles };
    } else {
      claims = verifyToken(bearerToken(event), 'access');
    }
    const accessToken = signToken(claimsForAccess(claims), ACCESS_TTL_SECONDS);
    const result = response(200, {
      ok:true,
      accessToken,
      expiresAt:new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString()
    });
    result.multiValueHeaders = { 'Set-Cookie': [secureCookie(ACCESS_COOKIE, accessToken, ACCESS_TTL_SECONDS)] };
    return result;
  }catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }
};
