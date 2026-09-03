#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { nominativeRows } = require('../netlify/functions/_scope-report-data');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const logicSrc = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'ms1r1', displayName: 'Testeur R1' };
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
    cycle_id: 'cycle-pr-r1',
    domaine_code: 'PR',
    date: `2026-09-0${section}`,
    libelle: `Exercice PR 1.${section} | Base`,
    code_cours: `PAPR.PR1R1.${section}`,
    pr_exercise_group_key: 'cycle-pr-r1:PR:1',
    pr_session_key: `cycle-pr-r1:PR:1.${section}`
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

async function setupSession(personCount = 2){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-r1',
    cycle_key: 'PAPR-R1',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR R1'
  });
  const events = [];
  for(let i = 1; i <= 3; i += 1){
    const ev = await repo.insertEvenement(eventSpec(`r1s${i}`, i));
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(let i = 1; i <= personCount; i += 1){
    const p = await repo.insertPersonne({
      personne_id: `r1-p${i}`,
      nip: String(72000 + i),
      nom: i === 1 ? 'Masson' : 'Stauffer',
      prenom: i === 1 ? 'Christophe' : 'Éric',
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-r1', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
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

(async () => {
  await record('01-03 — Dispensé motif conservé avant/après clôture', async () => {
    const ctx = await setupSession(1);
    await save(ctx.service, ctx.repo, 'r1s1', [{
      personneId: ctx.people[0].personne_id,
      statut: 'DISPENSE',
      motif_absence: 'FORMATEUR_PR',
      role: 'PARTICIPANT'
    }]);
    const before = await ctx.repo.getParticipation('r1s1', ctx.people[0].personne_id);
    assert.strictEqual(before.statut, 'DISPENSE');
    assert.strictEqual(before.motif_absence, 'FORMATEUR_PR');
    await ctx.service.cloturer('r1s1', { baseVersion: await version(ctx.repo, 'r1s1') }, ACTOR);
    const after = await ctx.repo.getParticipation('r1s1', ctx.people[0].personne_id);
    assert.strictEqual(after.statut, 'DISPENSE');
    assert.strictEqual(after.motif_absence, 'FORMATEUR_PR');
    const fiche = await ctx.service.lireEvenement('r1s1');
    const part = (fiche.participations || []).find((row) => row.personne_id === ctx.people[0].personne_id);
    assert.strictEqual(part.motif_absence, 'FORMATEUR_PR');
    const nom = nominativeRows(fiche);
    assert.strictEqual(nom[0].statut, 'DISPENSE');
    assert.strictEqual(nom[0].motifLabel, 'Formateur PR');
    assert.strictEqual(nom[0].statutLabel, 'Dispensé');
  });

  await record('03b — Dispensé Joker après clôture', async () => {
    const ctx = await setupSession(1);
    await save(ctx.service, ctx.repo, 'r1s1', [{
      personneId: ctx.people[0].personne_id,
      statut: 'DISPENSE',
      motif_absence: 'JOKER',
      role: 'PARTICIPANT'
    }]);
    await ctx.service.cloturer('r1s1', { baseVersion: await version(ctx.repo, 'r1s1') }, ACTOR);
    const part = await ctx.repo.getParticipation('r1s1', ctx.people[0].personne_id);
    assert.strictEqual(part.motif_absence, 'JOKER');
    const nom = nominativeRows(await ctx.service.lireEvenement('r1s1'));
    assert.strictEqual(nom[0].motifLabel, 'Joker');
  });

  await record('04-06 — Présent + Formateur = Présent, hors filtre, sans double comptage', async () => {
    const ctx = await setupSession(1);
    await save(ctx.service, ctx.repo, 'r1s1', [{
      personneId: ctx.people[0].personne_id,
      statut: 'PRESENT',
      role: 'PARTICIPANT'
    }]);
    await ctx.service.ajouterEncadrement('r1s1', {
      baseVersion: await version(ctx.repo, 'r1s1'),
      personneId: ctx.people[0].personne_id,
      role: 'FORMATEUR'
    }, ACTOR);
    const fiche = await ctx.service.lireEvenement('r1s1');
    const part = (fiche.participations || []).find((row) => row.personne_id === ctx.people[0].personne_id);
    assert.strictEqual(part.statut, 'PRESENT');
    assert.strictEqual(part.role, 'FORMATEUR');
    const nom = nominativeRows(fiche);
    assert.strictEqual(nom[0].statut, 'PRESENT');
    assert.strictEqual(nom[0].statutLabel, 'Présent');
    assert.notStrictEqual(nom[0].statut, 'NON_RENSEIGNE');
    const saisieRow = {
      personneId: ctx.people[0].personne_id,
      statut: 'PRESENT',
      role: 'FORMATEUR',
      inclus: true
    };
    assert.ok(!logic.isOpenSaisieRow(saisieRow));
    assert.ok(logic.countsInSaisieTaux(saisieRow));
    assert.strictEqual(fiche.compteurs.presents, 1);
    assert.strictEqual(fiche.encadrement.filter((row) => row.personne_id === ctx.people[0].personne_id).length, 1);
  });

  await record('07-11 — INFORMATIONS motif court + tooltip complet', () => {
    const excuse = {
      prenom: 'Éric', nom: 'Stauffer', nomFamille: 'Stauffer',
      statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL',
      sessionExcuse: true, sessionExerciseLabel: 'PR 1',
      sessionMessage: 'Éric Stauffer a été excusé pour motif Professionnel lors de la session d’exercice PR 1.'
    };
    const dispense = {
      prenom: 'Christophe', nom: 'Masson', nomFamille: 'Masson',
      statut: 'DISPENSE', motifAbsence: 'FORMATEUR_PR',
      sessionDispense: true,
      sessionMessage: 'Christophe Masson est dispensé de cet exercice pour la raison suivante : Formateur PR.'
    };
    assert.strictEqual(logic.informationMotifLabel(excuse), 'Professionnel');
    assert.strictEqual(logic.informationMotifLabel(dispense), 'Formateur PR');
    assert.ok(!String(logic.informationMotifLabel(excuse)).includes('a été excusé'));
    assert.ok(!String(logic.informationMotifLabel(dispense)).includes('est dispensé'));
    const tipE = logic.sessionExplainTooltip(excuse);
    const tipD = logic.sessionExplainTooltip(dispense);
    assert.ok(tipE.includes('Éric Stauffer'));
    assert.ok(tipE.includes('PR 1'));
    assert.ok(tipD.includes('Christophe Masson'));
    assert.ok(tipD.includes('Formateur PR'));
    assert.ok(tipE.length > 60);
    assert.ok(css.includes('white-space: normal'));
    assert.ok(css.includes('.scope-row-has-tooltip:hover .scope-session-counted-tooltip'));
    assert.ok(ui.includes('sessionExplainTooltip'));
    assert.ok(ui.includes('informationMotifLabel'));
  });

  await record('12 — Excusé fond rouge clair', () => {
    assert.ok(css.includes('scope-row-session-excuse'));
    assert.ok(css.includes('#fde8ea'));
    assert.ok(css.includes('#fff6cc'));
    assert.ok(css.includes('scope-row-session-dispense'));
    const excuseBlock = css.slice(css.indexOf('.scope-table tbody tr.scope-row-session-excuse:hover td'));
    assert.ok(excuseBlock.includes('#fde8ea'));
    assert.ok(css.includes('.scope-status-control.is-excused'));
  });

  await record('13 — Rapport réalisé conserve les motifs', async () => {
    const ctx = await setupSession(2);
    await save(ctx.service, ctx.repo, 'r1s1', [
      { personneId: ctx.people[0].personne_id, statut: 'DISPENSE', motif_absence: 'FORMATION_HORS_SDIS', role: 'PARTICIPANT' },
      { personneId: ctx.people[1].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE', role: 'PARTICIPANT' }
    ]);
    await ctx.service.cloturer('r1s1', { baseVersion: await version(ctx.repo, 'r1s1') }, ACTOR);
    const rows = nominativeRows(await ctx.service.lireEvenement('r1s1'));
    const byNom = Object.fromEntries(rows.map((row) => [row.nom, row]));
    assert.strictEqual(byNom.Masson.motifLabel, 'Formation hors SDIS');
    assert.strictEqual(byNom.Stauffer.motifLabel, 'Privé');
    assert.ok(ui.includes('informationMotifLabel && L.informationMotifLabel(r)'));
  });

  await record('14-16 — Clôtures et filtre non renseigné inchangés', async () => {
    const ctx = await setupSession(2);
    const s1 = await ctx.service.lireEvenement('r1s1');
    assert.strictEqual(s1.prExerciseParticipation.isLastSession, false);
    let refused = null;
    try {
      await ctx.service.cloturer('r1s1', { baseVersion: await version(ctx.repo, 'r1s1') }, ACTOR);
    } catch (error) {
      refused = error;
    }
    assert.ok(refused);
    assert.strictEqual(refused.status, 422);
    assert.strictEqual((await ctx.repo.getEvent('r1s1')).statut, 'PLANIFIE');
    const last = await ctx.service.lireEvenement('r1s3');
    assert.strictEqual(last.prExerciseParticipation.isLastSession, true);
    assert.ok((last.prExerciseParticipation.unfilledPeople || []).length >= 1);
    assert.ok(ui.includes('Personnel non renseigné'));
    assert.ok(ui.includes('Clôturer l’exercice'));
    assert.ok(logic.isOpenSaisieRow({ statut: 'NON_RENSEIGNE', inclus: true }));
    assert.ok(!logic.isOpenSaisieRow({ statut: 'PRESENT', role: 'FORMATEUR', inclus: true }));
    assert.ok(logic.isOpenSaisieRow({ statut: 'NON_RENSEIGNE', inclus: true, alreadyCountedInSession: true, sessionExcuse: true }));
  });

  await record('warning motifsForRow unique', () => {
    const matches = logicSrc.match(/^\s*motifsForRow,/gm) || [];
    assert.strictEqual(matches.length, 1);
    assert.ok(html.includes('scope-objectifs-participation-1') || html.includes('scope-multisession-report-1') || html.includes('scope-events-multisession-1-r4') || html.includes('scope-events-multisession-1-r3'));
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
    console.error(`SCOPE-EVENTS-MULTISESSION-1-R1: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENTS-MULTISESSION-1-R1: ${results.length} PASS`);
})();
