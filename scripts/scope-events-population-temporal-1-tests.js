#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { createMemoryRepo } = require('../netlify/lib/_scope-memory');
const { createScopeService } = require('../netlify/lib/_scope-service');
const { createScopePersonService } = require('../netlify/lib/_scope-person-service');
const { createScopeAnalyticsService } = require('../netlify/lib/_scope-analytics-service');
const { generateReport } = require('../netlify/lib/_scope-report-service');
const { HttpError, expectedPopulationCoherence, validateCloture } = require('../netlify/lib/_scope-rules');
const { matchesAssignmentToEventTarget } = require('../netlify/lib/_scope-target-resolution');
const personnelImport = require('../netlify/lib/_scope-personnel-service');
const display = require('../assets/js/scope-personnel-display.js');
const logic = require('../assets/js/scope-ui-logic.js');

const results = [];
const ACTOR = { sub: 'temporal-1' };

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => results.push({ name, status: 'PASS' }))
    .catch((error) => results.push({ name, status: 'NOK', proof: String(error && error.stack || error) }));
}

function pdfText(buffer){
  const raw = Buffer.from(buffer).toString('latin1');
  const chunks = [];
  raw.replace(/<([0-9A-Fa-f]+)>/g, (_, hex) => {
    if(hex.length % 2 === 0) chunks.push(Buffer.from(hex, 'hex').toString('latin1'));
    return _;
  });
  return chunks.join('');
}

async function seedPerson(repo, spec){
  return repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom || spec.nip,
    prenom: spec.prenom || 'Test',
    grade: spec.grade || 'Sap',
    date_entree: spec.date_entree || '2026-01-01'
  });
}

async function freezeEvent(service, cible, date, libelle, extra){
  const created = await service.createEvenement(Object.assign({
    date,
    domaineCode: cible.domaine_code,
    libelle,
    cibleIds: [cible.cible_id]
  }, extra || {}), ACTOR);
  await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.evenement.version }, ACTOR);
  return service.lireEvenement(created.evenement.evenement_id);
}

function saisieRow(fiche, personneId){
  const attendu = fiche.attendus.find((row) => row.personne_id === personneId);
  const part = fiche.participations.find((row) => row.personne_id === personneId) || {};
  return Object.assign({}, attendu, part, { inclus: attendu ? attendu.inclus !== false : false });
}

function previewPrAbc({ file, persons, assignments, dateActif }){
  const resolved = personnelImport.resolveImportContext('PR_ABC');
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
    filename: 'pr-abc.csv',
    dateActif: dateActif || null
  });
}

(async () => {
  await record('01 — date actif avant événement : attendu, boutons, à renseigner', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'TEMPA', nom: 'Alpha', grade: 'JSP' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: jsp.cible_id, date_debut: '2026-08-01' });
    const fiche = await freezeEvent(service, jsp, '2026-08-29', 'Exercice JSP 5');
    const row = saisieRow(fiche, person.personne_id);
    assert.ok(row.inclus !== false);
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    assert.ok(logic.isOpenSaisieRow(row));
    assert.strictEqual(logic.liveCounters([row]).open, 1);
    assert.strictEqual(fiche.populationCoherence.pending, 1);
    await assert.rejects(
      () => service.cloturer(fiche.evenement.evenement_id, { baseVersion: fiche.version }, ACTOR),
      (error) => error instanceof HttpError && error.status === 422
    );
  });

  await record('02 — date actif après événement : hors population', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'TEMPB', nom: 'Bravo', grade: 'JSP' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: jsp.cible_id, date_debut: '2026-09-01' });
    const fiche = await freezeEvent(service, jsp, '2026-08-29', 'Exercice JSP 5');
    assert.ok(!fiche.attendus.some((row) => row.personne_id === person.personne_id));
  });

  await record('03 — date inactif avant événement : hors population', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'TEMPC', nom: 'Charlie', grade: 'JSP' });
    await repo.insertAffectation({
      personne_id: person.personne_id,
      cible_id: jsp.cible_id,
      date_debut: '2026-08-01',
      date_fin: '2026-08-31'
    });
    const fiche = await freezeEvent(service, jsp, '2026-09-12', 'Exercice JSP 6');
    assert.ok(!fiche.attendus.some((row) => row.personne_id === person.personne_id));
  });

  await record('04-08 — 48972-like : attendu + NON_CONCERNE résiduel = à renseigner, jamais Non concerné', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'LIKE72', nom: 'Feriau', prenom: 'Eliot', grade: 'JSP' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: jsp.cible_id, date_debut: '2026-08-01' });
    const frozen = await freezeEvent(service, jsp, '2026-08-29', 'Exercice JSP 5');
    await repo.upsertParticipation({
      evenement_id: frozen.evenement.evenement_id,
      personne_id: person.personne_id,
      statut: 'NON_CONCERNE',
      role: 'PARTICIPANT',
      source: 'SYNC_POPULATION'
    });
    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    const row = saisieRow(fiche, person.personne_id);
    assert.ok(row.inclus !== false);
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    assert.ok(logic.isOpenSaisieRow(row));
    assert.strictEqual(logic.liveCounters([row]).open, 1);
    assert.ok(logic.isValidSessionStatut('PRESENT'));
    assert.ok(!logic.isValidSessionStatut('NON_CONCERNE'));
    assert.strictEqual(display.ficheEventStatutLabel({ statutParticipation: 'NON_CONCERNE', planned: true }), 'Non renseigné');
    const identity = expectedPopulationCoherence(fiche.attendus, fiche.participations);
    assert.ok(identity.identity);
    assert.strictEqual(identity.expected, identity.filled + identity.pending);
    assert.strictEqual(identity.pending, 1);
    const personFiche = await persons.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    const hist = (personFiche.evenements || []).find((row) => row.libelle === 'Exercice JSP 5');
    if(hist){
      assert.notStrictEqual(display.ficheEventStatutLabel(hist), 'Non concerné');
    }
    await assert.rejects(
      () => service.cloturer(fiche.evenement.evenement_id, { baseVersion: fiche.version }, ACTOR),
      (error) => error instanceof HttpError && error.error === 'cloture_refusee'
    );
  });

  await record('09-11 — 48976-like : requalification après changement de période', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const persons = createScopePersonService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'LIKE76', nom: 'Pereira', prenom: 'Kylian', grade: 'JSP' });
    const aff = await repo.insertAffectation({
      personne_id: person.personne_id,
      cible_id: jsp.cible_id,
      date_debut: '2026-09-01'
    });
    const frozen = await freezeEvent(service, jsp, '2026-08-29', 'Exercice JSP 5');
    assert.ok(!frozen.attendus.some((row) => row.personne_id === person.personne_id));
    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-08-01' });
    await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    const row = saisieRow(fiche, person.personne_id);
    assert.ok(row.inclus !== false);
    assert.strictEqual(row.statut, 'NON_RENSEIGNE');
    assert.ok(logic.isOpenSaisieRow(row));
    await service.enregistrerParticipations(fiche.evenement.evenement_id, {
      baseVersion: fiche.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const after = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.strictEqual(saisieRow(after, person.personne_id).statut, 'PRESENT');
    const personFiche = await persons.fiche(person.personne_id, { from: '2026-01-01', to: '2026-12-31' });
    const hist = (personFiche.evenements || []).find((row) => String(row.libelle).indexOf('JSP 5') >= 0);
    if(hist) assert.strictEqual(display.ficheEventStatutLabel(hist), 'Présent');
  });

  await record('12 — pas de duplication Personne (NIP unique)', async () => {
    const repo = createMemoryRepo();
    const a = await seedPerson(repo, { nip: 'DUP1', nom: 'Un' });
    await assert.rejects(() => seedPerson(repo, { nip: 'DUP1', nom: 'Deux' }));
    assert.ok(a.personne_id);
  });

  await record('13 — import PR-ABC NIP existant PAPR', () => {
    const preview = previewPrAbc({
      file: 'NIP;Grade;Nom;Prénom\n12345;Sap;Dupont;Anne',
      persons: [{ nip: '12345', grade: 'Sap', nom: 'Dupont', prenom: 'Anne' }],
      assignments: [{ nip: '12345', categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' }],
      dateActif: '2026-03-01'
    });
    const line = preview.lines.find((row) => row.nip === '12345');
    assert.strictEqual(line.status, 'NEW_ASSIGNMENT');
    assert.ok(line.diff.newAssignments.some((row) => row.cible === 'ABC'));
    assert.strictEqual(preview.dateActif, '2026-03-01');
  });

  await record('14 — import PR-ABC NIP inconnu', () => {
    const preview = previewPrAbc({
      file: 'NIP\n99999',
      persons: [],
      assignments: []
    });
    const line = preview.lines.find((row) => String(row.nip).indexOf('99999') >= 0);
    assert.strictEqual(line.status, 'ERROR');
    assert.ok((line.errors || []).some((msg) => /NIP inconnu/.test(msg)));
  });

  await record('15 — import PR-ABC sans PAPR', () => {
    const preview = previewPrAbc({
      file: 'NIP;Grade;Nom;Prénom\n12345;Sap;Dupont;Anne',
      persons: [{ nip: '12345', grade: 'Sap', nom: 'Dupont', prenom: 'Anne' }],
      assignments: [{ nip: '12345', categorie: 'OI', domaine: 'DPS', cible: 'G1', role_domaine: 'PRINCIPAL' }]
    });
    const line = preview.lines.find((row) => row.nip === '12345');
    assert.strictEqual(line.status, 'ERROR');
    assert.ok((line.errors || []).some((msg) => /n’est pas affectée PR\/PAPR/.test(msg)));
  });

  await record('16 — affectation PR-ABC datée, pas de 01.01 inventé', () => {
    const preview = previewPrAbc({
      file: 'NIP;Grade;Nom;Prénom\n12345;Sap;Dupont;Anne',
      persons: [{ nip: '12345', grade: 'Sap', nom: 'Dupont', prenom: 'Anne' }],
      assignments: [{ nip: '12345', categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' }]
    });
    assert.strictEqual(preview.dateActif, null);
    assert.strictEqual(preview.dateEffetRequise, true);
  });

  await record('17 — filtre PR-ABC', () => {
    const rows = [
      { nip: '1', nom: 'Abc', prenom: 'A', affectations: [{ categorie: 'SPECIALISATION', domaine: 'PR', cible: 'ABC' }] },
      { nip: '2', nom: 'Papr', prenom: 'B', affectations: [{ categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' }] }
    ];
    const filtered = display.filterPersonnelRows(rows, { specialization: 'PR-ABC' });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].nip, '1');
    assert.ok(display.specializationFilterOptions().includes('PR-ABC'));
  });

  await record('18-20 / B — événement PR-ABC : uniquement PR-ABC, PAPR standard exclu', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await repo.findCible('PR', 'ABC');
    const papr = await repo.findCible('PR', 'GEN');
    const abcPerson = await seedPerson(repo, { nip: 'ABC1', nom: 'Chimie' });
    const paprOnly = await seedPerson(repo, { nip: 'PAPR1', nom: 'Masque' });
    await repo.insertAffectation({ personne_id: abcPerson.personne_id, cible_id: papr.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: abcPerson.personne_id, cible_id: abc.cible_id, date_debut: '2026-01-15' });
    await repo.insertAffectation({ personne_id: paprOnly.personne_id, cible_id: papr.cible_id, date_debut: '2026-01-01' });
    const fiche = await freezeEvent(service, abc, '2026-04-10', 'Exercice PR-ABC');
    const nips = fiche.attendus.map((row) => (fiche.personnes[row.personne_id] || {}).nip);
    assert.ok(nips.includes('ABC1'));
    assert.ok(!nips.includes('PAPR1'));
    assert.ok(matchesAssignmentToEventTarget(
      { domaine: 'PR', cible: 'ABC' },
      { domaine_code: 'PR', niveau_code: 'GEN' }
    ));
    assert.ok(!matchesAssignmentToEventTarget(
      { domaine: 'PR', cible: 'GEN' },
      { domaine_code: 'PR', niveau_code: 'ABC' }
    ));
  });

  await record('A-I — PR-ABC ⊂ PAPR : général vs PR-ABC, sans report de présence', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await repo.findCible('PR', 'ABC');
    const papr = await repo.findCible('PR', 'GEN');
    const a = await seedPerson(repo, { nip: 'PAPR-A', nom: 'Alpha' });
    const b = await seedPerson(repo, { nip: 'PAPR-B', nom: 'Bravo' });
    const c = await seedPerson(repo, { nip: 'PAPR-C', nom: 'Charlie' });
    await repo.insertAffectation({ personne_id: a.personne_id, cible_id: papr.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: b.personne_id, cible_id: papr.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: b.personne_id, cible_id: abc.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: c.personne_id, cible_id: papr.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: c.personne_id, cible_id: abc.cible_id, date_debut: '2026-01-01' });

    const general = await freezeEvent(service, papr, '2026-04-01', 'Exercice PR général');
    const chimie = await freezeEvent(service, abc, '2026-04-10', 'Exercice PR-ABC');
    const generalNips = general.attendus.map((row) => (general.personnes[row.personne_id] || {}).nip).sort();
    const abcNips = chimie.attendus.map((row) => (chimie.personnes[row.personne_id] || {}).nip).sort();

    assert.ok(general.attendus.some((row) => row.personne_id === a.personne_id), 'A PAPR standard attendu PR général');
    assert.ok(!chimie.attendus.some((row) => row.personne_id === a.personne_id), 'A PAPR standard hors PR-ABC');
    assert.ok(general.attendus.some((row) => row.personne_id === b.personne_id), 'B PR-ABC attendu PR général');
    assert.ok(chimie.attendus.some((row) => row.personne_id === b.personne_id), 'B PR-ABC attendu PR-ABC');
    assert.deepStrictEqual(generalNips, ['PAPR-A', 'PAPR-B', 'PAPR-C']);
    assert.deepStrictEqual(abcNips, ['PAPR-B', 'PAPR-C']);
    assert.strictEqual(general.attendus.filter((row) => row.personne_id === b.personne_id).length, 1);

    await service.enregistrerParticipations(general.evenement.evenement_id, {
      baseVersion: general.version,
      participations: [{ personneId: b.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const chimieAfter = await service.lireEvenement(chimie.evenement.evenement_id);
    assert.strictEqual(saisieRow(chimieAfter, b.personne_id).statut, 'NON_RENSEIGNE');
    assert.ok(!chimieAfter.participations.some((row) => row.personne_id === b.personne_id && row.statut === 'PRESENT'));

    await service.enregistrerParticipations(chimieAfter.evenement.evenement_id, {
      baseVersion: chimieAfter.version,
      participations: [{ personneId: c.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const otherPr = await freezeEvent(service, papr, '2026-05-01', 'Autre exercice PR');
    assert.strictEqual(saisieRow(otherPr, c.personne_id).statut, 'NON_RENSEIGNE');
    assert.ok(!otherPr.participations.some((row) => row.personne_id === c.personne_id && row.statut === 'PRESENT'));
  });

  await record('23 — fiche affiche PR-ABC', () => {
    const specs = display.ficheSpecializationView([
      { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR', dateActif: '2026-01-01' },
      { categorie: 'SPECIALISATION', domaine: 'PR', cible: 'ABC', dateActif: '2026-03-01' }
    ], '2026-04-01');
    assert.ok(specs.labels.includes('PAPR'));
    assert.ok(specs.labels.includes('PR-ABC'));
  });

  await record('24 — rapport exercice PR-ABC', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await repo.findCible('PR', 'ABC');
    const person = await seedPerson(repo, { nip: 'ABC2', nom: 'Rapport', prenom: 'Chimie' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: abc.cible_id, date_debut: '2026-01-01' });
    const fiche = await freezeEvent(service, abc, '2026-05-02', 'Tenue lourde');
    await service.enregistrerParticipations(fiche.evenement.evenement_id, {
      baseVersion: fiche.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const saved = await service.lireEvenement(fiche.evenement.evenement_id);
    await service.cloturer(saved.evenement.evenement_id, { baseVersion: saved.version }, ACTOR);
    const out = await generateReport(repo, {
      kind: 'EVENT',
      evenementId: saved.evenement.evenement_id,
      nominatif: true
    }, { roles: ['UTILISATEUR'], sub: 'r', displayName: 'T' }, { generatedAt: '2026-08-20T08:00:00.000Z' });
    const text = pdfText(out.buffer);
    assert.ok(/PR-ABC|ABC/.test(text));
    assert.ok(text.includes('Rapport') || text.includes('Chimie'));
  });

  await record('25 — multi-session PR-ABC déduplique comme PR', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const abc = await repo.findCible('PR', 'ABC');
    const person = await seedPerson(repo, { nip: 'ABC3', nom: 'Serie' });
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: abc.cible_id, date_debut: '2026-01-01' });
    const ev1 = await repo.insertEvenement({
      evenement_id: 'abc-s1',
      domaine_code: 'PR',
      date: '2026-06-01',
      libelle: 'PR-ABC 1.1',
      cible_ids: [abc.cible_id],
      pr_exercise_group_key: 'abc-serie:1',
      pr_session_key: 'abc-serie:1.1'
    });
    const ev2 = await repo.insertEvenement({
      evenement_id: 'abc-s2',
      domaine_code: 'PR',
      date: '2026-06-08',
      libelle: 'PR-ABC 1.2',
      cible_ids: [abc.cible_id],
      pr_exercise_group_key: 'abc-serie:1',
      pr_session_key: 'abc-serie:1.2'
    });
    await service.figerPopulation(ev1.evenement_id, { baseVersion: ev1.version }, ACTOR);
    await service.figerPopulation(ev2.evenement_id, { baseVersion: ev2.version }, ACTOR);
    const s1 = await service.lireEvenement(ev1.evenement_id);
    await service.enregistrerParticipations(s1.evenement.evenement_id, {
      baseVersion: s1.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const later = await service.lireEvenement(ev2.evenement_id);
    const state = later.prExerciseParticipation && later.prExerciseParticipation.byPersonneId[person.personne_id];
    assert.ok(state);
    assert.ok(state.alreadyCountedInSession || state.sessionHasValidStatus);
  });

  await record('26 — NIP déduplication import PR-ABC', () => {
    const preview = previewPrAbc({
      file: 'NIP;Grade;Nom;Prénom\n12345;Sap;Dupont;Anne\n12345;Sap;Dupont;Anne',
      persons: [{ nip: '12345', grade: 'Sap', nom: 'Dupont', prenom: 'Anne' }],
      assignments: [{ nip: '12345', categorie: 'SPECIALISATION', domaine: 'PR', cible: 'PR' }],
      dateActif: '2026-04-01'
    });
    const nips = preview.lines.filter((row) => row.nip === '12345');
    assert.ok(nips.length >= 2);
    assert.ok(nips.some((row) => row.status === 'IDENTICAL' || /dupliqu/.test(String(row.messages || ''))));
  });

  await record('27 — pas de resync événement réalisé', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'REAL1', nom: 'Fige', grade: 'JSP' });
    const aff = await repo.insertAffectation({ personne_id: person.personne_id, cible_id: jsp.cible_id, date_debut: '2026-08-01' });
    const frozen = await freezeEvent(service, jsp, '2026-08-29', 'JSP réalisé');
    await service.enregistrerParticipations(frozen.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{ personneId: person.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const open = await service.lireEvenement(frozen.evenement.evenement_id);
    await service.cloturer(open.evenement.evenement_id, { baseVersion: open.version }, ACTOR);
    await repo.updateAffectation(aff.affectation_id, { date_debut: '2026-09-01' });
    const sync = await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    assert.strictEqual(sync.attendusRemoved || 0, 0);
    const after = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.ok(after.attendus.some((row) => row.personne_id === person.personne_id));
    assert.strictEqual(saisieRow(after, person.personne_id).statut, 'PRESENT');
  });

  await record('28 — événement planifié cohérent après sync', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const person = await seedPerson(repo, { nip: 'PLAN1', nom: 'Plan', grade: 'JSP' });
    const frozen = await freezeEvent(service, jsp, '2026-08-29', 'JSP planifié');
    await repo.insertAffectation({ personne_id: person.personne_id, cible_id: jsp.cible_id, date_debut: '2026-08-01' });
    await service.syncExpectedPopulationForPersonnes([person.personne_id], ACTOR);
    const fiche = await service.lireEvenement(frozen.evenement.evenement_id);
    assert.ok(fiche.attendus.some((row) => row.personne_id === person.personne_id));
    assert.strictEqual(saisieRow(fiche, person.personne_id).statut, 'NON_RENSEIGNE');
  });

  await record('29 — encadrement hors effectif', () => {
    const rows = [
      { inclus: true, statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' },
      { inclus: true, statut: 'NON_CONCERNE', role: 'AUXILIAIRE' }
    ];
    const counters = logic.liveCounters(rows);
    assert.strictEqual(counters.open, 1);
    const identity = expectedPopulationCoherence(
      [{ personne_id: 'p1', inclus: true }, { personne_id: 'a1', inclus: true }],
      [
        { personne_id: 'p1', statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' },
        { personne_id: 'a1', statut: 'NON_CONCERNE', role: 'AUXILIAIRE' }
      ]
    );
    assert.strictEqual(identity.expected, 1);
  });

  await record('30 — JSP moniteur hors effectif', () => {
    const identity = expectedPopulationCoherence(
      [
        { personne_id: 'j1', inclus: true, jspRole: 'JEUNE' },
        { personne_id: 'm1', inclus: true, jspRole: 'MONITEUR' }
      ],
      [
        { personne_id: 'j1', statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' },
        { personne_id: 'm1', statut: 'NON_RENSEIGNE', role: 'PARTICIPANT' }
      ]
    );
    assert.strictEqual(identity.expected, 1);
    assert.strictEqual(logic.liveCounters([
      { inclus: true, statut: 'NON_RENSEIGNE', jspRole: 'JEUNE' },
      { inclus: true, statut: 'NON_RENSEIGNE', jspRole: 'MONITEUR' }
    ]).open, 1);
  });

  await record('10 — analytics : attendu sans statut n’entre pas au dénominateur, non concerné exclu', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const analytics = createScopeAnalyticsService(repo);
    const jsp = await repo.findCible('JSP', 'G1');
    const expected = await seedPerson(repo, { nip: 'AN1', nom: 'Attendu', grade: 'JSP' });
    const outsider = await seedPerson(repo, { nip: 'AN2', nom: 'Hors', grade: 'JSP' });
    await repo.insertAffectation({ personne_id: expected.personne_id, cible_id: jsp.cible_id, date_debut: '2026-08-01' });
    await repo.insertAffectation({ personne_id: outsider.personne_id, cible_id: jsp.cible_id, date_debut: '2026-09-01' });
    const frozen = await freezeEvent(service, jsp, '2026-08-29', 'JSP analytics');
    await service.enregistrerParticipations(frozen.evenement.evenement_id, {
      baseVersion: frozen.version,
      participations: [{ personneId: expected.personne_id, statut: 'PRESENT' }]
    }, ACTOR);
    const open = await service.lireEvenement(frozen.evenement.evenement_id);
    await service.cloturer(open.evenement.evenement_id, { baseVersion: open.version }, ACTOR);
    const snap = await analytics.snapshot({ from: '2026-01-01', to: '2026-12-31', personneId: expected.personne_id });
    assert.ok((snap.evaluated.includedEvents || []).some((row) => row.libelle === 'JSP analytics'));
    const out = await analytics.snapshot({ from: '2026-01-01', to: '2026-12-31', personneId: outsider.personne_id });
    assert.ok(!(out.evaluated.includedEvents || []).some((row) => row.libelle === 'JSP analytics'));
  });

  await record('identité ATTENDUS = saisis + à renseigner', () => {
    const coherence = expectedPopulationCoherence(
      [{ personne_id: '1', inclus: true }, { personne_id: '2', inclus: true }, { personne_id: '3', inclus: true }],
      [
        { personne_id: '1', statut: 'PRESENT' },
        { personne_id: '2', statut: 'ABSENT_EXCUSE' },
        { personne_id: '3', statut: 'NON_CONCERNE' }
      ]
    );
    assert.strictEqual(coherence.expected, 3);
    assert.strictEqual(coherence.filled, 2);
    assert.strictEqual(coherence.pending, 1);
    assert.ok(coherence.identity);
    assert.throws(
      () => validateCloture({ statut: 'PLANIFIE', population_figee: true }, [{ personne_id: '3', inclus: true }], [{ personne_id: '3', statut: 'NON_CONCERNE' }]),
      (error) => error instanceof HttpError && error.error === 'cloture_refusee'
    );
  });

  const failed = results.filter((row) => row.status !== 'PASS');
  results.forEach((row) => {
    console.log(`${row.status === 'PASS' ? 'PASS' : 'NOK '} ${row.name}`);
    if(row.proof) console.log(row.proof);
  });
  console.log(`\n${results.filter((row) => row.status === 'PASS').length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
})();
