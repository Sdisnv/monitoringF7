#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { createScopeAnalyticsService } = require('../netlify/functions/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/functions/_scope-person-service');
const { nominativeRows } = require('../netlify/functions/_scope-report-data');
const rules = require('../netlify/functions/_scope-cycle-rules');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');
const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'scope.html'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'assets/js/scope-api.js'), 'utf8');
const detail = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope-personnel-detail.js'), 'utf8');
const personnelSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/_scope-personnel-service.js'), 'utf8');
const scopeSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/scope.js'), 'utf8');
const ACTOR = { roles: ['sdis-admin'], sub: 'ms1r3', displayName: 'Testeur R3' };
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
    cycle_id: 'cycle-pr-r3',
    domaine_code: 'PR',
    date: `2026-09-0${section}`,
    libelle: `Exercice PR 1.${section} | Base`,
    code_cours: `PAPR.PR1R3.${section}`,
    pr_exercise_group_key: 'cycle-pr-r3:PR:1',
    pr_session_key: `cycle-pr-r3:PR:1.${section}`
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
    cycle_id: 'cycle-pr-r3',
    cycle_key: 'PAPR-R3',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR R3'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    const ev = await repo.insertEvenement(eventSpec(`r3s${i}`, i));
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const people = [];
  for(let i = 1; i <= personCount; i += 1){
    const p = await repo.insertPersonne({
      personne_id: `r3-p${i}`,
      nip: String(73000 + i),
      nom: i === 1 ? 'Dupont' : 'Bernard',
      prenom: i === 1 ? 'Alice' : 'Marc',
      grade: 'Sap',
      skipPeriodes: true
    });
    people.push(p);
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-r3', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
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
  await save(ctx.service, ctx.repo, `r3s${sessionIndex}`, [body]);
}

async function closeUntilLast(ctx){
  for(let i = 1; i <= 5; i += 1){
    const id = `r3s${i}`;
    const ev = await ctx.repo.getEvent(id);
    if(ev.statut !== 'REALISE'){
      await ctx.service.cloturer(id, { baseVersion: ev.version }, ACTOR);
    }
  }
}

function unfilledIds(fiche){
  return (fiche.prExerciseParticipation.unfilledPeople || []).map((p) => String(p.personneId || p.personne_id));
}

function uniqueNips(people){
  return [...new Set(people.map((p) => String(p.nip || p.personneId)))];
}

(async () => {
  await record('01-02 — Présent uniquement en 1.5 absent du contrôle 1.6', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    const last = await ctx.service.lireEvenement('r3s6');
    assert.strictEqual(last.prExerciseParticipation.isLastSession, true);
    const missing = unfilledIds(last);
    assert.ok(!missing.includes(String(ctx.people[0].personne_id)));
    assert.ok(missing.includes(String(ctx.people[1].personne_id)));
    assert.ok(rules.personHasValidStatusInSession({
      cycle: await ctx.repo.getCycle('cycle-pr-r3'),
      evenements: ctx.events,
      participations: await ctx.repo.listParticipationsForEvents(ctx.events.map((e) => e.evenement_id)),
      attendus: await ctx.repo.listAttendusForEvents(ctx.events.map((e) => e.evenement_id)),
      personnes: ctx.people,
      currentEventId: 'r3s6',
      personneId: ctx.people[0].personne_id
    }));
    assert.ok(last.prExerciseParticipation.byPersonneId[ctx.people[0].personne_id].sessionHasValidStatus);
    assert.ok(!logic.isOpenSaisieRow({
      statut: 'NON_RENSEIGNE',
      inclus: true,
      sessionHasValidStatus: true
    }));
  });

  await record('03 — Excusé uniquement en 1.3', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 3, 'ABSENT_EXCUSE', 'PRIVE');
    const last = await ctx.service.lireEvenement('r3s6');
    assert.ok(!unfilledIds(last).includes(String(ctx.people[0].personne_id)));
    assert.ok(rules.isValidSessionStatut('ABSENT_EXCUSE'));
  });

  await record('04 — Absent uniquement en 1.2', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 2, 'ABSENT_NON_EXCUSE');
    const last = await ctx.service.lireEvenement('r3s6');
    assert.ok(!unfilledIds(last).includes(String(ctx.people[0].personne_id)));
    assert.ok(rules.isValidSessionStatut('ABSENT_NON_EXCUSE'));
  });

  await record('05 — Dispensé uniquement en 1.4', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 4, 'DISPENSE', 'JOKER');
    const last = await ctx.service.lireEvenement('r3s6');
    assert.ok(!unfilledIds(last).includes(String(ctx.people[0].personne_id)));
    assert.ok(rules.isValidSessionStatut('DISPENSE'));
  });

  await record('06 — Aucun statut → listé au contrôle final', async () => {
    const ctx = await setupPr16(2);
    const last = await ctx.service.lireEvenement('r3s6');
    const missing = unfilledIds(last);
    assert.ok(missing.includes(String(ctx.people[0].personne_id)));
    assert.ok(missing.includes(String(ctx.people[1].personne_id)));
  });

  await record('07-08 — Total population = couverts + non renseignés, sans doublon', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    const last = await ctx.service.lireEvenement('r3s6');
    const cov = last.prExerciseParticipation.coverage;
    assert.strictEqual(cov.population, cov.covered + cov.unfilled);
    assert.ok(cov.balanced);
    assert.strictEqual(uniqueNips(last.prExerciseParticipation.unfilledPeople).length, last.prExerciseParticipation.unfilledPeople.length);
    assert.ok(!rules.isValidSessionStatut('NON_RENSEIGNE'));
  });

  await record('09 — Séance intermédiaire clôturable', async () => {
    const ctx = await setupPr16(2);
    const s1 = await ctx.service.lireEvenement('r3s1');
    assert.strictEqual(s1.prExerciseParticipation.isLastSession, false);
    const closed = await ctx.service.cloturer('r3s1', { baseVersion: await version(ctx.repo, 'r3s1') }, ACTOR);
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    assert.ok(ui.includes('Clôturer la séance'));
    assert.ok(ui.includes('Les personnes non renseignées restent disponibles'));
  });

  await record('10-12 — Fiche personnelle : seule la séance au statut valable', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await closeUntilLast(ctx);
    const persons = createScopePersonService(ctx.repo);
    const fiche = await persons.fiche(ctx.people[0].personne_id, { from: '2026-09-01', to: '2026-09-30', preset: 'CUSTOM' });
    const rows = fiche.evenements || [];
    const prRows = rows.filter((row) => String(row.prExerciseGroupKey || row.pr_exercise_group_key || '') === 'cycle-pr-r3:PR:1');
    assert.strictEqual(prRows.length, 1);
    assert.ok(String(prRows[0].libelle).includes('PR 1.5'));
    assert.strictEqual(prRows[0].statutParticipation, 'PRESENT');
    assert.ok(!rows.some((row) => String(row.statutParticipation || row.statut) === 'NON_RENSEIGNE'));
  });

  await record('11b — Fiche Excusé en 1.3 uniquement', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 3, 'ABSENT_EXCUSE', 'PROFESSIONNEL');
    await closeUntilLast(ctx);
    const persons = createScopePersonService(ctx.repo);
    const fiche = await persons.fiche(ctx.people[0].personne_id, { from: '2026-09-01', to: '2026-09-30', preset: 'CUSTOM' });
    const prRows = (fiche.evenements || []).filter((row) => String(row.prExerciseGroupKey || '') === 'cycle-pr-r3:PR:1');
    assert.strictEqual(prRows.length, 1);
    assert.ok(String(prRows[0].libelle).includes('PR 1.3'));
    assert.strictEqual(prRows[0].statutParticipation, 'ABSENT_EXCUSE');
  });

  await record('13 — Analytics sans faux non renseigné de session', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await closeUntilLast(ctx);
    const analytics = createScopeAnalyticsService(ctx.repo);
    const snap = await analytics.snapshot({
      personneId: ctx.people[0].personne_id,
      from: '2026-09-01',
      to: '2026-09-30',
      preset: 'CUSTOM'
    });
    const included = (snap.evaluated && snap.evaluated.includedEvents) || [];
    const pr = included.filter((row) => String(row.pr_exercise_group_key || row.prExerciseGroupKey || '') === 'cycle-pr-r3:PR:1');
    assert.strictEqual(pr.length, 1);
    const volumes = (snap.summary && snap.summary.officiel && snap.summary.officiel.volumes) || {};
    assert.ok(Number(volumes.nonRenseignes || 0) === 0);
    assert.ok(Number((snap.summary.officiel || {}).denominator || 0) <= 1);
  });

  await record('14 — Rapport réalisé sans faux Non renseigné', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await closeUntilLast(ctx);
    const s1 = await ctx.service.lireEvenement('r3s1');
    const s5 = await ctx.service.lireEvenement('r3s5');
    const rows1 = nominativeRows(s1);
    const rows5 = nominativeRows(s5);
    assert.ok(!rows1.some((row) => row.nip === ctx.people[0].nip && row.statut === 'NON_RENSEIGNE'));
    const alice5 = rows5.find((row) => row.nip === ctx.people[0].nip);
    assert.ok(alice5);
    assert.strictEqual(alice5.statut, 'PRESENT');
    assert.ok(ui.includes('sessionHasValidStatus'));
  });

  await record('15 — Pas de double comptage session', async () => {
    const ctx = await setupPr16(2);
    await markOn(ctx, ctx.people[0], 5, 'PRESENT');
    await markOn(ctx, ctx.people[1], 2, 'ABSENT_NON_EXCUSE');
    const last = await ctx.service.lireEvenement('r3s6');
    const cov = last.prExerciseParticipation.coverage;
    assert.strictEqual(cov.population, 2);
    assert.strictEqual(cov.covered, 2);
    assert.strictEqual(cov.unfilled, 0);
    assert.strictEqual(unfilledIds(last).length, 0);
  });

  await record('16-17 — Tooltip ancré et dans le viewport', () => {
    const vp = { width: 800, height: 600 };
    const style = {};
    const right = logic.placeSessionTooltip({ left: 80, right: 360, top: 40, bottom: 84 }, { offsetHeight: 72, style }, vp);
    assert.ok(right.left >= 360);
    assert.ok(right.left + right.width <= vp.width);
    const flip = logic.placeSessionTooltip({ left: 640, right: 780, top: 40, bottom: 84 }, { offsetHeight: 72, style: {} }, vp);
    assert.ok(flip.left < 640);
    assert.ok(flip.left >= 8);
    const above = logic.placeSessionTooltip({ left: 100, right: 300, top: 540, bottom: 590 }, { offsetHeight: 80, style: {} }, vp);
    assert.ok(above.top >= 8);
    assert.ok(above.top + 80 <= vp.height);
    assert.ok(css.includes('position: fixed'));
    assert.ok(ui.includes('placeSessionTooltip'));
  });

  await record('18-20 — Couleurs et motifs courts', () => {
    assert.ok(css.includes('#fde8ea'));
    assert.ok(css.includes('#fff6cc'));
    assert.ok(css.includes('scope-row-session-excuse'));
    assert.ok(css.includes('scope-row-session-dispense'));
    assert.strictEqual(logic.informationMotifLabel({ statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }), 'Privé');
    assert.strictEqual(logic.informationMotifLabel({ statut: 'DISPENSE', motifAbsence: 'JOKER' }), 'Joker');
    assert.ok(!String(logic.informationMotifLabel({ statut: 'ABSENT_EXCUSE', motifAbsence: 'ARMEE' })).includes('a été excusé'));
    const tip = logic.sessionExplainTooltip({
      prenom: 'Alice',
      nomFamille: 'Dupont',
      statut: 'ABSENT_EXCUSE',
      motifAbsence: 'PRIVE',
      sessionExerciseLabel: 'PR 1'
    });
    assert.ok(tip.includes('Alice Dupont'));
    assert.ok(tip.includes('Privé') || tip.includes('privé'));
  });

  await record('21-27 — Ajout manuel NIP / PAPR / RBAC / audit / fusion', () => {
    assert.ok(ui.includes('Ajouter une personne / affectation'));
    assert.ok(ui.includes('lookupPersonneByNip'));
    assert.ok(api.includes('lookupPersonneByNip'));
    assert.ok(api.includes('createManualPersonne'));
    assert.ok(detail.includes("params.nip"));
    assert.ok(detail.includes("'personnel:read'"));
    assert.ok(detail.includes('create_personne'));
    assert.ok(detail.includes('createAffectation'));
    assert.ok(personnelSrc.includes('createManualPersonne'));
    assert.ok(personnelSrc.includes('PERSONNEL_MANUAL_CREATE'));
    assert.ok(personnelSrc.includes('PERSONNEL_ASSIGNMENT_CREATE'));
    assert.ok(personnelSrc.includes("err.code = 'nip_existant'"));
    assert.ok(personnelSrc.includes('personUpdates'));
    assert.ok(scopeSrc.includes("path === '/personnes'"));
    assert.ok(scopeSrc.includes("hasPermission(claims, 'personnel:manage')"));
    assert.ok(ui.includes("specialization = 'PAPR'") || ui.includes("PERSONNEL_SPEC_OPTIONS"));
    assert.ok(ui.includes("'PAPR'"));
    assert.ok(ui.includes('Date de début de l’analyse') || ui.includes('DATE DE DÉBUT DE L’ANALYSE'));
    assert.ok(html.includes('scope-events-multisession-1-r4') || html.includes('scope-events-multisession-1-r3'));
  });

  await record('21b — NIP unique côté service mémoire', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const first = await service.createPersonne({ nip: 'R3NIP1', nom: 'Solo', prenom: 'Jean', grade: 'Sap', dateEntree: '2026-01-01' }, ACTOR);
    assert.ok(first.personne.personne_id);
    let dup = null;
    try {
      await service.createPersonne({ nip: 'R3NIP1', nom: 'Autre', prenom: 'Paul', grade: 'Sap' }, ACTOR);
    } catch (error) {
      dup = error;
    }
    assert.ok(dup);
    assert.strictEqual(dup.status || dup.statusCode, 409);
    const journal = await repo.listJournal('personne', first.personne.personne_id);
    assert.ok((journal || []).some((row) => row.action === 'PERSONNEL_MANUAL_CREATE'));
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
    console.error(`SCOPE-EVENTS-MULTISESSION-1-R3: ${failed.length} NOK / ${results.length}`);
    process.exit(1);
  }
  console.log(`SCOPE-EVENTS-MULTISESSION-1-R3: ${results.length} PASS`);
})();
