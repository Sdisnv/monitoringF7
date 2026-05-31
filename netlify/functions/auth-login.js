const {
  response,
  parseBody,
  hashPassword,
  timingEqualHex,
  signToken,
  publicUser,
  findUser
} = require('./_auth-utils');

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  const body = parseBody(event);
  if(!body) return response(400, { ok:false, error:'invalid_json' });
  const nip = String(body.nip || '').trim();
  const password = String(body.password || '');
  if(!nip || !password) return response(400, { ok:false, error:'missing_credentials' });

  try{
    const user = findUser(nip);
    if(!user || !timingEqualHex(hashPassword(password), user.passwordHash)){
      return response(401, { ok:false, error:'invalid_credentials' });
    }
    const safeUser = publicUser(user);
    const accessToken = signToken({ typ:'access', sub:safeUser.nip, roles:safeUser.roles }, 3600);
    const refreshToken = signToken({ typ:'refresh', sub:safeUser.nip }, 12 * 3600);
    return response(200, {
      ok:true,
      accessToken,
      refreshToken,
      user:safeUser,
      expiresAt:new Date(Date.now() + 3600 * 1000).toISOString()
    });
  }catch(error){
    return response(500, { ok:false, error:'server_auth_not_configured', message:String(error.message || error) });
  }
};
