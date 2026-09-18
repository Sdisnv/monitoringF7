#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const html = read('scope.html');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const schema = read('netlify/lib/_scope-schema.js');
const pdfRenderer = read('netlify/lib/_scope-pdf-renderer.js');
const report = read('netlify/lib/_scope-report-service.js');
const logicSrc = read('assets/js/scope-ui-logic.js');
const api = read('assets/js/scope-api.js');
const fn = read('netlify/functions/scope.js');

const referentials = require('../netlify/lib/_scope-quo-vadis-referentials');

const activites = ui.slice(ui.indexOf('function renderQuoVadisActivites('), ui.indexOf('function renderQuoVadisActivite('));
const fiche = ui.slice(ui.indexOf('function renderQuoVadisActivite('), ui.indexOf('function renderQuoVadisArbitrer('));
const filters = ui.slice(ui.indexOf('function qvActivitesFilterBar('), ui.indexOf('function qvSallesForLieu('));
const agenda = ui.slice(ui.indexOf('function renderQuoVadisAgenda('), ui.indexOf('function renderQuoVadisActivites('));
const annual = ui.slice(ui.indexOf('function qvRenderMiniMonth('), ui.indexOf('function renderQuoVadisAgendaAnnuel('));
const binding = ui.slice(ui.indexOf('document.getElementById(\'qv-filter-reset\')'), ui.indexOf('const setAgendaMonth'));
const csv = ui.slice(ui.indexOf('const downloadQuoVadisCsv'), ui.indexOf('document.getElementById(\'qv-export-excel\')'));
const stateCss = css.slice(css.indexOf('.qv-agenda-state {'), css.indexOf('.qv-agenda-state.is-planned'));
const legend = activites.slice(activites.indexOf('qv-agenda-legend'), activites.indexOf('scope-table-wrap'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

assert.ok(/Date/.test(activites) && /Horaire/.test(activites) && /Domaine/.test(activites));
assert.ok(/OI/.test(activites) && /Public cible/.test(activites) && /Activité/.test(activites));
assert.ok(/Spécialisation · cursus/.test(activites) && /Stat\.Com/.test(activites));
assert.ok(/Lieu/.test(activites) && /Salle théorie/.test(activites) && /Responsable/.test(activites) && /État/.test(activites));
assert.ok(!/Point d’attention/.test(activites) || /qv-agenda-legend/.test(activites));
assert.ok(!/<th>Point d’attention<\/th>/.test(activites));
assert.ok(!/>Ouvrir</.test(activites));
assert.ok(/qv-month-separator/.test(activites));
assert.ok(/qvMonthSeparatorLabel/.test(activites));
assert.ok(/qvActivityCountLabel/.test(activites));
assert.ok(/qvAgendaStateBadge\(row\)/.test(activites));
assert.ok(/qvActivityCalendarClass/.test(activites));
assert.ok(/is-holiday/.test(activites) && /is-vacation/.test(activites));
assert.ok(/qvOiCode\(qv, row\)/.test(activites));
assert.ok(/qvCibleLabel\(row\)/.test(activites));
assert.ok(/data-qv-open/.test(activites));
assert.ok(/qvActivitesFilterBar\(qv\)/.test(activites));

assert.ok(/qv-filter-period/.test(filters));
assert.ok(/Période d’affichage/.test(filters));
assert.ok(/Tous/.test(filters) && /Mois/.test(filters) && /Trimestre/.test(filters) && /Semestre/.test(filters));
assert.ok(/qv-filter-month/.test(filters) && /qv-filter-quarter/.test(filters) && /qv-filter-semester/.test(filters));
assert.ok(/id="qv-filter-reset"/.test(filters));
assert.ok(/aria-label="Réinitialiser les filtres"/.test(filters));
assert.ok(/title="Réinitialiser les filtres"/.test(filters));
assert.ok(/qvCockpitIcon\('refresh'\)/.test(filters));
assert.ok(!/>\s*Réinitialiser les filtres\s*</.test(filters));
assert.ok(/Séances multiples/.test(filters) && /Points d’attention/.test(filters));
assert.ok(/Public cible/.test(filters));

assert.ok(/function qvActivityMatchesPeriod/.test(ui));
assert.ok(/period === 'mois'/.test(ui) && /period === 'trimestre'/.test(ui) && /period === 'semestre'/.test(ui));
assert.ok(/period: 'tous'/.test(ui));
assert.ok(/quarter: 'tous'/.test(binding) && /semester: 'tous'/.test(binding));
assert.ok(/addEventListener\('click'/.test(binding));

assert.ok(/qvAgendaStateBadge/.test(fiche));
assert.ok(/Salle théorie/.test(fiche));
assert.ok(/qv-activity-salle/.test(fiche));
assert.ok(/Responsable/.test(fiche));
assert.ok(/qv-activity-responsable/.test(fiche));
assert.ok(/updateQuoVadisActivity/.test(ui) && /updateQuoVadisActivity/.test(api));
assert.ok(/updateActivityPlanning/.test(service) && /\/quo-vadis\/activities\/:id/.test(fn));

assert.ok(referentials.OFFICIAL_LIEUX.length === 8);
assert.ok(referentials.OFFICIAL_LIEUX.every((row) => /^(Caserne|Local) /.test(row.nomCourt)));
assert.ok(!referentials.OFFICIAL_LIEUX.some((row) => /Centre SDIS/i.test(JSON.stringify(row))));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.code === 'G1-CASERNE' && row.adresseLigne1 === 'Arsenal 8'));
assert.ok(referentials.OFFICIAL_LIEUX.some((row) => row.code === 'Y3-LOCAL' && row.adresseLigne1 === "Grand'rue 1"));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.code === 'G1-VULCAIN'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.code === 'G1-JURA' && row.parentCode === 'G1-VULCAIN'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.code === 'G1-ALPES' && row.parentCode === 'G1-VULCAIN'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.code === 'G1-O2' && row.parentCode === 'G1-OXYGENE'));
assert.ok(referentials.THEORY_ROOMS.some((row) => row.code === 'G1-O3' && row.parentCode === 'G1-OXYGENE'));
assert.ok(!referentials.THEORY_ROOMS.some((row) => /B2|Y1|Y2|Y3|Y4/.test(row.lieuCode)));
assert.ok(referentials.SITES_WITHOUT_THEORY_ROOMS.includes('B2-CASERNE'));
assert.ok(referentials.roomsConflict('G1-VULCAIN', 'G1-JURA'));
assert.ok(referentials.roomsConflict('G1-OXYGENE', 'G1-O2'));
assert.ok(!referentials.roomsConflict('G1-JURA', 'G1-FLASHOVER'));
assert.ok(referentials.RESPONSIBLE_FUNCTIONS.includes('C audiovisuel'));
assert.ok(referentials.RESPONSIBLE_FUNCTIONS.includes('Resp VPC'));
assert.ok(referentials.RESPONSIBLE_FUNCTIONS.includes('Présidente CI'));
assert.ok(referentials.extractSiteCode('Exercice G1') === 'G1');
assert.ok(referentials.suggestLieu({ title: 'G1 — Exercice' }, [{ lieuId: '1', oiCode: 'G1' }], 'human').overwritten === false);
assert.ok(referentials.suggestLieu({ title: 'G1 — Exercice' }, [{ lieuId: '1', oiCode: 'G1' }], 'human').lieuId === 'human');

assert.ok(/scope_salles_theorie/.test(schema));
assert.ok(/scope_responsable_fonctions/.test(schema));
assert.ok(/migrateQuoVadisToutesActivitesUx1/.test(schema));
assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-toutes-activites-ux-1'/.test(schema));
assert.ok(/salle_theorie_id/.test(schema) && /responsable_fonction_code/.test(schema));
assert.ok(!/GRANT |ENABLE ROW LEVEL|ALTER POLICY/.test(schema.slice(schema.indexOf('migrateQuoVadisToutesActivitesUx1'))));

assert.ok(/sallesTheorie/.test(service) && /responsableFonctions/.test(service));
assert.ok(/suggestLieu/.test(service));
assert.ok(/salleTheorie/.test(service) && /responsableFonctionCode/.test(service));

assert.ok(/qvAgendaStateBadge\(row\)/.test(agenda));
assert.ok(/font-weight:\s*400/.test(stateCss));
assert.ok(/font-size:\s*inherit/.test(stateCss));
assert.ok(/min-height:\s*26px/.test(stateCss));
assert.ok(/border-radius:\s*4px/.test(stateCss));
assert.ok(/#eceaf6/.test(css) && /#dce3f7/.test(css));
assert.ok(/\.qv-activites-row\.is-vacation td/.test(css));
assert.ok(/\.qv-activites-row\.is-holiday td/.test(css));
assert.ok(/\.qv-month-separator th/.test(css));
assert.ok(/background:\s*#5b6570/.test(css.slice(css.indexOf('.qv-month-separator th'), css.indexOf('.qv-activity-salle'))));

assert.ok(!/Jour normal/.test(legend));
assert.ok(/Vacances scolaires/.test(legend) && /Jour férié/.test(legend));
assert.ok((legend.match(/qv-agenda-swatch/g) || []).length === 7);
assert.ok(!/<span class="qv-agenda-state/.test(legend));

assert.ok(/Adresse du lieu/.test(csv));
assert.ok(/Salle théorie/.test(csv));
assert.ok(/Responsable/.test(csv));
assert.ok(/Public cible/.test(csv));
assert.ok(/Point d’attention/.test(csv));

assert.ok(/qvProgrammeTable/.test(pdfRenderer));
assert.ok(/landscape:\s*true/.test(pdfRenderer));
assert.ok(/type === 'month'/.test(pdfRenderer));
assert.ok(/is-holiday/.test(pdfRenderer) && /#dce3f7/.test(pdfRenderer));
assert.ok(/#eceaf6/.test(pdfRenderer));
assert.ok(/publicCible/.test(report) && /salleTheorie/.test(report));
assert.ok(!/addPage\(\).*mois|saut de page.*mois/.test(pdfRenderer.toLowerCase()));

assert.ok(/qv-mini-week/.test(annual));
assert.ok(/L\.qvIsoWeek\(dated\.date\)/.test(annual));
assert.ok(/>S</.test(annual) || /qv-mini-week-head" aria-hidden="true">S/.test(annual));
assert.strictEqual(L.qvIsoWeek('2027-02-02'), 5);
assert.ok(/font-size:\s*10px/.test(css.slice(css.indexOf('.qv-mini-week-head,'), css.indexOf('.qv-mini-day.has-vacation'))));

assert.ok(!/Centre SDIS/.test(ui));
assert.ok(!/Centre SDIS/.test(schema));
assert.ok(!/Centre SDIS/.test(service));
assert.ok(/scope-quo-vadis-toutes-activites-ux-[1234]/.test(html));
assert.ok(service.includes('QUO-VADIS-MOA-CONSOLIDATION-2'));
assert.ok(!/data-qv-row-menu/.test(agenda) && !/>…</.test(agenda));

console.log('scope-quo-vadis-toutes-activites-ux-1-tests: ok');
