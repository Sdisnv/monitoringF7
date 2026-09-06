#!/usr/bin/env node
'use strict';

/** SCOPE-EVENT-DATA-INTEGRITY-1-R1 — référence 010JB1.445 / 2026-08-27. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const importContract = require('../assets/js/scope-import-contract.js');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-cycle-rules.js'), 'utf8');
const fixture = fs.readFileSync(path.join(ROOT, 'tests/fixtures/scope-jsp6-b1-planning-reference.csv'), 'utf8');
const f7Json = fs.readFileSync(path.join(ROOT, 'assets/data/monitoring_exercices_sdis_2026_2026-04-24_1446.json'), 'utf8');
const HEADER = 'CODE COURS;date;début;fin;événement;domaine;qui;public_cible;responsable;salle;STAT.COM.';
const ACTOR = { sub: 'event-data-integrity-1-r1' };
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

function row({ code, date, libelle, domaine = 'JSP', qui = 'JSP', publicCible, statCom }){
  return [code, date, '18:00', '20:00', libelle, domaine, qui, publicCible, 'Resp', 'Salle', statCom, '', '', 'oui', ''].join(';');
}

async function commit(service, text){
  const preview = await service.previewImportEvenements({ csvText: text, filename: 'jsp6-b1.csv' });
  const result = await service.commitImportEvenements({
    csvText: text,
    filename: 'jsp6-b1.csv',
    previewToken: preview.previewToken
  }, ACTOR);
  return { preview, result };
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'JSP',
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

(async () => {
  await record('01 — CODE_EVENT conserve le suffixe / numéro de ligne', () => {
    const parts = importContract.splitCodeCours('010JB1.445', '010JB1', 'JSP');
    assert.strictEqual(parts.suffix, '445');
    assert.strictEqual(parts.statCom, '010JB1');
    assert.strictEqual(importContract.buildCodeCours('010JB1', 'JSP', '445'), '010JB1JSP.445');
    assert.notStrictEqual(parts.normalized, '010JB1');
  });

  await record('02 — 010JB1.445 n’est pas confondu avec un autre événement 010JB1', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([
      row({ code: '010JB1.445', date: '27.08.2026', libelle: 'Exercice JSP 6', publicCible: 'JSP B1', statCom: '010JB1' }),
      row({ code: '010JB1JSP.3', date: '13.01.2026', libelle: 'Exercice JSP 1', publicCible: 'JSP B1', statCom: '010JB1' })
    ]));
    assert.strictEqual(result.created.length, 2);
    const events = await repo.listEvenements({ annee: 2026 });
    const codes = events.map((e) => e.code_cours).sort();
    assert.deepStrictEqual(codes.sort(), ['010JB1.445', '010JB1JSP.3'].sort());
    assert.notStrictEqual(
      events.find((e) => e.code_cours === '010JB1.445').evenement_id,
      events.find((e) => e.code_cours === '010JB1JSP.3').evenement_id
    );
  });

  await record('03 — JSP 6 B1 attendu au 27.08.2026 dans la fixture métier', () => {
    assert.ok(fixture.includes('010JB1.445'));
    assert.ok(fixture.includes('27.08.2026'));
    assert.ok(fixture.includes('Exercice JSP 6'));
    assert.ok(fixture.includes('010JB1'));
    assert.ok(!fixture.includes('18.06.2026'));
    const f7 = JSON.parse(f7Json);
    const hit = (f7.importedEvents || []).find((item) => item.template === 'Exercice JSP 6' && item.subStructure === 'JSP B1');
    assert.ok(hit, 'snapshot F7 JSP 6 B1');
    assert.strictEqual(hit.dateExercice, '2026-06-18');
    assert.strictEqual(hit.statCom, '010JB1');
    assert.ok(!JSON.stringify(hit).includes('.445'));
    const c1 = (f7.importedEvents || []).find((item) => item.template === 'Exercice JSP 6' && item.subStructure === 'JSP C1');
    const g1 = (f7.importedEvents || []).find((item) => item.template === 'Exercice JSP 6' && item.subStructure === 'JSP G1');
    assert.strictEqual(c1.dateExercice, '2026-06-01');
    assert.strictEqual(g1.dateExercice, '2026-09-12');
  });

  await record('04 — changement ciblé de date ne touche aucun autre événement', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const { result } = await commit(service, csv([
      row({ code: '010JB1.445', date: '18.06.2026', libelle: 'Exercice JSP 6', publicCible: 'JSP B1', statCom: '010JB1' }),
      row({ code: '010JC1JSP.1', date: '01.06.2026', libelle: 'Exercice JSP 6', publicCible: 'JSP C1', statCom: '010JC1' })
    ]));
    const b1 = await repo.getEvent(result.created.find((c) => c.codeCours === '010JB1.445').evenementId);
    const c1 = await repo.getEvent(result.created.find((c) => c.codeCours === '010JC1JSP.1').evenementId);
    const moved = await service.patchEvenement(b1.evenement_id, { baseVersion: b1.version, date: '2026-08-27' }, ACTOR);
    assert.strictEqual(String(moved.evenement.date).slice(0, 10), '2026-08-27');
    assert.strictEqual(String((await repo.getEvent(c1.evenement_id)).date).slice(0, 10), '2026-06-01');
    assert.strictEqual(moved.evenement.code_cours, '010JB1.445');
  });

  await record('05 — participations existantes protégées', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'JSPB1445' });
    const created = await service.createEvenement({
      date: '2026-06-18',
      domaineCode: 'JSP',
      libelle: 'Exercice JSP 6',
      cibleIds: [cible.cible_id],
      codeCours: '010JB1.445'
    }, ACTOR);
    const frozen = await service.figerPopulation(created.evenement.evenement_id, {
      baseVersion: created.evenement.version
    }, ACTOR);
    const saved = await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    const eventId = created.evenement.evenement_id;
    await service.patchEvenement(eventId, {
      baseVersion: saved.version,
      date: '2026-08-27',
      confirmPopulationImpact: true
    }, ACTOR);
    const parts = await repo.listParticipations(eventId);
    assert.strictEqual(parts.length, 1);
    assert.strictEqual(parts[0].statut, 'PRESENT');
    assert.strictEqual(String((await repo.getEvent(eventId)).code_cours), '010JB1.445');
  });

  await record('06 — événement RÉALISÉ non resynchronisé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'JSPB1R' });
    const created = await service.createEvenement({
      date: '2026-06-18', domaineCode: 'JSP', libelle: 'Exercice JSP 6', cibleIds: [cible.cible_id]
    }, ACTOR);
    const frozen = await service.figerPopulation(created.evenement.evenement_id, {
      baseVersion: created.evenement.version
    }, ACTOR);
    const saved = await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: saved.version }, ACTOR);
    const before = (await service.lireEvenement(created.evenement.evenement_id)).attendus.length;
    await repo.updateEventIfVersion(created.evenement.evenement_id, saved.version + 1, { date: '2026-08-27' });
    await service.reconcileExpectedPopulation({ eventIds: [created.evenement.evenement_id] }, ACTOR);
    const after = await service.lireEvenement(created.evenement.evenement_id);
    assert.strictEqual(after.evenement.statut, 'REALISE');
    assert.strictEqual(after.attendus.length, before);
    assert.ok(ui.includes('id="edit-event"'));
  });

  await record('07 — événement PLANIFIÉ resync uniquement lui-même', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const b1 = await repo.findCible('JSP', 'B1');
    const c1 = await repo.findCible('JSP', 'C1');
    const juneOnly = await seedPerson(repo, b1.cible_id, {
      nip: 'JUNEONLY', dateDebut: '2026-01-01', dateFin: '2026-07-01'
    });
    await seedPerson(repo, b1.cible_id, {
      nip: 'AUGONLY', dateDebut: '2026-08-01', dateFin: null
    });
    const otherPerson = await seedPerson(repo, c1.cible_id, { nip: 'JSPC1X' });
    const target = await service.createEvenement({
      date: '2026-06-18', domaineCode: 'JSP', libelle: 'Exercice JSP 6', cibleIds: [b1.cible_id],
      codeCours: '010JB1.445'
    }, ACTOR);
    const other = await service.createEvenement({
      date: '2026-06-01', domaineCode: 'JSP', libelle: 'Exercice JSP 6', cibleIds: [c1.cible_id],
      codeCours: '010JC1JSP.1'
    }, ACTOR);
    const frozenT = await service.figerPopulation(target.evenement.evenement_id, {
      baseVersion: target.evenement.version
    }, ACTOR);
    const frozenO = await service.figerPopulation(other.evenement.evenement_id, {
      baseVersion: other.evenement.version
    }, ACTOR);
    const beforeOther = (await service.lireEvenement(other.evenement.evenement_id)).attendus
      .filter((a) => a.inclus !== false).map((a) => a.personne_id).sort();
    await repo.updateEventIfVersion(target.evenement.evenement_id, frozenT.version, { date: '2026-08-27' });
    await service.reconcileExpectedPopulation({ eventIds: [target.evenement.evenement_id] }, ACTOR);
    const afterTarget = await service.lireEvenement(target.evenement.evenement_id);
    const afterOther = await service.lireEvenement(other.evenement.evenement_id);
    const nips = [];
    for(const att of afterTarget.attendus.filter((a) => a.inclus !== false)){
      const p = await repo.getPersonne(att.personne_id);
      nips.push(p.nip);
    }
    assert.ok(nips.includes('AUGONLY'));
    assert.ok(!nips.includes('JUNEONLY') || afterTarget.attendus.some((a) => a.personne_id === juneOnly.personne_id && a.inclus === false));
    assert.deepStrictEqual(
      afterOther.attendus.filter((a) => a.inclus !== false).map((a) => a.personne_id).sort(),
      beforeOther
    );
    assert.ok(afterOther.attendus.some((a) => String(a.personne_id) === String(otherPerson.personne_id)));
    assert.strictEqual(String(afterOther.evenement.date).slice(0, 10), '2026-06-01');
    assert.ok(frozenO);
  });

  await record('08 — message « Déjà comptabilisé… » absent', () => {
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
  });

  await record('09 — personne déjà couverte globalement verrouillée et non recomptée', () => {
    const row = { personneId: 'P1', inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', coveredInGlobalBilan: true };
    assert.ok(logic.coveredInGlobalBilan(row));
    assert.ok(logic.sessionLocked(row));
    assert.ok(!logic.isOpenSaisieRow(row));
    assert.strictEqual(logic.applyParticipationStatus(row, 'PRESENT'), row);
    assert.deepStrictEqual(logic.buildPresenceSavePayload([row], new Set()), []);
  });

  await record('10 — R4 global non modifié', () => {
    assert.ok(rulesSrc.includes('function computePrExerciseParticipationState'));
    assert.ok(ui.includes('Modifier l’événement'));
    assert.ok(!ui.includes('id="retarget-cible"'));
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
    console.error(`SCOPE-EVENT-DATA-INTEGRITY-1-R1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENT-DATA-INTEGRITY-1-R1: ${results.length} PASS`);
})();
