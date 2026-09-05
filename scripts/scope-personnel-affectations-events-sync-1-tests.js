#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');

const ACTOR = { sub: 'scope-affectations-events-sync-1-test' };
const results = [];

async function record(name, fn){
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function seedPerson(repo, nip){
  return repo.insertPersonne({ nip, nom: nip, prenom: 'Test', grade: 'Sap', date_entree: '2026-01-01' });
}

async function seedFrozenEvent(service, cible, date, libelle, extraCibles = []){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible, ...extraCibles].map((row) => row.cible_id)
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return service.lireEvenement(created.evenement.evenement_id);
}

function attenduFor(fiche, personneId){
  return (fiche.attendus || []).find((row) => String(row.personne_id) === String(personneId));
}

function excludedFor(fiche, personneId){
  return (fiche.attendusExclus || fiche.attendus_exclus || []).find((row) => String(row.personne_id) === String(personneId));
}

(async () => {
  await record('A — affectation ouverte avant événement => attendu', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'SYNC-A');
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const event = await seedFrozenEvent(service, foba1, '2026-02-25', 'FOBA A');
    const sync = await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    assert.strictEqual(sync.attendusRemoved, 0);
    assert.ok(attenduFor(await service.lireEvenement(event.evenement.evenement_id), p.personne_id));
  });

  await record('B/C — fin avant événement ou date_actif repoussée => retrait automatique si modifiable', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'SYNC-B');
    const aff = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const event = await seedFrozenEvent(service, foba1, '2026-06-24', 'FOBA 5');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    await repo.updateAffectation(aff.affectation_id, { date_fin: '2026-06-23' });
    const sync = await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    assert.strictEqual(sync.attendusRemoved, 1);
    assert.ok(excludedFor(await service.lireEvenement(event.evenement.evenement_id), p.personne_id));

    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-07-01', date_fin: null });
    const again = await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    assert.strictEqual(again.eventsRecalculated, 0);
  });

  await record('D/E — avancer date_actif ou réactiver => ajout automatique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba2 = await repo.findCible('FOBA', '2');
    const p = await seedPerson(repo, 'SYNC-D');
    const aff = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba2.cible_id, date_debut: '2026-07-01' });
    const event = await seedFrozenEvent(service, foba2, '2026-06-24', 'FOBA 2 applicable');
    assert.strictEqual((await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR)).eventsRecalculated, 0);
    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-01-01' });
    assert.strictEqual((await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR)).attendusAdded, 1);
    assert.ok(attenduFor(await service.lireEvenement(event.evenement.evenement_id), p.personne_id));
  });

  await record('F/G — multi-cible FOBA 1 + FOBA 2 sans contamination entre niveaux', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba2 = await repo.findCible('FOBA', '2');
    const p1 = await seedPerson(repo, 'SYNC-F1');
    const p2 = await seedPerson(repo, 'SYNC-F2');
    await repo.insertAffectation({ personne_id: p1.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: p2.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01' });
    const event = await seedFrozenEvent(service, foba1, '2026-04-10', 'FOBA 1 + 2', [foba2]);
    await service.syncExpectedPopulationForPersonnes([p1.personne_id, p2.personne_id], ACTOR);
    const fiche = await service.lireEvenement(event.evenement.evenement_id);
    assert.match(String(attenduFor(fiche, p1.personne_id).motif_inclusion), /FOBA_1/);
    assert.match(String(attenduFor(fiche, p2.personne_id).motif_inclusion), /FOBA_2/);
    assert.ok(!String(attenduFor(fiche, p1.personne_id).motif_inclusion).includes('FOBA_2'));
  });

  await record('H/I/J — pas de doublon, historique protégé, cible non FOBA', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dapY2 = await repo.findCible('DAP', 'Y2');
    const p = await seedPerson(repo, 'SYNC-DAP');
    const aff = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: dapY2.cible_id, date_debut: '2026-01-01' });
    const event = await seedFrozenEvent(service, dapY2, '2026-05-01', 'DAP Y2');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    assert.strictEqual((await repo.listAttendus(event.evenement.evenement_id)).filter((row) => row.personne_id === p.personne_id).length, 1);
    const before = await service.lireEvenement(event.evenement.evenement_id);
    await service.enregistrerParticipations(event.evenement.evenement_id, {
      baseVersion: before.evenement.version,
      participations: [{ personneId: p.personne_id, statut: 'PRESENT', commentaire: 'historique' }]
    }, ACTOR);
    await repo.updateAffectation(aff.affectation_id, { date_fin: '2026-04-30' });
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    const after = await service.lireEvenement(event.evenement.evenement_id);
    assert.ok(excludedFor(after, p.personne_id));
    assert.strictEqual(after.participations.find((row) => row.personne_id === p.personne_id).commentaire, 'historique');
  });

  await record('Fiche individuelle — événement planifié attendu visible sans KPI officiel artificiel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const foba2 = await repo.findCible('FOBA', '2');
    const p = await seedPerson(repo, 'SYNC-FICHE');
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01' });
    await seedFrozenEvent(service, foba2, '2026-08-01', 'FOBA fiche planifié');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    const fiche = await persons.fiche(p.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    assert.ok(fiche.evenements.some((row) => row.libelle === 'FOBA fiche planifié' && row.planned === true));
    assert.strictEqual(fiche.kpi.denominator, 0);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  if(failed.length) process.exitCode = 1;
  else console.log('SCOPE-PERSONNEL-AFFECTATIONS-EVENTS-SYNC-1: PASS');
})();
