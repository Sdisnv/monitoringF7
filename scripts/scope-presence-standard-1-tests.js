#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createMemoryRepo } = require('../netlify/functions/_scope-memory');
const { createScopeService } = require('../netlify/functions/_scope-service');
const {
  computeTaux,
  computeEffectifEngageEvenement,
  getEncadrementContribution,
  HttpError
} = require('../netlify/functions/_scope-rules');
const logic = require('../assets/js/scope-ui-logic.js');

const ROOT = path.join(__dirname, '..');

const results = [];

function record(name, fn){
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push({ name, status: 'PASS' }); })
    .catch((error) => {
      results.push({ name, status: 'NOK', proof: String(error && error.stack || error) });
    });
}

async function seedPerson(repo, cibleId, spec){
  const personne = await repo.insertPersonne({
    nip: spec.nip,
    nom: spec.nom,
    prenom: spec.prenom,
    grade: spec.grade || 'Sap'
  });
  await repo.insertAffectation({
    personne_id: personne.personne_id,
    cible_id: cibleId,
    date_debut: '2026-01-01'
  });
  return personne;
}

async function setupEvent(countOrSpecs){
  return setupEventFor('DPS', 'G1', countOrSpecs);
}

async function setupEventFor(domaineCode, niveauCode, countOrSpecs){
  const repo = createMemoryRepo();
  const service = createScopeService(repo);
  const g1 = await repo.findCible(domaineCode, niveauCode);
  const specs = Array.isArray(countOrSpecs)
    ? countOrSpecs
    : Array.from({ length: countOrSpecs }, (_x, index) => ({
      nip: `PSTD${String(index + 1).padStart(3, '0')}`,
      nom: `Nom${String(index + 1).padStart(2, '0')}`,
      prenom: `Prenom${String(index + 1).padStart(2, '0')}`,
      grade: domaineCode === 'JSP' ? 'JSP' : (index % 2 ? 'Cpl' : 'Sap')
    }));
  const people = [];
  for (const spec of specs) people.push(await seedPerson(repo, g1.cible_id, spec));
  const created = await service.createEvenement({
    date: '2026-04-15',
    domaineCode,
    libelle: 'Presence standard',
    cibleIds: [g1.cible_id]
  }, { sub: 'presence-test' });
  const figer = await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, { sub: 'presence-test' });
  return { repo, service, g1, people, eventId: created.evenement.evenement_id, version: figer.version };
}

function part(personne, statut, extra){
  return Object.assign({ personneId: personne.personne_id, statut }, extra || {});
}

(async () => {
  await record('CAS A — 10 personnes, compteurs, persistance et réouverture', async () => {
    const ctx = await setupEvent(10);
    const payload = [
      ...ctx.people.slice(0, 6).map((p) => part(p, 'PRESENT')),
      part(ctx.people[6], 'PRESENT', { role: 'FORMATEUR' }),
      part(ctx.people[7], 'ABSENT_EXCUSE', { motif_absence: 'PRIVE' }),
      part(ctx.people[8], 'ABSENT_NON_EXCUSE'),
      part(ctx.people[9], 'DISPENSE')
    ];
    const saved = await ctx.service.enregistrerParticipations(ctx.eventId, { baseVersion: ctx.version, participations: payload }, { sub: 'presence-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    const counters = computeTaux(fiche.participations, fiche.attendus);
    assert.strictEqual(counters.presents, 7);
    assert.strictEqual(fiche.participations.filter((row) => row.role === 'FORMATEUR').length, 1);
    assert.strictEqual(counters.excuses, 1);
    assert.strictEqual(counters.nonExcuses, 1);
    assert.strictEqual(counters.dispenses, 1);
    assert.strictEqual(counters.excusesPrive, 1);
    assert.strictEqual(fiche.participations.length, 10);
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === ctx.people[7].personne_id).motif_absence, 'PRIVE');
    const reopened = await ctx.service.lireEvenement(ctx.eventId);
    assert.deepStrictEqual(
      reopened.participations.map((row) => [row.personne_id, row.statut, row.role, row.motif_absence]).sort(),
      fiche.participations.map((row) => [row.personne_id, row.statut, row.role, row.motif_absence]).sort()
    );
    assert.strictEqual(saved.version, 3);
  });

  await record('CAS B — Excusé sans motif refusé et clôture impossible', async () => {
    const ctx = await setupEvent(2);
    await assert.rejects(
      () => ctx.service.enregistrerParticipations(ctx.eventId, {
        baseVersion: ctx.version,
        participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_EXCUSE')]
      }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'motif_obligatoire'
    );
    await ctx.repo.upsertParticipation({
      evenement_id: ctx.eventId,
      personne_id: ctx.people[1].personne_id,
      statut: 'ABSENT_EXCUSE',
      role: 'PARTICIPANT'
    });
    await assert.rejects(
      () => ctx.service.cloturer(ctx.eventId, { baseVersion: ctx.version }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.status === 422 && error.error === 'cloture_refusee'
    );
  });

  await record('CAS C — Excusé vers Présent nettoie le motif', async () => {
    const ctx = await setupEvent(1);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'ABSENT_EXCUSE', { motif_absence: 'PROFESSIONNEL' })]
    }, { sub: 'presence-test' });
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'presence-test' });
    const rows = await ctx.repo.listParticipations(ctx.eventId);
    assert.strictEqual(rows[0].statut, 'PRESENT');
    assert.strictEqual(rows[0].motif_absence, null);
  });

  await record('CAS D/E — Tout présent vierge ou saisie existante', async () => {
    const empty = [
      { statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', inclus: true },
      { statut: 'NON_RENSEIGNE', role: 'PARTICIPANT', inclus: true }
    ];
    assert.strictEqual(logic.needsConfirmAllPresent(empty), false);
    assert.deepStrictEqual(logic.applyAllPresent(empty).map((row) => row.statut), ['PRESENT', 'PRESENT']);
    const existing = [
      { statut: 'PRESENT', role: 'PARTICIPANT', inclus: true },
      { statut: 'ABSENT_NON_EXCUSE', role: 'PARTICIPANT', inclus: true },
      { statut: 'PRESENT', role: 'FORMATEUR', inclus: true }
    ];
    assert.strictEqual(logic.needsConfirmAllPresent(existing), true);
    const applied = logic.applyAllPresent(existing);
    assert.deepStrictEqual(applied.map((row) => [row.statut, row.role]), [
      ['PRESENT', 'PARTICIPANT'],
      ['PRESENT', 'PARTICIPANT'],
      ['PRESENT', 'FORMATEUR']
    ]);
  });

  await record('CAS F — Tri Nom/NIP/Grade/Présence sans perte de statut', async () => {
    const rows = [
      { id: '2', nomFamille: 'Dupont', prenom: 'Zoé', grade: 'Sap', nip: '2', statut: 'ABSENT_EXCUSE', motifAbsence: 'ARMEE' },
      { id: '10', nomFamille: 'Bernard', prenom: 'Marc', grade: 'Cpl', nip: '10', statut: 'PRESENT', role: 'FORMATEUR' },
      { id: '1', nomFamille: 'Dupont', prenom: 'Alain', grade: 'Plt', nip: '1', statut: 'DISPENSE' }
    ];
    const before = JSON.stringify(rows);
    const sortedByNip = logic.sortRows(rows, { key: 'nip', dir: 'asc' }, [{ key: 'nip', type: 'text' }]);
    assert.deepStrictEqual(sortedByNip.map((row) => row.id), ['1', '2', '10']);
    assert.strictEqual(JSON.stringify(rows), before);
    assert.strictEqual(rows[0].motifAbsence, 'ARMEE');
  });

  await record('CAS G/H — Enregistrer, rouvrir, modifier, réenregistrer sans doublon', async () => {
    const ctx = await setupEvent(2);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_NON_EXCUSE')]
    }, { sub: 'presence-test' });
    const reopened = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(reopened.participations.length, 2);
    const second = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [part(ctx.people[1], 'ABSENT_EXCUSE', { motif_absence: 'ACCIDENT_MALADIE' })]
    }, { sub: 'presence-test' });
    const rows = await ctx.repo.listParticipations(ctx.eventId);
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows.find((row) => row.personne_id === ctx.people[1].personne_id).motif_absence, 'ACCIDENT_MALADIE');
    assert.strictEqual(second.version, 4);
  });

  await record('CAS I/J — Clôture incomplète autorisée, NON_RENSEIGNE conservé hors taux', async () => {
    const ctx = await setupEvent(2);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT')]
    }, { sub: 'presence-test' });
    const closed = await ctx.service.cloturer(ctx.eventId, { baseVersion: first.version }, { sub: 'presence-test' });
    assert.strictEqual(closed.evenement.statut, 'REALISE');
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.evenement.statut, 'REALISE');
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === ctx.people[1].personne_id).statut, 'NON_RENSEIGNE');
    const taux = computeTaux(fiche.participations, fiche.attendus);
    assert.strictEqual(taux.nonRenseignes, 1);
    assert.strictEqual(taux.denominator, 1);
  });

  await record('CAS K — population attendue figée après modification affectation', async () => {
    const ctx = await setupEvent(1);
    const b1 = await ctx.repo.findCible('DPS', 'B1');
    await ctx.repo.insertAffectation({
      personne_id: ctx.people[0].personne_id,
      cible_id: b1.cible_id,
      date_debut: '2026-05-01'
    });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.deepStrictEqual(fiche.attendus.map((row) => row.personne_id), [ctx.people[0].personne_id]);
  });

  await record('CAS L — même nom/prénom, NIP distincts, aucune collision', async () => {
    const ctx = await setupEvent([
      { nip: 'DUP001', nom: 'Dupont', prenom: 'Alex', grade: 'Sap' },
      { nip: 'DUP002', nom: 'Dupont', prenom: 'Alex', grade: 'Cpl' }
    ]);
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_NON_EXCUSE')]
    }, { sub: 'presence-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.attendus.length, 2);
    assert.strictEqual(fiche.participations.length, 2);
    assert.deepStrictEqual(Object.values(fiche.personnes).map((personne) => personne.nip).sort(), ['DUP001', 'DUP002']);
  });

  await record('CAS 1R1 A/B/C — toggle statut, excusé et reset global', async () => {
    const row = { statut: 'PRESENT', role: 'PARTICIPANT', motifAbsence: '', commentaire: '', inclus: true };
    const reset = logic.resetSaisie([
      row,
      { statut: 'ABSENT_EXCUSE', role: 'PARTICIPANT', motifAbsence: 'PRIVE', commentaire: 'x', inclus: true },
      { statut: 'PRESENT', role: 'FORMATEUR', motifAbsence: '', commentaire: '', inclus: true }
    ]);
    assert.strictEqual(logic.needsConfirmReset([row]), true);
    assert.strictEqual(logic.needsConfirmReset([], [{ role: 'MONITEUR' }]), true);
    assert.deepStrictEqual(reset.map((r) => [r.statut, r.role, r.motifAbsence, r.commentaire]), [
      ['NON_RENSEIGNE', 'PARTICIPANT', '', ''],
      ['NON_RENSEIGNE', 'PARTICIPANT', '', ''],
      ['NON_RENSEIGNE', 'PARTICIPANT', '', '']
    ]);
    const blockers = logic.closureBlockers([
      { statut: 'NON_RENSEIGNE', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: '', inclus: true }
    ]);
    assert.strictEqual(blockers.open, 1);
    assert.strictEqual(blockers.incompleteExcuses, 1);
    assert.ok(blockers.message.includes('Clôture impossible'));
    assert.strictEqual(logic.clotureDisabled({ open: 4 }), false);
  });

  await record('CAS 1R1 D/E/F/G — encadrement ajout, retrait, réajout, anti-doublon', async () => {
    const ctx = await setupEvent(1);
    const extra = await ctx.repo.insertPersonne({ nip: 'ENC101', nom: 'Martin', prenom: 'Paul', grade: 'Sgt' });
    const add = await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: extra.personne_id,
      role: 'FORMATEUR'
    }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.length, 1);
    await assert.rejects(
      () => ctx.service.ajouterEncadrement(ctx.eventId, {
        baseVersion: add.version,
        personneId: extra.personne_id,
        role: 'FORMATEUR'
      }, { sub: 'presence-test' }),
      (error) => error instanceof HttpError && error.status === 422
    );
    const removed = await ctx.service.retirerEncadrement(ctx.eventId, {
      baseVersion: add.version,
      personneId: extra.personne_id
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.length, 0);
    await ctx.repo.upsertParticipation({
      evenement_id: ctx.eventId,
      personne_id: extra.personne_id,
      statut: 'NON_CONCERNE',
      role: 'PARTICIPANT',
      source: 'SAISIE'
    });
    await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: removed.version,
      personneId: extra.personne_id,
      role: 'SURVEILLANT'
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement[0].role, 'SURVEILLANT');
  });

  await record('CAS 1R1 H/I — ordre rôles et tri encadrement Grade Nom Prénom', async () => {
    const source = [
      { role: 'AUXILIAIRE', grade: 'Sap', nom: 'Zulu', prenom: 'Zoé', nip: '3' },
      { role: 'FORMATEUR', grade: 'Sgt', nom: 'Martin', prenom: 'Paul', nip: '2' },
      { role: 'FORMATEUR', grade: 'Cpl', nom: 'Alpha', prenom: 'Anne', nip: '1' },
      { role: 'MONITEUR', grade: 'Sgt', nom: 'Jaccard', prenom: 'Lina', nip: '5' },
      { role: 'SURVEILLANT', grade: 'Cap', nom: 'Bernard', prenom: 'Marc', nip: '4' }
    ];
    const roleOrder = logic.ENCADREMENT_ROLE_ORDER;
    const orderedRoles = [...new Set(source.sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)).map((p) => p.role))];
    assert.deepStrictEqual(orderedRoles, ['FORMATEUR', 'MONITEUR', 'SURVEILLANT', 'AUXILIAIRE']);
    const refs = require('../assets/js/scope-personnel-referentials.js');
    const sorted = source.filter((p) => p.role === 'FORMATEUR').sort((a, b) =>
      refs.compareGrades(a.grade, b.grade) || a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr') || a.nip.localeCompare(b.nip, 'fr', { numeric: true })
    );
    assert.deepStrictEqual(sorted.map((p) => p.nip), ['1', '2']);
  });

  await record('CAS 1R1 J/K/L — ajout manuel participant, anti-doublon, retrait', async () => {
    const ctx = await setupEvent(1);
    const extra = await ctx.repo.insertPersonne({ nip: 'MAN101', nom: 'Ajout', prenom: 'Manuel', grade: 'Sap' });
    const add = await ctx.service.ajouterException(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: extra.personne_id,
      role: 'PARTICIPANT'
    }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    const attendu = fiche.attendus.find((row) => row.personne_id === extra.personne_id);
    assert.strictEqual(attendu.origine, 'EXCEPTION_AJOUT');
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === extra.personne_id).statut, 'NON_RENSEIGNE');
    const duplicate = await ctx.service.ajouterException(ctx.eventId, {
      baseVersion: add.version,
      personneId: ctx.people[0].personne_id,
      role: 'PARTICIPANT'
    }, { sub: 'presence-test' });
    assert.strictEqual(duplicate.dejaPresent, true);
    assert.strictEqual(duplicate.version, add.version);
    await ctx.service.retirerAttendu(ctx.eventId, {
      baseVersion: add.version,
      personneId: extra.personne_id
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(!fiche.attendus.filter((row) => row.inclus !== false).some((row) => row.personne_id === extra.personne_id));
    assert.ok(await ctx.repo.getPersonne(extra.personne_id));
  });

  await record('CAS 1R1 M/N/X — cible individuelle figée et multiple sans doublon', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const foba1 = await repo.findCible('FOBA', '1');
    const foba2 = await repo.findCible('FOBA', '2');
    const p = await repo.insertPersonne({ nip: 'FOBA12', nom: 'Cible', prenom: 'Double', grade: 'Sap' });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba1.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba2.cible_id, date_debut: '2026-01-01' });
    const created = await service.createEvenement({
      date: '2026-04-15',
      domaineCode: 'FOBA',
      libelle: 'FOBA double cible',
      cibleIds: [foba1.cible_id, foba2.cible_id]
    }, { sub: 'presence-test' });
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, { sub: 'presence-test' });
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    assert.strictEqual(fiche.attendus.length, 1);
    assert.strictEqual(fiche.attendus[0].motif_inclusion, 'FOBA_1|FOBA_2');
    const foba3 = await repo.findCible('FOBA', '3');
    await repo.insertAffectation({ personne_id: p.personne_id, cible_id: foba3.cible_id, date_debut: '2026-04-16' });
    const reopened = await service.lireEvenement(created.evenement.evenement_id);
    assert.strictEqual(reopened.attendus[0].motif_inclusion, 'FOBA_1|FOBA_2');
  });

  await record('CAS 1R1 U/V/W — une sauvegarde suffit, réouverture et idempotence', async () => {
    const ctx = await setupEvent(2);
    const first = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [
        part(ctx.people[0], 'PRESENT', { role: 'FORMATEUR' }),
        part(ctx.people[1], 'DISPENSE')
      ]
    }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === ctx.people[0].personne_id).role, 'FORMATEUR');
    const second = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: first.version,
      participations: [
        part(ctx.people[0], 'PRESENT', { role: 'FORMATEUR' }),
        part(ctx.people[1], 'DISPENSE')
      ]
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.participations.length, 2);
    assert.strictEqual(second.version, first.version + 1);
  });

  await record('CAS 1R4 Q1-Q3 — JSP jeunes suivis, Moniteur encadrement hors taux', async () => {
    const ctx = await setupEventFor('JSP', 'G1', 2);
    const moniteur = await ctx.repo.insertPersonne({ nip: 'JSPMON1', nom: 'Moniteur', prenom: 'Jules', grade: 'Sgt' });
    const before = await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: ctx.version,
      participations: [part(ctx.people[0], 'PRESENT'), part(ctx.people[1], 'ABSENT_NON_EXCUSE')]
    }, { sub: 'presence-test' });
    const add = await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: before.version,
      personneId: moniteur.personne_id,
      role: 'MONITEUR'
    }, { sub: 'presence-test' });
    const fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.ok(fiche.attendus.some((row) => row.personne_id === ctx.people[0].personne_id));
    assert.ok(!fiche.attendus.some((row) => row.personne_id === moniteur.personne_id));
    assert.strictEqual(fiche.encadrement.find((row) => row.personne_id === moniteur.personne_id).role, 'MONITEUR');
    const taux = computeTaux(fiche.participations, fiche.attendus);
    assert.strictEqual(taux.numerator, 1);
    assert.strictEqual(taux.denominator, 2);
    assert.strictEqual(add.version, before.version + 1);
  });

  await record('CAS 1R4.1 — JSP ne génère aucun attendu Moniteur JSP', async () => {
    const repo = createMemoryRepo();
    const service = createScopeService(repo);
    const jspG1 = await repo.findCible('JSP', 'G1');
    const dpsG1 = await repo.findCible('DPS', 'G1');
    const jeune = await repo.insertPersonne({ nip: 'JSP-Y-1', nom: 'Jeune', prenom: 'Alice', grade: 'JSP' });
    const monitor = await repo.insertPersonne({ nip: 'JSP-M-1', nom: 'Monitor', prenom: 'Marc', grade: 'Sgt' });
    await repo.insertAffectation({ personne_id: jeune.personne_id, cible_id: jspG1.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: monitor.personne_id, cible_id: jspG1.cible_id, date_debut: '2026-01-01' });
    await repo.insertAffectation({ personne_id: monitor.personne_id, cible_id: dpsG1.cible_id, date_debut: '2026-01-01' });
    const created = await service.createEvenement({
      date: '2026-04-15',
      domaineCode: 'JSP',
      libelle: 'Presence JSP',
      cibleIds: [jspG1.cible_id]
    }, { sub: 'presence-test' });
    const preview = await service.previewAttendus(created.evenement.evenement_id);
    assert.deepStrictEqual(preview.personnes.map((row) => row.personneId), [jeune.personne_id]);
    assert.strictEqual(preview.jeunes.length, 1);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(preview, 'moniteurs'), false);
    await service.figerPopulation(created.evenement.evenement_id, { baseVersion: created.version }, { sub: 'presence-test' });
    const fiche = await service.lireEvenement(created.evenement.evenement_id);
    assert.strictEqual(fiche.attendus.length, 1);
    assert.strictEqual(fiche.attendus[0].personne_id, jeune.personne_id);
    assert.strictEqual(fiche.jsp.jeunes.length, 1);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(fiche.jsp, 'moniteurs'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(fiche.jsp, 'tauxMoniteurs'), false);
  });

  await record('CAS 1R4 Q4-Q15 — matrice contribution encadrement et dédup NIP', async () => {
    for (const domaine of ['DPS', 'DAP', 'JSP', 'AUTO', 'PAPR']) {
      const aux = getEncadrementContribution({ domaine, role: 'AUXILIAIRE' });
      assert.strictEqual(aux.countsPopulationSuivie, false);
      assert.strictEqual(aux.countsTauxPresence, false);
      assert.strictEqual(aux.countsEffectifEngageEvenement, false);
      assert.strictEqual(aux.countsEffectifConsolideSession, false);
    }
    assert.strictEqual(getEncadrementContribution({ domaine: 'DPS', role: 'FORMATEUR' }).countsEffectifEngageEvenement, true);
    assert.strictEqual(getEncadrementContribution({ domaine: 'DAP', role: 'FORMATEUR' }).countsEffectifEngageEvenement, true);
    assert.strictEqual(getEncadrementContribution({ domaine: 'JSP', role: 'MONITEUR' }).informatifSeulement, true);
    assert.strictEqual(getEncadrementContribution({ domaine: 'PAPR', role: 'SURVEILLANT' }).countsEffectifEngageEvenement, false);
    assert.strictEqual(getEncadrementContribution({ domaine: 'AUTO', role: 'FORMATEUR', contexte: { type: 'SESSION' } }).countsEffectifConsolideSession, true);
    assert.strictEqual(getEncadrementContribution({ domaine: 'PAPR', role: 'FORMATEUR', contexte: { type: 'SESSION' } }).countsEffectifConsolideSession, true);
    const effectif = computeEffectifEngageEvenement({
      domaine: 'DPS',
      attendus: [{ personne_id: 'p1', inclus: true }],
      participations: [
        { personne_id: 'p1', nip: 'N1', statut: 'PRESENT', role: 'PARTICIPANT' },
        { personne_id: 'p1', nip: 'N1', statut: 'NON_CONCERNE', role: 'FORMATEUR' },
        { personne_id: 'f1', nip: 'NF', statut: 'NON_CONCERNE', role: 'FORMATEUR' },
        { personne_id: 'a1', nip: 'NA', statut: 'NON_CONCERNE', role: 'AUXILIAIRE' }
      ]
    });
    assert.deepStrictEqual(effectif.nips, ['N1', 'NF']);
  });

  await record('CAS 1R4 Q21-Q26 — reset persistant encadrement, recherches, manuel conservé', async () => {
    const ctx = await setupEvent(1);
    const trainer = await ctx.repo.insertPersonne({ nip: 'RST101', nom: 'Reset', prenom: 'Formateur', grade: 'Sgt' });
    const manual = await ctx.repo.insertPersonne({ nip: 'RST102', nom: 'Reset', prenom: 'Manuel', grade: 'Sap' });
    const enc = await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: ctx.version,
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, { sub: 'presence-test' });
    const added = await ctx.service.ajouterException(ctx.eventId, {
      baseVersion: enc.version,
      personneId: manual.personne_id,
      role: 'PARTICIPANT'
    }, { sub: 'presence-test' });
    await ctx.service.enregistrerParticipations(ctx.eventId, {
      baseVersion: added.version,
      participations: [
        part(ctx.people[0], 'PRESENT'),
        part(manual, 'PRESENT')
      ]
    }, { sub: 'presence-test' });
    const reset = await ctx.service.resetParticipations(ctx.eventId, { baseVersion: added.version + 1 }, { sub: 'presence-test' });
    let fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.length, 0);
    assert.ok(fiche.attendus.some((row) => row.personne_id === ctx.people[0].personne_id && row.inclus !== false));
    assert.ok(fiche.attendus.some((row) => row.personne_id === manual.personne_id && row.origine === 'EXCEPTION_AJOUT'));
    assert.strictEqual(fiche.participations.find((row) => row.personne_id === manual.personne_id).statut, 'NON_RENSEIGNE');
    const readd = await ctx.service.ajouterEncadrement(ctx.eventId, {
      baseVersion: reset.version,
      personneId: trainer.personne_id,
      role: 'FORMATEUR'
    }, { sub: 'presence-test' });
    fiche = await ctx.service.lireEvenement(ctx.eventId);
    assert.strictEqual(fiche.encadrement.length, 1);
    assert.strictEqual(readd.version, reset.version + 1);
  });

  await record('CAS 1R4.1 — ventilation dynamique des excusés depuis la saisie locale', async () => {
    const rows = [
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'PROFESSIONNEL', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'ARMEE', inclus: true },
      { statut: 'ABSENT_EXCUSE', motifAbsence: 'ACCIDENT_MALADIE', inclus: true },
      { statut: 'PRESENT', motifAbsence: 'PRIVE', inclus: true }
    ];
    assert.deepStrictEqual(logic.excuseBreakdown(rows).map((row) => [row.label, row.count]), [
      ['Privé', 2],
      ['Professionnel', 3],
      ['Armée', 1],
      ['Accident/Maladie', 1]
    ]);
    rows[2].motifAbsence = 'ARMEE';
    assert.deepStrictEqual(logic.excuseBreakdown(rows).map((row) => [row.label, row.count]), [
      ['Privé', 2],
      ['Professionnel', 2],
      ['Armée', 2],
      ['Accident/Maladie', 1]
    ]);
  });

  await record('UI — 1R4.1 conservation saisie, JSP et KPI excusés', async () => {
    const ui = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui.js'), 'utf8');
    const logicSource = fs.readFileSync(path.join(ROOT, 'assets/js/scope-ui-logic.js'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'assets/css/scope.css'), 'utf8');
    const saisieRows = ui.slice(ui.indexOf('function renderSaisieRows'), ui.indexOf('function renderRealise'));
    assert.ok(!saisieRows.includes("['FORMATEUR', 'Formateur']"));
    assert.ok(!saisieRows.includes('data-status="FORMATEUR"'));
    assert.ok(ui.includes('data-motif'));
    assert.ok(ui.includes('const ScopeFeedback'));
    assert.ok(ui.includes('function renderScopeFeedback'));
    assert.ok(ui.includes('scope-feedback-overlay'));
    assert.ok(ui.includes('scope-feedback-progress'));
    assert.ok(ui.includes('Réinitialiser la saisie'));
    assert.ok(ui.includes('Les présences, justificatifs et l’encadrement de cet événement seront effacés.'));
    assert.ok(ui.includes('La population convoquée restera inchangée.'));
    assert.ok(ui.includes('client.resetParticipations'));
    assert.ok(ui.includes('Clôturer l’événement'));
    assert.ok(ui.includes('Clôturer avec des participations non renseignées'));
    assert.ok(ui.includes('Clôturer quand même'));
    assert.ok(ui.includes('data-enc-remove'));
    assert.ok(ui.includes('scope-remove-action scope-enc-remove'));
    assert.ok(ui.includes('function trashIcon'));
    assert.ok(ui.includes('scope-trash-icon'));
    assert.ok(!/scope-enc-remove[\s\S]{0,220}>×<\/button>/.test(ui));
    assert.ok(!/data-manual-remove[\s\S]{0,220}>×<\/button>/.test(ui));
    assert.ok(css.includes('.scope-remove-action'));
    assert.ok(css.includes('.scope-trash-icon'));
    assert.ok(css.includes('.scope-kpi-card.is-monitor'));
    assert.ok(ui.includes('renderPresenceKpis(niveaux, fiche)'));
    assert.ok(ui.includes('const enc = (fiche && fiche.encadrement)'));
    assert.ok(ui.includes('<option value="MONITEUR"'));
    assert.ok(ui.includes("encCount('MONITEUR')"));
    assert.ok(ui.includes('data-manual-add'));
    assert.ok(ui.includes('data-manual-remove'));
    assert.ok(ui.includes('function renderManualParticipantBlock'));
    assert.ok(ui.includes('Ajouter un participant à cet événement'));
    assert.ok(ui.includes('id="manual-person-suggestions"'));
    assert.ok(ui.includes('scope-row-manual'));
    assert.ok(!ui.includes('scope-row-manual-badge'));
    assert.ok(!saisieRows.includes('Ajout manuel</span>'));
    assert.ok(ui.includes('<th>Justificatif</th>'));
    assert.ok(!saisieRows.includes('<th>Action</th>'));
    assert.ok(ui.includes('cibleLabelFromAttendu'));
    assert.ok(ui.includes('scope-kpi-board'));
    assert.ok(ui.includes('scope-kpi-target'));
    assert.ok(ui.includes('scope-kpi-encadrement'));
    assert.ok(ui.includes('Vue globale dédupliquée par personne'));
    assert.ok(ui.includes('scope-presence-warning'));
    assert.ok(ui.includes('scope-cloture-reason'));
    assert.ok(ui.includes("row.role = 'PARTICIPANT'"));
    assert.ok(ui.includes('scopeSearchTimers'));
    assert.ok(ui.includes('scopeSearchTokens'));
    assert.ok(ui.includes('clearPresenceSearchState'));
    assert.ok(ui.includes('function snapshotSaisieState'));
    assert.ok(ui.includes('function refreshFichePreservingSaisie'));
    assert.ok(ui.includes("state.encRole = 'FORMATEUR';"));
    assert.ok(ui.includes('state.saisie = snapshot.saisie'));
    assert.ok(ui.includes('state.cibleFilter = snapshot.cibleFilter'));
    assert.ok(ui.includes('snapshot.scrollY'));
    assert.ok(ui.includes('await refreshFichePreservingSaisie(id, snapshot)'));
    const addEncSource = ui.slice(ui.indexOf('function addEncadrement'), ui.indexOf('function removeEncadrement'));
    const removeEncSource = ui.slice(ui.indexOf('function removeEncadrement'), ui.indexOf('function addManualParticipant'));
    assert.ok(!addEncSource.includes('await loadFiche(id)'));
    assert.ok(!removeEncSource.includes('await loadFiche(id)'));
    assert.ok(!ui.includes('MONITEURS JSP ·'));
    assert.ok(!ui.includes('Aucun moniteur attendu.'));
    assert.ok(ui.includes('renderExcuseBreakdown(rows)'));
    assert.ok(ui.includes('scope-kpi-popover'));
    assert.ok(ui.includes('tabindex="0"'));
    assert.ok(ui.includes('aria-haspopup="true"'));
    assert.ok(css.includes('.scope-kpi-popover'));
    assert.ok(css.includes('.scope-kpi-card.has-detail:hover .scope-kpi-popover'));
    assert.ok(css.includes('.scope-kpi-card.has-detail:focus .scope-kpi-popover'));
    assert.ok(logicSource.includes('function excuseBreakdown'));
    assert.ok(logicSource.includes('excuseBreakdown,'));
    assert.ok(ui.includes('setTimeout'));
    assert.ok(ui.includes('renderSuggestionList'));
    assert.ok(logicSource.includes("indicator: active ? (sort.dir === 'desc' ? '▼' : '▲') : ''"));
    assert.ok(css.includes('.scope-status-row button[aria-pressed="true"]'));
    assert.ok(!css.includes('.scope-enc-grid'));
    assert.ok(css.includes('.scope-enc-groups'));
    assert.ok(css.includes('.scope-enc-group'));
    assert.ok(css.includes('grid-template-columns: 24px minmax(0, 1fr) auto'));
    assert.ok(css.includes('grid-template-rows: repeat(4'));
    assert.ok(css.includes('.scope-person-suggestions'));
    assert.ok(css.includes('tbody tr:nth-child(even){background:#f4f6f8;}'));
    assert.ok(css.includes('.scope-table thead th{background:#f6f7f9;}'));
    assert.ok(css.includes('border-radius: 3px;'));
    assert.ok(css.includes('.scope-kpi-card.is-present'));
    assert.ok(css.includes('.scope-feedback-overlay'));
    assert.ok(css.includes('.scope-presence-warning'));
    assert.ok(logic.hasIncompleteExcuse([{ statut: 'ABSENT_EXCUSE', motifAbsence: '', inclus: true }]));
    assert.ok(!logic.hasIncompleteExcuse([{ statut: 'ABSENT_EXCUSE', motifAbsence: 'PRIVE', inclus: true }]));
  });

  const failed = results.filter((r) => r.status !== 'PASS');
  for (const row of results) {
    console.log(`${row.status}\t${row.name}`);
    if (row.proof) console.log(row.proof);
  }
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} test(s) NOK`);
  } else {
    console.log(`\n${results.length} tests PASS`);
  }
})();
