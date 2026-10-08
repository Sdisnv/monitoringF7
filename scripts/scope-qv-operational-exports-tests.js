'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const { createFixture } = require('./scope-qv-local-fixture');
const { createCatalogUiHarness } = require('./scope-annual-catalog-ui-harness');
const { generateQuoVadisProgrammeReport } = require('../netlify/lib/_scope-report-service');

const claims = { sub: 'local-test', roles: ['ADMINISTRATEUR'], permissions: ['dashboard:read'] };
const pdfInfo = (buffer) => execFileSync('pdfinfo', ['-'], { input: buffer, encoding: 'utf8' });
const pdfText = (buffer) => execFileSync('pdftotext', ['-layout', '-', '-'], { input: buffer, encoding: 'utf8' });

async function source() {
  const fixture = createFixture(null);
  const programme = await fixture.service.listProgramme(2027);
  const harness = createCatalogUiHarness();
  return { programme, hooks: harness.hooks };
}

test('l’export annuel reprend les séances distinctes et non la page courante', async () => {
  const { programme, hooks } = await source();
  const exported = hooks.quoVadisProgrammeExport(programme);
  assert.equal(exported.meta.mode, 'annual');
  assert.equal(exported.rows.length, programme.canonicalProgramme.rows.filter((row) => !row.external && !row.jspDirectionReconciliation
    && !(row.cursusReconciliation && row.cursusReconciliation.status === 'SUPERSEDED_BY_VALIDATED_MODULE')).length);
  assert.ok(exported.rows.length > 20);
  assert.ok(exported.rows.every((row) => !row.activite.includes('undefined')));
  const result = await generateQuoVadisProgrammeReport(null, exported, claims);
  assert.match(pdfInfo(result.buffer), /Page size:\s+841\.89 x 595\.28 pts \(A4\)/);
  assert.ok(result.pages > 1);
  assert.match(pdfText(result.buffer), /Planning annuel/);
});

test('recherche métier et période sélectionnée bornent les lignes du PDF annuel', async () => {
  const { programme, hooks } = await source();
  const filtered = hooks.quoVadisProgrammeExport(programme, { q: 'Exercice PR-ABC' });
  assert.equal(filtered.rows.length, 3);
  assert.ok(filtered.rows.every((row) => row.activite.includes('Exercice PR-ABC')));
  const report = await generateQuoVadisProgrammeReport(null, filtered, claims);
  const text = pdfText(report.buffer);
  assert.match(text, /Exercice PR-ABC/);
  assert.doesNotMatch(text, /Exercice JSP/);
  assert.match(text, /Recherche : Exercice PR-ABC/);
  const april = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois' });
  assert.ok(april.rows.length > 0);
  assert.ok(april.rows.length < hooks.quoVadisProgrammeExport(programme).rows.length);
  assert.ok(april.rows.every((row) => row.dateIso <= '2027-04-30' && row.endDateIso >= '2027-04-01'));
});

test('PDF mensuel portrait : mois et recherche actifs, pagination sans séance étrangère', async () => {
  const { programme, hooks } = await source();
  const april = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois' }, 'mensuelle');
  const report = await generateQuoVadisProgrammeReport(null, april, claims);
  assert.match(pdfInfo(report.buffer), /Page size:\s+595\.28 x 841\.89 pts \(A4\)/);
  assert.ok(report.pages > 1);
  assert.match(pdfText(report.buffer), /avril 2027/i);
  const filtered = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois', q: 'Exercice PR-ABC' }, 'mensuelle');
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.rows[0].dateIso, '2027-04-20');
  const filteredReport = await generateQuoVadisProgrammeReport(null, filtered, claims);
  assert.equal(filteredReport.pages, 1);
  assert.match(pdfText(filteredReport.buffer), /Exercice PR-ABC/);
  assert.doesNotMatch(pdfText(filteredReport.buffer), /Exercice JSP/);
});

test('le service refuse une séance hors du mois déclaré', async () => {
  const { programme, hooks } = await source();
  const exported = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois' }, 'mensuelle');
  const foreign = { ...exported.rows[0], dateIso: '2027-05-01', endDateIso: '2027-05-01' };
  await assert.rejects(generateQuoVadisProgrammeReport(null, { ...exported, rows: [foreign] }, claims), /mois sélectionné/);
});

test('les références historiques restent séparées des arbitrages opérationnels', async () => {
  const fixture = createFixture(null);
  fixture.preparations.push(
    { obligation_id: 'historical-1', programme_id: 'local-qv-2027', source_type: 'HISTORIQUE', source_ref: 'H2026:FOBA:1', title: 'Exercice FOBA 1', domain: 'FOBA', statut: 'PROPOSE', include_in_programme: true,
      metadata: { needsArbitration: true, historicalReferenceOnly: true, arbitrationReason: 'Stat.Com à confirmer' } },
    { obligation_id: 'operational-1', programme_id: 'local-qv-2027', source_type: 'MANUAL', source_ref: 'QV27:TEST:1', title: 'Arbitrage opérationnel test', domain: 'DPS', statut: 'PROPOSE', include_in_programme: true,
      metadata: { needsArbitration: true, arbitrationReason: 'Date à arbitrer' } }
  );
  const programme = await fixture.service.listProgramme(2027);
  assert.equal(programme.activities.find((row) => row.title === 'Exercice FOBA 1').historicalReferenceOnly, true);
  const html = createCatalogUiHarness().hooks.renderQuoVadisArbitrerHtml(programme);
  assert.match(html, /Références historiques incomplètes/);
  assert.match(html, /H2026:FOBA:1/);
  assert.match(html, /Arbitrages opérationnels/);
  assert.match(html, /Arbitrage opérationnel test/);
});
