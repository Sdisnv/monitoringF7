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
const scopeRoute = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
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

test('la fiche expose le statut persiste et un arbitrage lie a son occurrence', () => {
  const fiche=ui.slice(ui.indexOf('function renderQuoVadisProgrammeFiche'),ui.indexOf('function renderQuoVadisActivites'));
  assert.match(fiche,/id="qv-programme-occurrence-status"/);
  assert.match(fiche,/hasScopePermission\('references:manage'\)/);
  assert.match(fiche,/qvActivityById\(qv,row\.preparation\.id\)/);
  assert.match(fiche,/arbitrationActivity\.activityId/);
  assert.doesNotMatch(fiche,/<a class="scope-btn" href="#\/quo-vadis\/a-arbitrer">Arbitrage<\/a>/);
  assert.match(ui,/status: document\.getElementById\('qv-programme-occurrence-status'\)/);
});

test('calcul 2028 apres dry-run et ecritures reserves aux gestionnaires', () => {
  assert.match(ui,/id="qv-preview-2028"/);
  assert.match(ui,/id="qv-calculate-2028"/);
  assert.match(ui,/client\.previewQuoVadisProgramme\(2028\)/);
  assert.match(ui,/client\.generateQuoVadisProgramme\(2028\)/);
  const generate=scopeRoute.slice(scopeRoute.indexOf("'/quo-vadis/programmes/:annee/generate'"),scopeRoute.indexOf("'/quo-vadis/programmes/:annee/preview'"));
  assert.match(generate,/hasPermission\(claims, 'references:manage'\)/);
});

test('les onze colonnes métier affichées sont triables sans Occurrence ni Session', () => {
  const keys = ['eventCode', 'activity', 'statcom', 'oi', 'date', 'time', 'public', 'responsible', 'location', 'status'];
  for (const key of keys.filter((key) => key !== 'eventCode')) assert.match(ui, new RegExp(`qvSortHeader\\('${key}'`), key);
  assert.match(ui, /qvSortHeaderLines\('eventCode', \['Code', 'cours'\]\)/);
  assert.match(ui, /qvSortHeaderLines\('domain', \['Domaine', 'famille'\]\)/);
  const programmeView = ui.slice(ui.indexOf('function renderQuoVadisProgramme(qv)'), ui.indexOf('function renderQuoVadisProgrammeFiche'));
  assert.doesNotMatch(programmeView, /qvSortHeader\('occurrence'|qvSortHeader\('session'|qvSortHeader\('family'/);
  assert.match(programmeView, /Array\.from\(\{ length: 12 \}/);
  assert.match(ui, /sort\.dir === 'desc' \? ' ↓' : ' ↑'/);
});

test('les filtres métier et la recherche globale sont reliés', () => {
  for (const id of ['qv-filter-q', 'qv-filter-domain', 'qv-filter-family', 'qv-filter-oi', 'qv-filter-statcom', 'qv-filter-cible', 'qv-filter-lieu', 'qv-filter-status', 'qv-filter-period', 'qv-filter-sessions', 'qv-filter-attention']) {
    assert.match(ui, new RegExp(id), id);
  }
  assert.match(ui, /row\.occurrenceLabel, row\.sessionLabel, \(row\.themes \|\| \[\]\)\.join\(' '\), row\.statCom/);
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
  assert.match(ui, /return L\.qvFormatPublicLabels\(row && row\.publics\) \|\| 'À définir'/);
  assert.doesNotMatch(ui.slice(ui.indexOf('function renderQuoVadisProgramme'), ui.indexOf('function renderQuoVadisActivites')), /Selon référentiel/);
});

test('les codes publics techniques utilisent les libellés canoniques démontrés', () => {
  const mappings = {
    'FOBA:1':'FOBA 1','FOBA:2':'FOBA 2','FOBA:3':'FOBA 3','JSP:1':'JSP',
    'PR:2':'PAPR','PR:3':'PABC','FOSPEC:1':'Antichute','FOSPEC:2':'NAC',
    'FOSPEC:3':'OFSI','FOSPEC:4':'OP VPC','AUTO:1':'cond PL','AUTO:2':'cond TP9',
    'AUTO:3':'cond VL','AUTO:4':'Grutier','AUTO:5':'Machiniste EA','AUTO:6':'Pilote BAT'
  };
  for (const [code, label] of Object.entries(mappings)) {
    assert.equal(L.qvProgrammePublicLabel(code), label, code);
  }
  assert.equal(L.qvProgrammePublicLabel('INCONNU:1'), 'À définir');
  assert.equal(L.qvProgrammePublicLabel('N04b'), 'N04b');
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
  assert.deepEqual(ctaRules.assignmentsForFriday('2026-02-13').map((row) => row.halfSection), ['N05a', 'N01a', 'N01a', 'N01a']);
  assert.deepEqual(ctaRules.assignmentsForFriday('2027-01-01').map((row) => row.halfSection), ['N04b', 'N03a', 'N03a', 'N03a']);
  assert.deepEqual(ctaRules.assignmentsForFriday('2027-03-12').map((row) => row.halfSection), ['N04b', 'N02b', 'N02b', 'N02b']);
  assert.deepEqual(ctaRules.assignmentsForFriday('2028-01-07').map((row) => row.halfSection), ['N01b', 'N01b', 'N01b', 'N01b']);
  const result = ctaRules.applyCtaRules(programme.rows, 2027);
  assert.equal(result.holidayEvidence.length, 9);
  assert.deepEqual(result.holidayEvidence.find((row) => row.label === 'Lundi de Pâques'), {
    date: '2027-03-29', label: 'Lundi de Pâques', type: 'PROLONGEMENT_WEEK_END',
    startsAt: '2027-03-25T18:00', endsAt: '2027-03-30T06:00',
    assignments: 'G1 N02b ; C1/B1/B2 N03a', ownerId: 'CTA-PERM-2027-03-26',
    ctaAssignments: ctaRules.assignmentsForFriday('2027-03-26').map(row => ({ ...row, provenance: 'MOA_CTA_CONTINUOUS_HALF_SECTION_CYCLE' }))
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

test('l’Agenda enrichit les 497 séances non datées depuis QUO VADIS 2026', () => {
  const rows = programme.rows.filter((row) => !row.external);
  const dated = rows.filter((row) => row.startsAt);
  const historical = rows.filter((row) => row.historicalProposal);
  const undated = rows.filter((row) => !row.startsAt);
  assert.equal(rows.length, 622);
  assert.equal(programme.historicalEnrichment.beforeUndated, 497);
  assert.equal(programme.historicalEnrichment.strong, 106);
  assert.equal(programme.historicalEnrichment.probable, 257);
  assert.equal(programme.historicalEnrichment.ambiguous, 134);
  assert.equal(historical.length, 363);
  assert.equal(dated.length, 488);
  assert.equal(undated.length, 134);
  assert.equal(historical.length + undated.length, 497);
  assert.match(ui, /function qvAgendaProjection/);
  assert.match(ui, /séances représentées/);
  assert.match(ui, /Proposées 2026/);
  assert.match(ui, /séances sans date/);
});

test('le tableau Programme respecte l’ordre MOA final et le code non gras', () => {
  const start = ui.indexOf('function renderQuoVadisProgramme(qv)');
  const end = ui.indexOf('function renderQuoVadisProgrammeFiche', start);
  const view = ui.slice(start, end);
  const expected = ["['Code', 'cours']", "'date', 'Date'", "'time', 'Horaire'", "'activity', 'Activité'", "'statcom', 'Stat.Com'", "['Domaine', 'famille']", "'oi', 'OI'", "'public', 'Public cible'", "'responsible', 'Responsable'", "'location', 'Lieu'", "'status', 'État'", '>Action<'];
  let cursor = -1;
  for (const label of expected) {
    const next = view.indexOf(label, cursor + 1);
    assert.ok(next > cursor, label);
    cursor = next;
  }
  assert.match(view, /<td>\$\{escapeHtml\(eventCode\)\}<\/td><td><strong class="qv-programme-date">/);
  assert.match(css, /td:nth-child\(11\)\{vertical-align:middle\}/);
  assert.match(css, /td:nth-child\(11\) \.scope-state\{[^}]*align-items:center/);
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
  assert.match(detail, /<summary>Règle appliquée/);
  assert.match(detail, /qvProgrammeAppliedRule\(row\)/);
  assert.match(detail, /qv-programme-workflow/);
  assert.match(detail, /Ouvrir l'événement/);
  assert.match(detail, />Arbitrage</);
  assert.match(detail, /Annuler pour l’année/);
  assert.match(detail, />Supprimer<\/button>/);
  assert.match(detail, /qvProgrammeLocationLabel\(row\)/);
  assert.match(detail, /qvProgrammeRoomLabel\(row\)/);
  assert.match(ui, /function qvProgrammeStatComLabel/);
  assert.match(ui, /Exercice \$\{exercise\} sur \$\{series\}/);
  assert.match(ui, /return reference \? reference\.libelle/);
  assert.doesNotMatch(detail, /UUID technique|Continuer le workflow|Ouvrir l’événement opérationnel/);
});

test('un code attribué est lu depuis le registre canonique avant Auto', () => {
  assert.match(quoVadisService, /from scope_event_code_allocations/);
  assert.match(quoVadisService, /event\.code_cours \|\| allocatedByEvent\.get/);
  assert.match(ui, /if \(row\.publishedEventCode\) return row\.publishedEventCode/);
  assert.match(ui, /return row\.statCom \? 'Auto' : '—'/);
});

test('les 497 séances à positionner disposent d’une vue de travail partageable', () => {
  const parsed = L.parseHash('#/quo-vadis/programme?placement=undated');
  assert.equal(parsed.qvPlacement, 'undated');
  assert.match(ui, /À définir \(\$\{undated\}\)/);
  assert.match(ui, /Proposées 2026 \(\$\{historical\}\)/);
  assert.match(ui, /quoVadisProgrammePlacement === 'undated' && date/);
  assert.match(ui, /quoVadisProgrammePlacement === 'proposed' && !row\.historicalProposal/);
  assert.match(ui, /qvHref\('programme', \{ placement: 'undated' \}\)/);
});

test('la date et les barres CTA sont dérivées des bornes opérationnelles', () => {
  assert.match(ui, /row\.definitionId === 'CTA-PERMANENCE' \|\| row\.preparation/);
  assert.match(ui, /function qvProgrammeIntervalTitle/);
  assert.match(ui, /differentYears/);
  assert.match(ui, /cta \? qvProgrammeIntervalTitle\(cta\) : qvAgendaDayTitle\(group\.date\)/);
  assert.doesNotMatch(ui, /Pâques.*qvProgrammeIntervalTitle|Ascension.*qvProgrammeIntervalTitle|Nouvel An.*qvProgrammeIntervalTitle/);
});

test('les jours officiels restent distincts des périodes de permanence fériée', () => {
  assert.match(ui, /Période de permanence fériée/);
  assert.match(ui, /row\.definitionId === 'CTA-PERMANENCE'\) addHolidayCoverage\(row\)/);
  assert.match(ui, /qvCalendarKind\(mark\) === 'FERIE'/);
  assert.match(css, /has-cta-holiday-coverage/);
  assert.match(css, /is-cta-holiday-coverage/);
});

test('la fiche Programme persiste une obligation préparatoire sans éditer l’événement publié', () => {
  const detail = ui.slice(ui.indexOf('function renderQuoVadisProgrammeFiche'), ui.indexOf('function renderQuoVadisActivites'));
  assert.match(detail, /Préparation QUO VADIS/);
  for (const id of ['qv-programme-date','qv-programme-start','qv-programme-end','qv-programme-lieu','qv-programme-salle','qv-programme-responsable','qv-programme-oi','qv-programme-public']) assert.match(detail, new RegExp(id));
  assert.match(detail, /ne modifie pas l’événement publié/);
  assert.match(quoVadisService, /where programme_id=\$1 and source_ref=\$2/);
  assert.match(quoVadisService, /values \(\$1,'MANUAL',\$2/);
  assert.match(quoVadisService, /canonicalProgrammeItemId/);
  assert.match(quoVadisService, /humanDecision:true/);
  assert.match(quoVadisService, /lifecycleDecision/);
  assert.match(quoVadisService, /CANCEL_YEAR/);
  assert.match(quoVadisService, /DISABLE_PRODUCTION/);
  const update = quoVadisService.slice(quoVadisService.indexOf('async function updateProgrammePreparation'), quoVadisService.indexOf('return { listProgramme'));
  assert.doesNotMatch(update, /update scope_evenements|insert into scope_evenements/);
});

test('la salle absente reste un tiret et les séries JSP restent inchangées', () => {
  assert.match(ui, /return `<option value="">—<\/option>/);
  assert.match(ui, /labels\[value\] \|\| value \|\| '—'/);
  assert.match(ui, /Occurrence \$\{Number\(row\.seriesOccurrenceIndex/);
  assert.match(ui, /Stat\.Com \$\{row\.statCom\}\$\{statComLabel/);
});

test('le public cible canonique remplace MEA et contracte les échelons', () => {
  const labels = L.qvProgrammePublicCatalogue().flatMap((group) => group.items.map((item) => item[1]));
  for (const label of ['Recrue', 'Sapeur DPS', 'Échelon I', 'Échelon IV', 'Candidats C groupe', 'Candidats PAPR', 'Candidats cond PL', 'Candidats cond TP9', 'Machiniste EA', 'Formateurs EA', 'Formateur maison Feu (FMF)', 'Chef piste', 'FOBA 1', 'Antichute', 'OP VPC', 'JSP']) {
    assert.ok(labels.includes(label), label);
  }
  assert.equal(labels.filter((label) => label === 'MEA').length, 0);
  assert.equal(L.qvProgrammePublicLabel('AUTO:5'), 'Machiniste EA');
  assert.equal(L.qvFormatEchelons(['Échelon I', 'Échelon II']), 'Échelon I et II');
  assert.equal(L.qvFormatEchelons(['Échelon II', 'Échelon III', 'Échelon IV']), 'Échelon II à IV');
  assert.equal(L.qvFormatEchelons(['Échelon I', 'Échelon II', 'Échelon III', 'Échelon IV']), 'Échelon I à IV');
  assert.equal(L.qvFormatEchelons(['Échelon I', 'Échelon III']), 'Échelon I et III');
  assert.equal(L.qvFormatPublicLabels(['ECH:I', 'ECH:III', 'ECH:IV', 'FOBA:2']), 'Échelon I et III à IV, FOBA 2');
  assert.match(ui, /qvFormatPublicLabels/);
  assert.deepEqual(L.qvProgrammePublicCatalogue().map((group) => group.group), ['Général', 'Échelons', 'Sections DPS', 'Encadrement', 'Formation', 'PR', 'AUTO', 'FOSPEC', 'JSP']);
  assert.match(quoVadisService, /qvProgrammePublicCatalogue\(\)/);
});

test('les responsables partagent un référentiel et normalisent les variantes non ambiguës', () => {
  assert.deepEqual(L.qvResponsableGroups()[0].slice(0, 2), ['Commandant', 'Quartier-maître']);
  assert.equal(L.qvResponsableCanonique('C FOBA'), 'Chef FOBA');
  assert.equal(L.qvResponsableCanonique('Cdt'), 'Commandant');
  assert.equal(L.qvResponsableCanonique('C DAP'), 'Chef DAP');
  assert.equal(L.qvResponsableCanonique('QM'), 'Quartier-maître');
  assert.equal(L.qvResponsableCanonique('Of auto'), 'Of auto');
  assert.equal(L.qvResponsableCanonique('C site', { domain: 'DPS' }), 'Chef site DPS');
  assert.equal(L.qvResponsableCanonique('Chef site', { domain: 'DPS' }), 'Chef site DPS');
  assert.equal(L.qvResponsableCanonique('C JSP', { domain: 'JSP' }), 'Chef site JSP');
  assert.equal(L.qvResponsableCanonique('C sct', { domain: 'DAP' }), 'Chef section DAP');
  assert.equal(L.qvResponsableCanonique('C sct', { domain: 'DPS' }), 'Chef section DPS');
  assert.equal(L.qvResponsableCanonique('C sct', { domain: 'AUTO' }), 'C sct');
  assert.equal(L.qvResponsableCanonique('Of spéc'), 'Of spéc');
  assert.equal(L.qvResponsableCanonique('Resp mat'), 'Resp mat');
  assert.equal(L.qvResponsableCanonique('Resp mat JSP', { domain: 'JSP' }), 'Resp mat JSP');
  assert.equal(L.qvResponsableCanonique('PrésidentE Codir'), 'PrésidentE Codir');
  assert.match(ui, /qvProgrammeResponsableLabel\(row\)/);
  assert.match(ui, /L\.qvResponsableGroups\(\)/);
  assert.match(quoVadisService, /qvResponsableGroups\(\)\.flat\(\)/);
});

test('l’agenda classe les propositions historiques 2026 et le reliquat ambigu', () => {
  const rows = programme.rows.filter((row) => !row.external);
  const dated = rows.filter((row) => row.startsAt);
  const undated = rows.filter((row) => !row.startsAt);
  const proposed = rows.filter((row) => row.historicalProposal);
  const ids = rows.map((row) => row.id);
  assert.equal(rows.length, 622);
  assert.equal(dated.length, 488);
  assert.equal(undated.length, 134);
  assert.equal(proposed.length, 363);
  assert.equal(programme.historicalEnrichment.dates, 363);
  assert.equal(programme.historicalEnrichment.times, 363);
  assert.equal(dated.length + undated.length, 622);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(ui, /placement: 'proposed'/);
  assert.match(ui, /Activités proposées — date encore à confirmer/);
});

test('TP9000 et les instructions section/demi-section appliquent les règles métier source-backed', () => {
  const tp9000 = programme.rows.filter((row) => /TP9000/i.test(row.label || ''));
  assert.equal(tp9000.length, 30);
  assert.ok(tp9000.every((row) => JSON.stringify(row.ois) === '["G1"]'));
  assert.ok(tp9000.every((row) => JSON.stringify(row.publics) === '["AUTO:2"]'));
  assert.ok(tp9000.every((row) => row.tp9000Rule === 'G1_ONLY_COND_TP9_ONLY'));
  const sectionRows = programme.rows.filter((row) => row.sectionPublicRule === 'MATCH_PERMANENCE_SECTION_PUBLIC_FROM_2026');
  assert.ok(sectionRows.length >= 5);
  assert.ok(sectionRows.every((row) => (row.publics || []).every((code) => /^N0[1-6][ab]$|^N06$/.test(code))));
  assert.match(ui, /qvProgrammeOiSummary/);
  assert.match(ui, /qv-programme-oi-summary/);
  assert.match(css, /qv-programme-edit-pair\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('quatre occurrences DPS identiques en date et heure s’ordonnent G1, C1, B1, B2', () => {
  const desordre = [
    { id: 'occ-zz', date: '2027-02-06', startTime: '07:30', domain: 'DPS', ois: ['B1'], label: 'Instr sct' },
    { id: 'occ-aa', date: '2027-02-06', startTime: '07:30', domain: 'DPS', ois: ['B2'], label: 'Instr sct' },
    { id: 'occ-mm', date: '2027-02-06', startTime: '07:30', domain: 'DPS', ois: ['G1'], label: 'Instr sct' },
    { id: 'occ-bb', date: '2027-02-06', startTime: '07:30', domain: 'DPS', ois: ['C1'], label: 'Instr sct' }
  ];
  const ordonne = desordre.slice().sort(L.compareQvBusinessOrder).map((row) => row.ois[0]);
  assert.deepEqual(ordonne, ['G1', 'C1', 'B1', 'B2']);
  assert.deepEqual(desordre.map((row) => row.ois[0]), ['B1', 'B2', 'G1', 'C1']);
  assert.deepEqual(L.SCOPE_SITE_ORDER.slice(), ['G1', 'C1', 'B1', 'B2', 'Y1', 'Y2', 'Y3', 'Y4']);
  assert.equal(L.qvSiteGroupRank(['B2', 'G1', 'C1']), 0);
  assert.equal(L.qvSiteGroupRank([]), L.SCOPE_SITE_ORDER.length);
});

test('la date et l’horaire restent prioritaires sur l’ordre métier des sites', () => {
  const key = (date, startTime, oi) => ({ id: oi, date, startTime, domain: 'DPS', ois: [oi], label: 'Instr' });
  assert.ok(L.compareQvBusinessOrder(key('2027-02-06', '18:30', 'G1'), key('2027-02-07', '07:30', 'B2')) < 0);
  assert.ok(L.compareQvBusinessOrder(key('2027-02-06', '07:30', 'B2'), key('2027-02-06', '18:30', 'G1')) < 0);
  assert.ok(L.compareQvBusinessOrder(key('2027-02-06', '07:30', 'G1'), key('2027-02-06', '07:30', 'C1')) < 0);
  const sansSite = { id: 'x', date: '2027-02-06', startTime: '07:30', domain: 'DPS', ois: [], label: 'Instr' };
  assert.ok(L.compareQvBusinessOrder(key('2027-02-06', '07:30', 'B2'), sansSite) < 0);
});

test('tableau, vue mensuelle et agenda annuel partagent le même départage métier', () => {
  assert.match(ui, /return L\.compareQvProgrammeRows\(a, b\);/);
  assert.match(ui, /items: \(byDate\[date\] \|\| \[\]\)\.slice\(\)\.sort\(L\.compareQvProgrammeRows\)/);
  assert.match(ui, /group\.rows\.slice\(\)\.sort\(qvProgrammeCompareRows\)/);
  assert.doesNotMatch(ui, /return cmp \? cmp \* dir : String\(a\.id \|\| ''\)\.localeCompare/);
  const brut = [
    { id: 'r-b2', startsAt: '2027-02-06T07:30:00Z', domain: 'DPS', ois: ['B2'], label: 'Instr sct' },
    { id: 'r-g1', startsAt: '2027-02-06T07:30:00Z', domain: 'DPS', ois: ['G1'], label: 'Instr sct' },
    { id: 'r-b1', startsAt: '2027-02-06T07:30:00Z', domain: 'DPS', ois: ['B1'], label: 'Instr sct' },
    { id: 'r-c1', startsAt: '2027-02-06T07:30:00Z', domain: 'DPS', ois: ['C1'], label: 'Instr sct' }
  ];
  assert.deepEqual(brut.slice().sort(L.compareQvProgrammeRows).map((row) => row.ois[0]), ['G1', 'C1', 'B1', 'B2']);
  assert.equal(L.qvProgrammeOrderKey(brut[0]).startTime, '07:30');
});

test('les 9 KICK-OFF multi-OI gardent un ordre stable sans attribution de site inventée', () => {
  const kickOff = programme.rows.filter((row) => /KICK-OFF/i.test(row.label || '') && /INSTR-SCT/i.test(row.id || ''));
  assert.equal(kickOff.length, 9);
  const dates = new Set(kickOff.map((row) => String(row.startsAt || '').slice(0, 10)));
  assert.equal(dates.size, 1);
  assert.ok(kickOff.every((row) => JSON.stringify(L.qvSortOiCodes(row.ois)) === '["G1","C1","B1","B2"]'));
  const keys = kickOff.map((row) => ({ date: String(row.startsAt).slice(0, 10), startTime: '07:30', domain: row.domain, ois: row.ois, label: row.label, id: row.id }));
  const shuffled = keys.slice().reverse().sort(L.compareQvBusinessOrder).map((row) => row.id);
  assert.deepEqual(shuffled, keys.slice().sort(L.compareQvBusinessOrder).map((row) => row.id));
});

test('le glisser-déposer mensuel réutilise l’enregistrement fiche et verrouille le calculé', () => {
  assert.equal(L.qvProgrammeDragLock({ definitionId: 'CTA-PERMANENCE' }), 'CTA_PERMANENCE');
  assert.equal(L.qvProgrammeDragLock({ publishedEventId: 'evt-1' }), 'EVENEMENT_PUBLIE');
  assert.equal(L.qvProgrammeDragLock({ external: true }), 'REFERENCE_EXTERNE');
  assert.equal(L.qvProgrammeDragLock({ id: 'QV27:X' }), '');
  assert.match(L.qvProgrammeDragReason('CTA_PERMANENCE'), /Permanence CTA/);
  assert.match(ui, /data-qv-drag-item="\$\{escapeHtml\(row\.id\)\}"/);
  assert.match(ui, /data-qv-drop-date="\$\{escapeHtml\(group\.date\)\}"/);
  assert.match(ui, /await client\.updateQuoVadisProgrammeItem\(id, qvProgrammeDragPayload\(qv, row, nextDate\)\)/);
  assert.match(ui, /oiCodes: \[\.\.\.new Set\(row\.ois \|\| \[\]\)\]/);
  assert.match(ui, /publicCodes: \[\.\.\.new Set\(row\.publics \|\| \[\]\)\]/);
  // Le glisser doit rester possible : pas de sélection de texte qui intercepte le dragstart.
  assert.match(css, /\.qv-programme-month-table tr\.is-draggable,\.qv-programme-table tr\.is-draggable\{cursor:grab;-webkit-user-select:none;user-select:none\}/);
  assert.match(css, /\.qv-programme-month-table tr\.is-drop-target td,\.qv-programme-table tr\.is-drop-target td\{/);
});

test('les lignes source 910 à 913 démontrent l’ordre G1, C1, B1, B2 sur données réelles', () => {
  const ids = ['qv-source-910', 'qv-source-911', 'qv-source-912', 'qv-source-913'];
  const kickOff = ids.map((id) => programme.rows.find((row) => row.id === id));
  assert.ok(kickOff.every(Boolean));
  assert.ok(kickOff.every((row) => row.label === 'Instr demi-sct - KICK-OFF'));
  assert.equal(new Set(kickOff.map((row) => row.startsAt)).size, 1);
  assert.equal(String(kickOff[0].startsAt).slice(0, 16), '2027-02-06T07:30');
  assert.deepEqual(kickOff.map((row) => (row.ois || [])[0]), ['G1', 'C1', 'B2', 'B1']);
  assert.deepEqual(kickOff.slice().sort(L.compareQvProgrammeRows).map((row) => (row.ois || [])[0]), ['G1', 'C1', 'B1', 'B2']);
  assert.deepEqual(kickOff.slice().reverse().sort(L.compareQvProgrammeRows).map((row) => (row.ois || [])[0]), ['G1', 'C1', 'B1', 'B2']);
});

test('la règle G1 lundi vise l’instruction de section PIONNIER CSU-nvb, pas la demi-section', () => {
  const dayOf = (row) => new Date(row.startsAt).getUTCDay();
  const slot = (row) => `${String(row.startsAt).slice(11, 16)}-${String(row.endsAt).slice(11, 16)}`;
  const pionnierSct = programme.rows.filter((row) => row.label === 'Instr sct - PIONNIER CSU-nvb' && row.startsAt);
  assert.equal(pionnierSct.length, 5);
  assert.ok(pionnierSct.every((row) => dayOf(row) === 1 && slot(row) === '19:15-22:00' && JSON.stringify(row.ois) === '["G1"]'));
  const demiG1 = programme.rows.filter((row) => /^Instr demi-sct/.test(row.label || '') && row.startsAt && JSON.stringify(row.ois) === '["G1"]');
  assert.equal(demiG1.length, 21);
  assert.ok(demiG1.every((row) => dayOf(row) === 6));
  const abcSct = programme.rows.filter((row) => row.label === 'Instr sct - ABC');
  assert.ok(abcSct.length > 0 && abcSct.every((row) => JSON.stringify(row.ois) === '["G1"]'));
  assert.equal(ctaRules.ANCHOR_DATE, '2026-02-13');
  assert.equal(ctaRules.instructionPublicForDate('2027-03-19', 'G1', 'section', false), 'N03');
  assert.equal(ctaRules.instructionPublicForDate('2027-03-19', 'G1', 'section', true), 'N04');
});

test('le Programme d’une année future est consultable dans la même interface', () => {
  assert.match(ui, /function qvProgrammeYearChoices\(\) \{\s*return \[2027, 2028\];/);
  assert.match(ui, /qvProgrammeYearChoices\(\)\.map\(\(year\) => `<option value="\$\{year\}" \$\{qvProgrammeYear\(\) === year \? 'selected' : ''\}/);
  assert.match(ui, /document\.getElementById\('qv-filter-year'\)\?\.addEventListener\('change'/);
  assert.match(ui, /if \(\['programme', 'programme-fiche'\]\.includes\(r\.qvView\) && Number\(r\.qvAnnee\) !== 2027\) jobs\.push\(loadQuoVadisProgrammeYear\(r\.qvAnnee\)\)/);
  assert.match(ui, /<h2>Programme \$\{escapeHtml\(String\(qvProgrammeYear\(\)\)\)\}<\/h2>/);
  assert.doesNotMatch(ui, /<h2>Programme 2027<\/h2>/);
  assert.match(ui, /const monthKey = filters\.month && filters\.month !== 'tous' \? filters\.month : `\$\{qvProgrammeYear\(\)\}-01`/);
  assert.match(ui, /\$\{year === 2027 \? '' : `\?annee=\$\{year\}`\}/);
  const programmeViews = ui.match(/function renderQuoVadisProgramme\(/g) || [];
  assert.equal(programmeViews.length, 1);
  assert.deepEqual([2026, 2027, 2028].map((year) => L.parseHash(`#/quo-vadis/programme?annee=${year}`).qvAnnee), [2026, 2027, 2028]);
});

console.log(`SCOPE QV FINALISATION LOCALE: ${passed}/${passed} tests PASS`);
