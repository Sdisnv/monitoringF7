#!/usr/bin/env node
'use strict';

/** SCOPE — PERSONNEL-PR-INDIVIDUAL-ANALYTICS-REPAIR-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeService } = require('../netlify/lib/_scope-service');

const TOKEN = 'scope-personnel-pr-individual-analytics-repair-1';
const PERIOD = { from: '2026-03-01', to: '2026-12-31', preset: 'CUSTOM' };
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function person(repo, id, nip, cibleId){
  const row = await repo.insertPersonne({ personne_id: id, nip, nom: `Nom${nip}`, prenom: 'Test', grade: 'Sap' });
  await repo.insertAffectation({ personne_id: row.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return row;
}

async function prEvent(repo, id, date, groupKey, sessionIndex, cibleId, extra = {}){
  const event = await repo.insertEvenement({
    evenement_id: id,
    date,
    domaine_code: 'PR',
    libelle: extra.libelle || `PR ${sessionIndex}`,
    code_cours: id,
    statut: extra.statut || 'REALISE',
    mode_suivi: 'NOMINATIF',
    pr_exercise_group_key: groupKey,
    pr_session_key: `${groupKey}.${sessionIndex}`,
    cible_ids: [cibleId]
  });
  await repo.setEventCibles(event.evenement_id, [cibleId]);
  return event;
}

async function expectPerson(repo, eventId, personneId){
  await repo.upsertAttendu({ evenement_id: eventId, personne_id: personneId, inclus: true, origine: 'REGLE' });
}

async function participate(repo, eventId, personneId, statut){
  await repo.upsertParticipation({
    evenement_id: eventId,
    personne_id: personneId,
    statut,
    role: 'PARTICIPANT',
    source: 'SAISIE'
  });
}

async function seedPrGroup(){
  const repo = createMemoryRepo();
  const cible = await repo.findCible('PR', 'GEN');
  const groupKey = 'NO_CYCLE_TEST:PR:1';
  const a = await person(repo, 'pr-person-a', '11601', cible.cible_id);
  const b = await person(repo, 'pr-person-b', '11602', cible.cible_id);
  const c = await person(repo, 'pr-person-c', '11603', cible.cible_id);
  const s1 = await prEvent(repo, 'pr-ind-s1', '2026-03-03', groupKey, 1, cible.cible_id);
  const s2 = await prEvent(repo, 'pr-ind-s2', '2026-03-10', groupKey, 2, cible.cible_id);
  for(const ev of [s1, s2]){
    for(const p of [a, b, c]) await expectPerson(repo, ev.evenement_id, p.personne_id);
  }
  await participate(repo, s1.evenement_id, a.personne_id, 'PRESENT');
  await participate(repo, s2.evenement_id, a.personne_id, 'PRESENT');
  await participate(repo, s1.evenement_id, b.personne_id, 'ABSENT_EXCUSE');
  return { repo, cible, groupKey, a, b, c, s1, s2 };
}

(async () => {
  await record('CAS A — global PR conserve les volumes consolidés', async () => {
    const { repo } = await seedPrGroup();
    const analytics = createScopeAnalyticsService(repo);
    const evaluated = await analytics.evaluate(Object.assign({ domaine: 'PR' }, PERIOD));
    eq(evaluated.includedEvents.length, 1);
    const row = evaluated.includedEvents[0];
    eq(row.numerator, 1);
    eq(row.denominator, 2);
    eq(row.eventCountContribution, 1);
    eq(row.volumes.presents, 1);
    eq(row.volumes.excuses, 1);
    eq(row.volumes.nonRenseignes, 1);
  });

  await record('CAS B/C/D/E — personne: statut individuel requis, statut null non contributif', async () => {
    const { repo, a, b, c } = await seedPrGroup();
    const analytics = createScopeAnalyticsService(repo);
    const evalA = await analytics.evaluate(Object.assign({ personneId: a.personne_id }, PERIOD));
    eq(evalA.includedEvents.length, 1);
    eq(evalA.officiel.numerator, 1);
    eq(evalA.officiel.denominator, 1);
    eq(evalA.officiel.eventCount, 1);
    eq(evalA.includedEvents[0].statutParticipation, 'PRESENT');
    eq(evalA.includedEvents[0].eventCountContribution, 1);

    const evalB = await analytics.evaluate(Object.assign({ personneId: b.personne_id }, PERIOD));
    eq(evalB.includedEvents.length, 1);
    eq(evalB.officiel.numerator, 0);
    eq(evalB.officiel.denominator, 1);
    eq(evalB.officiel.eventCount, 1);
    eq(evalB.includedEvents[0].statutParticipation, 'ABSENT_EXCUSE');
    eq(evalB.includedEvents[0].volumes.excuses, 1);

    const evalC = await analytics.evaluate(Object.assign({ personneId: c.personne_id }, PERIOD));
    eq(evalC.includedEvents.length, 0);
    eq(evalC.officiel.numerator, 0);
    eq(evalC.officiel.denominator, 0);
    eq(evalC.officiel.eventCount, 0);

    for(const evaluated of [evalA, evalB, evalC]){
      ok(!(evaluated.includedEvents || []).some((row) => row.statutParticipation == null && Number(row.eventCountContribution || 0) > 0), 'statut NULL contributif interdit');
    }
  });

  await record('CAS F/I — déduplication multi-session et directoryRates cohérent avec fiche', async () => {
    const { repo, a } = await seedPrGroup();
    const analytics = createScopeAnalyticsService(repo);
    const persons = createScopePersonService(repo);
    const evaluated = await analytics.evaluate(Object.assign({ personneId: a.personne_id }, PERIOD));
    const fiche = await persons.fiche(a.personne_id, PERIOD);
    const directory = await persons.directory(PERIOD);
    const dirRow = (directory.personnes || []).find((row) => String(row.personneId) === String(a.personne_id));
    ok(dirRow, 'personne présente dans annuaire');
    eq(evaluated.officiel.eventCount, 1);
    eq(fiche.kpi.eventCount, 1);
    eq(dirRow.taux.eventCount, fiche.kpi.eventCount);
    eq(dirRow.taux.numerator, fiche.kpi.numerator);
    eq(dirRow.taux.denominator, fiche.kpi.denominator);
    eq(dirRow.taux.percentage, fiche.kpi.percentage);
  });

  await record('CAS G/H — ANNULÉ visible hors calcul, SUPPRIMÉ absent', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const p = await person(repo, 'annule-hidden-person', '11604', cible.cible_id);
    const cancelled = await service.createEvenement({
      date: '2026-04-11',
      domaineCode: 'DPS',
      libelle: 'Annulé individuel PR repair',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(cancelled.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [p.personne_id],
      baseVersion: cancelled.version
    }, ACTOR);
    let ficheEvent = await service.lireEvenement(cancelled.evenement.evenement_id);
    await service.enregistrerParticipations(cancelled.evenement.evenement_id, {
      baseVersion: ficheEvent.version,
      participations: [{ personneId: p.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    ficheEvent = await service.lireEvenement(cancelled.evenement.evenement_id);
    await service.cloturer(cancelled.evenement.evenement_id, { baseVersion: ficheEvent.version }, ACTOR);
    await service.annulerEvenement(cancelled.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(cancelled.evenement.evenement_id)).version,
      motif: 'Annulation test'
    }, ACTOR);

    const hidden = await service.createEvenement({
      date: '2026-04-12',
      domaineCode: 'DPS',
      libelle: 'Supprimé individuel PR repair',
      cibleIds: [cible.cible_id],
      modeSuivi: 'NOMINATIF'
    }, ACTOR);
    await service.figerPopulation(hidden.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [p.personne_id],
      baseVersion: hidden.version
    }, ACTOR);
    await service.masquerEvenement(hidden.evenement.evenement_id, {
      baseVersion: (await repo.getEvent(hidden.evenement.evenement_id)).version,
      motif: 'Suppression test'
    }, ACTOR);

    const fiche = await persons.fiche(p.personne_id, { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' });
    ok((fiche.evenements || []).some((row) => String(row.evenementId) === String(cancelled.evenement.evenement_id) && row.statutEvenement === 'ANNULE'));
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(hidden.evenement.evenement_id)));
    eq(fiche.kpi.eventCount, 0);
    eq(fiche.kpi.denominator, 0);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
