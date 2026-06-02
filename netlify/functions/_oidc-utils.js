const crypto = require('crypto');
const { signToken } = require('./_auth-utils');
const { normalizeRoles, permissionsForRoles } = require('./_rbac');

const COOKIE_NAME = 'monitoring_f7_oidc_state';
const ACCESS_COOKIE = 'monitoring_f7_access';

function base64url(input){
  return Buffer.from(input).toString('base64url');
}

function decodeBase64url(value){
  return Buffer.from(String(value || ''), 'base64url').toString('utf8');
}

function jsonFromBase64url(value){
  return JSON.parse(decodeBase64url(value));
}

function requiredEnv(name){
  const value = process.env[name] || '';
  if(!value) throw new Error(`${name} manquant.`);
  return value;
}

function oidcConfig(){
  const issuer = requiredEnv('OKTA_ISSUER').replace(/\/+$/, '');
  return {
    issuer,
    clientId: requiredEnv('OKTA_CLIENT_ID'),
    clientSecret: requiredEnv('OKTA_CLIENT_SECRET'),
    redirectUri: requiredEnv('OIDC_REDIRECT_URI'),
    scopes: process.env.OIDC_SCOPES || 'openid profile email groups',
    forceLoginPrompt: process.env.OIDC_FORCE_LOGIN_PROMPT !== 'false',
    allowedGroups: String(process.env.OKTA_ALLOWED_GROUPS || '').split(',').map(v => v.trim()).filter(Boolean),
    adminGroups: String(process.env.OKTA_ADMIN_GROUPS || '').split(',').map(v => v.trim()).filter(Boolean)
  };
}

function hmac(value){
  return crypto.createHmac('sha256', requiredEnv('MONITORING_F7_AUTH_SECRET')).update(value).digest('base64url');
}

function signedStateCookie(payload){
  const encoded = base64url(JSON.stringify(payload));
  return `${encoded}.${hmac(encoded)}`;
}

function verifyStateCookie(cookieValue){
  const [encoded, signature] = String(cookieValue || '').split('.');
  if(!encoded || !signature || hmac(encoded) !== signature) throw new Error('Etat OIDC invalide.');
  const payload = jsonFromBase64url(encoded);
  if(Date.now() - Number(payload.createdAt || 0) > 10 * 60 * 1000) throw new Error('Etat OIDC expire.');
  return payload;
}

function parseCookies(event){
  const raw = event.headers.cookie || event.headers.Cookie || '';
  return String(raw).split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if(index > -1) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return acc;
  }, {});
}

function secureCookie(name, value, maxAgeSeconds){
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function clearCookie(name){
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

async function discovery(config){
  const response = await fetch(`${config.issuer}/.well-known/openid-configuration`);
  if(!response.ok) throw new Error(`Discovery OIDC impossible: ${response.status}`);
  return response.json();
}

async function tokenRequest(config, code){
  const metadata = await discovery(config);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret
  });
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type':'application/x-www-form-urlencoded' },
    body
  });
  const payload = await response.json();
  if(!response.ok) throw new Error(payload.error_description || payload.error || `Token OIDC refuse: ${response.status}`);
  return { metadata, payload };
}

async function jwkForToken(metadata, token){
  const [headerPart] = token.split('.');
  const header = jsonFromBase64url(headerPart);
  const response = await fetch(metadata.jwks_uri);
  if(!response.ok) throw new Error(`JWKS OIDC impossible: ${response.status}`);
  const jwks = await response.json();
  const jwk = (jwks.keys || []).find(key => key.kid === header.kid);
  if(!jwk) throw new Error('Cle publique OIDC introuvable.');
  return { jwk, header };
}

async function verifyIdToken(config, metadata, idToken, expectedNonce){
  const parts = String(idToken || '').split('.');
  if(parts.length !== 3) throw new Error('ID token OIDC invalide.');
  const [headerPart, payloadPart, signaturePart] = parts;
  const { jwk, header } = await jwkForToken(metadata, idToken);
  if(header.alg !== 'RS256') throw new Error(`Algorithme OIDC non supporte: ${header.alg}`);
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  const publicKey = crypto.createPublicKey({ key:jwk, format:'jwk' });
  const valid = verifier.verify(publicKey, Buffer.from(signaturePart, 'base64url'));
  if(!valid) throw new Error('Signature ID token invalide.');
  const claims = jsonFromBase64url(payloadPart);
  const now = Math.floor(Date.now() / 1000);
  if(claims.iss !== config.issuer) throw new Error('Issuer OIDC invalide.');
  if(claims.aud !== config.clientId && !(Array.isArray(claims.aud) && claims.aud.includes(config.clientId))) throw new Error('Audience OIDC invalide.');
  if(Number(claims.exp || 0) < now) throw new Error('ID token expire.');
  if(expectedNonce && claims.nonce !== expectedNonce) throw new Error('Nonce OIDC invalide.');
  return claims;
}

function rolesFromClaims(config, claims){
  const groups = Array.isArray(claims.groups) ? claims.groups : [];
  if(config.allowedGroups.length && !groups.some(group => config.allowedGroups.includes(group))){
    throw new Error('Groupe Okta non autorise.');
  }
  const roles = ['sdis-user'];
  if(groups.some(group => config.adminGroups.includes(group))) roles.push('sdis-admin');
  return roles;
}

function publicUserFromClaims(claims, roles){
  const subject = String(claims.sub || claims.email || claims.preferred_username || '');
  const normalizedRoles = normalizeRoles(roles);
  return {
    subject,
    nip: String(claims.preferred_username || claims.email || claims.sub || ''),
    email: String(claims.email || claims.preferred_username || ''),
    displayName: String(claims.name || claims.email || claims.preferred_username || 'Utilisateur SDIS'),
    roles: normalizedRoles,
    permissions: permissionsForRoles(normalizedRoles)
  };
}

function sanitizeReturnTo(value){
  const fallback = '/';
  const raw = String(value || '').trim();
  if(!raw) return fallback;
  if(/^javascript:/i.test(raw)) return fallback;
  if(raw.startsWith('//')) return fallback;
  if(/^https?:\/\//i.test(raw)) return fallback;
  if(!raw.startsWith('/')) return fallback;
  try{
    const parsed = new URL(raw, 'https://monitoring-f7.local');
    if(parsed.origin !== 'https://monitoring-f7.local') return fallback;
    return `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}` || fallback;
  }catch{
    return fallback;
  }
}

function redirect(statusCode, location, cookies){
  return {
    statusCode,
    headers: { Location: location, 'Cache-Control':'no-store' },
    multiValueHeaders: cookies && cookies.length ? { 'Set-Cookie': cookies } : undefined,
    body: ''
  };
}

function oidcStartResponse(event){
  const config = oidcConfig();
  const params = new URLSearchParams(event?.rawQuery || '');
  const returnTo = sanitizeReturnTo(params.get('returnTo') || '/');
  const state = crypto.randomBytes(24).toString('base64url');
  const nonce = crypto.randomBytes(24).toString('base64url');
  const cookie = signedStateCookie({ state, nonce, returnTo, createdAt:Date.now() });
  const authorize = new URL(`${config.issuer}/v1/authorize`);
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('scope', config.scopes);
  authorize.searchParams.set('redirect_uri', config.redirectUri);
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('nonce', nonce);
  if(config.forceLoginPrompt){
    authorize.searchParams.set('prompt', 'login');
    authorize.searchParams.set('max_age', '0');
  }
  return redirect(302, authorize.toString(), [secureCookie(COOKIE_NAME, cookie, 600)]);
}

async function oidcCallbackResponse(event){
  const config = oidcConfig();
  const params = new URLSearchParams(event.rawQuery || '');
  const code = params.get('code');
  const state = params.get('state');
  if(!code || !state) throw new Error('Callback OIDC incomplet.');
  const statePayload = verifyStateCookie(parseCookies(event)[COOKIE_NAME]);
  if(statePayload.state !== state) throw new Error('State OIDC invalide.');
  const { metadata, payload } = await tokenRequest(config, code);
  const claims = await verifyIdToken(config, metadata, payload.id_token, statePayload.nonce);
  const roles = rolesFromClaims(config, claims);
  const user = publicUserFromClaims(claims, roles);
  let effectiveUser = user;
  try {
    const storedUser = await require('./_user-store').ensureUser(Object.assign({}, user, { provider:'oidc' }));
    if(storedUser && storedUser.active === false) throw new Error('Utilisateur désactivé.');
    if(storedUser) effectiveUser = storedUser;
  } catch(error) {
    if(String(error.message || error).includes('désactivé')) throw error;
    /* profil PostgreSQL optionnel, l'OIDC reste source de vérité */
  }
  try { await require('./_audit-store').addAudit({ eventType:'login-okta-oidc', message:'Connexion Okta validée.', actorSubject:effectiveUser.subject || effectiveUser.nip, context:{ roles:effectiveUser.roles } }); } catch(error) {}
  const accessToken = signToken({ typ:'access', sub:effectiveUser.subject || effectiveUser.nip, email:effectiveUser.email, nip:effectiveUser.nip, roles:effectiveUser.roles, permissions:effectiveUser.permissions, provider:'oidc', displayName:effectiveUser.displayName }, 3600);
  const returnTo = sanitizeReturnTo(statePayload.returnTo || '/');
  return redirect(302, returnTo, [
    clearCookie(COOKIE_NAME),
    secureCookie(ACCESS_COOKIE, accessToken, 3600)
  ]);
}

module.exports = {
  COOKIE_NAME,
  ACCESS_COOKIE,
  clearCookie,
  oidcStartResponse,
  oidcCallbackResponse,
  sanitizeReturnTo
};
