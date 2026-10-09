const {
  response,
  parseBody,
  verifyPassword,
  createPasswordHash,
  signToken,
  publicUser,
  findUser,
  isAuthMethodEnabled
} = require('../lib/_auth-utils');
const { ACCESS_COOKIE, ACCESS_TTL_SECONDS, secureCookie } = require('../lib/_oidc-utils');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();
const DUMMY_HASH = createPasswordHash('monitoring-f7-invalid-password-placeholder', {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
  salt: 'bW9uaXRvcmluZy1mNw'
});

function clientKey(event, nip){
  const headers = event.headers || {};
  const forwarded = String(headers['x-forwarded-for'] || headers['X-Forwarded-For'] || '').split(',')[0].trim();
  const ip = forwarded || headers['client-ip'] || headers['Client-Ip'] || 'unknown';
  return `${ip}:${String(nip || '').toLowerCase()}`;
}

function readAttempt(key){
  const now = Date.now();
  const row = attempts.get(key);
  if(!row || row.resetAt <= now) return { count:0, resetAt:now + WINDOW_MS };
  return row;
}

function registerFailure(key){
  const row = readAttempt(key);
  const next = { count:row.count + 1, resetAt:row.resetAt };
  attempts.set(key, next);
  return next;
}

function resetAttempts(key){
  attempts.delete(key);
}

exports.handler = async function(event){
  if(event.httpMethod !== 'POST') return response(405, { ok:false, error:'method_not_allowed' });
  if(!isAuthMethodEnabled('local')) return response(403, { ok:false, error:'auth_method_disabled' });
  const body = parseBody(event);
  if(!body) return response(400, { ok:false, error:'invalid_json' });
  const nip = String(body.nip || '').trim();
  const password = String(body.password || '');
  if(!nip || !password) return response(400, { ok:false, error:'missing_credentials' });

  try{
    const key = clientKey(event, nip);
    const attempt = readAttempt(key);
    if(attempt.count >= MAX_ATTEMPTS){
      const blocked = response(429, { ok:false, error:'invalid_credentials' });
      blocked.headers = Object.assign({}, blocked.headers, { 'Retry-After': String(Math.ceil((attempt.resetAt - Date.now()) / 1000)) });
      return blocked;
    }
    const user = findUser(nip);
    const storedHash = user && (user.passwordHash || user.passwordHashScrypt);
    const valid = verifyPassword(password, storedHash || DUMMY_HASH);
    if(!user || !valid){
      registerFailure(key);
      return response(401, { ok:false, error:'invalid_credentials' });
    }
    resetAttempts(key);
    const safeUser = publicUser(user);
    const accessToken = signToken({ typ:'access', sub:safeUser.nip, nip:safeUser.nip, roles:safeUser.roles, permissions:safeUser.permissions, provider:'local', displayName:safeUser.displayName }, ACCESS_TTL_SECONDS);
    const refreshToken = signToken({ typ:'refresh', sub:safeUser.nip }, 12 * 3600);
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
    return response(500, { ok:false, error:'server_auth_not_configured', message:String(error.message || error) });
  }
};
