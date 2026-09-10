#!/usr/bin/env node
'use strict';

/** SCOPE — CYCLES-PDF-DENSITY-READABILITY-FINAL-7.4 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { renderReportPdf } = require('../netlify/lib/_scope-pdf-renderer');

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

function person(id, nip, nom, prenom, grade){
  return { personne_id: id, id, nip, nom, prenom, grade };
}

function prEvent(id, index){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-density',
    domaine_code: 'PR',
    date: `2026-03-${String(index).padStart(2, '0')}`,
    libelle: `Exercice PR 1.${index} | Base`,
    code_cours: `PR.1.${index}`,
    statut: 'REALISE',
    pr_exercise_group_key: 'NO_CYCLE:PR:1',
    pr_session_key: `NO_CYCLE:PR:1.${index}`
  };
}

function participation(evenementId, personneId, statut, motif = null, role = 'PARTICIPANT'){
  return { evenement_id: evenementId, personne_id: personneId, statut, role, motif_absence: motif, source: 'SAISIE' };
}

async function seedPrRepo(){
  const repo = createMemoryRepo();
  const people = [
    person('present', '50001', 'Marques', 'Luis', 'Sgt chef instr'),
    person('excuse', '50002', 'Auchter', 'Anthony', 'Cap adj'),
    person('dispense', '50003', 'Martin', 'Celine', 'Maj instr'),
    person('absent', '25146', 'Sauser', 'Philippe', 'Cap instr'),
    person('formateur', '50005', 'Dupuis', 'Marc', 'Lt instr')
  ];
  const events = [prEvent('pr1-4', 4), prEvent('pr1-5', 5), prEvent('pr1-6', 6)];
  for(const p of people) await repo.upsertPersonne(p);
  for(const ev of events) await repo.insertEvenement(ev);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-density',
    cycle_key: 'NO_CYCLE:PR:1',
    annee: 2026,
    date_debut: '2026-03-04',
    date_fin: '2026-03-06',
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Exercice PR 1 – Base',
    statut: 'REALISE',
    source_type: 'TEST'
  });
  for(const p of people){
    await repo.upsertAttendu({ evenement_id: 'pr1-6', personne_id: p.personne_id, inclus: true, origine: 'TEST' });
  }
  await repo.upsertParticipation(participation('pr1-5', 'present', 'PRESENT'));
  await repo.upsertParticipation(participation('pr1-4', 'excuse', 'ABSENT_EXCUSE', 'ACCIDENT_MALADIE'));
  await repo.upsertParticipation(participation('pr1-4', 'dispense', 'DISPENSE', 'FORMATION_HORS_SDIS'));
  await repo.upsertParticipation(participation('pr1-6', 'absent', 'ABSENT_NON_EXCUSE'));
  await repo.upsertParticipation(participation('pr1-5', 'formateur', 'PRESENT'));
  await repo.upsertParticipation(participation('pr1-5', 'formateur', 'PRESENT', null, 'FORMATEUR'));
  return repo;
}

async function seedDapMultiSessionRepo(){
  const repo = createMemoryRepo();
  const people = [
    person('dap-present-1', '71001', 'Multi', 'Un', 'Sap'),
    person('dap-present-2', '71002', 'Multi', 'Deux', 'App'),
    person('dap-excuse', '71003', 'Multi', 'Trois', 'Cap'),
    person('dap-dispense', '71004', 'Multi', 'Quatre', 'Sgt')
  ];
  for(const p of people) await repo.upsertPersonne(p);
  const s1 = await repo.insertEvenement({ evenement_id: 'dap-ms-1', date: '2026-04-23', domaine_code: 'DAP', libelle: 'Formation groupée DAP 1.1', statut: 'REALISE', cible_ids: [] });
  const s2 = await repo.insertEvenement({ evenement_id: 'dap-ms-2', date: '2026-05-07', domaine_code: 'DAP', libelle: 'Formation groupée DAP 1.2', statut: 'REALISE', cible_ids: [] });
  const ms = await repo.upsertMultisessionV2({ multisession_id: 'ms-dap-density', code: 'DAP-FORMATION-GROUPEE-DENSITY', label: 'Formation groupée DAP', domain: 'DAP', period: { from: '2026-04-23', to: '2026-05-07' }, status: 'CLOTUREE' });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s1.evenement_id, sequence: 1, status: 'CLOTUREE' });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s2.evenement_id, sequence: 2, status: 'CLOTUREE' });
  for(const p of people) await repo.upsertMultisessionV2Population({ multisession_id: ms.multisession_id, person_id: p.personne_id });
  await repo.upsertParticipation(participation(s1.evenement_id, 'dap-present-1', 'PRESENT'));
  await repo.upsertParticipation(participation(s2.evenement_id, 'dap-present-2', 'PRESENT'));
  await repo.upsertParticipation(participation(s2.evenement_id, 'dap-excuse', 'ABSENT_EXCUSE', 'PROFESSIONNEL'));
  await repo.upsertParticipation(participation(s2.evenement_id, 'dap-dispense', 'DISPENSE', 'FORMATION_HORS_SDIS'));
  return repo;
}

(async () => {
  await record('01 — PR nominatif compact sans libellés redondants', async () => {
    const repo = await seedPrRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    const present = model.nominatif.find((row) => row.nip === '50001');
    eq(present.grade, 'Sgt chef instr', 'grade complet');
    eq(present.resultat, 'PR 1.5', 'session PR compacte');
    eq(present.information, '—', 'pas de Participation validée répétée');
    ok(!JSON.stringify(model.nominatif).includes('| Base'), 'Base non répété sur chaque ligne');
    ok(!JSON.stringify(model.nominatif).includes('Participation validée'), 'Participation validée non répétée');
  });

  await record('02 — PR motifs et rôles compacts conservés', async () => {
    const repo = await seedPrRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    eq(model.nominatif.find((row) => row.nip === '50002').information, 'Accident / maladie');
    eq(model.nominatif.find((row) => row.nip === '50003').information, 'Formation hors SDIS');
    eq(model.nominatif.find((row) => row.nip === '50005').roles, 'Formateur + participant');
  });

  await record('03 — ABSENT traité hors restant à traiter', async () => {
    const repo = await seedPrRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    const absent = model.nominatif.find((row) => row.nip === '25146');
    eq(absent.etat, 'Absent');
    eq(absent.resultat, 'PR 1.6');
    eq(absent.information, 'Statut renseigné');
    ok(!JSON.stringify(model.remainingRows || []).includes('25146'), 'Sauser absent hors restant à traiter');
  });

  await record('04 — DAP Multi-session dossiers traités cohérents avec traitement 100 %', async () => {
    const repo = await seedDapMultiSessionRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'DAP' })).cycles[0];
    const detail = await createScopeCycleService(repo).getCycle(cycle.cycle_id);
    eq(detail.pilotage.kpis.population, 4);
    eq(detail.pilotage.kpis.dossiersTraites, 4);
    eq(detail.pilotage.kpis.resteATraiter, 0);
    eq(detail.pilotage.kpis.tauxTraitement, 100);
    eq(detail.pilotage.kpis.obligationsSatisfaites, 4);
  });

  await record('05 — DAP Multi-session libellés compacts et motifs conservés', async () => {
    const repo = await seedDapMultiSessionRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'DAP' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    eq(model.nominatif.find((row) => row.nip === '71001').resultat, 'DAP 1.1');
    eq(model.nominatif.find((row) => row.nip === '71002').resultat, 'DAP 1.2');
    eq(model.nominatif.find((row) => row.nip === '71003').resultat, 'Statut reconnu');
    eq(model.nominatif.find((row) => row.nip === '71003').information, 'Professionnel');
    eq(model.nominatif.find((row) => row.nip === '71004').information, 'Formation hors SDIS');
    ok(!JSON.stringify(model.remainingRows || []).includes('7100'), 'aucun faux À renseigner DAP');
  });

  await record('06 — PDF Cycle générable avec densité renforcée', async () => {
    const repo = await seedPrRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    const pdf = await renderReportPdf(model, { generatedAt: '2026-09-10T12:00:00Z' });
    ok(Buffer.isBuffer(pdf.buffer) && pdf.buffer.length > 1000, 'PDF Cycle non vide');
  });

  await record('07 — paramètres PDF densifiés et anti-orphelins conservés', () => {
    const pdf = read('netlify/lib/_scope-pdf-renderer.js');
    ok(pdf.includes('keepHeading'), 'orphan control conservé');
    ok(pdf.includes('rowH: 12'), 'hauteur de ligne Cycle réduite');
    ok(pdf.includes('rowFontSize: 7.3'), 'typographie légèrement densifiée');
    ok(pdf.includes('[54, 70, 58, 38, 70, 52, 64, 53]'), 'largeurs nominatives rééquilibrées');
    ok(pdf.includes('[56, 92, 76, 40, 92, 103]'), 'largeurs encadrement rééquilibrées');
  });

  await record('08 — projection documentaire compacte centralisée', () => {
    const report = read('netlify/lib/_scope-report-data.js');
    ok(report.includes('function compactCycleResultLabel'), 'helper de compaction central');
    ok(report.includes("return `PR ${pr[1]}`"), 'PR compacté');
    ok(report.includes("return `DAP ${dap[1]}`"), 'DAP compacté');
    ok(report.includes("return 'Formateur + participant';"), 'rôle mixte compacté');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`${failed.length} test(s) R7.4 en échec.`);
    process.exit(1);
  }
  console.log('SCOPE CYCLES R7.4 TESTS OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
