#!/usr/bin/env node
'use strict';

/** SCOPE-REPORTING-CYCLES-FOUNDATION-1 - temporal reporting scope foundation. */

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const { collectReport } = require('../netlify/functions/_scope-report-data');
const {
  collectMultisessionReport,
  loadSessionBundle
} = require('../netlify/functions/_scope-multisession-report');
const {
  resolveSessionReportingScope,
  computePrExerciseParticipationState
} = require('../netlify/functions/_scope-cycle-rules');

const ACTOR = { roles: ['sdis-admin'], sub: 'scope-reporting-cycles-foundation-1' };
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function prEvent(id, year, session, patch = {}){
  return Object.assign({
    evenement_id: id,
    cycle_id: 'cycle-pr-base-shared',
    domaine_code: 'PR',
    statut: 'PLANIFIE',
    date: `${year}-03-${String(session * 2 + 1).padStart(2, '0')}`,
    libelle: `Exercice PR 1.${session} | Base`,
    code_cours: `PAPR.PR1.${year}.${session}`,
    pr_exercise_group_key: 'PAPR:PR:1',
    pr_session_key: `PAPR:PR:1.${session}`,
    population_figee: true
  }, patch);
}

function standardEvent(id, domaine, date, patch = {}){
  return Object.assign({
    evenement_id: id,
    cycle_id: null,
    domaine_code: domaine,
    statut: 'REALISE',
    date,
    libelle: `${domaine} standard`,
    code_cours: `${domaine}.STD`,
    population_figee: true
  }, patch);
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function setStatus(repo, eventId, statut){
  await repo.updateEventIfVersion(eventId, await version(repo, eventId), { statut });
}

async function save(service, repo, eventId, participations){
  return service.enregistrerParticipations(eventId, {
    baseVersion: await version(repo, eventId),
    participations
  }, ACTOR);
}

async function addEnc(service, repo, eventId, personneId, role){
  return service.ajouterEncadrement(eventId, {
    baseVersion: await version(repo, eventId),
    personneId,
    role
  }, ACTOR);
}

async function reopen(service, repo, eventId){
  return service.reouvrir(eventId, {
    baseVersion: await version(repo, eventId),
    motif: 'Controle perimetre reporting'
  }, ACTOR);
}

async function close(service, repo, eventId){
  return service.cloturer(eventId, { baseVersion: await version(repo, eventId) }, ACTOR);
}

async function expectHttpError(fn, status, error){
  try{
    await fn();
    assert.fail(`Erreur ${status}/${error} attendue`);
  }catch(err){
    assert.strictEqual(err.status, status);
    assert.strictEqual(err.error, error);
    return err;
  }
}

async function setup(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-base-shared',
    cycle_key: 'PAPR-PR1-BASE',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'PR 1 | Base'
  });
  await repo.insertCycle({
    cycle_id: 'cycle-pr-other',
    cycle_key: 'PAPR-PR2-BASE',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'PR 2 | Base'
  });
  for(let i = 1; i <= 6; i += 1){
    const current = await repo.insertEvenement(prEvent(`pr2026-s${i}`, 2026, i, { statut: 'REALISE' }));
    await repo.updateEventIfVersion(current.evenement_id, 1, { population_figee: true });
    const next = await repo.insertEvenement(prEvent(`pr2027-s${i}`, 2027, i, { statut: i === 1 ? 'PLANIFIE' : 'REALISE' }));
    await repo.updateEventIfVersion(next.evenement_id, 1, { population_figee: true });
  }
  const other = await repo.insertEvenement(prEvent('pr2026-other-s1', 2026, 1, {
    cycle_id: 'cycle-pr-other',
    libelle: 'Exercice PR 2.1 | Base',
    code_cours: 'PAPR.PR2.2026.1',
    pr_exercise_group_key: 'PAPR:PR:2',
    pr_session_key: 'PAPR:PR:2.1',
    statut: 'PLANIFIE'
  }));
  await repo.updateEventIfVersion(other.evenement_id, 1, { population_figee: true });
  const dap = await repo.insertEvenement(standardEvent('dap2026', 'DAP', '2026-04-01'));
  await repo.updateEventIfVersion(dap.evenement_id, 1, { population_figee: true });
  const jsp = await repo.insertEvenement(standardEvent('jsp2026', 'JSP', '2026-05-01'));
  await repo.updateEventIfVersion(jsp.evenement_id, 1, { population_figee: true });

  for(const [personne_id, nip, nom] of [
    ['a', '96001', 'Alpha'],
    ['b', '96002', 'Bravo'],
    ['f', '96998', 'Formateur'],
    ['s', '96997', 'Surveillant']
  ]){
    await repo.insertPersonne({ personne_id, nip, nom, prenom: 'Scope', grade: 'Sap', skipPeriodes: true });
    await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-base-shared', personne_id, role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
    for(const eventId of [
      ...Array.from({ length: 6 }, (_, i) => `pr2026-s${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `pr2027-s${i + 1}`)
    ]){
      await repo.upsertAttendu({ evenement_id: eventId, personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: eventId, personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
    await repo.upsertAttendu({ evenement_id: 'dap2026', personne_id, inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: 'dap2026', personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
  }
  await repo.insertPersonne({ personne_id: 'aux', nip: '96999', nom: 'Auxiliaire', prenom: 'Scope', grade: 'Civil', skipPeriodes: true });
  await repo.insertPersonne({ personne_id: 'future', nip: '97000', nom: 'Future', prenom: 'Scope', grade: 'Sap', skipPeriodes: true });
  await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-base-shared', personne_id: 'future', role_cycle: 'PARTICIPANT', statut_cycle: 'ACTIF' });
  for(let i = 1; i <= 6; i += 1){
    await repo.upsertAttendu({ evenement_id: `pr2027-s${i}`, personne_id: 'future', inclus: true, origine: 'REGLE' });
    await repo.upsertParticipation({ evenement_id: `pr2027-s${i}`, personne_id: 'future', statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
  }
  await repo.upsertParticipation({ evenement_id: 'pr2026-s1', personne_id: 'a', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  await repo.upsertParticipation({ evenement_id: 'pr2026-s2', personne_id: 'b', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  await repo.upsertParticipation({ evenement_id: 'pr2027-s2', personne_id: 'a', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  await repo.upsertParticipation({ evenement_id: 'dap2026', personne_id: 'a', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
  return { repo, service };
}

(async () => {
  await record('01 PR 2026 6/6 REALISE rapport SESSION disponible', async () => {
    const { repo, service } = await setup();
    const fiche = await service.lireEvenement('pr2026-s6');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, true);
    const model = await collectMultisessionReport(repo, 'pr2026-s6');
    assert.strictEqual(model.sessionCount, 6);
    assert.strictEqual(model.event.statut, 'REALISE');
  });

  await record('02 PR 2027 ouverte n empeche PAS rapport PR 2026', async () => {
    const { repo } = await setup();
    const bundle = await loadSessionBundle(repo, 'pr2026-s6');
    assert.deepStrictEqual(bundle.events.map((event) => event.evenement_id), Array.from({ length: 6 }, (_, i) => `pr2026-s${i + 1}`));
    await collectReport(repo, { kind: 'SESSION', evenementId: 'pr2026-s6' }, { includeNominatif: true });
  });

  await record('03 PR 2027 rapport indisponible tant que sa serie est incomplete', async () => {
    const { repo, service } = await setup();
    const fiche = await service.lireEvenement('pr2027-s2');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, false);
    await expectHttpError(() => collectReport(repo, { kind: 'SESSION', evenementId: 'pr2027-s2' }, { includeNominatif: true }), 422, 'rapport_session_incomplete');
  });

  await record('04 Reouverture seance 2026 bloque rapport 2026', async () => {
    const { repo, service } = await setup();
    await reopen(service, repo, 'pr2026-s3');
    const fiche = await service.lireEvenement('pr2026-s6');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, false);
    await expectHttpError(() => collectMultisessionReport(repo, 'pr2026-s6'), 422, 'rapport_session_incomplete');
  });

  await record('05 Recloture rapport 2026 disponible', async () => {
    const { repo, service } = await setup();
    await reopen(service, repo, 'pr2026-s3');
    await close(service, repo, 'pr2026-s3');
    const fiche = await service.lireEvenement('pr2026-s6');
    assert.strictEqual(fiche.prExerciseParticipation.allSessionsClosed, true);
    await collectMultisessionReport(repo, 'pr2026-s6');
  });

  await record('06 EVENT REALISE reste exportable meme si session incomplete', async () => {
    const { repo } = await setup();
    const model = await collectReport(repo, { kind: 'EVENT', evenementId: 'pr2027-s2' }, { includeNominatif: true });
    assert.strictEqual(model.kind, 'EVENT');
    assert.strictEqual(model.event.id, 'pr2027-s2');
  });

  await record('07 Backend refuse SESSION reellement incomplete', async () => {
    const { repo } = await setup();
    const err = await expectHttpError(() => collectMultisessionReport(repo, 'pr2027-s1'), 422, 'rapport_session_incomplete');
    assert.ok((err.details.openSessions || []).some((row) => row.eventId === 'pr2027-s1'));
  });

  await record('08 Backend accepte SESSION complete malgre autre annee ouverte', async () => {
    const { repo } = await setup();
    const model = await collectReport(repo, { kind: 'SESSION', evenementId: 'pr2026-s1' }, { includeNominatif: true });
    assert.strictEqual(model.sessionCount, 6);
    assert.ok(model.seances.every((row) => String(row.date).startsWith('2026-')));
  });

  await record('09 allSessionsClosed utilise le perimetre exact', async () => {
    const { repo } = await setup();
    const all = await repo.listPrExerciseEvents('PAPR:PR:1');
    const scope = resolveSessionReportingScope({ evenements: all, currentEvent: await repo.getEvent('pr2026-s1') });
    const state = computePrExerciseParticipationState({ evenements: scope.events, currentEventId: 'pr2026-s1', currentEvent: await repo.getEvent('pr2026-s1'), attendus: [], participations: [], personnes: [] });
    assert.strictEqual(scope.events.length, 6);
    assert.strictEqual(state.allSessionsClosed, true);
  });

  await record('10 aucune seance autre periode dans le perimetre', async () => {
    const { repo } = await setup();
    const bundle = await loadSessionBundle(repo, 'pr2026-s1');
    assert.ok(bundle.events.every((event) => String(event.date).startsWith('2026-')));
  });

  await record('11 aucune seance autre domaine', async () => {
    const { repo } = await setup();
    const bundle = await loadSessionBundle(repo, 'pr2026-s1');
    assert.ok(!bundle.events.some((event) => event.domaine_code === 'DAP' || event.domaine_code === 'JSP'));
  });

  await record('12 aucune seance autre serie/cycle', async () => {
    const { repo } = await setup();
    const bundle = await loadSessionBundle(repo, 'pr2026-s1');
    assert.ok(!bundle.events.some((event) => event.evenement_id === 'pr2026-other-s1'));
  });

  await record('13 FORMATEUR non regresse', async () => {
    const { repo, service } = await setup();
    await reopen(service, repo, 'pr2026-s1');
    await addEnc(service, repo, 'pr2026-s1', 'f', 'FORMATEUR');
    const row = await repo.getParticipation('pr2026-s1', 'f');
    assert.strictEqual(row.role, 'FORMATEUR');
    assert.strictEqual(row.statut, 'PRESENT');
  });

  await record('14 SURVEILLANT hors KPI taux', async () => {
    const { repo, service } = await setup();
    await reopen(service, repo, 'pr2026-s1');
    await save(service, repo, 'pr2026-s1', [{ personneId: 's', statut: 'PRESENT', role: 'PARTICIPANT' }]);
    await addEnc(service, repo, 'pr2026-s1', 's', 'SURVEILLANT');
    const fiche = await service.lireEvenement('pr2026-s1');
    assert.strictEqual((await repo.getParticipation('pr2026-s1', 's')).statut, 'NON_RENSEIGNE');
    assert.strictEqual(fiche.compteurs.presents, 1);
  });

  await record('15 AUXILIAIRE hors KPI taux', async () => {
    const { repo, service } = await setup();
    await reopen(service, repo, 'pr2026-s1');
    await addEnc(service, repo, 'pr2026-s1', 'aux', 'AUXILIAIRE');
    const fiche = await service.lireEvenement('pr2026-s1');
    assert.ok(fiche.encadrement.some((row) => row.personne_id === 'aux' && row.role === 'AUXILIAIRE'));
    assert.strictEqual(fiche.compteurs.presents, 1);
  });

  await record('16 R4 deduplication non regressee', async () => {
    const { service } = await setup();
    const fiche = await service.lireEvenement('pr2026-s6');
    assert.strictEqual(fiche.prExerciseParticipation.kpis.presents, 2);
    assert.strictEqual(fiche.prExerciseParticipation.kpis.population, 4);
  });

  await record('17 fiche REALISE reste locale', async () => {
    const { service } = await setup();
    const fiche = await service.lireEvenement('pr2026-s6');
    assert.strictEqual(fiche.evenement.statut, 'REALISE');
    assert.strictEqual(fiche.compteurs.presents, 0);
  });

  await record('18 rapport SESSION reste consolide', async () => {
    const { repo } = await setup();
    const model = await collectMultisessionReport(repo, 'pr2026-s6');
    assert.strictEqual(model.officiel.volumes.presents, 2);
    assert.strictEqual(model.seances.length, 6);
  });

  await record('19 aucune contamination KPI 2026 par 2027', async () => {
    const { service } = await setup();
    const fiche = await service.lireEvenement('pr2026-s6');
    assert.strictEqual(fiche.prExerciseParticipation.reportingScope.period.from, '2026-01-01');
    assert.ok(fiche.prExerciseParticipation.reportingScope.eventIds.every((id) => id.startsWith('pr2026-')));
    assert.strictEqual(fiche.prExerciseParticipation.kpis.population, 4);
  });

  await record('20 aucun N+1 evident introduit', async () => {
    const { repo } = await setup();
    let listPartsCalls = 0;
    let listEventsCalls = 0;
    const wrapped = Object.assign({}, repo, {
      listParticipationsForEvents(ids){ listPartsCalls += 1; return repo.listParticipationsForEvents(ids); },
      listPrExerciseEvents(groupKey){ listEventsCalls += 1; return repo.listPrExerciseEvents(groupKey); }
    });
    await collectMultisessionReport(wrapped, 'pr2026-s1');
    assert.strictEqual(listEventsCalls, 1);
    assert.strictEqual(listPartsCalls, 1);
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for(const r of results){
    if(r.status === 'PASS') console.log(`PASS ${r.name}`);
    else console.error(`NOK ${r.name}\n${r.proof}`);
  }
  if(failed.length){
    console.error(`\nSCOPE-REPORTING-CYCLES-FOUNDATION-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-REPORTING-CYCLES-FOUNDATION-1 tests: ${results.length}/${results.length} PASS`);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
