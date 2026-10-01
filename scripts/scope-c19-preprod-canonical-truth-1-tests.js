'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const canonical = require('./scope-c19-preprod-canonical-truth-1');

const report = canonical.buildReport();
const app = fs.readFileSync(path.join(__dirname, 'scope-c19-ux-recette/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, 'scope-c19-ux-recette/styles.css'), 'utf8');
const preview = fs.readFileSync(path.join(__dirname, 'scope-c19-ux-recette/preprod-data.js'), 'utf8');
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('01 extrait exactement les 87 codes du PDF officiel', () => {
  assert.equal(report.statCom.pdf.displayedCount, 87);
  assert.equal(report.statCom.pdf.extractedCount, 87);
  assert.equal(new Set(report.statCom.pdf.rows.map((row) => row.code)).size, 87);
});
test('02 réconcilie exactement le PDF 87 et SCOPE 91', () => {
  assert.equal(report.statCom.diff.common, 87);
  assert.deepEqual(report.statCom.diff.pdfOnly, []);
  assert.deepEqual(report.statCom.diff.scopeOnly, ['010JB1', '010JC1', '010JG1', 'COURJSP']);
  assert.deepEqual(report.statCom.diff.divergences, []);
});
test('03 trace les quatre extensions JSP post-export', () => {
  assert.equal(report.statCom.extensions.length, 4);
  assert(report.statCom.extensions.every((row) => row.origin === "QUO VADIS '26" && row.validFrom === '2026-01-01' && row.evidence.length === 3));
});
test('04 maintient la succession 010JY3 vers 010JC1', () => {
  assert.deepEqual(report.statCom.succession, { sourceCode: '010JY3', canonicalCode: '010JC1', effectiveFrom: '2026-01-01', sourceRole: 'HISTORICAL_PROVENANCE', targetRole: 'CANONICAL_POST_2026' });
});
test('05 autorise le Stat.Com vide externe et détecte le manque SDIS', () => {
  assert.equal(report.missingStatCom.externalAccepted, 26);
  assert.equal(report.missingStatCom.recoveredFromHistory, 1);
  assert.equal(report.missingStatCom.sdisMissing, 12);
  assert.match(report.missingStatCom.rule, /extérieure/);
});
test('06 canonise le Stat.Com EMSEA démontré par le classeur source', () => {
  assert.equal(report.emsea.businessCode, 'EMSEA');
  assert.equal(report.emsea.canonicalLabel, 'Séance État-major');
  assert.equal(report.emsea.statCom, 'EMSEA');
  assert.match(report.emsea.statComConclusion, /11 lignes du classeur/);
  assert.equal(report.findings.trueMoaArbitrations.some((row) => /EMSEA/i.test(JSON.stringify(row))), false);
});
test('07 démontre onze occurrences historiques et le mardi prioritaire', () => {
  assert.equal(report.emsea.historicalOccurrences, 11);
  assert.equal(report.emsea.weekdays.mardi, 6);
  assert.equal(report.emsea.placementRule.TUESDAY, 'PRIORITY');
  assert.equal(report.emsea.placementRule.automaticFinalDate, false);
});
test('08 complète les onze occurrences 2027 sans date inventée', () => {
  const rows = report.program.filter((row) => row.definitionCode === report.emsea.sourceDefinitionId);
  assert.equal(rows.length, 11);
  assert.equal(rows.filter((row) => row.isoDate).length, 2);
  assert.equal(rows.filter((row) => row.status === 'A_POSITIONNER').length, 9);
  assert(rows.every((row) => row.businessCode === 'EMSEA' && row.statCom === 'EMSEA' && row.domain === 'CMDT' && row.family === '' && row.ois.includes('SDIS')));
});
test('09 retrouve et vérifie les sources CTA multi-années', () => {
  assert.deepEqual(report.cta.search.yearsFound, [2021, 2023, 2024, 2025, 2027]);
  assert.equal(report.cta.sources.length, 5);
  assert.equal(Object.values(report.cta.validations).every((row) => row.pass), true);
  assert(report.cta.transitionTable.some((row) => row.year === '2023→2024'));
  assert(report.cta.transitionTable.some((row) => row.year === '2026→2027'));
});
test('10 reconstruit les 53 semaines CTA 2027', () => {
  assert.equal(report.cta.schedule2027.length, 53);
  assert.equal(report.cta.schedule2027[0].date, '2027-01-01');
  assert.equal(report.cta.schedule2027.at(-1).date, '2027-12-31');
  assert.deepEqual(report.cta.schedule2027[0].G1.reinforcements, ['N05', 'N01', 'N02']);
  assert.equal(report.cta.schedule2027[0].B2.service, 'N03');
});
test('11 conserve les sections, la réserve et les capacités canoniques', () => {
  assert.deepEqual(report.cta.organisation.G1, ['N01', 'N02', 'N03', 'N04', 'N05', 'N06']);
  assert.equal(report.cta.organisation.reserve.section, 'N06');
  assert.equal(report.cta.organisation.reserve.public, false);
  assert.equal(report.cta.capacities.G1.sectionMaximum, 15);
  assert.equal(report.cta.capacities.G1.halfSectionMaximum, 8);
  assert.equal(report.cta.capacities.C1, null);
  assert.equal(report.cta.capacities.B1, null);
  assert.equal(report.cta.capacities.B2, null);
});
test('12 attache le tournus exact aux 53 permanences', () => {
  const rows = report.program.filter((row) => row.definitionCode === 'CTA-PERMANENCE');
  assert.equal(rows.length, 53);
  assert(rows.every((row) => row.ctaAssignments && row.ctaAssignments.G1 && row.ctaAssignments.C1 && row.ctaAssignments.B1 && row.ctaAssignments.B2));
});
test('13 laisse les permanences primer sur le calendrier protégé', () => {
  assert.equal(report.calendar.permanenceOverridesProtectedDays, true);
  assert(report.calendar.edgeTests.every((row) => row.ordinaryAllowed === false && row.permanenceAllowed === true));
});
test('14 préserve les règles FOBA et C FOBA', () => {
  assert.match(report.foba.dps, /FOBA1 N → FOBA2/);
  assert.match(report.foba.dap, /fin du parcours/);
  assert.equal(report.foba.responsibleCanonical, 'C FOBA');
  assert.equal(report.foba.inconsistencies, 0);
});
test('15 prouve sept chaînes de workflow uniques', () => {
  assert.deepEqual(report.workflowProof.map((row) => row.key), ['DPS', 'DAP', 'JSP', 'PR', 'FOBA', 'CTA', 'EMSEA']);
  assert(report.workflowProof.every((row) => row.found && row.definitionId && row.annualNeedId && row.occurrenceId && row.sessionId && row.provenance));
});
test('16 enrichit chaque objet avec sa chaîne d’identité', () => {
  assert.equal(report.coherence.allIdentityChainsComplete, true);
  assert(report.program.every((row) => Object.hasOwn(row, 'activityId') && Object.hasOwn(row, 'statCom') && Object.hasOwn(row, 'entryService')));
});
test('17 réconcilie les 613 objets antérieurs sans perte', () => {
  assert.equal(report.reconciliation613.length, 613);
  assert.equal(report.coherence.reconciliationLosses, 0);
  assert(report.reconciliation613.every((row) => row.destinationObjectId && row.destination && row.justification));
});
test('18 explique exactement la nouvelle volumétrie', () => {
  assert.equal(report.volume.definitions, 345);
  assert.equal(report.volume.occurrences, 612);
  assert.equal(report.volume.programObjects, 622);
  assert.equal(report.volume.datedEvents, 125);
  assert.equal(report.volume.atPosition, 488);
  assert.deepEqual(report.volume.variation, { occurrences: 9, programObjects: 9, datedEvents: 0, atPosition: 9, reason: 'Ajout des 9 occurrences EMSEA annuelles manquantes, conservées sans date finale.' });
  assert.equal(report.controls.volumeEquation, '125+488+3+6=622');
});
test('19 ne crée aucun P1 ni nouveau P2 canonique', () => {
  assert.deepEqual(report.findings.p1, []);
  assert.deepEqual(report.findings.p2, []);
  assert.equal(report.verdict, 'PASS');
});
test('20 sépare socle canonique 87 et référentiel opérationnel 91 dans la preview', () => {
  assert.match(preview, /statComCanonicalCodes/);
  assert.match(preview, /statComExtensions/);
  assert.equal(report.statCom.governance.baselineCount, 87);
  assert.equal(report.statCom.governance.operationalCount, 91);
});
test('21 impose le titre dynamique ASCII de l’écran 11', () => {
  assert.match(app, /"QUO VADIS '"\+String\(state\.agendaYear/);
  assert.doesNotMatch(app, /QUO VADIS ’/);
});
test('22 respecte la sémantique des marqueurs 5x5', () => {
  assert.match(css, /has-events:not\(\.holiday\):not\(\.vacation\):not\(\.announced\) i\{display:none\}/);
  assert.match(css, /has-events i\{display:block;right:3px;bottom:3px;width:5px;height:5px/);
  assert.match(css, /\.year-day\.announced::after\{display:none\}/);
});
test('23 conserve l’UX conflit et les contrôles date/heure', () => {
  assert.match(app, /Ouvrir l’activité A/);
  assert.match(app, /Ouvrir l’activité B/);
  assert.match(app, /Revérifier/);
  assert.match(app, /edit-activity-date/);
  assert.match(app, /edit-activity-start/);
  assert.match(app, /edit-activity-end/);
  assert.match(app, /edit-activity-duration/);
});
test('24 conserve filtres, zébrage et scroll interne', () => {
  assert.match(css, /activity-filters .*height:36px/);
  assert.match(css, /activities-scroll\{max-height:calc\(100vh/);
  assert.match(css, /activities-table tbody tr:nth-child\(even\)/);
  assert.match(app, /opts\(activityPublicRows\(\),f\.public\|\|''\)/);
  assert.match(app, /data-public-labels/);
  assert.match(app, /r\.dataset\.publicLabels\.split\('\|'\)\.includes\(f\.public\)/);
  assert.equal(report.coherence.duplicatePublics, 0);
});
test('25 produit exactement le rapport A à BH', () => {
  const markdown = canonical.markdown(report);
  const headings = [...markdown.matchAll(/^## ([A-Z]{1,2})\./gm)].map((match) => match[1]);
  const expected = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...Array.from({ length: 26 }, (_, index) => `A${String.fromCharCode(65 + index)}`), ...Array.from({ length: 8 }, (_, index) => `B${String.fromCharCode(65 + index)}`)];
  assert.deepEqual(headings, expected);
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log(`PASS ${name}`); }
    catch (error) { failed += 1; console.error(`FAIL ${name}`); console.error(error.stack || error); }
  }
  console.log(`\nCANONICAL TRUTH ciblé: ${tests.length - failed}/${tests.length} PASS`);
  if (failed) process.exitCode = 1;
})();
