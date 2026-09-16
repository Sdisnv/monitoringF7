#!/usr/bin/env node
'use strict';

/** SCOPE — STATCOM-REFERENTIAL-CONFIG-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { resolveTrainingContext } = require('../netlify/lib/_scope-training-context-resolver');

const ACTOR = { sub: 'scope-statcom-referential-config-1', roles: ['sdis-admin'], displayName: 'Testeur SCOPE' };
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
    ok(UI_SOURCE.includes("title: 'Référentiel STAT.COM'"), 'PDF titré Référentiel STAT.COM');
    ok(UI_SOURCE.includes('statComPdfFilterLabel()'), 'PDF inclut filtres/recherche/tri');
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
