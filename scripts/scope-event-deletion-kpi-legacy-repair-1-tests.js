#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-DELETION-KPI-LEGACY-REPAIR-1 */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');

const TOKEN = 'scope-event-deletion-kpi-legacy-repair-1';
const PERIOD = { from: '2026-04-01', to: '2026-04-30', preset: 'CUSTOM' };
const ACTOR = {
  sub: TOKEN,
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};

const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

function graphCounts(fiche){
  function pointsOf(id){
    return ((((fiche.graphs && fiche.graphs[id] && fiche.graphs[id].series) || [])[0] || {}).points || [])
      .map((point) => ({
        id: point.id,
        label: point.label,
        value: point.value,
        numerator: point.numerator,
        denominator: point.denominator,
        eventCount: point.eventCount,
        volumes: point.volumes || null
      }));
  }
  return {
    domaines: pointsOf('domaines'),
    repartition: pointsOf('repartition'),
    evolution: pointsOf('evolution'),
    domainesAnnees: JSON.parse(JSON.stringify((fiche.graphs && fiche.graphs.domainesAnnees && fiche.graphs.domainesAnnees.series) || [])),
    specialisationsAnnees: JSON.parse(JSON.stringify((fiche.graphs && fiche.graphs.specialisationsAnnees && fiche.graphs.specialisationsAnnees.series) || []))
  };
}

function stateOf(fiche){
  return {
    kpi: {
      percentage: fiche.kpi.percentage,
      numerator: fiche.kpi.numerator,
      denominator: fiche.kpi.denominator,
      eventCount: fiche.kpi.eventCount,
      volumes: {
        attendus: fiche.kpi.volumes.attendus,
        presents: fiche.kpi.volumes.presents,
        excuses: fiche.kpi.volumes.excuses,
        nonExcuses: fiche.kpi.volumes.nonExcuses,
        dispenses: fiche.kpi.volumes.dispenses,
        nonRenseignes: fiche.kpi.volumes.nonRenseignes
      }
    },
    graphs: graphCounts(fiche)
  };
}

async function seedPerson(repo, cibleId, nip = '11551'){
  const personne = await repo.insertPersonne({ nip, nom: `Nom${nip}`, prenom: 'Test', grade: 'Sap' });
  await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cibleId, date_debut: '2026-01-01' });
  return personne;
}

async function createClosedPresent(repo, service, cibleId, personneId, spec){
  const created = await service.createEvenement({
    date: spec.date,
    domaineCode: spec.domaineCode || 'DPS',
    libelle: spec.libelle,
    cibleIds: [cibleId],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '18:00',
    heureFinPrevue: '21:00'
  }, ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, {
    assignmentRequest: true,
    selectedPersonIds: [personneId],
    baseVersion: created.version
  }, ACTOR);
  const afterAssign = await service.lireEvenement(created.evenement.evenement_id);
  await service.enregistrerParticipations(created.evenement.evenement_id, {
    baseVersion: afterAssign.version,
    participations: [{
      personneId,
      statut: spec.statut || 'PRESENT',
      heureDebutIndividuelle: spec.heureDebutIndividuelle || null,
      heureFinIndividuelle: spec.heureFinIndividuelle || null
    }]
  }, ACTOR);
  const afterSave = await service.lireEvenement(created.evenement.evenement_id);
  await service.cloturer(created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
  return repo.getEvent(created.evenement.evenement_id);
}

async function hideOnly(repo, eventId){
  const current = await repo.getEvent(eventId);
  return repo.updateEventIfVersion(eventId, current.version, {
    hidden_at: new Date('2026-04-20T10:00:00.000Z').toISOString(),
    hidden_par: TOKEN
  });
}

function installLegacyAnalyticsLeak(repo, hiddenEventId){
  const original = repo.loadAnalyticsBundle.bind(repo);
  repo.loadAnalyticsBundle = async function patchedLoadAnalyticsBundle(query = {}){
    const bundle = await original(query);
    const hidden = await repo.getEvent(hiddenEventId);
    if(!hidden) return bundle;
    const personId = query.personneId || query.personne_id || null;
    const attendus = await repo.listAttendus(hiddenEventId);
    if(personId && !attendus.some((row) => String(row.personne_id) === String(personId) && row.inclus !== false)) return bundle;
    const participations = await repo.listParticipations(hiddenEventId);
    const cibleIds = await repo.listEventCibleIds(hiddenEventId);
    const leakedEvent = Object.assign({}, hidden, {
      hidden_at: null,
      hiddenAt: null,
      mode_suivi: hidden.mode_suivi || 'NOMINATIF',
      cible_ids: cibleIds
    });
    bundle.events = (bundle.events || []).concat([leakedEvent]);
    bundle.attendusByEvent[hiddenEventId] = attendus;
    bundle.participationsByEvent[hiddenEventId] = participations;
    bundle.cibleIdsByEvent[hiddenEventId] = cibleIds;
    return bundle;
  };
}

(async () => {
  await record('01 — STATE_BEFORE_B égale STATE_AFTER_DELETE_B après suppression normale', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, cible.cible_id, '11551');
    const kept = await createClosedPresent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-10',
      libelle: 'Exercice DPS 1'
    });
    const before = await persons.fiche(personne.personne_id, PERIOD);
    const beforeState = stateOf(before);
    eq(before.kpi.volumes.attendus, 1);
    ok((before.evenements || []).some((row) => String(row.evenementId) === String(kept.evenement_id)));

    const deleted = await createClosedPresent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-14',
      libelle: 'Recette 5, TEST',
      heureDebutIndividuelle: '18:15',
      heureFinIndividuelle: '21:00'
    });
    const withB = await persons.fiche(personne.personne_id, PERIOD);
    eq(withB.kpi.volumes.attendus, 2);
    eq(withB.kpi.volumes.presents, 2);
    ok((withB.evenements || []).some((row) => String(row.evenementId) === String(deleted.evenement_id)));

    await service.masquerEvenement(deleted.evenement_id, {
      baseVersion: (await repo.getEvent(deleted.evenement_id)).version,
      motif: 'Suppression recette KPI legacy repair'
    }, ACTOR);
    const after = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(after.evenements || []).some((row) => String(row.evenementId) === String(deleted.evenement_id)), 'historique sans événement supprimé');
    deepEq(stateOf(after), beforeState, 'KPI et graphes reviennent exactement à l’état avant B');
  });

  await record('02 — source analytics legacy avec enfant hidden résiduel neutralisée dans KPI et graphes', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, cible.cible_id, '11552');
    await createClosedPresent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-10',
      libelle: 'Exercice DPS 1'
    });
    const before = await persons.fiche(personne.personne_id, PERIOD);
    const beforeState = stateOf(before);
    const hidden = await createClosedPresent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-14',
      libelle: 'Recette 5, TEST'
    });
    await hideOnly(repo, hidden.evenement_id);
    eq((await repo.listParticipations(hidden.evenement_id)).length, 1, 'participation legacy encore physiquement présente');
    eq((await repo.listAttendus(hidden.evenement_id)).length, 1, 'attendu legacy encore physiquement présent');
    installLegacyAnalyticsLeak(repo, hidden.evenement_id);

    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    ok(!(fiche.evenements || []).some((row) => String(row.evenementId) === String(hidden.evenement_id)), 'historique filtre le hidden');
    deepEq(stateOf(fiche), beforeState, 'KPI et graphes ignorent le hidden même si une source analytics legacy le fuit');
    eq(fiche.kpi.volumes.attendus, 1);
    eq(fiche.kpi.volumes.presents, 1);
    eq(fiche.kpi.denominator, 1);
    eq(fiche.kpi.numerator, 1);
  });

  await record('03 — ANNULÉ reste visible et hors KPI', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const cible = await repo.findCible('DPS', 'B1');
    const personne = await seedPerson(repo, cible.cible_id, '11553');
    const cancelled = await createClosedPresent(repo, service, cible.cible_id, personne.personne_id, {
      date: '2026-04-12',
      libelle: 'Recette 4, test'
    });
    await service.annulerEvenement(cancelled.evenement_id, {
      baseVersion: (await repo.getEvent(cancelled.evenement_id)).version,
      motif: 'Annulation KPI legacy repair'
    }, ACTOR);
    const fiche = await persons.fiche(personne.personne_id, PERIOD);
    const row = (fiche.evenements || []).find((item) => String(item.evenementId) === String(cancelled.evenement_id));
    ok(row, 'ANNULÉ visible');
    eq(row.statutEvenement, 'ANNULE');
    eq(fiche.kpi.volumes.attendus, 0);
    eq(fiche.kpi.denominator, 0);
    eq(fiche.kpi.numerator, 0);
  });

  const failed = results.filter((row) => row.status === 'NOK');
  for(const row of results){
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  }
  console.log(`assertions=${assertions} failed=${failed.length}`);
  if(failed.length) process.exit(1);
})();
