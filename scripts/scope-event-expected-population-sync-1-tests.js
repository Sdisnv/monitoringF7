#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const refs = require('../assets/js/scope-personnel-referentials.js');

const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function createFrozenEvent(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, { sub: 'test' });
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, { sub: 'test' });
  return service.lireEvenement(created.evenement.evenement_id);
}

async function seedPerson(repo, spec){
  return repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: spec.date_entree || '2026-01-01'
  });
}

(async () => {
  await record('Synchronise un nouvel attendu depuis une affectation valide, sans sync globale', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const dpsG1 = await repo.findCible('DPS', 'G1');
    const person = await seedPerson(repo, { nip: 'SYNC001', nom: 'Alpha' });
    const target = await createFrozenEvent(service, foba1, '2026-09-15', 'FOBA cible');
    const other = await createFrozenEvent(service, dpsG1, '2026-09-15', 'DPS hors cible');

    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba1.cible_id, date_debut: '2026-09-01' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], { sub: 'test' });
    assert.strictEqual(sync.eventsRecalculated, 1);

    const updatedTarget = await service.lireEvenement(target.evenement.evenement_id);
    const attendu = updatedTarget.attendus.find((row) => row.personne_id === person.personne_id);
    assert.ok(attendu);
    assert.strictEqual(attendu.inclus, true);
    assert.strictEqual(attendu.origine, 'REGLE');
    const participation = updatedTarget.participations.find((row) => row.personne_id === person.personne_id);
    assert.strictEqual(participation.statut, 'NON_RENSEIGNE');
    assert.strictEqual(participation.role, 'PARTICIPANT');

    const untouchedOther = await service.lireEvenement(other.evenement.evenement_id);
    assert.strictEqual(untouchedOther.attendus.some((row) => row.personne_id === person.personne_id), false);
  });

  await record('Retire seulement les attendus normaux sortis de période et conserve les présences saisies', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const person = await seedPerson(repo, { nip: 'SYNC002', nom: 'Beta' });
    const aff = await repo.insertAffectation({
      personne_id: person.personne_id,
      cible_id: foba1.cible_id,
      date_debut: '2026-01-01',
      date_fin: '2026-12-31'
    });
    const before = await createFrozenEvent(service, foba1, '2026-04-15', 'FOBA avant');
    const inside = await createFrozenEvent(service, foba1, '2026-06-15', 'FOBA dedans');
    const after = await createFrozenEvent(service, foba1, '2026-10-15', 'FOBA apres');

    await service.enregistrerParticipations(after.evenement.evenement_id, {
      baseVersion: after.evenement.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', commentaire: 'Saisie conservée' }]
    }, { sub: 'test' });

    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-06-01', date_fin: '2026-08-31' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], { sub: 'test' });
    assert.strictEqual(sync.eventsRecalculated, 2);

    const beforeFiche = await service.lireEvenement(before.evenement.evenement_id);
    const insideFiche = await service.lireEvenement(inside.evenement.evenement_id);
    const afterFiche = await service.lireEvenement(after.evenement.evenement_id);
    assert.strictEqual(beforeFiche.attendus.some((row) => row.personne_id === person.personne_id), false);
    assert.strictEqual(beforeFiche.attendusExclus.find((row) => row.personne_id === person.personne_id).inclus, false);
    assert.strictEqual(beforeFiche.participations.find((row) => row.personne_id === person.personne_id).statut, 'NON_CONCERNE');
    assert.strictEqual(insideFiche.attendus.find((row) => row.personne_id === person.personne_id).inclus, true);
    assert.strictEqual(afterFiche.attendus.some((row) => row.personne_id === person.personne_id), false);
    assert.strictEqual(afterFiche.attendusExclus.find((row) => row.personne_id === person.personne_id).inclus, false);
    const preserved = afterFiche.participations.find((row) => row.personne_id === person.personne_id);
    assert.strictEqual(preserved.statut, 'PRESENT');
    assert.strictEqual(preserved.commentaire, 'Saisie conservée');
  });

  await record('Ne modifie pas un événement réalisé historiquement figé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const person = await seedPerson(repo, { nip: 'SYNC003', nom: 'Gamma' });
    const aff = await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const fiche = await createFrozenEvent(service, foba1, '2026-05-15', 'FOBA historique');
    await service.enregistrerParticipations(fiche.evenement.evenement_id, {
      baseVersion: fiche.evenement.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, { sub: 'test' });
    await service.cloturer(fiche.evenement.evenement_id, { baseVersion: fiche.evenement.version + 1 }, { sub: 'test' });

    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-06-01' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], { sub: 'test' });
    assert.strictEqual(sync.eventsRecalculated, 0);
    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual(after.attendus.find((row) => row.personne_id === person.personne_id).inclus, true);
    assert.strictEqual(after.participations.find((row) => row.personne_id === person.personne_id).statut, 'PRESENT');
  });

  await record('Ajout manuel cible-valide classé REGLE et exception hors cible conservée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const dpsG1 = await repo.findCible('DPS', 'G1');
    const valid = await seedPerson(repo, { nip: 'SYNC004', nom: 'Delta' });
    const outsider = await seedPerson(repo, { nip: 'SYNC005', nom: 'Epsilon' });
    await repo.insertAffectation({ personne_id: outsider.personne_id, cible_id: dpsG1.cible_id, date_debut: '2026-01-01' });
    const fiche = await createFrozenEvent(service, foba1, '2026-11-15', 'FOBA manuel');
    await repo.insertAffectation({ personne_id: valid.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });

    const addedValid = await service.ajouterException(fiche.evenement.evenement_id, { baseVersion: fiche.evenement.version, personneId: valid.personne_id, role: 'PARTICIPANT' }, { sub: 'test' });
    await service.ajouterException(fiche.evenement.evenement_id, { baseVersion: addedValid.version, personneId: outsider.personne_id, role: 'RENFORT' }, { sub: 'test' });
    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual(after.attendus.find((row) => row.personne_id === valid.personne_id).origine, 'REGLE');
    assert.strictEqual(after.attendus.find((row) => row.personne_id === outsider.personne_id).origine, 'EXCEPTION_AJOUT');
  });

  await record('Reclasse une exception existante devenue valide sans perdre la participation', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const person = await seedPerson(repo, { nip: 'SYNC006', nom: 'Zeta' });
    const fiche = await createFrozenEvent(service, foba1, '2026-12-15', 'FOBA reclass');
    await service.ajouterException(fiche.evenement.evenement_id, { baseVersion: fiche.evenement.version, personneId: person.personne_id, role: 'RENFORT' }, { sub: 'test' });
    await service.enregistrerParticipations(fiche.evenement.evenement_id, {
      baseVersion: fiche.evenement.version + 1,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', commentaire: 'Déjà saisi' }]
    }, { sub: 'test' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });

    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], { sub: 'test' });
    assert.strictEqual(sync.reclassifiedManual, 1);
    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual(after.attendus.find((row) => row.personne_id === person.personne_id).origine, 'REGLE');
    assert.strictEqual(after.participations.find((row) => row.personne_id === person.personne_id).commentaire, 'Déjà saisi');
  });

  await record('Trie l’encadrement par grade puis nom puis prénom', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const fiche = await createFrozenEvent(service, foba1, '2026-07-15', 'FOBA encadrement');
    const people = [
      await seedPerson(repo, { nip: 'ENC004', nom: 'Zulu', prenom: 'Zoé', grade: 'Sgt' }),
      await seedPerson(repo, { nip: 'ENC001', nom: 'Alpha', prenom: 'Anne', grade: 'Sap' }),
      await seedPerson(repo, { nip: 'ENC003', nom: 'Martin', prenom: 'Paul', grade: 'Cpl' }),
      await seedPerson(repo, { nip: 'ENC002', nom: 'Bernard', prenom: 'Marc', grade: 'Cpl' })
    ];
    let version = fiche.evenement.version;
    for(const person of people){
      await service.ajouterEncadrement(fiche.evenement.evenement_id, {
        baseVersion: version,
        personneId: person.personne_id,
        role: 'FORMATEUR'
      }, { sub: 'test' });
      version += 1;
    }
    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    const rank = (grade) => {
      const code = refs.canonicalGradeCode(grade);
      const row = refs.GRADES.find((item) => item.code === code);
      return row ? row.rang : -1;
    };
    const expected = people.slice().sort((a, b) => (rank(b.grade) - rank(a.grade))
      || String(a.nom).localeCompare(String(b.nom), 'fr', { sensitivity: 'base', numeric: true })
      || String(a.prenom).localeCompare(String(b.prenom), 'fr', { sensitivity: 'base', numeric: true }))
      .map((p) => p.nip);
    assert.deepStrictEqual(after.encadrement.map((row) => row.nip), expected);
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((r) => r.status !== 'PASS');
  if(failed.length){
    process.exitCode = 1;
  }else{
    console.log('SCOPE-EVENT-EXPECTED-POPULATION-SYNC-1: PASS');
  }
})();
