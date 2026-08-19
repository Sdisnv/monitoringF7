#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const csv = require('../assets/js/scope-csv-import.js');

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

function lineCsv(date, domaine, publicCible, modele){
  return [
    csv.REQUIRED_COLUMNS.join(';'),
    `${date};${domaine};${publicCible};${modele};Oui;10;0;0;0;0;0;0;10;0;0;0;0;0;0;10;10;""`
  ].join('\n');
}

async function seedY4(repo){
  const y4 = await repo.findCible('DAP', 'Y4');
  await repo.upsertRegleBascule({
    portee: 'CIBLE',
    cible_id: y4.cible_id,
    domaine_code: 'DAP',
    date_bascule: '2026-08-19',
    commentaire: 'Pilote nominatif DAP/Y4. Seule cible qualifiée.'
  });
  return y4;
}

(async () => {
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');

  await record('Règle cible prioritaire sur domaine', async () => {
    const repo = createMemoryRepo();
    const y4 = await repo.findCible('DAP', 'Y4');
    await repo.upsertRegleBascule({
      portee: 'DOMAINE', domaine_code: 'DAP', date_bascule: '2026-01-01', commentaire: 'domaine trop tôt'
    });
    await repo.upsertRegleBascule({
      portee: 'CIBLE', cible_id: y4.cible_id, domaine_code: 'DAP', date_bascule: '2026-08-19', commentaire: 'cible gagne'
    });
    const resolved = csv.resolveBasculeRule(y4.cible_id, 'DAP', await repo.listReglesBascule());
    assert.strictEqual(resolved.source, 'CIBLE');
    assert.strictEqual(resolved.date_bascule, '2026-08-19');
    const preview = await createScopeService(repo).previewImportEvenements({
      csvText: lineCsv('2026-03-31', 'DAP', 'Y4', 'Exercice DAP 1')
    });
    assert.strictEqual(preview.lignes[0].typePropose, 'LEGACY');
    assert.strictEqual(preview.lignes[0].bascule.resolved.source, 'CIBLE');
  });

  await record('Fallback domaine si un jour utilisé', async () => {
    const repo = createMemoryRepo();
    await repo.upsertRegleBascule({
      portee: 'DOMAINE', domaine_code: 'DAP', date_bascule: '2026-08-19', commentaire: 'fallback domaine'
    });
    const service = createScopeService(repo);
    const avant = await service.previewImportEvenements({ csvText: lineCsv('2026-03-19', 'DAP', 'Y3', 'Exercice DAP 1') });
    assert.strictEqual(avant.lignes[0].typePropose, 'LEGACY');
    assert.strictEqual(avant.lignes[0].bascule.resolved.source, 'DOMAINE');
    const apres = await service.previewImportEvenements({ csvText: lineCsv('2026-09-01', 'DAP', 'Y3', 'Exercice DAP 1') });
    assert.strictEqual(apres.lignes[0].typePropose, 'PLANIFIE');
    assert.strictEqual(apres.lignes[0].bascule.resolved.source, 'DOMAINE');
  });

  await record('Fallback global si un jour utilisé', async () => {
    const repo = createMemoryRepo();
    await repo.upsertRegleBascule({
      portee: 'GLOBAL', date_bascule: '2026-08-19', commentaire: 'fallback global'
    });
    const service = createScopeService(repo);
    const avant = await service.previewImportEvenements({ csvText: lineCsv('2026-02-25', 'FOBA', 'FOBA 1', 'Exercice FOBA 1') });
    assert.strictEqual(avant.lignes[0].typePropose, 'LEGACY');
    assert.strictEqual(avant.lignes[0].bascule.resolved.source, 'GLOBAL');
    const apres = await service.previewImportEvenements({ csvText: lineCsv('2026-09-01', 'FOBA', 'FOBA 1', 'Exercice FOBA 1') });
    assert.strictEqual(apres.lignes[0].typePropose, 'PLANIFIE');
    assert.strictEqual(apres.lignes[0].bascule.resolved.source, 'GLOBAL');
  });

  await record('Absence de règle → bascule_non_definie', async () => {
    const repo = createMemoryRepo();
    const preview = await createScopeService(repo).previewImportEvenements({ csvText });
    assert.ok(preview.lignes.every((l) => l.code === 'bascule_non_definie'));
    assert.strictEqual(csv.earliestNominativeHorizon([]), null);
  });

  await record('DAP/Y4 avant 19.08 = legacy', async () => {
    const repo = createMemoryRepo();
    await seedY4(repo);
    const preview = await createScopeService(repo).previewImportEvenements({
      csvText: lineCsv('2026-03-31', 'DAP', 'Y4', 'Exercice DAP 1')
    });
    assert.strictEqual(preview.lignes[0].typePropose, 'LEGACY');
    assert.strictEqual(preview.lignes[0].code, 'legacy');
    assert.strictEqual(preview.lignes[0].bascule.resolved.source, 'CIBLE');
  });

  await record('DAP/Y4 après 19.08 = planifié nominatif', async () => {
    const repo = createMemoryRepo();
    await seedY4(repo);
    const preview = await createScopeService(repo).previewImportEvenements({
      csvText: lineCsv('2026-09-01', 'DAP', 'Y4', 'Exercice DAP 1')
    });
    assert.strictEqual(preview.lignes[0].typePropose, 'PLANIFIE');
    assert.strictEqual(preview.lignes[0].code, 'planifie');
  });

  await record('DAP/Y3 après 19.08 sans règle = refus', async () => {
    const repo = createMemoryRepo();
    await seedY4(repo);
    const preview = await createScopeService(repo).previewImportEvenements({
      csvText: lineCsv('2026-09-01', 'DAP', 'Y3', 'Exercice DAP 1')
    });
    assert.strictEqual(preview.lignes[0].statut, 'ERREUR');
    assert.strictEqual(preview.lignes[0].code, 'bascule_non_definie');
    assert.strictEqual(preview.lignes[0].typePropose, null);
    await assert.rejects(
      () => createScopeService(repo).commitImportEvenements({
        csvText: lineCsv('2026-09-01', 'DAP', 'Y3', 'Exercice DAP 1')
      }, { sub: 't' }),
      (error) => error instanceof HttpError && error.error === 'import_refuse'
    );
  });

  await record('Date PostgreSQL (objet Date) → horizon + 8 LEGACY', async () => {
    const repo = createMemoryRepo();
    await seedY4(repo);
    const orig = repo.listReglesBascule.bind(repo);
    repo.listReglesBascule = async () => {
      const rows = await orig();
      return rows.map((row) => Object.assign({}, row, {
        date_bascule: new Date(`${row.date_bascule}T00:00:00.000Z`)
      }));
    };
    const rules = await repo.listReglesBascule();
    assert.strictEqual(csv.earliestNominativeHorizon(rules), '2026-08-19');
    const preview = await createScopeService(repo).previewImportEvenements({ csvText });
    assert.strictEqual(preview.lignes.length, 8);
    assert.ok(preview.lignes.every((l) => l.typePropose === 'LEGACY'));
    assert.ok(!preview.lignes.some((l) => l.code === 'bascule_non_definie'));
    const y2 = preview.lignes.find((l) => l.niveauCode === 'Y2');
    assert.strictEqual(y2.code, 'legacy_avant_horizon_nominatif');
  });

  await record('8 lignes preview = LEGACY avec seule règle DAP/Y4', async () => {
    const repo = createMemoryRepo();
    await seedY4(repo);
    const preview = await createScopeService(repo).previewImportEvenements({ csvText });
    assert.strictEqual(preview.ecriture, false);
    assert.strictEqual(preview.lignes.length, 8);
    assert.ok(preview.lignes.every((l) => l.typePropose === 'LEGACY'));
    assert.ok(preview.lignes.every((l) => l.statut !== 'ERREUR'));
    assert.ok(!preview.lignes.some((l) => l.typePropose === 'PLANIFIE'));
    assert.ok(!preview.lignes.some((l) => l.code === 'bascule_non_definie'));
    const y4 = preview.lignes.find((l) => l.niveauCode === 'Y4');
    assert.strictEqual(y4.code, 'legacy');
    const y2 = preview.lignes.find((l) => l.niveauCode === 'Y2');
    assert.strictEqual(y2.code, 'legacy_avant_horizon_nominatif');
    assert.strictEqual(preview.horizonNominatifConnu, '2026-08-19');
    assert.strictEqual(preview.profil, 'monitoring_exercices_sdis_22cols');
  });

  await record('FOBA/DPS non fusionnés + DAP/Y2 18/19', async () => {
    const repo = createMemoryRepo();
    await seedY4(repo);
    const service = createScopeService(repo);
    const preview = await service.previewImportEvenements({ csvText });
    const foba = preview.lignes.filter((l) => l.domaine === 'FOBA');
    const dps = preview.lignes.filter((l) => l.domaine === 'DPS');
    assert.strictEqual(foba.length, 2);
    assert.strictEqual(dps.length, 2);
    assert.ok(foba.every((l) => l.groupingNonFusionne && l.typePropose === 'LEGACY'));
    assert.ok(dps.every((l) => l.groupingNonFusionne && l.typePropose === 'LEGACY'));
    const y2 = preview.lignes.find((l) => l.date === '2026-03-17');
    assert.strictEqual(y2.numbers.nb_convoques, 18);
    assert.strictEqual(y2.numbers.total_attendu, 19);
    assert.strictEqual(y2.numbers.total_detail, 18);
    const committed = await service.commitImportEvenements({ csvText }, { sub: 't' });
    assert.strictEqual(committed.summary.imported, 8);
    const listed = await service.listEvenements({ annee: 2026 });
    const fobaEv = listed.evenements.filter((i) => i.evenement.domaine_code === 'FOBA');
    assert.strictEqual(fobaEv.length, 2);
    assert.notStrictEqual(fobaEv[0].evenement.evenement_id, fobaEv[1].evenement.evenement_id);
    const y2ev = listed.evenements.find((i) => i.evenement.date === '2026-03-17');
    assert.strictEqual(y2ev.legacy.payload_v67.total_attendu, 19);
    assert.strictEqual(y2ev.legacy.payload_v67.total_detail, 18);
    assert.strictEqual(y2ev.legacy.payload_v67.a_comptabiliser_scope, false);
    assert.strictEqual(y2ev.legacy.payload_v67.legacy_inclus_stats, true);
    assert.strictEqual(y2ev.evenement.libelle, 'Exercice DAP 1');
    assert.strictEqual(y2ev.legacy.payload_v67.modele, 'Exercice DAP 1');
    assert.strictEqual(await repo.countTable('scope_personnes'), 0);
    assert.strictEqual(await repo.countTable('scope_attendus'), 0);
    assert.strictEqual(await repo.countTable('scope_participations'), 0);
  });

  await record('Seed SQL : uniquement DAP/Y4, pas les autres cibles', async () => {
    const sql = fs.readFileSync(path.join(ROOT, 'database/migrations/20260819_scope_data_5_r1.sql'), 'utf8');
    assert.ok(sql.includes("niveau_code = 'Y4'"));
    assert.ok(sql.includes('2026-08-19'));
    assert.ok(!/niveau_code = 'Y1'/.test(sql));
    assert.ok(!/niveau_code = 'Y2'/.test(sql));
    assert.ok(!/niveau_code = 'Y3'/.test(sql));
    assert.ok(!/FOBA/.test(sql.split('insert into scope_regles_bascule')[1] || ''));
    const repo = createMemoryRepo();
    await seedY4(repo);
    const rules = await repo.listReglesBascule();
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].portee, 'CIBLE');
    const y4 = await repo.findCible('DAP', 'Y4');
    assert.strictEqual(rules[0].cible_id, y4.cible_id);
  });

  await record('Profil v67 actuel refusé, pas mélangé', async () => {
    const v67 = 'date_evenement;domaine;public_cible;evenement;stat_com;a_comptabiliser\n2026-03-31;DAP;Y4;Exercice;011;Oui';
    const parsed = csv.parseExercicesCsv(v67);
    assert.strictEqual(parsed.ok, false);
    assert.strictEqual(parsed.error, 'profil_csv_non_supporte');
  });

  await record('Wrapper CSV bundlé (require statique, pas path.join)', async () => {
    const wrapper = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-csv-import.js'), 'utf8');
    assert.ok(wrapper.includes("require('../../assets/js/scope-csv-import.js')"));
    assert.ok(!/path\.join/.test(wrapper));
    const toml = fs.readFileSync(path.join(ROOT, 'netlify.scope.toml'), 'utf8');
    assert.ok(toml.includes('included_files = ["assets/js/scope-csv-import.js"]'));
  });

  await record('Aucun impact Monitoring v67 / ORION', async () => {
    const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(index.includes('Monitoring F7 v67.0'));
    const files = [
      'database/migrations/20260819_scope_data_5_r1.sql',
      'assets/js/scope-csv-import.js',
      'netlify/functions/_scope-schema.js'
    ];
    for (const rel of files) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(!/monitoring_f7_records/.test(text));
      assert.ok(!/orion-sdisnv/.test(text));
    }
  });

  const failed = results.filter((r) => r.status === 'NOK');
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
