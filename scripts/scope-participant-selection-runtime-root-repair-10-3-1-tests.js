#!/usr/bin/env node
'use strict';

/** SCOPE — PARTICIPANT-SELECTION-RUNTIME-ROOT-REPAIR-10.3.1 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');

const ROOT = path.join(__dirname, '..');
const ACTOR = {
  sub: 'scope-participant-selection-runtime-root-repair-10-3-1',
  permissions: ['events:create', 'events:update', 'events:delete', 'references:manage'],
  roles: ['sdis-admin']
};
const results = [];
let assertions = 0;

function ok(value, message){ assertions += 1; assert.ok(value, message); }
function eq(actual, expected, message){ assertions += 1; assert.strictEqual(actual, expected, message); }
function includes(text, needle, message){ assertions += 1; assert.ok(String(text || '').includes(needle), message || `expected ${needle}`); }
function notIncludes(text, needle, message){ assertions += 1; assert.ok(!String(text || '').includes(needle), message || `unexpected ${needle}`); }
function read(file){ return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function sorted(ids){ return (ids || []).map(String).slice().sort(); }

function loadLogic(){
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(read('assets/js/scope-ui-logic.js'), sandbox, { filename: 'scope-ui-logic.js' });
  return sandbox.module.exports;
}

function people30(){
  return Array.from({ length: 30 }, (_, index) => ({
    personneId: `p${index + 1}`,
    nom: `Nom${String(index + 1).padStart(2, '0')}`,
    prenom: `Prenom${index + 1}`
  }));
}

async function record(name, fn){
  try{
    await fn();
    results.push({ name, status: 'PASS' });
  }catch(error){
    results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
  }
}

async function seedDpsB1Population(count, libelle){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'B1');
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: String(8800 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: `Prenom${i}`,
      grade: 'Sap'
    });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    people.push(personne);
  }
  const created = await service.createEvenement({
    date: '2026-09-12',
    domaineCode: 'DPS',
    libelle: libelle || 'DPS B1 recette R10.3.1',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '18:45',
    heureFinPrevue: '22:15'
  }, ACTOR);
  return { repo, service, cible, people, created };
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const logicSrc = read('assets/js/scope-ui-logic.js');
  const serviceSrc = read('netlify/lib/_scope-service.js');
  const schema = read('netlify/lib/_scope-schema.js');
  const html = read('scope.html');
  const logic = loadLogic();

  await record('01 — cache-bust et migration additive R10.3.1', async () => {
    includes(html, 'scope-participant-selection-runtime-root-repair-10-3-1');
    includes(schema, 'scope-participant-selection-runtime-root-repair-10-3-1');
    includes(schema, 'scope-event-assigned-population-reactivation-delete-final-10-3');
    includes(schema, 'scope-event-assigned-population-policy-staffing-close-10-2');
    notIncludes(schema, 'drop table scope_evenements');
  });

  await record('02 — source de vérité {personId, selected}, plus pendingRetraits inversé', async () => {
    includes(logicSrc, 'function createPreviewSelectionRows');
    includes(logicSrc, 'function setPreviewRowSelected');
    includes(logicSrc, 'function setAllPreviewSelected');
    includes(logicSrc, 'function selectedPreviewPersonIds');
    includes(logicSrc, 'function buildAssignmentSelectedPersonIds');
    includes(ui, 'previewSelectionRows');
    includes(ui, 'applyPreviewRowSelected');
    includes(ui, 'buildAssignmentSelectedPersonIds');
    includes(ui, 'Sélection incohérente');
    notIncludes(ui, "checkboxNodes.length ? selectedFromDom : selectedFromState");
    notIncludes(ui, 'state.pendingRetraits = ids');
    notIncludes(ui, 'state.pendingRetraits = []');
  });

  await record('03 — 30 lignes, Tout désélectionner, recocher 5, payload = 5', async () => {
    const people = people30();
    let rows = logic.createPreviewSelectionRows(people);
    eq(rows.length, 30, '30 lignes initiales');
    eq(logic.previewSelectionCount(rows).selected, 30);
    rows = logic.setAllPreviewSelected(rows, false);
    eq(rows.length, 30, 'Tout désélectionner ne supprime aucune ligne');
    eq(logic.previewSelectionCount(rows).selected, 0);
    eq(logic.selectedPreviewPersonIds(rows).length, 0);
    const five = people.slice(0, 5).map((person) => person.personneId);
    for(const personId of five){
      rows = logic.setPreviewRowSelected(rows, personId, true);
    }
    const count = logic.previewSelectionCount(rows);
    eq(count.total, 30);
    eq(count.selected, 5);
    eq(logic.parsePreviewSelectedCountText(logic.formatPreviewSelectionCountLabel(count.total, count.selected)), 5);
    const payload = logic.buildAssignmentSelectedPersonIds(rows, 5);
    eq(payload.ok, true);
    eq(payload.selectedPersonIds.length, 5);
    eq(sorted(payload.selectedPersonIds).join(','), sorted(five).join(','));
    for(const person of people.slice(5)){
      ok(!payload.selectedPersonIds.includes(person.personneId), 'aucun des 25 autres dans le payload');
    }
  });

  await record('04 — 30 cochées puis décocher 25 = même payload', async () => {
    const people = people30();
    const five = people.slice(0, 5).map((person) => person.personneId);
    let pathA = logic.setAllPreviewSelected(logic.createPreviewSelectionRows(people), false);
    for(const personId of five) pathA = logic.setPreviewRowSelected(pathA, personId, true);
    const payloadA = logic.buildAssignmentSelectedPersonIds(pathA, 5);

    let pathB = logic.setAllPreviewSelected(logic.createPreviewSelectionRows(people), true);
    eq(logic.previewSelectionCount(pathB).selected, 30);
    for(const person of people.slice(5)){
      pathB = logic.setPreviewRowSelected(pathB, person.personneId, false);
    }
    eq(logic.previewSelectionCount(pathB).total, 30);
    eq(logic.previewSelectionCount(pathB).selected, 5);
    const payloadB = logic.buildAssignmentSelectedPersonIds(pathB, 5);
    eq(payloadB.ok, true);
    eq(sorted(payloadB.selectedPersonIds).join(','), sorted(payloadA.selectedPersonIds).join(','));
    eq(payloadB.selectedPersonIds.length, 5);
  });

  await record('05 — ajout manuel n’altère pas les autres sélections', async () => {
    const people = people30();
    let rows = logic.setAllPreviewSelected(logic.createPreviewSelectionRows(people), false);
    rows = logic.setPreviewRowSelected(rows, 'p1', true);
    rows = logic.setPreviewRowSelected(rows, 'p2', true);
    rows = logic.setPreviewRowSelected(rows, 'p3', true);
    rows = logic.setPreviewRowSelected(rows, 'p4', true);
    rows = logic.setPreviewRowSelected(rows, 'p5', true);
    const before = logic.selectedPreviewPersonIds(rows);
    const added = logic.addManualPreviewSelectionRow(rows, { personne_id: 'p-manual', nom: 'Ajout', prenom: 'Manuel' });
    eq(added.added, true);
    eq(logic.previewSelectionCount(added.rows).total, 31);
    eq(logic.previewSelectionCount(added.rows).selected, 6);
    for(const personId of before){
      ok(logic.selectedPreviewPersonIds(added.rows).includes(personId), 'les 5 restent sélectionnées');
    }
    ok(logic.selectedPreviewPersonIds(added.rows).includes('p-manual'));
    for(const person of people.slice(5)){
      ok(!logic.selectedPreviewPersonIds(added.rows).includes(person.personneId), 'les 25 décochées restent hors payload');
    }
    const duplicate = logic.addManualPreviewSelectionRow(added.rows, { personneId: 'p-manual' });
    eq(duplicate.duplicate, true);
    eq(logic.previewSelectionCount(duplicate.rows).total, 31);
    eq(logic.previewSelectionCount(duplicate.rows).selected, 6);
  });

  await record('06 — garde de cohérence compteur / payload', async () => {
    const rows = logic.setPreviewRowSelected(
      logic.setAllPreviewSelected(logic.createPreviewSelectionRows(people30()), false),
      'p1',
      true
    );
    const blocked = logic.buildAssignmentSelectedPersonIds(rows, 5);
    eq(blocked.ok, false);
    eq(blocked.error, 'selection_incoherente');
    eq(blocked.selectedPersonIds.length, 0);
    const okPayload = logic.buildAssignmentSelectedPersonIds(rows, 1);
    eq(okPayload.ok, true);
    eq(okPayload.selectedPersonIds.join(','), 'p1');
  });

  await record('07 — backend 5 IDs → 5 inclus, aucun fallback preview', async () => {
    includes(serviceSrc, 'selection_elargie');
    const ctx = await seedDpsB1Population(30);
    const preview = await ctx.service.previewAttendus(ctx.created.evenement.evenement_id);
    eq(preview.count, 30, 'proposition théorique 30');
    const selected = ctx.people.slice(0, 5).map((row) => row.personne_id);
    const assigned = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: selected,
      baseVersion: ctx.created.version
    }, ACTOR);
    eq(assigned.count, 5);
    ok(assigned.count !== preview.count, 'pas de fallback vers la preview complète');
    const stored = await ctx.repo.listAttendus(ctx.created.evenement.evenement_id);
    eq(stored.filter((row) => row.inclus !== false).length, 5);
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 5);
    const assignedIds = new Set((fiche.attendus || []).map((row) => String(row.personne_id)));
    for(const personId of selected){
      ok(assignedIds.has(String(personId)), 'les 5 demandés sont inclus');
    }
    for(const person of ctx.people.slice(5)){
      ok(!assignedIds.has(String(person.personne_id)), 'aucun des 25 autres inclus');
    }
  });

  await record('08 — protections hors lot', async () => {
    includes(ui, '>Plan horaire<');
    includes(logicSrc, 'function applyParticipationStatus');
    notIncludes(serviceSrc, 'FORMATEUR_PR');
    includes(ui, 'Réactiver l’événement');
    includes(ui, 'Revenir à la préparation');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(failed.map((row) => row.proof).join('\n\n'));
    process.exit(1);
  }
})();
