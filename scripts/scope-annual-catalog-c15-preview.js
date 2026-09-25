'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createCatalogUiHarness,catalogPayload,activityPayload,multiOccurrenceActivityPayload } = require('./scope-annual-catalog-ui-harness');
const { shell } = require('./scope-annual-catalog-c13-preview');

const ROOT = path.resolve(__dirname,'..');

function write(outputDirectory,name,html){
  const file = path.join(outputDirectory,`${name}.html`);
  fs.writeFileSync(file,shell(html,name).replace('<title>C13 ','<title>C15 '));
  return file;
}

function buildPreview(outputDirectory = path.join(os.tmpdir(),'scope-c15-preview')){
  fs.mkdirSync(outputDirectory,{ recursive:true });
  const preview = JSON.parse(fs.readFileSync(path.join(ROOT,'docs/SCOPE_C15_QUO_VADIS_2026_PREVIEW.json'),'utf8'));
  const { hooks } = createCatalogUiHarness();
  const catalog = catalogPayload();
  const files = {};

  hooks.state.annualCatalogMode = '';
  files.catalogue = write(outputDirectory,'catalogue',hooks.renderAnnualCatalogHtml(catalog));

  hooks.state.annualCatalogMode = 'create';
  files.creation = write(outputDirectory,'creation',hooks.renderAnnualCatalogHtml(catalog));

  hooks.state.annualCatalogMode = 'import';
  hooks.state.annualCatalogImport = { fileName:'2026 QUO VADIS SDIS Nord vaudois.xlsx',fileBase64:'local-preview',preview,decisions:{},error:'' };
  files.import = write(outputDirectory,'import',hooks.renderAnnualCatalogHtml(catalog));

  hooks.state.annualCatalogDefinitionEdit = false;
  files.withoutRequirement = write(outputDirectory,'fiche-sans-besoin',hooks.renderAnnualCatalogActivityHtml(activityPayload()));
  files.withRequirement = write(outputDirectory,'fiche-avec-besoin',hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));

  hooks.state.annualCatalogDefinitionEdit = true;
  files.edit = write(outputDirectory,'fiche-edition',hooks.renderAnnualCatalogActivityHtml(multiOccurrenceActivityPayload()));

  hooks.state.annualCatalogDefinitionEdit = false;
  const archived = activityPayload();
  archived.activity.active = false;
  files.archived = write(outputDirectory,'fiche-archivee',hooks.renderAnnualCatalogActivityHtml(archived));
  return files;
}

if(require.main === module) process.stdout.write(`${JSON.stringify(buildPreview(process.argv[2]),null,2)}\n`);

module.exports = { buildPreview };
