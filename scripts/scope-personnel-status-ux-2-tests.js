#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const temporal = require('../assets/js/scope-personnel-temporal.js');

const ACTOR = { sub: 'scope-personnel-status-ux-2-test' };
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

async function seedFrozenEvent(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
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
  await record('CAS 1 — clôture FOBA 1 laisse DAP Y2 actif', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dap = await repo.findCible('DAP', 'Y2');
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'UX2-C1');
    const affDap = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: dap.cible_id, date_debut: '2026-01-01' });
    const affFoba = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const evFoba = await seedFrozenEvent(service, foba1, '2026-08-01', 'FOBA après clôture');
    const evDap = await seedFrozenEvent(service, dap, '2026-09-01', 'DAP après clôture');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    const plan = temporal.planInactivation('2026-06-23');
    await repo.updateAffectation(affFoba.affectation_id, { date_fin: plan.dernierJourActif });
    const sync = await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR, { reason: 'CLOTURER_AFFECTATION' });
    assert.ok(sync.eventsRecalculated >= 1);
    const fobaFiche = await service.lireEvenement(evFoba.evenement.evenement_id);
    const dapFiche = await service.lireEvenement(evDap.evenement.evenement_id);
    assert.ok(excludedFor(fobaFiche, p.personne_id), 'FOBA futur doit retirer la personne');
    assert.ok(attenduFor(dapFiche, p.personne_id), 'DAP ne doit pas être modifié');
    const stillOpen = (await repo.listAffectations({ personneId: p.personne_id })).find((row) => row.affectation_id === affDap.affectation_id);
    assert.ok(!stillOpen.date_fin);
  });

  await record('CAS 2 — démission SDIS clôt DAP et FOBA', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dap = await repo.findCible('DAP', 'Y2');
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'UX2-C2');
    const affDap = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: dap.cible_id, date_debut: '2026-01-01' });
    const affFoba = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const evFoba = await seedFrozenEvent(service, foba1, '2026-08-01', 'FOBA démission');
    const evDap = await seedFrozenEvent(service, dap, '2026-09-01', 'DAP démission');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    const plan = temporal.planInactivation('2026-06-23');
    await repo.updateAffectation(affDap.affectation_id, { date_fin: plan.dernierJourActif });
    await repo.updateAffectation(affFoba.affectation_id, { date_fin: plan.dernierJourActif });
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR, { reason: 'INACTIVER_PERSONNE' });
    assert.ok(excludedFor(await service.lireEvenement(evFoba.evenement.evenement_id), p.personne_id));
    assert.ok(excludedFor(await service.lireEvenement(evDap.evenement.evenement_id), p.personne_id));
  });

  await record('CAS 3 — applicable D-1, non applicable à D', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'UX2-C3');
    const aff = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const before = await seedFrozenEvent(service, foba1, '2026-06-22', 'FOBA D-1');
    const onDay = await seedFrozenEvent(service, foba1, '2026-06-23', 'FOBA D');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    const plan = temporal.planInactivation('2026-06-23');
    await repo.updateAffectation(aff.affectation_id, { date_fin: plan.dernierJourActif });
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR, { reason: 'INACTIVER_PERSONNE' });
    assert.ok(attenduFor(await service.lireEvenement(before.evenement.evenement_id), p.personne_id));
    assert.ok(excludedFor(await service.lireEvenement(onDay.evenement.evenement_id), p.personne_id));
  });

  await record('CAS 4 — participation historique conservée après démission', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'UX2-C4');
    const aff = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const event = await seedFrozenEvent(service, foba1, '2026-03-25', 'FOBA historique');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    const before = await service.lireEvenement(event.evenement.evenement_id);
    await service.enregistrerParticipations(event.evenement.evenement_id, {
      baseVersion: before.evenement.version,
      participations: [{ personneId: p.personne_id, statut: 'PRESENT', commentaire: 'conservé' }]
    }, ACTOR);
    const plan = temporal.planInactivation('2026-06-23');
    await repo.updateAffectation(aff.affectation_id, { date_fin: plan.dernierJourActif });
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR, { reason: 'INACTIVER_PERSONNE' });
    const after = await service.lireEvenement(event.evenement.evenement_id);
    const part = (after.participations || []).find((row) => String(row.personne_id) === String(p.personne_id));
    assert.ok(part);
    assert.strictEqual(part.commentaire, 'conservé');
    assert.strictEqual(part.statut, 'PRESENT');
  });

  await record('CAS 5 — réactivation restaure l’attendu futur', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await seedPerson(repo, 'UX2-C5');
    const aff = await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const event = await seedFrozenEvent(service, foba1, '2026-08-01', 'FOBA réactivation');
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR);
    await repo.updateAffectation(aff.affectation_id, { date_fin: '2026-06-22' });
    await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR, { reason: 'INACTIVER_PERSONNE' });
    assert.ok(excludedFor(await service.lireEvenement(event.evenement.evenement_id), p.personne_id));
    await repo.updateAffectation(aff.affectation_id, { date_fin: null });
    const sync = await service.syncExpectedPopulationForPersonnes([p.personne_id], ACTOR, { reason: 'CORRIGER_INACTIVATION' });
    assert.ok(sync.attendusAdded >= 1);
    assert.ok(attenduFor(await service.lireEvenement(event.evenement.evenement_id), p.personne_id));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  if(failed.length) process.exitCode = 1;
  else console.log('SCOPE-PERSONNEL-STATUS-UX-2: PASS');
})();
