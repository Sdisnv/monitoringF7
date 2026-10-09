const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

(async()=>{
  const zip = path.resolve(process.argv[2] || '');
  assert.ok(process.argv[2] && fs.statSync(zip).isFile(), 'Pass the actual Netlify auth-login ZIP');
  const entries = execFileSync('unzip',['-Z','-1',zip],{encoding:'utf8'}).trim().split('\n');
  assert.ok(entries.every(name=>!path.isAbsolute(name)&&!name.split('/').includes('..')));
  assert.ok(entries.some(name=>name.includes('node_modules/@netlify/blobs/dist/main.cjs')), 'Blobs SDK must ship inside the artifact');
  const main = entries.filter(name=>name==='auth-login.mjs'||name.endsWith('/auth-login.mjs'));
  assert.equal(main.length,1);
  const extracted = fs.mkdtempSync(path.join(os.tmpdir(),'scope-auth-packaging-'));
  try{
    execFileSync('unzip',['-oq',zip,'-d',extracted]);
    process.env.MONITORING_F7_AUTH_METHODS='okta';
    const module = await import(pathToFileURL(path.join(extracted,main[0])).href);
    const response = await module.default(new Request('https://validation.invalid/auth/login',{method:'POST',body:'{}'}));
    assert.equal(response.status,403);
    assert.equal((await response.json()).error,'auth_method_disabled');
    console.log('PASS: standalone Netlify ZIP contains Blobs and boots with the server auth guard intact; no production credentials used.');
  }finally{fs.rmSync(extracted,{recursive:true,force:true});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
