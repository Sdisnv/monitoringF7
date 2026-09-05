const crypto = require('crypto');
const { normalizeRoles, permissionsForRoles } = require('./_rbac');
const { displayNameFromUser } = require('./_auth-identity');

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function response(statusCode, payload){
  return {
    statusCode,
    headers: jsonHeaders,
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
    nip: String(user.nip || ''),
    displayName: displayNameFromUser(user),
    roles: normalizeRoles(user.roles),
    permissions: permissionsForRoles(user.roles, user.permissions)
  };
}

function findUser(nip){
  return getUsers().find(user => String(user.nip || '') === String(nip || '') && user.active !== false) || null;
}

module.exports = {
  response,
  parseBody,
  hashPassword,
  timingEqualHex,
  signToken,
  verifyToken,
  bearerToken,
  publicUser,
  findUser
};
