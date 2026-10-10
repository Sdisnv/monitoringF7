const {
  response,
  parseBody,
  verifyPassword,
  createPasswordHash,
  signToken,
  publicUser,
  findUser,
  isAuthMethodEnabled
} = require('./_auth-utils');
const { ACCESS_COOKIE, ACCESS_TTL_SECONDS, secureCookie } = require('./_oidc-utils');
const { createSession, SESSION_TTL_SECONDS } = require('./_local-sessions');

const DUMMY_HASH = createPasswordHash('monitoring-f7-invalid-password-placeholder', {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
  salt: 'bW9uaXRvcmluZy1mNw'
});

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  if(!isAuthMethodEnabled('local')) return response(403, { ok:false, error:'auth_method_disabled' });
  const body = parseBody(event);
  if(!body) return response(400, { ok:false, error:'invalid_json' });
  const nip = String(body.nip || '').trim();
  const password = String(body.password || '');
  if(!nip || !password) return response(400, { ok:false, error:'missing_credentials' });
  const turnstile = await require('./_turnstile').verify(body.turnstileToken);
  if(!turnstile.ok) return response(turnstile.status,{ok:false,error:turnstile.error,
    message:turnstile.status === 503 ? 'La vérification de connexion est indisponible.' : 'La vérification de connexion doit être renouvelée.'});

  try{
    const user = findUser(nip);
    const storedHash = user && (user.passwordHash || user.passwordHashScrypt);
    const valid = verifyPassword(password, storedHash || DUMMY_HASH);
    if(!user || !valid){
      return response(401, { ok:false, error:'invalid_credentials' });
    }
    const safeUser = publicUser(user);
    const sid = await createSession(event, safeUser.nip);
    const accessToken = signToken({ typ:'access', sub:safeUser.nip, nip:safeUser.nip, roles:safeUser.roles, permissions:safeUser.permissions, provider:'local', displayName:safeUser.displayName, sid }, ACCESS_TTL_SECONDS);
    const refreshToken = signToken({ typ:'refresh', sub:safeUser.nip, provider:'local', sid }, SESSION_TTL_SECONDS);
    const result = response(200, {
      ok:true,
      accessToken,
      refreshToken,
      user:safeUser,
      expiresAt:new Date(Date.now() + ACCESS_TTL_SECONDS * 1000).toISOString()
    });
    result.multiValueHeaders = { 'Set-Cookie': [secureCookie(ACCESS_COOKIE, accessToken, ACCESS_TTL_SECONDS)] };
    return result;
  }catch(error){
    return response(503, { ok:false, error:'server_auth_unavailable' });
  }
};
