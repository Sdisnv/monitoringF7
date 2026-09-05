#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const personnelImport = require('../netlify/lib/_scope-personnel-service');
const ctx = require('../netlify/lib/_scope-personnel-import-contexts');
const logic = require('../assets/js/scope-ui-logic');

const ROOT = path.join(__dirname, '..');
const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function csv(lines){
  return ['NIP;Grade;Nom;Prénom;OI'].concat(lines).join('\n');
}

async function version(repo, eventId){
  return (await repo.getEvent(eventId)).version;
}

async function setupPr(){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  await repo.insertCycle({
    cycle_id: 'cycle-pr-serie',
    cycle_key: 'PAPR-2026-SERIE',
    annee: 2026,
    domaine_code: 'PR',
    type_cycle: 'PAPR',
    libelle: 'Cycle PAPR série'
  });
  const events = [];
  for(let i = 1; i <= 6; i += 1){
    const ev = await repo.insertEvenement({
      evenement_id: `pr-${i}`,
      cycle_id: 'cycle-pr-serie',
      domaine_code: 'PR',
      date: `2026-09-0${i}`,
      libelle: `Exercice PR 1.${i} | SDIS`,
      code_cours: `PAPR.PR1.${i}`,
      mode_suivi: 'NOMINATIF',
      statut: 'PLANIFIE',
      population_figee: true,
      pr_exercise_group_key: 'cycle-pr-serie:PR:1',
      pr_session_key: `cycle-pr-serie:PR:1.${i}`,
      pr_session_label: `1.${i}`
    });
    events.push(await repo.updateEventIfVersion(ev.evenement_id, 1, { population_figee: true }));
  }
  const formateur = await repo.insertPersonne({ personne_id: 'p-formateur', nip: '1506', nom: 'Cerqueira', prenom: 'Marco', grade: 'Sgt', skipPeriodes: true });
  const participant = await repo.insertPersonne({ personne_id: 'p-participant', nip: '48359', nom: 'Buffat', prenom: 'Noémie', grade: 'Rec', skipPeriodes: true });
  for(const ev of events){
    for(const p of [formateur, participant]){
      await repo.upsertCyclePersonne({ cycle_id: 'cycle-pr-serie', personne_id: p.personne_id, role_cycle: 'PARTICIPANT' });
      await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'REGLE' });
      await repo.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', source: 'GENERATION' });
    }
  }
  return { repo, service, events, formateur, participant };
}

function previewOf({ file, persons, assignments, contexte = 'FOBA_1' }){
  const resolved = personnelImport.resolveImportContext(contexte);
  const rows = personnelImport.normalizeRows(personnelImport.parsePersonnelCsv(file), resolved.code, null);
  const existingPersons = new Map();
  (persons || []).forEach((row) => existingPersons.set(row.nip, row));
  const existingAssignments = new Map();
  (assignments || []).forEach((row) => {
    if(!existingAssignments.has(row.nip)) existingAssignments.set(row.nip, []);
    existingAssignments.get(row.nip).push(row);
  });
  return personnelImport.buildPreview({
    rows,
    existingPersons,
    existingAssignments,
    population: [],
    resolved,
    siteJsp: null,
    anneeMonitoring: 2026,
    filename: 'nip-48359.csv'
  });
}

(async () => {
  await record('A — édition Personne conserve ID, NIP, affectations et participations', async () => {
    const repo = createMemoryRepo();
    const persons = createScopePersonService(repo);
    const p = await repo.insertPersonne({
      personne_id: 'p-48359',
      nip: '48359',
      grade: 'Rec',
      nom: 'Noémie',
      prenom: 'Buffat',
      date_entree_sdis: '2020-01-01',
      skipPeriodes: true
    });
    const cible = (await repo.listCibles()).find((row) => row.domaine_code === 'DAP' && row.niveau_code === 'Y2');
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: cible.cible_id, date_debut: '2026-01-01', source: 'TEST' });
    const ev = await repo.insertEvenement({ evenement_id: 'evt-person', domaine_code: 'DAP', date: '2026-02-01', libelle: 'Test personne', mode_suivi: 'NOMINATIF', statut: 'PLANIFIE', population_figee: true });
    await repo.upsertAttendu({ evenement_id: ev.evenement_id, personne_id: p.personne_id, inclus: true, origine: 'TEST' });
    await repo.upsertParticipation({ evenement_id: ev.evenement_id, personne_id: p.personne_id, statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
    await persons.updateIdentite(p.personne_id, { nip: '99999', grade: 'Rec', nom: 'Buffat', prenom: 'Noémie', dateEntreeSdis: '2020-01-01' }, { sub: 'test' });
    const updated = await repo.getPersonne(p.personne_id);
    assert.strictEqual(updated.personne_id, p.personne_id);
    assert.strictEqual(updated.nip, '48359');
    assert.strictEqual(updated.nom, 'Buffat');
    assert.strictEqual(updated.prenom, 'Noémie');
    assert.strictEqual((await repo.listAffectations({ personneId: p.personne_id })).length, 1);
    assert.strictEqual((await repo.listParticipations(ev.evenement_id)).filter((row) => row.personne_id === p.personne_id).length, 1);
  });

  await record('B — import même NIP identité différente impose une décision, pas un doublon', async () => {
    const preview = previewOf({
      file: csv(['48359;Rec;Buffat;Noémie;FOBA 1']),
      persons: [{ id: 'p-48359', nip: '48359', grade: 'Rec', nom: 'Noémie', prenom: 'Buffat' }],
      assignments: [
        { nip: '48359', categorie: 'OI', domaine: 'DAP', cible: 'Y2', date_inactif: null }
      ]
    });
    const line = preview.lines[0];
    assert.strictEqual(line.status, 'MODIFIED');
    assert.ok(line.diff.person.nom);
    assert.ok(line.diff.person.prenom);
    assert.strictEqual(line.diff.person.created, undefined);
    assert.strictEqual(personnelImport.defaultDecision ? typeof personnelImport.defaultDecision : 'undefined', 'undefined');
    assert.strictEqual(personnelImport.unresolvedRequiredDecisions(preview, []).length, 1);
    const apply = personnelImport.planCommitMutations(preview, [{ rowId: line.lineNumber, decision: 'APPLIQUER' }]);
    assert.strictEqual(apply.personInserts.length, 0);
    assert.strictEqual(apply.personUpdates.length, 1);
    assert.strictEqual(apply.assignmentInserts.length, 1);
    const keep = personnelImport.planCommitMutations(preview, [{ rowId: line.lineNumber, decision: 'IGNORER' }]);
    assert.strictEqual(keep.personUpdates.length, 0);
    assert.strictEqual(keep.assignmentInserts.length, 0);
  });

  await record('C — commit import refuse une divergence sans décision explicite', async () => {
    const preview = previewOf({
      file: csv(['48359;Rec;Buffat;Noémie;FOBA 1']),
      persons: [{ id: 'p-48359', nip: '48359', grade: 'Rec', nom: 'Noémie', prenom: 'Buffat' }],
      assignments: [{ nip: '48359', categorie: 'OI', domaine: 'DAP', cible: 'Y2', date_inactif: null }]
    });
    await assert.rejects(
      () => personnelImport.commitImport({ fileText: csv(['48359;Rec;Buffat;Noémie;FOBA 1']), _preview: preview, decisions: [], confirmed: true }, 'test'),
      /Décision obligatoire/
    );
  });

  await record('D — Formateur x.1 sans série reste limité à la session', async () => {
    const ctxPr = await setupPr();
    await ctxPr.service.ajouterEncadrement('pr-1', { baseVersion: await version(ctxPr.repo, 'pr-1'), personneId: 'p-formateur', role: 'FORMATEUR' });
    const parts = await ctxPr.repo.listParticipationsForEvents(ctxPr.events.map((ev) => ev.evenement_id));
    assert.strictEqual(parts.filter((row) => row.personne_id === 'p-formateur' && row.role === 'FORMATEUR').length, 1);
  });

  await record('E — Formateur x.1 avec série complète couvre 1.1 à 1.6 et compte une fois', async () => {
    const ctxPr = await setupPr();
    await ctxPr.service.ajouterEncadrement('pr-1', { baseVersion: await version(ctxPr.repo, 'pr-1'), personneId: 'p-formateur', role: 'FORMATEUR', serieComplete: true });
    const parts = await ctxPr.repo.listParticipationsForEvents(ctxPr.events.map((ev) => ev.evenement_id));
    assert.strictEqual(parts.filter((row) => row.personne_id === 'p-formateur' && row.role === 'FORMATEUR').length, 6);
    const detail = await ctxPr.service.lireEvenement('pr-6');
    assert.strictEqual(detail.prExerciseParticipation.kpis.presents, 1);
    const row = detail.attendus.find((item) => item.personne_id === 'p-formateur');
    assert.deepStrictEqual(row.sessionFormateurSessions, ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6']);
    assert.strictEqual(
      logic.formatFormateurPrTooltip('Marco Cerqueira', '1506', row.sessionFormateurSessions),
      'Marco Cerqueira (1506) participe comme Formateur PR aux sessions 1.1 à 1.6.'
    );
  });

  await record('F — retrait session conserve les autres sessions Formateur', async () => {
    const ctxPr = await setupPr();
    await ctxPr.service.ajouterEncadrement('pr-1', { baseVersion: await version(ctxPr.repo, 'pr-1'), personneId: 'p-formateur', role: 'FORMATEUR', serieComplete: true });
    await ctxPr.service.retirerEncadrement('pr-1', { baseVersion: await version(ctxPr.repo, 'pr-1'), personneId: 'p-formateur', scope: 'SESSION' });
    const parts = await ctxPr.repo.listParticipationsForEvents(ctxPr.events.map((ev) => ev.evenement_id));
    assert.strictEqual(parts.filter((row) => row.personne_id === 'p-formateur' && row.role === 'FORMATEUR').length, 5);
    assert.ok(parts.find((row) => row.evenement_id === 'pr-1' && row.personne_id === 'p-formateur' && row.role === 'PARTICIPANT'));
  });

  await record('G — retrait série supprime les fonctions Formateur mais préserve une présence réelle', async () => {
    const ctxPr = await setupPr();
    await ctxPr.repo.upsertParticipation({ evenement_id: 'pr-3', personne_id: 'p-formateur', statut: 'PRESENT', role: 'PARTICIPANT', source: 'SAISIE' });
    await ctxPr.service.ajouterEncadrement('pr-1', { baseVersion: await version(ctxPr.repo, 'pr-1'), personneId: 'p-formateur', role: 'FORMATEUR', serieComplete: true });
    await ctxPr.service.retirerEncadrement('pr-1', { baseVersion: await version(ctxPr.repo, 'pr-1'), personneId: 'p-formateur', scope: 'SERIE' });
    const parts = await ctxPr.repo.listParticipationsForEvents(ctxPr.events.map((ev) => ev.evenement_id));
    assert.strictEqual(parts.filter((row) => row.personne_id === 'p-formateur' && row.role === 'FORMATEUR').length, 0);
    assert.ok(parts.find((row) => row.evenement_id === 'pr-3' && row.personne_id === 'p-formateur' && row.role === 'PARTICIPANT' && row.statut === 'PRESENT' && row.source === 'SAISIE'));
  });

  await record('H — UX expose série, retrait explicite, Tous présents et breadcrumb informatif', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    assert.ok(ui.includes('Formateur pour toute la série'));
    assert.ok(ui.includes('Retirer de cette session'));
    assert.ok(ui.includes('Retirer de toute la série'));
    assert.ok(ui.includes('Tous présents'));
    assert.ok(!ui.includes('Tout présent'));
    assert.ok(!ui.includes('<a href="#/exercices">Événements</a> / ${escapeHtml(ev.libelle)}'));
    assert.ok(ui.includes('buildPresenceSavePayload(state.saisie, encadrementIds)'));
  });

  for(const result of results){
    if(result.status === 'PASS') console.log(`PASS ${result.name}`);
    else console.error(`NOK  ${result.name}\n${result.proof}`);
  }
  const failed = results.filter((result) => result.status !== 'PASS');
  if(failed.length){
    console.error(`\nSCOPE-PERSONNEL-EDIT-IMPORT-PAPR-SERIE-1 tests: ${results.length - failed.length}/${results.length} PASS`);
    process.exit(1);
  }
  console.log(`\nSCOPE-PERSONNEL-EDIT-IMPORT-PAPR-SERIE-1 tests: ${results.length}/${results.length} PASS`);
})();
