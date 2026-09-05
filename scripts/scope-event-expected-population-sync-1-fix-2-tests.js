#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const refs = require('../assets/js/scope-personnel-referentials.js');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'sync-fix-2-test' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function frozenEvent(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return service.lireEvenement(created.evenement.evenement_id);
}

async function person(repo, spec){
  return repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom,
    prenom: spec.prenom,
    grade: spec.grade,
    date_entree: '2026-01-01'
  });
}

function gradeRank(grade){
  const code = refs.canonicalGradeCode(grade);
  const row = refs.GRADES.find((item) => item.code === code);
  return row ? Number(row.rang) : null;
}

function encadrementCompare(a, b){
  const ra = gradeRank(a.grade);
  const rb = gradeRank(b.grade);
  if(ra !== null && rb !== null && ra !== rb) return rb - ra;
  if(ra !== null && rb === null) return -1;
  if(ra === null && rb !== null) return 1;
  return String(a.grade || '').localeCompare(String(b.grade || ''), 'fr', { sensitivity: 'base', numeric: true })
    || String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base', numeric: true })
    || String(a.prenom || '').localeCompare(String(b.prenom || ''), 'fr', { sensitivity: 'base', numeric: true })
    || String(a.nip || '').localeCompare(String(b.nip || ''), 'fr', { sensitivity: 'base', numeric: true });
}

(async () => {
  await record('Population attendue exclut hors période mais conserve participation historique', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const a = await person(repo, { nip: 'FIX2-001', nom: 'Historique', prenom: 'Alice', grade: 'Sap' });
    const aff = await repo.insertAffectation({
      personne_id: a.personne_id,
      cible_id: foba1.cible_id,
      date_debut: '2026-01-01'
    });
    let fiche = await frozenEvent(service, foba1, '2026-06-15', 'FOBA historique FIX-2');
    assert.strictEqual(fiche.attendus.filter((row) => row.personne_id === a.personne_id).length, 1);
    assert.strictEqual(fiche.attendusExclus.length, 0);

    await service.enregistrerParticipations(fiche.evenement.evenement_id, {
      baseVersion: fiche.evenement.version,
      participations: [{ personneId: a.personne_id, statut: 'PRESENT', commentaire: 'historique' }]
    }, ACTOR);
    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-07-01' });
    const sync = await service.syncExpectedPopulationForPersonnes([a.personne_id], ACTOR);
    assert.strictEqual(sync.attendusRemoved, 1);

    fiche = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual(fiche.attendus.some((row) => row.personne_id === a.personne_id), false);
    assert.strictEqual(fiche.attendusExclus.filter((row) => row.personne_id === a.personne_id).length, 1);
    assert.strictEqual(fiche.attendusExclus[0].origine_retrait, 'EXCEPTION_RETRAIT');
    assert.strictEqual(sync.details[0].removed[0].motifRetrait, 'AFFECTATION_HORS_PERIODE_HISTORIQUE');
    assert.strictEqual(fiche.compteurs.numerator, 0);
    assert.strictEqual(fiche.compteurs.denominator, 0);
    assert.strictEqual(fiche.compteurs.percentage, null);
    const participation = fiche.participations.find((row) => row.personne_id === a.personne_id);
    assert.strictEqual(participation.statut, 'PRESENT');
    assert.strictEqual(participation.commentaire, 'historique');
    assert.strictEqual(fiche.participations.filter((row) => row.personne_id === a.personne_id).length, 1);
    assert.strictEqual((await repo.listAttendus(fiche.evenement.evenement_id)).filter((row) => row.personne_id === a.personne_id).length, 1);

    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-01-01' });
    const resync = await service.syncExpectedPopulationForPersonnes([a.personne_id], ACTOR);
    assert.strictEqual(resync.eventsRecalculated, 1);
    fiche = await service.lireEvenement(fiche.evenement.evenement_id);
    assert.strictEqual(fiche.attendus.filter((row) => row.personne_id === a.personne_id && row.origine === 'REGLE').length, 1);
    assert.strictEqual(fiche.attendusExclus.some((row) => row.personne_id === a.personne_id), false);
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === a.personne_id).commentaire, 'historique');
    assert.strictEqual(fiche.compteurs.numerator, 1);
    assert.strictEqual(fiche.compteurs.denominator, 1);
  });

  await record('Encadrement trie par rang métier descendant puis nom prénom NIP, tous rôles confondus', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const fiche = await frozenEvent(service, foba1, '2026-09-15', 'FOBA encadrement FIX-2');
    const people = [
      { role: 'FORMATEUR', spec: { nip: 'FIX2-LT', nom: 'Charlie', prenom: 'Lina', grade: 'Lt instr' } },
      { role: 'AUXILIAIRE', spec: { nip: 'FIX2-SAP', nom: 'Delta', prenom: 'Sara', grade: 'Sap' } },
      { role: 'SURVEILLANT', spec: { nip: 'FIX2-CAPZ', nom: 'Zulu', prenom: 'Zoé', grade: 'Cap' } },
      { role: 'MONITEUR', spec: { nip: 'FIX2-CAPA', nom: 'Alpha', prenom: 'Anne', grade: 'Cap' } },
      { role: 'FORMATEUR', spec: { nip: 'FIX2-PLT', nom: 'Bravo', prenom: 'Marc', grade: 'Plt instr' } },
      { role: 'SURVEILLANT', spec: { nip: 'FIX2-CAPN', nom: 'Same', prenom: 'Nina', grade: 'Cap' } },
      { role: 'FORMATEUR', spec: { nip: 'FIX2-CAPA2', nom: 'Same', prenom: 'Alice', grade: 'Cap' } }
    ];
    let version = fiche.evenement.version;
    const saved = [];
    for(const entry of people){
      const p = await person(repo, entry.spec);
      saved.push({ ...entry.spec, personne_id: p.personne_id, role: entry.role });
      const added = await service.ajouterEncadrement(fiche.evenement.evenement_id, {
        baseVersion: version,
        personneId: p.personne_id,
        role: entry.role
      }, ACTOR);
      version = added.version;
    }
    const after = await service.lireEvenement(fiche.evenement.evenement_id);
    const expected = saved.slice().sort(encadrementCompare).map((row) => row.nip);
    assert.deepStrictEqual(after.encadrement.map((row) => row.nip), expected);
    assert.deepStrictEqual(after.encadrement.map((row) => row.nip), [
      'FIX2-CAPA',
      'FIX2-CAPA2',
      'FIX2-CAPN',
      'FIX2-CAPZ',
      'FIX2-PLT',
      'FIX2-LT',
      'FIX2-SAP'
    ]);
  });

  await record('UI encadrement groupe les personnes par rôle, tri grade/nom/prénom dans chaque groupe', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('const byRole = new Map'));
    assert.ok(ui.includes('encadrementRoleHeading'));
    assert.ok(ui.includes('sortPeopleForEncadrement'));
    assert.ok(ui.includes('ROLE_LABELS[role]'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((row) => row.status !== 'PASS');
  if(failed.length) process.exitCode = 1;
  else console.log('SCOPE-EVENT-EXPECTED-POPULATION-SYNC-1-FIX-2: PASS');
})();
