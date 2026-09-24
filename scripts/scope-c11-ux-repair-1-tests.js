#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { buildScopeStatic,sha256 } = require('./build-scope-static');
const { DOMAIN_ORDER } = require('../netlify/lib/_scope-annual-catalog-service');
const { createCatalogUiHarness,catalogPayload,activityPayload,draftRequirement,visibleText } = require('./scope-annual-catalog-ui-harness');

const ROOT = path.resolve(__dirname,'..');
let passed = 0;
async function test(name,fn){ await fn(); passed += 1; process.stdout.write(`PASS ${name}\n`); }
function versionFor(html,asset){
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match = html.match(new RegExp(`${escaped}\\?v=([a-f0-9]{64})`));
  assert(match,`Missing content version for ${asset}`);
  return match[1];
}
function write(file,content){ fs.mkdirSync(path.dirname(file),{ recursive:true });fs.writeFileSync(file,content); }
function makePdfFixture(){
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'scope-c11-pdf-'));
  write(path.join(temp,'scope.html'),'<!doctype html><script src="assets/js/scope-pdf-viewer.js"></script>');
  fs.mkdirSync(path.join(temp,'assets','js'),{ recursive:true });
  fs.copyFileSync(path.join(ROOT,'assets/js/scope-pdf-viewer.js'),path.join(temp,'assets/js/scope-pdf-viewer.js'));
  fs.mkdirSync(path.join(temp,'assets','vendor','pdfjs'),{ recursive:true });
  fs.copyFileSync(path.join(ROOT,'assets/vendor/pdfjs/pdf.worker.min.js'),path.join(temp,'assets/vendor/pdfjs/pdf.worker.min.js'));
  fs.cpSync(path.join(ROOT,'assets/vendor/pdfjs/standard_fonts'),path.join(temp,'assets/vendor/pdfjs/standard_fonts'),{ recursive:true });
  return { root:temp,out:path.join(temp,'dist') };
}
function runtimePdfUrls(result,fontName = 'FoxitSymbol.pfb'){
  const viewerReference = result.html.match(/src="(assets\/js\/scope-pdf-viewer\.js\?v=[a-f0-9]{64})"/);
  assert(viewerReference,'Missing built PDF viewer reference');
  const scriptUrl = new URL(viewerReference[1],'https://scope.test/scope.html').href;
  const document = { getElementsByTagName(){ return [{ src:scriptUrl }]; },addEventListener(){} };
  const context = { URL,document,window:{ document },globalThis:null,setTimeout,clearTimeout };
  context.globalThis = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(result.out,'assets/js/scope-pdf-viewer.js'),'utf8'),context);
  const testApi = context.window.ScopePdfViewer._test;
  const worker = testApi.workerSrc();
  const standardFonts = testApi.standardFontDataUrl();
  return { worker,standardFonts,font:new URL(fontName,standardFonts).href };
}

(async()=>{
  await test('01 every local SCOPE asset receives its published content hash',() => {
    const result = buildScopeStatic();
    const references = [...result.html.matchAll(/(?:src|href)="(assets\/[^"?]+)\?v=([a-f0-9]{64})"/g)];
    assert.equal(references.length,16);
    for(const [,asset,version] of references) assert.equal(version,sha256(path.join(result.out,...asset.split('/'))),asset);
    assert.doesNotMatch(result.html,/scope-quo-vadis-referential-management-4|\?v=(?![a-f0-9]{64})/);
    const pdfUrls = runtimePdfUrls(result);
    assert.equal(new URL(pdfUrls.worker).pathname,`/assets/vendor/pdfjs/${result.pdfAssets.worker.name}`);
    assert.equal(new URL(pdfUrls.standardFonts).pathname,`/assets/vendor/pdfjs/${result.pdfAssets.standardFonts.name}/`);
    assert(fs.existsSync(path.join(result.out,new URL(pdfUrls.worker).pathname)));
    assert(fs.existsSync(path.join(result.out,new URL(pdfUrls.font).pathname)));
  });

  await test('02 identical builds are byte-for-byte deterministic',() => {
    const first = buildScopeStatic().html;
    const second = buildScopeStatic().html;
    assert.equal(second,first);
  });

  await test('03 JS, logic and CSS content independently control their public URLs',() => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(),'scope-c11-assets-'));
    const source = path.join(temp,'source'); const output = path.join(temp,'dist');
    try{
      write(path.join(source,'scope.html'),'<!doctype html><link href="assets/css/scope.css"><script src="assets/js/scope-ui-logic.js"></script><script src="assets/js/scope-ui.js"></script>');
      const originals = { 'assets/css/scope.css':'body{}', 'assets/js/scope-ui-logic.js':'logic();', 'assets/js/scope-ui.js':'ui();' };
      for(const [asset,content] of Object.entries(originals)) write(path.join(source,...asset.split('/')),content);
      const initial = buildScopeStatic({ root:source,out:output }).html;
      const initialVersions = Object.fromEntries(Object.keys(originals).map((asset) => [asset,versionFor(initial,asset)]));
      for(const asset of Object.keys(originals)){
        write(path.join(source,...asset.split('/')),`${originals[asset]}\nchanged`);
        const changed = buildScopeStatic({ root:source,out:output }).html;
        assert.notEqual(versionFor(changed,asset),initialVersions[asset],asset);
        for(const other of Object.keys(originals).filter((name) => name !== asset)) assert.equal(versionFor(changed,other),initialVersions[other],other);
        write(path.join(source,...asset.split('/')),originals[asset]);
        assert.equal(versionFor(buildScopeStatic({ root:source,out:output }).html,asset),initialVersions[asset],asset);
      }
      assert.equal(buildScopeStatic({ root:source,out:output }).html,initial);
    }finally{ fs.rmSync(temp,{ recursive:true,force:true }); }
  });

  await test('04 dead annual catalog renderer and historical asset versions are absent',() => {
    const ui = fs.readFileSync(path.join(ROOT,'assets/js/scope-ui.js'),'utf8');
    const html = fs.readFileSync(path.join(ROOT,'scope.html'),'utf8');
    assert.doesNotMatch(ui,/renderAnnualCatalogActivityLegacy/);
    assert.doesNotMatch(html,/scope-quo-vadis-referential-management-4|\?v=/);
  });

  await test('05 list DOM exposes eight business columns and no visible technical code',() => {
    const { hooks } = createCatalogUiHarness();
    const html = hooks.renderAnnualCatalogHtml(catalogPayload()); const text = visibleText(html);
    for(const label of ['Domaine','Activité','Besoin 2027','Période','Contenus','État','Préparation QV','Action','Consulter ›']) assert(text.includes(label),label);
    assert.doesNotMatch(text,/DPS-EXERCICE|DPS-INSTRUCTION-SECTION|TECHNICAL-CODE|Sessions|Public/);
    assert.doesNotMatch(html,/badge|pill|<small>/i);
    assert.match(html,/annual-status annual-status-a-definir"><i/);
    assert.deepEqual(DOMAIN_ORDER,['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR']);
    let cursor = -1;
    for(const domain of [...DOMAIN_ORDER,'ZZZ']){ const next = text.indexOf(`${domain} `,cursor + 1);assert(next > cursor,domain);cursor = next; }
  });

  await test('06 activity DOM without requirement is neutral and contains no legacy panel',() => {
    const { hooks } = createCatalogUiHarness();
    const html = hooks.renderAnnualCatalogActivityHtml(activityPayload());
    const business = html.split('<details class="annual-internal">')[0]; const text = visibleText(html);
    for(const label of ['Besoin non défini','Période à définir','Contenus à définir','Non préparé dans QUO VADIS','Enregistrer','Préparation QUO VADIS','Détails internes','Famille technique','FOCO']) assert(text.includes(label),label);
    assert.match(html,/placeholder="jj\/mm\/aaaa"/);
    assert.doesNotMatch(text,/— occurrences|0 occurrence à préciser|DEFAULT|24\/09\/2026|Enregistrer le brouillon/);
    assert.doesNotMatch(business,/DPS-INSTRUCTION-SECTION|<dt>Famille<\/dt>|annual-workspace|annual-activity-c8/);
    assert.match(html,/class="annual-activity annual-activity-c10"/);
    assert.match(html,/<section class="annual-primary annual-qv-preparation">/);
    assert.match(html,/<details class="annual-internal">/); assert.doesNotMatch(html,/<details class="annual-internal"[^>]*open/);
  });

  await test('07 DRAFT DOM follows public READY decision without exposing internal codes',() => {
    const requirement = draftRequirement();
    const allowedHarness = createCatalogUiHarness();
    const allowed = allowedHarness.hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement,readyTransition:{ allowed:true,message:null },assignments:[{ occurrenceNumber:1,label:'Feu',themeVersionId:'theme-v1' }] }));
    assert.match(allowed,/>1 occurrence</); assert.match(allowed,/1 thème défini/); assert.match(allowed,/>Enregistrer</); assert.match(allowed,/>Valider le besoin</);
    assert.doesNotMatch(allowed,/id="annual-ready"[^>]*disabled|DEFAULT|Enregistrer le brouillon|annual-activity-c8/);
    const deniedHarness = createCatalogUiHarness();
    const denied = deniedHarness.hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement,readyTransition:{ allowed:false,message:'Le public de référence doit être configuré avant validation.' } }));
    assert.match(denied,/id="annual-ready"[^>]* disabled/); assert.match(denied,/Le public de référence doit être configuré avant validation/);
    assert.doesNotMatch(denied,/MISSING_PUBLIC_RULE_VERSION|SESSION_TEMPLATE_REQUIRED|PublicRuleVersion|SessionTemplate/);
  });

  await test('08 two occurrences keep canonical and free themes attached to their rows',() => {
    const { hooks } = createCatalogUiHarness();
    const html = hooks.renderAnnualCatalogActivityHtml(activityPayload({
      requirement:draftRequirement({ requiredOccurrences:2,windowStart:'2027-03-01',windowEnd:'2027-11-30' }),readyTransition:{ allowed:true,message:null },preparedOccurrenceCount:1,
      assignments:[{ occurrenceNumber:1,label:'Feu',themeVersionId:'theme-v1' },{ occurrenceNumber:2,freeLabel:'Manœuvre hydraulique' }]
    }));
    assert.match(html,/2 occurrences/); assert.match(html,/2 thèmes définis/); assert.match(html,/1 \/ 2 occurrences préparées/);
    assert.match(html,/Occurrence 1<\/th><td>[\s\S]*Feu/); assert.match(html,/Occurrence 2<\/th><td>[\s\S]*Manœuvre hydraulique[\s\S]*\(thème libre\)/);
    assert.doesNotMatch(html,/promotion|annual-workspace|annual-activity-c8/i);
  });

  await test('09 C10 CSS remains scoped, open and responsive at required breakpoints',() => {
    const css = fs.readFileSync(path.join(ROOT,'assets/css/scope.css'),'utf8');
    assert.match(css,/\.annual-activity-c10 \.annual-primary\{border:0;border-bottom:/);
    assert.match(css,/\.annual-catalogue \.annual-row-action\{text-decoration:none!important\}/);
    assert.match(css,/\.annual-status i\{width:8px;height:8px/); assert.match(css,/\.annual-status\{[^}]*color:#202830/);
    for(const width of ['1150','960','800']) assert(css.includes(`max-width:${width}px`),width);
    assert.match(css,/@media\(max-width:800px\)\{\.annual-table-wrap\{overflow-x:auto/);
  });

  await test('10 PDF worker URL follows published bytes and returns after restoration',() => {
    const fixture = makePdfFixture();
    try{
      const worker = path.join(fixture.root,'assets/vendor/pdfjs/pdf.worker.min.js');
      const original = fs.readFileSync(worker);
      const initial = runtimePdfUrls(buildScopeStatic(fixture)).worker;
      fs.writeFileSync(worker,Buffer.concat([original,Buffer.from('\nchanged')]));
      const changed = runtimePdfUrls(buildScopeStatic(fixture)).worker;
      assert.notEqual(changed,initial);assert(fs.existsSync(path.join(fixture.out,new URL(changed).pathname)));
      fs.writeFileSync(worker,original);
      assert.equal(runtimePdfUrls(buildScopeStatic(fixture)).worker,initial);
    }finally{ fs.rmSync(fixture.root,{ recursive:true,force:true }); }
  });

  await test('11 standard font URL follows published bytes and returns after restoration',() => {
    const fixture = makePdfFixture();
    try{
      const fontName = 'FoxitSymbol.pfb';
      const font = path.join(fixture.root,'assets/vendor/pdfjs/standard_fonts',fontName);
      const original = fs.readFileSync(font);
      const initial = runtimePdfUrls(buildScopeStatic(fixture),fontName).font;
      fs.writeFileSync(font,Buffer.concat([original,Buffer.from('\nchanged')]));
      const changed = runtimePdfUrls(buildScopeStatic(fixture),fontName).font;
      assert.notEqual(changed,initial);assert(fs.existsSync(path.join(fixture.out,new URL(changed).pathname)));
      fs.writeFileSync(font,original);
      assert.equal(runtimePdfUrls(buildScopeStatic(fixture),fontName).font,initial);
    }finally{ fs.rmSync(fixture.root,{ recursive:true,force:true }); }
  });

  process.stdout.write(`C11-UX-REPAIR-1 ${passed}/${passed} PASS\n`);
})().catch((error) => { console.error(error && error.stack || error);process.exitCode = 1; });
