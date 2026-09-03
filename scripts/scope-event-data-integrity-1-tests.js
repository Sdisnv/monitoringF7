#!/usr/bin/env node
'use strict';

/** SCOPE-EVENT-DATA-INTEGRITY-1 — dates immuables hors patch explicite + UX multi-session. */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { MOTIFS_JSP } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-service.js'), 'utf8');
const rulesSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-cycle-rules.js'), 'utf8');
const personnelSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-personnel-service.js'), 'utf8');
const sql = fs.readFileSync(path.join(ROOT, 'database/ops/20260903_diagnose_jsp6_b1_date.sql'), 'utf8');
const results = [];
const ACTOR = { sub: 'event-data-integrity-1' };

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: spec.dateDebut || '2026-01-01'
  });
  return personne;
}

async function freezeOn(service, cible, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, {
    baseVersion: created.evenement.version
  }, ACTOR);
  return {
    eventId: created.evenement.evenement_id,
    version: frozen.version,
    date: created.evenement.date,
    codeCours: created.evenement.code_cours
  };
}

(async () => {
  await record('01 — personne déjà comptée ailleurs : verrouillée, hors à renseigner', () => {
    const row = { inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', alreadyCountedInSession: true, coveredInGlobalBilan: true };
    assert.ok(logic.sessionLocked(row));
    assert.ok(!logic.statusLockedForRole(row.role));
    assert.ok(!logic.isOpenSaisieRow(row));
    assert.ok(!logic.isIncompleteClosureRow(row));
  });

  await record('02 — texte « Déjà comptabilisé dans le bilan global » absent', () => {
    assert.ok(!ui.includes('Déjà comptabilisé dans le bilan global'));
    assert.ok(!fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8').includes('Déjà comptabilisé dans le bilan global'));
  });

  await record('03 — aucun tooltip de remplacement', () => {
    assert.ok(!ui.includes('alreadyCountedTooltip = coveredInGlobalBilan'));
    assert.strictEqual(logic.sessionExplainTooltip({ alreadyCountedInSession: true, coveredInGlobalBilan: true, statut: 'NON_RENSEIGNE' }), '');
    const infoCell = ui.slice(ui.indexOf('function justificatifCell'), ui.indexOf('function roleFlag'));
    assert.ok(!infoCell.includes('Déjà comptabilisé'));
    assert.ok(!infoCell.includes('scope-session-info">Déjà'));
  });

  await record('04 — code visuel existant conservé', () => {
    assert.ok(ui.includes('scope-row-session-counted'));
    assert.ok(css.includes('scope-row-session-counted'));
    assert.ok(ui.includes("coveredGlobally ? 'scope-row-session-counted'"));
  });

  await record('05 — participation répétée toujours persistée', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await repo.insertCycle({
      cycle_id: 'cycle-di', cycle_key: 'PAPR-DI', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'DI'
    });
    const people = [];
    for(const id of ['A', 'B']){
      const p = await repo.insertPersonne({ personne_id: id, nip: `9${id}`, nom: id, prenom: 'P', grade: 'Sap', skipPeriodes: true });
      people.push(p);
      await repo.upsertCyclePersonne({ cycle_id: 'cycle-di', personne_id: id, role_cycle: 'PARTICIPANT' });
    }
    for(const [eid, section] of [['di1', '1'], ['di2', '2']]){
      const ev = await repo.insertEvenement({
        evenement_id: eid, cycle_id: 'cycle-di', domaine_code: 'PR', date: '2026-09-0' + section,
        libelle: `PR DI ${section}`, code_cours: `PAPR.DI.${section}`,
        pr_exercise_group_key: 'cycle-di:PR:1', pr_session_key: `cycle-di:PR:1.${section}`
      });
      await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true });
      for(const p of people){
        await repo.upsertAttendu({ evenement_id: eid, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
        await repo.upsertParticipation({ evenement_id: eid, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
      }
    }
    await service.enregistrerParticipations('di1', { baseVersion: await version(repo, 'di1'), participations: [{ personneId: 'A', statut: 'PRESENT', role: 'PARTICIPANT' }, { personneId: 'B', statut: 'PRESENT', role: 'PARTICIPANT' }] }, ACTOR);
    await service.enregistrerParticipations('di2', { baseVersion: await version(repo, 'di2'), participations: [{ personneId: 'A', statut: 'PRESENT', role: 'PARTICIPANT' }, { personneId: 'B', statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE', role: 'PARTICIPANT' }] }, ACTOR);
    assert.strictEqual((await repo.getParticipation('di1', 'A')).statut, 'PRESENT');
    assert.strictEqual((await repo.getParticipation('di2', 'A')).statut, 'PRESENT');
  });

  await record('06 — bilan global toujours dédupliqué', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    await repo.insertCycle({
      cycle_id: 'cycle-di2', cycle_key: 'PAPR-DI2', annee: 2026, domaine_code: 'PR', type_cycle: 'PAPR', libelle: 'DI2'
    });
    const p = await repo.insertPersonne({ personne_id: 'X', nip: '91X', nom: 'X', prenom: 'P', grade: 'Sap', skipPeriodes: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-di2', personne_id: 'X', role_cycle: 'PARTICIPANT' });
    for(const [eid, section] of [['g1', '1'], ['g2', '2']]){
      const ev = await repo.insertEvenement({
        evenement_id: eid, cycle_id: 'cycle-di2', domaine_code: 'PR', date: '2026-09-0' + section,
        libelle: `PR G ${section}`, code_cours: `PAPR.G.${section}`,
        pr_exercise_group_key: 'cycle-di2:PR:1', pr_session_key: `cycle-di2:PR:1.${section}`
      });
      await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true });
      await repo.upsertAttendu({ evenement_id: eid, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: eid, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
    await service.enregistrerParticipations('g1', { baseVersion: await version(repo, 'g1'), participations: [{ personneId: 'X', statut: 'PRESENT', role: 'PARTICIPANT' }] }, ACTOR);
    await service.enregistrerParticipations('g2', { baseVersion: await version(repo, 'g2'), participations: [{ personneId: 'X', statut: 'PRESENT', role: 'PARTICIPANT' }] }, ACTOR);
    const last = await service.lireEvenement('g2');
    assert.strictEqual(last.prExerciseParticipation.coverage.covered, 1);
  });

  await record('07 — aucune modification moteur R4', () => {
    assert.ok(rulesSrc.includes('function computePrExerciseParticipationState'));
    assert.ok(rulesSrc.includes('function canCloseLastSession'));
    assert.ok(serviceSrc.includes('canCloseLastSession'));
  });

  await record('08 — aucune modification motifs JSP', () => {
    assert.deepStrictEqual(logic.motifsSaisieForDomaine('JSP').map((m) => m.value), Object.values(MOTIFS_JSP));
  });

  const dateCases = {};
  {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'JSPDI1', grade: 'JSP' });
    const frozen = await freezeOn(service, cible, '2026-06-18', 'Exercice JSP 6');
    dateCases.repo = repo;
    dateCases.service = service;
    dateCases.cible = cible;
    dateCases.person = person;
    dateCases.frozen = frozen;
    const originalDate = String((await repo.getEvent(frozen.eventId)).date).slice(0, 10);
    dateCases.originalDate = originalDate;
    assert.strictEqual(originalDate, '2026-06-18');
  }

  await record('09 — date événement non modifiée par clôture', async () => {
    const { service, repo, frozen, person, originalDate } = dateCases;
    const saved = await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: await version(repo, frozen.eventId),
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    await service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('10 — date non modifiée par réouverture', async () => {
    const { service, repo, frozen, originalDate } = dateCases;
    await service.reouvrir(frozen.eventId, { baseVersion: await version(repo, frozen.eventId), motif: 'contrôle date' }, ACTOR);
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('11 — date non modifiée par save participations', async () => {
    const { service, repo, frozen, person, originalDate } = dateCases;
    await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: await version(repo, frozen.eventId),
      participations: [{ personneId: person.personne_id, statut: 'ABSENT_NON_EXCUSE', role: 'PARTICIPANT' }]
    }, ACTOR);
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('12 — date non modifiée par reset saisie', async () => {
    const { service, repo, frozen, originalDate } = dateCases;
    await service.resetParticipations(frozen.eventId, { baseVersion: await version(repo, frozen.eventId) }, ACTOR);
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('13 — date non modifiée par sync population', async () => {
    const { service, repo, frozen, originalDate } = dateCases;
    await service.reconcileExpectedPopulation({ eventIds: [frozen.eventId] }, ACTOR);
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('14 — retarget cible ne modifie pas date', async () => {
    const { service, repo, frozen, cible, originalDate } = dateCases;
    await service.patchEvenement(frozen.eventId, {
      baseVersion: await version(repo, frozen.eventId),
      cibleIds: [cible.cible_id]
    }, ACTOR);
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('15 — import personnel ne modifie pas date événement', async () => {
    const { service, repo, frozen, originalDate } = dateCases;
    assert.ok(!/updateEventIfVersion\([^)]*date/.test(personnelSrc));
    assert.ok(!personnelSrc.includes("patch.date ="));
    if(typeof service.syncExpectedPopulationForPersonnes === 'function'){
      await service.syncExpectedPopulationForPersonnes([(await repo.listPersonnes())[0].personne_id], ACTOR);
    }
    assert.strictEqual(String((await repo.getEvent(frozen.eventId)).date).slice(0, 10), originalDate);
  });

  await record('16 — contrôle CODE_EVENT stable', async () => {
    const { repo, frozen, originalDate } = dateCases;
    const ev = await repo.getEvent(frozen.eventId);
    assert.strictEqual(ev.code_cours, frozen.codeCours);
    assert.strictEqual(String(ev.date).slice(0, 10), originalDate);
    assert.ok(serviceSrc.includes("statut: 'REALISE'"));
    assert.ok(serviceSrc.includes("statut: 'PLANIFIE',\n        cloture_at: null"));
  });

  await record('17 — correction SQL cible exactement une ligne', () => {
    assert.ok(sql.includes("e.libelle = 'Exercice JSP 6'"));
    assert.ok(sql.includes("e.date = date '2026-06-18'"));
    assert.ok(sql.includes("c.niveau_code = 'B1'"));
    assert.ok(sql.includes('e.evenement_id'));
    assert.ok(sql.includes('e.code_cours'));
    assert.ok(sql.includes('STOP si 0 ou >1 ligne'));
  });

  await record('18 — SQL rollback par défaut', () => {
    assert.ok(/rollback;/i.test(sql));
    const active = sql.split('-- ========== 5.')[1] || '';
    assert.ok(!/^\s*update scope_evenements/im.test(active));
    assert.ok(active.includes('-- update scope_evenements'));
  });

  await record('19 — aucune participation effacée par changement de date', async () => {
    const { repo, frozen, person } = dateCases;
    const before = await repo.listParticipations(frozen.eventId);
    assert.ok(before.some((row) => String(row.personne_id) === String(person.personne_id)));
    assert.ok(sql.includes('participations, statut inchangés'));
    assert.ok(!sql.includes('delete from scope_participations'));
  });

  await record('20 — aucun événement réalisé resynchronisé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('JSP', 'B1');
    const person = await seedPerson(repo, cible.cible_id, { nip: 'JSPDI9', grade: 'JSP' });
    const frozen = await freezeOn(service, cible, '2026-06-18', 'JSP réalisé');
    const saved = await service.enregistrerParticipations(frozen.eventId, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT', role: 'PARTICIPANT' }]
    }, ACTOR);
    await service.cloturer(frozen.eventId, { baseVersion: saved.version }, ACTOR);
    const before = (await service.lireEvenement(frozen.eventId)).attendus.length;
    await service.reconcileExpectedPopulation({ eventIds: [frozen.eventId] }, ACTOR);
    const after = await service.lireEvenement(frozen.eventId);
    assert.strictEqual(after.evenement.statut, 'REALISE');
    assert.strictEqual(after.attendus.length, before);
    assert.ok(sql.includes('AUCUN resync population ici'));
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
    console.error(`SCOPE-EVENT-DATA-INTEGRITY-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENT-DATA-INTEGRITY-1: ${results.length} PASS`);
})();
