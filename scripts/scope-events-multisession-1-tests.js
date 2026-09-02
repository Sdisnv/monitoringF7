#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { MOTIFS_DISPENSE } = require('../netlify/functions/_scope-model');
const logic = require('../assets/js/scope-ui-logic.js');
const display = require('../assets/js/scope-personnel-display.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const pdfRenderer = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-pdf-renderer.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'ms1', displayName: 'Testeur MS1' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

function eventSpec(id, section){
  return {
    evenement_id: id,
    cycle_id: 'cycle-pr-ms',
    domaine_code: 'PR',
    date: `2026-09-0${section}`,
    libelle: `Exercice PR 1.${section} | Base`,
    code_cours: `PAPR.PR1.${section}`,
    pr_exercise_group_key: 'cycle-pr-ms:PR:1',
    pr_session_key: `cycle-pr-ms:PR:1.${section}`
  };
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function save(service, repo, eventId, participations){
  return service.enregistrerParticipations(eventId, {
    baseVersion: await version(repo, eventId),
    participations
  }, ACTOR);
}

async function setupSession(personCount = 3){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-ms',
    cycle_key: 'PAPR-MS',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR MS'
  });
  const events = [];
  for(let i = 1; i <= 3; i += 1){
    const ev = await repo.insertEvenement(eventSpec(`ms${i}`, i));
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(let i = 1; i <= personCount; i += 1){
    const p = await repo.insertPersonne({
      personne_id: `ms-p${i}`,
      nip: String(71000 + i),
      nom: i === 1 ? 'Martin' : `Nom${i}`,
      prenom: i === 1 ? 'Léa' : `Prenom${i}`,
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-ms', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
    for(const ev of events){
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({
        evenement_id: ev.evenement_id,
        personne_id: p.personne_id,
        statut: 'NON_RENSEIGNE',
        role: 'PARTICIPANT',
        source: 'GENERATION'
      });
    }
  }
  return { repo, service, events, people };
}

function attendu(detail, personneId){
  return (detail.attendus || []).find((row) => String(row.personne_id) === String(personneId));
}

(async () => {
  await record('01-03 — Excusé séance 2 non recopié visuellement, couvert en session', async () => {
    const ctx = await setupSession(2);
    await save(ctx.service, ctx.repo, 'ms2', [{
      personneId: ctx.people[0].personne_id,
      statut: 'ABSENT_EXCUSE',
      motif_absence: 'PRIVE',
      role: 'PARTICIPANT'
    }]);
    const s1 = await ctx.service.lireEvenement('ms1');
    const s2 = await ctx.service.lireEvenement('ms2');
    const s3 = await ctx.service.lireEvenement('ms3');
    const a1 = attendu(s1, ctx.people[0].personne_id);
    const a2 = attendu(s2, ctx.people[0].personne_id);
    const a3 = attendu(s3, ctx.people[0].personne_id);
    assert.strictEqual(a1.sessionExcuse, false);
    assert.strictEqual(a3.sessionExcuse, false);
    assert.ok(a1.sessionHasValidStatus);
    assert.ok(a3.sessionHasValidStatus);
    assert.ok(a1.alreadyCountedInSession);
    const part2 = (s2.participations || []).find((row) => row.personne_id === ctx.people[0].personne_id);
    assert.strictEqual(part2.statut, 'ABSENT_EXCUSE');
    assert.ok(!logic.isOpenSaisieRow({ statut: 'NON_RENSEIGNE', inclus: true, sessionHasValidStatus: true }));
    assert.ok(css.includes('scope-row-session-excuse'));
    assert.ok(css.includes('#fde8ea'));
    assert.ok(css.includes('#fff6cc'));
  });

  await record('04 — Dispensé : 4 motifs', () => {
    assert.deepStrictEqual(logic.MOTIFS_DISPENSE.map((m) => m.value), [
      'JOKER', 'FORMATEUR_PR', 'FORMATION_HORS_SDIS', 'PAS_CONCERNE', 'DEMISSION_EN_COURS'
    ]);
    const next = logic.applyParticipationStatus({ statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }, 'DISPENSE');
    assert.strictEqual(next.statut, 'DISPENSE');
    assert.strictEqual(next.editMotif, true);
    const withMotif = logic.applyDispenseMotif(next, 'JOKER');
    assert.strictEqual(withMotif.motifAbsence, 'JOKER');
    assert.ok(Object.values(MOTIFS_DISPENSE).includes('PAS_CONCERNE'));
  });

  await record('05-08 — Dispensé local uniquement, couverture session sans overlay', async () => {
    const ctx = await setupSession(1);
    await save(ctx.service, ctx.repo, 'ms2', [{
      personneId: ctx.people[0].personne_id,
      statut: 'DISPENSE',
      motif_absence: 'JOKER',
      role: 'PARTICIPANT'
    }]);
    const s1 = await ctx.service.lireEvenement('ms1');
    const s2 = await ctx.service.lireEvenement('ms2');
    const a1 = attendu(s1, ctx.people[0].personne_id);
    const a2 = attendu(s2, ctx.people[0].personne_id);
    assert.strictEqual(a1.sessionDispense, false);
    assert.ok(a1.sessionHasValidStatus);
    const part2 = (s2.participations || []).find((row) => row.personne_id === ctx.people[0].personne_id);
    assert.strictEqual(part2.statut, 'DISPENSE');
    assert.strictEqual(part2.motif_absence, 'JOKER');
    assert.ok(css.includes('scope-row-session-dispense'));
    assert.ok(css.includes('#fff6cc'));
    assert.ok(css.includes('#fde8ea'));
    assert.ok(css.includes('scope-session-info'));
    assert.ok(ui.includes('Personnel non renseigné'));
    assert.ok(ui.includes('white-space: normal') || css.includes('.scope-session-info'));
  });

  await record('09-10 — Clôture séance intermédiaire avec non renseignés', async () => {
    const ctx = await setupSession(2);
    await save(ctx.service, ctx.repo, 'ms1', [{
      personneId: ctx.people[0].personne_id,
      statut: 'PRESENT',
      role: 'PARTICIPANT'
    }]);
    const s1 = await ctx.service.lireEvenement('ms1');
    assert.strictEqual(s1.prExerciseParticipation.isLastSession, false);
    assert.strictEqual(s1.prExerciseParticipation.isMultiSession, true);
    const closed = await ctx.service.cloturer('ms1', { baseVersion: await version(ctx.repo, 'ms1') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.ok(ui.includes('Les personnes non renseignées restent disponibles'));
    assert.ok(!ui.includes('Clôturer avec des participations non renseignées') || ui.includes('isLastSession'));
  });

  await record('11-12 — Dernière séance : contrôle session + liste', async () => {
    const ctx = await setupSession(2);
    await save(ctx.service, ctx.repo, 'ms2', [{
      personneId: ctx.people[0].personne_id,
      statut: 'PRESENT',
      role: 'PARTICIPANT'
    }]);
    const last = await ctx.service.lireEvenement('ms3');
    assert.strictEqual(last.prExerciseParticipation.isLastSession, true);
    const missing = last.prExerciseParticipation.unfilledPeople || [];
    assert.ok(missing.some((p) => p.personneId === ctx.people[1].personne_id));
    assert.ok(missing.some((p) => p.nom && p.prenom && p.grade != null));
    assert.ok(ui.includes('Clôturer l’exercice'));
  });

  await record('13 — Filtre personnel non renseigné', () => {
    const open = { statut: 'NON_RENSEIGNE', inclus: true };
    const locked = { statut: 'NON_RENSEIGNE', inclus: true, alreadyCountedInSession: true, sessionExcuse: true };
    const present = { statut: 'PRESENT', inclus: true };
    assert.ok(logic.isOpenSaisieRow(open));
    assert.ok(!logic.isOpenSaisieRow(locked));
    assert.ok(!logic.isOpenSaisieRow(present));
    assert.ok(ui.includes('data-saisie-open-filter="open"'));
  });

  await record('14 — Événement normal : clôture standard', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const p = await repo.insertPersonne({ nip: 'MSN01', nom: 'Norm', prenom: 'Eve', grade: 'Sap', date_entree: '2026-01-01' });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: dps.cible_id, date_debut: '2026-01-01' });
    const created = await service.createEvenement({
      date: '2026-05-10', domaineCode: 'DPS', libelle: 'Exercice DPS simple', cibleIds: [dps.cible_id]
    }, ACTOR);
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    assert.ok(!fiche.prExerciseParticipation || !fiche.prExerciseParticipation.isMultiSession);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: 2,
      participations: [{ personneId: p.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const closed = await service.cloturer(created.evenement.evenement_id, { baseVersion: 3 }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
  });

  await record('15-16 — FOBA 1 DPS Pas concerné hors dénominateur / Présent compté', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const persons = createScopePersonService(repo);
    const dps = await repo.findCible('DPS', 'B1');
    const foba1 = await repo.findCible('FOBA', '1');
    const recruit = await repo.insertPersonne({
      nip: 'MSF01', nom: 'Recrue', prenom: 'Foba', grade: 'Sap', date_entree: '2026-01-01'
    });
    await repo.insertAffectation({ personne_id: recruit.personne_id, cible_id: dps.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: recruit.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    const other = await repo.insertPersonne({
      nip: 'MSF02', nom: 'Titulaire', prenom: 'Dps', grade: 'Cpl', date_entree: '2020-01-01'
    });
    await repo.insertAffectation({ personne_id: other.personne_id, cible_id: dps.cible_id, date_debut: '2020-01-01' });

    const evA = await service.createEvenement({
      date: '2026-03-01', domaineCode: 'DPS', libelle: 'DPS pas concerné', cibleIds: [dps.cible_id]
    }, ACTOR);
    await service.figerPopulation(evA.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
    await service.enregistrerParticipations(evA.evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: recruit.personne_id, statut: 'DISPENSE', motif_absence: 'PAS_CONCERNE' },
        { personneId: other.personne_id, statut: 'PRESENT' }
      ]
    }, ACTOR);
    await service.cloturer(evA.evenement.evenement_id, { baseVersion: 3 }, ACTOR);
    const sumA = await analytics.summary({ from: '2026-03-01', to: '2026-03-01', domaine: 'DPS' });
    assert.strictEqual(sumA.officiel.numerator, 1);
    assert.strictEqual(sumA.officiel.denominator, 1);
    assert.strictEqual(sumA.officiel.volumes.dispenses, 1);
    const ficheA = await persons.fiche(recruit.personne_id, { from: '2026-03-01', to: '2026-03-01', preset: 'CUSTOM' });
    assert.ok(Number(ficheA.kpi.denominator || 0) === 0);

    const evB = await service.createEvenement({
      date: '2026-06-01', domaineCode: 'DPS', libelle: 'DPS présent recrue', cibleIds: [dps.cible_id]
    }, ACTOR);
    await service.figerPopulation(evB.evenement.evenement_id, { baseVersion: 1 }, ACTOR);
    await service.enregistrerParticipations(evB.evenement.evenement_id, {
      baseVersion: 2,
      participations: [
        { personneId: recruit.personne_id, statut: 'PRESENT' },
        { personneId: other.personne_id, statut: 'PRESENT' }
      ]
    }, ACTOR);
    await service.cloturer(evB.evenement.evenement_id, { baseVersion: 3 }, ACTOR);
    const sumB = await analytics.summary({ from: '2026-06-01', to: '2026-06-01', domaine: 'DPS' });
    assert.strictEqual(sumB.officiel.numerator, 2);
    assert.strictEqual(sumB.officiel.denominator, 2);
  });

  await record('17 — Pas de double comptage session', async () => {
    const ctx = await setupSession(1);
    await save(ctx.service, ctx.repo, 'ms2', [{
      personneId: ctx.people[0].personne_id,
      statut: 'PRESENT',
      role: 'PARTICIPANT'
    }]);
    let blocked = false;
    try {
      await save(ctx.service, ctx.repo, 'ms1', [{
        personneId: ctx.people[0].personne_id,
        statut: 'PRESENT',
        role: 'PARTICIPANT'
      }]);
    } catch (error) {
      blocked = error && error.status === 409;
    }
    assert.ok(blocked);
    const s1 = await ctx.service.lireEvenement('ms1');
    assert.ok(attendu(s1, ctx.people[0].personne_id).alreadyCountedInSession);
  });

  await record('18 — Réalisés non réécrits', async () => {
    const ctx = await setupSession(1);
    await save(ctx.service, ctx.repo, 'ms1', [{
      personneId: ctx.people[0].personne_id,
      statut: 'NON_RENSEIGNE',
      role: 'PARTICIPANT'
    }]);
    await ctx.service.cloturer('ms1', { baseVersion: await version(ctx.repo, 'ms1') }, ACTOR);
    const before = await ctx.repo.getParticipation('ms1', ctx.people[0].personne_id);
    await save(ctx.service, ctx.repo, 'ms2', [{
      personneId: ctx.people[0].personne_id,
      statut: 'ABSENT_EXCUSE',
      motif_absence: 'PRIVE',
      role: 'PARTICIPANT'
    }]);
    const after = await ctx.repo.getParticipation('ms1', ctx.people[0].personne_id);
    assert.strictEqual(before.statut, after.statut);
    assert.strictEqual((await ctx.repo.getEvent('ms1')).statut, 'REALISE');
  });

  await record('19-20 — Non-régression UI / cache / PDF anthracite', () => {
    assert.ok(html.includes('scope-objectifs-participation-1') || html.includes('scope-multisession-report-1-r1') || html.includes('scope-multisession-report-1') || html.includes('scope-events-multisession-1'));
    assert.ok(css.includes('repeat(3, minmax(0, 1fr))'));
    assert.ok(pdfRenderer.includes('anthracite'));
    assert.ok(pdfRenderer.includes("heading('Synthèse de participation', 11, 'ink')"));
    assert.ok(ui.includes('GRADE') && ui.includes('NOM'));
    assert.strictEqual(display.ficheEventInformations({ statutParticipation: 'DISPENSE', motif: 'PAS_CONCERNE' }), 'Pas concerné');
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
    console.error(`SCOPE-EVENTS-MULTISESSION-1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENTS-MULTISESSION-1: ${results.length} PASS`);
})();
