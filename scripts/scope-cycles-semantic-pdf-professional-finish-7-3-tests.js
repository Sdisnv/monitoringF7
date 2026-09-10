#!/usr/bin/env node
'use strict';

/** SCOPE — CYCLES-SEMANTIC-PDF-PROFESSIONAL-FINISH-7.3 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeCycleService } = require('../netlify/lib/_scope-cycle-service');
const { buildCyclePilotage } = require('../netlify/lib/_scope-cycle-rules');
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

function person(id, nip, nom, prenom = 'Test', grade = 'Sap'){
  return { personne_id: id, id, nip, nom, prenom, grade };
}

function event(id, index, extra = {}){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-1',
    domaine_code: 'PR',
    date: `2026-03-${String(index).padStart(2, '0')}`,
    libelle: `Exercice PR 1.${index} | Base`,
    code_cours: `PR.1.${index}`,
    statut: extra.statut || 'REALISE',
    pr_exercise_group_key: 'NO_CYCLE:PR:1',
    pr_session_key: `NO_CYCLE:PR:1.${index}`
  };
}

function attendu(evenementId, personneId){
  return { evenement_id: evenementId, personne_id: personneId, inclus: true, origine: 'TEST' };
}

function part(evenementId, personneId, statut, motif = null){
  return { evenement_id: evenementId, personne_id: personneId, statut, role: 'PARTICIPANT', motif_absence: motif, source: 'SAISIE' };
}

function fixture(){
  const cycle = {
    cycle_id: 'cycle-pr-1',
    cycle_key: 'NO_CYCLE:PR:1',
    annee: 2026,
    date_debut: '2026-03-04',
    date_fin: '2026-03-06',
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PR 1',
    statut: 'REALISE',
    source_type: 'TEST'
  };
  const evenements = [event('pr1-4', 4), event('pr1-5', 5), event('pr1-6', 6)];
  const personnes = {
    present: person('present', '10001', 'Marques', 'Luis'),
    excuse: person('excuse', '10002', 'Excuse', 'Eva'),
    dispense: person('dispense', '10003', 'Dispense', 'Diane'),
    absent: person('absent', '25146', 'Sauser', 'Philippe'),
    open: person('open', '10005', 'Ouvert', 'Olivier')
  };
  const attendus = Object.keys(personnes).map((pid) => attendu(evenements[2].evenement_id, pid));
  const participations = [
    part('pr1-4', 'present', 'PRESENT'),
    part('pr1-5', 'excuse', 'ABSENT_EXCUSE', 'PROFESSIONNEL'),
    part('pr1-5', 'dispense', 'DISPENSE', 'FORMATION_HORS_SDIS'),
    part('pr1-6', 'absent', 'ABSENT_NON_EXCUSE')
  ];
  return { cycle, evenements, personnes, attendus, participations };
}

async function seedRepo(){
  const repo = createMemoryRepo();
  const data = fixture();
  for(const personRow of Object.values(data.personnes)) await repo.upsertPersonne(personRow);
  for(const ev of data.evenements) await repo.insertEvenement(ev);
  await repo.insertCycle(data.cycle);
  for(const row of data.attendus) await repo.upsertAttendu(row);
  for(const row of data.participations) await repo.upsertParticipation(row);
  return repo;
}

(async () => {
  await record('01 — ABSENT est traité mais ne satisfait pas l’obligation', () => {
    const pilotage = buildCyclePilotage(fixture());
    const absent = pilotage.individualRows.find((row) => row.nip === '25146');
    eq(absent.globalState, 'ABSENT', 'NIP 25146 projeté Absent');
    eq(absent.progressionPct, 100, 'dossier ABSENT traité à 100 %');
    eq(absent.obligationSatisfiedPct, 0, 'obligation non satisfaite');
    eq(absent.openCount, 0, 'aucune saisie restante');
    ok(absent.isPopulation, 'reste dans la population concernée');
  });

  await record('02 — reste à traiter ne contient que les dossiers ouverts', () => {
    const pilotage = buildCyclePilotage(fixture());
    eq(pilotage.kpis.population, 5);
    eq(pilotage.kpis.dossiersTraites, 4);
    eq(pilotage.kpis.resteATraiter, 1);
    eq(pilotage.kpis.obligationsSatisfaites, 3);
    eq(pilotage.kpis.absent, 1);
    eq(pilotage.kpis.tauxTraitement, 80);
    eq(pilotage.kpis.tauxObligations, 60);
  });

  await record('03 — NIP 25146 absent absent de Personnes restant à traiter PDF', async () => {
    const repo = await seedRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    ok(!JSON.stringify(model.remainingRows || []).includes('25146'), 'Sauser non listé comme restant à traiter');
    ok(JSON.stringify(model.remainingRows || []).includes('10005'), 'seul dossier ouvert listé');
  });

  await record('04 — table Personnel concerné sans progression individuelle', () => {
    const ui = read('assets/js/scope-ui.js');
    const idx = ui.indexOf('<h2>Personnel concerné</h2>');
    ok(idx > 0, 'section Personnel concerné présente');
    const block = ui.slice(idx, idx + 1400);
    ok(!block.includes("data-label=\"Progression\""), 'cellule progression retirée');
    ok(!block.includes("'Progression'"), 'en-tête progression retiré');
    ok(block.includes('Session / résultat'), 'colonne session/résultat présente');
  });

  await record('05 — libellés métier non redondants', () => {
    const reportData = read('netlify/lib/_scope-report-data.js');
    const ui = read('assets/js/scope-ui.js');
    ok(!reportData.includes('Excusé — obligation satisfaite'), 'rapport sans libellé Excusé redondant');
    ok(!ui.includes('Obligation satisfaite —'), 'UI sans libellé redondant');
    ok(ui.includes("return 'Participation validée';"), 'information participation concise');
    ok(ui.includes("return 'Statut reconnu';"), 'résultat reconnu pour excuse/dispense');
  });

  await record('06 — graphique distingue Absent et À traiter', () => {
    const reportData = read('netlify/lib/_scope-report-data.js');
    ok(reportData.includes("label: 'Absents'"), 'catégorie Absents');
    ok(reportData.includes("label: 'À traiter'"), 'catégorie À traiter');
    ok(reportData.includes("label: 'Participation réalisée'"), 'catégorie participation réalisée');
  });

  await record('07 — PDF Cycles sans colonne Progression nominative', () => {
    const pdf = read('netlify/lib/_scope-pdf-renderer.js');
    ok(pdf.includes("'Session / résultat', 'Information'"), 'colonnes résultat et information séparées');
    ok(!pdf.includes("'État', 'Progression', 'Résultat / information'"), 'ancienne progression nominative supprimée');
    ok(pdf.includes('keepHeading'), 'pagination titre + contenu protégée');
  });

  await record('08 — PDF grades non tronqués par ellipsis', () => {
    const pdf = read('netlify/lib/_scope-pdf-renderer.js');
    ok(pdf.includes("wrap: [true, true, true, false, true, true, true, true]"), 'personnel concerné wrappable');
    ok(pdf.includes("wrap: [true, true, true, false, true, true]"), 'encadrement wrappable');
  });

  await record('09 — PDF générable avec la nouvelle sémantique', async () => {
    const repo = await seedRepo();
    const cycle = (await createScopeCycleService(repo).listCycles({ annee: 2026, domaine: 'PR' })).cycles[0];
    const model = await collectReport(repo, { kind: 'CYCLE', cycleId: cycle.cycle_id, year: 2026 }, { includeNominatif: true });
    const text = JSON.stringify(model);
    ok(text.includes('Sauser'), 'NIP 25146 dans le personnel concerné');
    ok(text.includes('Absent'), 'état Absent lisible');
    ok(text.includes('Statut renseigné'), 'information absent lisible');
    const rendered = await renderReportPdf(model, { generatedAt: '2026-09-10T12:00:00Z' });
    ok(Buffer.isBuffer(rendered.buffer) && rendered.buffer.length > 1000, 'PDF Cycle non vide');
  });

  await record('10 — liste Cycles desktop garde Formation / cycle et Type sur une ligne', () => {
    const css = read('assets/css/scope.css');
    ok(css.includes('.scope-cycles-list-table th:nth-child(1)'), 'colonne Formation / cycle ciblée');
    ok(css.includes('white-space: nowrap'), 'pas de retour ligne desktop');
  });

  await record('11 — action À renseigner pointe vers une session exploitable', () => {
    const pilotage = buildCyclePilotage(fixture());
    const open = pilotage.individualRows.find((row) => row.nip === '10005');
    eq(open.globalState, 'INCOMPLET');
    ok(open.primaryEventId, 'événement cible disponible');
  });

  await record('12 — encadrement et hors population inchangés côté moteur', () => {
    const rules = read('netlify/lib/_scope-cycle-rules.js');
    ok(rules.includes('isEncadrement: supportKeys.has(key)'), 'encadrement séparé conservé');
    ok(rules.includes('isOutsidePopulation: !isPopulation && !supportKeys.has(key)'), 'hors population conservé');
  });

  await record('13 — Multi-session V2 non modifié dans ce lot', () => {
    const diff = read('netlify/lib/_scope-cycle-rules.js');
    ok(diff.includes('function computeMultiSessionParticipationState'), 'moteur Multi-session présent');
    ok(!read('netlify/lib/_scope-multisession-v2.js').includes('CYCLES-SEMANTIC-PDF-PROFESSIONAL-FINISH-7.3'), 'service V2 non réécrit par le test');
  });

  await record('14 — libellés principaux Cycles sémantiques', () => {
    const ui = read('assets/js/scope-ui.js');
    ok(ui.includes('Dossiers traités'), 'KPI dossiers traités');
    ok(ui.includes('Obligations satisfaites'), 'KPI obligations satisfaites');
    ok(ui.includes('Traitement'), 'KPI traitement');
    ok(!ui.includes('<span>Progression</span>'), 'ancien KPI Progression retiré');
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(`${failed.length} test(s) R7.3 en échec.`);
    process.exit(1);
  }
  console.log('SCOPE CYCLES R7.3 TESTS OK');
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
