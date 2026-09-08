#!/usr/bin/env node
'use strict';

/** SCOPE-PERMUTATION-UX-PROFESSIONALIZATION-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { computeTaux } = require('../netlify/lib/_scope-rules');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const display = require('../assets/js/scope-personnel-display');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-permutation-ux-professionalization-1', roles: ['ADMIN'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function person(repo, cibleRow, nip, overrides = {}){
  const p = await repo.insertPersonne({
    nip,
    nom: overrides.nom || `Nom${nip}`,
    prenom: overrides.prenom || 'Test',
    grade: overrides.grade || 'Sdt',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cibleRow.cible_id, date_debut: '2020-01-01' });
  return p;
}

async function frozenEvent(service, cibleRow, date, libelle, exerciseEquivalenceKey){
  const created = await service.createEvenement({
    date,
    domaineCode: cibleRow.domaine_code,
    libelle,
    cibleIds: [cibleRow.cible_id],
    exerciseEquivalenceKey
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function saveOne(service, eventId, personne, statut){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: [{ personneId: personne.personne_id, statut, role: 'PARTICIPANT' }]
  }, ACTOR);
}

async function addCatchup(service, eventId, personne, sourceLabel){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id,
    role: 'PARTICIPANT',
    motifInclusion: L.permutationCatchupMotif({ libelle: sourceLabel })
  }, ACTOR);
}

async function addManual(service, eventId, personne){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id,
    role: 'PARTICIPANT'
  }, ACTOR);
}

async function fixture(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const y1 = await cible(repo, 'DAP', 'Y1');
  const y2 = await cible(repo, 'DAP', 'Y2');
  const p = await person(repo, y1, '7738', { grade: 'Plt', nom: 'Agazzi', prenom: 'Pierre-André' });
  const manual = await person(repo, y1, 'MAN-UX-1', { grade: 'Sap', nom: 'Ajout', prenom: 'Manuel' });
  const src = await frozenEvent(service, y1, '2026-03-12', 'Exercice DAP 1', 'DAP_EX1');
  const target = await frozenEvent(service, y2, '2026-03-17', 'Exercice DAP 1', 'DAP_EX1');
  return { repo, service, y1, y2, p, manual, src, target };
}

(async () => {
  await record('01-04 - obligations source et destination exposees avec cible source professionnelle', async () => {
    const { repo, service, p, src, target } = await fixture();
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    const source = await service.permutationsForEvent(src.eventId);
    const dest = await service.permutationsForEvent(target.eventId);
    eq(source.obligations.length, 1);
    eq(source.obligations[0].role, 'SOURCE');
    eq(source.obligations[0].source.cibleLabel, 'DAP Y1');
    eq(dest.obligations.length, 1);
    eq(dest.obligations[0].role, 'RATTRAPAGE');
    eq(dest.obligations[0].compatible, true);
    eq(L.permutationSourceLabel(dest.obligations[0].source), 'Exercice DAP 1, section DAP Y1');
  });

  await record('05-09 - rattrapage distingue de l ajout manuel dans attendus et affichage', async () => {
    const { repo, service, p, manual, src, target } = await fixture();
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    await addCatchup(service, target.eventId, p, 'Exercice DAP 1, section DAP Y1');
    await addManual(service, target.eventId, manual);
    const fiche = await service.lireEvenement(target.eventId);
    const catchup = fiche.attendus.find((row) => row.personne_id === p.personne_id);
    const manualRow = fiche.attendus.find((row) => row.personne_id === manual.personne_id);
    ok(L.isPermutationCatchup(catchup));
    eq(L.permutationCatchupSourceLabel(catchup), 'Exercice DAP 1, section DAP Y1');
    eq(catchup.origine, 'EXCEPTION_AJOUT');
    eq(manualRow.motif_inclusion, 'exception_ajout');
    ok(!L.isPermutationCatchup(manualRow));
    await saveOne(service, target.eventId, p, 'PRESENT');
    const obligation = (await repo.listPermutations({ personneId: p.personne_id }))[0];
    eq(obligation.statut, 'RATTRAPPE');
  });

  await record('10-12 - rapport evenement destination affiche Present + provenance rattrapage sans ajout manuel', async () => {
    const { repo, service, p, src, target } = await fixture();
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    await addCatchup(service, target.eventId, p, 'Exercice DAP 1, section DAP Y1');
    await saveOne(service, target.eventId, p, 'PRESENT');
    const report = await collectReport(repo, { kind: 'EVENT', id: target.eventId }, { includeNominatif: true });
    ok(report && report.nominatif && report.nominatif.length);
    const row = report.nominatif.find((item) => item.nip === '7738');
    eq(row.statutLabel, 'Présent');
    eq(row.cible, 'Rattrapage');
    eq(row.motifLabel, 'Exercice DAP 1, section DAP Y1');
    ok(!JSON.stringify(row).includes('Ajout manuel'));
    ok(!JSON.stringify(row).includes('Ajout ponctuel'));
  });

  await record('13-15 - fiche individuelle source et destination tracables sans double contribution', async () => {
    const { repo, service, p, src, target } = await fixture();
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    await addCatchup(service, target.eventId, p, 'Exercice DAP 1, section DAP Y1');
    await saveOne(service, target.eventId, p, 'PRESENT');
    const fiche = await service.lireEvenement(target.eventId);
    const taux = computeTaux(fiche.participations, fiche.attendus);
    eq(taux.presents, 0);
    eq(taux.numerator, 0);
    eq(taux.denominator, 0);
    const targetAttendu = fiche.attendus.find((row) => row.personne_id === p.personne_id);
    const personTargetRow = {
      statutParticipation: 'PRESENT',
      motifInclusion: targetAttendu.motif_inclusion
    };
    eq(display.ficheEventCible(personTargetRow), 'Rattrapage');
    eq(display.ficheEventInformations(personTargetRow), 'Exercice DAP 1, section DAP Y1');
    const sourceParticipation = await repo.getParticipation(src.eventId, p.personne_id);
    eq(sourceParticipation.statut, 'PERMUTATION');
  });

  await record('16-22 - sentinelles statiques UX bleu clair et libelles metier', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    ok(ui.includes('data-permutation-panel="open"'));
    ok(ui.includes('Rattrapages disponibles'));
    ok(ui.includes('data-permutation-add'));
    ok(ui.includes('scope-row-catchup'));
    ok(ui.includes('catchupSourceLabel'));
    ok(css.includes('.scope-row-catchup'));
    ok(css.includes('#e8f4ff'));
    ok(css.includes('.scope-permutation-state'));
    ok(!/scope-row-catchup[\\s\\S]{0,220}#fff3f3/.test(css));
  });

  await record('23-26 - statuts permutation sans codes techniques visibles', () => {
    eq(L.permutationStatusLabel('A_RATTRAPER'), 'À rattraper');
    eq(L.permutationStatusLabel('RATTRAPPE'), 'Rattrapé');
    eq(L.permutationStatusLabel('A_REGULARISER'), 'À régulariser');
    eq(L.permutationStatusLabel('REGULARISE'), 'Régularisé');
  });

  await record('27-30 - zones protegees AUTH PR/PAPR policy DB non remaniees', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
    const schema = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-schema.js'), 'utf8');
    ok(ui.includes('function invalidateScopeSession'));
    ok(serviceSrc.includes('function syncPermutationWorkflow'));
    ok(serviceSrc.includes('exerciseEquivalenceKeyForEvent'));
    ok(!/create table if not exists scope_permutation_policies/i.test(schema));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exitCode = 1;
})();
