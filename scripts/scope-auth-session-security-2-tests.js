const assert = require('node:assert/strict');
const path = require('node:path');

const rows = new Map();
let unavailable = false;
const blobsId = require.resolve('@netlify/blobs');
require.cache[blobsId] = { id:blobsId, filename:blobsId, loaded:true, exports:{
  connectLambda(){},
  getDeployStore(options){
    assert.equal(options.consistency, 'strong');
    assert.equal(options.name, 'scope-local-auth-sessions');
    return {
      async setJSON(key, value){ if(unavailable) throw new Error('unavailable'); rows.set(key, value); },
      async get(key){ if(unavailable) throw new Error('unavailable'); return rows.get(key) || null; },
      async delete(key){ if(unavailable) throw new Error('unavailable'); rows.delete(key); }
    };
  }
} };
process.env.MONITORING_F7_AUTH_SECRET = 'test-only-session-security-secret-2';
process.env.MONITORING_F7_AUTH_METHODS = 'local';
const auth = require('../netlify/lib/_auth-utils');
const { ACCESS_COOKIE } = require('../netlify/lib/_oidc-utils');
const user = { nip:'test.admin', displayName:'Test Admin', active:true, roles:['ADMINISTRATEUR'], passwordHash:auth.createPasswordHash('synthetic-password-only') };
function updateUser(){ process.env.MONITORING_F7_AUTH_USERS = JSON.stringify([user]); }
updateUser();
const loginModule = require('../netlify/lib/_local-login');
const login = loginModule.handler;
const me = require('../netlify/functions/auth-me').handler;
const refresh = require('../netlify/functions/auth-refresh').handler;
const logout = require('../netlify/functions/auth-logout').handler;
function event(method, token, body){ return { httpMethod:method, headers:token ? {cookie:`${ACCESS_COOKIE}=${token}`} : {}, body:body ? JSON.stringify(body) : undefined }; }
async function signIn(){
  const r = await login(event('POST', null, {nip:user.nip, password:'synthetic-password-only'}));
  assert.equal(r.statusCode, 200);
  const p = JSON.parse(r.body);
  for(const flag of ['HttpOnly','Secure','SameSite=Lax']) assert.ok(r.multiValueHeaders['Set-Cookie'][0].includes(flag));
  assert.equal(auth.verifyToken(p.accessToken,'access').sid, auth.verifyToken(p.refreshToken,'refresh').sid);
  return p;
}
(async()=>{
  const modern = await import('../netlify/functions/auth-login.mjs');
  assert.deepEqual(modern.config.rateLimit, { action:'rate_limit', windowLimit:5, windowSize:180, aggregateBy:['ip','domain'] });
  assert.equal(modern.config.path, '/auth/login');
  const webLogin = await modern.default(new Request('https://validation.invalid/auth/login', {method:'POST',body:JSON.stringify({nip:user.nip,password:'synthetic-password-only'})}));
  assert.equal(webLogin.status,200);
  assert.ok(webLogin.headers.get('set-cookie').includes('HttpOnly'));
  let p = await signIn();
  assert.equal((await me(event('GET',p.accessToken))).statusCode,200);
  const renewed = await refresh(event('POST',null,{refreshToken:p.refreshToken}));
  assert.equal(renewed.statusCode,200);
  const renewedToken = JSON.parse(renewed.body).accessToken;
  assert.equal((await me(event('GET',renewedToken))).statusCode,200);
  user.roles=['UTILISATEUR']; updateUser();
  const claims = await auth.verifyAccess(event('GET',p.accessToken));
  assert.deepEqual(claims.roles,['UTILISATEUR']);
  assert.ok(!claims.permissions.includes('users:admin'));
  const renewedAfterChange = await refresh(event('POST',null,{refreshToken:p.refreshToken}));
  assert.deepEqual(auth.verifyToken(JSON.parse(renewedAfterChange.body).accessToken,'access').roles,['UTILISATEUR']);
  assert.equal((await require('../netlify/functions/admin-users').handler(event('GET',p.accessToken))).statusCode,403);
  user.active=false; updateUser();
  assert.equal((await me(event('GET',p.accessToken))).statusCode,401);
  assert.equal((await refresh(event('POST',null,{refreshToken:p.refreshToken}))).statusCode,403);
  user.active=true; user.roles=['ADMINISTRATEUR']; updateUser();
  const signed = auth.verifyToken(p.accessToken,'access');
  const expired = auth.signToken({...signed},-1);
  assert.equal((await me(event('GET',expired))).statusCode,401);
  const boundary = auth.signToken({...signed},0);
  assert.equal((await me(event('GET',boundary))).statusCode,401);
  const out = await logout(event('POST',expired));
  assert.equal(out.statusCode,200);
  assert.ok(out.multiValueHeaders['Set-Cookie'][0].includes('Max-Age=0'));
  delete require.cache[require.resolve('../netlify/functions/auth-refresh')];
  const otherInstance = require('../netlify/functions/auth-refresh').handler;
  assert.equal((await otherInstance(event('POST',null,{refreshToken:p.refreshToken}))).statusCode,401);
  assert.equal((await me(event('GET',renewedToken))).statusCode,401);
  for(const file of ['scope','admin-users','admin-settings','audit-log','users','data-status','data-records','scope-personnel-list','scope-personnel-history','scope-personnel-effectif-at-date','scope-personnel-detail','scope-personnel-inactivate','scope-personnel-correct-period','scope-personnel-import-analyze','scope-personnel-import-commit']){
    const handler=require(path.join('..','netlify','functions',file)).handler;
    assert.equal((await handler(event('GET',p.accessToken))).statusCode,401,file);
    assert.equal((await handler(event('GET'))).statusCode,401,file+' anonymous');
  }
  p=await signIn();
  assert.equal((await logout(event('GET',p.accessToken))).statusCode,302);
  assert.equal((await refresh(event('POST',null,{refreshToken:p.refreshToken}))).statusCode,401);
  assert.equal((await me(event('GET','invalid.token.signature'))).statusCode,401);
  const badParts=p.accessToken.split('.'); badParts[2]='x';
  assert.equal((await me(event('GET',badParts.join('.')))).statusCode,401);
  const legacy=auth.signToken({typ:'refresh',sub:user.nip},3600);
  assert.equal((await refresh(event('POST',null,{refreshToken:legacy}))).statusCode,401);
  p=await signIn();
  rows.get(auth.verifyToken(p.accessToken,'access').sid).expiresAt=Date.now()-1;
  assert.equal((await me(event('GET',p.accessToken))).statusCode,401);
  p=await signIn(); unavailable=true;
  assert.equal((await me(event('GET',p.accessToken))).statusCode,401);
  assert.equal((await logout(event('POST',p.accessToken))).statusCode,503);
  unavailable=false;
  process.env.MONITORING_F7_AUTH_METHODS='okta';
  assert.equal((await me(event('GET',p.accessToken))).statusCode,401);
  assert.equal((await refresh(event('POST',null,{refreshToken:p.refreshToken}))).statusCode,401);
  console.log('PASS: session LOCAL, cookies, renouvellement, expiration, roles actualises, comptes desactives, revocation inter-instance, 15 API protegees, stockage indisponible, configuration de limitation native. Aucune preuve de production simulee.');
})().catch(e=>{ console.error(e.stack);process.exitCode=1; });
