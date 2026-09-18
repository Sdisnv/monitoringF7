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
const service = read('netlify/lib/_scope-quo-vadis-service.js');
const ui = read('assets/js/scope-ui.js');
const css = read('assets/css/scope.css');
const logicSrc = read('assets/js/scope-ui-logic.js');
const migration = read('database/migrations/20260917_scope_quo_vadis_moa_recovery_1.sql');
const qvUi = ui.slice(ui.indexOf('function quoVadisData'), ui.indexOf('function render()'));

function loadLogic() {
  const sandbox = { window: {}, document: { addEventListener() {} }, console };
  sandbox.window = sandbox;
  vm.runInNewContext(logicSrc, sandbox);
  return sandbox.window.ScopeUiLogic;
}

const L = loadLogic();

function row(overrides) {
  return Object.assign({
    evenement_id: overrides.evenement_id || `evt-${Math.random().toString(16).slice(2)}`,
    date: '2026-03-12',
    domaine_code: 'DPS',
    sous_domaine_code: 'C1',
    libelle: 'Instruction',
    statut: 'PLANIFIE',
    hidden_at: null,
    salle: '',
    statcom_code: null,
    session_index: 1
  }, overrides);
}

for (const src of [schema, service, migration]) {
  assert.ok(!/\b(drop|truncate)\s+table\b/i.test(src), 'aucun DROP/TRUNCATE métier');
  assert.ok(!/delete\s+from\s+scope_(evenements|attendus|participations|personnes|affectations)\b/i.test(src), 'aucune suppression 2026');
  assert.ok(!/insert into scope_(evenements|attendus|participations)\b/i.test(src), 'aucune écriture événement/présence/participation');
}

assert.ok(/LATEST_SCOPE_SCHEMA_VERSION = 'scope-quo-vadis-moa-recovery-1'/.test(schema));
assert.ok(/migrateQuoVadisMoaRecovery1/.test(schema));
assert.ok(/PLANIF-FOCO/.test(schema) && /PLANIF-FOCO/.test(migration));
assert.ok(/interpretHistoricalProgramme/.test(service));
assert.ok(/resetGeneratedDrafts/.test(service));
assert.ok(!/if\s*\(\s*(title|libelle)\s*===\s*['"]Test recette 4['"]/.test(service + read('netlify/lib/_scope-quo-vadis-coverage.js')));
assert.ok(/isGenericNumberedExercise/.test(service));
assert.ok(/QUO-VADIS-MOA-RECOVERY-1/.test(service));

assert.ok(/Familles de formation/.test(qvUi));
assert.ok(/Séances/.test(qvUi));
assert.ok(/Dates annoncées/.test(qvUi));
assert.ok(/vraies décisions humaines/.test(qvUi));
assert.ok(/qvAgendaDayAnchorId/.test(qvUi) || /qv-agenda-day-/.test(qvUi));
assert.ok(/Positionnée/.test(qvUi));
assert.ok(/renderPreservingInput\('qv-filter-q'\)/.test(ui));
assert.ok(/has-vacation/.test(css));
assert.strictEqual(L.formatUiDate('2027-03-07'), '07.03.2027');

const prRows = [1, 2, 3, 4, 5, 6].map((session) => row({
  evenement_id: `pr-1-${session}`,
  domaine_code: 'PR',
  sous_domaine_code: 'ABC',
  libelle: `PR 1.${session}`,
  date: `2026-08-0${session}`,
  statcom_code: 'PR-ABC',
  salle: 'Caserne G1',
  session_index: session,
  pr_exercise_group_key: 'NO_CYCLE:PR-ABC:1'
}));
const autoRows = [1, 2, 3, 4].map((session) => row({
  evenement_id: `auto-1-${session}`,
  domaine_code: 'AUTO',
  sous_domaine_code: 'CAR',
  libelle: `AUTO CAR 1.${session}`,
  date: `2026-09-0${session}`,
  statcom_code: 'AUTO-CAR',
  salle: 'Caserne G1',
  session_index: session
}));
const dapRows = [1, 2, 3].map((session) => row({
  evenement_id: `dap-1-${session}`,
  domaine_code: 'DAP',
  sous_domaine_code: 'Y1',
  libelle: `Formation groupée DAP 1.${session}`,
  date: `2026-05-0${session}`,
  statcom_code: 'DAP-FG',
  salle: 'Caserne C1',
  session_index: session,
  mode_session: 'MULTI',
  exercice_id: 'ex-dap-fg-1',
  nombre_sessions_attendu: 3
}));

const representative = [
  row({
    evenement_id: 'dps-feu',
    libelle: 'C1 — FEU',
    date: '2026-06-06',
    statcom_code: 'DPS-FEU',
    salle: 'Caserne C1'
  }),
  row({
    evenement_id: 'dps-feu-2',
    libelle: 'Instr. section — FEU',
    date: '2026-06-13',
    statcom_code: 'DPS-FEU',
    salle: 'Caserne C1'
  }),
  ...prRows,
  ...autoRows,
  ...dapRows,
  row({
    evenement_id: 'jsp-1',
    domaine_code: 'JSP',
    sous_domaine_code: 'JSP',
    libelle: 'Exercice JSP 1',
    date: '2026-02-03',
    salle: 'Local JSP'
  }),
  row({
    evenement_id: 'jsp-2',
    domaine_code: 'JSP',
    sous_domaine_code: 'JSP',
    libelle: 'Exercice JSP 2',
    date: '2026-02-10',
    salle: 'Local JSP'
  }),
  row({
    evenement_id: 'foba-1',
    domaine_code: 'FOBA',
    sous_domaine_code: 'FOBA 1',
    libelle: 'FOBA 1',
    date: '2026-04-09',
    statcom_code: 'FOBA-1',
    salle: 'Caserne G1'
  }),
  row({
    evenement_id: 'revue',
    libelle: 'Revue des effectifs',
    date: '2026-03-01',
    sous_domaine_code: 'G1'
  }),
  row({
    evenement_id: 'optionnelle',
    libelle: 'Assemblée générale optionnelle',
    date: '2026-11-07',
    sous_domaine_code: 'G1',
    salle: 'Caserne G1'
  }),
  row({
    evenement_id: 'cursus',
    libelle: 'CI DPS Module 3',
    date: '2026-09-12',
    sous_domaine_code: 'G1'
  }),
  row({
    evenement_id: 'recette',
    libelle: 'Test recette 4',
    date: '2026-01-20',
    sous_domaine_code: 'G1'
  }),
  row({
    evenement_id: 'annule',
    libelle: 'Instruction annulée',
    statut: 'ANNULE',
    date: '2026-01-08'
  })
];

const report = coverage.interpretHistoricalProgramme(representative, 2027);

assert.ok(report.sourceLines === representative.length, '1. lignes source');
const annual = report.activities.find((item) => item.title === 'Instr. section — FEU' && item.oi === 'C1');
assert.ok(annual && annual.kind === 'ANNUELLE' && annual.propose2027, '1. activité annuelle simple');
assert.ok(annual.sessionCount === 1 || annual.sessions.length >= 1);

const pr = report.activities.find((item) => item.domain === 'PR');
assert.ok(pr, '2/3. PR consolidé manquant');
assert.strictEqual(report.activities.filter((item) => item.domain === 'PR').length, 1, '3. une seule activité PR');
assert.ok(pr.sessionCount >= 6 && pr.sessions.length >= 6, `3. PR sessions ${pr.sessionCount}`);
assert.ok(!report.activities.some((item) => /PR 1\.\d/.test(item.title)), '3. PR 1.x ne doivent plus être des activités distinctes');

const auto = report.activities.find((item) => item.domain === 'AUTO');
assert.ok(auto && report.activities.filter((item) => item.domain === 'AUTO').length === 1, '4. AUTO consolidé');
assert.ok(auto.sessionCount >= 4 && auto.sessions.length >= 4, '4. AUTO sessions');

const dap = report.activities.find((item) => item.domain === 'DAP');
assert.ok(dap && report.activities.filter((item) => item.domain === 'DAP').length === 1, '2. DAP consolidé');
assert.ok(dap.sessionCount >= 3, '2. DAP sessions');

assert.ok(report.cyclicDeferred >= 1, '5. cyclique 2026 non échue');
assert.ok(!report.activities.some((item) => item.kind === 'CYCLIQUE' && /Revue/.test(item.title)), '5. revue 2026 non proposée en 2027');

const cyclicDue = coverage.interpretHistoricalProgramme([
  row({ libelle: 'Revue des effectifs', date: '2022-03-01', sous_domaine_code: 'G1', salle: 'Caserne G1' })
], 2027);
assert.ok(cyclicDue.activities.some((item) => item.kind === 'CYCLIQUE' && item.propose2027), '6. cyclique échue proposée');
assert.strictEqual(cyclicDue.cyclicDue, 1);

const optional = report.activities.find((item) => item.kind === 'OPTIONNELLE');
assert.ok(optional, '7. optionnelle');
const optionalArb = coverage.needsHumanArbitration(optional);
assert.ok(optionalArb.needed && /reconduction à confirmer/i.test(optionalArb.reason), '7. optionnelle à confirmer');

assert.ok(report.cursusDeferred >= 1, '8. cursus 2026 différé');
assert.ok(report.activities.every((item) => item.kind !== 'CURSUS'), '8. cursus non recopié comme annuelle');
assert.ok(/Début du cursus 2026/.test(qvUi) && /Début du cursus 2027/.test(qvUi) && /Année 1/.test(qvUi) && /Année 2/.test(qvUi), '8. vocabulaire cursus');
assert.ok(/logical_year = 2/.test(service) && /logical_year = 1/.test(service), '8. cohorte année 1 / année 2');

assert.ok(coverage.isRecipeOrTechnicalNoise('Test recette 4'), '9. recette identifiable');
assert.ok(!coverage.isRecipeOrTechnicalNoise('Module 10 - test final'), '9. test final conservé');
assert.ok(report.recipeExcluded >= 1, '9. exclusion tracée');
assert.ok(!report.activities.some((item) => /recette/i.test(item.title)), '9. recette absente du programme');
assert.ok(report.traces.some((item) => /Test recette 4/.test(item.title) && item.classification === 'exclu' && item.reason), '9. motif d’exclusion');

assert.strictEqual(annual.oi, 'C1', '10. OI conservé');
assert.ok(!(/C1/.test(annual.title) && /FEU/.test(annual.title) && annual.title.includes('C1 —')), '10/12. OI non répété');
assert.ok(!annual.title.includes('/'), '12. pas de slash artificiel');
assert.strictEqual(annual.statcomCode, 'DPS-FEU', '11. STAT.COM conservé');
assert.strictEqual(pr.statcomCode, 'PR-ABC', '11. STAT.COM PR');
assert.strictEqual(pr.specialisation, 'ABC', '14. spécialisation PR');

const lieux = [
  { lieuId: 'lieu-c1', nomCourt: 'Caserne C1', oiCode: 'C1' },
  { lieuId: 'lieu-g1', nomCourt: 'Caserne G1', oiCode: 'G1' }
];
const resolved = coverage.resolveUsualLieu(annual, lieux);
assert.ok(resolved.lieu && resolved.lieu.lieuId === 'lieu-c1', '12. lieu historique/caserne');
const arbAnnual = coverage.needsHumanArbitration(annual, {
  lieuId: resolved.lieu.lieuId,
  lieuResolved: true
});
assert.strictEqual(arbAnnual.needed, false, `15. annuelle déterministe à arbitrer: ${arbAnnual.reason}`);

const saturday = coverage.pickProposalSlot({
  year: 2027,
  month: 6,
  domain: 'DPS',
  activity: { instructionKind: 'section', oi: 'C1' },
  calendarRows: []
});
assert.strictEqual(saturday.weekday, 'SATURDAY', '13. samedi section C1/B1/B2');
assert.strictEqual(saturday.dayClass, 'PREFERE');

const b1 = coverage.pickProposalSlot({
  year: 2027,
  month: 6,
  domain: 'DPS',
  activity: { instructionKind: 'section', oi: 'B1' },
  calendarRows: []
});
assert.strictEqual(b1.weekday, 'SATURDAY', '13. samedi B1');

const forbidden = coverage.pickProposalSlot({
  year: 2027,
  month: 1,
  domain: 'FOBA',
  activity: {},
  calendarRows: [{ jour: '2027-01-07', type_jour: 'FERIE', libelle: 'Jeûne test' }]
});
assert.ok(forbidden);
assert.notStrictEqual(forbidden.dayClass, 'INTERDIT', '14. jour interdit jamais proposé');
assert.notStrictEqual(forbidden.weekday, 'FRIDAY', '14. vendredi FOBA interdit');
assert.notStrictEqual(forbidden.date, '2027-01-07', '14. férié non proposé');

const conflict = coverage.needsHumanArbitration(annual, {
  lieuResolved: true,
  announcedClash: true,
  conflictReason: 'Conflit avec une date annoncée'
});
assert.ok(conflict.needed && /Conflit/.test(conflict.reason), '16. conflit réel avec motif');

assert.ok(coverage.isGenericNumberedExercise('Exercice JSP 1'));
assert.ok(coverage.isGenericNumberedExercise('Exercice FOBA 1'));
assert.ok(!report.activities.some((item) => coverage.isGenericNumberedExercise(item.title)), '5. pas de série numérotée artificielle');
const jsp = report.activities.filter((item) => item.domain === 'JSP');
assert.strictEqual(jsp.length, 1, 'Exercice JSP 1/2 consolidés');

assert.ok(report.generable === report.activities.length, 'générable = activités 2027, pas les lignes reconnues');
assert.ok(report.generable < report.sourceLines, 'une ligne reconnue n’est pas une activité 2027');
assert.ok(report.sessions >= 6 + 3 + 2, 'sessions consolidées');

const comparison = {
  avantCoverage1: {
    proposed: 26,
    note: 'sous-ensemble catalogue codé en dur, historique 2026 ignoré'
  },
  apresCoverage1: {
    sourceLines: 1100,
    recognized: 953,
    generable: 949,
    proposedUi: 98,
    toArbitrate: 98,
    note: 'PASS technique 1:1 ligne→activité, NOK métier'
  },
  apresMoaRecovery1: {
    sourceLines: report.sourceLines,
    recognized: report.recognized,
    recognizedActivities: report.recognizedActivities,
    sessions: report.sessions,
    proposed: report.proposed,
    optionalCount: report.optionalCount,
    cyclicDeferred: report.cyclicDeferred,
    cursusDeferred: report.cursusDeferred,
    recipeExcluded: report.recipeExcluded,
    excluded: report.excluded,
    ignored: report.ignored,
    deterministicAnnual: arbAnnual.needed === false,
    prActivities: 1,
    autoActivities: 1,
    dapActivities: 1
  }
};

console.log('scope-quo-vadis-moa-recovery-1-tests: ok');
console.log(JSON.stringify(comparison, null, 2));
