#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist', 'scope');

function copyFile(src, dest){
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest){
  fs.cpSync(src, dest, { recursive: true });
}

function sha256(file){
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function filesUnder(directory){
  return fs.readdirSync(directory,{ withFileTypes:true }).flatMap((entry) => {
    const fullPath = path.join(directory,entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : [fullPath];
  }).sort();
}

function directorySha256(directory){
  const hash = crypto.createHash('sha256');
  for(const file of filesUnder(directory)){
    const relative = path.relative(directory,file).split(path.sep).join('/');
    const content = fs.readFileSync(file);
    hash.update(relative);hash.update('\0');hash.update(String(content.length));hash.update('\0');hash.update(content);
  }
  return hash.digest('hex');
}

function replaceBuildAsset(source,marker,value){
  const pattern = new RegExp(`(const\\s+[A-Z0-9_]+\\s*=\\s*')[^']+('\\s*;\\s*//\\s*SCOPE_BUILD_ASSET:${marker})`);
  const replaced = source.replace(pattern,`$1${value}$2`);
  if(replaced === source) throw new Error(`Missing build asset marker: ${marker}`);
  return replaced;
}

function fingerprintPdfAssets(publishRoot){
  const viewerFile = path.join(publishRoot,'assets','js','scope-pdf-viewer.js');
  if(!fs.existsSync(viewerFile)) return null;
  const pdfRoot = path.join(publishRoot,'assets','vendor','pdfjs');
  const workerSource = path.join(pdfRoot,'pdf.worker.min.js');
  const fontsSource = path.join(pdfRoot,'standard_fonts');
  if(!fs.existsSync(workerSource) || !fs.existsSync(fontsSource)) throw new Error('Incomplete published PDF.js corpus');

  const workerHash = sha256(workerSource);
  const workerName = `pdf.worker.${workerHash}.min.js`;
  const workerPublished = path.join(pdfRoot,workerName);
  fs.renameSync(workerSource,workerPublished);

  const fontsHash = directorySha256(fontsSource);
  const fontsName = `standard_fonts-${fontsHash}`;
  const fontsPublished = path.join(pdfRoot,fontsName);
  fs.renameSync(fontsSource,fontsPublished);

  let viewer = fs.readFileSync(viewerFile,'utf8');
  viewer = replaceBuildAsset(viewer,'PDF_WORKER',`../vendor/pdfjs/${workerName}`);
  viewer = replaceBuildAsset(viewer,'PDF_STANDARD_FONTS',`../vendor/pdfjs/${fontsName}/`);
  fs.writeFileSync(viewerFile,viewer);
  return {
    worker:{ hash:workerHash,name:workerName,path:workerPublished },
    standardFonts:{ hash:fontsHash,name:fontsName,path:fontsPublished,files:filesUnder(fontsPublished) }
  };
}

function versionAssetReferences(html,publishRoot){
  return html.replace(/\b(src|href)="(assets\/[^"?#]+)(?:\?[^"#]*)?(#[^"]*)?"/g,(_match,attribute,assetPath,fragment = '') => {
    const publishedAsset = path.join(publishRoot,...assetPath.split('/'));
    if(!fs.statSync(publishedAsset).isFile()) throw new Error(`Static asset is not a file: ${assetPath}`);
    return `${attribute}="${assetPath}?v=${sha256(publishedAsset)}${fragment}"`;
  });
}

function buildScopeStatic(options = {}){
  const sourceRoot = options.root || root;
  const publishRoot = options.out || out;
  fs.rmSync(publishRoot,{ recursive:true,force:true });
  fs.mkdirSync(publishRoot,{ recursive:true });
  copyFile(path.join(sourceRoot,'scope.html'),path.join(publishRoot,'scope.html'));
  copyDir(path.join(sourceRoot,'assets'),path.join(publishRoot,'assets'));
  const pdfAssets = fingerprintPdfAssets(publishRoot);
  const outputHtml = path.join(publishRoot,'scope.html');
  const versioned = versionAssetReferences(fs.readFileSync(outputHtml,'utf8'),publishRoot);
  fs.writeFileSync(outputHtml,versioned);
  return { root:sourceRoot,out:publishRoot,html:versioned,pdfAssets };
}

if(require.main === module){
  buildScopeStatic();
  console.log(`SCOPE static site built: ${path.relative(root,out)}`);
}

module.exports = { sha256,directorySha256,fingerprintPdfAssets,versionAssetReferences,buildScopeStatic };
