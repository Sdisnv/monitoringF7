#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'sync-fix-3-test', roles: ['sdis-admin'] };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
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

function csv(lines){
  return ['NIP;Grade;Nom;Prénom;OI'].concat(lines).join('\n');
}

function attenduFor(fiche, personneId){
  return (fiche.attendus || []).find((row) => String(row.personne_id) === String(personneId));
}

function attenduExcluFor(fiche, personneId){
  return (fiche.attendusExclus || fiche.attendus_exclus || []).find((row) => String(row.personne_id) === String(personneId));
}

function participationFor(fiche, personneId){
  return (fiche.participations || []).find((row) => String(row.personne_id) === String(personneId));
}

(async () => {
  await record('FOBA rétroactif répare les événements existants multi-cibles sans toucher aux réalisés', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const personService = createScopePersonService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba2 = await repo.findCible('FOBA', '2');
    const dpsG1 = await repo.findCible('DPS', 'G1');
    const person = await seedPerson(repo, { nip: '48359', nom: 'Buffat', prenom: 'Noémie' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: dpsG1.cible_id, date_debut: '2026-01-01' });

    const february = await frozenEvent(service, foba1, '2026-02-05', 'FOBA 1 février');
    const may = await frozenEvent(service, [foba1, foba2], '2026-05-05', 'FOBA 1 + FOBA 2');
    const september = await frozenEvent(service, foba1, '2026-09-05', 'FOBA 1 septembre');
    const realised = await frozenEvent(service, foba1, '2026-04-05', 'FOBA réalisé');
    const realisedUpdated = await repo.updateEventIfVersion(realised.evenement.evenement_id, realised.evenement.version, { statut: 'REALISE' });
    assert.ok(realisedUpdated);

    for(const fiche of [february, may, september, realised]){
      assert.strictEqual(attenduFor(fiche, person.personne_id), undefined);
    }

    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01', date_fin: '2026-12-31' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR, { reason: 'TEST_FIX3' });
    assert.strictEqual(sync.eventsScanned, 3);
    assert.strictEqual(sync.eventsRecalculated, 3);
    assert.strictEqual(sync.attendusAdded, 3);

    for(const eventId of [february, may, september].map((fiche) => fiche.evenement.evenement_id)){
      const fiche = await service.lireEvenement(eventId);
      const attendu = attenduFor(fiche, person.personne_id);
      assert.ok(attendu);
      assert.strictEqual(attendu.origine, 'REGLE');
      assert.strictEqual(attendu.inclus, true);
      assert.match(String(attendu.motif_inclusion || ''), /FOBA_1/);
      assert.strictEqual((await repo.listAttendus(eventId)).filter((row) => String(row.personne_id) === String(person.personne_id)).length, 1);
    }
    const realisedAfter = await service.lireEvenement(realised.evenement.evenement_id);
    assert.strictEqual(attenduFor(realisedAfter, person.personne_id), undefined);

    const mayAfterSync = await service.lireEvenement(may.evenement.evenement_id);
    await service.enregistrerParticipations(may.evenement.evenement_id, {
      baseVersion: mayAfterSync.evenement.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    await service.cloturer(may.evenement.evenement_id, { baseVersion: mayAfterSync.evenement.version + 1 }, ACTOR);

    const fichePersonne = await personService.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    assert.strictEqual(fichePersonne.kpi.volumes.attendus, 1);
    assert.strictEqual(fichePersonne.evenements.filter((row) => row.libelle === 'FOBA 1 + FOBA 2').length, 1);
  });

  await record('Import inchangé déclenche la reconstruction des attendus obsolètes et reste idempotent', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y2 = await repo.findCible('DAP', 'Y2');
    const person = await seedPerson(repo, { nip: 'FIX3IMP', nom: 'Identique', prenom: 'Import' });
    const fiche = await frozenEvent(service, y2, '2026-05-05', 'DAP Y2 existant');
    assert.strictEqual(attenduFor(fiche, person.personne_id), undefined);
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: y2.cible_id, date_debut: '2026-01-01' });

    const text = csv(['FIX3IMP;Sap;Identique;Import;DAP Y2']);
    const preview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-01-01' });
    assert.strictEqual(preview.summary.INCHANGE, 1);
    const report = await service.commitPersonnelSync({ csvText: text, fingerprint: preview.fingerprint, dateEffetGlobale: '2026-01-01' }, ACTOR);
    assert.strictEqual(report.summary.inchanges, 1);
    assert.strictEqual(report.applied.length, 0);
    assert.deepStrictEqual(report.analysedNips, ['FIX3IMP']);
    assert.strictEqual(report.synchronisationPopulation.eventsRecalculated, 1);
    assert.strictEqual(report.synchronisationPopulation.attendusAdded, 1);

    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual(attenduFor(after, person.personne_id).origine, 'REGLE');
    assert.strictEqual((await repo.listAttendus(fiche.evenement.evenement_id)).filter((row) => String(row.personne_id) === String(person.personne_id)).length, 1);

    const secondPreview = await service.previewPersonnelSync({ csvText: text, dateEffetGlobale: '2026-01-01' });
    const second = await service.commitPersonnelSync({ csvText: text, fingerprint: secondPreview.fingerprint, dateEffetGlobale: '2026-01-01' }, ACTOR);
    assert.strictEqual(second.summary.inchanges, 1);
    assert.strictEqual(second.synchronisationPopulation.eventsRecalculated, 0);
    assert.strictEqual((await repo.listAttendus(fiche.evenement.evenement_id)).filter((row) => String(row.personne_id) === String(person.personne_id)).length, 1);
  });

  await record('Exception manuelle devenue cible valide est reclassée REGLE avec présence conservée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const person = await seedPerson(repo, { nip: 'FIX3MAN', nom: 'Manuel', prenom: 'Reclasse' });
    const fiche = await frozenEvent(service, foba1, '2026-06-05', 'FOBA manuel validé');
    await service.ajouterException(fiche.evenement.evenement_id, {
      baseVersion: fiche.evenement.version,
      personneId: person.personne_id,
      role: 'RENFORT'
    }, ACTOR);
    await service.enregistrerParticipations(fiche.evenement.evenement_id, {
      baseVersion: fiche.evenement.version + 1,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', commentaire: 'saisie MOA' }]
    }, ACTOR);
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });

    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR, { reason: 'TEST_FIX3' });
    assert.strictEqual(sync.reclassifiedManual, 1);
    assert.strictEqual(sync.attendusAdded, 0);
    assert.strictEqual(sync.participationsPreserved, 1);

    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual((await repo.listAttendus(fiche.evenement.evenement_id)).filter((row) => String(row.personne_id) === String(person.personne_id)).length, 1);
    assert.strictEqual(attenduFor(after, person.personne_id).origine, 'REGLE');
    assert.strictEqual(participationFor(after, person.personne_id).statut, 'PRESENT');
    assert.strictEqual(participationFor(after, person.personne_id).commentaire, 'saisie MOA');
    assert.strictEqual(after.compteurs.numerator, 1);
    assert.strictEqual(after.compteurs.denominator, 1);
  });

  await record('Route legacy expose les NIP analysés au déclencheur de synchronisation', async () => {
    const serviceFile = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-personnel-service.js'), 'utf8');
    const routeFile = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-import-commit.js'), 'utf8');
    assert.ok(serviceFile.includes('analysedNips'));
    assert.ok(routeFile.includes('rapport.analysedNips'));
    assert.ok(routeFile.includes('syncExpectedPopulationFromNips(['));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  if(failed.length) process.exitCode = 1;
  else console.log('SCOPE-EVENT-EXPECTED-POPULATION-SYNC-1-FIX-3: PASS');
})();
