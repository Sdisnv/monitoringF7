#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');

const ACTOR = { sub: 'scope-backfill-test', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function seedPerson(repo, cible, spec = {}){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: '2026-01-01'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cible.cible_id,
    date_debut: spec.dateDebut || '2026-01-01',
    date_fin: spec.dateFin || null
  });
  return personne;
}

async function frozenEvent(service, cibles, date, libelle){
  const rows = Array.isArray(cibles) ? cibles : [cibles];
  const created = await service.createEvenement({
    date,
    domaineCode: rows[0].domaine_code,
    libelle,
    cibleIds: rows.map((row) => row.cible_id)
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return service.lireEvenement(created.evenement.evenement_id);
}

function attendee(fiche, personneId){
  return (fiche.attendus || []).find((row) => String(row.personne_id) === String(personneId));
}

(async () => {
  await record('dry-run = zéro écriture, puis apply ajoute REGLE FOBA multi-cibles', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba2 = await repo.findCible('FOBA', '2');
    const p = await repo.insertPersonne({ nip: '48359-LIKE', nom: 'Buffat', prenom: 'Noémie', grade: 'Sap', date_entree: '2026-01-01' });
    const ev = await frozenEvent(service, [foba1, foba2], '2026-03-25', 'Exercice FOBA 2');
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });

    const dry = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA', dryRun: true }, ACTOR);
    assert.strictEqual(dry.attendusAdded, 1);
    assert.strictEqual(attendee(await service.lireEvenement(ev.evenement.evenement_id), p.personne_id), undefined);

    const applied = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA', dryRun: false }, ACTOR);
    assert.strictEqual(applied.attendusAdded, 1);
    const after = await service.lireEvenement(ev.evenement.evenement_id);
    assert.strictEqual(attendee(after, p.personne_id).origine, 'REGLE');
    assert.match(String(attendee(after, p.personne_id).motif_inclusion || ''), /FOBA_1/);
    assert.ok(!String(attendee(after, p.personne_id).motif_inclusion || '').includes('FOBA_2'));
  });

  await record('FOBA 3 non impacté par personne FOBA 1', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba3 = await repo.findCible('FOBA', '3');
    const p = await seedPerson(repo, foba1, { nip: 'BF3' });
    const ev = await frozenEvent(service, foba3, '2026-05-05', 'Consolidation FOBA 3');
    const dry = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA', dryRun: true }, ACTOR);
    assert.strictEqual(dry.attendusAdded, 0);
    assert.strictEqual(attendee(await service.lireEvenement(ev.evenement.evenement_id), p.personne_id), undefined);
  });

  await record('EXCEPTION_AJOUT valide reclassée, historique préservé, REALISE ignoré', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const p = await repo.insertPersonne({ nip: 'BMAN', nom: 'Manuel', prenom: 'Test', grade: 'Sap', date_entree: '2026-01-01' });
    const ev = await frozenEvent(service, foba1, '2026-06-01', 'FOBA manuel');
    await service.ajouterException(ev.evenement.evenement_id, { baseVersion: ev.evenement.version, personneId: p.personne_id, role: 'RENFORT' }, ACTOR);
    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: ev.evenement.version + 1,
      participations: [{ personneId: p.personne_id, statut: 'PRESENT', commentaire: 'historique' }]
    }, ACTOR);
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const applied = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA' }, ACTOR);
    assert.strictEqual(applied.reclassifiedManual, 1);
    let after = await service.lireEvenement(ev.evenement.evenement_id);
    assert.strictEqual(attendee(after, p.personne_id).origine, 'REGLE');
    assert.strictEqual(after.participations.find((row) => row.personne_id === p.personne_id).commentaire, 'historique');

    await repo.updateAffectation((await repo.listAffectations({ personneId: p.personne_id }))[0].affectation_id, { date_debut: '2026-07-01' });
    const removed = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA' }, ACTOR);
    assert.strictEqual(removed.attendusRemoved, 1);
    after = await service.lireEvenement(ev.evenement.evenement_id);
    assert.ok(after.attendusExclus.find((row) => row.personne_id === p.personne_id));
    assert.strictEqual(after.participations.find((row) => row.personne_id === p.personne_id).commentaire, 'historique');

    const realised = await frozenEvent(service, foba1, '2026-08-01', 'FOBA réalisé ignoré');
    await repo.updateEventIfVersion(realised.evenement.evenement_id, realised.evenement.version, { statut: 'REALISE' });
    await repo.updateAffectation((await repo.listAffectations({ personneId: p.personne_id }))[0].affectation_id, { date_debut: '2026-01-01' });
    const ignored = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA' }, ACTOR);
    assert.ok(ignored.skippedClosed >= 1);
  });

  await record('idempotence backfill x2 et KPI 14 + 2 + 1 = 17', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const personService = createScopePersonService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const people = [];
    for(let i = 0; i < 16; i++) people.push(await seedPerson(repo, foba1, { nip: `KPI${String(i).padStart(2, '0')}` }));
    const ev = await frozenEvent(service, foba1, '2026-03-25', 'Exercice FOBA KPI');
    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: ev.evenement.version,
      participations: [
        ...people.slice(0, 14).map((p) => ({ personneId: p.personne_id, statut: 'PRESENT' })),
        ...people.slice(14, 16).map((p) => ({ personneId: p.personne_id, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }))
      ]
    }, ACTOR);
    const missing = await seedPerson(repo, foba1, { nip: 'KPI17' });
    const first = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA' }, ACTOR);
    assert.strictEqual(first.attendusAdded, 1);
    const second = await service.reconcileExpectedPopulation({ year: '2026', domaine: 'FOBA' }, ACTOR);
    assert.strictEqual(second.eventsRecalculated, 0);
    const after = await service.lireEvenement(ev.evenement.evenement_id);
    assert.strictEqual(after.attendus.length, 17);
    assert.strictEqual(after.compteurs.presents, 14);
    assert.strictEqual(after.compteurs.excuses, 2);
    assert.strictEqual(after.compteurs.nonRenseignes, 1);
    assert.ok(attendee(after, missing.personne_id));

    await service.enregistrerParticipations(ev.evenement.evenement_id, {
      baseVersion: after.evenement.version,
      participations: [{ personneId: missing.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    await service.cloturer(ev.evenement.evenement_id, { baseVersion: after.evenement.version + 1 }, ACTOR);
    const fiche = await personService.fiche(missing.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(fiche.kpi.volumes.attendus, 1);
    assert.strictEqual(fiche.evenements.filter((row) => row.libelle === 'Exercice FOBA KPI').length, 1);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  if(failed.length) process.exitCode = 1;
  else console.log('SCOPE-EVENT-EXPECTED-POPULATION-BACKFILL-1: PASS');
})();
