#!/usr/bin/env node
'use strict';

/** SCOPE-DAP-PERMUTATION-FINALIZATION-2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { computeTaux } = require('../netlify/lib/_scope-rules');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const display = require('../assets/js/scope-personnel-display');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-dap-permutation-finalization-2', roles: ['ADMIN'] };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

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

async function saveMany(service, eventId, rows){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: rows.map((row) => ({
      personneId: row.personne.personne_id,
      statut: row.statut,
      motifAbsence: row.motifAbsence || null,
      role: 'PARTICIPANT'
    }))
  }, ACTOR);
}

async function saveOne(service, eventId, personne, statut){
  return saveMany(service, eventId, [{ personne, statut }]);
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

async function close(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

async function fixture(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const persons = createScopePersonService(repo);
  const y1 = await cible(repo, 'DAP', 'Y1');
  const y2 = await cible(repo, 'DAP', 'Y2');
  const p = await person(repo, y1, '7738', { grade: 'Plt', nom: 'Agazzi', prenom: 'Pierre-André' });
  const manual = await person(repo, y1, 'MAN-FIN-2', { grade: 'Sap', nom: 'Ajout', prenom: 'Manuel' });
  const source = await frozenEvent(service, y1, '2026-03-12', 'Exercice DAP 1', 'DAP_EX1');
  const target = await frozenEvent(service, y2, '2026-03-17', 'Exercice DAP 1', 'DAP_EX1');
  return { repo, service, persons, y1, y2, p, manual, source, target };
}

(async () => {
  await record('01 - taux concret: 18 attendus, 17 presents reels, 1 permutation source', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const people = [];
    for(let i = 0; i < 18; i += 1){
      people.push(await person(repo, y1, `DAP-FIN-${String(i + 1).padStart(2, '0')}`, { nom: `Taux${i + 1}` }));
    }
    const source = await frozenEvent(service, y1, '2026-04-01', 'Exercice DAP 1', 'DAP_EX1');
    await saveMany(service, source.eventId, people.map((personne, index) => ({
      personne,
      statut: index === 17 ? 'PERMUTATION' : 'PRESENT'
    })));
    const fiche = await service.lireEvenement(source.eventId);
    const taux = computeTaux(fiche.participations, fiche.attendus);
    eq(taux.presents, 17);
    eq(taux.permutations, 1);
    eq(taux.numerator, 17);
    eq(taux.denominator, 18);
    eq(taux.percentage, 94.4);
  });

  await record('02 - obligation A_RATTRAPER vers RATTRAPPE, source reste PERMUTATION et destination PRESENT', async () => {
    const { repo, service, p, manual, source, target } = await fixture();
    await saveOne(service, source.eventId, p, 'PERMUTATION');
    eq((await repo.listPermutations({ personneId: p.personne_id }))[0].statut, 'A_RATTRAPER');
    await saveOne(service, source.eventId, manual, 'PRESENT');
    await close(service, source.eventId);
    await addCatchup(service, target.eventId, p, 'Exercice DAP 1, section DAP Y1');
    await saveOne(service, target.eventId, p, 'PRESENT');
    const obligation = (await repo.listPermutations({ personneId: p.personne_id }))[0];
    eq(obligation.statut, 'RATTRAPPE');
    eq((await repo.getParticipation(source.eventId, p.personne_id)).statut, 'PERMUTATION');
    eq((await repo.getParticipation(target.eventId, p.personne_id)).statut, 'PRESENT');
  });

  await record('03 - evenement source et destination: libelles sans double presence evenementielle', async () => {
    const { repo, service, p, manual, source, target } = await fixture();
    await saveOne(service, source.eventId, p, 'PERMUTATION');
    await saveOne(service, source.eventId, manual, 'PRESENT');
    await close(service, source.eventId);
    await addCatchup(service, target.eventId, p, 'Exercice DAP 1, section DAP Y1');
    await saveOne(service, target.eventId, p, 'PRESENT');
    const sourceFiche = await service.lireEvenement(source.eventId);
    const sourceRow = sourceFiche.attendus.find((row) => row.personne_id === p.personne_id);
    eq(L.informationMotifLabel(Object.assign({}, sourceRow, { statut: 'PERMUTATION' })), 'Rattrapage section DAP Y2');
    const targetReport = await collectReport(repo, { kind: 'EVENT', id: target.eventId }, { includeNominatif: true });
    const targetRow = targetReport.nominatif.find((row) => row.nip === '7738');
    eq(targetRow.statutLabel, 'Présent');
    eq(targetRow.cible, 'Rattrapage');
    eq(targetRow.motifLabel, 'Exercice DAP 1, section DAP Y1');
    ok(!JSON.stringify(targetRow).includes('Ajout manuel'));
    ok(!JSON.stringify(targetRow).includes('Ajout ponctuel'));
  });

  await record('04 - fiche individuelle et modele PDF individuel en date ASC avec source/destination tracables', async () => {
    const { repo, service, persons, p, manual, source, target } = await fixture();
    await saveOne(service, source.eventId, p, 'PERMUTATION');
    await saveOne(service, source.eventId, manual, 'PRESENT');
    await close(service, source.eventId);
    await addCatchup(service, target.eventId, p, 'Exercice DAP 1, section DAP Y1');
    await saveOne(service, target.eventId, p, 'PRESENT');
    await close(service, target.eventId);
    const fiche = await persons.fiche(p.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    deepEq(fiche.evenements.map((row) => row.date), ['2026-03-12', '2026-03-17']);
    const src = fiche.evenements[0];
    const dst = fiche.evenements[1];
    eq(display.ficheEventStatutLabel(src), 'Permutation');
    eq(display.ficheEventInformations(src), 'Rattrapage section DAP Y2');
    eq(display.ficheEventCible(dst), 'Rattrapage');
    eq(display.ficheEventInformations(dst), 'Exercice DAP 1, section DAP Y1');
    const model = await collectReport(repo, { kind: 'PERSON', personneId: p.personne_id, from: '2026-01-01', to: '2026-12-31' }, {});
    deepEq(model.evenements.map((row) => row.date), ['2026-03-12', '2026-03-17']);
  });

  await record('05 - affichage bleu individuel et vue realisee proteges statiquement', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    ok(ui.includes('class="scope-row-catchup"'));
    ok(/personne-events[\s\S]*?scope-row-catchup/.test(ui));
    ok(/event-realise[\s\S]*?scope-row-catchup/.test(ui));
  });

  await record('06 - ajout manuel reel reste distingue du rattrapage', async () => {
    const { service, manual, target } = await fixture();
    await addManual(service, target.eventId, manual);
    const fiche = await service.lireEvenement(target.eventId);
    const row = fiche.attendus.find((item) => item.personne_id === manual.personne_id);
    eq(row.origine, 'EXCEPTION_AJOUT');
    eq(row.motif_inclusion, 'exception_ajout');
    ok(!L.isPermutationCatchup(row));
  });

  await record('07 - PR/PAPR, JSP Oubli, AUTH, DB et Policy Engine non touches hors perimetre', () => {
    const changed = execFileSync('git', ['diff', '--name-only'], { cwd: ROOT, encoding: 'utf8' })
      .trim()
      .split(/\n/)
      .filter((file) => file && !/^scripts\//.test(file));
    ok(!changed.some((file) => /^netlify\/functions\/auth-|^assets\/js\/auth\.js|rbac|okta|oidc/i.test(file)), 'AUTH/RBAC modifie');
    ok(!changed.some((file) => /^database\//.test(file)), 'DB ou migration modifiee');
    const logic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    ok(logic.includes("value: 'OUBLI'"));
    const cycleRules = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-cycle-rules.js'), 'utf8');
    ok(cycleRules.includes("STATUTS_PR_EXERCISE_RECONNUS = new Set(['PRESENT', STATUT_PERMUTATION, 'DISPENSE'])"));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
