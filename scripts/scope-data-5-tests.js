#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const csv = require('../assets/js/scope-csv-import.js');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'assets/data/scope/monitoring_exercices_sdis_2026.csv');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
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

(async () => {
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');

  await record('1 — lecture du CSV réel annexé', async () => {
    const parsed = csv.parseExercicesCsv(csvText);
    assert.strictEqual(parsed.ok, true, parsed.message);
    assert.strictEqual(parsed.separator, ';');
    assert.strictEqual(parsed.encoding, 'utf-8');
    assert.strictEqual(parsed.header.length, 22);
    assert.ok(fs.existsSync(CSV_PATH));
    assert.strictEqual(fs.statSync(CSV_PATH).size, 947);
  });

  await record('2 — 8 lignes reconnues', async () => {
    const parsed = csv.parseExercicesCsv(csvText);
    assert.strictEqual(parsed.rows.length, 8);
    const keys = parsed.rows.map((r) => `${r.record.date_exercice}|${r.record.domaine}|${r.record.public_cible}`);
    assert.deepStrictEqual(keys, [
      '2026-03-31|DAP|Y4',
      '2026-03-24|DPS|B1',
      '2026-03-24|DPS|C1',
      '2026-03-19|DAP|Y3',
      '2026-03-17|DAP|Y2',
      '2026-03-12|DAP|Y1',
      '2026-02-25|FOBA|FOBA 1',
      '2026-02-25|FOBA|FOBA 2'
    ]);
  });

  await record('3 — domaines/cibles connus du fichier réel', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText });
    assert.strictEqual(preview.lignes.length, 8);
    assert.ok(preview.lignes.every((l) => l.cibleId));
    assert.ok(preview.lignes.every((l) => l.statut !== 'ERREUR'));
    assert.deepStrictEqual([...new Set(preview.lignes.map((l) => l.domaine))].sort(), ['DAP', 'DPS', 'FOBA']);
  });

  await record('4 — FOBA 1 → FOBA/1', async () => {
    assert.strictEqual(csv.normalizePublicCible('FOBA', 'FOBA 1'), '1');
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const preview = await createScopeService(repo).previewImportEvenements({ csvText });
    const line = preview.lignes.find((l) => l.publicCible === 'FOBA 1');
    assert.strictEqual(line.niveauCode, '1');
    assert.strictEqual(line.cibleLibelle, 'FOBA 1');
  });

  await record('5 — FOBA 2 → FOBA/2', async () => {
    assert.strictEqual(csv.normalizePublicCible('FOBA', 'FOBA 2'), '2');
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const preview = await createScopeService(repo).previewImportEvenements({ csvText });
    const line = preview.lignes.find((l) => l.publicCible === 'FOBA 2');
    assert.strictEqual(line.niveauCode, '2');
    assert.strictEqual(line.cibleLibelle, 'FOBA 2');
  });

  await record('6 — cible inconnue → erreur', async () => {
    const mutated = csvText.replace('Y4', 'Y9');
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const preview = await createScopeService(repo).previewImportEvenements({ csvText: mutated });
    const err = preview.lignes.find((l) => l.statut === 'ERREUR');
    assert.ok(err);
    assert.strictEqual(err.code, 'cible_inconnue');
    await assert.rejects(
      () => createScopeService(repo).commitImportEvenements({ csvText: mutated }, { sub: 't' }),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'import_refuse'
    );
    assert.strictEqual(await repo.countTable('scope_evenements'), 0);
  });

  await record('7 — domaine inconnu → erreur', async () => {
    const mutated = csvText.replace(';DAP;', ';XXX;');
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const preview = await createScopeService(repo).previewImportEvenements({ csvText: mutated });
    const err = preview.lignes.find((l) => l.domaine === 'XXX');
    assert.ok(err);
    assert.strictEqual(err.statut, 'ERREUR');
    assert.strictEqual(err.code, 'domaine_inconnu');
  });

  await record('8 — preview = zéro écriture', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const before = {
      e: await repo.countTable('scope_evenements'),
      l: await repo.countTable('scope_legacy_aggregates'),
      a: await repo.countTable('scope_attendus'),
      p: await repo.countTable('scope_participations'),
      i: await repo.countTable('scope_imports')
    };
    const preview = await service.previewImportEvenements({ csvText });
    assert.strictEqual(preview.ecriture, false);
    assert.strictEqual(await repo.countTable('scope_evenements'), before.e);
    assert.strictEqual(await repo.countTable('scope_legacy_aggregates'), before.l);
    assert.strictEqual(await repo.countTable('scope_attendus'), before.a);
    assert.strictEqual(await repo.countTable('scope_participations'), before.p);
    assert.strictEqual(await repo.countTable('scope_imports'), before.i);
  });

  await record('9 — import répété ≠ doublons silencieux', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const first = await service.commitImportEvenements({ csvText, filename: 'a.csv' }, { sub: 't' });
    assert.strictEqual(first.summary.imported, 8);
    assert.strictEqual(await repo.countTable('scope_evenements'), 8);
    const second = await service.commitImportEvenements({ csvText, filename: 'a.csv' }, { sub: 't' });
    assert.strictEqual(second.summary.imported, 0);
    assert.strictEqual(second.summary.dejaImporte, 8);
    assert.strictEqual(await repo.countTable('scope_evenements'), 8);
    assert.strictEqual(await repo.countTable('scope_legacy_aggregates'), 8);
  });

  await record('10 — LEGACY ≠ nominatif', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const listed = await service.listEvenements({ annee: 2026 });
    assert.ok(listed.evenements.every((item) => item.evenement.origine === 'LEGACY_AGGREGATED'));
    const y4 = listed.evenements.find((item) => item.evenement.date === '2026-03-31');
    const taux = await service.tauxEvenement(y4.evenement.evenement_id);
    assert.strictEqual(taux.officiel, false);
    assert.strictEqual(taux.kind, 'LEGACY');
    assert.strictEqual(taux.exclus.legacy, true);
    assert.strictEqual(taux.percentage, 100);
    assert.ok(logic.displayTauxForList('PLANIFIE', true, taux.percentage, { origine: 'LEGACY_AGGREGATED' }).includes('non nominatif'));
    assert.strictEqual(logic.displayTauxForList('PLANIFIE', false, 86.7), '—');
  });

  await record('11 — aucun attendu créé pour LEGACY', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const committed = await service.commitImportEvenements({ csvText }, { sub: 't' });
    for (const row of committed.created) {
      const attendus = await repo.listAttendus(row.evenementId);
      assert.strictEqual(attendus.length, 0);
      const preview = await service.previewAttendus(row.evenementId);
      assert.strictEqual(preview.count, 0);
    }
  });

  await record('12 — aucun participant fictif créé', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    assert.strictEqual(await repo.countTable('scope_personnes'), 0);
    assert.strictEqual(await repo.countTable('scope_participations'), 0);
  });

  await record('13 — DAP/Y2 17.03 conservé sans reconstruction', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const listed = await service.listEvenements({ annee: 2026, domaineCode: 'DAP' });
    const y2 = listed.evenements.find((item) => item.evenement.date === '2026-03-17');
    assert.ok(y2);
    assert.strictEqual(y2.evenement.origine, 'LEGACY_AGGREGATED');
    const legacy = y2.legacy;
    assert.strictEqual(legacy.nb_convoques, 18);
    assert.strictEqual(legacy.nb_presents, 16);
    assert.strictEqual(legacy.nb_excuses, 2);
    assert.strictEqual(legacy.payload_v67.nb_ext_dap_y1, 1);
    assert.strictEqual(legacy.payload_v67.nb_ext_dap_total, 1);
    assert.strictEqual(legacy.payload_v67.total_detail, 18);
    assert.strictEqual(legacy.payload_v67.total_attendu, 19);
    assert.strictEqual((await repo.listAttendus(y2.evenement.evenement_id)).length, 0);
    assert.strictEqual((await repo.listParticipations(y2.evenement.evenement_id)).length, 0);
  });

  await record('14 — événement multi-cible ambigu non fusionné automatiquement', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText });
    const foba = preview.lignes.filter((l) => l.date === '2026-02-25');
    assert.strictEqual(foba.length, 2);
    assert.ok(foba.every((l) => l.groupingNonFusionne));
    assert.ok(foba.every((l) => l.groupingAArbitrer === false));
    const dps = preview.lignes.filter((l) => l.date === '2026-03-24');
    assert.ok(dps.every((l) => l.groupingNonFusionne));
    assert.strictEqual(dps.length, 2);
    const committed = await service.commitImportEvenements({ csvText }, { sub: 't' });
    const fobaCreated = committed.created.filter((c) => preview.lignes.find((l) => l.ligneNo === c.ligneNo && l.domaine === 'FOBA'));
    assert.strictEqual(fobaCreated.length, 2);
    const ids = fobaCreated.map((c) => c.evenementId);
    assert.notStrictEqual(ids[0], ids[1]);
    assert.strictEqual((await repo.listEventCibleIds(ids[0])).length, 1);
    assert.strictEqual((await repo.listEventCibleIds(ids[1])).length, 1);
  });

  await record('15 — transaction rollback si erreur commit', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    const original = repo.insertLegacy;
    let n = 0;
    repo.insertLegacy = async function(row){
      n += 1;
      if (n === 2) throw new Error('forced-commit-failure');
      return original.call(this, row);
    };
    await assert.rejects(
      () => service.commitImportEvenements({ csvText }, { sub: 't' }),
      (error) => String(error.message).includes('forced-commit-failure')
    );
    assert.strictEqual(await repo.countTable('scope_evenements'), 0);
    assert.strictEqual(await repo.countTable('scope_legacy_aggregates'), 0);
    assert.strictEqual(await repo.countTable('scope_imports'), 0);
    assert.strictEqual(await repo.countTable('scope_import_lignes'), 0);
  });

  await record('16 — aucun impact tables monitoring_f7_*', async () => {
    const files = [
      'assets/js/scope-csv-import.js',
      'netlify/functions/_scope-service.js',
      'netlify/functions/_scope-pg.js',
      'database/migrations/20260819_scope_data_5.sql'
    ];
    for (const rel of files) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(!/monitoring_f7_records/.test(text));
      assert.ok(!/monitoring_f7_imported_events/.test(text));
      assert.ok(!/delete from monitoring_f7_/.test(text));
      assert.ok(!/update monitoring_f7_/.test(text));
    }
  });

  await record('17 — aucun impact ORION', async () => {
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(index.includes('Monitoring F7 v67.0'));
    const data5 = fs.readFileSync(path.join(ROOT, 'database/migrations/20260819_scope_data_5.sql'), 'utf8');
    assert.ok(!/orion/i.test(data5));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Importer un programme CSV'));
    assert.ok(ui.includes('#/exercices/import'));
    assert.strictEqual(logic.parseHash('#/exercices/import').screen, 'import');
  });

  await record('Bascule non définie bloque le commit', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText });
    assert.ok(preview.lignes.every((l) => l.statut === 'ERREUR' && l.code === 'bascule_non_definie'));
    await assert.rejects(
      () => service.commitImportEvenements({ csvText }, { sub: 't' }),
      (error) => error instanceof HttpError && error.error === 'import_refuse'
    );
    assert.strictEqual(await repo.countTable('scope_evenements'), 0);
  });

  await record('PLANIFIE n’utilise pas les agrégats comme nominatif', async () => {
    const repo = createMemoryRepo();
    const y4 = await repo.findCible('DAP', 'Y4');
    await repo.upsertRegleBascule({
      portee: 'CIBLE',
      cible_id: y4.cible_id,
      domaine_code: 'DAP',
      date_bascule: '2026-08-19',
      commentaire: 'test'
    });
    const personne = await repo.insertPersonne({ nip: 'P1', nom: 'Test', prenom: 'Pilote' });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: y4.cible_id, date_debut: '2026-08-19' });
    const planCsv = [
      csv.REQUIRED_COLUMNS.join(';'),
      '2026-09-01;DAP;Y4;Exercice DAP 1;Oui;16;0;0;0;0;0;0;16;0;0;0;0;0;0;16;16;""'
    ].join('\n');
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText: planCsv });
    assert.strictEqual(preview.lignes[0].typePropose, 'PLANIFIE');
    const committed = await service.commitImportEvenements({ csvText: planCsv }, { sub: 't' });
    const id = committed.created[0].evenementId;
    const ev = await repo.getEvent(id);
    assert.strictEqual(ev.origine, 'NOMINATIF');
    assert.strictEqual((await repo.listAttendus(id)).length, 0);
    assert.strictEqual((await repo.listParticipations(id)).length, 0);
    assert.strictEqual((await repo.listLegacy()).length, 0);
    const attendus = await service.previewAttendus(id);
    assert.strictEqual(attendus.count, 1);
  });

  await record('a_comptabiliser n’est pas REALISE + modele → libelle', async () => {
    const repo = createMemoryRepo();
    await withBasculeTest(repo);
    const service = createScopeService(repo);
    await service.commitImportEvenements({ csvText }, { sub: 't' });
    const listed = await service.listEvenements({ annee: 2026 });
    assert.ok(listed.evenements.every((item) => item.evenement.statut === 'PLANIFIE'));
    assert.ok(listed.evenements.every((item) => item.evenement.libelle.startsWith('Exercice ')));
    const y4 = listed.evenements.find((item) => item.evenement.date === '2026-03-31');
    assert.strictEqual(y4.legacy.payload_v67.a_comptabiliser, true);
  });

  await record('UI import / pas d’onglet principal', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Importer un programme CSV'));
    assert.ok(!ui.includes('data-nav="import"'));
    const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
    assert.ok(!html.includes('Monitoring F7 v67.0'));
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    assert.ok(css.includes('.scope-import-drop'));
    assert.ok(css.includes('grid-template-columns:\n  1fr') || css.includes('grid-template-columns: 1fr'));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
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
