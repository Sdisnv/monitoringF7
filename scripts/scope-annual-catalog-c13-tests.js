'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createCatalogUiHarness,catalogPayload,activityPayload,multiOccurrenceActivityPayload,draftRequirement,visibleText } = require('./scope-annual-catalog-ui-harness');
const { buildPreview } = require('./scope-annual-catalog-c13-preview');

const ROOT = path.resolve(__dirname,'..');
const read = (file) => fs.readFileSync(path.join(ROOT,file),'utf8');

function dom(html){
  const root = { tag:'#document',attrs:{},children:[],parent:null,text:'' };
  const stack = [root];
  const voidTags = new Set(['input','br','hr','meta','link','img']);
  for(const token of String(html).matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g)){
    const value = token[0];
    if(value.startsWith('<!--')) continue;
    if(value.startsWith('</')){ if(stack.length > 1) stack.pop();continue; }
    if(value.startsWith('<')){
      const match = value.match(/^<([\w-]+)([^>]*)>/); if(!match) continue;
      const attrs = {}; for(const item of match[2].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) attrs[item[1]] = item[2] == null ? '' : item[2];
      const node = { tag:match[1].toLowerCase(),attrs,children:[],parent:stack.at(-1),text:'' };
      stack.at(-1).children.push(node);
      if(!voidTags.has(node.tag) && !value.endsWith('/>')) stack.push(node);
    }else stack.at(-1).text += value;
  }
  const all = []; (function walk(node){ for(const child of node.children){ all.push(child);walk(child); } })(root);
  const classes = (node) => String(node.attrs.class || '').split(/\s+/).filter(Boolean);
  const find = (selector) => all.filter((node) => selector.startsWith('.') ? classes(node).includes(selector.slice(1)) : selector.startsWith('#') ? node.attrs.id === selector.slice(1) : node.tag === selector);
  const text = (node) => `${node.text || ''} ${node.children.map(text).join(' ')}`.replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
  return { root,all,find,text };
}

const tests = [];
const test = (name,fn) => tests.push({ name,fn });

test('01 list renders exactly eight MOA columns',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogHtml(catalogPayload()));
  const headers = tree.find('thead')[0].children[0].children.map(tree.text);
  assert.deepEqual(headers,['Domaine','Activité','Besoin 2027','Période','Contenus','État','QUO VADIS','Action']);
});
test('02 list keeps business domain order and unknown domains last',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogHtml(catalogPayload()));
  const rows = tree.find('tbody')[0].children.map((row) => tree.text(row.children[0]));
  assert.deepEqual(rows,['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','AUTO','PR','ZZZ']);
});
test('03 list hides technical identities and uses fiche action',() => {
  const { hooks } = createCatalogUiHarness(); const html = hooks.renderAnnualCatalogHtml(catalogPayload()); const text = visibleText(html);
  assert.doesNotMatch(text,/DPS-EXERCICE|TECHNICAL-CODE|Sessions|Public/); assert.match(text,/Consulter la fiche ›/);
});
test('04 detail has the three ordered desktop zones',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  const layout = tree.find('.annual-detail-layout')[0]; const classes = layout.children.slice(0,3).map((node) => node.attrs.class);
  assert(classes[0].includes('annual-need')); assert(classes[1].includes('annual-qv-preparation')); assert(classes[2].includes('annual-activity-info'));
});
test('05 annual need retains operational form controls',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  for(const id of ['annual-requirement-form','annual-required-occurrences','annual-window-start','annual-window-end','annual-priority','annual-ready']) assert.equal(tree.find(`#${id}`).length,1,id);
  assert.match(tree.text(tree.find('.annual-need')[0]),/4 thèmes? définis|3 thèmes définis · 1 à préciser/);
});
test('06 no annual requirement remains coherent and editable',() => {
  const { hooks } = createCatalogUiHarness(); const html = hooks.renderAnnualCatalogActivityHtml(activityPayload()); const tree = dom(html);
  assert.equal(tree.find('#annual-required-occurrences').length,1); assert.match(tree.text(tree.find('.annual-need')[0]),/À définir/); assert.doesNotMatch(visibleText(html),/DEFAULT|0 occurrence à préciser/);
});
test('07 one-occurrence draft renders one occurrence row',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement:draftRequirement(),assignments:[{ occurrenceNumber:1,label:'FEU',themeVersionId:'theme-feu' }] })));
  assert.equal(tree.find('.annual-theme-table')[0].children[1].children.length,1);
});
test('08 four-occurrence draft keeps canonical free and empty themes',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  const rows = tree.find('.annual-theme-table')[0].children[1].children.map(tree.text);
  assert.equal(rows.length,4); assert.match(rows[0],/FEU/); assert.match(rows[1],/PIONNIER.*ABC/); assert.match(rows[2],/À préciser/); assert.match(rows[3],/Manœuvre hydraulique.*thème libre/);
});
test('09 themes table exposes occurrence theme and action columns',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  assert.deepEqual(tree.find('.annual-theme-table')[0].children[0].children[0].children.map(tree.text),['Occurrence','Thème(s)','Action']);
});
test('10 activity information excludes technical family',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  const text = tree.text(tree.find('.annual-activity-info')[0]); assert.match(text,/Domaine.*Type d’activité.*Périodicité.*Nombre de séances.*Public de référence.*Description/); assert.doesNotMatch(text,/FOCO|Famille/);
});
test('11 requirements and Stat.Com are compact business rows',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  assert.match(tree.text(tree.find('.annual-requirements')[0]),/Contraintes.*Stat\.Com.*0120F7/);
});
test('12 public organisation uses only available values',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));
  assert.match(tree.text(tree.find('.annual-organisation')[0]),/Sapeurs-pompiers \(DPS\).*Selon le scénario défini dans QUO VADIS.*Non précisé/);
});
test('13 technical details stay closed and carry internal identity',() => {
  const { hooks } = createCatalogUiHarness(); const tree = dom(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload())); const details = tree.find('.annual-internal')[0];
  assert.equal(details.attrs.open,undefined); assert.match(tree.text(details),/Détails techniques.*Code.*Famille technique.*Version.*Identifiant.*Fingerprint.*Type interne/);
});
test('14 READY allowed uses only public contract and remains enabled',() => {
  const { hooks } = createCatalogUiHarness(); const html = hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement:draftRequirement(),readyTransition:{ allowed:true,message:null },assignments:[{ occurrenceNumber:1,label:'FEU',themeVersionId:'theme-feu' }] })); const tree = dom(html);
  assert.equal(tree.find('#annual-ready')[0].attrs.disabled,undefined); assert.doesNotMatch(html,/MISSING_PUBLIC_RULE_VERSION|SESSION_TEMPLATE_REQUIRED|reasonCode|reasons/);
});
test('15 READY refused displays the business message only',() => {
  const { hooks } = createCatalogUiHarness(); const html = hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement:draftRequirement(),readyTransition:{ allowed:false,message:'Un thème doit encore être défini avant validation.' } })); const tree = dom(html);
  assert.equal(tree.find('#annual-ready')[0].attrs.disabled,''); assert.match(visibleText(html),/Un thème doit encore être défini/); assert.doesNotMatch(html,/MISSING_|SESSION_TEMPLATE/);
});
test('16 READY lifecycle hides validation and offers QV preparation',() => {
  const { hooks } = createCatalogUiHarness(); const html = hooks.renderAnnualCatalogActivityHtml(activityPayload({ requirement:draftRequirement({ status:'READY' }),readyTransition:{ allowed:true,message:null } })); const tree = dom(html);
  assert.equal(tree.find('#annual-ready').length,0); assert.equal(tree.find('#annual-generate').length,1); assert.equal(tree.find('#annual-revise').length,1);
});
test('17 CSS owns dense list and responsive one-column result',() => {
  const css = read('assets/css/scope.css'); assert.match(css,/annual-catalog-table th,.annual-catalog-table td\{padding:6px 10px/); assert.match(css,/@media\(max-width:800px\)[\s\S]*grid-template-areas:"need" "qv" "info" "themes" "side"/);
});
test('18 CSS has explicit 1150 960 and 800 adaptations',() => { const css = read('assets/css/scope.css'); for(const width of [1150,960,800]) assert(css.includes(`@media(max-width:${width}px)`),width); });
test('19 preview generator uses actual renderer output',() => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'scope-c13-test-')); try{ const files = buildPreview(directory); for(const file of Object.values(files)) assert(fs.statSync(file).size > 5000); assert.match(fs.readFileSync(files.detail,'utf8'),/annual-detail-layout/); }finally{ fs.rmSync(directory,{ recursive:true,force:true }); }
});
test('20 protected operational structures are untouched',() => {
  const source = [read('assets/js/scope-ui.js'),read('assets/css/scope.css'),read('scripts/scope-annual-catalog-ui-harness.js')].join('\n');
  assert.doesNotMatch(source,/(insert into|update|delete from)\s+(scope_evenements|scope_attendus|scope_participations)/i); assert.doesNotMatch(source,/publishAnnual|eventPublication\s*[:=]\s*true/);
});

(async()=>{ let passed=0; for(const item of tests){ try{ await item.fn();passed++;process.stdout.write(`PASS ${item.name}\n`); }catch(error){ console.error(`FAIL ${item.name}\n${error.stack}`);process.exitCode=1; } } process.stdout.write(`C13 ${passed}/${tests.length} PASS\n`); })();
