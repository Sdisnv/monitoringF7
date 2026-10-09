#!/usr/bin/env node
'use strict';

const readline = require('readline');
const { createPasswordHash } = require('../netlify/lib/_auth-utils');
const { normalizeRoles } = require('../netlify/lib/_rbac');

function arg(name){
  const prefixed = `--${name}=`;
  const direct = process.argv.find(item => item.startsWith(prefixed));
  if(direct) return direct.slice(prefixed.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function askHidden(prompt){
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input:process.stdin, output:process.stderr, terminal:true });
    const onData = (char) => {
      char = String(char);
      if(char === '\n' || char === '\r' || char === '\u0004') process.stderr.write('\n');
      else process.stderr.write('*');
    };
    process.stdin.on('data', onData);
    rl.question(prompt, (answer) => {
      process.stdin.removeListener('data', onData);
      rl.close();
      resolve(answer);
    });
  });
}

(async () => {
  const nip = String(arg('nip') || '').trim();
  const displayName = String(arg('display-name') || arg('name') || '').trim();
  const email = String(arg('email') || '').trim();
  const roles = normalizeRoles(String(arg('role') || 'UTILISATEUR').split(','));
  if(!nip){
    console.error('Usage: node scripts/scope-auth-local-user.js --nip IDENTIFIANT --display-name "Nom" --role ADMINISTRATEUR');
    process.exit(1);
  }
  const password = await askHidden('Mot de passe local SCOPE: ');
  const confirm = await askHidden('Confirmation: ');
  if(!password || password !== confirm){
    console.error('Mot de passe vide ou confirmation différente.');
    process.exit(1);
  }
  const user = {
    nip,
    displayName: displayName || nip,
    email,
    roles,
    active: true,
    passwordHash: createPasswordHash(password)
  };
  if(!email) delete user.email;
  process.stdout.write(`${JSON.stringify(user, null, 2)}\n`);
})();
