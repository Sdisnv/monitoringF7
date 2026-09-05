#!/usr/bin/env node
'use strict';

/** SCOPE-QUAL-FINISH-1 — finition avant recette MOA. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeDashboardService } = require('../netlify/lib/_scope-dashboard-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const { permutationsDataset } = require('../netlify/lib/_scope-graphs');
const {
  isQualificationEvenement,
  isTestPersonnelNip,
  wantsQualification
} = require('../netlify/lib/_scope-qualification');
const logic = require('../assets/js/scope-ui-logic.js');
const charts = require('../assets/js/scope-charts.js');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'test-qual-finish-1', roles: ['sdis-admin'], displayName: 'Qual Finish' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function seedPeople(repo, cibleId, count, prefix){
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: `${prefix}${String(i).padStart(3, '0')}`,
      nom: `Nom${i}`,
      prenom: `Prenom${i}`
    });
    await repo.insertAffectation({
      personne_id: personne.personne_id,
      cible_id: cibleId,
      date_debut: '2026-01-01'
    });
    people.push(personne);
  }
  return people;
}

async function closeWith(service, eventId, people, statuses){
  let version = 1;
  await service.figerPopulation(eventId, { baseVersion: version }, ACTOR);
  version += 1;
  const participations = people.map((p, i) => {
    const spec = statuses[i];
    if(typeof spec === 'string') return { personneId: p.personne_id, statut: spec };
    return { personneId: p.personne_id, ...spec };
  });
  await service.enregistrerParticipations(eventId, { baseVersion: version, participations }, ACTOR);
  version += 1;
  return service.cloturer(eventId, { baseVersion: version }, ACTOR);
}

(async () => {
  await record('1 — list loading ≠ empty', async () => {
    assert.strictEqual(logic.listViewState({ ready: false, error: null, count: 0 }), 'loading');
    assert.notStrictEqual(logic.listViewState({ ready: false, error: null, count: 0 }), 'empty');
    assert.strictEqual(logic.loadingMessage('exercices'), 'Chargement des événements…');
    assert.strictEqual(logic.emptyMessage('exercices'), 'Aucun événement sur la période choisie.');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('listReady'));
    assert.ok(ui.includes('loadingMessage(\'exercices\')'));
    assert.ok(ui.includes('listViewState'));
  });

  await record('2 — list error distinct', async () => {
    assert.strictEqual(logic.listViewState({ ready: false, error: 'timeout', count: 0 }), 'error');
    assert.strictEqual(logic.listViewState({ ready: true, error: 'timeout', count: 0 }), 'error');
    assert.notStrictEqual(logic.errorMessage('exercices'), logic.emptyMessage('exercices'));
    assert.notStrictEqual(logic.errorMessage('exercices'), logic.loadingMessage('exercices'));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('scope-state-error'));
    assert.ok(ui.includes('listError'));
  });

  await record('3 — list batch', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Batch A', cibleIds: [g1.cible_id]
    }, ACTOR);
    await service.createEvenement({
      date: '2026-04-12', domaineCode: 'DPS', libelle: 'Batch B', cibleIds: [g1.cible_id]
    }, ACTOR);
    const listed = await service.listEvenements({ annee: 2026, domaineCode: 'DPS' });
    assert.strictEqual(listed.performance.mode, 'batch');
    assert.ok(listed.performance.eventCount >= 2);
    assert.ok(!listed.evenements.some((row) => row.participations));
    assert.ok(listed.evenements[0].evenement.evenement_id);
    assert.ok(listed.evenements[0].cibles);
    assert.ok('compteurs' in listed.evenements[0]);
  });

  await record('4 — pas N+1', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    for(let i = 0; i < 4; i += 1){
      await service.createEvenement({
        date: `2026-0${i + 3}-10`, domaineCode: 'DPS', libelle: `N+1 ${i}`, cibleIds: [g1.cible_id]
      }, ACTOR);
    }
    let attendus = 0;
    let parts = 0;
    let cibleIds = 0;
    const listAttendus = repo.listAttendus.bind(repo);
    const listParticipations = repo.listParticipations.bind(repo);
    const listEventCibleIds = repo.listEventCibleIds.bind(repo);
    repo.listAttendus = async (...args) => { attendus += 1; return listAttendus(...args); };
    repo.listParticipations = async (...args) => { parts += 1; return listParticipations(...args); };
    repo.listEventCibleIds = async (...args) => { cibleIds += 1; return listEventCibleIds(...args); };
    const listed = await service.listEvenements({ annee: 2026, domaineCode: 'DPS' });
    assert.ok(listed.evenements.length >= 4);
    assert.strictEqual(listed.performance.mode, 'batch');
    assert.strictEqual(attendus, 0);
    assert.strictEqual(parts, 0);
    assert.strictEqual(cibleIds, 0);
  });

  await record('5 — taux liste correct', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const people = await seedPeople(repo, g1.cible_id, 15, 'QF5');
    const created = await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'Taux liste', cibleIds: [g1.cible_id]
    }, ACTOR);
    const statuses = [
      ...Array(13).fill('PRESENT'),
      { statut: 'ABSENT_EXCUSE', motif_absence: 'MALADIE' },
      'ABSENT_NON_EXCUSE'
    ];
    await closeWith(service, created.evenement.evenement_id, people, statuses);
    const listed = await service.listEvenements({ annee: 2026, domaineCode: 'DPS' });
    const row = listed.evenements.find((item) => item.evenement.libelle === 'Taux liste');
    assert.ok(row);
    assert.strictEqual(row.compteurs.numerator, 13);
    assert.strictEqual(row.compteurs.denominator, 15);
    assert.strictEqual(row.compteurs.percentage, 86.7);
    assert.strictEqual(logic.displayTauxForList('REALISE', true, row.compteurs.percentage), logic.formatTaux(86.7));
  });

  await record('6 — permutation affichée DAP', async () => {
    const dataset = permutationsDataset({
      volumes: { presents: 10, permutations: 2 }
    }, 'DAP');
    assert.notStrictEqual(dataset.emptyReason, 'HORS_DAP');
    const html = charts.renderChartCard(dataset);
    assert.ok(html.includes('permutations') || html.includes('Permutation'));
    assert.ok(logic.shouldRenderPermutations('DAP', dataset));
  });

  await record('7 — permutation absente hors DAP', async () => {
    for(const domaine of ['PR', 'FOSPEC', 'DPS', 'FOBA']){
      const dataset = permutationsDataset({ volumes: { presents: 0, permutations: 0 } }, domaine);
      assert.strictEqual(dataset.emptyReason, 'HORS_DAP');
      assert.strictEqual(charts.renderChartCard(dataset), '');
      assert.strictEqual(logic.shouldRenderPermutations(domaine, dataset), false);
    }
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('shouldRenderPermutations'));
  });

  await record('8 — TEST masqué par défaut', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'TEST R1 nominatif', cibleIds: [g1.cible_id],
      identifiantExterne: 'TEST-R1'
    }, ACTOR);
    await service.createEvenement({
      date: '2026-04-12', domaineCode: 'DPS', libelle: 'Manœuvre réelle', cibleIds: [g1.cible_id]
    }, ACTOR);
    const hidden = await service.listEvenements({ annee: 2026, includeQualification: '0' });
    assert.ok(!hidden.evenements.some((row) => isQualificationEvenement(row.evenement)));
    assert.ok(hidden.evenements.some((row) => row.evenement.libelle === 'Manœuvre réelle'));
    assert.strictEqual(wantsQualification({ includeQualification: '0' }), false);
    assert.strictEqual(logic.isQualificationEvenement({ libelle: 'TEST R1 nominatif' }), true);
  });

  await record('9 — TEST visible option qualification', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'TEST IMPORT SCOPE — recette', cibleIds: [g1.cible_id]
    }, ACTOR);
    const included = await service.listEvenements({ annee: 2026 });
    const shown = await service.listEvenements({ annee: 2026, includeQualification: '1' });
    assert.ok(included.evenements.some((row) => /TEST IMPORT SCOPE/.test(row.evenement.libelle)));
    assert.ok(shown.evenements.some((row) => /TEST IMPORT SCOPE/.test(row.evenement.libelle)));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Inclure les données de qualification'));
    assert.ok(ui.includes('scope-include-qualification'));
  });

  await record('10 — LEGACY reste visible', async () => {
    assert.strictEqual(isQualificationEvenement({
      libelle: 'TEST historique',
      origine: 'LEGACY_AGGREGATED',
      mode_suivi: 'LEGACY'
    }), false);
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    await service.createEvenement({
      date: '2024-03-12', domaineCode: 'DPS', libelle: 'Historique agrégé 2024',
      cibleIds: [g1.cible_id], origine: 'LEGACY_AGGREGATED'
    }, ACTOR);
    await service.createEvenement({
      date: '2026-03-12', domaineCode: 'DPS', libelle: 'TEST ANNULE recette',
      cibleIds: [g1.cible_id]
    }, ACTOR);
    const listed = await service.listEvenements({ annee: 2024, includeQualification: '0' });
    const listed26 = await service.listEvenements({ annee: 2026, includeQualification: '0' });
    assert.ok(listed.evenements.some((row) => row.evenement.origine === 'LEGACY_AGGREGATED'));
    assert.ok(!listed26.evenements.some((row) => /TEST ANNULE/.test(row.evenement.libelle)));
  });

  await record('11 — personnes TEST masquées actifs', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    await repo.insertPersonne({ nip: '88011', nom: 'Reel', prenom: 'Ada' });
    const real = (await repo.listPersonnes()).find((p) => p.nip === '88011');
    await repo.insertAffectation({ personne_id: real.personne_id, cible_id: y4.cible_id, date_debut: '2026-01-01' });
    await repo.insertPersonne({ nip: '99111', nom: 'Qual', prenom: 'Test' });
    const hidden = await persons.directory({ year: 2026, statut: 'actifs', includeQualification: '0' });
    assert.ok(hidden.personnes.some((p) => p.nip === '88011'));
    assert.ok(!hidden.personnes.some((p) => p.nip === '99111'));
    assert.ok(isTestPersonnelNip('99111'));
    assert.ok(isTestPersonnelNip('TSTR2A'));
    assert.ok(!isTestPersonnelNip('88011'));
  });

  await record('12 — personnes TEST visibles archivés qualification', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const test = await repo.insertPersonne({ nip: '99136', nom: 'TestArch', prenom: 'Qual' });
    await repo.insertAffectation({ personne_id: test.personne_id, cible_id: y4.cible_id, date_debut: '2026-01-01' });
    await service.archiverPersonne(test.personne_id, { date: '2026-06-01', type: 'SORTI' }, ACTOR);
    const without = await persons.directory({ year: 2026, statut: 'archives', includeQualification: '0' });
    const withQ = await persons.directory({ year: 2026, statut: 'archives', includeQualification: '1' });
    assert.ok(!without.personnes.some((p) => p.nip === '99136'));
    assert.ok(withQ.personnes.some((p) => p.nip === '99136'));
  });

  await record('13 — P0 TEST non visible par défaut', async () => {
    const repo = createMemoryRepo();
    const alerts = createScopeAlertsService(repo);
    const g1 = await repo.findCible('DPS', 'G1');
    const testEv = await repo.insertEvenement({
      date: '2026-08-01', domaine_code: 'DPS', libelle: 'TEST PLANIFIE R1',
      statut: 'PLANIFIE', origine: 'NOMINATIF', mode_suivi: 'NOMINATIF',
      identifiant_externe: 'TEST-R1',
      cible_ids: [g1.cible_id]
    });
    const realEv = await repo.insertEvenement({
      date: '2026-08-02', domaine_code: 'DPS', libelle: 'Manœuvre réelle échu',
      statut: 'PLANIFIE', origine: 'NOMINATIF', mode_suivi: 'NOMINATIF',
      cible_ids: [g1.cible_id]
    });
    const hidden = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19', includeQualification: '0' });
    const shown = await alerts.listAlerts({ year: 2026, preset: 'YEAR', today: '2026-08-19', includeQualification: '1' });
    assert.ok(!hidden.alerts.some((a) => a.eventId === testEv.evenement_id));
    assert.ok(hidden.alerts.some((a) => a.eventId === realEv.evenement_id && a.level === 'P0'));
    assert.ok(shown.alerts.some((a) => a.eventId === testEv.evenement_id && a.level === 'P0'));
  });

  await record('14 — import natif non régressé', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const contract = require('../assets/js/scope-import-contract.js');
    const example = fs.readFileSync(path.join(ROOT, 'assets/csv/SCOPE_Programme_Exercices_Exemple.csv'), 'utf8');
    assert.ok(ui.includes('SCOPE_Programme_Exercices_Exemple.csv'));
    assert.ok(ui.includes('Programme à importer'));
    assert.strictEqual(contract.detectCsvFormat(contract.parseCsv(example).headers), 'SCOPE_EXERCICES_CSV_1');
    const preview = contract.previewScopeImport(example, { cibles: await createMemoryRepo().listCibles() });
    assert.ok(preview.lignes.length >= 1);
  });

  await record('15 — dashboard non régressé', async () => {
    const repo = createMemoryRepo();
    const dashboard = createScopeDashboardService(repo);
    const dash = await dashboard.dashboard({ year: 2026, preset: 'YEAR' });
    assert.ok(dash.officiel);
    assert.ok(dash.graphs);
    assert.ok(dash.alerts);
    assert.strictEqual(dash.graphs.permutations.emptyReason, 'HORS_DAP');
    const hidden = await dashboard.dashboard({ year: 2026, preset: 'YEAR', includeQualification: '0' });
    assert.ok(hidden.officiel);
  });

  await record('16 — reports non régressé', async () => {
    const repo = createMemoryRepo();
    const report = await generateReport(repo, {
      kind: 'PERIOD', year: 2026, preset: 'YEAR', includeQualification: '0'
    }, ACTOR, { generatedAt: '2026-08-20T08:00:00.000Z' });
    assert.ok(Buffer.isBuffer(report.buffer));
    assert.ok(report.filename);
    assert.ok(report.sha256);
  });

  await record('17 — personnel non régressé', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const y4 = await repo.findCible('DAP', 'Y4');
    const p = await repo.insertPersonne({ nip: '88017', nom: 'Reel', prenom: 'Moa' });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: y4.cible_id, date_debut: '2026-01-01' });
    const dir = await persons.directory({ year: 2026, statut: 'actifs' });
    assert.strictEqual(dir.performance.mode, 'batch');
    assert.ok(dir.personnes.some((row) => row.nip === '88017'));
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Chargement du personnel') || ui.includes("loadingMessage('personnel')"));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status}\t${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  if(failed.length){
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();
