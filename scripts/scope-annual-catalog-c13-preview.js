'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createCatalogUiHarness,catalogPayload,multiOccurrenceActivityPayload } = require('./scope-annual-catalog-ui-harness');

const ROOT = path.resolve(__dirname,'..');

function shell(content,active){
  const css = fs.readFileSync(path.join(ROOT,'assets/css/scope.css'),'utf8');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>C13 ${active}</title><style>${css}
  *{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#152235;font:14px Arial,sans-serif}.c13-shell{max-width:1500px;margin:0 auto;background:#fff;min-height:100vh}.c13-brand{display:flex;justify-content:space-between;align-items:center;padding:8px 28px 7px;border-left:3px solid #de000a;margin-left:12px}.c13-brand h1{margin:0;font-size:20px;letter-spacing:0}.c13-brand p{margin:3px 0 0;color:#5d6b7c;font-size:12px}.c13-logo{font-size:22px;font-weight:900;font-style:italic}.c13-nav{display:flex;gap:30px;padding:0 28px;border-top:1px solid #edf0f3;border-bottom:1px solid #dce1e6;background:#f7f8fa;white-space:nowrap;overflow:hidden}.c13-nav span{padding:9px 0;font-size:12px;font-weight:700}.c13-nav .active{border-bottom:2px solid #de000a}.c13-content{padding:8px 12px 18px}.scope-button{border:1px solid #aeb7c1;background:#eef1f4;color:#17202b}.scope-empty{color:#647180}.visually-hidden{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  </style></head><body><main class="c13-shell"><header class="c13-brand"><div><h1>QUO VADIS 2027</h1><p>Préparation annuelle du programme de formation et d’activités.</p></div><div class="c13-logo">SDIS</div></header><nav class="c13-nav"><span>Synthèse</span><span class="active">Catalogue annuel</span><span>Agenda annuel</span><span>Agenda 77</span><span>Toutes les activités</span><span>À arbitrer</span><span>Alertes</span><span>Cursus</span><span>Règles</span></nav><div class="c13-content">${content}</div></main></body></html>`;
}

function buildPreview(outputDirectory = path.join(os.tmpdir(),'scope-c13-preview')){
  fs.mkdirSync(outputDirectory,{ recursive:true });
  const { hooks } = createCatalogUiHarness();
  const list = shell(hooks.renderAnnualCatalogHtml(catalogPayload()),'liste');
  const detail = shell(hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()),'fiche');
  const files = { list:path.join(outputDirectory,'catalogue.html'),detail:path.join(outputDirectory,'fiche.html') };
  fs.writeFileSync(files.list,list);
  fs.writeFileSync(files.detail,detail);
  return files;
}

if(require.main === module){
  const files = buildPreview(process.argv[2]);
  process.stdout.write(`${JSON.stringify(files,null,2)}\n`);
}

module.exports = { buildPreview,shell };
