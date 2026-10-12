'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.SCOPE_PLAYWRIGHT_MODULE || 'playwright');

async function run(){
  const output = path.resolve(__dirname,'../docs/captures/qv-p0-ecawin-auth-20261009');
  const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    const response = await context.request.post('http://127.0.0.1:4410/auth/login',{
      data:{nip:'recipe.p0',password:'Recipe-P0-Local-2026!'}});
    assert.equal(response.status(),400);
    assert.equal((await response.json()).error,'turnstile_required');
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4410/scope.html#/quo-vadis/programme');
    await page.getByLabel('Identifiant (NIP)',{exact:true}).fill('recipe.p0');
    await page.getByLabel('Mot de passe',{exact:true}).fill('Recipe-P0-Local-2026!');
    await page.waitForFunction(()=>document.getElementById('scope-local-login-submit')?.disabled === false,{},{timeout:30000});
    await page.screenshot({path:path.join(output,'connexion-turnstile-recette.png')});
    await page.getByRole('button',{name:'Se connecter',exact:true}).click();
    await page.locator('.qv-programme-view').waitFor();
    fs.writeFileSync(path.join(output,'turnstile-results.json'),JSON.stringify({browser:'Chromium',provider:'Cloudflare official public test keys',
      missingTokenRejected:true,widgetTokenAcceptedByServer:true,programmeAccessible:true,productionActivated:false},null,2));
    console.log('PASS LOCAL with Turnstile public test widget + real server Siteverify; missing token rejected');
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
