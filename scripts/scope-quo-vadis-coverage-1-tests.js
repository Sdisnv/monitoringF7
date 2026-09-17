#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const coverage = require(path.join(root, 'netlify/lib/_scope-quo-vadis-coverage.js'));

const schema = read('netlify/lib/_scope-schema.js');
const migration = read('database/migrations/20260917_scope_quo_vadis_coverage_1.sql');
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const fn = read('netlify/functions/scope.js');
const api = read('assets/js/scope-api.js');
const ui = read('assets/js/scope-ui.js');
const logicSrc = read('assets/js/scope-ui-logic.js');
const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

for (const src of [schema, migration, service]) {
  assert.ok(!/\b(drop|truncate)\s+table\b/i.test(src), 'aucun DROP/TRUNCATE métier');
  assert.ok(!/delete\s+from\s+scope_(evenements|attendus|participations|personnes|affectations)\b/i.test(src), 'aucune suppression 2026');
  assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(src), 'aucune écriture événement/présence/participation');
}

assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-moa-recovery-1'/.test(schema));
assert.ok(/migrateQuoVadisCoverage1/.test(schema));
assert.ok(/migrateQuoVadisMoaRecovery1/.test(schema));
assert.ok(/scope_quo_vadis_cursus_step_programmes/.test(schema) && /scope_quo_vadis_cursus_step_programmes/.test(migration));
assert.ok(/PLANIF-DPS/.test(schema) && /PLANIF-JSP/.test(schema) && /PLANIF-FOCA/.test(schema) && /PLANIF-FOSPEC/.test(schema));
assert.ok(/HISTORIQUE/.test(schema) && /CYCLIQUE/.test(schema) && /OPTIONNELLE/.test(schema));
assert.ok(/VALIDATION/.test(schema) && /VALIDE/.test(schema));

assert.ok(/generateHistoricalObligations/.test(service), 'génération depuis historique 2026 manquante');
assert.ok(/pickProposalSlot/.test(service) && /summarizeCoverage/.test(service));
assert.ok(/Instr\. section —/.test(service), 'libellé instruction section manquant');
assert.ok(/samedi préféré/.test(service), 'règle samedi C1/B1/B2 manquante');
assert.ok(/setProgrammeStatus/.test(service) && /setCursusStepSelection/.test(service));
assert.ok(/Date annoncée/.test(service));
assert.ok(/operationalEventsCreated:\s*0/.test(service));
assert.ok(/limit 120/.test(service) === false, 'l’historique 2026 ne doit plus être tronqué à 120 lignes');

assert.ok(/\/quo-vadis\/programmes\/:annee\/statut/.test(fn));
assert.ok(/\/quo-vadis\/programmes\/:annee\/cursus-steps/.test(fn));
assert.ok(/setQuoVadisProgrammeStatus/.test(api) && /setQuoVadisCursusStep/.test(api));

assert.ok(/Dates annoncées/.test(qvUi));
assert.ok(/Début du cursus 2026/.test(qvUi) && /Début du cursus 2027/.test(qvUi));
assert.ok(/Année 1/.test(qvUi) && /data-qv-cursus-step/.test(qvUi));
assert.ok(/Préparation en cours/.test(qvUi) && /Validation en cours/.test(qvUi) && /Validé/.test(qvUi));
assert.ok(/renderQuoVadisCoverage/.test(ui));
assert.ok(/Stat\.Com/.test(qvUi));
assert.ok(/typeof active.value === 'string'/.test(ui), 'recherche QV: focus via value IDL, pas hasOwnProperty');
assert.ok(!/hasOwnProperty\.call\(active,\s*'value'\)/.test(ui), 'bug focus recherche encore présent');
assert.ok(/event-list-q/.test(ui) && /setSelectionRange/.test(ui));
assert.ok(L.formatUiDate('2027-03-07') === '07.03.2027', 'format UI JJ.MM.AAAA manquant');
assert.ok(L.formatDate('2027-03-07') === '07.03.2027');
assert.ok(L.toIsoDate('07.03.2027') === '2027-03-07');
assert.ok(L.toIsoDate('07/03/2027') === '2027-03-07', 'saisie slash encore acceptée en entrée');
assert.ok(!ui.includes('placeholder="JJ/MM/AAAA"'));
assert.ok(ui.includes('placeholder="JJ.MM.AAAA"'));

const rows = [];
for (let i = 0; i < 1100; i += 1) {
  const domains = ['DPS', 'DAP', 'FOBA', 'JSP', 'PR'];
  const domain = domains[i % domains.length];
  let libelle = `Instruction annuelle ${domain} ${Math.floor(i / 5)}`;
  if (i % 50 === 0) libelle = 'Revue des effectifs';
  if (i % 45 === 0) libelle = 'CI DPS Module 3';
  if (i % 17 === 0 && domain === 'DPS') libelle = 'C1 — FEU';
  if (i % 19 === 0 && domain === 'DPS') libelle = 'Instr. demi-section — ABC';
  rows.push({
    evenement_id: `evt-${i}`,
    date: `2026-0${(i % 9) + 1}-07`,
    domaine_code: i % 80 === 0 ? '' : domain,
    sous_domaine_code: i % 3 === 0 ? 'C1' : (i % 3 === 1 ? 'B1' : 'G1'),
    libelle,
    session_index: i % 13 === 0 ? 2 : 1,
    hidden_at: i % 220 === 0 ? '2026-12-01' : null,
    statut: i % 180 === 0 ? 'ANNULE' : 'PLANIFIE',
    statcom_code: i % 21 === 0 ? 'SC-TEST' : null
  });
}

const report = coverage.summarizeCoverage(rows, 2027);
assert.strictEqual(report.sourceLines, 1100);
assert.ok(report.traces.length === 1100, 'chaque ligne source doit avoir une trace');
assert.ok(report.traces.every((row) => row.reason && row.conserved), 'aucune exclusion silencieuse');
assert.ok(report.recognized > 26, `reconnu trop bas: ${report.recognized}`);
assert.ok(report.generable > 26, `générable trop bas: ${report.generable}`);
assert.ok(report.duplicated >= 0 && report.sessions >= 0 && report.excluded >= 0);
assert.ok(new Set(report.activities.map((row) => row.domain)).size >= 3, 'plusieurs domaines attendus');
assert.ok(report.activities.every((row) => row.kind !== 'CURSUS'), 'cursus ne doit pas être recopié comme activité annuelle');
assert.ok(!report.activities.some((row) => row.kind === 'CYCLIQUE'), 'revue 5 ans ne doit pas être reproduite en 2027');
assert.ok(report.cyclicDeferred > 0, 'activités cycliques non tracées');
assert.ok(report.cursusDeferred > 0, 'cursus non tracé');
assert.ok(report.activities.some((row) => row.title === 'Instr. section — FEU'), 'normalisation instruction section manquante');
assert.ok(!report.activities.some((row) => /^C1 — FEU$/.test(row.title)), 'OI ne doit plus être répété dans le libellé');

const sundayMonth = coverage.pickProposalSlot({ year: 2027, month: 8, domain: 'DPS', activity: {}, calendarRows: [] });
assert.ok(sundayMonth, 'aucune proposition août 2027');
assert.notStrictEqual(sundayMonth.weekday, 'SUNDAY', 'dimanche déconseillé ne doit pas être privilégié');
assert.strictEqual(sundayMonth.dayClass, 'PREFERE');
assert.strictEqual(sundayMonth.weekday, 'THURSDAY');

const saturday = coverage.pickProposalSlot({
  year: 2027,
  month: 6,
  domain: 'DPS',
  activity: { instructionKind: 'section', oi: 'C1' },
  calendarRows: []
});
assert.ok(saturday);
assert.strictEqual(saturday.weekday, 'SATURDAY', 'instruction section C1 doit préférer le samedi');
assert.strictEqual(saturday.dayClass, 'PREFERE');

const forbidden = coverage.pickProposalSlot({
  year: 2027,
  month: 1,
  domain: 'FOBA',
  activity: {},
  calendarRows: [{ jour: '2027-01-07', type_jour: 'FERIE', libelle: 'Test' }]
});
assert.ok(!forbidden || forbidden.dayClass !== 'INTERDIT');

const kind = coverage.activityKindFromRow({ libelle: 'Revue des effectifs' }, 'Revue des effectifs');
assert.strictEqual(kind.kind, 'CYCLIQUE');
assert.strictEqual(kind.periodicityYears, 5);
assert.strictEqual(coverage.nextDueYear(2026, 5), 2031);

console.log('scope-quo-vadis-coverage-1-tests: ok');
console.log(JSON.stringify({
  sourceLines: report.sourceLines,
  recognized: report.recognized,
  duplicated: report.duplicated,
  sessions: report.sessions,
  excluded: report.excluded,
  ignored: report.ignored,
  previouslyIgnored: report.previouslyIgnored,
  generable: report.generable,
  cursusDeferred: report.cursusDeferred,
  cyclicDeferred: report.cyclicDeferred
}));
