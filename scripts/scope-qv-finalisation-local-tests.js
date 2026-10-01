#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../assets/js/scope-ui-logic');
const programme = require('../netlify/lib/data/scope-qv-programme-2027.json');
const { groupExerciseOccurrences } = require('../netlify/lib/_scope-annual-catalog-service');
const { _dateOnly } = require('../netlify/lib/_scope-quo-vadis-service');
const ctaRules = require('../netlify/lib/_scope-cta-rules');

const ROOT = path.resolve(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const quoVadisService = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-quo-vadis-service.js'), 'utf8');
let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${String(passed).padStart(2, '0')} - ${name}`);
}

test('Agenda annuel est la porte d’entrée QUO VADIS', () => {
  assert.equal(L.parseHash('#/quo-vadis').qvView, 'agenda-annuel');
});

test('les routes mois et jour ouvrent le Programme en vue mensuelle', () => {
  const month = L.parseHash('#/quo-vadis/programme?mois=2027-02&mode=mensuelle');
  const day = L.parseHash('#/quo-vadis/programme?jour=2027-02-02&mois=2027-02&mode=mensuelle');
  assert.deepEqual([month.qvView, month.qvMois, month.qvMode], ['programme', '2027-02', 'mensuelle']);
  assert.deepEqual([day.qvJour, day.qvMois, day.qvMode], ['2027-02-02', '2027-02', 'mensuelle']);
  assert.match(ui, /qvHref\('programme', \{ mode: 'mensuelle', mois: month\.key \}\)/);
  assert.match(ui, /qvHref\('programme', \{ mode: 'mensuelle', mois: month\.key, jour: cell\.date \}\)/);
});

test('la navigation principale ne duplique plus Agenda mensuel et Activités', () => {
  const navStart = ui.indexOf('function renderQuoVadisNav');
  const navEnd = ui.indexOf('function renderQuoVadisShell', navStart);
  const nav = ui.slice(navStart, navEnd);
  assert.ok(navStart >= 0 && navEnd > navStart);
  assert.match(nav, /Agenda annuel/);
  assert.match(nav, /Programme annuel/);
  assert.match(nav, /Synthèse/);
  assert.doesNotMatch(nav, /Agenda mensuel/);
  assert.doesNotMatch(nav, />Activités</);
});

test('Programme propose les vues tableau et mensuelle sur la même source', () => {
  assert.match(ui, /Vue tableau/);
  assert.match(ui, /Vue mensuelle/);
  assert.match(ui, /qv\.canonicalProgramme \|\| \{\}/);
  assert.match(ui, /qvProgrammeFilteredRows\(qv\)/);
  assert.match(ui, /qvProgrammeMonthlyView\(qv, pagination\.rows, monthlyRows\.length\)/);
});

test('les douze colonnes métier affichées sont triables sans Occurrence ni Session', () => {
  const keys = ['eventCode', 'activity', 'statcom', 'domain', 'family', 'oi', 'date', 'time', 'public', 'responsible', 'location', 'status'];
  for (const key of keys.filter((key) => key !== 'eventCode')) assert.match(ui, new RegExp(`qvSortHeader\\('${key}'`), key);
  assert.match(ui, /qvSortHeaderLines\('eventCode', \['Code', 'événement'\]\)/);
  const programmeView = ui.slice(ui.indexOf('function renderQuoVadisProgramme(qv)'), ui.indexOf('function renderQuoVadisProgrammeFiche'));
  assert.doesNotMatch(programmeView, /qvSortHeader\('occurrence'|qvSortHeader\('session'/);
  assert.match(programmeView, /Array\.from\(\{ length: 13 \}/);
  assert.match(ui, /sort\.dir === 'desc' \? ' ↓' : ' ↑'/);
});

test('les filtres métier et la recherche globale sont reliés', () => {
  for (const id of ['qv-filter-q', 'qv-filter-domain', 'qv-filter-family', 'qv-filter-oi', 'qv-filter-statcom', 'qv-filter-cible', 'qv-filter-lieu', 'qv-filter-status', 'qv-filter-period', 'qv-filter-sessions', 'qv-filter-attention']) {
    assert.match(ui, new RegExp(id), id);
  }
  assert.match(ui, /row\.occurrenceLabel, row\.sessionLabel, row\.statCom/);
  assert.match(ui, /normalize\('NFD'\)/);
  assert.match(ui, /replace\(\/\[\\u0300-\\u036f\]\/g, ''\)/);
});

test('occurrences, sessions et action utilisent les libellés compacts', () => {
  assert.match(ui, /function qvProgrammeOccurrenceLabel[\s\S]*?occurrenceIndex[\s\S]*?\}\/\$\{Number\(row\.occurrenceCount\)\}` : '—'/);
  assert.match(ui, /function qvProgrammeSessionLabel[\s\S]*?sessionIndex[\s\S]*?\}\/\$\{Number\(row\.sessionCount\)\}` : '—'/);
  assert.match(ui, /Consulter la fiche ›/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function renderQuoVadisProgramme'), ui.indexOf('function renderQuoVadisProgrammeFiche')), /Aucune session distincte|Occurrence 1 \(1\//);
});

test('le tableau supprime le défilement desktop et conserve toutes les données aux petits écrans', () => {
  assert.match(css, /\.qv-programme-view\{[^}]*overflow:hidden/);
  assert.match(css, /\.qv-programme-table-wrap\{[^}]*overflow-x:hidden/);
  assert.match(css, /@media\(max-width:960px\)[^{]*\{[\s\S]*?\.qv-programme-table-wrap,[^}]*overflow-x:auto/);
  assert.match(css, /\.qv-programme-table\{[^}]*font-size:var\(--scope-type-body\)/);
  assert.match(css, /\.qv-programme-table th,[^}]*overflow-wrap:normal;word-break:normal;hyphens:none/);
  assert.doesNotMatch(css, /\.qv-programme-table th,\.qv-programme-table td\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /@media\(max-width:800px\)[\s\S]*?\.qv-programme-table,\.qv-programme-month-table\{display:table/);
  assert.match(ui, /<colgroup>/);
  for (const width of ['1150', '960', '800']) assert.match(css, new RegExp(`@media\\(max-width:${width}px\\)`));
});

test('le Catalogue reste une liste de modèles parents', () => {
  assert.match(ui, /const activities = \[\.\.\.\(catalog\.activities \|\| \[\]\)\]/);
  assert.match(ui, /row\.canonicalOccurrenceCount/);
  assert.match(ui, /row\.canonicalSessionCount/);
  assert.match(ui, /row\.exerciseCode/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function renderAnnualCatalog()'), ui.indexOf('function annualList')), /canonicalProgramme\.rows/);
  const grouped = groupExerciseOccurrences(Array.from({ length:6 },(_,index) => ({
    code:`QV26-EXERCICE-PR-2-${index + 1}`,
    domain:'PR',
    label:`Exercice PR 2.${index + 1}`,
    displayLabel:'Exercice PR 2',
    statComCodes:['011PR'],
    publicCodes:['PR:2'],
    sessionCount:1
  })));
  assert.equal(grouped.length,1);
  assert.equal(grouped[0].displayLabel,'Exercice PR 2');
  assert.equal(grouped[0].canonicalOccurrenceCount,6);
  assert.equal(grouped[0].definitionCodes.length,6);
});

test('Phase I multi-OI et Phase II par OI reflètent la source réelle', () => {
  const rows = programme.rows.filter((row) => /Intégration personnel DPS, phase I{1,2}$/i.test(row.activityLabel || row.label || ''));
  const phaseOne = rows.filter((row) => /phase I$/i.test(row.activityLabel || row.label || ''));
  const phaseTwo = rows.filter((row) => /phase II$/i.test(row.activityLabel || row.label || ''));
  assert.equal(phaseOne.length, 1);
  assert.deepEqual([...phaseOne[0].ois].sort(), ['B1', 'B2', 'C1', 'G1']);
  assert.equal(phaseTwo.length, 4);
  assert.deepEqual(phaseTwo.flatMap((row) => row.ois).sort(), ['B1', 'B2', 'C1', 'G1']);
});

test('CMDT et EMSEA sont corrigés dans la source canonique', () => {
  const labels = ['Assemblée CI', 'Conférence des Commandants', 'Séance Codir', 'Séance Codir + repas', 'Séance COSEC', 'Séance CRDIS', 'Séance interSDIS', 'Séance État-major', 'Table ouverte avec le Commandant'];
  const cmdt = programme.rows.filter((row) => labels.includes(row.label));
  const em = cmdt.filter((row) => row.label === 'Séance État-major');
  assert.equal(cmdt.length, 19);
  assert.ok(cmdt.every((row) => row.domain === 'CMDT' && row.family === '' && JSON.stringify(row.ois) === '["SDIS"]'));
  assert.equal(programme.rows.filter((row) => row.domain === 'INSTITUTIONNEL').length, 0);
  assert.equal(em.length, 11);
  assert.ok(em.every((row) => row.statCom === 'EMSEA'));
});

test('le public contradictoire DAP revient à une décision humaine', () => {
  const row = programme.rows.find((item) => item.id === 'qv-source-861');
  assert.deepEqual(row.publics, []);
  assert.equal(row.publicReviewRequired, true);
  assert.match(row.reason, /PUBLIC_CIBLE_A_DEFINIR/);
  assert.match(ui, /return qvProgrammePublicLabels\(row\)\.join\(', '\) \|\| 'À définir'/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function renderQuoVadisProgramme'), ui.indexOf('function renderQuoVadisActivites')), /Selon référentiel/);
});

test('les codes publics techniques utilisent les libellés canoniques démontrés', () => {
  const start = ui.indexOf('function qvProgrammePublicCodeLabel');
  const end = ui.indexOf('function qvProgrammePublicLabels', start);
  const publicHelper = ui.slice(start, end);
  const mappings = {
    'FOBA:1':'FOBA 1','FOBA:2':'FOBA 2','FOBA:3':'FOBA 3','JSP:1':'JSP',
    'PR:2':'PAPR','PR:3':'PABC','FOSPEC:1':'Antichute','FOSPEC:2':'NAC',
    'FOSPEC:3':'OFSI','FOSPEC:4':'VPC','AUTO:1':'Cond PL','AUTO:2':'Cond TP9',
    'AUTO:3':'Cond VL','AUTO:4':'Grutier','AUTO:5':'MEA','AUTO:6':'Pilote bat'
  };
  for (const [code, label] of Object.entries(mappings)) {
    assert.match(publicHelper, new RegExp(`'${code.replace(':', '\\:')}'\\s*:\\s*'${label}'`), code);
  }
  assert.match(publicHelper, /return value\.includes\(':'\) \? 'À définir' : value/);
  assert.doesNotMatch(publicHelper, /Jeunes JSP/);
});

test('pagination, tri mensuel et reset explicite sont branchés', () => {
  for (const value of ['20', '40', '60', 'all']) assert.match(ui, new RegExp(`option value="${value}"`));
  assert.match(ui, /id="qv-filter-reset">Réinitialiser<\/button>/);
  assert.match(ui, /qvProgrammeMonthlyView[\s\S]*qvSortHeader\('time'/);
  assert.match(ui, /state\.quoVadisProgrammePageSize/);
  assert.match(ui, /state\.quoVadisProgrammePageSize = 20/);
  assert.match(ui, /state\.quoVadisSort = \{ key: 'date', dir: 'asc' \}/);
  assert.match(css, /qv-programme-month-table \.qv-agenda-date-row\.is-vacation th\{background:#8467a8/);
});

test('la présentation finale des permanences CTA reste source-backed', () => {
  const cta = programme.rows.filter((row) => row.definitionId === 'CTA-PERMANENCE');
  assert.equal(cta.length, 53);
  assert.ok(cta.every((row) => row.label === 'Permanence'));
  assert.ok(cta.every((row) => JSON.stringify(row.ois) === '["G1","C1","B1","B2"]'));
  assert.ok(cta.every((row) => row.responsible === 'Chef site'));
  assert.ok(cta.every((row) => row.ctaAssignments.length === 4));
  assert.equal(new Set(cta.map((row) => row.id)).size, 53);
  assert.equal(new Set(cta.map((row) => row.startsAt)).size, 53);
  assert.ok(cta.every((row) => row.ctaAssignments.map((assignment) => assignment.oi).join(',') === 'G1,C1,B1,B2'));
  assert.ok(cta.every((row) => row.ctaAssignments.every((assignment) => /^N0[1-5]$/.test(assignment.section))));
  assert.ok(cta.every((row) => row.ctaAssignments.every((assignment) => assignment.oi === 'G1' ? assignment.section !== 'N06' : assignment.section !== 'N04')));
  assert.ok(cta.every((row) => row.ctaAssignments.every((assignment) => /^N0[1-5][ab]$/.test(assignment.halfSection))));
  assert.ok(cta.every((row) => new Date(`${row.id.slice(-10)}T12:00:00Z`).getUTCDay() === 5));
  assert.equal(cta.filter((row) => new Date(`${row.endsAt}Z`).getUTCDay() === 2).length, 3);
  assert.ok(cta.every((row) => [1, 2].includes(new Date(`${row.endsAt}Z`).getUTCDay())));
  assert.ok(cta.every((row) => row.ctaPublicStatus === 'HALF_SECTION_ROTATION_MOA_DEMONSTRATED'));
  assert.deepEqual(cta[0].ctaAssignments.map((row) => row.halfSection), ['N04b', 'N03a', 'N03a', 'N03a']);
  assert.deepEqual(cta[1].ctaAssignments.map((row) => row.halfSection), ['N03b', 'N02a', 'N02a', 'N02a']);
  assert.equal(cta.flatMap((row) => row.ctaHolidayWindows || []).length, 1);
  assert.match(ui, /Permanence \$\{day\(row\.startsAt\)\}/);
  assert.match(ui, /qv-programme-activity is-cta/);
  assert.match(ui, /qvProgrammeLocationLabel/);
  assert.match(ui, /qv-programme-date/);
  assert.match(ui, /<span>Consulter<\/span><span>la fiche ›<\/span>/);
  assert.match(ui, /assignment\.halfSection \|\| assignment\.section/);
  assert.match(ui, /oi: 'C1, B1, B2'/);
  assert.doesNotMatch(ui, /assignment && assignment\.halfSection \|\| 'À définir'/);
  assert.match(ui, /if \(row && row\.definitionId === 'CTA-PERMANENCE'\) return start/);
  assert.match(ui, /if \(row && row\.definitionId === 'CTA-PERMANENCE'\) return '—'/);
});

test('le moteur CTA applique le cycle continu et les neuf jours fériés vaudois', () => {
  assert.deepEqual(ctaRules.assignmentsForFriday('2027-01-01').map((row) => row.halfSection), ['N04b', 'N03a', 'N03a', 'N03a']);
  assert.deepEqual(ctaRules.assignmentsForFriday('2027-03-12').map((row) => row.halfSection), ['N04b', 'N02b', 'N02b', 'N02b']);
  assert.deepEqual(ctaRules.assignmentsForFriday('2028-01-07').map((row) => row.halfSection), ['N01b', 'N01b', 'N01b', 'N01b']);
  const result = ctaRules.applyCtaRules(programme.rows, 2027);
  assert.equal(result.holidayEvidence.length, 9);
  assert.deepEqual(result.holidayEvidence.find((row) => row.label === 'Lundi de Pâques'), {
    date: '2027-03-29', label: 'Lundi de Pâques', type: 'PROLONGEMENT_WEEK_END',
    startsAt: '2027-03-25T18:00', endsAt: '2027-03-30T06:00',
    assignments: 'G1 N02b ; C1/B1/B2 N03a', ownerId: 'CTA-PERM-2027-03-26'
  });
  assert.equal(result.holidayEvidence.find((row) => row.label === 'Vendredi saint').endsAt, '2027-03-30T06:00');
  assert.equal(result.holidayEvidence.find((row) => row.label === 'Ascension').startsAt, '2027-05-05T18:00');
});

test('les séries JSP sont portées par le site sans confondre les trois OI', () => {
  const expected = { G1: 8, C1: 10, B1: 10 };
  for (const [site, count] of Object.entries(expected)) {
    const rows = programme.rows.filter((row) => row.domain === 'JSP' && row.seriesSite === site);
    assert.ok(rows.length > 0, site);
    assert.ok(rows.every((row) => row.ois.length === 1 && row.ois[0] === site));
    assert.ok(rows.every((row) => row.seriesOccurrenceCount === count));
    assert.ok(rows.every((row) => row.seriesOccurrenceIndex >= 1 && row.seriesOccurrenceIndex <= count));
  }
});

test('l’Agenda représente les 622 séances sans inventer les 497 dates absentes', () => {
  const rows = programme.rows.filter((row) => !row.external);
  const dated = rows.filter((row) => row.startsAt);
  assert.equal(rows.length, 622);
  assert.equal(dated.length, 125);
  assert.equal(rows.length - dated.length, 497);
  assert.match(ui, /function qvAgendaProjection/);
  assert.match(ui, /séances représentées/);
  assert.match(ui, /séances sans date inventée/);
});

test('le tableau Programme respecte l’ordre MOA final et le code non gras', () => {
  const start = ui.indexOf('function renderQuoVadisProgramme(qv)');
  const end = ui.indexOf('function renderQuoVadisProgrammeFiche', start);
  const view = ui.slice(start, end);
  const expected = ["['Code', 'événement']", "'date', 'Date'", "'time', 'Horaire'", "'activity', 'Activité'", "'statcom', 'Stat.Com'", "'domain', 'Domaine'", "'family', 'Famille'", "'oi', 'OI'", "'public', 'Public cible'", "'responsible', 'Responsable'", "'location', 'Lieu'", "'status', 'État'", '>Action<'];
  let cursor = -1;
  for (const label of expected) {
    const next = view.indexOf(label, cursor + 1);
    assert.ok(next > cursor, label);
    cursor = next;
  }
  assert.match(view, /<td>\$\{escapeHtml\(eventCode\)\}<\/td><td><strong class="qv-programme-date">/);
  assert.match(css, /td:nth-child\(12\)\{vertical-align:middle\}/);
  assert.match(css, /td:nth-child\(12\) \.scope-state\{[^}]*align-items:center/);
});

test('la projection PostgreSQL conserve le jour civil en Europe Zurich', () => {
  const sourceDate = new Date(2027, 0, 15);
  assert.equal(_dateOnly(sourceDate), '2027-01-15');
  assert.equal(_dateOnly('2027-01-15'), '2027-01-15');
});

test('la fiche Programme expose les libellés métier sans UUID', () => {
  const start = ui.indexOf('function renderQuoVadisProgrammeFiche');
  const end = ui.indexOf('function renderQuoVadisActivites', start);
  const detail = ui.slice(start, end);
  assert.match(detail, /<h3>Événement<\/h3>/);
  assert.match(detail, /<dt>Code cours<\/dt>/);
  assert.match(detail, /<h3>Planification<\/h3>/);
  assert.match(detail, /<h3>Règle appliquée<\/h3>/);
  assert.match(detail, /qvProgrammeAppliedRule\(row\)/);
  assert.match(detail, /<h3>Workflow<\/h3>/);
  assert.match(detail, /Ouvrir l'événement/);
  assert.match(detail, /qvProgrammeLocationLabel\(row\)/);
  assert.match(detail, /qvProgrammeRoomLabel\(row\)/);
  assert.match(ui, /function qvProgrammeStatComLabel/);
  assert.match(ui, /Exercice \$\{exercise\} sur \$\{series\}/);
  assert.match(ui, /return String\(reference && reference\.libelle \|\| labels\[value\] \|\| '—'\)/);
  assert.doesNotMatch(detail, /UUID technique|Continuer le workflow|Ouvrir l’événement opérationnel/);
});

test('un code attribué est lu depuis le registre canonique avant Auto', () => {
  assert.match(quoVadisService, /from scope_event_code_allocations/);
  assert.match(quoVadisService, /event\.code_cours \|\| allocatedByEvent\.get/);
  assert.match(ui, /if \(row\.publishedEventCode\) return row\.publishedEventCode/);
  assert.match(ui, /return row\.statCom \? 'Auto' : '—'/);
});

console.log(`SCOPE QV FINALISATION LOCALE: ${passed}/${passed} tests PASS`);
