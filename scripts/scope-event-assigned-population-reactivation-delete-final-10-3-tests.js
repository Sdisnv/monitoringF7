#!/usr/bin/env node
'use strict';

/** SCOPE — ASSIGNED-POPULATION-REACTIVATION-DELETE-UX-FINAL-10.3 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const ACTOR = {
  sub: 'scope-event-assigned-population-reactivation-delete-final-10-3',
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

function loadLogic(){
  const sandbox = { module: { exports: {} }, exports: {}, window: {}, console };
  sandbox.global = sandbox;
  vm.runInNewContext(read('assets/js/scope-ui-logic.js'), sandbox, { filename: 'scope-ui-logic.js' });
  return sandbox.module.exports;
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
      nip: String(7700 + i),
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
    libelle: libelle || 'DPS B1 recette R10.3',
    cibleIds: [cible.cible_id],
    modeSuivi: 'NOMINATIF',
    heureDebutPrevue: '18:45',
    heureFinPrevue: '22:15'
  }, ACTOR);
  return { repo, service, cible, people, created };
}

(async () => {
  const ui = read('assets/js/scope-ui.js');
  const css = read('assets/css/scope.css');
  const logicSrc = read('assets/js/scope-ui-logic.js');
  const serviceSrc = read('netlify/lib/_scope-service.js');
  const schema = read('netlify/lib/_scope-schema.js');
  const html = read('scope.html');
  const apiFn = read('netlify/functions/scope.js');
  const logic = loadLogic();

  await record('01 — cache-bust et migration additive R10.3', async () => {
    includes(html, 'scope-participant-selection-runtime-root-repair-10-3-1');
    includes(schema, 'scope-event-assigned-population-reactivation-delete-final-10-3');
    includes(schema, 'scope-event-assigned-population-policy-staffing-close-10-2');
    includes(schema, 'scope-event-workflow-assignment-staffing-semantic-repair-10-1');
    notIncludes(schema, 'drop table scope_evenements');
  });

  await record('Cas A — preview 30 → sélection 5 → lecture/saisie/clôture/rapport 5', async () => {
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
    const stored = await ctx.repo.listAttendus(ctx.created.evenement.evenement_id);
    eq(stored.filter((row) => row.inclus !== false).length, 5);
    eq(stored.filter((row) => row.inclus === false && row.origine_retrait === 'NON_ASSIGNE').length, 25);
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 5, 'lecture événement = 5');
    const assignedIds = new Set((fiche.attendus || []).map((row) => String(row.personne_id)));
    for(const person of ctx.people.slice(5)){
      ok(!assignedIds.has(String(person.personne_id)), 'aucun des 25 non sélectionnés réinjecté');
    }
    const sync = await ctx.service.syncExpectedPopulationForPersonnes(ctx.people.map((row) => row.personne_id), ACTOR);
    eq(sync.attendusAdded, 0);
    eq((await ctx.service.lireEvenement(ctx.created.evenement.evenement_id)).attendus.length, 5);

    const [a, b, c, d, e] = selected;
    await ctx.service.enregistrerParticipations(ctx.created.evenement.evenement_id, {
      baseVersion: fiche.version,
      participations: [
        { personneId: a, statut: 'PRESENT' },
        { personneId: b, statut: 'PRESENT' },
        { personneId: c, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
        { personneId: d, statut: 'ABSENT_NON_EXCUSE' },
        { personneId: e, statut: 'DISPENSE' }
      ]
    }, ACTOR);
    const afterSave = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((afterSave.attendus || []).length, 5, 'saisie = 5');
    const saisieRows = (afterSave.attendus || []).map((attendu) => {
      const part = (afterSave.participations || []).find((row) => String(row.personne_id) === String(attendu.personne_id)) || {};
      return { inclus: attendu.inclus, statut: part.statut, motifAbsence: part.motif_absence, role: part.role };
    });
    eq(logic.liveCounters(saisieRows).open, 0, 'À renseigner = 0');
    const closed = await ctx.service.cloturer(ctx.created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
    eq(closed.evenement.statut, 'REALISE');
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.created.evenement.evenement_id }, { includeNominatif: true });
    eq((model.nominatif || []).length, 5, 'rapport = 5');
    const reportNips = new Set((model.nominatif || []).map((row) => String(row.nip)));
    for(const person of ctx.people.slice(5)){
      ok(!reportNips.has(String(person.nip)), 'rapport sans non assignés');
    }
  });

  await record('Cas A2 — population théorique élevée, assignée faible, sans reconstruction', async () => {
    const ctx = await seedDpsB1Population(40, 'DPS formation groupée recette R10.3');
    const selected = ctx.people.slice(0, 2).map((row) => row.personne_id);
    await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: selected,
      baseVersion: ctx.created.version
    }, ACTOR);
    const allAgain = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: selected,
      baseVersion: (await ctx.repo.getEvent(ctx.created.evenement.evenement_id)).version
    }, ACTOR);
    eq(allAgain.count, 2, 'ré-assignation sans participation réelle conserve 2');
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 2);
    includes(serviceSrc, 'if(v2State && !assignedPopulationLocked(evenement))');
    includes(serviceSrc, 'if(assignedPopulationLocked(evenement)) return;');
  });

  await record('Cas B — SAFE-CLOSE 2 Présents + 1 Excusé + 1 Absent + 1 Dispensé', async () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT' },
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT' },
      { inclus: true, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', role: 'PARTICIPANT' },
      { inclus: true, statut: 'ABSENT_NON_EXCUSE', role: 'PARTICIPANT' },
      { inclus: true, statut: 'DISPENSE', role: 'PARTICIPANT' }
    ];
    const counters = logic.liveCounters(rows);
    eq(counters.open, 0);
    eq(counters.present, 2);
    eq(counters.excuse, 1);
    eq(counters.absent, 1);
    eq(counters.dispense, 1);
    eq(logic.listIncompleteClosureRows(rows).length, 0);
    ok(!logic.isIncompleteClosureRow(rows[3]), 'Absent renseigné ≠ non renseigné');
  });

  await record('Cas C — ajout formateur → annuler → réactiver → modifier → supprimer', async () => {
    const ctx = await seedDpsB1Population(1);
    const frozen = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [ctx.people[0].personne_id],
      baseVersion: ctx.created.version
    }, ACTOR);
    const trainer = await ctx.repo.insertPersonne({ nip: '7647', nom: 'Grünig', prenom: 'Thierry', grade: 'Cap' });
    const added = await ctx.service.ajouterEncadrement(ctx.created.evenement.evenement_id, {
      personneId: trainer.personne_id,
      role: 'FORMATEUR',
      timeMode: 'CUSTOM',
      heureDebutIndividuelle: '16:30',
      heureFinIndividuelle: '23:00',
      creationDl: true,
      preparationDlMinutes: 180,
      baseVersion: frozen.version
    }, ACTOR);
    const cancelled = await ctx.service.annulerEvenement(ctx.created.evenement.evenement_id, {
      motif: 'Recette R10.3',
      baseVersion: added.version
    }, ACTOR);
    eq(cancelled.evenement.statut, 'ANNULE');
    const listed = await ctx.service.listEvenements({ annee: 2026 });
    const row = listed.evenements.find((item) => item.evenement.evenement_id === ctx.created.evenement.evenement_id);
    eq(row.etatMetier.code, 'ANNULE');
    eq(CycleRules.isEventStatisticallyCountable(cancelled.evenement), false);
    const reactivated = await ctx.service.reactiverEvenement(ctx.created.evenement.evenement_id, {
      motif: 'Réactivation recette',
      baseVersion: cancelled.version
    }, ACTOR);
    eq(reactivated.evenement.statut, 'PLANIFIE');
    await ctx.service.modifierEncadrement(ctx.created.evenement.evenement_id, {
      personneId: trainer.personne_id,
      role: 'FORMATEUR',
      timeMode: 'EVENT',
      creationDl: true,
      preparationDlMinutes: 90,
      baseVersion: reactivated.version
    }, ACTOR);
    const edited = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((edited.encadrement || []).length, 1);
    eq(edited.encadrement[0].heure_debut_individuelle, null);
    await ctx.service.retirerEncadrement(ctx.created.evenement.evenement_id, {
      personneId: trainer.personne_id,
      baseVersion: edited.version
    }, ACTOR);
    eq((await ctx.service.lireEvenement(ctx.created.evenement.evenement_id)).encadrement.length, 0, 'formateur réellement disparu');
  });

  await record('Cas D — Revenir à la préparation désassigne sans détruire l’événement', async () => {
    const ctx = await seedDpsB1Population(8);
    const assigned = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: ctx.people.slice(0, 3).map((row) => row.personne_id),
      baseVersion: ctx.created.version
    }, ACTOR);
    const released = await ctx.service.desassignerPopulation(ctx.created.evenement.evenement_id, {
      baseVersion: assigned.version
    }, ACTOR);
    eq(released.evenement.population_figee, false);
    eq(released.evenement.evenement_id, ctx.created.evenement.evenement_id);
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 0, 'attendus opérationnels désassignés');
    const journal = await ctx.repo.listJournal('evenement', ctx.created.evenement.evenement_id);
    ok(journal.some((item) => item.action === 'DESASSIGNER_PARTICIPANTS'));
    ok(journal.some((item) => item.action === 'CREER'), 'identité / journal conservés');
  });

  await record('Cas E — suppression assignés sans participation vs refus si saisie réelle', async () => {
    const unused = await seedDpsB1Population(4, 'Suppression sans participation');
    const assigned = await unused.service.figerPopulation(unused.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: unused.people.slice(0, 2).map((row) => row.personne_id),
      baseVersion: unused.created.version
    }, ACTOR);
    const hidden = await unused.service.masquerEvenement(unused.created.evenement.evenement_id, { baseVersion: assigned.version }, ACTOR);
    ok(hidden.hidden);

    const used = await seedDpsB1Population(2, 'Suppression avec participation');
    const frozen = await used.service.figerPopulation(used.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [used.people[0].personne_id],
      baseVersion: used.created.version
    }, ACTOR);
    const saved = await used.service.enregistrerParticipations(used.created.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{ personneId: used.people[0].personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    let refuse = null;
    try{
      await used.service.masquerEvenement(used.created.evenement.evenement_id, { baseVersion: saved.version }, ACTOR);
    }catch(error){
      refuse = error;
    }
    eq(refuse && refuse.error, 'suppression_interdite');
    eq(refuse.message, 'Impossible de supprimer cet événement : des participations ont déjà été enregistrées.');
  });

  await record('Cas F — UX encadrement titres / casse / radios', async () => {
    includes(ui, '>RÔLE<');
    includes(ui, '>HORAIRE<');
    includes(ui, '>DESCENTE DE LEÇON<');
    includes(ui, '>RECHERCHE<');
    includes(ui, '> Événement</label>');
    includes(ui, '> Individuel</label>');
    includes(ui, '<span>Préparation à solder</span>');
    notIncludes(ui, '>ÉVÉNEMENT<');
    notIncludes(ui, '>INDIVIDUEL<');
    notIncludes(ui, '>PRÉPARATION À SOLDER<');
    includes(css, 'label.scope-enc-radio');
    includes(css, 'text-transform: none');
    includes(css, 'display: inline-flex');
    includes(ui, 'previewSelectionRows');
    includes(ui, 'buildAssignmentSelectedPersonIds');
    includes(ui, 'Sélection incohérente');
    notIncludes(ui, "checkboxNodes.length ? selectedFromDom : selectedFromState");
    includes(ui, 'keptSelectionRows');
  });

  await record('Cas G — DELETE encadrement routé, jamais not_found utilisateur', async () => {
    const modifierIdx = apiFn.indexOf("match(path, '/evenements/:id/encadrement/modifier')");
    const encadrementIdx = apiFn.lastIndexOf("match(path, '/evenements/:id/encadrement')");
    ok(modifierIdx >= 0 && encadrementIdx > modifierIdx, 'DELETE encadrement lié après le match exact /encadrement');
    includes(apiFn, "if(method === 'DELETE' && params)");
    includes(apiFn, "await service.retirerEncadrement(params.id, body, claims)");
    notIncludes(apiFn, "error:'not_found'");
    notIncludes(apiFn, 'error:\'not_found\'');
    const info = logic.friendlyError({ status: 404, error: 'not_found', message: 'not_found' });
    notIncludes(info.message, 'not_found');
    notIncludes(info.title, 'not_found');
    eq(info.title, 'Action impossible');
  });

  await record('Protections — motifs / horaires / pas de chantier collatéral', async () => {
    includes(ui, '>Plan horaire<');
    includes(logicSrc, 'function applyParticipationStatus');
    notIncludes(serviceSrc, 'FORMATEUR_PR');
    includes(ui, 'Réactiver l’événement');
    includes(ui, 'Revenir à la préparation');
    includes(serviceSrc, 'function operationalAttendus');
    includes(serviceSrc, 'Impossible de supprimer cet événement réalisé.');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(failed.map((row) => row.proof).join('\n\n'));
    process.exit(1);
  }
})();
