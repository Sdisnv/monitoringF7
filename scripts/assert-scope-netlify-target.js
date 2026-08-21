#!/usr/bin/env node

const { spawnSync } = require('child_process');

const EXPECTED_SITE_NAME = 'scope-sdisnv';
const EXPECTED_SITE_ID = '6def8d4d-78c6-4112-bb76-6891df0e0a52';
const BLOCKED_SITE_NAME = 'orion-sdisnv';
const BLOCKED_SITE_ID = 'f1cc3cc4-a948-4187-a7a8-824c809ba712';
const BLOCKED_MESSAGE = 'SCOPE DEPLOY BLOCKED — INVALID NETLIFY TARGET';

function fail(detail) {
  console.error(BLOCKED_MESSAGE);
  if (detail) console.error(detail);
  process.exit(1);
}

const result = spawnSync('netlify', ['status'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`.replace(/\u001b\[[0-9;]*m/g, '');

if (result.error) fail(`Unable to run netlify status: ${result.error.message}`);
if (result.status !== 0) fail('netlify status returned a non-zero exit code.');

if (output.includes(BLOCKED_SITE_NAME) || output.includes(BLOCKED_SITE_ID)) {
  fail('Blocked ORION Netlify target detected.');
}

const nameMatch = output.match(/Current project:\s*([^\n]+)/);
const idMatch = output.match(/Project Id:\s*([^\n]+)/);
const siteName = nameMatch ? nameMatch[1].trim() : '';
const siteId = idMatch ? idMatch[1].trim() : '';

if (siteName !== EXPECTED_SITE_NAME || siteId !== EXPECTED_SITE_ID) {
  fail(`Expected ${EXPECTED_SITE_NAME} (${EXPECTED_SITE_ID}), got ${siteName || '<unknown>'} (${siteId || '<unknown>'}).`);
}

console.log('PASS — SCOPE Netlify target verified');
