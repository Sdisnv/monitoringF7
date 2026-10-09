const { response, verifyToken, bearerToken, parseBody } = require('../lib/_auth-utils');
const { revokeSession } = require('../lib/_local-sessions');
const { ACCESS_COOKIE, COOKIE_NAME, clearCookie } = require('../lib/_oidc-utils');

exports.handler = async function(event){
  if(!['GET','POST'].includes(event.httpMethod)) return response(405, { ok:false, error:'method_not_allowed' });
  const body = event.httpMethod === 'POST' ? parseBody(event) : null;
  for(const token of [bearerToken(event), body?.refreshToken].filter(Boolean)){
    let claims;
    // An expired, signed access cookie still identifies the session to revoke.
    try{ claims = verifyToken(token, undefined, { allowExpired:true }); }catch(_error){ continue; }
    if(claims.provider === 'local'){
      try{ await revokeSession(event, claims); }
      catch(_error){ return response(503, { ok:false, error:'session_revocation_unavailable' }); }
    }
  }
  if(event.httpMethod === 'GET'){
    const params = new URLSearchParams(event.rawQuery || '');
    const requested = params.get('returnTo') || '/?loggedOut=1';
    const location = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/?loggedOut=1';
    return {
      statusCode:302,
      headers:{ Location:location, 'Cache-Control':'no-store' },
      multiValueHeaders:{ 'Set-Cookie':[clearCookie(ACCESS_COOKIE), clearCookie(COOKIE_NAME)] },
      body:''
    };
  }
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  const result = response(200, {
    ok:true,
    message:'Déconnexion serveur acceptée.'
  });
  result.multiValueHeaders = { 'Set-Cookie': [clearCookie(ACCESS_COOKIE), clearCookie(COOKIE_NAME)] };
  return result;
};
