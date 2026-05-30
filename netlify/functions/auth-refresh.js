const { response, parseBody, verifyToken, signToken, publicUser, findUser } = require('./_auth-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  const body = parseBody(event);
  if(!body) return response(400, { ok:false, error:'invalid_json' });
  try{
    const claims = verifyToken(body.refreshToken, 'refresh');
    const user = findUser(claims.sub);
    if(!user) return response(403, { ok:false, error:'user_disabled_or_unknown' });
    const safeUser = publicUser(user);
    const accessToken = signToken({ typ:'access', sub:safeUser.nip, roles:safeUser.roles }, 3600);
    return response(200, {
      ok:true,
      accessToken,
      expiresAt:new Date(Date.now() + 3600 * 1000).toISOString()
    });
  }catch(error){
    return response(401, { ok:false, error:'unauthorized', message:String(error.message || error) });
  }
};
