#!/usr/bin/env node
'use strict';

/** SCOPE — CYCLES-SEMANTIC-UX-REPORTING-FINISH-7.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { renderReportPdf } = require('../netlify/lib/_scope-pdf-renderer');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function person(id, nip, nom, prenom = 'Test', grade = 'Sap'){
  return { personne_id: id, id, nip, nom, prenom, grade };
}

function event(id, index, extra = {}){
  return {
    evenement_id: id,
    cycle_id: extra.cycle_id || null,
    domaine_code: extra.domaine_code || 'PR',
    date: extra.date || `2026-03-${String(index).padStart(2, '0')}`,
    libelle: extra.libelle || `Exercice PR 1.${index} | Base`,
    code_cours: extra.code_cours || `PR.1.${index}`,
    statut: extra.statut || 'REALISE',
    pr_exercise_group_key: extra.pr_exercise_group_key || 'NO_CYCLE:PR:1',
    pr_session_key: extra.pr_session_key || `NO_CYCLE:PR:1.${index}`
  };
}

function attendu(evenementId, personneId){
  return { evenement_id: evenementId, personne_id: personneId, inclus: true, origine: 'TEST' };
}

function part(evenementId, personneId, statut, motif = null){
  return { evenement_id: evenementId, personne_id: personneId, statut, role: 'PARTICIPANT', motif_absence: motif, source: 'SAISIE' };
}

async function seedCycleRepo(){
  const repo = createMemoryRepo();
  const people = [
    person('p-present', '10001', 'Present'),
    person('p-excuse', '10002', 'Excuse'),
    person('p-dispense', '10003', 'Dispense'),
    person('p-absent', '25146', 'Sauser', 'Philippe')
  ];
  for(const p of people) await repo.upsertPersonne(p);
  const events = [event('pr1-1', 1), event('pr1-2', 2)];
  for(const ev of events) await repo.insertEvenement(ev);
  const service = createScopeCycleService(repo);
  const attendus = people.flatMap((p) => events.map((ev) => attendu(ev.evenement_id, p.personne_id)));
  for(const row of attendus) await repo.upsertAttendu(row);
  await repo.upsertParticipation(part('pr1-1', 'p-present', 'PRESENT'));
  await repo.upsertParticipation(part('pr1-1', 'p-excuse', 'ABSENT_EXCUSE', 'PROFESSIONNEL'));
  await repo.upsertParticipation(part('pr1-1', 'p-dispense', 'DISPENSE', 'FORMATION_HORS_SDIS'));
  await repo.upsertParticipation(part('pr1-1', 'p-absent', 'ABSENT_NON_EXCUSE'));
  return { repo, service };
}

(async () => {
  await record('01 — ABSENT reste affiché Absent dans le formatter central', () => {
    eq(L.participationStatutLabel('ABSENT'), 'Absent');
    eq(L.participationStatutLabel('ABSENT_NON_EXCUSE'), 'Absent');
    ok(!read('assets/js/scope-ui-logic.js').includes("return 'Non excusé';"), 'aucune projection UI centrale vers Non excusé');
  });

  await record('02 — NIP 25146 ne devient pas Non excusé par projection réalisée', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(ui.includes('realiseStatutLabel'), 'fiche réalisée utilise le formatter');
    ok(ui.includes('L.participationStatutLabel(row.statut)'), 'projection réalisée passe par participationStatutLabel');
    eq(L.participationStatutLabel('ABSENT_NON_EXCUSE'), 'Absent');
  });

  await record('03 — Multi-session/Cycle : Excusé consolidé 100 % sans faux À renseigner principal', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(ui.includes("if (state === 'EXCUSE') return 'Excusé — obligation satisfaite';"), 'résultat principal Excusé consolidé');
    ok(ui.includes('aucune action requise'), 'information secondaire sans action à renseigner');
  });

  await record('04 — Multi-session/Cycle : Dispensé consolidé 100 % sans faux À renseigner principal', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(ui.includes("if (state === 'DISPENSE') return 'Dispensé — obligation satisfaite';"), 'résultat principal Dispensé consolidé');
    ok(ui.includes("['COMPLET', 'EXCUSE', 'DISPENSE'].includes(state)"), 'information consolidée masque les détails non actionnables');
  });

  await record('05 — titres PR générés métier sans année redondante', async () => {
    const { service } = await seedCycleRepo();
    const list = await service.listCycles({ annee: 2026, domaine: 'PR' });
    const cycle = list.cycles.find((row) => row.libelle === 'Exercice PR 1 – Base');
    ok(cycle, 'cycle PR dérivé trouvé');
    eq(cycle.libelle, 'Exercice PR 1 – Base');
    ok(!/2026/.test(cycle.libelle), 'pas d’année dans le titre métier');
  });

  await record('06 — PDF Cycle sans état tronqué ni codes techniques utilisateur', async () => {
    const { repo, service } = await seedCycleRepo();
    const cycle = (await service.listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    eq(model.title, 'Rapport de cycle — Exercice PR 1 – Base');
    eq(model.filename, '2026 - PR - Exercice PR 1 - Base - Rapport de cycle.pdf');
    const rowsText = JSON.stringify(model.nominatif || []);
    ok(rowsText.includes('Absent'), 'Absent présent en libellé métier');
    ok(!rowsText.includes('Non excusé'), 'Non excusé absent du rapport Cycle');
    ok(!rowsText.includes('NO_CYCLE'), 'clé technique absente du nominatif utilisateur');
    const pdf = await renderReportPdf(model, { generatedAt: '2026-09-10T12:00:00Z' });
    ok(Buffer.isBuffer(pdf.buffer) && pdf.buffer.length > 1000, 'PDF Cycle générable');
    ok(read('netlify/lib/_scope-pdf-renderer.js').includes('wrap: [false, false, false, false, true, true, false, true]'), 'colonne État wrappable dans PDF');
  });

  await record('07 — population / encadrement R7 conservés', () => {
    const rules = read('netlify/lib/_scope-cycle-rules.js');
    ok(rules.includes('isEncadrement: supportKeys.has(key)'), 'encadrement séparé conservé');
    ok(rules.includes('isPopulation,'), 'population explicite conservée');
    ok(rules.includes('participantOnlyOutsidePopulation'), 'hors population conservé');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`${failed.length} test(s) R7.2 en échec.`);
    process.exit(1);
  }
  console.log('SCOPE CYCLES R7.2 TESTS OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
