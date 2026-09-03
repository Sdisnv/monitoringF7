#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { nominativeRows } = require('../netlify/functions/_scope-report-data');
const rules = require('../netlify/functions/_scope-cycle-rules');
const { normalizeNip } = require('../netlify/functions/_scope-personnel-service.js');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const detail = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-detail.js'), 'utf8');
const personnelSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-personnel-service.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'ms1r4', displayName: 'Testeur R4' };
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
    cycle_id: 'cycle-pr-r4',
    domaine_code: 'PR',
    date: `2026-09-0${section}`,
    libelle: `Exercice PR 1.${section} | Base`,
    code_cours: `PAPR.PR1R4.${section}`,
    pr_exercise_group_key: 'cycle-pr-r4:PR:1',
    pr_session_key: `cycle-pr-r4:PR:1.${section}`
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

async function setupPr16(personCount = 2){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-r4',
    cycle_key: 'PAPR-R4',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR R4'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    const ev = await repo.insertEvenement(eventSpec(`r4s${i}`, i));
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(let i = 1; i <= personCount; i += 1){
    const p = await repo.insertPersonne({
      personne_id: `r4-p${i}`,
      nip: String(74000 + i),
      nom: i === 1 ? 'Canna' : 'Masson',
      prenom: i === 1 ? 'Kevin' : 'Christophe',
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-r4', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
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

async function markOn(ctx, personne, sessionIndex, statut, motif){
  const body = { personneId: personne.personne_id, statut, role: 'PARTICIPANT' };
  if(motif) body.motif_absence = motif;
  await save(ctx.service, ctx.repo, `r4s${sessionIndex}`, [body]);
}

function attendu(detail, personneId){
  return (detail.attendus || []).find((row) => String(row.personne_id) === String(personneId));
}

(async () => {
  await record('01-02 — Présent 1.5 uniquement, pas de faux réalisé ailleurs', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await markOn(ctx, ctx.people[1], 5, 'ABSENT_NON_EXCUSE');
    const s1 = await ctx.service.lireEvenement('r4s1');
    const s5 = await ctx.service.lireEvenement('r4s5');
    await ctx.service.cloturer('r4s5', { baseVersion: await version(ctx.repo, 'r4s5') }, ACTOR);
    const rows1 = nominativeRows(s1);
    const rows5 = nominativeRows(s5);
    assert.ok(!rows1.some((row) => row.nip === ctx.people[0].nip));
    const present = rows5.find((row) => row.nip === ctx.people[0].nip);
    assert.strictEqual(present.statut, 'PRESENT');
    const a1 = attendu(s1, ctx.people[0].personne_id);
    assert.ok(a1.sessionHasValidStatus);
    assert.notStrictEqual(a1.sessionExcuse, true);
  });

  await record('03-04 — Dispensé 1.3 non recopié visuellement', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 3, 'DISPENSE', 'FORMATEUR_PR');
    const s1 = await ctx.service.lireEvenement('r4s1');
    const s3 = await ctx.service.lireEvenement('r4s3');
    const s4 = await ctx.service.lireEvenement('r4s4');
    assert.strictEqual(attendu(s1, ctx.people[0].personne_id).sessionDispense, false);
    assert.strictEqual(attendu(s4, ctx.people[0].personne_id).sessionDispense, false);
    assert.ok(attendu(s1, ctx.people[0].personne_id).sessionHasValidStatus);
    const part = (s3.participations || []).find((row) => row.personne_id === ctx.people[0].personne_id);
    assert.strictEqual(part.statut, 'DISPENSE');
    assert.strictEqual(part.motif_absence, 'FORMATEUR_PR');
  });

  await record('05-08 — Sans statut : pas de ligne réalisée, bloqué au final', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    const rows1 = nominativeRows(await ctx.service.lireEvenement('r4s1'));
    assert.ok(!rows1.some((row) => row.nip === ctx.people[1].nip));
    const last = await ctx.service.lireEvenement('r4s6');
    const missing = (last.prExerciseParticipation.unfilledPeople || []).map((p) => String(p.personneId));
    assert.ok(missing.includes(String(ctx.people[1].personne_id)));
    assert.ok(!rules.canCloseLastSession(last.prExerciseParticipation));
    let blocked = null;
    try {
      await ctx.service.cloturer('r4s6', { baseVersion: await version(ctx.repo, 'r4s6') }, ACTOR);
    } catch (error) {
      blocked = error;
    }
    assert.ok(blocked);
    assert.strictEqual(blocked.status, 422);
    assert.ok(['session_incomplete', 'cloture_refusee'].includes(blocked.error));
    assert.ok(ui.includes('CLÔTURE IMPOSSIBLE'));
    assert.ok(ui.includes('Afficher les personnes à renseigner'));
  });

  await record('09-11 — Après statut, clôture et coverage', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await markOn(ctx, ctx.people[1], 2, 'ABSENT_NON_EXCUSE');
    await markOn(ctx, ctx.people[0], 6, 'PRESENT');
    await markOn(ctx, ctx.people[1], 6, 'ABSENT_NON_EXCUSE');
    const last = await ctx.service.lireEvenement('r4s6');
    const cov = last.prExerciseParticipation.coverage;
    assert.strictEqual(cov.population, cov.covered + cov.unfilled);
    assert.ok(cov.balanced);
    assert.strictEqual(cov.unfilled, 0);
    assert.ok(rules.canCloseLastSession(last.prExerciseParticipation));
    const closed = await ctx.service.cloturer('r4s6', { baseVersion: await version(ctx.repo, 'r4s6') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
  });

  await record('12-13 — Rapport / fiche sans Non renseigné parasite', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await markOn(ctx, ctx.people[1], 5, 'ABSENT_NON_EXCUSE');
    await ctx.service.cloturer('r4s5', { baseVersion: await version(ctx.repo, 'r4s5') }, ACTOR);
    const persons = createScopePersonService(ctx.repo);
    const fiche = await persons.fiche(ctx.people[0].personne_id, { from: '2026-09-01', to: '2026-09-30', preset: 'CUSTOM' });
    const prRows = (fiche.evenements || []).filter((row) => String(row.prExerciseGroupKey || '') === 'cycle-pr-r4:PR:1');
    assert.strictEqual(prRows.length, 1);
    assert.ok(String(prRows[0].libelle).includes('PR 1.5'));
    assert.ok(!(fiche.evenements || []).some((row) => String(row.statutParticipation || row.statut) === 'NON_RENSEIGNE'));
    assert.ok(ui.includes('filterRealiseRows'));
    assert.ok(ui.includes('!localValid'));
  });

  await record('14-16 — NIP exact vs voisin vs absent', () => {
    assert.strictEqual(normalizeNip('43454'), '43454');
    assert.strictEqual(normalizeNip(' 43454 '), '43454');
    assert.notStrictEqual(normalizeNip('43453'), normalizeNip('43454'));
    assert.ok(detail.includes('lookup_nip'));
    assert.ok(api.includes("action: 'lookup_nip'"));
    assert.ok(ui.includes('normalizeManualNip'));
    assert.ok(ui.includes('foundNip !== normalizeManualNip(form.nip)'));
  });

  await record('17-21 — Validation création et workflow affectation', () => {
    assert.ok(ui.includes('function readPersonnelManualAddForm'));
    const submit = ui.slice(ui.indexOf('async function submitPersonnelManualAdd'), ui.indexOf('function assignmentModalCards'));
    assert.ok(submit.includes('form.nom'));
    assert.ok(submit.indexOf('readPersonnelManualAddForm') < submit.indexOf('busy: true'));
    assert.ok(submit.includes("fieldErrors.nom = 'Le nom est obligatoire.'"));
    assert.ok(ui.includes('openPersonnelAssignmentModal(id'));
    assert.ok(ui.includes("'PAPR'"));
    assert.ok(personnelSrc.includes("err.code = 'nip_existant'"));
  });

  await record('22-25 — Fusion, UX SCOPE, RBAC, audit', () => {
    assert.ok(personnelSrc.includes('personUpdates'));
    assert.ok(css.includes('.scope-activity-fields input'));
    assert.ok(ui.includes('scope-activity-dialog'));
    assert.ok(ui.includes('scope-activity-footer'));
    assert.ok(detail.includes("'personnel:manage'"));
    assert.ok(personnelSrc.includes('PERSONNEL_MANUAL_CREATE'));
    assert.ok(personnelSrc.includes('PERSONNEL_ASSIGNMENT_CREATE'));
    assert.ok(html.includes('scope-objectifs-participation-1') || html.includes('scope-multisession-report-1') || html.includes('scope-events-multisession-1-r4'));
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
    console.error(`SCOPE-EVENTS-MULTISESSION-1-R4: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENTS-MULTISESSION-1-R4: ${results.length} PASS`);
})();
