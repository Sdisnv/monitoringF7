#!/usr/bin/env node
'use strict';

/** SCOPE-EVENT-IMPORT-1 — import natif du programme d’exercices. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { generateReport } = require('../netlify/functions/_scope-report-service');
const { hasPermission } = require('../netlify/functions/_rbac');
const { HttpError } = require('../netlify/functions/_scope-rules');
const contract = require('../assets/js/scope-import-contract.js');

const ROOT = path.join(__dirname, '..');
const F7_CSV = fs.readFileSync(path.join(ROOT, 'assets/data/scope/monitoring_exercices_sdis_2026.csv'), 'utf8');
const EXAMPLE = fs.readFileSync(path.join(ROOT, 'assets/csv/SCOPE_Programme_Exercices_Exemple.csv'), 'utf8');
const ACTOR = { sub: 'test-event-import-1', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

const HEADER = 'date;domaine;sous_domaine;cibles;libelle;mode_suivi;a_comptabiliser;remarque;identifiant_externe';
function csv(rows){
  return [HEADER, ...rows].join('\n');
}

async function withBasculeTest(repo){
  const y4 = await repo.findCible('DAP', 'Y4');
  await repo.upsertRegleBascule({
    portee: 'CIBLE',
    cible_id: y4.cible_id,
    domaine_code: 'DAP',
    date_bascule: '2026-08-19',
    commentaire: 'Pilote nominatif DAP/Y4 — seule cible qualifiée.'
  });
}

async function commitNative(service, csvText, extra = {}){
  const preview = await service.previewImportEvenements({ csvText, filename: extra.filename || 'test.csv', ...extra });
  const rapport = await service.commitImportEvenements({
    csvText,
    filename: extra.filename || 'test.csv',
    previewToken: preview.previewToken,
    excludedLineNos: extra.excludedLineNos || [],
    decisions: extra.decisions || {}
  }, ACTOR);
  return { preview, rapport };
}

(async () => {
  await record('1 — parse format natif', async () => {
    const parsed = contract.parseCsv(EXAMPLE);
    assert.deepStrictEqual(parsed.headers.slice(0, 6), ['date', 'domaine', 'sous_domaine', 'cibles', 'libelle', 'mode_suivi']);
    assert.strictEqual(contract.detectCsvFormat(parsed.headers), 'SCOPE_EXERCICES_CSV_1');
    assert.ok(parsed.rows.length >= 4);
  });

  await record('2 — BOM', async () => {
    const bom = `\uFEFF${csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — BOM;NOMINATIF;oui;;'])}`;
    const parsed = contract.parseCsv(bom);
    assert.strictEqual(parsed.headers[0], 'date');
    const preview = contract.previewScopeImport(bom, { cibles: (await createMemoryRepo().listCibles()) });
    assert.strictEqual(preview.lignes[0].statut, 'A_CREER');
  });

  await record('3 — séparateur ;', async () => {
    const parsed = contract.parseCsv(csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — sep;NOMINATIF;oui;;']));
    assert.strictEqual(parsed.rows[0].fields.domaine, 'DAP');
    assert.strictEqual(parsed.rows[0].fields.cibles, 'Y4');
  });

  await record('4 — date ISO', async () => {
    assert.strictEqual(contract.normalizeDate('2026-09-10').iso, '2026-09-10');
    const preview = contract.previewScopeImport(csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — iso;NOMINATIF;oui;;']), {
      cibles: await createMemoryRepo().listCibles()
    });
    assert.strictEqual(preview.lignes[0].date, '2026-09-10');
    assert.strictEqual(preview.lignes[0].statut, 'A_CREER');
  });

  await record('5 — date invalide', async () => {
    const preview = contract.previewScopeImport(csv(['2026-13-40;DAP;;Y4;TEST IMPORT SCOPE — bad date;NOMINATIF;oui;;']), {
      cibles: await createMemoryRepo().listCibles()
    });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR_DATE');
  });

  await record('6 — domaine inconnu', async () => {
    const preview = contract.previewScopeImport(csv(['2026-09-10;XYZ;;Y4;TEST IMPORT SCOPE — xyz;AUTO;oui;;']), {
      cibles: await createMemoryRepo().listCibles()
    });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR_REFERENTIEL');
  });

  await record('7 — sous-domaine inconnu', async () => {
    const preview = contract.previewScopeImport(csv(['2026-09-10;FOSPEC;ZZ;G1;TEST IMPORT SCOPE — zz;AUTO;oui;;']), {
      cibles: await createMemoryRepo().listCibles()
    });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR_REFERENTIEL');
  });

  await record('8 — cible inconnue', async () => {
    const preview = contract.previewScopeImport(csv(['2026-09-10;DAP;;Y9;TEST IMPORT SCOPE — y9;NOMINATIF;oui;;']), {
      cibles: await createMemoryRepo().listCibles()
    });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR_REFERENTIEL');
  });

  await record('9 — DAP/Y4', async () => {
    const { preview, rapport } = await commitNative(createScopeService(createMemoryRepo()), csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — DAP Y4;NOMINATIF;oui;;'
    ]));
    assert.strictEqual(preview.lignes[0].domaine, 'DAP');
    assert.strictEqual(preview.lignes[0].cibleCodes, 'Y4');
    assert.strictEqual(rapport.summary.imported, 1);
  });

  await record('10 — DPS/G1', async () => {
    const { preview } = await commitNative(createScopeService(createMemoryRepo()), csv([
      '2026-09-15;DPS;;G1;TEST IMPORT SCOPE — DPS G1;QUANTITATIF;oui;;'
    ]));
    assert.strictEqual(preview.lignes[0].domaine, 'DPS');
    assert.strictEqual(preview.lignes[0].cibleCodes, 'G1');
  });

  await record('11 — FOSPEC/PR', async () => {
    const repo = createMemoryRepo();
    const { preview, rapport } = await commitNative(createScopeService(repo), csv([
      '2026-10-01;FOSPEC;PR;G1;TEST IMPORT SCOPE — PAPR;AUTO;oui;;'
    ]));
    assert.strictEqual(preview.lignes[0].domaine, 'FOSPEC');
    assert.strictEqual(preview.lignes[0].sousDomaine, 'PR');
    assert.strictEqual(preview.lignes[0].sousDomaineAffiche, 'PAPR');
    const ev = await repo.getEvent(rapport.created[0].evenementId);
    assert.strictEqual(ev.domaine_code, 'PR');
    assert.strictEqual(ev.sous_domaine_code, 'PR');
  });

  await record('12 — FOSPEC/AUTO', async () => {
    const repo = createMemoryRepo();
    const { preview, rapport } = await commitNative(createScopeService(repo), csv([
      '2026-10-15;FOSPEC;AUTO;VL;TEST IMPORT SCOPE — VL;QUANTITATIF;oui;;'
    ]));
    assert.strictEqual(preview.lignes[0].sousDomaine, 'AUTO');
    const ev = await repo.getEvent(rapport.created[0].evenementId);
    assert.strictEqual(ev.domaine_code, 'AUTO');
    assert.notStrictEqual(ev.domaine_code, 'FOSPEC');
  });

  await record('13 — FOBA', async () => {
    const { preview } = await commitNative(createScopeService(createMemoryRepo()), csv([
      '2026-10-20;FOBA;;1;TEST IMPORT SCOPE — FOBA 1;QUANTITATIF;oui;;'
    ]));
    assert.strictEqual(preview.lignes[0].domaineStockage, 'FOBA');
    assert.strictEqual(preview.lignes[0].cibleCodes, '1');
  });

  await record('14 — mode NOMINATIF', async () => {
    const repo = createMemoryRepo();
    const { rapport } = await commitNative(createScopeService(repo), csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — nom;NOMINATIF;oui;;'
    ]));
    const ev = await repo.getEvent(rapport.created[0].evenementId);
    assert.strictEqual(ev.mode_suivi, 'NOMINATIF');
    assert.strictEqual(ev.origine, 'IMPORT_CSV');
  });

  await record('15 — mode QUANTITATIF', async () => {
    const repo = createMemoryRepo();
    const { rapport } = await commitNative(createScopeService(repo), csv([
      '2026-09-15;DPS;;G1;TEST IMPORT SCOPE — qtt;QUANTITATIF;oui;;'
    ]));
    const ev = await repo.getEvent(rapport.created[0].evenementId);
    assert.strictEqual(ev.mode_suivi, 'QUANTITATIF');
  });

  await record('16 — mode AUTO → suggestion', async () => {
    const preview = await createScopeService(createMemoryRepo()).previewImportEvenements({
      csvText: csv(['2026-10-01;FOSPEC;PR;G1;TEST IMPORT SCOPE — auto;AUTO;oui;;'])
    });
    assert.strictEqual(preview.lignes[0].modeDemande, 'AUTO');
    assert.ok(preview.lignes[0].modePropose === 'NOMINATIF' || preview.lignes[0].modePropose === 'QUANTITATIF');
    assert.strictEqual(preview.lignes[0].statut, 'A_CREER');
  });

  await record('17 — AUTO visible preview', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Mode demandé'));
    assert.ok(ui.includes('Mode proposé'));
    const preview = await createScopeService(createMemoryRepo()).previewImportEvenements({
      csvText: csv(['2026-10-01;FOSPEC;PR;G1;TEST IMPORT SCOPE — auto vis;AUTO;oui;;'])
    });
    assert.strictEqual(preview.lignes[0].modeDemande, 'AUTO');
    assert.ok(preview.lignes[0].modePropose);
  });

  await record('18 — LEGACY refusé natif', async () => {
    const preview = await createScopeService(createMemoryRepo()).previewImportEvenements({
      csvText: csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — legacy;LEGACY;oui;;'])
    });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR_MODE');
    await assert.rejects(
      () => createScopeService(createMemoryRepo()).commitImportEvenements({
        csvText: csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — legacy;LEGACY;oui;;']),
        previewToken: preview.previewToken
      }, ACTOR),
      (error) => error instanceof HttpError && (error.status === 422 || error.status === 400 || error.status === 409)
    );
  });

  await record('19 — multi-cibles', async () => {
    const preview = contract.previewScopeImport(csv(['2026-09-12;DAP;;Y1|Y2;TEST IMPORT SCOPE — multi;QUANTITATIF;oui;;']), {
      cibles: await createMemoryRepo().listCibles()
    });
    assert.strictEqual(preview.lignes[0].cibleCodes, 'Y1|Y2');
    assert.strictEqual(preview.lignes[0].cibles.length, 2);
    assert.strictEqual(preview.lignes[0].statut, 'A_CREER');
  });

  await record('20 — doublon fichier', async () => {
    const preview = contract.previewScopeImport(csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — dup;NOMINATIF;oui;;ext-dup',
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — dup;NOMINATIF;oui;;ext-dup'
    ]), { cibles: await createMemoryRepo().listCibles() });
    assert.ok(preview.lignes.some((l) => l.erreurs.some((e) => e.error === 'doublon_fichier')));
  });

  await record('21 — déjà importé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — deja;NOMINATIF;oui;;ext-deja']);
    await commitNative(service, text);
    const second = await service.previewImportEvenements({ csvText: text });
    assert.strictEqual(second.lignes[0].statut, 'DEJA_IMPORTE');
  });

  await record('22 — événement existant', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await service.createEvenement({
      date: '2026-09-10', domaineCode: 'DAP', libelle: 'TEST IMPORT SCOPE — exist',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const preview = await service.previewImportEvenements({
      csvText: csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — exist;NOMINATIF;oui;;'])
    });
    assert.strictEqual(preview.lignes[0].statut, 'DEJA_PRESENT');
  });

  await record('23 — preview zéro écriture', async () => {
    const repo = createMemoryRepo();
    const before = {
      e: await repo.countTable('scope_evenements'),
      a: await repo.countTable('scope_attendus'),
      i: await repo.countTable('scope_imports')
    };
    const preview = await createScopeService(repo).previewImportEvenements({ csvText: EXAMPLE });
    assert.strictEqual(preview.ecriture, false);
    assert.strictEqual(await repo.countTable('scope_evenements'), before.e);
    assert.strictEqual(await repo.countTable('scope_attendus'), before.a);
    assert.strictEqual(await repo.countTable('scope_imports'), before.i);
  });

  await record('24 — erreur bloque commit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv(['2026-09-10;DAP;;Y9;TEST IMPORT SCOPE — err;NOMINATIF;oui;;']);
    const preview = await service.previewImportEvenements({ csvText: text });
    await assert.rejects(
      () => service.commitImportEvenements({ csvText: text, previewToken: preview.previewToken }, ACTOR),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'import_refuse'
    );
    assert.strictEqual(await repo.countTable('scope_evenements'), 0);
  });

  await record('25 — exclusion explicite', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — keep;NOMINATIF;oui;;',
      '2026-09-11;DAP;;Y4;TEST IMPORT SCOPE — drop;NOMINATIF;oui;;'
    ]);
    const { rapport } = await commitNative(service, text, { excludedLineNos: [3] });
    assert.strictEqual(rapport.summary.imported, 1);
    assert.strictEqual(rapport.summary.exclus, 1);
  });

  await record('26 — commit transactionnel', async () => {
    const repo = createMemoryRepo();
    const { rapport } = await commitNative(createScopeService(repo), EXAMPLE);
    assert.ok(rapport.importId);
    assert.strictEqual(rapport.format, 'SCOPE_EXERCICES_CSV_1');
    assert.ok(rapport.summary.imported >= 4);
    assert.strictEqual(rapport.summary.rollback, 0);
  });

  await record('27 — rollback', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — rb1;NOMINATIF;oui;;',
      '2026-09-11;DAP;;Y4;TEST IMPORT SCOPE — rb2;NOMINATIF;oui;;'
    ]);
    const preview = await service.previewImportEvenements({ csvText: text });
    let n = 0;
    const orig = repo.insertEvenement.bind(repo);
    repo.insertEvenement = async (row) => {
      n += 1;
      if (n === 2) throw new Error('forced_rollback');
      return orig(row);
    };
    await assert.rejects(() => service.commitImportEvenements({
      csvText: text, previewToken: preview.previewToken
    }, ACTOR));
    assert.strictEqual(await repo.countTable('scope_evenements'), 0);
    assert.strictEqual(await repo.countTable('scope_imports'), 0);
  });

  await record('28 — concurrence 409', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const text = csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — conc;NOMINATIF;oui;;']);
    const preview = await service.previewImportEvenements({ csvText: text });
    const y4 = await repo.findCible('DAP', 'Y4');
    await service.createEvenement({
      date: '2026-09-10', domaineCode: 'DAP', libelle: 'TEST IMPORT SCOPE — conc',
      cibleIds: [y4.cible_id], modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await assert.rejects(
      () => service.commitImportEvenements({ csvText: text, previewToken: preview.previewToken }, ACTOR),
      (error) => error instanceof HttpError && error.status === 409 && error.error === 'preview_obsolete'
    );
  });

  await record('29 — idempotence', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const first = await commitNative(service, EXAMPLE);
    const second = await commitNative(service, EXAMPLE);
    assert.ok(first.rapport.summary.imported >= 4);
    assert.strictEqual(second.rapport.summary.imported, 0);
    assert.ok(second.rapport.summary.dejaImporte >= 4);
    assert.strictEqual(await repo.countTable('scope_evenements'), first.rapport.summary.imported);
  });

  await record('30 — event statut PLANIFIE', async () => {
    const repo = createMemoryRepo();
    const { rapport } = await commitNative(createScopeService(repo), csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — plan;NOMINATIF;oui;;'
    ]));
    const ev = await repo.getEvent(rapport.created[0].evenementId);
    assert.strictEqual(ev.statut, 'PLANIFIE');
    assert.strictEqual(ev.population_figee, false);
  });

  await record('31 — origine IMPORT_CSV', async () => {
    const repo = createMemoryRepo();
    const { rapport } = await commitNative(createScopeService(repo), csv([
      '2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — orig;NOMINATIF;oui;;'
    ]));
    const ev = await repo.getEvent(rapport.created[0].evenementId);
    assert.strictEqual(ev.origine, 'IMPORT_CSV');
    assert.notStrictEqual(ev.origine, 'LEGACY_AGGREGATED');
  });

  await record('32 — aucune participation', async () => {
    const repo = createMemoryRepo();
    await commitNative(createScopeService(repo), EXAMPLE);
    assert.strictEqual(await repo.countTable('scope_participations'), 0);
  });

  await record('33 — aucun attendu', async () => {
    const repo = createMemoryRepo();
    await commitNative(createScopeService(repo), EXAMPLE);
    assert.strictEqual(await repo.countTable('scope_attendus'), 0);
  });

  await record('34 — aucune saisie quantitative', async () => {
    const repo = createMemoryRepo();
    await commitNative(createScopeService(repo), EXAMPLE);
    assert.strictEqual(await repo.countTable('scope_saisies_quantitatives'), 0);
  });

  await record('35 — journal', async () => {
    const repo = createMemoryRepo();
    const { rapport } = await commitNative(createScopeService(repo), EXAMPLE);
    const journal = await repo.listJournal('import', rapport.importId);
    assert.ok(journal.some((j) => j.action === 'IMPORTER_PROGRAMME_EXERCICES'));
  });

  await record('36 — rapport import', async () => {
    const { rapport } = await commitNative(createScopeService(createMemoryRepo()), EXAMPLE);
    assert.ok(Object.prototype.hasOwnProperty.call(rapport.summary, 'imported'));
    assert.ok(Object.prototype.hasOwnProperty.call(rapport.summary, 'dejaImporte'));
    assert.ok(Object.prototype.hasOwnProperty.call(rapport.summary, 'erreurs'));
    assert.ok(Object.prototype.hasOwnProperty.call(rapport.summary, 'rollback'));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Programme importé'));
    assert.ok(ui.includes('Voir les exercices'));
  });

  await record('37 — liste rechargée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await commitNative(service, csv(['2026-09-10;DAP;;Y4;TEST IMPORT SCOPE — liste;NOMINATIF;oui;;']));
    const listed = await service.listEvenements({ annee: 2026 });
    assert.ok(listed.evenements.some((item) => item.evenement.libelle === 'TEST IMPORT SCOPE — liste'));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('await loadList()'));
  });

  await record('38 — F7 historique non régressé', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText: F7_CSV });
    assert.strictEqual(preview.format, 'monitoring_exercices_sdis_22cols');
    const rapport = await service.commitImportEvenements({ csvText: F7_CSV, filename: 'f7.csv' }, ACTOR);
    assert.strictEqual(rapport.summary.imported, 8);
  });

  await record('39 — personnel non régressé', async () => {
    const repo = createMemoryRepo();
    await commitNative(createScopeService(repo), EXAMPLE);
    const person = createScopePersonService(repo);
    const dir = await person.directory({ from: '2026-01-01', to: '2026-12-31' });
    assert.ok(dir);
  });

  await record('40 — analytics non régressé', async () => {
    const repo = createMemoryRepo();
    await commitNative(createScopeService(repo), EXAMPLE);
    const analytics = createScopeAnalyticsService(repo);
    const summary = await analytics.summary({ from: '2026-01-01', to: '2026-12-31' });
    assert.ok(summary.officiel);
  });

  await record('41 — reports non régressé', async () => {
    const repo = createMemoryRepo();
    await commitNative(createScopeService(repo), EXAMPLE);
    const report = await generateReport(repo, {
      kind: 'PERIOD', from: '2026-01-01', to: '2026-12-31'
    }, ACTOR);
    assert.ok(report);
  });

  await record('42 — 8 LEGACY inchangés', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    await service.commitImportEvenements({ csvText: F7_CSV, filename: 'f7.csv' }, ACTOR);
    const listed = await service.listEvenements({ annee: 2026 });
    const legacy = listed.evenements.filter((item) => item.evenement.mode_suivi === 'LEGACY');
    assert.strictEqual(legacy.length, 8);
    const native = await commitNative(service, csv([
      '2026-11-01;DAP;;Y4;TEST IMPORT SCOPE — after f7;NOMINATIF;oui;;'
    ]));
    assert.strictEqual(native.rapport.summary.imported, 1);
    const after = await service.listEvenements({ annee: 2026 });
    assert.strictEqual(after.evenements.filter((item) => item.evenement.mode_suivi === 'LEGACY').length, 8);
    assert.ok(after.evenements.some((item) => item.evenement.origine === 'IMPORT_CSV'));
  });

  await record('43 — RBAC events:create / readonly', async () => {
    assert.strictEqual(hasPermission({ roles: ['sdis-readonly'] }, 'events:create'), false);
    assert.strictEqual(hasPermission({ roles: ['sdis-user'] }, 'events:create'), true);
    const http = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
    assert.ok(http.includes("path === '/imports/evenements/preview'"));
    assert.ok(http.includes("hasPermission(claims, 'events:create')"));
  });

  await record('44 — DAP Y1–Y4 sans population', async () => {
    const repo = createMemoryRepo();
    const text = csv([
      '2026-09-01;DAP;;Y1;TEST IMPORT SCOPE — Y1;NOMINATIF;oui;;',
      '2026-09-02;DAP;;Y2;TEST IMPORT SCOPE — Y2;QUANTITATIF;oui;;',
      '2026-09-03;DAP;;Y3;TEST IMPORT SCOPE — Y3;NOMINATIF;oui;;',
      '2026-09-04;DAP;;Y4;TEST IMPORT SCOPE — Y4;NOMINATIF;oui;;'
    ]);
    await commitNative(createScopeService(repo), text);
    assert.strictEqual(await repo.countTable('scope_evenements'), 4);
    assert.strictEqual(await repo.countTable('scope_attendus'), 0);
  });

  await record('45 — UX résumé / filtres / exemple', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    const docs = fs.readFileSync(path.join(ROOT, 'docs/SCOPE_IMPORT_EXERCICES_CSV.md'), 'utf8');
    assert.ok(ui.includes('Programme à importer'));
    assert.ok(ui.includes('data-import-filter'));
    assert.ok(ui.includes('parcours recommandé'));
    assert.ok(ui.includes('historique Monitoring F7'));
    assert.ok(ui.includes('SCOPE_Programme_Exercices_Exemple.csv'));
    assert.ok(css.includes('@media (max-width: 768px)'));
    assert.ok(docs.includes('SCOPE_EXERCICES_CSV_1'));
    assert.ok(fs.existsSync(path.join(ROOT, 'assets/csv/SCOPE_Programme_Exercices_Exemple.csv')));
  });

  const failed = results.filter((r) => r.status !== 'NOK' ? false : true).length
    ? results.filter((r) => r.status === 'NOK')
    : [];
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();
