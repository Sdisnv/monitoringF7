#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
process.env.MONITORING_F7_AUTH_SECRET = 'scope-auth-401-root-cause-repair-secret';
process.env.MONITORING_F7_AUTH_USERS = '[]';

const authUtils = require('../netlify/lib/_auth-utils');
const { ACCESS_COOKIE } = require('../netlify/lib/_oidc-utils');

const userStorePath = require.resolve(path.join(ROOT, 'netlify/lib/_user-store.js'));

const results = [];
let assertions = 0;

function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message){ assertions += 1; assert.ok(value, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function loadAuthMe(userStore){
  delete require.cache[require.resolve('../netlify/functions/auth-me.js')];
  require.cache[userStorePath] = { id: userStorePath, filename: userStorePath, loaded: true, exports: userStore };
  return require('../netlify/functions/auth-me.js').handler;
}

function loadRefresh(userStore){
  delete require.cache[require.resolve('../netlify/functions/auth-refresh.js')];
  require.cache[userStorePath] = { id: userStorePath, filename: userStorePath, loaded: true, exports: userStore };
  return require('../netlify/functions/auth-refresh.js').handler;
}

function event(method, token, body){
  return {
    httpMethod: method,
    headers: token ? { cookie: `${ACCESS_COOKIE}=${encodeURIComponent(token)}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function oidcToken(extra){
  return authUtils.signToken(Object.assign({
    typ: 'access',
    sub: 'okta-sub-1',
    email: 'alice.martin@sdisnv.ch',
    nip: 'alice.martin@sdisnv.ch',
    displayName: 'Alice Martin',
    roles: ['GESTIONNAIRE'],
    permissions: ['dashboard:read', 'personnel:manage'],
    provider: 'oidc'
  }, extra || {}), 3600);
}

(async () => {
  await record('01 callback/OIDC valide => session applicative signee exploitable', async () => {
    const token = oidcToken();
    const claims = authUtils.verifyToken(token, 'access');
    eq(claims.provider, 'oidc');
    eq(claims.displayName, 'Alice Martin');
    ok(claims.permissions.includes('personnel:manage'));
  });

  await record('02 meme session OIDC + profil DB indisponible => /auth/me 200', async () => {
    const handler = loadAuthMe({ async getUserByIdentity(){ throw new Error('database unavailable'); } });
    const response = await handler(event('GET', oidcToken()));
    eq(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    eq(payload.ok, true);
    eq(payload.user.displayName, 'Alice Martin');
    ok(payload.permissions.includes('personnel:manage'));
  });

  await record('03 meme session OIDC + profil DB absent => /auth/me 200', async () => {
    const handler = loadAuthMe({ async getUserByIdentity(){ return null; } });
    const response = await handler(event('GET', oidcToken()));
    eq(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    eq(payload.user.provider, 'oidc');
    eq(payload.user.email, 'alice.martin@sdisnv.ch');
  });

  await record('04 /auth/me sans session valide => 401', async () => {
    const handler = loadAuthMe({ async getUserByIdentity(){ return null; } });
    const response = await handler(event('GET'));
    eq(response.statusCode, 401);
  });

  await record('05 profil DB desactive conserve le refus', async () => {
    const handler = loadAuthMe({ async getUserByIdentity(){ return { active: false }; } });
    const response = await handler(event('GET', oidcToken()));
    eq(response.statusCode, 403);
  });

  await record('06 refresh OIDC conserve une session valide et le cookie HttpOnly', async () => {
    const handler = loadRefresh({ async getUserByIdentity(){ return null; } });
    const response = await handler(event('POST', oidcToken(), {}));
    eq(response.statusCode, 200);
    const cookie = response.multiValueHeaders['Set-Cookie'][0];
    ok(cookie.includes(`${ACCESS_COOKIE}=`));
    ok(cookie.includes('HttpOnly'));
    ok(cookie.includes('Secure'));
    ok(cookie.includes('SameSite=Lax'));
    const refreshed = JSON.parse(response.body).accessToken;
    const claims = authUtils.verifyToken(refreshed, 'access');
    eq(claims.provider, 'oidc');
    eq(claims.displayName, 'Alice Martin');
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
  console.log('SCOPE-AUTH-401-ROOT-CAUSE-REPAIR-1: PASS');
})();
