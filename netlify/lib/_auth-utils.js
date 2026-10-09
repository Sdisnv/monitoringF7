const crypto = require('crypto');
const { normalizeRoles, permissionsForRoles } = require('./_rbac');
const { displayNameFromUser } = require('./_auth-identity');

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function response(statusCode, payload){
  let metricsHeaders = {};
  try{
    const db = require('./_postgres');
    const metrics = db.currentMetrics && db.currentMetrics();
    if(metrics){
      metricsHeaders = {
        'Server-Timing': [
          `scope;dur=${Number(metrics.totalMs || 0)}`,
          `db-acquire;dur=${Number(metrics.dbAcquireMs || 0)}`,
          `db-sql;dur=${Number(metrics.sqlMs || 0)}`,
          `db-queries;desc="${Number(metrics.queryCount || 0)}"`
        ].join(', '),
        'X-Scope-Perf': JSON.stringify({
          totalMs: Number(metrics.totalMs || 0),
          dbAcquireMs: Number(metrics.dbAcquireMs || 0),
          sqlMs: Number(metrics.sqlMs || 0),
          queryCount: Number(metrics.queryCount || 0)
        }),
        'Access-Control-Expose-Headers': 'Server-Timing, X-Scope-Perf'
      };
    }
  }catch(_error){
    metricsHeaders = {};
  }
  return {
    statusCode,
    headers: Object.assign({}, jsonHeaders, metricsHeaders),
    body: JSON.stringify(payload)
  };
}

function parseBody(event){
  if(!event.body) return {};
  try { return JSON.parse(event.body); }
  catch (_error) { return null; }
}

function base64url(input){
  return Buffer.from(input).toString('base64url');
}

function hashPassword(password){
  return crypto.createHash('sha256').update(String(password || ''), 'utf8').digest('hex');
}

const SCRYPT_DEFAULTS = Object.freeze({ N: 16384, r: 8, p: 1, keylen: 64 });

function scryptParams(){
  const N = Number(process.env.MONITORING_F7_AUTH_SCRYPT_N || SCRYPT_DEFAULTS.N);
  const r = Number(process.env.MONITORING_F7_AUTH_SCRYPT_R || SCRYPT_DEFAULTS.r);
  const p = Number(process.env.MONITORING_F7_AUTH_SCRYPT_P || SCRYPT_DEFAULTS.p);
  const keylen = Number(process.env.MONITORING_F7_AUTH_SCRYPT_KEYLEN || SCRYPT_DEFAULTS.keylen);
  return {
    N: Number.isFinite(N) && N >= 16384 ? N : SCRYPT_DEFAULTS.N,
    r: Number.isFinite(r) && r >= 8 ? r : SCRYPT_DEFAULTS.r,
    p: Number.isFinite(p) && p >= 1 ? p : SCRYPT_DEFAULTS.p,
    keylen: Number.isFinite(keylen) && keylen >= 32 ? keylen : SCRYPT_DEFAULTS.keylen
  };
}

function createPasswordHash(password, options){
  const params = Object.assign({}, scryptParams(), options || {});
  const salt = options && options.salt ? Buffer.from(options.salt, 'base64url') : crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password || ''), salt, params.keylen, { N:params.N, r:params.r, p:params.p, maxmem:128 * 1024 * 1024 });
  return `scrypt$v=1$N=${params.N}$r=${params.r}$p=${params.p}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function parseScryptHash(stored){
  const parts = String(stored || '').split('$');
  if(parts.length !== 7 || parts[0] !== 'scrypt' || parts[1] !== 'v=1') return null;
  const params = {};
  for(const part of parts.slice(2, 5)){
    const [key, value] = part.split('=');
    params[key] = Number(value);
  }
  if(!Number.isFinite(params.N) || !Number.isFinite(params.r) || !Number.isFinite(params.p)) return null;
  return {
    N: params.N,
    r: params.r,
    p: params.p,
    salt: Buffer.from(parts[5], 'base64url'),
    hash: Buffer.from(parts[6], 'base64url')
  };
}

function timingEqualBuffers(a, b){
  const left = Buffer.isBuffer(a) ? a : Buffer.from(String(a || ''));
  const right = Buffer.isBuffer(b) ? b : Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyPassword(password, storedHash){
  const parsed = parseScryptHash(storedHash);
  if(parsed){
    const derived = crypto.scryptSync(String(password || ''), parsed.salt, parsed.hash.length, {
      N:parsed.N,
      r:parsed.r,
      p:parsed.p,
      maxmem:128 * 1024 * 1024
    });
    return timingEqualBuffers(derived, parsed.hash);
  }
  if(process.env.MONITORING_F7_ALLOW_LEGACY_SHA256 === 'true' && /^[a-f0-9]{64}$/i.test(String(storedHash || ''))){
    return timingEqualHex(hashPassword(password), storedHash);
  }
  return false;
}

function timingEqualHex(a, b){
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getSecret(){
  const secret = process.env.MONITORING_F7_AUTH_SECRET || '';
  if(secret.length < 32) throw new Error('MONITORING_F7_AUTH_SECRET manquant ou trop court.');
  return secret;
}

function getUsers(){
  const raw = process.env.MONITORING_F7_AUTH_USERS || '[]';
  const parsed = JSON.parse(raw);
  if(!Array.isArray(parsed)) throw new Error('MONITORING_F7_AUTH_USERS doit être un tableau JSON.');
  return parsed;
}

function getAuthMethods(){
  const raw = String(process.env.MONITORING_F7_AUTH_METHODS || process.env.MONITORING_F7_AUTH_MODE || 'okta')
    .split(/[,+\s]+/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  const aliases = { oidc:'okta', institutional:'okta', institutionnel:'okta', password:'local' };
  const methods = raw.map(value => aliases[value] || value).filter(value => value === 'local' || value === 'okta');
  const unique = Array.from(new Set(methods));
  return unique.length ? unique : ['okta'];
}

function isAuthMethodEnabled(method){
  return getAuthMethods().includes(String(method || '').toLowerCase());
}

function signToken(payload, ttlSeconds){
  const now = Math.floor(Date.now() / 1000);
  const header = { alg:'HS256', typ:'JWT' };
  const body = Object.assign({}, payload, { iat:now, exp:now + ttlSeconds });
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', getSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyToken(token, expectedType){
  const parts = String(token || '').split('.');
  if(parts.length !== 3) throw new Error('Token invalide.');
  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(unsigned).digest('base64url');
  if(!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Signature invalide.');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if(expectedType && parsed.typ !== expectedType) throw new Error('Type de token invalide.');
  if(Number(parsed.exp || 0) < Math.floor(Date.now() / 1000)) throw new Error('Token expiré.');
  return parsed;
}

function bearerToken(event){
  const header = event.headers.authorization || event.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  if(match) return match[1];
  const rawCookie = event.headers.cookie || event.headers.Cookie || '';
  const cookies = String(rawCookie).split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if(index > -1) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return acc;
  }, {});
  return cookies.monitoring_f7_access || '';
}

function publicUser(user){
  return {
    subject: String(user.subject || user.sub || user.nip || ''),
    nip: String(user.nip || ''),
    displayName: displayNameFromUser(user),
    email: String(user.email || ''),
    roles: normalizeRoles(user.roles),
    permissions: permissionsForRoles(user.roles, user.permissions)
  };
}

function publicOidcUserFromClaims(claims){
  const roles = normalizeRoles(claims.roles || []);
  return {
    subject: String(claims.sub || claims.subject || claims.email || claims.nip || ''),
    nip: String(claims.nip || claims.email || claims.sub || ''),
    email: String(claims.email || ''),
    displayName: displayNameFromUser({
      displayName: claims.displayName,
      name: claims.name,
      email: claims.email,
      nip: claims.nip,
      subject: claims.sub || claims.subject
    }),
    role: roles[0],
    roles,
    permissions: permissionsForRoles(roles, claims.permissions),
    provider: 'oidc'
  };
}

function findUser(nip){
  return getUsers().find(user => String(user.nip || '') === String(nip || '') && user.active !== false) || null;
}

async function resolveSessionUser(claims){
  if(claims && claims.provider === 'local'){
    const user = findUser(claims.sub || claims.nip);
    if(!user){
      const err = new Error('user_disabled_or_unknown');
      err.statusCode = 403;
      throw err;
    }
    return Object.assign({}, publicUser(user), { sub:user.nip, provider:'local' });
  }
  if(claims && claims.provider === 'oidc'){
    let stored = null;
    try{
      stored = await require('./_user-store').getUserByIdentity([claims.sub, claims.email, claims.nip]);
    }catch(_error){
      stored = null;
    }
    if(stored && stored.active === false){
      const err = new Error('user_disabled');
      err.statusCode = 403;
      throw err;
    }
    return stored || claims;
  }
  return claims;
}

module.exports = {
  response,
  parseBody,
  hashPassword,
  createPasswordHash,
  verifyPassword,
  timingEqualHex,
  getAuthMethods,
  isAuthMethodEnabled,
  signToken,
  verifyToken,
  bearerToken,
  publicUser,
  publicOidcUserFromClaims,
  findUser,
  resolveSessionUser
};
