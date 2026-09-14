#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-DELETION-CASCADE-CLEANUP-11.4 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopeAlertsService } = require('../netlify/lib/_scope-alerts-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const TOKEN = 'scope-event-deletion-cascade-cleanup-11-4';
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};
const PERIOD = { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function notIncludes(text, needle, message){ assertions += 1; assert.ok(!String(text || '').includes(needle), message || `unexpected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function graphEventCount(dataset){
  const series = (dataset && dataset.series) || [];
  return series.reduce((sum, row) => {
    const points = row.points || [];
    return sum + points.reduce((inner, point) => inner + Number(point.eventCount || 0), 0);
  }, 0);
}

async function seedPersonOnCible(repo, nip, cibleId, extras = {}){
  const personne = await repo.insertPersonne({ nip, nom: extras.nom || nip, prenom: extras.prenom || 'Test', grade: extras.grade || 'Sap' });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return personne;
}

async function statusOf(fn){
  try{
    await fn();
    return null;
  }catch(error){
    return Number(error.status || error.statusCode);
  }
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const serviceSrc = read('netlify/lib/_scope-service.js');
  const memorySrc = read('netlify/lib/_scope-memory.js');
  const pgSrc = read('netlify/lib/_scope-pg.js');
  const html = read('scope.html');
  const display = require('../assets/js/scope-personnel-display.js');

  await record('01 — stratégie A, confirmation UI, purge dans les deux repos', async () => {
    includes(html, TOKEN);
    includes(ui, 'Supprimer définitivement cet événement ?');
    includes(ui, 'Les participations et les données associées seront supprimées de SCOPE.');
    includes(ui, 'Si l’événement était prévu mais n’a pas eu lieu, utilisez plutôt Annuler.');
    notIncludes(ui, 'Autorisé s’il n’y a pas de participation réelle');
    includes(serviceSrc, 'purgeEventFunctionalChildren');
    includes(memorySrc, 'async purgeEventFunctionalChildren');
    includes(pgSrc, 'async purgeEventFunctionalChildren');
    includes(pgSrc, 'delete from scope_participations where evenement_id');
    includes(pgSrc, 'delete from scope_attendus where evenement_id');
    includes(pgSrc, 'delete from scope_saisies_quantitatives where evenement_id');
    includes(pgSrc, 'delete from scope_multisession_v2_participations where session_id');
    includes(pgSrc, 'delete from scope_permutations where source_evenement_id');
    notIncludes(pgSrc, 'delete from scope_personnes');
    notIncludes(pgSrc, 'delete from scope_affectations');
    notIncludes(pgSrc, 'delete from scope_cycles where');
    includes(serviceSrc, 'repo.withTransaction');
  });

  await record('02 — workflow UI réel: 5 participants + encadrement + clôture + purge', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const alerts = createScopeAlertsService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const people = [];
    for(let i = 0; i < 6; i += 1){
      people.push(await seedPersonOnCible(repo, `1140${i}`, cible.cible_id, { nom: `Cascade${i}` }));
    }
    const created = await service.createEvenement({
      date: '2026-04-14',
      domaineCode: 'DPS',
      libelle: 'Cascade suppression 11.4',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const assigned = await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: people.slice(0, 5).map((row) => row.personne_id),
      baseVersion: created.version
    }, ACTOR);
    const withStaff = await service.ajouterEncadrement(created.evenement.evenement_id, {
      baseVersion: assigned.version,
      personneId: people[5].personne_id,
      role: 'FORMATEUR',
      creationDl: true
    }, ACTOR);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: withStaff.version,
      participations: [
        { personneId: people[0].personne_id, statut: 'PRESENT', heureDebutIndividuelle: '19:00', heureFinIndividuelle: '21:00' },
        { personneId: people[1].personne_id, statut: 'PRESENT' },
        { personneId: people[2].personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
        { personneId: people[3].personne_id, statut: 'ABSENT_NON_EXCUSE' },
        { personneId: people[4].personne_id, statut: 'DISPENSE' }
      ]
    }, ACTOR);
    const afterSave = await service.lireEvenement(created.evenement.evenement_id);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
    eq((await repo.listParticipations(created.evenement.evenement_id)).length, 6);
    eq((await repo.listAttendus(created.evenement.evenement_id)).filter((row) => row.inclus !== false).length, 5);
    const beforeFiche = await persons.fiche(people[0].personne_id, PERIOD);
    eq(beforeFiche.kpi.denominator, 1);
    const cycle = await repo.insertCycle({
      cycle_key: 'DPS-11-4',
      annee: 2026,
      domaine_code: 'DPS',
      type_cycle: 'DPS',
      libelle: 'Cycle 11.4',
      statut: 'OUVERT'
    });
    await repo.updateEventIfVersion(
      created.evenement.evenement_id,
      (await repo.getEvent(created.evenement.evenement_id)).version,
      { cycle_id: cycle.cycle_id }
    );
    await repo.upsertCyclePersonne({
      cycle_id: cycle.cycle_id,
      personne_id: people[0].personne_id,
      session_event_id: created.evenement.evenement_id
    });

    const hidden = await service.masquerEvenement(created.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(created.evenement.evenement_id)).version,
      motif: 'Suppression métier des vues opérationnelles'
    }, ACTOR);
    ok(hidden.hidden);
    ok(hidden.purge);
    ok(hidden.purge.participationsDeleted >= 6);
    ok(hidden.purge.attendusDeleted >= 5);

    const persisted = await repo.getEvent(created.evenement.evenement_id);
    ok(persisted.hidden_at, 'ligne événement conservée pour audit');
    eq(persisted.code_cours, created.evenement.code_cours);
    eq((await repo.listParticipations(created.evenement.evenement_id)).length, 0);
    eq((await repo.listAttendus(created.evenement.evenement_id)).length, 0);

    for(const person of people){
      const still = await repo.getPersonne(person.personne_id);
      ok(still, 'personne conservée');
      eq(still.nip, person.nip);
      const affs = await repo.listAffectations({ personneId: person.personne_id });
      ok((affs || []).some((row) => String(row.cible_id) === String(cible.cible_id)), 'affectation conservée');
    }

    const fiche = await persons.fiche(people[0].personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(created.evenement.evenement_id)));
    ok(!(fiche.evenements || []).some((row) => /Cascade suppression/.test(row.libelle || '')));
    eq(fiche.kpi.numerator, 0);
    eq(fiche.kpi.denominator, 0);
    eq(fiche.kpi.volumes.attendus, 0);
    eq(graphEventCount(fiche.graphs && fiche.graphs.domainesAnnees), 0);
    notIncludes(JSON.stringify(fiche.graphs || {}), created.evenement.evenement_id);

    const evaluated = await analytics.evaluate(Object.assign({ personneId: people[0].personne_id }, PERIOD));
    ok(!(evaluated.includedEvents || []).some((row) => String(row.evenementId) === String(created.evenement.evenement_id)));
    const listed = await service.listEvenements({});
    ok(!(listed.evenements || []).some((row) => String((row.evenement || row).evenement_id) === String(created.evenement.evenement_id)));
    const vigilance = await alerts.listAlerts(Object.assign({}, PERIOD), ACTOR);
    notIncludes(JSON.stringify(vigilance), created.evenement.evenement_id);
    eq(CycleRules.isEventCycleExigible(persisted), false);
    const cyclePeople = await repo.listCyclePersonnes(cycle.cycle_id);
    eq(cyclePeople.length, 1, 'inscription cycle conservée');
    eq(cyclePeople[0].session_event_id, null);
    ok(!(await repo.listCycleEvents(cycle.cycle_id)).some((row) => String(row.evenement_id) === String(created.evenement.evenement_id)));
    eq(await statusOf(() => collectReport(repo, { kind: 'EVENT', evenementId: created.evenement.evenement_id }, { includeNominatif: true })), 404);
    eq(await statusOf(() => service.lireEvenement(created.evenement.evenement_id)), 404);
    eq(await statusOf(() => service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: persisted.version,
      participations: [{ personneId: people[0].personne_id, statut: 'PRESENT' }]
    }, ACTOR)), 422);
  });

  await record('03 — ANNULER conserve participations ; SUPPRIMER les purge', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPersonOnCible(repo, '11410', cible.cible_id);
    const created = await service.createEvenement({
      date: '2026-04-09',
      domaineCode: 'DPS',
      libelle: 'Recette 4, test',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [personne.personne_id],
      baseVersion: created.version
    }, ACTOR);
    const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
    await service.enregistrerParticipations(created.evenement.evenement_id, {
      baseVersion: afterAssign.version,
      participations: [{ personneId: personne.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const afterSave = await service.lireEvenement(created.evenement.evenement_id);
    await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
    const closed = await repo.getEvent(created.evenement.evenement_id);
    await service.annulerEvenement(created.evenement.evenement_id, { baseVersion: closed.version, motif: 'Annulation 11.4' }, ACTOR);
    const cancelledParts = await repo.listParticipations(created.evenement.evenement_id);
    eq(cancelledParts.length, 1, 'ANNULÉ conserve les participations');
    eq(String(cancelledParts[0].statut).toUpperCase(), 'PRESENT');
    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(created.evenement.evenement_id));
    ok(row);
    eq(display.ficheEventStatutLabel(row), 'Annulé');
    eq(display.ficheEventInformations(row), 'Événement annulé');
    eq(fiche.kpi.denominator, 0);
    eq(await statusOf(() => service.lireEvenement(created.evenement.evenement_id)), null);
    const afterCancel = await repo.getEvent(created.evenement.evenement_id);
    const reactivated = await service.reactiverEvenement(created.evenement.evenement_id, {
      baseVersion: afterCancel.version,
      motif: 'Réactivation'
    }, ACTOR);
    eq(reactivated.evenement.evenement_id, created.evenement.evenement_id);
    eq(reactivated.evenement.code_cours, created.evenement.code_cours);
    eq((await repo.listParticipations(created.evenement.evenement_id)).length, 1);
  });

  await record('04 — multi-session: purge d’une séance, l’autre et la population partagée restent', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const cible = await repo.findCible('DAP', 'Y1');
    const person = await seedPersonOnCible(repo, '11420', cible.cible_id);
    const first = await service.createEvenement({
      date: '2026-04-11',
      domaineCode: 'DAP',
      libelle: 'Séance A 11.4',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    const second = await service.createEvenement({
      date: '2026-04-12',
      domaineCode: 'DAP',
      libelle: 'Séance B 11.4',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(first.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [person.personne_id],
      baseVersion: first.version
    }, ACTOR);
    await service.figerPopulation(second.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [person.personne_id],
      baseVersion: second.version
    }, ACTOR);
    const afterA = await service.lireEvenement(first.evenement.evenement_id);
    await service.enregistrerParticipations(first.evenement.evenement_id, {
      baseVersion: afterA.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const afterB = await service.lireEvenement(second.evenement.evenement_id);
    await service.enregistrerParticipations(second.evenement.evenement_id, {
      baseVersion: afterB.version,
      participations: [{ personneId: person.personne_id, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' }]
    }, ACTOR);
    const ms = await repo.upsertMultisessionV2({
      code: 'DAP-11-4',
      label: 'Groupe 11.4',
      domain: 'DAP',
      period: '2026'
    });
    await repo.upsertMultisessionV2Session({
      multisession_id: ms.multisession_id,
      event_id: first.evenement.evenement_id,
      sequence: 1
    });
    await repo.upsertMultisessionV2Session({
      multisession_id: ms.multisession_id,
      event_id: second.evenement.evenement_id,
      sequence: 2
    });
    await repo.upsertMultisessionV2Population({
      multisession_id: ms.multisession_id,
      person_id: person.personne_id
    });
    await repo.upsertMultisessionV2Participation({
      multisession_id: ms.multisession_id,
      session_id: first.evenement.evenement_id,
      person_id: person.personne_id,
      attendance_status: 'PRESENT'
    });
    await repo.upsertMultisessionV2Participation({
      multisession_id: ms.multisession_id,
      session_id: second.evenement.evenement_id,
      person_id: person.personne_id,
      attendance_status: 'ABSENT_EXCUSE'
    });

    await service.masquerEvenement(first.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(first.evenement.evenement_id)).version
    }, ACTOR);

    eq((await repo.listParticipations(first.evenement.evenement_id)).length, 0);
    eq((await repo.listParticipations(second.evenement.evenement_id)).length, 1);
    eq(String((await repo.listParticipations(second.evenement.evenement_id))[0].statut).toUpperCase(), 'ABSENT_EXCUSE');
    eq((await repo.listAttendus(second.evenement.evenement_id)).length > 0, true);
    const stillMs = await repo.getMultisessionV2(ms.multisession_id);
    ok(stillMs, 'multisession partagée conservée');
    const pop = await repo.listMultisessionV2Population(ms.multisession_id);
    eq(pop.length, 1, 'population V2 partagée conservée');
    const sessions = await repo.listMultisessionV2Sessions(ms.multisession_id);
    eq(sessions.length, 1);
    eq(String(sessions[0].event_id || sessions[0].evenement_id), String(second.evenement.evenement_id));
    eq(await statusOf(() => service.lireEvenement(first.evenement.evenement_id)), 404);
    eq(await statusOf(() => service.lireEvenement(second.evenement.evenement_id)), null);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
