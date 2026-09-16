#!/usr/bin/env node
'use strict';

/** SCOPE — STATCOM-REFERENTIAL-CONFIG-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { generateStatComReferentialReport } = require('../netlify/lib/_scope-report-service');
const { INSTITUTION } = require('../netlify/lib/_scope-chart-tokens');
const { resolveTrainingContext } = require('../netlify/lib/_scope-training-context-resolver');
const logic = require('../assets/js/scope-ui-logic');

const ACTOR = {
  sub: 'scope-statcom-referential-config-1',
  roles: ['sdis-admin'],
  permissions: ['dashboard:read', 'references:manage'],
  displayName: 'Testeur SCOPE'
};
const ROOT = path.join(__dirname, '..');
const UI_SOURCE = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch(error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function build(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const dps = await repo.findCible('DPS', 'B1');
  const pr = await repo.findCible('PR', 'GEN') || (await repo.listCibles()).find((row) => row.domaine_code === 'PR');
  return { repo, service, dps, pr };
}

(async () => {
  await record('01 — référentiel initial STAT.COM depuis PDF : codes texte et familles clés', async () => {
    const { service } = await build();
    const catalog = (await service.formationCatalog()).formationCatalog;
    const codes = new Map(catalog.statComCodes.map((row) => [row.code, row]));
    ['010FOBA', '010FOBC', '010JSP', '011PR', '0151F7', '0152F7', '01521F7', '01522F7', '0164F7', '0170F7', '070F0', '070F23', '014B1', '012B1', '013Y4'].forEach((code) => {
      ok(codes.has(code), `Code STAT.COM attendu absent : ${code}`);
    });
    eq(codes.get('010JSP').label, 'Exercices JSP');
    eq(codes.get('01521F7').code, '01521F7');
    eq(codes.get('0170F7').specialization, 'TOUS_CADRES');
  });

  await record('02 — configuration formation : STAT.COM par défaut persistant et snapshot événement figé', async () => {
    const { repo, service, pr } = await build();
    const created = await service.createEventDefinition({
      domain: 'PR',
      label: 'PR STAT.COM contrôlé',
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'SIMPLE',
      statComCode: '011PR'
    }, ACTOR);
    eq(created.version.statcom_code, '011PR');
    eq(created.version.statcom_snapshot.code, '011PR');

    const event = await service.createEvenement({
      date: '2026-03-01',
      domaineCode: 'PR',
      libelle: 'PR STAT.COM contrôlé',
      cibleIds: [pr.cible_id],
      definitionVersionId: created.version.definition_version_id
    }, ACTOR);
    eq(event.evenement.statcom_code, '011PR');
    eq(event.evenement.statcom_snapshot.label, 'PR');

    await service.saveStatComCode({
      code: '011PR',
      label: 'PR libellé MOA futur',
      domain: 'PR',
      category: 'EXERCI',
      validFrom: '2023-01-01',
      active: true
    }, ACTOR);
    const reread = await repo.getEvent(event.evenement.evenement_id);
    eq(reread.statcom_snapshot.label, 'PR');
  });

  await record('03 — resolver central expose le STAT.COM effectif', async () => {
    const { repo, service, dps } = await build();
    const created = await service.createEventDefinition({
      domain: 'DPS',
      label: 'DPS STAT.COM contrôlé',
      year: 2026,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
      modeOrganisation: 'MULTI_SESSION',
      sessionCount: 2,
      statComCode: '012B1'
    }, ACTOR);
    const event = await service.createEvenement({
      date: '2026-04-01',
      domaineCode: 'DPS',
      libelle: 'DPS STAT.COM contrôlé 1.1',
      cibleIds: [dps.cible_id],
      definitionVersionId: created.version.definition_version_id,
      sessionIndex: 1
    }, ACTOR);
    const ctx = await resolveTrainingContext(repo, event.evenement);
    eq(ctx.statComCode, '012B1');
    eq(ctx.statCom.label, 'FOCO DPS B1');
    eq(ctx.modeOrganisation, 'MULTI_SESSION');
  });

  await record('04 — contrat import : connu, inconnu, hors validité, incohérent', async () => {
    const { service } = await build();
    eq((await service.resolveStatComImportContract({ statCom: '011PR', domain: 'PR', date: '2026-01-01' })).statComResolution.status, 'KNOWN');
    eq((await service.resolveStatComImportContract({ statCom: 'NOPE', domain: 'PR', date: '2026-01-01' })).statComResolution.status, 'UNKNOWN');
    await service.saveStatComCode({ code: '099OLD', label: 'Ancien code', domain: 'PR', category: 'EXERCI', validFrom: '2023-01-01', validTo: '2024-12-31', active: true }, ACTOR);
    eq((await service.resolveStatComImportContract({ statCom: '099OLD', domain: 'PR', date: '2026-01-01' })).statComResolution.status, 'OUT_OF_VALIDITY');
    eq((await service.resolveStatComImportContract({ statCom: '011PR', domain: 'AUTO', date: '2026-01-01' })).statComResolution.status, 'INCOHERENT');
  });

  await record('05 — correction STAT.COM interdite sur événement réalisé', async () => {
    const { repo, service, pr } = await build();
    const event = await service.createEvenement({
      date: '2026-05-01',
      domaineCode: 'PR',
      libelle: 'PR réalisé',
      cibleIds: [pr.cible_id]
    }, ACTOR);
    await repo.updateEventIfVersion(event.evenement.evenement_id, event.version, { statut: 'REALISE' });
    let failed = false;
    try {
      await service.patchEvenement(event.evenement.evenement_id, { baseVersion: event.version + 1, statComCode: '011PR' }, ACTOR);
    } catch(error) {
      failed = error && error.error === 'evenement_realise_non_modifiable';
    }
    ok(failed, 'Un événement réalisé ne doit pas accepter une correction STAT.COM directe.');
  });

  await record('06 — UX finalisation : tri commun, libellés, PDF, focus Modifier', async () => {
    ok(UI_SOURCE.includes("sortableHeader('statcom', 'code', 'CODE STAT.COM'"), 'tri CODE via sortableHeader');
    ok(UI_SOURCE.includes("sortableHeader('statcom', 'specialization', 'SPÉCIALISATION'"), 'libellé spécialisation utilisateur');
    ok(!UI_SOURCE.includes('<th>SPECIALIZATION</th>'), 'ancien libellé SPECIALIZATION absent du tableau');
    ok(UI_SOURCE.includes('id="statcom-export-pdf"'), 'action Exporter PDF présente');
    ok(UI_SOURCE.includes('client.generateStatComReport'), 'PDF STAT.COM généré par le backend SCOPE');
    ok(UI_SOURCE.includes('statComPdfFilterMeta()'), 'PDF inclut filtres/recherche/tri');
    ok(UI_SOURCE.includes('focusStatComForm();'), 'Modifier/Ajouter amène le formulaire dans le viewport');
  });

  await record('07 — sélecteur formation : domaine seulement, général/OI/spécialisation disponibles', async () => {
    ok(UI_SOURCE.includes('const statComOptions = statComCodes'), 'sélecteur STAT.COM construit depuis le référentiel');
    ok(UI_SOURCE.includes("String(row.domain).toUpperCase() === activeDomain"), 'filtre par domaine compatible');
    ok(!/formation-statcom[\s\S]{0,1200}row\.oi/.test(UI_SOURCE), 'le sélecteur ne filtre pas par OI');
    ok(!/formation-statcom[\s\S]{0,1200}row\.specialization/.test(UI_SOURCE), 'le sélecteur ne filtre pas par spécialisation');
    const { service } = await build();
    const catalog = (await service.formationCatalog()).formationCatalog;
    const dpsCodes = catalog.statComCodes.filter((row) => row.domain === 'DPS').map((row) => row.code);
    ok(dpsCodes.includes('012B1'), 'code OI DPS spécifique disponible');
    ok(dpsCodes.includes('0120F7'), 'code général DPS disponible');
  });

  await record('08 — tri STAT.COM runtime : contrat sortRows valide au rendu initial et après tri', async () => {
    const columns = logic.statComSortColumns();
    ok(Array.isArray(columns), 'colonnes STAT.COM fournies sous forme de tableau');
    ok(columns.some((column) => column.key === 'specialization'), 'colonne spécialisation déclarée');
    const rows = [
      { code: '012B1', label: 'DPS B1', domain: 'DPS', category: 'EXERCICE', oi: 'B1', specialization: '', valid_from: '2023-01-01', active: true },
      { code: '010JSP', label: 'Exercices JSP', domain: 'JSP', category: 'EXERCICE', oi: '', specialization: 'JSP', valid_from: '2023-01-01', active: true },
      { code: '0170F7', label: 'Cadres', domain: 'FOSPEC', category: 'FORMATION', oi: '', specialization: 'TOUS_CADRES', valid_from: '2024-01-01', active: false }
    ];
    assert.doesNotThrow(() => logic.sortRows(rows, { key: 'code', dir: 'asc' }, columns), 'rendu initial/reload avec tri par défaut sans TypeError');
    assert.doesNotThrow(() => logic.sortRows(rows, logic.nextSort({ key: 'code', dir: 'asc' }, 'specialization', 'asc'), columns), 'tri utilisateur spécialisation sans TypeError');
    assertions += 2;
    eq(logic.sortRows(rows, { key: 'code', dir: 'asc' }, columns)[0].code, '010JSP', 'tri code actif');
    eq(logic.sortRows(rows, { key: 'state', dir: 'asc' }, columns)[0].code, '012B1', 'tri état actif/inactif conservé');
  });

  await record('09 — export STAT.COM : même collection visible pour écran et PDF', async () => {
    const { service } = await build();
    const catalog = (await service.formationCatalog()).formationCatalog;
    const rows = catalog.statComCodes;
    const visible = (options) => logic.visibleStatComRows(rows, options).map((row) => row.code);
    const all = visible({ sort: { key: 'code', dir: 'asc' } });
    eq(all.length, rows.length, 'export sans filtre = toutes les lignes visibles');
    const codeDesc = visible({ sort: { key: 'code', dir: 'desc' } });
    eq(codeDesc[0], all[all.length - 1], 'CODE DESC inverse le premier résultat');
    const labelAsc = visible({ sort: { key: 'label', dir: 'asc' } });
    const labelDesc = visible({ sort: { key: 'label', dir: 'desc' } });
    ok(labelAsc.length === labelDesc.length && labelAsc[0] !== labelDesc[0], 'LIBELLÉ ASC/DESC appliqué');
    ['domain', 'category', 'oi', 'specialization', 'validity', 'state'].forEach((key) => {
      ok(visible({ sort: { key, dir: 'asc' } }).length === rows.length, `tri ${key} conserve le périmètre`);
    });
    const dap = logic.visibleStatComRows(rows, { query: 'DAP', sort: { key: 'code', dir: 'desc' } });
    ok(dap.length > 0 && dap.length < rows.length, 'recherche DAP réduit le nombre de résultats');
    ok(dap.every((row) => ['code', 'label', 'domain', 'category', 'oi', 'specialization'].some((key) => logic.statComCellValue(row, key).toUpperCase().includes('DAP'))), 'recherche DAP exporte uniquement les lignes visibles');
    const jsp = logic.visibleStatComRows(rows, { domainFilter: 'JSP', sort: { key: 'label', dir: 'asc' } });
    ok(jsp.length > 0 && jsp.every((row) => row.domain === 'JSP'), 'filtre domaine JSP respecté');
    const combo = logic.visibleStatComRows(rows, { query: 'JSP', domainFilter: 'JSP', sort: { key: 'code', dir: 'desc' } });
    ok(combo.every((row) => row.domain === 'JSP'), 'combinaison recherche + filtre + tri conserve le filtre');
    ok(UI_SOURCE.includes('exportStatComPdf(currentStatComRowsForDisplay())'), 'PDF consomme exactement la collection affichée');
  });

  await record('10 — édition STAT.COM : spécialisation persistée et règles de casse', async () => {
    const { repo, service } = await build();
    const before = await repo.getStatComCode('0120F7');
    eq(before.specialization, 'FOCO_DPS_4', 'valeur initiale de recette présente');
    eq(before.specialization_key, 'FOCO_DPS_4', 'clé technique initiale séparée');
    const payload = {
      code: '0120F7',
      label: 'Solde instruction FOCO DPS (4 DPS)',
      domain: 'dps',
      category: 'exerci',
      oi: 'F7',
      specialization: 'FOCO 4 DPS',
      validFrom: '2023-01-01',
      validTo: null,
      active: true
    };
    const saved = await service.saveStatComCode(payload, ACTOR);
    eq(saved.statCom.specialization, 'FOCO 4 DPS', 'réponse API conserve la spécialisation métier');
    eq(saved.statCom.domain, 'DPS', 'domaine normalisé en majuscules');
    eq(saved.statCom.category, 'EXERCI', 'catégorie normalisée en majuscules');
    eq(saved.statCom.label, 'Solde instruction FOCO DPS (4 DPS)', 'libellé strictement conservé');
    eq(saved.statCom.oi, 'F7', 'OI conservé');
    eq(saved.statCom.specialization_key, 'FOCO_DPS_4', 'clé technique héritée conservée séparément');
    eq(payload.specialization, 'FOCO 4 DPS', 'payload frontend attendu sans reconstruction');
    const persisted = await repo.getStatComCode('0120F7');
    eq(persisted.specialization, 'FOCO 4 DPS', 'stockage persiste FOCO 4 DPS');
    eq(persisted.specialization_key, 'FOCO_DPS_4', 'stockage conserve la clé technique distincte');
    const reloaded = (await service.formationCatalog()).formationCatalog.statComCodes.find((row) => row.code === '0120F7');
    eq(reloaded.specialization, 'FOCO 4 DPS', 'reload catalogue conserve FOCO 4 DPS');
    eq(reloaded.specialization_key, 'FOCO_DPS_4', 'reload catalogue conserve la clé technique distincte');
    const visible = logic.visibleStatComRows([reloaded], { query: 'FOCO 4 DPS', sort: { key: 'code', dir: 'asc' } });
    eq(visible.length, 1, 'affichage/recherche consomme la valeur métier persistée');
    ok(!String(reloaded.specialization || '').includes('_'), 'aucun underscore réintroduit dans la valeur métier affichée');
    for (const [code, specialization] of [
      ['099CPL', 'Cond. PL'],
      ['099ABC', 'PR-ABC'],
      ['099NAC', 'Formation nacelle']
    ]) {
      await service.saveStatComCode({
        code,
        label: `Test ${specialization}`,
        domain: 'auto',
        category: 'exerci',
        oi: 'F7',
        specialization,
        validFrom: '2023-01-01',
        active: true
      }, ACTOR);
      const savedRow = await repo.getStatComCode(code);
      eq(savedRow.specialization, specialization, `spécialisation littérale conservée: ${specialization}`);
      eq(savedRow.domain, 'AUTO', `domaine normalisé pour ${specialization}`);
      eq(savedRow.category, 'EXERCI', `catégorie normalisée pour ${specialization}`);
      const catalogRow = (await service.formationCatalog()).formationCatalog.statComCodes.find((row) => row.code === code);
      eq(catalogRow.specialization, specialization, `catalogue conserve ${specialization}`);
    }
    const pgSource = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pg.js'), 'utf8');
    const schemaSource = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-schema.js'), 'utf8');
    ok(pgSource.includes('specialization_label = excluded.specialization_label'), 'PostgreSQL écrit la valeur métier dans specialization_label');
    ok(pgSource.includes('specialization_key'), 'PostgreSQL expose une clé technique séparée');
    ok(schemaSource.includes('scope-statcom-specialisation-persistence-repair-2'), 'migration additive dédiée présente');
  });

  await record('11 — PDF STAT.COM SCOPE : portrait, charte commune et collection visible', async () => {
    const { repo, service } = await build();
    const catalog = (await service.formationCatalog()).formationCatalog;
    const visibleRows = logic.visibleStatComRows(catalog.statComCodes, {
      query: 'JSP',
      domainFilter: 'JSP',
      stateFilter: 'ACTIF',
      sort: { key: 'label', dir: 'desc' }
    });
    const pdf = await generateStatComReferentialReport(repo, {
      rows: visibleRows,
      meta: {
        search: 'JSP',
        domain: 'JSP',
        state: 'Actifs',
        sort: logic.statComSortLabel({ key: 'label', dir: 'desc' })
      }
    }, ACTOR, { generatedAt: '2026-09-16T10:00:00.000Z' });
    ok(Buffer.isBuffer(pdf.buffer), 'PDF produit un buffer');
    ok(pdf.buffer.slice(0, 5).toString() === '%PDF-', 'PDF valide');
    ok(pdf.pages >= 1, 'pagination calculée');
    ok(pdf.filename.includes('SCOPE_Referentiel_STATCOM_2026-09-16'), 'nom de fichier SCOPE');
    const pdfSource = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-pdf-renderer.js'), 'utf8');
    ok(pdfSource.includes("size: 'A4'"), 'format A4 portrait du moteur PDFKit');
    ok(pdfSource.includes("['CODE', 'LIBELLÉ', 'DOMAINE', 'CATÉGORIE', 'OI', 'SPÉCIALISATION', 'VALIDITÉ', 'ÉTAT']"), 'colonnes françaises accentuées');
    ok(pdfSource.includes('[50, 135, 40, 50, 28, 94, 56, 46]'), 'largeurs colonnes portrait optimisées');
    ok(pdfSource.includes('wrap: [false, true, false, false, false, true, false, false]'), 'wrapping libellé/spécialisation');
    ok(pdfSource.includes('maxRowH: null'), 'anti-troncature métier sans plafond de ligne');
    ok(pdfSource.includes('renderStatComReferentialPdf'), 'PDF STAT.COM utilise le renderer commun');
    eq(INSTITUTION.red, '#DE000A', 'rouge SCOPE institutionnel conservé');
    eq(pdf.meta.rows, visibleRows.length, 'nombre de lignes PDF = collection visible');
    eq(logic.statComSortLabel({ key: 'code', dir: 'asc' }), 'Code — croissant', 'métadonnée tri code asc');
    eq(logic.statComSortLabel({ key: 'label', dir: 'desc' }), 'Libellé — décroissant', 'métadonnée tri libellé desc');
    ok(!UI_SOURCE.includes('/MediaBox [0 0 ${width} ${height}]'), 'ancien PDF navigateur paysage supprimé');
    ok(!UI_SOURCE.includes("pdfRect(0, height - 62"), 'ancien bandeau spécifique STAT.COM supprimé');
    eq(logic.statComSortLabel({ key: 'code', dir: 'asc' }), 'Code — croissant', 'métadonnée tri code asc');
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  for(const row of results){
    console.log(`${row.status} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    console.error(`STATCOM-REFERENTIAL-CONFIG-1 NOK — ${failed.length}/${results.length} échec(s), assertions=${assertions}`);
    process.exit(1);
  }
  console.log(`STATCOM-REFERENTIAL-CONFIG-1 PASS — ${results.length} scénarios, assertions=${assertions}`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
