#!/usr/bin/env node
'use strict';

/** SCOPE-EVENT-EDIT-1 — modification contrôlée d’un événement existant. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { HttpError } = require('../netlify/functions/_scope-rules');
const { MOTIFS_JSP } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
const pgSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pg.js'), 'utf8');
const ACTOR = { sub: 'event-edit-1' };
const HEADER = 'CODE COURS;date;début;fin;événement;domaine;qui;public_cible;responsable;salle;STAT.COM.';
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function csv(rows){
  return [HEADER, ...rows].join('\n');
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: spec.dateDebut || '2026-01-01',
    date_fin: spec.dateFin || null
  });
  return personne;
}

async function freezeEvent(service, cible, date, libelle, extra){
  const created = await service.createEvenement(Object.assign({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, extra || {}), ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return {
    eventId: created.evenement.evenement_id,
    version: frozen.version,
    codeCours: created.evenement.code_cours,
    evenement: frozen.evenement
  };
}

(async () => {
  await record('01 — modification date PLANIFIÉ', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'JSPEDIT1' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      date: '2026-08-27'
    }, ACTOR);
    assert.strictEqual(String(moved.evenement.date).slice(0, 10), '2026-08-27');
    assert.strictEqual(moved.evenement.statut, 'PLANIFIE');
  });

  await record('02 — evenement_id inchangé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'JSPEDIT2' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      date: '2026-08-27'
    }, ACTOR);
    assert.strictEqual(moved.evenement.evenement_id, frozen.eventId);
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 1);
  });

  await record('03 — CODE_EVENT inchangé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'JSPEDIT3' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6', { codeCours: '010JB1.445' });
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      date: '2026-08-27',
      heureDebut: '18:00',
      heureFin: '20:00',
      libelle: 'Exercice JSP 6'
    }, ACTOR);
    assert.strictEqual(moved.evenement.code_cours, '010JB1.445');
    await assert.rejects(
      () => service.patchEvenement(frozen.eventId, { baseVersion: moved.version, codeCours: 'OTHER' }, ACTOR),
      (error) => error instanceof HttpError && error.error === 'code_cours_immutable'
    );
  });

  await record('04 — audit ancienne/nouvelle date', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'JSPEDIT4' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      date: '2026-08-27',
      motif: 'Report opérationnel'
    }, ACTOR);
    const journal = await repo.listJournal('evenement', frozen.eventId);
    const mod = journal.filter((row) => row.action === 'MODIFIER').pop();
    assert.ok(mod);
    assert.strictEqual(mod.avant.date, '2026-06-18');
    assert.strictEqual(mod.apres.date, '2026-08-27');
    assert.strictEqual(mod.avant.code_cours, frozen.codeCours);
    assert.strictEqual(mod.apres.code_cours, frozen.codeCours);
    assert.ok((mod.apres.champs || []).some((c) => c.champ === 'date'));
    assert.strictEqual(mod.commentaire, 'Report opérationnel');
    assert.strictEqual(mod.auteur_id, ACTOR.sub);
  });

  await record('05 — changement horaire', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'JSPEDIT5' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      heureDebut: '18:00',
      heureFin: '20:00'
    }, ACTOR);
    assert.strictEqual(moved.evenement.heure_debut, '18:00');
    assert.strictEqual(moved.evenement.heure_fin, '20:00');
    assert.strictEqual(String(moved.evenement.date).slice(0, 10), '2026-06-18');
  });

  await record('06 — changement libellé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'JSPEDIT6' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      libelle: 'Exercice JSP 6 — Nord vaudois'
    }, ACTOR);
    assert.strictEqual(moved.evenement.libelle, 'Exercice JSP 6 — Nord vaudois');
    assert.strictEqual(moved.evenement.code_cours, frozen.codeCours);
  });

  await record('07 — changement cible', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const b1 = await repo.findCible('JSP', 'B1');
    const c1 = await repo.findCible('JSP', 'C1');
    await seedPerson(repo, b1.cible_id, { nip: 'JSPB1E' });
    await seedPerson(repo, c1.cible_id, { nip: 'JSPC1E' });
    const frozen = await freezeEvent(service, b1, '2026-06-18', 'Exercice JSP 6');
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      cibleIds: [c1.cible_id]
    }, ACTOR);
    const ids = await repo.listEventCibleIds(frozen.eventId);
    assert.deepStrictEqual(ids, [c1.cible_id]);
    assert.strictEqual(moved.evenement.evenement_id, frozen.eventId);
  });

  await record('08 — resync ciblé population', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const b1 = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, b1.cible_id, { nip: 'JUNEONLY', dateDebut: '2026-01-01', dateFin: '2026-07-01' });
    await seedPerson(repo, b1.cible_id, { nip: 'AUGONLY', dateDebut: '2026-08-01' });
    const frozen = await freezeEvent(service, b1, '2026-06-18', 'Exercice JSP 6');
    await service.patchEvenement(frozen.eventId, { baseVersion: frozen.version, date: '2026-08-27' }, ACTOR);
    const fiche = await service.lireEvenement(frozen.eventId);
    const nips = [];
    for(const att of fiche.attendus.filter((a) => a.inclus !== false)){
      nips.push((await repo.getPersonne(att.personne_id)).nip);
    }
    assert.ok(nips.includes('AUGONLY'));
    assert.ok(!nips.includes('JUNEONLY'));
  });

  await record('09 — aucun resync annuel', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const b1 = await repo.findCible('JSP', 'B1');
    const c1 = await repo.findCible('JSP', 'C1');
    await seedPerson(repo, b1.cible_id, { nip: 'B1P' });
    await seedPerson(repo, c1.cible_id, { nip: 'C1P' });
    const target = await freezeEvent(service, b1, '2026-06-18', 'Exercice JSP 6');
    const other = await freezeEvent(service, c1, '2026-06-01', 'Exercice JSP 6');
    const before = (await service.lireEvenement(other.eventId)).attendus.map((a) => a.personne_id).sort();
    await service.patchEvenement(target.eventId, { baseVersion: target.version, date: '2026-08-27' }, ACTOR);
    const after = (await service.lireEvenement(other.eventId)).attendus.map((a) => a.personne_id).sort();
    assert.deepStrictEqual(after, before);
    assert.ok(!serviceSrc.includes("reason: 'BACKFILL_POPULATION_ATTENDUE'") || serviceSrc.includes("reason: 'EVENT_EDIT_POPULATION'"));
    assert.ok(serviceSrc.includes('EVENT_EDIT_POPULATION'));
  });

  await record('10 — participations existantes conservées', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'KEEPME', dateDebut: '2026-01-01', dateFin: '2026-07-01' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const saved = await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    await service.patchEvenement(frozen.eventId, {
      baseVersion: saved.version,
      date: '2026-08-27',
      confirmPopulationImpact: true
    }, ACTOR);
    const parts = await repo.listParticipations(frozen.eventId);
    assert.strictEqual(parts[0].statut, 'PRESENT');
    assert.strictEqual(parts.length, 1);
  });

  await record('11 — événement RÉALISÉ non modifiable directement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'REAL1' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const saved = await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    const closed = await service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    await assert.rejects(
      () => service.patchEvenement(frozen.eventId, { baseVersion: closed.version, date: '2026-08-27' }, ACTOR),
      (error) => error instanceof HttpError && error.error === 'evenement_realise_non_modifiable'
    );
  });

  await record('12 — réouverture obligatoire', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'REAL2' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const saved = await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    const closed = await service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    const reopened = await service.reouvrir(frozen.eventId, {
      baseVersion: closed.version,
      motif: 'Correction de date'
    }, ACTOR);
    const moved = await service.patchEvenement(frozen.eventId, {
      baseVersion: reopened.version,
      date: '2026-08-27',
      confirmPopulationImpact: true
    }, ACTOR);
    assert.strictEqual(String(moved.evenement.date).slice(0, 10), '2026-08-27');
    assert.strictEqual(moved.evenement.statut, 'PLANIFIE');
  });

  await record('13 — annulation sans suppression', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'ANNUL1' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6');
    const cancelled = await service.annulerEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      motif: 'Annulation de séance'
    }, ACTOR);
    assert.strictEqual(cancelled.evenement.statut, 'ANNULE');
    assert.ok(await repo.getEvent(frozen.eventId));
    assert.ok((await repo.listAttendus(frozen.eventId)).length >= 1);
  });

  await record('14 — report sans création doublon', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    await seedPerson(repo, cible.cible_id, { nip: 'REP1' });
    const frozen = await freezeEvent(service, cible, '2026-06-18', 'Exercice JSP 6', { codeCours: '010JB1.445' });
    const reported = await service.patchEvenement(frozen.eventId, {
      baseVersion: frozen.version,
      date: '2026-08-27',
      statut: 'REPORTE',
      motif: 'Report au 27 août'
    }, ACTOR);
    assert.strictEqual(reported.evenement.statut, 'REPORTE');
    assert.strictEqual(reported.evenement.code_cours, '010JB1.445');
    assert.strictEqual((await repo.listEvenements({ annee: 2026 })).length, 1);
    const journal = await repo.listJournal('evenement', frozen.eventId);
    assert.ok(journal.some((row) => row.action === 'REPORTER'));
  });

  await record('15 — modification d’un événement n’affecte aucun autre', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const b1 = await repo.findCible('JSP', 'B1');
    const g1 = await repo.findCible('JSP', 'G1');
    await seedPerson(repo, b1.cible_id, { nip: 'B1X' });
    await seedPerson(repo, g1.cible_id, { nip: 'G1X' });
    const a = await freezeEvent(service, b1, '2026-06-18', 'Exercice JSP 6');
    const b = await freezeEvent(service, g1, '2026-09-12', 'Exercice JSP 6');
    const before = await repo.getEvent(b.eventId);
    await service.patchEvenement(a.eventId, { baseVersion: a.version, date: '2026-08-27', libelle: 'Exercice JSP 6 déplacé' }, ACTOR);
    const after = await repo.getEvent(b.eventId);
    assert.strictEqual(String(after.date).slice(0, 10), String(before.date).slice(0, 10));
    assert.strictEqual(after.libelle, before.libelle);
    assert.strictEqual(after.version, before.version);
  });

  await record('16 — même CODE_EVENT futur import détecte divergence', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const textA = csv(['010JB1.445;18.06.2026;18:00;20:00;Exercice JSP 6;JSP;JSP;JSP B1;Resp;Salle;010JB1']);
    const previewA = await service.previewImportEvenements({ csvText: textA, filename: 'a.csv' });
    await service.commitImportEvenements({ csvText: textA, filename: 'a.csv', previewToken: previewA.previewToken }, ACTOR);
    const textB = csv(['010JB1.445;27.08.2026;18:00;20:00;Exercice JSP 6;JSP;JSP;JSP B1;Resp;Salle;010JB1']);
    const previewB = await service.previewImportEvenements({ csvText: textB, filename: 'b.csv' });
    assert.strictEqual(previewB.groups[0].statut, 'DIVERGENCE');
    assert.ok((previewB.lignes[0].divergences || []).some((d) => d.champ === 'date' && d.avant === '2026-06-18' && d.apres === '2026-08-27'));
  });

  await record('17 — aucun ON CONFLICT DO NOTHING silencieux pour changement métier', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const textA = csv(['010JB1.445;18.06.2026;18:00;20:00;Exercice JSP 6;JSP;JSP;JSP B1;Resp;Salle;010JB1']);
    const previewA = await service.previewImportEvenements({ csvText: textA, filename: 'a.csv' });
    await service.commitImportEvenements({ csvText: textA, filename: 'a.csv', previewToken: previewA.previewToken }, ACTOR);
    const textB = csv(['010JB1.445;27.08.2026;18:00;20:00;Exercice JSP 6;JSP;JSP;JSP B1;Resp;Salle;010JB1']);
    const previewB = await service.previewImportEvenements({ csvText: textB, filename: 'b.csv' });
    await assert.rejects(
      () => service.commitImportEvenements({ csvText: textB, filename: 'b.csv', previewToken: previewB.previewToken }, ACTOR),
      (error) => error instanceof HttpError && error.error === 'import_refuse'
    );
    const events = await repo.listEvenements({ annee: 2026 });
    assert.strictEqual(events.length, 1);
    assert.strictEqual(String(events[0].date).slice(0, 10), '2026-06-18');
    assert.ok(pgSrc.includes('on conflict (code_cours)'));
    assert.ok(serviceSrc.includes("statut === 'DIVERGENCE'"));
  });

  await record('18 — micro-correctif UX 3203b3c non régressé', () => {
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(ui.includes('scope-row-session-counted'));
    assert.ok(ui.includes('id="edit-event"'));
    assert.ok(ui.includes('Modifier l’événement'));
    assert.ok(!ui.includes('id="retarget-cible"'));
  });

  await record('19 — multi-session R4 non régressé', () => {
    assert.ok(rulesSrc.includes('function computePrExerciseParticipationState'));
    assert.ok(rulesSrc.includes('function canCloseLastSession'));
  });

  await record('20 — JSP motifs non régressés', () => {
    assert.deepStrictEqual(logic.motifsSaisieForDomaine('JSP').map((m) => m.value), Object.values(MOTIFS_JSP));
  });

  const failed = results.filter((row) => row.status === 'NOK');
  results.forEach((row) => {
    if(row.status === 'PASS') console.log(`PASS ${row.name}`);
    else {
      console.log(`NOK ${row.name}`);
      console.log(row.proof);
    }
  });
  if(failed.length){
    console.error(`SCOPE-EVENT-EDIT-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENT-EDIT-1: ${results.length} PASS`);
})();
