#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const L = require('../assets/js/scope-ui-logic');
const { _effectivePlanningRules } = require('../netlify/lib/_scope-quo-vadis-service');

const ui = fs.readFileSync(path.join(__dirname, '../assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../assets/css/scope.css'), 'utf8');
const state = { quoVadisFutureForm: {}, quoVadisFuturePage: 1, quoVadisFuturePageSize: 20, quoVadisAgendaMonth: '2027-01' };
const context = {
  L, state,
  escapeHtml: (value) => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
  qvPilotPager: () => ({ current: 1, size: 20, slice: (rows) => rows, footHtml: () => '' }),
  qvLieuOptions: () => '<option value="">Non précisé</option>',
  qvPilotStateLegendHtml: () => '', qvPilotHintHtml: () => '', qvFieldError: () => '',
  qvFormatDate: (value) => value, qvMonthTitle: (month, year) => `${month} ${year}`,
  qvMonthLabel: (month) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][month - 1],
  qvFilteredActivities: () => [], qvCalendarIndex: () => ({}), qvAgendaFilterBar: () => '',
  qvCockpitIcon: () => '', scopeStateHtml: () => '',
  qvCursusNavRows: (qv) => qv.cursusSelections,
  hasScopePermission: () => false, qvCursusStepState: () => ({ tone: 'info', label: 'Planifié' }),
  qvCursusStepPeriod: () => '', qvSoftBtn: () => '',
  qvDayChipsHtml: () => '',
  console
};
vm.createContext(context);
function load(name, next){
  const start = ui.indexOf(`  function ${name}(`);
  const end = ui.indexOf(`  function ${next}(`, start + 1);
  assert.ok(start >= 0 && end > start, `function ${name}`);
  vm.runInContext(ui.slice(start, end), context);
  return context[name];
}
load('domainTaxonomySelectHtml', 'sharedOptionsHtml');
load('sharedOptionsHtml', 'domaineLabel');
load('qvMonthChoices', 'qvAgendaMonthKey');
load('qvAgendaMonthKey', 'qvShiftAgendaMonth');
load('qvShiftAgendaMonth', 'qvTodayKey');
load('renderQuoVadisAgenda', 'qvFormatSalleRappel');
load('renderQuoVadisCursus', 'renderQuoVadisRegles');
load('renderQuoVadisRegles', 'qvFieldError');
load('renderQuoVadisDatesConnues', 'renderQuoVadis');

const expected = {
  DPS: ['G1','C1','B1','B2'], DAP: ['Y1','Y2','Y3','Y4'], JSP: ['Général'],
  FOBA: ['Général'], FOCO: ['DPS','DAP','JSP'], FOCA: ['Général'],
  FOSPEC: ['Général'], PR: ['Général','PAPR','PABC'],
  AUTO: ['cond PL','cond TP9','cond VL','Grutier','MEA','Pilote BAT']
};
for (const [domain, labels] of Object.entries(expected)) {
  state.quoVadisFutureForm = { domain };
  const cibles = L.sharedOiOptions(domain).filter((row) => row.value).map((row, index) => ({ cibleId: `${domain}-${index}`, domaineCode: domain, niveauCode: row.value, libelle: row.label, actif: true }));
  const html = context.renderQuoVadisDatesConnues({ futureDates: [], cursusSelections: [], cibles });
  const select = html.match(/<select id="qv-future-cible">([\s\S]*?)<\/select>/);
  assert.ok(select, `${domain}: OI rendered`);
  const actual = [...select[1].matchAll(/<option[^>]*>(.*?)<\/option>/g)].map((match) => match[1]);
  assert.deepEqual(actual, ['Non précisé', ...labels], `${domain}: rendered OI`);
  assert.ok(!/OI \/ Cible|Cursus \/ Spécialisation/.test(html));
  assert.equal(html.includes('>Spécialisation</label>'), domain === 'FOSPEC');
}
state.quoVadisFutureForm = { domain: 'DPS' };
const extended = context.renderQuoVadisDatesConnues({ futureDates: [], cursusSelections: [], cibles: [{ cibleId: 'extra', domaineCode: 'DPS', niveauCode: 'B3', libelle: 'B3', actif: true }] });
assert.match(extended, />B3<\/option>/, 'new active target is available without a static UI entry');
state.quoVadisFutureForm = { domain: 'FOCO', cursusId: 'id-1' };
assert.match(context.renderQuoVadisDatesConnues({ futureDates: [], cursusSelections: [{ cursusId: 'id-1', libelle: 'CI DPS', retenu: true }] }), /<label for="qv-future-cursus">Cursus<\/label>/);
assert.equal(L.normalizeOiCode('PR', 'PR-ABC'), 'ABC');
assert.equal(L.niveauAffiche('PR', 'PRABC'), 'PABC');

for (const month of ['2027-01', '2027-12', '2028-01', '2028-03']) {
  state.quoVadisAgendaMonth = month;
  state.quoVadisMonthPickerOpen = true;
  state.quoVadisMonthPickerYear = Number(month.slice(0, 4));
  const html = context.renderQuoVadisAgenda({});
  assert.ok(html.includes(`data-qv-picker-month="${month}" class="is-active"`), `${month}: active month`);
  assert.ok(!html.includes('<select id="qv-agenda-month"'));
}
assert.equal(context.qvShiftAgendaMonth('2027-01', -1), '2027-01');
assert.equal(context.qvShiftAgendaMonth('2027-12', 1), '2028-01');
assert.equal(context.qvShiftAgendaMonth('2028-03', 1), '2028-03');
const monthBinding = ui.slice(ui.indexOf('const setAgendaMonth ='), ui.indexOf('const openCalendarModal ='));
assert.ok(!/quoVadisFilters\s*=/.test(monthBinding), 'month navigation preserves filters');
assert.ok(monthBinding.includes("event.key !== 'Escape'"));
assert.ok(css.includes('.qv-agenda-month-panel button:focus-visible'));

const rows = ['DPS','DAP','JSP','FOBA','FOCO','FOCA','FOSPEC','PR','AUTO'].map((domain) => ({ code: `PLANIF-${domain}`, version_code: '2027', domain: domain === 'FOCO' ? null : domain, metadata: domain === 'FOCO' ? { family: 'FOCO' } : {}, active: true }));
rows.push({ code: 'DAP-VENDREDI-AUTORISE', domain: 'DAP', active: true }, { code: 'FORMATION-GENERALE', domain: 'FOBA', active: true });
const effective = _effectivePlanningRules(rows);
assert.deepEqual(effective.map((row) => row.code), ['PLANIF-DPS','PLANIF-DAP','PLANIF-JSP','PLANIF-FOBA','PLANIF-FOCO','PLANIF-FOCA','PLANIF-FOSPEC','PLANIF-PR','PLANIF-AUTO']);
const scoped = { code: 'DAP-Y4-SPECIAL', domain: 'DAP', definition_version_id: 'version-y4', active: true };
assert.ok(_effectivePlanningRules([...rows, scoped]).includes(scoped), 'distinct scoped rule remains available');
const rulesHtml = context.renderQuoVadisRegles({ rules: effective.map((row) => ({ domain: row.domain || row.metadata.family, scopeLabel: 'Règle générale' })) });
assert.ok(!rulesHtml.includes('OI / cible'));

const cursusHtml = context.renderQuoVadisCursus({ programme: { annee: 2027 }, cursusSelections: [{ code: 'CI-DPS', libelle: 'CI DPS', statut: 'ACTIF', retenu: false }], cursus: [{ code: 'CI-DPS', stepId: 'step-1', stepLabel: 'Module 1', stepRetenu: false }], dpsOrganisation: ['B2','C1','G1','B1'].map((oiCode) => ({ oiCode, validFrom: '2027-01-01', sections: [] })) });
assert.ok(cursusHtml.indexOf('<strong>G1</strong>') < cursusHtml.indexOf('<strong>C1</strong>'));
assert.ok(cursusHtml.indexOf('<strong>C1</strong>') < cursusHtml.indexOf('<strong>B1</strong>'));
assert.ok(cursusHtml.indexOf('<strong>B1</strong>') < cursusHtml.indexOf('<strong>B2</strong>'));
assert.match(cursusHtml, /data-qv-cursus-plan="CI-DPS" value="0" checked/);
assert.match(cursusHtml, /data-qv-cursus-step=.*disabled/);
const synthesis = ui.slice(ui.indexOf('function renderQuoVadisSynthese('), ui.indexOf('function qvCalendarMarkVisible('));
assert.ok(synthesis.includes('<details class="qv-consolidation-details">'));
assert.ok(!synthesis.includes('qv-quick-nav'));
assert.equal((synthesis.match(/label: '(Activités prévues|Séances consolidées|Dates proposées|À arbitrer|Alertes|Dates annoncées)'/g) || []).length, 6);
console.log('scope-quo-vadis-final-ux-referential-3-tests: ok');
