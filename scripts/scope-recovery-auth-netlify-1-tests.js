#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function files(dir, predicate){
  return fs.readdirSync(path.join(ROOT, dir)).filter(predicate || (() => true)).sort();
}

function zipList(zipPath){
  const res = spawnSync('unzip', ['-l', zipPath], { cwd: ROOT, encoding: 'utf8' });
  if(res.status !== 0) return '';
  return res.stdout || '';
}

(async () => {
  await record('A seuls les endpoints HTTP restent dans netlify/functions', () => {
    const endpoints = files('netlify/functions', (name) => name.endsWith('.js'));
    eq(endpoints.length, 24);
    ok(!endpoints.some((name) => name.startsWith('_')));
    ok(endpoints.includes('scope.js'));
    ok(endpoints.includes('auth-me.js'));
  });

  await record('B helpers internes deplaces dans netlify/lib', () => {
    const helpers = files('netlify/lib', (name) => name.startsWith('_') && name.endsWith('.js'));
    eq(helpers.length, 48);
    ok(helpers.includes('_auth-identity.js'));
    ok(helpers.includes('_scope-report-service.js'));
    ok(!fs.existsSync(path.join(ROOT, 'netlify/functions/_scope-service.js')));
  });

  await record('C handlers importent les helpers via ../lib', () => {
    const bad = files('netlify/functions', (name) => name.endsWith('.js'))
      .filter((name) => /require\(['"]\.\/_/.test(fs.readFileSync(path.join(ROOT, 'netlify/functions', name), 'utf8')));
    eq(bad.join(', '), '');
  });

  await record('D configuration publish propre', () => {
    const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
    ok(toml.includes('command = "node scripts/build-scope-static.js"'));
    ok(toml.includes('publish = "dist/scope"'));
    ok(!toml.includes('publish = "."'));
  });

  await record('E PDFKit limite a la function scope', () => {
    const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
    ok(toml.includes('[functions."scope"]'));
    const globalBlock = toml.split('[functions."scope"]')[0];
    ok(!/external_node_modules\s*=/.test(globalBlock));
    ok(!/node_modules\/pdfkit/.test(globalBlock));
  });

  await record('F build statique contient uniquement SCOPE et assets', () => {
    const out = path.join(ROOT, 'dist/scope');
    ok(fs.existsSync(path.join(out, 'scope.html')));
    ok(fs.existsSync(path.join(out, 'assets/js/scope-ui.js')));
    ok(!fs.existsSync(path.join(out, '.git')));
    ok(!fs.existsSync(path.join(out, '.netlify')));
    ok(!fs.existsSync(path.join(out, 'node_modules')));
  });

  await record('G manifest Netlify sans helpers autonomes si build genere', () => {
    const manifestPath = path.join(ROOT, '.netlify/functions/manifest.json');
    ok(fs.existsSync(manifestPath), 'manifest Netlify absent, lancer netlify build avant ce test');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const functions = Array.isArray(manifest.functions) ? manifest.functions : [];
    eq(functions.length, 24);
    ok(!functions.some((fn) => String(fn.name || '').startsWith('_')));
  });

  await record('H bundles auth/data/personnel sans PDFKit si build genere', () => {
    const zipDir = path.join(ROOT, '.netlify/functions');
    for(const name of ['auth-me.zip', 'auth-refresh.zip', 'auth-logout.zip', 'data-status.zip', 'scope-personnel-list.zip']){
      const listing = zipList(path.join(zipDir, name));
      ok(listing && !listing.includes('node_modules/pdfkit/'), `${name} contient pdfkit`);
      ok(!listing.includes('node_modules/fontkit/'), `${name} contient fontkit`);
    }
  });

  await record('I bundle scope conserve la generation PDF', () => {
    const listing = zipList(path.join(ROOT, '.netlify/functions/scope.zip'));
    ok(listing.includes('node_modules/pdfkit/') || listing.includes('pdfkit'));
    ok(listing.includes('netlify/functions/scope.js'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  console.log(`${results.length} blocs / ${assertions} assertions`);
  if(failed.length) process.exit(1);
  console.log('SCOPE-RECOVERY-AUTH-NETLIFY-1: PASS');
})();
