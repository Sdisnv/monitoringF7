#!/usr/bin/env node
'use strict';

/** SCOPE — EVENT-ASSIGNED-POPULATION-POLICY-STAFFING-CLOSE-10.2 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { collectReport } = require('../netlify/lib/_scope-report-data');
const { resolveParticipationPolicy } = require('../netlify/lib/_scope-participation-policy');
const CycleRules = require('../netlify/lib/_scope-cycle-rules');

const ROOT = path.join(__dirname, '..');
const ACTOR = {
  sub: 'scope-event-assigned-population-policy-staffing-close-10-2',
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

async function seedDpsB1Population(count){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DPS' && row.niveau_code === 'B1');
  const people = [];
  for(let i = 1; i <= count; i += 1){
    const personne = await repo.insertPersonne({
      nip: String(7600 + i),
      nom: `Nom${String(i).padStart(2, '0')}`,
      prenom: `Prenom${i}`,
      grade: 'Sap'
    });
    await repo.insertAffectation({ personne_id: personne.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01' });
    people.push(personne);
  }
  const created = await service.createEvenement({
    date: '2026-09-11',
    domaineCode: 'DPS',
    libelle: 'DPS B1 recette R10.2',
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
  const report = read('netlify/lib/_scope-report-data.js');
  const logic = loadLogic();

  await record('01 — cache-bust et migration additive R10.2', async () => {
    includes(html, 'scope-participant-selection-runtime-root-repair-10-3-1');
    includes(schema, 'scope-event-assigned-population-policy-staffing-close-10-2');
    includes(schema, 'scope-event-workflow-assignment-staffing-semantic-repair-10-1');
    notIncludes(schema, 'drop table scope_evenements');
  });

  await record('02 — preview 29 → assignation 5 = saisie / clôture / rapport 5', async () => {
    const ctx = await seedDpsB1Population(29);
    const preview = await ctx.service.previewAttendus(ctx.created.evenement.evenement_id);
    eq(preview.count, 29, 'proposition théorique 29');
    const selected = ctx.people.slice(0, 5).map((row) => row.personne_id);
    const assigned = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: selected,
      baseVersion: ctx.created.version
    }, ACTOR);
    eq(assigned.count, 5);
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    eq((fiche.attendus || []).length, 5, 'saisie = 5');
    const assignedIds = new Set((fiche.attendus || []).map((row) => String(row.personne_id)));
    for(const person of ctx.people.slice(5)){
      ok(!assignedIds.has(String(person.personne_id)), 'aucune réinjection des 24');
    }
    const sync = await ctx.service.syncExpectedPopulationForPersonnes(ctx.people.map((row) => row.personne_id), ACTOR);
    eq(sync.attendusAdded, 0);
    eq((await ctx.service.lireEvenement(ctx.created.evenement.evenement_id)).attendus.length, 5);

    const [a, b, c, d, e] = selected;
    await ctx.service.enregistrerParticipations(ctx.created.evenement.evenement_id, {
      baseVersion: fiche.version,
      participations: [
        { personneId: a, statut: 'PRESENT' },
        { personneId: b, statut: 'PRESENT', heureDebutIndividuelle: '18:30', heureFinIndividuelle: '22:30' },
        { personneId: c, statut: 'ABSENT_EXCUSE', motif_absence: 'PRIVE' },
        { personneId: d, statut: 'ABSENT_NON_EXCUSE' },
        { personneId: e, statut: 'DISPENSE' }
      ]
    }, ACTOR);
    const afterSave = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    const byId = new Map(afterSave.participations.map((row) => [String(row.personne_id), row]));
    eq(byId.get(String(c)).heure_debut_individuelle, null);
    eq(byId.get(String(d)).heure_debut_individuelle, null);
    eq(byId.get(String(e)).heure_debut_individuelle, null);
    eq(byId.get(String(b)).heure_debut_individuelle, '18:30');

    const saisieRows = (afterSave.attendus || []).map((attendu) => {
      const part = byId.get(String(attendu.personne_id)) || {};
      return {
        inclus: attendu.inclus,
        statut: part.statut,
        motifAbsence: part.motif_absence,
        role: part.role
      };
    });
    eq(logic.liveCounters(saisieRows).open, 0, 'À renseigner = 0');
    const closed = await ctx.service.cloturer(ctx.created.evenement.evenement_id, { baseVersion: afterSave.version }, ACTOR);
    eq(closed.evenement.statut, 'REALISE');
    const model = await collectReport(ctx.repo, { kind: 'EVENT', evenementId: ctx.created.evenement.evenement_id }, { includeNominatif: true });
    eq((model.nominatif || []).length, 5, 'rapport = 5 assignés');
    const reportNips = new Set((model.nominatif || []).map((row) => String(row.nip)));
    for(const person of ctx.people.slice(5)){
      ok(!reportNips.has(String(person.nip)), 'rapport sans non assignés');
    }
  });

  await record('03 — SAFE-CLOSE Absent renseigné ≠ non renseigné', async () => {
    const rows = [
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT' },
      { inclus: true, statut: 'PRESENT', role: 'PARTICIPANT' },
      { inclus: true, statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', role: 'PARTICIPANT' },
      { inclus: true, statut: 'ABSENT_NON_EXCUSE', role: 'PARTICIPANT' },
      { inclus: true, statut: 'DISPENSE', role: 'PARTICIPANT' }
    ];
    eq(logic.liveCounters(rows).open, 0);
    eq(logic.listIncompleteClosureRows(rows).length, 0);
    ok(!logic.isIncompleteClosureRow(rows[3]), 'Absent renseigné');
    ok(!logic.isIncompleteClosureRow(rows[4]), 'Dispensé renseigné sans motif');
  });

  await record('04 — policies / motifs par domaine, pas de dump PR sur DPS', async () => {
    const dps = resolveParticipationPolicy('DPS');
    const pr = resolveParticipationPolicy('PR');
    const jsp = resolveParticipationPolicy('JSP');
    const auto = resolveParticipationPolicy('AUTO');
    ok(!dps.dispenseMotifs.includes('FORMATEUR_PR'));
    ok(!dps.dispenseMotifs.includes('JOKER'));
    ok(pr.dispenseMotifs.includes('FORMATEUR_PR'));
    ok(pr.dispenseMotifs.includes('JOKER'));
    eq(jsp.dispenseMotifs.length, 0);
    ok(!auto.dispenseMotifs.includes('FORMATEUR_PR'));
    const leaked = resolveParticipationPolicy('DPS', {
      snapshot: { domainCode: 'DPS', dispenseMotifs: ['FORMATEUR_PR', 'FORMATION_HORS_SDIS', 'JOKER', 'AUTO_RETRAIT', 'DEMISSION_EN_COURS', 'NON_CONCERNE'] }
    });
    ok(!leaked.dispenseMotifs.includes('FORMATEUR_PR'), 'snapshot PR dump ignoré hors PR');
    const ctx = await seedDpsB1Population(1);
    const fiche = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    const motifs = logic.motifsDispenseForRow({}, 'DPS', fiche.participationPolicy).map((row) => row.value);
    ok(!motifs.includes('FORMATEUR_PR'));
    ok(!motifs.includes('JOKER'));
  });

  await record('05 — encadrement: DL indépendante, EVENT/CUSTOM, modifier, minutes', async () => {
    includes(ui, 'Préparation à solder');
    includes(ui, 'function startEncadrementEdit');
    includes(ui, 'function saveEncadrement');
    includes(ui, 'data-enc-edit');
    includes(ui, "wrap.hidden = state.encTimeMode !== 'CUSTOM'");
    includes(ui, 'state.encCreationDl = Boolean(e.target.checked)');
    notIncludes(ui, "document.getElementById('enc-creation-dl')?.addEventListener('change', (e) => { state.encCreationDl = Boolean(e.target.checked); render(); });");
    notIncludes(ui, 'Horaire personnalisé');
    notIncludes(ui, '>Création DL<');
    includes(css, 'align-items: start');
    includes(css, '.scope-enc-col-title');

    const ctx = await seedDpsB1Population(1);
    const frozen = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [ctx.people[0].personne_id],
      baseVersion: ctx.created.version
    }, ACTOR);
    const trainer = await ctx.repo.insertPersonne({ nip: '7647', nom: 'Grünig', prenom: 'Thierry', grade: 'Cap' });
    await ctx.service.ajouterEncadrement(ctx.created.evenement.evenement_id, {
      personneId: trainer.personne_id,
      role: 'FORMATEUR',
      timeMode: 'CUSTOM',
      heureDebutIndividuelle: '16:30',
      heureFinIndividuelle: '23:00',
      creationDl: true,
      preparationDlMinutes: 180,
      baseVersion: frozen.version
    }, ACTOR);
    const added = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    const row = added.encadrement.find((item) => String(item.personne_id) === String(trainer.personne_id));
    eq(row.heure_debut_individuelle, '16:30');
    eq(row.creation_dl, true);
    eq(Number(row.preparation_dl_minutes), 180);
    await ctx.service.modifierEncadrement(ctx.created.evenement.evenement_id, {
      personneId: trainer.personne_id,
      role: 'FORMATEUR',
      timeMode: 'EVENT',
      creationDl: true,
      preparationDlMinutes: 90,
      baseVersion: added.version
    }, ACTOR);
    const edited = await ctx.service.lireEvenement(ctx.created.evenement.evenement_id);
    const next = edited.encadrement.find((item) => String(item.personne_id) === String(trainer.personne_id));
    eq(next.heure_debut_individuelle, null);
    eq(next.heure_fin_individuelle, null);
    eq(Number(next.preparation_dl_minutes), 90);
    eq((edited.encadrement || []).length, 1, 'modification sans recréer');
    await ctx.service.retirerEncadrement(ctx.created.evenement.evenement_id, {
      personneId: trainer.personne_id,
      baseVersion: edited.version
    }, ACTOR);
    eq((await ctx.service.lireEvenement(ctx.created.evenement.evenement_id)).encadrement.length, 0);
  });

  await record('06 — participant horaire: Présent plan/individuel, autres statuts sans horaire', async () => {
    includes(ui, '>Plan horaire<');
    includes(ui, 'Individuel · D:');
    const back = logic.applyParticipationStatus({
      statut: 'PRESENT',
      heureDebutIndividuelle: '17:00',
      heureFinIndividuelle: '21:00',
      timeOverrideOpen: true
    }, 'ABSENT_NON_EXCUSE');
    eq(back.heureDebutIndividuelle, '');
    const presentAgain = logic.applyParticipationStatus(back, 'PRESENT');
    eq(presentAgain.heureDebutIndividuelle, '');
    eq(presentAgain.timeOverrideOpen, false);
  });

  await record('07 — annulation, réactivation, suppression assignés non saisis', async () => {
    includes(ui, 'Réactiver l’événement');
    includes(ui, 'Réactiver cet événement et le rendre à nouveau opérationnel ?');
    includes(ui, 'Revenir à la préparation');
    includes(serviceSrc, "action: 'REACTIVER'");
    includes(serviceSrc, 'async function desassignerPopulation');
    const ctx = await seedDpsB1Population(2);
    const assigned = await ctx.service.figerPopulation(ctx.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [ctx.people[0].personne_id],
      baseVersion: ctx.created.version
    }, ACTOR);
    const hidden = await ctx.service.masquerEvenement(ctx.created.evenement.evenement_id, { baseVersion: assigned.version }, ACTOR);
    ok(hidden.hidden, 'assignés sans saisie réelle supprimables');

    const other = await seedDpsB1Population(2);
    const frozen = await other.service.figerPopulation(other.created.evenement.evenement_id, {
      assignmentRequest: true,
      selectedPersonIds: [other.people[0].personne_id],
      baseVersion: other.created.version
    }, ACTOR);
    const saved = await other.service.enregistrerParticipations(other.created.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{ personneId: other.people[0].personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    let refuse = null;
    try{
      await other.service.masquerEvenement(other.created.evenement.evenement_id, { baseVersion: saved.version }, ACTOR);
    }catch(error){
      refuse = error;
    }
    ok(refuse && refuse.error === 'suppression_interdite', 'participation réelle refuse la suppression');

    const cancelCtx = await seedDpsB1Population(1);
    const cancelled = await cancelCtx.service.annulerEvenement(cancelCtx.created.evenement.evenement_id, {
      motif: 'Recette R10.2',
      baseVersion: cancelCtx.created.version
    }, ACTOR);
    eq(cancelled.evenement.statut, 'ANNULE');
    const listed = await cancelCtx.service.listEvenements({ annee: 2026 });
    const row = listed.evenements.find((item) => item.evenement.evenement_id === cancelCtx.created.evenement.evenement_id);
    eq(row.etatMetier.code, 'ANNULE');
    eq(CycleRules.isEventStatisticallyCountable(cancelled.evenement), false);
    const reactivated = await cancelCtx.service.reactiverEvenement(cancelCtx.created.evenement.evenement_id, {
      motif: 'Recette réactivation',
      baseVersion: cancelled.version
    }, ACTOR);
    eq(reactivated.evenement.statut, 'PLANIFIE');
    const journal = await cancelCtx.repo.listJournal('evenement', cancelCtx.created.evenement.evenement_id);
    ok(journal.some((item) => item.action === 'REACTIVER'), 'réactivation journalisée');
  });

  await record('08 — terminologie, en-tête, organisation, double-clic', async () => {
    includes(ui, 'Participants assignés');
    includes(ui, 'Effectif assigné');
    notIncludes(ui, 'Population figée');
    includes(ui, 'Durée : ');
    includes(logicSrc, 'function formatDurationHoursMinutes');
    includes(ui, 'ORGANISATION');
    includes(ui, 'RÈGLES DISPONIBLES');
    includes(serviceSrc, 'Session unique');
    includes(ui, 'state.actionBusy');
    includes(ui, 'participantAssignmentBusy');
    includes(ui, 'encBusy');
    includes(report, 'Horaire de l’événement');
    includes(report, 'Préparation à solder');
  });

  await record('09 — chemins assignés = source de vérité', async () => {
    includes(serviceSrc, 'function assignedPopulationLocked');
    includes(serviceSrc, 'skippedAssigned');
    includes(serviceSrc, 'origine_retrait: \'NON_ASSIGNE\'');
    includes(serviceSrc, 'if(String(evenement.statut || \'\').toUpperCase() === \'PLANIFIE\' && !assignedPopulationLocked(evenement))');
    includes(serviceSrc, 'let attendus = (attendusRaw || []).filter((row) => row.inclus !== false)');
  });

  const failed = results.filter((row) => row.status === 'NOK');
  console.table(results);
  console.log(`Assertions: ${assertions}`);
  if(failed.length){
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }
  console.log('SCOPE-EVENT-ASSIGNED-POPULATION-POLICY-STAFFING-CLOSE-10-2: PASS');
})();
