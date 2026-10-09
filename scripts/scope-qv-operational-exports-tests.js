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
  const text = pdfText(result.buffer);
  assert.match(text, /Planning annuel/);
  const aprilCount = exported.rows.filter((row) => row.dateIso.startsWith('2027-04')).length;
  assert.match(text, new RegExp(`AVRIL 2027 — ${aprilCount} événements`));
  assert.match(text, /Vacances scolaires : Vacances de Pâques \(26 mars 2027 au 11 avril 2027\)/);
  assert.match(text, /Jours fériés : 26 mars 2027 : Vendredi saint/);
  assert.match(text, /MARS 2027 —/);
  assert.match(text, /Jours fériés : 6 mai 2027 : Ascension ; 17 mai 2027 : Lundi de Pentecôte/);
  const perMonth = new Map();
  exported.rows.forEach((row) => {
    const month = row.dateIso.slice(0, 7);
    perMonth.set(month, (perMonth.get(month) || 0) + 1);
  });
  for (const [month, count] of perMonth) {
    const title = new Intl.DateTimeFormat('fr-CH', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${month}-01T12:00:00Z`)).toLocaleUpperCase('fr-CH');
    const label = `${title} — ${count} ${count === 1 ? 'événement' : 'événements'}`;
    const pages = text.split('\f').filter((page) => page.includes(label));
    assert.equal(pages.length, 1, `Bandeau unique pour ${month}`);
    assert.match(pages[0].slice(pages[0].indexOf(label)), /\d{2}\.\d{2}\.20\d{2}/, `Première séance avec le bandeau ${month}`);
  }
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
  assert.match(text, /AVRIL 2027 — 1 événement/);
  assert.match(text, /JUIN 2027 — 1 événement/);
  assert.match(text, /OCTOBRE 2027 — 1 événement/);
  assert.doesNotMatch(text, /FÉVRIER 2027 —/);
  assert.match(text, /Vacances scolaires : Vacances de Pâques \(26 mars 2027 au 11 avril 2027\)/);
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
  const monthlyText = pdfText(report.buffer);
  assert.match(monthlyText, /avril 2027/i);
  assert.match(monthlyText, new RegExp(`AVRIL 2027 — ${april.rows.length} événements`));
  assert.equal((monthlyText.match(/AVRIL 2027 —/g) || []).length, 1);
  assert.match(monthlyText, /Vacances scolaires : Vacances de Pâques \(26 mars 2027 au 11 avril 2027\)/);
  const filtered = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois', q: 'Exercice PR-ABC' }, 'mensuelle');
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.rows[0].dateIso, '2027-04-20');
  const filteredReport = await generateQuoVadisProgrammeReport(null, filtered, claims);
  assert.equal(filteredReport.pages, 1);
  const filteredText = pdfText(filteredReport.buffer);
  assert.match(filteredText, /Exercice PR-ABC/);
  assert.doesNotMatch(filteredText, /Exercice JSP/);
  assert.match(filteredText, /AVRIL 2027 — 1 événement/);
  assert.match(filteredText, /Vacances scolaires : Vacances de Pâques \(26 mars 2027 au 11 avril 2027\)/);
});

test('le service refuse une séance hors du mois déclaré', async () => {
  const { programme, hooks } = await source();
  const exported = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois' }, 'mensuelle');
  const foreign = { ...exported.rows[0], dateIso: '2027-05-01', endDateIso: '2027-05-01' };
  await assert.rejects(generateQuoVadisProgrammeReport(null, { ...exported, rows: [foreign] }, claims), /mois sélectionné/);
});

test('la liste compacte contient dix séances CODIR sur une page sans panneaux mensuels', async () => {
  const { programme, hooks } = await source();
  const exported = hooks.quoVadisProgrammeExport(programme, {q:'Codir'});
  const rows = exported.rows;
  assert.equal(rows.length,10);
  const report = await generateQuoVadisProgrammeReport(null,{rows:rows.slice().reverse(),meta:{...exported.meta,mode:'compact'}},claims);
  assert.equal(report.filename,'SCOPE_QUO_VADIS_2027_Liste_compacte.pdf');
  assert.equal(report.pages,1);
  assert.match(pdfInfo(report.buffer),/841\.89 x 595\.28 pts \(A4\)/);
  const text = pdfText(report.buffer);
  assert.match(text,/Liste compacte/);
  assert.equal((text.match(/Séance Codir/g) || []).length,10);
  assert.doesNotMatch(text,/Vacances scolaires|Jours fériés|— \d+ événements/);
  assert.ok(text.indexOf(rows[0].date) < text.indexOf(rows[9].date));
});

test('les noms des plannings annuels et mensuels suivent leur année et leur mois', async () => {
  const { programme,hooks } = await source();
  const annual = hooks.quoVadisProgrammeExport(programme,{q:'Exercice PR-ABC'});
  assert.equal((await generateQuoVadisProgrammeReport(null,annual,claims)).filename,'SCOPE_QUO_VADIS_2027_Planning_annuel.pdf');
  const monthly = hooks.quoVadisProgrammeExport(programme,{month:'2027-04',q:'Exercice PR-ABC'},'mensuelle');
  assert.equal((await generateQuoVadisProgrammeReport(null,monthly,claims)).filename,'SCOPE_QUO_VADIS_2027-04_Planning_mensuel.pdf');
});

test('le calendrier PDF suit l’année exportée et signale les périodes scolaires inconnues', async () => {
  const { programme, hooks } = await source();
  const exported = hooks.quoVadisProgrammeExport(programme, { month: '2027-04', period: 'mois', q: 'Exercice PR-ABC' }, 'mensuelle');
  const row = exported.rows[0];
  const forYear = (year) => ({
    meta: { ...exported.meta, year, monthKey: `${year}-04` },
    rows: [{ ...row, dateIso: `${year}-04-20`, endDateIso: `${year}-04-20`, date: `20.04.${year}`, monthKey: `${year}-04` }]
  });
  const nextYear = pdfText((await generateQuoVadisProgrammeReport(null, forYear(2028), claims)).buffer);
  assert.match(nextYear, /AVRIL 2028 — 1 événement/);
  assert.match(nextYear, /Vacances scolaires : Vacances de Pâques \(14 avril 2028 au 30 avril 2028\)/);
  const unknownYear = pdfText((await generateQuoVadisProgrammeReport(null, forYear(2029), claims)).buffer);
  assert.match(unknownYear, /Calendrier scolaire vaudois 2029 non disponible dans le référentiel/);
  assert.doesNotMatch(unknownYear, /Vacances de Pâques/);
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
