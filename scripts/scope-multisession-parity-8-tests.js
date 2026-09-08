#!/usr/bin/env node
'use strict';

/** SCOPE-MULTISESSION-PARITY-8 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const L = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const ACTOR = { sub: 'scope-multisession-parity-8', roles: ['ADMIN'], displayName: 'Testeur SCOPE' };
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function deepEq(actual, expected, message){ assertions += 1; assert.deepStrictEqual(actual, expected, message); }

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function person(repo, id, nip, index){
  return repo.insertPersonne({
    personne_id: id,
    nip,
    nom: `Parity${String(index).padStart(2, '0')}`,
    prenom: 'Scope',
    grade: 'Sap',
    date_entree: '2020-01-01',
    skipPeriodes: true
  });
}

async function setupMultisession(domaine){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const prefix = String(domaine).toLowerCase();
  const events = [];
  for(const index of [1, 2]){
    const inserted = await repo.insertEvenement({
      evenement_id: `${prefix}-p8-s${index}`,
      domaine_code: domaine,
      date: `2026-08-0${index}`,
      libelle: domaine === 'DAP' ? `Formation groupée DAP 1.${index}` : `Exercice PR 1.${index}`,
      code_cours: `${domaine}.PARITY8.${index}`,
      pr_exercise_group_key: `${domaine}:PARITY8:1`,
      pr_session_key: `${domaine}:PARITY8:1.${index}`,
      mode_session: 'MULTI',
      nombre_sessions_attendu: 2,
      session_index: index,
      consolidation_active: true,
      population_figee: true
    });
    events.push(await repo.updateEventIfVersion(inserted.evenement_id, inserted.version, { population_figee: true }));
  }
  const people = {
    a: await person(repo, `${prefix}-p8-a`, `${domaine}-P8-A`, 1),
    b: await person(repo, `${prefix}-p8-b`, `${domaine}-P8-B`, 2),
    c: await person(repo, `${prefix}-p8-c`, `${domaine}-P8-C`, 3),
    d: await person(repo, `${prefix}-p8-d`, `${domaine}-P8-D`, 4)
  };
  for(const ev of events){
    for(const p of [people.a, people.b, people.c]){
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

function part(person, statut, role){
  return { personneId: person.personne_id, statut, role: role || 'PARTICIPANT' };
}

async function saveRows(ctx, eventId, rows){
  return ctx.service.enregistrerParticipations(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    participations: rows
  }, ACTOR);
}

async function addEncadrement(ctx, eventId, person){
  return ctx.service.ajouterEncadrement(eventId, {
    baseVersion: await version(ctx.repo, eventId),
    personneId: person.personne_id,
    role: 'FORMATEUR'
  }, ACTOR);
}

function uiRowFromFiche(fiche, attendu){
  const pid = attendu.personne_id;
  const part = (fiche.participations || []).find((row) => row.personne_id === pid) || {};
  return {
    personneId: pid,
    inclus: attendu.inclus !== false,
    statut: part.statut || 'NON_RENSEIGNE',
    role: part.role || 'PARTICIPANT',
    motifAbsence: part.motif_absence || '',
    alreadyCountedInSession: Boolean(attendu.alreadyCountedInSession || attendu.already_counted_in_session),
    coveredInGlobalBilan: Boolean(attendu.alreadyCountedInSession || attendu.already_counted_in_session),
    sessionReferenceLabel: attendu.sessionReferenceLabel || attendu.session_reference_label || '',
    sessionReferenceEventLabel: attendu.sessionReferenceEventLabel || attendu.session_reference_event_label || ''
  };
}

async function exerciseParity(domaine){
  const ctx = await setupMultisession(domaine);
  const [s1, s2] = ctx.events;
  await saveRows(ctx, s1.evenement_id, [
    part(ctx.people.a, 'PRESENT'),
    part(ctx.people.b, 'PRESENT', 'FORMATEUR')
  ]);
  await addEncadrement(ctx, s1.evenement_id, ctx.people.d);
  const closed1 = await ctx.service.cloturer(s1.evenement_id, { baseVersion: await version(ctx.repo, s1.evenement_id) }, ACTOR);
  eq(closed1.evenement.statut, 'REALISE', `${domaine} session intermédiaire clôturée`);
  await addEncadrement(ctx, s2.evenement_id, ctx.people.b);
  await addEncadrement(ctx, s2.evenement_id, ctx.people.d);

  const fiche2 = await ctx.service.lireEvenement(s2.evenement_id);
  const byId = new Map((fiche2.attendus || []).map((row) => [row.personne_id, row]));
  const rowA = uiRowFromFiche(fiche2, byId.get(ctx.people.a.personne_id));
  const rowB = uiRowFromFiche(fiche2, byId.get(ctx.people.b.personne_id));
  const rowC = uiRowFromFiche(fiche2, byId.get(ctx.people.c.personne_id));
  const standardVisible = [rowA, rowB, rowC].filter((row) => !(L.ROLES_ENCADREMENT && L.ROLES_ENCADREMENT.has(String(row.role || '').toUpperCase())));
  const openRows = [rowA, rowB, rowC].filter((row) => L.isOpenSaisieRow(row));
  const state = fiche2.sessionParticipation || fiche2.prExerciseParticipation;
  const beforeClose = await ctx.service.lireEvenement(s2.evenement_id);
  let finalError = null;
  try {
    await ctx.service.cloturer(s2.evenement_id, { baseVersion: beforeClose.evenement.version }, ACTOR);
  } catch(error) {
    finalError = error;
  }
  return {
    ctx,
    fiche2,
    rowA,
    rowB,
    rowC,
    standardVisible,
    openRows,
    state,
    finalError
  };
}

async function cible(repo, domaine, niveau){
  const row = await repo.findCible(domaine, niveau);
  ok(row, `${domaine}/${niveau} introuvable`);
  return row;
}

async function assignedPerson(repo, cibleRow, nip, index){
  const p = await repo.insertPersonne({
    nip,
    nom: `Catch${String(index).padStart(2, '0')}`,
    prenom: 'Scope',
    grade: 'Sap',
    date_entree: '2020-01-01'
  });
  await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cibleRow.cible_id, date_debut: '2020-01-01' });
  return p;
}

async function createDapEvent(service, cibleRow, date, libelle){
  const created = await service.createEvenement({
    date,
    domaineCode: 'DAP',
    libelle,
    cibleIds: [cibleRow.cible_id],
    exerciseEquivalenceKey: 'PARITY-8-CATCHUP'
  }, ACTOR);
  const frozen = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return { eventId: created.evenement.evenement_id, version: frozen.version };
}

async function serviceSave(service, eventId, rows){
  const fiche = await service.lireEvenement(eventId);
  return service.enregistrerParticipations(eventId, {
    baseVersion: fiche.evenement.version,
    participations: rows.map((row) => ({
      personneId: row.personne.personne_id,
      statut: row.statut,
      role: row.role || 'PARTICIPANT',
      motifAbsence: row.motifAbsence || null,
      commentaire: row.commentaire || null
    }))
  }, ACTOR);
}

async function addCatchup(service, eventId, personne, sourceLabel){
  const fiche = await service.lireEvenement(eventId);
  return service.ajouterException(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id,
    role: 'PARTICIPANT',
    motifInclusion: L.permutationCatchupMotif({ libelle: sourceLabel })
  }, ACTOR);
}

async function removeExpected(service, eventId, personne){
  const fiche = await service.lireEvenement(eventId);
  return service.retirerAttendu(eventId, {
    baseVersion: fiche.evenement.version,
    personneId: personne.personne_id
  }, ACTOR);
}

(async () => {
  await record('01-07,10 — parité PR/DAP réelle: réalisé, formateur, filtre ouvert, SAFE-CLOSE', async () => {
    const pr = await exerciseParity('PR');
    const dap = await exerciseParity('DAP');
    for(const [label, current] of [['PR', pr], ['DAP', dap]]){
      ok(current.rowA.alreadyCountedInSession, `${label} présent session 1 grisé session 2`);
      ok(!L.isOpenSaisieRow(current.rowA), `${label} présent session 1 exclu Non renseigné`);
      ok(!L.buildPresenceSavePayload([current.rowA]).length, `${label} boutons/actions neutralisés par payload`);
      eq(L.sessionExplainTooltip(current.rowA), 'Réalisé lors de la session 1.', `${label} information session`);
      eq(current.rowB.role, 'FORMATEUR', `${label} formateur population visible encadrement session 2`);
      ok(!current.standardVisible.some((row) => row.personneId === current.rowB.personneId), `${label} formateur non injecté en Présent standard`);
      ok(!L.isOpenSaisieRow(current.rowB), `${label} formateur exclu Non renseigné`);
      deepEq((current.fiche2.encadrement || []).filter((row) => row.personne_id === current.ctx.people.d.personne_id).map((row) => row.role), ['FORMATEUR'], `${label} formateur hors population encadrement uniquement`);
      eq(current.state.kpis.presents, 2, `${label} A + B réalisés consolidés`);
      eq(current.state.kpis.open, 1, `${label} C reste seule obligation ouverte`);
      ok(current.finalError && current.finalError.error === 'session_incomplete', `${label} finale bloquée`);
      deepEq((current.finalError.details && current.finalError.details.unfilledPeople || []).map((row) => row.personneId), [current.ctx.people.c.personne_id], `${label} blocage uniquement C`);
    }
    deepEq(dap.state.kpis, pr.state.kpis, 'KPI consolidés DAP identiques PR');
  });

  await record('08-09 — rattrapage DAP add/remove/readd/save sans doublon ni fantôme', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const y1 = await cible(repo, 'DAP', 'Y1');
    const y2 = await cible(repo, 'DAP', 'Y2');
    const sourcePerson = await assignedPerson(repo, y1, 'P8-CATCH-SRC', 1);
    const other = await assignedPerson(repo, y2, 'P8-CATCH-OTHER', 2);
    const source = await createDapEvent(service, y1, '2026-09-01', 'Parity 8 source');
    const dest = await createDapEvent(service, y2, '2026-09-08', 'Parity 8 destination');
    await serviceSave(service, source.eventId, [{ personne: sourcePerson, statut: 'PERMUTATION' }]);
    await serviceSave(service, dest.eventId, [{ personne: other, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' }]);

    await addCatchup(service, dest.eventId, sourcePerson, 'Parity 8 source');
    await removeExpected(service, dest.eventId, sourcePerson);
    ok((await service.permutationsForEvent(dest.eventId)).obligations.some((row) => row.personneId === sourcePerson.personne_id && row.compatible !== false), 'redevient disponible après retrait');
    await addCatchup(service, dest.eventId, sourcePerson, 'Parity 8 source');
    await serviceSave(service, dest.eventId, [
      { personne: other, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE' },
      { personne: sourcePerson, statut: 'PRESENT' }
    ]);
    const fiche = await service.lireEvenement(dest.eventId);
    const catchupAttendus = fiche.attendus.filter((row) => row.personne_id === sourcePerson.personne_id && row.inclus !== false);
    const catchupParticipations = fiche.participations.filter((row) => row.personne_id === sourcePerson.personne_id);
    eq(catchupAttendus.length, 1, 'attendu rattrapage unique');
    eq(catchupParticipations.length, 1, 'participation rattrapage unique');
    eq(catchupParticipations[0].statut, 'PRESENT', 'statut conservé après Enregistrer');
    ok(L.permutationCatchupSourceLabel(catchupAttendus[0]).includes('Parity 8 source'), 'provenance conservée');
    ok((await service.permutationsForEvent(dest.eventId)).obligations.every((row) => row.personneId !== sourcePerson.personne_id || row.compatible === false), 'candidat non disponible une fois ajouté');
    eq((fiche.participations.find((row) => row.personne_id === other.personne_id) || {}).statut, 'ABSENT_EXCUSE', 'autres participants inchangés');
    await removeExpected(service, dest.eventId, sourcePerson);
    ok((await service.permutationsForEvent(dest.eventId)).obligations.some((row) => row.personneId === sourcePerson.personne_id && row.compatible !== false), 'redevient disponible après retrait ultérieur');
  });

  await record('UX — pas de nouveau moteur, pas de Source, lignes non ajoutables grisées, statuts ancrés, navigation DAP sobre', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    const logic = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    const service = fs.readFileSync(path.join(ROOT, 'netlify/lib/_scope-service.js'), 'utf8');
    ok(!/computeDapMultiSession|computeMultiSessionV2/.test(service + logic));
    ok(!ui.includes('DAP · Global du domaine'));
    ok(ui.includes('Voir le rapport global de participation'));
    ok(!ui.includes('<th>Source</th>'));
    ok(ui.includes('<th>Événement d’origine</th>'));
    ok(ui.includes('scope-row-disabled'));
    ok(css.includes('.scope-table tbody tr.scope-row-disabled'));
    ok(!/scope-status-control-group\.is-compact\s+\.scope-status-control:not\(\.is-selected\)\s*\{[^}]*display:\s*none/.test(css));
    ok(logic.includes('Réalisé lors de la session'));
    ok(!ui.includes("toast('info', 'Déjà ajoutée'"));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  results.forEach((r) => console.log(`${r.status} ${r.name}${r.proof ? `\n${r.proof}` : ''}`));
  console.log(`Assertions: ${assertions}`);
  if(failed.length) process.exit(1);
})().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
