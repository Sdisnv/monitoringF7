#!/usr/bin/env node
'use strict';

/** SCOPE — CYCLES-POPULATION-PILOTAGE-REPORTING-REPAIR-7 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { renderReportPdf } = require('../netlify/lib/_scope-pdf-renderer');
const { buildCyclePilotage, computeCycleMetrics } = require('../netlify/lib/_scope-cycle-rules');

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
    cycle_id: extra.cycle_id || 'cycle-pr',
    domaine_code: extra.domaine_code || 'PR',
    date: extra.date || `2026-03-${String(index).padStart(2, '0')}`,
    libelle: extra.libelle || `PR ${index}`,
    code_cours: extra.code_cours || `PR.${index}`,
    statut: extra.statut || 'REALISE',
    pr_exercise_group_key: extra.pr_exercise_group_key || 'NO_CYCLE:PR:1',
    pr_session_key: extra.pr_session_key || `NO_CYCLE:PR:1.${index}`
  };
}

function attendu(evenementId, personneId){
  return { evenement_id: evenementId, personne_id: personneId, inclus: true, origine: 'TEST' };
}

function part(evenementId, personneId, statut, role = 'PARTICIPANT', motif = null){
  return { evenement_id: evenementId, personne_id: personneId, statut, role, motif_absence: motif, source: 'SAISIE' };
}

function cyclePersonne(personneId, extra = {}){
  return {
    cycle_id: extra.cycle_id || 'cycle-pr',
    personne_id: personneId,
    role_cycle: extra.role_cycle || 'PARTICIPANT',
    statut_cycle: extra.statut_cycle || 'ACTIF',
    exception_type: extra.exception_type || null,
    exercise_scope: extra.exercise_scope || []
  };
}

function prInput({ cycleNo = 1 } = {}){
  const cycleId = `cycle-pr-${cycleNo}`;
  const cycleKey = `NO_CYCLE:PR:${cycleNo}`;
  const cycle = { cycle_id: cycleId, cycle_key: cycleKey, domaine_code: 'PR', type_cycle: 'PAPR', libelle: `Cycle PR ${cycleNo}`, statut: 'REALISE' };
  const evenements = [1, 2, 3].map((idx) => event(`pr${cycleNo}-${idx}`, idx, {
    cycle_id: cycleId,
    pr_exercise_group_key: cycleKey,
    pr_session_key: `${cycleKey}.${idx}`
  }));
  const personnes = {
    p1: person('p1', '10101', 'Alpha'),
    p2: person('p2', '20202', 'Bravo'),
    p3: person('p3', '30303', 'Charlie'),
    p4: person('p4', '40404', 'Delta'),
    out1: person('out1', '26366', 'Beauverd', 'Eric', 'Cap'),
    out2: person('out2', '43454', 'Canna', 'Kevin'),
    steve: person('steve', '43453', 'Canna', 'Steve'),
    aux: person('aux', '38085', 'Auxiliaire')
  };
  const cyclePersonnes = [
    cyclePersonne('p1', { cycle_id: cycleId }),
    cyclePersonne('p2', { cycle_id: cycleId }),
    cyclePersonne('p3', { cycle_id: cycleId }),
    cyclePersonne('steve', { cycle_id: cycleId }),
    cyclePersonne('aux', { cycle_id: cycleId, role_cycle: 'AUXILIAIRE' })
  ];
  const attendus = ['p1', 'p2', 'p3', 'steve'].flatMap((pid) => evenements.map((ev) => attendu(ev.evenement_id, pid)));
  const participations = [
    part(evenements[0].evenement_id, 'p1', 'PRESENT'),
    part(evenements[1].evenement_id, 'p2', 'ABSENT_EXCUSE', 'PARTICIPANT', 'PROFESSIONNEL'),
    part(evenements[2].evenement_id, 'p3', 'DISPENSE', 'PARTICIPANT', 'FORMATION_HORS_SDIS'),
    part(evenements[0].evenement_id, 'steve', 'NON_CONCERNE', 'PARTICIPANT', 'NON_CONCERNE'),
    part(evenements[0].evenement_id, 'out1', 'PRESENT'),
    part(evenements[1].evenement_id, 'out2', 'PRESENT'),
    part(evenements[2].evenement_id, 'aux', 'PRESENT', 'AUXILIAIRE')
  ];
  return { cycle, evenements, cyclePersonnes, attendus, participations, personnes };
}

async function seedMultiSessionRepo(){
  const repo = createMemoryRepo();
  const p1 = await repo.upsertPersonne({ personne_id: 'm1', nip: '71001', grade: 'Sap', nom: 'Multi', prenom: 'Un' });
  const p2 = await repo.upsertPersonne({ personne_id: 'm2', nip: '71002', grade: 'Sap', nom: 'Multi', prenom: 'Deux' });
  const s1 = await repo.insertEvenement({ evenement_id: 'dap-ms-1', date: '2026-04-23', domaine_code: 'DAP', libelle: 'Formation groupée DAP 1.1', statut: 'REALISE', cible_ids: [] });
  const s2 = await repo.insertEvenement({ evenement_id: 'dap-ms-2', date: '2026-05-07', domaine_code: 'DAP', libelle: 'Formation groupée DAP 1.2', statut: 'REALISE', cible_ids: [] });
  const ms = await repo.upsertMultisessionV2({ multisession_id: 'ms-dap-test', code: 'DAP-FORMATION-GROUPEE-TEST', label: 'Formation groupée DAP', domain: 'DAP', period: { from: '2026-04-23', to: '2026-05-07' }, status: 'OUVERTE' });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s1.evenement_id, sequence: 1, status: 'CLOTUREE' });
  await repo.upsertMultisessionV2Session({ multisession_id: ms.multisession_id, event_id: s2.evenement_id, sequence: 2, status: 'CLOTUREE' });
  await repo.upsertMultisessionV2Population({ multisession_id: ms.multisession_id, person_id: p1.personne_id });
  await repo.upsertMultisessionV2Population({ multisession_id: ms.multisession_id, person_id: p2.personne_id });
  await repo.upsertParticipation({ evenement_id: s1.evenement_id, personne_id: p1.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' });
  await repo.upsertParticipation({ evenement_id: s2.evenement_id, personne_id: p2.personne_id, statut: 'ABSENT_EXCUSE', role: 'PARTICIPANT', motif_absence: 'PROFESSIONNEL' });
  return repo;
}

(async () => {
  await record('01 — PR1 population pilotage alignée sur population métier', () => {
    const input = prInput({ cycleNo: 1 });
    const metrics = computeCycleMetrics(input);
    const pilotage = buildCyclePilotage(input);
    eq(metrics.populationDistincte, 3, 'population spécialisée PR1 hors NON_CONCERNE consolidé');
    eq(pilotage.kpis.population, 3, 'NON_CONCERNE final exclu de la population pilotée');
    ok(!pilotage.individualRows.find((row) => row.nip === '26366').isPopulation, 'NIP 26366 non ajouté au dénominateur PR1');
    ok(!pilotage.individualRows.find((row) => row.nip === '43454').isPopulation, 'NIP 43454 non ajouté au dénominateur PR1');
  });

  await record('02 — Canna Steve PR1 expliqué comme non concerné consolidé', () => {
    const pilotage = buildCyclePilotage(prInput({ cycleNo: 1 }));
    const steve = pilotage.individualRows.find((row) => row.nip === '43453');
    ok(steve, 'NIP 43453 présent dans les lignes de contrôle');
    eq(steve.globalState, 'NON_CONCERNE', 'NIP 43453 ne produit pas un faux À renseigner');
    eq(steve.isPopulation, false, 'NIP 43453 exclu du dénominateur lorsque seul le résultat consolidé est NON_CONCERNE');
  });

  await record('03 — PR2 participants hors population non injectés', () => {
    const input = prInput({ cycleNo: 2 });
    input.personnes.out3 = person('out3', '43445', 'Lederrey', 'Yann');
    input.participations.push(part(input.evenements[0].evenement_id, 'out3', 'PRESENT'));
    const pilotage = buildCyclePilotage(input);
    ['43445', '43453', '43454'].forEach((nip) => {
      const row = pilotage.individualRows.find((item) => item.nip === nip);
      ok(row, `NIP ${nip} visible pour traçabilité`);
      ok(!row.isPopulation, `NIP ${nip} hors population pilotée PR2`);
    });
    eq(pilotage.kpis.population, 3, 'population PR2 sans les trois faux ajouts');
    eq(pilotage.kpis.resteATraiter, 0, 'reste à traiter PR2 consolidé correct');
  });

  await record('04 — encadrement séparé et hors dénominateur', () => {
    const pilotage = buildCyclePilotage(prInput({ cycleNo: 1 }));
    const aux = pilotage.individualRows.find((row) => row.nip === '38085');
    ok(aux.isEncadrement, 'auxiliaire visible comme encadrement');
    ok(!aux.isPopulation, 'auxiliaire hors population concernée');
    eq(pilotage.kpis.encadrement, 1);
  });

  await record('05 — formateur PAPR sans double comptage', () => {
    const input = prInput({ cycleNo: 1 });
    input.participations.push(part(input.evenements[0].evenement_id, 'p1', 'PRESENT', 'FORMATEUR'));
    const pilotage = buildCyclePilotage(input);
    const p1 = pilotage.individualRows.find((row) => row.nip === '10101');
    ok(p1.isPopulation, 'formateur PAPR reste dans la population');
    ok(p1.roles.includes('FORMATEUR'), 'rôle encadrement visible');
    eq(pilotage.kpis.population, 3, 'pas de double comptage population');
  });

  await record('06 — formations Multi-session visibles dans Cycles sans fusion moteur', async () => {
    const repo = await seedMultiSessionRepo();
    const service = createScopeCycleService(repo);
    const list = await service.listCycles({ annee: 2026, domaine: 'DAP' });
    const row = list.cycles.find((cycle) => cycle.libelle === 'Formation groupée DAP');
    ok(row, 'Formation groupée DAP visible dans Cycles');
    eq(row.engine, 'MULTI_SESSION_V2', 'moteur Multi-session explicitement projeté');
    const detail = await service.getCycle(row.cycle_id);
    eq(detail.cycle.metadata.engine, 'MULTI_SESSION_V2', 'détail non fusionné avec PR');
    eq(detail.pilotage.kpis.population, 2);
  });

  await record('07 — filtre FOSPEC inclut PR/AUTO pour Cycles', async () => {
    const repo = createMemoryRepo();
    await repo.insertCycle({ cycle_id: 'pr-cycle', cycle_key: 'pr', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'PR 1 Base', statut: 'REALISE', source_type: 'IMPORT' });
    await repo.insertCycle({ cycle_id: 'auto-cycle', cycle_key: 'auto', annee: 2026, domaine_code: 'AUTO', type_cycle: 'AUTO', libelle: 'AUTO VL', statut: 'REALISE', source_type: 'IMPORT' });
    const list = await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'FOSPEC' });
    const domains = new Set(list.cycles.map((cycle) => cycle.domaine_code));
    ok(domains.has('PR'), 'PR visible sous FOSPEC');
    ok(domains.has('AUTO'), 'AUTO visible sous FOSPEC');
  });

  await record('08 — libellés métier et sections UX Cycles présents', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(ui.includes('Personnel concerné'), 'section Personnel concerné');
    ok(ui.includes('Encadrement'), 'section Encadrement');
    ok(ui.includes('Informations du cycle'), 'identité métier remplacée');
    ok(ui.includes('Informations techniques'), 'technique repliable');
    ok(ui.includes('Non concerné'), 'NON_CONCERNE traduit');
    ok(ui.includes('Formation Multi-session'), 'type formation Multi-session');
    ok(ui.includes('Exporter le rapport PDF'), 'action PDF');
  });

  await record('09 — finitions R6.2 conservées', () => {
    const ui = read('assets/js/scope-ui.js');
    const logic = read('assets/js/scope-ui-logic.js');
    ok(ui.includes('Spécialisations FOSPEC'), 'hiérarchie visuelle PR/AUTO');
    ok(logic.includes("return 'FOSPEC,PR,AUTO'"), 'filtre FOSPEC fonctionnel conservé');
    ok(ui.includes('formationStatusLabel'), 'règles concernées sans codes statut');
    ok(ui.includes('formationMotifLabel'), 'règles concernées sans codes motif');
    ok(ui.includes('scope-association-check-mark'), 'cases association professionnelles');
  });

  await record('10 — rapport PDF Cycle générable', async () => {
    const repo = await seedMultiSessionRepo();
    const service = createScopeCycleService(repo);
    const row = (await service.listCycles({ annee: 2026, domaine: 'DAP' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: row.cycle_id, year: 2026 }, { includeNominatif: true });
    eq(model.kind, 'CYCLE');
    ok(model.filename.includes('Rapport Multi-session.pdf'), 'filename Multi-session');
    const pdf = await renderReportPdf(model, { generatedAt: '2026-09-10T10:00:00Z' });
    ok(pdf && Buffer.isBuffer(pdf.buffer) && pdf.buffer.length > 1000, 'PDF non vide');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`${failed.length} test(s) R7 en échec.`);
    process.exit(1);
  }
  console.log('SCOPE CYCLES R7 TESTS OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
