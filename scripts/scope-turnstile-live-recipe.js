'use strict';
const assert = require('node:assert/strict');
const {verify} = require('../netlify/lib/_turnstile');

async function run(){
  // Public Cloudflare test credentials, never production account credentials.
  process.env.SCOPE_TURNSTILE_ENABLED = 'true';
  process.env.SCOPE_TURNSTILE_SITE_KEY = '1x00000000000000000000BB';
  process.env.SCOPE_TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  // Siteverify's public test-key response returns example.com and no action.
  process.env.SCOPE_TURNSTILE_HOSTNAMES = 'example.com';
  process.env.SCOPE_TURNSTILE_ACTION = '';
  assert.equal((await verify('XXXX.DUMMY.TOKEN.XXXX')).ok,true);
  process.env.SCOPE_TURNSTILE_SECRET_KEY = '2x0000000000000000000000000000000AA';
  assert.equal((await verify('XXXX.DUMMY.TOKEN.XXXX')).ok,false);
  console.log('PASS Cloudflare Siteverify public test credentials: success and rejection');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
