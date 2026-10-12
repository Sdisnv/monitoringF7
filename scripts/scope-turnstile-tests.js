'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const turnstile = require('../netlify/lib/_turnstile');

function configure(){
  process.env.SCOPE_TURNSTILE_ENABLED = 'true';
  process.env.SCOPE_TURNSTILE_SITE_KEY = 'public-test-sitekey';
  process.env.SCOPE_TURNSTILE_SECRET_KEY = 'private-test-secret';
  process.env.SCOPE_TURNSTILE_HOSTNAMES = '127.0.0.1';
  process.env.SCOPE_TURNSTILE_ACTION = 'scope-local-login';
}
test('Turnstile reste désactivé sans activation explicite',async()=>{
  delete process.env.SCOPE_TURNSTILE_ENABLED;
  assert.deepEqual(await turnstile.verify(null,()=>{throw new Error('must not call');}),{ok:true});
});
test('configuration publique ne révèle jamais le secret',()=>{
  configure();
  assert.equal(turnstile.publicConfiguration().enabled,true);
  assert.doesNotMatch(JSON.stringify(turnstile.publicConfiguration()),/private-test-secret/);
});
test('activation sans configuration et absence de jeton refusées',async()=>{
  configure();delete process.env.SCOPE_TURNSTILE_SECRET_KEY;
  assert.equal((await turnstile.verify('token')).status,503);
  configure();assert.equal((await turnstile.verify('')).status,400);
});
test('Siteverify serveur requis avec contrôle du domaine et de l’action',async()=>{
  configure();let calls=0;
  const fetcher = async(url,options)=>{
    calls++;assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(JSON.parse(options.body).secret,'private-test-secret');
    return {ok:true,json:async()=>({success:true,hostname:'127.0.0.1',action:'scope-local-login'})};
  };
  assert.equal((await turnstile.verify('token',fetcher)).ok,true);assert.equal(calls,1);
  for(const result of [{success:false},{success:true,hostname:'other',action:'scope-local-login'},
    {success:true,hostname:'127.0.0.1',action:'other'}])
    assert.equal((await turnstile.verify('token',async()=>({ok:true,json:async()=>result}))).ok,false);
});
test('indisponibilité Siteverify ne contourne pas la protection activée',async()=>{
  configure();assert.equal((await turnstile.verify('token',async()=>{throw new Error('offline');})).status,503);
  delete process.env.SCOPE_TURNSTILE_ENABLED;
});
