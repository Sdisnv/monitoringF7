#!/usr/bin/env node
'use strict';

/** SCOPE-PERMUTATION-RECOVERY-FINAL-1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { computeTaux } = require('../netlify/lib/_scope-rules');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-permutation-recovery-final-1', roles: ['ADMIN'] };
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

async function saveOne(service, eventId, personne, spec){
  const fiche = await service.lireEvenement(eventId);
  const row = typeof spec === 'string' ? { statut: spec } : spec;
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: [{
      personneId: personne.personne_id,
      statut: row.statut,
      motifAbsence: row.motifAbsence || null,
      role: row.role || 'PARTICIPANT'
    }]
  }, ACTOR);
}

async function addManual(service, eventId, personne){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, { baseVersion: fiche.evenement.version, personneId: personne.personne_id }, ACTOR);
}

async function close(service, eventId){
  const fiche = await service.lireEvenement(eventId);
  return service.cloturer(eventId, { baseVersion: fiche.evenement.version }, ACTOR);
}

async function dapFixture(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const y1 = await cible(repo, 'DAP', 'Y1');
  const y2 = await cible(repo, 'DAP', 'Y2');
  const y3 = await cible(repo, 'DAP', 'Y3');
  const y4 = await cible(repo, 'DAP', 'Y4');
  const p = await person(repo, y1, '7738', { grade: 'Plt', nom: 'Agazzi', prenom: 'Pierre-André' });
  const helper = await person(repo, y2, 'DAP-HELPER-1');
  return { repo, service, y1, y2, y3, y4, p, helper };
}

(async () => {
  await record('01 - DAP Exercice 1 Y1 NIP 7738 vers Y2/Y3/Y4 accepte, meme evenement refuse', async () => {
    const { repo, service, y1, y2, y3, y4, p } = await dapFixture();
    const src = await frozenEvent(service, y1, '2026-04-01', 'Exercice 1 DAP Y1', 'DAP_EX1');
    const evY2 = await frozenEvent(service, y2, '2026-04-08', 'Exercice 1 DAP Y2', 'DAP_EX1');
    const evY3 = await frozenEvent(service, y3, '2026-04-15', 'Exercice 1 DAP Y3', 'DAP_EX1');
    const evY4 = await frozenEvent(service, y4, '2026-04-22', 'Exercice 1 DAP Y4', 'DAP_EX1');
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    const sourceObligations = await service.permutationsForEvent(src.eventId);
    eq(sourceObligations.obligations.length, 1);
    eq(sourceObligations.obligations[0].role, 'SOURCE');
    eq(sourceObligations.obligations[0].compatible, false);
    const y2Obligations = await service.permutationsForEvent(evY2.eventId);
    eq(y2Obligations.obligations.length, 1);
    eq(y2Obligations.obligations[0].nip, '7738');
    eq(y2Obligations.obligations[0].nom, 'Agazzi');
    eq(y2Obligations.obligations[0].role, 'RATTRAPAGE');
    eq(y2Obligations.obligations[0].compatible, true);
    eq((await service.permutationsForEvent(evY3.eventId)).obligations.length, 1);
    eq((await service.permutationsForEvent(evY4.eventId)).obligations.length, 1);
    const obligation = (await repo.listPermutations({ personneId: p.personne_id }))[0];
    eq(obligation.statut, 'A_RATTRAPER');
    eq(obligation.source_exercise_key, 'DAP_EX1');
  });

  await record('02 - DAP Exercice 1 vers Exercice 2 refuse le rattrapage', async () => {
    const { repo, service, y1, y2, p } = await dapFixture();
    const src = await frozenEvent(service, y1, '2026-05-01', 'Exercice 1 DAP Y1', 'DAP_EX1');
    const wrong = await frozenEvent(service, y2, '2026-05-08', 'Exercice 2 DAP Y2', 'DAP_EX2');
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    eq((await service.permutationsForEvent(wrong.eventId)).obligations.length, 0);
    await addManual(service, wrong.eventId, p);
    await saveOne(service, wrong.eventId, p, 'PRESENT');
    eq((await repo.listPermutations({ personneId: p.personne_id }))[0].statut, 'A_RATTRAPER');
  });

  await record('03 - rattrapage present passe RATTRAPPE et conserve la source', async () => {
    const { repo, service, y1, y2, p } = await dapFixture();
    const src = await frozenEvent(service, y1, '2026-06-01', 'Exercice 1 DAP Y1', 'DAP_EX1');
    const target = await frozenEvent(service, y2, '2026-06-08', 'Exercice 1 DAP Y2', 'DAP_EX1');
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    await addManual(service, target.eventId, p);
    await saveOne(service, target.eventId, p, 'PRESENT');
    const obligation = (await repo.listPermutations({ personneId: p.personne_id }))[0];
    eq(obligation.statut, 'RATTRAPPE');
    eq(obligation.source_evenement_id, src.eventId);
    eq(obligation.rattrapage_evenement_id, target.eventId);
  });

  await record('04 - non rattrape passe A_REGULARISER puis regularisation exige motif', async () => {
    const { repo, service, y1, y2, p, helper } = await dapFixture();
    const src = await frozenEvent(service, y1, '2026-07-01', 'Exercice 1 DAP Y1', 'DAP_EX1');
    const target = await frozenEvent(service, y2, '2026-07-08', 'Exercice 1 DAP Y2', 'DAP_EX1');
    await saveOne(service, src.eventId, p, 'PERMUTATION');
    await saveOne(service, target.eventId, helper, 'PRESENT');
    await close(service, target.eventId);
    let obligation = (await repo.listPermutations({ personneId: p.personne_id }))[0];
    eq(obligation.statut, 'A_REGULARISER');
    await assert.rejects(
      () => service.regulariserPermutation(obligation.permutation_id, {}, ACTOR),
      (error) => error && error.error === 'motif_obligatoire'
    );
    await service.regulariserPermutation(obligation.permutation_id, { motifAbsence: 'PROFESSIONNEL' }, ACTOR);
    obligation = (await repo.listPermutations({ personneId: p.personne_id }))[0];
    eq(obligation.statut, 'REGULARISE');
    eq(obligation.regularisation_motif, 'PROFESSIONNEL');
    const sourceParticipation = await repo.getParticipation(src.eventId, p.personne_id);
    eq(sourceParticipation.statut, 'ABSENT_EXCUSE');
    eq(sourceParticipation.motif_absence, 'PROFESSIONNEL');
    ok((await repo.listJournal('permutation', obligation.permutation_id)).some((row) => row.action === 'REGULARISER'));
  });

  await record('05 - formateur present conserve role et contribution unique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const p = await person(repo, y1, 'FORM-DAP-1', { grade: 'Sgt' });
    const ev = await frozenEvent(service, y1, '2026-08-01', 'DAP formateur', 'DAP_FORM');
    await saveOne(service, ev.eventId, p, { statut: 'PRESENT', role: 'FORMATEUR' });
    const fiche = await service.lireEvenement(ev.eventId);
    const row = fiche.participations.find((part) => part.personne_id === p.personne_id);
    eq(row.statut, 'PRESENT');
    eq(row.role, 'FORMATEUR');
    eq(computeTaux(fiche.participations, fiche.attendus).presents, 1);
  });

  await record('06 - sentinelle auth statique intacte', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
    const authIdentity = fs.readFileSync(path.join(ROOT, 'netlify/lib/_auth-identity.js'), 'utf8');
    ok(ui.includes('function invalidateScopeSession'));
    ok(ui.includes('function logoutScopeSession'));
    ok(api.includes("fetchWithAuthRetry('/auth/me'"));
    ok(authIdentity.includes('function hasHumanIdentity'));
    ok(!/displayName:\\s*[^\\n]*Utilisateur SCOPE/.test(ui));
    ok(!/Utilisateur SCOPE/.test(ui));
  });

  await record('07 - aucune table policy permutation dediee', () => {
    const schema = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-schema.js'), 'utf8');
    const migration = fs.readFileSync(path.join(ROOT, 'database/migrations/20260907_scope_permutation_recovery_final_1.sql'), 'utf8');
    ok(!schema.includes('scope_permutation_policies'));
    ok(!migration.includes('scope_permutation_policies'));
  });

  await record('08 - libelles DAP et backfill MOA exposes pour la recette', () => {
    const labels = L.participationStatusesForDomaine('DAP', {
      domainCode: 'DAP',
      activeStatuses: ['PRESENT', 'ABSENT_EXCUSE', 'ABSENT_NON_EXCUSE', 'DISPENSE', 'PERMUTATION'],
      statuses: []
    });
    eq(labels.find(([code]) => code === 'PRESENT')[1], 'Présent');
    eq(labels.find(([code]) => code === 'DISPENSE')[1], 'Dispensé');
    eq(labels.find(([code]) => code === 'PERMUTATION')[1], 'Permutation');
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    ok(ui.includes('Personnes en permutation'));
    ok(ui.includes('rattrapage possible'));
    ok(ui.includes('Ouverte'));
    ok(/function reloadFicheFromServer[\s\S]*?permutationsForEvent/.test(ui));
    const migration = fs.readFileSync(path.join(ROOT, 'database/migrations/20260908_scope_permutation_moa_fix_1.sql'), 'utf8');
    ok(/UPDATE\s+scope_evenements/i.test(migration));
    ok(/exercise_equivalence_key/i.test(migration));
    ok(/upper\(domaine_code\)\s*=\s*'DAP'/i.test(migration));
    ok(!/\b(DROP|DELETE|TRUNCATE)\b/i.test(migration));
    ok(!/scope_participation_policies/i.test(migration));
    ok(!/scope_permutation_policies/i.test(migration));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exitCode = 1;
})();
