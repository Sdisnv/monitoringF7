#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'scope');

function copyFile(src, dest){
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest){
  fs.cpSync(src, dest, { recursive: true });
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
copyFile(path.join(root, 'scope.html'), path.join(out, 'scope.html'));
copyDir(path.join(root, 'assets'), path.join(out, 'assets'));

console.log(`SCOPE static site built: ${path.relative(root, out)}`);
