#!/usr/bin/env node
'use strict';

const assert = require('assert');
const blobRows = new Map();
const blobsId = require.resolve('@netlify/blobs');
require.cache[blobsId] = { id:blobsId, filename:blobsId, loaded:true, exports:{
  connectLambda(){},
  getDeployStore(){ return {
    async setJSON(key,value){blobRows.set(key,value);},
    async get(key){return blobRows.get(key)||null;},
    async delete(key){blobRows.delete(key);}
  }; }
} };

process.env.MONITORING_F7_AUTH_SECRET = 'scope-prod-local-auth-1-secret-20261009';
process.env.MONITORING_F7_AUTH_METHODS = 'local';

const authUtils = require('../netlify/lib/_auth-utils');
const { ACCESS_COOKIE } = require('../netlify/lib/_oidc-utils');

const adminHash = authUtils.createPasswordHash('Correct-Admin-Password-1!');
const userHash = authUtils.createPasswordHash('Correct-User-Password-1!');
process.env.MONITORING_F7_AUTH_USERS = JSON.stringify([
  { nip:'admin.local', displayName:'Admin Local', roles:['ADMINISTRATEUR'], active:true, passwordHash:adminHash },
  { nip:'user.local', displayName:'User Local', roles:['UTILISATEUR'], active:true, passwordHash:userHash },
  { nip:'disabled.local', displayName:'Disabled Local', roles:['GESTIONNAIRE'], active:false, passwordHash:authUtils.createPasswordHash('Disabled-Password-1!') }
]);

const login = require('../netlify/lib/_local-login').handler;
const me = require('../netlify/functions/auth-me').handler;
const refresh = require('../netlify/functions/auth-refresh').handler;
const authConfig = require('../netlify/functions/auth-config').handler;
const oidcStart = require('../netlify/functions/auth-oidc-start').handler;
const dataRecords = require('../netlify/functions/data-records').handler;
const adminUsers = require('../netlify/functions/admin-users').handler;

const results = [];
let assertions = 0;

function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function ok(value, message){ assertions += 1; assert.ok(value, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status:'PASS' });
  }catch(error){
    results.push({ name, status:'NOK', proof:String(error && error.stack || error) });
  }
}

function event(method, body, token){
  return {
    httpMethod: method,
    headers: token ? { cookie:`${ACCESS_COOKIE}=${encodeURIComponent(token)}` } : { 'x-forwarded-for':'127.0.0.1' },
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

async function loginToken(nip, password){
  const response = await login(event('POST', { nip, password }));
  const payload = JSON.parse(response.body);
  return { response, payload, token:payload.accessToken };
}

(async () => {
  await record('01 configuration serveur LOCAL actif OKTA inactif', async () => {
    const response = await authConfig(event('GET'));
    eq(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    eq(payload.localEnabled, true);
    eq(payload.oktaEnabled, false);
    eq(payload.methods.join(','), 'local');
  });

  await record('02 connexion LOCAL autorisee avec hash scrypt et cookie HttpOnly', async () => {
    const { response, payload, token } = await loginToken('admin.local', 'Correct-Admin-Password-1!');
    eq(response.statusCode, 200);
    eq(payload.ok, true);
    eq(payload.user.provider, undefined);
    ok(String(payload.accessToken || '').split('.').length === 3);
    ok(response.multiValueHeaders['Set-Cookie'][0].includes(`${ACCESS_COOKIE}=`));
    ok(response.multiValueHeaders['Set-Cookie'][0].includes('HttpOnly'));
    const claims = authUtils.verifyToken(token, 'access');
    eq(claims.provider, 'local');
    ok(claims.roles.includes('ADMINISTRATEUR'));
  });

  await record('03 mot de passe incorrect refuse sans enumeration', async () => {
    const response = await login(event('POST', { nip:'admin.local', password:'bad-password' }));
    eq(response.statusCode, 401);
    eq(JSON.parse(response.body).error, 'invalid_credentials');
    const missing = await login(event('POST', { nip:'missing.local', password:'bad-password' }));
    eq(missing.statusCode, 401);
    eq(JSON.parse(missing.body).error, 'invalid_credentials');
  });

  await record('04 compte desactive refuse', async () => {
    const response = await login(event('POST', { nip:'disabled.local', password:'Disabled-Password-1!' }));
    eq(response.statusCode, 401);
    eq(JSON.parse(response.body).error, 'invalid_credentials');
  });

  await record('05 session LOCAL valide accepte auth-me et conserve les habilitations', async () => {
    const { token } = await loginToken('admin.local', 'Correct-Admin-Password-1!');
    const response = await me(event('GET', undefined, token));
    eq(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    eq(payload.user.nip, 'admin.local');
    ok(payload.permissions.includes('users:admin'));
  });

  await record('06 API protegee refuse non authentifie', async () => {
    const response = await dataRecords(event('GET'));
    eq(response.statusCode, 401);
  });

  await record('07 action sans permission refusee', async () => {
    const { token } = await loginToken('user.local', 'Correct-User-Password-1!');
    const response = await adminUsers(event('GET', undefined, token));
    eq(response.statusCode, 403);
  });

  await record('08 refresh LOCAL renouvelle uniquement si compte actif', async () => {
    const { payload } = await loginToken('user.local', 'Correct-User-Password-1!');
    const response = await refresh(event('POST', { refreshToken:payload.refreshToken }));
    eq(response.statusCode, 200);
    const refreshed = JSON.parse(response.body).accessToken;
    const claims = authUtils.verifyToken(refreshed, 'access');
    eq(claims.provider, 'local');
    eq(claims.sub, 'user.local');
  });

  await record('09 OKTA desactive par configuration serveur', async () => {
    const response = await oidcStart(event('GET'));
    eq(response.statusCode, 403);
    eq(JSON.parse(response.body).error, 'auth_method_disabled');
  });

  await record('10 OKTA reactive par configuration sans migration', async () => {
    process.env.MONITORING_F7_AUTH_METHODS = 'local,okta';
    const response = await authConfig(event('GET'));
    eq(response.statusCode, 200);
    const payload = JSON.parse(response.body);
    eq(payload.localEnabled, true);
    eq(payload.oktaEnabled, true);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter(row => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
  console.log('SCOPE-PROD-LOCAL-AUTH-1: PASS');
})();
